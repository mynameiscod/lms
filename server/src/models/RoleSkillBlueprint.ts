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

/**
 * Year matching, in ONE place.
 *
 * Years are entered by admins as display strings — "2nd Year" — and read from a member's
 * onboarding answer, which is the same string. Compared case- and space-insensitively rather
 * than exactly, because "2nd year" and "2nd Year" are the same intent and an admin should not
 * have to know which one the form wrote.
 */
export const yearMatches = (a: string, b: string): boolean =>
  String(a || '').trim().toLowerCase().replace(/\s+/g, ' ') ===
  String(b || '').trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Does this requirement apply to a student in this year, and at what level?
 *
 * The one function every consumer must use, so readiness, the roadmap, coverage and the
 * question drafter cannot disagree about whether a first-year needs System Design. An unknown
 * or absent year is treated as "applies": refusing a requirement because a member skipped an
 * onboarding field would quietly shrink their blueprint and inflate their readiness.
 */
export function requirementForYear(
  req: { years?: string[]; targetLevel: SkillTargetLevel; yearTargets?: { year: string; targetLevel: SkillTargetLevel }[] },
  year?: string | null,
): { applies: boolean; targetLevel: SkillTargetLevel } {
  const years = req.years || [];
  const y = String(year || '').trim();
  const applies = !years.length || !y || years.some(v => yearMatches(v, y));
  const override = y ? (req.yearTargets || []).find(t => yearMatches(t.year, y)) : undefined;
  return { applies, targetLevel: override?.targetLevel || req.targetLevel };
}

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
   * WHICH YEARS THIS REQUIREMENT APPLIES TO. Empty means all of them.
   *
   * One blueprint per role was the whole model, so a first-year and a final-year who both
   * chose Software Engineer were measured against the identical 22 skills at identical
   * targets. A first-year was told they needed System Design and REST APIs, scored against
   * requirements they have no business meeting yet, and shown a readiness figure in the low
   * teens — which reads as "this product thinks I am hopeless" rather than "you are in your
   * first year".
   *
   * Stage could not fix it: stage shifts the learn/practice mix and, by design, "never
   * touches a score, a gap or a target".
   *
   * Empty is the default and means every year, so every blueprint written before this keeps
   * behaving exactly as it did. Narrowing is opt-in, one requirement at a time.
   */
  years: string[];

  /**
   * THE SAME SKILL, A DIFFERENT BAR PER YEAR.
   *
   * `years` decides whether a requirement applies at all; this decides how high it is set
   * when it does. OOP at FOUNDATION for a second year and PROFICIENT for a final year is one
   * requirement with two expectations, not two requirements — and modelling it as two would
   * mean the same skill appearing twice in a blueprint, which is exactly the duplication
   * that makes an editor drift.
   *
   * Falls back to `targetLevel` for any year not listed, so this is additive: a blueprint
   * with no overrides behaves as it always did.
   */
  yearTargets: { year: string; targetLevel: SkillTargetLevel }[];

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
  years:       [{ type: String, trim: true }],
  yearTargets: [{
    year:        { type: String, trim: true },
    targetLevel: { type: String, enum: SKILL_TARGET_LEVELS },
    _id: false,
  }],
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
