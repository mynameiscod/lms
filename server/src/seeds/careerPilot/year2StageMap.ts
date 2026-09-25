import { FoundationModuleSeed } from './foundationSkillMap';

/**
 * The Year-2 curriculum, as modules and topics. Stage key: `build`.
 *
 * ── WHAT THIS IS ──────────────────────────────────────────────────────────────────────────
 *
 * The academic shape of Year 2, from CareerPilot_Year_2_Draft_Mega_Curriculum_V1: what is taught,
 * which skills each topic is about, what must come first, and who each topic is for. The units a
 * student actually meets are in year2MegaCurriculum; the days are composed per student.
 *
 * ── A BANK, WITH A BACKBONE ───────────────────────────────────────────────────────────────
 *
 * The draft is 24 modules and 298 subtopics. Measured against a day of study, teaching all of it
 * takes 232 to 287 hours — three hours a day for 90 days, which nobody does. So Year 2 works the
 * way Year 1 does: a mandatory backbone every student covers, and a larger bank the planner draws
 * from by evidence, direction and room. `UNIVERSAL` here means mandatory; `ENRICHMENT` means real
 * Year-2 material that is given where it fits rather than forced on everybody.
 *
 * The backbone was agreed with the product owner: OOP, data structures, algorithms, testing and
 * debugging, databases, web and APIs, security literacy, team Git, an engineering project, the
 * interview essentials, and the Year-2 verification.
 *
 * ── FUNDAMENTALS COME FIRST, PER SKILL ────────────────────────────────────────────────────
 *
 * `prerequisiteSkillKeys` are Year-1 skills. A student who has not shown one is taught it before
 * the topic that needs it — from the Year-1 units, which already exist and are already good. A
 * student who has shown it never sees it again. That is per skill, not per student: nobody repeats
 * a year because they were weak at one thing.
 *
 * ── SUBTOPICS ARE MERGED INTO UNITS DELIBERATELY ──────────────────────────────────────────
 *
 * The draft lists primary keys, foreign keys and cardinality as three subtopics; they are one good
 * lesson. Merging is what brings 298 subtopics to a bank a real programme can fit. See
 * year2MegaCurriculum for the units themselves.
 */

export const BUILD_STAGE_KEY = 'build';
export const BUILD_TITLE = 'CareerPilot Year 2 — Build';

