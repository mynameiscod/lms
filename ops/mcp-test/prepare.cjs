'use strict';
const assert = require('node:assert/strict');
const settings = require('./settings.cjs');
settings.configure();
const mongoose = require('mongoose');
mongoose.set('autoIndex', false);
mongoose.set('autoCreate', false);
const bcrypt = require('bcryptjs');
const { mcpModels, assertMcpReady } = require('../../server/dist/mcp/bootstrap');
const { SCOPE_LABELS, mcpConfig } = require('../../server/dist/mcp/oauthPolicy');
const model = name => require('../../server/dist/models/' + name).default;
const lmsNames = ['User', 'Tenant', 'Role', 'Batch', 'Attendance', 'Exam', 'Fee', 'Lead', 'OutperoCall'];
const lmsModels = lmsNames.map(model);
const id = name => new mongoose.Types.ObjectId(settings.fixtureId(name));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  mcpConfig();
  await mongoose.connect(settings.uri(true, true), { serverSelectionTimeoutMS: 60000 });
  const db = mongoose.connection.db;
  assert.equal(db.databaseName, settings.database);
  const admin = db.admin();
  let hello = await admin.command({ hello: 1 });
  if (hello.setName && hello.setName !== settings.replica) throw new Error('Unexpected replica set');
  if (!hello.setName) {
    await admin.command({ replSetInitiate: { _id: settings.replica, members: [{ _id: 0, host: settings.hostname + ':27017' }] } });
  }
  for (let attempt = 0; attempt < 60; attempt++) {
    hello = await admin.command({ hello: 1 });
    if (hello.isWritablePrimary) break;
    await delay(1000);
  }
  assert.equal(hello.setName, settings.replica);
  assert.equal(hello.isWritablePrimary, true, 'Staging MongoDB did not elect a primary');
  assert.deepEqual(hello.hosts, [settings.hostname + ':27017']);
  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  const marker = await db.collection('mcp_staging_meta').findOne({ _id: 'synthetic-v1' });
  if (collections.length && !marker) throw new Error('Refusing to seed a non-empty, unmarked database');
  await db.collection('mcp_staging_meta').updateOne({ _id: 'synthetic-v1' },
    { $setOnInsert: { createdAt: new Date(), purpose: 'Synthetic MCP testing only' } }, { upsert: true });
  const password = await bcrypt.hash(settings.secret('test_password'), 12);
  const permissions = Object.keys(SCOPE_LABELS).filter(s => s !== 'offline_access').concat([
    'view_enrolled_students', 'view_courses', 'view_attendance', 'view_exams', 'view_fees',
    'view_placement', 'view_leads', 'manage_leads',
  ]);
  const insert = (name, key, fields) => model(name).collection.updateOne(
    { _id: id(key) }, { $setOnInsert: { ...fields, createdAt: new Date(), updatedAt: new Date() } }, { upsert: true });
  for (const tenant of ['a', 'b']) {
    const tenantId = id('tenant-' + tenant), roleId = id('role-' + tenant);
    await insert('Tenant', 'tenant-' + tenant, { name: 'Synthetic Tenant ' + tenant.toUpperCase(),
      slug: 'mcp-test-' + tenant, adminId: id('admin-' + tenant), isActive: true });
    await insert('Role', 'role-' + tenant, { tenantId, name: 'Explicit MCP test permissions', permissions });
    const accounts = [['admin', 'TENANT_ADMIN'], ['instructor', 'INSTRUCTOR'], ['staff', 'STAFF'],
      ['student', 'STUDENT'], ['other-student', 'STUDENT']];
    for (const [name, role] of accounts) {
      const key = name + '-' + tenant;
      await insert('User', key, { tenantId, customRoleId: roleId, role, password,
        email: key + '@mcp-test.invalid', firstName: 'Synthetic', lastName: key, isActive: true,
        leadDataScope: role === 'STAFF' ? 'OWN' : 'ALL',
        ...(role === 'STUDENT' ? { batchId: id((name === 'student' ? 'batch-' : 'other-batch-') + tenant),
          placement: { status: 'placed', company: 'Synthetic Company', role: 'Developer', ctc: 6, offers: 1 } } : {}) });
    }
    for (const [batch, student] of [['batch', 'student'], ['other-batch', 'other-student']]) {
      const batchId = id(batch + '-' + tenant), studentId = id(student + '-' + tenant);
      await insert('Batch', batch + '-' + tenant, { tenantId, name: 'Synthetic ' + batch + ' ' + tenant,
        instructors: batch === 'batch' ? [id('instructor-' + tenant), id('staff-' + tenant)] : [],
        isActive: true, startDate: new Date(), endDate: new Date(Date.now() + 86400000 * 150),
        capacity: 30, enrolledCount: 1, mode: 'online' });
      await insert('Attendance', 'attendance-' + student + '-' + tenant,
        { tenantId, studentId, batchId, date: new Date(), status: 'present', remarks: 'PRIVATE_FIXTURE' });
      await insert('Exam', 'exam-' + student + '-' + tenant,
        { tenantId, studentId, batchId, examName: 'Synthetic assessment', result: 'pass', percentage: 80, maxScore: 100, scoredMarks: 80 });
      await insert('Fee', 'fee-' + student + '-' + tenant,
        { tenantId, studentId, batchId, status: 'partial', totalAmount: 35000, paidAmount: 10000, dueAmount: 25000,
          payments: [{ transactionId: 'PRIVATE_FIXTURE' }] });
    }
    for (const owner of ['staff', 'admin']) {
      const leadId = id('lead-' + owner + '-' + tenant);
      await insert('Lead', 'lead-' + owner + '-' + tenant, { tenantId, assignedTo: id(owner + '-' + tenant),
        name: 'Synthetic lead ' + owner + ' ' + tenant, source: 'manual', archivedAt: null,
        phone: 'PRIVATE_FIXTURE', notes: 'PRIVATE_FIXTURE' });
      await insert('OutperoCall', 'call-' + owner + '-' + tenant, { tenantId, leadId,
        callId: 'synthetic-' + owner + '-' + tenant, status: 'completed', outcome: 'interested', durationSec: 60,
        summary: 'Synthetic test call; no real call was made.', transcript: 'PRIVATE_FIXTURE', recordingUrl: 'PRIVATE_FIXTURE' });
    }
  }
  await model('User').collection.createIndex({ email: 1 }, { unique: true });
  await model('User').collection.createIndex({ tenantId: 1, role: 1, isActive: 1 });
  for (const m of mcpModels) await m.createIndexes();
  await assertMcpReady();
  // Read-only LMS data; OAuth state may be updated. Audit update/delete is denied.
  const privileges = lmsModels.map(m => ({ resource: { db: settings.database, collection: m.collection.name }, actions: ['find'] }));
  for (const m of mcpModels) privileges.push({ resource: { db: settings.database, collection: m.collection.name },
    actions: m.modelName === 'McpAuditEvent' ? ['find', 'insert', 'listIndexes'] : ['find', 'insert', 'update', 'remove', 'listIndexes'] });
  const roleName = 'mcp_test_runtime';
  const existingRole = await db.command({ rolesInfo: roleName });
  await db.command({ [existingRole.roles.length ? 'updateRole' : 'createRole']: roleName, privileges, roles: [] });
  const userName = 'mcp_test_app';
  const existingUser = await db.command({ usersInfo: userName });
  await db.command({ [existingUser.users.length ? 'updateUser' : 'createUser']: userName,
    pwd: settings.secret('mongo_app_password'), roles: [{ role: roleName, db: settings.database }] });
  console.log('Prepared separate replica set, MCP indexes, least-privilege runtime and two synthetic tenants.');
}
main().catch(error => { console.error('Staging preparation failed (' + (error.codeName || error.name) + '). No production connection is accepted.'); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
