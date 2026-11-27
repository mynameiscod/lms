/**
 * Help & Support dashboard numbers against seeded tickets with known times: every metric checked
 * exactly, per role (HQ sees all, a coordinator only their college, a student nothing), SLA only
 * once targets are set, and possible incidents only once rules are set and only "possible" until
 * a manager confirms.
 */
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { startMongo, stopMongo } from './mongoHarness';

jest.setTimeout(180_000);
process.env.JWT_SECRET = process.env.JWT_SECRET || 'support-analytics-integration-test-secret-0123456789abcdef';

import User from '../../models/User';
import Role from '../../models/Role';
import Tenant from '../../models/Tenant';
import SupportTicket from '../../models/SupportTicket';
import SupportChatSession from '../../models/SupportChatSession';
import SupportConfiguration from '../../models/SupportConfiguration';
import SupportIncident from '../../models/SupportIncident';
import Notification from '../../models/Notification';
import supportRoutes from '../../routes/supportRoutes';
import { __resetRateLimits } from '../../middleware/rateLimit';

const app = express();
app.use(express.json());
app.use('/support', supportRoutes);

const tokens: Record<string, string> = {};
const ids: Record<string, string> = {};
let HQ = ''; let A = ''; let B = '';
const as = (who: string) => ({ Authorization: `Bearer ${tokens[who]}` });
const NOW = Date.now();
const ago = (min: number) => new Date(NOW - min * 60_000);
let n = 0;

async function ticket(tenantId: string, requester: string, over: Record<string, unknown> = {}) {
  n++;
  return SupportTicket.create({
    tenantId, requesterId: ids[requester], requesterRole: 'STUDENT', ticketNumber: `SUP-26-${String(n).padStart(5, '0')}`,
    subject: `Seeded ${n}`, description: 'x', ...over,
  });
}

beforeAll(async () => {
  await startMongo();
  const mkTenant = async (slug: string) => String((await Tenant.create({ name: slug.toUpperCase(), slug, domain: `${slug}.test`, isActive: true, adminId: new mongoose.Types.ObjectId() } as any))._id);
  HQ = await mkTenant('hq'); A = await mkTenant('alpha'); B = await mkTenant('beta');
  process.env.SUPPORT_HQ_TENANT_ID = HQ;
  const mgr: any = await Role.create({ name: 'mgr', permissions: ['support_manager'] } as any);
  const mk = async (key: string, role: string, tenantId: string, customRoleId?: unknown) => {
    const u: any = await User.create({ tenantId, firstName: key, lastName: 'T', email: `${key}@x.test`, password: 'x', role, isActive: true, customRoleId } as any);
    ids[key] = String(u._id);
    tokens[key] = jwt.sign({ id: ids[key], email: u.email, role, tenantId, customRoleId: customRoleId ? String(customRoleId) : undefined }, process.env.JWT_SECRET as string);
  };
  await mk('hq', 'STAFF', HQ, mgr._id);
  await mk('coordA', 'TENANT_ADMIN', A);
  await mk('mgrA', 'STAFF', A, mgr._id);
  for (const s of ['a1', 'a2', 'a3', 'a4']) await mk(s, 'STUDENT', A);
  await mk('b1', 'STUDENT', B);

  // College A: 5 tickets in the last day.
  await ticket(A, 'a1', { createdAt: ago(600), firstResponseAt: ago(570), status: 'in_progress', priority: 'high', module: 'roadmap' });                  // 30 min to respond
  await ticket(A, 'a2', { createdAt: ago(500), firstResponseAt: ago(410), resolvedAt: ago(380), status: 'resolved', priority: 'medium', module: 'roadmap' }); // 90 min; resolved in 120
  await ticket(A, 'a3', { createdAt: ago(30), status: 'open', priority: 'critical', module: 'roadmap' });
  await ticket(A, 'a4', { createdAt: ago(20), status: 'waiting_on_user', priority: 'low', module: 'roadmap', assigneeId: ids.hq, reopenCount: 1 });
  await ticket(A, 'a1', { createdAt: ago(10), status: 'open', priority: 'medium', module: 'payment', source: 'ai_chat' });
  // College B: 1 ticket, and one long ago outside the default range.
  await ticket(B, 'b1', { createdAt: ago(100), status: 'open', priority: 'medium', module: 'roadmap' });
  await ticket(B, 'b1', { createdAt: ago(60 * 24 * 60), status: 'closed', priority: 'low', module: 'coding', resolvedAt: ago(60 * 24 * 59) });

  // Assistant sessions in college A.
  await SupportChatSession.create({ tenantId: A, userId: ids.a1, status: 'resolved', turns: [{ role: 'user', content: 'q' }, { role: 'assistant', content: 'a', helpful: true }] });
  await SupportChatSession.create({ tenantId: A, userId: ids.a2, status: 'escalated', ticketId: new mongoose.Types.ObjectId(), turns: [{ role: 'user', content: 'q' }, { role: 'assistant', content: 'fb', fallback: true, helpful: false }] });
  await SupportChatSession.create({ tenantId: A, userId: ids.a3, status: 'active', failures: 1, turns: [] });
});

