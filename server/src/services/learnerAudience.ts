/**
 * Which student population(s) a learner belongs to, and which content audiences that lets
 * them see.
 *
 * WHY ONE PLACE. LMS students and CareerPilot members are both `users` rows in the same
 * tenant; a member simply carries an embedded `passport`. Before this file, "is this person
 * CareerPilot?" was answered inline in several places, each slightly differently. The rule
 * below is the one Problem Sets and the Code Visualizer already used — the most careful of
 * them, because it checks expiry and treats a person as possibly BOTH at once — lifted out so
 * that content gating (Quiz / Assignment / Question Book `audience`) asks the same question.
 *
 * NOT A POPULATION FILTER. services/careerPilotPopulation.ts and
 * passportEntitlementService.membershipActive answer reporting / billing questions ("who do we
 * count as a member", "is this membership paid up") and are deliberately left alone.
 */

/** Who a piece of content is for. Same vocabulary as QuestionBook.audience; new scopes go here. */
export const CONTENT_AUDIENCES = ['lms', 'careerpilot', 'all'] as const;
export type ContentAudience = typeof CONTENT_AUDIENCES[number];

/** Rows created before the audience field existed were all built for the LMS. */
export const DEFAULT_CONTENT_AUDIENCE: ContentAudience = 'lms';

export interface LearnerAudience {
  lms: boolean;
  careerpilot: boolean;
}

/** The User fields learnerAudienceOf reads — select these when loading the user. */
export const LEARNER_AUDIENCE_FIELDS = 'role batchId passport.active passport.expiresAt passport.product';

/**
 * - CareerPilot: the passport is active and has not expired.
 * - LMS: a STUDENT who is in a batch, or who never came through CareerPilot (no
 *   passport.product). A CareerPilot member who is also placed in a batch is both.
 * Staff are neither — they reach content through their own staff paths.
 */
export function learnerAudienceOf(user: any, now: number = Date.now()): LearnerAudience {
  if (!user) return { lms: false, careerpilot: false };
  const p = user.passport || {};
  const careerpilot = !!p.active && (!p.expiresAt || new Date(p.expiresAt).getTime() > now);
  const lms = user.role === 'STUDENT' && (!!user.batchId || !p.product);
  return { lms, careerpilot };
}

export function isContentAudience(v: any): v is ContentAudience {
  return (CONTENT_AUDIENCES as readonly string[]).includes(v);
}

/** Normalise an admin-supplied value; anything unknown becomes undefined (caller keeps its default). */
export function parseContentAudience(v: any): ContentAudience | undefined {
  return isContentAudience(v) ? v : undefined;
}

/**
 * The stored audiences a surface for `kind` may show. A missing field is treated as 'lms'
 * (legacy rows), so the LMS list includes null — `$in: [null]` also matches an absent field.
 */
export function audiencesFor(kind: 'lms' | 'careerpilot'): (ContentAudience | null)[] {
  return kind === 'lms' ? ['lms', 'all', null] : ['careerpilot', 'all'];
}

/** Mongo condition on the `audience` field for an LMS or CareerPilot list. Spread into a query. */
export function audienceFilterFor(kind: 'lms' | 'careerpilot'): { audience: { $in: (ContentAudience | null)[] } } {
  return { audience: { $in: audiencesFor(kind) } };
}

/** The same test in memory, for lists that filter after loading (studentWorkService). */
export function audienceIncludes(kind: 'lms' | 'careerpilot', audience: any): boolean {
  const a = isContentAudience(audience) ? audience : DEFAULT_CONTENT_AUDIENCE;
  return a === 'all' || a === kind;
}
