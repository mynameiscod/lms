/**
 * Course interest from form answers (2026-11-19): Meta/Sheet forms keep the course as a raw custom
 * field, so the Leads screen showed no course for those leads.
 */
import mongoose from 'mongoose';
import { startMongo, stopMongo } from './mongoHarness';
import { prettyCourse, coursesFromCustomFields, isCourseKey, backfillCourseInterest } from '../../utils/leadCourse';
import Lead from '../../models/Lead';

jest.setTimeout(240_000);
const tid = new mongoose.Types.ObjectId();

it('makes raw form values readable', () => {
  expect(prettyCourse('java_full_stack_with_ai')).toBe('Java Full Stack with AI');
  expect(prettyCourse('python_full_stack_with_ai')).toBe('Python Full Stack with AI');
  expect(prettyCourse('data science')).toBe('Data Science');
  expect(prettyCourse('Java Full Stack')).toBe('Java Full Stack');
  expect(prettyCourse('aws_devops')).toBe('AWS DevOps');
});

it('finds the course key, and ignores "why" and other questions', () => {
  expect(isCourseKey('which_course_are_you_interested_in_?')).toBe(true);
  expect(isCourseKey('course')).toBe(true);
  expect(isCourseKey('🎯_why_do_you_want_to_join_full_stack_training?')).toBe(false);
  expect(isCourseKey('custom_passout_year')).toBe(false);
  expect(coursesFromCustomFields({ 'which_course_are_you_interested_in_?': 'java_full_stack_with_ai', city: 'Hyderabad' })).toEqual(['Java Full Stack with AI']);
  expect(coursesFromCustomFields(new Map([['course', 'Java, Python,java']]))).toEqual(['Java', 'Python']);
  expect(coursesFromCustomFields({ course: 'other' })).toEqual([]);
});

describe('with a database', () => {
  beforeAll(startMongo);
  afterAll(stopMongo);

  it('a new lead from a form gets its course interest filled', async () => {
    const stage = new mongoose.Types.ObjectId();
    // An old lead, written before this fix (raw insert: no hooks).
    await mongoose.connection.db!.collection('leads').insertOne({ tenantId: tid, name: 'Deepak', phone: '9550112345', courseInterest: [], customFields: { 'which_course_are_you_interested_in_?': 'java_full_stack_with_ai' } });
    const fresh = await new Lead({ tenantId: tid, name: 'Ravi', phone: '9550112346', source: 'facebook', stageId: stage, createdBy: tid, customFields: { course: 'data_science' } } as any).save();
    expect(fresh.courseInterest).toEqual(['Data Science']);
  });

  it('backfill fills only leads with no course, and is safe to run twice', async () => {
    const c = mongoose.connection.db!.collection('leads');
    await c.insertMany([
      { tenantId: tid, name: 'A', phone: '1', courseInterest: [], customFields: { 'which_course_are_you_interested_in_?': 'python_full_stack_with_ai' } },
      { tenantId: tid, name: 'B', phone: '2', courseInterest: ['Testing'], customFields: { course: 'java' } },
      { tenantId: tid, name: 'C', phone: '3', customFields: { city: 'Vizag' } },
    ]);
    expect(await backfillCourseInterest()).toBe(2); // Deepak (from the test above) + A
    expect((await c.findOne({ name: 'A' }))!.courseInterest).toEqual(['Python Full Stack with AI']);
    expect((await c.findOne({ name: 'B' }))!.courseInterest).toEqual(['Testing']);
    expect((await c.findOne({ name: 'Deepak' }))!.courseInterest).toEqual(['Java Full Stack with AI']);
    expect(await backfillCourseInterest()).toBe(0);
  });
});
