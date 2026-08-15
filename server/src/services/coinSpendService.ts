import mongoose from 'mongoose';
import { CoinLedger, CoinAccount } from '../models/CoinModels';
import { getCoinConfig, getAccount } from './coinService';

/**
 * Spending coins, and giving them back.
 *
 * THE MISSING HALF OF AN EXISTING DESIGN. The coin engine has always been built for this —
 * `CoinLedger.coins` is documented "positive to earn, negative to spend", `CoinAccount`
 * carries `lifetimeSpent`, and the config has carried `minRedemption` and expiry since
 * before there was anything to buy. Only the spending was never written.
 *
 * KEPT OUT OF coinService.ts ON PURPOSE. That file runs the live earning economy for every
 * member; adding to it to serve a new module risks something that already works. These are
 * additive operations that reuse its config and account helpers and change none of its
 * behaviour.
 *
 * SAME RIGOUR AS awardCoins. The server decides the amount, the ledger is the record and
 * refuses duplicates, and the balance moves under an atomic guard or does not move at all.
 */

const oid = (id: string): any =>
  mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id;

export interface SpendableBalance {
  /** What the account says. */
  balance: number;
  /** What may actually be spent today, once expiry is taken into account. */
  spendable: number;
  /** Coins sitting in the balance that the engine considers expired. */
  expired: number;
  minRedemption: number;
}

/**
 * What a member may actually spend right now.
 *
 * COIN EXPIRY WAS ALREADY POLICY AND WAS NEVER ENFORCED. `expiryMonths` is configurable, and
 * `awardCoins` has always stamped `expiresAt` on every earning row — but nothing ever read it
 * back, so `CoinAccount.balance` still counts coins that expired months ago. Module 12 is the
 * first thing that spends coins, so it is the first thing that has to care.
 *
 * Coins are fungible and spends are not tracked against particular earnings, so this applies
 * the ordinary FIFO assumption: oldest coins go first. The expired coins still inside the
 * balance are therefore the expired earnings not already covered by what the member has
 * spent. It is an approximation, and it errs in the safe direction — it can understate what
 * somebody may spend, never overstate it.
 *
 * Nothing is mutated: no expiry sweep, no balance rewrite, no change to earning. This only
 * declines to let expired coins buy something.
 */
export async function spendableBalance(
  tenantId: string, studentId: string, now: Date = new Date(),
): Promise<SpendableBalance> {
  const [cfg, account] = await Promise.all([
    getCoinConfig(tenantId),
    getAccount(tenantId, studentId),
  ]);

  const base: SpendableBalance = {
    balance: account.balance || 0,
    spendable: account.balance || 0,
    expired: 0,
    minRedemption: cfg.minRedemption || 0,
  };

  if (!cfg.expiryMonths || cfg.expiryMonths <= 0) return base;

  const [row] = await CoinLedger.aggregate([
    {
      $match: {
        tenantId, studentId: oid(studentId),
        coins: { $gt: 0 },
        expiresAt: { $ne: null, $lt: now },
      },
    },
    { $group: { _id: null, total: { $sum: '$coins' } } },
  ]);

  const expiredEarned = row?.total || 0;
  const stillExpired = Math.max(0, expiredEarned - (account.lifetimeSpent || 0));

  return { ...base, expired: stillExpired, spendable: Math.max(0, base.balance - stillExpired) };
}

export type SpendRefusal = 'insufficient' | 'duplicate' | 'zero';

export interface SpendResult {
  spent: number;
  balance: number;
  refused?: SpendRefusal;
}

/**
 * Take coins for something, exactly once.
 *
 * ATOMIC BY FILTER. `balance: { $gte: coins }` is part of the update itself, so two tabs
 * clicking Redeem against a balance that covers only one of them produce exactly one debit —
 * the second matches no document and takes nothing. Reading the balance and then saving it
 * would let both succeed, which is the classic way a wallet goes negative.
 *
 * LEDGER FIRST, for the same reason awardCoins does it: the ledger row is what refuses a
 * duplicate, so it must commit before the balance moves.
 */
export async function spendCoins(opts: {
  tenantId: string;
  studentId: string;
  coins: number;
  /** Describes the EVENT. Scoped to the student by the ledger's own unique index. */
  idempotencyKey: string;
  eventKey: string;
  note?: string;
  meta?: Record<string, any>;
}): Promise<SpendResult> {
  const { tenantId, studentId } = opts;
  const coins = Math.floor(opts.coins);
  if (!coins || coins <= 0) return { spent: 0, balance: 0, refused: 'zero' };

  const account = await getAccount(tenantId, studentId);
  if ((account.balance || 0) < coins) {
    return { spent: 0, balance: account.balance || 0, refused: 'insufficient' };
  }

  try {
    await CoinLedger.create({
      tenantId, studentId,
      eventKey: opts.eventKey,
      coins: -coins,                        // negative, as the field's own contract says
      balanceAfter: (account.balance || 0) - coins,
      idempotencyKey: opts.idempotencyKey,
      note: opts.note,
      meta: opts.meta,
      expiresAt: null,                      // a spend does not itself expire
    });
  } catch (e: any) {
    if (e?.code === 11000) return { spent: 0, balance: account.balance || 0, refused: 'duplicate' };
    throw e;
  }

  const updated: any = await CoinAccount.findOneAndUpdate(
    { tenantId, studentId, balance: { $gte: coins } },
    { $inc: { balance: -coins, lifetimeSpent: coins } },
    { new: true },
  );

  if (!updated) {
    // The balance moved between the read and the guarded debit. The ledger row is removed so
    // the account and its history stay in agreement — this is the one case where deleting a
    // row is right, because no money ever moved for it.
    await CoinLedger.deleteOne({ tenantId, idempotencyKey: opts.idempotencyKey });
    const fresh = await getAccount(tenantId, studentId);
    return { spent: 0, balance: fresh.balance || 0, refused: 'insufficient' };
  }

  return { spent: coins, balance: updated.balance };
}

