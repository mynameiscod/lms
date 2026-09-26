/**
 * The student's view of their ninety days.
 *
 * ── WHAT A STUDENT IS SHOWN, AND WHAT THEY ARE NOT ────────────────────────────────────────
 *
 * Shown: the day they are on, what it teaches, the activities that teach it, what they have
 * finished, and how far they have to go.
 *
 * NOT shown, deliberately: the 337-unit master curriculum, composer scores, role allocations,
 * reallocation reports, readiness rungs, publication status, or the reason codes the composer
 * attached to each selection. Those are authoring and engineering instruments. A student
 * looking at "ADVANCED_UNIVERSAL, reason STANDARD_FOUNDATION, rank 41" learns nothing about
 * what to do today and quite a lot about how little of this was written for them.
 *
 * The one piece of composer reasoning that IS surfaced is the day's objective, in the unit's
 * own words, because "why am I doing this" is a question a student is entitled to an answer to.
 *
 * ── THE SHAPE IS THE PROMISE ──────────────────────────────────────────────────────────────
 *
 * Every response says ninety. A strong student must not be able to tell from this screen that
 * they were given harder material by seeing a shorter course, and a struggling one must not
 * see a longer one. What differs between them is the content of the days, which is exactly
 * what the screen shows.
 */

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import LearningCurriculum from '../models/LearningCurriculum';
import DayPlan from '../models/DayPlan';
import CurriculumEnrollment from '../models/CurriculumEnrollment';
import CurriculumLearningUnit from '../models/CurriculumLearningUnit';
import User from '../models/User';
import { FOUNDATION_PROGRAM_DAYS } from '../data/ninetyDayPolicy';
import { foundationProgramDaysFor, programDaysFor, journeyDaysOf } from '../services/foundationProgramLengthService';
import { isJourneyDayOpen, membershipRefusesDay, calendarAllowsDay } from '../data/journeyDayLadder';
import { opensAt, programmeDayOfLearning } from '../data/dailyPacingPolicy';
import { FOUNDATION_JOURNEY_KIND } from '../services/foundationJourneyService';
import { CAREER_STAGES } from '../services/careerStageService';
import { resolveCurriculumEngine } from '../services/curriculumEngineService';
import { foundationReadiness, notConfiguredForStudent } from '../services/foundationReadinessService';
import { foundationAccess, FoundationAccess } from '../services/foundationAccessService';
import { buildFoundationProfile } from '../services/foundationProfileService';
import { composeFoundationJourney, loadAssets, activitiesFor, packComposedDays, dayTitle } from '../services/foundationJourneyService';
import { applyFoundationTrigger, directionChoiceFor } from '../services/foundationJourneyTriggerService';
import { resolveModuleStatuses, itemDone } from './enrollmentPlanController';
import { reconcileJourneyDayXp, xpForJourneyItem, journeyItemFinished, FOUNDATION_DAY_BONUS_XP } from '../services/foundationJourneyXpService';
import { orientationBlocksLearning, orientationRoadmap, pacingClockFor } from '../services/orientationService';

/**
 * Which engine plans this student, for the screens that must show exactly one plan.
 *
 * My Roadmap and My 90 Days render this journey instead of the topic planners when the answer is
 * UNIT. Resolved by the single production resolver, so a screen can never disagree with the
 * planner about which plan is the student's. An unreadable config answers TOPIC — the screens
 * then show what they always showed.
 */
/**
 * The engine this student is on, AND the stage it is planning them in.
 *
 * The stage used to be discarded here and 'foundation' written in at every place that needed
 * one. That was correct while Foundation was the only stage the unit engine served; it stopped
 * being correct the moment `build` joined it, and it fails in the worst way — the writer stores
 * a journey under `adaptiveStage: 'build'` and the reader looks for 'foundation', so the journey
 * exists, is never found, and the read path composes another one on every request.
 *
 * `stageKey` is nullable: a student whose stage cannot be derived has none, and resolves to
 * TOPIC. Callers that must name a stage fall back to STAGE_FALLBACK below.
 */
const engineOf = (tenantId: string, studentId: string) =>
  resolveCurriculumEngine({ tenantId, studentId })
    .then(r => ({ engine: r.engine as string, stageKey: r.stageKey || null }))
    .catch(() => ({ engine: 'TOPIC' as string, stageKey: null as string | null }));

/**
 * What a stage is called when the student is told about it.
 *
 * "Your 90-day Foundation journey" was hardcoded in seven strings. A second-year reading that
 * about their Year-2 roadmap would reasonably conclude the system had given them the wrong one.
 */
const STAGE_FALLBACK = 'foundation';
const stageLabel = (stageKey?: string | null): string =>
  CAREER_STAGES.find(s => s.key === String(stageKey || STAGE_FALLBACK))?.label || 'Foundation';

const tenantOf = (req: Request): string =>
  String((req as any).user?.tenantId || (req as any).tenantId || '');
const userIdOf = (req: Request): string =>
  String((req as any).user?.id || (req as any).user?._id || '');

