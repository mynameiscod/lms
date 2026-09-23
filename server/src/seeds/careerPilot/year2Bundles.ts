/**
 * Every authored Year-2 content bundle, in one list.
 *
 * Kept apart from ALL_BUNDLES because the two years are seeded, certified and published separately:
 * Year 1 is a certified set at a fixed inventory, and Year 2 is still being authored. One registry
 * for both would make every Year-2 commit look like a change to the Year-1 release.
 *
 * The quality rules are the same for both, and year2ContentQuality.test.ts checks this list against
 * them — including that no question in Year 2 repeats one from Year 1.
 */

import { PilotBundle } from './pilotUnitContent';
import { OOP_BUNDLES } from './year2ContentOop';
import { DATA_STRUCTURE_BUNDLES } from './year2ContentDataStructures';
import { ALGORITHM_BUNDLES } from './year2ContentAlgorithms';

export const ALL_YEAR2_BUNDLES: PilotBundle[] = [
  ...OOP_BUNDLES, ...DATA_STRUCTURE_BUNDLES, ...ALGORITHM_BUNDLES,
];
