import { authenticatedFetch, API_BASE_URL } from './index';

export interface InterviewResponse {
  questionNumber: number;
  question: string;
  questionType: 'technical' | 'behavioral' | 'situational' | 'coding';
  expectedTopics: string[];
  answer: string;
  responseTime: number;
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  keywordsCovered: string[];
  keywordsMissed: string[];
}

export interface MockInterview {
  _id: string;
  studentId: string | { _id: string; name: string; email: string };
  tenantId: string;
  courseId?: string | { _id: string; name: string };
  subjectId?: string;
  chapterId?: string | { _id: string; name: string };
  batchId?: string | { _id: string; name: string };
  type: 'ai' | 'expert' | 'peer';
  category: string;
  subCategory?: string;
  targetCompany?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  totalQuestions: number;
  timeLimit: number;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'expired';
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  actualDuration?: number;
  responses: InterviewResponse[];
  currentQuestionIndex: number;
  overallScore?: number;
  overallFeedback?: string;
  technicalScore?: number;
  communicationScore?: number;
  confidenceScore?: number;
  clarityScore?: number;
  topStrengths: string[];
  topImprovements: string[];
  recommendedTopics: string[];
  // Assignment fields
  isAssigned?: boolean;
  assignedBy?: string | { _id: string; name: string; email: string };
  assignedAt?: string;
  dueDate?: string;
  assignmentNote?: string;
  assignmentPriority?: 'low' | 'medium' | 'high';
  // Recording fields
  recordingEnabled?: boolean;
  recordingUrl?: string;
  recordingDuration?: number;
  recordingSize?: number;
  recordingType?: 'video' | 'audio';
  createdAt: string;
  updatedAt: string;
}

export interface InterviewCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  subCategories: { id: string; name: string }[];
}

export interface InterviewStats {
  totalInterviews: number;
  completedInterviews: number;
  averageScore: number;
  bestScore: number;
  recentTrend: number[];
  categoryBreakdown: { category: string; count: number; avgScore: number }[];
}

export interface LeaderboardEntry {
  rank: number;
  studentId: string;
  studentName: string;
  avgScore: number;
  interviewCount: number;
}

export interface CreateInterviewData {
  category: string;
  subCategory?: string;
  targetCompany?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  totalQuestions?: number;
  timeLimit?: number;
  courseId?: string;
  subjectId?: string;
  chapterId?: string;
  batchId?: string;
}

export interface SubmitAnswerData {
  questionIndex: number;
  answer: string;
  responseTime: number;
}

export interface SubmitAnswerResponse {
  evaluation: InterviewResponse;
  nextQuestion: InterviewResponse | null;
}

// Assignment interfaces
export interface AssignInterviewData {
  studentId: string;
  category: string;
  subCategory?: string;
  targetCompany?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  totalQuestions?: number;
  timeLimit?: number;
  dueDate?: string;
  assignmentNote?: string;
  assignmentPriority?: 'low' | 'medium' | 'high';
  recordingEnabled?: boolean;
  courseId?: string;
  subjectId?: string;
  chapterId?: string;
  batchId?: string;
}

export interface AssignBatchData {
  batchId: string;
  studentIds: string[];
  category: string;
  subCategory?: string;
  targetCompany?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  totalQuestions?: number;
  timeLimit?: number;
  dueDate?: string;
  assignmentNote?: string;
  assignmentPriority?: 'low' | 'medium' | 'high';
  recordingEnabled?: boolean;
  courseId?: string;
  subjectId?: string;
  chapterId?: string;
}

export interface AssignmentStats {
  totalAssigned: number;
  completed: number;
  pending: number;
  overdue: number;
  averageScore: number;
  completionRate: number;
}

export interface RecordingData {
  recordingUrl: string;
  recordingDuration: number;
  recordingSize: number;
  recordingType: 'video' | 'audio';
}

