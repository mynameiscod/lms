import PassportConfig from '../models/PassportConfig';
import CareerRoadmap from '../models/CareerRoadmap';
import PersonalizedAssessment from '../models/PersonalizedAssessment';
import { getCareerContext } from './careerContextService';
import { calculateStudentRoleReadiness, RoleReadinessResult } from './roleReadinessService';
import { stalenessOf } from './careerRoadmapService';
import {
  resolveReassessmentConfig, materialChanges, recommendationFrom,
  ReplanRecommendation, SkillDelta,
} from '../data/reassessmentPolicy';

/**
 * Whether the plan a student is following is still the right one.
 *
 * IT RECOMMENDS; IT NEVER ACTS. This is the rule the whole module turns on. New evidence may
 * change what we know about somebody within seconds of them finishing a check-in — and it
 * must not change what they were asked to do this morning. A plan that rewrites itself is
 * not a plan, and a student who finds different work each time they open the app stops
 * trusting any of it.
 *
 * STRUCTURAL REASONS ARE MODULE 9'S, UNCHANGED. Role changed, blueprint republished,
 * commitment changed — those were already detected and are read here as given. This module
 * adds one thing Module 9 could not know: whether the student's SKILLS have moved enough
 * that the remaining days would be better spent differently.
 *
 * NO SECOND GAP FORMULA. Every score, status and target comes from Modules 7 and 8.
 */

export interface ReplanStatus {
  recommendation: ReplanRecommendation;
  /** Module 9's structural reasons, verbatim. */
  structuralReasons: string[];
  /** Skills whose movement is material, with the reasons they qualify. */
  affectedSkills: SkillDelta[];
  currentReadiness: number | null;
  /** Readiness as it was when the current roadmap was built. */
  roadmapBaselineReadiness: number | null;
  readinessDelta: number | null;
  hasActiveRoadmap: boolean;
  /** True once the plan's window has passed — completion is not a reason to replan. */
  roadmapCompleted: boolean;
  message: string;
}

const daysElapsed = (from: Date, to: Date): number =>
  Math.floor((Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate())
    - Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())) / 86400000) + 1;

/**
 * Compare two pictures of the same student.
 *
 * Works from the snapshots a check-in froze, so the answer is stable forever: a later
 * check-in that moves SQL again cannot rewrite what this one reported.
 */
export function compareSnapshots(
  before: any, after: any, threshold: number,
): SkillDelta[] {
  if (!before || !after) return [];

  const beforeBy = new Map<string, any>((before.skills || []).map((s: any) => [s.skillKey, s]));

  return (after.skills || []).map((a: any) => {
    const b = beforeBy.get(a.skillKey);
    const beforeScore = b ? b.score : null;
    const afterScore = a.score;

    const materialReasons = materialChanges({
      before: beforeScore,
      after: afterScore,
      beforeStatus: b ? b.status : null,
      afterStatus: a.status,
      targetScore: a.targetScore,
    }, threshold);

    return {
      skillKey: a.skillKey,
      skillName: a.skillName,
      before: beforeScore,
      after: afterScore,
      // Null rather than a fabricated zero when one side was never measured — an unknown
      // becoming known is not a delta, it is new information.
      delta: beforeScore !== null && afterScore !== null ? afterScore - beforeScore : null,
      beforeStatus: b ? b.status : null,
      afterStatus: a.status,
      materialReasons,
    };
  });
}

/**
 * Should this student's roadmap change?
 *
 * Reads the most recent completed check-in for the comparison, and current authoritative
 * state for everything else. Deliberately re-derived on every call: a preview the student
 * saw ten minutes ago is informational, and the decision has to be made against what is true
 * when they act on it.
 */
