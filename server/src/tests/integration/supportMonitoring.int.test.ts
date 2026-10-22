/**
 * Technical monitoring: requests, exceptions and browser reports become sanitised, grouped
 * errors; refusals become counts; error groups link to the tickets that quote their request id;
 * repeated or critical problems alert the support HQ; Sentry receives only scrubbed summaries;
 * and only authorised staff can open the error screens.
 */
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { startMongo, stopMongo } from './mongoHarness';

jest.setTimeout(180_000);
process.env.JWT_SECRET = process.env.JWT_SECRET || 'support-monitoring-integration-test-secret-0123456789abcdef';

import User from '../../models/User';
import Role from '../../models/Role';
import Tenant from '../../models/Tenant';
import SupportErrorGroup from '../../models/SupportErrorGroup';
import SupportMetricCounter from '../../models/SupportMetricCounter';
import SupportRelease from '../../models/SupportRelease';
import SupportConfiguration from '../../models/SupportConfiguration';
import Notification from '../../models/Notification';
import supportRoutes from '../../routes/supportRoutes';
import monitorRoutes from '../../routes/monitorRoutes';
import { requestId } from '../../middleware/requestId';
import { requestMonitoring } from '../../middleware/monitoring';
import { __resetRateLimits } from '../../middleware/rateLimit';
import { flushMonitoring, __resetMonitoring, captureException, recordRelease, releaseVersion, __resetRelease, templatePath, moduleForPath, capture } from '../../services/supportMonitoring';
import { __setSentryFetch, parseDsn } from '../../services/sentryForwarder';
import { aiComplete } from '../../services/aiGateway';

// An app shaped like the real one: request id, monitoring, routes, then the final error handler.
const app = express();
app.use(requestId);
app.use(requestMonitoring);
app.use(express.json());
app.get('/api/v1/demo/boom/:id', () => { throw new Error('Kaboom for priya@example.com'); });
app.get('/api/v1/demo/fail/:id', (_req, res) => res.status(503).json({ success: false }));
app.get('/api/v1/demo/slow', (_req, res) => setTimeout(() => res.json({ ok: true }), 260));
app.get('/api/v1/demo/denied', (_req, res) => res.status(403).json({ success: false }));
app.get('/api/v1/demo/nologin', (_req, res) => res.status(401).json({ success: false }));
app.use('/api/v1/support', supportRoutes);
app.use('/api/v1/monitor', monitorRoutes);
app.use((err: any, req: any, res: any, _next: any) => {
  req.monitorCaptured = true;
  captureException(err, { method: req.method, route: req.route?.path ? `${req.baseUrl || ''}${req.route.path}` : req.originalUrl, requestId: req.requestId });
  res.status(500).json({ success: false, message: 'Internal server error', requestId: req.requestId });
});

const tokens: Record<string, string> = {};
const ids: Record<string, string> = {};
let HQ = ''; let COLLEGE = '';
const as = (who: string) => ({ Authorization: `Bearer ${tokens[who]}` });
const sent: { url: string; body: string; headers: Record<string, string> }[] = [];

beforeAll(async () => {
  await startMongo();
  HQ = String((await Tenant.create({ name: 'HQ', slug: 'hq', domain: 'hq.test', isActive: true, adminId: new mongoose.Types.ObjectId() } as any))._id);
  COLLEGE = String((await Tenant.create({ name: 'C', slug: 'c', domain: 'c.test', isActive: true, adminId: new mongoose.Types.ObjectId() } as any))._id);
  process.env.SUPPORT_HQ_TENANT_ID = HQ;
  const mgr: any = await Role.create({ name: 'mgr', permissions: ['support_manager'] } as any);
  const agent: any = await Role.create({ name: 'agent', permissions: ['support_agent'] } as any);
  const mk = async (key: string, role: string, tenantId: string, customRoleId?: unknown) => {
    const u: any = await User.create({ tenantId, firstName: key, lastName: 'T', email: `${key}@x.test`, password: 'x', role, isActive: true, customRoleId } as any);
    ids[key] = String(u._id);
    tokens[key] = jwt.sign({ id: ids[key], email: u.email, role, tenantId, customRoleId: customRoleId ? String(customRoleId) : undefined }, process.env.JWT_SECRET as string);
  };
  await mk('hqManager', 'STAFF', HQ, mgr._id);
  await mk('hqAgent', 'STAFF', HQ, agent._id);
  await mk('collegeAdmin', 'TENANT_ADMIN', COLLEGE);
  await mk('student', 'STUDENT', COLLEGE);
  process.env.SENTRY_DSN = 'https://publickey123@o1.ingest.sentry.io/4242';
  __setSentryFetch(async (url, init) => { sent.push({ url, body: init.body, headers: init.headers }); return { ok: true, status: 200 }; });
  await SupportConfiguration.create({ tenantId: null, monitoring: { slowRequestMs: 200, alertPerHour: 3 } });
});

