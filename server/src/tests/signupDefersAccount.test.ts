/**
 * A failed OTP must not cost somebody their mobile number.
 *
 * Signup created the real User the moment the form was submitted — before the OTP had even
 * been sent, let alone entered. So an abandoned or failed attempt left a permanent account
 * behind, and because one mobile may own only one account, the number was claimed forever.
 * The member came back, typed the same number, and was told it "is already registered":
 * blocked by their own failed attempt, with nothing they could do to clear it.
 *
 * It was also a way to burn a number that was not yours. Typing a stranger's mobile into
 * the form reserved it against an email they do not control, and they hit the same wall
 * when they eventually signed up.
 *
 * THE RULE THESE PIN: an account exists once ownership of the number is proved, and an
 * unverified row holds no claim on an email or a mobile. Whoever proves it first gets it.
 *
 * The decisions are reproduced rather than imported: signup and verify open Mongo on every
 * path, and these are tests about which attempt is allowed to proceed.
 */

type Account = { email: string; phone: string; passport?: { verifiedAt?: Date; active?: boolean } };

/** Exactly the predicate the controller uses. */
const proved = (u: Account | null): boolean => !!(u?.passport?.verifiedAt || u?.passport?.active);

/**
 * Exactly signup's conflict decision: a mobile is blocked only by an account somebody
 * actually proved, and only when it belongs to a different email.
 */
function mobileBlocked(owner: Account | null, email: string): boolean {
  if (!owner || !proved(owner)) return false;
  return owner.email.toLowerCase() !== email.toLowerCase();
}

const VERIFIED = (email: string, phone: string): Account =>
  ({ email, phone, passport: { verifiedAt: new Date('2026-01-01') } });
const UNVERIFIED = (email: string, phone: string): Account =>
  ({ email, phone, passport: {} });

describe('an unproved attempt does not claim the number', () => {
  /** THE REGRESSION. Signup, no OTP arrives, come back and try again. */
  it('lets the same person retry after their OTP never arrived', () => {
    const stranded = UNVERIFIED('me@example.com', '9876500000');
    expect(mobileBlocked(stranded, 'me@example.com')).toBe(false);
  });

  /** And with a different email, which is the case that actually produced the message. */
  it('lets them retry under a corrected email address', () => {
    const stranded = UNVERIFIED('typo@example.com', '9876500000');
    expect(mobileBlocked(stranded, 'me@example.com')).toBe(false);
  });

  it('does not let a stranger permanently reserve a number they do not own', () => {
    const burned = UNVERIFIED('stranger@example.com', '9876500000');
    expect(mobileBlocked(burned, 'realowner@example.com')).toBe(false);
  });
});

describe('a proved account still owns its number', () => {
  it('blocks a different email from taking a verified member\'s mobile', () => {
    expect(mobileBlocked(VERIFIED('member@example.com', '9876500000'), 'someone@example.com')).toBe(true);
  });

  /** A paid member counts as proved even if verifiedAt predates the stamp. */
  it('treats an activated membership as proof', () => {
    const paid: Account = { email: 'paid@example.com', phone: '9876500000', passport: { active: true } };
    expect(mobileBlocked(paid, 'other@example.com')).toBe(true);
  });

  it('lets the owner themselves sign up again with their own email', () => {
    expect(mobileBlocked(VERIFIED('member@example.com', '9876500000'), 'member@example.com')).toBe(false);
  });

  it('does not block when nobody holds the number', () => {
    expect(mobileBlocked(null, 'anyone@example.com')).toBe(false);
  });
});

describe('taking over a stranded row rather than deleting it', () => {
  /**
   * These are `users` documents. A delete keyed on the wrong condition removes people, so
   * an unverified row is written over in place — it has nothing worth keeping and no claim
   * on anything, and nothing is ever removed.
   */
  const mayTakeOver = (u: Account | null): boolean => !!u && !proved(u);

  it('takes over the row a failed signup left behind', () => {
    expect(mayTakeOver(UNVERIFIED('me@example.com', '9876500000'))).toBe(true);
  });

  it('never takes over an account somebody proved', () => {
    expect(mayTakeOver(VERIFIED('member@example.com', '9876500000'))).toBe(false);
    expect(mayTakeOver({ email: 'p@x.com', phone: '9', passport: { active: true } })).toBe(false);
  });

  it('creates a fresh account when there is nothing to take over', () => {
    expect(mayTakeOver(null)).toBe(false);
  });
});

describe('the token tells verify which kind of flow it is', () => {
  /**
   * Signup tokens are 48 hex characters; OTP-login tokens are user ids. findById throws a
   * CastError on the former, which surfaced as a 500 rather than "start over".
   */
  const OBJECT_ID = /^[0-9a-f]{24}$/i;
  const isUserId = (t: string) => OBJECT_ID.test(t);

  it('does not mistake a signup token for a user id', () => {
    expect(isUserId('a'.repeat(48))).toBe(false);
  });

  it('still recognises a real user id', () => {
    expect(isUserId('6a9a5aedc74cef1bdd94e2f2')).toBe(true);
  });

  /** A 24-byte token can never be 24 hex chars, so the two namespaces cannot collide. */
  it('cannot collide with an object id', () => {
    expect('a'.repeat(48)).toHaveLength(48);
    expect(isUserId('a'.repeat(48))).toBe(false);
  });
});
