/**
 * Regression cover for a real concurrency defect.
 *
 * completeMyDailyMission did read → mutate → save. completeMissionOnce guards against a
 * repeat by scanning an in-memory array, which is correct one request at a time and useless
 * against two: both requests loaded a document with no completion, both pushed one, and both
 * saved. The result was two completion records for one mission, XP awarded twice, and the
 * same roadmap minutes credited twice. A double-clicked button on a slow connection reaches
 * it, so it is not a theoretical race.
 *
 * The fix makes the guard and the write one conditional update. The mock below emulates the
 * part of MongoDB that matters — that an update to a single document is atomic, and that a
 * filter of `completed.key: { $ne }` therefore matches for exactly one of two racing
 * requests — so the test exercises the real rule rather than asserting the code's shape.
 */

let doc: any = null;

/** Applies the subset of update operators this service uses, atomically per call. */
function applyUpdate(target: any, update: any) {
  if (update.$push) {
    for (const [field, spec] of Object.entries<any>(update.$push)) {
      target[field] = target[field] || [];
      if (spec && typeof spec === 'object' && '$each' in spec) {
        target[field].push(...spec.$each);
        if (typeof spec.$slice === 'number' && spec.$slice < 0) {
          target[field] = target[field].slice(spec.$slice);
        }
      } else {
        target[field].push(spec);
      }
    }
  }
  if (update.$inc) for (const [f, v] of Object.entries<any>(update.$inc)) target[f] = (target[f] || 0) + v;
  if (update.$set) for (const [f, v] of Object.entries<any>(update.$set)) target[f] = v;
  if (update.$setOnInsert) { /* only meaningful on insert; handled by the caller */ }
}

const matchesFilter = (target: any, filter: any): boolean => {
  for (const [field, cond] of Object.entries<any>(filter)) {
    if (field === 'completed.key') {
      const keys = (target.completed || []).map((c: any) => c.key);
      if (cond && typeof cond === 'object' && '$ne' in cond) {
        if (keys.includes(cond.$ne)) return false;
      }
      continue;
    }
    if (String(target[field]) !== String(cond)) return false;
  }
  return true;
};

jest.mock('../models/PassportProgress', () => ({
  __esModule: true,
  default: {
    updateOne: async (filter: any, update: any, opts?: any) => {
      if (!doc) {
        if (opts?.upsert) {
          doc = {
            tenantId: filter.tenantId, studentId: filter.studentId,
            completed: [], xpLog: [], xp: 0, streak: 0, longestStreak: 0,
            ...(update.$setOnInsert || {}),
          };
          return { modifiedCount: 0, upsertedCount: 1 };
        }
        return { modifiedCount: 0 };
      }
      if (!matchesFilter(doc, filter)) return { modifiedCount: 0 };
      if (opts?.upsert && update.$setOnInsert && !update.$push) return { modifiedCount: 0 };
      applyUpdate(doc, update);
      return { modifiedCount: 1 };
    },
    findOne: (_q: any) => ({ select: () => ({ lean: async () => doc }) }),
  },
}));

/** Present only so a write would be visible. It must never be called. */
const skillProfileWrite = jest.fn();
const skillEvidenceWrite = jest.fn();

jest.mock('../models/StudentSkillProfile', () => ({
  __esModule: true,
  default: {
    updateOne: (...a: any[]) => { skillProfileWrite(...a); return Promise.resolve({}); },
    bulkWrite: (...a: any[]) => { skillProfileWrite(...a); return Promise.resolve({}); },
    create: (...a: any[]) => { skillProfileWrite(...a); return Promise.resolve({}); },
  },
}));
jest.mock('../models/StudentSkillEvidence', () => ({
  __esModule: true,
  default: {
    insertMany: (...a: any[]) => { skillEvidenceWrite(...a); return Promise.resolve([]); },
    updateOne: (...a: any[]) => { skillEvidenceWrite(...a); return Promise.resolve({}); },
    create: (...a: any[]) => { skillEvidenceWrite(...a); return Promise.resolve({}); },
  },
}));

import { completeCareerMission } from '../services/careerMissionCompletionService';
import { DEFAULT_MISSION_XP } from '../services/passportXpService';

const TENANT = 't1';
const STUDENT = 's1';
const NOW = new Date('2026-08-17T09:00:00Z');
const KEY = 'cp:rm1:1:2026-08-17';

const trace = {
  roadmapId: 'rm1', objectiveSequence: 1, skillKey: 'DSA_ARRAYS',
  workType: 'PRACTICE', minutes: 25,
};

