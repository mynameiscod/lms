import mongoose, { Schema, Document } from 'mongoose';

// ─── Landing Page Block Types ────────────────────────────────────────────────
export type BlockType = 'hero' | 'about' | 'features' | 'testimonials' | 'stats' | 'faq' | 'custom_html';

export interface ILandingBlock {
  id: string;
  type: BlockType;
  order: number;
  config: Record<string, any>;
  // hero: { title, subtitle, bgImage, bgColor, ctaText }
  // about: { heading, text, image, imagePosition, buttonText, buttonUrl }
  // features: { heading, cards: [{icon, title, desc}] }
  // testimonials: { heading, stories: [{name, photo, company, quote}] }
  // stats: { items: [{label, value}] }
  // faq: { heading, items: [{question, answer}] }
  // custom_html: { html }
}

export interface ILandingPage {
  blocks: ILandingBlock[];
  backToHomeUrl?: string;
  primaryColor?: string;
  fontFamily?: string;
}

// ─── Registration Form ───────────────────────────────────────────────────────
export type FieldType = 'text' | 'email' | 'phone' | 'number' | 'select' | 'radio' | 'checkbox' | 'date' | 'textarea' | 'upload';
export type EligibilityOperator = 'eq' | 'neq' | 'contains' | 'lt' | 'lte' | 'gt' | 'gte';

export interface IEligibilityRule {
  id?: string;
  operator: EligibilityOperator;
  value: string;
}

export interface IFormField {
  id: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required: boolean;
  options?: string[]; // for select/radio/checkbox
  eligibilityRules?: IEligibilityRule[]; // multiple rules, all checked
}

export interface IRegistrationForm {
  fields: IFormField[];
  submitButtonText?: string;
}

// ─── Result Settings ─────────────────────────────────────────────────────────
export interface ISocialConfig {
  hashtags?: string[];   // e.g. ['CodeBegun', 'LearningWithCode']
  instagramHandle?: string;
  twitterHandle?: string;
  linkedinCompanyUrl?: string;
  shareMessage?: string; // template with {{name}} {{score}} {{quizTitle}} placeholders
}

export interface IResultSettings {
  showScore: boolean;
  showAnswers: boolean;
  showCertificate: boolean;
  showThankYouMessage: boolean;
  thankYouMessage?: string;
  passingPercentage?: number; // certificate only if score >= this
  social?: ISocialConfig;
}

// ─── Main Document ────────────────────────────────────────────────────────────
export interface IPublicQuizConfig extends Document {
  _id: string;
  tenantId: string;
  quizId: mongoose.Types.ObjectId;
  slug: string; // unique URL key e.g. "java-placement-test-2026"
  title: string; // public-facing display title
  isActive: boolean;
  landingPage: ILandingPage;
  registrationForm: IRegistrationForm;
  resultSettings: IResultSettings;
  certificateTemplate?: string; // HTML with {{name}} {{score}} etc.
  totalSubmissions: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const LandingBlockSchema = new Schema<ILandingBlock>({
  id: { type: String, required: true },
  type: { type: String, enum: ['hero', 'about', 'features', 'testimonials', 'stats', 'faq', 'custom_html'], required: true },
  order: { type: Number, required: true },
  config: { type: Schema.Types.Mixed, default: {} }
}, { _id: false });

const FormFieldSchema = new Schema<IFormField>({
  id: { type: String, required: true },
  label: { type: String, required: true },
  type: { type: String, enum: ['text', 'email', 'phone', 'number', 'select', 'radio', 'checkbox', 'date', 'textarea', 'upload'], required: true },
  placeholder: String,
  required: { type: Boolean, default: false },
  options: [String],
  eligibilityRules: [{
    id: String,
    operator: { type: String, enum: ['eq', 'neq', 'contains', 'lt', 'lte', 'gt', 'gte'] },
    value: String
  }]
}, { _id: false });

const publicQuizConfigSchema = new Schema<IPublicQuizConfig>(
  {
    tenantId: { type: String, required: true, index: true },
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: String, required: true },
    isActive: { type: Boolean, default: true },

    landingPage: {
      blocks: [LandingBlockSchema],
      backToHomeUrl: String,
      primaryColor: { type: String, default: '#005897' },
      fontFamily: String
    },

    registrationForm: {
      fields: [FormFieldSchema],
      submitButtonText: { type: String, default: 'Start Quiz' }
    },

    resultSettings: {
      showScore: { type: Boolean, default: true },
      showAnswers: { type: Boolean, default: false },
      showCertificate: { type: Boolean, default: false },
      showThankYouMessage: { type: Boolean, default: true },
      thankYouMessage: String,
      passingPercentage: Number,
      social: {
        hashtags: [String],
        instagramHandle: String,
        twitterHandle: String,
        linkedinCompanyUrl: String,
        shareMessage: String
      }
    },

    certificateTemplate: String,
    totalSubmissions: { type: Number, default: 0 },
    createdBy: { type: String, required: true }
  },
  { timestamps: true }
);

publicQuizConfigSchema.index({ tenantId: 1, slug: 1 });

export default mongoose.model<IPublicQuizConfig>('PublicQuizConfig', publicQuizConfigSchema);