/**
 * The student's journey curriculum for one stage, or null. Never any other personalised clone.
 *
 * The stage is part of the identity, not a detail: the unique index is
 * (tenantId, personalizedFor, adaptiveStage, journeyKind), so one student may hold a Foundation
 * journey and a Build journey at once and the two must never be confused for each other.
 */
async function journeyOf(tenantId: string, studentId: string, stageKey?: string | null) {
  if (!mongoose.Types.ObjectId.isValid(studentId)) return null;
  return LearningCurriculum.findOne({
    tenantId,
    personalizedFor: new mongoose.Types.ObjectId(studentId),
    adaptiveStage: String(stageKey || STAGE_FALLBACK),
    journeyKind: FOUNDATION_JOURNEY_KIND,
  }).select('_id title createdAt totalDays').lean() as any;
}

/**
 * How long a journey that is not yet whole is reported as being prepared.
 *
 * Creation writes the journey, then its ninety days, then the enrollment — well under a second. A
 * journey still missing days or its enrollment after this long did not finish, and is reported as
 * such instead of asking the student to wait for something that is not coming.
 */
const JOURNEY_PREPARATION_WINDOW_MS = 2 * 60_000;

/**
 * An activity, stripped to what a student needs to act on it.
 *
 * Internal ids are kept because the player needs them to open the thing; ordering, gating and
 * duration are kept because they tell a student what to do and roughly how long it takes.
 * Nothing else survives.
 */
const activityFor = (item: any) => ({
  id: String(item._id || ''),
  kind: item.kind,
  title: item.contentTitle,
  type: item.contentType,
  /** What the student must finish before the day counts as done. */
  required: item.required !== false,
  gating: !!item.isGating,
  minutes: Number(item.estimatedDuration) || 0,
  order: Number(item.order) || 0,
  contentId: item.contentId ? String(item.contentId) : null,
  sourceId: item.sourceId ? String(item.sourceId) : null,
});

const EMPTY_ASSETS: any = { content: [], quizzes: [], assignments: [] };

/**
 * THE LADDER lives in data/journeyDayLadder. The day endpoint refuses by it and the overview reports it, so the
 * roadmap can never call a day open that the server would then refuse, or the reverse — and an assignment on a
 * journey day is opened by the same rule.
 */
export { isJourneyDayOpen };

/**
 * What kind of day it is, in a student's words — a summary of the unit's type, never the type itself.
 *
 * Enough for a roadmap to show "practice" or "project" beside a title. Nothing that describes how the
 * plan was composed.
 */
const DAY_KIND: Record<string, 'LESSON' | 'PRACTICE' | 'DEBUGGING' | 'PROJECT' | 'CHECKPOINT'> = {
  CONCEPT: 'LESSON',
  WORKED_EXAMPLE: 'LESSON',
  PRACTICE: 'PRACTICE',
  DEBUG: 'DEBUGGING',
  PROJECT: 'PROJECT',
  CHECKPOINT: 'CHECKPOINT',
  REVIEW: 'CHECKPOINT',
};

/**
 * Overview metadata for each day of a persisted journey: the topic and module it belongs to, what kind of
 * day it is, and its objective in the unit's own words.
 *
 * Read from the curriculum as it is authored — the unit for its topic, type and description, and the
 * tenant's Foundation master curriculum for the topic and module NAMES — so a renamed topic reaches every
 * roadmap without touching a plan. Titles only: no codes, no activities, no content. A day whose unit or
 * topic cannot be found simply has no topic, and the roadmap shows it on its own rather than guessing.
 */
async function overviewOf(tenantId: string, days: any[], stageKey?: string | null) {
  const codes = [...new Set(days.map(d => d.primaryUnitCode).filter(Boolean).map(String))];
  const [units, master] = await Promise.all([
    codes.length
      ? CurriculumLearningUnit.find({ tenantId, unitCode: { $in: codes } })
        .select('unitCode topicCode moduleCode unitType description').lean() as Promise<any[]>
      : Promise.resolve([] as any[]),
    // The master curriculum, never a personalised journey: those share the stage and carry no topics.
    LearningCurriculum.findOne({ tenantId, adaptiveStage: stageKey || STAGE_FALLBACK, personalizedFor: null, journeyKind: null })
      .select('topics modules').lean() as any,
  ]);
  const unitByCode = new Map((units || []).map((u: any) => [String(u.unitCode), u]));
  const topicTitle = new Map<string, string>(((master?.topics || []) as any[])
    .filter(t => t.topicCode).map(t => [String(t.topicCode), String(t.title || '')]));
  const moduleName = new Map<string, string>(((master?.modules || []) as any[])
    .map(m => [String(m.moduleCode), String(m.moduleName || '')]));

  return (dayNumber: number, unitCode: string | null) => {
    const unit = unitCode ? unitByCode.get(String(unitCode)) : null;
    return {
      topic: unit ? (topicTitle.get(String(unit.topicCode)) || null) : null,
      module: unit ? (moduleName.get(String(unit.moduleCode)) || null) : null,
      kind: unit ? (DAY_KIND[String(unit.unitType)] || 'LESSON') : null,
      objective: unit?.description || null,
    };
  };
}

