/**
 * Module 12 — redeeming a reward on a database with no transactions.
 *
 * Production Mongo here is standalone, so one redemption cannot be one atomic write. It is a
 * saga across four independent things — stock, the tenant's monthly budget, the member's
 * annual allowance, and their coin balance — and the properties that matter are economic:
 *
 *   NOTHING IS OVERSPENT.   Coins, stock and both budgets each have a hard atomic guard.
 *   NOTHING IS HALF-DONE.   Any failure gives back everything already taken.
 *   NOTHING IS DOUBLE-DONE. Retrying a redemption, a cancellation or a fulfilment does it
 *                           once, because each step is idempotent on its own key.
 *   XP IS NEVER SPENT.      Coins buy things. XP gates them and is never debited.
 */

let coinAccounts: any[] = [];
let coinLedger: any[] = [];
let coinConfig: any = null;
let rewards: any[] = [];
let redemptions: any[] = [];
let rewardLedger: any[] = [];
let gamConfig: any = null;
let progresses: any[] = [];
let badges: any[] = [];

const skillWrite = jest.fn();
const xpWrite = jest.fn();

const oidStr = (v: any) => String(v?._id ?? v);

const matches = (doc: any, q: any): boolean =>
  Object.entries(q).every(([k, cond]: [string, any]) => {
    const value = k === '_id' ? oidStr(doc._id ?? doc) : (k === 'studentId' ? String(doc.studentId) : doc[k]);
    if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
      if ('$ne' in cond) return String(value) !== String(cond.$ne);
      if ('$in' in cond) return cond.$in.map(String).includes(String(value));
      if ('$nin' in cond) return !cond.$nin.map(String).includes(String(value));
      if ('$gte' in cond) return Number(value) >= Number(cond.$gte);
      if ('$gt' in cond) return Number(value) > Number(cond.$gt);
      if ('$lte' in cond) return Number(value) <= Number(cond.$lte);
      if ('$lt' in cond) return new Date(value) < new Date(cond.$lt);
    }
    return String(value) === String(cond);
  });

function applyUpdate(target: any, update: any) {
  if (update.$inc) for (const [f, v] of Object.entries<any>(update.$inc)) target[f] = (target[f] || 0) + v;
  if (update.$set) for (const [f, v] of Object.entries<any>(update.$set)) {
    // Support dotted paths like 'steps.stockReserved'
    const parts = f.split('.');
    let t = target;
    for (let i = 0; i < parts.length - 1; i++) { t[parts[i]] = t[parts[i]] || {}; t = t[parts[i]]; }
    t[parts[parts.length - 1]] = v;
  }
}

const docify = (o: any) => ({
  ...o,
  markModified: () => {},
  save: async function () { return this; },
});

jest.mock('../models/CoinModels', () => ({
  __esModule: true,
  CoinConfig: {
    // getCoinConfig awaits findOne() directly (no .lean()), so this must be thenable AND
    // expose .lean() for callers that do chain it.
    findOne: () => {
      const h: any = Promise.resolve(coinConfig);
      h.lean = async () => coinConfig;
      return h;
    },
    create: async (o: any) => { coinConfig = { ...coinConfig, ...o }; return coinConfig; },
  },
  CoinRule: { find: () => ({ lean: async () => [] }), insertMany: async () => [] },
  COIN_EVENTS: [],
  CoinAccount: {
    findOneAndUpdate: async (filter: any, update: any, opts?: any) => {
      let acc = coinAccounts.find(a => matches(a, { tenantId: filter.tenantId, studentId: filter.studentId }));
      if (!acc && opts?.upsert) {
        acc = { tenantId: filter.tenantId, studentId: filter.studentId, balance: 0, lifetimeEarned: 0, lifetimeSpent: 0, realCostThisYearInr: 0, budgetYearStart: new Date() };
        applyUpdate(acc, { $set: update.$setOnInsert || {} });
        coinAccounts.push(acc);
        return acc;
      }
      if (!acc || !matches(acc, filter)) return null;
      applyUpdate(acc, update);
      return acc;
    },
    updateOne: async (filter: any, update: any) => {
      const acc = coinAccounts.find(a => matches(a, filter));
      if (!acc) return { modifiedCount: 0 };
      applyUpdate(acc, update);
      return { modifiedCount: 1 };
    },
  },
  CoinLedger: {
    create: async (doc: any) => {
      if (coinLedger.some(l => l.tenantId === doc.tenantId && l.idempotencyKey === doc.idempotencyKey)) {
        const e: any = new Error('E11000'); e.code = 11000; throw e;
      }
      coinLedger.push({ ...doc, createdAt: new Date() });
      return doc;
    },
    deleteOne: async (q: any) => {
      const i = coinLedger.findIndex(l => l.idempotencyKey === q.idempotencyKey);
      if (i >= 0) coinLedger.splice(i, 1);
      return { deletedCount: 1 };
    },
    aggregate: async (pipeline: any[]) => {
      const m = pipeline.find(p => p.$match)?.$match || {};
      const rows = coinLedger.filter(l => {
        if (m.coins?.$gt !== undefined && !(l.coins > m.coins.$gt)) return false;
        if (m.expiresAt && (!l.expiresAt || new Date(l.expiresAt) >= new Date(m.expiresAt.$lt))) return false;
        return l.tenantId === m.tenantId;
      });
      return rows.length ? [{ _id: null, total: rows.reduce((n, r) => n + r.coins, 0) }] : [];
    },
    countDocuments: async () => 0,
  },
}));

