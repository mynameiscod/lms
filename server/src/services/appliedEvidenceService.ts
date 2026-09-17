/**
 * Graded practical work, as Skill DNA evidence.
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────────────────────
 *
 * Until now the only coursework Skill DNA could see was checkpoint answers. A student who recognised
 * the right answer to six questions about conditions was VERIFIED on conditions, and the plan dropped
 * the coding assignment that would have been the first time they wrote one. Checkpoints now show
 * UNDERSTANDING and are capped at STANDARD on their own; this is where APPLIED evidence — the work the
 * student actually produced — comes from.
 *
 * ── ONLY A GRADE THAT CAN BE TRUSTED ────────────────────────────────────────────────────────
 *
 *   AUTO_GRADED  a coding assignment's final submission, run against EVERY test case, hidden ones
 *                included, on a runner that really executed the program (Piston). A simulated run
 *                pattern-matches the expected output; it is feedback while practising and never a grade
 *                Skill DNA may learn from. A run the grader could not complete — busy, unreachable —
 *                is not a failure by the student either. Neither writes anything.
 *   REVIEWED     a coding or project submission GRADED by somebody holding grade_submissions, through
 *                the existing grading endpoint. Submitting a project is not an evaluation; saving,
 *                running, asking for a hint and an ungraded submit are not either.
 *
 * Nothing here accepts a score from a caller. It is handed a submission id and reads the grade the
 * grading path stored, in the tenant the caller was authenticated into.
 *
 * ── PERFORMANCE ─────────────────────────────────────────────────────────────────────────────
 *
 *   AUTO_GRADED  autoScore ÷ totalPoints — the weighted share of test cases passed.
 *   REVIEWED     with rubric scores: points awarded ÷ the rubric's maximum, the grader's whole judgement.
 *                Without: (auto + manual) ÷ totalPoints — for a coding submission only when its auto-grade
 *                was itself really executed, because otherwise part of that total came from a simulation.
 *
 * A late penalty is NOT applied. It is a deadline rule on the grade, not a measurement of the skill; the
 * same program handed in a day late shows the same ability. A failed grade is recorded as it is: 20% is
 * evidence, and it enters the weighted average at full weight.
 *
 * ── ONE CONTRIBUTION PER SKILL, PER ATTEMPT ─────────────────────────────────────────────────
 *
 * Identity is the submission and its attempt number, per skill. A retried request finds the same rows
 * and changes nothing (no recompute, no trigger). A regrade REPLACES them — the grader changed their
 * mind about the same work, which is not a second observation. A reattempt (allow-reattempt increments
 * the attempt) is new work and new evidence beside the old, like a retaken paper.
 *
 * ── SKILLS ──────────────────────────────────────────────────────────────────────────────────
 *
 * The assignment's unitCode names its curriculum unit; the unit's skillKeys are the skills it assesses.
 * One grade is given for the whole unit, so the same performance applies to each of its active,
 * assessable, non-group skills at full weight — the grade does not say which skill a lost mark belonged
 * to, and splitting it would invent a precision nobody measured. An assignment without a unit, or a unit
 * with no assessable skill, records nothing and says so.
 */

import mongoose from 'mongoose';
import StudentSkillEvidence from '../models/StudentSkillEvidence';
import Submission, { SubmissionStatus } from '../models/Submission';
import { AssignmentType } from '../models/Assignment';
import CurriculumLearningUnit from '../models/CurriculumLearningUnit';
import CareerSkill from '../models/CareerSkill';
import { recomputeStudentSkills } from './skillDnaService';
import { deterministicId } from './moduleAssessmentEvidenceService';
import { publish } from './adaptiveCurriculumEvents';
import { evidenceWeightFor, SKILL_DNA_VERSION, EVIDENCE_KIND_FOR_SOURCE } from '../data/skillDnaPolicy';

export type AppliedEvaluation = 'AUTO_GRADED' | 'REVIEWED';

export type AppliedOutcome =
  | 'RECORDED'            // first evidence for this attempt
  | 'REPLACED'            // a regrade changed this attempt's evidence
  | 'UNCHANGED'           // a retry: the same grade was already recorded
  | 'NOT_EVALUATED'       // not in a final graded state for this evaluation
  | 'UNTRUSTED_GRADE'     // simulated or incomplete run; or a review whose total includes one
  | 'NOT_APPLIED_WORK'    // not a coding assignment or a project
  | 'NO_UNIT'             // the assignment names no curriculum unit
  | 'UNMAPPED'            // the unit assesses no active, assessable skill
  | 'REFUSED';            // no such submission in this tenant, or a self-grade

export interface AppliedEvidenceResult {
  outcome: AppliedOutcome;
  reason?: string;
  submissionId: string;
  attemptNumber?: number;
  unitCode?: string;
  skillKeys: string[];
  performance?: number;
  triggered: boolean;
}

const ITEM_SOURCE_TYPE = 'assignment';

/** The stable identity of one evaluated attempt. Exported so tests and audits name it the same way. */
export const appliedAssessmentId = (submissionId: string, attemptNumber: number) =>
  deterministicId(`assignment-submission:${submissionId}:attempt:${attemptNumber}`);

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

