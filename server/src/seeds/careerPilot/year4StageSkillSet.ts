/**
 * The Year-4 modules, expressed as the skill set a fourth-year is planned and measured against.
 *
 * The same join as Years 1, 2 and 3 — the curriculum becomes a StageSkillSet, and readiness, the
 * paper builder and the planner all pick it up with no new branch. What differs is the bar, and
 * what is allowed to be missing at the end.
 *
 * ── WHY THE FLOOR IS PROFICIENT AND NOT WORKING ───────────────────────────────────────────
 *
 * Year 1 targets FOUNDATION, because being early is the expected state. Year 2 targets WORKING,
 * because its outcome is employability across the backbone. Year 3 floors at WORKING and aims at
 * PROFICIENT, because its outcome is career proof.
 *
 * Year 4's outcome is an offer, and an offer is decided by somebody else in an hour. Nothing in
 * the year may be left at "can use it with help", because GUIDED is precisely the level at which
 * a candidate answers the first question and not the follow-up. So the floor moves up a step:
 * even a topic authored at GUIDED depth — teaching, for a student who arrived without it —
 * targets PROFICIENT, because the bar is not what the teaching starts at but what the interview
 * will ask for.
 *
 * ── AND WHY THAT IS NOT JUST OPTIMISM ─────────────────────────────────────────────────────
 *
 * A higher target does not make a student better; it makes the gap visible and the plan longer.
 * That is the intended effect. A fourth-year who reads as ready under a WORKING bar and then
 * fails a technical round has been told something false by their own dashboard, and the dashboard
 * is the thing this file controls.
 *
 * The cost is honest and worth naming: a fourth-year starting the year will read as far from
 * ready on most of this. Year 3 accepted the same and said it was the point. It is more true
 * here, with 150 days to close it in.
 *
 * ── PREREQUISITES: THE SAME RULE, WITH THREE YEARS BEHIND IT ──────────────────────────────
 *
 * `includePrerequisites` is on for the reason it is on in Years 2 and 3, and the reason grows
 * with every year added. Year 4 is the first stage with THREE stages behind it, and its entry
 * population explicitly includes somebody who has done none of them — the spec's "fresh Year-4
 * student", assessed by diagnostic and bridged in ten days.
 *
 * The rule the whole thing turns on: the bridge treats an UNMEASURED skill as held, on purpose,
 * so a returning member is never re-taught what they have already proved. That is only safe if
 * the paper can actually ask about the skills the year stands on. Leave them out of this set and
 * a fresh fourth-year who cannot write a loop is never asked about loops, so loops are never a
 * gap, so loops are never taught — and the ten-day bridge, the one mechanism the spec provides
 * for exactly this student, is never opened. The failure was measured on the real database in
 * Year 2 and the fix is the same here.
 *
 * PURE. No database, no clock. The seed writes what this returns; the tests read it directly.
 */

import type { SkillTargetLevel } from '../../models/RoleSkillBlueprint';
import type { LearningDepth } from '../../data/adaptiveCurriculumPolicy';
import { foundationStageRequirements, FoundationStageSet } from './foundationStageSkillSet';
import { PLACEMENT_MODULES, PLACEMENT_STAGE_KEY } from './year4StageMap';

/** The stage a fourth-year is derived into. Matches `stageKey` on every Year-4 unit. */
export const PLACEMENT_STAGE = PLACEMENT_STAGE_KEY;

export const PLACEMENT_SET_LABEL = 'CareerPilot Year 4 — Placement';

/**
 * Authored depth to the level a fourth-year is measured against.
 *
 * FOUNDATION and GUIDED are bridge depths — where the teaching STARTS for somebody who arrived
 * without the thing. They still target PROFICIENT, because where the teaching starts and where
 * the year has to leave them are different questions, and only the second one is what an
 * interviewer measures.
 */
export const PLACEMENT_TARGET_BY_DEPTH: Record<LearningDepth, SkillTargetLevel> = {
  FOUNDATION: 'PROFICIENT',
  GUIDED:     'PROFICIENT',
  REVISION:   'PROFICIENT',
  STANDARD:   'PROFICIENT',
  CHALLENGE:  'ADVANCED',
};

/** The Year-4 modules as stage requirements, in module order. */
export function placementStageRequirements(): FoundationStageSet {
  return foundationStageRequirements({
    modules: PLACEMENT_MODULES,
    targetByDepth: PLACEMENT_TARGET_BY_DEPTH,
    includePrerequisites: true,
  });
}
