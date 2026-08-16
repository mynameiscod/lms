/**
 * The domain analytics, against a real MongoDB.
 *
 * Two rules carry most of the weight and neither can be checked against a mock: an
 * unmeasured skill must never be averaged as zero, and a historical delta must come from
 * Module 13's frozen snapshots rather than from today's Skill DNA. Both are aggregation
 * semantics, so both are tested here.
 */

import mongoose from 'mongoose';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';

jest.setTimeout(180_000);

import User from '../../models/User';
import CareerRole from '../../models/CareerRole';
import CareerSkill from '../../models/CareerSkill';
import RoleSkillBlueprint from '../../models/RoleSkillBlueprint';
import StudentSkillProfile from '../../models/StudentSkillProfile';
import PersonalizedAssessment from '../../models/PersonalizedAssessment';
import CareerRoadmap from '../../models/CareerRoadmap';
import PassportInterview from '../../models/PassportInterview';
import PassportResume from '../../models/PassportResume';
import { XpLedger } from '../../models/GamificationModels';
import { CoinLedger } from '../../models/CoinModels';
import { listCareerRoles } from '../../services/careerRoleService';
import { CAREERPILOT_PRODUCT } from '../../services/careerPilotPopulation';
import {
  skillAnalytics, improvementAnalytics, roadmapAnalytics, engagementAnalytics,
  rewardAnalytics, interviewAnalytics, resumeAnalytics, companyAnalytics,
} from '../../services/careerPilotAnalyticsService';

const TENANT = '507f1f77bcf86cd7994333e1';
const OTHER = '507f1f77bcf86cd7994333f2';
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
const daysAhead = (n: number) => new Date(Date.now() + n * 86_400_000);
const range = () => ({ from: daysAgo(30), to: daysAhead(1), days: 31 });

let seq = 0;

const member = (passport: any = {}, tenantId = TENANT) => {
  seq += 1;
  return User.create({
    tenantId, firstName: `A${seq}`, lastName: 'X',
    email: `da${seq}@example.com`, phone: `9411${String(seq).padStart(6, '0')}`,
    password: 'x', role: 'STUDENT',
    passport: { active: false, product: CAREERPILOT_PRODUCT, ...passport },
  });
};

const plainStudent = () => {
  seq += 1;
  return User.create({
    tenantId: TENANT, firstName: `P${seq}`, lastName: 'X',
    email: `dp${seq}@example.com`, phone: `9511${String(seq).padStart(6, '0')}`,
    password: 'x', role: 'STUDENT',
  });
};

const skillProfile = (studentId: any, skillKey: string, score: number, confidence = 'HIGH', tenantId = TENANT) =>
  StudentSkillProfile.create({ tenantId, studentId, skillKey, score, confidence, evidenceCount: 5 } as any);

/** A tenant offering one role, with a published blueprint requiring Java and SQL. */
async function configured(tenantId = TENANT) {
  await CareerSkill.create([
    { domainKey: 'SOFTWARE_ENGINEERING', key: 'JAVA_OOP', name: 'Java OOP', active: true, assessable: true },
    { domainKey: 'SOFTWARE_ENGINEERING', key: 'SQL_JOINS', name: 'SQL Joins', active: true, assessable: true },
  ] as any);
  await CareerRole.create({
    tenantId, key: 'BACKEND_ENGINEER', name: 'Backend Engineer',
    domainKey: 'SOFTWARE_ENGINEERING', active: true, studentSelectable: true,
  } as any);
  await RoleSkillBlueprint.create({
    tenantId, roleKey: 'BACKEND_ENGINEER', roleName: 'Backend Engineer',
    domainKey: 'SOFTWARE_ENGINEERING', published: true, version: 1,
    requirements: [
      { skillKey: 'JAVA_OOP', importance: 'ESSENTIAL', weight: 10, targetLevel: 'WORKING', active: true },
      { skillKey: 'SQL_JOINS', importance: 'IMPORTANT', weight: 7, targetLevel: 'WORKING', active: true },
    ],
  } as any);
  await listCareerRoles(tenantId);
  await CareerRole.updateMany(
    { tenantId, key: { $ne: 'BACKEND_ENGINEER' } },
    { $set: { studentSelectable: false } },
  );
}

