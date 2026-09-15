/**
 * How much of the ninety-day Foundation roadmap a learner may see before membership.
 *
 * The preview is the first N days of the learner's OWN plan — composed from their skill check — so
 * what a student is asked to buy is visibly theirs. N is an admin setting on PassportConfig
 * (`roadmapPreviewDays`); this is the one place its bounds are stated.
 */

export const DEFAULT_ROADMAP_PREVIEW_DAYS = 7;
export const MIN_ROADMAP_PREVIEW_DAYS = 1;
/** A preview longer than a month stops being a preview of a ninety-day programme. */
export const MAX_ROADMAP_PREVIEW_DAYS = 30;

/** The preview length to use, whatever is stored: absent or invalid → the default, then clamped. */
export function clampPreviewDays(value: unknown): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_ROADMAP_PREVIEW_DAYS;
  return Math.min(MAX_ROADMAP_PREVIEW_DAYS, Math.max(MIN_ROADMAP_PREVIEW_DAYS, n));
}
