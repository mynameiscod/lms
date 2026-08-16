/**
 * The product funnel: how far members get through CareerPilot.
 *
 * Distinct from the sales funnel, which ranks the same people by how close they are to
 * paying. This one measures where the product loses them, and every stage is counted from
 * the module that already owns it rather than from a second opinion invented here.
 *
 * The failure this suite guards against is a denominator that quietly includes people it
 * should not, or a stage counted per ROW so one enthusiastic student pushes it over 100%.
 */

import mongoose from 'mongoose';
import { startMongo, stopMongo, clearCollections, ensureIndexes } from './mongoHarness';

jest.setTimeout(180_000);

import User from '../../models/User';
import PersonalizedAssessment from '../../models/PersonalizedAssessment';
import StudentSkillProfile from '../../models/StudentSkillProfile';
import CareerRoadmap from '../../models/CareerRoadmap';
import PassportInterview from '../../models/PassportInterview';
import { XpLedger } from '../../models/GamificationModels';
import { CAREERPILOT_PRODUCT } from '../../services/careerPilotPopulation';
import { buildLearningFunnel, LearningStageKey } from '../../services/careerPilotLearningFunnelService';
import { resolveRange, rate, MAX_RANGE_DAYS } from '../../data/analyticsPolicy';

const TENANT = '507f1f77bcf86cd7994311a1';
const OTHER = '507f1f77bcf86cd7994311b2';
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
const daysAhead = (n: number) => new Date(Date.now() + n * 86_400_000);

let seq = 0;
const RANGE = { from: daysAgo(30), to: new Date(), days: 30 };

const member = (passport: any = {}, tenantId = TENANT) => {
  seq += 1;
  return User.create({
    tenantId, firstName: `M${seq}`, lastName: 'X',
    email: `lf${seq}@example.com`, phone: `9211${String(seq).padStart(6, '0')}`,
    password: 'x', role: 'STUDENT', createdAt: daysAgo(40),
    passport: { active: false, product: CAREERPILOT_PRODUCT, ...passport },
  });
};

const plainStudent = (tenantId = TENANT) => {
  seq += 1;
  return User.create({
    tenantId, firstName: `P${seq}`, lastName: 'X',
    email: `lp${seq}@example.com`, phone: `9311${String(seq).padStart(6, '0')}`,
    password: 'x', role: 'STUDENT',
  });
};

const assessment = (studentId: any, over: any = {}, tenantId = TENANT) =>
  PersonalizedAssessment.create({
    tenantId, studentId, attemptNumber: 1, status: 'IN_PROGRESS',
    policyKey: 'FOUNDATION_V1', policyVersion: 1, stage: 'placement',
    roleKey: 'BACKEND_ENGINEER', blueprintVersion: 1, generationSeed: `s${Math.random()}`,
    ...over,
  });

const roadmap = (studentId: any, status = 'ACTIVE', tenantId = TENANT) =>
  CareerRoadmap.create({
    tenantId, studentId, roleKey: 'BACKEND_ENGINEER', roleName: 'Backend Engineer',
    status, version: 1, blueprintVersion: 1, policyVersion: 'ROADMAP_V1',
    startDate: daysAgo(30), endDate: daysAhead(60),
    roadmapDays: 90, weekCount: 13,
    input: { minutesPerDay: 60, daysPerWeek: 5 },
  } as any);

const stage = (r: any, key: LearningStageKey) => r.stages.find((s: any) => s.key === key);
const metric = (r: any, key: string) => r.metrics.find((m: any) => m.key === key);

beforeAll(async () => {
  await startMongo();
  await ensureIndexes([User as any]);
});
afterAll(stopMongo);
beforeEach(async () => { await clearCollections(); seq = 0; });

// ── the denominator ─────────────────────────────────────────────────────────

