import mongoose from 'mongoose';
import { LabTrack, LabTrackItem, LabTrackAssignment, LabKind } from '../models/LabTrack';

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
  item: any | null;
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

  const track: any = await LabTrack.findById(a.trackId).lean();
  if (!track) return { reason: 'no_assignment' };
  // A half-authored plan must never reach a student.
  if (track.status !== 'published') return { reason: 'track_unpublished' };

  const tz = a.window?.tz || IST;
  if (ymdIn(new Date(a.startDate), tz) > ymdIn(now, tz)) return { reason: 'not_started' };

  const dayIndex = dayIndexFor(a, now);
  if (dayIndex === null) return { reason: 'non_learning_day' };

  const item: any = await LabTrackItem.findOne({ trackId: a.trackId, dayIndex }).lean();

  return {
    assignment: a,
    track,
    dayIndex,
    item: item || null,
    contentId: item?.contentId || null,
    windowState: windowState(a, now),
    reason: item ? undefined : 'no_item',
  };
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
