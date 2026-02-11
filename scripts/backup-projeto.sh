#!/bin/bash

# Configurações
PROJECT_NAME="reistech"
BACKUP_ROOT="$HOME/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$BACKUP_ROOT/$PROJECT_NAME/$TIMESTAMP"

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}💾 BACKUP COMPLETO DO PROJETO${NC}"
echo -e "${BLUE}========================================${NC}"

# Criar diretório de backup
mkdir -p "$BACKUP_DIR"
echo -e "${GREEN}✅ Diretório de backup criado:${NC}"
echo -e "  $BACKUP_DIR"

# 1. Backup do código fonte
echo -e "\n${YELLOW}1. BACKUP DO CÓDIGO FONTE...${NC}"
tar -czf "$BACKUP_DIR/code.tar.gz" \
  --exclude="node_modules" \
  --exclude=".git" \
  --exclude="dist" \
  --exclude="build" \
  --exclude=".next" \
  --exclude="coverage" \
  --exclude="logs" \
  --exclude="whatsapp-sessions" \
  --exclude="uploads" \
  .

CODE_SIZE=$(du -h "$BACKUP_DIR/code.tar.gz" | cut -f1)
echo -e "  ✅ Código fonte: $CODE_SIZE"

# 2. Backup do banco de dados (se estiver rodando)
echo -e "\n${YELLOW}2. BACKUP DO BANCO DE DADOS...${NC}"
DB_SIZE="0K"
if docker ps 2>/dev/null | grep -q "postgres"; then
  POSTGRES_CONTAINER=$(docker ps --format "{{.Names}}" | grep postgres | head -1)
  if [ -n "$POSTGRES_CONTAINER" ]; then
    docker exec "$POSTGRES_CONTAINER" pg_dumpall -U reistechuser > "$BACKUP_DIR/database_full.sql" 2>/dev/null
    if [ -f "$BACKUP_DIR/database_full.sql" ]; then
      DB_SIZE=$(du -h "$BACKUP_DIR/database_full.sql" 2>/dev/null | cut -f1 || echo "0K")
      echo -e "  ✅ Banco de dados: $DB_SIZE"
    else
      echo -e "  ⚠️  Falha ao fazer backup do banco"
    fi
  else
    echo -e "  ℹ️  Container PostgreSQL não encontrado"
  fi
else
  echo -e "  ℹ️  Banco de dados não está rodando"
fi

# 3. Backup de configurações Docker
echo -e "\n${YELLOW}3. BACKUP DE CONFIGURAÇÕES...${NC}"
cp docker-compose.yml "$BACKUP_DIR/" 2>/dev/null && echo "  ✅ docker-compose.yml" || true
cp docker-compose.prod.yml "$BACKUP_DIR/" 2>/dev/null && echo "  ✅ docker-compose.prod.yml" || true
cp .env "$BACKUP_DIR/env.backup" 2>/dev/null && echo "  ✅ .env (como env.backup)" || echo "  ⚠️  .env não encontrado"
cp -r .vscode "$BACKUP_DIR/" 2>/dev/null && echo "  ✅ .vscode/" || true
cp README.md "$BACKUP_DIR/" 2>/dev/null && echo "  ✅ README.md" || true

# 4. Backup de uploads (se existir)
echo -e "\n${YELLOW}4. BACKUP DE UPLOADS...${NC}"
UPLOADS_SIZE="0K"
if [ -d "backend/uploads" ]; then
  tar -czf "$BACKUP_DIR/uploads.tar.gz" backend/uploads/ 2>/dev/null
  UPLOADS_SIZE=$(du -h "$BACKUP_DIR/uploads.tar.gz" 2>/dev/null | cut -f1 || echo "0K")
  echo -e "  ✅ Uploads: $UPLOADS_SIZE"
else
  echo -e "  ℹ️  Diretório uploads não encontrado"
fi