/**
 * The first days of a learner's own plan, as someone who has not taken membership may see them.
 *
 * Topics, objectives and what each day contains — enough to see the plan is theirs — and nothing to
 * open: no enrollment and no activity ids. The rest of the ninety is counted, not shown.
 */
async function previewOf(
  tenantId: string,
  engine: string,
  access: FoundationAccess,
  days: { day: number; unitCode: string | null; title: string; items: any[] }[],
  programDays: number,
  stageKey?: string | null,
  orientation?: Awaited<ReturnType<typeof orientationRoadmap>>,
  /**
   * EVERY day of the programme, in order — not only the ones open to preview.
   *
   * My Roadmap answers "what will I be taught", and answering it with seven days made it the
   * same page as My 90 Days for anybody who had not paid. The whole shape travels: each day's
   * title, topic and module, which is exactly what a member's roadmap already sends for days
   * they cannot open yet. Titles and topics are not content — no activities, no ids, nothing
   * to open — and the day endpoint still refuses every day past the preview.
   */
  allDays?: { day: number; unitCode: string | null; title: string }[],
) {
  const codes = [...new Set(days.map(d => d.unitCode).filter(Boolean))] as string[];
  const units = codes.length
    ? await CurriculumLearningUnit.find({ tenantId, unitCode: { $in: codes } })
      .select('unitCode title description learningOutcomes').lean() as any[]
    : [];
  const byCode = new Map(units.map(u => [String(u.unitCode), u]));
  const minutesOf = (items: any[]) => items.reduce((n: number, i: any) => n + (Number(i.estimatedDuration) || 0), 0);

  /**
   * ONLY THE DAYS THEY MAY READ.
   *
   * This briefly sent the whole programme's titles and topics so My Roadmap could show the shape
   * of the road before paying. That was my call and it was the wrong one: the roadmap IS the
   * thing being sold, and giving away ninety titles and topics is giving away the plan. A
   * non-member sees the seven days they may read, and what membership opens is a number.
   *
   * `allDays` is kept because the count of what lies beyond is honest and useful — it is what
   * `lockedDays` is built from — but its titles do not travel.
   */
  const whole = days.map(d => ({ day: d.day, unitCode: d.unitCode, title: d.title }));
  const overview = await overviewOf(
    tenantId,
    whole.map(d => ({ dayNumber: d.day, primaryUnitCode: d.unitCode })),
    stageKey,
  );
  const openTo = access.previewDays;

  return {
    available: true,
    access: 'PREVIEW',
    engine,
    /**
     * THE SCREEN NAMES THE JOURNEY FROM THIS, NOT FROM A CONSTANT.
     *
     * The title was the literal "CareerPilot Foundation Journey", so a second-year previewing
     * their Build roadmap was shown a page headed with the wrong year — the same fault as the
     * ninety-day copy, in the one line they read first. The key travels beside the label so the
     * client can branch on the stage without parsing the name a tenant may have renamed.
     */
    stage: String(stageKey || STAGE_FALLBACK),
    stageLabel: stageLabel(stageKey),
    title: `CareerPilot ${stageLabel(stageKey)} Journey`,
    totalDays: programDays,
    /**
     * ALWAYS NULL HERE, AND THE PARAMETER IS KEPT TO SAY SO.
     *
     * The welcome days are five days of video, notes and checklists — content, and part of what
     * a membership buys. Sending them to somebody who has not paid put them in the roadmap AND
     * let them be worked through, which is the whole product's front door left open.
     *
     * A member gets them from the branch below. See the orientation controller, which refuses
     * the same people at the endpoints, so this is not the only thing holding the line.
     */
    orientation: orientation || null,
    previewDays: access.previewDays,
    lockedDays: programDays - days.length,
    currentDay: 1,
    completedCount: 0,
    percentComplete: 0,
    startedAt: null,
    enrollmentId: null,
    message: `These are the first ${days.length} days of your personalised ${programDays}-day roadmap. `
      + `Take membership to unlock all ${programDays} days.`,
    /*
     * The whole road, by topic, with everything past the preview locked. A non-member's roadmap
     * now answers the question it is for; the seven readable days are in `preview` below.
     */
    days: whole.map(d => ({
      day: d.day,
      title: d.title,
      ...overview(d.day, d.unitCode || null),
      activities: days.find(x => x.day === d.day)?.items.length ?? 0,
      minutes: minutesOf(days.find(x => x.day === d.day)?.items || []),
      status: d.day === 1 ? 'CURRENT' : 'UPCOMING',
      locked: d.day > openTo,
    })),
    preview: days.map(d => {
      const unit = d.unitCode ? byCode.get(String(d.unitCode)) : null;
      return {
        day: d.day,
        title: d.title || unit?.title || `Day ${d.day}`,
        objective: unit?.description || null,
        outcomes: unit?.learningOutcomes || [],
        minutes: minutesOf(d.items),
        activities: d.items.slice().sort((a: any, b: any) => (a.order || 0) - (b.order || 0)).map((i: any) => ({
          title: i.contentTitle, type: i.contentType, minutes: Number(i.estimatedDuration) || 0, gating: !!i.isGating,
        })),
      };
    }),
  };
}

