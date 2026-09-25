/**
 * What an admin can do to the Foundation curriculum, through the real handlers and a real database.
 *
 * The unit suite covers every authoring rule against in-memory mocks. This file holds the flows an
 * admin actually performs end to end — create, edit, attach and detach content, bind what measures
 * a checkpoint or a project, publish — and the one thing mocks cannot show: that taking a unit out
 * of the curriculum is refused, or confirmed, according to the journeys really stored against it.
 */

import mongoose from 'mongoose';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';

jest.setTimeout(180_000);

import User from '../../models/User';
import CurriculumLearningUnit from '../../models/CurriculumLearningUnit';
import LearningContentLibrary from '../../models/LearningContentLibrary';
import Quiz from '../../models/Quiz';
import Assignment from '../../models/Assignment';
import * as unitsCtrl from '../../controllers/curriculumLearningUnitController';
import * as journeyCtrl from '../../controllers/foundationJourneyController';
import { liveJourneyUsage } from '../../services/unitJourneyUsageService';
import { FOUNDATION_JOURNEY_KIND } from '../../services/foundationJourneyService';

const TENANT = '507f1f77bcf86cd799439e21';
const OTHER = '507f1f77bcf86cd799439e22';
const ADMIN_ID = '507f1f77bcf86cd799439e99';

const capture = () => {
  const res: any = { statusCode: 200, body: null };
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.json = (b: any) => { res.body = b; return res; };
  return res;
};

/** A request as authMiddleware and tenantMiddleware leave it for a tenant admin. */
const asAdmin = (params: any = {}, body: any = {}, tenantId = TENANT) => ({
  user: { id: ADMIN_ID, email: 'admin@example.com', tenantId, role: 'TENANT_ADMIN' },
  tenantId, headers: {}, params, query: {}, body,
} as any);

const call = async (handler: (req: any, res: any) => Promise<any>, req: any) => {
  const res = capture();
  await handler(req, res);
  return res;
};

const db = () => mongoose.connection.db!;

const unitBody = (over: any = {}) => ({
  stageKey: 'foundation', moduleCode: 'M03_PROGRAMMING', topicCode: 'T_LOOPS',
  title: 'For loops', skillKeys: ['LOOPS'], unitType: 'CONCEPT', ...over,
});

/** A published lesson that serves the loops topic, not yet attached to any unit. */
const addNotes = async (title = 'Loops, explained') => {
  const r = await db().collection('learningcontentlibraries').insertOne({
    tenantId: TENANT, title, type: 'notes', isPublished: true, topicCode: 'T_LOOPS',
    skillKeys: ['LOOPS'], estimatedDuration: 20, notesContent: '<p>A loop repeats.</p>', createdAt: new Date(),
  });
  return String(r.insertedId);
};

const unitStatus = async (unitCode: string) =>
  ((await CurriculumLearningUnit.findOne({ tenantId: TENANT, unitCode }).select('status').lean()) as any)?.status;

const publishedConcept = async (unitCode = 'T_LOOPS_FOR') => {
  expect((await call(unitsCtrl.saveUnit, asAdmin({ unitCode }, unitBody()))).statusCode).toBe(200);
  const contentId = await addNotes();
  expect((await call(unitsCtrl.attachContent, asAdmin({ unitCode, contentId }))).statusCode).toBe(200);
  expect((await call(unitsCtrl.publishUnit, asAdmin({ unitCode }))).body.published).toBe(true);
  return contentId;
};

beforeAll(async () => { await startMongo(); });
afterAll(stopMongo);
beforeEach(async () => {
  await clearCollections();
  await db().collection('careerskills').insertMany([
    { key: 'LOOPS', name: 'Loops', nodeType: 'SKILL', active: true },
    { key: 'PROBLEM_SOLVING', name: 'Problem solving', nodeType: 'SKILL', active: true },
  ]);
});

// ─────────────────────────────────────────────────────────────────────────────
/**
 * A unit stays in the year it was written for.
 *
 * saveUnit defaulted stageKey to 'foundation' whenever a body arrived without one, so a partial
 * save of a Year-2 unit silently moved it into Year 1 — out of the Build curriculum, out of
 * every Year-2 plan, and into a stage it was never written for. Nothing failed and nothing said
 * so; the unit simply stopped appearing where its author had left it.
 *
 * The content builder happens to re-send the whole unit, so it never triggered this. Any caller
 * that sends a patch would have.
 */
