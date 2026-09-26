/**
 * Which single skill each Year-3 unit's checkpoint questions measure.
 *
 * ── WHY THIS FILE HAS TO EXIST ────────────────────────────────────────────────────────────
 *
 * A checkpoint question produces Skill DNA evidence only where it carries a PRIMARY mapping to
 * one named skill. The content seeder derives that mapping by itself when a topic declares
 * exactly one skill, and refuses to guess when it declares several — correctly, because which
 * skill a question chiefly measures is a judgement rather than a derivation.
 *
 * **Seventy-six of Year 3's hundred topics declare two or more skills.** Year 2 had twenty-one
 * of thirty-three and that was already enough to lose most of the year's evidence; Year 3 is
 * worse, because a specialize topic almost always sits at the join of two things — auth is
 * authentication AND authorization, query performance is optimisation AND indexing, deployment
 * is deployment AND the pipeline. Without the table below the great majority of Year 3's
 * checkpoint questions would be written, bound to quizzes, marked gradeable, and silently
 * invisible to Skill DNA.
 *
 * That is not hypothetical. It has happened in this codebase, the comment in
 * seedPilotUnitContent.ts records what it cost, and every affected unit reported READY while
 * holding nothing.
 *
 * ── WHAT THIS IS, AND WHAT IT IS NOT ──────────────────────────────────────────────────────
 *
 * It is an ATTRIBUTION made by whoever wrote the units, recorded where it can be read and
 * argued with. It is not an inference, and the seeder does not trust it blindly: every value is
 * checked against the topic's own declared skills and refused if it names anything else.
 *
 * A topic's default covers the units that teach its main subject. The overrides are the units
 * that plainly measure one of the topic's other skills — the authorization units inside an auth
 * topic, the indexing unit inside a query-performance topic, the monitoring unit inside a
 * reliability topic. Where a unit could defensibly go either way it takes the default, on the
 * same principle Year 2 used: a consistent attribution a reviewer can correct beats a
 * split-hair one nobody can follow.
 *
 * ── WHY THE DEFAULT IS USUALLY THE FIRST-DECLARED SKILL ───────────────────────────────────
 *
 * Because the stage map lists the skill a topic is chiefly about first, and the units were
 * written against that reading. Where the second skill is what the topic actually spends its
 * lessons on, the default says so rather than following the order — which is why this is a
 * table and not `skillKeys[0]`.
 *
 * Single-skill topics are ABSENT from this file on purpose. The seeder derives those, and
 * listing them here would create a second place for them to drift.
 *
 * TO CORRECT ONE: change it here and re-run the content seed. Existing evidence rows written by
 * the seed for that question are removed before the new mapping is written, so an attribution
 * moves rather than accumulating a second PRIMARY skill beside the first.
 */

