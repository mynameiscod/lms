/**
 * A call the person started from the app (Call button / phone link) and has not said how it went.
 * Set by leadApi.logCallClick; read by components/CallOutcomePrompt, which asks "How did the call go?"
 * when they come back to the app. Kept in localStorage: tapping a phone number on a mobile can reload
 * the tab. Forgotten after 30 minutes (the server stops matching the outcome to the call by then).
 */
const KEY = 'cb_pending_call';
export const PENDING_CALL_EVENT = 'cb:pending-call';
export const LEAD_ACTIVITY_EVENT = 'cb:lead-activity';
const MAX_AGE_MS = 30 * 60 * 1000;

export interface PendingCall { leadId: string; name?: string; at: number; snoozedUntil?: number }

export function markPendingCall(leadId: string, name?: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ leadId, name, at: Date.now() }));
    window.dispatchEvent(new Event(PENDING_CALL_EVENT));
  } catch { /* storage blocked: no prompt, nothing breaks */ }
}

export function readPendingCall(): PendingCall | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PendingCall;
    if (!p?.leadId || Date.now() - p.at > MAX_AGE_MS) { localStorage.removeItem(KEY); return null; }
    return p;
  } catch { return null; }
}

export function snoozePendingCall(ms: number) {
  const p = readPendingCall();
  if (!p) return;
  try { localStorage.setItem(KEY, JSON.stringify({ ...p, snoozedUntil: Date.now() + ms })); } catch { /* ignore */ }
}

export function clearPendingCall() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
