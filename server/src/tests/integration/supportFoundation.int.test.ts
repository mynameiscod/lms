/**
 * Help & Support foundation against a real database: ticket numbers under concurrency, the actor
 * built from real roles and college memberships, the permission middleware, the rate limiter on
 * support routes, and the indexes the later phases depend on.
 */
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import { startMongo, stopMongo } from './mongoHarness';

jest.setTimeout(180_000);

import User from '../../models/User';
import Role from '../../models/Role';
import CollegeMembership from '../../models/CollegeMembership';
import SupportCounter from '../../models/SupportCounter';
import SupportAuditLog from '../../models/SupportAuditLog';
import SupportConfiguration from '../../models/SupportConfiguration';
import { nextTicketNumber, yearOf } from '../../services/supportTicketNumber';
import { resolveSupportActor, audit, effectiveSupportConfig } from '../../services/supportAccess';
import { requireSupport } from '../../middleware/supportAccess';
import { rateLimit, __resetRateLimits, POLICIES } from '../../middleware/rateLimit';
import { SUPPORT_MODELS } from '../../scripts/supportEnsureIndexes';
import { seedSupport, assertNotProduction } from '../../scripts/seedSupportDev';

const HQ = new mongoose.Types.ObjectId();
const COLLEGE = new mongoose.Types.ObjectId();
const users: Record<string, { id: string; role: string; tenantId: string; customRoleId?: string | null; email: string }> = {};

beforeAll(async () => {
  await startMongo();
  process.env.SUPPORT_HQ_TENANT_ID = String(HQ);
  const agentRole: any = await Role.create({ name: 'Support agent', permissions: ['support_agent'], tenantId: HQ } as any);
  const mk = async (key: string, role: string, tenantId: mongoose.Types.ObjectId, customRoleId?: unknown) => {
    const u: any = await User.create({ tenantId, firstName: key, lastName: 'T', email: `${key}@support.test`, password: 'x', role, isActive: true, customRoleId } as any);
    users[key] = { id: String(u._id), role, tenantId: String(tenantId), customRoleId: customRoleId ? String(customRoleId) : null, email: u.email };
    return u;
  };
  await mk('student', 'STUDENT', COLLEGE);
  const officer = await mk('officer', 'STAFF', COLLEGE);
  await CollegeMembership.create({ userId: officer._id, tenantId: COLLEGE, collegeRole: 'PLACEMENT_OFFICER', isActive: true } as any);
  const trainer = await mk('trainer', 'STAFF', COLLEGE);
  await CollegeMembership.create({ userId: trainer._id, tenantId: COLLEGE, collegeRole: 'CRT_TRAINER', isActive: true } as any);
  await mk('hqAgent', 'STAFF', HQ, agentRole._id);
  await mk('collegeAgent', 'STAFF', COLLEGE, agentRole._id);
});

afterAll(async () => {
  delete process.env.SUPPORT_HQ_TENANT_ID;
  await stopMongo();
});

describe('ticket numbers', () => {
  beforeEach(() => SupportCounter.deleteMany({}));

  it('are unique and gap-free when 60 tickets are raised at once', async () => {
    const nums = await Promise.all(Array.from({ length: 60 }, () => nextTicketNumber()));
    expect(new Set(nums).size).toBe(60);
    const seqs = nums.map(n => Number(n.split('-')[2])).sort((a, b) => a - b);
    expect(seqs).toEqual(Array.from({ length: 60 }, (_, i) => i + 1));
    expect(nums[0]).toMatch(new RegExp(`^SUP-${yearOf(new Date())}-\\d{5}$`));
  });

  it('start a new series each year', async () => {
    const a = await nextTicketNumber(new Date('2026-06-01T00:00:00Z'));
    const b = await nextTicketNumber(new Date('2027-06-01T00:00:00Z'));
    expect([a, b]).toEqual(['SUP-26-00001', 'SUP-27-00001']);
  });
});

describe('actor from real roles and memberships', () => {
  it('reads college role and custom-role permissions from the database', async () => {
    expect((await resolveSupportActor(users.student)).kind).toBe('requester');
    expect(await resolveSupportActor(users.officer)).toMatchObject({ kind: 'coordinator', allTenants: false });
    expect(await resolveSupportActor(users.trainer)).toMatchObject({ kind: 'requester', faculty: true });
    expect(await resolveSupportActor(users.hqAgent)).toMatchObject({ kind: 'agent', allTenants: true });
    expect(await resolveSupportActor(users.collegeAgent)).toMatchObject({ kind: 'agent', allTenants: false });
  });

  it('an inactive membership grants nothing', async () => {
    await CollegeMembership.updateOne({ userId: users.officer.id }, { $set: { isActive: false } });
    try {
      expect((await resolveSupportActor(users.officer)).kind).toBe('requester');
    } finally {
      await CollegeMembership.updateOne({ userId: users.officer.id }, { $set: { isActive: true } });
    }
  });
});

