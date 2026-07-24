import AssessmentSchedule from '../models/AssessmentSchedule';
import MissedAssessment from '../models/MissedAssessment';
import Submission, { SubmissionStatus } from '../models/Submission';
import QuizAttempt from '../models/QuizAttempt';
import User from '../models/User';
import { policyFromRow } from '../services/assessmentDeliveryService';
import { lateUntil } from '../services/deadlinePolicyService';

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

/**
 * Persist "missed" for scheduled assessments whose deadline (incl. grace) has
 * passed and the student never submitted. Self-heals: rows are removed when the
 * deadline is later extended (still within window) or a submission appears.
 */
export async function sweepMissedAssessments(): Promise<void> {
  try {
    const now = new Date();
    // Only schedules that actually close (grace/hard_lock) and have a due date.
    const schedules = await AssessmentSchedule.find({
      status: 'active', dueAt: { $exists: true, $ne: null }, latePolicy: { $in: ['grace', 'hard_lock'] },
    }).lean();

    let marked = 0, healed = 0;
    for (const s of schedules as any[]) {
      const closeAt = lateUntil(new Date(s.dueAt), policyFromRow(s));
      const students = await User.find({ batchId: s.batchId, role: 'STUDENT' }).select('_id').lean();

      for (const u of students as any[]) {
        const submitted = await hasSubmitted(s.contentType, s.contentId, u._id);
        const isMissed = !submitted && closeAt != null && now > closeAt;
        if (isMissed) {
          const r = await MissedAssessment.updateOne(
            { scheduleId: s._id, studentId: u._id },
            { $setOnInsert: { markedAt: now }, $set: {
              tenantId: s.tenantId, contentType: s.contentType, contentId: s.contentId,
              contentTitle: s.contentTitle, batchId: s.batchId, dueAt: s.dueAt,
            } },
            { upsert: true }
          );
          if ((r as any).upsertedCount) marked++;
        } else {
          // Reopened (deadline moved) or submitted after the fact → clear any stale miss.
          const del = await MissedAssessment.deleteOne({ scheduleId: s._id, studentId: u._id });
          if (del.deletedCount) healed++;
        }
      }
    }
    if (marked || healed) console.log(`[MISSED-SWEEP] marked ${marked}, healed ${healed}`);
  } catch (err) {
    console.error('[MISSED-SWEEP] Error:', err);
  }
}

export function startAssessmentMissedSweep(): void {
  setTimeout(() => sweepMissedAssessments(), 60_000);
  setInterval(() => sweepMissedAssessments(), INTERVAL_MS);
  console.log(`🕒 Assessment missed-sweep scheduled every ${INTERVAL_MS / 3600000}h`);
}