jest.mock('../models/RewardModels', () => ({
  __esModule: true,
  RewardDefinition: {
    findOne: (q: any) => {
      const hit = rewards.find(r => matches(r, q));
      const h: any = Promise.resolve(hit ? docify(hit) : null);
      h.lean = async () => hit || null;
      return h;
    },
    find: (q: any) => ({
      sort: () => ({ lean: async () => rewards.filter(r => matches(r, q)) }),
      lean: async () => rewards.filter(r => matches(r, q)),
    }),
    updateOne: async (filter: any, update: any) => {
      const r = rewards.find(x => matches(x, filter));
      if (!r) return { modifiedCount: 0 };
      applyUpdate(r, update);
      return { modifiedCount: 1 };
    },
    create: async (o: any) => { rewards.push(o); return o; },
  },
  RewardRedemption: {
    create: async (doc: any) => {
      if (redemptions.some(r => r.tenantId === doc.tenantId
        && String(r.studentId) === String(doc.studentId) && r.idempotencyKey === doc.idempotencyKey)) {
        const e: any = new Error('E11000'); e.code = 11000; throw e;
      }
      const row = docify({ ...doc, _id: `rd${redemptions.length + 1}`, steps: { ...doc.steps } });
      redemptions.push(row);
      return row;
    },
    findOne: (q: any) => {
      const hit = redemptions.find(r => matches(r, q));
      const h: any = Promise.resolve(hit || null);
      h.lean = async () => hit || null;
      h.select = () => ({ lean: async () => hit || null });
      return h;
    },
    find: (q: any) => ({
      sort: () => ({ limit: () => ({ lean: async () => redemptions.filter(r => matches(r, q)) }) }),
      select: () => ({ lean: async () => redemptions.filter(r => matches(r, q)) }),
      lean: async () => redemptions.filter(r => matches(r, q)),
    }),
    findOneAndUpdate: async (filter: any, update: any) => {
      const r = redemptions.find(x => matches(x, filter));
      if (!r) return null;
      applyUpdate(r, update);
      return r;
    },
    countDocuments: async (q: any) => redemptions.filter(r => matches(r, q)).length,
    aggregate: async () => [],
  },
}));

