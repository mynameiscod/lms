/**
 * Module 2 — Career Role configuration.
 *
 * Models are mocked so this runs without a database, in line with the Module 1 suites.
 * What matters here is the RULES: which roles a student may pick, which they may keep,
 * and what a stored key survives. Those are decisions, and a decision that only holds
 * when Mongo is running is a decision nobody can check.
 */

const findRole = jest.fn();
const findOneRole = jest.fn();
const insertManyRole = jest.fn();
const countUsers = jest.fn();

jest.mock('../models/CareerRole', () => {
  const actual = jest.requireActual('../models/CareerRole');
  return {
    __esModule: true,
    ...actual,
    default: {
      find: (...a: any[]) => findRole(...a),
      findOne: (...a: any[]) => findOneRole(...a),
      insertMany: (...a: any[]) => insertManyRole(...a),
    },
  };
});
jest.mock('../models/User', () => ({
  __esModule: true,
  default: { countDocuments: (...a: any[]) => countUsers(...a) },
}));

import {
  getSelectableCareerRoles, validateCareerRole, resolveCareerRoleLabel,
  isValidRoleKey, suggestRoleKey, countMembersWithRole, NOT_SURE_OPTION,
} from '../services/careerRoleService';
import { SYSTEM_CAREER_ROLES, CAREER_ROLE_KEY_PATTERN } from '../models/CareerRole';
import { ROLE_NOT_SURE } from '../services/careerDomainService';

const ROLE = (over: any = {}) => ({
  tenantId: 't1', domainKey: 'SOFTWARE_ENGINEERING',
  key: 'BACKEND_ENGINEER', name: 'Backend Engineer',
  description: 'Build APIs and server-side systems.',
  studentDescription: 'APIs · Databases · Server-side systems',
  displayOrder: 20, active: true, studentSelectable: true, systemRole: true,
  ...over,
});

/** find() is chained .sort().lean() in the service, and .select().lean() in the seeder. */
const findResult = (rows: any[]) => ({
  sort: () => ({ lean: async () => rows }),
  select: () => ({ lean: async () => rows }),
  lean: async () => rows,
});
const oneResult = (row: any) => ({ lean: async () => row });

beforeEach(() => {
  findRole.mockReset(); findOneRole.mockReset(); insertManyRole.mockReset(); countUsers.mockReset();
  // Default: every system role already seeded, so ensureCareerRoles inserts nothing.
  findRole.mockReturnValue(findResult(SYSTEM_CAREER_ROLES.map(r => ROLE(r))));
  findOneRole.mockReturnValue(oneResult(null));
  insertManyRole.mockResolvedValue([]);
  countUsers.mockResolvedValue(0);
});

describe('the shared role vocabulary', () => {
  it('carries exactly the keys Module 1 shipped, so stored values still resolve', () => {
    // A student holding any of these must land on a real record the moment this seeds.
    expect(SYSTEM_CAREER_ROLES.map(r => r.key).sort()).toEqual([
      'BACKEND_ENGINEER', 'CLOUD_DEVOPS', 'FRONTEND_ENGINEER', 'FULLSTACK_ENGINEER',
      'MOBILE_ENGINEER', 'QA_SDET', 'SOFTWARE_ENGINEER',
    ]);
  });

  it('does not include NOT_SURE — it is an onboarding option, not a career', () => {
    expect(SYSTEM_CAREER_ROLES.some(r => r.key === ROLE_NOT_SURE)).toBe(false);
  });

  it('gives every seeded role a student-facing description', () => {
    for (const r of SYSTEM_CAREER_ROLES) {
      expect(String(r.description || '').length).toBeGreaterThan(20);
      expect(String(r.studentDescription || '').length).toBeGreaterThan(0);
    }
  });
});

