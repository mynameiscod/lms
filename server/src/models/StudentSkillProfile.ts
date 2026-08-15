import mongoose, { Schema, Document } from 'mongoose';

/**
 * What CareerPilot currently believes about one student's ability in one skill.
 *
 * DERIVED STATE, not a fact. Every value here is recomputed from StudentSkillEvidence and
 * can be thrown away and rebuilt to exactly the same numbers. That is the property that
 * makes the score defensible: it is not a running total somebody nudged over time, it is
 * a function of recorded observations, and the function is versioned so it can improve
 * without pretending old numbers were computed the new way.
 *
 * SCORE AND CONFIDENCE ARE DIFFERENT QUESTIONS. Score is how well they performed;
 * confidence is how much we have to go on. A student who answered one easy question
 * correctly scores 100 with LOW confidence, and reporting that honestly is far more useful
 * than deflating the score to look cautious — the uncertainty belongs in the confidence,
 * not smuggled into the number.
 *
 * ROLE- AND STAGE-INDEPENDENT. Keyed on student and skill only. A student who switches
 * from Backend Engineer to Data Engineer keeps every observation, because what they
 * demonstrated about SQL did not change when their ambition did. Comparing this against a
 * role's expectations is a later module's job and must not be baked in here.
 *
 * ABSENCE IS NOT ZERO. No row means not assessed, which is a different statement from a
 * score of 0. Nothing creates rows for unmeasured skills.
 */

export type SkillConfidence = 'LOW' | 'MEDIUM' | 'HIGH';
export const SKILL_CONFIDENCE: SkillConfidence[] = ['LOW', 'MEDIUM', 'HIGH'];

export interface IStudentSkillProfile extends Document {
  tenantId: string;
  studentId: mongoose.Types.ObjectId;
  skillKey: string;

  /** 0-100, from weighted performance. Rounded for storage; see the aggregation service. */
  score: number;
  confidence: SkillConfidence;

  /** How many observations exist. */
  evidenceCount: number;
  /**
   * Their total weight. Confidence reads this rather than the raw count, so ten glancing
   * secondary observations do not masquerade as ten direct ones.
   */
  effectiveEvidenceWeight: number;
  /** Distinct questions behind the score — repeats of one item are weaker evidence. */
  distinctItems: number;

  lastEvidenceAt: Date;
  /** Which formula produced this, so a later version can recompute knowingly. */
  aggregationVersion: string;

  createdAt: Date;
  updatedAt: Date;
}

const StudentSkillProfileSchema = new Schema<IStudentSkillProfile>(
  {
    tenantId:  { type: String, required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    skillKey:  { type: String, required: true, uppercase: true, trim: true },

    score:      { type: Number, default: 0, min: 0, max: 100 },
    confidence: { type: String, enum: SKILL_CONFIDENCE, default: 'LOW' },

    evidenceCount:           { type: Number, default: 0 },
    effectiveEvidenceWeight: { type: Number, default: 0 },
    distinctItems:           { type: Number, default: 0 },

    lastEvidenceAt:     { type: Date },
    aggregationVersion: { type: String, default: 'SKILL_DNA_V1' },
  },
  { timestamps: true },
);

// One belief per student per skill. Two would make "their score" ambiguous.
StudentSkillProfileSchema.index({ tenantId: 1, studentId: 1, skillKey: 1 }, { unique: true });
StudentSkillProfileSchema.index({ tenantId: 1, studentId: 1 });

export default mongoose.model<IStudentSkillProfile>('StudentSkillProfile', StudentSkillProfileSchema);
