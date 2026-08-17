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
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "========================================="
echo "  LMS Deploy - $(date)"
echo "========================================="
echo ""

cd "$APP_DIR"

# Step 1: Backup — database, .env and current commit
#
# THIS DELEGATES TO backup.sh RATHER THAN DUMPING AGAIN.
# It used to run its own mongodump with `admin:password123` hardcoded and
# `2>/dev/null || true` on the end. After the credentials were rotated that dump
# failed authentication on every single deploy, the error went to /dev/null, the
# `|| true` swallowed the exit code, and the success message was inside an
# `if [ -d ... ]` that simply did not fire. So the step printed nothing, changed
# nothing, and the deploy carried on — with no backup and no way to tell.
#
# backup.sh already reads credentials from the compose env file, passes them into
# the container as env vars so they never reach `ps` or a log, fails loudly when
# mongodump fails, and refuses to call a dump with zero collections a backup. One
# implementation, kept correct in one place.
echo "📦 Step 1: Backing up (scripts/backup.sh)..."
mkdir -p "$BACKUP_DIR"

if ! TIMESTAMP="$TIMESTAMP" bash "$SCRIPT_DIR/backup.sh"; then
    echo ""
    echo "❌ Pre-deploy backup FAILED — aborting." >&2
    echo "   Nothing has been changed: no pull, no rebuild, no restart." >&2
    echo "   Fix the backup first. Deploying without one is how you find out the" >&2
    echo "   hard way, during a restore you cannot do." >&2
    exit 1
fi

# backup.sh exits 0 when MongoDB is not running, which is reasonable for a
# scheduled backup and not acceptable here: a deploy with no restorable archive
# has no rollback. Verify the artifact this deploy is about to advertise.
ARCHIVE="$BACKUP_DIR/db_$TIMESTAMP.tar.gz"
if [ ! -s "$ARCHIVE" ]; then
    echo ""
    echo "❌ Expected backup archive is missing or empty: db_$TIMESTAMP.tar.gz" >&2
    echo "   Refusing to deploy without a restorable backup." >&2
    exit 1
fi
echo "   ✅ Backup verified: db_$TIMESTAMP.tar.gz ($(du -h "$ARCHIVE" 2>/dev/null | cut -f1))"

# Step 2: Keep a working copy of .env across the pull
# backup.sh already archived it; this copy is the one restored in Step 5.
echo "📦 Step 2: Holding .env aside..."
if [ -f "server/.env" ]; then
    cp "server/.env" "/tmp/.env.backup"
    echo "   ✅ .env held"
fi

# Step 3: Note the commit to roll back to (backup.sh recorded it alongside the dump)
echo "📦 Step 3: Current commit..."
CURRENT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
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

# Step 6: Ensure nginx allows large uploads (call recordings up to 100 MB)
echo "🔧 Step 6a: Updating nginx upload limit..."
NGINX_SITE=$(ls /etc/nginx/sites-enabled/ 2>/dev/null | head -1)
if [ -n "$NGINX_SITE" ]; then
    SITE_CONF="/etc/nginx/sites-enabled/$NGINX_SITE"
    if ! grep -q 'client_max_body_size' "$SITE_CONF"; then
        # Insert client_max_body_size inside the first server { block
        sed -i 's/server {/server {\n    client_max_body_size 200m;/' "$SITE_CONF"
        echo "   ✅ Added client_max_body_size 200m to $SITE_CONF"
        nginx -t 2>/dev/null && systemctl reload nginx 2>/dev/null || true
    else
        # Update existing value
        sed -i 's/client_max_body_size [^;]*/client_max_body_size 200m/' "$SITE_CONF"
        echo "   ✅ Updated client_max_body_size to 200m in $SITE_CONF"
        nginx -t 2>/dev/null && systemctl reload nginx 2>/dev/null || true
    fi
else
    echo "   ℹ️  No nginx sites-enabled found, skipping (nginx may not be on this host)"
fi

# Step 6: Rebuild and restart
echo "🚀 Step 6b: Rebuilding containers..."
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

# Rotation is backup.sh's job now, and it already ran in Step 1. A second copy
# here would be one more thing to keep in step with the first.
