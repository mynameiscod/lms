import mongoose, { Schema, Document } from 'mongoose';

/**
 * One observation of one student, on one skill, at one moment.
 *
 * APPEND-ONLY HISTORY. This is what happened, not what we currently believe — that lives
 * in StudentSkillProfile and is derived from these rows. Keeping them apart is what makes
 * "you improved from 48 to 67" a statement about recorded observations rather than a
 * number the product invented, and it means the aggregation formula can change later
 * without rewriting anybody's past.
 *
 * FROZEN PROVENANCE. The skill, difficulty and relationship are copied from the
 * assessment's own snapshot at the time it was generated, not read from the live mapping
 * afterwards. An admin re-mapping a question next month must not silently change what a
 * student's answer from today is taken to have demonstrated.
 *
 * IDEMPOTENT BY IDENTITY. A retried submission, a re-run worker or a rebuild must not
 * double-count. One row per (assessment, item, skill) — and the assessment is part of that
 * key, so a legitimate retake of the same question in a different sitting is correctly a
 * NEW observation rather than a duplicate.
 *
 * DIRECT EVIDENCE ONLY. Nothing here is inferred from the skill graph: answering a REST
 * question does not create HTTP evidence, and answering a Java OOP question does not
 * create evidence for its parent. One answer must not inflate several skills.
 */

export type EvidenceRelationship = 'PRIMARY' | 'SECONDARY';
/**
 * Where a piece of evidence came from.
 *
 * MOCK_INTERVIEW joins the personalised assessment as a SECOND admissible source, at its
 * own reliability — see SOURCE_WEIGHT. A spoken answer graded against a rubric is real
 * demonstrated evidence, and it is less controlled than a marked paper; the weighting is
 * what expresses that, rather than admitting it silently at full strength or refusing it.
 *
 * A resume is deliberately NOT here. A resume is a self-report — "I know Java" is a claim,
 * not a demonstration, and letting a keyword move a score would make Skill DNA a measure of
 * what students write about themselves.
 */
export type EvidenceSource =
  | 'PERSONALIZED_ASSESSMENT' | 'MOCK_INTERVIEW' | 'MODULE_ASSESSMENT'
  /** A paper a student asked for, on a topic they believe they already know. */
  | 'PLACEMENT_CHECK'
  | 'CODING_ASSIGNMENT' | 'PROJECT_EVALUATION';

/**
 * What an observation can demonstrate — a different question from how much it counts.
 *
 *   DIAGNOSTIC     a measurement of what the student already has: the Skill Check and a reassessment.
 *   UNDERSTANDING  a checkpoint question inside the coursework — the student recognised the right answer — or a
 *                  mock interview answer, where they explained it (see EVIDENCE_KIND_FOR_SOURCE for why).
 *   APPLIED        work the student produced and that was genuinely graded: a coding assignment run
 *                  against its tests on a real runner, or a project reviewed by an authorised grader.
 *
 * Recognising the right answer to a question about loops is real evidence, and it is not the same as
 * writing a loop that works. The kind is what lets the plan tell those apart; the weight is unchanged.
 */
export type EvidenceKind = 'DIAGNOSTIC' | 'UNDERSTANDING' | 'APPLIED';
export const EVIDENCE_KINDS: EvidenceKind[] = ['DIAGNOSTIC', 'UNDERSTANDING', 'APPLIED'];

export const EVIDENCE_RELATIONSHIPS: EvidenceRelationship[] = ['PRIMARY', 'SECONDARY'];
/**
 * The sources admitted into Skill DNA, and nothing else.
 *
 * A mock interview joined the personalised assessment once its questions could be mapped to
 * canonical skills and graded against a rubric — those two properties are the entry
 * requirement, not the format. Projects still have no canonical mapping, so admitting them
 * would mix incomparable observations into one number.
 *
 * A MODULE ASSESSMENT joined on the same terms: its items carry skillKeys and are graded
 * objectively. It is admitted at a lower weight than a marked paper for one specific reason —
 * it is unproctored and retakeable, so a student may attempt it until they pass, and evidence
 * that can be repeated until it is favourable is weaker evidence. See SOURCE_WEIGHT.
 */
export const EVIDENCE_SOURCES: EvidenceSource[] = [
  'PERSONALIZED_ASSESSMENT', 'MOCK_INTERVIEW', 'MODULE_ASSESSMENT', 'PLACEMENT_CHECK',
  /**
   * Graded practical work, admitted once it could be tied to canonical skills: a Foundation assignment
   * carries its unit's code, and the unit carries the skills it assesses. Only a trustworthy final grade
   * is admitted — see appliedEvidenceService.
   */
  'CODING_ASSIGNMENT', 'PROJECT_EVALUATION',
];

