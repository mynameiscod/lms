import mongoose from 'mongoose';
import LearningCurriculum from '../models/LearningCurriculum';
import CurriculumEnrollment from '../models/CurriculumEnrollment';
import CurriculumLearningUnit from '../models/CurriculumLearningUnit';
import LearningContentLibrary from '../models/LearningContentLibrary';
import DayPlan from '../models/DayPlan';
import { dayItems, loadAssets, FOUNDATION_JOURNEY_KIND } from './foundationJourneyService';

/**
 * Lessons added after a roadmap was built — a video uploaded today — reach that roadmap.
 *
 * A day's activities are written when the roadmap is built and served from there, so a video
 * attached to a unit later never appeared on the days already planned, and recomposition does not
 * help: it rewrites only days whose units change. This rewrites the activities of every day the
 * student has NOT completed from the unit's content as it is now — same units, same order — so a
 * new video, notes or checkpoint appears and an unpublished one goes. Completed days are never
 * touched; a day whose units now have no published content at all is left as it was.
 */

const STAGES = ['foundation', 'build', 'specialize', 'placement'];

export interface StageCoverage {
  stageKey: string;
  units: number;
  conceptUnits: number;
  /** Units with a published video. */
  withVideo: number;
  /** Of those, videos whose title marks them as a placeholder (a stand-in, not the real lesson). */
  placeholderVideos: number;
}

export interface LessonRefreshResult {
  journeys: number;
  daysChecked: number;
  daysChanged: number;
  videosAdded: number;
  itemsAdded: number;
  itemsRemoved: number;
  applied: boolean;
}

/** How much of each year has a video lesson. Read-only. */
export async function videoCoverage(tenantId: string): Promise<StageCoverage[]> {
  const out: StageCoverage[] = [];
  for (const stageKey of STAGES) {
    const units = await CurriculumLearningUnit.find({ tenantId, stageKey, status: 'PUBLISHED' }).select('unitCode unitType').lean() as any[];
    const codes = units.map(u => String(u.unitCode));
    const videos = await LearningContentLibrary.find({ tenantId, isPublished: true, type: 'video', unitCode: { $in: codes } })
      .select('unitCode title').lean() as any[];
    out.push({
      stageKey,
      units: units.length,
      conceptUnits: units.filter(u => u.unitType === 'CONCEPT').length,
      withVideo: new Set(videos.map(v => String(v.unitCode).toUpperCase())).size,
      placeholderVideos: videos.filter(v => /placeholder/i.test(String(v.title || ''))).length,
    });
  }
  return out;
}

const keyOf = (it: any) => `${it.kind}:${String(it.contentId || it.sourceId || '')}`;

/**
 * Rewrite the activities of every day not yet completed from the units' content as it is now.
 * `unitCodes` narrows it to the days that hold one of those units — what an admin save calls.
 */
export async function refreshRoadmapLessons(
  tenantId: string,
  opts: { apply: boolean; stageKey?: string | null; studentId?: string | null; unitCodes?: string[] | null },
): Promise<LessonRefreshResult> {
  const result: LessonRefreshResult = { journeys: 0, daysChecked: 0, daysChanged: 0, videosAdded: 0, itemsAdded: 0, itemsRemoved: 0, applied: opts.apply };
  const only = opts.unitCodes?.length ? [...new Set(opts.unitCodes.map(c => String(c).toUpperCase()))] : null;
  const holdsUnit = only ? { $or: [{ unitCodes: { $in: only } }, { primaryUnitCode: { $in: only } }] } : null;
  const onlyJourneys = holdsUnit ? await DayPlan.distinct('curriculumId', { tenantId, ...holdsUnit }) : null;
  if (onlyJourneys && !onlyJourneys.length) return result;
  const journeys = await LearningCurriculum.find({
    tenantId, journeyKind: FOUNDATION_JOURNEY_KIND, personalizedFor: opts.studentId
      ? new mongoose.Types.ObjectId(opts.studentId) : { $ne: null },
    ...(opts.stageKey ? { adaptiveStage: opts.stageKey } : {}),
    ...(onlyJourneys ? { _id: { $in: onlyJourneys } } : {}),
  }).select('_id personalizedFor').lean() as any[];

  for (const j of journeys) {
    result.journeys++;
    const enrollment = await CurriculumEnrollment.findOne({ curriculumId: j._id, studentId: j.personalizedFor })
      .select('completedDays').lean() as any;
    const completed = new Set(((enrollment?.completedDays || []) as number[]).map(Number));
    const days = (await DayPlan.find({ curriculumId: j._id, ...(holdsUnit || {}) }).select('dayNumber unitCodes primaryUnitCode items').lean() as any[])
      .filter(d => !completed.has(Number(d.dayNumber)));
    if (!days.length) continue;

    const codesOf = (d: any): string[] => {
      const c = ((d.unitCodes || []) as any[]).map(String).filter(Boolean);
      return c.length ? c : (d.primaryUnitCode ? [String(d.primaryUnitCode)] : []);
    };
    const allCodes = [...new Set(days.flatMap(codesOf))];
    const [units, assets] = await Promise.all([
      CurriculumLearningUnit.find({ tenantId, unitCode: { $in: allCodes } }).select('unitCode title').lean() as Promise<any[]>,
      loadAssets(tenantId, allCodes),
    ]);
    const titleOf = new Map(units.map(u => [String(u.unitCode).toUpperCase(), String(u.title || u.unitCode)]));

    const ops: any[] = [];
    for (const d of days) {
      result.daysChecked++;
      const dayUnits = codesOf(d).map(c => ({ unitCode: c, title: titleOf.get(c.toUpperCase()) || c })) as any[];
      const fresh = dayItems(dayUnits, assets);
      if (!fresh.length) continue; // nothing published for these units now: keep what the day has
      const before = new Set(((d.items || []) as any[]).map(keyOf));
      const after = new Set(fresh.map(keyOf));
      const added = fresh.filter(it => !before.has(keyOf(it)));
      const removed = [...before].filter(k => !after.has(k)).length;
      const sameOrder = JSON.stringify(((d.items || []) as any[]).map(keyOf)) === JSON.stringify(fresh.map(keyOf));
      if (!added.length && !removed && sameOrder) continue;
      result.daysChanged++;
      result.itemsAdded += added.length;
      result.itemsRemoved += removed;
      result.videosAdded += added.filter(it => it.contentType === 'video').length;
      ops.push({ updateOne: { filter: { _id: d._id }, update: { $set: { items: fresh } } } });
    }
    if (opts.apply && ops.length) await DayPlan.bulkWrite(ops, { ordered: false });
  }
  return result;
}

/**
 * After an admin saves, publishes, unpublishes or deletes a lesson attached to a unit: the days
 * already planned with that unit get it now, with nobody running a script. Runs after the response
 * so the save is not slowed, and never fails the save — the next save, or rv2Lessons, catches up.
 */
export function refreshLessonsInBackground(tenantId: string, unitCodes: (string | null | undefined)[]): void {
  const codes = unitCodes.filter((c): c is string => !!c && !!String(c).trim());
  if (!tenantId || !codes.length) return;
  setImmediate(() => {
    refreshRoadmapLessons(String(tenantId), { apply: true, unitCodes: codes })
      .then(r => { if (r.daysChanged) console.log(`[lesson-refresh] ${codes.join(',')}: ${r.daysChanged} open day(s) updated in ${r.journeys} roadmap(s), ${r.videosAdded} video(s) added`); })
      .catch(err => console.error(`[lesson-refresh] ${codes.join(',')} failed:`, err?.message || err));
  });
}
