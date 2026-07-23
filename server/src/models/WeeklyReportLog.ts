import mongoose, { Schema, Document } from 'mongoose';

// Audit record of a weekly report email that was sent to a student.
export interface IWeeklyReportLog extends Document {
  tenantId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  batchId?: mongoose.Types.ObjectId;
  weekStart: Date;        // Monday 00:00 of the reported week (canonical key)
  email: string;
  score: number;
  status: 'sent' | 'failed';
  sentBy?: mongoose.Types.ObjectId;
  sentAt: Date;
}

const WeeklyReportLogSchema: Schema = new Schema(
  {
    tenantId: { type: mongoose.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    studentId: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
    batchId: { type: mongoose.Types.ObjectId, ref: 'Batch' },
    weekStart: { type: Date, required: true },
    email: { type: String },
    score: { type: Number, default: 0 },
    status: { type: String, enum: ['sent', 'failed'], default: 'sent' },
    sentBy: { type: mongoose.Types.ObjectId, ref: 'User' },
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

WeeklyReportLogSchema.index({ tenantId: 1, weekStart: 1, studentId: 1 });

export default mongoose.model<IWeeklyReportLog>('WeeklyReportLog', WeeklyReportLogSchema);
