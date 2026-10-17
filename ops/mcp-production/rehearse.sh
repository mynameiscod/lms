#!/usr/bin/env bash
# Disposable synthetic integration test. No production host, data or credentials.
set -euo pipefail
test "$(id -u)" = 0 || { echo 'Run this Docker rehearsal with sudo.'; exit 1; }
repo=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
fixture=$(mktemp -d /tmp/mcp-migration-ci.XXXXXX)
app_dir="$fixture/app"
state_root="$fixture/state"
project="mcp-migration-ci-$$"
mongo_name="$project-mongo"
app_name="$project-app"
mkdir -p "$app_dir/server"
chmod 700 "$fixture"
cleanup() {
  if [ -n "${http_pid:-}" ]; then kill "$http_pid" 2>/dev/null || true; fi
  docker compose -p "$project" -f "$app_dir/docker-compose.yml" down --volumes --remove-orphans >/dev/null 2>&1 || true
  docker rm -f "$app_name" "$mongo_name" >/dev/null 2>&1 || true
  docker volume rm "${project}_data" >/dev/null 2>&1 || true
  rm -rf "$fixture"
}
trap cleanup EXIT
docker pull mongo:8.2.7
image=$(docker image inspect mongo:8.2.7 --format '{{.Id}}')
export FIXTURE_DIR="$fixture" FIXTURE_APP_DIR="$app_dir" FIXTURE_PROJECT="$project" FIXTURE_MONGO="$mongo_name" FIXTURE_APP="$app_name" FIXTURE_IMAGE="$image"
python3 <<'PY'
import json, os, secrets
from pathlib import Path
p = Path(os.environ['FIXTURE_APP_DIR'])
env = {'MONGO_INITDB_ROOT_USERNAME':'migration_fixture_admin', 'MONGO_INITDB_ROOT_PASSWORD':secrets.token_hex(32)}
spec = {'services': {
  'mongodb': {'image':os.environ['FIXTURE_IMAGE'], 'container_name':os.environ['FIXTURE_MONGO'],
    'environment':env, 'command':['mongod','--auth','--bind_ip_all'],
    'volumes':['data:/data/db'], 'ports':['127.0.0.1:27028:27017']},
  'app': {'image':os.environ['FIXTURE_IMAGE'], 'container_name':os.environ['FIXTURE_APP'],
    'entrypoint':['bash','-c','sleep infinity']}}, 'volumes':{'data':{}}}
(p / 'docker-compose.yml').write_text(json.dumps(spec))
(p / 'deploy-image.sh').write_text('# local operator modification must survive\n')
(p / 'server/.env').write_text('MCP_ENABLED=false\n')
(p / '.env').write_text('LOCAL_CONFIGURATION=preserve\n')
PY
docker compose -p "$project" -f "$app_dir/docker-compose.yml" up -d
for attempt in $(seq 1 60); do
  if docker exec "$mongo_name" sh -c 'test "$(cat /proc/1/comm)" = mongod' >/dev/null 2>&1 && docker exec "$mongo_name" mongosh --quiet --eval 'quit(db.adminCommand({ping:1}).ok ? 0 : 1)' >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec "$mongo_name" mongosh --quiet --eval '
const a=db.getSiblingDB("admin"); a.auth(process.env.MONGO_INITDB_ROOT_USERNAME,process.env.MONGO_INITDB_ROOT_PASSWORD);
const d=db.getSiblingDB("lms-saas");
d.users.insertMany([{_id:1,tenantId:"a",marker:"synthetic"},{_id:2,tenantId:"b",marker:"synthetic"}]);
d.tenants.insertMany([{_id:"a"},{_id:"b"}]); d.roles.insertOne({_id:1,permissions:[]}); d.batches.insertOne({_id:1});
d.users.createIndex({tenantId:1}); print("Synthetic fixture ready");
' >/dev/null

# A readiness endpoint can fail only after the production conversion to exercise
# automatic rollback. The test endpoint is not an LMS integration test.
python3 -u - "$fixture" <<'PY' >"$fixture/http.log" 2>&1 &
import http.server, json, pathlib, sys
root = pathlib.Path(sys.argv[1])
class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        phases = []
        for state in (root / 'state').glob('*/state.json'):
            try: phases.append(json.loads(state.read_text())['phase'])
            except (OSError, ValueError): pass
        fail = (root / 'fail-after-apply').exists() and 'applying' in phases
        self.send_response(503 if fail else 200); self.end_headers(); self.wfile.write(b'fixture readiness')
    def log_message(self, *args): pass
