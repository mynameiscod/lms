import mongoose, { Schema, Document } from 'mongoose';
import { SKILL_IMPORTANCE, SKILL_TARGET_LEVELS, MIN_SKILL_WEIGHT, MAX_SKILL_WEIGHT } from './RoleSkillBlueprint';

/**
 * What a student is measured and taught against when they have no target role.
 *
 * WHY THIS EXISTS. Everything downstream — the assessment, Skill DNA, role readiness, the
 * roadmap — is built from a list of required skills, and the only place that list came from
 * was the Role Blueprint. A first-year who honestly answers "I'm not sure yet" therefore
 * had no list, so no assessment and no roadmap: the product refused the very cohort least
 * able to name a job title and most in need of being told where to start.
 *
 * The stage already knew this student was a beginner — it is derived from their degree and
 * year, and the foundation policy already restricted them to FOUNDATION-difficulty skills.
 * What it could not do was say WHICH skills. It filtered a list nobody supplied.
 *
 * SHAPED LIKE A BLUEPRINT ON PURPOSE. The requirements here carry the same fields as a role
 * requirement — importance, weight, target level — so the planner, the readiness calculator
 * and the paper builder take this as a source without knowing it is not a role. Anything
 * else would mean a second code path through the part of the product that decides what a
 * student does all day.
 *
 * A ROLE STILL WINS. This is the answer for a student who has not chosen, not an override
 * of one who has. Choosing a role later simply changes which list drives the plan; nothing
 * already measured is lost, because Skill DNA is keyed on skills rather than on the list
 * that asked for them.
 */

export interface IStageSkillRequirement {
  skillKey: string;
  importance: string;
  weight: number;
  targetLevel: string;
  active: boolean;
  displayOrder: number;
  note?: string;
}

export interface IStageSkillSet extends Document {
  tenantId: string;
  /** foundation | build | placement | job_seeker — the career stages already derived. */
  stage: string;
  label: string;
  /**
   * Off by default so no tenant silently gains a new source of plans on deploy. An admin
   * turns it on once the list says what they want it to say.
   */
  enabled: boolean;
  requirements: IStageSkillRequirement[];
  version: number;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StageRequirementSchema = new Schema<IStageSkillRequirement>({
  skillKey:    { type: String, required: true, uppercase: true, trim: true },
  importance:  { type: String, enum: SKILL_IMPORTANCE, default: 'IMPORTANT' },
  weight:      { type: Number, min: MIN_SKILL_WEIGHT, max: MAX_SKILL_WEIGHT, default: 7 },
  targetLevel: { type: String, enum: SKILL_TARGET_LEVELS, default: 'WORKING' },
  active:      { type: Boolean, default: true },
  displayOrder:{ type: Number, default: 100 },
  note:        { type: String, trim: true, maxlength: 240 },
}, { _id: false });

const StageSkillSetSchema = new Schema<IStageSkillSet>(
  {
    tenantId: { type: String, required: true, index: true },
    stage:    { type: String, required: true, lowercase: true, trim: true },
    label:    { type: String, default: '', trim: true },
    enabled:  { type: Boolean, default: false },
    requirements: { type: [StageRequirementSchema], default: [] },
    version:  { type: Number, default: 1 },
    updatedBy:{ type: String },
  },
  { timestamps: true },
);

/** One set per stage per tenant. A second would make "which list applies" unanswerable. */
StageSkillSetSchema.index({ tenantId: 1, stage: 1 }, { unique: true });

export default mongoose.model<IStageSkillSet>('StageSkillSet', StageSkillSetSchema);
