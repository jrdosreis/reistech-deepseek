# Copilot Instructions for AI Agents

## Big picture
- **Monorepo**: backend Node.js/Express e frontend React/Vite + MUI; Docker Compose em `docker-compose.yml` (prod em `docker-compose.prod.yml`).
- **Backend app**: Express em `backend/app.js`, HTTP server em `backend/server.js`; rotas sob `backend/src/routes/` e módulos de domínio sob `backend/src/modules/` atrás do prefixo `/api`.
- **FSM engine**: Motor determinístico em `backend/src/core/engine/` (classes `ReisTech.js`, `StateMachine.js`, `Router.js`, `DossierBuilder.js`) gerencia fluxo WhatsApp; workspace packs em `backend/src/workspaces/packs/` (`.json`) carregados via `VerticalPackLoader.js`.
- **Real‑time**: WebSocket server em `backend/src/websocket/WebSocketServer.js` e hook cliente em `frontend/src/contexts/hooks/useWebSocket.js`.
- **Data layer**: migrations em `backend/src/db/migrations/`, models Sequelize em `backend/src/db/models/`, seeds em `backend/src/db/seeds/`.

## Critical workflows
- **Local (sem Docker)**:
  - Backend: `cd backend && cp .env.example .env` → `npm install` → `npm run migrate up` → `npm run seed` → `npm run dev`.
  - Frontend: `cd frontend && npm install` → `npm run dev` (configure `VITE_API_URL`/`VITE_WS_URL` se necessário).
- **Docker**: `docker-compose up -d`, depois `docker-compose exec backend npm run migrate up && npm run seed`.
- **URLs padrão**: frontend http://localhost:5173, backend http://localhost:3001, WebSocket `ws://localhost:3001/ws`.
- **Credenciais default**: admin@reiscelulares.com.br / Admin123! (para testes locais).
- **Migrations**: `npm run migrate` (criar com `npm run migrate:create <nome>`), `npm run seed` para popular dados.

## Quality & tests
- **Backend**: `npm run test`, `npm run test:watch`, `npm run test:coverage`, `npm run lint`, `npm run format`.
- **Frontend**: `npm run test`, `npm run test:e2e`, `npm run lint`, `npm run format`.
- **Coverage**: Jest configurado em `jest.config.js` com setup em `jest.setup.js`.

## Project-specific conventions & patterns
- **API prefix `/api`**: Configurado via `API_PREFIX` env var. Exemplos: `POST /api/catalogo/import`, `GET /api/cms/textos`, `PUT /api/cms/textos/:chave`.
- **CMS texts**: Textos configuráveis em `backend/src/db/models/TextoCms.js` e módulo `backend/src/modules/cms/`; chave única por workspace.
- **RBAC**: Aplicado nos módulos; roles/permissões seedados em `backend/src/db/seeds/`.
- **Hot‑reload de regras**: `POST /api/workspaces/:workspaceId/reload-rules` sincroniza regras FSM via Redis Pub/Sub (`reistech:reload-rules` channel); implementado em `DossierBuilder.js` (publica) e `WorkspaceController.js` (endpoint).
- **Error handling**: Erros centralizados em `backend/src/core/errors/` (classe `AppError` com `errorHandler` middleware); logging via Winston em `backend/src/config/logger.js`.
- **Auth flow**: JWT access/refresh tokens; cliente Axios em `frontend/src/services/api.js` usa baseURL `/api`, lê `accessToken` do localStorage e faz refresh automático em `frontend/src/store/authSlice.js` (401 → refresh + retry).
- **WebSocket**: Conectar em `/ws?token=JWT` (JWT contém `userId`, `workspaceId`, `role`); enviar `{type:'subscribe'|'unsubscribe', channel}` para canais. Implementação em `WebSocketServer.js` e hook `useWebSocket.js`.
- **FSM states**: Estados gerenciados em `StateMachine.js`; transições determinadas por `Router.js`; dossiê do cliente construído por `DossierBuilder.js` (extrai dados via regex dinâmicas dos packs).

## Integrations & infra
- **WhatsApp**: Integração via `whatsapp-web.js` (Puppeteer); sessões em `backend/whatsapp-sessions/`; configurado em `.env` (`WHATSAPP_SESSION_PATH`, `WHATSAPP_PUPPETEER_ARGS`).
- **PostgreSQL**: Obrigatório; porta 5433 (Docker) ou 5432 (local); conexão via `backend/src/config/database.js`.
- **Redis**: Opcional mas recomendado para sessões/rate limiting e sync hot-reload; porta 6379; configurado via `REDIS_URL`.
- **Produção**: PM2 cluster mode (4 instâncias) via `ecosystem.config.js`; deploy com `scripts/deploy-production.sh`; Traefik em `docker-compose.prod.yml`.

## Key files reference
- **Entry points**: `backend/server.js` (HTTP + WebSocket), `backend/app.js` (Express), `frontend/src/main.jsx`.
- **Routing**: `backend/src/routes/index.js` agrega rotas dos módulos; `workspace.routes.js` para reload de regras.
- **Engine**: `backend/src/core/engine/ReisTech.js` (orchestrator), `StateMachine.js` (state logic), `Router.js` (flow transitions), `DossierBuilder.js` (data extraction + cache).
- **Packs**: `backend/src/workspaces/packs/*.json` (iphone_store, law_firm, motorcycle_shop); estrutura: `name`, `key`, `version`, `textos_cms`, `config`.
- **WebSocket client**: `frontend/src/contexts/hooks/useWebSocket.js` (connection, subscriptions, event handling).
