import mongoose, { Schema, Document } from 'mongoose';

/*
 * LMS REFER & EARN (course referrals). Separate from CareerPilot's referral, which pays in coins
 * (services/coinService.ts, referral_converted); nothing here touches that.
 *
 * A student refers a friend → the friend becomes a CRM lead (source "referral") → the friend joins and
 * pays the FULL fee → the reward is held for `holdDays` (refunds, drop-outs) → it becomes earned and the
 * student can withdraw it to UPI or a bank account. An admin marks every payout paid by hand.
 *
 * Statuses, in order:
 *   pending   the friend is a lead, has not joined yet
 *   joined    the friend is a student, the full fee is not paid yet
 *   on_hold   full fee paid; the reward unlocks at holdUntil
 *   earned    the reward counts toward the referrer's balance (final)
 *   rejected  does not count (duplicate, self-referral, refund, admin decision)
 */

export const REFERRAL_STATUSES = ['pending', 'joined', 'on_hold', 'earned', 'rejected'] as const;
export type ReferralStatus = typeof REFERRAL_STATUSES[number];

/* ───────────────────────── Program settings (one per institute) ───────────────────────── */

export interface IReferralProgram extends Document {
  tenantId: mongoose.Types.ObjectId;
  enabled: boolean;
  rewardAmount: number;
  holdDays: number;
  /** Courses the friend can pick on the referral form. The reward is the same for every course. */
  courses: string[];
  minPayout: number;
  terms: string;
  updatedBy?: mongoose.Types.ObjectId;
  updatedAt: Date;
}

export const REFERRAL_DEFAULTS = {
  enabled: true,
  rewardAmount: 1500,
  holdDays: 30,
  minPayout: 1500,
  courses: ['Java Full Stack with AI', 'Python Full Stack with AI', 'Data Analytics with AI', 'Data Science with AI'],
  terms: [
    'You earn the reward when your friend joins a course and pays the full fee.',
    'The reward is held for the hold period after the full fee is paid, then it is yours to withdraw.',
    'A friend who was already a student, or had already enquired with us, does not count.',
    'If the fee is refunded during the hold period, the reward is cancelled.',
    'Payouts go to the UPI ID or bank account you give, after the institute checks them.',
  ].join('\n'),
};

