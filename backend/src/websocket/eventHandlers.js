const logger = require('../config/logger');
const db = require('../db/models');

class WebSocketEventHandlers {
  constructor(wss) {
    this.wss = wss;
  }

  // Handler para nova mensagem WhatsApp
  async handleNewMessage(workspaceId, messageData) {
    try {
      const { from, text, type, timestamp } = messageData;
      
      // Buscar workspace
      const workspace = await db.Workspace.findByPk(workspaceId);
      if (!workspace) {
        logger.error(`Workspace ${workspaceId} não encontrado para mensagem`);
        return;
      }

      // Notificar todos os usuários do workspace
      this.wss.broadcastToWorkspace(workspaceId, 'new_message', {
        type: 'whatsapp_message',
        from,
        text,
        messageType: type,
        timestamp: timestamp || new Date().toISOString(),
        workspaceId,
      });

      logger.debug(`Nova mensagem WhatsApp notificada para workspace ${workspaceId}`);
    } catch (error) {
      logger.error('Erro ao processar nova mensagem:', error);
    }
  }

  // Handler para atualização de fila
  async handleFilaUpdate(workspaceId, action, data) {
    try {
      this.wss.broadcastToWorkspace(workspaceId, 'fila_update', {
        action,
        data,
        timestamp: new Date().toISOString(),
      });

      // Se for um novo item na fila, notificar operadores específicos
      if (action === 'new' || action === 'escalated') {
        const notificationData = {
          type: 'new_fila_item',
          title: 'Novo cliente na fila',
          message: `Cliente ${data.cliente?.telefone || data.telefone} aguarda atendimento`,
          data: {
            clienteId: data.cliente_id,
            telefone: data.cliente?.telefone || data.telefone,
            motivo: data.motivo,
            priority: data.priority || 'medium',
          },
          timestamp: new Date().toISOString(),
        };

        // Buscar operadores ativos
        const operadores = await db.User.findAll({
          where: {
            workspace_id: workspaceId,
            role: ['admin', 'supervisor', 'operator'],
            ativo: true,
          },
        });

        // Enviar notificação para cada operador
        operadores.forEach(operador => {
          this.wss.notifyNewNotification(workspaceId, operador.id, notificationData);
        });
      }

      logger.debug(`Fila atualizada notificada para workspace ${workspaceId}`);
    } catch (error) {
      logger.error('Erro ao processar atualização de fila:', error);
    }
  }

  // Handler para atualização de estado do cliente
  async handleClienteEstadoUpdate(workspaceId, clienteId, estado) {
    try {
      this.wss.broadcastToWorkspace(workspaceId, 'cliente_estado_update', {
        clienteId,
        estado,
        timestamp: new Date().toISOString(),
      });

      logger.debug(`Estado do cliente atualizado notificado para workspace ${workspaceId}`);
    } catch (error) {
      logger.error('Erro ao processar atualização de estado:', error);
    }
  }

  // Handler para status do WhatsApp
  async handleWhatsAppStatus(workspaceId, status) {
    try {
      this.wss.broadcastToWorkspace(workspaceId, 'whatsapp_status', {
        status,
        timestamp: new Date().toISOString(),
      });

      // Se desconectou, notificar administradores
      if (status === 'disconnected' || status === 'auth_failed') {
        const admins = await db.User.findAll({
          where: {
            workspace_id: workspaceId,
            role: ['admin', 'supervisor'],
            ativo: true,
          },
        });

        admins.forEach(admin => {
          this.wss.notifyNewNotification(workspaceId, admin.id, {
            type: 'whatsapp_disconnected',
            title: 'WhatsApp Desconectado',
            message: 'A conexão com WhatsApp foi perdida',
            priority: 'high',
            data: { status },
            timestamp: new Date().toISOString(),
          });
        });
      }

      logger.debug(`Status WhatsApp notificado para workspace ${workspaceId}`);
    } catch (error) {
      logger.error('Erro ao processar status WhatsApp:', error);
    }
  }

