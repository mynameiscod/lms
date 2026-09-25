/**
 * Orientation: the welcome every new member meets before Day 1.
 *
 * ── WHAT THIS OWNS ────────────────────────────────────────────────────────────────────────
 *
 * Which days a tenant shows, what one member has done, whether they may open Day 1 yet, and the XP
 * a finished welcome day pays. Nothing else: it composes nothing, measures nothing, and writes no
 * skill evidence. See orientationPolicy for why that line is drawn where it is.
 *
 * ── WHO IT BLOCKS ─────────────────────────────────────────────────────────────────────────
 *
 * A member who has not started their programme completes orientation first. A member already past
 * their first learning day is offered it and never blocked — the welcome arriving after they began
 * must not lock them out of days they already paid for. The answer is decided ONCE, the first time
 * a member sees orientation, and stored: a rule that re-evaluated itself every request would start
 * blocking somebody the moment they were between journeys.
 */

import mongoose from 'mongoose';
import OrientationProgram from '../models/OrientationProgram';
import OrientationProgress, { IOrientationItemState } from '../models/OrientationProgress';
import CurriculumEnrollment from '../models/CurriculumEnrollment';
import { processGamificationEvent } from './gamificationEngine';
import {
  DEFAULT_ORIENTATION, OrientationDay, OrientationItem, ORIENTATION_XP_EVENT,
} from '../data/orientationPolicy';
import { calendarHasReached, opensAt, programmeDayOfOrientation } from '../data/dailyPacingPolicy';

export interface OrientationItemView extends OrientationItem {
  done: boolean;
  checked?: number[];
  recordingDurationSec?: number | null;
}

export interface OrientationDayView {
  dayNumber: number;
  title: string;
  blurb: string;
  items: OrientationItemView[];
  done: boolean;
  /** Open, or waiting. Orientation is met in order, like the programme, and a day at a time. */
  locked: boolean;
  /**
   * Why it is shut, when it is.
   *
   * 'PREVIOUS_DAY' — the day before it is not finished. 'NOT_TODAY_YET' — it is finished but the
   * calendar has not reached this day. Two very different things to be told: one is work to do,
   * the other is simply not yet, and a screen that said "locked" for both would have a member
   * hunting for work that does not exist.
   */
  lockedReason?: 'PREVIOUS_DAY' | 'NOT_TODAY_YET';
  /** The IST midnight that opens it, when the calendar is what is holding it. */
  opensAt?: string | null;
  minutes: number;
}

export interface OrientationView {
  enabled: boolean;
  /** True while this member must finish orientation before their first learning day. */
  mandatory: boolean;
  /** True when this member is also held to one day per calendar day. See dailyPacingPolicy. */
  paced: boolean;
  complete: boolean;
  days: OrientationDayView[];
  /** The day to open NOW — never one the calendar has not reached. Null when there is none. */
  nextDay: number | null;
  totalDays: number;
  completedDays: number;
}

/** No database, no stored welcome: the shipped default, and nobody blocked. Keeps unit tests honest. */
const connected = () => mongoose.connection?.readyState === 1;

/** The tenant's orientation, or the shipped default until an admin edits it. */
export async function orientationProgram(tenantId: string): Promise<{ enabled: boolean; days: OrientationDay[] }> {
  if (!connected()) return { enabled: true, days: DEFAULT_ORIENTATION };
  const doc: any = await OrientationProgram.findOne({ tenantId }).lean();
  if (!doc) return { enabled: true, days: DEFAULT_ORIENTATION };
  return {
    enabled: doc.enabled !== false,
    days: (doc.days || []).length ? doc.days : DEFAULT_ORIENTATION,
  };
}

/**
 * Has this member already begun a programme?
 *
 * Any enrolment with a finished day, or a current day past the first, means they were mid-journey
 * when orientation reached them. Asked once; the answer is stored on their progress record.
 */
async function alreadyStarted(tenantId: string, studentId: mongoose.Types.ObjectId): Promise<boolean> {
  if (!connected()) return true;
  const rows = await CurriculumEnrollment.find({ tenantId, studentId })
    .select('completedDays currentDay').lean() as any[];
  return rows.some(r => (r.completedDays || []).length > 0 || Number(r.currentDay || 1) > 1);
}