http.server.HTTPServer(('127.0.0.1', 18098), Handler).serve_forever()
PY
http_pid=$!
args=(--app-dir "$app_dir" --state-root "$state_root" --mongo-container "$mongo_name" --expected-volume "${project}_data" --expected-image "$image" --host-port 27028 --health-url http://127.0.0.1:18098 --dependent "$app_name")
python3 "$repo/scripts/mcp-production-mongo.py" plan "${args[@]}"

# Drift must fail before downtime or local configuration changes.
if python3 "$repo/scripts/mcp-production-mongo.py" migrate "${args[@]}" --expected-volume wrong-volume >"$fixture/guard.log" 2>&1; then
  echo 'FAIL: wrong data volume was accepted'; exit 1
fi
test "$(docker inspect "$mongo_name" --format '{{.State.Running}}')" = true
test "$(docker inspect "$app_name" --format '{{.State.Running}}')" = true
test ! -f "$app_dir/docker-compose.override.yml"

python3 "$repo/scripts/mcp-production-mongo.py" migrate "${args[@]}" | tee "$fixture/migration.log"
test "$(docker inspect "$app_name" --format '{{.State.Running}}')" = true
test "$(docker port "$mongo_name" 27017)" = 127.0.0.1:27028
test "$(docker inspect "$mongo_name" --format '{{.Image}}')" = "$image"
test "$(cat "$app_dir/deploy-image.sh")" = '# local operator modification must survive'
test "$(cat "$app_dir/server/.env")" = 'MCP_ENABLED=false'
test "$(cat "$app_dir/.env")" = 'LOCAL_CONFIGURATION=preserve'

state_dir=$(find "$state_root" -mindepth 1 -maxdepth 1 -type d | head -1)
(cd "$state_dir" && sha256sum -c mongo-data.tar.gz.sha256)
test "$(stat -c %a "$state_root")" = 700
test "$(stat -c %a "$state_dir/mongo-keyfile")" = 400
test "$(stat -c %a "$state_dir/mongo-data.tar.gz")" = 600
test ! -f "$state_dir/verify.env"

# Roll back configuration and prove writes made AFTER conversion survive. A
# restore of the cold backup here would silently discard this new document.
docker exec "$mongo_name" mongosh --quiet --eval '
const a=db.getSiblingDB("admin"); a.auth(process.env.MONGO_INITDB_ROOT_USERNAME,process.env.MONGO_INITDB_ROOT_PASSWORD);
db.getSiblingDB("lms-saas").users.insertOne({_id:3,marker:"after-conversion"});
' >/dev/null
python3 "$repo/scripts/mcp-production-mongo.py" rollback --state-dir "$state_dir"
docker exec "$mongo_name" mongosh --quiet --eval '
const a=db.getSiblingDB("admin"); a.auth(process.env.MONGO_INITDB_ROOT_USERNAME,process.env.MONGO_INITDB_ROOT_PASSWORD);
if (a.runCommand({hello:1}).setName || db.getSiblingDB("lms-saas").users.countDocuments({}) !== 3) quit(1);
' >/dev/null
test "$(docker port "$mongo_name" 27017)" = 127.0.0.1:27028
echo 'PASS: version/volume guards, cold backup restoration, replica-set conversion, authentication, transactions, localhost publication, local-file preservation and rollback preserving newer writes.'

# Start a NEW synthetic volume for the automatic-recovery scenario. Never remove
# production storage; this entire test owns its unique temporary Compose project.
docker compose -p "$project" -f "$app_dir/docker-compose.yml" down --volumes
rm -f "$app_dir/docker-compose.override.yml"
rm -rf "$state_root"
docker compose -p "$project" -f "$app_dir/docker-compose.yml" up -d
for attempt in $(seq 1 60); do
  if docker exec "$mongo_name" sh -c 'test "$(cat /proc/1/comm)" = mongod' >/dev/null 2>&1 && docker exec "$mongo_name" mongosh --quiet --eval 'quit(db.adminCommand({ping:1}).ok ? 0 : 1)' >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec "$mongo_name" mongosh --quiet --eval '
const a=db.getSiblingDB("admin"); a.auth(process.env.MONGO_INITDB_ROOT_USERNAME,process.env.MONGO_INITDB_ROOT_PASSWORD);
db.getSiblingDB("lms-saas").users.insertOne({_id:1,marker:"automatic-rollback"});
' >/dev/null
touch "$fixture/fail-after-apply"
if python3 "$repo/scripts/mcp-production-mongo.py" migrate "${args[@]}" >"$fixture/auto-rollback.log" 2>&1; then
  echo 'FAIL: failed application readiness was accepted'; exit 1
fi
cat "$fixture/auto-rollback.log"
docker exec "$mongo_name" mongosh --quiet --eval '
const a=db.getSiblingDB("admin"); a.auth(process.env.MONGO_INITDB_ROOT_USERNAME,process.env.MONGO_INITDB_ROOT_PASSWORD);
if (a.runCommand({hello:1}).setName || db.getSiblingDB("lms-saas").users.countDocuments({}) !== 1) quit(1);
' >/dev/null
test "$(docker inspect "$app_name" --format '{{.State.Running}}')" = true
test "$(docker port "$mongo_name" 27017)" = 127.0.0.1:27028
echo 'PASS: failed post-conversion readiness automatically restores standalone configuration and resumes dependent services.'
