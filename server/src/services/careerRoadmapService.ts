import mongoose from 'mongoose';
import User from '../models/User';
import CareerSkill from '../models/CareerSkill';
import StudentSkillProfile from '../models/StudentSkillProfile';
import CareerRoadmap, { ICareerRoadmap, GenerationReason } from '../models/CareerRoadmap';
import { getCareerContext, StudentCareerContext } from './careerContextService';
import { calculateStudentRoleReadiness, RoleReadinessResult } from './roleReadinessService';
import PassportConfig from '../models/PassportConfig';
import PassportContent from '../models/PassportContent';
import { isEntitled } from './passportEntitlementService';
import { buildRoadmapPlan, PlannerGraphNode, PlannerProfile } from './roadmapPlannerService';
import StudentCurriculumAssignment from '../models/StudentCurriculumAssignment';
import LearningCurriculum from '../models/LearningCurriculum';
import { projectPlanToObjectives, ProjectedTopic } from './curriculumRoadmapProjection';
import {
  MAX_ROADMAP_DAYS, PREREQUISITE_DEPTH, ROADMAP_VERSION, RoadmapUnavailable,
} from '../data/roadmapPolicy';

/**
 * Making, storing and reading a student's 90-day plan.
 *
 * The division of labour matters here. roadmapPlannerService decides the plan and touches
 * nothing; this service gathers what it needs, writes the result down, and answers questions
 * about the plan that is already in force. Keeping the decision pure is what makes it
 * testable; keeping the writes here is what makes them auditable.
 *
 * A ROADMAP IS NEVER REGENERATED BECAUSE AN INPUT MOVED. A student who improves a score, an
 * admin who republishes a blueprint and a clock that ticks past midnight all leave the stored
 * plan exactly as it was. Whether a plan has fallen out of date is reported, never acted upon —
 * that decision belongs to the person whose plan it is.
 *
 * THE ONE EXCEPTION IS A PLAN BUILT FROM A SOURCE THAT NO LONGER DECIDES. See
 * `ensureCurriculumRoadmap`. A plan whose ordering came from the gap planner, while the student
 * has a curriculum plan that is meant to decide that ordering, is not out of date — it is a
 * plan for a different system. Leaving it alone is not respecting the student's decision,
 * because they never made one; it is showing them somebody else's syllabus until they happen to
 * press a button nobody told them about.
 *
 * NOTHING HERE TOUCHES SKILL DNA. Completing a roadmap item is not evidence of anything;
 * marking "Learn OOP" done must never move an OOP score, or the measurement becomes a
 * self-assessment and every downstream number becomes worthless.
 */

export interface RoadmapUnavailableResult {
  available: false;
  reason: RoadmapUnavailable;
  message: string;
  /** For CAREER_CONTEXT_INCOMPLETE — exactly which answers are still needed. */
  missing?: string[];
  role?: { key: string; name?: string };
}

export interface RoadmapView {
  available: true;
  roadmap: ICareerRoadmap;
  /** 1-based, clamped to the window. Past the end it stays at the last day. */
  currentDay: number;
  currentWeek: number;
  completed: boolean;
  outdated: boolean;
  outdatedReasons: OutdatedReason[];
}

export type OutdatedReason = 'ROLE_CHANGED' | 'COMMITMENT_CHANGED' | 'BLUEPRINT_CHANGED';

export type RoadmapOutcome = RoadmapView | RoadmapUnavailableResult;

/** Everything the planner needs, gathered in batched queries rather than per skill. */
interface PlanningInputs {
  context: StudentCareerContext;
  readiness: RoleReadinessResult;
  graph: Map<string, PlannerGraphNode>;
  profiles: Map<string, PlannerProfile>;
  roadmapDays: number;
  entitlementLimited: boolean;
}

const startOfUtcDay = (d: Date): Date => {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
};

/** Whole days from `from` to `to`, matching how the existing journey counts them. */
const daysBetween = (from: Date, to: Date): number =>
  Math.floor((startOfUtcDay(to).getTime() - startOfUtcDay(from).getTime()) / 86400000);

/**
 * The canonical subgraph around a set of skills, to the depth the planner can walk.
 *
 * One query per level — four at the very most, whatever the size of the blueprint. Resolving
 * a prerequisite chain with a lookup per skill would be thirty round trips to plan one
 * student, and the whole point of the shared graph is that it is loaded once.
 */
