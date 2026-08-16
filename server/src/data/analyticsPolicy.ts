/**
 * ANALYTICS_V1 — what the numbers mean, and what they are allowed to claim.
 *
 * Analytics owns no data. Every figure here is read from the module that already decides
 * it: Skill DNA from Module 7, readiness from Module 8, roadmaps from Module 9, XP from
 * Module 11, before/after from Module 13. This file holds only the reporting rules — the
 * range semantics, the cohort vocabulary, and the distinction between a metric that
 * describes right now and one that describes a period.
 *
 * TWO KINDS OF METRIC, NEVER MIXED. "Active members" is a fact about today; "students
 * active in the last 30 days" is a fact about a window. Labelling one as the other is the
 * easiest way to make a dashboard lie without a single wrong query, so every metric this
 * module reports declares which it is.
 */

export const ANALYTICS_VERSION = 'ANALYTICS_V1';

/**
 * A metric describing the world as it is now, or one describing what happened in a window.
 *
 * A SNAPSHOT ignores the selected range entirely — filtering "how many members exist" by
 * last month would answer a question nobody asked. A PERIOD metric is meaningless without
 * one. The response says which, so a reader knows whether the date picker applies.
 */
export type MetricKind = 'SNAPSHOT' | 'PERIOD';

/** How complete a metric's underlying data is. Reported rather than assumed. */
export type Coverage = 'available' | 'partial' | 'unavailable';

export const DEFAULT_RANGE_DAYS = 30;
export const MAX_RANGE_DAYS = 400;

export interface DateRange {
  from: Date;
  to: Date;
  days: number;
}

export interface RangeError {
  ok: false;
  message: string;
}

export type RangeOutcome = ({ ok: true } & DateRange) | RangeError;

/**
 * Resolve and validate a requested range.
 *
 * UTC THROUGHOUT. Everything in this database is stored in UTC, and a dashboard that
 * silently applied the server's local day boundary would report different numbers depending
 * on where it was deployed. The boundaries are stated in the response so a reader can see
 * which day a figure belongs to rather than inferring it.
 *
 * BOUNDED, because an unbounded range is an unbounded scan. MAX_RANGE_DAYS is a little over
 * a year, which covers every "compared with last year" question anybody asks of a product
 * that has not existed for two.
 */
export function resolveRange(input: { from?: unknown; to?: unknown }, now: Date = new Date()): RangeOutcome {
  const parse = (v: unknown): Date | null => {
    if (v === undefined || v === null || v === '') return null;
    const d = new Date(String(v));
    return Number.isNaN(d.getTime()) ? null : d;
  };

  if (input.from !== undefined && input.from !== '' && !parse(input.from)) {
    return { ok: false, message: '`from` is not a valid date.' };
  }
  if (input.to !== undefined && input.to !== '' && !parse(input.to)) {
    return { ok: false, message: '`to` is not a valid date.' };
  }

  const to = parse(input.to) || now;
  const from = parse(input.from) || new Date(to.getTime() - DEFAULT_RANGE_DAYS * 86_400_000);

  if (from.getTime() > to.getTime()) {
    return { ok: false, message: '`from` is after `to`.' };
  }

  const days = Math.ceil((to.getTime() - from.getTime()) / 86_400_000);
  if (days > MAX_RANGE_DAYS) {
    return { ok: false, message: `Range is longer than ${MAX_RANGE_DAYS} days. Narrow it.` };
  }

  return { ok: true, from, to, days };
}

/**
 * One documented metric.
 *
 * A number without its denominator is not a metric, it is a rumour. Every percentage this
 * module reports carries the two counts it came from and the cohort the denominator names,
 * so a reader can check the arithmetic rather than trusting the label.
 */
export interface Metric {
  key: string;
  label: string;
  kind: MetricKind;
  value: number | null;
  /** Present for rates. Null `value` with a zero denominator means NO DATA, not 0%. */
  numerator?: number;
  denominator?: number;
  /** Which population the denominator counts. */
  cohort?: string;
  coverage: Coverage;
  /** Why a figure is partial or missing, in the reader's terms. */
  note?: string;
}

/**
 * A rate, or an honest absence.
 *
 * ZERO DENOMINATOR IS NOT ZERO PERCENT. A tenant with no members has not achieved 0%
 * assessment completion; nothing has happened yet. Returning null and letting the screen
 * say "no data" is the difference between a dashboard that reports and one that accuses.
 */
export function rate(numerator: number, denominator: number): number | null {
  if (!denominator) return null;
  return Math.round((numerator / denominator) * 100);
}
