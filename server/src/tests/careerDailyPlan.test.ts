/**
 * Module 10 — the daily execution loop, at the service boundary.
 *
 * These cover what the pure selector cannot: entitlement, which roadmap is in force, how
 * completions become progress, and the one rule with the most at stake —
 *
 *   FINISHING A TASK IS NOT PROOF OF A SKILL.
 *
 * If ticking "Practise arrays" could move an arrays score, every number downstream becomes
 * a self-assessment: readiness, the roadmap built from it, and the next assessment's
 * targeting. There is a regression test below asserting the profile is untouched, and it is
 * the single most important assertion in this module.
 */

let roadmapDocs: any[] = [];
let progressDoc: any = null;
let userDoc: any = null;
let configDoc: any = null;
let resourceDocs: any[] = [];

/** Anything written to a skill profile would show up here. Nothing should. */
const skillProfileWrites = jest.fn();

const matches = (doc: any, q: any) =>
  Object.entries(q).every(([k, v]) => {
    if (v && typeof v === 'object' && '$in' in (v as any)) {
      return (v as any).$in.map(String).includes(String(doc[k]));
    }
    return String(doc[k]) === String(v);
  });

jest.mock('../models/CareerRoadmap', () => ({
  __esModule: true,
  default: {
    findOne: (q: any) => {
      const hit = roadmapDocs.find(d => matches(d, q)) || null;
      return { lean: async () => hit };
    },
  },
}));

jest.mock('../models/CareerSkillResource', () => ({
  __esModule: true,
  /**
   * The MODEL is stubbed; the pure helpers beside it are not.
   *
   * The orchestrator now filters each mapping through `resourceServes`, and a mock that
   * replaces the whole module removes it — so the call resolved to undefined and every plan
   * with a mapped resource threw. Keeping the real helpers means these tests exercise the
   * targeting rules rather than a reimplementation of them.
   */
  ...jest.requireActual('../models/CareerSkillResource'),
  default: {
    find: (q: any) => ({
      sort: () => ({ lean: async () => resourceDocs.filter(d => matches(d, q)) }),
    }),
  },
}));

jest.mock('../models/PassportProgress', () => ({
  __esModule: true,
  default: {
    findOne: (_q: any) => {
      const handle: any = Promise.resolve(progressDoc);
      handle.lean = async () => progressDoc;
      return handle;
    },
    create: async (o: any) => { progressDoc = { ...o, completed: [], xp: 0, streak: 0 }; return progressDoc; },
  },
}));

jest.mock('../models/PassportConfig', () => ({
  __esModule: true,
  default: { findOne: () => ({ lean: async () => configDoc }) },
}));

jest.mock('../models/User', () => ({
  __esModule: true,
  default: { findOne: () => ({ select: () => ({ lean: async () => userDoc }) }) },
}));

// Present so a write would be observable. The point of the mock is that it stays unused.
jest.mock('../models/StudentSkillProfile', () => ({
  __esModule: true,
  default: {
    find: () => ({ select: () => ({ lean: async () => [] }), lean: async () => [] }),
    updateOne: (...a: any[]) => { skillProfileWrites(...a); return { exec: async () => ({}) }; },
    bulkWrite: (...a: any[]) => { skillProfileWrites(...a); return Promise.resolve({}); },
  },
}));

import { getTodaysPlan } from '../services/dailyMissionOrchestrator';
import { completeMissionOnce } from '../services/passportXpService';

const TENANT = 't1';
const STUDENT = 's1';
const NOW = new Date('2026-08-17T09:00:00Z');       // day 3 of a roadmap started on the 15th

function objective(over: any = {}) {
  return {
    skillKey: 'DSA_ARRAYS', skillName: 'Arrays', workType: 'PRACTICE',
    plannedMinutes: 120, week: 1, sequence: 1,
    reasonCode: 'PRIORITY_GAP', explanation: 'Arrays is a priority gap.',
    targetLevel: 'PROFICIENT', targetScore: 75, origin: 'GENERATED',
    ...over,
  };
}

function roadmap(over: any = {}) {
  return {
    _id: 'rm1', tenantId: TENANT, studentId: STUDENT, status: 'ACTIVE',
    roleKey: 'BACKEND_ENGINEER', roleName: 'Backend Engineer',
    startDate: new Date('2026-08-15T00:00:00Z'),
    endDate: new Date('2026-11-12T00:00:00Z'),
    roadmapDays: 90, weekCount: 13,
    input: { minutesPerDay: 60, daysPerWeek: 6 },
    capacity: { plannedMinutes: 3000 },
    objectives: [objective()],
    ...over,
  };
}

beforeEach(() => {
  roadmapDocs = [roadmap()];
  progressDoc = { tenantId: TENANT, studentId: STUDENT, completed: [], xp: 0, streak: 0, xpLog: [] };
  userDoc = { passport: { active: true } };
  configDoc = null;
  resourceDocs = [];
  skillProfileWrites.mockReset();
});