async function progressFor(tenantId: string, studentId: string) {
  const sid = new mongoose.Types.ObjectId(studentId);
  if (!connected()) {
    /* Nothing stored and nothing storable: an empty, non-blocking record. */
    return { completedDays: [], items: [], mandatory: false, save: async () => undefined } as any;
  }
  const existing = await OrientationProgress.findOne({ tenantId, studentId: sid });
  if (existing) return existing;

  const started = await alreadyStarted(tenantId, sid);
  const now = new Date();
  /*
   * Created on first sight, with BOTH questions answered for good: whether the welcome is
   * required, and whether this member is paced day by day.
   *
   * The two have the same answer for the same reason. A member who was already learning when
   * this arrived is neither blocked by the welcome nor held to a calendar — taking away days
   * somebody has already reached and paid for is worse than launching the rule late. Everybody
   * who starts from here is paced, from today.
   */
  const created = await OrientationProgress.create({
    tenantId, studentId: sid, completedDays: [], items: [], mandatory: !started, startedAt: now,
    paced: !started, pacedFrom: started ? undefined : now,
  }).catch(async (e: any) => {
    if (e?.code !== 11000) throw e;
    return OrientationProgress.findOne({ tenantId, studentId: sid });
  });
  return created!;
}

/**
 * Is this welcome day shut, and why? The one answer both writes below refuse by.
 *
 * Hiding a day's content is not a gate on its own — the endpoints that record work have to
 * refuse it too, or a day can be completed through the API that cannot be opened in the product.
 */
function orientationDayRefusal(
  ordered: OrientationDay[], progress: any, dayNumber: number, now: Date = new Date(),
): string | null {
  const doneDays = new Set<number>((progress.completedDays || []).map(Number));
  if (doneDays.has(dayNumber)) return null;   // finished days stay open for review

  const index = ordered.findIndex(d => d.dayNumber === dayNumber);
  if (index > 0 && !doneDays.has(ordered[index - 1].dayNumber)) {
    return 'Finish the day before this one first.';
  }

  const clock = progress.paced === true ? (progress.pacedFrom || progress.startedAt || null) : null;
  if (clock && !calendarHasReached(programmeDayOfOrientation(index + 1), clock, now)) {
    return 'This day opens tomorrow. One day at a time.';
  }
  return null;
}

const itemDone = (state: IOrientationItemState[], dayNumber: number, key: string) =>
  state.find(s => s.dayNumber === dayNumber && s.itemKey === key);

/** Everything the member's orientation screen needs, in one read. */
export async function orientationFor(tenantId: string, studentId: string): Promise<OrientationView> {
  const program = await orientationProgram(tenantId);
  if (!program.enabled) {
    return { enabled: false, mandatory: false, paced: false, complete: true, days: [], nextDay: null, totalDays: 0, completedDays: 0 };
  }

  const progress = await progressFor(tenantId, studentId);
  const doneDays = new Set<number>((progress.completedDays || []).map(Number));
  const ordered = [...program.days].sort((a, b) => a.dayNumber - b.dayNumber);

  /**
   * BOTH GATES, OR NEITHER OPENS THE DAY.
   *
   * The day before it must be finished, AND the calendar must have reached it. A member who
   * joined today gets day 0.1 and nothing else, however fast they work; tomorrow they get 0.2,
   * but only if 0.1 is done. Members created before pacing existed have `paced` absent and are
   * held to the completion ladder alone, exactly as before.
   */
  const paced = progress.paced === true;
  const clock: Date | null = paced ? (progress.pacedFrom || progress.startedAt || null) : null;
  const now = new Date();

  const days: OrientationDayView[] = ordered.map((d, i) => {
    const previousDone = i === 0 || doneDays.has(ordered[i - 1].dayNumber);
    const done = doneDays.has(d.dayNumber);
    const programmeDay = programmeDayOfOrientation(i + 1);
    const dated = !clock || calendarHasReached(programmeDay, clock, now);
    /* A day already finished stays open — the calendar never takes back what was done. */
    const locked = !done && (!previousDone || !dated);
    return {
      dayNumber: d.dayNumber,
      title: d.title,
      blurb: d.blurb,
      minutes: (d.items || []).reduce((n, it) => n + (Number(it.estimatedMinutes) || 0), 0),
      done,
      locked,
      lockedReason: !locked ? undefined : !previousDone ? 'PREVIOUS_DAY' : 'NOT_TODAY_YET',
      opensAt: clock && !done && previousDone && !dated
        ? (opensAt(programmeDay, clock, now)?.toISOString() ?? null)
        : null,
      /**
       * A LOCKED DAY IS NAMED, NOT SERVED.
       *
       * Its title, blurb and length travel so the plan can show what is coming; its items do not,
       * because they are the content and the day is not open yet. This is the rule the learning
       * days have always followed — the roadmap lists day 40 and the day endpoint refuses it —
       * and the welcome days sit in the same strip now, so they answer the same way.
       *
       * Without this the gate was decoration: every locked day arrived with its video, its notes
       * and its checklist in the same response that called it locked.
       */
      items: locked ? [] : (d.items || []).map(it => {
        const state = itemDone(progress.items || [], d.dayNumber, it.key);
        return {
          ...it,
          done: !!state,
          checked: state?.checked || [],
          recordingDurationSec: state?.recordingDurationSec ?? null,
        };
      }),
    };
  });

  const complete = ordered.every(d => doneDays.has(d.dayNumber));
  /*
   * The day to open NOW, which is not the same as the next unfinished one. A paced member whose
   * next day is tomorrow has nothing to open today, and saying otherwise would send them to a
   * day the server then refuses.
   */
  const next = days.find(d => !d.done && !d.locked)?.dayNumber ?? null;

  return {
    enabled: true,
    mandatory: !!progress.mandatory,
    paced,
    complete,
    days,
    nextDay: next,
    totalDays: ordered.length,
    completedDays: doneDays.size,
  };
}

