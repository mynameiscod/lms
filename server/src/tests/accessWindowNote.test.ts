/**
 * When to tell a member their access ends before their programme does.
 *
 * The two lengths are different on purpose — a paying member gets twelve months for a
 * 90-day plan — so a banner that fires for everybody is one people stop reading. It has to
 * appear exactly when the numbers disagree in a way that costs the member something: a demo
 * granted 30 days looking at a 90-day roadmap with nothing saying they cannot finish it.
 *
 * The rule is reproduced here rather than imported because it lives in a React component,
 * and the arithmetic is the part worth pinning.
 */

const DAY = 86400000;
const NOW = new Date('2026-09-03T10:00:00Z').getTime();

/** Exactly the check the roadmap page applies. */
function shows(opts: {
  expiresAt?: string | null;
  totalDays?: number | null;
  currentDay?: number;
  now?: number;
}): boolean {
  const now = opts.now ?? NOW;
  if (!opts.expiresAt || !opts.totalDays) return false;

  const ends = new Date(opts.expiresAt);
  if (Number.isNaN(ends.getTime())) return false;

  const daysLeft = Math.ceil((ends.getTime() - now) / DAY);
  if (daysLeft <= 0) return false;

  const dayNow = opts.currentDay || 1;
  return daysLeft < opts.totalDays - dayNow + 1;
}

const inDays = (n: number) => new Date(NOW + n * DAY).toISOString();

describe('it appears when access runs out mid-programme', () => {
  /** The case this exists for: 30 days granted against a 90-day programme. */
  it('warns a demo member on day 1', () => {
    expect(shows({ expiresAt: inDays(30), totalDays: 90, currentDay: 1 })).toBe(true);
  });

  it('warns wherever they are, while the plan still outruns their access', () => {
    expect(shows({ expiresAt: inDays(30), totalDays: 90, currentDay: 40 })).toBe(true);
  });
});

describe('it stays quiet when access outlasts the programme', () => {
  /**
   * A paying member has twelve months for a 90-day plan. Telling them their access runs to
   * next August is the noise that makes a banner invisible when it matters.
   */
  it('says nothing to a paying member', () => {
    expect(shows({ expiresAt: inDays(365), totalDays: 90, currentDay: 1 })).toBe(false);
  });

  it('says nothing when access exactly covers what is left', () => {
    // Day 61 of 90: 30 days of plan remain, and they have 30 days of access.
    expect(shows({ expiresAt: inDays(30), totalDays: 90, currentDay: 61 })).toBe(false);
  });

  /**
   * Late in the plan the numbers stop mattering. Someone on day 80 of 90 with 30 days left
   * has no problem, and telling them about one invents anxiety.
   */
  it('says nothing to a member near the end with time to spare', () => {
    expect(shows({ expiresAt: inDays(30), totalDays: 90, currentDay: 80 })).toBe(false);
  });

  it('warns when access falls one day short', () => {
    // Day 61 again, but a day less of access.
    expect(shows({ expiresAt: inDays(29), totalDays: 90, currentDay: 61 })).toBe(true);
  });
});

describe('it never fires on missing or nonsensical input', () => {
  it('stays quiet with no expiry recorded', () => {
    expect(shows({ expiresAt: null, totalDays: 90 })).toBe(false);
    expect(shows({ expiresAt: undefined, totalDays: 90 })).toBe(false);
  });

  it('stays quiet before the roadmap has loaded', () => {
    expect(shows({ expiresAt: inDays(30), totalDays: null })).toBe(false);
    expect(shows({ expiresAt: inDays(30), totalDays: 0 })).toBe(false);
  });

  it('stays quiet on an unparseable date rather than rendering "Invalid Date"', () => {
    expect(shows({ expiresAt: 'not-a-date', totalDays: 90 })).toBe(false);
  });

  /**
   * Already lapsed is a different message and the unlock panel already carries it. Two
   * banners saying related things is how a page stops being read.
   */
  it('stays quiet once access has already ended', () => {
    expect(shows({ expiresAt: inDays(-1), totalDays: 90 })).toBe(false);
    expect(shows({ expiresAt: inDays(0), totalDays: 90 })).toBe(false);
  });
});
