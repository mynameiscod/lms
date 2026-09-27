import axios from 'axios';

const BASE = '/api/v1/interview-hub';
const authHeader = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return { ...(token && { Authorization: `Bearer ${token}` }), ...(tenantId && { 'X-Tenant-Id': tenantId }) };
};
const h = () => ({ headers: authHeader() });
const d = (r: any) => r.data.data;

export type Outcome = 'offer' | 'rejected' | 'waiting' | 'withdrew';
export type ExpStatus = 'draft' | 'pending' | 'published' | 'rejected';

export interface HubQuestion { text: string; category?: string; answerHint?: string }
export interface HubRound {
  key: string; name: string; label?: string; mode?: string; durationMins?: number;
  questions: HubQuestion[]; cleared?: boolean; notes?: string;
}

export interface ExpCard {
  id: string; companyName: string; companySlug: string; role: string; interviewedOn: string;
  outcome: Outcome; difficultyFelt: string; rounds: string[]; questionCount: number;
  captureMode: 'text' | 'audio' | 'video'; hasRecording: boolean; tips: string; by: string;
  otherInstitute: boolean; publishedAt?: string;
  status?: ExpStatus; reviewNote?: string;
}

export interface ExpFull extends Omit<ExpCard, 'rounds'> {
  rounds: HubRound[]; roundsFaced: string[]; durationDays: number | null; rating: number | null;
  review: string; eliminationSummary: string; transcript: string;
  recording: { contentType: string; durationSec: number } | null;
  anonymous?: boolean; shareGlobal?: boolean; shareRecording?: boolean; aiStructured?: boolean;
  inviteId?: string; promotedQuestionIds?: string[];
  student?: { id: string; name: string; email: string };
}

export interface CompanyView {
  company: { slug: string; name: string };
  reports: number; avgRounds?: number | null; lastInterviewedOn?: string;
  outcomes: Record<string, number>;
  roundPattern: { key: string; name: string; seenIn: number; avgPosition: number }[];
  mostAsked: { text: string; round: string; category: string; count: number; lastAsked: string; experienceIds: string[] }[];
  experiences: ExpCard[];
}

export interface InviteRow {
  id: string; student: string; userId: string; companyName: string; role: string; interviewedOn: string | null;
  status: 'sent' | 'submitted' | 'cancelled'; channels: string[]; emailSent: boolean; whatsappSent: boolean;
  remindedAt: string | null; overdue: boolean; experienceId: string; createdAt: string;
}

export interface InvitePreview {
  matched: number; recipients: number; alreadyInvited: number; alreadyPosted: number;
  withEmail: number; withPhone: number; whatsappTemplateReady: boolean; costPerMessageInr: number;
  estimatedCostInr: number; companyName: string; sample: string[]; created?: number;
}