/**
 * May this member open their first learning day?
 *
 * The one question the journey asks of orientation. False only for a member whose orientation is
 * mandatory and unfinished; a tenant with orientation off, or a member who was already learning,
 * is never held here.
 */
export async function orientationBlocksLearning(tenantId: string, studentId: string): Promise<boolean> {
  try {
    const view = await orientationFor(tenantId, studentId);
    return view.enabled && view.mandatory && !view.complete;
  } catch (e: any) {
    /*
     * FAILS OPEN, DELIBERATELY. Orientation is a welcome; if it cannot be read, the member is let
     * into the day they paid for. The opposite — a database hiccup locking a paying member out of
     * their programme — is the worse failure by far.
     */
    console.error('[orientation] gate check failed, letting the member through:', e?.message || e);
    return false;
  }
}

export interface ItemDoneInput {
  tenantId: string;
  studentId: string;
  dayNumber: number;
  itemKey: string;
  checked?: number[];
  recordingKey?: string | null;
  recordingMime?: string | null;
  recordingDurationSec?: number | null;
}

/** Mark one item finished. Idempotent: doing it twice records it once. */
export async function completeOrientationItem(input: ItemDoneInput): Promise<{ ok: boolean; message?: string }> {
  const program = await orientationProgram(input.tenantId);
  const day = program.days.find(d => d.dayNumber === Number(input.dayNumber));
  const item = day?.items?.find(i => i.key === input.itemKey);
  if (!day || !item) return { ok: false, message: 'That orientation item does not exist.' };

  const progress = await progressFor(input.tenantId, input.studentId);

  /**
   * Nothing is recorded against a day the member cannot open — out of order, or ahead of the
   * calendar. Refused by the same function the day submission uses, so the two can never
   * disagree about which days are shut.
   */
  const ordered = [...program.days].sort((a, b) => a.dayNumber - b.dayNumber);
  const refusal = orientationDayRefusal(ordered, progress, day.dayNumber);
  if (refusal) return { ok: false, message: refusal };
  const existing = (progress.items || []).find(s => s.dayNumber === day.dayNumber && s.itemKey === item.key);
  const state: IOrientationItemState = {
    dayNumber: day.dayNumber,
    itemKey: item.key,
    doneAt: existing?.doneAt || new Date(),
    checked: input.checked ?? existing?.checked ?? [],
    recordingKey: input.recordingKey ?? existing?.recordingKey ?? null,
    recordingMime: input.recordingMime ?? existing?.recordingMime ?? null,
    recordingDurationSec: input.recordingDurationSec ?? existing?.recordingDurationSec ?? null,
  } as IOrientationItemState;

  if (existing) Object.assign(existing, state);
  else (progress.items as any).push(state);
  await progress.save();
  return { ok: true };
}

export interface DayDoneResult {
  ok: boolean;
  message?: string;
  /** Required items the member has not done yet. The day is not finished until these are. */
  outstanding?: string[];
  xpAwarded?: number;
  complete?: boolean;
}

