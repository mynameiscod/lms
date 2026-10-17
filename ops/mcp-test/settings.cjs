'use strict';
const fs = require('node:fs');
const crypto = require('node:crypto');

const database = 'lms-mcp-test';
const replica = 'mcpTestRs';
const hostname = 'mcp-test-mongo';
const issuer = 'https://mcp-test.codebegun.com';
function secret(name) {
  const value = fs.readFileSync('/run/secrets/' + name, 'utf8').trim();
  if (value.length < 32) throw new Error('Invalid staging secret: ' + name);
  return value;
}
function uri(admin = false, direct = false) {
  const user = admin ? 'mcp_test_admin' : 'mcp_test_app';
  const password = encodeURIComponent(secret(admin ? 'mongo_root_password' : 'mongo_app_password'));
  return 'mongodb://' + user + ':' + password + '@' + hostname + ':27017/' + database +
    '?authSource=' + (admin ? 'admin' : database) + (direct ? '&directConnection=true' : '&replicaSet=' + replica);
}
function configure() {
  if (process.env.MCP_STAGING_ONLY !== 'synthetic-data-only') throw new Error('Staging guard is missing');
  // Deliberately fixed: no production connection, host, .env file or signing key is accepted.
  delete process.env.MONGO_URL;
  process.env.MONGODB_URI = uri();
  process.env.NODE_ENV = 'production';
  process.env.MCP_ENABLED = 'true';
  process.env.MCP_ISSUER_URL = issuer;
  process.env.MCP_RESOURCE_URL = issuer + '/mcp';
  process.env.MCP_ALLOWED_ORIGINS = '';
  process.env.MCP_OAUTH_CLIENTS = fs.readFileSync('/run/secrets/oauth_clients', 'utf8');
}
function fixtureId(name) {
  return crypto.createHash('sha256').update('codebegun-mcp-test:' + name).digest('hex').slice(0, 24);
}
module.exports = { database, replica, hostname, issuer, secret, uri, configure, fixtureId };
