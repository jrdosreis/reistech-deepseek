# Copilot Instructions for AI Agents

## Quick reference
- **Tech stack**: Node.js/Express backend + React/Vite/MUI frontend + PostgreSQL + Redis (optional) + whatsapp-web.js
- **Development approach**: Monorepo with containerized dev/prod environments; local setup also supported
- **Key concept**: FSM-driven WhatsApp automation with multi-tenant workspace isolation and hot-reloadable business rules

## Setup documentation
- **Official manual**: See `MANUAL-OFICIAL.html` for complete Docker + remote development setup (Windows Docker host + MacBook development)
- **Local setup guide**: `docs/SETUP_LOCAL.md` for non-Docker development
- **Environment**: Windows at 192.168.100.232 (Docker host), MacBook (development station)
- **Credentials**: All `.env` files with validated credentials documented in manual (DB, SMTP, JWT, admin access)
- **Three `.env` files**: Root (Docker Compose), `backend/.env` (local backend), `frontend/.env` (Vite vars)

## Big picture
- **Monorepo**: Backend Node.js/Express + frontend React/Vite + MUI; containerized via `docker-compose.yml` (production: `docker-compose.prod.yml`)
- **Backend app**: Express app in `backend/app.js`, HTTP server in `backend/server.js`; routes under `backend/src/routes/` and domain modules under `backend/src/modules/` behind `/api` prefix
- **FSM engine**: Deterministic engine in `backend/src/core/engine/` (classes: `ReisTech.js`, `StateMachine.js`, `Router.js`, `DossierBuilder.js`) manages WhatsApp conversation flow; workspace packs in `backend/src/workspaces/packs/` (JSON files) define vertical-specific behavior
- **Real-time**: WebSocket server in `backend/src/websocket/WebSocketServer.js` with React hook at `frontend/src/contexts/hooks/useWebSocket.js`
- **Data layer**: Migrations in `backend/src/db/migrations/`, Sequelize models in `backend/src/db/models/`, seeds in `backend/src/db/seeds/`
- **Multi-tenant**: Each workspace has isolated configuration (pack), CMS texts, catalog, and client state; workspace ID used throughout system for data isolation

## Critical workflows

### Local setup (without Docker)
```bash
# Backend
cd backend && cp .env.example .env
npm install
npm run migrate up
npm run seed
npm run dev  # Runs on :3000

# Frontend (new terminal)
cd frontend && npm install
npm run dev  # Runs on :5173
```

### Docker setup
```bash
docker-compose up -d
docker-compose exec backend npm run migrate up
docker-compose exec backend npm run seed
```

### Database operations
- **Migrations**: `npm run migrate up/down`, create new: `npm run migrate:create <name>`
- **Seeds**: `npm run seed` (idempotent, safe to re-run)
- **Reset DB**: `npm run db:reset` (down → up → seed)
- **Important**: Migrations use `node-pg-migrate`, not Sequelize CLI

### Default URLs & credentials
- **Local dev**: Frontend http://localhost:5173, Backend http://localhost:3000/api, WebSocket ws://localhost:3000/ws
- **Remote (Windows Docker)**: Frontend http://192.168.100.232, Backend http://192.168.100.232:3000/api, WebSocket ws://192.168.100.232:3000/ws
- **Default login**: contato@reiscelulares.com.br / admin@reiscelulares
- **SMTP**: Hostinger (smtp.hostinger.com:465) - credentials in `.env`
- **PostgreSQL**: Default port 5432, alternate Docker config uses 5433

## Quality & tests

### Backend
```bash
npm run test              # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # Generate coverage report
npm run lint              # ESLint
npm run format            # Prettier
```
- **Test files**: Colocated with source (e.g., `DossierBuilder.test.js` alongside `DossierBuilder.js`)
- **Framework**: Jest with Supertest for integration tests
- **Config**: `jest.config.js` in backend root

### Frontend
```bash
npm run test              # Jest tests
npm run test:e2e          # Cypress E2E tests
npm run lint              # ESLint
npm run format            # Prettier
```
- **Framework**: Jest + React Testing Library + Cypress
- **Config**: `jest.config.cjs` (CommonJS) due to Vite ESM requirements

## Project-specific conventions & patterns

### API structure
- **All API routes** use `/api` prefix (configured via `API_PREFIX` env var)
- **Route organization**: Each domain module (`auth`, `whatsapp`, `fila`, `cms`, etc.) exports routes registered in `backend/src/routes/index.js`
- **Example endpoints**: `POST /api/catalogo/import`, `GET /api/cms/textos`, `PUT /api/cms/textos/:chave`, `POST /api/workspaces/:workspaceId/reload-rules`

### FSM Engine architecture
- **Message flow**: `ReisTech.processMessage()` → `StateMachine.transition()` → `Router.determineIntent()` → `DossierBuilder.updateDossier()` → Response generation
- **State management**: Client state stored in PostgreSQL (`cliente_estado` table); transitions logged in `interacoes` table
- **Escalation logic**: Deterministic rules in `ReisTech.shouldEscalateToHuman()` check for explicit requests, dossier completeness, technical complexity, or timeout
- **Dossier**: Client context built from conversation; data extracted via regex patterns defined in workspace packs

