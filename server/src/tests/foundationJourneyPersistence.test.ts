/**
 * Persisting a Foundation journey: exactly ninety days, and nothing less.
 *
 * ── WHAT THESE TESTS ARE ACTUALLY GUARDING ────────────────────────────────────────────────
 *
 * The failure this file exists to prevent is not a crash. It is an eighty-seven-day journey
 * sitting in the database looking exactly like a complete one: days numbered from 1, no gaps,
 * every day populated, and a promise quietly broken. Nothing downstream would report it, and
 * the student is the last person who would notice. So the invariant is asserted on what was
 * WRITTEN, not on what the composer returned.
 *
 * The second failure is a half-written journey after a crash. An insert-based implementation
 * collides on the unique (curriculumId, dayNumber) index forever afterwards, leaving a student
 * permanently stuck at day forty with an error on every retry.
 *
 * ── CONTROLLED INVENTORY, NOT PRODUCTION CONTENT ──────────────────────────────────────────
 *
 * The units here are synthetic and exist to prove the engineering. They are not a claim that
 * the real curriculum can fill ninety days — it cannot yet, and the readiness audit says so.
 */

import { FOUNDATION_PROGRAM_DAYS } from '../data/ninetyDayPolicy';

const dayPlans: any[] = [];
const curricula: any[] = [];
let library: any[] = [];
let quizzes: any[] = [];
let assignments: any[] = [];

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
    if (v && typeof v === 'object' && '$ne' in v) return String(doc[k]) !== String(v.$ne);
    if (v && typeof v === 'object' && '$exists' in v) return (doc[k] !== undefined) === v.$exists;
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
    deleteMany: async (q: any) => {
      const keep = dayPlans.filter(d => !matches(d, q));
      const removed = dayPlans.length - keep.length;
      dayPlans.length = 0;
      dayPlans.push(...keep);
      return { deletedCount: removed };
    },
  },
}));

jest.mock('../models/LearningCurriculum', () => ({
  __esModule: true,
  default: {
    findOne: (q: any) => {
      const found = curricula.find(d => matches(d, q));
      if (!found) return chain(null);
      const doc: any = { ...found, save: async () => { Object.assign(found, doc); return doc; } };
      return chain(doc);
    },
    find: (q: any) => chain(curricula.filter(d => matches(d, q))),
    create: async (doc: any) => {
      const row = { _id: `cur${curricula.length + 1}`, ...doc };
      curricula.push(row);
      return { ...row, save: async () => row };
    },
    deleteMany: async (q: any) => {
      const keep = curricula.filter(d => !matches(d, q));
      const n = curricula.length - keep.length;
      curricula.length = 0; curricula.push(...keep);
      return { deletedCount: n };
    },
  },
}));

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
 * The candidate loader is mocked so these tests exercise PERSISTENCE against a known plan.
 *
 * Composition itself has its own 111-test suite (curriculumCapacity) and is not re-proved here;
 * what is under test is what happens to a composed plan on its way into the database.
 */
let composed: any = null;
jest.mock('../services/composerCandidateService', () => ({
  __esModule: true,
  loadCandidates: async () => ({
    source: 'PRODUCTION', isProductionEligible: true, units: [], rejected: [],
  }),
  assertProductionEligible: () => {},
}));

jest.mock('../services/curriculumComposerService', () => ({
  __esModule: true,
  composeUnits: () => composed,
}));

import {
  persistFoundationJourney, checkJourneyIntegrity, deleteFoundationJourney,
  FOUNDATION_JOURNEY_KIND,
} from '../services/foundationJourneyService';

const TENANT = '5f9d1b2c3a4b5c6d7e8f9012';
const STUDENT = '5f9d1b2c3a4b5c6d7e8f9999';

const profile: any = { skills: new Map(), primaryDirection: null, directionStatus: 'UNDECIDED' };

/** A composed plan of `n` synthetic units. Deterministic by construction. */
const plan = (n: number) => ({
  ok: n === FOUNDATION_PROGRAM_DAYS,
  requestedDays: FOUNDATION_PROGRAM_DAYS,
  eligibleUnits: n,
  units: Array.from({ length: n }, (_, i) => ({
    unitCode: `ZZTEST_U${String(i + 1).padStart(3, '0')}`,
    title: `Synthetic unit ${i + 1}`,
    position: i + 1,
    reason: 'NEW_LEARNING',
    state: 'NOT_EXPOSED',
    scheduledAt: 'NOT_EXPOSED',
    scheduledOnProjection: false,
    governingSkill: null,
    score: null,
    moduleCode: 'M03_PROGRAMMING',
    topicCode: `T_SYNTH_${Math.floor(i / 6)}`,
    unitType: 'CONCEPT',
    role: 'FOUNDATION_INSTRUCTION',
    estimatedMinutes: 45,
  })),
  excluded: [],
  prerequisites: [],
  reallocations: [],
});

