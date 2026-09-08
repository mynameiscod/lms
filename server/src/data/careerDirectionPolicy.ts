/**
 * Career directions, and how firmly a student holds one.
 *
 * WHY THIS IS NOT A CAREER ROLE. A role — BACKEND_ENGINEER, DATA_ANALYST — is a job someone
 * applies for, and it is what the readiness engine measures against. A direction is broader and
 * softer: the area a student is currently heading in. A first-year who says "web" has not chosen
 * a job title, and asking them to is the wrong question at the wrong time. Several roles sit
 * inside one direction, and the same direction can be held by a student who is certain and by
 * one who is guessing.
 *
 * WHY IT IS NOT ON THE SKILL. A skill means one thing everywhere: JAVA_OOP is JAVA_OOP whether
 * a web student, a backend student or nobody is learning it. Relevance is a property of the
 * RELATIONSHIP between a student and a piece of teaching, not of the capability itself — which
 * is why applicableDirections lives on curriculum topics and content rows, and never on
 * CareerSkill. The existing code already made this call for years, audiences and roles; this
 * follows it rather than inventing a second pattern.
 *
 * NO AI, NO CLOCK, NO RANDOMNESS. Pure data and pure functions, so a student can be told exactly
 * why something was or was not assigned to them.
 */

/** The areas a student can currently be heading in. */
export type DirectionKey =
  | 'WEB_DEVELOPMENT'
  | 'AI_ML'
  | 'SOFTWARE_BACKEND'
  | 'MOBILE'
  | 'CLOUD_DEVOPS'
  | 'CYBERSECURITY'
  | 'DATA';

/**
 * How firmly the student holds it.
 *
 * SELECTED is not a commitment and must never be treated as one. A first-year who picks "AI"
 * in week one is telling us where to point today's teaching, not signing a contract; the whole
 * point of EXPLORING and UNDECIDED existing as first-class states is that neither is a failure
 * to answer, and neither may be silently converted into a guess.
 */
export type DirectionStatus = 'SELECTED' | 'EXPLORING' | 'UNDECIDED';

export interface CareerDirection {
  key: DirectionKey;
  name: string;
  /** One line a student would recognise, for the picker. */
  blurb: string;
  /**
   * Existing CareerRole keys that sit inside this direction.
   *
   * The bridge to the readiness engine: choosing a direction narrows teaching, and if the
   * student later picks a role, that role's blueprint takes over the measurement. Empty is
   * legitimate for a direction whose roles have not been authored yet.
   */
  roleKeys: string[];
  displayOrder: number;
}

export const CAREER_DIRECTIONS: CareerDirection[] = [
  {
    key: 'WEB_DEVELOPMENT',
    name: 'Web Development',
    blurb: 'Build websites and web applications people use in a browser.',
    roleKeys: ['FRONTEND_ENGINEER', 'FULLSTACK_ENGINEER'],
    displayOrder: 10,
  },
  {
    key: 'SOFTWARE_BACKEND',
    name: 'Software & Backend',
    blurb: 'Build the services, APIs and databases behind an application.',
    roleKeys: ['BACKEND_ENGINEER', 'SOFTWARE_ENGINEER', 'FULLSTACK_ENGINEER'],
    displayOrder: 20,
  },
  {
    key: 'AI_ML',
    name: 'AI & Machine Learning',
    blurb: 'Teach machines to find patterns, predict and generate.',
    roleKeys: ['ML_ENGINEER', 'AI_ENGINEER', 'DATA_SCIENTIST'],
    displayOrder: 30,
  },
  {
    key: 'DATA',
    name: 'Data & Analytics',
    blurb: 'Turn raw data into answers people can act on.',
    roleKeys: ['DATA_ANALYST', 'DATA_ENGINEER', 'DATA_SCIENTIST'],
    displayOrder: 40,
  },
  {
    key: 'MOBILE',
    name: 'Mobile Development',
    blurb: 'Build applications that run on phones.',
    roleKeys: ['MOBILE_ENGINEER', 'ANDROID_ENGINEER', 'IOS_ENGINEER'],
    displayOrder: 50,
  },
  {
    key: 'CLOUD_DEVOPS',
    name: 'Cloud & DevOps',
    blurb: 'Run, deploy and scale software reliably.',
    roleKeys: ['DEVOPS_ENGINEER', 'CLOUD_ENGINEER', 'SRE'],
    displayOrder: 60,
  },
  {
    key: 'CYBERSECURITY',
    name: 'Cybersecurity',
    blurb: 'Find weaknesses and defend systems against attack.',
    roleKeys: ['SECURITY_ENGINEER', 'SECURITY_ANALYST'],
    displayOrder: 70,
  },
];

