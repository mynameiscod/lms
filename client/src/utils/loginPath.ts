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
