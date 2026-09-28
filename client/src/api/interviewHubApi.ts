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

export interface PrepPack {
  drive: { id: string; companyName: string; companySlug: string; role: string; driveDate: string | null; location: string; driveType: string; rounds: { name: string; date: string | null; venue: string }[]; description: string };
  reports: number; avgRounds: number | null; roundPattern: CompanyView['roundPattern']; outcomes: Record<string, number>;
  mostAsked: CompanyView['mostAsked'];
  voices: { tips: string; eliminated: string; interviewedOn: string; outcome: string; role: string }[];
  bankQuestions: { text: string; answer: string; round: string; category: string }[];
  predicted: { text: string; answer: string; round: string; category: string }[];
  preparingPredicted: boolean; codingSetId: string;
}

export interface HubConfig {
  prepPack: { enabled: boolean; onApply: boolean; daysBefore: number; channels: string[]; includePredicted: boolean };
  autoInvite: { enabled: boolean; daysAfter: number; channels: string[] };
  siteUrl?: string;
}

export interface AutomationDrive {
  id: string; companyName: string; role: string; driveDate: string | null; status: string; applicants: number;
  packsSent: number; packsOpened: number; openedBefore: number; invited: number; answered: number;
  skipPrep: boolean; skipInvite: boolean; packStatus: string; inviteStatus: string; codingSetId: string; waCostInr: number;
}

export interface HubInsights {
  days: number;
  posting: { invited: number; answered: number };
  speed: { published: number; medianHours: number | null; within48h: number };
  packs: { sent: number; opened: number; openedBefore: number };
  selection: { usedPack: { decided: number; selected: number }; didNot: { decided: number; selected: number } };
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

  prepList: () => axios.get(`${BASE}/prep`, h()).then(d) as Promise<{ driveId: string; companyName: string; role: string; driveDate: string | null; opened: boolean; upcoming: boolean }[]>,
  prep: (driveId: string) => axios.get(`${BASE}/prep/${driveId}`, h()).then(d) as Promise<PrepPack>,
  prepOpened: (driveId: string) => axios.post(`${BASE}/prep/${driveId}/open`, {}, h()).then(d),

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
    config: () => axios.get(`${BASE}/admin/config`, h()).then(d) as Promise<HubConfig>,
    saveConfig: (body: Partial<HubConfig>) => axios.put(`${BASE}/admin/config`, body, h()).then(d) as Promise<HubConfig>,
    automation: () => axios.get(`${BASE}/admin/automation`, h()).then(d) as Promise<{ config: HubConfig; whatsapp: { prepPackTemplate: boolean; inviteTemplate: boolean; costPerMessageInr: number }; drives: AutomationDrive[] }>,
    driveFlags: (driveId: string, body: { skipPrep?: boolean; skipInvite?: boolean }) => axios.put(`${BASE}/admin/automation/${driveId}`, body, h()).then(d),
    sendPack: (driveId: string) => axios.post(`${BASE}/admin/automation/${driveId}/send-pack`, {}, h()).then(d) as Promise<{ sent: number }>,
    coding: (driveId: string) => axios.get(`${BASE}/admin/automation/${driveId}/coding`, h()).then(d) as Promise<{ companyName: string; codingSetId: string; suggestions: { question: string; matches: { id: string; title: string; difficulty: string; number: number }[] }[] }>,
    createCodingSet: (driveId: string, problemIds: string[]) => axios.post(`${BASE}/admin/automation/${driveId}/coding`, { problemIds }, h()).then(d) as Promise<{ codingSetId: string; problems: number; students: number }>,
    insights: (days = 90) => axios.get(`${BASE}/admin/insights`, { ...h(), params: { days } }).then(d) as Promise<HubInsights>,
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
