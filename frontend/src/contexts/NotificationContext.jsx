// frontend/src/contexts/NotificationContext.jsx
import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { useSnackbar } from 'notistack';
import { IconButton } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import api from '../services/api';

const NotificationContext = createContext();

const notificationReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications].slice(0, 50), // Limitar a 50
        unreadCount: state.unreadCount + 1,
      };
    
    case 'MARK_AS_READ':
      return {
        ...state,
        notifications: state.notifications.map(notification =>
          notification.id === action.payload
            ? { ...notification, read: true, readAt: new Date().toISOString() }
            : notification
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      };
    
    case 'MARK_ALL_AS_READ':
      return {
        ...state,
        notifications: state.notifications.map(notification => ({
          ...notification,
          read: true,
          readAt: new Date().toISOString(),
        })),
        unreadCount: 0,
      };
    
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload),
        unreadCount: state.notifications.find(n => n.id === action.payload && !n.read)
          ? state.unreadCount - 1
          : state.unreadCount,
      };
    
    case 'CLEAR_ALL':
      return {
        ...state,
        notifications: [],
        unreadCount: 0,
      };
    
    case 'SET_NOTIFICATIONS':
      return {
        notifications: action.payload,
        unreadCount: action.payload.filter(n => !n.read).length,
      };
    
    default:
      return state;
  }
};

export const NotificationProvider = ({ children }) => {
  const [state, dispatch] = useReducer(notificationReducer, {
    notifications: [],
    unreadCount: 0,
  });
  
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();

  const addNotification = useCallback((notification) => {
    const id = notification.id || `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const fullNotification = {
      id,
      type: 'info',
      title: '',
      message: '',
      data: {},
      createdAt: new Date().toISOString(),
      read: false,
      readAt: null,
      ...notification,
    };
    
    dispatch({ type: 'ADD_NOTIFICATION', payload: fullNotification });
    
    // Mostrar snackbar
    const action = (key) => (
      <IconButton
        size="small"
        color="inherit"
        onClick={() => {
          closeSnackbar(key);
          dispatch({ type: 'MARK_AS_READ', payload: id });
        }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    );
    
    enqueueSnackbar(fullNotification.message || fullNotification.title, {
      variant: fullNotification.type,
      action,
      persist: fullNotification.persist || false,
      autoHideDuration: fullNotification.autoHideDuration || 5000,
      anchorOrigin: {
        vertical: 'bottom',
        horizontal: 'right',
      },
    });
    
    // Disparar evento para WebSocket se for notificação do sistema
    if (fullNotification.source === 'system') {
      const event = new CustomEvent('notification_created', {
        detail: fullNotification,
      });
      window.dispatchEvent(event);
    }
    
    return id;
  }, [enqueueSnackbar, closeSnackbar]);

  const markAsRead = useCallback((notificationId) => {
    dispatch({ type: 'MARK_AS_READ', payload: notificationId });
  }, []);

  const markAllAsRead = useCallback(() => {
    dispatch({ type: 'MARK_ALL_AS_READ' });
  }, []);

  const removeNotification = useCallback((notificationId) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: notificationId });
  }, []);

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const response = await api.get('/notifications');
      dispatch({ type: 'SET_NOTIFICATIONS', payload: response.data.data });
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    }
  }, []);

  const value = {
    notifications: state.notifications,
    unreadCount: state.unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    loadNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications deve ser usado dentro de NotificationProvider');
  }
  return context;
};