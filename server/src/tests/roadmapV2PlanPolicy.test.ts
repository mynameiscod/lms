import {
  standingOn, bridgeUnitsForTopic, yearTiers, fitToDays, PlanItem, V2Tier,
} from '../data/roadmapV2PlanPolicy';

const u = (code: string, unitType: string, topicCode = 'T', estimatedMinutes = 60, displayOrder = 0) =>
  ({ unitCode: code, unitType, topicCode, estimatedMinutes, displayOrder });

describe('how a learner stands on a topic', () => {
  const skills = new Map<string, any>([
    ['LOOPS', { score: 80, confidence: 'MEDIUM' }],
    ['ARRAYS', { score: 30, confidence: 'MEDIUM' }],
    ['GUESS', { score: 90, confidence: 'LOW' }],
  ]);
  it('holds a topic only when every measured skill is ready, with some confidence', () => {
    expect(standingOn(skills, ['LOOPS'])).toBe('HELD');
    expect(standingOn(skills, ['GUESS'])).toBe('UNKNOWN');
  });
  it('is weak on a topic when any measured skill is below ready', () => {
    expect(standingOn(skills, ['LOOPS', 'ARRAYS'])).toBe('WEAK');
  });
  it('is unknown on skills never measured', () => {
    expect(standingOn(skills, ['SQL'])).toBe('UNKNOWN');
  });
});

describe('the bridge gives each topic what this learner needs', () => {
  const topic = [u('C1', 'CONCEPT', 'T', 60, 1), u('P1', 'PRACTICE', 'T', 60, 2), u('K1', 'CHECKPOINT', 'T', 30, 3), u('C2', 'CONCEPT', 'T', 60, 4)];
  it('a learner who holds it proves it — no lesson again', () => {
    expect(bridgeUnitsForTopic(topic, 'HELD').map(x => x.unit.unitCode)).toEqual(['K1']);
  });
  it('a weak learner is taught it: lesson, practice, checkpoint — practice may be given up first', () => {
    expect(bridgeUnitsForTopic(topic, 'WEAK').map(x => [x.unit.unitCode, x.tier])).toEqual([
      ['C1', 'ESSENTIAL'], ['P1', 'BRIDGE_EXTRA'], ['K1', 'ESSENTIAL'],
    ]);
  });
  it('an unmeasured learner gets the lesson and the checkpoint', () => {
    expect(bridgeUnitsForTopic(topic, 'UNKNOWN').map(x => x.unit.unitCode)).toEqual(['C1', 'K1']);
  });
  it('never leaves a bridge topic empty', () => {
    expect(bridgeUnitsForTopic([u('D1', 'DEBUG')], 'UNKNOWN').map(x => x.unit.unitCode)).toEqual(['D1']);
  });
});

describe('tiers in the learner’s own year', () => {
  const prio = (t: string) => (t === 'M' ? 'MUST' : t === 'S' ? 'SHOULD' : 'OPTIONAL') as any;
  it('a MUST topic’s first lesson and checkpoints are essential; the rest is extra', () => {
    const units = [u('a', 'CONCEPT', 'M'), u('b', 'CONCEPT', 'M'), u('c', 'PRACTICE', 'M'), u('d', 'CHECKPOINT', 'M'), u('e', 'CONCEPT', 'S'), u('f', 'CONCEPT', 'O')];
    expect(yearTiers(units, prio)).toEqual(['ESSENTIAL', 'MUST_EXTRA', 'MUST_EXTRA', 'ESSENTIAL', 'SHOULD', 'OPTIONAL']);
  });
  it('a MUST topic a strong learner was given only practice for is still never empty', () => {
    expect(yearTiers([u('p', 'PRACTICE', 'M'), u('q', 'PRACTICE', 'M')], prio)).toEqual(['ESSENTIAL', 'MUST_EXTRA']);
  });
});

