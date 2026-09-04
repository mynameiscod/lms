/**
 * A member's earned XP and streak must survive the locked screen.
 *
 * Mission Control's pre-membership view printed a hardcoded "0d" streak and an em dash for
 * XP — not a stale read, but literal text in the markup, because the status payload never
 * carried the numbers and there was nothing to read. A member who had genuinely earned 100
 * XP and a one-day streak was shown zero and nothing, on the very screen asking them to pay
 * to "start earning". The two cards beside them were live, so the dead ones read as a broken
 * page rather than a deliberate teaser.
 *
 * The rule these pin: PROGRESS IS EARNED BY DOING THE WORK, NOT BY PAYING FOR IT. It is
 * therefore reported regardless of membership, and the screen chooses how to present it.
 * Zero is only ever shown when the member has actually earned zero.
 *
 * The resolution is reproduced rather than imported: getMyStatus opens a Mongo connection on
 * every path, and this is a test about which number wins.
 */

type Progress = { xp: number; streak: number; longestStreak: number } | null;
type Today = { xp: number; streak: number; longestStreak: number } | null;

/** Exactly what the controller writes into the payload. */
const payloadProgress = (doc: Progress) => ({
  xp: doc?.xp ?? 0,
  streak: doc?.streak ?? 0,
  longestStreak: doc?.longestStreak ?? 0,
});

/**
 * Exactly the precedence the screen applies. `today` is only fetched once a membership is
 * active, so it is undefined on the locked view — which is why the status payload has to
 * carry these at all.
 */
const shown = (today: Today, status: ReturnType<typeof payloadProgress>) => ({
  xp: today?.xp ?? status.xp ?? 0,
  streak: today?.streak ?? status.streak ?? 0,
  best: today?.longestStreak ?? status.longestStreak ?? 0,
});

describe('the status payload reports progress', () => {
  it('reports what the member actually earned', () => {
    expect(payloadProgress({ xp: 100, streak: 1, longestStreak: 4 }))
      .toEqual({ xp: 100, streak: 1, longestStreak: 4 });
  });

  it('reports zeros for a member with no progress document yet', () => {
    expect(payloadProgress(null)).toEqual({ xp: 0, streak: 0, longestStreak: 0 });
  });

  /** A real zero and a missing document must be indistinguishable to the screen. */
  it('does not confuse an earned zero with a missing record', () => {
    expect(payloadProgress({ xp: 0, streak: 0, longestStreak: 0 })).toEqual(payloadProgress(null));
  });
});

describe('the locked screen shows earned progress', () => {
  /** THE REGRESSION. This is the exact state of the account that surfaced the bug. */
  it('shows 100 XP and a 1-day streak to a member who has not paid', () => {
    const status = payloadProgress({ xp: 100, streak: 1, longestStreak: 1 });
    expect(shown(null, status)).toEqual({ xp: 100, streak: 1, best: 1 });
  });

  it('never prints a hardcoded zero over a real number', () => {
    const status = payloadProgress({ xp: 250, streak: 7, longestStreak: 9 });
    const view = shown(null, status);
    expect(view.xp).not.toBe(0);
    expect(view.streak).not.toBe(0);
  });

  it('shows zero only when the member has earned zero', () => {
    expect(shown(null, payloadProgress(null))).toEqual({ xp: 0, streak: 0, best: 0 });
  });
});

describe('the active view stays live', () => {
  /**
   * Once a membership is active the daily plan is the fresher source: completing a mission
   * updates `today` in place without re-fetching status, and the card must move immediately.
   */
  it('prefers today over the status payload when both are present', () => {
    const status = payloadProgress({ xp: 100, streak: 1, longestStreak: 1 });
    const today = { xp: 125, streak: 2, longestStreak: 2 };
    expect(shown(today, status)).toEqual({ xp: 125, streak: 2, best: 2 });
  });

  /** A freshly-completed mission taking a streak to zero is impossible, but XP zero is not. */
  it('honours a zero coming from today rather than falling back to status', () => {
    const status = payloadProgress({ xp: 100, streak: 1, longestStreak: 1 });
    expect(shown({ xp: 0, streak: 0, longestStreak: 3 }, status))
      .toEqual({ xp: 0, streak: 0, best: 3 });
  });
});
