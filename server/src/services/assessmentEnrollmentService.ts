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
  if (!studentId) return undefined;
  const tenantId = submission.tenantId;

  // Resolve the plan to enrol into. The roadmap's chosen plan is preferred, but it
  // may have been deleted/unpublished since the roadmap was generated (a dangling
  // planId) — in that case fall back to a published curriculum so the candidate is
  // never silently left un-enrolled (which breaks the whole assessment → LMS funnel).
  const roadmapPlanId = submission.roadmap?.planId as mongoose.Types.ObjectId | undefined;
  let curriculum: any = roadmapPlanId
    ? await LearningCurriculum.findOne({ _id: roadmapPlanId, tenantId }).lean()
    : null;

  if (!curriculum) {
    if (roadmapPlanId) {
      console.warn(`[assessmentEnroll] roadmap planId ${roadmapPlanId} not found for tenant ${tenantId} — falling back to a published curriculum.`);
    }
    const published = await LearningCurriculum.find({ tenantId, isPublished: true, isMasterTrack: { $ne: true }, personalizedFor: null })
      .select('title targetCourse enrollmentCount pace')
      .sort({ enrollmentCount: -1 })
      .lean<any[]>();
    if (!published.length) {
      console.error(`[assessmentEnroll] NO published curriculum for tenant ${tenantId} — candidate ${studentId} left un-enrolled. Publish a Learning Curriculum to complete the funnel.`);
      return undefined;
    }
    // Best-fit by stack / target role, else the most-enrolled published plan.
    const stack = (submission.candidate?.currentStack || []).map((x: string) => String(x).toLowerCase());
    const role = String(submission.candidate?.targetRole || '').toLowerCase();
    curriculum =
      published.find((c) => {
        const hay = `${c.targetCourse || ''} ${c.title || ''}`.toLowerCase();
        return stack.some((s) => s && hay.includes(s)) || (role && hay.includes(role));
      }) || published[0];
  }

  const planId = curriculum._id as mongoose.Types.ObjectId;
  const existing = await CurriculumEnrollment.findOne({ curriculumId: planId, studentId });
  if (existing) return existing._id as mongoose.Types.ObjectId;

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
      settings: { weekendsActive: !!(curriculum.pace && curriculum.pace.weekends) },
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
