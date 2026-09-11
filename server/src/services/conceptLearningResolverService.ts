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
import CareerSkillResource, { resourceServes, ResourceMember, bodyIsEmpty } from '../models/CareerSkillResource';
import StudentSkillProfile from '../models/StudentSkillProfile';
import User from '../models/User';
import { LearningFallbackReason, phasesForWorkType, workTypeForPhase } from '../data/conceptLearningPolicy';
import { assessmentRouteForSkill, materialRoute, practiceRoute } from '../data/missionOrchestrationPolicy';
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

/** One material, as much of it as the syllabus needs to describe a step. */
export interface JourneyResource {
  title?: string;
  resourceType?: string;
  url?: string;
  body?: any;
  /** The linked Practice Lab problem, for the types that have one. Not the material's own id. */
  resourceId?: string;
}

/**
 * Where a step opens.
 *
 * DELIBERATELY THE SAME DESTINATIONS THE MISSION CARD USES. A student who opens "For loops,
 * counting with range" from their syllabus and then meets the same step as tomorrow's mission
 * must land in the same place — two routing rules would eventually disagree, and the student
 * would be the one who found out.
 */
export function stepRoute(
  step: { resourceId?: string; phase: string },
  skillKey: string,
  res?: JourneyResource,
): string {
  if (!step.resourceId) {
    // No material means the assessment engine owns it, exactly as the bridge decides.
    return workTypeForPhase(step.phase) === 'ASSESS' ? assessmentRouteForSkill(skillKey) : '';
  }
  if (!res) return '';
  if (res.resourceType === 'practice' || res.resourceType === 'problem') {
    return res.resourceId ? practiceRoute(String(res.resourceId)) : '';
  }
  if (res.resourceType === 'mock_interview') return '/careerpilot/interview';
  // An external link is returned whole. The client opens an absolute URL in a new tab rather
  // than handing it to the router, which would read it as an in-app path.
  return String(res.url || '').trim() || materialRoute(String(step.resourceId));
}

/**
 * Shape the whole course for one skill. PURE — the decisions, without the reads.
 *
 * Split out for the same reason the rest of this module's logic is: which steps a student can
 * see, which one is next and what each is called are ordinary decisions over a unit, a progress
 * record and some materials. Exercising them through Mongo would test Mongo.
 */
export function journeyView(input: {
  unit: IConceptLearningUnit;
  completedStepIds: Iterable<string>;
  member: ResourceMember;
  skillScore: number | null;
  resources: Map<string, JourneyResource>;
  status?: string;
}) {
  const { unit, member, skillScore, resources } = input;
  const done = new Set([...input.completedStepIds].map(String));

  /**
   * SHOWS WHAT WILL ACTUALLY BE SERVED, NOT EVERY AUTHORED STEP.
   *
   * The same audience and score-window filter the resolver applies, applied here. A strong
   * student whose intro steps are skipped must not be shown a syllabus full of items they will
   * never be given, and nobody is shown a step aimed at a different branch. Any disagreement
   * between this list and what opens tomorrow is a bug the student notices before we do.
   */
  const steps = (unit.steps || [])
    .slice()
    .sort((a, b) => a.sequence - b.sequence)
    .filter(s => servesMember(unit, s, member, skillScore));

  const required = steps.filter(s => s.required);
  const completedRequired = required.filter(s => done.has(s.stepId)).length;

  // The first thing they have not done. Not necessarily a required one — an optional step
  // sitting in the middle of the sequence is still the next thing in front of them.
  const next = steps.find(s => !done.has(s.stepId)) || null;

  return {
    skillKey: unit.skillKey,
    title: unit.title,
    description: unit.description || '',
    learningOutcomes: (unit.learningOutcomes || []).filter(Boolean),
    version: unit.version,
    status: input.status || 'NOT_STARTED',
    estimatedMinutes: steps.reduce((n, s) => n + (Number(s.estimatedMinutes) || 0), 0),
    nextStepId: next?.stepId || null,
    progress: {
      completed: completedRequired,
      totalRequired: required.length,
      percent: required.length ? Math.round((completedRequired / required.length) * 100) : 0,
    },
    steps: steps.map(s => {
      const res = s.resourceId ? resources.get(String(s.resourceId)) : undefined;
      return {
        stepId: s.stepId, sequence: s.sequence, phase: s.phase,
        workType: workTypeForPhase(s.phase),
        // The two grouping levels, so a member's journey reads as a course rather than as
        // fourteen numbered rows. Empty for anything authored before they existed, which
        // simply renders ungrouped.
        topic: s.topic || '',
        subtopic: s.subtopic || '',
        /**
         * Titles come from the material, not from the step. `titleOverride` is usually empty —
         * an author names the resource once and the step points at it — so a syllabus built
         * from the step alone was a column of phases: LEARN, LEARN, PRACTICE.
         */
        title: s.titleOverride || res?.title || '',
        resourceId: s.resourceId ? String(s.resourceId) : '',
        resourceType: res?.resourceType || '',
        route: stepRoute(s, unit.skillKey, res),
        // A step pointing at a retired or empty resource opens nothing. Said here, rather than
        // discovered on the day it comes up.
        hasContent: !!res && (!!String(res.url || '').trim() || !bodyIsEmpty(res.body)),
        estimatedMinutes: s.estimatedMinutes,
        required: s.required,
        done: done.has(s.stepId),
      };
    }),
  };
}

