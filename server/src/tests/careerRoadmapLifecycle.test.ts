/**
 * Module 9 — the life of a stored plan.
 *
 * A roadmap is the one thing in CareerPilot that is a COMMITMENT rather than a reading.
 * Everything here defends that: it is not created by looking at it, not replaced because an
 * input moved, not duplicated by an impatient click, and never deleted when it is replaced.
 *
 * The planner itself is covered in roadmapPlanner.test.ts. These are about what happens
 * around it — generation, idempotency, staleness and history.
 */

const roadmapStore: any[] = [];
let userDoc: any = null;
let configDoc: any = null;
/** The content row now carries the programme length; null means the tenant has none set. */
let contentDoc: any = null;

const matches = (doc: any, q: any) =>
  Object.entries(q).every(([k, v]) => String(doc[k]) === String(v));

jest.mock('../models/CareerRoadmap', () => ({
  __esModule: true,
  default: {
    findOne: (q: any) => Promise.resolve(roadmapStore.find(d => matches(d, q)) || null),
    find: (q: any) => ({
      select: () => ({ sort: () => ({ limit: () => ({ lean: async () => roadmapStore.filter(d => matches(d, q)) }) }) }),
    }),
    create: async (o: any) => {
      // The real guarantee is a partial unique index on (tenantId, studentId) where status
      // is ACTIVE. Reproduced here so a test cannot pass against a rule the database keeps.
      if (o.status === 'ACTIVE'
        && roadmapStore.some(d => d.status === 'ACTIVE' && d.tenantId === o.tenantId && String(d.studentId) === String(o.studentId))) {
        const err: any = new Error('E11000 duplicate key');
        err.code = 11000;
        throw err;
      }
      const doc: any = { ...o, _id: `rm${roadmapStore.length + 1}`, save: async () => doc };
      roadmapStore.push(doc);
      return doc;
    },
  },
}));

jest.mock('../models/CareerSkill', () => ({
  __esModule: true,
  default: { find: () => ({ select: () => ({ lean: async () => SKILL_DOCS }) }) },
}));

jest.mock('../models/StudentSkillProfile', () => ({
  __esModule: true,
  default: { find: () => ({ select: () => ({ lean: async () => PROFILE_ROWS }) }) },
}));

jest.mock('../models/User', () => ({
  __esModule: true,
  default: { findOne: () => ({ select: () => ({ lean: async () => userDoc }) }) },
}));

// Entitlement tiers are admin configuration. Null means "nothing configured", under which
// isEntitled fails closed to paid — the same behaviour every other CareerPilot feature sees.
jest.mock('../models/PassportConfig', () => ({
  __esModule: true,
  default: { findOne: () => ({ lean: async () => configDoc }) },
}));

// The programme length is read from here in preference to PassportConfig, so that the skill
// plan and the mission journey cannot be configured to two different lengths.
jest.mock('../models/PassportContent', () => ({
  __esModule: true,
  default: { findOne: () => ({ select: () => ({ lean: async () => contentDoc }) }) },
}));

const getCareerContextMock = jest.fn();
const readinessMock = jest.fn();

jest.mock('../services/careerContextService', () => ({
  __esModule: true,
  getCareerContext: (...a: any[]) => getCareerContextMock(...a),
}));

jest.mock('../services/roleReadinessService', () => ({
  __esModule: true,
  calculateStudentRoleReadiness: (...a: any[]) => readinessMock(...a),
}));

import { generateRoadmap, getActiveRoadmap, stalenessOf } from '../services/careerRoadmapService';
import { classifyGap, priorityScore, targetScoreFor } from '../data/roleReadinessPolicy';
import { MAX_ROADMAP_DAYS } from '../data/roadmapPolicy';

let SKILL_DOCS: any[] = [];
let PROFILE_ROWS: any[] = [];

const NOW = new Date('2026-08-15T00:00:00Z');
const TENANT = 't1';
const STUDENT = 's1';

