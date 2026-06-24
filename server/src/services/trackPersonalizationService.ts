import mongoose from 'mongoose';
import LearningCurriculum, { ILearningCurriculum, ICurriculumTopic } from '../models/LearningCurriculum';
import DayPlan from '../models/DayPlan';
import { IAssessmentSubmission } from '../models/AssessmentSubmission';

/**
 * Master-track hybrid — Step 3.
 *
 * Clone a mentor-approved master-track into a candidate-specific curriculum,
 * adjusting each topic's day-span by how the candidate scored on the assessment
 * dimension that topic builds:
 *   ≥ 90%  → mastered, drop the topic
 *   ≥ 75%  → strong, compress (~half the days)
 *   ≤ 40%  → weak, expand (~1.5×)
 *   else   → keep as-is
 * Topics with no dimension (e.g. interview/resume prep) are always kept.
 *
 * Produces the personalized curriculum + day-plan skeletons (titles + a
 * placeholder note). Actual lesson/quiz/lab content is generated lazily in
 * Phase 2 when the student opens each day. Idempotent per (master, student).
 */

export interface PersonalizeResult {
  curriculumId: mongoose.Types.ObjectId;
  totalDays: number;
  keptTopics: number;
  droppedTopics: string[];
}

const round = (n: number) => Math.max(1, Math.round(n));

function resizeTopics(master: ILearningCurriculum, scoreByDim: Record<string, number>) {
  const dropped: string[] = [];
  const sized: { topic: ICurriculumTopic; days: number }[] = [];

  for (const t of master.topics || []) {
    const baseDays = Math.max(1, (t.endDay || t.startDay) - (t.startDay || 1) + 1);
    const dim = t.dimension;
    let days = baseDays;
    if (dim) {
      const score = scoreByDim[dim];
      if (score != null) {
        if (score >= 90) { dropped.push(t.title); continue; }      // mastered → skip
        else if (score >= 75) days = round(baseDays * 0.5);         // strong → compress
        else if (score <= 40) days = round(baseDays * 1.5);         // weak → expand
      }
    }
    sized.push({ topic: t, days });
  }

  // Re-lay topics onto sequential day numbers and build the topic list + a
  // (dayNumber → topicTitle) map for the day-plan skeletons.
  const topics: ICurriculumTopic[] = [];
  const dayTopic: Record<number, string> = {};
  let cursor = 1;
  sized.forEach((s, i) => {
    const startDay = cursor;
    const endDay = cursor + s.days - 1;
    topics.push({
      title: s.topic.title,
      description: s.topic.description,
      order: i,
      startDay,
      endDay,
      color: s.topic.color,
      dimension: s.topic.dimension,
    });
    for (let d = startDay; d <= endDay; d++) dayTopic[d] = s.topic.title;
    cursor = endDay + 1;
  });

  return { topics, dayTopic, totalDays: cursor - 1, dropped };
}

export async function personalizeTrackForCandidate(
  submission: IAssessmentSubmission,
  masterTrack: ILearningCurriculum
): Promise<PersonalizeResult | undefined> {
  const studentId = submission.candidateUserId as mongoose.Types.ObjectId | undefined;
  if (!studentId) return undefined;
  const tenantId = submission.tenantId;

  // Idempotent: reuse an existing personalized clone of this master for this student.
  const existing = await LearningCurriculum.findOne({
    tenantId, clonedFrom: masterTrack._id, personalizedFor: studentId,
  }).lean<any>();
  if (existing) {
    return { curriculumId: existing._id, totalDays: existing.totalDays, keptTopics: (existing.topics || []).length, droppedTopics: [] };
  }

  const scoreByDim: Record<string, number> = {};
  for (const s of submission.subScores || []) scoreByDim[s.dimension] = s.percentage;

  const { topics, dayTopic, totalDays, dropped } = resizeTopics(masterTrack, scoreByDim);
  if (!topics.length) return undefined; // nothing to build (shouldn't happen — non-dimension topics survive)

  const name = (submission.candidate?.name || 'Candidate').trim();
  const created = await LearningCurriculum.create({
    tenantId,
    title: `${masterTrack.title} · ${name}`,
    description: `Personalized for ${name} from the "${masterTrack.title}" master-track, based on their skill assessment.`,
    targetCourse: masterTrack.targetCourse,
    totalDays,
    topics,
    isPublished: true,             // so getDayPlan serves it; preview gating still applies at enrolment
    isMasterTrack: false,
    role: masterTrack.role,
    audienceLevel: masterTrack.audienceLevel,
    pace: masterTrack.pace,
    clonedFrom: masterTrack._id,
    personalizedFor: studentId,
    createdBy: 'assessment-personalizer',
  });

  // Day-plan skeletons (content filled lazily in Phase 2).
  const dayDocs = [];
  for (let d = 1; d <= totalDays; d++) {
    dayDocs.push({
      tenantId,
      curriculumId: created._id,
      dayNumber: d,
      title: `${dayTopic[d] || 'Study'} — Day ${d}`,
      notes: 'Your lesson, quiz and code lab for this day are generated when you open it. (Personalized content — Phase 2.)',
      items: [],
    });
  }
  if (dayDocs.length) await DayPlan.insertMany(dayDocs, { ordered: false });

  return {
    curriculumId: created._id as mongoose.Types.ObjectId,
    totalDays,
    keptTopics: topics.length,
    droppedTopics: dropped,
  };
}

/** Find the best master-track for a candidate's profile (role + level). */
export async function findMasterTrackForCandidate(submission: IAssessmentSubmission): Promise<ILearningCurriculum | null> {
  const tenantId = submission.tenantId;
  const c = submission.candidate;
  const isProfessional = c?.segment === 'job_switcher' || (c?.yearsExperience != null && c.yearsExperience >= 2);
  const level = isProfessional ? 'professional' : 'fresher';

  const role = String(c?.targetRole || '').toLowerCase();
  const stack = (c?.currentStack || []).map((x) => String(x).toLowerCase());

  const tracks = await LearningCurriculum.find({ tenantId, isMasterTrack: true, audienceLevel: level })
    .lean<ILearningCurriculum[]>();
  if (!tracks.length) {
    // Fall back to any master-track for the tenant regardless of level.
    const any = await LearningCurriculum.find({ tenantId, isMasterTrack: true }).lean<ILearningCurriculum[]>();
    if (!any.length) return null;
    return matchByRole(any, role, stack) || any[0];
  }
  return matchByRole(tracks, role, stack) || tracks[0];
}

function matchByRole(tracks: ILearningCurriculum[], role: string, stack: string[]): ILearningCurriculum | null {
  return (
    tracks.find((t) => {
      const hay = `${t.role || ''} ${t.targetCourse || ''} ${t.title || ''}`.toLowerCase();
      return (role && hay.includes(role)) || stack.some((s) => s && hay.includes(s));
    }) || null
  );
}
