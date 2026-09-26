/**
 * Every authored Year-3 content bundle, in one list.
 *
 * Kept apart from ALL_BUNDLES and ALL_YEAR2_BUNDLES because the three years are seeded,
 * certified and published separately: Year 1 is a certified set at a fixed inventory, Year 2 is
 * published, and Year 3 is still being authored. One registry for all three would make every
 * Year-3 commit look like a change to two released years.
 *
 * ── THIS LIST IS DELIBERATELY INCOMPLETE ──────────────────────────────────────────────────
 *
 * Year 3 has 453 units and they are being written in batches. A unit with no bundle here is not
 * an error — the content seeder reports it as unauthored and moves on, which is what lets the
 * year be seeded and inspected while it is still being written.
 *
 * What IS an error is a bundle whose unitCode names no unit, and the seeder refuses on that
 * rather than silently doing nothing with it.
 *
 * The quality rules are the same for all three years.
 */

import { PilotBundle } from './pilotUnitContent';
import { PATTERNS_BUNDLES } from './year3ContentPatterns';
import { OOP_ADVANCED_BUNDLES } from './year3ContentOop';
import { ERROR_DESIGN_BUNDLES } from './year3ContentErrorDesign';

export const ALL_YEAR3_BUNDLES: PilotBundle[] = [
  ...PATTERNS_BUNDLES,
  ...OOP_ADVANCED_BUNDLES,
  ...ERROR_DESIGN_BUNDLES,
];
