import mongoose, { Document, Schema } from 'mongoose';

/**
 * PassportInterview — one AI mock-interview session for a Passport member.
 *
 * Deliberately separate from the LMS InterviewAttempt/InterviewTemplate stack: a
 * Passport member has no batch, no template and no scheduled slot. The AI brain is
 * shared (interviewAIService.nextInterviewerTurn + evaluateTranscript); only the
 * session record is Passport-owned.
 */

export interface IPassportTurn {
  role: 'interviewer' | 'candidate';
  text: string;
  at: Date;
}

export interface IPassportInterviewEval {
  overallScore: number;                 // 0–100
  readinessLevel: string;
  summary: string;
  strengths: string[];
  improvements: string[];
  recommendedPracticeAreas: string[];
  areaScores: { title: string; percentage: number; feedback: string }[];
  questionFeedback?: { question: string; verdict: string; whatWorked: string; whatToFix: string; betterAnswer: string }[];
}

/**
 * A canonical skill this sitting was built to probe.
 *
 * Present only on role interviews, whose areas are chosen from the student's role
 * blueprint (Module 8). Legacy pathway interviews cover free-text topics like "Learning
 * mindset" that correspond to no canonical skill, and they carry none of these — which is
 * why they can never produce skill evidence. Recorded at START, so the mapping from a
 * graded area back to a skill cannot be invented after the fact.
 */
export interface IInterviewSkillTarget {
  skillKey: string;
  skillName: string;
}

export interface IPassportInterview extends Document {
  tenantId: string;
  studentId: mongoose.Types.ObjectId;
  role: string;                          // target role the interview is for
  areas: string[];                       // topic areas covered
  skillTargets: IInterviewSkillTarget[]; // canonical skills behind those areas, role mode only
  /** Whether evidence has already been written for this sitting. */
  evidenceProjectedAt?: Date | null;
  interviewerName: string;
  companySlug?: string;
  companyName?: string;
  maxQuestions: number;
  askedCount: number;
  /**
   * `finalizing` is the finalization CLAIM.
   *
   * Grading a transcript takes an AI call, so finish() cannot be one atomic write. Moving
   * out of `in_progress` in a single conditional update is what makes exactly one request
   * the owner: everybody else observes the claim instead of racing it. See finalizeToken.
   */
  status: 'in_progress' | 'finalizing' | 'completed' | 'abandoned';
  /**
   * Who owns the claim right now.
   *
   * The final write is conditioned on this value, so a process that stalled past the stale
   * window, had its claim taken over, and then woke up cannot overwrite the result the
   * newer owner already stored. Without it a zombie would win by arriving last.
   */
  finalizeToken?: string | null;
  /** When the current claim was taken. The only input to stale-claim recovery. */
  finalizingAt?: Date | null;
  /**
   * The one-live-interview lock, expressed as data so the DATABASE can enforce it.
   *
   * True for exactly the two live statuses — `in_progress` and `finalizing` — and false the
   * moment a sitting reaches a terminal one. It carries no information `status` does not
   * already have; it exists because a partial index filter has to be an equality expression,
   * and "live" is two values. See PASSPORT_INTERVIEW_LIVE_INDEX.
   *
   * INVARIANT: live === true  ⟺  status ∈ { in_progress, finalizing }. Every write that
   * moves `status` across that boundary must move this with it, or a member is locked out of
   * ever starting another interview.
   */
  live?: boolean;
  transcript: IPassportTurn[];
  evaluation?: IPassportInterviewEval | null;
  xpAwarded: number;
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TurnSchema = new Schema<IPassportTurn>({
  role: { type: String, enum: ['interviewer', 'candidate'], required: true },
  text: { type: String, default: '' },
  at:   { type: Date, default: Date.now },
}, { _id: false });

const EvalSchema = new Schema<IPassportInterviewEval>({
  overallScore:   { type: Number, default: 0 },
  readinessLevel: { type: String, default: 'needs_improvement' },
  summary:        { type: String, default: '' },
  strengths:      [{ type: String }],
  improvements:   [{ type: String }],
  recommendedPracticeAreas: [{ type: String }],
  areaScores: [{ title: String, percentage: Number, feedback: String }],
  // Per-question coaching. Area scores tell a member WHERE they are weak; this tells them
  // what to have said instead, which is the only part they can act on before the real
  // interview. Kept on the session so it is still there months later.
  questionFeedback: [{
    question: String, verdict: String, whatWorked: String, whatToFix: String, betterAnswer: String,
  }],
}, { _id: false });

const PassportInterviewSchema = new Schema<IPassportInterview>(
  {
    tenantId:  { type: String, required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role:            { type: String, default: 'Software Engineer' },
    areas:           [{ type: String }],
    skillTargets:    [new Schema<IInterviewSkillTarget>({
      skillKey:  { type: String, required: true },
      skillName: { type: String, default: '' },
    }, { _id: false })],
    evidenceProjectedAt: { type: Date, default: null },
    interviewerName: { type: String, default: 'Siva' },
    // Set when the mock was started from a company page, so follow-up turns and the
    // history list can both stay company-aware.
    companySlug: { type: String, index: true },
    companyName: { type: String },
    maxQuestions:    { type: Number, default: 6 },
    askedCount:      { type: Number, default: 0 },
    status:     { type: String, enum: ['in_progress', 'finalizing', 'completed', 'abandoned'], default: 'in_progress', index: true },
    finalizeToken: { type: String, default: null },
    finalizingAt:  { type: Date, default: null },
    // No default. A document that predates this field is simply not in the partial index,
    // which is exactly right: the lock protects sittings started under the new rule, and
    // the migration script backfills the ones that were already open.
    live: { type: Boolean },
    transcript: [TurnSchema],
    evaluation: { type: EvalSchema, default: null },
    xpAwarded:  { type: Number, default: 0 },
    startedAt:   { type: Date, default: Date.now },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

PassportInterviewSchema.index({ tenantId: 1, studentId: 1, createdAt: -1 });

/** The live-session lock. Named so a migration can address it rather than guess at it. */
export const PASSPORT_INTERVIEW_LIVE_INDEX = 'tenantId_1_studentId_1_live_unique';

/**
 * At most ONE live interview per member, enforced by MongoDB rather than by the handler.
 *
 * start() reads for a live session and resumes it — but a read followed by an insert is two
 * statements, and two simultaneous requests both read "none" before either writes. The
 * member ends up with two sittings where they meant to have one: two transcripts, and one of
 * them silently orphaned by whichever the next request happens to find.
 *
 * A partial unique index answers the question in the same operation that acts on it. Of any
 * number of concurrent inserts exactly one succeeds; the rest get E11000 and return the
 * winner's session, so the loser of the race sees a resumed interview and not an error.
 *
 * PARTIAL, on `live`, and not on `status` directly. Uniqueness must hold across BOTH live
 * statuses — a member must not open a second interview while the first is still being
 * graded — and a partial filter cannot express "one of these two values" on every MongoDB
 * version. `live` is that pair collapsed into the equality expression a partial index takes,
 * and it leaves completed and abandoned sittings unindexed, which is why a member can sit as
 * many interviews as they like over time.
 */
PassportInterviewSchema.index(
  { tenantId: 1, studentId: 1 },
  { unique: true, partialFilterExpression: { live: true }, name: PASSPORT_INTERVIEW_LIVE_INDEX },
);

export default mongoose.model<IPassportInterview>('PassportInterview', PassportInterviewSchema);
