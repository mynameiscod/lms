/**
 * Where Module 2 meets Module 1 — role configuration reaching the student context.
 *
 * The acceptance scenarios live here because they span both: an admin changes
 * configuration, and what matters is what happens to a STUDENT. Testing either side
 * alone would miss the case that motivated the module — a role withdrawn from new
 * students must not erase the answer of everyone already holding it.
 */

const findOneUser = jest.fn();
const findOneProfile = jest.fn();
const updateOneProfile = jest.fn();
const findOneRole = jest.fn();
const findRole = jest.fn();
const insertManyRole = jest.fn();

jest.mock('../models/User', () => ({
  __esModule: true,
  default: { findOne: (...a: any[]) => findOneUser(...a), countDocuments: async () => 0 },
}));
jest.mock('../models/StudentProfile', () => ({
  __esModule: true,
  default: { findOne: (...a: any[]) => findOneProfile(...a), updateOne: (...a: any[]) => updateOneProfile(...a) },
}));
jest.mock('../models/CareerRole', () => {
  const actual = jest.requireActual('../models/CareerRole');
  return {
    __esModule: true, ...actual,
    default: {
      find: (...a: any[]) => findRole(...a),
      findOne: (...a: any[]) => findOneRole(...a),
      insertMany: (...a: any[]) => insertManyRole(...a),
    },
  };
});

import { getCareerContext, updateCareerContext } from '../services/careerContextService';
import { ROLE_NOT_SURE } from '../services/careerDomainService';

const NOW = new Date('2026-08-15T00:00:00Z');

function userHandle(doc: any) {
  const thenable: any = Promise.resolve(doc);
  thenable.select = () => ({ lean: async () => doc });
  return thenable;
}
const memberDoc = (passport: any) => {
  const doc: any = { _id: 's1', passport, markModified: jest.fn(), save: jest.fn(async () => doc) };
  return doc;
};
const lean = (v: any) => ({ select: () => ({ lean: async () => v }), lean: async () => v });
const oneResult = (row: any) => ({ lean: async () => row });
const findResult = (rows: any[]) => ({ sort: () => ({ lean: async () => rows }), select: () => ({ lean: async () => rows }), lean: async () => rows });

const ROLE = (over: any = {}) => ({
  tenantId: 't1', domainKey: 'SOFTWARE_ENGINEERING', key: 'BACKEND_ENGINEER',
  name: 'Backend Engineer', description: 'APIs and server-side systems.',
  displayOrder: 20, active: true, studentSelectable: true, systemRole: true, ...over,
});

beforeEach(() => {
  findOneUser.mockReset(); findOneProfile.mockReset(); updateOneProfile.mockReset();
  findOneRole.mockReset(); findRole.mockReset(); insertManyRole.mockReset();
  findOneProfile.mockReturnValue(lean(null));
  updateOneProfile.mockResolvedValue({});
  findRole.mockReturnValue(findResult([]));
  insertManyRole.mockResolvedValue([]);
  findOneRole.mockReturnValue(oneResult(ROLE()));
});

describe('Scenario 3 — a renamed role, with no migration', () => {
  it('shows the new display name while the student still stores the old key', async () => {
    findOneUser.mockReturnValue(userHandle(memberDoc({ primaryRole: 'BACKEND_ENGINEER' })));
    const ctx = await getCareerContext('t1', 's1', NOW);

    // The stored value is the contract and does not move when a name changes.
    expect(ctx!.career.primaryRole).toBe('BACKEND_ENGINEER');
  });
});

