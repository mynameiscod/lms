/**
 * Every authored career-track content bundle (stage `track`), in one list. Seeded with
 * `seedPilotUnitContent.ts <tenantId> --track`; held to the same quality rules as every year
 * (tests/trackContentQuality.test.ts).
 */
import { PilotBundle } from './pilotUnitContent';
import { TRACK_BOOTSTRAP_BUNDLES } from './trackContentBootstrap';
import { TRACK_JAVASCRIPT_BUNDLES } from './trackContentJavaScript';
import { TRACK_REACT_CORE_BUNDLES } from './trackContentReactCore';
import { TRACK_REACT_APPS_BUNDLES } from './trackContentReactApps';

export const ALL_TRACK_BUNDLES: PilotBundle[] = [
  ...TRACK_BOOTSTRAP_BUNDLES,
  ...TRACK_JAVASCRIPT_BUNDLES,
  ...TRACK_REACT_CORE_BUNDLES,
  ...TRACK_REACT_APPS_BUNDLES,
];
