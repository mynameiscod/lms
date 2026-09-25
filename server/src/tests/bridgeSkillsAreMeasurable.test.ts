/**
 * A skill the bridge is meant to teach must be a skill the paper can ask about.
 *
 * ── THE DEFECT THIS GUARDS ────────────────────────────────────────────────────────────────
 *
 * Three rules, each sensible alone, combined into a silent failure:
 *
 *   1. A stage set was built from what its topics TEACH, and nothing else.
 *   2. The entry paper can only ask about skills in the stage set.
 *   3. The bridge counts only MEASURED skills as gaps — deliberately, so a returning member
 *      with a year of evidence is never re-taught what they have already proved.
 *
 * Year 2 declared fourteen Year-1 prerequisites. None of them reached the stage set, so eleven
 * of the fourteen could never be asked, so they could never be found missing, so they were never
 * taught. Measured against the real database: every Year-2 student had exactly three of the
 * fourteen measured, and a fresh second-year who could not write a loop was silently assumed to
 * be able to — because nobody had ever asked.
 *
 * The failure is invisible from either end. The bridge looks correct, the stage set looks
 * correct, and the paper looks correct. Only the join between them is wrong, which is why this
 * test checks the join rather than any one of them.
 */

import { BRIDGE_SKILLS, BRIDGE_SOURCE_STAGE } from '../data/stageBridgePolicy';
import { buildStageRequirements } from '../seeds/careerPilot/year2StageSkillSet';

describe('every bridge skill can actually be measured', () => {
  const set = buildStageRequirements();
  const active = new Set(set.requirements.filter(r => r.active).map(r => r.skillKey));

  it('puts every Year-2 bridge skill in the Year-2 stage set, switched on', () => {
    const missing = [...BRIDGE_SKILLS.build].filter(k => !active.has(k));
    expect(missing).toEqual([]);
  });

  /**
   * The prerequisites are there to be ASKED, not to become things Year 2 is graded on. A
   * first-year skill promoted to ESSENTIAL would weigh as much in the readiness figure as the
   * object-oriented programming the year is actually about.
   *
   * A skill Year 2 both teaches and depends on keeps the stronger claim — the merge does that
   * on its own — so this checks only the ones Year 2 does not teach.
   */
  it('brings a prerequisite in as supporting rather than as an outcome of the year', () => {
    const taughtByYear2 = new Set(
      require('../seeds/careerPilot/year2StageMap').BUILD_MODULES
        .flatMap((m: any) => m.topics.flatMap((t: any) => t.skillKeys)),
    );
    const prereqOnly = set.requirements.filter(r => !taughtByYear2.has(r.skillKey));
    expect(prereqOnly.length).toBeGreaterThan(0);
    for (const r of prereqOnly) expect(r.importance).toBe('SUPPORTING');
  });

  it('keeps a stage with no earlier stage out of this entirely', () => {
    /* Foundation has nothing to bridge from, so it must declare no bridge skills at all. */
    expect(BRIDGE_SOURCE_STAGE.foundation).toBeUndefined();
    expect(BRIDGE_SKILLS.foundation).toBeUndefined();
  });
});
