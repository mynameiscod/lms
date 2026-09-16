/**
 * The composition core, held to the properties a student plan lives or dies on.
 *
 * All of these are silent failures. A plan that repeats a unit, teaches Inheritance before
 * Classes, changes between two runs, or quietly returns forty days for a ninety-day request
 * looks exactly like a working plan until somebody reads it carefully — usually the student,
 * three weeks in.
 *
 * The composer is pure, so every one of them is a property a test can hold rather than a claim
 * somebody makes in a review.
 */

import {
  composeUnits, ComposableUnit, StudentProfile, SkillBelief,
} from '../services/curriculumComposerService';

/* ------------------------------------------------------------------ *
 * Fixtures — a small curriculum with real shapes in it
 * ------------------------------------------------------------------ */

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

/** A chain: each unit needs the one before it. The ordering property in miniature. */
const CHAIN: ComposableUnit[] = [
  unit({ unitCode: 'T_A_1', displayOrder: 10, skillKeys: ['A'] }),
  unit({ unitCode: 'T_A_2', displayOrder: 20, skillKeys: ['A'], prerequisiteUnitCodes: ['T_A_1'] }),
  unit({ unitCode: 'T_A_3', displayOrder: 30, skillKeys: ['A'], prerequisiteUnitCodes: ['T_A_2'] }),
];

/** Two topics, one universal and one scoped to web, plus an exploration unit. */
const MIXED: ComposableUnit[] = [
  ...CHAIN,
  unit({ unitCode: 'T_B_1', topicCode: 'T_B', displayOrder: 10, skillKeys: ['B'] }),
  unit({ unitCode: 'T_B_2', topicCode: 'T_B', displayOrder: 20, skillKeys: ['B'] }),
  unit({
    unitCode: 'T_WEB_1', topicCode: 'T_WEB', moduleCode: 'M05', displayOrder: 10,
    skillKeys: ['HTML'], category: 'DIRECTION', mandatory: false,
    applicableDirections: ['WEB_DEVELOPMENT'],
  }),
  unit({
    unitCode: 'T_WEB_2', topicCode: 'T_WEB', moduleCode: 'M05', displayOrder: 20,
    skillKeys: ['HTML'], category: 'DIRECTION', mandatory: false,
    applicableDirections: ['WEB_DEVELOPMENT'], prerequisiteUnitCodes: ['T_WEB_1'],
  }),
  unit({
    unitCode: 'T_DATA_1', topicCode: 'T_DATA', moduleCode: 'M10', displayOrder: 10,
    skillKeys: ['STATS'], category: 'DIRECTION', mandatory: false,
    applicableDirections: ['DATA'],
  }),
  unit({
    unitCode: 'T_CAREER_1', topicCode: 'T_CAREER', moduleCode: 'M13', displayOrder: 10,
    skillKeys: ['CAREERS'], category: 'EXPLORATION', mandatory: false,
  }),
];

const beliefs = (entries: [string, number | null, SkillBelief['confidence']?][]): Map<string, SkillBelief> =>
  new Map(entries.map(([k, score, confidence]) => [k, { score, confidence: confidence ?? 'HIGH' }]));

/* ---- the five synthetic profiles ---------------------------------- */

const BEGINNER: StudentProfile = {
  // Nothing measured at all. Every skill is NOT_EXPOSED — unknown, not weak.
  skills: new Map(),
  primaryDirection: null,
  directionStatus: 'UNDECIDED',
};

const MIXEDP: StudentProfile = {
  skills: beliefs([['A', 25], ['B', 62], ['HTML', null]]),
  primaryDirection: 'WEB_DEVELOPMENT',
  directionStatus: 'SELECTED',
};

const STRONG: StudentProfile = {
  skills: beliefs([['A', 92], ['B', 88], ['HTML', 90], ['STATS', 85], ['CAREERS', 80]]),
  primaryDirection: 'WEB_DEVELOPMENT',
  directionStatus: 'SELECTED',
};

const WEB_FOCUSED: StudentProfile = {
  skills: beliefs([['A', 70], ['HTML', 30]]),
  primaryDirection: 'WEB_DEVELOPMENT',
  directionStatus: 'SELECTED',
};

const UNDECIDED: StudentProfile = {
  skills: beliefs([['A', 55]]),
  primaryDirection: null,
  directionStatus: 'EXPLORING',
  explorationDirections: ['WEB_DEVELOPMENT', 'DATA'],
};

