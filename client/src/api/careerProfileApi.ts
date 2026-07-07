import axios from 'axios';

const API = axios.create({ baseURL: '/api/v1' });

API.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  if (tenantId) cfg.headers['X-Tenant-Id'] = tenantId;
  return cfg;
});

export interface CareerIssue { area: string; problem: string; fix: string; severity?: 'high' | 'medium' | 'low'; }
export interface GithubCheck { label: string; status: 'pass' | 'warn' | 'fail'; hint: string; }
export interface PillarReview { score: number; issues: CareerIssue[]; improved: any; checklist?: GithubCheck[]; reviewedAt?: string; }

export interface CareerProfile {
  _id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  batchName?: string;
  targetRole: string;
  githubUrl: string;
  githubUsername: string;
  linkedinUrl: string;
  linkedinPasted: string;
  resume: PillarReview;
  github: PillarReview;
  linkedin: PillarReview;
  status: 'draft' | 'submitted' | 'in_review' | 'reviewed' | 'completed';
  reviewerNotes: string;
  reviewedAt?: string;
  lastReviewRunAt?: string;
  updatedAt?: string;
}

export type Pillar = 'resume' | 'github' | 'linkedin';

export const careerProfileApi = {
  // Student
  getMy: () => API.get('/career-profile/my'),
  updateMy: (data: Partial<Pick<CareerProfile, 'targetRole' | 'githubUrl' | 'linkedinUrl' | 'linkedinPasted'>>) =>
    API.put('/career-profile/my', data),
  runReview: () => API.post('/career-profile/my/review'),
  regenerateMySection: (pillar: Pillar, section: string) =>
    API.post(`/career-profile/my/pillar/${pillar}/section/${encodeURIComponent(section)}/regenerate`),

  // Admin / trainer
  list: (params?: { status?: string; batchId?: string; search?: string }) =>
    API.get('/career-profile', { params }),
  getById: (id: string) => API.get(`/career-profile/${id}`),
  updateReview: (id: string, data: { status?: string; reviewerNotes?: string }) =>
    API.patch(`/career-profile/${id}/review`, data),
  updatePillar: (id: string, pillar: Pillar, improved: any) =>
    API.patch(`/career-profile/${id}/pillar/${pillar}`, { improved }),
  regeneratePillar: (id: string, pillar: Pillar) =>
    API.post(`/career-profile/${id}/pillar/${pillar}/regenerate`),
  regenerateSection: (id: string, pillar: Pillar, section: string) =>
    API.post(`/career-profile/${id}/pillar/${pillar}/section/${encodeURIComponent(section)}/regenerate`),
};
