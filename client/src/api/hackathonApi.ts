import axios from 'axios';

const API = (process.env.REACT_APP_API_URL || '/api/v1');
const auth = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return { ...(token && { Authorization: `Bearer ${token}` }), ...(tenantId && { 'X-Tenant-Id': tenantId }) };
};

export interface HackathonPrizes {
  first: string;
  second: string;
  third: string;
  others: string[];
}

export interface Hackathon {
  _id?: string;
  title: string;
  slug?: string;
  description?: string;
  /** How the event runs — rounds, judging, what to bring. */
  process?: string;
  venue?: string;
  bannerUrl?: string;
  /** Date AND time in one value; the form edits it as a datetime-local. */
  startAt: string;
  endAt?: string | null;
  prizes?: HackathonPrizes;
  /** Per TEAM, in rupees. 0 means free — registration then skips payment entirely. */
  feeInr?: number;
  /** Both inclusive, and both counted INCLUDING the team lead. */
  minTeamSize?: number;
  maxTeamSize?: number;
  registerOpensAt?: string | null;
  registerClosesAt?: string | null;
  /** 0 means unlimited. Counts confirmed teams only. */
  maxTeams?: number;
  colleges?: string[];
  allowOtherCollege?: boolean;
  status?: 'draft' | 'published' | 'closed';
  counts?: { confirmed: number; pending: number; refundDue: number };
  createdAt?: string;
}

export interface HackathonMember {
  name: string;
  mobile: string;
  email: string;
  isLead: boolean;
}

export interface HackathonRegistration {
  _id: string;
  registrationCode: string;
  teamName: string;
  college: string;
  collegeIsOther: boolean;
  members: HackathonMember[];
  status: 'pending_payment' | 'confirmed' | 'cancelled' | 'refund_due';
  amountInr: number;
  payment?: { orderId: string; paymentId?: string; status: string; paidAt?: string | null } | null;
  cancelReason?: string;
  confirmedAt?: string | null;
  createdAt: string;
}

export const hackathonApi = {
  list: async (): Promise<Hackathon[]> =>
    (await axios.get(`${API}/hackathons`, { headers: auth() })).data.hackathons,

  get: async (id: string): Promise<{ hackathon: Hackathon; confirmedTeams: number }> =>
    (await axios.get(`${API}/hackathons/${id}`, { headers: auth() })).data,

  create: async (body: Partial<Hackathon>): Promise<Hackathon> =>
    (await axios.post(`${API}/hackathons`, body, { headers: auth() })).data.hackathon,

  update: async (id: string, body: Partial<Hackathon>): Promise<Hackathon> =>
    (await axios.put(`${API}/hackathons/${id}`, body, { headers: auth() })).data.hackathon,

  remove: async (id: string): Promise<void> => {
    await axios.delete(`${API}/hackathons/${id}`, { headers: auth() });
  },

  registrations: async (id: string, status?: string): Promise<HackathonRegistration[]> =>
    (await axios.get(`${API}/hackathons/${id}/registrations`, { headers: auth(), params: status ? { status } : {} })).data.registrations,

  markRefunded: async (id: string, regId: string): Promise<void> => {
    await axios.post(`${API}/hackathons/${id}/registrations/${regId}/refunded`, {}, { headers: auth() });
  },

  /**
   * The CSV, fetched with the auth header and saved from the blob.
   *
   * A plain <a href> cannot carry the bearer token, so linking to the endpoint would just
   * download a 401 as a file — which looks like a broken export rather than a permission
   * problem. This is also the endpoint gated on `export_hackathon_data`, so a 403 here is
   * meaningful and worth surfacing.
   */
  downloadCsv: async (id: string, slug: string, status?: string): Promise<void> => {
    const res = await axios.get(`${API}/hackathons/${id}/registrations.csv`, {
      headers: auth(), params: status ? { status } : {}, responseType: 'blob',
    });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug || 'hackathon'}-registrations.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};

export default hackathonApi;
