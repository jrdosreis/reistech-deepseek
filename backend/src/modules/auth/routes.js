const express = require('express');
const router = express.Router();
const controller = require('./AuthController');
const { validate, schemas } = require('../../core/middleware/validation');
const { authenticate, refreshTokenMiddleware } = require('../../core/middleware/auth');
const { audit } = require('../../core/middleware/audit');

// Rotas públicas
router.post('/login', validate(schemas.auth.login), audit('LOGIN', 'Session'), controller.login);
router.post('/refresh', validate(schemas.auth.refresh), refreshTokenMiddleware, audit('REFRESH_TOKEN', 'Session'), controller.refresh);

// Rotas protegidas
router.post('/logout', authenticate, audit('LOGOUT', 'Session'), controller.logout);
router.get('/me', authenticate, controller.me);

module.exports = router;