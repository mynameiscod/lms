import mongoose, { Schema, Document } from 'mongoose';

/**
 * What a career role expects a job-ready candidate to know.
 *
 * The join between Module 2 (CareerRole — what a student wants to become) and Module 3
 * (CareerSkill — what capabilities exist). Neither module knows about the other, and this
 * is the only thing that does.
 *
 * It answers "how important is Java OOP for a Backend Engineer?" and nothing about any
 * student. Whether a particular person HAS the skill is a later module's question; this
 * one is pure configuration.
 *
 * WHY ONE DOCUMENT PER ROLE rather than one per role-skill pair.
 * An admin edits a whole blueprint at once — a table of fifteen rows and one save — so a
 * single document is one atomic write instead of fifteen upserts and a set of deletes,
 * and there is no window where half a blueprint is stored. The blueprint-level status has
 * an obvious home rather than being copied onto every row, where the copies could
 * disagree. Summarising every role costs one query rather than one per role.
 *
 * The cost is that uniqueness within the array is enforced in code rather than by an
 * index. It is checked explicitly and rejected rather than silently de-duplicated,
 * because two entries for one skill means the caller believes something we do not.
 *
 * WHY NOT AN ARRAY ON CareerRole.
 * The same skill belongs to several roles with different importance — JAVA_OOP is
 * essential for a backend engineer and supporting for a DevOps one — so this is a
 * relationship with its own attributes, not a property of either side. Storing it on the
 * role would also mean Module 2's model changed shape every time this module learned
 * something new.
 *
 * TENANT-SCOPED, GLOBALLY MEANINGFUL. Blueprints belong to a tenant, because what a
 * college expects of a backend engineer is genuinely theirs to decide. The KEYS on both
 * sides are shared vocabulary, so BACKEND_ENGINEER and JAVA_OOP still mean the same thing
 * everywhere and two tenants' blueprints remain comparable.
 */

export type SkillImportance = 'ESSENTIAL' | 'IMPORTANT' | 'SUPPORTING' | 'OPTIONAL';
export type SkillTargetLevel = 'FOUNDATION' | 'WORKING' | 'PROFICIENT' | 'ADVANCED';

export const SKILL_IMPORTANCE: SkillImportance[] = ['ESSENTIAL', 'IMPORTANT', 'SUPPORTING', 'OPTIONAL'];
export const SKILL_TARGET_LEVELS: SkillTargetLevel[] = ['FOUNDATION', 'WORKING', 'PROFICIENT', 'ADVANCED'];

export const MIN_SKILL_WEIGHT = 1;
export const MAX_SKILL_WEIGHT = 10;

/** Suggested weight for each importance. A starting point, not a constraint. */
export const DEFAULT_WEIGHT: Record<SkillImportance, number> = {
  ESSENTIAL: 10, IMPORTANT: 7, SUPPORTING: 4, OPTIONAL: 2,
};

export interface IRoleSkillRequirement {
  /** References CareerSkill.key — the stable identity, never a name or an ObjectId. */
  skillKey: string;

  /**
   * How much the role needs it, in words. Kept alongside `weight` rather than derived
   * from it because they answer different questions: this one is what an admin reads and
   * reasons about, and it should not shift because somebody nudged a number.
   */
  importance: SkillImportance;

  /**
   * How much the role needs it, as a number a later readiness calculation can use.
   * Independent of `importance` within its range, so two essential skills can still be
   * ranked against each other. Weights across a blueprint deliberately do NOT sum to 100:
   * a later engine can normalise, and forcing it here would make every edit arithmetic.
   */
  weight: number;

  /** How strong a job-ready candidate should eventually be. Not any student's level. */
  targetLevel: SkillTargetLevel;

  /**
   * A requirement can be switched off without losing how it was configured, which is what
   * makes a seasonal or retired expectation recoverable.
   */
  active: boolean;

  displayOrder: number;
  /** Why this role needs it. Optional, and useful when somebody inherits the config. */
  note?: string;
}

export interface IRoleSkillBlueprint extends Document {
  tenantId: string;
  domainKey: string;
  /** References CareerRole.key. */
  roleKey: string;

  requirements: IRoleSkillRequirement[];

  /**
   * Draft blueprints are visible to admins and ignored by everything else. Nothing
   * consumes blueprints yet, so this exists to stop a half-configured role being picked
   * up the moment something does — the cheapest possible version of that guarantee, with
   * no workflow, no approvals and no immutable versions.
   */
  published: boolean;

  /**
   * Bumped on every save. Not a version history — a marker, so a later module that
   * records "this plan was built from blueprint v4" can do so without a migration.
   */
  version: number;

  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RequirementSchema = new Schema<IRoleSkillRequirement>({
  skillKey:    { type: String, required: true, uppercase: true, trim: true },
  importance:  { type: String, enum: SKILL_IMPORTANCE, default: 'IMPORTANT' },
  weight:      { type: Number, min: MIN_SKILL_WEIGHT, max: MAX_SKILL_WEIGHT, default: 7 },
  targetLevel: { type: String, enum: SKILL_TARGET_LEVELS, default: 'WORKING' },
  active:      { type: Boolean, default: true },
  displayOrder:{ type: Number, default: 100 },
  note:        { type: String, trim: true, maxlength: 240 },
}, { _id: false });

const RoleSkillBlueprintSchema = new Schema<IRoleSkillBlueprint>(
  {
    tenantId:  { type: String, required: true, index: true },
    domainKey: { type: String, required: true },
    roleKey:   { type: String, required: true, uppercase: true, trim: true },

    requirements: { type: [RequirementSchema], default: [] },

    published: { type: Boolean, default: false },
    version:   { type: Number, default: 1 },

    createdBy: { type: String },
    updatedBy: { type: String },
  },
  { timestamps: true },
);

// One blueprint per role per tenant. Two would make "the" blueprint ambiguous, and every
// reader would have to invent a tie-break.
RoleSkillBlueprintSchema.index({ tenantId: 1, roleKey: 1 }, { unique: true });
// "Which roles expect this skill?" — the question a later gap engine will ask, and the
// one an admin asks before retiring a skill.
RoleSkillBlueprintSchema.index({ tenantId: 1, 'requirements.skillKey': 1 });

export default mongoose.model<IRoleSkillBlueprint>('RoleSkillBlueprint', RoleSkillBlueprintSchema);
