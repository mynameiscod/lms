import axios from 'axios';

const BASE = '/api/v1/project-studio';
const authHeader = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return { ...(token && { Authorization: `Bearer ${token}` }), ...(tenantId && { 'X-Tenant-Id': tenantId }) };
};
const h = () => ({ headers: authHeader() });
const d = (r: any) => r.data.data;

export type ProofType = 'commit' | 'pr' | 'url' | 'text';
export type TaskStatus = 'submitted' | 'changes' | 'done';

export interface PQuestion { q: string; a: string }
export interface PTask {
  _id?: string; title: string; story: string; brief: string; acceptance: string[]; proofType: ProofType; weight: number;
  questions: PQuestion[]; questionCount?: number;
}
export interface PDay { _id?: string; title: string; tasks: PTask[] }
export interface PSprint { _id?: string; title: string; goal: string; days: PDay[] }
export interface PTemplate {
  _id?: string; title: string; summary: string; domain: string; techStack: string[];
  level: 'beginner' | 'intermediate' | 'advanced'; status?: 'draft' | 'published' | 'archived';
  releasedBatchIds?: string[]; reviewMode?: 'mentor' | 'auto'; sprints: PSprint[]; updatedAt?: string;
}
export interface TemplateRow {
  _id: string; title: string; domain: string; techStack: string[]; level: string; status: string; reviewMode: string;
  releasedBatchIds: string[]; updatedAt: string; sprintCount: number; dayCount: number; taskCount: number;
  students: number; avgPct: number; completed: number;
}
export interface TaskState {
  taskId: string; status: TaskStatus; proofUrl?: string; note?: string; submittedAt?: string; reviewedAt?: string;
  reviewNote?: string; doneAt?: string; submissions: { at: string; proofUrl?: string; note?: string }[];
  selfCheck: { i: number; knew: boolean }[];
}
export interface Enrollment {
  _id: string; templateId: string; repoUrl?: string; tasks: TaskState[]; completionPct: number; doneWeight: number;
  totalWeight: number; startedAt: string; completedAt?: string; lastActivityAt: string;
}
export interface CatalogItem {
  _id: string; title: string; summary: string; domain: string; techStack: string[]; level: string;
  sprintCount: number; dayCount: number; taskCount: number; sprints: { title: string; goal: string; days: number }[];
}
export interface MyProjectData { enrollment: Enrollment | null; template?: PTemplate; catalog?: CatalogItem[] }
export interface ProgressRow {
  enrollmentId?: string; studentId: string; name: string; email: string; batch: string; project: string; templateId?: string;
  repoUrl?: string; completionPct: number; doneTasks?: number; totalTasks?: number; awaitingReview?: number;
  startedAt?: string; lastActivityAt?: string; completedAt?: string; notStarted?: boolean;
}
export interface ReviewItem {
  enrollmentId: string; taskId: string; studentId: string; name: string; project: string; task: string; where: string;
  proofType: ProofType; proofUrl?: string; note?: string; repoUrl?: string; submittedAt: string; attempts: number;
}

export interface StarterRow {
  key: string; title: string; domain: string; techStack: string[]; level: string;
  sprintCount: number; dayCount: number; taskCount: number; added: boolean;
}

export const projectStudioApi = {
  // Student
  me: async (): Promise<MyProjectData> => d(await axios.get(`${BASE}/me`, h())),
  pick: async (templateId: string) => d(await axios.post(`${BASE}/me/pick`, { templateId }, h())),
  setRepo: async (repoUrl: string): Promise<{ repoUrl: string }> => d(await axios.put(`${BASE}/me/repo`, { repoUrl }, h())),
  submit: async (taskId: string, body: { proofUrl?: string; note?: string }): Promise<{ status: TaskStatus; completionPct: number }> =>
    d(await axios.post(`${BASE}/me/tasks/${taskId}/submit`, body, h())),
  selfCheck: async (taskId: string, i: number, knew: boolean) => d(await axios.post(`${BASE}/me/tasks/${taskId}/self-check`, { i, knew }, h())),

  // Staff
  templates: async (): Promise<TemplateRow[]> => d(await axios.get(`${BASE}/admin/templates`, h())),
  template: async (id: string): Promise<PTemplate> => d(await axios.get(`${BASE}/admin/templates/${id}`, h())),
  create: async (body: Partial<PTemplate>): Promise<PTemplate> => d(await axios.post(`${BASE}/admin/templates`, body, h())),
  save: async (id: string, body: PTemplate): Promise<{ template: PTemplate; rescored: number }> => d(await axios.put(`${BASE}/admin/templates/${id}`, body, h())),
  duplicate: async (id: string): Promise<PTemplate> => d(await axios.post(`${BASE}/admin/templates/${id}/duplicate`, {}, h())),
  remove: async (id: string): Promise<{ deleted?: boolean; archived?: boolean; students?: number }> => d(await axios.delete(`${BASE}/admin/templates/${id}`, h())),
  starters: async (): Promise<StarterRow[]> => d(await axios.get(`${BASE}/admin/starters`, h())),
  installStarter: async (key: string): Promise<PTemplate> => d(await axios.post(`${BASE}/admin/starters/${key}/install`, {}, h())),
  batches: async (): Promise<{ _id: string; name: string }[]> => d(await axios.get(`${BASE}/admin/batches`, h())),
  progress: async (q: { batchId?: string; templateId?: string }): Promise<ProgressRow[]> => d(await axios.get(`${BASE}/admin/progress`, { ...h(), params: q })),
  reviewQueue: async (): Promise<ReviewItem[]> => d(await axios.get(`${BASE}/admin/review`, h())),
  enrollment: async (id: string): Promise<{ enrollment: Enrollment; template: PTemplate; student: { name: string; email: string } }> =>
    d(await axios.get(`${BASE}/admin/enrollments/${id}`, h())),
  review: async (enrollmentId: string, taskId: string, action: 'approve' | 'changes', note?: string) =>
    d(await axios.post(`${BASE}/admin/enrollments/${enrollmentId}/tasks/${taskId}/review`, { action, note }, h())),
  reset: async (enrollmentId: string, reason: string) => d(await axios.post(`${BASE}/admin/enrollments/${enrollmentId}/reset`, { reason }, h())),
};

export const errMsg = (e: any, fallback = 'Something went wrong') => e?.response?.data?.message || fallback;

export const PROOF_LABEL: Record<ProofType, string> = {
  commit: 'Commit link', pr: 'Pull request link', url: 'Link (deployed app, screenshot, video…)', text: 'Written explanation',
};