export const BUILD_MODULES: FoundationModuleSeed[] = [
  {
    moduleCode: 'B01_BRIDGE',
    moduleName: 'Year-2 Readiness',
    displayOrder: 10,
    blurb: 'Proving the first-year fundamentals — briefly for those who have them, properly for those who do not.',
    topics: [
      {
        topicCode: 'T2_BRIDGE', title: 'Proving the Fundamentals',
        skillKeys: ['PROGRAMMING_FUNDAMENTALS', 'PROBLEM_SOLVING'], category: 'UNIVERSAL', applicableDirections: [],
        defaultDepth: 'STANDARD',
        learningOutcomes: ['Show that the first-year fundamentals are in place, or find out exactly where they are not.'],
        /*
         * THE FOURTEEN THIS TOPIC EXISTS TO CHECK.
         *
         * These are exactly the skills stageBridgePolicy calls BRIDGE_SKILLS.build — that list
         * was read off what this module was written to check, and until now the two were only
         * connected by a comment. Declaring them here is what makes them MEASURABLE: the stage
         * set is built from what topics teach and require, the entry paper can only ask about
         * what is in the stage set, and the bridge only counts a measured skill as a gap. With
         * them undeclared, eleven of the fourteen could never be asked, so they could never be
         * found missing, so they were never taught — a fresh second-year who could not write a
         * loop was silently assumed to be able to.
         *
         * This is also the first half of the TODO in stageBridgePolicy: with the dependency
         * authored here, that table can eventually be derived rather than maintained by hand.
         */
        prerequisiteSkillKeys: [
          'PROGRAMMING_FUNDAMENTALS', 'PYTHON_BASICS', 'CONDITIONALS_BASICS', 'LOOPS_BASICS',
          'FUNCTIONS_BASICS', 'PYTHON_STRINGS', 'DSA_ARRAYS',
          'PROBLEM_SOLVING', 'PSEUDOCODE_FLOWCHARTS',
          'GIT_FUNDAMENTALS', 'SHELL_COMMANDS', 'IDE_PROFICIENCY',
          'SQL_BASICS', 'DB_FUNDAMENTALS',
        ],
        backbone: true,
      },
    ],
  },
  {
    moduleCode: 'B02_OOP',
    moduleName: 'Object-Oriented Programming',
    displayOrder: 20,
    blurb: 'Modelling a problem as objects with state and behaviour.',
    topics: [
      /*
       * Two topics rather than one, so a student can prove half of it. Somebody comfortable with
       * classes and lost in polymorphism should be able to test out of the first and be taught the
       * second; one nine-unit topic can only be proven or taught whole.
       */
      {
        topicCode: 'T2_OOP_OBJECTS', title: 'Objects, Classes and State',
        skillKeys: ['OOP_CONCEPTS', 'PYTHON_OOP'], category: 'UNIVERSAL', applicableDirections: [],
        defaultDepth: 'FOUNDATION',
        learningOutcomes: ['Model a problem as objects that hold their own state and behaviour.'],
        prerequisiteSkillKeys: ['FUNCTIONS_BASICS', 'PYTHON_BASICS'],
        backbone: true,
      },
      {
        topicCode: 'T2_OOP_PRINCIPLES', title: 'Inheritance, Polymorphism and Abstraction',
        skillKeys: ['OOP_CONCEPTS'], category: 'UNIVERSAL', applicableDirections: [],
        defaultDepth: 'FOUNDATION',
        learningOutcomes: ['Reuse and extend behaviour without making a design nobody can follow.'],
        prerequisiteSkillKeys: ['FUNCTIONS_BASICS'],
        backbone: true,
      },
    ],
  },
  {
    moduleCode: 'B03_DSA',
    moduleName: 'Data Structures and Algorithms',
    displayOrder: 30,
    blurb: 'What to store data in, what it costs, and how to solve a problem under time pressure.',
    topics: [
      /* Split for the same reason as OOP: lists and stacks are proven long before trees are. */
      {
        topicCode: 'T2_DS_LINEAR', title: 'Lists, Stacks and Queues',
        skillKeys: ['DSA_ARRAYS', 'DSA_STRINGS', 'DSA_STACK', 'DSA_QUEUE', 'DSA_LINKED_LIST'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'FOUNDATION',
        learningOutcomes: ['Use the structures that keep things in order, and say what each costs.'],
        prerequisiteSkillKeys: ['DSA_ARRAYS', 'LOOPS_BASICS'],
        backbone: true,
      },
      {
        topicCode: 'T2_DS_KEYED', title: 'Maps, Sets and Trees',
        skillKeys: ['DSA_HASHING', 'DSA_TREES'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'FOUNDATION',
        learningOutcomes: ['Look something up without searching for it, and say when a tree is the right shape.'],
        prerequisiteSkillKeys: ['LOOPS_BASICS'],
        backbone: true,
      },
      {
        topicCode: 'T2_ALGORITHMS', title: 'Algorithms and What They Cost',
        skillKeys: ['DSA_SEARCHING', 'DSA_SORTING', 'DSA_RECURSION', 'DSA_COMPLEXITY'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'FOUNDATION',
        learningOutcomes: ['Search, sort and recurse — and explain the cost of what you wrote.'],
        prerequisiteSkillKeys: ['LOOPS_BASICS', 'FUNCTIONS_BASICS'],
        backbone: true,
      },
      {
        topicCode: 'T2_DSA_INTERVIEW', title: 'Problems the Way Interviews Ask Them',
        skillKeys: ['DSA_COMPLEXITY', 'PATTERN_RECOGNITION', 'TECHNICAL_INTERVIEW_PREP'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'STANDARD',
        learningOutcomes: ['Read a problem, reach a working answer, improve it, and explain the trade-off out loud.'],
        prerequisiteSkillKeys: ['PROBLEM_SOLVING'],
        backbone: true,
      },
    ],
  },
  {
    moduleCode: 'B04_PROGRAMMING',
    moduleName: 'Intermediate Programming',
    displayOrder: 40,
    blurb: 'Programs made of more than one file, that survive bad input and can be changed later.',
    topics: [
      {
        topicCode: 'T2_PY_STRUCTURE', title: 'Programs Made of Many Files',
        skillKeys: ['PYTHON_MODULES'], category: 'ENRICHMENT', applicableDirections: [], defaultDepth: 'FOUNDATION',
        learningOutcomes: ['Split a program across modules and packages, and run it in its own environment.'],
        prerequisiteSkillKeys: ['PYTHON_BASICS', 'FUNCTIONS_BASICS'],
      },
      {
        topicCode: 'T2_PY_ROBUST', title: 'Files, Errors and Structured Data',
        skillKeys: ['PYTHON_ERROR_HANDLING', 'PYTHON_COLLECTIONS'], category: 'ENRICHMENT', applicableDirections: [],
        defaultDepth: 'FOUNDATION',
        learningOutcomes: ['Read and write real files, handle what goes wrong, and work with JSON.'],
        prerequisiteSkillKeys: ['PYTHON_BASICS'],
      },
      {
        topicCode: 'T2_CLEAN_CODE', title: 'Code Another Person Can Change',
        skillKeys: ['CLEAN_CODE', 'CODE_REVIEW'], category: 'ENRICHMENT', applicableDirections: [],
        defaultDepth: 'STANDARD',
        learningOutcomes: ['Write and review code somebody else can pick up without asking you.'],
        prerequisiteSkillKeys: ['PROGRAMMING_FUNDAMENTALS'],
      },
    ],
  },
  {
    moduleCode: 'B05_TESTING',
    moduleName: 'Testing and Debugging',
    displayOrder: 50,
    blurb: 'Proving software works, and finding out why it does not.',
    topics: [
      {
        topicCode: 'T2_DEBUGGING', title: 'Finding the Cause, Not the Symptom',
        skillKeys: ['DEBUGGING'], category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'STANDARD',
        learningOutcomes: ['Diagnose and repair a program somebody else wrote.'],
        prerequisiteSkillKeys: ['PROGRAMMING_FUNDAMENTALS'],
        backbone: true,
      },
      {
        topicCode: 'T2_TESTING', title: 'Tests That Catch Real Mistakes',
        skillKeys: ['TESTING_FUNDAMENTALS'], category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'FOUNDATION',
        learningOutcomes: ['Write tests for the cases that break software, not only the case that works.'],
        prerequisiteSkillKeys: ['FUNCTIONS_BASICS'],
        backbone: true,
      },
    ],
  },
  {
    moduleCode: 'B06_COLLABORATION',
    moduleName: 'Working With Others',
    displayOrder: 60,
    blurb: 'A shared repository, and the machine the work runs on.',
    topics: [
      {
        topicCode: 'T2_GIT_TEAM', title: 'One Repository, Several People',
        skillKeys: ['GIT_BRANCHING'], category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'FOUNDATION',
        learningOutcomes: ['Work on a branch, open a pull request, review one, and resolve a conflict.'],
        prerequisiteSkillKeys: ['GIT_FUNDAMENTALS'],
        backbone: true,
      },
      {
        topicCode: 'T2_LINUX', title: 'The Machine Your Code Runs On',
        skillKeys: ['SHELL_PIPELINES', 'OS_PROCESSES'], category: 'ENRICHMENT', applicableDirections: [],
        defaultDepth: 'STANDARD',
        learningOutcomes: ['Work confidently on a Linux machine, and fix your own environment.'],
        prerequisiteSkillKeys: ['SHELL_COMMANDS', 'FILE_SYSTEMS_PERMISSIONS'],
      },
    ],
  },
  {
    moduleCode: 'B07_DATABASES',
    moduleName: 'Database Engineering',
    displayOrder: 70,
    blurb: 'Asking real questions of data, and designing where it lives.',
    topics: [
      {
        topicCode: 'T2_DB_QUERY', title: 'Asking Real Questions of a Database',
        skillKeys: ['SQL_FILTERING', 'SQL_JOINS'], category: 'UNIVERSAL', applicableDirections: [],
        defaultDepth: 'FOUNDATION',
        learningOutcomes: ['Answer a question that spans several tables, and know why the answer is right.'],
        prerequisiteSkillKeys: ['SQL_BASICS'],
        backbone: true,
      },
      {
        topicCode: 'T2_DB_DESIGN', title: 'Designing Where Data Lives',
        skillKeys: ['DB_DESIGN', 'DB_NORMALIZATION', 'DB_TRANSACTIONS'], category: 'UNIVERSAL', applicableDirections: [],
        defaultDepth: 'FOUNDATION',
        learningOutcomes: ['Model entities into a schema that will not corrupt itself.'],
        prerequisiteSkillKeys: ['DB_FUNDAMENTALS'],
        backbone: true,
      },
    ],
  },
  {
    moduleCode: 'B08_WEB_APIS',
    moduleName: 'The Web and APIs',
    displayOrder: 80,
    blurb: 'How programs talk to each other over the internet.',
    topics: [
      {
        topicCode: 'T2_WEB_HTTP', title: 'How the Internet Carries a Request',
        skillKeys: ['HTTP', 'COMPUTER_NETWORKS'], category: 'UNIVERSAL', applicableDirections: [],
        defaultDepth: 'GUIDED',
        learningOutcomes: ['Follow a request from a browser to a server and back, and read what it carried.'],
        backbone: true,
      },
      {
        topicCode: 'T2_APIS', title: 'Working With APIs',
        skillKeys: ['REST_APIS', 'API_FUNDAMENTALS'], category: 'UNIVERSAL', applicableDirections: [],
        defaultDepth: 'FOUNDATION',
        learningOutcomes: ['Consume an API, read its errors, and say what makes one usable.'],
        prerequisiteSkillKeys: ['HTTP'],
        backbone: true,
      },
    ],
  },
  {
    moduleCode: 'B09_SECURITY',
    moduleName: 'Secure Engineering',
    displayOrder: 90,
    blurb: 'The security every engineer needs, whatever they build.',
    topics: [
      {
        topicCode: 'T2_SECURITY', title: 'Building Software That Does Not Leak',
        skillKeys: ['SECURITY_FUNDAMENTALS'], category: 'UNIVERSAL', applicableDirections: [],
        defaultDepth: 'FOUNDATION',
        learningOutcomes: ['Recognise the mistakes that cause most breaches, and write code without them.'],
        backbone: true,
      },
    ],
  },
  {
    moduleCode: 'B10_AI',
    moduleName: 'Building With AI',
    displayOrder: 100,
    blurb: 'Using AI to work faster without losing the understanding underneath.',
    topics: [
      {
        topicCode: 'T2_AI_ASSISTED', title: 'AI as a Tool, Not an Author',
        skillKeys: ['AI_ASSISTED_CODING', 'AI_RESPONSIBLE_USE'], category: 'ENRICHMENT', applicableDirections: [],
        defaultDepth: 'STANDARD',
        learningOutcomes: ['Use an assistant to go faster, and catch it when it is wrong.'],
        prerequisiteSkillKeys: ['PROGRAMMING_FUNDAMENTALS'],
      },
    ],
  },
  {
    moduleCode: 'B11_DIRECTIONS',
    moduleName: 'Your Direction',
    displayOrder: 110,
    blurb: 'Choosing a direction, then going deep in it.',
    topics: [
      {
        topicCode: 'T2_DIRECTION', title: 'Choosing Where You Are Heading',
        skillKeys: ['TECH_CAREER_AWARENESS'], category: 'EXPLORATION', applicableDirections: [],
        defaultDepth: 'STANDARD',
        learningOutcomes: ['Choose a direction for the year, with a reason you could defend.'],
      },
      {
        topicCode: 'T2_TRACK_BACKEND', title: 'Backend Development',
        skillKeys: ['SERVER_SIDE_BASICS', 'REST_APIS'], category: 'DIRECTION', applicableDirections: ['SOFTWARE_BACKEND'],
        defaultDepth: 'FOUNDATION',
        learningOutcomes: ['Build an API with authentication, validation, storage and tests.'],
        prerequisiteSkillKeys: ['HTTP', 'SQL_BASICS'],
      },
      {
        topicCode: 'T2_TRACK_FRONTEND', title: 'Frontend Development',
        skillKeys: ['JS_BASICS', 'JS_DOM', 'JS_ASYNC'], category: 'DIRECTION', applicableDirections: ['WEB_DEVELOPMENT'],
        defaultDepth: 'FOUNDATION',
        learningOutcomes: ['Build an interface that fetches real data and handles every state of it.'],
        prerequisiteSkillKeys: ['HTML', 'CSS'],
      },
      {
        topicCode: 'T2_TRACK_DATA', title: 'Data and Analytics',
        skillKeys: ['DATA_WRANGLING', 'PROBABILITY_STATISTICS'], category: 'DIRECTION', applicableDirections: ['DATA'],
        defaultDepth: 'FOUNDATION',
        learningOutcomes: ['Take a real dataset from raw file to a conclusion somebody can act on.'],
        prerequisiteSkillKeys: ['PYTHON_BASICS', 'SQL_BASICS'],
      },
      {
        topicCode: 'T2_TRACK_AI', title: 'Machine Learning Foundations',
        skillKeys: ['AI_ML_CONCEPTS'], category: 'DIRECTION', applicableDirections: ['AI_ML'],
        defaultDepth: 'FOUNDATION',
        learningOutcomes: ['Train, evaluate and explain a simple model, and say where it would fail.'],
        prerequisiteSkillKeys: ['PYTHON_BASICS', 'PROBABILITY_STATISTICS'],
      },
      {
        topicCode: 'T2_TRACK_MOBILE', title: 'Mobile Development',
        skillKeys: ['MOBILE_APP_BASICS'], category: 'DIRECTION', applicableDirections: ['MOBILE'],
        defaultDepth: 'FOUNDATION',
        learningOutcomes: ['Build a multi-screen app that works on a bad connection.'],
        prerequisiteSkillKeys: ['PROGRAMMING_FUNDAMENTALS'],
      },
      {
        topicCode: 'T2_TRACK_CLOUD', title: 'Cloud and DevOps',
        skillKeys: ['CLOUD_FUNDAMENTALS', 'DEVOPS_FUNDAMENTALS'], category: 'DIRECTION', applicableDirections: ['CLOUD_DEVOPS'],
        defaultDepth: 'FOUNDATION',
        learningOutcomes: ['Put an application online, and know what happens when it breaks at 3am.'],
        prerequisiteSkillKeys: ['SHELL_COMMANDS', 'COMPUTER_NETWORKS'],
      },
      {
        topicCode: 'T2_TRACK_SECURITY', title: 'Cybersecurity',
        skillKeys: ['SECURITY_FUNDAMENTALS', 'COMPUTER_NETWORKS'], category: 'DIRECTION', applicableDirections: ['CYBERSECURITY'],
        defaultDepth: 'STANDARD',
        learningOutcomes: ['Test a system you are authorised to test, and report what you find properly.'],
        prerequisiteSkillKeys: ['COMPUTER_NETWORKS'],
      },
    ],
  },
  {
    moduleCode: 'B12_PROJECTS',
    moduleName: 'Engineering Projects',
    displayOrder: 120,
    blurb: 'Year 2 is where the building happens.',
    topics: [
      {
        topicCode: 'T2_PROJECTS', title: 'Building Something Real',
        skillKeys: ['PROBLEM_SOLVING', 'CLEAN_CODE'], category: 'UNIVERSAL', applicableDirections: [],
        defaultDepth: 'STANDARD',
        learningOutcomes: ['Take a project from an idea to something running, and explain every decision in it.'],
        prerequisiteSkillKeys: ['PROGRAMMING_FUNDAMENTALS'],
        backbone: true,
      },
    ],
  },
  {
    moduleCode: 'B13_PROFESSIONAL',
    moduleName: 'Being Hireable',
    displayOrder: 130,
    blurb: 'Explaining your work, showing it, and applying for the first internship.',
    topics: [
      {
        topicCode: 'T2_COMMUNICATION', title: 'Explaining Technical Work',
        skillKeys: ['TECHNICAL_COMMUNICATION', 'TECHNICAL_EXPLANATION'], category: 'ENRICHMENT', applicableDirections: [],
        defaultDepth: 'STANDARD',
        learningOutcomes: ['Explain what you built, and why, to somebody who was not there.'],
      },
      {
        topicCode: 'T2_PORTFOLIO', title: 'A Portfolio That Shows Evidence',
        skillKeys: ['PORTFOLIO_EVIDENCE'], category: 'ENRICHMENT', applicableDirections: [],
        defaultDepth: 'STANDARD',
        learningOutcomes: ['Show what you can do through work somebody can open, not claims on a page.'],
        prerequisiteSkillKeys: ['GIT_FUNDAMENTALS'],
      },
      {
        topicCode: 'T2_INTERNSHIP', title: 'Ready for an Internship',
        skillKeys: ['INTERNSHIP_READINESS'], category: 'ENRICHMENT', applicableDirections: [],
        defaultDepth: 'STANDARD',
        learningOutcomes: ['Read a job description, match yourself to it honestly, and apply.'],
      },
    ],
  },
  {
    moduleCode: 'B14_VERIFICATION',
    moduleName: 'Year-2 Verification',
    displayOrder: 140,
    blurb: 'What the year proved, checked rather than claimed.',
    topics: [
      {
        topicCode: 'T2_VERIFICATION', title: 'Showing What the Year Built',
        skillKeys: ['PROBLEM_SOLVING'], category: 'UNIVERSAL', applicableDirections: [],
        defaultDepth: 'REVISION',
        learningOutcomes: ['Demonstrate, in one piece of work and one review, what the year actually taught you.'],
        backbone: true,
      },
    ],
  },
];

/** Every skill key the Year-2 map refers to, for the seed to check against the catalogue. */
export const buildReferencedSkillKeys = (): string[] => [
  ...new Set(BUILD_MODULES.flatMap(m => m.topics.flatMap(t => [...t.skillKeys, ...(t.prerequisiteSkillKeys || [])]))),
].sort();

/** The mandatory Year-2 backbone, in authored order. */
export const buildBackboneTopicCodes = (): string[] =>
  BUILD_MODULES.flatMap(m => m.topics.filter(t => t.backbone).map(t => t.topicCode));
