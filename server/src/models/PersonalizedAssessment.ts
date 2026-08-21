import mongoose, { Schema, Document } from 'mongoose';
import { ASSESSMENT_PURPOSES, AssessmentPurpose } from '../data/reassessmentPolicy';

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

/** One skill's standing at a moment in time. Deliberately small — see the snapshot note. */
export interface ISkillSnapshotRow {
  skillKey: string;
  skillName: string;
  score: number | null;
  status: string;
  confidence: string | null;
  targetScore: number;
}

/**
 * What the student's picture looked like at a point in the reassessment.
 *
 * BEFORE is captured when the check-in STARTS, which is the only moment it is unambiguous:
 * once answers are graded, evidence has already moved Skill DNA and the old picture is gone.
 * AFTER is captured once grading and projection have settled.
 *
 * Both are frozen. A later check-in that moves SQL again must not rewrite what August's
 * check-in reported, or the progress history becomes a rolling restatement of today.
 */
export interface IAssessmentSnapshot {
  roleKey: string;
  readiness: number | null;
  coverage: number;
  skills: ISkillSnapshotRow[];
  blueprintVersion: number;
  capturedAt: Date;
}

export interface IPersonalizedAssessment extends Document {
  tenantId: string;
  studentId: mongoose.Types.ObjectId;

  /** 1 for a first sitting. Part of the seed, so a retake draws a different paper. */
  attemptNumber: number;
  status: PersonalizedAssessmentStatus;

  /**
   * What this sitting was for.
   *
   * Absent on every attempt written before Module 13, which is why the default is INITIAL:
   * those WERE initial assessments, and reading them that way needs no migration and no
   * backfill. A reassessment is not a different product — it is the same generator aimed at
   * fewer skills.
   */
  purpose: AssessmentPurpose;
  /** REASSESSMENT only: the skills this check-in deliberately focused on. */
  targetSkillKeys: string[];
  /** Why the student was eligible, recorded so a check-in can explain itself later. */
  triggerReasons: string[];

  /** REASSESSMENT only. Frozen at start and at completion respectively. */
  beforeSnapshot?: IAssessmentSnapshot;
  afterSnapshot?: IAssessmentSnapshot;

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

  /**
   * What the student actually answered, stored at submit.
   *
   * Added by Module 7 as the smallest change that makes recovery honest. Skill projection
   * can fail after grading succeeds, and replaying it needs the responses — without them a
   * rebuild would re-grade an empty paper and record that the student got everything
   * wrong, which is worse than not recovering at all.
   *
   * Absent on any assessment generated before this existed, and absent while one is still
   * in progress; both are handled as "cannot replay" rather than as zero marks.
   */
  answers?: { sourceType: string; sourceId: string; response?: any }[];

  generationReport: {
    requestedSlots: number;
    filled: number;
    exactMatches: number;
    difficultyFallbacks: number;
    repeatedFromPreviousAttempt: number;
  };

  /** Minutes allowed when the tenant configured a limit; 0/absent = untimed. */
  timeLimitMinutes?: number;
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

const SnapshotRowSchema = new Schema<ISkillSnapshotRow>({
  skillKey:    { type: String, required: true },
  skillName:   { type: String, default: '' },
  score:       { type: Number, default: null },
  status:      { type: String, default: 'NOT_ASSESSED' },
  confidence:  { type: String, default: null },
  targetScore: { type: Number, default: 0 },
}, { _id: false });

const SnapshotSchema = new Schema<IAssessmentSnapshot>({
  roleKey:          { type: String, required: true },
  readiness:        { type: Number, default: null },
  coverage:         { type: Number, default: 0 },
  skills:           { type: [SnapshotRowSchema], default: [] },
  blueprintVersion: { type: Number, default: 0 },
  capturedAt:       { type: Date, default: Date.now },
}, { _id: false });

const PersonalizedAssessmentSchema = new Schema<IPersonalizedAssessment>(
  {
    tenantId:  { type: String, required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    attemptNumber: { type: Number, required: true, default: 1 },
    status: { type: String, enum: ['IN_PROGRESS', 'SUBMITTED', 'ABANDONED'], default: 'IN_PROGRESS' },

    // Defaulted, never required: historical attempts have no value here and must keep
    // loading exactly as they always did.
    purpose:         { type: String, enum: ASSESSMENT_PURPOSES, default: 'INITIAL' },
    targetSkillKeys: { type: [String], default: [] },
    triggerReasons:  { type: [String], default: [] },

    beforeSnapshot: { type: SnapshotSchema, default: undefined },
    afterSnapshot:  { type: SnapshotSchema, default: undefined },

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

    answers: {
      type: [{
        sourceType: String,
        sourceId: String,
        response: Schema.Types.Mixed,
        _id: false,
      }],
      default: undefined,
    },

    generationReport: {
      requestedSlots: { type: Number, default: 0 },
      filled: { type: Number, default: 0 },
      exactMatches: { type: Number, default: 0 },
      difficultyFallbacks: { type: Number, default: 0 },
      repeatedFromPreviousAttempt: { type: Number, default: 0 },
    },

    timeLimitMinutes: { type: Number },
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
/** Cooldown and history both ask "the last completed sitting of this kind". */
PersonalizedAssessmentSchema.index({ tenantId: 1, studentId: 1, purpose: 1, submittedAt: -1 });

export default mongoose.model<IPersonalizedAssessment>('PersonalizedAssessment', PersonalizedAssessmentSchema);
