/**
 * Website batches (2026-11-26): staff type the next batch date and seats; the public website reads
 * GET /api/v1/public/:tenantSlug/next-batch. Against a real database.
 */
import mongoose from 'mongoose';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';
import Tenant from '../../models/Tenant';
import { WebsiteBatch } from '../../models/WebsiteBatch';
import {
  listCourses, saveCourse, createBatch, updateBatch, deleteBatch, adminOverview, publicNextBatch, websiteCourseName,
  displayDate, todayIST, invalidate, WebsiteBatchError,
} from '../../services/websiteBatchService';
import { getPublicNextBatch } from '../../controllers/websiteBatchController';

jest.setTimeout(120_000);

let TENANT: string;
const ADMIN = { id: String(new mongoose.Types.ObjectId()), name: 'Siva' };
const day = (offset: number) => new Date(Date.parse(`${todayIST()}T00:00:00Z`) + offset * 86_400_000).toISOString().slice(0, 10);

beforeAll(startMongo);
afterAll(stopMongo);
beforeEach(async () => {
  const t: any = await Tenant.create({ name: 'CodeBegun', slug: 'codebegun', adminId: new mongoose.Types.ObjectId() } as any);
  TENANT = String(t._id);
  invalidate(TENANT);
});
afterEach(clearCollections);

const fakeRes = () => {
  const r: any = { statusCode: 200, headers: {} as Record<string, string>, body: null };
  r.status = (c: number) => { r.statusCode = c; return r; };
  r.json = (b: any) => { r.body = b; return r; };
  r.setHeader = (k: string, v: string) => { r.headers[k.toLowerCase()] = v; };
  return r;
};

describe('courses', () => {
  it('start with the six courses from www.codebegun.com, and more can be added', async () => {
    const list = await listCourses(TENANT);
    expect(list.map(c => c.key)).toEqual(['java_full_stack', 'python_full_stack', 'data_analytics', 'data_science', 'fde', 'generative_ai']);
    expect(list[0].name).toBe('Java Full Stack with AI');
    expect((await listCourses(TENANT)).length).toBe(6); // not seeded twice

    await saveCourse(TENANT, { key: 'mern_stack', name: 'MERN Stack' });
    expect((await listCourses(TENANT)).map(c => c.key)).toContain('mern_stack');
    await expect(saveCourse(TENANT, { key: 'Bad Key', name: 'x' })).rejects.toThrow(WebsiteBatchError);
    await expect(saveCourse(TENANT, { key: 'mern_stack', name: 'again' })).rejects.toThrow(/already exists/);
    expect(await websiteCourseName(TENANT, 'java_full_stack')).toBe('Java Full Stack with AI');
  });
});

