/**
 * Module 11 — what an activity is worth, and what it must never be worth.
 *
 * Two rules carry the module, and both are about what XP is NOT:
 *
 *   XP IS NOT A CAPABILITY.  Earning points must never move Skill DNA, evidence, readiness
 *                            or a roadmap. If it could, every downstream number becomes a
 *                            measure of effort rather than ability, and the product's one
 *                            honest signal is gone.
 *   XP IS NOT MONEY.         It never touches coins or the reward budget. There is no
 *                            conversion, in either direction.
 *
 * Underneath those: an event pays exactly once, however many times it arrives.
 */

let progress: any = null;
let rules: any[] = [];
let ledger: any[] = [];
let badgeDefs: any[] = [];
let studentBadges: any[] = [];
let roadmap: any = null;

/** Anything touching capability or money would show up in these. Nothing should. */
const skillProfileWrite = jest.fn();
const skillEvidenceWrite = jest.fn();
const coinWrite = jest.fn();

const oid = (v: any) => String(v?._id ?? v);

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
      const hit = progress && matches(progress, q) ? progress : null;
      const handle: any = Promise.resolve(hit);
      handle.select = () => ({ lean: async () => hit });
      handle.lean = async () => hit;
      return handle;
    },
    updateOne: async (filter: any, update: any, opts?: any) => {
      if (!progress) {
        if (!opts?.upsert) return { modifiedCount: 0 };
        progress = {
          tenantId: filter.tenantId, studentId: filter.studentId,
          xp: 0, streak: 0, longestStreak: 0, xpLog: [], completed: [],
        };
        applyUpdate(progress, { $set: update.$setOnInsert || {} });
      }
      if (!matches(progress, filter)) return { modifiedCount: 0 };
      applyUpdate(progress, update);
      return { modifiedCount: 1 };
    },
  },
}));

jest.mock('../models/GamificationModels', () => ({
  __esModule: true,
  XpRule: {
    findOne: (q: any) => ({ lean: async () => rules.find(r => matches(r, q)) || null }),
    find: (q: any) => ({ select: () => ({ lean: async () => rules.filter(r => matches(r, q)) }) }),
    insertMany: async (docs: any[]) => { rules.push(...docs); return docs; },
  },
  XpLedger: {
    // The unique (tenantId, idempotencyKey) index, faithfully.
    create: async (doc: any) => {
      if (ledger.some(l => l.tenantId === doc.tenantId && l.idempotencyKey === doc.idempotencyKey)) {
        const err: any = new Error('E11000 duplicate key'); err.code = 11000; throw err;
      }
      const row = { ...doc, at: doc.at || new Date() };
      ledger.push(row);
      return row;
    },
    aggregate: async (pipeline: any[]) => {
      const match = pipeline.find(p => p.$match)?.$match || {};
      let rows = ledger.filter(l => matches(l, match));
      const group = pipeline.find(p => p.$group)?.$group;
      if (group?._id === null) return [{ _id: null, total: rows.reduce((n, r) => n + r.amount, 0) }];
      if (group?._id === '$eventKey') {
        const keys = [...new Set(rows.map(r => r.eventKey))];
        return keys.map(k => ({ _id: k, n: rows.filter(r => r.eventKey === k).length }));
      }
      return [];
    },
  },
  BadgeDefinition: {
    find: (q: any) => ({
      lean: async () => badgeDefs.filter(b => {
        if (q.active !== undefined && b.active !== q.active) return false;
        if (q.conditionType?.$in && !q.conditionType.$in.includes(b.conditionType)) return false;
        return b.tenantId === q.tenantId;
      }),
      select: () => ({ lean: async () => badgeDefs.filter(b => b.tenantId === q.tenantId) }),
      sort: () => ({ lean: async () => badgeDefs }),
    }),
    insertMany: async (docs: any[]) => { badgeDefs.push(...docs); return docs; },
  },
  StudentBadge: {
    find: (q: any) => ({ select: () => ({ lean: async () => studentBadges.filter(b => matches(b, q)) }) }),
    create: async (doc: any) => {
      if (studentBadges.some(b => b.tenantId === doc.tenantId
        && String(b.studentId) === String(doc.studentId) && b.badgeKey === doc.badgeKey)) {
        const err: any = new Error('E11000 duplicate key'); err.code = 11000; throw err;
      }
      studentBadges.push(doc);
      return doc;
    },
  },
  GamificationConfig: { findOne: () => ({ lean: async () => null }) },
  RewardLedger: { aggregate: async () => [] },
}));

