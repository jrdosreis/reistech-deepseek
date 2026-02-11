#!/bin/bash

# ============================================

# SCRIPT DE DEPLOY - REISTECH PLATFORM

# ============================================

# Deploy automatizado para produção com PM2

# ============================================

set -e  # Exit on error

# Cores para output

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações

APP_NAME="reistech-platform"
APP_DIR="/var/www/reistech"
BACKUP_DIR="/var/backups/reistech"
LOG_DIR="/var/log/reistech"
NODE_ENV="production"
PM2_CONFIG="ecosystem.config.js"

# Funções auxiliares

log_info() {
echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
echo -e "${RED}[ERROR]${NC} $1"
}

# Banner

echo "============================================"
echo "  REISTECH PLATFORM - DEPLOY SCRIPT"
echo "  Environment: ${NODE_ENV}"
echo "  Date: $(date)"
echo "============================================"
echo ""

# 1. Verificar pré-requisitos

log_info "Checking prerequisites…"

# Verificar Node.js

if ! command -v node &> /dev/null; then
log_error "Node.js not found. Please install Node.js 18+"
exit 1
fi

NODE_VERSION=$(node -v)
log_success "Node.js $NODE_VERSION found"

# Verificar PM2

if ! command -v pm2 &> /dev/null; then
log_error "PM2 not found. Installing PM2…"
npm install -g pm2
fi

PM2_VERSION=$(pm2 -v)
log_success "PM2 $PM2_VERSION found"

# Verificar PostgreSQL

if ! command -v psql &> /dev/null; then
log_warning "PostgreSQL client not found. Skipping database check."
else
log_success "PostgreSQL client found"
fi

# Verificar Redis

if ! command -v redis-cli &> /dev/null; then
log_warning "Redis CLI not found. Skipping Redis check."
else
if redis-cli ping &> /dev/null; then
log_success "Redis is running"
else
log_error "Redis is not running. Please start Redis."
exit 1
fi
fi

# 2. Criar diretórios necessários

log_info "Creating required directories…"

mkdir -p $APP_DIR
mkdir -p $BACKUP_DIR
mkdir -p $LOG_DIR
mkdir -p /var/whatsapp-sessions
mkdir -p /var/uploads/reistech

log_success "Directories created"

# 3. Backup da versão anterior

if [ -d "$APP_DIR/backend" ]; then
log_info "Creating backup of current version…"
BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S).tar.gz"
tar -czf "$BACKUP_DIR/$BACKUP_NAME" -C $APP_DIR . 2>/dev/null || true

# Manter apenas últimos 5 backups
cd $BACKUP_DIR
ls -t backup_*.tar.gz | tail -n +6 | xargs -r rm

log_success "Backup created: $BACKUP_NAME"

fi

# 4. Copiar arquivos

log_info "Deploying new version…"

# Backend

if [ -d "./backend" ]; then
log_info "Copying backend files…"
rsync -av --delete \
    --exclude 'node_modules' \
    --exclude '.env' \
    --exclude 'logs' \
    --exclude '.git' \
    ./backend/ "$APP_DIR/backend/"
log_success "Backend files copied"
fi

# Frontend

if [ -d "./frontend" ]; then
log_info "Copying frontend files…"
rsync -av --delete \
    --exclude 'node_modules' \
    --exclude '.env' \
    --exclude 'dist' \
    --exclude '.git' \
    ./frontend/ "$APP_DIR/frontend/"
log_success "Frontend files copied"
fi

# 5. Instalar dependências

cd $APP_DIR/backend

log_info "Installing backend dependencies…"
npm ci --production || npm install --production
log_success "Backend dependencies installed"

if [ -d "$APP_DIR/frontend" ]; then
cd $APP_DIR/frontend
log_info "Installing frontend dependencies…"
npm ci || npm install
log_success "Frontend dependencies installed"
fi

# 6. Build do frontend

if [ -d "$APP_DIR/frontend" ]; then
cd $APP_DIR/frontend
log_info "Building frontend…"
npm run build
log_success "Frontend built successfully"
fi

# 7. Configurar variáveis de ambiente

cd $APP_DIR/backend

if [ ! -f ".env" ]; then
log_warning ".env file not found. Creating from .env.production…"
if [ -f ".env.production" ]; then
    cp .env.production .env
    log_info "Please edit .env file with your production settings"
else
    log_error ".env.production not found. Please create .env manually."
    exit 1
fi
fi

# Garantir variáveis obrigatórias do admin
if [ -f ".env" ]; then
    ensure_env() {
        local key="$1"
        local value="$2"
        if ! grep -q "^${key}=" .env; then
            echo "${key}=${value}" >> .env
        fi
    }

    ensure_env "ADMIN_EMAIL" "admin@reiscelulares.com.br"
    ensure_env "ADMIN_PASSWORD" "ALTERAR_SENHA_ADMIN_FORTE"
    ensure_env "ADMIN_NAME" "Administrador"
fi

# 8. Executar migrations do banco de dados

log_info "Running database migrations…"

# Verificar se pode conectar ao banco

if command -v psql &> /dev/null; then
# Carregar apenas variáveis do banco (sem source para evitar falhas com espaços)
if [ -f ".env" ]; then
    DB_HOST=${DB_HOST:-$(grep -E '^DB_HOST=' .env | cut -d= -f2-)}
    DB_PORT=${DB_PORT:-$(grep -E '^DB_PORT=' .env | cut -d= -f2-)}
    DB_NAME=${DB_NAME:-$(grep -E '^DB_NAME=' .env | cut -d= -f2-)}
    DB_USER=${DB_USER:-$(grep -E '^DB_USER=' .env | cut -d= -f2-)}
    DB_PASSWORD=${DB_PASSWORD:-$(grep -E '^DB_PASSWORD=' .env | cut -d= -f2-)}