export async function evaluateRoadmapReplanNeed(
  tenantId: string, studentId: string, now: Date = new Date(),
): Promise<ReplanStatus> {
  const cfgDoc: any = await PassportConfig.findOne({ tenantId }).lean();
  const cfg = resolveReassessmentConfig(cfgDoc?.reassessment);

  const [roadmap, context, readiness, lastCheckIn] = await Promise.all([
    CareerRoadmap.findOne({ tenantId, studentId, status: 'ACTIVE' }).lean() as any,
    getCareerContext(tenantId, studentId, now),
    calculateStudentRoleReadiness(tenantId, studentId),
    PersonalizedAssessment.findOne({
      tenantId, studentId, status: 'SUBMITTED', purpose: 'REASSESSMENT',
      afterSnapshot: { $exists: true },
    }).sort({ submittedAt: -1 }).lean() as any,
  ]);

  const currentReadiness = readiness.available ? (readiness as RoleReadinessResult).readiness : null;

  if (!roadmap) {
    return {
      recommendation: 'NONE', structuralReasons: [], affectedSkills: [],
      currentReadiness, roadmapBaselineReadiness: null, readinessDelta: null,
      hasActiveRoadmap: false, roadmapCompleted: false,
      message: 'You do not have an active roadmap yet.',
    };
  }

  // A finished plan is finished. Continuing to suggest a replan because skills improved
  // would nag somebody about a programme they have already completed — renewal is a
  // different decision, and a later module's.
  const completed = daysElapsed(new Date(roadmap.startDate), now) > roadmap.roadmapDays;
  if (completed) {
    return {
      recommendation: 'NONE', structuralReasons: [], affectedSkills: [],
      currentReadiness,
      roadmapBaselineReadiness: roadmap.input?.readiness ?? null,
      readinessDelta: null,
      hasActiveRoadmap: true, roadmapCompleted: true,
      message: 'This 90-day plan has finished.',
    };
  }

  // Module 9's own detection, used as given. A changed role outranks any amount of skill
  // movement: the plan is aimed at something the student is no longer pursuing.
  const structuralReasons = stalenessOf(
    roadmap as any,
    context,
    readiness.available ? (readiness as RoleReadinessResult).blueprintVersion : undefined,
  );

  const affectedSkills = compareSnapshots(
    lastCheckIn?.beforeSnapshot, lastCheckIn?.afterSnapshot, cfg.materialChangeThreshold,
  ).filter(d => d.materialReasons.length > 0);

  const baseline = roadmap.input?.readiness ?? null;
  const readinessDelta = baseline !== null && currentReadiness !== null
    ? currentReadiness - baseline
    : null;

  const recommendation = recommendationFrom({
    structuralReasons,
    materialSkills: affectedSkills.length,
    readinessDelta,
    threshold: cfg.materialChangeThreshold,
  });

  return {
    recommendation,
    structuralReasons,
    affectedSkills,
    currentReadiness,
    roadmapBaselineReadiness: baseline,
    readinessDelta,
    hasActiveRoadmap: true,
    roadmapCompleted: false,
    message: messageFor(recommendation, structuralReasons, affectedSkills.length),
  };
}

function messageFor(rec: ReplanRecommendation, structural: string[], materialCount: number): string {
  if (rec === 'REQUIRED') {
    return structural.includes('ROLE_CHANGED')
      ? 'You are aiming at a different role now, so your plan needs rebuilding.'
      : 'Your role’s requirements have changed, so your plan needs rebuilding.';
  }
  if (rec === 'SUGGESTED') {
    return materialCount > 0
      ? 'Your skills have changed enough that your roadmap can be improved.'
      : 'Your readiness has moved enough that your roadmap can be improved.';
  }
  return 'Your roadmap still matches where you are. Keep going.';
}

/**
 * The comparison a student sees after a check-in.
 *
 * Read straight from that sitting's frozen snapshots, so history is immutable: August's
 * check-in reports what August found, whatever has happened since.
 */
export async function getReassessmentResult(
  tenantId: string, studentId: string, attemptId: string,
): Promise<{
  ok: boolean;
  skills?: SkillDelta[];
  readinessBefore?: number | null;
  readinessAfter?: number | null;
  readinessDelta?: number | null;
  targetSkillKeys?: string[];
  completedAt?: Date;
} | null> {
  const cfgDoc: any = await PassportConfig.findOne({ tenantId }).lean();
  const cfg = resolveReassessmentConfig(cfgDoc?.reassessment);

  const attempt: any = await PersonalizedAssessment
    .findOne({ _id: attemptId, tenantId, studentId }).lean();
  if (!attempt || attempt.purpose !== 'REASSESSMENT') return null;

  const before = attempt.beforeSnapshot;
  const after = attempt.afterSnapshot;
  if (!before || !after) return { ok: false };

  const readinessBefore = before.readiness ?? null;
  const readinessAfter = after.readiness ?? null;

  return {
    ok: true,
    // Only the skills this check-in actually looked at. Reporting movement on something it
    // never asked about would be attributing somebody else's evidence to this sitting.
    skills: compareSnapshots(before, after, cfg.materialChangeThreshold)
      .filter(d => (attempt.targetSkillKeys || []).includes(d.skillKey) || d.delta !== null),
    readinessBefore,
    readinessAfter,
    readinessDelta: readinessBefore !== null && readinessAfter !== null
      ? readinessAfter - readinessBefore
      : null,
    targetSkillKeys: attempt.targetSkillKeys || [],
    completedAt: attempt.submittedAt,
  };
}
