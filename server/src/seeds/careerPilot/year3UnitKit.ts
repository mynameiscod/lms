import { UnitSeed } from './year1MegaCurriculum';

/**
 * The two constructors every Year-3 unit file shares.
 *
 * Year 2 kept these at the top of its single dataset file. Year 3's dataset is three files — the
 * advanced core, the specialization tracks and the career proof — because 88 topics in one file
 * is a file nobody reads to the end. Three copies of `closeOut` would be three slightly
 * different endings, so it lives here instead.
 */

/** Compact constructor, so the dataset reads as a syllabus. Mirrors year2MegaCurriculum's. */
export const u = (
  slug: string, title: string, description: string,
  learningOutcomes: string[], estimatedMinutes: number,
  extra: Partial<UnitSeed> = {},
): UnitSeed => ({ slug, title, description, learningOutcomes, estimatedMinutes, ...extra });

/**
 * The ending a teaching topic shares: find the fault, drill it, then build something with it.
 *
 * Longer than Year 2's by design. A third-year's practice is meant to be the kind an interview
 * asks about, and their mini project is meant to be something they could show somebody, so the
 * defaults are a little more than Year 2 allows for the same three shapes.
 */
export const closeOut = (
  what: string, after: string, debugMin = 50, practiceMin = 60, projectMin = 130,
): UnitSeed[] => [
  u('DEBUGGING', `Debugging ${what}`,
    `Reading what goes wrong in ${what.toLowerCase()}, and finding the cause rather than guessing.`,
    [`Diagnose a broken ${what.toLowerCase()} example without rewriting it at random`],
    debugMin, { unitType: 'DEBUG', after: [after] }),
  u('PRACTICE', `${what} Practice`,
    `Enough repetition that ${what.toLowerCase()} stops needing thought under time.`,
    [`Work ${what.toLowerCase()} problems without looking things up`],
    practiceMin, { unitType: 'PRACTICE', after: ['DEBUGGING'] }),
  u('MINI_PROJECT', `Mini Project — ${what}`,
    'One thing built end to end with it, and explained afterwards.',
    [`Build and describe something that uses ${what.toLowerCase()}`],
    projectMin, { unitType: 'PROJECT', after: ['PRACTICE'] }),
];
