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

  it('reports a prerequisite that is not in the pool rather than refusing to plan', () => {
    // The pool is filtered by READINESS, so a missing prerequisite usually means nobody has
    // authored it yet. Refusing would turn an authoring gap into an empty plan.
    const orphan = [unit({ unitCode: 'T_A_9', prerequisiteUnitCodes: ['T_A_NOT_AUTHORED'] })];
    const r = compose(orphan, 1, BEGINNER);

    expect(r.ok).toBe(true);
    expect(r.unmetPrerequisites).toEqual([
      { unitCode: 'T_A_9', missing: ['T_A_NOT_AUTHORED'] },
    ]);
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
  it('puts a measured gap before unmeasured material', () => {
    const r = compose(MIXED, 9, MIXEDP);
    const gap = r.units.findIndex(u => u.unitCode === 'T_A_1');
    const unexposed = r.units.findIndex(u => u.unitCode === 'T_B_1');
    // A scored 25 — a real gap. B scored 62 and is merely standard.
    expect(gap).toBeLessThan(unexposed);
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
      unit({ unitCode: 'MASTERED', skillKeys: ['B'], topicCode: 'T_3' }),
    ];
    expect(codes(compose(pool, 3, student))).toEqual(['GAP', 'UNKNOWN', 'MASTERED']);
  });
});

describe('VERIFIED is not removed', () => {
  it('still includes units for skills the student has demonstrated', () => {
    // Silently deleting what somebody already knows leaves them unable to tell mastery from an
    // omission.
    const r = compose(MIXED, 9, STRONG);
    expect(codes(r)).toContain('T_A_1');
  });

  it('marks them MASTERY_VERIFIED and puts them last', () => {
    const student: StudentProfile = { ...BEGINNER, skills: beliefs([['A', 95], ['B', 30]]) };
    const pool = [
      unit({ unitCode: 'KNOWN', skillKeys: ['A'], topicCode: 'T_1' }),
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
    // What it COULD build is still returned, so a caller can show the gap rather than nothing.
    expect(r.units.length).toBe(r.eligibleUnits);
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
