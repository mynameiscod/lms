import { TopicSeed } from './year1MegaCurriculum';
import { TRACK_WEB } from './trackUnitsWeb';
import { TRACK_JAVA } from './trackUnitsJava';
import { TRACK_DATA_SPRING } from './trackUnitsDataSpring';
import { TRACK_BOOT } from './trackUnitsBoot';
import { TRACK_AI } from './trackUnitsAi';
import { TRACK_PLACEMENT, TRACK_PLACEMENT_PY, TRACK_PLACEMENT_DOTNET } from './trackUnitsPlacement';
import { TRACK_PYTHON, TRACK_DJANGO, TRACK_PY_STACK_AI } from './trackUnitsPython';
import { TRACK_DOTNET, TRACK_DOTNET_DATA, TRACK_DOTNET_WEB, TRACK_DOTNET_AI } from './trackUnitsDotnet';

/**
 * Every career-track topic and its units (stage `track`), in one dataset. See trackStageMap for
 * why track content is one pool by subject rather than one curriculum per track.
 */
export const TRACK_CONTENT: Record<string, TopicSeed> = {
  ...TRACK_WEB,
  ...TRACK_JAVA,
  ...TRACK_DATA_SPRING,
  ...TRACK_BOOT,
  ...TRACK_AI,
  ...TRACK_PLACEMENT,
  ...TRACK_PYTHON,
  ...TRACK_DJANGO,
  ...TRACK_PY_STACK_AI,
  ...TRACK_PLACEMENT_PY,
  ...TRACK_DOTNET,
  ...TRACK_DOTNET_DATA,
  ...TRACK_DOTNET_WEB,
  ...TRACK_DOTNET_AI,
  ...TRACK_PLACEMENT_DOTNET,
};
