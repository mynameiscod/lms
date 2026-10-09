/**
 * The institute that owns the domain this app was opened on (custom domains, e.g.
 * lms.college.edu). On platform.codebegun.com / localhost there is none and nothing is fetched.
 *
 * Looked up once before the app renders (index.tsx) and kept for the session, so pages can read it
 * synchronously: the login page defaults to that institute, and public pages (battles, CareerPilot
 * join, placement form) use its slug instead of falling back to CodeBegun.
 */
export interface HostTenant { tenantId: string; slug: string; name: string; logo: string; welcomeMessage: string; isPlatformOwner: boolean }

const KEY = 'hostTenant';
const PLATFORM_HOSTS = new Set(['platform.codebegun.com', 'www.platform.codebegun.com', 'localhost', '127.0.0.1']);

export const isPlatformHost = () => PLATFORM_HOSTS.has(window.location.hostname) || /^\d+\.\d+\.\d+\.\d+$/.test(window.location.hostname);

export function hostTenant(): HostTenant | null {
  if (isPlatformHost()) return null;
  try { const raw = sessionStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}

/** The custom-domain institute's slug, for public pages that need one. */
export const hostTenantSlug = (): string | null => hostTenant()?.slug || null;

export async function loadHostTenant(): Promise<void> {
  if (isPlatformHost()) return;
  try {
    const r = await fetch('/api/v1/public/branding-by-host');
    const j = await r.json();
    if (j?.success && j.data) {
      sessionStorage.setItem(KEY, JSON.stringify(j.data));
      // The institute signs in here — prime the login with it (still replaced by the account's own after login).
      if (!localStorage.getItem('token')) localStorage.setItem('tenantId', j.data.tenantId);
    } else sessionStorage.removeItem(KEY);
  } catch { /* the app still works; it just will not know the domain's institute */ }
}
