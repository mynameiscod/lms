import axios from 'axios';

const API = axios.create({ baseURL: '/api' });

API.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export const resumeApi = {
  getMy: () => API.get('/resume/my'),
  upload: (file: File) => {
    const fd = new FormData();
    fd.append('resume', file);
    return API.post('/resume/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  saveSections: (sections: any) => API.put('/resume/sections', { sections }),
  score: () => API.post('/resume/score'),
  getAll: () => API.get('/resume/all'),
};

export interface ResumeContact {
  name: string; email: string; phone: string;
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

export interface ResumeData {
  _id: string;
  mode: 'uploaded' | 'built';
  sections: ResumeSections;
  score: ResumeScore | null;
  uploadedFileUrl?: string;
  version: number;
  scoredAt?: string;
  updatedAt: string;
}

export const emptySections = (): ResumeSections => ({
  contact: { name: '', email: '', phone: '', linkedin: '', github: '', portfolio: '', location: '' },
  summary: '',
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
});
