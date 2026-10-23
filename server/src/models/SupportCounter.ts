import mongoose, { Schema } from 'mongoose';

/**
 * Sequence counters for Help & Support numbering. One document per series (e.g. "ticket:26"),
 * advanced with an atomic $inc so two tickets raised in the same instant never share a number.
 */
export interface ISupportCounter { _id: string; seq: number }

const SupportCounterSchema = new Schema<ISupportCounter>(
  { _id: { type: String, required: true }, seq: { type: Number, required: true, default: 0 } },
  { versionKey: false }
);

export default mongoose.model<ISupportCounter>('SupportCounter', SupportCounterSchema);
