/**
 * Module 11 — how much reward value the business is willing to owe.
 *
 * This is the one part of gamification that touches money, so the properties are financial
 * rather than motivational:
 *
 *   IT CANNOT OVERSPEND.        Two students cannot both take the last ₹500.
 *   IT CANNOT GUESS REVENUE.    Only genuinely paid membership counts. A created order, a
 *                               failed card, a refund and a course fee are all rows in the
 *                               same collection and none of them is CareerPilot revenue.
 *   IT CANNOT BE RETROACTIVE.   Turning rewards on must not capitalise the entire history of
 *                               the product into a bill somebody has to honour.
 *   XP CREATES NO LIABILITY.    Points are not money and reserve nothing.
 */

let config: any = null;
let payments: any[] = [];
let rewards: any[] = [];

const matches = (doc: any, q: any): boolean =>
  Object.entries(q).every(([k, cond]: [string, any]) => {
    const value = doc[k];
    if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
      if ('$in' in cond) return cond.$in.map(String).includes(String(value));
      if ('$gte' in cond && '$lt' in cond) {
        return new Date(value) >= new Date(cond.$gte) && new Date(value) < new Date(cond.$lt);
      }
      if ('$gte' in cond) return new Date(value) >= new Date(cond.$gte);
    }
    return String(value) === String(cond);
  });

jest.mock('../models/GamificationModels', () => ({
  __esModule: true,
  GamificationConfig: {
    findOne: () => ({ lean: async () => config }),
    updateOne: async () => ({ modifiedCount: 1 }),
  },
  RewardLedger: {
    create: async (doc: any) => {
      if (rewards.some(r => r.tenantId === doc.tenantId && r.idempotencyKey === doc.idempotencyKey)) {
        const err: any = new Error('E11000 duplicate key'); err.code = 11000; throw err;
      }
      const row = { ...doc, _id: `rl${rewards.length + 1}` };
      rewards.push(row);
      return row;
    },
    find: (q: any) => ({
      sort: () => ({ lean: async () => rewards.filter(r => matches(r, q)) }),
    }),
    updateOne: async (filter: any, update: any) => {
      const row = rewards.find(r => String(r._id) === String(filter._id));
      if (row && update.$set) Object.assign(row, update.$set);
      return { modifiedCount: row ? 1 : 0 };
    },
    aggregate: async (pipeline: any[]) => {
      const match = pipeline.find(p => p.$match)?.$match || {};
      const rows = rewards.filter(r => matches(r, match));
      const states = [...new Set(rows.map(r => r.state))];
      return states.map(s => ({
        _id: s,
        total: rows.filter(r => r.state === s).reduce((n, r) => n + r.valuePaise, 0),
        students: [...new Set(rows.filter(r => r.state === s).map(r => String(r.studentId)))],
      }));
    },
  },
  XpRule: {}, XpLedger: {}, BadgeDefinition: {}, StudentBadge: {},
}));

jest.mock('../models/Payment', () => ({
  __esModule: true,
  default: {
    aggregate: async (pipeline: any[]) => {
      const m = pipeline.find(p => p.$match)?.$match || {};
      const rows = payments.filter(p =>
        p.status === m.status && p.purpose === m.purpose
        && new Date(p.paidAt) >= new Date(m.paidAt.$gte)
        && new Date(p.paidAt) < new Date(m.paidAt.$lt));
      return rows.length ? [{ _id: null, total: rows.reduce((n, r) => n + r.amount, 0) }] : [];
    },
  },
}));

import {
  budgetSummary, reserveReward, eligibleRevenuePaise, periodKey,
} from '../services/rewardBudgetService';
import { budgetFromRevenue } from '../data/gamificationPolicy';

const TENANT = 't1';
const NOW = new Date('2026-08-17T09:00:00Z');
const PERIOD = '2026-08';

/** ₹ to paise, so the fixtures read in money and the code still sees integers. */
const rupees = (n: number) => Math.round(n * 100);

const paid = (amountRupees: number, at: string, over: any = {}) => ({
  tenantId: TENANT, status: 'paid', purpose: 'passport_membership',
  amount: rupees(amountRupees), paidAt: new Date(at), ...over,
});

beforeEach(() => {
  config = null;
  payments = [];
  rewards = [];
});

