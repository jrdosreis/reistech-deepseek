# 📁 Estrutura do Projeto ReisTech DeepSeek

> **Última atualização**: 11 de fevereiro de 2026  
> **Versão**: 1.1  
> **Status**: Produção

## 📋 Visão Geral

Este documento descreve a organização completa de pastas e arquivos do projeto ReisTech DeepSeek, incluindo a estrutura do backend (Node.js/Express), frontend (React/Vite), documentações, scripts e configurações.

## 🏗️ Estrutura Raiz

```
reistech-deepseek/
├── .env                        # Variáveis de ambiente (Docker Compose)
├── .gitignore                  # Arquivos ignorados pelo Git
├── README.md                   # Documentação principal do projeto
├── docker-compose.yml          # Orquestração de containers (desenvolvimento)
├── docker-compose.prod.yml     # Orquestração de containers (produção)
├── LICENSE                     # Licença do projeto
│
├── .github/                    # GitHub Actions e templates
├── .vscode/                    # Configurações do VS Code
├── backend/                    # Servidor Node.js/Express
├── frontend/                   # Aplicação React/Vite
├── docs/                       # Documentações técnicas
├── scripts/                    # Scripts de automação
└── postgres/                   # Configurações PostgreSQL
```

## 🔧 .github/

Configurações do GitHub, workflows de CI/CD e templates para colaboração.

```
.github/
├── copilot-instructions.md     # Instruções para AI coding agents
├── PULL_REQUEST_TEMPLATE.md    # Template para PRs
│
├── ISSUE_TEMPLATE/             # Templates de issues
│   ├── bug_report.md
│   └── feature_request.md
│
└── workflows/                  # GitHub Actions CI/CD
    ├── backend.yml             # Pipeline backend (testes, lint, build)
    └── frontend.yml            # Pipeline frontend (testes, lint, build)
```

## 🎯 Backend/

Servidor Node.js com Express, motor FSM e integração WhatsApp.

### Estrutura Geral

```
backend/
├── .env                        # Variáveis de ambiente (local)
├── .env.example                # Template de variáveis
├── .eslintrc.json              # ESLint configuration
├── .prettierrc                 # Prettier configuration
├── Dockerfile.prod             # Dockerfile para produção
├── app.js                      # Aplicação Express (middlewares, rotas)
├── server.js                   # Servidor HTTP + WebSocket
├── package.json                # Dependências e scripts npm
├── ecosystem.config.js         # Configuração PM2 (cluster mode)
├── jest.config.js              # Configuração Jest (testes)
│
├── bin/
│   └── www                     # Script de inicialização (legado)
│
├── coverage/                   # Relatórios de cobertura de testes
├── logs/                       # Logs da aplicação (Winston)
├── uploads/                    # Arquivos enviados (CSV, imagens)
├── whatsapp-sessions/          # Sessões WhatsApp (Puppeteer)
│
├── middleware/                 # Middlewares globais
│   ├── rateLimiter.js          # Rate limiting
│   └── security.js             # Helmet, CORS, etc.
│
├── services/                   # Serviços compartilhados
│   ├── cacheService.js         # Cache Redis
│   ├── loggerService.js        # Logger Winston
│   └── healthCheckService.js   # Health checks
│
├── scripts/
│   └── backup.sh               # Script de backup do banco
│
├── src/                        # Código-fonte principal
└── tests/                      # Testes automatizados
```

### src/

Código-fonte organizado por domínios e responsabilidades.

