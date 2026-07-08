import mongoose, { Schema, Document } from 'mongoose';

// Denormalised gamification state for the Logical Thinking Lab — one doc per student.
// Updated on every solve so leaderboards and badge checks are cheap.
export interface IEarnedBadge { key: string; earnedAt: Date; }

export interface IStudentGameStats extends Document {
  tenantId: string;
  studentId: mongoose.Types.ObjectId;
  studentName?: string;
  batchId?: mongoose.Types.ObjectId;
  xpTotal: number;
  coins: number;
  level: number;
  solvedTotal: number;
  perfectSolves: number;
  noHintSolves: number;
  interviewSolves: number;
  currentStreak: number;
  longestStreak: number;
  lastSolvedDate?: string;        // 'YYYY-MM-DD' (IST)
  byCategory: Record<string, number>;
  badges: IEarnedBadge[];
  createdAt: Date;
  updatedAt: Date;
}

const StudentGameStatsSchema = new Schema<IStudentGameStats>(
  {
    tenantId:   { type: String, required: true, index: true },
    studentId:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
    studentName:{ type: String },
    batchId:    { type: Schema.Types.ObjectId, ref: 'Batch' },
    xpTotal:    { type: Number, default: 0 },
    coins:      { type: Number, default: 0 },
    level:      { type: Number, default: 1 },
    solvedTotal:{ type: Number, default: 0 },
    perfectSolves: { type: Number, default: 0 },
    noHintSolves:  { type: Number, default: 0 },
    interviewSolves: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastSolvedDate:{ type: String },
    byCategory: { type: Schema.Types.Mixed, default: {} },
    badges:     { type: [{ key: String, earnedAt: Date, _id: false }], default: [] },
  },
  { timestamps: true }
);
StudentGameStatsSchema.index({ tenantId: 1, studentId: 1 }, { unique: true });
StudentGameStatsSchema.index({ tenantId: 1, xpTotal: -1 });
StudentGameStatsSchema.index({ tenantId: 1, batchId: 1, xpTotal: -1 });

export default mongoose.model<IStudentGameStats>('StudentGameStats', StudentGameStatsSchema);
