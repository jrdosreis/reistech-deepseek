const express = require('express');
const router = express.Router();
const controller = require('./ConversasController');
const { authenticate, authorize } = require('../../core/middleware/auth');

router.get('/', authenticate, authorize(['admin', 'supervisor', 'operator']), controller.list);
router.get('/last-messages', authenticate, authorize(['admin', 'supervisor', 'operator']), controller.lastMessages);
router.get('/:clienteId/mensagens', authenticate, authorize(['admin', 'supervisor', 'operator']), controller.mensagens);
router.get('/:clienteId/dossie', authenticate, authorize(['admin', 'supervisor', 'operator']), controller.dossie);
router.post('/:clienteId/mensagem', authenticate, authorize(['admin', 'supervisor', 'operator']), controller.enviarMensagem);

module.exports = router;
