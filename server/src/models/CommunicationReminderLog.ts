import mongoose, { Schema } from 'mongoose';

/** One row per student per day the coach reminder went out, so a restart or a second tick never repeats it. */
const CommunicationReminderLogSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: 60 * 86400 },
  },
  { versionKey: false },
);
CommunicationReminderLogSchema.index({ studentId: 1, date: 1 }, { unique: true });

export default mongoose.model('CommunicationReminderLog', CommunicationReminderLogSchema);
