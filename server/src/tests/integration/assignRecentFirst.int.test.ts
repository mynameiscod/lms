/**
 * A quiz or assignment assigned again goes to the top of the curriculum picker (2026-11-28).
 *
 * The picker listed by creation date only (first 100), so an old quiz assigned again this week was
 * buried and had to be found by its exact title. Now: most recently assigned OR added first.
 */
import mongoose from 'mongoose';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';

jest.setTimeout(180_000);
jest.mock('../../services/assessmentAssignNotify', () => ({
  ...jest.requireActual('../../services/assessmentAssignNotify'),
  notifyAssignedInBackground: () => undefined,
}));

import Quiz from '../../models/Quiz';
import Assignment from '../../models/Assignment';
import { assignToBatches } from '../../controllers/assessmentScheduleController';
import { getActivityBank } from '../../controllers/curriculumController';

const TENANT = new mongoose.Types.ObjectId();
const day = (n: number) => new Date(Date.now() - n * 86_400_000);

const fakeRes = () => {
  const r: any = { statusCode: 200, body: null };
  r.status = (c: number) => { r.statusCode = c; return r; };
  r.json = (b: any) => { r.body = b; return r; };
  return r;
};
const user = { tenantId: String(TENANT), id: String(new mongoose.Types.ObjectId()), role: 'TENANT_ADMIN' };
const bank = async (kind: string, search = '') => {
  const res = fakeRes();
  await getActivityBank({ query: { kind, search }, user } as any, res);
  expect(res.statusCode).toBe(200);
  return res.body.items as any[];
};
const assign = async (contentType: string, contentId: any) => {
  const res = fakeRes();
  await assignToBatches({ body: { contentType, contentId: String(contentId), contentTitle: 'x', batches: [{ batchId: String(new mongoose.Types.ObjectId()), batchName: 'B1' }] }, user } as any, res);
  expect(res.statusCode).toBe(200);
};

beforeAll(startMongo);
afterAll(stopMongo);
afterEach(clearCollections);

test('quiz: newest first, until an old one is assigned again', async () => {
  const ids: Record<string, any> = {};
  for (const [title, age] of [['Old loops', 60], ['Mid arrays', 20], ['New strings', 1]] as const) {
    const r = await Quiz.collection.insertOne({ tenantId: String(TENANT), title, createdAt: day(age), updatedAt: day(age) } as any);
    ids[title] = r.insertedId;
  }
  expect((await bank('quiz')).map(i => i.title)).toEqual(['New strings', 'Mid arrays', 'Old loops']);

  await assign('quiz', ids['Old loops']);
  const items = await bank('quiz');
  expect(items.map(i => i.title)).toEqual(['Old loops', 'New strings', 'Mid arrays']);
  expect(items[0].lastAssignedAt).toBeTruthy();
  expect(items[1].lastAssignedAt).toBeNull();
});

test('assignment: the same, and its tenant filter still applies', async () => {
  const mk = (title: string, age: number, tenant = TENANT) =>
    Assignment.collection.insertOne({ tenant, title, type: 'CODING', createdAt: day(age), updatedAt: day(age) } as any);
  const old = await mk('Old project', 90);
  await mk('New project', 2);
  await mk('Other institute', 0, new mongoose.Types.ObjectId());
  expect((await bank('assignment')).map(i => i.title)).toEqual(['New project', 'Old project']);
  await assign('assignment', old.insertedId);
  expect((await bank('assignment')).map(i => i.title)).toEqual(['Old project', 'New project']);
});

test('search is literal: a "(" does not break it', async () => {
  await Quiz.collection.insertOne({ tenantId: String(TENANT), title: 'Loops (basics)', createdAt: day(1) } as any);
  expect((await bank('quiz', 'loops (')).map(i => i.title)).toEqual(['Loops (basics)']);
  expect(await bank('quiz', '.*')).toEqual([]);
});
