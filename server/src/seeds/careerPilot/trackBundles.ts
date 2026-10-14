/**
 * Every authored career-track content bundle (stage `track`), in one list. Seeded with
 * `seedPilotUnitContent.ts <tenantId> --track`; held to the same quality rules as every year
 * (tests/trackContentQuality.test.ts).
 */
import crypto from 'crypto';
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

type Mcq = { question: string; options: { text: string; isCorrect: boolean }[] };

/*
 * WHERE THE RIGHT ANSWER SITS. Writers put the correct option first far more often than not, and
 * practice renders options in written order — so a student learns "pick A". Each question's
 * correct option is moved to a position chosen by a hash of its own text: spread evenly, the same
 * on every run (so seeded rows do not churn), and the distractors keep their written order.
 * No option or explanation refers to a position, so moving them changes nothing else.
 */
const placed = <T extends Mcq>(q: T): T => {
  const correct = q.options.find(o => o.isCorrect);
  if (!correct) return q;
  const rest = q.options.filter(o => o !== correct);
  const at = crypto.createHash('md5').update(q.question).digest().readUInt32BE(0) % q.options.length;
  return { ...q, options: [...rest.slice(0, at), correct, ...rest.slice(at)] };
};
const balanced = (b: PilotBundle): PilotBundle => ({
  ...b,
  mcqs: b.mcqs?.map(placed),
  checkpoint: b.checkpoint?.map(placed),
});

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
].map(balanced);