/**
 * GET /passport/me/foundation-journey
 *
 * The whole journey at a glance: where the student is, what they have done, what is next.
 */
export const getMyJourney = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);
    if (!tenantId || !studentId) return res.status(401).json({ message: 'Not authenticated' });

    /**
     * The engine is resolved BEFORE the journey, not alongside it, because the journey is looked
     * up by stage and the stage comes from the engine. Running the two in parallel is what would
     * read a Foundation journey for a second-year.
     */
    const resolved = await engineOf(tenantId, studentId);
    const engine = resolved.engine;
    const stageKey = resolved.stageKey;
    const stage = stageLabel(stageKey);
    let curriculum: any = await journeyOf(tenantId, studentId, stageKey);

    /**
     * How much of the ninety this learner may see — membership decides: the whole journey, a preview
     * of its first days (the admin sets how many), or nothing until they take membership.
     */
    const access: FoundationAccess = engine === 'UNIT'
      ? await foundationAccess(tenantId, studentId)
      : { level: 'FULL', previewDays: 0 };
    /**
     * Two numbers, and they are not interchangeable. `tenantDays` is how long the next journey
     * composed here will be; `programDays` is how long THIS student's journey is, once they have
     * one. A learner part-way through must be read as the programme they were given.
     */
    const tenantDays = await programDaysFor(tenantId, stageKey);
    let programDays = tenantDays;
    /*
     * EVERY ANSWER CARRIES THE STAGE, INCLUDING THE UNHAPPY ONES.
     *
     * Only the success paths sent `stageLabel`, so the client fell back to its default on every
     * refusal — and a second-year whose roadmap failed to compose was shown "Foundation Journey"
     * above "110 learning days". The stage is not a decoration on a good answer; it is part of
     * telling somebody whose plan this is.
     */
    const membershipRequired = () => res.json({
      available: false,
      reason: 'MEMBERSHIP_REQUIRED',
      access: 'LOCKED',
      message: `Take membership to see your ${programDays}-day ${stage} roadmap.`,
      totalDays: programDays,
      stageLabel: stage,
      title: `CareerPilot ${stage} Journey`,
      engine,
      enrollmentId: null,
    });
    const notCreated = (why: string) => {
      console.error(`[foundation-journey] ${why}`);
      return res.json({
        available: false,
        reason: 'JOURNEY_NOT_CREATED',
        message: `Your ${programDays}-day roadmap could not be prepared just now. Please try again in a little while.`,
        totalDays: programDays,
        stageLabel: stage,
        title: `CareerPilot ${stage} Journey`,
        engine,
        enrollmentId: null,
      });
    };

    if (!curriculum) {
      /**
       * Not an error. A student who has not been given a journey yet is an ordinary state —
       * before the assessment, or before an admin enrols them — and the screen says so rather
       * than showing a failure.
       */
      /**
       * A Foundation learner whose tenant cannot serve the journey is told so. Never a fallback:
       * the topic roadmap is not a smaller version of this, it is a different plan.
       */
      const readiness = engine === 'UNIT' ? await foundationReadiness(tenantId, stageKey) : null;
      if (readiness && !readiness.configured) {
        return res.json({
          available: false,
          reason: 'NOT_CONFIGURED',
          message: notConfiguredForStudent(stageKey),
          totalDays: programDays,
          stageLabel: stage,
          title: `CareerPilot ${stage} Journey`,
          engine,
          enrollmentId: null,
        });
      }
      if (engine === 'UNIT' && access.level === 'LOCKED') return membershipRequired();

      if (engine === 'UNIT') {
        const member = await User.findOne({ _id: studentId, tenantId }).select('passport').lean() as any;
        const { profile, summary } = await buildFoundationProfile(tenantId, studentId, directionChoiceFor(member?.passport));

        if (summary.measured && access.level === 'PREVIEW') {
          /**
           * THE PREVIEW IS THEIR OWN PLAN. Composed on read from their Skill DNA — exactly what
           * membership will generate — and nothing is stored, so there is nothing to keep in step.
           */
          const { composition } = await composeFoundationJourney(tenantId, profile, { source: 'PRODUCTION', stageKey: stageKey || STAGE_FALLBACK, programDays });

          /**
           * A DAY IS NOT A UNIT, AND HAS NOT BEEN SINCE DENSITY LANDED.
           *
           * This asked for exactly `programDays` UNITS and numbered them `day: i + 1`. Both were
           * right only while the composer produced one unit per day. It now produces the
           * learner's own density times the length, so a student above seventy composed 220
           * units for 110 days, failed the equality check, and was told their roadmap "could not
           * be prepared just now" — the stronger the student, the more certain the failure.
           *
           * Too FEW units to fill the days is still a refusal, because a short plan is a broken
           * promise. More than days is the normal, healthy case.
           */
          if (!composition.ok || composition.units.length < programDays) {
            return notCreated(`preview for ${studentId}: ${composition.units.length} units for ${programDays} days`);
          }
          const packed = packComposedDays(composition, profile, programDays);
          if (!packed.ok) {
            return notCreated(`preview for ${studentId}: could not arrange ${programDays} days (${packed.reason})`);
          }

          /* The same packer the real journey uses, so the preview IS what membership generates. */
          const byCode = new Map(composition.units.map(u => [u.unitCode, u]));
          const allDays = packed.days.map((day, i) => {
            const units = day.map(p => byCode.get(p.unitCode)!).filter(Boolean);
            return { day: i + 1, units };
          });
          const firstDays = allDays.slice(0, access.previewDays);
          const assets = await loadAssets(tenantId, firstDays.flatMap(d => d.units.map(u => u.unitCode)));
          return res.json(await previewOf(tenantId, engine, access, firstDays.map(d => ({
            day: d.day,
            unitCode: d.units[0]?.unitCode,
            title: dayTitle(d.units),
            /* Every unit of the day, in order — a dense day shows all its work, not its first piece. */
            items: d.units.flatMap(u => activitiesFor(u, assets.get(u.unitCode.toUpperCase()) || EMPTY_ASSETS)),
          })), programDays, stageKey, null,
          allDays.map(d => ({ day: d.day, unitCode: d.units[0]?.unitCode, title: dayTitle(d.units) }))));
        }

        if (summary.measured && access.level === 'FULL') {
          /**
           * A MEMBER WITH SKILL DNA AND NO JOURNEY GETS ONE NOW.
           *
           * Membership normally generates it. This covers every member it could not reach — assessed
           * before this existed, a tenant that made the roadmap free, a generation that failed — through
           * the same production trigger, so the result is the journey membership would have made.
           */
          const built = await applyFoundationTrigger({ tenantId, studentId, trigger: 'SIGNIFICANT_MASTERY_CHANGE', stageKey: stageKey || STAGE_FALLBACK });
          curriculum = await journeyOf(tenantId, studentId, stageKey);
          if (!curriculum) return notCreated(`generation on read for ${studentId}: ${built.action} ${built.reason || ''}`);
        }
      }

      if (!curriculum) {
        return res.json({
          available: false,
          reason: 'NO_JOURNEY',
          message: `Your ${stage} journey has not been created yet.`,
          totalDays: programDays,
          engine,
          access: access.level,
          enrollmentId: null,
        });
      }
    }

    const [days, enrollment] = await Promise.all([
      DayPlan.find({ curriculumId: curriculum._id })
        .select('dayNumber title primaryUnitCode items').sort({ dayNumber: 1 }).lean() as any,
      CurriculumEnrollment.findOne({
        tenantId, curriculumId: curriculum._id,
        studentId: new mongoose.Types.ObjectId(studentId),
      }).select('completedDays currentDay startDate').lean() as any,
    ]);

    /**
     * A JOURNEY IS SHOWN ONLY ONCE IT IS WHOLE.
     *
     * The journey record is written first, then its ninety days, then the enrollment. A read that
     * lands in between — which is exactly when a student arrives, straight from submitting the skill
     * check — used to be answered `available` with a partial strip ("Day 1 of 90" over fifty-one
     * days) and no enrollment, so the Start button had nothing to open. Ninety days and an
     * enrollment, or it is not ready yet.
     */
    programDays = journeyDaysOf(curriculum, tenantDays);
    const whole = new Set((days as any[]).map(d => Number(d.dayNumber))).size === programDays && !!enrollment;
    if (!whole) {
      const ageMs = curriculum.createdAt ? Date.now() - new Date(curriculum.createdAt).getTime() : Number.POSITIVE_INFINITY;
      const preparing = ageMs < JOURNEY_PREPARATION_WINDOW_MS;
      return res.json({
        available: false,
        reason: preparing ? 'BEING_PREPARED' : 'JOURNEY_INCOMPLETE',
        message: preparing
          ? `Your ${programDays}-day ${stage} journey is being prepared. This takes a few seconds.`
          : `Your ${programDays}-day ${stage} journey could not be finished. Please contact your CareerPilot admin.`,
        totalDays: programDays,
        engine,
        enrollmentId: null,
      });
    }

    // A stored journey whose learner is not (or no longer) a member shows only its preview.
    if (engine === 'UNIT' && access.level === 'LOCKED') return membershipRequired();
    if (engine === 'UNIT' && access.level === 'PREVIEW') {
      return res.json(await previewOf(tenantId, engine, access, (days as any[]).slice(0, access.previewDays).map(d => ({
        day: d.dayNumber, unitCode: d.primaryUnitCode || null, title: d.title, items: d.items || [],
      })), programDays, stageKey, null,
      /* The stored journey holds every day; only the first few are readable. */
      (days as any[]).map(d => ({ day: d.dayNumber, unitCode: d.primaryUnitCode || null, title: d.title }))));
    }

    const completed = new Set<number>(((enrollment?.completedDays || []) as number[]).map(Number));
    const currentDay = Math.min(
      Math.max(Number(enrollment?.currentDay || 1), 1), programDays,
    );
    const overview = await overviewOf(tenantId, days as any[], stageKey);
    /* Read once for the whole strip: ninety lookups for one answer would be absurd. */
    const stripPacedFrom = await pacingClockFor(tenantId, studentId);

    /**
     * A short summary per day rather than the full activity list.
     *
     * Ninety days of complete bundles is a large response for a screen that renders a strip of
     * numbers. The day the student opens is fetched on its own.
     *
     * ROADMAP VISIBILITY IS NOT CONTENT ACCESS. Each day carries what a roadmap needs — its title, topic,
     * module, kind, objective, status, and whether it is open — and nothing a day holds: no activity
     * titles, ids, questions or assignment detail. Those come only from the day endpoint, which refuses a
     * locked day on the server.
     */
    const strip = (days as any[]).map(d => ({
      day: d.dayNumber,
      title: d.title,
      ...overview(d.dayNumber, d.primaryUnitCode || null),
      activities: (d.items || []).length,
      minutes: (d.items || []).reduce((n: number, i: any) => n + (Number(i.estimatedDuration) || 0), 0),
      status: completed.has(d.dayNumber) ? 'COMPLETED'
        : d.dayNumber === currentDay ? 'CURRENT'
          : d.dayNumber < currentDay ? 'SKIPPED' : 'UPCOMING',
      locked: !isJourneyDayOpen(d.dayNumber, completed, stripPacedFrom),
      /* Which gate is shut, so the strip can say "tomorrow" rather than only "locked". */
      lockedReason: isJourneyDayOpen(d.dayNumber, completed, stripPacedFrom) ? undefined
        : !calendarAllowsDay(d.dayNumber, stripPacedFrom) ? 'NOT_TODAY_YET' : 'DAY_LOCKED',
    }));

    res.json({
      available: true,
      /** See previewOf: the screen names the journey from the stage, never from a constant. */
      stage: String(stageKey || STAGE_FALLBACK),
      stageLabel: stage,
      title: `CareerPilot ${stage} Journey`,
      /** The length of THIS journey, restated on every response — not the tenant's current setting. */
      totalDays: programDays,
      /** Days 0.1–0.5, before Day 1 and outside the count above. See orientationRoadmap. */
      orientation: await orientationRoadmap(tenantId, studentId),
      currentDay,
      completedCount: completed.size,
      /** Whole-percent, so the bar and the number never disagree by a rounding step. */
      percentComplete: Math.round((completed.size / programDays) * 100),
      startedAt: enrollment?.startDate || null,
      engine,
      access: 'FULL',
      /** Where a day is actually worked through: the learning-plan day player. */
      enrollmentId: enrollment?._id ? String(enrollment._id) : null,
      days: strip,
    });
  } catch (e: any) {
    console.error('[foundation-journey] me:', e?.message || e);
    res.status(500).json({ message: 'Could not load your journey.' });
  }
};

