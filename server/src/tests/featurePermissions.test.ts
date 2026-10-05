const roles = new Map<string, any>();
jest.mock('../models/Role', () => ({
  __esModule: true,
  default: { findById: jest.fn(async (id: string) => roles.get(String(id)) || null) },
}));

import { allowedByRoleOrPermission, ALL_PERMISSIONS, FEATURE_PERMISSIONS, ROLE_PERMISSIONS, PERMISSION_GROUPS } from '../middleware/roleGuard';

const ADMINISH = ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'];

describe('features with a permission of their own', () => {
  it('lists every feature key in the Roles screen catalogue', () => {
    for (const k of FEATURE_PERMISSIONS) expect(ALL_PERMISSIONS).toContain(k);
    expect(PERMISSION_GROUPS.whatsapp.permissions.map((p) => p.key)).toEqual(['manage_whatsapp_templates']);
  });

  it('gives tenant admins every feature key by default', () => {
    for (const k of FEATURE_PERMISSIONS) expect(ROLE_PERMISSIONS.TENANT_ADMIN).toContain(k);
  });

  it('has no duplicate keys across groups', () => {
    expect(new Set(ALL_PERMISSIONS).size).toBe(ALL_PERMISSIONS.length);
  });
});

describe('allowedByRoleOrPermission', () => {
  beforeEach(() => roles.clear());

  it('keeps the role-name rule for users without a custom role', async () => {
    expect(await allowedByRoleOrPermission({ role: 'INSTRUCTOR' }, ADMINISH, ['manage_live_classes'])).toBe(true);
    expect(await allowedByRoleOrPermission({ role: 'STAFF' }, ADMINISH, ['manage_live_classes'])).toBe(false);
  });

  it('lets a custom role in when the permission is ticked, whatever the base role', async () => {
    roles.set('r1', { permissions: ['manage_live_classes'] });
    expect(await allowedByRoleOrPermission({ role: 'STAFF', customRoleId: 'r1' }, ADMINISH, ['manage_live_classes'])).toBe(true);
  });

  it('keeps a custom role out when the permission is not ticked, even for an admin-ish base role', async () => {
    roles.set('r2', { permissions: ['view_leads'] });
    expect(await allowedByRoleOrPermission({ role: 'INSTRUCTOR', customRoleId: 'r2' }, ADMINISH, ['manage_live_classes'])).toBe(false);
  });

  it('always lets super admins in and nobody when there is no user', async () => {
    expect(await allowedByRoleOrPermission({ role: 'SUPER_ADMIN', customRoleId: 'missing' }, [], [])).toBe(true);
    expect(await allowedByRoleOrPermission(undefined, ADMINISH, ['x'])).toBe(false);
  });
});
