export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string;
  batchId?: string;
  batchName?: string;
  batchJoinedDate?: string;
  customRoleId?: string;
  isActive: boolean;
  profilePicture?: string;
  createdAt?: string;
  permissions?: string[];
  // Profile fields
  phone?: string;
  bio?: string;
  avatar?: string;
  linkedin?: string;
  github?: string;
  profileComplete?: boolean;
}

export interface Tenant {
  _id: string;
  name: string;
  slug: string;
  logo?: string;
  subscriptionPlan: string;
  isActive: boolean;
}

export interface Course {
  _id: string;
  title: string;
  description: string;
  instructor: string | { firstName: string; lastName: string };
  tenantId: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  isPublished: boolean;
  enrollmentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Lesson {
  _id: string;
  courseId: string;
  title: string;
  description: string;
  content: string;
  videoUrl?: string;
  order: number;
  createdAt: string;
}

export interface Enrollment {
  _id: string;
  userId: string;
  courseId: string;
  tenantId: string;
  status: 'enrolled' | 'completed' | 'dropped';
  progress: number;
  enrolledAt: string;
  completedAt?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface Role {
  _id: string;
  name: string;
  permissions: string[];
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Batch {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  timings: Array<{
    day: string;
    startTime: string;
    endTime: string;
  }>;
  instructors: Array<{
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  }>;
  tenantId: string;
  isActive: boolean;
  capacity: number;
  enrolledCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Attendance {
  _id: string;
  studentId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  batchId: {
    _id: string;
    name: string;
  };
  date: string;
  inTime?: string;
  outTime?: string;
  status: 'present' | 'absent' | 'leave';
  markedBy: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  leave: number;
  percentage: number;
}

export interface StudentAttendanceSummary extends AttendanceSummary {
  studentId: string;
  studentName: string;
  studentEmail: string;
}

export interface Batch {
  _id: string;
  name: string;
  code: string;
  description?: string;
  academicYear: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

// Quiz Types
export interface QuestionOption {
  _id?: string;
  text: string;
  isCorrect?: boolean;
}

export interface Question {
  _id: string;
  quizId: string;
  questionNo: number;
  type: 'short_answer' | 'mcq_single' | 'mcq_multiple' | 'coding';
  questionText: string;
  question?: string;
  description?: string;
  options?: QuestionOption[];
  correctAnswers?: string[];
  correctAnswerText?: string;
  codingLanguages?: string[];
  testCases?: Array<{ input: string; expectedOutput: string; output?: string }>;
  marks: number;
  negativeMarks?: number;
  difficulty: 'easy' | 'medium' | 'hard';
  difficultyLevel?: 'easy' | 'medium' | 'hard';
  explanation?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Quiz {
  _id: string;
  title: string;
  description: string;
  instructions?: string;
  tenantId: string;
  createdBy: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  access: 'public' | 'private';
  accessibleTo: 'everyone' | 'batch_wise' | 'individual';
  selectedBatches?: string[];
  selectedStudents?: string[];
  totalQuestions: number;
  totalMarks: number;
  totalTime: number;
  questionCount?: number;
  passingMarks?: number;
  passPercentage?: number;
  negativeMarking: boolean;
  negativeMarkingValue?: number;
  shuffleQuestions: boolean;
  showAnswersAfterSubmit: boolean;
  showScoreAfterSubmit: boolean;
  allowReview: boolean;
  multipleAttempts: boolean;
  maxAttempts?: number;
  canCopyPaste: boolean;
  requireFullScreen: boolean;
  tabSwitchWarnings: boolean;
  enableCamera: boolean;
  enableMicrophone: boolean;
  warningCount?: number;
  warnings?: number[];
  isActive: boolean;
  isAttempted?: boolean;
  lastAttemptMarks?: number;
  lastAttemptPassed?: boolean;
  attemptCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuizAttempt {
  _id: string;
  quizId: string;
  studentId: string;
  tenantId: string;
  attemptNo: number;
  startedAt: string;
  submittedAt?: string;
  abandonedAt?: string;
  status: 'in_progress' | 'submitted' | 'abandoned' | 'grading';
  totalMarks: number;
  obtainedMarks?: number;
  percentage?: number;
  passed?: boolean;
  timeSpent: number;
  questionsAnswered: number;
  tabSwitchCount: number;
  tabSwitchWarnings: number;
  isFullScreenMaintained: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuizSubmission {
  _id: string;
  quizAttemptId: string;
  quizId: string;
  questionId: string;
  studentId: string;
  questionNo: number;
  questionType: 'short_answer' | 'mcq_single' | 'mcq_multiple' | 'coding';
  studentAnswer: string | string[];
  selectedOptions?: string[];
  isCorrect?: boolean;
  marksAwarded?: number;
  feedback?: string;
  gradedAt?: string;
  createdAt: string;
}

export interface QuizResult {
  attempt: QuizAttempt;
  quiz: Quiz;
  submissions: QuizSubmission[];
}