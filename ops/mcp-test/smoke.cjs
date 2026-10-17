'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const settings = require('./settings.cjs');
const publicMode = process.argv.includes('--public');
const base = publicMode ? settings.issuer : 'http://app:5000';
const clientId = 'codebegun-mcp-smoke';
const redirectUri = 'http://127.0.0.1:8765/callback';
const scopes = ['mcp_connect', 'mcp_students_read', 'mcp_batches_read', 'mcp_attendance_read',
  'mcp_assessments_read', 'mcp_finance_read', 'mcp_placements_read', 'mcp_leads_read', 'mcp_calls_read', 'offline_access'];
const tokens = new Set();
let checks = 0;
function check(value, message) { assert.ok(value, message); checks++; }
async function request(path, options = {}) {
  let status, headers, text;
  if (publicMode) {
    const response = await fetch(base + path, { ...options, redirect: 'manual', signal: AbortSignal.timeout(20000) });
    status = response.status;
    headers = response.headers;
    text = await response.text();
  } else {
    // Node's fetch ignores a custom Host header. Use the native HTTP client to
    // reproduce the canonical Host and HTTPS forwarding supplied by Nginx.
    const response = await new Promise((resolve, reject) => {
      const req = http.request(base + path, { ...options, timeout: 20000,
        headers: { Host: 'mcp-test.codebegun.com', 'X-Forwarded-Proto': 'https', ...options.headers } }, res => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('error', reject);
        res.on('end', () => resolve({ status: res.statusCode, text: Buffer.concat(chunks).toString('utf8'),
          headers: { get: name => {
            const value = res.headers[name.toLowerCase()];
            return Array.isArray(value) ? value.join(', ') : value || null;
          }, getSetCookie: () => res.headers['set-cookie'] || [] } }));
      });
      req.on('error', reject);
      req.on('timeout', () => req.destroy(new Error('Staging request timed out')));
      req.end(options.body);
    });
    ({ status, headers, text } = response);
  }
  let json;
  try { json = JSON.parse(text); } catch { /* Consent pages are HTML. */ }
  return { status, headers, text, json };
}
const form = (path, fields, headers = {}) => request(path, {
  method: 'POST', headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams(fields).toString(),
});
const cookie = r => r.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
const csrf = r => /name="csrf" value="([A-Za-z0-9_-]+)"/.exec(r.text)?.[1];
async function login(account) {
  const verifier = crypto.randomBytes(48).toString('base64url');
  const state = crypto.randomBytes(24).toString('base64url');
  const query = new URLSearchParams({ response_type: 'code', client_id: clientId, redirect_uri: redirectUri,
    resource: settings.issuer + '/mcp', scope: scopes.join(' '), state, code_challenge_method: 'S256',
    // Exercise the optional locale hint included by the actual ChatGPT client.
    ui_locales: 'en-US', code_challenge: crypto.createHash('sha256').update(verifier).digest('base64url') });
  const start = await request('/mcp-oauth/authorize?' + query);
  check(start.status === 200 && !!csrf(start), 'Authorization page failed');
  // no-referrer makes browsers send Origin: null on native form POSTs.
  check(start.headers.get('referrer-policy') === 'same-origin', 'Login page suppresses the browser form origin');
  check(start.headers.get('content-security-policy')?.includes("form-action 'self';"),
    'Password form permits an external destination');
  check(start.headers.get('set-cookie')?.includes('Secure') && start.headers.get('set-cookie')?.includes('HttpOnly'),
    'Secure browser cookie missing');
  const signed = await form('/mcp-oauth/login', { email: account + '@mcp-test.invalid',
    password: settings.secret('test_password'), csrf: csrf(start) }, { Cookie: cookie(start), Origin: settings.issuer });
  check(signed.status === 200 && signed.text.includes('Approve assistant access'), 'LMS login/consent failed');
  check(signed.headers.get('referrer-policy') === 'same-origin', 'Consent page suppresses the browser form origin');
  check(signed.headers.get('content-security-policy')?.includes(`form-action 'self' ${new URL(redirectUri).origin};`),
    'Consent form policy does not permit only the registered callback origin');
  check(cookie(start) !== cookie(signed), 'Browser session did not rotate');
  const consent = await form('/mcp-oauth/consent', { csrf: csrf(signed), decision: 'approve' },
    { Cookie: cookie(signed), Origin: settings.issuer });
  check(consent.status === 303 && consent.headers.get('referrer-policy') === 'no-referrer',
    'Consent did not redirect privately');
  const location = new URL(consent.headers.get('location'));
  check(location.origin + location.pathname === redirectUri && location.searchParams.get('state') === state &&
    location.searchParams.get('iss') === settings.issuer, 'OAuth state/issuer/redirect mismatch');
  const exchanged = await form('/mcp-oauth/token', { grant_type: 'authorization_code', client_id: clientId,
    redirect_uri: redirectUri, code: location.searchParams.get('code'), code_verifier: verifier, resource: settings.issuer + '/mcp' });
  check(exchanged.status === 200 && typeof exchanged.json?.access_token === 'string' &&
    typeof exchanged.json?.refresh_token === 'string', 'PKCE token exchange failed');
  tokens.add(exchanged.json.refresh_token);
  return exchanged.json;
}
const rpc = (token, method, params = {}) => request('/mcp', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token,
    'MCP-Protocol-Version': '2025-11-25' },
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
});
async function call(token, name, args = {}) {
  const r = await rpc(token, 'tools/call', { name, arguments: args });
  check(r.status === 200 && !!r.json?.result?.content?.[0]?.text, name + ' failed');
  check(!r.text.includes('PRIVATE_FIXTURE') && !r.text.includes('password'), name + ' exposed private fields');
  return JSON.parse(r.json.result.content[0].text);
}
const refresh = token => form('/mcp-oauth/token', { grant_type: 'refresh_token',
  refresh_token: token, client_id: clientId, resource: settings.issuer + '/mcp' });