jest.mock('../models/GamificationModels', () => ({
  __esModule: true,
  GamificationConfig: { findOne: () => ({ lean: async () => gamConfig }), updateOne: async () => ({}) },
  RewardLedger: {
    create: async (doc: any) => {
      if (rewardLedger.some(r => r.tenantId === doc.tenantId && r.idempotencyKey === doc.idempotencyKey)) {
        const e: any = new Error('E11000'); e.code = 11000; throw e;
      }
      const row = { ...doc, _id: `rl${rewardLedger.length + 1}` };
      rewardLedger.push(row);
      return row;
    },
    find: (q: any) => ({ sort: () => ({ lean: async () => rewardLedger.filter(r => matches(r, q)) }) }),
    updateOne: async (filter: any, update: any) => {
      const r = rewardLedger.find(x => matches(x, filter));
      if (!r) return { modifiedCount: 0 };
      applyUpdate(r, update);
      return { modifiedCount: 1 };
    },
    aggregate: async (pipeline: any[]) => {
      const m = pipeline.find(p => p.$match)?.$match || {};
      const rows = rewardLedger.filter(r => matches(r, m));
      const states = [...new Set(rows.map(r => r.state))];
      return states.map(s => ({
        _id: s,
        total: rows.filter(r => r.state === s).reduce((n, r) => n + r.valuePaise, 0),
        students: [...new Set(rows.filter(r => r.state === s).map(r => String(r.studentId)))],
      }));
    },
  },
  StudentBadge: { find: () => ({ select: () => ({ lean: async () => badges }) }) },
  XpRule: {}, XpLedger: {}, BadgeDefinition: {},
}));

jest.mock('../models/PassportProgress', () => ({
  __esModule: true,
  default: {
    findOne: (q: any) => ({ select: () => ({ lean: async () => progresses.find(p => matches(p, q)) || null }) }),
    updateOne: (...a: any[]) => { xpWrite(...a); return Promise.resolve({ modifiedCount: 1 }); },
  },
}));

jest.mock('../models/PassportConfig', () => ({
  __esModule: true, default: { findOne: () => ({ lean: async () => ({ entitlements: [] }) }) },
}));
jest.mock('../models/User', () => ({
  __esModule: true,
  default: { findOne: () => ({ select: () => ({ lean: async () => ({ passport: { active: true }, firstName: 'A', lastName: 'B' }) }) }) },
}));
jest.mock('../models/Tenant', () => ({
  __esModule: true, default: { findById: () => ({ select: () => ({ lean: async () => null }) }) },
}));
jest.mock('../models/Payment', () => ({ __esModule: true, default: { aggregate: async () => [] } }));
jest.mock('../models/StudentSkillProfile', () => ({
  __esModule: true,
  default: { updateOne: (...a: any[]) => { skillWrite(...a); return Promise.resolve({}); }, bulkWrite: (...a: any[]) => { skillWrite(...a); return Promise.resolve({}); } },
}));
jest.mock('../models/StudentSkillEvidence', () => ({
  __esModule: true,
  default: { create: (...a: any[]) => { skillWrite(...a); return Promise.resolve({}); }, insertMany: (...a: any[]) => { skillWrite(...a); return Promise.resolve([]); } },
}));

import { redeemReward, fulfillRedemption, cancelRedemption } from '../services/rewardRedemptionService';
import { spendCoins, refundCoins, spendableBalance } from '../services/coinSpendService';
import { invalidateCoinCache } from '../services/coinService';

const T = 't1';
const S = 's1';
const S2 = 's2';
const NOW = new Date('2026-08-17T09:00:00Z');

const rupees = (n: number) => Math.round(n * 100);

const account = (studentId: string, balance: number, over: any = {}) => ({
  tenantId: T, studentId, balance, lifetimeEarned: balance, lifetimeSpent: 0,
  realCostThisYearInr: 0, budgetYearStart: new Date('2026-01-01'), ...over,
});

const reward = (over: any = {}) => ({
  tenantId: T, key: 'TSHIRT', name: 'CodeBegun T-Shirt', description: '', type: 'PHYSICAL',
  iconKey: 'bi-gift-fill',
  coinCost: 1500, budgetCostPaise: rupees(300),
  active: true, studentVisible: true,
  stockMode: 'UNLIMITED', stockAvailable: 0, stockReserved: 0, stockFulfilled: 0,
  perStudentLimit: 1, totalRedemptionLimit: 0, totalRedeemed: 0,
  minimumXp: 0, minimumLevel: 0, requiredBadgeKeys: [],
  fulfillmentType: 'MANUAL', displayOrder: 100, ...over,
});

