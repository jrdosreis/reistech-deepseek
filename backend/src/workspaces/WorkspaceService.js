const db = require('../db/models');
const { AppError } = require('../core/errors/AppError');
const VerticalPackLoader = require('./VerticalPackLoader');

class WorkspaceService {
  constructor() {
    this.packLoader = new VerticalPackLoader();
  }

  async getWorkspaceBySlug(slug) {
    const workspace = await db.Workspace.findOne({
      where: { slug, ativo: true },
    });

    if (!workspace) {
      throw new AppError('Workspace não encontrado', 'WORKSPACE_NOT_FOUND');
    }

    return workspace;
  }

  async getWorkspaceById(id) {
    const workspace = await db.Workspace.findByPk(id);

    if (!workspace) {
      throw new AppError('Workspace não encontrado', 'WORKSPACE_NOT_FOUND');
    }

    return workspace;
  }

  async getWorkspaceConfig(workspaceId) {
    const workspace = await this.getWorkspaceById(workspaceId);
    const packInfo = this.packLoader.availablePacks[workspace.vertical_key] || {};
    
    return {
      ...workspace.toJSON(),
      pack: packInfo,
      stats: await this.getWorkspaceStats(workspaceId),
    };
  }

  async getWorkspaceStats(workspaceId) {
    const [
      clientesCount,
      conversasToday,
      filaWaiting,
      catalogoAtivos,
    ] = await Promise.all([
      db.Cliente.count({ where: { workspace_id: workspaceId } }),
      db.ConversaInteracao.count({
        where: {
          workspace_id: workspaceId,
          created_at: {
            [db.Sequelize.Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      db.FilaHumana.count({
        where: {
          workspace_id: workspaceId,
          status: 'waiting',
        },
      }),
      db.CatalogoItem.count({
        where: {
          workspace_id: workspaceId,
          ativo: true,
        },
      }),
    ]);

    return {
      clientes: clientesCount,
      conversas_hoje: conversasToday,
      na_fila: filaWaiting,
      catalogo_ativos: catalogoAtivos,
    };
  }

  async updateWorkspaceConfig(workspaceId, configUpdates) {
    const workspace = await this.getWorkspaceById(workspaceId);
    
    const updatedConfig = {
      ...workspace.config,
      ...configUpdates,
    };

    await workspace.update({ config: updatedConfig });
    return workspace;
  }

  async getAvailablePacks() {
    return this.packLoader.getAvailablePacks();
  }

  async createWorkspaceUser(workspaceId, userData) {
    const existingUser = await db.User.findOne({
      where: {
        workspace_id: workspaceId,
        email: userData.email,
      },
    });

    if (existingUser) {
      throw new AppError('Usuário já existe neste workspace', 'USER_EXISTS');
    }

    return await db.User.create({
      workspace_id: workspaceId,
      ...userData,
    });
  }

  async getWorkspaceUsers(workspaceId) {
    return await db.User.findAll({
      where: { workspace_id: workspaceId, ativo: true },
      attributes: ['id', 'nome', 'email', 'role', 'last_login_at', 'created_at'],
      order: [['nome', 'ASC']],
    });
  }
}

module.exports = WorkspaceService;