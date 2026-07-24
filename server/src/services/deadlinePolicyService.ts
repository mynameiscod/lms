// ─────────────────────────────────────────────────────────────────────────────
// Deadline & late-policy resolution — the single source of truth for "when is
// this assessment due, and what happens after".
//
// Content (Assignment/Quiz) is reusable and dateless. The *schedule* (a per-batch
// AssessmentSchedule row, or a curriculum DayPlan item on a BatchOffering) carries
// the deadline + late policy. Policy cascades and the most specific layer wins:
//     template default (DayPlan item)  →  batch override (BatchOffering)  →  per-student grant
// This module resolves that cascade and computes the student-facing status.
// ─────────────────────────────────────────────────────────────────────────────

import { workingDateForDay, asLocalDate } from '../utils/planSchedule';

export type LatePolicy = 'open' | 'grace' | 'hard_lock';

// Full student-facing lifecycle. 'late' = submitted after due within grace.
export type AssessmentStatusKind =
  | 'not_started' | 'in_progress' | 'submitted' | 'graded' | 'late' | 'overdue' | 'missed';

export interface DeadlinePolicy {
  latePolicy: LatePolicy;
  graceDays: number;    // for 'grace': accept late until dueAt + graceDays
  penaltyPct: number;   // score penalty applied to a late submission
  dueOffsetDays: number; // due = base day date + this many days
  dueTime: string;      // 'HH:mm' local (IST) time of day the deadline lands
}

export const DEFAULT_POLICY: DeadlinePolicy = {
  latePolicy: 'grace',
  graceDays: 2,
  penaltyPct: 0,
  dueOffsetDays: 0,
  dueTime: '23:59',
};

