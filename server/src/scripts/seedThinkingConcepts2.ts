/**
 * Thinking Lab concepts, days 21-35 — batch 2 of the 145-day plan.
 *
 * Follows the template approved on batch 1 (Prime or Not / Second Largest / Sum of
 * Digits): the statement names the reasoning rather than the output, hints escalate
 * nudge -> method -> structure without ever giving the answer, and the hidden tests
 * carry the edge case a happy-path solution misses.
 *
 * This batch moves past "can you write a loop" into the three ideas that separate a
 * student who codes from one who thinks: choosing a data structure, spotting when a
 * second pass is unnecessary, and recognising a problem you have already solved in
 * different clothing.
 *
 * Run:  npx ts-node src/scripts/seedThinkingConcepts2.ts <tenantId>
 * Idempotent on (tenantId, title).
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ThinkingProblem from '../models/ThinkingProblem';

dotenv.config();

interface Seed {
  title: string; category: string; difficulty: 'easy' | 'medium' | 'hard';
  statement: string;
  examples: { input: string; expectedOutput: string; explanation?: string }[];
  testCases: { input: string; expectedOutput: string; hidden: boolean }[];
  hints: string[];
  constraints?: string; expectedTimeComplexity?: string;
}

const CONCEPTS: Seed[] = [
  {
    title: 'Find the Missing Number',
    category: 'Arrays', difficulty: 'medium',
    statement: 'An array holds N-1 distinct numbers from 1..N with exactly one missing. Print the missing one.\n\nSearching for each value in turn works. There is an answer that never searches at all.',
    examples: [{ input: '5\n1 2 4 5', expectedOutput: '3' }],
    testCases: [
      { input: '5\n1 2 4 5', expectedOutput: '3', hidden: false },
      { input: '2\n2', expectedOutput: '1', hidden: false },
      { input: '3\n1 2', expectedOutput: '3', hidden: true },
      { input: '6\n2 3 4 5 6', expectedOutput: '1', hidden: true },
    ],
    hints: [
      'You know what the numbers 1..N should add up to.',
      'Compare that expected total against what is actually present.',
      'expected = N*(N+1)/2. The difference from the real sum IS the missing value.',
    ],
    expectedTimeComplexity: 'O(n)',
  },
  {
    title: 'Find the Duplicate',
    category: 'Arrays', difficulty: 'medium',
    statement: 'An array of N+1 values from 1..N contains exactly one repeated value. Print it.\n\nSorting reveals it. So does a second array. Both cost more than the problem requires.',
    examples: [{ input: '4\n1 3 2 3 4', expectedOutput: '3' }],
    testCases: [
      { input: '4\n1 3 2 3 4', expectedOutput: '3', hidden: false },
      { input: '1\n1 1', expectedOutput: '1', hidden: false },
      { input: '3\n1 2 3 2', expectedOutput: '2', hidden: true },
    ],
    hints: [
      'This is the missing-number problem wearing a different hat.',
      'Compare the real sum against the sum of 1..N again — the sign flips.',
      'actual - expected gives the duplicate.',
    ],
    expectedTimeComplexity: 'O(n)',
  },
  {
    title: 'Two Sum',
    category: 'Arrays', difficulty: 'medium',
    statement: 'Given an array and a target, print the two 0-based indices whose values add to the target, smaller index first. Print "None" if no pair exists.\n\nThe obvious solution checks every pair. Ask what you actually need to remember as you walk the array once.',
    examples: [{ input: '4 9\n2 7 11 15', expectedOutput: '0 1' }],
    testCases: [
      { input: '4 9\n2 7 11 15', expectedOutput: '0 1', hidden: false },
      { input: '3 6\n1 2 3', expectedOutput: '1 2', hidden: false },
      { input: '3 100\n1 2 3', expectedOutput: 'None', hidden: true },
      { input: '4 8\n4 4 1 2', expectedOutput: '0 1', hidden: true },
    ],
    hints: [
      'At each element you know exactly which partner you need.',
      'Have you already seen that partner? A map answers that instantly.',
      'Store value -> index as you go, and look up target - current before storing.',
    ],
    expectedTimeComplexity: 'O(n)',
  },
  {
    title: 'Move Zeros to the End',
    category: 'Arrays', difficulty: 'medium',
    statement: 'Move every zero to the end while keeping the order of the non-zero values. Modify in place and print the result space-separated.',
    examples: [{ input: '6\n0 1 0 3 12 0', expectedOutput: '1 3 12 0 0 0' }],
    testCases: [
      { input: '6\n0 1 0 3 12 0', expectedOutput: '1 3 12 0 0 0', hidden: false },
      { input: '3\n0 0 0', expectedOutput: '0 0 0', hidden: false },
      { input: '3\n1 2 3', expectedOutput: '1 2 3', hidden: true },
    ],
    hints: [
      'Where does the next non-zero value belong?',
      'Keep a write position that only advances when you place something.',
      'One pass to compact the non-zeros, then fill the tail with zeros.',
    ],
    expectedTimeComplexity: 'O(n)',
  },
  {
    title: 'Rotate an Array',
    category: 'Arrays', difficulty: 'medium',
    statement: 'Rotate the array right by K positions and print it. K may exceed the array length.',
    examples: [{ input: '5 2\n1 2 3 4 5', expectedOutput: '4 5 1 2 3' }],
    testCases: [
      { input: '5 2\n1 2 3 4 5', expectedOutput: '4 5 1 2 3', hidden: false },
      { input: '3 0\n1 2 3', expectedOutput: '1 2 3', hidden: false },
      { input: '3 7\n1 2 3', expectedOutput: '3 1 2', hidden: true },
      { input: '4 4\n1 2 3 4', expectedOutput: '1 2 3 4', hidden: true },
    ],
    hints: [
      'Rotating by the length changes nothing. What does that tell you about large K?',
      'Reduce K first, then think about where element i ends up.',
      'K %= n. Then either build a new array by index, or reverse three times.',
    ],
    expectedTimeComplexity: 'O(n)',
  },
  {
    title: 'Anagram Check',
    category: 'Strings', difficulty: 'medium',
    statement: 'Print "Yes" if two words use exactly the same letters the same number of times, ignoring case. Otherwise "No".',
    examples: [{ input: 'Listen\nSilent', expectedOutput: 'Yes' }],
    testCases: [
      { input: 'Listen\nSilent', expectedOutput: 'Yes', hidden: false },
      { input: 'hello\nworld', expectedOutput: 'No', hidden: false },
      { input: 'aab\nabb', expectedOutput: 'No', hidden: true },
      { input: 'a\na', expectedOutput: 'Yes', hidden: true },
    ],
    hints: [
      'Two words are anagrams when their letter counts match exactly.',
      'You can either sort both, or count both. One is cheaper.',
      'Different lengths can never be anagrams — check that first and exit early.',
    ],
    expectedTimeComplexity: 'O(n)',
  },
  {
    title: 'First Non-Repeating Character',
    category: 'Strings', difficulty: 'medium',
    statement: 'Print the first character that appears exactly once. Print "None" if every character repeats.\n\nNote the word "first" — it constrains more than the counting does.',
    examples: [{ input: 'swiss', expectedOutput: 'w' }],
    testCases: [
      { input: 'swiss', expectedOutput: 'w', hidden: false },
      { input: 'aabb', expectedOutput: 'None', hidden: false },
      { input: 'abcabc d', expectedOutput: ' ', hidden: true },
      { input: 'z', expectedOutput: 'z', hidden: true },
    ],
    hints: [
      'You cannot know a character is unique until you have seen the whole string.',
      'So count everything first, then decide.',
      'Second pass in original order, returning the first with a count of one.',
    ],
    expectedTimeComplexity: 'O(n)',
  },
  {
    title: 'Longest Word',
    category: 'Strings', difficulty: 'easy',
    statement: 'Print the longest word in a sentence. On a tie, print the one that appears first.',
    examples: [{ input: 'the quick brown fox jumped', expectedOutput: 'jumped' }],
    testCases: [
      { input: 'the quick brown fox jumped', expectedOutput: 'jumped', hidden: false },
      { input: 'a bb cc', expectedOutput: 'bb', hidden: false },
      { input: 'single', expectedOutput: 'single', hidden: true },
    ],
    hints: [
      'Split on spaces, then it becomes a largest-value problem you have solved before.',
      'Track the best word seen so far.',
      'Use strictly greater than, or a later tie would wrongly replace the first.',
    ],
    expectedTimeComplexity: 'O(n)',
  },
  {
    title: 'Count Words',
    category: 'Strings', difficulty: 'easy',
    statement: 'Print how many words a line contains. Words are separated by one or more spaces, and the line may have leading or trailing spaces.',
    examples: [{ input: '  hello   world  ', expectedOutput: '2' }],
    testCases: [
      { input: '  hello   world  ', expectedOutput: '2', hidden: false },
      { input: 'one', expectedOutput: '1', hidden: false },
      { input: '   ', expectedOutput: '0', hidden: true },
    ],
    hints: [
      'Counting spaces is not the same as counting words.',
      'A word starts where a non-space follows a space or the start of the line.',
      'Trim first, then split on runs of whitespace. An empty line has zero words, not one.',
    ],
    expectedTimeComplexity: 'O(n)',
  },
  {
    title: 'GCD of Two Numbers',
    category: 'Arithmetic', difficulty: 'medium',
    statement: 'Print the greatest common divisor of two positive integers.\n\nTesting every candidate downwards works. There is a far older method that does not.',
    examples: [{ input: '48 18', expectedOutput: '6' }],
    testCases: [
      { input: '48 18', expectedOutput: '6', hidden: false },
      { input: '7 13', expectedOutput: '1', hidden: false },
      { input: '10 10', expectedOutput: '10', hidden: true },
      { input: '100 75', expectedOutput: '25', hidden: true },
    ],
    hints: [
      'Any common divisor of a and b also divides their remainder.',
      'That lets you replace the bigger number with a % b and repeat.',
      'Stop when b becomes 0; a is then the GCD.',
    ],
    expectedTimeComplexity: 'O(log n)',
  },
  {
    title: 'Armstrong Number',
    category: 'Arithmetic', difficulty: 'medium',
    statement: 'A number is Armstrong when the sum of its digits each raised to the count of digits equals the number itself. 153 = 1^3 + 5^3 + 3^3. Print "Yes" or "No".',
    examples: [{ input: '153', expectedOutput: 'Yes' }, { input: '154', expectedOutput: 'No' }],
    testCases: [
      { input: '153', expectedOutput: 'Yes', hidden: false },
      { input: '154', expectedOutput: 'No', hidden: false },
      { input: '9', expectedOutput: 'Yes', hidden: true },
      { input: '9474', expectedOutput: 'Yes', hidden: true },
    ],
    hints: [
      'You need the digit count before you can raise anything to a power.',
      'That means two passes, or counting the digits first.',
      'Every single-digit number is Armstrong — a useful check that your loop is right.',
    ],
    expectedTimeComplexity: 'O(log n)',
  },
  {
    title: 'Perfect Number',
    category: 'Arithmetic', difficulty: 'medium',
    statement: 'A perfect number equals the sum of its proper divisors: 6 = 1+2+3. Print "Yes" or "No".',
    examples: [{ input: '28', expectedOutput: 'Yes' }, { input: '12', expectedOutput: 'No' }],
    testCases: [
      { input: '28', expectedOutput: 'Yes', hidden: false },
      { input: '12', expectedOutput: 'No', hidden: false },
      { input: '1', expectedOutput: 'No', hidden: true },
      { input: '496', expectedOutput: 'Yes', hidden: true },
    ],
    hints: [
      'Divisors come in pairs, exactly as they did for the prime check.',
      'So you only need to walk to the square root.',
      'Add both parts of each pair, exclude n itself, and mind a perfect square counting twice.',
    ],
    expectedTimeComplexity: 'O(sqrt n)',
  },
  {
    title: 'Binary Search',
    category: 'Arrays', difficulty: 'medium',
    statement: 'Given a sorted array and a target, print its 0-based index or -1.\n\nA linear scan passes the tests. It also throws away the one fact you were given: the array is sorted.',
    examples: [{ input: '5 7\n1 3 5 7 9', expectedOutput: '3' }],
    testCases: [
      { input: '5 7\n1 3 5 7 9', expectedOutput: '3', hidden: false },
      { input: '5 4\n1 3 5 7 9', expectedOutput: '-1', hidden: false },
      { input: '1 1\n1', expectedOutput: '0', hidden: true },
      { input: '4 9\n1 3 5 9', expectedOutput: '3', hidden: true },
    ],
    hints: [
      'Looking at the middle tells you which half to discard.',
      'Repeat on the surviving half until it is empty.',
      'Use low + (high-low)/2 rather than (low+high)/2 — the latter can overflow.',
    ],
    expectedTimeComplexity: 'O(log n)',
  },
  {
    title: 'Bubble Sort',
    category: 'Arrays', difficulty: 'medium',
    statement: 'Sort the array ascending using bubble sort and print it. Write the algorithm; do not call a library sort.\n\nAlso: stop early when a pass makes no swaps, and be able to say why that is correct.',
    examples: [{ input: '5\n5 1 4 2 8', expectedOutput: '1 2 4 5 8' }],
    testCases: [
      { input: '5\n5 1 4 2 8', expectedOutput: '1 2 4 5 8', hidden: false },
      { input: '3\n1 2 3', expectedOutput: '1 2 3', hidden: false },
      { input: '4\n4 3 2 1', expectedOutput: '1 2 3 4', hidden: true },
    ],
    hints: [
      'Each pass pushes the largest remaining value to the end.',
      'After k passes the last k positions are final — do not revisit them.',
      'A pass with no swaps means nothing is out of order, so you can stop.',
    ],
    expectedTimeComplexity: 'O(n^2), O(n) when already sorted',
  },
  {
    title: 'Merge Two Sorted Arrays',
    category: 'Arrays', difficulty: 'medium',
    statement: 'Merge two sorted arrays into one sorted array and print it. Do not concatenate and sort.',
    examples: [{ input: '3\n1 3 5\n3\n2 4 6', expectedOutput: '1 2 3 4 5 6' }],
    testCases: [
      { input: '3\n1 3 5\n3\n2 4 6', expectedOutput: '1 2 3 4 5 6', hidden: false },
      { input: '2\n1 2\n0\n', expectedOutput: '1 2', hidden: false },
      { input: '2\n5 6\n2\n1 2', expectedOutput: '1 2 5 6', hidden: true },
    ],
    hints: [
      'The smallest remaining value is always at the front of one of the two.',
      'Two pointers, take the smaller, advance that one.',
      'When one runs out, the rest of the other is already sorted — append it.',
    ],
    expectedTimeComplexity: 'O(n + m)',
  },
];

async function run() {
  const tenantId = process.argv[2];
  if (!tenantId) { console.error('Usage: seedThinkingConcepts2.ts <tenantId>'); process.exit(1); }

  await mongoose.connect(process.env.MONGODB_URI as string);
  let created = 0, updated = 0;

  for (const c of CONCEPTS) {
    const r = await (ThinkingProblem as any).updateOne(
      { tenantId, title: c.title },
      {
        $set: {
          tenantId, title: c.title, category: c.category, difficulty: c.difficulty,
          language: 'java', statement: c.statement, examples: c.examples,
          testCases: c.testCases, hints: c.hints, constraints: c.constraints,
          expectedTimeComplexity: c.expectedTimeComplexity, active: true,
        },
      },
      { upsert: true },
    );
    if (r.upsertedCount) created++; else updated++;
  }

  console.log(`Batch 2 — created ${created}, updated ${updated}, total ${CONCEPTS.length}`);
  await mongoose.disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
