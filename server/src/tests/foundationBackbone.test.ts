/**
 * The mandatory Foundation backbone: every learner covers every mandatory fundamental; evidence decides how deeply.
 *
 * Before it, evidence decided whether a fundamental was there at all: a real Skill Check beginner lost files,
 * decomposition and pseudocode to capacity, and a learner who answered a few checkpoints right lost conditions, loops
 * and functions. These tests hold the classification, full coverage for every certified learner at the depth their
 * evidence earns, compression that rises with evidence into advanced and applied work, the content gap a learner no
 * treatment could serve would be reported as, and the backbone through reassessment.
 */

import READY_JSON from './fixtures/phase21/ready-inventory.json';
import SETS from './fixtures/phase21/publish-sets.json';
import { ComposableUnit, StudentProfile, composeUnits } from '../services/curriculumComposerService';
import {
  BACKBONE_PROFILES, auditBackbone, backboneIssues, backboneEndLoading, backboneTopicsOf, compressionLadder,
  simulateBackboneRecomposition, recompositionContinuityIssues, skillUniverse, validatePlan, isDeterministic,
  evidenceLearner, diagnosticSkills, PROGRAMMING_SPINE_TOPICS,
} from '../services/composerCertificationService';
import { backboneClassificationProblems, EXCLUDED_AREAS } from '../data/foundationBackbonePolicy';
import { FOUNDATION_MODULES, seededBackboneTopicCodes } from '../seeds/careerPilot/foundationSkillMap';
import { FOUNDATION_PROGRAM_DAYS } from '../data/ninetyDayPolicy';

const READY = READY_JSON as unknown as ComposableUnit[];
const PRODUCTION = READY.filter(u => new Set(SETS.recommended).has(u.unitCode));
const { allSkills, universalSkills } = skillUniverse(READY);
const profile = (key: string) => BACKBONE_PROFILES.find(p => p.key === key)!.build(allSkills, universalSkills);
const compose = (student: StudentProfile, pool = PRODUCTION) => composeUnits({ candidates: pool, targetUnits: FOUNDATION_PROGRAM_DAYS, student });
const audit = (student: StudentProfile) => auditBackbone(compose(student).units.map(u => u.unitCode), PRODUCTION, student);
const CANONICAL = ['T_HARDWARE', 'T_FILES', 'T_DECOMPOSITION', 'T_PSEUDOCODE', 'T_VARIABLES', 'T_CONDITIONS', 'T_LOOPS', 'T_FUNCTIONS', 'T_ARRAYS', 'T_GIT', 'T_SQL'];

describe('the backbone classification', () => {
  it('is the eleven audited topics, seeded on the curriculum and carried onto every unit of them', () => {
    expect(seededBackboneTopicCodes().sort()).toEqual([...CANONICAL].sort());
    expect(backboneTopicsOf(PRODUCTION)).toEqual(CANONICAL);
    for (const u of READY) expect({ unit: u.unitCode, backbone: !!u.backbone }).toEqual({ unit: u.unitCode, backbone: CANONICAL.includes(u.topicCode) });
  });

  it('draws only on mandatory, direction-independent topics', () => {
    for (const m of FOUNDATION_MODULES) {
      for (const t of m.topics.filter(x => x.backbone)) {
        expect({ topic: t.topicCode, problems: backboneClassificationProblems({ topicCode: t.topicCode, mandatory: t.category === 'UNIVERSAL', applicableDirections: t.applicableDirections }) })
          .toEqual({ topic: t.topicCode, problems: [] });
      }
    }
    expect(backboneClassificationProblems({ topicCode: 'T_X', mandatory: false })).toHaveLength(1);
    expect(backboneClassificationProblems({ topicCode: 'T_X', mandatory: true, applicableDirections: ['AI_ML'] })).toHaveLength(1);
    expect(backboneClassificationProblems({ topicCode: '', mandatory: true })).toHaveLength(1);
  });

  it('explains every expected area it did not make mandatory', () => {
    const explained = EXCLUDED_AREAS.flatMap(a => a.topics);
    for (const t of ['T_AI_LITERACY', 'T_GENAI', 'T_AI_CODING', 'T_HTTP', 'T_EDITOR', 'T_SHELL_PIPELINES', 'T_CAREER_MAP']) expect(explained).toContain(t);
    for (const t of CANONICAL) expect(explained).not.toContain(t);
  });

  it('every requirement has a teaching path for a beginner and a practical treatment a VERIFIED learner can be given', () => {
    const verified = evidenceLearner(diagnosticSkills(), () => [1, 1, 1, 1, 1, 1, 1, 1]);
    const r = compose(verified);
    expect((r.structure || []).filter(s => s.coverage === 'NO_SUITABLE_TREATMENT')).toEqual([]);
  });
});

