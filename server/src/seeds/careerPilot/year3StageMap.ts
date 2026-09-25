import { FoundationModuleSeed } from './foundationSkillMap';

/**
 * The Year-3 curriculum, as modules and topics. Stage key: `specialize`.
 *
 * ── WHAT THIS IS ──────────────────────────────────────────────────────────────────────────
 *
 * The academic shape of Year 3, from CareerPilot_Year_3_Mega_Curriculum_V2: what is taught,
 * which skills each topic is about, what must come first, and who each topic is for. The units a
 * student actually meets are in year3MegaCurriculum; the days are composed per student.
 *
 * ── WHAT YEAR 3 IS FOR ────────────────────────────────────────────────────────────────────
 *
 * Year 1 builds foundations. Year 2 builds engineering capability. Year 3 turns that into
 * something an employer can check: production depth, one chosen direction, real projects, a
 * portfolio and an internship. The spec's own phrase for it is career proof.
 *
 * ── THE SPEC'S KEY INVARIANT, AND WHERE IT LIVES ──────────────────────────────────────────
 *
 * "Academic year does not equal mastery. Evidence controls treatment."
 *
 * That is not enforced here. This file is the bank; the composer decides what any one student
 * is given from it, out of their Skill DNA. A student who has proved OOP does not meet the OOP
 * topics again; one who has not is taught them. Nothing in this file says "third year, therefore
 * ready", and nothing in it should.
 *
 * ── A BANK, WITH A BACKBONE — AND A COMPULSORY DIRECTION ──────────────────────────────────
 *
 * Same shape as Year 2: `UNIVERSAL` means mandatory, `ENRICHMENT` means real Year-3 material
 * given where it fits. The spec's 25 modules and ~375 bullets are far more than any programme
 * length holds, so most of it is a bank.
 *
 * Year 3 differs from Year 2 in one important way. In Year 2 a direction was a preference that
 * filtered enrichment. In Year 3 the direction IS the year — the product owner was explicit that
 * role-related courses are compulsory. So the specialization modules (S12 to S19) are authored
 * as `DIRECTION` with a non-empty applicableDirections list, and every student gets exactly one
 * of those tracks in full rather than a sampling of several.
 *
 * ── PREREQUISITES ARE YEAR-2 SKILLS, AND THEY ARE REAL ────────────────────────────────────
 *
 * `prerequisiteSkillKeys` here name Year-1 and Year-2 skills. A student who has not shown one is
 * taught it first, from the Year-1/Year-2 units that already exist — that is the bridge, and for
 * Year 3 it must be able to reach back through BOTH earlier years, which is a change to
 * stageBridgePolicy rather than something this file can express.
 *
 * Note the honest limit, measured during Year 2: borrowing works well for partial gaps and
 * cannot rescue somebody who has no programming at all. The ladder behind a total beginner is
 * hundreds of units and a bridge is a few dozen. For that student the truthful answer is Year 1.
 *
 * ── SUBTOPICS ARE MERGED INTO TOPICS DELIBERATELY ─────────────────────────────────────────
 *
 * The spec lists "Authentication", "Authorization", "Sessions/tokens" and "Identity" as four
 * bullets across two modules. They are one coherent run of teaching. Merging is what brings ~375
 * bullets down to something a real programme can hold.
 */

export const SPECIALIZE_STAGE_KEY = 'specialize';
export const SPECIALIZE_TITLE = 'CareerPilot Year 3 — Specialize';

