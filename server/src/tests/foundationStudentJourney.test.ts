/**
 * What the student surface shows, and — more importantly — what it withholds.
 *
 * ── THE BOUNDARY ─────────────────────────────────────────────────────────────────────────
 *
 * The 337-unit master curriculum, composer scores, role allocations, readiness rungs,
 * publication status and reallocation reports are authoring instruments. A student reading
 * "ADVANCED_UNIVERSAL, reason STANDARD_FOUNDATION, rank 41" learns nothing about what to do
 * today and a great deal about how little of this was written for them. So the assertion is
 * made against the SERIALISED response: whatever the internals carry, none of it may leave.
 *
 * ── NINETY IS ON EVERY RESPONSE ──────────────────────────────────────────────────────────
 *
 * Including the one that says there is no journey yet. A strong learner must not be able to
 * infer they were given harder material by noticing a shorter course.
 */

import { FOUNDATION_PROGRAM_DAYS } from '../data/ninetyDayPolicy';

const dayPlans: any[] = [];
const curricula: any[] = [];
const enrollments: any[] = [];
const units: any[] = [];

const chain = (value: any): any => {
  const p: any = Promise.resolve(value);
  p.select = () => chain(value);
  // Sorts for real, so a controller that relied on the database order would be caught by a shuffled fixture.
  p.sort = (spec?: Record<string, number>) => {
    if (!Array.isArray(value) || !spec) return chain(value);
    const [[key, dir]] = Object.entries(spec);
    return chain([...value].sort((a, b) => (Number(a[key]) - Number(b[key])) * (dir < 0 ? -1 : 1)));
  };
  p.lean = async () => value;
  return p;
};

const members: any[] = [];

const matches = (doc: any, q: any): boolean =>
  Object.entries(q).every(([k, v]: [string, any]) => (v === null
    // As in MongoDB: a null condition matches a missing field or a null one.
    ? doc[k] === undefined || doc[k] === null
    : (v && typeof v === 'object' && '$in' in v)
      ? (v.$in as any[]).map(String).includes(String(doc[k]))
      : String(doc[k]) === String(v)));

jest.mock('../models/User', () => ({
  __esModule: true,
  default: { findOne: (q: any) => chain(members.find(d => matches(d, q)) || null) },
}));

jest.mock('../models/DayPlan', () => ({
  __esModule: true,
  default: { find: (q: any) => chain(dayPlans.filter(d => matches(d, q))) },
}));
jest.mock('../models/LearningCurriculum', () => ({
  __esModule: true,
  default: { findOne: (q: any) => chain(curricula.find(d => matches(d, q)) || null) },
}));
jest.mock('../models/CurriculumEnrollment', () => ({
  __esModule: true,
  default: { findOne: (q: any) => chain(enrollments.find(d => matches(d, q)) || null) },
}));
jest.mock('../models/CurriculumLearningUnit', () => ({
  __esModule: true,
  default: {
    findOne: (q: any) => chain(units.find(d => matches(d, q)) || null),
    find: (q: any) => chain(units.filter(d => matches(d, q))),
  },
}));

const mockResolveEngine = jest.fn();
jest.mock('../services/curriculumEngineService', () => ({
  resolveCurriculumEngine: (...a: any[]) => mockResolveEngine(...a),
}));
const mockReadiness = jest.fn();
jest.mock('../services/foundationReadinessService', () => ({
  foundationReadiness: (...a: any[]) => mockReadiness(...a),
  /* Stage-aware now, so the double must be a function or the controller throws a 500. */
  notConfiguredForStudent: (stageKey?: string | null) =>
    `Your ${stageKey === 'build' ? 'Build' : 'Foundation'} curriculum has not been set up for your institute yet.`,
  FOUNDATION_NOT_CONFIGURED_FOR_STUDENT: 'Your Foundation curriculum has not been set up for your institute yet.',
}));
const mockAccess = jest.fn();
jest.mock('../services/foundationAccessService', () => ({
  foundationAccess: (...a: any[]) => mockAccess(...a),
}));
const mockProfile = jest.fn();
jest.mock('../services/foundationProfileService', () => ({
  buildFoundationProfile: (...a: any[]) => mockProfile(...a),
}));
const mockCompose = jest.fn();
jest.mock('../services/foundationJourneyService', () => ({
  FOUNDATION_JOURNEY_KIND: 'FOUNDATION_UNIT_JOURNEY_V1',
  composeFoundationJourney: (...a: any[]) => mockCompose(...a),
  loadAssets: async () => new Map(),
  activitiesFor: (u: any) => [
    { contentTitle: `${u.title} lesson`, contentType: 'notes', estimatedDuration: 15, order: 0 },
    { contentTitle: `${u.title} check`, contentType: 'quiz', estimatedDuration: 10, order: 1, isGating: true },
  ],
}));
const mockApplyTrigger = jest.fn();
// The day endpoint also reports each task's done state and settles journey XP; neither is under test here.
jest.mock('../controllers/enrollmentPlanController', () => ({
  resolveModuleStatuses: jest.fn(async () => ({})),
  itemDone: jest.fn(() => false),
}));
jest.mock('../services/foundationJourneyXpService', () => ({
  ...jest.requireActual('../services/foundationJourneyXpService'),
  reconcileJourneyDayXp: jest.fn(async () => 0),
}));
jest.mock('../services/foundationJourneyTriggerService', () => ({
  applyFoundationTrigger: (...a: any[]) => mockApplyTrigger(...a),
  directionChoiceFor: () => ({}),
}));

