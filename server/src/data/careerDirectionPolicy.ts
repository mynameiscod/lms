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
  /**
   * SOFTWARE_BACKEND HAS NO DIRECTION-SCOPED UNITS IN YEAR 1, AND THAT IS THE DECISION.
   *
   * The P8A capacity work found zero units scoped to software, and it reads like a gap until you
   * look at what the Foundation curriculum is made of: Programming (40 units), C (10), DSA (11),
   * Databases (12) and Developer Tools (16) are all scoped UNIVERSAL, because they are the
   * foundation everybody needs — and they are also, between them, exactly the software track.
   * Scoping them to a direction would withhold the core of computing from the students who
   * happen to have said "web" or "AI" in week one.
   *
   * So for Year 1: software is served by shared advanced and core units, and zero
   * SOFTWARE_BACKEND-scoped inventory is not a deficit to be filled. Duplicating universal units
   * to manufacture direction inventory is explicitly rejected — it would double the authoring
   * cost, split every future content fix across two copies, and teach nobody anything new.
   *
   * What may change later is PREFERENCE, not scope: direction-aware composition could give a
   * software-leaning student affinity towards the shared core units that serve them most (DSA,
   * databases, C) without those units ceasing to be universal. That is a ranking question and is
   * deliberately left for a later phase.
   *
   * Note for anyone reading an old audit: the capacity profiles named this direction
   * 'SOFTWARE_DEVELOPMENT', which is not a DirectionKey and matched nothing. The finding above
   * holds either way — no unit carries SOFTWARE_BACKEND either — but the profile was also wrong.
   */
  {
    key: 'SOFTWARE_BACKEND',
    name: 'Software & Backend',
    blurb: 'Build the services, APIs and databases behind an application.',
    roleKeys: ['BACKEND_ENGINEER', 'SOFTWARE_ENGINEER', 'FULLSTACK_ENGINEER', 'QA_SDET'],
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
    roleKeys: ['CLOUD_DEVOPS', 'DEVOPS_ENGINEER', 'CLOUD_ENGINEER', 'SRE'],
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

/* ------------------------------------------------------------------ *
 * Shared core — the modules a direction is actually made of
 * ------------------------------------------------------------------ */

/**
 * Which UNIVERSAL modules constitute each direction's core.
 *
 * ── THE PROBLEM THIS SOLVES ───────────────────────────────────────────────────────────────
 *
 * Year 1 deliberately scopes almost nothing to SOFTWARE_BACKEND. Programming, C, DSA,
 * Databases and Developer Tools are UNIVERSAL because they are the foundation everybody needs
 * — and they are also, between them, exactly the backend track. That decision is right and it
 * is frozen: scoping them to a direction would withhold the core of computing from a student
 * who happened to say "web" in week one.
 *
 * But it left a real gap. A software-focused learner's plan allocates fifteen days to
 * DIRECTION_LEARNING, finds zero direction-scoped units, and reallocates that capacity into
 * whatever instruction ranks next — which is not software. The student chose a direction and
 * the plan responded by giving them more of everything else.
 *
 * ── WHY AFFINITY AND NOT DUPLICATION ──────────────────────────────────────────────────────
 *
 * The obvious fix is to clone Programming into SOFTWARE_BACKEND-scoped copies. That would
 * double the maintenance of the most-used module in the curriculum, and the two copies would
 * diverge the first time somebody fixed a typo in one. This instead says: when a plan is
 * choosing between equally-ranked universal units, prefer the ones belonging to the modules
 * this student's direction is built from. One curriculum, ordered differently per learner.
 *
 * ── IT IS SUBORDINATE, BY POSITION ────────────────────────────────────────────────────────
 *
 * Affinity enters the priority tuple BELOW measured state and BELOW mandatory, so it can never
 * re-teach a skill somebody has demonstrated, never push the universal foundation behind
 * optional material, and never satisfy a prerequisite that is not met. It reorders peers; it
 * does not promote anything past a rule.
 *
 * A direction absent from this map simply has no affinity, which is the pre-existing behaviour.
 */
export const DIRECTION_CORE_MODULES: Record<string, string[]> = {
  /** The named five from the Year-1 decision, in the order they are usually met. */
  SOFTWARE_BACKEND: [
    'M03_PROGRAMMING', 'M06_C_PROGRAMMING', 'M07_DSA', 'M08_DATABASES', 'M04_DEVELOPER_TOOLS',
  ],
  WEB_DEVELOPMENT: [
    'M05_WEB_FUNDAMENTALS', 'M03_PROGRAMMING', 'M04_DEVELOPER_TOOLS', 'M08_DATABASES',
  ],
  AI_ML: ['M11_AI_LITERACY', 'M10_MATHS', 'M03_PROGRAMMING'],
  DATA: ['M08_DATABASES', 'M10_MATHS', 'M11_AI_LITERACY', 'M03_PROGRAMMING'],
  CLOUD_DEVOPS: ['M09_LINUX', 'M04_DEVELOPER_TOOLS', 'M03_PROGRAMMING'],
  CYBERSECURITY: ['M09_LINUX', 'M01_CS_FUNDAMENTALS', 'M04_DEVELOPER_TOOLS'],
  MOBILE: ['M03_PROGRAMMING', 'M05_WEB_FUNDAMENTALS', 'M04_DEVELOPER_TOOLS'],
};

/**
 * Does this module belong to the core of the direction this student is heading for?
 *
 * Also true for a direction being SAMPLED, so an exploring student's breadth is drawn from
 * material that actually represents each direction rather than from whatever sorts first.
 */
export function isCoreModuleFor(
  moduleCode: string | undefined,
  primaryDirection: string | null | undefined,
  exploring: string[] = [],
): boolean {
  if (!moduleCode) return false;
  const mod = String(moduleCode).toUpperCase();
  const directions = [primaryDirection, ...exploring].filter(Boolean) as string[];
  return directions.some(d => (DIRECTION_CORE_MODULES[String(d).toUpperCase()] || []).includes(mod));
}