describe('every certified learner covers every fundamental, in exactly ninety days', () => {
  for (const p of BACKBONE_PROFILES) {
    it(`${p.key}: ninety valid days, every requirement covered, in course order, deterministic`, () => {
      const student = p.build(allSkills, universalSkills);
      const r = compose(student);
      const a = auditBackbone(r.units.map(u => u.unitCode), PRODUCTION, student);
      expect(r.units).toHaveLength(90);
      expect(new Set(r.units.map(u => u.unitCode)).size).toBe(90);
      expect({ key: p.key, missing: a.missing, issues: backboneIssues(a) }).toEqual({ key: p.key, missing: [], issues: [] });
      expect({ key: p.key, plan: validatePlan({ result: r, universe: PRODUCTION, student }).issues }).toEqual({ key: p.key, plan: [] });
      expect(r.blocked).toEqual([]);
      expect(backboneEndLoading(a)).toEqual([]);
      expect(isDeterministic(PRODUCTION, student)).toBe(true);
    });
  }
});

describe('the real Skill Check beginner is taught every fundamental in full', () => {
  it('covers files, decomposition and pseudocode — previously dropped — and the whole spine, taught to first practice', () => {
    const a = audit(profile('REAL_SKILL_CHECK_BEGINNER'));
    const mode = Object.fromEntries(a.requirements.map(r => [r.requirement, r.mode]));
    for (const t of ['T_HARDWARE', 'T_FILES', 'T_DECOMPOSITION', 'T_PSEUDOCODE', ...PROGRAMMING_SPINE_TOPICS.filter(t => t !== 'T_ARRAYS')]) {
      expect({ t, mode: mode[t] }).toEqual({ t, mode: 'FULL' });
    }
    for (const t of ['T_ARRAYS', 'T_GIT', 'T_SQL']) expect({ t, taught: ['FULL', 'GUIDED'].includes(mode[t]!) }).toEqual({ t, taught: true });
  });

  it('meets them as a taught course: computing and thinking, then the spine in order, then tools and data', () => {
    const a = audit(profile('REAL_SKILL_CHECK_BEGINNER'));
    const last = Object.fromEntries(a.requirements.map(r => [r.requirement, r.lastDay!]));
    expect(last.T_HARDWARE).toBeLessThan(last.T_FILES);
    expect(last.T_DECOMPOSITION).toBeLessThan(last.T_PSEUDOCODE);
    expect(last.T_PSEUDOCODE).toBeLessThan(last.T_VARIABLES);
    const spine = PROGRAMMING_SPINE_TOPICS.map(t => last[t]);
    expect(spine.every((d, i) => i === 0 || d > spine[i - 1])).toBe(true);
    expect(last.T_ARRAYS).toBeLessThan(last.T_GIT);
    expect(last.T_GIT).toBeLessThan(last.T_SQL);
  });

  it('still holds a project, a checkpoint and career exploration', () => {
    const a = audit(profile('REAL_SKILL_CHECK_BEGINNER'));
    expect(a.roles.INTEGRATION).toBeGreaterThanOrEqual(2);
    expect(a.roles.VERIFICATION).toBeGreaterThanOrEqual(1);
    expect(a.roles.EXPLORATION).toBeGreaterThanOrEqual(1);
  });
});

