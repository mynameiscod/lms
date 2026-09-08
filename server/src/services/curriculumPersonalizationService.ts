/**
 * Turn what a student can do into what they should be taught.
 *
 * WHAT THIS REPLACES. trackPersonalizationService resizes a curriculum's day ranges from six
 * broad dimension scores — drop a topic above 90, halve it above 75, stretch it below 40 — and
 * then never looks again. Three problems follow from that, and this service exists for each:
 * a dimension is far too coarse to teach against, a dropped topic vanishes with no record, and
 * a plan built once at signup is wrong the moment the student learns anything.
 *
 * PURE, AND DELIBERATELY SO. No database, no clock, no randomness, no AI. Everything it needs is
 * passed in and everything it decides is returned. That is what makes a plan reproducible — the
 * same student, twice, gets the same plan byte for byte — and what lets the whole thing be
 * tested without a Mongo instance.
 *
 * IT DOES NOT MEASURE ANYTHING. Scores and confidence come from Skill DNA. Gap and priority come
 * from the readiness engine. This decides only what to teach given somebody else's measurement,
 * and keeping that line is what stops a second, quietly disagreeing scoring engine growing here.
 *
 * THE FOUR RULES IT ENFORCES, in the order they matter:
 *   1. A target role never overrides a prerequisite. Wanting machine learning is not readiness
 *      for it.
 *   2. Mandatory foundation is never removed by direction. Git does not stop mattering because
 *      a student chose AI.
 *   3. Availability changes pace, never content. Less time means longer, not less.
 *   4. Mastered means marked, not deleted.
 */

import {
  AssignmentState, AssignmentReason, LearningDepth,
  stateForScore, depthFor, explainReason, paceFor, weeksFor,
  Availability, PacePlan,
} from '../data/adaptiveCurriculumPolicy';
import {
  DirectionStatus, appliesToDirection, directionByKey, wantsExploration, explorationDirections,
} from '../data/careerDirectionPolicy';
import type { SkillConfidence } from '../models/StudentSkillProfile';

/* ------------------------------------------------------------------ *
 * Inputs
 * ------------------------------------------------------------------ */

/** One skill, as Skill DNA currently believes it. A missing entry means never measured. */
export interface SkillBelief {
  skillKey: string;
  score: number | null;
  confidence: SkillConfidence | null;
}

/** A topic from the master curriculum, already flattened out of its module. */
export interface PlannableTopic {
  topicId?: string;
  topicCode?: string;
  title: string;
  moduleCode: string;
  moduleName?: string;
  moduleOrder: number;
  order: number;

  skillKeys: string[];
  prerequisiteSkillKeys: string[];
  applicableDirections: string[];
  mandatory: boolean;
  defaultDepth?: LearningDepth;

  /** Minutes of mandatory work, used only to report an honest timeline. */
  estimatedMinutes: number;
}

export interface PersonalizationInput {
  topics: PlannableTopic[];
  /** Skill DNA, keyed by skillKey. Absence is "not measured", never zero. */
  beliefs: Map<string, SkillBelief>;
  /**
   * Prerequisites from the canonical skill graph, keyed by skillKey.
   *
   * Merged with any stated on the topic. The graph knows the logical order; a topic may add a
   * pedagogical one the graph has no opinion about.
   */
  graphPrerequisites: Map<string, string[]>;
  /** Readiness priority per skill, when a role blueprint exists. Higher is more urgent. */
  priorities: Map<string, number>;
  /** Human names for skills, for the explanation sentences. */
  skillNames: Map<string, string>;

  selectedDirection?: string | null;
  directionStatus: DirectionStatus;
  explorationDirections: string[];

  availability: Availability;
}

/* ------------------------------------------------------------------ *
 * Outputs
 * ------------------------------------------------------------------ */

export interface TopicDecision {
  topicId?: string;
  topicCode?: string;
  title: string;
  moduleCode: string;
  moduleName?: string;
  moduleOrder: number;

  skillKeys: string[];
  state: AssignmentState;
  priority: number;

  contentDepth: LearningDepth;
  difficultyMin: number;
  difficultyMax: number;
  practiceCount: number;

