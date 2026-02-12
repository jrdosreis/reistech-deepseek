#!/bin/bash

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🌐 TESTADOR DE CONEXÃO WINDOWS-MAC${NC}"
echo -e "${BLUE}========================================${NC}"

echo -e "${RED}⚠️  AVISO DE SEGURANÇA: Expor o Docker daemon na porta 2375${NC}"
echo -e "${RED}   sem TLS permite que qualquer dispositivo na rede controle${NC}"
echo -e "${RED}   seu Docker host. Prefira SSH tunneling ou Docker contexts SSH.${NC}"
echo -e "${RED}   Consulte: docs/DOCKER_REMOTE_MAC_WINDOWS.md${NC}"

# Função para testar conexão
test_connection() {
    local ip=$1
    local port=$2
    local service=$3
    
    echo -ne "  🔍 Testando $service ($ip:$port)... "
    
    if nc -z -w 3 $ip $port 2>/dev/null; then
        echo -e "${GREEN}✅ CONECTADO${NC}"
        return 0
    else
        echo -e "${RED}❌ FALHOU${NC}"
        return 1
    fi
}

# Configuração
DEFAULT_WINDOWS_IP="192.168.100.15"
DOCKER_PORT=2375
SSH_PORT=22
WEB_PORT=80
API_PORT=3000
API_PORT_ALT=3001
DB_PORT=5432

# Solicitar IP ou usar padrão
echo -e "\n${YELLOW}📝 CONFIGURAÇÃO DE CONEXÃO:${NC}"
read -p "Digite o IP do Windows [$DEFAULT_WINDOWS_IP]: " WINDOWS_IP
WINDOWS_IP=${WINDOWS_IP:-$DEFAULT_WINDOWS_IP}

echo -e "\n${YELLOW}🚀 INICIANDO TESTES DE CONEXÃO...${NC}"

# Teste 1: Ping básico
echo -e "\n${BLUE}1. TESTE DE PING:${NC}"
ping -c 3 -W 2 $WINDOWS_IP > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "  ${GREEN}✅ Windows alcançável${NC}"
    PING_MS=$(ping -c 1 -W 1 $WINDOWS_IP | grep 'time=' | cut -d'=' -f4 | cut -d' ' -f1)
    echo -e "  Latência: ${PING_MS:-"N/A"}"
else
    echo -e "  ${RED}❌ Windows inalcançável${NC}"
    echo -e "  Verifique:"
    echo -e "    • Mesma rede Wi-Fi/Ethernet"
    echo -e "    • Firewall do Windows"
    echo -e "    • Configurações de rede"
fi

# Teste 2: Portas essenciais
echo -e "\n${BLUE}2. TESTE DE PORTAS:${NC}"
test_connection $WINDOWS_IP $DOCKER_PORT "Docker Daemon"
test_connection $WINDOWS_IP $SSH_PORT "SSH"
test_connection $WINDOWS_IP $WEB_PORT "HTTP Web"
test_connection $WINDOWS_IP $API_PORT "API Backend (3000)"
test_connection $WINDOWS_IP $API_PORT_ALT "API Backend (3001)"
test_connection $WINDOWS_IP $DB_PORT "PostgreSQL"

# Teste 3: Docker remoto
echo -e "\n${BLUE}3. TESTE DOCKER REMOTO:${NC}"
export DOCKER_HOST="tcp://$WINDOWS_IP:$DOCKER_PORT"
DOCKER_TEST=$(timeout 5 docker version 2>/dev/null)

if [ $? -eq 0 ]; then
    echo -e "  ${GREEN}✅ Conexão Docker estabelecida${NC}"
    echo -e "  Versão do servidor:"
    echo "$DOCKER_TEST" | grep -A1 "Server:" | tail -1
else
    echo -e "  ${RED}❌ Falha na conexão Docker${NC}"
    echo -e "  Soluções possíveis:"
    echo -e "    1. Docker Desktop → Settings → General"
    echo -e "       ☑️ 'Expose daemon on tcp://localhost:2375'"
    echo -e "    2. Docker Desktop → Settings → Resources"
    echo -e "       → Network → Port: 2375"
    echo -e "    3. Firewall do Windows: permitir porta 2375"
fi

# Configuração automática
echo -e "\n${BLUE}4. CONFIGURAÇÃO AUTOMÁTICA:${NC}"
read -p "Deseja configurar conexão automática? (s/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    # Adicionar ao .zshrc
    CONFIG_LINE="export DOCKER_HOST=\"tcp://$WINDOWS_IP:$DOCKER_PORT\""
    
    if ! grep -q "DOCKER_HOST" ~/.zshrc; then
        echo "" >> ~/.zshrc
        echo "# Docker remoto Windows - Reistech" >> ~/.zshrc
        echo "$CONFIG_LINE" >> ~/.zshrc
        echo -e "  ${GREEN}✅ Configuração adicionada ao ~/.zshrc${NC}"
    else
        # Atualizar linha existente
        if grep -q "# Docker remoto Windows" ~/.zshrc; then
            sed -i.bak '/# Docker remoto Windows/,+1d' ~/.zshrc
            echo "# Docker remoto Windows - Reistech" >> ~/.zshrc
            echo "$CONFIG_LINE" >> ~/.zshrc
        else
            sed -i.bak "s|export DOCKER_HOST=.*|$CONFIG_LINE|" ~/.zshrc
        fi
        echo -e "  ${GREEN}✅ Configuração atualizada no ~/.zshrc${NC}"
    fi
    
    # Criar alias rápido
    if ! grep -q "alias docker-win=" ~/.zshrc; then
        echo "alias docker-win='export DOCKER_HOST=\"tcp://$WINDOWS_IP:$DOCKER_PORT\"'" >> ~/.zshrc
        echo -e "  ${GREEN}✅ Alias 'docker-win' criado${NC}"
    fi
    
    echo -e "\n${YELLOW}🔄 Recarregue o terminal com:${NC}"
    echo -e "  source ~/.zshrc"
fi

# Resumo final
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}📋 RESUMO DA CONEXÃO${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "IP do Windows: ${WINDOWS_IP}"
echo -e "Docker Host: tcp://${WINDOWS_IP}:${DOCKER_PORT}"
echo -e ""
echo -e "${YELLOW}COMANDOS ÚTEIS:${NC}"
echo -e "  Conectar: export DOCKER_HOST=\"tcp://$WINDOWS_IP:$DOCKER_PORT\""
echo -e "  Testar: docker version"
echo -e "  Iniciar: docker-compose up -d"
echo -e "  Parar: docker-compose down"
echo -e "  Ver logs: docker-compose logs -f"

# Testar aplicação se Docker estiver funcionando
if command -v docker &> /dev/null && docker version &> /dev/null 2>&1; then
    echo -e "\n${YELLOW}🚀 TESTE RÁPIDO DA APLICAÇÃO:${NC}"
    read -p "Deseja iniciar a aplicação para teste? (s/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        echo -e "  Iniciando containers..."
        docker-compose up -d postgres redis 2>/dev/null
        sleep 5
        echo -e "  Verificando serviços..."
        docker-compose ps 2>/dev/null || echo "  ⚠️  docker-compose não disponível aqui"
    fi
fi

# Limpar variável temporária
unset DOCKER_HOST
