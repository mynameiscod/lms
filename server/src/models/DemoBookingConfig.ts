import mongoose, { Document, Schema } from 'mongoose';

/** An institute's Book-a-demo settings. Missing = the defaults below. */
export interface IDemoBookingConfig extends Document {
  tenantId: mongoose.Types.ObjectId;
  /** Move the lead to the institute's Demo stage when they book (only forward, never back from Seat reserved / Enrolled). */
  moveToDemoStage: boolean;
  defaultSeats: number;
  defaultCutoffMin: number;
  defaultDurationMin: number;
  /** Minutes in the live room that count as attended (room slots). */
  attendedMinutes: number;
  /** Heading and short line shown on the public booking page. */
  pageTitle: string;
  pageSubtitle: string;
  updatedBy?: mongoose.Types.ObjectId;
}

export const DEMO_CONFIG_DEFAULTS = {
  moveToDemoStage: true,
  defaultSeats: 30,
  defaultCutoffMin: 30,
  defaultDurationMin: 60,
  attendedMinutes: 10,
  pageTitle: 'Book a free live demo',
  pageSubtitle: 'Pick a time that suits you. The demo is online, free, and needs no installation.',
};

const DemoBookingConfigSchema = new Schema<IDemoBookingConfig>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true },
  moveToDemoStage: { type: Boolean, default: DEMO_CONFIG_DEFAULTS.moveToDemoStage },
  defaultSeats: { type: Number, default: DEMO_CONFIG_DEFAULTS.defaultSeats, min: 1, max: 1000 },
  defaultCutoffMin: { type: Number, default: DEMO_CONFIG_DEFAULTS.defaultCutoffMin, min: 0, max: 7 * 24 * 60 },
  defaultDurationMin: { type: Number, default: DEMO_CONFIG_DEFAULTS.defaultDurationMin, min: 10, max: 480 },
  attendedMinutes: { type: Number, default: DEMO_CONFIG_DEFAULTS.attendedMinutes, min: 1, max: 240 },
  pageTitle: { type: String, trim: true, maxlength: 120, default: DEMO_CONFIG_DEFAULTS.pageTitle },
  pageSubtitle: { type: String, trim: true, maxlength: 300, default: DEMO_CONFIG_DEFAULTS.pageSubtitle },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.model<IDemoBookingConfig>('DemoBookingConfig', DemoBookingConfigSchema);
