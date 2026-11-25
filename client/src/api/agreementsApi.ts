import axios from 'axios';

const BASE = '/api/v1/agreements';
const authHeader = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return { ...(token && { Authorization: `Bearer ${token}` }), ...(tenantId && { 'X-Tenant-Id': tenantId }) };
};
const h = () => ({ headers: authHeader() });
const d = (r: any) => r.data.data;

export type AudienceMode = 'all' | 'batches' | 'students';
export interface AgreementDoc { url: string; name: string; size?: number }

/** What a student sees. */
export interface StudentAgreement {
  id: string; title: string; kind: 'terms' | 'agreement'; intro: string; points: string[];
  document: AgreementDoc | null; requireSignature: boolean; blockLms: boolean; version: number; acceptedAt?: string;
}

/** What the student filled in for one agreement before submitting. */
export interface Consent { agreed: boolean; signature?: string; signedName?: string }

export interface AdminAgreement {
  id: string; _id?: string; title: string; kind: 'terms' | 'agreement'; intro?: string; points: string[];
  document?: AgreementDoc | null; requireSignature: boolean; blockLms: boolean;
  audience: { mode: AudienceMode; batchIds: string[]; studentIds: string[] };
  status: 'draft' | 'live' | 'closed'; version: number; publishedAt?: string; updatedAt?: string;
  counts?: { targeted: number; accepted: number; pending: number };
  batchLabels?: { id: string; name: string }[];
  studentLabels?: { id: string; name: string; email?: string }[];
}

export interface ResponseRow {
  studentId: string; name: string; email: string; phone: string; batch: string;
  status: 'accepted' | 'old_version' | 'pending'; acceptedAt: string | null; version: number | null; signedName: string; ip: string; acceptanceId: string | null;
}

export interface SignedRecord {
  id: string; version: number; acceptedAt: string; ip?: string; userAgent?: string; signedName?: string; signature?: string;
  snapshot: { title: string; intro?: string; points: string[]; document?: AgreementDoc };
  student: { name: string; email?: string; phone?: string };
}

export const agreementsApi = {
  // Student
  mine: async (): Promise<{ pending: StudentAgreement[]; accepted: StudentAgreement[] }> => d(await axios.get(`${BASE}/mine`, h())),
  accept: async (a: StudentAgreement, c: Consent) => d(await axios.post(`${BASE}/${a.id}/accept`, { version: a.version, signature: c.signature, signedName: c.signedName }, h())),
  myRecord: async (id: string): Promise<SignedRecord> => d(await axios.get(`${BASE}/${id}/my-record`, h())),
  // Admin
  list: async (): Promise<AdminAgreement[]> => d(await axios.get(`${BASE}/admin`, h())),
  get: async (id: string): Promise<AdminAgreement> => d(await axios.get(`${BASE}/admin/${id}`, h())),
  create: async (body: Partial<AdminAgreement> & { status?: string }): Promise<AdminAgreement> => d(await axios.post(`${BASE}/admin`, body, h())),
  update: async (id: string, body: Partial<AdminAgreement> & { reask?: boolean }): Promise<AdminAgreement> => d(await axios.put(`${BASE}/admin/${id}`, body, h())),
  setStatus: async (id: string, status: 'draft' | 'live' | 'closed'): Promise<AdminAgreement> => d(await axios.post(`${BASE}/admin/${id}/status`, { status }, h())),
  remove: async (id: string) => d(await axios.delete(`${BASE}/admin/${id}`, h())),
  responses: async (id: string): Promise<{ agreement: { id: string; title: string; version: number; requireSignature: boolean }; rows: ResponseRow[] }> =>
    d(await axios.get(`${BASE}/admin/${id}/responses`, h())),
  record: async (acceptanceId: string): Promise<SignedRecord> => d(await axios.get(`${BASE}/admin/records/${acceptanceId}`, h())),
  options: async (q = ''): Promise<{ batches: { id: string; name: string }[]; students: { id: string; name: string; email?: string }[] }> =>
    d(await axios.get(`${BASE}/admin/options`, { ...h(), params: { q } })),
  uploadDocument: async (file: File): Promise<AgreementDoc> => {
    const fd = new FormData();
    fd.append('file', file);
    return d(await axios.post(`${BASE}/admin/document`, fd, h()));
  },
};

/** Submit every consent in order; stops at the first refusal and says which agreement it was. */
export async function acceptAll(list: StudentAgreement[], consents: Record<string, Consent>) {
  for (const a of list) {
    try { await agreementsApi.accept(a, consents[a.id] || { agreed: false }); } catch (e: any) {
      throw new Error(`${a.title}: ${e?.response?.data?.message || 'could not be submitted'}`);
    }
  }
}
