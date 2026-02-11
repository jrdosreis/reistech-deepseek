#!/bin/bash
# backend/scripts/backup.sh

set -e

# Configurações
BACKUP_DIR="/backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="reistech"
DB_USER="postgres"
RETENTION_DAYS=7

# Criar diretório de backup
mkdir -p $BACKUP_DIR

# Backup do PostgreSQL
echo "Iniciando backup do banco de dados..."
PGPASSWORD=$DB_PASSWORD pg_dump -U $DB_USER -d $DB_NAME -F c -f $BACKUP_DIR/db_$TIMESTAMP.dump

# Backup das sessões do WhatsApp
echo "Backup das sessões do WhatsApp..."
tar -czf $BACKUP_DIR/whatsapp_$TIMESTAMP.tar.gz -C /app whatsapp-sessions

# Backup dos uploads
echo "Backup dos uploads..."
tar -czf $BACKUP_DIR/uploads_$TIMESTAMP.tar.gz -C /app uploads

# Backup dos logs
echo "Backup dos logs..."
tar -czf $BACKUP_DIR/logs_$TIMESTAMP.tar.gz -C /app logs

# Compactar tudo em um único arquivo
echo "Criando arquivo único..."
tar -czf $BACKUP_DIR/full_backup_$TIMESTAMP.tar.gz -C $BACKUP_DIR \
  db_$TIMESTAMP.dump \
  whatsapp_$TIMESTAMP.tar.gz \
  uploads_$TIMESTAMP.tar.gz \
  logs_$TIMESTAMP.tar.gz

# Remover arquivos temporários
rm -f $BACKUP_DIR/db_$TIMESTAMP.dump \
  $BACKUP_DIR/whatsapp_$TIMESTAMP.tar.gz \
  $BACKUP_DIR/uploads_$TIMESTAMP.tar.gz \
  $BACKUP_DIR/logs_$TIMESTAMP.tar.gz

# Limpar backups antigos
echo "Limpando backups antigos..."
find $BACKUP_DIR -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup concluído: $BACKUP_DIR/full_backup_$TIMESTAMP.tar.gz"

# Opcional: Enviar para S3
if [ -n "$AWS_ACCESS_KEY_ID" ]; then
  echo "Enviando para S3..."
  aws s3 cp $BACKUP_DIR/full_backup_$TIMESTAMP.tar.gz s3://${S3_BUCKET}/backups/
fi