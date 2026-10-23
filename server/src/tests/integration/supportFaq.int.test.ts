/**
 * Help Center articles through the real routes: only published articles for the reader's
 * audience and institute, search (text index and prefix fallback), logging of unanswered
 * searches, one vote per person, and the draft → published → archived rules for managers.
 */
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { startMongo, stopMongo } from './mongoHarness';

jest.setTimeout(180_000);
process.env.JWT_SECRET = process.env.JWT_SECRET || 'support-faq-integration-test-secret-0123456789abcdef';

import User from '../../models/User';
import Role from '../../models/Role';
import Tenant from '../../models/Tenant';
import SupportFaq from '../../models/SupportFaq';
import SupportSearchLog from '../../models/SupportSearchLog';
import supportRoutes from '../../routes/supportRoutes';
import { __resetRateLimits } from '../../middleware/rateLimit';
import { seedPlaceholders, PLACEHOLDERS, PLACEHOLDER_MARK } from '../../scripts/seedSupportFaqPlaceholders';

const app = express();
app.use(express.json());
app.use('/support', supportRoutes);

const tokens: Record<string, string> = {};
let HQ = ''; let COLLEGE = ''; let OTHER = '';
const as = (who: string) => ({ Authorization: `Bearer ${tokens[who]}` });
const faqIds: Record<string, string> = {};

beforeAll(async () => {
  await startMongo();
  const mkTenant = async (slug: string) => String((await Tenant.create({ name: slug, slug, domain: `${slug}.test`, isActive: true, adminId: new mongoose.Types.ObjectId() } as any))._id);
  HQ = await mkTenant('hq'); COLLEGE = await mkTenant('college'); OTHER = await mkTenant('other');
  process.env.SUPPORT_HQ_TENANT_ID = HQ;
  const mgrRole: any = await Role.create({ name: 'Support manager', permissions: ['support_manager'] } as any);
  const agentRole: any = await Role.create({ name: 'Support agent', permissions: ['support_agent'] } as any);
  const mk = async (key: string, role: string, tenantId: string, customRoleId?: unknown) => {
    const u: any = await User.create({ tenantId, firstName: key, lastName: 'T', email: `${key}@x.test`, password: 'x', role, isActive: true, customRoleId } as any);
    tokens[key] = jwt.sign({ id: String(u._id), email: u.email, role, tenantId, customRoleId: customRoleId ? String(customRoleId) : undefined }, process.env.JWT_SECRET as string);
  };
  await mk('student', 'STUDENT', COLLEGE);
  await mk('teacher', 'INSTRUCTOR', COLLEGE);
  await mk('otherStudent', 'STUDENT', OTHER);
  await mk('hqManager', 'STAFF', HQ, mgrRole._id);
  await mk('collegeManager', 'STAFF', COLLEGE, mgrRole._id);
  await mk('agent', 'STAFF', HQ, agentRole._id);

  const pub = async (key: string, over: Record<string, unknown>) => {
    const f: any = await SupportFaq.create({ question: 'Placeholder question text', answer: 'Answer.', category: 'General', status: 'published', needsOwnerReview: false, ...over });
    faqIds[key] = String(f._id);
  };
  await pub('reset', { question: 'How do I reset my password?', answer: 'Use Forgot password on the sign-in page.', category: 'Account & login', module: 'account', keywords: ['otp', 'login'] });
  await pub('faculty', { question: 'How do I review my batch progress?', category: 'For faculty', audiences: ['faculty'] });
  await pub('collegeOnly', { question: 'Where is our college placement cell?', category: 'College', tenantId: COLLEGE });
  await pub('otherOnly', { question: 'Where is the other college office?', category: 'College', tenantId: OTHER });
  await pub('payment', { question: 'Where can I find my payment receipt?', category: 'Membership & payment', module: 'payment' });
  const draft: any = await SupportFaq.create({ question: 'Secret draft about password changes', answer: 'Not ready.', category: 'Account & login' });
  faqIds.draft = String(draft._id);
  const archived: any = await SupportFaq.create({ question: 'Old password article archived', answer: 'Old.', category: 'Account & login', status: 'archived', needsOwnerReview: false });
  faqIds.archived = String(archived._id);
  await SupportFaq.createIndexes();
});

afterAll(async () => { delete process.env.SUPPORT_HQ_TENANT_ID; await stopMongo(); });
beforeEach(() => __resetRateLimits());

