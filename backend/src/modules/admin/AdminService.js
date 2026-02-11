const db = require('../../db/models');
const { AppError } = require('../../core/errors/AppError');
const fs = require('fs');
const path = require('path');

class AdminService {
  async getCurrentWorkspace(workspaceId) {
    const workspace = await db.Workspace.findByPk(workspaceId);
    if (!workspace) {
      throw new AppError('Workspace não encontrado', 'WORKSPACE_NOT_FOUND');
    }
    return workspace;
  }

  async listUsers(workspaceId) {
    return db.User.findAll({
      where: { workspace_id: workspaceId },
      order: [['created_at', 'DESC']],
      attributes: ['id', 'nome', 'email', 'role', 'ativo', 'created_at', 'updated_at'],
    });
  }

  async listVerticalPacks() {
    const packsDir = path.join(__dirname, '../../workspaces/packs');
    const files = fs.readdirSync(packsDir).filter((file) => file.endsWith('.json'));

    return files.map((file) => {
      const filePath = path.join(packsDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return {
        key: path.basename(file, '.json'),
        name: data.name || data.nome || path.basename(file, '.json'),
        description: data.description || data.descricao || '',
        version: data.version || '1.0.0',
      };
    });
  }
  async createWorkspace(data) {
    const transaction = await db.sequelize.transaction();
    
    try {
      // Verificar se slug já existe
      const existing = await db.Workspace.findOne({
        where: { slug: data.slug },
        transaction
      });

      if (existing) {
        throw new AppError('Slug já existe', 'SLUG_DUPLICADO');
      }

      const workspace = await db.Workspace.create(data, { transaction });

      // Carregar pack vertical se especificado
      if (data.vertical_key) {
        await this.loadVerticalPack(workspace.id, data.vertical_key, transaction);
      }

      await transaction.commit();
      return workspace;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async loadVerticalPack(workspaceId, verticalKey, transaction = null) {
    try {
      const packPath = path.join(__dirname, '../../workspaces/packs', `${verticalKey}.json`);
      
      if (!fs.existsSync(packPath)) {
        throw new AppError(`Pack vertical não encontrado: ${verticalKey}`, 'PACK_NOT_FOUND');
      }

      const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));

      // Carregar textos CMS do pack
      if (pack.textos_cms && Array.isArray(pack.textos_cms)) {
        for (const texto of pack.textos_cms) {
          await db.TextoCms.findOrCreate({
            where: { 
              workspace_id: workspaceId, 
              chave: texto.chave 
            },
            defaults: {
              workspace_id: workspaceId,
              chave: texto.chave,
              conteudo: texto.conteudo,
              ativo: texto.ativo !== false,
            },
            transaction
          });
        }
      }

      return pack;
    } catch (error) {
      throw new AppError(`Erro ao carregar pack: ${error.message}`, 'PACK_LOAD_ERROR');
    }
  }

  async exportPack(workspaceId) {
    const workspace = await db.Workspace.findByPk(workspaceId);
    if (!workspace) {
      throw new AppError('Workspace não encontrado', 'WORKSPACE_NOT_FOUND');
    }

    const textos = await db.TextoCms.findAll({
      where: { workspace_id: workspaceId },
      raw: true,
    });

    return {
      name: workspace.nome,
      key: workspace.vertical_key,
      description: `Pack exportado do workspace ${workspace.slug}`,
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      workspace: {
        slug: workspace.slug,
        nome: workspace.nome,
        vertical_key: workspace.vertical_key,
        timezone: workspace.timezone,
        moeda: workspace.moeda,
      },
      textos_cms: textos.map(t => ({
        chave: t.chave,
        conteudo: t.conteudo,
        ativo: t.ativo,
      })),
    };
  }

  async importPack(workspaceId, packData) {
    const transaction = await db.sequelize.transaction();
    
    try {
      // Limpar textos existentes (opcional)
      await db.TextoCms.destroy({
        where: { workspace_id: workspaceId },
        transaction
      });

      // Importar textos do pack
      if (packData.textos_cms && Array.isArray(packData.textos_cms)) {
        for (const texto of packData.textos_cms) {
          await db.TextoCms.create({
            workspace_id: workspaceId,
            chave: texto.chave,
            conteudo: texto.conteudo,
            ativo: texto.ativo !== false,
          }, { transaction });
        }
      }

      // Atualizar vertical_key do workspace
      if (packData.key) {
        await db.Workspace.update(
          { vertical_key: packData.key },
          { where: { id: workspaceId }, transaction }
        );
      }

      await transaction.commit();
      return { imported: packData.textos_cms?.length || 0 };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async listWorkspaces(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    
    const { count, rows } = await db.Workspace.findAndCountAll({
      order: [['created_at', 'DESC']],
      limit,
      offset,
      include: [{
        model: db.User,
        as: 'users',
        attributes: ['id', 'nome', 'email', 'role'],
        limit: 5,
      }],
    });

    return {
      workspaces: rows,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit),
      },
    };
  }

  async updateWorkspace(id, data) {
    const workspace = await db.Workspace.findByPk(id);
    
    if (!workspace) {
      throw new AppError('Workspace não encontrado', 'WORKSPACE_NOT_FOUND');
    }

    if (data.slug && data.slug !== workspace.slug) {
      const existing = await db.Workspace.findOne({
        where: { slug: data.slug }
      });

      if (existing) {
        throw new AppError('Slug já existe', 'SLUG_DUPLICADO');
      }
    }

    await workspace.update(data);
    return workspace;
  }
}

module.exports = AdminService;