/** In-memory ring-buffer of client-side API errors (max 100 entries) */

export interface ClientError {
  ts: string;       // ISO timestamp
  method: string;
  url: string;
  status: number;
  message: string;
}

const MAX = 100;
const errors: ClientError[] = [];
const listeners: Array<() => void> = [];

// ── Server beacon: flush client errors to /activity/client-error so admins can
// see them per-student. Debounced + batched; never loops on itself or on 401s. ──
const API_BASE = process.env.REACT_APP_API_URL || '/api/v1';
const pending: ClientError[] = [];
let flushTimer: any = null;

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(flushBeacon, 4000);
}
async function flushBeacon() {
  flushTimer = null;
  if (!pending.length) return;
  const batch = pending.splice(0, pending.length);
  try {
    const token = localStorage.getItem('token');
    const tenantId = localStorage.getItem('tenantId');
    if (!token) return;
    await fetch(`${API_BASE}/activity/client-error`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Tenant-Id': tenantId || '' },
      body: JSON.stringify({ errors: batch }),
      keepalive: true,
    });
  } catch { /* drop — telemetry is best-effort */ }
}

export function pushClientError(method: string, url: string, status: number, message: string) {
  errors.unshift({ ts: new Date().toISOString(), method, url, status, message });
  if (errors.length > MAX) errors.length = MAX;
  listeners.forEach(fn => fn());
  // Beacon to server — skip auth failures and the beacon endpoint itself to avoid loops.
  if (status !== 401 && !String(url).includes('/activity/client-error')) {
    pending.push({ ts: new Date().toISOString(), method, url, status, message });
    scheduleFlush();
  }
}

export function getClientErrors(): ClientError[] {
  return [...errors];
}

export function clearClientErrors() {
  errors.length = 0;
  listeners.forEach(fn => fn());
}

export function subscribeClientErrors(fn: () => void) {
  listeners.push(fn);
  return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); };
}
