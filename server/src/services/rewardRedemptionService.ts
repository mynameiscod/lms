import User from '../models/User';
import Tenant from '../models/Tenant';
import { RewardDefinition, RewardRedemption, IRewardRedemption } from '../models/RewardModels';
import { spendCoins, refundCoins, reserveMemberRewardCost, releaseMemberRewardCost } from './coinSpendService';
import { reserveReward, budgetSummary, periodKey } from './rewardBudgetService';
import { RewardLedger } from '../models/GamificationModels';
import { loadStudentRewardContext, evaluateRewardEligibility } from './rewardEligibilityService';
import {
  RedemptionRefusal, canTransition, paiseToRupees,
  COIN_EVENT_REDEMPTION, COIN_EVENT_REDEMPTION_REFUND,
} from '../data/rewardPolicy';

/**
 * Redeeming a reward, on a database with no transactions.
 *
 * WHY THIS IS A SAGA. Production Mongo here is a standalone instance — no replica set, and
 * nothing in this repository has ever opened a session. Multi-document transactions are
 * therefore unavailable, and one redemption has to touch four independent things: the
 * reward's stock, the tenant's monthly budget, the member's annual allowance, and their coin
 * balance. There is no single write that can do all four.
 *
 * So each step is made individually ATOMIC and individually REVERSIBLE, the redemption row
 * records which ones have completed, and any failure walks the completed steps backwards.
 * The persisted step flags are the whole point: a process that dies between two steps leaves
 * a record saying exactly how far it got, so recovery is a decision rather than a guess.
 *
 * COINS ARE DEBITED LAST. Of the four, the coin balance is the one the student can see. If
 * something must fail, it should fail before their balance moves — a released budget
 * reservation is invisible to them, a coin debit for a reward they did not get is not.
 *
 * NOTHING HERE TOUCHES XP. Coins buy things; XP does not, and there is no path from this
 * file to a skill, a readiness figure or a roadmap.
 */

export interface RedeemResult {
  ok: boolean;
  redemption?: IRewardRedemption;
  refused?: RedemptionRefusal;
  reasons?: RedemptionRefusal[];
  message?: string;
}

const log = (step: string, data: Record<string, any>) =>
  console.log(`[reward-saga] ${step}`, JSON.stringify(data));

/**
 * Reserve one unit of stock.
 *
 * `stockAvailable: { $gte: 1 }` is inside the filter, so of two students racing for the last
 * T-shirt exactly one matches. Reading the count and then decrementing it is how stores
 * oversell.
 */
async function reserveStock(tenantId: string, rewardKey: string): Promise<boolean> {
  const res: any = await RewardDefinition.updateOne(
    { tenantId, key: rewardKey, stockMode: 'LIMITED', stockAvailable: { $gte: 1 } },
    { $inc: { stockAvailable: -1, stockReserved: 1 } },
  );
  return (res?.modifiedCount ?? res?.nModified ?? 0) === 1;
}

/** Give a reserved unit back. Guarded so a double release cannot inflate stock. */
async function releaseStock(tenantId: string, rewardKey: string): Promise<void> {
  await RewardDefinition.updateOne(
    { tenantId, key: rewardKey, stockReserved: { $gte: 1 } },
    { $inc: { stockAvailable: 1, stockReserved: -1 } },
  );
}

/** The keys every compensating action uses, so a retry finds its own earlier work. */
const coinKey = (redemptionId: string) => `${COIN_EVENT_REDEMPTION}:${redemptionId}`;
const refundKey = (redemptionId: string) => `${COIN_EVENT_REDEMPTION_REFUND}:${redemptionId}`;
const budgetKey = (redemptionId: string) => `reward_redemption:${redemptionId}`;

/**
 * Undo whatever a redemption managed to acquire.
 *
 * Reverse order, and each step is guarded or idempotent on its own, so calling this twice
 * releases once. The step flags are cleared as they are undone — that is what makes a second
 * pass safe rather than a second refund.
 */
