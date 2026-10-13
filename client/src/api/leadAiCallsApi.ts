import axios from 'axios';

/** The AI calls (Outpero) made to one lead, with their write-up and recordings. */
const authHeader = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return { ...(token && { Authorization: `Bearer ${token}` }), ...(tenantId && { 'X-Tenant-Id': tenantId }) };
};

export interface AiCallAnalysis {
  summary: string; intent: 'high' | 'medium' | 'low' | 'none';
  course?: string; background?: string; timing?: string; budget?: string;
  objections: string[]; nextStep?: string; callbackWhen?: string; language?: string;
}

export interface LeadAiCall {
  callId: string; at?: string; durationSec?: number; status?: string; outcome?: string;
  /** Outpero's own one-line summary. */
  summary?: string; transcript?: string; analysis?: AiCallAnalysis; captured?: Record<string, unknown>;
  /** stored: our copy. link: Outpero's link, still working. expired: gone. none: no recording. */
  recording: 'stored' | 'link' | 'expired' | 'none';
}

export const leadAiCallsApi = {
  list: (leadId: string) => axios.get(`/api/v1/leads/${leadId}/ai-calls`, { headers: authHeader() }).then((r) => r.data.data as LeadAiCall[]),
  /** The audio as a blob URL for an <audio> element (the request needs the sign-in header, so a plain URL will not do). */
  recording: async (leadId: string, callId: string): Promise<string> => {
    const r = await axios.get(`/api/v1/leads/${leadId}/ai-calls/${encodeURIComponent(callId)}/recording`, { headers: authHeader(), responseType: 'blob' });
    return URL.createObjectURL(r.data);
  },
};
