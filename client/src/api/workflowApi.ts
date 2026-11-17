import axios from 'axios';

/** Workflow Builder — server routes at /api/v1/workflows (server/src/routes/workflowRoutes.ts). */
const base = process.env.REACT_APP_API_URL || '/api/v1';
const api = axios.create({ baseURL: `${base}/workflows` });
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  if (tenantId) cfg.headers['X-Tenant-Id'] = tenantId;
  return cfg;
});
const data = <T,>(p: Promise<any>): Promise<T> => p.then(r => r.data.data).catch(e => {
  const err: any = new Error(e?.response?.data?.message || e.message);
  err.problems = e?.response?.data?.problems;
  throw err;
});

export type TriggerType = 'lead_created' | 'stage_changed' | 'message_received' | 'demo_booked' | 'demo_outcome' | 'call_result' | 'manual';
export type StepType =
  | 'send_message' | 'send_template' | 'send_media' | 'ask_question' | 'ai_reply'
  | 'wait' | 'wait_until' | 'paths'
  | 'update_lead' | 'assign' | 'follow_up' | 'notify' | 'handoff' | 'webhook' | 'stop';

export interface Condition { field: string; op: string; value?: any }
export interface Path { id: string; name: string; match: 'all' | 'any'; conditions: Condition[]; steps: Step[] }
export interface Step { id: string; type: StepType; config: Record<string, any>; paths?: Path[] }
export interface WfSettings {
  sendWindow: 'any' | 'office_hours'; allowReentry: boolean; cooldownMinutes: number;
  stopOnReply: boolean; runWhenHumanTakenOver: boolean; stopStageIds: string[];
}
export interface Problem { stepId?: string; message: string }
export interface Workflow {
  _id: string; name: string; description?: string; status: 'draft' | 'active' | 'paused';
  trigger: { type: TriggerType; config: Record<string, any> };
  steps: Step[]; settings: WfSettings;
  stats?: { started: number; completed: number; stopped: number; failed: number; lastRunAt?: string };
  liveRuns?: number; problems?: Problem[]; updatedAt?: string;
}
export interface WorkflowRow {
  _id: string; name: string; description?: string; status: Workflow['status']; trigger: Workflow['trigger'];
  stepCount: number; stats: NonNullable<Workflow['stats']>; liveRuns: number; updatedAt: string; activatedAt?: string;
}
export interface Options {
  stages: { _id: string; name: string; isActive: boolean }[];
  sources: string[];
  templates: { _id: string; name: string; language: string; category: string; status: string; body: string; variables: number; hasUrlButton: boolean }[];
  users: { _id: string; name: string; role: string }[];
  courses: string[];
}
export interface RunLog { at: string; stepId?: string; type?: string; ok: boolean; note: string }
export interface Run {
  _id: string; workflowId: string; workflowName: string;
  lead: { _id: string; name: string; phone: string } | null; phone?: string;
  status: 'running' | 'waiting' | 'completed' | 'stopped' | 'failed'; waitingFor?: 'time' | 'reply' | null; resumeAt?: string | null;
  currentStep: { id: string; number: string; type: StepType } | null;
  answers: Record<string, string>; test: boolean; log: RunLog[]; endReason?: string; createdAt: string; endedAt?: string;
}
export interface OfficeHours {
  timezone: string;
  days: Record<string, { open: boolean; start: string; end: string }>;
  holidays: { date: string; name?: string }[];
  openNow?: boolean; nextOpening?: string;
}

export const workflowApi = {
  list: () => data<WorkflowRow[]>(api.get('/')),
  get: (id: string) => data<Workflow>(api.get(`/${id}`)),
  create: (w: Partial<Workflow>) => data<Workflow>(api.post('/', w)),
  save: (id: string, w: Partial<Workflow>) => data<Workflow>(api.put(`/${id}`, w)),
  setStatus: (id: string, status: Workflow['status']) => data<{ status: string }>(api.post(`/${id}/status`, { status })),
  duplicate: (id: string) => data<{ _id: string }>(api.post(`/${id}/duplicate`)),
  remove: (id: string) => data<void>(api.delete(`/${id}`)),
  test: (id: string, leadId: string, message?: string) => data<{ runId: string; status: string; log: RunLog[] }>(api.post(`/${id}/test`, { leadId, message })),
  options: () => data<Options>(api.get('/options')),
  runs: (q: { workflowId?: string; status?: string; limit?: number } = {}) => data<Run[]>(api.get('/runs', { params: q })),
  stopRun: (runId: string) => data<void>(api.post(`/runs/${runId}/stop`)),
  continueRun: (runId: string) => data<void>(api.post(`/runs/${runId}/continue`)),
  settings: () => data<OfficeHours>(api.get('/settings')),
  saveSettings: (s: OfficeHours) => data<OfficeHours>(api.put('/settings', s)),
  findLeads: (q: string) => data<{ _id: string; name: string; phone: string; email?: string }[]>(api.get('/lookup/leads', { params: { q } })),
};
