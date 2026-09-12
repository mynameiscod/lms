/**
 * Whether a Learning Unit is safe for the composer to schedule.
 *
 * ── PROPOSED, NOT ENFORCED ────────────────────────────────────────────────────────────────
 *
 * Nothing calls this yet. It is here to be read and argued with before it becomes the gate on
 * publishing, because the decision it encodes — what PUBLISHED is allowed to mean — is a product
 * decision wearing a function's clothing.
 *
 * ── THE PROBLEM IT EXISTS TO SOLVE ────────────────────────────────────────────────────────
 *
 * Today PUBLISHED means the metadata validated and something resolved. The P4 audit showed how
 * little that guarantees: all 310 units report "has teaching" and "has practice" at 100%, while
 * only 39 DISTINCT bundles sit behind them. Every one of the twelve HTML units inherits the same
 * topic-level video. A composer trusting the current signal would schedule twelve days that each
 * open the identical asset, and the student would meet one lesson twelve times.
 *
 * So readiness has to distinguish content written FOR a unit from content a unit merely inherits.
 * That distinction is the whole point; everything below is bookkeeping around it.
 *
 * ── WHY FIVE STATES AND NOT A BOOLEAN ─────────────────────────────────────────────────────
 *
 * A boolean would collapse two situations an author must tell apart: "nothing exists" and
 * "something exists but it is shared with eleven siblings". The first is a writing task; the
 * second is a judgement about whether sharing is acceptable for this unit. A single flag would
 * make both look like the same red light, and the backlog would be unreadable.
 *
 * Five is also the most that stays memorable. EMPTY / PARTIAL / TEACHABLE / ASSESSABLE / READY
 * reads as a ladder, and each rung names what is missing rather than a score.
 *
 * ── REQUIREMENTS DIFFER BY UNIT TYPE, BECAUSE THE WORK DIFFERS ────────────────────────────
 *
 * A CONCEPT unit needs something that teaches. A PRACTICE unit needs something to practise and is
 * not required to teach at all — that is its sibling's job. Holding every type to one bar would
 * either block practice units forever or let empty concept units through, and both are worse than
 * a table.
 */

import { ContentLibraryType } from '../models/LearningContentLibrary';
import { LearningUnitType } from '../models/CurriculumLearningUnit';
import { roleOf, teaches } from './contentBundlePolicy';

export type UnitReadiness =
  /** Nothing resolves at all. The unit is a title and an intention. */
  | 'EMPTY'
  /**
   * Something resolves, but only by inheritance — it is shared with every sibling unit.
   *
   * The state the entire Year-1 curriculum is in today. Deliberately NOT called "ready with
   * caveats": a plan built from it would teach the same lesson a dozen times.
   */
  | 'PARTIAL'
  /** Content written for THIS unit that teaches it. Schedulable, if the composer accepts no practice. */
  | 'TEACHABLE'
  /** Teachable, and there is something to practise or be checked on. */
  | 'ASSESSABLE'
  /** Everything this unit type requires. Safe to schedule without qualification. */
  | 'READY';

export const READINESS_ORDER: UnitReadiness[] =
  ['EMPTY', 'PARTIAL', 'TEACHABLE', 'ASSESSABLE', 'READY'];

export interface ReadinessRequirement {
  /** Must resolve something that teaches (video, notes, worked example, lesson, activity). */
  needsTeaching: boolean;
  /** Must resolve practice, or carry a bound quiz or assignment. */
  needsPractice: boolean;
  /** Must carry a bound quiz or assignment specifically. */
  needsAssessment: boolean;
  /** Inherited content is enough to reach READY. False means it needs its own. */
  inheritanceSufficient: boolean;
}

/**
 * What each kind of unit actually needs.
 *
 * PROJECT deliberately does not require practice: the project IS the practice, and demanding a
 * separate exercise beside it would be a box-ticking requirement that authors would satisfy with
 * something meaningless.
 *
 * PRACTICE and DEBUG do not require teaching: they follow a concept unit that taught it, and
 * requiring each to re-teach would produce duplicated lessons across every topic.
 *
 * CHECKPOINT requires assessment and nothing else — measuring is the entire job.
 */
