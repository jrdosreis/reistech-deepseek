const DossierBuilder = require('../../core/engine/DossierBuilder');
const WorkspaceService = require('./WorkspaceService');
const logger = require('../../config/logger');

class WorkspaceController {
  async getAll(req, res) {
    try {
      const workspaces = await WorkspaceService.getAll();
      return res.json({
        success: true,
        data: workspaces,
      });
    } catch (error) {
      logger.error('Erro ao buscar workspaces:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar workspaces',
        code: 'WORKSPACES_FETCH_ERROR',
      });
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;
      const workspace = await WorkspaceService.getById(id);
      return res.json({
        success: true,
        data: workspace,
      });
    } catch (error) {
      logger.error('Erro ao buscar workspace:', error);
      return res.status(error.message.includes('não encontrado') ? 404 : 500).json({
        success: false,
        error: error.message,
        code: 'WORKSPACE_FETCH_ERROR',
      });
    }
  }

  async create(req, res) {
    try {
      const workspace = await WorkspaceService.create(req.body);
      return res.status(201).json({
        success: true,
        data: workspace,
      });
    } catch (error) {
      logger.error('Erro ao criar workspace:', error);
      return res.status(400).json({
        success: false,
        error: error.message,
        code: 'WORKSPACE_CREATE_ERROR',
      });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const workspace = await WorkspaceService.update(id, req.body);
      return res.json({
        success: true,
        data: workspace,
      });
    } catch (error) {
      logger.error('Erro ao atualizar workspace:', error);
      return res.status(error.message.includes('não encontrado') ? 404 : 400).json({
        success: false,
        error: error.message,
        code: 'WORKSPACE_UPDATE_ERROR',
      });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      await WorkspaceService.delete(id);
      return res.json({
        success: true,
        message: 'Workspace deletado com sucesso',
      });
    } catch (error) {
      logger.error('Erro ao deletar workspace:', error);
      return res.status(error.message.includes('não encontrado') ? 404 : 500).json({
        success: false,
        error: error.message,
        code: 'WORKSPACE_DELETE_ERROR',
      });
    }
  }

  async getPacks(req, res) {
    try {
      const packs = WorkspaceService.getAvailablePacks();
      return res.json({
        success: true,
        data: packs,
      });
    } catch (error) {
      logger.error('Erro ao buscar packs:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar packs disponíveis',
        code: 'PACKS_FETCH_ERROR',
      });
    }
  }

  async reloadRules(req, res) {
    try {
      const { workspaceId } = req.params;
      
      if (!workspaceId) {
        return res.status(400).json({
          success: false,
          error: 'Workspace ID é obrigatório',
          code: 'MISSING_WORKSPACE_ID',
        });
      }

      // Instancia o builder para disparar o reload (limpa cache local + Redis Pub)
      const builder = new DossierBuilder(parseInt(workspaceId));
      builder.reloadRules();

      return res.json({
        success: true,
        message: 'Regras recarregadas com sucesso. A atualização será propagada para todas as instâncias.',
      });
    } catch (error) {
      logger.error(`Erro ao recarregar regras: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: 'Erro interno ao recarregar regras',
        code: 'RELOAD_RULES_ERROR',
      });
    }
  }
}

module.exports = new WorkspaceController();