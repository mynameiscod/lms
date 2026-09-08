import { EvidenceDifficulty } from '../services/skillEvidenceSourceRegistry';

/**
 * How a personalised assessment is shaped for each career stage.
 *
 * Configuration, deliberately in one file. The alternative — `if (stage === 'foundation'
 * && role === 'backend')` scattered across services — is how two students at the same
 * stage end up assessed differently because one code path was updated and another was not.
 * Everything the generator decides about SHAPE comes from here.
 *
 * SHAPE IS FIXED, CONTENT VARIES. This is the fairness contract: two students at the same
 * stage aiming at the same role get the same number of slots, the same skills, the same
 * difficulty spread and the same maximum score. Only WHICH question fills each slot
 * differs. Vary the shape as well and their two scores stop being comparable, which is
 * worse than giving them identical papers.
 *
 * STAGE DECIDES DEPTH, ROLE DECIDES SUBJECT. A first-year and a final-year aiming at the
 * same role are asked about different things at different depths; a role blueprint alone
 * would hand a first-year the destination and call them unready for not having arrived.
 */

export interface DifficultyMix {
  EASY: number;
  MEDIUM: number;
  HARD: number;
}

export interface AssessmentPolicy {
  key: string;
  stage: string;
  label: string;
  version: number;

  /** Slots drawn from canonical skills via Module 5 evidence. */
  skillSlots: number;

  /**
   * How many DISTINCT skills to assess. Fewer skills with more questions each measures
   * something; twenty skills with one question each measures almost nothing, because a
   * single answer cannot separate knowing a topic from guessing.
   */
  maxSkills: number;
  minItemsPerSkill: number;
  maxItemsPerSkill: number;

  /** Proportions, normalised at build time — they need not total exactly 1. */
  difficultyMix: DifficultyMix;

  /**
   * How far to walk back from a role's destination skills into their prerequisites.
   *
   * A foundation student aiming at Backend Engineer should be asked about HTTP and
   * programming, not REST API design. Depth is capped because the graph is connected
   * enough that an unbounded walk would reach most of the taxonomy and assess nothing
   * in particular.
   */
  prerequisiteDepth: number;
  /**
   * Ask about the ground floor first, rather than the destination.
   *
   * SEPARATE FROM prerequisiteDepth ON PURPOSE. This used to be inferred as
   * `prerequisiteDepth > 0`, which quietly tied two unrelated ideas together: turning off
   * prerequisite expansion at foundation also REVERSED the difficulty preference, so a
   * first-year's paper filled up with the hardest skills in scope — operating systems,
   * networking, the DOM — before anything asked them about a loop. One flag cannot mean both
   * "how far to walk the graph" and "which end of the ladder to start at".
   *
   * OPTIONAL, and absent means the old derivation. Making it required would have meant every
   * policy object anywhere — including the partial ones tests construct — silently flipping to
   * "hardest first" the moment it was omitted, which is precisely the trap this field exists to
   * remove. A caller that has an opinion states it; one that does not keeps the old behaviour.
   */
  preferFoundationalSkills?: boolean;

  /**
   * Skill difficulty bands this stage will assess at all. A foundation paper containing an
   * ADVANCED skill is not a hard paper, it is an unfair one.
   */
  allowedSkillDifficulty: string[];

  /**
   * Adjacent difficulty a slot may fall back to when the exact band has no evidence.
   * Reported when used — a silent substitution changes what the score means.
   */
  allowDifficultyFallback: boolean;

  /**
   * Minutes allowed, or 0 for untimed.
   *
   * Not set on any shipped policy: a diagnostic is meant to measure what somebody knows,
   * and a clock measures how fast they are as well. Available for tenants that want one.
   */
  timeLimitMinutes?: number;
}

const mix = (EASY: number, MEDIUM: number, HARD: number): DifficultyMix => ({ EASY, MEDIUM, HARD });

