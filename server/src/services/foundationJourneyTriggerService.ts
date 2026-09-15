/**
 * What the UNIT engine does when something about a student changes.
 *
 * ── THE JOIN THAT WAS MISSING ─────────────────────────────────────────────────────────────
 *
 * Every piece existed: foundationProfileService builds the composer's view of a student from
 * Skill DNA, foundationJourneyService composes ninety days from PRODUCTION inventory and writes
 * them, and foundationRecompositionService rewrites only the future. Nothing called them from
 * the product. This is that call, made at the same events the TOPIC engine already answers.
 *
 * ── CREATE ONCE, THEN ONLY RECOMPOSE ──────────────────────────────────────────────────────
 *
 * With no journey, a trigger CREATES one — but only once there is real evidence to plan from.
 * A student document is not a reason to commit somebody to ninety days: until Skill DNA holds a
 * measured skill, the composer would be planning a stranger, and the plan would be replaced the
 * moment they sat anything. With a journey, a trigger RECOMPOSES the days the student has not
 * reached; it never re-creates, so a repeated event cannot produce a second journey or a second
 * set of days, and completed or current days are never touched.
 *
 * ── REFUSAL IS AN OUTCOME, NOT AN ERROR ───────────────────────────────────────────────────
 *
 * Both writers already refuse before their first write when ninety cannot be reached, and leave
 * the existing plan standing. That refusal is reported here as it came; nothing is patched
 * around it. The function never throws — it runs at the end of a submission the student has
 * already finished, and a plan that could not be rebuilt must not become their error.
 */

import mongoose from 'mongoose';
import User from '../models/User';
import LearningCurriculum from '../models/LearningCurriculum';
import CurriculumEnrollment from '../models/CurriculumEnrollment';
import { ReplanTrigger } from '../data/adaptiveCurriculumPolicy';
import { resolveDirection } from './careerDirectionService';
import { buildFoundationProfile, DirectionChoice } from './foundationProfileService';
import {
  persistFoundationJourney, checkJourneyIntegrity, FOUNDATION_JOURNEY_KIND,
} from './foundationJourneyService';
import { recomposeFutureDays } from './foundationRecompositionService';

export type FoundationTriggerAction =
  | 'CREATED'      // a ninety-day journey was written
  | 'RECOMPOSED'   // future days of an existing journey were rewritten
  | 'UNCHANGED'    // recomposition ran and the plan already agreed with the evidence
  | 'NOT_READY'    // no journey yet, and nothing measured to plan one from
  | 'REFUSED'      // a writer declined; nothing was written and any existing plan stands
  | 'IGNORED'      // a trigger that does not change what a Foundation journey teaches
  | 'FAILED';      // an unexpected error; nothing is assumed to have been written

export interface FoundationTriggerOutcome {
  action: FoundationTriggerAction;
  reason: string | null;
  curriculumId?: string;
  rewrittenDays?: number[];
  frozenDays?: number[];
  measuredSkills?: number;
}

/**
 * Triggers that change what a Foundation journey should teach.
 *
 * Evidence (a diagnostic, a checkpoint, a project, a significant mastery move) changes the
 * profile; a direction change changes the stance. AVAILABILITY_CHANGED is absent on purpose: the
 * journey is ninety days whatever the student's hours, so there is nothing for it to move, and
 * MENTOR_OVERRIDE is a TOPIC plan action with no unit-engine counterpart.
 */
export const UNIT_JOURNEY_TRIGGERS: readonly ReplanTrigger[] = [
  'DIAGNOSTIC_COMPLETED',
  'MODULE_ASSESSMENT_COMPLETED',
  'PROJECT_EVALUATED',
  'SIGNIFICANT_MASTERY_CHANGE',
  'DIRECTION_CHANGED',
];

/**
 * The student's own direction stance, from their passport — never from their scores.
 *
 * resolveDirection is the same resolver the TOPIC engine uses, so both engines agree on what a
 * student has chosen: an explicit direction or a role is SELECTED, interests only narrow
 * exploration, and NOT_SURE or no answer is UNDECIDED with breadth.
 */
export function directionChoiceFor(passport: any = {}): DirectionChoice {
  const resolved = resolveDirection({
    selectedDirection: passport?.selectedDirection,
    primaryRole: passport?.primaryRole,
    preferredTechnologies: passport?.preferredTechnologies,
  });
  return {
    primaryDirection: resolved.direction?.key || null,
    status: resolved.status,
    exploring: resolved.explorationDirections,
  };
}

/**
 * The enrollment that carries the student's progress through their journey.
 *
 * Completed and current days live here, and recomposition reads them to know what it may not
 * touch — so a journey without one would have nothing frozen. Created with the journey, and
 * repaired on the next trigger if a crash left a journey without it. The unique index on
 * (curriculumId, studentId) makes a race converge rather than duplicate.
 */
