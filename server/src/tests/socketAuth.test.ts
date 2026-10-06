jest.mock('../models/User', () => ({ __esModule: true, default: {} }));
jest.mock('../middleware/roleGuard', () => ({
  allowedByRoleOrPermission: jest.fn(async (u: any, roles: string[], perms: string[]) =>
    u.customRoleId ? perms.includes('manage_live_classes') && u.customRoleId === 'host-role' : roles.includes(u.role)),
}));

import { mayJoinTenant, mayJoinStaff, mayHostLiveClass, SocketUser } from '../realtime/socketAuth';

const T1 = '69c7723868202a8e4616ef3d';
const T2 = '69c7723868202a8e4616ef3e';
const user = (role: string, tenantId = T1, customRoleId: string | null = null): SocketUser => ({ id: 'u1', role, tenantId, customRoleId, name: 'X' });

describe('socket rooms are joined on the verified login, not the client\'s word', () => {
  it('lets a user into their own institute room only', () => {
    expect(mayJoinTenant(user('STAFF'), T1)).toBe(true);
    expect(mayJoinTenant(user('STAFF'), T2)).toBe(false);
    expect(mayJoinTenant(null, T1)).toBe(false);
  });

  it('lets a super admin watch whichever institute they have open', () => {
    expect(mayJoinTenant(user('SUPER_ADMIN', T1), T2)).toBe(true);
  });

  it('keeps students and guests out of the staff room (lead and follow-up alerts)', () => {
    expect(mayJoinStaff(user('STUDENT'), T1)).toBe(false);
    expect(mayJoinStaff(user('GUEST'), T1)).toBe(false);
    expect(mayJoinStaff(user('INSTRUCTOR'), T1)).toBe(true);
    expect(mayJoinStaff(user('STAFF'), T2)).toBe(false);
  });

  it('only instructors, admins or a Live Classes role may host a live class', async () => {
    expect(await mayHostLiveClass(user('INSTRUCTOR'))).toBe(true);
    expect(await mayHostLiveClass(user('STUDENT'))).toBe(false);
    expect(await mayHostLiveClass(user('STAFF', T1, 'host-role'))).toBe(true);
    expect(await mayHostLiveClass(null)).toBe(false);
  });
});
