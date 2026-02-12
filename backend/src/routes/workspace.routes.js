const express = require('express');
const router = express.Router();
const WorkspaceController = require('../modules/workspaces/WorkspaceController');
const { audit } = require('../core/middleware/audit');

// GET /api/workspaces - Listar todos os workspaces
router.get('/', WorkspaceController.getAll);

// GET /api/workspaces/packs - Listar packs disponíveis
router.get('/packs', WorkspaceController.getPacks);

// GET /api/workspaces/:id - Buscar workspace por ID
router.get('/:id', WorkspaceController.getById);

// POST /api/workspaces - Criar novo workspace
router.post('/', audit('CREATE_WORKSPACE', 'Workspace'), WorkspaceController.create);

// PUT /api/workspaces/:id - Atualizar workspace
router.put('/:id', audit('UPDATE_WORKSPACE', 'Workspace'), WorkspaceController.update);

// DELETE /api/workspaces/:id - Deletar workspace
router.delete('/:id', audit('DELETE_WORKSPACE', 'Workspace'), WorkspaceController.delete);

// POST /api/workspaces/:workspaceId/reload-rules - Recarregar regras do workspace
router.post('/:workspaceId/reload-rules', audit('RELOAD_RULES', 'Workspace'), WorkspaceController.reloadRules);

module.exports = router;