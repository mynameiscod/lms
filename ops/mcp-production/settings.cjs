'use strict';
const fs = require('node:fs');
const assert = require('node:assert/strict');

function load(path = '/run/mcp/runtime.json') {
  const c = JSON.parse(fs.readFileSync(path, 'utf8'));
  assert.equal(c.purpose, 'codebegun-production-mcp-v1');
  assert.match(c.database, /^[a-zA-Z0-9_-]+$/);
  assert.match(c.hostname, /^[a-zA-Z0-9.-]+$/);
  assert.match(c.replica, /^[a-zA-Z0-9_-]+$/);
  assert.equal(new URL(c.issuer).origin, c.issuer);
  assert.equal(new URL(c.issuer).protocol, 'https:');
  assert.equal(c.username, 'codebegun_mcp_runtime');
  assert.equal(c.role, 'codebegun_mcp_runtime');
  assert.match(c.password, /^[a-f0-9]{96}$/);
  process.env.NODE_ENV = 'production';
  process.env.MCP_ENABLED = 'true';
  process.env.MCP_ISSUER_URL = c.issuer;
  process.env.MCP_RESOURCE_URL = c.issuer + '/mcp';
  process.env.MCP_OAUTH_CLIENTS = JSON.stringify(c.clients);
  process.env.MCP_ALLOWED_ORIGINS = '';
  delete process.env.MONGO_URL;
  delete process.env.MONGODB_URI;
  return c;
}
function uri(c, admin) {
  const user = admin ? admin.username : c.username;
  const password = admin ? admin.password : c.password;
  return `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${c.hostname}:27017/${c.database}` +
    `?authSource=${admin ? 'admin' : c.database}&replicaSet=${c.replica}&w=majority`;
}
module.exports = { load, uri };
