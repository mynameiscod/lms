import mongoose, { Schema, Document } from 'mongoose';
import { CareerPilotAttributionSchema, ICareerPilotAttribution } from './careerPilotAttribution';

/**
 * PlacementCandidate — one person in the Placement Program pipeline.
 *
 * ONE COLLECTION FOR EVERY SOURCE. Somebody who came from an Instagram ad and an LMS student an
 * admin pushed in go through exactly the same steps — interview fee, booking, interview, agreement,
 * security cheque, placement — so they are one record type. Two collections would mean every
 * screen and every operation built twice and reports that never quite agree.
 *
 * One record per (tenant, mobile). A second form submission from the same number updates the
 * record and its last-touch attribution rather than creating a duplicate.
 *
 * The fields for later phases (payment, interview, agreement, cheque) are declared now so the shape
 * is settled; Phase 1 only writes identity, profile, source and stage.
 */

export const PLACEMENT_STAGES = [
  'registered',          // submitted the form
  'payment_pending',     // asked to pay the interview fee
  'paid',                // fee paid (or waived)
  'interview_booked',
  'interview_attended',
  'interview_no_show',
  'selected',
  'rejected',
  'agreement_sent',
  'agreement_signed',
  'cheque_verified',     // security cheque received and verified
  'active',              // in the placement program
  'placed',
  'withdrawn',
] as const;
export type PlacementStage = typeof PLACEMENT_STAGES[number];

export const EXPERIENCE_LEVELS = ['fresher', '0-1', '1-3', '3+'] as const;

export interface IPlacementCandidate extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  /** Ten digits, normalised once on the way in, so +91/0 variants can never make a second record. */
  mobile: string;
  email?: string;
  /** Set when the candidate is (or becomes) an LMS user — e.g. pushed in from a batch. */
  userId?: mongoose.Types.ObjectId;

  college?: string;
  degree?: string;
  branch?: string;
  graduationYear?: number;
  experience?: typeof EXPERIENCE_LEVELS[number];
  skills?: string;
  targetRole?: string;
  city?: string;

  source: 'ad' | 'website' | 'lms_push' | 'manual';
  attribution?: ICareerPilotAttribution;
  submissions: number;

  stage: PlacementStage;
  stageChangedAt: Date;
  /** Staff member who owns this candidate. */
  ownerId?: mongoose.Types.ObjectId;
  /**
   * The secret in the candidate's own page link (/placement-program/me/<token>), where they pay
   * the fee and book their interview without an account. Unguessable; never listed anywhere.
   */
  portalToken?: string;

  // ── Later phases (shape settled now) ──
  /** Interview fee: charged, or waived by an admin for this candidate. */
  fee?: {
    waived?: boolean; amountInr?: number; refundablePct?: number;
    status?: 'created' | 'paid' | 'refunded';
    orderId?: string; paymentId?: string; paidAt?: Date;
    refund?: { amountInr: number; refundId?: string; at: Date; reason?: string; by?: string };
  };
  interview?: {
    interviewerId?: mongoose.Types.ObjectId; startsAt?: Date; endsAt?: Date; meetUrl?: string;
    outcome?: 'attended' | 'no_show'; score?: number; notes?: string;
    recommendation?: 'strong_yes' | 'yes' | 'maybe' | 'no';
  };
  /** The exact text sent (frozen at send time) and the signing evidence. */
  agreement?: {
    version?: string; title?: string; text?: string; sentAt?: Date;
    signedAt?: Date; signedName?: string; signedIp?: string; userAgent?: string; otpVerified?: boolean; textHash?: string;
  };
  /** Security cheque: held, returned at the end of the program, deposited only on breach. */
  cheque?: {
    /** File name inside the private cheque folder — never a public URL. */
    file?: string; mime?: string; number?: string; bank?: string; amountInr?: number; date?: Date;
    status?: 'received' | 'verified' | 'held' | 'returned' | 'deposited';
    uploadedAt?: Date; verifiedAt?: Date; depositReason?: string;
  };

  createdAt: Date;
  updatedAt: Date;
}

const PlacementCandidateSchema = new Schema<IPlacementCandidate>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name: { type: String, required: true, trim: true },
  mobile: { type: String, required: true, trim: true },
  email: { type: String, lowercase: true, trim: true, default: '' },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },

  college: { type: String, trim: true, default: '' },
  degree: { type: String, trim: true, default: '' },
  branch: { type: String, trim: true, default: '' },
  graduationYear: Number,
  experience: { type: String, enum: EXPERIENCE_LEVELS as unknown as string[] },
  skills: { type: String, trim: true, default: '' },
  targetRole: { type: String, trim: true, default: '' },
  city: { type: String, trim: true, default: '' },

  source: { type: String, enum: ['ad', 'website', 'lms_push', 'manual'], default: 'ad' },
  attribution: { type: CareerPilotAttributionSchema, default: undefined },
  submissions: { type: Number, default: 1 },

  stage: { type: String, enum: PLACEMENT_STAGES as unknown as string[], default: 'registered', index: true },
  stageChangedAt: { type: Date, default: Date.now },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User' },
  portalToken: { type: String, index: { unique: true, sparse: true } },

  fee: { type: Schema.Types.Mixed, default: undefined },
  interview: { type: Schema.Types.Mixed, default: undefined },
  agreement: { type: Schema.Types.Mixed, default: undefined },
  cheque: { type: Schema.Types.Mixed, default: undefined },
}, { timestamps: true });

PlacementCandidateSchema.index({ tenantId: 1, mobile: 1 }, { unique: true });
PlacementCandidateSchema.index({ tenantId: 1, createdAt: -1 });
PlacementCandidateSchema.index({ 'fee.orderId': 1 }, { sparse: true });

export default mongoose.model<IPlacementCandidate>('PlacementCandidate', PlacementCandidateSchema);
