'use strict';
// Read-only host diagnostic streamed into the already deployed gateway. Uses
// its limited runtime account; never reads or mounts administrator credentials.
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const settings = require('/app/ops/mcp-production/settings.cjs');
mongoose.set('autoIndex', false);
mongoose.set('autoCreate', false);
const report = value => console.log('ACCOUNT_STATUS=' + JSON.stringify(value));
let stage = 'configuration';

async function main() {
  const c = settings.load();
  const email = process.argv[2];
  assert.ok(typeof email === 'string' && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
  stage = 'database_connection';
  await mongoose.connect(settings.uri(c), { serverSelectionTimeoutMS: 10000, maxPoolSize: 1 });
  const db = mongoose.connection.db;
  assert.equal(db.databaseName, c.database);
  const topology = await db.admin().command({ hello: 1 });
  assert.equal(topology.setName, c.replica);
  assert.deepEqual(topology.hosts, [c.hostname + ':27017']);
  stage = 'account_lookup';
  const user = await db.collection('users').findOne({ email }, {
    projection: { _id: 0, role: 1, isActive: 1, tenantId: 1, customRoleId: 1 }, maxTimeMS: 5000,
  });
  if (!user) return report({ accountFound: false, initialOptInEligible: false, reasons: ['ACCOUNT_NOT_FOUND'] });
  stage = 'tenant_lookup';
  const tenant = user.tenantId && await db.collection('tenants').findOne({ _id: user.tenantId }, {
    projection: { _id: 1, isActive: 1 }, maxTimeMS: 5000,
  });
  const reasons = [];
  if (user.isActive !== true) reasons.push('ACCOUNT_INACTIVE');
  if (user.role !== 'SUPER_ADMIN') reasons.push('DEFAULT_SUPER_ADMIN_REQUIRED');
  if (user.customRoleId) reasons.push('CUSTOM_ROLE_ALREADY_ASSIGNED');
  if (!user.tenantId) reasons.push('TENANT_NOT_ASSIGNED');
  else if (!tenant) reasons.push('TENANT_NOT_FOUND');
  else if (tenant.isActive !== true) reasons.push('TENANT_INACTIVE');
  const roles = ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR', 'STAFF', 'STUDENT', 'GUEST'];
  report({ accountFound: true, accountActive: user.isActive === true,
    baseRole: roles.includes(user.role) ? user.role : 'UNRECOGNIZED',
    customRoleAssigned: Boolean(user.customRoleId), tenantAssigned: Boolean(user.tenantId),
    tenantFound: Boolean(tenant), tenantActive: tenant?.isActive === true,
    initialOptInEligible: reasons.length === 0, reasons });
}
main().catch(() => { report({ diagnosticFailedAt: stage }); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
