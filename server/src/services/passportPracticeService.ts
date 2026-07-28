// Passport Practice Lab — the `practice` entitlement.
//
// A self-contained, deterministic problem bank (coding / SQL / MCQ) so a Passport
// member never has to enter the LMS. Coding + SQL run on the SAME self-hosted Piston
// instance the LMS assignments use (codeRunnerService), MCQ sets grade locally.
//
// The bank lives in code on purpose: it must exist for every tenant on day one with
// no seeding step. Admins tune WHICH problems get surfaced via the mission pools.

import codeRunner from './codeRunnerService';
import { ProgrammingLanguage } from '../models/Assignment';

export type PracticeKind = 'coding' | 'sql' | 'mcq';

export interface PracticeTest { input: string; expected: string; hidden?: boolean }
export interface PracticeMcq { q: string; options: string[]; answer: number; explain?: string }

export interface PracticeProblem {
  id: string;
  kind: PracticeKind;
  title: string;
  category: string;                       // PASSPORT_CATEGORIES key
  difficulty: 'easy' | 'medium' | 'hard';
  xp: number;
  prompt: string;
  languages?: ProgrammingLanguage[];      // coding only
  starter?: Partial<Record<ProgrammingLanguage, string>>;
  tests?: PracticeTest[];
  setupSql?: string;                      // sql only — prepended before the student's query
  schemaNote?: string;                    // sql only — shown to the student
  questions?: PracticeMcq[];              // mcq only
}

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
    difficulty: 'easy', xp: 20,
    prompt: 'Read a single integer N from input. Print `Even` if it is even, otherwise print `Odd`.',
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
    difficulty: 'easy', xp: 20,
    prompt: 'Read three integers separated by spaces on one line. Print the largest one.',
    languages: CODE_LANGS, starter: starterFor('Print the largest of the three numbers'),
    tests: [
      { input: '3 9 5', expected: '9' },
      { input: '10 2 7', expected: '10' },
      { input: '-4 -9 -1', expected: '-1', hidden: true },
    ],
  },
  {
    id: 'c-reverse-string', kind: 'coding', title: 'Reverse a String', category: 'technical',
    difficulty: 'easy', xp: 25,
    prompt: 'Read a single word from input and print it reversed.',
    languages: CODE_LANGS, starter: starterFor('Print the reversed string'),
    tests: [
      { input: 'hello', expected: 'olleh' },
      { input: 'codebegun', expected: 'nugebedoc' },
      { input: 'a', expected: 'a', hidden: true },
    ],
  },
  {
    id: 'c-sum-n', kind: 'coding', title: 'Sum of First N Numbers', category: 'technical',
    difficulty: 'easy', xp: 25,
    prompt: 'Read an integer N. Print the sum 1 + 2 + … + N.',
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
    difficulty: 'easy', xp: 25,
    prompt: 'Read a lowercase word and print how many vowels (a, e, i, o, u) it contains.',
    languages: CODE_LANGS, starter: starterFor('Print the vowel count'),
    tests: [
      { input: 'education', expected: '5' },
      { input: 'rhythm', expected: '0' },
      { input: 'aeiou', expected: '5', hidden: true },
    ],
  },
  {
    id: 'c-palindrome', kind: 'coding', title: 'Palindrome Check', category: 'logical_reasoning',
    difficulty: 'medium', xp: 30,
    prompt: 'Read a single word. Print `Yes` if it reads the same forwards and backwards, otherwise `No`.',
    languages: CODE_LANGS, starter: starterFor('Print Yes or No'),
    tests: [
      { input: 'madam', expected: 'Yes' },
      { input: 'hello', expected: 'No' },
      { input: 'level', expected: 'Yes', hidden: true },
    ],
  },
  {
    id: 'c-fizzbuzz', kind: 'coding', title: 'FizzBuzz', category: 'technical',
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
    difficulty: 'easy', xp: 20,
    prompt: 'Select the `name` of every student in the `students` table, ordered by name (A→Z).',
    schemaNote: 'students(id INTEGER, name TEXT, branch TEXT, cgpa REAL, city TEXT)',
    setupSql: STUDENTS_SETUP(),
    tests: [{ input: '', expected: 'Anita\nDeepak\nKiran\nMeera\nRahul\nSneha' }],
  },
  {
    id: 's-where', kind: 'sql', title: 'Filter with WHERE', category: 'technical',
    difficulty: 'easy', xp: 25,
    prompt: 'Select the `name` of students whose `cgpa` is greater than 8.0, ordered by name (A→Z).',
    schemaNote: 'students(id INTEGER, name TEXT, branch TEXT, cgpa REAL, city TEXT)',
    setupSql: STUDENTS_SETUP(),
    tests: [{ input: '', expected: 'Anita\nMeera\nSneha' }],
  },
  {
    id: 's-count-group', kind: 'sql', title: 'COUNT with GROUP BY', category: 'technical',
    difficulty: 'medium', xp: 30,
    prompt: 'For each `branch`, print the branch and how many students are in it, as `branch|count`, ordered by branch (A→Z).',
    schemaNote: 'students(id INTEGER, name TEXT, branch TEXT, cgpa REAL, city TEXT)',
    setupSql: STUDENTS_SETUP(),
    tests: [{ input: '', expected: 'CSE|3\nECE|2\nMECH|1' }],
  },
  {
    id: 's-join', kind: 'sql', title: 'Join Two Tables', category: 'technical',
    difficulty: 'medium', xp: 35,
    prompt: 'Print `name|company` for every student who has a placement record, ordered by name (A→Z).',
    schemaNote: 'students(id, name, branch, cgpa, city) · placements(student_id, company, package_lpa)',
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
    id: p.id, kind: p.kind, title: p.title, category: p.category,
    difficulty: p.difficulty, xp: p.xp, prompt: p.prompt,
    languages: p.languages, starter: p.starter,
    schemaNote: p.schemaNote,
    sampleTests: (p.tests || []).filter(t => !t.hidden).map(t => ({ input: t.input, expected: t.expected })),
    testCount: (p.tests || []).length,
    questions: (p.questions || []).map(q => ({ q: q.q, options: q.options })),
  };
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

    if (r.compilationError && !compilationError) compilationError = r.compilationError;
    results.push({
      index: i, hidden: !!t.hidden, passed: r.passed,
      input: t.hidden ? '(hidden)' : t.input,
      expected: t.hidden ? '(hidden)' : t.expected,
      got: t.hidden && !r.passed ? '(hidden)' : (r.output || ''),
      error: r.error || r.compilationError,
    });
    // A compile error fails every test identically — no point burning Piston runs.
    if (r.compilationError) break;
  }

  const passedCount = results.filter(r => r.passed).length;
  return {
    results, passedCount, total: tests.length,
    allPassed: tests.length > 0 && passedCount === tests.length,
    compilationError,
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
