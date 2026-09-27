import { TopicSeed } from './year1MegaCurriculum';
import { u, closeOut } from './year4UnitKit';

/**
 * Year 4, stages 3 and 4 — the ten-day engineering build, and the day the direction is settled.
 * Modules P03, P04.
 *
 * ── THE DELIBERATE CONTRAST WITH THE BRIDGE ───────────────────────────────────────────────
 *
 * P02 repairs what is missing and nothing in it is mandatory. Everything here is: these ten
 * topics are the engineering standard a fourth-year is interviewed against, and the spec's rule
 * is that evidence changes the TREATMENT — "compress demonstrated mastery into verification,
 * debugging, application or advanced treatment" — never whether the topic is there at all.
 *
 * That is also why every topic ends with `closeOut` rather than with a lesson. A student who has
 * already proved clean code does not need the three lessons; they need the debugging exercise,
 * the drill, the interview question and the mini project, and `unitSuitabilityPolicy` gives them
 * exactly those and withholds the lessons. Authoring this module concept-heavy would have left
 * the strongest students with nothing to be given.
 *
 * ── AND WHY DAY 21 IS ITS OWN MODULE ──────────────────────────────────────────────────────
 *
 * The specialization month is the largest single commitment in Year 4 and the one that decides
 * what the specialization mock interview is about. The spec gives choosing it a whole day, and
 * it gets a whole topic here, reaching every student — including the one who has already chosen,
 * because confirming a direction against three years of evidence is not the same act as picking
 * one in second year because it sounded interesting.
 */

