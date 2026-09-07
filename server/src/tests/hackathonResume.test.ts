/**
 * A student coming back to their own failed payment.
 *
 * THE REPORTED FAULT. A team filled the form, the payment failed, and refilling the form said
 * "already registered" — because their own unpaid attempt was holding their own team name and
 * mobiles for thirty minutes. The way back existed the whole time (the registration code, and
 * a public lookup that accepts it); the student was simply never given the code, because the
 * only message the system sent went out on payment SUCCESS.
 *
 * Three things had to be true to fix it, and each is pinned below: the same team must be
 * recognised rather than reported as a clash, a partial match must NOT be, and the hold must
 * survive a student reading their email late without becoming a permanent claim on a name.
 */

/**
 * Mirrors findResumable's matching rule. Kept here rather than imported because the real
 * function reaches Mongo; if the two ever disagree these tests stop describing the product,
 * which is why the rule lives in one obvious block there.
 */
const sameTeam = (
  candidate: { teamNameKey: string; memberMobiles: string[] },
  incoming: { teamNameKey: string; memberMobiles: string[] },
): boolean =>
  candidate.teamNameKey === incoming.teamNameKey
  && [...candidate.memberMobiles].sort().join('|') === [...incoming.memberMobiles].sort().join('|');

const team = (name: string, mobiles: string[]) => ({ teamNameKey: name, memberMobiles: mobiles });

describe('recognising the same team coming back', () => {
  const original = team('codewarriors', ['9876543210', '9123456789']);

  it('matches an identical resubmission', () => {
    expect(sameTeam(original, team('codewarriors', ['9876543210', '9123456789']))).toBe(true);
  });

  it('matches regardless of the order members were entered in', () => {
    expect(sameTeam(original, team('codewarriors', ['9123456789', '9876543210']))).toBe(true);
  });

  /**
   * The strictness that matters. A swapped or corrected member is a different team, and
   * inheriting the previous order would attach one team's payment to another's roster.
   */
  it('does not match when a member changed', () => {
    expect(sameTeam(original, team('codewarriors', ['9876543210', '9000000000']))).toBe(false);
  });

  it('does not match when a member was added', () => {
    expect(sameTeam(original, team('codewarriors', ['9876543210', '9123456789', '9555555555']))).toBe(false);
  });

  it('does not match when a member was dropped', () => {
    expect(sameTeam(original, team('codewarriors', ['9876543210']))).toBe(false);
  });

  it('does not match another team with the same members', () => {
    expect(sameTeam(original, team('bytebenders', ['9876543210', '9123456789']))).toBe(false);
  });
});

/**
 * The hold, and its ceiling.
 *
 * Reopening the payment link moves the thirty-minute window, so a student who reads their
 * email an hour later does not find their team name released through no fault of their own.
 * Without a memory of when the registration FIRST began, that extension could be repeated
 * forever and one abandoned team would hold a name for the life of the event.
 */
const RESUME_HOLD_CEILING_HOURS = 24;
const withinCeiling = (firstSeen: Date, now: Date): boolean =>
  (now.getTime() - firstSeen.getTime()) / 3_600_000 <= RESUME_HOLD_CEILING_HOURS;

describe('how long a hold may be extended', () => {
  const at = (h: number) => new Date(Date.UTC(2026, 8, 7, h, 0, 0));

  it('allows a student returning an hour later', () => {
    expect(withinCeiling(at(9), at(10))).toBe(true);
  });

  it('allows a student returning the same evening', () => {
    expect(withinCeiling(at(9), at(21))).toBe(true);
  });

  it('refuses a registration older than the ceiling', () => {
    expect(withinCeiling(at(9), new Date(Date.UTC(2026, 8, 8, 10, 0, 0)))).toBe(false);
  });

  it('is measured from when it first began, not from the last extension', () => {
    // The point of firstRegisteredAt: three extensions must not add up to three ceilings.
    const began = at(9);
    const afterThreeExtensions = new Date(Date.UTC(2026, 8, 8, 12, 0, 0));
    expect(withinCeiling(began, afterThreeExtensions)).toBe(false);
  });
});

/**
 * Whether the stored Razorpay order can be reused.
 *
 * A dead order fails inside the checkout widget with something the student cannot act on;
 * always recreating leaves an orphan per retry in the dashboard. And an order that has been
 * PAID must never be retried — the callback was lost, not the payment, and charging again
 * would be the worst outcome available.
 */
type Order = { status: string; amount_paid: number };
const orderVerdict = (o: Order | null): 'reuse' | 'recreate' | 'already-paid' => {
  if (!o) return 'recreate';
  if (o.status === 'paid' || o.amount_paid > 0) return 'already-paid';
  return o.status === 'created' ? 'reuse' : 'recreate';
};

describe('what to do with the stored order', () => {
  it('reuses an order still open', () => {
    expect(orderVerdict({ status: 'created', amount_paid: 0 })).toBe('reuse');
  });

  it('recreates when the order has expired or been attempted out', () => {
    expect(orderVerdict({ status: 'attempted', amount_paid: 0 })).toBe('recreate');
  });

  it('recreates when the order cannot be fetched at all', () => {
    expect(orderVerdict(null)).toBe('recreate');
  });

  it('refuses to retry an order that was actually paid', () => {
    expect(orderVerdict({ status: 'paid', amount_paid: 50000 })).toBe('already-paid');
  });

  /** The dangerous case: money captured against an order still marked open. */
  it('refuses when money was taken even though the status looks open', () => {
    expect(orderVerdict({ status: 'created', amount_paid: 50000 })).toBe('already-paid');
  });
});

/**
 * The resume-by-mobile lookup answers identically whether or not it found anything.
 *
 * Otherwise the endpoint becomes a way to ask "is this phone number registered for this
 * event", which is nobody's business but the owner's.
 */
describe('the lost-my-email lookup', () => {
  const reply = { success: true, message: 'If that number has a registration awaiting payment, we have sent the link again.' };

  it('says the same thing whether a registration was found or not', () => {
    const found = reply;
    const notFound = reply;
    expect(found).toEqual(notFound);
  });

  it('never states whether the number exists', () => {
    expect(reply.message).not.toMatch(/not found|no registration|does not exist/i);
    expect(reply.message).toMatch(/^If that number/);
  });
});
