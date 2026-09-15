/**
 * Continuous personalisation, and the history it is not allowed to touch.
 *
 * ── THE FAILURE THIS FILE EXISTS TO PREVENT ───────────────────────────────────────────────
 *
 * A student finishes twenty days, takes a checkpoint, improves — and the plan helpfully
 * rewrites itself from day one. Their completed record now describes days they never did.
 * Worse and quieter: they are half-way through day 21 when the unit under them changes, and
 * the work they had open belongs to a lesson that is no longer there.
 *
 * So the boundary is asserted from both sides: completed and current days keep their units
 * exactly, and future days are free to change. A day is frozen by POSITION — completed day 12
 * stays day 12 with the unit it had, whatever the new composition would prefer.
 *
 * ── AND NINETY SURVIVES ───────────────────────────────────────────────────────────────────
 *
 * Improving does not shorten the programme and struggling does not extend it. Every test that
 * recomposes checks the day count afterwards.
 */

import { FOUNDATION_PROGRAM_DAYS } from '../data/ninetyDayPolicy';

const dayPlans: any[] = [];
const curricula: any[] = [];
const enrollments: any[] = [];

const chain = (value: any): any => {
  const p: any = Promise.resolve(value);
  p.select = () => chain(value);
  p.sort = () => chain(value);
  p.limit = () => chain(value);
  p.lean = async () => value;
  return p;
};

const matches = (doc: any, q: any): boolean =>
  Object.entries(q).every(([k, v]: [string, any]) => {
    if (v && typeof v === 'object' && '$in' in v) {
      return (v.$in as any[]).map(String).includes(String(doc[k]));
    }
    if (v && typeof v === 'object' && '$gt' in v) return Number(doc[k]) > Number(v.$gt);
    if (v === null || v === undefined) return doc[k] === null || doc[k] === undefined;
    return String(doc[k]) === String(v);
  });

jest.mock('../models/DayPlan', () => ({
  __esModule: true,
  default: {
    find: (q: any) => chain(dayPlans.filter(d => matches(d, q))),
    bulkWrite: async (ops: any[]) => {
      for (const op of ops) {
        const { filter, update, upsert } = op.updateOne;
        let row = dayPlans.find(d => matches(d, filter));
        if (!row) {
          if (!upsert) continue;
          row = { ...(update.$setOnInsert || {}) };
          dayPlans.push(row);
        }
        Object.assign(row, update.$set || {});
      }
      return { modifiedCount: ops.length };
    },
    deleteMany: async () => ({ deletedCount: 0 }),
  },
}));

jest.mock('../models/LearningCurriculum', () => ({
  __esModule: true,
  default: {
    findOne: (q: any) => chain(curricula.find(d => matches(d, q)) || null),
    find: (q: any) => chain(curricula.filter(d => matches(d, q))),
    create: async (doc: any) => {
      const row = { _id: `cur${curricula.length + 1}`, ...doc };
      curricula.push(row);
      return { ...row, save: async () => row };
    },
  },
}));

jest.mock('../models/CurriculumEnrollment', () => ({
  __esModule: true,
  default: { findOne: (q: any) => chain(enrollments.find(d => matches(d, q)) || null) },
}));

/**
 * The unit content the journey resolver reads. Real rows in memory, so the activity bundle a
 * recomposed day receives is built by the actual resolver rather than asserted against a stub.
 */
const library: any[] = [];
const quizzes: any[] = [];
const assignments: any[] = [];

jest.mock('../models/LearningContentLibrary', () => ({
  __esModule: true,
  default: { find: (q: any) => chain(library.filter(d => matches(d, q))) },
}));
jest.mock('../models/Quiz', () => ({
  __esModule: true,
  default: { find: (q: any) => chain(quizzes.filter(d => matches(d, q))) },
}));
jest.mock('../models/Assignment', () => ({
  __esModule: true,
  default: { find: (q: any) => chain(assignments.filter(d => matches(d, q))) },
}));

/**
 * The composition the "new evidence" produces. Swapped per test.
 *
 * ONLY composition is replaced. loadAssets and activitiesFor are the journey service's own, which
 * is the point: a recomposed day must be built exactly as a freshly persisted one is.
 */
let nextComposition: any = null;
jest.mock('../services/foundationJourneyService', () => {
  const actual = jest.requireActual('../services/foundationJourneyService');
  return {
    __esModule: true,
    ...actual,
    composeFoundationJourney: async () => ({ candidates: 300, composition: nextComposition }),
  };
});