/**
 * Finish an orientation day.
 *
 * Refuses while a REQUIRED item is outstanding — and the recordings are deliberately not required,
 * so nobody is locked out of their programme by a missing microphone. Pays XP once per day.
 */
export async function completeOrientationDay(
  tenantId: string, studentId: string, dayNumber: number,
): Promise<DayDoneResult> {
  const program = await orientationProgram(tenantId);
  if (!program.enabled) return { ok: false, message: 'Orientation is not switched on.' };
  const day = program.days.find(d => d.dayNumber === Number(dayNumber));
  if (!day) return { ok: false, message: 'That orientation day does not exist.' };

  const progress = await progressFor(tenantId, studentId);
  const doneDays = new Set<number>((progress.completedDays || []).map(Number));

  const ordered = [...program.days].sort((a, b) => a.dayNumber - b.dayNumber);
  const refusal = orientationDayRefusal(ordered, progress, day.dayNumber);
  if (refusal) return { ok: false, message: refusal };

  const outstanding = (day.items || [])
    .filter(i => i.required && !itemDone(progress.items || [], day.dayNumber, i.key))
    .map(i => i.title);
  if (outstanding.length) return { ok: false, message: 'Some parts of this day are not finished yet.', outstanding };

  const alreadyDone = doneDays.has(day.dayNumber);
  if (!alreadyDone) {
    doneDays.add(day.dayNumber);
    progress.completedDays = [...doneDays].sort((a, b) => a - b);
    if (ordered.every(d => doneDays.has(d.dayNumber))) progress.completedAt = new Date();
    await progress.save();
  }

  /* Idempotent by source: the engine pays one award per day, however often this is called. */
  let xpAwarded = 0;
  try {
    const award = await processGamificationEvent({
      tenantId, studentId, eventKey: ORIENTATION_XP_EVENT,
      sourceType: 'orientation', sourceId: `day-${day.dayNumber}`,
    });
    xpAwarded = (award as any)?.xpAwarded ?? 0;
  } catch (e: any) {
    // XP is a reward, not the record. A member who finished a day has finished it.
    console.error('[orientation] XP award failed:', e?.message || e);
  }

  return { ok: true, xpAwarded, complete: !!progress.completedAt };
}

/** Where a member's recording for one item is stored, if they have made one. */
export async function recordingKeyFor(
  tenantId: string, studentId: string, dayNumber: number, itemKey: string,
): Promise<string | null> {
  if (!connected()) return null;
  const progress: any = await OrientationProgress.findOne({
    tenantId, studentId: new mongoose.Types.ObjectId(studentId),
  }).select('items').lean();
  const state = (progress?.items || []).find((s: any) => s.dayNumber === dayNumber && s.itemKey === itemKey);
  return state?.recordingKey || null;
}

/** Admin: replace the tenant's orientation. */
export async function saveOrientationProgram(
  tenantId: string, days: OrientationDay[], enabled: boolean, updatedBy?: string,
): Promise<{ ok: boolean; message?: string }> {
  if (!Array.isArray(days) || !days.length) return { ok: false, message: 'Orientation needs at least one day.' };

  const seen = new Set<number>();
  for (const d of days) {
    if (!Number.isInteger(d.dayNumber) || d.dayNumber < 1) return { ok: false, message: 'Every day needs a number.' };
    if (seen.has(d.dayNumber)) return { ok: false, message: `Day ${d.dayNumber} appears twice.` };
    seen.add(d.dayNumber);
    if (!String(d.title || '').trim()) return { ok: false, message: `Day ${d.dayNumber} needs a title.` };
    const keys = new Set<string>();
    for (const i of d.items || []) {
      const key = String(i.key || '').trim();
      if (!key) return { ok: false, message: `An item on day ${d.dayNumber} has no key.` };
      if (keys.has(key)) return { ok: false, message: `Day ${d.dayNumber} has two items keyed "${key}".` };
      keys.add(key);
    }
  }

  await OrientationProgram.updateOne(
    { tenantId },
    { $set: { enabled, days, updatedBy: updatedBy ? new mongoose.Types.ObjectId(updatedBy) : undefined } },
    { upsert: true },
  );
  return { ok: true };
}

/** Admin: back to the shipped welcome, content and all. */
export async function resetOrientationProgram(tenantId: string, updatedBy?: string) {
  return saveOrientationProgram(tenantId, DEFAULT_ORIENTATION, true, updatedBy);
}

