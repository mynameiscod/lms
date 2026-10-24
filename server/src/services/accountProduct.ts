/**
 * Which product an account belongs to: the LMS, or CareerPilot. One rule, used everywhere.
 *
 * They are two products that happen to share a `users` collection. A CareerPilot member is not an
 * LMS student: they have no batch, no classes, no LMS dashboard. Letting one into the other made the
 * LMS appear in the middle of a member's day, and let college students into CareerPilot.
 *
 * THE MARKER IS `passport.product`, never `passport` itself. `passport` is a nested path whose
 * defaults make Mongoose create it on EVERY user, so "has a passport" is true of every student and
 * every admin (the same trap careerPilotPopulation.ts documents). `passport.product` has no default
 * and is written only by the three paths that enrol a member: public sign-up, an admin creating a
 * member, and membership activation.
 */

export type Product = 'lms' | 'careerpilot';

/** Enrolled in CareerPilot by one of the enrolment paths. */
export const hasCareerPilotProduct = (passport: any): boolean => !!(passport && String(passport.product || '').trim());

/**
 * A pure CareerPilot member: a student who was enrolled in CareerPilot and was never placed in an LMS
 * batch. These accounts live in CareerPilot only.
 */
export function isPureMember(user: any): boolean {
  return !!user && user.role === 'STUDENT' && !user.batchId && hasCareerPilotProduct(user.passport);
}

/** May this account use the LMS login? Everyone except a pure CareerPilot member. */
export const canUseLms = (user: any): boolean => !isPureMember(user);

/**
 * May this account use the CareerPilot login? A student who was enrolled in it. Staff and admins
 * have their own admin screens (the CareerPilot admin lives in the LMS admin app); an ordinary LMS
 * student was never enrolled and has no member account to open.
 */
export const canUseCareerPilot = (user: any): boolean => !!user && user.role === 'STUDENT' && hasCareerPilotProduct(user.passport);

/** The product an account lands in when nothing says otherwise (a token issued before this existed). */
export const defaultProduct = (user: any): Product => (isPureMember(user) ? 'careerpilot' : 'lms');

export const WRONG_DOOR_LMS = 'This is a CareerPilot account. Please sign in on the CareerPilot page: /careerpilot/login';
export const WRONG_DOOR_CAREERPILOT = 'No CareerPilot account was found for this login. If you are a college student, please use the LMS login.';
