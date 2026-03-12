import axios from 'axios';

// Create axios instance
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add auth interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (tenantId) {
    config.headers['X-Tenant-Id'] = tenantId;
  }
  
  return config;
});

// Enums
export enum AssignmentType {
  CODING = 'coding',
  PROJECT = 'project',
  MCQ = 'mcq',
  THEORY = 'theory',
  SQL = 'sql',
  FILE_UPLOAD = 'file_upload',
  WEB = 'web'
}

export enum DifficultyLevel {
  BEGINNER = 'beginner',
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  EXPERT = 'expert'
}

export enum AssignmentStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

export enum SubmissionStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  SUBMITTED = 'submitted',
  GRADED = 'graded',
  LATE = 'late'
}

export enum ProgrammingLanguage {
  JAVASCRIPT = 'javascript',
  TYPESCRIPT = 'typescript',
  PYTHON = 'python',
  JAVA = 'java',
  CPP = 'cpp',
  C = 'c',
  CSHARP = 'csharp',
  GO = 'go',
  RUST = 'rust',
  SQL = 'sql',
  HTML = 'html',
  CSS = 'css'
}

// Interfaces
export interface TestCase {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  points: number;
  description?: string;
  timeLimit?: number;
}

export interface StarterCode {
  language: ProgrammingLanguage;
  code: string;
  solutionCode?: string;
}

export interface RubricItem {
  criterion: string;
  description?: string;
  maxPoints: number;
  order?: number;
}

export interface MCQOption {
  text: string;
  isCorrect: boolean;
}

export interface MCQQuestion {
  question: string;
  options: MCQOption[];
  explanation?: string;
  points: number;
}

