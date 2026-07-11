import mongoose, { Schema, Document } from 'mongoose';

/**
 * Server-computed daily practice streak (never trusted from the client). One row per student.
 * Dates are YYYY-MM-DD strings in the student's timezone.
 */
export interface ICommunicationStreak extends Document {
  tenantId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  currentStreak: number;
  longestStreak: number;
  totalCompletedDays: number;
  totalMissedDays: number;
  lastCompletedDate?: string;      // YYYY-MM-DD
  completedDates: string[];        // distinct completed days (kept bounded)
  updatedAt: Date;
  createdAt: Date;
}

const CommunicationStreakSchema = new Schema<ICommunicationStreak>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    totalCompletedDays: { type: Number, default: 0 },
    totalMissedDays: { type: Number, default: 0 },
    lastCompletedDate: { type: String },
    completedDates: { type: [String], default: [] },
  },
  { timestamps: true }
);

CommunicationStreakSchema.index({ tenantId: 1, studentId: 1 }, { unique: true });

export default mongoose.model<ICommunicationStreak>('CommunicationStreak', CommunicationStreakSchema);
