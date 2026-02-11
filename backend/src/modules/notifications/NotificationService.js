const db = require('../../db/models');
const { Op } = require('sequelize');
const { AppError } = require('../../core/errors/AppError');
const logger = require('../../config/logger');

class NotificationService {
  constructor(wss = null) {
    this.wss = wss;
  }

  // Criar notificação
  async createNotification(workspaceId, userId, notificationData) {
    try {
      const notification = await db.Notification.create({
        workspace_id: workspaceId,
        user_id: userId,
        type: notificationData.type || 'info',
        title: notificationData.title,
        message: notificationData.message,
        data: notificationData.data || {},
        read: false,
      });

      // Enviar via WebSocket se disponível
      if (this.wss) {
        this.wss.notifyNewNotification(workspaceId, userId, {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          read: notification.read,
          created_at: notification.created_at,
        });
      }

      logger.debug(`Notificação criada para usuário ${userId}: ${notification.title}`);
      return notification;
    } catch (error) {
      logger.error('Erro ao criar notificação:', error);
      throw new AppError('Erro ao criar notificação', 'NOTIFICATION_CREATE_ERROR');
    }
  }

  // Obter notificações do usuário
  async getUserNotifications(workspaceId, userId, options = {}) {
    try {
      const { 
        unreadOnly = false, 
        limit = 50, 
        offset = 0,
        types = [],
        startDate,
        endDate 
      } = options;

      const where = {
        workspace_id: workspaceId,
        user_id: userId,
      };

      if (unreadOnly) {
        where.read = false;
      }

      if (types.length > 0) {
        where.type = { [Op.in]: types };
      }

      if (startDate || endDate) {
        where.created_at = {};
        if (startDate) {
          where.created_at[Op.gte] = startDate;
        }
        if (endDate) {
          where.created_at[Op.lte] = endDate;
        }
      }

      const { count, rows } = await db.Notification.findAndCountAll({
        where,
        order: [['created_at', 'DESC']],
        limit,
        offset,
      });

      return {
        notifications: rows,
        pagination: {
          total: count,
          limit,
          offset,
          pages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      logger.error('Erro ao buscar notificações:', error);
      throw new AppError('Erro ao buscar notificações', 'NOTIFICATION_FETCH_ERROR');
    }
  }

  // Marcar notificação como lida
  async markAsRead(notificationId, userId) {
    try {
      const notification = await db.Notification.findOne({
        where: { id: notificationId, user_id: userId },
      });

      if (!notification) {
        throw new AppError('Notificação não encontrada', 'NOTIFICATION_NOT_FOUND');
      }

      if (!notification.read) {
        notification.read = true;
        notification.read_at = new Date();
        await notification.save();
      }

      return notification;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Erro ao marcar notificação como lida:', error);
      throw new AppError('Erro ao atualizar notificação', 'NOTIFICATION_UPDATE_ERROR');
    }
  }

  // Marcar todas como lidas
  async markAllAsRead(workspaceId, userId) {
    try {
      const result = await db.Notification.update(
        {
          read: true,
          read_at: new Date(),
        },
        {
          where: {
            workspace_id: workspaceId,
            user_id: userId,
            read: false,
          },
        }
      );

      return { updated: result[0] };
    } catch (error) {
      logger.error('Erro ao marcar todas notificações como lidas:', error);
      throw new AppError('Erro ao atualizar notificações', 'NOTIFICATION_UPDATE_ERROR');
    }
  }

  // Excluir notificação
  async deleteNotification(notificationId, userId) {
    try {
      const notification = await db.Notification.findOne({
        where: { id: notificationId, user_id: userId },
      });

      if (!notification) {
        throw new AppError('Notificação não encontrada', 'NOTIFICATION_NOT_FOUND');
      }

      await notification.destroy();
      return { success: true };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Erro ao excluir notificação:', error);
      throw new AppError('Erro ao excluir notificação', 'NOTIFICATION_DELETE_ERROR');
    }
  }

  // Excluir todas notificações
  async deleteAllNotifications(workspaceId, userId, options = {}) {
    try {
      const { readOnly = false } = options;

      const where = {
        workspace_id: workspaceId,
        user_id: userId,
      };

      if (readOnly) {
        where.read = true;
      }

      const count = await db.Notification.destroy({ where });
      return { deleted: count };
    } catch (error) {
      logger.error('Erro ao excluir notificações:', error);
      throw new AppError('Erro ao excluir notificações', 'NOTIFICATION_DELETE_ERROR');
    }
  }

  // Criar notificação de novo cliente na fila
  async notifyNewFilaItem(workspaceId, filaItem) {
    try {
      // Buscar todos operadores ativos
      const operadores = await db.User.findAll({
        where: {
          workspace_id: workspaceId,
          role: ['admin', 'supervisor', 'operator'],
          ativo: true,
        },
      });

      const notificationPromises = operadores.map(operador =>
        this.createNotification(workspaceId, operador.id, {
          type: 'fila_new',
          title: 'Novo cliente na fila',
          message: `Cliente ${filaItem.cliente?.telefone || filaItem.telefone} aguarda atendimento`,
          data: {
            clienteId: filaItem.cliente_id,
            telefone: filaItem.cliente?.telefone || filaItem.telefone,
            motivo: filaItem.motivo,
            filaItemId: filaItem.id,
            priority: filaItem.priority || 'medium',
          },
        })
      );

      await Promise.all(notificationPromises);
      logger.info(`Notificações de nova fila enviadas para ${operadores.length} operadores`);
    } catch (error) {
      logger.error('Erro ao criar notificações de nova fila:', error);
    }
  }

  // Criar notificação de WhatsApp desconectado
  async notifyWhatsAppDisconnected(workspaceId) {
    try {
      const admins = await db.User.findAll({
        where: {
          workspace_id: workspaceId,
          role: ['admin', 'supervisor'],
          ativo: true,
        },
      });

      const notificationPromises = admins.map(admin =>
        this.createNotification(workspaceId, admin.id, {
          type: 'whatsapp_disconnected',
          title: 'WhatsApp Desconectado',
          message: 'A conexão com WhatsApp foi perdida. Reconecte para continuar recebendo mensagens.',
          priority: 'high',
          data: {
            action: 'reconnect_whatsapp',
            timestamp: new Date().toISOString(),
          },
        })
      );

      await Promise.all(notificationPromises);
      logger.info(`Notificações de WhatsApp desconectado enviadas para ${admins.length} administradores`);
    } catch (error) {
      logger.error('Erro ao criar notificações de WhatsApp desconectado:', error);
    }
  }

  // Criar notificação de erro do sistema
  async notifySystemError(workspaceId, errorData) {
    try {
      const admins = await db.User.findAll({
        where: {
          workspace_id: workspaceId,
          role: ['admin'],
          ativo: true,
        },
      });

      const notificationPromises = admins.map(admin =>
        this.createNotification(workspaceId, admin.id, {
          type: 'system_error',
          title: 'Erro do Sistema',
          message: `Ocorreu um erro no sistema: ${errorData.message || 'Erro desconhecido'}`,
          priority: 'critical',
          data: {
            error: errorData,
            timestamp: new Date().toISOString(),
          },
        })
      );

      await Promise.all(notificationPromises);
      logger.info(`Notificações de erro do sistema enviadas para ${admins.length} administradores`);
    } catch (error) {
      logger.error('Erro ao criar notificações de erro do sistema:', error);
    }
  }

  // Criar notificação de importação concluída
  async notifyImportComplete(workspaceId, userId, importData) {
    try {
      await this.createNotification(workspaceId, userId, {
        type: 'import_complete',
        title: 'Importação Concluída',
        message: `Importação de ${importData.type} concluída com sucesso. ${importData.count} itens processados.`,
        data: {
          importType: importData.type,
          count: importData.count,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Erro ao criar notificação de importação:', error);
    }
  }

  // Obter estatísticas de notificações
  async getNotificationStats(workspaceId, userId) {
    try {
      const stats = await db.Notification.findAll({
        attributes: [
          'type',
          [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'total'],
          [db.sequelize.fn('SUM', db.sequelize.literal('CASE WHEN read = false THEN 1 ELSE 0 END')), 'unread'],
        ],
        where: {
          workspace_id: workspaceId,
          user_id: userId,
        },
        group: ['type'],
        raw: true,
      });

      const totalStats = await db.Notification.findOne({
        attributes: [
          [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'total'],
          [db.sequelize.fn('SUM', db.sequelize.literal('CASE WHEN read = false THEN 1 ELSE 0 END')), 'unread'],
        ],
        where: {
          workspace_id: workspaceId,
          user_id: userId,
        },
        raw: true,
      });

      return {
        byType: stats,
        total: totalStats.total || 0,
        unread: totalStats.unread || 0,
        read: (totalStats.total || 0) - (totalStats.unread || 0),
      };
    } catch (error) {
      logger.error('Erro ao buscar estatísticas de notificações:', error);
      throw new AppError('Erro ao buscar estatísticas', 'NOTIFICATION_STATS_ERROR');
    }
  }

  // Configurar WebSocket server
  setWebSocketServer(wss) {
    this.wss = wss;
  }
}

module.exports = NotificationService;