afterAll(async () => {
  delete process.env.SUPPORT_HQ_TENANT_ID; delete process.env.SENTRY_DSN; __setSentryFetch(null);
  await stopMongo();
});
beforeEach(() => { __resetRateLimits(); });

const flush = async () => { await flushMonitoring(); await new Promise(r => setTimeout(r, 50)); };

describe('server-side capture', () => {
  it('groups an unhandled exception by route template, redacted, with no stack sent to the caller', async () => {
    const a = await request(app).get('/api/v1/demo/boom/6ad9c6a6ed279c8307117b6a');
    await request(app).get('/api/v1/demo/boom/6ad9c6a6ed279c8307117b6b');
    expect(a.status).toBe(500);
    expect(JSON.stringify(a.body)).not.toMatch(/Kaboom|at /);
    await flush();
    const g: any = await SupportErrorGroup.findOne({ kind: 'exception' }).lean();
    expect(g.count).toBe(2);
    expect(g.route).toBe('GET /api/v1/demo/boom/:id');
    expect(g.title).not.toContain('priya@example.com');
    expect(g.sampleRequestIds).toContain(a.body.requestId);
    expect(g.firstRelease).toBe(releaseVersion());
    // The same failure is not also recorded as a separate 5xx group.
    expect(await SupportErrorGroup.countDocuments({ kind: 'server_5xx', route: /boom/ })).toBe(0);
  });

  it('records 5xx responses and slow requests per route, and refusals as counts only', async () => {
    await request(app).get('/api/v1/demo/fail/123');
    await request(app).get('/api/v1/demo/slow');
    await request(app).get('/api/v1/demo/denied');
    await request(app).get('/api/v1/demo/nologin');
    await request(app).get('/api/v1/demo/nologin');
    await flush();
    expect(await SupportErrorGroup.findOne({ kind: 'server_5xx' }).lean()).toMatchObject({ route: 'GET /api/v1/demo/fail/:id', count: 1 });
    expect(await SupportErrorGroup.findOne({ kind: 'slow_request' }).lean()).toMatchObject({ route: 'GET /api/v1/demo/slow', severity: 'info' });
    const c = Object.fromEntries((await SupportMetricCounter.find({}).lean()).map((x: any) => [x.key, x.count]));
    expect(c).toMatchObject({ auth_403: 1, auth_401: 2, http_5xx: 3, slow_request: 1 });
    // Nothing about who was refused is stored anywhere.
    expect(await SupportErrorGroup.countDocuments({ title: /403|401/ })).toBe(0);
  });

  it('records AI failures by cause, including no provider configured', async () => {
    const before = process.env.OPENAI_API_KEY; delete process.env.OPENAI_API_KEY;
    await expect(aiComplete({ module: 'support_assistant', system: 's', user: 'u' })).rejects.toThrow();
    if (before) process.env.OPENAI_API_KEY = before;
    await flush();
    const c: any = await SupportMetricCounter.findOne({ key: 'ai_failure:not_configured' }).lean();
    expect(c?.count).toBeGreaterThanOrEqual(1);
  });

  it('helpers template paths and map them to ticket areas', () => {
    expect(templatePath('/api/v1/support/tickets/6ad9c6a6ed279c8307117b6a/messages?x=1')).toBe('/api/v1/support/tickets/:id/messages');
    expect(moduleForPath('/api/v1/careerpilot/me/foundation-journey/day/3')).toBe('plan');
    expect(moduleForPath('/api/v1/payments/order')).toBe('payment');
  });

  it('records the running release once', async () => {
    __resetRelease(); process.env.RELEASE_VERSION = 'v-test-1';
    await recordRelease(); await recordRelease();
    expect(await SupportRelease.countDocuments({ version: 'v-test-1' })).toBe(1);
    delete process.env.RELEASE_VERSION; __resetRelease();
  });
});