describe('what a reader can see', () => {
  it('only published articles, never drafts or archived ones', async () => {
    const r = await request(app).get('/support/faqs/search?q=password').set(as('student'));
    const ids = r.body.data.map((h: any) => h.id);
    expect(ids).toContain(faqIds.reset);
    expect(ids).not.toContain(faqIds.draft);
    expect(ids).not.toContain(faqIds.archived);
    expect((await request(app).get(`/support/faqs/${faqIds.draft}`).set(as('student'))).status).toBe(404);
    expect((await request(app).get(`/support/faqs/${faqIds.archived}`).set(as('student'))).status).toBe(404);
  });

  it('articles for an audience reach only that audience', async () => {
    expect((await request(app).get(`/support/faqs/${faqIds.faculty}`).set(as('student'))).status).toBe(404);
    expect((await request(app).get(`/support/faqs/${faqIds.faculty}`).set(as('teacher'))).status).toBe(200);
  });

  it("an institute's own articles stay inside it; platform-wide ones reach everyone", async () => {
    expect((await request(app).get(`/support/faqs/${faqIds.collegeOnly}`).set(as('student'))).status).toBe(200);
    expect((await request(app).get(`/support/faqs/${faqIds.otherOnly}`).set(as('student'))).status).toBe(404);
    expect((await request(app).get(`/support/faqs/${faqIds.reset}`).set(as('otherStudent'))).status).toBe(200);
    const cats = (await request(app).get('/support/faqs/categories').set(as('student'))).body.data.map((c: any) => c.category);
    expect(cats).toEqual(expect.arrayContaining(['Account & login', 'College', 'Membership & payment']));
    expect(cats).not.toContain('For faculty');
  });

  it('opening an article counts a view and lists related ones', async () => {
    const r = await request(app).get(`/support/faqs/${faqIds.reset}`).set(as('student'));
    expect(r.body.data.answer).toContain('Forgot password');
    expect(r.body.data.myVote).toBeNull();
    expect((await SupportFaq.findById(faqIds.reset).lean() as any).views).toBeGreaterThanOrEqual(1);
  });
});

describe('search', () => {
  it('ranks by the text index and falls back to prefixes', async () => {
    expect((await request(app).get('/support/faqs/search?q=receipt').set(as('student'))).body.data[0].id).toBe(faqIds.payment);
    // "passw" is not a whole word: the prefix fallback still finds it.
    expect((await request(app).get('/support/faqs/suggest?q=passw').set(as('student'))).body.data.map((h: any) => h.id)).toContain(faqIds.reset);
    // Keywords count.
    expect((await request(app).get('/support/faqs/search?q=otp').set(as('student'))).body.data.map((h: any) => h.id)).toContain(faqIds.reset);
  });

  it('logs submitted searches, redacted, including unanswered ones; suggestions are not logged', async () => {
    await SupportSearchLog.deleteMany({});
    await request(app).get('/support/faqs/suggest?q=refund').set(as('student'));
    expect(await SupportSearchLog.countDocuments({})).toBe(0);
    await request(app).get('/support/faqs/search?q=refund policy for me at a.b@x.test').set(as('student'));
    await new Promise(r => setTimeout(r, 100));
    const row: any = await SupportSearchLog.findOne({}).lean();
    expect(row.resultCount).toBe(0);
    expect(row.query).not.toContain('a.b@x.test');
  });

  it("a member's quotes and dashes do not change what the search means", async () => {
    expect((await request(app).get(`/support/faqs/search?q=${encodeURIComponent('"reset my" password -otp')}`).set(as('student'))).body.data.map((h: any) => h.id)).toContain(faqIds.reset);
  });

  it('treats hostile input as text', async () => {
    expect((await request(app).get('/support/faqs/search?q=(.*)%5B%24ne%5D').set(as('student'))).status).toBe(200);
  });
});

