// Passport Practice Lab — the `practice` entitlement.
//
// A self-contained, deterministic problem bank (coding / SQL / MCQ) so a Passport
// member never has to enter the LMS. Coding + SQL run on the SAME self-hosted Piston
// instance the LMS assignments use (codeRunnerService), MCQ sets grade locally.
//
// The bank lives in code on purpose: it must exist for every tenant on day one with
// no seeding step. Admins tune WHICH problems get surfaced via the mission pools.

import mongoose from 'mongoose';
import codeRunner from './codeRunnerService';
import ThinkingProblem, { audienceFilter } from '../models/ThinkingProblem';
import { ProgrammingLanguage } from '../models/Assignment';

export type PracticeKind = 'coding' | 'sql' | 'mcq';

export interface PracticeTest { input: string; expected: string; hidden?: boolean }
export interface PracticeMcq { q: string; options: string[]; answer: number; explain?: string }

export interface SchemaColumn { column: string; type: string }
export interface SchemaTable { table: string; columns: SchemaColumn[] }

export interface PracticeProblem {
  id: string;
  kind: PracticeKind;
  title: string;
  subtitle?: string;                      // one-line "what you'll learn"
  category: string;                       // PASSPORT_CATEGORIES key
  difficulty: 'easy' | 'medium' | 'hard' | 'expert' | 'interview';
  xp: number;
  estimatedMinutes?: number;
  prompt: string;
  learningGoals?: string[];               // concepts this problem drills
  tip?: string;                           // always-visible nudge
  hints?: string[];                       // progressive, revealed on request
  languages?: ProgrammingLanguage[];      // coding only
  starter?: Partial<Record<ProgrammingLanguage, string>>;
  tests?: PracticeTest[];
  setupSql?: string;                      // sql only — prepended before the student's query
  schemaNote?: string;                    // sql only — plain-text fallback
  schema?: SchemaTable[];                 // sql only — rendered as a column/type table
  questions?: PracticeMcq[];              // mcq only
}

/** The fixtures the SQL problems query, as data so the UI can render a schema table. */
const STUDENTS_SCHEMA: SchemaTable = {
  table: 'students',
  columns: [
    { column: 'id', type: 'INTEGER' },
    { column: 'name', type: 'TEXT' },
    { column: 'branch', type: 'TEXT' },
    { column: 'cgpa', type: 'REAL' },
    { column: 'city', type: 'TEXT' },
  ],
};

const PLACEMENTS_SCHEMA: SchemaTable = {
  table: 'placements',
  columns: [
    { column: 'student_id', type: 'INTEGER' },
    { column: 'company', type: 'TEXT' },
    { column: 'package_lpa', type: 'REAL' },
  ],
};

const PY = ProgrammingLanguage.PYTHON;
const JS = ProgrammingLanguage.JAVASCRIPT;
const JAVA = ProgrammingLanguage.JAVA;
const CODE_LANGS = [PY, JS, JAVA];

const starterFor = (fn: string): Partial<Record<ProgrammingLanguage, string>> => ({
  [PY]: `# Read input from stdin, print the answer.\n# ${fn}\n`,
  [JS]: `// Read all stdin, print the answer.\nconst data = require('fs').readFileSync(0, 'utf8').trim();\n// ${fn}\n`,
  [JAVA]: `import java.util.*;\n\npublic class Main {\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n    // ${fn}\n  }\n}\n`,
});

