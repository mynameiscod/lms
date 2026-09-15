/**
 * T_LOGIC_MATH, T_RELATIONS and T_MATRICES — discrete mathematics and matrices for Year 1.
 *
 * ── WHY THESE TOPICS ──────────────────────────────────────────────────────────────────────
 *
 * T_LOGIC_MATH and T_RELATIONS are UNIVERSAL: every computing degree examines them, and every
 * program depends on them whether or not anybody names them. A condition is a proposition, a
 * permission check is a subset test, a join table is a relation and a dictionary is a function.
 * T_MATRICES is DIRECTION material for AI_ML and DATA, where a dataset, an image and a neural
 * network layer are all matrices, and a shape mismatch is the first error a learner meets.
 *
 * ── THE LINE THESE TOPICS HOLD ────────────────────────────────────────────────────────────
 *
 * Discrete mathematics taught as symbol drill produces students who can fill in a truth table and
 * cannot say whether a requirement is contradictory. Every unit here ties the formal idea to a
 * statement, a requirement or a line of code, and the logic topic ends with a project that turns
 * an untidy real policy into formal statements and checks them.
 *
 * What these topics deliberately avoid: T_BOOLEAN already teaches the Boolean laws, truth tables
 * and gates, and T_CONDITIONS teaches Python's and/or/not and short-circuiting. Propositional
 * logic here is about STATEMENTS — reading English precisely, implication, converse and
 * contrapositive, and negating correctly — and it refers back to those units instead of
 * re-teaching them. Matrix arithmetic is done by hand before it is done in code, because a
 * learner who has never multiplied a row by a column cannot read a shape error.
 *
 * Checkpoint questions in T_LOGIC_MATH name the one skill each measures: PROPOSITIONAL_LOGIC for
 * statements and connectives, SET_THEORY for sets and their operations.
 */

import { PilotBundle, PilotCoding, PilotMcq } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string, skillKey?: string,
): PilotMcq => ({
  question,
  options: options.map(([text, isCorrect]) => ({ text, isCorrect })),
  explanation,
  ...(skillKey ? { skillKey } : {}),
});

const L = 'PROPOSITIONAL_LOGIC';
const S = 'SET_THEORY';

const MATRIX_PRODUCT_TASK: PilotCoding = {
  title: 'Multiply two matrices',
  description: `Read two matrices of integers and print their product A × B, or the word \`undefined\` if the product does not exist.

Input format: a line \`r c\` giving the rows and columns of A, then r lines of A; then a line giving the rows and columns of B, then the lines of B. Entries on a line are separated by spaces.

Print each row of the product on its own line, with entries separated by single spaces. For A = [[1, 2], [3, 4]] and B = [[5, 6], [7, 8]] the output is \`19 22\` then \`43 50\`.

Check the dimension rule first, then use three nested loops. Do not use NumPy; the point is to see where every entry of the result comes from.`,
  starter: `def read_matrix():
    r, c = map(int, input().split())
    return [list(map(int, input().split())) for _ in range(r)]

A = read_matrix()
B = read_matrix()

# If the number of columns of A differs from the number of rows of B, print undefined.
# Otherwise build the product with nested loops and print it row by row.
`,
  language: 'python',
  tests: [
    { input: '2 2\n1 2\n3 4\n2 2\n5 6\n7 8', expectedOutput: '19 22\n43 50' },
    { input: '2 3\n1 0 2\n3 1 0\n3 1\n4\n1\n2', expectedOutput: '8\n13' },
    { input: '2 3\n1 2 3\n4 5 6\n2 3\n1 1 1\n1 1 1', expectedOutput: 'undefined' },
    { input: '1 3\n2 -1 0\n3 2\n1 4\n0 -2\n5 5', expectedOutput: '2 10', isHidden: true },
    { input: '3 1\n1\n2\n3\n1 3\n4 5 6', expectedOutput: '4 5 6\n8 10 12\n12 15 18', isHidden: true },
  ],
};

const SUBMISSIONS_TASK: PilotCoding = {
  title: 'Who has not submitted?',
  description: `The first input line holds the roll numbers of the students enrolled in a course. The second line holds the roll numbers that appear in the submission log; a roll number may appear more than once, and the log can contain roll numbers of students who are not enrolled.

Print the roll numbers of enrolled students who have not submitted, in increasing numerical order, separated by single spaces. If every enrolled student has submitted, print \`none\`.

Example: enrolled \`101 102 103 104\` and log \`102 104\` prints \`101 103\`.

Use sets for the comparison, and sort only at the end, because a set has no order of its own.`,
  starter: `enrolled = input().split()
submitted = input().split()

# Convert to sets of integers, take the right set operation, then print the result sorted.
`,
  language: 'python',
  tests: [
    { input: '101 102 103 104\n102 104', expectedOutput: '101 103' },
    { input: '5 6 7\n7 6 5 5', expectedOutput: 'none' },
    { input: '10 20 30\n40', expectedOutput: '10 20 30' },
    { input: '3 1 2 9 8\n8 1 1', expectedOutput: '2 3 9', isHidden: true },
  ],
};

