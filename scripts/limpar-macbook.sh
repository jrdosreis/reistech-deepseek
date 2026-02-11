#!/bin/bash

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🧹 LIMPEZA COMPLETA DO AMBIENTE MACBOOK${NC}"
echo -e "${BLUE}========================================${NC}"

# Função para verificar e matar processos
kill_process_on_port() {
    local port=$1
    local service=$2
    
    echo -e "\n${YELLOW}🔍 Verificando porta ${port} (${service})...${NC}"
    
    local pids=$(lsof -ti :$port 2>/dev/null)
    if [ -n "$pids" ]; then
        echo -e "  ⚠️  Processos encontrados: $pids"
        kill -9 $pids 2>/dev/null
        echo -e "  ✅ ${service} finalizado"
    else
        echo -e "  ✅ Porta ${port} já liberada"
    fi
}

# 1. Parar containers Docker
echo -e "\n${YELLOW}1. PARANDO CONTAINERS DOCKER...${NC}"
docker-compose down --remove-orphans --volumes 2>/dev/null || echo "  ℹ️  Nenhum docker-compose encontrado"
docker stop $(docker ps -q) 2>/dev/null || echo "  ℹ️  Nenhum container rodando"
docker rm $(docker ps -aq) 2>/dev/null || echo "  ℹ️  Nenhum container para remover"

# 2. Parar serviços locais do macOS
echo -e "\n${YELLOW}2. PARANDO SERVIÇOS LOCAIS...${NC}"
kill_process_on_port 5432 "PostgreSQL"
kill_process_on_port 3306 "MySQL"
kill_process_on_port 27017 "MongoDB"
kill_process_on_port 6379 "Redis"

# Parar serviços via brew
brew services stop postgresql@14 2>/dev/null || true
brew services stop mysql 2>/dev/null || true
brew services stop mongodb-community 2>/dev/null || true
brew services stop redis 2>/dev/null || true

# 3. Liberar portas da aplicação
echo -e "\n${YELLOW}3. LIBERANDO PORTAS DA APLICAÇÃO...${NC}"
kill_process_on_port 3000 "Backend Node.js"
kill_process_on_port 3001 "Frontend Dev Server"
kill_process_on_port 80 "Frontend Production"
kill_process_on_port 8080 "Servidor Alternativo"
kill_process_on_port 9229 "Node.js Debugger"
kill_process_on_port 5173 "Vite Dev Server"

# 4. Limpeza Docker completa
echo -e "\n${YELLOW}4. LIMPEZA DOCKER PROFUNDA...${NC}"
docker system prune -a --volumes -f 2>/dev/null || echo "  ℹ️  Limpeza Docker não disponível"
docker network prune -f 2>/dev/null || true
docker image prune -f 2>/dev/null || true

# 5. Limpar cache do sistema
echo -e "\n${YELLOW}5. LIMPANDO CACHES DO SISTEMA...${NC}"
rm -rf ~/Library/Caches/com.docker.* 2>/dev/null || true
npm cache clean --force 2>/dev/null || true
echo "  ✅ Caches limpos"

# 6. Verificação final
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✅ VERIFICAÇÃO FINAL DO SISTEMA${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "\n${BLUE}📊 STATUS DAS PORTAS:${NC}"
for port in 5432 3306 27017 6379 3000 3001 80 8080 9229 5173; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "  ${RED}❌ Porta $port: EM USO${NC}"
        lsof -i :$port | head -2
    else
        echo -e "  ${GREEN}✅ Porta $port: LIVRE${NC}"
    fi
done

echo -e "\n${BLUE}💾 STATUS DA MEMÓRIA:${NC}"
echo -e "  Memória livre: $(vm_stat | grep 'free' | awk '{print $3 * 4 / 1024}' | cut -d. -f1) MB"
echo -e "  Memória inativa: $(vm_stat | grep 'inactive' | awk '{print $3 * 4 / 1024}' | cut -d. -f1) MB"

echo -e "\n${BLUE}🐳 STATUS DOCKER:${NC}"
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null | head -10 || echo "  ℹ️  Docker não disponível"

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 LIMPEZA CONCLUÍDA COM SUCESSO!${NC}"
echo -e "${GREEN}========================================${NC}"

# Sugestões
echo -e "\n${YELLOW}💡 SUGESTÕES:${NC}"
echo "  • Reinicie o Docker Desktop se necessário"
echo "  • Execute 'docker system df' para ver espaço liberado"
echo "  • Para migração: execute './scripts/backup-projeto.sh'"