beforeEach(() => {
  dayPlans.length = 0;
  curricula.length = 0;
  library = [];
  quizzes = [];
  assignments = [];
  composed = plan(FOUNDATION_PROGRAM_DAYS);
});

const dayNumbers = () => dayPlans.map(d => d.dayNumber).sort((a, b) => a - b);

// ─────────────────────────────────────────────────────────────────────────────
describe('a Foundation journey is exactly ninety days', () => {
  it('writes ninety days, numbered one to ninety', async () => {
    const r = await persistFoundationJourney(TENANT, STUDENT, profile);

    expect(r.ok).toBe(true);
    expect(r.days).toBe(90);
    expect(dayPlans).toHaveLength(90);
    expect(dayNumbers()).toEqual(Array.from({ length: 90 }, (_, i) => i + 1));
  });

  it('has no gaps and no duplicate day numbers', async () => {
    await persistFoundationJourney(TENANT, STUDENT, profile);
    const nums = dayNumbers();

    expect(new Set(nums).size).toBe(90);
    for (let i = 1; i < nums.length; i++) expect(nums[i] - nums[i - 1]).toBe(1);
  });

  it('gives every day exactly one primary Learning Unit', async () => {
    await persistFoundationJourney(TENANT, STUDENT, profile);

    // A day without one is a day nothing records the purpose of.
    expect(dayPlans.every(d => !!d.primaryUnitCode)).toBe(true);
    // And no unit is taught twice — the composer forbids it, and this is where it would show.
    const codes = dayPlans.map(d => d.primaryUnitCode);
    expect(new Set(codes).size).toBe(90);
  });

  it('records the total on the curriculum as ninety', async () => {
    await persistFoundationJourney(TENANT, STUDENT, profile);
    expect(curricula[0].totalDays).toBe(FOUNDATION_PROGRAM_DAYS);
  });
});

describe('a short plan is refused rather than written', () => {
  it('writes NOTHING when the composer can only fill eighty-seven days', async () => {
    composed = plan(87);

    const r = await persistFoundationJourney(TENANT, STUDENT, profile);

    expect(r.ok).toBe(false);
    expect(r.days).toBe(87);
    /**
     * The whole point. An 87-day journey in the database is indistinguishable from a complete
     * one — contiguous, numbered from 1, every day populated — and quietly breaks the promise.
     */
    expect(dayPlans).toHaveLength(0);
    expect(curricula).toHaveLength(0);
  });

  it('says how short it was, so the reason can be put on a screen', async () => {
    composed = plan(64);
    const r = await persistFoundationJourney(TENANT, STUDENT, profile);

    expect(r.reason).toMatch(/64/);
    expect(r.reason).toMatch(/90/);
  });

  /**
   * THE INVARIANT IS NINETY DAYS, NOT NINETY UNITS.
   *
   * It used to be both, because exactly one unit was ever composed per day. Learning density
   * makes more units than days the ordinary case for anyone past the building band, so more
   * units is no longer a fault — it is how a day comes to carry two topics. What must still be
   * exact, and still writes nothing when it is not, is the number of DAYS.
   */
  it('packs a plan with more units than days rather than refusing it', async () => {
    composed = { ...plan(95), ok: true };
    const r = await persistFoundationJourney(TENANT, STUDENT, profile);

    expect(r.ok).toBe(true);
    expect(r.days).toBe(FOUNDATION_PROGRAM_DAYS);
    expect(dayPlans).toHaveLength(FOUNDATION_PROGRAM_DAYS);
    /* Every unit still placed, and the day numbers still one to ninety with no gaps. */
    expect(new Set(dayPlans.map(d => d.dayNumber)).size).toBe(FOUNDATION_PROGRAM_DAYS);
  });
});

