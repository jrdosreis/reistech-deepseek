const FilaService = require('./FilaService');
const { responseSuccess } = require('../../core/utils/response');

const filaService = new FilaService();

class FilaController {
  async list(req, res, next) {
    try {
      const { workspace } = req;
      const { status } = req.query;

      const fila = await filaService.getFila(workspace.id, status);
      res.json(responseSuccess(fila));
    } catch (error) {
      next(error);
    }
  }

  async assumir(req, res, next) {
    try {
      const { workspace, user } = req;
      const { telefone } = req.params;
      const { lockDuration = 900 } = req.body;

      const fila = await filaService.assumirCliente(workspace.id, telefone, user.id, lockDuration);
      res.json(responseSuccess(fila, 'Cliente assumido com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  async finalizar(req, res, next) {
    try {
      const { workspace, user } = req;
      const { telefone } = req.params;
      const { desfecho } = req.body;

      const fila = await filaService.finalizarAtendimento(workspace.id, telefone, user.id, desfecho);
      res.json(responseSuccess(fila, 'Atendimento finalizado com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  async liberarExpirados(req, res, next) {
    try {
      const { workspace } = req;
      const liberados = await filaService.liberarLocksExpirados(workspace.id);
      res.json(responseSuccess({ liberados }, `${liberados} locks expirados liberados`));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new FilaController();