const reassessment = (studentId: any, before: number | null, after: number | null, over: any = {}) =>
  PersonalizedAssessment.create({
    tenantId: TENANT, studentId, attemptNumber: 2, status: 'SUBMITTED', purpose: 'REASSESSMENT',
    policyKey: 'FOUNDATION_V1', policyVersion: 1, stage: 'placement', roleKey: 'BACKEND_ENGINEER',
    blueprintVersion: 1, generationSeed: `s${Math.random()}`, submittedAt: daysAgo(3),
    beforeSnapshot: { roleKey: 'BACKEND_ENGINEER', readiness: before, coverage: 80, skills: [], blueprintVersion: 1, capturedAt: daysAgo(60) },
    afterSnapshot: { roleKey: 'BACKEND_ENGINEER', readiness: after, coverage: 85, skills: [], blueprintVersion: 1, capturedAt: daysAgo(3) },
    ...over,
  } as any);

beforeAll(startMongo);
afterAll(stopMongo);
beforeEach(async () => { await clearCollections(); seq = 0; });

// ── skills: unknown is never zero ───────────────────────────────────────────

describe('skill analytics', () => {
  it('never averages an unmeasured skill as zero', async () => {
    await configured();
    const a = await member();
    await skillProfile(a._id, 'JAVA_OOP', 70);
    // SQL is required by the blueprint and has never been measured for anybody.

    const r = await skillAnalytics(TENANT);
    const java = r.skills.find(s => s.skillKey === 'JAVA_OOP')!;
    const sql = r.skills.find(s => s.skillKey === 'SQL_JOINS')!;

    expect(java.averageScore).toBe(70);
    // NOT (70 + 0) / 2, and not 0 — nobody has been asked.
    expect(sql.averageScore).toBeNull();
    expect(sql.notAssessed).toBe(1);
  });

  it('excludes limited evidence from the average rather than counting it as weakness', async () => {
    await configured();
    const a = await member(); const b = await member();
    await skillProfile(a._id, 'JAVA_OOP', 80, 'HIGH');
    await skillProfile(b._id, 'JAVA_OOP', 20, 'LOW');    // one lucky-or-unlucky answer

    const r = await skillAnalytics(TENANT);
    const java = r.skills.find(s => s.skillKey === 'JAVA_OOP')!;

    expect(java.assessed).toBe(1);
    expect(java.limitedEvidence).toBe(1);
    // The 20 is real and reported, but it is not a conclusion, so it stays out of the mean.
    expect(java.averageScore).toBe(80);
    expect(r.unknownEvidence.limitedEvidence).toBe(1);
  });

  it('classifies gaps with Module 8’s own rule', async () => {
    await configured();
    const a = await member(); const b = await member();
    await skillProfile(a._id, 'JAVA_OOP', 30);   // WORKING target is 60 → priority gap
    await skillProfile(b._id, 'JAVA_OOP', 85);   // well above → strong

    const r = await skillAnalytics(TENANT);
    const java = r.skills.find(s => s.skillKey === 'JAVA_OOP')!;

    expect(java.targetScore).toBe(60);
    expect(java.gapCount).toBe(1);
    expect(java.strongCount).toBe(1);
    expect(r.topGaps[0].skillKey).toBe('JAVA_OOP');
  });

  it('separates an effective blueprint from one this tenant authored', async () => {
    await configured();

    const r = await skillAnalytics(TENANT);

    // Module 4 falls back to a seeded blueprint, so "it resolves" is not "they wrote it".
    expect(r.blueprints.selectableRoles).toBe(1);
    expect(r.blueprints.effectiveBlueprintAvailable).toBe(1);
    expect(r.blueprints.tenantAuthoredBlueprint).toBe(1);

    await RoleSkillBlueprint.deleteMany({ tenantId: TENANT });
    const after = await skillAnalytics(TENANT);
    expect(after.blueprints.tenantAuthoredBlueprint).toBe(0);
    // The fallback may still make readiness work — that is Module 4's business, unchanged.
    expect(after.blueprints.effectiveBlueprintAvailable).toBeGreaterThanOrEqual(0);
  });

  it('excludes ordinary LMS students and other tenants', async () => {
    await configured();
    const a = await member();
    await skillProfile(a._id, 'JAVA_OOP', 70);
    const p = await plainStudent();
    await skillProfile(p._id, 'JAVA_OOP', 10);
    const o = await member({}, OTHER);
    await skillProfile(o._id, 'JAVA_OOP', 5, 'HIGH', OTHER);

    const r = await skillAnalytics(TENANT);
    expect(r.skills.find(s => s.skillKey === 'JAVA_OOP')!.averageScore).toBe(70);
  });
});