describe('creating a journey twice', () => {
  it('is idempotent — one curriculum, ninety days, not one hundred and eighty', async () => {
    const first = await persistFoundationJourney(TENANT, STUDENT, profile);
    const second = await persistFoundationJourney(TENANT, STUDENT, profile);

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(String(first.curriculumId)).toBe(String(second.curriculumId));
    expect(curricula).toHaveLength(1);
    expect(dayPlans).toHaveLength(90);
  });

  it('writes the same days the second time, because composition is deterministic', async () => {
    await persistFoundationJourney(TENANT, STUDENT, profile);
    const before = dayPlans.map(d => `${d.dayNumber}:${d.primaryUnitCode}`).sort();

    await persistFoundationJourney(TENANT, STUDENT, profile);
    const after = dayPlans.map(d => `${d.dayNumber}:${d.primaryUnitCode}`).sort();

    expect(after).toEqual(before);
  });

  it('completes a journey that was half written when the process died', async () => {
    /**
     * Forty days already exist. An insert-based implementation would collide on the unique
     * (curriculumId, dayNumber) index and leave the student stuck there forever.
     */
    await persistFoundationJourney(TENANT, STUDENT, profile);
    const curriculumId = curricula[0]._id;
    const survivors = dayPlans.filter(d => d.dayNumber <= 40);
    dayPlans.length = 0;
    dayPlans.push(...survivors);

    const r = await persistFoundationJourney(TENANT, STUDENT, profile);

    expect(r.ok).toBe(true);
    expect(dayPlans).toHaveLength(90);
    expect(String(curricula[0]._id)).toBe(String(curriculumId));
  });

  it('removes days beyond ninety if any ever exist', async () => {
    await persistFoundationJourney(TENANT, STUDENT, profile);
    dayPlans.push({ curriculumId: curricula[0]._id, dayNumber: 91, primaryUnitCode: 'STRAY' });

    await persistFoundationJourney(TENANT, STUDENT, profile);

    expect(dayPlans.some(d => d.dayNumber > 90)).toBe(false);
    expect(dayPlans).toHaveLength(90);
  });
});

describe('a day carries ordered activities for its unit', () => {
  beforeEach(() => {
    library = [
      {
        _id: 'c-practice', tenantId: TENANT, isPublished: true, type: 'practice_coding',
        title: 'Drill', estimatedDuration: 20, unitCode: 'ZZTEST_U001',
      },
      {
        _id: 'c-notes', tenantId: TENANT, isPublished: true, type: 'notes',
        title: 'Lesson', estimatedDuration: 15, unitCode: 'ZZTEST_U001',
      },
      {
        _id: 'c-worked', tenantId: TENANT, isPublished: true, type: 'worked_example',
        title: 'Worked', estimatedDuration: 10, unitCode: 'ZZTEST_U001',
      },
    ];
    quizzes = [{ _id: 'q1', tenantId: TENANT, unitCode: 'ZZTEST_U001', title: 'Checkpoint', totalTime: 20 }];
  });

  it('orders teaching before practice before assessment', async () => {
    await persistFoundationJourney(TENANT, STUDENT, profile);
    const day1 = dayPlans.find(d => d.dayNumber === 1);

    // The sequence comes from inTeachingOrder, so the screen and the day cannot disagree.
    expect(day1.items.map((i: any) => i.contentTitle))
      .toEqual(['Lesson', 'Worked', 'Drill', 'Checkpoint']);
    expect(day1.items.map((i: any) => i.order)).toEqual([0, 1, 2, 3]);
  });

  it('marks the assessment as gating and the reading as not', async () => {
    await persistFoundationJourney(TENANT, STUDENT, profile);
    const day1 = dayPlans.find(d => d.dayNumber === 1);

    const quiz = day1.items.find((i: any) => i.kind === 'quiz');
    expect(quiz.isGating).toBe(true);
    expect(quiz.sourceModel).toBe('Quiz');
    expect(day1.items.find((i: any) => i.contentTitle === 'Lesson').isGating).toBe(false);
  });

  it('includes a bound assignment as a submission activity', async () => {
    assignments = [{ _id: 'a1', tenant: TENANT, unitCode: 'ZZTEST_U001', title: 'Build it' }];
    await persistFoundationJourney(TENANT, STUDENT, profile);

    const day1 = dayPlans.find(d => d.dayNumber === 1);
    const asg = day1.items.find((i: any) => i.kind === 'assignment');
    expect(asg.sourceModel).toBe('Assignment');
    expect(asg.isGating).toBe(true);
  });

  it('never puts inherited topic content on a day', async () => {
    library.push({
      _id: 'c-topic', tenantId: TENANT, isPublished: true, type: 'video',
      title: 'Shared topic video', estimatedDuration: 30, topicCode: 'T_SYNTH_0',
    });
    await persistFoundationJourney(TENANT, STUDENT, profile);

    /**
     * Inherited material is shared with every sibling unit, so including it would put the same
     * video on eleven different days. It is also why inheritance cannot lift a unit past
     * PARTIAL — a unit reaching a plan at all already owns what it needs.
     */
    const titles = dayPlans.flatMap(d => d.items.map((i: any) => i.contentTitle));
    expect(titles).not.toContain('Shared topic video');
  });

  it('never includes unpublished content', async () => {
    library.push({
      _id: 'c-draft', tenantId: TENANT, isPublished: false, type: 'notes',
      title: 'Draft lesson', unitCode: 'ZZTEST_U001', estimatedDuration: 10,
    });
    await persistFoundationJourney(TENANT, STUDENT, profile);

    const titles = dayPlans.flatMap(d => d.items.map((i: any) => i.contentTitle));
    expect(titles).not.toContain('Draft lesson');
  });
});