describe('browser reports', () => {
  it('keep only a scrubbed summary, ignore 4xx, and group repeats', async () => {
    const r = await request(app).post('/api/v1/monitor/client-errors').send({ events: [
      { type: 'error', message: 'TypeError: x is undefined for a.b@x.test', stack: 'TypeError\n at f (https://app.example.com/static/js/main.js:1:2)', page: '/careerpilot/roadmap?token=abc' },
      { type: 'error', message: 'TypeError: x is undefined for a.b@x.test', stack: 'TypeError\n at f (https://app.example.com/static/js/main.js:1:2)', page: '/careerpilot/roadmap' },
      { type: 'api', apiPath: 'https://api.example.com/api/v1/payments/order/6ad9c6a6ed279c8307117b6a', method: 'POST', status: 502, requestId: 'abcd-1234-efgh' },
      { type: 'api', apiPath: '/api/v1/support/tickets', method: 'POST', status: 400 },
      { type: 'react', message: '', page: '/x' },
    ] });
    expect(r.status).toBe(202);
    expect(r.body.data.accepted).toBe(3);
    await flush();
    const err: any = await SupportErrorGroup.findOne({ kind: 'client_error' }).lean();
    expect(err.count).toBe(2);
    expect(err.route).toBe('/careerpilot/roadmap');
    expect(JSON.stringify(err)).not.toMatch(/a\.b@x\.test|token=abc|app\.example\.com/);
    expect(err.module).toBe('roadmap');
    const api: any = await SupportErrorGroup.findOne({ kind: 'client_api' }).lean();
    expect(api).toMatchObject({ route: 'POST /api/v1/payments/order/:id', module: 'payment' });
    expect(await SupportErrorGroup.countDocuments({ route: /support\/tickets/ })).toBe(0);
  });

  it('are rate-limited', async () => {
    let last = 0;
    for (let i = 0; i < 32; i++) last = (await request(app).post('/api/v1/monitor/client-errors').send({ events: [] })).status;
    expect(last).toBe(429);
  });
});

describe('linking errors and tickets', () => {
  it('links a ticket that quotes the request id of a failure, in either order, and shows staff only', async () => {
    // Failure first, then the ticket.
    const fail = await request(app).get('/api/v1/demo/boom/6ad9c6a6ed279c8307117b6c');
    await flush();
    const t1 = await request(app).post('/api/v1/support/tickets').set(as('student')).send({ subject: 'Page crashed', description: 'It broke', relatedRequestId: fail.body.requestId });
    await new Promise(r => setTimeout(r, 200));
    const g: any = await SupportErrorGroup.findOne({ kind: 'exception' }).lean();
    expect(g.linkedTicketIds.map(String)).toContain(t1.body.data.id);
    // Ticket first, then the (late) flush of a new failure that carries the same id.
    const t2 = await request(app).post('/api/v1/support/tickets').set(as('student')).send({ subject: 'Payment failed', description: 'x', relatedRequestId: 'late-req-0001' });
    capture({ kind: 'server_5xx', title: 'POST /api/v1/payments/order → 502', route: 'POST /api/v1/payments/order', requestId: 'late-req-0001' });
    await flush();
    const g2: any = await SupportErrorGroup.findOne({ sampleRequestIds: 'late-req-0001' }).lean();
    expect(g2.linkedTicketIds.map(String)).toContain(t2.body.data.id);
    // Staff see the linked group on the ticket; the member does not.
    const staff = await request(app).get(`/api/v1/support/tickets/${t1.body.data.id}`).set(as('hqAgent'));
    expect(staff.body.data.errors.linked[0].title).toMatch(/Kaboom/);
    const member = await request(app).get(`/api/v1/support/tickets/${t1.body.data.id}`).set(as('student'));
    expect(member.body.data.errors).toBeUndefined();
  });
});

