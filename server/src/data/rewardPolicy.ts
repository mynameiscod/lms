/**
 * REWARD_V1 — what a reward is, what it costs, and every way a redemption can be refused.
 *
 * TWO PRICES, NEVER ONE. A reward has a COIN cost (what the student pays) and a BUDGET cost
 * (what it costs the business). They are unrelated numbers: a T-shirt priced at 1,500 coins
 * might cost ₹300 to ship, and a renewal discount priced at 2,000 coins costs the full ₹500.
 * Collapsing them into "value" would publish an exchange rate the product deliberately does
 * not have, and make every reward not priced at that rate look like a cheat.
 *
 * XP IS NEVER SPENT. Coins buy things; XP does not. XP may gate a reward as an eligibility
 * condition, and the student's XP is untouched by redeeming.
 *
 * NO AI, NO RANDOMNESS. Eligibility, cost, stock and budget are all arithmetic over stored
 * configuration. A reward economy that cannot be explained to the person who lost out on one
 * is a reward economy nobody trusts.
 */

export const REWARD_POLICY_VERSION = 'REWARD_V1';

/**
 * What kind of thing a reward is.
 *
 * Generic on purpose — the type drives presentation and nothing else. No external vendor,
 * no procurement, no integration; a voucher is fulfilled by a person until some future
 * module says otherwise.
 */
export const REWARD_TYPES = ['PHYSICAL', 'DISCOUNT', 'ACCESS', 'COUPON', 'RECOGNITION'] as const;
export type RewardType = typeof REWARD_TYPES[number];

/**
 * Who completes the reward.
 *
 * MANUAL only, for now, and deliberately. INTERNAL would mean this module reaching into
 * membership or payments to grant something automatically, and there is no existing service
 * it could reuse safely — inventing one here would be a second membership engine.
 */
export const FULFILLMENT_TYPES = ['MANUAL'] as const;
export type FulfillmentType = typeof FULFILLMENT_TYPES[number];

export const STOCK_MODES = ['UNLIMITED', 'LIMITED'] as const;
export type StockMode = typeof STOCK_MODES[number];

/**
 * Redemption states.
 *
 * PENDING is INTERNAL. Mongo here is standalone, so a redemption cannot be one atomic write
 * — it is a saga across stock, two budgets and a coin balance. PENDING means "the workflow
 * started and has not finished acquiring everything", and it exists so a server that dies
 * mid-saga leaves a record that says exactly how far it got. A student is never told a
 * PENDING reward is theirs.
 */
export const REDEMPTION_STATES = ['PENDING', 'RESERVED', 'FULFILLED', 'CANCELLED'] as const;
export type RedemptionState = typeof REDEMPTION_STATES[number];

/** Where a state may go. Terminal states go nowhere — there is no un-fulfilling. */
export const ALLOWED_TRANSITIONS: Record<RedemptionState, RedemptionState[]> = {
  PENDING:   ['RESERVED', 'CANCELLED'],
  RESERVED:  ['FULFILLED', 'CANCELLED'],
  FULFILLED: [],
  CANCELLED: [],
};

export const canTransition = (from: RedemptionState, to: RedemptionState): boolean =>
  (ALLOWED_TRANSITIONS[from] || []).includes(to);

/** A student can see these; each names one fixable thing. */
export type RedemptionRefusal =
  | 'REWARD_NOT_FOUND'
  | 'REWARD_UNAVAILABLE'
  | 'NOT_STARTED'
  | 'EXPIRED'
  | 'MEMBERSHIP_REQUIRED'
  | 'INSUFFICIENT_COINS'
  | 'MIN_REDEMPTION_NOT_REACHED'
  | 'INSUFFICIENT_XP'
  | 'LEVEL_REQUIRED'
  | 'BADGE_REQUIRED'
  | 'OUT_OF_STOCK'
  | 'REDEMPTION_LIMIT_REACHED'
  | 'TOTAL_LIMIT_REACHED'
  | 'MEMBER_REWARD_BUDGET_EXCEEDED'
  | 'TENANT_REWARD_BUDGET_UNAVAILABLE'
  | 'REDEMPTIONS_PAUSED'
  | 'REDEMPTION_DUPLICATE'
  | 'INVALID_STATE';

/**
 * What a student is told.
 *
 * Never the business's numbers. "This reward is temporarily unavailable" is the honest
 * public form of "the tenant has ₹37 of budget left" — the student cannot act on the second
 * one and it is nobody's business but ours.
 */
export const REFUSAL_MESSAGE: Record<string, string> = {
  REWARD_NOT_FOUND: 'That reward does not exist.',
  REWARD_UNAVAILABLE: 'This reward is not available right now.',
  NOT_STARTED: 'This reward is not open yet.',
  EXPIRED: 'This reward is no longer available.',
  MEMBERSHIP_REQUIRED: 'An active CareerPilot membership is needed to redeem rewards.',
  INSUFFICIENT_COINS: 'You do not have enough coins for this yet.',
  MIN_REDEMPTION_NOT_REACHED: 'Your coin balance is below the minimum needed to redeem.',
  INSUFFICIENT_XP: 'You need more XP to unlock this reward.',
  LEVEL_REQUIRED: 'You need a higher level to unlock this reward.',
  BADGE_REQUIRED: 'This reward unlocks with a badge you have not earned yet.',
  OUT_OF_STOCK: 'This reward is out of stock.',
  REDEMPTION_LIMIT_REACHED: 'You have already redeemed this as many times as allowed.',
  TOTAL_LIMIT_REACHED: 'This reward has been fully claimed.',
  // Both budget refusals read the same to a student, on purpose. Which budget ran out is
  // an internal matter, and telling them would invite gaming the timing.
  MEMBER_REWARD_BUDGET_EXCEEDED: 'This reward is not available on your account right now.',
  TENANT_REWARD_BUDGET_UNAVAILABLE: 'This reward is temporarily unavailable.',
  REDEMPTIONS_PAUSED: 'Reward redemption is paused at the moment.',
  REDEMPTION_DUPLICATE: 'You have already requested this reward.',
  INVALID_STATE: 'That redemption can no longer be changed.',
};

export const refusalMessage = (code: string): string =>
  REFUSAL_MESSAGE[code] || 'This reward is not available right now.';

/**
 * Which saga steps a redemption has completed.
 *
 * Persisted rather than held in memory, because the whole point is surviving a process that
 * dies between two of them. A recovery run reads these to know what it must finish and what
 * it must give back — guessing would either double-charge a student or hand out a free
 * reward.
 */
export interface ReservationSteps {
  stockReserved: boolean;
  tenantBudgetReserved: boolean;
  memberBudgetReserved: boolean;
  coinsDebited: boolean;
}

export const NO_STEPS: ReservationSteps = {
  stockReserved: false,
  tenantBudgetReserved: false,
  memberBudgetReserved: false,
  coinsDebited: false,
};

/** Coin ledger event keys. Spending is negative; the refund is a separate, positive row. */
export const COIN_EVENT_REDEMPTION = 'reward_redemption';
export const COIN_EVENT_REDEMPTION_REFUND = 'reward_redemption_refund';

/** Rupees ↔ paise, for the business-cost side. Integers only, as Module 11 established. */
export const rupeesToPaise = (rupees: number): number => Math.round(rupees * 100);
export const paiseToRupees = (paise: number): number => Math.round(paise) / 100;