describe('Scenario 4 — a role hidden from new students', () => {
  it('leaves an existing holder’s context intact', async () => {
    findOneRole.mockReturnValue(oneResult(ROLE({ key: 'QA_SDET', studentSelectable: false })));
    findOneUser.mockReturnValue(userHandle(memberDoc({ primaryRole: 'QA_SDET', minutesPerDay: 60 })));

    const ctx = await getCareerContext('t1', 's1', NOW);

    expect(ctx!.career.primaryRole).toBe('QA_SDET');       // NOT reset to "not sure"
    expect(ctx!.availability.minutesPerDay).toBe(60);      // nothing else disturbed
  });

  it('stops a NEW student choosing it', async () => {
    findOneRole.mockReturnValue(oneResult(ROLE({ key: 'QA_SDET', studentSelectable: false })));
    const doc = memberDoc({});
    findOneUser.mockReturnValue(userHandle(doc));

    const { invalid } = await updateCareerContext('t1', 's1', { primaryRole: 'QA_SDET' }, NOW);

    expect(invalid).toMatch(/not currently open/i);
    expect(doc.passport.primaryRole).toBeUndefined();      // nothing written
  });
});

describe('Scenario 5 — NOT_SURE', () => {
  it('is accepted and stored', async () => {
    const doc = memberDoc({});
    findOneUser.mockReturnValue(userHandle(doc));

    const { invalid } = await updateCareerContext('t1', 's1', { primaryRole: ROLE_NOT_SURE }, NOW);

    expect(invalid).toBeUndefined();
    expect(doc.passport.primaryRole).toBe(ROLE_NOT_SURE);
  });

  it('never triggers a role lookup — it is not a configured role', async () => {
    findOneUser.mockReturnValue(userHandle(memberDoc({})));
    await updateCareerContext('t1', 's1', { primaryRole: ROLE_NOT_SURE }, NOW);
    expect(findOneRole).not.toHaveBeenCalled();
  });
});

describe('Scenario 6 — a fabricated role from the client', () => {
  it('is rejected by the server, not merely by the form', async () => {
    findOneRole.mockReturnValue(oneResult(null));
    const doc = memberDoc({});
    findOneUser.mockReturnValue(userHandle(doc));

    const { invalid } = await updateCareerContext('t1', 's1', { primaryRole: 'SOME_FAKE_ROLE' }, NOW);

    expect(invalid).toMatch(/does not exist/i);
    expect(doc.passport.primaryRole).toBeUndefined();
  });

  it('does not silently downgrade it to NOT_SURE', async () => {
    // Storing "not sure" for a role somebody deliberately chose would read, to them, as
    // the product losing their answer.
    findOneRole.mockReturnValue(oneResult(null));
    const doc = memberDoc({});
    findOneUser.mockReturnValue(userHandle(doc));

    await updateCareerContext('t1', 's1', { primaryRole: 'SOME_FAKE_ROLE' }, NOW);
    expect(doc.passport.primaryRole).not.toBe(ROLE_NOT_SURE);
  });
});

describe('Scenario 7 — secondary role', () => {
  it('is rejected when it repeats the primary', async () => {
    const doc = memberDoc({});
    findOneUser.mockReturnValue(userHandle(doc));

    const { invalid } = await updateCareerContext(
      't1', 's1', { primaryRole: 'BACKEND_ENGINEER', secondaryRole: 'BACKEND_ENGINEER' }, NOW,
    );

    expect(invalid).toMatch(/different from your first/i);
    expect(doc.passport.secondaryRole).toBeUndefined();
  });

  it('is rejected when it repeats a primary already stored', async () => {
    const doc = memberDoc({ primaryRole: 'BACKEND_ENGINEER' });
    findOneUser.mockReturnValue(userHandle(doc));

    const { invalid } = await updateCareerContext('t1', 's1', { secondaryRole: 'BACKEND_ENGINEER' }, NOW);
    expect(invalid).toMatch(/different from your first/i);
  });

  it('accepts a genuinely different one', async () => {
    findOneRole.mockImplementation(({ key }: any) => oneResult(ROLE({ key })));
    const doc = memberDoc({});
    findOneUser.mockReturnValue(userHandle(doc));

    const { invalid } = await updateCareerContext(
      't1', 's1', { primaryRole: 'BACKEND_ENGINEER', secondaryRole: 'CLOUD_DEVOPS' }, NOW,
    );

    expect(invalid).toBeUndefined();
    expect(doc.passport.secondaryRole).toBe('CLOUD_DEVOPS');
  });

  it('treats "not sure" as no second choice rather than a value', async () => {
    const doc = memberDoc({ primaryRole: 'BACKEND_ENGINEER', secondaryRole: 'CLOUD_DEVOPS' });
    findOneUser.mockReturnValue(userHandle(doc));

    await updateCareerContext('t1', 's1', { secondaryRole: ROLE_NOT_SURE }, NOW);
    expect(doc.passport.secondaryRole).toBeUndefined();
  });

  it('stays optional — omitting it changes nothing', async () => {
    const doc = memberDoc({ primaryRole: 'BACKEND_ENGINEER' });
    findOneUser.mockReturnValue(userHandle(doc));

    const { invalid } = await updateCareerContext('t1', 's1', { minutesPerDay: 60 }, NOW);
    expect(invalid).toBeUndefined();
    expect(doc.passport.secondaryRole).toBeUndefined();
  });
});

