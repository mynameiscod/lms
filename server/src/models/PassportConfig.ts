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
  /**
   * Whether daily missions follow authored Concept Learning Units.
   *
   * OFF by default, and off is not a degraded mode: with it off the mission engine behaves
   * exactly as it did before the layer existed. It exists so the sequencing can be switched
   * on per tenant once their journeys are published, and switched off again without a deploy
   * if something is wrong with the content rather than the code.
   */
  conceptLearningEnabled: boolean;
  assessmentMode: 'deterministic' | 'ai';
  onboardingFields: IOnboardingField[];
  entitlements: IEntitlement[];
  /**
   * Per-stage overrides for the shape of a personalized assessment.
   *
   * The shipped policies stay the default; an entry here changes ONE stage for THIS tenant.
   * Deliberately per stage rather than per student: two members at the same stage must sit
   * papers of the same shape or their scores stop being comparable, and comparability is
   * the whole reason Skill DNA means anything across a cohort.
   *
   * Anything omitted falls back to the shipped policy, so an admin can change the question
   * count without having to restate the difficulty mix.
   */
  assessmentPolicyOverrides?: IAssessmentPolicyOverride[];
  priceInr: number;
  /**
   * How long a member's ACCESS lasts, in months. What they bought.
   *
   * Distinct from the roadmap length below, and the two were being confused because only
   * one of them was visible: access is "how long can they log in", the roadmap is "how many
   * days of work is the plan". A member can perfectly well hold twelve months of access to a
   * ninety-day plan and renew it — that is the product.
   */
  membershipMonths: number;
  /**
   * How many days of work a plan covers.
   *
   * This replaces a hardcoded 90 in roadmapPolicy. Two roadmaps existed with two different
   * lengths — the skill plan fixed at 90 in code, the mission journey read from
   * PassportContent.journeyDays which a tenant had set to 365 — so the same member was
   * promised thirteen weeks on one screen and fifty-three on another. One number now.
   */
  roadmapDays: number;
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
    conceptLearningEnabled: { type: Boolean, default: false },
    assessmentMode:   { type: String, enum: ['deterministic', 'ai'], default: 'deterministic' },
    onboardingFields: [OnboardingFieldSchema],
    entitlements:     [EntitlementSchema],
    assessmentPolicyOverrides: {
      type: [new Schema<IAssessmentPolicyOverride>({
        stage:       { type: String, required: true },
        skillSlots:  { type: Number },
        maxSkills:   { type: Number },
        difficultyMix: {
          type: new Schema({ EASY: Number, MEDIUM: Number, HARD: Number }, { _id: false }),
          default: undefined,
        },
        timeLimitMinutes: { type: Number },
      }, { _id: false })],
      default: undefined,
    },
    priceInr:         { type: Number, default: 499 },
    membershipMonths: { type: Number, default: 12 },
    // 90 is the shipped default, and the horizon the planner was designed around: beyond it
    // the evidence a plan was built from is months stale and the personalisation is a claim
    // rather than a fact.
    roadmapDays: { type: Number, default: 90 },
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
/** One stage's admin overrides. Every field optional — absent means "use the default". */
export interface IAssessmentPolicyOverride {
  stage: string;                 // foundation | build | placement | job_seeker
  skillSlots?: number;           // how many questions
  maxSkills?: number;            // how many skills the paper spans
  difficultyMix?: { EASY: number; MEDIUM: number; HARD: number };  // percentages, summing to 100
  /** Minutes. 0 or absent = untimed, which is the shipped behaviour. */
  timeLimitMinutes?: number;
}

export const DEFAULT_ONBOARDING_FIELDS: IOnboardingField[] = [
  { key: 'name',   label: 'Full Name',   type: 'text',  required: true, locked: true, order: 1 },
  { key: 'mobile', label: 'Mobile',      type: 'phone', required: true, locked: true, order: 2 },
  { key: 'email',  label: 'Email',       type: 'email', required: true, locked: true, order: 3 },
  // Narrowed to what is actually being onboarded. The list is data, not code: more can
  // be added from Platform Settings without a release.
  { key: 'degree', label: 'Degree',      type: 'select', required: false, order: 4, options: ['B.Tech'] },
  { key: 'yearOfStudy', label: 'Academic Year', type: 'select', required: false, order: 6, options: ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Graduated'] },
  // Degree alone cannot say CS or not — a B.Tech is CSE and Civil alike — so without
  // this the background axis resolves to 'any' for nearly everyone and any question or
  // mission tagged non_cs reaches nobody. Placed after Degree because that is the order
  // a student thinks in.
  /**
    * Specific branches, not broad buckets.
    *
    * The old list paired unrelated things — 'Data Science / AI' was one option, so an AI
    * student and a Data Science student were indistinguishable and could not be given
    * different material. These are the branches colleges actually enrol under.
    *
    * ORDERED BY FAMILY (core CS, then AI, data, security, cloud, emerging) because that is
    * how a student scans for their own, not alphabetically.
    */
  { key: 'branch', label: 'Branch / Specialization', type: 'select', required: false, order: 5,
    options: [
      'CSE', 'IT / CSIT / CSBS',
      'AI', 'AI & ML', 'AI & Data Science', 'AI & Future Technologies',
      'Data Science', 'Data Analytics', 'Big Data Analytics',
      'Cyber Security', 'Information Security',
      'Cloud Computing', 'Distributed & Cloud Computing', 'IoT',
      'Blockchain', 'Software Engineering', 'Product Engineering with AI',
      // Non-CS branches are kept because colleges onboard whole campuses, not CS
      // departments. Dropping them would leave an ECE student with only "Other", which is
      // a value nothing can meaningfully target.
      'Electronics / ECE', 'Electrical / EEE', 'Mechanical', 'Civil',
      'Commerce / Management', 'Mathematics / Statistics',
      'Other',
    ] },
  // CAREER GOAL IS NOT ASKED AT SIGNUP ANY MORE.
  //
  // It was a broad direction ('Software Development', 'Cloud & DevOps', 'Not Sure Yet')
  // collected before the member had seen anything, and then immediately superseded: the
  // very next screen, /careerpilot/setup, asks them to choose a real CareerRole from the
  // tenant's published list, and it is that role — not this — which drives the skill
  // scope, the blueprint, the assessment paper and the roadmap. Asking twice made the
  // narrower, meaningful answer look like a repeat of a question already answered.
  //
  // The field is only removed from what NEW signups are asked. `passport.careerGoal`
  // stays on the model and every consumer still reads it, so members who answered it
  // keep their value and any pathway or blueprint rule written against a goal keeps
  // working. Those rules all treat an absent goal as "no constraint", so a member who
  // never had one is not excluded from anything — with one exception worth knowing:
  // a PathwayRule that DECLARES goals will not match a member without one
  // (pathwayMatchService.ruleHolds). Leave such rules' goal list empty, or re-add this
  // field through the admin onboarding-fields screen, if you need that targeting back.
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
