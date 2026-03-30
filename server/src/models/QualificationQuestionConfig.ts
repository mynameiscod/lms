import mongoose, { Schema, Document } from 'mongoose';

export type QuestionCategory = 'personal' | 'education' | 'career' | 'financial' | 'timeline' | 'technical';
export type AnswerType = 'text' | 'select' | 'multiselect' | 'number' | 'boolean' | 'date' | 'rating';

export interface IScoreImpact {
  answerValue: any;
  impact: number;
}

export interface IQualificationQuestion {
  id: string;
  question: string;
  category: QuestionCategory;
  answerType: AnswerType;
  options?: string[];
  order: number;
  showInStages?: mongoose.Types.ObjectId[];  // Only show in these stages
  required: boolean;
  enabled: boolean;
  
  // Auto-update lead field
  fieldToUpdate?: string;
  
  // Score impact for answers
  scoreImpact?: IScoreImpact[];
  
  // Help text
  helpText?: string;
  
  // Validation
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  
  // Skip logic
  skipKeywords?: string[];  // Words in answer that skip this question (for WhatsApp auto)
}

export interface IQualificationQuestionConfig extends Document {
  tenantId: mongoose.Types.ObjectId;
  
  questions: IQualificationQuestion[];
  
  // Settings
  settings?: {
    showProgressBar: boolean;
    allowSkip: boolean;
    randomizeOrder: boolean;
  };
  
  // WhatsApp auto-qualification settings
  whatsappSettings?: {
    enabled: boolean;
    welcomeMessage: string;
    completionMessage: string;
    noResponseTimeoutHours: number;
    maxQuestions?: number;  // Max questions to ask via WhatsApp
  };
  
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ScoreImpactSchema: Schema = new Schema(
  {
    answerValue: { type: Schema.Types.Mixed, required: true },
    impact: { type: Number, required: true }
  },
  { _id: false }
);

const QualificationQuestionSchema: Schema = new Schema(
  {
    id: { type: String, required: true },
    question: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['personal', 'education', 'career', 'financial', 'timeline', 'technical'],
      required: true
    },
    answerType: {
      type: String,
      enum: ['text', 'select', 'multiselect', 'number', 'boolean', 'date', 'rating'],
      default: 'text'
    },
    options: [{ type: String, trim: true }],
    order: { type: Number, default: 0 },
    showInStages: [{
      type: mongoose.Types.ObjectId,
      ref: 'LeadStage'
    }],
    required: { type: Boolean, default: false },
    enabled: { type: Boolean, default: true },
    fieldToUpdate: { type: String, trim: true },
    scoreImpact: [ScoreImpactSchema],
    helpText: { type: String, trim: true },
    validation: {
      min: { type: Number },
      max: { type: Number },
      pattern: { type: String, trim: true }
    },
    skipKeywords: [{ type: String, trim: true }]
  },
  { _id: false }
);

