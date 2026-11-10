/**
 * My Tasks never lists a CareerPilot checkpoint or unit project to a plain LMS student.
 *
 * A checkpoint is saved as accessibleTo 'everyone' so members can open it from their day. The
 * "Direct assignment" half of My Tasks read that as "assigned to every student in the tenant",
 * so every LMS student saw every checkpoint with a 31 Dec 2099 due date. These tests go through
 * the real route stack against a real database and hold that:
 *   - a plain LMS student no longer sees CareerPilot items that reach them only via 'everyone';
 *   - a CareerPilot item given to them by name or by batch still shows (an explicit choice);
 *   - an LMS quiz or assignment for 'everyone' still shows (nothing else changed);
 *   - a member, a lapsed member and a trialist see exactly what they saw before.
 */

import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import request from 'supertest';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';

jest.setTimeout(180_000);
process.env.JWT_SECRET = process.env.JWT_SECRET || 'my-tasks-audience-integration-test-secret-0123456789';

import User from '../../models/User';
import Quiz from '../../models/Quiz';
import Assignment from '../../models/Assignment';
import enrollmentPlanRoutes from '../../routes/enrollmentPlanRoutes';

const TENANT = '507f1f77bcf86cd799439e21';
const BATCH = new mongoose.Types.ObjectId();

const app = express();
app.use(express.json());
app.use('/api/v1/enrollment-plans', enrollmentPlanRoutes);

const quiz = (title: string, over: any = {}) => Quiz.create({
  title, tenantId: TENANT, createdBy: 'test',
  startDate: new Date(Date.now() - 86_400_000), endDate: new Date('2099-12-31'),
  startTime: '00:00', endTime: '23:59', totalMarks: 3, totalTime: 10,
  access: 'public', accessibleTo: 'everyone', isActive: true, ...over,
} as any);

const assignment = (title: string, createdBy: any, over: any = {}) => Assignment.create({
  tenant: new mongoose.Types.ObjectId(TENANT), title, type: 'project', createdBy, totalPoints: 100,
  status: 'published', accessibleTo: 'everyone',
  rubric: [{ criterion: 'Works', maxPoints: 100 }], ...over,
} as any);

let seq = 0;
const learner = async (over: any = {}) => {
  const u = await User.create({
    tenantId: new mongoose.Types.ObjectId(TENANT), firstName: 'L', lastName: String(++seq),
    email: `learner${seq}@example.com`, password: 'x', role: 'STUDENT', isActive: true, ...over,
  } as any);
  const token = jwt.sign({ id: String(u._id), email: u.email, role: 'STUDENT', tenantId: TENANT }, process.env.JWT_SECRET as string);
  return { u, token };
};

const titlesFor = async (token: string): Promise<string[]> => {
  const r = await request(app).get('/api/v1/enrollment-plans/my-tasks')
    .set('Authorization', `Bearer ${token}`).set('x-tenant-id', TENANT);
  expect(r.status).toBe(200);
  const tasks = Array.isArray(r.body) ? r.body : (r.body.tasks || r.body.data || []);
  return tasks.map((t: any) => t.title).sort();
};

let staff: any;
beforeAll(async () => { await startMongo(); });
afterAll(stopMongo);
beforeEach(async () => {
  await clearCollections();
  staff = await User.create({
    tenantId: new mongoose.Types.ObjectId(TENANT), firstName: 'S', lastName: 'Taff',
    email: 'staff@example.com', password: 'x', role: 'TENANT_ADMIN', isActive: true,
  } as any);
  // The CareerPilot rows as the seeders write them: unit-bound, 'everyone', labelled or not.
  await quiz('Hardware Practice — checkpoint', { unitCode: 'T_HW_PRACTICE', audience: 'careerpilot' });
  await quiz('Hexadecimal — checkpoint', { unitCode: 'T_HEX' }); // written before the label existed
  await quiz('Members-only quiz', { audience: 'careerpilot' });
  await assignment('Variables mini project', staff._id, { unitCode: 'T_VARIABLES_MINI_PROJECT' });
  // What an LMS admin publishes for everyone.
  await quiz('LMS weekly quiz', { audience: 'lms' });
  await quiz('Old LMS quiz'); // no audience: legacy LMS row
  await assignment('LMS homework', staff._id, { audience: 'lms' });
});

const CP_ITEMS = ['Hardware Practice — checkpoint', 'Hexadecimal — checkpoint', 'Members-only quiz', 'Variables mini project'];
const LMS_ITEMS = ['LMS homework', 'LMS weekly quiz', 'Old LMS quiz'];

describe('My Tasks for a plain LMS student', () => {
  it('lists the LMS items and none of the CareerPilot ones', async () => {
    const { token } = await learner({ batchId: BATCH });
    expect(await titlesFor(token)).toEqual([...LMS_ITEMS].sort());
  });

  it('still lists a CareerPilot item an admin gave them by name or by batch', async () => {
    const { u, token } = await learner({ batchId: BATCH });
    await quiz('Checkpoint given by name', { unitCode: 'T_X', audience: 'careerpilot', accessibleTo: 'individual', selectedStudents: [String(u._id)] });
    await quiz('Checkpoint given to the batch', { unitCode: 'T_Y', audience: 'careerpilot', accessibleTo: 'batch_wise', selectedBatches: [String(BATCH)] });
    const titles = await titlesFor(token);
    expect(titles).toEqual(expect.arrayContaining(['Checkpoint given by name', 'Checkpoint given to the batch', ...LMS_ITEMS]));
    for (const t of CP_ITEMS) expect(titles).not.toContain(t);
  });

  it('treats an unused trial record (an empty list) as no trial', async () => {
    const { token } = await learner({ passport: { trial: { practiceIds: [] } } });
    expect(await titlesFor(token)).toEqual([...LMS_ITEMS].sort());
  });
});

describe('My Tasks for anyone who has been a CareerPilot member — unchanged', () => {
  const everything = [...CP_ITEMS, ...LMS_ITEMS].sort();

  it('an active member', async () => {
    const { token } = await learner({ passport: { active: true, product: 'careerpilot', expiresAt: new Date(Date.now() + 86_400_000 * 30) } });
    expect(await titlesFor(token)).toEqual(everything);
  });

  it('a lapsed member', async () => {
    const { token } = await learner({ passport: { active: false, product: 'careerpilot', expiresAt: new Date(Date.now() - 86_400_000) } });
    expect(await titlesFor(token)).toEqual(everything);
  });

  it('a trialist', async () => {
    const { token } = await learner({ passport: { trial: { planName: 'Try it', startedAt: new Date(), endsAt: new Date(Date.now() + 86_400_000) } } });
    expect(await titlesFor(token)).toEqual(everything);
  });
});
