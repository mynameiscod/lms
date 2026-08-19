/**
 * Registration context is reused, not re-collected.
 *
 * Joining CareerPilot already asks for degree, branch and academic year. Onboarding then
 * opened by asking for all three again. These pin the contract that removal rests on:
 * `status.missing` is what decides whether the Education step is shown, and a member who
 * supplied academic details at registration must be able to reach contextCompletedAt
 * without submitting them a second time.
 *
 * The step list lives in React but the RULE lives here — that is the point. If these
 * change, CareerSetup changes with them, because it reads this list rather than its own.
 */

const findOneUser = jest.fn();
const findOneProfile = jest.fn();
const updateOneProfile = jest.fn();

jest.mock('../models/User', () => ({
  __esModule: true,
  default: { findOne: (...a: any[]) => findOneUser(...a) },
}));
jest.mock('../models/StudentProfile', () => ({
  __esModule: true,
  default: {
    findOne: (...a: any[]) => findOneProfile(...a),
    updateOne: (...a: any[]) => updateOneProfile(...a),
  },
}));
jest.mock('../models/CareerRole', () => {
  const actual = jest.requireActual('../models/CareerRole');
  const role = (key: string) => ({
    tenantId: 't', key, domainKey: 'SOFTWARE_ENGINEERING', name: key,
    active: true, studentSelectable: true,
  });
  return {
    __esModule: true, ...actual,
    default: {
      find: () => ({ sort: () => ({ lean: async () => [] }), select: () => ({ lean: async () => [] }), lean: async () => [] }),
      findOne: ({ key }: any) => ({ lean: async () => role(key) }),
      insertMany: async () => [],
    },
  };
});

import { getCareerContext, updateCareerContext } from '../services/careerContextService';

const NOW = new Date('2026-08-19T00:00:00Z');

function userHandle(doc: any) {
  const thenable: any = Promise.resolve(doc);
  thenable.select = () => ({ lean: async () => doc });
  return thenable;
}

function memberDoc(passport: any) {
  const doc: any = { _id: 'student-a', passport, markModified: jest.fn(), save: jest.fn(async () => doc) };
  return doc;
}

const lean = (v: any) => ({ select: () => ({ lean: async () => v }), lean: async () => v });

/** Exactly what publicPassportController.signup writes for a fully-filled join form. */
const REGISTERED = {
  product: 'career_passport', active: true, onboarded: true,
  degree: 'B.Tech', branch: 'Computer Science / IT', yearOfStudy: '3rd Year',
  careerGoal: 'Software Development',
};

/** The same rule CareerSetup applies to decide whether to show the Education step. */
const educationMissing = (missing: string[]) =>
  missing.includes('education.degree') || missing.includes('education.currentAcademicYear');

beforeEach(() => {
  findOneUser.mockReset();
  findOneProfile.mockReset();
  updateOneProfile.mockReset();
  findOneProfile.mockReturnValue(lean(null));
  updateOneProfile.mockResolvedValue({});
});

describe('a member who completed registration', () => {
  it('has their degree, branch, year and broad goal readable from the context', async () => {
    findOneUser.mockReturnValue(userHandle(memberDoc({ ...REGISTERED })));
    const ctx = (await getCareerContext('t1', 'student-a', NOW))!;

    expect(ctx.education.degree).toBe('B.Tech');
    expect(ctx.education.branch).toBe('Computer Science / IT');
    expect(ctx.education.currentAcademicYear).toBe('3rd Year');
    expect(ctx.career.careerGoal).toBe('Software Development');
  });

  it('still has a derived career stage — staging is unaffected by this change', async () => {
    findOneUser.mockReturnValue(userHandle(memberDoc({ ...REGISTERED })));
    const ctx = (await getCareerContext('t1', 'student-a', NOW))!;
    expect(ctx.derived.stage).toBeTruthy();
  });

  it('is NOT asked for education again — setup starts at Direction', async () => {
    findOneUser.mockReturnValue(userHandle(memberDoc({ ...REGISTERED })));
    const ctx = (await getCareerContext('t1', 'student-a', NOW))!;

    expect(educationMissing(ctx.status.missing)).toBe(false);
    // Only availability is reported. `career.domain` always resolves (normalizeDomain
    // falls back to the single V1 domain) and an un-chosen role reads as NOT_SURE rather
    // than blank, so neither can ever appear here.
    //
    // This is precisely why CareerSetup conditions ONLY the Education step on `missing`
    // and always shows Direction/Technology/Commitment: `missing` answers "can this member
    // complete?", not "what should we ask?". Choosing a role stays a question the screen
    // insists on even though the server would accept NOT_SURE.
    expect(ctx.status.missing).toEqual(['availability.minutesPerDay']);
  });

  it('reaches contextCompletedAt without ever resubmitting education', async () => {
    const doc = memberDoc({ ...REGISTERED });
    findOneUser.mockReturnValue(userHandle(doc));

    // Direction, then Technology, then Commitment — no education in any patch.
    await updateCareerContext('t1', 'student-a', { primaryRole: 'BACKEND_ENGINEER' }, NOW);
    await updateCareerContext('t1', 'student-a', { preferredProgrammingLanguages: ['Java'] }, NOW);
    const { context, missing } = await updateCareerContext(
      't1', 'student-a', { minutesPerDay: 60, complete: true }, NOW,
    );

    expect(missing).toBeUndefined();
    expect(doc.passport.contextCompletedAt).toBeInstanceOf(Date);
    expect(context!.status.onboardingCompleted).toBe(true);
    // Untouched throughout.
    expect(doc.passport.degree).toBe('B.Tech');
    expect(doc.passport.yearOfStudy).toBe('3rd Year');
  });
});

