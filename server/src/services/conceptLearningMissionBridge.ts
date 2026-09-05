/**
 * conceptLearningMissionBridge — where the journey meets the day's plan.
 *
 * WHY A BRIDGE RATHER THAN CODE INSIDE THE ORCHESTRATOR. `dailyMissionOrchestrator` schedules:
 * it decides which of this week's objectives fit today's minutes and how many missions a day
 * may hold. Curriculum sequencing is a different question with its own policy, its own
 * fallbacks and its own failure modes, and putting it inline would turn a 200-line scheduler
 * into a curriculum engine — which is the thing this design is explicitly trying not to do.
 *
 * So the orchestrator asks one question — "for these skill/workType slots, what should open?" —
 * and this answers it, preferring an authored journey and saying so when it cannot.
 *
 * OFF UNLESS SWITCHED ON, AND SAFE WHEN ON. With the flag off, or with no published unit for
 * a skill, the caller keeps exactly the resource the legacy resolver produced. On the day this
 * ships nothing changes for anybody, because no unit is published yet.
 */
import { resolveNextStep, ResolvedStep, ResolveOutcome } from './conceptLearningResolverService';
import { ResourceMember } from '../models/CareerSkillResource';
import { LearningFallbackReason } from '../data/conceptLearningPolicy';
import { assessmentRouteForSkill, materialRoute, practiceRoute } from '../data/missionOrchestrationPolicy';
import CareerSkillResource from '../models/CareerSkillResource';
import mongoose from 'mongoose';

/** Carried onto the mission so completion can record which step was finished. */
export interface LearningProvenance {
  unitId: string;
  unitVersion: number;
  stepId: string;
  phase: string;
  sequence: number;
  position: { index: number; totalRequired: number; completedRequired: number };
}

export interface BridgeResource {
  type: string; id: string; title: string; route: string; xp?: number | null;
}

export interface BridgeHit {
  slot: string;
  resource?: BridgeResource;
  learning: LearningProvenance;
}

export interface BridgeOutcome {
  bySlot: Map<string, BridgeHit>;
  /** Per slot, why the journey could not serve it. Logged, and counted for admin analytics. */
  fallbacks: Map<string, LearningFallbackReason>;
}

const slotKey = (skillKey: string, workType: string): string =>
  `${String(skillKey).toUpperCase()}:${String(workType).toUpperCase()}`;

/**
 * Turn a step into something the mission card can open.
 *
 * Deliberately mirrors the legacy resolver's routing rather than inventing new destinations:
 * a student should not be able to tell from the URL whether a mission came from a journey or
 * from the old path, and any divergence here would be a second place to fix routing bugs.
 */
async function routeFor(tenantId: string, step: ResolvedStep, skillKey: string): Promise<BridgeResource | undefined> {
  // No resource means the assessment engine owns it — the same shape the orchestrator already
  // builds for ASSESS objectives.
  if (!step.resourceId) {
    if (step.workType === 'ASSESS') {
      return { type: 'assessment', id: `personalized:${skillKey}`, title: step.title, route: assessmentRouteForSkill(skillKey), xp: null };
    }
    return undefined;
  }
  if (!mongoose.isValidObjectId(step.resourceId)) return undefined;

  const r: any = await CareerSkillResource.findOne({ tenantId, _id: step.resourceId, active: true }).lean();
  if (!r) return undefined;

  if (r.resourceType === 'practice' || r.resourceType === 'problem') {
    return { type: 'practice', id: String(r.resourceId), title: step.title || r.title, route: practiceRoute(String(r.resourceId)), xp: typeof r.xp === 'number' ? r.xp : null };
  }
  if (r.resourceType === 'mock_interview') {
    return { type: 'mock_interview', id: String(r._id), title: step.title || r.title || 'Mock interview', route: '/careerpilot/interview', xp: typeof r.xp === 'number' ? r.xp : null };
  }
  const url = String(r.url || '').trim();
  return {
    type: r.resourceType, id: String(r._id), title: step.title || r.title,
    route: url || materialRoute(String(r._id)),
    xp: typeof r.xp === 'number' ? r.xp : null,
  };
}

export interface BridgeInput {
  tenantId: string;
  studentId: string;
  member: ResourceMember;
  scores: Map<string, number>;
  /** The skill/workType pairs this week's objectives actually need. */
  slots: { skillKey: string; workType: string }[];
  enabled: boolean;
}

/**
 * Resolve every slot the week needs, one journey step each.
 *
 * `alreadyChosenUnitIds` is threaded through so a single unit cannot claim more than one of
 * the day's three missions — the roadmap spreads work across two to four skills a week on
 * purpose, and a journey filling the day from below would undo that.
 */
export async function resolveLearningSteps(input: BridgeInput): Promise<BridgeOutcome> {
  const bySlot = new Map<string, BridgeHit>();
  const fallbacks = new Map<string, LearningFallbackReason>();
  if (!input.enabled) {
    for (const s of input.slots) fallbacks.set(slotKey(s.skillKey, s.workType), 'DISABLED');
    return { bySlot, fallbacks };
  }

  const usedUnits = new Set<string>();
  for (const s of input.slots) {
    const slot = slotKey(s.skillKey, s.workType);
    const score = input.scores.has(String(s.skillKey).toUpperCase())
      ? input.scores.get(String(s.skillKey).toUpperCase())! : null;

    const outcome = await resolveNextStep({
      tenantId: input.tenantId, studentId: input.studentId,
      skillKey: s.skillKey, workType: s.workType,
      member: input.member, skillScore: score,
      alreadyChosenUnitIds: usedUnits,
    // The catch is typed: untyped, it widens the union and `step` stops existing on the
    // result. A resolver failure is a fallback, not an outage — the caller keeps whatever the
    // legacy path found for this slot.
    }).catch((): ResolveOutcome => ({ fallback: 'NO_ELIGIBLE_STEP' }));

    if (!outcome.step) { fallbacks.set(slot, outcome.fallback || 'NO_ELIGIBLE_STEP'); continue; }

    const resource = await routeFor(input.tenantId, outcome.step, s.skillKey);
    // A step that resolves to nothing openable is not an improvement on the legacy resolver.
    // Reported as a fallback so the caller keeps whatever the old path found.
    if (!resource) { fallbacks.set(slot, 'RESOURCE_INACTIVE'); continue; }

    usedUnits.add(outcome.step.unitId);
    bySlot.set(slot, {
      slot,
      resource,
      learning: {
        unitId: outcome.step.unitId,
        unitVersion: outcome.step.unitVersion,
        stepId: outcome.step.stepId,
        phase: outcome.step.phase,
        sequence: outcome.step.sequence,
        position: outcome.step.position,
      },
    });
  }
  return { bySlot, fallbacks };
}

/**
 * One structured line per plan build, so production can be asked how much of the bank is
 * actually authored. No student identifiers beyond the id the rest of the logs already carry.
 */
export function logResolution(studentId: string, outcome: BridgeOutcome): void {
  const served = outcome.bySlot.size;
  const reasons: Record<string, number> = {};
  for (const r of outcome.fallbacks.values()) reasons[r] = (reasons[r] || 0) + 1;
  if (!served && !outcome.fallbacks.size) return;
  console.log('[concept-learning] resolution', JSON.stringify({
    studentId, served, fallbacks: outcome.fallbacks.size, reasons,
  }));
}