async function loadGraph(keys: string[]): Promise<Map<string, PlannerGraphNode>> {
  const graph = new Map<string, PlannerGraphNode>();
  let frontier = [...new Set(keys)];

  // One extra round beyond the planner's depth, because a GROUP standing between two skills
  // is traversed without counting as a level.
  for (let round = 0; round <= PREREQUISITE_DEPTH + 1 && frontier.length; round++) {
    const docs = await CareerSkill.find({ key: { $in: frontier } })
      .select('key name nodeType prerequisiteKeys active').lean() as any[];

    const next: string[] = [];
    for (const d of docs) {
      if (graph.has(d.key)) continue;
      graph.set(d.key, {
        key: d.key,
        name: d.name,
        nodeType: d.nodeType === 'GROUP' ? 'GROUP' : 'SKILL',
        prerequisiteKeys: Array.isArray(d.prerequisiteKeys) ? d.prerequisiteKeys : [],
        active: d.active !== false,
      });
      for (const p of d.prerequisiteKeys || []) if (!graph.has(p)) next.push(p);
    }
    frontier = [...new Set(next)];
  }

  return graph;
}

/**
 * How long this plan may run, from the membership's end date alone.
 *
 * PURELY A QUESTION ABOUT THE DATE. Whether somebody is allowed a plan at all is a separate
 * question, answered by the entitlement check in gatherInputs — mixing the two is what
 * produced the bug this replaces. The old version bailed out to the full ninety days
 * whenever `membershipActive()` was false, so the two states it could not tell apart —
 * "no expiry has ever been set" and "the membership ran out in March" — were handed the
 * same answer, and the expired member got a fresh 90-day roadmap for free.
 *
 * The three cases are now distinct:
 *
 *   no expiry date      perpetual under existing semantics; the full window
 *   expiry ahead of us  min(90, days remaining) — never plan work into weeks they cannot reach
 *   expiry behind us    EXPIRED. No window at all, and the caller must refuse.
 */
/**
 * `planDays` is the tenant's configured roadmap length, defaulted and clamped by the caller.
 * It was MAX_ROADMAP_DAYS, a constant — which meant a tenant could set a journey length for
 * their missions and have the skill plan quietly ignore it.
 */
function windowFor(passport: any, now: Date, planDays: number): {
  roadmapDays: number;
  entitlementLimited: boolean;
  expired: boolean;
} {
  const raw = passport?.expiresAt ? new Date(passport.expiresAt) : null;

  // No authoritative end date. §7 is explicit that one has to already exist for us to clamp
  // to it, and inventing one here would be inventing a subscription model.
  if (!raw || Number.isNaN(raw.getTime())) {
    return { roadmapDays: planDays, entitlementLimited: false, expired: false };
  }

  const left = daysBetween(now, raw) + 1;
  if (left <= 0) return { roadmapDays: 0, entitlementLimited: true, expired: true };
  if (left >= planDays) return { roadmapDays: planDays, entitlementLimited: false, expired: false };
  return { roadmapDays: left, entitlementLimited: true, expired: false };
}

/**
 * Gather the planning inputs, or say precisely why we cannot.
 *
 * The order of the checks is the order a student would fix them: a role first, because
 * without one nothing else has a target; then whether that role has been configured; then
 * whether we know how much time they have. Each failure names one next action rather than a
 * generic "not ready", because "not ready" is where students give up.
 */
