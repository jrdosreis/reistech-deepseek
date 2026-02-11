// CONTINUAÇÃO DO ARQUIVO: frontend/src/hooks/useWebSocket.js
import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { useSnackbar } from 'notistack';
import { Button } from '@mui/material';

function useWebSocket() {
  const wsRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const { isAuthenticated, user } = useSelector(state => state.auth);
  const { enqueueSnackbar } = useSnackbar();
  const reconnectTimeoutRef = useRef(null);

  const connect = useCallback(() => {
    if (!isAuthenticated || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const wsBaseUrl = process.env.VITE_WS_URL || 'ws://localhost:3001';
      const url = new URL('/ws', wsBaseUrl);
      url.protocol = wsBaseUrl.startsWith('https') ? 'wss:' : 'ws:';
      const wsUrl = url.toString();
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setReconnectAttempts(0);
        console.log('WebSocket conectado');
        
        // Subscrever canais padrão
        subscribe('fila_updates');
        subscribe('new_messages');
        subscribe('notifications');
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        console.log('WebSocket desconectado:', event.code, event.reason);
        
        // Reconexão exponencial
        if (reconnectAttempts < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connect();
          }, delay);
        } else {
          enqueueSnackbar('Conexão WebSocket perdida. Recarregue a página.', {
            variant: 'error',
            persist: true,
          });
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        enqueueSnackbar('Erro na conexão em tempo real', { variant: 'error' });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('Erro ao processar mensagem WebSocket:', error);
        }
      };

    } catch (error) {
      console.error('Erro ao conectar WebSocket:', error);
    }
  }, [isAuthenticated, reconnectAttempts, enqueueSnackbar]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setIsConnected(false);
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
  }, []);

  const send = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  const subscribe = useCallback((channel, filter = null) => {
    send({
      type: 'subscribe',
      channel,
      filter,
      timestamp: Date.now(),
    });
  }, [send]);

  const unsubscribe = useCallback((channel) => {
    send({
      type: 'unsubscribe',
      channel,
      timestamp: Date.now(),
    });
  }, [send]);

  const handleWebSocketMessage = useCallback((data) => {
    const { event, data: eventData } = data;
    
    switch (event) {
      case 'new_message':
        handleNewMessage(eventData);
        break;
      case 'fila_update':
        handleFilaUpdate(eventData);
        break;
      case 'cliente_estado_update':
        handleClienteEstadoUpdate(eventData);
        break;
      case 'new_notification':
        handleNewNotification(eventData);
        break;
      case 'connection':
        console.log('WebSocket connection confirmed:', eventData);
        break;
      case 'subscribed':
        console.log(`Subscribed to channel: ${eventData.channel}`);
        break;
      case 'unsubscribed':
        console.log(`Unsubscribed from channel: ${eventData.channel}`);
        break;
      default:
        console.warn('Evento WebSocket não reconhecido:', event);
    }
  }, []);

  const handleNewMessage = useCallback((data) => {
    const { clienteId, message } = data;
    // Disparar evento customizado para atualizar conversas
    const event = new CustomEvent('new_whatsapp_message', {
      detail: { clienteId, message }
    });
    window.dispatchEvent(event);
    
    // Mostrar notificação se não estiver na página de conversas
    if (!window.location.pathname.includes('/conversas')) {
      enqueueSnackbar(`Nova mensagem de ${message.clienteNome || 'cliente'}`, {
        variant: 'info',
        action: (
          <Button 
            color="inherit" 
            size="small"
            onClick={() => window.open(`/painel/conversas?telefone=${message.clienteTelefone}`, '_blank')}
          >
            Ver
          </Button>
        ),
      });
    }
  }, [enqueueSnackbar]);

  const handleFilaUpdate = useCallback((data) => {
    const { action, filaItem } = data;
    // Disparar evento para atualizar fila
    const event = new CustomEvent('fila_updated', {
      detail: { action, filaItem }
    });
    window.dispatchEvent(event);
    
    // Notificar se for relevante para o usuário atual
    if (user && filaItem.operador_id === user.id) {
      enqueueSnackbar(
        action === 'assumed' ? 'Vocë assumiu um cliente' :
        action === 'released' ? 'Cliente liberado da fila' :
        'Atualização na fila',
        { variant: 'info' }
      );
    }
  }, [user, enqueueSnackbar]);

  const handleClienteEstadoUpdate = useCallback((data) => {
    const { clienteId, estado } = data;
    // Atualizar contexto do cliente em tempo real
    const event = new CustomEvent('cliente_estado_changed', {
      detail: { clienteId, estado }
    });
    window.dispatchEvent(event);
  }, []);

  const handleNewNotification = useCallback((data) => {
    const { notification } = data;
    // Adicionar notificação ao store
    const event = new CustomEvent('new_notification_received', {
      detail: { notification }
    });
    window.dispatchEvent(event);
    
    // Mostrar snackbar
    enqueueSnackbar(notification.title, {
      variant: notification.type || 'info',
      ...(notification.action && {
        action: (
          <Button 
            color="inherit" 
            size="small"
            onClick={notification.action.handler}
          >
            {notification.action.label}
          </Button>
        ),
      }),
    });
  }, [enqueueSnackbar]);

  useEffect(() => {
    if (isAuthenticated) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, connect, disconnect]);

  // Expor métodos publicamente
  return {
    isConnected,
    send,
    subscribe,
    unsubscribe,
    disconnect,
    reconnect: connect,
  };
}

// Context Provider para WebSocket
const WebSocketContext = React.createContext(null);

export const WebSocketProvider = ({ children }) => {
  const ws = useWebSocket();
  
  return (
    <WebSocketContext.Provider value={ws}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocketContext = () => {
  const context = React.useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext deve ser usado dentro de WebSocketProvider');
  }
  return context;
};

export default useWebSocket;