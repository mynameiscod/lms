import mongoose, { Schema, Document } from 'mongoose';

/** Manual instructor review of a submission — optional score override (audited separately). */
export interface ICommunicationInstructorFeedback extends Document {
  tenantId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  attemptId: mongoose.Types.ObjectId;
  instructorId: mongoose.Types.ObjectId;
  feedback?: string;
  recommendedFocus?: string;
  scoreOverride?: number | null;
  overrideReason?: string;
  reattemptRequired: boolean;
  interviewReady: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const Schema_ = new Schema<ICommunicationInstructorFeedback>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    attemptId: { type: Schema.Types.ObjectId, ref: 'CommunicationAttempt', required: true, index: true },
    instructorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    feedback: { type: String, trim: true },
    recommendedFocus: { type: String, trim: true },
    scoreOverride: { type: Number, default: null },
    overrideReason: { type: String, trim: true },
    reattemptRequired: { type: Boolean, default: false },
    interviewReady: { type: Boolean, default: false },
  },
  { timestamps: true }
);
Schema_.index({ tenantId: 1, attemptId: 1 }, { unique: true });

export default mongoose.model<ICommunicationInstructorFeedback>('CommunicationInstructorFeedback', Schema_);
