/**
 * conceptLearningResolverService — which step of a concept's journey comes next.
 *
 * THE ONE QUESTION THIS ANSWERS. The roadmap has decided the student needs JAVA_OOP and that
 * today's work is LEARN. Given what they have already done, what should open when they press
 * Start? Before this existed the answer came from `resolveResources` in the orchestrator,
 * which kept the first eligible resource per skill and work type — no memory, no order, the
 * same video every morning.
 *
 * WHAT IT MUST NOT DO. It never decides that a student needs a skill, never writes Skill DNA,
 * and never overrides the roadmap. If the plan stops asking for JAVA_OOP, unfinished progress
 * here is simply not read — the roadmap remains the source of truth, and a half-finished
 * journey is not a reason to keep teaching something the plan has moved past.
 *
 * IT FAILS BY SAYING SO. Every path that cannot produce a step returns a reason, so the
 * orchestrator can fall back to the legacy resolver and production can be asked how much
 * content is actually missing rather than inferring it from complaints.
 */
import mongoose from 'mongoose';
import ConceptLearningUnit, { IConceptLearningUnit, IConceptLearningStep } from '../models/ConceptLearningUnit';
import StudentConceptProgress from '../models/StudentConceptProgress';
import CareerSkillResource, { resourceServes, ResourceMember } from '../models/CareerSkillResource';
import { LearningFallbackReason, phasesForWorkType, workTypeForPhase } from '../data/conceptLearningPolicy';
import { publishedUnitForSkill, unitVersion } from './conceptLearningUnitService';

export interface ResolvedStep {
  unitId: string;
  unitVersion: number;
  unitTitle: string;
  stepId: string;
  sequence: number;
  phase: string;
  workType: string;
  title: string;
  estimatedMinutes: number;
  required: boolean;
  resourceId?: string;
  /** Position in the journey, for the member card: "Step 3 of 7". */
  position: { index: number; totalRequired: number; completedRequired: number };
}

export interface ResolveOutcome {
  step?: ResolvedStep;
  fallback?: LearningFallbackReason;
}

/**
 * A step's own audience narrows the unit's, it does not replace it.
 *
 * Both have to hold: a unit aimed at 3rd years containing a step aimed at Java speakers is
 * for third-year Java speakers, which is the only reading that lets an author narrow safely.
 */
function servesMember(
  unit: IConceptLearningUnit,
  step: IConceptLearningStep,
  member: ResourceMember,
  score: number | null,
): boolean {
  const unitOk = resourceServes({ audience: unit.audience, scoreWindow: undefined } as any, member, score);
  if (!unitOk) return false;
  return resourceServes({ audience: step.audience, scoreWindow: step.scoreWindow } as any, member, score);
}

export interface ResolveInput {
  tenantId: string;
  studentId: string;
  skillKey: string;
  /** The roadmap's verb for this objective. The journey follows the plan, not its own order. */
  workType: string;
  member: ResourceMember;
  skillScore: number | null;
  /** Steps whose unit already contributed a mission today, so one unit cannot fill the day. */
  alreadyChosenUnitIds?: Set<string>;
}

/**
 * Find the next step, or say why there is not one.
 *
 * Reads only. Progress is written when a mission completes, not when one is offered — a step
 * that is shown and ignored has not been done, and marking it here would let a student walk
 * through an entire journey by opening their dashboard every morning.
 */