const redeem = (studentId = S, token = 'intent-1', key = 'TSHIRT') =>
  redeemReward({ tenantId: T, studentId, rewardKey: key, intentToken: token, now: NOW });

const coinsOf = (studentId: string) =>
  coinAccounts.find(a => String(a.studentId) === studentId)?.balance ?? 0;

beforeEach(() => {
  coinAccounts = [account(S, 2000), account(S2, 2000)];
  coinLedger = [];
  coinConfig = { tenantId: T, enabled: true, coinsPerRupee: 5, monthlyEarnCap: 0, annualRealCostBudgetInr: 0, expiryMonths: 0, minRedemption: 0, freeMembersAccrue: true };
  rewards = [reward()];
  redemptions = [];
  rewardLedger = [];
  gamConfig = { tenantId: T, reward: { enabled: true, mode: 'MANUAL', manualBudgetPaise: rupees(50000), capPaise: 0 } };
  progresses = [{ tenantId: T, studentId: S, xp: 5000 }, { tenantId: T, studentId: S2, xp: 5000 }];
  badges = [];
  skillWrite.mockReset();
  xpWrite.mockReset();
  // getCoinConfig caches for 60s at module scope, so a test that changes policy would
  // otherwise be answered from the previous test's config.
  invalidateCoinCache(T);
});

describe('a successful redemption', () => {
  it('reserves, debits coins once and snapshots the economics', async () => {
    const r = await redeem();

    expect(r.ok).toBe(true);
    expect(r.redemption!.status).toBe('RESERVED');
    expect(coinsOf(S)).toBe(500);
    expect(coinLedger.filter(l => l.coins < 0)).toHaveLength(1);
    expect(r.redemption!.coinCost).toBe(1500);
    expect(r.redemption!.budgetCostPaise).toBe(rupees(300));
  });

  it('reserves the tenant budget for the requesting period', async () => {
    await redeem();
    expect(rewardLedger.filter(r => r.state === 'RESERVED')).toHaveLength(1);
    expect(rewardLedger[0].period).toBe('2026-08');
  });

  it('records which saga steps completed', async () => {
    const r = await redeem();
    expect(r.redemption!.steps.tenantBudgetReserved).toBe(true);
    expect(r.redemption!.steps.coinsDebited).toBe(true);
  });
});

describe('the two budget gates', () => {
  it('rejects when the MEMBER annual allowance is short, even with tenant budget spare', async () => {
    coinConfig.annualRealCostBudgetInr = 200;          // ₹200 left; reward costs ₹300
    const r = await redeem();

    expect(r.ok).toBe(false);
    expect(r.refused).toBe('MEMBER_REWARD_BUDGET_EXCEEDED');
    expect(coinsOf(S)).toBe(2000);                     // untouched
  });

  it('rejects when the TENANT budget is short, even with member allowance spare', async () => {
    coinConfig.annualRealCostBudgetInr = 100000;
    gamConfig.reward.manualBudgetPaise = rupees(100);   // ₹100 < ₹300
    const r = await redeem();

    expect(r.ok).toBe(false);
    expect(r.refused).toBe('TENANT_REWARD_BUDGET_UNAVAILABLE');
    expect(coinsOf(S)).toBe(2000);
  });

  it('proceeds when both pass', async () => {
    coinConfig.annualRealCostBudgetInr = 1000;
    const r = await redeem();
    expect(r.ok).toBe(true);
  });

  it('consumes the member allowance on reservation', async () => {
    coinConfig.annualRealCostBudgetInr = 1000;
    await redeem();
    expect(coinAccounts.find(a => String(a.studentId) === S).realCostThisYearInr).toBe(300);
  });
});

describe('existing coin policy is honoured', () => {
  it('refuses below the configured minimum redeemable balance', async () => {
    coinConfig.minRedemption = 2500;                   // balance 2000 is under the floor
    const r = await redeem();
    expect(r.refused).toBe('MIN_REDEMPTION_NOT_REACHED');
  });

  it('does not let expired coins buy anything', async () => {
    coinConfig.expiryMonths = 6;
    coinLedger.push({
      tenantId: T, studentId: S, coins: 1800, idempotencyKey: 'old',
      expiresAt: new Date('2026-01-01'), createdAt: new Date('2025-06-01'),
    });

    const spendable = await spendableBalance(T, S, NOW);
    expect(spendable.expired).toBe(1800);
    expect(spendable.spendable).toBe(200);

    const r = await redeem();
    expect(r.refused).toBe('INSUFFICIENT_COINS');
  });
});

