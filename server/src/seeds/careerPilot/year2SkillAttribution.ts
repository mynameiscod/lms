/**
 * Which single skill each Year-2 unit's checkpoint questions measure.
 *
 * ── WHY THIS FILE HAS TO EXIST ────────────────────────────────────────────────────────────
 *
 * A checkpoint question produces Skill DNA evidence only where it carries a PRIMARY mapping to
 * one named skill. The content seeder derives that mapping by itself when a unit declares
 * exactly one skill, and refuses to guess when it declares several — correctly, because which
 * skill a question chiefly measures is a judgement rather than a derivation.
 *
 * Twenty-one of the thirty-three Year-2 topics declare two or more skills. Without the table
 * below, 348 of the year's 528 checkpoint questions would be written, bound to quizzes, marked
 * gradeable — and silently invisible to Skill DNA. That has happened in this codebase before,
 * and the comment in seedPilotUnitContent.ts records what it cost: a hundred and sixty-one
 * checkpoints that held nothing while every affected unit reported READY.
 *
 * ── WHAT THIS IS, AND WHAT IT IS NOT ──────────────────────────────────────────────────────
 *
 * It is an ATTRIBUTION made by whoever wrote the units, recorded where it can be read and
 * argued with. It is not an inference, and the seeder does not trust it blindly: every value
 * is checked against the unit's own declared skills and refused if it names anything else.
 *
 * A topic's default covers the units that teach its main subject. The overrides are the units
 * that plainly measure one of the topic's other skills — the tree units inside a keyed-structures
 * topic, the networking unit inside a security track, the statistics unit inside a data track.
 * Where a unit could defensibly go either way, it takes the default: a consistent attribution a
 * reviewer can correct beats a split-hair one nobody can follow.
 *
 * TO CORRECT ONE: change it here and re-run the content seed. Existing evidence rows written by
 * the seed for that question are removed before the new mapping is written, so an attribution
 * moves rather than accumulating a second PRIMARY skill beside the first.
 */

/** The skill a topic's units measure unless the unit is listed in OVERRIDES. */
const TOPIC_DEFAULT: Record<string, string> = {
  T2_BRIDGE: 'PROGRAMMING_FUNDAMENTALS',
  T2_OOP_OBJECTS: 'PYTHON_OOP',
  T2_DS_LINEAR: 'DSA_ARRAYS',
  T2_DS_KEYED: 'DSA_HASHING',
  T2_ALGORITHMS: 'DSA_SEARCHING',
  T2_DSA_INTERVIEW: 'TECHNICAL_INTERVIEW_PREP',
  T2_PY_ROBUST: 'PYTHON_ERROR_HANDLING',
  T2_CLEAN_CODE: 'CLEAN_CODE',
  T2_LINUX: 'SHELL_PIPELINES',
  T2_DB_QUERY: 'SQL_FILTERING',
  T2_DB_DESIGN: 'DB_DESIGN',
  T2_WEB_HTTP: 'HTTP',
  T2_APIS: 'API_FUNDAMENTALS',
  T2_AI_ASSISTED: 'AI_ASSISTED_CODING',
  T2_TRACK_BACKEND: 'SERVER_SIDE_BASICS',
  T2_TRACK_FRONTEND: 'JS_DOM',
  T2_TRACK_DATA: 'DATA_WRANGLING',
  T2_TRACK_CLOUD: 'DEVOPS_FUNDAMENTALS',
  T2_TRACK_SECURITY: 'SECURITY_FUNDAMENTALS',
  T2_PROJECTS: 'PROBLEM_SOLVING',
  T2_COMMUNICATION: 'TECHNICAL_COMMUNICATION',
};

/**
 * Units that measure one of their topic's other declared skills.
 *
 * Keyed by full unit code, so a reader can find one without knowing which topic it sits in.
 */
