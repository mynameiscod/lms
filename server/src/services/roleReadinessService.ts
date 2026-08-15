import StudentSkillProfile from '../models/StudentSkillProfile';
import CareerSkill from '../models/CareerSkill';
import { getCareerContext } from './careerContextService';
import { getRoleSkillBlueprint } from './roleSkillBlueprintService';
import { ROLE_NOT_SURE } from './careerDomainService';
import {
  ROLE_READINESS_VERSION, targetScoreFor, classifyGap, skillRatio, priorityScore,
  isSufficientlyAssessed, roleConfidence, STATUS_ORDER, GapStatus, ReadinessUnavailable,
} from '../data/roleReadinessPolicy';

/**
 * How far a student is from the role they are aiming at.
 *
 * Joins Module 4's published blueprint with Module 7's Skill DNA and compares them. It
 * reads and derives; it mutates nothing, and it persists nothing — every input is already
 * stored and the comparison is deterministic, so a saved result would only be a fourth
 * thing to invalidate whenever a score, a role or a blueprint changed.
 *
 * TWO NUMBERS, NEVER ONE. Readiness is how the student performs against what we have
 * measured; coverage is how much of the role we have measured at all. Collapsing them
 * would let "76% ready" mean either a well-evidenced near-miss or three lucky answers, and
 * a student cannot tell those apart from a single figure.
 *
 * UNKNOWN IS NOT ZERO. A required skill with no evidence is excluded from readiness
 * entirely rather than scored 0. Treating it as failure would mean a student who has
 * simply not been asked about Docker looks identical to one who cannot do it.
 *
 * No AI, no randomness, and nothing about degree, year or stage. Those shaped which
 * assessment was generated; they must not manufacture capability.
 */

export interface SkillReadiness {
  skillKey: string;
  skillName: string;
  importance: string;
  weight: number;
  targetLevel: string;
  targetScore: number;

  /** Null when never measured — never 0, which would assert a failure we did not observe. */
  studentScore: number | null;
  skillConfidence: string | null;
  evidenceCount: number;

  /** Points below target, floored at 0. Null when unmeasured. */
  gapPoints: number | null;
  status: GapStatus;
  /** Ordering weight for gaps. 0 for anything that is not a known deficit. */
  priorityScore: number;

  /** True once Module 3 retires the skill; the requirement still shows, flagged. */
  skillInactive: boolean;
  /** Whether this skill counted toward readiness and coverage. */
  countedInReadiness: boolean;
}

export interface RoleReadinessResult {
  available: true;
  policyVersion: string;
  role: { key: string; name: string };
  blueprintVersion: number;
  blueprintUpdatedAt?: Date;

  /** Null when nothing is sufficiently assessed — not 0, which would assert unreadiness. */
  readiness: number | null;
  coverage: number;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';

  summary: {
    requiredSkills: number;
    assessedSkills: number;
    priorityGaps: number;
    needsWork: number;
    onTrack: number;
    strong: number;
    limitedEvidence: number;
    notAssessed: number;
    essentialTotal: number;
    essentialAssessed: number;
  };

  skills: SkillReadiness[];
  /** Ranked, for Module 9 to sequence later. This module does not decide what to learn. */
  topGaps: SkillReadiness[];
  strengths: SkillReadiness[];
  assessmentNeeded: SkillReadiness[];
}

export interface RoleReadinessUnavailable {
  available: false;
  reason: ReadinessUnavailable;
  message: string;
  role?: { key: string; name?: string };
}

export type ReadinessOutcome = RoleReadinessResult | RoleReadinessUnavailable;

/**
 * Calculate readiness for one student against one role.
 *
 * FOUR QUERIES, whatever the blueprint's size: context, blueprint, every relevant skill
 * profile in one batch, and skill metadata in one batch. A lookup per required skill would
 * be thirty round trips for one page.
 */
