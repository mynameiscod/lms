#!/bin/bash
# Blue/Green zero-downtime deployment script
# Usage: ./deploy.sh [version]
set -euo pipefail

cd /root/lms

ACTIVE_FILE="/root/lms/.active-slot"
ACTIVE=$(cat "$ACTIVE_FILE" 2>/dev/null || echo "none")
APP_VERSION="${1:-$(cat VERSION 2>/dev/null || echo "1.1.0")}"
BUILD_DATE=$(date +%Y-%m-%d)

# ── Determine which slot to deploy to ────────────────────────────────────────
if [ "$ACTIVE" = "blue" ]; then
  NEW="green"; NEW_PORT=5002; OLD="blue"
else
  NEW="blue";  NEW_PORT=5001; OLD="green"
fi

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║        Blue/Green Deployment — LMS SaaS              ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  Current active : $ACTIVE"
echo "║  Deploying to   : $NEW (port $NEW_PORT)"
echo "║  Version        : $APP_VERSION ($BUILD_DATE)"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── Build new image ──────────────────────────────────────────────────────────
echo "==> [1/4] Building server-$NEW..."
docker-compose build \
  --build-arg BUILD_DATE="$BUILD_DATE" \
  --build-arg APP_VERSION="$APP_VERSION" \
  server-$NEW

# ── Start new slot ───────────────────────────────────────────────────────────
echo ""
echo "==> [2/4] Starting server-$NEW..."
docker-compose up -d --no-deps server-$NEW

# ── Health check ─────────────────────────────────────────────────────────────
echo ""
echo "==> [3/4] Health checking server-$NEW on port $NEW_PORT..."
HEALTHY=false
for i in $(seq 1 30); do
  sleep 3
  if curl -sf "http://127.0.0.1:$NEW_PORT/api/health" >/dev/null 2>&1; then
    HEALTHY=true
    echo "   ✅ Healthy after $((i * 3))s"
    break
  fi
  echo "   ... waiting (attempt $i/30)"
done

if [ "$HEALTHY" = "false" ]; then
  echo ""
  echo "❌ Health check failed after 90s. Rolling back."
  docker-compose stop server-$NEW 2>/dev/null || true
  exit 1
fi

# ── Switch nginx to new slot ─────────────────────────────────────────────────
echo ""
echo "==> [4/4] Switching nginx upstream to port $NEW_PORT..."
echo "server 127.0.0.1:$NEW_PORT;" > /etc/nginx/active-slot.conf

if nginx -t 2>/dev/null; then
  nginx -s reload
  echo "   ✅ Nginx reloaded → port $NEW_PORT"
else
  echo "   ❌ Nginx config test failed — check /etc/nginx/active-slot.conf"
  docker-compose stop server-$NEW 2>/dev/null || true
  exit 1
fi

# ── Save active slot and stop old ────────────────────────────────────────────
echo "$NEW" > "$ACTIVE_FILE"

if [ "$ACTIVE" != "none" ]; then
  echo ""
  echo "==> Stopping old slot: server-$OLD..."
  docker-compose stop server-$OLD 2>/dev/null || true
  echo "   ✅ server-$OLD stopped"
fi

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  ✅ Deployment complete!                              ║"
echo "║  Active slot : $NEW (port $NEW_PORT)                  ║"
echo "║  Version     : $APP_VERSION                           ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
