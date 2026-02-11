#!/bin/bash

echo "🚀 PREPARADOR DE MIGRAÇÃO REISTECH PARA WINDOWS"
echo "=============================================="
echo ""

echo "📋 ESTE SCRIPT IRÁ:"
echo "1. ✅ Criar backup completo do projeto"
echo "2. 🧹 Limpar ambiente MacBook"
echo "3. 📚 Mostrar instruções de configuração do Windows"
echo "4. 🔗 Preparar conexão com Docker do Windows"
echo "5. ✨ Configurar aliases no terminal"
echo ""

read -p "Continuar? (s/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "❌ Operação cancelada"
    exit 1
fi

echo ""
echo "=================================================="
echo "📦 ETAPA 1: BACKUP COMPLETO"
echo "=================================================="
./scripts/backup-projeto.sh

echo ""
echo "=================================================="
echo "🧹 ETAPA 2: LIMPEZA DO AMBIENTE"
echo "=================================================="
read -p "Executar limpeza do ambiente MacBook? (s/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    ./scripts/limpar-macbook.sh
else
    echo "⏭️  Limpeza pulada"
fi

echo ""
echo "=================================================="
echo "✨ ETAPA 3: CONFIGURAR ALIASES"
echo "=================================================="
read -p "Adicionar aliases Reistech ao ~/.zshrc? (s/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    # Verificar se já existe
    if ! grep -q "REISTECH ALIASES" ~/.zshrc 2>/dev/null; then
        echo "" >> ~/.zshrc
        echo "# ============================================" >> ~/.zshrc
        echo "# REISTECH PROJECT - Docker Remote Commands" >> ~/.zshrc
        echo "# ============================================" >> ~/.zshrc
        cat scripts/aliases-reistech.sh >> ~/.zshrc
        echo "✅ Aliases adicionados ao ~/.zshrc"
        echo "🔄 Execute: source ~/.zshrc"
    else
        echo "⚠️  Aliases Reistech já existem no ~/.zshrc"
        read -p "Atualizar? (s/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Ss]$ ]]; then
            # Backup do .zshrc
            cp ~/.zshrc ~/.zshrc.backup.$(date +%Y%m%d_%H%M%S)
            # Remover seção antiga
            sed -i.bak '/# REISTECH/,/^$/d' ~/.zshrc
            # Adicionar nova
            echo "" >> ~/.zshrc
            echo "# ============================================" >> ~/.zshrc
            echo "# REISTECH PROJECT - Docker Remote Commands" >> ~/.zshrc
            echo "# ============================================" >> ~/.zshrc
            cat scripts/aliases-reistech.sh >> ~/.zshrc
            echo "✅ Aliases atualizados no ~/.zshrc"
        fi
    fi
else
    echo "⏭️  Configuração de aliases pulada"
    echo "💡 Para adicionar manualmente depois:"
    echo "   cat scripts/aliases-reistech.sh >> ~/.zshrc"
fi

echo ""
echo "=================================================="
echo "🌐 ETAPA 4: PREPARAR CONEXÃO WINDOWS"
echo "=================================================="
echo ""
echo "📝 NO WINDOWS, CONFIGURE:"
echo ""
echo "1. Docker Desktop → Settings → General"
echo "   ☑️ 'Use the WSL 2 based engine'"
echo "   ☑️ 'Expose daemon on tcp://localhost:2375 without TLS'"
echo ""
echo "2. Docker Desktop → Settings → Resources"
echo "   • Memory: 8GB (mínimo) / 16GB (recomendado)"
echo "   • CPUs: 4 cores (mínimo)"
echo "   • Disk: 64GB"
echo ""
echo "3. Obter IP do Windows:"
echo "   • Abrir PowerShell"
echo "   • Executar: ipconfig"
echo "   • Anotar IPv4 Address (ex: 192.168.100.15)"
echo ""
echo "4. Configurar Firewall (PowerShell como Admin):"
echo ""
cat << 'FIREWALL'
New-NetFirewallRule -DisplayName "Docker Daemon" `
  -Direction Inbound -Protocol TCP -LocalPort 2375 -Action Allow

New-NetFirewallRule -DisplayName "Reistech Backend" `
  -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow

New-NetFirewallRule -DisplayName "Reistech Frontend" `
  -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow
FIREWALL
echo ""

read -p "Pressione ENTER quando o Windows estiver configurado..."

echo ""
read -p "Digite o IP do Windows (deixe em branco para pular): " WINDOWS_IP

if [ -n "$WINDOWS_IP" ]; then
    echo ""
    echo "=================================================="
    echo "🔗 ETAPA 5: TESTAR CONEXÃO"
    echo "=================================================="
    export DOCKER_HOST="tcp://$WINDOWS_IP:2375"
    ./scripts/testar-conexao-windows.sh
else
    echo ""
    echo "⚠️  Teste de conexão pulado."
    echo "Execute manualmente depois:"
    echo "  ./scripts/testar-conexao-windows.sh"
fi

echo ""
echo "=================================================="
echo "📚 ETAPA 6: DOCUMENTAÇÃO"
echo "=================================================="
echo ""
echo "📖 Guia completo de migração criado:"
echo "   MIGRATION_GUIDE.md"
echo ""
echo "🔍 Para visualizar:"
echo "   cat MIGRATION_GUIDE.md | less"
echo "   # ou"
echo "   open MIGRATION_GUIDE.md"
echo ""

echo "=================================================="
echo "📋 CHECKLIST RÁPIDO DE MIGRAÇÃO"
echo "=================================================="
echo ""
echo "NO MACBOOK (você está aqui):"
echo "  ✅ Backup realizado: ~/backups/reistech/"
echo "  ✅ Scripts criados: scripts/"
echo "  ✅ Documentação: MIGRATION_GUIDE.md"
echo "  ✅ Aliases configurados (recarregue o terminal)"
echo ""
echo "NO WINDOWS (próximos passos):"
echo "  [ ] Docker Desktop instalado e configurado"
echo "  [ ] Porta 2375 exposta"
echo "  [ ] Firewall configurado"
echo "  [ ] Projeto transferido ou clonado"
echo "  [ ] Arquivo .env configurado"
echo "  [ ] Containers iniciados"
echo "  [ ] Migrações executadas"
echo "  [ ] Seeds executados"
echo ""

echo "=================================================="
echo "🚀 COMANDOS PRINCIPAIS"
echo "=================================================="
echo ""
echo "📦 BACKUP E PREPARAÇÃO:"
echo "  ./scripts/backup-projeto.sh          # Fazer backup"
echo "  ./scripts/limpar-macbook.sh          # Limpar ambiente"
echo "  ./scripts/testar-conexao-windows.sh  # Testar conexão"
echo ""
echo "🐳 DOCKER REMOTO (após recarregar terminal):"
echo "  docker-connect <IP_WINDOWS>          # Conectar ao Windows"
echo "  docker-disconnect                    # Desconectar"
echo "  docker-where                         # Ver onde está conectado"
echo ""
echo "🎯 GERENCIAMENTO DO PROJETO:"
echo "  reistech                             # Menu interativo"
echo "  reistech-init                        # Iniciar projeto"
echo "  reistech-status                      # Ver status"
echo ""
echo "📊 MONITORAMENTO:"
echo "  dhealth                              # Verificar saúde"
echo "  dlogs                                # Ver todos os logs"
echo "  dlog-backend                         # Logs do backend"
echo "  dlog-frontend                        # Logs do frontend"
echo ""
echo "🔧 DOCKER COMPOSE:"
echo "  dup                                  # docker-compose up -d"
echo "  ddown                                # docker-compose down"
echo "  drestart                             # docker-compose restart"
echo "  dps                                  # listar containers"
echo ""

echo "=================================================="
echo "🎉 PREPARAÇÃO CONCLUÍDA COM SUCESSO!"
echo "=================================================="
echo ""
echo "📁 ARQUIVOS CRIADOS:"
echo "  ✅ scripts/limpar-macbook.sh"
echo "  ✅ scripts/backup-projeto.sh"
echo "  ✅ scripts/testar-conexao-windows.sh"
echo "  ✅ scripts/aliases-reistech.sh"
echo "  ✅ MIGRATION_GUIDE.md"
echo ""
echo "🔄 PRÓXIMOS PASSOS:"
echo ""
echo "1. Recarregar terminal:"
echo "   source ~/.zshrc"
echo ""
echo "2. Configurar Windows seguindo MIGRATION_GUIDE.md"
echo ""
echo "3. Testar conexão:"
echo "   ./scripts/testar-conexao-windows.sh"
echo ""
echo "4. Transferir projeto para Windows:"
echo "   • Via backup: ~/backups/reistech/"
echo "   • Via Git: git push/pull"
echo "   • Via SCP: scp -r ..."
echo ""
echo "5. No Windows, iniciar projeto:"
echo "   docker-compose up -d"
echo "   docker-compose exec backend npm run migrate up"
echo "   docker-compose exec backend npm run seed"
echo ""
echo "6. Ou do MacBook (conectado ao Windows):"
echo "   docker-connect <IP_WINDOWS>"
echo "   reistech-init"
echo ""
echo "=================================================="
echo "✅ PRONTO PARA MIGRAÇÃO WINDOWS!"
echo "=================================================="
echo ""
echo "💡 DICA: Execute 'reistech' para abrir o menu interativo"
echo "📖 AJUDA: Consulte MIGRATION_GUIDE.md para detalhes completos"
