/**
 * Help & Support tickets through the real routes and a real database: who can read and write
 * which ticket, internal notes never reaching members or coordinators, status rules, reopening,
 * duplicates, bulk actions, and attachments that are checked by content and served only to
 * people who may see them.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { startMongo, stopMongo } from './mongoHarness';

jest.setTimeout(180_000);
process.env.JWT_SECRET = process.env.JWT_SECRET || 'support-tickets-integration-test-secret-0123456789abcdef';

import User from '../../models/User';
import Role from '../../models/Role';
import Tenant from '../../models/Tenant';
import CollegeMembership from '../../models/CollegeMembership';
import SupportTicket from '../../models/SupportTicket';
import SupportMessage from '../../models/SupportMessage';
import SupportAuditLog from '../../models/SupportAuditLog';
import SupportConfiguration from '../../models/SupportConfiguration';
import Notification from '../../models/Notification';
import supportRoutes from '../../routes/supportRoutes';
import { requestId } from '../../middleware/requestId';
import { __resetRateLimits } from '../../middleware/rateLimit';

// Attachments go to a throwaway folder, never the repo's uploads.
const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'support-int-'));
const realCwd = process.cwd();

const app = express();
app.use(requestId);
app.use(express.json());
app.use('/support', supportRoutes);

const tokens: Record<string, string> = {};
const ids: Record<string, string> = {};
let HQ = ''; let COLLEGE = ''; let OTHER = '';

const as = (who: string) => ({ Authorization: `Bearer ${tokens[who]}` });
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a5e00000000049454e44ae426082', 'hex');

beforeAll(async () => {
  process.chdir(workDir);
  await startMongo();
  const mkTenant = async (slug: string) => String((await Tenant.create({ name: slug.toUpperCase(), slug, domain: `${slug}.test`, isActive: true, adminId: new mongoose.Types.ObjectId() } as any))._id);
  HQ = await mkTenant('hq'); COLLEGE = await mkTenant('college'); OTHER = await mkTenant('other');
  process.env.SUPPORT_HQ_TENANT_ID = HQ;
  const agentRole: any = await Role.create({ name: 'Agent', permissions: ['support_agent'] } as any);
  const mk = async (key: string, role: string, tenantId: string, extra: Record<string, unknown> = {}) => {
    const u: any = await User.create({ tenantId, firstName: key, lastName: 'T', email: `${key}@x.test`, password: 'x', role, isActive: true, ...extra } as any);
    ids[key] = String(u._id);
    tokens[key] = jwt.sign({ id: String(u._id), email: u.email, role, tenantId, customRoleId: extra.customRoleId ? String(extra.customRoleId) : undefined }, process.env.JWT_SECRET as string);
    return u;
  };
  await mk('alice', 'STUDENT', COLLEGE);
  await mk('bob', 'STUDENT', COLLEGE);
  await mk('olga', 'STUDENT', OTHER);
  const coord = await mk('coord', 'STAFF', COLLEGE);
  await CollegeMembership.create({ userId: coord._id, tenantId: COLLEGE, collegeRole: 'PLACEMENT_OFFICER', isActive: true } as any);
  await mk('otherCoord', 'TENANT_ADMIN', OTHER);
  await mk('hqAgent', 'STAFF', HQ, { customRoleId: agentRole._id });
  await mk('hqAgent2', 'STAFF', HQ, { customRoleId: agentRole._id });
  await mk('collegeAgent', 'STAFF', COLLEGE, { customRoleId: agentRole._id });
});

afterAll(async () => {
  delete process.env.SUPPORT_HQ_TENANT_ID;
  await stopMongo();
  process.chdir(realCwd);
  fs.rmSync(workDir, { recursive: true, force: true });
});

beforeEach(() => __resetRateLimits());

const raise = (who: string, body: Record<string, unknown> = {}) =>
  request(app).post('/support/tickets').set(as(who)).send({ subject: 'Day 3 will not open', description: 'It spins forever.', module: 'roadmap', category: 'technical', route: '/careerpilot/journey/day/3?x=1', ...body });

describe('raising a ticket', () => {
  it('takes identity from the login and ignores what the body claims', async () => {
    const r = await raise('alice', { tenantId: OTHER, requesterId: ids.bob, status: 'closed', priority: 'critical', source: 'staff', subject: 'Login loop on mobile' });
    expect(r.status).toBe(201);
    expect(r.body.data.ticketNumber).toMatch(/^SUP-\d{2}-\d{5}$/);
    const t: any = await SupportTicket.findById(r.body.data.id).lean();
    expect(String(t.tenantId)).toBe(COLLEGE);
    expect(String(t.requesterId)).toBe(ids.alice);
    expect(t).toMatchObject({ status: 'open', priority: 'medium', source: 'help_center', requesterRole: 'STUDENT', module: 'roadmap' });
    expect(t.context.route).toBe('/careerpilot/journey/day/3');
    expect(t.context.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(t.diagnostics).toBeUndefined();
    expect(await SupportAuditLog.countDocuments({ entityId: t._id, action: 'created' })).toBe(1);
  });

  it('stores diagnostics only with consent, redacted', async () => {
    const no = await raise('alice', { subject: 'No consent', diagnostics: 'mail me at alice@x.test' });
    expect((await SupportTicket.findById(no.body.data.id).lean() as any).diagnostics).toBeUndefined();
    const yes = await raise('alice', { subject: 'With consent', diagnosticsConsent: true, diagnostics: 'mail me at alice@x.test token=abc' });
    const t: any = await SupportTicket.findById(yes.body.data.id).lean();
    expect(t.diagnosticsConsent).toBe(true);
    expect(t.diagnostics.summary).not.toContain('alice@x.test');
  });

  it('treats an identical resend within two minutes as the same ticket', async () => {
    const a = await raise('bob', { subject: 'Double click' });
    const b = await raise('bob', { subject: 'Double click' });
    expect(b.status).toBe(200);
    expect(b.body.duplicate).toBe(true);
    expect(b.body.data.id).toBe(a.body.data.id);
  });

  it('refuses an empty or oversized ticket', async () => {
    expect((await raise('alice', { subject: 'x' })).status).toBe(400);
    expect((await raise('alice', { description: '' })).status).toBe(400);
    expect((await raise('alice', { description: 'a'.repeat(5001) })).status).toBe(400);
  });

  it('needs a login', async () => {
    expect((await request(app).post('/support/tickets').send({ subject: 'abc', description: 'x' })).status).toBe(401);
  });

  it('confirms creation to the requester in-app', async () => {
    const r = await raise('bob', { subject: 'Notify me' });
    await new Promise(res => setTimeout(res, 200));
    const n: any = await Notification.findOne({ userId: ids.bob, link: `/careerpilot/support/tickets/${r.body.data.id}` }).lean();
    expect(n?.title).toContain(r.body.data.ticketNumber);
  });
});

describe('who can see a ticket', () => {
  let aliceTicket = ''; let olgaTicket = '';
  beforeAll(async () => {
    aliceTicket = (await raise('alice', { subject: 'Isolation check' })).body.data.id;
    olgaTicket = (await raise('olga', { subject: 'Other college' })).body.data.id;
  });

  it('the requester sees it in their list and opens it', async () => {
    const list = await request(app).get('/support/tickets/mine').set(as('alice'));
    expect(list.body.data.tickets.some((t: any) => t.id === aliceTicket)).toBe(true);
    expect((await request(app).get(`/support/tickets/${aliceTicket}`).set(as('alice'))).status).toBe(200);
  });

  it('a classmate and another college get not-found, not forbidden', async () => {
    expect((await request(app).get(`/support/tickets/${aliceTicket}`).set(as('bob'))).status).toBe(404);
    expect((await request(app).get(`/support/tickets/${aliceTicket}`).set(as('olga'))).status).toBe(404);
    expect((await request(app).get(`/support/tickets/${aliceTicket}`).set(as('otherCoord'))).status).toBe(404);
    const mine = await request(app).get('/support/tickets/mine').set(as('bob'));
    expect(mine.body.data.tickets.some((t: any) => t.id === aliceTicket)).toBe(false);
  });

  it("a coordinator sees their college's tickets but not another college's", async () => {
    const q = await request(app).get('/support/queue?limit=100').set(as('coord'));
    expect(q.status).toBe(200);
    const got = q.body.data.tickets.map((t: any) => t.id);
    expect(got).toContain(aliceTicket);
    expect(got).not.toContain(olgaTicket);
    expect((await request(app).get(`/support/tickets/${olgaTicket}`).set(as('coord'))).status).toBe(404);
  });

  it('a student cannot open the queue', async () => {
    expect((await request(app).get('/support/queue').set(as('alice'))).status).toBe(403);
  });

  it("a college's own agent is limited to that college; the HQ agent sees both and is audited", async () => {
    expect((await request(app).get(`/support/tickets/${olgaTicket}`).set(as('collegeAgent'))).status).toBe(404);
    const q = await request(app).get('/support/queue?limit=100').set(as('hqAgent'));
    const got = q.body.data.tickets.map((t: any) => t.id);
    expect(got).toEqual(expect.arrayContaining([aliceTicket, olgaTicket]));
    expect((await request(app).get(`/support/tickets/${olgaTicket}`).set(as('hqAgent'))).status).toBe(200);
    expect(await SupportAuditLog.countDocuments({ entityId: olgaTicket, action: 'view', crossTenant: true })).toBe(1);
  });

  it('an HQ agent can narrow the queue to one college', async () => {
    const q = await request(app).get(`/support/queue?tenantId=${OTHER}&limit=100`).set(as('hqAgent'));
    expect(q.body.data.tickets.every((t: any) => t.tenant.id === OTHER)).toBe(true);
    // A college agent asking for another college still gets only their own.
    const c = await request(app).get(`/support/queue?tenantId=${OTHER}&limit=100`).set(as('collegeAgent'));
    expect(c.body.data.tickets.every((t: any) => t.tenant.id === COLLEGE)).toBe(true);
  });
});

describe('internal notes', () => {
  let id = '';
  beforeAll(async () => {
    id = (await raise('alice', { subject: 'Notes check' })).body.data.id;
    await request(app).post(`/support/tickets/${id}/messages`).set(as('hqAgent')).send({ body: 'Looks like the CDN, not her device.', internal: true });
    await request(app).post(`/support/tickets/${id}/messages`).set(as('hqAgent')).send({ body: 'We are looking into it.' });
  });

  it('are never returned to the requester', async () => {
    const r = await request(app).get(`/support/tickets/${id}`).set(as('alice'));
    expect(r.body.data.messages.map((m: any) => m.body)).toEqual(['We are looking into it.']);
    expect(JSON.stringify(r.body)).not.toContain('CDN');
    expect(r.body.data.ticket.assignee).toBeUndefined();
    expect(r.body.data.timeline.every((e: any) => ['created', 'status', 'reopened'].includes(e.action))).toBe(true);
  });

  it('are never returned to a coordinator', async () => {
    const r = await request(app).get(`/support/tickets/${id}`).set(as('coord'));
    expect(r.status).toBe(200);
    expect(JSON.stringify(r.body)).not.toContain('CDN');
  });

  it('are returned to agents', async () => {
    const r = await request(app).get(`/support/tickets/${id}`).set(as('hqAgent'));
    expect(r.body.data.messages.find((m: any) => m.visibility === 'internal')?.body).toContain('CDN');
  });

  it('cannot be written by a requester or a coordinator', async () => {
    await request(app).post(`/support/tickets/${id}/messages`).set(as('alice')).send({ body: 'sneaky', internal: true });
    const m: any = await SupportMessage.findOne({ ticketId: id, body: 'sneaky' }).lean();
    expect(m.visibility).toBe('public');
    expect((await request(app).post(`/support/tickets/${id}/messages`).set(as('coord')).send({ body: 'hi' })).status).toBe(404);
  });

  it('the first public staff reply stamps first response and moves the ticket on', async () => {
    const t: any = await SupportTicket.findById(id).lean();
    expect(t.firstResponseAt).toBeTruthy();
    expect(t.status).toBe('in_progress');
  });
});

describe('status rules', () => {
  it('staff move a ticket; members cannot set a status', async () => {
    const id = (await raise('alice', { subject: 'Status rules' })).body.data.id;
    expect((await request(app).patch(`/support/tickets/${id}`).set(as('alice')).send({ status: 'resolved' })).status).toBe(403);
    expect((await request(app).patch(`/support/tickets/${id}`).set(as('coord')).send({ status: 'resolved' })).status).toBe(403);
    const ok = await request(app).patch(`/support/tickets/${id}`).set(as('hqAgent')).send({ status: 'waiting_on_user', priority: 'high' });
    expect(ok.status).toBe(200);
    const t: any = await SupportTicket.findById(id).lean();
    expect(t).toMatchObject({ status: 'waiting_on_user', priority: 'high', priorityRank: 2 });
    // The member answering puts it back in the queue.
    await request(app).post(`/support/tickets/${id}/messages`).set(as('alice')).send({ body: 'Here is the screenshot.' });
    expect((await SupportTicket.findById(id).lean() as any).status).toBe('open');
  });

  it('refuses moves the rules do not allow', async () => {
    const id = (await raise('alice', { subject: 'Closed is final' })).body.data.id;
    await request(app).patch(`/support/tickets/${id}`).set(as('hqAgent')).send({ status: 'closed' });
    const r = await request(app).patch(`/support/tickets/${id}`).set(as('hqAgent')).send({ status: 'open' });
    expect(r.status).toBe(409);
    expect((await request(app).patch(`/support/tickets/${id}`).set(as('hqAgent')).send({ status: 'deleted' })).status).toBe(400);
  });

  it('a resolved ticket takes no reply, only a reopen', async () => {
    const id = (await raise('alice', { subject: 'Reply after resolve' })).body.data.id;
    await request(app).patch(`/support/tickets/${id}`).set(as('hqAgent')).send({ status: 'resolved' });
    const r = await request(app).post(`/support/tickets/${id}/messages`).set(as('alice')).send({ body: 'still broken' });
    expect(r.status).toBe(409);
    expect(r.body.code).toBe('RESOLVED');
  });
});

describe('reopening', () => {
  it('follows the configured policy', async () => {
    const id = (await raise('alice', { subject: 'Reopen me' })).body.data.id;
    expect((await request(app).post(`/support/tickets/${id}/reopen`).set(as('alice'))).status).toBe(409); // not resolved yet
    await request(app).patch(`/support/tickets/${id}`).set(as('hqAgent')).send({ status: 'resolved' });
    expect((await request(app).post(`/support/tickets/${id}/reopen`).set(as('bob'))).status).toBe(404); // not theirs
    const r = await request(app).post(`/support/tickets/${id}/reopen`).set(as('alice')).send({ reason: 'It came back.' });
    expect(r.status).toBe(200);
    expect(r.body.data).toEqual({ status: 'open', reopenCount: 1 });

    await SupportConfiguration.create({ tenantId: COLLEGE, reopen: { maxReopens: 1 } });
    await request(app).patch(`/support/tickets/${id}`).set(as('hqAgent')).send({ status: 'resolved' });
    const again = await request(app).post(`/support/tickets/${id}/reopen`).set(as('alice'));
    expect(again.status).toBe(409);
    expect(again.body.code).toBe('LIMIT');
    await SupportConfiguration.deleteMany({ tenantId: COLLEGE });
  });
});

describe('assignment and bulk actions', () => {
  it('assigns only to agents in reach and tells the assignee', async () => {
    const id = (await raise('alice', { subject: 'Assign me' })).body.data.id;
    expect((await request(app).patch(`/support/tickets/${id}`).set(as('hqAgent')).send({ assigneeId: ids.alice })).status).toBe(400);
    expect((await request(app).patch(`/support/tickets/${id}`).set(as('collegeAgent')).send({ assigneeId: ids.hqAgent })).status).toBe(400);
    expect((await request(app).patch(`/support/tickets/${id}`).set(as('hqAgent')).send({ assigneeId: ids.hqAgent2 })).status).toBe(200);
    await new Promise(res => setTimeout(res, 200));
    const n: any = await Notification.findOne({ userId: ids.hqAgent2, link: `/admin/support/tickets/${id}` }).lean();
    expect(String(n?.tenantId)).toBe(HQ); // in the assignee's own tenant, where they will look
    const q = await request(app).get(`/support/queue?assignee=${ids.hqAgent2}`).set(as('hqAgent'));
    expect(q.body.data.tickets.map((t: any) => t.id)).toContain(id);
  });

  it('applies to each ticket on its own merits and reports per ticket', async () => {
    const a = (await raise('alice', { subject: 'Bulk one' })).body.data.id;
    const b = (await raise('olga', { subject: 'Bulk two' })).body.data.id;
    // The college agent cannot touch the other college's ticket; the bulk call says so for that one only.
    const r = await request(app).post('/support/tickets/bulk').set(as('collegeAgent')).send({ ids: [a, b], update: { priority: 'critical', tenantId: OTHER } });
    expect(r.status).toBe(200);
    expect(r.body.data.updated).toBe(1);
    expect(r.body.data.results.find((x: any) => x.id === b).ok).toBe(false);
    expect((await SupportTicket.findById(a).lean() as any).priority).toBe('critical');
    expect((await SupportTicket.findById(b).lean() as any).priority).toBe('medium');
    expect((await request(app).post('/support/tickets/bulk').set(as('coord')).send({ ids: [a], update: { status: 'closed' } })).status).toBe(403);
  });
});

describe('queue filters and paging', () => {
  it('filters, searches and pages', async () => {
    const r = await raise('bob', { subject: 'Searchable payment issue', module: 'payment', category: 'payment' });
    const num = r.body.data.ticketNumber;
    const byNum = await request(app).get(`/support/queue?q=${num}`).set(as('hqAgent'));
    expect(byNum.body.data.tickets.map((t: any) => t.ticketNumber)).toEqual([num]);
    const byModule = await request(app).get('/support/queue?module=payment&limit=100').set(as('hqAgent'));
    expect(byModule.body.data.tickets.every((t: any) => t.module === 'payment')).toBe(true);
    const page = await request(app).get('/support/queue?limit=2&page=2&sort=oldest').set(as('hqAgent'));
    expect(page.body.data).toMatchObject({ page: 2, limit: 2 });
    expect(page.body.data.tickets.length).toBeLessThanOrEqual(2);
    // Hostile input is just text.
    expect((await request(app).get('/support/queue?q=.*(&status[$ne]=x').set(as('hqAgent'))).status).toBe(200);
    expect(byNum.body.data.tickets[0].description).toBeUndefined();
  });
});

describe('attachments', () => {
  let id = '';
  beforeAll(async () => { id = (await raise('alice', { subject: 'With a screenshot' })).body.data.id; });

  it('accepts a real image and serves it to people who may see the ticket', async () => {
    const r = await request(app).post(`/support/tickets/${id}/messages`).set(as('alice')).field('body', 'Screenshot attached').attach('files', PNG, { filename: '../../shot.png', contentType: 'image/png' });
    expect(r.status).toBe(201);
    const detail = await request(app).get(`/support/tickets/${id}`).set(as('alice'));
    const att = detail.body.data.messages.find((m: any) => m.attachments.length).attachments[0];
    expect(att.name).toBe('shot.png');
    const dl = await request(app).get(`/support/tickets/${id}/attachments/${att.id}`).set(as('alice'));
    expect(dl.status).toBe(200);
    expect(dl.headers['content-type']).toBe('image/png');
    expect(dl.headers['x-content-type-options']).toBe('nosniff');
    expect((await request(app).get(`/support/tickets/${id}/attachments/${att.id}`).set(as('bob'))).status).toBe(404);
    expect((await request(app).get(`/support/tickets/${id}/attachments/${att.id}`).set(as('hqAgent'))).status).toBe(200);
  });

  it('refuses a file whose bytes do not match its type, and keeps nothing', async () => {
    const before = fs.existsSync(path.join(workDir, 'uploads', '.private', 'support', id)) ? fs.readdirSync(path.join(workDir, 'uploads', '.private', 'support', id)).length : 0;
    const r = await request(app).post(`/support/tickets/${id}/messages`).set(as('alice')).field('body', 'fake').attach('files', Buffer.from('<script>alert(1)</script>'), { filename: 'x.png', contentType: 'image/png' });
    expect(r.status).toBe(400);
    const after = fs.readdirSync(path.join(workDir, 'uploads', '.private', 'support', id)).length;
    expect(after).toBe(before);
    expect(fs.readdirSync(path.join(workDir, 'uploads', '.private', 'tmp'))).toEqual([]);
  });

  it('refuses other types and oversized files', async () => {
    expect((await request(app).post(`/support/tickets/${id}/messages`).set(as('alice')).field('body', 'html').attach('files', Buffer.from('<html>'), { filename: 'x.html', contentType: 'text/html' })).status).toBe(400);
    const big = Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)]);
    expect((await request(app).post(`/support/tickets/${id}/messages`).set(as('alice')).field('body', 'big').attach('files', big, { filename: 'big.png', contentType: 'image/png' })).status).toBe(400);
  });

  it('keeps no file for a request that is not allowed to write', async () => {
    const r = await request(app).post(`/support/tickets/${id}/messages`).set(as('bob')).field('body', 'not mine').attach('files', PNG, { filename: 'a.png', contentType: 'image/png' });
    expect(r.status).toBe(404);
    expect(fs.readdirSync(path.join(workDir, 'uploads', '.private', 'tmp'))).toEqual([]);
  });
});

describe('rate limits', () => {
  it('stops a flood of new tickets from one person', async () => {
    let last = 0;
    for (let i = 0; i < 12; i++) last = (await raise('bob', { subject: `Flood ${i}` })).status;
    expect(last).toBe(429);
  });
});
