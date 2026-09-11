/**
 * The roadmap a student is shown must be the one their curriculum decides.
 *
 * This covers the seam between two planners. The gap planner orders a roadmap by how far each
 * skill sits from its target, breaking ties alphabetically; the curriculum projection orders it
 * by the modules the student is actually being taught. The projection replaced the planner, but
 * `generateRoadmap` is idempotent by design — a plan that already exists comes back untouched —
 * so every roadmap built before the projection kept its old ordering indefinitely, and the
 * journey screen fell through to a pool journey that was nobody's plan.
 *
 * These tests are about `ensureCurriculumRoadmap`, which is the one thing in the service allowed
 * to rebuild a plan without being asked. Most of them exist to hold its bounds rather than its
 * behaviour: the interesting failures are all it doing MORE than it should — churning a plan on
 * every page load, rolling a finished student into a second ninety days, or writing a roadmap
 * for somebody who has no curriculum and never asked for one.
 */

import mongoose from 'mongoose';

const roadmapStore: any[] = [];
let userDoc: any = null;
let assignmentDoc: any = null;

const matches = (doc: any, q: any) =>
  Object.entries(q).every(([k, v]) => String(doc[k]) === String(v));

/**
 * A findOne result that answers both callers.
 *
 * generateRoadmap awaits it directly because it needs a live document to mutate; the adoption
 * check reads `.select('report').lean()` because it only needs one field and has no intention
 * of writing. Supporting one and not the other would make the test pass against a shape the
 * service does not actually use.
 */
const findOneResult = (doc: any): any => {
  const p: any = Promise.resolve(doc);
  p.select = () => ({ lean: async () => doc });
  return p;
};