const QualificationQuestionConfigSchema: Schema = new Schema(
  {
    tenantId: {
      type: mongoose.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      unique: true
    },
    
    questions: [QualificationQuestionSchema],
    
    settings: {
      showProgressBar: { type: Boolean, default: true },
      allowSkip: { type: Boolean, default: true },
      randomizeOrder: { type: Boolean, default: false }
    },
    
    whatsappSettings: {
      enabled: { type: Boolean, default: true },
      welcomeMessage: { 
        type: String, 
        default: "Hi! Thanks for your interest in CodeBegun. I have a few quick questions to understand your needs better."
      },
      completionMessage: { 
        type: String, 
        default: "Thank you! Our team will reach out to you shortly with more details."
      },
      noResponseTimeoutHours: { type: Number, default: 24 },
      maxQuestions: { type: Number, default: 5 }
    },
    
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// Default qualification questions
export const DEFAULT_QUALIFICATION_QUESTIONS: IQualificationQuestion[] = [
  {
    id: 'employment_status',
    question: 'What is your current employment status?',
    category: 'career',
    answerType: 'select',
    options: ['Employed', 'Fresher', 'Freelancer', 'Student', 'Unemployed', 'On Notice Period'],
    order: 1,
    required: true,
    enabled: true,
    fieldToUpdate: 'employmentStatus',
    scoreImpact: [
      { answerValue: 'On Notice Period', impact: 20 },
      { answerValue: 'Employed', impact: 10 },
      { answerValue: 'Fresher', impact: 5 }
    ]
  },
  {
    id: 'graduation_year',
    question: 'What is your graduation year?',
    category: 'education',
    answerType: 'number',
    order: 2,
    required: true,
    enabled: true,
    fieldToUpdate: 'graduationYear',
    validation: { min: 1990, max: 2035 }
  },
  {
    id: 'training_mode',
    question: 'Are you looking for online or classroom training?',
    category: 'personal',
    answerType: 'select',
    options: ['Classroom Only', 'Online Only', 'Both OK'],
    order: 3,
    required: true,
    enabled: true,
    fieldToUpdate: 'preferenceMode',
    scoreImpact: [
      { answerValue: 'Classroom Only', impact: 15 },
      { answerValue: 'Both OK', impact: 10 }
    ]
  },
  {
    id: 'budget',
    question: 'What is your budget range for training?',
    category: 'financial',
    answerType: 'select',
    options: ['Below 25k', '25k-50k', '50k-75k', '75k+', 'Need EMI', 'Not sure yet'],
    order: 4,
    required: true,
    enabled: true,
    fieldToUpdate: 'budget',
    scoreImpact: [
      { answerValue: '75k+', impact: 20 },
      { answerValue: '50k-75k', impact: 15 },
      { answerValue: '25k-50k', impact: 10 },
      { answerValue: 'Need EMI', impact: 5 },
      { answerValue: 'Below 25k', impact: -5 }
    ]
  },
  {
    id: 'timeline',
    question: 'When are you planning to start the training?',
    category: 'timeline',
    answerType: 'select',
    options: ['Immediately', 'Within 1 month', '1-3 months', '3-6 months', 'Just exploring'],
    order: 5,
    required: true,
    enabled: true,
    fieldToUpdate: 'timeline',
    scoreImpact: [
      { answerValue: 'Immediately', impact: 25 },
      { answerValue: 'Within 1 month', impact: 15 },
      { answerValue: '1-3 months', impact: 5 },
      { answerValue: 'Just exploring', impact: -10 }
    ]
  },
  {
    id: 'has_laptop',
    question: 'Do you have a laptop for training?',
    category: 'technical',
    answerType: 'boolean',
    order: 6,
    required: false,
    enabled: true,
    helpText: 'A laptop is required for hands-on coding practice'
  },
  {
    id: 'primary_goal',
    question: 'What is your primary goal?',
    category: 'career',
    answerType: 'select',
    options: ['Job Switch', 'First Job', 'Skill Upgrade', 'Freelancing', 'Start a Business', 'Other'],
    order: 7,
    required: false,
    enabled: true,
    scoreImpact: [
      { answerValue: 'Job Switch', impact: 15 },
      { answerValue: 'First Job', impact: 15 }
    ]
  },
  {
    id: 'coding_experience',
    question: 'How would you rate your current coding experience?',
    category: 'technical',
    answerType: 'select',
    options: ['No Experience', 'Beginner', 'Intermediate', 'Advanced'],
    order: 8,
    required: false,
    enabled: true
  },
  {
    id: 'heard_from',
    question: 'How did you hear about CodeBegun?',
    category: 'personal',
    answerType: 'select',
    options: ['Google Search', 'YouTube', 'Facebook/Instagram', 'LinkedIn', 'Friend/Colleague', 'Previous Student', 'Other'],
    order: 9,
    required: false,
    enabled: true
  },
  {
    id: 'placement_interested',
    question: 'Are you interested in placement assistance?',
    category: 'career',
    answerType: 'boolean',
    order: 10,
    required: false,
    enabled: true,
    scoreImpact: [
      { answerValue: true, impact: 5 }
    ]
  }
];

export default mongoose.model<IQualificationQuestionConfig>('QualificationQuestionConfig', QualificationQuestionConfigSchema);
