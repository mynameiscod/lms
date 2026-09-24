/**
 * The Year-2 golden bank, assembled.
 *
 * One file per skill, fifty items each, ten at every difficulty band. Kept apart from Year 1's
 * bank because the two are imported, counted and certified separately: a Year-2 question must
 * never change a Year-1 inventory, and a Year-1 skill that Year 2 also measures keeps the
 * questions it already has rather than gaining a second set.
 *
 * ── BATCH 1 ───────────────────────────────────────────────────────────────────────────────
 *
 * The six backbone skills that could not be measured at all: each had a single unit and so two
 * checkpoint questions, against the three distinct items a paper needs before it will include a
 * skill. Until these existed the entry test silently omitted them.
 */

import { GoldenItem } from './types';
import { DSA_STACK } from './dsaStack';
import { DSA_QUEUE } from './dsaQueue';
import { DSA_LINKED_LIST } from './dsaLinkedList';
import { DSA_SORTING } from './dsaSorting';
import { DB_NORMALIZATION } from './dbNormalization';
import { DB_TRANSACTIONS } from './dbTransactions';
import { DSA_COMPLEXITY } from './dsaComplexity';
import { DSA_SEARCHING } from './dsaSearching';
import { DSA_RECURSION } from './dsaRecursion';

export const YEAR2_BANK: GoldenItem[] = [
  ...DSA_STACK,
  ...DSA_QUEUE,
  ...DSA_LINKED_LIST,
  ...DSA_SORTING,
  ...DB_NORMALIZATION,
  ...DB_TRANSACTIONS,
  ...DSA_COMPLEXITY,
  ...DSA_SEARCHING,
  ...DSA_RECURSION,
];

export { GoldenItem };