describe('role keys', () => {
  it.each(['BACKEND_ENGINEER', 'PLATFORM_ENGINEER', 'QA_SDET', 'SRE'])('accepts %s', (k) => {
    expect(isValidRoleKey(k)).toBe(true);
  });

  it.each(['Backend Engineer', 'Backend Engineer!', 'backend-engineer', '_LEADING', 'TRAILING_', 'A__B'])(
    'rejects %s', (k) => {
      expect(CAREER_ROLE_KEY_PATTERN.test(k)).toBe(false);
    });

  it('suggests a key from a name without forcing it', () => {
    expect(suggestRoleKey('Platform Engineer')).toBe('PLATFORM_ENGINEER');
    expect(suggestRoleKey('QA / SDET Engineer')).toBe('QA_SDET_ENGINEER');
    expect(suggestRoleKey('  Site Reliability Engineer  ')).toBe('SITE_RELIABILITY_ENGINEER');
  });
});

describe('what a student is offered', () => {
  it('leads with "not sure", then configured roles in display order', async () => {
    findRole.mockReturnValue(findResult([
      ROLE({ key: 'SOFTWARE_ENGINEER', name: 'Software Engineer', displayOrder: 10 }),
      ROLE({ key: 'BACKEND_ENGINEER', name: 'Backend Engineer', displayOrder: 20 }),
    ]));

    const roles = await getSelectableCareerRoles('t1', 'SOFTWARE_ENGINEERING');

    expect(roles[0].key).toBe(ROLE_NOT_SURE);
    expect(roles.map(r => r.key)).toEqual([ROLE_NOT_SURE, 'SOFTWARE_ENGINEER', 'BACKEND_ENGINEER']);
  });

  it('asks the database only for active, selectable roles in the right domain', async () => {
    await getSelectableCareerRoles('t1', 'SOFTWARE_ENGINEERING');

    // The filter is the guarantee — assert on the query, not just the rows returned.
    const query = findRole.mock.calls[findRole.mock.calls.length - 1][0];
    expect(query).toMatchObject({
      tenantId: 't1', domainKey: 'SOFTWARE_ENGINEERING', active: true, studentSelectable: true,
    });
  });

  it('still offers "not sure" when an admin has disabled everything', async () => {
    // §41: onboarding must never become impossible to finish.
    findRole.mockReturnValue(findResult([]));
    const roles = await getSelectableCareerRoles('t1', 'SOFTWARE_ENGINEERING');

    expect(roles).toHaveLength(1);
    expect(roles[0].key).toBe(ROLE_NOT_SURE);
  });

  it('exposes no admin metadata to students', async () => {
    findRole.mockReturnValue(findResult([ROLE({ systemRole: true, updatedBy: 'admin@x.com' })]));
    const roles = await getSelectableCareerRoles('t1', 'SOFTWARE_ENGINEERING');

    for (const r of roles) {
      expect(Object.keys(r).sort()).toEqual(['blurb', 'iconKey', 'key', 'label'].filter(k => k in r).sort());
      expect(r).not.toHaveProperty('systemRole');
      expect(r).not.toHaveProperty('updatedBy');
      expect(r).not.toHaveProperty('active');
    }
  });
});

describe('validating a NEW selection', () => {
  it('accepts an active, selectable role in the right domain', async () => {
    findOneRole.mockReturnValue(oneResult(ROLE()));
    expect(await validateCareerRole('t1', 'SOFTWARE_ENGINEERING', 'BACKEND_ENGINEER')).toEqual({ ok: true });
  });

  it('accepts NOT_SURE without consulting configuration at all', async () => {
    const r = await validateCareerRole('t1', 'SOFTWARE_ENGINEERING', ROLE_NOT_SURE);
    expect(r.ok).toBe(true);
    expect(findOneRole).not.toHaveBeenCalled();
  });

  it('rejects a role that does not exist', async () => {
    findOneRole.mockReturnValue(oneResult(null));
    const r = await validateCareerRole('t1', 'SOFTWARE_ENGINEERING', 'SOME_FAKE_ROLE');
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/does not exist/i);
  });

  it('rejects an inactive role', async () => {
    findOneRole.mockReturnValue(oneResult(ROLE({ active: false })));
    const r = await validateCareerRole('t1', 'SOFTWARE_ENGINEERING', 'BACKEND_ENGINEER');
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/no longer available/i);
  });

  it('rejects a role hidden from students', async () => {
    findOneRole.mockReturnValue(oneResult(ROLE({ studentSelectable: false })));
    const r = await validateCareerRole('t1', 'SOFTWARE_ENGINEERING', 'QA_SDET');
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/not currently open/i);
  });

  it('rejects a role belonging to another domain', async () => {
    findOneRole.mockReturnValue(oneResult(ROLE({ domainKey: 'HEALTHCARE' })));
    const r = await validateCareerRole('t1', 'SOFTWARE_ENGINEERING', 'BACKEND_ENGINEER');
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/does not belong/i);
  });

  it('is case-insensitive so a lowercase submission is not a silent failure', async () => {
    findOneRole.mockReturnValue(oneResult(ROLE()));
    expect((await validateCareerRole('t1', 'SOFTWARE_ENGINEERING', 'backend_engineer')).ok).toBe(true);
    expect(findOneRole).toHaveBeenCalledWith({ tenantId: 't1', key: 'BACKEND_ENGINEER' });
  });

  it('scopes every lookup by tenant', async () => {
    findOneRole.mockReturnValue(oneResult(ROLE()));
    await validateCareerRole('t2', 'SOFTWARE_ENGINEERING', 'BACKEND_ENGINEER');
    expect(findOneRole).toHaveBeenCalledWith({ tenantId: 't2', key: 'BACKEND_ENGINEER' });
  });
});

