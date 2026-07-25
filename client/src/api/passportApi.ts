import axios from 'axios';

const BASE = (process.env.REACT_APP_API_URL || '/api/v1') + '/passport';
const auth = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return { ...(token && { Authorization: `Bearer ${token}` }), ...(tenantId && { 'X-Tenant-Id': tenantId }) };
};

export interface OnboardingField { key: string; label: string; type: string; required: boolean; locked?: boolean; options?: string[]; order: number; }
export interface Entitlement { featureKey: string; label: string; tier: 'free' | 'paid'; }
export interface PassportConfig {
  _id?: string; enabled: boolean; assessmentMode: 'deterministic' | 'ai';
  onboardingFields: OnboardingField[]; entitlements: Entitlement[];
  priceInr: number; membershipMonths: number;
}

export const passportApi = {
  getConfig: async (): Promise<{ config: PassportConfig; platformEnabled: boolean }> => {
    const { data } = await axios.get(`${BASE}/config`, { headers: auth() });
    return data;
  },
  updateConfig: async (patch: Partial<PassportConfig>): Promise<PassportConfig> => {
    const { data } = await axios.put(`${BASE}/config`, patch, { headers: auth() });
    return data.config;
  },
  listStudents: async (search = ''): Promise<any[]> => {
    const { data } = await axios.get(`${BASE}/students`, { headers: auth(), params: { search } });
    return data.students;
  },
  convert: async (studentId: string): Promise<any> => {
    const { data } = await axios.post(`${BASE}/convert`, { studentId }, { headers: auth() });
    return data;
  },
  me: async (): Promise<any> => {
    const { data } = await axios.get(`${BASE}/me`, { headers: auth() });
    return data;
  },
};

export default passportApi;
