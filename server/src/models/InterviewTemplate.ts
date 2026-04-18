import mongoose, { Schema, Document } from 'mongoose';

// ─── Section Definition (embedded) ───────────────────────────────────────────

export interface ISectionDefinition {
  sectionOrder: number;
  sectionTitle: string;
  sectionType: 'communication' | 'hr' | 'technical';
  isMandatory: boolean;
  questionSource: 'question_bank' | 'manual' | 'random';
  questionOrder: 'fixed' | 'random';
  questionIds: mongoose.Types.ObjectId[];       // pre-selected questions
  randomQuestionCount?: number;                 // if random, how many to pick
  randomFilters?: {                             // filters for random selection
    topics?: string[];
    difficulty?: string[];
    tags?: string[];
  };
  sectionTimeLimit?: number;                    // minutes, 0 = unlimited
  perQuestionTimeLimit?: number;                // seconds, 0 = unlimited
  scoringPattern: 'equal' | 'weighted' | 'custom';
  maxScore: number;
  passingThreshold: number;                     // percentage 0-100
  canBeSkipped: boolean;
  answerMode: 'text' | 'audio' | 'video' | 'mcq' | 'code' | 'mixed';
  instructions?: string;
}

// ─── Main Template Interface ─────────────────────────────────────────────────

export interface IInterviewTemplate extends Document {
  tenantId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;

  // Basic Info
  title: string;
  description?: string;
  targetAudience?: string;
  interviewCategories: ('communication' | 'hr' | 'technical')[];

  // Mapping
  courseId?: mongoose.Types.ObjectId;
  batchId?: mongoose.Types.ObjectId;
  chapterId?: mongoose.Types.ObjectId;
  topicId?: mongoose.Types.ObjectId;

  // Configuration
  totalDuration: number;          // minutes
  difficultyLevel: 'easy' | 'medium' | 'hard' | 'mixed';
  experienceLevel: 'fresher' | 'junior' | 'mid' | 'senior' | 'custom';
  customExperienceRange?: string;
  interviewMode: 'practice' | 'assessment' | 'placement';

  // Sections
  sections: ISectionDefinition[];
  sectionNavigationMode: 'sequential' | 'free';

  // Scheduling
  scheduleType: 'immediate' | 'scheduled';
  scheduledStartDate?: Date;
  scheduledEndDate?: Date;
  expiryDate?: Date;

  // Attempt Rules
  maxAttempts: number;
  reattemptCooldownHours: number;
  allowResume: boolean;
  resumeWindowMinutes: number;
  autoSubmitOnExpiry: boolean;
  showResultImmediately: boolean;
  requireReviewBeforePublish: boolean;

  // Randomization
  randomizeSections: boolean;
  randomizeQuestionsWithinSections: boolean;

  // Assignment Scope
  assignmentScope: 'batch' | 'course' | 'specific_students' | 'role' | 'skill_level' | 'all';
  assignedStudentIds?: mongoose.Types.ObjectId[];
  assignedBatchIds?: mongoose.Types.ObjectId[];
  assignedCourseIds?: mongoose.Types.ObjectId[];
  assignedRoles?: string[];
  assignedSkillLevels?: string[];

  // Permissions / Proctoring
  blockMultipleTabs: boolean;
  requireMicrophone: boolean;
  microphoneFallback: 'block' | 'text_fallback';
  enableCodeEditor: boolean;

  // Lifecycle
  status: 'draft' | 'published' | 'scheduled' | 'active' | 'expired' | 'cancelled' | 'archived';
  publishedAt?: Date;
  archivedAt?: Date;
  version: number;

  createdAt: Date;
  updatedAt: Date;
}

// ─── Section Sub-Schema ──────────────────────────────────────────────────────

