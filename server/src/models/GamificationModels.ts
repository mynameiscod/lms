import mongoose, { Schema, Document } from 'mongoose';
import {
  BadgeConditionType, RewardBudgetMode, REWARD_BUDGET_MODES, DEFAULT_TOP_N,
} from '../data/gamificationPolicy';

/**
 * The configurable engagement layer: XP rules, the XP ledger, badges and tenant settings.
 *
 * MODELLED ON THE COIN ENGINE, DELIBERATELY. CoinRule/CoinLedger already solve per-event
 * configuration, caps and exactly-once awarding, and they solve it well — so this borrows
 * the shape rather than inventing a second idiom. What it does NOT do is reuse those
 * collections: coins are redeemable and carry real financial liability, XP does not, and one
 * table serving both would make every future reward question start with "but which kind of
 * balance is this row?".
 *
 * Grouped in one file for the same reason CoinModels is: they are meaningless apart, always
 * change together, and splitting them across five files would hide that.
 */

// ── XP rules ────────────────────────────────────────────────────────────────

export interface IXpRule extends Document {
  tenantId: string;
  /** Stable event identifier. The contract; display names may change, this may not. */
  eventKey: string;
  enabled: boolean;
  xp: number;
  /** Most XP this event may contribute in one day. 0 disables the cap. */
  dailyLimit: number;
  /** One award per distinct source, however many times the event arrives. */
  uniqueSource: boolean;
  /** Whether doing this counts as showing up today. */
  streakQualifying: boolean;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const XpRuleSchema = new Schema<IXpRule>(
  {
    tenantId:  { type: String, required: true, index: true },
    eventKey:  { type: String, required: true, uppercase: true, trim: true },
    enabled:   { type: Boolean, default: true },
    xp:        { type: Number, default: 0, min: 0 },
    dailyLimit:{ type: Number, default: 0, min: 0 },
    uniqueSource:     { type: Boolean, default: true },
    streakQualifying: { type: Boolean, default: true },
    updatedBy: { type: String },
  },
  { timestamps: true },
);

XpRuleSchema.index({ tenantId: 1, eventKey: 1 }, { unique: true });

export const XpRule = mongoose.model<IXpRule>('XpRule', XpRuleSchema);

// ── XP ledger ───────────────────────────────────────────────────────────────

export interface IXpLedger extends Document {
  tenantId: string;
  studentId: mongoose.Types.ObjectId;
  eventKey: string;
  sourceType: string;
  sourceId: string;
  /**
   * Describes the EVENT, not the request — and deliberately not the student.
   *
   * "CAREER_MISSION_COMPLETED:mission:cp:rm1:3:2026-08-17" — so a double-clicked button, a
   * retried request and a redelivered job all carry the same key and the unique index below
   * rejects every one after the first.
   *
   * WHOSE event it is belongs in the INDEX, not in this string. Two students finishing the
   * same coding problem produce the same event key, and they must both be paid for it; the
   * uniqueness that matters is per student. Encoding the student id here would work and
   * would be wrong — the key would stop describing the event, and every future reader would
   * have to parse it to find out what happened.
   */
  idempotencyKey: string;
  amount: number;
  /** Kept for explaining a balance later without re-deriving anything. */
  metadata?: Record<string, any>;
  at: Date;
  createdAt: Date;
}

const XpLedgerSchema = new Schema<IXpLedger>(
  {
    tenantId:  { type: String, required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    eventKey:  { type: String, required: true },
    sourceType:{ type: String, default: '' },
    sourceId:  { type: String, default: '' },
    idempotencyKey: { type: String, required: true },
    amount:    { type: Number, required: true },
    metadata:  { type: Schema.Types.Mixed },
    at:        { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

/**
 * WHY THIS EXISTS WHEN PassportProgress.xpLog ALREADY DOES.
 *
 * xpLog is TRIMMED TO THE LAST 400 ENTRIES and carries only {at, amount, source}. Neither
 * limitation is incidental:
 *
 *   - a monthly leaderboard reads a month of history, and an active student passes 400
 *     entries well inside that, so ranks would quietly go wrong for exactly the people who
 *     use the product most;
 *   - there is no event key and no idempotency key, so it cannot refuse a duplicate.
 *
 * This ledger is append-only and unbounded, and it is the authority for period leaderboards
 * and for "why does Rahul have 8,420 XP?". PassportProgress.xp stays as the fast current
 * balance and xpLog keeps feeding the existing activity chart, untouched.
 */
/**
 * IDEMPOTENCY IS PER STUDENT.
 *
 * This was `(tenantId, idempotencyKey)`, which made one logical event mutually exclusive
 * across everybody in a tenant — the first student to earn something locked every other
 * student out of it forever. It went unnoticed because the two events shipped so far happen
 * to carry ids that are already unique per student (a roadmap-scoped mission key, an
 * assessment attempt id), so the bug was invisible in exactly the paths that were tested.
 *
 * The streak bonus showed it plainly: `STREAK_MILESTONE:streak:7` is identical for every
 * student, so the first person in a tenant to reach a seven-day streak took the only bonus
 * that tenant would ever pay. Any event keyed on a SHARED resource — a quiz, a coding
 * problem, a piece of content — would have failed the same way the moment it was added,
 * which is most of the events §7 anticipates.
 *
 * Named explicitly so the migration that removes the old index can refer to it, and so a
 * later reader can see the shape was chosen rather than inherited.
 */
export const XP_LEDGER_UNIQUE_INDEX = 'xp_ledger_student_event_unique';

XpLedgerSchema.index(
  { tenantId: 1, studentId: 1, idempotencyKey: 1 },
  { unique: true, name: XP_LEDGER_UNIQUE_INDEX },
);

/** The index this replaced. Kept as a constant so the migration cannot misspell it. */
export const XP_LEDGER_OBSOLETE_INDEX = 'tenantId_1_idempotencyKey_1';
/** Period aggregation for one student, and the leaderboard's group-by. */
XpLedgerSchema.index({ tenantId: 1, studentId: 1, at: -1 });
XpLedgerSchema.index({ tenantId: 1, at: -1 });
/** Counting occurrences of one event, for EVENT_COUNT badges. */
XpLedgerSchema.index({ tenantId: 1, studentId: 1, eventKey: 1 });

export const XpLedger = mongoose.model<IXpLedger>('XpLedger', XpLedgerSchema);

// ── badges ──────────────────────────────────────────────────────────────────

export interface IBadgeDefinition extends Document {
  tenantId: string;
  /** Immutable. The display name may change; this may not — awards reference it. */
  key: string;
  name: string;
  description: string;
  iconKey: string;
  active: boolean;
  conditionType: BadgeConditionType;
  conditionConfig: { threshold: number; eventKey?: string };
  displayOrder: number;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BadgeDefinitionSchema = new Schema<IBadgeDefinition>(
  {
    tenantId:    { type: String, required: true, index: true },
    key:         { type: String, required: true, uppercase: true, trim: true },
    name:        { type: String, required: true, trim: true, maxlength: 60 },
    description: { type: String, default: '', trim: true, maxlength: 300 },
    iconKey:     { type: String, default: 'bi-award-fill' },
    active:      { type: Boolean, default: true },
    conditionType:   { type: String, required: true },
    conditionConfig: {
      threshold: { type: Number, required: true },
      eventKey:  { type: String },
    },
    displayOrder: { type: Number, default: 100 },
    updatedBy:    { type: String },
  },
  { timestamps: true },
);

BadgeDefinitionSchema.index({ tenantId: 1, key: 1 }, { unique: true });

export const BadgeDefinition = mongoose.model<IBadgeDefinition>('BadgeDefinition', BadgeDefinitionSchema);

export interface IStudentBadge extends Document {
  tenantId: string;
  studentId: mongoose.Types.ObjectId;
  badgeKey: string;
  awardedAt: Date;
  /** What triggered it, for explaining an award later. */
  source?: string;
  createdAt: Date;
}

const StudentBadgeSchema = new Schema<IStudentBadge>(
  {
    tenantId:  { type: String, required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    badgeKey:  { type: String, required: true, uppercase: true, trim: true },
    awardedAt: { type: Date, default: Date.now },
    source:    { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

/**
 * One award per badge, enforced by the database.
 *
 * Badge evaluation runs after events that can arrive concurrently, so two simultaneous
 * completions could both decide the seventh-day streak was reached. The index makes the
 * second a no-op rather than a duplicate trophy.
 */
StudentBadgeSchema.index({ tenantId: 1, studentId: 1, badgeKey: 1 }, { unique: true });
StudentBadgeSchema.index({ tenantId: 1, studentId: 1, awardedAt: -1 });

export const StudentBadge = mongoose.model<IStudentBadge>('StudentBadge', StudentBadgeSchema);

// ── tenant settings: leaderboards and reward budget ─────────────────────────

export interface IGamificationConfig extends Document {
  tenantId: string;

  leaderboard: {
    collegeEnabled: boolean;
    /** Opting IN to cross-tenant ranking. Default false — nobody is entered without saying so. */
    globalEnabled: boolean;
    weeklyEnabled: boolean;
    monthlyEnabled: boolean;
    allTimeEnabled: boolean;
    topN: number;
  };

  /**
   * Reward liability controls.
   *
   * Governs COINS and reward value, never XP. A student with 50,000 XP has earned no money
   * and reserves nothing; only an explicit configured reward event can create liability.
   */
  reward: {
    enabled: boolean;
    mode: RewardBudgetMode;
    /** MANUAL: the period budget in paise, set by an admin. */
    manualBudgetPaise: number;
    /** PERCENTAGE: basis points of eligible revenue. 200 = 2%. */
    basisPoints: number;
    /** Optional ceiling in paise, applied to either mode. 0 = none. */
    capPaise: number;
    /**
     * Revenue before this date does not count, and neither does anything earned before it.
     *
     * Without it, switching rewards on would instantly capitalise years of history into a
     * budget somebody has to honour. That is a business risk the product should not be able
     * to create by ticking a box.
     */
    effectiveFrom?: Date;
  };

  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const GamificationConfigSchema = new Schema<IGamificationConfig>(
  {
    tenantId: { type: String, required: true, unique: true, index: true },

    leaderboard: {
      collegeEnabled:  { type: Boolean, default: true },
      globalEnabled:   { type: Boolean, default: false },
      weeklyEnabled:   { type: Boolean, default: true },
      monthlyEnabled:  { type: Boolean, default: true },
      allTimeEnabled:  { type: Boolean, default: true },
      topN:            { type: Number, default: DEFAULT_TOP_N },
    },

    reward: {
      enabled:           { type: Boolean, default: false },
      mode:              { type: String, enum: REWARD_BUDGET_MODES, default: 'MANUAL' },
      manualBudgetPaise: { type: Number, default: 0, min: 0 },
      basisPoints:       { type: Number, default: 0, min: 0 },
      capPaise:          { type: Number, default: 0, min: 0 },
      effectiveFrom:     { type: Date },
    },

    updatedBy: { type: String },
  },
  { timestamps: true },
);

export const GamificationConfig = mongoose.model<IGamificationConfig>(
  'GamificationConfig', GamificationConfigSchema);

// ── reward ledger ───────────────────────────────────────────────────────────

export type RewardEntryState = 'RESERVED' | 'REDEEMED' | 'CANCELLED';

export interface IRewardLedger extends Document {
  tenantId: string;
  studentId: mongoose.Types.ObjectId;
  /** 'YYYY-MM' — the budget period this draws from. */
  period: string;
  reason: string;
  valuePaise: number;
  state: RewardEntryState;
  idempotencyKey: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RewardLedgerSchema = new Schema<IRewardLedger>(
  {
    tenantId:  { type: String, required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    period:    { type: String, required: true },
    reason:    { type: String, default: '' },
    valuePaise:{ type: Number, required: true, min: 0 },
    state:     { type: String, enum: ['RESERVED', 'REDEEMED', 'CANCELLED'], default: 'RESERVED' },
    idempotencyKey: { type: String, required: true },
    createdBy: { type: String },
  },
  { timestamps: true },
);

/** The same exactly-once discipline as the XP and coin ledgers. */
RewardLedgerSchema.index({ tenantId: 1, idempotencyKey: 1 }, { unique: true });
/** Summing what a period has committed. */
RewardLedgerSchema.index({ tenantId: 1, period: 1, state: 1 });

export const RewardLedger = mongoose.model<IRewardLedger>('RewardLedger', RewardLedgerSchema);
