const express = require('express');
const router = express.Router();
const controller = require('./AuthController');
const { validate, schemas } = require('../../core/middleware/validation');
const { authenticate, refreshTokenMiddleware } = require('../../core/middleware/auth');

// Rotas públicas
router.post('/login', validate(schemas.auth.login), controller.login);
router.post('/refresh', validate(schemas.auth.refresh), refreshTokenMiddleware, controller.refresh);

// Rotas protegidas
router.post('/logout', authenticate, controller.logout);
router.get('/me', authenticate, controller.me);

module.exports = router;