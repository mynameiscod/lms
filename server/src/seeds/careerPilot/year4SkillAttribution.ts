/**
 * Which single skill each Year-4 unit's checkpoint questions measure.
 *
 * ── WHY THIS FILE HAS TO EXIST ────────────────────────────────────────────────────────────
 *
 * A checkpoint question produces Skill DNA evidence only where it carries a PRIMARY mapping to
 * one named skill. The content seeder derives that mapping by itself when a topic declares
 * exactly one skill, and refuses to guess when it declares several — correctly, because which
 * skill a question chiefly measures is a judgement rather than a derivation.
 *
 * **Eighty-nine of Year 4's ninety-six topics declare two or more skills.** Year 2 had
 * twenty-one of thirty-three and that was already enough to lose most of the year's evidence;
 * Year 3 had seventy-six of a hundred. Year 4 is the worst of the four and for a reason worth
 * stating: almost every topic here is an ACT rather than a subject — an interview round, a mock,
 * a drill, a simulation — and an act draws on several skills at once by its nature.
 *
 * Without the table below the great majority of Year 4's checkpoint questions would be written,
 * bound to quizzes, marked gradeable, and silently invisible to Skill DNA. That is not
 * hypothetical: it has happened in this codebase, and every affected unit reported READY while
 * holding nothing.
 *
 * ── WHAT THIS IS, AND WHAT IT IS NOT ──────────────────────────────────────────────────────
 *
 * It is an ATTRIBUTION made by whoever wrote the units, recorded where it can be read and
 * argued with. It is not an inference, and the seeder does not trust it blindly: every value is
 * checked against the topic's own declared skills and refused if it names anything else.
 *
 * A topic's default covers the units that teach its main subject. The overrides are the units
 * that plainly measure one of the topic's other skills. Where a unit could defensibly go either
 * way it takes the default, on the principle Years 2 and 3 used: a consistent attribution a
 * reviewer can correct beats a split-hair one nobody can follow.
 *
 * ── THE ONE JUDGEMENT WORTH ARGUING WITH ──────────────────────────────────────────────────
 *
 * The mock series, the simulation and the interview topics default to INTERVIEW_PERFORMANCE and
 * TECHNICAL_INTERVIEW_PREP rather than to the technical skill the round happens to cover.
 *
 * A DSA mock asks DSA questions, so DSA_COMPLEXITY looks like the honest attribution. It is not.
 * The student's DSA is already measured — by P15's drills, by the golden bank, by three previous
 * years — and what a mock adds is the only evidence anywhere in the product about whether they
 * can do it while somebody watches. Attributing the mock to DSA would fold that signal into a
 * number that already exists and lose the thing the mock was for.
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
  /* ── P01 · Standing and plan ────────────────────────────────────────────────────────── */
  T4_STANDING: 'PROGRAMMING_FUNDAMENTALS',
  T4_PLACEMENT_PLAN: 'PLACEMENT_READINESS',

  /* ── P02 · The ten-day bridge ───────────────────────────────────────────────────────── */
  T4_BR_PROGRAMMING: 'PROGRAMMING_FUNDAMENTALS',
  T4_BR_CONTROL_FLOW: 'CONDITIONALS_BASICS',
  T4_BR_FUNCTIONS: 'FUNCTIONS_BASICS',
  T4_BR_COLLECTIONS: 'PYTHON_COLLECTIONS',
  T4_BR_OOP: 'OOP_CONCEPTS',
  T4_BR_DSA: 'DSA_COMPLEXITY',
  T4_BR_DATABASE: 'SQL_BASICS',
  T4_BR_WEB_API: 'HTTP',
  T4_BR_ENGINEERING: 'GIT_FUNDAMENTALS',
  T4_BR_INTEGRATION: 'PROBLEM_SOLVING',

  /* ── P03 · The engineering build ────────────────────────────────────────────────────── */
  T4_CLEAN_CODE: 'CLEAN_CODE',
  T4_OOP_DESIGN: 'OOP_CONCEPTS',
  T4_DSA_DEPTH: 'DSA_COMPLEXITY',
  T4_TESTING_DEPTH: 'AUTOMATED_TESTING',
  T4_DEBUG_DEPTH: 'DEBUGGING',
  T4_DB_ENGINEERING: 'DB_INDEXING',
  T4_API_ENGINEERING: 'API_DESIGN',
  T4_LINUX_CLOUD: 'LINUX_ADMINISTRATION',
  T4_SECURITY_ENGINEERING: 'SECURE_CODING',
  T4_BUILD_INTEGRATION: 'PRODUCTION_ENGINEERING',

  /* ── P04 · Direction ────────────────────────────────────────────────────────────────── */
  T4_DIRECTION_ASSESSMENT: 'TECH_CAREER_AWARENESS',

  /* ── P05–P13 · The nine specialization tracks ───────────────────────────────────────── */
  T4_SE_DEPTH: 'SOFTWARE_ARCHITECTURE',
  T4_SE_BUILD: 'REFACTORING',
  T4_SE_QUALITY: 'AUTOMATED_TESTING',
  T4_SE_PROOF: 'SOFTWARE_ARCHITECTURE',

  T4_BACKEND_DEPTH: 'API_DESIGN',
  T4_BACKEND_BUILD: 'REST_APIS',
  T4_BACKEND_QUALITY: 'QUERY_OPTIMIZATION',
  T4_BACKEND_PROOF: 'API_DESIGN',

  T4_FRONTEND_DEPTH: 'STATE_MANAGEMENT',
  T4_FRONTEND_BUILD: 'RESPONSIVE_DESIGN',
  T4_FRONTEND_QUALITY: 'WEB_ACCESSIBILITY',
  T4_FRONTEND_PROOF: 'STATE_MANAGEMENT',

  T4_FULLSTACK_DEPTH: 'SOFTWARE_ARCHITECTURE',
  T4_FULLSTACK_BUILD: 'REST_APIS',
  T4_FULLSTACK_QUALITY: 'AUTOMATED_TESTING',
  T4_FULLSTACK_PROOF: 'SOFTWARE_ARCHITECTURE',

  T4_DATA_DEPTH: 'DATA_WRANGLING',
  T4_DATA_BUILD: 'SQL_JOINS',
  T4_DATA_QUALITY: 'QUERY_OPTIMIZATION',
  T4_DATA_PROOF: 'DATA_VISUALIZATION',

  T4_AIML_DEPTH: 'ML_WORKFLOW',
  T4_AIML_BUILD: 'ML_WORKFLOW',
  T4_AIML_QUALITY: 'ML_EVALUATION',
  T4_AIML_PROOF: 'ML_EVALUATION',

  T4_CLOUD_DEPTH: 'CLOUD_FUNDAMENTALS',
  T4_CLOUD_BUILD: 'CONTAINERS_DOCKER',
  T4_CLOUD_QUALITY: 'MONITORING_OBSERVABILITY',
  T4_CLOUD_PROOF: 'DEVOPS_FUNDAMENTALS',

  T4_SECURITY_DEPTH: 'THREAT_MODELING',
  T4_SECURITY_BUILD: 'SECURE_CODING',
  T4_SECURITY_QUALITY: 'WEB_SECURITY',
  T4_SECURITY_PROOF: 'THREAT_MODELING',

  T4_MOBILE_DEPTH: 'MOBILE_APP_BASICS',
  T4_MOBILE_BUILD: 'MOBILE_APP_BASICS',
  T4_MOBILE_QUALITY: 'DEBUGGING',
  T4_MOBILE_PROOF: 'MOBILE_APP_BASICS',

  /* ── P14 · Production engineering ───────────────────────────────────────────────────── */
  T4_PROD_SPEC: 'TECHNICAL_WRITING',
  T4_PROD_BUILD: 'PRODUCTION_ENGINEERING',
  T4_PROD_OPERATE: 'DEPLOYMENT',
  T4_PROD_REVIEW: 'CODE_REVIEW',

  /* ── P15 · Placement coding ─────────────────────────────────────────────────────────── */
  T4_PL_CODING_SETS: 'DSA_ARRAYS',
  T4_PL_DSA_PATTERNS: 'DSA_SEARCHING',
  T4_PL_DSA_STRUCTURES: 'DSA_STACK',
  T4_PL_DSA_ADVANCED: 'DSA_GRAPHS',

  /* ── P16 · Aptitude ─────────────────────────────────────────────────────────────────── */
  T4_AP_QUANT: 'APTITUDE_QUANT_ARITHMETIC',
  T4_AP_REASONING: 'APTITUDE_REASONING_SERIES',
  T4_AP_VERBAL: 'APTITUDE_VERBAL_GRAMMAR',

  /* ── P17 · Technical MCQ ────────────────────────────────────────────────────────────── */
  T4_MCQ_PROGRAMMING: 'PROGRAMMING_FUNDAMENTALS',
  T4_MCQ_CORE_CS: 'OPERATING_SYSTEMS',
  T4_MCQ_ENGINEERING: 'GIT_FUNDAMENTALS',

  /* ── P18–P19 · Interviews. See the header for why these are not the technical skill. ── */
  T4_IV_FUNDAMENTALS: 'TECHNICAL_INTERVIEW_PREP',
  T4_IV_DSA: 'TECHNICAL_INTERVIEW_PREP',
  T4_IV_CORE_CS: 'TECHNICAL_INTERVIEW_PREP',
  T4_IV_PROJECT: 'TECHNICAL_EXPLANATION',
  T4_SD_FUNDAMENTALS: 'SYSTEM_DESIGN_BASICS',
  T4_SD_INTERVIEW: 'SYSTEM_DESIGN_BASICS',

  /* ── P20 · HR and communication ─────────────────────────────────────────────────────── */
  T4_HR_QUESTIONS: 'BEHAVIORAL_INTERVIEW',
  T4_COMM_PRESENT: 'TECHNICAL_COMMUNICATION',
  T4_COMM_WRITTEN: 'WRITTEN_COMMUNICATION_BASICS',

  /* ── P21 · Evidence ─────────────────────────────────────────────────────────────────── */
  T4_RESUME: 'INTERNSHIP_READINESS',

  /* ── P22–P24 · Mocks, simulation, verification ──────────────────────────────────────── */
  T4_MOCK_SPECIALIZATION: 'INTERVIEW_PERFORMANCE',
  T4_MOCK_HR: 'INTERVIEW_PERFORMANCE',
  T4_SIM_ROUNDS: 'PLACEMENT_READINESS',
  T4_SIM_DEBRIEF: 'PLACEMENT_READINESS',
  T4_VERIFY_GAPS: 'SELF_LEARNING',
  T4_CAPSTONE: 'PRODUCTION_ENGINEERING',
};