// ── improvement: frozen history ─────────────────────────────────────────────

describe('improvement analytics', () => {
  it('uses the frozen before/after, not today’s Skill DNA', async () => {
    await configured();
    const a = await member();
    await reassessment(a._id, 54, 68);
    // The student has since improved further. History must not move.
    await skillProfile(a._id, 'JAVA_OOP', 95);

    const r = await improvementAnalytics(TENANT, range());

    expect(r.comparable).toBe(1);
    expect(r.improved).toBe(1);
    expect(r.averageReadinessDelta).toBe(14);     // 68 − 54, never 95 − 54
  });

  it('counts improved, regressed and unchanged apart', async () => {
    await configured();
    const a = await member(); const b = await member(); const c = await member();
    await reassessment(a._id, 50, 70);
    await reassessment(b._id, 70, 55);
    await reassessment(c._id, 60, 60);

    const r = await improvementAnalytics(TENANT, range());

    expect(r).toMatchObject({ comparable: 3, improved: 1, regressed: 1, unchanged: 1 });
    expect(r.averageReadinessDelta).toBe(2);      // (20 − 15 + 0) / 3
  });

  it('refuses to compare across a role change or a republished blueprint', async () => {
    await configured();
    const a = await member(); const b = await member();
    await reassessment(a._id, 50, 70, {
      afterSnapshot: { roleKey: 'FRONTEND_ENGINEER', readiness: 70, coverage: 80, skills: [], blueprintVersion: 1, capturedAt: daysAgo(3) },
    });
    await reassessment(b._id, 50, 70, {
      afterSnapshot: { roleKey: 'BACKEND_ENGINEER', readiness: 70, coverage: 80, skills: [], blueprintVersion: 2, capturedAt: daysAgo(3) },
    });

    const r = await improvementAnalytics(TENANT, range());

    // Both would look like +20, but each measures the standard moving rather than the student.
    expect(r.comparable).toBe(0);
    expect(r.incomparable).toBe(2);
    expect(r.averageReadinessDelta).toBeNull();
  });

  it('reports null rather than zero when nothing is comparable', async () => {
    await configured();
    const r = await improvementAnalytics(TENANT, range());

    expect(r.reassessed).toBe(0);
    // No reassessment is not "no change".
    expect(r.averageReadinessDelta).toBeNull();
  });

  it('honours the date range', async () => {
    await configured();
    const a = await member();
    await reassessment(a._id, 50, 70, { submittedAt: daysAgo(200) });

    const r = await improvementAnalytics(TENANT, range());
    expect(r.reassessed).toBe(0);
  });
});

// ── roadmap, engagement, economy ────────────────────────────────────────────

