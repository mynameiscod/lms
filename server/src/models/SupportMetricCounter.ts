import mongoose, { Schema, Document } from 'mongoose';

/**
 * Hourly totals for things worth counting but not worth a record each: sign-in failures (401),
 * permission refusals (403), slow requests, AI failures by cause, database errors. Counts only —
 * never who, never which account — so a spike in refused logins is visible without keeping a
 * list of the people refused.
 */
export interface ISupportMetricCounter extends Document { hour: Date; key: string; count: number }

const SupportMetricCounterSchema = new Schema<ISupportMetricCounter>(
  {
    hour:  { type: Date, required: true },
    key:   { type: String, required: true, maxlength: 60 },
    count: { type: Number, default: 0, min: 0 },
  },
  { versionKey: false }
);

SupportMetricCounterSchema.index({ hour: 1, key: 1 }, { unique: true });
SupportMetricCounterSchema.index({ key: 1, hour: -1 });

export default mongoose.model<ISupportMetricCounter>('SupportMetricCounter', SupportMetricCounterSchema);
