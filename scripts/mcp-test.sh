#!/usr/bin/env bash
# Only the isolated synthetic test stack. Never source an LMS .env or use its Compose file.
set -euo pipefail
REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
STAGE="$REPO_ROOT/ops/mcp-test"
PRIVATE="$STAGE/private"
COMPOSE=(docker compose --env-file /dev/null --project-name codebegun-mcp-test --file "$STAGE/compose.yaml")

fail() { printf '%s\n' "$*" >&2; exit 1; }
require() { command -v "$1" >/dev/null || fail "Required command is missing: $1"; }
docker_ready() {
  require docker
  docker compose version >/dev/null
  docker info >/dev/null 2>&1 || fail 'Docker is unavailable.'
  # Refuse to build in the live LMS checkout, including if its path later changes.
  local container live_dir
  for container in lms-server-blue lms-server-green; do
    live_dir="$(docker inspect "$container" --format '{{index .Config.Labels "com.docker.compose.project.working_dir"}}' 2>/dev/null || true)"
    [[ -z "$live_dir" || "$live_dir" != "$REPO_ROOT" ]] || fail 'Run this from the separate test checkout, not the live LMS directory.'
  done
  [[ "$REPO_ROOT" != /root/lms ]] || fail 'Run from /root/lms-mcp-test.'
}
initialize() {
  require openssl
  if [[ -e "$PRIVATE" ]]; then
    [[ -d "$PRIVATE" && ! -L "$PRIVATE" ]] || fail 'Invalid staging secrets directory.'
    local name
    for name in mongo-keyfile mongo-root-password mongo-app-password test-password clients.json; do
      [[ -s "$PRIVATE/$name" && ! -L "$PRIVATE/$name" ]] || fail "Incomplete staging secrets: $name. Existing secrets are never overwritten."
    done
    chmod 700 "$PRIVATE"
    return
  fi
  local temporary
  temporary="$(mktemp -d "$STAGE/.private.XXXXXXXX")"
  chmod 700 "$temporary"
  openssl rand -base64 756 > "$temporary/mongo-keyfile"
  openssl rand -hex 48 > "$temporary/mongo-root-password"
  openssl rand -hex 48 > "$temporary/mongo-app-password"
  openssl rand -hex 24 > "$temporary/test-password"
  cp "$STAGE/clients.example.json" "$temporary/clients.json"
  # Parent is 0700; selected files must be readable by the non-root container user.
  chmod 644 "$temporary"/*
  mv "$temporary" "$PRIVATE"
  printf '%s\n' 'Generated separate test secrets. No production configuration was read.'
}
smoke() {
  "${COMPOSE[@]}" run --rm --no-deps smoke
  "${COMPOSE[@]}" run --rm --no-deps verify-db
}
install_nginx() {
  [[ "$EUID" -eq 0 ]] || fail 'Nginx configuration installation requires root.'
  require nginx
  local mode="$1" target=/etc/nginx/sites-available/mcp-test.codebegun.com
  local enabled=/etc/nginx/sites-enabled/mcp-test.codebegun.com
  [[ -d /etc/nginx/sites-available && -d /etc/nginx/sites-enabled ]] || fail 'Expected Ubuntu/Debian Nginx site directories.'
  [[ ! -L "$target" ]] || fail 'Refusing to overwrite a symlink in sites-available.'
  if [[ -e "$target" ]]; then
    head -1 "$target" | grep -qx '# Managed by CodeBegun synthetic MCP staging.' || fail 'Existing unmanaged staging Nginx configuration; review it manually.'
  fi
  if [[ -e "$enabled" || -L "$enabled" ]]; then
    [[ -L "$enabled" && "$(readlink -f "$enabled")" == "$target" ]] || fail 'Existing conflicting Nginx site entry.'
  fi
  if [[ "$mode" == https ]]; then
    [[ -s /etc/letsencrypt/live/mcp-test.codebegun.com/fullchain.pem &&
       -s /etc/letsencrypt/live/mcp-test.codebegun.com/privkey.pem ]] || fail 'Obtain the mcp-test TLS certificate first; see the runbook.'
  fi
  nginx -t
  local backup had_target=0 had_link=0
  backup="$(mktemp)"
  if [[ -e "$target" ]]; then cp -p "$target" "$backup"; had_target=1; fi
  if [[ -L "$enabled" ]]; then had_link=1; fi
  install -d -m 755 /var/www/codebegun-mcp-test
  install -m 644 "$STAGE/nginx-$mode.conf" "$target"
  if [[ "$had_link" -eq 0 ]]; then ln -s "$target" "$enabled"; fi
  if ! nginx -t || ! nginx -s reload; then
    if [[ "$had_target" -eq 1 ]]; then cp -p "$backup" "$target"; else rm -f "$target"; fi
    if [[ "$had_link" -eq 0 ]]; then rm -f "$enabled"; fi
    rm -f "$backup"
    nginx -t && nginx -s reload
    fail 'Staging Nginx change failed and was restored.'
  fi
  rm -f "$backup"
  printf '%s\n' "Installed the separate mcp-test $mode site; Nginx configuration passed."
}

case "${1:-help}" in
  init)
    initialize
    ;;
  up)
    docker_ready
    initialize
    if command -v ss >/dev/null && [[ -z "$("${COMPOSE[@]}" ps -q app)" ]] &&
       ss -H -ltn 'sport = :5010' | grep -q .; then
      fail 'Port 5010 is already in use; no existing service will be replaced.'
    fi
    "${COMPOSE[@]}" config --quiet
    "${COMPOSE[@]}" build --pull app
    "${COMPOSE[@]}" up -d --wait --wait-timeout 120 mongo
    "${COMPOSE[@]}" run --rm --no-deps prepare
    "${COMPOSE[@]}" up -d --wait --wait-timeout 120 app
    smoke
    printf '%s\n' 'Test stack ready at 127.0.0.1:5010. Configure the separate TLS site next.' \
      "Synthetic account password is stored only at $PRIVATE/test-password."
    ;;
  smoke)
    docker_ready
    smoke
    ;;
  public)
    docker_ready
    docker run --rm --network host --read-only --cap-drop ALL --security-opt no-new-privileges:true \
      --memory 512m --cpus 1 --pids-limit 128 \
      --mount "type=bind,source=$PRIVATE/test-password,target=/run/secrets/test_password,readonly" \
      codebegun-mcp-test:local node ops/mcp-test/smoke.cjs --public
    ;;
  restart)
    docker_ready
    "${COMPOSE[@]}" restart app
    ;;
  status)
    docker_ready
    "${COMPOSE[@]}" ps
    ;;
  stop)
    docker_ready
    "${COMPOSE[@]}" stop app mongo
    ;;
  nginx-http) install_nginx http ;;
  nginx-tls) install_nginx https ;;
  *)
    printf '%s\n' 'Usage: bash scripts/mcp-test.sh {init|up|smoke|public|restart|status|stop|nginx-http|nginx-tls}' \
      'See docs/runbooks/mcp-single-server-test.md. Production deploy/merge is never performed.'
    ;;
esac
