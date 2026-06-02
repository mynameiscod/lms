#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Install the language runtimes the LMS code-runner needs into Piston.
#
# The base ghcr.io/engineer-man/piston image ships with NO languages — every
# runtime must be installed via its package API. Without this, real code
# execution fails and the server falls back to (misleading) simulation output.
#
# Run this ONCE after the piston container is up. Packages are stored in the
# `piston_data` volume (/piston/packages), so they survive restarts/redeploys.
#
# NOTE: the piston container has no curl, and its port 2000 is not published to
# the host. So we reach it with a throwaway curlimages/curl container that
# SHARES piston's network namespace (--network container:<piston>), making
# localhost:2000 resolve to Piston.
#
# Versions here MUST match server/src/services/codeRunnerService.ts
# → mapToPistonLanguage(). Execute uses aliases (javascript/c++/csharp); the
#   package names below (node/gcc/mono) are what the /packages API expects.
#
# Usage:
#   ./scripts/piston-init.sh                 # uses container "lms-piston"
#   PISTON_CONTAINER=my-piston ./scripts/piston-init.sh
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail

PISTON_CONTAINER="${PISTON_CONTAINER:-lms-piston}"
BASE="http://localhost:2000/api/v2"

# curl, run inside a container that shares the piston container's network.
pc() {
  docker run --rm --network "container:${PISTON_CONTAINER}" curlimages/curl -s "$@"
}

echo "==> Waiting for Piston (${PISTON_CONTAINER}) to be ready ..."
for i in $(seq 1 30); do
  if pc "$BASE/runtimes" >/dev/null 2>&1; then
    echo "   ✅ Piston is up"
    break
  fi
  echo "   ... waiting ($i/30)"
  sleep 3
done

install() {
  local lang="$1" ver="$2"
  echo "==> Installing $lang $ver ..."
  pc -XPOST "$BASE/packages" -H 'Content-Type: application/json' \
    -d "{\"language\":\"$lang\",\"version\":\"$ver\"}"
  echo ""
}

# Package name  Version     # Maps to code-runner language(s)
install node       18.15.0  # javascript
install typescript 5.0.3    # typescript
install python     3.10.0   # python
install java       15.0.2   # java
install gcc        10.2.0   # c, c++
install mono       6.12.0   # csharp
install go         1.16.2   # go
install rust       1.68.2   # rust
install sqlite3    3.36.0   # sql

echo ""
echo "==> Installed runtimes:"
pc "$BASE/runtimes"
echo ""
echo "✅ Piston runtime setup complete."