import * as ctrl from '../controllers/foundationJourneyController';

const TENANT = '5f9d1b2c3a4b5c6d7e8f9012';
const STUDENT = '5f9d1b2c3a4b5c6d7e8f9999';
const CURRICULUM = 'cur1';

const reqOf = (over: any = {}): any => ({
  params: {}, body: {}, query: {},
  user: { id: STUDENT, tenantId: TENANT },
  ...over,
});

const resOf = () => {
  const out: any = { status: 200, body: null };
  const res: any = {
    json: (b: any) => { out.body = b; return res; },
    status: (c: number) => { out.status = c; return res; },
  };
  return { res, out };
};

const seed = () => {
  curricula.push({
    _id: CURRICULUM, tenantId: TENANT, personalizedFor: STUDENT,
    adaptiveStage: 'foundation', journeyKind: 'FOUNDATION_UNIT_JOURNEY_V1',
    title: 'CareerPilot Foundation Journey',
  });
  for (let d = 1; d <= FOUNDATION_PROGRAM_DAYS; d++) {
    dayPlans.push({
      curriculumId: CURRICULUM, dayNumber: d, primaryUnitCode: `U_${d}`,
      title: `Unit ${d}`,
      items: [
        { _id: `i${d}a`, kind: 'content', contentTitle: 'Lesson', contentType: 'notes', order: 1, estimatedDuration: 15, required: true, isGating: false },
        { _id: `i${d}b`, kind: 'content', contentTitle: 'Drill', contentType: 'practice_coding', order: 0, estimatedDuration: 20, required: true, isGating: false },
        { _id: `i${d}c`, kind: 'quiz', sourceId: 'q1', contentTitle: 'Checkpoint', contentType: 'quiz', order: 2, estimatedDuration: 10, required: true, isGating: true },
      ],
    });
  }
  units.push({
    tenantId: TENANT, unitCode: 'U_31', title: 'Classes and Objects',
    description: 'Grouping data with the behaviour that belongs to it.',
    learningOutcomes: ['Define a class and create an instance'],
  });
  enrollments.push({
    _id: 'enr1', tenantId: TENANT, curriculumId: CURRICULUM, studentId: STUDENT,
    completedDays: [1, 2, 3, 4, 5], currentDay: 6, startDate: new Date('2026-01-06'),
  });
};