describe('a member missing academic details', () => {
  it('shows the Education repair step when degree is absent', async () => {
    findOneUser.mockReturnValue(userHandle(memberDoc({ product: 'career_passport', yearOfStudy: '2nd Year' })));
    const ctx = (await getCareerContext('t1', 'student-a', NOW))!;
    expect(ctx.status.missing).toContain('education.degree');
    expect(educationMissing(ctx.status.missing)).toBe(true);
  });

  it('shows the Education repair step when the academic year is absent', async () => {
    findOneUser.mockReturnValue(userHandle(memberDoc({ product: 'career_passport', degree: 'BCA' })));
    const ctx = (await getCareerContext('t1', 'student-a', NOW))!;
    expect(ctx.status.missing).toContain('education.currentAcademicYear');
    expect(educationMissing(ctx.status.missing)).toBe(true);
  });

  it('does NOT force repair merely because branch is absent — branch stays optional', async () => {
    const { branch, ...noBranch } = REGISTERED;
    findOneUser.mockReturnValue(userHandle(memberDoc(noBranch)));
    const ctx = (await getCareerContext('t1', 'student-a', NOW))!;

    expect(ctx.status.missing).not.toContain('education.branch');
    expect(educationMissing(ctx.status.missing)).toBe(false);
  });

  it('can repair and then complete — a legacy member is never stuck', async () => {
    const doc = memberDoc({ product: 'career_passport' });
    findOneUser.mockReturnValue(userHandle(doc));

    await updateCareerContext('t1', 'student-a', { degree: 'MCA', currentAcademicYear: '1st Year' }, NOW);
    const { missing } = await updateCareerContext(
      't1', 'student-a', { primaryRole: 'QA_SDET', minutesPerDay: 30, complete: true }, NOW,
    );

    expect(missing).toBeUndefined();
    expect(doc.passport.contextCompletedAt).toBeInstanceOf(Date);
  });
});

describe('registration data is never clobbered', () => {
  it('a blank degree in a patch does not erase the registered one', async () => {
    // The client no longer sends education it did not ask for, but the guarantee has to
    // hold at the service: a stray blank must never overwrite a real answer.
    const doc = memberDoc({ ...REGISTERED });
    findOneUser.mockReturnValue(userHandle(doc));

    await updateCareerContext('t1', 'student-a', { degree: '', currentAcademicYear: '', branch: '' }, NOW);

    expect(doc.passport.degree).toBe('B.Tech');
    expect(doc.passport.yearOfStudy).toBe('3rd Year');
    expect(doc.passport.branch).toBe('Computer Science / IT');
  });

  it('walking Direction → Technology → Commitment leaves education untouched', async () => {
    const doc = memberDoc({ ...REGISTERED });
    findOneUser.mockReturnValue(userHandle(doc));

    await updateCareerContext('t1', 'student-a', { primaryRole: 'FRONTEND_ENGINEER' }, NOW);
    await updateCareerContext('t1', 'student-a', { preferredProgrammingLanguages: ['JavaScript'] }, NOW);
    await updateCareerContext('t1', 'student-a', { minutesPerDay: 90 }, NOW);

    expect(doc.passport.degree).toBe('B.Tech');
    expect(doc.passport.branch).toBe('Computer Science / IT');
    expect(doc.passport.yearOfStudy).toBe('3rd Year');
    expect(doc.passport.careerGoal).toBe('Software Development');
  });
});

describe('career goal and career role stay separate concepts', () => {
  it('a broad goal is never promoted into a specific role', async () => {
    // careerGoal is an interest signal from registration; primaryRole is the student's
    // chosen destination. Inferring one from the other would put words in their mouth.
    findOneUser.mockReturnValue(userHandle(memberDoc({ ...REGISTERED })));
    const ctx = (await getCareerContext('t1', 'student-a', NOW))!;

    expect(ctx.career.careerGoal).toBe('Software Development');
    // "Software Development" as a broad goal does NOT become SOFTWARE_ENGINEER. An
    // un-chosen role reads as NOT_SURE, which is also why it never shows up in `missing`.
    expect(ctx.career.primaryRole).toBe('NOT_SURE');
    expect(ctx.status.missing).not.toContain('career.primaryRole');
  });
});
