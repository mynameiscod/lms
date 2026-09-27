import { FoundationModuleSeed, FoundationTopicSeed } from './foundationSkillMap';
import { DirectionKey } from '../../data/careerDirectionPolicy';

/**
 * The Year-4 curriculum, as modules and topics. Stage key: `placement`.
 *
 * ── WHAT THIS IS ──────────────────────────────────────────────────────────────────────────
 *
 * The academic shape of Year 4, from CareerPilot_Year_4_Mega_Curriculum_V1: what is taught, which
 * skills each topic is about, what must come first, and who each topic is for. The units a student
 * actually meets are in year4MegaCurriculum; the days are composed per student.
 *
 * ── WHAT YEAR 4 IS FOR ────────────────────────────────────────────────────────────────────
 *
 * Year 1 builds foundations. Year 2 builds engineering capability. Year 3 turns that into career
 * proof. Year 4 converts it into an offer. The spec's own phrase is career conversion, and its
 * closing promise is worth restating because it decides what belongs in this file: "the final
 * product is not course completion alone — the student must demonstrate technical capability,
 * project capability, communication, interview performance, portfolio evidence and
 * remaining-gap awareness."
 *
 * Every one of those six is a module below. None of them is a lecture.
 *
 * ── THE ONE STRUCTURAL THING YEAR 4 DOES THAT NO EARLIER YEAR DOES ────────────────────────
 *
 * It runs two programmes at once. Thirty days of bridge, engineering build and specialization,
 * then a production project — and ALONGSIDE all of it, placement practice. The spec is explicit:
 * "placement practice is continuous, not only a final module." So the coding sets, the aptitude,
 * the technical MCQs and the interview practice are not the last modules a student reaches; they
 * are backbone topics that interleave from early on, which is why `placement` starts at 150 days
 * rather than Year 3's 130.
 *
 * ── THE BRIDGE IS A CEILING, NOT A SYLLABUS ───────────────────────────────────────────────
 *
 * "Fresh students can receive a MAXIMUM 10-day fundamentals bridge." So P02 is authored as ten
 * topics and NONE of them is backbone. That distinction is the whole rule: a backbone topic
 * reaches every learner whatever their evidence, and these must reach only the learners who need
 * them. A continuing CareerPilot student with three years of evidence should meet none of P02;
 * a fresh fourth-year who cannot write a loop should meet all ten.
 *
 * The composer already does this — it is the same machinery that compresses a Year-3 student's
 * demonstrated topics — and the only thing this file has to get right is not marking them
 * mandatory out of a vague sense that fundamentals matter.
 *
 * ── AND THE PLACEMENT PRACTICE IS THE OPPOSITE ────────────────────────────────────────────
 *
 * P15 to P24 are backbone almost without exception. Nobody's evidence excuses them from
 * aptitude, from mock interviews or from the final simulation, because those measure something
 * no earlier year measured: not whether they can do the work, but whether they can be seen to do
 * it, under time, with somebody watching. A student can be genuinely strong and still lose every
 * offer on that, and a curriculum that let evidence compress it away would be helping them fail.
 *
 * ── DIRECTIONS: WHAT THE SPEC SAYS, AND THE ONE PLACE THIS DEPARTS FROM IT ────────────────
 *
 * The spec's §14 lists SOFTWARE_ENGINEERING, SOFTWARE_BACKEND, SOFTWARE_FRONTEND, FULL_STACK,
 * DATA_ANALYTICS, AI_ML, CLOUD_DEVOPS and CYBERSECURITY, plus UNDECIDED/EXPLORING.
 *
 * Two of those are this product's existing keys under other names, and are used as such:
 * SOFTWARE_FRONTEND is WEB_DEVELOPMENT, DATA_ANALYTICS is DATA. Renaming a key that three years
 * of content is already tagged with would be a large, purely cosmetic migration.
 *
 * UNDECIDED/EXPLORING is not a ninth key and is not authored as one. It is a DirectionStatus the
 * product already models, and a student holding it is served by the EXPLORATION-category topic
 * T4_DIRECTION_ASSESSMENT rather than by a track called "undecided".
 *
 * THE DEPARTURE: the spec omits MOBILE, and MOBILE is kept. Year 3 authors a full eighteen-unit
 * Mobile track, so a student who chose Mobile last year and arrives here would find no Year-4
 * direction at all — their specialization month would be empty and their specialization mock
 * interview would have nothing to ask about. Dropping a direction is a decision about students
 * who already exist, not a tidy-up, and it is not one a curriculum file should make quietly.
 *
 * ── PREREQUISITES REACH BACK THREE YEARS NOW ──────────────────────────────────────────────
 *
 * `prerequisiteSkillKeys` here name Year-1, Year-2 and Year-3 skills. A student who has not shown
 * one is taught it first, from units that already exist — and for Year 4 the bridge has to be
 * able to reach back through all THREE earlier years.
 *
 * The honest limit measured in Year 2 and restated in Year 3 holds here with more force: borrowing
 * rescues partial gaps and cannot rescue somebody with no programming at all. The ladder behind a
 * total beginner is hundreds of units and a bridge is ten days. For that student the truthful
 * answer is still Year 1, and the spec agrees — its bridge is a maximum, not a promise.
 *
 * ── ONE PRIMARY LANGUAGE ──────────────────────────────────────────────────────────────────
 *
 * The spec asks for "one primary programming-language fundamentals path", and the bridge uses
 * Python, because that is what Years 1 and 2 are built on and a bridge that switched languages
 * would be teaching a new thing while claiming to repair an old one. Java and C remain available
 * as the academic-support paths they have always been.
 */

export const PLACEMENT_STAGE_KEY = 'placement';
export const PLACEMENT_TITLE = 'CareerPilot Year 4 — Placement';

/** Compact constructor, so the modules below read as a curriculum rather than as JSON. */
const t = (
  topicCode: string, title: string, skillKeys: string[],
  learningOutcomes: string[], extra: Partial<FoundationTopicSeed> = {},
): FoundationTopicSeed => ({
  topicCode, title, skillKeys,
  category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'STANDARD',
  learningOutcomes, ...extra,
});

