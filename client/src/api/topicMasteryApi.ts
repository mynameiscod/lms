import { authenticatedFetch, API_BASE_URL } from './index';

export const topicMasteryApi = {
  // Admin: full heatmap for a subject
  getHeatmap: (subjectId: string, batchId?: string) => {
    const params = new URLSearchParams({ subjectId });
    if (batchId) params.append('batchId', batchId);
    return authenticatedFetch(`${API_BASE_URL}/topic-mastery/heatmap?${params}`);
  },

  // Admin: get subjects for filter dropdown
  getSubjects: () =>
    authenticatedFetch(`${API_BASE_URL}/topic-mastery/subjects`),

  // Admin: mastery breakdown for one student
  getStudentMastery: (studentId: string, courseId?: string) => {
    const params = new URLSearchParams();
    if (courseId) params.append('courseId', courseId);
    const qs = params.toString();
    return authenticatedFetch(`${API_BASE_URL}/topic-mastery/student/${studentId}${qs ? `?${qs}` : ''}`);
  },

  // Admin: all students' mastery for one topic
  getTopicBreakdown: (topicId: string, batchId?: string) => {
    const params = new URLSearchParams();
    if (batchId) params.append('batchId', batchId);
    const qs = params.toString();
    return authenticatedFetch(`${API_BASE_URL}/topic-mastery/topic/${topicId}${qs ? `?${qs}` : ''}`);
  },

  // Student: own mastery per topic
  getMyMastery: (courseId?: string) => {
    const params = new URLSearchParams();
    if (courseId) params.append('courseId', courseId);
    const qs = params.toString();
    return authenticatedFetch(`${API_BASE_URL}/topic-mastery/my${qs ? `?${qs}` : ''}`);
  }
};
