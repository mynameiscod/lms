/**
 * A placement office login (role PLACEMENT_PARTNER) may reach the Talent Portal and nothing else.
 *
 * Deny-by-default, decided once in authMiddleware for every authenticated route. Many routes check
 * only "is someone logged in" (GET /users does, for one), so trusting each route's own guard would
 * leave those open to an outside account. Here nothing is open unless it is on this list.
 */
export const PARTNER_ROLE = 'PLACEMENT_PARTNER';

const API = '/api/v1';

export function partnerMayReach(method: string, originalUrl: string, userId: string): boolean {
  const path = String(originalUrl || '').split('?')[0].replace(/\/+$/, '');
  if (path === `${API}/talent-portal` || path.startsWith(`${API}/talent-portal/`)) return true;
  // What the app reads to keep a session alive: the account's own record and its (empty) permissions.
  if (method === 'GET' && path === `${API}/users/me/permissions`) return true;
  if (method === 'GET' && userId && path === `${API}/users/${userId}`) return true;
  return false;
}