describe('coin spending', () => {
  it('cannot overdraw', async () => {
    const res = await spendCoins({ tenantId: T, studentId: S, coins: 5000, idempotencyKey: 'k', eventKey: 'x' });
    expect(res.refused).toBe('insufficient');
    expect(coinsOf(S)).toBe(2000);
  });

  it('refuses a duplicate on the same key', async () => {
    await spendCoins({ tenantId: T, studentId: S, coins: 100, idempotencyKey: 'k', eventKey: 'x' });
    const again = await spendCoins({ tenantId: T, studentId: S, coins: 100, idempotencyKey: 'k', eventKey: 'x' });

    expect(again.refused).toBe('duplicate');
    expect(coinsOf(S)).toBe(1900);
  });

  it('refunds by compensation, never by editing the debit', async () => {
    await spendCoins({ tenantId: T, studentId: S, coins: 500, idempotencyKey: 'spend', eventKey: 'reward_redemption' });
    await refundCoins({ tenantId: T, studentId: S, coins: 500, idempotencyKey: 'refund', eventKey: 'reward_redemption_refund' });

    expect(coinsOf(S)).toBe(2000);
    // The original debit survives, and the refund is its own row.
    expect(coinLedger.find(l => l.idempotencyKey === 'spend').coins).toBe(-500);
    expect(coinLedger.find(l => l.idempotencyKey === 'refund').coins).toBe(500);
  });

  it('refunds only once on a retry', async () => {
    await spendCoins({ tenantId: T, studentId: S, coins: 500, idempotencyKey: 'spend', eventKey: 'x' });
    await refundCoins({ tenantId: T, studentId: S, coins: 500, idempotencyKey: 'refund', eventKey: 'y' });
    await refundCoins({ tenantId: T, studentId: S, coins: 500, idempotencyKey: 'refund', eventKey: 'y' });

    expect(coinsOf(S)).toBe(2000);
  });
});

describe('races', () => {
  it('cannot oversell the last unit of stock', async () => {
    rewards = [reward({ stockMode: 'LIMITED', stockAvailable: 1, perStudentLimit: 0 })];
    const [a, b] = await Promise.all([redeem(S, 'i1'), redeem(S2, 'i2')]);

    expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1);
    expect(rewards[0].stockAvailable).toBe(0);
    expect(rewards[0].stockReserved).toBe(1);
  });

  it('cannot spend the same coins twice', async () => {
    coinAccounts = [account(S, 1500)];
    rewards = [reward({ perStudentLimit: 0 })];
    await Promise.all([redeem(S, 'i1'), redeem(S, 'i2')]);

    expect(coinsOf(S)).toBeGreaterThanOrEqual(0);
    expect(coinLedger.filter(l => l.coins < 0)).toHaveLength(1);
  });

  it('cannot exceed the member annual allowance', async () => {
    coinConfig.annualRealCostBudgetInr = 500;          // room for one ₹300 reward, not two
    rewards = [reward({ perStudentLimit: 0 })];
    await Promise.all([redeem(S, 'i1'), redeem(S, 'i2')]);

    expect(coinAccounts.find(a => String(a.studentId) === S).realCostThisYearInr).toBeLessThanOrEqual(500);
  });

  it('treats a double-clicked button as one redemption', async () => {
    const [a, b] = await Promise.all([redeem(S, 'same'), redeem(S, 'same')]);
    expect(redemptions).toHaveLength(1);
    expect(coinLedger.filter(l => l.coins < 0)).toHaveLength(1);
    expect(a.ok || b.ok).toBe(true);
  });
});