  reason: AssignmentReason;
  reasonText: string;

  mandatory: boolean;
  locked: boolean;
  lockedBy?: string;

  scoreAtAssignment: number | null;
  estimatedMinutes: number;
}

export interface PersonalizationResult {
  decisions: TopicDecision[];
  pace: PacePlan;
  totalAssignedMinutes: number;
  estimatedWeeks: number;
  /** Counts by state, for logging and the admin view. */
  summary: Record<string, number>;
}

/* ------------------------------------------------------------------ *
 * The decision for a single topic
 * ------------------------------------------------------------------ */

/**
 * The weakest skill in a topic decides how it is taught.
 *
 * A topic covering variables, conditions and loops where a student is strong on the first two
 * and lost on the third has to be taught for the third. Averaging would hide exactly the gap
 * the plan exists to close, and the student would be handed a recap of something they cannot do.
 */
function governingBelief(skillKeys: string[], beliefs: Map<string, SkillBelief>): SkillBelief | null {
  const known = skillKeys
    .map(k => beliefs.get(k))
    .filter((b): b is SkillBelief => !!b);

  if (!known.length) return null;

  // An unmeasured skill in the set governs: it is the one we know least about.
  const anyUnmeasured = skillKeys.some(k => !beliefs.has(k));
  if (anyUnmeasured) return null;

  return known.reduce((worst, b) => {
    if (worst.score === null) return worst;
    if (b.score === null) return b;
    return b.score < worst.score ? b : worst;
  });
}

/**
 * Which prerequisite, if any, is still out of reach.
 *
 * Returns the first unmet one so the student can be given a single next thing to do rather than
 * a list. Reached means measured at FOUNDATION level or better with enough evidence to believe
 * it — a thin high score is not a foundation to build on.
 */
function unmetPrerequisite(
  prereqs: string[],
  beliefs: Map<string, SkillBelief>,
): string | undefined {
  const FOUNDATION_SCORE = 40;
  for (const key of prereqs) {
    const b = beliefs.get(key);
    if (!b) return key;                                   // never measured
    if (b.score === null) return key;
    if (b.confidence === 'LOW') return key;               // measured, but not believably
    if (b.score < FOUNDATION_SCORE) return key;
  }
  return undefined;
}

