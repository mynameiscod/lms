#!/bin/bash
# One-time setup: migrate from single 'server' container to blue/green
# Run ONCE on VPS after pulling the new docker-compose.yml
set -euo pipefail

cd /root/lms

echo "==> Setting up Blue/Green deployment infrastructure..."

# 1. Install updated nginx config
cp nginx/platform.codebegun.com.conf /etc/nginx/sites-available/platform.codebegun.com

# 2. Create initial active-slot.conf pointing to blue (port 5001)
#    We'll start blue first, so nginx needs to point somewhere valid
echo "server 127.0.0.1:5001;" > /etc/nginx/active-slot.conf
echo "✅ /etc/nginx/active-slot.conf created"

# 3. Make deploy.sh executable
chmod +x /root/lms/deploy.sh
echo "✅ deploy.sh is executable"

# 4. Test nginx config
nginx -t && echo "✅ nginx config valid"

# 5. Build and start blue slot (while old 'server' is still running on 5000)
echo ""
echo "==> Building server-blue..."
BUILD_DATE=$(date +%Y-%m-%d)
APP_VERSION=$(cat VERSION 2>/dev/null || echo "1.2.0")
docker-compose build --build-arg BUILD_DATE="$BUILD_DATE" --build-arg APP_VERSION="$APP_VERSION" server-blue

echo "==> Starting server-blue on port 5001..."
docker-compose up -d --no-deps server-blue

# 6. Wait for blue to be healthy
echo "==> Waiting for server-blue health check..."
for i in $(seq 1 30); do
  sleep 3
  if curl -sf "http://127.0.0.1:5001/api/health" >/dev/null 2>&1; then
    echo "✅ server-blue is healthy"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "❌ server-blue failed to start. Check logs: docker logs lms-server-blue"
    exit 1
  fi
  echo "   ... attempt $i/30"
done

# 7. Switch nginx from old server (5000) to blue (5001)
nginx -s reload
echo "✅ Nginx reloaded → now routing to server-blue (5001)"

# 8. Save active slot
echo "blue" > /root/lms/.active-slot

# 9. Stop old server container
echo "==> Stopping old 'server' container..."
docker-compose stop server 2>/dev/null || true
docker rm lms-server 2>/dev/null || true
echo "✅ Old server stopped"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  ✅ Blue/Green setup complete!                        ║"
echo "║  Active: blue (port 5001)                            ║"
echo "║  Next deploy: run ./deploy.sh                        ║"
echo "╚══════════════════════════════════════════════════════╝"
