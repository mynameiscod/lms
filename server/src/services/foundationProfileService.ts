/**
 * Turning what is KNOWN about a student into the profile the composer plans from.
 *
 * ── THE ONE RULE EVERYTHING HERE EXISTS TO PROTECT ────────────────────────────────────────
 *
 * NOT ASSESSED IS NOT WEAK. A student who has never been asked about databases has not scored
 * zero at databases; nobody has asked them. The composer already encodes this correctly — a
 * skill ABSENT from the map means NOT_EXPOSED, which is a different state from
 * FOUNDATION_REQUIRED and leads to a different plan — and the only way to break it is here, by
 * helpfully filling in a zero for every skill the student has no evidence for.
 *
 * So this service never invents a row. Skill DNA holds a profile per skill the student has
 * actually produced evidence for; every other skill in the registry is simply left out, and
 * the composer reads that absence as "never met" rather than "failed".
 *
 * ── VERIFIED IS NOT REMOVED ───────────────────────────────────────────────────────────────
 *
 * A mastered skill stays in the map with its score. What changes is what the student is given
 * for it: suitability stops offering instruction and starts offering application, and the
 * ranking pushes it behind unmet material. Dropping the skill would make it indistinguishable
 * from one never measured, and the student would be re-taught what they had proved.
 *
 * ── A SCHEDULING PROJECTION IS NOT EVIDENCE ───────────────────────────────────────────────
 *
 * Nothing in this file reads a DayPlan, a completed activity or a composer output. The profile
 * is built from SkillEvidence via Skill DNA and from the student's own direction choice, full
 * stop. The composer's `scheduledAt` — the state a unit was scheduled at, which may have come
 * from the plan's own teaching — must never travel back into a skill profile, and the way to
 * guarantee that is for the path to not exist.
 */

import { getSkillDna } from './skillDnaService';
import { stateForScore } from '../data/adaptiveCurriculumPolicy';
import { StudentProfile, SkillBelief } from './curriculumComposerService';
import {
  DirectionStatus, DIRECTION_KEYS, explorationDirections, MAX_EXPLORATION_DIRECTIONS,
  isDirectionKey,
} from '../data/careerDirectionPolicy';

export interface DirectionChoice {
  /** What the student picked, if anything. Never inferred from their scores. */
  primaryDirection?: string | null;
  status?: DirectionStatus;
  /** Directions an EXPLORING student is sampling. Defaulted when they have not narrowed it. */
  exploring?: string[];
}

export interface ProfileSummary {
  /** Skills with real evidence. Never the size of the registry. */
  measured: number;
  /** Skills at VERIFIED. Kept in the profile, never dropped. */
  verified: number;
  primaryDirection: string | null;
  directionStatus: DirectionStatus;
  exploring: string[];
}

/**
 * Resolve the direction stance, without ever inferring a choice from scores.
 *
 * A student who scored well at web has not chosen web. Reading a direction out of their
 * results would silently narrow a first-year's curriculum on the strength of one assessment,
 * which is exactly the decision the direction question exists to leave with them.
 *
 * UNDECIDED keeps cross-direction exploration: the composer samples several areas so somebody
 * who does not know yet meets enough to find out. That is the point of the state, and it is why
 * an undecided student is given exploration breadth rather than an arbitrary default direction.
 */
export function resolveStance(choice: DirectionChoice = {}): {
  primaryDirection: string | null;
  directionStatus: DirectionStatus;
  exploring: string[];
} {
  const picked = choice.primaryDirection && isDirectionKey(String(choice.primaryDirection).toUpperCase())
    ? String(choice.primaryDirection).toUpperCase()
    : null;

  const status: DirectionStatus = choice.status
    || (picked ? 'SELECTED' : 'UNDECIDED');

  if (status === 'SELECTED' && picked) {
    return { primaryDirection: picked, directionStatus: 'SELECTED', exploring: [] };
  }

  /**
   * Sampling set for anybody who has not settled.
   *
   * An explicit list is honoured; otherwise the shipped exploration set is used, so an
   * undecided student still gets breadth rather than nothing.
   */
  const named = (choice.exploring || [])
    .map(d => String(d).toUpperCase())
    .filter(d => (DIRECTION_KEYS as string[]).includes(d));

  const exploring = named.length
    ? named.slice(0, MAX_EXPLORATION_DIRECTIONS)
    : explorationDirections().map(d => d.key);

  return {
    primaryDirection: status === 'EXPLORING' ? picked : null,
    directionStatus: status === 'EXPLORING' ? 'EXPLORING' : 'UNDECIDED',
    exploring,
  };
}

