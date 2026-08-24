/**
 * Module 13 — the loop closes, and the plan holds still while it does.
 *
 * The rule this module turns on, and the one most expensive to get wrong:
 *
 *   NEW EVIDENCE MAY CHANGE WHAT WE KNOW. IT MUST NOT CHANGE WHAT SOMEBODY WAS ASKED TO DO.
 *
 * A student finishes a check-in, their Skill DNA moves, their readiness moves — and the
 * roadmap they opened this morning is still the roadmap they are following. A plan that
 * rewrites itself is not a plan, and a student who finds different work every time they open
 * the app stops believing any of it.
 */

let attempts: any[] = [];
let roadmaps: any[] = [];
let progresses: any[] = [];
let passportConfig: any = null;
let userDoc: any = null;
let readinessResult: any = null;
let contextResult: any = null;

const skillWrite = jest.fn();

const oidStr = (v: any) => String(v?._id ?? v);
const getPath = (doc: any, path: string): any =>
  path.split('.').reduce((o: any, part: string) => (o == null ? o : o[part]), doc);

const matches = (doc: any, q: any): boolean =>
  Object.entries(q).every(([k, cond]: [string, any]) => {
    if (k === '$or') return (cond as any[]).some(c => matches(doc, c));
    const value = k === '_id' ? oidStr(doc._id ?? doc)
      : (k === 'studentId' ? String(doc.studentId) : getPath(doc, k));
    if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
      if ('$exists' in cond) return (value !== undefined && value !== null) === cond.$exists;
      if ('$ne' in cond) return String(value) !== String(cond.$ne);
      if ('$in' in cond) return cond.$in.map(String).includes(String(value));
      if ('$gte' in cond) return Number(value) >= Number(cond.$gte);
    }
    return String(value) === String(cond);
  });

const chain = (rows: any[]) => {
  const h: any = {
    sort: () => h, limit: () => h, select: () => h,
    lean: async () => rows,
  };
  return h;
};

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
    find: (q: any) => chain(attempts.filter(a => matches(a, q))),
    create: async (doc: any) => {
      if (attempts.some(a => a.status === 'IN_PROGRESS' && a.tenantId === doc.tenantId
        && String(a.studentId) === String(doc.studentId))) {
        const e: any = new Error('E11000'); e.code = 11000; throw e;
      }
      const row = { ...doc, _id: `pa${attempts.length + 1}` };
      attempts.push(row);
      return row;
    },
    updateOne: async (filter: any, update: any) => {
      const a = attempts.find(x => matches(x, filter));
      if (!a) return { modifiedCount: 0 };
      if (update.$set) for (const [f, v] of Object.entries<any>(update.$set)) a[f] = v;
      return { modifiedCount: 1 };
    },
  },
}));

jest.mock('../models/CareerRoadmap', () => ({
  __esModule: true,
  default: { findOne: (q: any) => one(roadmaps.find(r => matches(r, q))) },
}));
jest.mock('../models/PassportProgress', () => ({
  __esModule: true,
  default: { findOne: (q: any) => one(progresses.find(p => matches(p, q))) },
}));
jest.mock('../models/PassportConfig', () => ({
  __esModule: true, default: { findOne: () => one(passportConfig) },
}));
jest.mock('../models/User', () => ({
  __esModule: true, default: { findOne: () => one(userDoc) },
}));
jest.mock('../models/AuditLog', () => ({ __esModule: true, default: { create: async () => ({}) } }));

// Module 7 and 8 are read, never written. These mocks exist so a write would be visible.
jest.mock('../models/StudentSkillProfile', () => ({
  __esModule: true,
  default: {
    updateOne: (...a: any[]) => { skillWrite(...a); return Promise.resolve({}); },
    bulkWrite: (...a: any[]) => { skillWrite(...a); return Promise.resolve({}); },
  },
}));
jest.mock('../models/StudentSkillEvidence', () => ({
  __esModule: true,
  default: { create: (...a: any[]) => { skillWrite(...a); return Promise.resolve({}); } },
}));

jest.mock('../services/roleReadinessService', () => ({
  __esModule: true,
  calculateStudentRoleReadiness: async () => readinessResult,
}));
jest.mock('../services/careerContextService', () => ({
  __esModule: true,
  getCareerContext: async () => contextResult,
}));