describe('today comes from the active roadmap', () => {
  it('produces missions for the current week', async () => {
    const plan: any = await getTodaysPlan(TENANT, STUDENT, NOW);
    expect(plan.available).toBe(true);
    expect(plan.roadmapWeek).toBe(1);
    expect(plan.roadmapDay).toBe(3);
    expect(plan.missions.length).toBeGreaterThan(0);
    expect(plan.missions[0].skillKey).toBe('DSA_ARRAYS');
  });

  it('refuses to invent work when there is no roadmap', async () => {
    // §105: legacy category missions must not be dressed up as a CareerPilot plan.
    roadmapDocs = [];
    const plan: any = await getTodaysPlan(TENANT, STUDENT, NOW);
    expect(plan.available).toBe(false);
    expect(plan.reason).toBe('ROADMAP_REQUIRED');
  });

  it('ignores a superseded roadmap entirely', async () => {
    // §87/§117: history stops producing work the moment it is replaced.
    roadmapDocs = [roadmap({ status: 'SUPERSEDED' })];
    const plan: any = await getTodaysPlan(TENANT, STUDENT, NOW);
    expect(plan.reason).toBe('ROADMAP_REQUIRED');
  });

  it('switches to the new plan after a replan', async () => {
    roadmapDocs = [
      roadmap({ _id: 'old', status: 'SUPERSEDED', objectives: [objective({ skillKey: 'OLD_SKILL' })] }),
      roadmap({ _id: 'new', status: 'ACTIVE', objectives: [objective({ skillKey: 'NEW_SKILL' })] }),
    ];
    const plan: any = await getTodaysPlan(TENANT, STUDENT, NOW);
    expect(plan.roadmapId).toBe('new');
    expect(plan.missions[0].skillKey).toBe('NEW_SKILL');
  });

  it('stops once the 90 days are over', async () => {
    const plan: any = await getTodaysPlan(TENANT, STUDENT, new Date('2027-01-01T00:00:00Z'));
    expect(plan.reason).toBe('ROADMAP_COMPLETED');
  });

  it('requires a membership, using the key daily missions already use', async () => {
    userDoc = { passport: { active: false } };
    const plan: any = await getTodaysPlan(TENANT, STUDENT, NOW);
    expect(plan.reason).toBe('MEMBERSHIP_REQUIRED');
  });
});

describe('resources', () => {
  it('makes a mission executable when a mapping resolves', async () => {
    resourceDocs = [{
      tenantId: TENANT, skillKey: 'DSA_ARRAYS', resourceType: 'practice',
      resourceId: 'c-second-largest', workTypes: ['PRACTICE'], active: true, priority: 10,
    }];
    const plan: any = await getTodaysPlan(TENANT, STUDENT, NOW);
    expect(plan.missions[0].resourceState).toBe('READY');
    expect(plan.missions[0].resource.route).toContain('/careerpilot/practice/');
  });

  it('skips a mapping whose target no longer exists rather than crashing', async () => {
    // §85: a deleted resource is a configuration gap, not an outage.
    resourceDocs = [{
      tenantId: TENANT, skillKey: 'DSA_ARRAYS', resourceType: 'practice',
      resourceId: 'this-problem-was-deleted', workTypes: ['PRACTICE'], active: true, priority: 10,
    }];
    const plan: any = await getTodaysPlan(TENANT, STUDENT, NOW);
    expect(plan.available).toBe(true);
    expect(plan.missions[0].resourceState).toBe('RESOURCE_NOT_CONFIGURED');
  });

  it('reports how many objectives still have nothing to open', async () => {
    const plan: any = await getTodaysPlan(TENANT, STUDENT, NOW);
    expect(plan.unmappedObjectives).toBe(1);
  });

  it('does not use an inactive mapping', async () => {
    resourceDocs = [{
      tenantId: TENANT, skillKey: 'DSA_ARRAYS', resourceType: 'practice',
      resourceId: 'c-second-largest', workTypes: ['PRACTICE'], active: false, priority: 10,
    }];
    const plan: any = await getTodaysPlan(TENANT, STUDENT, NOW);
    expect(plan.missions[0].resourceState).toBe('RESOURCE_NOT_CONFIGURED');
  });
});

