#!/usr/bin/env bash
# Disposable CI only. Never execute on a VPS containing real LMS containers.
set -euo pipefail
cd "$(dirname "$0")/../.."
if docker inspect lms-mongodb >/dev/null 2>&1; then
  echo 'Refusing to run synthetic rehearsal on the production VPS.' >&2
  exit 1
fi
python3 ops/mcp-production/test-installer.py
bash scripts/mcp-test.sh init
scratch="$(mktemp -d)"
chmod 700 "$scratch"
cp ops/mcp-production/account-status.cjs "$scratch/account-status.cjs"
chmod 444 "$scratch/account-status.cjs"
compose=(docker compose --env-file /dev/null -p codebegun-mcp-test -f ops/mcp-test/compose.yaml -f "$scratch/mongo.yaml")
cleanup() {
  docker rm -f mcp-production-ci mcp-production-tls-ci >/dev/null 2>&1 || true
  "${compose[@]}" down --volumes --remove-orphans >/dev/null 2>&1 || true
  rm -rf "$scratch"
}
trap cleanup EXIT
cat > "$scratch/mongo.yaml" <<'EOF'
services:
  mongo:
    image: mongo:8.2.7
EOF
"${compose[@]}" build app
# Match the VPS installer exactly. Directory-context .dockerignore filtering
# previously hid the integration-test import that broke the real archive build.
git archive --format=tar HEAD | docker build -f ops/mcp-production/Dockerfile -t mcp-production-ci -
docker run --rm --network none --read-only mcp-production-ci node -e '
  const fs = require("node:fs");
  if (fs.existsSync("server/dist/tests/mcpOAuthExchange.int.test.js")) throw new Error("Test compiled into runtime image");
  require("./server/dist/mcp");
  console.log("PASS: committed archive runtime build excludes browser integration tests");
'
"${compose[@]}" up -d --wait --wait-timeout 120 mongo
"${compose[@]}" run --rm --no-deps prepare
python3 - "$scratch" <<'PY'
import json, secrets, sys
from pathlib import Path
out = Path(sys.argv[1])
private = Path('ops/mcp-test/private')
config = dict(purpose='codebegun-production-mcp-v1', installation='synthetic-ci', database='lms-mcp-test',
              hostname='mcp-test-mongo', replica='mcpTestRs', username='codebegun_mcp_runtime', role='codebegun_mcp_runtime',
              password=secrets.token_hex(48), issuer='https://mcp-test.codebegun.com', clients=json.loads((private/'clients.json').read_text()))
(out/'runtime.json').write_text(json.dumps(config))
(out/'admin.json').write_text(json.dumps(dict(username='mcp_test_admin', password=(private/'mongo-root-password').read_text().strip())))
for p in out.glob('*.json'): p.chmod(0o444)
PY
operator=(docker run --rm --network codebegun-mcp-test_isolated --read-only --cap-drop ALL --security-opt no-new-privileges:true
  -v "$scratch/runtime.json:/run/mcp/runtime.json:ro" -v "$scratch/admin.json:/run/mcp/admin.json:ro"
  -v "$scratch/request.json:/run/mcp/request.json:ro" mcp-production-ci node ops/mcp-production/operator.cjs)
# A file mount must exist even for commands which do not use a request.
printf '{}' > "$scratch/request.json"
chmod 444 "$scratch/request.json"
fixture=(docker run --rm --user 0 --network codebegun-mcp-test_isolated --read-only
  -v "$scratch:/verify" -v "$scratch/runtime.json:/run/mcp/runtime.json:ro" -v "$scratch/admin.json:/run/mcp/admin.json:ro"
  -v "$scratch/request.json:/run/mcp/request.json:ro" -v "$PWD/ops/mcp-test/private/test-password:/run/secrets/test_password:ro"
  -v "$PWD/ops/mcp-production/rehearse-access.cjs:/app/rehearse-access.cjs:ro" mcp-production-ci node /app/rehearse-access.cjs)
"${fixture[@]}" snapshot
"${operator[@]}" prepare
"${operator[@]}" prepare
"${operator[@]}" verify
docker run -d --name mcp-production-ci --network codebegun-mcp-test_isolated --network-alias app \
  --read-only --cap-drop ALL --security-opt no-new-privileges:true \
  -v "$scratch/runtime.json:/run/mcp/runtime.json:ro" mcp-production-ci
"${compose[@]}" up -d --wait --wait-timeout 60 proxy
for attempt in $(seq 1 30); do
  if curl -fsS -H 'Host: mcp-test.codebegun.com' -H 'X-Forwarded-Proto: https' \
    http://127.0.0.1:5010/.well-known/oauth-authorization-server >/dev/null; then break; fi
  sleep 1
done
"${compose[@]}" run --rm --no-deps smoke
"${compose[@]}" run --rm --no-deps verify-db
# Verify the production Nginx rules through real TLS with the same OAuth flow.
openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj /CN=mcp-test.codebegun.com \
  -addext subjectAltName=DNS:mcp-test.codebegun.com -keyout "$scratch/privkey.pem" -out "$scratch/fullchain.pem" 2>/dev/null
python3 - "$scratch" <<'PY'
import importlib.util, sys
from pathlib import Path
spec = importlib.util.spec_from_file_location('production', 'scripts/mcp-production.py')
p = importlib.util.module_from_spec(spec); spec.loader.exec_module(p)
out = Path(sys.argv[1])
routes = p.routes(True).replace('127.0.0.1:5011', '127.0.0.1:5010')
(out/'nginx.conf').write_text('server {\nlisten 443 ssl;\nserver_name mcp-test.codebegun.com;\n'
    'ssl_certificate /verify/fullchain.pem;\nssl_certificate_key /verify/privkey.pem;\n' + routes + '\nlocation / { return 404; }\n}\n')
PY
docker run --rm --network none -v "$scratch:/verify:ro" -v "$scratch/nginx.conf:/etc/nginx/conf.d/default.conf:ro" nginx:1.28-alpine nginx -t
docker run -d --name mcp-production-tls-ci --network host -v "$scratch:/verify:ro" \
  -v "$scratch/nginx.conf:/etc/nginx/conf.d/default.conf:ro" nginx:1.28-alpine
for attempt in $(seq 1 20); do
  if curl -fsS --cacert "$scratch/fullchain.pem" --resolve mcp-test.codebegun.com:443:127.0.0.1 \
    https://mcp-test.codebegun.com/.well-known/oauth-authorization-server >/dev/null; then break; fi
  sleep 1
done
docker run --rm --network host --read-only --cap-drop ALL --security-opt no-new-privileges:true \
  --add-host mcp-test.codebegun.com:127.0.0.1 -e NODE_EXTRA_CA_CERTS=/verify/fullchain.pem \
  -v "$scratch/fullchain.pem:/verify/fullchain.pem:ro" -v "$PWD/ops/mcp-test/private/test-password:/run/secrets/test_password:ro" \
  codebegun-mcp-test:local node ops/mcp-test/smoke.cjs --public
"${fixture[@]}"
echo 'PASS: production image on MongoDB 8.2.7, private and HTTPS OAuth, runtime privileges, scoped account grant/revoke, and Nginx recovery.'