function decideTopic(
  topic: PlannableTopic,
  input: PersonalizationInput,
  /**
   * Topic codes that survived relevance, INCLUDING those pulled in as prerequisites.
   *
   * See expandRelevance below: a topic the student's own plan depends on is relevant whatever
   * their direction says, so this is consulted instead of re-deriving direction here.
   */
  relevantTopics: Set<PlannableTopic>,
): TopicDecision {
  const skillName = input.skillNames.get(topic.skillKeys[0]) || topic.title;
  const direction = directionByKey(input.selectedDirection);
  const directionName = direction?.name;

  const belief = governingBelief(topic.skillKeys, input.beliefs);
  const score = belief?.score ?? null;

  const priority = topic.skillKeys.reduce(
    (max, k) => Math.max(max, input.priorities.get(k) ?? 0), 0,
  );

  /**
   * RELEVANCE FIRST, BUT NEVER OVER MANDATORY.
   *
   * A topic outside the student's direction is marked NOT_RELEVANT and kept visible rather than
   * hidden, so they can see what was set aside and why. A mandatory topic skips this entirely —
   * that is what mandatory means.
   */
  /**
   * A student who has not chosen sees MORE, not less.
   *
   * The exploration list is normally supplied by the caller. When it is empty — a first-year who
   * has answered nothing yet, or a caller that simply forgot to populate it — falling through to
   * the direction filter marks every direction-specific topic NOT_RELEVANT and leaves them with
   * bare foundation and no way to discover what they enjoy. That is the opposite of what an
   * undecided student needs, and it renders as a perfectly healthy plan, so the empty list
   * defaults to the full exploration set rather than to nothing.
   */
  const relevant = relevantTopics.has(topic);

  if (!relevant) {
    const d = depthFor('NOT_RELEVANT');
    return {
      ...base(topic), skillKeys: topic.skillKeys, state: 'NOT_RELEVANT', priority,
      contentDepth: d.depth, difficultyMin: d.difficultyMin, difficultyMax: d.difficultyMax,
      practiceCount: d.practiceCount, mandatory: false, locked: false,
      reason: 'OUTSIDE_DIRECTION',
      reasonText: explainReason('OUTSIDE_DIRECTION', { skillName, directionName }),
      scoreAtAssignment: score, estimatedMinutes: 0,
    };
  }

  /**
   * PREREQUISITES OUTRANK AMBITION.
   *
   * Checked before the score is even consulted, because a student who scores well on a topic
   * they have no foundation for has almost certainly been lucky, and unlocking it on that basis
   * is how somebody ends up in machine learning unable to write a loop.
   */
  const prereqs = Array.from(new Set([
    ...topic.prerequisiteSkillKeys,
    ...topic.skillKeys.flatMap(k => input.graphPrerequisites.get(k) || []),
  ])).filter(k => !topic.skillKeys.includes(k));

  const blocker = unmetPrerequisite(prereqs, input.beliefs);
  if (blocker) {
    const d = depthFor('LOCKED');
    const blockedBy = input.skillNames.get(blocker) || blocker;
    return {
      ...base(topic), skillKeys: topic.skillKeys, state: 'LOCKED', priority,
      contentDepth: d.depth, difficultyMin: d.difficultyMin, difficultyMax: d.difficultyMax,
      practiceCount: d.practiceCount, mandatory: topic.mandatory, locked: true, lockedBy: blocker,
      reason: 'PREREQUISITE_LOCKED',
      reasonText: explainReason('PREREQUISITE_LOCKED', { skillName, blockedBy }),
      scoreAtAssignment: score, estimatedMinutes: topic.estimatedMinutes,
    };
  }

  const state = stateForScore({ score, confidence: belief?.confidence ?? null });
  const d = depthFor(state);

  const reason: AssignmentReason =
    state === 'NOT_EXPOSED' ? 'NOT_YET_EXPOSED'
      : state === 'VERIFIED' ? 'MASTERY_VERIFIED'
        : state === 'FOUNDATION_REQUIRED' || state === 'GUIDED' ? 'DIAGNOSTIC_GAP'
          : topic.mandatory ? 'STANDARD_FOUNDATION'
            : direction ? 'STUDENT_DIRECTION'
              : 'STANDARD_FOUNDATION';

  return {
    ...base(topic), skillKeys: topic.skillKeys, state, priority,
    contentDepth: topic.defaultDepth && state === 'NOT_EXPOSED' ? topic.defaultDepth : d.depth,
    difficultyMin: d.difficultyMin, difficultyMax: d.difficultyMax, practiceCount: d.practiceCount,
    // A verified topic stays in the plan but is never required — see §18. Its minutes do not
    // count toward the timeline, because nothing in it has to be done.
    mandatory: d.mandatory && topic.mandatory !== false && state !== 'VERIFIED',
    locked: false,
    reason,
    reasonText: explainReason(reason, { skillName, score, directionName }),
    scoreAtAssignment: score,
    estimatedMinutes: state === 'VERIFIED' ? 0 : topic.estimatedMinutes,
  };
}

const base = (t: PlannableTopic) => ({
  topicId: t.topicId,
  topicCode: t.topicCode,
  title: t.title,
  moduleCode: t.moduleCode,
  moduleName: t.moduleName,
  moduleOrder: t.moduleOrder,
});


/**
 * Which topics this student's plan covers — direction first, then what those topics DEPEND on.
 *
 * WHY THE SECOND STEP EXISTS. Direction filtering alone produced an unreachable plan the first
 * time this ran against real data: a backend student had "How the Web Talks" locked behind HTML,
 * and HTML had been filtered out as not part of Software & Backend. The lock could never be
 * satisfied, so the topic was shut for the life of the plan and the student was told to finish
 * something they would never be given.
 *
 * A SKILL YOUR OWN PLAN DEPENDS ON IS RELEVANT TO YOU, whatever your direction says. So topics
 * teaching a prerequisite of an already-relevant topic are pulled back in — the same expansion
 * the roadmap planner does over the skill graph, applied here to curriculum topics.
 *
 * Bounded at three rounds and guarded by `seen`: a curriculum with a prerequisite cycle must
 * produce a plan, not a hang.
 */