const compose = (candidates: ComposableUnit[], targetUnits: number, student: StudentProfile) =>
  composeUnits({ candidates, targetUnits, student });

const codes = (r: ReturnType<typeof compose>) => r.units.map(u => u.unitCode);

/* ------------------------------------------------------------------ *
 * The properties
 * ------------------------------------------------------------------ */

describe('prerequisite ordering', () => {
  it('never teaches a unit before what it builds on', () => {
    const r = compose(CHAIN, 3, BEGINNER);
    expect(codes(r)).toEqual(['T_A_1', 'T_A_2', 'T_A_3']);
  });

  it('holds even when ranking wants the later unit first', () => {
    // T_A_3 is the only measured gap, so ranking puts it first. Its chain must still precede it.
    const gapAtEnd: StudentProfile = {
      ...BEGINNER,
      skills: new Map([['LATE', { score: 10, confidence: 'HIGH' as const }]]),
    };
    const chain = [
      unit({ unitCode: 'T_A_1', displayOrder: 10, skillKeys: ['EARLY'] }),
      unit({ unitCode: 'T_A_2', displayOrder: 20, skillKeys: ['LATE'], prerequisiteUnitCodes: ['T_A_1'] }),
    ];
    const r = compose(chain, 2, gapAtEnd);

    expect(codes(r)).toEqual(['T_A_1', 'T_A_2']);
    // The prerequisite is labelled as one rather than pretending it was chosen on merit.
    expect(r.units[0].reason).toBe('PREREQUISITE');
  });

  it('refuses to schedule a unit whose prerequisite is missing and unproven', () => {
    /**
     * The prototype treated anything outside the pool as satisfied, which is wrong in the one
     * case that matters: the unit is genuinely needed, nobody authored it, and the student has
     * not shown the capability. Scheduling it then teaches somebody something they are not
     * ready for, silently.
     */
    const orphan = [unit({
      unitCode: 'T_A_9',
      skillKeys: ['A'],
      prerequisiteUnitCodes: ['T_A_NOT_AUTHORED'],
      prerequisiteSkillKeys: ['PRIOR'],
    })];
    const r = compose(orphan, 1, BEGINNER);

    expect(r.units).toHaveLength(0);
    // Never written at all, so it is an authoring gap rather than a unit filtered out for
    // this student. The audit needs those two apart to size a deficit honestly.
    expect(r.blocked).toEqual([
      { unitCode: 'T_A_9', absent: ['T_A_NOT_AUTHORED'], unsuitable: [] },
    ]);
  });

  it('schedules it anyway when the student has already demonstrated the capability', () => {
    // SATISFIED_BY_MASTERY. The prerequisite unit does not exist, but the skill it would have
    // taught is verified, so there is nothing left for it to give.
    const orphan = [unit({
      unitCode: 'T_A_9',
      skillKeys: ['A'],
      prerequisiteUnitCodes: ['T_A_NOT_AUTHORED'],
      prerequisiteSkillKeys: ['PRIOR'],
    })];
    const mastered: StudentProfile = {
      ...BEGINNER,
      skills: beliefs([['PRIOR', 95]]),
    };
    const r = compose(orphan, 1, mastered);

    expect(codes(r)).toEqual(['T_A_9']);
    expect(r.blocked).toEqual([]);
    expect(r.prerequisites).toEqual([{
      unitCode: 'T_A_9',
      prerequisite: 'T_A_NOT_AUTHORED',
      resolution: 'SATISFIED_BY_MASTERY',
      viaSkill: 'PRIOR',
      score: 95,
    }]);
  });

  it('records how every satisfied prerequisite was satisfied', () => {
    const r = compose(CHAIN, 3, BEGINNER);
    // An authoring gap and a verified capability need different actions and different readers.
    expect(r.prerequisites.every(o => o.resolution === 'SATISFIED_BY_PLAN')).toBe(true);
    expect(r.prerequisites).toHaveLength(2);
  });
});

describe('duplicate prevention', () => {
  it('never selects the same unit twice', () => {
    const r = compose(MIXED, 6, MIXEDP);
    expect(new Set(codes(r)).size).toBe(codes(r).length);
  });

  it('does not repeat units to reach an impossible target', () => {
    // Padding to a number is how a product ships a plan that looks full and teaches one lesson
    // several times.
    const r = compose(CHAIN, 10, BEGINNER);
    expect(new Set(codes(r)).size).toBe(codes(r).length);
    expect(r.units.length).toBeLessThanOrEqual(3);
  });
});

