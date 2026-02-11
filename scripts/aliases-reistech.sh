#!/bin/bash

# ============================================
# REISTECH ALIASES E FUNÇÕES PARA TERMINAL
# ============================================
# Adicione este arquivo ao seu ~/.zshrc ou execute:
# cat scripts/aliases-reistech.sh >> ~/.zshrc

# ============================================
# FUNÇÕES DE CONEXÃO DOCKER
# ============================================

# Conectar ao Docker no Windows
docker-connect() {
  if [ -z "$1" ]; then
    echo "Uso: docker-connect <IP_DO_WINDOWS>"
    echo "Exemplo: docker-connect 192.168.100.15"
    return 1
  fi
  export DOCKER_HOST="tcp://$1:2375"
  echo "✅ Conectado ao Docker no Windows ($1)"
  
  # Testar conexão
  echo "🔍 Testando conexão..."
  if docker version >/dev/null 2>&1; then
    echo "🎉 Conexão estabelecida com sucesso!"
    echo ""
    echo "Comandos disponíveis:"
    echo "  dps          - Listar containers"
    echo "  dlogs        - Ver logs"
    echo "  dup          - Iniciar projeto"
    echo "  ddown        - Parar projeto"
  else
    echo "❌ Falha na conexão"
    echo "Verifique:"
    echo "  1. IP correto do Windows"
    echo "  2. Docker Desktop expondo na porta 2375"
    echo "  3. Firewall do Windows"
  fi
}

# Desconectar do Docker remoto
docker-disconnect() {
  unset DOCKER_HOST
  echo "✅ Desconectado do Docker remoto"
  echo "📌 Usando Docker local agora"
}

# Verificar onde o Docker está conectado
docker-where() {
  if [ -z "$DOCKER_HOST" ]; then
    echo "📍 Docker: Local"
  else
    echo "📍 Docker: Remoto ($DOCKER_HOST)"
  fi
}

# ============================================
# ALIASES DOCKER BÁSICOS
# ============================================

alias dps='docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"'
alias dls='docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.CreatedAt}}"'
alias dim='docker images'
alias dvol='docker volume ls'
alias dnet='docker network ls'

# ============================================
# ALIASES DOCKER COMPOSE
# ============================================

alias dup='docker-compose up -d'
alias ddown='docker-compose down'
alias drestart='docker-compose restart'
alias drebuild='docker-compose up -d --build'
alias dlogs='docker-compose logs -f --tail=100'
alias dtail='docker-compose logs --tail=50'
alias dexec='docker-compose exec'
alias dstop='docker-compose stop'
alias dstart='docker-compose start'

# ============================================
# LOGS ESPECÍFICOS POR SERVIÇO
# ============================================

alias dlog-backend='docker-compose logs -f backend'
alias dlog-frontend='docker-compose logs -f frontend'
alias dlog-db='docker-compose logs -f postgres'
alias dlog-redis='docker-compose logs -f redis'

# ============================================
# EXECUTAR COMANDOS EM CONTAINERS
# ============================================

alias dbash='docker-compose exec backend bash'
alias dfrontbash='docker-compose exec frontend sh'
alias dnode='docker-compose exec backend node'
alias dnpm='docker-compose exec backend npm'
alias dpg='docker-compose exec postgres psql -U reistechuser -d reistechdb'

# ============================================
# FUNÇÃO DE VERIFICAÇÃO DE SAÚDE
# ============================================

dhealth() {
  echo "🔍 VERIFICAÇÃO DE SAÚDE DOS SERVIÇOS"
  echo "====================================="
  
  # Status dos containers
  echo ""
  echo "📦 CONTAINERS:"
  docker-compose ps 2>/dev/null || echo "  Não conectado ao Docker"
  
  # Recursos
  echo ""
  echo "💾 RECURSOS:"
  docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" 2>/dev/null || echo "  Não conectado ao Docker"
  
  # Portas
  echo ""
  echo "🔌 PORTAS EM USO:"
  for port in 80 3000 3001 5432 6379 5050 5173; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
      echo "  ✅ Porta $port: Em uso"
    else
      echo "  ⚠️  Porta $port: Livre"
    fi
  done
  
  # Network
  echo ""
  echo "🌐 NETWORK:"
  docker network inspect reistech-network --format '{{range .Containers}}{{.Name}} ({{.IPv4Address}}){{"\n"}}{{end}}' 2>/dev/null || echo "  Network não encontrada"
}