/**
 * ── THE NINE SPECIALIZATION TRACKS ────────────────────────────────────────────────────────
 *
 * The spec gives the specialization ten days with a fixed shape — direction assessment, then
 * fundamentals, architecture, tools, implementation, debugging, testing, security & quality,
 * advanced challenge, verification. Day 21 is the assessment and belongs to everyone, so it is
 * authored once as T4_DIRECTION_ASSESSMENT. The remaining nine days are the same nine questions
 * asked of whichever direction the student holds.
 *
 * So the SHAPE is shared and stated once, and what differs per direction — the skills, and what
 * each of the four topics is actually about — is authored per direction in the table below.
 * Writing thirty-six near-identical blocks by hand would have been thirty-six chances to paste
 * one direction's skill keys into another's topic, which is precisely the defect that let every
 * Year-3 track compose into every student's plan.
 *
 * Nine days become four topics rather than nine, because architecture is not a sitting away from
 * fundamentals and testing is not a sitting away from debugging. Four topics of four to five
 * units each gives a track of roughly eighteen units — the size Year 3 settled on, for the same
 * reason: it is what one month of a personalised plan can actually hold.
 */
interface TrackSpec {
  direction: DirectionKey;
  /** Short code inside the topic code: T4_<code>_DEPTH and so on. */
  code: string;
  moduleName: string;
  blurb: string;
  /** What this direction is called in a sentence. Lower case; used mid-title. */
  noun: string;
  depthSkills: string[];
  buildSkills: string[];
  qualitySkills: string[];
  proofSkills: string[];
  /** Year-1/2/3 skills a student needs before this track is worth opening. */
  prerequisites: string[];
  depthOutcome: string;
  buildOutcome: string;
  qualityOutcome: string;
  proofOutcome: string;
}

