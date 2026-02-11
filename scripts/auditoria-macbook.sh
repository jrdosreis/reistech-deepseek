#!/bin/bash

echo "====================================================="
echo "🔍 AUDITORIA COMPLETA DO MACBOOK - PROJETO REISTECH"
echo "====================================================="

echo ""
echo "📅 Data/Hora: $(date)"
echo "🖥️  Hostname: $(hostname)"
echo "👤 Usuário: $(whoami)"
echo "💻 Sistema: $(sw_vers -productName) $(sw_vers -productVersion)"
echo "🔧 Arquitetura: $(arch)"

echo ""
echo "1. 🐳 DOCKER:"
echo "----------------------------------------"
if command -v docker &> /dev/null; then
  echo "✅ Docker instalado: $(docker --version)"
  echo "   Docker Compose: $(docker-compose --version 2>/dev/null || echo 'Não instalado')"
  
  echo "   Containers rodando:"
  docker ps --format "    {{.Names}} ({{.Status}})" 2>/dev/null || echo "    Nenhum container rodando"
else
  echo "❌ Docker não está instalado"
fi

echo ""
echo "2. ⚡ NODE.JS:"
echo "----------------------------------------"
if command -v node &> /dev/null; then
  echo "✅ Node.js instalado: $(node --version)"
  echo "✅ npm instalado: $(npm --version)"
  
  echo "   Processos Node rodando:"
  NODE_PROCESSES=$(ps aux | grep -E "node|npm" | grep -v grep | wc -l)
  if [ $NODE_PROCESSES -gt 0 ]; then
    ps aux | grep -E "node|npm" | grep -v grep | head -5 | awk '{print "    PID:" $2 " - " $11 " " $12}'
    echo "    Total: $NODE_PROCESSES processos"
  else
    echo "    Nenhum processo Node rodando"
  fi
else
  echo "❌ Node.js não está instalado"
fi

echo ""
echo "3. 🗄️  BANCOS DE DADOS:"
echo "----------------------------------------"
echo "   PostgreSQL:"
if command -v psql &> /dev/null; then
  echo "    ✅ Client PostgreSQL instalado"
else
  echo "    ❌ Client PostgreSQL não instalado"
fi

if lsof -i :5432 > /dev/null 2>&1; then
  echo "    ⚠️  PostgreSQL rodando na porta 5432"
  echo "      Processo: $(lsof -i :5432 -s TCP:LISTEN -t | xargs ps -p 2>/dev/null | tail -1)"
else
  echo "    ✅ Porta 5432 livre"
fi

echo ""
echo "4. 🔌 PORTAS DO REISTECH EM USO:"
echo "----------------------------------------"
REISTECH_PORTS="3000 5432 80 8080 4200 5173"

for PORT in $REISTECH_PORTS; do
  if lsof -i :$PORT > /dev/null 2>&1; then
    PID=$(lsof -i :$PORT -s TCP:LISTEN -t | head -1)
    PROCESS=$(ps -p $PID -o comm= 2>/dev/null || echo "desconhecido")
    echo "    ⚠️  Porta $PORT: EM USO por $PROCESS (PID: $PID)"
  else
    echo "    ✅ Porta $PORT: LIVRE"
  fi
done

echo ""
echo "5. 📁 PROJETO REISTECH ATUAL:"
echo "----------------------------------------"
if [ -f "package.json" ]; then
  echo "    ✅ package.json encontrado"
  echo "    Nome do projeto: $(grep '"name"' package.json | cut -d'"' -f4)"
else
  echo "    ❌ Nenhum package.json encontrado nesta pasta"
fi

if [ -f "docker-compose.yml" ]; then
  echo "    ✅ docker-compose.yml encontrado"
else
  echo "    ❌ docker-compose.yml não encontrado"
fi

echo ""
echo "6. 🌐 CONEXÕES DE REDE:"
echo "----------------------------------------"
echo "   IP local: $(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)"
echo "   Conexões ativas na rede: $(netstat -an | grep ESTABLISHED | wc -l)"

echo ""
echo "7. 💾 ESPAÇO EM DISCO:"
echo "----------------------------------------"
df -h / | tail -1 | awk '{print "    Livre: " $4 " de " $2 " (" $5 " usado)"}'

echo ""
echo "8. 📊 MEMÓRIA DISPONÍVEL:"
echo "----------------------------------------"
MEMORY_TOTAL=$(sysctl hw.memsize | awk '{print $2}')
MEMORY_FREE=$(vm_stat | grep "Pages free" | awk '{print $3}' | sed 's/\.//')
MEMORY_AVAILABLE=$((MEMORY_FREE * 4096 / 1024 / 1024))
MEMORY_TOTAL_MB=$((MEMORY_TOTAL / 1024 / 1024))

echo "    Total: $MEMORY_TOTAL_MB MB"
echo "    Disponível: $MEMORY_AVAILABLE MB"

echo ""
echo "====================================================="
echo "✅ AUDITORIA CONCLUÍDA!"
echo "====================================================="