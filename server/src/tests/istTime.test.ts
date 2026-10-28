import { istDay, istMinuteOfDay, istRange } from '../utils/istTime';

describe('IST days for the team reports', () => {
  it('puts a late-evening UTC time on the next Indian day', () => {
    // 20:00 UTC on 27 Oct is 01:30 IST on 28 Oct.
    const d = new Date('2026-10-27T20:00:00.000Z');
    expect(istDay(d)).toBe('2026-10-28');
    expect(istMinuteOfDay(d)).toBe(90);
  });

  it('counts minutes from midnight IST', () => {
    expect(istMinuteOfDay(new Date('2026-10-27T04:30:00.000Z'))).toBe(10 * 60); // 10:00 IST
    expect(istMinuteOfDay(new Date('2026-10-27T18:29:00.000Z'))).toBe(23 * 60 + 59);
  });

  it('turns a day into its full Indian day', () => {
    const r = istRange('2026-10-27', '2026-10-27');
    expect(r.start.toISOString()).toBe('2026-10-26T18:30:00.000Z');
    expect(r.end.toISOString()).toBe('2026-10-27T18:29:59.999Z');
  });

  it('accepts a range in either order and falls back to today on bad input', () => {
    const r = istRange('2026-10-29', '2026-10-27');
    expect(r.fromDay).toBe('2026-10-27');
    expect(r.toDay).toBe('2026-10-29');
    const bad = istRange('not-a-date', undefined);
    expect(bad.fromDay).toBe(istDay());
    expect(bad.toDay).toBe(istDay());
  });
});