const TRACKS: TrackSpec[] = [
  {
    direction: 'SOFTWARE_ENGINEERING', code: 'SE', noun: 'a large codebase',
    moduleName: 'Specialization — Software Engineering',
    blurb: 'The direction for somebody whose value is that the system stays maintainable after they leave.',
    depthSkills: ['SOFTWARE_ARCHITECTURE', 'DESIGN_PATTERNS', 'TECHNICAL_DEBT'],
    buildSkills: ['REFACTORING', 'CLEAN_CODE', 'DEPENDENCY_MANAGEMENT'],
    qualitySkills: ['AUTOMATED_TESTING', 'CODE_REVIEW', 'DEBUGGING'],
    proofSkills: ['SOFTWARE_ARCHITECTURE', 'TECHNICAL_EXPLANATION'],
    prerequisites: ['OOP_CONCEPTS', 'CLEAN_CODE', 'TESTING_FUNDAMENTALS'],
    depthOutcome: 'Read an unfamiliar codebase and say where its structure will hurt first.',
    buildOutcome: 'Change a module without the change spreading, and show why it did not.',
    qualityOutcome: 'Put a system under test well enough that a refactor is safe to attempt.',
    proofOutcome: 'Defend a structural decision against the alternative somebody else prefers.',
  },
  {
    direction: 'SOFTWARE_BACKEND', code: 'BACKEND', noun: 'a service',
    moduleName: 'Specialization — Backend Engineering',
    blurb: 'APIs, data and the things that only go wrong under load.',
    depthSkills: ['API_DESIGN', 'DB_DESIGN', 'SERVER_SIDE_BASICS'],
    buildSkills: ['REST_APIS', 'AUTHENTICATION', 'AUTHORIZATION', 'DB_TRANSACTIONS'],
    qualitySkills: ['QUERY_OPTIMIZATION', 'CACHING', 'SECURE_CODING'],
    proofSkills: ['API_DESIGN', 'TECHNICAL_EXPLANATION'],
    prerequisites: ['REST_APIS', 'SQL_JOINS', 'DB_FUNDAMENTALS'],
    depthOutcome: 'Design an API and a schema together, rather than one after the other.',
    buildOutcome: 'Build an authenticated service that survives a badly behaved client.',
    qualityOutcome: 'Find the query that is costing the request and prove the fix worked.',
    proofOutcome: 'Explain a consistency or performance trade-off you actually chose.',
  },
  {
    direction: 'WEB_DEVELOPMENT', code: 'FRONTEND', noun: 'an interface',
    moduleName: 'Specialization — Frontend Engineering',
    blurb: 'Advanced web work: state, performance and the users other people forget.',
    depthSkills: ['STATE_MANAGEMENT', 'BROWSER_FUNDAMENTALS', 'JS_ASYNC'],
    /* JS_ASYNC as well as the DEPTH topic's: this topic's first lesson is loading, failure
     * and out-of-order responses, and an attribution has to be able to say so. */
    buildSkills: ['RESPONSIVE_DESIGN', 'JS_ASYNC', 'JS_DOM', 'HTML_FORMS'],
    qualitySkills: ['WEB_ACCESSIBILITY', 'WEB_SECURITY', 'DEBUGGING'],
    proofSkills: ['STATE_MANAGEMENT', 'TECHNICAL_EXPLANATION'],
    prerequisites: ['JS_BASICS', 'CSS', 'HTTP'],
    depthOutcome: 'Say where a piece of state belongs, and what breaks if it lives elsewhere.',
    buildOutcome: 'Build an interface that holds up on a slow connection and a small screen.',
    qualityOutcome: 'Find and fix an accessibility or rendering fault a keyboard user would hit.',
    proofOutcome: 'Justify a rendering or state decision against its cost to the user.',
  },
  {
    direction: 'FULL_STACK', code: 'FULLSTACK', noun: 'an application end to end',
    moduleName: 'Specialization — Full-Stack Engineering',
    blurb: 'One person, both halves, and the seam between them where most of the bugs live.',
    depthSkills: ['SOFTWARE_ARCHITECTURE', 'API_DESIGN', 'STATE_MANAGEMENT'],
    buildSkills: ['REST_APIS', 'AUTHENTICATION', 'JS_ASYNC', 'DB_DESIGN'],
    qualitySkills: ['AUTOMATED_TESTING', 'WEB_SECURITY', 'DEBUGGING'],
    proofSkills: ['SOFTWARE_ARCHITECTURE', 'TECHNICAL_EXPLANATION'],
    prerequisites: ['REST_APIS', 'JS_BASICS', 'SQL_BASICS'],
    depthOutcome: 'Decide what belongs on the server and defend the line you drew.',
    buildOutcome: 'Ship a feature through the database, the API and the interface in one piece.',
    qualityOutcome: 'Trace a fault across the seam instead of guessing which side it is on.',
    proofOutcome: 'Walk somebody through a whole request and back, without notes.',
  },
  {
    direction: 'DATA', code: 'DATA', noun: 'a dataset',
    moduleName: 'Specialization — Data & Analytics',
    blurb: 'SQL, Python and statistics, pointed at a question somebody is waiting on an answer to.',
    depthSkills: ['DATA_WRANGLING', 'PROBABILITY_STATISTICS', 'DBMS_CONCEPTS'],
    buildSkills: ['SQL_JOINS', 'DATA_PIPELINES', 'DATA_VISUALIZATION'],
    qualitySkills: ['QUERY_OPTIMIZATION', 'DATA_WRANGLING', 'DEBUGGING'],
    proofSkills: ['DATA_VISUALIZATION', 'TECHNICAL_EXPLANATION'],
    prerequisites: ['SQL_JOINS', 'PYTHON_COLLECTIONS', 'PROBABILITY_STATISTICS'],
    depthOutcome: 'Say what a dataset cannot answer, before spending a week answering it.',
    buildOutcome: 'Take raw data through to a figure somebody can act on.',
    qualityOutcome: 'Find the join or the null that quietly changed the answer.',
    proofOutcome: 'Present a finding with its uncertainty attached rather than removed.',
  },
  {
    direction: 'AI_ML', code: 'AIML', noun: 'a model',
    moduleName: 'Specialization — AI & Machine Learning',
    blurb: 'The workflow, the evaluation, and the honesty about what the number means.',
    depthSkills: ['ML_WORKFLOW', 'AI_ML_CONCEPTS', 'FEATURE_ENGINEERING'],
    buildSkills: ['ML_WORKFLOW', 'DATA_WRANGLING', 'GENERATIVE_AI_LLM'],
    qualitySkills: ['ML_EVALUATION', 'AI_RESPONSIBLE_USE', 'DEBUGGING'],
    proofSkills: ['ML_EVALUATION', 'TECHNICAL_EXPLANATION'],
    prerequisites: ['PYTHON_COLLECTIONS', 'PROBABILITY_STATISTICS', 'ML_WORKFLOW'],
    depthOutcome: 'Choose a framing and a baseline before choosing an algorithm.',
    buildOutcome: 'Take a problem through data, features, training and a usable prediction.',
    qualityOutcome: 'Detect leakage or an unfair split that made the score look good.',
    proofOutcome: 'Report what a model does badly, and for whom, alongside what it does well.',
  },
  {
    direction: 'CLOUD_DEVOPS', code: 'CLOUD', noun: 'a deployment',
    moduleName: 'Specialization — Cloud & DevOps',
    blurb: 'Getting it running somewhere that is not your laptop, and knowing when it stops.',
    depthSkills: ['CLOUD_FUNDAMENTALS', 'DEVOPS_FUNDAMENTALS', 'LINUX_ADMINISTRATION'],
    buildSkills: ['CONTAINERS_DOCKER', 'CI_CD', 'DEPLOYMENT'],
    qualitySkills: ['MONITORING_OBSERVABILITY', 'LOGGING_DIAGNOSTICS', 'SECURE_CODING'],
    proofSkills: ['DEVOPS_FUNDAMENTALS', 'TECHNICAL_EXPLANATION'],
    prerequisites: ['SHELL_COMMANDS', 'CONTAINERS_DOCKER', 'DEPLOYMENT'],
    depthOutcome: 'Describe what actually happens between a commit and a running process.',
    buildOutcome: 'Put an application into a container and through a pipeline that can fail safely.',
    qualityOutcome: 'Instrument a service well enough to answer "is it broken?" without guessing.',
    proofOutcome: 'Explain a rollback or a scaling decision and what it cost.',
  },
  {
    direction: 'CYBERSECURITY', code: 'SECURITY', noun: 'an application',
    moduleName: 'Specialization — Cybersecurity',
    blurb: 'Secure development: finding it before somebody else does, and fixing the class not the case.',
    depthSkills: ['THREAT_MODELING', 'SECURITY_FUNDAMENTALS', 'WEB_SECURITY'],
    buildSkills: ['SECURE_CODING', 'AUTHENTICATION', 'AUTHORIZATION'],
    qualitySkills: ['WEB_SECURITY', 'CODE_REVIEW', 'LOGGING_DIAGNOSTICS'],
    proofSkills: ['THREAT_MODELING', 'TECHNICAL_EXPLANATION'],
    prerequisites: ['WEB_SECURITY', 'AUTHENTICATION', 'SECURE_CODING'],
    depthOutcome: 'Model what an attacker wants from a system before listing its vulnerabilities.',
    buildOutcome: 'Build the control properly rather than patching the one input that was reported.',
    qualityOutcome: 'Review code for a vulnerability class and find every instance, not the first.',
    proofOutcome: 'Write a finding somebody can act on: impact, reproduction, fix.',
  },
  {
    /*
     * Not in the spec's §14; kept deliberately. See the header — Year 3 authors a full Mobile
     * track, and a student holding that direction would otherwise arrive here with no
     * specialization month and nothing for their specialization interview to be about.
     */
    direction: 'MOBILE', code: 'MOBILE', noun: 'a mobile app',
    moduleName: 'Specialization — Mobile Engineering',
    blurb: 'A device that loses its network, runs out of battery and belongs to somebody else.',
    depthSkills: ['MOBILE_APP_BASICS', 'STATE_MANAGEMENT', 'SOFTWARE_ARCHITECTURE'],
    buildSkills: ['MOBILE_APP_BASICS', 'REST_APIS', 'JS_ASYNC'],
    qualitySkills: ['DEBUGGING', 'AUTOMATED_TESTING', 'SECURE_CODING'],
    proofSkills: ['MOBILE_APP_BASICS', 'TECHNICAL_EXPLANATION'],
    prerequisites: ['MOBILE_APP_BASICS', 'REST_APIS', 'STATE_MANAGEMENT'],
    depthOutcome: 'Design for a lifecycle where the operating system can stop you at any moment.',
    buildOutcome: 'Build a screen that works offline and reconciles when the network returns.',
    qualityOutcome: 'Debug something that only reproduces on a real device.',
    proofOutcome: 'Explain a storage, permission or battery decision to somebody sceptical.',
  },
];

