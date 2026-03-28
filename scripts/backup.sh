#!/bin/bash
# 📦 LMS SaaS Backup Script
# Automated backup for MongoDB and application files

set -e

# Configuration
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}
MONGO_HOST=${MONGO_HOST:-mongodb}
MONGO_PORT=${MONGO_PORT:-27017}
MONGO_USER=${MONGO_USER:-lms_user}
MONGO_PASSWORD=${MONGO_PASSWORD}
DB_NAME=${DB_NAME:-lms_saas}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅${NC} $1"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌${NC} $1"
}

# Create backup directories
mkdir -p "$BACKUP_DIR/mongodb"
mkdir -p "$BACKUP_DIR/uploads"
mkdir -p "$BACKUP_DIR/logs"

log "🚀 Starting backup process..."

# MongoDB Backup
log "📊 Backing up MongoDB database: $DB_NAME"
if mongodump --host "$MONGO_HOST:$MONGO_PORT" \
             --username "$MONGO_USER" \
             --password "$MONGO_PASSWORD" \
             --authenticationDatabase "$DB_NAME" \
             --db "$DB_NAME" \
             --out "$BACKUP_DIR/mongodb/db_$DATE"; then
    success "MongoDB backup completed"
    
    # Compress the backup
    if tar -czf "$BACKUP_DIR/mongodb/db_$DATE.tar.gz" -C "$BACKUP_DIR/mongodb" "db_$DATE"; then
        rm -rf "$BACKUP_DIR/mongodb/db_$DATE"
        success "MongoDB backup compressed: db_$DATE.tar.gz"
    else
        warning "Failed to compress MongoDB backup"
    fi
else
    error "MongoDB backup failed"
    exit 1
fi

# Application Files Backup
log "📁 Backing up uploaded files..."
if [ -d "/data/uploads" ]; then
    if tar -czf "$BACKUP_DIR/uploads/uploads_$DATE.tar.gz" -C "/data" uploads; then
        success "Uploads backup completed: uploads_$DATE.tar.gz"
    else
        warning "Failed to backup uploads"
    fi
else
    warning "No uploads directory found, skipping"
fi

# Application Logs Backup
log "📝 Backing up application logs..."
if [ -d "/data/logs" ]; then
    if tar -czf "$BACKUP_DIR/logs/logs_$DATE.tar.gz" -C "/data" logs; then
        success "Logs backup completed: logs_$DATE.tar.gz"
    else
        warning "Failed to backup logs"
    fi
else
    warning "No logs directory found, skipping"
fi

# Database Statistics
log "📈 Collecting database statistics..."
if mongo --host "$MONGO_HOST:$MONGO_PORT" \
         --username "$MONGO_USER" \
         --password "$MONGO_PASSWORD" \
         --authenticationDatabase "$DB_NAME" \
         "$DB_NAME" --eval "db.stats()" > "$BACKUP_DIR/db_stats_$DATE.json"; then
    success "Database statistics saved"
fi

# Collection counts
if mongo --host "$MONGO_HOST:$MONGO_PORT" \
         --username "$MONGO_USER" \
         --password "$MONGO_PASSWORD" \
         --authenticationDatabase "$DB_NAME" \
         "$DB_NAME" --eval "
         printjson({
             timestamp: new Date(),
             collections: {
                 users: db.users.countDocuments(),
                 tenants: db.tenants.countDocuments(),
                 content: db.content.countDocuments(),
                 quizzes: db.quizzes.countDocuments(),
                 quizattempts: db.quizattempts.countDocuments(),
                 attendance: db.attendance.countDocuments(),
                 invitations: db.invitations.countDocuments(),
                 auditlogs: db.auditlogs.countDocuments()
             }
         })
         " > "$BACKUP_DIR/collection_counts_$DATE.json"; then
    success "Collection counts saved"
fi

# Cleanup old backups
log "🧹 Cleaning up old backups (retention: $RETENTION_DAYS days)"
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.json" -mtime +$RETENTION_DAYS -delete

# Backup summary
BACKUP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
MONGODB_FILES=$(find "$BACKUP_DIR/mongodb" -name "*.tar.gz" | wc -l)
UPLOAD_FILES=$(find "$BACKUP_DIR/uploads" -name "*.tar.gz" | wc -l)
LOG_FILES=$(find "$BACKUP_DIR/logs" -name "*.tar.gz" | wc -l)

log "📊 Backup Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Timestamp: $DATE"
echo "Total backup size: $BACKUP_SIZE"
echo "MongoDB backups: $MONGODB_FILES files"
echo "Upload backups: $UPLOAD_FILES files"
echo "Log backups: $LOG_FILES files"
echo "Retention policy: $RETENTION_DAYS days"
echo "Backup location: $BACKUP_DIR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

success "🎉 Backup process completed successfully!"

# Optional: Send notification (uncomment if you want to use)
# curl -X POST "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK" \
#      -H 'Content-type: application/json' \
#      --data "{\"text\":\"✅ LMS SaaS backup completed: $DATE (Size: $BACKUP_SIZE)\"}"