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
import { DSA_HASHING } from './dsaHashing';
import { DSA_TREES } from './dsaTrees';
import { OOP_CONCEPTS } from './oopConcepts';
import { PYTHON_OOP } from './pythonOop';
import { CLEAN_CODE } from './cleanCode';
import { SQL_JOINS } from './sqlJoins';
import { SQL_FILTERING } from './sqlFiltering';
import { DB_DESIGN } from './dbDesign';
import { API_FUNDAMENTALS } from './apiFundamentals';
import { REST_APIS } from './restApis';
import { SECURITY_FUNDAMENTALS } from './securityFundamentals';
import { TESTING_FUNDAMENTALS } from './testingFundamentals';
import { TECHNICAL_INTERVIEW_PREP } from './technicalInterviewPrep';
import { JS_ASYNC } from './jsAsync';
import { SERVER_SIDE_BASICS } from './serverSideBasics';
import { CLOUD_FUNDAMENTALS } from './cloudFundamentals';
import { DEVOPS_FUNDAMENTALS } from './devopsFundamentals';
import { DATA_WRANGLING } from './dataWrangling';
import { MOBILE_APP_BASICS } from './mobileAppBasics';
import { PYTHON_COLLECTIONS } from './pythonCollections';
import { PYTHON_ERROR_HANDLING } from './pythonErrorHandling';
import { PYTHON_MODULES } from './pythonModules';
import { CODE_REVIEW } from './codeReview';
import { PORTFOLIO_EVIDENCE } from './portfolioEvidence';
import { INTERNSHIP_READINESS } from './internshipReadiness';

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
  ...DSA_HASHING,
  ...DSA_TREES,
  ...OOP_CONCEPTS,
  ...PYTHON_OOP,
  ...CLEAN_CODE,
  ...SQL_JOINS,
  ...SQL_FILTERING,
  ...DB_DESIGN,
  ...API_FUNDAMENTALS,
  ...REST_APIS,
  ...SECURITY_FUNDAMENTALS,
  ...TESTING_FUNDAMENTALS,
  ...TECHNICAL_INTERVIEW_PREP,
  ...JS_ASYNC,
  ...SERVER_SIDE_BASICS,
  ...CLOUD_FUNDAMENTALS,
  ...DEVOPS_FUNDAMENTALS,
  ...DATA_WRANGLING,
  ...MOBILE_APP_BASICS,
  ...PYTHON_COLLECTIONS,
  ...PYTHON_ERROR_HANDLING,
  ...PYTHON_MODULES,
  ...CODE_REVIEW,
  ...PORTFOLIO_EVIDENCE,
  ...INTERNSHIP_READINESS,
];

export { GoldenItem };
