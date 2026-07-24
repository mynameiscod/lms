import mongoose, { Document, Schema } from 'mongoose';

/**
 * MissedAssessment — a durable record that a student did NOT complete a
 * scheduled assessment before its deadline (past dueAt + grace, under a policy
 * that closes). Written by the nightly sweep so gradebook / weekly reports /
 * streaks can count misses without recomputing from live data. Self-heals: the
 * sweep removes rows if the deadline is extended or a submission appears.
 */
export interface IMissedAssessment extends Document {
  tenantId: string;
  studentId: mongoose.Types.ObjectId;
  contentType: 'assignment' | 'quiz';
  contentId: mongoose.Types.ObjectId;
  contentTitle?: string;
  batchId: mongoose.Types.ObjectId;
  scheduleId: mongoose.Types.ObjectId;
  dueAt: Date;
  markedAt: Date;
}

const MissedAssessmentSchema = new Schema<IMissedAssessment>(
  {
    tenantId:     { type: String, required: true, index: true },
    studentId:    { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    contentType:  { type: String, enum: ['assignment', 'quiz'], required: true },
    contentId:    { type: Schema.Types.ObjectId, required: true },
    contentTitle: { type: String },
    batchId:      { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
    scheduleId:   { type: Schema.Types.ObjectId, ref: 'AssessmentSchedule', required: true },
    dueAt:        { type: Date, required: true },
    markedAt:     { type: Date, default: Date.now },
  },
  { timestamps: false }
);

MissedAssessmentSchema.index({ scheduleId: 1, studentId: 1 }, { unique: true });
MissedAssessmentSchema.index({ tenantId: 1, studentId: 1 });

export default mongoose.model<IMissedAssessment>('MissedAssessment', MissedAssessmentSchema);
