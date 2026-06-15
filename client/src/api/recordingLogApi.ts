// Fire-and-forget telemetry for the recording pipeline. Never throws, never
// blocks the recording flow. Uses fetch keepalive so events still send during
// page unload.

const BASE = '/api/v1/recording-logs';

export const newSessionId = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

interface LogOpts {
  source?: 'class_recording' | 'interview';
  message?: string;
  data?: Record<string, any>;
  meta?: Record<string, any>;
}

export function logRecording(sessionId: string, type: string, opts: LogOpts = {}): void {
  if (!sessionId) return;
  try {
    const token = localStorage.getItem('token');
    const tenantId = localStorage.getItem('tenantId');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (tenantId) headers['X-Tenant-Id'] = tenantId;
    const body = JSON.stringify({
      sessionId,
      source: opts.source || 'class_recording',
      event: { type, message: opts.message, data: opts.data },
      meta: { userAgent: navigator.userAgent, ...(opts.meta || {}) },
    });
    fetch(BASE, { method: 'POST', headers, body, keepalive: true }).catch(() => {});
  } catch { /* telemetry must never break recording */ }
}

// ── Admin: review recording sessions ─────────────────────────────────────────

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  const h: Record<string, string> = {};
  if (token) h['Authorization'] = `Bearer ${token}`;
  if (tenantId) h['X-Tenant-Id'] = tenantId;
  return h;
};

export const recordingLogApi = {
  list: async (params: { source?: string; status?: string; page?: number; limit?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.source) qs.append('source', params.source);
    if (params.status) qs.append('status', params.status);
    if (params.page) qs.append('page', String(params.page));
    if (params.limit) qs.append('limit', String(params.limit));
    const r = await fetch(`${BASE}${qs.toString() ? `?${qs}` : ''}`, { headers: authHeaders() });
    if (!r.ok) throw new Error('Failed to load recording logs');
    return r.json();
  },
  get: async (sessionId: string) => {
    const r = await fetch(`${BASE}/${sessionId}`, { headers: authHeaders() });
    if (!r.ok) throw new Error('Failed to load recording log');
    return r.json();
  },
};