describe('roadmap analytics', () => {
  it('counts active and superseded from Module 9 state', async () => {
    const a = await member();
    const mk = (status: string, readiness: number | null) => CareerRoadmap.create({
      tenantId: TENANT, studentId: a._id, roleKey: 'BACKEND_ENGINEER', roleName: 'Backend Engineer',
      status, version: 1, blueprintVersion: 1, policyVersion: 'ROADMAP_V1',
      startDate: daysAgo(30), endDate: daysAhead(60), roadmapDays: 90, weekCount: 13,
      input: { minutesPerDay: 60, daysPerWeek: 5, readiness },
    } as any);
    await mk('ACTIVE', 62);
    await mk('SUPERSEDED', 40);

    const r = await roadmapAnalytics(TENANT);

    expect(r.active).toBe(1);
    expect(r.superseded).toBe(1);
    expect(r.generated).toBe(1);                       // one member, two plans
    // Named for what it is: the readiness recorded AT GENERATION, not current readiness.
    expect(r.roadmapReadinessSnapshot!.averageReadinessAtGeneration).toBe(51);
  });
});

describe('engagement analytics', () => {
  it('counts activity from the XP ledger and respects the windows', async () => {
    const a = await member(); const b = await member();
    const xp = (studentId: any, eventKey: string, amount: number, at: Date, key: string) =>
      XpLedger.create({ tenantId: TENANT, studentId, eventKey, amount, at, idempotencyKey: key } as any);

    await xp(a._id, 'CAREER_MISSION_COMPLETED', 10, daysAgo(0), 'k1');
    await xp(a._id, 'CAREER_MISSION_COMPLETED', 10, daysAgo(5), 'k2');
    await xp(b._id, 'MOCK_INTERVIEW_COMPLETED', 60, daysAgo(20), 'k3');

    const r = await engagementAnalytics(TENANT, range());

    expect(r.activeToday).toBe(1);
    expect(r.active7d).toBe(1);
    expect(r.active30d).toBe(2);
    expect(r.missionsCompleted).toBe(2);
    expect(r.membersCompletingMissions).toBe(1);
    expect(r.xpIssued).toBe(80);
    expect(r.xpByEvent.find((e: any) => e.eventKey === 'MOCK_INTERVIEW_COMPLETED').amount).toBe(60);
  });
});

describe('reward analytics', () => {
  it('reads issued and spent from the ledger without double counting', async () => {
    const a = await member();
    const entry = (coins: number, key: string) => CoinLedger.create({
      tenantId: TENANT, studentId: a._id, eventKey: 'mission', coins,
      balanceAfter: 0, idempotencyKey: key,
    } as any);
    await entry(500, 'c1');
    await entry(300, 'c2');
    await entry(-200, 'c3');

    const r = await rewardAnalytics(TENANT);

    expect(r.coinsIssued).toBe(800);
    expect(r.coinsSpent).toBe(200);
    // Outstanding is the difference, not a third stored number that could disagree.
    expect(r.coinsOutstanding).toBe(600);
  });

  it('never counts another tenant’s coins', async () => {
    const mine = await member();
    const theirs = await member({}, OTHER);
    await CoinLedger.create({ tenantId: TENANT, studentId: mine._id, eventKey: 'm', coins: 100, balanceAfter: 100, idempotencyKey: 'x1' } as any);
    await CoinLedger.create({ tenantId: OTHER, studentId: theirs._id, eventKey: 'm', coins: 900, balanceAfter: 900, idempotencyKey: 'x2' } as any);

    expect((await rewardAnalytics(TENANT)).coinsIssued).toBe(100);
  });
});

// ── persisted Module 14 figures, named accurately ───────────────────────────

