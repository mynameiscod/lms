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

export function pushClientError(method: string, url: string, status: number, message: string) {
  errors.unshift({ ts: new Date().toISOString(), method, url, status, message });
  if (errors.length > MAX) errors.length = MAX;
  listeners.forEach(fn => fn());
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
