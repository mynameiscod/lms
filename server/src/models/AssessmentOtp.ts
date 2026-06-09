import mongoose, { Schema, Document } from 'mongoose';

/**
 * AssessmentOtp — short-lived phone-verification code for assessment registration.
 * Auto-expires via a TTL index on `expiresAt`. The code is stored hashed.
 */
export interface IAssessmentOtp extends Document {
  tenantId: string;
  token: string;       // the submission token it verifies
  phone: string;
  codeHash: string;
  attempts: number;
  lastSentAt: Date;
  expiresAt: Date;
  createdAt: Date;
}

const AssessmentOtpSchema = new Schema<IAssessmentOtp>(
  {
    tenantId: { type: String, required: true },
    token: { type: String, required: true, index: true },
    phone: { type: String, required: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    lastSentAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// TTL: Mongo removes the doc once expiresAt passes.
AssessmentOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IAssessmentOtp>('AssessmentOtp', AssessmentOtpSchema);
