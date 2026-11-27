/**
 * One way to throw a party, from anywhere in the app.
 *
 * A screen calls `celebrate({...})` at the moment something worth marking happens — membership
 * paid, an assessment handed in, a day finished — and <CelebrationHost /> (mounted once, in App)
 * draws it. The host lives above the routes, so a screen that navigates away right after the
 * event (paying from the assessment goes straight to the roadmap) does not cut the moment short.
 *
 * `once` names the event. A named event plays a single time per signed-in member on this browser:
 * reloading the page, or coming back to a finished day, does not replay it.
 */
export type CelebrationKind = 'membership' | 'assessment' | 'day';

export interface CelebrationStat { value: number; label: string; prefix?: string }

export interface Celebration {
  kind: CelebrationKind;
  title: string;
  message?: string;
  /** Numbers that count up from 0 on the card (score, XP earned…). At most three are shown. */
  stats?: CelebrationStat[];
  /** The one next step. Without it the card offers only "Continue", which just closes it. */
  action?: { label: string; to: string };
  /** A key that makes this a once-only celebration, e.g. `day:<enrollment>:12`. */
  once?: string;
}

type Listener = (c: Celebration) => void;
const listeners = new Set<Listener>();

const memberId = (): string => {
  try {
    const u = JSON.parse(localStorage.getItem('user') || 'null');
    return String(u?._id || u?.id || 'anon');
  } catch { return 'anon'; }
};

const storageKey = (once: string) => `cb-celebrated:${memberId()}:${once}`;

/** True when this once-only celebration has already played for the signed-in member. */
export function alreadyCelebrated(once: string): boolean {
  try { return localStorage.getItem(storageKey(once)) === '1'; } catch { return false; }
}

export function celebrate(c: Celebration): void {
  if (c.once) {
    if (alreadyCelebrated(c.once)) return;
    // Private windows and blocked storage throw: the party still happens, it just may repeat.
    try { localStorage.setItem(storageKey(c.once), '1'); } catch { /* ignore */ }
  }
  listeners.forEach(l => l(c));
}

export function onCelebrate(l: Listener): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

/** The signed-in member's first name, for "Welcome, Arun". Empty when it is not known. */
export function memberFirstName(): string {
  try {
    const u = JSON.parse(localStorage.getItem('user') || 'null');
    const n = String(u?.firstName || u?.name || '').trim();
    return n.split(/\s+/)[0] || '';
  } catch { return ''; }
}

/**
 * The membership celebration — one for every checkout path, so the in-page payment and the
 * redirect return (mobile, popup blocked) say the same thing.
 */
export function celebrateMembership(): void {
  const name = memberFirstName();
  celebrate({
    kind: 'membership',
    once: 'membership',
    title: name ? `Welcome to CareerPilot, ${name}!` : 'Welcome to CareerPilot!',
    message: 'Your membership is active. Your full roadmap, every practice set and your daily missions are unlocked.',
    action: { label: 'Open my roadmap', to: '/careerpilot/roadmap' },
  });
}
