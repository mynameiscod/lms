/**
 * How a composed sequence of units becomes the days a student actually opens.
 *
 * ── WHY A DAY IS NOT ALWAYS ONE UNIT ──────────────────────────────────────────────────────
 *
 * Foundation composes exactly as many units as there are days, so a day is one unit and this policy
 * changes nothing for it. Year 2 cannot work that way: its curriculum is a bank of several hundred
 * units and the admin sets the length — 90, 110, 120, 150. The same curriculum therefore has to
 * arrive in whatever number of days was set, which means some days carry two units and, at the
 * shortest lengths, three.
 *
 * ── WHAT PACKING MAY NEVER DO ─────────────────────────────────────────────────────────────
 *
 * ORDER IS NEVER CHANGED. The composer emits units with every prerequisite before the unit that
 * needs it. Packing only draws the day boundaries between them; it never moves a unit past another.
 * A student who cannot write a loop still meets loops before functions, whatever the length.
 *
 * THE WORK IS NEVER REMOVED. Packing changes how many days the same work is spread over, not how
 * much work there is. What a student is TAUGHT rather than merely checked is decided earlier, by
 * their evidence — see unitSuitabilityPolicy. Shortening a programme must not silently drop content.
 *
 * A DAY STAYS DOABLE. Every packed day respects a minutes budget, so "120 days" cannot become
 * sixty impossible days. A project or a checkpoint owns its day outright: the day a student builds
 * something is not also the day they meet two new ideas.
 *
 * ── DETERMINISTIC ─────────────────────────────────────────────────────────────────────────
 *
 * Same units, same options, same days — always. Recomposition depends on it: a plan that repacked
 * differently on each run would rewrite days nobody's evidence had moved.
 */

/** Just enough of a unit to place it in a day. Structural, so composer output and tests both fit. */
export interface PackableUnit {
  unitCode: string;
  unitType: string;
  estimatedMinutes: number;
  topicCode: string;
}

export interface PackOptions {
  /** Exactly how many days the result must have. The programme's promise. */
  days: number;
  /** The most work one day may hold, in minutes. */
  budgetMinutes: number;
  /** The most units one day may hold, however short they are. */
  maxUnitsPerDay: number;
}

export interface PackResult {
  ok: boolean;
  /** Why the units could not be packed into exactly `days` days. */
  reason?: 'TOO_FEW_UNITS' | 'CANNOT_PACK';
  /** How many more (or fewer, when negative) units the caller should compose to make it fit. */
  unitsShortBy?: number;
  days: PackableUnit[][];
}

/**
 * Work a student produces rather than receives. Each owns its day.
 *
 * A project is the day's work by definition, and a checkpoint measures what came before it — pairing
 * either with a new lesson makes the lesson an afterthought and the measurement unfair.
 */
export const SOLO_UNIT_TYPES: readonly string[] = ['PROJECT', 'CHECKPOINT'];

/** The shipped Year-2 budget: a full day of study, at the length the admin chose. */
export const DEFAULT_DAY_BUDGET_MINUTES = 100;
export const DEFAULT_MAX_UNITS_PER_DAY = 3;

const isSolo = (u: PackableUnit) => SOLO_UNIT_TYPES.includes(String(u.unitType));

/**
 * How many units from `from` onward own a day to themselves.
 *
 * Walked rather than cached because the packer runs once per journey over a few hundred units,
 * and a stale count here would be a plan that silently fails to fit.
 */
const soloCountFrom = (units: PackableUnit[], from: number): number => {
  let n = 0;
  for (let k = Math.max(0, from); k < units.length; k++) if (isSolo(units[k])) n++;
  return n;
};
const minutesOf = (day: PackableUnit[]) => day.reduce((n, u) => n + (Number(u.estimatedMinutes) || 0), 0);

/**
 * Draw day boundaries through an ordered sequence of units.
 *
 * Starts from one unit per day — which IS the answer whenever the composer supplied exactly as many
 * units as there are days — and then joins adjacent days until the count matches. Joins are chosen
 * by what makes the best day, not by position: the same topic first, then the lightest pair, so the
 * days that grow are the ones that belong together and the heavy ones are left alone.
 */
