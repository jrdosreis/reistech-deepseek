# DOCUMENTAÇÃO DE OTIMIZAÇÃO PARA PRODUÇÃO - REISTECH PLATFORM

## 📋 Índice

1. [Visão Geral](#visão-geral)
1. [Otimizações Implementadas](#otimizações-implementadas)
1. [Arquitetura de Cache](#arquitetura-de-cache)
1. [Segurança](#segurança)
1. [Monitoramento e Logging](#monitoramento-e-logging)
1. [Deploy em Produção](#deploy-em-produção)
1. [Backup e Recuperação](#backup-e-recuperação)
1. [Checklist de Deploy](#checklist-de-deploy)
1. [Troubleshooting](#troubleshooting)

-----

## 🎯 Visão Geral

Este documento descreve as otimizações implementadas no sistema ReisTech para preparação em ambiente de produção real. Todas as otimizações foram desenvolvidas mantendo a arquitetura existente e sem alterar funcionalidades core.

### Componentes Otimizados

- ✅ **Cache Redis Estratégico** - Multi-camada com invalidação inteligente
- ✅ **Rate Limiting** - Proteção contra DDoS e abuso
- ✅ **Logging Centralizado** - Winston com rotação automática
- ✅ **Health Checks** - Monitoramento de componentes críticos
- ✅ **Segurança Avançada** - Helmet, CORS, validação, sanitização
- ✅ **Deploy Automatizado** - Scripts PM2 e Nginx
- ✅ **Backup Automatizado** - Banco, sessões, uploads

-----

## 🚀 Otimizações Implementadas

### 1. Sistema de Cache Redis Multi-Camada

**Arquivo:** `backend/services/cacheService.js`

#### TTL Estratégico por Tipo de Dado

// Cache de curto prazo (dados voláteis)
CLIENTE_ESTADO: 30s      // Estado FSM muda frequentemente
FILA_HUMANA: 10s         // Fila em tempo real
CONVERSAS_ATIVAS: 15s    // Conversas ativas

// Cache de médio prazo (dados semi-estáticos)
CLIENTE_DADOS: 5min      // Dados de cliente
TEXTO_CMS: 10min         // Textos CMS
CATALOGO_ITEM: 15min     // Itens do catálogo

// Cache de longo prazo (dados estáticos)
WORKSPACE_CONFIG: 30min  // Configuração de workspace
USER_PERMISSIONS: 15min  // Permissões de usuário

#### Funcionalidades

- ✅ Cache warming (pré-carregamento de dados críticos)
- ✅ Invalidação automática e manual
- ✅ Locks distribuídos para operações críticas
- ✅ Métricas de hit/miss rate
- ✅ Fallback automático em caso de erro

#### Uso

// Exemplo: Buscar cliente com cache
const cliente = await cacheService.getOrSet(
  `cliente:${workspaceId}:${clienteId}`,
  async () => {
    return await db.query('SELECT * FROM clientes WHERE id = $1', [clienteId]);
  },
  300 // TTL: 5 minutos
);

### 2. Rate Limiting Inteligente

**Arquivo:** `backend/middleware/rateLimiter.js`

#### Limites por Rota

|Rota                |Janela|Máximo         |Ação          |
|--------------------|------|---------------|--------------|
|`/api/auth/login`   |15 min|5 tentativas   |Ban temporário|
|`/api/whatsapp/send`|1 min |30 mensagens   |Bloqueio      |
|`/api/*` (global)   |1 min |100 requisições|Rate limit    |

#### Proteções

- ✅ **Blacklist/Whitelist** de IPs
- ✅ **Ban temporário** após violações repetidas
- ✅ **Contador de violações** com reset automático
- ✅ **Headers RateLimit** (compatível com padrões)

#### Uso

// Aplicar rate limit específico
app.use('/api/auth/login', rateLimiter.loginLimiter());

// Rate limit global
app.use('/api', rateLimiter.middleware());

### 3. Logging Centralizado

**Arquivo:** `backend/services/loggerService.js`

#### Níveis de Log

- **error** → Erros críticos (salvos por 30 dias)
- **warn** → Avisos e auditoria (salvos por 90 dias)
- **info** → Informações gerais (salvos por 14 dias)
- **http** → Requisições HTTP (salvos por 7 dias)
- **debug** → Debugging (apenas desenvolvimento)

#### Rotação Automática

- Arquivos diários com timestamp
- Compressão automática (gzip)
- Limpeza por retenção configurável
- Logs separados por tipo

#### Uso

const { logger } = require('./services/loggerService');

// Logs estruturados
logger.info('Operação realizada', { userId: 123, action: 'update' });
logger.error('Falha na operação', error, { context: 'whatsapp' });
logger.audit('login', user, { ip: req.ip });

### 4. Health Checks Completos

**Arquivo:** `backend/services/healthCheckService.js`

#### Componentes Monitorados

- ✅ PostgreSQL (conexão, pool, latência)
- ✅ Redis Cache (conexão, hit rate)
- ✅ Redis Rate Limiter (conexão)
- ✅ Memória do sistema e processo
- ✅ CPU e load average
- ✅ Espaço em disco
- ✅ Conexões WhatsApp
- ✅ WebSocket (clientes conectados)

#### Endpoints


# Health check completo
GET /health
{
  "status": "healthy",
  "uptime": 3600,
  "checks": {
    "database": { "status": "healthy", "duration": "15ms" },
    "redis_cache": { "status": "healthy", "hitRate": "85%" },
    ...
  }
}

# Readiness (K8s/Load Balancer)
GET /ready

# Liveness (K8s)
GET /alive

### 5. Segurança Avançada

**Arquivo:** `backend/middleware/security.js`

## Scripts úteis

- `scripts/deploy-production.sh`: automação de deploy com PM2 e Traefik.
- `scripts/PREPARE_FOR_WINDOWS.sh`: preparação guiada (backup, limpeza opcional, aliases) para ambientes Windows/WSL.

#### Proteções Implementadas

- ✅ **Helmet** - Headers de segurança HTTP
- ✅ **CORS** configurável por whitelist
- ✅ **SQL Injection** - Detecção e bloqueio
- ✅ **XSS** - Sanitização de inputs
- ✅ **NoSQL Injection** - Proteção MongoDB-style
- ✅ **HPP** - HTTP Parameter Pollution
- ✅ **JWT** - Validação com expiração
- ✅ **RBAC** - Autorização por role
- ✅ **Brute Force** - Proteção em login
- ✅ **Auditoria** - Log de ações críticas

#### Validação de Inputs

// Exemplo de validação
app.post('/api/users', 
  SecurityMiddleware.validateInput({
    body: {
      email: { type: 'email', required: true },
      nome: { minLength: 3, maxLength: 100, required: true },
      cpf: { type: 'cpf', required: true }
    }
  }),
  async (req, res) => {
    // Input já validado e sanitizado
  }
);

-----

## 💾 Arquitetura de Cache

### Estratégia de Cache

┌─────────────────────────────────────────────┐
│         CLIENTE REQUISITA DADOS             │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │   CACHE REDIS?       │
        └──────┬───────────────┘
               │
        ┌──────┴──────┐
        │             │
       SIM           NÃO
        │             │
        ▼             ▼
   ┌────────┐   ┌──────────┐
   │ RETURN │   │ DATABASE │
   │  HIT   │   │  QUERY   │
   └────────┘   └────┬─────┘
                     │
                     ▼
                ┌─────────┐
                │  CACHE  │
                │  SET    │
                └─────────┘

### Cache Invalidation

**Gatilhos de Invalidação:**

// 1. Update de dados
clienteController.update = async (req, res) => {
  const cliente = await db.query('UPDATE clientes...');
  
  // Invalidar cache
  await cacheService.invalidateCliente(clienteId, workspaceId);
  await cacheService.invalidateClienteEstado(clienteId);
  
  return res.json(cliente);
};

// 2. Bulk invalidation
await cacheService.invalidateConversasAtivas(workspaceId);
await cacheService.invalidateFilaHumana(workspaceId);

### Métricas de Cache

// Obter estatísticas
const metrics = cacheService.getMetrics();
console.log(metrics);
// {
//   hits: 8500,
//   misses: 1500,
//   total: 10000,
//   hitRate: "85.00%",
//   sets: 1500,
//   deletes: 200,
//   errors: 0
// }

-----

## 🔒 Segurança

### Checklist de Segurança

- [x] JWT com secret forte (256 bits)
- [x] Senhas com bcrypt (12 rounds)
- [x] HTTPS obrigatório em produção
- [x] CORS restrito a domínios conhecidos
- [x] Rate limiting em todas as rotas
- [x] Sanitização de inputs
- [x] Headers de segurança (Helmet)
- [x] SQL Injection protection
- [x] XSS protection
- [x] Logs de auditoria

### Configuração de Ambiente

**NÃO COMMITAR `.env` NO GIT!**


# Gerar secrets fortes
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Configurar em .env
JWT_SECRET=seu_secret_aqui_256_bits
JWT_REFRESH_SECRET=outro_secret_diferente

### HTTPS com Let’s Encrypt


# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Gerar certificado
sudo certbot --nginx -d reiscelulares.com.br -d www.reiscelulares.com.br

# Renovação automática (cron)
0 12 * * * /usr/bin/certbot renew --quiet

-----

## 📊 Monitoramento e Logging

### Estrutura de Logs

/var/log/reistech/
├── combined-2024-01-15.log      # Todos os logs
├── error-2024-01-15.log         # Apenas erros
├── http-2024-01-15.log          # Requisições HTTP
├── audit-2024-01-15.log         # Auditoria
└── pm2/
    ├── error.log
    └── out.log

### Comandos PM2


# Ver logs em tempo real
pm2 logs reistech-api

# Ver logs de erro
pm2 logs reistech-api --err

# Limpar logs
pm2 flush

# Monitorar recursos
pm2 monit

# Ver métricas
pm2 show reistech-api

### Integração com Serviços Externos

**Sentry (Rastreamento de Erros):**

// backend/server.js
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1
});

**Slack (Alertas):**


# Configurar em .env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
SLACK_CHANNEL=#alerts

-----

## 🚀 Deploy em Produção

### Pré-requisitos


# Ubuntu 20.04+ / Debian 11+
sudo apt update
sudo apt install -y nodejs npm postgresql redis-server nginx git

# Instalar PM2 globalmente
sudo npm install -g pm2

# Configurar firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

### Processo de Deploy


# 1. Clonar repositório
git clone https://github.com/reistech/platform.git
cd platform

# 2. Executar script de deploy
chmod +x deploy-production.sh
sudo ./deploy-production.sh

# 3. Configurar variáveis de ambiente
cd /var/www/reistech/backend
sudo nano .env
# (editar valores de produção)

# 4. Iniciar aplicação
pm2 start ecosystem.config.js
pm2 save
pm2 startup

### Deploy Automatizado (CI/CD)

**GitHub Actions:**

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /var/www/reistech
            git pull origin main
            cd backend
            npm ci --production
            pm2 reload ecosystem.config.js

-----

## 💾 Backup e Recuperação

### Backup Automático

**Configurar Cron:**


# Editar crontab
sudo crontab -e

# Adicionar backup diário às 2AM
0 2 * * * /var/www/reistech/scripts/backup.sh >> /var/log/reistech/backup.log 2>&1

**Componentes do Backup:**

- ✅ Banco de dados PostgreSQL (dump SQL)
- ✅ Sessões WhatsApp
- ✅ Uploads de arquivos
- ✅ Configurações (.env, ecosystem.config.js)
- ✅ Logs recentes (últimos 7 dias)

### Restauração


# 1. Restaurar banco de dados
gunzip -c backup_20240115_020000_database.sql.gz | \
  PGPASSWORD=$DB_PASSWORD psql -h localhost -U reistech_user -d reistech_production

# 2. Restaurar sessões WhatsApp
tar -xzf backup_20240115_020000_whatsapp.tar.gz -C /var/

# 3. Restaurar uploads
tar -xzf backup_20240115_020000_uploads.tar.gz -C /var/

# 4. Reiniciar aplicação
pm2 restart reistech-api

### Backup Remoto (S3)


# Configurar AWS CLI
aws configure

# Adicionar ao .env
AWS_BACKUP_BUCKET=reistech-backups
AWS_REGION=us-east-1

# O script de backup enviará automaticamente para S3

-----

## ✅ Checklist de Deploy

### Antes do Deploy

- [ ] Testar aplicação localmente
- [ ] Executar testes automatizados
- [ ] Revisar código e fazer code review
- [ ] Atualizar documentação
- [ ] Gerar changelog
- [ ] Criar tag de versão no Git

### Configuração do Servidor

- [ ] Node.js 18+ instalado
- [ ] PostgreSQL 15+ configurado
- [ ] Redis 7+ configurado
- [ ] Nginx instalado
- [ ] PM2 instalado globalmente
- [ ] Firewall configurado (UFW)
- [ ] SSL/TLS configurado (Let’s Encrypt)

### Configuração da Aplicação

- [ ] Variáveis de ambiente configuradas (.env)
- [ ] Secrets gerados (JWT, bcrypt)
- [ ] CORS whitelist atualizada
- [ ] Domínios configurados
- [ ] Database migrations executadas
- [ ] Cache warming executado

### Monitoramento

- [ ] Health checks funcionando
- [ ] Logs sendo gerados
- [ ] PM2 configurado para auto-restart
- [ ] Backup cron configurado
- [ ] Alertas Slack/Email configurados

### Segurança

- [ ] HTTPS ativo
- [ ] Rate limiting ativo
- [ ] Helmet configurado
- [ ] Validação de inputs ativa
- [ ] Auditoria de logs ativa

### Pós-Deploy

- [ ] Verificar health check: `curl https://reiscelulares.com.br/health`
- [ ] Testar login e autenticação
- [ ] Testar envio de mensagens WhatsApp
- [ ] Verificar logs: `pm2 logs`
- [ ] Monitorar métricas: `pm2 monit`
- [ ] Testar backup: executar script manualmente

-----

## 🔧 Troubleshooting

### Problema: Aplicação não inicia

**Sintomas:**


pm2 list
# Status: errored

**Solução:**


# Ver logs de erro
pm2 logs reistech-api --err

# Verificar configuração
pm2 describe reistech-api

# Testar manualmente
cd /var/www/reistech/backend
node server.js

# Verificar variáveis de ambiente
cat .env | grep -v PASSWORD

### Problema: Banco de dados não conecta

**Sintomas:**

Error: connect ECONNREFUSED 127.0.0.1:5432

**Solução:**


# Verificar se PostgreSQL está rodando
sudo systemctl status postgresql

# Iniciar PostgreSQL
sudo systemctl start postgresql

# Testar conexão
PGPASSWORD=$DB_PASSWORD psql -h localhost -U reistech_user -d reistech_production -c "SELECT 1"

# Verificar logs do PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-15-main.log

### Problema: Redis não conecta

**Sintomas:**

Error: Redis connection refused

**Solução:**


# Verificar se Redis está rodando
sudo systemctl status redis

# Iniciar Redis
sudo systemctl start redis

# Testar conexão
redis-cli ping
# Deve retornar: PONG

# Verificar configuração
sudo nano /etc/redis/redis.conf

### Problema: Rate limit bloqueando requisições legítimas

**Sintomas:**

429 Too Many Requests

**Solução:**


# Limpar rate limits de um IP específico
curl -X POST http://localhost:3000/api/admin/rate-limit/clear \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ip": "192.168.1.100"}'

# Ou via Redis CLI
redis-cli --scan --pattern 'ratelimit:*:192.168.1.100' | xargs redis-cli del

### Problema: Cache desatualizado

**Sintomas:**

- Dados antigos sendo retornados
- Mudanças não aparecem imediatamente

**Solução:**


# Limpar todo cache de um workspace
redis-cli --scan --pattern 'reistech:*:workspace:123:*' | xargs redis-cli del

# Ou invalidar cache específico via API
curl -X POST http://localhost:3000/api/admin/cache/invalidate \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"workspace_id": 123}'

### Problema: Memória alta

**Sintomas:**

pm2 monit
# Memory: 950 MB / 1000 MB (95%)

**Solução:**


# Restart gradual (zero-downtime)
pm2 reload reistech-api

# Verificar memory leaks
node --inspect server.js

# Aumentar limite de memória
pm2 delete reistech-api
NODE_OPTIONS="--max-old-space-size=2048" pm2 start ecosystem.config.js
pm2 save

-----

## 📚 Recursos Adicionais

### Documentação Oficial

- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [PM2 Documentation](https://pm2.keymetrics.io/docs)
- [Redis Documentation](https://redis.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs)
- [Express Security](https://expressjs.com/en/advanced/best-practice-security.html)

### Comandos Úteis


# Verificar portas em uso
sudo netstat -tlnp | grep :3000

# Monitorar recursos
htop

# Verificar espaço em disco
df -h

# Ver processos Node
ps aux | grep node

# Testar latência de rede
ping reiscelulares.com.br

# Verificar DNS
nslookup reiscelulares.com.br
dig reiscelulares.com.br

# Benchmark de performance
ab -n 1000 -c 10 http://reiscelulares.com.br/api/health

-----

**Versão:** 2.0.0  
**Última Atualização:** 15/01/2024  
**Autor:** Tech Team ReisTech  
**Contato:** contato@reiscelulares.com.br