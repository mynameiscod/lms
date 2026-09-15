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
  p.sort = () => chain(value);
  p.lean = async () => value;
  return p;
};

const members: any[] = [];

const matches = (doc: any, q: any): boolean =>
  Object.entries(q).every(([k, v]: [string, any]) => (v && typeof v === 'object' && '$in' in v)
    ? (v.$in as any[]).map(String).includes(String(doc[k]))
    : String(doc[k]) === String(v));

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
  FOUNDATION_NOT_CONFIGURED_FOR_STUDENT: 'Your Foundation curriculum has not been set up for your institute yet.',
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
  beforeEach(seed);

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
