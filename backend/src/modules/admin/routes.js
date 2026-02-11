const express = require('express');
const router = express.Router();
const controller = require('./AdminController');
const { authenticate, authorize } = require('../../core/middleware/auth');

// Apenas administradores podem acessar estas rotas
router.use(authenticate, authorize(['admin']));

router.post('/workspaces', controller.createWorkspace);
router.get('/workspaces', controller.listWorkspaces);
router.put('/workspaces/:id', controller.updateWorkspace);

router.get('/workspaces/current', controller.getCurrentWorkspace);
router.put('/workspaces/current', controller.updateCurrentWorkspace);

router.post('/workspaces/:id/vertical', controller.loadVerticalPack);
router.get('/workspaces/:id/export-pack', controller.exportPack);
router.post('/workspaces/:id/import-pack', controller.importPack);

router.post('/workspaces/current/vertical', controller.loadVerticalPack);
router.get('/workspaces/current/export-pack', controller.exportPack);
router.post('/workspaces/current/import-pack', controller.importPack);

router.get('/vertical-packs', controller.listVerticalPacks);
router.get('/users', controller.listUsers);

module.exports = router;