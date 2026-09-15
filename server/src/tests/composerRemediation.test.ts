/**
 * Phase 21 remediation — two composer defects the certification found, held closed.
 *
 * Both were invisible to every count. A plan with the right number of practical units can still
 * make a strong learner read for a fortnight first; a plan that refuses to re-teach a demonstrated
 * skill can still strand everything behind that skill. Each test below describes the mechanism,
 * not a threshold, so it cannot be passed by tuning a number.
 */

import { composeUnits, ComposableUnit, StudentProfile, SkillBelief } from '../services/curriculumComposerService';

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

const scored = (entries: [string, number, ('HIGH' | 'LOW')?][]): Map<string, SkillBelief> =>
  new Map(entries.map(([k, score, confidence]) => [k, { score, confidence: confidence || 'HIGH' }]));

/* ══════════════════════════════════════════════════════════════════════════════════════════ *
 * A — schedulable application must not wait behind repeated prerequisite pulls
 * ══════════════════════════════════════════════════════════════════════════════════════════ */

describe('practical work is not starved by prerequisite pulling', () => {
  /**
   * The shape of the real defect, reduced.
   *
   * Four skills the learner has verified, each with a debugging exercise and a project that are
   * schedulable immediately — their prerequisites are satisfied by mastery. One new direction topic
   * whose practice unit sits behind a long chain of instruction. PRACTICE is earlier than APPLICATION
   * and INTEGRATION in allocation order, and before the fix it could pull another link of its chain
   * on every pass, so neither of the others was ever given a turn until the chain was exhausted.
   */
  const VERIFIED = ['S1', 'S2', 'S3', 'S4'];
  const CHAIN = 8;

  const pool: ComposableUnit[] = [
    ...VERIFIED.flatMap((s, i) => [
      unit({ unitCode: `${s}_CONCEPT`, topicCode: `T_${s}`, moduleCode: `M0${i + 1}`, skillKeys: [s], displayOrder: 10 }),
      unit({
        unitCode: `${s}_DEBUG`, topicCode: `T_${s}`, moduleCode: `M0${i + 1}`, skillKeys: [s], displayOrder: 20,
        unitType: 'DEBUG', prerequisiteUnitCodes: [`${s}_CONCEPT`],
      }),
      unit({
        unitCode: `${s}_PROJECT`, topicCode: `T_${s}`, moduleCode: `M0${i + 1}`, skillKeys: [s], displayOrder: 30,
        unitType: 'PROJECT', prerequisiteUnitCodes: [`${s}_DEBUG`],
      }),
    ]),
    ...Array.from({ length: CHAIN }, (_, i) => unit({
      unitCode: `DIR_${i + 1}`, topicCode: 'T_DIR', moduleCode: 'M09', skillKeys: ['DIR'],
      displayOrder: (i + 1) * 10, category: 'DIRECTION', applicableDirections: ['WEB_DEVELOPMENT'], mandatory: false,
      ...(i ? { prerequisiteUnitCodes: [`DIR_${i}`] } : {}),
    })),
    unit({
      unitCode: 'DIR_PRACTICE', topicCode: 'T_DIR', moduleCode: 'M09', skillKeys: ['DIR'], displayOrder: 999,
      unitType: 'PRACTICE', category: 'DIRECTION', applicableDirections: ['WEB_DEVELOPMENT'], mandatory: false,
      prerequisiteUnitCodes: [`DIR_${CHAIN}`],
    }),
  ];

  const strong: StudentProfile = {
    skills: scored(VERIFIED.map(s => [s, 92] as [string, number])),
    primaryDirection: null,
    directionStatus: 'UNDECIDED',
  };

  const plan = () => composeUnits({ candidates: pool, targetUnits: 20, student: strong });
  const indexOf = (r: ReturnType<typeof plan>, pred: (t: string) => boolean) => r.units.findIndex(u => pred(u.unitType));

  it('is an established learner, so the floors the defect starved are really requested', () => {
    const r = plan();
    expect(r.shape).toBe('ESTABLISHED');
    expect(r.allocation.find(a => a.role === 'APPLICATION')!.min).toBeGreaterThan(0);
    expect(r.allocation.find(a => a.role === 'INTEGRATION')!.min).toBeGreaterThan(0);
  });

  it('schedules debugging before the pulled instruction chain is finished', () => {
    const r = plan();
    const firstApplication = indexOf(r, t => t === 'DEBUG');
    const lastChainLink = r.units.findIndex(u => u.unitCode === `DIR_${CHAIN}`);
    expect(firstApplication).toBeGreaterThanOrEqual(0);
    expect(lastChainLink).toBeGreaterThanOrEqual(0);
    expect(firstApplication).toBeLessThan(lastChainLink);
  });

  it('schedules a project before the pulled instruction chain is finished', () => {
    const r = plan();
    const firstProject = indexOf(r, t => t === 'PROJECT');
    const lastChainLink = r.units.findIndex(u => u.unitCode === `DIR_${CHAIN}`);
    expect(firstProject).toBeGreaterThanOrEqual(0);
    expect(firstProject).toBeLessThan(lastChainLink);
  });

  it('never lets the pulled chain run as one uninterrupted block', () => {
    const r = plan();
    let run = 0; let longest = 0;
    for (const u of r.units) {
      if (u.unitCode.startsWith('DIR_') && u.unitType === 'CONCEPT') { run++; longest = Math.max(longest, run); } else run = 0;
    }
    expect(longest).toBeLessThan(CHAIN);
  });

  it('still keeps the pulling role\'s promise: the practice unit arrives, after its whole chain', () => {
    const r = plan();
    const practiceAt = r.units.findIndex(u => u.unitCode === 'DIR_PRACTICE');
    expect(practiceAt).toBeGreaterThanOrEqual(0);
    for (let i = 1; i <= CHAIN; i++) {
      expect(r.units.findIndex(u => u.unitCode === `DIR_${i}`)).toBeLessThan(practiceAt);
    }
  });

  it('stays deterministic and prerequisite-correct', () => {
    const a = plan();
    const b = composeUnits({ candidates: [...pool].reverse(), targetUnits: 20, student: strong });
    expect(b.units.map(u => u.unitCode)).toEqual(a.units.map(u => u.unitCode));
    expect(a.prerequisites.filter(o => o.resolution === 'BLOCKED_MISSING_PREREQUISITE')).toEqual([]);
    expect(new Set(a.units.map(u => u.unitCode)).size).toBe(a.units.length);
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════ *
 * C — a learner measured at REVISION is not stranded behind instruction they have outgrown
 * ══════════════════════════════════════════════════════════════════════════════════════════ */

describe('a prerequisite the learner has measurably outgrown', () => {
  const topic = [
    unit({ unitCode: 'L_CONCEPT', topicCode: 'T_L', skillKeys: ['LOOPS'], displayOrder: 10 }),
    unit({ unitCode: 'L_DEBUG', topicCode: 'T_L', skillKeys: ['LOOPS'], displayOrder: 20, unitType: 'DEBUG', prerequisiteUnitCodes: ['L_CONCEPT'] }),
    unit({ unitCode: 'L_PRACTICE', topicCode: 'T_L', skillKeys: ['LOOPS'], displayOrder: 30, unitType: 'PRACTICE', prerequisiteUnitCodes: ['L_DEBUG'] }),
    unit({ unitCode: 'L_PROJECT', topicCode: 'T_L', skillKeys: ['LOOPS'], displayOrder: 40, unitType: 'PROJECT', prerequisiteUnitCodes: ['L_PRACTICE'] }),
  ];
  const learner = (score: number, confidence: 'HIGH' | 'LOW' = 'HIGH'): StudentProfile => ({
    skills: scored([['LOOPS', score, confidence]]), primaryDirection: null, directionStatus: 'UNDECIDED',
  });
  const plan = (s: StudentProfile) => composeUnits({ candidates: topic, targetUnits: 4, student: s });
  const outcome = (r: ReturnType<typeof plan>, dependent: string) =>
    r.prerequisites.find(o => o.unitCode === dependent)?.resolution;
  const codes = (r: ReturnType<typeof plan>) => r.units.map(u => u.unitCode);

  it('unblocks the work behind a concept for a REVISION learner, reported as evidence', () => {
    const r = plan(learner(80));
    expect(codes(r)).not.toContain('L_CONCEPT');
    expect(codes(r)).toEqual(expect.arrayContaining(['L_DEBUG', 'L_PRACTICE', 'L_PROJECT']));
    expect(outcome(r, 'L_DEBUG')).toBe('SATISFIED_BY_EVIDENCE');
    expect(r.blocked).toEqual([]);
  });

  it('never calls it mastery — REVISION is demonstrated, not verified', () => {
    const r = plan(learner(84));
    expect(r.prerequisites.some(o => o.resolution === 'SATISFIED_BY_MASTERY')).toBe(false);
    expect(r.units.some(u => u.reason === 'MASTERY_VERIFIED')).toBe(false);
  });

  it('still schedules practice for a REVISION learner rather than excusing it', () => {
    // PRACTICE serves REVISION, so it is not outgrown: the project must wait for it in the plan.
    const r = plan(learner(80));
    expect(codes(r).indexOf('L_PRACTICE')).toBeLessThan(codes(r).indexOf('L_PROJECT'));
    expect(outcome(r, 'L_PROJECT')).toBe('SATISFIED_BY_PLAN');
  });

  it('keeps teaching a STANDARD learner — STANDARD is not beyond instruction', () => {
    const r = plan(learner(74));
    expect(codes(r)).toContain('L_CONCEPT');
    expect(r.prerequisites.some(o => o.resolution === 'SATISFIED_BY_EVIDENCE')).toBe(false);
  });

  it('treats a high score on thin evidence as STANDARD, not as evidence of anything more', () => {
    const r = plan(learner(92, 'LOW'));
    expect(codes(r)).toContain('L_CONCEPT');
    expect(r.prerequisites.some(o => o.resolution !== 'SATISFIED_BY_PLAN')).toBe(false);
  });

  it('refuses when any skill of the prerequisite unit is unmeasured', () => {
    const twoSkill = [
      unit({ unitCode: 'X_CONCEPT', topicCode: 'T_X', skillKeys: ['LOOPS', 'NEVER_MEASURED'], displayOrder: 10 }),
      unit({ unitCode: 'X_DEBUG', topicCode: 'T_X', skillKeys: ['LOOPS'], displayOrder: 20, unitType: 'DEBUG', prerequisiteUnitCodes: ['X_CONCEPT'] }),
    ];
    const r = composeUnits({ candidates: twoSkill, targetUnits: 2, student: learner(80) });
    expect(r.prerequisites.some(o => o.resolution === 'SATISFIED_BY_EVIDENCE')).toBe(false);
  });

  it('never writes anything into the learner\'s skills', () => {
    const s = learner(80);
    const before = JSON.stringify([...s.skills]);
    plan(s);
    expect(JSON.stringify([...s.skills])).toBe(before);
  });
});
