import mongoose, { Document, Schema } from 'mongoose';
import {
  SkillImportance, SkillTargetLevel, SKILL_IMPORTANCE, SKILL_TARGET_LEVELS,
  MIN_SKILL_WEIGHT, MAX_SKILL_WEIGHT,
} from './RoleSkillBlueprint';

/**
 * What one company expects of one role, in canonical skills.
 *
 * THE BRIDGE THAT DID NOT EXIST. Everything else about a company was already modelled —
 * who they are, what rounds they run, what they have asked, how their mock test is
 * assembled. None of it referenced a CareerSkill: `Company.roles` is free text,
 * `InterviewPattern.rounds[].tests` is prose written for a student to read, and
 * `CompanyQuestion.category` is a tenant taxonomy key. So there was no way to ask how a
 * student's measured skills compare with what a company needs, because the second half of
 * that comparison was not written down anywhere.
 *
 * NO COMPANY-SPECIFIC SKILLS, EVER. `skillKey` references the global CareerSkill
 * catalogue — the same JAVA_OOP a role blueprint and an assessment use. A TCS_JAVA or an
 * AMAZON_DSA would be a second vocabulary that no evidence could ever be scored against,
 * and Skill DNA would be measuring one thing while companies asked for another.
 *
 * THE SAME VOCABULARY AS A ROLE BLUEPRINT. importance, targetLevel and weight are Module
 * 4's types, not new ones, so PROFICIENT means the same score here as it does there and
 * one policy governs both comparisons. Company readiness differs from role readiness
 * because the WEIGHTS and TARGETS differ, not because the arithmetic does.
 *
 * VERSIONED, BECAUSE HIRING CHANGES. A mock test sat in March was sat against what we
 * believed in March. Publishing a new version supersedes the old one for new sittings and
 * leaves historical results pointing at the profile they were actually measured against —
 * silently rewriting them would make a student's improvement over time unreadable.
 *
 * PER COMPANY *AND* ROLE. Amazon's backend expectations are not Amazon's frontend
 * expectations. A caller that finds no profile for the student's role falls back to the
 * company's default profile if one exists, and otherwise says so rather than inventing a
 * comparison.
 */

export type CompanyProfileStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export const COMPANY_PROFILE_STATUSES: CompanyProfileStatus[] = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

/**
 * Where a factual claim in this profile came from.
 *
 * AI_ASSISTED is a first-class value and not a stain: a drafted profile an admin has read
 * and corrected is a perfectly good profile. What matters is that it is never silently
 * indistinguishable from something a company published.
 */
export type CompanySourceType =
  | 'OFFICIAL'
  | 'ADMIN_RESEARCH'
  | 'STUDENT_EXPERIENCE'
  | 'AI_ASSISTED'
  | 'OTHER';

export const COMPANY_SOURCE_TYPES: CompanySourceType[] = [
  'OFFICIAL', 'ADMIN_RESEARCH', 'STUDENT_EXPERIENCE', 'AI_ASSISTED', 'OTHER',
];

/**
 * The role key used when a company's expectations are not role-specific.
 *
 * A real key rather than an empty string, so the unique index treats it like any other
 * profile and the fallback is a lookup rather than a special case.
 */
export const DEFAULT_ROLE_KEY = 'DEFAULT';

export interface ICompanySkillRequirement {
  /** References CareerSkill.key. Validated against the live catalogue on write. */
  skillKey: string;
  importance: SkillImportance;
  targetLevel: SkillTargetLevel;
  weight: number;
}

/**
 * Which canonical skills a round of this company's process actually tests.
 *
 * Keyed by the round keys already in QuestionTaxonomy and InterviewPattern, so this
 * annotates the process an admin has already described rather than describing it again.
 */
export interface ICompanyRoundSkills {
  roundKey: string;
  skillKeys: string[];
}

export interface ICompanyProfileSource {
  type: CompanySourceType;
  /** A URL, a document name, or whatever the admin can point at later. */
  reference: string;
  note?: string;
  verifiedAt?: Date | null;
}

