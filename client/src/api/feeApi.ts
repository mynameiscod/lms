import axios from 'axios';

const API = axios.create({ baseURL: process.env.REACT_APP_API_URL || '/api/v1' });

API.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  if (tenantId) cfg.headers['X-Tenant-Id'] = tenantId;
  return cfg;
});

export interface FeeRow {
  studentId: string;
  name: string;
  email: string;
  batchId: string | null;
  batchName: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  hasFee: boolean;
  dueDate: string | null;
  lastPaymentDate: string | null;
  lastPaymentAmount: number | null;
}

export interface FeeSummary {
  students: number; totalBilled: number; totalCollected: number; totalDue: number;
  paid: number; partial: number; pending: number; overdue: number;
}

export interface PaymentInput {
  amount: number;
  paymentMethod?: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'other';
  transactionId?: string;
  remarks?: string;
  paymentDate?: string;
  totalAmount?: number;
}

export const feeApi = {
  list: (params?: { batch?: string; status?: string; search?: string }) =>
    API.get<{ success: boolean; data: FeeRow[]; summary: FeeSummary }>('/fees', { params }),
  analytics: () => API.get<{ success: boolean; data: any }>('/fees/analytics'),
  upsert: (studentId: string, data: { totalAmount?: number; dueDate?: string }) =>
    API.put(`/fees/${studentId}`, data),
  recordPayment: (studentId: string, data: PaymentInput) =>
    API.post(`/fees/${studentId}/payments`, data),
  deletePayment: (studentId: string, paymentId: string) =>
    API.delete(`/fees/${studentId}/payments/${paymentId}`),
  getReceipt: (studentId: string, email = false) =>
    API.get<{ success: boolean; data: { html: string } }>(`/fees/${studentId}/receipt`, { params: email ? { email: true } : {} }),
  remind: (studentId: string) => API.post(`/fees/${studentId}/remind`),
  remindBulk: (batch?: string) => API.post('/fees/remind-bulk', batch ? { batch } : {}),
};

export default feeApi;
