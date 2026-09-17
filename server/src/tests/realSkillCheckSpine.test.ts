/**
 * A learner exactly as the Foundation Skill Check produces them keeps the programming spine.
 *
 * The Skill Check measures six Foundation skills. A beginner who answered it wrongly had hardware, files,
 * pseudocode, decomposition and shell at FOUNDATION_REQUIRED; state ranks first, so those blocks spent the
 * foundation-instruction capacity the spine reservation only ranked for, and conditions, loops and functions
 * never entered — every certification profile green, because none of them was a real Skill Check. The same
 * happened to a partial learner at PROGRAMMING_FUNDAMENTALS 46.
 *
 * The reservation now holds capacity: instruction off an unresolved spine topic's path to first practice is
 * taken only while it leaves the spine's share of its role, whenever instruction that does is available.
 * These tests hold the real learners, the rule's generality, and every profile the accepted sequencing protects.
 */

import READY_JSON from './fixtures/phase21/ready-inventory.json';
import SETS from './fixtures/phase21/publish-sets.json';
import { ComposableUnit, StudentProfile, composeUnits } from '../services/curriculumComposerService';
import {
  REALISTIC_PROFILES, REAL_SKILL_CHECK_PROFILES, REAL_SKILL_CHECK_PAPER, skillCheckLearner, skillUniverse,
  spineFirstPractices, spineContinuityIssues, validatePlan, isDeterministic, PROGRAMMING_SPINE_TOPICS,
  auditBackbone, backboneEndLoading,
} from '../services/composerCertificationService';
import { stateForScore } from '../data/adaptiveCurriculumPolicy';
import { FOUNDATION_PROGRAM_DAYS } from '../data/ninetyDayPolicy';

const READY = READY_JSON as unknown as ComposableUnit[];
const PRODUCTION = READY.filter(u => new Set(SETS.recommended).has(u.unitCode));
const byCode = new Map(PRODUCTION.map(u => [u.unitCode, u]));
const { allSkills, universalSkills } = skillUniverse(READY);
const realistic = (key: string) => REALISTIC_PROFILES.find(p => p.key === key)!.build(allSkills, universalSkills);
const real = (key: string) => REAL_SKILL_CHECK_PROFILES.find(p => p.key === key)!.build();
const compose = (student: StudentProfile) => composeUnits({ candidates: PRODUCTION, targetUnits: FOUNDATION_PROGRAM_DAYS, student });
const everyUniversal = (score: number): StudentProfile => ({
  skills: new Map(universalSkills.map(k => [k, { score, confidence: 'HIGH' as const }])), primaryDirection: null, directionStatus: 'UNDECIDED',
});
const inOrder = (days: (number | null)[]) => days.every((d, i) => d !== null && (i === 0 || d > (days[i - 1] as number)));

