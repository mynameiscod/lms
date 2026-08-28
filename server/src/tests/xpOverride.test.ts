/**
 * What a completion is actually worth.
 *
 * The daily plan paid one flat amount for every objective: a fifteen-minute check and a
 * ninety-minute build-along scored identically, while the mission pool and the problem bank
 * both had per-item XP. An override closes that, and these pin the two properties that make
 * it safe.
 *
 * THE RULE STILL DECIDES WHETHER ANYTHING IS PAID. The override replaces only the amount.
 * If it could bypass the rule it would let a caller pay for a disabled event, or pay twice
 * past a daily cap that exists to stop farming.
 *
 * The resolution is reproduced rather than imported: processGamificationEvent talks to
 * Mongo on every path, and this is a test about arithmetic.
 */

type Rule = { enabled: boolean; xp: number; dailyLimit: number };

const RULE = (over: Partial<Rule> = {}): Rule =>
  ({ enabled: true, xp: 25, dailyLimit: 0, ...over });

type Outcome = { paid: number } | { refused: string };

/** Exactly the order processGamificationEvent applies. */
function resolve(rule: Rule | null, xpOverride: unknown, spentToday = 0): Outcome {
  if (!rule) return { refused: 'unknown_event' };
  if (!rule.enabled) return { refused: 'disabled' };
  if (!rule.xp || rule.xp <= 0) return { refused: 'zero' };

  const amount = (typeof xpOverride === 'number'
    && Number.isFinite(xpOverride)
    && xpOverride >= 0)
    ? Math.round(xpOverride)
    : rule.xp;
  if (amount <= 0) return { refused: 'zero' };

  if (rule.dailyLimit > 0 && spentToday + amount > rule.dailyLimit) {
    return { refused: 'daily_cap' };
  }
  return { paid: amount };
}

describe('an override replaces the amount', () => {
  it('pays what the caller asked for', () => {
    expect(resolve(RULE(), 80)).toEqual({ paid: 80 });
  });

  it('pays the rule when no override is given', () => {
    expect(resolve(RULE({ xp: 25 }), undefined)).toEqual({ paid: 25 });
    expect(resolve(RULE({ xp: 25 }), null)).toEqual({ paid: 25 });
  });

  it('rounds a fractional override rather than ledgering a fraction', () => {
    expect(resolve(RULE(), 42.4)).toEqual({ paid: 42 });
    expect(resolve(RULE(), 42.6)).toEqual({ paid: 43 });
  });

  /** Some material is worth reading and worth no points. That is a real choice. */
  it('honours an explicit zero as a refusal to pay', () => {
    expect(resolve(RULE(), 0)).toEqual({ refused: 'zero' });
  });
});

describe('a bad override falls back rather than corrupting the award', () => {
  /** Nothing in this ledger is meant to take XP away. */
  it('ignores a negative and pays the rule', () => {
    expect(resolve(RULE({ xp: 25 }), -50)).toEqual({ paid: 25 });
  });

  it('ignores NaN and Infinity', () => {
    expect(resolve(RULE({ xp: 25 }), NaN)).toEqual({ paid: 25 });
    expect(resolve(RULE({ xp: 25 }), Infinity)).toEqual({ paid: 25 });
  });

  it('ignores a non-number', () => {
    expect(resolve(RULE({ xp: 25 }), '80')).toEqual({ paid: 25 });
    expect(resolve(RULE({ xp: 25 }), {})).toEqual({ paid: 25 });
  });
});

describe('the rule still owns whether anything is paid', () => {
  it('refuses a disabled event however large the override', () => {
    expect(resolve(RULE({ enabled: false }), 500)).toEqual({ refused: 'disabled' });
  });

  it('refuses an unknown event', () => {
    expect(resolve(null, 500)).toEqual({ refused: 'unknown_event' });
  });

  /**
   * A rule set to zero means the tenant turned this event off. An override must not
   * resurrect it, or "stop paying for X" would be unenforceable.
   */
  it('refuses when the rule pays nothing, even with an override', () => {
    expect(resolve(RULE({ xp: 0 }), 500)).toEqual({ refused: 'zero' });
  });
});

describe('the daily cap is applied to what would actually be paid', () => {
  /**
   * The bug this prevents. Capping on the rule's nominal amount would let a 200-point
   * override through a 100-point daily limit, because the check never saw the real figure.
   */
  it('refuses an override that would breach the cap', () => {
    expect(resolve(RULE({ xp: 25, dailyLimit: 100 }), 200, 0)).toEqual({ refused: 'daily_cap' });
  });

  it('allows an override that fits', () => {
    expect(resolve(RULE({ xp: 25, dailyLimit: 100 }), 60, 20)).toEqual({ paid: 60 });
  });

  it('counts what has already been spent today', () => {
    expect(resolve(RULE({ xp: 25, dailyLimit: 100 }), 60, 50)).toEqual({ refused: 'daily_cap' });
  });

  it('lands exactly on the cap', () => {
    expect(resolve(RULE({ xp: 25, dailyLimit: 100 }), 40, 60)).toEqual({ paid: 40 });
  });

  it('ignores the cap when the tenant has not set one', () => {
    expect(resolve(RULE({ xp: 25, dailyLimit: 0 }), 5000, 99999)).toEqual({ paid: 5000 });
  });
});
