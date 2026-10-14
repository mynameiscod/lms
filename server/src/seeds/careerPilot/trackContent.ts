import { TopicSeed } from './year1MegaCurriculum';
import { TRACK_WEB } from './trackUnitsWeb';
import { TRACK_JAVA } from './trackUnitsJava';
import { TRACK_DATA_SPRING } from './trackUnitsDataSpring';

/**
 * Every career-track topic and its units (stage `track`), in one dataset. See trackStageMap for
 * why track content is one pool by subject rather than one curriculum per track.
 */
export const TRACK_CONTENT: Record<string, TopicSeed> = {
  ...TRACK_WEB,
  ...TRACK_JAVA,
  ...TRACK_DATA_SPRING,
};