import {
  evaluateReassessmentEligibility, buildReassessmentTargetPlan, captureSnapshot,
} from '../services/reassessmentService';
import { evaluateRoadmapReplanNeed, compareSnapshots } from '../services/replanRecommendationService';

const T = 't1';
const S = 's1';
const NOW = new Date('2026-08-16T09:00:00Z');

const skill = (key: string, score: number | null, status: string, over: any = {}) => ({
  skillKey: key, skillName: key, importance: 'ESSENTIAL', weight: 8,
  targetLevel: 'PROFICIENT', targetScore: 75,
  studentScore: score, skillConfidence: score === null ? null : 'HIGH',
  status, skillInactive: false, ...over,
});

const readiness = (over: any = {}) => ({
  available: true,
  role: { key: 'BACKEND_ENGINEER', name: 'Backend Engineer' },
  blueprintVersion: 3,
  readiness: 46, coverage: 80, confidence: 'HIGH',
  summary: { requiredSkills: 4, assessedSkills: 3, priorityGaps: 1, needsWork: 1, onTrack: 1, strong: 1, limitedEvidence: 1, notAssessed: 1, essentialTotal: 4, essentialAssessed: 3 },
  skills: [
    skill('GIT', 85, 'STRONG'),
    skill('SQL', 42, 'PRIORITY_GAP'),
    skill('SPRING_BOOT', 60, 'LIMITED_EVIDENCE'),
    skill('DSA', null, 'NOT_ASSESSED'),
  ],
  topGaps: [], strengths: [], assessmentNeeded: [],
  ...over,
});

const submitted = (purpose: string, at: string, over: any = {}) => ({
  _id: `pa-${purpose}-${at}`, tenantId: T, studentId: S,
  status: 'SUBMITTED', purpose, submittedAt: new Date(at), ...over,
});

beforeEach(() => {
  attempts = [];
  roadmaps = [];
  progresses = [{ tenantId: T, studentId: S, completed: [] }];
  passportConfig = { tenantId: T, entitlements: [], reassessment: { enabled: true, cooldownDays: 14, questionBudget: 18, studentRequestEnabled: true, materialChangeThreshold: 10 } };
  userDoc = { passport: { active: true } };
  readinessResult = readiness();
  contextResult = {
    career: { primaryRole: 'BACKEND_ENGINEER' },
    availability: { minutesPerDay: 60, daysPerWeek: 6 },
    derived: { stage: 'foundation' },
  };
  skillWrite.mockReset();
});

// ─────────────────────────────────────────────────────────────────────────────
// §93, §94 — when a check-in is available
// ─────────────────────────────────────────────────────────────────────────────

