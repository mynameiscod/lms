/**
 * Import Year 2 — the 'build' stage — into a tenant: its curriculum, its topics and its units.
 *
 * DRY RUN BY DEFAULT.
 *
 *   npx ts-node src/seeds/careerPilot/seedYear2Curriculum.ts <tenantId>
 *   npx ts-node src/seeds/careerPilot/seedYear2Curriculum.ts <tenantId> --apply
 *
 * WHY THIS EXISTS SEPARATELY FROM THE YEAR-1 SEEDS. Year 1 already has a curriculum row to write
 * topics into; Year 2 has nothing at all. The shared seeder creates the 'build' curriculum first,
 * then fills it, so the two years never share a row and a Year-2 mistake can never move a
 * Year-1 unit.
 *
 * NOTHING IS PUBLISHED, AND THAT IS THE POINT. Every unit lands DRAFT. A DRAFT unit is invisible
 * to every planning path — `composerCandidateService` requires `status === 'PUBLISHED'` for a
 * PRODUCTION set — so importing 296 units changes nothing any student can see, and cannot move
 * the certified Year-1 inventory of 347. Publishing is a separate, deliberate act.
 *
 * IDEMPOTENT, AND IT DOES NOT OVERWRITE AUTHORSHIP. Rows are upserted on their code. Structure —
 * title, order, outcomes, duration, prerequisites, skills — belongs to the dataset and is
 * re-applied every run. Category, depth, directions and STATUS belong to whoever edited them in
 * the admin and are written only on insert: a re-run must never unpublish a unit somebody
 * published, nor undo a direction filter somebody set.
 *
 * IT REFUSES RATHER THAN INVENTS. Every skill key is checked against the CareerSkill taxonomy
 * before anything is written, and an unknown key aborts the run.
 *
 * ── WHERE THE WORK ACTUALLY HAPPENS ───────────────────────────────────────────────────────
 *
 * seedStageCurriculum. This file is the Year-2 half of the sentence — a stage key, a title, a
 * module tree, a dataset and a recommended length — and everything above is true of any year.
 * Year 3 is the same script with three words changed, and a second copy of it would have been a
 * second opinion about how a curriculum is written.
 */

import {
  BUILD_STAGE_KEY, BUILD_TITLE, BUILD_MODULES, buildReferencedSkillKeys,
} from './year2StageMap';
import { YEAR2 } from './year2MegaCurriculum';
import { runStageCurriculumSeed } from './seedStageCurriculum';

runStageCurriculumSeed({
  yearLabel: 'Year 2',
  stageKey: BUILD_STAGE_KEY,
  title: BUILD_TITLE,
  description: 'The second year: building real things, choosing a direction, and becoming employable.',
  modules: BUILD_MODULES,
  dataset: YEAR2,
  referencedSkillKeys: buildReferencedSkillKeys,
  /**
   * A starting figure, not the governing one. What a student actually gets is the tenant's admin
   * setting, resolved per journey; 110 days is where the backbone plus one track stops being
   * tight enough to leave a weak joiner no room.
   */
  defaultTotalDays: 110,
  createdBy: 'year2-curriculum-seed',
}).catch(async (e) => {
  console.error('\nFAILED:', e?.message || e);
  process.exit(1);
});