async function gatherInputs(
  tenantId: string,
  studentId: string,
  now: Date,
  /**
   * The end of an entitlement already granted — the superseded roadmap's own end date.
   *
   * A REPLAN MUST NOT HAND OUT MORE TIME. Without this, a student replanning on day 40 of a
   * 90-day plan would receive a fresh 90 days running to day 130, and could do it again next
   * week. The plan is rebuilt inside the window they already have, not on top of it.
   */
  boundEndDate?: Date,
): Promise<PlanningInputs | RoadmapUnavailableResult> {
  const context = await getCareerContext(tenantId, studentId, now);
  if (!context) {
    return { available: false, reason: 'CAREER_CONTEXT_INCOMPLETE', message: 'Account not found.' };
  }

  // Module 8 owns role resolution, blueprint readiness and every gap verdict. Re-deriving
  // any of it here is how two screens end up disagreeing about the same student.
  const readiness = await calculateStudentRoleReadiness(tenantId, studentId);
  if (!readiness.available) {
    const un = readiness as { reason: string; message: string; role?: { key: string; name?: string } };
    return {
      available: false,
      reason: un.reason === 'ROLE_NOT_SELECTED' ? 'ROLE_NOT_SELECTED' : 'ROLE_BLUEPRINT_NOT_READY',
      message: un.reason === 'ROLE_NOT_SELECTED'
        ? 'Choose a target role before we build your plan — a roadmap without one would be a guess.'
        : 'This role is not configured yet, so we cannot plan against it.',
      role: un.role,
    };
  }

  // Capacity is the one input with no safe default. Inventing "two hours a day" would build
  // a plan around time the student never said they had, and they would fall behind in week
  // one through no fault of their own.
  const minutesPerDay = context.availability.minutesPerDay;
  const daysPerWeek = context.availability.daysPerWeek;
  if (!minutesPerDay || !daysPerWeek) {
    const missing: string[] = [];
    if (!minutesPerDay) missing.push('availability.minutesPerDay');
    if (!daysPerWeek) missing.push('availability.daysPerWeek');
    return {
      available: false,
      reason: 'CAREER_CONTEXT_INCOMPLETE',
      message: 'Tell us how much time you can give this, and we will build a plan that fits it.',
      missing,
      role: { key: readiness.role.key, name: readiness.role.name },
    };
  }

  const ready = readiness as RoleReadinessResult;
  const graph = await loadGraph(ready.skills.map(s => s.skillKey));

  // Skill DNA for the whole subgraph, not just the blueprint: a prerequisite the role never
  // listed still has to be checked before we decide to teach it.
  const rows = await StudentSkillProfile
    .find({ tenantId, studentId, skillKey: { $in: [...graph.keys()] } })
    .select('skillKey score confidence').lean() as any[];

  const profiles = new Map<string, PlannerProfile>(
    rows.map(r => [r.skillKey, { score: r.score, confidence: r.confidence }]),
  );

  const [user, cfg, content] = await Promise.all([
    User.findOne({ _id: studentId, tenantId }).select('passport').lean() as any,
    PassportConfig.findOne({ tenantId }).lean() as any,
    PassportContent.findOne({ tenantId }).select('journeyDays').lean() as any,
  ]);

  /**
   * The tenant's programme length, bounded by the policy maximum.
   *
   * ONE STORED NUMBER, READ IN PREFERENCE. `PassportContent.journeyDays` drives the mission
   * journey, and it is what the admin screen now writes. Reading it here too is what stops
   * the two from drifting: a tenant on journeyDays 100 and roadmapDays 90 showed a member a
   * "90-day plan" directly above a "100-Day Roadmap", and no amount of relabelling fixes a
   * disagreement that lives in two rows of the database.
   *
   * `cfg.roadmapDays` remains the fallback so a tenant whose content row predates the field
   * keeps whatever they had rather than silently jumping to the default.
   *
   * MAX_ROADMAP_DAYS stays as the CEILING rather than the value: the planner's reasoning
   * about staleness does not stop being true because somebody typed 400 into a box, and a
   * plan longer than the evidence behind it is a promise the product cannot keep.
   */
  const configuredDays = Number(content?.journeyDays) || Number(cfg?.roadmapDays) || MAX_ROADMAP_DAYS;
  const planDays = Math.max(7, Math.min(MAX_ROADMAP_DAYS, configuredDays));

  let { roadmapDays, entitlementLimited, expired } = windowFor(user?.passport, now, planDays);

  // Clamp to whatever remains of an already-granted window. Membership expiry may bite first
  // or this may; whichever is sooner wins, and neither extends anything.
  if (boundEndDate) {
    const remaining = daysBetween(now, boundEndDate) + 1;
    if (remaining <= 0) {
      expired = true;
      roadmapDays = 0;
    } else if (remaining < roadmapDays) {
      roadmapDays = remaining;
      entitlementLimited = true;
    }
  }

  /**
   * May this member have a plan at all?
   *
   * Gated on `roadmap_full` — the feature key this product already uses for "Full 90-day
   * Roadmap", so a tenant that has re-tiered it in Platform Settings re-tiers this too, and
   * nothing new has to be configured. isEntitled fails closed on an unknown key.
   *
   * The expiry check is deliberately SEPARATE and not an else-branch. A tenant may set
   * roadmap_full to `free`, which is their decision and lets a free member plan — but an
   * authoritative end date that has already passed still cannot buy a fresh ninety days,
   * because those days do not exist. Either condition refuses on its own.
   */
  if (!isEntitled(cfg?.entitlements, user?.passport, 'roadmap_full', now) || expired) {
    return {
      available: false,
      reason: 'MEMBERSHIP_REQUIRED',
      message: expired
        ? 'Your CareerPilot membership has ended, so we cannot plan the next 90 days yet. Renewing brings your plan back.'
        : 'A CareerPilot membership is needed to build your 90-day plan.',
      role: { key: ready.role.key, name: ready.role.name },
    };
  }

  return { context, readiness: ready, graph, profiles, roadmapDays, entitlementLimited };
}

