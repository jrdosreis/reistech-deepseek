import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { useSnackbar } from 'notistack';
import { useSelector } from 'react-redux';

export const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [subscriptions, setSubscriptions] = useState(new Map());
  const [messageQueue, setMessageQueue] = useState([]);
  const reconnectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);
  
  const { enqueueSnackbar } = useSnackbar();
  const { isAuthenticated } = useSelector(state => state.auth);
  const { currentWorkspace } = useSelector(state => state.ui);

  // Handlers de eventos
  const eventHandlers = useRef(new Map());

  const connect = useCallback(() => {
    if (!isAuthenticated || !currentWorkspace) {
      console.log('WebSocket: Aguardando autenticação...');
      return;
    }

    if (socket && socket.readyState === WebSocket.OPEN) {
      console.log('WebSocket: Já conectado');
      return;
    }

    try {
      const wsUrl = import.meta.env.VITE_WS_URL || `ws://${window.location.host}`;
      const url = new URL('/ws', wsUrl);
      url.protocol = wsUrl.startsWith('https') ? 'wss:' : 'ws:';

      console.log('WebSocket: Conectando...', url.toString());

      const newSocket = new WebSocket(url.toString());

      newSocket.onopen = () => {
        console.log('WebSocket: Conectado com sucesso');
        setIsConnected(true);
        setReconnectAttempts(0);
        
        // Enviar mensagens na fila
        if (messageQueue.length > 0) {
          messageQueue.forEach(msg => newSocket.send(JSON.stringify(msg)));
          setMessageQueue([]);
        }

        // Subscrever aos canais existentes
        subscriptions.forEach((handlers, channel) => {
          newSocket.send(JSON.stringify({
            type: 'subscribe',
            channel,
            timestamp: Date.now(),
          }));
        });

        // Iniciar ping
        pingIntervalRef.current = setInterval(() => {
          if (newSocket.readyState === WebSocket.OPEN) {
            newSocket.send(JSON.stringify({
              type: 'ping',
              timestamp: Date.now(),
            }));
          }
        }, 30000);

        enqueueSnackbar('Conexão em tempo real estabelecida', {
          variant: 'success',
          autoHideDuration: 2000,
        });
      };

      newSocket.onclose = (event) => {
        console.log('WebSocket: Desconectado', event.code, event.reason);
        setIsConnected(false);
        
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Tentar reconectar se não foi um fechamento intencional
        if (event.code !== 1000 && reconnectAttempts < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
          
          console.log(`WebSocket: Tentando reconectar em ${delay}ms (tentativa ${reconnectAttempts + 1})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connect();
          }, delay);
        }
      };

      newSocket.onerror = (error) => {
        console.error('WebSocket: Erro:', error);
        enqueueSnackbar('Erro na conexão em tempo real', {
          variant: 'error',
          autoHideDuration: 3000,
        });
      };

      newSocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          switch (message.type) {
            case 'pong':
              // Heartbeat respondido
              break;
              
            case 'notification':
              handleNotification(message.data);
              break;
              
            default:
              // Disparar handlers para este evento
              if (message.event && eventHandlers.current.has(message.event)) {
                const handlers = eventHandlers.current.get(message.event);
                handlers.forEach(handler => handler(message.data));
              }
          }
        } catch (error) {
          console.error('WebSocket: Erro ao processar mensagem:', error, event.data);
        }
      };

      setSocket(newSocket);
    } catch (error) {
      console.error('WebSocket: Erro na conexão:', error);
    }
  }, [isAuthenticated, currentWorkspace, reconnectAttempts, messageQueue, subscriptions, enqueueSnackbar, handleNotification]);

  const disconnect = useCallback(() => {
    if (socket) {
      socket.close(1000, 'Desconexão solicitada pelo usuário');
      setSocket(null);
      setIsConnected(false);
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
    }
  }, [socket]);

  const send = useCallback((message) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      // Adicionar à fila para enviar quando conectar
      setMessageQueue(prev => [...prev, message]);
      return false;
    }

    try {
      socket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('WebSocket: Erro ao enviar mensagem:', error);
      return false;
    }
  }, [socket]);

  const subscribe = useCallback((event, handler) => {
    if (!event || typeof handler !== 'function') {
      console.error('WebSocket: subscribe requer event string e handler function');
      return () => {};
    }

    const handlers = eventHandlers.current.get(event) || [];
    handlers.push(handler);
    eventHandlers.current.set(event, handlers);

    // Se conectado, subscrever no servidor
    if (isConnected && socket) {
      send({
        type: 'subscribe',
        channel: event,
        timestamp: Date.now(),
      });
    }

    // Retornar função de unsubscribe
    return () => {
      const currentHandlers = eventHandlers.current.get(event) || [];
      const filteredHandlers = currentHandlers.filter(h => h !== handler);
      
      if (filteredHandlers.length === 0) {
        eventHandlers.current.delete(event);
        
        // Se conectado, cancelar subscription no servidor
        if (isConnected && socket) {
          send({
            type: 'unsubscribe',
            channel: event,
            timestamp: Date.now(),
          });
        }
      } else {
        eventHandlers.current.set(event, filteredHandlers);
      }
    };
  }, [isConnected, socket, send]);

  const unsubscribe = useCallback((event, handler) => {
    if (!eventHandlers.current.has(event)) {
      return;
    }

    const handlers = eventHandlers.current.get(event);
    const filteredHandlers = handlers.filter(h => h !== handler);
    
    if (filteredHandlers.length === 0) {
      eventHandlers.current.delete(event);
      
      // Se conectado, cancelar subscription no servidor
      if (isConnected && socket) {
        send({
          type: 'unsubscribe',
          channel: event,
          timestamp: Date.now(),
        });
      }
    } else {
      eventHandlers.current.set(event, filteredHandlers);
    }
  }, [isConnected, socket, send]);

  const handleNotification = useCallback((notification) => {
    // Disparar evento de notificação
    if (eventHandlers.current.has('notification')) {
      const handlers = eventHandlers.current.get('notification');
      handlers.forEach(handler => handler(notification));
    }

    // Mostrar snackbar para notificações importantes
    if (notification.priority === 'high' || notification.priority === 'critical') {
      enqueueSnackbar(notification.message, {
        variant: notification.type === 'error' ? 'error' : 'warning',
        autoHideDuration: 5000,
        anchorOrigin: {
          vertical: 'top',
          horizontal: 'right',
        },
      });
    }
  }, [enqueueSnackbar]);

  // Efeito para conectar/desconectar baseado na autenticação
  useEffect(() => {
    if (isAuthenticated && accessToken && currentWorkspace) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, accessToken, currentWorkspace, connect, disconnect]);

  // Efeito para limpar na desmontagem
  useEffect(() => {
    return () => {
      disconnect();
      eventHandlers.current.clear();
    };
  }, [disconnect]);

  const value = {
    isConnected,
    socket,
    send,
    subscribe,
    unsubscribe,
    connect,
    disconnect,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

WebSocketProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default WebSocketContext;