export function packIntoDays(units: PackableUnit[], opts: PackOptions): PackResult {
  const days = Math.max(1, Math.floor(opts.days));
  const budget = Math.max(1, opts.budgetMinutes);
  const maxPerDay = Math.max(1, Math.floor(opts.maxUnitsPerDay));

  if (units.length < days) {
    return { ok: false, reason: 'TOO_FEW_UNITS', unitsShortBy: days - units.length, days: [] };
  }

  /** The one case that needs no arithmetic — and the only one Foundation ever reaches. */
  if (units.length === days) return { ok: true, days: units.map(x => [x]) };

  /**
   * Walk the sequence once, deciding where each day ends.
   *
   * Each day takes its even share of what is left — `ceil(remaining / daysLeft)` — bounded by what
   * must be taken so the rest still fits, and by what may be taken so every later day keeps at
   * least one unit. That keeps the load level across the programme instead of leaving light days at
   * the front and impossible ones at the end.
   */
  const packed: PackableUnit[][] = [];
  let i = 0;
  for (let day = 0; day < days; day++) {
    const daysLeft = days - day;
    const remaining = units.length - i;
    if (remaining < daysLeft) return { ok: false, reason: 'CANNOT_PACK', unitsShortBy: daysLeft - remaining, days: [] };

    /*
     * Below this, the units left over cannot fit in the days left over.
     *
     * ── SOLO UNITS MAKE THE LATER DAYS SMALLER, AND THIS HAS TO KNOW ──────────────────────
     *
     * This assumed every remaining day could hold `maxPerDay`. Projects and checkpoints own a
     * day each, so a plan with thirty-seven of them has thirty-seven days that hold exactly one.
     * Counting them as full days made `mustTake` larger than the days could really absorb; the
     * solo rule below then cut the day short, `take` fell under that inflated floor, and the
     * packer refused the whole plan.
     *
     * The effect was invisible until density raised the unit count: a strong second-year
     * composed 294 units, 37 of them solo, and every combination of cap and budget failed —
     * which read as "no budget is large enough" when the budget was never the problem.
     *
     * Counting the solo units ahead gives the real capacity of the days that remain.
     */
    const soloAhead = soloCountFrom(units, i + 1);
    const laterCapacity = Math.max(0, (daysLeft - 1) * maxPerDay - soloAhead * (maxPerDay - 1));
    const mustTake = Math.max(1, remaining - laterCapacity);
    /* Above this, a later day would be left with nothing. */
    const mayTake = Math.min(maxPerDay, remaining - (daysLeft - 1));
    if (mustTake > mayTake) return { ok: false, reason: 'CANNOT_PACK', days: [] };

    let take = Math.min(mayTake, Math.max(mustTake, Math.ceil(remaining / daysLeft)));

    /* Work a student produces owns the day: one unit, and only if it is the first one taken. */
    if (isSolo(units[i])) {
      take = 1;
    } else {
      for (let k = 1; k < take; k++) if (isSolo(units[i + k])) { take = k; break; }
      while (take > mustTake && minutesOf(units.slice(i, i + take)) > budget) take--;
      /* A day about one thing reads as a day rather than as a list — but only where it is free. */
      while (take > mustTake && take > 1 && units[i + take - 1].topicCode !== units[i].topicCode) take--;
    }

    if (take < mustTake) return { ok: false, reason: 'CANNOT_PACK', days: [] };
    if (take > 1 && minutesOf(units.slice(i, i + take)) > budget) {
      /* Forced past the budget: the caller must compose fewer units rather than have this policy
         quietly hand a student a day nobody could finish. */
      return { ok: false, reason: 'CANNOT_PACK', days: [] };
    }

    packed.push(units.slice(i, i + take));
    i += take;
  }

  if (i !== units.length) return { ok: false, reason: 'CANNOT_PACK', unitsShortBy: -(units.length - i), days: [] };
  return { ok: true, days: packed };
}

/**
 * How many units to ask the composer for, to fill this many days.
 *
 * A first estimate only: the composer answers with what the curriculum can actually supply, and the
 * caller packs and adjusts. Foundation passes `oneUnitPerDay`, which keeps its plans exactly as they
 * have always been.
 */
export function targetUnitsFor(days: number, opts?: { budgetMinutes?: number; averageUnitMinutes?: number }): number {
  const budget = opts?.budgetMinutes ?? DEFAULT_DAY_BUDGET_MINUTES;
  const average = Math.max(1, opts?.averageUnitMinutes ?? 50);
  const perDay = Math.max(1, Math.round(budget / average));
  return Math.max(days, days * perDay);
}
