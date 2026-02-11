#!/bin/bash

# ============================================

# BACKUP SCRIPT - REISTECH PLATFORM

# ============================================

# Backup automatizado de:

# - Banco de dados PostgreSQL

# - Arquivos de sessão WhatsApp

# - Uploads de arquivos

# - Configurações

# ============================================

set -e

# Configurações

BACKUP_DIR=”${BACKUP_DIR:-/var/backups/reistech}”
RETENTION_DAYS=”${RETENTION_DAYS:-30}”
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME=“reistech_backup_${TIMESTAMP}”

# Carregar variáveis de ambiente

if [ -f “/var/www/reistech/backend/.env” ]; then
source /var/www/reistech/backend/.env
fi

# Cores

GREEN=’\033[0;32m’
YELLOW=’\033[1;33m’
RED=’\033[0;31m’
NC=’\033[0m’

log_info() {
echo -e “${GREEN}[$(date +’%Y-%m-%d %H:%M:%S’)]${NC} $1”
}

log_warning() {
echo -e “${YELLOW}[$(date +’%Y-%m-%d %H:%M:%S’)]${NC} $1”
}

log_error() {
echo -e “${RED}[$(date +’%Y-%m-%d %H:%M:%S’)]${NC} $1”
}

# Criar diretório de backup

mkdir -p “$BACKUP_DIR”

log_info “Starting backup: $BACKUP_NAME”

# ============ BACKUP DO BANCO DE DADOS ============

log_info “Backing up PostgreSQL database…”

DB_BACKUP_FILE=”$BACKUP_DIR/${BACKUP_NAME}_database.sql.gz”

if command -v pg_dump &> /dev/null; then
PGPASSWORD=$DB_PASSWORD pg_dump   
-h $DB_HOST   
-p $DB_PORT   
-U $DB_USER   
-d $DB_NAME   
–no-owner   
–no-acl   
–clean   
–if-exists   
| gzip > “$DB_BACKUP_FILE”

```
log_info "Database backup completed: $(du -h $DB_BACKUP_FILE | cut -f1)"
```

else
log_error “pg_dump not found. Skipping database backup.”
fi

# ============ BACKUP DE SESSÕES WHATSAPP ============

log_info “Backing up WhatsApp sessions…”

WHATSAPP_BACKUP_FILE=”$BACKUP_DIR/${BACKUP_NAME}_whatsapp.tar.gz”
WHATSAPP_SESSION_PATH=”${WHATSAPP_SESSION_PATH:-/var/whatsapp-sessions}”

if [ -d “$WHATSAPP_SESSION_PATH” ]; then
tar -czf “$WHATSAPP_BACKUP_FILE” -C “$(dirname $WHATSAPP_SESSION_PATH)” “$(basename $WHATSAPP_SESSION_PATH)” 2>/dev/null || true
log_info “WhatsApp sessions backup completed: $(du -h $WHATSAPP_BACKUP_FILE | cut -f1)”
else
log_warning “WhatsApp sessions directory not found. Skipping.”
fi

# ============ BACKUP DE UPLOADS ============

log_info “Backing up user uploads…”

UPLOADS_BACKUP_FILE=”$BACKUP_DIR/${BACKUP_NAME}_uploads.tar.gz”
UPLOAD_DIR=”${UPLOAD_DIR:-/var/uploads/reistech}”

if [ -d “$UPLOAD_DIR” ]; then
tar -czf “$UPLOADS_BACKUP_FILE” -C “$(dirname $UPLOAD_DIR)” “$(basename $UPLOAD_DIR)” 2>/dev/null || true
log_info “Uploads backup completed: $(du -h $UPLOADS_BACKUP_FILE | cut -f1)”
else
log_warning “Uploads directory not found. Skipping.”
fi

# ============ BACKUP DE CONFIGURAÇÕES ============

log_info “Backing up configuration files…”

CONFIG_BACKUP_FILE=”$BACKUP_DIR/${BACKUP_NAME}_config.tar.gz”

if [ -d “/var/www/reistech/backend” ]; then
tar -czf “$CONFIG_BACKUP_FILE”   
-C /var/www/reistech/backend   
.env   
ecosystem.config.js   
2>/dev/null || true

```
log_info "Configuration backup completed: $(du -h $CONFIG_BACKUP_FILE | cut -f1)"
```

else
log_warning “Configuration directory not found. Skipping.”
fi

# ============ BACKUP DE LOGS (ÚLTIMOS 7 DIAS) ============

log_info “Backing up recent logs…”

LOGS_BACKUP_FILE=”$BACKUP_DIR/${BACKUP_NAME}_logs.tar.gz”
LOG_DIR=”${LOG_DIR:-/var/log/reistech}”

if [ -d “$LOG_DIR” ]; then
find “$LOG_DIR” -type f -mtime -7 -print0 |   
tar -czf “$LOGS_BACKUP_FILE” –null -T - 2>/dev/null || true

```
log_info "Logs backup completed: $(du -h $LOGS_BACKUP_FILE | cut -f1)"
```

else
log_warning “Logs directory not found. Skipping.”
fi

# ============ CRIAR MANIFEST ============

log_info “Creating backup manifest…”

MANIFEST_FILE=”$BACKUP_DIR/${BACKUP_NAME}_manifest.txt”

# cat > “$MANIFEST_FILE” << EOF
REISTECH PLATFORM BACKUP MANIFEST

Backup Name: $BACKUP_NAME
Date: $(date)
Hostname: $(hostname)
User: $(whoami)

## FILES:

$(ls -lh $BACKUP_DIR/${BACKUP_NAME}_* 2>/dev/null || echo “No files found”)

## DATABASE INFO:

Database: $DB_NAME
Host: $DB_HOST
User: $DB_USER

## DISK USAGE:

$(df -h / | tail -1)

## MEMORY:

$(free -h | grep Mem)

## BACKUP SIZE:

$(du -sh $BACKUP_DIR/${BACKUP_NAME}_* | awk ‘{sum+=$1} END {print sum “ total”}’)

## MD5 CHECKSUMS:

$(md5sum $BACKUP_DIR/${BACKUP_NAME}_* 2>/dev/null || echo “No checksums”)
EOF

log_info “Manifest created: $MANIFEST_FILE”

# ============ COMPACTAR TUDO ============

log_info “Creating final backup archive…”

FINAL_BACKUP=”$BACKUP_DIR/${BACKUP_NAME}.tar.gz”

tar -czf “$FINAL_BACKUP”   
-C “$BACKUP_DIR”   
$(ls $BACKUP_DIR/${BACKUP_NAME}_* | xargs -n1 basename)   
2>/dev/null || true

# Remover arquivos individuais

rm -f $BACKUP_DIR/${BACKUP_NAME}_*

log_info “Final backup created: $(du -h $FINAL_BACKUP | cut -f1)”

# ============ UPLOAD PARA S3 (OPCIONAL) ============

if [ ! -z “$AWS_BACKUP_BUCKET” ] && command -v aws &> /dev/null; then
log_info “Uploading backup to S3…”

```
aws s3 cp "$FINAL_BACKUP" "s3://$AWS_BACKUP_BUCKET/backups/" \
    --storage-class STANDARD_IA \
    --metadata "environment=production,backup-date=$(date -I)"

if [ $? -eq 0 ]; then
    log_info "Backup uploaded to S3 successfully"
else
    log_error "Failed to upload backup to S3"
fi
```

fi

# ============ LIMPEZA DE BACKUPS ANTIGOS ============

log_info “Cleaning up old backups (older than ${RETENTION_DAYS} days)…”

find “$BACKUP_DIR” -name “reistech_backup_*.tar.gz” -type f -mtime +$RETENTION_DAYS -delete

REMAINING_BACKUPS=$(find “$BACKUP_DIR” -name “reistech_backup_*.tar.gz” -type f | wc -l)
log_info “Cleanup completed. Remaining backups: $REMAINING_BACKUPS”

# ============ VERIFICAR INTEGRIDADE ============

log_info “Verifying backup integrity…”

if tar -tzf “$FINAL_BACKUP” > /dev/null 2>&1; then
log_info “Backup integrity check: PASSED ✓”
else
log_error “Backup integrity check: FAILED ✗”
exit 1
fi

# ============ ESTATÍSTICAS FINAIS ============

echo “”
echo “============================================”
echo “BACKUP COMPLETED SUCCESSFULLY”
echo “============================================”
echo “Backup File: $FINAL_BACKUP”
echo “Size: $(du -h $FINAL_BACKUP | cut -f1)”
echo “Location: $BACKUP_DIR”
echo “Retention: $RETENTION_DAYS days”
echo “Total Backups: $REMAINING_BACKUPS”
echo “============================================”
echo “”

# ============ NOTIFICAR (OPCIONAL) ============

# Enviar notificação por email, Slack, etc.

if [ ! -z “$SLACK_WEBHOOK_URL” ]; then
BACKUP_SIZE=$(du -h $FINAL_BACKUP | cut -f1)

```
curl -X POST "$SLACK_WEBHOOK_URL" \
    -H 'Content-Type: application/json' \
    -d "{
        \"text\": \"✅ Backup ReisTech concluído\",
        \"attachments\": [{
            \"color\": \"good\",
            \"fields\": [
                {\"title\": \"Arquivo\", \"value\": \"$BACKUP_NAME.tar.gz\", \"short\": true},
                {\"title\": \"Tamanho\", \"value\": \"$BACKUP_SIZE\", \"short\": true},
                {\"title\": \"Data\", \"value\": \"$(date)\", \"short\": false}
            ]
        }]
    }" \
    > /dev/null 2>&1 || true
```

fi

exit 0