'use strict';
// Operator-only, short-lived container. The service never mounts admin.json.
const fs = require('node:fs');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const settings = require('./settings.cjs');
const c = settings.load();
const mongoose = require('mongoose');
mongoose.set('autoIndex', false);
mongoose.set('autoCreate', false);
const model = name => require('../../server/dist/models/' + name).default;
const { mcpModels, assertMcpReady } = require('../../server/dist/mcp/bootstrap');
const { SCOPE_LABELS, mcpConfig } = require('../../server/dist/mcp/oauthPolicy');
const lmsModels = ['User', 'Tenant', 'Role', 'Batch', 'Attendance', 'Exam', 'Fee', 'Lead', 'OutperoCall'].map(model);
const command = process.argv[2];
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const output = value => console.log('PRODUCTION_JSON=' + JSON.stringify(value));

function privileges() {
  return lmsModels.map(m => ({ resource: { db: c.database, collection: m.collection.name }, actions: ['find'] }))
    .concat(mcpModels.map(m => ({ resource: { db: c.database, collection: m.collection.name },
      actions: m.modelName === 'McpAuditEvent' ? ['find', 'insert', 'listIndexes'] : ['find', 'insert', 'update', 'remove', 'listIndexes'] })));
}
const normalized = p => p.map(x => ({ resource: x.resource, actions: [...x.actions].sort() }))
  .sort((a, b) => JSON.stringify(a.resource).localeCompare(JSON.stringify(b.resource)));

async function prepare(admin) {
  // Keep index migration identical to the supported application preparer.
  execFileSync(process.execPath, ['server/dist/scripts/prepareMcp.js'], {
    env: { ...process.env, MONGODB_URI: settings.uri(c, admin) }, stdio: 'pipe', timeout: 120000,
  });
  const db = mongoose.connection.db;
  const existingUser = (await db.command({ usersInfo: c.username })).users[0];
  if (existingUser) {
    assert.equal(existingUser.customData?.managedBy, c.purpose, 'Unowned runtime user');
    assert.equal(existingUser.customData?.installation, c.installation, 'Different runtime installation');
    assert.deepEqual(existingUser.roles, [{ role: c.role, db: c.database }]);
  }
  const existingRole = (await db.command({ rolesInfo: c.role, showPrivileges: true })).roles[0];
  if (existingRole) {
    assert.deepEqual(existingRole.roles, []);
    assert.deepEqual(normalized(existingRole.privileges), normalized(privileges()), 'Runtime role drift');
  } else await db.command({ createRole: c.role, privileges: privileges(), roles: [] });
  if (!existingUser) await db.command({ createUser: c.username, pwd: c.password,
    roles: [{ role: c.role, db: c.database }], customData: { managedBy: c.purpose, installation: c.installation } });
  output({ prepared: true });
}

async function verify() {
  await assertMcpReady();
  const db = mongoose.connection.db;
  const auth = (await db.command({ connectionStatus: 1, showPrivileges: true })).authInfo;
  assert.deepEqual(auth.authenticatedUserRoles, [{ role: c.role, db: c.database }]);
  assert.deepEqual(normalized(auth.authenticatedUserPrivileges), normalized(privileges()));
  // These filters cannot match any document, even if a privilege regresses.
  const never = { $expr: { $eq: [1, 0] } };
  for (const m of [...lmsModels, model('McpAuditEvent')]) {
    await assert.rejects(m.collection.updateOne(never, { $set: { mcpPrivilegeProbe: true } }), e => e.code === 13);
    await assert.rejects(m.collection.deleteOne(never), e => e.code === 13);
  }
  const session = await mongoose.startSession();
  try { await session.withTransaction(async () => { await model('User').findOne({}).select('_id').session(session); },
    { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } }); }
  finally { await session.endSession(); }
  output({ runtimePrivileges: 'verified', lmsWrites: 'denied', auditUpdateDelete: 'denied', transaction: 'passed' });
}

