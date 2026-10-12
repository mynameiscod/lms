import {
  standingOn, bridgeUnitsForTopic, yearTiers, fitToDays, fitBridgeThenYear, packTight, isYearRefresher, PlanItem, V2Tier,
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
  it('a learner who holds it still gets the class, then proves it — no practice', () => {
    expect(bridgeUnitsForTopic(topic, 'HELD').map(x => [x.unit.unitCode, x.tier])).toEqual([['C1', 'ESSENTIAL'], ['K1', 'ESSENTIAL']]);
  });
  it('a weak learner is taught it: lesson, practice, checkpoint — practice may be given up first', () => {
    expect(bridgeUnitsForTopic(topic, 'WEAK').map(x => [x.unit.unitCode, x.tier])).toEqual([
      ['C1', 'ESSENTIAL'], ['P1', 'BRIDGE_EXTRA'], ['K1', 'ESSENTIAL'],
    ]);
  });
  it('an unmeasured learner is taught it in full, like a weak one — every fresh joiner gets the foundation', () => {
    expect(bridgeUnitsForTopic(topic, 'UNKNOWN').map(x => x.unit.unitCode)).toEqual(['C1', 'P1', 'K1']);
  });
  it('where a topic has no checkpoint, a strong learner’s practice proof is droppable — as a weak learner’s is', () => {
    const noCheck = [u('C1', 'CONCEPT', 'T', 60, 1), u('P1', 'PRACTICE', 'T', 60, 2)];
    expect(bridgeUnitsForTopic(noCheck, 'HELD').map(x => [x.unit.unitCode, x.tier])).toEqual([['C1', 'ESSENTIAL'], ['P1', 'BRIDGE_EXTRA']]);
    expect(bridgeUnitsForTopic(noCheck, 'WEAK').map(x => [x.unit.unitCode, x.tier])).toEqual([['C1', 'ESSENTIAL'], ['P1', 'BRIDGE_EXTRA']]);
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

  it('gives up bridge practice on the strongest topic first, so a weak topic keeps its practice', () => {
    const strong: PlanItem = { ...item('pStrong', 'BRIDGE_EXTRA', 'BRIDGE'), strength: 85 };
    const weak: PlanItem = { ...item('pWeak', 'BRIDGE_EXTRA', 'BRIDGE'), strength: 25 };
    const unmeasured: PlanItem = { ...item('pNew', 'BRIDGE_EXTRA', 'BRIDGE'), strength: null };
    // Strong first in the course, weak and unmeasured later: the end of the plan is NOT what goes.
    const items = [item('c1', 'ESSENTIAL', 'BRIDGE'), strong, item('c2', 'ESSENTIAL', 'BRIDGE'), weak, unmeasured];
    const r = fitToDays(items, { days: 2, dailyMinutes: 150, maxUnitsPerDay: 3 });
    expect(r.kept.map(i => i.unit.unitCode)).toEqual(['c1', 'c2', 'pWeak', 'pNew']);
    const tighter = fitToDays(items, { days: 1, dailyMinutes: 150, maxUnitsPerDay: 3 });
    expect(tighter.kept.map(i => i.unit.unitCode)).toEqual(['c1', 'c2']);
    expect(tighter.dropped.BRIDGE_EXTRA).toBe(3);
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

describe('the year’s own refresher', () => {
  it('Year 2 and Year 4 bridge modules are refreshers; Year 3 readiness is not', () => {
    expect(isYearRefresher('B01_BRIDGE')).toBe(true);
    expect(isYearRefresher('P02_BRIDGE')).toBe(true);
    expect(isYearRefresher('S01_READINESS')).toBe(false);
    expect(isYearRefresher('P03_ENGINEERING_BUILD')).toBe(false);
  });
});

describe('the bridge is packed tight; the year gets the days it leaves', () => {
  const item = (code: string, tier: V2Tier, phase: 'BRIDGE' | 'YEAR', mins: number, type: string): PlanItem =>
    ({ unit: u(code, type, code, mins), phase, tier });
  // A strong learner: six half-hour proofs in the bridge, then ten hour-long year units.
  const proofs = Array.from({ length: 6 }, (_, i) => item(`k${i}`, 'ESSENTIAL', 'BRIDGE', 30, 'CHECKPOINT'));
  const year = Array.from({ length: 10 }, (_, i) => item(`y${i}`, 'MUST_EXTRA', 'YEAR', 60, 'CONCEPT'));
  const opts = { days: 10, dailyMinutes: 150, maxUnitsPerDay: 3 };

  it('a strong learner’s proofs take two full days, not one thin day each', () => {
    const r = fitBridgeThenYear([...proofs, ...year], opts);
    expect(r.ok).toBe(true);
    expect(r.days).toHaveLength(10);
    expect(r.days.filter(d => d.some(i => i.phase === 'BRIDGE'))).toHaveLength(2);
    expect(r.kept).toHaveLength(16);
  });

  it('the year starts on a clean day and no day passes the daily study time', () => {
    const r = fitBridgeThenYear([...proofs, ...year], opts);
    for (const d of r.days) {
      expect(new Set(d.map(i => i.phase)).size).toBe(1);
      expect(d.reduce((m, i) => m + i.unit.estimatedMinutes, 0)).toBeLessThanOrEqual(150);
    }
  });

  it('keeps the joint fit when the year cannot fill the days a tight bridge frees', () => {
    const r = fitBridgeThenYear([...proofs, ...year.slice(0, 5)], opts);
    expect(r.ok).toBe(true);
    expect(r.days).toHaveLength(10);
    expect(r.kept).toHaveLength(11);
  });

  it('a bridge day holds three units while the year keeps its own limit of two', () => {
    const bridge = Array.from({ length: 6 }, (_, i) => item(`b${i}`, 'ESSENTIAL', 'BRIDGE', 40, 'CONCEPT'));
    const yr = Array.from({ length: 8 }, (_, i) => item(`y${i}`, 'MUST_EXTRA', 'YEAR', 60, 'CONCEPT'));
    const r = fitBridgeThenYear([...bridge, ...yr], { days: 6, dailyMinutes: 150, maxUnitsPerDay: 2 });
    const bridgeDays = r.days.filter(d => d.some(i => i.phase === 'BRIDGE'));
    expect(bridgeDays).toHaveLength(2);
    expect(Math.max(...bridgeDays.map(d => d.length))).toBe(3);
    expect(Math.max(...r.days.filter(d => d[0].phase === 'YEAR').map(d => d.length))).toBeLessThanOrEqual(2);
  });

  it('a bridge practice goes before a MUST extra of the year — the strong topic’s first', () => {
    const bridge = [
      item('c1', 'ESSENTIAL', 'BRIDGE', 40, 'CONCEPT'), { ...item('p1', 'BRIDGE_EXTRA', 'BRIDGE', 40, 'PRACTICE'), strength: 30 },
      item('c2', 'ESSENTIAL', 'BRIDGE', 40, 'CONCEPT'), { ...item('p2', 'BRIDGE_EXTRA', 'BRIDGE', 40, 'PRACTICE'), strength: 80 },
    ];
    const yr = ['m1', 'm2', 'm3'].map((c, i) => item(c, i ? 'MUST_EXTRA' : 'ESSENTIAL', 'YEAR', 60, 'CONCEPT'));
    // 4 days: the bridge's 160 min take 2 days, the year's 2 days hold all three — nothing given up.
    const roomy = fitBridgeThenYear([...bridge, ...yr], { days: 4, dailyMinutes: 150, maxUnitsPerDay: 2 });
    expect(roomy.kept.map(i => i.unit.unitCode)).toEqual(['c1', 'p1', 'c2', 'p2', 'm1', 'm2', 'm3']);
    // 3 days: keeping both practices would cost the year a MUST extra, so one practice goes — the
    // strong topic's; the bridge then fits one day of three units and the year keeps everything.
    const tight = fitBridgeThenYear([...bridge, ...yr], { days: 3, dailyMinutes: 150, maxUnitsPerDay: 2 });
    expect(tight.kept.map(i => i.unit.unitCode)).toEqual(['c1', 'p1', 'c2', 'm1', 'm2', 'm3']);
    expect(tight.dropped).toMatchObject({ BRIDGE_EXTRA: 1, MUST_EXTRA: 0 });
  });

  it('the year gives up SHOULD before any bridge practice goes', () => {
    const bridge = [item('c1', 'ESSENTIAL', 'BRIDGE', 40, 'CONCEPT'), { ...item('p1', 'BRIDGE_EXTRA', 'BRIDGE', 40, 'PRACTICE'), strength: 80 }];
    const yr = [item('m1', 'ESSENTIAL', 'YEAR', 60, 'CONCEPT'), item('m2', 'MUST_EXTRA', 'YEAR', 60, 'CONCEPT'), item('s1', 'SHOULD', 'YEAR', 60, 'CONCEPT')];
    const r = fitBridgeThenYear([...bridge, ...yr], { days: 2, dailyMinutes: 150, maxUnitsPerDay: 2 });
    expect(r.kept.map(i => i.unit.unitCode)).toEqual(['c1', 'p1', 'm1', 'm2']);
    expect(r.dropped).toMatchObject({ SHOULD: 1, BRIDGE_EXTRA: 0, MUST_EXTRA: 0 });
  });

  it('packTight finds the fewest days, or says the items need more than allowed', () => {
    expect(packTight(proofs, opts, 10)).toHaveLength(2);
    expect(packTight(proofs, opts, 1)).toBeNull();
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
