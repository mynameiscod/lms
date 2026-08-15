/**
 * Completion is refused BEFORE it is written.
 *
 * Regression cover for a real defect: updateCareerContext set contextCompletedAt and
 * saved, and the controller returned 400 afterwards. The member was told they were not
 * finished while the database recorded that they were — and every later module reads that
 * flag. These assert the guarantee at the service, so a caller that forgets to check
 * still cannot produce a false completion.
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

import { updateCareerContext } from '../services/careerContextService';

const NOW = new Date('2026-08-15T00:00:00Z');

/**
 * updateCareerContext awaits User.findOne directly (a document, to mutate and save),
 * while getCareerContext chains .select().lean(). One mock has to answer both shapes,
 * so this is a promise carrying an extra `select`.
 */
function userHandle(doc: any) {
  const thenable: any = Promise.resolve(doc);
  thenable.select = () => ({ lean: async () => doc });
  return thenable;
}

function memberDoc(passport: any) {
  const doc: any = {
    _id: 'student-a',
    passport,
    markModified: jest.fn(),
    save: jest.fn(async () => doc),
  };
  return doc;
}

const lean = (v: any) => ({ select: () => ({ lean: async () => v }), lean: async () => v });

beforeEach(() => {
  findOneUser.mockReset();
  findOneProfile.mockReset();
  updateOneProfile.mockReset();
  findOneProfile.mockReturnValue(lean(null));
  updateOneProfile.mockResolvedValue({});
});

describe('complete:true with required answers still missing', () => {
  it('reports what is missing and never sets contextCompletedAt', async () => {
    // Has a course and a year, but no availability — one required answer short.
    const doc = memberDoc({ degree: 'B.Tech', yearOfStudy: '1st Year' });
    findOneUser.mockReturnValue(userHandle(doc));

    const { context, missing } = await updateCareerContext(
      'tenant-1', 'student-a', { primaryRole: 'BACKEND_ENGINEER', complete: true }, NOW,
    );

    expect(missing).toEqual(['availability.minutesPerDay']);
    expect(doc.passport.contextCompletedAt).toBeUndefined();
    expect(doc.passport.contextVersion).toBeUndefined();
    expect(context!.status.onboardingCompleted).toBe(false);
    expect(context!.status.completedAt).toBeNull();
  });

  it('still saves the answers that WERE supplied — a partial step is not a failure', async () => {
    const doc = memberDoc({ degree: 'B.Tech', yearOfStudy: '1st Year' });
    findOneUser.mockReturnValue(userHandle(doc));

    await updateCareerContext('tenant-1', 'student-a', { primaryRole: 'QA_SDET', complete: true }, NOW);

    expect(doc.passport.primaryRole).toBe('QA_SDET');
    expect(doc.save).toHaveBeenCalled();
  });

  it('does not write completion on the save it does perform', async () => {
    // The defect was ordering: the flag went in before anyone checked. Assert that at the
    // moment of every save, the flag is absent.
    const doc = memberDoc({ degree: 'B.Tech', yearOfStudy: '1st Year' });
    const seen: any[] = [];
    doc.save = jest.fn(async () => { seen.push(doc.passport.contextCompletedAt); return doc; });
    findOneUser.mockReturnValue(userHandle(doc));

    await updateCareerContext('tenant-1', 'student-a', { complete: true }, NOW);

    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every(v => v === undefined)).toBe(true);
  });

  it('lists every missing answer, not just the first', async () => {
    const doc = memberDoc({});                       // nothing known at all
    findOneUser.mockReturnValue(userHandle(doc));

    const { missing } = await updateCareerContext('tenant-1', 'student-a', { complete: true }, NOW);

    expect(missing).toEqual(expect.arrayContaining([
      'education.degree', 'education.currentAcademicYear', 'availability.minutesPerDay',
    ]));
    expect(doc.passport.contextCompletedAt).toBeUndefined();
  });
});

describe('complete:true when everything required is answered', () => {
  it('records the completion and reports no refusal', async () => {
    const doc = memberDoc({ degree: 'B.Tech', yearOfStudy: '1st Year' });
    findOneUser.mockReturnValue(userHandle(doc));

    const { context, missing } = await updateCareerContext(
      'tenant-1', 'student-a',
      { primaryRole: 'BACKEND_ENGINEER', minutesPerDay: 60, complete: true },
      NOW,
    );

    expect(missing).toBeUndefined();
    expect(doc.passport.contextCompletedAt).toEqual(NOW);
    expect(context!.status.onboardingCompleted).toBe(true);
  });

  it('is satisfied by a degree that lives only on StudentProfile', async () => {
    // Completeness is judged on the MERGED view, which is why it cannot be decided from
    // the patch alone: this member never sends a degree and is complete regardless.
    const doc = memberDoc({ yearOfStudy: '2nd Year' });
    findOneUser.mockReturnValue(userHandle(doc));
    findOneProfile.mockReturnValue(lean({ education: { degree: { name: 'B.Sc', branch: 'Computer Science' } } }));

    const { missing } = await updateCareerContext(
      'tenant-1', 'student-a', { primaryRole: 'NOT_SURE', minutesPerDay: 30, complete: true }, NOW,
    );

    expect(missing).toBeUndefined();
    expect(doc.passport.contextCompletedAt).toEqual(NOW);
  });

  it('keeps the FIRST completion date when completed again', async () => {
    const earlier = new Date('2026-01-01T00:00:00Z');
    const doc = memberDoc({ degree: 'B.Tech', yearOfStudy: '1st Year', minutesPerDay: 60, contextCompletedAt: earlier });
    findOneUser.mockReturnValue(userHandle(doc));

    await updateCareerContext('tenant-1', 'student-a', { primaryRole: 'NOT_SURE', complete: true }, NOW);

    expect(doc.passport.contextCompletedAt).toEqual(earlier);
  });
});

describe('a save without complete:true', () => {
  it('never marks anyone complete, however much it supplies', async () => {
    const doc = memberDoc({ degree: 'B.Tech', yearOfStudy: '1st Year' });
    findOneUser.mockReturnValue(userHandle(doc));

    const { context, missing } = await updateCareerContext(
      'tenant-1', 'student-a', { primaryRole: 'BACKEND_ENGINEER', minutesPerDay: 60 }, NOW,
    );

    expect(missing).toBeUndefined();                       // nothing was refused
    expect(doc.passport.contextCompletedAt).toBeUndefined();
    expect(context!.status.onboardingCompleted).toBe(false);
  });
});

describe('a member of another tenant', () => {
  it('returns no context and writes nothing', async () => {
    findOneUser.mockReturnValue(userHandle(null));

    const { context, missing } = await updateCareerContext(
      'tenant-2', 'student-a', { complete: true }, NOW,
    );

    expect(context).toBeNull();
    expect(missing).toBeUndefined();
    expect(findOneUser).toHaveBeenCalledWith({ _id: 'student-a', tenantId: 'tenant-2' });
  });
});