async function ensureJourneyEnrollment(
  tenantId: string,
  user: any,
  curriculumId: string,
  stageKey: string,
): Promise<boolean> {
  const cid = new mongoose.Types.ObjectId(curriculumId);
  const existing = await CurriculumEnrollment.findOne({ curriculumId: cid, studentId: user._id }).select('_id').lean();
  if (existing) return false;
  try {
    await CurriculumEnrollment.create({
      tenantId,
      curriculumId: cid,
      curriculumTitle: 'CareerPilot Foundation Journey',
      studentId: user._id,
      studentName: [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Student',
      studentEmail: user.email || 'not-provided',
      startDate: new Date(),
      status: 'active',
      enrolledBy: 'foundation-journey',
      assessmentOriginated: true,
      stage: stageKey,
    });
    return true;
  } catch (e: any) {
    if (e?.code !== 11000) throw e;
    return false;
  }
}

/** Handle one trigger for one UNIT-engine student. Never throws. */
export async function applyFoundationTrigger(input: {
  tenantId: string;
  studentId: string;
  trigger: ReplanTrigger;
  stageKey: string;
}): Promise<FoundationTriggerOutcome> {
  const { tenantId, studentId, trigger, stageKey } = input;
  try {
    if (!UNIT_JOURNEY_TRIGGERS.includes(trigger)) {
      return { action: 'IGNORED', reason: `${trigger} does not change what a Foundation journey teaches` };
    }
    if (!mongoose.Types.ObjectId.isValid(studentId)) return { action: 'REFUSED', reason: 'INVALID_STUDENT_ID' };

    const user = await User.findOne({ _id: studentId, tenantId })
      .select('firstName lastName email passport').lean() as any;
    if (!user) return { action: 'REFUSED', reason: 'NO_SUCH_STUDENT' };

    const sid = new mongoose.Types.ObjectId(studentId);
    // Reads Skill DNA; writes nothing. Evidence is created by assessments, never by planning.
    const { profile, summary } = await buildFoundationProfile(tenantId, studentId, directionChoiceFor(user.passport));

    const journey = await LearningCurriculum.findOne({
      tenantId, personalizedFor: sid, adaptiveStage: stageKey, journeyKind: FOUNDATION_JOURNEY_KIND,
    }).select('_id').lean() as any;

    if (!journey) {
      if (!summary.measured) {
        return { action: 'NOT_READY', reason: 'NO_SKILL_EVIDENCE', measuredSkills: 0 };
      }
      // PRODUCTION: PUBLISHED && READY. Exactly ninety is checked inside, before the first write.
      const built = await persistFoundationJourney(tenantId, sid, profile, { source: 'PRODUCTION', stageKey });
      if (!built.ok || !built.curriculumId) {
        return { action: 'REFUSED', reason: built.reason || 'JOURNEY_NOT_WRITTEN', measuredSkills: summary.measured };
      }
      await ensureJourneyEnrollment(tenantId, user, String(built.curriculumId), stageKey);
      return {
        action: built.created ? 'CREATED' : 'UNCHANGED',
        reason: trigger,
        curriculumId: String(built.curriculumId),
        measuredSkills: summary.measured,
      };
    }

    /**
     * A stored journey that is not a whole ninety days is not recomposed around.
     *
     * Recomposition refuses it anyway; checking first keeps the reason legible, and leaves the
     * repair to somebody who has looked at why it broke.
     */
    const integrity = await checkJourneyIntegrity(tenantId, sid, stageKey);
    if (!integrity.ok) {
      return {
        action: 'REFUSED',
        reason: `JOURNEY_INTEGRITY: ${integrity.days}/${integrity.expected} days, `
          + `${integrity.missing.length} missing, ${integrity.duplicates.length} duplicated`,
        curriculumId: String(journey._id),
      };
    }
    await ensureJourneyEnrollment(tenantId, user, String(journey._id), stageKey);

    const recomposed = await recomposeFutureDays(tenantId, sid, profile, { source: 'PRODUCTION', stageKey });
    if (!recomposed.ok) {
      return { action: 'REFUSED', reason: recomposed.reason || 'RECOMPOSITION_REFUSED', curriculumId: String(journey._id) };
    }
    return {
      action: recomposed.rewrittenDays.length ? 'RECOMPOSED' : 'UNCHANGED',
      reason: trigger,
      curriculumId: String(journey._id),
      rewrittenDays: recomposed.rewrittenDays,
      frozenDays: recomposed.frozenDays,
      measuredSkills: summary.measured,
    };
  } catch (e: any) {
    console.error('[foundation-journey] trigger failed:', e?.message || e);
    return { action: 'FAILED', reason: e?.message || 'failed' };
  }
}
