import mongoose, { Schema, Document } from 'mongoose';

// ─── Section Response (embedded) ─────────────────────────────────────────────

export interface ISectionQuestionResponse {
  questionId: mongoose.Types.ObjectId;
  questionText: string;
  questionType: string;
  answerMode: string;

  // Question display metadata (snapshotted at attempt start; safe to show student —
  // never contains the correct answer / isCorrect flags)
  questionHint?: string;
  difficulty?: string;
  topic?: string;
  mcqOptions?: { label: string; text: string }[];
  codeLanguage?: string;
  codeStarterTemplate?: string;
  suggestedTimeSeconds?: number;

  // Student answer
  answerText?: string;
  answerAudioUrl?: string;
  answerVideoUrl?: string;
  answerCode?: string;
  selectedMCQOption?: string;

  // Timing
  startedAt?: Date;
  answeredAt?: Date;
  responseTimeSeconds: number;
  pauseCount: number;
  retryCount: number;

  // Status
  status: 'not_started' | 'in_progress' | 'answered' | 'skipped' | 'timed_out';

  // Evaluation
  score: number;
  maxScore: number;
  feedback: string;
  strengths: string[];
  weaknesses: string[];
  missedPoints: string[];
  betterAnswerSuggestion?: string;
  keywordsCovered: string[];
  keywordsMissed: string[];

  // Category-specific scores (filled by evaluation engine)
  categoryScores?: Record<string, number>;   // e.g. { confidence: 8, fluency: 7 }
}

export interface ISectionAttempt {
  sectionId: mongoose.Types.ObjectId;        // ref to template section _id
  sectionTitle: string;
  sectionType: 'communication' | 'hr' | 'technical';
  sectionOrder: number;
  avatarImageUrl?: string;                   // snapshot of the section's interviewer avatar

  // Progress
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped' | 'timed_out';
  startedAt?: Date;
  completedAt?: Date;
  currentQuestionIndex: number;

  // Questions & Responses
  questionResponses: ISectionQuestionResponse[];

  // Section Score
  totalScore: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  passingThreshold: number;

  // Category-specific aggregated scores
  communicationScores?: {
    confidence: number;
    fluency: number;
    clarity: number;
    vocabulary: number;
    structure: number;
    grammar: number;
    listeningAbility: number;
  };
  hrScores?: {
    relevance: number;
    maturity: number;
    attitude: number;
    ownership: number;
    honesty: number;
    situationalThinking: number;
  };
  technicalScores?: {
    correctness: number;
    depth: number;
    logicalThinking: number;
    structuredExplanation: number;
    debuggingAbility: number;
    practicalUnderstanding: number;
  };
}

// ─── Main Attempt Interface ──────────────────────────────────────────────────

export interface IInterviewAttempt extends Document {
  tenantId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  templateId: mongoose.Types.ObjectId;
  assignmentId?: mongoose.Types.ObjectId;

  attemptNumber: number;

  // Lifecycle
  status: 'not_started' | 'in_progress' | 'submitted' | 'under_review' | 'evaluated' | 'published' | 'expired' | 'cancelled';

  // Timing
  startedAt?: Date;
  submittedAt?: Date;
  evaluatedAt?: Date;
  publishedAt?: Date;
  lastActiveAt?: Date;

  // Browser session tracking
  sessionId: string;
  tabDetectionViolations: number;
  disconnectCount: number;

  // Section attempts
  sectionAttempts: ISectionAttempt[];
  mode?: 'structured' | 'conversational';
  conversation?: { role: 'interviewer' | 'candidate'; text: string; at?: Date }[];
  currentSectionIndex: number;

  // Overall Results
  overallScore: number;
  overallMaxScore: number;
  overallPercentage: number;
  passStatus: 'pass' | 'fail' | 'pending' | 'incomplete';

  // Detailed Feedback
  overallFeedback?: string;
  topStrengths: string[];
  topWeaknesses: string[];
  recommendedPracticeAreas: string[];
  readinessLevel: 'not_ready' | 'needs_improvement' | 'almost_ready' | 'interview_ready';

  // Evaluator
  evaluatedBy?: mongoose.Types.ObjectId;
  evaluatorComments?: string;

  // AI usage / cost (accumulated across answer evaluations + summary)
  aiInputTokens: number;
  aiOutputTokens: number;
  aiCostUsd: number;

  // Continuous video recording (Bunny Stream)
  recordingBunnyVideoId?: string;
  recordingBunnyLibraryId?: string;
  recordingStatus?: 'none' | 'recording' | 'uploaded' | 'failed';

  createdAt: Date;
  updatedAt: Date;
}

// ─── Sub-Schemas ─────────────────────────────────────────────────────────────

const SectionQuestionResponseSchema = new Schema<ISectionQuestionResponse>({
  questionId:       { type: Schema.Types.ObjectId, ref: 'InterviewQuestionBank', required: true },
  questionText:     { type: String, required: true },
  questionType:     { type: String, required: true },
  answerMode:       { type: String, required: true },

  questionHint:        { type: String },
  difficulty:          { type: String },
  topic:               { type: String },
  mcqOptions:          [{ label: String, text: String, _id: false }],
  codeLanguage:        { type: String },
  codeStarterTemplate: { type: String },
  suggestedTimeSeconds:{ type: Number },

  answerText:       { type: String },
  answerAudioUrl:   { type: String },
  answerVideoUrl:   { type: String },
  answerCode:       { type: String },
  selectedMCQOption:{ type: String },

  startedAt:           { type: Date },
  answeredAt:          { type: Date },
  responseTimeSeconds: { type: Number, default: 0 },
  pauseCount:          { type: Number, default: 0 },
  retryCount:          { type: Number, default: 0 },

  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'answered', 'skipped', 'timed_out'],
    default: 'not_started',
  },

  score:                 { type: Number, default: 0 },
  maxScore:              { type: Number, default: 10 },
  feedback:              { type: String, default: '' },
  strengths:             [String],
  weaknesses:            [String],
  missedPoints:          [String],
  betterAnswerSuggestion:{ type: String },
  keywordsCovered:       [String],
  keywordsMissed:        [String],
  categoryScores:        { type: Schema.Types.Mixed },
}, { _id: true });