export const LOGIC_MATH_BUNDLES: PilotBundle[] = [
  /* ── T_LOGIC_MATH ───────────────────────────────────────────────────────── */
  {
    unitCode: 'T_LOGIC_MATH_PROPOSITIONS',
    notes: `A proposition is a declarative sentence that is either true or false — not both, and not
"it depends". Logic works with propositions because they are the smallest things that can be
checked.

**Propositions, and sentences that are not:**

- "7 is a prime number." True, so a proposition.
- "2 + 2 = 5." False, and still a proposition. Being false does not disqualify a sentence; having
  no truth value at all does.
- "Submit the form by Friday." A command. It can be obeyed or ignored, but it is not true or false.
- "Is 91 prime?" A question. Its answer is a proposition ("91 is prime", which is false, since
  91 = 7 × 13); the question itself is not.
- "x > 10." An **open sentence**, also called a predicate. Until x has a value it is neither true
  nor false. Put x = 12 and it becomes the proposition "12 > 10", which is true.

**Unknown is not the same as undecided.** "Every even number greater than 2 is the sum of two
primes" is Goldbach's conjecture. Nobody has proved it or found a counterexample, yet it is a
proposition: it is one or the other, and we do not yet know which.

**Names for propositions.** Logic uses letters: let p be "the fee is paid" and q be "the form is
signed". An **atomic** proposition cannot be broken into smaller ones; a **compound** proposition
is built from atomic ones with connectives such as "and", "or", "not" and "if ... then", which are
the subject of the next units.

**Where you have already met them.** Every condition in a program is a predicate. In

    if marks >= 40:

the expression \`marks >= 40\` has no truth value while you read the code, and becomes a
proposition, \`True\` or \`False\`, the moment the line runs with a real value of \`marks\`.

**Predicates pick out sets.** For x in {1, 2, ..., 10}, the predicate "x is even" is true for
exactly 2, 4, 6, 8 and 10. That collection is its **truth set**, and it is the bridge between this
topic's two halves: every statement about "the x for which ..." is also a statement about a set.

**The common mistake** is to think that a false sentence, or one nobody can yet check, is not a
proposition. The only test is whether it has a truth value at all.

**Why it matters.** "The page should load quickly" is not a proposition, which is exactly why
nobody can test it. "The page finishes loading within 2 seconds on a 4G connection" is. Turning a
vague requirement into propositions is what makes it checkable, and it is the skill the mini
project at the end of this topic asks for.`,
    mcqs: [
      mcq('Which of these sentences is a proposition?',
        [['2 + 3 = 6', true],
          ['Please submit the form before Friday', false],
          ['Is 91 a prime number?', false],
          ['x + 3 = 6', false]],
        'It is false, and a false sentence is still a proposition. The command and the question have no truth value, and x + 3 = 6 has none until x is given.'),
      mcq('Why is "x > 10" on its own not a proposition?',
        [['Its truth depends on the value of x, which has not been given', true],
          ['It contains a letter, and propositions may contain only numbers', false],
          ['It is false, and a proposition has to be a true statement', false],
          ['A comparison is an instruction to the reader, not a statement', false]],
        'It is an open sentence. Substituting a value for x turns it into a proposition, true for x = 12 and false for x = 3.'),
      mcq('"Every even number greater than 2 is the sum of two primes" has never been proved or disproved. Is it a proposition?',
        [['Yes; it is true or false even though nobody knows which yet', true],
          ['No, because a proposition must have a known truth value', false],
          ['No, because it makes a claim about infinitely many numbers', false],
          ['Only once a computer has checked every even number there is', false]],
        'A proposition needs a truth value, not a known one. Whether we have found out is a fact about us, not about the sentence.'),
      mcq('A requirement says "the page should load quickly". Which rewrite turns it into a proposition that can be tested?',
        [['The page finishes loading within 2 seconds on a 4G connection', true],
          ['The page should load as quickly as it reasonably can for users', false],
          ['The page must feel fast to the large majority of its visitors', false],
          ['Loading speed is one of the most important goals for this page', false]],
        'Only the first can be measured and come out true or false. The others still depend on what "quickly", "fast" or "important" mean to the reader.'),
    ],
    checkpoint: [
      mcq('In the code `if balance >= amount:`, the expression `balance >= amount` is best described as:',
        [['A predicate that becomes a proposition once both values are known', true],
          ['A proposition that is always true, because the if checks it first', false],
          ['A command telling the program to make balance at least amount', false],
          ['Neither, because conditions in code are not a part of logic at all', false]],
        'While you read the code it has no truth value. When the line runs, the variables have values and the expression is True or False.', L),
      mcq('Which of these is NOT a proposition?',
        [['n is a multiple of 4', true],
          ['1000 is a multiple of 8', false],
          ['15 is a multiple of 4', false],
          ['Every multiple of 4 is even', false]],
        'It depends on n, so it is an open sentence. "Every multiple of 4 is even" mentions no particular number but is still true, and "15 is a multiple of 4" is a false proposition.', L),
      mcq('For x in {1, 2, ..., 10}, the predicate "x is a multiple of 3" is true exactly for:',
        [['{3, 6, 9}', true],
          ['{0, 3, 6, 9}', false],
          ['{3, 6, 9, 12}', false],
          ['{1, 3, 6, 9}', false]],
        'The truth set contains only values from the given range that make the predicate true. 0 and 12 are multiples of 3 but lie outside the range, and 1 is not a multiple of 3.', S),
    ],
  },
  {
    unitCode: 'T_LOGIC_MATH_CONNECTIVES',
    notes: `Connectives build compound propositions from simpler ones. You have met their Boolean
versions in T_BOOLEAN_BOOLEAN_VALUES, and Python's \`and\`, \`or\` and \`not\` in
T_CONDITIONS_BOOLEAN_OPERATORS. This unit is about using them on **statements**: reading English
precisely and writing it formally.

**The three connectives:**

- **Conjunction**, p ∧ q ("p and q"): true only when both are true.
- **Disjunction**, p ∨ q ("p or q"): true when at least one is true, including when both are.
- **Negation**, ¬p ("not p"): true exactly when p is false.

Take p: "Ravi has paid the fee" (true) and q: "Ravi has signed the form" (false). Then p ∧ q is
false, p ∨ q is true, ¬q is true, and ¬p ∨ q is false because both of its parts are false.

**Translating English.** Everyday words hide the connectives:

| English | Formal |
|---|---|
| p and q; p but q; p, although q | p ∧ q |
| p or q (inclusive) | p ∨ q |
| not p; it is not the case that p | ¬p |
| neither p nor q | ¬p ∧ ¬q |

"But" is a conjunction. "The payment failed but the order was placed" asserts both facts; the
contrast is tone, not logic.

**Inclusive and exclusive "or".** Logical ∨ is inclusive. A menu that says "comes with tea or
coffee" means exactly one, which is exclusive or, written formally as (p ∨ q) ∧ ¬(p ∧ q). When a
requirement says "or", ask which is meant; getting it wrong is a real specification bug.

**Negating a comparison correctly.** The negation of "x > 5" is "x ≤ 5", not "x < 5". The value 5
makes "x > 5" false, so it must make the negation true. Off-by-one errors in conditions are very
often a negation done carelessly.

**Precedence and brackets.** ¬ applies to the smallest thing after it, and ∧ groups before ∨, so
¬p ∨ q ∧ r means (¬p) ∨ (q ∧ r). Write the brackets anyway; a reader should not need the rule.

**Connectives and sets.** If P is the truth set of p and Q the truth set of q, then p ∧ q is true
exactly on the elements in both P and Q, p ∨ q on the elements in P or Q or both, and ¬p on the
elements outside P. These are intersection, union and complement, which the set units name.

**Why it matters.** A condition in code is only as correct as the English it was translated from.
Most wrong conditions are not typing slips: they are "or" read as exclusive, "neither ... nor"
written with the wrong connective, or a negation that forgot the boundary.`,
    mcqs: [
      mcq('p: "the train is late" is true and q: "it is raining" is false. What is the truth value of ¬p ∨ q?',
        [['False', true],
          ['True', false],
          ['It cannot be decided from p and q alone', false],
          ['True, but only if the train is very late', false]],
        '¬p is false and q is false, and a disjunction of two false parts is false. The truth values of p and q are all a compound proposition needs.'),
      mcq('The negation of "x > 5" is:',
        [['x ≤ 5', true],
          ['x < 5', false],
          ['x > -5', false],
          ['x ≠ 5', false]],
        'x = 5 makes "x > 5" false, so its negation must be true at 5. "x < 5" wrongly excludes the boundary.'),
      mcq('With p = "the fee is paid" and q = "the form is signed", "neither the fee is paid nor the form is signed" is:',
        [['¬p ∧ ¬q', true],
          ['¬p ∨ ¬q', false],
          ['¬(p ∧ q)', false],
          ['¬p ∧ q', false]],
        'Neither ... nor denies both parts, so both negations must hold. ¬p ∨ ¬q is true when just one of them is missing, which is a weaker claim.'),
      mcq('Logical p ∨ q is true when both p and q are true. Which sentence uses "or" in a way that does NOT match this?',
        [['"Your thali comes with rice or roti", when only one is allowed', true],
          ['"Students in first year or on a scholarship get a discount"', false],
          ['"Entry is allowed to anyone with a ticket or a staff pass"', false],
          ['"The alarm sounds if the door opens or a window breaks"', false]],
        'The menu means exclusive or: exactly one. In the other three sentences a case where both parts hold still satisfies the rule, which is inclusive or.'),
    ],
    checkpoint: [
      mcq('With p = "the payment failed" and q = "the order was placed", "the payment failed but the order was placed" is:',
        [['p ∧ q', true],
          ['p ∨ q', false],
          ['¬p ∧ q', false],
          ['p ∧ ¬q', false]],
        'The sentence asserts both facts, so it is a conjunction. "But" adds a sense of contrast and nothing logical.', L),
      mcq('P is the set of values that make p true and Q the set that make q true. Exactly which values make p ∨ q true?',
        [['Those in P, in Q, or in both of the two sets', true],
          ['Only the values that are in both P and in Q', false],
          ['Only values in exactly one of the two sets', false],
          ['Every value that is in neither P nor in Q', false]],
        'Disjunction is inclusive, so it is true on the union of the truth sets. "Exactly one" describes exclusive or.', S),
      mcq('p is true and q is false. Which compound proposition is true?',
        [['p ∧ ¬q', true],
          ['¬p ∨ q', false],
          ['p ∧ q', false],
          ['¬(p ∨ q)', false]],
        'p is true and ¬q is true, so the conjunction is true. ¬p ∨ q has two false parts, p ∧ q has a false part, and p ∨ q is true so its negation is false.', L),
    ],
  },
  {
    unitCode: 'T_LOGIC_MATH_IMPLICATION',
    notes: `The conditional p → q is read "if p then q". p is the **hypothesis** and q the
**conclusion**. It is the connective people get wrong most often, because its logical meaning is
narrower than its everyday one.

**When is p → q false?** In exactly one case: p is true and q is false.

    p   q   p → q
    T   T     T
    T   F     F
    F   T     T
    F   F     T

Think of it as a promise: "if you score above 90, you get a certificate". The promise is broken
only if you score above 90 and receive no certificate. If you score 70, the promise says nothing
about you, so it has not been broken, and a statement that has not been broken is true.

**Vacuous truth.** When p is false, p → q is true whatever q is. "Every assignment Anil submitted
was on time" is true if Anil submitted nothing. Python agrees: \`all(x > 0 for x in [])\` is
\`True\`, because there is no element to break the rule.

**Converse, inverse and contrapositive.** Start from "if n is divisible by 4, then n is even",
which is true.

- **Converse**, q → p: "if n is even, then n is divisible by 4". False: 6 is even and is not.
- **Inverse**, ¬p → ¬q: "if n is not divisible by 4, then n is not even". False, again by 6.
- **Contrapositive**, ¬q → ¬p: "if n is not even, then n is not divisible by 4". True.

The contrapositive always has the same truth value as the original; the converse and the inverse
need not. Assuming the converse is one of the commonest reasoning errors there is.

**Other ways English says it.** "p only if q", "q is necessary for p", "p is sufficient for q"
and "q whenever p" all mean p → q. "p if and only if q", written p ↔ q, means both directions hold.

**Checking a rule.** To test "if a complaint is marked urgent, it was answered within a day", look
at complaints marked urgent (was the answer fast?) and complaints not answered within a day (were
they marked urgent?). Nothing else can break the rule.

**Implication inside set language.** In the set units, "A is a subset of B" means: for every x,
if x is in A then x is in B. That is why the empty set is a subset of every set: "x is in the
empty set" is never true, so the implication holds vacuously.

**The misconception** is reading p → q as causation, or as "p and q". It claims only that p true
with q false never happens. An \`if\` statement in code is an instruction; p → q is a claim that can
itself be true or false.`,
    mcqs: [
      mcq('"If it rains, the match is cancelled." On which day was this statement false?',
        [['It rained and the match went ahead', true],
          ['It did not rain and the match was cancelled', false],
          ['It did not rain and the match went ahead', false],
          ['It rained and the match was cancelled', false]],
        'An implication fails only when the hypothesis is true and the conclusion false. On a dry day the statement makes no promise, so it cannot be broken.'),
      mcq('The converse of "if n is divisible by 6, then n is even" is:',
        [['If n is even, then n is divisible by 6', true],
          ['If n is not even, then n is not divisible by 6', false],
          ['If n is not divisible by 6, then n is not even', false],
          ['n is divisible by 6 and n is not even', false]],
        'The converse swaps hypothesis and conclusion. The second option is the contrapositive and the third is the inverse; the converse here is false, since 4 is even.'),
      mcq('Python\'s `all([])` returns `True`. Which logical idea explains this?',
        [['Vacuous truth: no element exists that could break the rule', true],
          ['Python treats every empty list as a truthy value in conditions', false],
          ['all() skips its check when the list is shorter than two items', false],
          ['An empty list is converted into [True] before it is checked', false]],
        '"For every x in the list, x is true" has no case with a false x, so it holds. An empty list is in fact falsy, which is why the second option is wrong.'),
      mcq('"You may sit the exam only if you have paid the fee." With s = "you sit the exam" and f = "you have paid the fee", this is:',
        [['s → f', true],
          ['f → s', false],
          ['s ↔ f', false],
          ['¬s → ¬f', false]],
        '"p only if q" means p → q: sitting the exam requires payment. It does not promise that everyone who pays will sit.'),
    ],
    checkpoint: [
      mcq('Four delivery records each show one fact: (1) marked FRAGILE, (2) not marked, (3) packed in bubble wrap, (4) not in bubble wrap. To check "if marked FRAGILE, then packed in bubble wrap", which records must you look up in full?',
        [['Records 1 and 4', true],
          ['Records 1 and 3', false],
          ['Only record 1', false],
          ['Records 1, 3 and 4', false]],
        'The rule fails only for a FRAGILE parcel without bubble wrap. Record 1 might lack wrap and record 4 might be FRAGILE; records 2 and 3 cannot break it whatever their other fact is.', L),
      mcq('Which statement is logically equivalent to "if the input is valid, the program saves it"?',
        [['If the program does not save the input, the input is not valid', true],
          ['If the program saves the input, then the input must be valid', false],
          ['If the input is not valid, then the program does not save it', false],
          ['The input is valid and the program always saves that input', false]],
        'That is the contrapositive, which always has the same truth value. The second option is the converse and the third the inverse, and neither follows.', L),
      mcq('"A is a subset of B" means every x in A is also in B. Why is the empty set a subset of every set B?',
        [['"If x is in the empty set, then x is in B" has no case that breaks it', true],
          ['The empty set is stored inside every set as one of its elements', false],
          ['Every set is defined to begin with the empty set at position zero', false],
          ['An empty set equals every other set, so each one contains the other', false]],
        'The hypothesis is never true, so the implication is vacuously true for every x. Being a subset is not the same as being an element.', S),
    ],
  },
  {
    unitCode: 'T_LOGIC_MATH_EQUIVALENCE',
    notes: `Two propositions are **logically equivalent**, written ≡, when they have the same truth
value in every possible case. Equivalence is what lets you replace a condition or a requirement
with one that is easier to read, test or negate, knowing that nothing has changed.

A **tautology** is true in every case, such as p ∨ ¬p. A **contradiction** is false in every case,
such as p ∧ ¬p. Two propositions are equivalent exactly when "A ↔ B" is a tautology.

**How to prove an equivalence.** List every combination of truth values and compare the columns,
the method from T_BOOLEAN_TRUTH_TABLES. For p → q ≡ ¬p ∨ q:

    p   q   p → q   ¬p   ¬p ∨ q
    T   T     T      F      T
    T   F     F      F      F
    F   T     T      T      T
    F   F     T      T      T

The two columns agree on all four rows, so the equivalence holds. Agreement on three rows would
prove nothing.

**The equivalences worth knowing by heart:**

- p → q ≡ ¬p ∨ q (an implication is an "or")
- p → q ≡ ¬q → ¬p (the contrapositive)
- p ↔ q ≡ (p → q) ∧ (q → p)
- ¬(p ∧ q) ≡ ¬p ∨ ¬q, and ¬(p ∨ q) ≡ ¬p ∧ ¬q (De Morgan)
- ¬(p → q) ≡ p ∧ ¬q

**De Morgan on statements.** Negating an "and" gives an "or" of the negations, and the other way
round. "It is not true that the shop is open and the item is in stock" means "the shop is closed
or the item is out of stock". The same law extends to "every" and "some": the negation of "every
test passed" is "at least one test failed", not "every test failed".

**Negating an implication does not give an implication.** The negation of "if the server is up,
the page loads" is "the server is up and the page does not load". That is exactly what a bug
report has to show: the condition holding and the promised result missing.

**In program conditions.** A loop that should stop once an item is found or three attempts are
used must run while that is not the case:

    while not (found or attempts >= 3):
    while not found and attempts < 3:

The two lines are the same loop. The second comes from De Morgan plus negating the comparison,
and it says in words what keeps the loop going.

**In sets.** The students who are not (in the chess club or in the drama club) are exactly those
who are not in chess and not in drama. The set units write this with complements; it is the same
law applied to membership.

**The misconception** is to negate each part and keep the connective. ¬(p ∧ q) is not ¬p ∧ ¬q:
with p true and q false the left side is true and the right side is false.`,
    mcqs: [
      mcq('Which proposition is logically equivalent to the implication p → q?',
        [['¬p ∨ q', true],
          ['p ∨ ¬q', false],
          ['¬p ∧ q', false],
          ['q → p', false]],
        'p → q is false only when p is true and q false, and ¬p ∨ q is false in exactly that row too. q → p is the converse, which can differ.'),
      mcq('The negation of "if the server is up, the page loads" is:',
        [['The server is up and the page does not load', true],
          ['If the server is down, the page does not load', false],
          ['If the server is up, then the page does not load', false],
          ['The server is down or the page does not load', false]],
        '¬(p → q) ≡ p ∧ ¬q. The only way the original can be false is the server being up with no page, and that is what its negation asserts.'),
      mcq('Which loop header behaves the same as `while not (found or attempts >= 3):`?',
        [['`while not found and attempts < 3:`', true],
          ['`while not found or attempts < 3:`', false],
          ['`while found and attempts >= 3:`', false],
          ['`while not found and attempts <= 3:`', false]],
        'De Morgan turns the negated "or" into an "and" of negations, and not (attempts >= 3) is attempts < 3. Writing <= 3 would allow a fourth attempt.'),
      mcq('Two expressions agree on three of the four rows of their truth table. What can you conclude?',
        [['They are not equivalent, since one row is enough to separate them', true],
          ['They are equivalent, because most of the rows give the same value', false],
          ['They are equivalent once the disagreeing row is shown to be rare', false],
          ['Nothing yet; a truth table must be repeated before it is trusted', false]],
        'Equivalence means the same value in every case. A single row where they differ is a case where swapping one for the other changes the result.'),
    ],
    checkpoint: [
      mcq('Which pair of propositions is NOT logically equivalent?',
        [['p → q and q → p', true],
          ['p → q and ¬q → ¬p', false],
          ['¬(p ∨ q) and ¬p ∧ ¬q', false],
          ['p ↔ q and (p → q) ∧ (q → p)', false]],
        'An implication and its converse can differ: with p false and q true, p → q is true and q → p is false. The other pairs are the contrapositive, De Morgan and the definition of ↔.', L),
      mcq('A reviewer reads "not every test passed" as "every test failed". What does the statement actually say?',
        [['At least one test failed, and others may still have passed', true],
          ['Every single test in the suite failed when it was last run', false],
          ['No test was run, so neither passing nor failing applies', false],
          ['Exactly one test failed, and all of the others passed', false]],
        'Negating "every" gives "some ... not". The statement is true with one failure among a hundred passes, which is far weaker than every test failing.', L),
      mcq('In a class, some students are in the chess club and some in the drama club. The students who are NOT in (chess OR drama) are exactly those who are:',
        [['Not in chess and also not in drama', true],
          ['Not in chess, or else not in drama', false],
          ['In chess or drama but not in both', false],
          ['In both clubs at the same time', false]],
        'This is De Morgan applied to membership: outside the union means outside each set. "Not in chess or not in drama" would include a chess player who does not act.', S),
    ],
  },
  {
    unitCode: 'T_LOGIC_MATH_SETS',
    notes: `A set is an unordered collection of distinct objects, called its elements. Two
consequences of that definition drive almost everything else: order does not matter, and nothing is
counted twice.

**Writing a set.**

- **Roster form** lists the elements: {2, 3, 5, 7}.
- **Set-builder form** describes them with a predicate: {x ∈ Z : 0 < x < 10 and x is prime}, read
  "the set of integers x such that 0 < x < 10 and x is prime". It is the same set.

x ∈ A means "x is an element of A", and x ∉ A means it is not. The usual named sets are N, the
natural numbers (some books start at 0 and some at 1, so check which your syllabus uses), Z the
integers, Q the rationals and R the reals.

**Order and repetition do not count.** {1, 2, 2, 3} and {3, 2, 1} are the same set, and its
**cardinality** is |A| = 3. The letters of "banana" form the set {a, b, n}, of size 3.

**The empty set** ∅, also written {}, has no elements, so |∅| = 0. But {∅} is a set with one
element: a box containing an empty box is not empty.

**Subsets.** A ⊆ B means every element of A is also an element of B. {1, 3} ⊆ {1, 2, 3}, and every
set is a subset of itself. A ⊂ B, a **proper** subset, also requires A ≠ B. Two sets are **equal**
exactly when A ⊆ B and B ⊆ A, which is how equality of sets is usually proved.

**Element versus subset.** For A = {1, 2, 3}: 2 ∈ A and {2} ⊆ A, but {2} ∉ A, and "2 ⊆ A" is
meaningless because 2 is not a set. Elements belong; subsets are contained. The difference matters
as soon as sets contain sets, such as a set of teams, each of which is a set of players.

**Counting subsets.** A set with n elements has 2^n subsets, because each element is independently
in or out. {a, b} has four: ∅, {a}, {b} and {a, b}. The collection of all subsets is the **power
set**. Forgetting ∅ and the set itself is how people arrive at 2^n − 2.

**The universal set** U is everything under discussion: all students in a college, or the integers
from 1 to 100. It matters as soon as you speak of "everything not in A".

**Why it matters.** Most "which ones" questions in computing are set questions: the users with a
permission, the courses a student has passed, the distinct visitors to a page. Writing them as
sets with a precise predicate removes the ambiguity of English, and Python's sets, later in this
topic, turn them into one line of code.`,
    mcqs: [
      mcq('What is the cardinality |{3, 1, 3, 2, 1}|?',
        [['3', true],
          ['5', false],
          ['4', false],
          ['2', false]],
        'Repeated elements are the same element, so the set is {1, 2, 3}. Five is the length of the list as written, not the size of the set.'),
      mcq('For A = {1, 2, 3}, which statement is true?',
        [['{2} ⊆ A', true],
          ['{2} ∈ A', false],
          ['2 ⊆ A', false],
          ['∅ ∈ A', false]],
        'The set containing 2 is a subset of A. It is not an element of A, whose elements are the numbers 1, 2 and 3, and 2 is a number, not a set.'),
      mcq('How many subsets does the set {a, b, c} have?',
        [['8', true],
          ['6', false],
          ['7', false],
          ['9', false]],
        'Each of the three elements is in or out independently, giving 2^3 = 8. The count 7 forgets the empty set and 6 forgets the set itself as well.'),
      mcq('The set {x ∈ Z : -2 ≤ x < 2} in roster form is:',
        [['{-2, -1, 0, 1}', true],
          ['{-1, 0, 1}', false],
          ['{-2, -1, 0, 1, 2}', false],
          ['{-1, 0, 1, 2}', false]],
        'The lower bound is included (≤) and the upper bound excluded (<). Reading both inequalities carefully is the whole task.'),
    ],
    checkpoint: [
      mcq('What is the cardinality |{∅, {1, 2}}|?',
        [['2', true],
          ['3', false],
          ['0', false],
          ['1', false]],
        'The set has two elements: the empty set and the set {1, 2}. The numbers 1 and 2 are inside an element, not elements themselves.', S),
      mcq('How many elements does the set of letters in the word "committee" have?',
        [['6', true],
          ['9', false],
          ['5', false],
          ['7', false]],
        'The distinct letters are c, o, m, i, t and e. Nine counts the repeated m, t and e again, which a set never does.', S),
      mcq('The proposition "5 ∈ A" is true and "5 ∈ B" is false. Which proposition about 5 is true?',
        [['¬(5 ∈ A → 5 ∈ B)', true],
          ['5 ∈ A ∧ 5 ∈ B', false],
          ['5 ∈ B ∨ ¬(5 ∈ A)', false],
          ['5 ∈ A → 5 ∈ B', false]],
        'The implication has a true hypothesis and a false conclusion, so it is false and its negation is true. That single element is why A ⊆ B fails.', L),
    ],
  },
  {
    unitCode: 'T_LOGIC_MATH_SET_OPERATIONS',
    notes: `Set operations build new sets from existing ones, and each is defined by a connective from
the logic units:

- **Union** A ∪ B = {x : x ∈ A ∨ x ∈ B}: in A, in B, or in both.
- **Intersection** A ∩ B = {x : x ∈ A ∧ x ∈ B}: in both.
- **Difference** A − B = {x : x ∈ A ∧ x ∉ B}: in A but not in B, also written A \\ B.
- **Complement** A′ = U − A: everything in the universal set that is not in A.
- **Symmetric difference** A Δ B = (A − B) ∪ (B − A): in exactly one of the two, which is
  exclusive or.

Sets with A ∩ B = ∅ are called **disjoint**.

**Difference is not symmetric.** A − B and B − A are different sets unless A = B, when both are
empty. Union and intersection do not depend on the order of A and B.

**Venn diagrams** draw each set as a region inside a rectangle standing for U. Two overlapping
circles make four regions: A only, B only, both, and neither. A diagram is good for seeing an
identity and for counting, but it is an illustration, not a proof.

**Counting with inclusion–exclusion.** |A ∪ B| = |A| + |B| − |A ∩ B|. Adding the two sizes
counts every element of the overlap twice, so the overlap is subtracted once. The misconception is
|A ∪ B| = |A| + |B|, which holds only when the sets are disjoint.

For 120 students, where 70 learn Python, 50 learn Java and 30 learn both: at least one language is
70 + 50 − 30 = 90 students, neither is 120 − 90 = 30, and Python only is 70 − 30 = 40.

**De Morgan for sets.** (A ∪ B)′ = A′ ∩ B′ and (A ∩ B)′ = A′ ∪ B′. These are the logic laws from
T_LOGIC_MATH_EQUIVALENCE applied to membership: "not in (A or B)" is "not in A and not in B".

**Why it matters.** Questions about data are set operations. Students enrolled but not submitted
is a difference; customers who bought both products is an intersection; the audience reached by
two campaigns, without double counting, is a union measured with inclusion–exclusion. Choosing the
right operation is choosing the right question.`,
    workedExample: `**Goal: compute every operation on one example, then check two laws against it.**

    U = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10}
    A = {2, 4, 6, 8, 10}      the even numbers
    B = {3, 6, 9}             the multiples of 3

**The operations.**

- A ∪ B = {2, 3, 4, 6, 8, 9, 10}, which has 7 elements.
- A ∩ B = {6}, the only number that is both even and a multiple of 3.
- A − B = {2, 4, 8, 10} and B − A = {3, 9}. They are different sets.
- A Δ B = {2, 3, 4, 8, 9, 10}, everything in exactly one set.
- A′ = {1, 3, 5, 7, 9} and B′ = {1, 2, 4, 5, 7, 8, 10}.

**Check inclusion–exclusion.** |A| + |B| − |A ∩ B| = 5 + 3 − 1 = 7, which matches the seven
elements listed for A ∪ B.

**Check De Morgan.** (A ∪ B)′ is U without the seven elements of the union, which leaves {1, 5, 7}.
A′ ∩ B′ keeps only what A′ and B′ share: 1, 5 and 7. The two sides agree.

The second law works the same way: (A ∩ B)′ is U without 6, and A′ ∪ B′ contains every number
except 6, because 6 is the only number missing from both complements. Checking a law on a small
example does not prove it, but it catches a misremembered law immediately.`,
    mcqs: [
      mcq('A = {1, 2, 3, 4} and B = {3, 4, 5}. What is A − B?',
        [['{1, 2}', true],
          ['{5}', false],
          ['{1, 2, 5}', false],
          ['{3, 4}', false]],
        'A − B keeps the elements of A that are not in B. {5} is B − A, {1, 2, 5} is the symmetric difference and {3, 4} is the intersection.'),
      mcq('In a class of 60, 35 students take Physics, 30 take Chemistry and 12 take both. How many take at least one of the two?',
        [['53', true],
          ['65', false],
          ['41', false],
          ['7', false]],
        '35 + 30 − 12 = 53. Adding without subtracting counts the 12 twice, giving 65, and 7 is the number who take neither.'),
      mcq('For A = {1, 2, 3} and B = {2, 3, 4}, the symmetric difference A Δ B is:',
        [['{1, 4}', true],
          ['{2, 3}', false],
          ['{1, 2, 3, 4}', false],
          ['{1}', false]],
        'It contains the elements in exactly one of the sets: 1 from A only and 4 from B only. {1} is only A − B.'),
      mcq('Which statement holds for every pair of sets A and B?',
        [['A ∩ B ⊆ A ∪ B', true],
          ['A − B = B − A', false],
          ['|A ∪ B| = |A| + |B|', false],
          ['A ∪ B ⊆ A ∩ B', false]],
        'Anything in both sets is certainly in at least one. The size formula needs the overlap subtracted, and difference depends on order.'),
    ],
    checkpoint: [
      mcq('U = {1, 2, ..., 8}, A = {1, 2, 3, 4} and B = {3, 4, 5, 6}. What is (A ∪ B)′?',
        [['{7, 8}', true],
          ['{5, 6, 7, 8}', false],
          ['{1, 2, 5, 6, 7, 8}', false],
          ['{3, 4, 7, 8}', false]],
        'A ∪ B = {1, 2, 3, 4, 5, 6}, and the complement keeps what is left of U. {5, 6, 7, 8} is A′ alone, and {1, 2, 5, 6, 7, 8} is (A ∩ B)′.', S),
      mcq('A shop had 200 customers last month: 120 bought online, 110 bought in store, and every customer bought at least one way. How many bought both ways?',
        [['30', true],
          ['90', false],
          ['10', false],
          ['230', false]],
        '|A ∪ B| = |A| + |B| − |A ∩ B| gives 200 = 120 + 110 − |A ∩ B|, so the overlap is 30. The sum 230 exceeds the 200 customers precisely because of it.', S),
      mcq('Which proposition defines membership of x in the difference A − B?',
        [['x ∈ A ∧ ¬(x ∈ B)', true],
          ['x ∈ A ∨ ¬(x ∈ B)', false],
          ['¬(x ∈ A) ∧ x ∈ B', false],
          ['x ∈ A → x ∈ B', false]],
        'In A and not in B is a conjunction with a negation. The disjunction would also admit everything outside B, and the third option describes B − A.', L),
    ],
  },
  {
    unitCode: 'T_LOGIC_MATH_SETS_IN_CODE',
    notes: `Python has a built-in \`set\` type that behaves like a mathematical set: unordered, with no
duplicates, and with fast membership tests.

    primes = {2, 3, 5, 7}
    empty = set()
    visitors = set(["asha", "ravi", "asha"])   # {'asha', 'ravi'}

Write \`set()\` for an empty set, because \`{}\` creates an empty dictionary. Duplicates disappear on
creation, which is why \`len(set(items))\` counts distinct values.

**The operators follow the mathematics:**

- union A ∪ B: \`a | b\`, or \`a.union(b)\`
- intersection A ∩ B: \`a & b\`
- difference A − B: \`a - b\`
- symmetric difference A Δ B: \`a ^ b\`
- subset A ⊆ B: \`a <= b\`, and proper subset: \`a < b\`
- membership x ∈ A: \`x in a\`

The method forms accept any iterable, so \`a.union([4, 5])\` works, while the operators need a set
on both sides.

**Changing a set.** \`s.add(x)\` inserts x. \`s.remove(x)\` deletes it and raises \`KeyError\` if x is
absent; \`s.discard(x)\` deletes it if present and does nothing otherwise. Choose \`remove\` when a
missing element would be a bug you want to hear about.

**No order and no indexing.** \`s[0]\` raises \`TypeError\`. A printed set may list its elements in any
order, so sort before displaying: \`sorted(s)\` returns a list.

**Elements must be hashable.** Numbers, strings and tuples can be elements; lists, dictionaries and
sets cannot, because they can change after being stored. \`{[1, 2]}\` raises \`TypeError\`; use the
tuple \`{(1, 2)}\` instead, or a \`frozenset\` when you need a set of sets.

**Set comprehensions** mirror set-builder notation:

    {x * x for x in range(-3, 4)}      # {0, 1, 4, 9}

Seven inputs give four elements, because the squares repeat.

**Membership is fast.** \`x in some_set\` takes roughly the same time however large the set is,
whereas \`x in some_list\` checks element by element; T_ARRAYS_COMPLEXITY explains why.

**Sets in conditions.** A subset test states a rule directly:

    required = {"read", "write"}
    if required <= granted:
        save()

That is the implication "every required permission is granted". If \`required\` is empty the
condition is \`True\` by vacuous truth, as in T_LOGIC_MATH_IMPLICATION, which is the right answer
for a page that needs no permissions.

**One line each.** With \`enrolled\` and \`submitted\` as sets of roll numbers, missing work is
\`enrolled - submitted\`, stray submissions are \`submitted - enrolled\`, and "has everyone
submitted?" is \`enrolled <= submitted\`.

**The misconception** is using a set where order or repeats matter. A set of exam marks silently
loses the second student who scored 72, and a set of recipe steps loses their order. Use a set for
"which ones", and a list for "in what order" or "how many times".`,
    coding: [SUBMISSIONS_TASK],
    mcqs: [
      mcq('`s = {}` followed by `s.add(5)` raises an error. Why?',
        [['`{}` creates an empty dictionary, which has no add method', true],
          ['A set cannot hold integers until they are turned into text', false],
          ['`add` only works once a set already holds at least one item', false],
          ['Curly braces create a tuple, and a tuple cannot be changed', false]],
        'Empty braces mean an empty dict in Python. The only literal way to make an empty set is set().'),
      mcq('What does `len(set([4, 4, 2, 7, 2]))` evaluate to?',
        [['3', true],
          ['5', false],
          ['2', false],
          ['4', false]],
        'Converting to a set removes the repeats, leaving {2, 4, 7}. Five is the length of the original list.'),
      mcq('`granted` and `required` are sets of permission names. Which condition says "every permission the page requires has been granted"?',
        [['`required <= granted`', true],
          ['`granted <= required`', false],
          ['`required & granted`', false],
          ['`required == granted`', false]],
        'The requirement is a subset test. `required & granted` is truthy when even one permission overlaps, and equality wrongly fails a user who has extra permissions.'),
      mcq('Why can a Python list not be an element of a set?',
        [['Lists are mutable, so they are unhashable and cannot be elements', true],
          ['Sets may hold only numbers and strings, never any collection', false],
          ['A set may contain at most one element of each different type', false],
          ['Lists are ordered, and a set refuses every ordered data type', false]],
        'A set locates elements by hash, and a value that can change could no longer be found. Tuples are ordered too, and they are allowed because they are immutable.'),
    ],
    checkpoint: [
      mcq("`enrolled = {'A1', 'A2', 'A3'}` and `present = {'A2', 'A3', 'A4'}`. Which expression gives the students who are enrolled but absent?",
        [['`enrolled - present`', true],
          ['`present - enrolled`', false],
          ['`enrolled & present`', false],
          ['`enrolled ^ present`', false]],
        'Enrolled and not present is a difference, here {"A1"}. The reverse difference gives A4, a visitor who is not enrolled, and ^ mixes both groups.', S),
      mcq('A page checks `if needed <= granted:`. When `needed` is `set()`, because the page requires nothing, the condition is:',
        [['True, since no required permission can be missing', true],
          ['False, because an empty set is a falsy value', false],
          ['An error, because empty sets cannot be compared', false],
          ['True only when granted is also an empty set', false]],
        '"Every element of needed is in granted" has no element to break it, so it is vacuously true. Falsiness only matters when the set itself is used as a condition.', L),
      mcq('`s = {10, 20, 30}`. The code runs `s.discard(40)` and then `s.remove(40)`. What happens?',
        [['discard does nothing, and then remove raises a KeyError', true],
          ['Both calls do nothing, since 40 is not in the set', false],
          ['Both calls raise a KeyError, since 40 is missing', false],
          ['discard raises a KeyError, and remove does nothing', false]],
        'discard tolerates a missing element and remove does not. The choice between them decides whether absence is treated as normal or as an error.', S),
    ],
  },
  {
    unitCode: 'T_LOGIC_MATH_PRACTICE',
    notes: `No new ideas here. Everything uses propositions, connectives, implication, equivalences,
sets and their operations, and Python sets, and nothing beyond them.

**The method for a logic problem:**

1. **Name the atomic propositions**, each with a precise meaning: p = "the order total is over 500
   rupees", not p = "big order".
2. **Translate phrase by phrase** using the table below, and bracket as you go.
3. **Decide what the question wants**: a truth value, an equivalent form, a negation, or the cases
   in which the statement fails.
4. **Check** with a truth table when there are three letters or fewer, or with specific cases when
   there are more.

**Phrases into formal logic:**

| English | Formal |
|---|---|
| p but q | p ∧ q |
| neither p nor q | ¬p ∧ ¬q |
| if p then q; q whenever p | p → q |
| p only if q; q is necessary for p | p → q |
| p unless q | ¬q → p, which is equivalent to p ∨ q |
| p if and only if q | p ↔ q |

**The method for a set problem:**

1. **Write down U**, and each set in roster form if it is small.
2. **Draw the Venn regions**, and when counting, fill in the innermost overlap first.
3. **Count with** |A ∪ B| = |A| + |B| − |A ∩ B|, and "neither" = |U| − |A ∪ B|.
4. **Translate back to membership** when unsure: A − B is x ∈ A ∧ x ∉ B.

**The checklist that catches most lost marks:**

- Is every "or" inclusive, or does the context demand exclusive or?
- Did a negated comparison keep its boundary, so that "not greater than" became ≤?
- Did a negated "and" become an "or", and a negated "every" become "some ... not"?
- Is an implication being confused with its converse?
- Are vacuous cases handled deliberately: an empty set, or a hypothesis that never holds?
- In a count, has the overlap been subtracted exactly once?
- In code, is \`set()\` used for an empty set, and is the result sorted before it is displayed?`,
    mcqs: [
      mcq('"The account is locked unless the password is correct." With l = "the account is locked" and c = "the password is correct", this is:',
        [['¬c → l', true],
          ['c → ¬l', false],
          ['l → c', false],
          ['l ∧ c', false]],
        '"p unless q" means that if q fails, p holds. The sentence does not say what happens when the password is correct, so c → ¬l adds a claim it never made.'),
      mcq('Of 50 applicants, 30 know Python, 24 know SQL and 6 know neither. How many know both?',
        [['10', true],
          ['4', false],
          ['16', false],
          ['6', false]],
        '44 know at least one, so 30 + 24 − |both| = 44 and both = 10. Check the regions: 20 Python only, 14 SQL only, 10 both and 6 neither add up to 50.'),
      mcq('For x in {1, 2, ..., 12}, the statement "if x is even, then x > 8" is false exactly for:',
        [['{2, 4, 6, 8}', true],
          ['{10, 12}', false],
          ['{1, 3, 5, 7}', false],
          ['{9, 11}', false]],
        'An implication is false only when the hypothesis holds and the conclusion fails: x even and x ≤ 8. For every odd x it is vacuously true.'),
      mcq('A form must reject a submission when the email is empty or the age is under 18. Which Python condition accepts exactly the valid ones?',
        [["`email != '' and age >= 18`", true],
          ["`email != '' or age >= 18`", false],
          ["`email == '' and age < 18`", false],
          ["`email != '' and age > 18`", false]],
        'Accepting is the negation of rejecting, and De Morgan turns the negated "or" into an "and". The last option wrongly rejects a student who is exactly 18.'),
      mcq('How many elements does `{n % 4 for n in range(10)}` contain?',
        [['4', true],
          ['10', false],
          ['3', false],
          ['9', false]],
        'The remainders on division by 4 cycle through 0, 1, 2 and 3, and the set keeps each once. Ten is the number of inputs, not of distinct results.'),
    ],
    checkpoint: [
      mcq('"A discount applies only if the order is over 500 rupees." An order of 800 rupees received no discount. Was the rule broken?',
        [['No; the rule is "discount → over 500", and that still holds', true],
          ['Yes, because an order over 500 must always receive a discount', false],
          ['Yes, because the converse "over 500 → discount" is false here', false],
          ['It cannot be decided until an order under 500 is checked too', false]],
        '"Only if" gives discount → over 500. The rule is broken only by a discount on a small order; demanding a discount for large orders assumes the converse.', L),
      mcq('U = {1, 2, ..., 10}, A = {x : x is odd} and B = {x : x ≤ 4}. What is |A ∩ B′|?',
        [['3', true],
          ['2', false],
          ['5', false],
          ['7', false]],
        'B′ = {5, 6, 7, 8, 9, 10}, and its odd elements are 5, 7 and 9. Two is |A ∩ B|, the odd numbers up to 4.', S),
      mcq('Which is the correct negation of "every order was shipped and paid for"?',
        [['At least one order was not shipped or was not paid for', true],
          ['Every order was neither shipped nor paid for by anyone', false],
          ['At least one order was not shipped and not paid for', false],
          ['No order was shipped, although every order was paid for', false]],
        'Negating "every" gives "at least one ... not", and negating "shipped and paid" gives "not shipped or not paid". The third option forgot to flip the "and".', L),
    ],
  },
  {
    unitCode: 'T_LOGIC_MATH_MINI_PROJECT',
    notes: `Every unit so far handed you statements that were already precise. Real requirements never
are. This project takes an untidy policy of the kind a college office actually writes, turns it
into formal logic and sets, and then checks that the formal version answers the questions the
policy was written to answer.

**Why this is a project and not another exercise.** Translation is where the real errors live. An
"or" meant exclusively, an "unless" read as "if and only if", a "regardless of" whose reach is
unclear: none of these is a calculation mistake, and no practice question can surface them,
because a practice question has already decided what the English means. Here you decide, and you
have to defend the decision.

**How to work:**

1. **Read the policy sentence by sentence** and mark every connective word: and, or, but, unless,
   only if, regardless, no.
2. **Name atomic propositions before writing any formula**, each with a precise test. "Income below
   8 lakh" must say what happens at exactly 8 lakh.
3. **Record ambiguities as you meet them.** Where the English allows two readings, write both
   formulas, choose one, and say why.
4. **Simplify step by step**, naming the equivalence used at each step, so that a reader can check
   every line.
5. **Check against data.** Compute the eligible students twice, once with set operations and once
   by evaluating your formula for each student, and investigate every disagreement. A disagreement
   means one of the two translations is wrong.
6. **Test the edges**: values exactly on a boundary, and students for whom a rule is satisfied only
   vacuously.

**What good looks like.** A formal statement a stranger could apply without reading the original
English; ambiguities that are named rather than silently resolved; simplification steps that each
cite a law; and evidence, in the form of two independent computations that agree, that the formal
statement means what you claim it means.

The brief, requirements and rubric are in the assignment attached to this unit.`,
    assignment: {
      title: 'Mini Project — Formalise a Scholarship Policy',
      description: 'Turn an ambiguous scholarship policy into atomic propositions, formulas and set expressions, resolve its ambiguities explicitly, and verify the result against twelve applicant records with two independent Python computations.',
      instructions: `**The scenario**

A college scholarship office has circulated this policy for its Merit-cum-Means scholarship:

> Students are eligible if they are in first or second year and their family income is below 8 lakh, unless they already hold another government scholarship. Students with a CGPA of 9 or above are also eligible regardless of year, but only if they have no pending disciplinary action. No student may be awarded the scholarship without an income certificate on file.

The office holds these records for twelve applicants (family income in lakh per year):

| ID | Year | Income | CGPA | Other government scholarship | Disciplinary action pending | Certificate on file |
|---|---|---|---|---|---|---|
| S01 | 1 | 6.5 | 8.2 | No | No | Yes |
| S02 | 2 | 9.0 | 9.3 | No | No | Yes |
| S03 | 3 | 4.0 | 9.1 | No | No | Yes |
| S04 | 1 | 7.9 | 7.5 | Yes | No | Yes |
| S05 | 3 | 5.0 | 8.8 | No | No | Yes |
| S06 | 2 | 3.2 | 9.6 | No | Yes | Yes |
| S07 | 4 | 11.0 | 9.4 | Yes | No | Yes |
| S08 | 1 | 8.0 | 8.0 | No | No | Yes |
| S09 | 2 | 2.5 | 6.9 | No | No | No |
| S10 | 4 | 6.0 | 9.0 | No | No | Yes |
| S11 | 1 | 5.5 | 9.2 | No | Yes | Yes |
| S12 | 3 | 12.5 | 7.1 | No | No | Yes |

**Requirements**

1. **Atomic propositions.** Define at least six atomic propositions, for example y = "the student is in first or second year". Give each a precise test that settles boundary values such as an income of exactly 8 lakh or a CGPA of exactly 9.0.
2. **Formalisation.** Write each of the three sentences as a formula. For every ambiguity you find, give each reading as its own formula and state which you adopt and why. At minimum address: what "unless" means in sentence 1; whether "regardless of year" also waives the income limit and the other-scholarship condition; whether the disciplinary condition applies to sentence 1 as well; and whether the certificate rule is a condition of eligibility or only of award.
3. **One formula.** Combine your chosen readings into a single formula A for "may be awarded the scholarship". Simplify it in at least three steps, naming the law used at each step, such as De Morgan, the contrapositive, or p → q ≡ ¬p ∨ q.
4. **Sets.** Let U be the twelve applicants. Define one set for each atomic proposition, write the set of students who may be awarded as a set expression using union, intersection, difference and complement, and list its elements. Use inclusion–exclusion at least once to verify a count taken from the table.
5. **Two independent checks.** Write a short Python program that (a) builds your sets from the table and evaluates your set expression, and (b) separately evaluates formula A for each student using and, or and not. Both parts must print the same list of IDs.
6. **Answer the office's questions.** (a) Which applicants may be awarded the scholarship? (b) Under each reading of "regardless of year" you considered, may S07 be awarded it, and why? (c) State the contrapositive of the certificate rule as a check the office can run on its final award list. (d) Write the negation of A in plain English, as a rejection letter would state it.

**Testing and evidence**

Show the printed output of both computations in requirement 5. Include a truth table or an exhaustive case check for at least one simplification step. Explain the outcome for S08, whose income is exactly 8 lakh, and for S10, whose CGPA is exactly 9.0.

**What to submit**

1. A document containing the atomic propositions, the formulas for every reading, your ambiguity notes, the simplification steps, the set expressions, and your answers to requirement 6.
2. The Python program together with its output.
3. A short reflection of 150-250 words: which sentence of the policy was hardest to formalise, and how you would ask the office to rewrite it.`,
      rubric: [
        { criterion: 'Atomic propositions and boundaries', description: 'At least six atomic propositions, each with a test that settles the exact-boundary cases; S08 and S10 are handled consistently with those tests.', maxPoints: 15 },
        { criterion: 'Formalisation and ambiguities', description: 'Each sentence is formalised correctly; unless, regardless of year, the reach of the disciplinary condition and the certificate rule are each given as alternative formulas with a justified choice.', maxPoints: 25 },
        { criterion: 'Simplification', description: 'A single formula is simplified in at least three steps, every step names a valid law, and at least one step is verified by a truth table or exhaustive case check.', maxPoints: 20 },
        { criterion: 'Sets and computational check', description: 'Sets and a correct set expression match the formula; inclusion–exclusion is used correctly; the Python set computation and the per-student formula agree and their output is shown.', maxPoints: 25 },
        { criterion: 'Answers and reflection', description: 'The award list, both S07 answers, the contrapositive check and the plain-English negation are correct under the stated readings; the reflection identifies a genuine ambiguity and a precise rewrite.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
  },
  /* ── T_RELATIONS ────────────────────────────────────────────────────────── */
  {
    unitCode: 'T_RELATIONS_ORDERED_PAIRS',
    notes: `An ordered pair (a, b) is two objects in a fixed order: a first component and a second.
Unlike a set, order matters and repeats are allowed.

- (2, 5) ≠ (5, 2), whereas {2, 5} = {5, 2}.
- (3, 3) is a perfectly good ordered pair, whereas {3, 3} is just {3}.
- (a, b) = (c, d) exactly when a = c and b = d. So (x + 1, 4) = (3, y − 2) forces x = 2 and y = 6.

Coordinates are the familiar example: the point (2, 5) is not the point (5, 2).

**The Cartesian product.** A × B is the set of all ordered pairs whose first component comes from A
and whose second comes from B: A × B = {(a, b) : a ∈ A and b ∈ B}. With A = {1, 2} and
B = {x, y, z}:

    A × B = {(1, x), (1, y), (1, z), (2, x), (2, y), (2, z)}

**Sizes multiply.** |A × B| = |A| × |B|, here 2 × 3 = 6: for each of the 2 choices of first
component there are 3 choices of second. The common mistake is to add the sizes, which counts the
ingredients rather than the combinations.

**Order matters here too.** B × A contains (x, 1) rather than (1, x), so A × B ≠ B × A unless
A = B or one of the sets is empty. The two products do have the same size.

**Squares, triples and the empty set.** A × A is written A², and R × R is the coordinate plane.
Ordered triples come from A × B × C, with |A × B × C| = |A| × |B| × |C|; for example
{0, 1} × {0, 1} × {0, 1} is the 8 possible 3-bit strings. A × ∅ = ∅, since there is no second
component to choose.

**Where products appear in computing.**

- A product catalogue: sizes {S, M, L, XL} × colours {black, white, navy} gives 12 variants.
- A database row is a tuple, and a table whose columns take values from D1, D2 and D3 holds a
  subset of D1 × D2 × D3.

Nested loops enumerate a product, which is why their cost multiplies, as T_LOOPS_NESTED_LOOPS
showed:

    pairs = [(r, c) for r in range(2) for c in range(3)]
    # [(0, 0), (0, 1), (0, 2), (1, 0), (1, 1), (1, 2)]

\`itertools.product(A, B)\` produces the same pairs. Python tuples are ordered, so
\`(2, 5) == (5, 2)\` is \`False\`.

**Why it matters.** Relations and functions, the rest of this topic, are defined as sets of ordered
pairs, which means as subsets of a product. Getting the product right is getting their universe
right.`,
    mcqs: [
      mcq('A = {1, 2, 3} and B = {p, q}. How many elements does A × B have?',
        [['6', true],
          ['5', false],
          ['9', false],
          ['8', false]],
        'Each of the 3 first components pairs with each of the 2 second components, giving 3 × 2 = 6. Adding the sizes gives 5, which counts the sets, not the pairs.'),
      mcq('Which statement about pairs and sets is true?',
        [['(2, 5) ≠ (5, 2), although {2, 5} = {5, 2}', true],
          ['(2, 5) = (5, 2), just as {2, 5} = {5, 2}', false],
          ['(2, 5) and {2, 5} are two notations for one object', false],
          ['(2, 2) is not valid, as a pair cannot repeat a value', false]],
        'Order is the defining feature of an ordered pair and is ignored by a set. Repeats are allowed in a pair, so (2, 2) is valid.'),
      mcq('The equation (x + 1, 4) = (3, y − 2) holds exactly when:',
        [['x = 2 and y = 6', true],
          ['x = 3 and y = 4', false],
          ['x = 2 and y = 2', false],
          ['x = 4 and y = 6', false]],
        'Pairs are equal when their first components match and their second components match: x + 1 = 3 and 4 = y − 2.'),
      mcq('A shop sells T-shirts in sizes {S, M, L, XL} and colours {black, white, navy}. The list of every size-and-colour variant is best modelled as:',
        [['The product Sizes × Colours, with 12 pairs', true],
          ['The union Sizes ∪ Colours, with 7 items', false],
          ['The intersection of the two sets, which is empty', false],
          ['The product Sizes × Colours, with 7 pairs', false]],
        'A variant is one size paired with one colour, which is an element of the product, and there are 4 × 3 of them. The union only lists the options.'),
    ],
    checkpoint: [
      mcq('A = {0, 1}. How many elements does A × A × A have?',
        [['8', true],
          ['6', false],
          ['3', false],
          ['9', false]],
        '2 × 2 × 2 = 8, one triple for each 3-bit string from (0, 0, 0) to (1, 1, 1).'),
      mcq('For two different non-empty sets A and B, the products A × B and B × A are:',
        [['Different sets of the same size, as their pairs are reversed', true],
          ['The same set, because a product does not depend on its order', false],
          ['Different sets, of sizes |A| + |B| and |B| + |A| respectively', false],
          ['The same set, provided that A and B have the same cardinality', false]],
        'Every pair in A × B has its components the other way round in B × A, and both have |A| × |B| elements. Equal sizes of A and B do not make the pairs equal.'),
      mcq('`[(r, c) for r in range(2) for c in range(3)]` produces how many pairs, and which pair comes second?',
        [['6 pairs, and the second is (0, 1)', true],
          ['6 pairs, and the second is (1, 0)', false],
          ['5 pairs, and the second is (0, 1)', false],
          ['9 pairs, and the second is (1, 1)', false]],
        'It enumerates {0, 1} × {0, 1, 2}, with the inner loop over c running fully for each r. So (0, 0) is followed by (0, 1), not (1, 0).'),
    ],
  },
  {
    unitCode: 'T_RELATIONS_RELATIONS',
    notes: `A **relation from A to B** is any subset R of A × B. If (a, b) ∈ R we say a is related to
b, and write a R b. A **relation on A** is a subset of A × A.

The definition is deliberately broad. A relation need not follow a formula, need not involve every
element, and can even be empty. Any set of pairs is a relation.

**Examples.**

- Students to courses: "is enrolled in". The pair (Asha, DBMS) is in R if Asha takes DBMS.
- On A = {1, 2, 3, 4}, "a < b" is {(1, 2), (1, 3), (1, 4), (2, 3), (2, 4), (3, 4)}: six of the
  sixteen pairs in A × A.
- On the same A, "a divides b" is {(1, 1), (1, 2), (1, 3), (1, 4), (2, 2), (2, 4), (3, 3), (4, 4)}.

**Four ways to show a relation.**

1. **A set of pairs**, as above.
2. **An arrow diagram**: A on the left, B on the right, and an arrow for each pair.
3. **A 0/1 matrix**: one row for each element of A, one column for each element of B, and a 1
   where the pair is in R.
4. **A directed graph**, for a relation on one set: a node per element and an arrow from a to b for
   each pair. A pair (a, a) is drawn as a loop.

For "is enrolled in", with students Asha and Ben and courses DBMS, Maths and OS:

            DBMS  Maths  OS
    Asha      1     1     0
    Ben       0     1     1

**Domain and range.** The domain of R is the set of first components that actually appear, and the
range is the set of second components that appear. B itself is the codomain. Here the range is all
three courses; had nobody taken OS, it would be only {DBMS, Maths}.

**The inverse relation** reverses every pair: R⁻¹ = {(b, a) : (a, b) ∈ R}. The inverse of "is
enrolled in" is "has as a student", and the inverse of < is >.

**Counting relations.** A × B has |A| × |B| pairs and each is either in R or not, so there are
2^(|A| × |B|) relations from A to B. From a 2-element set to a 3-element set, that is 2^6 = 64.

**The misconception** is that a relation must be a rule, or must pair every element with something.
"Is enrolled in" is still a relation when one student takes no courses, and the empty set of pairs
is a valid relation.

**Why it matters.** A link table such as enrolments(student_id, course_id) is a relation stored
literally as its set of pairs. Friendships, followers, prerequisites and permissions are all
relations, and the matrix and graph pictures are how programs store them.`,
    mcqs: [
      mcq('On A = {1, 2, 3, 4, 5}, how many ordered pairs are in the relation "a < b"?',
        [['10', true],
          ['20', false],
          ['25', false],
          ['15', false]],
        'Each pair of distinct numbers appears once, smaller first: 4 + 3 + 2 + 1 = 10. Fifteen would also count the five pairs (a, a), which belong to ≤.'),
      mcq('Which set of pairs is a relation from A = {1, 2} to B = {x, y}?',
        [['{(1, y), (2, y)}', true],
          ['{(x, 1), (y, 2)}', false],
          ['{(1, 2), (x, y)}', false],
          ['{1, 2, x, y}', false]],
        'Every pair has its first component from A and its second from B, so it is a subset of A × B. The second option is a relation from B to A, and the last is not a set of pairs.'),
      mcq('R = {(1, a), (2, b), (2, c)}. What is the inverse relation R⁻¹?',
        [['{(a, 1), (b, 2), (c, 2)}', true],
          ['{(1, a), (2, b), (2, c)}', false],
          ['{(a, 1), (b, 2)}', false],
          ['{(2, a), (1, b), (1, c)}', false]],
        'The inverse reverses every pair and keeps all of them. Dropping (c, 2) because 2 repeats confuses relations with functions.'),
      mcq('How many different relations are there from a 2-element set to a 3-element set?',
        [['64', true],
          ['6', false],
          ['8', false],
          ['9', false]],
        'The product has 6 pairs and a relation is any subset of them, so there are 2^6 = 64. Six is the number of pairs, not of relations.'),
    ],
    checkpoint: [
      mcq('How many pairs does the relation "a divides b" contain on the set {1, 2, 3, 6}?',
        [['9', true],
          ['4', false],
          ['8', false],
          ['16', false]],
        '1 divides all four numbers, 2 divides 2 and 6, 3 divides 3 and 6, and 6 divides 6: 4 + 2 + 2 + 1 = 9. Forgetting that each number divides itself gives far fewer.'),
      mcq('An enrolments table has the columns student_id and course_id, with one row per enrolment. Mathematically the table is:',
        [['A relation from Students to Courses, a subset of their product', true],
          ['A function, since each student is mapped to exactly one course', false],
          ['The whole product Students × Courses, pairing students and courses', false],
          ['A set of students, with the courses stored as extra information', false]],
        'Each row is one pair and the table holds only the pairs that occur. A student with three courses appears three times, so it is not a function, and it is not all of the product.'),
      mcq('In the 0/1 matrix of a relation from A = {a, b, c} to B = {1, 2}, with rows for A and columns for B, a 1 in row b and column 2 means:',
        [['The pair (b, 2) is in the relation', true],
          ['The pair (2, b) is in the relation', false],
          ['b is related to every element of B', false],
          ['b is related to the number 2 twice', false]],
        'Rows give the first component and columns the second. A set of pairs cannot contain the same pair twice, so a 1 records membership and nothing more.'),
    ],
  },
  {
    unitCode: 'T_RELATIONS_PROPERTIES',
    notes: `A relation on a single set A can have properties that decide how it behaves. Three matter
most.

- **Reflexive**: every element is related to itself. For every a in A, (a, a) ∈ R.
- **Symmetric**: whenever (a, b) ∈ R, also (b, a) ∈ R.
- **Transitive**: whenever (a, b) ∈ R and (b, c) ∈ R, also (a, c) ∈ R.

Each property is an implication, so one counterexample breaks it, and a relation with no chains
(a, b), (b, c) at all is transitive vacuously.

**Familiar relations, checked:**

| Relation | Reflexive | Symmetric | Transitive |
|---|---|---|---|
| = on numbers | yes | yes | yes |
| ≤ on integers | yes | no | yes |
| < on integers | no | no | yes |
| divides, on positive integers | yes | no | yes |
| is a friend of | no | yes | no |
| same remainder on division by 3 | yes | yes | yes |

A person is not usually counted as their own friend, friendship is mutual, and a friend of your
friend need not be your friend.

**Antisymmetric** is a fourth property: if (a, b) and (b, a) are both in R, then a = b. ≤ and
"divides" on the positive integers are antisymmetric. It is not the opposite of symmetric: = is
both symmetric and antisymmetric.

**In the 0/1 matrix** of a relation on A, reflexive means every entry on the main diagonal is 1,
and symmetric means the matrix is a mirror image of itself across that diagonal.

**Checking a finite relation.** On A = {1, 2, 3}, take R = {(1, 1), (2, 2), (3, 3), (1, 2), (2, 1)}.
It is reflexive, since all three loops are present. It is symmetric, since (1, 2) and (2, 1) come
together. For transitivity, take each pair (a, b) and every pair starting with b: (1, 2) then (2, 1)
needs (1, 1), which is present; (2, 1) then (1, 2) needs (2, 2), also present; chains through a
loop only give back a pair already there. So R is transitive.

**Equivalence relations.** A relation that is reflexive, symmetric and transitive is an
**equivalence relation**. It splits A into non-overlapping **equivalence classes** of mutually
related elements. The R above has the classes {1, 2} and {3}. "Same remainder on division by 3"
splits the integers into three classes, for remainders 0, 1 and 2.

**The misconception** is that symmetric and transitive together force reflexive, "because (a, b)
and (b, a) give (a, a)". That argument needs some b related to a. On A = {1, 2}, R = {(1, 1)} is
symmetric and transitive but not reflexive, because 2 is related to nothing.

**Why it matters in code.** An equality you define for your own objects must be an equivalence
relation, or sets and dictionaries misbehave. A sort comparator must be transitive, or no consistent
order exists. "Within 0.1 of each other" is not transitive: 1.00 is within 0.1 of 1.08, and 1.08 of
1.16, but 1.00 is not within 0.1 of 1.16, so grouping readings that way gives results that depend on
the order in which they are processed.`,
    mcqs: [
      mcq('On A = {1, 2, 3}, R = {(1, 1), (2, 2), (3, 3), (1, 2)}. Which properties does R have?',
        [['Reflexive and transitive, but not symmetric', true],
          ['Reflexive and symmetric, but not transitive', false],
          ['Symmetric and transitive, but not reflexive', false],
          ['All three, so it is an equivalence relation', false]],
        'All loops are present, (1, 2) lacks its reverse (2, 1), and every chain, such as (1, 1) then (1, 2), gives a pair already in R.'),
      mcq('The relation "x and y differ by at most 1" on the integers fails which property?',
        [['Transitive', true],
          ['Reflexive', false],
          ['Symmetric', false],
          ['None; it has all three properties', false]],
        '1 is related to 2 and 2 to 3, but 1 and 3 differ by 2. Every number differs from itself by 0, and the difference is the same in both directions.'),
      mcq('"Has the same remainder on division by 3" on {0, 1, 2, ..., 8} splits the set into how many equivalence classes?',
        [['3', true],
          ['9', false],
          ['2', false],
          ['1', false]],
        'The classes are {0, 3, 6}, {1, 4, 7} and {2, 5, 8}, one for each possible remainder.'),
      mcq('Why must the "comes before" relation used by a sorting comparator be transitive?',
        [['Without it, a before b and b before c need not put a before c', true],
          ['Without it, the sort compares every pair twice and runs slower', false],
          ['Without it, equal elements are deleted while the list is sorted', false],
          ['Without it, the sort only works on lists already in order', false]],
        'A sorted order places a before c whenever a is before b and b before c. If the comparator disagrees, no arrangement satisfies it, and the output depends on which comparisons happened.'),
    ],
    checkpoint: [
      mcq('On A = {1, 2, 3}, R = {(1, 2), (2, 1), (1, 1), (2, 2)}. Which property fails?',
        [['Reflexive, because (3, 3) is missing', true],
          ['Symmetric, because (1, 2) comes with (2, 1)', false],
          ['Transitive, because (1, 3) is not in R', false],
          ['None of them; R is an equivalence relation', false]],
        'Reflexive requires a loop at every element of A, including 3. Symmetry and transitivity both hold, and (1, 3) is never required because no pair leads from 1 to 3.'),
      mcq('A student argues: "if R is symmetric and transitive, then (a, b) and (b, a) give (a, a), so R is reflexive". Where does the argument fail?',
        [['An element related to nothing gives no pair to start the argument', true],
          ['Symmetry does not allow (a, b) and (b, a) to be in R at the same time', false],
          ['Transitivity only applies when the three elements are all different', false],
          ['It does not fail, so every symmetric transitive relation is reflexive', false]],
        'The argument assumes some b with (a, b) in R. On {1, 2}, the relation {(1, 1)} is symmetric and transitive, yet 2 has no loop.'),
      mcq('In the 0/1 matrix of a relation on a set, the relation is symmetric exactly when:',
        [['The entry in row i, column j equals the one in row j, column i', true],
          ['Every entry on the main diagonal from the top left is a 1', false],
          ['Every row of the matrix contains at least one entry of 1', false],
          ['The matrix contains the same number of 1s as it has of 0s', false]],
        'Symmetry says (i, j) is present exactly when (j, i) is, which is a mirror image across the diagonal. An all-1 diagonal is the test for reflexive.'),
    ],
  },
  {
    unitCode: 'T_RELATIONS_FUNCTIONS',
    notes: `A **function** f from A to B, written f: A → B, is a relation from A to B in which **every
element of A appears as a first component in exactly one pair**. A is the **domain** and B the
**codomain**, and we write f(a) = b for the pair (a, b).

"Every" and "exactly one" are the two conditions, and a relation can fail either. With A = {1, 2, 3}
and B = {a, b}:

- {(1, a), (2, a), (3, b)} is a function. Two inputs sharing an output is allowed.
- {(1, a), (2, b)} is not a function from A: 3 has no image.
- {(1, a), (1, b), (2, a), (3, a)} is not a function: 1 has two images.

**Familiar failures.** f(x) = 1/x is not a function from the real numbers to the real numbers,
because 0 has no image; restrict the domain to the non-zero reals and it is one. "The square root
of x", meaning both roots, relates 4 to 2 and to −2, so it is not a function until one root is
chosen, which is why √x means the non-negative root. On a graph the **vertical line test** says the
same thing: every vertical line over the domain meets the graph exactly once.

**Codomain and range.** The **range**, or image, is the set of outputs actually produced, and it is
a subset of the codomain. For f: Z → Z with f(n) = 2n, the codomain is all integers but the range is
only the even integers. Nothing requires every element of B to be used; the next unit names the
functions that do use them all.

**Counting.** Each of the |A| inputs independently chooses one of the |B| outputs, so there are
|B|^|A| functions from A to B. From a 3-element set to a 2-element set there are 2^3 = 8.

**Composition.** If f: A → B and g: B → C, then g ∘ f: A → C is defined by (g ∘ f)(x) = g(f(x)),
so f is applied first. With f(x) = x + 1 and g(x) = 2x, (g ∘ f)(3) = g(4) = 8, while
(f ∘ g)(3) = f(6) = 7. The order matters.

**Functions in code.** A Python function is a mathematical function of its arguments only when the
same arguments always give the same result. \`len\` is one. A function that reads the clock, draws a
random number or depends on a changing global variable is not, and that is exactly what makes such
code hard to test. A dictionary is a function on its keys: each key appears once and maps to one
value.

**The misconception** is that a function needs a formula, or must use every value in its codomain.
A function is only a set of pairs that meets the two conditions; a table of roll numbers and names
is as much a function as f(x) = x².`,
    mcqs: [
      mcq('A = {1, 2, 3} and B = {x, y}. Which relation is a function from A to B?',
        [['{(1, x), (2, x), (3, x)}', true],
          ['{(1, x), (2, y)}', false],
          ['{(1, x), (1, y), (2, x), (3, y)}', false],
          ['{(x, 1), (y, 2), (x, 3)}', false]],
        'Every element of A has exactly one image, and sharing the image x is allowed. The others leave 3 without an image, give 1 two images, or run from B to A.'),
      mcq('Why is f(x) = 1/x not a function from the real numbers to the real numbers?',
        [['0 is in the domain, but it has no image', true],
          ['Two different inputs share one output', false],
          ['Some real numbers are never an output', false],
          ['Its outputs are fractions, not integers', false]],
        'A function must give every element of its domain an image. Unused outputs are allowed, and 1/x in fact never repeats an output.'),
      mcq('How many functions are there from a 3-element set to a 2-element set?',
        [['8', true],
          ['9', false],
          ['6', false],
          ['5', false]],
        'Each of the 3 inputs chooses one of 2 outputs, giving 2^3 = 8. Nine is 3^2, the count in the other direction.'),
      mcq('f(x) = x + 1 and g(x) = 2x. What is (g ∘ f)(3)?',
        [['8', true],
          ['7', false],
          ['6', false],
          ['4', false]],
        'Apply f first: f(3) = 4, then g(4) = 8. Seven is (f ∘ g)(3), which applies g first.'),
    ],
    checkpoint: [
      mcq('f: Z → Z is defined by f(n) = 2n. Which statement is true?',
        [['Its codomain is all integers, but its range is only the even ones', true],
          ['Its range and its codomain are both the set of all the integers', false],
          ['It is not a function, because odd integers are never an output', false],
          ['It is not a function, since negative inputs give negative outputs', false]],
        'Every integer has exactly one image, so it is a function. Unused elements of the codomain, such as 3, do not break that.'),
      mcq('A Python function uses a random number and can return different values when called twice with the same argument. As a mathematical function of its argument it:',
        [['Is not one, since one input can be paired with several outputs', true],
          ['Is one, since every input it receives produces some output', false],
          ['Is one, provided every output lies in the same codomain', false],
          ['Is not one, since functions may not produce decimal outputs', false]],
        'A function pairs each input with exactly one output. Producing an output every time is necessary but not enough.'),
      mcq('f = {(1, 4), (2, 5), (3, 4)} is a function from A = {1, 2, 3} to B = {4, 5, 6}. What is its range?',
        [['{4, 5}', true],
          ['{4, 5, 6}', false],
          ['{1, 2, 3}', false],
          ['{5}', false]],
        'The range is the set of outputs that actually occur. {4, 5, 6} is the codomain and {1, 2, 3} is the domain.'),
    ],
  },
  {
    unitCode: 'T_RELATIONS_MAPPINGS',
    notes: `Functions differ in how they use their codomain, and three names describe it. Let f: A → B.

- **Injective** (one-to-one): different inputs always give different outputs. Formally, if
  f(a1) = f(a2) then a1 = a2.
- **Surjective** (onto): every element of B is the output of some input, so the range equals the
  codomain.
- **Bijective**: both. Every element of B is reached exactly once, so the pairs can be reversed to
  give an **inverse function** f⁻¹: B → A.

**Examples on the integers.**

- f(n) = 2n is injective, since 2a = 2b forces a = b, but not surjective: 3 is never an output.
- g(n) = n + 5 is bijective, with inverse g⁻¹(n) = n − 5.
- h(n) = n² is neither: h(2) = h(−2), and 3 is never an output.

Change the sets and the answer changes. x ↦ x² from the non-negative reals to the non-negative
reals is bijective, with the square root as its inverse. **Injective and surjective are properties
of a function together with its domain and codomain**, never of a formula alone.

**Proving each property.** For f(x) = 3x − 2 on the real numbers:

- Injective: assume f(a) = f(b). Then 3a − 2 = 3b − 2, so 3a = 3b and a = b.
- Surjective: take any y. The input x = (y + 2)/3 gives f(x) = (y + 2) − 2 = y.

Checking a few values proves neither, because a failure could sit at a value you did not try.

**Finite sets.** If |A| > |B|, no function from A to B is injective: two inputs must share an
output, which is the pigeonhole principle. If |A| < |B|, none is surjective. If |A| = |B|, a
function is injective exactly when it is surjective. There are 5 × 4 × 3 = 60 injective functions
from a 3-element set to a 5-element set, since each input must avoid the outputs already used.

**Dictionaries as mappings.** A Python dictionary is a function from its keys to its values.
Inverting one is safe only when it is injective:

    grades = {"Asha": "A", "Ravi": "B", "Meena": "A"}
    by_grade = {g: name for name, g in grades.items()}
    # {'A': 'Meena', 'B': 'Ravi'}   and Asha has silently gone

Two keys shared the value "A", so the inverted dictionary kept only the last one written, and no
error was raised.

**Where the properties matter.** Encryption must be injective, or two messages would encrypt to the
same text and decryption could not choose between them. A hash function from every possible file to
a 256-bit value cannot be injective, because there are more files than values, so collisions must
exist. Roll numbers 1 to 60 given to 60 students with no repeats form a bijection, which is what
makes "look up student 17" well defined.

**The misconception** is that "one-to-one" means a perfect pairing. Strictly it means injective
only; a perfect pairing in both directions is a bijection, also called a one-to-one correspondence.`,
    mcqs: [
      mcq('The function f: Z → Z given by f(n) = n + 5 is:',
        [['Bijective, with inverse n − 5', true],
          ['Injective, but not surjective', false],
          ['Surjective, but not injective', false],
          ['Neither injective nor surjective', false]],
        'Different inputs give different outputs, and any integer m is reached from m − 5. Both properties hold, so the function can be reversed.'),
      mcq('`grades = {"Asha": "A", "Ravi": "B", "Meena": "A"}` is inverted with `{g: name for name, g in grades.items()}`. What is the result?',
        [["`{'A': 'Meena', 'B': 'Ravi'}`", true],
          ["`{'A': 'Asha', 'B': 'Ravi'}`", false],
          ["`{'A': ['Asha', 'Meena'], 'B': 'Ravi'}`", false],
          ['A KeyError, because the value A repeats', false]],
        'The mapping is not injective, so two entries compete for the key "A" and the later one overwrites the earlier. Python raises no error and keeps no list.'),
      mcq('A function goes from a set of 10 elements to a set of 7 elements. It cannot be:',
        [['Injective', true],
          ['Surjective', false],
          ['A function at all', false],
          ['Many-to-one', false]],
        'With more inputs than outputs, at least two inputs must share an output. It can still be surjective, and it must be many-to-one.'),
      mcq('To prove that f(x) = 3x − 2 on the real numbers is onto, you should:',
        [['Take any y and show that x = (y + 2)/3 gives f(x) = y', true],
          ['Assume f(a) = f(b) and then show that a = b must follow', false],
          ['Check that f(0), f(1) and f(2) are all different values', false],
          ['Show that f(x) always gets larger as x gets larger too', false]],
        'Onto means every y is reached, so you produce an input for an arbitrary y. Assuming f(a) = f(b) is the proof of one-to-one.'),
    ],
    checkpoint: [
      mcq('The function f(x) = x² from the real numbers to the real numbers is:',
        [['Neither injective nor surjective', true],
          ['Injective, but not surjective', false],
          ['Surjective, but not injective', false],
          ['Bijective, with square root inverse', false]],
        'f(2) = f(−2) breaks injectivity, and no real number squares to −1, so it is not surjective. Restricting both sets to the non-negative reals makes it bijective.'),
      mcq('A hash function maps every possible file to a 256-bit value. Why must two different files sometimes share a hash?',
        [['There are more possible files than hash values, so it cannot be injective', true],
          ['It is surjective, and every surjective function repeats some of its outputs', false],
          ['Hash functions are designed to be random, so they do not need to be injective', false],
          ['Two files of the same size always produce the same hash value as each other', false]],
        'This is the pigeonhole principle: a function into a smaller set must map two inputs to one output. A bijection is surjective and repeats nothing.'),
      mcq('Roll numbers 1 to 60 are given to the 60 students of a class, one each, with no number used twice. As a function from students to {1, ..., 60} this is:',
        [['A bijection, so it can be reversed', true],
          ['Injective only, as some numbers could be unused', false],
          ['Surjective only, as two students could share', false],
          ['Neither, because roll numbers are arbitrary', false]],
        'No repeats makes it injective, and 60 distinct numbers from a set of 60 must use them all, so it is also surjective.'),
    ],
  },
  {
    unitCode: 'T_RELATIONS_PRACTICE',
    notes: `No new ideas. Everything here uses ordered pairs, products, relations and their properties,
functions, and injective, surjective and bijective mappings.

**The method:**

1. **Write down the sets first**, and the relation as an explicit list of pairs if it is small. Most
   errors are made while holding a relation in your head.
2. **Check each property against its definition, element by element**, looking for a
   counterexample:
   - Reflexive: is (a, a) present for every a? Check the diagonal.
   - Symmetric: does every pair have its reverse?
   - Transitive: for each pair (a, b), look at every pair that starts with b and confirm that
     (a, c) is present.
   - Function: does every element of the domain appear as a first component exactly once?
   - Injective: does any output appear twice?
   - Surjective: does every element of the codomain appear as an output?
3. **State the counterexample** when a property fails. "Not transitive, because (1, 2) and (2, 3)
   are present and (1, 3) is not" is an answer; "not transitive" alone is a guess.
4. **For infinite sets, prove rather than sample**: assume f(a) = f(b) for injectivity, and solve
   for an input for surjectivity.

**Counting, for |A| = m and |B| = n:**

| Object | Count |
|---|---|
| pairs in A × B | m × n |
| relations from A to B | 2^(m × n) |
| functions from A to B | n^m |
| injective functions from A to B, when m ≤ n | n × (n − 1) × ... × (n − m + 1) |

**The checklist:**

- Is the relation on one set, or from one set to another? Reflexive only makes sense on one set.
- Was a vacuous case forgotten? A relation with no chains is transitive.
- Is "not symmetric" being confused with "antisymmetric"?
- Has the codomain been stated? Surjectivity depends on it.
- Before inverting a dictionary, has anybody checked that no value repeats?`,
    mcqs: [
      mcq('On {a, b, c}, R = {(a, b), (b, c)}. What is the smallest set of pairs to add so that R becomes transitive?',
        [['{(a, c)}', true],
          ['{(c, a)}', false],
          ['{(a, c), (c, a)}', false],
          ['{(a, a), (b, b), (c, c)}', false]],
        'The only chain is (a, b) then (b, c), which requires (a, c). Adding it creates no new chain, because nothing starts at c.'),
      mcq('How many functions are there from {1, 2} to {p, q, r}?',
        [['9', true],
          ['8', false],
          ['6', false],
          ['5', false]],
        'Each of the 2 inputs chooses one of 3 outputs: 3^2 = 9. Eight is 2^3, the count in the opposite direction.'),
      mcq('Which relation on the set of all people is an equivalence relation?',
        [['"Was born in the same year as"', true],
          ['"Is taller than"', false],
          ['"Is a friend of"', false],
          ['"Lives within 5 km of"', false]],
        'Everyone shares a birth year with themselves, sharing is mutual, and it passes along chains. "Within 5 km" fails transitivity, and "taller than" is not even reflexive.'),
      mcq('f: {1, 2, 3, 4} → {a, b, c} with f = {(1, a), (2, b), (3, c), (4, b)}. f is:',
        [['Surjective, but not injective', true],
          ['Injective, but not surjective', false],
          ['Bijective, so it has an inverse', false],
          ['Not a function from the domain', false]],
        'Every element of {a, b, c} is used, but 2 and 4 share b. With four inputs and three outputs it could never be injective.'),
      mcq('The relation "x ≤ y" on the integers is:',
        [['Reflexive, antisymmetric and transitive, but not symmetric', true],
          ['Reflexive, symmetric and transitive: an equivalence relation', false],
          ['Symmetric and transitive, but neither reflexive nor antisymmetric', false],
          ['Transitive only, exactly like the strict relation x < y', false]],
        '3 ≤ 3 holds, 2 ≤ 5 does not give 5 ≤ 2, and x ≤ y with y ≤ x forces x = y. Unlike <, it is reflexive.'),
    ],
    checkpoint: [
      mcq('On A = {1, 2, 3, 4}, R relates a to b when a + b is even. R is:',
        [['An equivalence relation with classes {1, 3} and {2, 4}', true],
          ['An equivalence relation with classes {1, 2} and {3, 4}', false],
          ['Reflexive and symmetric, but not transitive', false],
          ['Symmetric and transitive, but not reflexive', false]],
        'a + b is even exactly when a and b have the same parity, which is reflexive, symmetric and transitive. The classes are the odd and the even numbers.'),
      mcq('A hostel gives every student exactly one room; some rooms hold two students and a few rooms are empty. As a function from students to rooms, the assignment is:',
        [['Neither injective nor surjective', true],
          ['Injective, but not surjective', false],
          ['Surjective, but not injective', false],
          ['Bijective, since each student has a room', false]],
        'Shared rooms mean two inputs have one output, so it is not injective. Empty rooms are codomain elements never reached, so it is not surjective.'),
      mcq('|A| = 3 and |B| = 5. How many injective functions from A to B are there?',
        [['60', true],
          ['125', false],
          ['15', false],
          ['243', false]],
        'The first input has 5 choices, the second 4 and the third 3: 5 × 4 × 3 = 60. 125 = 5^3 counts all functions, including those that repeat an output.'),
    ],
  },
  /* ── T_MATRICES ─────────────────────────────────────────────────────────── */
  {
    unitCode: 'T_MATRICES_WHAT_IS_A_MATRIX',
    notes: `A matrix is a rectangular grid of numbers arranged in rows and columns. It is the standard
way to hold data that runs in two directions: students and subjects, pixels across and down,
samples and features.

    A = | 2  7  1 |
        | 5  0  3 |

**Dimensions are rows × columns, always in that order.** A has 2 rows and 3 columns, so it is a
2 × 3 matrix, read "two by three", with 6 entries. A 3 × 2 matrix also has 6 entries and is a
different shape.

**Naming an entry.** a_ij is the entry in row i and column j, counting from 1 in mathematics. In A,
a_12 = 7 (row 1, column 2), a_21 = 5 and a_23 = 3. Row first, then column, exactly as for the
dimensions. Programming languages count from 0, which the matrices-in-code unit deals with.

**Special shapes.**

- A **row vector** is 1 × n, such as | 4  1  9 |.
- A **column vector** is n × 1, with one entry in each row.
- A **square matrix** is n × n, and its **main diagonal** runs from a_11 down to a_nn.
- A **zero matrix** has every entry equal to 0.

**Equality.** Two matrices are equal only if they have the same dimensions and every pair of
corresponding entries is equal. [[1, 2], [3, 4]] and [[1, 3], [2, 4]] contain the same four numbers
and are different matrices.

The notation [[1, 2], [3, 4]] lists the rows in order, and these units use it because it matches
how code writes a matrix.

**Matrices in AI and data work.**

- A **dataset** of 1,000 customers with 4 features each (age, income, city code, number of orders)
  is a 1000 × 4 matrix: one row per sample and one column per feature. Libraries such as pandas and
  scikit-learn expect exactly this rows-are-samples layout.
- A **grayscale image** 28 pixels high and 28 wide is a 28 × 28 matrix of brightness values, with
  784 entries. A colour image adds a third direction for red, green and blue.
- The 0/1 matrix of a relation, from T_RELATIONS_RELATIONS, is a matrix too.

**The common mistake** is reading dimensions or subscripts column first. "3 × 4" means three rows,
and a_32 is row 3, column 2. Getting this backwards causes most of the shape errors you will meet in
code.

**Why it matters.** Almost every numerical library works on matrices, and nearly every error it
gives a beginner is about shape. Being able to say what each row and each column means, and how big
each dimension is, is the skill everything else in this topic depends on.`,
    mcqs: [
      mcq('A matrix records the marks of 5 students in 3 subjects, with one row per student. Its dimensions are:',
        [['5 × 3', true],
          ['3 × 5', false],
          ['15 × 1', false],
          ['5 × 5', false]],
        'Dimensions are rows × columns. Five students give five rows and three subjects give three columns.'),
      mcq('In A = [[4, 9, 2], [6, 1, 8]], the entry a_23 is:',
        [['8', true],
          ['2', false],
          ['1', false],
          ['6', false]],
        'a_23 is row 2, column 3. The value 2 is a_13, found by reading the first index as a column.'),
      mcq('A grayscale image is 28 pixels high and 28 pixels wide. As a matrix it has how many entries?',
        [['784', true],
          ['56', false],
          ['28', false],
          ['576', false]],
        'A 28 × 28 matrix has 28 × 28 = 784 entries, one brightness value per pixel. Adding the dimensions gives 56, which counts edges, not pixels.'),
      mcq('Which of these shapes is a column vector?',
        [['4 × 1', true],
          ['1 × 4', false],
          ['4 × 4', false],
          ['1 × 1 only', false]],
        'A column vector has one column and several rows. A 1 × 4 matrix is a row vector.'),
    ],
    checkpoint: [
      mcq('A dataset records age, income, city code and number of orders for each of 1,000 customers, with one row per customer. The matrix is:',
        [['1000 × 4', true],
          ['4 × 1000', false],
          ['1004 × 1', false],
          ['1000 × 1000', false]],
        'Each customer is a row and each of the four features is a column. Rows come first in the dimensions.'),
      mcq('The matrices [[1, 2], [3, 4]] and [[1, 3], [2, 4]] are:',
        [['Not equal, because corresponding entries differ', true],
          ['Equal, because they contain the same four numbers', false],
          ['Equal, because both have the same dimensions', false],
          ['Not comparable, as equality needs 1 × n shapes', false]],
        'Equality needs the same shape and the same value in every position. Here a_12 is 2 in one and 3 in the other.'),
      mcq('A 3 × 5 matrix and a 5 × 3 matrix both have 15 entries. Do they have the same shape?',
        [['No: one has 3 rows and 5 columns, the other 5 rows and 3 columns', true],
          ['Yes, since matrices with the same entry count share one shape', false],
          ['Yes, because a matrix can be turned round to fit either shape', false],
          ['No, because a matrix must always have more rows than columns', false]],
        'Shape is the ordered pair (rows, columns), not the number of entries. Turning a matrix round is the transpose, which produces a different matrix.'),
    ],
  },
  {
    unitCode: 'T_MATRICES_ADDITION',
    notes: `**Adding matrices.** Two matrices can be added only when they have exactly the same
dimensions. The sum is found entry by entry: (A + B)_ij = a_ij + b_ij.

A holds January sales of 3 products in 2 shops, and B holds February's:

    A = | 3  0  5 |      B = | 1  6  2 |
        | 2  4  1 |          | 0  3  7 |

    A + B = | 4  6  7 |
            | 2  7  8 |

Each entry is the two-month total for one shop and one product. Subtraction works the same way:
A − B = [[2, −6, 3], [2, 1, −6]].

**Scaling.** Multiplying a matrix by a number k, called a scalar, multiplies every entry:
(kA)_ij = k × a_ij. So 2A = [[6, 0, 10], [4, 8, 2]]. If every price rises by 10%, the whole price
matrix becomes 1.1 times itself.

**Undefined sums.** A 2 × 3 matrix and a 3 × 2 matrix cannot be added. There is no rule for
padding missing entries with zeros; the sum simply does not exist. NumPy has broadcasting rules that
stretch some shapes to match, which is convenient, and is also why a shape mistake there can give a
wrong answer instead of an error.

**The rules**, all inherited from ordinary numbers because everything happens entry by entry:

- A + B = B + A, and (A + B) + C = A + (B + C)
- A + O = A, where O is the zero matrix of the same size
- k(A + B) = kA + kB, and (k + m)A = kA + mA
- A − B = A + (−1)B

**Weighted combinations.** Scaling and adding together give weighted combinations. If M holds
midterm marks and E end-term marks, both students × subjects, and the final mark is 40% of the
midterm plus 60% of the end-term, then the final-marks matrix is 0.4M + 0.6E, computed for every
student and subject at once. A student with 50 and 80 in a subject gets
0.4 × 50 + 0.6 × 80 = 20 + 48 = 68.

**In AI and image work.** Brightening a grayscale image adds the same amount to every pixel;
blending two images of the same size is 0.5A + 0.5B; and a training step in a neural network
replaces a weight matrix W with W minus a small multiple of a gradient matrix of exactly the same
shape.

**The common mistake** is scaling only part of a matrix, such as its first row, or adding a number
when multiplication was meant. 3A multiplies every entry by 3, while A + 3 is not defined in
mathematics at all, although NumPy will add 3 to every entry.

**Why it matters.** These operations update whole tables of numbers at once, without a loop per
entry, and the dimension check you practise here is the habit that later prevents wrong
multiplications.`,
    mcqs: [
      mcq('[[1, -2], [0, 5]] + [[4, 3], [-1, 2]] equals:',
        [['[[5, 1], [-1, 7]]', true],
          ['[[5, -5], [-1, 7]]', false],
          ['[[4, -6], [0, 10]]', false],
          ['[[5, 1], [1, 7]]', false]],
        'Add position by position: 1 + 4, −2 + 3, 0 + (−1) and 5 + 2. The third option multiplies the entries instead of adding them.'),
      mcq('A is a 2 × 3 matrix and B is a 3 × 2 matrix. The sum A + B is:',
        [['Undefined, since the dimensions differ', true],
          ['A 2 × 3 matrix, using the first shape', false],
          ['A 3 × 3 matrix that covers both shapes', false],
          ['Defined once the gaps are filled with 0', false]],
        'Addition pairs each entry with the entry in the same position, and these shapes have no common positions to pair. Mathematics does not pad with zeros.'),
      mcq('What is 3 × [[2, 0], [-1, 4]]?',
        [['[[6, 0], [-3, 12]]', true],
          ['[[6, 0], [-1, 4]]', false],
          ['[[5, 3], [2, 7]]', false],
          ['[[6, 3], [-3, 12]]', false]],
        'A scalar multiplies every entry. Scaling only the first row, or adding 3, are the two usual slips.'),
      mcq('Final marks are 40% of the midterm matrix M plus 60% of the end-term matrix E, both students × subjects. The final-marks matrix is:',
        [['0.4M + 0.6E', true],
          ['0.4M × 0.6E', false],
          ['(M + E) / 2', false],
          ['0.4(M + 0.6E)', false]],
        'Scale each matrix by its weight and add the results. (M + E) / 2 weights both equally, and the product is not a weighted average at all.'),
    ],
    checkpoint: [
      mcq('A = [[2, 5], [1, 3]] and B = [[4, 1], [0, 2]]. What is 2A − B?',
        [['[[0, 9], [2, 4]]', true],
          ['[[-2, 4], [1, 1]]', false],
          ['[[8, 11], [2, 8]]', false],
          ['[[0, 9], [2, 6]]', false]],
        '2A = [[4, 10], [2, 6]], and subtracting B entry by entry gives [[0, 9], [2, 4]]. The second option is A − B and the third is 2A + B.'),
      mcq('Which property holds for the addition of matrices of the same size?',
        [['A + B = B + A for every such pair', true],
          ['A + B = A only when B is the identity', false],
          ['k(A + B) = kA + B for every scalar k', false],
          ['A + B exists when the entry counts match', false]],
        'Each entry is an ordinary sum, and ordinary sums do not depend on order. The zero matrix, not the identity, leaves A unchanged, and the scalar must multiply both terms.'),
      mcq('Two 2 × 3 matrices hold the units of 3 products sold by 2 shops in January (J) and February (F). Which matrix gives the increase from January to February?',
        [['F − J', true],
          ['J − F', false],
          ['F + J', false],
          ['2F − J', false]],
        'The increase is the later value minus the earlier one, computed for each shop and product. J − F gives the decrease, with every sign reversed.'),
    ],
  },
  {
    unitCode: 'T_MATRICES_MULTIPLICATION',
    notes: `Matrix multiplication is not done entry by entry. It combines **rows of the first matrix with
columns of the second**, and that is why it has a dimension rule and why order matters.

**The dimension rule.** If A is m × n and B is n × p, then AB exists and is m × p. The inner
numbers must match, and the outer numbers give the shape of the result: (2 × 3)(3 × 4) gives a
2 × 4 matrix.

**Each entry is a row times a column.** Entry (i, j) of AB takes row i of A and column j of B,
multiplies corresponding entries and adds. For

    A = | 1  2 |      B = | 5  6 |
        | 3  4 |          | 7  8 |

the entries are 1 × 5 + 2 × 7 = 19, 1 × 6 + 2 × 8 = 22, 3 × 5 + 4 × 7 = 43 and
3 × 6 + 4 × 8 = 50, so AB = [[19, 22], [43, 50]].

**Order matters.** BA = [[5 × 1 + 6 × 3, 5 × 2 + 6 × 4], [7 × 1 + 8 × 3, 7 × 2 + 8 × 4]]
= [[23, 34], [31, 46]], which is not AB. Matrix multiplication is **not commutative**. Often the
reverse product does not even exist: a 2 × 3 times a 3 × 4 is defined, but a 3 × 4 times a 2 × 3 is
not.

**What does hold.** (AB)C = A(BC) and A(B + C) = AB + AC. A chain of products can be grouped
either way, provided the left-to-right order of the matrices is kept.

**Why rows times columns?** Because that is what combining quantities with rates looks like. Q holds
units bought, 2 shops × 3 products, and p holds the prices as a 3 × 1 column:

    Q = | 3  0  5 |      p = | 10 |
        | 2  4  1 |          | 20 |
                             |  5 |

Qp = [[3 × 10 + 0 × 20 + 5 × 5], [2 × 10 + 4 × 20 + 1 × 5]] = [[55], [105]], each shop's total
bill as a 2 × 1 column.

**In a neural network** a layer computes Wx, where W is a weight matrix of size 16 × 64 and x is a
64 × 1 input, giving a 16 × 1 output. An error such as "shapes (16, 64) and (32, 1) not aligned"
means the input has the wrong length.

**The common mistakes.** Multiplying matching entries instead, which is a different operation
called the entrywise or Hadamard product and needs equal shapes; assuming AB = BA; and assuming that
if AB is defined then BA is too.

**Cost.** Multiplying two n × n matrices this way takes about n^3 multiplications, a billion for
n = 1000, which is why hardware built to do many multiplications in parallel matters so much to
machine learning.`,
    mcqs: [
      mcq('A is 3 × 2 and B is 2 × 5. What is the size of the product AB?',
        [['3 × 5', true],
          ['2 × 2', false],
          ['5 × 3', false],
          ['It is undefined', false]],
        'The inner dimensions, 2 and 2, match, and the outer dimensions give the result: 3 rows and 5 columns.'),
      mcq('What is the product [[2, 1], [0, 3]] × [[1, 4], [2, 1]]?',
        [['[[4, 9], [6, 3]]', true],
          ['[[2, 4], [0, 3]]', false],
          ['[[2, 13], [4, 5]]', false],
          ['[[4, 6], [9, 3]]', false]],
        'Row 1 with column 1 is 2 × 1 + 1 × 2 = 4, and with column 2 is 2 × 4 + 1 × 1 = 9; row 2 gives 6 and 3. The second option multiplies entries, and the third is the product in the other order.'),
      mcq('A is 2 × 3 and B is 3 × 4. Which statement is true?',
        [['AB is defined but BA is not', true],
          ['BA is defined but AB is not', false],
          ['Both AB and BA are defined', false],
          ['Neither product is defined', false]],
        'AB needs the 3 columns of A to match the 3 rows of B, which they do. BA needs the 4 columns of B to match the 2 rows of A, which they do not.'),
      mcq('A neural-network layer computes Wx, where W has size 16 × 64. What size must the input column vector x have?',
        [['64 × 1', true],
          ['16 × 1', false],
          ['1 × 64', false],
          ['64 × 16', false]],
        'The columns of W must equal the rows of x, so x has 64 rows and one column. The result Wx is then 16 × 1.'),
    ],
    checkpoint: [
      mcq('What is [[1, 0, 2], [3, 1, 0]] multiplied by the column vector [[4], [1], [2]]?',
        [['[[8], [13]]', true],
          ['[[8, 13]]', false],
          ['[[6], [13]]', false],
          ['[[4], [12]]', false]],
        'A 2 × 3 matrix times a 3 × 1 column gives a 2 × 1 column: 1 × 4 + 0 × 1 + 2 × 2 = 8 and 3 × 4 + 1 × 1 + 0 × 2 = 13. A row vector is the wrong shape.'),
      mcq('A = [[0, 1], [0, 0]] and B = [[0, 0], [1, 0]]. What are AB and BA?',
        [['AB = [[1, 0], [0, 0]] and BA = [[0, 0], [0, 1]], so AB ≠ BA', true],
          ['Both equal [[1, 0], [0, 1]], so here the two products are equal', false],
          ['Both equal the zero matrix, since each has a whole row of zeros', false],
          ['AB = [[0, 0], [0, 1]] and BA = [[1, 0], [0, 0]], so AB ≠ BA', false]],
        'Row 1 of A is (0, 1), and with column 1 of B, (0, 1), it gives 1; every other entry of AB is 0. BA has its only 1 in the bottom right, so the products differ.'),
      mcq('An order matrix Q is 4 × 3 (4 customers, 3 products) and a price vector p is 3 × 1. What does each entry of Qp represent?',
        [['The total amount one customer pays across all the products', true],
          ['The price of one product multiplied by every customer order', false],
          ['The number of units of one product ordered by all customers', false],
          ['The average price paid per product by one of the customers', false]],
        'Qp is 4 × 1, one entry per customer, and each entry adds quantity × price over that customer\'s row. Totals per product would come from combining columns instead.'),
    ],
  },
  {
    unitCode: 'T_MATRICES_TRANSPOSE_IDENTITY',
    notes: `**The transpose.** The transpose of A, written A^T, turns rows into columns:
(A^T)_ij = a_ji. An m × n matrix becomes n × m.

    A = | 1  2  3 |        A^T = | 1  4 |
        | 4  5  6 |              | 2  5 |
                                 | 3  6 |

Row 1 of A, (1, 2, 3), becomes column 1 of A^T. The common mistake is to reshape instead, filling
[[1, 2], [3, 4], [5, 6]] row by row, which has the right dimensions and is the wrong matrix.

**Rules.**

- (A^T)^T = A
- (A + B)^T = A^T + B^T, and (kA)^T = kA^T
- (AB)^T = B^T A^T, with the order reversed

The reversal is forced by the dimensions. If A is 2 × 3 and B is 3 × 4, then AB is 2 × 4 and
(AB)^T is 4 × 2. B^T A^T is (4 × 3)(3 × 2), which is 4 × 2, while A^T B^T would be (3 × 2)(4 × 3),
which is not even defined. With the square matrices A = [[1, 2], [3, 4]] and B = [[5, 6], [7, 8]]
from the previous unit, (AB)^T = [[19, 43], [22, 50]] and B^T A^T = [[19, 43], [22, 50]] too,
whereas A^T B^T = [[23, 31], [34, 46]].

**Symmetric matrices.** A square matrix with A^T = A is **symmetric**: it mirrors itself across the
main diagonal, like [[2, 7], [7, 3]]. The matrix of a symmetric relation from
T_RELATIONS_PROPERTIES is symmetric, and so is a table of distances between cities.

**The identity matrix.** I_n is the n × n matrix with 1s on the main diagonal and 0s everywhere
else:

    I_3 = | 1  0  0 |
          | 0  1  0 |
          | 0  0  1 |

It plays the part of the number 1. For an m × n matrix A, I_m A = A and A I_n = A. The sizes must fit
the dimension rule, which is why a non-square A needs a different identity on each side.

**Inverses, briefly.** A square matrix A has an inverse A⁻¹ when A A⁻¹ = A⁻¹ A = I, so that A⁻¹
undoes whatever A does. Not every square matrix has one: [[1, 2], [2, 4]] does not, because its
second row is twice its first. Computing inverses belongs to a later course.

**In data work.** For a dataset X with one row per sample, of size n × d, X^T is d × n and X^T X is
d × d, with one row and one column per feature; it summarises how the features vary together. For
two column vectors x and y of the same length, x^T y is 1 × 1: their dot product.

**Why it matters.** Transposes appear whenever data has to be turned to fit a multiplication, and
many "shapes not aligned" errors are fixed, correctly or not, with a transpose. Knowing that
(AB)^T reverses the order is what tells you which fix is right.`,
    mcqs: [
      mcq('What is the transpose of [[1, 2, 3], [4, 5, 6]]?',
        [['[[1, 4], [2, 5], [3, 6]]', true],
          ['[[3, 2, 1], [6, 5, 4]]', false],
          ['[[4, 5, 6], [1, 2, 3]]', false],
          ['[[1, 2], [3, 4], [5, 6]]', false]],
        'Each row becomes a column, so (1, 2, 3) becomes the first column. The last option only reshapes the numbers into three rows.'),
      mcq('For any m × n matrix A, the product I_m A equals:',
        [['A itself, unchanged', true],
          ['The identity matrix I_m', false],
          ['A with its diagonal set to 1', false],
          ['A^T, of size n × m', false]],
        'Multiplying by the identity leaves a matrix unchanged, as multiplying by 1 leaves a number unchanged. I_m has the size needed on the left of an m × n matrix.'),
      mcq('The transpose of a product, (AB)^T, equals:',
        [['B^T A^T', true],
          ['A^T B^T', false],
          ['BA', false],
          ['A^T B', false]],
        'The order reverses. For non-square matrices A^T B^T is often not even defined, which is a quick way to remember the rule.'),
      mcq('Which of these matrices is symmetric?',
        [['[[2, 7], [7, 3]]', true],
          ['[[2, 7], [-7, 3]]', false],
          ['[[2, 7], [3, 7]]', false],
          ['[[7, 2], [3, 7]]', false]],
        'A symmetric matrix equals its transpose, so the entry in row 1, column 2 must equal the entry in row 2, column 1.'),
    ],
    checkpoint: [
      mcq('X is a data matrix of size 500 × 8, with 500 samples and 8 features. What is the size of X^T X?',
        [['8 × 8', true],
          ['500 × 500', false],
          ['500 × 8', false],
          ['8 × 500', false]],
        'X^T is 8 × 500, and (8 × 500)(500 × 8) gives 8 × 8, one row and column per feature. X X^T would be 500 × 500.'),
      mcq('A = [[1, 2], [0, 1]]. Is A A^T equal to A^T A?',
        [['No: A A^T = [[5, 2], [2, 1]] but A^T A = [[1, 2], [2, 5]]', true],
          ['Yes: for this A both products are equal to [[5, 2], [2, 5]]', false],
          ['Yes, because a matrix always commutes with its transpose', false],
          ['No, because A A^T is not defined for any 2 × 2 matrix', false]],
        'A^T = [[1, 0], [2, 1]]. Multiplying in each order gives different matrices, which is another case of AB ≠ BA; both results are symmetric, as every such product is.'),
      mcq('Which statement about the identity matrix is correct?',
        [['I_3 is 3 × 3, with 1s on the main diagonal and 0s elsewhere', true],
          ['I_3 is the 3 × 3 matrix in which every single entry is a 1', false],
          ['Multiplying a matrix by I reverses the order of its rows', false],
          ['An identity matrix may be any shape, if its diagonal is 1s', false]],
        'The identity is always square, with 1s only on the diagonal. A matrix of all 1s changes whatever it multiplies.'),
    ],
  },
  {
    unitCode: 'T_MATRICES_IN_CODE',
    notes: `In plain Python a matrix is a list of rows, and each row is a list:

    A = [[2, 7, 1],
         [5, 0, 3]]

    rows = len(A)         # 2
    cols = len(A[0])      # 3
    A[1][2]               # 3, the maths entry a_23

Indices start at 0, so the maths entry a_ij is \`A[i-1][j-1]\`. Row first, then column, as always.

**A matrix of zeros.** Build each row separately:

    Z = [[0] * cols for _ in range(rows)]

Writing \`[[0] * cols] * rows\` repeats one row object, so changing one entry changes it in every
row; T_ARRAYS_DEBUGGING shows that trap in full.

**Addition and transpose** are comprehensions over positions:

    def add(A, B):
        return [[A[i][j] + B[i][j] for j in range(len(A[0]))]
                for i in range(len(A))]

    def transpose(A):
        return [list(row) for row in zip(*A)]

**Multiplication** needs three loops: i over the rows of A, j over the columns of B, and k along row
i of A and down column j of B at the same time, which is exactly why the columns of A must equal the
rows of B.

    def multiply(A, B):
        n = len(B)
        if len(A[0]) != n:
            raise ValueError("columns of A must equal rows of B")
        C = [[0] * len(B[0]) for _ in range(len(A))]
        for i in range(len(A)):
            for j in range(len(B[0])):
                for k in range(n):
                    C[i][j] += A[i][k] * B[k][j]
        return C

**The trap: list operators are not matrix operators.** \`A + B\` on two lists of lists joins them
into one longer list, and \`2 * A\` repeats the rows. Neither raises an error.

**NumPy** is what real work uses, and it is far faster because its loops run in compiled code:

    import numpy as np
    A = np.array([[1, 2], [3, 4]])
    B = np.array([[5, 6], [7, 8]])
    A.shape      # (2, 2)
    A + B        # entrywise sum
    A @ B        # matrix product: [[19, 22], [43, 50]]
    A * B        # ENTRYWISE product: [[5, 12], [21, 32]]
    A.T          # transpose
    np.eye(3)    # the 3 × 3 identity

The one to remember: in NumPy \`*\` multiplies matching entries and \`@\` is matrix multiplication.
Using \`*\` on two square matrices runs without complaint and gives the wrong answer. A mismatched
\`@\` raises a \`ValueError\` naming both shapes, which is a gift: read the shapes and apply the
dimension rule.

**A habit worth building.** Before any multiplication, write the shapes in a comment, such as
\`# (32, 784) @ (784, 1) -> (32, 1)\`, and in code that matters assert them:
\`assert W.shape[1] == x.shape[0]\`.`,
    coding: [MATRIX_PRODUCT_TASK],
    mcqs: [
      mcq('`A = [[1, 2], [3, 4]]` and `B = [[5, 6], [7, 8]]` are plain Python lists. What is `A + B`?',
        [['`[[1, 2], [3, 4], [5, 6], [7, 8]]`', true],
          ['`[[6, 8], [10, 12]]`', false],
          ['`[[19, 22], [43, 50]]`', false],
          ['A TypeError, because lists of lists cannot be added', false]],
        'On lists, + concatenates, so the result is a list of four rows. Entrywise addition needs a loop, a comprehension or NumPy.'),
      mcq('In NumPy, which expression computes the matrix product of two 2 × 2 arrays `A` and `B`?',
        [['`A @ B`', true],
          ['`A * B`', false],
          ['`A + B`', false],
          ['`A ** B`', false]],
        'The @ operator is matrix multiplication. A * B multiplies matching entries, which is a different operation that happens to accept the same shapes.'),
      mcq('`M = [[1, 2, 3], [4, 5, 6]]`. Which expression gives the number of columns?',
        [['`len(M[0])`', true],
          ['`len(M)`', false],
          ['`len(M[1][0])`', false],
          ['`M.columns`', false]],
        'Each row is a list whose length is the number of columns. len(M) counts the rows, and M[1][0] is a number, which has no length.'),
      mcq('With `M = [[1, 2, 3], [4, 5, 6]]`, what does `[list(r) for r in zip(*M)]` return?',
        [['`[[1, 4], [2, 5], [3, 6]]`', true],
          ['`[[1, 2, 3], [4, 5, 6]]`', false],
          ['`[[4, 5, 6], [1, 2, 3]]`', false],
          ['`[[1, 2], [3, 4], [5, 6]]`', false]],
        'zip(*M) passes the rows as separate arguments and groups their first entries, then their second entries, and so on: the columns. That is the transpose.'),
    ],
    checkpoint: [
      mcq('In a triple-loop matrix product with the update `C[i][j] += A[i][k] * B[k][j]`, the loop over k runs over:',
        [['The columns of A, which must equal the rows of B', true],
          ['The rows of A, which must equal the columns of B', false],
          ['The columns of B, which set the width of the result', false],
          ['Every entry of C, from the first to the last one', false]],
        'k is a column index into A and a row index into B, so it walks along a row of A and down a column of B together. That is the dimension rule in code.'),
      mcq('In NumPy, `A.shape` is `(3, 4)` and `B.shape` is `(4, 2)`. What is `(A @ B).T.shape`?',
        [['`(2, 3)`', true],
          ['`(3, 2)`', false],
          ['`(4, 4)`', false],
          ['`(2, 4)`', false]],
        'A @ B is (3, 4)(4, 2), giving (3, 2), and the transpose swaps that to (2, 3).'),
      mcq('NumPy arrays `A` and `B` are both 3 × 3. A student writes `A * B` intending the matrix product. What happens?',
        [['It runs, but multiplies matching entries rather than rows by columns', true],
          ['It raises an error that points the student towards the @ operator', false],
          ['It computes the correct matrix product, exactly as @ would do', false],
          ['It repeats A a total of B times, as multiplying a list would', false]],
        'Equal shapes are valid for the entrywise product, so there is no error to warn the student. This silent wrong answer is why the difference between * and @ matters.'),
    ],
  },
  {
    unitCode: 'T_MATRICES_PRACTICE',
    notes: `No new ideas. Everything here uses dimensions, addition and scaling, multiplication, the
transpose and the identity, and matrices in code.

**The method, every time:**

1. **Write the shape of every matrix** before calculating anything: A is 2 × 3, B is 3 × 3.
2. **Check that the operation is defined.** Addition needs identical shapes. A product needs the
   inner dimensions to match. Work left to right through a chain:
   (2 × 3)(3 × 3)(3 × 1) becomes (2 × 3)(3 × 1), which is 2 × 1.
3. **Predict the shape of the result**, and draw an empty grid of that shape.
4. **Fill it entry by entry.** For a product, cover everything except row i of the left matrix and
   column j of the right, multiply the pairs and add.
5. **Check one entry again**, preferably one with negative numbers, and check any property you can:
   does (AB)^T equal B^T A^T, and does multiplying by I change nothing?

**Checklist of the marks most often lost:**

- Dimensions read as columns × rows.
- An entrywise product written where a matrix product was asked for.
- AB assumed to equal BA, or (A + B)² expanded as A² + 2AB + B², which is only true when AB = BA;
  in general it is A² + AB + BA + B².
- (AB)^T written as A^T B^T.
- A sign dropped when multiplying negative entries.
- In code, \`*\` used instead of \`@\` in NumPy, or \`+\` on nested lists expected to add entries.`,
    mcqs: [
      mcq('A is 2 × 3, B is 3 × 3 and C is 3 × 1. Which expression is defined?',
        [['ABC, giving a 2 × 1 result', true],
          ['CBA, giving a 1 × 3 result', false],
          ['A + B, giving a 3 × 3 result', false],
          ['BA, giving a 3 × 3 result', false]],
        '(2 × 3)(3 × 3) is 2 × 3, and (2 × 3)(3 × 1) is 2 × 1. CB would need C to have 3 columns, and A + B needs equal shapes.'),
      mcq('What is the matrix [[1, 2], [3, 4]] multiplied by itself?',
        [['[[7, 10], [15, 22]]', true],
          ['[[1, 4], [9, 16]]', false],
          ['[[2, 4], [6, 8]]', false],
          ['[[7, 10], [15, 20]]', false]],
        'Row 1 with column 1 is 1 + 6 = 7 and with column 2 is 2 + 8 = 10; row 2 gives 3 + 12 = 15 and 6 + 16 = 22. Squaring each entry is the entrywise product.'),
      mcq('Three items cost 40, 25 and 10 rupees. Two customers buy the quantities [2, 0, 5] and [1, 4, 3]. Their bills, from the quantity matrix times the price column, are:',
        [['130 and 170 rupees', true],
          ['120 and 170 rupees', false],
          ['130 and 160 rupees', false],
          ['75 and 75 rupees', false]],
        'Customer 1: 2 × 40 + 0 × 25 + 5 × 10 = 130. Customer 2: 1 × 40 + 4 × 25 + 3 × 10 = 170. 75 is just the sum of the prices.'),
      mcq('Which identity holds for all square matrices A and B of the same size?',
        [['(A + B)^T = A^T + B^T', true],
          ['AB = BA', false],
          ['(AB)^T = A^T B^T', false],
          ['(A + B)² = A² + 2AB + B²', false]],
        'The transpose works entry by entry, so it passes through a sum. The expansion with 2AB needs AB = BA, which fails in general.'),
      mcq('A student multiplies a 2 × 3 matrix by another 2 × 3 matrix and gets a 2 × 3 answer. What went wrong?',
        [['The product is undefined, so the entries were multiplied pairwise', true],
          ['Nothing went wrong; two 2 × 3 matrices multiply to give a 2 × 3', false],
          ['The answer should have been 3 × 2, the transposed shape instead', false],
          ['The answer should have been 4 × 9, multiplying each dimension', false]],
        'The first matrix has 3 columns and the second has 2 rows, so no matrix product exists. A 2 × 3 answer is the sign of an entrywise product.'),
    ],
    checkpoint: [
      mcq('A = [[2, -1], [1, 3]] and x = [[4], [2]]. What is Ax?',
        [['[[6], [10]]', true],
          ['[[10], [10]]', false],
          ['[[6], [7]]', false],
          ['[[6, 10]]', false]],
        'Row 1: 2 × 4 + (−1) × 2 = 6. Row 2: 1 × 4 + 3 × 2 = 10. Dropping the minus sign gives 10 in the first row, and the result must be a column.'),
      mcq('P is 5 × 2, Q is 2 × 7 and R is 7 × 3. What is the size of the transpose (PQR)^T?',
        [['3 × 5', true],
          ['5 × 3', false],
          ['7 × 2', false],
          ['It is undefined', false]],
        'PQ is 5 × 7, and multiplying by R gives 5 × 3. The transpose swaps the dimensions to 3 × 5.'),
      mcq('I is the 2 × 2 identity and A = [[3, 1], [4, 2]]. What is 2I + A?',
        [['[[5, 1], [4, 4]]', true],
          ['[[5, 3], [6, 4]]', false],
          ['[[6, 2], [8, 4]]', false],
          ['[[5, 1], [4, 2]]', false]],
        '2I = [[2, 0], [0, 2]], so only the diagonal entries of A increase by 2. Adding 2 everywhere treats I as a matrix of 1s, and the third option is 2A.'),
    ],
  },
];
