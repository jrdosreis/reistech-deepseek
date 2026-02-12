# Copilot Instructions for AI Agents

## Quick reference
- **Stack**: Node 18 / Express backend · React 18 / Vite / MUI frontend · PostgreSQL 15 · Redis 7 (optional) · whatsapp-web.js
- **Concept**: FSM-driven WhatsApp automation with multi-tenant workspace isolation and hot-reloadable business rules
- **Language**: Codebase mixes English (code) and Portuguese (UI, tests, CMS keys, comments). Test descriptions and user-facing strings are in pt-BR.
- **Remote Docker host**: Development supports a Windows machine as Docker daemon on the local network, configured via `DOCKER_HOST` env var. See `docs/DOCKER_REMOTE_MAC_WINDOWS.md`.

| Component | Key path |
|---|---|
| Entry point (HTTP) | `backend/server.js` |
| Express app | `backend/app.js` |
| FSM engine | `backend/src/core/engine/ReisTech.js` |
| WebSocket server | `backend/src/websocket/WebSocketServer.js` |
| React entry | `frontend/src/main.jsx` |
| API client | `frontend/src/services/api.js` |
| Route aggregator | `backend/src/routes/index.js` |

## Architecture overview

```
backend/server.js          → HTTP server + WebSocket bootstrap
backend/app.js             → Express app (middleware chain, route registration, DB init)
backend/src/routes/        → Route aggregator; each module provides its own routes
backend/src/modules/       → Domain modules (auth, fila, cms, catalogo, whatsapp, conversas, admin, workspaces, notifications, reports)
backend/src/core/engine/   → FSM engine (ReisTech → StateMachine → Router → DossierBuilder)
backend/src/core/errors/   → AppError class + global errorHandler middleware
backend/src/core/middleware/→ auth.js (JWT + RBAC), validation.js (Joi), auditLogger.js
backend/src/db/            → migrations/ (node-pg-migrate), models/ (Sequelize), seeds/
backend/src/websocket/     → WebSocketServer.js
backend/src/workspaces/packs/ → Vertical-specific JSON packs (iphone_store, law_firm, motorcycle_shop)
frontend/src/              → React app: pages/, components/, store/ (Redux Toolkit), services/api.js, contexts/hooks/
```

### Middleware order in `app.js`
Helmet → CORS → rate limiter (on `/api` only) → Morgan/Winston → JSON body → URL-encoded → `GET /health` → WSS injection → API routes → 404 → errorHandler

### FSM message pipeline
`ReisTech.processMessage()` → load/create client → log inbound interaction → `StateMachine.transition()` → `Router.determineIntent()` (keyword NLP via `natural` lib) → `DossierBuilder.updateDossier()` (regex extraction, static cache, Redis Pub/Sub sync) → escalation check → log outbound

## Dev workflows

```bash
# Backend local
cd backend && npm install && npm run dev          # :3000

# Frontend local
cd frontend && npm install && npm run dev          # :5173

# Docker
docker-compose up -d
docker-compose exec backend npm run migrate up
docker-compose exec backend npm run seed

# Database
npm run migrate up          # node-pg-migrate (NOT Sequelize CLI)
npm run migrate:create name # new migration file
npm run seed                # idempotent
npm run db:reset            # down → up → seed

# Tests (run from backend/ or frontend/)
npm test                    # Jest (backend: jest.config.js, frontend: jest.config.cjs)
npm run test:coverage       # coverage report
npm run lint && npm run format
```

**Three `.env` files**: root (Docker Compose), `backend/.env`, `frontend/.env`. See `docs/SETUP_LOCAL.md`.

## Module conventions

### Backend module pattern
Each module in `backend/src/modules/<name>/` follows: **Controller** (class, binds `this` in constructor) + **Service** + **routes file**. Routes compose middleware: `authenticate` → `authorize([roles])` → `validate(schema)` → controller method.

Exception: `notifications` and `reports` are service-only (no routes), consumed internally. Workspace routes live in `backend/src/routes/workspace.routes.js` instead of inside the module.

### Error handling
```js
throw new AppError('Workspace não encontrado', 'WORKSPACE_NOT_FOUND', 404);
```
`AppError(message, code, statusCode)` — flat hierarchy, differentiated by `code` string. The `errorHandler` also catches Joi `ValidationError`, Sequelize errors, and JWT errors with specific status codes. Sensitive fields are redacted before logging.

### API routes
All behind `/api` prefix. Key prefixes: `/auth`, `/whatsapp`, `/cms`, `/catalogo`, `/fila`, `/admin`, `/conversas`, `/workspaces`. Route map in `backend/src/routes/index.js`.

## Frontend patterns

