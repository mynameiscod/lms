/**
 * STANDARD-known instruction: the narrow prerequisite bypass, and suppression of lessons a learner
 * reliably knows below the level they are at.
 *
 * Two claims, held separately because they fail differently:
 *
 *   1. SATISFIED_BY_STANDARD_EVIDENCE resolves ONLY a same-topic lesson whose every skill is measured,
 *      STANDARD or above, and confident — never practice, debugging, a project, another topic, thin
 *      evidence or a partly measured unit — and never outranks the stronger resolutions.
 *
 *   2. A lesson is left out of selection only when every skill it teaches is reliably known ABOVE the
 *      level its depth teaches to, and nobody authored its suitability. Beginners, gaps, guided
 *      learners, thin evidence and partial measurement keep their teaching; REVISION and VERIFIED
 *      learners are unchanged.
 */

import {
  composeUnits, ComposableUnit, StudentProfile, SkillBelief,
} from '../services/curriculumComposerService';
import {
  standardEvidenceSatisfies, knownInstruction, reliableStandardEvidence,
} from '../data/unitSuitabilityPolicy';
import { masteredBy, validatePlan, unusableFor } from '../services/composerCertificationService';

const unit = (over: Partial<ComposableUnit> & { unitCode: string }): ComposableUnit => ({
  title: over.unitCode,
  moduleCode: 'M03',
  topicCode: 'T_L',
  displayOrder: 10,
  skillKeys: ['LOOPS'],
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

const skills = (entries: [string, number, ('HIGH' | 'MEDIUM' | 'LOW')?][]): Map<string, SkillBelief> =>
  new Map(entries.map(([k, score, confidence]) => [k, { score, confidence: (confidence || 'HIGH') as any }]));

const learner = (entries: [string, number, ('HIGH' | 'MEDIUM' | 'LOW')?][]): StudentProfile => ({
  skills: skills(entries), primaryDirection: null, directionStatus: 'UNDECIDED',
});

const CONCEPT = unit({ unitCode: 'L_CONCEPT' });
const DEBUG = unit({ unitCode: 'L_DEBUG', unitType: 'DEBUG', displayOrder: 20, prerequisiteUnitCodes: ['L_CONCEPT'] });
const PRACTICE = unit({ unitCode: 'L_PRACTICE', unitType: 'PRACTICE', displayOrder: 30, prerequisiteUnitCodes: ['L_DEBUG'] });
const PROJECT = unit({ unitCode: 'L_PROJECT', unitType: 'PROJECT', displayOrder: 40, prerequisiteUnitCodes: ['L_PRACTICE'] });
const TOPIC = [CONCEPT, DEBUG, PRACTICE, PROJECT];

const outcome = (r: ReturnType<typeof composeUnits>, dependent: string, prerequisite?: string) =>
  r.prerequisites.find(o => o.unitCode === dependent && (!prerequisite || o.prerequisite === prerequisite))?.resolution;
const codes = (r: ReturnType<typeof composeUnits>) => r.units.map(u => u.unitCode);

/* ══════════════════════════════════════════════════════════════════════════════════════════ *
 * 1. The prerequisite bypass
 * ══════════════════════════════════════════════════════════════════════════════════════════ */

describe('SATISFIED_BY_STANDARD_EVIDENCE — what it accepts', () => {
  it('1. resolves a same-topic lesson for a confident STANDARD learner', () => {
    const s = learner([['LOOPS', 70]]);
    expect(standardEvidenceSatisfies(CONCEPT, DEBUG, s.skills)).toEqual({ skill: 'LOOPS', score: 70, state: 'STANDARD' });
    const r = composeUnits({ candidates: TOPIC, targetUnits: 3, student: s });
    expect(outcome(r, 'L_DEBUG')).toBe('SATISFIED_BY_STANDARD_EVIDENCE');
    expect(r.blocked).toEqual([]);
  });

  it('accepts MEDIUM confidence, which the existing semantics already count as enough', () => {
    expect(standardEvidenceSatisfies(CONCEPT, DEBUG, skills([['LOOPS', 70, 'MEDIUM']]))).not.toBeNull();
  });
});

describe('SATISFIED_BY_STANDARD_EVIDENCE — what it refuses', () => {
  it('2. refuses STANDARD on LOW confidence', () => {
    const s = learner([['LOOPS', 70, 'LOW']]);
    expect(standardEvidenceSatisfies(CONCEPT, DEBUG, s.skills)).toBeNull();
    const r = composeUnits({ candidates: TOPIC, targetUnits: 4, student: s });
    expect(r.prerequisites.some(o => o.resolution === 'SATISFIED_BY_STANDARD_EVIDENCE')).toBe(false);
    expect(outcome(r, 'L_DEBUG')).toBe('SATISFIED_BY_PLAN');
  });

  it('3. refuses a score of 90 on LOW confidence — capped at STANDARD, and still thin', () => {
    const s = learner([['LOOPS', 90, 'LOW']]);
    expect(standardEvidenceSatisfies(CONCEPT, DEBUG, s.skills)).toBeNull();
    const r = composeUnits({ candidates: TOPIC, targetUnits: 4, student: s });
    expect(r.prerequisites.every(o => o.resolution === 'SATISFIED_BY_PLAN')).toBe(true);
  });

  it('4. refuses when one taught skill is STANDARD and another is unmeasured', () => {
    const two = unit({ unitCode: 'L_TWO', skillKeys: ['LOOPS', 'NEVER_MEASURED'] });
    expect(standardEvidenceSatisfies(two, DEBUG, skills([['LOOPS', 70]]))).toBeNull();
  });

  it('5. refuses when one taught skill is below STANDARD', () => {
    const two = unit({ unitCode: 'L_TWO', skillKeys: ['LOOPS', 'RANGES'] });
    expect(standardEvidenceSatisfies(two, DEBUG, skills([['LOOPS', 70], ['RANGES', 55]]))).toBeNull();
  });

  it('refuses a lesson that teaches no skill at all', () => {
    expect(reliableStandardEvidence([], skills([['LOOPS', 70]]))).toBeNull();
    expect(standardEvidenceSatisfies(unit({ unitCode: 'L_NONE', skillKeys: [] }), DEBUG, skills([['LOOPS', 70]]))).toBeNull();
  });

  it('8. refuses a lesson in another topic', () => {
    const elsewhere = unit({ unitCode: 'M_DEBUG', topicCode: 'T_M', unitType: 'DEBUG', prerequisiteUnitCodes: ['L_CONCEPT'] });
    expect(standardEvidenceSatisfies(CONCEPT, elsewhere, skills([['LOOPS', 70]]))).toBeNull();
  });

  it.each([
    ['9. DEBUG', 'DEBUG'],
    ['10. PRACTICE', 'PRACTICE'],
    ['11. PROJECT', 'PROJECT'],
  ])('%s prerequisite in the same topic is never satisfied by STANDARD evidence', (_label, type) => {
    const prerequisite = unit({ unitCode: 'L_WORK', unitType: type as any });
    expect(standardEvidenceSatisfies(prerequisite, PROJECT, skills([['LOOPS', 70]]))).toBeNull();
  });

  it('never writes anything into the learner\'s skills', () => {
    const s = learner([['LOOPS', 70]]);
    const before = JSON.stringify([...s.skills]);
    composeUnits({ candidates: TOPIC, targetUnits: 3, student: s });
    expect(JSON.stringify([...s.skills])).toBe(before);
  });
});

describe('SATISFIED_BY_STANDARD_EVIDENCE — precedence keeps the stronger meanings', () => {
  it('6. REVISION stays SATISFIED_BY_EVIDENCE', () => {
    const r = composeUnits({ candidates: TOPIC, targetUnits: 3, student: learner([['LOOPS', 80]]) });
    expect(outcome(r, 'L_DEBUG')).toBe('SATISFIED_BY_EVIDENCE');
    expect(r.prerequisites.some(o => o.resolution === 'SATISFIED_BY_STANDARD_EVIDENCE')).toBe(false);
  });

  it('7. VERIFIED stays SATISFIED_BY_MASTERY', () => {
    const r = composeUnits({ candidates: TOPIC, targetUnits: 2, student: learner([['LOOPS', 92]]) });
    expect(r.prerequisites.every(o => ['SATISFIED_BY_MASTERY', 'SATISFIED_BY_PLAN'].includes(o.resolution))).toBe(true);
    expect(r.prerequisites.some(o => o.resolution === 'SATISFIED_BY_STANDARD_EVIDENCE')).toBe(false);
  });

  it('is what certification accepts too — same topic lesson only', () => {
    const byCode = new Map(TOPIC.map(u => [u.unitCode, u]));
    const s = learner([['LOOPS', 70]]);
    expect(masteredBy('L_CONCEPT', DEBUG, byCode, s)).toBe(true);
    expect(masteredBy('L_DEBUG', PRACTICE, byCode, s)).toBe(false);
    expect(masteredBy('L_CONCEPT', DEBUG, byCode, learner([['LOOPS', 70, 'LOW']]))).toBe(false);
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════ *
 * 2. Known-instruction suppression
 * ══════════════════════════════════════════════════════════════════════════════════════════ */

describe('a lesson this learner already knows below their level', () => {
  it.each([
    ['NOT_EXPOSED (beginner)', [] as [string, number][]],
    ['FOUNDATION_REQUIRED', [['LOOPS', 30]] as [string, number][]],
    ['GUIDED', [['LOOPS', 55]] as [string, number][]],
  ])('%s: the lesson stays selectable and is taught', (_label, entries) => {
    const s = learner(entries);
    expect(knownInstruction(CONCEPT, s.skills)).toBeNull();
    const r = composeUnits({ candidates: TOPIC, targetUnits: 2, student: s });
    expect(codes(r)).toContain('L_CONCEPT');
    expect(r.knownInstruction).toEqual([]);
  });

  it('STANDARD, HIGH: a first-exposure lesson is not re-taught, and its capacity goes to the work', () => {
    const s = learner([['LOOPS', 70]]);
    expect(knownInstruction(CONCEPT, s.skills)).not.toBeNull();
    const r = composeUnits({ candidates: TOPIC, targetUnits: 3, student: s });
    expect(codes(r)).not.toContain('L_CONCEPT');
    expect(codes(r)).toEqual(expect.arrayContaining(['L_DEBUG', 'L_PRACTICE', 'L_PROJECT']));
    expect(r.units).toHaveLength(3);
    expect(r.knownInstruction?.map(k => k.unitCode)).toEqual(['L_CONCEPT']);
    expect(r.excluded.some(e => e.unitCode === 'L_CONCEPT')).toBe(false);
  });

  it('STANDARD, HIGH: a GUIDED lesson is also below their level and not re-taught', () => {
    expect(knownInstruction(unit({ unitCode: 'L_G', defaultDepth: 'GUIDED' }), skills([['LOOPS', 70]]))).not.toBeNull();
  });

  it('STANDARD, HIGH: a STANDARD-depth lesson teaches only what their evidence already establishes', () => {
    const atLevel = unit({ unitCode: 'L_STANDARD', defaultDepth: 'STANDARD' });
    expect(knownInstruction(atLevel, skills([['LOOPS', 70]]))).not.toBeNull();
  });

  it('STANDARD, HIGH: a lesson whose depth teaches BEYOND their evidence is genuinely deeper, and kept', () => {
    const deeper = unit({ unitCode: 'L_DEEPER', defaultDepth: 'REVISION' });
    expect(knownInstruction(deeper, skills([['LOOPS', 70]]))).toBeNull();
    const r = composeUnits({ candidates: [deeper], targetUnits: 1, student: learner([['LOOPS', 70]]) });
    expect(codes(r)).toEqual(['L_DEEPER']);
  });

  it('STANDARD, HIGH: a lesson on a skill they have NOT reliably shown is still taught', () => {
    const other = unit({ unitCode: 'L_OTHER', skillKeys: ['RECURSION'] });
    const r = composeUnits({ candidates: [CONCEPT, other], targetUnits: 1, student: learner([['LOOPS', 70]]) });
    expect(codes(r)).toEqual(['L_OTHER']);
  });

  it('STANDARD, LOW: nothing is suppressed — thin evidence buys no shortcut', () => {
    const s = learner([['LOOPS', 70, 'LOW']]);
    expect(knownInstruction(CONCEPT, s.skills)).toBeNull();
    const r = composeUnits({ candidates: TOPIC, targetUnits: 4, student: s });
    expect(codes(r)).toContain('L_CONCEPT');
  });

  it('PARTIALLY MEASURED: nothing is suppressed — silence is not knowledge', () => {
    const two = unit({ unitCode: 'L_TWO', skillKeys: ['LOOPS', 'NEVER_MEASURED'] });
    expect(knownInstruction(two, skills([['LOOPS', 70]]))).toBeNull();
  });

  it('an authored suitability wins — the author decided who that lesson serves', () => {
    const authored = unit({ unitCode: 'L_AUTHORED', suitableStates: ['NOT_EXPOSED', 'GUIDED', 'STANDARD', 'REVISION'] as any });
    expect(knownInstruction(authored, skills([['LOOPS', 70]]))).toBeNull();
    expect(knownInstruction(authored, skills([['LOOPS', 80]]))).toBeNull();
  });

  it('an unknown depth suppresses nothing', () => {
    expect(knownInstruction(unit({ unitCode: 'L_Q', defaultDepth: 'SOMETHING_NEW' }), skills([['LOOPS', 70]]))).toBeNull();
  });

  it('REVISION: behaviour is unchanged — no lesson, practice before project, evidence resolution', () => {
    const r = composeUnits({ candidates: TOPIC, targetUnits: 3, student: learner([['LOOPS', 80]]) });
    expect(codes(r)).not.toContain('L_CONCEPT');
    expect(codes(r).indexOf('L_PRACTICE')).toBeLessThan(codes(r).indexOf('L_PROJECT'));
    expect(outcome(r, 'L_DEBUG')).toBe('SATISFIED_BY_EVIDENCE');
  });

  it('VERIFIED: application and projects are still scheduled', () => {
    const r = composeUnits({ candidates: TOPIC, targetUnits: 2, student: learner([['LOOPS', 92]]) });
    expect(codes(r)).toEqual(expect.arrayContaining(['L_DEBUG', 'L_PROJECT']));
    expect(codes(r)).not.toContain('L_CONCEPT');
  });

  describe('a multi-skill lesson', () => {
    const multi = unit({ unitCode: 'L_MULTI', skillKeys: ['LOOPS', 'RANGES'] });
    it('is suppressed when EVERY taught skill qualifies', () => {
      expect(knownInstruction(multi, skills([['LOOPS', 70], ['RANGES', 72]]))).toEqual({ skill: 'LOOPS', score: 70, state: 'STANDARD' });
    });
    it('is kept when one skill is below STANDARD', () => {
      expect(knownInstruction(multi, skills([['LOOPS', 70], ['RANGES', 50]]))).toBeNull();
    });
    it('is kept when one skill is on thin evidence', () => {
      expect(knownInstruction(multi, skills([['LOOPS', 70], ['RANGES', 72, 'LOW']]))).toBeNull();
    });
  });

  it('never teaches towards a known lesson through a prerequisite pull', () => {
    // The only lesson is known; the practical chain behind it must not drag it back in.
    const r = composeUnits({ candidates: TOPIC, targetUnits: 4, student: learner([['LOOPS', 70]]) });
    expect(codes(r)).not.toContain('L_CONCEPT');
    expect(r.units).toHaveLength(3);
    expect(r.ok).toBe(false);
  });
});

describe('certification judges a known lesson the way the composer does', () => {
  it('counts a suppressed lesson as unusable, not as "usable but unselected"', () => {
    const s = learner([['LOOPS', 70]]);
    expect(unusableFor(CONCEPT, s)).toBe(true);
    expect(unusableFor(CONCEPT, learner([['LOOPS', 70, 'LOW']]))).toBe(false);
  });

  it('flags a plan that re-teaches a known lesson', () => {
    const s = learner([['LOOPS', 70]]);
    const lowPlan = composeUnits({ candidates: TOPIC, targetUnits: 4, student: learner([['LOOPS', 70, 'LOW']]) });
    const rep = validatePlan({ result: lowPlan, universe: TOPIC, student: s, target: 4 });
    expect(rep.issues.map(i => i.code)).toContain('KNOWN_REINSTRUCTED');
  });

  it('certifies the compressed plan cleanly', () => {
    const s = learner([['LOOPS', 70]]);
    const r = composeUnits({ candidates: TOPIC, targetUnits: 3, student: s });
    const rep = validatePlan({ result: r, universe: TOPIC, student: s, target: 3 });
    expect(rep.issues.filter(i => ['KNOWN_REINSTRUCTED', 'PREREQ_UNMET', 'PREREQ_ORDER', 'SHAPE_UNEXPLAINED'].includes(i.code))).toEqual([]);
  });
});
