import mongoose, { Document, Schema } from 'mongoose';

/**
 * The CareerPilot coin economy.
 *
 * Coins are DELIBERATELY separate from XP. XP is status — it only ever accumulates, and
 * drives level, rank and leaderboards. Coins are currency — they are spent, and the
 * balance goes down. Merging them would mean redeeming a reward drops your rank, which
 * punishes exactly the behaviour the whole system exists to encourage.
 *
 * Four collections:
 *   CoinConfig  — one per tenant: the economy's dials
 *   CoinRule    — one per earning event: how much, capped how
 *   CoinLedger  — append-only record of every movement. The source of truth
 *   CoinAccount — the running balance, derivable from the ledger but kept for reads
 *
 * The ledger is separate from `PassportProgress.xpLog` on purpose. That log is a rolling
 * array capped at 400 entries inside the progress document — fine for showing recent
 * activity, useless as money. You cannot audit it, reconcile it, or defend a dispute with
 * it. Once points convert to rupees they need a real ledger.
 */

// ─── Config ──────────────────────────────────────────────────────────────────

export interface ICoinConfig extends Document {
  tenantId: string;
  enabled: boolean;
  /**
   * Internal accounting only — NOT shown to members. Publishing an exchange rate creates
   * an expectation you have to honour forever ("my 20,000 coins are worth ₹200"), and
   * makes every reward not priced at exactly that rate look like a cheat. Members see the
   * catalogue's coin prices and nothing else. This exists so the cost guard can convert.
   */
  coinsPerRupee: number;
  /** Coins a member can earn per calendar month from non-referral activity. */
  monthlyEarnCap: number;
  /** Real cost, in rupees, that one member may consume in rewards per year. The budget. */
  annualRealCostBudgetInr: number;
  /** Coins expire this many months after being earned. 0 disables expiry. */
  expiryMonths: number;
  /** Nothing can be redeemed below this balance — the main source of breakage. */
  minRedemption: number;
  /** Paid on the referee's PAYMENT, never on signup. Signup rewards are a fraud magnet. */
  referrerCoins: number;
  refereeCoins: number;
  /** Successful referrals per member per month before they go to manual review. */
  referralMonthlyCap: number;
  /**
   * Free members accrue coins but cannot spend them until they pay. Costs nothing —
   * unredeemed coins are not real — and turns the balance into a conversion lever.
   */
  freeMembersAccrue: boolean;
  updatedAt: Date;
}

const CoinConfigSchema = new Schema<ICoinConfig>({
  tenantId: { type: String, required: true, unique: true, index: true },
  enabled:  { type: Boolean, default: true },
  coinsPerRupee:           { type: Number, default: 100 },
  monthlyEarnCap:          { type: Number, default: 500 },
  annualRealCostBudgetInr: { type: Number, default: 48 },
  expiryMonths:            { type: Number, default: 12 },
  minRedemption:           { type: Number, default: 500 },
  referrerCoins:           { type: Number, default: 15000 },
  refereeCoins:            { type: Number, default: 4000 },
  referralMonthlyCap:      { type: Number, default: 10 },
  freeMembersAccrue:       { type: Boolean, default: true },
}, { timestamps: true });

export const CoinConfig = mongoose.model<ICoinConfig>('CoinConfig', CoinConfigSchema);

// ─── Rules ───────────────────────────────────────────────────────────────────

/**
 * Every event the product can pay for.
 *
 * All of them are seeded, most at zero and disabled, so an admin can switch on any
 * existing behaviour without a deploy. Only a genuinely NEW kind of event — one nothing
 * in the code emits yet — needs code.
 */
export const COIN_EVENTS = [
  { key: 'daily_login',        label: 'Daily login',                 coins: 0,  dailyCap: 1, enabled: true  },
  { key: 'mission_complete',   label: 'Any mission completed',       coins: 0,  dailyCap: 3, enabled: false },
  { key: 'mission_all_done',   label: 'All of today\'s missions done', coins: 8, dailyCap: 1, enabled: true  },
  { key: 'practice_solved',    label: 'Practice problem solved',     coins: 2,  dailyCap: 2, enabled: true  },
  { key: 'streak_7',           label: '7-day streak reached',        coins: 25, dailyCap: 1, enabled: true  },
  { key: 'interview_complete', label: 'Mock interview finished',     coins: 0,  dailyCap: 2, enabled: false },
  { key: 'resume_scored',      label: 'Resume scored',               coins: 0,  dailyCap: 1, enabled: false },
  { key: 'assessment_complete',label: 'Assessment completed',        coins: 0,  dailyCap: 1, enabled: false },
  { key: 'social_share',       label: 'Shared to social media',      coins: 0,  dailyCap: 1, enabled: false },
  { key: 'referral_converted', label: 'Referral became a paid member', coins: 0, dailyCap: 10, enabled: false },
  { key: 'question_approved',  label: 'Interview question approved',   coins: 50, dailyCap: 5, enabled: true  },
  { key: 'experience_approved',label: 'Interview experience approved', coins: 300, dailyCap: 2, enabled: true },
] as const;

