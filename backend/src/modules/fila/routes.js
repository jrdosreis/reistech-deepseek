const express = require('express');
const router = express.Router();
const controller = require('./FilaController');
const { authenticate, authorize } = require('../../core/middleware/auth');

router.get('/', 
  authenticate, 
  authorize(['admin', 'supervisor', 'operator']), 
  controller.list
);

router.post('/:telefone/assumir', 
  authenticate, 
  authorize(['admin', 'supervisor', 'operator']), 
  controller.assumir
);

router.post('/:telefone/finalizar', 
  authenticate, 
  authorize(['admin', 'supervisor', 'operator']), 
  controller.finalizar
);

router.post('/liberar-expirados', 
  authenticate, 
  authorize(['admin', 'supervisor']), 
  controller.liberarExpirados
);

module.exports = router;