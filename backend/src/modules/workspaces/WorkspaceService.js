const { Workspace } = require('../../db/models');
const VerticalPackLoader = require('../../workspaces/VerticalPackLoader');
const logger = require('../../config/logger');
const { AppError } = require('../../core/errors/AppError');

class WorkspaceService {
  constructor() {
    this.packLoader = new VerticalPackLoader();
  }

  async getAll() {
    try {
      return await Workspace.findAll({
        order: [['created_at', 'DESC']],
      });
    } catch (error) {
      logger.error('Erro ao buscar workspaces:', error);
      throw error;
    }
  }

  async getById(id) {
    try {
      const workspace = await Workspace.findByPk(id);
      if (!workspace) {
        throw new AppError('Workspace não encontrado', 'WORKSPACE_NOT_FOUND', 404);
      }
      return workspace;
    } catch (error) {
      logger.error(`Erro ao buscar workspace ${id}:`, error);
      throw error;
    }
  }

  async create(data) {
    try {
      const { nome, pack_key } = data;

      // Validar se o pack existe
      const pack = this.packLoader.getPack(pack_key);
      if (!pack) {
        throw new AppError(`Pack não encontrado: ${pack_key}`, 'PACK_NOT_FOUND', 404);
      }

      // Criar workspace
      const workspace = await Workspace.create({
        nome,
        pack_key,
        configuracao: pack.config || {},
        ativo: true,
      });

      logger.info(`Workspace criado: ${workspace.id} - ${workspace.nome}`);
      return workspace;
    } catch (error) {
      logger.error('Erro ao criar workspace:', error);
      throw error;
    }
  }

  async update(id, data) {
    try {
      const workspace = await this.getById(id);
      
      const { nome, pack_key, configuracao, ativo } = data;

      // Se mudou o pack, validar
      if (pack_key && pack_key !== workspace.pack_key) {
        const pack = this.packLoader.getPack(pack_key);
        if (!pack) {
          throw new AppError(`Pack não encontrado: ${pack_key}`, 'PACK_NOT_FOUND', 404);
        }
      }

      await workspace.update({
        ...(nome && { nome }),
        ...(pack_key && { pack_key }),
        ...(configuracao && { configuracao }),
        ...(ativo !== undefined && { ativo }),
      });

      logger.info(`Workspace atualizado: ${workspace.id}`);
      return workspace;
    } catch (error) {
      logger.error(`Erro ao atualizar workspace ${id}:`, error);
      throw error;
    }
  }

  async delete(id) {
    try {
      const workspace = await this.getById(id);
      await workspace.destroy();
      logger.info(`Workspace deletado: ${id}`);
    } catch (error) {
      logger.error(`Erro ao deletar workspace ${id}:`, error);
      throw error;
    }
  }

  getAvailablePacks() {
    return this.packLoader.getAvailablePacks();
  }
}

module.exports = new WorkspaceService();
