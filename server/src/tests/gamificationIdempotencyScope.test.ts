/**
 * Regression: XP idempotency is scoped to the STUDENT, not the tenant.
 *
 * The ledger's unique index was `(tenantId, idempotencyKey)`, which made one logical event
 * mutually exclusive across everybody in a tenant — the first student to earn something
 * locked every other student out of it permanently.
 *
 * It survived review because the two shipped events happen to carry ids that are ALREADY
 * unique per student: a roadmap-scoped mission key and an assessment attempt id. Every
 * existing test used one student, so the whole suite passed against a broken contract.
 *
 * `STREAK_MILESTONE:streak:7` is where it showed: the same string for every student alive,
 * so the first person in a tenant to reach seven days took the only bonus that tenant would
 * ever pay. Any event keyed on a SHARED resource — a quiz, a coding problem, a video —
 * would have failed identically, and those are most of the events still to come.
 *
 * The fix is in the index, not the key. The key still describes the event.
 */

let progresses: any[] = [];
let ledger: any[] = [];
let badgeDefs: any[] = [];
let studentBadges: any[] = [];

const skillProfileWrite = jest.fn();
const skillEvidenceWrite = jest.fn();
const coinWrite = jest.fn();

const matches = (doc: any, q: any): boolean =>
  Object.entries(q).every(([k, cond]: [string, any]) => {
    const value = k === 'studentId' ? String(doc.studentId) : doc[k];
    if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
      if ('$ne' in cond) return String(value) !== String(cond.$ne);
      if ('$in' in cond) return cond.$in.map(String).includes(String(value));
      if ('$gte' in cond) return new Date(value) >= new Date(cond.$gte);
      if ('$gt' in cond) return Number(value) > Number(cond.$gt);
    }
    return String(value) === String(cond);
  });

function applyUpdate(target: any, update: any) {
  if (update.$inc) for (const [f, v] of Object.entries<any>(update.$inc)) target[f] = (target[f] || 0) + v;
  if (update.$set) for (const [f, v] of Object.entries<any>(update.$set)) target[f] = v;
  if (update.$push) {
    for (const [f, spec] of Object.entries<any>(update.$push)) {
      target[f] = target[f] || [];
      if (spec && typeof spec === 'object' && '$each' in spec) target[f].push(...spec.$each);
      else target[f].push(spec);
    }
  }
}

jest.mock('../models/PassportProgress', () => ({
  __esModule: true,
  default: {
    findOne: (q: any) => {
      const hit = progresses.find(p => matches(p, q)) || null;
      const handle: any = Promise.resolve(hit);
      handle.select = () => ({ lean: async () => hit });
      handle.lean = async () => hit;
      return handle;
    },
    updateOne: async (filter: any, update: any, opts?: any) => {
      let doc = progresses.find(p =>
        p.tenantId === filter.tenantId && String(p.studentId) === String(filter.studentId));
      if (!doc) {
        if (!opts?.upsert) return { modifiedCount: 0 };
        doc = { tenantId: filter.tenantId, studentId: filter.studentId, xp: 0, streak: 0, longestStreak: 0, xpLog: [], completed: [] };
        progresses.push(doc);
      }
      if (!matches(doc, filter)) return { modifiedCount: 0 };
      applyUpdate(doc, update);
      return { modifiedCount: 1 };
    },
  },
}));

jest.mock('../models/GamificationModels', () => ({
  __esModule: true,
  XpRule: {
    findOne: () => ({ lean: async () => null }),
    find: () => ({ select: () => ({ lean: async () => [] }) }),
    insertMany: async (d: any[]) => d,
  },
  XpLedger: {
    /**
     * The NEW unique index, faithfully: (tenantId, studentId, idempotencyKey).
     *
     * Change this to ignore studentId and the tests below fail — which is the point. They
     * exercise the constraint rather than asserting the code's shape.
     */
    create: async (doc: any) => {
      const clash = ledger.some(l =>
        l.tenantId === doc.tenantId
        && String(l.studentId) === String(doc.studentId)
        && l.idempotencyKey === doc.idempotencyKey);
      if (clash) { const e: any = new Error('E11000 duplicate key'); e.code = 11000; throw e; }
      const row = { ...doc, at: doc.at || new Date() };
      ledger.push(row);
      return row;
    },
    aggregate: async (pipeline: any[]) => {
      const match = pipeline.find(p => p.$match)?.$match || {};
      const rows = ledger.filter(l => matches(l, match));
      const group = pipeline.find(p => p.$group)?.$group;
      if (group?._id === null) return [{ _id: null, total: rows.reduce((n, r) => n + r.amount, 0) }];
      if (group?._id === '$eventKey') {
        return [...new Set(rows.map(r => r.eventKey))]
          .map(k => ({ _id: k, n: rows.filter(r => r.eventKey === k).length }));
      }
      return [];
    },
  },
  BadgeDefinition: {
    find: (q: any) => ({
      lean: async () => badgeDefs.filter(b =>
        b.tenantId === q.tenantId
        && (q.active === undefined || b.active === q.active)
        && (!q.conditionType?.$in || q.conditionType.$in.includes(b.conditionType))),
      select: () => ({ lean: async () => badgeDefs }),
    }),
    insertMany: async (d: any[]) => d,
  },
  StudentBadge: {
    find: (q: any) => ({ select: () => ({ lean: async () => studentBadges.filter(b => matches(b, q)) }) }),
    create: async (doc: any) => {
      const clash = studentBadges.some(b => b.tenantId === doc.tenantId
        && String(b.studentId) === String(doc.studentId) && b.badgeKey === doc.badgeKey);
      if (clash) { const e: any = new Error('E11000 duplicate key'); e.code = 11000; throw e; }
      studentBadges.push(doc);
      return doc;
    },
  },
  GamificationConfig: { findOne: () => ({ lean: async () => null }) },
  RewardLedger: { aggregate: async () => [] },
}));

