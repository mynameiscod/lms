import mongoose, { Schema, Document } from 'mongoose';
import { PROBLEM_AUDIENCES, ProblemAudience } from './ThinkingProblem';

/**
 * One student's standing on one problem — across BOTH products.
 *
 * ONE RECORD, NOT TWO. A person who is an LMS student and a CareerPilot member is one
 * person: solving a two-pointer problem in the Practice Lab means they can solve it, and
 * being asked to solve it again in the Thinking Lab would be busywork dressed as progress.
 * The unique key is therefore (tenant, student, problem) with no surface in it. `surface`
 * records where they FIRST met the problem, for reporting only — it must never be part of
 * the key, or the same problem would count twice for the same person.
 *
 * This exists because DailyChallenge cannot answer the question. That model is keyed to a
 * date and a challenge window, which is right for "today's problem" and useless for "open
 * problem 47 whenever" — the browsable list this bank is growing into.
 *
 * XP IS AWARDED ON FIRST SOLVE ONLY, which is why `xpAwarded` lives here rather than being
 * derived. A browsable bank makes re-running a solved easy problem trivial, and XP feeding
 * the same ledger as missions would turn that into a farm.
 */

export interface IProblemAttempt extends Document {
  tenantId: string;
  studentId: mongoose.Types.ObjectId;
  /**
   * The PRACTICE id, not a Mongo id — `db:<objectid>` for an admin-authored problem,
   * `c-even-odd` for one of the built-ins that ship in code.
   *
   * A ref to ThinkingProblem would have been tidier and would have covered half the bank:
   * the eighteen built-ins have no database row to point at. One progress mechanism that
   * covers both beats two that each cover part, so this holds the id the rest of the
   * Practice Lab already uses.
   */
  problemId: string;
  /** Where this student first opened the problem. Reporting only — never part of the key. */
  surface: ProblemAudience;

  /** Their latest editor contents, so returning to a problem resumes rather than restarts. */
  code: string;
  language: string;

  /** Result of the most recent SUBMIT. A run against visible cases does not touch these. */
  testsPassed: number;
  testsTotal: number;

  /**
   * Submissions, not runs. This drives the solution-video unlock, so counting the Run button
   * would let anyone unlock it by pressing Run four times without writing a line.
   */
  attempts: number;
  hintsUsed: number;

  passed: boolean;
  solvedAt?: Date | null;
  /** Recorded so a second solve cannot pay twice. */
  xpAwarded: number;

  lastRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProblemAttemptSchema = new Schema<IProblemAttempt>(
  {
    tenantId:  { type: String, required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    problemId: { type: String, required: true },
    surface:   { type: String, enum: PROBLEM_AUDIENCES, default: 'lms' },

    code:     { type: String, default: '' },
    language: { type: String, default: '' },

    testsPassed: { type: Number, default: 0 },
    testsTotal:  { type: Number, default: 0 },

    attempts:  { type: Number, default: 0 },
    hintsUsed: { type: Number, default: 0 },

    passed:    { type: Boolean, default: false },
    solvedAt:  { type: Date, default: null },
    xpAwarded: { type: Number, default: 0 },

    lastRunAt: { type: Date },
  },
  { timestamps: true },
);

/**
 * One row per person per problem, enforced by the DATABASE.
 *
 * Two tabs open, or a double-tapped Submit, would otherwise create two rows and the second
 * would see `attempts: 0` — paying the first-solve XP twice for one solve. An upsert
 * against this index cannot.
 */
ProblemAttemptSchema.index({ tenantId: 1, studentId: 1, problemId: 1 }, { unique: true });
/** "How is this student doing" — the list view's own query. */
ProblemAttemptSchema.index({ tenantId: 1, studentId: 1, passed: 1 });
/** "How many people solved this" — recounting a cached figure when it drifts. */
ProblemAttemptSchema.index({ tenantId: 1, problemId: 1, passed: 1 });

export default mongoose.model<IProblemAttempt>('ProblemAttempt', ProblemAttemptSchema);
