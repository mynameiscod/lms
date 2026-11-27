/**
 * Which login screen an unauthenticated visitor belongs on.
 *
 * CareerPilot is a separate consumer product with its own branded login (password +
 * WhatsApp OTP). Sending its members to the LMS login is a dead end: that form wants an
 * LMS email and password, and a member who only ever had an OTP has nothing to type into
 * it — they are simply stuck, on a screen that does not look like the product they paid
 * for.
 *
 * Derived from the PATH rather than the user, deliberately. At the moment this is needed
 * the user object has usually just been cleared — on logout, or on a 401 — so the path is
 * the only thing left that still says where they were.
 *
 * The legacy /passport prefix is included because old bookmarks and emailed links still
 * arrive on it.
 */
export function loginPathFor(pathname: string): string {
  return /^\/(careerpilot|passport)(\/|$)/.test(pathname) ? '/careerpilot/login' : '/login';
}

/* ── "Sign in to open that page" ───────────────────────────────────────────────────────── */

/** Set by a deliberate log-out, so the login page that follows does not say "sign in to open…". */
export const LOGGED_OUT_KEY = 'auth.loggedOutAt';
const LOGGED_OUT_FRESH_MS = 10_000;

const justLoggedOut = () => {
  try {
    const at = Number(sessionStorage.getItem(LOGGED_OUT_KEY) || 0);
    return at > 0 && Date.now() - at < LOGGED_OUT_FRESH_MS;
  } catch { return false; }
};

/**
 * A CareerPilot address that is safe to return to after signing in: our own member pages only
 * (never another site, never the login or join page itself).
 */
export function safeNext(next: string | null | undefined): string | null {
  const n = String(next || '');
  if (!/^\/careerpilot\/[a-z]/i.test(n) || n.startsWith('//') || /[\\\s]/.test(n)) return null;
  if (/^\/careerpilot\/(login|join)(\/|\?|#|$)/.test(n)) return null;
  return n;
}

/**
 * Where the guard sends a visitor who is not signed in. A CareerPilot member page (an old bookmark,
 * a shared link, a session that ran out) carries itself along as `?next=`, so the login page can
 * say what it is for and return there afterwards. A deliberate log-out does not.
 */
export function loginRedirectFor(pathname: string, search = ''): string {
  const login = loginPathFor(pathname);
  if (login !== '/careerpilot/login' || justLoggedOut()) return login;
  const next = safeNext(`${pathname.replace(/^\/passport/, '/careerpilot')}${search}`);
  return next ? `${login}?next=${encodeURIComponent(next)}` : login;
}

/** The names members know CareerPilot's pages by (the sidebar's), for "Sign in to open …". */
const PAGE_NAMES: [string, string][] = [
  ['/careerpilot/interview-experiences', 'Interview Experiences'],
  ['/careerpilot/question-books', 'Question Books'],
  ['/careerpilot/skill-assessment', 'your skill assessment'],
  ['/careerpilot/thinking-lab', 'Thinking Lab'],
  ['/careerpilot/communication', 'Communication Lab'],
  ['/careerpilot/industry-connect', 'Industry Connect'],
  ['/careerpilot/interview', 'Mock Interview'],
  ['/careerpilot/playground', 'Playground'],
  ['/careerpilot/visualizer', 'Code Visualizer'],
  ['/careerpilot/practice', 'Practice'],
  ['/careerpilot/coding', 'Coding Sets'],
  ['/careerpilot/roadmap', 'My Roadmap'],
  ['/careerpilot/journey', 'your day'],
  ['/careerpilot/plan', 'your plan'],
  ['/careerpilot/mentor', 'AI Mentor'],
  ['/careerpilot/companies', 'Job Board'],
  ['/careerpilot/news', 'Tech News'],
  ['/careerpilot/resume', 'Resume'],
  ['/careerpilot/progress', 'My Dashboard'],
  ['/careerpilot/rewards', 'the Reward Store'],
  ['/careerpilot/aptitude', 'Aptitude'],
  ['/careerpilot/reasoning', 'Reasoning'],
  ['/careerpilot/support', 'Help & Support'],
  ['/careerpilot/profile', 'your profile'],
  ['/careerpilot/readiness', 'your result'],
  ['/careerpilot/skills', 'Skill DNA'],
  ['/careerpilot/placement', 'placement readiness'],
  ['/careerpilot/setup', 'your setup'],
];

/** "My Roadmap" for /careerpilot/roadmap/anything; "that page" when the page has no name here. */
export function careerPilotPageName(path: string): string {
  const p = path.split(/[?#]/)[0];
  return PAGE_NAMES.find(([prefix]) => p === prefix || p.startsWith(`${prefix}/`))?.[1] || 'that page';
}
