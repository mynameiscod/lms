/**
 * Whether a Learning Unit is safe for the composer to schedule.
 *
 * ── THE RULE EVERYTHING ELSE SERVES ───────────────────────────────────────────────────────
 *
 * INHERITED CONTENT CAN NEVER TAKE A UNIT ABOVE PARTIAL. No exceptions, no unit type exempted.
 *
 * The P4 audit is why. All 310 Year-1 units reported "has teaching" and "has practice" at 100%,
 * while only 39 distinct bundles sat behind them: every one of the twelve HTML units inherits the
 * same topic-level video. A composer trusting that signal would schedule twelve days that each
 * open one identical asset, and the student would meet one lesson twelve times.
 *
 * An earlier draft of this file exempted PROJECT and REVIEW, on the reasoning that a topic-level
 * project brief genuinely serves the one project unit in its topic. That reasoning is plausible
 * and was still wrong to encode: an exemption is a hole somebody fills later, and the whole value
 * of the rule is that it has none. A project brief written for a project unit takes thirty
 * minutes; inheriting one costs the guarantee.
 *
 * ── WHAT THE FIVE STATES ARE FOR ──────────────────────────────────────────────────────────
 *
 *   EMPTY       nothing resolves at all. A title and an intention.
 *   PARTIAL     something resolves, but every piece is shared with sibling units.
 *   TEACHABLE   content written FOR this unit that teaches it.
 *   ASSESSABLE  teachable, and something bound to it can measure whether it landed.
 *   READY       everything this unit type requires.
 *
 * A boolean would collapse EMPTY and PARTIAL into one red light, and they are a writing task and
 * a judgement call respectively. Five is also the most that stays memorable, and each rung names
 * what is missing rather than a score.
 *
 * ── REQUIREMENTS DIFFER BY TYPE, BECAUSE THE WORK DIFFERS ─────────────────────────────────
 *
 * Holding every type to one bar would either block practice units forever or let empty concept
 * units through. The table below is per type and deliberately explicit: a reader should be able
 * to answer "what does a DEBUG unit need" without tracing code.
 */

import { ContentLibraryType } from '../models/LearningContentLibrary';
import { LearningUnitType } from '../models/CurriculumLearningUnit';
import { roleOf, teaches } from './contentBundlePolicy';

export type UnitReadiness = 'EMPTY' | 'PARTIAL' | 'TEACHABLE' | 'ASSESSABLE' | 'READY';

export const READINESS_ORDER: UnitReadiness[] =
  ['EMPTY', 'PARTIAL', 'TEACHABLE', 'ASSESSABLE', 'READY'];

/** The three things a unit can own. Each is counted from UNIT-SPECIFIC content only. */
export interface OwnCapability {
  teaching: boolean;
  practice: boolean;
  assessment: boolean;
}

export interface TypeRule {
  /** What the unit must own to be worth scheduling at all. */
  teachable: (own: OwnCapability) => boolean;
  /** Teachable, plus a way to tell whether it landed. */
  assessable: (own: OwnCapability) => boolean;
  /** Everything this type requires. */
  ready: (own: OwnCapability) => boolean;
  /** One line an author can act on, per rung missed. */
  describe: string;
}

/**
 * What each kind of unit needs, in its own terms.
 *
 * PRACTICE and DEBUG do not require teaching: the concept unit before them taught it, and
 * requiring each to re-teach would duplicate a lesson into every topic. Their practice IS their
 * teaching, so it satisfies the teachable rung as well as the ready one.
 *
 * PROJECT requires a brief written for it and does not require separate practice — the project is
 * the practice, and demanding an exercise beside it is a box authors tick with something
 * meaningless. Submission and evaluation stay with the existing Assignment engine, bound by
 * unitCode; nothing here builds a second one.
 *
 * CHECKPOINT requires only something that measures. Measuring is the entire job.
 */