describe('alerts and Sentry', () => {
  it('alerts the HQ managers once a group passes the hourly threshold, and not again within the hour', async () => {
    for (let i = 0; i < 4; i++) capture({ kind: 'server_5xx', title: 'GET /api/v1/x → 500', route: 'GET /api/v1/x', key: '500' });
    await flush();
    await new Promise(r => setTimeout(r, 200));
    const n = await Notification.find({ userId: ids.hqManager, title: 'Repeated problem: GET /api/v1/x → 500' }).lean();
    expect(n).toHaveLength(1);
    capture({ kind: 'server_5xx', title: 'GET /api/v1/x → 500', route: 'GET /api/v1/x', key: '500' });
    await flush(); await new Promise(r => setTimeout(r, 200));
    expect(await Notification.countDocuments({ userId: ids.hqManager, title: 'Repeated problem: GET /api/v1/x → 500' })).toBe(1);
  });

  it('sends Sentry a scrubbed envelope with the right auth, and nothing at info level', async () => {
    const before = sent.length;
    capture({ kind: 'exception', title: 'Error: bad token eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjEifQ.sig for x@y.com', route: 'GET /api/v1/y', requestId: 'req-sentry-01', key: 'sentry-test' });
    capture({ kind: 'slow_request', title: 'Slow: GET /api/v1/z', route: 'GET /api/v1/z' });
    await flush(); await new Promise(r => setTimeout(r, 100));
    const mine = sent.slice(before);
    expect(mine).toHaveLength(1);
    expect(mine[0].url).toBe('https://o1.ingest.sentry.io/api/4242/envelope/');
    expect(mine[0].headers['X-Sentry-Auth']).toContain('sentry_key=publickey123');
    expect(mine[0].body).not.toMatch(/eyJhbGci|x@y\.com/);
    expect(mine[0].body).toContain('"request_id":"req-sentry-01"');
  });

  it('parses DSNs and rejects bad ones', () => {
    expect(parseDsn('https://k@o1.ingest.sentry.io/77')).toMatchObject({ publicKey: 'k', host: 'o1.ingest.sentry.io', projectId: '77' });
    expect(parseDsn('not a dsn')).toBeNull();
    expect(parseDsn(undefined)).toBeNull();
  });
});

describe('who can see /admin/errors', () => {
  it('HQ managers can; a college admin, an agent without the log permission and a student cannot', async () => {
    expect((await request(app).get('/api/v1/support/admin/errors').set(as('hqManager'))).status).toBe(200);
    expect((await request(app).get('/api/v1/support/admin/errors').set(as('collegeAdmin'))).status).toBe(403);
    expect((await request(app).get('/api/v1/support/admin/errors').set(as('hqAgent'))).status).toBe(403);
    expect((await request(app).get('/api/v1/support/admin/errors').set(as('student'))).status).toBe(403);
    expect((await request(app).get('/api/v1/support/me').set(as('hqManager'))).body.data.canMonitor).toBe(true);
    expect((await request(app).get('/api/v1/support/me').set(as('collegeAdmin'))).body.data.canMonitor).toBe(false);
  });

  it('lists, filters, shows linked tickets, and lets a manager resolve or re-rate a group', async () => {
    const list = (await request(app).get('/api/v1/support/admin/errors?kind=exception').set(as('hqManager'))).body.data;
    expect(list.groups.every((g: any) => g.kind === 'exception')).toBe(true);
    expect(list.sentry).toBe(true);
    const linked = (await request(app).get('/api/v1/support/admin/errors?linked=true').set(as('hqManager'))).body.data.groups;
    expect(linked.length).toBeGreaterThan(0);
    const d = (await request(app).get(`/api/v1/support/admin/errors/${linked[0].id}`).set(as('hqManager'))).body.data;
    expect(d.tickets[0].ticketNumber).toMatch(/^SUP-/);
    const u = await request(app).patch(`/api/v1/support/admin/errors/${linked[0].id}`).set(as('hqManager')).send({ status: 'resolved', severityOverride: 'critical' });
    expect(u.body.data).toMatchObject({ status: 'resolved', severity: 'critical' });
    expect((await request(app).patch(`/api/v1/support/admin/errors/${linked[0].id}`).set(as('hqManager')).send({ status: 'gone' })).status).toBe(400);
    const counters = (await request(app).get('/api/v1/support/admin/errors/counters').set(as('hqManager'))).body.data;
    expect(counters.counters.map((c: any) => c.key)).toEqual(expect.arrayContaining(['auth_401', 'http_5xx']));
  });

  it('thresholds and severities are configurable, within limits', async () => {
    expect((await request(app).put('/api/v1/support/admin/errors/config').set(as('hqManager')).send({ slowRequestMs: 10 })).status).toBe(400);
    const r = await request(app).put('/api/v1/support/admin/errors/config').set(as('hqManager')).send({ slowRequestMs: 5000, severity: { client_error: 'error', bogus: 'critical' } });
    expect(r.body.data.saved).toMatchObject({ slowRequestMs: 5000, severity: { client_error: 'error' } });
    expect(r.body.data.saved.severity.bogus).toBeUndefined();
  });
});

afterAll(() => __resetMonitoring());