/**
 * Record one evaluation of one submission. Never throws for a submission that simply does not qualify;
 * the outcome says why.
 *
 * `tenantId` must come from the authenticated caller, never from a header or the body. Whether the
 * auto-grade was really executed is read from the submission, where the grading code stored it with the
 * grade; no request can supply it.
 */
export async function recordAppliedEvaluation(input: {
  tenantId: string;
  submissionId: string;
  evaluation: AppliedEvaluation;
}): Promise<AppliedEvidenceResult> {
  const { tenantId, evaluation } = input;
  const submissionId = String(input.submissionId);
  const base = { submissionId, skillKeys: [] as string[], triggered: false };

  if (!tenantId || !mongoose.Types.ObjectId.isValid(tenantId) || !mongoose.Types.ObjectId.isValid(submissionId)) {
    return { ...base, outcome: 'REFUSED', reason: 'INVALID_IDENTITY' };
  }

  const submission: any = await Submission.findOne({ _id: submissionId, tenant: tenantId }).populate('assignment').lean();
  if (!submission || !submission.assignment) return { ...base, outcome: 'REFUSED', reason: 'NO_SUCH_SUBMISSION' };

  const assignment: any = submission.assignment;
  const attemptNumber = Number(submission.attemptNumber) || 1;
  const withAttempt = { ...base, attemptNumber, unitCode: assignment.unitCode || undefined };

  if (![AssignmentType.CODING, AssignmentType.PROJECT].includes(assignment.type)) {
    return { ...withAttempt, outcome: 'NOT_APPLIED_WORK', reason: assignment.type };
  }

  const totalPoints = Number(assignment.totalPoints) || 0;
  const identity = appliedAssessmentId(submissionId, attemptNumber);
  let performance: number;
  let sourceType: 'CODING_ASSIGNMENT' | 'PROJECT_EVALUATION';

  if (evaluation === 'AUTO_GRADED') {
    if (assignment.type !== AssignmentType.CODING) return { ...withAttempt, outcome: 'NOT_EVALUATED', reason: 'ONLY_CODING_IS_AUTO_GRADED' };
    if (![SubmissionStatus.SUBMITTED, SubmissionStatus.LATE].includes(submission.status)) {
      return { ...withAttempt, outcome: 'NOT_EVALUATED', reason: `STATUS_${String(submission.status).toUpperCase()}` };
    }
    if (!(assignment.testCases || []).length || totalPoints <= 0) return { ...withAttempt, outcome: 'NOT_EVALUATED', reason: 'NO_TEST_CASES' };
    if (submission.autoGradeTrusted !== true) return { ...withAttempt, outcome: 'UNTRUSTED_GRADE', reason: 'NOT_REALLY_EXECUTED' };
    if ((submission.testCaseResults || []).length !== assignment.testCases.length) {
      return { ...withAttempt, outcome: 'UNTRUSTED_GRADE', reason: 'NOT_EVERY_TEST_CASE_RAN' };
    }
    performance = clamp01(Number(submission.autoScore) / totalPoints);
    sourceType = 'CODING_ASSIGNMENT';
  } else {
    if (submission.status !== SubmissionStatus.GRADED || !submission.gradedBy) {
      return { ...withAttempt, outcome: 'NOT_EVALUATED', reason: `STATUS_${String(submission.status).toUpperCase()}` };
    }
    // A grade the student gave their own work is not a review, whatever permission made it possible.
    if (String(submission.gradedBy) === String(submission.student)) return { ...withAttempt, outcome: 'REFUSED', reason: 'SELF_GRADED' };

    const rubric = (submission.rubricScores || []) as any[];
    const rubricMax = rubric.reduce((s, r) => s + (Number(r.maxPoints) || 0), 0);
    if (rubric.length && rubricMax > 0) {
      performance = clamp01(rubric.reduce((s, r) => s + (Number(r.pointsAwarded) || 0), 0) / rubricMax);
    } else if (totalPoints <= 0) {
      return { ...withAttempt, outcome: 'NOT_EVALUATED', reason: 'NO_POINTS' };
    } else if (assignment.type === AssignmentType.CODING && Number(submission.autoScore) > 0 && submission.autoGradeTrusted !== true) {
      return { ...withAttempt, outcome: 'UNTRUSTED_GRADE', reason: 'REVIEW_TOTAL_INCLUDES_A_SIMULATED_RUN' };
    } else {
      performance = clamp01((Number(submission.autoScore || 0) + Number(submission.manualScore || 0)) / totalPoints);
    }
    sourceType = assignment.type === AssignmentType.CODING ? 'CODING_ASSIGNMENT' : 'PROJECT_EVALUATION';
  }

  if (!assignment.unitCode) return { ...withAttempt, outcome: 'NO_UNIT', performance };

  const unit: any = await CurriculumLearningUnit.findOne({ tenantId: String(tenantId), unitCode: String(assignment.unitCode).toUpperCase() })
    .select('skillKeys').lean();
  const wanted = [...new Set(((unit?.skillKeys || []) as string[]).map(k => String(k).toUpperCase()))];
  const valid = wanted.length
    ? (await CareerSkill.find({ key: { $in: wanted }, active: true, assessable: true, nodeType: { $ne: 'GROUP' } }).select('key').lean() as any[])
      .map(s => String(s.key).toUpperCase())
    : [];
  const skillKeys = wanted.filter(k => valid.includes(k));
  if (!skillKeys.length) {
    return { ...withAttempt, outcome: 'UNMAPPED', reason: unit ? 'NO_ASSESSABLE_SKILL' : 'NO_SUCH_UNIT', performance };
  }

  const maxPoints = 100;
  const earnedPoints = Math.round(performance * 10000) / 100;
  const evaluatedBy = evaluation === 'REVIEWED' ? submission.gradedBy : undefined;
  const existing = await StudentSkillEvidence.find({ assessmentId: identity }).lean() as any[];

  // A retry: the same evaluation of the same attempt, already recorded exactly.
  const same = existing.length === skillKeys.length
    && existing.every(e => skillKeys.includes(e.skillKey) && e.performance === performance
      && e.evaluation === evaluation && e.sourceType === sourceType && String(e.tenantId) === String(tenantId));
  if (same) return { ...withAttempt, outcome: 'UNCHANGED', skillKeys, performance };

  // Identity is global, so a row under it belonging to another tenant or student means something is wrong.
  if (existing.some(e => String(e.tenantId) !== String(tenantId) || String(e.studentId) !== String(submission.student))) {
    return { ...withAttempt, outcome: 'REFUSED', reason: 'IDENTITY_CONFLICT', skillKeys };
  }

  const weight = evidenceWeightFor({ relationship: 'PRIMARY', difficulty: 'MEDIUM', sourceType });
  const observedAt = (evaluation === 'REVIEWED' ? submission.gradedAt : submission.submittedAt) || new Date();

  await StudentSkillEvidence.bulkWrite(skillKeys.map(skillKey => ({
    updateOne: {
      filter: { assessmentId: identity, itemSourceType: ITEM_SOURCE_TYPE, itemSourceId: String(assignment._id), skillKey },
      update: {
        $set: {
          sourceType, evidenceKind: EVIDENCE_KIND_FOR_SOURCE[sourceType],
          earnedPoints, maxPoints, performance, evidenceWeight: weight, policyVersion: SKILL_DNA_VERSION,
          evaluation, observedAt,
          ...(evaluatedBy ? { evaluatedBy } : {}),
        },
        ...(evaluatedBy ? {} : { $unset: { evaluatedBy: '' } }),
        $setOnInsert: {
          tenantId: String(tenantId), studentId: submission.student, skillKey,
          assessmentId: identity, attemptNumber,
          itemSourceType: ITEM_SOURCE_TYPE, itemSourceId: String(assignment._id),
          relationship: 'PRIMARY', difficulty: 'MEDIUM',
          submissionId: submission._id, assignmentId: assignment._id, unitCode: String(assignment.unitCode).toUpperCase(),
        },
      },
      upsert: true,
    },
  })), { ordered: true });

  // A regrade after the unit's skills were re-mapped: the stale skills lose this attempt's contribution.
  const dropped = existing.map(e => e.skillKey).filter(k => !skillKeys.includes(k));
  if (dropped.length) await StudentSkillEvidence.deleteMany({ assessmentId: identity, skillKey: { $in: dropped } });

  await recomputeStudentSkills(String(tenantId), String(submission.student), [...skillKeys, ...dropped]);

  const outcome: AppliedOutcome = existing.length ? 'REPLACED' : 'RECORDED';
  console.log(`[applied-evidence] ${evaluation} ${sourceType} ${assignment.unitCode} attempt ${attemptNumber} for ${submission.student}: `
    + `${Math.round(performance * 100)}% → ${skillKeys.join(', ')} (${outcome.toLowerCase()})`);

  /**
   * The evaluation changed the evidence, so the future of the journey may change. Only then: a retry
   * that changed nothing sends nothing. Recomposition freezes completed days and today, as for every
   * other trigger.
   */
  await publish({
    name: 'PROJECT_EVALUATED',
    tenantId: String(tenantId),
    studentId: String(submission.student),
    skillKeys,
    meta: { submissionId, attemptNumber, unitCode: assignment.unitCode, evaluation, outcome },
  });

  return { ...withAttempt, outcome, skillKeys, performance, triggered: true };
}

/**
 * Run an evaluation's evidence after the grade has been saved, without making the request wait for it
 * or fail because of it — the same promise a checkpoint makes. Pending work is tracked so a test or a
 * script can wait for it.
 */
const pending = new Set<Promise<unknown>>();

export function scheduleAppliedEvidence(input: Parameters<typeof recordAppliedEvaluation>[0]): void {
  const work = recordAppliedEvaluation(input)
    .catch(e => console.error('[applied-evidence] failed:', e?.message || e))
    .finally(() => pending.delete(work));
  pending.add(work);
}

export async function settleAppliedEvidence(): Promise<void> {
  while (pending.size) await Promise.all([...pending]);
}