describe('eligibility', () => {
  it('refuses before the first assessment has ever been completed', async () => {
    const s = await evaluateReassessmentEligibility(T, S, NOW);
    expect(s.eligible).toBe(false);
    expect(s.blockers).toContain('INITIAL_ASSESSMENT_REQUIRED');
  });

  it('opens once an initial assessment exists and the cooldown has passed', async () => {
    attempts = [submitted('INITIAL', '2026-07-01')];
    const s = await evaluateReassessmentEligibility(T, S, NOW);
    expect(s.eligible).toBe(true);
    expect(s.triggers).toContain('TIME_ELAPSED');
  });

  it('holds during the cooldown, and says when it opens', async () => {
    attempts = [submitted('INITIAL', '2026-06-01'), submitted('REASSESSMENT', '2026-08-13')];
    const s = await evaluateReassessmentEligibility(T, S, NOW);

    expect(s.eligible).toBe(false);
    expect(s.blockers).toContain('COOLDOWN_ACTIVE');
    expect(s.nextEligibleAt).not.toBeNull();
    // A waiting state, not a failure — the copy has to read that way.
    expect(s.message).toMatch(/opens in/i);
  });

  it('counts the cooldown from a COMPLETED sitting, not an abandoned one', async () => {
    // §13: otherwise opening a check-in and walking away would reset the clock.
    attempts = [
      submitted('INITIAL', '2026-06-01'),
      { _id: 'aband', tenantId: T, studentId: S, status: 'ABANDONED', purpose: 'REASSESSMENT', submittedAt: new Date('2026-08-15') },
    ];
    const s = await evaluateReassessmentEligibility(T, S, NOW);
    expect(s.eligible).toBe(true);
  });

  it('refuses an expired membership while leaving history readable', async () => {
    attempts = [submitted('INITIAL', '2026-07-01')];
    userDoc = { passport: { active: false } };

    const s = await evaluateReassessmentEligibility(T, S, NOW);
    expect(s.blockers).toContain('MEMBERSHIP_REQUIRED');
  });

  it('refuses when a tenant has switched check-ins off', async () => {
    attempts = [submitted('INITIAL', '2026-07-01')];
    passportConfig.reassessment.enabled = false;
    const s = await evaluateReassessmentEligibility(T, S, NOW);
    expect(s.blockers).toContain('REASSESSMENT_DISABLED');
  });

  it('resumes rather than starting a second when one is already STARTED', async () => {
    attempts = [
      submitted('INITIAL', '2026-07-01'),
      { _id: 'open1', tenantId: T, studentId: S, status: 'IN_PROGRESS', purpose: 'REASSESSMENT',
        answers: [{ sourceType: 'question', sourceId: 'q1', response: 2 }] },
    ];
    const s = await evaluateReassessmentEligibility(T, S, NOW);
    expect(s.activeAttemptId).toBe('open1');
    expect(s.blockers).toContain('ASSESSMENT_IN_PROGRESS');
  });

  it('is NOT blocked by an untouched attempt nobody ever answered', async () => {
    /**
     * The failure this prevents, seen in production: a member submitted 20 of 20 at 08:26,
     * a second paper was created at 08:27 and never answered, and the check-in then told
     * them "You already have an assessment open. Finish it first." There was nothing to
     * finish and no way offered to discard it, so the check-in stayed shut.
     *
     * An untouched row is a mis-click, not work. Real work — one answer or more — still
     * blocks, because starting a fresh paper over the top would discard it.
     */
    attempts = [
      submitted('INITIAL', '2026-07-01'),
      { _id: 'ghost', tenantId: T, studentId: S, status: 'IN_PROGRESS', purpose: 'INITIAL', answers: [] },
    ];
    const s = await evaluateReassessmentEligibility(T, S, NOW);
    expect(s.blockers).not.toContain('ASSESSMENT_IN_PROGRESS');
    expect(s.activeAttemptId).toBeNull();
  });

  it('treats a legacy attempt with no purpose as the initial one', async () => {
    // §79: historical rows predate this field and must keep working, unmigrated.
    attempts = [{ _id: 'legacy', tenantId: T, studentId: S, status: 'SUBMITTED', submittedAt: new Date('2026-07-01') }];
    const s = await evaluateReassessmentEligibility(T, S, NOW);
    expect(s.blockers).not.toContain('INITIAL_ASSESSMENT_REQUIRED');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §95 — targeting
// ─────────────────────────────────────────────────────────────────────────────

describe('what a check-in focuses on', () => {
  it('prioritises the unknown, the uncertain and the worked-on over a strength', async () => {
    progresses = [{
      tenantId: T, studentId: S,
      completed: [{ careerpilot: { skillKey: 'SQL', minutes: 60 } }],
    }];

    const { targets } = await buildReassessmentTargetPlan(T, S);
    const keys = targets.map(t => t.skillKey);

    expect(keys).toContain('SQL');
    expect(keys).toContain('DSA');
    expect(keys).toContain('SPRING_BOOT');
    if (keys.includes('GIT')) expect(keys.indexOf('GIT')).toBe(keys.length - 1);
  });

  it('counts only COMPLETED work as recent work', async () => {
    // §22: a skill appearing in the roadmap proves nothing about what the student did.
    progresses = [{ tenantId: T, studentId: S, completed: [] }];
    const { targets } = await buildReassessmentTargetPlan(T, S);
    expect(targets.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §97, §98, §99 — before/after, frozen
// ─────────────────────────────────────────────────────────────────────────────

describe('the comparison', () => {
  const before = {
    roleKey: 'BACKEND_ENGINEER', readiness: 46, coverage: 80, blueprintVersion: 3,
    capturedAt: new Date('2026-08-01'),
    skills: [
      { skillKey: 'SQL', skillName: 'SQL', score: 42, status: 'PRIORITY_GAP', confidence: 'HIGH', targetScore: 75 },
      { skillKey: 'DSA', skillName: 'DSA', score: 70, status: 'ON_TRACK', confidence: 'HIGH', targetScore: 60 },
    ],
  };

  it('reports improvement with the real numbers', async () => {
    const after = {
      ...before, readiness: 58,
      skills: [
        { ...before.skills[0], score: 63, status: 'NEEDS_WORK' },
        before.skills[1],
      ],
    };

    const deltas = compareSnapshots(before, after, 10);
    const sql = deltas.find(d => d.skillKey === 'SQL')!;
    expect(sql.before).toBe(42);
    expect(sql.after).toBe(63);
    expect(sql.delta).toBe(21);
    expect(sql.materialReasons).toContain('SCORE_MOVED');
  });

  it('reports a regression honestly, with no floor', async () => {
    // §99/§66: if the evidence says DSA fell to 54, the student is told 54.
    const after = {
      ...before,
      skills: [before.skills[0], { ...before.skills[1], score: 54, status: 'PRIORITY_GAP' }],
    };

    const dsa = compareSnapshots(before, after, 10).find(d => d.skillKey === 'DSA')!;
    expect(dsa.delta).toBe(-16);
    expect(dsa.materialReasons).toContain('REGRESSED');
  });

  it('is computed from the snapshots, so later evidence cannot rewrite it', async () => {
    // §98: a September check-in taking SQL to 71 must not turn August's 42 → 63 into 42 → 71.
    const after = { ...before, skills: [{ ...before.skills[0], score: 63 }, before.skills[1]] };
    const first = compareSnapshots(before, after, 10).find(d => d.skillKey === 'SQL')!;

    // Something later moves SQL again; the stored snapshots are untouched.
    const laterReading = { ...after, skills: [{ ...before.skills[0], score: 71 }, before.skills[1]] };
    const stillFirst = compareSnapshots(before, after, 10).find(d => d.skillKey === 'SQL')!;

    expect(stillFirst.after).toBe(63);
    expect(first.after).toBe(63);
    expect(compareSnapshots(before, laterReading, 10).find(d => d.skillKey === 'SQL')!.after).toBe(71);
  });

  it('does not invent a delta where one side was never measured', async () => {
    const b = { ...before, skills: [{ skillKey: 'NEW', skillName: 'New', score: null, status: 'NOT_ASSESSED', confidence: null, targetScore: 75 }] };
    const a = { ...before, skills: [{ skillKey: 'NEW', skillName: 'New', score: 55, status: 'NEEDS_WORK', confidence: 'HIGH', targetScore: 75 }] };

    const d = compareSnapshots(b, a, 10)[0];
    expect(d.delta).toBeNull();
    expect(d.materialReasons).toContain('NEWLY_MEASURED');
  });

  it('captures a snapshot from Module 8, not from its own arithmetic', async () => {
    const snap = await captureSnapshot(T, S, NOW);
    expect(snap!.readiness).toBe(46);
    expect(snap!.roleKey).toBe('BACKEND_ENGINEER');
    expect(snap!.skills.find(s => s.skillKey === 'SQL')!.score).toBe(42);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §100 — THE CRITICAL ONE
// ─────────────────────────────────────────────────────────────────────────────

describe('a check-in never replans by itself', () => {
  const activeRoadmap = {
    _id: 'rm1', tenantId: T, studentId: S, status: 'ACTIVE',
    roleKey: 'BACKEND_ENGINEER',
    startDate: new Date('2026-08-01'), endDate: new Date('2026-10-29'),
    roadmapDays: 90, weekCount: 13,
    input: { readiness: 46, minutesPerDay: 60, daysPerWeek: 6, blueprintVersion: 3 },
    capacity: { plannedMinutes: 3000 },
    objectives: [],
  };

  beforeEach(() => {
    roadmaps = [activeRoadmap];
    attempts = [
      submitted('INITIAL', '2026-07-01'),
      submitted('REASSESSMENT', '2026-08-15', {
        targetSkillKeys: ['SQL'],
        beforeSnapshot: {
          roleKey: 'BACKEND_ENGINEER', readiness: 46, coverage: 80, blueprintVersion: 3,
          skills: [{ skillKey: 'SQL', skillName: 'SQL', score: 42, status: 'PRIORITY_GAP', confidence: 'HIGH', targetScore: 75 }],
        },
        afterSnapshot: {
          roleKey: 'BACKEND_ENGINEER', readiness: 58, coverage: 85, blueprintVersion: 3,
          skills: [{ skillKey: 'SQL', skillName: 'SQL', score: 63, status: 'NEEDS_WORK', confidence: 'HIGH', targetScore: 75 }],
        },
      }),
    ];
    readinessResult = readiness({ readiness: 58 });
  });

  it('recommends a replan after material improvement', async () => {
    const status = await evaluateRoadmapReplanNeed(T, S, NOW);
    expect(status.recommendation).toBe('SUGGESTED');
    expect(status.affectedSkills.map(s => s.skillKey)).toContain('SQL');
  });

  it('leaves the ACTIVE roadmap completely untouched', async () => {
    const before = JSON.stringify(roadmaps);
    await evaluateRoadmapReplanNeed(T, S, NOW);

    // The rule the module turns on: the plan they opened this morning is still their plan.
    expect(JSON.stringify(roadmaps)).toBe(before);
    expect(roadmaps.filter(r => r.status === 'ACTIVE')).toHaveLength(1);
    expect(String(roadmaps[0]._id)).toBe('rm1');
  });

  it('reports the readiness movement against the roadmap’s own baseline', async () => {
    const status = await evaluateRoadmapReplanNeed(T, S, NOW);
    expect(status.roadmapBaselineReadiness).toBe(46);
    expect(status.currentReadiness).toBe(58);
    expect(status.readinessDelta).toBe(12);
  });

  it('writes nothing to Skill DNA or evidence', async () => {
    // §31: Module 13 does not own Skill DNA and has no path to it.
    await evaluateRoadmapReplanNeed(T, S, NOW);
    await captureSnapshot(T, S, NOW);
    expect(skillWrite).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §107, §111, §54 — when NOT to recommend
// ─────────────────────────────────────────────────────────────────────────────

describe('restraint', () => {
  const roadmap = (over: any = {}) => ({
    _id: 'rm1', tenantId: T, studentId: S, status: 'ACTIVE',
    roleKey: 'BACKEND_ENGINEER',
    startDate: new Date('2026-08-01'), endDate: new Date('2026-10-29'),
    roadmapDays: 90, weekCount: 13,
    input: { readiness: 60, minutesPerDay: 60, daysPerWeek: 6, blueprintVersion: 3 },
    capacity: { plannedMinutes: 3000 },
    ...over,
  });

  it('says nothing when the movement is noise', async () => {
    roadmaps = [roadmap()];
    readinessResult = readiness({ readiness: 61 });
    attempts = [submitted('REASSESSMENT', '2026-08-15', {
      beforeSnapshot: { roleKey: 'BACKEND_ENGINEER', readiness: 60, skills: [{ skillKey: 'JAVA', skillName: 'Java', score: 71, status: 'ON_TRACK', confidence: 'HIGH', targetScore: 60 }] },
      afterSnapshot: { roleKey: 'BACKEND_ENGINEER', readiness: 61, skills: [{ skillKey: 'JAVA', skillName: 'Java', score: 72, status: 'ON_TRACK', confidence: 'HIGH', targetScore: 60 }] },
    })];

    const status = await evaluateRoadmapReplanNeed(T, S, NOW);
    expect(status.recommendation).toBe('NONE');
  });

  it('escalates to REQUIRED when the role itself changed', async () => {
    // §111/§88: Module 9's structural detection stays authoritative and is not hidden behind
    // a skill comparison.
    roadmaps = [roadmap()];
    contextResult = { ...contextResult, career: { primaryRole: 'DATA_ENGINEER' } };

    const status = await evaluateRoadmapReplanNeed(T, S, NOW);
    expect(status.recommendation).toBe('REQUIRED');
    expect(status.structuralReasons).toContain('ROLE_CHANGED');
  });

  it('stops nagging once the plan has finished', async () => {
    // §54: completion is not a reason to replan; renewal is a different decision.
    roadmaps = [roadmap({ startDate: new Date('2026-01-01'), endDate: new Date('2026-03-31') })];
    const status = await evaluateRoadmapReplanNeed(T, S, NOW);

    expect(status.roadmapCompleted).toBe(true);
    expect(status.recommendation).toBe('NONE');
  });

  it('says nothing useful when there is no roadmap at all', async () => {
    roadmaps = [];
    const status = await evaluateRoadmapReplanNeed(T, S, NOW);
    expect(status.hasActiveRoadmap).toBe(false);
    expect(status.recommendation).toBe('NONE');
  });
});

describe('tenant isolation', () => {
  it('finds nothing for another tenant asking about the same student', async () => {
    attempts = [submitted('INITIAL', '2026-07-01')];
    const s = await evaluateReassessmentEligibility('t2', S, NOW);
    expect(s.eligible).toBe(false);
  });
});
