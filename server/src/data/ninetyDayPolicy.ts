/**
 * The ninety-day spine: how long a first year is, and what shape it has.
 *
 * ── WHY NINETY IS A STRUCTURE AND NOT A COUNT ─────────────────────────────────────────────
 *
 * The plan used to be packed by capacity — `minutesPerDay × daysPerWeek` decided how many weeks
 * the content filled — so its length varied per student. A real first-year opened their roadmap
 * and found twenty-eight days under a product sold as ninety. That was not a bug: the curriculum
 * holds 1,560 minutes of work and ninety days of their stated capacity is 3,900. The plan was
 * honest about a shortage nobody had noticed.
 *
 * Padding it to ninety would have manufactured filler, and a student spots filler inside a week.
 * Selecting topics and counting days does not work either — you land on 74 or 103, never 90, and
 * then you are padding or cutting anyway.
 *
 * So the shape is fixed once, here, and personalisation happens INSIDE each band. Ninety is then
 * true by construction rather than by arithmetic that might not land, and "different topics, the
 * same ninety days" becomes a sentence somebody can say to a student.
 *
 * ── A DAY IS A UNIT OF CURRICULUM, NOT A BOX OF TIME ──────────────────────────────────────
 *
 * Minutes per day and days per week are still collected and still shown — "Day 24 · about 55
 * minutes", "at this rate you finish around March" — and they still decide how much is offered
 * in one sitting. They do not decide which days exist, how many there are, or what is in them. A
 * student with three hours works through several day-units in a sitting; a student with thirty
 * minutes takes longer in calendar time and gets all ninety.
 *
 * ── FIRST-YEAR DEPTH THROUGHOUT ───────────────────────────────────────────────────────────
 *
 * Half the spine is foundations, and every band after is shorter than the thing it builds on.
 * The resume band is a first-year exercise — writing down what you built, the week you built it —
 * and is placed immediately after the capstone for that reason. Mock interviews and placement
 * preparation are real parts of CareerPilot and stay outside the ninety days, where they belong.
 */

import { DirectionKey } from './careerDirectionPolicy';

export const NINETY_DAY_VERSION = 'NINETY_DAY_SPINE_V1';

/** The length of a first year, in day-units. Every student gets exactly this many. */
export const SPINE_DAYS = 90;

export type BandKey =
  | 'ORIENTATION'
  | 'PROGRAMMING'
  | 'DIRECTION'
  | 'AI'
  | 'PROJECT'
  | 'SHOW_YOUR_WORK'
  | 'CHECKPOINT';

/**
 * What makes one student's band different from another's.
 *
 * `SHARED` bands are authored once and never get a language or direction variant, which is why
 * AI and the resume work are the cheapest bands to build and the first that can ship.
 * `COMPUTED` is not chosen from a shelf at all — it is assembled from this student's own record.
 */
export type BandVariance = 'SHARED' | 'LANGUAGE' | 'DIRECTION' | 'COMPUTED';

export interface SpineBand {
  key: BandKey;
  label: string;
  /** What the student is doing in it, in their words. */
  blurb: string;
  days: number;
  fromDay: number;
  toDay: number;
  variance: BandVariance;
}

/**
 * The spine. Seven bands, ninety days.
 *
 * ORDER IS LOAD-BEARING and the day numbers are derived from it below, so a band cannot silently
 * disagree with its own range. Changing a band's length changes where every later band starts,
 * which is the correct behaviour and the reason the ranges are computed rather than typed.
 */
const BAND_SHAPE: { key: BandKey; label: string; blurb: string; days: number; variance: BandVariance }[] = [
  {
    key: 'ORIENTATION', days: 15, variance: 'SHARED',
    label: 'Getting oriented',
    blurb: 'How a computer actually runs, files and the command line, breaking problems down, '
      + 'pseudocode and dry running. No language yet, and nothing anybody can skip.',
  },
  {
    key: 'PROGRAMMING', days: 30, variance: 'LANGUAGE',
    label: 'Programming foundations',
    blurb: 'Variables and types, conditions, loops, functions, arrays and strings, debugging and '
      + 'reading errors. The largest band by a wide margin, because every later band stands on it.',
  },
  {
    key: 'DIRECTION', days: 13, variance: 'DIRECTION',
    label: 'Direction track',
    blurb: 'Where a first year starts to point somewhere: the web, operating systems and the '
      + 'shell, or data and SQL. Still first-year depth throughout.',
  },
  {
    key: 'AI', days: 10, variance: 'SHARED',
    label: 'AI literacy and working with AI',
    blurb: 'What these systems are and where they are wrong, why the same question gives two '
      + 'answers, prompting, using them responsibly, and checking code you did not write.',
  },
  {
    key: 'PROJECT', days: 10, variance: 'DIRECTION',
    label: 'Applied project',
    blurb: 'One thing built end to end. Ten days because a project that fits in three is a '
      + 'tutorial, and a first year needs to have finished something.',
  },
  {
    key: 'SHOW_YOUR_WORK', days: 7, variance: 'SHARED',
    label: 'Show your work',
    blurb: 'A first resume and a portfolio entry, explaining technical work to someone who was '
      + 'not there, and what the roles actually are. Straight after the project, while it is true.',
  },
  {
    key: 'CHECKPOINT', days: 5, variance: 'COMPUTED',
    label: 'Consolidation and checkpoint',
    blurb: 'Revision drawn from your own weakest days, then a paper that re-measures what the '
      + 'ninety days were supposed to move.',
  },
];

