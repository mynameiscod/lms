import mongoose, { Document, Schema } from 'mongoose';

/**
 * PassportConfig — one per tenant. The admin-controlled knobs for the Career
 * Passport product: master on/off, onboarding fields, free vs paid entitlements,
 * assessment engine mode, price, and membership length. Everything the admin can
 * "set up" for Passport lives here, so behaviour changes without code.
 */

export interface IOnboardingField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'number' | 'phone' | 'email';
  required: boolean;
  locked?: boolean;        // Name/Mobile/Email are locked-mandatory
  options?: string[];      // for 'select'
  order: number;
}

export interface IEntitlement {
  featureKey: string;      // e.g. 'daily_missions', 'mock_interview', 'career_passport'
  label: string;
  tier: 'free' | 'paid';
}

export interface IPassportConfig extends Document {
  tenantId: string;
  enabled: boolean;                    // master kill-switch (also gated by PASSPORT_ENABLED setting)
  assessmentMode: 'deterministic' | 'ai';
  onboardingFields: IOnboardingField[];
  entitlements: IEntitlement[];
  priceInr: number;
  membershipMonths: number;
  /**
   * Skill check-in policy (Module 13).
   *
   * Lives here rather than in a new collection because it is ordinary CareerPilot tenant
   * configuration, and this document already owns the rest of it. Every field is optional —
   * a tenant that has never opened the screen gets the shipped defaults.
   */
  reassessment?: {
    enabled: boolean;
    cooldownDays: number;
    questionBudget: number;
    studentRequestEnabled: boolean;
    materialChangeThreshold: number;
  };
  updatedAt: Date;
  createdAt: Date;
}

const OnboardingFieldSchema = new Schema<IOnboardingField>({
  key:      { type: String, required: true },
  label:    { type: String, required: true },
  type:     { type: String, enum: ['text', 'select', 'number', 'phone', 'email'], default: 'text' },
  required: { type: Boolean, default: false },
  locked:   { type: Boolean, default: false },
  options:  [{ type: String }],
  order:    { type: Number, default: 0 },
}, { _id: false });

const EntitlementSchema = new Schema<IEntitlement>({
  featureKey: { type: String, required: true },
  label:      { type: String, required: true },
  tier:       { type: String, enum: ['free', 'paid'], default: 'paid' },
}, { _id: false });

const PassportConfigSchema = new Schema<IPassportConfig>(
  {
    tenantId:         { type: String, required: true, unique: true, index: true },
    enabled:          { type: Boolean, default: false },
    assessmentMode:   { type: String, enum: ['deterministic', 'ai'], default: 'deterministic' },
    onboardingFields: [OnboardingFieldSchema],
    entitlements:     [EntitlementSchema],
    priceInr:         { type: Number, default: 499 },
    membershipMonths: { type: Number, default: 12 },
    // Skill check-in policy. Optional throughout — an existing tenant document without this
    // subtree resolves to the shipped defaults, so nothing has to be backfilled.
    reassessment: {
      enabled:                 { type: Boolean, default: true },
      cooldownDays:            { type: Number, default: 14 },
      questionBudget:          { type: Number, default: 18 },
      studentRequestEnabled:   { type: Boolean, default: true },
      materialChangeThreshold: { type: Number, default: 10 },
    },
  },
  { timestamps: true }
);

// Sensible defaults applied when a tenant first opens the Passport admin.
export const DEFAULT_ONBOARDING_FIELDS: IOnboardingField[] = [
  { key: 'name',   label: 'Full Name',   type: 'text',  required: true, locked: true, order: 1 },
  { key: 'mobile', label: 'Mobile',      type: 'phone', required: true, locked: true, order: 2 },
  { key: 'email',  label: 'Email',       type: 'email', required: true, locked: true, order: 3 },
  { key: 'degree', label: 'Degree',      type: 'select', required: false, order: 4, options: ['B.Tech', 'B.E.', 'BCA', 'B.Sc.', 'MCA', 'Diploma', 'Other'] },
  { key: 'yearOfStudy', label: 'Academic Year', type: 'select', required: false, order: 6, options: ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Graduated'] },
  // Degree alone cannot say CS or not — a B.Tech is CSE and Civil alike — so without
  // this the background axis resolves to 'any' for nearly everyone and any question or
  // mission tagged non_cs reaches nobody. Placed after Degree because that is the order
  // a student thinks in.
  { key: 'branch', label: 'Branch / Specialization', type: 'select', required: false, order: 5,
    options: ['Computer Science / IT', 'Electronics / ECE', 'Electrical / EEE', 'Mechanical', 'Civil',
              'Data Science / AI', 'Mathematics / Statistics', 'Commerce / Management', 'Other'] },
  // BROAD DIRECTION, not a role. The specific destination (Backend Engineer, QA/SDET, …)
  // is chosen after OTP from the tenant's configured CareerRoles; this only captures the
  // area a student thinks they are heading for.
  //
  // Offers only directions CareerPilot can actually deliver. "Data Analytics" and
  // "AI-Ready" shipped here from the start with no Data or AI roles, skills or blueprints
  // behind them — a student picking either was promised a path the product cannot serve.
  // Restore them, and add Cybersecurity, only once the matching CareerRoles, CareerSkills
  // and RoleSkillBlueprints exist. Existing members keep whatever they already chose:
  // these are the options offered to new signups, not a constraint on stored values.
  { key: 'careerGoal',  label: 'Career Goal',   type: 'select', required: false, order: 7, options: ['Software Development', 'Cloud & DevOps', 'Not Sure Yet'] },
];

export const DEFAULT_ENTITLEMENTS: IEntitlement[] = [
  { featureKey: 'assessment',      label: 'Career Readiness Assessment', tier: 'free' },
  { featureKey: 'career_score',    label: 'Career Score',                 tier: 'free' },
  { featureKey: 'roadmap_preview', label: '7-day Roadmap Preview',        tier: 'free' },
  { featureKey: 'roadmap_full',    label: 'Full 90-day Roadmap',          tier: 'paid' },
  { featureKey: 'daily_missions',  label: 'Daily Missions',               tier: 'paid' },
  { featureKey: 'practice',        label: 'Coding / SQL / MCQ Practice',  tier: 'paid' },
  { featureKey: 'mock_interview',  label: 'AI Mock Interviews',           tier: 'paid' },
  { featureKey: 'resume',          label: 'Resume Center',                tier: 'paid' },
  { featureKey: 'career_passport', label: 'CareerPilot Profile',      tier: 'paid' },
  { featureKey: 'tech_news',       label: 'Daily Tech News',             tier: 'paid' },
  { featureKey: 'company_questions', label: 'Company Interview Questions', tier: 'paid' },
];

export default mongoose.model<IPassportConfig>('PassportConfig', PassportConfigSchema);
