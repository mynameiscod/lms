import mongoose, { Schema, Document } from 'mongoose';

/**
 * Placement Program settings — one per tenant, edited on the admin Settings tab.
 *
 * The fee and the refund share are the admin's to set (decided 2026-10-03), and "payment before
 * booking" decides whether the interview calendar opens before or after the fee is paid. Every
 * candidate can still be waived individually.
 */
export interface IPlacementProgramConfig extends Document {
  tenantId: mongoose.Types.ObjectId;
  feeInr: number;
  refundablePct: number;
  paymentBeforeBooking: boolean;
  /** Length of one interview slot, and the gap kept free after it. */
  slotMinutes: number;
  bufferMinutes: number;
  /** How far ahead a candidate may book, and how much notice a slot needs. */
  bookingWindowDays: number;
  minNoticeHours: number;
  /** What interviewers rate, 1–5 each, on the scorecard after an attended interview. */
  scorecardCriteria: string[];
  /** The agreement candidates sign — written by the admin, with {{fields}}. Version goes up on every change. */
  agreement?: { title: string; body: string; version: number };
  updatedAt: Date;
}

const PlacementProgramConfigSchema = new Schema<IPlacementProgramConfig>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true },
  feeInr: { type: Number, default: 0, min: 0 },
  refundablePct: { type: Number, default: 50, min: 0, max: 100 },
  paymentBeforeBooking: { type: Boolean, default: true },
  slotMinutes: { type: Number, default: 30, min: 10, max: 180 },
  bufferMinutes: { type: Number, default: 10, min: 0, max: 120 },
  bookingWindowDays: { type: Number, default: 14, min: 1, max: 90 },
  minNoticeHours: { type: Number, default: 12, min: 0, max: 168 },
  scorecardCriteria: { type: [String], default: ['Communication', 'Technical skills', 'Problem solving', 'Attitude and confidence'] },
  agreement: { type: new Schema({ title: String, body: String, version: Number }, { _id: false }), default: undefined },
}, { timestamps: true });

export default mongoose.model<IPlacementProgramConfig>('PlacementProgramConfig', PlacementProgramConfigSchema);