/**
 * The member-facing journey view: the whole course for one skill, and where they are in it.
 *
 * WHY A STUDENT NEEDS THIS AND NOT JUST TODAY'S STEP. A mission shows one step. A student
 * working through fourteen of them has no idea whether they are near the end of for loops or
 * near the end of loops, what is still ahead, or why any of it is in the order it is in. Being
 * shown one thing at a time forever is how a course feels like a treadmill.
 *
 * IT IS A READ. Opening the syllabus is not doing any of it; progress is written when a mission
 * completes, exactly as everywhere else in this module.
 */
export async function journeyFor(tenantId: string, studentId: string, skillKey: string) {
  const key = String(skillKey).toUpperCase();
  const progress: any = await StudentConceptProgress.findOne({
    tenantId, studentId: new mongoose.Types.ObjectId(studentId), skillKey: key,
  }).sort({ lastActivityAt: -1 }).lean();

  const unit = progress
    ? await unitVersion(tenantId, progress.learningUnitId, progress.learningUnitVersion)
    : await publishedUnitForSkill(tenantId, key);
  if (!unit) return null;

  // The same two inputs the resolver filters on, read the same way.
  const [user, profile]: any[] = await Promise.all([
    User.findOne({ _id: studentId, tenantId }).select('passport').lean(),
    StudentSkillProfile.findOne({ tenantId, studentId, skillKey: key }).select('score').lean(),
  ]);
  const p = user?.passport || {};
  const member: ResourceMember = {
    yearOfStudy: p.yearOfStudy, degree: p.degree, program: p.program, branch: p.branch,
    primaryRole: p.primaryRole, secondaryRole: p.secondaryRole, stage: p.stage,
    preferredLanguages: p.preferredLanguages || [],
  };

  const ids = (unit.steps || []).map(s => String(s.resourceId || ''))
    .filter(id => id && mongoose.isValidObjectId(id));
  const rows = ids.length
    ? await CareerSkillResource.find({ tenantId, _id: { $in: ids }, active: true })
        .select('_id title resourceType url body resourceId').lean() as any[]
    : [];

  return journeyView({
    unit,
    completedStepIds: (progress?.completedSteps || []).map((c: any) => String(c.stepId)),
    member,
    skillScore: typeof profile?.score === 'number' ? profile.score : null,
    resources: new Map(rows.map(r => [String(r._id), r as JourneyResource])),
    status: progress?.status || 'NOT_STARTED',
  });
}

export { ConceptLearningUnit };
