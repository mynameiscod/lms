import { changePct, previousRange } from '../services/careerPilotJourneyService';

describe('journey: change against the previous period', () => {
  it('reads like the dashboard: up, down, flat, and nothing-to-something', () => {
    expect(changePct(9, 4)).toBe(125);
    expect(changePct(3, 2)).toBe(50);
    expect(changePct(0, 2)).toBe(-100);
    expect(changePct(3, 3)).toBe(0);
    expect(changePct(2, 0)).toBe(100);
    expect(changePct(0, 0)).toBe(0);
  });
  it('compares with the period right before, the same length, never overlapping', () => {
    const r = { from: new Date('2026-10-20T00:00:00Z'), to: new Date('2026-10-27T00:00:00Z') };
    const p = previousRange(r);
    expect(p.to.getTime()).toBeLessThan(r.from.getTime());
    expect(r.from.getTime() - p.from.getTime()).toBe(7 * 86400000);
  });
});