```
src/
├── config/                     # Configurações centralizadas
│   ├── database.js             # Sequelize setup
│   ├── env.js                  # Validação de variáveis de ambiente
│   ├── logger.js               # Configuração Winston
│   └── theme.js                # Tema da aplicação
│
├── core/                       # Núcleo da aplicação (FSM, erros, utils)
│   ├── engine/                 # Motor FSM determinístico
│   │   ├── ReisTech.js         # Orquestrador principal (processMessage)
│   │   ├── StateMachine.js     # Máquina de estados (transition)
│   │   ├── Router.js           # Detecção de intenções e geração de respostas
│   │   └── DossierBuilder.js   # Extração de dados (regex hot-reload)
│   │
│   ├── errors/                 # Sistema de erros personalizado
│   │   ├── AppError.js         # Classe base de erro
│   │   └── errorHandler.js     # Middleware global de tratamento de erros
│   │
│   ├── middleware/             # Middlewares compartilhados
│   │   ├── auth.js             # Autenticação JWT
│   │   └── validation.js       # Validação de requests
│   │
│   └── utils/                  # Utilitários gerais
│       └── response.js         # Helpers para respostas HTTP
│
├── db/                         # Camada de dados (Sequelize)
│   ├── migrations/             # Migrations do banco (11 arquivos)
│   │   ├── 001_create_workspaces.js
│   │   ├── 002_create_users.js
│   │   ├── 003_create_refresh_tokens.js
│   │   ├── 004_create_clientes.js
│   │   ├── 005_create_conversas_interacoes.js
│   │   ├── 006_create_clientes_estado.js
│   │   ├── 007_create_fila_humana.js
│   │   ├── 008_create_textos_cms.js
│   │   ├── 009_create_catalogo_itens.js
│   │   ├── 010_create_audit_logs.js
│   │   └── 011_create_notifications.js
│   │
│   ├── models/                 # Modelos Sequelize
│   │   ├── index.js            # Agregador de modelos
│   │   ├── Workspace.js
│   │   ├── User.js
│   │   ├── RefreshToken.js
│   │   ├── Cliente.js
│   │   ├── ClienteEstado.js
│   │   ├── ConversaInteracao.js
│   │   ├── FilaHumana.js
│   │   ├── TextoCms.js
│   │   ├── CatalogoItem.js
│   │   ├── AuditLog.js
│   │   └── Notification.js
│   │
│   └── seeds/                  # Seeds (dados iniciais, idempotentes)
│       ├── 001_initial_workspace.js
│       ├── 002_initial_users.js
│       ├── 003_initial_textos.js
│       └── 004_initial_catalogo.js
│
├── modules/                    # Módulos de domínio (feature-based)
│   ├── admin/                  # Gestão administrativa
│   │   ├── AdminController.js
│   │   ├── AdminService.js
│   │   └── routes.js
│   │
│   ├── auth/                   # Autenticação JWT
│   │   ├── AuthController.js
│   │   └── routes.js
│   │
│   ├── catalogo/               # Catálogo de produtos
│   │   ├── CatalogoController.js
│   │   ├── CatalogoService.js
│   │   └── routes.js
│   │
│   ├── cms/                    # CMS de textos configuráveis
│   │   ├── CmsController.js
│   │   ├── CmsService.js
│   │   └── routes.js
│   │
│   ├── conversas/              # Histórico de conversas
│   │   ├── ConversasController.js
│   │   ├── ConversasService.js
│   │   └── routes.js
│   │
│   ├── fila/                   # Fila humana (handoff)
│   │   ├── FilaController.js
│   │   ├── FilaService.js
│   │   └── routes.js
│   │
│   ├── notifications/          # Notificações em tempo real
│   │   └── NotificationService.js
│   │
│   ├── reports/                # Relatórios e analytics
│   │   └── ReportService.js
│   │
│   ├── whatsapp/               # Integração WhatsApp
│   │   ├── WhatsAppController.js
│   │   ├── WhatsAppService.js
│   │   └── routes.js
│   │
│   └── workspaces/             # Gestão de workspaces
│       ├── WorkspaceController.js
│       ├── WorkspaceService.js
│       ├── README.md
│       └── routes.js
│
├── routes/                     # Agregador de rotas
│   ├── index.js                # Registra todos os módulos
│   └── workspace.routes.js     # Rotas específicas (reload-rules)
│
├── websocket/                  # WebSocket server
│   ├── WebSocketServer.js      # Servidor WebSocket (subscriptions, broadcast)
│   └── eventHandlers.js        # Handlers de eventos
│
└── workspaces/                 # Workspace packs (verticais)
    ├── VerticalPackLoader.js   # Carregador de packs
    ├── WorkspaceService.js     # Lógica de workspace
    └── packs/                  # Definições JSON dos packs
        ├── iphone_store.json   # Vertical: loja de iPhones
        ├── law_firm.json       # Vertical: escritório de advocacia
        └── motorcycle_shop.json # Vertical: loja de motos
```

### tests/

Testes automatizados (Jest + Supertest).

```
tests/
├── unit/                       # Testes unitários
│   └── ReisTechEngine.test.js  # Testes do motor FSM
│
└── integration/                # Testes de integração
    ├── auth.test.js            # API de autenticação
    └── whatsapp.test.js        # API WhatsApp
```

## ⚛️ Frontend/

Aplicação React com Vite, Material-UI e Redux.

