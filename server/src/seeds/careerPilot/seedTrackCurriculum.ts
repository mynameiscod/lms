/**
 * Import career-track content — stage `track` — into a tenant: its topics and units.
 *
 * DRY RUN BY DEFAULT.
 *
 *   npx ts-node src/seeds/careerPilot/seedTrackCurriculum.ts <tenantId>
 *   npx ts-node src/seeds/careerPilot/seedTrackCurriculum.ts <tenantId> --apply
 *   production: node dist/seeds/careerPilot/seedTrackCurriculum.js <tenantId> --apply
 *
 * NOTHING IS PUBLISHED and nothing reaches a student by importing it: every unit lands DRAFT,
 * and a topic is taught only once a skill pack names it and a track using that pack goes live.
 * Then: content with seedPilotUnitContent.ts --track, and the topics into packs on the admin
 * Career Tracks screen.
 */
import { TRACK_STAGE_KEY, TRACK_TITLE, TRACK_MODULES, trackReferencedSkillKeys } from './trackStageMap';
import { TRACK_CONTENT } from './trackContent';
import { runStageCurriculumSeed } from './seedStageCurriculum';

runStageCurriculumSeed({
  yearLabel: 'Career tracks',
  stageKey: TRACK_STAGE_KEY,
  title: TRACK_TITLE,
  description: 'Lessons written for career tracks (role + language, from Year 3): frameworks, languages and AI no year teaches. Tracks reuse them through skill packs.',
  modules: TRACK_MODULES,
  dataset: TRACK_CONTENT,
  referencedSkillKeys: trackReferencedSkillKeys,
  /* Not a programme: a track's days come from the year it is taken in. Stored only because the curriculum requires it. */
  defaultTotalDays: 130,
  createdBy: 'career-track-content-seed',
}).catch(async (e) => {
  console.error('\nFAILED:', e?.message || e);
  process.exit(1);
});
