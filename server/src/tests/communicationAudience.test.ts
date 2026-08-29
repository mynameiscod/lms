/**
 * Who a communication challenge reaches, and which one a member gets today.
 *
 * Two rules worth pinning. The audience filter is asymmetric in the same direction as the
 * Thinking Lab bank, and getting that backwards would publish every existing challenge to
 * CareerPilot members the moment they could read them — a content review nobody performed,
 * and a failure that looks like a feature rather than a bug.
 *
 * The rotation matters because members have no instructor assigning days. It has to be
 * deterministic, or a refresh would swap the task underneath someone mid-recording.
 */

import { challengeAudienceFilter, CHALLENGE_AUDIENCES } from '../models/CommunicationChallenge';

describe('who a challenge is for', () => {
  it('offers both products, and only those', () => {
    expect([...CHALLENGE_AUDIENCES]).toEqual(['lms', 'careerpilot']);
  });

  /**
   * Three shapes mean "LMS": tagged, the field absent (every challenge written before
   * audiences existed), or an empty array. All three must match, or the existing bank
   * vanishes from the LMS the day this ships.
   */
  it('treats an untagged challenge as LMS, not as everyone', () => {
    const f: any = challengeAudienceFilter('lms');
    expect(f.$or).toEqual([
      { audiences: 'lms' },
      { audiences: { $exists: false } },
      { audiences: { $size: 0 } },
    ]);
  });

  it('requires an explicit tag before CareerPilot sees anything', () => {
    expect(challengeAudienceFilter('careerpilot')).toEqual({ audiences: 'careerpilot' });
  });

  it('never matches an untagged challenge for CareerPilot', () => {
    const f = JSON.stringify(challengeAudienceFilter('careerpilot'));
    expect(f).not.toContain('$exists');
    expect(f).not.toContain('$size');
  });

  it('spreads into a query without replacing its other conditions', () => {
    const q = { tenantId: 't1', active: true, ...challengeAudienceFilter('careerpilot') };
    expect(q.tenantId).toBe('t1');
    expect(q.active).toBe(true);
    expect((q as any).audiences).toBe('careerpilot');
  });
});

/** The position calculation exactly as getToday performs it. */
const dayIndexFor = (activatedAt: string, today: string): number => {
  const s = new Date(activatedAt);
  return Math.max(0, Math.floor(
    (Date.parse(`${today}T00:00:00Z`) - Date.UTC(
      s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate(),
    )) / 86400000,
  ));
};

describe('which challenge a member gets today', () => {
  it('starts everybody on the first one', () => {
    expect(dayIndexFor('2026-08-01T10:30:00Z', '2026-08-01')).toBe(0);
  });

  it('advances one per calendar day', () => {
    expect(dayIndexFor('2026-08-01T10:30:00Z', '2026-08-02')).toBe(1);
    expect(dayIndexFor('2026-08-01T10:30:00Z', '2026-08-08')).toBe(7);
  });

  /**
   * Time of day must not matter. Joining at 23:55 and opening the app five minutes later
   * is the NEXT day, and it should be challenge two rather than a second run at one.
   */
  it('ignores the time of day they joined', () => {
    expect(dayIndexFor('2026-08-01T23:55:00Z', '2026-08-02')).toBe(1);
    expect(dayIndexFor('2026-08-01T00:05:00Z', '2026-08-02')).toBe(1);
  });

  it('never goes negative if the clock disagrees', () => {
    expect(dayIndexFor('2026-08-10T10:00:00Z', '2026-08-01')).toBe(0);
  });

  it('wraps over the set so a programme never runs dry', () => {
    const total = 30;
    expect(dayIndexFor('2026-08-01T09:00:00Z', '2026-08-31') % total).toBe(0);
    expect(dayIndexFor('2026-08-01T09:00:00Z', '2026-09-01') % total).toBe(1);
  });

  /**
   * Elapsed days, not completed ones. Counting completions would stall the whole
   * programme on the first missed day; this keeps the schedule moving and lets History
   * show the gap honestly.
   */
  it('keeps advancing across a missed day', () => {
    expect(dayIndexFor('2026-08-01T09:00:00Z', '2026-08-04')).toBe(3);
  });

  it('is stable for the same member and date', () => {
    const a = dayIndexFor('2026-08-01T09:00:00Z', '2026-08-15');
    const b = dayIndexFor('2026-08-01T09:00:00Z', '2026-08-15');
    expect(a).toBe(b);
  });
});
