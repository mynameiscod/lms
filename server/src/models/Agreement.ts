import mongoose, { Schema } from 'mongoose';

/**
 * Terms & agreements students must accept (admin page /agreements).
 *
 * The admin writes the points (and can attach a document, such as a signed-copy agreement), chooses
 * who it is for — every student, some batches, or named students — and whether a signature is needed.
 * Students see it as an "I agree to the …" checkbox when they submit their profile: the link opens
 * the points, and the box can only be ticked from there. A live agreement can also hold back the
 * LMS until it is accepted (blockLms), even for students whose profile is already complete.
 *
 * Changing the points of a live agreement can ask everyone to agree again: `version` goes up and
 * older acceptances no longer count.
 */

export type AgreementAudienceMode = 'all' | 'batches' | 'students';

export interface IAgreement {
  tenantId: mongoose.Types.ObjectId;
  title: string;
  kind: 'terms' | 'agreement';
  intro?: string;
  points: string[];
  document?: { url: string; name: string; size?: number };
  requireSignature: boolean;
  /** Hold the rest of the LMS until the student accepts (like the profile gate). */
  blockLms: boolean;
  audience: { mode: AgreementAudienceMode; batchIds: mongoose.Types.ObjectId[]; studentIds: mongoose.Types.ObjectId[] };
  status: 'draft' | 'live' | 'closed';
  version: number;
  publishedAt?: Date;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AgreementSchema = new Schema<IAgreement>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    kind: { type: String, enum: ['terms', 'agreement'], default: 'terms' },
    intro: { type: String, trim: true, maxlength: 4000 },
    points: [{ type: String, trim: true, maxlength: 4000 }],
    document: { url: String, name: String, size: Number },
    requireSignature: { type: Boolean, default: false },
    blockLms: { type: Boolean, default: false },
    audience: {
      mode: { type: String, enum: ['all', 'batches', 'students'], default: 'all' },
      batchIds: [{ type: Schema.Types.ObjectId, ref: 'Batch' }],
      studentIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    },
    status: { type: String, enum: ['draft', 'live', 'closed'], default: 'draft', index: true },
    version: { type: Number, default: 1 },
    publishedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
AgreementSchema.index({ tenantId: 1, status: 1 });

export const Agreement = mongoose.model<IAgreement>('Agreement', AgreementSchema);

/**
 * One student's acceptance of one version. It keeps a copy of what they agreed to, so later edits
 * never change the record of what was signed.
 */
export interface IAgreementAcceptance {
  tenantId: mongoose.Types.ObjectId;
  agreementId: mongoose.Types.ObjectId;
  version: number;
  userId: mongoose.Types.ObjectId;
  acceptedAt: Date;
  ip?: string;
  userAgent?: string;
  signedName?: string;
  /** PNG data URL drawn by the student, when a signature was required. */
  signature?: string;
  snapshot: { title: string; intro?: string; points: string[]; document?: { url: string; name: string } };
}

const AgreementAcceptanceSchema = new Schema<IAgreementAcceptance>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  agreementId: { type: Schema.Types.ObjectId, ref: 'Agreement', required: true },
  version: { type: Number, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  acceptedAt: { type: Date, default: Date.now },
  ip: String,
  userAgent: String,
  signedName: { type: String, trim: true },
  signature: String,
  snapshot: {
    title: String,
    intro: String,
    points: [String],
    document: { url: String, name: String },
  },
});
AgreementAcceptanceSchema.index({ agreementId: 1, userId: 1, version: 1 }, { unique: true });
AgreementAcceptanceSchema.index({ tenantId: 1, userId: 1 });

export const AgreementAcceptance = mongoose.model<IAgreementAcceptance>('AgreementAcceptance', AgreementAcceptanceSchema);
