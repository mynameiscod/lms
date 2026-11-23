import axios from 'axios';

const BASE = '/api/v1/callyzer';
const authHeader = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return { ...(token && { Authorization: `Bearer ${token}` }), ...(tenantId && { 'X-Tenant-Id': tenantId }) };
};
const h = () => ({ headers: authHeader() });
const d = (r: any) => r.data?.data;

export type CallyzerEnv = 'sandbox' | 'production';

export interface CallyzerConfig {
  enabled: boolean;
  env: CallyzerEnv;
  apiKeySet: boolean;
  keepRecordings: boolean;
  storageReady: boolean;
}

export interface CallyzerSyncStatus { at: string; ok: boolean; message: string; received?: number; matched?: number; ignored?: number; running?: boolean }
export interface CallyzerDelivery { at: string; headerNames: string[]; employees: number; calls: number; matched: number }

export interface CallyzerEmployee {
  empName: string; empNumber: string; ten: string;
  recordingOn: boolean; appUninstalled: boolean;
  lastCallAt: string | null; lastSyncAt: string | null; appVersion: string | null;
  staffId: string | null; staffName: string | null; matchedBy: 'admin' | 'profile' | null;
}
export interface CallyzerStaff { _id: string; name: string; phone: string }

export interface CallyzerCallRow {
  _id: string;
  lead: { _id: string; name: string; phone: string } | null;
  counsellor: string;
  direction: 'outgoing' | 'incoming' | 'missed';
  durationSec: number;
  at: string;
  matchedBy: 'click' | 'new' | null;
  recording: 'saved' | 'callyzer' | 'waiting' | 'none';
  recordingError: string | null;
  recordingUrl: string | null;
}

export const callyzerErr = (e: any, fallback = 'Something went wrong') => e?.response?.data?.message || e?.message || fallback;

export const callyzerApi = {
  config: () => axios.get(`${BASE}/config`, h()).then(d) as Promise<{ config: CallyzerConfig; webhook: { url: string }; lastSync: CallyzerSyncStatus | null; lastDelivery: CallyzerDelivery | null }>,
  save: (c: { enabled: boolean; env: CallyzerEnv; keepRecordings: boolean; apiKey?: string }) => axios.put(`${BASE}/config`, c, h()).then(d) as Promise<CallyzerConfig>,
  test: () => axios.post(`${BASE}/test`, {}, h()).then(d) as Promise<{ ok: boolean; employees: number; env: CallyzerEnv }>,
  rotateWebhook: () => axios.post(`${BASE}/webhook/rotate`, {}, h()).then(d) as Promise<{ url: string }>,
  employees: () => axios.get(`${BASE}/employees`, h()).then(d) as Promise<{ employees: CallyzerEmployee[]; staff: CallyzerStaff[] }>,
  mapEmployee: (empNumber: string, staffId: string | null) => axios.put(`${BASE}/employees/${encodeURIComponent(empNumber)}`, { staffId }, h()).then(d),
  sync: (days?: number) => axios.post(`${BASE}/sync`, days ? { days } : {}, h()).then(d) as Promise<CallyzerSyncStatus | { started: boolean; days: number }>,
  calls: () => axios.get(`${BASE}/calls`, h()).then(d) as Promise<{ total: number; withRecording: number; rows: CallyzerCallRow[] }>,
};