describe('which year a unit belongs to', () => {
  it('keeps a build unit in build when a save does not mention the stage', async () => {
    const created = await call(unitsCtrl.saveUnit,
      asAdmin({ unitCode: 'T2_OOP_WHY' }, unitBody({ stageKey: 'build', title: 'Why objects' })));
    expect(created.statusCode).toBe(200);

    const patch = unitBody({ title: 'Why objects, and what they replace' });
    delete (patch as any).stageKey;
    expect((await call(unitsCtrl.saveUnit, asAdmin({ unitCode: 'T2_OOP_WHY' }, patch))).statusCode).toBe(200);

    const after = await CurriculumLearningUnit
      .findOne({ tenantId: TENANT, unitCode: 'T2_OOP_WHY' }).select('stageKey title').lean() as any;
    expect(after.stageKey).toBe('build');
    expect(after.title).toBe('Why objects, and what they replace');
  });

  it('still starts a brand new unit in foundation when nothing says otherwise', async () => {
    const body = unitBody();
    delete (body as any).stageKey;
    expect((await call(unitsCtrl.saveUnit, asAdmin({ unitCode: 'T_LOOPS_NEW' }, body))).statusCode).toBe(200);

    const made = await CurriculumLearningUnit
      .findOne({ tenantId: TENANT, unitCode: 'T_LOOPS_NEW' }).select('stageKey').lean() as any;
    expect(made.stageKey).toBe('foundation');
  });

  it('still moves a unit when a save deliberately names another stage', async () => {
    await call(unitsCtrl.saveUnit, asAdmin({ unitCode: 'T_LOOPS_MOVE' }, unitBody()));
    expect((await call(unitsCtrl.saveUnit,
      asAdmin({ unitCode: 'T_LOOPS_MOVE' }, unitBody({ stageKey: 'build' })))).statusCode).toBe(200);

    const moved = await CurriculumLearningUnit
      .findOne({ tenantId: TENANT, unitCode: 'T_LOOPS_MOVE' }).select('stageKey').lean() as any;
    expect(moved.stageKey).toBe('build');
  });
});