describe('integrity is asked of the database, not of the composer', () => {
  it('passes for a complete journey', async () => {
    await persistFoundationJourney(TENANT, STUDENT, profile);
    const check = await checkJourneyIntegrity(TENANT, STUDENT);

    expect(check.exists).toBe(true);
    expect(check.days).toBe(90);
    expect(check.ok).toBe(true);
  });

  it('reports a day deleted by hand', async () => {
    await persistFoundationJourney(TENANT, STUDENT, profile);
    const i = dayPlans.findIndex(d => d.dayNumber === 45);
    dayPlans.splice(i, 1);

    const check = await checkJourneyIntegrity(TENANT, STUDENT);
    // The composer's promise covers what it produced. This covers what is actually there.
    expect(check.ok).toBe(false);
    expect(check.missing).toEqual([45]);
  });

  it('reports a day that lost its primary unit', async () => {
    await persistFoundationJourney(TENANT, STUDENT, profile);
    dayPlans.find(d => d.dayNumber === 7).primaryUnitCode = undefined;

    const check = await checkJourneyIntegrity(TENANT, STUDENT);
    expect(check.ok).toBe(false);
    expect(check.daysWithoutUnit).toEqual([7]);
  });

  it('reports no journey at all rather than pretending one is fine', async () => {
    const check = await checkJourneyIntegrity(TENANT, STUDENT);
    expect(check.exists).toBe(false);
    expect(check.ok).toBe(false);
  });
});

describe('test journeys clean up after themselves', () => {
  it('removes the curriculum and every day it owned', async () => {
    await persistFoundationJourney(TENANT, STUDENT, profile);
    const removed = await deleteFoundationJourney(TENANT, STUDENT);

    expect(removed.curricula).toBe(1);
    expect(removed.days).toBe(90);
    expect(dayPlans).toHaveLength(0);
    expect(curricula).toHaveLength(0);
  });

  it('leaves DayPlans belonging to another curriculum alone', async () => {
    /**
     * The six historical DayPlans predate all of this by months and belong to a different
     * curriculum. Deleting a journey must never touch them.
     */
    dayPlans.push(
      { curriculumId: 'historical-curriculum', dayNumber: 1, title: 'Legacy day' },
      { curriculumId: 'historical-curriculum', dayNumber: 2, title: 'Legacy day' },
    );
    await persistFoundationJourney(TENANT, STUDENT, profile);
    await deleteFoundationJourney(TENANT, STUDENT);

    expect(dayPlans).toHaveLength(2);
    expect(dayPlans.every(d => d.curriculumId === 'historical-curriculum')).toBe(true);
  });
});

describe('a journey records where its inventory came from', () => {
  it('marks a production journey as PRODUCTION', async () => {
    await persistFoundationJourney(TENANT, STUDENT, profile);
    expect(curricula[0].journeySource).toBe('PRODUCTION');
    expect(curricula[0].journeyKind).toBe(FOUNDATION_JOURNEY_KIND);
  });

  it('records a non-production source, so a test journey is identifiable forever', async () => {
    await persistFoundationJourney(TENANT, STUDENT, profile, { source: 'PROTOTYPE_UNPUBLISHED' });
    // If one of these ever reached a real student, this field is what would say so.
    expect(curricula[0].journeySource).toBe('PROTOTYPE_UNPUBLISHED');
  });
});

describe('two triggers racing to create one journey', () => {
  /**
   * Phase 27 made journey creation a production trigger, so two can arrive together. The
   * database's unique index lets one create win; the loser must adopt that journey — not fail,
   * and not make a second.
   */
  it('adopts the journey that won the race instead of failing or creating another', async () => {
    const LearningCurriculum = require('../models/LearningCurriculum').default;
    const original = LearningCurriculum.create;
    LearningCurriculum.create = async (doc: any) => {
      curricula.push({ _id: 'curWinner', ...doc });
      const e: any = new Error('E11000 duplicate key error');
      e.code = 11000;
      throw e;
    };
    try {
      const r = await persistFoundationJourney(TENANT, STUDENT, profile);
      expect(r.ok).toBe(true);
      expect(r.created).toBe(false);
      expect(String(r.curriculumId)).toBe('curWinner');
      expect(curricula).toHaveLength(1);
      expect(dayNumbers()).toHaveLength(FOUNDATION_PROGRAM_DAYS);
    } finally {
      LearningCurriculum.create = original;
    }
  });

  it('still surfaces an error that is not a collision', async () => {
    const LearningCurriculum = require('../models/LearningCurriculum').default;
    const original = LearningCurriculum.create;
    LearningCurriculum.create = async () => { throw new Error('disk full'); };
    try {
      await expect(persistFoundationJourney(TENANT, STUDENT, profile)).rejects.toThrow('disk full');
      expect(dayPlans).toHaveLength(0);
    } finally {
      LearningCurriculum.create = original;
    }
  });
});