const complete = (key = KEY, now = NOW) =>
  completeCareerMission({ tenantId: TENANT, studentId: STUDENT, day: 3, key, trace, now });

beforeEach(() => {
  doc = {
    tenantId: TENANT, studentId: STUDENT,
    completed: [], xpLog: [], xp: 0, streak: 0, longestStreak: 0,
    lastCompletedDate: undefined,
  };
  skillProfileWrite.mockReset();
  skillEvidenceWrite.mockReset();
});

describe('two requests for the same mission at the same moment', () => {
  it('produce exactly one completion', async () => {
    const [a, b] = await Promise.all([complete(), complete()]);

    expect(doc.completed.filter((c: any) => c.key === KEY)).toHaveLength(1);
    // Exactly one of them is told it was the one that counted.
    expect([a.newlyCompleted, b.newlyCompleted].filter(Boolean)).toHaveLength(1);
  });

  it('award XP exactly once', async () => {
    await Promise.all([complete(), complete()]);

    expect(doc.xp).toBe(DEFAULT_MISSION_XP);
    expect(doc.xpLog.filter((l: any) => l.source === 'mission')).toHaveLength(1);
  });

  it('credit the roadmap minutes exactly once', async () => {
    await Promise.all([complete(), complete()]);

    const credited = doc.completed
      .filter((c: any) => c.careerpilot)
      .reduce((n: number, c: any) => n + c.careerpilot.minutes, 0);
    expect(credited).toBe(trace.minutes);
  });

  it('move the streak exactly once', async () => {
    await Promise.all([complete(), complete()]);
    expect(doc.streak).toBe(1);
    expect(doc.longestStreak).toBe(1);
  });

  it('hold up under more than two racing requests', async () => {
    await Promise.all(Array.from({ length: 6 }, () => complete()));

    expect(doc.completed.filter((c: any) => c.key === KEY)).toHaveLength(1);
    expect(doc.xp).toBe(DEFAULT_MISSION_XP);
  });
});

describe('a retry after the fact', () => {
  it('is refused without awarding anything again', async () => {
    const first = await complete();
    const second = await complete();

    expect(first.newlyCompleted).toBe(true);
    expect(second.newlyCompleted).toBe(false);
    expect(doc.xp).toBe(DEFAULT_MISSION_XP);
    expect(doc.completed).toHaveLength(1);
  });

  it('still reports the student’s current totals', async () => {
    await complete();
    const second = await complete();
    expect(second.xp).toBe(DEFAULT_MISSION_XP);
    expect(second.streak).toBe(1);
  });
});

describe('different missions', () => {
  it('are recorded separately and each award once', async () => {
    await complete('cp:rm1:1:2026-08-17');
    await complete('cp:rm1:2:2026-08-17');

    expect(doc.completed).toHaveLength(2);
    expect(doc.xp).toBe(DEFAULT_MISSION_XP * 2);
  });

  it('do not bump the streak twice in one day', async () => {
    await complete('cp:rm1:1:2026-08-17');
    await complete('cp:rm1:2:2026-08-17');
    // The existing rule: a streak moves once per day, however much work is done.
    expect(doc.streak).toBe(1);
  });
});

describe('the XP amount is inherited, not invented', () => {
  it('is the same default the legacy mission path already uses', async () => {
    await complete();
    expect(doc.xp).toBe(DEFAULT_MISSION_XP);
    expect(DEFAULT_MISSION_XP).toBe(10);
  });
});

describe('traceability', () => {
  it('records the objective the work belongs to', async () => {
    await complete();
    const rec = doc.completed[0];
    expect(rec.careerpilot).toEqual(trace);
    expect(rec.key).toBe(KEY);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// The rule with the most at stake
// ─────────────────────────────────────────────────────────────────────────────

describe('completing a mission is never evidence of a skill', () => {
  it('writes nothing to the student’s skill profile', async () => {
    await complete();
    await complete();
    expect(skillProfileWrite).not.toHaveBeenCalled();
  });

  it('writes no skill evidence', async () => {
    await complete();
    expect(skillEvidenceWrite).not.toHaveBeenCalled();
  });

  it('records no score or mastery on the completion itself', async () => {
    await complete();
    for (const forbidden of ['score', 'scoreDelta', 'skillGain', 'mastery', 'confidence']) {
      expect(doc.completed[0].careerpilot).not.toHaveProperty(forbidden);
    }
  });
});
