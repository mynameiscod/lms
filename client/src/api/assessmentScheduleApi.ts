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

export type LatePolicy = 'open' | 'grace' | 'hard_lock';
export type AssessmentContentType = 'assignment' | 'quiz';

export interface AssessmentSchedule {
  _id: string;
  contentType: AssessmentContentType;
  contentId: string;
  contentTitle: string;
  batchId: string;
  batchName?: string;
  startAt?: string;
  dueAt?: string;
  latePolicy: LatePolicy;
  graceDays: number;
  penaltyPct: number;
  dueTime: string;
  source: 'standalone' | 'curriculum';
  status: 'draft' | 'active' | 'archived';
}

export interface BatchScheduleInput {
  batchId: string;
  batchName?: string;
  startAt?: string;
  dueAt?: string;
  latePolicy?: LatePolicy;
  graceDays?: number;
  penaltyPct?: number;
  dueTime?: string;
}

export const assessmentScheduleApi = {
  list: async (params: { contentType?: string; contentId?: string; batchId?: string }) => {
    const { data } = await api.get('/assessment-schedules', { params });
    return data.schedules as AssessmentSchedule[];
  },

  assign: async (payload: {
    contentType: AssessmentContentType;
    contentId: string;
    contentTitle?: string;
    policy?: Partial<Pick<BatchScheduleInput, 'latePolicy' | 'graceDays' | 'penaltyPct' | 'dueTime'>>;
    batches: BatchScheduleInput[];
  }) => {
    const { data } = await api.post('/assessment-schedules/assign', payload);
    return data as { message: string; schedules: AssessmentSchedule[] };
  },

  update: async (id: string, patch: Partial<BatchScheduleInput> & { status?: string }) => {
    const { data } = await api.patch(`/assessment-schedules/${id}`, patch);
    return data.schedule as AssessmentSchedule;
  },

  extend: async (payload: { ids?: string[]; contentType?: string; contentId?: string; batchId?: string; days: number }) => {
    const { data } = await api.post('/assessment-schedules/extend', payload);
    return data as { message: string; updated: number };
  },

  remove: async (id: string) => {
    const { data } = await api.delete(`/assessment-schedules/${id}`);
    return data;
  },
};

export default assessmentScheduleApi;