export async function resolveNextStep(input: ResolveInput): Promise<ResolveOutcome> {
  const { tenantId, studentId, member, skillScore } = input;
  const skillKey = String(input.skillKey).toUpperCase();
  const workType = String(input.workType).toUpperCase();

  // The student's own progress first: somebody mid-journey stays on the version they started,
  // whatever has been published since.
  const progress = await StudentConceptProgress.findOne({
    tenantId, studentId: new mongoose.Types.ObjectId(studentId), skillKey,
  }).sort({ lastActivityAt: -1 }).lean() as any;

  let unit: IConceptLearningUnit | null = null;
  if (progress && progress.status !== 'COMPLETED') {
    unit = await unitVersion(tenantId, progress.learningUnitId, progress.learningUnitVersion);
  }
  if (!unit) unit = await publishedUnitForSkill(tenantId, skillKey);
  if (!unit) return { fallback: 'NO_PUBLISHED_UNIT' };

  // A unit that already gave today a mission does not give it a second one.
  if (input.alreadyChosenUnitIds?.has(String((unit as any)._id))) return { fallback: 'NO_ELIGIBLE_STEP' };

  const steps = (unit.steps || []).slice().sort((a, b) => a.sequence - b.sequence);
  if (!steps.length) return { fallback: 'NO_ELIGIBLE_STEP' };

  // Progress is keyed to the unit the student is actually on. A row for an older version is
  // not this journey's progress and must not mark steps of this one complete.
  const onThisUnit = progress
    && String(progress.learningUnitId) === String((unit as any)._id)
    && progress.learningUnitVersion === unit.version;
  const completed = new Set<string>(onThisUnit ? (progress.completedSteps || []).map((c: any) => String(c.stepId)) : []);

  const totalRequired = steps.filter(s => s.required).length;
  const completedRequired = steps.filter(s => s.required && completed.has(s.stepId)).length;

  /**
   * FOLLOW THE ROADMAP'S VERB, NOT THE JOURNEY'S ORDER.
   *
   * A unit is authored intro → notes → practice → check. If the plan asks for PRACTICE, the
   * practice step is what is due even though earlier LEARN steps may be unfinished — the
   * roadmap has already decided how this week's minutes divide between learning and doing,
   * and re-deciding it here would quietly overrule Module 9's stage mix.
   */
  const wanted = phasesForWorkType(workType);
  const candidates = steps.filter(s => wanted.includes(s.phase as any));
  if (!candidates.length) return { fallback: 'NO_ELIGIBLE_STEP' };

  const outstanding = candidates.filter(s => !completed.has(s.stepId));
  if (!outstanding.length) {
    // Every step for this verb is done. REVIEW is the exception the policy allows: a plan
    // that asks for review may reuse review material the student has already seen, which is
    // what reviewing is.
    if (workType === 'REVIEW' && candidates.length) {
      const again = candidates[0];
      return { step: shape(unit, again, { index: again.sequence, totalRequired, completedRequired }) };
    }
    return { fallback: 'UNIT_COMPLETE' };
  }

  // Required before optional, then by authored order. Optional steps are enrichment and must
  // never come between a student and the next required thing.
  const ordered = [
    ...outstanding.filter(s => s.required),
    ...outstanding.filter(s => !s.required),
  ];

  let sawTargetingMismatch = false;
  let sawInactiveResource = false;

  for (const step of ordered) {
    if (!servesMember(unit, step, member, skillScore)) { sawTargetingMismatch = true; continue; }

    // A step with no resource is served as-is. That is how CHECK steps work by design — the
    // assessment engine owns which questions a skill check asks, and the journey only says
    // that a check belongs at this point in the sequence. A CHECK step that DOES name a
    // resource falls through and is resolved normally, so an author can point one at a
    // specific paper without the resolver second-guessing them.
    if (!step.resourceId) {
      return { step: shape(unit, step, { index: step.sequence, totalRequired, completedRequired }) };
    }

    if (!mongoose.isValidObjectId(step.resourceId)) { sawInactiveResource = true; continue; }
    const res: any = await CareerSkillResource.findOne({
      tenantId, _id: step.resourceId, active: true,
    }).lean();
    // Retired underneath the journey. Skipped rather than served, and the readiness screen
    // reports it so an admin can see which unit has a hole in it.
    if (!res) { sawInactiveResource = true; continue; }
    if (!resourceServes(res, member, skillScore)) { sawTargetingMismatch = true; continue; }

    return { step: shape(unit, step, { index: step.sequence, totalRequired, completedRequired }, res.title) };
  }

  if (sawInactiveResource) return { fallback: 'RESOURCE_INACTIVE' };
  if (sawTargetingMismatch) return { fallback: 'TARGETING_MISMATCH' };
  return { fallback: 'NO_ELIGIBLE_STEP' };
}

function shape(
  unit: IConceptLearningUnit,
  step: IConceptLearningStep,
  position: { index: number; totalRequired: number; completedRequired: number },
  resourceTitle?: string,
): ResolvedStep {
  return {
    unitId: String((unit as any)._id),
    unitVersion: unit.version,
    unitTitle: unit.title,
    stepId: step.stepId,
    sequence: step.sequence,
    phase: String(step.phase),
    workType: workTypeForPhase(step.phase),
    title: step.titleOverride || resourceTitle || unit.title,
    estimatedMinutes: Number(step.estimatedMinutes) || 0,
    required: step.required !== false,
    resourceId: step.resourceId || undefined,
    position,
  };
}

/**
 * Record that a step was finished, once.
 *
 * IDEMPOTENT BY CONSTRUCTION. Mission completion can be retried — a double-clicked button, a
 * client resend, a queue delivering twice — and `$ne` in the filter means the second write
 * matches nothing rather than appending a duplicate. The unique index on
 * (tenant, student, unit, version) makes the upsert safe under a genuine race.
 *
 * NEVER TOUCHES SKILL DNA. Finishing a video says the student was shown it. What they can
 * demonstrate is the assessment's answer, and conflating the two is how a journey of clicked
 * videos would start reading as competence.
 */