/** One direction's four topics, in the shared nine-day shape. */
const trackTopics = (s: TrackSpec): FoundationTopicSeed[] => {
  const d = (skills: string[], suffix: string, title: string, outcome: string, depth: 'STANDARD' | 'CHALLENGE'): FoundationTopicSeed => ({
    topicCode: `T4_${s.code}_${suffix}`,
    title,
    skillKeys: skills,
    category: 'DIRECTION',
    applicableDirections: [s.direction],
    defaultDepth: depth,
    learningOutcomes: [outcome],
    prerequisiteSkillKeys: s.prerequisites,
    /*
     * A DIRECTION topic can never be backbone — backboneClassificationProblems refuses it, and is
     * right to: the backbone is what EVERY student covers, and eight ninths of this file is
     * filtered out of any one student's plan.
     */
  });
  return [
    d(s.depthSkills, 'DEPTH', `${s.moduleName.replace('Specialization — ', '')} — Depth and Architecture`, s.depthOutcome, 'STANDARD'),
    d(s.buildSkills, 'BUILD', `Building ${s.noun.charAt(0).toUpperCase()}${s.noun.slice(1)}`, s.buildOutcome, 'CHALLENGE'),
    d(s.qualitySkills, 'QUALITY', `${s.moduleName.replace('Specialization — ', '')} — Debugging, Testing and Security`, s.qualityOutcome, 'CHALLENGE'),
    d(s.proofSkills, 'PROOF', `${s.moduleName.replace('Specialization — ', '')} — Showing You Can Do It`, s.proofOutcome, 'CHALLENGE'),
  ];
};

/** The nine specialization modules, one per direction, in direction order. */
const TRACK_MODULES: FoundationModuleSeed[] = TRACKS.map((s, i) => ({
  moduleCode: `P${String(5 + i).padStart(2, '0')}_${s.code}`,
  moduleName: s.moduleName,
  displayOrder: 50 + i * 10,
  blurb: s.blurb,
  topics: trackTopics(s),
}));