# ============================================
# LIMPEZA DOCKER
# ============================================

dclean() {
  echo "🧹 LIMPANDO DOCKER..."
  read -p "Tem certeza? (s/n): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Ss]$ ]]; then
    docker system prune -a --volumes -f
    docker network prune -f
    echo "✅ Limpeza concluída"
  else
    echo "❌ Limpeza cancelada"
  fi
}

# ============================================
# FUNÇÕES ESPECÍFICAS DO REISTECH
# ============================================

# Backup rápido
dbackup() {
  echo "💾 CRIANDO BACKUP RÁPIDO..."
  ./scripts/backup-projeto.sh
}

# Testar conexão Windows
dtest-win() {
  echo "🌐 TESTANDO CONEXÃO COM WINDOWS..."
  ./scripts/testar-conexao-windows.sh
}

# Limpar ambiente local
dclean-mac() {
  echo "🍎 LIMPANDO AMBIENTE MAC..."
  ./scripts/limpar-macbook.sh
}

# Inicialização do projeto
reistech-init() {
  echo "🚀 INICIANDO PROJETO REISTECH"
  echo "============================="
  
  # Verificar Docker
  if ! docker version >/dev/null 2>&1; then
    echo "❌ Docker não está disponível"
    echo "Conecte-se ao Windows: docker-connect <IP_WINDOWS>"
    return 1
  fi
  
  # Iniciar serviços essenciais
  echo "1. Iniciando banco de dados e cache..."
  docker-compose up -d postgres redis
  
  echo "2. Aguardando inicialização..."
  sleep 10
  
  echo "3. Iniciando backend..."
  docker-compose up -d backend
  
  echo "4. Iniciando frontend..."
  docker-compose up -d frontend
  
  echo ""
  echo "🎉 PROJETO INICIADO COM SUCESSO!"
  echo ""
  echo "🌐 ACESSOS:"
  echo "  Frontend: http://localhost:5173"
  echo "  Backend:  http://localhost:3001"
  echo "  PostgreSQL: localhost:5432"
  echo ""
  echo "📊 COMANDOS ÚTEIS:"
  echo "  dlogs           - Ver logs"
  echo "  dhealth         - Verificar saúde"
  echo "  ddown           - Parar tudo"
}

# Status rápido
reistech-status() {
  echo "📊 STATUS REISTECH"
  echo "================="
  docker-compose ps 2>/dev/null || echo "  Projeto não está rodando"
}

# Menu interativo
reistech-menu() {
  while true; do
    clear
    echo "╔══════════════════════════════════════╗"
    echo "║        REISTECH CONTROL PANEL        ║"
    echo "╠══════════════════════════════════════╣"
    echo "║ 1. 🚀 Iniciar projeto completo       ║"
    echo "║ 2. ⏸️  Parar projeto                 ║"
    echo "║ 3. 🔄 Reiniciar projeto              ║"
    echo "║ 4. 📊 Ver status                     ║"
    echo "║ 5. 📝 Ver logs                       ║"
    echo "║ 6. 🧹 Limpar ambiente                ║"
    echo "║ 7. 💾 Backup                         ║"
    echo "║ 8. 🌐 Testar conexão Windows         ║"
    echo "║ 9. 🐳 Docker info                    ║"
    echo "║ 0. ❌ Sair                           ║"
    echo "╚══════════════════════════════════════╝"
    echo ""
    read -p "Escolha uma opção: " choice
    
    case $choice in
      1) reistech-init;;
      2) ddown;;
      3) drestart;;
      4) reistech-status;;
      5) dlogs;;
      6) dclean-mac;;
      7) dbackup;;
      8) dtest-win;;
      9) docker-where;;
      0) break;;
      *) echo "Opção inválida";;
    esac
    
    echo ""
    read -p "Pressione ENTER para continuar..."
  done
}

# Alias principal
alias reistech='reistech-menu'

echo "✅ Aliases e funções Reistech carregados!"
echo "💡 Digite 'reistech' para abrir o menu interativo"
