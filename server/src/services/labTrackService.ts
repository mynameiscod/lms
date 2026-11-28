import mongoose from 'mongoose';
import { LabTrack, LabTrackItem, LabTrackAssignment, LabKind } from '../models/LabTrack';
import DailyChallenge from '../models/DailyChallenge';
import CommunicationAttempt from '../models/CommunicationAttempt';

/**
 * Resolves "what is this student's lab item today" without anyone having scheduled it.
 *
 * The old model needed one row per batch per day. Production has three of them across
 * every batch, which is exactly why students are told "No challenge scheduled yet" —
 * the work was real but nobody could keep up with it by hand. Here the day is DERIVED:
 * count the working days between the batch's start date and today, and that number is
 * the position in a track authored once and reused by every batch.
 *
 * Weekends and holidays are skipped WITHOUT consuming a position, so a plan does not
 * drift out of sequence when a week has a holiday in it — day 12 is the twelfth day of
 * learning, not the twelfth day of the calendar.
 */

const IST = 'Asia/Kolkata';

/** 'YYYY-MM-DD' in the assignment's timezone, so "today" means the student's today. */
export function ymdIn(date: Date, tz = IST): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
}

function weekdayIn(date: Date, tz = IST): number {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(date);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(name);
}

/** Does this calendar date consume a position in the plan? */
function isLearningDay(date: Date, a: any): boolean {
  const tz = a.window?.tz || IST;
  if ((a.holidays || []).includes(ymdIn(date, tz))) return false;
  const wd = weekdayIn(date, tz);
  if (!(a.workingDays || [1, 2, 3, 4, 5]).includes(wd)) return false;
  // 'custom' cadence is how the two labs alternate — thinking Mon/Wed/Fri,
  // communication Tue/Thu — without either track skipping content.
  if (a.cadence === 'custom' && (a.cadenceDays || []).length) {
    return a.cadenceDays.includes(wd);
  }
  return true;
}

/**
 * Position in the plan for `now`, 1-based, or null when today is not a learning day.
 * Counts forward from startDate; a batch that started 30 calendar days ago with two
 * holidays and eight weekend days sits on day 20, not day 30.
 */
export function dayIndexFor(a: any, now = new Date()): number | null {
  const tz = a.window?.tz || IST;
  const todayKey = ymdIn(now, tz);
  const start = new Date(a.startDate);
  if (ymdIn(start, tz) > todayKey) return null;      // hasn't begun
  if (!isLearningDay(now, a)) return null;           // weekend / holiday / off-cadence

  let idx = 0;
  const cursor = new Date(start);
  // Bounded so a mis-set startDate can never spin: 3 years of calendar days.
  for (let guard = 0; guard < 1100; guard++) {
    if (isLearningDay(cursor, a)) idx++;
    if (ymdIn(cursor, tz) === todayKey) return idx;
    cursor.setDate(cursor.getDate() + 1);
  }
  return null;
}

export type WindowState = 'upcoming' | 'open' | 'closed';

/** Where the clock sits relative to today's window, in the assignment's timezone. */
export function windowState(a: any, now = new Date()): WindowState {
  const tz = a.window?.tz || IST;
  const hm = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(now);
  const start = a.window?.startTime || '00:00';
  const end = a.window?.endTime || '23:59';
  if (hm < start) return 'upcoming';
  if (hm > end) return 'closed';
  return 'open';
}

export interface ResolvedLabDay {
  assignment: any;
  track: any;
  dayIndex: number;
  /** The day's first question (kept for callers that handle one). */
  item: any | null;
  /** Every question of the day, in order. A day may hold several (2026-11-28). */
  items: any[];
  contentId: mongoose.Types.ObjectId | null;
  windowState: WindowState;
  reason?: 'no_assignment' | 'not_started' | 'non_learning_day' | 'no_item' | 'track_unpublished';
}

/**
 * Today's lab item for one student's batch.
 *
 * Returns a reason rather than throwing, so callers can say something specific — "your
 * plan starts on Monday" reads very differently from "nothing is scheduled", and the
 * second message is what students see today.
 */
export async function resolveLabDay(
  tenantId: string,
  batchId: string | null,
  lab: LabKind,
  now = new Date(),
): Promise<ResolvedLabDay | { reason: ResolvedLabDay['reason'] }> {
  if (!batchId) return { reason: 'no_assignment' };

  const a: any = await LabTrackAssignment.findOne({
    tenantId, batchId: new mongoose.Types.ObjectId(batchId), lab, status: 'active',
  }).lean();
  if (!a) return { reason: 'no_assignment' };

  return resolveDayFor(a, now);
}

/**
 * Today's lab day for an assignment that need not be saved: the Assign panel previews exactly what
 * is on the form (track, start date, working days, cadence, window) before the admin saves it.
 */