### Hot-reload rules system
- **Endpoint**: `POST /api/workspaces/:workspaceId/reload-rules` triggers regex rules reload
- **Sync mechanism**: `DossierBuilder.reloadRules()` clears local cache + publishes to Redis channel `reistech:reload-rules`
- **Cluster sync**: All PM2 instances subscribe to channel and invalidate their cache on message receipt
- **Implementation**: Static cache in `DossierBuilder.rulesCache` (Map); Redis Pub/Sub initialized in `DossierBuilder.initRedis()`

### Error handling
- **Custom errors**: Extend `AppError` class (`backend/src/core/errors/AppError.js`) with `message`, `code`, `statusCode`
- **Global handler**: `errorHandler` middleware in `backend/src/core/errors/errorHandler.js` sanitizes sensitive fields, logs with Winston, returns consistent JSON response
- **Usage**: `throw new AppError('Workspace não encontrado', 'WORKSPACE_NOT_FOUND', 404)`

### Authentication & authorization
- **JWT flow**: Access token (15min) + refresh token (30d); tokens in `Authorization: Bearer` header
- **Frontend client**: Axios instance in `frontend/src/services/api.js` with auto-refresh interceptor (401 → refresh + retry → logout on fail)
- **RBAC**: Roles/permissions seeded from `backend/src/db/seeds/`; enforced via middleware in module routes
- **WebSocket auth**: Connect to `/ws?token=<JWT>`; token verified on connection, decoded user stored in `ws.userId`, `ws.workspaceId`, `ws.userRole`

### WebSocket patterns
- **Client hook**: `useWebSocket()` in `frontend/src/contexts/hooks/useWebSocket.js` handles connection, reconnection (exponential backoff), subscriptions
- **Channels**: `fila_updates`, `new_messages`, `notifications`; subscribe via `{type:'subscribe', channel:'...'}`
- **Server architecture**: `WebSocketServer` tracks clients by userId (Map), workspace subscriptions, channel subscriptions; supports heartbeat/ping-pong

### CMS texts system
- **Purpose**: No-code message customization per workspace
- **Model**: `TextoCms` in `backend/src/db/models/TextoCms.js`; unique key per workspace
- **Pack integration**: Each pack JSON defines `textos_cms` array with default texts; seeded on workspace creation
- **Usage**: Retrieve texts via CMS module endpoints (`GET /api/cms/textos`, `PUT /api/cms/textos/:chave`)

### Workspace packs
- **Location**: `backend/src/workspaces/packs/*.json` (iphone_store, law_firm, motorcycle_shop)
- **Structure**: `name`, `key`, `version`, `config` (WhatsApp settings, catalog config), `textos_cms` (default messages), `fluxos` (state definitions, data collection rules)
- **Loading**: Packs read at runtime; changes require hot-reload via `/reload-rules` endpoint

## Integrations & infrastructure

### WhatsApp
- **Library**: whatsapp-web.js (Puppeteer-based)
- **Sessions**: Persist in `backend/whatsapp-sessions/` directory
- **Config**: `WHATSAPP_SESSION_PATH`, `WHATSAPP_PUPPETEER_ARGS` (use `--no-sandbox,--disable-setuid-sandbox` in containers)
- **Initialization**: Non-blocking startup in `backend/app.js` (1s delay after DB connect)

### PostgreSQL
- **Ports**: 5432 (local/Docker default), 5433 (alternate Docker config)
- **Connection**: Sequelize via `backend/src/config/database.js`; credentials from `.env` (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`)
- **Required**: Core dependency; app exits if connection fails

### Redis
- **Optional** but recommended for production (rate limiting, session store, hot-reload sync)
- **Port**: 6379
- **Config**: `REDIS_URL` env var (example: `redis://localhost:6379`)
- **Pub/Sub**: Channel `reistech:reload-rules` for FSM rule synchronization across cluster

### Production deployment
- **PM2 cluster**: 4 instances via `ecosystem.config.js`; auto-restart, memory limit 1GB, graceful shutdown
- **Deploy script**: `scripts/deploy-production.sh` (sets up non-root user, secure permissions, systemd service)
- **Reverse proxy**: Traefik configured in `docker-compose.prod.yml` for HTTPS termination

## Key file reference
- **Entry points**: `backend/server.js` (HTTP + WebSocket), `backend/app.js` (Express app), `frontend/src/main.jsx` (React root)
- **Routing**: `backend/src/routes/index.js` (aggregates module routes), `backend/src/routes/workspace.routes.js` (reload endpoint)
- **FSM engine**: `backend/src/core/engine/ReisTech.js` (orchestrator), `StateMachine.js` (state logic), `Router.js` (intent detection, response generation), `DossierBuilder.js` (data extraction, caching, Redis sync)
- **WebSocket**: `backend/src/websocket/WebSocketServer.js` (server), `frontend/src/contexts/hooks/useWebSocket.js` (React hook)
- **Packs**: `backend/src/workspaces/packs/iphone_store.json`, `law_firm.json`, `motorcycle_shop.json`
- **Auth client**: `frontend/src/services/api.js` (Axios instance with JWT interceptor), `frontend/src/store/authSlice.js` (Redux state + refresh logic)