async function compensate(redemption: IRewardRedemption, reason: string): Promise<void> {
  const id = String(redemption._id);
  const { tenantId, rewardKey } = redemption;
  const studentId = String(redemption.studentId);

  if (redemption.steps.coinsDebited) {
    await refundCoins({
      tenantId, studentId, coins: redemption.coinCost,
      idempotencyKey: refundKey(id),
      eventKey: COIN_EVENT_REDEMPTION_REFUND,
      note: `Refund: ${redemption.rewardName}`,
      meta: { redemptionId: id, reason },
    });
    redemption.steps.coinsDebited = false;
  }

  if (redemption.steps.memberBudgetReserved) {
    await releaseMemberRewardCost({
      tenantId, studentId, costInr: paiseToRupees(redemption.budgetCostPaise),
    });
    redemption.steps.memberBudgetReserved = false;
  }

  if (redemption.steps.tenantBudgetReserved) {
    // Cancelling the reservation row releases the tenant budget; the row itself stays as
    // history, exactly as the coin ledger does.
    await RewardLedger.updateOne(
      { tenantId, idempotencyKey: budgetKey(id), state: 'RESERVED' },
      { $set: { state: 'CANCELLED' } },
    );
    redemption.steps.tenantBudgetReserved = false;
  }

  if (redemption.steps.stockReserved) {
    await releaseStock(tenantId, rewardKey);
    redemption.steps.stockReserved = false;
  }

  redemption.markModified('steps');
  await redemption.save();
  log('COMPENSATED', { redemptionId: id, tenantId, reason });
}

/**
 * Redeem a reward.
 *
 * The eligibility check up front is the friendly answer; every gate is then re-applied
 * atomically as the saga runs, because between the check and the write somebody else may
 * have taken the last unit. The atomic guards are what actually enforce the rules — the
 * check exists so the common case fails politely rather than halfway through.
 */
export async function redeemReward(input: {
  tenantId: string;
  studentId: string;
  rewardKey: string;
  /** Distinguishes a genuine second redemption from a double-clicked button. */
  intentToken: string;
  now?: Date;
}): Promise<RedeemResult> {
  const now = input.now || new Date();
  const { tenantId, studentId } = input;
  const rewardKey = input.rewardKey.toUpperCase();

  const reward = await RewardDefinition.findOne({ tenantId, key: rewardKey });
  if (!reward) return { ok: false, refused: 'REWARD_NOT_FOUND' };

  const ctx = await loadStudentRewardContext(tenantId, studentId, now);
  const eligibility = evaluateRewardEligibility(reward, ctx);
  if (!eligibility.eligible) {
    return { ok: false, refused: eligibility.reasons[0], reasons: eligibility.reasons };
  }

  // ── the recovery anchor ──
  //
  // Written before anything is acquired, so there is never an acquired resource without a
  // record explaining it. Unique per (tenant, student, intent): a retried click lands on
  // the existing row instead of starting a second saga.
  const idempotencyKey = `${rewardKey}:${input.intentToken}`;
  const budgetPeriod = periodKey(now);

  let redemption: any;
  try {
    const user: any = await User.findOne({ _id: studentId, tenantId }).select('firstName lastName tenantId').lean();
    const tenant: any = user?.tenantId
      ? await Tenant.findById(user.tenantId).select('name type').lean()
      : null;

    redemption = await RewardRedemption.create({
      tenantId, studentId, rewardKey,
      // Snapshotted now. A later price change must not rewrite what this cost.
      coinCost: reward.coinCost,
      budgetCostPaise: reward.budgetCostPaise,
      rewardName: reward.name,
      rewardType: reward.type,
      status: 'PENDING',
      idempotencyKey,
      budgetPeriod,
      requestedAt: now,
      studentSnapshot: {
        displayName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || undefined,
        collegeName: tenant?.type === 'college' ? tenant?.name : undefined,
      },
    });
  } catch (e: any) {
    if (e?.code === 11000) {
      const existing = await RewardRedemption.findOne({ tenantId, studentId, idempotencyKey });
      // The same intent already ran. Returning it is the honest answer to a retry: the
      // student asked once and has one redemption.
      if (existing && existing.status !== 'PENDING') return { ok: true, redemption: existing };
      if (existing) return resumeRedemption(existing, now);
      return { ok: false, refused: 'REDEMPTION_DUPLICATE' };
    }
    throw e;
  }

  log('PENDING_CREATED', { redemptionId: String(redemption._id), tenantId, rewardKey });
  return runSaga(redemption, reward, now);
}

