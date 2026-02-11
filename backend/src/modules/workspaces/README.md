# Módulo de Workspaces

Este módulo gerencia os workspaces (ambientes multi-tenant) do sistema ReisTech.

## Estrutura

- `WorkspaceController.js` - Controlador com endpoints REST
- `WorkspaceService.js` - Lógica de negócio e acesso ao banco
- Routes definidas em `/backend/src/routes/workspace.routes.js`

## Endpoints

### GET /api/workspaces
Lista todos os workspaces cadastrados.

### GET /api/workspaces/packs
Lista os packs verticais disponíveis (iphone_store, law_firm, motorcycle_shop).

### GET /api/workspaces/:id
Busca um workspace específico por ID.

### POST /api/workspaces
Cria um novo workspace.

**Body:**
```json
{
  "nome": "Loja iPhone Centro",
  "pack_key": "iphone_store"
}
```

### PUT /api/workspaces/:id
Atualiza um workspace existente.

**Body:**
```json
{
  "nome": "Novo Nome",
  "pack_key": "law_firm",
  "configuracao": {},
  "ativo": true
}
```

### DELETE /api/workspaces/:id
Remove um workspace.

### POST /api/workspaces/:workspaceId/reload-rules
Recarrega as regras do motor FSM para o workspace especificado. Utiliza Redis Pub/Sub para sincronizar todas as instâncias do cluster.

## Integração com FSM

Cada workspace possui um `pack_key` que referencia um pack vertical em `/backend/src/workspaces/packs/`. O pack contém:
- Configurações do motor FSM
- Textos CMS padrão
- Regras de extração de dados (regex patterns)
- Fluxo de estados

## Hot-Reload

O endpoint `reload-rules` permite atualizar as regras em tempo de execução sem reiniciar a aplicação:
1. Limpa o cache local de regras
2. Publica mensagem no Redis (`reistech:reload-rules`)
3. Todas as instâncias PM2 recebem e recarregam suas regras