export const PLACEMENT_MODULES: FoundationModuleSeed[] = [
  /* ══════════════ STAGE 1 — COMPREHENSIVE ASSESSMENT ══════════════ */
  {
    moduleCode: 'P01_ASSESSMENT',
    moduleName: 'Year-4 Standing & Placement Plan',
    displayOrder: 10,
    blurb: 'What is actually in place after three years, and what the remaining months are going to be spent on.',
    topics: [
      t('T4_STANDING', 'Where You Actually Stand',
        ['PROGRAMMING_FUNDAMENTALS', 'PROBLEM_SOLVING'],
        ['Show what is in place across programming, engineering, core CS, projects and communication, or find out exactly where it is not.'],
        { backbone: true }),
      t('T4_PLACEMENT_PLAN', 'Your Placement Plan',
        ['PLACEMENT_READINESS', 'TECH_CAREER_AWARENESS'],
        ['Turn a diagnostic into a dated plan: which gaps close, which roles are realistic, and what the next eight weeks contain.'],
        { backbone: true }),
    ],
  },

  /* ══════════════ STAGE 2 — THE TEN-DAY FOUNDATION BRIDGE ══════════════
   *
   * A MAXIMUM, NOT A SYLLABUS. Nothing in this module is backbone; see the file header. The
   * depths are FOUNDATION and GUIDED because a student who needs this module needs teaching,
   * not revision — and a student who does not need it should never see it.
   */
  {
    moduleCode: 'P02_BRIDGE',
    moduleName: 'Ten-Day Foundation Bridge',
    displayOrder: 20,
    blurb: 'For a fourth-year arriving without the fundamentals. Ten days at the most, and only what is missing.',
    topics: [
      t('T4_BR_PROGRAMMING', 'Programming Core, Rebuilt',
        ['PROGRAMMING_FUNDAMENTALS', 'INPUT_OUTPUT_BASICS'],
        ['Write a program that reads input, computes something and prints a correct answer.'],
        { defaultDepth: 'FOUNDATION' }),
      t('T4_BR_CONTROL_FLOW', 'Conditions, Logic and Loops',
        ['CONDITIONALS_BASICS', 'LOOPS_BASICS'],
        ['Write and trace a loop with a condition inside it, and say what it does on the edge case.'],
        { defaultDepth: 'FOUNDATION' }),
      t('T4_BR_FUNCTIONS', 'Functions, Parameters and Scope',
        ['FUNCTIONS_BASICS', 'PYTHON_FUNCTIONS'],
        ['Break a program into functions that each do one thing and return rather than print.'],
        { defaultDepth: 'FOUNDATION' }),
      t('T4_BR_COLLECTIONS', 'Lists, Strings, Maps and Sets',
        ['PYTHON_COLLECTIONS', 'PYTHON_STRINGS'],
        ['Choose between a list, a dictionary and a set for a stated problem, and say why.'],
        { defaultDepth: 'FOUNDATION' }),
      t('T4_BR_OOP', 'Classes and Objects, Quickly',
        ['OOP_CONCEPTS', 'PYTHON_OOP'],
        ['Write a class with state and behaviour, and explain what encapsulation bought you.'],
        { defaultDepth: 'GUIDED', prerequisiteSkillKeys: ['PYTHON_FUNCTIONS'] }),
      t('T4_BR_DSA', 'Complexity, Searching and Sorting',
        ['DSA_COMPLEXITY', 'DSA_ARRAYS', 'DSA_SEARCHING', 'DSA_SORTING'],
        ['State the cost of a loop you wrote, and pick the cheaper of two correct approaches.'],
        { defaultDepth: 'GUIDED', prerequisiteSkillKeys: ['LOOPS_BASICS'] }),
      t('T4_BR_DATABASE', 'Tables, Relationships and SQL',
        ['SQL_BASICS', 'SQL_JOINS', 'DB_FUNDAMENTALS'],
        ['Query across two related tables and get the rows you meant rather than the rows you got.'],
        { defaultDepth: 'GUIDED' }),
      t('T4_BR_WEB_API', 'HTTP, REST and JSON',
        ['HTTP', 'REST_APIS', 'API_FUNDAMENTALS'],
        ['Call an API, read the status code honestly, and handle the response that is not 200.'],
        { defaultDepth: 'GUIDED' }),
      t('T4_BR_ENGINEERING', 'Git, Testing, Debugging and the Shell',
        ['GIT_FUNDAMENTALS', 'GIT_BRANCHING', 'TESTING_FUNDAMENTALS', 'SHELL_COMMANDS'],
        ['Work on a branch, write a test that fails for the right reason, and find a bug from a stack trace.'],
        { defaultDepth: 'GUIDED' }),
      t('T4_BR_INTEGRATION', 'The Bridge, Put Together',
        ['PROBLEM_SOLVING', 'DEBUGGING'],
        ['Build one small thing that touches the database, an API, Git and a test, and explain it afterwards.'],
        {
          defaultDepth: 'GUIDED',
          prerequisiteSkillKeys: ['PYTHON_FUNCTIONS', 'SQL_BASICS', 'REST_APIS'],
        }),
    ],
  },

  /* ══════════════ STAGE 3 — THE TEN-DAY ENGINEERING BUILD ══════════════
   *
   * Backbone throughout, and the contrast with P02 above is deliberate. The bridge repairs what
   * is missing; this is the Year-4 engineering standard, which every student is held to whatever
   * they arrive with. Evidence changes the DEPTH of the treatment — the spec's "compress
   * demonstrated mastery into verification, debugging, application or advanced treatment" — never
   * whether the topic is there.
   */
  {
    moduleCode: 'P03_ENGINEERING_BUILD',
    moduleName: 'Ten-Day Engineering Build',
    displayOrder: 30,
    blurb: 'The engineering standard a fourth-year is interviewed against, whatever they arrived with.',
    topics: [
      t('T4_CLEAN_CODE', 'Code Somebody Else Can Change',
        ['CLEAN_CODE', 'REFACTORING', 'TECHNICAL_DEBT'],
        ['Take a working but tangled file and improve its structure without changing its behaviour.'],
        { backbone: true, prerequisiteSkillKeys: ['PROGRAMMING_FUNDAMENTALS'] }),
      t('T4_OOP_DESIGN', 'Abstraction, Composition and Patterns',
        ['OOP_CONCEPTS', 'DESIGN_PATTERNS', 'SOFTWARE_ARCHITECTURE'],
        ['Choose composition or inheritance for a stated problem and defend the choice.'],
        { backbone: true, prerequisiteSkillKeys: ['OOP_CONCEPTS'] }),
      t('T4_DSA_DEPTH', 'Choosing the Structure and the Algorithm',
        ['DSA_COMPLEXITY', 'ALGORITHM_DESIGN', 'DSA_HASHING', 'DSA_TREES'],
        ['Pick a data structure from the cost of the operations the problem actually performs.'],
        { backbone: true, prerequisiteSkillKeys: ['DSA_ARRAYS', 'DSA_COMPLEXITY'] }),
      t('T4_TESTING_DEPTH', 'Unit, Integration, Edge and Regression',
        ['AUTOMATED_TESTING', 'TESTING_FUNDAMENTALS'],
        ['Write the test that would have caught the bug, and say why the existing ones did not.'],
        { backbone: true, prerequisiteSkillKeys: ['TESTING_FUNDAMENTALS'] }),
      t('T4_DEBUG_DEPTH', 'Root Cause, Not First Symptom',
        ['DEBUGGING', 'LOGGING_DIAGNOSTICS'],
        ['Work from a stack trace or a log to the actual cause without changing things at random.'],
        { backbone: true, prerequisiteSkillKeys: ['DEBUGGING'] }),
      t('T4_DB_ENGINEERING', 'Schema, Indexes and Transactions',
        ['DB_INDEXING', 'DB_TRANSACTIONS', 'QUERY_OPTIMIZATION', 'DB_DESIGN'],
        ['Explain why a query is slow from its plan, and fix it without breaking correctness.'],
        { backbone: true, prerequisiteSkillKeys: ['SQL_JOINS', 'DB_FUNDAMENTALS'] }),
      t('T4_API_ENGINEERING', 'APIs, Authentication and Authorization',
        ['API_DESIGN', 'AUTHENTICATION', 'AUTHORIZATION', 'REST_APIS'],
        ['Design an endpoint that is still correct when the caller is hostile or confused.'],
        { backbone: true, prerequisiteSkillKeys: ['REST_APIS', 'HTTP'] }),
      t('T4_LINUX_CLOUD', 'Processes, Containers and Deployment',
        ['LINUX_ADMINISTRATION', 'CONTAINERS_DOCKER', 'DEPLOYMENT', 'CLOUD_FUNDAMENTALS'],
        ['Get an application running somewhere that is not your machine, and say what changed.'],
        { backbone: true, prerequisiteSkillKeys: ['SHELL_COMMANDS'] }),
      t('T4_SECURITY_ENGINEERING', 'Validation, Access Control and Secrets',
        ['SECURE_CODING', 'WEB_SECURITY', 'THREAT_MODELING'],
        ['Find the common vulnerability class in a piece of code and fix it at the right layer.'],
        { backbone: true, prerequisiteSkillKeys: ['SECURITY_FUNDAMENTALS'] }),
      t('T4_BUILD_INTEGRATION', 'The Engineering Build',
        ['PRODUCTION_ENGINEERING', 'PROBLEM_SOLVING'],
        ['Build one thing that carries code, Git, a database, an API, tests and a security control at once.'],
        {
          backbone: true, defaultDepth: 'CHALLENGE',
          prerequisiteSkillKeys: ['REST_APIS', 'AUTOMATED_TESTING', 'DB_FUNDAMENTALS'],
        }),
    ],
  },

  /* ══════════════ STAGE 4 — CONFIRMING A DIRECTION ══════════════ */
  {
    moduleCode: 'P04_DIRECTION',
    moduleName: 'Choosing and Confirming a Direction',
    displayOrder: 40,
    blurb: 'Day 21 of the spec: the one specialization day that belongs to everybody, including the student who has not decided.',
    topics: [
      t('T4_DIRECTION_ASSESSMENT', 'Which Direction, and On What Evidence',
        ['TECH_CAREER_AWARENESS', 'PLACEMENT_READINESS'],
        [
          'Compare the eight directions against your own evidence rather than against what sounds impressive.',
          'Commit to one for the specialization month, knowing what committing costs and what it does not.',
        ],
        {
          backbone: true,
          /*
           * EXPLORATION would have been the obvious category and is wrong here. Exploration is
           * scored down for a student who has already SELECTED a direction (compositionShapePolicy),
           * and this topic is not a look around for the undecided — it is the day every
           * fourth-year confirms or changes the direction their whole specialization month and
           * their specialization interview will be about. The undecided student needs it most and
           * the committed student still needs it.
           */
        }),
    ],
  },

  ...TRACK_MODULES,

  /* ══════════════ STAGE 5 — PRODUCTION ENGINEERING & CAPSTONE ══════════════ */
  {
    moduleCode: 'P14_PRODUCTION',
    moduleName: 'Production Engineering',
    displayOrder: 140,
    blurb: 'Something built to be run rather than to be marked — and then explained to somebody who was not there.',
    topics: [
      t('T4_PROD_SPEC', 'Requirements, Specification and Architecture',
        ['TECHNICAL_WRITING', 'SOFTWARE_ARCHITECTURE'],
        ['Turn a vague idea into user stories, a technical specification and an architecture somebody could build from.'],
        { backbone: true, prerequisiteSkillKeys: ['TECHNICAL_COMMUNICATION'] }),
      t('T4_PROD_BUILD', 'Building It Properly',
        ['PRODUCTION_ENGINEERING', 'ERROR_HANDLING_DESIGN'],
        ['Build a system whose failures are handled deliberately rather than discovered by a user.'],
        {
          backbone: true, defaultDepth: 'CHALLENGE',
          prerequisiteSkillKeys: ['REST_APIS', 'DB_DESIGN', 'AUTHENTICATION'],
        }),
      t('T4_PROD_OPERATE', 'Deploying, Logging and Watching It Run',
        ['DEPLOYMENT', 'MONITORING_OBSERVABILITY', 'LOGGING_DIAGNOSTICS'],
        ['Deploy the thing and be able to answer "is it working?" from evidence rather than from hope.'],
        { backbone: true, defaultDepth: 'CHALLENGE', prerequisiteSkillKeys: ['DEPLOYMENT'] }),
      t('T4_PROD_REVIEW', 'Review, Documentation and Presentation',
        ['CODE_REVIEW', 'TECHNICAL_EXPLANATION'],
        ['Document and present your own system to somebody who will ask why, not whether.'],
        { backbone: true, prerequisiteSkillKeys: ['TECHNICAL_COMMUNICATION'] }),
    ],
  },

  /* ══════════════ STAGE 6 — PLACEMENT PRACTICE, WHICH IS CONTINUOUS ══════════════
   *
   * The spec's guardrail: "placement practice is continuous, not only a final module." These are
   * backbone so they reach everybody, and they are deliberately shallow-dependency so the
   * composer can interleave them from early in the programme rather than stacking them at the end.
   */
  {
    moduleCode: 'P15_PLACEMENT_CODING',
    moduleName: 'Placement Coding & DSA',
    displayOrder: 150,
    blurb: 'The problems that actually appear, at the speed they actually have to be solved.',
    topics: [
      t('T4_PL_CODING_SETS', 'Coding Under a Clock',
        ['DSA_ARRAYS', 'DSA_STRINGS', 'DSA_HASHING'],
        ['Solve a standard array or string problem correctly within the time an online round allows.'],
        { backbone: true, prerequisiteSkillKeys: ['DSA_ARRAYS'] }),
      t('T4_PL_DSA_PATTERNS', 'Two Pointers, Sliding Window, Binary Search',
        ['DSA_SEARCHING', 'DSA_SORTING', 'DSA_RECURSION'],
        ['Recognise which pattern a problem is asking for before starting to write.'],
        { backbone: true, prerequisiteSkillKeys: ['DSA_SEARCHING'] }),
      t('T4_PL_DSA_STRUCTURES', 'Stacks, Queues, Linked Lists and Trees',
        ['DSA_STACK', 'DSA_QUEUE', 'DSA_LINKED_LIST', 'DSA_TREES'],
        ['Implement and use the structure a problem needs without looking it up.'],
        { backbone: true, prerequisiteSkillKeys: ['DSA_ARRAYS'] }),
      t('T4_PL_DSA_ADVANCED', 'Graphs, Greedy and Basic DP',
        ['DSA_GRAPHS', 'DSA_DP', 'DSA_GREEDY'],
        ['Reach a working answer on the harder third of a paper, even when it is not the optimal one.'],
        {
          backbone: true, defaultDepth: 'CHALLENGE',
          prerequisiteSkillKeys: ['DSA_RECURSION', 'DSA_TREES'],
        }),
      t('T4_PL_COMPLEXITY', 'Saying What It Costs',
        ['DSA_COMPLEXITY'],
        ['State and justify the time and space cost of your own solution, out loud, immediately.'],
        { backbone: true, prerequisiteSkillKeys: ['DSA_COMPLEXITY'] }),
    ],
  },
  {
    moduleCode: 'P16_APTITUDE',
    moduleName: 'Aptitude, Reasoning & Verbal',
    displayOrder: 160,
    blurb: 'The round that opens the drive and eliminates more candidates than any technical one.',
    topics: [
      t('T4_AP_QUANT', 'Quantitative Aptitude',
        ['APTITUDE_QUANT_ARITHMETIC', 'APTITUDE_QUANT_TIME'],
        ['Work percentages, ratios, interest, time-and-work and speed-distance problems at test pace.'],
        { backbone: true }),
      t('T4_AP_DI', 'Data Interpretation',
        ['APTITUDE_DATA_INTERPRETATION'],
        ['Read a table or chart and answer from it without recomputing the whole thing.'],
        { backbone: true, prerequisiteSkillKeys: ['APTITUDE_QUANT_ARITHMETIC'] }),
      t('T4_AP_REASONING', 'Logical Reasoning',
        ['APTITUDE_REASONING_SERIES', 'APTITUDE_REASONING_LOGIC'],
        ['Handle series, coding-decoding, syllogisms, arrangements and puzzles under time.'],
        { backbone: true }),
      t('T4_AP_VERBAL', 'Verbal Ability',
        ['APTITUDE_VERBAL_GRAMMAR', 'APTITUDE_VERBAL_READING'],
        ['Correct a sentence, complete a passage and answer comprehension questions accurately.'],
        { backbone: true }),
    ],
  },
  {
    moduleCode: 'P17_TECH_MCQ',
    moduleName: 'Technical MCQ & Core CS',
    displayOrder: 170,
    blurb: 'The written technical round: broad, fast, and unforgiving of things half-remembered.',
    topics: [
      t('T4_MCQ_PROGRAMMING', 'Programming and OOP MCQs',
        ['PROGRAMMING_FUNDAMENTALS', 'OOP_CONCEPTS'],
        ['Answer output-prediction and OOP questions correctly without running the code.'],
        { backbone: true, prerequisiteSkillKeys: ['PROGRAMMING_FUNDAMENTALS'] }),
      t('T4_MCQ_CORE_CS', 'Operating Systems, Networks and DBMS',
        ['OPERATING_SYSTEMS', 'COMPUTER_NETWORKS', 'DBMS_CONCEPTS'],
        ['Answer the core-CS questions every written round contains, from understanding rather than recall.'],
        { backbone: true, prerequisiteSkillKeys: ['OPERATING_SYSTEMS', 'COMPUTER_NETWORKS'] }),
      t('T4_MCQ_ENGINEERING', 'Git, Testing, SQL and Security MCQs',
        ['GIT_FUNDAMENTALS', 'TESTING_FUNDAMENTALS', 'SECURITY_FUNDAMENTALS', 'SQL_BASICS'],
        ['Answer practical engineering questions about tools you have actually used.'],
        { backbone: true }),
    ],
  },

  /* ══════════════ STAGES 8 & 9 — INTERVIEWS ══════════════ */
  {
    moduleCode: 'P18_TECH_INTERVIEW',
    moduleName: 'Technical & Coding Interviews',
    displayOrder: 180,
    blurb: 'The spec\'s loop: understand, approach, implement, test, debug, state the complexity, take the follow-up.',
    topics: [
      t('T4_IV_METHOD', 'How a Technical Interview Actually Runs',
        ['TECHNICAL_INTERVIEW_PREP'],
        ['Work a problem out loud from understanding to complexity, without going silent in the middle.'],
        { backbone: true, prerequisiteSkillKeys: ['PROBLEM_SOLVING'] }),
      t('T4_IV_FUNDAMENTALS', 'Fundamentals Interviews',
        ['TECHNICAL_INTERVIEW_PREP', 'SQL_BASICS', 'GIT_FUNDAMENTALS'],
        ['Answer programming, SQL and Git questions at interview depth rather than definition depth.'],
        { backbone: true, prerequisiteSkillKeys: ['SQL_BASICS', 'GIT_FUNDAMENTALS'] }),
      t('T4_IV_DSA', 'DSA Interviews',
        ['TECHNICAL_INTERVIEW_PREP', 'DSA_COMPLEXITY'],
        ['Reach a correct solution and improve it when the interviewer asks for better than O(n²).'],
        {
          backbone: true, defaultDepth: 'CHALLENGE',
          prerequisiteSkillKeys: ['DSA_COMPLEXITY', 'DSA_ARRAYS'],
        }),
      t('T4_IV_CORE_CS', 'Core CS Interviews',
        ['TECHNICAL_INTERVIEW_PREP', 'OPERATING_SYSTEMS', 'COMPUTER_NETWORKS', 'DBMS_CONCEPTS'],
        ['Explain a process, a packet or a transaction to somebody probing for where the understanding stops.'],
        { backbone: true, prerequisiteSkillKeys: ['OPERATING_SYSTEMS'] }),
    ],
  },
  {
    moduleCode: 'P19_PROJECT_SYSTEM_DESIGN',
    moduleName: 'Project & System-Design Interviews',
    displayOrder: 190,
    blurb: 'The two rounds a strong candidate loses when their project was real but they cannot account for it.',
    topics: [
      t('T4_IV_PROJECT', 'Defending Your Own Project',
        ['TECHNICAL_EXPLANATION', 'SOFTWARE_ARCHITECTURE'],
        ['Explain the problem, the architecture, the hardest bug, the trade-offs and the testing, without notes.'],
        {
          backbone: true, defaultDepth: 'CHALLENGE',
          prerequisiteSkillKeys: ['TECHNICAL_EXPLANATION', 'PORTFOLIO_EVIDENCE'],
        }),
      t('T4_SD_FUNDAMENTALS', 'System Design Fundamentals',
        ['SYSTEM_DESIGN_BASICS', 'CACHING'],
        ['Draw the components, the APIs and the data for a small system and say where it would break first.'],
        {
          backbone: true, defaultDepth: 'CHALLENGE',
          prerequisiteSkillKeys: ['API_DESIGN', 'DB_DESIGN'],
        }),
      t('T4_SD_INTERVIEW', 'The System-Design Round',
        ['SYSTEM_DESIGN_BASICS', 'TECHNICAL_EXPLANATION'],
        ['Take a one-line brief to a defensible design, stating scaling, reliability and security trade-offs aloud.'],
        {
          backbone: true, defaultDepth: 'CHALLENGE',
          prerequisiteSkillKeys: ['SYSTEM_DESIGN_BASICS'],
        }),
    ],
  },
  {
    moduleCode: 'P20_HR_COMMUNICATION',
    moduleName: 'HR, Behavioural & Communication',
    displayOrder: 200,
    blurb: 'The round nobody prepares for and a surprising number of people lose.',
    topics: [
      t('T4_HR_STAR', 'Answering With a Structure',
        ['BEHAVIORAL_INTERVIEW'],
        ['Give a STAR answer that contains an actual situation and an actual result rather than a sentiment.'],
        { backbone: true, prerequisiteSkillKeys: ['COMMUNICATION'] }),
      t('T4_HR_QUESTIONS', 'The Questions That Always Come',
        ['BEHAVIORAL_INTERVIEW', 'SELF_INTRODUCTION'],
        ['Answer "tell me about yourself", a failure, a conflict and a motivation question without evasion.'],
        { backbone: true, prerequisiteSkillKeys: ['SELF_INTRODUCTION'] }),
      t('T4_COMM_PRESENT', 'Presenting Technical Work Aloud',
        ['TECHNICAL_COMMUNICATION', 'SPOKEN_ENGLISH_CONFIDENCE'],
        ['Present your own work to a room for five minutes and take the questions afterwards.'],
        { backbone: true, prerequisiteSkillKeys: ['TECHNICAL_COMMUNICATION'] }),
      t('T4_COMM_WRITTEN', 'Professional Writing',
        ['WRITTEN_COMMUNICATION_BASICS', 'TECHNICAL_WRITING'],
        ['Write the email, the follow-up and the status update a workplace will actually expect.'],
        { backbone: true }),
    ],
  },

  /* ══════════════ STAGE 7 — PORTFOLIO & EVIDENCE ══════════════ */
  {
    moduleCode: 'P21_PORTFOLIO',
    moduleName: 'Portfolio, Resume & Applications',
    displayOrder: 210,
    blurb: 'Turning three years of work into something a stranger can assess in ninety seconds.',
    topics: [
      t('T4_PORTFOLIO', 'Evidence Somebody Will Actually Look At',
        ['PORTFOLIO_EVIDENCE'],
        ['Get a repository, a README and a demo to the state where a reviewer can see the ability without asking.'],
        { backbone: true, prerequisiteSkillKeys: ['PORTFOLIO_EVIDENCE'] }),
      t('T4_RESUME', 'A Resume That Survives a Filter',
        ['INTERNSHIP_READINESS', 'PLACEMENT_READINESS'],
        ['Write a one-page resume whose claims are all checkable, and match it to a specific job description.'],
        { backbone: true, prerequisiteSkillKeys: ['INTERNSHIP_READINESS'] }),
      t('T4_APPLICATIONS', 'Applying, and Keeping Track',
        ['PLACEMENT_READINESS'],
        ['Run several applications at once — eligibility, deadlines, rounds and follow-ups — without losing one.'],
        { backbone: true }),
    ],
  },

  /* ══════════════ STAGE 8 — THE MOCK SERIES ══════════════
   *
   * The spec lists ten mocks. They are authored as three topics rather than ten because a mock is
   * a sitting, not a subject: the ten are units inside these, which is what lets the composer give
   * a strong student eight of them and a student still closing gaps four.
   */
  {
    moduleCode: 'P22_MOCKS',
    moduleName: 'Mock Interview Series',
    displayOrder: 220,
    blurb: 'Ten rehearsals, because the first real interview should not be the first interview.',
    topics: [
      t('T4_MOCK_TECHNICAL', 'Technical Mocks',
        ['INTERVIEW_PERFORMANCE'],
        ['Sit a timed technical interview end to end and act on what the debrief says.'],
        {
          backbone: true, defaultDepth: 'CHALLENGE',
          prerequisiteSkillKeys: ['TECHNICAL_INTERVIEW_PREP'],
        }),
      t('T4_MOCK_SPECIALIZATION', 'Project and Specialization Mocks',
        ['INTERVIEW_PERFORMANCE', 'TECHNICAL_EXPLANATION'],
        ['Be interviewed on your own project and your own direction, and hold up under the follow-up.'],
        {
          backbone: true, defaultDepth: 'CHALLENGE',
          prerequisiteSkillKeys: ['TECHNICAL_EXPLANATION'],
        }),
      t('T4_MOCK_HR', 'HR and Behavioural Mocks',
        ['INTERVIEW_PERFORMANCE', 'BEHAVIORAL_INTERVIEW'],
        ['Sit the HR round as a round rather than as a chat, and hear how the answers landed.'],
        {
          backbone: true, defaultDepth: 'CHALLENGE',
          prerequisiteSkillKeys: ['BEHAVIORAL_INTERVIEW'],
        }),
    ],
  },

  /* ══════════════ STAGE 9 — THE FULL SIMULATION ══════════════ */
  {
    moduleCode: 'P23_SIMULATION',
    moduleName: 'Final Placement Simulation',
    displayOrder: 230,
    blurb: 'Six rounds in order, on one day. The spec is explicit that it produces evidence per capability, never one opaque score.',
    topics: [
      t('T4_SIM_ROUNDS', 'The Six Rounds',
        ['PLACEMENT_READINESS', 'INTERVIEW_PERFORMANCE'],
        ['Run aptitude, technical MCQ, coding, technical interview, project interview and HR in sequence.'],
        {
          backbone: true, defaultDepth: 'CHALLENGE',
          prerequisiteSkillKeys: ['INTERVIEW_PERFORMANCE', 'PLACEMENT_READINESS'],
        }),
      t('T4_SIM_DEBRIEF', 'Reading Your Own Result',
        ['PLACEMENT_READINESS', 'SELF_LEARNING'],
        ['Turn a round-by-round result into the two or three things worth fixing before the real drive.'],
        { backbone: true, defaultDepth: 'CHALLENGE', prerequisiteSkillKeys: ['SELF_LEARNING'] }),
    ],
  },

  /* ══════════════ STAGE 10 — VERIFICATION ══════════════ */
  {
    moduleCode: 'P24_VERIFICATION',
    moduleName: 'Career Verification & Capstone',
    displayOrder: 240,
    blurb: 'Closing what the simulation found, and the last piece of work the whole year is judged by.',
    topics: [
      t('T4_VERIFY_GAPS', 'Remediating What Is Left',
        ['SELF_LEARNING', 'PLACEMENT_READINESS'],
        ['Close the specific gaps the simulation exposed, and know honestly which ones remain open.'],
        { backbone: true, defaultDepth: 'CHALLENGE', prerequisiteSkillKeys: ['SELF_LEARNING'] }),
      t('T4_CAPSTONE', 'The Capstone',
        ['PRODUCTION_ENGINEERING', 'TECHNICAL_EXPLANATION'],
        ['Deliver and defend one substantial piece of work that stands as the evidence for the year.'],
        {
          backbone: true, defaultDepth: 'CHALLENGE',
          prerequisiteSkillKeys: ['PRODUCTION_ENGINEERING', 'TECHNICAL_EXPLANATION'],
        }),
    ],
  },
];

/**
 * Every skill key this curriculum names, taught or required. The seed checks them against the
 * taxonomy and refuses on an unknown one, because a skill that exists only because somebody
 * mistyped it has no blueprint, no questions and no meaning — and would still join a student's
 * readiness calculation.
 */
export const placementReferencedSkillKeys = (): string[] => {
  const keys = new Set<string>();
  for (const mod of PLACEMENT_MODULES) {
    for (const topic of mod.topics) {
      (topic.skillKeys || []).forEach(k => keys.add(k));
      (topic.prerequisiteSkillKeys || []).forEach(k => keys.add(k));
    }
  }
  return [...keys].sort();
};
