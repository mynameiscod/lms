import { TopicSeed } from './year1MegaCurriculum';
import { u, drill, interviewUnit } from './year4UnitKit';

/**
 * Year 4, stages 5 and 6 — the production project, and the placement practice that runs
 * alongside everything. Modules P14 to P17.
 *
 * ── THE ONE THING TO UNDERSTAND ABOUT P15 TO P17 ──────────────────────────────────────────
 *
 * The spec's guardrail: "placement practice is continuous, not only a final module."
 *
 * These sixty-seven units are not the end of the programme. They are backbone topics with
 * shallow prerequisites, deliberately, so the composer can interleave them from early on — a
 * coding set beside a specialization day, an aptitude paper beside the production build. A
 * student who meets aptitude for the first time in week nineteen has met it too late, and the
 * only thing stopping that is that these topics do not depend on the rest of the year.
 *
 * ── AND WHY THEY END IN A CHECKPOINT RATHER THAN A PROJECT ────────────────────────────────
 *
 * `drill` gives these topics a timed set, an interview question and a checkpoint, and no mini
 * project. A coding set IS the practice; a "mini project on quantitative aptitude" would be an
 * invention. What these topics need instead is measurement, because the failure mode here is
 * specific and common: a student who has done the practice, feels prepared, and has never once
 * been scored against the standard a real drive applies.
 */

