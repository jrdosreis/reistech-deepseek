const express = require('express');
const router = express.Router();
const controller = require('./CatalogoController');
const { authenticate, authorize } = require('../../core/middleware/auth');
const { validate, schemas } = require('../../core/middleware/validation');

router.post('/import', 
  authenticate, 
  authorize(['admin', 'supervisor']), 
  validate(schemas.catalogo.import),
  controller.import
);

router.get('/', 
  authenticate, 
  authorize(['admin', 'supervisor', 'operator']), 
  controller.list
);

router.get('/whatsapp-text', 
  authenticate, 
  authorize(['admin', 'supervisor', 'operator']), 
  controller.getWhatsappText
);

router.put('/:id', 
  authenticate, 
  authorize(['admin', 'supervisor']), 
  validate(schemas.catalogo.update),
  controller.update
);

router.delete('/:id', 
  authenticate, 
  authorize(['admin', 'supervisor']), 
  controller.delete
);

module.exports = router;