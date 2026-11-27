import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * One student's sitting of a pool exam (an Assignment of type EXAM): the paper drawn for them,
 * their answers, the clock, and what the proctoring saw.
 *
 * ── THE PAPER IS FROZEN AT START ────────────────────────────────────────────────────────────
 * The draw happens once, when the student presses Start, and is stored here. A refresh, a second
 * device or an admin editing the pool afterwards cannot change which questions this student has.
 *
 * MCQs are frozen whole — wording, options AND the answer key — because their answers are option
 * indexes: an admin reordering options mid-exam would otherwise silently move every student's
 * answer. The key lives in `mcqKey`, which is never sent to the student. Coding problems keep only
 * the reference: they are marked by running the code against the problem's tests at grading time.
 *
 * ── TIME IS THE SERVER'S ───────────────────────────────────────────────────────────────────
 * `deadlineAt` is fixed at Start (duration, clamped to the exam window). Every save after it is
 * refused and the attempt is submitted, whatever the browser's clock says.
 */
export type ExamAttemptStatus = 'in_progress' | 'submitted' | 'graded';
export type ExamItemKind = 'mcq' | 'coding';
export type SubmitReason = 'student' | 'time_up' | 'tab_switch';

export interface IExamItem {
  /** Stable within the attempt: "<sectionKey>:<n>". Answers are addressed by it. */
  key: string;
  sectionKey: string;
  sectionTitle: string;
  kind: ExamItemKind;
  refId: Types.ObjectId;
  difficulty: 'easy' | 'medium' | 'hard';
  marks: number;
  /** MCQ snapshot shown to the student. */
  question?: string;
  options?: string[];
  multiple?: boolean;
  /** Correct option indexes. Server only. */
  mcqKey?: number[];
  /** Coding snapshot of the title, for lists; the statement is read live. */
  title?: string;
  answer?: { selected?: number[]; language?: string; code?: string };
  answeredAt?: Date;
  runs: number;
  lastRunAt?: Date;
  /** Filled by grading. */
  score?: number;
  result?: { passed?: number; total?: number; verdict?: string; correct?: boolean; /** Marked by the simulator: no real code runner was connected. */ simulated?: boolean };
}

export interface IPoolExamAttempt extends Document {
  tenant: Types.ObjectId;
  assignment: Types.ObjectId;
  student: Types.ObjectId;
  attemptNumber: number;
  status: ExamAttemptStatus;
  startedAt: Date;
  deadlineAt?: Date | null;
  submittedAt?: Date | null;
  submitReason?: SubmitReason;
  items: IExamItem[];
  violations: { type: 'tab_switch' | 'copy' | 'paste'; at: Date }[];
  tabSwitches: number;
  score?: number;
  maxScore: number;
  percentage?: number;
  gradedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ItemSchema = new Schema<IExamItem>({
  key: { type: String, required: true },
  sectionKey: { type: String, required: true },
  sectionTitle: { type: String, default: '' },
  kind: { type: String, enum: ['mcq', 'coding'], required: true },
  refId: { type: Schema.Types.ObjectId, required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  marks: { type: Number, default: 0 },
  question: String,
  options: { type: [String], default: undefined },
  multiple: Boolean,
  mcqKey: { type: [Number], default: undefined },
  title: String,
  answer: {
    selected: { type: [Number], default: undefined },
    language: String,
    code: String,
  },
  answeredAt: Date,
  runs: { type: Number, default: 0 },
  lastRunAt: Date,
  score: Number,
  result: { passed: Number, total: Number, verdict: String, correct: Boolean, simulated: Boolean },
}, { _id: false });

const PoolExamAttemptSchema = new Schema<IPoolExamAttempt>({
  tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  assignment: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true },
  student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  attemptNumber: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ['in_progress', 'submitted', 'graded'], default: 'in_progress' },
  startedAt: { type: Date, required: true },
  deadlineAt: { type: Date, default: null },
  submittedAt: { type: Date, default: null },
  submitReason: { type: String, enum: ['student', 'time_up', 'tab_switch'] },
  items: { type: [ItemSchema], default: [] },
  violations: {
    type: [new Schema({ type: { type: String, enum: ['tab_switch', 'copy', 'paste'] }, at: Date }, { _id: false })],
    default: [],
  },
  tabSwitches: { type: Number, default: 0 },
  score: Number,
  maxScore: { type: Number, default: 0 },
  percentage: Number,
  gradedAt: { type: Date, default: null },
}, { timestamps: true });

/** One row per attempt: two Start clicks racing cannot create two attempt 1s. */
PoolExamAttemptSchema.index({ assignment: 1, student: 1, attemptNumber: 1 }, { unique: true });
/** "Which questions has this student had before?" — the unseen-first draw asks it on every Start. */
PoolExamAttemptSchema.index({ tenant: 1, student: 1 });

export default mongoose.model<IPoolExamAttempt>('PoolExamAttempt', PoolExamAttemptSchema);
