jest.mock('../models/Role', () => {
  const docs: any[] = [];
  const match = (q: any, d: any) => Object.entries(q).every(([k, v]) => String(d[k]) === String(v));
  return {
    __esModule: true,
    docs,
    default: {
      findById: jest.fn(async (id: any) => docs.find((d) => String(d._id) === String(id)) || null),
      findOne: jest.fn((q: any) => ({ select: () => ({ lean: async () => docs.find((d) => match(q, d)) || null }) })),
    },
  };
});

import { permissionsOf, ROLE_PERMISSIONS, ALL_PERMISSIONS } from '../middleware/roleGuard';
const docs: any[] = (jest.requireMock('../models/Role') as any).docs;

describe('who can do what (permissionsOf)', () => {
  beforeEach(() => { docs.length = 0; });

  it('a super admin has every permission, even when a custom role is set on the account', async () => {
    docs.push({ _id: 'r1', name: 'Narrow', permissions: ['view_reports'] });
    const p = await permissionsOf({ role: 'SUPER_ADMIN', customRoleId: 'r1', tenantId: 't1' });
    expect(p).toBe(ALL_PERMISSIONS);
    expect(p).toEqual(expect.arrayContaining(['manage_thinking_bank', 'manage_job_openings', 'manage_roles']));
  });

  it('a user on a custom role gets exactly that role’s permissions', async () => {
    docs.push({ _id: 'r2', name: 'Content writer', permissions: ['manage_thinking_bank'] });
    expect(await permissionsOf({ role: 'STAFF', customRoleId: 'r2', tenantId: 't1' })).toEqual(['manage_thinking_bank']);
  });

  it('ticking a box on the institute’s built-in role (by name) adds it for everyone with that role', async () => {
    docs.push({ _id: 'r3', name: 'TENANT_ADMIN', tenantId: 't1', permissions: ['manage_job_openings'] });
    const p = await permissionsOf({ role: 'TENANT_ADMIN', tenantId: 't1' });
    expect(p).toContain('manage_job_openings');
    // ...without taking away the built-in defaults the record does not list.
    expect(p).toEqual(expect.arrayContaining(ROLE_PERMISSIONS.TENANT_ADMIN));
  });

  it('another institute’s built-in role record does not apply', async () => {
    docs.push({ _id: 'r4', name: 'TENANT_ADMIN', tenantId: 't2', permissions: ['manage_job_openings'] });
    expect(await permissionsOf({ role: 'TENANT_ADMIN', tenantId: 't1' })).not.toContain('manage_job_openings');
  });

  it('no record and no tenant: the built-in defaults', async () => {
    expect(await permissionsOf({ role: 'INSTRUCTOR' })).toEqual(ROLE_PERMISSIONS.INSTRUCTOR);
  });
});
