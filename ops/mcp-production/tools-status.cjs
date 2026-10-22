'use strict';
// Read-only diagnosis using the existing limited runtime account. No token is
// minted and no grant/role is changed; counts are explicitly server diagnostics.
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const settings = require('/app/ops/mcp-production/settings.cjs');
mongoose.set('autoIndex', false);
mongoose.set('autoCreate', false);
const report = value => console.log('TOOL_STATUS=' + JSON.stringify(value));
let stage = 'configuration';

async function main() {
  const c = settings.load();
  const email = process.argv[2];
  assert.ok(typeof email === 'string' && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
  const model = name => require('/app/server/dist/models/' + name).default;
  const { identityFor } = require('/app/server/dist/mcp/identity');
  const { activeGrant } = require('/app/server/dist/mcp/oauthEngine');
  const { tools, canUseTool, executeTool } = require('/app/server/dist/mcp/tools');
  const { LMS_USERS_FILTER } = require('/app/server/dist/services/learnerAudience');
  stage = 'database_connection';
  await mongoose.connect(settings.uri(c), { serverSelectionTimeoutMS: 10000, maxPoolSize: 1 });
  assert.equal(mongoose.connection.db.databaseName, c.database);
  const topology = await mongoose.connection.db.admin().command({ hello: 1 });
  assert.equal(topology.setName, c.replica);
  assert.deepEqual(topology.hosts, [c.hostname + ':27017']);
  stage = 'account_access';
  const user = await model('User').findOne({ email }).select('_id tenantId').maxTimeMS(5000).lean();
  assert.ok(user?.tenantId);
  const identity = await identityFor(user._id, user.tenantId);
  const client = c.clients.find(x => x.id === (process.argv[3] || 'codebegun-production-chatgpt'));
  assert.ok(client);
  const permitted = tools.filter(t => canUseTool(identity, client.scopes, t));
  const result = { issuer: c.issuer, database: c.database, tenantId: String(user.tenantId),
    availableTools: permitted.map(t => t.name), validGrants: [], currentClientTokenChecked: false,
    countSource: 'production-runtime-diagnostic' };
  stage = 'connection_scopes';
  const grants = await model('McpOAuthGrant').find({ userId: user._id, tenantId: user.tenantId,
    clientId: client.id, issuer: c.issuer, audience: c.issuer + '/mcp', revokedAt: null,
    expiresAt: { $gt: new Date() } }).select('_id').sort({ createdAt: -1 }).limit(10).maxTimeMS(5000).lean();
  for (const row of grants) {
    let context;
    try { context = await activeGrant(row._id); }
    catch (error) {
      if (['invalid_token', 'invalid_grant', 'insufficient_scope', 'invalid_client'].includes(error.code)) continue;
      throw error;
    }
    result.validGrants.push({ scopes: context.grant.scopes,
      tools: tools.filter(t => canUseTool(context.identity, context.grant.scopes, t)).map(t => t.name) });
  }
  result.hasStudentCountGrant = result.validGrants.some(g => g.tools.includes('codebegun_student_count'));
  stage = 'student_count';
  const count = permitted.find(t => t.name === 'codebegun_student_count');
  if (count) {
    result.activeStudentsFromMcpQuery = (await executeTool(count, identity, client.scopes, {})).count;
    if (['SUPER_ADMIN', 'TENANT_ADMIN'].includes(identity.user.role)) {
      result.lmsStudentsAllStatuses = await model('User').countDocuments({
        tenantId: user.tenantId, role: 'STUDENT', ...LMS_USERS_FILTER,
      }).maxTimeMS(5000);
    }
  }
  report(result);
}
main().catch(() => { report({ diagnosticFailedAt: stage }); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