describe('determinism', () => {
  it('gives the same student the same plan every time', () => {
    const a = compose(MIXED, 5, MIXEDP);
    const b = compose(MIXED, 5, MIXEDP);
    expect(codes(a)).toEqual(codes(b));
  });

  it('does not depend on the order candidates arrive in', () => {
    const forwards = compose(MIXED, 5, MIXEDP);
    const backwards = compose([...MIXED].reverse(), 5, MIXEDP);
    // Without a terminal tie-break the plan would change for no reason a student could see.
    expect(codes(backwards)).toEqual(codes(forwards));
  });
});

describe('direction-aware ranking', () => {
  it('excludes direction units the student is not heading towards', () => {
    const r = compose(MIXED, 8, WEB_FOCUSED);
    expect(codes(r)).not.toContain('T_DATA_1');
    expect(r.excluded.map(e => e.unitCode)).toContain('T_DATA_1');
    expect(r.excluded.find(e => e.unitCode === 'T_DATA_1')!.reason).toBe('OUTSIDE_DIRECTION');
  });

  it('keeps direction units for every direction an exploring student is sampling', () => {
    // Breadth is the point of EXPLORING. Filtering to one direction would defeat it.
    const r = compose(MIXED, 9, UNDECIDED);
    expect(codes(r)).toContain('T_WEB_1');
    expect(codes(r)).toContain('T_DATA_1');
  });

  it('labels an unmeasured direction unit STUDENT_DIRECTION', () => {
    // MIXEDP has chosen web and has never been measured on HTML.
    const r = compose(MIXED, 9, MIXEDP);
    const web = r.units.find(u => u.unitCode === 'T_WEB_1')!;
    expect(web.state).toBe('NOT_EXPOSED');
    expect(web.reason).toBe('STUDENT_DIRECTION');
  });

  it('prefers the measured gap over the direction when both apply', () => {
    /**
     * WEB_FOCUSED scored 30 on HTML. Direction explains why the unit is ELIGIBLE; the gap
     * explains why it is prioritised, and that is the more useful thing to tell a student.
     */
    const r = compose(MIXED, 9, WEB_FOCUSED);
    const web = r.units.find(u => u.unitCode === 'T_WEB_1')!;
    expect(web.reason).toBe('DIAGNOSTIC_GAP');
    expect(web.score).toBe(30);
  });

  it('never filters away a mandatory unit, whatever the direction', () => {
    const scopedButMandatory = [
      unit({
        unitCode: 'T_GIT_1', mandatory: true, category: 'DIRECTION',
        applicableDirections: ['DATA'],
      }),
    ];
    // Git does not stop mattering because somebody chose AI.
    const r = compose(scopedButMandatory, 1, WEB_FOCUSED);
    expect(codes(r)).toEqual(['T_GIT_1']);
  });
});

