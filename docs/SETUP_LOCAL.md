# 🚀 Setup Local - ReisTech DeepSeek

> **Última atualização**: 11 de fevereiro de 2026  
> Guia completo para configurar o ambiente de desenvolvimento localmente (macOS/Linux).

## 📋 Índice

- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Execução](#execução)
- [Testes](#testes)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Pré-requisitos

### Software Obrigatório

| Software | Versão Mínima | Instalação macOS |
|----------|---------------|------------------|
| **Node.js** | 18+ | `brew install node@18` |
| **PostgreSQL** | 15+ | `brew install postgresql@15` |
| **Git** | 2.0+ | Já incluso no macOS |

### Software Recomendado

| Software | Versão | Para quê? | Instalação |
|----------|--------|-----------|------------|
| **Redis** | 7+ | Cache e sessions | `brew install redis` |
| **Docker Desktop** | Latest | Alternativa ao setup local | [Download](https://www.docker.com/products/docker-desktop/) |

### Verificar Instalações

```bash
node --version  # v18+ ou superior
npm --version   # v9+ ou superior
psql --version  # PostgreSQL 15+ ou superior
redis-cli --version  # Redis 7+ (opcional)
```

---

## 💾 Instalação

### 1. Clonar Repositório

```bash
git clone https://github.com/jrdosreis/reistech-deepseek.git
cd reistech-deepseek
```

### 2. Configurar Banco de Dados

```bash
# Iniciar PostgreSQL
brew services start postgresql@15

# Criar usuário e banco
psql postgres << EOF
CREATE USER reistechuser WITH PASSWORD 'reistechpass';
CREATE DATABASE reistechdb OWNER reistechuser;
GRANT ALL PRIVILEGES ON DATABASE reistechdb TO reistechuser;
\q
EOF
```

### 3. Iniciar Redis (Opcional)

```bash
brew services start redis
```

---

## ⚙️ Configuração

### Estrutura de `.env` Files

O projeto usa **3 arquivos** `.env` separados:

1. **`.env`** (raiz) → Docker Compose
2. **`backend/.env`** → Execução local do backend
3. **`frontend/.env`** → Variáveis Vite

### 1. Criar `.env` Raiz (Docker Compose)

```bash
cp .env.example .env
```

**Edite `.env`** com:

```env
# Application
APP_NAME="ReisTech"
NODE_ENV=development
PORT=3000
API_PREFIX=/api

# Database (Docker usa 'postgres', local usa 'localhost')
DB_HOST=postgres
DB_PORT=5432
DB_NAME=reistechdb
DB_USER=reistechuser
DB_PASSWORD=reistechpass

# Redis (Docker usa 'redis', local usa 'localhost')
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Secrets (gerar com: openssl rand -base64 64)
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '\n')
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# Admin
ADMIN_EMAIL=contato@reiscelulares.com.br
ADMIN_PASSWORD=admin@reiscelulares

# SMTP (Hostinger)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=contato@reiscelulares.com.br
SMTP_PASSWORD=SuaSenhaAqui

# WhatsApp
WHATSAPP_SESSION_PATH=./whatsapp-sessions
WHATSAPP_PUPPETEER_ARGS=--no-sandbox,--disable-setuid-sandbox
```

### 2. Criar `backend/.env` (Local)

```bash
cd backend
cp .env.example .env
```

**Edite `backend/.env`** (mesmas variáveis, mas `DB_HOST=localhost` e `REDIS_HOST=localhost`):

```env
# Application
APP_NAME="ReisTech"
NODE_ENV=development
PORT=3000
API_PREFIX=/api

# Database (LOCALHOST para execução local)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=reistechdb
DB_USER=reistechuser
DB_PASSWORD=reistechpass

# Redis (LOCALHOST para execução local)
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Secrets (MESMOS da raiz)
JWT_SECRET=<copiar_da_raiz>
JWT_REFRESH_SECRET=<copiar_da_raiz>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# Admin
ADMIN_EMAIL=contato@reiscelulares.com.br
ADMIN_PASSWORD=admin@reiscelulares

# SMTP
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=contato@reiscelulares.com.br
SMTP_PASSWORD=SuaSenhaAqui

# WhatsApp
WHATSAPP_SESSION_PATH=./whatsapp-sessions
WHATSAPP_PUPPETEER_ARGS=--no-sandbox,--disable-setuid-sandbox
```

### 3. Criar `frontend/.env`

```bash
cd frontend
cp .env.example .env
```

**Edite `frontend/.env`**:

```env
# Local development
VITE_API_URL=http://localhost:3000/api
VITE_WS_URL=ws://localhost:3000/ws

# Remote development (Docker no Windows)
# VITE_API_URL=http://192.168.100.232:3000/api
# VITE_WS_URL=ws://192.168.100.232:3000/ws
```

### 4. Gerar JWT Secrets

```bash
# JWT_SECRET
openssl rand -base64 64 | tr -d '\n' | pbcopy
# Cole no .env como JWT_SECRET

# JWT_REFRESH_SECRET
openssl rand -base64 64 | tr -d '\n' | pbcopy
# Cole no .env como JWT_REFRESH_SECRET
```

---

## ▶️ Execução

### Opção 1: Execução Local (Sem Docker)

#### Backend

```bash
cd backend

# Instalar dependências
npm install

# Executar migrations
npm run migrate up

# Popular banco com seeds (idempotente)
npm run seed

# Iniciar servidor (dev mode)
npm run dev
```

✅ Backend rodando em **http://localhost:3000**

#### Frontend (novo terminal)

```bash
cd frontend

# Instalar dependências
npm install

# Iniciar dev server
npm run dev
```

✅ Frontend rodando em **http://localhost:5173**

---

### Opção 2: Execução com Docker Compose

```bash
# Subir containers
docker-compose up -d

# Executar migrations
docker-compose exec backend npm run migrate up

# Popular banco com seeds
docker-compose exec backend npm run seed

# Ver logs
docker-compose logs -f
```

✅ Acesse:
- **Frontend**: http://localhost (porta 80)
- **Backend API**: http://localhost:3000/api

---

## 🧪 Testes

### Backend

```bash
cd backend

# Todos os testes
npm test

# Com cobertura
npm run test:coverage

# Watch mode
npm run test:watch

# Linting
npm run lint

# Formatação
npm run format
```

### Frontend

```bash
cd frontend

# Testes Jest
npm test

# Testes E2E (Cypress)
npm run test:e2e

# Linting
npm run lint

# Formatação
npm run format
```

---

## 🔍 Verificação

### Health Check

```bash
# Backend
curl http://localhost:3000/health

# Resposta esperada:
# {"status":"ok","timestamp":"..."}
```

### Login Padrão

- **URL**: http://localhost:5173
- **Email**: contato@reiscelulares.com.br
- **Senha**: admin@reiscelulares

### Testar API

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"contato@reiscelulares.com.br","password":"admin@reiscelulares"}'

# Status WhatsApp
curl http://localhost:3000/api/whatsapp/status
```

---

## 🛠️ Troubleshooting

### Erro: "Database connection failed"

```bash
# Verificar se PostgreSQL está rodando
brew services list | grep postgresql

# Se não estiver, iniciar
brew services start postgresql@15

# Testar conexão
psql -U reistechuser -d reistechdb -h localhost
```

### Erro: "Redis connection failed"

```bash
# Iniciar Redis
brew services start redis

# Testar conexão
redis-cli ping
# Resposta esperada: PONG
```

### Erro: "WhatsApp não conecta"

1. Acesse http://localhost:5173 e vá para "WhatsApp"
2. Escaneie o QR Code com seu celular
3. Aguarde confirmação da conexão

### Porta em uso

```bash
# Ver o que está usando a porta 3000
lsof -i :3000

# Matar processo
kill -9 <PID>
```

### Limpar e reinstalar

```bash
# Backend
cd backend
rm -rf node_modules package-lock.json
npm install

# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Reset completo do banco

```bash
cd backend

# Desfazer todas as migrations
npm run migrate down

# Aplicar novamente
npm run migrate up

# Popular dados
npm run seed
```

---

## 📚 Próximos Passos

- ✅ Configurar WhatsApp (escanear QR Code)
- ✅ Importar catálogo CSV
- ✅ Personalizar textos do bot (CMS)
- ✅ Testar fila humana
- 📖 Ler [MANUAL-OFICIAL.html](../MANUAL-OFICIAL.html) para setup remoto

---

## 🔗 Links Úteis

- [README Principal](../README.md)
- [Estrutura do Projeto](ESTRUTURA.md)
- [Manual Oficial](../MANUAL-OFICIAL.html)
- [Guia de Migração](MIGRATION_GUIDE.md)
- [Otimização para Produção](OTIMIZACAO_PRODUCAO.md)

---

**Atualizado em**: 11 de fevereiro de 2026  
**Versão**: 1.1

