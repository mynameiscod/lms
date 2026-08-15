import mongoose, { Schema, Document } from 'mongoose';

/**
 * The canonical skill universe CareerPilot reasons about.
 *
 * WHY THIS IS NOT Subject / Chapter / Topic / SubTopic.
 * Every level of that hierarchy carries a `courseId` — it organises the content of one
 * course. A skill has to exist whether or not any course teaches it: "Java OOP" is a
 * capability a student either has or lacks, and it stays the same capability when the
 * course is rewritten, retired or taught by somebody else. Anchoring it to a course would
 * mean a student's measured ability disappeared when the course did.
 *
 * WHY THIS IS NOT PASSPORT_CATEGORIES.
 * Those six — career clarity, aptitude, logical reasoning, technical, communication,
 * employability — are the scoring dimensions of one assessment, deliberately coarse
 * because the Career Score is a weighted average across them. "Technical Foundation" is
 * one number; this graph is where the detail behind such a number will eventually live.
 * Aptitude and logical reasoning are therefore NOT duplicated here as skills: they already
 * have an owner, and two owners for one word is how a system stops being trustworthy.
 *
 * WHY THIS IS NOT TechCategory.
 * That is fourteen flat tags for finding a reusable assignment. No hierarchy, no
 * prerequisites, no notion of what depends on what. Its values appear here as ALIASES, so
 * a later module can bridge the two without either owning the other.
 *
 * GLOBAL, NOT PER TENANT.
 * Deliberately no tenantId. If JAVA_OOP meant "OOP in Java" at one college and "Java
 * basics" at another, every future comparison — skill DNA, benchmarking, a role blueprint
 * shared between tenants — would be meaningless, and nothing would ever report the drift.
 * Assignment, Lesson, Content and Tenant are already global in this repository, so a
 * shared collection is not a new idea here. The cost is that an edit is platform-wide,
 * which is why mutations are restricted to SUPER_ADMIN while any CareerPilot admin may
 * read. Per-tenant visibility, if it is ever genuinely needed, belongs in its own small
 * overlay collection rather than by forking the catalogue.
 */

/** A GROUP organises; a SKILL is the thing that can be taught, measured and reported. */
export type SkillNodeType = 'GROUP' | 'SKILL';
export type SkillDifficulty = 'FOUNDATION' | 'INTERMEDIATE' | 'ADVANCED';

export const SKILL_NODE_TYPES: SkillNodeType[] = ['GROUP', 'SKILL'];
export const SKILL_DIFFICULTIES: SkillDifficulty[] = ['FOUNDATION', 'INTERMEDIATE', 'ADVANCED'];

export interface ICareerSkill extends Document {
  domainKey: string;
  /** Stable, machine-readable, immutable. Everything downstream references this. */
  key: string;

  name: string;
  shortName?: string;
  description: string;

  nodeType: SkillNodeType;
  /**
   * Taxonomy placement — where this sits when you browse the tree.
   *
   * Referenced BY KEY rather than ObjectId, as Modules 1 and 2 reference roles: the key is
   * the contract, it survives a rebuild of the collection, and it makes the seed data
   * readable as the tree it describes.
   */
  parentKey?: string | null;

  /**
   * Learning dependency — what must come first. A different question from `parentKey`,
   * and kept in a different field for that reason.
   *
   *   parentKey        Java OOP lives under Java          (taxonomy)
   *   prerequisiteKeys Java OOP needs Java Methods first  (order of learning)
   *
   * Collapsing them would make one of the two unanswerable: a prerequisite may sit in a
   * completely different branch — Java OOP depends on the language-agnostic OOP Concepts
   * under CS Fundamentals — and nothing in the tree could express that.
   */
  prerequisiteKeys: string[];

  difficulty: SkillDifficulty;
  aliases: string[];
  displayOrder: number;

  active: boolean;
  /** A future assessment module may measure this. Groups are usually false. */
  assessable: boolean;
  /** A future roadmap may set work against this. Groups are usually false. */
  learnable: boolean;
  /** Part of the shipped canonical taxonomy; protected from destructive deletion. */
  systemSkill: boolean;

  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** UPPER_SNAKE_CASE. Same rule as career role keys, for the same reason. */
export const SKILL_KEY_PATTERN = /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/;

const CareerSkillSchema = new Schema<ICareerSkill>(
  {
    domainKey: { type: String, required: true, index: true },
    key: {
      type: String, required: true, unique: true, uppercase: true, trim: true,
      validate: {
        validator: (v: string) => SKILL_KEY_PATTERN.test(v),
        message: 'A skill key must be uppercase words joined by underscores, e.g. JAVA_OOP.',
      },
    },

    name:        { type: String, required: true, trim: true, maxlength: 100 },
    shortName:   { type: String, trim: true, maxlength: 40 },
    description: { type: String, default: '', trim: true, maxlength: 600 },

    nodeType:  { type: String, enum: SKILL_NODE_TYPES, default: 'SKILL' },
    parentKey: { type: String, default: null, uppercase: true, trim: true },

    prerequisiteKeys: { type: [String], default: [] },

    difficulty:   { type: String, enum: SKILL_DIFFICULTIES, default: 'FOUNDATION' },
    aliases:      { type: [String], default: [] },
    displayOrder: { type: Number, default: 100 },

    active:      { type: Boolean, default: true },
    assessable:  { type: Boolean, default: true },
    learnable:   { type: Boolean, default: true },
    systemSkill: { type: Boolean, default: false },

    createdBy: { type: String },
    updatedBy: { type: String },
  },
  { timestamps: true },
);

// `key` is already unique via the field definition. These serve the two real queries:
// building a domain's tree, and listing what may be selected.
CareerSkillSchema.index({ domainKey: 1, active: 1, displayOrder: 1 });
CareerSkillSchema.index({ domainKey: 1, parentKey: 1, displayOrder: 1 });

export default mongoose.model<ICareerSkill>('CareerSkill', CareerSkillSchema);
