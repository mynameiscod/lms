import mongoose, { Schema, Document } from 'mongoose';

export interface IWeekConfig extends Document {
  tenantId: string;
  weekLabel: string;
  quizId: string;      // which Quiz to assign to approved candidates
  topperCount: number; // how many topper positions to track (1st, 2nd, 3rd…)
  createdAt: Date;
  updatedAt: Date;
}

const weekConfigSchema = new Schema<IWeekConfig>(
  {
    tenantId:    { type: String, required: true, index: true },
    weekLabel:   { type: String, required: true, trim: true },
    quizId:      { type: String, required: true },
    topperCount: { type: Number, default: 3, min: 1, max: 50 },
  },
  { timestamps: true }
);

// One config per tenant per week
weekConfigSchema.index({ tenantId: 1, weekLabel: 1 }, { unique: true });

export default mongoose.model<IWeekConfig>('WeekConfig', weekConfigSchema);