afterAll(async () => { delete process.env.SUPPORT_HQ_TENANT_ID; await stopMongo(); });
beforeEach(() => __resetRateLimits());

describe('summary', () => {
  it("a coordinator gets their college's exact figures", async () => {
    const r = await request(app).get('/support/analytics/summary').set(as('coordA'));
    expect(r.status).toBe(200);
    const d = r.body.data;
    expect(d.current).toEqual({ open: 4, unassigned: 3, highCritical: 2, waitingOnUser: 1, escalated: 0 });
    expect(d.period).toEqual({ created: 5, fromAssistant: 1, reopened: 1, resolved: 1, avgFirstResponseMinutes: 60, avgResolutionMinutes: 120 });
    expect(d.sla).toEqual({ configured: false });
    expect(d.assistant).toMatchObject({ sessions: 3, resolved: 1, escalated: 1, failedSessions: 1, resolutionRate: 33.3, escalationRate: 33.3, answers: 2, fallbackAnswers: 1, thumbsUp: 1, thumbsDown: 1 });
  });

  it('the support HQ sees every college, and can narrow to one', async () => {
    const all = (await request(app).get('/support/analytics/summary').set(as('hq'))).body.data;
    expect(all.current.open).toBe(5);
    expect(all.period.created).toBe(6);
    const onlyB = (await request(app).get(`/support/analytics/summary?tenantId=${B}`).set(as('hq'))).body.data;
    expect(onlyB.period.created).toBe(1);
    // A coordinator asking for another college still gets their own.
    const forced = (await request(app).get(`/support/analytics/summary?tenantId=${B}`).set(as('coordA'))).body.data;
    expect(forced.period.created).toBe(5);
  });

  it('a student has no dashboard', async () => {
    expect((await request(app).get('/support/analytics/summary').set(as('a1'))).status).toBe(403);
  });

  it('honours the date range and refuses a backwards one', async () => {
    const wide = (await request(app).get(`/support/analytics/summary?from=${ago(60 * 24 * 90).toISOString()}`).set(as('hq'))).body.data;
    expect(wide.period.created).toBe(7);
    expect((await request(app).get(`/support/analytics/summary?from=${ago(1).toISOString()}&to=${ago(100).toISOString()}`).set(as('hq'))).status).toBe(400);
  });

  it('reports SLA compliance only once targets exist, against those targets', async () => {
    await SupportConfiguration.create({ tenantId: A, firstResponseMinutes: { high: 60, medium: 60 } });
    const d = (await request(app).get('/support/analytics/summary').set(as('coordA'))).body.data;
    // high: responded in 30 (met); medium #1: 90 (missed); medium #2 (payment): 10 min old, no reply, not yet due.
    expect(d.sla).toMatchObject({ configured: true, firstResponsePct: 50, first: { met: 1, missed: 1 }, resolutionPct: null });
    await SupportConfiguration.deleteMany({});
  });
});

describe('trends and breakdown', () => {
  it('counts per day and lists releases only when recorded', async () => {
    const d = (await request(app).get('/support/analytics/trends').set(as('coordA'))).body.data;
    expect(d.series.reduce((s: number, x: any) => s + x.created, 0)).toBe(5);
    expect(d.series.reduce((s: number, x: any) => s + x.resolved, 0)).toBe(1);
    expect(d.releases).toEqual([]);
  });

  it('breaks down by module, college and repeated issues, in reach', async () => {
    const hq = (await request(app).get('/support/analytics/breakdown').set(as('hq'))).body.data;
    expect(hq.byModule).toEqual(expect.arrayContaining([{ key: 'roadmap', count: 5 }, { key: 'payment', count: 1 }]));
    expect(hq.byCollege.map((c: any) => [c.name, c.total])).toEqual([['ALPHA', 5], ['BETA', 1]]);
    expect(hq.heatmap.cells).toEqual(expect.arrayContaining([{ tenantId: A, module: 'roadmap', count: 4 }, { tenantId: B, module: 'roadmap', count: 1 }]));
    expect(hq.repeatedIssues[0]).toMatchObject({ module: 'roadmap', people: 5 });
    const coord = (await request(app).get('/support/analytics/breakdown').set(as('coordA'))).body.data;
    expect(coord.byCollege.map((c: any) => c.name)).toEqual(['ALPHA']);
    expect(coord.unresolvedByModule).toEqual(expect.arrayContaining([{ key: 'roadmap', count: 3 }, { key: 'payment', count: 1 }]));
  });
});