export const TYPE_RULES: Record<LearningUnitType, TypeRule> = {
  CONCEPT: {
    teachable: o => o.teaching,
    assessable: o => o.teaching && o.assessment,
    ready: o => o.teaching && o.practice && o.assessment,
    describe: 'needs its own lesson, practice and a checkpoint',
  },
  WORKED_EXAMPLE: {
    teachable: o => o.teaching,
    assessable: o => o.teaching && o.assessment,
    ready: o => o.teaching,
    describe: 'needs its own worked example',
  },
  PRACTICE: {
    teachable: o => o.practice,
    assessable: o => o.practice && o.assessment,
    ready: o => o.practice,
    describe: 'needs its own practice',
  },
  DEBUG: {
    teachable: o => o.practice,
    assessable: o => o.practice && o.assessment,
    ready: o => o.practice,
    describe: 'needs its own broken-code exercise',
  },
  PROJECT: {
    teachable: o => o.teaching,
    assessable: o => o.teaching && o.assessment,
    ready: o => o.teaching && o.assessment,
    describe: 'needs its own brief and a bound assignment to submit against',
  },
  CHECKPOINT: {
    teachable: o => o.assessment,
    assessable: o => o.assessment,
    ready: o => o.assessment,
    describe: 'needs a quiz or assignment bound to it',
  },
  REVIEW: {
    teachable: o => o.teaching,
    assessable: o => o.teaching && o.assessment,
    ready: o => o.teaching,
    describe: 'needs its own recap',
  },
};

export interface ReadinessInput {
  unitType: LearningUnitType;
  /** Published library rows bound to THIS unit by unitCode. */
  ownContent: { type: ContentLibraryType | string }[];
  /** Published rows the unit reaches only through its topic or its skills. */
  inheritedContent: { type: ContentLibraryType | string }[];
  /** Quizzes and assignments carrying this unit's code. */
  boundAssessments: number;
}

export interface ReadinessResult {
  readiness: UnitReadiness;
  /** What is still missing, in words an author can act on. Empty when READY. */
  missing: string[];
  /** True when the unit owns nothing and everything it shows is its topic's. */
  inheritedOnly: boolean;
  own: OwnCapability & { teachingCount: number; practiceCount: number; assessmentCount: number };
  inheritedCount: number;
}

export function evaluateReadiness(input: ReadinessInput): ReadinessResult {
  const rule = TYPE_RULES[input.unitType] || TYPE_RULES.CONCEPT;
  const ownRows = input.ownContent || [];
  const inherited = input.inheritedContent || [];
  const assessments = input.boundAssessments || 0;

  const teachingCount = ownRows.filter(c => teaches(String(c.type))).length;
  const practiceCount = ownRows.filter(c => roleOf(String(c.type)) === 'PRACTISE').length;

  const own: OwnCapability = {
    teaching: teachingCount > 0,
    practice: practiceCount > 0,
    assessment: assessments > 0,
  };

  const ownAnything = ownRows.length > 0 || assessments > 0;
  const detail = {
    ...own,
    teachingCount,
    practiceCount,
    assessmentCount: assessments,
  };

  if (!ownAnything && !inherited.length) {
    return {
      readiness: 'EMPTY',
      missing: [`nothing resolves for this unit — it ${rule.describe}`],
      inheritedOnly: false,
      own: detail,
      inheritedCount: 0,
    };
  }

  /**
   * THE CAP. Owning nothing means PARTIAL, whatever the topic provides and whatever the type.
   *
   * Stated before any rung is evaluated rather than as a modifier afterwards, so no future edit
   * to the rules table can route around it.
   */
  if (!ownAnything) {
    return {
      readiness: 'PARTIAL',
      missing: [`only inherits its topic’s content — ${rule.describe}`],
      inheritedOnly: true,
      own: detail,
      inheritedCount: inherited.length,
    };
  }

  const missing: string[] = [];
  if (!rule.teachable(own)) missing.push(rule.describe);

  let readiness: UnitReadiness = 'PARTIAL';
  if (rule.ready(own)) readiness = 'READY';
  else if (rule.assessable(own)) readiness = 'ASSESSABLE';
  else if (rule.teachable(own)) readiness = 'TEACHABLE';

  if (readiness === 'TEACHABLE' || readiness === 'ASSESSABLE') {
    if (!own.practice && rule.ready.toString().includes('practice')) missing.push('nothing to practise');
    if (!own.assessment) missing.push('no checkpoint bound to it');
  }

  return {
    readiness,
    missing: readiness === 'READY' ? [] : [...new Set(missing)],
    inheritedOnly: false,
    own: detail,
    inheritedCount: inherited.length,
  };
}

/**
 * The bar for publishing.
 *
 * PROPOSED, and not yet enforced on the publish route: turning it on today would block every one
 * of the 310 Year-1 units, because none of them owns anything. It becomes the gate once the
 * pilot topics prove an author can clear it.
 */
export const MINIMUM_TO_PUBLISH: UnitReadiness = 'TEACHABLE';

export const meetsPublishBar = (r: UnitReadiness): boolean =>
  READINESS_ORDER.indexOf(r) >= READINESS_ORDER.indexOf(MINIMUM_TO_PUBLISH);
