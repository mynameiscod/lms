import axios from 'axios';

const BASE = '/api/v1/speaking';
const authHeader = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return { ...(token && { Authorization: `Bearer ${token}` }), ...(tenantId && { 'X-Tenant-Id': tenantId }) };
};

export interface SpeakingTask {
  _id: string; title: string; prompt: string; instructions?: string;
  batchIds?: string[]; days: string[]; startDate?: string; endDate?: string;
  minSeconds: number; maxSeconds: number; status: 'active' | 'archived'; submissionCount?: number;
}
export interface PendingTask {
  taskId: string; title: string; prompt: string; instructions?: string;
  dueDate: string; overdue: boolean; minSeconds: number; maxSeconds: number;
}
export interface SpeakingScore { overall: number; fluency: number; clarity: number; structure: number; confidence: number; vocabulary: number; }
export interface SpeakingSubmission {
  _id: string; taskId: string; taskTitle?: string; dueDate: string; durationSec: number;
  transcript?: string; score?: SpeakingScore; feedback?: { summary: string; strengths: string[]; improvements: string[] };
  status: string; createdAt: string; student?: { name: string; email: string }; studentName?: string;
}

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const speakingApi = {
  // Student
  myTasks: async (): Promise<{ pending: PendingTask[]; pendingCount: number }> => (await axios.get(`${BASE}/my-tasks`, { headers: authHeader() })).data,
  mySubmissions: async (): Promise<SpeakingSubmission[]> => (await axios.get(`${BASE}/my-submissions`, { headers: authHeader() })).data.submissions || [],
  submit: async (taskId: string, dueDate: string, blob: Blob): Promise<SpeakingSubmission> => {
    const fd = new FormData();
    fd.append('taskId', taskId); fd.append('dueDate', dueDate);
    fd.append('recording', blob, 'recording.webm');
    const { data } = await axios.post(`${BASE}/submit`, fd, { headers: { ...authHeader(), 'Content-Type': 'multipart/form-data' }, timeout: 300000 });
    return data.submission;
  },
  // Admin
  listTasks: async (): Promise<SpeakingTask[]> => (await axios.get(`${BASE}/admin/tasks`, { headers: authHeader() })).data.tasks || [],
  createTask: async (body: any): Promise<SpeakingTask> => (await axios.post(`${BASE}/admin/tasks`, body, { headers: authHeader() })).data.task,
  updateTask: async (id: string, patch: any): Promise<SpeakingTask> => (await axios.patch(`${BASE}/admin/tasks/${id}`, patch, { headers: authHeader() })).data.task,
  deleteTask: async (id: string) => { await axios.delete(`${BASE}/admin/tasks/${id}`, { headers: authHeader() }); },
  listSubmissions: async (taskId?: string): Promise<SpeakingSubmission[]> => (await axios.get(`${BASE}/admin/submissions${taskId ? `?taskId=${taskId}` : ''}`, { headers: authHeader() })).data.submissions || [],
  // Playback (auth-gated stream → blob URL)
  playUrl: async (submissionId: string): Promise<string> => {
    const res = await fetch(`${BASE}/play/${submissionId}`, { headers: authHeader() as any });
    if (!res.ok) throw new Error('Could not load recording');
    return URL.createObjectURL(await res.blob());
  },
};