describe('the real Skill Check learners', () => {
  it('are built from the paper: six Foundation skills, MEDIUM, at the scores the real sitting produced', () => {
    const beginner = real('REAL_SKILL_CHECK_BEGINNER');
    expect([...beginner.skills.keys()].sort()).toEqual([...new Set(REAL_SKILL_CHECK_PAPER.map(i => i.skillKey))].sort());
    expect([...beginner.skills.values()].every(b => b.score === 0 && b.confidence === 'MEDIUM')).toBe(true);
    expect([...beginner.skills.values()].every(b => stateForScore(b as any) === 'FOUNDATION_REQUIRED')).toBe(true);
    const partial = real('REAL_SKILL_CHECK_PARTIAL');
    expect(partial.skills.get('PROGRAMMING_FUNDAMENTALS')).toEqual({ score: 46, confidence: 'MEDIUM' });
    expect(stateForScore(partial.skills.get('PROGRAMMING_FUNDAMENTALS') as any)).toBe('GUIDED');
    expect(partial.skills.get('SHELL_COMMANDS')?.score).toBe(26);
    expect(partial.skills.get('PROBLEM_SOLVING')?.score).toBe(25);
  });

  it('1-2. a beginner who answered the whole Skill Check wrongly reaches every spine practice, in order', () => {
    const days = spineFirstPractices(compose(real('REAL_SKILL_CHECK_BEGINNER')), PRODUCTION);
    expect(days.every(d => d !== null)).toBe(true);
    expect(inOrder(days)).toBe(true);
  });

  it('3. a partial learner (PROGRAMMING_FUNDAMENTALS 46 MEDIUM, GUIDED) reaches every spine practice, in order', () => {
    const days = spineFirstPractices(compose(real('REAL_SKILL_CHECK_PARTIAL')), PRODUCTION);
    expect(inOrder(days)).toBe(true);
  });

  it('keeps the spine teachable: after the computing and thinking backbone, not crammed into the last weeks', () => {
    for (const p of REAL_SKILL_CHECK_PROFILES) {
      const student = p.build();
      const r = compose(student);
      const days = spineFirstPractices(r, PRODUCTION) as number[];
      expect({ key: p.key, variablesByDay40: days[0] <= 40, arraysBy75: days[4] <= 75 })
        .toEqual({ key: p.key, variablesByDay40: true, arraysBy75: true });
      expect({ key: p.key, endLoaded: backboneEndLoading(auditBackbone(r.units.map(u => u.unitCode), PRODUCTION, student)) })
        .toEqual({ key: p.key, endLoaded: [] });
    }
  });

  it('4. no combination of additional low foundation scores erases the unresolved spine', () => {
    const others = ['HOW_COMPUTERS_WORK', 'FILE_SYSTEMS_PERMISSIONS', 'PSEUDOCODE_FLOWCHARTS', 'SHELL_COMMANDS', 'PROBLEM_SOLVING'];
    const full = real('REAL_SKILL_CHECK_BEGINNER');
    for (let mask = 0; mask < 1 << others.length; mask++) {
      const keep = new Set(['PROGRAMMING_FUNDAMENTALS', ...others.filter((_k, i) => mask & (1 << i))]);
      const student: StudentProfile = { ...full, skills: new Map([...full.skills].filter(([k]) => keep.has(k))) };
      const days = spineFirstPractices(compose(student), PRODUCTION);
      expect({ measured: [...keep].sort().join(','), days, ordered: inOrder(days) })
        .toEqual({ measured: [...keep].sort().join(','), days, ordered: true });
    }
  });

  it('holds the certification gate: no continuity issue, a valid plan, exactly ninety, byte-stable', () => {
    for (const p of REAL_SKILL_CHECK_PROFILES) {
      const student = p.build();
      const r = compose(student);
      expect({ key: p.key, spine: spineContinuityIssues(r, PRODUCTION) }).toEqual({ key: p.key, spine: [] });
      const rep = validatePlan({ result: r, universe: PRODUCTION, student });
      expect({ key: p.key, issues: rep.issues.map(i => `${i.code}:${i.detail}`) }).toEqual({ key: p.key, issues: [] });
      expect(r.units).toHaveLength(90);
      expect(new Set(r.units.map(u => u.unitCode)).size).toBe(90);
      expect(isDeterministic(PRODUCTION, student)).toBe(true);
    }
  });

  it('14. the backbone may take an instruction role past its target, never a plan past a floor or past ninety days', () => {
    // A beginner's foundation target is 24 and the backbone's first-exposure lessons are 38: the allocation is a target
    // for the shape, not a ration of the backbone. Every floor still holds, and the plan is still ninety days.
    for (const p of REAL_SKILL_CHECK_PROFILES) {
      const r = compose(p.build());
      expect({ key: p.key, violations: r.shapeViolations }).toEqual({ key: p.key, violations: [] });
      expect(Object.values(r.composition).reduce((a, b) => a + b, 0)).toBe(90);
    }
  });

  it('15. is still a Foundation course, not a programming course', () => {
    for (const p of REAL_SKILL_CHECK_PROFILES) {
      const units = compose(p.build()).units.map(u => byCode.get(u.unitCode)!);
      const spine = units.filter(u => PROGRAMMING_SPINE_TOPICS.includes(u.topicCode)).length;
      const modules = new Set(units.map(u => u.moduleCode));
      expect({ key: p.key, spineShare: spine <= 45 }).toEqual({ key: p.key, spineShare: true });
      // Computing, thinking, tools and data are backbone; career exploration is a floor every plan holds.
      for (const m of ['M01_CS_FUNDAMENTALS', 'M02_COMPUTATIONAL_THINKING', 'M04_DEVELOPER_TOOLS', 'M08_DATABASES', 'M13_CAREER']) {
        expect({ key: p.key, module: m, present: modules.has(m) }).toEqual({ key: p.key, module: m, present: true });
      }
      expect(units.some(u => u.unitType === 'PROJECT')).toBe(true);
      expect(units.some(u => ['CHECKPOINT', 'REVIEW'].includes(u.unitType))).toBe(true);
    }
  });
});

