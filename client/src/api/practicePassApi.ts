import axios from 'axios';

const BASE = '/api/v1/practice-pass';
const authHeader = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return { ...(token && { Authorization: `Bearer ${token}` }), ...(tenantId && { 'X-Tenant-Id': tenantId }) };
};
const h = () => ({ headers: authHeader() });
const d = (r: any) => r.data.data;

export type PracticeTask = 'communication' | 'coding_problem' | 'assignment' | 'thinking_lab';
export type TaskCounts = Partial<Record<PracticeTask, number>>;

export interface Standing {
  studentId: string; batchId: string; pct: number; metDays: number; countedDays: number; thresholdPct: number;
  streak: number; bestStreak?: number; todayMet: boolean; missedYesterday: boolean; onHold: boolean; holdSince?: string;
  exempt: boolean; enforced: boolean; updatedAt?: string;
}

export interface MyPractice {
  enabled: boolean;
  today?: string;
  todayExcused?: string | null;
  tasks?: { task: PracticeTask; label: string; link: string; required: number; done: number }[];
  standing?: Standing | null;
  policy?: { thresholdPct: number; windowDays: number; enforceFrom: string; enforce: boolean; exempt: boolean };
  graceDaysLeft?: number;
  daysToRecover?: number;
  calendar?: { date: string; met: boolean; excused: string | null; done: TaskCounts; required: TaskCounts }[];
}

export interface Policy {
  _id?: string; scope: 'tenant' | 'batch' | 'student'; targetId: string; targetName: string;
  requirements?: TaskCounts; thresholdPct?: number; windowDays?: number; enforce?: boolean; exempt?: boolean;
  startDate?: string; enforceFrom?: string; remindersEnabled?: boolean; note?: string;
}
export interface Effective { enabled: boolean; requirements: Required<TaskCounts>; thresholdPct: number; windowDays: number; enforce: boolean; exempt: boolean; startDate: string; enforceFrom: string; remindersEnabled: boolean }

export interface Overview {
  enabled: boolean;
  tenant: Partial<Policy> & { effective: Effective };
  batches: { _id: string; name: string; isActive: boolean; policy: Policy | null; effective: Effective }[];
  students: Policy[];
  tasks: { key: PracticeTask; label: string }[];
}

export interface StandingRow extends Standing { name: string; email: string; phone?: string; batchName: string }

export type ReminderAudience = 'pending_today' | 'missed_yesterday' | 'at_risk' | 'on_hold' | 'selected';
export type ReminderChannel = 'email' | 'whatsapp';
export interface ReminderPreview {
  recipients: number; withPhone: number; withEmail: number; whatsappTemplateReady: boolean;
  costPerMessageInr: number; estimatedCostInr: number; sample: { name: string; pct: number; left: string[] }[];
  started?: boolean;
}
export interface ReminderLog {
  _id: string; audience: string; batchId?: string; channels: string[]; total: number;
  whatsappSent: number; whatsappFailed: number; emailSent: number; emailFailed: number;
  estimatedCostInr: number; status: 'running' | 'done'; createdAt: string;
}

export const practicePassApi = {
  me: () => axios.get(`${BASE}/me`, h()).then(d) as Promise<MyPractice>,
  overview: () => axios.get(`${BASE}/admin/overview`, h()).then(d) as Promise<Overview>,
  enable: (graceDays: number) => axios.post(`${BASE}/admin/enable`, { graceDays }, h()).then(d) as Promise<{ startDate: string; enforceFrom: string }>,
  disable: () => axios.post(`${BASE}/admin/disable`, {}, h()).then(d),
  savePolicy: (p: any) => axios.put(`${BASE}/admin/policy`, p, h()).then(d),
  removeOverride: (scope: 'batch' | 'student', targetId: string) => axios.delete(`${BASE}/admin/policy/${scope}/${targetId}`, h()).then(d),
  standings: (params: { batchId?: string; filter?: string }) => axios.get(`${BASE}/admin/standings`, { ...h(), params }).then(d) as Promise<{
    rows: StandingRow[]; summary: { students: number; onHold: number; doneToday: number; missedYesterday: number; avgPct: number };
  }>,
  recompute: () => axios.post(`${BASE}/admin/recompute`, {}, h()).then(d) as Promise<{ students: number }>,
  remind: (body: { audience: ReminderAudience; batchId?: string; studentIds?: string[]; channels: ReminderChannel[]; dryRun?: boolean }) =>
    axios.post(`${BASE}/admin/remind`, body, h()).then(d) as Promise<ReminderPreview>,
  reminders: () => axios.get(`${BASE}/admin/reminders`, h()).then(d) as Promise<ReminderLog[]>,
  student: (id: string) => axios.get(`${BASE}/admin/students/${id}`, h()).then(d) as Promise<{ standing: Standing | null; days: { date: string; met: boolean; excused?: string; done: TaskCounts; required: TaskCounts }[] }>,
};
