const express = require('express');
const router = express.Router();
const controller = require('./CmsController');
const { authenticate, authorize } = require('../../core/middleware/auth');

router.get('/textos', 
  authenticate, 
  authorize(['admin', 'supervisor', 'operator']), 
  controller.list
);

router.get('/textos/:chave', 
  authenticate, 
  authorize(['admin', 'supervisor', 'operator']), 
  controller.get
);

router.post('/textos', 
  authenticate, 
  authorize(['admin', 'supervisor']), 
  controller.create
);

router.put('/textos/:chave', 
  authenticate, 
  authorize(['admin', 'supervisor']), 
  controller.update
);

router.post('/textos/:chave/ativar', 
  authenticate, 
  authorize(['admin', 'supervisor']),
  (req, res, next) => {
    req.body.ativo = true;
    next();
  },
  controller.toggleAtivo
);

router.post('/textos/:chave/desativar', 
  authenticate, 
  authorize(['admin', 'supervisor']),
  (req, res, next) => {
    req.body.ativo = false;
    next();
  },
  controller.toggleAtivo
);

module.exports = router;