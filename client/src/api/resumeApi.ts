import axios from 'axios';

const API = axios.create({ baseURL: '/api/v1' });

API.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  if (tenantId) cfg.headers['X-Tenant-Id'] = tenantId;
  return cfg;
});

export type ResumeTemplate = 'classic' | 'modern' | 'minimal' | 'professional' | 'compact' | 'elegant' | 'mono' | 'timeline';

export interface ResumeDesign {
  fontFamily?: string;          // '' = template default
  scale?: number;               // 0.85 .. 1.2 (overall font size)
  accent?: string;              // hex colour
  lineHeight?: number;          // 1.3 .. 1.8
  align?: 'left' | 'center';    // header alignment
  showLinkUrls?: boolean;       // true = print full LinkedIn/GitHub URLs (student choice)
}

export const resumeApi = {
  getMy: () => API.get('/resume/my'),
  upload: (file: File) => {
    const fd = new FormData();
    fd.append('resume', file);
    return API.post('/resume/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  saveSections: (sections: any, template?: ResumeTemplate, design?: ResumeDesign) =>
    API.put('/resume/sections', { sections, template, design }),
  score: () => API.post('/resume/score'),
  improve: () => API.post('/resume/improve'),
  tailor: (jobDescription: string) => API.post('/resume/tailor', { jobDescription }),
  share: () => API.post('/resume/share'),
  getPublic: (token: string) => API.get(`/resume/public/${token}`),
  getAll: () => API.get('/resume/all'),
};

export interface ResumeContact {
  name: string; title: string; email: string; phone: string;
  linkedin: string; github: string; portfolio: string; location: string;
}
export interface ResumeExperience {
  company: string; role: string; from: string; to: string; current: boolean; bullets: string[];
}
export interface ResumeEducation {
  degree: string; college: string; university: string; year: string; cgpa: string;
}
export interface ResumeSkillGroup { category: string; items: string[] }
export interface ResumeProject { name: string; tech: string[]; description: string; link: string }
export interface ResumeCertification { name: string; issuer: string; year: string }

export interface ResumeSections {
  contact: ResumeContact;
  summary: string;
  experience: ResumeExperience[];
  education: ResumeEducation[];
  skills: ResumeSkillGroup[];
  projects: ResumeProject[];
  certifications: ResumeCertification[];
}

export interface ResumeScoreBreakdown {
  contact: number; summary: number; experience: number;
  education: number; skills: number; projects: number; ats: number;
}
export interface ResumeSuggestion { section: string; issue: string; fix: string }
export interface ResumeScore {
  total: number;
  breakdown: ResumeScoreBreakdown;
  suggestions: ResumeSuggestion[];
  atsWarnings: string[];
  keywordsFound: string[];
  keywordsMissing: string[];
}

export interface ResumeTailorResult {
  matchScore: number;
  jobTitle: string;
  matchedKeywords: string[];
  missingKeywords: string[];
  tailoredSummary: string;
  tailoredBullets: string[];
  suggestions: { area: string; fix: string }[];
}

export interface ResumeData {
  _id: string;
  mode: 'uploaded' | 'built';
  template?: ResumeTemplate;
  design?: ResumeDesign;
  sections: ResumeSections;
  score: ResumeScore | null;
  uploadedFileUrl?: string;
  shareToken?: string;
  version: number;
  scoredAt?: string;
  updatedAt: string;
}

export const emptySections = (): ResumeSections => ({
  contact: { name: '', title: '', email: '', phone: '', linkedin: '', github: '', portfolio: '', location: '' },
  summary: '',
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
});
