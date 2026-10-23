import axios from 'axios';

/**
 * Browser-side monitoring for Help & Support. Reports, in small batches, to /monitor/client-errors:
 *   - uncaught errors and unhandled promise rejections;
 *   - pages that crashed (from AppErrorBoundary);
 *   - API calls that failed with a 5xx or never got an answer (4xx are answers, not faults).
 *
 * What leaves the browser is a short message, the top of a stack, the page PATH (no query
 * string) and, for API failures, the method, path, status and the request id the server
 * returned. No bodies, no headers, no form values. The server redacts it all again.
 *
 * It also remembers the request id of the last failed call, so "Report a problem" can attach it
 * and support can see exactly which request failed.
 */
const ENDPOINT = (process.env.REACT_APP_API_URL || '/api/v1') + '/monitor/client-errors';
const RELEASE = process.env.REACT_APP_RELEASE || '';

type Event = { type: 'error' | 'unhandledrejection' | 'react' | 'api'; message?: string; stack?: string; page?: string; apiPath?: string; method?: string; status?: number; requestId?: string; release?: string };

const queue: Event[] = [];
const recent = new Map<string, number>();
let sentThisMinute = 0;
let minute = 0;
let timer: number | undefined;
let lastFailure: { requestId?: string; at: number } | null = null;

const page = () => window.location.pathname.slice(0, 200);

function enqueue(e: Event) {
  try {
    const key = `${e.type}|${e.message || ''}|${e.apiPath || ''}|${e.status || ''}`;
    const now = Date.now();
    if (now - (recent.get(key) || 0) < 30_000) return; // the same thing twice in 30 s is one report
    recent.set(key, now);
    if (recent.size > 200) recent.clear();
    queue.push({ ...e, release: RELEASE || undefined });
    if (!timer) timer = window.setTimeout(send, 2000);
  } catch { /* never */ }
}

function send() {
  timer = undefined;
  const m = Math.floor(Date.now() / 60_000);
  if (m !== minute) { minute = m; sentThisMinute = 0; }
  const room = Math.max(0, 20 - sentThisMinute);
  const batch = queue.splice(0, Math.min(10, room));
  queue.length = 0; // anything beyond the cap this minute is dropped, not queued forever
  if (!batch.length) return;
  sentThisMinute += batch.length;
  const token = (() => { try { return localStorage.getItem('token'); } catch { return null; } })();
  // fetch, not axios: the axios interceptor below must never see its own reports.
  fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ events: batch }),
    keepalive: true,
  }).catch(() => undefined);
}

export function reportError(type: Event['type'], err: unknown, extra: Partial<Event> = {}) {
  const e: any = err;
  const message = String(e?.message || e || '').slice(0, 300);
  // Opaque cross-origin errors carry nothing anyone can act on.
  if (!message || message === 'Script error.') return;
  enqueue({ type, message, stack: String(e?.stack || '').split('\n').slice(0, 5).join('\n').slice(0, 1200), page: page(), ...extra });
}

function recordApiFailure(method: string | undefined, url: string | undefined, status: number | undefined, requestId: string | undefined) {
  if (!url || url.includes('/monitor/client-errors')) return;
  if (status && status < 500) return;
  lastFailure = { requestId, at: Date.now() };
  let path = url;
  try { path = new URL(url, window.location.origin).pathname; } catch { /* keep as given */ }
  enqueue({ type: 'api', apiPath: path.slice(0, 300), method: (method || 'GET').toUpperCase(), status: status || 0, requestId, page: page() });
}

/** The request id of the last failed call, if it happened recently. */
export function lastFailedRequestId(maxAgeMs = 10 * 60_000): string | undefined {
  return lastFailure && Date.now() - lastFailure.at <= maxAgeMs ? lastFailure.requestId : undefined;
}

let installed = false;
export function installClientMonitor() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener('error', ev => reportError('error', ev.error || ev.message));
  window.addEventListener('unhandledrejection', ev => {
    const r: any = ev.reason;
    // A failed API call already reported itself through the interceptor.
    if (r?.isAxiosError) return;
    reportError('unhandledrejection', r);
  });
  axios.interceptors.response.use(
    r => r,
    err => {
      try {
        const res = err?.response;
        recordApiFailure(err?.config?.method, err?.config?.url, res?.status, res?.headers?.['x-request-id']);
      } catch { /* never */ }
      return Promise.reject(err);
    },
  );
  // Calls made with fetch (some API modules) are watched too, without changing what they return.
  const original = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    try {
      const r = await original(input as any, init);
      if (r.status >= 500) recordApiFailure(init?.method, url, r.status, r.headers.get('x-request-id') || undefined);
      return r;
    } catch (e) {
      recordApiFailure(init?.method, url, 0, undefined);
      throw e;
    }
  };
}
