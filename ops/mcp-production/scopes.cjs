'use strict';
// Mounted by the reviewed host operator into the EXISTING image. Preview uses
// only its runtime DB account. Apply/rollback use a short-lived admin mount.
const fs = require('node:fs');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const settings = require('./settings.cjs');
const c = settings.load();
mongoose.set('autoIndex', false); mongoose.set('autoCreate', false);
const model = name => require('/app/server/dist/models/' + name).default;
const { identityFor } = require('/app/server/dist/mcp/identity');
const { mcpConfig } = require('/app/server/dist/mcp/oauthPolicy');
const { tools, canUseTool } = require('/app/server/dist/mcp/tools');
const action = process.argv[2];
const sorted = values => [...new Set(values)].sort();
const same = (a, b) => JSON.stringify(sorted(a)) === JSON.stringify(sorted(b));
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const output = value => console.log('SCOPE_JSON=' + JSON.stringify(value));
let stage = 'configuration';
function check(condition, reason) { if (!condition) { stage = reason; throw new Error('Scope check failed'); } }

function validate(r) {
  check(['plan', 'apply', 'rollback'].includes(action), 'invalid_action');
  check(r && /^[a-zA-Z0-9-]{8,80}$/.test(r.operationId), 'invalid_operation');
  check(r.access && /^[a-f0-9]{24}$/i.test(r.access.newRoleId), 'saved_individual_role_required');
  check(r.access.baseRole === 'SUPER_ADMIN' && !r.access.originalRoleId, 'unsupported_original_account');
  check(Array.isArray(r.access.nativePermissions) && r.access.nativePermissions.every(x => typeof x === 'string' && !x.startsWith('mcp_')), 'invalid_native_snapshot');
  const known = new Set(['mcp_connect', ...tools.map(t => t.scope)]);
  for (const scopes of [r.oldScopes, r.newScopes]) {
    check(Array.isArray(scopes) && scopes.includes('mcp_connect') && scopes.every(s => known.has(s)) && scopes.length === new Set(scopes).size, 'invalid_scopes');
  }
  check(r.oldScopes.every(s => r.newScopes.includes(s)) && r.newScopes.length > r.oldScopes.length, 'expansion_only');
  check(same(r.access.scopes, r.oldScopes), 'saved_access_scope_mismatch');
  const client = c.clients.find(x => x.id === r.clientId);
  check(client && (same(client.scopes.filter(s => s !== 'offline_access'), r.oldScopes) ||
    (action === 'rollback' && same(client.scopes.filter(s => s !== 'offline_access'), r.newScopes))), 'client_configuration_changed');
  return client;
}

async function roleSnapshot(r, session) {
  const user = await model('User').findOne({ _id: r.access.userId, tenantId: r.access.tenantId })
    .select('_id tenantId email role customRoleId isActive').session(session || null).maxTimeMS(5000).lean();
  check(user && user.email === r.email && user.role === 'SUPER_ADMIN' && String(user.customRoleId) === r.access.newRoleId, 'account_assignment_changed');
  const role = await model('Role').findOne({ _id: r.access.newRoleId, tenantId: user.tenantId }).session(session || null).maxTimeMS(5000).lean();
  check(role && await model('User').countDocuments({ customRoleId: role._id }).session(session || null).maxTimeMS(5000) === 1, 'role_missing_or_shared');
  const before = sorted([...r.access.nativePermissions, ...r.oldScopes]);
  const after = sorted([...r.access.nativePermissions, ...r.newScopes]);
  check(same(role.permissions, before) || (action === 'rollback' && same(role.permissions, after)), 'role_permissions_changed');
  return { user, role, before, after };
}

async function preview(r, session) {
  const row = await roleSnapshot(r, session);
  const identity = await identityFor(row.user._id, row.user.tenantId, session);
  const proposed = { ...identity, permissions: row.after };
  const candidates = tools.filter(t => r.newScopes.includes(t.scope));
  const blocked = candidates.filter(t => !canUseTool(proposed, r.newScopes, t));
  check(!blocked.length, 'existing_native_permissions_or_modules_block_requested_tools');
  const fingerprint = hash({ userId: String(row.user._id), tenantId: String(row.user.tenantId),
    roleId: String(row.role._id), permissions: sorted(row.role.permissions),
    credentialVersion: identity.credentialVersion, modules: identity.modules });
  return { fingerprint, tools: candidates.map(t => t.name), tenantId: String(row.user.tenantId),
    roleId: String(row.role._id), tenantName: identity.tenant.name };
}

async function main() {
  mcpConfig();
  const r = JSON.parse(fs.readFileSync('/run/mcp/scope-request.json', 'utf8'));
  validate(r);
  const admin = action === 'plan' ? undefined : JSON.parse(fs.readFileSync('/run/mcp/scope-admin.json', 'utf8'));
  stage = 'database_connection';
  await mongoose.connect(settings.uri(c, admin), { serverSelectionTimeoutMS: 10000, maxPoolSize: 2 });
  check(mongoose.connection.db.databaseName === c.database, 'database_mismatch');
  const topology = await mongoose.connection.db.admin().command({ hello: 1 });
  check(topology.setName === c.replica && JSON.stringify(topology.hosts) === JSON.stringify([c.hostname + ':27017']), 'topology_mismatch');
  stage = 'account_policy';
  if (action === 'plan') return output(await preview(r));
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      if (action === 'apply') {
        const fresh = await preview(r, session);
        check(fresh.fingerprint === r.fingerprint, 'account_policy_changed_since_preview');
      }
      const row = await roleSnapshot(r, session);
      const isExpanded = same(row.role.permissions, row.after);
      if (action === 'apply' || isExpanded) {
        stage = 'role_update';
        const changed = await model('Role').updateOne({ _id: row.role._id, tenantId: row.user.tenantId,
          permissions: row.role.permissions }, { $set: { permissions: action === 'apply' ? row.after : row.before } }, { session });
        check(changed.matchedCount === 1, 'concurrent_role_change');
      }
      if (action === 'rollback') {
        stage = 'grant_revocation';
        // Prevent newly expanded grants from reviving after a future expansion.
        // Existing three-tool grants and grants for other clients stay intact.
        const additions = r.newScopes.filter(s => !r.oldScopes.includes(s));
        await model('McpOAuthGrant').updateMany({ issuer: c.issuer, audience: c.issuer + '/mcp',
          clientId: r.clientId, scopes: { $in: additions }, revokedAt: null },
        { $set: { revokedAt: new Date() }, $inc: { version: 1 } }, { session });
      }
      stage = 'audit_write';
      await model('McpAuditEvent').create([{ userId: row.user._id, tenantId: row.user.tenantId,
        clientId: r.clientId, requestId: r.operationId, tool: 'operator_scope_' + action,
        reason: action === 'apply' ? 'explicit_scope_expansion' : 'scope_expansion_rollback', outcome: 'allowed' }], { session });
    }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
  } finally { await session.endSession(); }
  output({ completed: action });
}
main().catch(() => { output({ error: stage }); process.exitCode = 1; }).finally(() => mongoose.disconnect());
