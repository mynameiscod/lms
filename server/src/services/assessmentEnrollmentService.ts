import mongoose from 'mongoose';
import CurriculumEnrollment from '../models/CurriculumEnrollment';
import LearningCurriculum from '../models/LearningCurriculum';
import User from '../models/User';
import { IAssessmentSubmission } from '../models/AssessmentSubmission';

/**
 * Connects a finished assessment to the candidate's account: enrolls them in the
 * AI-recommended Learning Plan as a PREVIEW (free taste of the first days; the
 * rest locked until a mentor/payment unlocks). Idempotent.
 */
export async function enrollCandidateInRoadmapPlan(submission: IAssessmentSubmission): Promise<mongoose.Types.ObjectId | undefined> {
  const studentId = submission.candidateUserId as mongoose.Types.ObjectId | undefined;
  const planId = submission.roadmap?.planId as mongoose.Types.ObjectId | undefined;
  if (!studentId || !planId) return undefined;
  const tenantId = submission.tenantId;

  const existing = await CurriculumEnrollment.findOne({ curriculumId: planId, studentId });
  if (existing) return existing._id as mongoose.Types.ObjectId;

  const curriculum = await LearningCurriculum.findOne({ _id: planId, tenantId }).lean();
  if (!curriculum) return undefined;
  const user = await User.findById(studentId).select('firstName lastName email').lean<any>();
  if (!user) return undefined;

  try {
    const enrollment = await CurriculumEnrollment.create({
      tenantId,
      curriculumId: planId,
      curriculumTitle: curriculum.title,
      studentId,
      studentName: `${user.firstName} ${user.lastName}`.trim(),
      studentEmail: user.email,
      startDate: new Date(),
      settings: {},
      enrolledBy: 'assessment',
      assessmentOriginated: true,
      previewOnly: true,
      previewDays: 2,
    });
    await LearningCurriculum.updateOne({ _id: planId }, { $inc: { enrollmentCount: 1 } });
    return enrollment._id as mongoose.Types.ObjectId;
  } catch (e: any) {
    if (e?.code === 11000) {
      const ex = await CurriculumEnrollment.findOne({ curriculumId: planId, studentId });
      return ex?._id as mongoose.Types.ObjectId | undefined;
    }
    return undefined;
  }
}

/** Unlock full content for a candidate's assessment-originated plans (after a sale). */
export async function unlockCandidatePlans(tenantId: string, studentId: string): Promise<number> {
  const r = await CurriculumEnrollment.updateMany(
    { tenantId, studentId: new mongoose.Types.ObjectId(studentId), previewOnly: true },
    { $set: { previewOnly: false } }
  );
  return (r as any).modifiedCount || 0;
}