const SectionDefinitionSchema = new Schema<ISectionDefinition>({
  sectionOrder:        { type: Number, required: true },
  sectionTitle:        { type: String, required: true },
  sectionType:         { type: String, enum: ['communication', 'hr', 'technical'], required: true },
  isMandatory:         { type: Boolean, default: true },
  questionSource:      { type: String, enum: ['question_bank', 'manual', 'random'], default: 'question_bank' },
  questionOrder:       { type: String, enum: ['fixed', 'random'], default: 'fixed' },
  questionIds:         [{ type: Schema.Types.ObjectId, ref: 'InterviewQuestionBank' }],
  randomQuestionCount: { type: Number },
  randomFilters: {
    topics:     [String],
    difficulty: [String],
    tags:       [String],
  },
  sectionTimeLimit:     { type: Number, default: 0 },
  perQuestionTimeLimit: { type: Number, default: 0 },
  scoringPattern:       { type: String, enum: ['equal', 'weighted', 'custom'], default: 'equal' },
  maxScore:             { type: Number, default: 100 },
  passingThreshold:     { type: Number, default: 50 },
  canBeSkipped:         { type: Boolean, default: false },
  answerMode:           { type: String, enum: ['text', 'audio', 'video', 'mcq', 'code', 'mixed'], default: 'text' },
  instructions:         { type: String },
}, { _id: true });

// ─── Main Template Schema ────────────────────────────────────────────────────

const InterviewTemplateSchema = new Schema<IInterviewTemplate>(
  {
    tenantId:  { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    title:             { type: String, required: true, trim: true },
    description:       { type: String, trim: true },
    targetAudience:    { type: String },
    interviewCategories: [{
      type: String,
      enum: ['communication', 'hr', 'technical'],
    }],

    courseId:   { type: Schema.Types.ObjectId, ref: 'Course' },
    batchId:    { type: Schema.Types.ObjectId, ref: 'Batch' },
    chapterId:  { type: Schema.Types.ObjectId, ref: 'Chapter' },
    topicId:    { type: Schema.Types.ObjectId, ref: 'Topic' },

    totalDuration:        { type: Number, default: 60 },
    difficultyLevel:      { type: String, enum: ['easy', 'medium', 'hard', 'mixed'], default: 'medium' },
    experienceLevel:      { type: String, enum: ['fresher', 'junior', 'mid', 'senior', 'custom'], default: 'fresher' },
    customExperienceRange:{ type: String },
    interviewMode:        { type: String, enum: ['practice', 'assessment', 'placement'], default: 'practice' },

    sections:              [SectionDefinitionSchema],
    sectionNavigationMode: { type: String, enum: ['sequential', 'free'], default: 'sequential' },

    scheduleType:       { type: String, enum: ['immediate', 'scheduled'], default: 'immediate' },
    scheduledStartDate: { type: Date },
    scheduledEndDate:   { type: Date },
    expiryDate:         { type: Date },

    maxAttempts:                { type: Number, default: 1 },
    reattemptCooldownHours:    { type: Number, default: 0 },
    allowResume:               { type: Boolean, default: true },
    resumeWindowMinutes:       { type: Number, default: 30 },
    autoSubmitOnExpiry:        { type: Boolean, default: true },
    showResultImmediately:     { type: Boolean, default: false },
    requireReviewBeforePublish:{ type: Boolean, default: false },

    randomizeSections:                   { type: Boolean, default: false },
    randomizeQuestionsWithinSections:    { type: Boolean, default: false },

    assignmentScope:   { type: String, enum: ['batch', 'course', 'specific_students', 'role', 'skill_level', 'all'], default: 'all' },
    assignedStudentIds:[{ type: Schema.Types.ObjectId, ref: 'User' }],
    assignedBatchIds:  [{ type: Schema.Types.ObjectId, ref: 'Batch' }],
    assignedCourseIds: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
    assignedRoles:     [String],
    assignedSkillLevels: [String],

    blockMultipleTabs:  { type: Boolean, default: false },
    requireMicrophone:  { type: Boolean, default: false },
    microphoneFallback: { type: String, enum: ['block', 'text_fallback'], default: 'text_fallback' },
    enableCodeEditor:   { type: Boolean, default: false },

    status:      { type: String, enum: ['draft', 'published', 'scheduled', 'active', 'expired', 'cancelled', 'archived'], default: 'draft' },
    publishedAt: { type: Date },
    archivedAt:  { type: Date },
    version:     { type: Number, default: 1 },
  },
  { timestamps: true }
);

// Indexes
InterviewTemplateSchema.index({ tenantId: 1, status: 1 });
InterviewTemplateSchema.index({ tenantId: 1, createdBy: 1 });
InterviewTemplateSchema.index({ tenantId: 1, interviewCategories: 1 });
InterviewTemplateSchema.index({ tenantId: 1, assignmentScope: 1 });
InterviewTemplateSchema.index({ expiryDate: 1, status: 1 });

export default mongoose.model<IInterviewTemplate>('InterviewTemplate', InterviewTemplateSchema);
