import crypto from 'crypto';
import { redact, redactText } from '../utils/redact';

/**
 * Optional forwarding of error groups to Sentry, through Sentry's HTTP envelope API — no SDK, so
 * nothing new to install and nothing that patches the process.
 *
 * Off unless SENTRY_DSN is set. Everything sent has already been through redaction, and is sent
 * again through it here: Sentry receives the same sanitised summary the database keeps, never a
 * request body, header or user record. A failure to reach Sentry is swallowed; monitoring must
 * never be the thing that breaks a request.
 */
export interface SentryDsn { protocol: string; publicKey: string; host: string; path: string; projectId: string }

export function parseDsn(dsn: string | undefined): SentryDsn | null {
  if (!dsn) return null;
  try {
    const u = new URL(dsn);
    const projectId = u.pathname.split('/').filter(Boolean).pop();
    if (!u.username || !projectId) return null;
    const path = u.pathname.slice(0, u.pathname.lastIndexOf('/'));
    return { protocol: u.protocol.replace(':', ''), publicKey: u.username, host: u.host, path, projectId };
  } catch { return null; }
}

export interface ForwardEvent {
  level: 'info' | 'warning' | 'error' | 'fatal';
  message: string;
  fingerprint: string;
  release?: string;
  environment?: string;
  tags: Record<string, string | undefined>;
  extra?: Record<string, unknown>;
}

type Fetcher = (url: string, init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal }) => Promise<{ ok: boolean; status: number }>;
let fetcher: Fetcher = (url, init) => (globalThis as any).fetch(url, init);
export const __setSentryFetch = (f: Fetcher | null) => { fetcher = f || ((url, init) => (globalThis as any).fetch(url, init)); };

export const sentryEnabled = () => !!parseDsn(process.env.SENTRY_DSN);

export async function forwardToSentry(e: ForwardEvent): Promise<boolean> {
  const dsn = parseDsn(process.env.SENTRY_DSN);
  if (!dsn) return false;
  const eventId = crypto.randomUUID().replace(/-/g, '');
  const event = {
    event_id: eventId,
    timestamp: Date.now() / 1000,
    platform: 'node',
    level: e.level,
    logger: 'careerpilot.support-monitor',
    message: { formatted: redactText(e.message).slice(0, 1000) },
    fingerprint: [e.fingerprint],
    release: e.release,
    environment: e.environment || process.env.NODE_ENV || 'development',
    tags: Object.fromEntries(Object.entries(e.tags).filter(([, v]) => v).map(([k, v]) => [k, redactText(String(v)).slice(0, 200)])),
    extra: redact(e.extra || {}),
  };
  const body = [
    JSON.stringify({ event_id: eventId, sent_at: new Date().toISOString() }),
    JSON.stringify({ type: 'event' }),
    JSON.stringify(event),
  ].join('\n');
  const url = `${dsn.protocol}://${dsn.host}${dsn.path}/api/${dsn.projectId}/envelope/`;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 3000);
  try {
    const r = await fetcher(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${dsn.publicKey}, sentry_client=careerpilot-monitor/1.0`,
      },
      body,
      signal: ctl.signal,
    });
    return r.ok;
  } catch { return false; } finally { clearTimeout(t); }
}
