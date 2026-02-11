const db = require('../../db/models');
const { AppError } = require('../../core/errors/AppError');

class CmsService {
  async getTextos(workspaceId, search = '') {
    const where = { workspace_id: workspaceId };
    
    if (search) {
      where.chave = { [db.Sequelize.Op.iLike]: `%${search}%` };
    }

    return await db.TextoCms.findAll({
      where,
      order: [['chave', 'ASC']],
    });
  }

  async updateTexto(workspaceId, chave, conteudo) {
    const [texto, created] = await db.TextoCms.findOrCreate({
      where: { workspace_id: workspaceId, chave },
      defaults: { conteudo, ativo: true },
    });

    if (!created) {
      texto.conteudo = conteudo;
      await texto.save();
    }

    return texto;
  }

  async toggleAtivo(workspaceId, chave, ativo) {
    const texto = await db.TextoCms.findOne({
      where: { workspace_id: workspaceId, chave },
    });

    if (!texto) {
      throw new AppError('Texto não encontrado', 'TEXTO_NOT_FOUND');
    }

    texto.ativo = ativo;
    await texto.save();
    return texto;
  }

  async createTexto(workspaceId, chave, conteudo) {
    const existing = await db.TextoCms.findOne({
      where: { workspace_id: workspaceId, chave },
    });

    if (existing) {
      throw new AppError('Chave já existe', 'CHAVE_DUPLICADA');
    }

    return await db.TextoCms.create({
      workspace_id: workspaceId,
      chave,
      conteudo,
      ativo: true,
    });
  }

  async getTexto(workspaceId, chave) {
    const texto = await db.TextoCms.findOne({
      where: { workspace_id: workspaceId, chave },
    });

    if (!texto) {
      throw new AppError('Texto não encontrado', 'TEXTO_NOT_FOUND');
    }

    return texto;
  }
}

module.exports = CmsService;