import {
  recomposeFutureDays, previewRecomposition, frozenDayNumbers,
} from '../services/foundationRecompositionService';

const TENANT = '5f9d1b2c3a4b5c6d7e8f9012';
const STUDENT = '5f9d1b2c3a4b5c6d7e8f9999';
const CURRICULUM = 'cur1';

const profile: any = { skills: new Map(), primaryDirection: null, directionStatus: 'UNDECIDED' };

/** A composition whose units are named from a prefix, so a rewrite is visible at a glance. */
const compositionOf = (prefix: string, n = FOUNDATION_PROGRAM_DAYS) => ({
  ok: true,
  units: Array.from({ length: n }, (_, i) => ({
    unitCode: `${prefix}_${String(i + 1).padStart(3, '0')}`,
    title: `${prefix} unit ${i + 1}`,
    topicCode: `T_${prefix}`,
    unitType: 'CONCEPT',
    role: 'FOUNDATION_INSTRUCTION',
  })),
});

const seedJourney = (prefix = 'OLD') => {
  curricula.push({
    _id: CURRICULUM, tenantId: TENANT, personalizedFor: STUDENT,
    adaptiveStage: 'foundation', journeyKind: 'FOUNDATION_UNIT_JOURNEY_V1',
  });
  for (let d = 1; d <= FOUNDATION_PROGRAM_DAYS; d++) {
    dayPlans.push({
      curriculumId: CURRICULUM, tenantId: TENANT, dayNumber: d,
      primaryUnitCode: `${prefix}_${String(d).padStart(3, '0')}`,
      title: `${prefix} unit ${d}`, items: [{ contentTitle: 'existing' }],
    });
  }
};

const enroll = (completedDays: number[], currentDay: number) => {
  enrollments.push({ tenantId: TENANT, curriculumId: CURRICULUM, studentId: STUDENT, completedDays, currentDay });
};

const dayUnit = (n: number) => dayPlans.find(d => d.dayNumber === n)?.primaryUnitCode;

beforeEach(() => {
  dayPlans.length = 0;
  curricula.length = 0;
  enrollments.length = 0;
  library.length = 0;
  quizzes.length = 0;
  assignments.length = 0;
  nextComposition = compositionOf('NEW');
});

