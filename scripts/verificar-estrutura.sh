#!/bin/bash

echo "🔍 VERIFICAÇÃO DA ESTRUTURA DO PROJETO REISTECH"
echo "================================================"
echo "Data: $(date)"
echo ""

# Função de verificação
check_item() {
    local item=$1
    local path=$2
    local required=$3
    
    if [ -e "$path" ]; then
        echo "✅ $item: ENCONTRADO"
        return 0
    else
        if [ "$required" = "required" ]; then
            echo "❌ $item: FALTANDO [OBRIGATÓRIO]"
            return 1
        else
            echo "⚠️  $item: FALTANDO [OPCIONAL]"
            return 0
        fi
    fi
}

MISSING_REQUIRED=0

echo "📁 ESTRUTURA DE DIRETÓRIOS:"
echo "---------------------------"
check_item "Diretório backend" "backend" "required" || ((MISSING_REQUIRED++))
check_item "Diretório frontend" "frontend" "required" || ((MISSING_REQUIRED++))
check_item "Diretório scripts" "scripts" "required" || ((MISSING_REQUIRED++))
check_item "Diretório .vscode" ".vscode" "optional"
check_item "Diretório .github" ".github" "optional"

echo ""
echo "📄 ARQUIVOS DE CONFIGURAÇÃO:"
echo "----------------------------"
check_item "docker-compose.yml" "docker-compose.yml" "required" || ((MISSING_REQUIRED++))
check_item "docker-compose.prod.yml" "docker-compose.prod.yml" "optional"
check_item "Arquivo .env" ".env" "optional"
check_item ".env.example" ".env.example" "optional"
check_item "backend/package.json" "backend/package.json" "required" || ((MISSING_REQUIRED++))
check_item "frontend/package.json" "frontend/package.json" "required" || ((MISSING_REQUIRED++))

echo ""
echo "🔧 SCRIPTS DE AUTOMAÇÃO:"
echo "-----------------------"
check_item "limpar-macbook.sh" "scripts/limpar-macbook.sh" "required" || ((MISSING_REQUIRED++))
check_item "backup-projeto.sh" "scripts/backup-projeto.sh" "required" || ((MISSING_REQUIRED++))
check_item "testar-conexao-windows.sh" "scripts/testar-conexao-windows.sh" "required" || ((MISSING_REQUIRED++))
check_item "aliases-reistech.sh" "scripts/aliases-reistech.sh" "required" || ((MISSING_REQUIRED++))
check_item "verificar-estrutura.sh" "scripts/verificar-estrutura.sh" "optional"

echo ""
echo "📚 DOCUMENTAÇÃO:"
echo "---------------"
check_item "Guia de Migração" "MIGRATION_GUIDE.md" "required" || ((MISSING_REQUIRED++))
check_item "Script de Preparação" "PREPARE_FOR_WINDOWS.sh" "required" || ((MISSING_REQUIRED++))
check_item "README do Projeto" "README.md" "optional"
check_item "Especificação Técnica" "reistech_especificacao_tecnica.md" "optional"

echo ""
echo "🐳 VERIFICAÇÃO DOCKER:"
echo "---------------------"
if command -v docker &> /dev/null; then
    echo "✅ Docker CLI: INSTALADO"
    docker --version 2>/dev/null | head -1 || echo "  Versão não disponível"
    
    if docker version &> /dev/null 2>&1; then
        echo "✅ Docker Daemon: CONECTADO"
        
        # Verificar se está conectado ao Windows
        if [ -n "$DOCKER_HOST" ]; then
            echo "📍 Conexão: REMOTA ($DOCKER_HOST)"
        else
            echo "📍 Conexão: LOCAL"
        fi
        
        # Testar docker-compose
        if command -v docker-compose &> /dev/null; then
            echo "✅ Docker Compose: INSTALADO"
            docker-compose --version 2>/dev/null | head -1
        else
            echo "⚠️  Docker Compose: NÃO ENCONTRADO"
        fi
    else
        echo "⚠️  Docker Daemon: NÃO CONECTADO"
        echo "   Execute: docker-connect <IP_WINDOWS>"
    fi
else
    echo "❌ Docker CLI: NÃO INSTALADO"
fi

echo ""
echo "📦 VERIFICAÇÃO DE PACOTES:"
echo "-------------------------"
if [ -f "backend/package.json" ]; then
    echo "📦 BACKEND:"
    if command -v node &> /dev/null; then
        node -e "
        try {
          const pkg = require('./backend/package.json');
          console.log('  Nome:', pkg.name || 'Não definido');
          console.log('  Versão:', pkg.version || 'Não definido');
          const scripts = Object.keys(pkg.scripts || {});
          console.log('  Scripts:', scripts.length > 0 ? scripts.join(', ') : 'Nenhum');
        } catch(e) {
          console.log('  Erro ao ler package.json');
        }
        " 2>/dev/null || echo "  ⚠️  Não foi possível ler package.json"
    else
        echo "  ⚠️  Node.js não instalado - não é possível verificar"
    fi
