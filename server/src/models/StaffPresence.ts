import mongoose, { Schema, Document } from 'mongoose';

/**
 * How long a staff member was actually working in the app on one day (IST).
 * The browser sends a note once a minute while the person is really using the app (input in the last two
 * minutes, tab in front). Each distinct minute is stored once, so double notes cannot inflate the time.
 * Only active versus idle is recorded: no screens, no keystrokes.
 */
export interface IStaffPresence extends Document {
  tenantId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  day: string;
  slots: number[];
  activeSeconds: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
  /** Seconds spent with a given lead open, keyed by lead id. */
  leadSeconds: Record<string, number>;
  createdAt: Date;
}

const StaffPresenceSchema = new Schema<IStaffPresence>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  day: { type: String, required: true },
  slots: { type: [Number], default: [] },
  activeSeconds: { type: Number, default: 0 },
  firstSeenAt: { type: Date },
  lastSeenAt: { type: Date },
  leadSeconds: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: { createdAt: true, updatedAt: false }, minimize: false });

StaffPresenceSchema.index({ tenantId: 1, userId: 1, day: 1 }, { unique: true });
StaffPresenceSchema.index({ tenantId: 1, day: 1 });
// Kept for about 15 months.
StaffPresenceSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 450 });

export default mongoose.model<IStaffPresence>('StaffPresence', StaffPresenceSchema);