describe('an admin authors a unit end to end', () => {
  it('creates, edits, attaches content, publishes only once the unit teaches, and detaches', async () => {
    const created = await call(unitsCtrl.saveUnit, asAdmin({ unitCode: 'T_LOOPS_FOR' }, unitBody()));
    expect(created.statusCode).toBe(200);
    expect(created.body.created).toBe(true);
    expect(await unitStatus('T_LOOPS_FOR')).toBe('DRAFT');

    const edited = await call(unitsCtrl.saveUnit, asAdmin({ unitCode: 'T_LOOPS_FOR' },
      unitBody({ title: 'For loops, step by step', learningOutcomes: ['Write a counted loop'], unitCode: 'T_RENAMED' })));
    expect(edited.statusCode).toBe(200);
    expect(edited.body.created).toBe(false);
    const stored = await CurriculumLearningUnit.findOne({ tenantId: TENANT, unitCode: 'T_LOOPS_FOR' }).lean() as any;
    expect(stored.title).toBe('For loops, step by step');
    expect(stored.learningOutcomes).toEqual(['Write a counted loop']);
    // The code is read from the URL, never the body.
    expect(await CurriculumLearningUnit.countDocuments({ tenantId: TENANT, unitCode: 'T_RENAMED' })).toBe(0);

    // Nothing of its own to teach yet: refused, and left as a draft.
    const early = await call(unitsCtrl.publishUnit, asAdmin({ unitCode: 'T_LOOPS_FOR' }));
    expect(early.statusCode).toBe(400);
    expect(await unitStatus('T_LOOPS_FOR')).toBe('DRAFT');

    const contentId = await addNotes();
    const offered = await call(unitsCtrl.unitContent, asAdmin({ unitCode: 'T_LOOPS_FOR' }));
    expect(offered.body.candidates.map((c: any) => String(c.id || c._id))).toContain(contentId);

    expect((await call(unitsCtrl.attachContent, asAdmin({ unitCode: 'T_LOOPS_FOR', contentId }))).statusCode).toBe(200);
    const attached = await call(unitsCtrl.unitContent, asAdmin({ unitCode: 'T_LOOPS_FOR' }));
    expect(attached.body.attached).toHaveLength(1);

    const published = await call(unitsCtrl.publishUnit, asAdmin({ unitCode: 'T_LOOPS_FOR' }));
    expect(published.statusCode).toBe(200);
    expect(await unitStatus('T_LOOPS_FOR')).toBe('PUBLISHED');

    // Editing a live unit keeps it live.
    await call(unitsCtrl.saveUnit, asAdmin({ unitCode: 'T_LOOPS_FOR' }, unitBody({ title: 'For loops' })));
    expect(await unitStatus('T_LOOPS_FOR')).toBe('PUBLISHED');

    expect((await call(unitsCtrl.detachContent, asAdmin({ unitCode: 'T_LOOPS_FOR', contentId }))).statusCode).toBe(200);
    const row = await LearningContentLibrary.findById(contentId).lean() as any;
    expect(row.unitCode).toBeUndefined();
  });

  it('refuses content another unit already owns', async () => {
    const contentId = await publishedConcept('T_LOOPS_FOR');
    await call(unitsCtrl.saveUnit, asAdmin({ unitCode: 'T_LOOPS_WHILE' }, unitBody({ title: 'While loops' })));
    const stolen = await call(unitsCtrl.attachContent, asAdmin({ unitCode: 'T_LOOPS_WHILE', contentId }));
    expect(stolen.statusCode).toBe(409);
    expect(((await LearningContentLibrary.findById(contentId).lean()) as any).unitCode).toBe('T_LOOPS_FOR');
  });

  it('refuses a skill or a prerequisite that names nothing', async () => {
    const skill = await call(unitsCtrl.saveUnit, asAdmin({ unitCode: 'T_BAD' }, unitBody({ skillKeys: ['NO_SUCH_SKILL'] })));
    expect(skill.statusCode).toBe(400);
    const prereq = await call(unitsCtrl.saveUnit, asAdmin({ unitCode: 'T_BAD' }, unitBody({ prerequisiteUnitCodes: ['T_NOT_A_UNIT'] })));
    expect(prereq.statusCode).toBe(400);
    expect(await CurriculumLearningUnit.countDocuments({ tenantId: TENANT, unitCode: 'T_BAD' })).toBe(0);
  });

  it('binds, unbinds and rebinds the quiz a checkpoint measures with, then publishes it', async () => {
    await call(unitsCtrl.saveUnit, asAdmin({ unitCode: 'T_LOOPS_CHECK' }, unitBody({ title: 'Loops checkpoint', unitType: 'CHECKPOINT' })));

    const shell = await call(unitsCtrl.createUnitAssessment, asAdmin({ unitCode: 'T_LOOPS_CHECK' }, { kind: 'QUIZ', title: 'Loops check' }));
    expect(shell.statusCode).toBe(200);
    const quiz = await Quiz.findOne({ tenantId: TENANT, unitCode: 'T_LOOPS_CHECK' }).lean() as any;
    expect(quiz).toBeTruthy();

    const quizId = String(quiz._id);
    expect((await call(unitsCtrl.unbindUnitQuiz, asAdmin({ unitCode: 'T_LOOPS_CHECK', quizId }))).statusCode).toBe(200);
    expect(await Quiz.countDocuments({ tenantId: TENANT, unitCode: 'T_LOOPS_CHECK' })).toBe(0);
    expect((await call(unitsCtrl.bindUnitQuiz, asAdmin({ unitCode: 'T_LOOPS_CHECK', quizId }))).statusCode).toBe(200);
    expect(await Quiz.countDocuments({ tenantId: TENANT, unitCode: 'T_LOOPS_CHECK' })).toBe(1);

    const published = await call(unitsCtrl.publishUnit, asAdmin({ unitCode: 'T_LOOPS_CHECK' }));
    expect(published.statusCode).toBe(200);
    expect(await unitStatus('T_LOOPS_CHECK')).toBe('PUBLISHED');
  });

  it('binds, unbinds and rebinds the assignment a project measures with', async () => {
    await call(unitsCtrl.saveUnit, asAdmin({ unitCode: 'T_LOOPS_PROJECT' }, unitBody({ title: 'Loops project', unitType: 'PROJECT' })));

    const shell = await call(unitsCtrl.createUnitAssessment, asAdmin({ unitCode: 'T_LOOPS_PROJECT' }, { kind: 'ASSIGNMENT', title: 'Build a times table' }));
    expect(shell.statusCode).toBe(200);
    const tenantOid = new mongoose.Types.ObjectId(TENANT);
    const assignment = await Assignment.findOne({ tenant: tenantOid, unitCode: 'T_LOOPS_PROJECT' }).lean() as any;
    expect(assignment).toBeTruthy();

    const assignmentId = String(assignment._id);
    expect((await call(unitsCtrl.unbindUnitAssignment, asAdmin({ unitCode: 'T_LOOPS_PROJECT', assignmentId }))).statusCode).toBe(200);
    expect(await Assignment.countDocuments({ tenant: tenantOid, unitCode: 'T_LOOPS_PROJECT' })).toBe(0);
    expect((await call(unitsCtrl.bindUnitAssignment, asAdmin({ unitCode: 'T_LOOPS_PROJECT', assignmentId }))).statusCode).toBe(200);
    expect(await Assignment.countDocuments({ tenant: tenantOid, unitCode: 'T_LOOPS_PROJECT' })).toBe(1);
  });

  it('deletes a unit that was never published, releasing its content rather than deleting it', async () => {
    await call(unitsCtrl.saveUnit, asAdmin({ unitCode: 'T_LOOPS_DRAFT' }, unitBody({ title: 'Draft' })));
    const contentId = await addNotes('Draft notes');
    await call(unitsCtrl.attachContent, asAdmin({ unitCode: 'T_LOOPS_DRAFT', contentId }));

    const removed = await call(unitsCtrl.deleteUnit, asAdmin({ unitCode: 'T_LOOPS_DRAFT' }));
    expect(removed.statusCode).toBe(200);
    expect(await CurriculumLearningUnit.countDocuments({ tenantId: TENANT, unitCode: 'T_LOOPS_DRAFT' })).toBe(0);
    const row = await LearningContentLibrary.findById(contentId).lean() as any;
    expect(row).toBeTruthy();
    expect(row.unitCode).toBeUndefined();
  });

  it('acts only on the admin’s own tenant', async () => {
    await publishedConcept('T_LOOPS_FOR');
    const foreign = await call(unitsCtrl.setUnitStatus, asAdmin({ unitCode: 'T_LOOPS_FOR' }, { status: 'ARCHIVED' }, OTHER));
    expect(foreign.statusCode).toBe(404);
    expect(await unitStatus('T_LOOPS_FOR')).toBe('PUBLISHED');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('taking a unit out of the curriculum while students are on it', () => {
  /** One student's journey: the unit on day 2 (already reached) and day 9 (still upcoming). */
  const journeyWithUnit = async (unitCode: string) => {
    const student = await User.create({
      tenantId: TENANT, firstName: 'Ravi', lastName: 'M', email: 'ravi@example.com',
      phone: '9811000001', password: 'x', role: 'STUDENT', passport: { stage: 'foundation' },
    } as any);
    const curriculum = await db().collection('learningcurriculums').insertOne({
      tenantId: TENANT, title: 'CareerPilot Foundation Journey', personalizedFor: student._id,
      adaptiveStage: 'foundation', journeyKind: FOUNDATION_JOURNEY_KIND, totalDays: 90,
    });
    const day = (dayNumber: number, code: string) => ({
      tenantId: TENANT, curriculumId: curriculum.insertedId, dayNumber, title: `Day ${dayNumber}`, primaryUnitCode: code,
      items: [{ kind: 'content', contentTitle: 'Lesson', contentType: 'notes', estimatedDuration: 15, order: 0 }],
    });
    await db().collection('dayplans').insertMany([day(2, unitCode), day(3, 'T_OTHER'), day(9, unitCode)]);
    const enrollment = await db().collection('curriculumenrollments').insertOne({
      tenantId: TENANT, curriculumId: curriculum.insertedId, studentId: student._id,
      currentDay: 3, completedDays: [1, 2], status: 'active',
    });

    // Noise that must not count: a non-journey curriculum and another tenant's journey on the same code.
    const lms = await db().collection('learningcurriculums').insertOne({ tenantId: TENANT, title: 'Ordinary LMS course' });
    const elsewhere = await db().collection('learningcurriculums').insertOne({
      tenantId: OTHER, title: 'CareerPilot Foundation Journey', personalizedFor: new mongoose.Types.ObjectId(),
      adaptiveStage: 'foundation', journeyKind: FOUNDATION_JOURNEY_KIND,
    });
    await db().collection('dayplans').insertMany([
      { tenantId: TENANT, curriculumId: lms.insertedId, dayNumber: 4, primaryUnitCode: unitCode },
      { tenantId: OTHER, curriculumId: elsewhere.insertedId, dayNumber: 8, primaryUnitCode: unitCode },
    ]);

    return { student, curriculumId: curriculum.insertedId, enrollmentId: String(enrollment.insertedId) };
  };

  it('counts the students, and the reached and upcoming days, from what is stored', async () => {
    await publishedConcept('T_LOOPS_FOR');
    await journeyWithUnit('T_LOOPS_FOR');
    expect(await liveJourneyUsage(TENANT, 'T_LOOPS_FOR')).toEqual({ students: 1, upcomingDays: 1, reachedDays: 1 });
    expect(await liveJourneyUsage(TENANT, 't_loops_for')).toEqual({ students: 1, upcomingDays: 1, reachedDays: 1 });
    expect(await liveJourneyUsage(TENANT, 'T_NOT_ON_ANY_DAY')).toEqual({ students: 0, upcomingDays: 0, reachedDays: 0 });
  });

  it('refuses to unpublish until confirmed, then archives, and never deletes while a journey holds it', async () => {
    await publishedConcept('T_LOOPS_FOR');
    const { curriculumId } = await journeyWithUnit('T_LOOPS_FOR');

    const refused = await call(unitsCtrl.setUnitStatus, asAdmin({ unitCode: 'T_LOOPS_FOR' }, { status: 'DRAFT' }));
    expect(refused.statusCode).toBe(409);
    expect(refused.body).toMatchObject({ code: 'UNIT_IN_LIVE_JOURNEYS', usage: { students: 1, upcomingDays: 1, reachedDays: 1 } });
    expect(await unitStatus('T_LOOPS_FOR')).toBe('PUBLISHED');

    const archived = await call(unitsCtrl.setUnitStatus, asAdmin({ unitCode: 'T_LOOPS_FOR' }, { status: 'ARCHIVED', confirmLiveJourneys: true }));
    expect(archived.statusCode).toBe(200);
    expect(await unitStatus('T_LOOPS_FOR')).toBe('ARCHIVED');

    const deleted = await call(unitsCtrl.deleteUnit, asAdmin({ unitCode: 'T_LOOPS_FOR' }));
    expect(deleted.statusCode).toBe(409);
    expect(deleted.body.code).toBe('UNIT_IN_LIVE_JOURNEYS');
    expect(await CurriculumLearningUnit.countDocuments({ tenantId: TENANT, unitCode: 'T_LOOPS_FOR' })).toBe(1);

    // Once no journey holds it, the archived unit can go.
    await db().collection('dayplans').deleteMany({ curriculumId });
    const gone = await call(unitsCtrl.deleteUnit, asAdmin({ unitCode: 'T_LOOPS_FOR' }));
    expect(gone.statusCode).toBe(200);
  });

  it('shows the admin that journey, with the unit it now names as archived', async () => {
    await publishedConcept('T_LOOPS_FOR');
    const { student, enrollmentId } = await journeyWithUnit('T_LOOPS_FOR');
    await call(unitsCtrl.setUnitStatus, asAdmin({ unitCode: 'T_LOOPS_FOR' }, { status: 'ARCHIVED', confirmLiveJourneys: true }));

    const view = await call(journeyCtrl.getStudentJourney, asAdmin({ studentId: String(student._id) }));
    expect(view.statusCode).toBe(200);
    expect(view.body).toMatchObject({ available: true, enrollmentId, currentDay: 3, completedCount: 2 });
    const byDay = new Map(view.body.days.map((d: any) => [d.day, d]));
    expect(byDay.get(2)).toMatchObject({ unitCode: 'T_LOOPS_FOR', unitStatus: 'ARCHIVED', status: 'COMPLETED' });
    expect(byDay.get(3)).toMatchObject({ unitCode: 'T_OTHER', unitStatus: 'MISSING', status: 'CURRENT' });
    expect(byDay.get(9)).toMatchObject({ unitCode: 'T_LOOPS_FOR', status: 'UPCOMING' });

    const foreign = await call(journeyCtrl.getStudentJourney, asAdmin({ studentId: String(student._id) }, {}, OTHER));
    expect(foreign.statusCode).toBe(404);
  });
});