/** The skill a topic's units measure unless the unit is listed in OVERRIDES. */
const TOPIC_DEFAULT: Record<string, string> = {
  /* ── Universal: arriving, and the engineering layer ─────────────────────────────────── */
  T3_READINESS: 'PROGRAMMING_FUNDAMENTALS',
  T3_GAP_PLAN: 'TECHNICAL_COMMUNICATION',
  T3_ADV_OOP: 'OOP_CONCEPTS',
  T3_ERROR_DESIGN: 'ERROR_HANDLING_DESIGN',
  T3_COMPLEX_DEBUG: 'DEBUGGING',

  /* ── Universal: algorithms ──────────────────────────────────────────────────────────── */
  T3_CHOOSING_STRUCTURES: 'DSA_COMPLEXITY',
  T3_ALGO_DESIGN: 'ALGORITHM_DESIGN',
  T3_GREEDY_DP: 'DSA_GREEDY',
  T3_GRAPH_ALGORITHMS: 'DSA_GRAPHS',
  T3_TIMED_PRACTICE: 'PROBLEM_SOLVING',

  /* ── Universal: craft ───────────────────────────────────────────────────────────────── */
  T3_REFACTORING: 'REFACTORING',
  T3_CODE_REVIEW_DEPTH: 'CODE_REVIEW',
  T3_TEST_DESIGN: 'AUTOMATED_TESTING',
  T3_RELIABILITY: 'LOGGING_DIAGNOSTICS',

  /* ── Universal: data and interfaces ─────────────────────────────────────────────────── */
  T3_QUERY_PERF: 'QUERY_OPTIMIZATION',
  T3_TRANSACTIONS_INTEGRITY: 'DB_TRANSACTIONS',
  T3_CACHING_NOSQL: 'CACHING',
  T3_API_DESIGN: 'API_DESIGN',
  T3_AUTH: 'AUTHENTICATION',
  T3_API_HARDENING: 'API_DESIGN',

  /* ── Universal: running it, and choosing a direction ────────────────────────────────── */
  T3_DEPLOYMENT: 'DEPLOYMENT',
  T3_DIRECTION_CHOICE: 'TECH_CAREER_AWARENESS',

  /* ── Direction: backend ─────────────────────────────────────────────────────────────── */
  T3_BACKEND_ARCH: 'SOFTWARE_ARCHITECTURE',
  T3_BACKEND_DATA: 'DB_TRANSACTIONS',
  T3_BACKEND_AUTH: 'AUTHENTICATION',
  T3_BACKEND_SCALE: 'CACHING',
  T3_BACKEND_OPS: 'LOGGING_DIAGNOSTICS',
  T3_BACKEND_PROJECT: 'PRODUCTION_ENGINEERING',

  /* ── Direction: frontend ────────────────────────────────────────────────────────────── */
  T3_FRONTEND_COMPONENTS: 'JS_DOM',
  T3_FRONTEND_FORMS: 'HTML_FORMS',
  T3_FRONTEND_QUALITY: 'RESPONSIVE_DESIGN',
  T3_FRONTEND_PROJECT: 'PRODUCTION_ENGINEERING',

  /* ── Direction: data ────────────────────────────────────────────────────────────────── */
  T3_DATA_PIPELINE: 'DATA_PIPELINES',
  T3_DATA_SQL: 'SQL_JOINS',
  T3_DATA_VIZ: 'DATA_VISUALIZATION',
  T3_DATA_PROJECT: 'PRODUCTION_ENGINEERING',

  /* ── Direction: AI and ML ───────────────────────────────────────────────────────────── */
  T3_ML_SUPERVISED: 'AI_ML_CONCEPTS',
  T3_ML_EVALUATION: 'ML_EVALUATION',
  T3_ML_PIPELINES: 'ML_WORKFLOW',
  T3_ML_PROJECT: 'PRODUCTION_ENGINEERING',

  /* ── Direction: cloud and devops ────────────────────────────────────────────────────── */
  T3_CICD_MONITORING: 'CI_CD',
  T3_CLOUD_CONFIG: 'DEPLOYMENT',
  T3_CLOUD_SECURITY: 'AUTHORIZATION',
  T3_CLOUD_PROJECT: 'PRODUCTION_ENGINEERING',

  /* ── Direction: security ────────────────────────────────────────────────────────────── */
  T3_SEC_APPSEC: 'WEB_SECURITY',
  T3_SEC_NETWORK: 'COMPUTER_NETWORKS',
  T3_SEC_TESTING: 'THREAT_MODELING',
  T3_SEC_LIFECYCLE: 'SECURE_CODING',
  T3_SEC_PROJECT: 'PRODUCTION_ENGINEERING',

  /* ── Direction: mobile ──────────────────────────────────────────────────────────────── */
  T3_MOBILE_APP: 'MOBILE_APP_BASICS',
  T3_MOBILE_DATA: 'MOBILE_APP_BASICS',
  T3_MOBILE_API: 'REST_APIS',
  T3_MOBILE_QUALITY: 'AUTOMATED_TESTING',
  T3_MOBILE_PROJECT: 'PRODUCTION_ENGINEERING',

  /* ── Direction: software engineering ────────────────────────────────────────────────── */
  T3_SWE_DESIGN: 'SOFTWARE_ARCHITECTURE',
  T3_SWE_QUALITY: 'AUTOMATED_TESTING',
  T3_SWE_EVOLVING: 'REFACTORING',
  T3_SWE_WORKFLOW: 'CI_CD',
  T3_SWE_DOCS: 'TECHNICAL_WRITING',
  T3_SWE_PROJECT: 'PRODUCTION_ENGINEERING',

  /* ── Direction: full stack ──────────────────────────────────────────────────────────── */
  T3_FS_BOUNDARY: 'API_DESIGN',
  T3_FS_AUTH: 'AUTHENTICATION',
  T3_FS_DATA: 'DB_DESIGN',
  T3_FS_QUALITY: 'AUTOMATED_TESTING',
  T3_FS_DEPLOY: 'DEPLOYMENT',
  T3_FS_PROJECT: 'PRODUCTION_ENGINEERING',

  /* ── Universal: proof, and getting hired ────────────────────────────────────────────── */
  T3_AI_ASSISTED: 'AI_ASSISTED_CODING',
  T3_PROJECT: 'PRODUCTION_ENGINEERING',
  T3_CAPSTONE: 'PRODUCTION_ENGINEERING',
  T3_INTERVIEW_PRACTICE: 'TECHNICAL_INTERVIEW_PREP',
  T3_SYSTEM_DESIGN: 'SYSTEM_DESIGN_BASICS',
  T3_PRESENTING: 'TECHNICAL_EXPLANATION',
  T3_PORTFOLIO: 'PORTFOLIO_EVIDENCE',
  T3_APPLYING: 'INTERNSHIP_READINESS',
  T3_BEHAVIORAL: 'BEHAVIORAL_INTERVIEW',
  T3_VERIFICATION: 'PRODUCTION_ENGINEERING',
};

