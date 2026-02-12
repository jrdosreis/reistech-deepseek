const { responseSuccess, responseError } = require('../../core/utils/response');
const ConversasService = require('./ConversasService');

class ConversasController {
  async list(req, res, next) {
    try {
      const { telefone, page = 1, limit = 20 } = req.query;
      const parsedPage = Math.max(1, parseInt(page, 10) || 1);
      const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
      const offset = (parsedPage - 1) * parsedLimit;

      const data = await ConversasService.listConversas(req.workspace.id, telefone, offset, parsedLimit);
      res.json(responseSuccess(data));
    } catch (error) {
      next(error);
    }
  }

  async lastMessages(req, res, next) {
    try {
      const limit = Number.parseInt(req.query.limit, 10) || 10;
      const data = await ConversasService.listLastMessages(req.workspace.id, limit);
      res.json(responseSuccess(data));
    } catch (error) {
      next(error);
    }
  }

  async mensagens(req, res, next) {
    try {
      const { clienteId } = req.params;
      const data = await ConversasService.listMensagens(req.workspace.id, clienteId);
      res.json(responseSuccess(data));
    } catch (error) {
      next(error);
    }
  }

  async dossie(req, res, next) {
    try {
      const { clienteId } = req.params;
      const data = await ConversasService.getDossie(req.workspace.id, clienteId);
      res.json(responseSuccess(data));
    } catch (error) {
      next(error);
    }
  }

  async enviarMensagem(req, res, next) {
    try {
      const { clienteId } = req.params;
      const { mensagem } = req.body || {};

      if (!mensagem || !mensagem.trim()) {
        return res.status(400).json(responseError('Mensagem é obrigatória', 'VALIDATION_ERROR'));
      }

      const data = await ConversasService.sendMensagem({
        workspaceId: req.workspace.id,
        clienteId,
        mensagem: mensagem.trim(),
        operadorId: req.user.id,
      });

      res.json(responseSuccess(data));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ConversasController();
