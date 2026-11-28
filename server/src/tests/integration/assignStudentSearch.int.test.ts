/**
 * "Assign → Specific students" for a custom role with only quiz/assignment permissions (2026-11-28).
 *
 * The student picker called /activity/students, which needs the Activity Logs or Reports permission, so
 * such a role could assign to a whole batch but never found a student to tick. The picker now has its
 * own endpoint guarded by the same permissions as assigning.
 */
import mongoose from 'mongoose';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';

jest.setTimeout(180_000);
jest.mock('../../services/assessmentAssignNotify', () => ({
  ...jest.requireActual('../../services/assessmentAssignNotify'),
  notifyAssignedInBackground: () => undefined,
}));

import User from '../../models/User';
import Role from '../../models/Role';
import AssessmentSchedule from '../../models/AssessmentSchedule';
import { searchStudents, assignToBatches } from '../../controllers/assessmentScheduleController';

const TENANT = new mongoose.Types.ObjectId();
const OTHER = new mongoose.Types.ObjectId();

const fakeRes = () => {
  const r: any = { statusCode: 200, body: null };
  r.status = (c: number) => { r.statusCode = c; return r; };
  r.json = (b: any) => { r.body = b; return r; };
  return r;
};
const call = async (fn: any, user: any, extra: any = {}) => {
  const res = fakeRes();
  await fn({ query: {}, body: {}, user, ...extra } as any, res);
  return res;
};
const userWith = async (permissions: string[]) => {
  const role: any = await Role.create({ name: `R${permissions.join('-')}`, permissions, tenantId: TENANT } as any);
  return { id: String(new mongoose.Types.ObjectId()), tenantId: String(TENANT), role: 'STAFF', customRoleId: String(role._id) };
};

beforeAll(startMongo);
afterAll(stopMongo);
let asha: any;
beforeEach(async () => {
  asha = await User.create({ tenantId: TENANT, firstName: 'Asha', lastName: 'Rao', email: 'asha@x.com', password: 'x', role: 'STUDENT', isActive: true } as any);
  await User.create({ tenantId: TENANT, firstName: 'Ravi', lastName: 'K', email: 'ravi@x.com', password: 'x', role: 'STUDENT', isActive: true } as any);
  await User.create({ tenantId: OTHER, firstName: 'Asha', lastName: 'Elsewhere', email: 'asha2@x.com', password: 'x', role: 'STUDENT', isActive: true } as any);
  await User.create({ tenantId: TENANT, firstName: 'Asha', lastName: 'Staff', email: 'asha3@x.com', password: 'x', role: 'STAFF', isActive: true } as any);
});
afterEach(clearCollections);

test.each([['create_quiz'], ['edit_quiz'], ['manage_assignments']])('a role with only %s can search and assign one student', async (perm) => {
  const user = await userWith([perm]);
  const found = await call(searchStudents, user, { query: { search: 'asha' } });
  expect(found.statusCode).toBe(200);
  expect(found.body.data.map((s: any) => s.email)).toEqual(['asha@x.com']); // own institute, students only

  const contentId = String(new mongoose.Types.ObjectId());
  const done = await call(assignToBatches, user, { body: { contentType: 'quiz', contentId, contentTitle: 'Arrays', students: [String(asha._id)] } });
  expect(done.statusCode).toBe(200);
  const row: any = await AssessmentSchedule.findOne({ contentId }).lean();
  expect(row.studentIds.map(String)).toEqual([String(asha._id)]);
});

test('without any quiz/assignment permission the picker is refused', async () => {
  const res = await call(searchStudents, await userWith(['view_leads']), { query: { search: '' } });
  expect(res.statusCode).toBe(403);
});

test('search text is matched literally (no regex injection) and an empty search lists students', async () => {
  const user = await userWith(['create_quiz']);
  expect((await call(searchStudents, user, { query: { search: '.*' } })).body.data).toEqual([]);
  expect((await call(searchStudents, user, { query: { search: '' } })).body.data).toHaveLength(2);
});