export const YEAR4_PLACEMENT: Record<string, TopicSeed> = {
  /* ── P14 · Production engineering ────────────────────────────────────────────────────── */
  T4_PROD_SPEC: {
    category: 'UNIVERSAL',
    units: [
      u('USER_STORIES', 'From an Idea to Something Buildable',
        'Turning "an app for X" into the handful of things a user actually needs to be able to do.',
        ['Turn a vague idea into user stories somebody else could estimate'], 55),
      u('THE_SPEC', 'A Specification Somebody Could Build From',
        'What the document has to contain to be worth writing, and the sections that are always skipped.',
        ['Write a technical specification that answers the questions a builder would ask'],
        65, { after: ['USER_STORIES'] }),
      u('THE_ARCHITECTURE', 'Choosing the Architecture, and Recording Why',
        'The decisions that are expensive to reverse, written down at the moment they are cheap to make.',
        ['Choose an architecture and record the decision so it can be questioned later'],
        70, { after: ['THE_SPEC'] }),
      u('PRACTICE', 'Specifying Something Real',
        'A brief, taken to stories, a specification and an architecture in one sitting.',
        ['Produce a specification and an architecture from a one-paragraph brief'],
        70, { unitType: 'PRACTICE', after: ['THE_ARCHITECTURE'] }),
      interviewUnit('Requirements and Architecture', 'PRACTICE'),
    ],
  },
  T4_PROD_BUILD: {
    category: 'UNIVERSAL',
    units: [
      u('WHAT_PRODUCTION_MEANS', 'What Production Means That Coursework Does Not',
        'Somebody else runs it, at a time you are not there, on input you did not imagine.',
        ['Name what changes about a system the moment a real user depends on it'], 55),
      u('FAILURES_ON_PURPOSE', 'Failures Handled Deliberately',
        'Deciding in advance what happens when the dependency is down, rather than finding out.',
        ['Design the failure behaviour of a system rather than inheriting it'],
        65, { after: ['WHAT_PRODUCTION_MEANS'] }),
      u('MINI_PROJECT', 'Building the Production System',
        'Requirements, schema, API, authentication, interface, error handling, tests and documentation — one system.',
        ['Build a system whose failures are handled deliberately rather than discovered by a user'],
        180, { unitType: 'PROJECT', after: ['FAILURES_ON_PURPOSE'] }),
      u('DEBUGGING', 'When Your Own System Breaks',
        'Debugging something large enough that you no longer remember all of it.',
        ['Diagnose a fault in your own system from its logs rather than from memory'],
        70, { unitType: 'DEBUG', after: ['MINI_PROJECT'] }),
      interviewUnit('Your Production System', 'DEBUGGING'),
    ],
  },
  T4_PROD_OPERATE: {
    category: 'UNIVERSAL',
    units: [
      u('DEPLOYING_IT', 'Getting It Running Where Somebody Can Use It',
        'A real deployment, with the configuration and the secrets handled properly.',
        ['Deploy your own system somewhere a stranger could reach it'], 70),
      u('LOGS_AND_METRICS', 'Logging and Metrics You Will Actually Use',
        'What to record so that the question "is it working?" has an answer that is not a guess.',
        ['Instrument a system so its health is visible without opening the code'],
        65, { after: ['DEPLOYING_IT'] }),
      u('DEBUGGING', 'The First Incident',
        'Something is wrong in production. Working from the evidence you have, and then adding what you wish you had.',
        ['Diagnose a production problem from logs and metrics alone'],
        70, { unitType: 'DEBUG', after: ['LOGS_AND_METRICS'] }),
      u('PRACTICE', 'Operating It for a Week',
        'Watching a running system, noticing what it tells you, and acting before a user reports it.',
        ['Keep a deployed system running and account for what happened to it'],
        60, { unitType: 'PRACTICE', after: ['DEBUGGING'] }),
      interviewUnit('Running It in Production', 'PRACTICE'),
    ],
  },
  T4_PROD_REVIEW: {
    category: 'UNIVERSAL',
    units: [
      u('A_README_THAT_WORKS', 'A README Somebody Can Actually Start From',
        'What it is, why it exists, how to run it, and the three things that will otherwise be asked.',
        ['Write documentation that gets a stranger to a running copy without asking you anything'], 55),
      u('REVIEWING_YOUR_OWN_WORK', 'Reviewing Your Own Code Honestly',
        'Reading your own work as though somebody else wrote it, and finding what you forgave yourself for.',
        ['Review your own codebase and list what you would reject from somebody else'],
        60, { after: ['A_README_THAT_WORKS'] }),
      u('PRACTICE', 'The Technical Presentation',
        'Ten minutes on your own system to people who will ask why, not whether.',
        ['Present your own system and take the questions afterwards'],
        70, { unitType: 'PRACTICE', after: ['REVIEWING_YOUR_OWN_WORK'] }),
      interviewUnit('Your Own Codebase', 'PRACTICE'),
      u('CHECKPOINT', 'Production Engineering Checkpoint',
        'Whether there is now a system that exists, runs, and can be explained.',
        ['Show a deployed, documented system and account for its decisions'],
        50, { unitType: 'CHECKPOINT', after: ['INTERVIEW_QUESTION'] }),
    ],
  },

  /* ── P15 · Placement coding and DSA ──────────────────────────────────────────────────── */
  T4_PL_CODING_SETS: {
    category: 'UNIVERSAL',
    units: [
      u('READING_THE_PROBLEM', 'Reading the Problem Before Writing Anything',
        'Constraints, input size and the example that tells you what the edge case is. Five minutes that save thirty.',
        ['Extract the constraints and the edge cases from a problem statement before coding'], 50),
      u('ARRAY_AND_STRING_PATTERNS', 'The Array and String Problems That Keep Appearing',
        'Frequency counting, prefix sums, in-place modification — the handful that cover most of a paper.',
        ['Recognise and apply the standard array and string patterns'],
        60, { after: ['READING_THE_PROBLEM'] }),
      u('HASHING_FOR_SPEED', 'Trading Memory for Time',
        'The dictionary that turns a nested loop into a single pass, and when it is not worth it.',
        ['Replace a quadratic scan with a hash-based single pass'],
        60, { after: ['ARRAY_AND_STRING_PATTERNS'] }),
      ...drill('Coding Under a Clock', 'HASHING_FOR_SPEED'),
    ],
  },
  T4_PL_DSA_PATTERNS: {
    category: 'UNIVERSAL',
    units: [
      u('TWO_POINTERS', 'Two Pointers',
        'Walking a sorted array from both ends, and the problems that quietly are that problem.',
        ['Recognise and solve a two-pointer problem without being told it is one'], 60),
      u('SLIDING_WINDOW', 'Sliding Window',
        'A subarray that grows and shrinks, and the invariant that decides which.',
        ['Solve a substring or subarray problem with a window rather than a nested loop'],
        60, { after: ['TWO_POINTERS'] }),
      u('BINARY_SEARCH_BEYOND_SORTED', 'Binary Search On Things That Are Not Arrays',
        'Searching an answer space rather than a list — the version that separates a pass from a good pass.',
        ['Binary search over an answer range rather than over stored data'],
        65, { after: ['SLIDING_WINDOW'] }),
      ...drill('DSA Patterns', 'BINARY_SEARCH_BEYOND_SORTED'),
    ],
  },
  T4_PL_DSA_STRUCTURES: {
    category: 'UNIVERSAL',
    units: [
      u('STACKS_AND_QUEUES', 'Stacks and Queues, and the Problems That Are Secretly One',
        'Matching, nesting, next-greater and anything processed in arrival order.',
        ['Recognise a stack or queue problem from its description'], 60),
      u('LINKED_LISTS', 'Linked Lists Without the Pointer Errors',
        'Reversal, cycle detection and the dummy head that removes half the special cases.',
        ['Manipulate a linked list correctly, including at both ends'],
        60, { after: ['STACKS_AND_QUEUES'] }),
      u('TREES_AND_TRAVERSALS', 'Trees and the Three Traversals',
        'When each order is the one you want, and the recursion that writes itself once you know.',
        ['Traverse a tree in the order the problem needs and say why that one'],
        65, { after: ['LINKED_LISTS'] }),
      ...drill('Core Structures', 'TREES_AND_TRAVERSALS'),
    ],
  },
  T4_PL_DSA_ADVANCED: {
    category: 'UNIVERSAL',
    units: [
      u('GRAPHS', 'Graphs, and Noticing That It Is One',
        'BFS, DFS and the fact that most graph problems are not described as graph problems.',
        ['Model a problem as a graph and choose the traversal it needs'], 70),
      u('GREEDY', 'When a Greedy Choice Is Actually Safe',
        'The local choice that is provably right, and the far more common case where it is not.',
        ['Decide whether a greedy approach is safe, and say what would break it'],
        65, { after: ['GRAPHS'] }),
      u('BASIC_DP', 'Dynamic Programming, Without the Mystique',
        'Overlapping subproblems, a table, and the recurrence written before any code.',
        ['Write the recurrence for a standard DP problem and turn it into a table'],
        75, { after: ['GREEDY'] }),
      ...drill('Graphs, Greedy and DP', 'BASIC_DP'),
    ],
  },
  T4_PL_COMPLEXITY: {
    category: 'UNIVERSAL',
    units: [
      u('STATING_THE_COST', 'Saying What Your Own Solution Costs',
        'Out loud, immediately, without being asked — because being asked is worse than volunteering it.',
        ['State the time and space cost of your own solution without hesitating'], 55),
      u('IMPROVING_IT', 'Improving It When They Ask For Better',
        'The follow-up that always comes, and the three standard ways of answering it.',
        ['Improve your own solution\'s complexity when asked, rather than restating it'],
        60, { after: ['STATING_THE_COST'] }),
      ...drill('Complexity', 'IMPROVING_IT'),
    ],
  },

  /* ── P16 · Aptitude, reasoning and verbal ────────────────────────────────────────────── */
  T4_AP_QUANT: {
    category: 'UNIVERSAL',
    units: [
      u('PERCENTAGES_AND_RATIOS', 'Percentages, Ratios and Averages',
        'The arithmetic half of every paper, done at the speed the paper assumes.',
        ['Work percentage, ratio and average problems without writing out the algebra'], 55),
      u('PROFIT_AND_INTEREST', 'Profit, Loss and Interest',
        'The commercial arithmetic that appears in every drive, and the two formulas worth memorising.',
        ['Solve profit, loss and interest problems at test pace'],
        55, { after: ['PERCENTAGES_AND_RATIOS'] }),
      u('TIME_WORK_AND_SPEED', 'Time, Work, Speed and Distance',
        'Rates, combined work and relative speed — one idea wearing three costumes.',
        ['Recognise a rate problem whichever form it arrives in'],
        60, { after: ['PROFIT_AND_INTEREST'] }),
      ...drill('Quantitative Aptitude', 'TIME_WORK_AND_SPEED'),
    ],
  },
  T4_AP_DI: {
    category: 'UNIVERSAL',
    units: [
      u('READING_A_TABLE', 'Reading a Table Without Recomputing It',
        'Finding the one number the question needs, rather than working out the whole grid.',
        ['Answer from a table by reading it rather than by calculating all of it'], 50),
      u('CHARTS', 'Bar Charts, Pie Charts and the Trap in Each',
        'Scale, missing baselines and the percentage of a percentage.',
        ['Answer chart questions accurately, including the ones designed to mislead'],
        55, { after: ['READING_A_TABLE'] }),
      ...drill('Data Interpretation', 'CHARTS'),
    ],
  },
  T4_AP_REASONING: {
    category: 'UNIVERSAL',
    units: [
      u('SERIES_AND_ANALOGY', 'Series, Analogies and Odd One Out',
        'Finding the rule quickly, and knowing when to abandon a rule that nearly works.',
        ['Identify the rule in a number or letter series under time'], 55),
      u('CODING_DECODING', 'Coding, Decoding and Blood Relations',
        'Substitution patterns and family trees — mechanical once the notation is right.',
        ['Solve coding-decoding and relation problems with a consistent notation'],
        55, { after: ['SERIES_AND_ANALOGY'] }),
      u('ARRANGEMENTS_AND_SYLLOGISMS', 'Seating, Arrangements and Syllogisms',
        'Building the grid, eliminating, and the syllogism rule that is not the intuitive one.',
        ['Solve an arrangement puzzle by elimination rather than by trial'],
        65, { after: ['CODING_DECODING'] }),
      ...drill('Logical Reasoning', 'ARRANGEMENTS_AND_SYLLOGISMS'),
    ],
  },
  T4_AP_VERBAL: {
    category: 'UNIVERSAL',
    units: [
      u('GRAMMAR_AND_CORRECTION', 'Error Spotting and Sentence Correction',
        'The six mistakes that account for most of the questions, and how to see them quickly.',
        ['Spot and correct the common error types without reading the sentence three times'], 55),
      u('COMPREHENSION', 'Reading Comprehension Under Time',
        'Reading for the question rather than for the passage, and the inference that is not stated.',
        ['Answer comprehension questions accurately after one read'],
        60, { after: ['GRAMMAR_AND_CORRECTION'] }),
      ...drill('Verbal Ability', 'COMPREHENSION'),
    ],
  },

  /* ── P17 · Technical MCQ and core CS ─────────────────────────────────────────────────── */
  T4_MCQ_PROGRAMMING: {
    category: 'UNIVERSAL',
    units: [
      u('OUTPUT_PREDICTION', 'Predicting Output Without Running It',
        'Reading code the way the interpreter does, including the parts that are easy to skim.',
        ['Predict a program\'s output correctly without executing it'], 55),
      u('OOP_MCQS', 'The OOP Questions Written Rounds Ask',
        'Overriding, overloading, static, and the inheritance question everybody gets wrong once.',
        ['Answer OOP questions from how the language actually behaves'],
        55, { after: ['OUTPUT_PREDICTION'] }),
      ...drill('Programming MCQs', 'OOP_MCQS'),
    ],
  },
  T4_MCQ_CORE_CS: {
    category: 'UNIVERSAL',
    units: [
      u('OS_QUESTIONS', 'Operating Systems, at Written-Round Depth',
        'Processes and threads, scheduling, deadlock and memory — what is actually asked, and how far.',
        ['Answer operating-systems questions from understanding rather than from memorised definitions'], 60),
      u('NETWORKING_QUESTIONS', 'Networking, at Written-Round Depth',
        'The layers, TCP against UDP, DNS and what actually happens when a URL is typed.',
        ['Answer networking questions by following what happens rather than by recall'],
        60, { after: ['OS_QUESTIONS'] }),
      u('DBMS_QUESTIONS', 'DBMS, at Written-Round Depth',
        'Normalisation, keys, indexes and transactions — the four the paper keeps returning to.',
        ['Answer DBMS questions including the normalisation one that always appears'],
        60, { after: ['NETWORKING_QUESTIONS'] }),
      ...drill('Core CS MCQs', 'DBMS_QUESTIONS'),
    ],
  },
  T4_MCQ_ENGINEERING: {
    category: 'UNIVERSAL',
    units: [
      u('GIT_AND_TESTING_MCQS', 'Git and Testing Questions',
        'What merge, rebase and reset actually do, and what the test pyramid is for.',
        ['Answer Git and testing questions about tools you have used rather than read about'], 55),
      u('SQL_AND_SECURITY_MCQS', 'SQL and Security Questions',
        'Join semantics, aggregate behaviour, and the vulnerability names every paper expects.',
        ['Answer SQL and security questions precisely, including the null-handling one'],
        55, { after: ['GIT_AND_TESTING_MCQS'] }),
      ...drill('Engineering MCQs', 'SQL_AND_SECURITY_MCQS'),
    ],
  },
};
