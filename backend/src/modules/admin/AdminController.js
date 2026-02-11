const AdminService = require('./AdminService');
const { responseSuccess } = require('../../core/utils/response');

const adminService = new AdminService();

class AdminController {
  async getCurrentWorkspace(req, res, next) {
    try {
      const workspace = await adminService.getCurrentWorkspace(req.workspace.id);
      res.json(responseSuccess(workspace));
    } catch (error) {
      next(error);
    }
  }

  async updateCurrentWorkspace(req, res, next) {
    try {
      const workspace = await adminService.updateWorkspace(req.workspace.id, req.body);
      res.json(responseSuccess(workspace, 'Workspace atualizado com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  async listUsers(req, res, next) {
    try {
      const users = await adminService.listUsers(req.workspace.id);
      res.json(responseSuccess(users));
    } catch (error) {
      next(error);
    }
  }

  async listVerticalPacks(req, res, next) {
    try {
      const packs = await adminService.listVerticalPacks();
      res.json(responseSuccess(packs));
    } catch (error) {
      next(error);
    }
  }
  async createWorkspace(req, res, next) {
    try {
      // Apenas admin pode criar workspaces
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Apenas administradores podem criar workspaces',
          code: 'FORBIDDEN'
        });
      }

      const workspace = await adminService.createWorkspace(req.body);
      res.status(201).json(responseSuccess(workspace, 'Workspace criado com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  async listWorkspaces(req, res, next) {
    try {
      // Apenas admin pode listar todos workspaces
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Apenas administradores podem listar workspaces',
          code: 'FORBIDDEN'
        });
      }

      const { page = 1, limit = 20 } = req.query;
      const result = await adminService.listWorkspaces(parseInt(page), parseInt(limit));
      res.json(responseSuccess(result));
    } catch (error) {
      next(error);
    }
  }

  async updateWorkspace(req, res, next) {
    try {
      // Apenas admin pode atualizar workspaces
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Apenas administradores podem atualizar workspaces',
          code: 'FORBIDDEN'
        });
      }

      const { id } = req.params;
      const workspace = await adminService.updateWorkspace(id, req.body);
      res.json(responseSuccess(workspace, 'Workspace atualizado com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  async loadVerticalPack(req, res, next) {
    try {
      const { workspace } = req;
      const { vertical_key } = req.body;

      if (!vertical_key) {
        return res.status(400).json({
          success: false,
          error: 'Vertical key é obrigatória',
          code: 'VERTICAL_KEY_REQUIRED'
        });
      }

      const pack = await adminService.loadVerticalPack(workspace.id, vertical_key);
      res.json(responseSuccess(pack, 'Pack vertical carregado com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  async exportPack(req, res, next) {
    try {
      const { workspace } = req;
      const pack = await adminService.exportPack(workspace.id);

      // Definir headers para download
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=pack-${workspace.slug}-${Date.now()}.json`);
      
      res.json(pack);
    } catch (error) {
      next(error);
    }
  }

  async importPack(req, res, next) {
    try {
      const { workspace } = req;
      const packData = req.body;

      if (!packData || !packData.textos_cms) {
        return res.status(400).json({
          success: false,
          error: 'Dados do pack inválidos',
          code: 'INVALID_PACK_DATA'
        });
      }

      const result = await adminService.importPack(workspace.id, packData);
      res.json(responseSuccess(result, 'Pack importado com sucesso'));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminController();