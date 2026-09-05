/**
 * What the browser reports about a person's journey through CareerPilot.
 *
 * WHY THE BROWSER HAS TO DO THIS. CareerPilot is a single-page app: after the first load,
 * moving between Mission Control, the assessment and the roadmap never touches the server, so
 * a server-side log can show every API call and still not show which screens somebody looked
 * at or where they gave up. The navigation half of the story only exists here.
 *
 * IT MUST NOT COST THE MEMBER ANYTHING. Events are queued and flushed on a timer in batches,
 * never one request per click. The flush is fire-and-forget and every failure is swallowed: a
 * member whose assessment stutters because an audit beacon was slow would be a worse product
 * than one with an incomplete audit trail. On page hide it uses sendBeacon, which the browser
 * delivers after the page is gone — otherwise the last thing anybody did, which is usually the
 * interesting thing, would be the event most often lost.
 *
 * WHAT IS NOT COLLECTED. No cursor tracking, no keystrokes, no form contents, no scroll maps.
 * Screen size, language and timezone are sent because they are what an admin needs to tell a
 * broken phone layout from a broken laptop one, and because none of them can be read from the
 * user-agent on the server.
 */

const VISITOR_KEY = 'cp_visitor_id';
const SESSION_KEY = 'cp_session_id';

/** Storage throws outright in some privacy modes, so every access is guarded. */
const readStore = (store: Storage | undefined, key: string): string | null => {
  try { return store?.getItem(key) ?? null; } catch { return null; }
};
const writeStore = (store: Storage | undefined, key: string, value: string) => {
  try { store?.setItem(key, value); } catch { /* private mode; the id lives for this page only */ }
};

const mintId = (): string => {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return (crypto as any).randomUUID();
  } catch { /* fall through */ }
  return `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

/**
 * Held in memory as well as storage: when storage is unavailable the id must still be stable
 * for the life of the page, or every event becomes its own one-row "session".
 */
let memoVisitor: string | null = null;
let memoSession: string | null = null;

/** Stable across visits — this is what joins "read the landing page" to "signed up a week later". */
export function visitorId(): string {
  if (memoVisitor) return memoVisitor;
  const existing = readStore(typeof localStorage !== 'undefined' ? localStorage : undefined, VISITOR_KEY);
  memoVisitor = existing || mintId();
  if (!existing) writeStore(typeof localStorage !== 'undefined' ? localStorage : undefined, VISITOR_KEY, memoVisitor);
  return memoVisitor;
}

/** One browsing session — a new tab is a new session, the same person is the same visitor. */
export function sessionId(): string {
  if (memoSession) return memoSession;
  const existing = readStore(typeof sessionStorage !== 'undefined' ? sessionStorage : undefined, SESSION_KEY);
  memoSession = existing || mintId();
  if (!existing) writeStore(typeof sessionStorage !== 'undefined' ? sessionStorage : undefined, SESSION_KEY, memoSession);
  return memoSession;
}

function device() {
  try {
    return {
      screen: typeof window !== 'undefined' && window.screen
        ? `${window.screen.width}x${window.screen.height}` : undefined,
      language: typeof navigator !== 'undefined' ? navigator.language : undefined,
      timezone: Intl?.DateTimeFormat?.().resolvedOptions?.().timeZone,
    };
  } catch { return {}; }
}

type Kind = 'page' | 'action' | 'error';
type Outcome = 'success' | 'failure' | 'info';

interface QueuedEvent {
  kind: Kind;
  name: string;
  route?: string;
  outcome?: Outcome;
  errorMessage?: string;
  durationMs?: number;
  meta?: any;
}

let queue: QueuedEvent[] = [];
let timer: any = null;

/** Matches MAX_BATCH on the server; a longer batch is trimmed there anyway. */
const BATCH = 10;
/** Long enough that a burst of clicks is one request, short enough to survive a closed tab. */
const FLUSH_MS = 4000;

const endpoint = (): string => {
  const base = process.env.REACT_APP_API_URL || '/api/v1';
  let signedIn = false;
  try { signedIn = !!localStorage.getItem('token'); } catch { signedIn = false; }
  // Signed in, use the authenticated router: it resolves the user, so the row carries a name
  // instead of only a visitor id. Signed out, the public one, which is the whole point.
  return signedIn ? `${base}/careerpilot/activity` : `${base}/public/careerpilot/activity`;
};

function payload(events: QueuedEvent[]) {
  return JSON.stringify({ visitorId: visitorId(), sessionId: sessionId(), device: device(), events });
}

/**
 * @param viaBeacon use sendBeacon, for the page-hide path where fetch would be cancelled.
 */
function flush(viaBeacon = false) {
  if (!queue.length) return;
  const events = queue.slice(0, BATCH);
  queue = queue.slice(BATCH);
  const body = payload(events);

  try {
    if (viaBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      // sendBeacon cannot set Authorization, so it always goes to the public endpoint. The row
      // is then attributed by visitor rather than by user — which still joins to the rest of
      // the trail, because the visitor id is the same one the signed-in events carried.
      const base = process.env.REACT_APP_API_URL || '/api/v1';
      navigator.sendBeacon(`${base}/public/careerpilot/activity`, new Blob([body], { type: 'application/json' }));
      return;
    }
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    try {
      const token = localStorage.getItem('token');
      const tenantId = localStorage.getItem('tenantId');
      if (token) headers.Authorization = `Bearer ${token}`;
      if (tenantId) headers['X-Tenant-Id'] = tenantId;
    } catch { /* headers are a bonus, not a requirement */ }

    fetch(endpoint(), { method: 'POST', headers, body, keepalive: true }).catch(() => {});
  } catch {
    // Never surfaces. An audit trail that can break a page is not worth having.
  }
}

function schedule() {
  if (timer) return;
  timer = setTimeout(() => { timer = null; flush(); }, FLUSH_MS);
}

function push(e: QueuedEvent) {
  // A hard ceiling on the queue: if flushing is failing (offline, blocked) the queue must not
  // grow without limit and take the tab's memory with it. Oldest go first — the newest events
  // are the ones still worth reporting when the connection returns.
  queue.push(e);
  if (queue.length > 50) queue = queue.slice(-50);
  if (queue.length >= BATCH) flush(); else schedule();
}

/** A screen was opened. `name` is what an admin should read, not a URL. */
export const trackPage = (name: string, route?: string) =>
  push({ kind: 'page', name, route: route || (typeof window !== 'undefined' ? window.location.pathname : undefined), outcome: 'info' });

/** The person did something deliberate. */
export const trackAction = (name: string, opts?: { outcome?: Outcome; route?: string; durationMs?: number; meta?: any }) =>
  push({ kind: 'action', name, outcome: opts?.outcome || 'success', route: opts?.route, durationMs: opts?.durationMs, meta: opts?.meta });

/** Something failed in a way the person saw. */
export const trackFailure = (name: string, errorMessage?: string, meta?: any) =>
  push({ kind: 'error', name, outcome: 'failure', errorMessage, meta });

let started = false;
/**
 * Registered once, from the shell. Flushes on the way out so the last action of a session —
 * usually the one that explains why the session ended — is not the one that goes missing.
 */
export function startActivityBeacon() {
  if (started || typeof window === 'undefined') return;
  started = true;
  window.addEventListener('pagehide', () => flush(true));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush(true);
  });
}
