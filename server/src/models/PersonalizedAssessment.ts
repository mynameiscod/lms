import mongoose, { Schema, Document } from 'mongoose';

/**
 * One student's generated assessment, frozen at the moment it was created.
 *
 * WHY A NEW MODEL. PassportAttempt is a RESULT record — it is written at submit and holds
 * answers and scores. There is no record of a paper in progress at all today: the existing
 * flow regenerates it on every request and relies on a deterministic seed to return the
 * same one. That works, and it cannot answer the questions this module has to answer —
 * whether a student already has an assessment open, what configuration produced it, and
 * why a particular question appeared. Those need a durable session, not a result.
 *
 * WHY FREEZE IT. An admin publishing a new role blueprint mid-morning must not change the
 * paper somebody is halfway through. The specification and the selected items are stored
 * as they were decided, so the assessment a student is sitting is the one they started.
 *
 * WHY KEEP THE GENERATION METADATA. "Why did Rahul get question 123?" is asked when
 * somebody suspects unfairness, and it is answerable here without rerunning anything: the
 * slot, its skill, its difficulty, the policy version and the blueprint version are all
 * recorded. The seed is stored for reproducibility and never leaves the server.
 */

export type PersonalizedAssessmentStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'ABANDONED';

export interface IGeneratedItem {
  sourceType: string;
  sourceId: string;
  /** The slot this filled — the answer to "why this question?". */
  skillKey: string;
  difficulty: string;
  /** Set when the exact band had no evidence and an adjacent one was served. */
  servedDifficulty?: string | null;
  reason: string;
  order: number;
  points: number;
}

export interface IPersonalizedAssessment extends Document {
  tenantId: string;
  studentId: mongoose.Types.ObjectId;

  /** 1 for a first sitting. Part of the seed, so a retake draws a different paper. */
  attemptNumber: number;
  status: PersonalizedAssessmentStatus;

  // ── the configuration that produced this paper ──
  policyKey: string;
  policyVersion: number;
  stage: string;
  roleKey: string;
  /** 0 for a discovery paper, where no blueprint was involved. */
  blueprintVersion: number;
  /** True when the student had not chosen a role and got the broad scope. */
  discovery: boolean;

  /** Internal. Never serialised to a client — see the controller. */
  generationSeed: string;

  specification: {
    slots: { skillKey: string; difficulty: string; reason: string }[];
    skillCoverage: Record<string, number>;
    difficultyCoverage: Record<string, number>;
    totalPoints: number;
  };

  items: IGeneratedItem[];

  generationReport: {
    requestedSlots: number;
    filled: number;
    exactMatches: number;
    difficultyFallbacks: number;
    repeatedFromPreviousAttempt: number;
  };

  startedAt: Date;
  submittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const GeneratedItemSchema = new Schema<IGeneratedItem>({
  sourceType: { type: String, required: true },
  sourceId:   { type: String, required: true },
  skillKey:   { type: String, required: true },
  difficulty: { type: String, required: true },
  servedDifficulty: { type: String, default: null },
  reason:     { type: String, default: 'role_blueprint' },
  order:      { type: Number, default: 0 },
  points:     { type: Number, default: 1 },
}, { _id: false });

const PersonalizedAssessmentSchema = new Schema<IPersonalizedAssessment>(
  {
    tenantId:  { type: String, required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    attemptNumber: { type: Number, required: true, default: 1 },
    status: { type: String, enum: ['IN_PROGRESS', 'SUBMITTED', 'ABANDONED'], default: 'IN_PROGRESS' },

    policyKey:        { type: String, required: true },
    policyVersion:    { type: Number, required: true },
    stage:            { type: String, required: true },
    roleKey:          { type: String, required: true },
    blueprintVersion: { type: Number, default: 0 },
    discovery:        { type: Boolean, default: false },

    generationSeed: { type: String, required: true },

    specification: {
      slots: [{ skillKey: String, difficulty: String, reason: String, _id: false }],
      skillCoverage: { type: Schema.Types.Mixed, default: {} },
      difficultyCoverage: { type: Schema.Types.Mixed, default: {} },
      totalPoints: { type: Number, default: 0 },
    },

    items: { type: [GeneratedItemSchema], default: [] },

    generationReport: {
      requestedSlots: { type: Number, default: 0 },
      filled: { type: Number, default: 0 },
      exactMatches: { type: Number, default: 0 },
      difficultyFallbacks: { type: Number, default: 0 },
      repeatedFromPreviousAttempt: { type: Number, default: 0 },
    },

    startedAt:   { type: Date, default: Date.now },
    submittedAt: { type: Date },
  },
  { timestamps: true },
);

/**
 * At most ONE open assessment per student.
 *
 * A partial index rather than a plain unique one, because a student may have any number of
 * submitted attempts and only ever one in progress. This is what makes a double-clicked
 * Start safe at the database level rather than only in the handler — two concurrent
 * requests race, one wins, and the loser returns the winner's paper.
 */
PersonalizedAssessmentSchema.index(
  { tenantId: 1, studentId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'IN_PROGRESS' } },
);
PersonalizedAssessmentSchema.index({ tenantId: 1, studentId: 1, attemptNumber: -1 });

export default mongoose.model<IPersonalizedAssessment>('PersonalizedAssessment', PersonalizedAssessmentSchema);
