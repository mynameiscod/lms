/**
 * Which product a signed-in person is in: the LMS or CareerPilot. They are two products that share one
 * database. A CareerPilot member has no batch, no classes and no LMS dashboard, so wherever the app
 * says "go home", "go back" or "continue", a member goes to CareerPilot and never to the LMS.
 *
 * The server says which (user.product, set at login and on every session restore). This file turns
 * that into places to go. It is the one place that knows.
 */

export type Product = 'lms' | 'careerpilot';

interface WhoLike { role?: string; product?: string }

export const productOf = (user?: WhoLike | null): Product => (user?.product === 'careerpilot' ? 'careerpilot' : 'lms');

export const isMember = (user?: WhoLike | null): boolean => productOf(user) === 'careerpilot' && (user?.role || 'STUDENT') === 'STUDENT';

/** Where "home" is for this person. */
export const homePathFor = (user?: WhoLike | null): string => (isMember(user) ? '/careerpilot' : '/dashboard');

/** Pages a member may open whatever their address: CareerPilot itself, and public pages that belong to nobody's product. */
const MEMBER_OK = [
  '/careerpilot', '/passport', '/live', '/battles', '/hackathon-exam', '/hackathons', '/verify', '/certificate',
  '/reset-password', '/forgot-password', '/setup-password', '/assessment', '/candidate',
];

/**
 * An LMS address, and the CareerPilot page that does the same job. A link that was written for the LMS
 * (a notification, a reminder, an old bookmark, a "continue" button on a shared page) takes a member
 * to their own version of it, not to the LMS.
 */
const MEMBER_EQUIVALENT: [string, string][] = [
  ['/ai-communication-lab', '/careerpilot/communication'],
  ['/thinking-lab', '/careerpilot/thinking-lab'],
  ['/coding-practice', '/careerpilot/coding'],
  ['/code-playground', '/careerpilot/playground'],
  ['/playground', '/careerpilot/playground'],
  ['/visualizer', '/careerpilot/visualizer'],
  ['/my-interviews', '/careerpilot/interview'],
  ['/mock-interview', '/careerpilot/interview'],
  ['/question-books', '/careerpilot/question-books'],
  ['/interview-experiences', '/careerpilot/interview-experiences'],
  ['/resume-builder', '/careerpilot/resume'],
  ['/ai-mentor', '/careerpilot/mentor'],
  ['/my-learning', '/careerpilot/plan'],
  ['/my-tasks', '/careerpilot/plan'],
  ['/my-practice', '/careerpilot/plan'],
  ['/career-profile', '/careerpilot/profile'],
  ['/profile', '/careerpilot/profile'],
  ['/job-tracker', '/careerpilot/companies'],
  ['/dashboard', '/careerpilot'],
];

const under = (path: string, prefix: string) => path === prefix || path.startsWith(prefix + '/');

/** LMS addresses a member must never end up on become their CareerPilot equivalent, or CareerPilot home. */
function memberRedirect(pathname: string): string | null {
  if (MEMBER_OK.some((p) => under(pathname, p))) return null;
  const hit = MEMBER_EQUIVALENT.find(([p]) => under(pathname, p));
  return hit ? hit[1] : '/careerpilot';
}

/** CareerPilot pages that are public: nothing about them belongs to one product's members. */
const MEMBER_APP_PUBLIC = ['/careerpilot/join', '/careerpilot/login', '/careerpilot/card'];

/**
 * Where this person must be sent instead of the page they asked for, or null when the page is theirs.
 *  - a CareerPilot member on an LMS page → the CareerPilot version of it, or CareerPilot home;
 *  - an LMS student on the CareerPilot member app → the LMS dashboard.
 * Staff and admins are never redirected: they run both products from the admin screens.
 */
export function productRedirect(user: WhoLike | null | undefined, pathname: string): string | null {
  if (!user) return null;
  if (isMember(user)) return memberRedirect(pathname);
  if (user.role === 'STUDENT' && under(pathname, '/careerpilot') && !MEMBER_APP_PUBLIC.some((p) => under(pathname, p))) return '/dashboard';
  return null;
}
