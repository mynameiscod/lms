/**
 * The legacy career-profile prompt must not contradict the join form.
 *
 * The prompt predates the academic-year question. It re-derived career stage from its own
 * two fields — program and graduation date — without degree or year, so whatever it
 * computed silently overwrote what the member had already answered at signup.
 *
 * A member whose record read "B.Tech, 2nd Year" ticked "I have already graduated" and was
 * staged as a job seeker. That handed them a JOB_SEEKER paper drawing on ADVANCED skills,
 * generation failed on a skill they never chose, and the error surfaced three screens later
 * as "not enough mapped questions for DB_INDEXING".
 */

const findById = jest.fn();
const updateOne = jest.fn();

jest.mock('../models/User', () => ({
  __esModule: true,
  default: {
    findById: (...a: any[]) => findById(...a),
    updateOne: (...a: any[]) => { updateOne(...a); return Promise.resolve({}); },
  },
}));

import { getCareerProfileStatus, setCareerProfile } from '../controllers/passportController';

const lean = (doc: any) => ({ select: () => ({ lean: async () => doc }) });

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const reqWith = (body: any = {}) => ({ body, user: { id: 'student-a' }, userId: 'student-a' } as any);

beforeEach(() => {
  findById.mockReset();
  updateOne.mockReset();
});

/** What `passport.stage` was set to on the last write. */
const stageWritten = () => {
  const call = updateOne.mock.calls.at(-1);
  return call?.[1]?.$set?.['passport.stage'];
};
const graduatedWritten = () => {
  const call = updateOne.mock.calls.at(-1);
  return call?.[1]?.$set?.['passport.graduated'];
};

describe('"I have already graduated" against a studying academic year', () => {
  it('does NOT stage a 2nd-year B.Tech as a job seeker', async () => {
    // The exact production case.
    findById.mockReturnValue(lean({ passport: { degree: 'B.Tech', yearOfStudy: '2nd Year' } }));
    const res = mockRes();

    await setCareerProfile(reqWith({ program: 'B.Tech', branch: 'CSE', graduated: true }), res);

    expect(graduatedWritten()).toBe(false);        // the tick is refused
    expect(stageWritten()).toBe('build');          // position wins
  });

  it('still honours "graduated" when the year agrees', async () => {
    findById.mockReturnValue(lean({ passport: { degree: 'B.Tech', yearOfStudy: 'Graduated' } }));
    const res = mockRes();

    await setCareerProfile(reqWith({ program: 'B.Tech', branch: 'CSE', graduated: true }), res);

    expect(graduatedWritten()).toBe(true);
    expect(stageWritten()).toBe('job_seeker');
  });

  it('still honours "graduated" when no academic year was ever collected', async () => {
    // The members this prompt exists for — pre-dating the year question.
    findById.mockReturnValue(lean({ passport: {} }));
    const res = mockRes();

    await setCareerProfile(reqWith({ program: 'B.Tech', branch: 'CSE', graduated: true }), res);

    expect(graduatedWritten()).toBe(true);
    expect(stageWritten()).toBe('job_seeker');
  });

  it('uses the academic year rather than the graduation date for a current student', async () => {
    // A far-future date would otherwise read as 'foundation' for a 3rd year.
    findById.mockReturnValue(lean({ passport: { degree: 'B.Tech', yearOfStudy: '3rd Year' } }));
    const res = mockRes();

    await setCareerProfile(
      reqWith({ program: 'B.Tech', branch: 'CSE', graduated: false, graduationYear: 2030, graduationMonth: 5 }),
      res,
    );

    expect(stageWritten()).toBe('build');
  });
});

describe('the prompt is not shown when the answer is already known', () => {
  it('derives and caches the stage instead of asking', async () => {
    findById.mockReturnValue(lean({ passport: { degree: 'B.Tech', yearOfStudy: '2nd Year' } }));
    const res = mockRes();

    await getCareerProfileStatus(reqWith(), res);

    const body = res.json.mock.calls[0][0];
    expect(body.needed).toBe(false);       // banner suppressed
    expect(body.stage).toBe('build');
    expect(stageWritten()).toBe('build');  // cached for the engines that read it
  });

  it('still asks when there is genuinely nothing to derive from', async () => {
    findById.mockReturnValue(lean({ passport: {} }));
    const res = mockRes();

    await getCareerProfileStatus(reqWith(), res);

    expect(res.json.mock.calls[0][0].needed).toBe(true);
    expect(updateOne).not.toHaveBeenCalled();
  });

  it('never overwrites a stage that is already recorded', async () => {
    findById.mockReturnValue(lean({ passport: { stage: 'placement', degree: 'B.Tech', yearOfStudy: '2nd Year' } }));
    const res = mockRes();

    await getCareerProfileStatus(reqWith(), res);

    expect(res.json.mock.calls[0][0].stage).toBe('placement');
    expect(updateOne).not.toHaveBeenCalled();
  });
});
