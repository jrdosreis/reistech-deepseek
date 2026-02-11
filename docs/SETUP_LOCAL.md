# 🚀 Setup Local - Reistech DeepSeek

Guia completo para configurar o ambiente de desenvolvimento localmente.

## Tabela de Conteúdos

1. [Pré-requisitos](#pré-requisitos)
2. [Configuração de Ambiente](#configuração-de-ambiente)
3. [Instalação](#instalação)
4. [Execução](#execução)
5. [Verificação](#verificação)
6. [Troubleshooting](#troubleshooting)

---

## Pré-requisitos

### Software Obrigatório

- **Node.js 18+**: [Download](https://nodejs.org/)
  ```bash
  node --version  # Verificar versão
  npm --version   # npm 9+
  ```

- **PostgreSQL 15+**: [Download](https://www.postgresql.org/)
  ```bash
  # macOS
  brew install postgresql@15
  brew services start postgresql@15
  
  # Ubuntu/Debian
  sudo apt-get install postgresql postgresql-contrib
  sudo systemctl start postgresql
  
  # Windows
  # Baixar instalador do site oficial
  ```

### Software Opcional (Recomendado)

- **Redis 7+** (para cache e sessões)
  ```bash
  # macOS
  brew install redis
  brew services start redis
  
  # Ubuntu/Debian
  sudo apt-get install redis-server
  sudo systemctl start redis-server
  
  # Windows - WSL2 recomendado
  ```

- **Docker Desktop** (alternativa ao setup local)
  - [Download](https://www.docker.com/products/docker-desktop/)

---

## Configuração de Ambiente

### 1. Arquivo `.env` Raiz

Na raiz do projeto:

```bash
cp .env.template.md .env
```

Edite `.env` com suas configurações:

```env
APP_NAME="Reistech"
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=reistechdb
DB_USER=reistechuser
DB_PASSWORD=sua_senha_segura

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=sua_chave_secreta_aqui
JWT_REFRESH_SECRET=sua_chave_refresh_aqui

# Admin
ADMIN_EMAIL="admin@reiscelulares.com.br"
ADMIN_PASSWORD="Admin123!"

# SMTP
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=seu_email@dominio.com
SMTP_PASSWORD=sua_senha_smtp

# Domínios
API_DOMAIN="http://localhost:3001"
WEB_DOMAIN="http://localhost:5173"
CORS_WHITELIST="http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173"
```

### 2. Backend `.env`

```bash
cd backend
cp ../.env.template.md .env
```

Configurações específicas do backend (banco, redis, whatsapp, etc.)

### 3. Frontend `.env`

```bash
cd frontend
cp .env.example .env
```

Edite com suas URLs:

```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
VITE_APP_NAME="Reistech"
VITE_DEBUG=false
```

---

## Instalação

### Passo 1: Criar Banco de Dados

```bash
# Conectar ao PostgreSQL
psql -U postgres

# Dentro do PostgreSQL
CREATE USER reistechuser WITH PASSWORD 'sua_senha_segura';
CREATE DATABASE reistechdb OWNER reistechuser;

# Conceder privilégios
GRANT ALL PRIVILEGES ON DATABASE reistechdb TO reistechuser;
\q  # Sair
```

Ou use scripts:

```bash
# macOS/Linux
createdb -U postgres reistechdb
```

### Passo 2: Instalar Dependências

```bash
# Backend
cd backend
npm install

# Frontend (em novo terminal)
cd frontend
npm install
```

### Passo 3: Executar Migrações

```bash
cd backend
npm run migrate up
```

Isso cria as tabelas no banco:

```
✓ Migrations applied successfully
  - users
  - workspaces
  - catalogo
  - textos_cms
  - conversas
  - fila_humana
  - ...
```

### Passo 4: Semear Dados Iniciais

```bash
cd backend
npm run seed
```

Isso insere:

- Usuário admin: `admin@reiscelulares.com.br` / `Admin123!`
- 3 workspaces padrão: iphone_store, law_firm, motorcycle_shop
- Textos de CMS pré-configurados
- Roles e permissões

---

## Execução

### Modo 1: Terminal Local (Sem Docker)

```bash
# Terminal 1 - Backend
cd backend
npm run dev
# Saída: Server running on http://localhost:3001

# Terminal 2 - Frontend
cd frontend
npm run dev
# Saída: Local: http://localhost:5173
```

### Modo 2: Docker Compose

```bash
# Na raiz do projeto
docker-compose up -d

# Logs
docker-compose logs -f

# Parar
docker-compose down
```

### Modo 3: Produção Local (PM2)

```bash
cd backend
npm install -g pm2
npm run build

pm2 start ecosystem.config.js
pm2 logs

# Parar
pm2 kill
```

---

## Verificação

### ✅ Checklist de Funcionamento

```bash
# 1. Backend respondendo
curl http://localhost:3000/api/health

# 2. Banco conectado
psql -U reistechuser -d reistechdb -c "SELECT COUNT(*) FROM users;"

# 3. Redis funcionando (se ativado)
redis-cli ping
# Resposta esperada: PONG

# 4. Frontend carregando
open http://localhost:5173

# 5. Login funcionando
# Use: admin@reiscelulares.com.br / Admin123!
```

### 📊 URLs Padrão

| Serviço | Local | Descrição |
|---------|-------|-----------|
| Frontend | http://localhost | Painel administrativo (porta 80) |
| Backend API | http://localhost:3000 | API REST |
| Health Check | http://localhost:3000/api/health | Status da API |
| WebSocket | ws://localhost:3000/ws | Real-time updates |
| PostgreSQL | localhost:5432 | Banco de dados |
| Redis | localhost:6379 | Cache (opcional) |

---

## Acesso via IP Windows

Se acessar de outra máquina Windows na rede:

### 1. Descobrir IP do Mac

```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
# Exemplo de saída: inet 192.168.100.232
```

### 2. Atualizar `.env`

```env
# Em frontend/.env
VITE_API_URL=http://192.168.100.232:3000
VITE_WS_URL=ws://192.168.100.232:3000

# Em backend/.env
API_DOMAIN="http://192.168.100.232:3000"
CORS_WHITELIST="http://localhost,http://192.168.100.232"
```

### 3. Acessar do Windows

```
Frontend: http://192.168.100.232
Backend:  http://192.168.100.232:3000
```

---

## Troubleshooting

### ❌ "Connection refused" (Banco)

```bash
# Verificar se PostgreSQL está rodando
brew services list | grep postgresql
# ou
sudo systemctl status postgresql

# Iniciar se necessário
brew services start postgresql@15
```

### ❌ "Port 3000 already in use"

```bash
# Encontrar processo usando porta 3000
lsof -i :3000

# Matar processo
kill -9 <PID>

# Ou usar porta diferente
PORT=3002 npm run dev
```

### ❌ "Cannot find module"

```bash
# Limpar cache e reinstalar
rm -rf node_modules package-lock.json
npm install
```

### ❌ "Migrations failed"

```bash
# Ver status das migrations
cd backend
npm run migrate status

# Reverter última migration
npm run migrate down

# Reaplicar
npm run migrate up
```

### ❌ "Redis connection refused"

Redis é opcional. Se não precisar:

```bash
# Em backend/.env
REDIS_HOST=  # Deixar vazio
```

### ❌ "Frontend não conecta ao backend"

```bash
# Verificar URLs em frontend/.env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000

# Testar conexão
curl http://localhost:3000/api/health

# Verificar CORS
# Backend logs devem mostrar requisição aceita
```

### ❌ "SMTP authentication failed"

```bash
# Verificar credenciais em .env
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=seu_email@dominio.com
SMTP_PASSWORD=sua_senha_real

# Teste com telnet
telnet smtp.hostinger.com 465
```

---

## Scripts Úteis

```bash
# Backend
npm run dev         # Desenvolvimento com nodemon
npm run build       # Build para produção
npm test            # Rodar testes
npm run lint        # Verificar estilo de código
npm run format      # Formatar código
npm run migrate     # Executar migrations

# Frontend
npm run dev         # Desenvolvimento com Vite
npm run build       # Build para produção
npm run test        # Rodar testes
npm run test:e2e    # E2E tests com Cypress
npm run lint        # Verificar estilo
npm run format      # Formatar código

# Docker
docker-compose up -d          # Iniciar
docker-compose down           # Parar
docker-compose logs -f        # Ver logs
docker-compose exec backend npm run migrate up  # Migrations
```

---

## Próximas Etapas

Depois de configurar o ambiente:

1. **Explorar o painel**
   - http://localhost:5173
   - Fazer login com admin
   - Conferir workspaces

2. **Testar WhatsApp**
   - Acessar aba "WhatsApp"
   - Escanear QR Code com seu número
   - Enviar mensagens para testar

3. **Configurar Catálogo**
   - Importar CSV de produtos
   - Testar busca e respostas automáticas

4. **Personalizar CMS**
   - Editar textos do bot
   - Testar recarregamento em tempo real

5. **Consultar Documentação**
   - [docs/](.) para guias detalhados
   - [docs/reistech_especificacao_tecnica.md](reistech_especificacao_tecnica.md) para arquitetura
   - [docs/api_endpoints_documentacao.yaml](api_endpoints_documentacao.yaml) para endpoints

---

## Suporte

- 📧 Issues: [GitHub Issues](https://github.com/jrdosreis/reistech-deepseek/issues)
- 📖 Documentação: [docs/](.)
- 🐛 Logs: Verificar `backend/logs/`

