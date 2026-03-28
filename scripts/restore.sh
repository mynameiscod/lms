#!/bin/bash
# ============================================
# LMS SaaS - Restore from Backup
# ============================================
# Usage: ./restore.sh [TIMESTAMP]
# Example: ./restore.sh 20260328_150000
# ============================================

set -e

BACKUP_DIR="/root/lms-backups"
APP_DIR="/root/lms"

# Get timestamp
TIMESTAMP="$1"

if [ -z "$TIMESTAMP" ]; then
    echo ""
    echo "Usage: ./restore.sh <TIMESTAMP>"
    echo ""
    echo "Available backups:"
    ls -lt "$BACKUP_DIR"/db_*.tar.gz 2>/dev/null | head -10 | awk '{print "  " $NF}' | sed 's|.*/db_||' | sed 's|.tar.gz||'
    echo ""
    exit 1
fi

echo ""
echo "========================================="
echo "  LMS Restore - $TIMESTAMP"
echo "========================================="
echo ""

# Check backup exists
if [ ! -f "$BACKUP_DIR/db_$TIMESTAMP.tar.gz" ]; then
    echo "❌ Backup not found: db_$TIMESTAMP.tar.gz"
    exit 1
fi

read -p "⚠️  This will restore database and code. Continue? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Cancelled."
    exit 0
fi

cd "$APP_DIR"

# Step 1: Restore code
echo "🔄 Step 1: Restoring code..."
if [ -f "$BACKUP_DIR/commit_$TIMESTAMP" ]; then
    COMMIT=$(cat "$BACKUP_DIR/commit_$TIMESTAMP")
    git fetch origin
    git reset --hard "$COMMIT" 2>/dev/null || git reset --hard HEAD~1
    echo "   ✅ Code restored to: $COMMIT"
fi

# Step 2: Restore .env
echo "🔄 Step 2: Restoring .env..."
if [ -f "$BACKUP_DIR/env_$TIMESTAMP" ]; then
    cp "$BACKUP_DIR/env_$TIMESTAMP" "server/.env"
    echo "   ✅ .env restored"
fi

# Step 3: Restore database
echo "🔄 Step 3: Restoring database..."
cd "$BACKUP_DIR"
tar -xzf "db_$TIMESTAMP.tar.gz"

docker cp "db_$TIMESTAMP" lms-mongodb:/data/restore
docker exec lms-mongodb mongorestore \
    --uri="mongodb://admin:password123@localhost:27017/?authSource=admin" \
    --drop \
    --gzip \
    /data/restore/lms-saas 2>/dev/null || true

docker exec lms-mongodb rm -rf /data/restore
rm -rf "db_$TIMESTAMP"
echo "   ✅ Database restored"

# Step 4: Rebuild
echo "🔄 Step 4: Rebuilding..."
cd "$APP_DIR"
docker-compose down --timeout 30
docker-compose build
docker-compose up -d

echo ""
echo "========================================="
echo "  ✅ Restore Complete!"
echo "========================================="
echo ""
