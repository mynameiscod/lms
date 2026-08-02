/**
 * Thinking Lab concepts, days 36-50 — batch 3.
 *
 * Follows the approved template: the statement names the reasoning, hints escalate
 * nudge -> method -> structure without giving the answer, and hidden tests carry the
 * edge case a happy-path solution misses.
 *
 * Where batch 2 taught "refuse the wasteful pass", this batch is about STATE: choosing
 * what to remember while walking data once. Almost every problem here is solvable with
 * nested loops, and almost every one has a single-pass answer that depends on holding
 * the right small fact.
 *
 * Run: npx ts-node src/scripts/seedThinkingConcepts3.ts <tenantId>
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
  expectedTimeComplexity?: string;
}

const CONCEPTS: Seed[] = [
  {
    title: 'Maximum Subarray Sum',
    category: 'Arrays', difficulty: 'medium',
    statement: 'Print the largest sum obtainable from any contiguous block of the array.\n\nEvery block can be tried. Instead, walk once and ask at each element: is the run so far helping me, or holding me back?',
    examples: [{ input: '9\n-2 1 -3 4 -1 2 1 -5 4', expectedOutput: '6', explanation: '4 + -1 + 2 + 1' }],
    testCases: [
      { input: '9\n-2 1 -3 4 -1 2 1 -5 4', expectedOutput: '6', hidden: false },
      { input: '3\n1 2 3', expectedOutput: '6', hidden: false },
      { input: '3\n-5 -2 -9', expectedOutput: '-2', hidden: true },
      { input: '1\n-7', expectedOutput: '-7', hidden: true },
    ],
    hints: [
      'If the running sum has gone negative, is it worth carrying forward?',
      'At each element choose: extend the run, or start fresh from here.',
      'All-negative input is the trap — starting your best at 0 would wrongly answer 0.',
    ],
    expectedTimeComplexity: 'O(n)',
  },
  {
    title: 'Best Time to Buy and Sell',
    category: 'Arrays', difficulty: 'medium',
    statement: 'Prices for consecutive days. Print the largest profit from one buy followed by one later sell, or 0 if none is possible.',
    examples: [{ input: '6\n7 1 5 3 6 4', expectedOutput: '5', explanation: 'buy at 1, sell at 6' }],
    testCases: [
      { input: '6\n7 1 5 3 6 4', expectedOutput: '5', hidden: false },
      { input: '5\n7 6 4 3 1', expectedOutput: '0', hidden: false },
      { input: '1\n5', expectedOutput: '0', hidden: true },
      { input: '2\n1 100', expectedOutput: '99', hidden: true },
    ],
    hints: [
      'To sell today profitably you only need one fact about the past.',
      'Track the cheapest price seen so far as you walk forward.',
      'A falling market must answer 0, not a negative — you are allowed not to trade.',
    ],
    expectedTimeComplexity: 'O(n)',
  },
  {
    title: 'Majority Element',
    category: 'Arrays', difficulty: 'medium',
    statement: 'One value appears more than n/2 times. Print it.\n\nCounting every value works. There is an answer that keeps one candidate and one counter.',
    examples: [{ input: '7\n2 2 1 1 1 2 2', expectedOutput: '2' }],
    testCases: [
      { input: '7\n2 2 1 1 1 2 2', expectedOutput: '2', hidden: false },
      { input: '1\n9', expectedOutput: '9', hidden: false },
      { input: '5\n3 3 4 3 4', expectedOutput: '3', hidden: true },
    ],
    hints: [
      'Pair off each occurrence of the majority with a different value. What survives?',
      'Hold a candidate and a count; matching increments, differing decrements.',
      'When the count hits zero, adopt the current element as the new candidate.',
    ],
    expectedTimeComplexity: 'O(n)',
  },
  {
    title: 'Longest Run of Equal Values',
    category: 'Arrays', difficulty: 'easy',
    statement: 'Print the length of the longest stretch of identical consecutive values.',
    examples: [{ input: '8\n1 1 2 2 2 3 3 1', expectedOutput: '3' }],
    testCases: [
      { input: '8\n1 1 2 2 2 3 3 1', expectedOutput: '3', hidden: false },
      { input: '4\n5 5 5 5', expectedOutput: '4', hidden: false },
      { input: '3\n1 2 3', expectedOutput: '1', hidden: true },
    ],
    hints: [
      'Compare each element only with the one before it.',
      'Keep a current run length and a best-so-far.',
      'The best must be updated inside the loop, not only when the run breaks — the longest run may reach the end.',
    ],
    expectedTimeComplexity: 'O(n)',
  },
  {
    title: 'Balanced Brackets',
    category: 'Strings', difficulty: 'medium',
    statement: 'Given a string of ( ) [ ] { }, print "Yes" if every bracket closes correctly in order, otherwise "No".',
    examples: [{ input: '{[()]}', expectedOutput: 'Yes' }, { input: '{[(])}', expectedOutput: 'No' }],
    testCases: [
      { input: '{[()]}', expectedOutput: 'Yes', hidden: false },
      { input: '{[(])}', expectedOutput: 'No', hidden: false },
      { input: '(((', expectedOutput: 'No', hidden: true },
      { input: ')(', expectedOutput: 'No', hidden: true },
    ],
    hints: [
      'Which bracket must close first — the earliest opened, or the most recent?',
      'Most recent. That is exactly what a stack gives you.',
      'Two failures to catch: a closer with nothing open, and openers left over at the end.',
    ],
    expectedTimeComplexity: 'O(n)',
  },
  {
    title: 'Remove Duplicates, Keep Order',
    category: 'Arrays', difficulty: 'easy',
    statement: 'Print the array with later duplicates removed, preserving first-appearance order.',
    examples: [{ input: '7\n3 1 3 4 1 5 4', expectedOutput: '3 1 4 5' }],
    testCases: [
      { input: '7\n3 1 3 4 1 5 4', expectedOutput: '3 1 4 5', hidden: false },
      { input: '3\n1 1 1', expectedOutput: '1', hidden: false },
      { input: '4\n1 2 3 4', expectedOutput: '1 2 3 4', hidden: true },
    ],
    hints: [
      'Sorting would remove duplicates and destroy the thing you were asked to keep.',
      'Remember what you have already emitted.',
      'A set for membership, the output list for order — two structures, one pass.',
    ],
    expectedTimeComplexity: 'O(n)',
  },
  {
    title: 'Intersection of Two Arrays',
    category: 'Arrays', difficulty: 'medium',
    statement: 'Print the distinct values present in both arrays, in the order they appear in the first.',
    examples: [{ input: '5\n1 2 2 3 4\n4\n2 4 6 8', expectedOutput: '2 4' }],
    testCases: [
      { input: '5\n1 2 2 3 4\n4\n2 4 6 8', expectedOutput: '2 4', hidden: false },
      { input: '3\n1 2 3\n3\n4 5 6', expectedOutput: '', hidden: false },
      { input: '3\n1 1 1\n2\n1 1', expectedOutput: '1', hidden: true },
    ],
    hints: [
      'Checking every pair is n*m. One array can be prepared instead.',
      'Put the second array in a set, then walk the first once.',
      '"Distinct" means a repeated match is emitted once — track what you have printed.',
    ],
    expectedTimeComplexity: 'O(n + m)',
  },
  {
    title: 'Left Rotate by One, In Place',
    category: 'Arrays', difficulty: 'easy',
    statement: 'Shift every element one position left; the first element wraps to the end. Use no second array.',
    examples: [{ input: '5\n1 2 3 4 5', expectedOutput: '2 3 4 5 1' }],
    testCases: [
      { input: '5\n1 2 3 4 5', expectedOutput: '2 3 4 5 1', hidden: false },
      { input: '1\n9', expectedOutput: '9', hidden: false },
      { input: '2\n1 2', expectedOutput: '2 1', hidden: true },
    ],
    hints: [
      'Something must be saved before it is overwritten.',
      'Save the first element, shift the rest left, then place it at the end.',
      'Shift forwards, not backwards — going the wrong way overwrites values you still need.',
    ],
    expectedTimeComplexity: 'O(n)',
  },
  {
    title: 'Pair with Given Difference',
    category: 'Arrays', difficulty: 'medium',
    statement: 'Print "Yes" if any two distinct elements differ by exactly K, otherwise "No".',
    examples: [{ input: '5 3\n1 5 4 8 2', expectedOutput: 'Yes', explanation: '5 - 2 = 3' }],
    testCases: [
      { input: '5 3\n1 5 4 8 2', expectedOutput: 'Yes', hidden: false },
      { input: '4 10\n1 2 3 4', expectedOutput: 'No', hidden: false },
      { input: '3 0\n1 1 2', expectedOutput: 'Yes', hidden: true },
      { input: '2 0\n1 2', expectedOutput: 'No', hidden: true },
    ],
    hints: [
      'For each value you know exactly which two partners would satisfy it.',
      'A set lets you ask "have I seen x-K or x+K?" instantly.',
      'K = 0 is the trap: it needs a genuine duplicate, not an element matching itself.',
    ],
    expectedTimeComplexity: 'O(n)',
  },
  {
    title: 'Sort 0s, 1s and 2s',
    category: 'Arrays', difficulty: 'hard',
    statement: 'The array holds only 0, 1 and 2. Sort it in a single pass without counting first.',
    examples: [{ input: '6\n2 0 2 1 1 0', expectedOutput: '0 0 1 1 2 2' }],
    testCases: [
      { input: '6\n2 0 2 1 1 0', expectedOutput: '0 0 1 1 2 2', hidden: false },
      { input: '3\n0 0 0', expectedOutput: '0 0 0', hidden: false },
      { input: '4\n2 2 1 0', expectedOutput: '0 1 2 2', hidden: true },
      { input: '1\n1', expectedOutput: '1', hidden: true },
    ],
    hints: [
      'Counting each value and rewriting is two passes. One is possible.',
      'Three pointers: where 0s end, where you are, where 2s begin.',
      'After swapping a 2 into place, do NOT advance — the value you received is unexamined.',
    ],
    expectedTimeComplexity: 'O(n)',
  },
  {
    title: 'Trailing Zeros in Factorial',
    category: 'Arithmetic', difficulty: 'hard',
    statement: 'Print how many zeros N! ends with, without computing N!.\n\n25! overflows every integer type you have. The answer does not require the number.',
    examples: [{ input: '5', expectedOutput: '1' }, { input: '25', expectedOutput: '6' }],
    testCases: [
      { input: '5', expectedOutput: '1', hidden: false },
      { input: '25', expectedOutput: '6', hidden: false },
      { input: '3', expectedOutput: '0', hidden: true },
      { input: '100', expectedOutput: '24', hidden: true },
    ],
    hints: [
      'A trailing zero comes from a factor of 10, which is 2 x 5.',
      'Twos are plentiful; fives are the limit. Count the fives.',
      '25 contributes two fives, 125 contributes three — divide by 5, then 25, then 125.',
    ],
    expectedTimeComplexity: 'O(log n)',
  },
  {
    title: 'Power of Two',
    category: 'Number Logic', difficulty: 'medium',
    statement: 'Print "Yes" if N is a power of two, otherwise "No".\n\nRepeated division works. Look at the binary form and there is a one-line answer.',
    examples: [{ input: '16', expectedOutput: 'Yes' }, { input: '18', expectedOutput: 'No' }],
    testCases: [
      { input: '16', expectedOutput: 'Yes', hidden: false },
      { input: '18', expectedOutput: 'No', hidden: false },
      { input: '1', expectedOutput: 'Yes', hidden: true },
      { input: '0', expectedOutput: 'No', hidden: true },
    ],
    hints: [
      'Write 8 and 7 in binary. What do you notice about their bits?',
      'A power of two has exactly one bit set; one less has all lower bits set.',
      'n & (n-1) is 0 for powers of two — but guard n = 0, which passes that test wrongly.',
    ],
    expectedTimeComplexity: 'O(1)',
  },
];

async function run() {
  const tenantId = process.argv[2];
  if (!tenantId) { console.error('Usage: seedThinkingConcepts3.ts <tenantId>'); process.exit(1); }

  await mongoose.connect(process.env.MONGODB_URI as string);
  let created = 0, updated = 0;

  for (const c of CONCEPTS) {
    const r = await (ThinkingProblem as any).updateOne(
      { tenantId, title: c.title },
      {
        $set: {
          tenantId, title: c.title, category: c.category, difficulty: c.difficulty,
          language: 'java', statement: c.statement, examples: c.examples,
          testCases: c.testCases, hints: c.hints,
          expectedTimeComplexity: c.expectedTimeComplexity, active: true,
        },
      },
      { upsert: true },
    );
    if (r.upsertedCount) created++; else updated++;
  }

  console.log(`Batch 3 — created ${created}, updated ${updated}, total ${CONCEPTS.length}`);
  await mongoose.disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
