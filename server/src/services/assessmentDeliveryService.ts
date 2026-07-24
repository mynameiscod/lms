// ─────────────────────────────────────────────────────────────────────────────
// Resolve "when is THIS assessment due for THIS student, and under what policy".
//
// Priority:
//   1. AssessmentSchedule row for the student's batch (the new reusable path).
//   2. Fallback to the content's own baked dates (Assignment.dueDate /
//      Quiz.endDate) so every existing assignment/quiz keeps working unchanged
//      until it's migrated onto a schedule.
// ─────────────────────────────────────────────────────────────────────────────

import AssessmentSchedule from '../models/AssessmentSchedule';
import Assignment from '../models/Assignment';
import Quiz from '../models/Quiz';
import User from '../models/User';
import { DeadlinePolicy, DEFAULT_POLICY, mergePolicy, canSubmit } from './deadlinePolicyService';

export type ContentType = 'assignment' | 'quiz';

export interface ResolvedDelivery {
  dueAt: Date | null;
  startAt: Date | null;
  policy: DeadlinePolicy;
  source: 'schedule' | 'baked' | 'none';
  scheduleId?: string;
  batchId?: string;
}

/** Combine a Date + 'HH:mm' into an absolute local datetime. */
function atTime(date: Date | string | undefined | null, time?: string): Date | null {
  if (!date) return null;
  const d = new Date(date);
  if (time && /^\d{1,2}:\d{2}$/.test(time)) {
    const [hh, mm] = time.split(':').map(Number);
    d.setHours(hh, mm, 0, 0);
  }
  return d;
}

async function studentBatchId(studentId: string): Promise<string | null> {
  const u = await User.findById(studentId).select('batchId').lean() as any;
  return u?.batchId ? String(u.batchId) : null;
}

/** Baked-date fallback for an assignment (keeps legacy behavior). */
function bakedFromAssignment(a: any): ResolvedDelivery {
  const dueAt = a?.dueDate ? new Date(a.dueDate) : null;
  const startAt = a?.startDate ? new Date(a.startDate) : null;
  // If the assignment allows late submission up to a deadline, model it as 'grace'.
  let policy: DeadlinePolicy = { ...DEFAULT_POLICY };
  if (a?.lateSubmissionDeadline && dueAt) {
    const graceMs = new Date(a.lateSubmissionDeadline).getTime() - dueAt.getTime();
    const graceDays = Math.max(0, Math.round(graceMs / (1000 * 60 * 60 * 24)));
    policy = mergePolicy(policy, { latePolicy: 'grace', graceDays, penaltyPct: a.lateSubmissionPenalty || 0 });
  } else if (dueAt) {
    // No configured late window → default to grace (friendly) unless you tighten it.
    policy = mergePolicy(policy, { penaltyPct: a?.lateSubmissionPenalty || 0 });
  }
  return { dueAt, startAt, policy, source: dueAt ? 'baked' : 'none' };
}

/** Baked-date fallback for a quiz (historically a hard window closing at endDate). */
function bakedFromQuiz(q: any): ResolvedDelivery {
  const dueAt = atTime(q?.endDate, q?.endTime);
  const startAt = atTime(q?.startDate, q?.startTime);
  const policy = mergePolicy(DEFAULT_POLICY, { latePolicy: 'hard_lock' });
  return { dueAt, startAt, policy, source: dueAt ? 'baked' : 'none' };
}

/**
 * Resolve delivery for a student. Reads the batch schedule first, else the baked
 * dates on the content. Returns a stable shape either way.
 */
export async function resolveForStudent(
  tenantId: string,
  studentId: string,
  contentType: ContentType,
  contentId: string,
): Promise<ResolvedDelivery> {
  const batchId = await studentBatchId(studentId);

  if (batchId) {
    const sched = await AssessmentSchedule.findOne({
      tenantId, contentType, contentId, batchId, status: 'active',
    }).lean() as any;
    if (sched) {
      return {
        dueAt: sched.dueAt ? new Date(sched.dueAt) : null,
        startAt: sched.startAt ? new Date(sched.startAt) : null,
        policy: mergePolicy(DEFAULT_POLICY, {
          latePolicy: sched.latePolicy, graceDays: sched.graceDays,
          penaltyPct: sched.penaltyPct, dueTime: sched.dueTime,
        }),
        source: 'schedule',
        scheduleId: String(sched._id),
        batchId,
      };
    }
  }

  // Fallback to the content's baked dates.
  if (contentType === 'assignment') {
    const a = await Assignment.findById(contentId).select('startDate dueDate lateSubmissionDeadline lateSubmissionPenalty').lean();
    return { ...bakedFromAssignment(a), batchId: batchId || undefined };
  }
  const q = await Quiz.findById(contentId).select('startDate endDate startTime endTime').lean();
  return { ...bakedFromQuiz(q), batchId: batchId || undefined };
}

/**
 * Enforcement gate for start/submit endpoints. Blocks if the assessment isn't open
 * yet, or the deadline (under hard_lock / expired grace) has passed. `late` flags a
 * within-grace submission so the caller can apply the penalty.
 */
export async function checkDeadlineGate(
  tenantId: string,
  studentId: string,
  contentType: ContentType,
  contentId: string,
  now: Date = new Date(),
): Promise<{ allowed: boolean; late: boolean; reason?: string; dueAt: Date | null; policy: DeadlinePolicy }> {
  const d = await resolveForStudent(tenantId, studentId, contentType, contentId);
  // Enforce ONLY for the new per-batch schedule path. Un-migrated content (baked
  // dates) keeps its existing enforcement in the respective service — zero change.
  if (d.source !== 'schedule') {
    return { allowed: true, late: false, dueAt: d.dueAt, policy: d.policy };
  }
  if (d.startAt && now < d.startAt) {
    return { allowed: false, late: false, reason: `This assessment opens on ${d.startAt.toLocaleString('en-IN')}.`, dueAt: d.dueAt, policy: d.policy };
  }
  const gate = canSubmit(d.policy, d.dueAt, now);
  return { allowed: gate.allowed, late: gate.late, reason: gate.reason, dueAt: d.dueAt, policy: d.policy };
}
