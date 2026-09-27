import mongoose, { Schema, Document } from 'mongoose';

/**
 * Daily Practice Pass.
 *
 * Every working day a student must complete the tasks an admin has set (a Communication Lab
 * session, a coding problem, an assignment, a Thinking Lab challenge — any mix, any count).
 * A day with every task done is a "practice day". The share of practice days over a rolling
 * window is the student's practice attendance, and falling below the threshold puts them on
 * placement hold.
 *
 * Nothing new is tracked: the days are computed from records the labs already write. These
 * collections only hold the RULES, the computed DAYS and each student's STANDING.
 */

export const PRACTICE_TASKS = ['communication', 'coding_problem', 'assignment', 'thinking_lab'] as const;
export type PracticeTask = typeof PRACTICE_TASKS[number];
export type TaskCounts = Partial<Record<PracticeTask, number>>;

/* ── Rules: institute default, overridden per batch, overridden per student ─────────────── */

export interface IPracticePolicy extends Document {
  tenantId: string;
  scope: 'tenant' | 'batch' | 'student';
  /** batchId or userId; empty for the institute default. */
  targetId: string;
  targetName: string;
  /** Undefined = inherit from the level above. */
  requirements?: TaskCounts;
  thresholdPct?: number;
  windowDays?: number;
  enforce?: boolean;
  /** Student level only: excused from the rule entirely (medical, special case). */
  exempt?: boolean;
  /** Institute level: the day counting starts. Nobody is judged on days before it. */
  startDate?: string;
  /** Institute level: holds only start from this day — the grace period. */
  enforceFrom?: string;
  remindersEnabled?: boolean;
  note?: string;
  updatedBy?: string;
  updatedAt: Date;
}

const CountsSchema = new Schema({
  communication: Number, coding_problem: Number, assignment: Number, thinking_lab: Number,
}, { _id: false });

const PracticePolicySchema = new Schema<IPracticePolicy>({
  tenantId: { type: String, required: true },
  scope: { type: String, enum: ['tenant', 'batch', 'student'], required: true },
  targetId: { type: String, default: '' },
  targetName: { type: String, default: '' },
  requirements: { type: CountsSchema, default: undefined },
  thresholdPct: { type: Number, min: 0, max: 100 },
  windowDays: { type: Number, min: 7, max: 180 },
  enforce: Boolean,
  exempt: Boolean,
  startDate: String,
  enforceFrom: String,
  remindersEnabled: Boolean,
  note: { type: String, default: '' },
  updatedBy: String,
}, { timestamps: true });
PracticePolicySchema.index({ tenantId: 1, scope: 1, targetId: 1 }, { unique: true });

export const PracticePolicy = mongoose.model<IPracticePolicy>('PracticePolicy', PracticePolicySchema);

/* ── One student-day ──────────────────────────────────────────────────────────────────────── */

export interface IPracticeDay extends Document {
  tenantId: string;
  studentId: string;
  batchId: string;
  date: string; // YYYY-MM-DD (IST)
  done: TaskCounts;
  required: TaskCounts;
  met: boolean;
  /** Why the day does not count: not a working day, approved leave, before the start, or exempt. */
  excused?: 'weekly_off' | 'holiday' | 'leave' | 'before_start' | 'exempt';
  computedAt: Date;
}

const PracticeDaySchema = new Schema<IPracticeDay>({
  tenantId: { type: String, required: true },
  studentId: { type: String, required: true },
  batchId: { type: String, default: '' },
  date: { type: String, required: true },
  done: { type: CountsSchema, default: {} },
  required: { type: CountsSchema, default: {} },
  met: { type: Boolean, default: false },
  excused: String,
  computedAt: { type: Date, default: Date.now },
});
PracticeDaySchema.index({ studentId: 1, date: 1 }, { unique: true });
PracticeDaySchema.index({ tenantId: 1, date: 1, met: 1 });

export const PracticeDay = mongoose.model<IPracticeDay>('PracticeDay', PracticeDaySchema);

/* ── A student's current standing ─────────────────────────────────────────────────────────── */

export interface IPracticeStanding extends Document {
  tenantId: string;
  studentId: string;
  batchId: string;
  pct: number;
  metDays: number;
  countedDays: number;
  thresholdPct: number;
  streak: number;
  bestStreak: number;
  todayMet: boolean;
  missedYesterday: boolean;
  onHold: boolean;
  holdSince?: Date;
  exempt: boolean;
  enforced: boolean;
  updatedAt: Date;
}

const PracticeStandingSchema = new Schema<IPracticeStanding>({
  tenantId: { type: String, required: true },
  studentId: { type: String, required: true, unique: true },
  batchId: { type: String, default: '' },
  pct: { type: Number, default: 100 },
  metDays: { type: Number, default: 0 },
  countedDays: { type: Number, default: 0 },
  thresholdPct: { type: Number, default: 80 },
  streak: { type: Number, default: 0 },
  bestStreak: { type: Number, default: 0 },
  todayMet: { type: Boolean, default: false },
  missedYesterday: { type: Boolean, default: false },
  onHold: { type: Boolean, default: false },
  holdSince: Date,
  exempt: { type: Boolean, default: false },
  enforced: { type: Boolean, default: false },
}, { timestamps: true });
PracticeStandingSchema.index({ tenantId: 1, batchId: 1, onHold: 1 });

export const PracticeStanding = mongoose.model<IPracticeStanding>('PracticeStanding', PracticeStandingSchema);