describe('requireSupport and the support rate limits', () => {
  const app = express();
  app.use(express.json());
  // Stands in for authMiddleware: the login decides who the caller is.
  app.use((req: any, _res, next) => { req.user = users[String(req.headers['x-test-user'])]; next(); });
  app.get('/college', requireSupport('viewCollege'), (req: any, res) => res.json({ kind: req.supportActor.kind }));
  app.post('/work', requireSupport('work'), (req: any, res) => res.json({ kind: req.supportActor.kind }));
  app.post('/tickets', requireSupport('raise'), rateLimit('supportTicketCreate'), (_req, res) => res.status(201).json({ ok: true }));

  it('refuses callers without the capability, whatever the body claims', async () => {
    const r = await request(app).get('/college').set('x-test-user', 'student').send({ role: 'SUPER_ADMIN', kind: 'manager' });
    expect(r.status).toBe(403);
    expect((await request(app).post('/work').set('x-test-user', 'officer')).status).toBe(403);
  });

  it('lets the right people through', async () => {
    expect((await request(app).get('/college').set('x-test-user', 'officer')).body.kind).toBe('coordinator');
    expect((await request(app).post('/work').set('x-test-user', 'hqAgent')).body.kind).toBe('agent');
  });

  it('needs a login', async () => {
    expect((await request(app).get('/college')).status).toBe(401);
  });

  it('limits ticket creation per person', async () => {
    __resetRateLimits();
    const max = POLICIES.supportTicketCreate.max;
    for (let i = 0; i < max; i++) expect((await request(app).post('/tickets').set('x-test-user', 'student')).status).toBe(201);
    const blocked = await request(app).post('/tickets').set('x-test-user', 'student');
    expect(blocked.status).toBe(429);
    expect(blocked.headers['retry-after']).toBeDefined();
    // Someone else in the same college is unaffected.
    expect((await request(app).post('/tickets').set('x-test-user', 'trainer')).status).toBe(201);
    __resetRateLimits();
  });
});

describe('audit trail and configuration', () => {
  it('marks an HQ read of a college record as cross-tenant', async () => {
    const actor = await resolveSupportActor(users.hqAgent);
    const ticketId = new mongoose.Types.ObjectId();
    await audit({ actor, entity: 'ticket', entityId: ticketId, tenantId: COLLEGE, action: 'view', requestId: 'req-12345678' });
    const row: any = await SupportAuditLog.findOne({ entityId: ticketId }).lean();
    expect(row).toMatchObject({ action: 'view', actorKind: 'agent', crossTenant: true, requestId: 'req-12345678' });
  });

  it('starts with no targets, and the dev seed keeps it that way', async () => {
    const r = await seedSupport(String(COLLEGE), 0);
    expect(r.config).toBe(true);
    const c = await effectiveSupportConfig(String(COLLEGE));
    expect(c.slaConfigured).toBe(false);
    expect(await SupportConfiguration.countDocuments({ tenantId: COLLEGE })).toBe(1);
  });

  it('allows only one configuration per tenant', async () => {
    await expect(SupportConfiguration.create({ tenantId: COLLEGE })).rejects.toMatchObject({ code: 11000 });
  });

  it('the dev seed refuses production', () => {
    expect(() => assertNotProduction({ NODE_ENV: 'production' } as any)).toThrow(/production/);
    expect(() => assertNotProduction({ MONGODB_URI: 'mongodb+srv://x/y' } as any)).toThrow(/hosted/);
    expect(() => assertNotProduction({ MONGODB_URI: 'mongodb://localhost/x' } as any)).not.toThrow();
  });
});

describe('indexes', () => {
  it('creates every declared index, including the FAQ text index', async () => {
    for (const m of SUPPORT_MODELS) await m.createIndexes();
    const faq = await mongoose.model('SupportFaq').collection.indexes();
    expect(faq.some((i: any) => i.name === 'faq_text')).toBe(true);
    const tickets = await mongoose.model('SupportTicket').collection.indexes();
    expect(tickets.some((i: any) => i.key.ticketNumber === 1 && i.unique)).toBe(true);
    expect(tickets.some((i: any) => i.key.tenantId === 1 && i.key.requesterId === 1)).toBe(true);
  });
});
