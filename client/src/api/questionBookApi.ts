import axios from 'axios';

const BASE = '/api/v1/question-books';
const authHeader = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return { ...(token && { Authorization: `Bearer ${token}` }), ...(tenantId && { 'X-Tenant-Id': tenantId }) };
};
const h = () => ({ headers: authHeader() });
const d = (r: any) => r.data.data;

export type Difficulty = 'easy' | 'medium' | 'hard';
export interface ShelfBook {
  id: string; slug: string; title: string; kind: 'topic' | 'company'; subject: string; description: string;
  color: string; emblem: string; questionCount: number; chapters: number; global: boolean;
  knew: number; revise: number; favorites: number; started: boolean;
}
export interface BookQ { id: string; chapterId: string; question: string; answer: string; difficulty: Difficulty; askedAt: string; tip: string }
export interface ReadBook {
  book: { id: string; slug: string; title: string; kind: string; subject: string; description: string; color: string; emblem: string; global: boolean };
  chapters: { id: string; title: string; count: number }[];
  questions: BookQ[];
  progress: { marks: Record<string, 'knew' | 'revise'>; favorites: string[]; notes: Record<string, string>; lastQuestionId: string };
}
export interface AdminBook {
  id: string; _id: string; scope: 'global' | 'tenant'; title: string; slug: string; kind: 'topic' | 'company'; subject: string;
  description: string; color: string; emblem: string; audience: 'all' | 'lms' | 'careerpilot'; status: 'draft' | 'published';
  chapters: { _id: string; title: string; order: number }[]; questionCount: number; order: number; canEdit?: boolean;
}
export interface AdminQ extends BookQ { order: number }

export const questionBookApi = {
  shelf: () => axios.get(`${BASE}/shelf`, h()).then(d) as Promise<ShelfBook[]>,
  book: (slug: string) => axios.get(`${BASE}/books/${encodeURIComponent(slug)}`, h()).then(d) as Promise<ReadBook>,
  progress: (bookId: string, body: { questionId?: string; mark?: 'knew' | 'revise' | null; favorite?: boolean; note?: string; last?: string; reset?: boolean }) =>
    axios.post(`${BASE}/books/${bookId}/progress`, body, h()).then(d),
  cheatSheet: () => axios.get(`${BASE}/cheat-sheet`, h()).then(d) as Promise<{ book: { id: string; slug: string; title: string; color: string; emblem: string }; items: { id: string; question: string; answer: string; note: string }[] }[]>,

  admin: {
    books: () => axios.get(`${BASE}/admin/books`, h()).then(d) as Promise<AdminBook[]>,
    create: (body: any) => axios.post(`${BASE}/admin/books`, body, h()).then(d) as Promise<AdminBook>,
    get: (id: string) => axios.get(`${BASE}/admin/books/${id}`, h()).then(d) as Promise<{ book: AdminBook; questions: AdminQ[] }>,
    update: (id: string, body: any) => axios.put(`${BASE}/admin/books/${id}`, body, h()).then(d) as Promise<AdminBook>,
    remove: (id: string) => axios.delete(`${BASE}/admin/books/${id}`, h()).then(d),
    chapters: (id: string, chapters: { id?: string; title: string }[]) => axios.put(`${BASE}/admin/books/${id}/chapters`, { chapters }, h()).then(d) as Promise<AdminBook>,
    saveQ: (id: string, qid: string | null, body: any) => (qid ? axios.put(`${BASE}/admin/books/${id}/questions/${qid}`, body, h()) : axios.post(`${BASE}/admin/books/${id}/questions`, body, h())).then(d),
    deleteQ: (id: string, qid: string) => axios.delete(`${BASE}/admin/books/${id}/questions/${qid}`, h()).then(d),
    reorder: (id: string, chapterId: string, ids: string[]) => axios.post(`${BASE}/admin/books/${id}/reorder`, { chapterId, ids }, h()).then(d),
    bulk: (id: string, chapterId: string, text: string, dryRun: boolean) => axios.post(`${BASE}/admin/books/${id}/bulk`, { chapterId, text, dryRun }, h()).then(d) as Promise<{ parsed?: { question: string; answer: string }[]; added?: number }>,
  },
};
