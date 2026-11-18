/**
 * What an LMS DEMO STUDENT may reach (services/lmsDemoService.ts).
 *
 * Deny-by-default, decided once in authMiddleware, like the placement-partner scope. A demo student
 * is an outsider sitting on CodeBegun's real institute, and several routes check only "is someone
 * logged in" (GET /users lists the institute's people, for one), so trusting each route's own guard
 * would show a stranger real students. Nothing is open unless it is on these lists.
 *
 * While the demo is open: the learning plan and what its days are made of (videos, notes, quizzes,
 * interactive lessons, code), plus what the app shell reads. After it ends: only the end screen.
 */
const API = '/api/v1';

/** Prefixes open to any method while the demo is open. Admin routes under them keep their own role guards. */
const OPEN_PREFIXES = [
  '/auth', '/lms-demo',
  '/enrollment-plans', '/interactive-lessons', '/quizzes', '/progress', '/activity',
];

/** Prefixes open for reading only. */
const READ_PREFIXES = [
  '/learning-library', '/content-library', '/code-snippets', '/notifications', '/tenants', '/system-settings',
];

/** Still reachable after the demo ends: enough to show the end screen and keep the session readable. */
const ENDED_PREFIXES = ['/auth', '/lms-demo'];

const under = (path: string, prefix: string) => path === `${API}${prefix}` || path.startsWith(`${API}${prefix}/`);

export function lmsDemoMayReach(method: string, originalUrl: string, userId: string, ended: boolean): boolean {
  const path = String(originalUrl || '').split('?')[0].replace(/\/+$/, '');
  // The account's own record and permissions: what the app reads to keep a session alive.
  if (method === 'GET' && (path === `${API}/users/me/permissions` || (userId && path === `${API}/users/${userId}`))) return true;
  if (ended) return ENDED_PREFIXES.some(p => under(path, p));
  if (OPEN_PREFIXES.some(p => under(path, p))) return true;
  if ((method === 'GET' || method === 'HEAD') && READ_PREFIXES.some(p => under(path, p))) return true;
  return false;
}
