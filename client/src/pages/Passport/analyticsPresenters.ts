import { AnalyticsCoverage, CoverageNote, HealthFindingView } from '../../api/passportApi';

/**
 * How an analytics figure is turned into something a screen can render.
 *
 * NO CALCULATION HERE. Not one number is derived, averaged or classified — the server owns
 * every metric, and a percentage recomputed in React would be a second opinion that drifts
 * from the API the moment either changes. These functions choose WORDS for values the
 * server already produced.
 *
 * FIVE STATES, NEVER FOUR. Loading, error, unavailable, no-data and zero are different
 * facts and must look different. "0%" and "nobody has reassessed yet" are opposite
 * findings, and a dashboard that shows the first when it means the second is worse than one
 * that shows nothing — it invites a decision based on a number that was never measured.
 */

export type CellState = 'value' | 'zero' | 'no-data' | 'unavailable';

export interface Cell {
  state: CellState;
  /** What to put on the screen. Never '0%' unless the server actually measured zero. */
  display: string;
  /** Why, when there is nothing to show. Rendered as help text, never hidden. */
  note?: string;
}

const isNote = (c: any): c is CoverageNote => !!c && typeof c === 'object' && 'coverage' in c;

export const coverageOf = (c?: AnalyticsCoverage | CoverageNote): AnalyticsCoverage =>
  (isNote(c) ? c.coverage : c) || 'available';

export const reasonOf = (c?: AnalyticsCoverage | CoverageNote): string | undefined =>
  (isNote(c) ? c.reason : undefined);

/**
 * A count. Zero is a real answer here — nobody has done the thing yet, and saying so is
 * accurate.
 */
export function countCell(value: number | null | undefined): Cell {
  if (value === null || value === undefined) return { state: 'no-data', display: 'No data' };
  if (value === 0) return { state: 'zero', display: '0' };
  return { state: 'value', display: value.toLocaleString('en-IN') };
}

/**
 * A percentage.
 *
 * NULL IS NOT ZERO. The server returns null when the denominator is empty, which means
 * nothing has happened — not that nothing succeeded.
 */
export function percentCell(
  value: number | null | undefined,
  opts: { denominator?: number | null; emptyNote?: string } = {},
): Cell {
  if (value === null || value === undefined) {
    return {
      state: 'no-data',
      display: 'No data',
      note: opts.emptyNote
        || (opts.denominator === 0 ? 'Nobody is in this group yet.' : 'Not enough data to calculate this.'),
    };
  }
  return { state: value === 0 ? 'zero' : 'value', display: `${value}%` };
}

/** A metric the server cannot produce at all. Its reason is always shown. */
export function unavailableCell(reason?: string): Cell {
  return {
    state: 'unavailable',
    display: 'Unavailable',
    note: reason || 'This figure is not available for cohort analytics.',
  };
}

/**
 * Pick the right cell for a figure that may be unavailable.
 *
 * The order matters: an unavailable metric must never fall through to the percentage
 * branch, where a null would render as "No data" and read as "we looked and found none".
 */
export function figure(
  value: number | null | undefined,
  coverage?: AnalyticsCoverage | CoverageNote,
  opts: { percent?: boolean; denominator?: number | null } = {},
): Cell {
  if (coverageOf(coverage) === 'unavailable') return unavailableCell(reasonOf(coverage));
  return opts.percent ? percentCell(value, opts) : countCell(value);
}

// ── health presentation ─────────────────────────────────────────────────────

/**
 * NEVER COLOUR ALONE. Each severity carries a word and a glyph as well as a tone, so the
 * meaning survives a monochrome screen, a projector, and the roughly one in twelve men who
 * cannot separate the red from the green.
 */
export const SEVERITY: Record<HealthFindingView['severity'], { label: string; icon: string; tone: string }> = {
  ERROR:   { label: 'Error',   icon: 'bi-x-octagon-fill',       tone: 'err' },
  WARNING: { label: 'Warning', icon: 'bi-exclamation-triangle-fill', tone: 'warn' },
  INFO:    { label: 'Info',    icon: 'bi-info-circle-fill',     tone: 'info' },
};

export const AREA_STATUS: Record<string, { label: string; icon: string; tone: string }> = {
  PASS:    { label: 'Pass',    icon: 'bi-check-circle-fill', tone: 'ok' },
  WARNING: { label: 'Warning', icon: 'bi-exclamation-triangle-fill', tone: 'warn' },
  FAIL:    { label: 'Fail',    icon: 'bi-x-octagon-fill', tone: 'err' },
};

export const LAUNCH_STATUS: Record<string, { label: string; blurb: string; tone: string }> = {
  READY: {
    label: 'Ready',
    blurb: 'Every check we run has passed. That is not a guarantee — it does not measure load or data quality.',
    tone: 'ok',
  },
  READY_WITH_WARNINGS: {
    label: 'Ready with warnings',
    blurb: 'Nothing is blocking, but the warnings below are worth clearing before you launch.',
    tone: 'warn',
  },
  NOT_READY: {
    label: 'Not ready',
    blurb: 'At least one error must be fixed. A single error blocks — it is not offset by passing areas.',
    tone: 'err',
  },
};

/** Bounded ranges, matching exactly what the server accepts. */
export const RANGES: { key: string; label: string; days: number }[] = [
  { key: '7d', label: 'Last 7 days', days: 7 },
  { key: '30d', label: 'Last 30 days', days: 30 },
  { key: '90d', label: 'Last 90 days', days: 90 },
];

/** ISO bounds for a preset. The client never invents a window the API would refuse. */
export function rangeParams(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime() - days * 86_400_000);
  return { from: from.toISOString(), to: to.toISOString() };
}
