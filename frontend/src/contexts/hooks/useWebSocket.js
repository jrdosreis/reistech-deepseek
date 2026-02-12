import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSnackbar } from 'notistack';
import { Button } from '@mui/material';
import { setConnected, addNewMessage, addFilaUpdate } from '../../store/websocketSlice';
import { addNotification, markAsRead, clearNotifications } from '../../store/notificationsSlice';

export function useWebSocket() {
  const wsRef = useRef(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const { isAuthenticated, user } = useSelector(state => state.auth);
  const { currentWorkspace } = useSelector(state => state.ui);
  const isConnected = useSelector(state => state.websocket.isConnected);
  const { enqueueSnackbar } = useSnackbar();
  const reconnectTimeoutRef = useRef(null);
  const dispatch = useDispatch();

  const connect = useCallback(() => {
    if (!isAuthenticated || !currentWorkspace || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const wsBaseUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
      const url = new URL('/ws', wsBaseUrl);
      url.protocol = wsBaseUrl.startsWith('https') ? 'wss:' : 'ws:';

      const ws = new WebSocket(url.toString());
      wsRef.current = ws;

      ws.onopen = () => {
        dispatch(setConnected(true));
        setReconnectAttempts(0);
        console.log('WebSocket conectado');

        // Subscrever canais padrão (quando aplicável)
        subscribe('fila_updates');
        subscribe('new_messages');
        subscribe('notifications');
      };

      ws.onclose = (event) => {
        dispatch(setConnected(false));
        console.log('WebSocket desconectado:', event.code, event.reason);

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
  }, [isAuthenticated, currentWorkspace, reconnectAttempts, enqueueSnackbar]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      dispatch(setConnected(false));
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
    dispatch(addNewMessage({ clienteId, message }));

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
    dispatch(addFilaUpdate({ action, filaItem }));

    if (user && filaItem.operador_id === user.id) {
      enqueueSnackbar(
        action === 'assumed' ? 'Você assumiu um cliente' :
        action === 'released' ? 'Cliente liberado da fila' :
        'Atualização na fila',
        { variant: 'info' }
      );
    }
  }, [user, enqueueSnackbar]);

  const handleClienteEstadoUpdate = useCallback((data) => {
    // Estado do cliente atualizado - pode ser consumido via store se necessário
    const { clienteId, estado } = data;
    dispatch(addNewMessage({ type: 'cliente_estado_update', clienteId, estado }));
  }, []);

  const handleNewNotification = useCallback((data) => {
    const { notification } = data;
    dispatch(addNotification(notification));

    if (notification?.title) {
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
    }
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

  return {
    isConnected,
    send,
    subscribe,
    unsubscribe,
    disconnect,
    reconnect: connect,
  };
}

export function useRealtimeNotifications() {
  const dispatch = useDispatch();
  const notifications = useSelector(state => state.notifications.items);
  const notificacoesNaoLidas = useSelector(state =>
    state.notifications.items.filter(n => !n.read)
  );

  const marcarComoLida = useCallback((notificationId) => {
    dispatch(markAsRead(notificationId));
  }, [dispatch]);

  const limparNotificacoes = useCallback(() => {
    dispatch(clearNotifications());
  }, [dispatch]);

  return {
    notifications,
    notificacoesNaoLidas,
    marcarComoLida,
    limparNotificacoes,
  };
}

export default useWebSocket;