describe('skill-state-aware ranking', () => {
  /**
   * A gap ranks ahead of material the learner is merely STANDARD in — and a confident STANDARD no longer
   * re-teaches that material's first-exposure lessons at all.
   *
   * This used to compare T_A_1 and T_B_1 in one plan. With B reliably measured at 62, T_B_1 (a
   * FOUNDATION-depth lesson) is now held back by the known-instruction rule, so the ranking claim is
   * checked on the same curriculum with B on thin evidence, where the lesson is still taught.
   */
  it('puts a measured gap before merely-standard material', () => {
    const thinB: StudentProfile = { ...MIXEDP, skills: beliefs([['A', 25], ['B', 62, 'LOW'], ['HTML', null]]) };
    const r = compose(MIXED, 9, thinB);
    const gap = r.units.findIndex(u => u.unitCode === 'T_A_1');
    const standard = r.units.findIndex(u => u.unitCode === 'T_B_1');
    // A scored 25 — a real gap. B scored 62 and is merely standard.
    expect(standard).toBeGreaterThanOrEqual(0);
    expect(gap).toBeLessThan(standard);
  });

  it('does not re-teach a first-exposure lesson on a skill reliably measured STANDARD', () => {
    const r = compose(MIXED, 9, MIXEDP);
    expect(r.units.findIndex(u => u.unitCode === 'T_A_1')).toBe(0);
    expect(codes(r)).not.toContain('T_B_1');
    expect((r.knownInstruction || []).map(k => k.unitCode)).toEqual(expect.arrayContaining(['T_B_1', 'T_B_2']));
  });

  it('calls a measured gap DIAGNOSTIC_GAP and carries the score that produced it', () => {
    const r = compose(MIXED, 9, MIXEDP);
    const a = r.units.find(u => u.unitCode === 'T_A_1')!;
    expect(a.reason).toBe('DIAGNOSTIC_GAP');
    expect(a.state).toBe('FOUNDATION_REQUIRED');
    expect(a.score).toBe(25);
    expect(a.governingSkill).toBe('A');
  });

  it('is governed by the weakest measured skill in a unit, not the average', () => {
    // Averaging would let a strong skill hide a weak one inside the same unit.
    const twoSkills = [unit({ unitCode: 'T_X_1', skillKeys: ['STRONG', 'WEAK'] })];
    const student: StudentProfile = {
      ...BEGINNER,
      skills: beliefs([['STRONG', 95], ['WEAK', 20]]),
    };
    const r = compose(twoSkills, 1, student);
    expect(r.units[0].governingSkill).toBe('WEAK');
    expect(r.units[0].state).toBe('FOUNDATION_REQUIRED');
  });
});

describe('NOT_EXPOSED is not weakness', () => {
  it('never reports an unmeasured skill as a diagnostic gap', () => {
    // Telling somebody they scored badly on a question they were never asked is false, and it
    // is the distinction the whole first year rests on.
    const r = compose(CHAIN, 3, BEGINNER);
    for (const u of r.units) {
      expect(u.state).toBe('NOT_EXPOSED');
      expect(u.reason).not.toBe('DIAGNOSTIC_GAP');
      expect(u.score).toBeNull();
    }
  });

  it('explains an unmeasured universal unit as STANDARD_FOUNDATION', () => {
    const r = compose(CHAIN, 1, BEGINNER);
    expect(r.units[0].reason).toBe('STANDARD_FOUNDATION');
  });

  it('ranks an unmeasured skill above a mastered one and below a measured gap', () => {
    const student: StudentProfile = { ...BEGINNER, skills: beliefs([['A', 20], ['B', 95]]) };
    const pool = [
      unit({ unitCode: 'GAP', skillKeys: ['A'], topicCode: 'T_1' }),
      unit({ unitCode: 'UNKNOWN', skillKeys: ['NEVER_MEASURED'], topicCode: 'T_2' }),
      // A PROJECT, because instruction is no longer suitable for a VERIFIED skill — the state
      // ordering is what is under test here, not the suitability filter.
      unit({ unitCode: 'MASTERED', skillKeys: ['B'], topicCode: 'T_3', unitType: 'PROJECT' }),
    ];
    expect(codes(compose(pool, 3, student))).toEqual(['GAP', 'UNKNOWN', 'MASTERED']);
  });
});

describe('VERIFIED is represented, not re-taught', () => {
  it('keeps the skill in the plan through application rather than instruction', () => {
    /**
     * The product decision. A student who has demonstrated a skill is not given every foundation
     * unit again at a lower depth — the concept units stop being suitable and the project stays.
     * Silently deleting the skill entirely would leave them unable to tell mastery from an
     * omission; re-teaching it wastes the most expensive resource in a ninety-day programme.
     */
    const student: StudentProfile = { ...BEGINNER, skills: beliefs([['A', 95]]) };
    const pool = [
      unit({ unitCode: 'A_TEACH', skillKeys: ['A'], unitType: 'CONCEPT', displayOrder: 10 }),
      unit({ unitCode: 'A_DEBUG', skillKeys: ['A'], unitType: 'DEBUG', displayOrder: 20 }),
      unit({ unitCode: 'A_PROJECT', skillKeys: ['A'], unitType: 'PROJECT', displayOrder: 30 }),
    ];
    const r = compose(pool, 3, student);

    expect(codes(r)).not.toContain('A_TEACH');
    expect(codes(r)).toEqual(['A_DEBUG', 'A_PROJECT']);
    expect(r.excluded.map(e => e.unitCode)).toContain('A_TEACH');
    expect(r.excluded.find(e => e.unitCode === 'A_TEACH')!.reason).toBe('MASTERY_VERIFIED');
  });

  it('still labels what it keeps MASTERY_VERIFIED, with the score', () => {
    const student: StudentProfile = { ...BEGINNER, skills: beliefs([['A', 95], ['B', 30]]) };
    const pool = [
      unit({ unitCode: 'KNOWN', skillKeys: ['A'], topicCode: 'T_1', unitType: 'PROJECT' }),
      unit({ unitCode: 'WEAK', skillKeys: ['B'], topicCode: 'T_2' }),
    ];
    const r = compose(pool, 2, student);
    expect(codes(r)).toEqual(['WEAK', 'KNOWN']);
    expect(r.units[1].reason).toBe('MASTERY_VERIFIED');
    expect(r.units[1].score).toBe(95);
  });
});