const mockInterviewApi = {
  // Get available categories
  getCategories: async (): Promise<InterviewCategory[]> => {
    return authenticatedFetch(`${API_BASE_URL}/mock-interviews/categories`, {
      method: 'GET'
    });
  },

  // Create a new interview
  createInterview: async (data: CreateInterviewData): Promise<MockInterview> => {
    return authenticatedFetch(`${API_BASE_URL}/mock-interviews`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Get my interviews
  getMyInterviews: async (params?: {
    category?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ interviews: MockInterview[]; total: number }> => {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    
    const url = queryParams.toString() 
      ? `${API_BASE_URL}/mock-interviews/my-interviews?${queryParams.toString()}`
      : `${API_BASE_URL}/mock-interviews/my-interviews`;
    
    return authenticatedFetch(url, { method: 'GET' });
  },

  // Get my stats
  getMyStats: async (): Promise<InterviewStats> => {
    return authenticatedFetch(`${API_BASE_URL}/mock-interviews/my-stats`, {
      method: 'GET'
    });
  },

  // Get interview by ID
  getInterview: async (interviewId: string): Promise<MockInterview> => {
    return authenticatedFetch(`${API_BASE_URL}/mock-interviews/${interviewId}`, {
      method: 'GET'
    });
  },

  // Start an interview
  startInterview: async (interviewId: string): Promise<MockInterview> => {
    return authenticatedFetch(`${API_BASE_URL}/mock-interviews/${interviewId}/start`, {
      method: 'POST'
    });
  },

  // Submit answer
  submitAnswer: async (interviewId: string, data: SubmitAnswerData): Promise<SubmitAnswerResponse> => {
    return authenticatedFetch(`${API_BASE_URL}/mock-interviews/${interviewId}/answer`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Complete interview
  completeInterview: async (interviewId: string): Promise<MockInterview> => {
    return authenticatedFetch(`${API_BASE_URL}/mock-interviews/${interviewId}/complete`, {
      method: 'POST'
    });
  },

  // Cancel interview
  cancelInterview: async (interviewId: string): Promise<MockInterview> => {
    return authenticatedFetch(`${API_BASE_URL}/mock-interviews/${interviewId}/cancel`, {
      method: 'POST'
    });
  },

  // Get batch leaderboard
  getLeaderboard: async (batchId: string, limit?: number): Promise<LeaderboardEntry[]> => {
    const url = limit 
      ? `${API_BASE_URL}/mock-interviews/leaderboard/${batchId}?limit=${limit}`
      : `${API_BASE_URL}/mock-interviews/leaderboard/${batchId}`;
    return authenticatedFetch(url, { method: 'GET' });
  },

  // ==================== ASSIGNMENT APIs ====================

  // Admin: Assign interview to single student
  assignToStudent: async (data: AssignInterviewData): Promise<MockInterview> => {
    return authenticatedFetch(`${API_BASE_URL}/mock-interviews/assign/student`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Admin: Assign interview to batch of students
  assignToBatch: async (data: AssignBatchData): Promise<{ created: number; failed: string[] }> => {
    return authenticatedFetch(`${API_BASE_URL}/mock-interviews/assign/batch`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Admin: Get all assigned interviews
  getAssignedInterviews: async (params?: {
    assignedBy?: string;
    batchId?: string;
    status?: string;
    category?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ interviews: MockInterview[]; total: number }> => {
    const queryParams = new URLSearchParams();
    if (params?.assignedBy) queryParams.append('assignedBy', params.assignedBy);
    if (params?.batchId) queryParams.append('batchId', params.batchId);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    
    const url = queryParams.toString()
      ? `${API_BASE_URL}/mock-interviews/assigned?${queryParams.toString()}`
      : `${API_BASE_URL}/mock-interviews/assigned`;
    
    return authenticatedFetch(url, { method: 'GET' });
  },

  // Student: Get my assigned interviews
  getMyAssignedInterviews: async (params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ interviews: MockInterview[]; total: number }> => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    
    const url = queryParams.toString()
      ? `${API_BASE_URL}/mock-interviews/my-assigned?${queryParams.toString()}`
      : `${API_BASE_URL}/mock-interviews/my-assigned`;
    
    return authenticatedFetch(url, { method: 'GET' });
  },

  // Admin: Get assignment statistics
  getAssignmentStats: async (myAssignmentsOnly?: boolean): Promise<AssignmentStats> => {
    const url = myAssignmentsOnly
      ? `${API_BASE_URL}/mock-interviews/assignment-stats?myAssignmentsOnly=true`
      : `${API_BASE_URL}/mock-interviews/assignment-stats`;
    return authenticatedFetch(url, { method: 'GET' });
  },

  // ==================== RECORDING APIs ====================

  // Save recording for interview
  saveRecording: async (interviewId: string, data: RecordingData): Promise<MockInterview> => {
    return authenticatedFetch(`${API_BASE_URL}/mock-interviews/${interviewId}/recording`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Admin: Get interviews with recordings
  getInterviewsWithRecordings: async (params?: {
    batchId?: string;
    studentId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ interviews: MockInterview[]; total: number }> => {
    const queryParams = new URLSearchParams();
    if (params?.batchId) queryParams.append('batchId', params.batchId);
    if (params?.studentId) queryParams.append('studentId', params.studentId);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    
    const url = queryParams.toString()
      ? `${API_BASE_URL}/mock-interviews/recordings?${queryParams.toString()}`
      : `${API_BASE_URL}/mock-interviews/recordings`;
    
    return authenticatedFetch(url, { method: 'GET' });
  }
};

export default mockInterviewApi;
