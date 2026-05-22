import mongoose, { Schema, Document } from 'mongoose';

export interface IWeekConfig extends Document {
  tenantId: string;
  weekLabel: string;
  quizId: string;         // which Quiz to assign to approved candidates
  topperCount: number;    // how many topper positions to track (1st, 2nd, 3rd…)
  eventTitle?: string;    // e.g. "Weekly Tech Battle 2026"
  eventDate?: Date;       // when the quiz battle goes live
  eventEndDate?: Date;    // when the quiz closes — no one can start after this
  eventTimeIST?: string;  // display string, e.g. "7:00 PM IST"
  techBattleUrl?: string; // URL on their website for the event
  createdAt: Date;
  updatedAt: Date;
}

const weekConfigSchema = new Schema<IWeekConfig>(
  {
    tenantId:      { type: String, required: true, index: true },
    weekLabel:     { type: String, required: true, trim: true },
    quizId:        { type: String, required: true },
    topperCount:   { type: Number, default: 3, min: 1, max: 50 },
    eventTitle:    { type: String, trim: true },
    eventDate:     { type: Date },
    eventEndDate:  { type: Date },
    eventTimeIST:  { type: String, trim: true },
    techBattleUrl: { type: String, trim: true },
  },
  { timestamps: true }
);

// One config per tenant per week
weekConfigSchema.index({ tenantId: 1, weekLabel: 1 }, { unique: true });

export default mongoose.model<IWeekConfig>('WeekConfig', weekConfigSchema);
