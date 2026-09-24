/**
 * What a membership costs, for this tenant, for this stage.
 *
 * ── WHY PRICE IS PER STAGE ────────────────────────────────────────────────────────────────
 *
 * A membership buys one year of one programme. Year 1 and Year 2 are different programmes with
 * different content and different lengths, so a student returning for Year 2 buys a second
 * membership rather than extending the first — and it is priced on its own terms.
 *
 * `priceInr` stays the tenant's single price and is what every stage costs until an admin says
 * otherwise, so a tenant that never touches this is completely unaffected.
 *
 * ── WHAT IS NOT PER STAGE ─────────────────────────────────────────────────────────────────
 *
 * The DURATION. `membershipMonths` is twelve for every stage: a year of access is the promise,
 * and a year means the same thing in Year 2 as in Year 1. Making it per-stage would invite a
 * tenant to sell eight months of Year 2 for the price of twelve, which is not a decision this
 * product should make easy.
 */

import mongoose from 'mongoose';
import PassportConfig from '../models/PassportConfig';

/** What a tenant that has configured nothing charges. */
export const DEFAULT_PRICE_INR = 499;

/** Sane bounds. Refused rather than clamped, for the same reason the programme length is. */
export const MIN_PRICE_INR = 0;
export const MAX_PRICE_INR = 100_000;

export function validatePriceInr(value: unknown): { ok: true; price: number } | { ok: false; error: string } {
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    return { ok: false, error: 'The price must be a whole number of rupees.' };
  }
  if (n < MIN_PRICE_INR || n > MAX_PRICE_INR) {
    return { ok: false, error: `The price must be between ${MIN_PRICE_INR} and ${MAX_PRICE_INR} rupees.` };
  }
  return { ok: true, price: n };
}

/** Mongoose gives a Map back as a Map on a document and as a plain object on a lean read. */
function readStageMap(store: any, stage: string): unknown {
  if (!store) return undefined;
  if (typeof store.get === 'function') return store.get(stage);
  return store[stage];
}

/**
 * The price this learner's stage is sold at.
 *
 * Reading a setting must never be the thing that stops a student buying, so anything that goes
 * wrong — no database, a slow one, a stored value out of bounds — answers the tenant's single
 * price, and failing that the default. A configuration fault must not become a free membership
 * or an uncompletable checkout.
 */
export async function membershipPriceFor(tenantId: string, stageKey?: string | null): Promise<number> {
  const stage = String(stageKey || 'foundation').toLowerCase().trim();
  if (!tenantId) return DEFAULT_PRICE_INR;
  if (mongoose.connection?.readyState !== 1) return DEFAULT_PRICE_INR;

  let cfg: any = null;
  try {
    cfg = await PassportConfig.findOne({ tenantId })
      .select('priceInr priceInrByStage').maxTimeMS(2000).lean() as any;
  } catch (e: any) {
    console.warn(`[membership] could not read the price for ${tenantId}/${stage}: ${e?.message || e}`);
    return DEFAULT_PRICE_INR;
  }

  const tenantPrice = validatePriceInr(cfg?.priceInr).ok
    ? (validatePriceInr(cfg?.priceInr) as { ok: true; price: number }).price
    : DEFAULT_PRICE_INR;

  const raw = readStageMap(cfg?.priceInrByStage, stage);
  if (raw === undefined || raw === null) return tenantPrice;

  const checked = validatePriceInr(raw);
  return checked.ok ? checked.price : tenantPrice;
}