jest.mock('../models/CareerRoadmap', () => ({
  __esModule: true,
  default: { findOne: () => ({ select: () => ({ lean: async () => null }) }) },
}));
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
    create: (...a: any[]) => { skillEvidenceWrite(...a); return Promise.resolve({}); },
    insertMany: (...a: any[]) => { skillEvidenceWrite(...a); return Promise.resolve([]); },
  },
}));
jest.mock('../models/CoinModels', () => ({
  __esModule: true,
  CoinAccount: {
    updateOne: (...a: any[]) => { coinWrite(...a); return Promise.resolve({}); },
    findOne: () => ({ lean: async () => null }),
  },
  CoinLedger: { create: (...a: any[]) => { coinWrite(...a); return Promise.resolve({}); } },
  CoinRule: { find: () => ({ lean: async () => [] }) },
  CoinConfig: { findOne: () => ({ lean: async () => null }) },
}));

import { processGamificationEvent } from '../services/gamificationEngine';
import { BADGE_SEEDS } from '../data/gamificationPolicy';

const TENANT = 't1';
const A = 'studentA';
const B = 'studentB';
const NOW = new Date('2026-08-17T09:00:00Z');

const blank = (studentId: string) => ({
  tenantId: TENANT, studentId,
  xp: 0, streak: 0, longestStreak: 0, lastCompletedDate: undefined,
  xpLog: [], completed: [],
});

const progressOf = (studentId: string) => progresses.find(p => String(p.studentId) === studentId);

const award = (studentId: string, sourceId: string, now = NOW) => processGamificationEvent({
  tenantId: TENANT, studentId,
  eventKey: 'CAREER_MISSION_COMPLETED', sourceType: 'mission', sourceId, now,
});

const xpOf = (studentId: string) =>
  ledger.filter(l => String(l.studentId) === studentId).reduce((n, r) => n + r.amount, 0);

beforeEach(() => {
  progresses = [blank(A), blank(B)];
  ledger = [];
  badgeDefs = [];
  studentBadges = [];
  skillProfileWrite.mockReset();
  skillEvidenceWrite.mockReset();
  coinWrite.mockReset();
});

describe('one student, one event', () => {
  it('is awarded once', async () => {
    const first = await award(A, 'shared-resource-42');
    expect(first.awarded).toBe(10);
    expect(progressOf(A).xp).toBe(10);
  });

  it('is refused on a repeat', async () => {
    await award(A, 'shared-resource-42');
    const again = await award(A, 'shared-resource-42');

    expect(again.refused).toBe('duplicate');
    expect(progressOf(A).xp).toBe(10);
  });

  it('is refused on concurrent retries', async () => {
    await Promise.all([
      award(A, 'shared-resource-42'),
      award(A, 'shared-resource-42'),
      award(A, 'shared-resource-42'),
    ]);
    expect(progressOf(A).xp).toBe(10);
    expect(ledger).toHaveLength(1);
  });
});