function skill(key: string, score: number | null, weight = 8) {
  const targetScore = targetScoreFor('PROFICIENT');
  const confidence = score === null ? null : 'HIGH';
  return {
    skillKey: key, skillName: key, importance: 'ESSENTIAL', weight,
    targetLevel: 'PROFICIENT', targetScore,
    studentScore: score, skillConfidence: confidence,
    gapPoints: score === null ? null : Math.max(0, targetScore - score),
    status: classifyGap({ studentScore: score, targetScore, confidence }),
    priorityScore: score === null ? 0 : priorityScore({ studentScore: score, targetScore, weight, importance: 'ESSENTIAL' }),
    skillInactive: false, countedInReadiness: score !== null, evidenceCount: score === null ? 0 : 4,
  };
}

function readinessResult(over: any = {}) {
  const skills = over.skills || [skill('REST_API', 40), skill('SQL', 85), skill('DOCKER', null)];
  return {
    available: true,
    policyVersion: 'ROLE_READINESS_V1',
    role: { key: 'BACKEND_ENGINEER', name: 'Backend Engineer' },
    blueprintVersion: 3,
    blueprintUpdatedAt: new Date('2026-07-01T00:00:00Z'),
    readiness: 58, coverage: 80, confidence: 'HIGH',
    summary: { requiredSkills: skills.length, assessedSkills: 2, priorityGaps: 1, needsWork: 0, onTrack: 1, strong: 0, limitedEvidence: 0, notAssessed: 1, essentialTotal: 3, essentialAssessed: 2 },
    skills, topGaps: [], strengths: [], assessmentNeeded: [],
    ...over,
  };
}

function context(over: any = {}) {
  return {
    tenantId: TENANT, studentId: STUDENT,
    education: {}, location: {},
    career: { domain: 'SOFTWARE_ENGINEERING', primaryRole: 'BACKEND_ENGINEER', secondaryRole: null },
    availability: { minutesPerDay: 60, daysPerWeek: 6 },
    derived: { stage: 'foundation', background: 'cs', monthsToGraduation: 30, computedAt: NOW },
    status: { onboardingCompleted: true, contextVersion: 1, missing: [], completedAt: NOW },
    ...over,
  };
}

beforeEach(() => {
  roadmapStore.length = 0;
  userDoc = { passport: { active: true } };
  configDoc = null;
  contentDoc = null;
  SKILL_DOCS = ['REST_API', 'SQL', 'DOCKER'].map(k => ({
    key: k, name: k, nodeType: 'SKILL', prerequisiteKeys: [], active: true,
  }));
  PROFILE_ROWS = [
    { skillKey: 'REST_API', score: 40, confidence: 'HIGH' },
    { skillKey: 'SQL', score: 85, confidence: 'HIGH' },
  ];
  getCareerContextMock.mockReset().mockResolvedValue(context());
  readinessMock.mockReset().mockResolvedValue(readinessResult());
});

// ─────────────────────────────────────────────────────────────────────────────
// §56, §57, §65, §66, §132 — one plan, stored, not duplicated
// ─────────────────────────────────────────────────────────────────────────────