export const PRACTICE_BANK: PracticeProblem[] = [
  // ── Coding ───────────────────────────────────────────────────────────────────
  {
    id: 'c-even-odd', kind: 'coding', title: 'Even or Odd', category: 'technical',
    subtitle: 'Your first program: read input, branch, print.',
    difficulty: 'easy', xp: 20, estimatedMinutes: 3,
    prompt: 'Read a single integer N from input. Print `Even` if it is even, otherwise print `Odd`.',
    learningGoals: ['Reading from stdin', 'The modulo operator', 'if / else'],
    tip: 'A number is even when n % 2 equals 0.',
    hints: [
      'Read the whole line and convert it to an integer first.',
      'Use % 2 to get the remainder after dividing by two.',
      'Print exactly Even or Odd — capitalisation is compared.',
    ],
    languages: CODE_LANGS, starter: starterFor('Print Even or Odd'),
    tests: [
      { input: '4', expected: 'Even' },
      { input: '7', expected: 'Odd' },
      { input: '0', expected: 'Even', hidden: true },
      { input: '-3', expected: 'Odd', hidden: true },
    ],
  },
  {
    id: 'c-largest3', kind: 'coding', title: 'Largest of Three', category: 'technical',
    subtitle: 'Compare several values and pick the biggest.',
    difficulty: 'easy', xp: 20, estimatedMinutes: 4,
    prompt: 'Read three integers separated by spaces on one line. Print the largest one.',
    learningGoals: ['Splitting a line of input', 'Comparisons', 'Built-in max'],
    tip: 'Most languages have a max() that accepts several arguments at once.',
    hints: [
      'Split the line on spaces to get three separate pieces.',
      'Convert each piece to an integer before comparing them.',
      'max(a, b, c) does the whole job in a single call.',
    ],
    languages: CODE_LANGS, starter: starterFor('Print the largest of the three numbers'),
    tests: [
      { input: '3 9 5', expected: '9' },
      { input: '10 2 7', expected: '10' },
      { input: '-4 -9 -1', expected: '-1', hidden: true },
    ],
  },
  {
    id: 'c-reverse-string', kind: 'coding', title: 'Reverse a String', category: 'technical',
    subtitle: 'Treat a string as a sequence you can walk backwards.',
    difficulty: 'easy', xp: 25, estimatedMinutes: 4,
    prompt: 'Read a single word from input and print it reversed.',
    learningGoals: ['String indexing', 'Slicing and reversal', 'Printing a result'],
    tip: 'Many languages reverse a string in one expression — look for slicing or a reverse helper.',
    hints: [
      'A string can be treated as a list of characters.',
      'In Python, s[::-1] reverses it in one step.',
      'In Java, use new StringBuilder(s).reverse().toString().',
    ],
    languages: CODE_LANGS, starter: starterFor('Print the reversed string'),
    tests: [
      { input: 'hello', expected: 'olleh' },
      { input: 'codebegun', expected: 'nugebedoc' },
      { input: 'a', expected: 'a', hidden: true },
    ],
  },
  {
    id: 'c-sum-n', kind: 'coding', title: 'Sum of First N Numbers', category: 'technical',
    subtitle: 'Loop over a range and accumulate a running total.',
    difficulty: 'easy', xp: 25, estimatedMinutes: 4,
    prompt: 'Read an integer N. Print the sum 1 + 2 + … + N.',
    learningGoals: ['for loops', 'Accumulator variables', 'Inclusive range bounds'],
    tip: 'There is also a closed formula: n * (n + 1) / 2 — try the loop first, then the formula.',
    hints: [
      'Start a total at 0 before the loop.',
      'Loop i from 1 to N inclusive, adding i to the total each time.',
      'Watch the upper bound — N itself must be included.',
    ],
    languages: CODE_LANGS, starter: starterFor('Print the sum from 1 to N'),
    tests: [
      { input: '5', expected: '15' },
      { input: '10', expected: '55' },
      { input: '1', expected: '1', hidden: true },
      { input: '100', expected: '5050', hidden: true },
    ],
  },
  {
    id: 'c-count-vowels', kind: 'coding', title: 'Count the Vowels', category: 'technical',
    subtitle: 'Scan a string and count the characters that match.',
    difficulty: 'easy', xp: 25, estimatedMinutes: 5,
    prompt: 'Read a lowercase word and print how many vowels (a, e, i, o, u) it contains.',
    learningGoals: ['Iterating over a string', 'Membership tests', 'Counters'],
    tip: 'Test membership against the set of vowels rather than writing five separate comparisons.',
    hints: [
      'Set a counter to 0, then loop over each character.',
      'Check whether the character is one of a, e, i, o, u.',
      'Print the counter at the end, not the word.',
    ],
    languages: CODE_LANGS, starter: starterFor('Print the vowel count'),
    tests: [
      { input: 'education', expected: '5' },
      { input: 'rhythm', expected: '0' },
      { input: 'aeiou', expected: '5', hidden: true },
    ],
  },
  {
    id: 'c-palindrome', kind: 'coding', title: 'Palindrome Check', category: 'logical_reasoning',
    subtitle: 'Compare a sequence against its own reverse.',
    difficulty: 'medium', xp: 30, estimatedMinutes: 5,
    prompt: 'Read a single word. Print `Yes` if it reads the same forwards and backwards, otherwise `No`.',
    learningGoals: ['String reversal', 'Equality testing', 'Turning a boolean into output'],
    tip: 'Reverse the word into a second variable and compare the two — if equal, it is a palindrome.',
    hints: [
      'Reverse the input and store it separately.',
      'Compare the original and the reversed string with ==.',
      'Print exactly Yes or No, not true or false.',
    ],
    languages: CODE_LANGS, starter: starterFor('Print Yes or No'),
    tests: [
      { input: 'madam', expected: 'Yes' },
      { input: 'hello', expected: 'No' },
      { input: 'level', expected: 'Yes', hidden: true },
    ],
  },
  {
    id: 'c-fizzbuzz', kind: 'coding', title: 'FizzBuzz', category: 'technical',
    subtitle: 'The classic warm-up: loops plus ordered conditionals.',
    learningGoals: ['Loops', 'Multiple conditions', 'Order of checks matters'],
    tip: 'Check divisibility by 15 FIRST, or the FizzBuzz case can never fire.',
    hints: [
      'Loop i from 1 to N inclusive.',
      'Test i % 15 == 0 before testing 3 or 5 separately.',
      'If none match, print the number itself.',
    ],
    estimatedMinutes: 6,
    difficulty: 'medium', xp: 30,
    prompt: 'Read an integer N. For every number from 1 to N print, on its own line: `Fizz` if divisible by 3, `Buzz` if divisible by 5, `FizzBuzz` if divisible by both, otherwise the number itself.',
    languages: CODE_LANGS, starter: starterFor('Print the FizzBuzz sequence up to N'),
    tests: [
      { input: '5', expected: '1\n2\nFizz\n4\nBuzz' },
      { input: '15', expected: '1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz', hidden: true },
    ],
  },
  {
    id: 'c-second-largest', kind: 'coding', title: 'Second Largest', category: 'logical_reasoning',
    subtitle: 'Track a runner-up while handling duplicate values.',
    learningGoals: ['Deduplication', 'Sorting', 'Edge cases with repeated values'],
    tip: 'Distinct matters: in [9, 9, 5] the second largest is 5, not 9.',
    hints: [
      'Read N first, then read the N numbers from the second line.',
      'Remove duplicates before you sort.',
      'Sort descending and take the element at index 1.',
    ],
    estimatedMinutes: 8,
    difficulty: 'medium', xp: 35,
    prompt: 'The first line has N. The second line has N integers separated by spaces. Print the second largest DISTINCT value.',
    languages: CODE_LANGS, starter: starterFor('Print the second largest distinct number'),
    tests: [
      { input: '5\n3 9 5 9 1', expected: '5' },
      { input: '4\n10 2 7 7', expected: '7' },
      { input: '3\n-1 -5 -3', expected: '-3', hidden: true },
    ],
  },

  // ── SQL ──────────────────────────────────────────────────────────────────────
  {
    id: 's-select-all', kind: 'sql', title: 'Your First SELECT', category: 'technical',
    subtitle: 'Learn to retrieve data from a SQL table.',
    difficulty: 'easy', xp: 20, estimatedMinutes: 3,
    prompt: 'Select the `name` of every student in the `students` table, ordered by name (A→Z).',
    learningGoals: ['SELECT', 'ORDER BY', 'Alphabetical sorting'],
    tip: 'Use ORDER BY name to sort results alphabetically.',
    hints: [
      'Start with SELECT <column> FROM <table>;',
      'The column you want is name, and the table is students.',
      'Add ORDER BY name at the end to sort A to Z.',
    ],
    schemaNote: 'students(id INTEGER, name TEXT, branch TEXT, cgpa REAL, city TEXT)',
    schema: [STUDENTS_SCHEMA],
    setupSql: STUDENTS_SETUP(),
    tests: [{ input: '', expected: 'Anita\nDeepak\nKiran\nMeera\nRahul\nSneha' }],
  },
  {
    id: 's-where', kind: 'sql', title: 'Filter with WHERE', category: 'technical',
    subtitle: 'Narrow results down to the rows you actually want.',
    difficulty: 'easy', xp: 25, estimatedMinutes: 4,
    prompt: 'Select the `name` of students whose `cgpa` is greater than 8.0, ordered by name (A→Z).',
    learningGoals: ['WHERE', 'Comparison operators', 'WHERE with ORDER BY'],
    tip: 'WHERE filters rows before they are returned; ORDER BY then sorts whatever survives.',
    hints: [
      'Add a WHERE clause after FROM students.',
      'The condition compares the cgpa column against 8.0.',
      'Greater-than is >, so the clause reads: WHERE cgpa > 8.0',
    ],
    schemaNote: 'students(id INTEGER, name TEXT, branch TEXT, cgpa REAL, city TEXT)',
    schema: [STUDENTS_SCHEMA],
    setupSql: STUDENTS_SETUP(),
    tests: [{ input: '', expected: 'Anita\nMeera\nSneha' }],
  },
  {
    id: 's-count-group', kind: 'sql', title: 'COUNT with GROUP BY', category: 'technical',
    subtitle: 'Summarise many rows into one row per group.',
    difficulty: 'medium', xp: 30, estimatedMinutes: 6,
    prompt: 'For each `branch`, print the branch and how many students are in it, as `branch|count`, ordered by branch (A→Z).',
    learningGoals: ['GROUP BY', 'COUNT()', 'Aggregating and sorting together'],
    tip: 'Every non-aggregated column in your SELECT must also appear in GROUP BY.',
    hints: [
      'Select two things: the branch, and a count of rows in each branch.',
      'COUNT(*) counts the rows inside each group.',
      'SELECT branch, COUNT(*) FROM students GROUP BY branch ORDER BY branch;',
    ],
    schemaNote: 'students(id INTEGER, name TEXT, branch TEXT, cgpa REAL, city TEXT)',
    schema: [STUDENTS_SCHEMA],
    setupSql: STUDENTS_SETUP(),
    tests: [{ input: '', expected: 'CSE|3\nECE|2\nMECH|1' }],
  },
  {
    id: 's-join', kind: 'sql', title: 'Join Two Tables', category: 'technical',
    subtitle: 'Pull related rows from two tables into one result.',
    difficulty: 'medium', xp: 35, estimatedMinutes: 8,
    prompt: 'Print `name|company` for every student who has a placement record, ordered by name (A→Z).',
    learningGoals: ['INNER JOIN', 'Join keys', 'Selecting across tables'],
    tip: 'An INNER JOIN keeps only rows matching in BOTH tables, so students with no placement drop out.',
    hints: [
      'The tables link on students.id = placements.student_id.',
      'Use: FROM students JOIN placements ON students.id = placements.student_id',
      'Then select the name and company columns, and ORDER BY the name.',
    ],
    schemaNote: 'students(id, name, branch, cgpa, city) · placements(student_id, company, package_lpa)',
    schema: [STUDENTS_SCHEMA, PLACEMENTS_SCHEMA],
    setupSql: `${STUDENTS_SETUP()}
CREATE TABLE placements (student_id INTEGER, company TEXT, package_lpa REAL);
INSERT INTO placements VALUES (1,'Infosys',4.5),(3,'TCS',3.6),(5,'Zoho',6.5);
`,
    tests: [{ input: '', expected: 'Anita|Zoho\nRahul|Infosys\nSneha|TCS' }],
  },

  // ── MCQ sets ─────────────────────────────────────────────────────────────────
  {
    id: 'm-aptitude-1', kind: 'mcq', title: 'Aptitude — Percentages & Ratios', category: 'aptitude',
    difficulty: 'easy', xp: 20,
    prompt: 'Five quick quantitative questions. No calculator.',
    questions: [
      { q: 'What is 25% of 480?', options: ['110', '120', '125', '130'], answer: 1, explain: '480 × 0.25 = 120.' },
      { q: 'A price rises from ₹800 to ₹1000. What is the percentage increase?', options: ['20%', '22%', '25%', '30%'], answer: 2, explain: '200/800 = 25%.' },
      { q: 'If a : b = 3 : 4 and b = 20, what is a?', options: ['12', '15', '16', '18'], answer: 1, explain: 'a = (3/4) × 20 = 15.' },
      { q: 'A train covers 180 km in 3 hours. Its speed is:', options: ['50 km/h', '55 km/h', '60 km/h', '65 km/h'], answer: 2, explain: '180 ÷ 3 = 60.' },
      { q: 'The average of 4, 8, 12 and 16 is:', options: ['9', '10', '11', '12'], answer: 1, explain: '40 ÷ 4 = 10.' },
    ],
  },
  {
    id: 'm-reasoning-1', kind: 'mcq', title: 'Reasoning — Series & Patterns', category: 'logical_reasoning',
    difficulty: 'easy', xp: 20,
    prompt: 'Five pattern-recognition questions.',
    questions: [
      { q: 'Next in the series: 2, 6, 12, 20, 30, ?', options: ['40', '42', '44', '46'], answer: 1, explain: 'Differences are 4, 6, 8, 10, 12 → 30 + 12 = 42.' },
      { q: 'Odd one out: Square, Circle, Triangle, Cube', options: ['Square', 'Circle', 'Triangle', 'Cube'], answer: 3, explain: 'Cube is 3-D; the rest are 2-D.' },
      { q: 'If MONDAY is coded as NPOEBZ, how is TUE coded?', options: ['UVF', 'UWF', 'SVD', 'UVE'], answer: 0, explain: 'Each letter shifts +1.' },
      { q: 'Next in the series: 1, 4, 9, 16, 25, ?', options: ['30', '33', '36', '39'], answer: 2, explain: 'Perfect squares → 6² = 36.' },
      { q: 'A is B’s father. B is C’s sister. How is A related to C?', options: ['Brother', 'Uncle', 'Father', 'Cousin'], answer: 2, explain: 'B and C are siblings, so A is C’s father.' },
    ],
  },
  {
    id: 'm-programming-1', kind: 'mcq', title: 'Programming Basics', category: 'technical',
    difficulty: 'easy', xp: 20,
    prompt: 'Five fundamentals every interviewer expects you to know.',
    questions: [
      { q: 'Which data structure works on First In, First Out?', options: ['Stack', 'Queue', 'Tree', 'Graph'], answer: 1, explain: 'A queue is FIFO; a stack is LIFO.' },
      { q: 'What is the time complexity of binary search on a sorted array of n items?', options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], answer: 1, explain: 'The search space halves every step.' },
      { q: 'In most languages, an array index starts at:', options: ['0', '1', '-1', 'Depends on the value'], answer: 0, explain: 'Zero-based indexing is the norm.' },
      { q: 'Which keyword defines a value that cannot be reassigned in JavaScript?', options: ['var', 'let', 'const', 'static'], answer: 2, explain: '`const` prevents reassignment of the binding.' },
      { q: 'A function that calls itself is called:', options: ['Iterative', 'Recursive', 'Inline', 'Anonymous'], answer: 1, explain: 'That is the definition of recursion.' },
    ],
  },
  {
    id: 'm-db-1', kind: 'mcq', title: 'Databases & SQL Concepts', category: 'technical',
    difficulty: 'medium', xp: 25,
    prompt: 'Five database questions that come up in nearly every fresher interview.',
    questions: [
      { q: 'Which SQL clause filters rows BEFORE grouping?', options: ['HAVING', 'WHERE', 'ORDER BY', 'LIMIT'], answer: 1, explain: 'WHERE filters rows; HAVING filters groups.' },
      { q: 'A PRIMARY KEY column must be:', options: ['Unique only', 'Not null only', 'Unique and not null', 'Indexed only'], answer: 2, explain: 'Both constraints together.' },
      { q: 'Which join returns only rows matching in BOTH tables?', options: ['LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'FULL OUTER JOIN'], answer: 2, explain: 'INNER JOIN keeps only matches.' },
      { q: 'What does normalization primarily reduce?', options: ['Query speed', 'Data redundancy', 'Disk cost', 'Index size'], answer: 1, explain: 'It removes duplicate data across tables.' },
      { q: 'Which aggregate ignores NULL values?', options: ['COUNT(*)', 'COUNT(column)', 'Both', 'Neither'], answer: 1, explain: 'COUNT(column) skips NULLs; COUNT(*) counts rows.' },
    ],
  },
  {
    id: 'm-employability-1', kind: 'mcq', title: 'Interview & Workplace Readiness', category: 'employability',
    difficulty: 'easy', xp: 20,
    prompt: 'Five questions on how hiring actually works.',
    questions: [
      { q: 'What does ATS stand for in recruitment?', options: ['Automated Test Screening', 'Applicant Tracking System', 'Advanced Talent Sourcing', 'Applied Technical Standard'], answer: 1, explain: 'Software that parses and filters resumes.' },
      { q: 'The best length for a fresher resume is:', options: ['1 page', '2 pages', '3 pages', 'As long as needed'], answer: 0, explain: 'One tight page for a fresher.' },
      { q: 'In a STAR answer, the "R" stands for:', options: ['Reason', 'Result', 'Reference', 'Review'], answer: 1, explain: 'Situation, Task, Action, Result.' },
      { q: 'When asked "tell me about yourself", you should mostly talk about:', options: ['Your family background', 'Your relevant skills and projects', 'Your hobbies', 'Your salary expectations'], answer: 1, explain: 'Keep it professional and role-relevant.' },
      { q: 'A good follow-up after an interview is:', options: ['Call daily', 'A short thank-you note within 24 hours', 'Nothing at all', 'Message the CEO'], answer: 1, explain: 'Polite, prompt, and brief.' },
    ],
  },
  {
    id: 'm-clarity-1', kind: 'mcq', title: 'Career Clarity Check', category: 'career_clarity',
    difficulty: 'easy', xp: 15,
    prompt: 'Five questions to sharpen your direction.',
    questions: [
      { q: 'A backend developer mainly works on:', options: ['Visual design', 'Server logic, APIs and databases', 'Client meetings', 'Manual testing'], answer: 1, explain: 'Server-side logic and data.' },
      { q: 'Which role most often uses SQL every day?', options: ['Data Analyst', 'UI Designer', 'Network Technician', 'Content Writer'], answer: 0, explain: 'Analysts query data constantly.' },
      { q: 'A "full stack" developer works on:', options: ['Only frontend', 'Only backend', 'Both frontend and backend', 'Only databases'], answer: 2, explain: 'Both ends of the application.' },
      { q: 'For a fresher, the strongest proof of skill is:', options: ['A long list of certificates', 'Projects you can explain and demo', 'A high CGPA alone', 'Number of courses enrolled'], answer: 1, explain: 'Demonstrable work beats claims.' },
      { q: 'The best first step when you feel unsure about your career is:', options: ['Wait for placements', 'Assess where you stand and pick one target role', 'Apply everywhere randomly', 'Change your branch'], answer: 1, explain: 'Measure, then aim.' },
    ],
  },
];

function STUDENTS_SETUP(): string {
  return `CREATE TABLE students (id INTEGER, name TEXT, branch TEXT, cgpa REAL, city TEXT);
INSERT INTO students VALUES
 (1,'Rahul','CSE',7.8,'Vizag'),
 (2,'Meera','ECE',8.4,'Hyderabad'),
 (3,'Sneha','CSE',8.9,'Vijayawada'),
 (4,'Kiran','MECH',6.9,'Guntur'),
 (5,'Anita','CSE',9.1,'Vizag'),
 (6,'Deepak','ECE',7.2,'Tirupati');
`;
}

/** Public (student-safe) shape — hidden tests and MCQ answers stripped. */
export function toPublic(p: PracticeProblem) {
  return {
    id: p.id, kind: p.kind, title: p.title, subtitle: p.subtitle, category: p.category,
    difficulty: p.difficulty, xp: p.xp, estimatedMinutes: p.estimatedMinutes,
    prompt: p.prompt, learningGoals: p.learningGoals || [], tip: p.tip,
    hints: p.hints || [],
    languages: p.languages, starter: p.starter,
    schemaNote: p.schemaNote, schema: p.schema || [],
    sampleTests: (p.tests || []).filter(t => !t.hidden).map(t => ({ input: t.input, expected: t.expected })),
    testCount: (p.tests || []).length,
    questions: (p.questions || []).map(q => ({ q: q.q, options: q.options })),
  };
}

/**
 * The shared bank, in this module's shape.
 *
 * Two sources feed the Practice Lab: the eighteen built-ins that ship in code so a brand-new
 * tenant is never empty, and the admin-authored bank the Thinking Lab already owns. Rather
 * than teach every caller about both, a database problem is translated INTO PracticeProblem
 * here and everything downstream — toPublic, runProblem, grading — stays unchanged.
 *
 * The id is prefixed. A built-in is `c-even-odd`; a database one is `db:<objectid>`, so the
 * two id spaces can never collide and `findCareerPilotProblem` can route on the prefix alone
 * without a speculative Mongo lookup for every built-in.
 */
export const DB_PREFIX = 'db:';

export function fromThinkingProblem(doc: any): PracticeProblem {
  const lang = String(doc.language || 'python').toLowerCase() as ProgrammingLanguage;
  return {
    id: `${DB_PREFIX}${String(doc._id)}`,
    kind: 'coding',
    title: doc.title,
    subtitle: doc.category,
    category: 'technical',
    difficulty: doc.difficulty,
    xp: Number(doc.xp) || 50,
    estimatedMinutes: doc.estimatedMinutes,
    prompt: doc.statement,
    hints: doc.hints || [],
    tip: doc.constraints || undefined,
    languages: [lang],
    starter: doc.starterCode ? ({ [lang]: doc.starterCode } as any) : undefined,
    // `hidden` carries straight through, which is what keeps a hidden case out of the
    // sample list toPublic builds and out of a Run.
    tests: (doc.testCases || []).map((t: any) => ({
      input: String(t.input ?? ''),
      expected: String(t.expectedOutput ?? ''),
      hidden: !!t.hidden,
    })),
  };
}

/**
 * One problem, from whichever bank owns it.
 *
 * Routed on the id prefix rather than by trying both: a built-in lookup is an array scan
 * and a database lookup is a round trip, and doing the round trip for every built-in would
 * make the common case pay for the rare one.
 *
 * The audience filter is applied HERE too, not only in the list. A member who types or
 * guesses a URL for an LMS-only problem must be refused the same way they would be if it
 * simply never appeared — a list filter that a direct fetch can walk around is decoration.
 */
export async function findCareerPilotProblem(
  tenantId: string, id: string,
): Promise<{ problem: PracticeProblem; doc?: any } | null> {
  if (!id.startsWith(DB_PREFIX)) {
    const p = findProblem(id);
    return p ? { problem: p } : null;
  }
  const rawId = id.slice(DB_PREFIX.length);
  if (!mongoose.Types.ObjectId.isValid(rawId)) return null;
  const doc: any = await ThinkingProblem.findOne({
    _id: rawId, tenantId, active: true, ...audienceFilter('careerpilot'),
  }).lean();
  return doc ? { problem: fromThinkingProblem(doc), doc } : null;
}

/**
 * The list a CareerPilot member sees: the built-ins plus everything an admin has shared
 * with them. Database problems come first — they are the tenant's own curriculum, and the
 * built-ins are the floor that stops a new tenant seeing nothing.
 */
export async function listCareerPilotProblems(
  tenantId: string, filter?: { kind?: PracticeKind; category?: string; difficulty?: string },
) {
  const builtIns = listProblems({ kind: filter?.kind, category: filter?.category })
    .filter(p => !filter?.difficulty || p.difficulty === filter.difficulty);

  // Only coding problems live in the shared bank, so a kind filter for sql or mcq can skip
  // the query entirely rather than running one that cannot match.
  if (filter?.kind && filter.kind !== 'coding') return builtIns;

  const q: any = { tenantId, active: true, ...audienceFilter('careerpilot') };
  if (filter?.difficulty) q.difficulty = filter.difficulty;
  const docs: any[] = await ThinkingProblem.find(q)
    .select('title category difficulty xp testCases timesSolved attemptCount estimatedMinutes')
    .sort({ difficulty: 1, title: 1 })
    .limit(500)
    .lean();

  const fromDb = docs.map(d => ({
    id: `${DB_PREFIX}${String(d._id)}`,
    kind: 'coding' as PracticeKind,
    title: d.title,
    category: 'technical',
    difficulty: d.difficulty,
    xp: Number(d.xp) || 50,
    count: (d.testCases || []).length,
    solvedCount: d.timesSolved || 0,
    attemptCount: d.attemptCount || 0,
    estimatedMinutes: d.estimatedMinutes,
  }));

  return [...fromDb, ...builtIns];
}

export function findProblem(id: string): PracticeProblem | undefined {
  return PRACTICE_BANK.find(p => p.id === id);
}

export function listProblems(filter?: { kind?: PracticeKind; category?: string }) {
  return PRACTICE_BANK
    .filter(p => (!filter?.kind || p.kind === filter.kind))
    .filter(p => (!filter?.category || p.category === filter.category))
    .map(p => ({
      id: p.id, kind: p.kind, title: p.title, category: p.category,
      difficulty: p.difficulty, xp: p.xp,
      count: p.kind === 'mcq' ? (p.questions || []).length : (p.tests || []).length,
    }));
}

export interface RunOutcome {
  results: { index: number; hidden: boolean; passed: boolean; input: string; expected: string; got: string; error?: string }[];
  passedCount: number;
  total: number;
  allPassed: boolean;
  compilationError?: string;
  /** Real figures from Piston when its build reports them; 0 means "unknown", and
   *  the UI hides the metric rather than showing a fabricated number. */
  executionMs: number;
  memoryMb: number;
}

/**
 * sqlite reports errors against the whole script it was handed — our fixture schema
 * first, then the student's query — so an error on the student's line 1 comes back as
 * "near line 11". They only ever see their own 3-line editor, so the number is worse
 * than useless: it points at code they cannot see.
 *
 * Two offsets stack, both measured against the live Piston image rather than assumed:
 *   • the sqlite3 runner prepends 2 lines of its own before the file, and
 *   • we prepend `setupSql` plus a joining newline.
 * Subtract both to land back in editor coordinates. If the result falls outside the
 * student's code the error belongs to our fixture, not to them — drop the reference
 * entirely instead of printing a line they can't act on.
 */
function remapSqlErrorLines(err: string, setupSql: string, code: string): string {
  if (!err) return err;
  const PISTON_SQLITE_PREAMBLE_LINES = 2;
  const setupLines = `${setupSql || ''}\n`.split('\n').length - 1;
  const codeLines = String(code || '').split('\n').length;

  return err.replace(/near line (\d+):\s*/gi, (whole, n) => {
    const studentLine = Number(n) - PISTON_SQLITE_PREAMBLE_LINES - setupLines;
    return studentLine >= 1 && studentLine <= codeLines ? `near line ${studentLine}: ` : '';
  });
}

/**
 * Run a coding/SQL submission against its tests on Piston. `visibleOnly` runs just the
 * sample tests (the "Run" button); submit runs everything.
 */
export async function runProblem(
  problem: PracticeProblem,
  code: string,
  language: ProgrammingLanguage,
  visibleOnly = false,
): Promise<RunOutcome> {
  const tests = (problem.tests || []).filter(t => (visibleOnly ? !t.hidden : true));
  const results: RunOutcome['results'] = [];
  let compilationError: string | undefined;
  let executionMs = 0, memoryMb = 0;   // slowest/heaviest test, when Piston reports them

  for (let i = 0; i < tests.length; i++) {
    const t = tests[i];
    // SQL runs as a single script: our fixture schema, then the student's query.
    const finalCode = problem.kind === 'sql' ? `${problem.setupSql || ''}\n${code}` : code;
    const lang = problem.kind === 'sql' ? ProgrammingLanguage.SQL : language;

    const r = await codeRunner.execute({
      code: finalCode,
      language: lang,
      input: t.input || '',
      expectedOutput: t.expected,
      timeLimit: 10000,
      memoryLimit: 256,
      comparisonMode: 'lenient',
    });

    const fix = (m?: string) =>
      problem.kind === 'sql' && m ? remapSqlErrorLines(m, problem.setupSql || '', code) : m;

    if (r.compilationError && !compilationError) compilationError = fix(r.compilationError);
    executionMs = Math.max(executionMs, r.executionTime || 0);
    memoryMb = Math.max(memoryMb, r.memoryUsed || 0);
    results.push({
      index: i, hidden: !!t.hidden, passed: r.passed,
      input: t.hidden ? '(hidden)' : t.input,
      expected: t.hidden ? '(hidden)' : t.expected,
      got: t.hidden && !r.passed ? '(hidden)' : (r.output || ''),
      error: fix(r.error || r.compilationError),
    });
    // A compile error fails every test identically — no point burning Piston runs.
    if (r.compilationError) break;
  }

  const passedCount = results.filter(r => r.passed).length;
  return {
    results, passedCount, total: tests.length,
    allPassed: tests.length > 0 && passedCount === tests.length,
    compilationError, executionMs, memoryMb,
  };
}

/** Grade an MCQ set locally. Returns per-question correctness + explanations. */
export function gradeMcq(problem: PracticeProblem, answers: number[]) {
  const qs = problem.questions || [];
  const review = qs.map((q, i) => ({
    index: i, q: q.q, options: q.options,
    chosen: answers[i] ?? -1, answer: q.answer,
    correct: (answers[i] ?? -1) === q.answer,
    explain: q.explain,
  }));
  const correct = review.filter(r => r.correct).length;
  return { review, correct, total: qs.length, allPassed: qs.length > 0 && correct === qs.length };
}