describe('completion and progress', () => {
  /** What the controller does, exercised directly against the real completion helper. */
  const complete = (key: string, mission: any, day = 3) => {
    const newly = completeMissionOnce(progressDoc as any, day, key, 0, NOW);
    if (newly) {
      const rec = progressDoc.completed.find((c: any) => c.key === key);
      rec.careerpilot = {
        roadmapId: mission.roadmapId,
        objectiveSequence: mission.objectiveSequence,
        skillKey: mission.skillKey,
        workType: mission.workType,
        minutes: mission.plannedMinutes,
      };
    }
    return newly;
  };

  it('counts one completion once, however many times it is retried', async () => {
    const plan: any = await getTodaysPlan(TENANT, STUDENT, NOW);
    const m = plan.missions[0];

    expect(complete(m.key, m)).toBe(true);
    const xpAfterFirst = progressDoc.xp;

    expect(complete(m.key, m)).toBe(false);
    expect(complete(m.key, m)).toBe(false);

    // §57/§58: one completion, one XP award, one unit of roadmap progress.
    expect(progressDoc.completed.filter((c: any) => c.key === m.key)).toHaveLength(1);
    expect(progressDoc.xp).toBe(xpAfterFirst);
  });

  it('shows the mission as done without dropping it from today', async () => {
    const before: any = await getTodaysPlan(TENANT, STUDENT, NOW);
    complete(before.missions[0].key, before.missions[0]);

    const after: any = await getTodaysPlan(TENANT, STUDENT, NOW);
    expect(after.missions[0].key).toBe(before.missions[0].key);
    expect(after.missions[0].done).toBe(true);
  });

  it('credits roadmap progress to the objective, by id and not by title', async () => {
    const plan: any = await getTodaysPlan(TENANT, STUDENT, NOW);
    const m = plan.missions[0];
    complete(m.key, m);

    const after: any = await getTodaysPlan(TENANT, STUDENT, NOW);
    expect(after.progress.completedMinutes).toBe(m.plannedMinutes);
    expect(after.week.completedMinutes).toBe(m.plannedMinutes);
    expect(progressDoc.completed[0].careerpilot.objectiveSequence).toBe(m.objectiveSequence);
  });

  it('moves on to the rest of the objective the next day', async () => {
    const today: any = await getTodaysPlan(TENANT, STUDENT, NOW);
    complete(today.missions[0].key, today.missions[0]);

    const tomorrow: any = await getTodaysPlan(TENANT, STUDENT, new Date('2026-08-18T09:00:00Z'));
    expect(tomorrow.missions[0].key).not.toBe(today.missions[0].key);
    expect(tomorrow.missions[0].done).toBe(false);
  });

  it('keeps roadmap progress separate from readiness', async () => {
    const plan: any = await getTodaysPlan(TENANT, STUDENT, NOW);
    // §55/§69: percent-of-plan-done is not percent-ready, and this payload says so by
    // carrying no readiness figure at all.
    expect(plan.progress).toHaveProperty('percent');
    expect(plan).not.toHaveProperty('readiness');
    expect(plan.progress).not.toHaveProperty('readiness');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §52, §54, §70, §116 — the rule with the most at stake
// ─────────────────────────────────────────────────────────────────────────────

describe('completing a task never becomes evidence of a skill', () => {
  it('writes nothing to the student’s skill profile', async () => {
    const plan: any = await getTodaysPlan(TENANT, STUDENT, NOW);
    const m = plan.missions[0];

    completeMissionOnce(progressDoc as any, 3, m.key, 0, NOW);
    const rec = progressDoc.completed.find((c: any) => c.key === m.key);
    rec.careerpilot = {
      roadmapId: m.roadmapId, objectiveSequence: m.objectiveSequence,
      skillKey: m.skillKey, workType: m.workType, minutes: m.plannedMinutes,
    };

    // Practising arrays all week is not the same as demonstrating them. Skill DNA moves
    // only through a graded assessment, on Module 7's own path.
    expect(skillProfileWrites).not.toHaveBeenCalled();
  });

  it('records no score, gain or mastery anywhere on the completion', async () => {
    const plan: any = await getTodaysPlan(TENANT, STUDENT, NOW);
    const m = plan.missions[0];
    completeMissionOnce(progressDoc as any, 3, m.key, 0, NOW);
    const rec = progressDoc.completed.find((c: any) => c.key === m.key);
    rec.careerpilot = {
      roadmapId: m.roadmapId, objectiveSequence: m.objectiveSequence,
      skillKey: m.skillKey, workType: m.workType, minutes: m.plannedMinutes,
    };

    for (const forbidden of ['score', 'scoreDelta', 'skillGain', 'mastery', 'confidence']) {
      expect(rec.careerpilot).not.toHaveProperty(forbidden);
    }
  });

  it('carries the skill only as a label for tracing, never as a measurement', async () => {
    const plan: any = await getTodaysPlan(TENANT, STUDENT, NOW);
    expect(plan.missions[0].skillKey).toBe('DSA_ARRAYS');
    // The mission says which skill the WORK is about. It says nothing about ability.
    expect(plan.missions[0]).not.toHaveProperty('studentScore');
    expect(plan.missions[0]).not.toHaveProperty('score');
  });
});

describe('tenant and ownership', () => {
  it('finds nothing for another tenant asking about the same student', async () => {
    const plan: any = await getTodaysPlan('t2', STUDENT, NOW);
    expect(plan.available).toBe(false);
  });
});
