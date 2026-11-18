/**
 * What an LMS DEMO STUDENT may reach (services/lmsDemoService.ts).
 *
 * Deny-by-default, decided once in authMiddleware, like the placement-partner scope. A demo student
 * is an outsider sitting on CodeBegun's real institute, and several routes check only "is someone
 * logged in" (GET /users lists the institute's people, for one), so trusting each route's own guard
 * would show a stranger real students. Nothing is open unless it is on these lists.
 *
 * While the demo is open: the learning plan and what its days are made of, plus each platform
 * feature the admin switched on for demos. Which ITEMS a feature shows (the chosen problems,
 * questions, quizzes...) is narrowed again inside each feature with lmsDemoScopeFor().
 * After the demo ends: only the end screen.
 */
const API = '/api/v1';

/** Always open while the demo is open. Quizzes and assignments stay open because course days hold them; their items are filtered. */
const OPEN_PREFIXES = [
  '/auth', '/lms-demo',
  '/enrollment-plans', '/interactive-lessons', '/quizzes', '/assignments', '/progress', '/activity',
];

/** Open for reading only. */
const READ_PREFIXES = [
  '/learning-library', '/content-library', '/code-snippets', '/notifications', '/tenants', '/system-settings',
];

/** Each feature switch on the LMS Demo screen, and the API it opens. */
export const FEATURE_PREFIXES: Record<string, string[]> = {
  thinkingLab: ['/thinking-lab'],
  communicationLab: ['/communication'],
  codingPractice: ['/coding-practice'],
  questionBooks: ['/question-books'],
  mockInterview: ['/interview-module'],
  playground: ['/playground'],
  visualizer: ['/visualizer'],
  aiMentor: ['/ai-mentor'],
  resumeBuilder: ['/resume'],
};

/** Never open to a demo student, even with its feature on: admin lists that sit under a student prefix. */
const NEVER = ['/resume/all', '/thinking-lab/admin', '/communication/admin', '/assignments/reports'];

/** Still reachable after the demo ends: enough to show the end screen and keep the session readable. */
const ENDED_PREFIXES = ['/auth', '/lms-demo'];

const under = (path: string, prefix: string) => path === `${API}${prefix}` || path.startsWith(`${API}${prefix}/`);

export function lmsDemoMayReach(method: string, originalUrl: string, userId: string, ended: boolean, features: Record<string, boolean> = {}): boolean {
  const path = String(originalUrl || '').split('?')[0].replace(/\/+$/, '');
  // The account's own record and permissions: what the app reads to keep a session alive.
  if (method === 'GET' && (path === `${API}/users/me/permissions` || (userId && path === `${API}/users/${userId}`))) return true;
  if (ended) return ENDED_PREFIXES.some(p => under(path, p));
  if (NEVER.some(p => under(path, p))) return false;
  if (OPEN_PREFIXES.some(p => under(path, p))) return true;
  if ((method === 'GET' || method === 'HEAD') && READ_PREFIXES.some(p => under(path, p))) return true;
  for (const [f, prefixes] of Object.entries(FEATURE_PREFIXES)) {
    if (features[f] && prefixes.some(p => under(path, p))) return true;
  }
  return false;
}
