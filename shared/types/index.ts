export interface IUser {
  _id?: string;
  email: string;
  firstName: string;
  lastName: string;
  password?: string;
  role: string;
  tenantId: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITenant {
  _id?: string;
  name: string;
  description?: string;
  slug: string;
  logo?: string;
  website?: string;
  adminId: string;
  isActive: boolean;
  subscriptionPlan: 'free' | 'pro' | 'enterprise';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICourse {
  _id?: string;
  title: string;
  description: string;
  instructor: string;
  tenantId: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  isPublished: boolean;
  enrollmentCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ILesson {
  _id?: string;
  courseId: string;
  title: string;
  description: string;
  content: string;
  videoUrl?: string;
  order: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IEnrollment {
  _id?: string;
  userId: string;
  courseId: string;
  tenantId: string;
  status: 'enrolled' | 'completed' | 'dropped';
  progress: number;
  enrolledAt: Date;
  completedAt?: Date;
}

export interface IRole {
  _id?: string;
  name: string;
  permissions: string[];
  tenantId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuthResponse {
  token: string;
  user: IUser;
  tenant: ITenant;
}

// ─── Interview Module Types ──────────────────────────────────────────────────

export type InterviewCategory = 'communication' | 'hr' | 'technical';
export type InterviewDifficulty = 'easy' | 'medium' | 'hard' | 'mixed';
export type InterviewExperienceLevel = 'fresher' | 'junior' | 'mid' | 'senior' | 'custom';
export type InterviewMode = 'practice' | 'assessment' | 'placement';
export type AnswerMode = 'text' | 'audio' | 'video' | 'mcq' | 'code' | 'mixed' | 'structured_explanation';
export type InterviewTemplateStatus = 'draft' | 'published' | 'scheduled' | 'active' | 'expired' | 'cancelled' | 'archived';
export type InterviewAttemptStatus = 'not_started' | 'in_progress' | 'submitted' | 'under_review' | 'evaluated' | 'published' | 'expired' | 'cancelled';
export type InterviewAssignmentStatus = 'assigned' | 'in_progress' | 'completed' | 'expired' | 'cancelled';
export type ReadinessLevel = 'not_ready' | 'needs_improvement' | 'almost_ready' | 'interview_ready';

export interface ISectionDefinitionShared {
  _id?: string;
  sectionOrder: number;
  sectionTitle: string;
  sectionType: InterviewCategory;
  isMandatory: boolean;
  questionSource: 'question_bank' | 'manual' | 'random';
  questionOrder: 'fixed' | 'random';
  questionIds: string[];
  randomQuestionCount?: number;
  randomFilters?: {
    topics?: string[];
    difficulty?: string[];
    tags?: string[];
  };
  sectionTimeLimit?: number;
  perQuestionTimeLimit?: number;
  scoringPattern: 'equal' | 'weighted' | 'custom';
  maxScore: number;
  passingThreshold: number;
  canBeSkipped: boolean;
  answerMode: AnswerMode;
  instructions?: string;
}

export interface IInterviewTemplateShared {
  _id?: string;
  tenantId: string;
  createdBy: string | { _id: string; firstName: string; lastName: string; email: string };
  title: string;
  description?: string;
  targetAudience?: string;
  interviewCategories: InterviewCategory[];
  courseId?: string;
  batchId?: string;
  totalDuration: number;
  difficultyLevel: InterviewDifficulty;
  experienceLevel: InterviewExperienceLevel;
  interviewMode: InterviewMode;
  sections: ISectionDefinitionShared[];
  sectionNavigationMode: 'sequential' | 'free';
  scheduleType: 'immediate' | 'scheduled';
  scheduledStartDate?: string;
  scheduledEndDate?: string;
  expiryDate?: string;
  maxAttempts: number;
  allowResume: boolean;
  showResultImmediately: boolean;
  requireReviewBeforePublish: boolean;
  blockMultipleTabs: boolean;
  requireMicrophone: boolean;
  microphoneFallback: 'block' | 'text_fallback';
  enableCodeEditor: boolean;
  status: InterviewTemplateStatus;
  version: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface IInterviewQuestionShared {
  _id?: string;
  interviewCategory: InterviewCategory;
  questionType: string;
  topic: string;
  subTopic?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  roleTarget?: string;
  experienceLevel: string;
  tags: string[];
  questionText: string;
  questionHint?: string;
  answerMode: AnswerMode;
  mcqOptions?: { label: string; text: string; isCorrect: boolean }[];
  expectedAnswerPoints: string[];
  sampleStrongAnswer?: string;
  weakAnswerIndicators: string[];
  keywordsForMatching: string[];
  enableFollowUp: boolean;
  maxScore: number;
  suggestedTimeSeconds: number;
  isActive: boolean;
  createdAt?: string;
}

export interface ISectionQuestionResponseShared {
  _id?: string;
  questionId: string;
  questionText: string;
  questionType: string;
  answerMode: string;
  answerText?: string;
  answerCode?: string;
  selectedMCQOption?: string;
  responseTimeSeconds: number;
  status: 'not_started' | 'in_progress' | 'answered' | 'skipped' | 'timed_out';
  score: number;
  maxScore: number;
  feedback: string;
  strengths: string[];
  weaknesses: string[];
  missedPoints: string[];
  betterAnswerSuggestion?: string;
  categoryScores?: Record<string, number>;
}

export interface ISectionAttemptShared {
  _id?: string;
  sectionId: string;
  sectionTitle: string;
  sectionType: InterviewCategory;
  sectionOrder: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped' | 'timed_out';
  currentQuestionIndex: number;
  questionResponses: ISectionQuestionResponseShared[];
  totalScore: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  passingThreshold: number;
  communicationScores?: Record<string, number>;
  hrScores?: Record<string, number>;
  technicalScores?: Record<string, number>;
}

export interface IInterviewAttemptShared {
  _id?: string;
  tenantId: string;
  studentId: string | { _id: string; firstName: string; lastName: string; email: string };
  templateId: string | IInterviewTemplateShared;
  assignmentId?: string;
  attemptNumber: number;
  status: InterviewAttemptStatus;
  startedAt?: string;
  submittedAt?: string;
  evaluatedAt?: string;
  publishedAt?: string;
  sessionId: string;
  tabDetectionViolations: number;
  sectionAttempts: ISectionAttemptShared[];
  currentSectionIndex: number;
  overallScore: number;
  overallMaxScore: number;
  overallPercentage: number;
  passStatus: 'pass' | 'fail' | 'pending' | 'incomplete';
  overallFeedback?: string;
  topStrengths: string[];
  topWeaknesses: string[];
  recommendedPracticeAreas: string[];
  readinessLevel: ReadinessLevel;
  evaluatedBy?: string | { _id: string; firstName: string; lastName: string };
  evaluatorComments?: string;
  createdAt?: string;
}

export interface IInterviewAssignmentShared {
  _id?: string;
  tenantId: string;
  templateId: string | IInterviewTemplateShared;
  assignedBy: string | { _id: string; firstName: string; lastName: string };
  studentId: string | { _id: string; firstName: string; lastName: string; email: string };
  pushReason?: string;
  pushNote?: string;
  availableFrom: string;
  dueDate?: string;
  expiresAt?: string;
  maxAttempts: number;
  attemptsUsed: number;
  bestScore?: number;
  latestScore?: number;
  status: InterviewAssignmentStatus;
  createdAt?: string;
}