describe('possible shared incidents', () => {
  it('are off until rules are set', async () => {
    const d = (await request(app).get('/support/incidents').set(as('hq'))).body.data;
    expect(d).toMatchObject({ configured: false, possible: [] });
  });

  it('appear as "possible" once rules match, and only a manager can confirm', async () => {
    await SupportConfiguration.create({ tenantId: null, incident: { minTickets: 3, minDistinctUsers: 3, windowMinutes: 120 } });
    const d = (await request(app).get('/support/incidents').set(as('hq'))).body.data;
    // roadmap in the last 2 hours: a3, a4 (college A) and b1 (college B) = 3 tickets, 3 people.
    expect(d.possible).toEqual([expect.objectContaining({ module: 'roadmap', tickets: 3, people: 3, colleges: 2, label: 'Possible shared incident' })]);
    // The coordinator's own view sees only college A: 2 tickets, below the rule.
    expect((await request(app).get('/support/incidents').set(as('coordA'))).body.data.possible).toEqual([]);
    expect((await request(app).post('/support/incidents').set(as('coordA')).send({ module: 'roadmap' })).status).toBe(403);
  });

  it('confirming tells only the affected members, once; resolving closes it', async () => {
    const r = await request(app).post('/support/incidents').set(as('hq')).send({ module: 'roadmap', title: 'Roadmap not loading' });
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ status: 'confirmed', notifiedCount: 3 });
    await new Promise(res => setTimeout(res, 300));
    const told = await Notification.find({ title: /^Update on SUP-/ }).lean();
    expect(told.map((x: any) => String(x.userId)).sort()).toEqual([ids.a3, ids.a4, ids.b1].sort());
    // Now confirmed, it is no longer listed as possible.
    const d = (await request(app).get('/support/incidents').set(as('hq'))).body.data;
    expect(d.possible).toEqual([]);
    expect(d.confirmed[0]).toMatchObject({ module: 'roadmap', status: 'confirmed' });
    expect((await request(app).post('/support/incidents').set(as('hq')).send({ module: 'roadmap' })).status).toBe(409);
    const done = await request(app).post(`/support/incidents/${d.confirmed[0].id}/resolve`).set(as('hq'));
    expect(done.body.data.status).toBe('resolved');
    expect(await SupportIncident.countDocuments({ status: 'confirmed' })).toBe(0);
    await SupportConfiguration.deleteMany({});
  });
});

describe('settings', () => {
  it('start empty and accept only sensible whole numbers', async () => {
    const empty = (await request(app).get('/support/admin/config').set(as('mgrA'))).body.data;
    expect(empty).toMatchObject({ scope: 'institute', firstResponseMinutes: {}, incident: {} });
    expect((await request(app).put('/support/admin/config').set(as('mgrA')).send({ firstResponseMinutes: { high: 1.5 } })).status).toBe(400);
    expect((await request(app).put('/support/admin/config').set(as('mgrA')).send({ incident: { minTickets: 1 } })).status).toBe(400);
    const saved = await request(app).put('/support/admin/config').set(as('mgrA')).send({ firstResponseMinutes: { critical: 30, high: '' }, reopen: { allowed: false }, tenantId: B });
    expect(saved.status).toBe(200);
    expect(saved.body.data.firstResponseMinutes).toMatchObject({ critical: 30, high: null });
    expect(saved.body.data.reopen.allowed).toBe(false);
    expect(await SupportConfiguration.countDocuments({ tenantId: B })).toBe(0); // the body cannot pick another institute
  });

  it('only managers; and only the HQ may set the platform default', async () => {
    expect((await request(app).get('/support/admin/config').set(as('coordA'))).status).toBe(403);
    await request(app).put('/support/admin/config').set(as('mgrA')).send({ scope: 'platform', firstResponseMinutes: { low: 5 } });
    expect(await SupportConfiguration.countDocuments({ tenantId: null })).toBe(0);
    await request(app).put('/support/admin/config').set(as('hq')).send({ scope: 'platform', firstResponseMinutes: { low: 600 } });
    expect((await SupportConfiguration.findOne({ tenantId: null }).lean() as any).firstResponseMinutes.low).toBe(600);
  });
});