/**
 * GET /passport/me/foundation-journey/day/:dayNumber
 *
 * One day, in full: its objective and the activities that serve it, in order.
 */
export const getMyJourneyDay = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);
    if (!tenantId || !studentId) return res.status(401).json({ message: 'Not authenticated' });

    const dayNumber = Number(req.params.dayNumber);
    const { stageKey } = await engineOf(tenantId, studentId);
    /* The upper bound is this student's own journey; a tenant on a longer programme has more days. */
    const journeyForBounds = await journeyOf(tenantId, studentId, stageKey);
    const programDays = journeyDaysOf(journeyForBounds, await programDaysFor(tenantId, stageKey));
    if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > programDays) {
      return res.status(400).json({ message: `A journey day is between 1 and ${programDays}.` });
    }

    // Beyond the preview, a day is refused on the server — not merely hidden on the screen.
    const access = await foundationAccess(tenantId, studentId);
    if (membershipRefusesDay(dayNumber, access)) {
      return res.status(403).json({ reason: 'MEMBERSHIP_REQUIRED', message: `Take membership to open day ${dayNumber} of your roadmap.` });
    }

    const curriculum = await journeyOf(tenantId, studentId, stageKey);
    if (!curriculum) return res.status(404).json({ message: `You do not have a ${stageLabel(stageKey)} journey yet.` });

    const [day, enrollment] = await Promise.all([
      DayPlan.find({ curriculumId: curriculum._id, dayNumber })
        .select('dayNumber title primaryUnitCode items').lean() as any,
      CurriculumEnrollment.findOne({
        tenantId, curriculumId: curriculum._id,
        studentId: new mongoose.Types.ObjectId(studentId),
      }).select('completedDays currentDay completedItems enrolledBy').lean() as any,
    ]);

    const plan = (day as any[])[0];
    if (!plan) return res.status(404).json({ message: 'That day is not part of your journey.' });

    /**
     * The ninety days are a ladder, and this endpoint has to say so too.
     *
     * The enrollment day endpoint refuses a day whose predecessor is unfinished; if this one
     * answered in full, the same day would be closed in the player and open on Home. Day one is
     * always available, and a day already completed stays available — what is locked is ahead,
     * not behind.
     */
    /**
     * Orientation comes first, for a member who has not started learning yet.
     *
     * Checked here rather than only on the screen, because a day is opened by its URL as often as
     * by a click. A member already past Day 1 when orientation arrived is never held by it — see
     * orientationService.
     */
    if (await orientationBlocksLearning(tenantId, String(studentId))) {
      return res.status(403).json({
        reason: 'ORIENTATION_REQUIRED',
        day: plan.dayNumber,
        title: plan.title || `Day ${plan.dayNumber}`,
        message: 'Finish your orientation days first — they take about twenty minutes each.',
      });
    }

    const doneDays = new Set<number>(((enrollment?.completedDays || []) as number[]).map(Number));
    const pacedFrom = await pacingClockFor(tenantId, String(studentId));
    if (!isJourneyDayOpen(plan.dayNumber, doneDays, pacedFrom)) {
      /**
       * TWO REASONS, TWO MESSAGES.
       *
       * "Finish day 11" is useless to somebody who HAS finished day 11 and is simply early. The
       * refusal names which of the two gates is shut, and when the calendar one opens, so the
       * screen can say "tomorrow" instead of sending them hunting for work that is already done.
       */
      const early = !calendarAllowsDay(plan.dayNumber, pacedFrom);
      return res.status(403).json({
        reason: early ? 'NOT_TODAY_YET' : 'DAY_LOCKED',
        day: plan.dayNumber,
        title: plan.title || `Day ${plan.dayNumber}`,
        opensAt: early ? opensAt(programmeDayOfLearning(plan.dayNumber), pacedFrom)?.toISOString() ?? null : null,
        message: early
          ? `Day ${plan.dayNumber} opens tomorrow. One learning day at a time.`
          : `Finish day ${plan.dayNumber - 1} before starting day ${plan.dayNumber}.`,
      });
    }

    /**
     * The objective, in the UNIT's own words.
     *
     * Read from the curriculum unit rather than restated on the day, so a corrected description
     * reaches every student's plan without a migration. This is the one piece of planning
     * information a student sees, because "why am I doing this" deserves an answer.
     */
    const unit = plan.primaryUnitCode
      ? await CurriculumLearningUnit.findOne({ tenantId, unitCode: plan.primaryUnitCode })
        .select('title description learningOutcomes estimatedMinutes').lean() as any
      : null;

    const completed = new Set<number>(((enrollment?.completedDays || []) as number[]).map(Number));

    /**
     * Each task's state and worth, so Home can show today's journey as today's missions.
     *
     * The same completion rule the day player uses (a lesson marked done; a checkpoint, project or
     * code task submitted), and the same once-only XP it pays — reading the day here also settles
     * anything the student earned in another module since the last read.
     */
    const items: any[] = plan.items || [];
    const completedItems = (enrollment?.completedItems || []) as Array<{ contentId: string; dayNumber: number }>;
    // Decoration on the day, never a reason to refuse it: if the status lookup fails the day is still served,
    // its tasks simply show as not yet done, and the next read settles the XP.
    let moduleStatus: Record<string, { attempted: boolean; status: string; score: number | null }> = {};
    let xpJustPaid = 0;
    try {
      moduleStatus = enrollment ? await resolveModuleStatuses(studentId, items) : {};
      const dayComplete = items.length > 0 && items.every((it: any) => itemDone(it, plan.dayNumber, completedItems, moduleStatus));
      if (enrollment && enrollment.enrolledBy === 'foundation-journey') {
        xpJustPaid = await reconcileJourneyDayXp({
          tenantId, studentId, enrollmentId: String(enrollment._id), dayNumber: plan.dayNumber,
          items, completedItems, moduleStatus, dayComplete,
        });
      }
    } catch (e: any) {
      console.error('[foundation-journey] day status:', e?.message || e);
    }

    res.json({
      day: plan.dayNumber,
      totalDays: programDays,
      title: plan.title || unit?.title || `Day ${plan.dayNumber}`,
      objective: unit?.description || null,
      outcomes: unit?.learningOutcomes || [],
      status: completed.has(plan.dayNumber) ? 'COMPLETED'
        : plan.dayNumber === Number(enrollment?.currentDay || 1) ? 'CURRENT' : 'UPCOMING',
      minutes: (plan.items || []).reduce((n: number, i: any) => n + (Number(i.estimatedDuration) || 0), 0),
      activities: items
        .slice()
        .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
        .map((it: any) => ({
          ...activityFor(it),
          done: journeyItemFinished(it, plan.dayNumber, completedItems, moduleStatus),
          xp: xpForJourneyItem(it),
        })),
      dayBonusXp: FOUNDATION_DAY_BONUS_XP,
      /** XP this read settled (work finished elsewhere since the last read) — the page refreshes XP and goal on it. */
      xpJustPaid,
    });
  } catch (e: any) {
    console.error('[foundation-journey] day:', e?.message || e);
    res.status(500).json({ message: 'Could not load this day.' });
  }
};

