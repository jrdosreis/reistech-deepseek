const express = require('express');
const router = express.Router();
const controller = require('./WhatsAppController');
const { authenticate, authorize } = require('../../core/middleware/auth');

router.get('/status', authenticate, authorize(['admin', 'supervisor', 'operator']), controller.getStatus);
router.get('/qr', authenticate, authorize(['admin', 'supervisor', 'operator']), controller.getQrCode);
router.get('/stats', authenticate, authorize(['admin', 'supervisor', 'operator']), controller.getStats);
router.post('/reconnect', authenticate, authorize(['admin', 'supervisor']), controller.reconnect);
router.post('/send', authenticate, authorize(['admin', 'supervisor', 'operator']), controller.sendMessage);

module.exports = router;