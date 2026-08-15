import User from '../models/User';
import PassportProgress from '../models/PassportProgress';
import PassportConfig from '../models/PassportConfig';
import { StudentBadge } from '../models/GamificationModels';
import { RewardDefinition, RewardRedemption, IRewardDefinition } from '../models/RewardModels';
import { spendableBalance, SpendableBalance } from './coinSpendService';
import { getCoinConfig } from './coinService';
import { isEntitled } from './passportEntitlementService';
import { levelFromXp } from './passportGamificationService';
import { budgetSummary, periodKey } from './rewardBudgetService';
import { RedemptionRefusal, paiseToRupees } from '../data/rewardPolicy';

/**
 * Whether a student may redeem a reward — decided in ONE place.
 *
 * There are nine independent reasons a redemption can be refused, spread across coins,
 * membership, XP, badges, stock, two separate budgets and two kinds of limit. Scattering
 * them between a controller, a reward service and a coin service is how a product ends up
 * with a catalogue that offers something the redeem endpoint then rejects, or worse, the
 * reverse.
 *
 * THE STUDENT'S CONTEXT IS LOADED ONCE. A catalogue of twenty rewards must not mean twenty
 * balance lookups, twenty badge queries and twenty budget reads; everything student-wide is
 * fetched once and every reward is evaluated against it.
 *
 * EXISTING COIN POLICY IS AUTHORITATIVE. minRedemption, coin expiry, the per-member annual
 * allowance and the free-member spending rule were all written into CoinConfig before this
 * module existed. They are honoured, not reinterpreted.
 */

export interface StudentRewardContext {
  tenantId: string;
  studentId: string;
  coins: SpendableBalance;
  xp: number;
  level: number;
  badgeKeys: Set<string>;
  /** Whether this member may spend at all — see the free-member note below. */
  canSpend: boolean;
  spendBlockedReason?: RedemptionRefusal;
  /** rewardKey → how many live or completed redemptions this student already holds. */
  redemptionCounts: Map<string, number>;
  /** Remaining per-member annual allowance, in rupees. Infinity when uncapped. */
  memberAllowanceRemainingInr: number;
  /** Remaining tenant budget for the current period, in paise. */
  tenantBudgetAvailablePaise: number;
  now: Date;
}

/**
 * Everything about the student that any reward might need, in one pass.
 *
 * Deliberately includes the two budgets: they are per-student and per-tenant respectively,
 * not per-reward, so reading them once is both correct and much cheaper than per card.
 */
export async function loadStudentRewardContext(
  tenantId: string, studentId: string, now: Date = new Date(),
): Promise<StudentRewardContext> {
  const [coins, progress, badges, user, cfg, coinCfg, budget, mine] = await Promise.all([
    spendableBalance(tenantId, studentId, now),
    PassportProgress.findOne({ tenantId, studentId }).select('xp').lean() as any,
    StudentBadge.find({ tenantId, studentId }).select('badgeKey').lean() as any,
    User.findOne({ _id: studentId, tenantId }).select('passport').lean() as any,
    PassportConfig.findOne({ tenantId }).lean() as any,
    getCoinConfig(tenantId),
    budgetSummary(tenantId, periodKey(now)),
    RewardRedemption.find({
      tenantId, studentId, status: { $in: ['PENDING', 'RESERVED', 'FULFILLED'] },
    }).select('rewardKey').lean() as any,
  ]);

  const xp = progress?.xp || 0;

  /**
   * Who may SPEND.
   *
   * `freeMembersAccrue` governs whether an unpaid member EARNS coins; it is not a licence to
   * redeem, and reading it as one would let anybody cash out. Spending requires a live
   * membership, decided by the entitlement rules the rest of CareerPilot already uses rather
   * than by a second membership state machine invented here.
   */
  const membershipOk = isEntitled(cfg?.entitlements, user?.passport, 'roadmap_full', now);

  const counts = new Map<string, number>();
  for (const r of (mine as any[])) counts.set(r.rewardKey, (counts.get(r.rewardKey) || 0) + 1);

  const account = await import('./coinService').then(m => m.getAccount(tenantId, studentId));
  const allowance = coinCfg.annualRealCostBudgetInr || 0;
  const memberRemaining = allowance > 0
    ? Math.max(0, allowance - (account.realCostThisYearInr || 0))
    : Number.POSITIVE_INFINITY;

  return {
    tenantId, studentId, coins, xp,
    level: levelFromXp(xp).level,
    badgeKeys: new Set((badges as any[]).map(b => b.badgeKey)),
    canSpend: membershipOk,
    spendBlockedReason: membershipOk ? undefined : 'MEMBERSHIP_REQUIRED',
    redemptionCounts: counts,
    memberAllowanceRemainingInr: memberRemaining,
    tenantBudgetAvailablePaise: budget.availablePaise,
    now,
  };
}

