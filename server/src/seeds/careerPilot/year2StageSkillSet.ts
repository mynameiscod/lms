/**
 * The Year-2 modules, expressed as the skill set a second-year is planned and measured against.
 *
 * Same join as Year 1 — the curriculum becomes a StageSkillSet, and readiness, the paper builder
 * and the planner all pick it up with no new branch. What differs is the bar.
 *
 * ── WHY YEAR 2 AIMS HIGHER ────────────────────────────────────────────────────────────────
 *
 * Nineteen of the thirty-three Year-2 topics are authored at FOUNDATION depth, because a second
 * year genuinely does start objects, data structures and databases from the ground up: Year 1
 * never taught them. Reading that depth the way Year 1 does would then set a FOUNDATION target
 * on most of the year, and report a student who has finished it as no further along than a
 * first-year who has not started.
 *
 * Depth describes where a topic begins. The target describes where the year is meant to leave
 * somebody, and Year 2's stated outcome is employability — working competence across the
 * backbone, not an acquaintance with it. So every depth targets WORKING, and only genuinely
 * advanced material aims past it.
 *
 * That is a real bar and it is meant to be. A second-year starting the year will read as far
 * from ready on most of it, which is accurate, and it is what makes the plan spend the year
 * closing the distance rather than confirming a low expectation.
 *
 * PURE. No database, no clock. The seed writes what this returns; the tests read it directly.
 */

import type { SkillTargetLevel } from '../../models/RoleSkillBlueprint';
import type { LearningDepth } from '../../data/adaptiveCurriculumPolicy';
import { foundationStageRequirements, FoundationStageSet } from './foundationStageSkillSet';
import { BUILD_MODULES, BUILD_STAGE_KEY } from './year2StageMap';

/** The stage a second-year is derived into. Matches `stageKey` on every Year-2 unit. */
export const BUILD_STAGE = BUILD_STAGE_KEY;

export const BUILD_SET_LABEL = 'CareerPilot Year 2 — Build';

/**
 * Authored depth to the level a second-year is measured against.
 *
 * Everything lands on WORKING because that is the year's outcome, whatever level its topics
 * begin at. CHALLENGE keeps its own higher bar: a topic authored as a stretch should be
 * measured as one.
 */
export const BUILD_TARGET_BY_DEPTH: Record<LearningDepth, SkillTargetLevel> = {
  FOUNDATION: 'WORKING',
  GUIDED:     'WORKING',
  REVISION:   'WORKING',
  STANDARD:   'WORKING',
  CHALLENGE:  'PROFICIENT',
};

/**
 * The Year-2 modules as stage requirements, in module order.
 *
 * `includePrerequisites` is on because Year 2 is the first stage with a stage before it. The
 * Year-1 skills its topics declare have to be measurable, or the bridge that is supposed to
 * teach them cannot see they are missing — only measured skills count as gaps, so an unasked
 * skill is silently treated as held. Eleven of the bridge's fourteen skills were invisible this
 * way, and a fresh second-year who could not write a loop was never taught loops.
 */
export function buildStageRequirements(): FoundationStageSet {
  return foundationStageRequirements({
    modules: BUILD_MODULES,
    targetByDepth: BUILD_TARGET_BY_DEPTH,
    includePrerequisites: true,
  });
}
