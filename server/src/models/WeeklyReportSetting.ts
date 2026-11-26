import mongoose, { Schema, Document } from 'mongoose';

/**
 * An institute's weekly-report delivery settings (2026-11-26). Off by default: with autoSend on,
 * every Monday morning (IST) each active batch student gets last week's report, once.
 *
 * lastAutoWeek is the claim for a week ('YYYY-MM-DD' of its Monday): the cron sets it with a
 * conditional update before sending, so a restart or a second server never sends a week twice.
 */
export interface IWeeklyReportSetting extends Document {
  tenantId: string;
  autoSend: boolean;
  channels: ('email' | 'whatsapp')[];
  lastAutoWeek?: string;
  lastAutoAt?: Date;
  lastAutoResult?: { sent: number; failed: number; skippedEmpty: number; skippedAlreadySent: number };
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WeeklyReportSettingSchema = new Schema<IWeeklyReportSetting>(
  {
    tenantId: { type: String, required: true, unique: true },
    autoSend: { type: Boolean, default: false },
    channels: { type: [String], enum: ['email', 'whatsapp'], default: ['email'] },
    lastAutoWeek: { type: String },
    lastAutoAt: { type: Date },
    lastAutoResult: { sent: Number, failed: Number, skippedEmpty: Number, skippedAlreadySent: Number },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export default mongoose.model<IWeeklyReportSetting>('WeeklyReportSetting', WeeklyReportSettingSchema);