jest.mock('../models/CareerRoadmap', () => ({
  __esModule: true,
  default: { findOne: () => ({ select: () => ({ lean: async () => roadmap }) }) },
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

import { processGamificationEvent, ensureGamificationDefaults } from '../services/gamificationEngine';
import { XP_EVENTS, xpEvent, BADGE_SEEDS } from '../data/gamificationPolicy';

const TENANT = 't1';
const STUDENT = 's1';
const NOW = new Date('2026-08-17T09:00:00Z');

const mission = (id = 'cp:rm1:1:2026-08-17', now = NOW) => processGamificationEvent({
  tenantId: TENANT, studentId: STUDENT,
  eventKey: 'CAREER_MISSION_COMPLETED', sourceType: 'mission', sourceId: id, now,
});

const assessment = (id = 'pa1', now = NOW) => processGamificationEvent({
  tenantId: TENANT, studentId: STUDENT,
  eventKey: 'PERSONALIZED_ASSESSMENT_COMPLETED', sourceType: 'assessment', sourceId: id, now,
});

beforeEach(() => {
  progress = {
    tenantId: TENANT, studentId: STUDENT,
    xp: 0, streak: 0, longestStreak: 0, lastCompletedDate: undefined,
    xpLog: [], completed: [],
  };
  rules = [];
  ledger = [];
  badgeDefs = [];
  studentBadges = [];
  roadmap = null;
  skillProfileWrite.mockReset();
  skillEvidenceWrite.mockReset();
  coinWrite.mockReset();
});

// ─────────────────────────────────────────────────────────────────────────────
// §162 — configurable, with the shipped behaviour preserved
// ─────────────────────────────────────────────────────────────────────────────

describe('what a mission is worth', () => {
  it('falls back to the amount the product already awards when nothing is configured', async () => {
    const award = await mission();
    // §122: a tenant that has never opened the admin screen must keep what it has, not
    // silently drop to zero.
    expect(award.awarded).toBe(xpEvent('CAREER_MISSION_COMPLETED')!.defaultXp);
    expect(progress.xp).toBe(10);
  });

  it('uses the configured amount once an admin sets one', async () => {
    rules = [{ tenantId: TENANT, eventKey: 'CAREER_MISSION_COMPLETED', enabled: true, xp: 20, dailyLimit: 0, streakQualifying: true }];
    const award = await mission();
    expect(award.awarded).toBe(20);
    expect(progress.xp).toBe(20);
  });

  it('awards nothing when the event is switched off', async () => {
    rules = [{ tenantId: TENANT, eventKey: 'CAREER_MISSION_COMPLETED', enabled: false, xp: 20, dailyLimit: 0 }];
    const award = await mission();
    expect(award.awarded).toBe(0);
    expect(award.refused).toBe('disabled');
    expect(progress.xp).toBe(0);
  });

  it('refuses an event it does not know', async () => {
    const award = await processGamificationEvent({
      tenantId: TENANT, studentId: STUDENT,
      eventKey: 'MADE_UP_EVENT', sourceType: 'x', sourceId: 'y', now: NOW,
    });
    expect(award.refused).toBe('unknown_event');
    expect(progress.xp).toBe(0);
  });
});

describe('an event pays exactly once', () => {
  it('refuses a repeat of the same mission', async () => {
    await mission();
    const second = await mission();

    expect(second.refused).toBe('duplicate');
    expect(second.awarded).toBe(0);
    expect(progress.xp).toBe(10);
    expect(ledger.filter(l => l.eventKey === 'CAREER_MISSION_COMPLETED')).toHaveLength(1);
  });

  it('survives simultaneous duplicates', async () => {
    await Promise.all([mission(), mission(), mission()]);
    expect(progress.xp).toBe(10);
    expect(ledger.filter(l => l.eventKey === 'CAREER_MISSION_COMPLETED')).toHaveLength(1);
  });

  it('still pays for a genuinely different mission', async () => {
    await mission('cp:rm1:1:2026-08-17');
    await mission('cp:rm1:2:2026-08-17');
    expect(progress.xp).toBe(20);
  });

  it('records the ledger row before moving the balance', async () => {
    await mission();
    // §179: the ledger is the record that can refuse a duplicate, so it commits first and
    // the balance follows. A rebuild can always repair from it.
    expect(ledger[0].amount).toBe(10);
    expect(ledger[0].idempotencyKey).toContain('CAREER_MISSION_COMPLETED');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §164 — caps
// ─────────────────────────────────────────────────────────────────────────────

describe('daily caps', () => {
  it('stops awarding once the day’s limit is reached', async () => {
    rules = [{ tenantId: TENANT, eventKey: 'CAREER_MISSION_COMPLETED', enabled: true, xp: 10, dailyLimit: 20, streakQualifying: true }];

    await mission('m1');
    await mission('m2');
    const third = await mission('m3');

    expect(third.refused).toBe('daily_cap');
    expect(progress.xp).toBe(20);
  });

  it('does not corrupt the streak when a cap refuses an award', async () => {
    rules = [{ tenantId: TENANT, eventKey: 'CAREER_MISSION_COMPLETED', enabled: true, xp: 10, dailyLimit: 10, streakQualifying: true }];
    await mission('m1');
    const streakAfterFirst = progress.streak;
    await mission('m2');

    // §164: a capped award is not a missed day.
    expect(progress.streak).toBe(streakAfterFirst);
    expect(progress.streak).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §165 — streaks
// ─────────────────────────────────────────────────────────────────────────────

describe('streaks', () => {
  it('starts at one on the first qualifying day', async () => {
    await mission();
    expect(progress.streak).toBe(1);
    expect(progress.longestStreak).toBe(1);
  });

  it('does not move twice in one day, however much work is done', async () => {
    await mission('m1');
    await mission('m2');
    expect(progress.streak).toBe(1);
  });

  it('continues on a consecutive day', async () => {
    await mission('m1', NOW);
    await mission('m2', new Date('2026-08-18T09:00:00Z'));
    expect(progress.streak).toBe(2);
  });

  it('restarts after a missed day', async () => {
    await mission('m1', NOW);
    await mission('m2', new Date('2026-08-20T09:00:00Z'));
    expect(progress.streak).toBe(1);
    // The best run is remembered even though the current one reset.
    expect(progress.longestStreak).toBe(1);
  });

  it('does not move for a non-qualifying event', async () => {
    rules = [{ tenantId: TENANT, eventKey: 'CAREER_MISSION_COMPLETED', enabled: true, xp: 10, dailyLimit: 0, streakQualifying: false }];
    await mission();
    // §19: showing up is not the same as doing something.
    expect(progress.streak).toBe(0);
    expect(progress.xp).toBe(10);
  });

  it('pays a milestone bonus once, through the same ledger', async () => {
    progress.streak = 6;
    progress.lastCompletedDate = '2026-08-16';
    await mission('m1', NOW);

    expect(progress.streak).toBe(7);
    const bonus = ledger.filter(l => l.eventKey === 'STREAK_MILESTONE');
    expect(bonus).toHaveLength(1);
    expect(progress.xp).toBe(10 + bonus[0].amount);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §166 — badges
// ─────────────────────────────────────────────────────────────────────────────

describe('badges', () => {
  const seed = (key: string) => {
    const s = BADGE_SEEDS.find(b => b.key === key)!;
    badgeDefs.push({ ...s, tenantId: TENANT, active: true });
  };

  it('awards a first-mission badge on the first mission', async () => {
    seed('FIRST_MISSION');
    const award = await mission();
    expect(award.badges).toContain('FIRST_MISSION');
    expect(studentBadges).toHaveLength(1);
  });

  it('awards it only once', async () => {
    seed('FIRST_MISSION');
    await mission('m1');
    const second = await mission('m2');

    expect(second.badges).not.toContain('FIRST_MISSION');
    expect(studentBadges.filter(b => b.badgeKey === 'FIRST_MISSION')).toHaveLength(1);
  });

  it('does not duplicate under concurrent evaluation', async () => {
    seed('FIRST_MISSION');
    await Promise.all([mission('m1'), mission('m2'), mission('m3')]);
    expect(studentBadges.filter(b => b.badgeKey === 'FIRST_MISSION')).toHaveLength(1);
  });

  it('awards an XP-threshold badge when the balance crosses it', async () => {
    seed('XP_1000');
    rules = [{ tenantId: TENANT, eventKey: 'CAREER_MISSION_COMPLETED', enabled: true, xp: 1000, dailyLimit: 0, streakQualifying: true }];
    const award = await mission();
    expect(award.badges).toContain('XP_1000');
  });

  it('does not award below the threshold', async () => {
    seed('XP_1000');
    const award = await mission();
    expect(award.badges).not.toContain('XP_1000');
    expect(studentBadges).toHaveLength(0);
  });

  it('ignores a badge an admin disabled', async () => {
    const s = BADGE_SEEDS.find(b => b.key === 'FIRST_MISSION')!;
    badgeDefs.push({ ...s, tenantId: TENANT, active: false });

    const award = await mission();
    expect(award.badges).toHaveLength(0);
    expect(studentBadges).toHaveLength(0);
  });

  it('awards a streak badge when the streak reaches it', async () => {
    seed('STREAK_7');
    progress.streak = 6;
    progress.lastCompletedDate = '2026-08-16';
    const award = await mission('m1', NOW);
    expect(award.badges).toContain('STREAK_7');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §161, §174 — the separations that carry the product
// ─────────────────────────────────────────────────────────────────────────────

describe('XP never becomes a capability signal', () => {
  it('writes nothing to the skill profile', async () => {
    await mission();
    await assessment();
    expect(skillProfileWrite).not.toHaveBeenCalled();
  });

  it('writes no skill evidence', async () => {
    await mission();
    await assessment();
    expect(skillEvidenceWrite).not.toHaveBeenCalled();
  });

  it('reports no readiness, score or mastery in its result', async () => {
    const award = await mission();
    for (const forbidden of ['readiness', 'skillScore', 'mastery', 'coverage', 'confidence']) {
      expect(award).not.toHaveProperty(forbidden);
    }
  });
});

describe('XP never becomes money', () => {
  it('does not touch the coin economy', async () => {
    await mission();
    await assessment();
    // §117: coins are the redeemable currency and have their own engine. There is no
    // conversion in either direction, and this asserts the absence of one.
    expect(coinWrite).not.toHaveBeenCalled();
  });

  it('reports no monetary value at all', async () => {
    const award = await mission();
    for (const forbidden of ['coins', 'value', 'valuePaise', 'reward', 'rupees']) {
      expect(award).not.toHaveProperty(forbidden);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §163 — assessment
// ─────────────────────────────────────────────────────────────────────────────

describe('assessment XP', () => {
  it('is one award for finishing, not per correct answer', async () => {
    const award = await assessment();
    expect(award.awarded).toBe(xpEvent('PERSONALIZED_ASSESSMENT_COMPLETED')!.defaultXp);
    expect(ledger.filter(l => l.eventKey === 'PERSONALIZED_ASSESSMENT_COMPLETED')).toHaveLength(1);
  });

  it('cannot be paid twice by a retried submission', async () => {
    await assessment('pa1');
    const again = await assessment('pa1');
    expect(again.refused).toBe('duplicate');
    expect(progress.xp).toBe(100);
  });

  it('does not vary with how well the student did', async () => {
    // Nothing about correctness reaches this call — the event carries an attempt id and
    // nothing else, which is what stops a diagnostic becoming something to game.
    const award = await assessment();
    expect(award.awarded).toBe(100);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §73 — seeding
// ─────────────────────────────────────────────────────────────────────────────

describe('defaults', () => {
  it('installs every shipped rule and badge', async () => {
    const result = await ensureGamificationDefaults(TENANT);
    expect(result.rules).toBe(XP_EVENTS.length);
    expect(result.badges).toBe(BADGE_SEEDS.length);
  });

  it('never overwrites what an admin changed, or re-enables what they turned off', async () => {
    rules = [{ tenantId: TENANT, eventKey: 'CAREER_MISSION_COMPLETED', enabled: false, xp: 999, dailyLimit: 0 }];
    await ensureGamificationDefaults(TENANT);

    const kept = rules.find(r => r.eventKey === 'CAREER_MISSION_COMPLETED');
    expect(kept.xp).toBe(999);
    expect(kept.enabled).toBe(false);
  });

  it('is safe to run repeatedly', async () => {
    await ensureGamificationDefaults(TENANT);
    const second = await ensureGamificationDefaults(TENANT);
    expect(second.rules).toBe(0);
    expect(second.badges).toBe(0);
  });
});