export const ASSESSMENT_POLICIES: AssessmentPolicy[] = [
  {
    key: 'FOUNDATION_V1', stage: 'foundation', label: 'Foundation diagnostic', version: 2,
    /**
     * EIGHT SKILLS, TWO ITEMS EACH.
     *
     * Was six skills with up to four items apiece, which asked one skill for more questions
     * than the thinner foundation pools hold — PROGRAMMING_FUNDAMENTALS carries thirteen, and a
     * paper wanting four of a particular difficulty from it came up short and refused the whole
     * assessment. Sixteen items over eight skills asks two of each, which every foundation
     * skill can supply, and measures a third more of the curriculum for the same length of
     * paper. Capped at two so no skill can be over-drawn again.
     */
    skillSlots: 16, maxSkills: 8, minItemsPerSkill: 2, maxItemsPerSkill: 2,
    // Weighted easy: this is a first measurement of someone who has recently started, and
    // a paper they cannot attempt tells us only that it was too hard.
    difficultyMix: mix(0.6, 0.35, 0.05),
    /**
     * The walk-back stays at two for the ROLE path, and is turned off for the stage-set path.
     *
     * A first-year aiming at Backend Engineer must be asked about HTTP and programming, not
     * REST API design — a blueprint names the destination, and asking about it measures how far
     * they have to go rather than where they are. That expansion is the whole reason a role can
     * be assessed at an early stage at all.
     *
     * A stage skill set needs none of it: it is authored from the curriculum, so it already
     * contains the right skills in the right order, and expanding it reached past the syllabus
     * and admitted things a first-year is never taught. The override therefore lives with the
     * stage-set branch of the resolver, where that distinction is known — not here, where the
     * policy cannot tell the two paths apart.
     */
    prerequisiteDepth: 2,
    /**
     * INTERMEDIATE admitted alongside FOUNDATION.
     *
     * Eight of the curriculum's thirty-four skills are graded INTERMEDIATE in the taxonomy —
     * operating systems, networking, the DOM, git branching, technical explanation. Restricting
     * the paper to FOUNDATION silently excluded all eight from measurement while the curriculum
     * carried on teaching them, so their scores could never move off "not yet exposed".
     *
     * The taxonomy's grading is about the SKILL's inherent depth; what a first-year should be
     * asked is a property of the stage set, and that is now authored from the curriculum.
     */
    allowedSkillDifficulty: ['FOUNDATION', 'INTERMEDIATE'],
    allowDifficultyFallback: true,
  },
  {
    key: 'BUILD_V1', stage: 'build', label: 'Build-stage diagnostic', version: 1,
    skillSlots: 20, maxSkills: 8, minItemsPerSkill: 2, maxItemsPerSkill: 4,
    difficultyMix: mix(0.35, 0.5, 0.15),
    prerequisiteDepth: 1,
    preferFoundationalSkills: true,
    allowedSkillDifficulty: ['FOUNDATION', 'INTERMEDIATE'],
    allowDifficultyFallback: true,
  },
  {
    key: 'PLACEMENT_V1', stage: 'placement', label: 'Placement readiness', version: 1,
    skillSlots: 24, maxSkills: 10, minItemsPerSkill: 2, maxItemsPerSkill: 3,
    difficultyMix: mix(0.2, 0.5, 0.3),
    // At placement the role's own destination skills are the point; walking back into
    // prerequisites would test what they were asked two years ago.
    prerequisiteDepth: 0,
    preferFoundationalSkills: false,
    allowedSkillDifficulty: ['FOUNDATION', 'INTERMEDIATE', 'ADVANCED'],
    allowDifficultyFallback: true,
  },
  {
    key: 'JOB_SEEKER_V1', stage: 'job_seeker', label: 'Job-seeker readiness', version: 1,
    skillSlots: 24, maxSkills: 10, minItemsPerSkill: 2, maxItemsPerSkill: 3,
    difficultyMix: mix(0.15, 0.5, 0.35),
    prerequisiteDepth: 0,
    preferFoundationalSkills: false,
    allowedSkillDifficulty: ['FOUNDATION', 'INTERMEDIATE', 'ADVANCED'],
    allowDifficultyFallback: true,
  },
];

/**
 * The scope for a member who has not chosen a role.
 *
 * NOT_SURE is a real answer, not a missing one, so it gets a real assessment rather than a
 * refusal — a broad software-engineering diagnostic covering what every path needs. No
 * role is inferred and none is assigned: recommending one is a later module's job, and
 * guessing here would quietly commit somebody who deliberately said they had not decided.
 *
 * These keys are ordinary canonical skills; the generator drops any that are missing,
 * inactive or unmapped rather than failing, because this list is a preference over a
 * catalogue nobody has promised to keep.
 */
export const DISCOVERY_SKILL_SCOPE: string[] = [
  'PROGRAMMING_FUNDAMENTALS',
  'PROBLEM_SOLVING',
  'OOP_CONCEPTS',
  'DSA_COMPLEXITY',
  'DSA_ARRAYS',
  'DB_FUNDAMENTALS',
  'SQL_BASICS',
  'HTML',
  'HTTP',
  'GIT_FUNDAMENTALS',
  'DEBUGGING',
  'COMMUNICATION',
];

export const policyForStage = (stage?: string | null): AssessmentPolicy =>
  ASSESSMENT_POLICIES.find(p => p.stage === stage) || ASSESSMENT_POLICIES[0];

/**
 * Slots per difficulty band, summing to exactly the policy's total.
 *
 * Largest-remainder, so rounding never loses or gains a slot: a paper one question short
 * of its own specification would make two students' totals incomparable, which is the one
 * thing this whole design exists to prevent.
 */
export function difficultyQuota(total: number, m: DifficultyMix): Record<EvidenceDifficulty, number> {
  const bands: EvidenceDifficulty[] = ['EASY', 'MEDIUM', 'HARD'];
  const sum = m.EASY + m.MEDIUM + m.HARD || 1;
  const exact = bands.map(b => (total * m[b]) / sum);
  const base = exact.map(Math.floor);
  let left = total - base.reduce((a, b) => a + b, 0);

  const order = bands
    .map((b, i) => ({ i, frac: exact[i] - base[i] }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);

  for (const { i } of order) {
    if (left <= 0) break;
    base[i]++; left--;
  }

  return { EASY: base[0], MEDIUM: base[1], HARD: base[2] };
}
