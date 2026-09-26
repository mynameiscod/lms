/**
 * The Year-3 modules, expressed as the skill set a third-year is planned and measured against.
 *
 * Same join as Years 1 and 2 — the curriculum becomes a StageSkillSet, and readiness, the paper
 * builder and the planner all pick it up with no new branch. What differs is the bar, and what
 * counts as the floor.
 *
 * ── WHY YEAR 3 AIMS HIGHER STILL ──────────────────────────────────────────────────────────
 *
 * Year 1 targets FOUNDATION, because being early is the expected state. Year 2 targets WORKING,
 * because its outcome is employability across the backbone. Year 3's stated outcome is career
 * proof: a student finishing it is applying for internships and sitting technical interviews
 * against people already doing the job.
 *
 * So the floor is WORKING — nothing in Year 3 may be left at an acquaintance — and everything
 * the year is actually about targets PROFICIENT. CHALLENGE topics, which are most of the
 * specialization and every project, target ADVANCED: that is the depth somebody asks about when
 * they are deciding whether to hire you for it.
 *
 * A third-year starting the year will read as far from ready on most of this, which is accurate
 * and is the point. The plan then spends the year closing the distance.
 *
 * ── PREREQUISITES, AND WHY THEY MATTER MORE HERE THAN ANYWHERE ────────────────────────────
 *
 * `includePrerequisites` is on for the reason it is on in Year 2, only more so: Year 3 is the
 * first stage with TWO stages behind it, and its entry population includes somebody who has done
 * neither of them.
 *
 * The rule the whole thing turns on: the bridge treats an UNMEASURED skill as held, on purpose,
 * so a returning member is never re-taught what they have already proved. That is only safe if
 * the paper can actually ask about the skills the year stands on. Leave them out of this set and
 * a fresh third-year who cannot write a loop is never asked about loops, so loops are never a
 * gap, so loops are never taught — the exact failure measured on the real database in Year 2,
 * where every student had three of fourteen bridge skills measured.
 *
 * PURE. No database, no clock. The seed writes what this returns; the tests read it directly.
 */

import type { SkillTargetLevel } from '../../models/RoleSkillBlueprint';
import type { LearningDepth } from '../../data/adaptiveCurriculumPolicy';
import { foundationStageRequirements, FoundationStageSet } from './foundationStageSkillSet';
import { SPECIALIZE_MODULES, SPECIALIZE_STAGE_KEY } from './year3StageMap';

/** The stage a third-year is derived into. Matches `stageKey` on every Year-3 unit. */
export const SPECIALIZE_STAGE = SPECIALIZE_STAGE_KEY;

export const SPECIALIZE_SET_LABEL = 'CareerPilot Year 3 — Specialize';

/**
 * Authored depth to the level a third-year is measured against.
 *
 * The floor is WORKING rather than FOUNDATION: a Year-3 topic that begins from the ground up
 * still has to leave the student able to use the thing. STANDARD and CHALLENGE go past it,
 * because the year is judged by what somebody else will pay for.
 */
export const SPECIALIZE_TARGET_BY_DEPTH: Record<LearningDepth, SkillTargetLevel> = {
  FOUNDATION: 'WORKING',
  GUIDED:     'WORKING',
  REVISION:   'WORKING',
  STANDARD:   'PROFICIENT',
  CHALLENGE:  'ADVANCED',
};

/** The Year-3 modules as stage requirements, in module order. */
export function specializeStageRequirements(): FoundationStageSet {
  return foundationStageRequirements({
    modules: SPECIALIZE_MODULES,
    targetByDepth: SPECIALIZE_TARGET_BY_DEPTH,
    includePrerequisites: true,
  });
}