// ─────────────────────────────────────────────────────────────────────────────
describe('a rewritten day is a whole day', () => {
  /**
   * Phase 21 found recomposition changing a day's unit and writing `items: []`, with nothing ever
   * rebuilding them. A recomposed project day then offered nothing to submit — and because an
   * Assignment is delivered through its journey day, a DRAFT assignment with no day item is one the
   * delivery rules no longer open at all.
   */
  const composed = (over: any) => ({ title: over.unitCode, topicCode: 'T_NEW', role: 'INTEGRATION', ...over });

  beforeEach(() => {
    seedJourney('OLD');
    enroll([1, 2, 3], 4);
    library.push(
      { _id: 'proj-notes', tenantId: TENANT, isPublished: true, unitCode: 'NEW_PROJECT', type: 'notes', title: 'The brief' },
      { _id: 'check-notes', tenantId: TENANT, isPublished: true, unitCode: 'NEW_CHECK', type: 'notes', title: 'What it measures' },
      { _id: 'prac-notes', tenantId: TENANT, isPublished: true, unitCode: 'NEW_PRACTICE', type: 'practice_theory', title: 'Practice' },
      // Topic-level material with no unitCode. Shared by every sibling; must never reach a day.
      { _id: 'topic-video', tenantId: TENANT, isPublished: true, topicCode: 'T_NEW', type: 'video', title: 'Inherited video' },
      // Unpublished own content resolves for nothing.
      { _id: 'draft-notes', tenantId: TENANT, isPublished: false, unitCode: 'NEW_PROJECT', type: 'worked_example', title: 'Draft' },
    );
    assignments.push({ _id: 'assign-1', tenant: TENANT, unitCode: 'NEW_PROJECT', title: 'Build it' });
    quizzes.push({ _id: 'quiz-1', tenantId: TENANT, unitCode: 'NEW_CHECK', title: 'Checkpoint', totalTime: 20 });
    nextComposition = {
      ok: true,
      units: [
        composed({ unitCode: 'NEW_PROJECT', unitType: 'PROJECT' }),
        composed({ unitCode: 'NEW_CHECK', unitType: 'CHECKPOINT', role: 'VERIFICATION' }),
        composed({ unitCode: 'NEW_PRACTICE', unitType: 'PRACTICE', role: 'PRACTICE' }),
        ...compositionOf('NEW').units,
      ],
    };
  });

  const day = (n: number) => dayPlans.find(d => d.dayNumber === n);

  it('a recomposed PROJECT keeps its Assignment, gating and last', async () => {
    const r = await recomposeFutureDays(TENANT, STUDENT, profile);
    expect(r.ok).toBe(true);

    const d = day(5);
    expect(d.primaryUnitCode).toBe('NEW_PROJECT');
    const last = d.items[d.items.length - 1];
    expect(last).toMatchObject({ kind: 'assignment', sourceModel: 'Assignment', sourceId: 'assign-1', isGating: true, required: true });
    expect(d.items.filter((i: any) => i.kind === 'content').map((i: any) => i.contentId)).toEqual(['proj-notes']);
  });

  it('a recomposed CHECKPOINT keeps its Quiz, gating and last', async () => {
    await recomposeFutureDays(TENANT, STUDENT, profile);

    const d = day(6);
    expect(d.primaryUnitCode).toBe('NEW_CHECK');
    const last = d.items[d.items.length - 1];
    expect(last).toMatchObject({ kind: 'quiz', sourceModel: 'Quiz', sourceId: 'quiz-1', isGating: true });
    expect(d.items.slice(0, -1).every((i: any) => !i.isGating)).toBe(true);
  });

  it('a recomposed PRACTICE day carries its own practice', async () => {
    await recomposeFutureDays(TENANT, STUDENT, profile);
    expect(day(7).items.map((i: any) => i.contentId)).toEqual(['prac-notes']);
  });

  it('never includes inherited topic content or unpublished rows', async () => {
    await recomposeFutureDays(TENANT, STUDENT, profile);
    const all = dayPlans.flatMap(d => d.items || []).map((i: any) => i.contentId);
    expect(all).not.toContain('topic-video');
    expect(all).not.toContain('draft-notes');
  });

  it('builds the same activities on a retry', async () => {
    await recomposeFutureDays(TENANT, STUDENT, profile);
    const first = JSON.stringify(dayPlans.filter(d => d.dayNumber > 4).map(d => [d.dayNumber, d.primaryUnitCode, d.items]));
    await recomposeFutureDays(TENANT, STUDENT, profile);
    const second = JSON.stringify(dayPlans.filter(d => d.dayNumber > 4).map(d => [d.dayNumber, d.primaryUnitCode, d.items]));
    expect(second).toBe(first);
    expect(dayPlans).toHaveLength(FOUNDATION_PROGRAM_DAYS);
  });

  it('repairs an unchanged future day that was left with no activities', async () => {
    Object.assign(day(5), { primaryUnitCode: 'NEW_PROJECT', items: [] });

    const r = await recomposeFutureDays(TENANT, STUDENT, profile);

    expect(r.unchangedFutureDays).toContain(5);
    expect(r.rewrittenDays).not.toContain(5);
    expect(day(5).items.some((i: any) => i.kind === 'assignment' && i.isGating)).toBe(true);
  });

  it('leaves frozen days, and their activities, exactly as they were', async () => {
    await recomposeFutureDays(TENANT, STUDENT, profile);
    for (const n of [1, 2, 3, 4]) {
      expect(day(n).primaryUnitCode).toBe(`OLD_${String(n).padStart(3, '0')}`);
      expect(day(n).items).toEqual([{ contentTitle: 'existing' }]);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('which days are frozen', () => {
  it('freezes every completed day and the one in progress', () => {
    expect(frozenDayNumbers({ completedDays: [1, 2, 3], currentDay: 4 })).toEqual([1, 2, 3, 4]);
  });

  it('freezes the current day even when it is not yet completed', () => {
    // The day somebody has OPEN is exactly the one a rewrite would damage most.
    expect(frozenDayNumbers({ completedDays: [], currentDay: 1 })).toEqual([1]);
  });

  it('ignores a day number outside the programme', () => {
    expect(frozenDayNumbers({ completedDays: [0, 91, 5], currentDay: 200 })).toEqual([5]);
  });

  it('handles a student who has not started', () => {
    expect(frozenDayNumbers({})).toEqual([]);
  });
});

describe('completed days are never rewritten', () => {
  beforeEach(() => { seedJourney('OLD'); enroll([1, 2, 3, 4, 5], 6); });

  it('leaves every completed day exactly as it was', async () => {
    const r = await recomposeFutureDays(TENANT, STUDENT, profile);

    expect(r.ok).toBe(true);
    for (const d of [1, 2, 3, 4, 5]) {
      expect(dayUnit(d)).toBe(`OLD_${String(d).padStart(3, '0')}`);
    }
  });

  it('leaves the in-progress day alone', async () => {
    await recomposeFutureDays(TENANT, STUDENT, profile);
    // Swapping the unit under somebody mid-session loses their place and their work.
    expect(dayUnit(6)).toBe('OLD_006');
  });

  it('does not touch a completed day even when the new plan wants that unit elsewhere', async () => {
    await recomposeFutureDays(TENANT, STUDENT, profile);
    // Frozen by POSITION, not by content.
    expect(dayUnit(3)).toBe('OLD_003');
    expect(dayUnit(3)).not.toMatch(/^NEW_/);
  });

  it('reports exactly which days were frozen and which were rewritten', async () => {
    const r = await recomposeFutureDays(TENANT, STUDENT, profile);

    expect(r.frozenDays).toEqual([1, 2, 3, 4, 5, 6]);
    expect(r.rewrittenDays).not.toContain(6);
    expect(r.rewrittenDays.every(d => d > 6)).toBe(true);
  });

  it('leaves the completed day items untouched too, not merely its unit', async () => {
    await recomposeFutureDays(TENANT, STUDENT, profile);
    expect(dayPlans.find(d => d.dayNumber === 2).items).toEqual([{ contentTitle: 'existing' }]);
  });
});

describe('future days are recomposed', () => {
  beforeEach(() => { seedJourney('OLD'); enroll([1, 2, 3], 4); });

  it('rewrites every day the student has not reached', async () => {
    const r = await recomposeFutureDays(TENANT, STUDENT, profile);

    expect(r.rewrittenDays).toHaveLength(FOUNDATION_PROGRAM_DAYS - 4);
    expect(dayUnit(5)).toMatch(/^NEW_/);
    expect(dayUnit(90)).toMatch(/^NEW_/);
  });

  it('never schedules a unit the student was already taught', async () => {
    /**
     * The new composition happens to contain the unit taught on day 2. Without the
     * already-taught filter it would be handed out a second time on a future day.
     */
    nextComposition = {
      ok: true,
      units: [
        { unitCode: 'OLD_002', title: 'Repeat', topicCode: 'T', unitType: 'CONCEPT', role: 'FOUNDATION_INSTRUCTION' },
        ...compositionOf('NEW').units,
      ],
    };

    await recomposeFutureDays(TENANT, STUDENT, profile);

    const futureUnits = dayPlans.filter(d => d.dayNumber > 4).map(d => d.primaryUnitCode);
    expect(futureUnits).not.toContain('OLD_002');
  });

  it('keeps the plan exactly ninety days', async () => {
    await recomposeFutureDays(TENANT, STUDENT, profile);

    // Improving does not shorten the programme; struggling does not extend it.
    expect(dayPlans).toHaveLength(FOUNDATION_PROGRAM_DAYS);
    expect(new Set(dayPlans.map(d => d.dayNumber)).size).toBe(FOUNDATION_PROGRAM_DAYS);
  });

  it('reports an unchanged future day as unchanged rather than as a rewrite', async () => {
    nextComposition = compositionOf('OLD');
    // Every future slot resolves to the unit already there once the taught ones are filtered.
    const r = await recomposeFutureDays(TENANT, STUDENT, profile);

    expect(r.ok).toBe(true);
    expect(r.rewrittenDays.length).toBeLessThan(r.unchangedFutureDays.length + r.rewrittenDays.length);
  });
});

describe('the four things that trigger a recomposition', () => {
  beforeEach(() => { seedJourney('OLD'); enroll([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 11); });

  const scenarios: [string, string][] = [
    ['improvement — a skill moves up a band', 'IMPROVED'],
    ['struggle — remediation is needed', 'REMEDIAL'],
    ['a newly verified skill', 'VERIFIED'],
    ['direction refinement', 'DIRECTED'],
  ];

  it.each(scenarios)('%s changes future days only', async (_label, prefix) => {
    nextComposition = compositionOf(prefix);
    const r = await recomposeFutureDays(TENANT, STUDENT, profile);

    expect(r.ok).toBe(true);
    // Past untouched...
    for (let d = 1; d <= 11; d++) expect(dayUnit(d)).toMatch(/^OLD_/);
    // ...future responds.
    expect(dayUnit(12)).toMatch(new RegExp(`^${prefix}_`));
    expect(dayPlans).toHaveLength(FOUNDATION_PROGRAM_DAYS);
  });
});

describe('recomposition refuses rather than half-writing', () => {
  it('leaves the plan untouched when the new composition is too short', async () => {
    seedJourney('OLD');
    enroll([1, 2], 3);
    nextComposition = compositionOf('NEW', 20);

    const r = await recomposeFutureDays(TENANT, STUDENT, profile);

    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/still ninety days/);
    /**
     * A partially rewritten journey with a hole in it is worse than a slightly stale one, and
     * the student is the one who would find it.
     */
    expect(dayPlans.every(d => String(d.primaryUnitCode).startsWith('OLD_'))).toBe(true);
    expect(dayPlans).toHaveLength(FOUNDATION_PROGRAM_DAYS);
  });

  it('refuses to recompose a journey that is not already ninety days', async () => {
    seedJourney('OLD');
    dayPlans.splice(dayPlans.findIndex(d => d.dayNumber === 50), 1);
    enroll([1], 2);

    const r = await recomposeFutureDays(TENANT, STUDENT, profile);

    // Repair is checkJourneyIntegrity and persistFoundationJourney's job, not this one's.
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/89 days/);
  });

  it('reports plainly when the student has no journey', async () => {
    const r = await recomposeFutureDays(TENANT, STUDENT, profile);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/no Foundation journey/);
  });

  it('does nothing when every day is frozen', async () => {
    seedJourney('OLD');
    enroll(Array.from({ length: 90 }, (_, i) => i + 1), 90);

    const r = await recomposeFutureDays(TENANT, STUDENT, profile);

    expect(r.ok).toBe(true);
    expect(r.rewrittenDays).toEqual([]);
    expect(dayPlans.every(d => String(d.primaryUnitCode).startsWith('OLD_'))).toBe(true);
  });
});

describe('a student who has not started yet', () => {
  it('has every day recomposed, because none has been seen', async () => {
    seedJourney('OLD');
    enroll([], 0);

    const r = await recomposeFutureDays(TENANT, STUDENT, profile);

    expect(r.frozenDays).toEqual([]);
    expect(r.rewrittenDays).toHaveLength(FOUNDATION_PROGRAM_DAYS);
    expect(dayUnit(1)).toBe('NEW_001');
  });
});

describe('previewing a recomposition writes nothing', () => {
  beforeEach(() => { seedJourney('OLD'); enroll([1, 2, 3], 4); });

  it('reports which days would change without changing them', async () => {
    const p = await previewRecomposition(TENANT, STUDENT, profile);

    expect(p.wouldChange.length).toBeGreaterThan(0);
    expect(p.frozenDays).toEqual([1, 2, 3, 4]);
    // Lets a screen say "your plan has been updated" truthfully, and a job skip students
    // whose plan the new evidence does not actually move.
    expect(dayPlans.every(d => String(d.primaryUnitCode).startsWith('OLD_'))).toBe(true);
  });

  it('never proposes changing a frozen day', async () => {
    const p = await previewRecomposition(TENANT, STUDENT, profile);
    expect(p.wouldChange.some(d => d <= 4)).toBe(false);
  });
});

describe('recomposition reads evidence and never writes it', () => {
  it('touches no skill profile, score or evidence record', async () => {
    seedJourney('OLD');
    enroll([1, 2, 3], 4);

    /**
     * Guarded structurally rather than by assertion: the service imports no evidence model, so
     * there is no path by which `scheduledAt` — the state a unit was SCHEDULED at, which may
     * have come from the plan's own teaching — could travel back into what the platform
     * believes about a student. Teaching somebody loops on day 20 is not evidence they can
     * write one.
     */
    const source = require('fs').readFileSync(
      require('path').join(__dirname, '..', 'services', 'foundationRecompositionService.ts'), 'utf8',
    );

    expect(source).not.toMatch(/from '\.\.\/models\/SkillEvidence'/);
    expect(source).not.toMatch(/from '\.\.\/models\/StudentSkillProfile'/);
    expect(source).not.toMatch(/recordEvidence|projectAssessmentToSkillDna|recomputeStudentSkills/);
  });
});
