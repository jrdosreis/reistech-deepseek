#!/bin/bash

# ============================================
# SCRIPT DE INSTALAÇÃO AUTOMÁTICA
# OTIMIZAÇÕES REISTECH PLATFORM
# ============================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
	echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
	echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
	echo -e "${YELLOW}[!]${NC} $1"
}

log_error() {
	echo -e "${RED}[✗]${NC} $1"
}

safe_copy() {
	local src="$1"
	local dest="$2"

	if [ ! -f "$src" ]; then
		log_error "Arquivo não encontrado: $src"
		return 1
	fi

	if [ -f "$dest" ] && cmp -s "$src" "$dest"; then
		log_warning "Arquivo já está atualizado: $dest"
		return 0
	fi

	cp "$src" "$dest"
}

echo ""
echo "============================================"
echo "  INSTALAÇÃO DE OTIMIZAÇÕES - REISTECH"
echo "============================================"
echo ""

# Verificar se está na raiz do projeto
if [ ! -d "backend" ]; then
	log_error "Diretório 'backend' não encontrado!"
	log_error "Execute este script na raiz do projeto ReisTech."
	exit 1
fi

log_info "Projeto ReisTech detectado!"
echo ""

# Perguntar se deseja continuar
read -p "Deseja instalar as otimizações? (s/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
	log_warning "Instalação cancelada."
	exit 0
fi

# 1. Criar diretórios
log_info "Criando estrutura de diretórios..."

mkdir -p backend/middleware
mkdir -p backend/services
mkdir -p scripts
mkdir -p logs

log_success "Diretórios criados"

# 2. Fazer backup do server.js atual
log_info "Fazendo backup do server.js atual..."

if [ -f "backend/server.js" ]; then
	backup_file="backend/server.js.backup-$(date +%Y%m%d_%H%M%S)"
	cp backend/server.js "$backup_file"
	log_success "Backup criado: $backup_file"
fi

# Definir diretório de origem das otimizações
SOURCE_DIR="reistech-otimizacao"
if [ ! -d "$SOURCE_DIR" ]; then
	log_warning "Diretório '$SOURCE_DIR' não encontrado. Usando a raiz atual como origem."
	SOURCE_DIR="."
fi

# 3. Copiar arquivos de serviços
log_info "Copiando arquivos de serviços..."

if [ -f "$SOURCE_DIR/backend/services/cacheService.js" ] && [ -f "$SOURCE_DIR/backend/services/loggerService.js" ] && [ -f "$SOURCE_DIR/backend/services/healthCheckService.js" ]; then
	safe_copy "$SOURCE_DIR/backend/services/cacheService.js" backend/services/cacheService.js
	safe_copy "$SOURCE_DIR/backend/services/loggerService.js" backend/services/loggerService.js
	safe_copy "$SOURCE_DIR/backend/services/healthCheckService.js" backend/services/healthCheckService.js
	log_success "Serviços copiados: cacheService, loggerService, healthCheckService"
elif [ -f "$SOURCE_DIR/cacheService.js" ] && [ -f "$SOURCE_DIR/loggerService.js" ] && [ -f "$SOURCE_DIR/healthCheckService.js" ]; then
	safe_copy "$SOURCE_DIR/cacheService.js" backend/services/cacheService.js
	safe_copy "$SOURCE_DIR/loggerService.js" backend/services/loggerService.js
	safe_copy "$SOURCE_DIR/healthCheckService.js" backend/services/healthCheckService.js
	log_success "Serviços copiados: cacheService, loggerService, healthCheckService"
else
	log_error "Arquivos de serviços não encontrados no diretório de origem: $SOURCE_DIR"
	log_error "Verifique cacheService.js, loggerService.js e healthCheckService.js."
	exit 1
fi

# 4. Copiar middlewares
log_info "Copiando middlewares..."

if [ -f "$SOURCE_DIR/backend/middleware/rateLimiter.js" ] && [ -f "$SOURCE_DIR/backend/middleware/security.js" ]; then
	safe_copy "$SOURCE_DIR/backend/middleware/rateLimiter.js" backend/middleware/rateLimiter.js
	safe_copy "$SOURCE_DIR/backend/middleware/security.js" backend/middleware/security.js