describe('which batch the website shows', () => {
  beforeEach(async () => { await listCourses(TENANT); });

  it('the earliest batch that is on, has seats and starts after today', async () => {
    await createBatch(TENANT, ADMIN, { courseKey: 'java_full_stack', startDate: day(0), seatsLeft: 9 });           // starts today → moved on
    await createBatch(TENANT, ADMIN, { courseKey: 'java_full_stack', startDate: day(3), seatsLeft: 0 });           // full
    await createBatch(TENANT, ADMIN, { courseKey: 'java_full_stack', startDate: day(4), seatsLeft: 5, showOnWebsite: false }); // hidden
    const live: any = await createBatch(TENANT, ADMIN, { courseKey: 'java_full_stack', startDate: day(10), seatsLeft: 25, mode: 'Offline · Hyderabad' });
    await createBatch(TENANT, ADMIN, { courseKey: 'java_full_stack', startDate: day(20), seatsLeft: 30 });
    await createBatch(TENANT, ADMIN, { courseKey: 'data_science', startDate: day(6), seatsLeft: 12 });

    const java = (await publicNextBatch(TENANT, 'java_full_stack'))!;
    expect(java).toMatchObject({ course: 'java_full_stack', courseName: 'Java Full Stack with AI', startDate: day(10), daysLeft: 10, seatsLeft: 25, mode: 'Offline · Hyderabad' });
    expect(java.displayDate).toBe(displayDate(day(10)));
    expect(await publicNextBatch(TENANT, 'python_full_stack')).toBeNull();   // no batch → the site hides the bar
    expect(await publicNextBatch(TENANT, 'no_such_course')).toBeNull();

    // The top bar: the soonest of all courses, with every course's batch alongside.
    const top = (await publicNextBatch(TENANT))!;
    expect(top.course).toBe('data_science');
    expect(top.courses!.map(c => c.course)).toEqual(['java_full_stack', 'data_science']);

    // The admin view says which one is live and why the others are not.
    const view = await adminOverview(TENANT);
    const javaCard = view.courses.find(c => c.key === 'java_full_stack')!;
    expect(javaCard.live).toBe(String(live._id));
    expect(javaCard.batches.map(b => b.state)).toEqual(['started', 'full', 'hidden', 'live', 'queued']);
  });

  it('seats set to 0 moves the website to the next batch at once, and the change is recorded', async () => {
    const a: any = await createBatch(TENANT, ADMIN, { courseKey: 'java_full_stack', startDate: day(5), seatsLeft: 25 });
    await createBatch(TENANT, ADMIN, { courseKey: 'java_full_stack', startDate: day(30), seatsLeft: 30 });
    expect((await publicNextBatch(TENANT, 'java_full_stack'))!.startDate).toBe(day(5)); // cached now

    await updateBatch(TENANT, ADMIN, String(a._id), { seatsLeft: 0 });
    expect((await publicNextBatch(TENANT, 'java_full_stack'))!.startDate).toBe(day(30)); // not the stale cache

    await updateBatch(TENANT, ADMIN, String(a._id), { seatsLeft: 3, startDate: day(7) });
    const now = (await publicNextBatch(TENANT, 'java_full_stack'))!;
    expect(now).toMatchObject({ startDate: day(7), seatsLeft: 3 });

    const row: any = await WebsiteBatch.findById(a._id).lean();
    expect(row.history.map((h: any) => h.change)).toEqual([
      `added: starts ${displayDate(day(5))}, 25 seats left`,
      'seats left 25 → 0',
      `start date ${displayDate(day(5))} → ${displayDate(day(7))}, seats left 0 → 3`,
    ]);
    expect(row.history[1].byName).toBe('Siva');

    await deleteBatch(TENANT, String(a._id));
    expect((await publicNextBatch(TENANT, 'java_full_stack'))!.startDate).toBe(day(30));
  });

  it('refuses bad input and other institutes’ batches', async () => {
    await expect(createBatch(TENANT, ADMIN, { courseKey: 'java_full_stack', startDate: 'tomorrow', seatsLeft: 5 })).rejects.toThrow(/start date/);
    await expect(createBatch(TENANT, ADMIN, { courseKey: 'java_full_stack', startDate: day(5), seatsLeft: -1 })).rejects.toThrow(/Seats left/);
    await expect(createBatch(TENANT, ADMIN, { courseKey: 'java_full_stack', startDate: day(5), seatsLeft: 2.5 })).rejects.toThrow(/Seats left/);
    await expect(createBatch(TENANT, ADMIN, { courseKey: 'unknown_course', startDate: day(5), seatsLeft: 5 })).rejects.toThrow(/Pick a course/);
    const b: any = await createBatch(TENANT, ADMIN, { courseKey: 'fde', startDate: day(5), seatsLeft: 5 });
    await expect(updateBatch(String(new mongoose.Types.ObjectId()), ADMIN, String(b._id), { seatsLeft: 1 })).rejects.toThrow(/not found/);
  });
});

describe('the public endpoint', () => {
  it('answers by institute slug, cacheable for 60 s, with data null when there is nothing', async () => {
    await listCourses(TENANT);
    let res = fakeRes();
    await getPublicNextBatch({ params: { tenantSlug: 'codebegun' }, query: { course: 'java_full_stack' } } as any, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, message: 'OK', data: null });
    expect(res.headers['cache-control']).toBe('public, max-age=60');

    await createBatch(TENANT, ADMIN, { courseKey: 'java_full_stack', startDate: day(6), seatsLeft: 25 });
    res = fakeRes();
    await getPublicNextBatch({ params: { tenantSlug: 'CodeBegun' }, query: { course: 'java_full_stack' } } as any, res);
    expect(res.body.data).toEqual(expect.objectContaining({ course: 'java_full_stack', startDate: day(6), seatsLeft: 25, daysLeft: 6 }));
    expect(Object.keys(res.body.data).sort()).toEqual(['course', 'courseName', 'daysLeft', 'displayDate', 'mode', 'seatsLeft', 'startDate', 'updatedAt']);

    res = fakeRes();
    await getPublicNextBatch({ params: { tenantSlug: 'nobody' }, query: {} } as any, res);
    expect(res.statusCode).toBe(404);
  });

  it('formats dates the way the website shows them', () => {
    expect(displayDate('2026-12-02')).toBe('2nd Dec 2026');
    expect(displayDate('2026-12-01')).toBe('1st Dec 2026');
    expect(displayDate('2026-12-11')).toBe('11th Dec 2026');
    expect(displayDate('2026-12-23')).toBe('23rd Dec 2026');
    expect(displayDate('2027-01-31')).toBe('31st Jan 2027');
  });
});