describe('the member denominator', () => {
  it('excludes ordinary LMS students', async () => {
    for (let i = 0; i < 5; i += 1) await plainStudent();
    await member();
    await member();

    const r = await buildLearningFunnel(TENANT, RANGE);

    expect(r.cohorts.members).toBe(2);
    expect(stage(r, 'member').count).toBe(2);
  });

  it('is the denominator for every stage, not the stage above', async () => {
    // 4 members; 2 completed an assessment; 1 has a roadmap.
    const a = await member({ contextCompletedAt: daysAgo(9) });
    const b = await member({ contextCompletedAt: daysAgo(9) });
    await member(); await member();
    await assessment(a._id, { status: 'SUBMITTED', submittedAt: daysAgo(6) });
    await assessment(b._id, { status: 'SUBMITTED', submittedAt: daysAgo(6) });
    await roadmap(a._id);

    const r = await buildLearningFunnel(TENANT, RANGE);

    // 1 of 4 = 25%. Expressed against the stage above it would read 50%, which cannot be
    // compared with any other stage on the chart.
    expect(stage(r, 'roadmap_generated').shareOfMembers).toBe(25);
    expect(stage(r, 'assessment_completed').shareOfMembers).toBe(50);
  });

  it('reports no data rather than 0% for an empty tenant', async () => {
    const r = await buildLearningFunnel(TENANT, RANGE);

    expect(r.cohorts.members).toBe(0);
    // A tenant with no members has not achieved 0% completion; nothing has happened.
    expect(stage(r, 'assessment_completed').shareOfMembers).toBeNull();
    expect(metric(r, 'assessment_completion').value).toBeNull();
  });

  it('counts a member once however many rows they have', async () => {
    const a = await member();
    await assessment(a._id, { status: 'SUBMITTED', submittedAt: daysAgo(9) });
    await assessment(a._id, { attemptNumber: 2, status: 'SUBMITTED', submittedAt: daysAgo(4), purpose: 'REASSESSMENT' });
    await assessment(a._id, { attemptNumber: 3, status: 'SUBMITTED', submittedAt: daysAgo(1), purpose: 'REASSESSMENT' });

    const r = await buildLearningFunnel(TENANT, RANGE);

    // Three sittings, one member. Counting rows would report 300% completion.
    expect(stage(r, 'assessment_completed').count).toBe(1);
    expect(stage(r, 'assessment_completed').shareOfMembers).toBe(100);
  });
});

// ── the stages ──────────────────────────────────────────────────────────────