  // Handler para notificações de sistema
  async handleSystemNotification(workspaceId, userId, notification) {
    try {
      this.wss.notifyNewNotification(workspaceId, userId, {
        ...notification,
        timestamp: new Date().toISOString(),
      });

      logger.debug(`Notificação de sistema enviada para usuário ${userId}`);
    } catch (error) {
      logger.error('Erro ao processar notificação de sistema:', error);
    }
  }

  // Handler para atualização de catálogo
  async handleCatalogoUpdate(workspaceId, action, item) {
    try {
      this.wss.broadcastToWorkspace(workspaceId, 'catalogo_update', {
        action,
        item,
        timestamp: new Date().toISOString(),
      });

      logger.debug(`Catálogo atualizado notificado para workspace ${workspaceId}`);
    } catch (error) {
      logger.error('Erro ao processar atualização de catálogo:', error);
    }
  }

  // Handler para atualização de textos CMS
  async handleTextosUpdate(workspaceId, action, texto) {
    try {
      this.wss.broadcastToWorkspace(workspaceId, 'textos_update', {
        action,
        texto,
        timestamp: new Date().toISOString(),
      });

      logger.debug(`Textos CMS atualizados notificados para workspace ${workspaceId}`);
    } catch (error) {
      logger.error('Erro ao processar atualização de textos:', error);
    }
  }

  // Método para inicializar handlers
  initializeHandlers() {
    // Handler para mensagens do cliente WebSocket
    this.wss.on('client_message', (data) => {
      const { type, workspaceId, userId, ...rest } = data;
      
      switch (type) {
        case 'subscribe_channel':
          this.handleClientSubscribe(workspaceId, userId, rest);
          break;
        case 'unsubscribe_channel':
          this.handleClientUnsubscribe(workspaceId, userId, rest);
          break;
        case 'ping':
          this.handlePing(workspaceId, userId);
          break;
        default:
          logger.warn(`Tipo de mensagem do cliente não reconhecido: ${type}`);
      }
    });
  }

  // Handler para cliente subscrever canal
  handleClientSubscribe(workspaceId, userId, data) {
    const { channel, filter } = data;
    
    // Registrar subscription
    this.wss.subscriptions.set(channel, [
      ...(this.wss.subscriptions.get(channel) || []),
      { userId, filter },
    ]);
    
    logger.info(`Usuário ${userId} subscreveu ao canal ${channel}`);
  }

  // Handler para cliente cancelar subscription
  handleClientUnsubscribe(workspaceId, userId, data) {
    const { channel } = data;
    
    if (this.wss.subscriptions.has(channel)) {
      const subscribers = this.wss.subscriptions.get(channel)
        .filter(sub => sub.userId !== userId);
      
      if (subscribers.length === 0) {
        this.wss.subscriptions.delete(channel);
      } else {
        this.wss.subscriptions.set(channel, subscribers);
      }
    }
    
    logger.info(`Usuário ${userId} cancelou subscription do canal ${channel}`);
  }

  // Handler para ping do cliente
  handlePing(workspaceId, userId) {
    // Atualizar timestamp do último ping
    const client = Array.from(this.wss.clients.values())
      .find(c => c.userId === userId && c.workspaceId === workspaceId);
    
    if (client) {
      client.lastPing = Date.now();
    }
    
    // Responder com pong
    this.wss.sendToUser(userId, {
      type: 'pong',
      timestamp: Date.now(),
    });
  }

  // Método para broadcast de heartbeat
  broadcastHeartbeat() {
    const heartbeatMessage = {
      type: 'heartbeat',
      timestamp: Date.now(),
    };
    
    this.wss.wss.clients.forEach(client => {
      if (client.readyState === 1) { // OPEN
        client.send(JSON.stringify(heartbeatMessage));
      }
    });
  }
}

module.exports = WebSocketEventHandlers;