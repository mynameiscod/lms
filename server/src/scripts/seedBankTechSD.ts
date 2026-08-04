/**
 * Bank depth — batch 3: TECHNICAL questions for Software Development, all four stages.
 *
 * Technical is the one category that must be goal-tagged: a question about SQL grouping
 * tells you nothing about a student heading for backend development, and a question about
 * time complexity tells you nothing about an analyst. So unlike batches 1 and 2, each of
 * these lands in exactly one segment's pool — which is why three separate batches are
 * needed to give all three interests the same depth.
 *
 * Knowledge checks (correctIndex >= 0) are pitched at the stage: a foundation item is
 * answerable by someone who has been taught the concept once, because its job is to
 * locate a beginner rather than fail them. Placement items are the ones that actually
 * separate candidates in a first round.
 *
 * Run: npx ts-node src/scripts/seedBankTechSD.ts <tenantId>
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PassportAssessment from '../models/PassportAssessment';

dotenv.config();

interface Q {
  category: string; text: string; options: string[];
  correctIndex: number; weight: number; selfReport?: boolean; stages: string[]; goals: string[];
}

const SD = ['Software Development'];
const F = ['foundation'], B = ['build'], SEEK = ['placement', 'job_seeker'];

export const QUESTIONS: Q[] = [

  /* ══ FOUNDATION ═══════════════════════════════════════════════════════════ */
  { category: 'technical', stages: F, goals: SD, correctIndex: 1, weight: 1,
    text: 'What does this print?  x = 5; x = x + 3; print(x)',
    options: ['5', '8', '3', 'Error'] },
  { category: 'technical', stages: F, goals: SD, correctIndex: 2, weight: 1,
    text: 'Which of these repeats a block of code a fixed number of times?',
    options: ['if', 'return', 'for', 'print'] },
  { category: 'technical', stages: F, goals: SD, correctIndex: 1, weight: 1,
    text: 'A function that does not return anything gives back what, in most languages?',
    options: ['Zero', 'Nothing / null', 'An error', 'The last variable'] },
  { category: 'technical', stages: F, goals: SD, correctIndex: 2, weight: 1,
    text: 'What is the index of the FIRST element of an array in most languages?',
    options: ['-1', '1', '0', 'Depends on length'] },
  { category: 'technical', stages: F, goals: SD, correctIndex: 1, weight: 1.1,
    text: 'Your program crashes with "index out of range". What is the most likely cause?',
    options: ['The file is too big', 'A loop went past the last element', 'The variable name is wrong', 'Missing semicolon'] },
  { category: 'technical', stages: F, goals: SD, correctIndex: 2, weight: 1,
    text: 'Which comparison checks that two values are EQUAL in most languages?',
    options: ['=', '<>', '==', '=>'] },
  { category: 'technical', stages: F, goals: SD, selfReport: true, correctIndex: -1, weight: 1.1,
    text: 'How long can you work on a coding problem before giving up?',
    options: ['A few minutes', 'About 15 minutes', 'An hour', 'Until I solve it or understand why I cannot'] },
  { category: 'technical', stages: F, goals: SD, selfReport: true, correctIndex: -1, weight: 1,
    text: 'Have you ever used a debugger or print statements to find a bug?',
    options: ['Neither', 'Print statements sometimes', 'Print statements routinely', 'A real debugger'] },
  { category: 'technical', stages: F, goals: SD, selfReport: true, correctIndex: -1, weight: 1,
    text: 'How comfortable are you reading code someone else wrote?',
    options: ['Cannot follow it', 'Follow with effort', 'Follow most of it', 'Follow and could modify it'] },
  { category: 'technical', stages: F, goals: SD, correctIndex: 1, weight: 1,
    text: 'What is a variable?',
    options: ['A fixed number', 'A named place to store a value', 'A type of loop', 'A function'] },

  /* ══ BUILD ════════════════════════════════════════════════════════════════ */
  { category: 'technical', stages: B, goals: SD, correctIndex: 2, weight: 1.2,
    text: 'You must keep items in insertion order AND look them up by name quickly. Best structure?',
    options: ['A plain array', 'A sorted array', 'A hash map (dictionary)', 'A stack'] },
  { category: 'technical', stages: B, goals: SD, correctIndex: 1, weight: 1.2,
    text: 'What does a git merge conflict mean?',
    options: ['The repository is corrupted', 'Two branches changed the same lines', 'You forgot to commit', 'The remote is ahead'] },
  { category: 'technical', stages: B, goals: SD, correctIndex: 2, weight: 1.2,
    text: 'An API returns 401. What is wrong?',
    options: ['The server crashed', 'The URL does not exist', 'The request is not authenticated', 'Too many requests'] },
  { category: 'technical', stages: B, goals: SD, correctIndex: 1, weight: 1.2,
    text: 'Why put a database index on a column?',
    options: ['To save disk space', 'To speed up lookups on that column', 'To prevent duplicates', 'To encrypt it'] },
  { category: 'technical', stages: B, goals: SD, correctIndex: 2, weight: 1.1,
    text: 'What is the point of a function returning early on invalid input?',
    options: ['It runs faster', 'It uses less memory', 'It avoids nesting and handles the bad case first', 'It is required by the compiler'] },
  { category: 'technical', stages: B, goals: SD, correctIndex: 1, weight: 1.2,
    text: 'Your code works on your machine but fails for a teammate. Most likely cause?',
    options: ['Their computer is slow', 'A dependency or config that only exists locally', 'They typed it wrong', 'A compiler bug'] },
  { category: 'technical', stages: B, goals: SD, selfReport: true, correctIndex: -1, weight: 1.2,
    text: 'How do you know your code works?',
    options: ['It runs', 'I try a few inputs', 'I try edge cases too', 'I write tests'] },
  { category: 'technical', stages: B, goals: SD, selfReport: true, correctIndex: -1, weight: 1.1,
    text: 'Have you deployed anything so that someone else could use it over the internet?',
    options: ['Never', 'Tried and failed', 'Once', 'Several times'] },
  { category: 'technical', stages: B, goals: SD, correctIndex: 2, weight: 1.1,
    text: 'What does REST mostly describe?',
    options: ['A programming language', 'A database engine', 'A convention for HTTP APIs', 'A testing framework'] },
  { category: 'technical', stages: B, goals: SD, selfReport: true, correctIndex: -1, weight: 1.1,
    text: 'When you add a feature, what happens to your old code?',
    options: ['I rewrite from scratch', 'I copy and modify', 'I extend it', 'I refactor it as I go'] },

  /* ══ PLACEMENT + JOB SEEKER ═══════════════════════════════════════════════ */
  { category: 'technical', stages: SEEK, goals: SD, correctIndex: 1, weight: 1.4,
    text: 'What is the time complexity of binary search on a sorted array of n elements?',
    options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'] },
  { category: 'technical', stages: SEEK, goals: SD, correctIndex: 2, weight: 1.4,
    text: 'You need the k largest items from a very large stream. Best approach?',
    options: ['Sort everything', 'Nested loops', 'A min-heap of size k', 'A hash map'] },
  { category: 'technical', stages: SEEK, goals: SD, correctIndex: 1, weight: 1.3,
    text: 'What problem does an index NOT solve?',
    options: ['Slow lookups by that column', 'Slow writes caused by too many indexes', 'Slow sorting on that column', 'Slow range queries on that column'] },
  { category: 'technical', stages: SEEK, goals: SD, correctIndex: 2, weight: 1.4,
    text: 'Two users update the same record at once and one change is lost. What is this called?',
    options: ['Deadlock', 'Cache miss', 'A race condition', 'Memory leak'] },
  { category: 'technical', stages: SEEK, goals: SD, correctIndex: 1, weight: 1.3,
    text: 'Why is storing a password hashed rather than encrypted preferred?',
    options: ['Hashing is faster', 'Hashing is one-way, so a breach does not reveal passwords', 'Hashes are smaller', 'Encryption is deprecated'] },
  { category: 'technical', stages: SEEK, goals: SD, correctIndex: 2, weight: 1.3,
    text: 'A list endpoint gets slow as data grows. First thing to add?',
    options: ['More RAM', 'A rewrite in another language', 'Pagination', 'More endpoints'] },
  { category: 'technical', stages: SEEK, goals: SD, correctIndex: 1, weight: 1.3,
    text: 'What does a stack overflow in a recursive function usually mean?',
    options: ['Too much data', 'The base case is never reached', 'The function is too long', 'Wrong return type'] },
  { category: 'technical', stages: SEEK, goals: SD, selfReport: true, correctIndex: -1, weight: 1.4,
    text: 'Given a problem you have not seen, what do you do first?',
    options: ['Start coding', 'Search for a similar solution', 'Work an example by hand', 'Work examples, then state the approach before coding'] },
  { category: 'technical', stages: SEEK, goals: SD, selfReport: true, correctIndex: -1, weight: 1.3,
    text: 'How many coding problems have you solved end to end in the last month?',
    options: ['None', '1–10', '11–30', 'More than 30'] },
  { category: 'technical', stages: SEEK, goals: SD, correctIndex: 2, weight: 1.3,
    text: 'What is the main reason to use a transaction across two database writes?',
    options: ['Speed', 'Smaller storage', 'Either both succeed or neither does', 'To bypass indexes'] },
];

async function run() {
  const tenantId = process.argv[2];
  if (!tenantId) { console.error('Usage: seedBankTechSD.ts <tenantId>'); process.exit(1); }
  await mongoose.connect(process.env.MONGODB_URI as string);
  const a: any = await PassportAssessment.findOne({ tenantId });
  if (!a) { console.error('No assessment for that tenant.'); process.exit(1); }
  let added = 0, updated = 0;
  for (const q of QUESTIONS) {
    const existing = a.questions.find((x: any) => x.text === q.text);
    if (existing) { Object.assign(existing, q); updated++; } else { a.questions.push(q as any); added++; }
  }
  a.markModified('questions'); await a.save();
  console.log(`Batch 3 (SD technical) — added ${added}, updated ${updated}. Bank now ${a.questions.length}.`);
  await mongoose.disconnect();
}

if (require.main === module) run().catch(e => { console.error(e); process.exit(1); });
