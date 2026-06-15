// Platform Settings API (SUPER_ADMIN only). Manages admin-configurable keys
// (AI keys/models, and future groups) that used to live in the .env file.

const BASE = '/api/v1/system-settings';

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  if (tenantId) h['X-Tenant-Id'] = tenantId;
  return h;
};

export interface SettingGroup {
  id: string;
  label: string;
  icon: string;
  description: string;
}

export interface SettingField {
  key: string;
  label: string;
  group: string;
  type: 'text' | 'password' | 'number' | 'boolean' | 'select';
  isSecret: boolean;
  placeholder: string;
  help: string;
  options?: string[];
  isSet: boolean;
  source: 'ui' | 'env' | 'unset';
  value: string;   // actual value for non-secrets; '' for secrets
  masked: string;  // masked hint for secrets that are set
}

export const systemSettingsApi = {
  get: async (): Promise<{ groups: SettingGroup[]; settings: SettingField[] }> => {
    const r = await fetch(BASE, { headers: authHeaders() });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || 'Failed to load settings');
    return (await r.json()).data;
  },

  update: async (settings: { key: string; value: string }[]): Promise<void> => {
    const r = await fetch(BASE, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ settings }),
    });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || 'Failed to save settings');
  },

  test: async (provider: 'anthropic' | 'openai'): Promise<{ success: boolean; message: string }> => {
    const r = await fetch(`${BASE}/test/${provider}`, { method: 'POST', headers: authHeaders() });
    return r.json();
  },
};
