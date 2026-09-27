/**
 * Import Year 4 — the 'placement' stage — into a tenant: its curriculum, topics and units.
 *
 * DRY RUN BY DEFAULT.
 *
 *   npx ts-node src/seeds/careerPilot/seedYear4Curriculum.ts <tenantId>
 *   npx ts-node src/seeds/careerPilot/seedYear4Curriculum.ts <tenantId> --apply
 *
 * NOTHING IS PUBLISHED. Every unit lands DRAFT, and a DRAFT unit is invisible to every planning
 * path, so importing this changes nothing any student can see and cannot disturb Years 1, 2 or 3.
 * Publishing is a separate, deliberate act.
 *
 * ── THE EIGHT NINTHS MOST STUDENTS NEVER SEE, AND THE TEN DAYS MOST OF THEM SKIP ──────────
 *
 * Two large parts of this import are meant to be filtered away for any one student, and it is
 * worth knowing which before the unit count alarms anybody.
 *
 * The nine specialization tracks are 144 units and a student takes sixteen — the other eight
 * tracks are removed by `applicableDirections` on the topic. And the ten-day bridge is forty
 * units that a continuing CareerPilot student should meet almost none of, because nothing in it
 * is a backbone topic and their evidence carries them past it.
 *
 * What is left — the engineering build, the production project, the placement practice, the
 * interviews, the mocks, the simulation and the capstone — is what every Year-4 student gets.
 *
 * ── WHERE THE WORK ACTUALLY HAPPENS ───────────────────────────────────────────────────────
 *
 * seedStageCurriculum, shared with Years 2 and 3. This file is only the Year-4 half of the
 * sentence.
 */

import {
  PLACEMENT_STAGE_KEY, PLACEMENT_TITLE, PLACEMENT_MODULES, placementReferencedSkillKeys,
} from './year4StageMap';
import { YEAR4 } from './year4MegaCurriculum';
import { runStageCurriculumSeed } from './seedStageCurriculum';

runStageCurriculumSeed({
  yearLabel: 'Year 4',
  stageKey: PLACEMENT_STAGE_KEY,
  title: PLACEMENT_TITLE,
  description: 'The fourth year: career conversion — bridge, engineering, specialization, production, and the placement practice that runs alongside all of it.',
  modules: PLACEMENT_MODULES,
  dataset: YEAR4,
  referencedSkillKeys: placementReferencedSkillKeys,
  /**
   * A starting figure, not the governing one — the tenant's admin setting decides what a student
   * gets. 150 because Year 4 is the only year carrying a whole second programme beside its
   * teaching: thirty days of bridge, build and specialization, then a production project, and
   * throughout all of it the placement practice the spec insists is continuous rather than final.
   */
  defaultTotalDays: 150,
  createdBy: 'year4-curriculum-seed',
}).catch(async (e) => {
  console.error('\nFAILED:', e?.message || e);
  process.exit(1);
});
