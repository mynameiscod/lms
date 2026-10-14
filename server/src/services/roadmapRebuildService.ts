import mongoose from 'mongoose';
import User from '../models/User';
import LearningCurriculum from '../models/LearningCurriculum';
import CurriculumEnrollment from '../models/CurriculumEnrollment';
import DayPlan from '../models/DayPlan';
import PassportConfig from '../models/PassportConfig';
import { resolveRoadmapV2 } from '../data/roadmapV2Policy';
import { buildFoundationProfile } from './foundationProfileService';
import { directionChoiceFor } from './foundationJourneyTriggerService';
import {
  composeFoundationJourney, persistFoundationJourney, FOUNDATION_JOURNEY_KIND,
} from './foundationJourneyService';
import { moveFutureToV2 } from './foundationRecompositionService';
import { programDaysFor } from './foundationProgramLengthService';
import { resolveCurriculumEngine } from './curriculumEngineService';
import { trackForStudent } from './careerTrackService';

/**
 * Rebuild a student's roadmap as Roadmap V2 — the admin's "Rebuild roadmap" button.
 *
 *   NOT STARTED (no completed day): the whole roadmap is built again by V2, at the admin's days
 *   for the year. The student is on day 1 of something they have not opened.
 *
 *   STARTED: the days they completed and the day they are on stay exactly as they are; every later
 *   day is rebuilt by V2 (moveFutureToV2). The length stays what it was.
 *
 * Always V2, whatever the switch says: an admin who presses Rebuild is choosing V2 for this
 * student. A preview writes nothing. If V2 cannot fill the days, the roadmap stays as it was and
 * the reason is returned. Quiz results, XP, streaks and the enrollment are never touched.
 */

export type RebuildMode = 'FULL' | 'FUTURE';

export interface RebuildDay { dayNumber: number; phase: string; titles: string[] }

export interface RebuildOutcome {
  ok: boolean;
  reason?: string;
  studentId: string;
  stageKey: string | null;
  mode?: RebuildMode;
  /** The roadmap as it is now. */
  before?: { version: 'V1' | 'V2' | 'NONE'; totalDays: number; completedDays: number; days: RebuildDay[] };
  /** The roadmap V2 builds (preview) or built (applied). */
  after?: { totalDays: number; keptDays: number[]; phaseDays: { revision: number; bridge: number; year: number }; days: RebuildDay[] };
  applied?: boolean;
}

const PREVIEW_DAYS = 14;
const phaseOf = (p?: string | null) => p || 'YEAR';
const countPhases = (days: RebuildDay[]) => ({
  revision: days.filter(d => d.phase === 'REVISION').length,
  bridge: days.filter(d => d.phase === 'BRIDGE').length,
  year: days.filter(d => d.phase === 'YEAR').length,
});

async function settingsOf(tenantId: string) {
  const cfg = await PassportConfig.findOne({ tenantId }).select('roadmapV2').lean() as any;
  const s = resolveRoadmapV2(cfg?.roadmapV2);
  return { dailyMinutes: s.dailyMinutes, revisionDays: s.revisionDays };
}

async function daysOf(curriculumId: mongoose.Types.ObjectId, limit?: number): Promise<RebuildDay[]> {
  const q = DayPlan.find({ curriculumId }).select('dayNumber phase title').sort({ dayNumber: 1 });
  if (limit) q.limit(limit);
  const days = await q.lean() as any[];
  return days.map(d => ({ dayNumber: Number(d.dayNumber), phase: phaseOf(d.phase), titles: String(d.title || '').split(' · ').filter(Boolean) }));
}

