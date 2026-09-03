import mongoose, { Schema, Document } from 'mongoose';

/**
 * Which canonical skill a piece of assessment content measures.
 *
 * The evidence layer: Module 4 says a Backend Engineer needs JAVA_OOP, and this says which
 * questions actually tell us anything about JAVA_OOP. It answers "what does this item
 * measure?" and nothing about how anyone performed on it.
 *
 * WHY A SEPARATE COLLECTION rather than a field on each content model.
 *
 * The repository has four assessment content families and they agree on almost nothing:
 * AssessmentItem grades difficulty 1-5 across six item types; Question uses
 * easy/medium/hard across four; ThinkingProblem has five bands of its own; and
 * CareerPilot's own questions are embedded subdocuments with no difficulty at all.
 * Adding a skills array to each would mean four different shapes, four editors, four
 * validators — and no way at all to ask the one question this module exists for: what
 * measures JAVA_OOP? That query has to reach every content type at once, so the
 * relationship needs to live in one place.
 *
 * It also keeps content ownership intact. Nothing here modifies a question; mapping one
 * cannot corrupt it, and removing a mapping cannot delete it.
 *
 * TENANT-SCOPED, because every one of those content models is. Evidence follows the
 * ownership of the thing it describes — one college cannot re-classify another's
 * questions. The SKILL it points at stays global, so JAVA_OOP means the same capability
 * everywhere; tenancy decides who may edit the mapping, not what the skill is.
 */

/** Content families this module can map. Adding one is a registry entry, not a migration. */
export type EvidenceSourceType =
  | 'assessment_item'      // AssessmentItem — the skill-assessment exam bank
  | 'passport_question'    // PassportAssessment.questions[] — CareerPilot's own bank
  | 'question'             // Question — the LMS quiz bank
  | 'thinking_problem';    // ThinkingProblem — reasoning practice

export const EVIDENCE_SOURCE_TYPES: EvidenceSourceType[] = [
  'assessment_item', 'passport_question', 'question', 'thinking_problem',
];

/**
 * How much this item tells us about this skill.
 *
 * Two values, not a scale. An item has one thing it is really testing and a few things it
 * incidentally exercises, and admins can tell those apart reliably. A 1-10 evidence
 * strength would be answered inconsistently by different people and read as precision
 * nobody actually has.
 *
 * Distinct from Module 4's role weight, which answers a different question entirely: that
 * is how much a ROLE needs a skill, this is how much an ITEM reveals about one.
 */
export type EvidenceContribution = 'PRIMARY' | 'SECONDARY';
export const EVIDENCE_CONTRIBUTIONS: EvidenceContribution[] = ['PRIMARY', 'SECONDARY'];

export interface ISkillEvidence extends Document {
  tenantId: string;
  sourceType: EvidenceSourceType;
  /** The content's own id. A subdocument id for passport_question. */
  sourceId: string;
  /** Set only for embedded content, so the parent document can be found again. */
  sourceParentId?: string;

  /** References CareerSkill.key — the stable global identity. */
  skillKey: string;
  contribution: EvidenceContribution;

  /**
   * Off = this mapping is retired but not forgotten. Historical evidence stays readable,
   * which is what lets a mapping be withdrawn without rewriting the past.
   */
  active: boolean;
  /**
   * Who this item is FOR. Empty means everyone — and that is the important half.
   *
   * Every mapping written before this existed has no audience, so it stays universal and
   * nothing that worked yesterday narrows today. An admin adds targeting on top: a question
   * tagged BACKEND_ENGINEER is offered only to backend students, one tagged "2nd Year" only
   * to second years, and one left untagged to all of them.
   *
   * Targeting lives HERE rather than on the Question because the question is a shared LMS
   * record with its own life, while this row is the CareerPilot-owned mapping the pool query
   * already reads — and because the same question can legitimately be aimed differently for
   * two different skills.
   *
   * A caution worth keeping in view: the pool is thin. Narrowing a bucket that holds two
   * items to one audience leaves one item, and every student in that audience then sees the
   * same question. Tag deliberately, not by default.
   */
  audienceRoles: string[];
  audienceYears: string[];
  audienceCourses: string[];
  /**
   * Branch, alongside role, year and course.
   *
   * The fourth axis and the last to arrive: a question that only makes sense for CSE could
   * not be expressed, so the nearest available targeting also reached every ECE and
   * Mechanical student taking the same paper.
   *
   * Kept DELIBERATELY sparing in practice. Narrowing by branch removes a candidate from
   * everybody outside it, and this pool is already thin — targeting should be for questions
   * that genuinely only apply to one branch, not a habit.
   */
  audienceBranches: string[];

  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SkillEvidenceSchema = new Schema<ISkillEvidence>(
  {
    tenantId:      { type: String, required: true, index: true },
    sourceType:    { type: String, enum: EVIDENCE_SOURCE_TYPES, required: true },
    sourceId:      { type: String, required: true },
    sourceParentId:{ type: String },

    skillKey:      { type: String, required: true, uppercase: true, trim: true },
    contribution:  { type: String, enum: EVIDENCE_CONTRIBUTIONS, default: 'PRIMARY' },

    active:        { type: Boolean, default: true },
    // Uppercased and trimmed so a filter never misses on case or a stray space.
    audienceRoles:   [{ type: String, uppercase: true, trim: true }],
    audienceYears:   [{ type: String, trim: true }],
    audienceCourses: [{ type: String, uppercase: true, trim: true }],
    audienceBranches: [{ type: String, trim: true }],

    createdBy: { type: String },
    updatedBy: { type: String },
  },
  { timestamps: true },
);

// One row per item-and-skill. Two would let an item claim a skill as both its main subject
// and an incidental one, and nothing downstream could say which was meant.
SkillEvidenceSchema.index({ sourceType: 1, sourceId: 1, skillKey: 1 }, { unique: true });
// The question this module exists to answer: what measures this skill? Supports the
// `skillKey: { $in: [...] }` form a later generator needs for twenty skills at once.
SkillEvidenceSchema.index({ tenantId: 1, skillKey: 1, active: 1 });
// Reading one item's mappings, and listing a content type's coverage.
SkillEvidenceSchema.index({ tenantId: 1, sourceType: 1, sourceId: 1 });

export default mongoose.model<ISkillEvidence>('SkillEvidence', SkillEvidenceSchema);
