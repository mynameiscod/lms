import { authenticatedFetch, API_BASE_URL } from './index';

export type LearningRequestType = 'notes' | 'interview_qs' | 'practice' | '1on1' | 'clarification';
export type LearningRequestStatus = 'pending' | 'in_progress' | 'fulfilled' | 'scheduled';

export interface LearningRequest {
  _id: string;
  studentId: { _id: string; firstName: string; lastName: string; email: string } | string;
  topicId?: { _id: string; title: string } | string;
  subjectId?: { _id: string; name: string } | string;
  type: LearningRequestType;
  message: string;
  topicTitle?: string;
  subjectName?: string;
  status: LearningRequestStatus;
  adminNote?: string;
  scheduledAt?: string;
  fulfilledAt?: string;
  createdAt: string;
}

export const learningRequestApi = {
  // Student: create request
  create: (data: {
    type: LearningRequestType;
    message: string;
    topicId?: string;
    chapterId?: string;
    subjectId?: string;
    courseId?: string;
    batchId?: string;
    topicTitle?: string;
    subjectName?: string;
  }) =>
    authenticatedFetch(`${API_BASE_URL}/learning-requests`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Student: list own requests
  getMy: () =>
    authenticatedFetch(`${API_BASE_URL}/learning-requests/my`),

  // Student: cancel pending request
  cancel: (id: string) =>
    authenticatedFetch(`${API_BASE_URL}/learning-requests/${id}`, { method: 'DELETE' }),

  // Admin: list all requests
  list: (filters?: { status?: string; type?: string; studentId?: string; topicId?: string; page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (filters?.status)    params.append('status',    filters.status);
    if (filters?.type)      params.append('type',      filters.type);
    if (filters?.studentId) params.append('studentId', filters.studentId);
    if (filters?.topicId)   params.append('topicId',   filters.topicId);
    if (filters?.page)      params.append('page',      String(filters.page));
    if (filters?.limit)     params.append('limit',     String(filters.limit));
    const qs = params.toString();
    return authenticatedFetch(`${API_BASE_URL}/learning-requests${qs ? `?${qs}` : ''}`);
  },

  // Admin: update request status / add note
  update: (id: string, data: { status?: LearningRequestStatus; adminNote?: string; scheduledAt?: string }) =>
    authenticatedFetch(`${API_BASE_URL}/learning-requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  // Admin: stats
  getStats: () =>
    authenticatedFetch(`${API_BASE_URL}/learning-requests/stats`)
};