/**
 * Build the composer's view of one student.
 *
 * The skills map contains exactly the skills Skill DNA holds evidence for. No padding, no
 * defaults, no zero-filling — see the header for why that restraint is the whole point.
 */
export async function buildFoundationProfile(
  tenantId: string,
  studentId: string,
  choice: DirectionChoice = {},
): Promise<{ profile: StudentProfile; summary: ProfileSummary }> {
  const dna = await getSkillDna(tenantId, studentId);
  const stance = resolveStance(choice);

  const skills = new Map<string, SkillBelief>();
  let verified = 0;

  for (const row of dna) {
    /**
     * A retired skill's history is kept but it is not planned against.
     *
     * Skill DNA reports `skillActive: false` for a skill the registry has retired. Teaching
     * towards something the platform has stopped measuring wastes a day of a ninety-day
     * programme, and the evidence itself is never deleted — it simply stops steering.
     */
    if (!row.skillActive) continue;

    skills.set(row.skillKey, {
      score: typeof row.score === 'number' ? row.score : null,
      confidence: (row.confidence as any) || null,
    });

    /**
     * Counted through the canonical band function, never a restated threshold.
     *
     * `score >= 80` would be wrong twice: it ignores confidence, so a thinly-evidenced 90 would
     * be called mastery when the policy deliberately caps it at STANDARD, and it swallows
     * REVISION. SCORE_BANDS says in as many words that boundaries are stated once — restating
     * one here is how two screens start disagreeing about who has mastered what.
     *
     * Reporting only. VERIFIED skills stay in the map exactly like any other.
     */
    if (stateForScore({ score: row.score, confidence: (row.confidence as any) || null }) === 'VERIFIED') {
      verified++;
    }
  }

  const profile: StudentProfile = {
    skills,
    primaryDirection: stance.primaryDirection,
    directionStatus: stance.directionStatus,
    explorationDirections: stance.exploring,
  };

  return {
    profile,
    summary: {
      measured: skills.size,
      verified,
      primaryDirection: stance.primaryDirection,
      directionStatus: stance.directionStatus,
      exploring: stance.exploring,
    },
  };
}

/**
 * Self-reported prior experience, folded in WITHOUT granting mastery.
 *
 * "I have written Python before" is useful and is not evidence. It changes how a student should
 * be VERIFIED — a diagnostic worth offering rather than a foundation lesson worth forcing — and
 * it must never become a score, because a score is a claim the platform makes on the student's
 * behalf and can be asked to defend.
 *
 * So a claimed skill with no evidence is recorded with `score: null`, which the composer reads
 * identically to absence — NOT_EXPOSED. The claim survives in the returned list so a caller can
 * offer a diagnostic; it never reaches the plan as ability.
 */
export function applySelfReport(
  profile: StudentProfile,
  claimed: string[] = [],
): { profile: StudentProfile; diagnosticSuggested: string[] } {
  const suggested: string[] = [];

  for (const raw of claimed) {
    const key = String(raw).toUpperCase().trim();
    if (!key) continue;

    const existing = profile.skills.get(key);
    // Real evidence always wins. A claim cannot overwrite a measurement in either direction.
    if (existing && existing.score !== null && existing.score !== undefined) continue;

    suggested.push(key);
  }

  return { profile, diagnosticSuggested: suggested };
}
