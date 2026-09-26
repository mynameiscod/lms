/**
 * The Year-3 bank's item shape and its option shuffler.
 *
 * ── WHY THIS RE-EXPORTS RATHER THAN RESTATES ──────────────────────────────────────────────
 *
 * A golden item is a golden item. The fields, the five difficulty bands, the cognitive levels
 * and the deterministic shuffle are MECHANICS — statements about how any bank works, not about
 * what any year teaches. Restating them here would give the two years two definitions of the
 * same thing, and the failure mode is quiet: a field added to one, a shuffle seeded differently,
 * and the certification suites stop meaning the same thing while both still pass.
 *
 * What is kept apart is CONTENT. The Year-2 and Year-3 banks are separate collections of
 * questions, imported, counted and certified separately, so a Year-3 question can never change a
 * Year-2 inventory and a skill Year 2 already measures keeps the questions it has.
 *
 * The mechanics live under year2Bank only because that is where they were written first. Their
 * home is worth tidying; duplicating them to avoid the awkward import path is not.
 */

export type { Band, Cognitive, GoldenItem } from '../year2Bank/types';
export { present } from '../year2Bank/present';
