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
import { SUITABILITY_BY_TYPE, isSuitableFor } from '../data/unitSuitabilityPolicy';
import { AssignmentState } from '../data/adaptiveCurriculumPolicy';
import YEAR1_METADATA from './fixtures/year1UnitMetadata.json';

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
   * by writing a unit; an unsuitable one is a property of this student's plan that no amount of
   * authoring will change. Merged, the second hides inside the first.
   *
   * WHAT COUNTS AS "UNSUITABLE" NARROWED IN P7A.3. It used to include anything the suitability
   * filter removed, which was most of a beginner's application inventory. Suitability is now
   * evaluated against the state the PLAN reaches, so a DEBUG unit in front of a beginner is no
   * longer permanently out of reach — it simply comes after the teaching. What remains genuinely
   * unreachable is what the direction filter removed, and that is what this now tests.
   */
  const WEB_ONLY: StudentProfile = {
    skills: new Map(), primaryDirection: 'WEB_DEVELOPMENT', directionStatus: 'SELECTED',
  };

  it('calls a written-but-filtered prerequisite unsuitable, not absent', () => {
    const pool = [
      // Scoped to a direction this student is not heading towards, so it is filtered out for them.
      unit({
        unitCode: 'T_AI_ONLY', skillKeys: ['AI'], displayOrder: 10,
        category: 'DIRECTION', mandatory: false, applicableDirections: ['AI_ML'],
      }),
      unit({
        unitCode: 'T_A_AFTER',
        skillKeys: ['A'],
        displayOrder: 20,
        prerequisiteUnitCodes: ['T_AI_ONLY'],
      }),
    ];
    const r = compose(pool, 5, WEB_ONLY);

    const after = r.blocked.find(b => b.unitCode === 'T_A_AFTER');
    expect(after).toBeDefined();
    expect(after!.unsuitable).toEqual(['T_AI_ONLY']);
    expect(after!.absent).toEqual([]);
  });

  it('keeps the flattened legacy list carrying both', () => {
    const pool = [
      unit({
        unitCode: 'T_AI_ONLY', skillKeys: ['AI'], displayOrder: 10,
        category: 'DIRECTION', mandatory: false, applicableDirections: ['AI_ML'],
      }),
      unit({
        unitCode: 'T_A_AFTER',
        skillKeys: ['A'],
        displayOrder: 20,
        prerequisiteUnitCodes: ['T_AI_ONLY', 'T_A_NEVER_AUTHORED'],
      }),
    ];
    const r = compose(pool, 5, WEB_ONLY);

    const legacy = r.unmetPrerequisites.find(b => b.unitCode === 'T_A_AFTER')!;
    expect(legacy.missing.sort()).toEqual(['T_AI_ONLY', 'T_A_NEVER_AUTHORED']);
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


/* ══════════════════════════════════════════════════════════════════════════════════════════ *
 * P7A.3 — the composition shape, against the real 310-unit inventory
 *
 * Held against a snapshot of the actual Year-1 metadata rather than a hand-built fixture, because
 * the failure this phase exists to fix was invisible in fixtures. Small pools cannot express it:
 * ninety CONCEPT units only happens when there are 246 of them to exhaust, and every synthetic
 * pool the composer had been tested against was too small and too balanced to show it.
 *
 * Metadata only — titles, types, depths, skills, prerequisites. No content, no readiness, no
 * database.
 * ══════════════════════════════════════════════════════════════════════════════════════════ */

describe('P7A.3 — composition shape against the real curriculum', () => {
  const INVENTORY = YEAR1_METADATA as unknown as ComposableUnit[];
  const DAYS = 90;

  const ALL_SKILLS = [...new Set(INVENTORY.flatMap(u => u.skillKeys))].sort();

  const profile = (over: Partial<StudentProfile>): StudentProfile => ({
    skills: new Map(), primaryDirection: null, directionStatus: 'UNDECIDED', ...over,
  });

  const scored = (keys: string[], score: number) =>
    new Map(keys.map(k => [k, { score, confidence: 'HIGH' as const }]));

  const BEGINNER_P = profile({});

  const MIXED_P = profile({
    skills: scored(ALL_SKILLS.slice(0, Math.ceil(ALL_SKILLS.length / 3)), 45),
  });

  /** Verified across the universal foundation. Direction and academic skills never measured. */
  const UNIVERSAL_SKILLS = [...new Set(
    INVENTORY.filter(u => u.category === 'UNIVERSAL').flatMap(u => u.skillKeys),
  )].sort();
  /** Verified across the universal foundation, and has not engaged with direction at all. */
  const STRONG_P = profile({ skills: scored(UNIVERSAL_SKILLS, 91) });

  /** The same learner, sampling directions. The only difference is the direction stance. */
  const STRONG_EXPLORING_P = profile({
    skills: scored(UNIVERSAL_SKILLS, 91),
    directionStatus: 'EXPLORING',
    explorationDirections: ['WEB_DEVELOPMENT', 'AI_ML', 'DATA', 'CLOUD_DEVOPS'],
  });

  const WEB_P = profile({
    skills: scored(ALL_SKILLS.filter(k => /HTML|CSS|JS|WEB|HTTP/.test(k)), 32),
    primaryDirection: 'WEB_DEVELOPMENT',
    directionStatus: 'SELECTED',
  });

  const AI_P = profile({
    skills: scored(ALL_SKILLS.filter(k => /MATRIC|PROBABILITY|STATISTIC|LOGIC/.test(k)), 88),
    primaryDirection: 'AI_ML',
    directionStatus: 'SELECTED',
  });

  const UNDECIDED_P = profile({
    skills: scored(ALL_SKILLS.slice(0, 4), 55),
    directionStatus: 'EXPLORING',
    explorationDirections: ['WEB_DEVELOPMENT', 'AI_ML', 'DATA', 'CLOUD_DEVOPS'],
  });

  const PASSING: [string, StudentProfile][] = [
    ['beginner', BEGINNER_P], ['mixed', MIXED_P], ['strong-exploring', STRONG_EXPLORING_P],
    ['strong-universal', STRONG_P],
    ['web-focused', WEB_P], ['ai-data-focused', AI_P], ['undecided', UNDECIDED_P],
  ];

  /** Shape tests that are about mastery rather than length run against both strong learners. */
  const STRONG_BOTH: [string, StudentProfile][] = [
    ['strong-universal', STRONG_P], ['strong-exploring', STRONG_EXPLORING_P],
  ];

  const plan = (p: StudentProfile) => composeUnits({
    candidates: INVENTORY, targetUnits: DAYS, student: p,
  });

  const typeCount = (r: ReturnType<typeof plan>, t: string) =>
    r.units.filter(u => u.unitType === t).length;

  /* ---- the failure this phase exists to fix ------------------------- */

  it.each(PASSING)('%s does not collapse to 90 CONCEPT units', (_name, p) => {
    /**
     * THE HEADLINE. Before P7A.3 every passing profile was exactly this: ninety concept units,
     * no practice, nothing built, three months of reading.
     */
    const r = plan(p);
    expect(r.units.length).toBeGreaterThan(0);
    expect(typeCount(r, 'CONCEPT')).toBeLessThan(r.units.length);
  });

  it.each(PASSING)('%s receives practice, because suitable inventory exists', (_name, p) => {
    // 37 PRACTICE units were designed and 0 were ever selected, for anybody.
    const r = plan(p);
    expect(typeCount(r, 'PRACTICE')).toBeGreaterThan(0);
  });

  it.each(PASSING)('%s builds or debugs something', (_name, p) => {
    const r = plan(p);
    expect(typeCount(r, 'PROJECT') + typeCount(r, 'DEBUG')).toBeGreaterThan(0);
  });

  /* ---- length ------------------------------------------------------- */

  it.each(PASSING)('%s gets exactly 90 units', (_name, p) => {
    const r = plan(p);
    expect(r.ok).toBe(true);
    expect(r.units).toHaveLength(DAYS);
  });

  /* ---- the beginner is still taught --------------------------------- */

  it('a beginner still receives substantial foundation teaching', () => {
    /**
     * The opposite failure to the one being fixed, and just as bad: a shape policy that gives a
     * beginner a balanced-looking plan they cannot follow because nothing was ever taught.
     */
    const r = plan(BEGINNER_P);
    const teaching = r.units.filter(u =>
      u.role === 'FOUNDATION_INSTRUCTION' || u.role === 'GUIDED_INSTRUCTION').length;
    expect(teaching).toBeGreaterThan(DAYS * 0.3);
  });

  it('never schedules application before the skill was taught', () => {
    // The projection's entire claim. If this fails, the plan is asserting readiness it invented.
    const r = plan(BEGINNER_P);
    const taught = new Set<string>();

    for (const u of r.units) {
      const full = INVENTORY.find(x => x.unitCode === u.unitCode)!;
      if (u.unitType === 'PRACTICE' || u.unitType === 'DEBUG' || u.unitType === 'PROJECT') {
        expect(full.skillKeys.some(k => taught.has(k))).toBe(true);
      }
      if (u.unitType === 'CONCEPT' || u.unitType === 'PRACTICE') {
        for (const k of full.skillKeys) taught.add(k);
      }
    }
  });

  /* ---- the strong learner ------------------------------------------- */

  it('a strong learner gets substantially less elementary instruction', () => {
    const beginner = plan(BEGINNER_P);
    const strong = plan(STRONG_P);

    const elementary = (r: ReturnType<typeof plan>) =>
      r.units.filter(u => u.role === 'FOUNDATION_INSTRUCTION').length;

    expect(elementary(strong)).toBeLessThan(elementary(beginner));
  });

  it.each(STRONG_BOTH)('%s does not collapse to concept units either', (_n, p) => {
    const r = plan(p);
    expect(typeCount(r, 'CONCEPT')).toBeLessThan(r.units.length);
    expect(typeCount(r, 'PRACTICE') + typeCount(r, 'DEBUG') + typeCount(r, 'PROJECT'))
      .toBeGreaterThan(0);
  });

  it('a strong learner with no direction stance still fills ninety days', () => {
    /**
     * THIS TEST USED TO ASSERT THE OPPOSITE, AND THE CHANGE IS THE PRODUCT DECISION.
     *
     * A learner verified across the universal foundation has exhausted the universal material by
     * definition; everything left that is new to them is direction-scoped. While an undecided
     * student was shown no direction units at all, this learner's plan ran dry at 56 — and the
     * only remedies on offer were to make them pick a direction or to promote them out of
     * Foundation. Both were rejected: undecided is a legitimate place to be, and Foundation is
     * ninety days for everybody.
     *
     * So they sample across every direction instead. Nothing is written to `primaryDirection` —
     * see the exploration suite below, which holds that and the breadth rule.
     */
    const stuck = plan(STRONG_P);
    const sampling = plan(STRONG_EXPLORING_P);

    expect(stuck.ok).toBe(true);
    expect(stuck.units).toHaveLength(DAYS);
    expect(stuck.composition.DIRECTION_LEARNING).toBeGreaterThan(0);
    expect(stuck.shapeViolations).toEqual([]);

    // And an explicit sampling list is still honoured rather than overridden by breadth.
    expect(sampling.ok).toBe(true);
    expect(sampling.units).toHaveLength(DAYS);
  });

  it('a strong learner still meets material they have not encountered', () => {
    /**
     * VERIFIED does not mean "exit Foundation early" and does not mean "repeat all basics". A
     * learner verified across the universal foundation has still never met the direction
     * material, and instruction on it is legitimate new learning, not re-teaching.
     */
    const r = plan(STRONG_EXPLORING_P);
    expect(r.shape).toBe('ESTABLISHED');
    expect(typeCount(r, 'CONCEPT')).toBeGreaterThan(0);
    // Specifically direction material, which universal mastery says nothing about.
    expect(r.composition.DIRECTION_LEARNING).toBeGreaterThan(0);
  });

  it('a strong learner spends more of the plan applying than a beginner does', () => {
    const share = (r: ReturnType<typeof plan>) =>
      r.units.filter(u => ['PRACTICE', 'APPLICATION', 'INTEGRATION'].includes(u.role)).length
      / r.units.length;

    expect(share(plan(STRONG_EXPLORING_P))).toBeGreaterThan(share(plan(BEGINNER_P)));
  });

  /* ---- direction ---------------------------------------------------- */

  it('direction changes what the plan contains', () => {
    const web = plan(WEB_P);
    const ai = plan(AI_P);

    const codes = (r: ReturnType<typeof plan>) => new Set(r.units.map(u => u.unitCode));
    const w = codes(web);
    const a = codes(ai);
    const shared = [...w].filter(c => a.has(c)).length;

    // Substantially different plans, not the same plan with a different label on it.
    expect(shared).toBeLessThan(DAYS * 0.9);
  });

  it('never schedules a unit outside the chosen direction', () => {
    const r = plan(WEB_P);
    for (const u of r.units) {
      const full = INVENTORY.find(x => x.unitCode === u.unitCode)!;
      if (!full.mandatory && full.applicableDirections.length) {
        expect(full.applicableDirections.map(String)).toContain('WEB_DEVELOPMENT');
      }
    }
  });

  /* ---- the invariants that must survive ----------------------------- */

  it.each(PASSING)('%s has no duplicate units', (_name, p) => {
    const codes = plan(p).units.map(u => u.unitCode);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it.each(PASSING)('%s has every prerequisite satisfied', (_name, p) => {
    const r = plan(p);
    const before = new Set<string>();
    for (const u of r.units) {
      const full = INVENTORY.find(x => x.unitCode === u.unitCode)!;
      for (const c of full.prerequisiteUnitCodes) {
        // Either already in the plan above it, or resolved another way and reported as such.
        if (before.has(c)) continue;
        const outcome = r.prerequisites.find(o => o.unitCode === u.unitCode && o.prerequisite === c);
        expect(outcome?.resolution).not.toBe('BLOCKED_MISSING_PREREQUISITE');
      }
      before.add(u.unitCode);
    }
  });

  it.each(PASSING)('%s is deterministic', (_name, p) => {
    const a = plan(p).units.map(u => u.unitCode);
    const b = plan(p).units.map(u => u.unitCode);
    expect(a).toEqual(b);
  });

  it('does not depend on the order the inventory arrives in', () => {
    const forwards = composeUnits({ candidates: INVENTORY, targetUnits: DAYS, student: MIXED_P });
    const backwards = composeUnits({
      candidates: [...INVENTORY].reverse(), targetUnits: DAYS, student: MIXED_P,
    });
    expect(backwards.units.map(u => u.unitCode)).toEqual(forwards.units.map(u => u.unitCode));
  });

  /* ---- reallocation ------------------------------------------------- */

  it('reports every reallocation rather than absorbing it', () => {
    /**
     * A bucket that could not be filled is a decision about somebody's three months. "We could
     * not give you anything to build, so you got more debugging" has to be visible.
     */
    for (const [, p] of PASSING) {
      const r = plan(p);
      for (const move of r.reallocations) {
        expect(move.units).toBeGreaterThan(0);
        expect(move.from).not.toBe(move.to);
        expect(move.reason).toBe('NO_SUITABLE_INVENTORY');
      }
    }
  });

  it('allocates to exactly the programme length before anything is selected', () => {
    const r = plan(MIXED_P);
    const total = r.allocation.reduce((n, a) => n + a.target, 0);
    expect(total).toBe(DAYS);
    // And no floor can exceed the target it sits under.
    for (const a of r.allocation) expect(a.min).toBeLessThanOrEqual(a.target);
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════ *
 * Safeguard 1 — the plan's own progression must never become Skill DNA
 *
 * Composition advances a student through the plan for SEQUENCING: once loops have been taught,
 * a loops practice unit becomes schedulable. That is a fact about the plan, not about the person.
 *
 * Skill DNA is evidence. It is what the product shows a student as their level, what future
 * planning trusts, and what the whole adaptive system rests on. If a scheduling convenience ever
 * leaked into it, a student who had merely ATTENDED a lesson would be recorded as having
 * DEMONSTRATED the skill — and nothing downstream could tell the difference afterwards.
 * ══════════════════════════════════════════════════════════════════════════════════════════ */

describe('scheduling readiness is not evidence', () => {
  const INVENTORY = YEAR1_METADATA as unknown as ComposableUnit[];

  const snapshot = (m: Map<string, any>) =>
    JSON.stringify([...m.entries()].sort((a, b) => a[0].localeCompare(b[0])));

  it('leaves the input skill map byte-for-byte unchanged', () => {
    const skills = new Map([
      ['PROGRAMMING', { score: 30, confidence: 'HIGH' as const }],
      ['HTML', { score: null, confidence: null }],
      ['SQL', { score: 92, confidence: 'HIGH' as const }],
    ]);
    const before = snapshot(skills);
    const sizeBefore = skills.size;

    composeUnits({
      candidates: INVENTORY,
      targetUnits: 90,
      student: { skills, primaryDirection: null, directionStatus: 'UNDECIDED' },
    });

    expect(snapshot(skills)).toBe(before);
    expect(skills.size).toBe(sizeBefore);
  });

  it('does not add skills the plan merely taught', () => {
    // The specific leak to fear: the plan teaches forty skills, and forty entries appear.
    const skills = new Map<string, any>();
    composeUnits({
      candidates: INVENTORY,
      targetUnits: 90,
      student: { skills, primaryDirection: null, directionStatus: 'UNDECIDED' },
    });
    expect(skills.size).toBe(0);
  });

  it('reports the MEASURED state on every selected unit, never the projected one', () => {
    /**
     * A beginner has measured nothing, so every `state` must still read NOT_EXPOSED at the end of
     * a ninety-unit plan — even for the practice and project units that were only schedulable
     * because the plan had taught the skill first.
     */
    const r = composeUnits({
      candidates: INVENTORY,
      targetUnits: 90,
      student: { skills: new Map(), primaryDirection: null, directionStatus: 'UNDECIDED' },
    });

    for (const u of r.units) expect(u.state).toBe('NOT_EXPOSED');
  });

  it('never explains a projected unit as mastery', () => {
    // MASTERY_VERIFIED is a claim about demonstrated ability. Nothing projected may carry it.
    const r = composeUnits({
      candidates: INVENTORY,
      targetUnits: 90,
      student: { skills: new Map(), primaryDirection: null, directionStatus: 'UNDECIDED' },
    });

    for (const u of r.units) {
      if (u.scheduledOnProjection) expect(u.reason).not.toBe('MASTERY_VERIFIED');
    }
    expect(r.units.some(u => u.reason === 'MASTERY_VERIFIED')).toBe(false);
  });

  it('exposes the projection only as separately named metadata', () => {
    /**
     * It IS reported — a plan that cannot be audited is worse than one that can — but under its
     * own name, beside the measured state rather than instead of it.
     */
    const r = composeUnits({
      candidates: INVENTORY,
      targetUnits: 90,
      student: { skills: new Map(), primaryDirection: null, directionStatus: 'UNDECIDED' },
    });

    const projected = r.units.filter(u => u.scheduledOnProjection);
    expect(projected.length).toBeGreaterThan(0);

    for (const u of projected) {
      // Scheduled above what was measured, and both values visible.
      expect(u.scheduledAt).not.toBe(u.state);
      expect(['GUIDED', 'STANDARD']).toContain(u.scheduledAt);
    }
  });

  it('never projects into a state that asserts demonstrated ability', () => {
    // The ladder stops at STANDARD. REVISION and VERIFIED can only come from measurement.
    const r = composeUnits({
      candidates: INVENTORY,
      targetUnits: 90,
      student: { skills: new Map(), primaryDirection: null, directionStatus: 'UNDECIDED' },
    });

    for (const u of r.units) {
      if (!u.scheduledOnProjection) continue;
      expect(['REVISION', 'VERIFIED', 'ENRICHMENT']).not.toContain(u.scheduledAt);
    }
  });

  it('marks a measured state as measured, not as projected', () => {
    const skills = new Map([['SQL', { score: 95, confidence: 'HIGH' as const }]]);
    const r = composeUnits({
      candidates: INVENTORY,
      targetUnits: 90,
      student: { skills, primaryDirection: null, directionStatus: 'UNDECIDED' },
    });

    for (const u of r.units) {
      if (u.state === 'VERIFIED') {
        expect(u.scheduledOnProjection).toBe(false);
        expect(u.scheduledAt).toBe('VERIFIED');
      }
    }
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════ *
 * Safeguard 2 — undecided stays a valid answer
 *
 * A learner who has not chosen a direction is not a learner to be corrected. They sample across
 * every direction, nothing is written to `primaryDirection`, and the breadth rule stops the
 * sampling collapsing into whichever area happens to have the most units and the earliest module
 * code — which would be a direction chosen by sort order and indistinguishable, in the finished
 * plan, from the student having picked it.
 * ══════════════════════════════════════════════════════════════════════════════════════════ */

describe('undecided learners explore across directions', () => {
  const INVENTORY = YEAR1_METADATA as unknown as ComposableUnit[];
  const DAYS = 90;

  const UNIVERSAL_SKILLS = [...new Set(
    INVENTORY.filter(u => u.category === 'UNIVERSAL').flatMap(u => u.skillKeys),
  )].sort();

  const undecided = (skills: Map<string, any>): StudentProfile =>
    ({ skills, primaryDirection: null, directionStatus: 'UNDECIDED' });

  const STRONG_UNDECIDED = undecided(new Map(
    UNIVERSAL_SKILLS.map(k => [k, { score: 91, confidence: 'HIGH' as const }]),
  ));

  /** The three distinct bodies of direction material: web, AI/data, cloud/cyber. */
  const familyOf = (code: string): string | null => {
    const u = INVENTORY.find(x => x.unitCode === code)!;
    const dirs = (u.applicableDirections || []).map(String).sort();
    return dirs[0] || null;
  };

  const familyMix = (r: ReturnType<typeof composeUnits>) => {
    const out = new Map<string, number>();
    for (const u of r.units) {
      if (u.role !== 'DIRECTION_LEARNING') continue;
      const f = familyOf(u.unitCode);
      if (f) out.set(f, (out.get(f) || 0) + 1);
    }
    return out;
  };

  it('gives a strong undecided learner a full ninety days', () => {
    /**
     * THE REGRESSION THIS SAFEGUARD EXISTS FOR. Before it, this learner got 56 units: they had
     * proven the universal foundation, everything new to them was direction-scoped, and having
     * chosen no direction they were shown none of it.
     */
    const r = composeUnits({ candidates: INVENTORY, targetUnits: DAYS, student: STRONG_UNDECIDED });

    expect(r.ok).toBe(true);
    expect(r.units).toHaveLength(DAYS);
    expect(r.shapeViolations).toEqual([]);
  });

  it('samples several areas rather than filling up from one', () => {
    const mix = familyMix(composeUnits({
      candidates: INVENTORY, targetUnits: DAYS, student: STRONG_UNDECIDED,
    }));

    // All three bodies of material represented, none of them taking the lot.
    expect(mix.size).toBeGreaterThanOrEqual(3);
    const total = [...mix.values()].reduce((a, b) => a + b, 0);
    for (const n of mix.values()) expect(n).toBeLessThan(total * 0.7);
  });

  it('does not let the largest area run away with the allocation', () => {
    /**
     * Web has 38 units against AI/data's 21 and cloud/cyber's 8, and M05 sorts early. Ranking
     * alone would spend the whole direction budget there.
     */
    const mix = familyMix(composeUnits({
      candidates: INVENTORY, targetUnits: DAYS, student: STRONG_UNDECIDED,
    }));
    const total = [...mix.values()].reduce((a, b) => a + b, 0);
    const web = mix.get('WEB_DEVELOPMENT') || 0;
    const rest = total - web;

    /**
     * The claim is that the largest area does not take the majority, not that it ties exactly.
     * An even split is the right answer and must not read as a failure — but 65%, which is what
     * happened while prerequisite pulls were exempt from the breadth rule, must.
     */
    expect(web).toBeLessThanOrEqual(total / 2);
    expect(rest).toBeGreaterThanOrEqual(web);
  });

  it('stops holding the others back once a small area is exhausted', () => {
    /**
     * Cloud/cyber has only eight units. A strict round-robin would stall the whole direction
     * bucket the moment it ran dry; the floor is taken over areas that still have inventory, so
     * the plan keeps going.
     */
    const r = composeUnits({ candidates: INVENTORY, targetUnits: DAYS, student: STRONG_UNDECIDED });
    const mix = familyMix(r);
    const cloud = mix.get('CLOUD_DEVOPS') || 0;

    expect(cloud).toBeGreaterThan(0);
    // Others went further than the small area could, rather than being capped at its ceiling.
    expect(mix.get('WEB_DEVELOPMENT') || 0).toBeGreaterThan(cloud);
  });

  it('never writes a direction onto the student', () => {
    // Exploration, not a decision made on their behalf.
    const student = STRONG_UNDECIDED;
    composeUnits({ candidates: INVENTORY, targetUnits: DAYS, student });

    expect(student.primaryDirection).toBeNull();
    expect(student.directionStatus).toBe('UNDECIDED');
  });

  it('explains sampled direction units as exploration, not as serving a chosen direction', () => {
    const r = composeUnits({ candidates: INVENTORY, targetUnits: DAYS, student: STRONG_UNDECIDED });
    const sampled = r.units.filter(u => u.role === 'DIRECTION_LEARNING');

    expect(sampled.length).toBeGreaterThan(0);
    for (const u of sampled) expect(u.reason).not.toBe('STUDENT_DIRECTION');
  });

  it('is deterministic, breadth rule included', () => {
    const once = composeUnits({ candidates: INVENTORY, targetUnits: DAYS, student: STRONG_UNDECIDED });
    const twice = composeUnits({
      candidates: [...INVENTORY].reverse(), targetUnits: DAYS, student: STRONG_UNDECIDED,
    });
    expect(twice.units.map(u => u.unitCode)).toEqual(once.units.map(u => u.unitCode));
  });

  it('still confines a learner who HAS chosen to their own direction', () => {
    // Breadth applies to the undecided. It must not loosen the filter for everybody else.
    const web: StudentProfile = {
      skills: new Map(), primaryDirection: 'WEB_DEVELOPMENT', directionStatus: 'SELECTED',
    };
    const r = composeUnits({ candidates: INVENTORY, targetUnits: DAYS, student: web });

    for (const u of r.units) {
      const full = INVENTORY.find(x => x.unitCode === u.unitCode)!;
      if (!full.mandatory && full.applicableDirections.length) {
        expect(full.applicableDirections.map(String)).toContain('WEB_DEVELOPMENT');
      }
    }
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════ *
 * P8B2 — sequencing, and the checkpoints that now exist
 *
 * Held against the frozen 337-unit inventory.
 * ══════════════════════════════════════════════════════════════════════════════════════════ */

describe('P8B2 — practical work is not deferred to the end', () => {
  const INVENTORY = YEAR1_METADATA as unknown as ComposableUnit[];
  const DAYS = 90;

  const ALL_SKILLS = [...new Set(INVENTORY.flatMap(u => u.skillKeys))].sort();
  const UNIVERSAL_SKILLS = [...new Set(
    INVENTORY.filter(u => u.category === 'UNIVERSAL').flatMap(u => u.skillKeys),
  )].sort();

  const mk = (over: Partial<StudentProfile>): StudentProfile => ({
    skills: new Map(), primaryDirection: null, directionStatus: 'UNDECIDED', ...over,
  });
  const scored = (keys: string[], score: number) =>
    new Map(keys.map(k => [k, { score, confidence: 'HIGH' as const }]));

  const PROFILES: [string, StudentProfile][] = [
    ['beginner', mk({})],
    ['mixed', mk({
      skills: new Map(ALL_SKILLS.slice(0, Math.ceil(ALL_SKILLS.length / 3))
        .map((k, i) => [k, { score: [18, 34, 52, 68, 44, 76, 28, 58][i % 8], confidence: 'HIGH' as const }])),
    })],
    ['strong-undecided', mk({ skills: scored(UNIVERSAL_SKILLS, 91) })],
    ['web', mk({
      skills: scored(ALL_SKILLS.filter(k => /HTML|CSS|JS|WEB|HTTP/.test(k)), 32),
      primaryDirection: 'WEB_DEVELOPMENT', directionStatus: 'SELECTED',
    })],
    ['software_backend', mk({
      skills: scored(ALL_SKILLS.filter(k => /PROGRAMMING|PYTHON|LOOPS|FUNCTIONS|CONDITIONALS|DSA|C_/.test(k)), 66),
      primaryDirection: 'SOFTWARE_BACKEND', directionStatus: 'SELECTED',
    })],
    ['cloud-cyber', mk({
      skills: scored(ALL_SKILLS.filter(k => /OPERATING|OS_|SHELL|NETWORK|FILE_SYSTEM/.test(k)), 74),
      primaryDirection: 'CLOUD_DEVOPS', directionStatus: 'SELECTED',
    })],
    ['undecided', mk({
      skills: scored(ALL_SKILLS.slice(0, 4), 55),
      directionStatus: 'EXPLORING',
      explorationDirections: ['WEB_DEVELOPMENT', 'AI_ML', 'DATA', 'CLOUD_DEVOPS'],
    })],
  ];

  const plan = (p: StudentProfile) =>
    composeUnits({ candidates: INVENTORY, targetUnits: DAYS, student: p });

  const PRACTICAL = ['PRACTICE', 'DEBUG', 'PROJECT', 'CHECKPOINT', 'REVIEW'];
  const thirds = (r: ReturnType<typeof plan>) => {
    const n = Math.ceil(r.units.length / 3);
    return [r.units.slice(0, n), r.units.slice(n, n * 2), r.units.slice(n * 2)];
  };

  it.each(PROFILES)('%s does not defer practical work to the final third', (_name, p) => {
    /**
     * THE PATHOLOGY THIS TEST EXISTS FOR, AND IT WAS REAL.
     *
     * Before the floor pass was made to rotate, every profile opened with twenty-eight
     * instruction units and two practice — no debugging, nothing built, no checkpoint — and every
     * project landed in the last thirty days. Each count in the capacity report was correct and
     * the journey was still wrong: a student would read for a month before doing anything.
     *
     * A majority of the practical work in the last third is the signature of that failure, and it
     * can return silently from any change to ranking, floors or budgets.
     */
    const r = plan(p);
    const [, , last] = thirds(r);
    const total = r.units.filter(u => PRACTICAL.includes(u.unitType)).length;
    const inLast = last.filter(u => PRACTICAL.includes(u.unitType)).length;

    expect(total).toBeGreaterThan(0);
    expect(inLast / total).toBeLessThanOrEqual(0.6);
  });

  it.each(PROFILES)('%s starts doing something inside the first thirty days', (_name, p) => {
    // Not merely "not back-loaded": the opening month must contain real work, not a promise of it.
    const [first] = thirds(plan(p));
    expect(first.filter(u => PRACTICAL.includes(u.unitType)).length).toBeGreaterThan(0);
  });

  it('every third of a beginner plan contains practical work', () => {
    const segs = thirds(plan(PROFILES[0][1]));
    for (const seg of segs) {
      expect(seg.filter(u => PRACTICAL.includes(u.unitType)).length).toBeGreaterThan(0);
    }
  });

  it('a beginner is still mostly taught early on', () => {
    /**
     * The opposite failure. Interleaving must not turn into front-loading application at somebody
     * who has been taught nothing — the first third should still be predominantly instruction.
     */
    const [first] = thirds(plan(PROFILES[0][1]));
    const teaching = first.filter(u => u.unitType === 'CONCEPT').length;
    expect(teaching / first.length).toBeGreaterThan(0.5);
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════ *
 * Checkpoint semantics
 * ══════════════════════════════════════════════════════════════════════════════════════════ */

describe('P8B2 — checkpoints measure, but never before there is something to measure', () => {
  const INVENTORY = YEAR1_METADATA as unknown as ComposableUnit[];

  const unitOf = (code: string) => INVENTORY.find(u => u.unitCode === code)!;

  const mk = (over: Partial<StudentProfile>): StudentProfile => ({
    skills: new Map(), primaryDirection: null, directionStatus: 'UNDECIDED', ...over,
  });

  it('CHECKPOINT is suitable for every measured state', () => {
    /**
     * Measuring is how a state is established in the first place, so a checkpoint is the one kind
     * of unit that suits a learner at any point on the ladder — including one who has demonstrated
     * the skill, because re-measuring is what keeps a claim current.
     */
    const checkpoint = INVENTORY.find(u => u.unitType === 'CHECKPOINT')!;
    const STATES: AssignmentState[] = [
      'NOT_EXPOSED', 'FOUNDATION_REQUIRED', 'GUIDED', 'STANDARD',
      'REVISION', 'VERIFIED', 'ENRICHMENT',
    ];
    for (const state of STATES) expect(isSuitableFor(checkpoint, state)).toBe(true);
  });

  it('a beginner gets a checkpoint, and never before the block it measures', () => {
    /**
     * Suitability alone would let a checkpoint land on day one — it suits NOT_EXPOSED. What stops
     * that is the prerequisite, and this is the case where the two rules must disagree and the
     * prerequisite must win.
     */
    const r = composeUnits({ candidates: INVENTORY, targetUnits: 90, student: mk({}) });
    const checkpoints = r.units.filter(u => u.unitType === 'CHECKPOINT');
    expect(checkpoints.length).toBeGreaterThan(0);

    for (const c of checkpoints) {
      const position = r.units.findIndex(u => u.unitCode === c.unitCode);
      for (const prereq of unitOf(c.unitCode).prerequisiteUnitCodes) {
        const at = r.units.findIndex(u => u.unitCode === prereq);
        // Either scheduled earlier in this plan, or resolved another way and reported as such.
        if (at >= 0) expect(at).toBeLessThan(position);
        else {
          const outcome = r.prerequisites.find(
            o => o.unitCode === c.unitCode && o.prerequisite === prereq);
          expect(outcome?.resolution).not.toBe('BLOCKED_MISSING_PREREQUISITE');
        }
      }
    }
  });

  it('an established learner gets more checkpoints than a beginner', () => {
    // They have more to re-measure, and less that needs teaching for the first time.
    const beginner = composeUnits({ candidates: INVENTORY, targetUnits: 90, student: mk({}) });
    const universalSkills = [...new Set(
      INVENTORY.filter(u => u.category === 'UNIVERSAL').flatMap(u => u.skillKeys),
    )];
    const strong = composeUnits({
      candidates: INVENTORY,
      targetUnits: 90,
      student: mk({
        skills: new Map(universalSkills.map(k => [k, { score: 91, confidence: 'HIGH' as const }])),
      }),
    });

    const verify = (r: ReturnType<typeof composeUnits>) =>
      r.units.filter(u => u.unitType === 'CHECKPOINT' || u.unitType === 'REVIEW').length;

    expect(verify(strong)).toBeGreaterThan(verify(beginner));
  });

  it('a checkpoint whose prerequisite is in the plan is SATISFIED_BY_PLAN', () => {
    const r = composeUnits({ candidates: INVENTORY, targetUnits: 90, student: mk({}) });
    const resolved = r.prerequisites.filter(o => {
      const u = INVENTORY.find(x => x.unitCode === o.unitCode);
      return u?.unitType === 'CHECKPOINT' || u?.unitType === 'REVIEW';
    });

    expect(resolved.length).toBeGreaterThan(0);
    expect(resolved.some(o => o.resolution === 'SATISFIED_BY_PLAN')).toBe(true);
    expect(resolved.every(o => o.resolution !== 'BLOCKED_MISSING_PREREQUISITE')).toBe(true);
  });

  it('a checkpoint whose prerequisite is already mastered is SATISFIED_BY_MASTERY', () => {
    /**
     * The other half of P7A.1's semantics, and the one that used to be unreachable: a learner who
     * has demonstrated what the prerequisite teaches does not have to sit it again to earn the
     * checkpoint.
     */
    const checkpoint = INVENTORY.find(u =>
      u.unitType === 'CHECKPOINT' && u.prerequisiteUnitCodes.length > 0)!;
    const prereq = unitOf(checkpoint.prerequisiteUnitCodes[0]);

    const student = mk({
      skills: new Map(prereq.skillKeys.map(k => [k, { score: 95, confidence: 'HIGH' as const }])),
    });
    const r = composeUnits({ candidates: [checkpoint, prereq], targetUnits: 2, student });

    const outcome = r.prerequisites.find(
      o => o.unitCode === checkpoint.unitCode && o.prerequisite === prereq.unitCode);

    expect(outcome).toBeDefined();
    expect(outcome!.resolution).toBe('SATISFIED_BY_MASTERY');
  });

  it('never schedules a checkpoint whose prerequisite is absent and unproven', () => {
    // The checkpoint alone, with its prerequisite neither in the pool nor demonstrated.
    const checkpoint = INVENTORY.find(u =>
      u.unitType === 'CHECKPOINT' && u.prerequisiteUnitCodes.length > 0)!;
    const r = composeUnits({ candidates: [checkpoint], targetUnits: 1, student: mk({}) });

    expect(r.units).toHaveLength(0);
    expect(r.blocked.map(b => b.unitCode)).toContain(checkpoint.unitCode);
  });
});
