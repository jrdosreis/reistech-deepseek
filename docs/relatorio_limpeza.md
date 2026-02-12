# 🧹 Relatório de Limpeza – REISTECH-DeepSeek

**Data:** 12 de fevereiro de 2026  
**Gerado por:** Análise automatizada

---

## 1. Arquivos a Remover (Código Morto)

| Arquivo | Motivo |
|---|---|
| `backend/src/config/theme.js` | Arquivo MUI (frontend) colocado erroneamente no backend. Cópia idêntica de `frontend/src/config/theme.js`. Nenhum import no backend. |
| `backend/src/hooks/useWebSocket.js` | Hook React no backend. Versão antiga (pré-Redux) do `frontend/src/contexts/hooks/useWebSocket.js`. |
| `backend/src/contexts/WebSocketContext.jsx` | Componente React no backend. Não referenciado por nenhum módulo backend. |
| `backend/bin/www` | Boilerplate Express Generator. Não referenciado em package.json. Entry point real é `server.js`. Usa porta hardcoded 3001 e `debug` (não é dependência). |
| `backend/tests/Login.test.jsx` | Teste React (JSX) no backend. Cópia antiga/incompleta de `frontend/src/tests/Login.test.jsx`. |
| `backend/middleware/security.js` | 444 linhas não importadas por nenhum arquivo. O `app.js` configura segurança inline (helmet, cors, rateLimit). |
| `backend/middleware/rateLimiter.js` | Não importado por nenhum arquivo. Rate limiting configurado diretamente em `app.js`. |
| `backend/services/healthCheckService.js` | Não importado por nenhum arquivo. Health check definido inline em `app.js`. |
| `backend/services/loggerService.js` | Não importado por nenhum arquivo. Logger em `src/config/logger.js` é o utilizado. |
| `backend/ecosystem.config` (sem extensão) | Rascunho antigo com formatação Markdown inválida. `ecosystem.config.js` é o arquivo correto. |
| `backend/scripts/backup.sh` | Redundante com `scripts/backup-projeto.sh` na raiz. |
| `postgres/init.sql` | Placeholder vazio (`-- init script (empty)`). Não referenciado no docker-compose.yml. Banco inicializado via migrations. |

## 2. Pastas a Remover

| Pasta | Motivo |
|---|---|
| `backend/src/hooks/` | Contém apenas `useWebSocket.js` (React hook, não pertence ao backend). |
| `backend/src/contexts/` | Contém apenas `WebSocketContext.jsx` (React component, não pertence ao backend). |
| `backend/bin/` | Contém apenas `www` (boilerplate não utilizado). |
| `backend/middleware/` | Middleware legado nunca importado. Funcionalidade já coberta por `app.js` + `src/core/middleware/`. |
| `backend/scripts/` | Após mover `backup.sh`, fica vazia. |
| `postgres/` | Após remover `init.sql`, fica vazia. |
| `logs/` | Pasta vazia (logs são gerados em runtime). |

## 3. Dependências Backend Não Utilizadas

| Pacote | Motivo |
|---|---|
| `compression` | Não importado em nenhum arquivo |
| `cookie-parser` | Não importado em nenhum arquivo |
| `express-validator` | Projeto usa `joi` para validação |
| `luxon` | Não importado em nenhum arquivo |
| `node-cron` | Não importado em nenhum arquivo |
| `pg-hstore` | Projeto usa `pg` + `sequelize` (pg-hstore é para Sequelize com PostgreSQL mas não é importado diretamente) |

## 4. Reorganização

| De | Para | Motivo |
|---|---|---|
| `MANUAL-OFICIAL.html` (raiz) | `docs/manuals/MANUAL-OFICIAL.html` | Raiz deve conter apenas README, LICENSE, configs e docker-compose |

## 5. Pastas Vazias

- `logs/` – pode ser mantida com `.gitkeep` ou removida (criada em runtime)

## 6. Arquivos .env

- ✅ `.env` (raiz) – local, gitignored
- ✅ `.env.example` (raiz) – template
- ✅ `backend/.env.example` – template
- ✅ `frontend/.env.example` – template
- Nenhum `.env.bak`, `.env.backup` ou similar encontrado.

## 7. Documentação

- `docs/archive/` – contém `NEXTEPS_STATUS.md` e `STATUS_FINAL.md` (corretamente arquivados, sem duplicatas na raiz)
- Nenhum documento duplicado entre raiz e `docs/`