elif [ -f "$SOURCE_DIR/rateLimiter.js" ] && [ -f "$SOURCE_DIR/security.js" ]; then
	safe_copy "$SOURCE_DIR/rateLimiter.js" backend/middleware/rateLimiter.js
	safe_copy "$SOURCE_DIR/security.js" backend/middleware/security.js
else
	log_error "Middlewares não encontrados no diretório de origem: $SOURCE_DIR"
	log_error "Verifique rateLimiter.js e security.js."
	exit 1
fi
log_success "Middlewares copiados: rateLimiter, security"

# 5. Copiar configurações
log_info "Copiando arquivos de configuração..."

if [ -f "$SOURCE_DIR/backend/ecosystem.config.js" ]; then
	safe_copy "$SOURCE_DIR/backend/ecosystem.config.js" backend/ecosystem.config.js
elif [ -f "$SOURCE_DIR/ecosystem.config.js" ]; then
	safe_copy "$SOURCE_DIR/ecosystem.config.js" backend/ecosystem.config.js
elif [ -f "$SOURCE_DIR/ecosystem.config" ]; then
	safe_copy "$SOURCE_DIR/ecosystem.config" backend/ecosystem.config.js
else
	log_warning "ecosystem.config(.js) não encontrado. Ignorando."
fi

if [ -f "$SOURCE_DIR/backend/.env.production" ]; then
	safe_copy "$SOURCE_DIR/backend/.env.production" backend/.env.production
elif [ -f "$SOURCE_DIR/.env.production" ]; then
	safe_copy "$SOURCE_DIR/.env.production" backend/.env.production
else
	log_warning ".env.production não encontrado. Ignorando."
fi
log_success "Configurações copiadas"

# 6. Copiar scripts
log_info "Copiando scripts..."

if [ "$SOURCE_DIR" != "." ]; then
	if [ -f "$SOURCE_DIR/deploy-production.sh" ]; then
		safe_copy "$SOURCE_DIR/deploy-production.sh" ./deploy-production.sh
	else
		log_warning "deploy-production.sh não encontrado. Ignorando."
	fi

	if [ -f "$SOURCE_DIR/scripts/backup.sh" ]; then
		safe_copy "$SOURCE_DIR/scripts/backup.sh" scripts/backup.sh
	elif [ -f "$SOURCE_DIR/backup.sh" ]; then
		safe_copy "$SOURCE_DIR/backup.sh" scripts/backup.sh
	else
		log_warning "backup.sh não encontrado. Ignorando."
	fi
else
	log_warning "Origem é a raiz atual. Ignorando cópia de scripts para evitar conflito."
fi

# Tornar executáveis
chmod +x deploy-production.sh
chmod +x scripts/backup.sh

log_success "Scripts copiados e tornados executáveis"

# 7. Copiar documentação
log_info "Copiando documentação..."

if [ "$SOURCE_DIR" = "." ]; then
	log_warning "Origem é a raiz atual. Ignorando cópia de documentação para evitar conflito."
elif [ -f "$SOURCE_DIR/OTIMIZACAO_PRODUCAO.md" ]; then
	safe_copy "$SOURCE_DIR/OTIMIZACAO_PRODUCAO.md" ./OTIMIZACAO_PRODUCAO.md
	log_success "Documentação copiada: OTIMIZACAO_PRODUCAO.md"
else
	log_warning "OTIMIZACAO_PRODUCAO.md não encontrado. Ignorando."
fi

# 8. Atualizar .gitignore
log_info "Atualizando .gitignore..."

if [ ! -f ".gitignore" ]; then
	touch .gitignore
fi

# Adicionar ao .gitignore se ainda não existe
grep -q "^.env.production$" .gitignore || echo ".env.production" >> .gitignore
grep -q "^.env$" .gitignore || echo ".env" >> .gitignore
grep -q "^logs/$" .gitignore || echo "logs/" >> .gitignore
grep -q "^node_modules/$" .gitignore || echo "node_modules/" >> .gitignore

log_success ".gitignore atualizado"

# 9. Verificar package.json e instalar dependências
log_info "Verificando package.json..."

cd backend

# Adicionar dependências se necessário
log_info "Instalando dependências necessárias..."

npm install --save \
	redis \
	winston \
	winston-daily-rotate-file \
	helmet \
	cors \
	xss-clean \
	express-mongo-sanitize \
	hpp \
	validator \
	compression \
	cookie-parser

