import { ymd } from '../services/passportMissionService';

describe('the day a member did something, in India time', () => {
  it('counts 1 am IST as that day, not the day before', () => {
    // 2026-10-30 01:00 IST = 2026-10-29 19:30 UTC
    expect(ymd(new Date('2026-10-29T19:30:00Z'))).toBe('2026-10-30');
    expect(ymd(new Date('2026-10-29T18:29:00Z'))).toBe('2026-10-29');   // 23:59 IST
  });
});