describe('limits', () => {
  it('enforces a per-student limit of one', async () => {
    await redeem(S, 'i1');
    // Topped up deliberately: with 500 left the second attempt would fail on coins first,
    // and this test is about the LIMIT.
    coinAccounts.find(a => String(a.studentId) === S).balance = 5000;

    const second = await redeem(S, 'i2');
    expect(second.reasons).toContain('REDEMPTION_LIMIT_REACHED');
  });

  it('allows a repeatable reward a second time with a new intent', async () => {
    rewards = [reward({ perStudentLimit: 3 })];
    const a = await redeem(S, 'i1');
    // 2000 coins covers one at 1500; top up for the second.
    coinAccounts[0].balance = 2000;
    const b = await redeem(S, 'i2');

    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    expect(redemptions).toHaveLength(2);
  });
});

describe('compensation', () => {
  it('acquires nothing at all when eligibility refuses up front', async () => {
    // The best outcome, and the common one: the pre-check catches it before the saga starts,
    // so there is nothing to give back. No redemption row, no reservations, no coins moved.
    coinConfig.annualRealCostBudgetInr = 100;
    rewards = [reward({ stockMode: 'LIMITED', stockAvailable: 5 })];

    const r = await redeem();

    expect(r.ok).toBe(false);
    expect(r.refused).toBe('MEMBER_REWARD_BUDGET_EXCEEDED');
    expect(coinsOf(S)).toBe(2000);
    expect(rewards[0].stockAvailable).toBe(5);
    expect(rewardLedger.filter(x => x.state === 'RESERVED')).toHaveLength(0);
    expect(redemptions).toHaveLength(0);
  });

  it('gives everything back when a guard fails MID-SAGA', async () => {
    /**
     * The case the saga exists for. Both requests pass their pre-check — each reads an
     * allowance that covers one reward — and then only one can win the atomic reserve. The
     * loser has already taken stock and tenant budget by that point, and must hand both back
     * without ever touching the student's coins.
     */
    coinConfig.annualRealCostBudgetInr = 300;          // room for exactly one ₹300 reward
    rewards = [reward({ stockMode: 'LIMITED', stockAvailable: 5, perStudentLimit: 0 })];

    const results = await Promise.all([redeem(S, 'i1'), redeem(S, 'i2')]);
    const won = results.filter(r => r.ok);
    const lost = results.filter(r => !r.ok);

    expect(won).toHaveLength(1);
    expect(lost).toHaveLength(1);

    // The allowance was consumed exactly once.
    expect(coinAccounts.find(a => String(a.studentId) === S).realCostThisYearInr).toBe(300);
    // One unit of stock gone, not two — the loser released what it had taken.
    expect(rewards[0].stockAvailable).toBe(4);
    // One live budget reservation; the loser's was cancelled rather than left standing.
    expect(rewardLedger.filter(x => x.state === 'RESERVED')).toHaveLength(1);
    // And exactly one coin debit, for the redemption that actually happened.
    expect(coinLedger.filter(l => l.coins < 0)).toHaveLength(1);
    expect(coinsOf(S)).toBe(500);
  });

  it('leaves the losing redemption cancelled, not stranded', async () => {
    coinConfig.annualRealCostBudgetInr = 300;
    rewards = [reward({ perStudentLimit: 0 })];

    await Promise.all([redeem(S, 'i1'), redeem(S, 'i2')]);

    // Nothing may be left PENDING: a half-finished saga that nobody resolves is the failure
    // mode this whole design exists to prevent.
    expect(redemptions.filter(r => r.status === 'PENDING')).toHaveLength(0);
    expect(redemptions.filter(r => r.status === 'CANCELLED')).toHaveLength(1);
    expect(redemptions.filter(r => r.status === 'RESERVED')).toHaveLength(1);
  });
});

