import { TopicSeed } from './year1MegaCurriculum';
import { u, closeOutLight } from './year4UnitKit';

/**
 * Year 4, stages 1 and 2 — the diagnostic, and the ten-day foundation bridge. Modules P01, P02.
 *
 * ── WHO THE BRIDGE IS FOR, AND WHO IT IS NOT FOR ──────────────────────────────────────────
 *
 * The spec: "10 days is a maximum bridge treatment, not an automatic repetition. Existing
 * evidence can compress a topic into practical work, debugging, review or verification."
 *
 * So these forty units are not a course. They are the pool a fresh fourth-year draws from when
 * their diagnostic says they arrived without the fundamentals, and a continuing CareerPilot
 * student with three years of evidence should meet almost none of them. Nothing in P02 is a
 * backbone topic — see year4StageMap — and that is the single thing that keeps the bridge honest.
 *
 * ── WHY THE UNITS ARE SHORT AND THERE ARE FOUR PER TOPIC ──────────────────────────────────
 *
 * Ten days, ten topics, three to four units a day. Every topic gets two lessons and then
 * `closeOutLight` — a debugging exercise and a drill — because that is what fits and because a
 * bridge that ended each topic with a mini project would spend the entire ten days on three of
 * them. The building happens on day ten, in T4_BR_INTEGRATION, once.
 *
 * ── ONE PRIMARY LANGUAGE ──────────────────────────────────────────────────────────────────
 *
 * Python, as in Years 1 and 2. The spec asks for one primary path, and a bridge that switched
 * languages would be teaching a new thing while claiming to repair an old one.
 */

