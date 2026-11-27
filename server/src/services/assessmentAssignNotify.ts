import mongoose from 'mongoose';
import User from '../models/User';
import Quiz from '../models/Quiz';
import Assignment, { AssignmentStatus } from '../models/Assignment';
import { EmailService } from './emailService';
import { audienceIncludes } from './learnerAudience';

/**
 * Who hears about a quiz or assignment, and when (2026-11-26).
 *
 * Students are emailed when the content is ASSIGNED to them — through Assign to Batches (a batch
 * row or a list of students) — and only the students that assignment reaches:
 *   - a batch: its active students, home batch or placement batch (the same students the
 *     delivery resolver shows it to);
 *   - specific students: those students.
 * Saving the same batch again (new dates, a policy change) does not email again; only batches and
 * students that were not already assigned are told.
 *
 * Nothing is sent for content students cannot open: an external (link-only) quiz or assignment,
 * a CareerPilot unit or CareerPilot-only content, an inactive/archived quiz, or an assignment that
 * is not published yet (publishing it later tells the students it is already assigned to).
 */

export type AssignContentType = 'quiz' | 'assignment';

export interface AssignedTarget {
  /** Batch delivery: the batch. Absent for a specific-students row. */
  batchId?: string | null;
  batchName?: string;
  /** Specific-students delivery: the students to tell. */
  studentIds?: string[];
  startAt?: Date | string | null;
  dueAt?: Date | string | null;
}

export interface NotifyResult { emailed: number; skipped?: string }

const oid = (v: any) => new mongoose.Types.ObjectId(String(v));
const name = (u: any) => `${u.firstName || ''} ${u.lastName || ''}`.trim();

/** Why this content must not email anyone, or '' when it may. */
export async function silentReason(contentType: AssignContentType, contentId: string): Promise<{ reason: string; doc: any }> {
  if (contentType === 'quiz') {
    const q: any = await Quiz.findById(contentId).select('tenantId title description totalTime totalMarks isActive archivedAt isExternalQuiz unitCode audience').lean();
    if (!q) return { reason: 'not found', doc: null };
    if (q.isExternalQuiz) return { reason: 'external quiz', doc: q };
    if (q.unitCode || !audienceIncludes('lms', q.audience)) return { reason: 'not LMS content', doc: q };
    if (q.isActive === false || q.archivedAt) return { reason: 'quiz is inactive', doc: q };
    return { reason: '', doc: q };
  }
  const a: any = await Assignment.findById(contentId).select('tenant title description type difficulty totalPoints status isExternalAssignment unitCode audience').lean();
  if (!a) return { reason: 'not found', doc: null };
  if (a.isExternalAssignment) return { reason: 'external assignment', doc: a };
  if (a.unitCode || !audienceIncludes('lms', a.audience)) return { reason: 'not LMS content', doc: a };
  if (a.status !== AssignmentStatus.PUBLISHED) return { reason: 'assignment not published', doc: a };
  return { reason: '', doc: a };
}

/**
 * Email the students the given targets reach. Each student gets ONE email even when two of the
 * targets reach them (their home batch's dates win). `excludeStudentIds` are skipped — students
 * the caller already told.
 */
export async function notifyAssigned(
  tenantId: string,
  contentType: AssignContentType,
  contentId: string,
  targets: AssignedTarget[],
  excludeStudentIds: string[] = [],
): Promise<NotifyResult> {
  if (!targets.length) return { emailed: 0, skipped: 'nothing new assigned' };
  const { reason, doc } = await silentReason(contentType, contentId);
  if (reason) return { emailed: 0, skipped: reason };

  // The content's own institute when the caller has none (a platform admin assigning).
  if (!mongoose.isValidObjectId(String(tenantId || ''))) tenantId = String(doc.tenantId || doc.tenant || '');
  if (!mongoose.isValidObjectId(tenantId)) return { emailed: 0, skipped: 'no institute' };
  const tenant = oid(tenantId);
  const exclude = new Set(excludeStudentIds.map(String));
  // studentId → { user, target }
  const plan = new Map<string, { u: any; t: AssignedTarget }>();

  for (const t of targets) {
    let users: any[] = [];
    if (t.batchId) {
      users = await User.find({
        tenantId: tenant, role: 'STUDENT', isActive: true,
        $or: [{ batchId: oid(t.batchId) }, { placementBatchIds: oid(t.batchId) }],
      }).select('firstName lastName email batchId').lean();
    } else if (t.studentIds?.length) {
      users = await User.find({
        _id: { $in: t.studentIds.map(oid) }, tenantId: tenant, role: 'STUDENT', isActive: true,
      }).select('firstName lastName email batchId').lean();
    }
    for (const u of users) {
      const id = String(u._id);
      if (exclude.has(id) || !u.email) continue;
      const prev = plan.get(id);
      // A student's home batch row decides their dates over a placement batch or a students row.
      const isHome = t.batchId && String(u.batchId || '') === String(t.batchId);
      if (!prev || isHome) plan.set(id, { u, t });
    }
  }

  if (!plan.size) return { emailed: 0, skipped: 'no students with an email' };

  const mail = new EmailService(tenantId);
  let emailed = 0;
  // Sequential: EmailService's own throttle paces the sends for the provider.
  for (const { u, t } of plan.values()) {
    const ok = contentType === 'quiz'
      ? await mail.sendQuizNotificationEmail(u.email, name(u), {
          title: doc.title, description: doc.description, totalTime: doc.totalTime, totalMarks: doc.totalMarks,
          opensAt: t.startAt, dueAt: t.dueAt, batchName: t.batchId ? t.batchName : undefined,
        })
      : await mail.sendAssignmentNotificationEmail(u.email, name(u), {
          title: doc.title, description: doc.description, type: doc.type, difficulty: doc.difficulty,
          totalPoints: doc.totalPoints, opensAt: t.startAt, dueAt: t.dueAt, batchName: t.batchId ? t.batchName : undefined,
        });
    if (ok) emailed++;
  }
  console.log(`📧 ${contentType} "${doc.title}": emailed ${emailed} of ${plan.size} newly assigned student(s).`);
  return { emailed };
}

/** Fire-and-forget wrapper for request handlers: never throws. (EmailService is built with the
 *  tenant id, so the institute's sender and brand apply without the request context.) */
export function notifyAssignedInBackground(tenantId: string, contentType: AssignContentType, contentId: string, targets: AssignedTarget[], exclude: string[] = []) {
  if (!targets.length) return;
  notifyAssigned(tenantId, contentType, contentId, targets, exclude)
    .catch(err => console.error(`[assign-notify] ${contentType} ${contentId} failed:`, err?.message || err));
}