export interface ICompanyRoleProfile extends Document {
  tenantId: string;
  companySlug: string;
  /** CareerRole.key, or DEFAULT_ROLE_KEY for the company-wide fallback. */
  roleKey: string;
  version: number;
  status: CompanyProfileStatus;

  skillRequirements: ICompanySkillRequirement[];
  roundSkills: ICompanyRoundSkills[];

  /**
   * Which career stages this preparation is written for. Empty means every stage.
   *
   * A first-year and a final-year student targeting the same company need different
   * things said to them, and Module 1 already derives which of the two somebody is.
   */
  careerStages: string[];

  sources: ICompanyProfileSource[];
  /** Free-text guidance shown under the gap list. Not a roadmap — see §42. */
  preparationNotes: string;

  effectiveFrom?: Date | null;
  lastReviewedAt?: Date | null;
  publishedAt?: Date | null;
  publishedBy?: mongoose.Types.ObjectId | null;

  createdAt: Date;
  updatedAt: Date;
}

const RequirementSchema = new Schema<ICompanySkillRequirement>({
  skillKey:    { type: String, required: true, uppercase: true, trim: true },
  importance:  { type: String, enum: SKILL_IMPORTANCE, default: 'IMPORTANT' },
  targetLevel: { type: String, enum: SKILL_TARGET_LEVELS, default: 'WORKING' },
  weight:      { type: Number, min: MIN_SKILL_WEIGHT, max: MAX_SKILL_WEIGHT, default: 7 },
}, { _id: false });

const RoundSkillsSchema = new Schema<ICompanyRoundSkills>({
  roundKey:  { type: String, required: true, trim: true },
  skillKeys: [{ type: String, uppercase: true, trim: true }],
}, { _id: false });

const SourceSchema = new Schema<ICompanyProfileSource>({
  type:       { type: String, enum: COMPANY_SOURCE_TYPES, default: 'ADMIN_RESEARCH' },
  reference:  { type: String, default: '' },
  note:       { type: String, default: '' },
  verifiedAt: { type: Date, default: null },
}, { _id: false });

const CompanyRoleProfileSchema = new Schema<ICompanyRoleProfile>(
  {
    tenantId:    { type: String, required: true, index: true },
    companySlug: { type: String, required: true, trim: true },
    roleKey:     { type: String, required: true, uppercase: true, trim: true, default: DEFAULT_ROLE_KEY },
    version:     { type: Number, default: 1 },
    status:      { type: String, enum: COMPANY_PROFILE_STATUSES, default: 'DRAFT', index: true },

    skillRequirements: { type: [RequirementSchema], default: [] },
    roundSkills:       { type: [RoundSkillsSchema], default: [] },
    careerStages:      [{ type: String }],
    sources:           { type: [SourceSchema], default: [] },
    preparationNotes:  { type: String, default: '' },

    effectiveFrom:  { type: Date, default: null },
    lastReviewedAt: { type: Date, default: null },
    publishedAt:    { type: Date, default: null },
    publishedBy:    { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

/** One document per version of a company's expectations for a role. */
CompanyRoleProfileSchema.index(
  { tenantId: 1, companySlug: 1, roleKey: 1, version: 1 },
  { unique: true },
);

export const COMPANY_PROFILE_PUBLISHED_INDEX = 'tenantId_1_companySlug_1_roleKey_1_published_unique';

/**
 * At most ONE published profile per company and role.
 *
 * A partial unique index rather than a plain one, because every superseded version stays in
 * the collection and only the current one is live. It also settles a race: publishing v3
 * while somebody else publishes v4 cannot leave two live profiles, which would make company
 * readiness depend on which document the query happened to return first.
 */
CompanyRoleProfileSchema.index(
  { tenantId: 1, companySlug: 1, roleKey: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'PUBLISHED' },
    name: COMPANY_PROFILE_PUBLISHED_INDEX,
  },
);

/** The admin list: every profile for a company, newest first. */
CompanyRoleProfileSchema.index({ tenantId: 1, companySlug: 1, updatedAt: -1 });

export default mongoose.model<ICompanyRoleProfile>('CompanyRoleProfile', CompanyRoleProfileSchema);
