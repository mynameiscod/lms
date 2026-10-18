import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import puppeteer from 'puppeteer';
import https from 'https';
import { mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { execFileSync } from 'child_process';
import mcpEndpoints from '../mcp';
import User from '../models/User';
import Tenant from '../models/Tenant';
import Role from '../models/Role';
import Batch from '../models/Batch';
import Attendance from '../models/Attendance';
import Exam from '../models/Exam';
import Fee from '../models/Fee';
import Lead from '../models/Lead';
import OutperoCall from '../models/OutperoCall';
import Grant from '../models/McpOAuthGrant';
import Code from '../models/McpOAuthCode';
import Access from '../models/McpOAuthAccessToken';
import Refresh from '../models/McpOAuthRefreshToken';
import Session from '../models/McpOAuthSession';
import Audit from '../models/McpAuditEvent';
import { McpRateLimit } from '../mcp/rateLimit';
import { tools } from '../mcp/tools';
import { SCOPE_LABELS } from '../mcp/oauthPolicy';
import { tokenDigest } from '../mcp/oauthSecurity';
import { assertMcpReady, mcpModels } from '../mcp/bootstrap';
import { LMS_USERS_FILTER } from '../services/learnerAudience';

const issuer = 'https://lms.example';
const resource = `${issuer}/mcp`;
const redirect = 'https://assistant.example/callback';
const clientId = 'integration-client';
const secondClientId = 'second-client';
const confidentialId = 'confidential-client';
const clientSecret = 'test-only-confidential-secret-' + 'x'.repeat(32);
const scopes = Object.keys(SCOPE_LABELS).join(' ');
const verifier = 'test-verifier-' + 'a'.repeat(43);
const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
const password = 'Integration-Password-Only-42';
const id = () => new mongoose.Types.ObjectId();
const tenantA = id(), tenantB = id(), admin = id(), instructor = id(), studentA = id(), studentOther = id(), studentB = id(), staff = id(), report = id();
const batchA = id(), batchOther = id(), batchB = id(), roleA = id(), roleB = id();
const leadA = id(), leadOther = id(), leadB = id(), leadTeam = id();
const native = ['view_enrolled_students', 'view_courses', 'view_attendance', 'view_exams', 'view_fees', 'view_placement', 'view_leads', 'manage_leads'];
const permissions = [...Object.keys(SCOPE_LABELS).filter(s => s !== 'offline_access'), ...native];
const models = [User, Tenant, Role, Batch, Attendance, Exam, Fee, Lead, OutperoCall, Grant, Code, Access, Refresh, Session, Audit, McpRateLimit];
let mongo: MongoMemoryReplSet;
let hashedPassword: string;
const saved = { ...process.env };
const app = express();
app.set('trust proxy', 1);
app.use(mcpEndpoints);
app.get('/unrelated', (_req, res) => res.json({ ok: true }));
const cookie = (response: any) => response.headers['set-cookie']?.map((c: string) => c.split(';')[0]).join('; ');
const csrf = (response: any) => /name="csrf" value="([A-Za-z0-9_-]+)"/.exec(response.text)?.[1] || '';
const authorization = (overrides: any = {}) => ({ response_type: 'code', client_id: clientId, redirect_uri: redirect,
  scope: scopes, state: 'state-preserved', resource, code_challenge: challenge, code_challenge_method: 'S256', ...overrides });
const call = (token: string, name: string, args: any = {}) => request(app).post('/mcp').set('Authorization', `Bearer ${token}`)
  .send({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args,
    _meta: { progressToken: 0, 'openai/locale': 'en-US' } } });
const payload = (r: any) => JSON.parse(r.body.result.content[0].text);
const exchange = (code: string, overrides: any = {}) => request(app).post('/mcp-oauth/token').type('form').send({
  grant_type: 'authorization_code', code, client_id: clientId, redirect_uri: redirect, code_verifier: verifier, resource, ...overrides,
});
const refresh = (token: string, overrides: any = {}) => request(app).post('/mcp-oauth/token').type('form').send({
  grant_type: 'refresh_token', refresh_token: token, client_id: clientId, resource, ...overrides,
});
async function login(email = 'admin@example.test', params: any = {}) {
  const start = await request(app).get('/mcp-oauth/authorize').query(authorization(params));
  expect(start.status).toBe(200);
  const signed = await request(app).post('/mcp-oauth/login').set('Cookie', cookie(start)).type('form')
    .send({ csrf: csrf(start), email, password });
  expect(signed.status).toBe(200);
  return { start, signed };
}
async function codeFor(email = 'admin@example.test', params: any = {}) {
  const { signed } = await login(email, params);
  const consent = await request(app).post('/mcp-oauth/consent').set('Cookie', cookie(signed)).type('form')
    .send({ csrf: csrf(signed), decision: 'approve' });
  expect(consent.status).toBe(303);
  const url = new URL(consent.headers.location);
  expect(url.searchParams.get('state')).toBe('state-preserved');
  expect(url.searchParams.get('iss')).toBe(issuer);
  return url.searchParams.get('code')!;
}
async function tokenFor(email = 'admin@example.test', params: any = {}) {
  const response = await exchange(await codeFor(email, params));
  expect(response.status).toBe(200);
  return response.body;
}

