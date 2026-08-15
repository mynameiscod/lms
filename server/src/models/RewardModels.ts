import mongoose, { Schema, Document } from 'mongoose';
import {
  REWARD_TYPES, FULFILLMENT_TYPES, STOCK_MODES, REDEMPTION_STATES,
  RewardType, FulfillmentType, StockMode, RedemptionState, ReservationSteps,
} from '../data/rewardPolicy';

/** Mongo enum for the per-step state. Mirrors StepState in the policy. */
const STEP_STATES = ['NONE', 'CLAIMED', 'DONE'];

/**
 * The reward catalogue, and the record of everything redeemed from it.
 *
 * TWO COLLECTIONS, NOT THREE. RewardRedemption IS the reward transaction history — coins
 * already have CoinLedger and liability already has RewardBudget, and a third ledger
 * duplicating either would eventually disagree with it.
 *
 * NOTHING HERE IS SEEDED ACTIVE. A deployed tenant starts with an empty catalogue. Shipping
 * a T-shirt or a ₹500 voucher as live configuration would create real financial liability
 * because somebody merged a module.
 */

// ── catalogue ───────────────────────────────────────────────────────────────

export interface IRewardDefinition extends Document {
  tenantId: string;
  /** Immutable business identity. The display name may change; this may not. */
  key: string;

  name: string;
  description: string;
  type: RewardType;
  iconKey: string;
  imageUrl?: string;

  /** What the STUDENT pays. Unrelated to what it costs us. */
  coinCost: number;
  /** What it costs the BUSINESS, in paise. Never shown to a student. */
  budgetCostPaise: number;

  active: boolean;
  studentVisible: boolean;

  stockMode: StockMode;
  /** LIMITED only: units still claimable. Decremented atomically on reservation. */
  stockAvailable: number;
  stockReserved: number;
  stockFulfilled: number;

  /** 0 = unlimited. */
  perStudentLimit: number;
  totalRedemptionLimit: number;
  totalRedeemed: number;

  minimumXp: number;
  minimumLevel: number;
  requiredBadgeKeys: string[];

  availableFrom?: Date;
  availableUntil?: Date;

  fulfillmentType: FulfillmentType;
  instructions?: string;
  displayOrder: number;

  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RewardDefinitionSchema = new Schema<IRewardDefinition>(
  {
    tenantId: { type: String, required: true, index: true },
    key: {
      type: String, required: true, uppercase: true, trim: true,
      validate: {
        validator: (v: string) => /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/.test(v),
        message: 'A reward key must be uppercase words joined by underscores, e.g. CODEBEGUN_TSHIRT.',
      },
    },

    name:        { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, default: '', trim: true, maxlength: 500 },
    type:        { type: String, enum: REWARD_TYPES, required: true },
    iconKey:     { type: String, default: 'bi-gift-fill' },
    imageUrl:    { type: String },

    coinCost:        { type: Number, required: true, min: 1 },
    budgetCostPaise: { type: Number, required: true, min: 0 },

    // OFF by default. A reward becomes a liability only when an admin says so.
    active:         { type: Boolean, default: false },
    studentVisible: { type: Boolean, default: true },

    stockMode:      { type: String, enum: STOCK_MODES, default: 'UNLIMITED' },
    stockAvailable: { type: Number, default: 0, min: 0 },
    stockReserved:  { type: Number, default: 0, min: 0 },
    stockFulfilled: { type: Number, default: 0, min: 0 },

    perStudentLimit:      { type: Number, default: 1, min: 0 },
    totalRedemptionLimit: { type: Number, default: 0, min: 0 },
    totalRedeemed:        { type: Number, default: 0, min: 0 },

    minimumXp:         { type: Number, default: 0, min: 0 },
    minimumLevel:      { type: Number, default: 0, min: 0 },
    requiredBadgeKeys: { type: [String], default: [] },

    availableFrom:  { type: Date },
    availableUntil: { type: Date },

    fulfillmentType: { type: String, enum: FULFILLMENT_TYPES, default: 'MANUAL' },
    instructions:    { type: String, maxlength: 500 },
    displayOrder:    { type: Number, default: 100 },

    createdBy: { type: String },
    updatedBy: { type: String },
  },
  { timestamps: true },
);

RewardDefinitionSchema.index({ tenantId: 1, key: 1 }, { unique: true });
/** The catalogue query: what this tenant currently offers, in order. */
RewardDefinitionSchema.index({ tenantId: 1, active: 1, displayOrder: 1 });

export const RewardDefinition = mongoose.model<IRewardDefinition>('RewardDefinition', RewardDefinitionSchema);

// ── redemptions ─────────────────────────────────────────────────────────────

export interface IRewardRedemption extends Document {
  tenantId: string;
  studentId: mongoose.Types.ObjectId;
  rewardKey: string;

