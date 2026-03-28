#!/bin/bash
# ============================================
# LMS SaaS - Simple Deploy Script
# ============================================
# This script:
# 1. Backs up database
# 2. Backs up .env file
# 3. Pulls latest code
# 4. Rebuilds and restarts
# ============================================

set -e

APP_DIR="/root/lms"
BACKUP_DIR="/root/lms-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo ""
echo "========================================="
echo "  LMS Deploy - $(date)"
echo "========================================="
echo ""

cd "$APP_DIR"

# Step 1: Backup database
echo "📦 Step 1: Backing up database..."
mkdir -p "$BACKUP_DIR"

if docker ps | grep -q "lms-mongodb"; then
    docker exec lms-mongodb mongodump \
        --uri="mongodb://admin:password123@localhost:27017/lms-saas?authSource=admin" \
        --out="/data/backup" \
        --gzip 2>/dev/null || true
    
    docker cp lms-mongodb:/data/backup "$BACKUP_DIR/db_$TIMESTAMP" 2>/dev/null || true
    docker exec lms-mongodb rm -rf /data/backup 2>/dev/null || true
    
    if [ -d "$BACKUP_DIR/db_$TIMESTAMP" ]; then
        tar -czf "$BACKUP_DIR/db_$TIMESTAMP.tar.gz" -C "$BACKUP_DIR" "db_$TIMESTAMP"
        rm -rf "$BACKUP_DIR/db_$TIMESTAMP"
        echo "   ✅ Database backed up: db_$TIMESTAMP.tar.gz"
    fi
fi

# Step 2: Backup .env
echo "📦 Step 2: Backing up .env..."
if [ -f "server/.env" ]; then
    cp "server/.env" "$BACKUP_DIR/env_$TIMESTAMP"
    cp "server/.env" "/tmp/.env.backup"
    echo "   ✅ .env backed up"
fi

# Step 3: Save current commit
echo "📦 Step 3: Saving current commit..."
CURRENT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
echo "$CURRENT_COMMIT" > "$BACKUP_DIR/commit_$TIMESTAMP"
echo "   ✅ Commit: $CURRENT_COMMIT"

# Step 4: Pull latest code
echo "🔄 Step 4: Pulling latest code..."
git stash 2>/dev/null || true
git pull origin master
echo "   ✅ Code updated"

# Step 5: Restore .env
echo "🔄 Step 5: Restoring .env..."
if [ -f "/tmp/.env.backup" ]; then
    cp "/tmp/.env.backup" "server/.env"
    echo "   ✅ .env restored"
fi

# Step 6: Rebuild and restart
echo "🚀 Step 6: Rebuilding containers..."
docker-compose down --timeout 30 2>/dev/null || true
docker-compose build --no-cache
docker-compose up -d

# Step 7: Wait and check
echo "⏳ Step 7: Waiting for startup..."
sleep 15

if docker ps | grep -q "lms-server"; then
    echo ""
    echo "========================================="
    echo "  ✅ Deploy Complete!"
    echo "========================================="
    echo ""
    echo "  Backup: $BACKUP_DIR/db_$TIMESTAMP.tar.gz"
    echo "  Previous commit: $CURRENT_COMMIT"
    echo ""
    echo "  To rollback: ./scripts/restore.sh $TIMESTAMP"
    echo ""
else
    echo ""
    echo "❌ Deploy failed! Check logs: docker logs lms-server"
    echo ""
    exit 1
fi

# Cleanup old backups (keep last 10)
cd "$BACKUP_DIR"
ls -t db_*.tar.gz 2>/dev/null | tail -n +11 | xargs -r rm -f
ls -t env_* 2>/dev/null | tail -n +11 | xargs -r rm -f
ls -t commit_* 2>/dev/null | tail -n +11 | xargs -r rm -f