if [ $? -eq 0 ]; then
	log_success "Dependências instaladas com sucesso"
else
	log_error "Falha ao instalar dependências"
	exit 1
fi

cd ..

# 10. Perguntar sobre server.js
echo ""
log_warning "ATENÇÃO: Arquivo server.js"
echo ""
echo "Você tem duas opções:"
echo "  1) Substituir server.js pelo otimizado (RECOMENDADO se seu server.js é básico)"
echo "  2) Manter server.js atual (você precisará mesclar manualmente)"
echo ""
read -p "Deseja substituir o server.js? (s/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Ss]$ ]]; then
	log_info "Substituindo server.js..."
	if [ -f "$SOURCE_DIR/backend/server.js" ]; then
		safe_copy "$SOURCE_DIR/backend/server.js" backend/server.js
	elif [ -f "$SOURCE_DIR/server.js" ]; then
		safe_copy "$SOURCE_DIR/server.js" backend/server.js
	else
		log_error "server.js não encontrado no diretório de origem: $SOURCE_DIR"
		exit 1
	fi
	log_success "server.js substituído (backup salvo anteriormente)"
else
	log_warning "server.js não substituído."
	log_warning "Você precisará mesclar manualmente as otimizações."
	log_warning "Consulte GUIA_INSTALACAO.md para instruções de mesclagem."
fi

# 11. Gerar secrets para .env
log_info "Gerando secrets para .env..."

cd backend

if command -v node &> /dev/null; then
	JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
	JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

	echo ""
	log_success "Secrets gerados:"
	echo "JWT_SECRET=$JWT_SECRET"
	echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET"
	echo ""
	log_warning "IMPORTANTE: Copie estes secrets e adicione ao seu .env"
else
	log_warning "Node.js não encontrado. Gere os secrets manualmente."
fi

cd ..

# 12. Criar diretórios de produção (opcional)
log_info "Criando diretórios de produção (requer sudo)..."

read -p "Deseja criar diretórios de produção? (s/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Ss]$ ]]; then
	sudo mkdir -p /var/log/reistech
	sudo mkdir -p /var/backups/reistech
	sudo mkdir -p /var/whatsapp-sessions
	sudo mkdir -p /var/uploads/reistech

	# Dar permissões
	USER_GROUP="$(id -gn "$USER")"
	sudo chown -R "$USER:$USER_GROUP" /var/log/reistech
	sudo chown -R "$USER:$USER_GROUP" /var/backups/reistech
	sudo chown -R "$USER:$USER_GROUP" /var/whatsapp-sessions
	sudo chown -R "$USER:$USER_GROUP" /var/uploads/reistech

	log_success "Diretórios de produção criados"
fi

# 13. Resumo final
echo ""
echo "============================================"
echo "  INSTALAÇÃO CONCLUÍDA COM SUCESSO!"
echo "============================================"
echo ""

log_success "Arquivos instalados:"
echo "  ✓ backend/services/cacheService.js"
echo "  ✓ backend/services/loggerService.js"
echo "  ✓ backend/services/healthCheckService.js"
echo "  ✓ backend/middleware/rateLimiter.js"
echo "  ✓ backend/middleware/security.js"
echo "  ✓ backend/ecosystem.config.js"
echo "  ✓ backend/.env.production"
echo "  ✓ deploy-production.sh"
echo "  ✓ scripts/backup.sh"
echo "  ✓ OTIMIZACAO_PRODUCAO.md"
echo ""

log_warning "PRÓXIMOS PASSOS:"
echo ""
echo "1. Configure o arquivo .env com seus valores:"
echo "   cd backend && nano .env"
echo ""
echo "2. Configure Redis e PostgreSQL"
echo ""
echo "3. Teste localmente:"
echo "   cd backend && node server.js"
echo ""
echo "4. Verifique health check:"
echo "   curl http://localhost:3001/health"
echo ""
echo "5. Para deploy em produção:"
echo "   ./deploy-production.sh"
echo ""
echo "6. Consulte a documentação completa:"
echo "   cat OTIMIZACAO_PRODUCAO.md"
echo ""
echo "============================================"
echo ""

log_success "Instalação completa! 🚀"