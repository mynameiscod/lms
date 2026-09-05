/**
 * Regression: an AFTER snapshot must never be frozen from stale Skill DNA.
 *
 * The submit path captured the check-in's AFTER picture unconditionally — including when
 * projectAssessmentToSkillDna had just thrown. That case is precisely the one where the
 * scores have NOT moved: the profile still holds what the student had before they sat the
 * paper. Snapshotting there froze the pre-assessment picture as the "after", and because the
 * snapshot is deliberately write-once, a later successful reproject could repair the Skill
 * DNA and never repair the comparison.
 *
 * The student's history would then read 42 → 42, permanently, for a check-in that actually
 * took them to 63 — the one number the whole module exists to report, wrong forever, on the
 * path where nothing looked broken.
 *
 * The fix: a failed projection leaves the snapshot ABSENT, and reproject writes the real one
 * from the rebuilt Skill DNA. Absent is recoverable; frozen and wrong is not.
 */

let attempts: any[] = [];
let projectionShouldFail = false;
let projectionCalls = 0;
let currentReadiness: any = null;

const gamificationCalls = jest.fn();
const roadmapWrite = jest.fn();

const oidStr = (v: any) => String(v?._id ?? v);
const getPath = (doc: any, path: string): any =>
  path.split('.').reduce((o: any, part: string) => (o == null ? o : o[part]), doc);

const matches = (doc: any, q: any): boolean =>
  Object.entries(q).every(([k, cond]: [string, any]) => {
    const value = k === '_id' ? oidStr(doc._id ?? doc)
      : (k === 'studentId' ? String(doc.studentId) : getPath(doc, k));
    if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
      if ('$exists' in cond) return (value !== undefined && value !== null) === cond.$exists;
      if ('$ne' in cond) return String(value) !== String(cond.$ne);
      if ('$in' in cond) return cond.$in.map(String).includes(String(value));
    }
    return String(value) === String(cond);
  });

const one = (row: any) => {
  const h: any = Promise.resolve(row || null);
  h.sort = () => h; h.select = () => h; h.limit = () => h;
  h.lean = async () => row || null;
  return h;
};

jest.mock('../models/PersonalizedAssessment', () => ({
  __esModule: true,
  default: {
    findOne: (q: any) => one(attempts.find(a => matches(a, q))),
    find: (q: any) => {
      const rows = attempts.filter(a => matches(a, q));
      const h: any = { sort: () => h, limit: () => h, select: () => h, lean: async () => rows };
      return h;
    },
    updateOne: async (filter: any, update: any) => {
      const a = attempts.find(x => matches(x, filter));
      if (!a) return { modifiedCount: 0 };
      if (update.$set) for (const [f, v] of Object.entries<any>(update.$set)) a[f] = v;
      return { modifiedCount: 1 };
    },
  },
}));

/**
 * Module 7's projection. Skill DNA moves ONLY when this succeeds — which is the entire
 * point: a thrown projection leaves `currentReadiness` at its pre-assessment value.
 */
jest.mock('../services/skillDnaService', () => ({
  __esModule: true,
  projectAssessmentToSkillDna: async () => {
    projectionCalls++;
    if (projectionShouldFail) throw new Error('projection exploded');
    currentReadiness = AFTER_READINESS;
    return { skillsAffected: ['SQL'], evidenceCreated: 4 };
  },
  rebuildSkillDnaForStudent: async () => ({}),
  getSkillDna: async () => ({}),
  explainSkill: async () => ({}),
}));

jest.mock('../services/assessmentAnswerGradingService', () => ({
  __esModule: true,
  gradeSubmittedAnswers: async (_t: string, items: any[]) =>
    items.map(i => ({ ...i, gradable: true, answered: true, earnedPoints: 1, maxPoints: 1 })),
}));

jest.mock('../services/roleReadinessService', () => ({
  __esModule: true,
  calculateStudentRoleReadiness: async () => currentReadiness,
}));

jest.mock('../services/gamificationEngine', () => ({
  __esModule: true,
  processGamificationEvent: async (e: any) => {
    gamificationCalls(e.eventKey, e.sourceId);
    return { awarded: 100, badges: [], xpTotal: 100, streak: 1, longestStreak: 1 };
  },
  evaluateRoadmapBadges: async () => [],
}));