describe('a very strong learner covers the fundamentals compactly and moves on', () => {
  const student = profile('VERY_STRONG');
  const a = audit(student);

  it('is VERIFIED from answered items, not injected states', () => {
    const scores = [...student.skills.values()];
    expect(scores.every(b => (b.score ?? 0) >= 85 && b.confidence === 'HIGH')).toBe(true);
  });

  it('covers every fundamental in about eleven days, with no elementary lesson among them', () => {
    expect(a.missing).toEqual([]);
    expect(a.fundamentalDays).toBeLessThanOrEqual(15);
    for (const r of a.requirements) expect({ r: r.requirement, compact: !['FULL', 'GUIDED'].includes(r.mode!) }).toEqual({ r: r.requirement, compact: true });
    expect(a.lastBackboneDay).toBeLessThanOrEqual(15);
  });

  it('spends the saved days on advanced, direction, application, projects and verification', () => {
    expect(a.elementaryInstruction).toBeLessThanOrEqual(2);
    expect(a.advancedAndApplied).toBeGreaterThanOrEqual(65);
    expect(a.roles.DIRECTION_LEARNING).toBeGreaterThanOrEqual(20);
    expect(a.roles.INTEGRATION).toBeGreaterThanOrEqual(8);
    expect(a.roles.VERIFICATION).toBeGreaterThanOrEqual(5);
  });

  it('meets the same fundamentals through different authored units than the beginner — not a relabelling', () => {
    const beginner = audit(profile('REAL_SKILL_CHECK_BEGINNER'));
    for (const t of PROGRAMMING_SPINE_TOPICS) {
      const b = beginner.requirements.find(r => r.requirement === t)!.coveredBy;
      const s = a.requirements.find(r => r.requirement === t)!.coveredBy;
      const types = (codes: string[]) => codes.map(c => PRODUCTION.find(u => u.unitCode === c)!.unitType);
      // The beginner is taught the lessons and practises; the strong learner is given a practical unit, often the very
      // debugging exercise the beginner meets after those lessons — without them.
      expect({ t, beginnerTaught: types(b).includes('CONCEPT'), strongTaught: types(s).includes('CONCEPT'), smaller: s.length < b.length })
        .toEqual({ t, beginnerTaught: true, strongTaught: false, smaller: true });
    }
  });
});

describe('compression follows evidence', () => {
  it('elementary instruction and fundamental days never rise as the same learner is measured stronger', () => {
    const ladder = compressionLadder(PRODUCTION);
    expect(ladder.exceptions).toEqual([]);
    const first = ladder.steps[0].audit;
    const last = ladder.steps[ladder.steps.length - 1].audit;
    expect(last.elementaryInstruction).toBeLessThan(first.elementaryInstruction);
    expect(last.advancedAndApplied).toBeGreaterThan(first.advancedAndApplied);
  });

  it('good learners fall between: compact coverage, practice- and direction-rich journeys', () => {
    for (const key of ['GOOD_AT_70', 'GOOD_AT_78']) {
      const a = audit(profile(key));
      expect({ key, missing: a.missing, compact: a.fundamentalDays <= 20, elementary: a.elementaryInstruction <= 2 })
        .toEqual({ key, missing: [], compact: true, elementary: true });
    }
  });
});

describe('VERIFIED compresses a fundamental; it never makes it disappear', () => {
  it('a learner who answered a few checkpoints right on conditions, loops and functions still meets all three', () => {
    const skills = ['CONDITIONALS_BASICS', 'LOOPS_BASICS', 'FUNCTIONS_BASICS'];
    const student = evidenceLearner(skills, () => [1, 1, 1]);
    for (const k of skills) expect(student.skills.get(k)!.score).toBe(100);
    const a = audit(student);
    for (const t of ['T_CONDITIONS', 'T_LOOPS', 'T_FUNCTIONS']) {
      const r = a.requirements.find(x => x.requirement === t)!;
      expect({ t, covered: r.covered }).toEqual({ t, covered: true });
    }
    expect(a.missing).toEqual([]);
  });
});