export interface Assignment {
  _id: string;
  tenant: string;
  title: string;
  description: string;
  instructions?: string;
  type: AssignmentType;
  difficulty: DifficultyLevel;
  topics: string[];
  tags: string[];
  totalPoints: number;
  passingPoints: number;
  status: AssignmentStatus;
  startDate?: string;
  dueDate?: string;
  lateSubmissionDeadline?: string;
  lateSubmissionPenalty: number;
  course?: { _id: string; name: string } | string;
  subject?: { _id: string; title: string } | string;
  chapter?: { _id: string; title: string } | string;
  batch?: { _id: string; name: string };
  allowedLanguages: ProgrammingLanguage[];
  testCases: TestCase[];
  starterCode: StarterCode[];
  timeLimit?: number;
  memoryLimit?: number;
  mcqQuestions: MCQQuestion[];
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  rubric: RubricItem[];
  maxFileSize: number;
  allowedFileTypes: string[];
  maxFiles: number;
  maxAttempts: number;
  showTestCaseResults: boolean;
  showExpectedOutput: boolean;
  showSyntaxErrors: boolean;
  enablePlagiarismCheck: boolean;
  enableCamera?: boolean;
  enableMicrophone?: boolean;
  enableHints: boolean;
  hints: string[];
  isInBank: boolean;
  bankCategory?: string;
  createdBy?: { _id: string; name: string; email: string };
  settings?: {
    shuffleQuestions?: boolean;
    shuffleOptions?: boolean;
    showCorrectAnswers?: boolean;
    timeLimitMinutes?: number;
    maxAttempts?: number;
    allowLateSubmission?: boolean;
    latePenaltyPercent?: number;
  };
  stats: {
    totalSubmissions: number;
    completedSubmissions: number;
    averageScore: number;
    highestScore: number;
    averageTimeSpent: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TestCaseResult {
  testCaseIndex: number;
  passed: boolean;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  executionTime: number;
  memoryUsed: number;
  error?: string;
  isHidden: boolean;
}

// Alias for TestCaseResult
export type TestResult = TestCaseResult;

export interface MCQAnswer {
  questionIndex: number;
  selectedOption: number;
  isCorrect?: boolean;
}

export interface RubricScore {
  criterion: string;
  score: number;
  feedback?: string;
}

export interface Submission {
  _id: string;
  tenant: string;
  assignment: string | Assignment;
  student: { _id: string; name: string; email: string };
  attemptNumber: number;
  status: SubmissionStatus;
  startedAt?: string;
  submittedAt?: string;
  gradedAt?: string;
  timeSpent: number;
  language?: ProgrammingLanguage;
  code?: string;
  testResults?: TestCaseResult[];
  mcqAnswers?: MCQAnswer[];
  theoryAnswer?: string;
  score?: number;
  autoScore?: number;
  manualScore?: number;
  totalScore?: number;
  finalScore?: number;
  penaltyApplied?: number;
  percentage?: number;
  isPassing?: boolean;
  feedback?: string;
  rubricScores?: RubricScore[];
  createdAt: string;
  updatedAt: string;
}

export interface StudentAssignment extends Assignment {
  submission: {
    status: SubmissionStatus;
    attemptNumber: number;
    finalScore: number;
    percentage: number;
    submittedAt?: string;
  } | null;
}

export interface SubmissionStats {
  total: number;
  graded: number;
  pending: number;
  late: number;
  avgScore: number;
  highestScore: number;
  lowestScore: number;
  passing: number;
  passRate: number;
}

// Assignment input type for create/update
export interface AssignmentInput {
  title: string;
  description?: string;
  instructions?: string;
  type: AssignmentType;
  difficulty?: DifficultyLevel;
  topics?: string[];
  tags?: string[];
  totalPoints?: number;
  passingPoints?: number;
  startDate?: string;
  dueDate?: string;
  lateSubmissionDeadline?: string;
  lateSubmissionPenalty?: number;
  course?: string;
  batch?: string;
  allowedLanguages?: ProgrammingLanguage[];
  testCases?: TestCase[];
  starterCode?: StarterCode[];
  timeLimit?: number;
  memoryLimit?: number;
  mcqQuestions?: MCQQuestion[];
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  rubric?: RubricItem[];
  maxFileSize?: number;
  allowedFileTypes?: string[];
  maxFiles?: number;
  maxAttempts?: number;
  showTestCaseResults?: boolean;
  showExpectedOutput?: boolean;
  showSyntaxErrors?: boolean;
  enableHints?: boolean;
  hints?: string[];
  isInBank?: boolean;
  bankCategory?: string;
}

// API Response types
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Assignment API
export const assignmentApi = {
  // Admin - Create assignment
  create: (data: AssignmentInput) =>
    api.post<ApiResponse<Assignment>>('/assignments', data),

  // Admin - Get assignment by ID
  getById: (id: string) =>
    api.get<ApiResponse<Assignment>>(`/assignments/${id}`),

  // Admin - Update assignment
  update: (id: string, data: Partial<AssignmentInput>) =>
    api.put<ApiResponse<Assignment>>(`/assignments/${id}`, data),

  // Admin - Delete assignment
  delete: (id: string) =>
    api.delete<ApiResponse<void>>(`/assignments/${id}`),

  // Admin - List assignments
  list: (params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    status?: AssignmentStatus;
    type?: AssignmentType;
    difficulty?: DifficultyLevel;
    course?: string;
    batch?: string;
    search?: string;
    isInBank?: boolean;
  }) => api.get<PaginatedResponse<Assignment>>('/assignments', { params }),

  // Admin - Publish assignment
  publish: (id: string) =>
    api.post<ApiResponse<Assignment>>(`/assignments/${id}/publish`),

  // Admin - Archive assignment
  archive: (id: string) =>
    api.post<ApiResponse<Assignment>>(`/assignments/${id}/archive`),

  // Admin - Clone assignment
  clone: (id: string) =>
    api.post<ApiResponse<Assignment>>(`/assignments/${id}/clone`),

  // Admin - Get bank assignments
  getBank: (category?: string) =>
    api.get<ApiResponse<Assignment[]>>('/assignments/bank', {
      params: category ? { category } : undefined
    }),

  // Get topics
  getTopics: () =>
    api.get<ApiResponse<string[]>>('/assignments/topics'),

  // Get tags
  getTags: () =>
    api.get<ApiResponse<string[]>>('/assignments/tags'),

  // Student - Get my assignments
  getStudentAssignments: (batch?: string) =>
    api.get<ApiResponse<StudentAssignment[]>>('/assignments/student/list', {
      params: batch ? { batch } : undefined
    }),

  // Admin - Get submissions for assignment
  getSubmissions: (assignmentId: string, params?: {
    status?: SubmissionStatus;
    page?: number;
    limit?: number;
  }) => api.get<PaginatedResponse<Submission>>(`/assignments/${assignmentId}/submissions`, { params }),

  // Admin - Get assignment stats
  getStats: (assignmentId: string) =>
    api.get<ApiResponse<SubmissionStats>>(`/assignments/${assignmentId}/stats`),

  // Download assignment template
  downloadTemplate: async (type?: 'coding' | 'mcq' | 'general') => {
    const response = await fetch(`${API_BASE_URL}/assignments/template/download?type=${type || 'general'}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'X-Tenant-Id': localStorage.getItem('tenantId') || ''
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to download template');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assignment_template_${type || 'general'}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // Import assignments from CSV data
  importFromCSV: (assignments: any[]) =>
    api.post<ApiResponse<{ success: any[]; failed: any[] }>>('/assignments/import', { assignments }),

  // Reports
  getOverallReports: (params: string) => api.get(`/assignments/reports/overall?${params}`),
  getByAssignmentReports: (params: string) => api.get(`/assignments/reports/by-assignment?${params}`),
  getByStudentReports: (params: string) => api.get(`/assignments/reports/by-student?${params}`),
  exportReports: (params: string) => api.get(`/assignments/reports/export?${params}`, { responseType: 'blob' })
};

// Submission API  
export const submissionApi = {
  // Start new submission
  startSubmission: (assignmentId: string) =>
    api.post<ApiResponse<Submission>>(`/assignments/${assignmentId}/start`),

  // Get my submission for an assignment
  getMySubmission: (assignmentId: string) =>
    api.get<ApiResponse<Submission | null>>(`/assignments/${assignmentId}/my-submission`),

  // Get my assignments (student view)
  getMyAssignments: () =>
    api.get<ApiResponse<Assignment[]>>('/assignments/student/list'),

  // Save code (auto-save)
  saveCode: (submissionId: string, data: { code: string; language: ProgrammingLanguage }) =>
    api.post<ApiResponse<Submission>>(`/assignments/submissions/${submissionId}/save-code`, data),

  // Run code
  runCode: (submissionId: string, data: { code: string; language: ProgrammingLanguage }) =>
    api.post<ApiResponse<{ results: TestResult[]; allPassed: boolean; compilationError?: string }>>(
      `/assignments/submissions/${submissionId}/run`,
      data
    ),

  // Submit coding assignment
  submitCoding: (submissionId: string, data: { code: string; language: ProgrammingLanguage }) =>
    api.post<ApiResponse<Submission>>(`/assignments/submissions/${submissionId}/submit-coding`, data),

  // Submit MCQ
  submitMCQ: (submissionId: string, answers: { questionIndex: number; selectedOption: number }[]) =>
    api.post<ApiResponse<Submission>>(`/assignments/submissions/${submissionId}/submit-mcq`, {
      answers
    }),

  // Submit theory/file upload
  submitTheory: (submissionId: string, theoryAnswer: string) =>
    api.post<ApiResponse<Submission>>(`/assignments/submissions/${submissionId}/submit-theory`, {
      theoryAnswer
    }),

  // Get submission by ID
  getSubmission: (submissionId: string) =>
    api.get<ApiResponse<Submission>>(`/assignments/submissions/${submissionId}`),

  // Get all my submissions
  getMySubmissions: () =>
    api.get<ApiResponse<Submission[]>>('/assignments/student/submissions'),

  // Admin - Grade submission
  grade: (submissionId: string, data: {
    score: number;
    feedback?: string;
    rubricScores?: { criterion: string; score: number }[];
  }) => api.post<ApiResponse<Submission>>(`/assignments/submissions/${submissionId}/grade`, data),
  
  // Admin - Allow re-attempt (reset submission)
  allowReattempt: (submissionId: string) =>
    api.post<ApiResponse<Submission>>(`/assignments/submissions/${submissionId}/allow-reattempt`)
};

export default assignmentApi;
