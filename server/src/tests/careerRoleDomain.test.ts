/**
 * Domain keys on admin writes are checked, not coerced.
 *
 * normalizeDomain() falls back to the live domain for anything it does not recognise,
 * which is right on a read — a member carrying a stale key must still render — and wrong
 * on a write, where it would file a role under Software Engineering while the admin
 * believes they created it somewhere else, with nothing anywhere reporting the difference.
 *
 * These pin both halves: the write path rejects, and the read path still coerces.
 */

const findOneRole = jest.fn();
const createRole_ = jest.fn();
const auditCreate = jest.fn();

jest.mock('../models/CareerRole', () => {
  const actual = jest.requireActual('../models/CareerRole');
  return {
    __esModule: true, ...actual,
    default: {
      findOne: (...a: any[]) => findOneRole(...a),
      create: (...a: any[]) => createRole_(...a),
      find: () => ({ sort: () => ({ lean: async () => [] }), select: () => ({ lean: async () => [] }), lean: async () => [] }),
      insertMany: async () => [],
    },
  };
});
jest.mock('../models/AuditLog', () => ({
  __esModule: true, default: { create: (...a: any[]) => auditCreate(...a) },
}));
jest.mock('../models/User', () => ({ __esModule: true, default: { countDocuments: async () => 0 } }));

import { createRole, updateRole } from '../controllers/careerRoleController';
import { normalizeDomain, isKnownActiveDomain, DEFAULT_DOMAIN } from '../services/careerDomainService';

/** Minimal express doubles — these handlers only ever call status().json(). */
function mockRes() {
  const res: any = { statusCode: 200, body: null };
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.json = (b: any) => { res.body = b; return res; };
  return res;
}
const mockReq = (body: any, params: any = {}) =>
  ({ body, params, user: { tenantId: 't1', id: 'admin1', email: 'admin@x.com' } } as any);

beforeEach(() => {
  findOneRole.mockReset(); createRole_.mockReset(); auditCreate.mockReset();
  findOneRole.mockReturnValue({ select: () => ({ lean: async () => null }), lean: async () => null });
  createRole_.mockImplementation(async (doc: any) => ({ ...doc, _id: 'new1' }));
  auditCreate.mockResolvedValue({});
});

describe('create — an unknown domain is refused', () => {
  it.each(['HEALTHCARE', 'FINANCE', 'DESIGN', 'not_a_domain', 'SOFTWARE'])(
    'rejects %s with 400 and writes nothing', async (domainKey) => {
      const res = mockRes();
      await createRole(mockReq({ name: 'Platform Engineer', key: 'PLATFORM_ENGINEER', domainKey }), res);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/not an available career domain/i);
      expect(createRole_).not.toHaveBeenCalled();
    });

  it('names the domains that ARE available, so the admin can correct it', async () => {
    const res = mockRes();
    await createRole(mockReq({ name: 'X', key: 'X_ROLE', domainKey: 'HEALTHCARE' }), res);
    expect(res.body.message).toContain('SOFTWARE_ENGINEERING');
  });

  it('does NOT quietly file it under the default domain', async () => {
    // The whole point: silent coercion would have created a usable role in the wrong place.
    const res = mockRes();
    await createRole(mockReq({ name: 'X', key: 'X_ROLE', domainKey: 'HEALTHCARE' }), res);
    expect(createRole_).not.toHaveBeenCalled();
    expect(res.statusCode).not.toBe(201);
  });

  it('accepts a known active domain', async () => {
    const res = mockRes();
    await createRole(mockReq({ name: 'Platform Engineer', key: 'PLATFORM_ENGINEER', domainKey: 'SOFTWARE_ENGINEERING' }), res);

    expect(res.statusCode).toBe(201);
    expect(createRole_.mock.calls[0][0].domainKey).toBe('SOFTWARE_ENGINEERING');
  });

  it('accepts it case-insensitively', async () => {
    const res = mockRes();
    await createRole(mockReq({ name: 'X', key: 'X_ROLE', domainKey: 'software_engineering' }), res);

    expect(res.statusCode).toBe(201);
    expect(createRole_.mock.calls[0][0].domainKey).toBe('SOFTWARE_ENGINEERING');
  });

  it('defaults when the field is absent — omitted is not the same as unknown', async () => {
    // The admin UI serves one domain and does not send the field.
    const res = mockRes();
    await createRole(mockReq({ name: 'X', key: 'X_ROLE' }), res);

    expect(res.statusCode).toBe(201);
    expect(createRole_.mock.calls[0][0].domainKey).toBe(DEFAULT_DOMAIN);
  });

  it.each([null, ''])('treats %p as absent rather than invalid', async (domainKey) => {
    const res = mockRes();
    await createRole(mockReq({ name: 'X', key: 'X_ROLE', domainKey }), res);
    expect(res.statusCode).toBe(201);
  });
});

