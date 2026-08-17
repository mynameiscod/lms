#!/bin/bash
# ============================================
# LMS SaaS - Backup Script
# ============================================
# Creates a backup of database and .env
# Usage: ./backup.sh
# ============================================

set -e

APP_DIR="/root/lms"
BACKUP_DIR="/root/lms-backups"
# A caller may pin the timestamp so it can find the archive this run produces.
# deploy.sh does exactly that: it has to name the rollback point in its own output,
# and picking "the newest file afterwards" would be a guess.
TIMESTAMP="${TIMESTAMP:-$(date +%Y%m%d_%H%M%S)}"

# Credentials come from the compose env file, never hardcoded. This script used
# to carry admin:password123 inline, so the DB password was readable in git and
# in `ps` output for anyone on the box.
if [ -f "$APP_DIR/.env" ]; then
    set -a; . "$APP_DIR/.env"; set +a
fi
: "${MONGO_ROOT_USERNAME:?MONGO_ROOT_USERNAME not set — is $APP_DIR/.env present?}"
: "${MONGO_ROOT_PASSWORD:?MONGO_ROOT_PASSWORD not set — is $APP_DIR/.env present?}"

echo ""
echo "========================================="
echo "  LMS Backup - $(date)"
echo "========================================="
echo ""

mkdir -p "$BACKUP_DIR"

# Backup database
echo "📦 Backing up database..."
if docker ps | grep -q "lms-mongodb"; then
    # The credentials are passed as env vars into the container rather than
    # interpolated into the command line, so they do not show up in `ps`.
    # Errors are NOT discarded here. A backup that fails quietly is worse than no
    # backup, because you only discover it during a restore — which is the one
    # moment you cannot afford to.
    docker exec lms-mongodb rm -rf /data/backup 2>/dev/null || true
    if ! docker exec -e MONGO_ROOT_USERNAME -e MONGO_ROOT_PASSWORD lms-mongodb sh -c \
        'mongodump --uri="mongodb://$MONGO_ROOT_USERNAME:$MONGO_ROOT_PASSWORD@localhost:27017/lms-saas?authSource=admin" --out=/data/backup --gzip'; then
        echo "   ❌ mongodump FAILED — no database backup was written." >&2
        exit 1
    fi

    docker cp lms-mongodb:/data/backup "$BACKUP_DIR/db_$TIMESTAMP"
    docker exec lms-mongodb rm -rf /data/backup 2>/dev/null || true

    # mongodump can exit 0 having written an empty tree (wrong db name, no perms).
    # Require actual collection files before calling this a backup.
    COLLS=$(find "$BACKUP_DIR/db_$TIMESTAMP" -name '*.bson.gz' 2>/dev/null | wc -l)
    if [ "$COLLS" -eq 0 ]; then
        echo "   ❌ Dump contains 0 collections — refusing to call this a backup." >&2
        rm -rf "$BACKUP_DIR/db_$TIMESTAMP"
        exit 1
    fi

    tar -czf "$BACKUP_DIR/db_$TIMESTAMP.tar.gz" -C "$BACKUP_DIR" "db_$TIMESTAMP"
    rm -rf "$BACKUP_DIR/db_$TIMESTAMP"
    echo "   ✅ Database: db_$TIMESTAMP.tar.gz ($COLLS collections)"
else
    echo "   ⚠️ MongoDB not running"
fi

# Backup .env
echo "📦 Backing up .env..."
if [ -f "$APP_DIR/server/.env" ]; then
    cp "$APP_DIR/server/.env" "$BACKUP_DIR/env_$TIMESTAMP"
    echo "   ✅ .env: env_$TIMESTAMP"
fi

# Save current commit
echo "📦 Saving commit..."
cd "$APP_DIR"
COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
echo "$COMMIT" > "$BACKUP_DIR/commit_$TIMESTAMP"
echo "   ✅ Commit: $COMMIT"

# Cleanup old backups (keep last 10)
cd "$BACKUP_DIR"
ls -t db_*.tar.gz 2>/dev/null | tail -n +11 | xargs -r rm -f
ls -t env_* 2>/dev/null | tail -n +11 | xargs -r rm -f
ls -t commit_* 2>/dev/null | tail -n +11 | xargs -r rm -f

echo ""
echo "========================================="
echo "  ✅ Backup Complete!"
echo "========================================="
echo ""
echo "  Location: $BACKUP_DIR"
echo "  Timestamp: $TIMESTAMP"
echo ""
echo "  To restore: ./scripts/restore.sh $TIMESTAMP"
echo ""

# List recent backups
echo "Recent backups:"
ls -lt "$BACKUP_DIR"/db_*.tar.gz 2>/dev/null | head -5 | awk '{print "  " $NF}'