describe('generating the first plan', () => {
  it('stores it, rather than deriving it on every read', async () => {
    const r = await generateRoadmap(TENANT, STUDENT, { now: NOW });
    expect(r.created).toBe(true);
    expect(roadmapStore).toHaveLength(1);
    expect(roadmapStore[0].status).toBe('ACTIVE');
    expect(roadmapStore[0].roadmapVersion).toBe(1);
    expect(roadmapStore[0].generationReason).toBe('FIRST_PLAN');
  });

  it('records the provenance needed to explain it later', async () => {
    await generateRoadmap(TENANT, STUDENT, { now: NOW });
    const rm = roadmapStore[0];
    expect(rm.policyVersion).toBe('ROADMAP_V1');
    expect(rm.input.minutesPerDay).toBe(60);
    expect(rm.input.daysPerWeek).toBe(6);
    expect(rm.input.coverage).toBe(80);
    expect(rm.input.blueprintVersion).toBe(3);
    expect(rm.input.careerStage).toBe('foundation');
    expect(rm.generatedAt).toEqual(NOW);
  });

  it('runs for 90 days from today', async () => {
    await generateRoadmap(TENANT, STUDENT, { now: NOW });
    const rm = roadmapStore[0];
    expect(rm.roadmapDays).toBe(MAX_ROADMAP_DAYS);
    expect(Math.round((rm.endDate - rm.startDate) / 86400000)).toBe(MAX_ROADMAP_DAYS - 1);
  });

  it('is not created by merely reading', async () => {
    // §139/§93: a plan's start date must be when somebody chose to start, not when a page
    // happened to load.
    const out = await getActiveRoadmap(TENANT, STUDENT, NOW);
    expect(out.available).toBe(false);
    expect(roadmapStore).toHaveLength(0);
  });

  it('returns the existing plan instead of a second one when asked twice', async () => {
    const first = await generateRoadmap(TENANT, STUDENT, { now: NOW });
    const second = await generateRoadmap(TENANT, STUDENT, { now: NOW });

    expect(second.created).toBe(false);
    expect(roadmapStore).toHaveLength(1);
    expect((second.outcome as any).roadmap._id).toBe((first.outcome as any).roadmap._id);
  });

  it('never leaves two active plans, even if two requests race', async () => {
    const [a, b] = await Promise.all([
      generateRoadmap(TENANT, STUDENT, { now: NOW }),
      generateRoadmap(TENANT, STUDENT, { now: NOW }),
    ]);
    expect(roadmapStore.filter(d => d.status === 'ACTIVE')).toHaveLength(1);
    // Whoever lost the race still gets a roadmap back — they asked for one and there is one.
    expect(a.outcome.available).toBe(true);
    expect(b.outcome.available).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §59, §61, §62, §63, §113 — staleness is reported, never acted on
// ─────────────────────────────────────────────────────────────────────────────

describe('when the student’s situation changes', () => {
  it('does not rewrite the plan just because the role changed', async () => {
    await generateRoadmap(TENANT, STUDENT, { now: NOW });
    const before = JSON.stringify(roadmapStore[0].objectives);

    getCareerContextMock.mockResolvedValue(context({
      career: { domain: 'SOFTWARE_ENGINEERING', primaryRole: 'DATA_ENGINEER', secondaryRole: null },
    }));

    const out = await getActiveRoadmap(TENANT, STUDENT, NOW) as any;
    expect(out.outdated).toBe(true);
    expect(out.outdatedReasons).toContain('ROLE_CHANGED');
    // The plan itself is untouched: what they were asked to do last week still stands.
    expect(JSON.stringify(roadmapStore[0].objectives)).toBe(before);
    expect(roadmapStore).toHaveLength(1);
  });

  it('flags a changed commitment without silently replanning', async () => {
    await generateRoadmap(TENANT, STUDENT, { now: NOW });
    getCareerContextMock.mockResolvedValue(context({
      availability: { minutesPerDay: 120, daysPerWeek: 6 },
    }));

    const out = await getActiveRoadmap(TENANT, STUDENT, NOW) as any;
    expect(out.outdatedReasons).toContain('COMMITMENT_CHANGED');
    expect(roadmapStore).toHaveLength(1);
  });

  it('flags a republished blueprint', async () => {
    await generateRoadmap(TENANT, STUDENT, { now: NOW });
    readinessMock.mockResolvedValue(readinessResult({ blueprintVersion: 4 }));

    const out = await getActiveRoadmap(TENANT, STUDENT, NOW) as any;
    expect(out.outdatedReasons).toContain('BLUEPRINT_CHANGED');
  });

  it('does NOT treat improved Skill DNA as staleness', async () => {
    // §63: the student getting better at what the plan asked them to work on is the plan
    // working. Telling them to rebuild it every time they finish an assessment would make
    // the roadmap feel like it never settles.
    await generateRoadmap(TENANT, STUDENT, { now: NOW });
    readinessMock.mockResolvedValue(readinessResult({
      readiness: 82, coverage: 95,
      skills: [skill('REST_API', 78), skill('SQL', 90), skill('DOCKER', 70)],
    }));

    const out = await getActiveRoadmap(TENANT, STUDENT, NOW) as any;
    expect(out.outdated).toBe(false);
  });

  it('reports every reason that applies at once', () => {
    const rm: any = {
      roleKey: 'BACKEND_ENGINEER',
      input: { minutesPerDay: 60, daysPerWeek: 6, blueprintVersion: 3 },
    };
    const reasons = stalenessOf(rm, context({
      career: { primaryRole: 'DATA_ENGINEER' },
      availability: { minutesPerDay: 30, daysPerWeek: 4 },
    }) as any, 9);
    expect(reasons).toEqual(expect.arrayContaining(['ROLE_CHANGED', 'COMMITMENT_CHANGED', 'BLUEPRINT_CHANGED']));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §61, §62, §67, §112 — replanning keeps history
// ─────────────────────────────────────────────────────────────────────────────

describe('replanning', () => {
  it('supersedes the old plan rather than deleting it', async () => {
    await generateRoadmap(TENANT, STUDENT, { now: NOW });
    const result = await generateRoadmap(TENANT, STUDENT, { now: NOW, replan: true });

    expect(result.created).toBe(true);
    expect(roadmapStore).toHaveLength(2);

    const [old, fresh] = roadmapStore;
    expect(old.status).toBe('SUPERSEDED');
    expect(old.supersededAt).toEqual(NOW);
    expect(old.supersededBy).toBe(fresh._id);
    expect(fresh.status).toBe('ACTIVE');
    expect(fresh.roadmapVersion).toBe(2);
  });

  it('targets the new role after a role change, leaving the old plan pointing at the old one', async () => {
    await generateRoadmap(TENANT, STUDENT, { now: NOW });

    getCareerContextMock.mockResolvedValue(context({
      career: { primaryRole: 'DATA_ENGINEER' },
    }));
    readinessMock.mockResolvedValue(readinessResult({
      role: { key: 'DATA_ENGINEER', name: 'Data Engineer' },
    }));

    await generateRoadmap(TENANT, STUDENT, { now: NOW, replan: true, reason: 'REPLAN_ROLE_CHANGED' });

    expect(roadmapStore[0].roleKey).toBe('BACKEND_ENGINEER');
    expect(roadmapStore[0].status).toBe('SUPERSEDED');
    expect(roadmapStore[1].roleKey).toBe('DATA_ENGINEER');
    expect(roadmapStore[1].generationReason).toBe('REPLAN_ROLE_CHANGED');
  });

  it('uses the new commitment without inventing work to fill it', async () => {
    await generateRoadmap(TENANT, STUDENT, { now: NOW });
    const before = roadmapStore[0].capacity.plannedMinutes;

    getCareerContextMock.mockResolvedValue(context({
      availability: { minutesPerDay: 120, daysPerWeek: 6 },
    }));
    await generateRoadmap(TENANT, STUDENT, { now: NOW, replan: true });

    expect(roadmapStore[1].input.minutesPerDay).toBe(120);
    expect(roadmapStore[1].capacity.plannableMinutes)
      .toBeGreaterThan(roadmapStore[0].capacity.plannableMinutes);

    // Doubling the student's time does not double what this role requires of them. Capacity
    // decides how much of the needed work fits; it never manufactures more, or a student
    // with spare evenings would be handed study nobody thought they needed.
    expect(roadmapStore[1].capacity.plannedMinutes).toBeGreaterThanOrEqual(before);
    expect(roadmapStore[1].capacity.plannedMinutes)
      .toBeLessThan(roadmapStore[1].capacity.plannableMinutes);
  });

  it('gives the same plan again when nothing has changed', async () => {
    // §110: same snapshot, same policy, structurally equivalent result.
    await generateRoadmap(TENANT, STUDENT, { now: NOW });
    const first = roadmapStore[0].objectives;
    await generateRoadmap(TENANT, STUDENT, { now: NOW, replan: true });
    expect(roadmapStore[1].objectives).toEqual(first);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §96, §97 — a finished programme stays finished
// ─────────────────────────────────────────────────────────────────────────────

describe('at the end of the 90 days', () => {
  const LATER = new Date('2026-12-01T00:00:00Z');

  it('reports the plan as completed', async () => {
    await generateRoadmap(TENANT, STUDENT, { now: NOW });
    const out = await getActiveRoadmap(TENANT, STUDENT, LATER) as any;
    expect(out.completed).toBe(true);
    expect(out.currentDay).toBe(MAX_ROADMAP_DAYS);
  });

  it('does not roll straight into another 90 days', async () => {
    // Renewal is a commercial decision. Handing out a second programme because the first
    // one ended would be making it here, quietly.
    await generateRoadmap(TENANT, STUDENT, { now: NOW });
    const again = await generateRoadmap(TENANT, STUDENT, { now: LATER, replan: true });

    expect(again.refused).toBe('PROGRAM_WINDOW_COMPLETED');
    expect(again.created).toBe(false);
    expect(roadmapStore).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §7 — never plan past what the student has paid for
// ─────────────────────────────────────────────────────────────────────────────

describe('entitlement', () => {
  /**
   * Regression cover for a real defect.
   *
   * windowFor() used to open with `if (!membershipActive(passport) || !passport.expiresAt)`
   * and return the full ninety days. That one condition conflated the two states that must
   * never be confused — "no expiry has ever been set", which is perpetual under this
   * product's existing semantics, and "the membership ran out in March" — so an EXPIRED
   * member was handed a brand-new 90-day roadmap, and an inactive one got the same. The
   * lapsed member was the only one who could not have it, and they were the ones getting it.
   *
   * The fix separates the question about the DATE (windowFor) from the question about
   * ACCESS (isEntitled on `roadmap_full`, the key this product already uses for the full
   * 90-day roadmap).
   */

  // ── still eligible ──────────────────────────────────────────────────────────

  it('gives the full window to an active member with no expiry set', async () => {
    // Perpetual under existing semantics — membershipActive() treats a missing expiry as
    // active, and §7 says only an authoritative end date may shorten a plan.
    userDoc = { passport: { active: true } };
    await generateRoadmap(TENANT, STUDENT, { now: NOW });

    expect(roadmapStore).toHaveLength(1);
    expect(roadmapStore[0].roadmapDays).toBe(MAX_ROADMAP_DAYS);
    expect(roadmapStore[0].input.entitlementLimited).toBe(false);
  });

  it('gives the full window when an active membership outlasts the 90 days', async () => {
    userDoc = { passport: { active: true, expiresAt: new Date('2027-08-15T00:00:00Z') } };
    await generateRoadmap(TENANT, STUDENT, { now: NOW });

    expect(roadmapStore[0].roadmapDays).toBe(MAX_ROADMAP_DAYS);
    expect(roadmapStore[0].input.entitlementLimited).toBe(false);
  });

  it('shortens the plan when an active membership ends inside the 90 days', async () => {
    // The behaviour that must survive the fix: planning work into weeks the member cannot
    // reach is the original reason this clamp exists.
    userDoc = { passport: { active: true, expiresAt: new Date('2026-09-14T00:00:00Z') } };
    await generateRoadmap(TENANT, STUDENT, { now: NOW });

    expect(roadmapStore[0].roadmapDays).toBe(31);
    expect(roadmapStore[0].input.entitlementLimited).toBe(true);
    expect(roadmapStore[0].endDate.getTime())
      .toBeLessThanOrEqual(new Date('2026-09-14T00:00:00Z').getTime());
  });

  // ── no longer eligible ──────────────────────────────────────────────────────

  it('REFUSES a membership whose expiry has already passed', async () => {
    userDoc = { passport: { active: true, expiresAt: new Date('2026-03-01T00:00:00Z') } };

    const r = await generateRoadmap(TENANT, STUDENT, { now: NOW });
    expect((r.outcome as any).reason).toBe('MEMBERSHIP_REQUIRED');
    expect(r.created).toBe(false);
    expect(roadmapStore).toHaveLength(0);
  });

  it('REFUSES an inactive membership', async () => {
    userDoc = { passport: { active: false } };

    const r = await generateRoadmap(TENANT, STUDENT, { now: NOW });
    expect((r.outcome as any).reason).toBe('MEMBERSHIP_REQUIRED');
    expect(roadmapStore).toHaveLength(0);
  });

  it('REFUSES an inactive membership even with an expiry still in the future', async () => {
    // Deactivated early — a refund, a chargeback, an admin action. The date says one thing
    // and the flag says another; the flag wins, exactly as membershipActive() decides it.
    userDoc = { passport: { active: false, expiresAt: new Date('2027-08-15T00:00:00Z') } };

    const r = await generateRoadmap(TENANT, STUDENT, { now: NOW });
    expect((r.outcome as any).reason).toBe('MEMBERSHIP_REQUIRED');
    expect(roadmapStore).toHaveLength(0);
  });

  it('REFUSES a member with no passport record at all', async () => {
    userDoc = { passport: undefined };

    const r = await generateRoadmap(TENANT, STUDENT, { now: NOW });
    expect((r.outcome as any).reason).toBe('MEMBERSHIP_REQUIRED');
    expect(roadmapStore).toHaveLength(0);
  });

  it('creates no roadmap on any refusal, and says renewal is the fix when it expired', async () => {
    userDoc = { passport: { active: true, expiresAt: new Date('2026-03-01T00:00:00Z') } };

    const r = await generateRoadmap(TENANT, STUDENT, { now: NOW });
    expect((r.outcome as any).message).toMatch(/ended|renew/i);
    expect(roadmapStore).toHaveLength(0);
  });

  it('refuses to REPLAN for a lapsed member, and leaves the existing plan alone', async () => {
    await generateRoadmap(TENANT, STUDENT, { now: NOW });
    const planned = JSON.stringify(roadmapStore[0].objectives);

    userDoc = { passport: { active: true, expiresAt: new Date('2026-03-01T00:00:00Z') } };
    const r = await generateRoadmap(TENANT, STUDENT, { now: NOW, replan: true });

    expect((r.outcome as any).reason).toBe('MEMBERSHIP_REQUIRED');
    expect(roadmapStore).toHaveLength(1);
    // Not superseded, not emptied: a lapsed membership must not cost them the plan they had.
    expect(roadmapStore[0].status).toBe('ACTIVE');
    expect(JSON.stringify(roadmapStore[0].objectives)).toBe(planned);
  });

  it('still lets a lapsed member READ the plan they already have', async () => {
    await generateRoadmap(TENANT, STUDENT, { now: NOW });
    userDoc = { passport: { active: false } };

    const out = await getActiveRoadmap(TENANT, STUDENT, NOW);
    expect(out.available).toBe(true);
  });

  // ── admin configuration is respected, but cannot conjure days ────────────────

  /**
   * The programme length comes from ONE stored number.
   *
   * Production had journeyDays 100 on the content row and roadmapDays 90 on the config row,
   * so a member was shown a "90-day plan" stacked directly above a "100-Day Roadmap". The
   * service reads the journey's number first precisely so that pair cannot disagree.
   */
  it('takes the programme length from the journey, not the older config field', async () => {
    contentDoc = { journeyDays: 30 };
    configDoc = { roadmapDays: 90 };

    await generateRoadmap(TENANT, STUDENT, { now: NOW });
    expect(roadmapStore[0].roadmapDays).toBe(30);
  });

  it('falls back to the config field for a tenant whose content predates it', async () => {
    contentDoc = null;
    configDoc = { roadmapDays: 45 };

    await generateRoadmap(TENANT, STUDENT, { now: NOW });
    expect(roadmapStore[0].roadmapDays).toBe(45);
  });

  it('still clamps a journey longer than the policy ceiling', async () => {
    contentDoc = { journeyDays: 365 };

    await generateRoadmap(TENANT, STUDENT, { now: NOW });
    expect(roadmapStore[0].roadmapDays).toBe(90);
  });

  it('honours a tenant that has made the full roadmap free', async () => {
    // Re-tiering in Platform Settings is an existing, deliberate admin action.
    userDoc = { passport: { active: false } };
    configDoc = { entitlements: [{ featureKey: 'roadmap_full', label: 'Full 90-day Roadmap', tier: 'free' }] };

    const r = await generateRoadmap(TENANT, STUDENT, { now: NOW });
    expect(r.created).toBe(true);
    expect(roadmapStore).toHaveLength(1);
  });

  it('still refuses an EXPIRED member on a free-tier tenant', async () => {
    // A free tier says who may plan. It cannot say that days which have already passed are
    // available to plan into, so the expiry check is not an else-branch of the access check.
    userDoc = { passport: { active: true, expiresAt: new Date('2026-03-01T00:00:00Z') } };
    configDoc = { entitlements: [{ featureKey: 'roadmap_full', label: 'Full 90-day Roadmap', tier: 'free' }] };

    const r = await generateRoadmap(TENANT, STUDENT, { now: NOW });
    expect((r.outcome as any).reason).toBe('MEMBERSHIP_REQUIRED');
    expect(roadmapStore).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §21–§24, §94 — refusing, with the reason
// ─────────────────────────────────────────────────────────────────────────────

describe('when a plan cannot be built', () => {
  it('refuses without a target role, and names that as the reason', async () => {
    readinessMock.mockResolvedValue({
      available: false, reason: 'ROLE_NOT_SELECTED', message: 'Choose a role.',
    });

    const r = await generateRoadmap(TENANT, STUDENT, { now: NOW });
    expect((r.outcome as any).reason).toBe('ROLE_NOT_SELECTED');
    expect(roadmapStore).toHaveLength(0);
  });

  it('refuses when the role has no published blueprint', async () => {
    readinessMock.mockResolvedValue({
      available: false, reason: 'ROLE_BLUEPRINT_NOT_READY', message: 'Not configured.',
      role: { key: 'BACKEND_ENGINEER' },
    });

    const r = await generateRoadmap(TENANT, STUDENT, { now: NOW });
    expect((r.outcome as any).reason).toBe('ROLE_BLUEPRINT_NOT_READY');
    expect(roadmapStore).toHaveLength(0);
  });

  it('refuses rather than inventing how much time the student has', async () => {
    // §21: a plan built around two invented hours a day puts them behind in week one
    // through no fault of their own.
    getCareerContextMock.mockResolvedValue(context({
      availability: { minutesPerDay: null, daysPerWeek: null },
    }));

    const r = await generateRoadmap(TENANT, STUDENT, { now: NOW });
    const out = r.outcome as any;
    expect(out.reason).toBe('CAREER_CONTEXT_INCOMPLETE');
    expect(out.missing).toEqual(['availability.minutesPerDay', 'availability.daysPerWeek']);
    expect(roadmapStore).toHaveLength(0);
  });

  it('refuses when the student has no days per week, even with minutes set', async () => {
    getCareerContextMock.mockResolvedValue(context({
      availability: { minutesPerDay: 60, daysPerWeek: null },
    }));

    const r = await generateRoadmap(TENANT, STUDENT, { now: NOW });
    expect((r.outcome as any).missing).toEqual(['availability.daysPerWeek']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §82, §133, §134 — the plan is the server's account, not the caller's
// ─────────────────────────────────────────────────────────────────────────────

describe('what the caller cannot influence', () => {
  it('resolves the role from stored context, never from the request', async () => {
    await generateRoadmap(TENANT, STUDENT, { now: NOW });
    // Readiness is asked only for this tenant and student; the role comes from within it.
    expect(readinessMock).toHaveBeenCalledWith(TENANT, STUDENT);
    expect(roadmapStore[0].roleKey).toBe('BACKEND_ENGINEER');
  });

  it('scopes every read to the caller’s tenant', async () => {
    await generateRoadmap(TENANT, STUDENT, { now: NOW });
    expect(getCareerContextMock).toHaveBeenCalledWith(TENANT, STUDENT, NOW);

    // Another tenant asking about the same student id finds nothing of theirs.
    const other = await getActiveRoadmap('t2', STUDENT, NOW);
    expect(other.available).toBe(false);
  });

  it('writes the plan against the authenticated student only', async () => {
    await generateRoadmap(TENANT, STUDENT, { now: NOW });
    expect(roadmapStore[0].tenantId).toBe(TENANT);
    expect(roadmapStore[0].studentId).toBe(STUDENT);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §69, §70 — a plan is not evidence
// ─────────────────────────────────────────────────────────────────────────────

describe('the plan never becomes a score', () => {
  it('stores no way to award skill credit for completing an item', async () => {
    // §70: "Learn OOP — done" must not move an OOP score. If an objective carried a score
    // delta, somebody would eventually apply it, and every downstream number would become a
    // self-assessment.
    await generateRoadmap(TENANT, STUDENT, { now: NOW });
    for (const o of roadmapStore[0].objectives) {
      for (const forbidden of ['scoreDelta', 'awardsScore', 'xp', 'skillGain', 'completesSkill']) {
        expect(o).not.toHaveProperty(forbidden);
      }
    }
  });

  it('records only what was planned, never what was demonstrated', async () => {
    await generateRoadmap(TENANT, STUDENT, { now: NOW });
    // studentScore on an objective is the score AT PLANNING TIME, for explanation. It is a
    // copy of Module 7's reading, and nothing here can write back to it.
    const rm = roadmapStore[0];
    expect(rm.objectives.every((o: any) => typeof o.plannedMinutes === 'number')).toBe(true);
    expect(rm).not.toHaveProperty('skillScores');
  });
});
