/**
 * Phase 27 — what the unit engine does with a trigger.
 *
 * Creation and recomposition were each proved by their own services; what is new is the join,
 * and the join is where the ways to go wrong are: creating a journey before there is anything to
 * plan from, creating a second one on a repeated event, recomposing a broken journey, writing an
 * enrollment for a journey that was refused, reading a direction out of scores. Each is asserted
 * against the calls the join makes, so the services themselves stay mocked and proven elsewhere.
 */

const leanChain = (value: any): any => ({ select: () => leanChain(value), lean: async () => value });

let student: any = null;
let journey: any = null;
let enrollment: any = null;

jest.mock('../models/User', () => ({
  __esModule: true,
  default: { findOne: () => leanChain(student) },
}));
jest.mock('../models/LearningCurriculum', () => ({
  __esModule: true,
  default: { findOne: () => leanChain(journey) },
}));
const enrollmentCreate = jest.fn(async (doc: any) => doc);
jest.mock('../models/CurriculumEnrollment', () => ({
  __esModule: true,
  default: {
    findOne: () => leanChain(enrollment),
    create: (doc: any) => enrollmentCreate(doc),
  },
}));

const buildFoundationProfile = jest.fn();
jest.mock('../services/foundationProfileService', () => ({
  __esModule: true,
  buildFoundationProfile: (...a: any[]) => buildFoundationProfile(...a),
}));
const persistFoundationJourney = jest.fn();
const checkJourneyIntegrity = jest.fn();
jest.mock('../services/foundationJourneyService', () => ({
  __esModule: true,
  FOUNDATION_JOURNEY_KIND: 'FOUNDATION_UNIT_JOURNEY_V1',
  persistFoundationJourney: (...a: any[]) => persistFoundationJourney(...a),
  checkJourneyIntegrity: (...a: any[]) => checkJourneyIntegrity(...a),
}));
const recomposeFutureDays = jest.fn();
jest.mock('../services/foundationRecompositionService', () => ({
  __esModule: true,
  recomposeFutureDays: (...a: any[]) => recomposeFutureDays(...a),
}));

import { applyFoundationTrigger, directionChoiceFor } from '../services/foundationJourneyTriggerService';

const TENANT = 't1';
const STUDENT = '64b0000000000000000000aa';
const JOURNEY = '64b0000000000000000000bb';
const profile = { skills: new Map(), primaryDirection: null, directionStatus: 'UNDECIDED' };
const trigger = (t: any = 'DIAGNOSTIC_COMPLETED') =>
  applyFoundationTrigger({ tenantId: TENANT, studentId: STUDENT, trigger: t, stageKey: 'foundation' });

beforeEach(() => {
  student = { _id: STUDENT, firstName: 'Asha', lastName: 'K', email: 'asha@example.com', passport: { stage: 'foundation', primaryRole: 'NOT_SURE' } };
  journey = null;
  enrollment = null;
  enrollmentCreate.mockClear();
  buildFoundationProfile.mockReset().mockResolvedValue({ profile, summary: { measured: 6, verified: 1 } });
  persistFoundationJourney.mockReset().mockResolvedValue({ ok: true, curriculumId: JOURNEY, days: 90, created: true });
  checkJourneyIntegrity.mockReset().mockResolvedValue({ ok: true, days: 90, expected: 90, missing: [], duplicates: [] });
  recomposeFutureDays.mockReset().mockResolvedValue({ ok: true, frozenDays: [1, 2, 3], rewrittenDays: [4, 5], unchangedFutureDays: [], totalDays: 90 });
});

describe('a UNIT learner with no journey', () => {
  it('gets one from PRODUCTION inventory, and an enrollment to carry their progress', async () => {
    const out = await trigger();
    expect(out).toMatchObject({ action: 'CREATED', curriculumId: JOURNEY });
    expect(persistFoundationJourney).toHaveBeenCalledWith(TENANT, expect.anything(), profile, { source: 'PRODUCTION', stageKey: 'foundation' });
    expect(enrollmentCreate).toHaveBeenCalledTimes(1);
    expect(enrollmentCreate.mock.calls[0][0]).toMatchObject({ tenantId: TENANT, enrolledBy: 'foundation-journey', status: 'active', stage: 'foundation' });
    expect(recomposeFutureDays).not.toHaveBeenCalled();
  });

  /** A student document is not a reason to commit somebody to ninety days. */
  it('is not given a journey until Skill DNA holds a measured skill', async () => {
    buildFoundationProfile.mockResolvedValue({ profile, summary: { measured: 0, verified: 0 } });
    const out = await trigger();
    expect(out).toMatchObject({ action: 'NOT_READY', reason: 'NO_SKILL_EVIDENCE' });
    expect(persistFoundationJourney).not.toHaveBeenCalled();
    expect(enrollmentCreate).not.toHaveBeenCalled();
  });

  it('is refused cleanly when ninety cannot be reached — no enrollment for a journey that was not written', async () => {
    persistFoundationJourney.mockResolvedValue({ ok: false, reason: 'The curriculum can only fill 87 of 90 days', days: 87, created: false });
    const out = await trigger();
    expect(out.action).toBe('REFUSED');
    expect(out.reason).toContain('87 of 90');
    expect(enrollmentCreate).not.toHaveBeenCalled();
  });

  it('adopts a journey a racing trigger already created, rather than reporting a new one', async () => {
    persistFoundationJourney.mockResolvedValue({ ok: true, curriculumId: JOURNEY, days: 90, created: false });
    expect((await trigger()).action).toBe('UNCHANGED');
  });

  it('converges when a racing trigger already enrolled them', async () => {
    enrollmentCreate.mockImplementationOnce(async () => { const e: any = new Error('dup'); e.code = 11000; throw e; });
    expect((await trigger()).action).toBe('CREATED');
  });
});