/**
 * Units that plainly measure one of their topic's OTHER declared skills.
 *
 * Mostly the bridge and the engineering build, where a topic deliberately covers two or three
 * adjacent fundamentals in sequence and each lesson is squarely one of them — the joins lesson
 * inside a SQL topic, the loops lesson inside a control-flow topic. Attributing all of those to
 * the topic default would make the bridge's whole purpose invisible: a student repaired on loops
 * would show evidence on conditionals.
 */
const OVERRIDES: Record<string, string> = {
  /* ── P02 · the bridge teaches two or three fundamentals per topic, one per lesson ───── */
  T4_BR_PROGRAMMING_INPUT_TO_ANSWER: 'INPUT_OUTPUT_BASICS',
  T4_BR_CONTROL_FLOW_LOOPS_AND_STOPPING: 'LOOPS_BASICS',
  T4_BR_CONTROL_FLOW_PRACTICE: 'LOOPS_BASICS',
  T4_BR_FUNCTIONS_SCOPE: 'PYTHON_FUNCTIONS',
  T4_BR_COLLECTIONS_LISTS_AND_STRINGS: 'PYTHON_STRINGS',
  T4_BR_OOP_CLASSES_AND_OBJECTS: 'PYTHON_OOP',
  T4_BR_DSA_SEARCH_AND_SORT: 'DSA_SORTING',
  T4_BR_DSA_PRACTICE: 'DSA_ARRAYS',
  T4_BR_DSA_DEBUGGING: 'DSA_SEARCHING',
  T4_BR_DATABASE_JOINS: 'SQL_JOINS',
  T4_BR_DATABASE_DEBUGGING: 'DB_FUNDAMENTALS',
  T4_BR_WEB_API_REST_AND_JSON: 'REST_APIS',
  T4_BR_WEB_API_PRACTICE: 'API_FUNDAMENTALS',
  T4_BR_ENGINEERING_GIT_AND_BRANCHES: 'GIT_BRANCHING',
  T4_BR_ENGINEERING_TESTS_AND_SHELL: 'TESTING_FUNDAMENTALS',
  T4_BR_ENGINEERING_DEBUGGING: 'SHELL_COMMANDS',
  T4_BR_INTEGRATION_DEBUGGING_IT: 'DEBUGGING',

  /* ── P03 · the engineering build, same shape at greater depth ──────────────────────── */
  T4_CLEAN_CODE_WHEN_TO_REFACTOR: 'TECHNICAL_DEBT',
  T4_CLEAN_CODE_PRACTICE: 'REFACTORING',
  T4_OOP_DESIGN_ABSTRACTION_THAT_EARNS_IT: 'SOFTWARE_ARCHITECTURE',
  T4_OOP_DESIGN_PATTERNS_WORTH_NAMING: 'DESIGN_PATTERNS',
  T4_OOP_DESIGN_INTERVIEW_QUESTION: 'DESIGN_PATTERNS',
  T4_DSA_DEPTH_HASHING_AND_TREES: 'DSA_HASHING',
  T4_DSA_DEPTH_DESIGNING_THE_ALGORITHM: 'ALGORITHM_DESIGN',
  T4_DSA_DEPTH_MINI_PROJECT: 'DSA_TREES',
  T4_TESTING_DEPTH_WHAT_IS_WORTH_TESTING: 'TESTING_FUNDAMENTALS',
  T4_DEBUG_DEPTH_LOGGING_THAT_HELPS: 'LOGGING_DIAGNOSTICS',
  T4_DB_ENGINEERING_TRANSACTIONS: 'DB_TRANSACTIONS',
  T4_DB_ENGINEERING_QUERY_PLANS: 'QUERY_OPTIMIZATION',
  T4_DB_ENGINEERING_MINI_PROJECT: 'DB_DESIGN',
  T4_API_ENGINEERING_AUTHN_VERSUS_AUTHZ: 'AUTHORIZATION',
  T4_API_ENGINEERING_HOSTILE_CALLERS: 'AUTHENTICATION',
  T4_API_ENGINEERING_MINI_PROJECT: 'REST_APIS',
  T4_LINUX_CLOUD_CONTAINERS: 'CONTAINERS_DOCKER',
  T4_LINUX_CLOUD_DEPLOYING: 'DEPLOYMENT',
  T4_LINUX_CLOUD_MINI_PROJECT: 'CLOUD_FUNDAMENTALS',
  T4_SECURITY_ENGINEERING_ACCESS_CONTROL: 'WEB_SECURITY',
  T4_SECURITY_ENGINEERING_INTERVIEW_QUESTION: 'THREAT_MODELING',

  /* ── P04 · the direction day ends by committing, which is placement work ───────────── */
  T4_DIRECTION_ASSESSMENT_CHECKPOINT: 'PLACEMENT_READINESS',

  /* ── P05–P13 · tracks: the second and third lessons of a BUILD topic ───────────────── */
  T4_SE_BUILD_MANAGING_DEPENDENCIES: 'DEPENDENCY_MANAGEMENT',
  T4_SE_QUALITY_HARDER_FAULT: 'DEBUGGING',
  T4_SE_QUALITY_PRACTICE: 'CODE_REVIEW',
  T4_SE_PROOF_SPECIALIZATION_INTERVIEW: 'TECHNICAL_EXPLANATION',

  T4_BACKEND_DEPTH_SERVICE_ARCHITECTURE: 'SERVER_SIDE_BASICS',
  T4_BACKEND_BUILD_AUTH_IN_PRACTICE: 'AUTHENTICATION',
  T4_BACKEND_BUILD_TRANSACTIONS_AND_CONSISTENCY: 'DB_TRANSACTIONS',
  T4_BACKEND_QUALITY_CACHING_AND_ITS_COSTS: 'CACHING',
  T4_BACKEND_PROOF_SPECIALIZATION_INTERVIEW: 'TECHNICAL_EXPLANATION',

  T4_FRONTEND_DEPTH_THE_BROWSER_UNDERNEATH: 'BROWSER_FUNDAMENTALS',
  T4_FRONTEND_BUILD_ASYNC_IN_AN_INTERFACE: 'JS_ASYNC',
  T4_FRONTEND_BUILD_DEBUGGING: 'JS_DOM',
  T4_FRONTEND_QUALITY_HARDER_FAULT: 'DEBUGGING',
  T4_FRONTEND_PROOF_SPECIALIZATION_INTERVIEW: 'TECHNICAL_EXPLANATION',

  T4_FULLSTACK_DEPTH_DRAWING_THE_LINE: 'API_DESIGN',
  T4_FULLSTACK_BUILD_CONTRACTS_BETWEEN_HALVES: 'AUTHENTICATION',
  T4_FULLSTACK_QUALITY_TESTING_AND_SECURING_BOTH_HALVES: 'WEB_SECURITY',
  T4_FULLSTACK_QUALITY_HARDER_FAULT: 'DEBUGGING',
  T4_FULLSTACK_PROOF_SPECIALIZATION_INTERVIEW: 'TECHNICAL_EXPLANATION',

  T4_DATA_DEPTH_SHAPE_BEFORE_ANALYSIS: 'PROBABILITY_STATISTICS',
  T4_DATA_DEPTH_INTERVIEW_QUESTION: 'DBMS_CONCEPTS',
  T4_DATA_BUILD_FROM_RAW_TO_USABLE: 'DATA_PIPELINES',
  T4_DATA_BUILD_A_FIGURE_THAT_ARGUES: 'DATA_VISUALIZATION',
  T4_DATA_QUALITY_HARDER_FAULT: 'DATA_WRANGLING',
  T4_DATA_PROOF_SPECIALIZATION_INTERVIEW: 'TECHNICAL_EXPLANATION',

  T4_AIML_DEPTH_FRAMING_AND_BASELINE: 'AI_ML_CONCEPTS',
  T4_AIML_DEPTH_WHAT_THE_MODEL_LEARNS_FROM: 'FEATURE_ENGINEERING',
  T4_AIML_BUILD_USING_A_MODEL_YOU_DID_NOT_TRAIN: 'GENERATIVE_AI_LLM',
  T4_AIML_BUILD_DEBUGGING: 'DATA_WRANGLING',
  T4_AIML_QUALITY_EVALUATION_AND_HARM: 'AI_RESPONSIBLE_USE',
  T4_AIML_QUALITY_HARDER_FAULT: 'DEBUGGING',
  T4_AIML_PROOF_SPECIALIZATION_INTERVIEW: 'TECHNICAL_EXPLANATION',

  T4_CLOUD_DEPTH_COMMIT_TO_RUNNING: 'DEVOPS_FUNDAMENTALS',
  T4_CLOUD_DEPTH_INTERVIEW_QUESTION: 'LINUX_ADMINISTRATION',
  T4_CLOUD_BUILD_A_PIPELINE_THAT_CAN_FAIL: 'CI_CD',
  T4_CLOUD_BUILD_MINI_PROJECT: 'DEPLOYMENT',
  T4_CLOUD_QUALITY_HARDER_FAULT: 'LOGGING_DIAGNOSTICS',
  T4_CLOUD_QUALITY_PRACTICE: 'SECURE_CODING',
  T4_CLOUD_PROOF_SPECIALIZATION_INTERVIEW: 'TECHNICAL_EXPLANATION',

  T4_SECURITY_DEPTH_CLASSES_NOT_CASES: 'WEB_SECURITY',
  T4_SECURITY_DEPTH_INTERVIEW_QUESTION: 'SECURITY_FUNDAMENTALS',
  T4_SECURITY_BUILD_IDENTITY_DONE_RIGHT: 'AUTHENTICATION',
  T4_SECURITY_BUILD_DEBUGGING: 'AUTHORIZATION',
  T4_SECURITY_QUALITY_REVIEWING_FOR_A_CLASS: 'CODE_REVIEW',
  T4_SECURITY_QUALITY_PRACTICE: 'LOGGING_DIAGNOSTICS',
  T4_SECURITY_PROOF_SPECIALIZATION_INTERVIEW: 'TECHNICAL_EXPLANATION',

  T4_MOBILE_DEPTH_THE_LIFECYCLE: 'SOFTWARE_ARCHITECTURE',
  T4_MOBILE_DEPTH_STATE_ON_A_DEVICE: 'STATE_MANAGEMENT',
  T4_MOBILE_BUILD_WORKING_OFFLINE: 'JS_ASYNC',
  T4_MOBILE_BUILD_MINI_PROJECT: 'REST_APIS',
  T4_MOBILE_QUALITY_PRACTICE: 'AUTOMATED_TESTING',
  T4_MOBILE_QUALITY_BATTERY_STORAGE_AND_TRUST: 'SECURE_CODING',
  T4_MOBILE_PROOF_SPECIALIZATION_INTERVIEW: 'TECHNICAL_EXPLANATION',

  /* ── P14 · production ──────────────────────────────────────────────────────────────── */
  T4_PROD_SPEC_THE_ARCHITECTURE: 'SOFTWARE_ARCHITECTURE',
  T4_PROD_BUILD_FAILURES_ON_PURPOSE: 'ERROR_HANDLING_DESIGN',
  T4_PROD_BUILD_DEBUGGING: 'ERROR_HANDLING_DESIGN',
  T4_PROD_OPERATE_LOGS_AND_METRICS: 'MONITORING_OBSERVABILITY',
  T4_PROD_OPERATE_DEBUGGING: 'LOGGING_DIAGNOSTICS',
  T4_PROD_REVIEW_PRACTICE: 'TECHNICAL_EXPLANATION',
  T4_PROD_REVIEW_INTERVIEW_QUESTION: 'TECHNICAL_EXPLANATION',

  /* ── P15 · placement coding ────────────────────────────────────────────────────────── */
  T4_PL_CODING_SETS_ARRAY_AND_STRING_PATTERNS: 'DSA_STRINGS',
  T4_PL_CODING_SETS_HASHING_FOR_SPEED: 'DSA_HASHING',
  T4_PL_DSA_PATTERNS_TWO_POINTERS: 'DSA_SORTING',
  T4_PL_DSA_PATTERNS_SLIDING_WINDOW: 'DSA_RECURSION',
  T4_PL_DSA_STRUCTURES_LINKED_LISTS: 'DSA_LINKED_LIST',
  T4_PL_DSA_STRUCTURES_TREES_AND_TRAVERSALS: 'DSA_TREES',
  T4_PL_DSA_STRUCTURES_INTERVIEW_QUESTION: 'DSA_QUEUE',
  T4_PL_DSA_ADVANCED_GREEDY: 'DSA_GREEDY',
  T4_PL_DSA_ADVANCED_BASIC_DP: 'DSA_DP',
  T4_PL_DSA_ADVANCED_CHECKPOINT: 'DSA_DP',

  /* ── P16 · aptitude ────────────────────────────────────────────────────────────────── */
  T4_AP_QUANT_TIME_WORK_AND_SPEED: 'APTITUDE_QUANT_TIME',
  T4_AP_QUANT_TIMED_SET: 'APTITUDE_QUANT_TIME',
  T4_AP_REASONING_CODING_DECODING: 'APTITUDE_REASONING_LOGIC',
  T4_AP_REASONING_ARRANGEMENTS_AND_SYLLOGISMS: 'APTITUDE_REASONING_LOGIC',
  T4_AP_REASONING_TIMED_SET: 'APTITUDE_REASONING_LOGIC',
  T4_AP_VERBAL_COMPREHENSION: 'APTITUDE_VERBAL_READING',
  T4_AP_VERBAL_TIMED_SET: 'APTITUDE_VERBAL_READING',

  /* ── P17 · technical MCQ ───────────────────────────────────────────────────────────── */
  T4_MCQ_PROGRAMMING_OOP_MCQS: 'OOP_CONCEPTS',
  T4_MCQ_CORE_CS_NETWORKING_QUESTIONS: 'COMPUTER_NETWORKS',
  T4_MCQ_CORE_CS_DBMS_QUESTIONS: 'DBMS_CONCEPTS',
  T4_MCQ_CORE_CS_TIMED_SET: 'COMPUTER_NETWORKS',
  T4_MCQ_ENGINEERING_GIT_AND_TESTING_MCQS: 'TESTING_FUNDAMENTALS',
  T4_MCQ_ENGINEERING_SQL_AND_SECURITY_MCQS: 'SECURITY_FUNDAMENTALS',
  T4_MCQ_ENGINEERING_TIMED_SET: 'SQL_BASICS',

  /* ── P18–P19 · interviews ──────────────────────────────────────────────────────────── */
  T4_IV_FUNDAMENTALS_SQL_QUESTIONS: 'SQL_BASICS',
  T4_IV_FUNDAMENTALS_GIT_QUESTIONS: 'GIT_FUNDAMENTALS',
  T4_IV_DSA_THE_CODING_ROUND: 'DSA_COMPLEXITY',
  T4_IV_CORE_CS_EXPLAINING_A_PROCESS: 'OPERATING_SYSTEMS',
  T4_IV_CORE_CS_EXPLAINING_A_PACKET: 'COMPUTER_NETWORKS',
  T4_IV_CORE_CS_EXPLAINING_A_TRANSACTION: 'DBMS_CONCEPTS',
  T4_IV_PROJECT_TRADE_OFFS_YOU_MADE: 'SOFTWARE_ARCHITECTURE',
  T4_SD_FUNDAMENTALS_SCALING_AND_FAILURE: 'CACHING',
  T4_SD_INTERVIEW_SAYING_THE_TRADE_OFFS: 'TECHNICAL_EXPLANATION',

  /* ── P20 · HR and communication ────────────────────────────────────────────────────── */
  T4_HR_QUESTIONS_TELL_ME_ABOUT_YOURSELF: 'SELF_INTRODUCTION',
  T4_COMM_PRESENT_PRACTICE: 'SPOKEN_ENGLISH_CONFIDENCE',
  T4_COMM_PRESENT_TAKING_QUESTIONS: 'SPOKEN_ENGLISH_CONFIDENCE',
  T4_COMM_WRITTEN_STATUS_AND_FOLLOWUP: 'TECHNICAL_WRITING',

  /* ── P21 · evidence ────────────────────────────────────────────────────────────────── */
  T4_RESUME_MATCHING_A_JOB_DESCRIPTION: 'PLACEMENT_READINESS',

  /* ── P22–P24 · mocks, simulation, verification ─────────────────────────────────────── */
  T4_MOCK_SPECIALIZATION_MOCK_4_PROJECT: 'TECHNICAL_EXPLANATION',
  T4_MOCK_HR_MOCK_9_HR: 'BEHAVIORAL_INTERVIEW',
  T4_SIM_ROUNDS_ROUNDS_FOUR_TO_SIX: 'INTERVIEW_PERFORMANCE',
  T4_SIM_DEBRIEF_THE_TWO_THINGS_TO_FIX: 'SELF_LEARNING',
  T4_VERIFY_GAPS_CLOSING_THEM: 'PLACEMENT_READINESS',
  T4_CAPSTONE_DEFENDING_IT: 'TECHNICAL_EXPLANATION',
  T4_CAPSTONE_CHECKPOINT: 'TECHNICAL_EXPLANATION',
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