  /**
   * The economics AS THEY WERE when the student redeemed.
   *
   * Snapshotted, never re-read from the catalogue. An admin raising a T-shirt from 1,500 to
   * 2,000 coins next month must not retroactively change what somebody paid, and raising its
   * business cost must not retroactively change a liability already committed to a budget
   * period that may be closed.
   */
  coinCost: number;
  budgetCostPaise: number;
  rewardName: string;
  rewardType: string;

  status: RedemptionState;
  /** Which saga steps completed. The recovery anchor — see rewardPolicy.ReservationSteps. */
  steps: ReservationSteps;

  /** Scoped to the student; the same token from the same student is one redemption. */
  idempotencyKey: string;
  /** The budget period this liability belongs to, fixed at reservation (§48). */
  budgetPeriod: string;

  requestedAt: Date;
  reservedAt?: Date;
  fulfilledAt?: Date;
  cancelledAt?: Date;

  fulfilledBy?: string;
  cancelledBy?: string;
  fulfillmentReference?: string;
  adminNotes?: string;
  cancelReason?: string;

  /** Minimal, for fulfilment only. No email, no phone, no assessment data. */
  studentSnapshot?: { displayName?: string; collegeName?: string };

  createdAt: Date;
  updatedAt: Date;
}

const RewardRedemptionSchema = new Schema<IRewardRedemption>(
  {
    tenantId:  { type: String, required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    rewardKey: { type: String, required: true, uppercase: true, trim: true },

    coinCost:        { type: Number, required: true, min: 0 },
    budgetCostPaise: { type: Number, required: true, min: 0 },
    rewardName:      { type: String, required: true },
    rewardType:      { type: String, required: true },

    status: { type: String, enum: REDEMPTION_STATES, default: 'PENDING' },
    /**
     * Per-step state, and the thing that serialises concurrent resumes of ONE redemption.
     *
     * Each transition from NONE to CLAIMED is an atomic conditional update on this document,
     * so exactly one worker ever performs a given step for a given redemption — regardless
     * of what the downstream resource's own guards happen to allow. Booleans could not do
     * this: two workers read the same false and both acted.
     */
    steps: {
      stock:        { type: String, enum: STEP_STATES, default: 'NONE' },
      tenantBudget: { type: String, enum: STEP_STATES, default: 'NONE' },
      memberBudget: { type: String, enum: STEP_STATES, default: 'NONE' },
      coins:        { type: String, enum: STEP_STATES, default: 'NONE' },
    },

    idempotencyKey: { type: String, required: true },
    budgetPeriod:   { type: String, required: true },

    requestedAt: { type: Date, default: Date.now },
    reservedAt:  { type: Date },
    fulfilledAt: { type: Date },
    cancelledAt: { type: Date },

    fulfilledBy:          { type: String },
    cancelledBy:          { type: String },
    fulfillmentReference: { type: String, maxlength: 200 },
    adminNotes:           { type: String, maxlength: 1000 },
    cancelReason:         { type: String, maxlength: 300 },

    studentSnapshot: {
      displayName: { type: String },
      collegeName: { type: String },
    },
  },
  { timestamps: true },
);

/**
 * ONE REDEMPTION PER INTENT, PER STUDENT.
 *
 * Scoped to the student deliberately — the mistake Module 11 shipped and had to fix was a
 * tenant-wide idempotency key, which made one student's action lock out everybody else's.
 * A repeatable reward works because a later, genuinely separate intent carries a different
 * token; a double-clicked button carries the same one.
 */
RewardRedemptionSchema.index(
  { tenantId: 1, studentId: 1, idempotencyKey: 1 },
  { unique: true, name: 'reward_redemption_intent_unique' },
);

/** A student's own history, newest first. */
RewardRedemptionSchema.index({ tenantId: 1, studentId: 1, requestedAt: -1 });
/** The admin queue, and counting a reward's claims. */
RewardRedemptionSchema.index({ tenantId: 1, status: 1, requestedAt: -1 });
RewardRedemptionSchema.index({ tenantId: 1, rewardKey: 1, status: 1 });

export const RewardRedemption = mongoose.model<IRewardRedemption>('RewardRedemption', RewardRedemptionSchema);