// Present so an automatic replacement would be visible. It must never be called.
jest.mock('../models/CareerRoadmap', () => ({
  __esModule: true,
  default: {
    findOne: () => one(ACTIVE_ROADMAP),
    updateOne: (...a: any[]) => { roadmapWrite(...a); return Promise.resolve({}); },
    create: (...a: any[]) => { roadmapWrite(...a); return Promise.resolve({}); },
  },
}));
jest.mock('../models/PassportProgress', () => ({
  __esModule: true, default: { findOne: () => one({ completed: [] }) },
}));
jest.mock('../models/PassportConfig', () => ({
  __esModule: true,
  default: { findOne: () => one({ tenantId: 't1', entitlements: [], reassessment: { materialChangeThreshold: 10 } }) },
}));
jest.mock('../models/User', () => ({
  __esModule: true, default: { findOne: () => one({ passport: { active: true } }) },
}));
jest.mock('../services/careerContextService', () => ({
  __esModule: true,
  getCareerContext: async () => ({
    career: { primaryRole: 'BACKEND_ENGINEER' },
    availability: { minutesPerDay: 60, daysPerWeek: 6 },
    derived: { stage: 'foundation' },
  }),
}));

import { submitPersonalizedAssessment, reprojectAssessment } from '../controllers/skillDnaController';
import { evaluateRoadmapReplanNeed, getReassessmentResult } from '../services/replanRecommendationService';

const T = 't1';
const S = 's1';

const skillRow = (score: number, status: string) => ({
  skillKey: 'SQL', skillName: 'SQL', importance: 'ESSENTIAL', weight: 8,
  targetLevel: 'PROFICIENT', targetScore: 75,
  studentScore: score, skillConfidence: 'HIGH', status, skillInactive: false,
});

const readinessAt = (score: number, readiness: number, status: string) => ({
  available: true,
  role: { key: 'BACKEND_ENGINEER', name: 'Backend Engineer' },
  blueprintVersion: 3,
  readiness, coverage: 85, confidence: 'HIGH',
  summary: { requiredSkills: 1, assessedSkills: 1, priorityGaps: 0, needsWork: 1, onTrack: 0, strong: 0, limitedEvidence: 0, notAssessed: 0, essentialTotal: 1, essentialAssessed: 1 },
  skills: [skillRow(score, status)],
  topGaps: [], strengths: [], assessmentNeeded: [],
});

/** What the student had BEFORE the check-in — and what a failed projection leaves in place. */
const BEFORE_READINESS = readinessAt(42, 46, 'PRIORITY_GAP');
/** What Module 7 produces once the projection lands. */
const AFTER_READINESS = readinessAt(63, 58, 'NEEDS_WORK');

const ACTIVE_ROADMAP = {
  _id: 'rm1', tenantId: T, studentId: S, status: 'ACTIVE',
  roleKey: 'BACKEND_ENGINEER',
  startDate: new Date('2026-08-01'), endDate: new Date('2026-10-29'),
  roadmapDays: 90, weekCount: 13,
  input: { readiness: 46, minutesPerDay: 60, daysPerWeek: 6, blueprintVersion: 3 },
  capacity: { plannedMinutes: 3000 },
};

const req = (user = { tenantId: T, id: S }) => ({ user, body: {}, params: {}, query: {} } as any);

function res() {
  const out: any = { code: 200, body: null };
  out.status = (c: number) => { out.code = c; return out; };
  out.json = (b: any) => { out.body = b; return out; };
  return out;
}

/** An open check-in, with the BEFORE picture already frozen at start. */
const openCheckIn = (purpose = 'REASSESSMENT') => ({
  _id: 'pa1', tenantId: T, studentId: S,
  status: 'IN_PROGRESS', purpose,
  targetSkillKeys: ['SQL'],
  items: [{ sourceType: 'question', sourceId: 'q1' }],
  answers: undefined,
  beforeSnapshot: {
    roleKey: 'BACKEND_ENGINEER', readiness: 46, coverage: 80, blueprintVersion: 3,
    skills: [{ skillKey: 'SQL', skillName: 'SQL', score: 42, status: 'PRIORITY_GAP', confidence: 'HIGH', targetScore: 75 }],
    capturedAt: new Date('2026-08-16'),
  },
  save: async function () { return this; },
});

