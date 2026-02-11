# Estrutura do Projeto

.
├── .env.prod.template
├── .github/
│   ├── copilot-instructions.md
│   └── workflows/
│       ├── backend.yml
│       └── frontend.yml
├── .vscode/
│   ├── launch.json
│   ├── settings.json
│   └── tasks.json
├── README.md
├── backend/
│   ├── .dockerignore
│   ├── .env.example
│   ├── .eslintrc.json
│   ├── .prettierrc
│   ├── Dockerfile
│   ├── Dockerfile.prod
│   ├── app.js
│   ├── bin/
│   │   └── www
│   ├── package-lock.json
│   ├── package.json
│   ├── scripts/
│   │   └── backup.sh
│   ├── server.js
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js
│   │   │   ├── env.js
│   │   │   ├── logger.js
│   │   │   └── theme.js
│   │   ├── contexts/
│   │   │   └── WebSocketContext.jsx
│   │   ├── core/
│   │   │   ├── engine/
│   │   │   │   ├── DossierBuilder.js
│   │   │   │   ├── ReisTech.js
│   │   │   │   ├── Router.js
│   │   │   │   └── StateMachine.js
│   │   │   ├── errors/
│   │   │   │   ├── AppError.js
│   │   │   │   └── errorHandler.js
│   │   │   ├── middleware/
│   │   │   │   ├── auth.js
│   │   │   │   └── validation.js
│   │   │   └── utils/
│   │   │       └── response.js
│   │   ├── db/
│   │   │   ├── migrations/
│   │   │   │   ├── 001_create_workspaces.js
│   │   │   │   ├── 002_create_users.js
│   │   │   │   ├── 003_create_refresh_tokens.js
│   │   │   │   ├── 004_create_clientes.js
│   │   │   │   ├── 005_create_conversas_interacoes.js
│   │   │   │   ├── 006_create_clientes_estado.js
│   │   │   │   ├── 007_create_fila_humana.js
│   │   │   │   ├── 008_create_textos_cms.js
│   │   │   │   ├── 009_create_catalogo_itens.js
│   │   │   │   ├── 010_create_audit_logs.js
│   │   │   │   └── 011_create_notifications.js
│   │   │   ├── models/
│   │   │   │   ├── AuditLog.js
│   │   │   │   ├── CatalogoItem.js
│   │   │   │   ├── Cliente.js
│   │   │   │   ├── ClienteEstado.js
│   │   │   │   ├── ConversaInteracao.js
│   │   │   │   ├── FilaHumana.js
│   │   │   │   ├── Notification.js
│   │   │   │   ├── RefreshToken.js
│   │   │   │   ├── TextoCms.js
│   │   │   │   ├── User.js
│   │   │   │   ├── Workspace.js
│   │   │   │   └── index.js
│   │   │   └── seeds/
│   │   │       ├── 001_initial_workspace.js
│   │   │       ├── 002_initial_users.js
│   │   │       ├── 003_initial_textos.js
│   │   │       └── 004_initial_catalogo.js
│   │   ├── hooks/
│   │   │   └── useWebSocket.js
│   │   ├── modules/
│   │   │   ├── admin/
│   │   │   │   ├── AdminController.js
│   │   │   │   ├── AdminService.js
│   │   │   │   └── routes.js
│   │   │   ├── auth/
│   │   │   │   ├── AuthController.js
│   │   │   │   └── routes.js
│   │   │   ├── catalogo/
│   │   │   │   ├── CatalogoController.js
│   │   │   │   ├── CatalogoService.js
│   │   │   │   └── routes.js
│   │   │   ├── cms/
│   │   │   │   ├── CmsController.js
│   │   │   │   ├── CmsService.js
│   │   │   │   └── routes.js
│   │   │   ├── fila/
│   │   │   │   ├── FilaController.js
│   │   │   │   ├── FilaService.js
│   │   │   │   └── routes.js
│   │   │   ├── notifications/
│   │   │   │   └── NotificationService.js
│   │   │   ├── reports/
│   │   │   │   └── ReportService.js
│   │   │   └── whatsapp/
│   │   │       ├── WhatsAppController.js
│   │   │       ├── WhatsAppService.js
│   │   │       └── routes.js
│   │   ├── routes/
│   │   │   └── index.js
│   │   ├── websocket/
│   │   │   ├── WebSocketServer.js
│   │   │   └── eventHandlers.js
│   │   └── workspaces/
│   │       ├── VerticalPackLoader.js
│   │       ├── WorkspaceService.js
│   │       └── packs/
│   │           ├── iphone_store.json
│   │           ├── law_firm.json
│   │           └── motorcycle_shop.json
│   └── tests/
│       ├── Login.test.jsx
│       ├── integration/
│       │   └── auth.test.js
│       └── unit/
│           └── ReisTechEngine.test.js
├── docs/
│   ├── ESTRUTURA.md
│   ├── MIGRATION_GUIDE.md
│   ├── OTIMIZACAO_PRODUCAO.md
│   ├── RESUMO_ORGANIZACAO.md
│   ├── api_endpoints_documentacao.yaml
│   ├── estrutura_banco_dados.sql
│   ├── fluxos_conversacionais_nichos.csv
│   ├── diagrama_arquitetura_sistema.png
│   └── reistech_especificacao_tecnica.md
├── scripts/
│   ├── PREPARE_FOR_WINDOWS.sh
│   ├── auditoria-macbook.sh
│   ├── backup-projeto.sh
│   ├── deploy-production.sh
│   ├── deploy-production.sh.bak
│   ├── instalar-otimizacoes.sh
│   ├── limpar-macbook.sh
│   ├── testar-conexao-windows.sh
│   ├── verificar-estrutura.sh
│   └── verificar-tudo.sh
├── docker-compose.prod.yml
├── docker-compose.yml
└── frontend/
    ├── .dockerignore
    ├── .env.production
    ├── .eslintignore
    ├── .eslintrc.cjs
    ├── Dockerfile
    ├── Dockerfile.prod
    ├── nginx.conf
    ├── package-lock.json
    ├── package.json
    ├── src/
    │   ├── App.jsx
    │   ├── components/
    │   │   ├── layout/
    │   │   │   ├── Layout.jsx
    │   │   │   └── PrivateRoute.jsx
    │   │   └── notifications/
    │   │       └── NotificationCenter.jsx
    │   ├── config/
    │   │   └── theme.js
    │   ├── contexts/
    │   │   └── NotificationContext.jsx
    │   ├── main.jsx
    │   ├── pages/
    │   │   ├── Catalogo.jsx
    │   │   ├── Configuracao.jsx
    │   │   ├── Conversas.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── FilaHumana.jsx
    │   │   ├── Login.jsx
    │   │   ├── Relatorios.jsx
    │   │   ├── TextosCms.jsx
    │   │   └── WhatsApp.jsx
    │   ├── services/
    │   │   └── api.js
    │   └── store/
    │       ├── authSlice.js
    │       ├── index.js
    │       └── uiSlice.js
    └── vite.config.js