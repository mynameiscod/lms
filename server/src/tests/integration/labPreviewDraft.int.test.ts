/**
 * "Preview today" on the Batch Assignments form (2026-11-28). It read only the batch's SAVED plan, so a
 * new or changed track/start date previewed as "that day has no content assigned". It now previews
 * the form's own values, and says which day it is and why it is empty.
 */
import mongoose from 'mongoose';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';
import { LabTrack, LabTrackItem } from '../../models/LabTrack';
import { previewToday } from '../../controllers/labTrackController';

jest.setTimeout(120_000);
const TENANT = new mongoose.Types.ObjectId();
const fakeRes = () => {
  const r: any = { statusCode: 200, body: null };
  r.status = (c: number) => { r.statusCode = c; return r; };
  r.json = (b: any) => { r.body = b; return r; };
  return r;
};
const preview = async (query: any) => {
  const res = fakeRes();
  await previewToday({ query, user: { id: String(new mongoose.Types.ObjectId()), tenantId: String(TENANT), role: 'ADMIN' }, tenantId: String(TENANT) } as any, res);
  return res;
};
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
const ALL_DAYS = '0,1,2,3,4,5,6';

beforeAll(startMongo);
afterAll(stopMongo);
afterEach(clearCollections);

test('previews the form values with no batch plan saved', async () => {
  const t: any = await LabTrack.create({ tenantId: TENANT, name: 'Comm', lab: 'communication', totalDays: 2, status: 'published' } as any);
  await LabTrackItem.create([
    { tenantId: TENANT, trackId: t._id, dayIndex: 1, position: 0, contentId: new mongoose.Types.ObjectId() },
    { tenantId: TENANT, trackId: t._id, dayIndex: 1, position: 1, contentId: new mongoose.Types.ObjectId() },
  ] as any);
  const res = await preview({ trackId: String(t._id), startDate: today(), workingDays: ALL_DAYS, cadence: 'daily', startTime: '00:00', endTime: '23:59' });
  expect(res.statusCode).toBe(200);
  expect(res.body.data).toMatchObject({ dayIndex: 1, windowState: 'open' });
  expect(res.body.data.items).toHaveLength(2);
});

test('an empty day says which day and how long the track is', async () => {
  const t: any = await LabTrack.create({ tenantId: TENANT, name: 'Comm', lab: 'communication', totalDays: 3, status: 'published' } as any);
  await LabTrackItem.create({ tenantId: TENANT, trackId: t._id, dayIndex: 2, position: 0, contentId: new mongoose.Types.ObjectId() } as any);
  const res = await preview({ trackId: String(t._id), startDate: today(), workingDays: ALL_DAYS, cadence: 'daily' });
  expect(res.body.data).toMatchObject({ reason: 'no_item', dayIndex: 1, trackDays: 2 });
});

test('a track of another institute is refused', async () => {
  const t: any = await LabTrack.create({ tenantId: new mongoose.Types.ObjectId(), name: 'X', lab: 'communication', totalDays: 1, status: 'published' } as any);
  const res = await preview({ trackId: String(t._id), startDate: today() });
  expect(res.statusCode).toBe(404);
});