else
    echo "❌ BACKEND: package.json não encontrado"
fi

if [ -f "frontend/package.json" ]; then
    echo ""
    echo "🌐 FRONTEND:"
    if command -v node &> /dev/null; then
        node -e "
        try {
          const pkg = require('./frontend/package.json');
          console.log('  Nome:', pkg.name || 'Não definido');
          console.log('  Versão:', pkg.version || 'Não definido');
          const deps = pkg.dependencies || {};
          const framework = 
            deps.react ? 'React' :
            deps.vue ? 'Vue' :
            deps.angular ? 'Angular' :
            deps.next ? 'Next.js' :
            'Não identificado';
          console.log('  Framework:', framework);
        } catch(e) {
          console.log('  Erro ao ler package.json');
        }
        " 2>/dev/null || echo "  ⚠️  Não foi possível ler package.json"
    else
        echo "  ⚠️  Node.js não instalado - não é possível verificar"
    fi
else
    echo "❌ FRONTEND: package.json não encontrado"
fi

echo ""
echo "🔌 VERIFICAÇÃO DE PORTAS:"
echo "-------------------------"
PORTS=(3000 3001 5173 5432 6379 9229 5050 2375 80)
PORTS_IN_USE=0
for port in "${PORTS[@]}"; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        SERVICE=$(lsof -Pi :$port -sTCP:LISTEN | tail -1 | awk '{print $1}')
        echo "⚠️  Porta $port: EM USO ($SERVICE)"
        ((PORTS_IN_USE++))
    else
        echo "✅ Porta $port: LIVRE"
    fi
done

echo ""
echo "💾 ESPAÇO EM DISCO:"
echo "------------------"
PROJECT_SIZE=$(du -sh . 2>/dev/null | awk '{print $1}' || echo "N/A")
echo "  Projeto: $PROJECT_SIZE"
DISK_AVAILABLE=$(df -h . 2>/dev/null | tail -1 | awk '{print $4}' || echo "N/A")
echo "  Disponível: $DISK_AVAILABLE"

echo ""
echo "🗂️  BACKUPS EXISTENTES:"
echo "----------------------"
if [ -d "$HOME/backups/reistech" ]; then
    BACKUP_COUNT=$(ls -1 "$HOME/backups/reistech" 2>/dev/null | wc -l)
    echo "  Total de backups: $BACKUP_COUNT"
    if [ $BACKUP_COUNT -gt 0 ]; then
        echo "  Último backup:"
        ls -1t "$HOME/backups/reistech" 2>/dev/null | head -1 | sed 's/^/    /'
    fi
else
    echo "  ⚠️  Nenhum backup encontrado"
    echo "  Execute: ./scripts/backup-projeto.sh"
fi

echo ""
echo "================================================"
echo "📊 RESUMO FINAL"
echo "================================================"
echo ""
echo "  Itens obrigatórios faltando: $MISSING_REQUIRED"
echo "  Portas em uso: $PORTS_IN_USE"
echo "  Tamanho do projeto: $PROJECT_SIZE"
echo ""

if [ $MISSING_REQUIRED -eq 0 ]; then
    echo "🎉 ESTRUTURA VALIDADA COM SUCESSO!"
    echo ""
    echo "✅ O projeto está pronto para migração."
    echo ""
    echo "🚀 PRÓXIMOS PASSOS:"
    echo ""
    echo "1. Fazer backup completo:"
    echo "   ./scripts/backup-projeto.sh"
    echo ""
    echo "2. Limpar ambiente (se necessário):"
    echo "   ./scripts/limpar-macbook.sh"
    echo ""
    echo "3. Executar preparação para Windows:"
    echo "   ./PREPARE_FOR_WINDOWS.sh"
    echo ""
    echo "4. Seguir guia de migração:"
    echo "   cat MIGRATION_GUIDE.md | less"
else
    echo "⚠️  ALGUNS ITENS OBRIGATÓRIOS ESTÃO FALTANDO"
    echo ""
    echo "Execute novamente o script de organização ou"
    echo "verifique os itens marcados como [OBRIGATÓRIO] acima."
fi

echo ""
echo "================================================"
echo "✅ VERIFICAÇÃO CONCLUÍDA"
echo "================================================"
