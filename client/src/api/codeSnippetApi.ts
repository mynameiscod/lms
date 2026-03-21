import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api/v1';

const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (tenantId) config.headers['X-Tenant-Id'] = tenantId;
  return config;
});

export const codeSnippetApi = {
  // Admin
  list: (params?: Record<string, string>) =>
    api.get('/code-snippets', { params }),
  getById: (id: string) =>
    api.get(`/code-snippets/${id}`),
  create: (data: any) =>
    api.post('/code-snippets', data),
  update: (id: string, data: any) =>
    api.put(`/code-snippets/${id}`, data),
  delete: (id: string) =>
    api.delete(`/code-snippets/${id}`),
  publish: (id: string) =>
    api.post(`/code-snippets/${id}/publish`),

  // Instructor grading
  getSubmissions: (assessmentId: string) =>
    api.get(`/code-snippets/${assessmentId}/submissions`),
  grade: (submissionId: string, data: { grades: any[]; overallFeedback?: string }) =>
    api.post(`/code-snippets/submissions/${submissionId}/grade`, data),

  // Student
  getStudentAssessments: () =>
    api.get('/code-snippets/student/list'),
  submit: (assessmentId: string, answers: any[]) =>
    api.post(`/code-snippets/${assessmentId}/submit`, { answers }),
  getMySubmission: (assessmentId: string) =>
    api.get(`/code-snippets/${assessmentId}/my-submission`),
};
