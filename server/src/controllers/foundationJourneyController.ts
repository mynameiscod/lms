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
import { FOUNDATION_JOURNEY_KIND } from '../services/foundationJourneyService';
import { resolveCurriculumEngine } from '../services/curriculumEngineService';
import { foundationReadiness, FOUNDATION_NOT_CONFIGURED_FOR_STUDENT } from '../services/foundationReadinessService';

/**
 * Which engine plans this student, for the screens that must show exactly one plan.
 *
 * My Roadmap and My 90 Days render this journey instead of the topic planners when the answer is
 * UNIT. Resolved by the single production resolver, so a screen can never disagree with the
 * planner about which plan is the student's. An unreadable config answers TOPIC — the screens
 * then show what they always showed.
 */
const engineOf = (tenantId: string, studentId: string) =>
  resolveCurriculumEngine({ tenantId, studentId }).then(r => r.engine).catch(() => 'TOPIC' as const);

const tenantOf = (req: Request): string =>
  String((req as any).user?.tenantId || (req as any).tenantId || '');
const userIdOf = (req: Request): string =>
  String((req as any).user?.id || (req as any).user?._id || '');

/** The student's journey curriculum, or null. Never any other personalised clone. */
async function journeyOf(tenantId: string, studentId: string) {
  if (!mongoose.Types.ObjectId.isValid(studentId)) return null;
  return LearningCurriculum.findOne({
    tenantId,
    personalizedFor: new mongoose.Types.ObjectId(studentId),
    adaptiveStage: 'foundation',
    journeyKind: FOUNDATION_JOURNEY_KIND,
  }).select('_id title').lean() as any;
}

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

    const [curriculum, engine] = await Promise.all([journeyOf(tenantId, studentId), engineOf(tenantId, studentId)]);
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
      const readiness = engine === 'UNIT' ? await foundationReadiness(tenantId) : null;
      if (readiness && !readiness.configured) {
        return res.json({
          available: false,
          reason: 'NOT_CONFIGURED',
          message: FOUNDATION_NOT_CONFIGURED_FOR_STUDENT,
          totalDays: FOUNDATION_PROGRAM_DAYS,
          engine,
          enrollmentId: null,
        });
      }
      return res.json({
        available: false,
        reason: 'NO_JOURNEY',
        message: 'Your Foundation journey has not been created yet.',
        totalDays: FOUNDATION_PROGRAM_DAYS,
        engine,
        enrollmentId: null,
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

    const completed = new Set<number>(((enrollment?.completedDays || []) as number[]).map(Number));
    const currentDay = Math.min(
      Math.max(Number(enrollment?.currentDay || 1), 1), FOUNDATION_PROGRAM_DAYS,
    );

    /**
     * A short summary per day rather than the full activity list.
     *
     * Ninety days of complete bundles is a large response for a screen that renders a strip of
     * numbers. The day the student opens is fetched on its own.
     */
    const strip = (days as any[]).map(d => ({
      day: d.dayNumber,
      title: d.title,
      activities: (d.items || []).length,
      minutes: (d.items || []).reduce((n: number, i: any) => n + (Number(i.estimatedDuration) || 0), 0),
      status: completed.has(d.dayNumber) ? 'COMPLETED'
        : d.dayNumber === currentDay ? 'CURRENT'
          : d.dayNumber < currentDay ? 'SKIPPED' : 'UPCOMING',
    }));

    res.json({
      available: true,
      title: 'CareerPilot Foundation Journey',
      /** Always ninety. The promise, restated on every response. */
      totalDays: FOUNDATION_PROGRAM_DAYS,
      currentDay,
      completedCount: completed.size,
      /** Whole-percent, so the bar and the number never disagree by a rounding step. */
      percentComplete: Math.round((completed.size / FOUNDATION_PROGRAM_DAYS) * 100),
      startedAt: enrollment?.startDate || null,
      engine,
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
    if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > FOUNDATION_PROGRAM_DAYS) {
      return res.status(400).json({ message: `A journey day is between 1 and ${FOUNDATION_PROGRAM_DAYS}.` });
    }

    const curriculum = await journeyOf(tenantId, studentId);
    if (!curriculum) return res.status(404).json({ message: 'You do not have a Foundation journey yet.' });

    const [day, enrollment] = await Promise.all([
      DayPlan.find({ curriculumId: curriculum._id, dayNumber })
        .select('dayNumber title primaryUnitCode items').lean() as any,
      CurriculumEnrollment.findOne({
        tenantId, curriculumId: curriculum._id,
        studentId: new mongoose.Types.ObjectId(studentId),
      }).select('completedDays currentDay').lean() as any,
    ]);

    const plan = (day as any[])[0];
    if (!plan) return res.status(404).json({ message: 'That day is not part of your journey.' });

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

    res.json({
      day: plan.dayNumber,
      totalDays: FOUNDATION_PROGRAM_DAYS,
      title: plan.title || unit?.title || `Day ${plan.dayNumber}`,
      objective: unit?.description || null,
      outcomes: unit?.learningOutcomes || [],
      status: completed.has(plan.dayNumber) ? 'COMPLETED'
        : plan.dayNumber === Number(enrollment?.currentDay || 1) ? 'CURRENT' : 'UPCOMING',
      minutes: (plan.items || []).reduce((n: number, i: any) => n + (Number(i.estimatedDuration) || 0), 0),
      activities: (plan.items || [])
        .slice()
        .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
        .map(activityFor),
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

    const [curriculum, engine] = await Promise.all([journeyOf(tenantId, studentId), engineOf(tenantId, studentId)]);
    const student = {
      name: [member.firstName, member.lastName].filter(Boolean).join(' ') || member.email || 'Member',
      email: member.email || null,
      stage: member.passport?.stage || null,
    };

    if (!curriculum) {
      const readiness = engine === 'UNIT' ? await foundationReadiness(tenantId) : null;
      return res.json({
        available: false,
        reason: readiness && !readiness.configured ? 'NOT_CONFIGURED' : 'NO_JOURNEY',
        readiness,
        engine,
        student,
        totalDays: FOUNDATION_PROGRAM_DAYS,
        message: readiness && !readiness.configured
          ? `Foundation is not configured for this tenant: ${readiness.message}`
          : engine === 'UNIT'
            ? 'No journey yet. It is created when this member completes a skill check — or by the backfill, for members assessed before this tenant was provisioned.'
            : 'This member is planned by the topic engine, so they have no Foundation journey.',
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
    const currentDay = Math.min(Math.max(Number(enrollment?.currentDay || 1), 1), FOUNDATION_PROGRAM_DAYS);

    res.json({
      available: true,
      engine,
      student,
      curriculumId: String(curriculum._id),
      enrollmentId: enrollment?._id ? String(enrollment._id) : null,
      totalDays: FOUNDATION_PROGRAM_DAYS,
      currentDay,
      completedCount: completed.size,
      percentComplete: Math.round((completed.size / FOUNDATION_PROGRAM_DAYS) * 100),
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
