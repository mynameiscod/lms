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
import { densityFor, unitsForDays, LearningDensity } from './learningDensityPolicy';

/**
 * Which stage's teaching a stage borrows from when its learner is not ready for it.
 *
 * Foundation has no earlier stage and is absent on purpose: a first-year who knows nothing is
 * exactly who Foundation is written for, so there is nothing to bridge from.
 */
export const BRIDGE_SOURCE_STAGE: Readonly<Record<string, readonly string[]>> = Object.freeze({
  build: Object.freeze(['foundation']),
  /*
   * YEAR 3 BORROWS FROM BOTH YEARS BEHIND IT, NEAREST FIRST.
   *
   * A fresh third-year may have done neither Year 1 nor Year 2, and the two gaps are not the
   * same shape: missing OOP is a Year-2 gap, missing loops is a Year-1 one. A single source
   * could only ever serve one of them, so a third-year who could not write a loop would have
   * been handed Year-2 objects as their remediation.
   *
   * Ordered nearest first because that is the order a bridge should spend its days in: bring
   * somebody up to the year immediately before this one, and only reach further back for what
   * that year itself stands on. The candidate pools are concatenated in this order, so when
   * there are not enough days the nearer year wins.
   */
  specialize: Object.freeze(['build', 'foundation']),
  /*
   * ── AND WHY PLACEMENT IS STILL ABSENT ──────────────────────────────────────────────────
   *
   * Year 4 carries its own ten-day bridge (P02), authored for a fourth-year rather than borrowed,
   * and it covers the same ladder this table would: programming, control flow, functions,
   * collections, objects, DSA, databases and the web.
   *
   * Adding a cross-stage bridge on top of it was tried and measured, and it double-bridged. A
   * fourth-year measured weak across the board came back with 282 units of Year 1, 2 and 3 and
   * ZERO of Year 4 — no specialization, no mocks, no simulation, no capstone — where P02 alone
   * had given them the bridge AND the whole terminal half of the year. Two bridges for one gap
   * is not twice the help; it is the year they paid for, spent on the years they did not.
   *
   * REVISION is a different question and Year 4 IS in that table — see stageRevisionPolicy.
   */
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

  /*
   * ── WHAT YEAR 3 ASSUMES ─────────────────────────────────────────────────────────────────
   *
   * Read off S01_READINESS, which is the module written to check exactly this, so the list and
   * the teaching cannot drift apart — the same arrangement T2_BRIDGE now has for Year 2.
   *
   * It is deliberately NOT Year 2's fourteen plus Year 3's own. A third-year is assumed to be
   * able to program; what Year 3 stands on is the ENGINEERING layer Year 2 teaches — objects,
   * data structures, algorithms, databases, the web, testing, version control. The Year-1
   * fundamentals reach a student through the ladder rather than through this list: the bridge
   * pulls in each gap topic's predecessors, and for a Year-2 topic those run back into Year 1.
   * Listing both years here would double-count the ones Year 2 already covers.
   */
  specialize: Object.freeze([
    // Programming that has grown past a script
    'OOP_CONCEPTS', 'CLEAN_CODE', 'DEBUGGING',
    // The data structures and algorithms everything in Year 3 is built on
    'DSA_ARRAYS', 'DSA_COMPLEXITY', 'DSA_RECURSION', 'DSA_HASHING',
    // Storing and asking for data
    'DB_DESIGN', 'SQL_JOINS',
    // The web, which most directions sit on
    'HTTP', 'REST_APIS',
    // Working like an engineer rather than a student
    'TESTING_FUNDAMENTALS', 'GIT_BRANCHING', 'PROBLEM_SOLVING',
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
/**
 * How much TEACHING one unmet skill is worth — measured in units, not in days.
 *
 * ── WHY THIS IS UNITS NOW ─────────────────────────────────────────────────────────────────
 *
 * It used to be ten DAYS per skill, which meant a bridge cost the same amount of calendar
 * whatever the learner could absorb: three gaps took thirty days from a beginner and thirty days
 * from somebody who could have covered the same ground in ten. Those twenty days came straight
 * out of the year they had actually paid for.
 *
 * What a gap really implies is a quantity of teaching. Ten units of it. How many DAYS that takes
 * is the learner's own density — one a day, two, or three — so a faster learner finishes the
 * same bridge sooner and spends the days they saved on the year they bought.
 *
 * The content does not shrink. The calendar it occupies does.
 */
export const UNITS_PER_BRIDGE_SKILL = 10;

/**
 * And what an UNMEASURED one is worth, which is less.
 *
 * ── A DEMONSTRATED GAP AND AN UNKNOWN ARE NOT THE SAME CLAIM ──────────────────────────────
 *
 * A skill measured at 15 is a fact: this learner cannot do it, and ten units of teaching is what
 * closing that costs. A skill nobody asked about is not a fact at all — it is the absence of one,
 * and the honest response is a refresher and a check rather than a full re-teach.
 *
 * Costing them the same was measured and it was too much. Year 3 assumes fourteen skills and the
 * entry paper measures one or two of them, so thirteen unknowns at ten units each wanted 130
 * units — the whole third of the programme the cap allows — and a weak third-year came back with
 * the bridge in full and ZERO of their specialization, zero production project and zero of the
 * interview, portfolio and internship blocks. They were given Year 1 and 2 and charged for
 * Year 3.
 *
 * At four units an unknown, the same fourteen come to a bridge that leaves most of the year
 * intact, and a skill the learner has actually been measured weak on still gets its full ten.
 */
export const UNITS_PER_UNMEASURED_BRIDGE_SKILL = 4;

/**
 * How many gaps one bridge will act on, worst first.
 *
 * ── WHY A BRIDGE IS NOT A REMEDIAL YEAR ───────────────────────────────────────────────────
 *
 * Counting unmeasured skills as gaps is right, and it made the gap LIST long: Year 3 assumes
 * fourteen skills and a fresh third-year is measured on one or two of them, so thirteen arrive as
 * gaps at once. Acting on all of them spends the whole third of the programme the cap allows, and
 * measured, that is exactly what happened — a weak third-year received the bridge in full and
 * zero of their specialization, zero production project, and zero of the interview, portfolio and
 * internship blocks.
 *
 * The bridge exists to get somebody far enough in to FOLLOW the year, not to re-teach the two
 * years before it. The list is already sorted worst-first, so taking the worst six spends the
 * days where they buy the most and leaves the year they actually bought standing.
 *
 * A learner genuinely below the line on everything is not served by a bigger bridge either — see
 * MAX_BRIDGE_SHARE, which says in as many words that for a total beginner the honest answer is
 * the earlier programme rather than a truncated version of this one.
 */
export const MAX_BRIDGE_SKILLS = 6;

/**
 * The most of a programme that may be spent bridging.
 *
 * A learner who bought Year 2 must still be taught Year 2. Someone weak on every measured skill
 * would otherwise be sold a second-year membership and given a first-year plan, which is a
 * refund and a complaint rather than a personalised journey. At a third, a 110-day plan spends
 * at most 36 days catching up and at least 74 on the year they paid for. Past this, the honest
 * answer is that they should be doing Year 1, and that is a conversation, not a composition.
 *
 * ── RAISING THIS WAS CONSIDERED AND MEASURED ──────────────────────────────────────────────
 *
 * The question was whether a fresh joiner with no programming at all should get a bigger bridge
 * instead of being told Year 1 is the right purchase. Measured against the real Year-1
 * inventory, for a learner below the ready score on all fourteen bridge skills:
 *
 *   cap 33% -> 36 bridge days, reaches  4 of 14 gaps    (ladder 13% covered)
 *   cap 40% -> 44 bridge days, reaches  4 of 14 gaps    (ladder 16% covered)
 *   cap 45% -> 49 bridge days, reaches  4 of 14 gaps    (ladder 18% covered)
 *   cap 50% -> 55 bridge days, reaches  4 of 14 gaps    (ladder 21% covered)
 *
 * The ladder behind those fourteen skills is 268 units. Half a 110-day programme is 55. No cap
 * closes a gap of that size, so THE CAP IS NOT THE LEVER — raising it would only sell more of
 * Year 2 to teach less of Year 1, and the learner would still arrive at OOP unable to write a
 * loop. For a total beginner the answer is Year 1, and composeBridge now says so in the log
 * rather than handing them a truncated plan that looks like a journey.
 *
 * What the same measurement DID show was a real defect, and it was nothing to do with the size
 * of the bridge: the days were being spent at the foot of the ladder and never reaching the
 * gap. A learner gapped on arrays alone was taught hardware, decomposition and variables and
 * never met an array. See bridgeTopicsWithinBudget — fixing the selection took that learner
 * from 0 of 1 gap taught to 1 of 1, and a learner rusty on loops, functions and arrays from
 * 1 of 3 to 3 of 3, without moving this constant at all.
 */
export const MAX_BRIDGE_SHARE = 1 / 3;

export interface BridgePlan {
  /** The stages the bridging units are taken from, nearest first. */
  sourceStages: readonly string[];
  /** The unmet skills, worst first, which the bridge units must teach. */
  skills: string[];
  /** How many days of the programme the bridge may take. Never the whole thing. */
  days: number;
  /**
   * How many UNITS of teaching those days should carry.
   *
   * Not the same question as the days, and the reason a faster learner's bridge is shorter in
   * calendar without being thinner in content.
   */
  units: number;
}

/**
 * What this learner needs before the stage they are entering, or null when they need nothing.
 *
 * Null is the common answer and the one that keeps today's behaviour: a stage with no source
 * stage, a learner with no measured gaps, or a programme too short to spare the days all take
 * the plan exactly as it is composed now.
 */
/**
 * How many bridging units a day carries — one more than the year's own material.
 *
 * ── WHY FUNDAMENTALS PACK DENSER THAN THE YEAR THEY LEAD INTO ─────────────────────────────
 *
 * A bridge unit is a Year-1 lesson: variables, a loop, a function. They are SHORT — well under
 * an hour each — where the year the learner actually bought is authored at an hour and more, and
 * a day's minutes budget is the same either way. Costing them at the year's own pace spends a
 * learner's calendar on half-empty days.
 *
 * It matters most to exactly the learner it hurts. A second-year gapped on three Year-1 skills
 * is owed thirty units; at the year's two a day that is fifteen days of their hundred and ten,
 * and at three a day it is ten. Five days back, and they come off the part of the year where a
 * weak learner was running out — measured, the weakest Year-2 and Year-3 profiles were losing
 * the professional block entirely.
 *
 * Capped at the packer's own ceiling, so this can never ask for a day the packer would refuse.
 * The CONTENT does not change: the same thirty units, in the same authored order — variables
 * before loops before functions, with each gap topic's predecessors pulled in ahead of it. Only
 * the calendar they occupy does.
 */
export const bridgeUnitsPerDay = (density: LearningDensity): number =>
  Math.min(density.unitsPerDay + 1, density.maxUnitsPerDay);

export function bridgePlanFor(
  profile: StudentProfile,
  stageKey: string | null | undefined,
  programDays: number,
): BridgePlan | null {
  const stage = String(stageKey || '').toLowerCase().trim();
  const sourceStages = BRIDGE_SOURCE_STAGE[stage];
  const required = BRIDGE_SKILLS[stage];
  if (!sourceStages?.length || !required?.length) return null;

  const held = profile?.skills;
  if (!held || typeof held.get !== 'function') return null;

  /**
   * ── SILENCE IS TRUSTED ONLY FROM SOMEBODY WHO HAS SHOWN SOMETHING ─────────────────────
   *
   * This counted only MEASURED skills, and the reasoning is sound as far as it goes: absence of
   * evidence is not evidence of absence, and counting silence as weakness would bridge the
   * returning member this exists to let through.
   *
   * It does not survive contact with the entry test. The paper is twenty-four items over about
   * eight skills; Year 3 assumes fourteen. Measured on the real members of this tenant, ONE or
   * TWO of the fourteen came back measured — so twelve were silently treated as held, a fresh
   * third-year who had never done Years 1 or 2 here got a FOUR-DAY bridge and was then dropped
   * into advanced algorithms, and a member with no Skill DNA at all got no bridge whatsoever.
   *
   * So silence is read in the light of what they DID show. A learner with any measured assumed
   * skill at or above the line has demonstrated they are in this material, and their silence is
   * trusted exactly as before: the returning Year-1 member is not bridged, and the one whose
   * single skill has faded is bridged on that skill alone. A learner who has shown nothing at or
   * above the line has given no reason to believe the year can stand on them, and their unmeasured
   * skills count.
   *
   * Worst first: demonstrated low scores ahead of unknowns, because a measured 15 is a worse gap
   * than an unknown, and the list is then cut to MAX_BRIDGE_SKILLS.
   */
  const measured = required
    .map(key => ({ key, score: held.get(key)?.score }))
    .filter((g): g is { key: string; score: number } => typeof g.score === 'number');
  const hasPositiveEvidence = measured.some(g => g.score >= BRIDGE_READY_SCORE);

  const gaps: { key: string; score: number | undefined }[] = [
    ...measured.filter(g => g.score < BRIDGE_READY_SCORE).sort((a, b) => a.score - b.score),
    ...(hasPositiveEvidence
      ? []
      : required
        .filter(key => typeof held.get(key)?.score !== 'number')
        .map(key => ({ key, score: undefined }))),
  ];

  if (!gaps.length) return null;

  /*
   * The teaching the gaps imply, and then the calendar it takes THIS learner.
   *
   * Capped both ways: never more than a third of the programme in days, and never more units
   * than those days can actually hold, so the composer is not asked for a bridge the packer
   * would then refuse.
   */
  const density = densityFor(profile, stage);
  const acted = gaps.slice(0, MAX_BRIDGE_SKILLS);
  const wantedUnits = acted.reduce(
    (n, g) => n + (typeof g.score === 'number' ? UNITS_PER_BRIDGE_SKILL : UNITS_PER_UNMEASURED_BRIDGE_SKILL),
    0,
  );
  const ceiling = Math.floor(programDays * MAX_BRIDGE_SHARE);
  const days = Math.min(Math.ceil(wantedUnits / bridgeUnitsPerDay(density)), ceiling);
  if (days < 1) return null;

  return {
    sourceStages,
    skills: acted.map(g => g.key),
    days,
    units: Math.min(wantedUnits, days * bridgeUnitsPerDay(density)),
  };
}
