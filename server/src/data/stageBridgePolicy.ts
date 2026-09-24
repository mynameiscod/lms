/**
 * Bridging: what a learner is taught when they arrive at a stage without what it assumes.
 *
 * ── THE PROBLEM THIS EXISTS FOR ───────────────────────────────────────────────────────────
 *
 * Year 2 opens on object-oriented programming. That is right for somebody who finished Year 1,
 * and wrong for somebody who did not: a learner measured at 17 on programming fundamentals was
 * being handed "Why Objects, and What They Replace" on day one, which teaches them nothing
 * because they cannot yet write the function an object would hold.
 *
 * Year 2 has a bridge module, B01_BRIDGE, but it is six PRACTICE units and a CHECKPOINT — it
 * CHECKS whether a learner is ready and teaches nothing, so it can never be the answer for a
 * learner who is not. The teaching that would fix the gap exists already, in Year 1.
 *
 * ── HOW IT DECIDES, AND WHY THAT NEEDS NO "RETURNING MEMBER" FLAG ─────────────────────────
 *
 * The rule is the learner's Skill DNA and nothing else. A returning Year-1 member carries a
 * year of evidence on these skills and shows no gap, so they get no bridge and open on OOP. A
 * fresh joiner sat the Year-2 entry test, which measured them low, so they get fundamentals
 * first. The two cases the product cares about fall out of one rule, and no flag can drift out
 * of step with the evidence.
 *
 * ── ONLY MEASURED SKILLS COUNT AS GAPS ───────────────────────────────────────────────────
 *
 * An unmeasured skill is NOT a gap. This matters more than it looks: the entry test measures
 * eight skills, so most of the list below is unmeasured for everybody, and counting silence as
 * weakness would bridge every learner — including the returning member this is designed to let
 * through. Absence of evidence is not evidence of absence, and a plan is the wrong place to
 * guess.
 */

import { StudentProfile } from '../services/curriculumComposerService';

/**
 * Which stage's teaching a stage borrows from when its learner is not ready for it.
 *
 * Foundation has no earlier stage and is absent on purpose: a first-year who knows nothing is
 * exactly who Foundation is written for, so there is nothing to bridge from.
 */
export const BRIDGE_SOURCE_STAGE: Readonly<Record<string, string>> = Object.freeze({
  build: 'foundation',
});

/**
 * What a stage assumes its learner already holds.
 *
 * NOT invented here. Year-2 units declare no prerequisite skills at all — every one of them is
 * empty — so there is nothing to derive this from automatically. It is instead read off what
 * B01_BRIDGE was written to check (programming, functions and strings, problem solving, the
 * developer tools, and SQL), expressed as the skill keys Year 1 actually teaches, so every
 * entry here has real units behind it that a bridge can be composed from.
 *
 * When Year-2 units gain prerequisiteSkillKeys, this should be derived from them instead and
 * this table deleted. It is a stand-in for missing metadata, and it says so.
 */
export const BRIDGE_SKILLS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  build: Object.freeze([
    // "Where Your Programming Actually Stands"
    'PROGRAMMING_FUNDAMENTALS', 'PYTHON_BASICS', 'CONDITIONALS_BASICS', 'LOOPS_BASICS',
    // "Functions, Lists and Strings in Practice"
    'FUNCTIONS_BASICS', 'PYTHON_STRINGS', 'DSA_ARRAYS',
    // "Breaking a Problem Down, Under Time"
    'PROBLEM_SOLVING', 'PSEUDOCODE_FLOWCHARTS',
    // "Git, the Shell and Your Editor"
    'GIT_FUNDAMENTALS', 'SHELL_COMMANDS', 'IDE_PROFICIENCY',
    // "Asking a Database a Question"
    'SQL_BASICS', 'DB_FUNDAMENTALS',
  ]),
});

/**
 * At or above this, the learner holds the skill well enough to be taught the next stage with it.
 *
 * Deliberately not the mastery threshold. This does not ask "have they mastered it", it asks
 * "can the next stage's teaching stand on it", and a learner at 50 can follow a lesson that
 * uses functions even if they would not pass an exam on them.
 */
export const BRIDGE_READY_SCORE = 50;

/** How many learning days one unmet skill is worth. Roughly a week and a half of teaching. */
export const DAYS_PER_BRIDGE_SKILL = 10;

/**
 * The most of a programme that may be spent bridging.
 *
 * A learner who bought Year 2 must still be taught Year 2. Someone weak on every measured skill
 * would otherwise be sold a second-year membership and given a first-year plan, which is a
 * refund and a complaint rather than a personalised journey. At a third, a 110-day plan spends
 * at most 38 days catching up and at least 72 on the year they paid for. Past this, the honest
 * answer is that they should be doing Year 1, and that is a conversation, not a composition.
 */
export const MAX_BRIDGE_SHARE = 1 / 3;

export interface BridgePlan {
  /** The stage the bridging units are taken from. */
  sourceStage: string;
  /** The unmet skills, worst first, which the bridge units must teach. */
  skills: string[];
  /** How many days of the programme the bridge may take. Never the whole thing. */
  days: number;
}

/**
 * What this learner needs before the stage they are entering, or null when they need nothing.
 *
 * Null is the common answer and the one that keeps today's behaviour: a stage with no source
 * stage, a learner with no measured gaps, or a programme too short to spare the days all take
 * the plan exactly as it is composed now.
 */
export function bridgePlanFor(
  profile: StudentProfile,
  stageKey: string | null | undefined,
  programDays: number,
): BridgePlan | null {
  const stage = String(stageKey || '').toLowerCase().trim();
  const sourceStage = BRIDGE_SOURCE_STAGE[stage];
  const required = BRIDGE_SKILLS[stage];
  if (!sourceStage || !required?.length) return null;

  const held = profile?.skills;
  if (!held || typeof held.get !== 'function') return null;

  /*
   * Worst first, so a plan short of days spends them on the biggest gap. Only skills the
   * learner has actually been measured on — see the header.
   */
  const gaps = required
    .map(key => ({ key, score: held.get(key)?.score }))
    .filter((g): g is { key: string; score: number } =>
      typeof g.score === 'number' && g.score < BRIDGE_READY_SCORE)
    .sort((a, b) => a.score - b.score);

  if (!gaps.length) return null;

  const ceiling = Math.floor(programDays * MAX_BRIDGE_SHARE);
  const days = Math.min(gaps.length * DAYS_PER_BRIDGE_SKILL, ceiling);
  if (days < 1) return null;

  return { sourceStage, skills: gaps.map(g => g.key), days };
}