describe('a fundamental no authored unit can serve is reported, never silently dropped', () => {
  it('reports NO_SUITABLE_TREATMENT, and the continuity check fails it', () => {
    // A synthetic backbone topic with lessons and practice only: nothing a VERIFIED learner can be given.
    const gap: ComposableUnit[] = [0, 1, 2].map(i => ({
      unitCode: `T_GAPTOPIC_${i}`, title: `Gap ${i}`, moduleCode: 'M99_GAP', topicCode: 'T_GAPTOPIC', displayOrder: i,
      skillKeys: ['GAP_SKILL'], prerequisiteSkillKeys: [], prerequisiteUnitCodes: i ? [`T_GAPTOPIC_${i - 1}`] : [],
      category: 'UNIVERSAL', applicableDirections: [], unitType: i === 2 ? 'PRACTICE' : 'CONCEPT', defaultDepth: 'FOUNDATION',
      mandatory: true, backbone: true, estimatedMinutes: 30,
    } as ComposableUnit));
    const student: StudentProfile = { skills: new Map([['GAP_SKILL', { score: 95, confidence: 'HIGH' }]]), primaryDirection: null, directionStatus: 'UNDECIDED' };
    const r = composeUnits({ candidates: [...PRODUCTION, ...gap], targetUnits: 90, student });
    const row = (r.structure || []).find(s => s.topicCode === 'T_GAPTOPIC')!;
    expect(row.coverage).toBe('NO_SUITABLE_TREATMENT');
    expect(recompositionContinuityIssues(r, r.units.map(u => u.unitCode), 0).map(i => i.code)).toContain('BACKBONE_UNTREATABLE');
  });
});

describe('the backbone through reassessment', () => {
  const cells: [string, 'NONE' | 'VERIFIED' | 'STRUGGLE' | 'MIXED', number][] = [
    ['REAL_SKILL_CHECK_BEGINNER', 'VERIFIED', 14], ['REAL_SKILL_CHECK_BEGINNER', 'STRUGGLE', 45], ['REAL_SKILL_CHECK_PARTIAL', 'MIXED', 30],
    ['GOOD_AT_70', 'STRUGGLE', 14], ['GOOD_AT_78', 'VERIFIED', 60], ['VERY_STRONG', 'STRUGGLE', 30], ['VERY_STRONG', 'NONE', 75],
  ];
  for (const [key, kind, freezeDay] of cells) {
    it(`${key} reassessed ${kind} at day ${freezeDay}: frozen days kept, every fundamental still covered, in order, ninety days`, () => {
      const r = simulateBackboneRecomposition({ pool: PRODUCTION, universe: PRODUCTION, base: profile(key), kind, freezeDay });
      expect({ key, kind, freezeDay, issues: r.issues }).toEqual({ key, kind, freezeDay, issues: [] });
      expect(r.stitched).toHaveLength(90);
      expect(r.backbone.missing).toEqual([]);
      const original = compose(profile(key)).units.map(u => u.unitCode).slice(0, freezeDay);
      expect(r.stitched.slice(0, freezeDay)).toEqual(original);
    });
  }

  it('stronger evidence does not add elementary lessons to the future', () => {
    for (const [key, freezeDay] of [['REAL_SKILL_CHECK_BEGINNER', 30], ['GOOD_AT_70', 14]] as [string, number][]) {
      const none = simulateBackboneRecomposition({ pool: PRODUCTION, universe: PRODUCTION, base: profile(key), kind: 'NONE', freezeDay });
      const verified = simulateBackboneRecomposition({ pool: PRODUCTION, universe: PRODUCTION, base: profile(key), kind: 'VERIFIED', freezeDay });
      expect({ key, compresses: verified.futureElementary <= none.futureElementary }).toEqual({ key, compresses: true });
    }
  });
});