describe('each stage reads its own authoritative source', () => {
  it('counts career context from the stored completion stamp', async () => {
    await member({ contextCompletedAt: daysAgo(5) });
    await member();

    const r = await buildLearningFunnel(TENANT, RANGE);
    expect(stage(r, 'context_completed').count).toBe(1);
  });

  it('does not count NOT_SURE as a chosen role', async () => {
    await member({ primaryRole: 'BACKEND_ENGINEER' });
    await member({ primaryRole: 'NOT_SURE' });
    await member();

    const r = await buildLearningFunnel(TENANT, RANGE);
    // NOT_SURE is a real answer to the question, but it is not a target role.
    expect(stage(r, 'role_selected').count).toBe(1);
  });

  it('separates an assessment started from one completed', async () => {
    const a = await member();
    const b = await member();
    await assessment(a._id);                                                  // in progress
    await assessment(b._id, { status: 'SUBMITTED', submittedAt: daysAgo(2) });

    const r = await buildLearningFunnel(TENANT, RANGE);
    expect(stage(r, 'assessment_started').count).toBe(2);
    expect(stage(r, 'assessment_completed').count).toBe(1);
  });

  it('counts Skill DNA from Module 7 profiles', async () => {
    const a = await member();
    await StudentSkillProfile.create({
      tenantId: TENANT, studentId: a._id, skillKey: 'JAVA_OOP', score: 70, confidence: 'HIGH',
    } as any);
    await member();

    const r = await buildLearningFunnel(TENANT, RANGE);
    expect(stage(r, 'skill_dna').count).toBe(1);
  });

  it('counts a superseded roadmap as generated', async () => {
    const a = await member();
    await roadmap(a._id, 'SUPERSEDED');

    const r = await buildLearningFunnel(TENANT, RANGE);
    // They did generate one. Replacing it later does not undo that.
    expect(stage(r, 'roadmap_generated').count).toBe(1);
  });

  it('counts the first mission from the XP ledger, not from a page view', async () => {
    const a = await member();
    await XpLedger.create({
      tenantId: TENANT, studentId: a._id, eventKey: 'CAREER_MISSION_COMPLETED',
      idempotencyKey: 'k1', amount: 10, at: daysAgo(3),
    } as any);
    const b = await member();
    await XpLedger.create({
      tenantId: TENANT, studentId: b._id, eventKey: 'PERSONALIZED_ASSESSMENT_COMPLETED',
      idempotencyKey: 'k2', amount: 100, at: daysAgo(3),
    } as any);

    const r = await buildLearningFunnel(TENANT, RANGE);
    expect(stage(r, 'first_mission').count).toBe(1);
    // Both earned XP recently, so both are active.
    expect(stage(r, 'active_7d').count).toBe(2);
  });

  it('does not count activity older than the seven-day window as active', async () => {
    const a = await member();
    await XpLedger.create({
      tenantId: TENANT, studentId: a._id, eventKey: 'CAREER_MISSION_COMPLETED',
      idempotencyKey: 'k3', amount: 10, at: daysAgo(20),
    } as any);

    const r = await buildLearningFunnel(TENANT, RANGE);
    expect(stage(r, 'first_mission').count).toBe(1);
    expect(stage(r, 'active_7d').count).toBe(0);
  });

  it('counts a reassessment as a later sitting, never the first', async () => {
    const a = await member();
    await assessment(a._id, { status: 'SUBMITTED', submittedAt: daysAgo(20), purpose: 'INITIAL' });
    const b = await member();
    await assessment(b._id, { status: 'SUBMITTED', submittedAt: daysAgo(20), purpose: 'INITIAL' });
    await assessment(b._id, { attemptNumber: 2, status: 'SUBMITTED', submittedAt: daysAgo(2), purpose: 'REASSESSMENT' });

    const r = await buildLearningFunnel(TENANT, RANGE);

    expect(stage(r, 'reassessment_completed').count).toBe(1);
    // Participation is over people who COULD reassess, not over all members.
    expect(metric(r, 'reassessment_participation').denominator).toBe(2);
    expect(metric(r, 'reassessment_participation').value).toBe(50);
  });

  it('counts a completed mock interview, not an abandoned one', async () => {
    const a = await member();
    await PassportInterview.create({
      tenantId: TENANT, studentId: a._id, status: 'completed', live: false,
      role: 'Backend', areas: ['Java'], transcript: [],
    } as any);
    const b = await member();
    await PassportInterview.create({
      tenantId: TENANT, studentId: b._id, status: 'abandoned', live: false,
      role: 'Backend', areas: ['Java'], transcript: [],
    } as any);

    const r = await buildLearningFunnel(TENANT, RANGE);
    expect(stage(r, 'mock_interview_completed').count).toBe(1);
  });

  it('counts a chosen target company from the member record', async () => {
    await member({ targetCompanies: [{ slug: 'acme', primary: true, addedAt: daysAgo(4) }] });
    await member();

    const r = await buildLearningFunnel(TENANT, RANGE);
    expect(stage(r, 'company_target_selected').count).toBe(1);
  });
});

// ── cohorts ─────────────────────────────────────────────────────────────────

describe('the cohorts stay distinct', () => {
  it('separates active, free and expired members', async () => {
    await member();                                                                    // free
    await member({ active: true, activatedAt: daysAgo(5), expiresAt: daysAhead(90) }); // active
    await member({ active: true, activatedAt: daysAgo(400), expiresAt: daysAgo(3) });  // expired
    await member({ contextCompletedAt: daysAgo(2) });                                  // free + onboarded

    const { cohorts } = await buildLearningFunnel(TENANT, RANGE);

    expect(cohorts.members).toBe(4);
    expect(cohorts.active).toBe(1);
    expect(cohorts.expired).toBe(1);
    expect(cohorts.free).toBe(2);
    expect(cohorts.onboarded).toBe(1);
  });

  it('labels current-state and period metrics differently', async () => {
    await member({ active: true, activatedAt: daysAgo(5), expiresAt: daysAhead(90) });

    const r = await buildLearningFunnel(TENANT, RANGE);

    // "Active members" is entitlement today; "active in 7 days" is a window. A dashboard
    // that showed one and labelled it the other would be lying without a wrong query.
    expect(metric(r, 'active_members').kind).toBe('SNAPSHOT');
    expect(metric(r, 'active_7d').kind).toBe('PERIOD');
  });
});

