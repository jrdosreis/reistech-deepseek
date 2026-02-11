const express = require('express');
const router = express.Router();
const WorkspaceController = require('../modules/workspaces/WorkspaceController');

// GET /api/workspaces - Listar todos os workspaces
router.get('/', WorkspaceController.getAll);

// GET /api/workspaces/packs - Listar packs disponíveis
router.get('/packs', WorkspaceController.getPacks);

// GET /api/workspaces/:id - Buscar workspace por ID
router.get('/:id', WorkspaceController.getById);

// POST /api/workspaces - Criar novo workspace
router.post('/', WorkspaceController.create);

// PUT /api/workspaces/:id - Atualizar workspace
router.put('/:id', WorkspaceController.update);

// DELETE /api/workspaces/:id - Deletar workspace
router.delete('/:id', WorkspaceController.delete);

// POST /api/workspaces/:workspaceId/reload-rules - Recarregar regras do workspace
router.post('/:workspaceId/reload-rules', WorkspaceController.reloadRules);

module.exports = router;