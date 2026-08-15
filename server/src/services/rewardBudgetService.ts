import mongoose from 'mongoose';
import Payment from '../models/Payment';
import { GamificationConfig, RewardLedger } from '../models/GamificationModels';
import {
  budgetFromRevenue, REVENUE_PAYMENT_STATUS, REVENUE_PAYMENT_PURPOSE,
} from '../data/gamificationPolicy';

/**
 * How much reward value the business is willing to owe, and how much is left.
 *
 * THIS GOVERNS MONEY, NOT XP. Earning experience points creates no liability whatsoever —
 * a student with 50,000 XP has reserved nothing. Only an explicit, configured reward event
 * commits value, which is what stops an engagement mechanic quietly becoming a payable.
 *
 * EVERYTHING IS INTEGER PAISE. Payment.amount is already the smallest currency unit and
 * percentages are basis points, so no floating point ever decides what is owed. Rupees exist
 * only at the edge, for display.
 *
 * REVENUE IS NEVER GUESSED. The percentage mode reads real paid membership payments. If a
 * business wants a budget without that, it sets a manual figure — an honest number beats a
 * calculated one derived from an assumption.
 */

export interface BudgetSummary {
  enabled: boolean;
  mode: 'MANUAL' | 'PERCENTAGE';
  period: string;
  /** Paid membership revenue counted for this period. 0 in manual mode. */
  revenueBasePaise: number;
  basisPoints: number;
  /** Before any cap. */
  calculatedBudgetPaise: number;
  capPaise: number;
  /** What may actually be committed. */
  effectiveBudgetPaise: number;
  reservedPaise: number;
  redeemedPaise: number;
  /** Never negative. */
  availablePaise: number;
  effectiveFrom: Date | null;
  studentsRewarded: number;
  averageRewardPaise: number;
}

/** 'YYYY-MM' — the monthly period a date belongs to. */
export const periodKey = (d: Date): string =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

const periodBounds = (period: string): { start: Date; end: Date } => {
  const [y, m] = period.split('-').map(Number);
  return {
    start: new Date(Date.UTC(y, m - 1, 1)),
    end: new Date(Date.UTC(y, m, 1)),
  };
};

/**
 * Paid membership revenue inside a period.
 *
 * Only `status: 'paid'` and only membership purchases: a created-but-abandoned order, a
 * failed card, a refund and a fee instalment are all real rows in this collection and none
 * of them is money this product earned from CareerPilot.
 *
 * Payments before `effectiveFrom` are excluded, which is the whole point of that date — see
 * the note on the config.
 */
