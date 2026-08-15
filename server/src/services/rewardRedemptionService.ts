import User from '../models/User';
import Tenant from '../models/Tenant';
import { RewardDefinition, RewardRedemption, IRewardRedemption } from '../models/RewardModels';
import { spendCoins, refundCoins, reserveMemberRewardCost, releaseMemberRewardCost } from './coinSpendService';
import { reserveReward, budgetSummary, periodKey } from './rewardBudgetService';
import { RewardLedger } from '../models/GamificationModels';
import { loadStudentRewardContext, evaluateRewardEligibility } from './rewardEligibilityService';
import {
  RedemptionRefusal, canTransition, paiseToRupees, SagaStep,
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
 * Take ownership of one saga step for one redemption.
 *
 * THIS IS THE CONCURRENCY GATE, and it has to live on the redemption document rather than on
 * the resource. Guarding only the resource is not enough: `stockAvailable >= 1` stops the
 * shop overselling, but with five units in stock it happily lets the SAME redemption take two
 * — which is exactly what two concurrent resumes did, while the single boolean recorded one.
 * Compensation then gave back one unit and leaked the other.
 *
 * The member's annual allowance was worse. It has no key of its own, so nothing downstream
 * would have caught a repeat: the same redemption could consume a financial cap twice.
 *
 * NONE → CLAIMED is one atomic conditional update, so of any number of workers exactly one
 * proceeds. The rest are told the step is already owned and stand down.
 */
async function claimStep(redemptionId: string, step: SagaStep): Promise<boolean> {
  const res: any = await RewardRedemption.updateOne(
    { _id: redemptionId, [`steps.${step}`]: 'NONE' },
    { $set: { [`steps.${step}`]: 'CLAIMED' } },
  );
  return (res?.modifiedCount ?? res?.nModified ?? 0) === 1;
}

/** Record how a claimed step ended: DONE on success, back to NONE if it could not be taken. */
async function markStep(redemptionId: string, step: SagaStep, state: 'DONE' | 'NONE'): Promise<void> {
  await RewardRedemption.updateOne(
    { _id: redemptionId },
    { $set: { [`steps.${step}`]: state } },
  );
}

/**
 * Claim the UNDO of a step, so compensation is also at-most-once.
 *
 * DONE → NONE atomically, and only the caller that wins performs the release. Two admins
 * clicking Cancel therefore refund once and return one unit of stock, not two.
 *
 * A step still CLAIMED — a worker died between taking ownership and finishing — is
 * deliberately NOT released. We cannot tell whether it succeeded, and releasing something
 * that was never taken would inflate stock or refund coins nobody spent. Leaving it is the
 * conservative error, and `findStrandedRedemptions` surfaces it for a human.
 */
async function claimUndo(redemptionId: string, step: SagaStep): Promise<boolean> {
  const res: any = await RewardRedemption.updateOne(
    { _id: redemptionId, [`steps.${step}`]: 'DONE' },
    { $set: { [`steps.${step}`]: 'NONE' } },
  );
  return (res?.modifiedCount ?? res?.nModified ?? 0) === 1;
}

/** The redemption as the database currently has it — never a stale in-memory copy. */
const freshSteps = async (redemptionId: string): Promise<any> => {
  const row: any = await RewardRedemption.findOne({ _id: redemptionId }).lean();
  return row?.steps || {};
};

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
 * Each release CLAIMS ITS UNDO first — DONE → NONE atomically — so only one caller performs
 * it however many arrive. Two admins clicking Cancel refund once and return one unit of
 * stock, and a compensation racing a resume cannot give back something twice.
 *
 * Reverse order of acquisition, and a step still CLAIMED is left alone: see claimUndo.
 */
async function compensate(redemptionId: string, reason: string): Promise<void> {
  const redemption: any = await RewardRedemption.findOne({ _id: redemptionId });
  if (!redemption) return;

  const { tenantId, rewardKey } = redemption;
  const studentId = String(redemption.studentId);

  if (await claimUndo(redemptionId, 'coins')) {
    await refundCoins({
      tenantId, studentId, coins: redemption.coinCost,
      idempotencyKey: refundKey(redemptionId),
      eventKey: COIN_EVENT_REDEMPTION_REFUND,
      note: `Refund: ${redemption.rewardName}`,
      meta: { redemptionId, reason },
    });
  }

  if (await claimUndo(redemptionId, 'memberBudget')) {
    await releaseMemberRewardCost({
      tenantId, studentId, costInr: paiseToRupees(redemption.budgetCostPaise),
    });
  }

  if (await claimUndo(redemptionId, 'tenantBudget')) {
    // Cancelling the reservation row releases the tenant budget; the row itself stays as
    // history, exactly as the coin ledger does.
    await RewardLedger.updateOne(
      { tenantId, idempotencyKey: budgetKey(redemptionId), state: 'RESERVED' },
      { $set: { state: 'CANCELLED' } },
    );
  }

  if (await claimUndo(redemptionId, 'stock')) {
    await releaseStock(tenantId, rewardKey);
  }

  log('COMPENSATED', { redemptionId, tenantId, reason });
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
 * Stock, then the tenant budget, then the member allowance, then coins. EVERY step is
 * claimed on the redemption document before it is performed, so two concurrent resumes of
 * the same redemption cannot both act — which is the whole difference between this and the
 * version that read a boolean and trusted it.
 *
 * A worker that loses a claim stops rather than racing ahead to the next step: the winner is
 * mid-flight and will finish, and the loser reports the redemption as it currently stands.
 */
async function runSaga(redemption: any, reward: any, now: Date): Promise<RedeemResult> {
  const id = String(redemption._id);
  const { tenantId, rewardKey } = redemption;
  const studentId = String(redemption.studentId);

  const fail = async (refused: RedemptionRefusal): Promise<RedeemResult> => {
    await compensate(id, refused);
    await RewardRedemption.updateOne(
      { _id: id, status: 'PENDING' },
      { $set: { status: 'CANCELLED', cancelledAt: now, cancelReason: refused } },
    );
    const after: any = await RewardRedemption.findOne({ _id: id });
    return { ok: false, refused, redemption: after };
  };

  /** Somebody else owns a step. Report where the redemption actually is, and stand down. */
  const standDown = async (step: string): Promise<RedeemResult> => {
    const current: any = await RewardRedemption.findOne({ _id: id });
    log('STEP_OWNED_ELSEWHERE', { redemptionId: id, tenantId, step });
    return { ok: current?.status === 'RESERVED', redemption: current };
  };

  // 1. stock
  if (reward.stockMode === 'LIMITED') {
    const steps = await freshSteps(id);
    if (steps.stock !== 'DONE') {
      if (!await claimStep(id, 'stock')) return standDown('stock');
      if (!await reserveStock(tenantId, rewardKey)) {
        await markStep(id, 'stock', 'NONE');
        return fail('OUT_OF_STOCK');
      }
      await markStep(id, 'stock', 'DONE');
      log('STOCK_RESERVED', { redemptionId: id, tenantId, rewardKey });
    }
  }

  // 2. tenant budget — Module 11's primitive, reused rather than reimplemented
  if (redemption.budgetCostPaise > 0) {
    const steps = await freshSteps(id);
    if (steps.tenantBudget !== 'DONE') {
      if (!await claimStep(id, 'tenantBudget')) return standDown('tenantBudget');
      const res = await reserveReward({
        tenantId, studentId,
        valuePaise: redemption.budgetCostPaise,
        reason: `reward:${rewardKey}`,
        idempotencyKey: budgetKey(id),
        now,
      });
      // A duplicate means an earlier attempt already reserved it — that is success.
      if (!res.reserved && res.refused !== 'duplicate') {
        await markStep(id, 'tenantBudget', 'NONE');
        return fail('TENANT_REWARD_BUDGET_UNAVAILABLE');
      }
      await markStep(id, 'tenantBudget', 'DONE');
      log('TENANT_BUDGET_RESERVED', { redemptionId: id, tenantId, paise: redemption.budgetCostPaise });
    }
  }

  // 3. the member's annual allowance — the step with NO key of its own, so the claim above
  //    is the only thing standing between a repeat and a double-consumed financial cap.
  if (redemption.budgetCostPaise > 0) {
    const steps = await freshSteps(id);
    if (steps.memberBudget !== 'DONE') {
      if (!await claimStep(id, 'memberBudget')) return standDown('memberBudget');
      const res = await reserveMemberRewardCost({
        tenantId, studentId, costInr: paiseToRupees(redemption.budgetCostPaise), now,
      });
      if (!res.ok) {
        await markStep(id, 'memberBudget', 'NONE');
        return fail('MEMBER_REWARD_BUDGET_EXCEEDED');
      }
      await markStep(id, 'memberBudget', 'DONE');
      log('MEMBER_BUDGET_RESERVED', { redemptionId: id, tenantId });
    }
  }

  // 4. coins — last, because this is the one the student can see
  {
    const steps = await freshSteps(id);
    if (steps.coins !== 'DONE') {
      if (!await claimStep(id, 'coins')) return standDown('coins');
      const res = await spendCoins({
        tenantId, studentId,
        coins: redemption.coinCost,
        idempotencyKey: coinKey(id),
        eventKey: COIN_EVENT_REDEMPTION,
        note: redemption.rewardName,
        meta: { redemptionId: id, rewardKey },
      });
      if (res.refused === 'insufficient') {
        await markStep(id, 'coins', 'NONE');
        return fail('INSUFFICIENT_COINS');
      }
      // 'duplicate' means an earlier attempt already took them — success, not failure.
      await markStep(id, 'coins', 'DONE');
      log('COINS_DEBITED', { redemptionId: id, tenantId, coins: redemption.coinCost });
    }
  }

  // 5. settle — guarded on PENDING, so the count is incremented once even if two workers
  //    both believe they finished.
  const settled: any = await RewardRedemption.findOneAndUpdate(
    { _id: id, status: 'PENDING' },
    { $set: { status: 'RESERVED', reservedAt: now } },
    { new: true },
  );

  if (settled) {
    await RewardDefinition.updateOne({ tenantId, key: rewardKey }, { $inc: { totalRedeemed: 1 } });
    log('RESERVED', { redemptionId: id, tenantId, rewardKey, coinCost: redemption.coinCost });
  }

  const final: any = settled || await RewardRedemption.findOne({ _id: id });
  return { ok: final?.status === 'RESERVED', redemption: final };
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
    await compensate(String(redemption._id), 'REWARD_NOT_FOUND');
    await RewardRedemption.updateOne(
      { _id: redemption._id, status: 'PENDING' },
      { $set: { status: 'CANCELLED', cancelledAt: now, cancelReason: 'REWARD_NOT_FOUND' } },
    );
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

  if (redemption.steps?.stock === 'DONE') {
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

  await compensate(String(redemption._id), 'admin_cancel');
  await RewardDefinition.updateOne(
    { tenantId: input.tenantId, key: redemption.rewardKey, totalRedeemed: { $gte: 1 } },
    { $inc: { totalRedeemed: -1 } },
  );

  log('CANCELLED', { redemptionId: String(redemption._id), tenantId: input.tenantId, adminId: input.adminId });
  return { ok: true, redemption };
}

export { canTransition, budgetSummary };
