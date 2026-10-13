import { gateDecision, GateCheck, MAX_GATE_ATTEMPTS } from '../data/roadmapV2GatePolicy';

/**
 * The year's first day opens on PASSED foundations — not merely attempted ones — and nobody is
 * trapped: a check failed three times stops holding the gate and is flagged for a mentor.
 */
const check = (quizId: string, dayNumber: number, attempts: number, passed: boolean): GateCheck =>
  ({ quizId, title: quizId, dayNumber, attempts, passed });

it('is open when every bridge check is passed', () => {
  expect(gateDecision([check('a', 1, 1, true), check('b', 2, 2, true)])).toMatchObject({ open: true, passed: 2, total: 2 });
});

it('stays closed while a check has only been attempted, not passed', () => {
  const g = gateDecision([check('a', 1, 1, true), check('b', 2, 1, false)]);
  expect(g.open).toBe(false);
  expect(g.pending.map(c => c.quizId)).toEqual(['b']);
});

it('stays closed for a check never tried', () => {
  expect(gateDecision([check('a', 1, 0, false)]).open).toBe(false);
});

it(`a check failed ${MAX_GATE_ATTEMPTS} times no longer holds the year — it is flagged for a mentor`, () => {
  const g = gateDecision([check('a', 1, 1, true), check('hard', 3, MAX_GATE_ATTEMPTS, false)]);
  expect(g.open).toBe(true);
  expect(g.flagged.map(c => c.quizId)).toEqual(['hard']);
});

it('lists what is left in day order, so the learner goes back to the earliest first', () => {
  const g = gateDecision([check('late', 8, 0, false), check('early', 2, 1, false)]);
  expect(g.pending.map(c => c.dayNumber)).toEqual([2, 8]);
});

it('is open when the bridge has no checks at all', () => {
  expect(gateDecision([]).open).toBe(true);
});
