import { advanceLabStreak, labStreakSettings, labStreakToday, missedBetween, LAB_STREAK_DEFAULTS } from '../data/labStreakPolicy';
import { XP_EVENTS } from '../data/gamificationPolicy';

const cfg = LAB_STREAK_DEFAULTS; // a freeze every 7 days, hold 2
const fresh = { current: 0, longest: 0, lastDate: null, freezes: 0 };

describe('lab streaks', () => {
  it('starts at 1 and counts consecutive days', () => {
    let s = advanceLabStreak(fresh, '2026-11-01', cfg);
    expect(s).toMatchObject({ current: 1, longest: 1, advanced: true });
    s = advanceLabStreak(s, '2026-11-02', cfg);
    expect(s.current).toBe(2);
  });

  it('counts a day once, and ignores a late write for an earlier day', () => {
    const s = advanceLabStreak(fresh, '2026-11-01', cfg);
    expect(advanceLabStreak(s, '2026-11-01', cfg)).toMatchObject({ current: 1, advanced: false });
    expect(advanceLabStreak(s, '2026-10-30', cfg)).toMatchObject({ current: 1, advanced: false });
  });

  it('earns a freeze every 7 days, up to 2', () => {
    let s: any = fresh;
    const earned: string[] = [];
    for (let d = 1; d <= 21; d++) {
      s = advanceLabStreak(s, `2026-11-${String(d).padStart(2, '0')}`, cfg);
      if (s.earnedFreeze) earned.push(String(d));
    }
    expect(earned).toEqual(['7', '14']); // day 21 would be a third, but 2 is the most held
    expect(s.freezes).toBe(2);
    expect(s.current).toBe(21);
  });

  it('uses freezes on their own to cover missed days', () => {
    const s = advanceLabStreak({ current: 10, longest: 10, lastDate: '2026-11-10', freezes: 2 }, '2026-11-13', cfg);
    expect(s).toMatchObject({ current: 11, freezes: 0, frozenDates: ['2026-11-11', '2026-11-12'] });
  });

  it('starts again when the gap is longer than the freezes held, and keeps the freezes', () => {
    const s = advanceLabStreak({ current: 10, longest: 12, lastDate: '2026-11-10', freezes: 1 }, '2026-11-13', cfg);
    expect(s).toMatchObject({ current: 1, longest: 12, freezes: 1, frozenDates: [] });
  });

  it('with freezes switched off, any gap starts again', () => {
    const off = { freezeEvery: 0, freezeMax: 0 };
    let s: any = fresh;
    for (let d = 1; d <= 8; d++) s = advanceLabStreak(s, `2026-11-0${Math.min(d, 9)}`.slice(0, 10), off);
    expect(s.freezes).toBe(0);
    expect(advanceLabStreak({ ...s, lastDate: '2026-11-08' }, '2026-11-10', off).current).toBe(1);
  });

  it('crosses a month end', () => {
    expect(missedBetween('2026-10-31', '2026-11-01')).toBe(0);
    expect(advanceLabStreak({ current: 3, longest: 3, lastDate: '2026-10-31', freezes: 0 }, '2026-11-01', cfg).current).toBe(4);
  });

  it('shows a streak that can no longer be saved as 0, and one not yet done today as at risk', () => {
    expect(labStreakToday({ current: 5, longest: 5, lastDate: '2026-11-07', freezes: 0 }, '2026-11-07')).toEqual({ current: 5, atRisk: false });
    expect(labStreakToday({ current: 5, longest: 5, lastDate: '2026-11-06', freezes: 0 }, '2026-11-07')).toEqual({ current: 5, atRisk: true });
    expect(labStreakToday({ current: 5, longest: 5, lastDate: '2026-11-05', freezes: 0 }, '2026-11-07')).toEqual({ current: 0, atRisk: false });
    expect(labStreakToday({ current: 5, longest: 5, lastDate: '2026-11-05', freezes: 1 }, '2026-11-07')).toEqual({ current: 5, atRisk: true });
  });

  it('checks the admin numbers and falls back to the defaults', () => {
    expect(labStreakSettings(undefined)).toEqual(cfg);
    expect(labStreakSettings({ freezeEvery: 5, freezeMax: 3 })).toEqual({ freezeEvery: 5, freezeMax: 3 });
    expect(labStreakSettings({ freezeEvery: -1, freezeMax: 99 })).toEqual(cfg);
  });
});

describe('lab XP events', () => {
  it('both labs are XP activities in the shared list, paying once a day and counting for the streak', () => {
    for (const key of ['THINKING_LAB_DAILY_COMPLETED', 'COMMUNICATION_DAILY_COMPLETED']) {
      const e = XP_EVENTS.find((x) => x.key === key);
      expect(e).toBeDefined();
      expect(e).toMatchObject({ uniqueSource: true, streakQualifying: true });
      expect(e!.defaultXp).toBeGreaterThan(0);
    }
  });
});