```
frontend/
├── .env                        # Variáveis de ambiente (VITE_*)
├── .env.example                # Template de variáveis
├── .eslintrc.cjs               # ESLint configuration
├── .prettierrc                 # Prettier configuration
├── Dockerfile.prod             # Dockerfile multi-stage (build + nginx)
├── nginx.conf                  # Configuração nginx (produção)
├── vite.config.js              # Configuração Vite
├── package.json                # Dependências e scripts npm
├── index.html                  # HTML root
│
├── babel.config.cjs            # Babel configuration
├── jest.config.cjs             # Jest configuration
├── jest.setup.js               # Jest setup
├── cypress.config.cjs          # Cypress E2E configuration
│
├── cypress/                    # Testes E2E
│   ├── e2e/
│   └── screenshots/
│
├── src/                        # Código-fonte React
│   ├── main.jsx                # Entry point (React + Redux)
│   ├── App.jsx                 # Componente raiz (rotas)
│   ├── index.css               # Estilos globais
│   │
│   ├── components/             # Componentes reutilizáveis
│   │   ├── layout/
│   │   │   ├── Layout.jsx      # Layout principal (sidebar, header)
│   │   │   └── PrivateRoute.jsx # Route guard (autenticação)
│   │   └── notifications/
│   │       └── NotificationCenter.jsx # Centro de notificações
│   │
│   ├── pages/                  # Páginas da aplicação
│   │   ├── Dashboard.jsx       # Dashboard principal
│   │   ├── Login.jsx           # Página de login
│   │   ├── Conversas.jsx       # Histórico de conversas
│   │   ├── FilaHumana.jsx      # Fila de atendimento humano
│   │   ├── Catalogo.jsx        # Gestão de catálogo
│   │   ├── TextosCms.jsx       # Editor de textos do bot
│   │   ├── WhatsApp.jsx        # Status e QR code WhatsApp
│   │   ├── Configuracao.jsx    # Configurações de workspace
│   │   └── Relatorios.jsx      # Relatórios e analytics
│   │
│   ├── services/               # Serviços e API clients
│   │   └── api.js              # Axios client (JWT interceptor)
│   │
│   ├── store/                  # Redux store
│   │   ├── index.js            # Store configuration
│   │   ├── authSlice.js        # State de autenticação
│   │   └── uiSlice.js          # State de UI (loading, notifications)
│   │
│   ├── contexts/               # React Contexts
│   │   └── NotificationContext.jsx # Context de notificações
│   │
│   └── config/                 # Configurações
│       └── theme.js            # Tema Material-UI
│
└── tests/                      # Testes Jest
```

## 📚 docs/

Documentações técnicas completas.

```
docs/
├── ESTRUTURA.md                    # Este arquivo
├── SETUP_LOCAL.md                  # Guia de setup local
├── MIGRATION_GUIDE.md              # Guia de migração entre versões
├── OTIMIZACAO_PRODUCAO.md          # Deploy e otimizações
├── ORGANIZACAO.md                  # Organização do projeto
├── RESUMO_ORGANIZACAO.md           # Resumo da organização
├── reistech_especificacao_tecnica.md # Especificação técnica completa
├── api_endpoints_documentacao.yaml # Documentação OpenAPI
├── estrutura_banco_dados.sql       # Schema SQL completo
├── diagrama_arquitetura_sistema.txt # Diagrama de arquitetura
├── fluxos_conversacionais_nichos.csv # Fluxos FSM por nicho
│
├── github/                         # Docs do GitHub
│   ├── CODE_OF_CONDUCT.md          # Código de conduta
│   ├── CONTRIBUTING.md             # Guia de contribuição
│   ├── GITHUB_SETUP.md             # Setup do GitHub
│   └── GITHUB_CHECKLIST.md         # Checklist de tarefas
│
├── archive/                        # Documentos arquivados
│   ├── STATUS_FINAL.md             # Status final (histórico)
│   └── NEXTEPS_STATUS.md           # Próximos passos (histórico)
│
└── manuals/                        # Manuais arquivados
    └── manual-reistech-legacy.html # Manual antigo (v1.0)
```

## 🔧 scripts/

Scripts de automação para deploy, backup e manutenção.

```
scripts/
├── deploy-production.sh        # Deploy completo para produção
├── backup-projeto.sh           # Backup completo do projeto
├── limpar-macbook.sh           # Limpeza de arquivos temporários
├── auditoria-macbook.sh        # Auditoria de segurança
├── verificar-tudo.sh           # Verificação completa do projeto
├── verificar-estrutura.sh      # Verificação de estrutura de pastas
├── testar-conexao-windows.sh   # Testa conexão com Docker host
├── PREPARE_FOR_WINDOWS.sh      # Prepara projeto para Windows
├── aliases-reistech.sh         # Aliases úteis (bash/zsh)
└── instalar-otimizacoes.sh     # Instala otimizações de produção
```

