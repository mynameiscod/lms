import mongoose, { Schema, Document } from 'mongoose';

// An admin-scheduled problem for a batch on a specific date. When present, it overrides
// the adaptive daily pick so a whole batch gets the same challenge that day.
export interface IScheduledChallenge extends Document {
  tenantId: string;
  batchId: mongoose.Types.ObjectId;
  date: string;                // 'YYYY-MM-DD' (IST)
  problemId: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ScheduledChallengeSchema = new Schema<IScheduledChallenge>(
  {
    tenantId:  { type: String, required: true, index: true },
    batchId:   { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
    date:      { type: String, required: true },
    problemId: { type: Schema.Types.ObjectId, ref: 'ThinkingProblem', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
ScheduledChallengeSchema.index({ tenantId: 1, batchId: 1, date: 1 }, { unique: true });

export default mongoose.model<IScheduledChallenge>('ScheduledChallenge', ScheduledChallengeSchema);