describe('every profile the accepted sequencing protects', () => {
  it('5. the no-evidence beginner reaches the spine practices on days 33, 39, 46, 52 and 57, after the computing and thinking backbone', () => {
    expect(spineFirstPractices(compose(realistic('beginner')), PRODUCTION)).toEqual([33, 39, 46, 52, 57]);
  });

  it('keeps the single-score partial profiles', () => {
    const pf = (score: number): StudentProfile => ({ ...realistic('beginner'), skills: new Map([['PROGRAMMING_FUNDAMENTALS', { score, confidence: 'MEDIUM' as const }]]) });
    expect(spineFirstPractices(compose(pf(30)), PRODUCTION)).toEqual([18, 39, 46, 52, 57]);
    expect(spineFirstPractices(compose(pf(46)), PRODUCTION)).toEqual([33, 39, 46, 52, 57]);
    expect(spineFirstPractices(compose(pf(62)), PRODUCTION)).toEqual([33, 39, 46, 52, 57]);
  });

  it('6. still compresses a reliably known spine: its lessons are not taught back', () => {
    const spineSkills = [...new Set(PRODUCTION.filter(u => PROGRAMMING_SPINE_TOPICS.includes(u.topicCode)).flatMap(u => u.skillKeys))];
    const known: StudentProfile = { ...realistic('beginner'), skills: new Map(spineSkills.map(k => [k, { score: 72, confidence: 'HIGH' as const }])) };
    const lessons = (s: StudentProfile) => compose(s).units.map(u => byCode.get(u.unitCode)!)
      .filter(u => PROGRAMMING_SPINE_TOPICS.includes(u.topicCode) && ['CONCEPT', 'WORKED_EXAMPLE'].includes(u.unitType)).length;
    expect(lessons(known)).toBeLessThan(lessons(realistic('beginner')) / 2);
  });

  // The good and strong learners keep their direction-led, practice-heavy shapes with the backbone compressed into them.
  it('7. @70 keeps its shape', () => {
    expect(compose(everyUniversal(70)).composition).toMatchObject({ DIRECTION_LEARNING: 25, PRACTICE: 30, APPLICATION: 9, INTEGRATION: 4, VERIFICATION: 2 });
  });

  it('8. @78 keeps its shape', () => {
    expect(compose(everyUniversal(78)).composition).toMatchObject({ DIRECTION_LEARNING: 27, PRACTICE: 15, APPLICATION: 13, INTEGRATION: 11, VERIFICATION: 5 });
  });

  it('9. a strong learner keeps its shape', () => {
    expect(compose(realistic('strong-universal')).composition).toMatchObject({ DIRECTION_LEARNING: 29, APPLICATION: 13, INTEGRATION: 11, VERIFICATION: 7 });
  });

  it('10. mixed keeps every spine practice and every floor', () => {
    const student = realistic('mixed');
    const r = compose(student);
    expect(spineFirstPractices(r, PRODUCTION).every(d => d !== null)).toBe(true);
    expect(r.composition).toEqual({
      FOUNDATION_INSTRUCTION: 38, GUIDED_INSTRUCTION: 12, ADVANCED_UNIVERSAL: 17, DIRECTION_LEARNING: 0,
      EXPLORATION: 1, PRACTICE: 12, APPLICATION: 7, INTEGRATION: 2, VERIFICATION: 1,
    });
    for (const a of r.allocation) expect({ role: a.role, meetsFloor: r.composition[a.role] >= a.min }).toEqual({ role: a.role, meetsFloor: true });
  });

  it('keeps exploration for the exploring learner, and software_backend compresses the spine it has shown', () => {
    // A lightly measured exploring learner spends most of ninety days on the backbone; career exploration stays.
    const exploring = compose(realistic('undecided')).composition;
    expect(exploring.DIRECTION_LEARNING + exploring.EXPLORATION).toBeGreaterThanOrEqual(5);
    // Programming at 66: variables and functions practice at once, conditions, loops and arrays by their first practical unit.
    expect(spineFirstPractices(compose(realistic('software_backend')), PRODUCTION)).toEqual([1, 21, 32, 4, 38]);
  });

  it('11-13. every realistic and real learner is exactly ninety, valid and byte-stable', () => {
    const learners: [string, StudentProfile][] = [
      ...REALISTIC_PROFILES.map(p => [p.key, p.build(allSkills, universalSkills)] as [string, StudentProfile]),
      ...REAL_SKILL_CHECK_PROFILES.map(p => [p.key, p.build()] as [string, StudentProfile]),
      ['@70', everyUniversal(70)], ['@78', everyUniversal(78)],
    ];
    for (const [key, student] of learners) {
      const r = compose(student);
      const rep = validatePlan({ result: r, universe: PRODUCTION, student });
      expect({ key, length: r.units.length, distinct: new Set(r.units.map(u => u.unitCode)).size, prerequisites: rep.issues.filter(i => /PREREQ/.test(i.code)).length })
        .toEqual({ key, length: 90, distinct: 90, prerequisites: 0 });
    }
    expect(isDeterministic(PRODUCTION, realistic('mixed'))).toBe(true);
  });

  it('a learner from any Skill Check answers is exactly ninety and keeps the spine ordered when programming is unresolved', () => {
    const answers = [
      REAL_SKILL_CHECK_PAPER.map((_i, n) => (n % 2 ? 1 : 0)),
      REAL_SKILL_CHECK_PAPER.map(i => (i.skillKey === 'PROGRAMMING_FUNDAMENTALS' ? 0 : 1)),
      REAL_SKILL_CHECK_PAPER.map(i => (i.difficulty === 'EASY' ? 1 : 0)),
    ];
    for (const a of answers) {
      const r = compose(skillCheckLearner(a));
      expect(r.units).toHaveLength(90);
      expect(inOrder(spineFirstPractices(r, PRODUCTION))).toBe(true);
    }
  });
});
