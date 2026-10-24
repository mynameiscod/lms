/**
 * A CareerPilot-only member: someone who joined through CareerPilot and is not an LMS student.
 *
 * CareerPilot and the LMS are separate products on the same tenant, and both kinds of student
 * have role STUDENT. Every user carries an (empty) `passport` block by default, so its presence
 * says nothing; what does is a CareerPilot sign-up (verified there, or staged there) with no LMS
 * batch. An LMS student who also takes CareerPilot keeps the LMS portal.
 */
export function isCareerPilotOnly(user: any): boolean {
  if (!user || user.role !== 'STUDENT') return false;
  const p = user.passport || {};
  const joinedCareerPilot = !!(p.verifiedAt || p.stage || p.contextCompletedAt || p.activatedAt);
  return joinedCareerPilot && !user.batchId;
}
