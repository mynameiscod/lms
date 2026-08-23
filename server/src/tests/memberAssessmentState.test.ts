/**
 * "Has this member been measured?" — asked about the member, not about a collection.
 *
 * Three screens asked it by looking for a PassportAttempt, which only the legacy Career
 * Readiness questionnaire writes. A member who sat the PERSONALISED skill assessment has
 * no such row, so the roadmap, the daily missions and Mission Control all decided they had
 * never been assessed — on the click straight after they had been shown their measured
 * readiness against their target role, and with the button then pointing back at the
 * assessment they had just finished.
 *
 * These pin both halves: either instrument counts, and a member who has sat neither is
 * still correctly told so.
 */

const attemptFindOne = jest.fn();
jest.mock('../models/PassportAttempt', () => ({
  __esModule: true,
  default: { findOne: () => ({ sort: () => ({ lean: () => attemptFindOne() }) }) },
}));

const paExists = jest.fn();
jest.mock('../models/PersonalizedAssessment', () => ({
  __esModule: true,
  default: { exists: (...a: any[]) => paExists(...a) },
}));

import { resolveAssessedState } from '../services/memberAssessmentStateService';

const CATEGORIES = [
  { key: 'career_clarity', label: 'Career Clarity', weight: 1, order: 0 },
  { key: 'technical', label: 'Technical', weight: 1, order: 1 },
  { key: 'communication', label: 'Communication', weight: 1, order: 2 },
] as any;

const call = (passport: any = {}) => resolveAssessedState({
  tenantId: 't1', studentId: 's1', passport, categories: CATEGORIES,
  defaultPathway: { key: 'software_dev', label: 'Software Development' },
});

beforeEach(() => {
  attemptFindOne.mockReset().mockResolvedValue(null);
  paExists.mockReset().mockResolvedValue(null);
});

describe('a member who took the legacy questionnaire', () => {
  const legacy = {
    careerScore: 58, level: 'starter', pathway: 'data', pathwayLabel: 'Data',
    categoryScores: [{ key: 'technical', label: 'Technical', score: 40 }],
    weaknesses: ['Technical'],
  };

  it('is assessed, and nothing about them changes', async () => {
    attemptFindOne.mockResolvedValue(legacy);
    const r = await call();

    expect(r.assessed).toBe(true);
    expect(r.source).toBe('attempt');
    // The real attempt is handed back untouched — existing members keep the exact plan
    // they had, built from their real category scores.
    expect(r.attempt).toBe(legacy as any);
    expect(r.careerScore).toBe(58);
    expect(r.level).toBe('starter');
  });

  it('is preferred over the skill assessment when they have done both', async () => {
    // The legacy attempt carries real per-category measurement; the synthesised one cannot.
    attemptFindOne.mockResolvedValue(legacy);
    paExists.mockResolvedValue({ _id: 'x' });
    expect((await call()).source).toBe('attempt');
  });
});

describe('a member measured by the skill assessment', () => {
  beforeEach(() => paExists.mockResolvedValue({ _id: 'pa1' }));

  it('is assessed, so the roadmap and missions open', async () => {
    const r = await call({ careerScore: 71, level: 'builder', pathway: 'backend' });

    expect(r.assessed).toBe(true);
    expect(r.source).toBe('skill_dna');
    expect(r.careerScore).toBe(71);
    expect(r.level).toBe('builder');
  });

  it('gets an attempt shaped like the real one, so the planners still work', async () => {
    // buildRoadmap and missionsForDay are used by paying members today. Rewriting them to
    // accept a union of two assessment models, to fix a gate, would risk every plan.
    const r = await call({ careerScore: 71, pathway: 'backend' });

    expect(r.attempt).toMatchObject({ careerScore: 71, pathway: 'backend' });
    expect(r.attempt!.categoryScores).toHaveLength(CATEGORIES.length);
  });

  it('does NOT invent a weakness in a category nothing measured', async () => {
    /**
     * Mission pools are keyed on the legacy categories; Skill DNA is keyed on skills, and
     * no mapping between them exists. Guessing one would put a number against "aptitude"
     * that nothing ever tested — which then chooses the member's missions and reads, on
     * their own result page, as a finding about them.
     *
     * A flat profile makes the "weakest category" sort a no-op, so pools are served in
     * their configured order and nobody is told they are weak at something untested.
     */
    const r = await call({ careerScore: 71 });
    const scores = r.attempt!.categoryScores.map(c => c.score);

    expect(new Set(scores).size).toBe(1);
    expect(r.attempt!.weaknesses).toEqual([]);
  });

  it('falls back to the tenant default when they have no cached pathway', async () => {
    expect((await call({ careerScore: 71 })).attempt!.pathway).toBe('software_dev');
  });

  it('is still assessed while coverage is too thin for a score', async () => {
    // careerScoreService writes nothing until enough of the blueprint is covered. Sitting
    // the paper is still the fact these screens are asking about, and a plan has to be
    // buildable meanwhile — so the score floors at 0 rather than blocking them.
    const r = await call({});
    expect(r.assessed).toBe(true);
    expect(r.careerScore).toBeNull();
    expect(r.attempt!.careerScore).toBe(0);
  });
});

describe('a member who has sat neither', () => {
  it('is not assessed', async () => {
    const r = await call({});
    expect(r.assessed).toBe(false);
    expect(r.source).toBeNull();
    expect(r.attempt).toBeNull();
  });

  it('is not assessed on an assessment still IN_PROGRESS', async () => {
    // Only a SUBMITTED paper counts. Opening one and walking away is not a measurement.
    paExists.mockResolvedValue(null);
    expect((await call({})).assessed).toBe(false);
    expect(paExists).toHaveBeenCalledWith(expect.objectContaining({ status: 'SUBMITTED' }));
  });

  it('is not assessed merely because a score is cached on their record', async () => {
    // A stale or admin-set score is not proof they ever answered anything.
    paExists.mockResolvedValue(null);
    expect((await call({ careerScore: 64 })).assessed).toBe(false);
  });
});
