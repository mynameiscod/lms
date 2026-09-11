import {
  SPINE_BANDS, SPINE_DAYS, NINETY_DAY_VERSION, BandKey, DayDepth,
  SpineAudience, SpineStudent, audienceServes, depthFor,
} from '../data/ninetyDayPolicy';

/**
 * Choose a student's ninety days.
 *
 * ── WHAT IT DOES AND DOES NOT DECIDE ──────────────────────────────────────────────────────
 *
 * It decides WHICH authored day-units fill each band and HOW DEEP each one goes. It does not
 * decide what a day teaches — that is the curriculum's job — and it never invents a day. A band
 * it cannot fill is reported, loudly, rather than quietly producing a shorter plan: a silently
 * seventy-eight-day plan is exactly the bug this model was built to remove.
 *
 * ── PURE, AND DELIBERATELY SO ─────────────────────────────────────────────────────────────
 *
 * No database, no clock, no randomness. Everything it needs is passed in, which is what makes
 * "the same student always gets the same ninety days" a property that can be tested rather than
 * a claim — and what lets the band, audience and depth rules be exercised without a Mongo
 * instance. The same discipline the roadmap planner already holds.
 *
 * ── TWO INPUTS, TWO DIFFERENT JOBS ────────────────────────────────────────────────────────
 *
 * Year, branch, direction and language choose WHICH days. They are known for every student from
 * the moment they onboard, and they are what actually separates a first-year web student from a
 * first-year systems student.
 *
 * Skill evidence chooses HOW DEEP each chosen day goes. It cannot choose the days: we measure
 * tens of skills and a curriculum large enough to serve every track touches well over a hundred,
 * so for most of the pool there is no evidence at all. "Personalise by score" would quietly
 * become "give them everything they were not asked about", which is barely personalisation.
 */

export interface SelectableDayUnit {
  dayUnitId: string;
  band: BandKey;
  displayOrder: number;
  title: string;
  skillKey: string;
  journeyTopic: string;
  subtopics: string[];
  audience?: SpineAudience;
  estimatedMinutes?: number;
}

export interface SelectorInput {
  units: SelectableDayUnit[];
  student: SpineStudent;
  /**
   * The student's per-topic verdict, keyed by skillKey. Absent means unmeasured, which is a
   * STANDARD day rather than a remedial one.
   */
  states?: Map<string, string>;
  /**
   * Skills the student is weakest in, strongest first, for the computed checkpoint band. The
   * caller already has this from readiness; recomputing it here would be a second opinion about
   * something Module 8 has already answered.
   */
  weakestSkills?: string[];
}

export interface SelectedDay {
  day: number;
  band: BandKey;
  dayUnitId: string;
  title: string;
  skillKey: string;
  journeyTopic: string;
  subtopics: string[];
  depth: DayDepth;
  estimatedMinutes: number;
}

export interface BandShortfall {
  band: BandKey;
  needed: number;
  available: number;
}

/**
 * One shape, not a union.
 *
 * A discriminated union would make every caller narrow before it could read either half, and a
 * caller almost always wants both: the days it did get, AND what is missing. A screen that shows
 * "62 of 90 days — the AI band is four short" needs them together.
 */
export interface SelectorResult {
  ok: boolean;
  version: string;
  days: SelectedDay[];
  /** Empty when ok. Every band that could not be filled, in spine order. */
  shortfalls: BandShortfall[];
}

/**
 * Candidates for one band, narrowed to this student and put in the author's order.
 *
 * Order is `displayOrder` and then the id. The id tie-break exists so two units an author left
 * on the same order still come out the same way every time — without it, "the same student gets
 * the same plan" would depend on the order the database happened to return rows in.
 */
function candidatesFor(band: BandKey, input: SelectorInput): SelectableDayUnit[] {
  return input.units
    .filter(u => u.band === band && audienceServes(u.audience, input.student))
    .sort((a, b) => (a.displayOrder - b.displayOrder) || a.dayUnitId.localeCompare(b.dayUnitId));
}

/**
 * The consolidation band, assembled from this student's own record.
 *
 * NOT CHOSEN FROM A SHELF, AND NEVER A REASON TO BE SHORT. Every other band depends on somebody
 * having authored enough material; this one does not, because it revisits days the student
 * already has. Eighty-five days precede it, so it can always be filled — which makes it the one
 * band that is free, and the one that must never report a shortfall while a plan exists.
 *
 * The order is the order of use: what they did worst at, then what they saw most recently.
 * Weakest-first is the point of a consolidation band; recency is the honest tie-break, because
 * the day before the checkpoint is the one least likely to have settled.
 *
 * NOTHING HERE IS NEW MATERIAL. Every candidate is a day already in this student's own plan.
 * Revising something they were never taught would be a checkpoint on material they never met.
 */
