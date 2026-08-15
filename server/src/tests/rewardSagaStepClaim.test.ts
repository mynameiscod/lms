/**
 * Regression: one saga step, one execution — per redemption.
 *
 * The saga guarded each resource by its own capacity and then recorded progress in a boolean
 * on the redemption. Two concurrent resumes of the SAME PENDING redemption both read that
 * boolean as false and both performed the step. Capacity guards did not save it: with five
 * T-shirts in stock, `stockAvailable >= 1` happily let one redemption take two, while the
 * single flag recorded one — so compensation returned one unit and leaked the other.
 *
 * The member's annual allowance was worse. Unlike coins and the tenant budget it has no
 * idempotency key of its own, so nothing downstream would have refused the repeat: one
 * redemption could consume a member's financial cap twice.
 *
 * The fix moves the gate onto the redemption document: NONE → CLAIMED is an atomic
 * conditional update, so exactly one worker performs each step. Downstream keys remain as a
 * second layer, but nothing relies on an in-memory read any more.
 */

let coinAccounts: any[] = [];
let coinLedger: any[] = [];
let coinConfig: any = null;
let rewards: any[] = [];
let redemptions: any[] = [];
let rewardLedger: any[] = [];
let gamConfig: any = null;

const oidStr = (v: any) => String(v?._id ?? v);
const getPath = (doc: any, path: string): any =>
  path.split('.').reduce((o: any, part: string) => (o == null ? o : o[part]), doc);

const matches = (doc: any, q: any): boolean =>
  Object.entries(q).every(([k, cond]: [string, any]) => {
    const value = k === '_id' ? oidStr(doc._id ?? doc)
      : (k === 'studentId' ? String(doc.studentId) : getPath(doc, k));
    if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
      if ('$ne' in cond) return String(value) !== String(cond.$ne);
      if ('$in' in cond) return cond.$in.map(String).includes(String(value));
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
    const parts = f.split('.');
    let t = target;
    for (let i = 0; i < parts.length - 1; i++) { t[parts[i]] = t[parts[i]] || {}; t = t[parts[i]]; }
    t[parts[parts.length - 1]] = v;
  }
}

const docify = (o: any) => ({ ...o, markModified: () => {}, save: async function () { return this; } });

