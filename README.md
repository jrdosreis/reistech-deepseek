# Reistech DeepSeek

[![CI/CD Pipeline](https://github.com/jrdosreis/reistech-deepseek/actions/workflows/ci-cd.yml/badge.svg?branch=main)](https://github.com/jrdosreis/reistech-deepseek/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-61dafb.svg)](https://react.dev/)
[![Code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://prettier.io/)

Sistema completo de atendimento automatizado via WhatsApp com motor FSM determinístico, suporte multi-nicho e painel administrativo em React.

---

## 📋 Visão geral

O Reistech DeepSeek centraliza conversas, integrações e workflows de atendimento usando um motor FSM (finite state machine) determinístico, permitindo escalar atendimento automático e humano com rastreabilidade, auditoria e personalização por nicho.

---

## 📚 Documentação e utilitários

- **Documentação técnica**: [`docs/`](docs/) — guia de migração, resumo de organização, otimizações, especificação técnica, diagrama de arquitetura, endpoints, esquema SQL, fluxos de nichos.
- **Scripts utilitários**: [`scripts/`](scripts/) — limpeza, backup, testes, verificação, deploy, `PREPARE_FOR_WINDOWS`.

---

## 🆕 Atualizações e Melhorias Técnicas (v1.1)

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

---

## 💡 Principais recursos

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
- API REST sob `/api`.
- **Novo:** Endpoint para recarga de regras em tempo real (`/reload-rules`).

### Frontend
- Painel em pt-BR com Material UI.
- Fila humana em tempo real e console de conversas.
- Gestão de catálogo e textos do bot.
- Status e QR Code do WhatsApp.
- Gestão de workspace e packs.

### Multi-nicho
- Packs incluídos: `iphone_store`, `law_firm`, `motorcycle_shop`.
- Criação e customização de novos workspaces.

---

## 🏗️ Arquitetura

- **Backend**: Node.js + Express
- **Frontend**: React + Vite + Material UI
- **Banco**: PostgreSQL
- **WebSocket**: atualizações em tempo real
- **Redis**: opcional (sessão/rate limiting)

---

## ⚙️ Requisitos

- Node.js 18+
- PostgreSQL 15+
- Redis 7+ (opcional, recomendado)
- Docker e Docker Compose (opcional)

---

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

---

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

---

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

---

## 🚀 Quick Start

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

---

## 🌐 URLs e Credenciais

### Desenvolvimento Local
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000/api
- **WebSocket**: ws://localhost:3000/ws

### Desenvolvimento Docker (Remoto com Windows)
- **Frontend**: http://192.168.100.232 (porta 80)
- **Backend API**: http://192.168.100.232:3000/api
- **WebSocket**: ws://192.168.100.232:3000/ws

### Credenciais Padrão
- **Email**: `contato@reiscelulares.com.br`
- **Senha**: `admin@reiscelulares`

---

## 🩺 Health Check

O sistema expõe endpoints de health check para monitoramento de disponibilidade e diagnóstico.

| Endpoint | Descrição | Formato Resposta |
|----------|----------|------------------|
| `GET /health` | Status geral da aplicação | `{"status":"ok","timestamp":"..."}` |
| `GET /health/db` | Verifica conexão com PostgreSQL | `{"status":"ok","database":"connected"}` |
| `GET /health/redis` | Verifica conexão com Redis (se habilitado) | `{"status":"ok","redis":"connected"}` |
| `GET /health/whatsapp` | Status da sessão WhatsApp | `{"status":"ok","whatsapp":"connected","qr":null}` |

**Exemplo de uso:**
```bash
curl http://localhost:3000/health
```

**Integração com Docker:**  
Os containers já possuem `HEALTHCHECK` definido. Utilize `docker ps` para ver o estado de saúde.

---

## ⚠️ Troubleshooting Rápido

### 🔴 **Problema: Containers não sobem ou caem logo após iniciar**
```bash
# Verificar logs detalhados
docker-compose logs --tail=50

# Verificar conflito de portas
netstat -ano | findstr :3000   # Windows
lsof -i :3000                  # macOS/Linux

# Solução: Mude a porta no .env ou pare o processo conflitante
```

### 🔴 **Problema: Porta 5432 (PostgreSQL) já está em uso**
```bash
# Identificar processo
lsof -i :5432

# Parar PostgreSQL local (se não for mais necessário)
brew services stop postgresql@14
sudo systemctl stop postgresql  # Linux
```

### 🔴 **Problema: MacBook não consegue conectar ao Docker do Windows**
```bash
# 1. Verificar se o IP está correto
ping 192.168.100.232

# 2. Testar a porta 2375
telnet 192.168.100.232 2375

# 3. Verificar se o Docker Desktop no Windows:
#    - Está rodando
#    - Tem a opção "Expose daemon on tcp://localhost:2375" ativada
#    - O firewall permite a porta 2375
```

### 🔴 **Problema: Banco de dados não inicializa no primeiro `docker-compose up`**
```bash
# Remover volumes antigos e reconstruir
docker-compose down -v
docker-compose up -d --build
```

### 🔴 **Problema: Hot‑reload não funciona no backend**
- Verifique se o volume `./backend:/usr/src/app` está corretamente montado no `docker-compose.yml`.
- Confirme que o comando é `npm run dev` (com nodemon ou ts-node-dev).

---

## 🛡️ Nota de Segurança (Evite Erros Críticos)

1. **NUNCA commite arquivos `.env` no repositório.**  
   Eles contêm senhas, chaves JWT e credenciais SMTP.  
   ✅ Utilize `.env.example` para documentação.

2. **Em produção, SEMPRE gere novas chaves JWT e senhas de banco.**  
   ❌ Nunca reutilize as credenciais de desenvolvimento.

3. **A porta 2375 (Docker remoto) NÃO deve estar exposta na internet.**  
   Em rede doméstica, o risco é baixo, mas isole a máquina Windows com firewall.

4. **Execute containers com usuário não‑root sempre que possível.**  
   Os Dockerfiles de produção já implementam esta prática.

5. **Backup automático:**  
   Configure o script `scripts/backup-projeto.sh` em uma tarefa agendada (cron/Task Scheduler).

---

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

- [Manual Oficial](MANUAL-OFICIAL.html) – Setup Windows + MacBook
- [API Documentation](docs/api_endpoints_documentacao.yaml)
- [Database Schema](docs/estrutura_banco_dados.sql)
- [Architecture Diagram](docs/diagrama_arquitetura_sistema.txt)

---