function expandRelevance(input: PersonalizationInput): Set<PlannableTopic> {
  const exploring = wantsExploration(input.directionStatus);
  const exploreSet = exploring && !input.explorationDirections.length
    ? explorationDirections().map(d => String(d.key))
    : input.explorationDirections.map(d => String(d).toUpperCase());

  const directlyRelevant = (t: PlannableTopic): boolean =>
    t.mandatory
    || appliesToDirection(t.applicableDirections, input.selectedDirection)
    || (exploring && t.applicableDirections.some(d => exploreSet.includes(String(d).toUpperCase())));

  /**
   * Identified by object, not by code or title.
   *
   * Two topics can legitimately share a title across modules, and topicCode is optional on a
   * curriculum authored before codes existed — either collision would silently mark an
   * irrelevant topic relevant. A test caught exactly that: Java became relevant to a web
   * student because it shared an identifier with a mandatory topic.
   */
  const relevant = new Set<PlannableTopic>();
  for (const t of input.topics) if (directlyRelevant(t)) relevant.add(t);

  // Which topics teach a given skill.
  const providers = new Map<string, PlannableTopic[]>();
  for (const t of input.topics) {
    for (const k of t.skillKeys) {
      if (!providers.has(k)) providers.set(k, []);
      providers.get(k)!.push(t);
    }
  }

  for (let round = 0; round < 3; round++) {
    let added = false;
    for (const t of input.topics) {
      if (!relevant.has(t)) continue;
      const needs = Array.from(new Set([
        ...t.prerequisiteSkillKeys,
        ...t.skillKeys.flatMap(k => input.graphPrerequisites.get(k) || []),
      ])).filter(k => !t.skillKeys.includes(k));

      for (const skill of needs) {
        for (const provider of (providers.get(skill) || [])) {
          if (!relevant.has(provider)) { relevant.add(provider); added = true; }
        }
      }
    }
    if (!added) break;
  }

  return relevant;
}

/* ------------------------------------------------------------------ *
 * The plan
 * ------------------------------------------------------------------ */

/**
 * Build the whole plan.
 *
 * DETERMINISTIC ORDERING. Sorted by module, then by what needs attention first, then by title —
 * never by insertion order or anything time-dependent. Two runs over the same input produce
 * identical output, which is what makes a plan explainable and a regression visible.
 */
export function personalizeCurriculum(input: PersonalizationInput): PersonalizationResult {
  const pace = paceFor(input.availability);

  const relevantTopics = expandRelevance(input);

  const decisions = input.topics

    .map(t => decideTopic(t, input, relevantTopics))
    .sort((a, b) =>
      a.moduleOrder - b.moduleOrder
      || stateRank(a.state) - stateRank(b.state)
      || b.priority - a.priority
      || a.title.localeCompare(b.title));

  /**
   * Only MANDATORY work counts toward the timeline.
   *
   * Counting optional enrichment would inflate the estimate and make a student who is doing well
   * look further behind than one who is not — the opposite of the truth.
   */
  const totalAssignedMinutes = decisions
    .filter(d => d.mandatory && !d.locked)
    .reduce((n, d) => n + d.estimatedMinutes, 0);

  const summary: Record<string, number> = {};
  for (const d of decisions) summary[d.state] = (summary[d.state] || 0) + 1;

  return {
    decisions,
    pace,
    totalAssignedMinutes,
    estimatedWeeks: weeksFor(totalAssignedMinutes, pace),
    summary,
  };
}

const STATE_RANK: Record<AssignmentState, number> = {
  FOUNDATION_REQUIRED: 0, NOT_EXPOSED: 1, GUIDED: 2, STANDARD: 3,
  LOCKED: 4, REVISION: 5, VERIFIED: 6, ENRICHMENT: 7, NOT_RELEVANT: 8,
};
const stateRank = (s: AssignmentState) => STATE_RANK[s] ?? 99;