describe('two students, the same source id', () => {
  it('both earn — a shared resource is not a duplicate', async () => {
    // The ordinary case for a quiz or a coding problem: the id belongs to the RESOURCE, and
    // every student who completes it has done a real, separate piece of work.
    const a = await award(A, 'coding-problem-c-even-odd');
    const b = await award(B, 'coding-problem-c-even-odd');

    expect(a.awarded).toBe(10);
    expect(b.awarded).toBe(10);
    expect(b.refused).toBeUndefined();
  });

  it('does not depend on who went first', async () => {
    await award(B, 'quiz-101');
    const a = await award(A, 'quiz-101');
    expect(a.awarded).toBe(10);
  });

  it('keeps each balance separate and correct', async () => {
    await award(A, 'r1');
    await award(A, 'r2');
    await award(B, 'r1');

    expect(progressOf(A).xp).toBe(20);
    expect(progressOf(B).xp).toBe(10);
  });

  it('leaves leaderboard totals correct for both', async () => {
    // What the weekly and monthly boards sum. Had one student's rows been refused, their
    // position would have been quietly wrong rather than visibly broken.
    await award(A, 'r1');
    await award(A, 'r2');
    await award(B, 'r1');

    expect(xpOf(A)).toBe(20);
    expect(xpOf(B)).toBe(10);
    expect(xpOf(A)).toBe(progressOf(A).xp);
    expect(xpOf(B)).toBe(progressOf(B).xp);
  });

  it('holds when both students retry at the same moment', async () => {
    await Promise.all([
      award(A, 'shared'), award(A, 'shared'),
      award(B, 'shared'), award(B, 'shared'),
    ]);

    expect(progressOf(A).xp).toBe(10);
    expect(progressOf(B).xp).toBe(10);
    expect(ledger).toHaveLength(2);
  });
});

describe('the streak bonus — where the defect showed', () => {
  const onSixDays = (studentId: string) => {
    const p = progressOf(studentId);
    p.streak = 6;
    p.lastCompletedDate = '2026-08-16';
  };

  it('pays BOTH students who reach seven days', async () => {
    onSixDays(A);
    onSixDays(B);

    const a = await award(A, 'm-a');
    const b = await award(B, 'm-b');

    // Before the fix, B was refused as a duplicate of A's bonus — permanently.
    expect(a.streakBonus).toBeGreaterThan(0);
    expect(b.streakBonus).toBeGreaterThan(0);
    expect(ledger.filter(l => l.eventKey === 'STREAK_MILESTONE')).toHaveLength(2);
  });

  it('pays each of them only once', async () => {
    onSixDays(A);
    await award(A, 'm-a', NOW);
    await award(A, 'm-b', new Date('2026-08-18T09:00:00Z'));

    expect(ledger.filter(l =>
      l.eventKey === 'STREAK_MILESTONE' && String(l.studentId) === A)).toHaveLength(1);
  });

  it('lets both students earn the STREAK_7 badge', async () => {
    badgeDefs.push({ ...BADGE_SEEDS.find(x => x.key === 'STREAK_7')!, tenantId: TENANT, active: true });
    onSixDays(A);
    onSixDays(B);

    const a = await award(A, 'm-a');
    const b = await award(B, 'm-b');

    expect(a.badges).toContain('STREAK_7');
    expect(b.badges).toContain('STREAK_7');
    expect(studentBadges.filter(x => x.badgeKey === 'STREAK_7')).toHaveLength(2);
  });

  it('gives each student STREAK_7 only once', async () => {
    badgeDefs.push({ ...BADGE_SEEDS.find(x => x.key === 'STREAK_7')!, tenantId: TENANT, active: true });
    onSixDays(A);

    await award(A, 'm-a');
    await award(A, 'm-b');

    expect(studentBadges.filter(x =>
      x.badgeKey === 'STREAK_7' && String(x.studentId) === A)).toHaveLength(1);
  });
});

describe('the key still describes the event', () => {
  it('carries no student id', async () => {
    // Scoping belongs in the index. Embedding the student would work and would make the key
    // unreadable — and a key nobody can read is a key nobody can debug.
    await award(A, 'r1');
    expect(ledger[0].idempotencyKey).toBe('CAREER_MISSION_COMPLETED:mission:r1');
    expect(ledger[0].idempotencyKey).not.toContain(A);
  });

  it('is identical for two students doing the same thing', async () => {
    await award(A, 'same');
    await award(B, 'same');

    expect(ledger[0].idempotencyKey).toBe(ledger[1].idempotencyKey);
    expect(String(ledger[0].studentId)).not.toBe(String(ledger[1].studentId));
  });
});

describe('the separations still hold across students', () => {
  it('touches no coin balance', async () => {
    await award(A, 'shared');
    await award(B, 'shared');
    expect(coinWrite).not.toHaveBeenCalled();
  });

  it('touches no skill profile or evidence', async () => {
    await award(A, 'shared');
    await award(B, 'shared');
    expect(skillProfileWrite).not.toHaveBeenCalled();
    expect(skillEvidenceWrite).not.toHaveBeenCalled();
  });
});