export const DIRECTION_KEYS: DirectionKey[] = CAREER_DIRECTIONS.map(d => d.key);

const BY_KEY = new Map<string, CareerDirection>(CAREER_DIRECTIONS.map(d => [d.key, d]));

export const directionByKey = (key?: string | null): CareerDirection | undefined =>
  key ? BY_KEY.get(String(key).toUpperCase().trim()) : undefined;

export const isDirectionKey = (key?: string | null): key is DirectionKey =>
  !!key && BY_KEY.has(String(key).toUpperCase().trim());

/**
 * The token meaning "this applies to everybody".
 *
 * Stored explicitly rather than represented by an empty array, because the two say different
 * things to whoever is authoring: ALL is a decision that Git belongs in every student's plan;
 * empty is a row nobody has classified yet. They behave the same today — see
 * appliesToDirection — but the distinction is worth keeping while a content bank is being
 * filled in by hand, since only one of them is a to-do.
 */
export const DIRECTION_ALL = 'ALL';

/**
 * Does a piece of teaching apply to the direction this student is currently heading in?
 *
 * EMPTY MEANS EVERYONE. Every existing audience filter in this codebase works that way, and it
 * is the only default that keeps content authored before this feature from silently vanishing
 * out of every student's plan.
 *
 * A STUDENT WITHOUT A DIRECTION IS SHOWN EVERYTHING that is not direction-specific. They are
 * exploring, not disqualified — narrowing a plan for somebody who has not yet chosen would hide
 * exactly the material that helps them choose.
 */
export function appliesToDirection(
  applicableDirections: string[] | undefined | null,
  studentDirection: string | undefined | null,
): boolean {
  const list = (applicableDirections || []).map(d => String(d).toUpperCase().trim()).filter(Boolean);
  if (!list.length) return true;
  if (list.includes(DIRECTION_ALL)) return true;
  if (!studentDirection) return false;
  return list.includes(String(studentDirection).toUpperCase().trim());
}

/**
 * Whether a student in this state should be shown breadth.
 *
 * An UNDECIDED student needs to meet several areas before they can pick one; an EXPLORING
 * student has narrowed to a few but has not committed. Only a SELECTED student gets a plan
 * focused on one direction — and even then the universal foundation is never filtered away.
 */
export const wantsExploration = (status: DirectionStatus): boolean =>
  status === 'UNDECIDED' || status === 'EXPLORING';

/**
 * How many directions a student sampling the field should meet at once.
 *
 * Four is a deliberate ceiling. Exploration that touches everything teaches nothing — a student
 * who spends one day each on seven areas has seven vague impressions and no basis for choosing.
 */
export const MAX_EXPLORATION_DIRECTIONS = 4;

/**
 * Directions to offer a student who has not chosen one.
 *
 * Ordered by the display order rather than by anything about the student, because there is no
 * evidence yet to rank them by — pretending otherwise would be a recommendation dressed up as a
 * fact. Once evidence exists, recommendation belongs in a service that can explain itself.
 */
export function explorationDirections(limit = MAX_EXPLORATION_DIRECTIONS): CareerDirection[] {
  return [...CAREER_DIRECTIONS].sort((a, b) => a.displayOrder - b.displayOrder).slice(0, Math.max(0, limit));
}

/**
 * The direction a role belongs to, when a student has picked a role but never a direction.
 *
 * Returns the FIRST direction listing the role. A role appearing under two directions —
 * FULLSTACK_ENGINEER is deliberately under both web and backend — resolves to the lower
 * displayOrder, which is the more specific of the two by construction.
 */
export function directionForRole(roleKey?: string | null): CareerDirection | undefined {
  if (!roleKey) return undefined;
  const key = String(roleKey).toUpperCase().trim();
  return [...CAREER_DIRECTIONS]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .find(d => d.roleKeys.includes(key));
}
