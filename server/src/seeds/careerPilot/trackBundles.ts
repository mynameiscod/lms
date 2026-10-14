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
import { TRACK_JAVA_CORE_BUNDLES } from './trackContentJavaCore';
import { TRACK_JAVA_OOP_BUNDLES } from './trackContentJavaOop';
import { TRACK_JAVA_COLLECTIONS_BUNDLES } from './trackContentJavaCollections';
import { TRACK_JAVA_CONCURRENCY_DSA_BUNDLES } from './trackContentJavaConcurrencyDsa';
import { TRACK_JAVA_DSA_NONLINEAR_BUNDLES } from './trackContentJavaDsaNonlinear';
import { TRACK_MYSQL_BUNDLES } from './trackContentMysql';
import { TRACK_JDBC_BUNDLES } from './trackContentJdbc';
import { TRACK_JPA_BUNDLES } from './trackContentJpa';
import { TRACK_SPRING_CORE_BUNDLES } from './trackContentSpringCore';

export const ALL_TRACK_BUNDLES: PilotBundle[] = [
  ...TRACK_BOOTSTRAP_BUNDLES,
  ...TRACK_JAVASCRIPT_BUNDLES,
  ...TRACK_REACT_CORE_BUNDLES,
  ...TRACK_REACT_APPS_BUNDLES,
  ...TRACK_JAVA_CORE_BUNDLES,
  ...TRACK_JAVA_OOP_BUNDLES,
  ...TRACK_JAVA_COLLECTIONS_BUNDLES,
  ...TRACK_JAVA_CONCURRENCY_DSA_BUNDLES,
  ...TRACK_JAVA_DSA_NONLINEAR_BUNDLES,
  ...TRACK_MYSQL_BUNDLES,
  ...TRACK_JDBC_BUNDLES,
  ...TRACK_JPA_BUNDLES,
  ...TRACK_SPRING_CORE_BUNDLES,
];
