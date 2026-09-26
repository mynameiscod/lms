/**
 * Import Year 3 — the 'specialize' stage — into a tenant: its curriculum, topics and units.
 *
 * DRY RUN BY DEFAULT.
 *
 *   npx ts-node src/seeds/careerPilot/seedYear3Curriculum.ts <tenantId>
 *   npx ts-node src/seeds/careerPilot/seedYear3Curriculum.ts <tenantId> --apply
 *
 * NOTHING IS PUBLISHED. Every unit lands DRAFT, and a DRAFT unit is invisible to every planning
 * path, so importing 405 units changes nothing any student can see and cannot disturb Year 1 or
 * Year 2. Publishing is a separate, deliberate act.
 *
 * ── THE SIX-SEVENTHS THAT MOST STUDENTS NEVER SEE ─────────────────────────────────────────
 *
 * Year 3 holds seven specialization tracks and a student takes one. The other six are seeded and
 * then filtered out of their plan by `applicableDirections` on the topic. That is why the unit
 * count is large and the programme is 130 days: the bank has to hold every direction, and any
 * one student meets a fraction of it.
 *
 * ── WHERE THE WORK ACTUALLY HAPPENS ───────────────────────────────────────────────────────
 *
 * seedStageCurriculum, shared with Year 2. This file is only the Year-3 half of the sentence.
 */

import {
  SPECIALIZE_STAGE_KEY, SPECIALIZE_TITLE, SPECIALIZE_MODULES, specializeReferencedSkillKeys,
} from './year3StageMap';
import { YEAR3 } from './year3MegaCurriculum';
import { runStageCurriculumSeed } from './seedStageCurriculum';

runStageCurriculumSeed({
  yearLabel: 'Year 3',
  stageKey: SPECIALIZE_STAGE_KEY,
  title: SPECIALIZE_TITLE,
  description: 'The third year: production depth, one chosen specialization, and proof somebody can be hired.',
  modules: SPECIALIZE_MODULES,
  dataset: YEAR3,
  referencedSkillKeys: specializeReferencedSkillKeys,
  /**
   * A starting figure, not the governing one — the tenant's admin setting decides what a student
   * gets. 130 because Year 3 carries more that cannot be dropped than Year 2 does: the advanced
   * core, a specialization track in full rather than a sampling, a production project, a
   * capstone, and the portfolio and internship work at the end.
   */
  defaultTotalDays: 130,
  createdBy: 'year3-curriculum-seed',
}).catch(async (e) => {
  console.error('\nFAILED:', e?.message || e);
  process.exit(1);
});