beforeEach(() => {
  dayPlans.length = 0; curricula.length = 0; enrollments.length = 0; units.length = 0; members.length = 0;
  mockResolveEngine.mockReset().mockResolvedValue({ engine: 'UNIT' });
  mockReadiness.mockReset().mockResolvedValue({ configured: true, reason: null, publishedUnits: 338, skillCheckMappings: 700, message: null });
  mockAccess.mockReset().mockResolvedValue({ level: 'FULL', previewDays: 7 });
  mockProfile.mockReset().mockResolvedValue({ profile: {}, summary: { measured: 0 } });
  mockCompose.mockReset();
  mockApplyTrigger.mockReset().mockResolvedValue({ action: 'NOT_READY', reason: 'NO_SKILL_EVIDENCE' });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('an admin reading one member’s journey', () => {
  const adminReq = (studentId = STUDENT) =>
    reqOf({ params: { studentId }, user: { id: 'admin1', tenantId: TENANT, role: 'TENANT_ADMIN' } });
  const member = (over: any = {}) => members.push({
    _id: STUDENT, tenantId: TENANT, firstName: 'Asha', lastName: 'K', email: 'asha@example.com',
    passport: { stage: 'foundation' }, ...over,
  });

  it('names the unit behind each day, its type, and whether it is still published', async () => {
    seed();
    member();
    units.push({ tenantId: TENANT, unitCode: 'U_6', title: 'Loops practice', unitType: 'PRACTICE', status: 'ARCHIVED' });
    units.push({ tenantId: TENANT, unitCode: 'U_7', title: 'Loops check', unitType: 'CHECKPOINT', status: 'PUBLISHED' });

    const { res, out } = resOf();
    await ctrl.getStudentJourney(adminReq(), res);

    expect(out.status).toBe(200);
    expect(out.body.available).toBe(true);
    expect(out.body.student).toEqual({ name: 'Asha K', email: 'asha@example.com', stage: 'foundation' });
    expect(out.body.enrollmentId).toBe('enr1');
    expect(out.body.currentDay).toBe(6);
    expect(out.body.days).toHaveLength(90);
    expect(out.body.days[5]).toMatchObject({
      day: 6, unitCode: 'U_6', unitType: 'PRACTICE', unitStatus: 'ARCHIVED', status: 'CURRENT', checkpoint: true, activities: 3, minutes: 45,
    });
    expect(out.body.days[6]).toMatchObject({ unitCode: 'U_7', unitStatus: 'PUBLISHED', status: 'UPCOMING' });
    // A day whose unit no longer exists is shown as such, not silently titled.
    expect(out.body.days[39]).toMatchObject({ unitCode: 'U_40', unitStatus: 'MISSING' });
  });

  it('explains a member with no journey, in terms of the engine that plans them', async () => {
    member();
    const unit = resOf();
    await ctrl.getStudentJourney(adminReq(), unit.res);
    expect(unit.out.body).toMatchObject({ available: false, engine: 'UNIT', totalDays: 90 });
    expect(unit.out.body.message).toMatch(/skill check/);

    mockResolveEngine.mockResolvedValue({ engine: 'TOPIC' });
    const topic = resOf();
    await ctrl.getStudentJourney(adminReq(), topic.res);
    expect(topic.out.body).toMatchObject({ available: false, engine: 'TOPIC' });
    expect(topic.out.body.message).toMatch(/topic engine/);
  });

  it('does not find a member of another tenant', async () => {
    seed();
    member({ tenantId: '5f9d1b2c3a4b5c6d7e8f9abc' });
    const { res, out } = resOf();
    await ctrl.getStudentJourney(adminReq(), res);
    expect(out.status).toBe(404);
  });

  it('refuses something that is not a member id', async () => {
    const { res, out } = resOf();
    await ctrl.getStudentJourney(adminReq('not-an-id'), res);
    expect(out.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('which plan the student screens show', () => {
  it('names the engine and the enrolment whose day player works a day through', async () => {
    seed();
    const { res, out } = resOf();
    await ctrl.getMyJourney(reqOf(), res);

    expect(mockResolveEngine).toHaveBeenCalledWith({ tenantId: TENANT, studentId: STUDENT });
    expect(out.body.engine).toBe('UNIT');
    expect(out.body.enrollmentId).toBe('enr1');
  });

  it('still names the engine before a journey exists, so a UNIT student is offered the skill check', async () => {
    const { res, out } = resOf();
    await ctrl.getMyJourney(reqOf(), res);

    expect(out.body.available).toBe(false);
    expect(out.body.engine).toBe('UNIT');
    expect(out.body.enrollmentId).toBeNull();
  });

  it('answers TOPIC when the engine cannot be resolved, so the screens keep what they showed', async () => {
    mockResolveEngine.mockRejectedValue(new Error('config unreadable'));
    const { res, out } = resOf();
    await ctrl.getMyJourney(reqOf(), res);

    expect(out.status).toBe(200);
    expect(out.body.engine).toBe('TOPIC');
  });

  it('tells a Foundation learner on an unprovisioned tenant it is NOT_CONFIGURED — never a shorter plan', async () => {
    mockReadiness.mockResolvedValue({ configured: false, reason: 'NO_PRODUCTION_CURRICULUM', publishedUnits: 0, skillCheckMappings: 0, message: 'Run provisioning.' });
    const { res, out } = resOf();
    await ctrl.getMyJourney(reqOf(), res);

    expect(out.status).toBe(200);
    expect(out.body).toMatchObject({ available: false, reason: 'NOT_CONFIGURED', engine: 'UNIT', totalDays: 90 });
    expect(out.body.days).toBeUndefined();
    // The operator detail stays with the admin; the learner is told what it means for them.
    expect(JSON.stringify(out.body)).not.toContain('provisioning');
  });

  it('does not ask about provisioning for a learner who already has a journey', async () => {
    seed();
    mockReadiness.mockResolvedValue({ configured: false, reason: 'NO_PRODUCTION_CURRICULUM', publishedUnits: 0, skillCheckMappings: 0, message: 'x' });
    const { res, out } = resOf();
    await ctrl.getMyJourney(reqOf(), res);
    expect(out.body.available).toBe(true);
    expect(mockReadiness).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('a journey that is still being written', () => {
  it('is not shown while its days are still being written — no partial strip', async () => {
    seed();
    curricula[0].createdAt = new Date();
    dayPlans.splice(51); // days 1..51 written, 52..90 not yet
    const { res, out } = resOf();
    await ctrl.getMyJourney(reqOf(), res);

    expect(out.status).toBe(200);
    expect(out.body).toMatchObject({ available: false, reason: 'BEING_PREPARED', totalDays: 90, engine: 'UNIT', enrollmentId: null });
    expect(out.body.days).toBeUndefined();
  });

  it('is not shown before its enrollment exists, so the Start button never opens nothing', async () => {
    seed();
    curricula[0].createdAt = new Date();
    enrollments.length = 0;
    const { res, out } = resOf();
    await ctrl.getMyJourney(reqOf(), res);
    expect(out.body).toMatchObject({ available: false, reason: 'BEING_PREPARED', enrollmentId: null });
  });

  it('is reported as incomplete, not as preparing, when it never finished', async () => {
    seed();
    curricula[0].createdAt = new Date(Date.now() - 10 * 60_000);
    dayPlans.splice(89);
    const { res, out } = resOf();
    await ctrl.getMyJourney(reqOf(), res);
    expect(out.body).toMatchObject({ available: false, reason: 'JOURNEY_INCOMPLETE' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('membership decides how much of the ninety a learner sees', () => {
  const units90 = Array.from({ length: 90 }, (_, i) => ({ unitCode: `U_${i + 1}`, title: `Unit ${i + 1}` }));
  beforeEach(() => {
    mockCompose.mockResolvedValue({ candidates: 338, composition: { ok: true, units: units90 } });
  });

  it('shows a non-member only the first N days of their own plan, composed from their Skill DNA, storing nothing', async () => {
    mockAccess.mockResolvedValue({ level: 'PREVIEW', previewDays: 7 });
    mockProfile.mockResolvedValue({ profile: { skills: new Map() }, summary: { measured: 6 } });
    units.push({ tenantId: TENANT, unitCode: 'U_1', title: 'Unit 1', description: 'How a computer runs a program.', learningOutcomes: ['Name the parts'] });

    const { res, out } = resOf();
    await ctrl.getMyJourney(reqOf(), res);

    expect(out.body).toMatchObject({ available: true, access: 'PREVIEW', totalDays: 90, previewDays: 7, lockedDays: 83, enrollmentId: null });
    expect(out.body.days).toHaveLength(7);
    expect(out.body.preview).toHaveLength(7);
    expect(out.body.preview[0]).toMatchObject({ day: 1, title: 'Unit 1', objective: 'How a computer runs a program.', outcomes: ['Name the parts'] });
    expect(out.body.preview[0].activities[1]).toMatchObject({ type: 'quiz', gating: true });
    const wire = JSON.stringify(out.body);
    expect(wire).not.toContain('Unit 8');
    expect(wire).not.toContain('unitCode');
    expect(mockApplyTrigger).not.toHaveBeenCalled();
  });

  it('follows the preview length the admin set', async () => {
    mockAccess.mockResolvedValue({ level: 'PREVIEW', previewDays: 3 });
    mockProfile.mockResolvedValue({ profile: {}, summary: { measured: 6 } });
    const { res, out } = resOf();
    await ctrl.getMyJourney(reqOf(), res);
    expect(out.body).toMatchObject({ access: 'PREVIEW', previewDays: 3, lockedDays: 87 });
    expect(out.body.days).toHaveLength(3);
  });

  it('asks a learner with no preview entitlement to take membership', async () => {
    mockAccess.mockResolvedValue({ level: 'LOCKED', previewDays: 7 });
    const { res, out } = resOf();
    await ctrl.getMyJourney(reqOf(), res);
    expect(out.body).toMatchObject({ available: false, reason: 'MEMBERSHIP_REQUIRED', access: 'LOCKED' });
    expect(out.body.days).toBeUndefined();
  });

  it('asks a non-member who has not taken the skill check to take it', async () => {
    mockAccess.mockResolvedValue({ level: 'PREVIEW', previewDays: 7 });
    const { res, out } = resOf();
    await ctrl.getMyJourney(reqOf(), res);
    expect(out.body).toMatchObject({ available: false, reason: 'NO_JOURNEY', access: 'PREVIEW' });
    expect(mockCompose).not.toHaveBeenCalled();
  });

  it('generates the ninety days for a member with Skill DNA and no journey, through the production trigger', async () => {
    mockProfile.mockResolvedValue({ profile: {}, summary: { measured: 6 } });
    mockApplyTrigger.mockImplementation(async () => { seed(); return { action: 'CREATED', reason: 'SIGNIFICANT_MASTERY_CHANGE' }; });

    const { res, out } = resOf();
    await ctrl.getMyJourney(reqOf(), res);

    expect(mockApplyTrigger).toHaveBeenCalledWith({ tenantId: TENANT, studentId: STUDENT, trigger: 'SIGNIFICANT_MASTERY_CHANGE', stageKey: 'foundation' });
    expect(out.body).toMatchObject({ available: true, access: 'FULL', totalDays: 90, enrollmentId: 'enr1' });
    expect(out.body.days).toHaveLength(90);
  });

  it('says so when a member’s journey could not be generated', async () => {
    mockProfile.mockResolvedValue({ profile: {}, summary: { measured: 6 } });
    mockApplyTrigger.mockResolvedValue({ action: 'REFUSED', reason: 'composer' });
    const { res, out } = resOf();
    await ctrl.getMyJourney(reqOf(), res);
    expect(out.body).toMatchObject({ available: false, reason: 'JOURNEY_NOT_CREATED' });
  });

  it('shows only the preview of a stored journey once membership has lapsed', async () => {
    seed();
    mockAccess.mockResolvedValue({ level: 'PREVIEW', previewDays: 7 });
    const { res, out } = resOf();
    await ctrl.getMyJourney(reqOf(), res);
    expect(out.body).toMatchObject({ available: true, access: 'PREVIEW', enrollmentId: null, lockedDays: 83 });
    expect(out.body.days).toHaveLength(7);
    expect(mockCompose).not.toHaveBeenCalled();
  });

  it('refuses a day beyond the preview on the server, and serves one inside it', async () => {
    seed();
    mockAccess.mockResolvedValue({ level: 'PREVIEW', previewDays: 7 });
    const beyond = resOf();
    await ctrl.getMyJourneyDay(reqOf({ params: { dayNumber: '8' } }), beyond.res);
    expect(beyond.out.status).toBe(403);
    expect(beyond.out.body.reason).toBe('MEMBERSHIP_REQUIRED');
    const inside = resOf();
    await ctrl.getMyJourneyDay(reqOf({ params: { dayNumber: '3' } }), inside.res);
    expect(inside.out.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('the journey overview', () => {
  beforeEach(seed);

  it('reports ninety days, the current day and progress', async () => {
    const { res, out } = resOf();
    await ctrl.getMyJourney(reqOf(), res);

    expect(out.body.available).toBe(true);
    expect(out.body.totalDays).toBe(90);
    expect(out.body.currentDay).toBe(6);
    expect(out.body.completedCount).toBe(5);
    expect(out.body.percentComplete).toBe(6);
    expect(out.body.days).toHaveLength(90);
  });

  it('marks each day completed, current or upcoming', async () => {
    const { res, out } = resOf();
    await ctrl.getMyJourney(reqOf(), res);

    const byDay = new Map(out.body.days.map((d: any) => [d.day, d.status]));
    expect(byDay.get(3)).toBe('COMPLETED');
    expect(byDay.get(6)).toBe('CURRENT');
    expect(byDay.get(40)).toBe('UPCOMING');
  });

  it('sends a summary per day rather than ninety full bundles', async () => {
    const { res, out } = resOf();
    await ctrl.getMyJourney(reqOf(), res);

    // The strip renders numbers; the open day is fetched on its own.
    expect(out.body.days[0].activities).toBe(3);
    expect(out.body.days[0].items).toBeUndefined();
  });

  it('never leaks composer or authoring internals', async () => {
    const { res, out } = resOf();
    await ctrl.getMyJourney(reqOf(), res);
    const wire = JSON.stringify(out.body);

    for (const forbidden of [
      'readiness', 'PUBLISHED', 'composerReady', 'FOUNDATION_INSTRUCTION', 'ADVANCED_UNIVERSAL',
      'allocation', 'reallocation', 'scheduledAt', 'scheduledOnProjection', 'rank',
      'primaryUnitCode', 'unitCode',
    ]) {
      expect(wire).not.toContain(forbidden);
    }
  });

  it('treats a student with no journey as an ordinary state, not an error', async () => {
    curricula.length = 0;
    const { res, out } = resOf();
    await ctrl.getMyJourney(reqOf(), res);

    expect(out.status).toBe(200);
    expect(out.body.available).toBe(false);
    // Told how long it will be, before it exists.
    expect(out.body.totalDays).toBe(90);
  });

  it('refuses an unauthenticated caller', async () => {
    const { res, out } = resOf();
    await ctrl.getMyJourney({ params: {}, body: {}, query: {}, user: {} } as any, res);
    expect(out.status).toBe(401);
  });
});

describe('one day in full', () => {
  beforeEach(() => {
    seed();

    /**
     * Day 31 opens because day 30 is finished, and that has to be said out loud now.
     *
     * The ninety days are a ladder: a day is refused until its predecessor is complete. These
     * tests are about what a day's PAYLOAD contains — the objective in the unit's words, teaching
     * order, which activity gates, the total — and day 31 is simply where the fixture's rich day
     * lives. Left on the shared enrolment's five completed days, every one of them would assert
     * against a 403 body instead.
     *
     * It is corrected here rather than in seed(), because other tests in this file read that
     * enrolment's five days and sixth current day for progress and day-status assertions, and
     * editing a shared fixture to make one block pass is how another block breaks quietly.
     *
     * Worth noting what this also repairs: the leak test below asserts the wire does NOT contain
     * the unit code or authoring state, and a 403 body contains none of them either — so it was
     * passing without ever inspecting a day.
     */
    enrollments[0].completedDays = Array.from({ length: 30 }, (_, i) => i + 1);
    enrollments[0].currentDay = 31;
  });

  it('returns the objective in the unit\'s own words', async () => {
    const { res, out } = resOf();
    await ctrl.getMyJourneyDay(reqOf({ params: { dayNumber: '31' } }), res);

    // The one piece of planning a student sees, because "why am I doing this" deserves one.
    expect(out.body.objective).toBe('Grouping data with the behaviour that belongs to it.');
    expect(out.body.outcomes).toEqual(['Define a class and create an instance']);
  });

  it('returns activities in teaching order, not storage order', async () => {
    const { res, out } = resOf();
    await ctrl.getMyJourneyDay(reqOf({ params: { dayNumber: '31' } }), res);

    expect(out.body.activities.map((a: any) => a.title)).toEqual(['Drill', 'Lesson', 'Checkpoint']);
  });

  it('says which activity holds the day open', async () => {
    const { res, out } = resOf();
    await ctrl.getMyJourneyDay(reqOf({ params: { dayNumber: '31' } }), res);

    const quiz = out.body.activities.find((a: any) => a.kind === 'quiz');
    expect(quiz.gating).toBe(true);
  });

  it('states the total on the day response too', async () => {
    const { res, out } = resOf();
    await ctrl.getMyJourneyDay(reqOf({ params: { dayNumber: '31' } }), res);
    expect(out.body.totalDays).toBe(90);
  });

  it('refuses a day outside the programme', async () => {
    for (const bad of ['0', '91', 'x']) {
      const { res, out } = resOf();
      await ctrl.getMyJourneyDay(reqOf({ params: { dayNumber: bad } }), res);
      expect(out.status).toBe(400);
    }
  });

  it('404s a student who has no journey rather than inventing one', async () => {
    curricula.length = 0;
    const { res, out } = resOf();
    await ctrl.getMyJourneyDay(reqOf({ params: { dayNumber: '1' } }), res);
    expect(out.status).toBe(404);
  });

  it('does not leak the unit code or authoring state on a day either', async () => {
    const { res, out } = resOf();
    await ctrl.getMyJourneyDay(reqOf({ params: { dayNumber: '31' } }), res);
    const wire = JSON.stringify(out.body);

    expect(wire).not.toContain('primaryUnitCode');
    expect(wire).not.toContain('U_31');
    expect(wire).not.toContain('readiness');
  });
});

describe('the promise is identical for every student', () => {
  it('says ninety whether the student is ahead or behind', async () => {
    seed();
    for (const [completed, current] of [[[], 1], [Array.from({ length: 80 }, (_, i) => i + 1), 81]] as any[]) {
      enrollments.length = 0;
      enrollments.push({
        tenantId: TENANT, curriculumId: CURRICULUM, studentId: STUDENT,
        completedDays: completed, currentDay: current,
      });

      const { res, out } = resOf();
      await ctrl.getMyJourney(reqOf(), res);

      // No student can infer their level from the length of their course.
      expect(out.body.totalDays).toBe(90);
      expect(out.body.days).toHaveLength(90);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// My Roadmap: the persisted ninety as an overview — visibility is not content access.
// ─────────────────────────────────────────────────────────────────────────────

describe('the roadmap overview of a persisted journey', () => {
  /** Topics and modules as the tenant's master curriculum names them; units say which topic each day is. */
  const seedRoadmap = () => {
    seed();
    curricula.push({
      _id: 'master', tenantId: TENANT, adaptiveStage: 'foundation', title: 'CareerPilot Year 1 — Foundation',
      topics: [
        { topicCode: 'T_HARDWARE', title: 'Hardware and How a Computer Runs', moduleCode: 'M01' },
        { topicCode: 'T_VARIABLES', title: 'Variables and Types', moduleCode: 'M03' },
        { topicCode: 'T_LATER', title: 'Everything Later', moduleCode: 'M03' },
      ],
      modules: [
        { moduleCode: 'M01', moduleName: 'Computer Science Fundamentals', displayOrder: 10 },
        { moduleCode: 'M03', moduleName: 'Programming', displayOrder: 30 },
      ],
    });
    units.length = 0;
    for (let d = 1; d <= FOUNDATION_PROGRAM_DAYS; d++) {
      units.push({
        tenantId: TENANT, unitCode: `U_${d}`, title: `Unit ${d}`,
        topicCode: d <= 9 ? 'T_HARDWARE' : d <= 14 ? 'T_VARIABLES' : 'T_LATER',
        moduleCode: d <= 9 ? 'M01' : 'M03',
        unitType: d === 14 ? 'PRACTICE' : d === 20 ? 'PROJECT' : d === 21 ? 'CHECKPOINT' : 'CONCEPT',
        description: `Objective of unit ${d}.`,
        learningOutcomes: [`Outcome ${d}`],
      });
    }
    // Stored out of order, so the overview's order is proven to be the plan's, not the storage's.
    dayPlans.reverse();
  };
  beforeEach(seedRoadmap);

  const overview = async () => {
    const { res, out } = resOf();
    await ctrl.getMyJourney(reqOf(), res);
    return out.body;
  };
  const dayCall = async (n: number) => {
    const { res, out } = resOf();
    await ctrl.getMyJourneyDay(reqOf({ params: { dayNumber: String(n) } }), res);
    return out;
  };

  it('1-2. returns exactly the ninety persisted days, Day 1 to Day 90 in order', async () => {
    const body = await overview();
    expect(body.days).toHaveLength(90);
    expect(body.days.map((d: any) => d.day)).toEqual(Array.from({ length: 90 }, (_, i) => i + 1));
    expect(body.days[89].day).toBe(90);
  });

  it('3. reads the stored plan and never composes or regenerates one', async () => {
    const body = await overview();
    expect(mockCompose).not.toHaveBeenCalled();
    expect(mockApplyTrigger).not.toHaveBeenCalled();
    expect(body.days[0].title).toBe('Unit 1');
    expect(body.days[46].title).toBe('Unit 47');
  });

  it('names each day’s topic, module, kind and objective for the roadmap', async () => {
    const days = (await overview()).days;
    expect(days[0]).toMatchObject({ topic: 'Hardware and How a Computer Runs', module: 'Computer Science Fundamentals', kind: 'LESSON', objective: 'Objective of unit 1.' });
    expect(days[13]).toMatchObject({ topic: 'Variables and Types', module: 'Programming', kind: 'PRACTICE' });
    expect(days[19].kind).toBe('PROJECT');
    expect(days[20].kind).toBe('CHECKPOINT');
  });

  it('never takes topic names from a personalised journey, only from the master curriculum', async () => {
    curricula.splice(curricula.findIndex(c => c._id === 'master'), 1);
    const days = (await overview()).days;
    // No master: no topic is invented, and the days still come back whole.
    expect(days).toHaveLength(90);
    expect(days.every((d: any) => d.topic === null && d.module === null)).toBe(true);
  });

  it('4. differs for a different personalised journey', async () => {
    const mine = (await overview()).days.map((d: any) => `${d.title}|${d.topic}`);
    for (const plan of dayPlans) plan.title = `Other ${plan.dayNumber}`;
    for (const u of units) u.topicCode = 'T_VARIABLES';
    const theirs = (await overview()).days.map((d: any) => `${d.title}|${d.topic}`);
    expect(theirs).not.toEqual(mine);
  });

  it('5-7. carries no lesson content, questions or assignment detail for any day — locked ones included', async () => {
    const body = await overview();
    const allowed = ['day', 'title', 'topic', 'module', 'kind', 'objective', 'activities', 'minutes', 'status', 'locked'];
    for (const d of body.days) expect(Object.keys(d).sort()).toEqual([...allowed].sort());

    const locked = body.days.find((d: any) => d.day === 40);
    expect(locked.locked).toBe(true);
    const wire = JSON.stringify(body);
    // Activity titles, ids, quiz source ids and item arrays exist in every stored day and none may leave.
    for (const forbidden of ['"items"', 'contentTitle', '"Drill"', '"Lesson"', '"Checkpoint"', 'sourceId', 'contentId', 'i40a', 'q1', 'questions', 'assignment', 'unitCode', 'topicCode', 'learningOutcomes', 'Outcome 40']) {
      expect(wire).not.toContain(forbidden);
    }
  });

  it('8. still refuses a locked day’s content on the server, with nothing of the day in the refusal', async () => {
    const out = await dayCall(40);
    expect(out.status).toBe(403);
    expect(out.body.reason).toBe('DAY_LOCKED');
    const wire = JSON.stringify(out.body);
    expect(out.body.activities).toBeUndefined();
    for (const forbidden of ['Drill', 'Lesson', 'Checkpoint', 'sourceId', 'contentId', 'objective', 'Objective of unit 40']) {
      expect(wire).not.toContain(forbidden);
    }
  });

  it('marks a day locked exactly when the day endpoint refuses it — for all ninety days', async () => {
    enrollments[0].completedDays = [1, 2, 3, 4, 5, 9];
    const days = (await overview()).days;
    for (const d of days) {
      const out = await dayCall(d.day);
      expect({ day: d.day, refused: out.status === 403 }).toEqual({ day: d.day, refused: d.locked });
    }
    // Completed days, today, and the day after a completed day are open; the rest are not.
    expect(days.filter((d: any) => !d.locked).map((d: any) => d.day)).toEqual([1, 2, 3, 4, 5, 6, 9, 10]);
  });

  it('9. serves the current day in full', async () => {
    const out = await dayCall(6);
    expect(out.status).toBe(200);
    expect(out.body.status).toBe('CURRENT');
    expect(out.body.activities.map((a: any) => a.title)).toEqual(['Drill', 'Lesson', 'Checkpoint']);
  });

  it('10. keeps a completed day open for review', async () => {
    const out = await dayCall(3);
    expect(out.status).toBe(200);
    expect(out.body.status).toBe('COMPLETED');
    expect((await overview()).days[2]).toMatchObject({ status: 'COMPLETED', locked: false });
  });

  it('11. reports progress from completed days, whatever day is selected or requested', async () => {
    await dayCall(40);
    const body = await overview();
    expect(body.completedCount).toBe(5);
    expect(body.percentComplete).toBe(6);
    expect(body.currentDay).toBe(6);
    const { res, out } = resOf();
    await ctrl.getMyJourney(reqOf({ query: { day: '40' } }), res);
    expect(out.body.completedCount).toBe(5);
    expect(out.body.currentDay).toBe(6);
  });

  it('12. reads the same roadmap on every refresh', async () => {
    const first = await overview();
    const second = await overview();
    expect(second).toEqual(first);
  });

  it('13. still tells an unprovisioned Foundation learner NOT_CONFIGURED, with no roadmap of any other kind', async () => {
    curricula.length = 0;
    mockReadiness.mockResolvedValue({ configured: false, reason: 'NO_PRODUCTION_CURRICULUM', message: 'not set up' });
    const body = await overview();
    expect(body).toMatchObject({ available: false, reason: 'NOT_CONFIGURED', totalDays: 90 });
    expect(body.days).toBeUndefined();
    expect(JSON.stringify(body)).not.toMatch(/phases|weeks/);
    expect(mockCompose).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('a coding assignment on a journey day', () => {
  const TITLE = 'Coding Assignment — Count Up and Add Up';
  const withAssignment = (day: number, id: string) => {
    const plan = dayPlans.find(p => p.dayNumber === day);
    plan.items.push({ _id: `i${day}d`, kind: 'assignment', sourceModel: 'Assignment', sourceId: id, contentTitle: TITLE, contentType: 'assignment', order: 3, estimatedDuration: 60, required: true, isGating: true });
  };
  beforeEach(() => {
    seed();
    withAssignment(6, 'asg-current');
    withAssignment(7, 'asg-next');
    withAssignment(40, 'asg-future');
  });

  const dayCall = async (n: number) => {
    const { res, out } = resOf();
    await ctrl.getMyJourneyDay(reqOf({ params: { dayNumber: String(n) } }), res);
    return out;
  };

  it('is served on the current day as a required activity that holds the day open, with the id to open it', async () => {
    const out = await dayCall(6);
    expect(out.status).toBe(200);
    const assignment = out.body.activities.find((a: any) => a.kind === 'assignment');
    expect(assignment).toMatchObject({ title: TITLE, required: true, gating: true, sourceId: 'asg-current' });
  });

  it('stays behind the lock on the next day and on a far future day — no title, no id, nothing to open', async () => {
    for (const [day, id] of [[7, 'asg-next'], [40, 'asg-future']] as [number, string][]) {
      const out = await dayCall(day);
      expect(out.status).toBe(403);
      expect(out.body.reason).toBe('DAY_LOCKED');
      const wire = JSON.stringify(out.body);
      for (const forbidden of [id, TITLE, 'Coding Assignment', 'sourceId', 'assignment']) expect(wire).not.toContain(forbidden);
    }
  });

  it('never appears in the overview, for any day', async () => {
    const { res, out } = resOf();
    await ctrl.getMyJourney(reqOf(), res);
    const wire = JSON.stringify(out.body);
    for (const forbidden of ['asg-current', 'asg-next', 'asg-future', TITLE, 'Coding Assignment']) expect(wire).not.toContain(forbidden);
  });
});