export async function rebuildRoadmap(
  tenantId: string,
  studentId: string,
  opts: { apply: boolean; by?: string | null },
): Promise<RebuildOutcome> {
  if (!mongoose.Types.ObjectId.isValid(studentId)) return { ok: false, reason: 'That is not a member id.', studentId, stageKey: null };
  const user = await User.findOne({ _id: studentId, tenantId }).select('passport').lean() as any;
  if (!user) return { ok: false, reason: 'No such member in this tenant.', studentId, stageKey: null };
  const sid = new mongoose.Types.ObjectId(studentId);

  const engine = await resolveCurriculumEngine({ tenantId, studentId }).catch(() => null) as any;
  const stageKey: string | null = engine?.stageKey || user.passport?.stage || null;
  if (!stageKey) return { ok: false, reason: 'This member has no college year, so there is no roadmap to build.', studentId, stageKey };

  const { profile, summary } = await buildFoundationProfile(tenantId, studentId, directionChoiceFor(user.passport));
  if (!summary.measured) return { ok: false, reason: 'This member has not taken a skill check yet — a roadmap is built from their Skill DNA.', studentId, stageKey };

  const settings = await settingsOf(tenantId);
  const curriculum = await LearningCurriculum.findOne({
    tenantId, personalizedFor: sid, adaptiveStage: stageKey, journeyKind: FOUNDATION_JOURNEY_KIND,
  }).select('_id totalDays roadmapVersion').lean() as any;
  const enrollment = curriculum
    ? await CurriculumEnrollment.findOne({ tenantId, curriculumId: curriculum._id, studentId: sid }).select('completedDays currentDay').lean() as any
    : null;
  const completed = ((enrollment?.completedDays || []) as number[]).map(Number).filter(n => n > 0);
  const before = curriculum
    ? {
      version: (curriculum.roadmapVersion === 'ROADMAP_V2' ? 'V2' : 'V1') as 'V1' | 'V2',
      totalDays: await DayPlan.countDocuments({ curriculumId: curriculum._id }),
      completedDays: completed.length,
      days: await daysOf(curriculum._id, PREVIEW_DAYS),
    }
    : { version: 'NONE' as const, totalDays: 0, completedDays: 0, days: [] };

  // ── NOT STARTED: the whole roadmap, at the admin's days. ──
  if (!curriculum || !completed.length) {
    const programDays = await programDaysFor(tenantId, stageKey);
    if (!opts.apply) {
      const { composition, v2 } = await composeFoundationJourney(tenantId, profile, {
        stageKey, programDays, source: 'PRODUCTION', studentId, roadmapV2: settings,
        track: await trackForStudent(tenantId, studentId, stageKey),
      });
      if (!composition.ok || !v2) return { ok: false, reason: `V2 could not fill ${programDays} days for this member from the published curriculum.`, studentId, stageKey, mode: 'FULL', before };
      const days: RebuildDay[] = v2.days.map((day, i) => ({
        dayNumber: i + 1,
        phase: day.some(d => d.phase === 'BRIDGE') ? 'BRIDGE' : day.some(d => d.phase === 'REVISION') ? 'REVISION' : 'YEAR',
        titles: day.map(d => (d.part ? `${d.unit.title} (part ${d.part.index} of ${d.part.of})` : d.unit.title)),
      }));
      return { ok: true, studentId, stageKey, mode: 'FULL', before, applied: false, after: { totalDays: days.length, keptDays: [], phaseDays: countPhases(days), days: days.slice(0, PREVIEW_DAYS) } };
    }
    const built = await persistFoundationJourney(tenantId, sid, profile, { stageKey, programDays, source: 'PRODUCTION', roadmapV2: settings });
    if (!built.ok || !built.curriculumId) return { ok: false, reason: built.reason || 'The roadmap was not written.', studentId, stageKey, mode: 'FULL', before };
    await recordRebuild(built.curriculumId, opts.by, before.version, 'FULL', []);
    const all = await daysOf(built.curriculumId);
    return { ok: true, studentId, stageKey, mode: 'FULL', before, applied: true, after: { totalDays: all.length, keptDays: [], phaseDays: countPhases(all), days: all.slice(0, PREVIEW_DAYS) } };
  }

  // ── STARTED: keep what they did, rebuild the rest. ──
  const result = await moveFutureToV2(tenantId, sid, profile, curriculum._id, stageKey, { source: 'PRODUCTION' }, !opts.apply);
  if (!result.ok) return { ok: false, reason: result.reason, studentId, stageKey, mode: 'FUTURE', before };
  if (!opts.apply) {
    const kept = await DayPlan.find({ curriculumId: curriculum._id, dayNumber: { $in: result.frozenDays } }).select('dayNumber phase title').sort({ dayNumber: 1 }).lean() as any[];
    const days: RebuildDay[] = [
      ...kept.map(d => ({ dayNumber: Number(d.dayNumber), phase: phaseOf(d.phase), titles: String(d.title || '').split(' · ').filter(Boolean) })),
      ...(result.preview || []),
    ].sort((a, b) => a.dayNumber - b.dayNumber);
    return { ok: true, studentId, stageKey, mode: 'FUTURE', before, applied: false, after: { totalDays: result.totalDays, keptDays: result.frozenDays, phaseDays: countPhases(days), days: days.slice(0, PREVIEW_DAYS) } };
  }
  await recordRebuild(curriculum._id, opts.by, before.version, 'FUTURE', result.frozenDays);
  const all = await daysOf(curriculum._id);
  return { ok: true, studentId, stageKey, mode: 'FUTURE', before, applied: true, after: { totalDays: all.length, keptDays: result.frozenDays, phaseDays: countPhases(all), days: all.slice(0, PREVIEW_DAYS) } };
}

