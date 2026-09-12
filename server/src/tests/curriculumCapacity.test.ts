/**
 * What the capacity audit had to get right before its numbers meant anything.
 *
 * The audit exists to size a curriculum deficit, so every one of its counts becomes a decision
 * about how many units somebody writes. A miscounted deficit is not a wrong number on a report;
 * it is weeks of authoring pointed at the wrong gap. The first run said a healthy beginner
 * curriculum had 83 blocked units and 78 missing prerequisites, and the true figure was zero.
 *
 * These hold the distinctions that number turned on.
 */

import {
  composeUnits, ComposableUnit, StudentProfile, SkillBelief,
} from '../services/curriculumComposerService';
import { SUITABILITY_OVERRIDES } from '../seeds/careerPilot/seedUnitSuitabilityOverrides';
import { YEAR1, UnitSeed } from '../seeds/careerPilot/year1MegaCurriculum';
import { SUITABILITY_BY_TYPE, suitableStatesFor } from '../data/unitSuitabilityPolicy';

const unit = (over: Partial<ComposableUnit> & { unitCode: string }): ComposableUnit => ({
  title: over.unitCode,
  moduleCode: 'M03',
  topicCode: 'T_A',
  displayOrder: 10,
  skillKeys: [],
  prerequisiteSkillKeys: [],
  prerequisiteUnitCodes: [],
  category: 'UNIVERSAL',
  applicableDirections: [],
  unitType: 'CONCEPT',
  defaultDepth: 'FOUNDATION',
  mandatory: true,
  estimatedMinutes: 40,
  ...over,
});

const beliefs = (entries: [string, number][]): Map<string, SkillBelief> =>
  new Map(entries.map(([k, score]) => [k, { score, confidence: 'HIGH' as const }]));

const BEGINNER: StudentProfile = {
  skills: new Map(), primaryDirection: null, directionStatus: 'UNDECIDED',
};

const compose = (candidates: ComposableUnit[], targetUnits: number, student: StudentProfile) =>
  composeUnits({ candidates, targetUnits, student });

/* ------------------------------------------------------------------ *
 * "Did not fit" is not "blocked"
 * ------------------------------------------------------------------ */

describe('a full plan does not manufacture blockers', () => {
  /**
   * Selection stops when the plan is full, so most unchosen units were never considered. During
   * selection a prerequisite that is not yet chosen genuinely blocks its dependent; afterwards it
   * does not, because there was simply no room. Reporting the second as the first is what
   * produced 78 phantom missing prerequisites.
   */
  const chainOf = (n: number): ComposableUnit[] =>
    Array.from({ length: n }, (_, i) => unit({
      unitCode: `T_A_${i + 1}`,
      displayOrder: (i + 1) * 10,
      skillKeys: ['A'],
      ...(i > 0 ? { prerequisiteUnitCodes: [`T_A_${i}`] } : {}),
    }));

  it('reports nothing blocked when every prerequisite exists and the plan merely fills up', () => {
    const r = compose(chainOf(50), 10, BEGINNER);

    expect(r.units).toHaveLength(10);
    expect(r.blocked).toEqual([]);
  });

  it('still reports a prerequisite that was never written', () => {
    const pool = [
      ...chainOf(5),
      unit({
        unitCode: 'T_A_ORPHAN',
        displayOrder: 999,
        skillKeys: ['A'],
        prerequisiteUnitCodes: ['T_A_NEVER_AUTHORED'],
      }),
    ];
    const r = compose(pool, 3, BEGINNER);

    const orphan = r.blocked.find(b => b.unitCode === 'T_A_ORPHAN');
    expect(orphan).toBeDefined();
    expect(orphan!.absent).toEqual(['T_A_NEVER_AUTHORED']);
    expect(orphan!.unsuitable).toEqual([]);
  });
});

/* ------------------------------------------------------------------ *
 * Never written vs. wrong for this student
 * ------------------------------------------------------------------ */