export interface IStudentSkillEvidence extends Document {
  tenantId: string;
  studentId: mongoose.Types.ObjectId;
  /** Canonical CareerSkill.key — Module 3's stable identity, never a display name. */
  skillKey: string;

  sourceType: EvidenceSource;
  /**
   * Written on every row recorded since kinds existed. Rows recorded before carry none, and their kind
   * is derived from sourceType (evidenceKindOf) — nothing is rewritten.
   */
  evidenceKind?: EvidenceKind;
  /**
   * The sitting this observation came from. Part of the idempotency key.
   *
   * WHICH COLLECTION IT POINTS AT DEPENDS ON sourceType: a PersonalizedAssessment for
   * PERSONALIZED_ASSESSMENT, a PassportInterview for MOCK_INTERVIEW, and for graded assignment work a
   * stable id derived from the submission and its attempt. The declared `ref` below covers the first
   * and only the first — so do not add a blind .populate() on this field, which would silently return
   * null for every other row.
   */
  assessmentId: mongoose.Types.ObjectId;
  attemptNumber: number;

  /** The question, by its own stable identity, so history survives its deletion. */
  itemSourceType: string;
  itemSourceId: string;

  relationship: EvidenceRelationship;
  /** As the assessment recorded it, not as the question reads today. */
  difficulty: string;

  earnedPoints: number;
  maxPoints: number;
  /** earned/max, clamped to 0..1. Stored so aggregation never re-derives it. */
  performance: number;

  /** What this observation counted for, under the policy in force when it was recorded. */
  evidenceWeight: number;
  policyVersion: string;

  /** Graded assignment work only: what was evaluated, and how. */
  submissionId?: mongoose.Types.ObjectId;
  assignmentId?: mongoose.Types.ObjectId;
  unitCode?: string;
  /** AUTO_GRADED by the runner against every test case, or REVIEWED by an authorised grader. */
  evaluation?: 'AUTO_GRADED' | 'REVIEWED';
  /**
   * The assignment's own pass line as a fraction (passingPoints / totalPoints) and whether this grade met it —
   * the line Submission.isPassing draws, without the late penalty. Only work that met it demonstrates the skill.
   */
  passStandard?: number;
  meetsPassStandard?: boolean;
  evaluatedBy?: mongoose.Types.ObjectId;

  observedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StudentSkillEvidenceSchema = new Schema<IStudentSkillEvidence>(
  {
    tenantId:  { type: String, required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    skillKey:  { type: String, required: true, uppercase: true, trim: true },

    sourceType:    { type: String, enum: EVIDENCE_SOURCES, default: 'PERSONALIZED_ASSESSMENT' },
    // No default: an absent kind is a row recorded before kinds, derived from sourceType.
    evidenceKind:  { type: String, enum: EVIDENCE_KINDS },
    // See the interface above: MOCK_INTERVIEW rows point at a PassportInterview instead.
    assessmentId:  { type: Schema.Types.ObjectId, ref: 'PersonalizedAssessment', required: true },
    attemptNumber: { type: Number, default: 1 },

    itemSourceType: { type: String, required: true },
    itemSourceId:   { type: String, required: true },

    relationship: { type: String, enum: EVIDENCE_RELATIONSHIPS, default: 'PRIMARY' },
    difficulty:   { type: String, default: 'MEDIUM' },

    earnedPoints: { type: Number, default: 0 },
    maxPoints:    { type: Number, default: 1 },
    performance:  { type: Number, default: 0, min: 0, max: 1 },

    evidenceWeight: { type: Number, default: 1 },
    policyVersion:  { type: String, default: 'SKILL_DNA_V1' },

    submissionId: { type: Schema.Types.ObjectId, ref: 'Submission' },
    assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment' },
    unitCode:     { type: String, uppercase: true, trim: true },
    evaluation:   { type: String, enum: ['AUTO_GRADED', 'REVIEWED'] },
    passStandard:      { type: Number, min: 0, max: 1 },
    meetsPassStandard: { type: Boolean },
    evaluatedBy:  { type: Schema.Types.ObjectId, ref: 'User' },

    observedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

/**
 * The idempotency key. A retry, a duplicate worker or a rebuild all resolve to the same
 * row rather than a second observation — while the SAME question answered again in a
 * DIFFERENT sitting is a genuinely new one, because assessmentId is part of the key.
 */
StudentSkillEvidenceSchema.index(
  { assessmentId: 1, itemSourceType: 1, itemSourceId: 1, skillKey: 1 },
  { unique: true },
);
/** Aggregating one student's skill, and reading their history. */
StudentSkillEvidenceSchema.index({ tenantId: 1, studentId: 1, skillKey: 1 });
StudentSkillEvidenceSchema.index({ tenantId: 1, studentId: 1, observedAt: -1 });

export default mongoose.model<IStudentSkillEvidence>('StudentSkillEvidence', StudentSkillEvidenceSchema);