## 🐘 postgres/

Configurações PostgreSQL para Docker.

```
postgres/
└── init.sql                    # Script de inicialização do banco
```

## 🎨 .vscode/

Configurações do Visual Studio Code.

```
.vscode/
├── launch.json                 # Configurações de debug
├── settings.json               # Settings do workspace
└── tasks.json                  # Tasks automatizadas
```

## 🗂️ Arquivos de Configuração Raiz

### Variáveis de Ambiente

- **`.env`**: Variáveis para Docker Compose (desenvolvimento)
- **`backend/.env`**: Variáveis para execução local do backend
- **`frontend/.env`**: Variáveis Vite (`VITE_API_URL`, `VITE_WS_URL`)

### Docker

- **`docker-compose.yml`**: Desenvolvimento (node:18-alpine + volumes)
- **`docker-compose.prod.yml`**: Produção (build de Dockerfile.prod + health checks)
- **`backend/Dockerfile.prod`**: Backend com Chromium para WhatsApp
- **`frontend/Dockerfile.prod`**: Multi-stage build (Vite build + nginx)

### Outros

- **`.gitignore`**: Arquivos ignorados pelo Git
- **`docs/manuals/MANUAL-OFICIAL.html`**: Manual completo de setup Windows + MacBook
- **`LICENSE`**: Licença do projeto (proprietário)

## 📊 Estatísticas do Projeto

| Categoria | Quantidade |
|-----------|------------|
| **Migrations** | 11 arquivos |
| **Models (Sequelize)** | 11 modelos |
| **Seeds** | 4 scripts |
| **Módulos Backend** | 9 domínios |
| **Páginas Frontend** | 9 páginas |
| **Workspace Packs** | 3 verticais (iphone_store, law_firm, motorcycle_shop) |
| **Scripts** | 10+ scripts de automação |
| **Documentações** | 15+ arquivos .md |
| **Testes** | Unit + Integration (Jest) + E2E (Cypress) |

## 🔗 Relacionamentos Entre Componentes

### Motor FSM (core/engine/)

```
ReisTech.js (orquestrador)
    ├── StateMachine.js (transições de estado)
    ├── Router.js (intenções e respostas)
    └── DossierBuilder.js (extração de dados)
        └── packs/*.json (regras de regex)
```

### API Backend (módulos)

```
routes/index.js (agregador)
    ├── /api/auth (AuthController)
    ├── /api/whatsapp (WhatsAppController)
    ├── /api/fila (FilaController)
    ├── /api/catalogo (CatalogoController)
    ├── /api/cms (CmsController)
    ├── /api/conversas (ConversasController)
    ├── /api/workspaces (WorkspaceController)
    ├── /api/admin (AdminController)
    └── /api/reports (ReportService)
```

### Frontend (páginas → serviços)

```
App.jsx (rotas)
    ├── Dashboard.jsx
    ├── FilaHumana.jsx → api.js → /api/fila
    ├── Conversas.jsx → api.js → /api/conversas
    ├── Catalogo.jsx → api.js → /api/catalogo
    ├── TextosCms.jsx → api.js → /api/cms
    ├── WhatsApp.jsx → api.js → /api/whatsapp
    ├── Configuracao.jsx → api.js → /api/workspaces
    └── Relatorios.jsx → api.js → /api/reports
```

## 🔄 Fluxo de Dados Principal

1. **Cliente** envia mensagem via WhatsApp
2. **WhatsAppService** recebe e encaminha para `ReisTech.processMessage()`
3. **ReisTech** consulta estado atual do cliente (`ClienteEstado`)
4. **StateMachine** executa transição de estado
5. **Router** determina intenção e gera resposta
6. **DossierBuilder** extrai dados da mensagem (regex)
7. **ReisTech** atualiza estado, salva interação e retorna resposta
8. **WhatsAppService** envia resposta ao cliente
9. **WebSocketServer** notifica frontend em tempo real
10. **Frontend** atualiza UI (Fila, Conversas, Dashboard)

## 🚀 Próximos Passos

- Adicionar testes E2E completos (Cypress)
- Implementar cache Redis para dossiês
- Adicionar mais workspace packs (e-commerce, médico, etc.)
- Melhorar relatórios com gráficos (Chart.js)
- Implementar notificações push (Service Workers)

---

**Última atualização**: 11 de fevereiro de 2026  
**Autor**: ReisTech Development Team  
**Versão**: 1.1.0