/**
 * ── ORIENTATION AS PART OF THE ROADMAP ────────────────────────────────────────────────────
 *
 * The welcome is five days of the plan as a student reads it, and until now it lived only on its
 * own screen — so somebody looking at their roadmap saw Day 1 first and had no idea the five days
 * they had been asked to do were part of anything.
 *
 * They are numbered 0.1 to 0.5 and sit BEFORE Day 1. The number is a label and nothing else: it is
 * a string, it is never arithmetic, and no DayPlan is written for it.
 *
 * ── WHY THEY ARE NOT DAYS OF THE JOURNEY ──────────────────────────────────────────────────
 *
 * They are deliberately NOT counted in the programme length. A 90-day programme is ninety learning
 * days and a 110-day one is a hundred and ten; the welcome is not learning, carries no units, no
 * skills and no evidence, and a student who was promised ninety must not be handed eighty-five and
 * five days of induction. journeyDaysOf and the whole-journey check are untouched by this.
 *
 * Keeping them out of DayPlan is also what makes this reach EVERY student rather than only the
 * ones enrolled after today. Nothing is stored and nothing is backfilled: a roadmap composed a
 * month ago grows its welcome the next time it is read, because the welcome is read, not written.
 */
export interface OrientationRoadmapDay {
  /** The label the student sees: "0.1" through "0.5". A string, never a number to compute with. */
  day: string;
  /** The orientation day this opens — what the orientation screen is addressed by. */
  dayNumber: number;
  title: string;
  blurb: string;
  minutes: number;
  status: 'COMPLETED' | 'CURRENT' | 'UPCOMING';
  locked: boolean;
}

export interface OrientationRoadmap {
  mandatory: boolean;
  complete: boolean;
  /** True while this member must finish the welcome before Day 1 opens. */
  blocking: boolean;
  totalDays: number;
  completedDays: number;
  days: OrientationRoadmapDay[];
}

/**
 * The welcome, shaped for a roadmap. Null when the tenant has it switched off or it cannot be
 * read — the roadmap then renders exactly as it did before, which is the correct failure.
 */
export async function orientationRoadmap(
  tenantId: string, studentId: string,
): Promise<OrientationRoadmap | null> {
  try {
    const view = await orientationFor(tenantId, studentId);
    if (!view.enabled || !view.days.length) return null;

    const firstOpen = view.days.find(d => !d.done && !d.locked)?.dayNumber ?? null;
    return {
      mandatory: view.mandatory,
      complete: view.complete,
      blocking: view.mandatory && !view.complete,
      totalDays: view.totalDays,
      completedDays: view.completedDays,
      days: view.days.map((d, i) => ({
        day: `0.${i + 1}`,
        dayNumber: d.dayNumber,
        title: d.title,
        blurb: d.blurb,
        minutes: d.minutes,
        status: d.done ? 'COMPLETED' : d.dayNumber === firstOpen ? 'CURRENT' : 'UPCOMING',
        locked: d.locked,
      })),
    };
  } catch (e: any) {
    /* Same reason orientationBlocksLearning fails open: a welcome must never break a roadmap. */
    console.error('[orientation] roadmap view failed:', e?.message || e);
    return null;
  }
}

/**
 * When this member's 95 days began, or null when they are not paced.
 *
 * READ ONLY, and deliberately so: progressFor creates a record on first sight, and the journey
 * asking "is this learner paced" must never be the thing that decides they are. A member who has
 * never opened the welcome gets null here and the completion ladder alone, until the welcome
 * itself creates their record and answers the question properly.
 */
export async function pacingClockFor(tenantId: string, studentId: string): Promise<Date | null> {
  if (!connected() || !mongoose.Types.ObjectId.isValid(studentId)) return null;
  try {
    const row: any = await OrientationProgress
      .findOne({ tenantId, studentId: new mongoose.Types.ObjectId(studentId) })
      .select('paced pacedFrom startedAt').lean();
    if (!row || row.paced !== true) return null;
    return row.pacedFrom || row.startedAt || null;
  } catch (e: any) {
    /*
     * Fails open, like every other read on this path. A database hiccup must not lock a paying
     * member out of the day they are on; the worst case is that they are briefly unpaced.
     */
    console.error('[pacing] could not read the clock, leaving this learner unpaced:', e?.message || e);
    return null;
  }
}