jest.mock('../models/CoinModels', () => ({
  __esModule: true,
  CoinConfig: {
    findOne: () => { const h: any = Promise.resolve(coinConfig); h.lean = async () => coinConfig; return h; },
    create: async (o: any) => { coinConfig = { ...coinConfig, ...o }; return coinConfig; },
  },
  CoinRule: { find: () => ({ lean: async () => [] }) },
  COIN_EVENTS: [],
  CoinAccount: {
    findOneAndUpdate: async (filter: any, update: any, opts?: any) => {
      let acc = coinAccounts.find(a => matches(a, { tenantId: filter.tenantId, studentId: filter.studentId }));
      if (!acc && opts?.upsert) {
        acc = { tenantId: filter.tenantId, studentId: filter.studentId, balance: 0, lifetimeEarned: 0, lifetimeSpent: 0, realCostThisYearInr: 0, budgetYearStart: new Date() };
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
      coinLedger.push({ ...doc }); return doc;
    },
    deleteOne: async (q: any) => {
      const i = coinLedger.findIndex(l => l.idempotencyKey === q.idempotencyKey);
      if (i >= 0) coinLedger.splice(i, 1);
      return { deletedCount: 1 };
    },
    aggregate: async () => [],
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
    updateOne: async (filter: any, update: any) => {
      const r = rewards.find(x => matches(x, filter));
      if (!r) return { modifiedCount: 0 };
      applyUpdate(r, update);
      return { modifiedCount: 1 };
    },
  },
  RewardRedemption: {
    create: async (doc: any) => {
      const row = docify({
        ...doc, _id: `rd${redemptions.length + 1}`,
        steps: { stock: 'NONE', tenantBudget: 'NONE', memberBudget: 'NONE', coins: 'NONE', ...(doc.steps || {}) },
      });
      redemptions.push(row); return row;
    },
    findOne: (q: any) => {
      const hit = redemptions.find(r => matches(r, q));
      const h: any = Promise.resolve(hit || null);
      h.lean = async () => hit || null;
      return h;
    },
    find: (q: any) => ({
      sort: () => ({ limit: () => ({ lean: async () => redemptions.filter(r => matches(r, q)) }) }),
      select: () => ({ lean: async () => redemptions.filter(r => matches(r, q)) }),
      lean: async () => redemptions.filter(r => matches(r, q)),
    }),
    // The step claim. Its filter is what serialises concurrent workers, so the mock honours
    // it exactly — flip this to ignore the filter and every test below fails.
    updateOne: async (filter: any, update: any) => {
      const r = redemptions.find(x => matches(x, filter));
      if (!r) return { modifiedCount: 0 };
      applyUpdate(r, update);
      return { modifiedCount: 1 };
    },
    findOneAndUpdate: async (filter: any, update: any) => {
      const r = redemptions.find(x => matches(x, filter));
      if (!r) return null;
      applyUpdate(r, update);
      return r;
    },
    countDocuments: async (q: any) => redemptions.filter(r => matches(r, q)).length,
  },
}));

jest.mock('../models/GamificationModels', () => ({
  __esModule: true,
  GamificationConfig: { findOne: () => ({ lean: async () => gamConfig }) },
  RewardLedger: {
    create: async (doc: any) => {
      if (rewardLedger.some(r => r.tenantId === doc.tenantId && r.idempotencyKey === doc.idempotencyKey)) {
        const e: any = new Error('E11000'); e.code = 11000; throw e;
      }
      const row = { ...doc, _id: `rl${rewardLedger.length + 1}` };
      rewardLedger.push(row); return row;
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
      return [...new Set(rows.map(r => r.state))].map(st => ({
        _id: st,
        total: rows.filter(r => r.state === st).reduce((n, r) => n + r.valuePaise, 0),
        students: [],
      }));
    },
  },
  StudentBadge: { find: () => ({ select: () => ({ lean: async () => [] }) }) },
}));

jest.mock('../models/PassportProgress', () => ({
  __esModule: true,
  default: { findOne: () => ({ select: () => ({ lean: async () => ({ xp: 5000 }) }) }), updateOne: async () => ({}) },
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

import { redeemReward, resumeRedemption, cancelRedemption } from '../services/rewardRedemptionService';
import { invalidateCoinCache } from '../services/coinService';

const T = 't1';
const S = 's1';
const NOW = new Date('2026-08-17T09:00:00Z');
const rupees = (n: number) => Math.round(n * 100);

const theReward = () => rewards[0];
const theRedemption = () => redemptions[0];

/** A PENDING redemption that has acquired nothing — the state a crash leaves behind. */
async function makePending(stock = 5) {
  rewards = [{
    tenantId: T, key: 'TSHIRT', name: 'T-Shirt', description: '', type: 'PHYSICAL',
    iconKey: 'bi-gift-fill', coinCost: 500, budgetCostPaise: rupees(300),
    active: true, studentVisible: true,
    stockMode: 'LIMITED', stockAvailable: stock, stockReserved: 0, stockFulfilled: 0,
    perStudentLimit: 0, totalRedemptionLimit: 0, totalRedeemed: 0,
    minimumXp: 0, minimumLevel: 0, requiredBadgeKeys: [],
    fulfillmentType: 'MANUAL', displayOrder: 100,
  }];

  const row = docify({
    _id: 'rd1', tenantId: T, studentId: S, rewardKey: 'TSHIRT',
    coinCost: 500, budgetCostPaise: rupees(300),
    rewardName: 'T-Shirt', rewardType: 'PHYSICAL',
    status: 'PENDING',
    steps: { stock: 'NONE', tenantBudget: 'NONE', memberBudget: 'NONE', coins: 'NONE' },
    idempotencyKey: 'TSHIRT:intent-1', budgetPeriod: '2026-08', requestedAt: NOW,
  });
  redemptions.push(row);
  return row;
}

beforeEach(() => {
  coinAccounts = [{ tenantId: T, studentId: S, balance: 5000, lifetimeEarned: 5000, lifetimeSpent: 0, realCostThisYearInr: 0, budgetYearStart: new Date('2026-01-01') }];
  coinLedger = [];
  coinConfig = { tenantId: T, enabled: true, coinsPerRupee: 5, monthlyEarnCap: 0, annualRealCostBudgetInr: 10000, expiryMonths: 0, minRedemption: 0, freeMembersAccrue: true };
  rewards = [];
  redemptions = [];
  rewardLedger = [];
  gamConfig = { tenantId: T, reward: { enabled: true, mode: 'MANUAL', manualBudgetPaise: rupees(50000), capPaise: 0 } };
  invalidateCoinCache(T);
});

// ─────────────────────────────────────────────────────────────────────────────
// The defect: two resumes of ONE redemption
// ─────────────────────────────────────────────────────────────────────────────

describe('two concurrent resumes of the same PENDING redemption', () => {
  it('reserve exactly one unit of stock', async () => {
    const pending = await makePending(5);
    await Promise.all([resumeRedemption(pending, NOW), resumeRedemption(pending, NOW)]);

    // The heart of it: capacity was never the constraint — five units were available, and
    // the old code let one redemption take two.
    expect(theReward().stockReserved).toBe(1);
    expect(theReward().stockAvailable).toBe(4);
  });

  it('never increment stockReserved twice even with plenty of stock', async () => {
    const pending = await makePending(50);
    await Promise.all([
      resumeRedemption(pending, NOW),
      resumeRedemption(pending, NOW),
      resumeRedemption(pending, NOW),
    ]);

    expect(theReward().stockReserved).toBe(1);
    expect(theReward().stockAvailable).toBe(49);
  });

  it('produce one tenant-budget reservation', async () => {
    const pending = await makePending();
    await Promise.all([resumeRedemption(pending, NOW), resumeRedemption(pending, NOW)]);

    expect(rewardLedger.filter(r => r.state === 'RESERVED')).toHaveLength(1);
  });

  it('consume the member annual allowance once', async () => {
    // The step with no key of its own: nothing downstream would have refused a repeat, so
    // the claim is the only thing standing between this and a double-charged cap.
    const pending = await makePending();
    await Promise.all([resumeRedemption(pending, NOW), resumeRedemption(pending, NOW)]);

    expect(coinAccounts[0].realCostThisYearInr).toBe(300);
  });

  it('debit coins once', async () => {
    const pending = await makePending();
    await Promise.all([resumeRedemption(pending, NOW), resumeRedemption(pending, NOW)]);

    expect(coinLedger.filter(l => l.coins < 0)).toHaveLength(1);
    expect(coinAccounts[0].balance).toBe(4500);
  });

  it('settle the redemption exactly once', async () => {
    const pending = await makePending();
    await Promise.all([resumeRedemption(pending, NOW), resumeRedemption(pending, NOW)]);

    expect(theRedemption().status).toBe('RESERVED');
    // The reward's claim count must not be double-incremented by two workers both finishing.
    expect(theReward().totalRedeemed).toBe(1);
  });

  it('record every step as DONE exactly once', async () => {
    const pending = await makePending();
    await Promise.all([resumeRedemption(pending, NOW), resumeRedemption(pending, NOW)]);

    const steps = theRedemption().steps;
    expect(steps.stock).toBe('DONE');
    expect(steps.tenantBudget).toBe('DONE');
    expect(steps.memberBudget).toBe('DONE');
    expect(steps.coins).toBe('DONE');
  });
});

describe('cancelling after such a race', () => {
  it('restores exactly what was acquired — no more, no less', async () => {
    const pending = await makePending(5);
    await Promise.all([resumeRedemption(pending, NOW), resumeRedemption(pending, NOW)]);

    await cancelRedemption({ tenantId: T, redemptionId: 'rd1', adminId: 'admin', now: NOW });

    // One unit back, not two — the leak the old boolean caused.
    expect(theReward().stockAvailable).toBe(5);
    expect(theReward().stockReserved).toBe(0);
    // One refund, and the member's allowance released once.
    expect(coinAccounts[0].balance).toBe(5000);
    expect(coinLedger.filter(l => l.coins > 0)).toHaveLength(1);
    expect(coinAccounts[0].realCostThisYearInr).toBe(0);
    expect(rewardLedger.filter(r => r.state === 'CANCELLED')).toHaveLength(1);
  });

  it('is safe to cancel twice', async () => {
    const pending = await makePending(5);
    await Promise.all([resumeRedemption(pending, NOW), resumeRedemption(pending, NOW)]);

    await cancelRedemption({ tenantId: T, redemptionId: 'rd1', adminId: 'a', now: NOW });
    await cancelRedemption({ tenantId: T, redemptionId: 'rd1', adminId: 'a', now: NOW });

    expect(theReward().stockAvailable).toBe(5);
    expect(coinAccounts[0].balance).toBe(5000);
    expect(coinLedger.filter(l => l.coins > 0)).toHaveLength(1);
  });
});

describe('a genuinely separate redemption is unaffected', () => {
  it('can still reserve another unit of stock with a different intent', async () => {
    const pending = await makePending(5);
    await Promise.all([resumeRedemption(pending, NOW), resumeRedemption(pending, NOW)]);

    // A second, legitimate redemption — different intent, so a different redemption entirely.
    const second = await redeemReward({
      tenantId: T, studentId: S, rewardKey: 'TSHIRT', intentToken: 'intent-2', now: NOW,
    });

    expect(second.ok).toBe(true);
    // Two units now committed: the claim narrows a redemption to one step, not the shop to
    // one sale.
    expect(theReward().stockReserved).toBe(2);
    expect(theReward().stockAvailable).toBe(3);
    expect(coinLedger.filter(l => l.coins < 0)).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// The races BETWEEN redemptions must still behave
// ─────────────────────────────────────────────────────────────────────────────

describe('races between different redemptions still hold', () => {
  it('cannot oversell the last unit', async () => {
    await makePending(1);
    redemptions.length = 0;                      // start clean; both go through redeemReward
    theReward().stockAvailable = 1;

    const [a, b] = await Promise.all([
      redeemReward({ tenantId: T, studentId: S, rewardKey: 'TSHIRT', intentToken: 'i1', now: NOW }),
      redeemReward({ tenantId: T, studentId: 's2', rewardKey: 'TSHIRT', intentToken: 'i2', now: NOW }),
    ]);

    expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1);
    expect(theReward().stockAvailable).toBe(0);
    expect(theReward().stockReserved).toBe(1);
  });

  it('cannot exceed the member annual allowance across two redemptions', async () => {
    await makePending(10);
    redemptions.length = 0;
    coinConfig.annualRealCostBudgetInr = 300;    // room for exactly one ₹300 reward
    invalidateCoinCache(T);

    await Promise.all([
      redeemReward({ tenantId: T, studentId: S, rewardKey: 'TSHIRT', intentToken: 'i1', now: NOW }),
      redeemReward({ tenantId: T, studentId: S, rewardKey: 'TSHIRT', intentToken: 'i2', now: NOW }),
    ]);

    expect(coinAccounts[0].realCostThisYearInr).toBeLessThanOrEqual(300);
  });

  it('cannot spend the same coins twice across two redemptions', async () => {
    await makePending(10);
    redemptions.length = 0;
    coinAccounts[0].balance = 500;               // enough for exactly one

    await Promise.all([
      redeemReward({ tenantId: T, studentId: S, rewardKey: 'TSHIRT', intentToken: 'i1', now: NOW }),
      redeemReward({ tenantId: T, studentId: S, rewardKey: 'TSHIRT', intentToken: 'i2', now: NOW }),
    ]);

    expect(coinAccounts[0].balance).toBeGreaterThanOrEqual(0);
    expect(coinLedger.filter(l => l.coins < 0)).toHaveLength(1);
  });
});
