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
  { key: 'careerGoal',  label: 'Career Goal',   type: 'select', required: false, order: 7, options: ['Software Development', 'Data Analytics', 'AI-Ready', 'Not sure yet'] },
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
];

export default mongoose.model<IPassportConfig>('PassportConfig', PassportConfigSchema);