/**
 * Acquire everything, in the order that makes failure cheapest.
 *
 * Stock, then the tenant budget, then the member allowance, then coins. Each guard is atomic
 * and each success is written to the redemption before the next step begins — so a crash
 * anywhere leaves a row that says precisely what is owed back.
 */
async function runSaga(redemption: any, reward: any, now: Date): Promise<RedeemResult> {
  const id = String(redemption._id);
  const { tenantId, rewardKey } = redemption;
  const studentId = String(redemption.studentId);

  const fail = async (refused: RedemptionRefusal): Promise<RedeemResult> => {
    await compensate(redemption, refused);
    redemption.status = 'CANCELLED';
    redemption.cancelledAt = now;
    redemption.cancelReason = refused;
    await redemption.save();
    return { ok: false, refused };
  };

  // 1. stock
  if (!redemption.steps.stockReserved && reward.stockMode === 'LIMITED') {
    if (!await reserveStock(tenantId, rewardKey)) return fail('OUT_OF_STOCK');
    redemption.steps.stockReserved = true;
    redemption.markModified('steps');
    await redemption.save();
    log('STOCK_RESERVED', { redemptionId: id, tenantId, rewardKey });
  }

  // 2. tenant budget — Module 11's primitive, reused rather than reimplemented
  if (!redemption.steps.tenantBudgetReserved && redemption.budgetCostPaise > 0) {
    const res = await reserveReward({
      tenantId, studentId,
      valuePaise: redemption.budgetCostPaise,
      reason: `reward:${rewardKey}`,
      idempotencyKey: budgetKey(id),
      now,
    });
    if (!res.reserved && res.refused !== 'duplicate') return fail('TENANT_REWARD_BUDGET_UNAVAILABLE');
    redemption.steps.tenantBudgetReserved = true;
    redemption.markModified('steps');
    await redemption.save();
    log('TENANT_BUDGET_RESERVED', { redemptionId: id, tenantId, paise: redemption.budgetCostPaise });
  }

  // 3. the member's annual allowance
  if (!redemption.steps.memberBudgetReserved && redemption.budgetCostPaise > 0) {
    const res = await reserveMemberRewardCost({
      tenantId, studentId, costInr: paiseToRupees(redemption.budgetCostPaise), now,
    });
    if (!res.ok) return fail('MEMBER_REWARD_BUDGET_EXCEEDED');
    redemption.steps.memberBudgetReserved = true;
    redemption.markModified('steps');
    await redemption.save();
    log('MEMBER_BUDGET_RESERVED', { redemptionId: id, tenantId });
  }

  // 4. coins — last, because this is the one the student can see
  if (!redemption.steps.coinsDebited) {
    const res = await spendCoins({
      tenantId, studentId,
      coins: redemption.coinCost,
      idempotencyKey: coinKey(id),
      eventKey: COIN_EVENT_REDEMPTION,
      note: redemption.rewardName,
      meta: { redemptionId: id, rewardKey },
    });
    if (res.refused === 'insufficient') return fail('INSUFFICIENT_COINS');
    // A duplicate means an earlier attempt already took them — that is success, not failure.
    redemption.steps.coinsDebited = true;
    redemption.markModified('steps');
    await redemption.save();
    log('COINS_DEBITED', { redemptionId: id, tenantId, coins: redemption.coinCost });
  }

  // 5. settle
  redemption.status = 'RESERVED';
  redemption.reservedAt = now;
  await redemption.save();

  await RewardDefinition.updateOne({ tenantId, key: rewardKey }, { $inc: { totalRedeemed: 1 } });

  log('RESERVED', { redemptionId: id, tenantId, rewardKey, coinCost: redemption.coinCost });
  return { ok: true, redemption };
}

/**
 * Finish a redemption that was interrupted.
 *
 * Reads the step flags and continues from where it stopped, which is why they are persisted.
 * A student whose server died mid-saga should not have to contact anybody, and must never be
 * left having paid for nothing.
 */