export const SPECIALIZE_MODULES: FoundationModuleSeed[] = [
  /* ══════════════ STAGE 1 — ENGINEERING DEPTH & READINESS ══════════════ */
  {
    moduleCode: 'S01_READINESS',
    moduleName: 'Year-3 Readiness & Technical Bridge',
    displayOrder: 10,
    blurb: 'Finding out what is actually in place before anything advanced is opened. Briefly for those who have it, properly for those who do not.',
    topics: [
      {
        topicCode: 'T3_READINESS', title: 'Where You Actually Stand',
        skillKeys: ['PROGRAMMING_FUNDAMENTALS', 'PROBLEM_SOLVING'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'STANDARD',
        learningOutcomes: [
          'Show what is in place across programming, OOP, data structures, databases and the web, or find out exactly where it is not.',
        ],
        backbone: true,
      },
      {
        topicCode: 'T3_GAP_PLAN', title: 'Your Remediation Plan',
        // NOT SELF_LEARNING, deliberately. Year 1 moved that mapping off its topics with the
        // note that it "is a habit rather than something a paper can ask about", and it is
        // flagged non-assessable in the taxonomy for the same reason. A topic built on it would
        // sit in the stage set unmeasurable. What this topic actually teaches is reading your
        // own evidence and saying what you will do about it, which is communication and career
        // awareness, and both of those can be asked about.
        skillKeys: ['TECHNICAL_COMMUNICATION', 'TECH_CAREER_AWARENESS'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'STANDARD',
        learningOutcomes: [
          'Read your own diagnostic honestly and know which gaps are being taught before the advanced work opens.',
        ],
        backbone: true,
      },
    ],
  },
  {
    moduleCode: 'S02_ADV_PROGRAMMING',
    moduleName: 'Advanced Programming & Software Design',
    displayOrder: 20,
    blurb: 'Writing code that another engineer can change safely a year from now.',
    topics: [
      {
        topicCode: 'T3_ADV_OOP', title: 'Composition, Interfaces and Abstraction',
        skillKeys: ['OOP_CONCEPTS', 'DESIGN_PATTERNS'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'CHALLENGE',
        learningOutcomes: [
          'Choose composition over inheritance where it fits, and defend the choice.',
          'Use an interface to decouple two things that would otherwise have to change together.',
        ],
        prerequisiteSkillKeys: ['OOP_CONCEPTS', 'PYTHON_OOP'],
        backbone: true,
      },
      {
        topicCode: 'T3_PATTERNS', title: 'Design Patterns Worth Knowing',
        skillKeys: ['DESIGN_PATTERNS'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'CHALLENGE',
        learningOutcomes: [
          'Recognise strategy, factory, observer and adapter in code you did not write.',
          'Say when a pattern is more machinery than the problem deserves.',
        ],
        prerequisiteSkillKeys: ['OOP_CONCEPTS'],
        backbone: true,
      },
      {
        topicCode: 'T3_ERROR_DESIGN', title: 'Designing What Happens When It Fails',
        skillKeys: ['ERROR_HANDLING_DESIGN', 'LOGGING_DIAGNOSTICS'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'STANDARD',
        learningOutcomes: [
          'Decide what fails loudly, what retries, what degrades, and what the caller is told.',
          'Leave enough in the log that the failure can be explained without reproducing it.',
        ],
        prerequisiteSkillKeys: ['PYTHON_ERROR_HANDLING'],
        backbone: true,
      },
      {
        topicCode: 'T3_DEPENDENCIES', title: 'Configuration and Dependencies',
        skillKeys: ['DEPENDENCY_MANAGEMENT'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'STANDARD',
        learningOutcomes: [
          'Keep configuration out of code, and know what adding a library commits you to.',
        ],
        prerequisiteSkillKeys: ['PYTHON_MODULES'],
      },
      {
        topicCode: 'T3_COMPLEX_DEBUG', title: 'Debugging What You Cannot Reproduce',
        skillKeys: ['DEBUGGING', 'LOGGING_DIAGNOSTICS'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'CHALLENGE',
        learningOutcomes: [
          'Work from evidence to cause in a system too large to hold in your head.',
        ],
        prerequisiteSkillKeys: ['DEBUGGING'],
        backbone: true,
      },
    ],
  },
  {
    moduleCode: 'S03_ADV_DSA',
    moduleName: 'Advanced Data Structures',
    displayOrder: 30,
    blurb: 'The structures that make hard problems tractable, and knowing which one a problem is asking for.',
    topics: [
      {
        topicCode: 'T3_TREES_BST', title: 'Trees and Binary Search Trees',
        skillKeys: ['DSA_TREES'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'CHALLENGE',
        learningOutcomes: ['Implement and traverse a tree, and say what a BST buys and what it costs when unbalanced.'],
        prerequisiteSkillKeys: ['DSA_RECURSION', 'DSA_TREES'],
        backbone: true,
      },
      {
        topicCode: 'T3_HEAPS', title: 'Heaps and Priority Queues',
        skillKeys: ['DSA_HEAPS'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'CHALLENGE',
        learningOutcomes: ['Keep the next-most-important item cheap to reach, and recognise the problems that shape solves.'],
        prerequisiteSkillKeys: ['DSA_TREES'],
        backbone: true,
      },
      {
        topicCode: 'T3_GRAPHS', title: 'Graphs, BFS and DFS',
        skillKeys: ['DSA_GRAPHS'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'CHALLENGE',
        learningOutcomes: [
          'Represent a graph two ways and say which fits the question.',
          'Walk it breadth-first and depth-first, and know which answers which question.',
        ],
        prerequisiteSkillKeys: ['DSA_QUEUE', 'DSA_STACK', 'DSA_RECURSION'],
        backbone: true,
      },
      {
        topicCode: 'T3_CHOOSING_STRUCTURES', title: 'Choosing a Structure Under Constraints',
        skillKeys: ['DSA_COMPLEXITY', 'DSA_HASHING'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'CHALLENGE',
        learningOutcomes: ['Argue a structure choice from the operations the problem actually performs most.'],
        prerequisiteSkillKeys: ['DSA_COMPLEXITY', 'DSA_HASHING'],
        backbone: true,
      },
    ],
  },
  {
    moduleCode: 'S04_ADV_ALGORITHMS',
    moduleName: 'Advanced Algorithms & Complexity',
    displayOrder: 40,
    blurb: 'Designing an approach against real constraints, then arguing what it costs.',
    topics: [
      {
        topicCode: 'T3_ALGO_DESIGN', title: 'Designing an Algorithm From Constraints',
        skillKeys: ['ALGORITHM_DESIGN', 'DSA_COMPLEXITY'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'CHALLENGE',
        learningOutcomes: ['Read the constraints first and let them narrow the approach before any code is written.'],
        prerequisiteSkillKeys: ['DSA_COMPLEXITY'],
        backbone: true,
      },
      {
        topicCode: 'T3_DIVIDE_CONQUER', title: 'Divide and Conquer',
        skillKeys: ['DSA_DIVIDE_CONQUER'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'CHALLENGE',
        learningOutcomes: ['Split a problem until it is trivial and state the recurrence that says what it cost.'],
        prerequisiteSkillKeys: ['DSA_RECURSION', 'DSA_SORTING'],
        backbone: true,
      },
      {
        topicCode: 'T3_GREEDY_DP', title: 'Greedy Choices and Dynamic Programming',
        skillKeys: ['DSA_GREEDY', 'DSA_DP'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'CHALLENGE',
        learningOutcomes: [
          'Tell when a greedy choice is provably safe and when it quietly is not.',
          'Recognise overlapping subproblems and write the recurrence before the table.',
        ],
        prerequisiteSkillKeys: ['DSA_RECURSION'],
        backbone: true,
      },
      {
        topicCode: 'T3_GRAPH_ALGORITHMS', title: 'Graph Algorithms',
        skillKeys: ['DSA_GRAPHS', 'ALGORITHM_DESIGN'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'CHALLENGE',
        learningOutcomes: ['Apply shortest path and topological ordering to a problem that was not described as a graph.'],
        prerequisiteSkillKeys: ['DSA_GRAPHS'],
      },
      {
        topicCode: 'T3_TIMED_PRACTICE', title: 'Solving Under Time',
        skillKeys: ['PROBLEM_SOLVING', 'TECHNICAL_EXPLANATION'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'CHALLENGE',
        learningOutcomes: ['Work a problem to a correct answer under a clock, explaining the approach as you go.'],
        prerequisiteSkillKeys: ['PROBLEM_SOLVING'],
        backbone: true,
      },
    ],
  },
  {
    moduleCode: 'S05_SOFTWARE_ENGINEERING',
    moduleName: 'Software Engineering Fundamentals',
    displayOrder: 50,
    blurb: 'The decisions that are cheap now and expensive to reverse later.',
    topics: [
      {
        topicCode: 'T3_ARCHITECTURE', title: 'Layers, Boundaries and Separation of Concerns',
        skillKeys: ['SOFTWARE_ARCHITECTURE'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'CHALLENGE',
        learningOutcomes: [
          'Draw the layers of an application and say what each one may and may not know about.',
        ],
        prerequisiteSkillKeys: ['SYSTEM_DESIGN_BASICS', 'CLEAN_CODE'],
        backbone: true,
      },
      {
        topicCode: 'T3_REFACTORING', title: 'Refactoring Without Breaking It',
        skillKeys: ['REFACTORING', 'TECHNICAL_DEBT'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'CHALLENGE',
        learningOutcomes: [
          'Change the shape of working code in steps that each stay green.',
          'Name the cost of a shortcut, and decide when to take one and when to pay it back.',
        ],
        prerequisiteSkillKeys: ['CLEAN_CODE', 'TESTING_FUNDAMENTALS'],
        backbone: true,
      },
      {
        topicCode: 'T3_CODE_REVIEW_DEPTH', title: 'Reviewing Other People’s Code',
        skillKeys: ['CODE_REVIEW', 'TECHNICAL_COMMUNICATION'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'STANDARD',
        learningOutcomes: ['Review a change so that the defect gets fixed and the author stays willing to send you the next one.'],
        prerequisiteSkillKeys: ['CODE_REVIEW'],
        backbone: true,
      },
      {
        topicCode: 'T3_DOCUMENTATION', title: 'Documentation and Decision Records',
        skillKeys: ['TECHNICAL_WRITING'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'STANDARD',
        learningOutcomes: ['Write down why a decision was taken, so the next engineer does not undo it by accident.'],
        prerequisiteSkillKeys: ['TECHNICAL_COMMUNICATION'],
      },
    ],
  },
  {
    moduleCode: 'S06_TESTING',
    moduleName: 'Testing, Quality & Reliability',
    displayOrder: 60,
    blurb: 'Tests that run unattended, fail for one reason, and are worth the time they cost.',
    topics: [
      {
        topicCode: 'T3_TEST_DESIGN', title: 'Designing a Test Suite',
        skillKeys: ['AUTOMATED_TESTING', 'TESTING_FUNDAMENTALS'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'CHALLENGE',
        learningOutcomes: [
          'Choose unit, integration and boundary tests deliberately rather than by habit.',
          'Write a negative test that would actually have caught the bug.',
        ],
        prerequisiteSkillKeys: ['TESTING_FUNDAMENTALS'],
        backbone: true,
      },
      {
        topicCode: 'T3_TEST_ISOLATION', title: 'Isolation, Mocking and Flakiness',
        skillKeys: ['AUTOMATED_TESTING'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'CHALLENGE',
        learningOutcomes: ['Isolate the thing under test without mocking so much that the test proves nothing.'],
        prerequisiteSkillKeys: ['TESTING_FUNDAMENTALS'],
      },
      {
        topicCode: 'T3_RELIABILITY', title: 'Logging, Diagnostics and Reliability',
        skillKeys: ['LOGGING_DIAGNOSTICS', 'MONITORING_OBSERVABILITY'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'STANDARD',
        learningOutcomes: ['Know a system is unwell before a user reports it, and say which signal told you.'],
        prerequisiteSkillKeys: ['DEBUGGING'],
        backbone: true,
      },
    ],
  },
  {
    moduleCode: 'S07_DATABASE_ENGINEERING',
    moduleName: 'Database & Data Engineering',
    displayOrder: 70,
    blurb: 'Making a database fast and correct under load, not just correct on a laptop.',
    topics: [
      {
        topicCode: 'T3_QUERY_PERF', title: 'Indexes, Plans and Query Performance',
        skillKeys: ['QUERY_OPTIMIZATION', 'DB_INDEXING'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'CHALLENGE',
        learningOutcomes: [
          'Read a query plan and say which change actually moved the number.',
          'Add an index for a reason, and know what it costs on write.',
        ],
        prerequisiteSkillKeys: ['SQL_JOINS', 'DB_INDEXING'],
        backbone: true,
      },
      {
        topicCode: 'T3_TRANSACTIONS_INTEGRITY', title: 'Transactions, Constraints and Integrity',
        skillKeys: ['DB_TRANSACTIONS', 'DB_DESIGN'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'CHALLENGE',
        learningOutcomes: ['Keep data correct when two things happen at once, and let the database enforce what it can.'],
        prerequisiteSkillKeys: ['DB_TRANSACTIONS', 'DB_NORMALIZATION'],
        backbone: true,
      },
      {
        topicCode: 'T3_CACHING_NOSQL', title: 'Caching and NoSQL',
        skillKeys: ['CACHING', 'NOSQL_CONCEPTS'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'STANDARD',
        learningOutcomes: [
          'Decide what is safe to cache and for how long. Invalidation is the hard half.',
          'Say what a document store gives up for what, and when relational is still right.',
        ],
        prerequisiteSkillKeys: ['DB_DESIGN'],
      },
    ],
  },
  {
    moduleCode: 'S08_WEB_API',
    moduleName: 'Web & API Engineering',
    displayOrder: 80,
    blurb: 'APIs other people have to live with, and the auth that protects them.',
    topics: [
      {
        topicCode: 'T3_API_DESIGN', title: 'Designing an API Callers Can Live With',
        skillKeys: ['API_DESIGN', 'REST_APIS'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'CHALLENGE',
        learningOutcomes: [
          'Choose resources, versioning, pagination and filtering deliberately.',
          'Return an error a caller can act on rather than one they have to guess at.',
        ],
        prerequisiteSkillKeys: ['REST_APIS', 'HTTP'],
        backbone: true,
      },
      {
        topicCode: 'T3_AUTH', title: 'Authentication and Authorization',
        skillKeys: ['AUTHENTICATION', 'AUTHORIZATION'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'CHALLENGE',
        learningOutcomes: [
          'Prove who is calling, with sessions or tokens, and know where each is kept and when it expires.',
          'Check what that proven caller may actually do. This is the check that is missed most often.',
        ],
        prerequisiteSkillKeys: ['HTTP', 'SECURITY_FUNDAMENTALS'],
        backbone: true,
      },
      {
        topicCode: 'T3_API_HARDENING', title: 'Validation, Rate Limiting and Documentation',
        skillKeys: ['API_DESIGN', 'WEB_SECURITY'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'STANDARD',
        learningOutcomes: ['Validate every request at the boundary, and document the API so somebody else can call it.'],
        prerequisiteSkillKeys: ['REST_APIS'],
      },
    ],
  },
  {
    moduleCode: 'S09_INFRASTRUCTURE',
    moduleName: 'Linux, Cloud & Developer Infrastructure',
    displayOrder: 90,
    blurb: 'Running software on a machine nobody has a desktop on.',
    topics: [
      {
        topicCode: 'T3_LINUX', title: 'Linux for Engineers',
        skillKeys: ['LINUX_ADMINISTRATION'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'STANDARD',
        learningOutcomes: ['Work with services, processes, ports, SSH and logs on a remote machine.'],
        prerequisiteSkillKeys: ['SHELL_COMMANDS', 'OS_PROCESSES'],
        backbone: true,
      },
      {
        topicCode: 'T3_CONTAINERS', title: 'Containers and Docker',
        skillKeys: ['CONTAINERS_DOCKER'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'CHALLENGE',
        learningOutcomes: ['Package an application with what it needs so it runs the same off your machine.'],
        prerequisiteSkillKeys: ['SHELL_COMMANDS'],
        backbone: true,
      },
      {
        topicCode: 'T3_DEPLOYMENT', title: 'Deploying, and Undeploying',
        skillKeys: ['DEPLOYMENT', 'CI_CD'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'CHALLENGE',
        learningOutcomes: [
          'Get a build in front of real users through a pipeline rather than by hand.',
          'Get it back off again when it is wrong, without losing data.',
        ],
        prerequisiteSkillKeys: ['GIT_BRANCHING', 'DEVOPS_FUNDAMENTALS'],
        backbone: true,
      },
    ],
  },
  {
    moduleCode: 'S10_SECURITY',
    moduleName: 'Security Engineering',
    displayOrder: 100,
    blurb: 'Thinking like someone who wants your system to misbehave.',
    topics: [
      {
        topicCode: 'T3_THREAT_MODELING', title: 'Threat Modelling',
        skillKeys: ['THREAT_MODELING'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'CHALLENGE',
        learningOutcomes: ['Ask what an attacker wants and find where the system would let them have it.'],
        prerequisiteSkillKeys: ['SECURITY_FUNDAMENTALS'],
        backbone: true,
      },
      {
        topicCode: 'T3_WEB_SECURITY', title: 'Injection, XSS and CSRF',
        skillKeys: ['WEB_SECURITY'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'CHALLENGE',
        learningOutcomes: ['Recognise and prevent the handful of attacks that account for most real breaches.'],
        prerequisiteSkillKeys: ['SECURITY_FUNDAMENTALS', 'HTTP'],
        backbone: true,
      },
      {
        topicCode: 'T3_SECURE_CODING', title: 'Secrets, Dependencies and Secure Coding',
        skillKeys: ['SECURE_CODING'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'STANDARD',
        learningOutcomes: ['Keep secrets out of the repository and know what an outdated dependency exposes.'],
        prerequisiteSkillKeys: ['SECURITY_FUNDAMENTALS'],
        backbone: true,
      },
    ],
  },

  /* ══════════════ STAGE 2 — SPECIALIZATION ══════════════ */
  {
    moduleCode: 'S11_DIRECTION',
    moduleName: 'Specialization Discovery & Confirmation',
    displayOrder: 110,
    blurb: 'Confirming the direction chosen at the start, or changing it once, on evidence rather than on a feeling.',
    topics: [
      {
        topicCode: 'T3_DIRECTION_CHOICE', title: 'Confirming Your Direction',
        skillKeys: ['TECH_CAREER_AWARENESS', 'PORTFOLIO_EVIDENCE'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'STANDARD',
        learningOutcomes: [
          'Compare the directions against your own evidence rather than against what sounds impressive.',
          'Confirm the direction you picked at the start, or change it — this is the last point at which it is free.',
        ],
        backbone: true,
      },
    ],
  },
  {
    moduleCode: 'S12_BACKEND',
    moduleName: 'Backend Engineering Specialization',
    displayOrder: 120,
    blurb: 'Services, data and the production concerns behind them.',
    topics: [
      {
        topicCode: 'T3_BACKEND_ARCH', title: 'Backend Architecture in Layers',
        skillKeys: ['SOFTWARE_ARCHITECTURE', 'API_DESIGN'],
        category: 'DIRECTION', applicableDirections: ['SOFTWARE_BACKEND'], defaultDepth: 'CHALLENGE',
        learningOutcomes: ['Separate controllers, services and data access so each can be tested on its own.'],
        prerequisiteSkillKeys: ['REST_APIS', 'DB_DESIGN'],
        backbone: true,
      },
      {
        topicCode: 'T3_BACKEND_SCALE', title: 'Caching, Background Work and Performance',
        skillKeys: ['CACHING', 'MONITORING_OBSERVABILITY'],
        category: 'DIRECTION', applicableDirections: ['SOFTWARE_BACKEND'], defaultDepth: 'CHALLENGE',
        learningOutcomes: ['Move slow work off the request, and measure before and after rather than guessing.'],
        prerequisiteSkillKeys: ['SERVER_SIDE_BASICS'],
      },
    ],
  },
  {
    moduleCode: 'S13_FRONTEND',
    moduleName: 'Frontend Engineering Specialization',
    displayOrder: 130,
    blurb: 'Interfaces that stay correct as they grow, on every screen size.',
    topics: [
      {
        topicCode: 'T3_FRONTEND_STATE', title: 'Components, State and Routing',
        skillKeys: ['STATE_MANAGEMENT', 'JS_ASYNC'],
        category: 'DIRECTION', applicableDirections: ['WEB_DEVELOPMENT'], defaultDepth: 'CHALLENGE',
        learningOutcomes: [
          'Decide where a value lives and who may change it, so a screen never shows the wrong number.',
        ],
        prerequisiteSkillKeys: ['JS_ASYNC', 'JS_DOM'],
        backbone: true,
      },
      {
        topicCode: 'T3_FRONTEND_QUALITY', title: 'Accessibility, Responsiveness and Performance',
        skillKeys: ['RESPONSIVE_DESIGN', 'WEB_ACCESSIBILITY'],
        category: 'DIRECTION', applicableDirections: ['WEB_DEVELOPMENT'], defaultDepth: 'CHALLENGE',
        learningOutcomes: ['Build one interface that works on a phone and a monitor, and for somebody using a keyboard only.'],
        prerequisiteSkillKeys: ['CSS', 'HTML'],
      },
    ],
  },
  {
    moduleCode: 'S14_DATA',
    moduleName: 'Data & Analytics Engineering',
    displayOrder: 140,
    blurb: 'Turning messy data into an answer somebody can act on.',
    topics: [
      {
        topicCode: 'T3_DATA_PIPELINE', title: 'Cleaning, Transforming and Pipelines',
        skillKeys: ['DATA_PIPELINES', 'DATA_WRANGLING'],
        category: 'DIRECTION', applicableDirections: ['DATA'], defaultDepth: 'CHALLENGE',
        learningOutcomes: ['Move data between systems repeatedly and correctly, including on a rerun.'],
        prerequisiteSkillKeys: ['DATA_WRANGLING', 'SQL_FILTERING'],
        backbone: true,
      },
      {
        topicCode: 'T3_DATA_ANALYSIS', title: 'Analysis, Statistics and Visualization',
        skillKeys: ['DATA_VISUALIZATION', 'PROBABILITY_STATISTICS'],
        category: 'DIRECTION', applicableDirections: ['DATA'], defaultDepth: 'CHALLENGE',
        learningOutcomes: [
          'Answer a business question with data rather than decorating it with a chart.',
          'Choose a chart that answers the question asked, not one that flatters the number.',
        ],
        prerequisiteSkillKeys: ['PROBABILITY_STATISTICS'],
      },
    ],
  },
  {
    moduleCode: 'S15_AI_ML',
    moduleName: 'AI/ML Engineering',
    displayOrder: 150,
    blurb: 'The workflow, and knowing whether the model is any good.',
    topics: [
      {
        topicCode: 'T3_ML_WORKFLOW', title: 'The Machine Learning Workflow',
        skillKeys: ['ML_WORKFLOW', 'FEATURE_ENGINEERING'],
        category: 'DIRECTION', applicableDirections: ['AI_ML'], defaultDepth: 'CHALLENGE',
        learningOutcomes: [
          'Go from data to features to a train/validation/test split, and say why the split comes first.',
          'Build features without leaking the answer into them.',
        ],
        prerequisiteSkillKeys: ['AI_ML_CONCEPTS', 'DATA_WRANGLING'],
        backbone: true,
      },
      {
        topicCode: 'T3_ML_EVALUATION', title: 'Evaluation, Overfitting and Responsible Use',
        skillKeys: ['ML_EVALUATION', 'AI_RESPONSIBLE_USE'],
        category: 'DIRECTION', applicableDirections: ['AI_ML'], defaultDepth: 'CHALLENGE',
        learningOutcomes: [
          'Say whether a model is actually good, which metric to believe, and what overfitting looks like.',
        ],
        prerequisiteSkillKeys: ['PROBABILITY_STATISTICS', 'AI_ML_CONCEPTS'],
      },
    ],
  },
  {
    moduleCode: 'S16_CLOUD_DEVOPS',
    moduleName: 'Cloud & DevOps Specialization',
    displayOrder: 160,
    blurb: 'Infrastructure, pipelines and knowing what production is doing.',
    topics: [
      {
        topicCode: 'T3_CLOUD_INFRA', title: 'Cloud Compute, Storage and Networking',
        skillKeys: ['CLOUD_FUNDAMENTALS'],
        category: 'DIRECTION', applicableDirections: ['CLOUD_DEVOPS'], defaultDepth: 'CHALLENGE',
        learningOutcomes: ['Choose and configure the handful of cloud primitives most applications actually need.'],
        prerequisiteSkillKeys: ['CLOUD_FUNDAMENTALS', 'COMPUTER_NETWORKS'],
        backbone: true,
      },
      {
        topicCode: 'T3_CICD_MONITORING', title: 'CI/CD, Monitoring and Cloud Security',
        skillKeys: ['CI_CD', 'MONITORING_OBSERVABILITY'],
        category: 'DIRECTION', applicableDirections: ['CLOUD_DEVOPS'], defaultDepth: 'CHALLENGE',
        learningOutcomes: ['Ship through a pipeline that builds, tests and deploys the same way every time.'],
        prerequisiteSkillKeys: ['DEVOPS_FUNDAMENTALS', 'GIT_BRANCHING'],
      },
    ],
  },
  {
    moduleCode: 'S17_CYBERSECURITY',
    moduleName: 'Cybersecurity Engineering',
    displayOrder: 170,
    blurb: 'Finding the weakness before somebody else does.',
    topics: [
      {
        topicCode: 'T3_SEC_TESTING', title: 'Vulnerabilities and Security Testing',
        skillKeys: ['THREAT_MODELING', 'SECURE_CODING'],
        category: 'DIRECTION', applicableDirections: ['CYBERSECURITY'], defaultDepth: 'CHALLENGE',
        learningOutcomes: ['Test an application for the weaknesses your threat model predicted.'],
        prerequisiteSkillKeys: ['WEB_SECURITY', 'SECURITY_FUNDAMENTALS'],
        backbone: true,
      },
      {
        topicCode: 'T3_SEC_LIFECYCLE', title: 'Secure Development Lifecycle',
        skillKeys: ['SECURE_CODING', 'LOGGING_DIAGNOSTICS'],
        category: 'DIRECTION', applicableDirections: ['CYBERSECURITY'], defaultDepth: 'CHALLENGE',
        learningOutcomes: ['Build security into how the team works rather than auditing it in at the end.'],
        prerequisiteSkillKeys: ['SECURITY_FUNDAMENTALS'],
      },
    ],
  },
  {
    moduleCode: 'S18_MOBILE',
    moduleName: 'Mobile Engineering Specialization',
    displayOrder: 180,
    blurb: 'Applications on a device that loses signal and runs out of battery.',
    topics: [
      {
        topicCode: 'T3_MOBILE_APP', title: 'Building and Shipping a Mobile App',
        skillKeys: ['MOBILE_APP_BASICS', 'STATE_MANAGEMENT'],
        category: 'DIRECTION', applicableDirections: ['MOBILE'], defaultDepth: 'CHALLENGE',
        learningOutcomes: ['Build an application that behaves when the network does not, and get it onto a device.'],
        prerequisiteSkillKeys: ['MOBILE_APP_BASICS'],
        backbone: true,
      },
    ],
  },
  {
    moduleCode: 'S19_AI_ASSISTED',
    moduleName: 'AI-Assisted Engineering',
    displayOrder: 190,
    blurb: 'Using the tools everybody now uses, without shipping what you do not understand.',
    topics: [
      {
        topicCode: 'T3_AI_ASSISTED', title: 'Working With an AI Assistant',
        skillKeys: ['AI_ASSISTED_CODING', 'CODE_REVIEW'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'STANDARD',
        learningOutcomes: [
          'Use an assistant for generation, explanation and tests, and review what it produces as you would a colleague’s.',
          'Notice a confident wrong answer, and never ship code you cannot explain.',
        ],
        prerequisiteSkillKeys: ['AI_ASSISTED_CODING'],
        backbone: true,
      },
    ],
  },

  /* ══════════════ STAGE 3 — PROFESSIONAL ENGINEERING & CAREER PROOF ══════════════ */
  {
    moduleCode: 'S20_PRODUCTION_PROJECT',
    moduleName: 'Production Engineering Projects',
    displayOrder: 200,
    blurb: 'One project carried the whole way, because that is what an interview asks about.',
    topics: [
      {
        topicCode: 'T3_PROJECT', title: 'From Requirements to Deployed',
        skillKeys: ['PRODUCTION_ENGINEERING', 'SOFTWARE_ARCHITECTURE'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'CHALLENGE',
        learningOutcomes: [
          'Take one project from requirements through design, implementation, tests and deployment.',
          'Explain every decision in it, because that is what you will be asked.',
        ],
        prerequisiteSkillKeys: ['GIT_BRANCHING', 'AUTOMATED_TESTING'],
        backbone: true,
      },
      {
        topicCode: 'T3_CAPSTONE', title: 'Capstone',
        skillKeys: ['PRODUCTION_ENGINEERING', 'TECHNICAL_EXPLANATION'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'CHALLENGE',
        learningOutcomes: ['Produce the one piece of work the rest of the year is evidence for.'],
        prerequisiteSkillKeys: ['PRODUCTION_ENGINEERING'],
        backbone: true,
      },
    ],
  },
  {
    moduleCode: 'S21_INTERVIEW',
    moduleName: 'Technical Interview Engineering',
    displayOrder: 210,
    blurb: 'The interview is a skill of its own, and it is practised.',
    topics: [
      {
        topicCode: 'T3_INTERVIEW_PRACTICE', title: 'Coding Interviews, Under Time',
        skillKeys: ['TECHNICAL_INTERVIEW_PREP', 'ALGORITHM_DESIGN'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'CHALLENGE',
        learningOutcomes: [
          'Interpret a problem, state the constraints and edge cases, and talk while you solve it.',
        ],
        prerequisiteSkillKeys: ['TECHNICAL_INTERVIEW_PREP', 'DSA_COMPLEXITY'],
        backbone: true,
      },
      {
        topicCode: 'T3_SYSTEM_DESIGN', title: 'System Design Fundamentals',
        skillKeys: ['SYSTEM_DESIGN_BASICS', 'SOFTWARE_ARCHITECTURE'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'CHALLENGE',
        learningOutcomes: ['Sketch a system at the level an interviewer wants, and defend the trade-offs.'],
        prerequisiteSkillKeys: ['SYSTEM_DESIGN_BASICS'],
        backbone: true,
      },
    ],
  },
  {
    moduleCode: 'S22_COMMUNICATION',
    moduleName: 'Professional Communication',
    displayOrder: 220,
    blurb: 'Most of the job is explaining things to people who were not there.',
    topics: [
      {
        topicCode: 'T3_TECH_WRITING', title: 'Writing for Other Engineers',
        skillKeys: ['TECHNICAL_WRITING'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'STANDARD',
        learningOutcomes: ['Write documentation and a design note another engineer can act on.'],
        prerequisiteSkillKeys: ['TECHNICAL_COMMUNICATION'],
        backbone: true,
      },
      {
        topicCode: 'T3_PRESENTING', title: 'Presenting Work and Decisions',
        skillKeys: ['TECHNICAL_EXPLANATION', 'COMMUNICATION'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'STANDARD',
        learningOutcomes: ['Present a project and its architecture to somebody who has not seen it.'],
        prerequisiteSkillKeys: ['TECHNICAL_EXPLANATION'],
      },
    ],
  },
  {
    moduleCode: 'S23_PORTFOLIO',
    moduleName: 'Portfolio & Engineering Evidence',
    displayOrder: 230,
    blurb: 'A stranger has ninety seconds and no reason to believe you.',
    topics: [
      {
        topicCode: 'T3_PORTFOLIO', title: 'Building Evidence Somebody Will Believe',
        skillKeys: ['PORTFOLIO_EVIDENCE', 'TECHNICAL_WRITING'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'STANDARD',
        learningOutcomes: [
          'Turn your projects into a repository, a README and a demo a reviewer can check in two minutes.',
        ],
        prerequisiteSkillKeys: ['PORTFOLIO_EVIDENCE'],
        backbone: true,
      },
    ],
  },
  {
    moduleCode: 'S24_INTERNSHIP',
    moduleName: 'Internship & Industry Readiness',
    displayOrder: 240,
    blurb: 'Getting the interview, and then holding the job.',
    topics: [
      {
        topicCode: 'T3_APPLYING', title: 'Roles, Résumés and Applications',
        skillKeys: ['INTERNSHIP_READINESS', 'TECH_CAREER_AWARENESS'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'STANDARD',
        learningOutcomes: ['Read a job description honestly, match it against your evidence, and apply where it fits.'],
        prerequisiteSkillKeys: ['INTERNSHIP_READINESS'],
        backbone: true,
      },
      {
        topicCode: 'T3_BEHAVIORAL', title: 'Behavioural Interviews and the First Weeks',
        skillKeys: ['BEHAVIORAL_INTERVIEW', 'INTERNSHIP_READINESS'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'STANDARD',
        learningOutcomes: [
          'Tell what you did, why, and what you would change, with a real example ready.',
          'Know how to be stuck in a team without being silently stuck.',
        ],
        prerequisiteSkillKeys: ['TECHNICAL_EXPLANATION'],
        backbone: true,
      },
    ],
  },
  {
    moduleCode: 'S25_VERIFICATION',
    moduleName: 'Year-3 Integration & Verification',
    displayOrder: 250,
    blurb: 'Proving the year, skill by skill, rather than asserting it.',
    topics: [
      {
        topicCode: 'T3_VERIFICATION', title: 'Year-3 Verification',
        skillKeys: ['PRODUCTION_ENGINEERING', 'TECHNICAL_INTERVIEW_PREP'],
        category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'CHALLENGE',
        learningOutcomes: [
          'Demonstrate the year across programming, data structures, algorithms, databases, APIs, testing and security.',
          'Have the capstone, the portfolio and the internship readiness reviewed against what an employer asks for.',
        ],
        prerequisiteSkillKeys: ['PRODUCTION_ENGINEERING'],
        backbone: true,
      },
    ],
  },
];

/** Every skill key the Year-3 map refers to, for the seed to check against the catalogue. */
export const specializeReferencedSkillKeys = (): string[] => [
  ...new Set(SPECIALIZE_MODULES.flatMap(m =>
    m.topics.flatMap(t => [...t.skillKeys, ...(t.prerequisiteSkillKeys || [])]))),
].sort();

/** The mandatory Year-3 backbone, in authored order. */
export const specializeBackboneTopicCodes = (): string[] =>
  SPECIALIZE_MODULES.flatMap(m => m.topics.filter(t => t.backbone).map(t => t.topicCode));

/**
 * The direction-specific topics, grouped by direction.
 *
 * Year 3 is the year the direction stops being a preference: a student gets one track in full
 * rather than a sampling of several. This is what a composer or an admin screen needs in order
 * to answer "what does a CYBERSECURITY student actually get", and it is derived rather than
 * listed so it cannot fall out of step with the modules above.
 */
export const specializeDirectionTopics = (): Record<string, string[]> => {
  const out: Record<string, string[]> = {};
  for (const m of SPECIALIZE_MODULES) {
    for (const t of m.topics) {
      for (const d of t.applicableDirections || []) {
        (out[d] = out[d] || []).push(t.topicCode);
      }
    }
  }
  return out;
};