describe('the two causes of a blocked unit are told apart', () => {
  /**
   * They go to different people. An absent prerequisite is an authoring backlog somebody clears
   * by writing a unit; an unsuitable one is a sequencing property of the design that no amount of
   * authoring will change. Merged, the second hides inside the first — which is exactly what made
   * "2 missing prerequisites" read as a small backlog when the real finding was that no beginner
   * can reach anything sitting behind a debugging exercise.
   */
  it('calls a written-but-filtered prerequisite unsuitable, not absent', () => {
    const pool = [
      // DEBUG serves STANDARD and later, so a NOT_EXPOSED beginner is never offered it.
      unit({ unitCode: 'T_A_DEBUG', unitType: 'DEBUG', skillKeys: ['A'], displayOrder: 10 }),
      unit({
        unitCode: 'T_A_AFTER',
        skillKeys: ['A'],
        displayOrder: 20,
        prerequisiteUnitCodes: ['T_A_DEBUG'],
      }),
    ];
    const r = compose(pool, 5, BEGINNER);

    const after = r.blocked.find(b => b.unitCode === 'T_A_AFTER');
    expect(after).toBeDefined();
    expect(after!.unsuitable).toEqual(['T_A_DEBUG']);
    expect(after!.absent).toEqual([]);
  });

  it('keeps the flattened legacy list carrying both', () => {
    const pool = [
      unit({ unitCode: 'T_A_DEBUG', unitType: 'DEBUG', skillKeys: ['A'], displayOrder: 10 }),
      unit({
        unitCode: 'T_A_AFTER',
        skillKeys: ['A'],
        displayOrder: 20,
        prerequisiteUnitCodes: ['T_A_DEBUG', 'T_A_NEVER_AUTHORED'],
      }),
    ];
    const r = compose(pool, 5, BEGINNER);

    const legacy = r.unmetPrerequisites.find(b => b.unitCode === 'T_A_AFTER')!;
    expect(legacy.missing.sort()).toEqual(['T_A_DEBUG', 'T_A_NEVER_AUTHORED']);
  });
});

/* ------------------------------------------------------------------ *
 * The suitability overrides
 * ------------------------------------------------------------------ */

describe('suitableStates overrides', () => {
  /** Every unit code the dataset defines, built the way the importer builds it. */
  const DESIGNED = new Map<string, UnitSeed>(
    Object.entries(YEAR1).flatMap(([topicCode, topic]) =>
      topic.units.map(u => [`${topicCode}_${u.slug}`, u] as [string, UnitSeed])),
  );

  it('names units that actually exist', () => {
    /**
     * An override on a code that does not exist writes nothing and reports nothing — it fails by
     * being silently absent, which is the failure mode hardest to notice. The first draft of the
     * list had all ten codes wrong.
     */
    for (const o of SUITABILITY_OVERRIDES) {
      expect(DESIGNED.has(o.unitCode)).toBe(true);
    }
  });

  it('only widens suitability, never narrows it', () => {
    // An override is a claim that a unit serves MORE states than its type implies. Dropping a
    // state it already served would quietly remove it from plans nobody was auditing.
    for (const o of SUITABILITY_OVERRIDES) {
      const seed = DESIGNED.get(o.unitCode)!;
      const derived = SUITABILITY_BY_TYPE[seed.unitType || 'CONCEPT'];
      for (const state of derived) expect(o.states).toContain(state);
    }
  });

  it('adds the post-mastery states, which is the whole point of the list', () => {
    for (const o of SUITABILITY_OVERRIDES) {
      expect(o.states).toContain('REVISION');
      expect(o.states).toContain('VERIFIED');
    }
  });

  it('gives every override a stated reason', () => {
    // The bar is "a judgement exercised repeatedly", and it only holds if somebody had to write
    // down which judgement. An override that cannot be justified in a sentence does not belong.
    for (const o of SUITABILITY_OVERRIDES) {
      expect(o.why.trim().length).toBeGreaterThan(40);
    }
  });

  it('stays a short list rather than becoming a mass fill', () => {
    /**
     * THE GUARD THAT MATTERS. `suitableStates` set on every unit is 310 guesses written down, and
     * a guess written down is indistinguishable from a decision. It is also the obvious way to
     * make a failing profile pass, which is precisely why the ceiling is checked rather than
     * trusted: the strong-universal deficit must be closed by writing units, not by relabelling
     * the ones that exist.
     */
    const designed = [...DESIGNED.keys()].length;
    expect(SUITABILITY_OVERRIDES.length).toBeLessThan(designed * 0.05);
  });

  it('does not close the post-mastery deficit, and is not supposed to', () => {
    /**
     * The honest version of the previous test. Applying every override still leaves the design
     * far short of ninety VERIFIED-suitable units — so if a future change ever makes this pass,
     * somebody has started using overrides to paper over the curriculum gap.
     */
    const PROGRAM_DAYS = 90;
    const overridden = new Map(SUITABILITY_OVERRIDES.map(o => [o.unitCode, o.states]));

    const verifiedSuitable = [...DESIGNED.entries()].filter(([code, seed]) => {
      const states = overridden.get(code)
        ?? SUITABILITY_BY_TYPE[seed.unitType || 'CONCEPT'];
      return states.includes('VERIFIED');
    }).length;

    expect(verifiedSuitable).toBeLessThan(PROGRAM_DAYS);
  });
});