beforeAll(async () => {
  process.env.MCP_ENABLED = 'true';
  process.env.MCP_ISSUER_URL = issuer;
  process.env.MCP_RESOURCE_URL = resource;
  delete process.env.MCP_ALLOWED_ORIGINS;
  const registration = { name: 'Integration Assistant', applicationType: 'web',
    redirectUris: [redirect], scopes: Object.keys(SCOPE_LABELS), tokenEndpointAuthMethod: 'none' };
  process.env.MCP_OAUTH_CLIENTS = JSON.stringify([
    { ...registration, id: clientId }, { ...registration, id: secondClientId },
    { ...registration, id: confidentialId, tokenEndpointAuthMethod: 'client_secret_basic', secretHash: tokenDigest(clientSecret) },
  ]);
  hashedPassword = await bcrypt.hash(password, 10);
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 }, binary: { version: '7.0.24' } });
  await mongoose.connect(mongo.getUri());
  await Promise.all(models.map(m => m.init()));
  // Production MCP models never create indexes at application startup. This
  // disposable database gets the same explicit indexes as mcp:prepare.
  for (const model of mcpModels) await model.createIndexes();
}, 120000);
afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
  process.env = saved;
});
beforeEach(async () => {
  await Promise.all(models.map(m => m.collection.deleteMany({})));
  await Tenant.collection.insertMany([{ _id: tenantA, name: 'Tenant A', slug: 'tenant-a', isActive: true }, { _id: tenantB, name: 'Tenant B', slug: 'tenant-b', isActive: true }]);
  await Role.collection.insertMany([{ _id: roleA, tenantId: tenantA, name: 'MCP A', permissions }, { _id: roleB, tenantId: tenantB, name: 'MCP B', permissions }]);
  const base = { firstName: 'Test', lastName: 'User', password: hashedPassword, isActive: true, tenantId: tenantA, customRoleId: roleA };
  await User.collection.insertMany([
    { ...base, _id: admin, email: 'admin@example.test', role: 'TENANT_ADMIN' },
    { ...base, _id: instructor, email: 'instructor@example.test', role: 'INSTRUCTOR' },
    { ...base, _id: staff, email: 'staff@example.test', role: 'STAFF', leadDataScope: 'OWN' },
    { ...base, _id: report, email: 'report@example.test', role: 'STAFF', managerId: staff },
    { ...base, _id: studentA, email: 'student@example.test', role: 'STUDENT', batchId: batchA, placement: { status: 'placed', ctc: 7, company: 'A' } },
    { ...base, _id: studentOther, email: 'other@example.test', role: 'STUDENT', batchId: batchOther },
    { ...base, _id: studentB, email: 'foreign@example.test', role: 'STUDENT', tenantId: tenantB, customRoleId: roleB, batchId: batchB },
  ]);
  await Batch.collection.insertMany([
    { _id: batchA, name: 'Assigned A', tenantId: tenantA, instructors: [instructor], isActive: true },
    { _id: batchOther, name: 'Unassigned A', tenantId: tenantA, instructors: [], isActive: true },
    { _id: batchB, name: 'Foreign B', tenantId: tenantB, instructors: [instructor], isActive: true },
  ]);
  for (const [tenantId, studentId, batchId, amount] of [[tenantA, studentA, batchA, 100], [tenantA, studentOther, batchOther, 200], [tenantB, studentB, batchB, 900]] as any[]) {
    await Attendance.collection.insertOne({ tenantId, studentId, batchId, date: new Date(), status: 'present', remarks: 'private' });
    await Exam.collection.insertOne({ tenantId, studentId, batchId, examName: 'Exam', result: 'pass', percentage: amount, remarks: 'private' });
    await Fee.collection.insertOne({ tenantId, studentId, batchId, status: 'partial', totalAmount: amount * 2, paidAmount: amount, dueAmount: amount, payments: [{ transactionId: 'secret-transaction' }] });
  }
  await Lead.collection.insertMany([
    { _id: leadA, tenantId: tenantA, assignedTo: staff, source: 'meta', name: 'Own lead', phone: 'private-phone', notes: 'private-note' },
    { _id: leadOther, tenantId: tenantA, assignedTo: admin, source: 'manual', name: 'Other lead' },
    { _id: leadTeam, tenantId: tenantA, assignedTo: report, source: 'meta', name: 'Team lead' },
    { _id: leadB, tenantId: tenantB, assignedTo: staff, source: 'foreign', name: 'Foreign lead' },
  ]);
  await OutperoCall.collection.insertMany([
    { tenantId: tenantA, leadId: leadA, callId: 'own', status: 'completed', summary: 'A'.repeat(2000), recordingUrl: 'private-url', transcript: 'private-transcript', raw: ['secret-raw'], createdAt: new Date() },
    { tenantId: tenantA, leadId: leadOther, callId: 'other', status: 'completed', createdAt: new Date() },
    { tenantId: tenantA, leadId: leadTeam, callId: 'team', status: 'completed', createdAt: new Date() },
    { tenantId: tenantA, callId: 'unmatched', status: 'completed', createdAt: new Date() },
    { tenantId: tenantA, leadId: leadB, callId: 'bad-reference', status: 'completed', createdAt: new Date() },
    { tenantId: tenantB, leadId: leadA, callId: 'foreign', status: 'completed', createdAt: new Date() },
  ]);
});

