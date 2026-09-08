/**
 * Rebuild the rest of a student's plan when what we know about them has changed.
 *
 * ONLY THE FUTURE. Completed work is history and is never rewritten — the plan says what to do
 * next, and progress lives on the enrollment where a replan does not reach. A student who
 * finished five days does not lose them because their score moved.
 *
 * NOT AFTER EVERY ANSWER. A plan that reshuffles on each question is one nobody can follow, and
 * the churn costs more trust than the accuracy buys. Replanning happens on named events, and
 * even then only when something moved far enough to change a teaching decision.
 *
 * RECOMMENDS, THEN ACTS — but never both silently. A structural change (direction, availability)
 * is applied; a change in what the student knows is REPORTED and left to them or an admin,
 * because their plan changing under them without asking is how a product stops feeling like it
 * is theirs.
 */

import mongoose from 'mongoose';
import StudentCurriculumAssignment from '../models/StudentCurriculumAssignment';
import CurriculumEnrollment from '../models/CurriculumEnrollment';
import { generateAssignment, assessReplanNeed, ensureAdaptivePlan } from './studentCurriculumAssignmentService';
import { ReplanTrigger } from '../data/adaptiveCurriculumPolicy';

/**
 * Triggers that rebuild the plan without asking.
 *
 * All three make the CURRENT plan wrong rather than merely out of date: a different direction
 * means the wrong topics, different availability means the wrong pace, and a first diagnostic
 * means there was no real plan before. Leaving any of them in place would be serving a plan we
 * already know does not fit.
 */
const AUTO_REPLAN: ReplanTrigger[] = [
  'DIAGNOSTIC_COMPLETED',
  'DIRECTION_CHANGED',
  'AVAILABILITY_CHANGED',
  'MENTOR_OVERRIDE',
];

export interface ReplanOutcome {
  replanned: boolean;
  recommended: boolean;
  version?: number;
  changedSkills: string[];
  reason: string | null;
}

/**
 * Handle one trigger for one student.
 *
 * NEVER THROWS INTO ITS CALLER. This is invoked from the end of a submission, and a student who
 * has just finished an assessment must not see an error because their plan could not be
 * rebuilt — the plan can be regenerated later, the submission cannot.
 */
export async function replanForTrigger(input: {
  tenantId: string;
  studentId: string;
  curriculumId?: string;
  trigger: ReplanTrigger;
  assessmentId?: string;
}): Promise<ReplanOutcome> {
  const quiet: ReplanOutcome = { replanned: false, recommended: false, changedSkills: [], reason: null };
  try {
    const curriculumIds = input.curriculumId
      ? [input.curriculumId]
      : await activeCurriculumIdsFor(input.tenantId, input.studentId);

    /**
     * A student with no enrollment is not a student with nothing to learn.
     *
     * This used to return silently, which meant every brand-new member — the exact case the
     * product exists for — finished their diagnostic and received no plan at all. Enrolling
     * them in the curriculum for their stage is the missing step; it does nothing when the
     * tenant has not marked one, so nothing changes for anyone who has not opted in.
     */
    if (!curriculumIds.length) {
      const seeded = await ensureAdaptivePlan({
        tenantId: input.tenantId,
        studentId: input.studentId,
        trigger: input.trigger,
        assessmentId: input.assessmentId,
      });
      if (!seeded.planned) {
        console.log('[adaptive] no plan for ' + input.studentId + ': ' + (seeded.reason || 'generation refused'));
        return quiet;
      }
      console.log('[adaptive] first plan for ' + input.studentId
        + (seeded.enrolled ? ' (auto-enrolled)' : '') + ' on ' + seeded.curriculumId);
      return { replanned: true, recommended: false, changedSkills: [], reason: input.trigger };
    }

    let outcome: ReplanOutcome = quiet;

    for (const curriculumId of curriculumIds) {
      const auto = AUTO_REPLAN.includes(input.trigger);

      if (!auto) {
        /**
         * Evidence-driven triggers are measured before anything is rebuilt.
         *
         * Passing a module assessment usually confirms what the plan already assumed. Rebuilding
         * on confirmation would churn the plan for no change in what it says.
         */
        const need = await assessReplanNeed(input.tenantId, input.studentId, curriculumId);
        if (!need.needed) continue;
        outcome = {
          replanned: false, recommended: true,
          changedSkills: need.changedSkills, reason: need.reason,
        };
        console.log(`[adaptive] replan recommended for ${input.studentId} on ${curriculumId}: `
          + `${need.changedSkills.length} skills moved (${input.trigger})`);
        continue;
      }

      const result = await generateAssignment({
        tenantId: input.tenantId,
        studentId: input.studentId,
        curriculumId,
        replan: true,
        trigger: input.trigger,
        generatedFromAssessmentId: input.assessmentId,
      });

      if (result.assignment) {
        outcome = {
          replanned: true, recommended: false,
          version: result.assignment.version,
          changedSkills: [], reason: input.trigger,
        };
        console.log(`[adaptive] replanned ${input.studentId} on ${curriculumId} `
          + `→ v${result.assignment.version} (${input.trigger})`);
      }
    }

    return outcome;
  } catch (e: any) {
    console.error('[adaptive] replan failed:', e?.message || e);
    return quiet;
  }
}

/**
 * Apply a replan the student asked for.
 *
 * Separated from the trigger path because the answer to "should this rebuild?" is different when
 * a person has just pressed a button: they have already decided, and the churn argument does not
 * apply to a change somebody requested.
 */
export async function replanOnRequest(input: {
  tenantId: string; studentId: string; curriculumId: string;
}): Promise<ReplanOutcome> {
  const result = await generateAssignment({
    ...input, replan: true, trigger: 'SIGNIFICANT_MASTERY_CHANGE',
  });
  return {
    replanned: !!result.assignment,
    recommended: false,
    version: result.assignment?.version,
    changedSkills: [],
    reason: 'SIGNIFICANT_MASTERY_CHANGE',
  };
}

/** Curricula this student is actively enrolled on, newest first. */
async function activeCurriculumIdsFor(tenantId: string, studentId: string): Promise<string[]> {
  const rows = await CurriculumEnrollment.find({
    tenantId, studentId: new mongoose.Types.ObjectId(studentId), status: 'active',
  }).select('curriculumId').sort({ createdAt: -1 }).limit(5).lean() as any[];
  return rows.map(r => String(r.curriculumId));
}

/** Version history for a student's plan, for the admin view and for support questions. */
export async function planHistory(tenantId: string, studentId: string, curriculumId: string) {
  return StudentCurriculumAssignment.find({
    tenantId,
    studentId: new mongoose.Types.ObjectId(studentId),
    curriculumId: new mongoose.Types.ObjectId(curriculumId),
  })
    .select('version status generatedReason generatedAt supersededAt totalAssignedMinutes estimatedWeeks policyVersion')
    .sort({ version: -1 })
    .lean();
}