async function accessSnapshot(request, session) {
  assert.match(request.email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  assert.ok(Array.isArray(request.scopes) && request.scopes.length > 1);
  assert.ok(request.scopes.includes('mcp_connect'));
  assert.ok(request.scopes.every(s => s !== 'offline_access' && Object.hasOwn(SCOPE_LABELS, s)));
  const user = await model('User').findOne({ email: request.email, isActive: true }).session(session || null).lean();
  assert.ok(user && user.role !== 'GUEST', 'Active existing account required');
  // Legacy LMS routes branch on the presence of customRoleId, not just its
  // permissions. Turning a default student/staff account into a custom-role
  // account can expand ordinary LMS access. Cloning an existing custom role
  // also breaks role-id-based lead assignment and future shared-role edits.
  // This first-production operator is therefore limited to default Super Admins.
  assert.ok(user.role === 'SUPER_ADMIN' && !user.customRoleId,
    'Initial production opt-in requires a tenant-bound Super Admin using default permissions');
  const tenant = await model('Tenant').findOne({ _id: user.tenantId, isActive: true }).session(session || null).lean();
  assert.ok(tenant, 'Account must belong to an active tenant');
  const originalPermissions = request.basePermissions[user.role]?.filter(p => !p.startsWith('mcp_'));
  assert.ok(Array.isArray(originalPermissions), 'Running LMS permission map required');
  // A new opt-in never silently changes an already enabled account's grants.
  assert.ok(!originalPermissions.includes('mcp_connect'), 'Account already has MCP access; use its existing role');
  const nativePermissions = originalPermissions.filter(p => !p.startsWith('mcp_'));
  const snapshot = { userId: String(user._id), tenantId: String(user.tenantId), email: user.email,
    tenantName: tenant.name, baseRole: user.role, originalRoleId: user.customRoleId ? String(user.customRoleId) : null,
    originalPermissions: [...originalPermissions].sort(), nativePermissions: [...nativePermissions].sort(),
    scopes: [...new Set(request.scopes)].sort() };
  return { ...snapshot, fingerprint: hash(snapshot) };
}

async function access(request) {
  if (command === 'access-plan') return output(await accessSnapshot(request));
  if (command === 'access-apply') {
    const session = await mongoose.startSession();
    const roleId = new mongoose.Types.ObjectId(request.newRoleId);
    let result;
    try { await session.withTransaction(async () => {
      // Recover a committed grant if the operator lost its terminal before
      // saving the result. The original request/new role id is saved in advance.
      const previous = await model('McpAuditEvent').findOne({ requestId: request.operationId,
        tool: 'operator_access_grant', userId: request.userId, tenantId: request.tenantId }).session(session).lean();
      if (previous) {
        const user = await model('User').findOne({ _id: request.userId, tenantId: request.tenantId }).session(session).lean();
        const role = await model('Role').findOne({ _id: roleId, tenantId: request.tenantId }).session(session).lean();
        assert.equal(user?.role, request.baseRole);
        assert.equal(user?.isActive, true);
        assert.equal(String(user?.customRoleId), String(roleId));
        assert.deepEqual([...role.permissions].sort(), [...new Set([...request.nativePermissions, ...request.scopes])].sort());
        const { basePermissions, operationId, ...saved } = request;
        result = { ...saved, applied: true };
        return;
      }
      const current = await accessSnapshot(request, session);
      assert.equal(current.fingerprint, request.fingerprint, 'Account/role changed since the access plan');
      const permissions = [...new Set([...current.nativePermissions, ...current.scopes])];
      await model('Role').create([{ _id: roleId, tenantId: current.tenantId,
        name: 'MCP access ' + current.userId, description: 'Explicit individual MCP opt-in; existing native permissions retained.', permissions }], { session });
      const updated = await model('User').updateOne({ _id: current.userId, tenantId: current.tenantId,
        customRoleId: current.originalRoleId || null, isActive: true }, { $set: { customRoleId: roleId } }, { session });
      assert.equal(updated.modifiedCount, 1);
      await model('McpAuditEvent').create([{ userId: current.userId, tenantId: current.tenantId,
        requestId: request.operationId, tool: 'operator_access_grant', reason: 'explicit_account_opt_in', outcome: 'allowed' }], { session });
      result = { ...current, newRoleId: String(roleId), applied: true };
    }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } }); }
    finally { await session.endSession(); }
    return output(result);
  }
  assert.equal(command, 'access-revoke');
  const session = await mongoose.startSession();
  try { await session.withTransaction(async () => {
    const user = await model('User').findOne({ _id: request.userId, tenantId: request.tenantId }).session(session).lean();
    assert.equal(String(user?.customRoleId), request.newRoleId, 'Account role changed; review before restoring');
    assert.equal(user.role, request.baseRole, 'Account base role changed');
    const role = await model('Role').findOne({ _id: request.newRoleId, tenantId: request.tenantId }).session(session).lean();
    assert.ok(role);
    assert.equal(await model('User').countDocuments({ customRoleId: request.newRoleId }).session(session), 1, 'Role is now shared');
    assert.deepEqual([...role.permissions].sort(), [...new Set([...request.nativePermissions, ...request.scopes])].sort(), 'Granted role changed');
    if (request.originalRoleId) {
      const original = await model('Role').findOne({ _id: request.originalRoleId, tenantId: request.tenantId }).session(session).lean();
      assert.ok(original && !original.permissions.includes('mcp_connect'), 'Original role no longer safely restores access');
    }
    await model('User').updateOne({ _id: request.userId, customRoleId: request.newRoleId },
      request.originalRoleId ? { $set: { customRoleId: request.originalRoleId } } : { $unset: { customRoleId: '' } }, { session });
    await model('Role').deleteOne({ _id: request.newRoleId, tenantId: request.tenantId }, { session });
    await model('McpOAuthGrant').updateMany({ userId: request.userId, tenantId: request.tenantId, revokedAt: null },
      { $set: { revokedAt: new Date() } }, { session });
    await model('McpAuditEvent').create([{ userId: request.userId, tenantId: request.tenantId,
      requestId: crypto.randomUUID(), tool: 'operator_access_revoke', reason: 'explicit_account_revoke', outcome: 'allowed' }], { session });
  }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } }); }
  finally { await session.endSession(); }
  output({ revoked: true });
}

async function main() {
  mcpConfig();
  const admin = command === 'verify' ? undefined : JSON.parse(fs.readFileSync('/run/mcp/admin.json', 'utf8'));
  await mongoose.connect(settings.uri(c, admin), { serverSelectionTimeoutMS: 10000, maxPoolSize: 3 });
  const db = mongoose.connection.db;
  assert.equal(db.databaseName, c.database);
  const h = await db.admin().command({ hello: 1 });
  assert.equal(h.setName, c.replica);
  assert.deepEqual(h.hosts, [c.hostname + ':27017']);
  // A production preparer never creates LMS users, tenants, fixtures or indexes.
  assert.ok(await model('User').exists({}), 'Existing LMS database required');
  if (command === 'prepare') await prepare(admin);
  else if (command === 'verify') await verify();
  else await access(JSON.parse(fs.readFileSync('/run/mcp/request.json', 'utf8')));
}
main().catch(() => { console.error('Production operator check failed. No secrets or database records were printed.'); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