- **State**: Redux Toolkit with 4 slices: `authSlice`, `uiSlice`, `websocketSlice`, `notificationSlice`
- **API client**: `frontend/src/services/api.js` — Axios instance with auto-refresh interceptor (401 → refresh token → retry; 403 → logout). Store reference injected via `injectStore()` to avoid circular deps.
- **Routing**: React Router v6 with lazy loading. Protected routes under `/painel/*`; public route at `/login`.
- **WebSocket**: Custom hook `useWebSocket()` with exponential backoff reconnection. Channels: `fila_updates`, `new_messages`, `notifications`.
- **Provider hierarchy**: Redux Provider → BrowserRouter → NotificationProvider → ThemeProvider → CssBaseline → App

### Authentication (JWT)
- **Access token**: 15 min, sent via `Authorization: Bearer`
- **Refresh token**: 30 days, stored as SHA-256 hash in `refresh_tokens` table
- **Frontend flow**: 401 → automatic refresh via interceptor; 403 → forced logout
- **WebSocket auth**: connect to `/ws` with JWT in query param or `Authorization` header

### WebSocket protocol
- **Subscribe**: `{ type: 'subscribe', channel: '...' }`
- **Channels**: `fila_updates`, `new_messages`, `notifications`
- **Reconnection**: exponential backoff, max 5 attempts (client-side in `useWebSocket()`)

### CMS texts
- **Model**: `TextoCms` — unique `chave` per `workspace_id`
- **Usage**: `Router.getCmsTextForState()` for FSM responses; CRUD via `/api/cms/textos`
- **Packs**: each JSON pack includes `textos_cms[]` with default messages seeded on workspace creation

### Hot-reload rules
- **Endpoint**: `POST /api/workspaces/:workspaceId/reload-rules`
- **Mechanism**: `DossierBuilder.reloadRules()` → clears static `rulesCache` (Map) → publishes to Redis channel `reistech:reload-rules`
- **Cluster sync**: all PM2 instances subscribe to the channel and invalidate their local cache on message

## Database

- **ORM**: Sequelize models in `backend/src/db/models/` (11 models: Workspace, User, RefreshToken, Cliente, ConversaInteracao, ClienteEstado, FilaHumana, TextoCms, CatalogoItem, AuditLog, Notification)
- **Migrations**: `node-pg-migrate`, files numbered `NNN_<verb>_<entity>.js` (e.g., `005_create_conversas_interacoes.js`)
- **Dual connection**: Sequelize ORM + raw `pg` Pool in `backend/src/config/database.js`
- **Multi-tenant isolation**: Most models `belongsTo: Workspace`; always filter by `workspace_id`

## Workspace packs

JSON files in `backend/src/workspaces/packs/` define vertical behavior:
```json
{ "name", "key", "version",
  "config": { "whatsapp": {...}, "catalogo": {...}, "fluxos": [...] },
  "textos_cms": [{ "chave": "menu.principal.titulo", "conteudo": "...", "ativo": true }],
  "fluxos": { "<flow_name>": { "estados": [...], "coleta_dados": [{ "campo", "pergunta", "obrigatorio", "tipo" }] } }
}
```
Changes require hot-reload: `POST /api/workspaces/:id/reload-rules` → clears `DossierBuilder.rulesCache` → publishes to Redis channel `reistech:reload-rules`.

## Testing conventions

- **Colocated tests**: `*.test.js` next to source (e.g., `DossierBuilder.test.js` alongside `DossierBuilder.js`). Integration tests also in `backend/tests/integration/`.
- **Mocks**: Manual `jest.mock()` for each dependency (Sequelize models, `fs`, `ioredis`). Use `beforeEach` to clear static caches.
- **Test language**: Descriptions in Portuguese (`'deve retornar dossiê vazio...'`).
- **Frontend**: Jest + React Testing Library; E2E with Cypress (`frontend/cypress/`).

## Key integrations

- **WhatsApp**: whatsapp-web.js (Puppeteer). Sessions in `backend/whatsapp-sessions/`. Non-blocking init with 1s delay. Use `--no-sandbox` in containers.
- **Redis**: Optional. Used for rate limiting, token blacklist, and FSM rule sync (Pub/Sub on `reistech:reload-rules`).
- **Production**: PM2 cluster (4 instances, `ecosystem.config.js`), deploy via `scripts/deploy-production.sh`, Traefik reverse proxy in `docker-compose.prod.yml`.

## ⚠️ Known issues / inconsistencies

- **Modelo `Notification` órfão**: definido em `backend/src/db/models/Notification.js` mas **não registrado** no `models/index.js`. Migration `011` cria a tabela, porém o ORM não a mapeia.
- **Páginas sem rota no frontend**: `Relatorios.jsx` e `Dashboard.jsx` existem em `frontend/src/pages/` mas **não possuem rotas** configuradas no `App.jsx`.
- **Teste duplicado de `DossierBuilder`**: arquivos de teste em `backend/src/core/engine/DossierBuilder.test.js` (colocado) e `backend/tests/unit/DossierBuilder.test.js`. Manter apenas a versão atualizada.
- **Health endpoints**: README documenta `/health/db`, `/health/redis`, `/health/whatsapp`, mas apenas `GET /health` está implementado em `app.js`.
