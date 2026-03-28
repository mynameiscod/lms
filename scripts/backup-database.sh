#!/bin/bash
# ============================================
# MongoDB Backup Script
# ============================================
# Automatically backs up MongoDB before deployments
# and on a scheduled basis
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BACKUP_DIR="/root/lms-backups/database"
MAX_BACKUPS=10
MONGO_CONTAINER="lms-mongodb"
MONGO_USER="admin"
MONGO_PASSWORD="${MONGO_PASSWORD:-password123}"
DATABASE_NAME="lms-saas"

log() { echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }

# Create backup directory
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="mongodb_backup_$TIMESTAMP"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"

echo ""
echo "╔════════════════════════════════════════╗"
echo "║      MongoDB Database Backup           ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Check if MongoDB container is running
if ! docker ps | grep -q "$MONGO_CONTAINER"; then
    error "MongoDB container ($MONGO_CONTAINER) is not running!"
    exit 1
fi

log "Starting database backup..."
log "Backup location: $BACKUP_PATH"

# Create backup inside container
docker exec "$MONGO_CONTAINER" mongodump \
    --uri="mongodb://$MONGO_USER:$MONGO_PASSWORD@localhost:27017/$DATABASE_NAME?authSource=admin" \
    --out="/data/backup_$TIMESTAMP" \
    --gzip

# Copy backup from container to host
docker cp "$MONGO_CONTAINER:/data/backup_$TIMESTAMP" "$BACKUP_PATH"

# Remove backup from container
docker exec "$MONGO_CONTAINER" rm -rf "/data/backup_$TIMESTAMP"

# Create a compressed archive
cd "$BACKUP_DIR"
tar -czvf "$BACKUP_NAME.tar.gz" "$BACKUP_NAME"
rm -rf "$BACKUP_NAME"

# Calculate backup size
BACKUP_SIZE=$(du -h "$BACKUP_NAME.tar.gz" | cut -f1)

# Save backup metadata
cat > "$BACKUP_DIR/$BACKUP_NAME.meta" << EOF
timestamp=$TIMESTAMP
date=$(date)
size=$BACKUP_SIZE
database=$DATABASE_NAME
container=$MONGO_CONTAINER
EOF

# Update latest symlink
ln -sf "$BACKUP_NAME.tar.gz" "$BACKUP_DIR/latest.tar.gz"
echo "$BACKUP_NAME" > "$BACKUP_DIR/latest"

# Clean old backups (keep only MAX_BACKUPS)
cd "$BACKUP_DIR"
ls -t *.tar.gz 2>/dev/null | tail -n +$((MAX_BACKUPS + 1)) | xargs -r rm -f
ls -t *.meta 2>/dev/null | tail -n +$((MAX_BACKUPS + 1)) | xargs -r rm -f

# List recent backups
echo ""
log "Recent backups:"
ls -lh "$BACKUP_DIR"/*.tar.gz 2>/dev/null | tail -5

echo ""
success "Backup completed: $BACKUP_NAME.tar.gz ($BACKUP_SIZE)"
echo ""
echo "To restore this backup:"
echo "  ./scripts/restore-database.sh $BACKUP_NAME"
echo ""