/**
 * The student's curriculum plan, flattened into the order it teaches.
 *
 * Returns null when there is no active plan, which is the case for a student who has a role and
 * no curriculum — the gap-derived planner still answers for them, exactly as it did.
 */
async function curriculumTopicsFor(
  tenantId: string, studentId: string,
): Promise<ProjectedTopic[] | null> {
  /**
   * A studentId that is not an ObjectId means there is no plan to find, not a crash.
   *
   * StudentCurriculumAssignment stores studentId as an ObjectId, and casting an arbitrary string
   * throws inside the driver rather than returning nothing — so an id from a caller that uses a
   * different identifier took the whole roadmap generation down with it. Checked rather than
   * caught, so the absence is a decision instead of a swallowed error.
   */
  if (!mongoose.Types.ObjectId.isValid(studentId)) return null;

  const assignment = await StudentCurriculumAssignment.findOne({
    tenantId, studentId: new mongoose.Types.ObjectId(studentId), status: 'ACTIVE',
  }).lean() as any;
  if (!assignment) return null;

  const topics = ((assignment.moduleAssignments || []) as any[])
    .flatMap(m => (m.topicAssignments || []) as any[])
    .filter(t => t.topicCode);
  if (!topics.length) return null;

  return topics.map(t => ({
    topicCode: String(t.topicCode),
    title: String(t.title || t.topicCode),
    skillKeys: (t.skillKeys || []).map((k: string) => String(k).toUpperCase()),
    state: String(t.state),
    practiceCount: Number(t.practiceCount) || 0,
    mandatory: t.mandatory !== false,
    locked: !!t.locked,
    reasonText: t.reasonText || '',
    scoreAtAssignment: t.scoreAtAssignment ?? null,
  }));
}

/** Build the plan document body from gathered inputs. Pure apart from the planner call. */
async function planFrom(inputs: PlanningInputs, now: Date, tenantId?: string, studentId?: string) {
  const { context, readiness } = inputs;

  const plan = buildRoadmapPlan({
    roleKey: readiness.role.key,
    roleName: readiness.role.name,
    stage: context.derived.stage,
    coverage: readiness.coverage,
    roleConfidence: readiness.confidence,
    minutesPerDay: context.availability.minutesPerDay!,
    daysPerWeek: context.availability.daysPerWeek!,
    roadmapDays: inputs.roadmapDays,
    skills: readiness.skills,
    graph: inputs.graph,
    profiles: inputs.profiles,
  });

  /**
   * THE CURRICULUM DECIDES THE ORDER, WHERE THERE IS ONE.
   *
   * buildRoadmapPlan above still runs, because its capacity arithmetic, phase split and week
   * count are what the calendar is made of and they are not in dispute. What is replaced is the
   * list of objectives: a plan ordered by gap priority, whose tie-break is alphabetical, against
   * one ordered by what the curriculum actually teaches.
   *
   * Falls through untouched for a student with no curriculum plan, so nothing that works today
   * stops working.
   */
  const topics = tenantId && studentId ? await curriculumTopicsFor(tenantId, studentId) : null;

  /**
   * If this tenant teaches a curriculum, the roadmap waits for the plan rather than guessing.
   *
   * Falling through to the gap planner here is correct for a tenant that has no curriculum at
   * all. It is wrong for one that does: the student would get the alphabetically-ordered,
   * gap-derived plan — the exact thing the projection exists to replace — and it would stay,
   * because a roadmap now exists and nothing rebuilds it on its own.
   */
  if (!topics && tenantId) {
    /**
     * A PROBE, not a requirement — its failure means "assume this tenant teaches no curriculum".
     *
     * This asks whether a Year-1 curriculum exists at all, to tell "the plan is a moment away"
     * apart from "this tenant does not work that way". A caller with no database for this model
     * cannot answer it, and the honest answer to an unanswerable probe is the behaviour that
     * existed before the probe did: build from the gap planner.
     *
     * The connection is checked BEFORE asking rather than catching the failure afterwards.
     * Mongoose buffers a query on a disconnected model for ten seconds before rejecting, and
     * two of those inside one generation is twenty seconds of nothing — slow enough to time a
     * caller out on a question whose answer did not matter.
     */
    const teaches = mongoose.connection.readyState === 1
      ? await LearningCurriculum.exists({ tenantId, adaptiveStage: 'foundation' }).catch(() => null)
      : null;
    if (teaches) return { plan, body: null, notReady: true as const };
  }
  const projected = topics
    ? projectPlanToObjectives({
      topics,
      skillNames: new Map(readiness.skills.map((sk: any) => [sk.skillKey, sk.skillName])),
      minutesPerDay: context.availability.minutesPerDay!,
      daysPerWeek: context.availability.daysPerWeek!,
      weekCount: plan.weekCount,
    })
    : null;

  const startDate = startOfUtcDay(now);
  const endDate = new Date(startDate.getTime() + (inputs.roadmapDays - 1) * 86400000);

  return {
    plan,
    body: {
      roleKey: readiness.role.key,
      roleName: readiness.role.name,
      policyVersion: plan.policyVersion,
      startDate,
      endDate,
      roadmapDays: plan.roadmapDays,
      weekCount: plan.weekCount,
      generatedAt: now,
      input: {
        careerStage: context.derived.stage,
        minutesPerDay: context.availability.minutesPerDay!,
        daysPerWeek: context.availability.daysPerWeek!,
        readiness: readiness.readiness,
        coverage: readiness.coverage,
        roleConfidence: readiness.confidence,
        blueprintVersion: readiness.blueprintVersion,
        blueprintUpdatedAt: readiness.blueprintUpdatedAt,
        requiredSkills: readiness.summary.requiredSkills,
        assessedSkills: readiness.summary.assessedSkills,
        entitlementLimited: inputs.entitlementLimited,
      },
      capacity: plan.capacity,
      planningConfidence: plan.planningConfidence,
      phases: plan.phases,
      objectives: projected
        ? projected.objectives
        : plan.objectives.map(o => ({ ...o, origin: 'GENERATED' as const })),
      deferred: projected
        ? projected.deferred.map(d => ({
          skillKey: d.skillKey, skillName: d.skillName,
          reasonCode: 'NOT_ASSESSED' as any,
          reason: `${d.topicCode} did not fit inside the ${plan.weekCount}-week window.`,
        }))
        : plan.deferred,
      report: projected
        ? { ...plan.report, projectedFromCurriculum: 1, curriculumObjectives: projected.objectives.length }
        : plan.report,
    },
  };
}