export type CoinEventKey = typeof COIN_EVENTS[number]['key'];

export interface ICoinRule extends Document {
  tenantId: string;
  eventKey: string;
  label: string;
  coins: number;
  /** 0 = no cap. */
  dailyCap: number;
  monthlyCap: number;
  enabled: boolean;
}

const CoinRuleSchema = new Schema<ICoinRule>({
  tenantId:   { type: String, required: true, index: true },
  eventKey:   { type: String, required: true },
  label:      { type: String, default: '' },
  coins:      { type: Number, default: 0 },
  dailyCap:   { type: Number, default: 0 },
  monthlyCap: { type: Number, default: 0 },
  enabled:    { type: Boolean, default: false },
}, { timestamps: true });

CoinRuleSchema.index({ tenantId: 1, eventKey: 1 }, { unique: true });

export const CoinRule = mongoose.model<ICoinRule>('CoinRule', CoinRuleSchema);

// ─── Ledger ──────────────────────────────────────────────────────────────────

export interface ICoinLedger extends Document {
  tenantId: string;
  studentId: mongoose.Types.ObjectId;
  eventKey: string;
  /** Positive to earn, negative to spend. */
  coins: number;
  balanceAfter: number;
  /**
   * Makes an award exactly-once. A retried request, a double-clicked button or a
   * re-delivered webhook all carry the same key and the unique index rejects the second
   * write — which is the difference between a ledger and a list.
   */
  idempotencyKey: string;
  note?: string;
  meta?: Record<string, any>;
  /** Null when expiry is off. Earned coins only. */
  expiresAt?: Date | null;
  createdAt: Date;
}

const CoinLedgerSchema = new Schema<ICoinLedger>({
  tenantId:  { type: String, required: true, index: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  eventKey:  { type: String, required: true, index: true },
  coins:        { type: Number, required: true },
  balanceAfter: { type: Number, required: true },
  idempotencyKey: { type: String, required: true },
  note: { type: String },
  meta: { type: Schema.Types.Mixed },
  expiresAt: { type: Date, default: null },
}, { timestamps: { createdAt: true, updatedAt: false } });

CoinLedgerSchema.index({ tenantId: 1, idempotencyKey: 1 }, { unique: true });
CoinLedgerSchema.index({ tenantId: 1, studentId: 1, createdAt: -1 });
// Serves the daily/monthly cap counts, which run on every single award.
CoinLedgerSchema.index({ tenantId: 1, studentId: 1, eventKey: 1, createdAt: -1 });

export const CoinLedger = mongoose.model<ICoinLedger>('CoinLedger', CoinLedgerSchema);

// ─── Account ─────────────────────────────────────────────────────────────────

export interface ICoinAccount extends Document {
  tenantId: string;
  studentId: mongoose.Types.ObjectId;
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  /** Real cost consumed this budget year, in rupees — what the 3% guard actually meters. */
  realCostThisYearInr: number;
  budgetYearStart: Date;
  updatedAt: Date;
}

const CoinAccountSchema = new Schema<ICoinAccount>({
  tenantId:  { type: String, required: true, index: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  balance:        { type: Number, default: 0 },
  lifetimeEarned: { type: Number, default: 0 },
  lifetimeSpent:  { type: Number, default: 0 },
  realCostThisYearInr: { type: Number, default: 0 },
  budgetYearStart: { type: Date, default: Date.now },
}, { timestamps: true });

CoinAccountSchema.index({ tenantId: 1, studentId: 1 }, { unique: true });
// Powers a coin leaderboard without a collection scan.
CoinAccountSchema.index({ tenantId: 1, lifetimeEarned: -1 });

export const CoinAccount = mongoose.model<ICoinAccount>('CoinAccount', CoinAccountSchema);