describe('an admin-created role reaches students', () => {
  it('is accepted on write and reads back unchanged', async () => {
    // The read path used to clamp against a hardcoded list, so a role added in the admin
    // screen would have read back as "not sure" — the defect this module had to fix.
    findOneRole.mockReturnValue(oneResult(ROLE({ key: 'PLATFORM_ENGINEER', name: 'Platform Engineer', systemRole: false })));
    const doc = memberDoc({});
    findOneUser.mockReturnValue(userHandle(doc));

    const { invalid, context } = await updateCareerContext('t1', 's1', { primaryRole: 'PLATFORM_ENGINEER' }, NOW);

    expect(invalid).toBeUndefined();
    expect(doc.passport.primaryRole).toBe('PLATFORM_ENGINEER');
    expect(context!.career.primaryRole).toBe('PLATFORM_ENGINEER');
  });
});

describe('Module 1 regression — the accepted scenario still resolves', () => {
  it('B.Tech CSE 1st year, Backend Engineer, Java, 60 min/day', async () => {
    const doc = memberDoc({ degree: 'B.Tech', branch: 'CSE', yearOfStudy: '1st Year' });
    findOneUser.mockReturnValue(userHandle(doc));

    const { context, invalid, missing } = await updateCareerContext(
      't1', 's1',
      { primaryRole: 'BACKEND_ENGINEER', preferredProgrammingLanguages: ['Java'], minutesPerDay: 60, complete: true },
      NOW,
    );

    expect(invalid).toBeUndefined();
    expect(missing).toBeUndefined();
    expect(context!.career.primaryRole).toBe('BACKEND_ENGINEER');
    expect(context!.career.preferredProgrammingLanguages).toEqual(['Java']);
    expect(context!.availability.minutesPerDay).toBe(60);
    expect(context!.derived.stage).toBe('foundation');
    expect(context!.derived.background).toBe('cs');
    expect(context!.status.onboardingCompleted).toBe(true);
  });
});

describe('configuration changes have no side effects on a member', () => {
  it('a rejected role leaves every other stored value untouched', async () => {
    findOneRole.mockReturnValue(oneResult(null));
    const doc = memberDoc({
      primaryRole: 'BACKEND_ENGINEER', minutesPerDay: 60,
      degree: 'B.Tech', yearOfStudy: '2nd Year', stage: 'build', contextCompletedAt: NOW,
    });
    findOneUser.mockReturnValue(userHandle(doc));

    await updateCareerContext('t1', 's1', { primaryRole: 'NONSENSE' }, NOW);

    expect(doc.passport.primaryRole).toBe('BACKEND_ENGINEER');
    expect(doc.passport.minutesPerDay).toBe(60);
    expect(doc.passport.contextCompletedAt).toEqual(NOW);
    expect(doc.save).not.toHaveBeenCalled();          // rejected before any write
  });
});
