const express = require('express');
const router = express.Router();
const controller = require('./AdminController');
const { authenticate, authorize } = require('../../core/middleware/auth');
const { audit } = require('../../core/middleware/audit');

// Apenas administradores podem acessar estas rotas
router.use(authenticate, authorize(['admin']));

router.post('/workspaces', audit('CREATE_WORKSPACE', 'Workspace'), controller.createWorkspace);
router.get('/workspaces', controller.listWorkspaces);
router.put('/workspaces/:id', audit('UPDATE_WORKSPACE', 'Workspace'), controller.updateWorkspace);

router.get('/workspaces/current', controller.getCurrentWorkspace);
router.put('/workspaces/current', audit('UPDATE_CURRENT_WORKSPACE', 'Workspace'), controller.updateCurrentWorkspace);

router.post('/workspaces/:id/vertical', audit('LOAD_VERTICAL_PACK', 'Workspace'), controller.loadVerticalPack);
router.get('/workspaces/:id/export-pack', controller.exportPack);
router.post('/workspaces/:id/import-pack', audit('IMPORT_PACK', 'Workspace'), controller.importPack);

router.post('/workspaces/current/vertical', audit('LOAD_VERTICAL_PACK', 'Workspace'), controller.loadVerticalPack);
router.get('/workspaces/current/export-pack', controller.exportPack);
router.post('/workspaces/current/import-pack', audit('IMPORT_PACK', 'Workspace'), controller.importPack);

router.get('/vertical-packs', controller.listVerticalPacks);
router.get('/users', controller.listUsers);

module.exports = router;