export async function calculateStudentRoleReadiness(
  tenantId: string,
  studentId: string,
  roleKeyOverride?: string,
): Promise<ReadinessOutcome> {
  const context = await getCareerContext(tenantId, studentId);
  if (!context) return { available: false, reason: 'ROLE_NOT_SELECTED', message: 'Account not found.' };

  // The student's own stored role, unless an admin explicitly asked about another. Never
  // read from a student's request: choosing your own target would let somebody pick the
  // role they already match.
  const roleKey = (roleKeyOverride || context.career.primaryRole || '').toUpperCase();

  if (!roleKey || roleKey === ROLE_NOT_SURE) {
    return {
      available: false, reason: 'ROLE_NOT_SELECTED',
      message: 'Choose a target role to see how your skills compare with it.',
    };
  }

  const blueprint = await getRoleSkillBlueprint(tenantId, roleKey);
  if (!blueprint) {
    return { available: false, reason: 'ROLE_BLUEPRINT_NOT_READY', role: { key: roleKey }, message: 'That role is not configured yet.' };
  }

  // A draft blueprint is somebody's work in progress. Measuring a student against it would
  // report a standard nobody has agreed to, and the number would move when they finished.
  if (!blueprint.published) {
    return {
      available: false, reason: 'ROLE_BLUEPRINT_NOT_READY',
      role: { key: roleKey, name: blueprint.roleName },
      message: 'Readiness analysis is not available for this role yet.',
    };
  }

  const requirements = (blueprint.requirements || []).filter(r => r.active);
  if (!requirements.length) {
    return {
      available: false, reason: 'ROLE_BLUEPRINT_NOT_READY',
      role: { key: roleKey, name: blueprint.roleName },
      message: 'Readiness analysis is not available for this role yet.',
    };
  }

  const skillKeys = requirements.map(r => r.skillKey);
  const [profiles, skillDocs] = await Promise.all([
    StudentSkillProfile.find({ tenantId, studentId, skillKey: { $in: skillKeys } }).lean() as any,
    CareerSkill.find({ key: { $in: skillKeys } }).select('key name active').lean() as any,
  ]);

  const profileByKey = new Map<string, any>((profiles as any[]).map(p => [p.skillKey, p]));
  const skillByKey = new Map<string, any>((skillDocs as any[]).map(s => [s.key, s]));

  const skills: SkillReadiness[] = requirements.map(req => {
    const profile = profileByKey.get(req.skillKey);
    const skill = skillByKey.get(req.skillKey);
    const targetScore = targetScoreFor(req.targetLevel);

    const studentScore = profile ? profile.score : null;
    const confidence = profile ? profile.confidence : null;
    const status = classifyGap({ studentScore, targetScore, confidence });
    const counted = isSufficientlyAssessed(confidence);

    return {
      skillKey: req.skillKey,
      skillName: skill?.name || req.skillName || req.skillKey.replace(/_/g, ' '),
      importance: req.importance,
      weight: req.weight,
      targetLevel: req.targetLevel,
      targetScore,
      studentScore,
      skillConfidence: confidence,
      evidenceCount: profile?.evidenceCount || 0,
      // Only a measured shortfall is a gap. An unmeasured skill has no gap, because we
      // have not established one.
      gapPoints: studentScore !== null ? Math.max(0, targetScore - studentScore) : null,
      status,
      priorityScore: counted && studentScore !== null
        ? priorityScore({ studentScore, targetScore, weight: req.weight, importance: req.importance })
        : 0,
      skillInactive: skill ? skill.active === false : true,
      countedInReadiness: counted,
    };
  });

  // ── the two figures ──
  const counted = skills.filter(s => s.countedInReadiness && s.studentScore !== null);
  const countedWeight = counted.reduce((n, s) => n + s.weight, 0);
  const totalWeight = skills.reduce((n, s) => n + s.weight, 0);

  const readiness = countedWeight > 0
    ? Math.round(
        (counted.reduce((n, s) => n + skillRatio(s.studentScore!, s.targetScore) * s.weight, 0) / countedWeight) * 100,
      )
    // Nothing sufficiently measured. Null rather than 0 — we have not established that the
    // student is unready, only that we have not looked.
    : null;

  const coverage = totalWeight > 0 ? Math.round((countedWeight / totalWeight) * 100) : 0;

  const essentialTotal = skills.filter(s => s.importance === 'ESSENTIAL').length;
  const essentialAssessed = skills.filter(s => s.importance === 'ESSENTIAL' && s.countedInReadiness).length;

  const confidence = roleConfidence({ coveragePercent: coverage, essentialTotal, essentialAssessed });

  // Most actionable first. Alphabetical order would bury the thing a student most needs
  // to see beneath a list of what is already fine.
  const sorted = skills.slice().sort((a, b) =>
    STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
    || b.priorityScore - a.priorityScore
    || b.weight - a.weight
    || a.skillName.localeCompare(b.skillName));

  const count = (s: GapStatus) => skills.filter(x => x.status === s).length;

  return {
    available: true,
    policyVersion: ROLE_READINESS_VERSION,
    role: { key: roleKey, name: blueprint.roleName },
    blueprintVersion: blueprint.version,
    blueprintUpdatedAt: blueprint.updatedAt,

    readiness, coverage, confidence,

    summary: {
      requiredSkills: skills.length,
      assessedSkills: counted.length,
      priorityGaps: count('PRIORITY_GAP'),
      needsWork: count('NEEDS_WORK'),
      onTrack: count('ON_TRACK'),
      strong: count('STRONG'),
      limitedEvidence: count('LIMITED_EVIDENCE'),
      notAssessed: count('NOT_ASSESSED'),
      essentialTotal, essentialAssessed,
    },

    skills: sorted,
    // Known deficits, ranked. Not tasks — what to do about them is Module 9's decision.
    topGaps: sorted.filter(s => s.status === 'PRIORITY_GAP' || s.status === 'NEEDS_WORK').slice(0, 5),
    strengths: sorted.filter(s => s.status === 'STRONG' || s.status === 'ON_TRACK').slice(0, 5),
    // Deliberately separate from gaps: these are unknowns, not weaknesses.
    assessmentNeeded: sorted.filter(s => s.status === 'NOT_ASSESSED' || s.status === 'LIMITED_EVIDENCE'),
  };
}

/**
 * The arithmetic behind a readiness figure, for admin inspection.
 *
 * "Why is Rahul 68%?" deserves the same rows the formula saw, not a restatement of the
 * number. Nothing here is generated — it is the calculation, written out.
 */
export function explainReadiness(result: RoleReadinessResult): string[] {
  const counted = result.skills.filter(s => s.countedInReadiness && s.studentScore !== null);
  const lines = counted.map(s =>
    `${s.skillKey}  ${s.studentScore}/${s.targetScore}  ratio ${skillRatio(s.studentScore!, s.targetScore).toFixed(2)}  × weight ${s.weight}`);

  const totalWeight = counted.reduce((n, s) => n + s.weight, 0);
  lines.push(`— Σ(ratio × weight) ÷ ${totalWeight} × 100 = ${result.readiness ?? 'n/a'}`);

  const excluded = result.skills.filter(s => !s.countedInReadiness);
  if (excluded.length) {
    lines.push(`excluded from readiness (${excluded.length}): ${excluded.map(s => `${s.skillKey} [${s.status}]`).join(', ')}`);
  }
  lines.push(`coverage = ${totalWeight} ÷ ${result.skills.reduce((n, s) => n + s.weight, 0)} × 100 = ${result.coverage}`);
  return lines;
}