fi
# Testar conexão
if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1" &> /dev/null; then
    log_success "Database connection successful"
    
    # Executar migrations (exemplo usando node-pg-migrate)
    if [ -d "migrations" ]; then
        npm run migrate up || log_warning "Migrations failed or not configured"
    fi
else
    log_warning "Cannot connect to database. Skipping migrations."
fi

fi

# 9. Criar ecosystem.config.js para PM2 se não existir

if [ ! -f "$PM2_CONFIG" ]; then
log_info "Creating PM2 configuration…"
cat > "$PM2_CONFIG" << 'EOF'
module.exports = {
    apps: [
        {
            name: 'reistech-api',
            script: './server.js',
            instances: 4,
            exec_mode: 'cluster',
            env: {
                NODE_ENV: 'production',
                PORT: 3001
            },
            error_file: '/var/log/reistech/error.log',
            out_file: '/var/log/reistech/out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,
            max_memory_restart: '1G',
            autorestart: true,
            max_restarts: 10,
            min_uptime: '10s',
            listen_timeout: 10000,
            kill_timeout: 5000,
            wait_ready: true,
            shutdown_with_message: true
        }
    ]
};
EOF

log_success "PM2 configuration created"

fi

# 10. Iniciar/Reiniciar aplicação com PM2

log_info "Starting application with PM2…"

cd $APP_DIR/backend

# Verificar se já está rodando

if pm2 list | grep -q $APP_NAME; then
log_info "Application is running. Reloading…"
pm2 reload $PM2_CONFIG --update-env
else
log_info "Starting application for the first time…"
pm2 start $PM2_CONFIG
fi

# Salvar configuração do PM2

pm2 save

# Configurar PM2 para iniciar no boot

if ! pm2 startup | grep -q "already"; then
pm2 startup
fi

log_success "Application started with PM2"

# 11. Verificar status

sleep 5

log_info "Checking application status…"
pm2 list

# 12. Health check

log_info "Running health check…"

MAX_RETRIES=10
RETRY_COUNT=0
HEALTH_URL="http://localhost:3001/health"

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
if curl -f -s $HEALTH_URL > /dev/null; then
log_success "Health check passed!"
break
else
RETRY_COUNT=$((RETRY_COUNT + 1))
log_warning "Health check failed. Retry $RETRY_COUNT/$MAX_RETRIES…"
sleep 2
fi
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
log_error "Health check failed after $MAX_RETRIES attempts"
log_error "Please check logs: pm2 logs $APP_NAME"
exit 1
fi

# 13. Configurar Nginx (se disponível)

if command -v nginx &> /dev/null; then
log_info "Configuring Nginx…"
NGINX_CONFIG="/etc/nginx/sites-available/reistech"

if [ ! -f "$NGINX_CONFIG" ]; then
    cat > "$NGINX_CONFIG" << 'EOF'
upstream reistech_backend {
least_conn;
server 127.0.0.1:3001;
}

server {
listen 80;
server_name reiscelulares.com.br www.reiscelulares.com.br;
# Redirect HTTP to HTTPS
return 301 https://$server_name$request_uri;

}

server {
listen 443 ssl http2;
server_name reiscelulares.com.br www.reiscelulares.com.br;
# SSL configuration (adjust paths)
ssl_certificate /etc/ssl/certs/reistech.crt;
ssl_certificate_key /etc/ssl/private/reistech.key;
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers HIGH:!aNULL:!MD5;

# Security headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

# Frontend (React build)
location / {
    root /var/www/reistech/frontend/dist;
    try_files $uri $uri/ /index.html;
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# API
location /api {
    proxy_pass http://reistech_backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    proxy_read_timeout 300s;
    proxy_connect_timeout 75s;
}

# WebSocket
location /socket.io {
    proxy_pass http://reistech_backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_cache_bypass $http_upgrade;
}

# Health checks
location /health {
    proxy_pass http://reistech_backend;
    access_log off;
}

# File size limits
client_max_body_size 10M;

}
EOF
    # Criar symlink
    ln -sf $NGINX_CONFIG /etc/nginx/sites-enabled/reistech
    
    # Testar configuração
    if nginx -t; then
        systemctl reload nginx
        log_success "Nginx configured and reloaded"
    else
        log_error "Nginx configuration test failed"
    fi
else
    log_info "Nginx configuration already exists"
fi

fi

# 14. Configurar firewall (se UFW disponível)

if command -v ufw &> /dev/null; then
log_info "Configuring firewall…"
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp

log_success "Firewall configured"

fi

# 15. Finalizar

echo ""
echo "============================================"
log_success "DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "============================================"
echo ""
log_info "Application Information:"
echo "  - Name: $APP_NAME"
echo "  - Directory: $APP_DIR"
echo "  - Logs: $LOG_DIR"
echo "  - PM2 Status: pm2 list"
echo "  - PM2 Logs: pm2 logs $APP_NAME"
echo "  - PM2 Monitor: pm2 monit"
echo ""
log_info "Useful Commands:"
echo "  - Restart: pm2 restart $APP_NAME"
echo "  - Stop: pm2 stop $APP_NAME"
echo "  - View Logs: pm2 logs $APP_NAME"
echo "  - Monitor: pm2 monit"
echo ""
log_warning "Next Steps:"
echo "  1. Configure .env file with production settings"
echo "  2. Set up SSL certificates (Let's Encrypt)"
echo "  3. Configure backup cron jobs"
echo "  4. Set up monitoring (Sentry, New Relic, etc.)"
echo "  5. Test all endpoints"
echo ""
echo "============================================"