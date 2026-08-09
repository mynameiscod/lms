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
  /** `answer` holds the member's written response for missions that have no surface
   *  to complete them on — the reflective ones. Absent for the rest. */
  completed: { day: number; key: string; at: Date; answer?: string }[];
  /** Practice Lab attempts. `solvedProblems` makes the XP award idempotent per problem. */
  practice: { problemId: string; kind: string; passed: boolean; score: number; total: number; xp: number; at: Date }[];
  solvedProblems: string[];
  /** Every XP award, so the activity chart and daily goal are exact rather than inferred.
   *  Trimmed to the most recent 400 events — the dashboard only ever reads ~30 days. */
  xpLog: { at: Date; amount: number; source: string }[];
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
    completed: [{ day: Number, key: String, at: { type: Date, default: Date.now }, answer: String }],
    practice: [{
      problemId: String, kind: String, passed: Boolean,
      score: Number, total: Number, xp: Number,
      at: { type: Date, default: Date.now },
    }],
    solvedProblems: [{ type: String }],
    xpLog: [{ at: { type: Date, default: Date.now }, amount: Number, source: String }],
  },
  { timestamps: true }
);

PassportProgressSchema.index({ tenantId: 1, studentId: 1 }, { unique: true });

export default mongoose.model<IPassportProgress>('PassportProgress', PassportProgressSchema);