# 5. Criar relatório do backup
echo -e "\n${YELLOW}5. CRIANDO RELATÓRIO...${NC}"
cat > "$BACKUP_DIR/backup_report.md" << REPORTEOF
# Relatório de Backup - $PROJECT_NAME
## Data: $(date)

## 📊 RESUMO DO BACKUP
- **Data/Hora:** $(date)
- **Projeto:** $PROJECT_NAME
- **Diretório:** $BACKUP_DIR

## 📁 CONTEÚDO DO BACKUP
1. **Código Fonte:** code.tar.gz ($CODE_SIZE)
2. **Banco de Dados:** database_full.sql ($DB_SIZE)
3. **Configurações:** docker-compose.yml, env.backup, .vscode/
4. **Uploads:** uploads.tar.gz ($UPLOADS_SIZE)

## 🔧 COMANDOS PARA RESTAURAÇÃO

### Restaurar código:
\`\`\`bash
tar -xzf $BACKUP_DIR/code.tar.gz -C /novo/diretorio
\`\`\`

### Restaurar banco de dados:
\`\`\`bash
# Iniciar PostgreSQL
docker-compose up -d postgres

# Aguardar inicialização
sleep 10

# Restaurar backup
docker exec -i <container-postgres> psql -U reistechuser < $BACKUP_DIR/database_full.sql
\`\`\`

### Restaurar uploads:
\`\`\`bash
tar -xzf $BACKUP_DIR/uploads.tar.gz -C backend/
\`\`\`

## 📝 NOTAS
- Backup criado automaticamente pelo script backup-projeto.sh
- Verifique a integridade dos arquivos antes da restauração
- Para migração Windows, transfira toda a pasta de backup

## 🔐 INFORMAÇÕES DE ACESSO (verificar no .env)
- **PostgreSQL:** Verificar DATABASE_URL no env.backup
- **Redis:** Verificar REDIS_URL no env.backup
- **Portas:** 5173 (frontend), 3001 (backend), 5432 (postgres)
REPORTEOF

# 6. Calcular tamanho total
echo -e "\n${YELLOW}6. RESUMO FINAL...${NC}"
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ BACKUP CONCLUÍDO COM SUCESSO!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "📦 Tamanho total: $TOTAL_SIZE"
echo -e "📁 Local: $BACKUP_DIR"
echo -e ""
echo -e "${YELLOW}📋 CONTEÚDO DO BACKUP:${NC}"
ls -lh "$BACKUP_DIR"

# 7. Limpeza de backups antigos (mantém últimos 7 dias)
echo -e "\n${YELLOW}7. LIMPEZA DE BACKUPS ANTIGOS...${NC}"
find "$BACKUP_ROOT/$PROJECT_NAME" -type d -mtime +7 -exec rm -rf {} \; 2>/dev/null || true
echo -e "  ✅ Backups com mais de 7 dias removidos"

# 8. Copiar para diretório de migração Windows (opcional)
echo -e "\n${YELLOW}8. PREPARANDO PARA MIGRAÇÃO...${NC}"
read -p "Deseja copiar para diretório de migração Windows? (s/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
  MIGRATION_DIR="/Volumes/WindowsShare/backups_reistech"
  if [ -d "$MIGRATION_DIR" ]; then
    cp -r "$BACKUP_DIR" "$MIGRATION_DIR/"
    echo -e "  ✅ Backup copiado para Windows: $MIGRATION_DIR"
  else
    echo -e "  ℹ️  Diretório Windows não montado: $MIGRATION_DIR"
    echo -e "  📌 Para transferir manualmente:"
    echo -e "     scp -r $BACKUP_DIR usuario@windows_ip:/c/backups/"
  fi
fi

echo -e "\n${BLUE}🔗 LINKS ÚTEIS:${NC}"
echo -e "  Relatório: $BACKUP_DIR/backup_report.md"
echo -e "  Comando: cat $BACKUP_DIR/backup_report.md"
echo -e ""
echo -e "${GREEN}🎉 PRONTO PARA MIGRAÇÃO!${NC}"
