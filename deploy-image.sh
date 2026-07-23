#!/bin/bash
# Blue/Green flip using a PREBUILT image (no build on this box).
# The image `lms-server:latest` must already be loaded (shipped from the dev
# machine via `docker save | ssh docker load`). This script just retags it for
# the target slot, starts it, health-checks, and switches nginx — the slow
# React/Docker build happens off-box, so this runs in ~30-60s.
#
# Usage: ./deploy-image.sh [version]
set -euo pipefail
cd /root/lms

ACTIVE_FILE="/root/lms/.active-slot"
ACTIVE=$(cat "$ACTIVE_FILE" 2>/dev/null || echo "none")
APP_VERSION="${1:-$(cat VERSION 2>/dev/null || echo "1.2.0")}"

if [ "$ACTIVE" = "blue" ]; then
  NEW="green"; NEW_PORT=5002; OLD="blue"
else
  NEW="blue";  NEW_PORT=5001; OLD="green"
fi

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║   Blue/Green Deployment (prebuilt image) — LMS SaaS   ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  Current active : $ACTIVE"
echo "║  Deploying to   : $NEW (port $NEW_PORT)"
echo "║  Version        : $APP_VERSION"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── Ensure the prebuilt image is present ─────────────────────────────────────
if ! docker image inspect lms-server:latest >/dev/null 2>&1; then
  echo "❌ Prebuilt image 'lms-server:latest' not found. Ship it first:"
  echo "   docker save lms-server:latest | gzip | ssh <vps> 'gunzip | docker load'"
  exit 1
fi

# ── Tag the prebuilt image as the target slot's compose image ────────────────
echo "==> [1/4] Tagging prebuilt image → lms-server-$NEW:latest ..."
docker tag lms-server:latest "lms-server-$NEW:latest"

# ── Start new slot WITHOUT building ──────────────────────────────────────────
echo "==> [2/4] Starting server-$NEW (no build)..."
docker-compose up -d --no-build --no-deps --force-recreate server-$NEW

# ── Health check ─────────────────────────────────────────────────────────────
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
  echo "❌ Health check failed after 90s. Rolling back."
  docker-compose stop server-$NEW 2>/dev/null || true
  exit 1
fi

# ── Switch nginx to new slot ─────────────────────────────────────────────────
echo "==> [4/4] Switching nginx upstream to port $NEW_PORT..."
echo "server 127.0.0.1:$NEW_PORT;" > /etc/nginx/active-slot.conf
if nginx -t 2>/dev/null; then
  nginx -s reload
  echo "   ✅ Nginx reloaded → port $NEW_PORT"
else
  echo "   ❌ Nginx config test failed"
  docker-compose stop server-$NEW 2>/dev/null || true
  exit 1
fi

echo "$NEW" > "$ACTIVE_FILE"

if [ "$ACTIVE" != "none" ]; then
  echo "==> Stopping old slot: server-$OLD..."
  docker-compose stop server-$OLD 2>/dev/null || true
  echo "   ✅ server-$OLD stopped"
fi

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  ✅ Deployment complete (prebuilt image)!             ║"
echo "║  Active slot : $NEW (port $NEW_PORT)                  ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