const OVERRIDES: Record<string, string> = {
  /* Readiness: one check is about taking a problem apart, not about language syntax. */
  T2_BRIDGE_PROBLEM_SOLVING_CHECK: 'PROBLEM_SOLVING',
  T2_BRIDGE_READINESS_REVIEW: 'PROBLEM_SOLVING',

  /* Objects: the two conceptual units, against the Python-mechanics ones. */
  T2_OOP_OBJECTS_WHY_OBJECTS: 'OOP_CONCEPTS',
  T2_OOP_OBJECTS_ENCAPSULATION: 'OOP_CONCEPTS',

  /* Linear structures map one-to-one onto their skills. */
  T2_DS_LINEAR_STRINGS: 'DSA_STRINGS',
  T2_DS_LINEAR_STACKS: 'DSA_STACK',
  T2_DS_LINEAR_QUEUES: 'DSA_QUEUE',
  T2_DS_LINEAR_LINKED_LISTS: 'DSA_LINKED_LIST',

  /* Keyed structures: hashing by default, trees where the unit is about trees. */
  T2_DS_KEYED_TREES: 'DSA_TREES',
  T2_DS_KEYED_BINARY_SEARCH_TREES: 'DSA_TREES',

  /* Algorithms: searching is the default; the rest name themselves. */
  T2_ALGORITHMS_ALGORITHMIC_THINKING: 'DSA_COMPLEXITY',
  T2_ALGORITHMS_SIMPLE_SORTS: 'DSA_SORTING',
  T2_ALGORITHMS_DIVIDE_AND_CONQUER: 'DSA_RECURSION',
  T2_ALGORITHMS_RECURSION: 'DSA_RECURSION',
  T2_ALGORITHMS_BIG_O: 'DSA_COMPLEXITY',
  T2_ALGORITHMS_MINI_PROJECT: 'DSA_SORTING',

  /* Interview topic: the four pattern units are pattern recognition, not interview technique. */
  T2_DSA_INTERVIEW_OPTIMISING: 'DSA_COMPLEXITY',
  T2_DSA_INTERVIEW_ARRAY_PATTERNS: 'PATTERN_RECOGNITION',
  T2_DSA_INTERVIEW_MAP_PATTERNS: 'PATTERN_RECOGNITION',
  T2_DSA_INTERVIEW_STACK_QUEUE_PATTERNS: 'PATTERN_RECOGNITION',
  T2_DSA_INTERVIEW_RECURSION_PATTERNS: 'PATTERN_RECOGNITION',

  /* Robust Python: the three units about working with data rather than with failure. */
  T2_PY_ROBUST_JSON: 'PYTHON_COLLECTIONS',
  T2_PY_ROBUST_COMPREHENSIONS: 'PYTHON_COLLECTIONS',
  T2_PY_ROBUST_ITERATORS: 'PYTHON_COLLECTIONS',

  /* Clean code: one unit is literally about reviewing. */
  T2_CLEAN_CODE_CODE_REVIEW: 'CODE_REVIEW',

  /* Linux: the machine-state units, against the command-composition ones. */
  T2_LINUX_PERMISSIONS: 'OS_PROCESSES',
  T2_LINUX_PROCESSES: 'OS_PROCESSES',
  T2_LINUX_ENV_VARS: 'OS_PROCESSES',
  T2_LINUX_DEBUGGING: 'OS_PROCESSES',

  /* Querying: the two units that span tables. */
  T2_DB_QUERY_JOINS: 'SQL_JOINS',
  T2_DB_QUERY_SUBQUERIES: 'SQL_JOINS',

  /* Design: normalisation and transactions are their own skills. */
  T2_DB_DESIGN_NORMALISATION: 'DB_NORMALIZATION',
  T2_DB_DESIGN_TRANSACTIONS: 'DB_TRANSACTIONS',

  /* HTTP: the two units below the protocol are about the network. */
  T2_WEB_HTTP_INTERNET: 'COMPUTER_NETWORKS',
  T2_WEB_HTTP_DNS_URLS: 'COMPUTER_NETWORKS',

  /* APIs: one unit is about REST specifically; the rest are general API practice. */
  T2_APIS_REST: 'REST_APIS',

  /* AI: the three units about judgement rather than technique. */
  T2_AI_ASSISTED_HALLUCINATIONS: 'AI_RESPONSIBLE_USE',
  T2_AI_ASSISTED_AI_SECURITY: 'AI_RESPONSIBLE_USE',
  T2_AI_ASSISTED_KEEPING_FUNDAMENTALS: 'AI_RESPONSIBLE_USE',

  /* Backend track: the units about the HTTP surface, against the server-internals ones. */
  T2_TRACK_BACKEND_ROUTING: 'REST_APIS',
  T2_TRACK_BACKEND_CRUD_API: 'REST_APIS',
  T2_TRACK_BACKEND_API_TESTING: 'REST_APIS',
  T2_TRACK_BACKEND_DOCUMENTATION: 'REST_APIS',

  /* Frontend track: DOM by default, language units and asynchronous units named. */
  T2_TRACK_FRONTEND_ARRAYS_OBJECTS: 'JS_BASICS',
  T2_TRACK_FRONTEND_STATE: 'JS_BASICS',
  T2_TRACK_FRONTEND_COMPONENTS: 'JS_BASICS',
  T2_TRACK_FRONTEND_ASYNC: 'JS_ASYNC',
  T2_TRACK_FRONTEND_FETCHING: 'JS_ASYNC',
  T2_TRACK_FRONTEND_MINI_PROJECT: 'JS_ASYNC',

  /* Data track: one unit is statistics. */
  T2_TRACK_DATA_DESCRIPTIVE_STATS: 'PROBABILITY_STATISTICS',

  /* Cloud track: what you are renting, against what you do with it. */
  T2_TRACK_CLOUD_WHAT_CLOUD_IS: 'CLOUD_FUNDAMENTALS',
  T2_TRACK_CLOUD_SERVERS: 'CLOUD_FUNDAMENTALS',

  /* Security track: one unit is about the network itself. */
  T2_TRACK_SECURITY_NETWORK_SECURITY: 'COMPUTER_NETWORKS',

  /* Projects: the building units, against the deciding-and-scoping ones. */
  T2_PROJECTS_GUIDED_BUILD: 'CLEAN_CODE',
  T2_PROJECTS_EXTENDING: 'CLEAN_CODE',
  T2_PROJECTS_TEAM_PROJECT: 'CLEAN_CODE',

  /* Communication: explaining to a person, against writing and asking. */
  T2_COMMUNICATION_EXPLAINING: 'TECHNICAL_EXPLANATION',
  T2_COMMUNICATION_DESIGN_DECISIONS: 'TECHNICAL_EXPLANATION',
  T2_COMMUNICATION_PRESENTING: 'TECHNICAL_EXPLANATION',
};

/**
 * The skill this unit's checkpoint questions should be attributed to, or '' when the unit needs
 * no attribution because its topic declares a single skill and the seeder can derive it.
 */
export function primarySkillFor(unitCode: string, topicCode: string): string {
  return OVERRIDES[unitCode] || TOPIC_DEFAULT[topicCode] || '';
}

/** Exposed for the test that checks every attribution names a skill its topic declares. */
export const ATTRIBUTION_TABLES = { TOPIC_DEFAULT, OVERRIDES };