describe('manual budget', () => {
  beforeEach(() => {
    config = { tenantId: TENANT, reward: { enabled: true, mode: 'MANUAL', manualBudgetPaise: rupees(50000), capPaise: 0, basisPoints: 0 } };
  });

  it('is exactly what the admin set', async () => {
    const s = await budgetSummary(TENANT, PERIOD);
    expect(s.effectiveBudgetPaise).toBe(rupees(50000));
    expect(s.availablePaise).toBe(rupees(50000));
    // §48: no revenue is consulted, and none is guessed.
    expect(s.revenueBasePaise).toBe(0);
  });

  it('shrinks as value is committed', async () => {
    await reserveReward({ tenantId: TENANT, studentId: 's1', valuePaise: rupees(500), reason: 'top10', idempotencyKey: 'k1', now: NOW });
    const s = await budgetSummary(TENANT, PERIOD);
    expect(s.reservedPaise).toBe(rupees(500));
    expect(s.availablePaise).toBe(rupees(49500));
  });
});

describe('percentage budget', () => {
  beforeEach(() => {
    // 2% — expressed as basis points so no float decides what is owed.
    config = { tenantId: TENANT, reward: { enabled: true, mode: 'PERCENTAGE', basisPoints: 200, manualBudgetPaise: 0, capPaise: 0 } };
  });

  it('is a share of genuinely paid membership revenue', async () => {
    payments = [paid(600000, '2026-08-05'), paid(400000, '2026-08-12')];
    const s = await budgetSummary(TENANT, PERIOD);

    expect(s.revenueBasePaise).toBe(rupees(1000000));
    expect(s.effectiveBudgetPaise).toBe(rupees(20000));      // 2% of ₹10,00,000
  });

  it('ignores everything that is not paid membership revenue', async () => {
    payments = [
      paid(100000, '2026-08-05'),
      paid(500000, '2026-08-06', { status: 'created' }),
      paid(500000, '2026-08-07', { status: 'failed' }),
      paid(500000, '2026-08-08', { status: 'refunded' }),
      paid(500000, '2026-08-09', { purpose: 'fee' }),
    ];
    const s = await budgetSummary(TENANT, PERIOD);
    // Only the first row is CareerPilot money that actually arrived.
    expect(s.revenueBasePaise).toBe(rupees(100000));
  });

  it('ignores revenue from other periods', async () => {
    payments = [paid(100000, '2026-07-20'), paid(200000, '2026-08-10'), paid(300000, '2026-09-02')];
    const s = await budgetSummary(TENANT, PERIOD);
    expect(s.revenueBasePaise).toBe(rupees(200000));
  });

  it('applies a cap when the percentage would exceed it', async () => {
    config.reward.capPaise = rupees(15000);
    payments = [paid(1000000, '2026-08-05')];
    const s = await budgetSummary(TENANT, PERIOD);

    expect(s.calculatedBudgetPaise).toBe(rupees(20000));
    expect(s.effectiveBudgetPaise).toBe(rupees(15000));
  });

  it('keeps the arithmetic in integers', async () => {
    payments = [paid(3333.33, '2026-08-05')];
    const s = await budgetSummary(TENANT, PERIOD);
    expect(Number.isInteger(s.revenueBasePaise)).toBe(true);
    expect(Number.isInteger(s.effectiveBudgetPaise)).toBe(true);
    expect(budgetFromRevenue(333333, 200)).toBe(6666);       // floored, never 6666.66
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §147, §173 — the retroactive-liability guard
// ─────────────────────────────────────────────────────────────────────────────

describe('the effective date', () => {
  it('excludes revenue earned before the policy started', async () => {
    config = {
      tenantId: TENANT,
      reward: {
        enabled: true, mode: 'PERCENTAGE', basisPoints: 200, capPaise: 0,
        effectiveFrom: new Date('2026-08-10T00:00:00Z'),
      },
    };
    payments = [paid(500000, '2026-08-05'), paid(500000, '2026-08-15')];

    const s = await budgetSummary(TENANT, PERIOD);
    // Only the payment after the policy began contributes.
    expect(s.revenueBasePaise).toBe(rupees(500000));
  });

  it('refuses to commit value before the policy is in force', async () => {
    config = {
      tenantId: TENANT,
      reward: {
        enabled: true, mode: 'MANUAL', manualBudgetPaise: rupees(50000), capPaise: 0,
        effectiveFrom: new Date('2026-09-01T00:00:00Z'),
      },
    };

    const r = await reserveReward({
      tenantId: TENANT, studentId: 's1', valuePaise: rupees(500),
      reason: 'top10', idempotencyKey: 'k1', now: NOW,
    });

    expect(r.reserved).toBe(false);
    expect(r.refused).toBe('before_effective_date');
    expect(rewards.filter(x => x.state === 'RESERVED')).toHaveLength(0);
  });

  it('does not turn a student’s historic XP into a bill', async () => {
    // §173/§150: nothing about a balance creates liability. Only an explicit reservation
    // does, and there has been none.
    config = { tenantId: TENANT, reward: { enabled: true, mode: 'MANUAL', manualBudgetPaise: rupees(50000), capPaise: 0 } };
    const s = await budgetSummary(TENANT, PERIOD);

    expect(s.reservedPaise).toBe(0);
    expect(s.redeemedPaise).toBe(0);
    expect(s.availablePaise).toBe(s.effectiveBudgetPaise);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §54, §55 — it cannot overspend
// ─────────────────────────────────────────────────────────────────────────────

describe('budget safety', () => {
  beforeEach(() => {
    config = { tenantId: TENANT, reward: { enabled: true, mode: 'MANUAL', manualBudgetPaise: rupees(500), capPaise: 0 } };
  });

  it('lets the last of the budget be committed once', async () => {
    const r = await reserveReward({ tenantId: TENANT, studentId: 's1', valuePaise: rupees(500), reason: 'x', idempotencyKey: 'k1', now: NOW });
    expect(r.reserved).toBe(true);

    const s = await budgetSummary(TENANT, PERIOD);
    expect(s.availablePaise).toBe(0);
  });

  it('refuses the second claim on the same last ₹500', async () => {
    await reserveReward({ tenantId: TENANT, studentId: 's1', valuePaise: rupees(500), reason: 'x', idempotencyKey: 'k1', now: NOW });
    const second = await reserveReward({ tenantId: TENANT, studentId: 's2', valuePaise: rupees(500), reason: 'x', idempotencyKey: 'k2', now: NOW });

    expect(second.reserved).toBe(false);
    expect(second.refused).toBe('insufficient_budget');
  });

  it('does not allocate ₹1,000 when two students race for ₹500', async () => {
    const [a, b] = await Promise.all([
      reserveReward({ tenantId: TENANT, studentId: 's1', valuePaise: rupees(500), reason: 'x', idempotencyKey: 'k1', now: NOW }),
      reserveReward({ tenantId: TENANT, studentId: 's2', valuePaise: rupees(500), reason: 'x', idempotencyKey: 'k2', now: NOW }),
    ]);

    expect([a.reserved, b.reserved].filter(Boolean)).toHaveLength(1);
    const live = rewards.filter(r => r.state === 'RESERVED');
    expect(live.reduce((n, r) => n + r.valuePaise, 0)).toBeLessThanOrEqual(rupees(500));
  });

  it('never reports negative headroom', async () => {
    await reserveReward({ tenantId: TENANT, studentId: 's1', valuePaise: rupees(500), reason: 'x', idempotencyKey: 'k1', now: NOW });
    await reserveReward({ tenantId: TENANT, studentId: 's2', valuePaise: rupees(900), reason: 'x', idempotencyKey: 'k2', now: NOW });

    const s = await budgetSummary(TENANT, PERIOD);
    expect(s.availablePaise).toBeGreaterThanOrEqual(0);
  });

  it('is idempotent on the reservation key', async () => {
    await reserveReward({ tenantId: TENANT, studentId: 's1', valuePaise: rupees(100), reason: 'x', idempotencyKey: 'same', now: NOW });
    const again = await reserveReward({ tenantId: TENANT, studentId: 's1', valuePaise: rupees(100), reason: 'x', idempotencyKey: 'same', now: NOW });

    expect(again.refused).toBe('duplicate');
    expect(rewards.filter(r => r.state === 'RESERVED')).toHaveLength(1);
  });
});

describe('rewards are off until somebody turns them on', () => {
  it('refuses to commit anything while disabled', async () => {
    config = { tenantId: TENANT, reward: { enabled: false, mode: 'MANUAL', manualBudgetPaise: rupees(50000) } };
    const r = await reserveReward({ tenantId: TENANT, studentId: 's1', valuePaise: rupees(500), reason: 'x', idempotencyKey: 'k1', now: NOW });

    expect(r.reserved).toBe(false);
    expect(r.refused).toBe('rewards_disabled');
  });

  it('defaults to disabled with no budget when nothing is configured', async () => {
    const s = await budgetSummary(TENANT, PERIOD);
    expect(s.enabled).toBe(false);
    expect(s.effectiveBudgetPaise).toBe(0);
  });
});

describe('periods', () => {
  it('names a month the way the ledger stores it', () => {
    expect(periodKey(new Date('2026-08-17T00:00:00Z'))).toBe('2026-08');
    expect(periodKey(new Date('2026-12-01T00:00:00Z'))).toBe('2026-12');
  });

  it('counts revenue only inside the period asked for', async () => {
    payments = [paid(100000, '2026-08-31T23:00:00Z'), paid(100000, '2026-09-01T01:00:00Z')];
    expect(await eligibleRevenuePaise(TENANT, '2026-08', null)).toBe(rupees(100000));
  });
});
