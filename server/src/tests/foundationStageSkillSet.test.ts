import {
  foundationStageRequirements, IMPORTANCE_BY_CATEGORY, TARGET_BY_DEPTH,
  FOUNDATION_STAGE, FOUNDATION_SET_LABEL,
} from '../seeds/careerPilot/foundationStageSkillSet';
import { FOUNDATION_MODULES, isMandatoryCategory } from '../seeds/careerPilot/foundationSkillMap';
import { CAREER_STAGES } from '../services/careerStageService';
import { SKILL_IMPORTANCE, SKILL_TARGET_LEVELS, MIN_SKILL_WEIGHT, MAX_SKILL_WEIGHT } from '../models/RoleSkillBlueprint';

/**
 * The Year-1 modules and the roadmap were two curricula.
 *
 * The modules described the first year; the roadmap planned ninety days from a list of required
 * skills that came from somewhere else entirely. A tenant could seed the whole first year and a
 * first-year's plan would not contain a single topic from it. This is the join, and these are
 * the properties that have to hold for it to be a join rather than a third opinion.
 */
describe('the Year-1 modules as a foundation stage set', () => {
  const built = foundationStageRequirements();

  it('targets a stage the product actually derives', () => {
    // A typo here would write a set nothing ever reads, and nothing would report it.
    expect(CAREER_STAGES.some(s => s.key === FOUNDATION_STAGE)).toBe(true);
    expect(FOUNDATION_SET_LABEL).toBeTruthy();
  });

  it('covers every module and every topic', () => {
    expect(built.summary.modules).toBe(FOUNDATION_MODULES.length);
    expect(built.summary.topics).toBe(
      FOUNDATION_MODULES.reduce((n, m) => n + m.topics.length, 0),
    );
  });

  it('carries every skill the modules teach, and invents none', () => {
    const fromModules = new Set(
      FOUNDATION_MODULES.flatMap(m => m.topics.flatMap(t => t.skillKeys.map(k => k.toUpperCase()))),
    );
    const inSet = new Set(built.requirements.map(r => r.skillKey));
    expect(inSet).toEqual(fromModules);
  });

  /**
   * ONE ROW PER SKILL. SHELL_COMMANDS is taught under both files and pipelines, and two rows
   * for it would weigh it twice in the readiness figure and buy it twice the roadmap minutes —
   * a student would be sent back to the shell for a fortnight because of how the syllabus was
   * written, not because of anything they did.
   */
  it('merges a skill taught in more than one topic into a single requirement', () => {
    const keys = built.requirements.map(r => r.skillKey);
    expect(new Set(keys).size).toBe(keys.length);

    const repeated = [...new Set(
      built.origins.map(o => o.skillKey)
        .filter((k, _i, all) => all.filter(x => x === k).length > 1),
    )];
    // The map does repeat skills across topics; if it ever stops, this test stops proving
    // anything and should be removed rather than left passing vacuously.
    expect(repeated.length).toBeGreaterThan(0);
    for (const k of repeated) {
      expect(built.requirements.filter(r => r.skillKey === k)).toHaveLength(1);
    }
  });

  it('keeps the strongest claim any topic makes about a repeated skill', () => {
    for (const req of built.requirements) {
      const places = built.origins.filter(o => o.skillKey === req.skillKey);
      const rank = { ESSENTIAL: 4, IMPORTANT: 3, SUPPORTING: 2, OPTIONAL: 1 } as Record<string, number>;
      const strongest = Math.max(...places.map(p => rank[IMPORTANCE_BY_CATEGORY[p.category]]));
      expect(rank[req.importance]).toBe(strongest);
      // And a skill any mandatory topic teaches is on, whatever else also teaches it.
      expect(req.active).toBe(places.some(p => isMandatoryCategory(p.category)));
    }
  });

  /**
   * UNIVERSAL IS NOT EVERYTHING — the map's own doctrine, and the line this seed must not
   * cross. Writing every category switched on would commit every student to every module
   * while looking personalised, and a stage set cannot do the direction filtering that would
   * make that honest.
   */
  it('switches on the universal spine and nothing else', () => {
    expect(built.summary.active).toBeGreaterThan(0);
    expect(built.summary.inactive).toBeGreaterThan(0);
    for (const req of built.requirements) {
      const teaches = built.origins.filter(o => o.skillKey === req.skillKey);
      const universal = teaches.some(o => o.category === 'UNIVERSAL');
      expect(req.active).toBe(universal);
    }
  });

  it('writes the conditional material down rather than dropping it', () => {
    // An admin can only turn on what they can see. A seed that omitted direction and academic
    // work would leave eleven of the fifteen modules unreachable from this screen.
    const conditional = built.origins.filter(o => o.category !== 'UNIVERSAL');
    expect(conditional.length).toBeGreaterThan(0);
    for (const o of conditional) {
      expect(built.requirements.some(r => r.skillKey === o.skillKey)).toBe(true);
    }
  });

  it('produces rows the StageSkillSet schema will accept', () => {
    for (const r of built.requirements) {
      expect(SKILL_IMPORTANCE).toContain(r.importance);
      expect(SKILL_TARGET_LEVELS).toContain(r.targetLevel);
      expect(r.weight).toBeGreaterThanOrEqual(MIN_SKILL_WEIGHT);
      expect(r.weight).toBeLessThanOrEqual(MAX_SKILL_WEIGHT);
      expect(r.skillKey).toBe(r.skillKey.toUpperCase());
      expect((r.note || '').length).toBeLessThanOrEqual(240);
    }
  });

  /**
   * A first year is a foundation year. Setting a WORKING target on everything would report
   * every first-year as far from ready at the point where being early is the expected state,
   * and would spend their ninety days pushing past a bar nobody asked them to clear.
   */
  it('measures a first-year against a first-year bar', () => {
    const foundational = built.requirements.filter(r => r.targetLevel === 'FOUNDATION');
    expect(foundational.length).toBeGreaterThan(built.requirements.length / 2);
    expect(built.requirements.some(r => r.targetLevel === 'ADVANCED')).toBe(false);
    expect(TARGET_BY_DEPTH.FOUNDATION).toBe('FOUNDATION');
    expect(TARGET_BY_DEPTH.CHALLENGE).toBe('PROFICIENT');
  });

  /**
   * `getStageBlueprint` sorts on displayOrder, so this is what decides whether the set reads
   * as the curriculum does or as an alphabet. Module 1 before Module 15.
   */
  it('orders the set the way the curriculum runs', () => {
    const orders = built.requirements.map(r => r.displayOrder);
    expect(orders).toEqual(orders.slice().sort((a, b) => a - b));
    expect(new Set(orders).size).toBeGreaterThan(1);

    const first = built.requirements[0];
    const firstModule = FOUNDATION_MODULES.slice().sort((a, b) => a.displayOrder - b.displayOrder)[0];
    expect(firstModule.topics[0].skillKeys.map(k => k.toUpperCase())).toContain(first.skillKey);
  });

  it('says where each requirement came from, so an admin can judge it', () => {
    for (const r of built.requirements) {
      expect(r.note).toBeTruthy();
      const origin = built.origins.find(o => o.skillKey === r.skillKey)!;
      expect(r.note).toContain(origin.moduleCode);
    }
  });
});
