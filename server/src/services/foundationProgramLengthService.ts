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

/**
 * What each stage is by default, before any admin has said otherwise.
 *
 * One number per stage, for the same reason there is one per tenant: the promise is "every
 * student on this programme gets the same number of days", and Year 2 is a different programme
 * from Year 1. A single tenant-wide setting would have made a college that wanted 110 days of
 * Year 2 re-cut Year 1 to 110 as well.
 *
 * 110 for build is a starting figure and not a claim about pedagogy — it is what the Year-2
 * curriculum was seeded with, and an admin moves it exactly as they move Year 1's 90.
 */
export const DEFAULT_PROGRAM_DAYS_BY_STAGE: Record<string, number> = {
  foundation: FOUNDATION_PROGRAM_DAYS,
  build: 110,
  /*
   * 130 for specialize, on the same footing: a starting figure an admin moves, not a claim.
   *
   * It is longer than Year 2 because Year 3 carries more that cannot be dropped — the advanced
   * core, one specialization track in full rather than a sampling, a production project and a
   * capstone, and the portfolio and internship work at the end. The product owner asked for the
   * length to be admin-set, so this is only where a tenant starts.
   */
  specialize: 130,
};

export const defaultProgramDaysFor = (stageKey?: string | null): number =>
  DEFAULT_PROGRAM_DAYS_BY_STAGE[String(stageKey || 'foundation').toLowerCase().trim()]
  ?? DEFAULT_PROGRAM_DAYS;

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
export async function programDaysFor(tenantId: string, stageKey?: string | null): Promise<number> {
  const stage = String(stageKey || 'foundation').toLowerCase().trim();
  const fallback = defaultProgramDaysFor(stage);

  if (!tenantId) return fallback;
  if (mongoose.connection?.readyState !== 1) return fallback;

  let cfg: any = null;
  try {
    cfg = await PassportConfig.findOne({ tenantId })
      .select('foundationProgramDays programDaysByStage').maxTimeMS(2000).lean() as any;
  } catch (e: any) {
    console.warn(`[programme-length] could not read the length for ${tenantId}/${stage}: ${e?.message || e}`);
    return fallback;
  }

  /**
   * The per-stage map is the authority; `foundationProgramDays` is honoured for foundation so
   * that a tenant which set 120 before this existed keeps getting 120 without a migration. The
   * map wins where both are present, because it is the one an admin can now edit.
   */
  const fromMap = readStageMap(cfg?.programDaysByStage, stage);
  const raw = fromMap ?? (stage === 'foundation' ? cfg?.foundationProgramDays : undefined);

  if (raw === undefined || raw === null) return fallback;
  const checked = validateProgramDays(raw);
  // A stored value outside the bounds is a configuration fault, not a reason to refuse a student
  // their plan: fall back to the default rather than composing a journey nobody can finish.
  return checked.ok ? checked.days : fallback;
}

/** Mongoose gives a Map back as a Map on a document and as a plain object on a lean read. */
function readStageMap(store: any, stage: string): unknown {
  if (!store) return undefined;
  if (typeof store.get === 'function') return store.get(stage);
  return store[stage];
}

/**
 * Kept so the many existing Foundation call sites read exactly as they did.
 *
 * It is now one stage of a per-stage question rather than the whole question, and saying that in
 * a wrapper is cheaper than changing sixty call sites that are all genuinely about Foundation.
 */
export const foundationProgramDaysFor = (tenantId: string): Promise<number> =>
  programDaysFor(tenantId, 'foundation');

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
