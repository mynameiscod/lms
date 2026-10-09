/**
 * Security fixes 2026-10-09: user records scoped to the caller's own institute, password hashes
 * never returned, SUPER_ADMIN only granted by a super admin, self-registration can't create an
 * institute, deactivated institutes refused.
 */
const users = new Map<string, any>();
jest.mock('../models/User', () => {
  const model: any = function (this: any, doc: any) { Object.assign(this, doc); this.save = async () => { users.set('new', this); return this; }; };
  model.findById = jest.fn((id: string) => {
    const u = users.get(String(id));
    const q: any = Promise.resolve(u ? { ...u, toObject() { return { ...u }; } } : null);
    q.select = () => ({ lean: async () => (u ? { ...u } : null) });
    return q;
  });
  model.findOne = jest.fn(async () => null);
  model.findByIdAndUpdate = jest.fn(async (id: string, upd: any) => { const u = users.get(String(id)); if (!u) return null; Object.assign(u, upd); return { ...u, toObject() { return { ...u }; } }; });
  return { __esModule: true, default: model };
});
const tenants = new Map<string, any>();
jest.mock('../models/Tenant', () => ({
  __esModule: true,
  default: {
    findById: jest.fn((id: string) => { const t = tenants.get(String(id)); const q: any = Promise.resolve(t || null); q.select = () => ({ lean: async () => t || null }); return q; }),
    findOne: jest.fn(async () => null),
    findByIdAndUpdate: jest.fn(async () => ({})),
  },
}));
jest.mock('../models/AssessmentSubmission', () => ({ __esModule: true, default: { exists: jest.fn(async () => null) } }));

import * as ctrl from '../controllers/userController';
import { AuthService } from '../services/authService';

const T1 = '69c7723868202a8e4616ef3d';
const T2 = '69c7723868202a8e4616ef3e';
const ADMIN = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const STUDENT = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const OTHER = 'cccccccccccccccccccccccc';

const res = () => { const r: any = { statusCode: 200 }; r.status = (c: number) => { r.statusCode = c; return r; }; r.json = (b: any) => { r.body = b; return r; }; return r; };
const req = (user: any, params: any = {}, body: any = {}) => ({ user, params, body, tenantId: user.tenantId } as any);

beforeEach(() => {
  users.clear(); tenants.clear();
  users.set(ADMIN, { _id: ADMIN, tenantId: T1, role: 'TENANT_ADMIN', email: 'a@x', password: '$2b$hash' });
  users.set(STUDENT, { _id: STUDENT, tenantId: T1, role: 'STUDENT', email: 's@x', password: '$2b$hash' });
  users.set(OTHER, { _id: OTHER, tenantId: T2, role: 'STUDENT', email: 'o@x', password: '$2b$hash' });
});

describe('GET /users/:id', () => {
  it('never returns the password hash, even for your own record', async () => {
    const r = res();
    await ctrl.getUserById(req({ id: STUDENT, role: 'STUDENT', tenantId: T1 }, { userId: STUDENT }), r);
    expect(r.statusCode).toBe(200);
    expect(r.body.data.password).toBeUndefined();
  });

  it('a student cannot read anyone else', async () => {
    const r = res();
    await ctrl.getUserById(req({ id: STUDENT, role: 'STUDENT', tenantId: T1 }, { userId: ADMIN }), r);
    expect(r.statusCode).toBe(404);
  });

  it('staff cannot read a user of another institute', async () => {
    const r = res();
    await ctrl.getUserById(req({ id: ADMIN, role: 'TENANT_ADMIN', tenantId: T1 }, { userId: OTHER }), r);
    expect(r.statusCode).toBe(404);
  });

  it('staff can read a user of their own institute', async () => {
    const r = res();
    await ctrl.getUserById(req({ id: ADMIN, role: 'TENANT_ADMIN', tenantId: T1 }, { userId: STUDENT }), r);
    expect(r.statusCode).toBe(200);
  });
});

describe('roles', () => {
  it('a tenant admin cannot make someone SUPER_ADMIN', async () => {
    const r = res();
    await ctrl.updateUserRole(req({ id: ADMIN, role: 'TENANT_ADMIN', tenantId: T1 }, { userId: STUDENT }, { role: 'SUPER_ADMIN' }), r);
    expect(r.statusCode).toBe(403);
    expect(users.get(STUDENT).role).toBe('STUDENT');
  });

  it('a tenant admin cannot change the role of a user in another institute', async () => {
    const r = res();
    await ctrl.updateUserRole(req({ id: ADMIN, role: 'TENANT_ADMIN', tenantId: T1 }, { userId: OTHER }, { role: 'STAFF' }), r);
    expect(r.statusCode).toBe(404);
    expect(users.get(OTHER).role).toBe('STUDENT');
  });

  it('a tenant admin cannot create a SUPER_ADMIN', async () => {
    const r = res();
    await ctrl.createUser(req({ id: ADMIN, role: 'TENANT_ADMIN', tenantId: T1 }, {}, { email: 'n@x', firstName: 'N', lastName: 'X', password: 'p', role: 'SUPER_ADMIN' }), r);
    expect(r.statusCode).toBe(403);
  });
});

describe('self-registration and deactivated institutes', () => {
  it('cannot create an institute from an unknown name', async () => {
    await expect(new AuthService().register('n@x', 'N', 'X', 'pw', 'Some New College')).rejects.toThrow(/Institute not found/);
  });

  it('cannot join a deactivated institute', async () => {
    tenants.set(T2, { _id: T2, isActive: false });
    await expect(new AuthService().register('n@x', 'N', 'X', 'pw', T2)).rejects.toThrow(/not accepting/);
  });
});
