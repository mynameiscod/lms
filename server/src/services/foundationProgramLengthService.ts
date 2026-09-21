/**
 * How long a Foundation journey is, for this tenant, for journeys composed from now on.
 *
 * ── WHY THIS IS NOT A CONSTANT ANY MORE ───────────────────────────────────────────────────
 *
 * `FOUNDATION_PROGRAM_DAYS` was written as an invariant: ninety days for every Year-1 student,
 * with personalisation changing what the days contain and never how many there are. That is a
 * good rule for one programme. It stopped being the only rule when a college wanted a longer
 * first year — the promise is still "every student on this programme gets the same number of
 * days", but the number belongs to the programme, not to the code.
 *
 * ── THE TWO NUMBERS, AND WHICH ONE WINS ───────────────────────────────────────────────────
 *
 * The tenant setting decides the length of journeys that have not been composed yet. A journey
 * that exists carries its own `totalDays`, and that is what every reader must use: a student
 * part-way through ninety days must not wake up inside a hundred and twenty, with a finish line
 * moved and days they had already been shown rewritten. Changing the setting therefore changes
 * the next student, not the current one.
 *
 * Bounds exist because the number is a promise a tenant has to keep: a journey shorter than a
 * month is not a programme, and one longer than half a year cannot be composed from any
 * curriculum we would call a first year.
 */

import mongoose from 'mongoose';
import PassportConfig from '../models/PassportConfig';
import { FOUNDATION_PROGRAM_DAYS } from '../data/ninetyDayPolicy';

export const MIN_PROGRAM_DAYS = 30;
export const MAX_PROGRAM_DAYS = 180;

/** The default, and what an unconfigured tenant keeps getting. */
export const DEFAULT_PROGRAM_DAYS = FOUNDATION_PROGRAM_DAYS;

/** A whole number of days inside the bounds, or a reason it is not. */
export function validateProgramDays(value: unknown): { ok: true; days: number } | { ok: false; error: string } {
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    return { ok: false, error: 'The programme length must be a whole number of days.' };
  }
  if (n < MIN_PROGRAM_DAYS || n > MAX_PROGRAM_DAYS) {
    return { ok: false, error: `The programme length must be between ${MIN_PROGRAM_DAYS} and ${MAX_PROGRAM_DAYS} days.` };
  }
  return { ok: true, days: n };
}

/**
 * The length the next journey composed for this tenant will be.
 *
 * Reading a setting must never be the thing that stops a student getting a plan, so anything that
 * goes wrong here — no database, a slow one, a stored value out of bounds — answers the default
 * rather than throwing. Without the connection check an unconnected process (a unit test, a script)
 * waits for Mongoose's buffering timeout before finding that out.
 */
export async function foundationProgramDaysFor(tenantId: string): Promise<number> {
  if (!tenantId) return DEFAULT_PROGRAM_DAYS;
  if (mongoose.connection?.readyState !== 1) return DEFAULT_PROGRAM_DAYS;

  let cfg: any = null;
  try {
    cfg = await PassportConfig.findOne({ tenantId }).select('foundationProgramDays').maxTimeMS(2000).lean() as any;
  } catch (e: any) {
    console.warn(`[foundation] could not read the programme length for ${tenantId}: ${e?.message || e}`);
    return DEFAULT_PROGRAM_DAYS;
  }
  const raw = cfg?.foundationProgramDays;
  if (raw === undefined || raw === null) return DEFAULT_PROGRAM_DAYS;
  const checked = validateProgramDays(raw);
  // A stored value outside the bounds is a configuration fault, not a reason to refuse a student
  // their plan: fall back to the default rather than composing a journey nobody can finish.
  return checked.ok ? checked.days : DEFAULT_PROGRAM_DAYS;
}

/**
 * The length of a journey that already exists, which is the only number its reader may use.
 *
 * Falls back to the tenant's setting when a curriculum predates the field, so an older journey
 * is read as the programme it was composed under rather than as a broken one.
 */
export function journeyDaysOf(curriculum: { totalDays?: number | null } | null | undefined, fallback: number): number {
  const n = Number(curriculum?.totalDays);
  return Number.isInteger(n) && n >= MIN_PROGRAM_DAYS && n <= MAX_PROGRAM_DAYS ? n : fallback;
}
