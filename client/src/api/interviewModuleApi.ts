// Types used by interview module API
type IInterviewTemplateShared = Record<string, any>;
type IInterviewQuestionShared = Record<string, any>;
type IInterviewAttemptShared = Record<string, any>;
type IInterviewAssignmentShared = Record<string, any>;
type ISectionDefinitionShared = Record<string, any>;
type InterviewCategory = string;
type InterviewDifficulty = string;

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api/v1';
const MODULE_URL = `${API_BASE_URL}/interview-module`;

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(tenantId && { 'X-Tenant-Id': tenantId }),
  };
};

const apiFetch = async (url: string, options: RequestInit = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: { ...getAuthHeaders(), ...(options.headers || {}) },
  });

  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tenantId');
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `API error: ${response.status}`);
  }

  return data;
};

// ─── Templates API ───────────────────────────────────────────────────────────

export const interviewTemplateApi = {
  create: (data: Partial<IInterviewTemplateShared>) =>
    apiFetch(`${MODULE_URL}/templates`, { method: 'POST', body: JSON.stringify(data) }),

  getAll: (params?: {
    status?: string; category?: string; difficulty?: string;
    search?: string; page?: number; limit?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.append('status', params.status);
    if (params?.category) qs.append('category', params.category);
    if (params?.difficulty) qs.append('difficulty', params.difficulty);
    if (params?.search) qs.append('search', params.search);
    if (params?.page) qs.append('page', String(params.page));
    if (params?.limit) qs.append('limit', String(params.limit));
    const q = qs.toString();
    return apiFetch(`${MODULE_URL}/templates${q ? `?${q}` : ''}`);
  },

  getById: (templateId: string) =>
    apiFetch(`${MODULE_URL}/templates/${templateId}`),

  update: (templateId: string, data: Partial<IInterviewTemplateShared>) =>
    apiFetch(`${MODULE_URL}/templates/${templateId}`, { method: 'PUT', body: JSON.stringify(data) }),

  publish: (templateId: string) =>
    apiFetch(`${MODULE_URL}/templates/${templateId}/publish`, { method: 'POST' }),

  archive: (templateId: string) =>
    apiFetch(`${MODULE_URL}/templates/${templateId}/archive`, { method: 'POST' }),

  duplicate: (templateId: string) =>
    apiFetch(`${MODULE_URL}/templates/${templateId}/duplicate`, { method: 'POST' }),
};

// ─── Question Bank API ───────────────────────────────────────────────────────

export const interviewQuestionBankApi = {
  create: (data: Partial<IInterviewQuestionShared>) =>
    apiFetch(`${MODULE_URL}/question-bank`, { method: 'POST', body: JSON.stringify(data) }),

  bulkCreate: (questions: Partial<IInterviewQuestionShared>[]) =>
    apiFetch(`${MODULE_URL}/question-bank/bulk`, { method: 'POST', body: JSON.stringify({ questions }) }),

  getAll: (params?: {
    interviewCategory?: string; questionType?: string; topic?: string;
    difficulty?: string; roleTarget?: string; experienceLevel?: string;
    tags?: string; isActive?: boolean; search?: string;
    page?: number; limit?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.interviewCategory) qs.append('interviewCategory', params.interviewCategory);
    if (params?.questionType) qs.append('questionType', params.questionType);
    if (params?.topic) qs.append('topic', params.topic);
    if (params?.difficulty) qs.append('difficulty', params.difficulty);
    if (params?.roleTarget) qs.append('roleTarget', params.roleTarget);
    if (params?.experienceLevel) qs.append('experienceLevel', params.experienceLevel);
    if (params?.tags) qs.append('tags', params.tags);
    if (params?.isActive !== undefined) qs.append('isActive', String(params.isActive));
    if (params?.search) qs.append('search', params.search);
    if (params?.page) qs.append('page', String(params.page));
    if (params?.limit) qs.append('limit', String(params.limit));
    const q = qs.toString();
    return apiFetch(`${MODULE_URL}/question-bank${q ? `?${q}` : ''}`);
  },

  getById: (questionId: string) =>
    apiFetch(`${MODULE_URL}/question-bank/${questionId}`),

  update: (questionId: string, data: Partial<IInterviewQuestionShared>) =>
    apiFetch(`${MODULE_URL}/question-bank/${questionId}`, { method: 'PUT', body: JSON.stringify(data) }),

  deactivate: (questionId: string) =>
    apiFetch(`${MODULE_URL}/question-bank/${questionId}/deactivate`, { method: 'POST' }),

  getTopics: (category?: string) => {
    const qs = category ? `?category=${category}` : '';
    return apiFetch(`${MODULE_URL}/question-bank/topics${qs}`);
  },

  getTags: () =>
    apiFetch(`${MODULE_URL}/question-bank/tags`),
};

// ─── Assignments API ─────────────────────────────────────────────────────────

export const interviewAssignmentApi = {
  push: (data: {
    templateId: string; studentIds: string[];
    pushReason?: string; pushNote?: string;
    dueDate?: string; expiresAt?: string; maxAttempts?: number;
  }) =>
    apiFetch(`${MODULE_URL}/assignments/push`, { method: 'POST', body: JSON.stringify(data) }),

  pushToBatch: (data: {
    templateId: string; batchIds: string[];
    pushReason?: string; pushNote?: string;
    dueDate?: string; expiresAt?: string; maxAttempts?: number;
  }) =>
    apiFetch(`${MODULE_URL}/assignments/push-batch`, { method: 'POST', body: JSON.stringify(data) }),

  pushToCourse: (data: {
    templateId: string; courseIds: string[];
    pushReason?: string; pushNote?: string;
    dueDate?: string; expiresAt?: string; maxAttempts?: number;
  }) =>
    apiFetch(`${MODULE_URL}/assignments/push-course`, { method: 'POST', body: JSON.stringify(data) }),

  getAll: (params?: {
    studentId?: string; templateId?: string; assignedBy?: string;
    status?: string; page?: number; limit?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.studentId) qs.append('studentId', params.studentId);
    if (params?.templateId) qs.append('templateId', params.templateId);
    if (params?.assignedBy) qs.append('assignedBy', params.assignedBy);
    if (params?.status) qs.append('status', params.status);
    if (params?.page) qs.append('page', String(params.page));
    if (params?.limit) qs.append('limit', String(params.limit));
    const q = qs.toString();
    return apiFetch(`${MODULE_URL}/assignments${q ? `?${q}` : ''}`);
  },

  cancel: (assignmentId: string) =>
    apiFetch(`${MODULE_URL}/assignments/${assignmentId}/cancel`, { method: 'POST' }),
};

// ─── Student API ─────────────────────────────────────────────────────────────

export const studentInterviewApi = {
  getAssignments: (status?: string) => {
    const qs = status ? `?status=${status}` : '';
    return apiFetch(`${MODULE_URL}/student/assignments${qs}`);
  },

  startAttempt: (templateId: string, assignmentId?: string) =>
    apiFetch(`${MODULE_URL}/student/attempts/start`, {
      method: 'POST',
      body: JSON.stringify({ templateId, assignmentId }),
    }),

  getAttempts: (params?: { templateId?: string; status?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.templateId) qs.append('templateId', params.templateId);
    if (params?.status) qs.append('status', params.status);
    if (params?.page) qs.append('page', String(params.page));
    if (params?.limit) qs.append('limit', String(params.limit));
    const q = qs.toString();
    return apiFetch(`${MODULE_URL}/student/attempts${q ? `?${q}` : ''}`);
  },

  getAttempt: (attemptId: string) =>
    apiFetch(`${MODULE_URL}/student/attempts/${attemptId}`),

  saveAnswer: (attemptId: string, data: {
    sectionIndex: number; questionIndex: number;
    answerText?: string; answerCode?: string;
    selectedMCQOption?: string; answerAudioUrl?: string;
    responseTimeSeconds?: number;
  }) =>
    apiFetch(`${MODULE_URL}/student/attempts/${attemptId}/answer`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  skipQuestion: (attemptId: string, sectionIndex: number, questionIndex: number) =>
    apiFetch(`${MODULE_URL}/student/attempts/${attemptId}/skip`, {
      method: 'POST',
      body: JSON.stringify({ sectionIndex, questionIndex }),
    }),

  completeSection: (attemptId: string, sectionIndex: number) =>
    apiFetch(`${MODULE_URL}/student/attempts/${attemptId}/complete-section`, {
      method: 'POST',
      body: JSON.stringify({ sectionIndex }),
    }),

  submitAttempt: (attemptId: string) =>
    apiFetch(`${MODULE_URL}/student/attempts/${attemptId}/submit`, { method: 'POST' }),

  getReport: (attemptId: string) =>
    apiFetch(`${MODULE_URL}/student/attempts/${attemptId}/report`),

  getAnalytics: () =>
    apiFetch(`${MODULE_URL}/student/analytics`),

  /** Upload a per-question audio/video recording */
  uploadAnswerRecording: async (
    attemptId: string,
    blob: Blob,
    sectionIndex: number,
    questionIndex: number,
    responseTimeSeconds?: number
  ) => {
    const formData = new FormData();
    const ext = blob.type.includes('video') ? '.webm' : '.webm';
    formData.append('recording', blob, `answer-${sectionIndex}-${questionIndex}${ext}`);
    formData.append('sectionIndex', String(sectionIndex));
    formData.append('questionIndex', String(questionIndex));
    if (responseTimeSeconds !== undefined) {
      formData.append('responseTimeSeconds', String(responseTimeSeconds));
    }
    const token = localStorage.getItem('token');
    const tenantId = localStorage.getItem('tenantId');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (tenantId) headers['X-Tenant-Id'] = tenantId;
    // Do NOT set Content-Type — browser sets multipart boundary automatically
    const response = await fetch(
      `${MODULE_URL}/student/attempts/${attemptId}/upload-answer`,
      { method: 'POST', headers, body: formData }
    );
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || `Upload failed: ${response.status}`);
    }
    return response.json();
  },
};

// ─── Admin Analytics & Evaluation API ────────────────────────────────────────

export const interviewAnalyticsApi = {
  getAdminAnalytics: () =>
    apiFetch(`${MODULE_URL}/analytics/admin`),

  evaluateAttempt: (attemptId: string, data: {
    evaluatorComments?: string;
    sectionOverrides?: Array<{ sectionIndex: number; totalScore?: number; passed?: boolean }>;
  }) =>
    apiFetch(`${MODULE_URL}/attempts/${attemptId}/evaluate`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  publishResult: (attemptId: string) =>
    apiFetch(`${MODULE_URL}/attempts/${attemptId}/publish`, { method: 'POST' }),

  getAttemptReport: (attemptId: string) =>
    apiFetch(`${MODULE_URL}/attempts/${attemptId}/report`),
};