/** Who rebuilt it, when, from what — shown on the student's journey page. */
async function recordRebuild(curriculumId: mongoose.Types.ObjectId, by: string | null | undefined, from: string, mode: RebuildMode, keptDays: number[]) {
  await LearningCurriculum.updateOne({ _id: curriculumId }, {
    $push: { rebuilds: { $each: [{ at: new Date(), by: by || null, from, mode, keptDays: keptDays.length }], $slice: -20 } },
  });
}

/* ------------------------------------------------------------------ *
 * Bulk: every V1 roadmap of the tenant, moved to V2
 * ------------------------------------------------------------------ */

export interface BulkCounts { stageKey: string; v1: number; notStarted: number; started: number; v2: number }

export interface BulkJob {
  running: boolean;
  stageKey: string | null;
  total: number;
  done: number;
  rebuilt: number;
  failed: { studentId: string; reason: string }[];
  startedAt: Date | null;
  finishedAt: Date | null;
  by: string | null;
}

/** One job per tenant, held in this process. A restart forgets it; running again picks up what is still V1. */
const jobs = new Map<string, BulkJob>();

async function v1Journeys(tenantId: string, stageKey?: string | null) {
  return LearningCurriculum.find({
    tenantId, journeyKind: FOUNDATION_JOURNEY_KIND, personalizedFor: { $ne: null },
    roadmapVersion: { $ne: 'ROADMAP_V2' }, ...(stageKey ? { adaptiveStage: stageKey } : {}),
  }).select('_id personalizedFor adaptiveStage').lean() as Promise<any[]>;
}

export async function bulkCounts(tenantId: string): Promise<BulkCounts[]> {
  const all = await LearningCurriculum.find({ tenantId, journeyKind: FOUNDATION_JOURNEY_KIND, personalizedFor: { $ne: null } })
    .select('_id personalizedFor adaptiveStage roadmapVersion').lean() as any[];
  const started = new Set((await CurriculumEnrollment.find({
    tenantId, curriculumId: { $in: all.map(c => c._id) }, 'completedDays.0': { $exists: true },
  }).select('curriculumId').lean() as any[]).map(e => String(e.curriculumId)));
  const out = new Map<string, BulkCounts>();
  for (const c of all) {
    const k = String(c.adaptiveStage || 'foundation');
    const row = out.get(k) || { stageKey: k, v1: 0, notStarted: 0, started: 0, v2: 0 };
    if (c.roadmapVersion === 'ROADMAP_V2') row.v2++;
    else { row.v1++; if (started.has(String(c._id))) row.started++; else row.notStarted++; }
    out.set(k, row);
  }
  const order = ['foundation', 'build', 'specialize', 'placement'];
  return [...out.values()].sort((a, b) => order.indexOf(a.stageKey) - order.indexOf(b.stageKey));
}

export const bulkJobOf = (tenantId: string): BulkJob | null => jobs.get(tenantId) || null;

/** Start moving every V1 roadmap (of one year, or all) to V2, in the background. */
export async function startBulkRebuild(tenantId: string, opts: { stageKey?: string | null; by?: string | null }): Promise<BulkJob> {
  const current = jobs.get(tenantId);
  if (current?.running) return current;
  const list = await v1Journeys(tenantId, opts.stageKey);
  const job: BulkJob = {
    running: true, stageKey: opts.stageKey || null, total: list.length, done: 0, rebuilt: 0, failed: [],
    startedAt: new Date(), finishedAt: null, by: opts.by || null,
  };
  jobs.set(tenantId, job);
  void (async () => {
    for (const c of list) {
      const studentId = String(c.personalizedFor);
      try {
        const r = await rebuildRoadmap(tenantId, studentId, { apply: true, by: opts.by });
        if (r.ok) job.rebuilt++;
        else job.failed.push({ studentId, reason: r.reason || 'Not rebuilt.' });
      } catch (e: any) {
        job.failed.push({ studentId, reason: String(e?.message || e) });
      }
      job.done++;
    }
    job.running = false;
    job.finishedAt = new Date();
    console.log(`[roadmap-rebuild] ${tenantId}: ${job.rebuilt} of ${job.total} moved to V2, ${job.failed.length} not`);
  })();
  return job;
}