export const YEAR4_BUILD: Record<string, TopicSeed> = {
  /* ── P03 · The ten-day engineering build ─────────────────────────────────────────────── */
  T4_CLEAN_CODE: {
    category: 'UNIVERSAL',
    units: [
      u('NAMES_AND_SHAPE', 'Names, Length and the Shape of a Function',
        'The three things a reader judges in the first ten seconds, and what each one costs when it is wrong.',
        ['Rename and reshape a function so its purpose is visible without a comment'], 60),
      u('SEPARATION', 'Separation of Concerns, Concretely',
        'Not a slogan: the specific test of whether two things belong in the same file.',
        ['Split a module that does two jobs, and say what each half is now responsible for'],
        65, { after: ['NAMES_AND_SHAPE'] }),
      u('WHEN_TO_REFACTOR', 'When a Refactor Is Worth It',
        'Technical debt as a decision with interest, rather than as a word for code you dislike.',
        ['Argue for or against a refactor from its cost and what it would unblock'],
        60, { after: ['SEPARATION'] }),
      ...closeOut('Clean Code', 'WHEN_TO_REFACTOR'),
    ],
  },
  T4_OOP_DESIGN: {
    category: 'UNIVERSAL',
    units: [
      u('ABSTRACTION_THAT_EARNS_IT', 'Abstraction That Earns Its Keep',
        'Every layer is a layer the next reader holds in their head. When it pays and when it does not.',
        ['Say what an abstraction costs as well as what it saves'], 65),
      u('COMPOSITION_AND_INTERFACES', 'Composition, Interfaces and Swapping Things Out',
        'Depending on what a thing does rather than what it is, and what that buys the day it changes.',
        ['Choose composition or inheritance for a stated problem and defend the choice'],
        70, { after: ['ABSTRACTION_THAT_EARNS_IT'] }),
      u('PATTERNS_WORTH_NAMING', 'The Patterns Worth Knowing By Name',
        'Strategy, factory, observer, adapter — what problem each one is the answer to, and the misuse of each.',
        ['Recognise a pattern in code you did not write, and name the problem it was solving'],
        70, { after: ['COMPOSITION_AND_INTERFACES'] }),
      ...closeOut('OOP Design', 'PATTERNS_WORTH_NAMING'),
    ],
  },
  T4_DSA_DEPTH: {
    category: 'UNIVERSAL',
    units: [
      u('COST_OF_THE_OPERATIONS', 'Choosing From What the Problem Actually Does',
        'Not "which structure is fastest" but "which operations does this run a million times".',
        ['Pick a structure from the cost of the operations the problem performs most'], 65),
      u('HASHING_AND_TREES', 'When a Hash Map Wins, and When the Data Has a Shape',
        'Constant-time lookup against ordered traversal, and the problems that need the second.',
        ['Justify a hash map or a tree for a stated access pattern'],
        70, { after: ['COST_OF_THE_OPERATIONS'] }),
      u('DESIGNING_THE_ALGORITHM', 'Designing an Algorithm Rather Than Recalling One',
        'Reaching a correct approach for a problem you have not seen, and then improving it.',
        ['Reach a working approach on an unfamiliar problem and then reduce its cost'],
        75, { after: ['HASHING_AND_TREES'] }),
      ...closeOut('Structure and Algorithm Choice', 'DESIGNING_THE_ALGORITHM'),
    ],
  },
  T4_TESTING_DEPTH: {
    category: 'UNIVERSAL',
    units: [
      u('WHAT_IS_WORTH_TESTING', 'What Is Worth Testing, and What Is Not',
        'Coverage is not the goal. The tests that would actually have caught something are.',
        ['Say which parts of a module deserve a test and which would only cost maintenance'], 60),
      u('EDGE_CASES', 'The Edge Cases That Actually Occur',
        'Empty, one, many, duplicate, absent, and the wrong type — in that order, every time.',
        ['Enumerate a function\'s edge cases systematically rather than by intuition'],
        60, { after: ['WHAT_IS_WORTH_TESTING'] }),
      u('INTEGRATION_AND_REGRESSION', 'Integration Tests and a Regression Suite',
        'Where unit tests stop helping, and how a suite stops the same bug returning twice.',
        ['Write an integration test, and turn a fixed bug into a permanent regression test'],
        65, { after: ['EDGE_CASES'] }),
      ...closeOut('Testing', 'INTEGRATION_AND_REGRESSION'),
    ],
  },
  T4_DEBUG_DEPTH: {
    category: 'UNIVERSAL',
    units: [
      u('READING_A_TRACE', 'Reading a Stack Trace Properly',
        'Which frame is yours, which line is the cause, and why the top of the trace is usually not it.',
        ['Find the causing line from a stack trace without opening every file in it'], 55),
      u('NARROWING_IT_DOWN', 'Narrowing It Down Instead of Staring At It',
        'Bisecting, minimal reproduction, and the discipline of changing one thing at a time.',
        ['Reduce a failure to the smallest input that still reproduces it'],
        60, { after: ['READING_A_TRACE'] }),
      u('LOGGING_THAT_HELPS', 'Logging That Helps the Next Person',
        'What to log, at what level, and why "here1" tells nobody anything at three in the morning.',
        ['Instrument a failing path so the log alone explains what happened'],
        60, { after: ['NARROWING_IT_DOWN'] }),
      ...closeOut('Debugging', 'LOGGING_THAT_HELPS'),
    ],
  },
  T4_DB_ENGINEERING: {
    category: 'UNIVERSAL',
    units: [
      u('SCHEMA_AND_INDEXES', 'Schema Decisions, and What an Index Really Costs',
        'Normalising far enough and no further, and the write cost every index quietly adds.',
        ['Add an index for a stated query and say what it made slower'], 70),
      u('TRANSACTIONS', 'Transactions, and the Two Writes That Must Not Separate',
        'Atomicity as a practical tool rather than an acronym, and what a partial failure looks like.',
        ['Wrap an operation that must not half-happen, and show what goes wrong without it'],
        65, { after: ['SCHEMA_AND_INDEXES'] }),
      u('QUERY_PLANS', 'Reading Why a Query Is Slow',
        'The plan, the scan you did not want, and fixing it without changing what the query returns.',
        ['Explain a query\'s cost from its plan, and make it faster without changing its result'],
        70, { after: ['TRANSACTIONS'] }),
      ...closeOut('Database Engineering', 'QUERY_PLANS'),
    ],
  },
  T4_API_ENGINEERING: {
    category: 'UNIVERSAL',
    units: [
      u('DESIGNING_AN_ENDPOINT', 'Designing an Endpoint Somebody Else Will Call',
        'Resource, verb, status code and error shape — decided deliberately rather than by accident.',
        ['Design an endpoint whose errors are as usable as its successes'], 65),
      u('AUTHN_VERSUS_AUTHZ', 'Authentication and Authorization Are Different Questions',
        'Who you are against what you may do, and the bug that comes from answering only the first.',
        ['Say which of the two a given failure is, and put the check in the right place'],
        65, { after: ['DESIGNING_AN_ENDPOINT'] }),
      u('HOSTILE_CALLERS', 'The Caller Who Is Confused, or Hostile',
        'Malformed bodies, wrong content types, missing fields and somebody probing on purpose.',
        ['Design an endpoint that is still correct when the caller is wrong'],
        65, { after: ['AUTHN_VERSUS_AUTHZ'] }),
      ...closeOut('API Engineering', 'HOSTILE_CALLERS'),
    ],
  },
  T4_LINUX_CLOUD: {
    category: 'UNIVERSAL',
    units: [
      u('PROCESSES_AND_ENVIRONMENT', 'Processes, the Environment and Why It Worked Locally',
        'Environment variables, working directories, permissions, and the four reasons it runs here and not there.',
        ['Diagnose a "works on my machine" failure from the environment rather than the code'], 60),
      u('CONTAINERS', 'Putting It In a Container',
        'What an image actually contains, and why the container is the answer to the previous unit.',
        ['Containerise an application and run it somewhere that is not your machine'],
        70, { after: ['PROCESSES_AND_ENVIRONMENT'] }),
      u('DEPLOYING', 'Getting It Deployed, and Getting It Back',
        'A pipeline, a deploy, and the rollback you will need before you expect to.',
        ['Deploy an application and roll it back without losing data'],
        70, { after: ['CONTAINERS'] }),
      ...closeOut('Deployment', 'DEPLOYING'),
    ],
  },
  T4_SECURITY_ENGINEERING: {
    category: 'UNIVERSAL',
    units: [
      u('VALIDATION_AT_THE_RIGHT_LAYER', 'Validating Input Where It Actually Helps',
        'Client-side validation is a courtesy. The server is where it is a control.',
        ['Put a validation check at the layer that cannot be bypassed'], 60),
      u('ACCESS_CONTROL', 'Access Control That Is Not Just a Hidden Button',
        'Enforcing on the server what the interface merely suggests, and the object nobody checked ownership of.',
        ['Find an endpoint that trusts the client about who the caller is, and fix it'],
        65, { after: ['VALIDATION_AT_THE_RIGHT_LAYER'] }),
      u('SECRETS', 'Secrets, and Everywhere They Must Not Be',
        'Repositories, logs, error messages, client bundles — the four places they keep turning up.',
        ['Get a secret out of a codebase and into somewhere a deploy can still reach it'],
        60, { after: ['ACCESS_CONTROL'] }),
      ...closeOut('Secure Development', 'SECRETS'),
    ],
  },
  T4_BUILD_INTEGRATION: {
    category: 'UNIVERSAL',
    units: [
      u('PLANNING_THE_BUILD', 'Planning Something That Has Six Moving Parts',
        'Sequencing the work so that a mistake in one layer does not mean rebuilding the other five.',
        ['Plan a build in an order where each step can be verified before the next'], 50),
      u('BUILDING_IT', 'The Engineering Build',
        'Code, Git, a database, an API, tests and a security control, in one piece of work.',
        ['Build one thing that carries everything the engineering build taught'],
        150, { unitType: 'PROJECT', after: ['PLANNING_THE_BUILD'] }),
      u('HARDENING_IT', 'Finding What You Left Open',
        'Going back over your own work looking for the validation, the index and the test you skipped.',
        ['Audit your own build and fix what the first pass missed'],
        60, { unitType: 'DEBUG', after: ['BUILDING_IT'] }),
      u('REVIEWING_IT', 'Explaining It to Somebody Who Will Ask Why',
        'A code review of your own work, out loud, against the decisions you actually made.',
        ['Defend the structural decisions in your own build'],
        55, { unitType: 'PRACTICE', after: ['HARDENING_IT'] }),
      u('CHECKPOINT', 'Engineering Build Checkpoint',
        'Whether the Year-4 engineering standard is now in place, measured rather than assumed.',
        ['Show engineering capability at the standard a technical round expects'],
        50, { unitType: 'CHECKPOINT', after: ['REVIEWING_IT'] }),
    ],
  },

  /* ── P04 · Day 21: settling the direction ────────────────────────────────────────────── */
  T4_DIRECTION_ASSESSMENT: {
    category: 'UNIVERSAL',
    units: [
      u('WHAT_EACH_DIRECTION_DOES', 'What Each Direction Actually Does All Day',
        'Software engineering, backend, frontend, full stack, data, AI/ML, cloud and security — the work, not the job title.',
        ['Describe what somebody in each direction actually spends their week doing'], 55),
      u('WHICH_ONES_YOUR_EVIDENCE_SUPPORTS', 'Which Ones Your Evidence Already Supports',
        'Reading your own Skill DNA against each direction, rather than choosing on appeal.',
        ['Rank the directions by what your own evidence supports, and notice where that surprises you'],
        55, { unitType: 'PRACTICE', after: ['WHAT_EACH_DIRECTION_DOES'] }),
      u('WHAT_COMMITTING_COSTS', 'What Committing Costs, and What It Does Not',
        'The specialization month and the specialization interview follow this choice. Your first job need not.',
        ['Say honestly what this choice decides for the next thirty days and what it leaves open'],
        45, { after: ['WHICH_ONES_YOUR_EVIDENCE_SUPPORTS'] }),
      u('CHECKPOINT', 'Direction Checkpoint',
        'One direction, chosen on evidence, with the reason written down so it can be revisited.',
        ['Commit to a direction for the specialization month and record why'],
        40, { unitType: 'CHECKPOINT', after: ['WHAT_COMMITTING_COSTS'] }),
    ],
  },
};
