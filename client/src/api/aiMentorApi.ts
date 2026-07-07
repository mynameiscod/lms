import axios from 'axios';

const BASE = '/api/v1/ai-mentor';
const authHeader = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return { ...(token && { Authorization: `Bearer ${token}` }), ...(tenantId && { 'X-Tenant-Id': tenantId }) };
};

export interface MentorMessage {
  role: 'user' | 'assistant';
  content: string;
  at?: string;
}

export const aiMentorApi = {
  getChat: async (): Promise<{ messages: MentorMessage[]; suggestions: string[] }> => {
    const { data } = await axios.get(BASE, { headers: authHeader() });
    return data;
  },
  send: async (message: string): Promise<{ reply: string; messages: MentorMessage[] }> => {
    const { data } = await axios.post(`${BASE}/message`, { message }, { headers: authHeader() });
    return data;
  },
  clear: async (): Promise<void> => {
    await axios.delete(BASE, { headers: authHeader() });
  },
};