const SectionAttemptSchema = new Schema<ISectionAttempt>({
  sectionId:    { type: Schema.Types.ObjectId, required: true },
  sectionTitle: { type: String, required: true },
  sectionType:  { type: String, enum: ['communication', 'hr', 'technical'], required: true },
  sectionOrder: { type: Number, required: true },
  avatarImageUrl: { type: String },

  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed', 'skipped', 'timed_out'],
    default: 'not_started',
  },
  startedAt:            { type: Date },
  completedAt:          { type: Date },
  currentQuestionIndex: { type: Number, default: 0 },

  questionResponses: [SectionQuestionResponseSchema],

  totalScore:        { type: Number, default: 0 },
  maxScore:          { type: Number, default: 100 },
  percentage:        { type: Number, default: 0 },
  passed:            { type: Boolean, default: false },
  passingThreshold:  { type: Number, default: 50 },

  communicationScores: {
    confidence:       { type: Number },
    fluency:          { type: Number },
    clarity:          { type: Number },
    vocabulary:       { type: Number },
    structure:        { type: Number },
    grammar:          { type: Number },
    listeningAbility: { type: Number },
  },
  hrScores: {
    relevance:           { type: Number },
    maturity:            { type: Number },
    attitude:            { type: Number },
    ownership:           { type: Number },
    honesty:             { type: Number },
    situationalThinking: { type: Number },
  },
  technicalScores: {
    correctness:            { type: Number },
    depth:                  { type: Number },
    logicalThinking:        { type: Number },
    structuredExplanation:  { type: Number },
    debuggingAbility:       { type: Number },
    practicalUnderstanding: { type: Number },
  },
}, { _id: true });

// ─── Main Schema ─────────────────────────────────────────────────────────────

const InterviewAttemptSchema = new Schema<IInterviewAttempt>(
  {
    tenantId:     { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    studentId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    templateId:   { type: Schema.Types.ObjectId, ref: 'InterviewTemplate', required: true },
    assignmentId: { type: Schema.Types.ObjectId, ref: 'InterviewAssignment' },

    attemptNumber: { type: Number, default: 1 },

    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'submitted', 'under_review', 'evaluated', 'published', 'expired', 'cancelled'],
      default: 'not_started',
    },

    startedAt:    { type: Date },
    submittedAt:  { type: Date },
    evaluatedAt:  { type: Date },
    publishedAt:  { type: Date },
    lastActiveAt: { type: Date },

    sessionId:               { type: String, default: '' },
    tabDetectionViolations:  { type: Number, default: 0 },
    disconnectCount:         { type: Number, default: 0 },

    sectionAttempts:     [SectionAttemptSchema],
    currentSectionIndex: { type: Number, default: 0 },

    // Live conversational mode (real-time AI interview): full spoken transcript.
    mode:          { type: String, enum: ['structured', 'conversational'], default: 'structured' },
    conversation:  { type: [{ role: { type: String, enum: ['interviewer', 'candidate'] }, text: String, at: Date }], default: [] },

    overallScore:      { type: Number, default: 0 },
    overallMaxScore:   { type: Number, default: 0 },
    overallPercentage: { type: Number, default: 0 },
    passStatus:        { type: String, enum: ['pass', 'fail', 'pending', 'incomplete'], default: 'pending' },

    overallFeedback:           { type: String },
    topStrengths:              [String],
    topWeaknesses:             [String],
    recommendedPracticeAreas:  [String],
    readinessLevel: {
      type: String,
      enum: ['not_ready', 'needs_improvement', 'almost_ready', 'interview_ready'],
      default: 'not_ready',
    },

    evaluatedBy:       { type: Schema.Types.ObjectId, ref: 'User' },
    evaluatorComments: { type: String },

    aiInputTokens:  { type: Number, default: 0 },
    aiOutputTokens: { type: Number, default: 0 },
    aiCostUsd:      { type: Number, default: 0 },

    recordingBunnyVideoId:   { type: String },
    recordingBunnyLibraryId: { type: String },
    recordingStatus:         { type: String, enum: ['none', 'recording', 'uploaded', 'failed'], default: 'none' },
  },
  { timestamps: true }
);

// Indexes
InterviewAttemptSchema.index({ tenantId: 1, studentId: 1, status: 1 });
InterviewAttemptSchema.index({ tenantId: 1, templateId: 1 });
InterviewAttemptSchema.index({ tenantId: 1, assignmentId: 1 });
InterviewAttemptSchema.index({ studentId: 1, templateId: 1, attemptNumber: 1 }, { unique: true });
InterviewAttemptSchema.index({ tenantId: 1, status: 1, submittedAt: -1 });

export default mongoose.model<IInterviewAttempt>('InterviewAttempt', InterviewAttemptSchema);
