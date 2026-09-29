/**
 * Readiness answers about the stage it was ASKED about — not always about Foundation.
 *
 * Both assertions here cover defects that were invisible while Foundation was the only stage on
 * the unit engine, and that only surfaced when Years 2, 3 and 4 were switched on in production.
 *
 *   THE LENGTH. The unit counts were made stage-aware when `build` joined; the programme length
 *   was not, and stayed `programDaysFor(tenantId, 'foundation')`. A tenant with 100 published
 *   Build units passed a check against Foundation's 90 and was then refused by the composer,
 *   which needs 110. Two reports of one failure, and only the later one true.
 *
 *   THE NAME. The label map held `foundation` and `build` and fell back to 'Foundation'. A
 *   final-year read "Your Foundation curriculum has not been set up" — which names a real stage,
 *   so nobody reading it could tell it was the wrong one.
 *
 * The counts are mocked per stage. What is under test is which QUESTION readiness asks, so the
 * answers are fixtures and the assertions are about the arguments and the wording.
 */

const counts: Record<string, number> = {};
jest.mock('../models/CurriculumLearningUnit', () => ({
  __esModule: true,
  default: {
    countDocuments: async (q: any) => counts[String(q.stageKey)] ?? 0,
  },
}));
jest.mock('../models/SkillEvidence', () => ({
  __esModule: true,
  default: { countDocuments: async () => 25 },
}));

const programDaysFor = jest.fn(async (_t: string, stage?: string | null) => (
  { foundation: 90, build: 110, specialize: 130, placement: 150 }[String(stage)] ?? 90
));
jest.mock('../services/foundationProgramLengthService', () => ({
  __esModule: true,
  programDaysFor: (...a: any[]) => (programDaysFor as any)(...a),
  foundationProgramDaysFor: (t: string) => (programDaysFor as any)(t, 'foundation'),
}));

import { foundationReadiness, notConfiguredForStudent } from '../services/foundationReadinessService';

beforeEach(() => {
  for (const k of Object.keys(counts)) delete counts[k];
  programDaysFor.mockClear();
});

describe('readiness asks about the stage it was given', () => {
  it('measures a stage against its OWN programme length, not Foundation\'s', async () => {
    // Enough for Foundation's ninety. Not enough for Build's hundred and ten.
    counts.build = 100;

    const r = await foundationReadiness('t1', 'build');

    expect(programDaysFor).toHaveBeenCalledWith('t1', 'build');
    expect(r.configured).toBe(false);
    expect(r.reason).toBe('NO_PRODUCTION_CURRICULUM');
    // The number it reports back is the one the composer will actually demand.
    expect(r.message).toContain('110');
    expect(r.message).not.toContain('at least 90');
  });

  it('passes a stage that does reach its own length', async () => {
    counts.specialize = 130;
    const r = await foundationReadiness('t1', 'specialize');
    expect(programDaysFor).toHaveBeenCalledWith('t1', 'specialize');
    expect(r.configured).toBe(true);
    expect(r.reason).toBeNull();
  });

  it('counts the units of that stage and no other', async () => {
    counts.foundation = 400;   // plenty — and irrelevant to a placement learner
    counts.placement = 10;
    const r = await foundationReadiness('t1', 'placement');
    expect(r.configured).toBe(false);
    expect(r.publishedUnits).toBe(10);
  });
});

describe('a learner is told the name of their own year', () => {
  it.each([
    ['foundation', 'Foundation'],
    ['build', 'Build'],
    ['specialize', 'Specialize'],
    ['placement', 'Placement'],
  ])('%s reads as %s', (stage, label) => {
    expect(notConfiguredForStudent(stage)).toContain(`Your ${label} curriculum`);
  });

  it('never tells a later year that its FOUNDATION curriculum is missing', () => {
    for (const stage of ['build', 'specialize', 'placement']) {
      expect(notConfiguredForStudent(stage)).not.toContain('Foundation');
    }
  });

  it('names the stage in the operator message too', async () => {
    counts.placement = 1;
    const r = await foundationReadiness('t1', 'placement');
    expect(r.message).toContain('Placement');
  });

  it('still defaults to Foundation when no stage is given', async () => {
    counts.foundation = 5;
    const r = await foundationReadiness('t1');
    expect(programDaysFor).toHaveBeenCalledWith('t1', 'foundation');
    expect(r.message).toContain('Foundation');
    expect(notConfiguredForStudent()).toContain('Your Foundation curriculum');
  });
});
