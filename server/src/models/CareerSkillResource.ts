import mongoose, { Schema, Document } from 'mongoose';

/**
 * Which real, executable activity teaches or exercises a canonical skill.
 *
 * WHY THIS IS NOT SkillEvidence (Module 5).
 * That maps assessment ITEMS to skills so answering one counts as EVIDENCE. This maps
 * activities to skills so a student can be sent to DO one. The two look similar and mean
 * opposite things: "answering this proves you can do X" versus "doing this helps you learn
 * X". Module 10 keeps them apart deliberately — collapsing them is how a roadmap task
 * quietly becomes proof of mastery, which §52 forbids outright.
 *
 * WHY THIS IS NOT A FIELD ON THE CONTENT ITSELF.
 * Adding `skillKeys` to Content, Assignment, Quiz and ThinkingProblem would put canonical
 * CareerPilot vocabulary inside four legacy LMS models that have nothing to do with
 * CareerPilot, and every one of them is read on hot paths shared with the rest of the
 * product. A join table costs one batched query and touches no legacy schema.
 *
 * WHY IT IS NEEDED AT ALL.
 * Module 9 established that no canonical skill → learning content mapping exists anywhere.
 * Without one, a roadmap objective can only ever be a sentence. The alternative considered
 * and rejected was matching on title text — "the skill is JAVA_OOP, find content containing
 * 'Java'" — which is exactly the brittle guessing §34 rules out.
 *
 * DELIBERATELY EMPTY UNTIL AN ADMIN FILLS IT.
 * Nothing is seeded and nothing is inferred. An unmapped objective is reported honestly as
 * a configuration gap rather than filled with a plausible-looking resource that turns out
 * to teach something else.
 */

/**
 * What can be pointed at.
 *
 * ONLY `practice` FOR NOW, and that is a deliberate limit rather than an oversight. Practice
 * Lab items have stable string ids, a real student route, and a catalogue that can be
 * validated against — so a mapping either resolves to something a student can actually open
 * or it is refused at write time. Other families will each need their own validation and a
 * reachable route before they can be added here; listing them early would let an admin
 * create mappings that dead-end.
 */
export type SkillResourceType = 'practice';
export const SKILL_RESOURCE_TYPES: SkillResourceType[] = ['practice'];

/** Which roadmap work a resource is suitable for. Mirrors Module 9's vocabulary exactly. */
export const RESOURCE_WORK_TYPES = ['LEARN', 'PRACTICE', 'ASSESS', 'REVIEW'] as const;
export type ResourceWorkType = typeof RESOURCE_WORK_TYPES[number];

export interface ICareerSkillResource extends Document {
  tenantId: string;
  /** Canonical CareerSkill.key. Validated against the graph on write. */
  skillKey: string;
  resourceType: SkillResourceType;
  /** The resource's own id, in its own namespace. Validated on write. */
  resourceId: string;
  /**
   * The kinds of roadmap work this can serve. A coding problem is PRACTICE; it is not a
   * LEARN resource, and offering it as one would send a student to be tested on something
   * nobody has taught them yet.
   */
  workTypes: ResourceWorkType[];
  /** Ordering when several resources fit the same slot. Lower is preferred. */
  priority: number;
  active: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CareerSkillResourceSchema = new Schema<ICareerSkillResource>(
  {
    tenantId:     { type: String, required: true, index: true },
    skillKey:     { type: String, required: true, uppercase: true, trim: true },
    resourceType: { type: String, enum: SKILL_RESOURCE_TYPES, required: true },
    resourceId:   { type: String, required: true, trim: true },
    workTypes:    { type: [String], default: ['PRACTICE'] },
    priority:     { type: Number, default: 100 },
    active:       { type: Boolean, default: true },
    createdBy:    { type: String },
  },
  { timestamps: true },
);

/**
 * One mapping per (skill, resource) per tenant. Mapping the same problem to the same skill
 * twice is a duplicate, not a stronger signal, and would make it twice as likely to be
 * drawn — a silent bias created by a double-clicked save.
 */
CareerSkillResourceSchema.index(
  { tenantId: 1, skillKey: 1, resourceType: 1, resourceId: 1 },
  { unique: true },
);

/** The one query the orchestrator makes: everything active for a batch of skills. */
CareerSkillResourceSchema.index({ tenantId: 1, skillKey: 1, active: 1, priority: 1 });

export default mongoose.model<ICareerSkillResource>('CareerSkillResource', CareerSkillResourceSchema);