export const interviewHubApi = {
  feed: (params: { company?: string; q?: string; outcome?: string; round?: string; page?: number }) =>
    axios.get(`${BASE}/feed`, { ...h(), params }).then(d) as Promise<{ total: number; page: number; items: ExpCard[]; companies: { slug: string; name: string; count: number; offers: number; lastInterviewedOn: string }[] }>,
  company: (slug: string) => axios.get(`${BASE}/companies/${encodeURIComponent(slug)}`, h()).then(d) as Promise<CompanyView>,
  experience: (id: string) => axios.get(`${BASE}/experiences/${id}`, h()).then(d) as Promise<ExpFull>,
  /** Recordings need the auth header, so they are fetched as a blob and played from an object URL. */
  mediaUrl: async (id: string) => {
    const r = await axios.get(`${BASE}/experiences/${id}/media`, { ...h(), responseType: 'blob' });
    return URL.createObjectURL(r.data);
  },

  mine: () => axios.get(`${BASE}/mine`, h()).then(d) as Promise<{ experiences: ExpCard[]; invites: { id: string; companyName: string; role: string; interviewedOn: string | null; message: string; createdAt: string }[] }>,
  getMine: (id: string) => axios.get(`${BASE}/mine/${id}`, h()).then(d) as Promise<ExpFull>,
  invite: (id: string) => axios.get(`${BASE}/invites/${id}`, h()).then(d) as Promise<{ id: string; companyName: string; role: string; interviewedOn: string | null; message: string; status: string; experienceId: string }>,
  createDraft: (form: FormData, onProgress?: (pct: number) => void) =>
    axios.post(`${BASE}/drafts`, form, {
      headers: authHeader(), timeout: 10 * 60_000,
      onUploadProgress: (e) => { if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100)); },
    }).then(d) as Promise<{ experience: ExpFull; transcribed: boolean; aiStructured: boolean; aiError: string }>,
  updateMine: (id: string, body: any) => axios.put(`${BASE}/mine/${id}`, body, h()).then(d) as Promise<ExpFull>,
  deleteMine: (id: string) => axios.delete(`${BASE}/mine/${id}`, h()).then(d),

  admin: {
    list: (params: { status?: string; q?: string }) => axios.get(`${BASE}/admin/experiences`, { ...h(), params }).then(d) as Promise<{ counts: Record<string, number>; items: (ExpCard & { student: string; email: string; hasMedia: boolean; fromInvite: boolean; submittedAt: string })[] }>,
    moderate: (id: string, body: any) => axios.put(`${BASE}/admin/experiences/${id}`, body, h()).then(d) as Promise<ExpFull>,
    remove: (id: string) => axios.delete(`${BASE}/admin/experiences/${id}`, h()).then(d),
    promote: (id: string, picks: { round: number; question: number }[]) => axios.post(`${BASE}/admin/experiences/${id}/promote`, { picks }, h()).then(d) as Promise<{ added: number; companySlug: string }>,
    sources: () => axios.get(`${BASE}/admin/sources`, h()).then(d) as Promise<{ batches: { id: string; name: string }[]; drives: { id: string; companyName: string; role: string; driveDate: string | null; status: string; applicants: number }[] }>,
    invite: (body: any) => axios.post(`${BASE}/admin/invites`, body, h()).then(d) as Promise<InvitePreview>,
    invites: (status?: string) => axios.get(`${BASE}/admin/invites`, { ...h(), params: { status } }).then(d) as Promise<{ counts: Record<string, number>; items: InviteRow[] }>,
    remind: (id: string, channels: string[]) => axios.post(`${BASE}/admin/invites/${id}/remind`, { channels }, h()).then(d) as Promise<{ email?: boolean; whatsapp?: boolean; whatsappError?: string }>,
    cancel: (id: string) => axios.post(`${BASE}/admin/invites/${id}/cancel`, {}, h()).then(d),
  },
};

export const OUTCOME_LABEL: Record<string, [string, string]> = {
  offer: ['pb-badge-ok', 'Got the offer'], rejected: ['pb-badge-bad', 'Not selected'],
  waiting: ['pb-badge-warn', 'Awaiting result'], withdrew: ['pb-badge-neutral', 'Withdrew'],
};

export const ROUND_OPTIONS: { key: string; label: string }[] = [
  { key: 'online_test', label: 'Online Test' }, { key: 'aptitude', label: 'Aptitude' }, { key: 'coding', label: 'Coding Round' },
  { key: 'technical', label: 'Technical Interview' }, { key: 'gd', label: 'Group Discussion' }, { key: 'system_design', label: 'System Design' },
  { key: 'managerial', label: 'Managerial' }, { key: 'hr', label: 'HR Round' }, { key: 'other', label: 'Other' },
];

export const CATEGORY_OPTIONS: { key: string; label: string }[] = [
  { key: '', label: 'Topic…' }, { key: 'dsa', label: 'DSA' }, { key: 'oops', label: 'OOPs' }, { key: 'dbms', label: 'DBMS / SQL' },
  { key: 'os', label: 'OS' }, { key: 'networks', label: 'Networks' }, { key: 'java', label: 'Java' }, { key: 'python', label: 'Python' },
  { key: 'web', label: 'Web' }, { key: 'projects', label: 'Projects' }, { key: 'behavioural', label: 'Behavioural' },
  { key: 'quantitative', label: 'Aptitude' }, { key: 'other', label: 'Other' },
];