describe('hitting the target, or refusing', () => {
  it('returns exactly N when the inventory can supply it', () => {
    const r = compose(MIXED, 5, MIXEDP);
    expect(r.ok).toBe(true);
    expect(r.units).toHaveLength(5);
  });

  it('returns a structured refusal rather than a short plan', () => {
    /**
     * The failure this whole programme started from: a product sold as ninety days opening a
     * twenty-eight-day plan. A short plan looks like a working plan.
     */
    const r = compose(MIXED, 90, MIXEDP);

    expect(r.ok).toBe(false);
    expect(r.code).toBe('INSUFFICIENT_COMPOSER_READY_INVENTORY');
    expect(r.requestedDays).toBe(90);
    expect(r.eligibleUnits).toBeLessThan(90);
    /**
     * What it COULD build is still returned, so a caller can show the gap rather than nothing.
     *
     * Not an identity with `eligibleUnits` any more. Since P7A.3 that counts every unit the
     * student could be taught at some point in the walk, and a unit can be teachable and still
     * not make the plan — its prerequisite may sit outside the pool. The plan is bounded by
     * eligibility, not equal to it.
     */
    expect(r.units.length).toBeGreaterThan(0);
    expect(r.units.length).toBeLessThanOrEqual(r.eligibleUnits);
  });

  it('reports eligibility after direction filtering, not before', () => {
    const r = compose(MIXED, 90, WEB_FOCUSED);
    // T_DATA_1 is excluded for this student, so it is not eligible inventory for them.
    expect(r.eligibleUnits).toBe(MIXED.length - 1);
  });
});

