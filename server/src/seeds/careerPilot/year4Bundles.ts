/**
 * Every authored Year-4 content bundle, in one list.
 *
 * Kept apart from the other three years' registries because the four are seeded, certified and
 * published separately: Year 1 is a certified set at a fixed inventory, Years 2 and 3 are
 * published, and Year 4 is still being authored. One registry for all four would make every
 * Year-4 commit look like a change to three released years.
 *
 * ── THIS LIST IS DELIBERATELY INCOMPLETE ──────────────────────────────────────────────────
 *
 * Year 4 has 439 units and they are being written in batches. A unit with no bundle here is not
 * an error — the content seeder reports it as unauthored and moves on, which is what lets the
 * year be seeded and inspected while it is still being written.
 *
 * What IS an error is a bundle whose unitCode names no unit, and the seeder refuses on that
 * rather than silently doing nothing with it.
 *
 * The quality rules are the same for all four years.
 */

import { PilotBundle } from './pilotUnitContent';
import { STANDING_BUNDLES } from './year4ContentStanding';
import { BRIDGE_PROGRAMMING_BUNDLES } from './year4ContentBridgeProgramming';

export const ALL_YEAR4_BUNDLES: PilotBundle[] = [
  ...STANDING_BUNDLES,
  ...BRIDGE_PROGRAMMING_BUNDLES,
];