const submit = async (body: any = { answers: [{ sourceType: 'question', sourceId: 'q1', response: ['1'] }] }) => {
  const r = res();
  await submitPersonalizedAssessment({ ...req(), body } as any, r);
  return r;
};

const reproject = async (assessmentId = 'pa1') => {
  const r = res();
  await reprojectAssessment({ ...req(), params: { assessmentId } } as any, r);
  return r;
};

const theAttempt = () => attempts[0];

beforeEach(() => {
  attempts = [openCheckIn()];
  projectionShouldFail = false;
  projectionCalls = 0;
  currentReadiness = BEFORE_READINESS;
  gamificationCalls.mockReset();
  roadmapWrite.mockReset();
});

// ─────────────────────────────────────────────────────────────────────────────
// The healthy path
// ─────────────────────────────────────────────────────────────────────────────

describe('when the projection succeeds', () => {
  it('writes the AFTER snapshot once, from the updated Skill DNA', async () => {
    const r = await submit();

    expect(r.body.submitted).toBe(true);
    expect(r.body.afterSnapshotPending).toBe(false);
    expect(theAttempt().afterSnapshot).toBeDefined();
    expect(theAttempt().afterSnapshot.readiness).toBe(58);
    expect(theAttempt().afterSnapshot.skills[0].score).toBe(63);
  });

  it('produces the real comparison', async () => {
    await submit();
    const result: any = await getReassessmentResult(T, S, 'pa1');

    expect(result.ok).toBe(true);
    const sql = result.skills.find((s: any) => s.skillKey === 'SQL');
    expect(sql.before).toBe(42);
    expect(sql.after).toBe(63);
    expect(sql.delta).toBe(21);
    expect(result.readinessDelta).toBe(12);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// The defect
// ─────────────────────────────────────────────────────────────────────────────

describe('when the projection fails', () => {
  beforeEach(() => { projectionShouldFail = true; });

  it('still records the submission — the student never loses their paper', async () => {
    const r = await submit();

    expect(r.body.submitted).toBe(true);
    expect(r.body.skillDnaPending).toBe(true);
    expect(theAttempt().status).toBe('SUBMITTED');
    expect(theAttempt().answers).toHaveLength(1);
  });

  it('leaves the AFTER snapshot ABSENT rather than freezing a stale one', async () => {
    const r = await submit();

    // The whole fix. Skill DNA has not moved, so any snapshot taken now would say 42 — and
    // being write-once, would say 42 forever.
    expect(theAttempt().afterSnapshot).toBeUndefined();
    expect(r.body.afterSnapshotPending).toBe(true);
  });

  it('reports the comparison as not ready, rather than reporting a wrong one', async () => {
    await submit();
    const result: any = await getReassessmentResult(T, S, 'pa1');
    expect(result.ok).toBe(false);
  });

  it('does not recommend a replan off a comparison that does not exist', async () => {
    await submit();
    const status = await evaluateRoadmapReplanNeed(T, S, new Date('2026-08-17'));
    expect(status.affectedSkills).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Recovery
// ─────────────────────────────────────────────────────────────────────────────

describe('recovering through reproject', () => {
  beforeEach(async () => {
    projectionShouldFail = true;
    await submit();
    projectionShouldFail = false;          // whatever broke has been fixed
  });

  it('writes the AFTER snapshot from the rebuilt Skill DNA', async () => {
    const r = await reproject();

    expect(r.body.afterSnapshotRecovered).toBe(true);
    expect(theAttempt().afterSnapshot).toBeDefined();
    expect(theAttempt().afterSnapshot.readiness).toBe(58);
  });

  it('produces 42 → 63, not 42 → 42', async () => {
    await reproject();
    const result: any = await getReassessmentResult(T, S, 'pa1');

    const sql = result.skills.find((s: any) => s.skillKey === 'SQL');
    expect(sql.before).toBe(42);
    expect(sql.after).toBe(63);
    expect(sql.delta).toBe(21);
  });

  it('makes the replan recommendation available from the recovered comparison', async () => {
    let status = await evaluateRoadmapReplanNeed(T, S, new Date('2026-08-17'));
    expect(status.recommendation).toBe('NONE');           // nothing to compare yet

    await reproject();

    status = await evaluateRoadmapReplanNeed(T, S, new Date('2026-08-17'));
    expect(status.recommendation).toBe('SUGGESTED');
    expect(status.affectedSkills.map(s => s.skillKey)).toContain('SQL');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Write-once, still
// ─────────────────────────────────────────────────────────────────────────────

describe('a valid snapshot is never rewritten', () => {
  it('survives a repeated reproject', async () => {
    await submit();
    const original = JSON.stringify(theAttempt().afterSnapshot);

    // Something later moves SQL again; reprojecting must not restate history as today.
    currentReadiness = readinessAt(71, 66, 'ON_TRACK');
    await reproject();
    await reproject();

    expect(JSON.stringify(theAttempt().afterSnapshot)).toBe(original);
    expect(theAttempt().afterSnapshot.skills[0].score).toBe(63);
  });

  it('survives a repeated reproject after recovery too', async () => {
    projectionShouldFail = true;
    await submit();
    projectionShouldFail = false;

    await reproject();
    const recovered = JSON.stringify(theAttempt().afterSnapshot);

    currentReadiness = readinessAt(71, 66, 'ON_TRACK');
    await reproject();

    expect(JSON.stringify(theAttempt().afterSnapshot)).toBe(recovered);
  });

  it('reports recovery as false when a snapshot already exists', async () => {
    await submit();
    const r = await reproject();
    // Nothing was recovered because nothing was missing.
    expect(r.body.afterSnapshotRecovered).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Everything else must be unaffected
// ─────────────────────────────────────────────────────────────────────────────

describe('initial assessments are untouched', () => {
  it('never gets an AFTER snapshot, projection succeeding or not', async () => {
    attempts = [{ ...openCheckIn('INITIAL'), beforeSnapshot: undefined }];
    await submit();
    expect(theAttempt().afterSnapshot).toBeUndefined();

    projectionShouldFail = true;
    attempts = [{ ...openCheckIn('INITIAL'), beforeSnapshot: undefined }];
    await submit();
    expect(theAttempt().afterSnapshot).toBeUndefined();
  });

  it('is not offered snapshot recovery on reproject', async () => {
    attempts = [{ ...openCheckIn('INITIAL'), beforeSnapshot: undefined }];
    await submit();
    const r = await reproject();
    expect(r.body.afterSnapshotRecovered).toBe(false);
  });
});

describe('gamification stays exactly-once', () => {
  it('awards once on submit, and never again on reproject', async () => {
    await submit();
    await reproject();
    await reproject();

    expect(gamificationCalls).toHaveBeenCalledTimes(1);
    expect(gamificationCalls).toHaveBeenCalledWith('PERSONALIZED_ASSESSMENT_COMPLETED', 'pa1');
  });

  it('still awards once when the projection failed', async () => {
    projectionShouldFail = true;
    await submit();
    projectionShouldFail = false;
    await reproject();

    // The award is for finishing the paper, which happened either way.
    expect(gamificationCalls).toHaveBeenCalledTimes(1);
  });
});

/**
 * NARROWED, because the product moved and the old title stopped being true.
 *
 * A SUCCESSFUL assessment now replans automatically — that is the whole point of closing the
 * measure → plan loop, and without it a member stays in the diagnostic phase for ever. What
 * still holds, and what this asserts, is the case that matters here: a projection that FAILED
 * must not move the plan, because replanning on a failed projection would rebuild tomorrow
 * from yesterday's evidence and present it as a response to this paper. Recovery does not
 * replan either; it repairs the snapshot.
 */
describe('a failed projection never replaces the roadmap', () => {
  it('leaves the active roadmap alone through a failed submit and its recovery', async () => {
    projectionShouldFail = true;
    await submit();
    projectionShouldFail = false;
    await reproject();

    // §100 still holds on the recovery path: the recommendation appears, the plan does not
    // move until the student says so.
    expect(roadmapWrite).not.toHaveBeenCalled();
  });
});