describe('every selection is explainable', () => {
  it('gives each unit a reason from the existing taxonomy', () => {
    const KNOWN = new Set([
      'DIAGNOSTIC_GAP', 'NOT_YET_EXPOSED', 'PREREQUISITE', 'STANDARD_FOUNDATION',
      'STUDENT_DIRECTION', 'CAREER_EXPLORATION', 'MASTERY_VERIFIED', 'MODULE_REASSESSMENT',
      'MENTOR_OVERRIDE', 'PREREQUISITE_LOCKED', 'OUTSIDE_DIRECTION',
    ]);
    for (const profile of [BEGINNER, MIXEDP, STRONG, WEB_FOCUSED, UNDECIDED]) {
      for (const u of compose(MIXED, 9, profile).units) {
        expect(KNOWN.has(u.reason)).toBe(true);
      }
    }
  });

  it('numbers positions from one, without gaps', () => {
    const r = compose(MIXED, 6, MIXEDP);
    expect(r.units.map(u => u.position)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('labels an exploration unit CAREER_EXPLORATION for an undecided student', () => {
    const r = compose(MIXED, 9, UNDECIDED);
    const career = r.units.find(u => u.unitCode === 'T_CAREER_1')!;
    expect(career.reason).toBe('CAREER_EXPLORATION');
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════
 * P7A.1 — adaptive suitability
 *
 * A pool varied enough to express the policy: each skill has instruction, application and a
 * checkpoint, so "reallocate capacity from re-teaching to application" is something the
 * composer can actually DO rather than something the fixture makes impossible.
 * ════════════════════════════════════════════════════════════════════════════════════════ */

const family = (skill: string, topic: string, order: number): ComposableUnit[] => [
  unit({ unitCode: `${topic}_INTRO`, topicCode: topic, skillKeys: [skill], displayOrder: order + 1, unitType: 'CONCEPT' }),
  unit({ unitCode: `${topic}_DEEPER`, topicCode: topic, skillKeys: [skill], displayOrder: order + 2, unitType: 'CONCEPT', prerequisiteUnitCodes: [`${topic}_INTRO`] }),
  unit({ unitCode: `${topic}_EXAMPLE`, topicCode: topic, skillKeys: [skill], displayOrder: order + 3, unitType: 'WORKED_EXAMPLE' }),
  unit({ unitCode: `${topic}_PRACTICE`, topicCode: topic, skillKeys: [skill], displayOrder: order + 4, unitType: 'PRACTICE' }),
  unit({ unitCode: `${topic}_DEBUG`, topicCode: topic, skillKeys: [skill], displayOrder: order + 5, unitType: 'DEBUG' }),
  unit({ unitCode: `${topic}_PROJECT`, topicCode: topic, skillKeys: [skill], displayOrder: order + 6, unitType: 'PROJECT' }),
];

const VARIED: ComposableUnit[] = [
  ...family('LOOPS', 'T_L', 10),
  ...family('FUNCS', 'T_F', 20),
  ...family('SQL', 'T_S', 30),
];

const instructional = (r: ReturnType<typeof compose>) =>
  r.units.filter(u => ['T_L_INTRO', 'T_L_DEEPER', 'T_L_EXAMPLE', 'T_F_INTRO', 'T_F_DEEPER',
    'T_F_EXAMPLE', 'T_S_INTRO', 'T_S_DEEPER', 'T_S_EXAMPLE'].includes(u.unitCode));

const application = (r: ReturnType<typeof compose>) =>
  r.units.filter(u => u.unitCode.endsWith('_DEBUG') || u.unitCode.endsWith('_PROJECT'));

describe('P7A.1 — the strong learner', () => {
  const STRONG_ALL: StudentProfile = {
    skills: beliefs([['LOOPS', 94], ['FUNCS', 91], ['SQL', 90]]),
    primaryDirection: 'WEB_DEVELOPMENT',
    directionStatus: 'SELECTED',
  };

  it('does not receive every foundation unit again', () => {
    const r = compose(VARIED, 18, STRONG_ALL);
    // The failure this phase exists to prevent: eighteen units of re-instruction labelled
    // MASTERY_VERIFIED, which reads as a full plan and teaches nothing new.
    expect(instructional(r)).toHaveLength(0);
  });

  it('has its basic instructional workload replaced by application', () => {
    const beginner = compose(VARIED, 18, BEGINNER);
    const strong = compose(VARIED, 18, STRONG_ALL);

    expect(instructional(strong).length).toBeLessThan(instructional(beginner).length);
    /**
     * Since P7A.3 a beginner reaches application too, so the two counts can tie on a fixture
     * with only three skills. What must still hold is the SHARE: a strong learner's plan is
     * mostly application, a beginner's is mostly instruction. That is the product decision —
     * same ninety days, different shape — and it does not depend on fixture size.
     */
    const share = (r: ReturnType<typeof compose>) => application(r).length / r.units.length;
    expect(share(strong)).toBeGreaterThan(share(beginner));
  });

  it('keeps every verified capability represented and explainable', () => {
    const r = compose(VARIED, 18, STRONG_ALL);
    // VERIFIED is not removal: each skill is still in the plan, and each still says why.
    for (const skill of ['T_L', 'T_F', 'T_S']) {
      expect(r.units.some(u => u.unitCode.startsWith(skill))).toBe(true);
    }
    expect(r.units.every(u => u.reason === 'MASTERY_VERIFIED')).toBe(true);
  });

  it('says the instruction was dropped for mastery rather than dropping it silently', () => {
    const r = compose(VARIED, 18, STRONG_ALL);
    const dropped = r.excluded.filter(e => e.reason === 'MASTERY_VERIFIED');
    expect(dropped.length).toBe(9);   // three instructional units per skill
  });

  it('still respects prerequisites among what it does keep', () => {
    const r = compose(VARIED, 18, STRONG_ALL);
    expect(r.blocked).toEqual([]);
    expect(r.prerequisites.every(o => o.resolution !== 'BLOCKED_MISSING_PREREQUISITE')).toBe(true);
  });
});

describe('P7A.1 — the beginner', () => {
  it('is never told an unmeasured skill is a gap', () => {
    const r = compose(VARIED, 12, BEGINNER);
    expect(r.units.every(u => u.reason !== 'DIAGNOSTIC_GAP')).toBe(true);
    expect(r.units.every(u => u.score === null)).toBe(true);
  });

  it('gets foundation instruction, in order', () => {
    const r = compose(VARIED, 12, BEGINNER);
    expect(instructional(r).length).toBeGreaterThan(0);

    const intro = r.units.findIndex(u => u.unitCode === 'T_L_INTRO');
    const deeper = r.units.findIndex(u => u.unitCode === 'T_L_DEEPER');
    expect(intro).toBeGreaterThanOrEqual(0);
    expect(intro).toBeLessThan(deeper);
  });

  it('does not jump straight to challenge work', () => {
    /**
     * REWRITTEN FOR P7A.3, AND THE CHANGE IS THE POINT.
     *
     * The old assertion was that a beginner receives NO application at all, which was true and
     * terrible: it is why the capacity audit found seven profiles getting ninety CONCEPT units
     * and not one of the 37 practice units ever selected. A student would read for three months
     * and never write anything.
     *
     * What was actually wrong was never "application is bad for beginners" — it was that the
     * composer judged them on day one and never noticed that the plan it was building would
     * teach them something. So the rule is not "no application"; it is "no application BEFORE
     * the instruction that earns it".
     */
    const r = compose(VARIED, 12, BEGINNER);
    const at = (code: string) => r.units.findIndex(u => u.unitCode === code);

    // It does now reach application — that is the fix.
    expect(application(r).length).toBeGreaterThan(0);

    // And never before the skill has been taught, and practised where a project is concerned.
    for (const topic of ['T_L', 'T_F', 'T_S']) {
      const debug = at(`${topic}_DEBUG`);
      const project = at(`${topic}_PROJECT`);
      const intro = at(`${topic}_INTRO`);
      const practice = at(`${topic}_PRACTICE`);

      if (debug >= 0) {
        expect(intro).toBeGreaterThanOrEqual(0);
        expect(intro).toBeLessThan(debug);
      }
      if (project >= 0) {
        // A project asserts STANDARD, which the plan only reaches by teaching AND practising.
        expect(practice).toBeGreaterThanOrEqual(0);
        expect(practice).toBeLessThan(project);
      }
    }
  });
});

describe('P7A.1 — the mixed learner', () => {
  /** Weak on loops, competent at functions, has demonstrated SQL. */
  const MIXED_STATES: StudentProfile = {
    skills: beliefs([['LOOPS', 22], ['FUNCS', 62], ['SQL', 93]]),
    primaryDirection: null,
    directionStatus: 'UNDECIDED',
  };

  it('gives the weak area more foundational coverage than the strong one', () => {
    const r = compose(VARIED, 18, MIXED_STATES);
    const loopsTeaching = r.units.filter(u => u.unitCode.startsWith('T_L') && !u.unitCode.match(/DEBUG|PROJECT/));
    const sqlTeaching = r.units.filter(u => u.unitCode.startsWith('T_S') && !u.unitCode.match(/DEBUG|PROJECT/));

    expect(loopsTeaching.length).toBeGreaterThan(sqlTeaching.length);
  });

  it('replaces the skipped basic capacity with application in the strong area', () => {
    const r = compose(VARIED, 18, MIXED_STATES);
    const sql = r.units.filter(u => u.unitCode.startsWith('T_S'));

    // SQL is verified: no instruction, but the area is still present through DEBUG and PROJECT.
    expect(sql.every(u => /DEBUG|PROJECT/.test(u.unitCode))).toBe(true);
    expect(sql.length).toBeGreaterThan(0);
  });

  it('explains each area with the reason that actually applies to it', () => {
    const r = compose(VARIED, 18, MIXED_STATES);
    const loops = r.units.find(u => u.unitCode.startsWith('T_L'))!;
    const sql = r.units.find(u => u.unitCode.startsWith('T_S'))!;

    expect(loops.reason).toBe('DIAGNOSTIC_GAP');
    expect(loops.score).toBe(22);
    expect(sql.reason).toBe('MASTERY_VERIFIED');
    expect(sql.score).toBe(93);
  });

  it('puts the weak area before the mastered one', () => {
    const r = compose(VARIED, 18, MIXED_STATES);
    const firstLoops = r.units.findIndex(u => u.unitCode.startsWith('T_L'));
    const firstSql = r.units.findIndex(u => u.unitCode.startsWith('T_S'));
    expect(firstLoops).toBeLessThan(firstSql);
  });
});
