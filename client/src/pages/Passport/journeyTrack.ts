/**
 * The events the CareerPilot front door sends, named in one place. The admin Journey screen
 * (server/src/services/careerPilotJourneyService.ts, JOIN_EVENTS) counts people by these exact names, so a
 * rename here without a rename there silently empties a step of the funnel. A test keeps the two lists equal.
 */
import { attributionForSubmit } from '../../utils/careerPilotAttribution';

export const JOURNEY = {
  view: 'Join: sign-up form',
  started: 'Join: started the form',
  pressed: 'Join: pressed Create',
  sent: 'Join: OTP sent',
  otpScreen: 'Join: OTP screen',
  verified: 'Join: verified',
  left: 'Join: left the page',
  errors: 'Join: form has errors',
  rejected: 'Join: sign-up rejected',
  wrongOtp: 'Join: wrong OTP',
  resent: 'Join: OTP resent',
  loginView: 'Login: sign-in page',
  loginOk: 'Login: signed in',
  loginFailed: 'Login: failed',
} as const;

/** Where this visitor came from, as plain words: the campaign if there is one, the site that sent them, or direct. */
export function sourceMeta(): { source: string; medium?: string; campaign?: string } {
  try {
    const a: any = attributionForSubmit();
    const t = a?.last_touch || a?.first_touch;
    if (t?.utm_source) return { source: String(t.utm_source), medium: t.utm_medium, campaign: t.utm_campaign };
    const ref = typeof document !== 'undefined' ? document.referrer : '';
    if (ref) { try { const h = new URL(ref).hostname; if (h && h !== window.location.hostname) return { source: h }; } catch { /* ignore */ } }
  } catch { /* a tracker never breaks a page */ }
  return { source: 'direct' };
}