/**
 * Units that plainly measure one of their topic's OTHER declared skills.
 *
 * Every key is a full unit code (`${topicCode}_${slug}`) and every value must be a skill the
 * unit's topic declares — the seeder refuses anything else rather than writing a mapping the
 * curriculum does not support.
 *
 * The DEBUG, PRACTICE and MINI_PROJECT units that close a topic are deliberately absent: they
 * exercise the topic as a whole, so they take its default.
 */
const OVERRIDES: Record<string, string> = {
  /* Arriving: the diagnostic that checks reasoning rather than syntax. */
  T3_READINESS_DSA_CHECK: 'PROBLEM_SOLVING',
  T3_GAP_PLAN_THE_PLAN: 'TECH_CAREER_AWARENESS',

  /* Error design and debugging: the units about what is left behind, not about failing well. */
  T3_ERROR_DESIGN_LOGGING_THE_FAILURE: 'LOGGING_DIAGNOSTICS',
  T3_COMPLEX_DEBUG_READING_A_STACK_TRACE: 'LOGGING_DIAGNOSTICS',

  /* Algorithms: the two DP units inside a topic that opens on greedy. */
  T3_GREEDY_DP_OVERLAPPING_SUBPROBLEMS: 'DSA_DP',
  T3_GREEDY_DP_RECURRENCE_THEN_TABLE: 'DSA_DP',
  T3_TIMED_PRACTICE_THINKING_ALOUD: 'TECHNICAL_EXPLANATION',

  /* Craft: debt as its own idea, and the review unit that is about the wording. */
  T3_REFACTORING_TECHNICAL_DEBT: 'TECHNICAL_DEBT',
  T3_CODE_REVIEW_DEPTH_WORDING_A_COMMENT: 'TECHNICAL_COMMUNICATION',
  T3_RELIABILITY_KNOWING_IT_IS_UNWELL: 'MONITORING_OBSERVABILITY',

  /* Data: indexing inside query performance, constraints inside transactions, NoSQL inside caching. */
  T3_QUERY_PERF_INDEXES_FOR_A_REASON: 'DB_INDEXING',
  T3_TRANSACTIONS_INTEGRITY_LET_THE_DATABASE_ENFORCE: 'DB_DESIGN',
  T3_CACHING_NOSQL_NOSQL_TRADEOFFS: 'NOSQL_CONCEPTS',

  /* Interfaces: the two authorization units, and the two hardening units that are security. */
  T3_AUTH_AUTHORIZATION: 'AUTHORIZATION',
  T3_AUTH_BROKEN_ACCESS_CONTROL: 'AUTHORIZATION',
  T3_API_HARDENING_VALIDATE_AT_THE_BOUNDARY: 'WEB_SECURITY',
  T3_API_HARDENING_RATE_LIMITING: 'WEB_SECURITY',

  /* Running it: the pipeline unit inside a deployment topic. */
  T3_DEPLOYMENT_A_PIPELINE_NOT_A_PERSON: 'CI_CD',
  T3_DIRECTION_CHOICE_AGAINST_YOUR_EVIDENCE: 'PORTFOLIO_EVIDENCE',

  /* Backend track. */
  T3_BACKEND_DATA_N_PLUS_ONE: 'QUERY_OPTIMIZATION',
  T3_BACKEND_DATA_MEASURING_THE_ENDPOINT: 'QUERY_OPTIMIZATION',
  T3_BACKEND_AUTH_PERMISSION_CHECKS: 'AUTHORIZATION',
  T3_BACKEND_SCALE_MEASURE_BEFORE_AND_AFTER: 'MONITORING_OBSERVABILITY',
  // The only three-skill topic in the year: one unit each, so each names its own.
  T3_BACKEND_OPS_TESTING_AN_API: 'AUTOMATED_TESTING',
  T3_BACKEND_OPS_DOCUMENTING_IT: 'TECHNICAL_WRITING',

  /* Frontend track. */
  T3_FRONTEND_COMPONENTS_PROPS_AND_EVENTS: 'STATE_MANAGEMENT',
  T3_FRONTEND_FORMS_BOTH_SIDES: 'WEB_SECURITY',
  T3_FRONTEND_QUALITY_KEYBOARD_AND_SCREEN_READER: 'WEB_ACCESSIBILITY',

  /* Data track. */
  T3_DATA_PIPELINE_CLEANING_REPEATABLY: 'DATA_WRANGLING',
  T3_DATA_SQL_ANALYTICAL_PERFORMANCE: 'QUERY_OPTIMIZATION',
  T3_DATA_VIZ_WRITING_THE_FINDING: 'TECHNICAL_WRITING',

  /* AI and ML track. */
  T3_ML_SUPERVISED_WHICH_QUESTION: 'ML_WORKFLOW',
  T3_ML_EVALUATION_RESPONSIBLE_USE: 'AI_RESPONSIBLE_USE',

  /* Cloud and devops track. */
  T3_CICD_MONITORING_MONITORING_WHAT_MATTERS: 'MONITORING_OBSERVABILITY',
  T3_CLOUD_CONFIG_SECRETS_IN_INFRASTRUCTURE: 'SECURE_CODING',
  T3_CLOUD_SECURITY_WHAT_IS_EXPOSED: 'SECURE_CODING',

  /* Security track. */
  T3_SEC_APPSEC_BROKEN_ACCESS: 'AUTHORIZATION',
  T3_SEC_NETWORK_WHAT_IS_LISTENING: 'LINUX_ADMINISTRATION',
  T3_SEC_TESTING_TOOLS_AND_THEIR_LIMITS: 'SECURE_CODING',
  T3_SEC_LIFECYCLE_WHEN_SOMETHING_HAPPENS: 'LOGGING_DIAGNOSTICS',

  /* Mobile track. */
  T3_MOBILE_APP_STATE_ON_A_DEVICE: 'STATE_MANAGEMENT',
  T3_MOBILE_DATA_OFFLINE: 'CACHING',
  T3_MOBILE_API_LOGIN_THAT_PERSISTS: 'AUTHENTICATION',
  T3_MOBILE_QUALITY_BATTERY_AND_FRAMES: 'MONITORING_OBSERVABILITY',

  /* Software engineering track. */
  T3_SWE_QUALITY_REVIEWING_WELL: 'CODE_REVIEW',
  T3_SWE_QUALITY_BEING_REVIEWED: 'CODE_REVIEW',
  T3_SWE_EVOLVING_DEBT_ON_PURPOSE: 'TECHNICAL_DEBT',
  T3_SWE_WORKFLOW_BRANCH_AND_REVIEW: 'GIT_BRANCHING',
  T3_SWE_DOCS_WHAT_IT_DOES_AT_3AM: 'LOGGING_DIAGNOSTICS',

  /* Full stack track. */
  T3_FS_BOUNDARY_WHAT_THE_CLIENT_KEEPS: 'STATE_MANAGEMENT',
  T3_FS_AUTH_NEVER_TRUST_THE_CLIENT: 'AUTHORIZATION',
  T3_FS_DATA_WHERE_TO_TRANSFORM: 'DATA_WRANGLING',
  T3_FS_DEPLOY_SHIPPING_THREE_THINGS: 'CONTAINERS_DOCKER',

  /* Proof and getting hired. */
  T3_AI_ASSISTED_REVIEWING_GENERATED_CODE: 'CODE_REVIEW',
  T3_PROJECT_DESIGNING_IT: 'SOFTWARE_ARCHITECTURE',
  T3_CAPSTONE_CAPSTONE_REVIEW: 'TECHNICAL_EXPLANATION',
  T3_PRESENTING_PRESENTING_A_PROJECT: 'COMMUNICATION',
  T3_PORTFOLIO_WRITING_THE_PROJECT_UP: 'TECHNICAL_WRITING',
  T3_APPLYING_READING_A_JOB_DESCRIPTION: 'TECH_CAREER_AWARENESS',
  T3_BEHAVIORAL_THE_FIRST_WEEKS: 'INTERNSHIP_READINESS',
  T3_VERIFICATION_READINESS_REVIEW: 'TECHNICAL_INTERVIEW_PREP',
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
