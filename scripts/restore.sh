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

# Credentials come from the compose env file, never hardcoded (see backup.sh).
if [ -f "$APP_DIR/.env" ]; then
    set -a; . "$APP_DIR/.env"; set +a
fi
: "${MONGO_ROOT_USERNAME:?MONGO_ROOT_USERNAME not set — is $APP_DIR/.env present?}"
: "${MONGO_ROOT_PASSWORD:?MONGO_ROOT_PASSWORD not set — is $APP_DIR/.env present?}"

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

# `--db lms-saas` is REQUIRED and the output must NOT be discarded.
#
# This previously ran `mongorestore ... /data/restore/lms-saas` with no --db and
# with `2>/dev/null || true`. Pointed at a directory of .bson.gz files without
# being told the database name, current mongorestore prints "don't know what to
# do with file ..., skipping" for every collection, restores 0 documents, and
# still EXITS 0. With stderr discarded, this script then printed
# "✅ Database restored" over an empty database — verified reproducible.
# A restore that cannot fail loudly is not a backup system.
if ! docker exec -e MONGO_ROOT_USERNAME -e MONGO_ROOT_PASSWORD lms-mongodb sh -c \
    'mongorestore --uri="mongodb://$MONGO_ROOT_USERNAME:$MONGO_ROOT_PASSWORD@localhost:27017/?authSource=admin" --drop --gzip --db lms-saas /data/restore/lms-saas'; then
    echo "   ❌ mongorestore failed — the database was NOT restored." >&2
    exit 1
fi

# Trust nothing: count what actually landed.
RESTORED=$(docker exec -e MONGO_ROOT_USERNAME -e MONGO_ROOT_PASSWORD lms-mongodb sh -c \
    'mongosh --quiet -u "$MONGO_ROOT_USERNAME" -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin lms-saas \
     --eval "db.getCollectionNames().length"' | tr -dc '0-9')
if [ -z "$RESTORED" ] || [ "$RESTORED" -eq 0 ]; then
    echo "   ❌ Restore reported success but lms-saas has 0 collections. NOT restored." >&2
    exit 1
fi

docker exec lms-mongodb rm -rf /data/restore
rm -rf "db_$TIMESTAMP"
echo "   ✅ Database restored ($RESTORED collections)"

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
