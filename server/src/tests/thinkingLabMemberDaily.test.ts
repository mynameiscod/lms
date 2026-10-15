/**
 * Which Thinking Lab problem a CareerPilot member is given today.
 *
 * Members have no batch, so nothing schedules their day: the rule below is the whole schedule.
 * It must follow the curriculum order, never skip a problem because a day was missed, and cycle
 * once everything has been given — and the 30 seeded problems must be well formed.
 */

import { pickMemberProblem, curriculumOrder, positionInBank } from '../services/thinkingLabMemberDaily';
import { PROBLEMS, validateProblems } from '../scripts/seedCareerPilotThinkingLab';

const bank = [
  { id: 'c', order: 3 },
  { id: 'a', order: 1 },
  { id: 'unnumbered-new', createdAt: '2026-10-02' },
  { id: 'b', order: 2 },
  { id: 'unnumbered-old', createdAt: '2026-01-01' },
];

describe('member daily Thinking Lab problem', () => {
  it('orders by `order`, then unnumbered problems oldest first', () => {
    expect(curriculumOrder(bank).map(p => p.id)).toEqual(['a', 'b', 'c', 'unnumbered-old', 'unnumbered-new']);
  });

  it('gives a new member the first problem in the sequence', () => {
    expect(pickMemberProblem(bank, [])).toBe('a');
  });

  it('gives the next problem not yet given, whatever order they were given in', () => {
    expect(pickMemberProblem(bank, ['a'])).toBe('b');
    expect(pickMemberProblem(bank, ['a', 'b'])).toBe('c');
    // An admin later inserts/renumbers: an earlier never-given problem is served next.
    expect(pickMemberProblem(bank, ['b', 'c'])).toBe('a');
  });

  it('does not skip a problem because days were missed — only what was given counts', () => {
    expect(pickMemberProblem(bank, ['a', 'b', 'c'])).toBe('unnumbered-old');
  });

  it('cycles back to the start once every problem has been given', () => {
    const all = ['a', 'b', 'c', 'unnumbered-old', 'unnumbered-new'];
    expect(pickMemberProblem(bank, all)).toBe('a');
    expect(pickMemberProblem(bank, [...all, 'a'])).toBe('b');
  });

  it('ignores problems that have left the bank', () => {
    expect(pickMemberProblem(bank, ['retired', 'retired'])).toBe('a');
  });

  it('returns null for an empty bank', () => {
    expect(pickMemberProblem([], ['a'])).toBeNull();
  });

  it('reports a 1-based position for "Problem n of N"', () => {
    expect(positionInBank(bank, 'c')).toBe(3);
    expect(positionInBank(bank, 'missing')).toBe(0);
  });
});

describe('the 30 seeded CareerPilot problems', () => {
  it('are exactly 30, ordered 1..30, and structurally valid', () => {
    expect(PROBLEMS).toHaveLength(30);
    expect(PROBLEMS.map(p => p.order)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
    expect(validateProblems(PROBLEMS)).toEqual([]);
  });

  it('climb from easy to hard', () => {
    const rank = { easy: 0, medium: 1, hard: 2 } as const;
    const ranks = PROBLEMS.map(p => rank[p.difficulty]);
    expect(ranks).toEqual([...ranks].sort((x, y) => x - y));
    expect(PROBLEMS[0].difficulty).toBe('easy');
    expect(PROBLEMS[29].difficulty).toBe('hard');
  });

  it('never put the answer in a hint', () => {
    for (const p of PROBLEMS) for (const h of p.hints) expect(h).not.toContain('def main');
  });
});
