import axios from 'axios';

const BASE = '/api/v1/concerns';
const authHeader = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return { ...(token && { Authorization: `Bearer ${token}` }), ...(tenantId && { 'X-Tenant-Id': tenantId }) };
};

export interface Concern {
  _id: string;
  studentName?: string;
  studentEmail?: string;
  studentId?: any;
  category: string;
  message: string;
  context?: { enrollmentId?: string; curriculumTitle?: string; dayNumber?: number; page?: string };
  status: 'open' | 'in_progress' | 'resolved';
  response?: string;
  respondedAt?: string;
  createdAt: string;
}

export const concernApi = {
  raise: async (body: { category?: string; message: string; context?: any }) => {
    const { data } = await axios.post(BASE, body, { headers: authHeader() });
    return data;
  },
  mine: async (): Promise<Concern[]> => {
    const { data } = await axios.get(`${BASE}/my`, { headers: authHeader() });
    return data.data || [];
  },
  list: async (status?: string): Promise<{ data: Concern[]; openCount: number }> => {
    const { data } = await axios.get(BASE + (status ? `?status=${status}` : ''), { headers: authHeader() });
    return { data: data.data || [], openCount: data.openCount || 0 };
  },
  respond: async (id: string, body: { response?: string; status?: string }) => {
    const { data } = await axios.patch(`${BASE}/${id}`, body, { headers: authHeader() });
    return data;
  },
};
