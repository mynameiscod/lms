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
echo "==> [1/6] Tagging $IMAGE → lms-server-$NEW:latest ..."
docker tag "$IMAGE" "lms-server-$NEW:latest"

# ── Start new slot WITHOUT building ──────────────────────────────────────────
echo "==> [2/6] Starting server-$NEW (no build)..."
docker-compose up -d --no-build --no-deps --force-recreate server-$NEW

# ── Health check ─────────────────────────────────────────────────────────────
echo "==> [3/6] Health checking server-$NEW on port $NEW_PORT..."
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

# ── Publish the static bundle THIS image contains ────────────────────────────
# THE TRAP THIS CLOSES, and it is the worst one on the box.
#
# nginx serves /static/ from /var/www/lms-static/static/ rather than from the
# container, because Node served the bundle at 5,198 B/s against nginx's 3.2 MB/s
# and that was the blank screens on 22 September. But that host directory was
# populated ONCE, by hand, during the incident. Nothing refreshed it.
#
# Every client-side deploy changes the bundle hash. index.html comes from the
# container and asks for the new hash; this directory only has the old one; nginx
# returns 404 and every user gets a blank page. On 24 September two deploys went
# out and did NOT trigger it purely by luck — both were server-side only, so
# webpack emitted an identical hash that happened to already be there.
#
# So the deploy now owns this directory.
#
#   - Copied out of the container we just started, so it is by construction the
#     bundle that container's index.html references.
#   - ADDITIVE, and done BEFORE the traffic flip. Old files are left in place, so
#     during the switch both bundles are present and a request that arrives
#     mid-flip resolves either way. Stale hashes are pruned at the end.
#   - VERIFIED: index.html's own asset references must exist on disk afterwards.
#     A deploy that would blank the site fails here instead, while the old slot is
#     still the one serving traffic.
STATIC_ROOT=/var/www/lms-static
echo "==> [4/6] Publishing static assets from server-$NEW to $STATIC_ROOT ..."
mkdir -p "$STATIC_ROOT"

STAGE=$(mktemp -d /tmp/lms-static.XXXXXX)
trap 'rm -rf "$STAGE"' EXIT

if ! docker cp "lms-server-$NEW:/app/client/build/." "$STAGE/" 2>/dev/null; then
  echo "❌ Could not copy /app/client/build out of lms-server-$NEW."
  echo "   Not flipping traffic: nginx would serve a stale bundle and blank the site."
  docker-compose stop server-$NEW 2>/dev/null || true
  exit 1
fi

if [ ! -f "$STAGE/index.html" ]; then
  echo "❌ The image contains no client/build/index.html. Refusing to flip."
  docker-compose stop server-$NEW 2>/dev/null || true
  exit 1
fi

# Additive copy. cp -r over the existing tree adds and overwrites, never deletes.
cp -r "$STAGE/." "$STATIC_ROOT/"

# Prove it. Every /static/ asset index.html references must now be on disk.
MISSING=0
while read -r ref; do
  [ -z "$ref" ] && continue
  if [ ! -f "$STATIC_ROOT$ref" ]; then
    echo "   ❌ missing: $STATIC_ROOT$ref"
    MISSING=$((MISSING + 1))
  fi
done <<< "$(grep -oE '/static/[A-Za-z0-9._/-]+' "$STAGE/index.html" | sort -u)"

if [ "$MISSING" -gt 0 ]; then
  echo "❌ $MISSING asset(s) referenced by index.html are not in $STATIC_ROOT."
  echo "   This is exactly the blank-screen failure. Not flipping traffic."
  docker-compose stop server-$NEW 2>/dev/null || true
  exit 1
fi
echo "   ✅ index.html's assets are all present in $STATIC_ROOT"

# ── Switch nginx to new slot ─────────────────────────────────────────────────
echo "==> [5/6] Switching nginx upstream to port $NEW_PORT..."
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

# ── Prune bundles no longer referenced ───────────────────────────────────────
# Only AFTER the flip, and only files older than a day: a user who loaded the page
# a minute before the deploy is still running the previous bundle and will ask for
# its chunks on the next lazy route. Deleting those immediately turns a deploy into
# a broken session for everyone mid-page. A day is far longer than any session.
echo "==> [6/6] Pruning static assets older than 24h ..."
PRUNED=$(find "$STATIC_ROOT/static" -type f -mtime +1 -print -delete 2>/dev/null | wc -l || echo 0)
echo "   Removed $PRUNED stale file(s). Kept everything published in the last day."
find "$STATIC_ROOT/static" -type d -empty -delete 2>/dev/null || true

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
