# ReisTech DeepSeek

[![CI/CD Pipeline](https://github.com/jrdosreis/reistech-deepseek/actions/workflows/ci-cd.yml/badge.svg?branch=main)](https://github.com/jrdosreis/reistech-deepseek/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-61dafb.svg)](https://react.dev/)
[![Code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://prettier.io/)

Sistema completo de atendimento automatizado via WhatsApp com motor FSM determinístico, suporte multi-nicho e painel administrativo em React.

## Visão geral

O ReisTech DeepSeek centraliza conversas, integrações e workflows de atendimento usando um motor FSM (finite state machine) determinístico, permitindo escalar atendimento automático e humano com rastreabilidade, auditoria e personalização por nicho.

## Documentação e utilitários
- Documentação em [docs/](docs/) (guia de migração, resumo de organização, otimizações, especificação técnica, diagrama de arquitetura, endpoints, esquema SQL, fluxos de nichos).
- Scripts em [scripts/](scripts/) (limpeza, backup, testes, verificação, deploy, PREPARE_FOR_WINDOWS).

## Atualizações e Melhorias Técnicas (v1.1)

O projeto recebeu atualizações estruturais focadas em segurança, performance e manutenibilidade:

### 🛡️ Segurança e Infraestrutura
- **Execução Segura (Non-Root)**: O script de deploy configura usuários de sistema dedicados, evitando que a aplicação rode como root.
- **PM2 Cluster Mode**: Implementação do PM2 para gerenciamento de processos, permitindo reinício automático e balanceamento de carga.
- **Proteção de Segredos**: Permissões de arquivos sensíveis (`.env`) ajustadas para `600` em produção.

### ⚙️ Engenharia do Motor (Core Engine)
- **Regras Dinâmicas (Hot-Reload)**: A lógica de extração de dados (Regex) agora é carregada dinamicamente dos arquivos JSON dos Packs.
- **Sincronização via Redis Pub/Sub**: O reload de regras é sincronizado entre todas as instâncias do cluster via Redis.
- **Performance**: Substituição de operações de I/O síncronas por assíncronas para evitar bloqueio do Event Loop.
- **Cache Inteligente**: Implementação de cache estático para regras de regex, reduzindo leitura de disco.

### 🧪 Qualidade e Testes
- **Suíte de Testes**: Adição de testes unitários (Jest) para o `DossierBuilder` e testes de integração (Supertest) para a API.
- **Seeds Resilientes**: Scripts de população de banco ajustados para funcionar corretamente em qualquer ambiente ou workspace.

## Principais recursos

### Backend
- Motor FSM determinístico com fluxos previsíveis.
- Integração com WhatsApp via whatsapp-web.js.
- Multi-nicho com packs de workspace.
- Fila humana com lock e handoff controlado.
- Dossiê do cliente para contexto do operador.
- Catálogo com importação CSV.
- CMS de textos (no-code) para mensagens do bot.
- Autenticação JWT + Refresh Token e RBAC.
- Logs e auditoria estruturados.
- API REST sob /api.
- **Novo:** Endpoint para recarga de regras em tempo real (`/reload-rules`).

### Frontend
- Painel em pt-BR com Material UI.
- Fila humana em tempo real e console de conversas.
- Gestão de catálogo e textos do bot.
- Status e QR Code do WhatsApp.
- Gestão de workspace e packs.

### Multi-nicho
- Packs incluídos: iphone_store, law_firm, motorcycle_shop.
- Criação e customização de novos workspaces.

## Arquitetura

- Backend: Node.js + Express
- Frontend: React + Vite + Material UI
- Banco: PostgreSQL
- WebSocket: atualizações em tempo real
- Redis: opcional (sessão/rate limiting)

## Requisitos

- Node.js 18+
- PostgreSQL 15+
- Redis (opcional)
- Docker e Docker Compose (opcional)

## 🧪 Testes Automatizados

```bash
# Backend
cd backend

# Rodar todos os testes
npm test

# Testes com cobertura
npm run test:coverage

# Testes em watch mode
npm run test:watch

# Frontend
cd frontend

# Testes Jest
npm test

# Testes E2E (Cypress)
npm run test:e2e
```

## 📊 Banco de Dados

### Migrations

```bash
cd backend

# Executar migrations
npm run migrate up

# Reverter última migration
npm run migrate down

# Criar nova migration
npm run migrate:create nome_da_migration
```

### Seeds

```bash
cd backend

# Popular banco com dados iniciais (idempotente)
npm run seed

# Reset completo (down → up → seed)
npm run db:reset
```

## 🛠️ Scripts Úteis

```bash
# Deploy para produção
./scripts/deploy-production.sh

# Backup completo do projeto
./scripts/backup-projeto.sh

# Verificar estrutura e configurações
./scripts/verificar-tudo.sh

# Limpeza de arquivos temporários
./scripts/limpar-macbook.sh

# Auditoria de segurança
./scripts/auditoria-macbook.sh
```

## 📋 Documentação Completa

- **[Setup Local](docs/SETUP_LOCAL.md)** - Guia detalhado para ambiente de desenvolvimento
- **[Manual Oficial](MANUAL-OFICIAL.html)** - Setup completo Windows + MacBook (desenvolvimento remoto)
- **[Estrutura do Projeto](docs/ESTRUTURA.md)** - Organização de pastas e arquivos
- **[Guia de Migração](docs/MIGRATION_GUIDE.md)** - Atualizações e migrações de versão
- **[Otimização para Produção](docs/OTIMIZACAO_PRODUCAO.md)** - Deploy e configurações de produção
- **[Especificação Técnica](docs/reistech_especificacao_tecnica.md)** - Detalhes técnicos completos

## 🚀 Quick Start

### Requisitos

- Node.js 18+
- PostgreSQL 15+
- Redis 7+ (opcional, mas recomendado)
- Docker e Docker Compose (opcional)

### Setup Local (macOS)

```bash
# 1. Clonar repositório
git clone https://github.com/jrdosreis/reistech-deepseek.git
cd reistech-deepseek

# 2. Dependências do sistema
brew install postgresql@15 redis
brew services start postgresql@15
brew services start redis

# 3. Criar banco de dados
psql postgres -c "CREATE USER reistechuser WITH PASSWORD 'reistechpass';"
psql postgres -c "CREATE DATABASE reistechdb OWNER reistechuser;"

# 4. Configurar variáveis de ambiente
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edite os arquivos .env com suas credenciais

# 5. Backend
cd backend
npm install
npm run migrate up
npm run seed
npm run dev  # Roda na porta 3000

# 6. Frontend (novo terminal)
cd frontend
npm install
npm run dev  # Roda na porta 5173
```

### Setup com Docker (Desenvolvimento)

```bash
# Subir containers
docker-compose up -d

# Executar migrations e seeds
docker-compose exec backend npm run migrate up
docker-compose exec backend npm run seed

# Ver logs
docker-compose logs -f
```

### Setup com Docker (Produção)

```bash
# Usar configuração de produção
docker-compose -f docker-compose.prod.yml up -d

# Executar migrations
docker-compose -f docker-compose.prod.yml exec backend npm run migrate up
```

## 🌐 URLs e Credenciais

### Desenvolvimento Local
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000/api
- **WebSocket**: ws://localhost:3000/ws

### Desenvolvimento Docker (Remoto)
- **Frontend**: http://192.168.100.232 (porta 80)
- **Backend API**: http://192.168.100.232:3000/api
- **WebSocket**: ws://192.168.100.232:3000/ws

### Credenciais Padrão
- **Email**: contato@reiscelulares.com.br
- **Senha**: admin@reiscelulares

## Principais endpoints

### Autenticação
- POST /api/auth/login - Login de usuário
- POST /api/auth/logout - Logout
- POST /api/auth/refresh - Refresh token

### WhatsApp
- GET /api/whatsapp/status - Status da conexão
- GET /api/whatsapp/qr - QR Code para conectar
- POST /api/whatsapp/disconnect - Desconectar sessão

### Fila Humana
- GET /api/fila - Listar clientes na fila
- POST /api/fila/:telefone/assumir - Assumir atendimento
- POST /api/fila/:telefone/finalizar - Finalizar atendimento

### Catálogo
- GET /api/catalogo - Listar produtos
- POST /api/catalogo/import - Importar CSV
- PUT /api/catalogo/:id - Atualizar produto
- DELETE /api/catalogo/:id - Deletar produto

### CMS Textos
- GET /api/cms/textos - Listar textos configuráveis
- PUT /api/cms/textos/:chave - Atualizar texto

### Workspaces
- GET /api/workspaces - Listar workspaces
- GET /api/workspaces/packs - Listar packs disponíveis
- POST /api/workspaces - Criar workspace
- PUT /api/workspaces/:id - Atualizar workspace
- DELETE /api/workspaces/:id - Deletar workspace
- POST /api/workspaces/:workspaceId/reload-rules - Recarregar regras FSM

## 📁 Estrutura do Projeto

```
.
├── .env                        # Variáveis de ambiente (Docker Compose)
├── MANUAL-OFICIAL.html         # Manual completo de setup
├── README.md                   # Este arquivo
├── docker-compose.yml          # Desenvolvimento
├── docker-compose.prod.yml     # Produção
│
├── .github/                    # GitHub Actions e templates
│   ├── copilot-instructions.md # Instruções para AI agents
│   ├── workflows/              # CI/CD pipelines
│   ├── ISSUE_TEMPLATE/         # Templates de issues
│   └── PULL_REQUEST_TEMPLATE.md
│
├── backend/
│   ├── .env                    # Variáveis backend (local)
│   ├── app.js                  # Express app
│   ├── server.js               # HTTP + WebSocket server
│   ├── Dockerfile.prod         # Container produção
│   ├── ecosystem.config.js     # PM2 cluster config
│   │
│   ├── src/
│   │   ├── config/            # Database, env, logger, theme
│   │   ├── core/
│   │   │   ├── engine/        # FSM (ReisTech, StateMachine, Router, DossierBuilder)
│   │   │   ├── errors/        # AppError, errorHandler
│   │   │   ├── middleware/    # Auth, validation
│   │   │   └── utils/         # Helpers
│   │   ├── db/
│   │   │   ├── migrations/    # 11 migrations
│   │   │   ├── models/        # Sequelize models
│   │   │   └── seeds/         # Dados iniciais
│   │   ├── modules/
│   │   │   ├── admin/         # Gestão administrativa
│   │   │   ├── auth/          # JWT authentication
│   │   │   ├── catalogo/      # Produtos e importação CSV
│   │   │   ├── cms/           # Textos configuráveis
│   │   │   ├── conversas/     # Histórico de conversas
│   │   │   ├── fila/          # Fila humana
│   │   │   ├── notifications/ # Notificações
│   │   │   ├── reports/       # Relatórios
│   │   │   ├── whatsapp/      # Integração WhatsApp
│   │   │   └── workspaces/    # Gestão de workspaces
│   │   ├── routes/            # Agregador de rotas
│   │   ├── websocket/         # WebSocket server
│   │   └── workspaces/
│   │       └── packs/         # JSON files (iphone_store, law_firm, motorcycle_shop)
│   │
│   ├── services/              # Cache, logger, health check
│   ├── middleware/            # Security, rate limiter
│   ├── scripts/               # Backup scripts
│   ├── tests/
│   │   ├── unit/              # Testes unitários (Jest)
│   │   └── integration/       # Testes de integração
│   ├── logs/                  # Application logs
│   ├── uploads/               # Arquivos enviados
│   └── whatsapp-sessions/     # Sessões WhatsApp
│
├── frontend/
│   ├── .env                   # Variáveis frontend
│   ├── Dockerfile.prod        # Container produção (nginx)
│   ├── vite.config.js         # Vite configuration
│   │
│   ├── src/
│   │   ├── components/        # Layout, notificações
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Conversas.jsx
│   │   │   ├── FilaHumana.jsx
│   │   │   ├── Catalogo.jsx
│   │   │   ├── TextosCms.jsx
│   │   │   ├── WhatsApp.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Configuracao.jsx
│   │   │   └── Relatorios.jsx
│   │   ├── services/          # API client (Axios)
│   │   ├── store/             # Redux (auth, ui)
│   │   ├── contexts/          # React contexts
│   │   └── config/            # Configurações
│   │
│   ├── cypress/               # Testes E2E
│   └── tests/                 # Testes Jest
│
├── docs/
│   ├── ESTRUTURA.md           # Estrutura detalhada
│   ├── SETUP_LOCAL.md         # Setup desenvolvimento
│   ├── MIGRATION_GUIDE.md     # Guia de migração
│   ├── OTIMIZACAO_PRODUCAO.md # Deploy produção
│   ├── ORGANIZACAO.md         # Organização do projeto
│   ├── reistech_especificacao_tecnica.md
│   ├── api_endpoints_documentacao.yaml
│   ├── estrutura_banco_dados.sql
│   ├── diagrama_arquitetura_sistema.txt
│   ├── fluxos_conversacionais_nichos.csv
│   │
│   ├── github/                # Docs do GitHub
│   │   ├── CODE_OF_CONDUCT.md
│   │   ├── CONTRIBUTING.md
│   │   ├── GITHUB_SETUP.md
│   │   └── GITHUB_CHECKLIST.md
│   │
│   ├── archive/               # Docs arquivados
│   │   ├── STATUS_FINAL.md
│   │   └── NEXTEPS_STATUS.md
│   │
│   └── manuals/               # Manuais arquivados
│       └── manual-reistech-legacy.html
│
├── scripts/
│   ├── deploy-production.sh   # Deploy para produção
│   ├── backup-projeto.sh      # Backup completo
│   ├── limpar-macbook.sh      # Limpeza de arquivos
│   ├── auditoria-macbook.sh   # Auditoria de segurança
│   ├── verificar-tudo.sh      # Verificação completa
│   └── PREPARE_FOR_WINDOWS.sh # Preparação para Windows
│
├── postgres/
│   └── init.sql               # Inicialização PostgreSQL
│
└── .vscode/                   # Configurações VS Code
    ├── launch.json
    ├── settings.json
    └── tasks.json
```


## 🤝 Contribuindo

Consulte [CONTRIBUTING.md](docs/github/CONTRIBUTING.md) para diretrizes de contribuição.

## 📄 Licença

Este projeto é proprietário. Copyright © 2024-2026 ReisTech. Todos os direitos reservados.

## 📞 Suporte

- Consulte os logs em `backend/logs/`
- Verifique a [documentação completa](docs/) para troubleshooting
- Abra uma issue no GitHub com detalhes para reprodução

## 🔗 Links Úteis

- [Manual Oficial](MANUAL-OFICIAL.html) - Setup Windows + MacBook
- [API Documentation](docs/api_endpoints_documentacao.yaml)
- [Database Schema](docs/estrutura_banco_dados.sql)
- [Architecture Diagram](docs/diagrama_arquitetura_sistema.txt)