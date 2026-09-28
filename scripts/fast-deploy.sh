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

# ── Which bash is this? ─────────────────────────────────────────────────────
# Run from cmd.exe, `bash` resolves to C:\Windows\System32\bash.exe -- the WSL
# launcher, a different bash entirely. If WSL is not running you get
#   Error code: Bash/Service/CreateInstance/0x8007274c
# which says nothing about what is wrong. And even when WSL does start, the SSH
# key this script needs lives in the GIT BASH home, not WSL's.
if grep -qi microsoft /proc/version 2>/dev/null; then
  echo "This is WSL bash. Use Git Bash instead:" >&2
  echo "    \"C:\\Program Files\\Git\\bin\\bash.exe\" scripts/fast-deploy.sh" >&2
  echo "  or right-click the repo folder -> Git Bash Here." >&2
  exit 1
fi

KEY="${SSH_KEY:-$HOME/.ssh/github-ci}"
HOST="${VPS:-root@187.124.97.56}"
VERSION="$(cat VERSION 2>/dev/null || echo 1.2.0)"
BUILD_DATE="$(date +%Y-%m-%d)"

# ── Is there room to build? ─────────────────────────────────────────────────
# The client build asks Node for a 4 GB heap. Under about 8 GB the VM starts
# thrashing and BuildKit dies with "failed to receive status: rpc error ... EOF",
# which reads like a network fault and is actually an out-of-memory kill.
DOCKER_MEM=$(docker info --format '{{.MemTotal}}' 2>/dev/null || echo 0)
if [ "$DOCKER_MEM" -gt 0 ] && [ "$DOCKER_MEM" -lt 7516192768 ]; then
  echo "WARNING: Docker has only $((DOCKER_MEM / 1024 / 1024 / 1024)) GB." >&2
  echo "         The client build needs ~6 GB. Raise it in" >&2
  echo "         Docker Desktop -> Settings -> Resources -> Memory." >&2
fi

# Refuse to start on top of another build. Two of these at once each want a 4 GB
# heap from the same VM, and the second one kills the first -- which is exactly
# how a deploy failed on 25 September.
if docker ps --format '{{.Command}}' 2>/dev/null | grep -q 'buildkitd'; then
  echo "NOTE: a BuildKit daemon is active. If another build is running, wait for" >&2
  echo "      it to finish -- two concurrent builds exhaust the VM and both fail." >&2
fi

echo "==> [1/3] Building image locally…"
# --provenance/--sbom off so `docker save | docker load` yields a plain,
# single-arch image the VPS Docker can load without OCI manifest-list issues.
#
# TWO PASSES, ON PURPOSE. `client-build` and `backend-build` are independent
# stages, so BuildKit runs them CONCURRENTLY -- the React build (4 GB heap)
# alongside npm install, npm run build and npm prune. On an 8 GB Docker VM that
# is an out-of-memory kill, and the symptom is a 32-minute client build and a
# 19-minute `npm prune` before BuildKit drops the connection.
#
# Building the backend target first, then the full image, serialises them: the
# second pass finds the backend layers cached and only the client stage runs.
# Same image, same layers, roughly the same total time -- just not at once.
DOCKER_BUILDKIT=1 docker build \
  --provenance=false --sbom=false \
  --build-arg BUILD_DATE="$BUILD_DATE" \
  --build-arg APP_VERSION="$VERSION" \
  --target backend-build \
  -t lms-backend-stage:latest .

DOCKER_BUILDKIT=1 docker build \
  --provenance=false --sbom=false \
  --build-arg BUILD_DATE="$BUILD_DATE" \
  --build-arg APP_VERSION="$VERSION" \
  -t lms-server:latest .

# A build that failed leaves the PREVIOUS lms-server:latest in place, and
# shipping that would deploy yesterday's code under today's commit. set -e stops
# the script before the ship step, but say so explicitly rather than relying on
# the reader knowing that.
if ! docker image inspect lms-server:latest >/dev/null 2>&1; then
  echo "Build produced no image. Nothing shipped." >&2
  exit 1
fi
echo "    image: $(docker images --no-trunc -q lms-server:latest)"

echo "==> [2/3] Shipping image to VPS over SSH (gzip stream)…"
docker save lms-server:latest | gzip -1 | ssh -i "$KEY" -o StrictHostKeyChecking=no "$HOST" 'gunzip | docker load'

echo "==> [3/3] Flipping slots on the VPS (no build there)…"
ssh -i "$KEY" -o StrictHostKeyChecking=no "$HOST" \
  'cd /root/lms && git fetch origin master -q && git reset --hard origin/master -q && chmod +x deploy-image.sh && ./deploy-image.sh'

echo "==> Done."
