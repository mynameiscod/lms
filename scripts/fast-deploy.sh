#!/bin/bash
# ============================================================================
# Fast deploy — build the Docker image on THIS machine (fast, uncontended) and
# ship it to the VPS over SSH, instead of building on the CPU-contended VPS.
#
# Run from the repo root (Git Bash on Windows works):  bash scripts/fast-deploy.sh
#
# Env overrides:
#   SSH_KEY   path to the deploy key   (default ~/.ssh/github-ci)
#   VPS       user@host                (default root@187.124.97.56)
# ============================================================================
set -euo pipefail

KEY="${SSH_KEY:-$HOME/.ssh/github-ci}"
HOST="${VPS:-root@187.124.97.56}"
VERSION="$(cat VERSION 2>/dev/null || echo 1.2.0)"
BUILD_DATE="$(date +%Y-%m-%d)"

echo "==> [1/3] Building image locally (BuildKit, all cores)…"
# --provenance/--sbom off so `docker save | docker load` yields a plain,
# single-arch image the VPS Docker can load without OCI manifest-list issues.
DOCKER_BUILDKIT=1 docker build \
  --provenance=false --sbom=false \
  --build-arg BUILD_DATE="$BUILD_DATE" \
  --build-arg APP_VERSION="$VERSION" \
  -t lms-server:latest .

echo "==> [2/3] Shipping image to VPS over SSH (gzip stream)…"
docker save lms-server:latest | gzip -1 | ssh -i "$KEY" -o StrictHostKeyChecking=no "$HOST" 'gunzip | docker load'

echo "==> [3/3] Flipping slots on the VPS (no build there)…"
ssh -i "$KEY" -o StrictHostKeyChecking=no "$HOST" \
  'cd /root/lms && git fetch origin master -q && git reset --hard origin/master -q && chmod +x deploy-image.sh && ./deploy-image.sh'

echo "==> Done."
