/**
 * Who an assignment reaches, against a real database.
 *
 * Publishing puts an assignment in the bank; it reaches a student only once it is given to them —
 * their batch, them by name, or Assign to Batches. "everyone" is never stored for an LMS
 * assignment and delivers to nobody; work a student already started stays on their list; and the
 * completion report counts only the students an assignment was given to.
 */
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';

jest.setTimeout(180_000);
process.env.JWT_SECRET = process.env.JWT_SECRET || 'assignment-delivery-integration-test-secret-0123456789';

import User from '../../models/User';
import Assignment, { AssignmentType } from '../../models/Assignment';
import Submission from '../../models/Submission';
import AssessmentSchedule from '../../models/AssessmentSchedule';
import assignmentService from '../../services/assignmentService';
import assignmentRoutes from '../../routes/assignmentRoutes';

const TENANT = new mongoose.Types.ObjectId();
const ADMIN = new mongoose.Types.ObjectId();
const BATCH_A = new mongoose.Types.ObjectId();
const BATCH_B = new mongoose.Types.ObjectId();

const student = (email: string, batchId: mongoose.Types.ObjectId) => User.create({
  tenantId: TENANT, firstName: 'S', lastName: email, email, password: 'x', role: 'STUDENT', isActive: true, batchId,
} as any);

const make = async (title: string, extra: any = {}) => {
  const a = await assignmentService.create({
    tenant: TENANT as any, createdBy: ADMIN as any, title, type: AssignmentType.THEORY, ...extra,
  } as any);
  await assignmentService.publish(a._id, TENANT as any, ADMIN as any);
  return a;
};
const titlesFor = async (u: any) =>
  (await assignmentService.getStudentAssignments(TENANT as any, u._id, u.batchId)).map((a: any) => a.title).sort();

beforeAll(startMongo);
afterAll(stopMongo);
afterEach(clearCollections);

describe('publishing does not assign', () => {
  it('stores "everyone" as batch-wise with no batches, and keeps it for an external assignment', async () => {
    const plain = await make('No audience given');
    const open = await make('Sent as everyone', { accessibleTo: 'everyone' });
    const ext = await make('External link', { accessibleTo: 'everyone', isExternalAssignment: true });
    const read = async (id: any) => (await Assignment.findById(id).lean() as any).accessibleTo;
    expect(await read(plain._id)).toBe('batch_wise');
    expect(await read(open._id)).toBe('batch_wise');
    expect(await read(ext._id)).toBe('everyone');

    // Editing an old "everyone" row (not external) saves it back as batch-wise.
    await Assignment.collection.updateOne({ _id: plain._id }, { $set: { accessibleTo: 'everyone' } });
    await assignmentService.update(plain._id, TENANT as any, { accessibleTo: 'everyone', title: 'Edited' } as any);
    expect(await read(plain._id)).toBe('batch_wise');
  });

  it('shows a published assignment only to the batch, the student or the schedule it was given to', async () => {
    const a1 = await student('a1@x.com', BATCH_A);
    const b1 = await student('b1@x.com', BATCH_B);
    await make('In the bank only');
    await make('Batch A', { accessibleTo: 'batch_wise', selectedBatches: [String(BATCH_A)] });
    await make('Just b1', { accessibleTo: 'individual', selectedStudents: [String(b1._id)] });
    const scheduled = await make('Scheduled to B');
    await AssessmentSchedule.create({ tenantId: String(TENANT), contentType: 'assignment', contentId: scheduled._id, batchId: BATCH_B, status: 'active' } as any);
    // A legacy row stored as "everyone" before this change reaches nobody either.
    const legacy = await make('Legacy everyone');
    await Assignment.collection.updateOne({ _id: legacy._id }, { $set: { accessibleTo: 'everyone' } });

    expect(await titlesFor(a1)).toEqual(['Batch A']);
    expect(await titlesFor(b1)).toEqual(['Just b1', 'Scheduled to B']);
  });

  it('keeps an assignment the student already started on their list', async () => {
    const a1 = await student('a1@x.com', BATCH_A);
    const legacy = await make('Started before the change');
    await Assignment.collection.updateOne({ _id: legacy._id }, { $set: { accessibleTo: 'everyone' } });
    await Submission.collection.insertOne({ tenant: TENANT, assignment: legacy._id, student: a1._id, status: 'submitted', attemptNumber: 1 });
    expect(await titlesFor(a1)).toEqual(['Started before the change']);
  });
});

describe('completion report', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/assignments', assignmentRoutes);

  it('counts only the students an assignment was given to', async () => {
    const admin = await User.create({ _id: ADMIN, tenantId: TENANT, firstName: 'A', lastName: 'D', email: 'admin@x.com', password: 'x', role: 'TENANT_ADMIN', isActive: true } as any);
    await student('a1@x.com', BATCH_A);
    await student('a2@x.com', BATCH_A);
    await student('b1@x.com', BATCH_B);
    const unassigned = await make('In the bank only');
    const scheduled = await make('Scheduled to A');
    await AssessmentSchedule.create({ tenantId: String(TENANT), contentType: 'assignment', contentId: scheduled._id, batchId: BATCH_A, status: 'active' } as any);

    const token = jwt.sign({ id: String(admin._id), email: admin.email, role: 'TENANT_ADMIN', tenantId: String(TENANT) }, process.env.JWT_SECRET as string);
    const detail = (id: any) => request(app).get(`/api/v1/assignments/${id}/completion`)
      .set('Authorization', `Bearer ${token}`).set('X-Tenant-Id', String(TENANT));
    expect((await detail(unassigned._id)).body.data.summary.total).toBe(0);
    const r = await detail(scheduled._id);
    expect(r.status).toBe(200);
    expect(r.body.data.summary.total).toBe(2);
  });
});
