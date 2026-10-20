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
const scopeOperator = (action, request) => {
  fs.writeFileSync('/verify/request.json', JSON.stringify(request));
  let value;
  try {
    value = execFileSync(process.execPath, ['ops/mcp-production/scopes.cjs', action], { encoding: 'utf8', stdio: 'pipe' });
  } catch (error) {
    // Surface only the operator's fixed reason code, never child output/secrets.
    const row = String(error.stdout || '').split('\n').find(s => s.startsWith('SCOPE_JSON='));
    const reason = row && JSON.parse(row.slice(11)).error;
    throw new Error('Synthetic scope ' + action + ' failed: ' +
      (typeof reason === 'string' && /^[a-z_]+$/.test(reason) ? reason : 'operator_failed'));
  }
  assert.ok(!value.includes(c.password), 'Scope operator printed a runtime credential');
  return JSON.parse(value.split('\n').find(s => s.startsWith('SCOPE_JSON=')).slice(11));
};
const diagnose = email => {
  const value = execFileSync(process.execPath, ['-', email], {
    input: fs.readFileSync('/verify/account-status.cjs', 'utf8'), encoding: 'utf8', stdio: 'pipe',
  });
  assert.ok(!value.includes(c.password), 'Diagnostic printed a runtime credential');
  return JSON.parse(value.split('\n').find(s => s.startsWith('ACCOUNT_STATUS=')).slice(15));
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
  assert.deepEqual(diagnose('absent@mcp-test.invalid').reasons, ['ACCOUNT_NOT_FOUND']);
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
  const req = { email: user.email, basePermissions, scopes, newRoleId: new mongoose.Types.ObjectId().toString(), operationId: crypto.randomUUID(),
    lmsSource: { name: 'lms-server-green', id: 'synthetic-live-container', imageId: 'synthetic-live-image' } };
  const before = await Role.countDocuments();
  // Existing custom-role accounts must not be cloned: role-id-based lead
  // distribution and future shared-role permission changes must keep working.
  assert.throws(() => operator('access-plan', req));
  assert.deepEqual(diagnose(user.email).reasons, ['CUSTOM_ROLE_ALREADY_ASSIGNED']);
  assert.equal(String((await User.findById(user._id)).customRoleId), String(shared._id));
  // A default student/staff must not acquire customRoleId just to connect MCP;
  // native LMS routes branch on its truthiness, beyond permission-array checks.
  for (const account of [staff, student]) {
    assert.ok(account);
    await User.updateOne({ _id: account._id }, { $unset: { customRoleId: '' } });
    assert.throws(() => operator('access-plan', { ...req, email: account.email }));
    assert.ok(!(await User.findById(account._id)).customRoleId);
    assert.deepEqual(diagnose(account.email).reasons, ['DEFAULT_SUPER_ADMIN_REQUIRED']);
  }
  assert.equal(await Role.countDocuments(), before);
  await User.updateOne({ _id: staff._id }, { $set: { customRoleId: shared._id } });
  await User.updateOne({ _id: user._id }, { $unset: { customRoleId: '' } });
  const beforeDiagnostic = await User.findById(user._id).lean();
  assert.equal(diagnose(user.email).initialOptInEligible, true);
  assert.deepEqual(await User.findById(user._id).lean(), beforeDiagnostic, 'Diagnostic changed the account');
  await User.updateOne({ _id: user._id }, { $set: { isActive: false } });
  assert.deepEqual(diagnose(user.email).reasons, ['ACCOUNT_INACTIVE']);
  await User.updateOne({ _id: user._id }, { $set: { isActive: true }, $unset: { tenantId: '' } });
  assert.deepEqual(diagnose(user.email).reasons, ['TENANT_NOT_ASSIGNED']);
  await User.updateOne({ _id: user._id }, { $set: { tenantId: user.tenantId } });
  const plan = operator('access-plan', req);
  assert.throws(() => operator('access-revoke', { ...req, ...plan }), 'Uncommitted access plan was revoked');
  assert.equal(await Role.countDocuments(), before);
  assert.ok(!(await User.findById(user._id)).customRoleId);
  await User.updateOne({ _id: user._id }, { $set: { role: 'TENANT_ADMIN' } });
  assert.throws(() => operator('access-apply', { ...req, ...plan }), 'Stale account plan was accepted');
  assert.equal(await Role.countDocuments(), before);
  await User.updateOne({ _id: user._id }, { $set: { role: 'SUPER_ADMIN' } });
  const applied = operator('access-apply', { ...req, ...plan });
  assert.equal(applied.applied, true);
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
  const resourceMetadata = await request('/.well-known/oauth-protected-resource/mcp');
  assert.deepEqual(resourceMetadata.body.scopes_supported, scopes);
  const anonymous = await rpc('', 'tools/list');
  assert.equal(anonymous.status, 401);
  const advertised = /(?:^|,\s*)scope="([^"]+)"/.exec(anonymous.headers['www-authenticate'])?.[1].split(' ');
  assert.deepEqual(advertised, scopes);
  const verifier = crypto.randomBytes(48).toString('base64url');
  const query = new URLSearchParams({ response_type: 'code', client_id: 'codebegun-mcp-smoke',
    redirect_uri: 'http://127.0.0.1:8765/callback', scope: advertised.concat('offline_access').join(' '),
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
  assert.deepEqual(token.body.scope.split(' '), scopes.concat('offline_access'));
  const list = await rpc(token.body.access_token, 'tools/list');
  assert.equal(list.body.result.tools.length, 3);
  const count = await rpc(token.body.access_token, 'tools/call', { name: 'codebegun_student_count', arguments: {} });
  assert.equal(JSON.parse(count.body.result.content[0].text).count, 2);
  // Reproduce a cached connect-only authorization request with the exact
  // production client allowlist. Extra permissions need a separate consent.
  query.set('scope', 'mcp_connect');
  let recovered;
  for (const decision of ['approve', 'approve_read']) {
    const recoveryStart = await request('/mcp-oauth/authorize?' + query);
    assert.equal(recoveryStart.status, 200);
    const recoveryLogin = await form('/mcp-oauth/login', {
      email: user.email, password: fs.readFileSync('/run/secrets/test_password', 'utf8').trim(), csrf: csrf(recoveryStart),
    }, { Cookie: cookie(recoveryStart) });
    assert.equal(recoveryLogin.status, 200);
    assert.ok(recoveryLogin.text.includes('Allow read access'));
    assert.ok(recoveryLogin.text.includes('Read permitted student profiles'));
    assert.ok(recoveryLogin.text.includes('Read permitted batches'));
    assert.ok(!recoveryLogin.text.includes('Read permitted fees'));
    const recoveryConsent = await form('/mcp-oauth/consent', { csrf: csrf(recoveryLogin), decision }, { Cookie: cookie(recoveryLogin) });
    assert.equal(recoveryConsent.status, 303);
    const recoveryToken = await form('/mcp-oauth/token', { grant_type: 'authorization_code', client_id: 'codebegun-mcp-smoke',
      redirect_uri: 'http://127.0.0.1:8765/callback', resource: c.issuer + '/mcp', code_verifier: verifier,
      code: new URL(recoveryConsent.headers.location).searchParams.get('code') });
    assert.equal(recoveryToken.status, 200);
    if (decision === 'approve') {
      assert.equal(recoveryToken.body.scope, 'mcp_connect');
      assert.equal(recoveryToken.body.refresh_token, undefined);
      assert.equal((await rpc(recoveryToken.body.access_token, 'tools/list')).status, 403);
    } else {
      assert.deepEqual(recoveryToken.body.scope.split(' '), scopes.concat('offline_access'));
      recovered = await form('/mcp-oauth/token', { grant_type: 'refresh_token', client_id: 'codebegun-mcp-smoke',
        resource: c.issuer + '/mcp', refresh_token: recoveryToken.body.refresh_token });
      assert.equal(recovered.status, 200);
      assert.deepEqual(recovered.body.scope.split(' '), scopes.concat('offline_access'));
      assert.equal((await rpc(recovered.body.access_token, 'tools/list')).body.result.tools.length, 3);
      const result = await rpc(recovered.body.access_token, 'tools/call', { name: 'codebegun_student_count', arguments: {} });
      assert.equal(JSON.parse(result.body.result.content[0].text).count, 2);
    }
  }
  // Recover an interrupted apply with only the original plan, even if the LMS
  // has subsequently deployed. The operator must verify the exact granted role.
  const allScopes = ['mcp_connect', ...new Set(require('./server/dist/mcp/tools').tools.map(t => t.scope))];
  const scopeRequest = { operationId: crypto.randomUUID(), email: user.email, clientId: 'codebegun-mcp-smoke',
    access: applied, oldScopes: scopes, newScopes: allScopes };
  const roleBeforeScope = await Role.findById(req.newRoleId).lean();
  const grantsBeforeScope = await model('McpOAuthGrant').find({}).sort({ _id: 1 }).lean();
  const scopePreview = scopeOperator('plan', scopeRequest);
  assert.equal(scopePreview.tools.length, 15);
  assert.deepEqual(await Role.findById(req.newRoleId).lean(), roleBeforeScope, 'Preview changed role');
  assert.deepEqual(await model('McpOAuthGrant').find({}).sort({ _id: 1 }).lean(), grantsBeforeScope, 'Preview changed consent');
  scopeRequest.fingerprint = scopePreview.fingerprint;
  await User.updateOne({ _id: staff._id }, { $set: { customRoleId: req.newRoleId } });
  assert.throws(() => scopeOperator('plan', scopeRequest), 'Shared role expansion was allowed');
  await User.updateOne({ _id: staff._id }, { $set: { customRoleId: shared._id } });
  await Role.updateOne({ _id: req.newRoleId }, { $pull: { permissions: 'view_fees' } });
  assert.throws(() => scopeOperator('apply', scopeRequest), 'Changed role was overwritten');
  await Role.updateOne({ _id: req.newRoleId }, { $set: { permissions: roleBeforeScope.permissions } });
  const Tenant = model('Tenant');
  const tenantBeforeScope = await Tenant.findById(user.tenantId).lean();
  await Tenant.updateOne({ _id: user.tenantId }, { $set: { 'modules.attendance': false } });
  assert.throws(() => scopeOperator('plan', scopeRequest), 'Disabled attendance module was bypassed');
  await Tenant.updateOne({ _id: user.tenantId }, tenantBeforeScope.modules === undefined
    ? { $unset: { modules: '' } } : { $set: { modules: tenantBeforeScope.modules } });
  assert.equal(scopeOperator('plan', scopeRequest).fingerprint, scopeRequest.fingerprint,
    'Synthetic tenant policy was not restored after the disabled-module probe');
  assert.equal(scopeOperator('apply', scopeRequest).completed, 'apply');
  const expandedRole = await Role.findById(req.newRoleId).lean();
  assert.deepEqual(expandedRole.permissions.filter(s => !s.startsWith('mcp_')).sort(),
    roleBeforeScope.permissions.filter(s => !s.startsWith('mcp_')).sort());
  assert.equal(String((await User.findById(user._id)).customRoleId), req.newRoleId);
  assert.deepEqual(await model('McpOAuthGrant').find({}).sort({ _id: 1 }).lean(), grantsBeforeScope, 'Expansion widened existing consent');
  async function restartWithScopes(nextScopes) {
    const stopped = new Promise(resolve => child.once('exit', resolve));
    child.kill('SIGTERM'); await stopped;
    c.clients[0].scopes = nextScopes.concat('offline_access');
    fs.writeFileSync('/verify/runtime.json', JSON.stringify(c));
    child = spawn(process.execPath, ['ops/mcp-production/serve.cjs'], { stdio: 'ignore' });
    for (let attempt = 0; attempt < 100; attempt++) {
      try { if ((await request('/healthz')).status === 200) return; } catch { /* startup */ }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('Synthetic scope gateway did not restart');
  }
  await restartWithScopes(allScopes);
  assert.equal((await rpc(token.body.access_token, 'tools/list')).body.result.tools.length, 3, 'Old access token expanded');
  const limitedRefresh = await form('/mcp-oauth/token', { grant_type: 'refresh_token', client_id: 'codebegun-mcp-smoke',
    resource: c.issuer + '/mcp', refresh_token: token.body.refresh_token });
  assert.equal(limitedRefresh.status, 200);
  assert.deepEqual(limitedRefresh.body.scope.split(' '), scopes.concat('offline_access'), 'Refresh widened consent');
  // Reproduce ChatGPT retaining the original students/batches request after
  // expansion. A hardcoded all-domain request would miss this consent failure.
  query.set('scope', scopes.join(' '));
  let expandedToken;
  for (const decision of ['approve', 'deny', 'approve_read']) {
    const expandedStart = await request('/mcp-oauth/authorize?' + query);
    const expandedLogin = await form('/mcp-oauth/login', { email: user.email,
      password: fs.readFileSync('/run/secrets/test_password', 'utf8').trim(), csrf: csrf(expandedStart) }, { Cookie: cookie(expandedStart) });
    assert.equal(expandedLogin.status, 200);
    assert.ok(expandedLogin.text.includes('Allow listed read access'));
    assert.ok(expandedLogin.text.includes('Allow requested access only'));
    assert.ok(!expandedLogin.text.includes('Connect without data access'));
    const labels = require('./server/dist/mcp/oauthPolicy').SCOPE_LABELS;
    for (const scope of allScopes.concat('offline_access')) assert.ok(expandedLogin.text.includes(labels[scope]));
    const expandedConsent = await form('/mcp-oauth/consent', { csrf: csrf(expandedLogin), decision }, { Cookie: cookie(expandedLogin) });
    assert.equal(expandedConsent.status, 303);
    const callback = new URL(expandedConsent.headers.location);
    if (decision === 'deny') {
      assert.equal(callback.searchParams.get('error'), 'access_denied');
      assert.equal(callback.searchParams.get('code'), null);
      continue;
    }
    const freshToken = await form('/mcp-oauth/token', { grant_type: 'authorization_code', client_id: 'codebegun-mcp-smoke',
      redirect_uri: 'http://127.0.0.1:8765/callback', resource: c.issuer + '/mcp', code_verifier: verifier,
      code: callback.searchParams.get('code') });
    assert.equal(freshToken.status, 200);
    if (decision === 'approve') {
      assert.deepEqual(freshToken.body.scope.split(' '), scopes, 'Normal approval expanded the request');
      assert.equal(freshToken.body.refresh_token, undefined);
      assert.equal((await rpc(freshToken.body.access_token, 'tools/list')).body.result.tools.length, 3);
    } else {
      expandedToken = freshToken;
      assert.deepEqual(expandedToken.body.scope.split(' '), allScopes.concat('offline_access'));
    }
  }
  assert.equal((await rpc(limitedRefresh.body.access_token, 'tools/list')).body.result.tools.length, 3, 'New consent expanded an old token');
  const expandedList = await rpc(expandedToken.body.access_token, 'tools/list');
  assert.equal(expandedList.body.result.tools.length, 15);
  for (const candidate of expandedList.body.result.tools) {
    const response = await rpc(expandedToken.body.access_token, 'tools/call', { name: candidate.name,
      arguments: candidate.inputSchema.properties.limit ? { limit: 1 } : {} });
    assert.equal(response.status, 200);
    assert.ok(response.body.result?.content, 'Expanded tool failed: ' + candidate.name);
    assert.notEqual(response.body.result.isError, true, 'Expanded tool returned an error: ' + candidate.name);
  }
  assert.equal(scopeOperator('rollback', scopeRequest).completed, 'rollback');
  assert.deepEqual((await Role.findById(req.newRoleId)).permissions.sort(), roleBeforeScope.permissions.sort());
  assert.equal((await rpc(expandedToken.body.access_token, 'tools/list')).status, 401, 'Expanded grant survived rollback');
  assert.equal((await rpc(limitedRefresh.body.access_token, 'tools/list')).body.result.tools.length, 3, 'Limited grant was revoked');
  // The client still advertises all domains here: the expanded grant must not revive.
  assert.equal((await rpc(expandedToken.body.access_token, 'tools/list')).status, 401);
  await restartWithScopes(scopes);
  assert.equal((await rpc(limitedRefresh.body.access_token, 'tools/list')).body.result.tools.length, 3);
  console.log('PASS: cached three-tool request: limited approval stays at three, denial issues no code, explicit expanded consent calls all 15 tools, old tokens stay limited, and rollback revokes expanded grants.');
  console.log('PASS: read-only scope preview, shared/drifted-role and disabled-module refusal, and unchanged native permissions.');
  assert.equal(operator('access-revoke', { ...req, ...plan }).revoked, true);
  assert.ok(!(await User.findById(user._id)).customRoleId);
  assert.equal(await Role.countDocuments(), before);
  assert.equal((await rpc(token.body.access_token, 'tools/list')).status, 401);
  assert.equal((await rpc(recovered.body.access_token, 'tools/list')).status, 401);
  console.log('PASS: connect-only consent remains limited; explicit read consent lists three tools, counts students, refreshes and revokes.');
  console.log('PASS: unchanged LMS records, rejected student/staff/custom-role opt-in, read-only access preview, stale-plan rejection, default-admin grant/recovery, limited-scope OAuth and revocation.');
  console.log('PASS: read-only runtime-account diagnosis distinguishes missing/inactive accounts, custom roles, unsupported base roles and missing tenants without exposing credentials.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(async () => {
  if (child && child.exitCode === null) {
    child.kill('SIGTERM');
    await new Promise(resolve => child.once('exit', resolve));
  }
  await mongoose.disconnect();
});