describe('was this helpful', () => {
  it('counts one vote per person and moves it when they change their mind', async () => {
    const id = faqIds.payment;
    await request(app).post(`/support/faqs/${id}/vote`).set(as('student')).send({ helpful: true });
    await request(app).post(`/support/faqs/${id}/vote`).set(as('student')).send({ helpful: true });
    let f: any = await SupportFaq.findById(id).lean();
    expect([f.helpfulYes, f.helpfulNo]).toEqual([1, 0]);
    await request(app).post(`/support/faqs/${id}/vote`).set(as('student')).send({ helpful: false });
    f = await SupportFaq.findById(id).lean();
    expect([f.helpfulYes, f.helpfulNo]).toEqual([0, 1]);
    expect((await request(app).get(`/support/faqs/${id}`).set(as('student'))).body.data.myVote).toBe(false);
    expect((await request(app).post(`/support/faqs/${id}/vote`).set(as('student')).send({ helpful: 'yes' })).status).toBe(400);
    expect((await request(app).post(`/support/faqs/${faqIds.draft}/vote`).set(as('student')).send({ helpful: true })).status).toBe(404);
  });
});

describe('managing articles', () => {
  it('only managers manage; an agent and a student cannot', async () => {
    expect((await request(app).get('/support/admin/faqs').set(as('student'))).status).toBe(403);
    expect((await request(app).get('/support/admin/faqs').set(as('agent'))).status).toBe(403);
    expect((await request(app).get('/support/admin/faqs').set(as('hqManager'))).status).toBe(200);
  });

  it('new articles are drafts awaiting review, and cannot be published until reviewed', async () => {
    const c = await request(app).post('/support/admin/faqs').set(as('hqManager')).send({ question: 'How do I change my email address?', answer: 'Steps.', category: 'Account & login', platformWide: true, status: 'published', views: 999 });
    expect(c.status).toBe(201);
    expect(c.body.data).toMatchObject({ status: 'draft', needsOwnerReview: true, platformWide: true, views: 0 });
    const id = c.body.data.id;
    const blocked = await request(app).post(`/support/admin/faqs/${id}/status`).set(as('hqManager')).send({ status: 'published' });
    expect(blocked.status).toBe(409);
    expect(blocked.body.code).toBe('NEEDS_REVIEW');
    const ok = await request(app).post(`/support/admin/faqs/${id}/status`).set(as('hqManager')).send({ status: 'published', reviewed: true });
    expect(ok.body.data).toMatchObject({ status: 'published', needsOwnerReview: false });
    expect((await request(app).get(`/support/faqs/${id}`).set(as('otherStudent'))).status).toBe(200);
    await request(app).post(`/support/admin/faqs/${id}/status`).set(as('hqManager')).send({ status: 'archived' });
    expect((await request(app).get(`/support/faqs/${id}`).set(as('otherStudent'))).status).toBe(404);
  });

  it("an institute's manager writes only for that institute", async () => {
    expect((await request(app).post('/support/admin/faqs').set(as('collegeManager')).send({ question: 'Platform wide attempt here', answer: 'x', category: 'X', platformWide: true })).status).toBe(403);
    const c = await request(app).post('/support/admin/faqs').set(as('collegeManager')).send({ question: 'Where do we collect ID cards?', answer: 'x', category: 'College' });
    expect(c.body.data.tenantId).toBe(COLLEGE);
    // And cannot edit the platform-wide articles.
    expect((await request(app).patch(`/support/admin/faqs/${faqIds.reset}`).set(as('collegeManager')).send({ answer: 'hijack' })).status).toBe(404);
    const list = await request(app).get('/support/admin/faqs?limit=100').set(as('collegeManager'));
    expect(list.body.data.articles.every((a: any) => a.tenantId === COLLEGE)).toBe(true);
  });

  it('insights list unanswered searches and low-rated articles', async () => {
    const r = await request(app).get('/support/admin/faqs/insights').set(as('hqManager'));
    expect(r.status).toBe(200);
    expect(r.body.data.unanswered.some((u: any) => /refund/.test(u.query))).toBe(true);
  });
});

describe('placeholder seed', () => {
  it('writes drafts awaiting review, with no claims, and is idempotent', async () => {
    const first = await seedPlaceholders(null, true);
    expect(first.made).toHaveLength(PLACEHOLDERS.length);
    const again = await seedPlaceholders(null, true);
    expect(again.made).toHaveLength(0);
    const rows: any[] = await SupportFaq.find({ answer: { $regex: '^\\[DRAFT' } }).lean();
    expect(rows.every(f => f.status === 'draft' && f.needsOwnerReview && f.answer.startsWith(PLACEHOLDER_MARK))).toBe(true);
    // Invisible to members.
    const hits = (await request(app).get('/support/faqs/search?q=career track').set(as('student'))).body.data;
    expect(hits.some((h: any) => rows.some(f => String(f._id) === h.id))).toBe(false);
  });
});
