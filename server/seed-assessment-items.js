/**
 * Seed a starter Skill-Assessment item bank (Wave A — no code execution).
 * Run from server/:  node seed-assessment-items.js <tenantId> [--force]
 *
 * Inserts a small set of MCQ / Predict-Output / Debug / Complete-Code items
 * across dimensions so the assessment engine can compose real exams. Intended
 * as a starter set — the team expands the bank from the admin UI later.
 * Skips if the tenant already has items, unless --force is passed.
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');

let MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
if (MONGO_URI && MONGO_URI.includes('@mongodb:')) MONGO_URI = MONGO_URI.replace('@mongodb:', '@127.0.0.1:');

// Connect with the URI as-is (works locally); only on an auth error fall back to
// the VPS default admin credentials. This keeps the script usable in both places.
async function connectMongo() {
  try {
    await mongoose.connect(MONGO_URI);
  } catch (e) {
    if (/auth/i.test(e.message || '') && MONGO_URI && !MONGO_URI.includes('@')) {
      const withCreds = MONGO_URI.replace('mongodb://', 'mongodb://admin:password123@') + (MONGO_URI.includes('?') ? '&authSource=admin' : '?authSource=admin');
      await mongoose.connect(withCreds);
    } else {
      throw e;
    }
  }
}

const tenantId = process.argv[2];
const FORCE = process.argv.includes('--force');

const mcq = (dimension, difficulty, prompt, opts, correct) => ({
  type: 'mcq', dimension, difficulty, prompt,
  options: opts.map((t, i) => ({ id: String.fromCharCode(97 + i), text: t })),
  correctOptionIds: correct, points: 1, tags: ['seed'], active: true,
});
const predict = (dimension, difficulty, language, codeSnippet, expectedOutput) => ({
  type: 'predict_output', dimension, difficulty, language,
  prompt: 'What does this code print?', codeSnippet, expectedOutput, points: 1, tags: ['seed'], active: true,
});
const debug = (dimension, difficulty, language, codeSnippet, buggyLineNumber, bugExplanation) => ({
  type: 'debug', dimension, difficulty, language,
  prompt: 'Which line contains the bug?', codeSnippet, buggyLineNumber, bugExplanation, points: 1, tags: ['seed'], active: true,
});
const complete = (dimension, difficulty, language, codeSnippet, blanks) => ({
  type: 'complete_code', dimension, difficulty, language,
  prompt: 'Fill in the blank to make the code correct.', codeSnippet, blanks, points: 1, tags: ['seed'], active: true,
});
const liveCode = (dimension, difficulty, language, prompt, starterCode, testCases) => ({
  type: 'live_code', dimension, difficulty, language, prompt, starterCode, testCases, points: 2, tags: ['seed'], active: true,
});

const ITEMS = [
  // ── Aptitude ──
  mcq('aptitude', 1, 'If 3 pens cost ₹45, what do 7 pens cost?', ['₹90', '₹105', '₹115', '₹120'], ['b']),
  mcq('aptitude', 2, 'What comes next: 2, 6, 12, 20, ___?', ['28', '30', '32', '26'], ['b']),
  mcq('aptitude', 2, 'A is twice as old as B. In 5 years A will be 1.5× B. A is?', ['10', '15', '20', '25'], ['a']),

  // ── Fundamentals ──
  mcq('fundamentals', 1, 'Which is NOT a primitive type in Java?', ['int', 'boolean', 'String', 'char'], ['c']),
  predict('fundamentals', 2, 'java', 'int x = 5;\nx += x++ + ++x;\nSystem.out.println(x);', '17'),
  predict('fundamentals', 2, 'javascript', 'console.log(typeof null);', 'object'),
  debug('fundamentals', 3, 'java',
    'int sum = 0;\nfor (int i = 1; i <= 5; i++)\n  sum =+ i;\nSystem.out.println(sum);', 3,
    'Line 3 uses "=+" (assign positive) instead of "+=".'),

  // ── DSA ──
  mcq('dsa', 2, 'Worst-case time complexity of binary search?', ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'], ['b']),
  mcq('dsa', 3, 'Which structure gives O(1) average lookup by key?', ['Array', 'Linked List', 'Hash Map', 'Binary Tree'], ['c']),
  predict('dsa', 3, 'python', 'a = [1,2,3,4]\nprint(a[-2])', '3'),

  // ── Core Stack ──
  mcq('core_stack', 2, 'In SQL, which keyword removes duplicate rows?', ['UNIQUE', 'DISTINCT', 'GROUP', 'FILTER'], ['b']),
  predict('core_stack', 2, 'javascript', 'const a = [1,2,3];\nconsole.log(a.map(x => x*2).join("-"));', '2-4-6'),
  complete('core_stack', 2, 'java',
    'List<String> names = ____<>();\nnames.add("a");', [{ id: 'b1', acceptedAnswers: ['new ArrayList', 'ArrayList'], caseSensitive: false }]),
  debug('core_stack', 3, 'javascript',
    'function greet(name) {\n  return "Hi " + Name;\n}\nconsole.log(greet("Sam"));', 2,
    'Line 2 references "Name" (undefined) instead of the parameter "name".'),

  // ── Problem Solving ──
  mcq('problem_solving', 2, 'Best approach to find a duplicate in an unsorted array fastest?', ['Nested loops', 'Sort then scan', 'Use a HashSet', 'Binary search'], ['c']),
  predict('problem_solving', 3, 'python', 's = "racecar"\nprint(s == s[::-1])', 'True'),
  debug('problem_solving', 3, 'java',
    'int max = 0;\nint[] arr = {-3, -1, -7};\nfor (int v : arr) if (v > max) max = v;\nSystem.out.println(max);', 1,
    'Line 1 initializes max to 0; for all-negative input it should start at arr[0] or Integer.MIN_VALUE.'),

  // ── Live code (Wave B — graded by Piston against hidden test cases) ──
  liveCode('dsa', 3, 'python',
    'Read an integer n from input and print the n-th Fibonacci number (0-indexed: 0, 1, 1, 2, 3, 5, ...).',
    'n = int(input())\n# your code here\n',
    [
      { input: '7', expectedOutput: '13', hidden: false, weight: 1 },
      { input: '10', expectedOutput: '55', hidden: true, weight: 1 },
      { input: '0', expectedOutput: '0', hidden: true, weight: 1 },
    ]),
  liveCode('core_stack', 3, 'java',
    'Read two integers (each on its own line) and print their sum.',
    'import java.util.*;\npublic class Main {\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n    // your code here\n  }\n}',
    [
      { input: '3\n4', expectedOutput: '7', hidden: false, weight: 1 },
      { input: '100\n250', expectedOutput: '350', hidden: true, weight: 1 },
    ]),
];

(async () => {
  if (!tenantId || !mongoose.isValidObjectId(tenantId)) {
    console.error('Usage: node seed-assessment-items.js <tenantId> [--force]');
    process.exit(1);
  }
  await connectMongo();
  const col = mongoose.connection.collection('assessmentitems');

  const existing = await col.countDocuments({ tenantId });
  if (existing > 0 && !FORCE) {
    console.log(`Tenant already has ${existing} assessment items. Use --force to add the starter set anyway.`);
    await mongoose.disconnect();
    process.exit(0);
  }

  const now = new Date();
  const docs = ITEMS.map((it) => ({ ...it, tenantId, createdBy: 'seed', createdAt: now, updatedAt: now }));
  const r = await col.insertMany(docs);
  console.log(`✅ Inserted ${r.insertedCount} starter assessment items for tenant ${tenantId}.`);
  await mongoose.disconnect();
  process.exit(0);
})().catch((e) => { console.error('❌ Seed failed:', e.message); process.exit(1); });
