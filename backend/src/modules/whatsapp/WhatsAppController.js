const { getWhatsAppService } = require('./WhatsAppService');
const { responseSuccess, responseError } = require('../../core/utils/response');

class WhatsAppController {
  async getStatus(req, res, next) {
    try {
      const service = getWhatsAppService();
      const status = service.getStatus();
      
      res.json(responseSuccess(status));
    } catch (error) {
      next(error);
    }
  }

  async getQrCode(req, res, next) {
    try {
      const service = getWhatsAppService();
      const qrCode = await service.getQrCode();
      
      if (!qrCode) {
        return res.json(responseError('QR Code não disponível', 'QR_NOT_AVAILABLE'));
      }
      
      res.json(responseSuccess({ qr: qrCode }));
    } catch (error) {
      next(error);
    }
  }

  async reconnect(req, res, next) {
    try {
      const service = getWhatsAppService();
      await service.reconnect();
      
      res.json(responseSuccess({ message: 'Reconexão iniciada' }));
    } catch (error) {
      next(error);
    }
  }

  async sendMessage(req, res, next) {
    try {
      const { to, message } = req.body;
      
      if (!to || !message) {
        return res.status(400).json(
          responseError('Destinatário e mensagem são obrigatórios', 'INVALID_PARAMS')
        );
      }

      const service = getWhatsAppService();
      await service.sendMessage(to, message);
      
      res.json(responseSuccess({ message: 'Mensagem enviada' }));
    } catch (error) {
      next(error);
    }
  }

  async getStats(req, res, next) {
    try {
      const service = getWhatsAppService();
      const stats = await service.getStats(req.workspace.id);
      res.json(responseSuccess(stats));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new WhatsAppController();