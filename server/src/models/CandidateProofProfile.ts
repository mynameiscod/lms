import mongoose, { Schema, Document } from 'mongoose';

/**
 * CandidateProofProfile — holds the shareable link for a student's "proof profile"
 * (the HR-facing page that aggregates their assessment / interview / communication /
 * project / resume / certificate evidence). One per (tenant, student).
 *
 * Only the token + publish state live here; the actual proof is aggregated LIVE at
 * read time by candidateProofService, so scores are always current.
 */
export interface ICandidateProofProfile extends Document {
  tenantId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  shareToken: string;
  published: boolean;
  sharedBy?: mongoose.Types.ObjectId;
  sharedAt?: Date;
  views: number;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<ICandidateProofProfile>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    shareToken: { type: String, unique: true, sparse: true },
    published: { type: Boolean, default: true },
    sharedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    sharedAt: { type: Date },
    views: { type: Number, default: 0 },
  },
  { timestamps: true },
);

schema.index({ tenantId: 1, studentId: 1 }, { unique: true });

export default mongoose.model<ICandidateProofProfile>('CandidateProofProfile', schema);