export async function resumeRedemption(redemption: any, now: Date = new Date()): Promise<RedeemResult> {
  if (redemption.status !== 'PENDING') return { ok: true, redemption };

  const reward = await RewardDefinition.findOne({
    tenantId: redemption.tenantId, key: redemption.rewardKey,
  });
  if (!reward) {
    await compensate(redemption, 'REWARD_NOT_FOUND');
    redemption.status = 'CANCELLED';
    redemption.cancelledAt = now;
    redemption.cancelReason = 'REWARD_NOT_FOUND';
    await redemption.save();
    return { ok: false, refused: 'REWARD_NOT_FOUND' };
  }

  return runSaga(redemption, reward, now);
}

/** Every redemption stuck mid-saga, for an admin to inspect or recover. */
export const findStrandedRedemptions = (tenantId: string, limit = 50) =>
  RewardRedemption.find({ tenantId, status: 'PENDING' }).sort({ requestedAt: 1 }).limit(limit);

// ── admin transitions ───────────────────────────────────────────────────────

/**
 * Mark a reserved redemption as fulfilled.
 *
 * The state guard is in the FILTER, so a double-clicked Fulfill produces one transition:
 * the second matches nothing. Budget moves from reserved to redeemed in the same period it
 * was committed to — fulfilling in September does not move an August liability.
 */
export async function fulfillRedemption(input: {
  tenantId: string; redemptionId: string; adminId: string;
  fulfillmentReference?: string; notes?: string; now?: Date;
}): Promise<{ ok: boolean; refused?: RedemptionRefusal; redemption?: IRewardRedemption }> {
  const now = input.now || new Date();

  const redemption: any = await RewardRedemption.findOneAndUpdate(
    { _id: input.redemptionId, tenantId: input.tenantId, status: 'RESERVED' },
    {
      $set: {
        status: 'FULFILLED', fulfilledAt: now, fulfilledBy: input.adminId,
        ...(input.fulfillmentReference ? { fulfillmentReference: input.fulfillmentReference } : {}),
        ...(input.notes ? { adminNotes: input.notes } : {}),
      },
    },
    { new: true },
  );

  if (!redemption) return { ok: false, refused: 'INVALID_STATE' };

  // Reserved becomes redeemed against the ORIGINAL period, never today's.
  await RewardLedger.updateOne(
    { tenantId: input.tenantId, idempotencyKey: budgetKey(String(redemption._id)), state: 'RESERVED' },
    { $set: { state: 'REDEEMED' } },
  );

  if (redemption.steps.stockReserved) {
    await RewardDefinition.updateOne(
      { tenantId: input.tenantId, key: redemption.rewardKey, stockReserved: { $gte: 1 } },
      { $inc: { stockReserved: -1, stockFulfilled: 1 } },
    );
  }

  log('FULFILLED', { redemptionId: String(redemption._id), tenantId: input.tenantId, adminId: input.adminId });
  return { ok: true, redemption };
}

/**
 * Cancel a redemption and give everything back.
 *
 * The transition is claimed first, under a filter that accepts only a live state, so exactly
 * one caller compensates however many click Cancel. Coins, both budgets and stock are each
 * released once — the step flags cleared by `compensate` are what guarantee that.
 */
export async function cancelRedemption(input: {
  tenantId: string; redemptionId: string; adminId: string; reason?: string; now?: Date;
}): Promise<{ ok: boolean; refused?: RedemptionRefusal; redemption?: IRewardRedemption }> {
  const now = input.now || new Date();

  const redemption: any = await RewardRedemption.findOneAndUpdate(
    { _id: input.redemptionId, tenantId: input.tenantId, status: { $in: ['RESERVED', 'PENDING'] } },
    {
      $set: {
        status: 'CANCELLED', cancelledAt: now, cancelledBy: input.adminId,
        cancelReason: input.reason || 'Cancelled by admin',
      },
    },
    { new: true },
  );

  if (!redemption) return { ok: false, refused: 'INVALID_STATE' };

  await compensate(redemption, 'admin_cancel');
  await RewardDefinition.updateOne(
    { tenantId: input.tenantId, key: redemption.rewardKey, totalRedeemed: { $gte: 1 } },
    { $inc: { totalRedeemed: -1 } },
  );

  log('CANCELLED', { redemptionId: String(redemption._id), tenantId: input.tenantId, adminId: input.adminId });
  return { ok: true, redemption };
}

export { canTransition, budgetSummary };
