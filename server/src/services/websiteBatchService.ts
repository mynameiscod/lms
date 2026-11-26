/**
 * Website batches (2026-11-26) — see models/WebsiteBatch.ts.
 *
 * Which batch a course shows: the earliest one that is switched on, has seats left (> 0) and starts
 * AFTER today (Indian time). So setting seats to 0, or reaching the start date, moves the website on
 * to that course's next batch by itself. No such batch → nothing (the website hides the bar).
 *
 * The top bar (no course asked for) has its own common date and seats: batches under the reserved
 * key "common", chosen by the same rule. With no common batch it falls back to the soonest course
 * batch, so the bar is never empty while any course has one.
 */
import mongoose from 'mongoose';
import { WebsiteCourse, WebsiteBatch } from '../models/WebsiteBatch';

/** The courses on www.codebegun.com (2026-11-26) — loaded the first time an institute opens the screen. */
export const DEFAULT_WEBSITE_COURSES: { key: string; name: string }[] = [
  { key: 'java_full_stack', name: 'Java Full Stack with AI' },
  { key: 'python_full_stack', name: 'Python Full Stack with AI' },
  { key: 'data_analytics', name: 'Data Analytics with AI' },
  { key: 'data_science', name: 'Data Science with AI' },
  { key: 'fde', name: 'Forward Deployed AI Engineer' },
  { key: 'generative_ai', name: 'Generative AI / AI-ML' },
];

/** Reserved course key for the top bar's own common date and seats. */
export const COMMON = 'common';
export const COMMON_NAME = 'All courses';

export class WebsiteBatchError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const KEY = /^[a-z0-9_]{2,40}$/;

