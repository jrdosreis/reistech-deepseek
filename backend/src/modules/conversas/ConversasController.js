const { responseSuccess, responseError } = require('../../core/utils/response');
const ConversasService = require('./ConversasService');

class ConversasController {
  async list(req, res, next) {
    try {
      const telefone = req.query.telefone;
      const data = await ConversasService.listConversas(req.workspace.id, telefone);
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
      if (error.code === 'CLIENTE_NOT_FOUND') {
        return res.status(404).json(responseError(error.message, error.code));
      }
      next(error);
    }
  }
}

module.exports = new ConversasController();