const revoke = token => form('/mcp-oauth/revoke', { token, client_id: clientId });

async function main() {
  const metadata = await request('/.well-known/oauth-authorization-server');
  check(metadata.status === 200 && metadata.json?.issuer === settings.issuer, 'Issuer discovery failed (HTTP ' + metadata.status + ')');
  check(metadata.json?.code_challenge_methods_supported?.includes('S256'), 'PKCE metadata missing');
  for (const path of ['/.well-known/oauth-protected-resource', '/.well-known/oauth-protected-resource/mcp']) {
    const r = await request(path);
    check(r.status === 200 && r.json?.resource === settings.issuer + '/mcp', 'Resource discovery failed');
  }
  check((await rpc('invalid', 'tools/list')).status === 401, 'Anonymous MCP access was accepted');
  for (const path of ['/mcp-oauth/login', '/mcp-oauth/consent']) {
    for (const origin of ['null', 'https://untrusted.example']) {
      const denied = await form(path, {}, { Origin: origin });
      check(denied.status === 403 && denied.json?.error === 'invalid_origin', 'Untrusted form origin was accepted');
    }
  }
  const admin = await login('admin-a');
  const initialized = await rpc(admin.access_token, 'initialize', { protocolVersion: '2025-11-25',
    capabilities: {}, clientInfo: { name: 'codebegun-staging-smoke', version: '1.0' } });
  check(initialized.json?.result?.serverInfo?.name === 'codebegun-universal-mcp', 'MCP initialization failed');
  const listed = await rpc(admin.access_token, 'tools/list');
  check(listed.json?.result?.tools?.length === 15, 'Expected all 15 authorized tools');
  for (const tool of listed.json.result.tools) await call(admin.access_token, tool.name);
  check((await call(admin.access_token, 'codebegun_student_count')).count === 2, 'Tenant A student count mismatch');
  check((await call(admin.access_token, 'codebegun_students',
    { studentId: settings.fixtureId('student-b') })).items.length === 0, 'Foreign tenant record was exposed');
  const student = await login('student-a');
  check((await call(student.access_token, 'codebegun_students')).items.length === 1, 'Student self scope failed');
  check((await call(student.access_token, 'codebegun_students',
    { studentId: settings.fixtureId('other-student-a') })).items.length === 0, 'Student saw another student');
  const studentTools = await rpc(student.access_token, 'tools/list');
  check(!studentTools.json.result.tools.some(t => /codebegun_(leads|calls)/.test(t.name)), 'Student received CRM tools');
  const foreign = await login('admin-b');
  check((await call(foreign.access_token, 'codebegun_student_count')).count === 2, 'Tenant B count mismatch');
  check((await call(foreign.access_token, 'codebegun_students',
    { studentId: settings.fixtureId('student-a') })).items.length === 0, 'Reverse tenant isolation failed');
  const renewed = await refresh(admin.refresh_token);
  check(renewed.status === 200 && renewed.json.refresh_token !== admin.refresh_token, 'Refresh rotation failed');
  tokens.add(renewed.json.refresh_token);
  check((await rpc(renewed.json.access_token, 'tools/list')).status === 200, 'Rotated access token failed');
  check((await refresh(admin.refresh_token)).status === 400, 'Refresh replay was accepted');
  check((await rpc(renewed.json.access_token, 'tools/list')).status === 401, 'Replay did not revoke the grant');
  check((await revoke(student.refresh_token)).status === 200, 'Explicit revocation failed');
  check((await rpc(student.access_token, 'tools/list')).status === 401, 'Revoked access token was accepted');
  console.log('PASS: ' + checks + ' ' + (publicMode ? 'public HTTPS' : 'private Docker') +
    ' checks: discovery, LMS login, consent, PKCE, 15 tools, student/tenant isolation, rotation, replay and revocation.');
}
main().catch(error => { console.error('Staging smoke failed: ' + error.message); process.exitCode = 1; })
  .finally(async () => { for (const token of tokens) { try { await revoke(token); } catch { process.exitCode = 1; } } });
