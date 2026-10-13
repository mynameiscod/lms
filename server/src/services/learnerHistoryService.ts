import mongoose from 'mongoose';
import LearningCurriculum from '../models/LearningCurriculum';
import CurriculumEnrollment from '../models/CurriculumEnrollment';
import DayPlan from '../models/DayPlan';
import CurriculumLearningUnit from '../models/CurriculumLearningUnit';

/**
 * What a learner has already studied with CareerPilot, in the years before this one.
 *
 * Roadmap V2 uses it to tell an EXISTING member moving up a year from a fresh joiner: a topic they
 * completed in an earlier CareerPilot year is not taught again in a bridge — they get revision on
 * it instead. A topic they never reached (a year they left part-way) is still bridged.
 *
 * Read from what they actually COMPLETED — the completed days of their earlier journeys — not from
 * what those journeys contained: a day they were given but never did is not learning.
 */
export interface PriorStudy {
  /** Topics with at least one completed day in an earlier year's journey. */
  studiedTopics: Set<string>;
  /** Units on those completed days. */
  completedUnits: Set<string>;
  /** Earlier stages the learner had a CareerPilot journey in. */
  stages: string[];
}

const EMPTY: PriorStudy = { studiedTopics: new Set(), completedUnits: new Set(), stages: [] };

export async function priorStudyOf(
  tenantId: string,
  studentId: string | null | undefined,
  earlierStages: string[],
): Promise<PriorStudy> {
  if (!studentId || !earlierStages.length || !mongoose.Types.ObjectId.isValid(studentId)) return EMPTY;
  const sid = new mongoose.Types.ObjectId(studentId);
  const journeys = await LearningCurriculum.find({
    tenantId, personalizedFor: sid, adaptiveStage: { $in: earlierStages },
  }).select('_id adaptiveStage').lean() as any[];
  if (!journeys.length) return EMPTY;

  const enrollments = await CurriculumEnrollment.find({
    tenantId, studentId: sid, curriculumId: { $in: journeys.map(j => j._id) },
  }).select('curriculumId completedDays').lean() as any[];

  const completedUnits = new Set<string>();
  for (const e of enrollments) {
    const days = ((e.completedDays || []) as number[]).map(Number).filter(n => n > 0);
    if (!days.length) continue;
    const plans = await DayPlan.find({ curriculumId: e.curriculumId, dayNumber: { $in: days } })
      .select('unitCodes primaryUnitCode').lean() as any[];
    for (const p of plans) {
      for (const c of (p.unitCodes || [])) completedUnits.add(String(c));
      if (p.primaryUnitCode) completedUnits.add(String(p.primaryUnitCode));
    }
  }
  if (!completedUnits.size) return { ...EMPTY, stages: [...new Set(journeys.map(j => String(j.adaptiveStage)))] };

  const units = await CurriculumLearningUnit.find({ tenantId, unitCode: { $in: [...completedUnits] } })
    .select('topicCode').lean() as any[];
  return {
    studiedTopics: new Set(units.map(u => String(u.topicCode || '')).filter(Boolean)),
    completedUnits,
    stages: [...new Set(journeys.map(j => String(j.adaptiveStage)))],
  };
}
