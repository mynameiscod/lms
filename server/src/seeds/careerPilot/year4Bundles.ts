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
import { BRIDGE_DATA_BUNDLES } from './year4ContentBridgeData';
import { BRIDGE_SYSTEMS_BUNDLES } from './year4ContentBridgeSystems';
import { BUILD_CRAFT_BUNDLES } from './year4ContentBuildCraft';
import { BUILD_CORE_BUNDLES } from './year4ContentBuildCore';
import { BUILD_DATA_BUNDLES } from './year4ContentBuildData';
import { BUILD_OPS_BUNDLES } from './year4ContentBuildOps';
import { BUILD_INTEGRATION_BUNDLES } from './year4ContentBuildIntegration';
import { TRACK_SE_BUNDLES } from './year4ContentTrackSe';
import { TRACK_BACKEND_BUNDLES } from './year4ContentTrackBackend';
import { TRACK_FRONTEND_BUNDLES } from './year4ContentTrackFrontend';
import { TRACK_FULLSTACK_BUNDLES } from './year4ContentTrackFullstack';
import { TRACK_DATA_BUNDLES } from './year4ContentTrackData';
import { TRACK_AIML_BUNDLES } from './year4ContentTrackAiml';
import { TRACK_CLOUD_BUNDLES } from './year4ContentTrackCloud';
import { TRACK_SECURITY_BUNDLES } from './year4ContentTrackSecurity';
import { TRACK_MOBILE_BUNDLES } from './year4ContentTrackMobile';
import { PRODUCTION_BUNDLES } from './year4ContentProduction';
import { PLACEMENT_CODING_BUNDLES } from './year4ContentPlacementCoding';
import { APTITUDE_BUNDLES } from './year4ContentAptitude';
import { TECHNICAL_MCQ_BUNDLES } from './year4ContentTechnicalMcq';
import { TECHNICAL_INTERVIEW_BUNDLES } from './year4ContentTechnicalInterview';
import { PROJECT_DESIGN_BUNDLES } from './year4ContentProjectDesign';

export const ALL_YEAR4_BUNDLES: PilotBundle[] = [
  ...STANDING_BUNDLES,
  ...BRIDGE_PROGRAMMING_BUNDLES,
  ...BRIDGE_DATA_BUNDLES,
  ...BRIDGE_SYSTEMS_BUNDLES,
  ...BUILD_CRAFT_BUNDLES,
  ...BUILD_CORE_BUNDLES,
  ...BUILD_DATA_BUNDLES,
  ...BUILD_OPS_BUNDLES,
  ...BUILD_INTEGRATION_BUNDLES,
  ...TRACK_SE_BUNDLES,
  ...TRACK_BACKEND_BUNDLES,
  ...TRACK_FRONTEND_BUNDLES,
  ...TRACK_FULLSTACK_BUNDLES,
  ...TRACK_DATA_BUNDLES,
  ...TRACK_AIML_BUNDLES,
  ...TRACK_CLOUD_BUNDLES,
  ...TRACK_SECURITY_BUNDLES,
  ...TRACK_MOBILE_BUNDLES,
  ...PRODUCTION_BUNDLES,
  ...PLACEMENT_CODING_BUNDLES,
  ...APTITUDE_BUNDLES,
  ...TECHNICAL_MCQ_BUNDLES,
  ...TECHNICAL_INTERVIEW_BUNDLES,
  ...PROJECT_DESIGN_BUNDLES,
];