describe('OAuth HTTP flow with real transactional MongoDB', () => {
  test('a real browser signs in, consents across origins, calls a tool and manages its connection', async () => {
    const previous = { ...process.env };
    const directory = mkdtempSync(join(tmpdir(), 'mcp-browser-'));
    const key = join(directory, 'key.pem'), cert = join(directory, 'cert.pem');
    let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
    let server: https.Server | undefined, callback: https.Server | undefined;
    try {
      execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
        '-subj', '/CN=127.0.0.1', '-addext', 'subjectAltName=IP:127.0.0.1', '-keyout', key, '-out', cert], { stdio: 'ignore' });
      const tls = { key: readFileSync(key), cert: readFileSync(cert) };
      const posts: Array<{ path: string; origin?: string; site?: string }> = [];
      server = https.createServer(tls, (req, res) => {
        if (req.method === 'POST') posts.push({ path: req.url || '', origin: req.headers.origin,
          site: req.headers['sec-fetch-site'] as string | undefined });
        app(req, res);
      });
      let callbackReferrer: string | undefined;
      callback = https.createServer(tls, (req, res) => {
        callbackReferrer = req.headers.referer;
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>Assistant callback</h1>');
      });
      await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve));
      await new Promise<void>(resolve => callback!.listen(0, '127.0.0.1', resolve));
      const browserIssuer = `https://127.0.0.1:${(server.address() as any).port}`;
      const browserRedirect = `https://127.0.0.1:${(callback.address() as any).port}/callback`;
      const browserResource = `${browserIssuer}/mcp`;
      process.env.MCP_ISSUER_URL = browserIssuer;
      process.env.MCP_RESOURCE_URL = browserResource;
      process.env.MCP_OAUTH_CLIENTS = JSON.stringify([{ id: clientId, name: 'Browser Assistant', applicationType: 'web',
        redirectUris: [browserRedirect], scopes: Object.keys(SCOPE_LABELS), tokenEndpointAuthMethod: 'none' }]);
      browser = await puppeteer.launch({ headless: true, acceptInsecureCerts: true, args: ['--no-sandbox'] });
      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(10000);
      const navigate = async (selector: string) => {
        const [response] = await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click(selector)]);
        expect(response?.status()).toBe(200);
        return response!;
      };
      const signIn = async () => {
        await page.type('input[name="email"]', 'admin@example.test');
        await page.type('input[name="password"]', password);
        return navigate('button[type="submit"]');
      };
      const start = await page.goto(`${browserIssuer}/mcp-oauth/authorize?${new URLSearchParams(authorization({
        resource: browserResource, redirect_uri: browserRedirect, ui_locales: 'en-US',
      }))}`);
      expect(start!.headers()['content-security-policy']).toContain("form-action 'self';");
      const signed = await signIn();
      expect(signed.headers()['content-security-policy']).toContain(`form-action 'self' ${new URL(browserRedirect).origin};`);
      expect(await page.$eval('h1', element => element.textContent)).toBe('Approve assistant access');
      expect(await Access.countDocuments()).toBe(0);
      await navigate('button[value="approve"]');
      const location = new URL(page.url());
      expect(location.origin + location.pathname).toBe(browserRedirect);
      expect(location.searchParams.get('state')).toBe('state-preserved');
      expect(location.searchParams.get('iss')).toBe(browserIssuer);
      expect(callbackReferrer).toBeUndefined();
      const token = await exchange(location.searchParams.get('code')!, { resource: browserResource, redirect_uri: browserRedirect });
      expect(token.status).toBe(200);
      expect(payload(await call(token.body.access_token, 'codebegun_student_count')).count).toBe(2);
      await page.goto(`${browserIssuer}/mcp-oauth/connections`);
      const management = await signIn();
      expect(management.headers()['content-security-policy']).toContain("form-action 'self';");
      expect(await page.$eval('h1', element => element.textContent)).toBe('Connected assistants');
      await navigate('form[action="/mcp-oauth/disconnect"] button');
      expect((await call(token.body.access_token, 'codebegun_student_count')).status).toBe(401);
      await navigate('form[action="/mcp-oauth/logout"] button');
      expect(await page.$eval('h1', element => element.textContent)).toBe('Signed out');
      expect(posts.map(post => post.path)).toEqual(['/mcp-oauth/login', '/mcp-oauth/consent',
        '/mcp-oauth/login', '/mcp-oauth/disconnect', '/mcp-oauth/logout']);
      expect(posts.every(post => post.origin === browserIssuer && post.site === 'same-origin')).toBe(true);
    } finally {
      if (browser) await browser.close();
      for (const listener of [server, callback]) if (listener) {
        listener.closeAllConnections();
        await new Promise<void>(resolve => listener!.close(() => resolve()));
      }
      process.env = previous;
      rmSync(directory, { recursive: true, force: true });
    }
  }, 60000);
  test('startup requires prepared indexes and rejects the prototype replay-breaking TTL', async () => {
    await expect(assertMcpReady()).resolves.toBeUndefined();
    await Code.collection.dropIndex('purgeAt_1');
    try { await expect(assertMcpReady()).rejects.toThrow('MCP indexes missing'); }
    finally { await Code.createIndexes(); }
    await Code.collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    try { await expect(assertMcpReady()).rejects.toThrow('prototype code TTL'); }
    finally { await Code.collection.dropIndex('expiresAt_1'); }
    await expect(assertMcpReady()).resolves.toBeUndefined();
  });
  test('discovery advertises issuer, resource, PKCE and revocation', async () => {
    const a = await request(app).get('/.well-known/oauth-authorization-server');
    expect(a.body.issuer).toBe(issuer);
    expect(a.body.code_challenge_methods_supported).toEqual(['S256']);
    expect(a.body.revocation_endpoint).toBe(`${issuer}/mcp-oauth/revoke`);
    expect((await request(app).get('/.well-known/oauth-protected-resource/mcp')).body.resource).toBe(resource);
    expect((await request(app).get('/unrelated')).body).toEqual({ ok: true });
  });
  test('ChatGPT locale hint permits LMS sign-in, session rotation and hashed tokens only after consent', async () => {
    const { start, signed } = await login('admin@example.test', { ui_locales: 'en-US' });
    const browser = await Session.findOne({ purpose: 'authorize' }).lean();
    expect(browser?.parameters).not.toHaveProperty('ui_locales');
    expect(cookie(start)).not.toBe(cookie(signed));
    expect(start.headers['set-cookie'][0]).toMatch(/HttpOnly/);
    expect(start.headers['set-cookie'][0]).toMatch(/Secure/);
    expect(start.headers['set-cookie'][0]).toMatch(/SameSite=Lax/);
    expect(start.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(await Access.countDocuments()).toBe(0);
    expect(signed.text).toContain('Approve assistant access');
    expect(signed.text).toContain('Tenant A');
    const consent = await request(app).post('/mcp-oauth/consent').set('Cookie', cookie(signed)).type('form').send({ csrf: csrf(signed), decision: 'approve' });
    const code = new URL(consent.headers.location).searchParams.get('code')!;
    const token = await exchange(code);
    expect(token.status).toBe(200);
    expect(token.body.access_token).toHaveLength(43);
    expect(token.body.refresh_token).toHaveLength(43);
    expect(token.headers['cache-control']).toBe('no-store');
    const stored = JSON.stringify(await Access.find().lean()) + JSON.stringify(await Refresh.find().lean()) + JSON.stringify(await Code.find().lean()) + JSON.stringify(await Audit.find().lean());
    for (const secret of [code, token.body.access_token, token.body.refresh_token, password]) expect(stored).not.toContain(secret);
  });
  test('denial returns state and issuer without creating a grant', async () => {
    const { signed } = await login();
    const r = await request(app).post('/mcp-oauth/consent').set('Cookie', cookie(signed)).type('form').send({ csrf: csrf(signed), decision: 'deny' });
    expect(new URL(r.headers.location).searchParams.get('error')).toBe('access_denied');
    expect(new URL(r.headers.location).searchParams.get('state')).toBe('state-preserved');
    expect(await Grant.countDocuments()).toBe(0);
  });
  test.each([
    { redirect_uri: `${redirect}/extra` }, { redirect_uri: 'https://evil.example/callback' }, { response_type: 'token' },
    { code_challenge_method: 'plain' }, { code_challenge: 'bad' }, { resource: 'https://elsewhere/mcp' },
    { scope: 'mcp_connect mcp_write' }, { client_id: 'unknown-client' },
  ])('rejects invalid authorization without redirecting %j', async changes => {
    const r = await request(app).get('/mcp-oauth/authorize').query(authorization(changes));
    expect(r.status).toBeGreaterThanOrEqual(400);
    expect(r.headers.location).toBeUndefined();
    expect(await Session.countDocuments()).toBe(0);
  });
  test('rejects duplicate and structured OAuth parameters', async () => {
    const q = new URLSearchParams(authorization()).toString();
    expect((await request(app).get(`/mcp-oauth/authorize?${q}&client_id=other`)).status).toBe(400);
    expect((await request(app).post('/mcp-oauth/token').type('form').send('client_id[x]=y&grant_type=authorization_code')).status).toBe(400);
  });
  test('login and consent require CSRF and a first-party origin', async () => {
    const { start, signed } = await login();
    expect((await request(app).post('/mcp-oauth/login').set('Cookie', cookie(start)).type('form').send({ email: 'admin@example.test', password })).status).toBe(403);
    expect((await request(app).post('/mcp-oauth/consent').set('Cookie', cookie(signed)).type('form').send({ csrf: 'bad', decision: 'approve' })).status).toBe(403);
    expect((await request(app).post('/mcp-oauth/consent').set('Cookie', cookie(signed)).set('Origin', 'https://evil.example').type('form').send({ csrf: csrf(signed), decision: 'approve' })).status).toBe(403);
    expect(await Code.countDocuments()).toBe(0);
  });
  test('consent cannot be replayed or have its client/scope replaced', async () => {
    const { signed } = await login();
    const post = (extra: any = {}) => request(app).post('/mcp-oauth/consent').set('Cookie', cookie(signed)).type('form').send({ csrf: csrf(signed), decision: 'approve', ...extra });
    expect((await post({ scope: scopes })).status).toBe(400);
    expect((await post()).status).toBe(303);
    expect((await post()).status).toBe(403);
    expect(await Code.countDocuments()).toBe(1);
  });
  test('expired browser sessions cannot consent', async () => {
    const { signed } = await login();
    await Session.updateMany({}, { $set: { expiresAt: new Date(0) } });
    expect((await request(app).post('/mcp-oauth/consent').set('Cookie', cookie(signed)).type('form').send({ csrf: csrf(signed), decision: 'approve' })).status).toBe(403);
  });
  test.each([{ code_verifier: 'wrong'.repeat(12) }, { code_verifier: 'short' }, { code_verifier: '' }, { redirect_uri: `${redirect}/wrong` }])('invalid PKCE or redirect consumes the code %j', async changes => {
    const code = await codeFor();
    expect((await exchange(code, changes)).status).toBe(400);
    expect((await exchange(code)).status).toBe(400);
    expect(await Access.countDocuments()).toBe(0);
  });
  test('wrong resource and unregistered client cannot exchange codes', async () => {
    const code = await codeFor();
    expect((await exchange(code, { resource: 'https://other/mcp' })).body.error).toBe('invalid_target');
    expect((await exchange(code, { client_id: 'unknown-client' })).status).toBe(401);
    expect((await exchange(code)).status).toBe(200);
  });
  test('a different registered client cannot exchange, refresh or revoke another client grant', async () => {
    const code = await codeFor();
    expect((await exchange(code, { client_id: secondClientId })).status).toBe(400);
    const first = await exchange(code);
    expect(first.status).toBe(200);
    expect((await refresh(first.body.refresh_token, { client_id: secondClientId })).status).toBe(400);
    expect((await request(app).post('/mcp-oauth/revoke').type('form').send({ client_id: secondClientId, token: first.body.refresh_token })).status).toBe(200);
    expect((await call(first.body.access_token, 'codebegun_student_count')).status).toBe(200);
    expect((await refresh(first.body.refresh_token)).status).toBe(200);
  });
  test('confidential code, refresh and revocation endpoints require Basic authentication in addition to PKCE', async () => {
    const code = await codeFor('admin@example.test', { client_id: confidentialId });
    expect((await exchange(code, { client_id: confidentialId })).status).toBe(401);
    const authenticate = (path: string, body: any, secret = clientSecret) => request(app).post(path)
      .auth(confidentialId, secret).type('form').send(body);
    const body = { grant_type: 'authorization_code', code, redirect_uri: redirect, code_verifier: verifier, resource };
    expect((await authenticate('/mcp-oauth/token', body, 'incorrect-secret')).status).toBe(401);
    const first = await authenticate('/mcp-oauth/token', body);
    expect(first.status).toBe(200);
    expect((await refresh(first.body.refresh_token, { client_id: confidentialId })).status).toBe(401);
    const second = await authenticate('/mcp-oauth/token', { grant_type: 'refresh_token', refresh_token: first.body.refresh_token, resource });
    expect(second.status).toBe(200);
    expect((await request(app).post('/mcp-oauth/revoke').type('form').send({ client_id: confidentialId, token: second.body.refresh_token })).status).toBe(401);
    expect((await authenticate('/mcp-oauth/revoke', { token: second.body.refresh_token })).status).toBe(200);
    expect((await call(second.body.access_token, 'codebegun_student_count')).status).toBe(401);
  });
  test('simultaneous code redemption detects replay and revokes the winning grant', async () => {
    const code = await codeFor();
    const responses = await Promise.all([exchange(code), exchange(code)]);
    expect(responses.map(r => r.status).sort()).toEqual([200, 400]);
    const winner = responses.find(r => r.status === 200)!;
    expect((await call(winner.body.access_token, 'codebegun_student_count')).status).toBe(401);
  });
  test('expired codes are denied', async () => {
    const code = await codeFor();
    await Code.updateMany({}, { $set: { expiresAt: new Date(0) } });
    expect((await exchange(code)).status).toBe(400);
  });
  test('authorization code replay revokes issued access and refresh tokens', async () => {
    const code = await codeFor();
    const token = (await exchange(code)).body;
    expect((await exchange(code)).status).toBe(400);
    expect((await call(token.access_token, 'codebegun_student_count')).status).toBe(401);
    expect((await refresh(token.refresh_token)).status).toBe(400);
  });
  test('refresh rotates; reuse invalidates the entire grant family', async () => {
    const first = await tokenFor();
    const second = await refresh(first.refresh_token);
    expect(second.status).toBe(200);
    expect(second.body.refresh_token).not.toBe(first.refresh_token);
    expect((await refresh(first.refresh_token)).status).toBe(400);
    expect((await call(second.body.access_token, 'codebegun_student_count')).status).toBe(401);
    expect((await refresh(second.body.refresh_token)).status).toBe(400);
  });
  test('simultaneous refresh requests cannot leave a usable descendant after replay', async () => {
    const first = await tokenFor();
    const responses = await Promise.all([refresh(first.refresh_token), refresh(first.refresh_token)]);
    expect(responses.map(r => r.status).sort()).toEqual([200, 400]);
    const winner = responses.find(r => r.status === 200)!;
    expect((await call(winner.body.access_token, 'codebegun_student_count')).status).toBe(401);
  });
  test('refresh narrows scope and never expands it', async () => {
    const first = await tokenFor('admin@example.test', { scope: 'mcp_connect mcp_students_read offline_access' });
    expect((await refresh(first.refresh_token, { scope: 'mcp_connect mcp_finance_read' })).body.error).toBe('invalid_scope');
    const second = await refresh(first.refresh_token, { scope: 'mcp_connect' });
    expect(second.status).toBe(200);
    expect(second.body.scope).toBe('mcp_connect');
    expect(second.body.refresh_token).toBeUndefined();
    expect((await call(second.body.access_token, 'codebegun_student_count')).body.error.code).toBe(-32003);
  });
  test('offline access is explicit and expired refresh tokens fail', async () => {
    expect((await tokenFor('admin@example.test', { scope: 'mcp_connect mcp_students_read' })).refresh_token).toBeUndefined();
    const token = await tokenFor();
    await Refresh.updateMany({}, { $set: { expiresAt: new Date(0) } });
    expect((await refresh(token.refresh_token)).status).toBe(400);
  });
  test('refresh expiration cannot extend the absolute grant lifetime', async () => {
    const token = await tokenFor();
    const end = new Date(Date.now() + 100000);
    await Grant.updateMany({}, { $set: { expiresAt: end } });
    const result = await refresh(token.refresh_token);
    expect(result.status).toBe(200);
    const stored = await Refresh.findOne({ tokenHash: tokenDigest(result.body.refresh_token) }).lean();
    expect(stored!.expiresAt.getTime()).toBe(end.getTime());
  });
  test('RFC7009 revocation is idempotent and revokes the grant immediately', async () => {
    const token = await tokenFor();
    const revoke = (value: string) => request(app).post('/mcp-oauth/revoke').type('form').send({ client_id: clientId, token: value });
    expect((await revoke(token.access_token)).status).toBe(200);
    expect((await revoke(token.access_token)).status).toBe(200);
    expect((await revoke('unknown')).status).toBe(200);
    expect((await call(token.access_token, 'codebegun_student_count')).status).toBe(401);
    expect((await refresh(token.refresh_token)).status).toBe(400);
  });
  test('concurrent revocation and refresh cannot leave a usable descendant', async () => {
    const first = await tokenFor();
    const [rotated, revoked] = await Promise.all([
      refresh(first.refresh_token),
      request(app).post('/mcp-oauth/revoke').type('form').send({ client_id: clientId, token: first.refresh_token }),
    ]);
    expect(revoked.status).toBe(200);
    expect([200, 400]).toContain(rotated.status);
    expect((await call(first.access_token, 'codebegun_student_count')).status).toBe(401);
    if (rotated.status === 200) {
      expect((await call(rotated.body.access_token, 'codebegun_student_count')).status).toBe(401);
      expect((await refresh(rotated.body.refresh_token)).status).toBe(400);
    }
  });
  test.each(['user', 'tenant', 'password', 'grant expiry', 'connect permission'])('refresh checks current %s state', async change => {
    const first = await tokenFor();
    if (change === 'user') await User.updateOne({ _id: admin }, { $set: { isActive: false } });
    if (change === 'tenant') await Tenant.updateOne({ _id: tenantA }, { $set: { isActive: false } });
    if (change === 'password') await User.collection.updateOne({ _id: admin }, { $set: { password: 'changed-hash' } });
    if (change === 'grant expiry') await Grant.updateMany({}, { $set: { expiresAt: new Date(0) } });
    if (change === 'connect permission') await Role.updateOne({ _id: roleA }, { $pull: { permissions: 'mcp_connect' } });
    expect((await refresh(first.refresh_token)).status).toBe(400);
    expect(await Access.countDocuments()).toBe(1);
  });
  test('connection management disconnects only the signed-in user grants', async () => {
    const token = await tokenFor();
    const other = await tokenFor('student@example.test');
    const start = await request(app).get('/mcp-oauth/connections');
    const signed = await request(app).post('/mcp-oauth/login').set('Cookie', cookie(start)).type('form').send({ csrf: csrf(start), email: 'admin@example.test', password });
    const r = await request(app).post('/mcp-oauth/disconnect').set('Cookie', cookie(signed)).type('form').send({ csrf: csrf(signed), grant_id: 'all' });
    expect(r.status).toBe(200);
    expect((await call(token.access_token, 'codebegun_student_count')).status).toBe(401);
    expect((await call(other.access_token, 'codebegun_student_count')).body.error).toBeUndefined();
  });
  test('a storage failure rolls back code consumption and tokens', async () => {
    const code = await codeFor();
    const write = jest.spyOn(Refresh, 'create').mockRejectedValueOnce(new Error('database secret detail'));
    const r = await exchange(code);
    write.mockRestore();
    expect(r.status).toBe(503);
    expect(r.text).not.toContain('database secret detail');
    expect(await Access.countDocuments()).toBe(0);
    expect((await Code.findOne().lean())!.consumedAt).toBeUndefined();
    expect((await exchange(code)).status).toBe(200);
  });
});