jest.mock('../models/CareerRoadmap', () => ({
  __esModule: true,
  default: {
    findOne: (q: any) => findOneResult(roadmapStore.find(d => matches(d, q)) || null),
    find: (q: any) => ({
      select: () => ({ sort: () => ({ limit: () => ({ lean: async () => roadmapStore.filter(d => matches(d, q)) }) }) }),
    }),
    create: async (o: any) => {
      // The real guarantee is a partial unique index on (tenantId, studentId) where status is
      // ACTIVE. Reproduced so a test cannot pass against a rule the database keeps.
      if (o.status === 'ACTIVE'
        && roadmapStore.some(d => d.status === 'ACTIVE'
          && d.tenantId === o.tenantId && String(d.studentId) === String(o.studentId))) {
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

jest.mock('../models/StudentCurriculumAssignment', () => ({
  __esModule: true,
  default: {
    exists: async () => (assignmentDoc ? { _id: 'a1' } : null),
    findOne: () => ({ lean: async () => assignmentDoc }),
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

jest.mock('../models/PassportConfig', () => ({
  __esModule: true,
  default: { findOne: () => ({ lean: async () => null }) },
}));

jest.mock('../models/PassportContent', () => ({
  __esModule: true,
  default: { findOne: () => ({ select: () => ({ lean: async () => null }) }) },
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

import { generateRoadmap, ensureCurriculumRoadmap } from '../services/careerRoadmapService';
import { classifyGap, priorityScore, targetScoreFor } from '../data/roleReadinessPolicy';

let SKILL_DOCS: any[] = [];
let PROFILE_ROWS: any[] = [];

const NOW = new Date('2026-08-15T00:00:00Z');
const TENANT = 't1';
/** A real ObjectId, because the service refuses to look for a curriculum plan without one. */
const STUDENT = new mongoose.Types.ObjectId().toHexString();

function skill(key: string, score: number | null, weight = 8) {
  const targetScore = targetScoreFor('PROFICIENT');
  const confidence = score === null ? null : 'HIGH';
  return {
    skillKey: key, skillName: key, importance: 'ESSENTIAL', weight,
    targetLevel: 'PROFICIENT', targetScore,
    studentScore: score, skillConfidence: confidence,
    gapPoints: score === null ? null : Math.max(0, targetScore - score),
    status: classifyGap({ studentScore: score, targetScore, confidence } as any),
    priorityScore: score === null ? 0 : priorityScore({ studentScore: score, targetScore, weight, importance: 'ESSENTIAL' } as any),
    skillInactive: false, countedInReadiness: score !== null, evidenceCount: score === null ? 0 : 4,
  };
}

const readinessResult = () => {
  const skills = [skill('REST_API', 40), skill('SQL', 85), skill('DOCKER', null)];
  return {
    available: true,
    policyVersion: 'ROLE_READINESS_V1',
    role: { key: 'BACKEND_ENGINEER', name: 'Backend Engineer' },
    blueprintVersion: 3,
    blueprintUpdatedAt: new Date('2026-07-01T00:00:00Z'),
    readiness: 58, coverage: 80, confidence: 'HIGH',
    summary: {
      requiredSkills: skills.length, assessedSkills: 2, priorityGaps: 1, needsWork: 0,
      onTrack: 1, strong: 0, limitedEvidence: 0, notAssessed: 1, essentialTotal: 3, essentialAssessed: 2,
    },
    skills, topGaps: [], strengths: [], assessmentNeeded: [],
  };
};

const context = () => ({
  tenantId: TENANT, studentId: STUDENT,
  education: {}, location: {},
  career: { domain: 'SOFTWARE_ENGINEERING', primaryRole: 'BACKEND_ENGINEER', secondaryRole: null },
  availability: { minutesPerDay: 60, daysPerWeek: 6 },
  derived: { stage: 'foundation', background: 'cs', monthsToGraduation: 30, computedAt: NOW },
  status: { onboardingCompleted: true, contextVersion: 1, missing: [], completedAt: NOW },
});

/** A curriculum plan in the order the curriculum teaches, which is NOT alphabetical. */
const curriculumPlan = () => ({
  moduleAssignments: [{
    moduleCode: 'M01', moduleName: 'Foundations',
    topicAssignments: [
      { topicCode: 'T_SQL', title: 'Databases', skillKeys: ['SQL'], state: 'STANDARD', practiceCount: 2, mandatory: true, locked: false },
      { topicCode: 'T_API', title: 'Building APIs', skillKeys: ['REST_API'], state: 'GUIDED', practiceCount: 3, mandatory: true, locked: false },
      { topicCode: 'T_DOCK', title: 'Containers', skillKeys: ['DOCKER'], state: 'FOUNDATION_REQUIRED', practiceCount: 2, mandatory: true, locked: false },
    ],
  }],
});

const activePlans = () => roadmapStore.filter(r => r.status === 'ACTIVE');
const activePlan = () => activePlans()[0];

beforeEach(() => {
  roadmapStore.length = 0;
  userDoc = { passport: { active: true } };
  assignmentDoc = curriculumPlan();
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
// The repair itself
// ─────────────────────────────────────────────────────────────────────────────

describe('a student with a curriculum plan and no roadmap', () => {
  it('gets one built from the curriculum rather than a pool journey', async () => {
    const outcome = await ensureCurriculumRoadmap(TENANT, STUDENT, NOW);

    expect(outcome).toBe('BUILT');
    expect(activePlans()).toHaveLength(1);
    expect(activePlan().report.projectedFromCurriculum).toBe(1);
    expect(activePlan().generationReason).toBe('FIRST_PLAN');
  });

  it('is ordered by what the curriculum teaches, not alphabetically', async () => {
    await ensureCurriculumRoadmap(TENANT, STUDENT, NOW);

    // The curriculum teaches SQL, then REST_API, then DOCKER. The gap planner would have led
    // with REST_API — the biggest gap — and the whole point of the projection is that it does not.
    const order = activePlan().objectives
      .map((o: any) => o.skillKey)
      .filter((k: string, i: number, a: string[]) => a.indexOf(k) === i);
    expect(order).toEqual(['SQL', 'REST_API', 'DOCKER']);
  });
});

describe('a student on a roadmap the old planner built', () => {
  /** What every pre-projection student has: a real plan, ordered by the wrong thing. */
  const givenGapPlannerRoadmap = async () => {
    assignmentDoc = null;                       // no curriculum plan yet, so the gap planner runs
    await generateRoadmap(TENANT, STUDENT, { now: NOW });
    assignmentDoc = curriculumPlan();           // the curriculum plan arrives afterwards
    expect(activePlan().report.projectedFromCurriculum).toBeUndefined();
  };

  it('is moved onto the curriculum without being asked', async () => {
    await givenGapPlannerRoadmap();

    const outcome = await ensureCurriculumRoadmap(TENANT, STUDENT, NOW);

    expect(outcome).toBe('UPGRADED');
    expect(activePlans()).toHaveLength(1);
    expect(activePlan().report.projectedFromCurriculum).toBe(1);
    expect(activePlan().roadmapVersion).toBe(2);
  });

  it('keeps the plan it replaced, because what they were asked to do is a record', async () => {
    await givenGapPlannerRoadmap();
    await ensureCurriculumRoadmap(TENANT, STUDENT, NOW);

    const superseded = roadmapStore.filter(r => r.status === 'SUPERSEDED');
    expect(superseded).toHaveLength(1);
    expect(superseded[0].supersededAt).toBeTruthy();
    expect(roadmapStore).toHaveLength(2);       // replaced, never deleted
  });

  it('says why it changed, so a support question has an answer', async () => {
    await givenGapPlannerRoadmap();
    await ensureCurriculumRoadmap(TENANT, STUDENT, NOW);

    expect(activePlan().generationReason).toBe('REPLAN_CURRICULUM_ADOPTED');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// The bounds — everything it must NOT do
// ─────────────────────────────────────────────────────────────────────────────

describe('what it refuses to touch', () => {
  it('does nothing at all to a plan already projected from the curriculum', async () => {
    await ensureCurriculumRoadmap(TENANT, STUDENT, NOW);
    const before = { ...activePlan() };

    const outcome = await ensureCurriculumRoadmap(TENANT, STUDENT, NOW);

    expect(outcome).toBe('ALREADY_CURRICULUM');
    expect(roadmapStore).toHaveLength(1);
    expect(activePlan().roadmapVersion).toBe(before.roadmapVersion);
    expect(activePlan().generatedAt).toEqual(before.generatedAt);
  });

  /**
   * The churn test, and the reason this is safe to put on a read path.
   *
   * This runs on every load of the journey screen. A version that rebuilt anything per request
   * would give a student a different plan each time they opened the page, which is worse than
   * the stale plan it was written to fix.
   */
  it('is a no-op across repeated page loads', async () => {
    for (let i = 0; i < 5; i++) await ensureCurriculumRoadmap(TENANT, STUDENT, NOW);

    expect(roadmapStore).toHaveLength(1);
    expect(activePlan().roadmapVersion).toBe(1);
  });

  it('leaves a student with no curriculum plan alone entirely', async () => {
    assignmentDoc = null;

    const outcome = await ensureCurriculumRoadmap(TENANT, STUDENT, NOW);

    // A tenant that teaches no curriculum, or somebody not yet assessed. Building a plan for
    // them here would be generating a commitment out of a page load.
    expect(outcome).toBe('NO_CURRICULUM');
    expect(roadmapStore).toHaveLength(0);
  });

  it('does not go looking for a plan when the id could not have one', async () => {
    const outcome = await ensureCurriculumRoadmap(TENANT, 'not-an-object-id', NOW);

    expect(outcome).toBe('NO_CURRICULUM');
    expect(roadmapStore).toHaveLength(0);
  });

  /**
   * A finished programme stays finished.
   *
   * generateRoadmap refuses to replan past the end of the window because rolling into another
   * ninety days is a commercial decision. That refusal has to survive here, or a page load
   * would quietly hand somebody a second programme.
   */
  it('will not roll a finished programme into a second one', async () => {
    assignmentDoc = null;
    await generateRoadmap(TENANT, STUDENT, { now: NOW });
    assignmentDoc = curriculumPlan();

    const afterTheEnd = new Date(NOW.getTime() + 120 * 86400000);
    const outcome = await ensureCurriculumRoadmap(TENANT, STUDENT, afterTheEnd);

    expect(outcome).toBe('COULD_NOT');
    expect(activePlans()).toHaveLength(1);
    expect(activePlan().report.projectedFromCurriculum).toBeUndefined();
  });

  /**
   * A refusal is read off the result, never inferred from "it did not throw".
   *
   * If this reported UPGRADED here, the backfill script would report rows fixed that it had not
   * touched — the single most misleading thing a migration can do.
   */
  it('reports COULD_NOT rather than success when readiness cannot be computed', async () => {
    readinessMock.mockResolvedValue({ available: false, reason: 'NO_BLUEPRINT' });

    const outcome = await ensureCurriculumRoadmap(TENANT, STUDENT, NOW);

    expect(outcome).toBe('COULD_NOT');
    expect(roadmapStore).toHaveLength(0);
  });
});
