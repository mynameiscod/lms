import axios from 'axios';

const BASE = '/api/v1/job-applications';
const authHeader = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return { ...(token && { Authorization: `Bearer ${token}` }), ...(tenantId && { 'X-Tenant-Id': tenantId }) };
};

export type JobStatus = 'wishlist' | 'applied' | 'interviewing' | 'offer' | 'rejected';

export interface JobApplication {
  _id?: string;
  company: string;
  role: string;
  location?: string;
  workMode?: 'onsite' | 'remote' | 'hybrid' | '';
  jobUrl?: string;
  salary?: string;
  source?: string;
  status: JobStatus;
  appliedAt?: string;
  contactName?: string;
  contactEmail?: string;
  nextAction?: string;
  nextActionAt?: string;
  notes?: string;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

export const jobApplicationApi = {
  list: async (): Promise<{ applications: JobApplication[]; stats: Record<string, number>; total: number }> => {
    const { data } = await axios.get(BASE, { headers: authHeader() });
    return data;
  },
  create: async (app: Partial<JobApplication>): Promise<JobApplication> => {
    const { data } = await axios.post(BASE, app, { headers: authHeader() });
    return data.application;
  },
  update: async (id: string, patch: Partial<JobApplication>): Promise<JobApplication> => {
    const { data } = await axios.patch(`${BASE}/${id}`, patch, { headers: authHeader() });
    return data.application;
  },
  move: async (id: string, status: JobStatus, order?: number): Promise<JobApplication> => {
    const { data } = await axios.patch(`${BASE}/${id}/move`, { status, order }, { headers: authHeader() });
    return data.application;
  },
  remove: async (id: string): Promise<void> => {
    await axios.delete(`${BASE}/${id}`, { headers: authHeader() });
  },
};

export const JOB_STATUSES: { key: JobStatus; label: string; color: string }[] = [
  { key: 'wishlist', label: 'Wishlist', color: '#6366f1' },
  { key: 'applied', label: 'Applied', color: '#0ea5a4' },
  { key: 'interviewing', label: 'Interviewing', color: '#f59e0b' },
  { key: 'offer', label: 'Offer', color: '#16a34a' },
  { key: 'rejected', label: 'Rejected', color: '#94a3b8' },
];
