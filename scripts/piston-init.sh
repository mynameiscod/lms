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
# Versions here MUST match server/src/services/codeRunnerService.ts
# → mapToPistonLanguage(), because Piston matches the exact version sent at
#   execute time. (Execute uses aliases like javascript/c++/csharp; the package
#   names below — node/gcc/mono — are what the /packages API expects.)
#
# Usage:
#   ./scripts/piston-init.sh                       # talks to the piston container
#   ./scripts/piston-init.sh http://localhost:2000/api/v2   # custom base URL
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail

PISTON="${1:-}"

# If no URL passed, exec curl from inside the piston container so we don't depend
# on the port being published on the host.
run_curl() {
  if [ -n "$PISTON" ]; then
    curl -s "$@"
  else
    docker exec lms-piston sh -c "curl -s $*"
  fi
}

BASE="${PISTON:-http://localhost:2000/api/v2}"

echo "==> Waiting for Piston to be ready at ${PISTON:-(container) $BASE} ..."
for i in $(seq 1 30); do
  if run_curl "$BASE/runtimes" >/dev/null 2>&1; then
    echo "   ✅ Piston is up"
    break
  fi
  echo "   ... waiting ($i/30)"
  sleep 3
done

install() {
  local lang="$1" ver="$2"
  echo "==> Installing $lang $ver ..."
  run_curl -XPOST "$BASE/packages" -H 'Content-Type: application/json' \
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
run_curl "$BASE/runtimes"
echo ""
echo "✅ Piston runtime setup complete."
