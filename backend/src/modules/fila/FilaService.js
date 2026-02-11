const db = require('../../db/models');
const { AppError } = require('../../core/errors/AppError');

class FilaService {
  async getFila(workspaceId, status = null) {
    const where = { workspace_id: workspaceId };
    
    if (status) {
      where.status = status;
    } else {
      where.status = ['waiting', 'locked'];
    }

    return await db.FilaHumana.findAll({
      where,
      include: [
        { 
          model: db.Cliente, 
          as: 'cliente',
          attributes: ['id', 'telefone', 'nome', 'tags']
        },
        { 
          model: db.User, 
          as: 'operador',
          attributes: ['id', 'nome', 'email']
        },
      ],
      order: [
        ['status', 'ASC'],
        ['created_at', 'ASC']
      ],
    });
  }

  async assumirCliente(workspaceId, clienteTelefone, operadorId, lockDuration = 900) {
    const transaction = await db.sequelize.transaction();
    
    try {
      // Buscar cliente
      const cliente = await db.Cliente.findOne({
        where: { workspace_id: workspaceId, telefone: clienteTelefone },
        transaction
      });

      if (!cliente) {
        throw new AppError('Cliente não encontrado', 'CLIENTE_NOT_FOUND');
      }

      // Verificar se cliente já está com lock ativo
      const lockAtivo = await db.FilaHumana.findOne({
        where: { 
          workspace_id: workspaceId,
          cliente_id: cliente.id,
          status: 'locked',
          lock_expires_at: { [db.Sequelize.Op.gt]: new Date() }
        },
        transaction
      });

      if (lockAtivo) {
        throw new AppError('Cliente já está sendo atendido por outro operador', 'CLIENTE_LOCKED');
      }

      // Buscar ou criar registro na fila
      const [fila] = await db.FilaHumana.findOrCreate({
        where: { 
          workspace_id: workspaceId,
          cliente_id: cliente.id,
        },
        defaults: {
          status: 'locked',
          operador_id: operadorId,
          lock_expires_at: new Date(Date.now() + lockDuration * 1000),
        },
        transaction
      });

      // Se já existia, atualizar
      if (fila.status !== 'locked' || fila.operador_id !== operadorId) {
        fila.status = 'locked';
        fila.operador_id = operadorId;
        fila.lock_expires_at = new Date(Date.now() + lockDuration * 1000);
        await fila.save({ transaction });
      }

      // Atualizar estado do cliente para HUMANO_ATENDIMENTO
      await db.ClienteEstado.update(
        { state: 'HUMANO_ATENDIMENTO' },
        { where: { workspace_id: workspaceId, cliente_id: cliente.id }, transaction }
      );

      await transaction.commit();
      return fila;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async finalizarAtendimento(workspaceId, clienteTelefone, operadorId, desfecho = null) {
    const transaction = await db.sequelize.transaction();
    
    try {
      const cliente = await db.Cliente.findOne({
        where: { workspace_id: workspaceId, telefone: clienteTelefone },
        transaction
      });

      if (!cliente) {
        throw new AppError('Cliente não encontrado', 'CLIENTE_NOT_FOUND');
      }

      const fila = await db.FilaHumana.findOne({
        where: { 
          workspace_id: workspaceId,
          cliente_id: cliente.id,
          status: 'locked',
          operador_id: operadorId,
        },
        transaction
      });

      if (!fila) {
        throw new AppError('Atendimento não encontrado ou não pertence ao operador', 'ATENDIMENTO_NOT_FOUND');
      }

      // Verificar se o lock expirou
      if (fila.lock_expires_at < new Date()) {
        throw new AppError('Lock expirado, não é possível finalizar', 'LOCK_EXPIRED');
      }

      fila.status = 'done';
      fila.lock_expires_at = null;
      if (desfecho) {
        fila.metadata = { ...fila.metadata, desfecho };
      }
      await fila.save({ transaction });

      // Atualizar estado do cliente para ENCERRAMENTO_CONTROLADO
      await db.ClienteEstado.update(
        { state: 'ENCERRAMENTO_CONTROLADO' },
        { where: { workspace_id: workspaceId, cliente_id: cliente.id }, transaction }
      );

      await transaction.commit();
      return fila;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async liberarLocksExpirados(workspaceId) {
    const expiredLocks = await db.FilaHumana.findAll({
      where: {
        workspace_id: workspaceId,
        status: 'locked',
        lock_expires_at: { [db.Sequelize.Op.lt]: new Date() }
      }
    });

    for (const lock of expiredLocks) {
      lock.status = 'waiting';
      lock.operador_id = null;
      lock.lock_expires_at = null;
      await lock.save();
    }

    return expiredLocks.length;
  }
}

module.exports = FilaService;