/**
 * The assignment form's settings, against a real database.
 *
 * The form sends Time Limit, Max Attempts and the rest inside `settings`. They are kept, the attempt
 * limit is what a student's next attempt is checked against (0 = unlimited), and an assignment saved
 * before settings existed keeps the limit it always had.
 */
import mongoose from 'mongoose';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';

jest.setTimeout(180_000);

import Assignment, { AssignmentType } from '../../models/Assignment';
import Submission, { SubmissionStatus } from '../../models/Submission';
import assignmentService from '../../services/assignmentService';
import submissionService from '../../services/submissionService';
import { toStudentAssignment } from '../../services/studentAssignmentView';

const TENANT = new mongoose.Types.ObjectId();
const ADMIN = new mongoose.Types.ObjectId();
const STUDENT = new mongoose.Types.ObjectId();

const create = (extra: any) => assignmentService.create({
  tenant: TENANT as any, createdBy: ADMIN as any, title: 'Settings', type: AssignmentType.THEORY, ...extra,
} as any);
const read = async (id: any) => Assignment.findById(id).lean() as any;
const handIn = (assignment: any, attemptNumber: number) => Submission.create({
  tenant: TENANT, assignment, student: STUDENT, attemptNumber, status: SubmissionStatus.SUBMITTED, startedAt: new Date(),
} as any);

beforeAll(startMongo);
afterAll(stopMongo);
afterEach(clearCollections);

describe('assignment settings', () => {
  it('keeps the time limit and attempts the form sends, on create and on edit', async () => {
    const a = await create({ settings: { timeLimitMinutes: 45, maxAttempts: 2, allowLateSubmission: true, latePenaltyPercent: 20 } });
    let row = await read(a._id);
    expect(row.settings).toMatchObject({ timeLimitMinutes: 45, maxAttempts: 2, allowLateSubmission: true, latePenaltyPercent: 20 });
    expect(row.maxAttempts).toBe(2);
    expect(row.lateSubmissionPenalty).toBe(20);

    await assignmentService.update(a._id, TENANT as any, { updatedBy: ADMIN as any, settings: { timeLimitMinutes: 0, maxAttempts: 0, allowLateSubmission: false, latePenaltyPercent: 20 } } as any);
    row = await read(a._id);
    expect(row.settings).toMatchObject({ timeLimitMinutes: 0, maxAttempts: 0 });
    expect(row.maxAttempts).toBe(0);
    expect(row.lateSubmissionPenalty).toBe(0);
  });

  it('refuses an attempt past the limit the admin set, and none when it is unlimited', async () => {
    const limited = await create({ settings: { maxAttempts: 1 } });
    await handIn(limited._id, 1);
    await expect(submissionService.startNewAttempt(TENANT as any, limited._id as any, STUDENT as any)).rejects.toThrow(/all 1 attempt/);

    const open = await create({ settings: { maxAttempts: 0 } });
    await handIn(open._id, 5);
    const next = await submissionService.startNewAttempt(TENANT as any, open._id as any, STUDENT as any);
    expect(next.attemptNumber).toBe(6);
  });

  it('leaves an assignment saved without settings as it was', async () => {
    const a = await create({});
    const row = await read(a._id);
    expect(row.settings).toBeUndefined();
    expect(row.maxAttempts).toBe(3);
  });

  it('shows the student the time limit and attempts', async () => {
    const a = await create({ settings: { timeLimitMinutes: 30, maxAttempts: 2, showCorrectAnswers: true } });
    const view = toStudentAssignment(await read(a._id));
    expect(view.settings).toEqual({ timeLimitMinutes: 30, maxAttempts: 2, allowLateSubmission: false, latePenaltyPercent: 0 });
  });
});