describe('a UNIT learner who already has a journey', () => {
  beforeEach(() => { journey = { _id: JOURNEY }; enrollment = { _id: 'e1' }; });

  it('has only the future recomposed — never a second journey', async () => {
    const out = await trigger('MODULE_ASSESSMENT_COMPLETED');
    expect(out).toMatchObject({ action: 'RECOMPOSED', rewrittenDays: [4, 5], frozenDays: [1, 2, 3] });
    expect(recomposeFutureDays).toHaveBeenCalledWith(TENANT, expect.anything(), profile, { source: 'PRODUCTION', stageKey: 'foundation' });
    expect(persistFoundationJourney).not.toHaveBeenCalled();
    expect(enrollmentCreate).not.toHaveBeenCalled();
  });

  it('reports a repeated trigger that moves nothing as UNCHANGED', async () => {
    recomposeFutureDays.mockResolvedValue({ ok: true, frozenDays: [1], rewrittenDays: [], unchangedFutureDays: [2], totalDays: 90 });
    expect((await trigger()).action).toBe('UNCHANGED');
  });

  it('leaves a journey that cannot be refilled exactly as it was', async () => {
    recomposeFutureDays.mockResolvedValue({ ok: false, reason: 'could only supply 40 units for 85 remaining days', frozenDays: [], rewrittenDays: [], unchangedFutureDays: [], totalDays: 90 });
    const out = await trigger();
    expect(out.action).toBe('REFUSED');
    expect(persistFoundationJourney).not.toHaveBeenCalled();
  });

  it('does not recompose around a journey that is no longer ninety days', async () => {
    checkJourneyIntegrity.mockResolvedValue({ ok: false, days: 88, expected: 90, missing: [89, 90], duplicates: [] });
    const out = await trigger();
    expect(out.action).toBe('REFUSED');
    expect(out.reason).toContain('JOURNEY_INTEGRITY');
    expect(recomposeFutureDays).not.toHaveBeenCalled();
  });

  it('repairs a missing enrollment left by an interrupted creation', async () => {
    enrollment = null;
    await trigger();
    expect(enrollmentCreate).toHaveBeenCalledTimes(1);
  });
});

describe('what a trigger may and may not do', () => {
  it('ignores a trigger that does not change what the journey teaches', async () => {
    const out = await trigger('AVAILABILITY_CHANGED');
    expect(out.action).toBe('IGNORED');
    expect(buildFoundationProfile).not.toHaveBeenCalled();
  });

  it('refuses a student who is not in this tenant', async () => {
    student = null;
    expect((await trigger()).action).toBe('REFUSED');
    expect(persistFoundationJourney).not.toHaveBeenCalled();
  });

  it('never throws into the submission that triggered it', async () => {
    buildFoundationProfile.mockRejectedValue(new Error('skill dna unavailable'));
    await expect(trigger()).resolves.toMatchObject({ action: 'FAILED' });
  });

  it('plans against the direction the student chose, never one read from scores', async () => {
    student.passport = { stage: 'foundation', primaryRole: 'FRONTEND_ENGINEER' };
    await trigger();
    expect(buildFoundationProfile.mock.calls[0][2]).toMatchObject({ primaryDirection: 'WEB_DEVELOPMENT', status: 'SELECTED' });
  });

  it('treats not-sure as undecided with exploration breadth', () => {
    expect(directionChoiceFor({ primaryRole: 'NOT_SURE' })).toMatchObject({ primaryDirection: null, status: 'UNDECIDED' });
    expect(directionChoiceFor({}).exploring.length).toBeGreaterThan(1);
    expect(directionChoiceFor({ selectedDirection: 'AI_ML' })).toMatchObject({ primaryDirection: 'AI_ML', status: 'SELECTED' });
  });
});