/* ------------------------------------------------------------------ *
 * The design's own shape
 * ------------------------------------------------------------------ */

describe('what the Year-1 design can and cannot serve', () => {
  const ALL = Object.entries(YEAR1).flatMap(([topicCode, topic]) =>
    topic.units.map(u => ({ ...u, unitCode: `${topicCode}_${u.slug}` })));

  it('has no unit type that serves ENRICHMENT in any quantity', () => {
    /**
     * Recorded as a fact rather than an aspiration. ENRICHMENT is served only by PROJECT and
     * CHECKPOINT, the design has nine of the first and none of the second, and that is the whole
     * reason a strong student cannot be given ninety days.
     */
    const enrichment = ALL.filter(u =>
      SUITABILITY_BY_TYPE[u.unitType || 'CONCEPT'].includes('ENRICHMENT')).length;
    expect(enrichment).toBeLessThan(20);
  });

  it('is overwhelmingly first-exposure instruction', () => {
    // 246 of 310. It is why every profile that passes passes with a plan made entirely of
    // concept units, and why the fix is a composition mix rather than more units.
    const concept = ALL.filter(u => (u.unitType || 'CONCEPT') === 'CONCEPT').length;
    expect(concept / ALL.length).toBeGreaterThan(0.7);
  });
});

/* ------------------------------------------------------------------ *
 * The mix a student actually receives
 * ------------------------------------------------------------------ */

describe('state-first ranking starves practice', () => {
  /**
   * THE FINDING THE AUDIT WAS FOR, held so it cannot be fixed by accident and go unnoticed.
   *
   * Ranking is state-first and NOT_EXPOSED outranks everything, so concept units are exhausted
   * before a single GUIDED-or-later unit is reached. Across all nine audit profiles, not one of
   * the 37 PRACTICE units was ever selected — a student would read for three months and never
   * write anything.
   *
   * This test asserts the CURRENT behaviour, which is wrong on purpose: it is P7B's job to
   * introduce a composition mix, and when that lands this test should fail loudly and be
   * rewritten to assert the quota instead of the starvation.
   */
  it('fills the plan with instruction while practice units sit unchosen', () => {
    const pool = [
      ...Array.from({ length: 12 }, (_, i) => unit({
        unitCode: `T_A_C${i}`, skillKeys: [`S${i}`], displayOrder: i * 10, unitType: 'CONCEPT',
      })),
      unit({ unitCode: 'T_A_PRACTICE', skillKeys: ['KNOWN'], displayOrder: 500, unitType: 'PRACTICE' }),
    ];
    // One skill is measured mid-range so the practice unit is genuinely suitable; the rest are
    // unmeasured, so instruction outranks it every time.
    const student: StudentProfile = {
      skills: beliefs([['KNOWN', 60]]),
      primaryDirection: null,
      directionStatus: 'UNDECIDED',
    };

    const r = compose(pool, 10, student);

    expect(suitableStatesFor(pool[pool.length - 1])).toContain('STANDARD');
    expect(r.units.map(u => u.unitCode)).not.toContain('T_A_PRACTICE');
    expect(r.units.every(u => u.unitCode.startsWith('T_A_C'))).toBe(true);
  });
});
