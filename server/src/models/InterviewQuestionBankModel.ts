import mongoose, { Schema, Document } from 'mongoose';

// ─── Evaluation Rubric (embedded) ────────────────────────────────────────────

export interface IEvaluationRubric {
  criterionName: string;          // e.g., "Clarity", "Correctness"
  maxScore: number;
  description?: string;
}

export interface IFollowUpTrigger {
  triggerKeyword: string;
  followUpQuestionId?: mongoose.Types.ObjectId;
  followUpQuestionText?: string;
}

// ─── MCQ Option (embedded) ──────────────────────────────────────────────────

export interface IMCQOption {
  label: string;
  text: string;
  isCorrect: boolean;
}

// ─── Main Question Interface ────────────────────────────────────────────────

export interface IInterviewQuestionBank extends Document {
  tenantId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;

  // Classification
  interviewCategory: 'communication' | 'hr' | 'technical';
  questionType: 'behavioral' | 'situational' | 'technical' | 'coding' | 'opinion' | 'self_introduction' | 'topic_explanation' | 'scenario' | 'architecture' | 'debugging';
  topic: string;
  subTopic?: string;
  skill?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  roleTarget?: string;                  // "Frontend", "Backend", "Full Stack", etc.
  experienceLevel: 'fresher' | 'junior' | 'mid' | 'senior' | 'any';
  tags: string[];

  // Question Content
  questionText: string;
  questionHint?: string;
  contextDescription?: string;          // scenario description for situational Qs

  // Answer Modes
  answerMode: 'text' | 'audio' | 'video' | 'mcq' | 'code' | 'structured_explanation';
  mcqOptions?: IMCQOption[];
  codeLanguage?: string;                // for code-answer type
  codeStarterTemplate?: string;

  // Expected Answer Guidance
  expectedAnswerPoints: string[];
  sampleStrongAnswer?: string;
  weakAnswerIndicators: string[];
  evaluationRubric: IEvaluationRubric[];
  keywordsForMatching: string[];

  // Follow-up
  enableFollowUp: boolean;
  followUpTriggers: IFollowUpTrigger[];

  // Scoring
  maxScore: number;
  suggestedTimeSeconds: number;

  // Status
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

// ─── Sub-Schemas ─────────────────────────────────────────────────────────────

const EvaluationRubricSchema = new Schema<IEvaluationRubric>({
  criterionName: { type: String, required: true },
  maxScore:      { type: Number, required: true },
  description:   { type: String },
}, { _id: false });

const FollowUpTriggerSchema = new Schema<IFollowUpTrigger>({
  triggerKeyword:       { type: String, required: true },
  followUpQuestionId:   { type: Schema.Types.ObjectId, ref: 'InterviewQuestionBank' },
  followUpQuestionText: { type: String },
}, { _id: false });

const MCQOptionSchema = new Schema<IMCQOption>({
  label:     { type: String, required: true },
  text:      { type: String, required: true },
  isCorrect: { type: Boolean, default: false },
}, { _id: false });

// ─── Main Schema ─────────────────────────────────────────────────────────────

const InterviewQuestionBankSchema = new Schema<IInterviewQuestionBank>(
  {
    tenantId:  { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    interviewCategory: {
      type: String,
      enum: ['communication', 'hr', 'technical'],
      required: true,
    },
    questionType: {
      type: String,
      enum: ['behavioral', 'situational', 'technical', 'coding', 'opinion',
             'self_introduction', 'topic_explanation', 'scenario', 'architecture', 'debugging'],
      required: true,
    },
    topic:           { type: String, required: true, trim: true },
    subTopic:        { type: String, trim: true },
    skill:           { type: String },
    difficulty:      { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    roleTarget:      { type: String },
    experienceLevel: { type: String, enum: ['fresher', 'junior', 'mid', 'senior', 'any'], default: 'any' },
    tags:            [{ type: String }],

    questionText:       { type: String, required: true },
    questionHint:       { type: String },
    contextDescription: { type: String },

    answerMode: {
      type: String,
      enum: ['text', 'audio', 'video', 'mcq', 'code', 'structured_explanation'],
      default: 'text',
    },
    mcqOptions:          [MCQOptionSchema],
    codeLanguage:        { type: String },
    codeStarterTemplate: { type: String },

    expectedAnswerPoints: [{ type: String }],
    sampleStrongAnswer:   { type: String },
    weakAnswerIndicators: [{ type: String }],
    evaluationRubric:     [EvaluationRubricSchema],
    keywordsForMatching:  [{ type: String }],

    enableFollowUp:   { type: Boolean, default: false },
    followUpTriggers: [FollowUpTriggerSchema],

    maxScore:             { type: Number, default: 10 },
    suggestedTimeSeconds: { type: Number, default: 120 },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Indexes
InterviewQuestionBankSchema.index({ tenantId: 1, isActive: 1, interviewCategory: 1 });
InterviewQuestionBankSchema.index({ tenantId: 1, topic: 1, difficulty: 1 });
InterviewQuestionBankSchema.index({ tenantId: 1, questionType: 1 });
InterviewQuestionBankSchema.index({ tenantId: 1, tags: 1 });
InterviewQuestionBankSchema.index({ tenantId: 1, roleTarget: 1, experienceLevel: 1 });

export default mongoose.model<IInterviewQuestionBank>('InterviewQuestionBank', InterviewQuestionBankSchema);
