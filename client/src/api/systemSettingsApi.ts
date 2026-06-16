// Platform Settings API (SUPER_ADMIN only). Manages admin-configurable keys
// (AI, email, storage, oauth, messaging, integrations) that used to live in .env.
// Supports platform scope and per-tenant overrides.

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
  perTenant: boolean;
  placeholder: string;
  help: string;
  options?: string[];
  isSet: boolean;
  source: 'tenant' | 'ui' | 'env' | 'unset';
  value: string;          // actual value for non-secrets; '' for secrets
  masked: string;         // masked hint for secrets that are set
  inheritedMasked: string;// (tenant scope) platform/.env value for context
}

export interface TenantOption { id: string; name: string; }

export const systemSettingsApi = {
  get: async (tenantId?: string): Promise<{ groups: SettingGroup[]; settings: SettingField[]; scope: string }> => {
    const url = tenantId ? `${BASE}?tenantId=${encodeURIComponent(tenantId)}` : BASE;
    const r = await fetch(url, { headers: authHeaders() });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || 'Failed to load settings');
    return (await r.json()).data;
  },

  update: async (settings: { key: string; value: string }[], tenantId?: string): Promise<void> => {
    const r = await fetch(BASE, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ settings, tenantId }),
    });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || 'Failed to save settings');
  },

  test: async (provider: 'anthropic' | 'openai'): Promise<{ success: boolean; message: string }> => {
    const r = await fetch(`${BASE}/test/${provider}`, { method: 'POST', headers: authHeaders() });
    return r.json();
  },

  testEmail: async (to: string, tenantId?: string): Promise<{ success: boolean; message: string }> => {
    const r = await fetch(`${BASE}/test-email`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ to, tenantId }),
    });
    return r.json();
  },

  tenants: async (): Promise<TenantOption[]> => {
    const r = await fetch(`${BASE}/tenants`, { headers: authHeaders() });
    if (!r.ok) return [];
    return (await r.json()).data || [];
  },
};