// ── tenancy ─────────────────────────────────────────────────────────────────

describe('tenant isolation', () => {
  it('never counts another tenant’s members or their records', async () => {
    const mine = await member();
    await assessment(mine._id, { status: 'SUBMITTED', submittedAt: daysAgo(3) });

    const theirs = await member({}, OTHER);
    await assessment(theirs._id, { status: 'SUBMITTED', submittedAt: daysAgo(3) }, OTHER);
    await member({}, OTHER);

    const a = await buildLearningFunnel(TENANT, RANGE);
    const b = await buildLearningFunnel(OTHER, RANGE);

    expect(a.cohorts.members).toBe(1);
    expect(b.cohorts.members).toBe(2);
    expect(stage(a, 'assessment_completed').count).toBe(1);
    expect(stage(b, 'assessment_completed').count).toBe(1);
  });

  it('ignores a record that names my member but belongs to another tenant', async () => {
    const mine = await member();
    await assessment(mine._id, { status: 'SUBMITTED', submittedAt: daysAgo(3) }, OTHER);

    const r = await buildLearningFunnel(TENANT, RANGE);
    expect(stage(r, 'assessment_completed').count).toBe(0);
  });

  it('returns an empty result for a tenant id that cannot exist', async () => {
    const r = await buildLearningFunnel('not-an-object-id', RANGE);
    expect(r.cohorts.members).toBe(0);
    expect(r.stages).toEqual([]);
  });
});

// ── every stage documents itself ────────────────────────────────────────────

describe('the funnel explains itself', () => {
  it('names a meaning and an authoritative source for every stage', async () => {
    await member();
    const r = await buildLearningFunnel(TENANT, RANGE);

    for (const s of r.stages) {
      expect(s.meaning.length).toBeGreaterThan(20);
      expect(s.source.length).toBeGreaterThan(3);
    }
  });

  it('carries the numerator, denominator and cohort behind every rate', async () => {
    await member();
    const r = await buildLearningFunnel(TENANT, RANGE);

    for (const m of r.metrics.filter((x: any) => x.numerator !== undefined)) {
      expect(m.denominator).toBeDefined();
      expect(m.cohort).toBeTruthy();
      // A number without its denominator is a rumour.
      expect(m.value).toBe(rate(m.numerator!, m.denominator!));
    }
  });

  it('carries no member identity of any kind', async () => {
    await member({ contextCompletedAt: daysAgo(2) });
    const r = await buildLearningFunnel(TENANT, RANGE);

    const flat = JSON.stringify(r);
    expect(flat).not.toMatch(/@example\.com/);
    expect(flat).not.toMatch(/9211\d{6}/);
  });
});

// ── range policy ────────────────────────────────────────────────────────────

describe('the date range', () => {
  it('defaults to the last 30 days', () => {
    const r: any = resolveRange({});
    expect(r.ok).toBe(true);
    expect(r.days).toBe(30);
  });

  it('rejects an unparseable date', () => {
    expect(resolveRange({ from: 'yesterday-ish' })).toMatchObject({ ok: false });
    expect(resolveRange({ to: '2026-13-45' })).toMatchObject({ ok: false });
  });

  it('rejects a reversed range', () => {
    const r: any = resolveRange({ from: '2026-06-01', to: '2026-05-01' });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/after/);
  });

  it('rejects a range nobody could want, rather than scanning for it', () => {
    const r: any = resolveRange({ from: '2000-01-01', to: '2026-01-01' });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(new RegExp(String(MAX_RANGE_DAYS)));
  });

  it('accepts a valid custom range', () => {
    const r: any = resolveRange({ from: '2026-05-01', to: '2026-05-31' });
    expect(r.ok).toBe(true);
    expect(r.days).toBe(30);
  });
});