/**
 * Has the world moved on since this plan was made?
 *
 * Three things invalidate a plan's premise: a different target, a different amount of time,
 * or a role that now requires different skills. A CHANGED SKILL DNA IS NOT ONE OF THEM — the
 * student improving at what the plan asked them to improve at is the plan working, not the
 * plan expiring, and treating it as staleness would tell somebody to rebuild their roadmap
 * every time they finished an assessment.
 */
export function stalenessOf(
  roadmap: ICareerRoadmap,
  context: StudentCareerContext | null,
  currentBlueprintVersion?: number,
): OutdatedReason[] {
  const reasons: OutdatedReason[] = [];
  if (!context) return reasons;

  if (context.career.primaryRole && context.career.primaryRole !== roadmap.roleKey) {
    reasons.push('ROLE_CHANGED');
  }
  const { minutesPerDay, daysPerWeek } = context.availability;
  if ((minutesPerDay && minutesPerDay !== roadmap.input.minutesPerDay)
    || (daysPerWeek && daysPerWeek !== roadmap.input.daysPerWeek)) {
    reasons.push('COMMITMENT_CHANGED');
  }
  if (currentBlueprintVersion !== undefined && currentBlueprintVersion !== roadmap.input.blueprintVersion) {
    reasons.push('BLUEPRINT_CHANGED');
  }
  return reasons;
}

/** Everything derived from a stored plan and the clock. Nothing here writes. */
function viewOf(roadmap: ICareerRoadmap, outdatedReasons: OutdatedReason[], now: Date): RoadmapView {
  const elapsed = daysBetween(roadmap.startDate, now) + 1;
  return {
    available: true,
    roadmap,
    currentDay: Math.min(roadmap.roadmapDays, Math.max(1, elapsed)),
    currentWeek: Math.min(roadmap.weekCount, Math.max(1, Math.ceil(Math.max(1, elapsed) / 7))),
    completed: elapsed > roadmap.roadmapDays,
    outdated: outdatedReasons.length > 0,
    outdatedReasons,
  };
}