describe('interview analytics', () => {
  it('reports the persisted evaluation score, and NOT as interview readiness', async () => {
    const a = await member();
    const mk = (status: string, score: number | null) => PassportInterview.create({
      tenantId: TENANT, studentId: a._id, status, live: false,
      role: 'Backend', areas: ['Java'], transcript: [],
      completedAt: status === 'completed' ? daysAgo(2) : undefined,
      evaluation: score === null ? null : { overallScore: score, readinessLevel: 'almost_ready', summary: '', strengths: [], improvements: [], recommendedPracticeAreas: [], areaScores: [] },
    } as any);
    await mk('completed', 72);
    await mk('completed', 84);
    await mk('abandoned', null);

    const r = await interviewAnalytics(TENANT, range());

    expect(r.completed).toBe(2);
    expect(r.abandoned).toBe(1);
    expect(r.completionRate).toBe(67);
    expect(r.interviewEvaluationScoreDistribution.average).toBe(78);
    expect(r.interviewEvaluationScoreDistribution.buckets['60-79']).toBe(1);
    expect(r.interviewEvaluationScoreDistribution.buckets['80-100']).toBe(1);
    // The metric that is NOT available says so, with a reason.
    expect(r.currentInterviewReadinessDistribution.coverage).toBe('unavailable');
    expect(r.currentInterviewReadinessDistribution.reason).toMatch(/per request/i);
  });
});

describe('resume analytics', () => {
  it('reports the legacy stored score under its own name', async () => {
    const a = await member();
    await PassportResume.create({
      tenantId: TENANT, studentId: a._id, version: 1,
      score: { total: 64, breakdown: {}, suggestions: [], atsWarnings: [], keywordsFound: [], keywordsMissing: [] },
      scoredAt: daysAgo(4),
    } as any);

    const r = await resumeAnalytics(TENANT);

    expect(r.membersWithResume).toBe(1);
    expect(r.legacyResumeScoreDistribution.average).toBe(64);
    expect(r.currentResumeReadinessDistribution.coverage).toBe('unavailable');
    // The two must never be conflated.
    expect(JSON.stringify(r)).not.toMatch(/"resumeReadiness"/);
  });
});

describe('company analytics', () => {
  it('counts targets and primary targets, and declines to guess company readiness', async () => {
    await member({ targetCompanies: [
      { slug: 'acme', primary: true, addedAt: daysAgo(10) },
      { slug: 'beta', primary: false, addedAt: daysAgo(9) },
    ] });
    await member({ targetCompanies: [{ slug: 'acme', primary: true, addedAt: daysAgo(3) }] });
    await member();
    await plainStudent();

    const r = await companyAnalytics(TENANT, range());

    expect(r.membersWithTarget).toBe(2);
    const acme = r.topTargets.find((t: any) => t.companySlug === 'acme')!;
    expect(acme.members).toBe(2);
    expect(acme.primaryFor).toBe(2);
    expect(r.currentCompanyReadinessDistribution.coverage).toBe('unavailable');
  });

  it('never counts another tenant’s targets', async () => {
    await member({ targetCompanies: [{ slug: 'acme', primary: true, addedAt: daysAgo(2) }] });
    await member({ targetCompanies: [{ slug: 'acme', primary: true, addedAt: daysAgo(2) }] }, OTHER);

    expect((await companyAnalytics(TENANT, range())).membersWithTarget).toBe(1);
  });
});

// ── empty tenant ────────────────────────────────────────────────────────────

describe('an empty tenant', () => {
  it('reports no data rather than misleading zeroes', async () => {
    const [skills, improvement, engagement, interview] = await Promise.all([
      skillAnalytics(TENANT),
      improvementAnalytics(TENANT, range()),
      engagementAnalytics(TENANT, range()),
      interviewAnalytics(TENANT, range()),
    ]);

    expect(improvement.averageReadinessDelta).toBeNull();
    expect(interview.completionRate).toBeNull();
    expect(interview.interviewEvaluationScoreDistribution.average).toBeNull();
    expect(engagement.members).toBe(0);
    expect(skills.topGaps).toEqual([]);
  });
});
