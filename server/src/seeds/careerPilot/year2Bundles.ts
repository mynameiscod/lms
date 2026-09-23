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
import { TESTING_BUNDLES } from './year2ContentTesting';
import { COLLABORATION_BUNDLES } from './year2ContentCollaboration';
import { DATABASE_BUNDLES } from './year2ContentDatabases';
import { WEB_BUNDLES } from './year2ContentWeb';
import { SECURITY_BUNDLES } from './year2ContentSecurity';
import { BACKBONE_BUNDLES } from './year2ContentBackbone';
import { PYTHON_BUNDLES } from './year2ContentPython';
import { CRAFT_BUNDLES } from './year2ContentCraft';

export const ALL_YEAR2_BUNDLES: PilotBundle[] = [
  ...OOP_BUNDLES, ...DATA_STRUCTURE_BUNDLES, ...ALGORITHM_BUNDLES, ...TESTING_BUNDLES,
  ...COLLABORATION_BUNDLES, ...DATABASE_BUNDLES, ...WEB_BUNDLES,
  ...SECURITY_BUNDLES, ...BACKBONE_BUNDLES, ...PYTHON_BUNDLES,
  ...CRAFT_BUNDLES,
];