/** Today's date in India, 'YYYY-MM-DD'. */
export const todayIST = (now = new Date()) => new Date(now.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "2nd Dec 2026" */
export function displayDate(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const suffix = d % 100 >= 11 && d % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[d % 10] || 'th';
  return `${d}${suffix} ${MONTHS[m - 1]} ${y}`;
}

// ── Courses ──────────────────────────────────────────────────────────────
/** The institute's website courses; the first call loads the defaults. */
export async function listCourses(tenantId: string) {
  let rows = await WebsiteCourse.find({ tenantId }).sort({ order: 1, name: 1 }).lean();
  if (!rows.length) {
    await WebsiteCourse.bulkWrite(DEFAULT_WEBSITE_COURSES.map((c, i) => ({
      updateOne: { filter: { tenantId, key: c.key }, update: { $setOnInsert: { tenantId, key: c.key, name: c.name, active: true, order: i } }, upsert: true },
    })));
    rows = await WebsiteCourse.find({ tenantId }).sort({ order: 1, name: 1 }).lean();
  }
  return rows.map((c: any) => ({ id: String(c._id), key: c.key, name: c.name, active: c.active !== false, order: c.order || 0 }));
}

export async function saveCourse(tenantId: string, body: { id?: string; key?: string; name?: string; active?: boolean }) {
  const name = String(body.name || '').trim().slice(0, 120);
  if (body.id) {
    if (!mongoose.isValidObjectId(body.id)) throw new WebsiteBatchError('Course not found', 404);
    const set: any = {};
    if (name) set.name = name;
    if (typeof body.active === 'boolean') set.active = body.active;
    const r = await WebsiteCourse.updateOne({ _id: body.id, tenantId }, { $set: set });
    if (!r.matchedCount) throw new WebsiteBatchError('Course not found', 404);
  } else {
    const key = String(body.key || '').trim().toLowerCase();
    if (!KEY.test(key)) throw new WebsiteBatchError('The key must be 2–40 lowercase letters, numbers or _ (for example java_full_stack).');
    if (key === COMMON) throw new WebsiteBatchError('"common" is kept for the top bar. Pick another key.');
    if (!name) throw new WebsiteBatchError('Give the course a name.');
    if (await WebsiteCourse.exists({ tenantId, key })) throw new WebsiteBatchError('A course with that key already exists.');
    const order = (await WebsiteCourse.countDocuments({ tenantId }));
    await WebsiteCourse.create({ tenantId, key, name, active: true, order });
  }
  invalidate(tenantId);
}

// ── Batches ──────────────────────────────────────────────────────────────
const n = (v: unknown) => (typeof v === 'number' ? v : Number(String(v ?? '').trim()));

function cleanInput(body: any, partial: boolean) {
  const out: any = {};
  if (!partial || body.courseKey !== undefined) {
    out.courseKey = String(body.courseKey || '').trim().toLowerCase();
    if (!KEY.test(out.courseKey)) throw new WebsiteBatchError('Pick a course.');
  }
  if (!partial || body.startDate !== undefined) {
    out.startDate = String(body.startDate || '').trim();
    if (!YMD.test(out.startDate) || isNaN(Date.parse(`${out.startDate}T00:00:00Z`))) throw new WebsiteBatchError('Pick a start date.');
  }
  if (!partial || body.seatsLeft !== undefined) {
    const s = n(body.seatsLeft);
    if (!Number.isInteger(s) || s < 0 || s > 100000) throw new WebsiteBatchError('Seats left must be a whole number, 0 or more.');
    out.seatsLeft = s;
  }
  if (body.mode !== undefined) out.mode = String(body.mode || '').trim().slice(0, 80);
  if (body.showOnWebsite !== undefined) out.showOnWebsite = !!body.showOnWebsite;
  return out;
}

const describe = (before: any, after: any) => {
  const parts: string[] = [];
  if (before.startDate !== after.startDate) parts.push(`start date ${displayDate(before.startDate)} → ${displayDate(after.startDate)}`);
  if (before.seatsLeft !== after.seatsLeft) parts.push(`seats left ${before.seatsLeft} → ${after.seatsLeft}`);
  if ((before.mode || '') !== (after.mode || '')) parts.push(`mode "${before.mode || ''}" → "${after.mode || ''}"`);
  if (before.showOnWebsite !== after.showOnWebsite) parts.push(after.showOnWebsite ? 'shown on the website' : 'hidden from the website');
  if (before.courseKey !== after.courseKey) parts.push(`course ${before.courseKey} → ${after.courseKey}`);
  return parts.join(', ');
};

export async function createBatch(tenantId: string, user: { id?: string; name?: string }, body: any) {
  const v = cleanInput(body, false);
  if (v.courseKey !== COMMON && !(await WebsiteCourse.exists({ tenantId, key: v.courseKey }))) throw new WebsiteBatchError('Pick a course from the list.');
  const doc = await WebsiteBatch.create({
    tenantId, ...v, showOnWebsite: v.showOnWebsite ?? true,
    createdBy: user.id, updatedBy: user.id,
    history: [{ at: new Date(), by: user.id, byName: user.name, change: `added: starts ${displayDate(v.startDate)}, ${v.seatsLeft} seats left` }],
  });
  invalidate(tenantId);
  return doc.toObject();
}

export async function updateBatch(tenantId: string, user: { id?: string; name?: string }, id: string, body: any) {
  if (!mongoose.isValidObjectId(id)) throw new WebsiteBatchError('Batch not found', 404);
  const before: any = await WebsiteBatch.findOne({ _id: id, tenantId }).lean();
  if (!before) throw new WebsiteBatchError('Batch not found', 404);
  const v = cleanInput(body, true);
  if (v.courseKey && v.courseKey !== COMMON && !(await WebsiteCourse.exists({ tenantId, key: v.courseKey }))) throw new WebsiteBatchError('Pick a course from the list.');
  const after = { ...before, ...v };
  const change = describe(before, after);
  if (!change) return before;
  const doc = await WebsiteBatch.findOneAndUpdate(
    { _id: id, tenantId },
    { $set: { ...v, updatedBy: user.id }, $push: { history: { $each: [{ at: new Date(), by: user.id, byName: user.name, change }], $slice: -50 } } },
    { new: true },
  ).lean();
  invalidate(tenantId);
  return doc;
}

export async function deleteBatch(tenantId: string, id: string) {
  if (!mongoose.isValidObjectId(id)) throw new WebsiteBatchError('Batch not found', 404);
  const r = await WebsiteBatch.deleteOne({ _id: id, tenantId });
  if (!r.deletedCount) throw new WebsiteBatchError('Batch not found', 404);
  invalidate(tenantId);
}

/** Every batch, grouped by course, with what the website shows now — for the admin screen. */
export async function adminOverview(tenantId: string) {
  const [courses, batches] = await Promise.all([listCourses(tenantId), WebsiteBatch.find({ tenantId }).sort({ startDate: 1 }).lean()]);
  const today = todayIST();
  const live = pickLive(batches as any[], today);
  const rows = (key: string) => {
    const shown = live.get(key);
    return (batches as any[]).filter((b) => b.courseKey === key).map((b) => ({
      id: String(b._id), courseKey: b.courseKey, startDate: b.startDate, displayDate: displayDate(b.startDate),
      daysLeft: daysBetween(today, b.startDate), seatsLeft: b.seatsLeft, mode: b.mode || '', showOnWebsite: b.showOnWebsite !== false,
      state: b.startDate <= today ? 'started' : b.showOnWebsite === false ? 'hidden' : b.seatsLeft <= 0 ? 'full' : shown && String(shown._id) === String(b._id) ? 'live' : 'queued',
      updatedAt: b.updatedAt, history: (b.history || []).slice(-10).reverse().map((h: any) => ({ at: h.at, byName: h.byName || '', change: h.change })),
    }));
  };
  const commonLive = live.get(COMMON);
  return {
    today,
    /** The top bar's own common date and seats. */
    common: { key: COMMON, name: COMMON_NAME, live: commonLive ? String(commonLive._id) : null, batches: rows(COMMON) },
    courses: courses.map((c) => {
      const shown = live.get(c.key);
      return { ...c, live: shown ? String(shown._id) : null, batches: rows(c.key) };
    }),
  };
}

/** courseKey → the batch the website shows. */
function pickLive(batches: any[], today: string): Map<string, any> {
  const out = new Map<string, any>();
  for (const b of [...batches].sort((x, y) => String(x.startDate).localeCompare(String(y.startDate)))) {
    if (b.showOnWebsite === false || !(b.seatsLeft > 0) || !(b.startDate > today)) continue;
    if (!out.has(b.courseKey)) out.set(b.courseKey, b);
  }
  return out;
}

// ── Public (the website) ─────────────────────────────────────────────────
export interface PublicBatch {
  course: string; courseName: string; startDate: string; displayDate: string; daysLeft: number;
  seatsLeft: number; mode: string; updatedAt: string;
}

const CACHE_MS = 60_000;
const cache = new Map<string, { at: number; today: string; all: PublicBatch[]; common: PublicBatch | null }>();
export function invalidate(tenantId: string) { cache.delete(String(tenantId)); }

async function publicAll(tenantId: string): Promise<{ all: PublicBatch[]; common: PublicBatch | null }> {
  const today = todayIST();
  const hit = cache.get(tenantId);
  if (hit && hit.today === today && Date.now() - hit.at < CACHE_MS) return hit;
  const [courses, batches] = await Promise.all([
    WebsiteCourse.find({ tenantId, active: { $ne: false } }).sort({ order: 1 }).lean(),
    WebsiteBatch.find({ tenantId, showOnWebsite: { $ne: false }, seatsLeft: { $gt: 0 }, startDate: { $gt: today } }).sort({ startDate: 1 }).lean(),
  ]);
  const live = pickLive(batches as any[], today);
  const toPublic = (key: string, name: string, b: any): PublicBatch => ({
    course: key, courseName: name, startDate: b.startDate, displayDate: displayDate(b.startDate),
    daysLeft: daysBetween(today, b.startDate), seatsLeft: b.seatsLeft, mode: b.mode || '',
    updatedAt: new Date(b.updatedAt).toISOString(),
  });
  const all: PublicBatch[] = [];
  for (const c of courses as any[]) {
    const b = live.get(c.key);
    if (b) all.push(toPublic(c.key, c.name, b));
  }
  const cb = live.get(COMMON);
  const entry = { at: Date.now(), today, all, common: cb ? toPublic(COMMON, COMMON_NAME, cb) : null };
  cache.set(tenantId, entry);
  return entry;
}

/**
 * The website's answer.
 *  - ?course=<key>: that course's batch, or null (the course page hides its batch section).
 *  - no course (the top bar on every page): the common date and seats staff set for the top bar;
 *    with none, the soonest course batch. `source` says which. Every course's batch is in `courses`.
 *    null when there is nothing at all.
 */
export async function publicNextBatch(tenantId: string, course?: string): Promise<(PublicBatch & { source?: 'common' | 'soonest_course'; courses?: PublicBatch[] }) | null> {
  const { all, common } = await publicAll(String(tenantId));
  const key = String(course || '').trim().toLowerCase();
  if (key) return key === COMMON ? common : all.find((b) => b.course === key) || null;
  if (common) return { ...common, source: 'common', courses: all };
  if (!all.length) return null;
  const soonest = [...all].sort((a, b) => a.startDate.localeCompare(b.startDate) || b.seatsLeft - a.seatsLeft)[0];
  return { ...soonest, source: 'soonest_course', courses: all };
}

/** Course key → name, for website leads (a course on this list may tag a lead). */
export async function websiteCourseName(tenantId: string, key: string): Promise<string | null> {
  const c: any = await WebsiteCourse.findOne({ tenantId, key: String(key || '').toLowerCase(), active: { $ne: false } }).select('name').lean();
  return c?.name || null;
}
