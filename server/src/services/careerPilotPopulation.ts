/**
 * Who counts as a CareerPilot member — defined once, for everything that asks.
 *
 * THE BUG THIS REPLACES. Callers tested `passport` for existence:
 *
 *     User.find({ tenantId, passport: { $exists: true, $ne: null } })
 *     if (!user?.passport) return;                       // "only members have a passport"
 *
 * `passport` is a NESTED PATH whose leaves carry defaults (`active`, `onboarded`,
 * `passwordSet` all default to false), so Mongoose materialises the subdocument on every
 * user it writes. `$exists` is therefore true for every ordinary LMS student who has never
 * opened CareerPilot, and the guard that reads as "members only" excludes nobody.
 *
 * The consequences were not confined to a wrong number. The funnel counted plain students
 * as members, deflating every percentage; the profile sync wrote CareerPilot fields onto
 * their records; and the public signup handler's "this email is already registered" guard
 * was dead, so an existing LMS account could be resumed as an abandoned CareerPilot signup.
 *
 * THE MARKER IS `passport.product`. It is written by the only three code paths that enrol
 * anybody — public signup, admin-created member, and membership activation — and by nothing
 * else. It has no schema default, so an untouched user does not have it.
 *
 * ENROLMENT, NEVER ACTIVITY. Having a role, a roadmap, an assessment or a Skill DNA means
 * somebody used the product; it does not decide whether they belong to it. A member who
 * signed up this morning and has done nothing is a member. Defining the population from
 * activity would make every funnel denominator move whenever engagement moved, which is the
 * one thing a denominator must not do.
 */

/** What `passport.product` is set to. A stable marker, not a display string. */
export const CAREERPILOT_PRODUCT = 'career_passport';

/**
 * Ever enrolled in CareerPilot — free or paid, active or lapsed, verified or not.
 *
 * A union rather than a single field, because the marker has to hold for members who
 * predate it. Every clause is an ENROLMENT fact:
 *
 *   product      they were signed up for CareerPilot by one of the three enrolment paths
 *   active       they hold a live membership right now
 *   activatedAt  a membership was activated for them at some point
 *   verifiedAt   they completed the CareerPilot signup's OTP step
 *
 * None of them can be true for a student who has only ever used the LMS.
 */
export const careerPilotMemberFilter = (): Record<string, any> => ({
  $or: [
    { 'passport.product': { $exists: true, $nin: [null, ''] } },
    { 'passport.active': true },
    { 'passport.activatedAt': { $exists: true, $ne: null } },
    { 'passport.verifiedAt': { $exists: true, $ne: null } },
  ],
});

/** The same rule against a loaded document, for the guards that already have one. */
export function isCareerPilotMember(passport: any): boolean {
  if (!passport) return false;
  return !!(
    (passport.product && String(passport.product).trim())
    || passport.active === true
    || passport.activatedAt
    || passport.verifiedAt
  );
}

/**
 * The cohorts, which are NOT interchangeable.
 *
 * Collapsing any two of these produces a number that answers a question nobody asked:
 * "members" is the population a funnel divides by, "active" is who is entitled today,
 * "paid" is revenue, "expired" is the renewal list, and "onboarded" is who finished telling
 * us what they want. A dashboard that shows one and labels it another is worse than one
 * that shows nothing.
 */

/** Entitled right now: flagged active AND not past expiry. Matches membershipActive(). */
export const activeMemberFilter = (now: Date = new Date()): Record<string, any> => ({
  'passport.active': true,
  $or: [
    { 'passport.expiresAt': { $exists: false } },
    { 'passport.expiresAt': null },
    { 'passport.expiresAt': { $gte: now } },
  ],
});

/**
 * Was entitled, is not now — the renewal cohort.
 *
 * Requires `activatedAt`, so somebody who only ever used the free tier is not reported as
 * having lost something they never had.
 */
export const expiredMemberFilter = (now: Date = new Date()): Record<string, any> => ({
  'passport.activatedAt': { $exists: true, $ne: null },
  $or: [
    { 'passport.active': { $ne: true } },
    { 'passport.expiresAt': { $lt: now } },
  ],
});

/**
 * Never activated a membership. The free tier is real: isEntitled() serves every `free`
 * feature to a member with no live membership at all.
 */
export const freeMemberFilter = (): Record<string, any> => ({
  $and: [
    careerPilotMemberFilter(),
    { $or: [{ 'passport.activatedAt': { $exists: false } }, { 'passport.activatedAt': null }] },
  ],
});

/** Finished CareerPilot's own onboarding — told us their role, course and time budget. */
export const onboardedMemberFilter = (): Record<string, any> => ({
  'passport.contextCompletedAt': { $exists: true, $ne: null },
});

/**
 * Paid members are established from the PAYMENT LEDGER, not from the user document.
 *
 * `passport.activatedAt` is set by activation, and activation can be run by an admin
 * without money changing hands. Revenue questions must be answered by what was actually
 * collected, so this is a filter over Payment rather than over User.
 */
export const paidMembershipPaymentFilter = (): Record<string, any> => ({
  purpose: 'passport_membership',
  status: 'paid',
});