export const SPINE_BANDS: SpineBand[] = (() => {
  let cursor = 1;
  return BAND_SHAPE.map(b => {
    const band: SpineBand = { ...b, fromDay: cursor, toDay: cursor + b.days - 1 };
    cursor += b.days;
    return band;
  });
})();

/**
 * The spine must add up, and this is checked at import rather than in a test.
 *
 * A band edited to 12 days without another losing 3 would produce an 87-day plan that every
 * screen would report as ninety — the exact class of quiet mismatch this whole model exists to
 * remove. Failing on load is loud, early, and impossible to deploy past.
 */
const TOTAL = SPINE_BANDS.reduce((n, b) => n + b.days, 0);
if (TOTAL !== SPINE_DAYS) {
  throw new Error(`Ninety-day spine adds to ${TOTAL}, not ${SPINE_DAYS}. Adjust the bands.`);
}

export const bandFor = (day: number): SpineBand | null =>
  SPINE_BANDS.find(b => day >= b.fromDay && day <= b.toDay) || null;

export const bandByKey = (key: string): SpineBand | null =>
  SPINE_BANDS.find(b => b.key === key) || null;

/**
 * How much of a day-unit a student is served.
 *
 * DEPTH IS NOT A SEPARATE DAY-UNIT. Authoring a full, standard and review version of every day
 * would triple a content programme that is already the long pole, to express something the steps
 * already say: a review is the same topic with fewer steps, not different material. So a depth
 * selects which steps of one authored day are served.
 */
export type DayDepth = 'FULL' | 'STANDARD' | 'REVIEW';

/**
 * Which learning phases survive at each depth.
 *
 * REVIEW keeps only the phases that ask the student to do something. Somebody who already
 * demonstrated a topic does not need the explanation again; they need to prove it still holds,
 * and being made to sit through the introduction is how a plan loses a strong student.
 */
export const PHASES_AT_DEPTH: Record<DayDepth, string[] | null> = {
  // null means every phase, including the optional extras.
  FULL: null,
  STANDARD: ['UNDERSTAND', 'LEARN', 'TRY', 'PRACTICE', 'CHECK'],
  REVIEW: ['PRACTICE', 'CHECK', 'REVIEW'],
};

/**
 * Depth from the evidence, in ONE place.
 *
 * UNMEASURED IS NOT WEAK. A student nobody has asked about gets the standard day, not the
 * remedial one — assuming the worst about somebody we never tested is the same mistake as
 * assuming the best, and it is the more insulting of the two.
 */
export function depthFor(state: string | null | undefined): DayDepth {
  switch (String(state || '').toUpperCase()) {
    case 'VERIFIED':            return 'REVIEW';
    case 'FOUNDATION_REQUIRED': return 'FULL';
    case 'GUIDED':
    case 'REVISION':
    case 'NOT_EXPOSED':
    default:                    return 'STANDARD';
  }
}

/** Every axis a day-unit can be narrowed on. Mirrors the audience the content layer already uses. */
export interface SpineAudience {
  languages?: string[];
  directions?: DirectionKey[] | string[];
  years?: string[];
  branches?: string[];
}

const norm = (v: any): string => String(v ?? '').trim().toLowerCase();

/**
 * An axis holds when it is unconstrained, or when the student's value is listed.
 *
 * Deliberately the same rule `resourceServes` applies to content, so a day-unit and the steps
 * inside it cannot disagree about who they are for. A student who is shown a day and then served
 * none of its steps has been handed an empty lesson, which reads as a broken product.
 */
const axisHolds = (allowed: string[] | undefined, value: string | null | undefined): boolean => {
  if (!allowed || !allowed.length) return true;
  return allowed.some(a => norm(a) === norm(value));
};

export interface SpineStudent {
  language?: string | null;
  direction?: string | null;
  year?: string | null;
  branch?: string | null;
}

export const audienceServes = (a: SpineAudience | undefined, s: SpineStudent): boolean =>
  axisHolds(a?.languages as string[], s.language)
  && axisHolds(a?.directions as string[], s.direction)
  && axisHolds(a?.years as string[], s.year)
  && axisHolds(a?.branches as string[], s.branch);
