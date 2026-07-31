/**
 * First 20 Thinking Lab concepts — days 1-20 of the 145-day plan.
 *
 * Written to set the quality bar before the remaining 125 are authored. The shape each
 * one follows, and why:
 *
 *  - The statement names the REASONING, not just the output. "Decide which of two things
 *    is larger without sorting" teaches something; "print the bigger number" does not.
 *  - Hints escalate: nudge, then method, then structure. Never the answer — a hint that
 *    gives the answer converts a thinking exercise into typing.
 *  - Hidden test cases carry the edge case (equal values, empty input, negatives), so a
 *    student who only handles the happy path finds out here rather than in an interview.
 *  - Difficulty climbs deliberately across the 20: arithmetic and conditionals first,
 *    then loops, then strings and arrays, then a first taste of recursion.
 *
 * Run:  npx ts-node src/scripts/seedThinkingConcepts.ts <tenantId>
 * Idempotent — matches on (tenantId, title) and updates rather than duplicating.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ThinkingProblem from '../models/ThinkingProblem';

dotenv.config();

interface Seed {
  title: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  statement: string;
  examples: { input: string; expectedOutput: string; explanation?: string }[];
  testCases: { input: string; expectedOutput: string; hidden: boolean }[];
  hints: string[];
  constraints?: string;
  expectedTimeComplexity?: string;
}

const CONCEPTS: Seed[] = [
  {
    title: 'Larger of Two Numbers',
    category: 'Arithmetic', difficulty: 'easy',
    statement: 'Read two integers and print the larger one. If they are equal, print either.\n\nThe point is not the answer but the decision: you are comparing, not sorting.',
    examples: [
      { input: '4 9', expectedOutput: '9' },
      { input: '-3 -8', expectedOutput: '-3', explanation: 'Closer to zero is larger for negatives.' },
    ],
    testCases: [
      { input: '4 9', expectedOutput: '9', hidden: false },
      { input: '-3 -8', expectedOutput: '-3', hidden: false },
      { input: '7 7', expectedOutput: '7', hidden: true },
      { input: '0 -1', expectedOutput: '0', hidden: true },
    ],
    hints: [
      'What single comparison separates the two cases?',
      'An if/else with one condition is enough — you do not need a loop.',
      'Read both, compare with >, print the winner. Equal values can take either branch.',
    ],
    constraints: '-10^9 <= a, b <= 10^9',
    expectedTimeComplexity: 'O(1)',
  },
  {
    title: 'Odd or Even',
    category: 'Arithmetic', difficulty: 'easy',
    statement: 'Read an integer and print "Even" or "Odd".\n\nThink about what actually makes a number even — it is a property of division, not of the last digit you see.',
    examples: [{ input: '10', expectedOutput: 'Even' }, { input: '7', expectedOutput: 'Odd' }],
    testCases: [
      { input: '10', expectedOutput: 'Even', hidden: false },
      { input: '7', expectedOutput: 'Odd', hidden: false },
      { input: '0', expectedOutput: 'Even', hidden: true },
      { input: '-3', expectedOutput: 'Odd', hidden: true },
    ],
    hints: [
      'What does dividing by 2 leave behind?',
      'The modulo operator gives you the remainder.',
      'n % 2 == 0 means even. Watch negatives — some languages return -1 for -3 % 2.',
    ],
    expectedTimeComplexity: 'O(1)',
  },
  {
    title: 'Sum of First N Numbers',
    category: 'Arithmetic', difficulty: 'easy',
    statement: 'Read N and print the sum 1 + 2 + ... + N.\n\nSolve it with a loop first. Then ask whether the loop was necessary at all.',
    examples: [{ input: '5', expectedOutput: '15' }, { input: '1', expectedOutput: '1' }],
    testCases: [
      { input: '5', expectedOutput: '15', hidden: false },
      { input: '1', expectedOutput: '1', hidden: false },
      { input: '0', expectedOutput: '0', hidden: true },
      { input: '100', expectedOutput: '5050', hidden: true },
    ],
    hints: [
      'Accumulate into a running total as you count up.',
      'Now pair the first and last terms: 1+N, 2+(N-1)... what do you notice?',
      'N*(N+1)/2 gives the same answer with no loop at all.',
    ],
    expectedTimeComplexity: 'O(1) is achievable',
  },
  {
    title: 'Count Digits',
    category: 'Arithmetic', difficulty: 'easy',
    statement: 'Read an integer and print how many digits it has. Ignore the minus sign.',
    examples: [{ input: '4021', expectedOutput: '4' }, { input: '-95', expectedOutput: '2' }],
    testCases: [
      { input: '4021', expectedOutput: '4', hidden: false },
      { input: '-95', expectedOutput: '2', hidden: false },
      { input: '0', expectedOutput: '1', hidden: true },
      { input: '1000000', expectedOutput: '7', hidden: true },
    ],
    hints: [
      'Dividing by 10 removes one digit. How many times can you do that?',
      'Loop while the number is not zero, dividing by 10 and counting.',
      'Zero is the trap: the loop never runs, so handle it before you start.',
    ],
    expectedTimeComplexity: 'O(log n)',
  },
  {
    title: 'Reverse a Number',
    category: 'Arithmetic', difficulty: 'easy',
    statement: 'Read an integer and print its digits reversed. 1234 becomes 4321.\n\nDo it arithmetically, without converting to a string.',
    examples: [{ input: '1234', expectedOutput: '4321' }, { input: '100', expectedOutput: '1' }],
    testCases: [
      { input: '1234', expectedOutput: '4321', hidden: false },
      { input: '100', expectedOutput: '1', hidden: false },
      { input: '7', expectedOutput: '7', hidden: true },
      { input: '1002', expectedOutput: '2001', hidden: true },
    ],
    hints: [
      'n % 10 gives you the last digit. n / 10 removes it.',
      'Build the answer as you go: result = result * 10 + digit.',
      'Trailing zeros vanish — 100 reverses to 1, and that is correct.',
    ],
    expectedTimeComplexity: 'O(log n)',
  },
  {
    title: 'Palindrome Number',
    category: 'Logic', difficulty: 'easy',
    statement: 'Read an integer and print "Yes" if it reads the same forwards and backwards, otherwise "No".\n\nYou already know how to reverse a number. What does that let you avoid doing?',
    examples: [{ input: '121', expectedOutput: 'Yes' }, { input: '123', expectedOutput: 'No' }],
    testCases: [
      { input: '121', expectedOutput: 'Yes', hidden: false },
      { input: '123', expectedOutput: 'No', hidden: false },
      { input: '7', expectedOutput: 'Yes', hidden: true },
      { input: '1001', expectedOutput: 'Yes', hidden: true },
    ],
    hints: [
      'If you reverse it, what would be true of a palindrome?',
      'Reverse the number, then compare with the original.',
      'Keep a copy of the original before you destroy it in the reversing loop.',
    ],
    expectedTimeComplexity: 'O(log n)',
  },
  {
    title: 'Factorial',
    category: 'Arithmetic', difficulty: 'easy',
    statement: 'Read N and print N! (the product 1 x 2 x ... x N). 0! is 1.',
    examples: [{ input: '5', expectedOutput: '120' }, { input: '0', expectedOutput: '1' }],
    testCases: [
      { input: '5', expectedOutput: '120', hidden: false },
      { input: '0', expectedOutput: '1', hidden: false },
      { input: '1', expectedOutput: '1', hidden: true },
      { input: '12', expectedOutput: '479001600', hidden: true },
    ],
    hints: [
      'Start your accumulator at 1, not 0 — think about why.',
      'Multiply by each value from 2 up to N.',
      'Factorials grow fast: 13! already overflows a 32-bit int.',
    ],
    expectedTimeComplexity: 'O(n)',
  },
  {
    title: 'Prime or Not',
    category: 'Logic', difficulty: 'medium',
    statement: 'Read N and print "Prime" or "Not Prime".\n\nThe naive answer tests every number below N. Most of those tests are wasted — work out which.',
    examples: [{ input: '29', expectedOutput: 'Prime' }, { input: '30', expectedOutput: 'Not Prime' }],
    testCases: [
      { input: '29', expectedOutput: 'Prime', hidden: false },
      { input: '30', expectedOutput: 'Not Prime', hidden: false },
      { input: '1', expectedOutput: 'Not Prime', hidden: true },
      { input: '2', expectedOutput: 'Prime', hidden: true },
    ],
    hints: [
      'If a divides N, so does N/a. One of that pair is always small.',
      'That means you never need to look past the square root of N.',
      '1 is not prime and 2 is — both are special cases worth handling first.',
    ],
    expectedTimeComplexity: 'O(sqrt n)',
  },
  {
    title: 'Fibonacci Sequence',
    category: 'Patterns', difficulty: 'easy',
    statement: 'Read N and print the first N Fibonacci numbers, space-separated, starting 0 1.',
    examples: [{ input: '7', expectedOutput: '0 1 1 2 3 5 8' }, { input: '1', expectedOutput: '0' }],
    testCases: [
      { input: '7', expectedOutput: '0 1 1 2 3 5 8', hidden: false },
      { input: '1', expectedOutput: '0', hidden: false },
      { input: '2', expectedOutput: '0 1', hidden: true },
      { input: '10', expectedOutput: '0 1 1 2 3 5 8 13 21 34', hidden: true },
    ],
    hints: [
      'Each term needs only the two before it.',
      'Two variables are enough — you never need the whole list in memory.',
      'N of 1 and 2 stop before the loop begins. Handle them first.',
    ],
    expectedTimeComplexity: 'O(n)',
  },
  {
    title: 'FizzBuzz',
    category: 'Logic', difficulty: 'easy',
    statement: 'Print 1 to N, one per line. Multiples of 3 become "Fizz", of 5 "Buzz", of both "FizzBuzz".\n\nThe ordering of your conditions decides whether this works.',
    examples: [{ input: '5', expectedOutput: '1\n2\nFizz\n4\nBuzz' }],
    testCases: [
      { input: '5', expectedOutput: '1\n2\nFizz\n4\nBuzz', hidden: false },
      { input: '15', expectedOutput: '1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz', hidden: true },
      { input: '1', expectedOutput: '1', hidden: true },
    ],
    hints: [
      'What is true of 15 that is also true of 3 and of 5?',
      'If you test 3 first, 15 never reaches the FizzBuzz branch.',
      'Check the most specific condition first, or test divisibility by 15 directly.',
    ],
    expectedTimeComplexity: 'O(n)',
  },
  {
    title: 'Largest in an Array',
    category: 'Arrays', difficulty: 'easy',
    statement: 'First line is N, second is N space-separated integers. Print the largest.\n\nSorting would work. It is also far more than the problem needs.',
    examples: [{ input: '5\n3 9 2 7 4', expectedOutput: '9' }],
    testCases: [
      { input: '5\n3 9 2 7 4', expectedOutput: '9', hidden: false },
      { input: '1\n42', expectedOutput: '42', hidden: false },
      { input: '4\n-9 -2 -7 -4', expectedOutput: '-2', hidden: true },
      { input: '3\n5 5 5', expectedOutput: '5', hidden: true },
    ],
    hints: [
      'You can decide the answer in a single pass.',
      'Hold a "best so far" and replace it whenever you see better.',
      'Start it at the first element, not 0 — all-negative input would break that.',
    ],
    expectedTimeComplexity: 'O(n)',
  },
  {
    title: 'Second Largest',
    category: 'Arrays', difficulty: 'medium',
    statement: 'Print the second largest distinct value in the array. If there is no such value, print "None".',
    examples: [{ input: '5\n3 9 2 9 4', expectedOutput: '4', explanation: '9 is largest; the next distinct value is 4.' }],
    testCases: [
      { input: '5\n3 9 2 9 4', expectedOutput: '4', hidden: false },
      { input: '2\n7 7', expectedOutput: 'None', hidden: false },
      { input: '1\n5', expectedOutput: 'None', hidden: true },
      { input: '3\n-1 -5 -3', expectedOutput: '-3', hidden: true },
    ],
    hints: [
      'Can you still do this in one pass?',
      'Track two values, and update them in the right order.',
      'Duplicates of the largest must not become the second — that is what "distinct" means here.',
    ],
    expectedTimeComplexity: 'O(n)',
  },
  {
    title: 'Reverse an Array',
    category: 'Arrays', difficulty: 'easy',
    statement: 'Print the array in reverse order, space-separated. Do it in place, without a second array.',
    examples: [{ input: '5\n1 2 3 4 5', expectedOutput: '5 4 3 2 1' }],
    testCases: [
      { input: '5\n1 2 3 4 5', expectedOutput: '5 4 3 2 1', hidden: false },
      { input: '1\n9', expectedOutput: '9', hidden: false },
      { input: '4\n1 2 3 4', expectedOutput: '4 3 2 1', hidden: true },
    ],
    hints: [
      'Think about swapping pairs from the outside inwards.',
      'Two pointers, one at each end, moving towards each other.',
      'Stop when they meet. Going further swaps everything back.',
    ],
    expectedTimeComplexity: 'O(n)',
  },
  {
    title: 'Sum and Average',
    category: 'Arrays', difficulty: 'easy',
    statement: 'Print the sum, then the average rounded to two decimal places, separated by a space.',
    examples: [{ input: '4\n10 20 30 41', expectedOutput: '101 25.25' }],
    testCases: [
      { input: '4\n10 20 30 41', expectedOutput: '101 25.25', hidden: false },
      { input: '3\n1 1 1', expectedOutput: '3 1.00', hidden: true },
      { input: '2\n1 2', expectedOutput: '3 1.50', hidden: true },
    ],
    hints: [
      'The sum is straightforward; the average is where the trap is.',
      'Integer division throws away the fraction before you can round it.',
      'Divide as a floating-point value, then format to two decimals.',
    ],
    expectedTimeComplexity: 'O(n)',
  },
  {
    title: 'Count Vowels',
    category: 'Strings', difficulty: 'easy',
    statement: 'Read a line of text and print how many vowels it contains. Count both cases.',
    examples: [{ input: 'Hello World', expectedOutput: '3' }],
    testCases: [
      { input: 'Hello World', expectedOutput: '3', hidden: false },
      { input: 'AEIOU', expectedOutput: '5', hidden: false },
      { input: 'xyz', expectedOutput: '0', hidden: true },
      { input: 'Programming Is Fun', expectedOutput: '5', hidden: true },
    ],
    hints: [
      'Decide once what counts as a vowel, then apply it to every character.',
      'Normalise the case rather than writing ten comparisons.',
      'Lowercase the character, then check membership in "aeiou".',
    ],
    expectedTimeComplexity: 'O(n)',
  },
  {
    title: 'Reverse a String',
    category: 'Strings', difficulty: 'easy',
    statement: 'Read a line and print it reversed. Do not use a built-in reverse function — write the loop.',
    examples: [{ input: 'hello', expectedOutput: 'olleh' }],
    testCases: [
      { input: 'hello', expectedOutput: 'olleh', hidden: false },
      { input: 'a', expectedOutput: 'a', hidden: false },
      { input: 'ab cd', expectedOutput: 'dc ba', hidden: true },
    ],
    hints: [
      'Where does the last character need to end up?',
      'Walk from the end towards the start, appending as you go.',
      'Spaces are characters too — they move like everything else.',
    ],
    expectedTimeComplexity: 'O(n)',
  },
  {
    title: 'Palindrome String',
    category: 'Strings', difficulty: 'medium',
    statement: 'Print "Yes" if the text reads the same both ways, ignoring case and spaces. Otherwise "No".',
    examples: [
      { input: 'Never odd or even', expectedOutput: 'Yes' },
      { input: 'hello there', expectedOutput: 'No' },
    ],
    testCases: [
      { input: 'Never odd or even', expectedOutput: 'Yes', hidden: false },
      { input: 'hello there', expectedOutput: 'No', hidden: false },
      { input: 'A', expectedOutput: 'Yes', hidden: true },
      { input: 'Was it a car or a cat I saw', expectedOutput: 'Yes', hidden: true },
    ],
    hints: [
      'Two different jobs here: cleaning the input, then checking it.',
      'Do the cleaning first — lowercase, drop spaces — then compare.',
      'Two pointers from both ends, or compare against the reversed clean string.',
    ],
    expectedTimeComplexity: 'O(n)',
  },
  {
    title: 'Character Frequency',
    category: 'Strings', difficulty: 'medium',
    statement: 'Print each distinct character and how often it appears, in order of first appearance, one per line as "c:count". Ignore spaces.',
    examples: [{ input: 'hello', expectedOutput: 'h:1\ne:1\nl:2\no:1' }],
    testCases: [
      { input: 'hello', expectedOutput: 'h:1\ne:1\nl:2\no:1', hidden: false },
      { input: 'aab', expectedOutput: 'a:2\nb:1', hidden: false },
      { input: 'a b a', expectedOutput: 'a:2\nb:1', hidden: true },
    ],
    hints: [
      'Counting is easy. Preserving first-appearance order is the real requirement.',
      'A plain map may not keep insertion order in every language.',
      'Keep the counts in a map and the order in a separate list as you meet each new character.',
    ],
    expectedTimeComplexity: 'O(n)',
  },
  {
    title: 'Sum of Digits (Recursive)',
    category: 'Recursion', difficulty: 'medium',
    statement: 'Print the sum of a number\'s digits, using recursion rather than a loop.\n\nA recursive solution needs two things: a case that stops, and a case that shrinks.',
    examples: [{ input: '1234', expectedOutput: '10' }],
    testCases: [
      { input: '1234', expectedOutput: '10', hidden: false },
      { input: '7', expectedOutput: '7', hidden: false },
      { input: '0', expectedOutput: '0', hidden: true },
      { input: '999', expectedOutput: '27', hidden: true },
    ],
    hints: [
      'What is the smallest number you can answer without thinking?',
      'sum(1234) is 4 + sum(123). Write that as code.',
      'Base case: n < 10 returns n. Otherwise n%10 + sum(n/10).',
    ],
    expectedTimeComplexity: 'O(log n)',
  },
  {
    title: 'Tower of Hanoi (Count Moves)',
    category: 'Recursion', difficulty: 'hard',
    statement: 'Given N discs, print the minimum number of moves to shift the tower, moving one disc at a time and never placing a larger disc on a smaller one.\n\nDo not simulate it. Work out the relationship between N and N-1.',
    examples: [{ input: '3', expectedOutput: '7' }, { input: '1', expectedOutput: '1' }],
    testCases: [
      { input: '3', expectedOutput: '7', hidden: false },
      { input: '1', expectedOutput: '1', hidden: false },
      { input: '10', expectedOutput: '1023', hidden: true },
      { input: '20', expectedOutput: '1048575', hidden: true },
    ],
    hints: [
      'To move N discs you must first move N-1 out of the way, then move them back.',
      'That gives moves(N) = 2 * moves(N-1) + 1.',
      'Expand a few terms: 1, 3, 7, 15... the closed form is 2^N - 1.',
    ],
    expectedTimeComplexity: 'O(n), or O(1) with the formula',
  },
];

async function run() {
  const tenantId = process.argv[2];
  if (!tenantId) { console.error('Usage: seedThinkingConcepts.ts <tenantId>'); process.exit(1); }

  await mongoose.connect(process.env.MONGODB_URI as string);
  let created = 0, updated = 0;

  for (const c of CONCEPTS) {
    const doc = {
      tenantId, title: c.title, category: c.category, difficulty: c.difficulty,
      language: 'java', statement: c.statement,
      examples: c.examples, testCases: c.testCases, hints: c.hints,
      constraints: c.constraints, expectedTimeComplexity: c.expectedTimeComplexity,
      active: true,
    };
    // Matched on title so re-running edits in place instead of duplicating the bank.
    const r = await (ThinkingProblem as any).updateOne(
      { tenantId, title: c.title }, { $set: doc }, { upsert: true },
    );
    if (r.upsertedCount) created++; else updated++;
  }

  console.log(`Thinking concepts — created ${created}, updated ${updated}, total ${CONCEPTS.length}`);
  await mongoose.disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