export const REQUIREMENTS: Record<LearningUnitType, ReadinessRequirement> = {
  CONCEPT:        { needsTeaching: true,  needsPractice: true,  needsAssessment: false, inheritanceSufficient: false },
  WORKED_EXAMPLE: { needsTeaching: true,  needsPractice: false, needsAssessment: false, inheritanceSufficient: false },
  PRACTICE:       { needsTeaching: false, needsPractice: true,  needsAssessment: false, inheritanceSufficient: false },
  DEBUG:          { needsTeaching: false, needsPractice: true,  needsAssessment: false, inheritanceSufficient: false },
  PROJECT:        { needsTeaching: true,  needsPractice: false, needsAssessment: false, inheritanceSufficient: true  },
  CHECKPOINT:     { needsTeaching: false, needsPractice: false, needsAssessment: true,  inheritanceSufficient: false },
  REVIEW:         { needsTeaching: true,  needsPractice: false, needsAssessment: false, inheritanceSufficient: true  },
};

export interface ReadinessInput {
  unitType: LearningUnitType;
  /** Published content bound to this unit by unitCode. */
  ownContent: { type: ContentLibraryType | string }[];
  /** Published content the unit resolves through its topic or its skills. */
  inheritedContent: { type: ContentLibraryType | string }[];
  /** Quizzes and assignments bound to this unit by unitCode. */
  boundAssessments: number;
}

export interface ReadinessResult {
  readiness: UnitReadiness;
  /** What is missing, in the words an author can act on. Empty when READY. */
  missing: string[];
  /** True when everything it has is shared with its sibling units. */
  inheritedOnly: boolean;
}

/**
 * Where a unit stands, and what it still needs.
 *
 * Pure, so the rule can be argued with in a test rather than discovered in production.
 */
export function evaluateReadiness(input: ReadinessInput): ReadinessResult {
  const req = REQUIREMENTS[input.unitType] || REQUIREMENTS.CONCEPT;
  const own = input.ownContent || [];
  const inherited = input.inheritedContent || [];
  const pool = own.length ? own : inherited;
  const inheritedOnly = !own.length && inherited.length > 0;

  const missing: string[] = [];

  if (!pool.length && !input.boundAssessments) {
    return { readiness: 'EMPTY', missing: ['nothing resolves for this unit at all'], inheritedOnly: false };
  }

  const hasTeaching = pool.some(c => teaches(String(c.type)));
  const hasPractice = pool.some(c => roleOf(String(c.type)) === 'PRACTISE') || input.boundAssessments > 0;
  const hasAssessment = input.boundAssessments > 0;

  if (req.needsTeaching && !hasTeaching) missing.push('nothing that teaches it');
  if (req.needsPractice && !hasPractice) missing.push('nothing to practise');
  if (req.needsAssessment && !hasAssessment) missing.push('no quiz or assignment bound to it');

  /**
   * INHERITANCE CAPS READINESS AT PARTIAL, unless the type says otherwise.
   *
   * This is the rule the audit exists to justify. A unit whose only content is its topic's is not
   * ready for a composer to schedule as a distinct day, however complete the topic's material is
   * — because twelve units sharing it produce twelve identical days.
   *
   * PROJECT and REVIEW are exempt: a project brief written for a topic genuinely serves the one
   * project unit in it, and a review unit revisiting a topic is meant to be topic-wide.
   */
  if (inheritedOnly && !req.inheritanceSufficient) {
    return {
      readiness: 'PARTIAL',
      missing: [...missing, 'only inherits its topic’s content — nothing written for this unit'],
      inheritedOnly,
    };
  }

  if (missing.length) {
    // It teaches but lacks something else, or the reverse. Report the rung it reached.
    return {
      readiness: hasTeaching ? 'TEACHABLE' : 'PARTIAL',
      missing,
      inheritedOnly,
    };
  }

  if (req.needsAssessment || hasAssessment) {
    return { readiness: 'READY', missing: [], inheritedOnly };
  }

  // Everything required is present; assessment is the one thing that would add nothing required.
  return { readiness: hasPractice ? 'READY' : 'ASSESSABLE', missing: [], inheritedOnly };
}

/**
 * Whether publishing should be allowed.
 *
 * PROPOSED. The intent is that PUBLISHED eventually means "the composer may schedule this",
 * rather than "its metadata validated" — but flipping that on today would block all 310 units,
 * so the bar is stated here and enforced when the content exists to clear it.
 */
export const MINIMUM_TO_PUBLISH: UnitReadiness = 'TEACHABLE';

export const meetsPublishBar = (r: UnitReadiness): boolean =>
  READINESS_ORDER.indexOf(r) >= READINESS_ORDER.indexOf(MINIMUM_TO_PUBLISH);