export async function resolveDayFor(
  a: any,
  now = new Date(),
): Promise<ResolvedLabDay | { reason: ResolvedLabDay['reason']; dayIndex?: number; trackDays?: number }> {
  const track: any = await LabTrack.findById(a.trackId).lean();
  if (!track) return { reason: 'no_assignment' };
  // A half-authored plan must never reach a student.
  if (track.status !== 'published') return { reason: 'track_unpublished' };

  const tz = a.window?.tz || IST;
  if (ymdIn(new Date(a.startDate), tz) > ymdIn(now, tz)) return { reason: 'not_started' };

  const dayIndex = dayIndexFor(a, now);
  if (dayIndex === null) return { reason: 'non_learning_day' };

  const items: any[] = await LabTrackItem.find({ trackId: a.trackId, dayIndex }).sort({ position: 1, _id: 1 }).lean();
  const item = items[0];
  // Which day it landed on, and how long the track is, so "nothing today" can say why.
  const trackDays = item ? undefined : ((await LabTrackItem.findOne({ trackId: a.trackId }).sort({ dayIndex: -1 }).select('dayIndex').lean()) as any)?.dayIndex || 0;

  return {
    assignment: a,
    track,
    dayIndex,
    item: item || null,
    items,
    contentId: item?.contentId || null,
    windowState: windowState(a, now),
    reason: item ? undefined : 'no_item',
    ...(trackDays !== undefined ? { trackDays } : {}),
  } as any;
}

/**
 * How many learning days the student has been expected to complete so far — the
 * denominator for "missed days", which is what the gate escalates on.
 */
export function expectedDaysSoFar(a: any, now = new Date()): number {
  const tz = a.window?.tz || IST;
  const todayKey = ymdIn(now, tz);
  const cursor = new Date(a.startDate);
  let n = 0;
  for (let guard = 0; guard < 1100; guard++) {
    if (isLearningDay(cursor, a)) n++;
    if (ymdIn(cursor, tz) === todayKey) break;
    cursor.setDate(cursor.getDate() + 1);
  }
  return n;
}


/* ── Several questions a day (2026-11-28) ──────────────────────────────────
 * A day of a track may hold several questions. A day counts as DONE only when the student has
 * finished as many different questions that date as the day holds — the streak, the gate and the
 * Progress tab all use this rule. Counting (not matching ids) keeps a day that was overridden by
 * hand, or a track edited after the fact, from being marked missed for a student who did the work.
 */

/** Every learning date from the plan's start up to `until` (inclusive), with its day of the plan. */
export function learningDates(a: any, until = new Date()): { date: string; dayIndex: number }[] {
  const tz = a.window?.tz || IST;
  const lastKey = ymdIn(until, tz);
  const out: { date: string; dayIndex: number }[] = [];
  const cursor = new Date(a.startDate);
  if (ymdIn(cursor, tz) > lastKey) return out;
  let idx = 0;
  for (let guard = 0; guard < 1100; guard++) {
    const key = ymdIn(cursor, tz);
    if (isLearningDay(cursor, a)) { idx++; out.push({ date: key, dayIndex: idx }); }
    if (key >= lastKey) break;
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

/** How many questions each day of a track holds (a day with none counts as one). */
export async function questionsPerDay(trackId: any): Promise<Map<number, number>> {
  const rows: any[] = await LabTrackItem.aggregate([
    { $match: { trackId: new mongoose.Types.ObjectId(String(trackId)) } },
    { $group: { _id: '$dayIndex', n: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [r._id as number, r.n as number]));
}

const DONE_THINKING = ['submitted', 'solved'];

/**
 * Per student, per date: how many different daily questions were finished. Practice outside the
 * daily lab (the Communication Lab's coach) is not counted.
 */
export async function questionsDoneByDate(
  lab: LabKind, studentIds: any[], from: string, to: string,
): Promise<Map<string, Map<string, number>>> {
  const sets = new Map<string, Map<string, Set<string>>>();
  const add = (sid: string, date: string, cid: string) => {
    let byDate = sets.get(sid); if (!byDate) sets.set(sid, (byDate = new Map()));
    let s = byDate.get(date); if (!s) byDate.set(date, (s = new Set()));
    s.add(cid);
  };
  if (lab === 'thinking') {
    const rows: any[] = await DailyChallenge.find({ studentId: { $in: studentIds }, date: { $gte: from, $lte: to }, status: { $in: DONE_THINKING } })
      .select('studentId date problemId').lean();
    for (const r of rows) add(String(r.studentId), r.date, String(r.problemId));
  } else {
    // practiceDate is the student's IST day; very old rows only have createdAt.
    const start = new Date(`${from}T00:00:00+05:30`); const end = new Date(`${to}T23:59:59.999+05:30`);
    const rows: any[] = await CommunicationAttempt.find({
      studentId: { $in: studentIds }, status: 'completed', kind: { $ne: 'coach' },
      $or: [{ practiceDate: { $gte: from, $lte: to } }, { practiceDate: { $in: [null, ''] }, createdAt: { $gte: start, $lte: end } }],
    }).select('studentId practiceDate createdAt challengeId').lean();
    for (const r of rows) add(String(r.studentId), r.practiceDate || ymdIn(new Date(r.createdAt)), String(r.challengeId));
  }
  const out = new Map<string, Map<string, number>>();
  for (const [sid, byDate] of sets) out.set(sid, new Map([...byDate].map(([d, s]) => [d, s.size])));
  return out;
}

/** Today's questions for one student: how many the day holds and how many are finished. */
export async function labDayStatus(
  lab: LabKind, studentId: any, resolved: any, date: string,
): Promise<{ total: number; done: number; complete: boolean }> {
  const total = Math.max(1, (resolved?.items || []).length);
  const m = await questionsDoneByDate(lab, [studentId], date, date);
  const done = m.get(String(studentId))?.get(date) || 0;
  return { total, done: Math.min(done, total), complete: done >= total };
}