const ReferralProgramSchema = new Schema<IReferralProgram>({
  tenantId:     { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true },
  enabled:      { type: Boolean, default: REFERRAL_DEFAULTS.enabled },
  rewardAmount: { type: Number, default: REFERRAL_DEFAULTS.rewardAmount, min: 0 },
  holdDays:     { type: Number, default: REFERRAL_DEFAULTS.holdDays, min: 0 },
  courses:      { type: [String], default: REFERRAL_DEFAULTS.courses },
  minPayout:    { type: Number, default: REFERRAL_DEFAULTS.minPayout, min: 0 },
  terms:        { type: String, default: REFERRAL_DEFAULTS.terms },
  updatedBy:    { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export const ReferralProgram = mongoose.model<IReferralProgram>('ReferralProgram', ReferralProgramSchema);

/* ───────────────────────── A student's code (never changes) ───────────────────────── */

export interface IPayoutDetails {
  method: 'upi' | 'bank';
  upiId?: string;
  holderName?: string;
  accountNumber?: string;
  ifsc?: string;
  bankName?: string;
}

const PayoutDetailsSchema = new Schema<IPayoutDetails>({
  method:        { type: String, enum: ['upi', 'bank'], required: true },
  upiId:         { type: String, trim: true },
  holderName:    { type: String, trim: true },
  accountNumber: { type: String, trim: true },
  ifsc:          { type: String, trim: true, uppercase: true },
  bankName:      { type: String, trim: true },
}, { _id: false });

export interface IReferralCode extends Document {
  tenantId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  code: string;
  /** The last payout details used, filled in for the next withdrawal. */
  payoutDetails?: IPayoutDetails;
  createdAt: Date;
}

const ReferralCodeSchema = new Schema<IReferralCode>({
  tenantId:      { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  userId:        { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  code:          { type: String, required: true, unique: true, uppercase: true, trim: true },
  payoutDetails: { type: PayoutDetailsSchema },
}, { timestamps: true });

export const ReferralCode = mongoose.model<IReferralCode>('ReferralCode', ReferralCodeSchema);

/* ───────────────────────── One referred friend ───────────────────────── */

export interface IReferral extends Document {
  tenantId: mongoose.Types.ObjectId;
  referrerId: mongoose.Types.ObjectId;
  referrerName: string;
  code: string;
  friendName: string;
  /** Ten digits, as utils/phone normalizePhone leaves it. */
  friendPhone: string;
  friendEmail?: string;
  course?: string;
  /** Set while the referral counts; unset when rejected. Unique per institute, so one friend = one reward. */
  activeKey?: string;
  via: 'link' | 'app' | 'admin';
  leadId?: mongoose.Types.ObjectId;
  studentId?: mongoose.Types.ObjectId;
  status: ReferralStatus;
  rewardAmount: number;
  joinedAt?: Date;
  qualifiedAt?: Date;
  holdUntil?: Date;
  earnedAt?: Date;
  rejectedAt?: Date;
  rejectedReason?: string;
  history: { at: Date; status: string; note?: string; by?: string }[];
  createdAt: Date;
  updatedAt: Date;
}

const ReferralSchema = new Schema<IReferral>({
  tenantId:       { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  referrerId:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
  referrerName:   { type: String, default: '' },
  code:           { type: String, default: '' },
  friendName:     { type: String, required: true, trim: true },
  friendPhone:    { type: String, required: true },
  friendEmail:    { type: String, trim: true, lowercase: true },
  course:         { type: String, trim: true },
  activeKey:      { type: String },
  via:            { type: String, enum: ['link', 'app', 'admin'], default: 'link' },
  leadId:         { type: Schema.Types.ObjectId, ref: 'Lead' },
  studentId:      { type: Schema.Types.ObjectId, ref: 'User' },
  status:         { type: String, enum: REFERRAL_STATUSES, default: 'pending' },
  rewardAmount:   { type: Number, default: 0 },
  joinedAt:       { type: Date },
  qualifiedAt:    { type: Date },
  holdUntil:      { type: Date },
  earnedAt:       { type: Date },
  rejectedAt:     { type: Date },
  rejectedReason: { type: String },
  history:        { type: [{ at: Date, status: String, note: String, by: String, _id: false }], default: [] },
}, { timestamps: true });

ReferralSchema.index({ tenantId: 1, activeKey: 1 }, { unique: true, partialFilterExpression: { activeKey: { $exists: true } } });
ReferralSchema.index({ referrerId: 1, createdAt: -1 });
ReferralSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
ReferralSchema.index({ studentId: 1 }, { sparse: true });
ReferralSchema.index({ leadId: 1 }, { sparse: true });

export const Referral = mongoose.model<IReferral>('Referral', ReferralSchema);

/* ───────────────────────── A withdrawal ───────────────────────── */

export interface IReferralPayout extends Document {
  tenantId: mongoose.Types.ObjectId;
  referrerId: mongoose.Types.ObjectId;
  referrerName: string;
  amount: number;
  details: IPayoutDetails;
  status: 'requested' | 'paid' | 'rejected';
  /** Set only while requested: one open request per student (unique index below). */
  openKey?: string;
  reference?: string;
  paidAt?: Date;
  paidBy?: mongoose.Types.ObjectId;
  paidByName?: string;
  rejectedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReferralPayoutSchema = new Schema<IReferralPayout>({
  tenantId:       { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  referrerId:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
  referrerName:   { type: String, default: '' },
  amount:         { type: Number, required: true, min: 1 },
  details:        { type: PayoutDetailsSchema, required: true },
  status:         { type: String, enum: ['requested', 'paid', 'rejected'], default: 'requested' },
  openKey:        { type: String },
  reference:      { type: String, trim: true },
  paidAt:         { type: Date },
  paidBy:         { type: Schema.Types.ObjectId, ref: 'User' },
  paidByName:     { type: String },
  rejectedReason: { type: String },
}, { timestamps: true });

ReferralPayoutSchema.index({ openKey: 1 }, { unique: true, partialFilterExpression: { openKey: { $exists: true } } });
ReferralPayoutSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
ReferralPayoutSchema.index({ referrerId: 1, createdAt: -1 });

export const ReferralPayout = mongoose.model<IReferralPayout>('ReferralPayout', ReferralPayoutSchema);