describe('fitting the plan into the admin’s days', () => {
  const item = (code: string, tier: V2Tier, phase: 'BRIDGE' | 'YEAR' = 'YEAR', mins = 60, type = 'CONCEPT'): PlanItem =>
    ({ unit: u(code, type, code, mins), phase, tier });

  it('keeps everything when it already fits', () => {
    const r = fitToDays([item('a', 'ESSENTIAL'), item('b', 'SHOULD')], { days: 1, dailyMinutes: 150, maxUnitsPerDay: 3 });
    expect(r.ok && r.kept.length === 2 && r.overflowDays === 0).toBe(true);
  });

  it('gives up OPTIONAL, then SHOULD, then bridge extras, then MUST extras — never an essential', () => {
    const items = [
      item('e1', 'ESSENTIAL', 'BRIDGE'), item('bx', 'BRIDGE_EXTRA', 'BRIDGE'),
      item('e2', 'ESSENTIAL'), item('mx', 'MUST_EXTRA'), item('s1', 'SHOULD'), item('o1', 'OPTIONAL'),
    ];
    // 2 days × 150 min holds 4 one-hour units (2 per day): two must go — OPTIONAL then SHOULD.
    const r = fitToDays(items, { days: 2, dailyMinutes: 150, maxUnitsPerDay: 3 });
    expect(r.kept.map(i => i.unit.unitCode)).toEqual(['e1', 'bx', 'e2', 'mx']);
    expect(r.dropped).toMatchObject({ OPTIONAL: 1, SHOULD: 1, BRIDGE_EXTRA: 0, MUST_EXTRA: 0 });
    // 1 day holds 2: the extras go next, the essentials stay.
    const tight = fitToDays(items, { days: 1, dailyMinutes: 150, maxUnitsPerDay: 3 });
    expect(tight.kept.map(i => i.unit.unitCode)).toEqual(['e1', 'e2']);
  });

  it('never plans a day past the daily study time', () => {
    const items = Array.from({ length: 9 }, (_, i) => item(`x${i}`, 'SHOULD', 'YEAR', 50));
    const r = fitToDays(items, { days: 3, dailyMinutes: 150, maxUnitsPerDay: 4 });
    for (const d of r.days) expect(d.reduce((m, i) => m + i.unit.estimatedMinutes, 0)).toBeLessThanOrEqual(150);
  });

  it('when even the essentials do not fit, builds over extra days and reports it rather than dropping one', () => {
    const items = [item('e1', 'ESSENTIAL'), item('e2', 'ESSENTIAL'), item('e3', 'ESSENTIAL')];
    const r = fitToDays(items, { days: 1, dailyMinutes: 100, maxUnitsPerDay: 3 });
    expect(r.kept).toHaveLength(3);
    expect(r.overflowDays).toBeGreaterThan(0);
  });

  it('says so when there is too little content to fill the days', () => {
    expect(fitToDays([item('a', 'ESSENTIAL')], { days: 3, dailyMinutes: 150, maxUnitsPerDay: 3 }).reason).toBe('TOO_FEW_UNITS');
  });
});

describe('revision for an existing member', () => {
  const { revisionPick } = require('../data/roadmapV2PlanPolicy');
  const topicOf = (code: string, score: number | null) => ({
    topicCode: code, score,
    units: [u(`${code}-c`, 'CONCEPT', code, 60, 1), u(`${code}-p1`, 'PRACTICE', code, 60, 2), u(`${code}-p2`, 'PRACTICE', code, 60, 3), u(`${code}-k`, 'CHECKPOINT', code, 30, 4)],
  });
  it('practises — never re-teaches the lesson', () => {
    const picked = revisionPick([topicOf('A', 60)], 1000).map((x: any) => x.unitType);
    expect(picked).not.toContain('CONCEPT');
  });
  it('starts with the weakest topic and goes round one unit per topic, within the budget', () => {
    const picked = revisionPick([topicOf('STRONG', 90), topicOf('WEAK', 55), topicOf('UNSEEN', null)], 200);
    expect(picked.map((x: any) => x.unitCode)).toEqual(['UNSEEN-p1', 'WEAK-p1', 'STRONG-p1']);
    expect(picked.reduce((m: number, x: any) => m + x.estimatedMinutes, 0)).toBeLessThanOrEqual(200);
  });
  it('prefers practice they have not done yet', () => {
    const picked = revisionPick([topicOf('A', 60)], 60, new Set(['A-p1']));
    expect(picked.map((x: any) => x.unitCode)).toEqual(['A-p2']);
  });
});