/** Merge policy layers left→right; a later layer's defined fields override earlier ones. */
export function mergePolicy(...layers: (Partial<DeadlinePolicy> | null | undefined)[]): DeadlinePolicy {
  const out: DeadlinePolicy = { ...DEFAULT_POLICY };
  for (const layer of layers) {
    if (!layer) continue;
    if (layer.latePolicy !== undefined) out.latePolicy = layer.latePolicy;
    if (layer.graceDays !== undefined && layer.graceDays !== null) out.graceDays = layer.graceDays;
    if (layer.penaltyPct !== undefined && layer.penaltyPct !== null) out.penaltyPct = layer.penaltyPct;
    if (layer.dueOffsetDays !== undefined && layer.dueOffsetDays !== null) out.dueOffsetDays = layer.dueOffsetDays;
    if (layer.dueTime !== undefined && layer.dueTime !== null && layer.dueTime !== '') out.dueTime = layer.dueTime;
  }
  return out;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Apply a policy's dueOffsetDays + dueTime to a base calendar date → absolute deadline. */
export function applyDueTime(baseDate: Date, policy: DeadlinePolicy): Date {
  const d = asLocalDate(baseDate);
  d.setDate(d.getDate() + (policy.dueOffsetDays || 0));
  const [hh, mm] = String(policy.dueTime || '23:59').split(':').map(Number);
  d.setHours(hh || 23, mm || 59, 0, 0);
  return d;
}

/**
 * Curriculum path: the deadline for a plan item is derived from the batch's
 * offering start date + the item's dayNumber, then offset by the policy.
 */
export function dueAtForCurriculumDay(
  offeringStart: Date | string,
  dayNumber: number,
  holidays: Set<string>,
  policy: DeadlinePolicy,
): Date {
  const base = workingDateForDay(offeringStart, dayNumber, holidays);
  return applyDueTime(base, policy);
}

/** The last instant a late submission is still accepted (null = no deadline / open forever). */
export function lateUntil(dueAt: Date | null, policy: DeadlinePolicy): Date | null {
  if (!dueAt) return null;
  if (policy.latePolicy === 'hard_lock') return dueAt;
  if (policy.latePolicy === 'grace') return addDays(dueAt, policy.graceDays || 0);
  return null; // 'open' → never closes
}

export interface SubmissionLike {
  status?: string;
  graded?: boolean;
  submittedAt?: Date | string | null;
}

/**
 * The single status resolver. Given the resolved policy, the deadline, and the
 * student's submission (if any), return where they stand right now.
 */
export function computeStatus(opts: {
  policy: DeadlinePolicy;
  dueAt: Date | null;
  submission?: SubmissionLike | null;
  now?: Date;
}): AssessmentStatusKind {
  const now = opts.now || new Date();
  const { policy, dueAt } = opts;
  const sub = opts.submission;

  // Submitted / graded states win.
  if (sub) {
    if (sub.graded || sub.status === 'graded') return 'graded';
    if (sub.submittedAt) {
      const at = new Date(sub.submittedAt);
      if (dueAt && at > dueAt) return 'late';
      return 'submitted';
    }
    // started but not submitted → treat as in_progress unless the clock ran out below
  }

  // No (final) submission yet.
  if (!dueAt || now <= dueAt) {
    return sub ? 'in_progress' : 'not_started';
  }

  // Past the deadline with nothing submitted.
  if (policy.latePolicy === 'hard_lock') return 'missed';
  if (policy.latePolicy === 'open') return 'overdue'; // soft nudge, never missed
  // grace
  const until = lateUntil(dueAt, policy);
  return until && now > until ? 'missed' : 'overdue';
}

/** Enforcement gate for submit endpoints. */
export function canSubmit(
  policy: DeadlinePolicy,
  dueAt: Date | null,
  now: Date = new Date(),
): { allowed: boolean; late: boolean; reason?: string } {
  if (!dueAt || now <= dueAt) return { allowed: true, late: false };
  if (policy.latePolicy === 'hard_lock') return { allowed: false, late: false, reason: 'The deadline for this assessment has passed.' };
  if (policy.latePolicy === 'open') return { allowed: true, late: true };
  const until = lateUntil(dueAt, policy)!;
  if (now <= until) return { allowed: true, late: true };
  return { allowed: false, late: false, reason: 'The deadline and grace period for this assessment have passed.' };
}

/** Is this a "counts against the student as not done" state? Used by reports/gradebook. */
export const isMissed = (s: AssessmentStatusKind) => s === 'missed';
export const isDone = (s: AssessmentStatusKind) => s === 'submitted' || s === 'graded' || s === 'late';

// ─── Cascade resolution ──────────────────────────────────────────────────────

/** Pull the policy fields off a DayPlan item / AssessmentSchedule-like object. */
export function policyFromFields(x: any): Partial<DeadlinePolicy> {
  if (!x) return {};
  return {
    latePolicy: x.latePolicy, graceDays: x.graceDays, penaltyPct: x.penaltyPct,
    dueOffsetDays: x.dueOffsetDays, dueTime: x.dueTime,
  };
}

/** Find the BatchOffering.policyOverrides entry that applies to this item (itemId beats dayNumber). */
export function findPolicyOverride(offering: any, item: any, dayNumber: number): any | null {
  const ovs: any[] = offering?.policyOverrides || [];
  const itemId = item?._id ? String(item._id) : undefined;
  return (
    (itemId && ovs.find(o => o.itemId && String(o.itemId) === itemId)) ||
    ovs.find(o => o.dayNumber === dayNumber && !o.itemId) ||
    null
  );
}

/**
 * Curriculum path resolver: template item default → batch override → derived dueAt.
 * Returns the effective policy and the absolute deadline for THIS batch's cohort.
 */
export function resolveCurriculumPolicy(
  item: any,
  offering: any,
  dayNumber: number,
): { policy: DeadlinePolicy; dueAt: Date | null } {
  const ov = findPolicyOverride(offering, item, dayNumber);
  const policy = mergePolicy(policyFromFields(item), ov ? policyFromFields(ov) : undefined);
  let dueAt: Date | null = null;
  if (ov?.dueDateAbsolute) {
    dueAt = new Date(ov.dueDateAbsolute);
  } else if (offering?.startDate) {
    const holidays = new Set<string>(offering?.holidays || []);
    dueAt = dueAtForCurriculumDay(offering.startDate, dayNumber, holidays, policy);
  }
  return { policy, dueAt };
}
