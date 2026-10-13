/**
 * May this user do something? One rule for every screen, the same one the server applies
 * (allowedByRoleOrPermission in server/src/middleware/roleGuard.ts):
 *
 *   - a super admin always may;
 *   - anyone holding one of the permissions may — a custom role is decided by what was ticked
 *     for it in Roles, whatever its base role;
 *   - a user without a custom role is also let in by their role name, exactly as the server does.
 *
 * Checking the role name alone is how a custom role ticked for a feature saw its menu item and
 * then found every button on the page missing.
 */
export interface PermissionSubject {
  role?: string;
  permissions?: string[];
  customRoleId?: string | null;
}

export function userCan(user: PermissionSubject | null | undefined, permissions: string[], roles: string[] = []): boolean {
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN') return true;
  const mine = user.permissions || [];
  if (permissions.some((p) => mine.includes(p))) return true;
  if (user.customRoleId) return false;
  return roles.includes(String(user.role || ''));
}