/**
 * The student's current plan, or why there isn't one.
 *
 * Reading never generates. A roadmap is something somebody chose to start, and creating one
 * as a side effect of opening a page would mean the plan's start date was whenever they
 * happened to look.
 */
export async function getActiveRoadmap(
  tenantId: string,
  studentId: string,
  now: Date = new Date(),
): Promise<RoadmapOutcome> {
  const roadmap = await CareerRoadmap.findOne({ tenantId, studentId, status: 'ACTIVE' });

  if (!roadmap) {
    // No plan yet: report what still stands in the way, so the screen can offer the one
    // action that would fix it.
    const inputs = await gatherInputs(tenantId, studentId, now);
    if (!('context' in inputs)) return inputs;
    return {
      available: false,
      reason: 'NO_READINESS_DATA',
      message: 'Your skills and role gaps are ready — generate your 90-day plan whenever you are.',
      role: { key: inputs.readiness.role.key, name: inputs.readiness.role.name },
    };
  }

  const [context, readiness] = await Promise.all([
    getCareerContext(tenantId, studentId, now),
    calculateStudentRoleReadiness(tenantId, studentId).catch(() => null),
  ]);

  const blueprintVersion = readiness && readiness.available
    ? (readiness as RoleReadinessResult).blueprintVersion
    : undefined;

  return viewOf(roadmap, stalenessOf(roadmap, context, blueprintVersion), now);
}

export interface GenerateOptions {
  actor?: 'STUDENT' | 'ADMIN';
  /** Explicitly replace the active plan. Without it, generation returns what already exists. */
  replan?: boolean;
  /**
   * Rebuild a plan that exists; never bring a first one into being.
   *
   * FOR CALLERS THAT ARE REACTING TO SOMETHING, NOT BEING ASKED. Submitting an assessment
   * replans, and that is right for a student who already has a plan — their evidence moved, so
   * their plan should. It was wrong for a student who has never built one: they answered some
   * questions and were handed ninety days of commitments they never asked for, generated by a
   * side effect of a different action. Building a plan is the student's press.
   */
  replanOnly?: boolean;
  reason?: GenerationReason;
  now?: Date;
}

export interface GenerateResult {
  outcome: RoadmapOutcome;
  /** False when an existing plan was returned untouched, which is the normal retry case. */
  created: boolean;
  /** Set when generation was refused for a reason that is not a missing input. */
  refused?: 'PROGRAM_WINDOW_COMPLETED' | 'PLAN_NOT_READY' | 'NO_PLAN_TO_REPLAN';
}

/**
 * Generate, or return the plan that already exists.
 *
 * IDEMPOTENT BY DEFAULT. A double-clicked button, a retried request and a page that loads
 * twice must not leave a student with two plans — so without an explicit replan this returns
 * the active one untouched. The unique partial index is the real guarantee; the check below
 * only saves the work.
 */