describe('OAuth resource, data isolation and audit boundary', () => {
  test('rejects missing, ordinary LMS JWT and URL bearer tokens with discovery challenge', async () => {
    const r = await request(app).post('/mcp').send({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
    expect(r.status).toBe(401);
    expect(r.headers['www-authenticate']).toContain('oauth-protected-resource/mcp');
    const ordinary = jwt.sign({ id: String(admin), tenantId: String(tenantA), role: 'TENANT_ADMIN' }, 'test-secret-key');
    expect((await call(ordinary, 'codebegun_student_count')).status).toBe(401);
    expect((await request(app).post('/mcp?access_token=not-allowed').send({})).status).toBe(401);
  });
  test('production cannot be enabled with legacy JWT bypass flags', async () => {
    process.env.NODE_ENV = 'production';
    process.env.MCP_INTERNAL_ENABLED = 'true';
    process.env.MCP_AUTH_MODE = 'jwt';
    try {
      const r = await request(app).post('/mcp').set('Host', 'lms.example').set('X-Forwarded-Proto', 'https').send({});
      expect(r.status).toBe(401);
      expect((await request(app).get('/.well-known/oauth-authorization-server')).status).toBe(400);
      expect((await request(app).get('/.well-known/oauth-authorization-server').set('Host', 'evil.example').set('X-Forwarded-Proto', 'https')).status).toBe(400);
    } finally {
      process.env.NODE_ENV = 'test';
      delete process.env.MCP_INTERNAL_ENABLED;
      delete process.env.MCP_AUTH_MODE;
    }
  });
  test('explicit feature switch is required', async () => {
    delete process.env.MCP_ENABLED;
    try { expect((await request(app).get('/.well-known/oauth-authorization-server')).status).toBe(404); }
    finally { process.env.MCP_ENABLED = 'true'; }
  });
  test.each(['user', 'tenant', 'role', 'connect', 'password', 'audience', 'issuer', 'expiry', 'client'])('invalidates access on %s change', async change => {
    const token = await tokenFor();
    if (change === 'user') await User.updateOne({ _id: admin }, { $set: { isActive: false } });
    if (change === 'tenant') await Tenant.updateOne({ _id: tenantA }, { $set: { isActive: false } });
    if (change === 'role') await Role.deleteOne({ _id: roleA });
    if (change === 'connect') await Role.updateOne({ _id: roleA }, { $pull: { permissions: 'mcp_connect' } });
    if (change === 'password') await User.collection.updateOne({ _id: admin }, { $set: { password: 'changed-password-hash' } });
    if (change === 'audience') await Access.updateMany({}, { $set: { audience: 'https://foreign/mcp' } });
    if (change === 'issuer') await Access.updateMany({}, { $set: { issuer: 'https://foreign' } });
    if (change === 'expiry') await Access.updateMany({}, { $set: { expiresAt: new Date(0) } });
    const clients = process.env.MCP_OAUTH_CLIENTS;
    if (change === 'client') process.env.MCP_OAUTH_CLIENTS = JSON.stringify([{ ...JSON.parse(clients!)[0], id: 'different-client' }]);
    try { expect([401, 403]).toContain((await call(token.access_token, 'codebegun_student_count')).status); }
    finally { process.env.MCP_OAUTH_CLIENTS = clients; }
  });
  test('moving a user or assigning a foreign custom role fails closed', async () => {
    const token = await tokenFor();
    await User.updateOne({ _id: admin }, { $set: { customRoleId: roleB } });
    expect((await call(token.access_token, 'codebegun_student_count')).status).toBe(403);
    await User.updateOne({ _id: admin }, { $set: { customRoleId: roleA, tenantId: tenantB } });
    expect((await call(token.access_token, 'codebegun_student_count')).status).toBe(401);
  });
  test('domain permission revocation and module switches take effect on the next call', async () => {
    const token = await tokenFor();
    expect(payload(await call(token.access_token, 'codebegun_student_count')).count).toBe(2);
    await Role.updateOne({ _id: roleA }, { $pull: { permissions: 'mcp_students_read' } });
    expect((await call(token.access_token, 'codebegun_student_count')).body.error.code).toBe(-32003);
    await Tenant.updateOne({ _id: tenantA }, { $set: { 'modules.attendance': false } });
    expect((await call(token.access_token, 'codebegun_attendance_summary')).body.error.code).toBe(-32003);
  });
  test('super-admin receives no implicit MCP privilege', async () => {
    await User.updateOne({ _id: admin }, { $set: { role: 'SUPER_ADMIN' }, $unset: { customRoleId: 1 } });
    const start = await request(app).get('/mcp-oauth/authorize').query(authorization());
    expect((await request(app).post('/mcp-oauth/login').set('Cookie', cookie(start)).type('form').send({ csrf: csrf(start), email: 'admin@example.test', password })).status).toBe(403);
  });
  test('all tool domains execute real queries and remain in the authenticated tenant', async () => {
    const token = await tokenFor();
    for (const candidate of tools) {
      const r = await call(token.access_token, candidate.name);
      expect(r.status).toBe(200);
      expect(r.body.error).toBeUndefined();
      const data = payload(r);
      expect(JSON.stringify(data)).not.toContain('Foreign');
      expect(JSON.stringify(data)).not.toContain('private-');
      expect(JSON.stringify(data)).not.toContain('secret-');
    }
    expect(payload(await call(token.access_token, 'codebegun_fee_summary')).groups[0]).toMatchObject({ count: 2, paid: 300, due: 300 });
    expect(payload(await call(token.access_token, 'codebegun_exam_summary'))[0].averagePercentage).toBe(150);
    expect(payload(await call(token.access_token, 'codebegun_student_count')).count).toBe(2);
    expect(payload(await call(token.access_token, 'codebegun_placement_summary')).groups).toEqual(expect.arrayContaining([expect.objectContaining({ _id: 'placed', count: 1, averageCtc: 7 })]));
  });
  test('student count and listing use the LMS audience, retain dual members, and exclude inactive and foreign students', async () => {
    const memberMissingBatch = id(), memberNullBatch = id(), dualMember = id();
    const base = { tenantId: tenantA, role: 'STUDENT', isActive: true, firstName: 'Audience', lastName: 'Fixture' };
    await User.collection.insertMany([
      { ...base, _id: memberMissingBatch, email: 'cp-only@example.test', passport: { product: 'career-pilot' } },
      { ...base, _id: memberNullBatch, email: 'cp-null-batch@example.test', passport: { product: 'career-pilot' }, batchId: null },
      { ...base, _id: dualMember, email: 'dual-member@example.test', passport: { product: 'career-pilot' }, batchId: batchA },
      { ...base, email: 'inactive-lms@example.test', isActive: false, batchId: batchA },
    ]);
    // The Users card includes inactive LMS students; the MCP tool explicitly
    // counts active LMS students. Neither should include CareerPilot-only users.
    expect(await User.countDocuments({ tenantId: tenantA, role: 'STUDENT', ...LMS_USERS_FILTER })).toBe(4);
    const token = await tokenFor();
    expect(payload(await call(token.access_token, 'codebegun_student_count')).count).toBe(3);
    const listed = payload(await call(token.access_token, 'codebegun_students'));
    expect(listed.items.map((u: any) => u._id).sort()).toEqual([studentA, studentOther, dualMember].map(String).sort());
    for (const excluded of [memberMissingBatch, memberNullBatch, studentB]) {
      expect(payload(await call(token.access_token, 'codebegun_student_count', { studentId: String(excluded) })).count).toBe(0);
      expect(payload(await call(token.access_token, 'codebegun_students', { recordId: String(excluded) })).items).toEqual([]);
    }
    expect(payload(await call(token.access_token, 'codebegun_student_count', { batchId: String(batchA) })).count).toBe(2);
    const teacherToken = await tokenFor('instructor@example.test');
    expect(payload(await call(teacherToken.access_token, 'codebegun_student_count')).count).toBe(2);
    const studentToken = await tokenFor('student@example.test');
    expect(payload(await call(studentToken.access_token, 'codebegun_student_count')).count).toBe(1);
  });
  test.each(['instructor@example.test', 'student@example.test'])('%s sees only assigned/own records across academic domains', async email => {
    const token = await tokenFor(email);
    for (const name of ['codebegun_students', 'codebegun_batches', 'codebegun_attendance', 'codebegun_exams', 'codebegun_fees', 'codebegun_placements']) {
      expect(payload(await call(token.access_token, name)).items).toHaveLength(1);
      expect(payload(await call(token.access_token, name, { recordId: String(studentB) })).items).toHaveLength(0);
    }
    expect(payload(await call(token.access_token, 'codebegun_student_count')).count).toBe(1);
    expect(payload(await call(token.access_token, 'codebegun_attendance_summary'))[0].count).toBe(1);
    expect(payload(await call(token.access_token, 'codebegun_students', { studentId: String(studentOther) })).items).toHaveLength(0);
    expect(payload(await call(token.access_token, 'codebegun_fees', { batchId: String(batchOther) })).items).toHaveLength(0);
  });
  test('instructor reassignment immediately restricts results', async () => {
    const token = await tokenFor('instructor@example.test');
    await Batch.updateOne({ _id: batchA }, { $set: { instructors: [] } });
    expect(payload(await call(token.access_token, 'codebegun_attendance')).items).toEqual([]);
    expect(payload(await call(token.access_token, 'codebegun_student_count')).count).toBe(0);
  });
  test('student batch feature restrictions update both discovery and execution immediately', async () => {
    const token = await tokenFor('student@example.test');
    await Batch.updateOne({ _id: batchA }, { $set: { disabledFeatures: ['attendance', 'feeDetails'] } });
    expect((await call(token.access_token, 'codebegun_attendance')).body.error.code).toBe(-32003);
    expect((await call(token.access_token, 'codebegun_fees')).body.error.code).toBe(-32003);
    const listed = await request(app).post('/mcp').set('Authorization', `Bearer ${token.access_token}`)
      .send({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
    const names = listed.body.result.tools.map((t: any) => t.name);
    expect(names).not.toContain('codebegun_attendance');
    expect(names).not.toContain('codebegun_fees');
    expect((await call(token.access_token, 'codebegun_student_count')).status).toBe(200);
  });
  test('a student batch reference in another tenant fails closed', async () => {
    const token = await tokenFor('student@example.test');
    await User.updateOne({ _id: studentA }, { $set: { batchId: batchB } });
    expect((await call(token.access_token, 'codebegun_attendance')).status).toBe(403);
  });
  test('tenant header and tool arguments cannot expand the authorized tenant', async () => {
    const token = await tokenFor();
    const r = await call(token.access_token, 'codebegun_students').set('x-tenant-id', String(tenantB));
    expect(payload(r).items).toHaveLength(2);
    expect((await call(token.access_token, 'codebegun_students', { tenantId: String(tenantB) })).body.error.code).toBe(-32602);
    expect(payload(await call(token.access_token, 'codebegun_students', { recordId: String(studentB) })).items).toEqual([]);
  });
  test('pagination is bounded and cannot change the scope', async () => {
    const token = await tokenFor();
    const first = payload(await call(token.access_token, 'codebegun_students', { limit: 1 }));
    const second = payload(await call(token.access_token, 'codebegun_students', { limit: 1, after: first.nextCursor }));
    expect(first.items).toHaveLength(1);
    expect(second.items).toHaveLength(1);
    expect(first.items[0]._id).not.toBe(second.items[0]._id);
    expect(second.nextCursor).toBeNull();
    expect((await call(token.access_token, 'codebegun_students', { limit: 51 })).body.error.code).toBe(-32602);
    expect((await call(token.access_token, 'codebegun_students', { after: { $ne: null } })).body.error.code).toBe(-32602);
  });
  test('CRM OWN and TEAM scope also restricts Outpero and rejects cross-tenant lead references', async () => {
    const token = await tokenFor('staff@example.test');
    expect(payload(await call(token.access_token, 'codebegun_leads')).items.map((x: any) => x.name)).toEqual(['Own lead']);
    const calls = payload(await call(token.access_token, 'codebegun_calls')).items;
    expect(calls.map((x: any) => x.callId)).toEqual(['own']);
    expect(calls[0].summary).toHaveLength(1200);
    await User.updateOne({ _id: staff }, { $set: { leadDataScope: 'TEAM' } });
    expect(payload(await call(token.access_token, 'codebegun_leads')).items).toHaveLength(2);
    expect(payload(await call(token.access_token, 'codebegun_calls')).items.map((x: any) => x.callId).sort()).toEqual(['own', 'team']);
    await User.updateOne({ _id: staff }, { $set: { leadDataScope: 'ALL' } });
    expect(payload(await call(token.access_token, 'codebegun_leads')).items).toHaveLength(3);
  });
  test('tool discovery is filtered by consent and permission', async () => {
    const token = await tokenFor('admin@example.test', { scope: 'mcp_connect mcp_students_read' });
    const r = await request(app).post('/mcp').set('Authorization', `Bearer ${token.access_token}`)
      .send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: { _meta: { progressToken: 'list-tools' } } });
    expect(r.body.result.tools.map((x: any) => x.name)).toEqual(['codebegun_student_count', 'codebegun_students']);
    expect((await call(token.access_token, 'codebegun_calls')).body.error.code).toBe(-32003);
  });
  test('initialize, notification, ping and stateless unsupported methods', async () => {
    const token = await tokenFor();
    const send = (body: any) => request(app).post('/mcp').set('Authorization', `Bearer ${token.access_token}`).send(body);
    const r = await send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'Test', version: '1' } } });
    expect(r.body.result.protocolVersion).toBe('2025-11-25');
    expect((await send({ jsonrpc: '2.0', method: 'notifications/initialized' })).status).toBe(202);
    expect((await send({ jsonrpc: '2.0', id: 2, method: 'ping' })).body.result).toEqual({});
    expect((await send([{ jsonrpc: '2.0', id: 2, method: 'ping' }])).body.error.code).toBe(-32600);
    expect((await send({ jsonrpc: '2.0', id: null, method: 'ping' })).body.error.code).toBe(-32600);
    expect((await send({ jsonrpc: '2.0', id: 3, method: 'unknown' })).body.error.code).toBe(-32601);
    expect((await request(app).get('/mcp').set('Authorization', `Bearer ${token.access_token}`)).status).toBe(405);
  });
  test('origin, body limits, and malformed JSON are rejected inside the isolated boundary', async () => {
    expect((await request(app).options('/mcp').set('Origin', 'https://evil.example')).status).toBe(403);
    expect((await request(app).options('/mcp').set('Origin', issuer)).status).toBe(204);
    expect((await request(app).post('/mcp').type('json').send('{')).status).toBe(400);
    expect((await request(app).post('/mcp').send({ huge: 'a'.repeat(40000) })).status).toBe(413);
  });
  test('denied calls are audited without arguments, tokens or data', async () => {
    const token = await tokenFor('admin@example.test', { scope: 'mcp_connect' });
    await call(token.access_token, 'codebegun_calls', { arbitrary: 'do-not-log-me' });
    const entry = await Audit.findOne({ tool: 'codebegun_calls' }).lean();
    expect(entry!.outcome).toBe('denied');
    expect(String(entry!.tenantId)).toBe(String(tenantA));
    expect(JSON.stringify(await Audit.find().lean())).not.toContain('do-not-log-me');
  });
  test('audit failure releases no tool data and no access token', async () => {
    const token = await tokenFor();
    const fail = jest.spyOn(Audit, 'create').mockRejectedValue(new Error('audit storage down'));
    const r = await call(token.access_token, 'codebegun_students');
    fail.mockRestore();
    expect(r.status).toBe(503);
    expect(r.body.result).toBeUndefined();
    const code = await codeFor();
    const count = await Access.countDocuments();
    const tokenFail = jest.spyOn(Audit, 'create').mockRejectedValue(new Error('audit storage down'));
    const response = await exchange(code);
    tokenFail.mockRestore();
    expect(response.status).toBe(503);
    expect(await Access.countDocuments()).toBe(count);
  });
  test('distributed rate limit fails closed without leaking request data', async () => {
    const token = await tokenFor();
    await McpRateLimit.updateMany({}, { $set: { count: 1000 } });
    const r = await call(token.access_token, 'codebegun_students');
    expect(r.status).toBe(429);
    expect(r.headers['retry-after']).toBe('60');
  });
});
