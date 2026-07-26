import mongoose, { Document, Schema } from 'mongoose';

/**
 * PassportProgress — a Passport member's journey state: daily-mission completions,
 * streak, and XP. Missions themselves are generated deterministically per day from
 * the student's assessment result (passportMissionService), so we only persist what
 * they've DONE, not the generated plan. One doc per student.
 */
export interface IPassportProgress extends Document {
  tenantId: string;
  studentId: mongoose.Types.ObjectId;
  startDate: Date;                 // day 1 of the journey (membership activation)
  streak: number;
  longestStreak: number;
  lastCompletedDate?: string;      // 'YYYY-MM-DD' (tenant-local-ish, UTC date)
  xp: number;
  completed: { day: number; key: string; at: Date }[];
  createdAt: Date;
  updatedAt: Date;
}

const PassportProgressSchema = new Schema<IPassportProgress>(
  {
    tenantId:  { type: String, required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    startDate: { type: Date, default: Date.now },
    streak:    { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastCompletedDate: { type: String },
    xp:        { type: Number, default: 0 },
    completed: [{ day: Number, key: String, at: { type: Date, default: Date.now } }],
  },
  { timestamps: true }
);

PassportProgressSchema.index({ tenantId: 1, studentId: 1 }, { unique: true });

export default mongoose.model<IPassportProgress>('PassportProgress', PassportProgressSchema);
