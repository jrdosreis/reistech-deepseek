// backend/src/websocket/WebSocketServer.js
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const logger = require('../config/logger');

class WebSocketServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws',
      clientTracking: true
    });
    
    this.clients = new Map(); // userId -> Set of WebSocket connections
    this.workspaceSubscriptions = new Map(); // workspaceId -> Set of userIds
    this.channelSubscriptions = new Map(); // channel -> Set of userIds
    
    this.setupEventHandlers();
    this.setupHeartbeat();
  }

  setupEventHandlers() {
    this.wss.on('connection', (ws, req) => {
      const token = this.extractToken(req);
      
      if (!token) {
        ws.close(1008, 'Token não fornecido');
        return;
      }

      try {
        const decoded = jwt.verify(token, config.jwt.secret);
        ws.userId = decoded.userId;
        ws.workspaceId = decoded.workspaceId;
        ws.userRole = decoded.role;
        ws.isAlive = true;
        ws.subscriptions = new Set();

        // Adicionar cliente à coleção
        if (!this.clients.has(ws.userId)) {
          this.clients.set(ws.userId, new Set());
        }
        this.clients.get(ws.userId).add(ws);

        // Registrar subscription do workspace
        if (!this.workspaceSubscriptions.has(ws.workspaceId)) {
          this.workspaceSubscriptions.set(ws.workspaceId, new Set());
        }
        this.workspaceSubscriptions.get(ws.workspaceId).add(ws.userId);

        logger.info(`WebSocket conectado: usuário ${ws.userId}, workspace ${ws.workspaceId}`);

        // Enviar mensagem de boas-vindas
        this.sendToUser(ws.userId, {
          event: 'connection',
          data: {
            status: 'connected',
            timestamp: new Date().toISOString(),
            userId: ws.userId,
            workspaceId: ws.workspaceId,
            userRole: ws.userRole,
          },
        });

      } catch (error) {
        logger.error('WebSocket authentication error:', error);
        ws.close(1008, 'Token inválido');
        return;
      }

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('message', (message) => {
        this.handleMessage(ws, message);
      });

      ws.on('close', () => {
        this.handleDisconnection(ws);
      });

      ws.on('error', (error) => {
        logger.error('WebSocket error:', error);
        this.handleDisconnection(ws);
      });
    });
  }

  extractToken(req) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.split(' ')[1];
    }

    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').map(part => part.trim());
      const tokenPair = cookies.find(part => part.startsWith('accessToken='));
      if (tokenPair) {
        return decodeURIComponent(tokenPair.split('=')[1]);
      }
    }

    return null;
  }

  setupHeartbeat() {
    const interval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          return ws.terminate();
        }

        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    this.wss.on('close', () => {
      clearInterval(interval);
    });
  }

  handleMessage(ws, message) {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'subscribe':
          this.handleSubscribe(ws, data);
          break;
        case 'unsubscribe':
          this.handleUnsubscribe(ws, data);
          break;
        case 'ping':
          ws.send(JSON.stringify({ 
            type: 'pong', 
            timestamp: Date.now() 
          }));
          break;
        default:
          logger.warn(`Tipo de mensagem WebSocket não reconhecido: ${data.type}`);
      }
    } catch (error) {
      logger.error('Erro ao processar mensagem WebSocket:', error);
    }
  }

  handleSubscribe(ws, data) {
    const { channel, filter } = data;
    
    if (!ws.subscriptions) {
      ws.subscriptions = new Set();
    }
    
    ws.subscriptions.add(channel);
    
    // Registrar subscription no canal
    if (!this.channelSubscriptions.has(channel)) {
      this.channelSubscriptions.set(channel, new Set());
    }
    this.channelSubscriptions.get(channel).add(ws.userId);
    
    this.sendToUser(ws.userId, {
      event: 'subscribed',
      data: {
        channel,
        filter,
        timestamp: new Date().toISOString(),
      },
    });
  }

  handleUnsubscribe(ws, data) {
    const { channel } = data;
    
    if (ws.subscriptions) {
      ws.subscriptions.delete(channel);
    }
    
    // Remover subscription do canal
    if (this.channelSubscriptions.has(channel)) {
      this.channelSubscriptions.get(channel).delete(ws.userId);
    }
    
    this.sendToUser(ws.userId, {
      event: 'unsubscribed',
      data: {
        channel,
        timestamp: new Date().toISOString(),
      },
    });
  }

  handleDisconnection(ws) {
    if (ws.userId && this.clients.has(ws.userId)) {
      const userClients = this.clients.get(ws.userId);
      userClients.delete(ws);
      
      if (userClients.size === 0) {
        this.clients.delete(ws.userId);
      }
    }

    if (ws.workspaceId && ws.userId && this.workspaceSubscriptions.has(ws.workspaceId)) {
      this.workspaceSubscriptions.get(ws.workspaceId).delete(ws.userId);
    }

    // Remover de todas as subscriptions de canal
    if (ws.subscriptions) {
      ws.subscriptions.forEach(channel => {
        if (this.channelSubscriptions.has(channel)) {
          this.channelSubscriptions.get(channel).delete(ws.userId);
        }
      });
    }

    logger.info(`WebSocket desconectado: usuário ${ws.userId}`);
  }

  // Métodos de envio
  sendToUser(userId, message) {
    const userClients = this.clients.get(userId);
    
    if (userClients) {
      const messageStr = JSON.stringify(message);
      userClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(messageStr);
        }
      });
    }
  }

  broadcastToWorkspace(workspaceId, event, data) {
    const userIds = this.workspaceSubscriptions.get(workspaceId);
    
    if (userIds) {
      userIds.forEach((userId) => {
        this.sendToUser(userId, { event, data });
      });
    }
  }

  broadcastToChannel(channel, event, data, filter = null) {
    const userIds = this.channelSubscriptions.get(channel);
    
    if (userIds) {
      userIds.forEach((userId) => {
        const userClients = this.clients.get(userId);
        if (userClients) {
          const message = JSON.stringify({ event, data });
          userClients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              // Aplicar filtro se fornecido
              if (filter && typeof filter === 'function') {
                if (filter(client)) {
                  client.send(message);
                }
              } else {
                client.send(message);
              }
            }
          });
        }
      });
    }
  }

  // Eventos específicos do sistema
  notifyNewMessage(workspaceId, clienteId, message) {
    this.broadcastToWorkspace(workspaceId, 'new_message', {
      clienteId,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  notifyFilaUpdate(workspaceId, filaItem, action) {
    this.broadcastToWorkspace(workspaceId, 'fila_update', {
      action,
      filaItem,
      timestamp: new Date().toISOString(),
    });
  }

  notifyClienteEstadoUpdate(workspaceId, clienteId, estado) {
    this.broadcastToWorkspace(workspaceId, 'cliente_estado_update', {
      clienteId,
      estado,
      timestamp: new Date().toISOString(),
    });
  }

  notifyNewNotification(workspaceId, userId, notification) {
    this.sendToUser(userId, {
      event: 'new_notification',
      data: {
        notification,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Método para verificar status
  getStatus() {
    return {
      totalConnections: this.wss.clients.size,
      workspaceSubscriptions: this.workspaceSubscriptions.size,
      channelSubscriptions: this.channelSubscriptions.size,
      clientsPerUser: Array.from(this.clients.entries()).map(([userId, connections]) => ({
        userId,
        connections: connections.size,
      })),
    };
  }
}

module.exports = WebSocketServer;