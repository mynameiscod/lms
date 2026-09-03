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

# ── Pick the image the version argument actually names ───────────────────────
# THE TRAP THIS CLOSES. The version was only ever stamped as APP_VERSION metadata
# while the image deployed was hardcoded to lms-server:latest. Ship
# lms-server:my-fix, run ./deploy-image.sh my-fix, and the script cheerfully
# reports "Version: my-fix" while flipping slots onto whatever stale :latest was
# left on the box from a previous deploy — a green health check, a clean nginx
# switch, and none of the code you just shipped. It is silent by construction:
# every line of output is truthful except the one that matters.
#
# Now the tag is looked up first, and :latest is only the fallback for a bare
# invocation with no argument.
IMAGE="lms-server:$APP_VERSION"
if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
  if [ -n "${1:-}" ]; then
    echo "❌ Image '$IMAGE' not found on this box. Ship it first:"
    echo "   docker save $IMAGE | gzip > img.tgz && scp img.tgz <vps>:/root/lms/"
    echo "   ssh <vps> 'gunzip -c /root/lms/img.tgz | docker load'"
    echo ""
    echo "   Refusing to fall back to lms-server:latest — that would deploy"
    echo "   whatever happens to be on the box and call it '$APP_VERSION'."
    exit 1
  fi
  IMAGE="lms-server:latest"
  if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
    echo "❌ Prebuilt image 'lms-server:latest' not found. Ship it first:"
    echo "   docker save lms-server:latest | gzip | ssh <vps> 'gunzip | docker load'"
    exit 1
  fi
fi

# The digest is printed so the deploy log carries proof of WHAT shipped, not just
# a version string somebody typed. Compare it against the image you built.
echo "==> Deploying image : $IMAGE"
echo "==> Image digest    : $(docker images --no-trunc -q "$IMAGE")"

# ── Tag the prebuilt image as the target slot's compose image ────────────────
echo "==> [1/4] Tagging $IMAGE → lms-server-$NEW:latest ..."
docker tag "$IMAGE" "lms-server-$NEW:latest"

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

# ── Prove the running container is the image we meant to ship ────────────────
# A health check only proves SOMETHING is up. It passed just as happily when the
# box was serving a stale image under a new version label, which is how the
# hardcoded-:latest bug above stayed invisible. This compares the container's
# resolved image id against the one we tagged, so a mismatch is loud.
RUNNING=$(docker inspect -f "{{.Image}}" "lms-server-$NEW" 2>/dev/null || echo "")
EXPECTED=$(docker images --no-trunc -q "$IMAGE")
if [ -n "$RUNNING" ] && [ "$RUNNING" != "$EXPECTED" ]; then
  echo "⚠️  WARNING: server-$NEW is running $RUNNING, not the $IMAGE you shipped ($EXPECTED)."
  echo "   The flip has already happened. Investigate before trusting this deploy."
fi

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  ✅ Deployment complete (prebuilt image)!             ║"
echo "║  Active slot : $NEW (port $NEW_PORT)                  ║"
echo "╚══════════════════════════════════════════════════════╝"
echo "   Image  : $IMAGE"
echo "   Digest : $EXPECTED"
echo ""