export async function generateRoadmap(
  tenantId: string,
  studentId: string,
  opts: GenerateOptions = {},
): Promise<GenerateResult> {
  const now = opts.now || new Date();
  const existing = await CareerRoadmap.findOne({ tenantId, studentId, status: 'ACTIVE' });

  /**
   * A first plan is never a side effect. See `replanOnly`: the caller is reacting to something
   * the student did for another reason, and a student with no plan has not asked for one.
   */
  if (!existing && opts.replanOnly) {
    return {
      outcome: {
        available: false,
        reason: 'NO_READINESS_DATA',
        message: 'Your skills are up to date. Build your 90-day plan whenever you are ready.',
      },
      created: false,
      refused: 'NO_PLAN_TO_REPLAN',
    };
  }

  if (existing) {
    const elapsed = daysBetween(existing.startDate, now) + 1;
    const finished = elapsed > existing.roadmapDays;

    // A finished programme stays finished. Rolling straight into another 90 days would be
    // renewal, which is a commercial decision this module does not get to make.
    if (finished) {
      const context = await getCareerContext(tenantId, studentId, now);
      return {
        outcome: viewOf(existing, stalenessOf(existing, context), now),
        created: false,
        refused: 'PROGRAM_WINDOW_COMPLETED',
      };
    }

    if (!opts.replan) {
      const context = await getCareerContext(tenantId, studentId, now);
      return { outcome: viewOf(existing, stalenessOf(existing, context), now), created: false };
    }
  }

  // Everything is read and the plan fully built BEFORE anything is written, so a failure
  // while planning cannot leave a student with their old plan retired and no new one.
  // A replan inherits the existing plan's end date, so the student's window is rebuilt
  // rather than restarted. A first plan has no bound and uses the full entitlement.
  const inputs = await gatherInputs(
    tenantId, studentId, now,
    existing ? new Date(existing.endDate) : undefined,
  );
  if (!('context' in inputs)) return { outcome: inputs, created: false };

  const planned = await planFrom(inputs, now, tenantId, studentId);
  if ((planned as any).notReady) {
    return {
      outcome: {
        available: false,
        reason: 'PLAN_NOT_READY',
        message: 'We are still preparing your learning plan. Try again in a moment.',
      },
      created: false,
      refused: 'PLAN_NOT_READY',
    };
  }
  const { body } = planned;

  if (existing) {
    existing.status = 'SUPERSEDED';
    existing.supersededAt = now;
    await existing.save();
  }

  try {
    const created = await CareerRoadmap.create({
      ...body,
      tenantId,
      studentId,
      status: 'ACTIVE',
      roadmapVersion: (existing?.roadmapVersion || 0) + 1,
      generatedBy: opts.actor || 'STUDENT',
      generationReason: opts.reason || (existing ? 'REPLAN_REQUESTED' : 'FIRST_PLAN'),
    });

    if (existing) {
      existing.supersededBy = created._id as any;
      await existing.save();
    }

    return {
      outcome: viewOf(created, stalenessOf(created, inputs.context, inputs.readiness.blueprintVersion), now),
      created: true,
    };
  } catch (e: any) {
    // Two requests raced and the index did its job. Whoever lost returns the winner's plan
    // rather than an error — the student asked for a roadmap and there is one.
    if (e?.code === 11000) {
      const winner = await CareerRoadmap.findOne({ tenantId, studentId, status: 'ACTIVE' });
      if (winner) {
        return { outcome: viewOf(winner, stalenessOf(winner, inputs.context), now), created: false };
      }
    }
    // The replacement could not be written, so put the old plan back. Leaving a student with
    // no active plan because a save failed would be the worst outcome of the three.
    if (existing) {
      existing.status = 'ACTIVE';
      existing.supersededAt = undefined;
      await existing.save().catch(() => { /* nothing further to try */ });
    }
    throw e;
  }
}

/** What `ensureCurriculumRoadmap` did, so a caller can log it and a script can count it. */
export type CurriculumRoadmapEnsure =
  /** Already projected from the curriculum. The overwhelmingly common case; nothing was written. */
  | 'ALREADY_CURRICULUM'
  /** There was no plan at all, and one was built from the curriculum. */
  | 'BUILT'
  /** A gap-planner plan was replaced by one the curriculum ordered. */
  | 'UPGRADED'
  /** This student has no curriculum plan, so the gap-derived roadmap is the right answer. */
  | 'NO_CURRICULUM'
  /** It should have been upgraded and could not be. The caller falls back to what exists. */
  | 'COULD_NOT';

/**
 * Make sure the plan this student is shown is the one their curriculum decides.
 *
 * ── WHY THIS EXISTS AT ALL ───────────────────────────────────────────────────
 *
 * Two things can order a roadmap. The gap planner sorts by how far a skill is from its target
 * and breaks ties alphabetically; the curriculum projection follows the fifteen modules the
 * student is actually being taught. The projection replaced the planner — but only for roadmaps
 * generated after it existed, because `generateRoadmap` is idempotent and hands back a plan that
 * already exists untouched.
 *
 * The result was a screen that lied by omission. A student who finished their assessment was
 * given a curriculum plan AND a roadmap built the old way, and the journey rendered the old one:
 * hardware and variables in their plan, blood relations and email practice on their calendar.
 * The only way out was pressing "update my roadmap" — a button that explains nothing, which most
 * students never pressed. Seven of eleven live students were in this state, and five of those
 * had no roadmap at all, so they were shown a pool journey composed from a pathway template that
 * was never their plan in any sense.
 *
 * ── WHY IT IS SAFE TO REBUILD A PLAN WITHOUT BEING ASKED ────────────────────────────
 *
 * This is the only thing in this service that regenerates without being asked. The rule it sits
 * beside protects a student's plan from churning every time their evidence moves; this is not
 * evidence moving, it is a plan that was never built from the thing that is supposed to build it.
 *
 * It is bounded four ways, and each bound is the point rather than mere caution:
 *
 *   · it does nothing unless an ACTIVE curriculum assignment exists — which only happens after
 *     the student sat the assessment, so the plan stays downstream of something they chose to do
 *   · it does nothing to a roadmap that is already projected, so it is a no-op on every load
 *     after the first and cannot churn
 *   · the superseded plan is kept, as every replan keeps it — the record of what somebody was
 *     asked to do in March survives
 *   · a finished programme is refused by generateRoadmap and stays refused here, so nobody is
 *     handed a second ninety days by a page load
 *
 * ── IT IS CHEAP WHEN THERE IS NOTHING TO DO ────────────────────────────────────
 *
 * It runs on the read path, so the settled case costs two lean indexed reads and no write. That
 * matters: this is on every load of the journey screen, and a version that rebuilt anything per
 * request would be both slow and exactly the churn the rule above forbids.
 */