export async function recordStepCompletion(input: {
  tenantId: string;
  studentId: string;
  skillKey: string;
  learningUnitId: string;
  learningUnitVersion: number;
  stepId: string;
  missionKey?: string;
  resourceId?: string;
  creditedMinutes?: number;
  now?: Date;
}): Promise<{ recorded: boolean; unitCompleted: boolean }> {
  const now = input.now || new Date();
  const studentId = new mongoose.Types.ObjectId(input.studentId);
  const learningUnitId = new mongoose.Types.ObjectId(input.learningUnitId);
  const key = {
    tenantId: input.tenantId, studentId, learningUnitId,
    learningUnitVersion: input.learningUnitVersion,
  };

  // Create the row if this is the student's first step on this unit. Separate from the push
  // so a brand-new journey and a resumed one take the same path below.
  await StudentConceptProgress.updateOne(key, {
    $setOnInsert: {
      ...key, skillKey: String(input.skillKey).toUpperCase(),
      startedAt: now, completedSteps: [], skippedStepIds: [],
    },
    $set: { status: 'IN_PROGRESS', lastActivityAt: now },
  }, { upsert: true });

  const res = await StudentConceptProgress.updateOne(
    { ...key, 'completedSteps.stepId': { $ne: input.stepId } },
    {
      $push: { completedSteps: {
        stepId: input.stepId, completedAt: now,
        missionKey: input.missionKey || '', resourceId: input.resourceId || '',
        creditedMinutes: Number(input.creditedMinutes) || 0,
      } },
      $set: { lastActivityAt: now },
    },
  );
  const recorded = (res.modifiedCount || 0) > 0;

  // Whether the journey is finished, judged against REQUIRED steps only — an optional cheat
  // sheet nobody opened must not hold a completed unit open forever.
  const unit = await unitVersion(input.tenantId, learningUnitId, input.learningUnitVersion);
  let unitCompleted = false;
  if (unit) {
    const progress: any = await StudentConceptProgress.findOne(key).lean();
    const done = new Set((progress?.completedSteps || []).map((c: any) => String(c.stepId)));
    const required = (unit.steps || []).filter(s => s.required);
    const doneRequired = required.filter(s => done.has(s.stepId)).length;
    const threshold = typeof unit.completionThreshold === 'number' ? unit.completionThreshold : 1;
    unitCompleted = required.length > 0 && doneRequired >= Math.ceil(required.length * threshold);
    if (unitCompleted) {
      await StudentConceptProgress.updateOne(key, {
        $set: { status: 'COMPLETED', completedAt: now, lastActivityAt: now },
      });
    }
  }
  return { recorded, unitCompleted };
}

/** The member-facing journey view: where they are and what is next. */
export async function journeyFor(tenantId: string, studentId: string, skillKey: string) {
  const key = String(skillKey).toUpperCase();
  const progress: any = await StudentConceptProgress.findOne({
    tenantId, studentId: new mongoose.Types.ObjectId(studentId), skillKey: key,
  }).sort({ lastActivityAt: -1 }).lean();

  const unit = progress
    ? await unitVersion(tenantId, progress.learningUnitId, progress.learningUnitVersion)
    : await publishedUnitForSkill(tenantId, key);
  if (!unit) return null;

  const done = new Set((progress?.completedSteps || []).map((c: any) => String(c.stepId)));
  const steps = (unit.steps || []).slice().sort((a, b) => a.sequence - b.sequence);
  const required = steps.filter(s => s.required);

  return {
    skillKey: key,
    title: unit.title,
    version: unit.version,
    status: progress?.status || 'NOT_STARTED',
    progress: {
      completed: required.filter(s => done.has(s.stepId)).length,
      totalRequired: required.length,
      percent: required.length
        ? Math.round((required.filter(s => done.has(s.stepId)).length / required.length) * 100)
        : 0,
    },
    steps: steps.map(s => ({
      stepId: s.stepId, sequence: s.sequence, phase: s.phase,
      // The sub-concept, so a member's journey reads as sections rather than twelve numbered
      // rows. Empty for anything authored before topics existed, which renders ungrouped.
      topic: s.topic || '',
      title: s.titleOverride || '', estimatedMinutes: s.estimatedMinutes,
      required: s.required, done: done.has(s.stepId),
    })),
  };
}

export { ConceptLearningUnit };
