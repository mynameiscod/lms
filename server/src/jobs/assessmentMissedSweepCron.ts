import AssessmentSchedule from '../models/AssessmentSchedule';
import MissedAssessment from '../models/MissedAssessment';
import Submission, { SubmissionStatus } from '../models/Submission';
import QuizAttempt from '../models/QuizAttempt';
import User from '../models/User';
import CurriculumEnrollment from '../models/CurriculumEnrollment';
import DayPlan from '../models/DayPlan';
import BatchOffering from '../models/BatchOffering';
import { policyFromRow } from '../services/assessmentDeliveryService';
import { lateUntil, resolveCurriculumPolicy } from '../services/deadlinePolicyService';

const INTERVAL_MS = 6 * 60 * 60 * 1000; // every 6h

async function hasSubmitted(contentType: string, contentId: any, studentId: any): Promise<boolean> {
  if (contentType === 'assignment') {
    return !!(await Submission.exists({
      assignment: contentId, student: studentId,
      status: { $in: [SubmissionStatus.SUBMITTED, SubmissionStatus.GRADED, 'late'] as any },
    }));
  }
  return !!(await QuizAttempt.exists({ quizId: contentId, studentId, status: 'submitted' }));
}

let markedTotal = 0, healedTotal = 0;

/** Upsert a "missed" (or clear a stale one) keyed by student+content. */
async function markOrHeal(missed: boolean, doc: any) {
  const key = { studentId: doc.studentId, contentType: doc.contentType, contentId: doc.contentId };
  if (missed) {
    const r = await MissedAssessment.updateOne(key, { $setOnInsert: { markedAt: new Date() }, $set: doc }, { upsert: true });
    if ((r as any).upsertedCount) markedTotal++;
  } else {
    const del = await MissedAssessment.deleteOne(key);
    if (del.deletedCount) healedTotal++;
  }
}

/** Standalone AssessmentSchedule deliveries. */
async function sweepSchedules(now: Date) {
  const schedules = await AssessmentSchedule.find({
    status: 'active', dueAt: { $exists: true, $ne: null }, latePolicy: { $in: ['grace', 'hard_lock'] },
  }).lean();
  for (const s of schedules as any[]) {
    const closeAt = lateUntil(new Date(s.dueAt), policyFromRow(s));
    const students = s.batchId
      ? await User.find({ batchId: s.batchId, role: 'STUDENT' }).select('_id').lean()
      : (Array.isArray(s.studentIds) ? s.studentIds.map((id: any) => ({ _id: id })) : []);
    for (const u of students as any[]) {
      const submitted = await hasSubmitted(s.contentType, s.contentId, u._id);
      const missed = !submitted && closeAt != null && now > closeAt;
      await markOrHeal(missed, {
        tenantId: s.tenantId, studentId: u._id, contentType: s.contentType, contentId: s.contentId,
        contentTitle: s.contentTitle, batchId: s.batchId, scheduleId: s._id, source: 'schedule', dueAt: s.dueAt,
      });
    }
  }
}

/** Curriculum-day deliveries (learning plan). Per-student enrollment scan. */
async function sweepCurriculum(now: Date) {
  const enrolls = await CurriculumEnrollment.find({ status: 'active' }).select('tenantId studentId curriculumId offeringId').lean();
  for (const en of enrolls as any[]) {
    if (!en.offeringId) continue; // no cohort calendar → no derivable deadline
    const offering = await BatchOffering.findById(en.offeringId).lean() as any;
    if (!offering) continue;
    const days = await DayPlan.find({ curriculumId: en.curriculumId, 'items.kind': { $in: ['assignment', 'quiz'] } })
      .select('dayNumber items').lean();
    for (const dp of days as any[]) {
      for (const it of (dp.items || [])) {
        if (it.kind !== 'assignment' && it.kind !== 'quiz') continue;
        if (!it.sourceId) continue;
        const { policy, dueAt } = resolveCurriculumPolicy(it, offering, dp.dayNumber);
        if (!dueAt || policy.latePolicy === 'open') { await markOrHeal(false, { studentId: en.studentId, contentType: it.kind, contentId: it.sourceId }); continue; }
        const closeAt = lateUntil(dueAt, policy);
        const submitted = await hasSubmitted(it.kind, it.sourceId, en.studentId);
        const missed = !submitted && closeAt != null && now > closeAt;
        await markOrHeal(missed, {
          tenantId: en.tenantId, studentId: en.studentId, contentType: it.kind, contentId: it.sourceId,
          contentTitle: it.contentTitle, batchId: offering.batchId, enrollmentId: en._id,
          dayNumber: dp.dayNumber, source: 'curriculum', dueAt,
        });
      }
    }
  }
}

export async function sweepMissedAssessments(): Promise<void> {
  try {
    markedTotal = 0; healedTotal = 0;
    const now = new Date();
    await sweepSchedules(now);
    await sweepCurriculum(now);
    if (markedTotal || healedTotal) console.log(`[MISSED-SWEEP] marked ${markedTotal}, healed ${healedTotal}`);
  } catch (err) {
    console.error('[MISSED-SWEEP] Error:', err);
  }
}

export function startAssessmentMissedSweep(): void {
  setTimeout(() => sweepMissedAssessments(), 60_000);
  setInterval(() => sweepMissedAssessments(), INTERVAL_MS);
  console.log(`🕒 Assessment missed-sweep scheduled every ${INTERVAL_MS / 3600000}h`);
}
