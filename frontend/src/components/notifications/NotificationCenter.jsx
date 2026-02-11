import React, { useState, useEffect } from 'react';
import {
  Box,
  IconButton,
  Badge,
  Popover,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Typography,
  Button,
  Chip,
  Divider,
  Paper,
  Tooltip,
  Avatar,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Circle as CircleIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Chat as ChatIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  ClearAll as ClearAllIcon,
  Delete as DeleteIcon,
  WhatsApp as WhatsAppIcon,
} from '@mui/icons-material';
import { useWebSocket, useRealtimeNotifications } from '../../contexts/hooks/useWebSocket';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function NotificationCenter() {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  
  const { 
    notifications: realtimeNotifications,
    notificacoesNaoLidas,
    marcarComoLida,
    limparNotificacoes,
  } = useRealtimeNotifications();

  useEffect(() => {
    setNotifications(realtimeNotifications);
  }, [realtimeNotifications]);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAsRead = (notificationId) => {
    marcarComoLida(notificationId);
  };

  const handleMarkAllAsRead = () => {
    notifications.forEach(notif => {
      if (!notif.read) {
        marcarComoLida(notif.id);
      }
    });
  };

  const handleClearAll = () => {
    limparNotificacoes();
    handleClose();
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'error':
      case 'system_error':
        return <ErrorIcon color="error" />;
      case 'warning':
      case 'whatsapp_disconnected':
        return <WarningIcon color="warning" />;
      case 'success':
      case 'import_complete':
        return <CheckCircleIcon color="success" />;
      case 'fila_new':
        return <PersonIcon color="primary" />;
      default:
        return <InfoIcon color="info" />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'error':
      case 'system_error':
        return 'error.main';
      case 'warning':
      case 'whatsapp_disconnected':
        return 'warning.main';
      case 'success':
      case 'import_complete':
        return 'success.main';
      case 'fila_new':
        return 'primary.main';
      default:
        return 'info.main';
    }
  };

  const handleNotificationClick = (notification) => {
    handleMarkAsRead(notification.id);
    
    // Ação baseada no tipo de notificação
    if (notification.data?.action === 'reconnect_whatsapp') {
      window.location.href = '/painel/whatsapp';
    } else if (notification.type === 'fila_new' && notification.data?.clienteId) {
      window.open(`/painel/fila`, '_blank');
    }
    
    handleClose();
  };

  const formatNotificationTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = (now - date) / (1000 * 60);
    
    if (diffMinutes < 60) {
      return `${Math.floor(diffMinutes)} min atrás`;
    } else if (diffMinutes < 1440) {
      return `${Math.floor(diffMinutes / 60)}h atrás`;
    } else {
      return format(date, 'dd/MM/yy HH:mm', { locale: ptBR });
    }
  };

  const open = Boolean(anchorEl);
  const id = open ? 'notification-popover' : undefined;

  return (
    <>
      <Tooltip title="Notificações">
        <IconButton
          aria-describedby={id}
          onClick={handleClick}
          color="inherit"
          size="large"
        >
          <Badge badgeContent={notificacoesNaoLidas.length} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            width: 400,
            maxHeight: 500,
            mt: 1,
          },
        }}
      >
        <Paper elevation={0}>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Notificações
              {notificacoesNaoLidas.length > 0 && (
                <Chip
                  label={`${notificacoesNaoLidas.length} não lidas`}
                  color="error"
                  size="small"
                  sx={{ ml: 1 }}
                />
              )}
            </Typography>
            
            <Box>
              {notificacoesNaoLidas.length > 0 && (
                <Button
                  size="small"
                  startIcon={<CheckCircleIcon />}
                  onClick={handleMarkAllAsRead}
                  sx={{ mr: 1 }}
                >
                  Marcar todas
                </Button>
              )}
              
              <Button
                size="small"
                color="error"
                startIcon={<ClearAllIcon />}
                onClick={handleClearAll}
              >
                Limpar
              </Button>
            </Box>
          </Box>

          <Divider />

          <List sx={{ maxHeight: 400, overflow: 'auto' }}>
            {notifications.length === 0 ? (
              <ListItem>
                <ListItemText
                  primary="Sem notificações"
                  secondary="Você está atualizado!"
                  sx={{ textAlign: 'center', py: 2 }}
                />
              </ListItem>
            ) : (
              notifications.map((notification) => (
                <React.Fragment key={notification.id}>
                  <ListItem
                    button
                    onClick={() => handleNotificationClick(notification)}
                    sx={{
                      backgroundColor: notification.read ? 'transparent' : 'action.hover',
                      borderLeft: `4px solid ${getNotificationColor(notification.type)}`,
                      '&:hover': {
                        backgroundColor: 'action.selected',
                      },
                    }}
                  >
                    <ListItemIcon>
                      {getNotificationIcon(notification.type)}
                    </ListItemIcon>
                    
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: notification.read ? 'normal' : 'bold' }}>
                            {notification.title}
                          </Typography>
                          
                          {!notification.read && (
                            <CircleIcon sx={{ fontSize: 8, ml: 1, color: 'primary.main' }} />
                          )}
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography variant="body2" color="text.secondary" paragraph sx={{ mb: 0.5 }}>
                            {notification.message}
                          </Typography>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ScheduleIcon sx={{ fontSize: 12 }} />
                            <Typography variant="caption" color="text.disabled">
                              {formatNotificationTime(notification.created_at)}
                            </Typography>
                          </Box>
                        </>
                      }
                    />
                    
                    <ListItemSecondaryAction>
                      <Tooltip title="Marcar como lida">
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notification.id);
                          }}
                        >
                          <CheckCircleIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                  
                  <Divider component="li" />
                </React.Fragment>
              ))
            )}
          </List>

          {notifications.length > 0 && (
            <>
              <Divider />
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => window.location.href = '/painel/notifications'}
                >
                  Ver todas as notificações
                </Button>
              </Box>
            </>
          )}
        </Paper>
      </Popover>
    </>
  );
}

export default NotificationCenter;