function checkpointDays(band: BandKey, input: SelectorInput, chosen: SelectedDay[], need: number): SelectableDayUnit[] {
  const out: SelectableDayUnit[] = [];
  const take = (d: SelectedDay) => {
    if (out.length >= need) return;
    if (out.some(o => o.dayUnitId === d.dayUnitId)) return;
    out.push({
      dayUnitId: d.dayUnitId, band, displayOrder: out.length,
      title: d.title, skillKey: d.skillKey, journeyTopic: d.journeyTopic,
      subtopics: d.subtopics, estimatedMinutes: d.estimatedMinutes,
    });
  };

  // An authored checkpoint day — a paper that re-measures — comes first when one exists. It is
  // the only part of this band a curriculum can contribute to.
  for (const u of candidatesFor(band, input)) {
    if (out.length >= need) break;
    if (!out.some(o => o.dayUnitId === u.dayUnitId)) out.push(u);
  }

  // Then their weakest skills, weakest first.
  for (const skill of input.weakestSkills || []) {
    for (const d of chosen) if (d.skillKey === skill) take(d);
  }

  // Then the most recent days, which is what stops this band ever being the short one.
  for (let i = chosen.length - 1; i >= 0 && out.length < need; i--) take(chosen[i]);

  return out.slice(0, need);
}

export function selectNinetyDays(input: SelectorInput): SelectorResult {
  const days: SelectedDay[] = [];
  const shortfalls: BandShortfall[] = [];
  const states = input.states || new Map<string, string>();

  let day = 1;

  for (const band of SPINE_BANDS) {
    const need = band.days;
    const pool = band.variance === 'COMPUTED'
      ? checkpointDays(band.key, input, days, need)
      : candidatesFor(band.key, input);

    if (pool.length < need) {
      shortfalls.push({ band: band.key, needed: need, available: pool.length });
    }

    /**
     * Take what there is, in order, and never more than the band holds.
     *
     * A band with a surplus does NOT spill into the next one. The bands are a teaching shape, and
     * letting programming run thirty-four days because somebody authored four extra would push
     * the project past day ninety and quietly cut the checkpoint — which is how a structure stops
     * being a structure.
     */
    for (const unit of pool.slice(0, need)) {
      days.push({
        day,
        band: band.key,
        dayUnitId: unit.dayUnitId,
        title: unit.title,
        skillKey: unit.skillKey,
        journeyTopic: unit.journeyTopic,
        subtopics: unit.subtopics || [],
        depth: depthFor(states.get(unit.skillKey)),
        estimatedMinutes: Number(unit.estimatedMinutes) || 0,
      });
      day++;
    }

    // A short band leaves its day numbers unused rather than pulling the next band forward, so
    // the shortfall is visible as a hole at exactly the place it happened.
    day = band.toDay + 1;
  }

  if (shortfalls.length) {
    return { ok: false, version: NINETY_DAY_VERSION, shortfalls, days };
  }


  /**
   * Belt and braces. The bands are checked at import and the loop above cannot overfill one, so
   * this can only trip if somebody changes the shape of the loop — which is precisely when a
   * plan would silently stop being ninety days long.
   */
  if (days.length !== SPINE_DAYS) {
    return {
      ok: false,
      version: NINETY_DAY_VERSION,
      shortfalls: [{ band: 'ORIENTATION', needed: SPINE_DAYS, available: days.length }],
      days,
    };
  }

  return { ok: true, version: NINETY_DAY_VERSION, days, shortfalls: [] };
}

/**
 * How much of the spine a tenant's authored content can currently fill, per band.
 *
 * FOR THE PEOPLE WRITING IT, not for a student. Nobody could see the shortfall until a student
 * complained — which is exactly how the twenty-eight-day plan reached production. A content team
 * needs "this track fills 34 of 90" on a screen, and which band is thinnest.
 */
export interface CoverageRow {
  band: BandKey;
  label: string;
  needed: number;
  available: number;
  complete: boolean;
}

export function spineCoverage(input: SelectorInput): { rows: CoverageRow[]; filled: number; total: number } {
  const rows = SPINE_BANDS.map(band => {
    const available = candidatesFor(band.key, input).length;
    return {
      band: band.key,
      label: band.label,
      needed: band.days,
      available,
      complete: available >= band.days,
    };
  });
  return {
    rows,
    filled: rows.reduce((n, r) => n + Math.min(r.needed, r.available), 0),
    total: SPINE_DAYS,
  };
}