/**
 * Give coins back, without rewriting history.
 *
 * A COMPENSATING ROW, never an edit to the original debit. A ledger whose past entries can
 * change is not a ledger, and "why is my balance 1,500?" has to remain answerable a year
 * from now. Idempotent on its own key, so a retried cancellation refunds once.
 */
export async function refundCoins(opts: {
  tenantId: string;
  studentId: string;
  coins: number;
  idempotencyKey: string;
  eventKey: string;
  note?: string;
  meta?: Record<string, any>;
}): Promise<SpendResult> {
  const { tenantId, studentId } = opts;
  const coins = Math.floor(opts.coins);
  if (!coins || coins <= 0) return { spent: 0, balance: 0, refused: 'zero' };

  const account = await getAccount(tenantId, studentId);

  try {
    await CoinLedger.create({
      tenantId, studentId,
      eventKey: opts.eventKey,
      coins,                                // positive: the compensation
      balanceAfter: (account.balance || 0) + coins,
      idempotencyKey: opts.idempotencyKey,
      note: opts.note,
      meta: opts.meta,
      expiresAt: null,
    });
  } catch (e: any) {
    if (e?.code === 11000) return { spent: 0, balance: account.balance || 0, refused: 'duplicate' };
    throw e;
  }

  const updated: any = await CoinAccount.findOneAndUpdate(
    { tenantId, studentId },
    { $inc: { balance: coins, lifetimeSpent: -coins } },
    { new: true },
  );

  return { spent: coins, balance: updated?.balance ?? (account.balance || 0) + coins };
}

// ── the per-member annual reward-cost allowance ─────────────────────────────

/**
 * Roll the member's budget year if it has elapsed.
 *
 * Conditional on the stored start date, so of any number of concurrent redemptions exactly
 * one rolls the year and the rest see the new window. `budgetYearStart` is the existing
 * clock and is reused rather than replaced — nothing here invents a second annual cycle.
 */
async function rollBudgetYearIfDue(tenantId: string, studentId: string, now: Date): Promise<void> {
  const yearAgo = new Date(now.getTime() - 365 * 86400000);
  await CoinAccount.updateOne(
    { tenantId, studentId, budgetYearStart: { $lt: yearAgo } },
    { $set: { realCostThisYearInr: 0, budgetYearStart: now } },
  );
}

export interface MemberCostResult {
  ok: boolean;
  consumedInr: number;
  allowanceInr: number;
  remainingInr: number;
}

/**
 * Commit part of a member's annual reward allowance, atomically.
 *
 * THE PER-MEMBER GUARD, which is a different question from the tenant's monthly budget: this
 * caps how much reward cost ONE PERSON may attract in a year, so a generous tenant budget
 * cannot be absorbed by a single member. Both gates have to pass, and neither substitutes
 * for the other.
 *
 * The comparison lives in the FILTER, so two simultaneous redemptions cannot each read the
 * same remaining allowance and jointly exceed it.
 */
export async function reserveMemberRewardCost(opts: {
  tenantId: string;
  studentId: string;
  costInr: number;
  now?: Date;
}): Promise<MemberCostResult> {
  const now = opts.now || new Date();
  const cfg = await getCoinConfig(opts.tenantId);
  const allowance = cfg.annualRealCostBudgetInr || 0;

  await rollBudgetYearIfDue(opts.tenantId, opts.studentId, now);
  const account = await getAccount(opts.tenantId, opts.studentId);
  const consumed = account.realCostThisYearInr || 0;

  // 0 means the tenant has set no per-member cap. The tenant budget still applies.
  if (allowance <= 0) {
    return { ok: true, consumedInr: consumed, allowanceInr: 0, remainingInr: Number.POSITIVE_INFINITY };
  }

  // Rounded UP to the rupee. The counter is in rupees and reward costs are in paise; erring
  // upward spends slightly more of the member's allowance rather than slightly less, which
  // is the safe direction for a cap that exists to limit exposure.
  const cost = Math.max(0, Math.ceil(opts.costInr));

  const res: any = await CoinAccount.updateOne(
    { tenantId: opts.tenantId, studentId: opts.studentId, realCostThisYearInr: { $lte: allowance - cost } },
    { $inc: { realCostThisYearInr: cost } },
  );

  const ok = (res?.modifiedCount ?? res?.nModified ?? 0) === 1;
  const nowConsumed = ok ? consumed + cost : consumed;

  return {
    ok,
    consumedInr: nowConsumed,
    allowanceInr: allowance,
    remainingInr: Math.max(0, allowance - nowConsumed),
  };
}

/**
 * Hand a member's allowance back when a redemption is cancelled.
 *
 * Guarded so the counter cannot go negative: a double release matches nothing the second
 * time rather than quietly granting extra allowance.
 */
export async function releaseMemberRewardCost(opts: {
  tenantId: string; studentId: string; costInr: number;
}): Promise<boolean> {
  const cost = Math.max(0, Math.ceil(opts.costInr));
  if (!cost) return false;

  const res: any = await CoinAccount.updateOne(
    { tenantId: opts.tenantId, studentId: opts.studentId, realCostThisYearInr: { $gte: cost } },
    { $inc: { realCostThisYearInr: -cost } },
  );
  return (res?.modifiedCount ?? res?.nModified ?? 0) === 1;
}