export interface EligibilityResult {
  eligible: boolean;
  /** Every reason, not just the first — a student should see all of what stands in the way. */
  reasons: RedemptionRefusal[];
  coinCost: number;
  coinBalance: number;
  /** How many more coins are needed. 0 when they have enough. */
  coinsShort: number;
  remainingStudentLimit: number | null;
  stockAvailable: number | null;
}

/**
 * Evaluate one reward against a loaded context.
 *
 * Pure apart from the context it is handed, so the catalogue and the redeem endpoint reach
 * the same verdict from the same inputs — the alternative is a Redeem button that fails.
 *
 * The two budgets are checked SEPARATELY and produce different reasons, because they mean
 * different things internally even though a student sees the same wording for both.
 */
export function evaluateRewardEligibility(
  reward: IRewardDefinition,
  ctx: StudentRewardContext,
): EligibilityResult {
  const reasons: RedemptionRefusal[] = [];

  if (!reward.active || !reward.studentVisible) reasons.push('REWARD_UNAVAILABLE');
  if (reward.availableFrom && ctx.now < new Date(reward.availableFrom)) reasons.push('NOT_STARTED');
  if (reward.availableUntil && ctx.now > new Date(reward.availableUntil)) reasons.push('EXPIRED');

  if (!ctx.canSpend && ctx.spendBlockedReason) reasons.push(ctx.spendBlockedReason);

  // ── coins ──
  const spendable = ctx.coins.spendable;
  if (spendable < reward.coinCost) reasons.push('INSUFFICIENT_COINS');
  // Existing policy: nothing may be redeemed below this balance. Checked against the
  // BALANCE, not the cost — it is a floor on the account, not a price.
  if (ctx.coins.minRedemption > 0 && spendable < ctx.coins.minRedemption) {
    reasons.push('MIN_REDEMPTION_NOT_REACHED');
  }

  // ── earned standing. Checked, never spent. ──
  if (reward.minimumXp > 0 && ctx.xp < reward.minimumXp) reasons.push('INSUFFICIENT_XP');
  if (reward.minimumLevel > 0 && ctx.level < reward.minimumLevel) reasons.push('LEVEL_REQUIRED');
  if (reward.requiredBadgeKeys?.length
    && !reward.requiredBadgeKeys.every(k => ctx.badgeKeys.has(k))) {
    reasons.push('BADGE_REQUIRED');
  }

  // ── stock and limits ──
  const stock = reward.stockMode === 'LIMITED' ? (reward.stockAvailable || 0) : null;
  if (reward.stockMode === 'LIMITED' && (reward.stockAvailable || 0) <= 0) reasons.push('OUT_OF_STOCK');

  const held = ctx.redemptionCounts.get(reward.key) || 0;
  const remainingStudentLimit = reward.perStudentLimit > 0
    ? Math.max(0, reward.perStudentLimit - held)
    : null;
  if (remainingStudentLimit !== null && remainingStudentLimit <= 0) reasons.push('REDEMPTION_LIMIT_REACHED');

  if (reward.totalRedemptionLimit > 0 && (reward.totalRedeemed || 0) >= reward.totalRedemptionLimit) {
    reasons.push('TOTAL_LIMIT_REACHED');
  }

  // ── the two budgets, both of which must pass ──
  const costInr = paiseToRupees(reward.budgetCostPaise);
  if (ctx.memberAllowanceRemainingInr < costInr) reasons.push('MEMBER_REWARD_BUDGET_EXCEEDED');
  if (ctx.tenantBudgetAvailablePaise < reward.budgetCostPaise) reasons.push('TENANT_REWARD_BUDGET_UNAVAILABLE');

  return {
    eligible: reasons.length === 0,
    reasons,
    coinCost: reward.coinCost,
    coinBalance: spendable,
    coinsShort: Math.max(0, reward.coinCost - spendable),
    remainingStudentLimit,
    stockAvailable: stock,
  };
}

/** One reward, for a caller that has no context loaded yet. */
export async function canStudentRedeem(input: {
  tenantId: string; studentId: string; rewardKey: string; now?: Date;
}): Promise<{ reward: IRewardDefinition | null; eligibility: EligibilityResult | null; ctx: StudentRewardContext | null }> {
  const reward = await RewardDefinition.findOne({
    tenantId: input.tenantId, key: input.rewardKey.toUpperCase(),
  });
  if (!reward) return { reward: null, eligibility: null, ctx: null };

  const ctx = await loadStudentRewardContext(input.tenantId, input.studentId, input.now);
  return { reward, eligibility: evaluateRewardEligibility(reward, ctx), ctx };
}
