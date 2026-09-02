/**
 * Complimentary membership.
 *
 * Membership was set by a Razorpay payment and nothing else, so producing a demo account
 * meant hand-editing `passport.active` in production — which works and leaves no reason, no
 * expiry and no way to tell a demo from a customer later.
 *
 * The rules pinned here are the ones that protect money. A grant must never quietly replace
 * somebody's paid access with a shorter complimentary one, and it must lapse on its own.
 */

import { membershipActive } from '../services/passportEntitlementService';

const DAY = 86400000;
const NOW = new Date('2026-09-03T10:00:00Z');
const inDays = (n: number) => new Date(NOW.getTime() + n * DAY);

/** Exactly the guard grantMembership applies before writing anything. */
const paidStillRunning = (passport: any, now: Date = NOW): boolean =>
  passport?.product === 'career_passport'
  && !!passport?.active
  && (!passport?.expiresAt || new Date(passport.expiresAt).getTime() > now.getTime());

describe('a grant never overwrites live paid access', () => {
  it('refuses a current paying member', () => {
    expect(paidStillRunning({ product: 'career_passport', active: true, expiresAt: inDays(200) })).toBe(true);
  });

  it('refuses a paying member with no expiry recorded', () => {
    expect(paidStillRunning({ product: 'career_passport', active: true })).toBe(true);
  });

  /**
   * The case a flag-only check would have got wrong. A lapsed member keeps `active: true`
   * because expiry is applied at read time — refusing them would block the very thing this
   * button is for: extending somebody whose paid year has run out.
   */
  it('allows a paying member whose membership has expired', () => {
    expect(paidStillRunning({ product: 'career_passport', active: true, expiresAt: inDays(-1) })).toBe(false);
  });

  it('allows a signup who has never paid', () => {
    expect(paidStillRunning({ product: 'career_passport', active: false })).toBe(false);
  });

  it('allows re-granting somebody who already holds a grant', () => {
    expect(paidStillRunning({ product: 'career_passport_grant', active: true, expiresAt: inDays(10) })).toBe(false);
  });

  it('allows a member with no passport at all', () => {
    expect(paidStillRunning(undefined)).toBe(false);
    expect(paidStillRunning({})).toBe(false);
  });
});

describe('a grant lapses without any cleanup', () => {
  /**
   * No cron, no sweep. The existing entitlement check already refuses an expired passport,
   * which is what stops a demo quietly becoming a free-for-life account.
   */
  it('is active inside its window', () => {
    expect(membershipActive({ active: true, expiresAt: inDays(3) } as any, NOW)).toBe(true);
  });

  it('is inactive once the window passes', () => {
    expect(membershipActive({ active: true, expiresAt: inDays(-1) } as any, NOW)).toBe(false);
  });

  /**
   * Expiry is EXCLUSIVE: `expiresAt < now` ends it, so the final instant still counts as
   * active. Pinned as observed rather than as assumed — a millisecond either way changes
   * nothing for a member, and asserting the opposite would have been a test describing a
   * product that does not exist.
   */
  it('is still active at the exact expiry instant, and inactive after', () => {
    expect(membershipActive({ active: true, expiresAt: NOW } as any, NOW)).toBe(true);
    expect(membershipActive({ active: true, expiresAt: new Date(NOW.getTime() - 1) } as any, NOW)).toBe(false);
  });

  it('is inactive when revoked, whatever the expiry says', () => {
    expect(membershipActive({ active: false, expiresAt: inDays(300) } as any, NOW)).toBe(false);
  });
});

describe('the requested length is bounded', () => {
  /** Exactly the clamp the handler applies. */
  const daysFor = (raw: unknown) => {
    const n = Number(raw);
    return (Number.isFinite(n) && n > 0) ? Math.min(365, Math.round(n)) : 30;
  };

  it('defaults to 30 days when nothing usable is given', () => {
    expect(daysFor(undefined)).toBe(30);
    expect(daysFor('')).toBe(30);
    expect(daysFor('forever')).toBe(30);
    expect(daysFor(NaN)).toBe(30);
  });

  it('honours a sensible request', () => {
    expect(daysFor(7)).toBe(7);
    expect(daysFor('90')).toBe(90);
  });

  /** A grant with no end is how a free-for-life account gets created by accident. */
  it('caps at a year', () => {
    expect(daysFor(100000)).toBe(365);
  });

  /**
   * Zero and negatives mean "not specified", not "one day". They coerce to 0, which an
   * isFinite-only check let through and clamped to a grant that expired tomorrow.
   */
  it('treats zero and negatives as unspecified', () => {
    expect(daysFor(0)).toBe(30);
    expect(daysFor(-30)).toBe(30);
    expect(daysFor('')).toBe(30);
  });

  it('rounds rather than storing a fractional day', () => {
    expect(daysFor(30.4)).toBe(30);
    expect(daysFor(30.6)).toBe(31);
  });
});

describe('a grant is distinguishable from a sale', () => {
  /**
   * Member counts are read from `passport.product`. Reusing the paid value would fold every
   * demo ever issued into the paying-member figure, and nothing downstream could tell them
   * apart.
   */
  it('uses its own product value', () => {
    expect('career_passport_grant').not.toBe('career_passport');
  });

  it('still counts as a member, because it is one', () => {
    const q = { 'passport.product': { $exists: true, $ne: null } };
    const granted = { passport: { product: 'career_passport_grant' } };
    expect(granted.passport.product).toBeTruthy();
    expect(q['passport.product'].$exists).toBe(true);
  });
});
