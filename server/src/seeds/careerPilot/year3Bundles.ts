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
import { COMPLEX_DEBUG_BUNDLES } from './year3ContentDebugging';
import { ARRIVAL_BUNDLES } from './year3ContentArrival';
import { TREES_HEAPS_BUNDLES } from './year3ContentTrees';
import { GRAPHS_BUNDLES } from './year3ContentGraphs';
import { ALGO_DESIGN_BUNDLES } from './year3ContentAlgoDesign';
import { GREEDY_DP_BUNDLES } from './year3ContentGreedyDp';
import { ARCHITECTURE_BUNDLES } from './year3ContentArchitecture';
import { REVIEW_DOCS_BUNDLES } from './year3ContentReviewDocs';
import { TESTING_BUNDLES } from './year3ContentTesting';
import { DATA_BUNDLES } from './year3ContentData';
import { APIS_BUNDLES } from './year3ContentApis';
import { OPS_BUNDLES } from './year3ContentOps';
import { SECURITY_BUNDLES } from './year3ContentSecurity';
import { BACKEND_BUNDLES } from './year3ContentBackend';
import { BACKEND_REST_BUNDLES } from './year3ContentBackendRest';
import { FRONTEND_BUNDLES } from './year3ContentFrontend';
import { FRONTEND_REST_BUNDLES } from './year3ContentFrontendRest';
import { DATA_TRACK_BUNDLES } from './year3ContentDataTrack';
import { DATA_REST_BUNDLES } from './year3ContentDataRest';
import { ML_BUNDLES } from './year3ContentMl';
import { ML_REST_BUNDLES } from './year3ContentMlRest';

export const ALL_YEAR3_BUNDLES: PilotBundle[] = [
  ...PATTERNS_BUNDLES,
  ...OOP_ADVANCED_BUNDLES,
  ...ERROR_DESIGN_BUNDLES,
  ...COMPLEX_DEBUG_BUNDLES,
  ...ARRIVAL_BUNDLES,
  ...TREES_HEAPS_BUNDLES,
  ...GRAPHS_BUNDLES,
  ...ALGO_DESIGN_BUNDLES,
  ...GREEDY_DP_BUNDLES,
  ...ARCHITECTURE_BUNDLES,
  ...REVIEW_DOCS_BUNDLES,
  ...TESTING_BUNDLES,
  ...DATA_BUNDLES,
  ...APIS_BUNDLES,
  ...OPS_BUNDLES,
  ...SECURITY_BUNDLES,
  ...BACKEND_BUNDLES,
  ...BACKEND_REST_BUNDLES,
  ...FRONTEND_BUNDLES,
  ...FRONTEND_REST_BUNDLES,
  ...DATA_TRACK_BUNDLES,
  ...DATA_REST_BUNDLES,
  ...ML_BUNDLES,
  ...ML_REST_BUNDLES,
];