export const YEAR4_BRIDGE: Record<string, TopicSeed> = {
  /* ── P01 · Where the year starts ─────────────────────────────────────────────────────── */
  T4_STANDING: {
    category: 'UNIVERSAL',
    units: [
      u('PROGRAMMING_CHECK', 'Your Programming, Checked',
        'A short practical pass over functions, objects, collections and error handling. Not a lesson — a measurement.',
        ['Show what is in place across programming and object-oriented work, or find where it is not'],
        50, { unitType: 'PRACTICE' }),
      u('ENGINEERING_CHECK', 'Your Engineering, Checked',
        'A branch, a test, a query and a request: the four things every Year-4 module sits on top of.',
        ['Demonstrate Git, testing, SQL and HTTP without help, or find which one stops you'],
        50, { unitType: 'PRACTICE', after: ['PROGRAMMING_CHECK'] }),
      u('CORE_CS_CHECK', 'Core CS and DSA, Checked',
        'Complexity, a structure choice, and the operating-systems and networking questions a written round opens with.',
        ['State the cost of your own solution and answer core-CS questions at written-round depth'],
        55, { unitType: 'PRACTICE', after: ['ENGINEERING_CHECK'] }),
      u('PROJECT_COMMS_CHECK', 'Your Projects and How You Talk About Them',
        'Five minutes on something you built. What it was for, how it worked, what went wrong.',
        ['Describe your own work to somebody who was not there, and notice where the account runs out'],
        45, { unitType: 'PRACTICE', after: ['CORE_CS_CHECK'] }),
      u('CHECKPOINT', 'Year-4 Standing Checkpoint',
        'Where the placement year starts for you, and which of the four the next weeks will spend most on.',
        ['Have an accurate picture of what Year 4 will open with, and why'],
        40, { unitType: 'CHECKPOINT', after: ['PROJECT_COMMS_CHECK'] }),
    ],
  },
  T4_PLACEMENT_PLAN: {
    category: 'UNIVERSAL',
    units: [
      u('READING_YOUR_EVIDENCE', 'Reading Your Own Diagnostic',
        'What the numbers mean, what they do not, and why one low skill is a gap rather than a verdict.',
        ['Read your own skill profile without either dismissing it or over-reading it'], 40),
      u('WHICH_ROLES_ARE_REAL', 'Which Roles Are Actually Open to You',
        'Matching your evidence against what different roles screen for, before deciding what to chase.',
        ['Name two or three roles your evidence already supports, and one it would support with work'],
        45, { after: ['READING_YOUR_EVIDENCE'] }),
      u('THE_PLAN', 'What the Next Weeks Contain',
        'How the plan was built from your evidence, what is being taught first, and what would change it.',
        ['Explain why your plan opens where it does, and what the placement practice runs alongside'],
        40, { after: ['WHICH_ROLES_ARE_REAL'] }),
    ],
  },

  /* ── P02 · The ten-day bridge ────────────────────────────────────────────────────────── */
  T4_BR_PROGRAMMING: {
    category: 'UNIVERSAL',
    units: [
      u('VALUES_AND_TYPES', 'Values, Types and the Errors They Cause',
        'What a value is, what a type changes, and the three conversions that break most beginner programs.',
        ['Predict what a mixed-type expression evaluates to before running it'], 50),
      u('INPUT_TO_ANSWER', 'From Input to a Correct Answer',
        'Reading input, computing, printing — and the difference between a program that runs and one that is right.',
        ['Write a program that reads input, computes something and prints the correct answer'],
        50, { after: ['VALUES_AND_TYPES'] }),
      ...closeOutLight('Programming Core', 'INPUT_TO_ANSWER'),
    ],
  },
  T4_BR_CONTROL_FLOW: {
    category: 'UNIVERSAL',
    units: [
      u('CONDITIONS_AND_LOGIC', 'Conditions, and Boolean Logic That Holds Up',
        'if/elif/else, and the compound conditions that quietly mean something other than what you wrote.',
        ['Write a compound condition and say exactly which inputs make it true'], 50),
      u('LOOPS_AND_STOPPING', 'Loops, and Stopping at the Right Moment',
        'The off-by-one, the loop that never ends, and the one that ends one iteration early.',
        ['Write and trace a loop, and say what it does on the first and last element'],
        50, { after: ['CONDITIONS_AND_LOGIC'] }),
      ...closeOutLight('Control Flow', 'LOOPS_AND_STOPPING'),
    ],
  },
  T4_BR_FUNCTIONS: {
    category: 'UNIVERSAL',
    units: [
      u('PARAMETERS_AND_RETURNS', 'Parameters, Returns, and Why Printing Is Not Returning',
        'The single most common structural confusion in a beginner program, and what it costs later.',
        ['Write a function that returns rather than prints, and use its result somewhere else'], 50),
      u('SCOPE', 'Scope, and Where a Name Stops Meaning Anything',
        'Local, global, and the variable that was modified somewhere you were not looking.',
        ['Say which names are visible where, and fix a bug caused by one that was not'],
        50, { after: ['PARAMETERS_AND_RETURNS'] }),
      ...closeOutLight('Functions', 'SCOPE'),
    ],
  },
  T4_BR_COLLECTIONS: {
    category: 'UNIVERSAL',
    units: [
      u('LISTS_AND_STRINGS', 'Lists and Strings, and Slicing Without Fear',
        'Indexing, slicing, mutation, and the copy you thought you made.',
        ['Slice and mutate a list correctly, and say when you have a copy and when you have not'], 50),
      u('MAPS_AND_SETS', 'Dictionaries and Sets, and When Each One Is Right',
        'Lookup by key, membership, uniqueness — and why the answer is almost never "a list".',
        ['Choose between a list, a dictionary and a set for a stated problem, and say why'],
        55, { after: ['LISTS_AND_STRINGS'] }),
      ...closeOutLight('Collections', 'MAPS_AND_SETS'),
    ],
  },
  T4_BR_OOP: {
    category: 'UNIVERSAL',
    units: [
      u('CLASSES_AND_OBJECTS', 'Classes, Objects and Constructors',
        'What a class is for, what an instance holds, and what the constructor is actually doing.',
        ['Write a class with state and behaviour, and create two instances that do not interfere'], 55),
      u('ENCAPSULATION', 'Encapsulation, and What It Buys You',
        'Keeping the inside private so the outside can stop caring, and what breaks when it does not.',
        ['Explain what encapsulation prevented in a class you wrote'],
        50, { after: ['CLASSES_AND_OBJECTS'] }),
      ...closeOutLight('Classes and Objects', 'ENCAPSULATION'),
    ],
  },
  T4_BR_DSA: {
    category: 'UNIVERSAL',
    units: [
      u('COMPLEXITY', 'What a Loop Costs',
        'Big-O as a habit rather than a subject: counting the work before the code is written.',
        ['State the time cost of a loop you wrote, and of the nested one beside it'], 55),
      u('SEARCH_AND_SORT', 'Searching and Sorting, and Choosing Between Them',
        'Linear against binary, and why sorting first is sometimes the cheaper answer.',
        ['Pick the cheaper of two correct approaches for a stated input size'],
        55, { after: ['COMPLEXITY'] }),
      ...closeOutLight('Complexity and Sorting', 'SEARCH_AND_SORT'),
    ],
  },
  T4_BR_DATABASE: {
    category: 'UNIVERSAL',
    units: [
      u('TABLES_AND_ROWS', 'Tables, Rows, Keys and CRUD',
        'What a row is, what a key promises, and the four operations everything else is built from.',
        ['Create, read, update and delete rows in a table with a primary key'], 55),
      u('JOINS', 'Joins, and Getting the Rows You Meant',
        'Inner against left, and the duplicated rows that mean your join condition was wrong.',
        ['Query across two related tables and get the rows you meant rather than the rows you got'],
        60, { after: ['TABLES_AND_ROWS'] }),
      ...closeOutLight('SQL', 'JOINS'),
    ],
  },
  T4_BR_WEB_API: {
    category: 'UNIVERSAL',
    units: [
      u('REQUEST_AND_RESPONSE', 'A Request, a Response and a Status Code',
        'What actually travels, and why the status code is the first thing to read rather than the last.',
        ['Read an HTTP exchange and say what the server was telling you'], 50),
      u('REST_AND_JSON', 'REST and JSON in Practice',
        'Resources, verbs, a body, and parsing a response that is not shaped the way you assumed.',
        ['Call an API and handle the response that is not 200'],
        55, { after: ['REQUEST_AND_RESPONSE'] }),
      ...closeOutLight('HTTP and REST', 'REST_AND_JSON'),
    ],
  },
  T4_BR_ENGINEERING: {
    category: 'UNIVERSAL',
    units: [
      u('GIT_AND_BRANCHES', 'Git, Branches and Not Losing Work',
        'Commit, branch, merge, and the three commands that get you out of trouble.',
        ['Work on a branch and merge it back without losing anything'], 55),
      u('TESTS_AND_SHELL', 'A Test That Fails For the Right Reason',
        'Writing the failing test first, and enough shell to run things and read what they printed.',
        ['Write a test that fails for the right reason, and run it from a terminal'],
        55, { after: ['GIT_AND_BRANCHES'] }),
      ...closeOutLight('Git and Testing', 'TESTS_AND_SHELL'),
    ],
  },
  T4_BR_INTEGRATION: {
    category: 'UNIVERSAL',
    units: [
      u('PLANNING_THE_TASK', 'Planning a Task Before Opening the Editor',
        'Turning a one-line brief into the four or five steps it actually decomposes into.',
        ['Break an unfamiliar task into steps you could hand to somebody else'], 45),
      u('BUILDING_IT', 'Building the Integration Task',
        'One small thing that touches the database, an API, Git and a test — the whole bridge at once.',
        ['Build something end to end that uses everything the bridge taught'],
        120, { unitType: 'PROJECT', after: ['PLANNING_THE_TASK'] }),
      u('DEBUGGING_IT', 'When the Integration Breaks',
        'Finding which of the four layers is actually wrong, rather than changing all of them.',
        ['Trace a fault across layers instead of guessing which one it is in'],
        50, { unitType: 'DEBUG', after: ['BUILDING_IT'] }),
      u('CHECKPOINT', 'Bridge Checkpoint',
        'Whether the foundations are now in place, measured rather than assumed.',
        ['Show that the fundamentals the rest of Year 4 assumes are actually there'],
        45, { unitType: 'CHECKPOINT', after: ['DEBUGGING_IT'] }),
    ],
  },
};