/**
 * GET /passport/students/:studentId/foundation-journey — ADMIN
 *
 * One member's ninety days as the planner wrote them. Unlike the member's own view, this names the
 * unit behind each day, its type and whether it is still published: an admin asking "why is this on
 * day 34" needs the unit, and one about to unpublish a unit needs to see it on somebody's plan.
 *
 * READ-ONLY on purpose. A hand-edited day would be overwritten by the next recomposition, so the
 * place to change a plan is the curriculum it is composed from.
 */
export const getStudentJourney = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = String(req.params.studentId || '');
    if (!tenantId) return res.status(401).json({ message: 'Not authenticated' });
    if (!mongoose.Types.ObjectId.isValid(studentId)) return res.status(400).json({ message: 'That is not a member id.' });

    // The tenant comes from the admin's verified identity, so another tenant's member is simply not found.
    const member = await User.findOne({ _id: studentId, tenantId })
      .select('firstName lastName email passport.stage').lean() as any;
    if (!member) return res.status(404).json({ message: 'No such member in this tenant.' });

    const { engine, stageKey } = await engineOf(tenantId, studentId);
    const curriculum = await journeyOf(tenantId, studentId, stageKey);
    const stage = stageLabel(stageKey);
    /* The tenant's setting is only a fallback here: a member's journey is read at its own length. */
    const tenantDays = await programDaysFor(tenantId, stageKey);
    // Whether this member sees the whole journey or only the preview — what the admin is asked about.
    const access = engine === 'UNIT' ? await foundationAccess(tenantId, studentId) : null;
    const student = {
      name: [member.firstName, member.lastName].filter(Boolean).join(' ') || member.email || 'Member',
      email: member.email || null,
      stage: member.passport?.stage || null,
    };

    if (!curriculum) {
      const readiness = engine === 'UNIT' ? await foundationReadiness(tenantId, stageKey) : null;
      return res.json({
        available: false,
        reason: readiness && !readiness.configured ? 'NOT_CONFIGURED' : 'NO_JOURNEY',
        readiness,
        access,
        engine,
        student,
        totalDays: tenantDays,
        message: readiness && !readiness.configured
          ? `${stage} is not configured for this tenant: ${readiness.message}`
          : engine === 'UNIT'
            ? 'No journey yet. It is created when this member completes a skill check — or by the backfill, for members assessed before this tenant was provisioned.'
            : `This member is planned by the topic engine, so they have no ${stage} journey.`,
      });
    }

    const [days, enrollment] = await Promise.all([
      DayPlan.find({ curriculumId: curriculum._id })
        .select('dayNumber title primaryUnitCode items').sort({ dayNumber: 1 }).lean() as any,
      CurriculumEnrollment.findOne({
        tenantId, curriculumId: curriculum._id,
        studentId: new mongoose.Types.ObjectId(studentId),
      }).select('completedDays currentDay startDate').lean() as any,
    ]);

    const codes = [...new Set((days as any[]).map(d => d.primaryUnitCode).filter(Boolean))];
    const units = codes.length
      ? await CurriculumLearningUnit.find({ tenantId, unitCode: { $in: codes } })
        .select('unitCode title unitType status').lean() as any[]
      : [];
    const byCode = new Map(units.map(u => [String(u.unitCode), u]));

    const completed = new Set<number>(((enrollment?.completedDays || []) as number[]).map(Number));
    const programDays = journeyDaysOf(curriculum, tenantDays);
    const currentDay = Math.min(Math.max(Number(enrollment?.currentDay || 1), 1), programDays);

    res.json({
      available: true,
      engine,
      student,
      access,
      curriculumId: String(curriculum._id),
      enrollmentId: enrollment?._id ? String(enrollment._id) : null,
      totalDays: programDays,
      currentDay,
      completedCount: completed.size,
      percentComplete: Math.round((completed.size / programDays) * 100),
      startedAt: enrollment?.startDate || null,
      days: (days as any[]).map(d => {
        const unit = d.primaryUnitCode ? byCode.get(String(d.primaryUnitCode)) : null;
        const items = (d.items || []) as any[];
        return {
          day: d.dayNumber,
          title: d.title || unit?.title || `Day ${d.dayNumber}`,
          unitCode: d.primaryUnitCode || null,
          unitType: unit?.unitType || null,
          /** MISSING when the unit has since been deleted — a day naming nothing an admin can open. */
          unitStatus: unit ? unit.status : 'MISSING',
          activities: items.length,
          checkpoint: items.some(i => i.kind === 'quiz'),
          project: items.some(i => i.kind === 'assignment'),
          minutes: items.reduce((n, i) => n + (Number(i.estimatedDuration) || 0), 0),
          status: completed.has(d.dayNumber) ? 'COMPLETED'
            : d.dayNumber === currentDay ? 'CURRENT'
              : d.dayNumber < currentDay ? 'SKIPPED' : 'UPCOMING',
        };
      }),
    });
  } catch (e: any) {
    console.error('[foundation-journey] admin student:', e?.message || e);
    res.status(500).json({ message: 'Could not load this member’s journey.' });
  }
};