describe('update — an unknown domain is refused before anything is mutated', () => {
  const roleDoc = () => {
    const doc: any = {
      _id: 'r1', tenantId: 't1', key: 'BACKEND_ENGINEER', domainKey: 'SOFTWARE_ENGINEERING',
      name: 'Backend Engineer', active: true, studentSelectable: true, systemRole: true,
      save: jest.fn(async () => doc),
    };
    return doc;
  };

  it('returns 400 and does not save', async () => {
    const doc = roleDoc();
    findOneRole.mockReturnValue(doc);
    const res = mockRes();

    await updateRole(mockReq({ name: 'Renamed', domainKey: 'HEALTHCARE' }, { id: 'r1' }), res);

    expect(res.statusCode).toBe(400);
    expect(doc.save).not.toHaveBeenCalled();
  });

  it('leaves the rest of the edit unapplied, so nothing is half-changed', async () => {
    const doc = roleDoc();
    findOneRole.mockReturnValue(doc);

    await updateRole(mockReq({ name: 'Renamed', active: false, domainKey: 'FINANCE' }, { id: 'r1' }), mockRes());

    expect(doc.name).toBe('Backend Engineer');       // rename not applied
    expect(doc.active).toBe(true);                   // deactivation not applied
    expect(doc.domainKey).toBe('SOFTWARE_ENGINEERING');
  });

  it('applies a valid domain change', async () => {
    const doc = roleDoc();
    findOneRole.mockReturnValue(doc);
    const res = mockRes();

    await updateRole(mockReq({ domainKey: 'SOFTWARE_ENGINEERING' }, { id: 'r1' }), res);

    expect(res.statusCode).toBe(200);
    expect(doc.domainKey).toBe('SOFTWARE_ENGINEERING');
    expect(doc.save).toHaveBeenCalled();
  });

  it('leaves the domain alone when the field is omitted', async () => {
    const doc = roleDoc();
    findOneRole.mockReturnValue(doc);

    await updateRole(mockReq({ name: 'Backend Software Engineer' }, { id: 'r1' }), mockRes());

    expect(doc.domainKey).toBe('SOFTWARE_ENGINEERING');
    expect(doc.name).toBe('Backend Software Engineer');
  });
});

describe('the read/default resolver is unchanged', () => {
  it('still coerces an unknown key rather than throwing', () => {
    // A member document carrying a stale domain must still render.
    expect(normalizeDomain('HEALTHCARE')).toBe(DEFAULT_DOMAIN);
    expect(normalizeDomain(null)).toBe(DEFAULT_DOMAIN);
    expect(normalizeDomain(undefined)).toBe(DEFAULT_DOMAIN);
    expect(normalizeDomain('')).toBe(DEFAULT_DOMAIN);
  });

  it('and the strict predicate disagrees with it, which is the point', () => {
    expect(normalizeDomain('HEALTHCARE')).toBe(DEFAULT_DOMAIN);
    expect(isKnownActiveDomain('HEALTHCARE')).toBe(false);

    expect(isKnownActiveDomain('SOFTWARE_ENGINEERING')).toBe(true);
    expect(isKnownActiveDomain('software_engineering')).toBe(true);
    expect(isKnownActiveDomain('')).toBe(false);
    expect(isKnownActiveDomain(null)).toBe(false);
    expect(isKnownActiveDomain(undefined)).toBe(false);
  });
});
