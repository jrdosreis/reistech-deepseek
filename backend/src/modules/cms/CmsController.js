const CmsService = require('./CmsService');
const { responseSuccess } = require('../../core/utils/response');

const cmsService = new CmsService();

class CmsController {
  async list(req, res, next) {
    try {
      const { workspace } = req;
      const { search } = req.query;

      const textos = await cmsService.getTextos(workspace.id, search);
      res.json(responseSuccess(textos));
    } catch (error) {
      next(error);
    }
  }

  async get(req, res, next) {
    try {
      const { workspace } = req;
      const { chave } = req.params;

      const texto = await cmsService.getTexto(workspace.id, chave);
      res.json(responseSuccess(texto));
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const { workspace } = req;
      const { chave, conteudo } = req.body;

      const texto = await cmsService.createTexto(workspace.id, chave, conteudo);
      res.json(responseSuccess(texto, 'Texto criado com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { workspace } = req;
      const { chave } = req.params;
      const { conteudo } = req.body;

      const texto = await cmsService.updateTexto(workspace.id, chave, conteudo);
      res.json(responseSuccess(texto, 'Texto atualizado com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  async toggleAtivo(req, res, next) {
    try {
      const { workspace } = req;
      const { chave } = req.params;
      const { ativo } = req.body;

      const texto = await cmsService.toggleAtivo(workspace.id, chave, ativo);
      res.json(responseSuccess(texto, `Texto ${ativo ? 'ativado' : 'desativado'} com sucesso`));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CmsController();