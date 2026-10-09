import axios from 'axios';

const BASE = '/api/v1/outpero';
const authHeader = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return { ...(token && { Authorization: `Bearer ${token}` }), ...(tenantId && { 'X-Tenant-Id': tenantId }) };
};
const h = () => ({ headers: authHeader() });
const d = (r: any) => r.data?.data;

export type OutperoMode = 'off' | 'manual' | 'auto';

export interface OutperoConfig {
  mode: OutperoMode;
  endpointUrl: string;
  secretSet: boolean;
  sources: string[];
  courses: string[];
  perMinute: number;
}

export interface LeadFilterOptions {
  stages: { _id: string; name: string; count: number }[];
  sources: { source: string; count: number }[];
}

export interface BulkFilter { stageIds: string[]; sources: string[]; courses: string[]; includeAlreadySent: boolean }

export interface OutperoStats {
  counts: { pending: number; sent: number; failed: number };
  sentToday: number;
  failures: { _id: string; name: string; phone: string; error?: string; at: string }[];
}

export const outperoErr = (e: any, fallback = 'Something went wrong') => e?.response?.data?.message || e?.message || fallback;

export const outperoApi = {
  config: () => axios.get(`${BASE}/config`, h()).then(d) as Promise<{ config: OutperoConfig; options: LeadFilterOptions }>,
  save: (c: Partial<OutperoConfig> & { secret?: string }) => axios.put(`${BASE}/config`, c, h()).then(d) as Promise<OutperoConfig>,
  stats: () => axios.get(`${BASE}/stats`, h()).then(d) as Promise<OutperoStats>,
  test: (name: string, phone: string) => axios.post(`${BASE}/test`, { name, phone }, h()).then(d) as Promise<{ ok: boolean; status: number; message: string }>,
  preview: (f: BulkFilter) => axios.post(`${BASE}/bulk/preview`, f, h()).then(d) as Promise<{ total: number; alreadySent: number; sample: string[]; etaMinutes: number; perMinute: number }>,
  bulk: (f: BulkFilter) => axios.post(`${BASE}/bulk`, f, h()).then(d) as Promise<{ queued: number; etaMinutes: number }>,
  cancelPending: () => axios.post(`${BASE}/cancel-pending`, {}, h()).then(d) as Promise<{ cancelled: number }>,
  retryFailed: () => axios.post(`${BASE}/retry-failed`, {}, h()).then(d) as Promise<{ requeued: number }>,
  webhook: () => axios.get(`${BASE}/webhook`, h()).then(d) as Promise<{ url: string }>,
  rotateWebhook: () => axios.post(`${BASE}/webhook/rotate`, {}, h()).then(d) as Promise<{ url: string }>,
  calls: () => axios.get(`${BASE}/calls`, h()).then(d) as Promise<OutperoCalls>,
  latestRaw: () => axios.get(`${BASE}/calls/latest-raw`, h()).then(d) as Promise<{ callId: string; delivery: { at: string; body: unknown } | null } | null>,
};

export interface OutperoCalls {
  total: number;
  unmatched: number;
  rows: {
    callId: string; lead: { _id: string; name: string; phone: string } | null; matchedBy: string | null; phone?: string;
    status?: string; outcome?: string; durationSec?: number; actions: string[]; deliveries: number; at: string; variableKeys: string[];
  }[];
}
