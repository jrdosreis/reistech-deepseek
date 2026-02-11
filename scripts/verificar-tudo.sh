#!/bin/bash

echo "Selecione o que quer verificar:"
echo "1) 🐳 Docker e containers"
echo "2) ⚡ Node.js e npm"
echo "3) 🗄️  Bancos de dados"
echo "4) 🔌 Portas em uso"
echo "5) 📁 Projeto Reistech"
echo "6) 📊 Sistema e recursos"
echo "7) 🔎 TUDO (auditoria completa)"
echo "0) Sair"

read -p "Opção: " OPTION

case $OPTION in
  1)
    echo "🐳 DOCKER:"
    docker --version 2>/dev/null || echo "Docker não instalado"
    echo ""
    echo "Containers rodando:"
    docker ps 2>/dev/null || echo "Nenhum container rodando"
    ;;
    
  2)
    echo "⚡ NODE.JS:"
    node --version 2>/dev/null || echo "Node.js não instalado"
    echo ""
    echo "Processos Node rodando:"
    ps aux | grep -E "node|npm|yarn" | grep -v grep || echo "Nenhum processo Node rodando"
    ;;
    
  3)
    echo "🗄️  BANCOS DE DADOS:"
    echo ""
    echo "PostgreSQL (porta 5432):"
    lsof -i :5432 2>/dev/null || echo "Porta 5432 livre"
    echo ""
    echo "MySQL (porta 3306):"
    lsof -i :3306 2>/dev/null || echo "Porta 3306 livre"
    echo ""
    echo "MongoDB (porta 27017):"
    lsof -i :27017 2>/dev/null || echo "Porta 27017 livre"
    ;;
    
  4)
    echo "🔌 PORTAS EM USO:"
    echo "Portas do Reistech:"
    for PORT in 3000 5432 80 8080; do
      if lsof -i :$PORT > /dev/null 2>&1; then
        echo "⚠️  Porta $PORT: EM USO"
        lsof -i :$PORT | grep LISTEN
      else
        echo "✅ Porta $PORT: LIVRE"
      fi
      echo ""
    done
    ;;
    
  5)
    echo "📁 PROJETO REISTECH:"
    echo "Diretório atual: $(pwd)"
    echo ""
    ls -la docker-compose.yml package.json 2>/dev/null || echo "Arquivos do projeto não encontrados"
    ;;
    
  6)
    echo "📊 SISTEMA E RECURSOS:"
    echo "Memória livre:"
    vm_stat | grep "free"
    echo ""
    echo "CPU em uso:"
    top -l 1 -s 0 | grep "CPU usage"
    ;;
    
  7)
    echo "🔎 EXECUTANDO AUDITORIA COMPLETA..."
    # Execute o script anterior
    if [ -f "auditoria-macbook.sh" ]; then
      ./auditoria-macbook.sh
    else
      echo "Script de auditoria não encontrado"
    fi
    ;;
    
  0)
    echo "Saindo..."
    exit 0
    ;;
    
  *)
    echo "Opção inválida!"
    ;;
esac