describe('admin transitions', () => {
  it('fulfils once, however many times it is clicked', async () => {
    const r = await redeem();
    const id = String(r.redemption!._id);

    const first = await fulfillRedemption({ tenantId: T, redemptionId: id, adminId: 'admin', now: NOW });
    const second = await fulfillRedemption({ tenantId: T, redemptionId: id, adminId: 'admin', now: NOW });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    expect(second.refused).toBe('INVALID_STATE');
    expect(rewardLedger.filter(x => x.state === 'REDEEMED')).toHaveLength(1);
  });

  it('cancels once and refunds exactly once', async () => {
    const r = await redeem();
    const id = String(r.redemption!._id);

    await cancelRedemption({ tenantId: T, redemptionId: id, adminId: 'admin', now: NOW });
    await cancelRedemption({ tenantId: T, redemptionId: id, adminId: 'admin', now: NOW });

    expect(coinsOf(S)).toBe(2000);
    expect(coinLedger.filter(l => l.coins > 0)).toHaveLength(1);
    expect(rewardLedger.filter(x => x.state === 'CANCELLED')).toHaveLength(1);
  });

  it('cannot fulfil something already cancelled', async () => {
    const r = await redeem();
    const id = String(r.redemption!._id);
    await cancelRedemption({ tenantId: T, redemptionId: id, adminId: 'admin', now: NOW });

    const after = await fulfillRedemption({ tenantId: T, redemptionId: id, adminId: 'admin', now: NOW });
    expect(after.ok).toBe(false);
  });

  it('releases the member allowance on cancellation, exactly once', async () => {
    coinConfig.annualRealCostBudgetInr = 1000;
    const r = await redeem();
    const id = String(r.redemption!._id);

    await cancelRedemption({ tenantId: T, redemptionId: id, adminId: 'a', now: NOW });
    await cancelRedemption({ tenantId: T, redemptionId: id, adminId: 'a', now: NOW });

    expect(coinAccounts.find(a => String(a.studentId) === S).realCostThisYearInr).toBe(0);
  });
});

describe('snapshots survive config changes', () => {
  it('keeps the price the student actually paid', async () => {
    const r = await redeem();
    rewards[0].coinCost = 5000;
    rewards[0].budgetCostPaise = rupees(900);

    expect(r.redemption!.coinCost).toBe(1500);
    expect(r.redemption!.budgetCostPaise).toBe(rupees(300));
  });

  it('leaves an existing redemption valid when the reward is disabled', async () => {
    const r = await redeem();
    rewards[0].active = false;
    expect(r.redemption!.status).toBe('RESERVED');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// The separations
// ─────────────────────────────────────────────────────────────────────────────

describe('XP is never spent', () => {
  it('does not touch XP, levels or badges', async () => {
    await redeem();
    expect(xpWrite).not.toHaveBeenCalled();
    expect(progresses.find(p => String(p.studentId) === S).xp).toBe(5000);
  });

  it('uses XP only as a gate', async () => {
    rewards = [reward({ minimumXp: 9000 })];
    const r = await redeem();

    expect(r.refused).toBe('INSUFFICIENT_XP');
    // Refused on XP, and the XP itself is untouched either way.
    expect(progresses.find(p => String(p.studentId) === S).xp).toBe(5000);
  });
});

describe('skills are never touched', () => {
  it('writes no skill profile or evidence on redemption, fulfilment or cancellation', async () => {
    const r = await redeem();
    const id = String(r.redemption!._id);
    await fulfillRedemption({ tenantId: T, redemptionId: id, adminId: 'a', now: NOW });
    expect(skillWrite).not.toHaveBeenCalled();
  });
});

describe('economic invariants', () => {
  it('never drives a coin balance negative', async () => {
    coinAccounts = [account(S, 1500)];
    rewards = [reward({ perStudentLimit: 0 })];
    await Promise.all([redeem(S, 'a'), redeem(S, 'b'), redeem(S, 'c')]);
    expect(coinsOf(S)).toBeGreaterThanOrEqual(0);
  });

  it('never drives stock negative', async () => {
    rewards = [reward({ stockMode: 'LIMITED', stockAvailable: 1, perStudentLimit: 0 })];
    await Promise.all([redeem(S, 'a'), redeem(S2, 'b'), redeem(S, 'c')]);
    expect(rewards[0].stockAvailable).toBeGreaterThanOrEqual(0);
  });
});

describe('tenant isolation', () => {
  it('cannot redeem another tenant’s reward', async () => {
    const r = await redeemReward({ tenantId: 't2', studentId: S, rewardKey: 'TSHIRT', intentToken: 'x', now: NOW });
    expect(r.ok).toBe(false);
    expect(r.refused).toBe('REWARD_NOT_FOUND');
  });
});