describe('a role a student ALREADY holds', () => {
  it('still resolves for display after being hidden from new students', async () => {
    // The 1,200-student case: withdrawing a role must not erase anybody's answer.
    findOneRole.mockReturnValue(oneResult(ROLE({ key: 'QA_SDET', name: 'QA / SDET Engineer', studentSelectable: false })));

    const shown = await resolveCareerRoleLabel('t1', 'QA_SDET');
    expect(shown).toEqual(expect.objectContaining({ key: 'QA_SDET', label: 'QA / SDET Engineer' }));
  });

  it('still resolves after being deactivated entirely', async () => {
    findOneRole.mockReturnValue(oneResult(ROLE({ active: false, studentSelectable: false })));
    const shown = await resolveCareerRoleLabel('t1', 'BACKEND_ENGINEER');
    expect(shown!.label).toBe('Backend Engineer');
  });

  it('shows a readable name even for a key with no record left', async () => {
    findOneRole.mockReturnValue(oneResult(null));
    const shown = await resolveCareerRoleLabel('t1', 'LEGACY_ROLE_KEY');
    expect(shown).toEqual(expect.objectContaining({ key: 'LEGACY_ROLE_KEY', label: 'Legacy Role Key' }));
  });

  it('renders NOT_SURE as the onboarding option', async () => {
    expect(await resolveCareerRoleLabel('t1', ROLE_NOT_SURE)).toEqual(NOT_SURE_OPTION);
  });
});

describe('member reference counts', () => {
  it('counts primary AND secondary holders, scoped to the tenant', async () => {
    countUsers.mockResolvedValue(1200);
    expect(await countMembersWithRole('t1', 'BACKEND_ENGINEER')).toBe(1200);
    expect(countUsers).toHaveBeenCalledWith({
      tenantId: 't1',
      $or: [{ 'passport.primaryRole': 'BACKEND_ENGINEER' }, { 'passport.secondaryRole': 'BACKEND_ENGINEER' }],
    });
  });
});

describe('seeding', () => {
  it('inserts only the keys a tenant is missing, never overwriting an edited one', async () => {
    findRole.mockReturnValue(findResult([{ key: 'BACKEND_ENGINEER' }, { key: 'SOFTWARE_ENGINEER' }]));
    await getSelectableCareerRoles('t1', 'SOFTWARE_ENGINEERING');

    const inserted = insertManyRole.mock.calls[0][0].map((r: any) => r.key);
    expect(inserted).not.toContain('BACKEND_ENGINEER');   // already there — left alone
    expect(inserted).toContain('QA_SDET');
    expect(inserted.every((k: string) => insertManyRole.mock.calls[0][0].find((r: any) => r.key === k).systemRole)).toBe(true);
  });

  it('does nothing at all when every role is present', async () => {
    await getSelectableCareerRoles('t1', 'SOFTWARE_ENGINEERING');
    expect(insertManyRole).not.toHaveBeenCalled();
  });
});
