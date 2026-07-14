import axios from 'axios';

const API = axios.create({ baseURL: '/api/v1' });
API.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  if (tenantId) cfg.headers['X-Tenant-Id'] = tenantId;
  return cfg;
});

export interface ProofProfile {
  student: { name: string; firstName: string; avatar?: string; city?: string; targetRole?: string; batch?: string; tagline?: string };
  assessment?: { readiness?: number; percentile?: number; careerReadiness?: number; targetRole?: string; salaryBand?: string; subScores: { dimension: string; percentage: number }[] };
  interview?: { score?: number; percentage?: number; readinessLevel?: string; strengths: string[]; weaknesses: string[] };
  communication?: { score?: number; readinessLevel?: string; currentStreak?: number; longestStreak?: number };
  career?: { resumeScore?: number; githubScore?: number; linkedinScore?: number; githubUrl?: string; linkedinUrl?: string };
  projects: { title: string; techStack?: string[]; githubUrl?: string }[];
  resume?: { score?: number; url?: string };
  certificates: { title: string; type?: string; verifyCode?: string }[];
  skills: string[];
  generatedAt: string;
}
export interface ProofContact { via: string; email: string }
export interface AdminProofData { published: boolean; shareToken: string | null; url: string | null; views: number; profile: ProofProfile }

export const candidateProofApi = {
  get: (studentId: string) => API.get<{ data: AdminProofData }>(`/candidate-proof/${studentId}`),
  publish: (studentId: string) => API.post<{ data: { shareToken: string; url: string } }>(`/candidate-proof/${studentId}/publish`),
  unpublish: (studentId: string) => API.post(`/candidate-proof/${studentId}/unpublish`),
  getPublic: (token: string) => API.get<{ data: { profile: ProofProfile; contact: ProofContact } }>(`/public/proof/${token}`),
};
