const express = require('express');
const router = express.Router();

// Importar rotas dos módulos
const authRoutes = require('../modules/auth/routes');
const whatsappRoutes = require('../modules/whatsapp/routes');
const cmsRoutes = require('../modules/cms/routes');
const catalogoRoutes = require('../modules/catalogo/routes');
const filaRoutes = require('../modules/fila/routes');
const adminRoutes = require('../modules/admin/routes');
const conversasRoutes = require('../modules/conversas/routes');
const workspaceRoutes = require('./workspace.routes');

// Rotas públicas
router.get('/', (req, res) => {
  res.json({ 
    success: true, 
    data: { 
      name: 'ReisTech API', 
      version: '1.0.0',
      status: 'operational'
    } 
  });
});

// Rotas de autenticação (públicas)
router.use('/auth', authRoutes);

// Rotas protegidas
router.use('/whatsapp', whatsappRoutes);
router.use('/cms', cmsRoutes);
router.use('/catalogo', catalogoRoutes);
router.use('/fila', filaRoutes);
router.use('/admin', adminRoutes);
router.use('/conversas', conversasRoutes);
router.use('/workspaces', workspaceRoutes);

module.exports = router;