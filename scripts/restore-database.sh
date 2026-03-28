#!/bin/bash
# ============================================
# MongoDB Restore Script  
# ============================================
# Restores MongoDB from a backup
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
MONGO_CONTAINER="lms-mongodb"
MONGO_USER="admin"
MONGO_PASSWORD="${MONGO_PASSWORD:-password123}"
DATABASE_NAME="lms-saas"

log() { echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }

echo ""
echo "╔════════════════════════════════════════╗"
echo "║      MongoDB Database Restore          ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Check arguments
BACKUP_NAME="$1"

if [ -z "$BACKUP_NAME" ]; then
    echo "Usage: ./restore-database.sh <backup_name>"
    echo ""
    echo "Available backups:"
    ls -lh "$BACKUP_DIR"/*.tar.gz 2>/dev/null || echo "  No backups found"
    echo ""
    echo "Latest backup:"
    cat "$BACKUP_DIR/latest" 2>/dev/null || echo "  None"
    echo ""
    echo "To restore latest:"
    echo "  ./restore-database.sh \$(cat $BACKUP_DIR/latest)"
    exit 1
fi

BACKUP_FILE="$BACKUP_DIR/${BACKUP_NAME}.tar.gz"

if [ ! -f "$BACKUP_FILE" ]; then
    error "Backup file not found: $BACKUP_FILE"
    echo ""
    echo "Available backups:"
    ls -lh "$BACKUP_DIR"/*.tar.gz 2>/dev/null
    exit 1
fi

# Check if MongoDB container is running
if ! docker ps | grep -q "$MONGO_CONTAINER"; then
    error "MongoDB container ($MONGO_CONTAINER) is not running!"
    exit 1
fi

# Confirmation
warn "⚠️  WARNING: This will REPLACE your current database!"
echo ""
echo "Backup to restore: $BACKUP_NAME"
echo "Target database: $DATABASE_NAME"
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

log "Starting database restore..."

# Create temp directory
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

# Extract backup
log "Extracting backup..."
tar -xzf "$BACKUP_FILE"

# Copy to container
log "Copying to container..."
docker cp "$BACKUP_NAME" "$MONGO_CONTAINER:/data/restore_temp"

# Drop existing database and restore
log "Restoring database..."
docker exec "$MONGO_CONTAINER" mongorestore \
    --uri="mongodb://$MONGO_USER:$MONGO_PASSWORD@localhost:27017/?authSource=admin" \
    --drop \
    --gzip \
    "/data/restore_temp/$DATABASE_NAME"

# Cleanup
docker exec "$MONGO_CONTAINER" rm -rf "/data/restore_temp"
rm -rf "$TEMP_DIR"

echo ""
success "Database restored successfully from: $BACKUP_NAME"
echo ""
log "Restarting server to reconnect..."
docker restart lms-server 2>/dev/null || true
echo ""
