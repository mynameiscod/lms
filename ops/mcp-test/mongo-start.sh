#!/bin/bash
set -euo pipefail
install -o mongodb -g mongodb -m 400 /run/secrets/mongo_keyfile /tmp/mcp-test-keyfile
exec /usr/local/bin/docker-entrypoint.sh mongod --auth --bind_ip_all --replSet mcpTestRs --keyFile /tmp/mcp-test-keyfile --wiredTigerCacheSizeGB 0.5
