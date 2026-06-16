import axios from 'axios';
import { DayContentItem } from './curriculumApi';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api/v1';
const BASE = `${API_BASE_URL}/batch-offerings`;

const authHeader = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  const h: Record<string, string> = {};
  if (token) h['Authorization'] = `Bearer ${token}`;
  if (tenantId) h['X-Tenant-Id'] = tenantId;
  return h;
};

export interface DayOverride {
  dayNumber: number;
  addedItems: DayContentItem[];
  removedItemIds: string[];
  note?: string;
}

export interface BatchOffering {
  _id: string;
  curriculumId: string;
  curriculumTitle: string;
  batchId: string;
  batchName: string;
  startDate: string;
  holidays: string[];
  dayOverrides: DayOverride[];
  status: 'draft' | 'active' | 'completed' | 'archived';
  createdAt: string;
}

export interface OfferingDay {
  dayNumber: number;
  date: string;
  items: DayContentItem[];
  override: DayOverride | null;
}

export const batchOfferingApi = {
  list: async (params: { curriculumId?: string; batchId?: string; status?: string } = {}): Promise<BatchOffering[]> => {
    const qs = new URLSearchParams(params as any).toString();
    const { data } = await axios.get(`${BASE}${qs ? `?${qs}` : ''}`, { headers: authHeader() });
    return data;
  },
  create: async (body: { curriculumId: string; batchId: string; startDate: string; holidays?: string[] }): Promise<BatchOffering> => {
    const { data } = await axios.post(BASE, body, { headers: authHeader() });
    return data;
  },
  get: async (id: string): Promise<BatchOffering> => {
    const { data } = await axios.get(`${BASE}/${id}`, { headers: authHeader() });
    return data;
  },
  update: async (id: string, body: { startDate?: string; holidays?: string[]; status?: string }): Promise<BatchOffering> => {
    const { data } = await axios.put(`${BASE}/${id}`, body, { headers: authHeader() });
    return data;
  },
  remove: async (id: string): Promise<void> => {
    await axios.delete(`${BASE}/${id}`, { headers: authHeader() });
  },
  getDay: async (id: string, day: number): Promise<OfferingDay> => {
    const { data } = await axios.get(`${BASE}/${id}/day/${day}`, { headers: authHeader() });
    return data;
  },
  saveDayOverride: async (id: string, day: number, body: { addedItems: DayContentItem[]; removedItemIds: string[]; note?: string }): Promise<BatchOffering> => {
    const { data } = await axios.put(`${BASE}/${id}/day/${day}`, body, { headers: authHeader() });
    return data;
  },
};
