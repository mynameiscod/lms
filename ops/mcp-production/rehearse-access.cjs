'use strict';
// Synthetic CI fixture only; guarded before any mutation.
const fs = require('node:fs');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const http = require('node:http');
const { execFileSync, spawn } = require('node:child_process');
const settings = require('./ops/mcp-production/settings.cjs');
const c = settings.load();
assert.equal(c.database, 'lms-mcp-test');
assert.equal(c.hostname, 'mcp-test-mongo');
assert.equal(c.installation, 'synthetic-ci');
const mongoose = require('mongoose');
mongoose.set('autoIndex', false); mongoose.set('autoCreate', false);
const model = name => require('./server/dist/models/' + name).default;
const admin = JSON.parse(fs.readFileSync('/run/mcp/admin.json', 'utf8'));
let child;
const operator = (action, request) => {
  fs.writeFileSync('/verify/request.json', JSON.stringify(request || {}));
  const value = execFileSync(process.execPath, ['ops/mcp-production/operator.cjs', action], { encoding: 'utf8', stdio: 'pipe' });
  return JSON.parse(value.split('\n').find(s => s.startsWith('PRODUCTION_JSON=')).slice(16));
};
async function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request('http://127.0.0.1:5000' + path, { ...options, timeout: 10000,
      headers: { Host: 'mcp-test.codebegun.com', 'X-Forwarded-Proto': 'https', ...options.headers } }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString();
        let body; try { body = JSON.parse(text); } catch { /* HTML */ }
        resolve({ status: res.statusCode, headers: res.headers, text, body });
      });
    });
    req.on('error', reject); req.on('timeout', () => req.destroy(new Error('Timeout'))); req.end(options.body);
  });
}
const form = (path, body, headers = {}) => request(path, { method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: c.issuer, ...headers },
  body: new URLSearchParams(body).toString() });
const csrf = r => /name="csrf" value="([A-Za-z0-9_-]+)"/.exec(r.text)?.[1];
const cookie = r => r.headers['set-cookie'].map(x => x.split(';')[0]).join('; ');
const rpc = (token, method, params = {}) => request('/mcp', { method: 'POST',
  headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });

async function main() {
  await mongoose.connect(settings.uri(c, admin), { serverSelectionTimeoutMS: 10000 });
  const collections = ['users', 'tenants', 'roles', 'batches', 'attendances', 'exams', 'fees', 'leads', 'outperocalls'];
  const rows = await Promise.all(collections.map(name => mongoose.connection.db.collection(name).find({}).sort({ _id: 1 }).toArray()));
  const baseline = crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex');
  if (process.argv[2] === 'snapshot') {
    fs.writeFileSync('/verify/lms-digest', baseline);
    return;
  }
  assert.equal(baseline, fs.readFileSync('/verify/lms-digest', 'utf8'), 'Preparation/OAuth modified LMS records');
  const User = model('User'), Role = model('Role');
  const user = await User.findOne({ email: 'admin-a@mcp-test.invalid' }).lean();
  const staff = await User.findOne({ email: 'staff-a@mcp-test.invalid' }).lean();
  const student = await User.findOne({ email: 'student-a@mcp-test.invalid' }).lean();
  const base = require('./server/dist/middleware/roleGuard').ROLE_PERMISSIONS;
  const basePermissions = Object.fromEntries(Object.entries(base).map(([key, value]) => [key, value.filter(p => !p.startsWith('mcp_'))]));
  const shared = await Role.create({ tenantId: user.tenantId, name: 'Existing shared CI role', permissions: basePermissions.SUPER_ADMIN });
  await User.updateOne({ _id: user._id }, { $set: { role: 'SUPER_ADMIN' } });
  await User.updateMany({ _id: { $in: [user._id, staff._id] } }, { $set: { customRoleId: shared._id } });
  const scopes = ['mcp_connect', 'mcp_students_read', 'mcp_batches_read'];
  const req = { email: user.email, basePermissions, scopes, newRoleId: new mongoose.Types.ObjectId().toString(), operationId: crypto.randomUUID() };
  const before = await Role.countDocuments();
  // Existing custom-role accounts must not be cloned: role-id-based lead
  // distribution and future shared-role permission changes must keep working.
  assert.throws(() => operator('access-plan', req));
  assert.equal(String((await User.findById(user._id)).customRoleId), String(shared._id));
  // A default student/staff must not acquire customRoleId just to connect MCP;
  // native LMS routes branch on its truthiness, beyond permission-array checks.
  for (const account of [staff, student]) {
    assert.ok(account);
    await User.updateOne({ _id: account._id }, { $unset: { customRoleId: '' } });
    assert.throws(() => operator('access-plan', { ...req, email: account.email }));
    assert.ok(!(await User.findById(account._id)).customRoleId);
  }
  assert.equal(await Role.countDocuments(), before);
  await User.updateOne({ _id: staff._id }, { $set: { customRoleId: shared._id } });
  await User.updateOne({ _id: user._id }, { $unset: { customRoleId: '' } });
  const plan = operator('access-plan', req);
  assert.equal(await Role.countDocuments(), before);
  assert.ok(!(await User.findById(user._id)).customRoleId);
  await User.updateOne({ _id: user._id }, { $set: { role: 'TENANT_ADMIN' } });
  assert.throws(() => operator('access-apply', { ...req, ...plan }), 'Stale account plan was accepted');
  assert.equal(await Role.countDocuments(), before);
  await User.updateOne({ _id: user._id }, { $set: { role: 'SUPER_ADMIN' } });
  const applied = operator('access-apply', { ...req, ...plan });
  assert.equal(operator('access-apply', { ...req, ...plan }).applied, true, 'Committed grant recovery failed');
  const granted = await Role.findById(req.newRoleId).lean();
  assert.deepEqual(granted.permissions.filter(p => !p.startsWith('mcp_')).sort(), [...basePermissions.SUPER_ADMIN].sort());
  assert.equal(String((await User.findById(staff._id)).customRoleId), String(shared._id));
  assert.deepEqual((await Role.findById(shared._id)).permissions, basePermissions.SUPER_ADMIN);
  assert.equal(await Role.countDocuments(), before + 1);
  // Advertise only the registered production scopes. ChatGPT discovers them here.
  c.clients = [c.clients.find(client => client.id === 'codebegun-mcp-smoke')];
  c.clients[0].scopes = scopes.concat('offline_access');
  fs.writeFileSync('/verify/runtime.json', JSON.stringify(c));
  child = spawn(process.execPath, ['ops/mcp-production/serve.cjs'], { stdio: 'ignore' });
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { if ((await request('/healthz')).status === 200) { ready = true; break; } } catch { /* startup */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(ready);
  assert.deepEqual((await request('/.well-known/oauth-authorization-server')).body.scopes_supported, scopes.concat('offline_access'));
  const verifier = crypto.randomBytes(48).toString('base64url');
  const query = new URLSearchParams({ response_type: 'code', client_id: 'codebegun-mcp-smoke',
    redirect_uri: 'http://127.0.0.1:8765/callback', scope: scopes.concat('offline_access').join(' '),
    resource: c.issuer + '/mcp', state: 'synthetic', code_challenge_method: 'S256',
    code_challenge: crypto.createHash('sha256').update(verifier).digest('base64url') });
  const start = await request('/mcp-oauth/authorize?' + query);
  assert.equal(start.status, 200);
  const login = await form('/mcp-oauth/login', { email: user.email, password: fs.readFileSync('/run/secrets/test_password', 'utf8').trim(),
    csrf: csrf(start) }, { Cookie: cookie(start) });
  assert.equal(login.status, 200);
  assert.ok(login.text.includes('Approve assistant access'));
  const consent = await form('/mcp-oauth/consent', { csrf: csrf(login), decision: 'approve' }, { Cookie: cookie(login) });
  assert.equal(consent.status, 303);
  const token = await form('/mcp-oauth/token', { grant_type: 'authorization_code', client_id: 'codebegun-mcp-smoke',
    redirect_uri: 'http://127.0.0.1:8765/callback', resource: c.issuer + '/mcp', code_verifier: verifier,
    code: new URL(consent.headers.location).searchParams.get('code') });
  assert.equal(token.status, 200);
  const list = await rpc(token.body.access_token, 'tools/list');
  assert.equal(list.body.result.tools.length, 3);
  const count = await rpc(token.body.access_token, 'tools/call', { name: 'codebegun_student_count', arguments: {} });
  assert.equal(JSON.parse(count.body.result.content[0].text).count, 2);
  assert.equal(operator('access-revoke', applied).revoked, true);
  assert.ok(!(await User.findById(user._id)).customRoleId);
  assert.equal(await Role.countDocuments(), before);
  assert.equal((await rpc(token.body.access_token, 'tools/list')).status, 401);
  console.log('PASS: unchanged LMS records, rejected student/staff/custom-role opt-in, read-only access preview, stale-plan rejection, default-admin grant/recovery, limited-scope OAuth and revocation.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(async () => {
  if (child && child.exitCode === null) {
    child.kill('SIGTERM');
    await new Promise(resolve => child.once('exit', resolve));
  }
  await mongoose.disconnect();
});
