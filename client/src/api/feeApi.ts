import axios from 'axios';

const API = axios.create({ baseURL: process.env.REACT_APP_API_URL || '/api/v1' });

API.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  if (tenantId) cfg.headers['X-Tenant-Id'] = tenantId;
  return cfg;
});

export interface Installment {
  label?: string;
  amount: number;
  dueDate?: string | null;
  status: 'pending' | 'paid';
  paidDate?: string | null;
}

export interface FeeRow {
  studentId: string;
  name: string;
  email: string;
  batchId: string | null;
  batchName: string;
  totalAmount: number;
  registrationFee: number;
  studyMaterials: number;
  otherCharges: number;
  discount: number;
  discountReason: string;
  paidAmount: number;
  dueAmount: number;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  hasFee: boolean;
  dueDate: string | null;
  followupDate: string | null;
  installments: Installment[];
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
  upsert: (studentId: string, data: {
    totalAmount?: number;
    dueDate?: string;
    discount?: number;
    discountReason?: string;
    followupDate?: string;
    installments?: Installment[];
    registrationFee?: number;
    studyMaterials?: number;
    otherCharges?: number;
  }) =>
    API.put(`/fees/${studentId}`, data),
  recordPayment: (studentId: string, data: PaymentInput) =>
    API.post(`/fees/${studentId}/payments`, data),
  deletePayment: (studentId: string, paymentId: string) =>
    API.delete(`/fees/${studentId}/payments/${paymentId}`),
  getReceipt: (studentId: string, email = false) =>
    API.get<{ success: boolean; data: { html: string } }>(`/fees/${studentId}/receipt`, { params: email ? { email: true } : {} }),
  getMyReceipt: (email = false) =>
    API.get<{ success: boolean; data: { html: string } }>(`/fees/me/receipt`, { params: email ? { email: true } : {} }),
  remind: (studentId: string) => API.post(`/fees/${studentId}/remind`),
  remindBulk: (batch?: string) => API.post('/fees/remind-bulk', batch ? { batch } : {}),
  getReceiptSettings: () => API.get<{ success: boolean; data: { saved: ReceiptSettings; resolved: any } }>('/fees/receipt-settings'),
  updateReceiptSettings: (data: ReceiptSettings) =>
    API.put<{ success: boolean; data: { saved: ReceiptSettings; resolved: any } }>('/fees/receipt-settings', data),
};

export interface ReceiptSettings {
  instituteName?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  signatureUrl?: string;
  authorizedSignatory?: string;
  tagline?: string;
  receiptPrefix?: string;
  defaultMode?: string;
  defaultMentor?: string;
  upiId?: string;
  qrUrl?: string;
  showQr?: boolean;
  notes?: string[] | string;
  socials?: { label: string; url: string }[] | string;
}

export default feeApi;