export async function eligibleRevenuePaise(
  tenantId: string, period: string, effectiveFrom?: Date | null,
): Promise<number> {
  const { start, end } = periodBounds(period);
  const from = effectiveFrom && effectiveFrom > start ? effectiveFrom : start;
  if (from >= end) return 0;

  const [row] = await Payment.aggregate([
    {
      $match: {
        tenantId: mongoose.Types.ObjectId.isValid(tenantId)
          ? new mongoose.Types.ObjectId(tenantId) : tenantId,
        status: REVENUE_PAYMENT_STATUS,
        purpose: REVENUE_PAYMENT_PURPOSE,
        paidAt: { $gte: from, $lt: end },
      },
    },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  return Math.max(0, Math.round(row?.total || 0));
}

/** Tenant settings, with the shipped defaults when nothing has been configured. */
export async function getConfig(tenantId: string) {
  const cfg: any = await GamificationConfig.findOne({ tenantId }).lean();
  return cfg || {
    tenantId,
    leaderboard: {
      collegeEnabled: true, globalEnabled: false,
      weeklyEnabled: true, monthlyEnabled: true, allTimeEnabled: true, topN: 50,
    },
    // Rewards are OFF until somebody turns them on. A gamification layer that starts
    // spending money the moment it is deployed is not a feature, it is an incident.
    reward: { enabled: false, mode: 'MANUAL', manualBudgetPaise: 0, basisPoints: 0, capPaise: 0 },
  };
}

/** What a period's budget is, and what is left of it. */
export async function budgetSummary(
  tenantId: string, period: string = periodKey(new Date()),
): Promise<BudgetSummary> {
  const cfg = await getConfig(tenantId);
  const reward = cfg.reward || {};
  const effectiveFrom = reward.effectiveFrom ? new Date(reward.effectiveFrom) : null;

  const revenueBasePaise = reward.mode === 'PERCENTAGE'
    ? await eligibleRevenuePaise(tenantId, period, effectiveFrom)
    : 0;

  const calculatedBudgetPaise = reward.mode === 'PERCENTAGE'
    ? budgetFromRevenue(revenueBasePaise, reward.basisPoints || 0)
    : Math.max(0, reward.manualBudgetPaise || 0);

  const capPaise = Math.max(0, reward.capPaise || 0);
  const effectiveBudgetPaise = capPaise > 0
    ? Math.min(calculatedBudgetPaise, capPaise)
    : calculatedBudgetPaise;

  const committed = await RewardLedger.aggregate([
    { $match: { tenantId, period, state: { $in: ['RESERVED', 'REDEEMED'] } } },
    { $group: { _id: '$state', total: { $sum: '$valuePaise' }, students: { $addToSet: '$studentId' } } },
  ]);

  const reservedPaise = committed.find((c: any) => c._id === 'RESERVED')?.total || 0;
  const redeemedPaise = committed.find((c: any) => c._id === 'REDEEMED')?.total || 0;
  const students = new Set(committed.flatMap((c: any) => (c.students || []).map(String)));
  const spent = reservedPaise + redeemedPaise;

  return {
    enabled: !!reward.enabled,
    mode: reward.mode || 'MANUAL',
    period,
    revenueBasePaise,
    basisPoints: reward.basisPoints || 0,
    calculatedBudgetPaise,
    capPaise,
    effectiveBudgetPaise,
    reservedPaise,
    redeemedPaise,
    // Clamped at zero. A negative "available" would read as headroom in the wrong direction.
    availablePaise: Math.max(0, effectiveBudgetPaise - spent),
    effectiveFrom,
    studentsRewarded: students.size,
    averageRewardPaise: students.size ? Math.round(spent / students.size) : 0,
  };
}

export type ReservationRefusal =
  | 'rewards_disabled'
  | 'before_effective_date'
  | 'insufficient_budget'
  | 'duplicate';

export interface ReservationResult {
  reserved: boolean;
  refused?: ReservationRefusal;
  valuePaise: number;
  availablePaise: number;
}

/**
 * Commit reward value against a period's budget, atomically.
 *
 * TWO STUDENTS CANNOT SPEND THE SAME LAST ₹500. The ledger row is written first and the
 * budget is then re-checked; if the commitment would have overspent, the row is cancelled
 * rather than left standing. Reserving first and checking second is deliberate — the
 * opposite order has a window between the check and the write in which a second request
 * sees the same headroom, which is exactly the overspend this must not allow.
 *
 * FAILS CLOSED. Disabled rewards, a period before the effective date, or insufficient
 * budget all refuse. Nothing here can drive available below zero.
 */
export async function reserveReward(input: {
  tenantId: string;
  studentId: string;
  valuePaise: number;
  reason: string;
  idempotencyKey: string;
  now?: Date;
  createdBy?: string;
}): Promise<ReservationResult> {
  const now = input.now || new Date();
  const period = periodKey(now);
  const cfg = await getConfig(input.tenantId);

  if (!cfg.reward?.enabled) {
    return { reserved: false, refused: 'rewards_disabled', valuePaise: 0, availablePaise: 0 };
  }

  // Nothing earned before the policy started can draw on it. Without this, switching rewards
  // on would capitalise the entire history of the product into a bill.
  const effectiveFrom = cfg.reward.effectiveFrom ? new Date(cfg.reward.effectiveFrom) : null;
  if (effectiveFrom && now < effectiveFrom) {
    return { reserved: false, refused: 'before_effective_date', valuePaise: 0, availablePaise: 0 };
  }

  const value = Math.max(0, Math.round(input.valuePaise));

  let created: any;
  try {
    created = await RewardLedger.create({
      tenantId: input.tenantId, studentId: input.studentId, period,
      reason: input.reason, valuePaise: value, state: 'RESERVED',
      idempotencyKey: input.idempotencyKey, createdBy: input.createdBy,
    });
  } catch (e: any) {
    if (e?.code === 11000) {
      const summary = await budgetSummary(input.tenantId, period);
      return { reserved: false, refused: 'duplicate', valuePaise: 0, availablePaise: summary.availablePaise };
    }
    throw e;
  }

  /**
   * Re-check WITH this reservation counted, and settle any overrun by ORDER OF ARRIVAL.
   *
   * Simply cancelling whenever the total overran was wrong in the case it existed for: two
   * students racing for the last ₹500 both wrote a row, both saw ₹1,000 committed, and both
   * withdrew — so nobody got a reward the budget could actually afford. Cancelling the
   * loudest failure is not the same as cancelling the right one.
   *
   * Rows are therefore totalled oldest-first and this row gives way only if the budget is
   * already spent by the time its own turn comes. Exactly one of any number of racing
   * claims survives, deterministically, and it is the earliest.
   */
  const summary = await budgetSummary(input.tenantId, period);

  const committedRows = await RewardLedger
    .find({ tenantId: input.tenantId, period, state: { $in: ['RESERVED', 'REDEEMED'] } })
    .sort({ createdAt: 1, _id: 1 }).lean() as any[];

  let runningTotal = 0;
  let overran = false;
  for (const row of committedRows) {
    runningTotal += row.valuePaise;
    if (String(row._id) === String(created._id)) {
      overran = runningTotal > summary.effectiveBudgetPaise;
      break;
    }
  }

  if (overran) {
    await RewardLedger.updateOne({ _id: created._id }, { $set: { state: 'CANCELLED' } });
    const after = await budgetSummary(input.tenantId, period);
    return {
      reserved: false, refused: 'insufficient_budget',
      valuePaise: 0, availablePaise: after.availablePaise,
    };
  }

  const after = await budgetSummary(input.tenantId, period);
  return { reserved: true, valuePaise: value, availablePaise: after.availablePaise };
}