export async function ensureCurriculumRoadmap(
  tenantId: string,
  studentId: string,
  now?: Date,
): Promise<CurriculumRoadmapEnsure> {
  // Not an ObjectId means there is no curriculum plan to find. See curriculumTopicsFor.
  if (!mongoose.Types.ObjectId.isValid(studentId)) return 'NO_CURRICULUM';
  const oid = new mongoose.Types.ObjectId(studentId);

  /**
   * The curriculum plan is checked FIRST, and that order is deliberate.
   *
   * A student with no curriculum assignment is one this whole mechanism has no opinion about —
   * a tenant that does not teach a curriculum, or somebody who has not been assessed yet.
   * Reading their roadmap before establishing that would mean loading a document in order to
   * decide to do nothing with it.
   */
  const hasCurriculum = await StudentCurriculumAssignment.exists({
    tenantId, studentId: oid, status: 'ACTIVE',
  });
  if (!hasCurriculum) return 'NO_CURRICULUM';

  const existing = await CareerRoadmap.findOne({ tenantId, studentId: oid, status: 'ACTIVE' })
    .select('report')
    .lean() as any;
  if (existing?.report?.projectedFromCurriculum === 1) return 'ALREADY_CURRICULUM';

  const result = await generateRoadmap(tenantId, studentId, {
    actor: 'STUDENT',
    // Only a plan that exists is replaced. Passing replan when there is nothing to replan would
    // put a wrong reason in the audit record rather than change what happens.
    replan: !!existing,
    reason: existing ? 'REPLAN_CURRICULUM_ADOPTED' : 'FIRST_PLAN',
    now,
  });

  /**
   * Whether it WORKED is asked of the result, never inferred from the absence of a throw.
   *
   * generateRoadmap refuses for several reasons that are not errors — a finished programme, a
   * curriculum plan a moment away from being ready, readiness that cannot be computed — and each
   * returns an outcome rather than raising. Reporting UPGRADED on any of those would tell a
   * backfill script it had fixed rows it had not touched.
   */
  if (!result.created) return 'COULD_NOT';
  const projected = result.outcome.available
    && (result.outcome.roadmap as any)?.report?.projectedFromCurriculum === 1;
  if (!projected) return 'COULD_NOT';

  return existing ? 'UPGRADED' : 'BUILT';
}

/**
 * Explain a plan the way an admin would need it explained.
 *
 * The capacity arithmetic and the phase split, written out. "Why did Rahul get four weeks of
 * foundations and Priya one?" deserves the workings, not a restatement of the outcome.
 */
export function explainRoadmap(roadmap: ICareerRoadmap): string[] {
  const c = roadmap.capacity;
  const lines = [
    `policy ${roadmap.policyVersion}  ·  window ${roadmap.roadmapDays} days  ·  ${roadmap.weekCount} weeks`,
    `capacity ${roadmap.input.minutesPerDay}min × ${roadmap.input.daysPerWeek}d = ${c.weeklyCapacityMinutes}/week`
      + `  →  plannable ${c.plannableMinutes}  ·  planned ${c.plannedMinutes}`,
    `readiness ${roadmap.input.readiness ?? 'n/a'}  ·  coverage ${roadmap.input.coverage}`
      + `  ·  role confidence ${roadmap.input.roleConfidence}  ·  planning confidence ${roadmap.planningConfidence}`,
  ];

  for (const p of roadmap.phases) {
    lines.push(`${p.key}  weeks ${p.fromWeek}–${p.toWeek}  (days ${p.fromDay}–${p.toDay})  ${p.plannedMinutes} min`);
  }
  for (const [k, v] of Object.entries(roadmap.report || {})) lines.push(`${k} = ${v}`);
  if (roadmap.deferred?.length) {
    lines.push(`deferred (${roadmap.deferred.length}): ${roadmap.deferred.map(d => d.skillKey).join(', ')}`);
  }
  return lines;
}

export { ROADMAP_VERSION };
