/**
 * A bridge must arrive at the skill it was built for.
 *
 * ── THE DEFECT THIS GUARDS ────────────────────────────────────────────────────────────────
 *
 * The bridge scopes its candidates to the closure — the topics that teach a gapped skill, plus
 * everything earlier in their authored sequence — and the composer then fills the bridge's days
 * from that pool in sequence order. The closure is routinely several times larger than the
 * bridge, so the days ran out partway up the ladder.
 *
 * Measured against the real Year-1 inventory, a learner measured low on arrays alone had a
 * 114-unit ladder and a 15-unit bridge. The fifteen went to hardware, decomposition and
 * variables. DSA_ARRAYS — the only thing they had been measured as lacking, and the entire
 * reason a bridge was composed — was never reached. Zero of one gap taught, and a sixth of the
 * programme spent on material nobody had evidence they needed.
 *
 * The rule now keeps the gap-teaching topics whatever else is dropped, and adds the run-up
 * backwards from the gap while the days allow. Same learner, same fifteen units: arrays taught.
 *
 * ── WHY SYNTHETIC UNITS ───────────────────────────────────────────────────────────────────
 *
 * The selection rule is arithmetic over topic sizes and sequence positions, so it is tested on
 * a ladder whose shape is visible in the test rather than on the live inventory, which changes
 * as content is authored. T_VARIABLES, T_CONDITIONS, T_LOOPS, T_FUNCTIONS and T_ARRAYS are real
 * Year-1 topic codes in the real PROGRAMMING sequence, so the ordering under test is the
 * ordering that ships.
 */

import { bridgeTopicsWithinBudget } from '../services/foundationJourneyService';

/** Real topic codes, in the real PROGRAMMING spine order, with a size each. */
const LADDER: readonly { topic: string; skill: string; units: number }[] = [
  { topic: 'T_VARIABLES', skill: 'PYTHON_BASICS', units: 24 },
  { topic: 'T_CONDITIONS', skill: 'CONDITIONALS_BASICS', units: 16 },
  { topic: 'T_LOOPS', skill: 'LOOPS_BASICS', units: 20 },
  { topic: 'T_FUNCTIONS', skill: 'FUNCTIONS_BASICS', units: 30 },
  { topic: 'T_ARRAYS', skill: 'DSA_ARRAYS', units: 24 },
];

const inventory = LADDER.flatMap(rung =>
  Array.from({ length: rung.units }, (_, n) => ({
    unitCode: `${rung.topic}_U${n + 1}`,
    topicCode: rung.topic,
    skillKeys: [rung.skill],
  })),
) as any;

const topicsFor = (gaps: string[], maxUnits: number) =>
  bridgeTopicsWithinBudget(inventory, new Set(gaps), maxUnits);

describe('a bridge arrives at the gap it was built for', () => {
  it('teaches arrays to a learner gapped on arrays, even on a budget far short of the ladder', () => {
    const { topics } = topicsFor(['DSA_ARRAYS'], 15);
    expect(topics.has('T_ARRAYS')).toBe(true);
  });

  it('spends a short budget on the gap rather than on the foot of the ladder', () => {
    const { topics } = topicsFor(['DSA_ARRAYS'], 15);
    expect([...topics].sort()).toEqual(['T_ARRAYS']);
  });

  it('keeps every gap-teaching topic when a learner has several gaps', () => {
    const { topics } = topicsFor(['LOOPS_BASICS', 'FUNCTIONS_BASICS', 'DSA_ARRAYS'], 45);
    for (const t of ['T_LOOPS', 'T_FUNCTIONS', 'T_ARRAYS']) expect(topics.has(t)).toBe(true);
  });

  it('says so when even the gap topics will not fit, rather than truncating in silence', () => {
    const { laddersShort } = topicsFor(['LOOPS_BASICS', 'FUNCTIONS_BASICS', 'DSA_ARRAYS'], 20);
    expect(laddersShort).toBe(true);
  });

  it('is content when the ladder fits', () => {
    expect(topicsFor(['DSA_ARRAYS'], 200).laddersShort).toBe(false);
  });
});

describe('the run-up is added backwards from the gap', () => {
  it('buys the groundwork nearest the gap first', () => {
    /* 24 for arrays leaves 30 — exactly T_FUNCTIONS, the rung immediately below. */
    const { topics } = topicsFor(['DSA_ARRAYS'], 54);
    expect([...topics].sort()).toEqual(['T_ARRAYS', 'T_FUNCTIONS']);
  });

  it('never skips a rung to fit an older one, which would leave a hole in the ladder', () => {
    /*
     * 24 for arrays leaves 29 — one short of T_FUNCTIONS (30). T_CONDITIONS (16) WOULD fit, and
     * taking it would teach conditionals then jump to arrays with no functions in between. The
     * rule stops at the first rung that will not fit.
     */
    const { topics } = topicsFor(['DSA_ARRAYS'], 53);
    expect(topics.has('T_CONDITIONS')).toBe(false);
    expect([...topics].sort()).toEqual(['T_ARRAYS']);
  });

  it('takes the whole ladder when the budget allows it', () => {
    const { topics } = topicsFor(['DSA_ARRAYS'], 500);
    expect([...topics].sort()).toEqual(
      ['T_ARRAYS', 'T_CONDITIONS', 'T_FUNCTIONS', 'T_LOOPS', 'T_VARIABLES'],
    );
  });
});
