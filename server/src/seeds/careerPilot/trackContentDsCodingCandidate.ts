/**
 * Career-track content, Year-4 placement for Data Science + AI (batch S5):
 *   DS_CODING_ML — coding rounds for data scientists (the habits, three timed rounds, a code-reading checkpoint)
 *   DS_PLACE_FS  — the data-science candidate (resume and portfolio, the capstone defended at panel depth,
 *                  one full interview loop, a judgement checkpoint)
 *
 * Year 3 already had the student write least squares, confusion-matrix metrics and k-means in plain Python. The
 * rounds here are different problems at interview level: a decision stump over several features, cohort conversion
 * from raw records (de-duplicate, join, window), and ROC-AUC with ties plus clipped log loss in O(n log n).
 *
 * Every auto-graded exercise was checked before it shipped: a reference solution (not included here) in Python,
 * standard library only, passed every test with the system interpreter; each was cross-checked on hundreds of random
 * small inputs — the stump against an exact-fraction brute force and scikit-learn's depth-1 tree, the cohorts against
 * a pandas implementation, AUC and log loss against scikit-learn and exact pair counting — and every expected output
 * was checked to have a unique optimum and to sit away from a rounding boundary. Every "what does this print" answer
 * in the notes and questions was run.
 *
 * The capstone numbers in DEFEND_CAPSTONE go past the ones Year 3 quoted (test-period metrics, lift, the fixed
 * cutoff on the shifted mix, coefficients as odds ratios, recalibration); they were produced by re-running the
 * Option A pipeline from trackContentDsCapstone.ts with scikit-learn 1.9.
 *
 * Attribution: DS_CODING_ML is single-skill (ML_CONCEPTS), so its questions name no skill. DS_PLACE_FS is
 * multi-skill (PLACEMENT_READINESS, PORTFOLIO_EVIDENCE, TECHNICAL_EXPLANATION, INTERVIEW_PERFORMANCE): every
 * checkpoint question names one with ck(), within the unit's own skills. Practice mcqs name none.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

const PR = 'PLACEMENT_READINESS';
const PE = 'PORTFOLIO_EVIDENCE';
const TE = 'TECHNICAL_EXPLANATION';
const IP = 'INTERVIEW_PERFORMANCE';

/* Large test inputs are built, not pasted: they exist to catch an O(n²) loop. */
/** 20,000 rows, three integer features; the label follows feature 1 above 600, flipped on every 13th row. */
const stumpBig = (n: number) => `${n} 3\n` + Array.from({ length: n }, (_, i) => {
  const a = (i * 7919) % 1000;
  const b = ((i * 104729) % 997) - 498;
  const c = (i * 31) % 50;
  const label = (a > 600 ? 1 : 0) ^ (i % 13 === 0 ? 1 : 0);
  return `${a} ${b} ${c} ${label}`;
}).join('\n') + '\n';
/** 50,000 scored rows with only 1,000 distinct scores, so ties are everywhere. */
const aucBig = (n: number) => `${n}\n` + Array.from({ length: n }, (_, i) => {
  const k = (i * 7919) % 1000;
  const y = (i * 104729) % 1000 < k ? 1 : 0;
  return `${y} ${(k / 1000).toFixed(3)}`;
}).join('\n') + '\n';

const RUNNER_NOTE = `- **The grader runs Python 3.10 with the standard library only** — no NumPy, pandas or scikit-learn. Read
  from standard input and print exactly the lines asked for; nothing else.`;

export const TRACK_DS_CODING_CANDIDATE_BUNDLES: PilotBundle[] = [
  /* ══ DS_CODING_ML — Coding Rounds for Data Scientists ════════════════════════════════════ */

  /* ── CODING_FOR_DS ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_CODING_ML_CODING_FOR_DS',
    notes: `A data-science coding round is not a software-engineering DSA round with a different title. It usually asks
for one of three things — **implement an algorithm**, **compute a metric**, or **manipulate records** — often with
the instruction "plain Python, no NumPy or pandas", on HackerRank, CodeSignal, a shared editor or a notebook, in
30–45 minutes. Some online assessments add one or two easy-to-medium DSA problems, and the SQL round is separate.
These are the questions interviewers ask about the round itself, with the answers that score.

## Q1. "Why would we ban NumPy and pandas? You'd use them at work."

**Strong answer.** "Because with them the round tests whether I remember an API; without them it tests whether I
understand what the function computes — that \`roc_auc_score\` is a pair count, that \`groupby\` is a dictionary
of lists, that a split threshold is a midpoint. I would use the libraries at work, and I'd still need to know what
they do when their answer looks wrong."

**Follow-up.** "Then write \`value_counts\` for me." — a \`Counter\`, or a \`dict\` with \`get(x, 0) + 1\`, then
\`sorted(..., key=lambda kv: (-kv[1], kv[0]))\` so equal counts come out in a fixed order.

**Trap.** Importing NumPy anyway "just for the mean". The grader may not have it installed, and the interviewer
reads it as not listening.

## Q2. "How do you read the input?"

**Strong answer.** "All of it at once and split on whitespace, then walk an index:"

    import sys
    tok = sys.stdin.read().split()
    n = int(tok[0])
    rows = [(int(tok[1 + 2 * i]), float(tok[2 + 2 * i])) for i in range(n)]

"It does not care whether the numbers come one per line, all on one line, or with blank lines between — the most
common reason a correct solution fails on hidden tests. \`input()\` in a loop is fine for small inputs but slow for
10⁵ lines; \`sys.stdin.readline\` is the middle ground."

## Q3. "Your metric printed 0.12 and the expected output was 0.13. What happened?"

**Strong answer.** "Rounding. \`round()\` and format strings work on the binary value, and an exact half rounds to
the **even** neighbour: \`round(2.5)\` is 2, \`round(3.5)\` is 4, \`round(0.125, 2)\` is 0.12 (0.125 is exactly
representable, so the half-even rule applies), and \`round(2.675, 2)\` is 2.67 because 2.675 is stored as
2.67499999…. I format the output with \`f"{x:.4f}"\` as the problem asks and do not round in the middle of a
calculation."

**Follow-up.** "How do you compare two floats?" — never with \`==\` after arithmetic: \`0.1 + 0.2 == 0.3\` is
False. Compare with a tolerance, \`abs(a - b) < 1e-9\`, or keep counts as integers and divide once at the end.

## Q4. "What does -7 // 2 give in Python?"

**Strong answer.** "-4: floor division rounds toward minus infinity, and \`-7 % 3\` is 2, with the sign of the
divisor. \`int(-7 / 2)\` is -3, which truncates. It matters when you bucket negative values or compute a median
index; I write the intent explicitly."

## Q5. "Sort the users by score, highest first, ties by name."

**Strong answer.** "\`sorted(users, key=lambda u: (-u.score, u.name))\` — one key, a tuple. Python's sort is
**stable**, so a key on score alone keeps equal scores in input order; if the problem says 'ties by name', the
tuple makes that explicit rather than relying on the input order."

**Trap.** \`sorted(x).reverse()\` — \`reverse()\` works in place and returns None, so the variable becomes None.
Use \`sorted(x, reverse=True)\`.

## Q6. "Group the orders by city without pandas."

**Strong answer.** "\`defaultdict(list)\` when I need the rows, \`defaultdict(int)\` or \`Counter\` when I need a
total. \`itertools.groupby\` only groups **adjacent** equal keys — on unsorted input \`'aaba'\` it gives three groups,
a, b, a — so I sort first or use a dictionary."

## Q7. "Here's a bug in your helper — \`def add(x, acc=[])\`. Called twice, what does the second call return?"

**Strong answer.** "\`[1, 2]\` after \`add(1)\` then \`add(2)\`: the default list is created once, when the
function is defined, and shared between calls. Use \`acc=None\` and create the list inside. The same family:
\`[[0] * 3] * 2\` is two references to one row, so setting \`m[0][0] = 9\` changes both rows."

## Q8. "Your sigmoid crashed on a large input."

**Strong answer.** "\`math.exp(1000)\` raises OverflowError, so \`1 / (1 + math.exp(-z))\` crashes for z = -1000.
I branch: for z ≥ 0 use \`1 / (1 + exp(-z))\`; for z < 0 use \`exp(z) / (1 + exp(z))\`. Both are the same function,
and neither exponent is ever positive. Same idea for log loss: clip p to [1e-15, 1 − 1e-15] before \`math.log\`,
because \`math.log(0)\` raises ValueError."

## Q9. "What edge cases do you test for data-science code?"

**Strong answer.** "Empty input or one row; one class only (AUC is undefined, precision has a zero denominator);
ties in scores or distances; all values equal (no split exists); a probability of exactly 0 or 1; duplicate keys;
records out of order; and the largest n for time. I say them aloud before I type, then run two of them."

## Q10. "What's the complexity?"

**Strong answer.** Say it for each part, in the problem's own letters: "kNN prediction is O(n·d) per query plus
O(n log n) for sorting distances — or O(n log k) with a heap. AUC by pair counting is O(P·N); by sorting it is
O(n log n). A decision stump that re-scans the data for each threshold is O(d·n²); sorting each feature once and
sweeping is O(d·n log n)." Interviewers ask this after every problem; have the number ready.`,
    workedExample: `**The problem: "Given order records (city, amount), print each city's median order value, cities in
alphabetical order. Plain Python."**

**1. Clarify before typing (30 seconds).** "Is the median of an even count the mean of the two middle values? Can a
city have zero orders? Are amounts integers? How should I print — two decimals?" Assume: yes, no, integers, two
decimals.

**2. Say the plan.** "Group amounts by city in a dictionary of lists, sort each list, take the middle. O(n log n)
overall, O(n) memory."

**3. Write it.**

    import sys
    from collections import defaultdict

    def median(xs):
        xs = sorted(xs)
        m = len(xs) // 2
        return xs[m] if len(xs) % 2 else (xs[m - 1] + xs[m]) / 2

    def main():
        tok = sys.stdin.read().split()
        n = int(tok[0])
        by_city = defaultdict(list)
        for i in range(n):
            by_city[tok[1 + 2 * i]].append(int(tok[2 + 2 * i]))
        for city in sorted(by_city):
            print(f"{city} {median(by_city[city]):.2f}")

    main()

**4. Test aloud.** Pune 100, 300, 200, 400 → sorted 100 200 300 400, middle two 200 and 300 → 250.00. A city with
one order → that order. The bug interviewers plant here is \`sorted(xs)[len(xs) // 2]\` on its own: for
[5, 1, 4, 2] it returns 4, the upper middle value, not 3.0.

**5. Close.** "Time O(n log n) for the sorts; a selection algorithm would make each median O(n) on average, which
matters only if one city has millions of orders. I kept integers until the final division, so no float error
creeps in before printing."`,
    mcqs: [
      mcq('In Python 3.10, what does `print(round(2.5), round(3.5), round(0.125, 2))` print?', [
        ['2 4 0.12', true],
        ['3 4 0.13', false],
        ['2 3 0.12', false],
        ['3 4 0.12', false],
      ], 'round() sends an exact half to the even neighbour: 2.5 → 2, 3.5 → 4. 0.125 is exactly representable in binary, so it is a true half and rounds to 0.12. Format the final answer as the problem asks rather than rounding mid-calculation.'),
      mcq('A candidate groups amounts with `itertools.groupby(rows, key=lambda r: r[0])` on rows that are not sorted by city. What goes wrong?', [
        ['Only adjacent equal keys are grouped, so a city can appear as several groups', true],
        ['groupby sorts the rows itself first, so the code is slow but still correct', false],
        ['groupby raises a TypeError when its input is a list instead of an iterator', false],
        ['Only the first row of each city is kept and every later row is discarded', false],
      ], 'itertools.groupby starts a new group whenever the key changes, so unsorted input splits a city into fragments. Sort by the key first, or group with a dictionary.'),
      mcq('A sigmoid written as `1 / (1 + math.exp(-z))` is called with z = -1000. What happens?', [
        ['It returns 0.0, the correct limit of the sigmoid for very negative z', false],
        ['It raises OverflowError, because math.exp(1000) is out of range', true],
        ['It returns nan, because the division by infinity is not defined', false],
        ['It returns a tiny positive number of about 1e-434, printed in full', false],
      ], 'math.exp(1000) overflows and Python raises OverflowError rather than returning infinity. A stable sigmoid uses exp(z) / (1 + exp(z)) for negative z, so the exponent is never large and positive.'),
    ],
    checkpoint: [
      mcq('What does this print?\n\n    def add(x, acc=[]):\n        acc.append(x)\n        return acc\n    add(1)\n    print(add(2))', [
        ['[2]', false],
        ['[1, 2]', true],
        ['[2, 1]', false],
        ['None', false],
      ], 'The default list is created once, when the function is defined, and shared by every call that does not pass acc. The fix is acc=None and a new list inside the function.'),
      mcq('An interviewer bans NumPy and asks for value counts sorted by count, highest first, ties broken alphabetically. Which key does that?', [
        ['sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))', true],
        ['sorted(counts.items(), key=lambda kv: kv[1], reverse=True)', false],
        ['sorted(counts.items(), key=lambda kv: (kv[1], kv[0]))[::-1]', false],
        ['sorted(counts, key=counts.get, reverse=True)[0] for each value', false],
      ], 'Negating the count sorts it descending while the name stays ascending, in one stable sort. Sorting by count alone leaves ties in insertion order; reversing a tuple sort also reverses the names.'),
      mcq('A DS round asks for the AUC of a model. Which list of edge cases should the candidate name before coding?', [
        ['Only one class present, tied scores, and a large n for running time', true],
        ['Negative scores, scores above 1, and scores given as percentages', false],
        ['Unsorted input, duplicate row numbers, and labels given as strings', false],
        ['Missing scores, NaN labels, and a model that predicts every class', false],
      ], 'AUC is undefined with one class, ties need half credit, and pair counting is O(P·N), too slow at large n. AUC depends only on the order of scores, so negative or unscaled scores are not a problem.'),
    ],
  },

  /* ── ROUND_FROM_SCRATCH ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_CODING_ML_ROUND_FROM_SCRATCH',
    notes: `"Implement X from scratch" is the most common data-science coding question after metrics. The interviewer
is not checking that you remember a library; they want to see that you know what the algorithm computes, where its
edge cases are, and what it costs. Give yourself **15 minutes a problem**: decide the approach before reading
ours, then compare.

## Problem 1 — The best split on one feature (a decision stump)

*Hours studied and pass (1) / fail (0) for seven students: (1,0) (2,0) (2,1) (3,0) (5,1) (6,1) (7,1). Find the
threshold t that minimises the weighted Gini impurity of the split x ≤ t / x > t.*

**Approach.** Gini of a node with class shares p₀, p₁ is 1 − p₀² − p₁². Candidate thresholds are midpoints between
consecutive **distinct** sorted values — 1.5, 2.5, 4, 5.5, 6.5 here (never between the two 2s). Sort once, sweep left
to right keeping running class counts; the right side's counts are the totals minus the left's.

    xs.sort-and-sweep:
    t = 1.5   left [0]          right [0,1,0,1,1,1]   weighted Gini 0.3810
    t = 2.5   left [0,0,1]      right [0,1,1,1]       0.4048
    t = 4     left [0,0,1,0]    right [1,1,1]         0.2143   ← best
    t = 5.5   left [0,0,1,0,1]  right [1,1]           0.3429
    t = 6.5   left [0,0,1,0,1,1] right [1]            0.4286

The parent's Gini is 0.4898, so the split at 4 removes more than half the impurity: left is 0.375 Gini on 4 rows,
right is pure. (4/7 × 0.375 = 0.2143.)

**Complexity.** O(n log n) for the sort, O(n) for the sweep. Re-counting each side for every threshold is O(n²) —
fine for 7 rows, a timeout at 10⁵.

**Follow-ups.** "Several features?" — the same sweep per feature, O(d·n log n). "Why midpoints?" — any threshold
between two values gives the same split; the midpoint is the convention scikit-learn uses. "Ties in the best
impurity?" — state a rule before coding (first feature, smallest threshold).

## Problem 2 — k-nearest neighbours

*Training points A(1,1)→0, B(2,4)→1, C(4,2)→0, D(5,5)→1, E(3,5)→1, F(0,3)→0. Classify the query (3,3) with k = 3.*

**Approach.** Squared Euclidean distance — no square root needed, because it does not change the order:
B 2, C 2, E 4, A 8, D 8, F 9. The three nearest are B(1), C(0), E(1): majority **1**.

    def knn(train, q, k):
        d = sorted((sum((a - b) ** 2 for a, b in zip(x, q)), label) for x, label in train)
        votes = Counter(label for _, label in d[:k])
        return max(votes, key=lambda c: (votes[c], -c))     # ties → smaller label; say so

**The trap the interviewer is waiting for.** With **k = 4**, the fourth neighbour is a tie at distance 8 between A(0)
and D(1): the vote is 2–2 or 3–1 depending on which you take. State a rule — break distance ties by index, use odd k,
or weight votes by 1/distance — and say that sorting tuples silently broke the tie by label.

**Also say.** Scale the features first (a feature in rupees swamps one in years); prediction costs O(n·d) per query
and O(n log k) with a heap of size k.

## Problem 3 — Logistic regression by gradient descent

*x = [1, 2, 3, 4], y = [0, 0, 1, 1], w = b = 0, learning rate 0.1. Write the update and do one step by hand.*

**Approach.** p = σ(wx + b); for the mean log loss the gradients are ∂w = mean((p − y)·x) and ∂b = mean(p − y).

    def step(w, b, xs, ys, lr):
        p = [sigmoid(w * x + b) for x in xs]
        gw = sum((pi - yi) * xi for pi, yi, xi in zip(p, ys, xs)) / len(xs)
        gb = sum(pi - yi for pi, yi in zip(p, ys)) / len(xs)
        return w - lr * gw, b - lr * gb

At w = b = 0 every p is 0.5, so ∂w = (0.5·1 + 0.5·2 − 0.5·3 − 0.5·4) / 4 = −0.5 and ∂b = 0. After one step
**w = 0.05, b = 0**; after the second, w ≈ 0.0906 and b ≈ −0.0031. The starting log loss is ln 2 ≈ 0.6931.

**Follow-ups.** "Why minus the gradient?" — the gradient points uphill; a sign error makes the loss grow every step.
"This data is perfectly separable — what happens with many steps?" — w grows without bound, because the loss keeps
falling as the probabilities approach 0 and 1; L2 regularisation or early stopping keeps it finite. "Stable
sigmoid?" — branch on the sign of z (see the previous unit).

## Round habit

Name the algorithm's objective, the cost, and the edge cases (ties, one class, constant features) **before**
typing. After typing, run the example by hand and one edge case.`,
    mcqs: [
      mcq('Labels at a node are five 1s and three 0s. What is the node\'s Gini impurity?', [
        ['0.4688', true],
        ['0.6250', false],
        ['0.3750', false],
        ['0.2344', false],
      ], 'Gini = 1 − (5/8)² − (3/8)² = 1 − 0.390625 − 0.140625 = 0.46875. The other values are a class share (0.625, 0.375) or half the impurity.'),
      mcq('For the six training points in the kNN problem and the query (3, 3), why is k = 4 a problem?', [
        ['The fourth neighbour is a distance tie between a class-0 and a class-1 point', true],
        ['With an even k, kNN always returns the smaller class label for every query', false],
        ['Four neighbours always include point F, which is the farthest point from the query', false],
        ['Squared distances change the order once more than three neighbours are used', false],
      ], 'A and D are both at squared distance 8. Taking A gives a 2–2 vote, taking D gives 3–1 for class 1. A stated tie rule, an odd k or distance weighting makes the answer deterministic.'),
      mcq('With x = [1, 2, 3, 4], y = [0, 0, 1, 1], w = b = 0 and learning rate 0.1, what are w and b after one batch gradient-descent step on the mean log loss?', [
        ['w = 0.05 and b = 0', true],
        ['w = −0.05 and b = 0', false],
        ['w = 0.5 and b = 0.05', false],
        ['w = 0.05 and b = 0.05', false],
      ], 'Every p is 0.5, so the gradient for w is mean((p − y)·x) = −0.5 and for b is mean(p − y) = 0. Subtracting 0.1 × −0.5 gives w = 0.05; b stays 0.'),
      mcq('A candidate\'s gradient-descent loop prints a log loss that rises every iteration from 0.693. What is the most likely bug?', [
        ['The update adds the gradient instead of subtracting it', true],
        ['The learning rate is too small for the loss to change', false],
        ['The sigmoid should be replaced by the ReLU function', false],
        ['The bias term must always be updated before the weight term', false],
      ], 'The gradient points in the direction of increasing loss. w += lr * grad climbs it; w -= lr * grad descends. A tiny learning rate would make the loss fall slowly, not rise.'),
      mcq('A from-scratch stump re-counts both sides of the split for every candidate threshold. With n = 100,000 rows and one feature, what is the problem?', [
        ['It is O(n²), about 10¹⁰ steps; sorting once and sweeping is O(n log n)', true],
        ['It gives a different threshold from scikit-learn on the same data', false],
        ['It cannot handle ties in the feature, which a sorted sweep fixes', false],
        ['It uses O(n²) memory, because each threshold stores both sides', false],
      ], 'Each of up to n − 1 thresholds re-scans n rows. Sorting once and moving one row at a time from right to left counts keeps every update O(1); the threshold chosen is the same.'),
    ],
    assignment: {
      title: 'The Best Decision Stump',
      description: 'Sort-and-sweep over every feature: the split with the lowest weighted Gini impurity, its threshold and its class counts, in O(d·n log n).',
      instructions: `A decision stump is a one-split tree. Given n rows with d integer features and a 0/1 label, find the
split "feature j ≤ t goes left, otherwise right" with the **lowest weighted Gini impurity**:

    weighted Gini = (n_left / n) × Gini(left) + (n_right / n) × Gini(right),   Gini = 1 − p₀² − p₁²

Candidate thresholds for a feature are the **midpoints between consecutive distinct values** of that feature.

**Input.** The first line holds n and d (1 ≤ n ≤ 20 000, 1 ≤ d ≤ 5). Each of the next n lines holds d integers
(between −10⁹ and 10⁹) and then the label, 0 or 1.

**Output.** If no feature has two distinct values, print \`no split\`. Otherwise print four lines:

    feature <j, counting from 1> threshold <t with one decimal>
    gini <weighted Gini with four decimals>
    left <count of label 0> <count of label 1>
    right <count of label 0> <count of label 1>

If two splits had exactly the same impurity, the smaller feature number and then the smaller threshold would win;
the tests are built so that the best split is unique.

| Input | Output |
|---|---|
| \`5 3\` / \`10 4 1 1\` / \`20 4 3 1\` / \`30 4 2 0\` / \`40 4 4 0\` / \`50 4 5 0\` | \`feature 1 threshold 25.0\` / \`gini 0.0000\` / \`left 0 2\` / \`right 3 0\` |
| \`6 1\` / \`-5 0\` / \`-2 0\` / \`-2 1\` / \`0 1\` / \`3 1\` / \`3 1\` | \`feature 1 threshold -1.0\` / \`gini 0.2222\` / \`left 2 1\` / \`right 0 3\` |

Requirements:

- O(d·n log n): sort each feature once and sweep. Re-counting both sides for every threshold is O(d·n²) and times
  out on the largest test.
- Never put a threshold between two equal values; a constant feature has no candidate at all.
- Print only the four lines (or \`no split\`), and state the cost in a comment at the top of your code.
${RUNNER_NOTE}`,
      rubric: [
        { criterion: 'Correct split', description: 'Every test passes: the right feature and threshold, the impurity to four decimals and both sides\' counts, including negative values, repeated values and the no-split case.', maxPoints: 50 },
        { criterion: 'Sort-and-sweep', description: 'Each feature sorted once with running class counts; the right side computed from totals; no re-scan per threshold.', maxPoints: 30 },
        { criterion: 'Clean, stated and explained', description: 'A Gini helper, thresholds only between distinct values, the tie rule written down, and the cost stated in a comment.', maxPoints: 20 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys


def main():
    data = sys.stdin.read().split()
    n, d = int(data[0]), int(data[1])
    X = []
    y = []
    p = 2
    for _ in range(n):
        X.append([int(v) for v in data[p:p + d]])
        y.append(int(data[p + d]))
        p += d + 1

    # TODO: for each feature, sort the rows by it once and sweep left to right,
    #       keeping counts of label 0 and label 1 on the left side
    # TODO: at each boundary between two DIFFERENT values, compute the weighted Gini
    #       of the split at the midpoint; keep the lowest (ties: smaller feature, then smaller threshold)
    # TODO: print "no split" if there was no candidate, otherwise the four lines


main()
`,
        tests: [
          { input: '8 2\n1 7 0\n2 3 0\n3 8 0\n4 2 1\n5 6 1\n6 1 1\n7 9 1\n8 5 0\n', expectedOutput: 'feature 1 threshold 3.5\ngini 0.2000\nleft 3 0\nright 1 4' },
          { input: '6 1\n-5 0\n-2 0\n-2 1\n0 1\n3 1\n3 1\n', expectedOutput: 'feature 1 threshold -1.0\ngini 0.2222\nleft 2 1\nright 0 3' },
          { input: '5 3\n10 4 1 1\n20 4 3 1\n30 4 2 0\n40 4 4 0\n50 4 5 0\n', expectedOutput: 'feature 1 threshold 25.0\ngini 0.0000\nleft 0 2\nright 3 0' },
          { input: '4 2\n7 2 0\n7 2 1\n7 2 1\n7 2 0\n', expectedOutput: 'no split', isHidden: true },
          { input: '10 3\n0 5 -1 0\n1 5 -1 0\n0 6 -1 1\n1 6 2 1\n0 7 2 1\n1 7 2 0\n0 8 2 1\n1 8 -1 0\n0 9 2 1\n1 9 2 1\n', expectedOutput: 'feature 2 threshold 5.5\ngini 0.3000\nleft 2 0\nright 2 6', isHidden: true },
          { input: '7 2\n100 3 1\n-100 1 0\n50 2 1\n-50 1 0\n0 3 1\n25 2 1\n-25 3 0\n', expectedOutput: 'feature 1 threshold -12.5\ngini 0.0000\nleft 3 0\nright 0 4', isHidden: true },
          { input: stumpBig(20000), expectedOutput: 'feature 1 threshold 600.5\ngini 0.1421\nleft 11099 921\nright 618 7362', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 60,
      },
    },
  },

  /* ── ROUND_DATA_MANIPULATION ──────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_CODING_ML_ROUND_DATA_MANIPULATION',
    notes: `"Here are some records — no pandas" is how fintech and e-commerce rounds test whether you can do what
\`groupby\`, \`merge\`, \`drop_duplicates\` and \`rolling\` do. The algorithm is never hard; the marks are lost on
definitions (which duplicate to keep, which window, inclusive or not) and on order (ties, sorting before grouping).
**Ask the definition question first, every time.** 15 minutes a problem.

## Problem 1 — Top two products per city by revenue

*Records (city, product, amount): Pune milk 120, Pune bread 80, Pune milk 60, Pune eggs 180, Pune bread 70, Delhi
eggs 90, Delhi milk 90, Delhi atta 300. Print each city's top two products by total revenue, ties by product
name.*

**Approach.** Total by (city, product) in one dictionary, regroup by city, sort each city's list by
\`(-revenue, product)\`, take two.

    tot = defaultdict(int)
    for city, product, amount in records:
        tot[(city, product)] += amount
    by_city = defaultdict(list)
    for (city, product), r in tot.items():
        by_city[city].append((product, r))
    for city in sorted(by_city):
        print(city, sorted(by_city[city], key=lambda t: (-t[1], t[0]))[:2])

Output: Delhi — atta 300, eggs 90; Pune — eggs 180, milk 180. Delhi's eggs and milk tie at 90 and Pune's eggs and milk
tie at 180: the name breaks both. **Say it:** "If ties should both be kept — a dense rank — tell me and I'll keep
every product whose revenue is at least the second-highest value."

**Complexity.** O(n + g log g) for g (city, product) groups.

## Problem 2 — Latest record per key, then a join

*A customer table export has several rows per customer (customer_id, updated_at, city) — c1 appears with 3 Jan
(Pune), 10 Feb (Mumbai) and 20 Jan (Nagpur). Keep the latest row per customer, then attach the city to each order;
orders from customers not in the table get "unknown".*

**Approach.** Sort by timestamp and overwrite a dictionary — the last write wins — or compare timestamps while
scanning. ISO dates compare correctly as strings; other formats must be parsed.

    latest = {}
    for cid, ts, city in sorted(rows, key=lambda r: r[1]):
        latest[cid] = city                      # c1 → Mumbai (10 Feb is the latest)
    joined = [(oid, cid, latest.get(cid, "unknown")) for oid, cid in orders]   # a left join

**Follow-ups.** "Two rows with the same timestamp?" — the definition question again: pick a rule (last in file) and
say it. "What does \`dict(zip(keys, values))\` do with a repeated key?" — the last value silently wins:
\`dict(zip(["a", "b", "a"], [1, 2, 3]))\` is \`{'a': 3, 'b': 2}\`. That is a de-duplication you did not choose.

## Problem 3 — Sessions and rolling windows

*(a) A user's events at minutes 0, 10, 45, 70, 120; a new session starts when the gap is more than 30 minutes. How
many sessions? (b) Daily amounts on days 1, 3, 4, 8 and 10 of 100, 50, 20, 70 and 30. What is the 7-day rolling sum
on day 10?*

**(a)** Sort the events, then count the gaps over 30: 10→45 is 35 and 70→120 is 50, so **3 sessions** —
[0, 10], [45, 70], [120]. Per user, the events must be sorted first; logs arrive out of order.

**(b)** "7 days including today" is days 4 to 10: 20 + 70 + 30 = **120**. Writing \`10 - 7 <= d\` includes day 3 and
gives 170 — the off-by-one that fails hidden tests. Missing days are zero; they still count towards the 7.

    window = [v for d, v in daily.items() if day - 6 <= d <= day]

For every day at once, keep a running sum and subtract what leaves the window (two pointers over sorted days):
O(n) instead of O(n·7).

## Round habit

Before coding, write down the three definitions the problem leaves open — **which duplicate wins, which window
(inclusive?), how ties break** — and ask. Then test with a duplicate, a boundary day and an unknown key.`,
    mcqs: [
      mcq('A user\'s events are at minutes 0, 10, 45, 70 and 120, and a new session starts after a gap of more than 30 minutes. How many sessions are there?', [
        ['3', true],
        ['2', false],
        ['4', false],
        ['5', false],
      ], 'The gaps are 10, 35, 25 and 50 minutes. Two of them exceed 30, so there are three sessions: [0, 10], [45, 70] and [120].'),
      mcq('What is `dict(zip(["a", "b", "a"], [1, 2, 3]))`?', [
        ["{'a': 3, 'b': 2}", true],
        ["{'a': 1, 'b': 2}", false],
        ["{'a': [1, 3], 'b': [2]}", false],
        ['A ValueError for the duplicate key', false],
      ], 'Building a dict from pairs overwrites a repeated key, so the last value wins without any warning. When duplicates matter, decide the rule explicitly or collect the values in lists.'),
      mcq('Daily amounts are 100, 50, 20, 70 and 30 on days 1, 3, 4, 8 and 10. What is the 7-day rolling sum on day 10, counting day 10 itself?', [
        ['120', true],
        ['170', false],
        ['100', false],
        ['270', false],
      ], 'Seven days including today are days 4 to 10, which hold 20, 70 and 30. Including day 3 (50) is the off-by-one error that gives 170; 270 is the sum of every day.'),
      mcq('A candidate uses `itertools.groupby` on order rows read straight from a log, keyed by customer, to total each customer\'s spend. Which fix is needed?', [
        ['Sort the rows by customer before grouping, or total them in a dictionary', true],
        ['Pass key=str so groupby compares the customer ids as strings', false],
        ['Call list() on each group before summing, or the totals are zero', false],
        ['Nothing, since groupby already gathers every row with the same key', false],
      ], 'groupby only merges adjacent rows with equal keys, so an unsorted log gives one customer several partial totals. Sorting first or a defaultdict(int) gives one total each.'),
      mcq('Pune\'s products total eggs 180, milk 180 and bread 150. The problem says "top two by revenue". What should the candidate do before coding the tie-break?', [
        ['Ask whether ties are broken by name or every tied product is kept', true],
        ['Return eggs and milk without comment, since any order of them is right', false],
        ['Return only eggs, because the second place is shared and so undefined', false],
        ['Add the bread revenue to the tie, since ranks must be strictly unique', false],
      ], 'Here both readings give eggs and milk, but with three products tied at 180 they would differ. Interviewers plant ties to see whether the candidate asks for the definition.'),
    ],
    assignment: {
      title: 'Thirty-Day Conversion by Signup Cohort',
      description: 'Group, join, de-duplicate and window in plain Python: what share of each month\'s signups ordered within 30 days, and what they spent.',
      instructions: `A quick-commerce app wants, for each **signup month**, how many new users placed an order within their
first 30 days and how much those orders were worth. The two exports are messy.

**Input.**

    U
    user_id signup_date                 (U lines, dates as YYYY-MM-DD)
    O
    order_id user_id order_date amount  (O lines; amount is a whole number of rupees)

1 ≤ U ≤ 10⁵, 0 ≤ O ≤ 2×10⁵.

**Rules.**

1. A user can appear more than once in the users export (re-registrations): keep the **earliest** signup date.
2. An order_id can appear more than once in the orders export (re-sent rows): keep the **first** occurrence only.
3. An order whose user_id is not in the users export is **unmatched**: it is counted, and otherwise ignored.
4. An order counts if it was placed **0 to 29 days** after the user's signup date (signup day = day 0). Orders
   before signup, or 30 or more days after, do not count.
5. A user is **converted** if at least one order counts. Revenue is the sum of all counting orders.
6. The cohort is the signup month, YYYY-MM.

**Output.** One line per cohort, oldest month first, then the unmatched count:

    <YYYY-MM> users=<n> converted=<k> rate=<100·k/n with one decimal>% revenue=<sum>
    unmatched_orders=<count of distinct unmatched order ids>

| Input | Output |
|---|---|
| \`3\` / \`p1 2024-06-01\` / \`p2 2024-06-15\` / \`p3 2024-07-01\` / \`0\` | \`2024-06 users=2 converted=0 rate=0.0% revenue=0\` / \`2024-07 users=1 converted=0 rate=0.0% revenue=0\` / \`unmatched_orders=0\` |

The first sample test is worth working by hand: 2024 is a leap year, so 1 February plus 30 days is 2 March.

Requirements:

- \`datetime.date.fromisoformat\` parses the dates; subtracting two dates gives a \`timedelta\` with \`.days\`.
- O(U + O) apart from sorting the cohorts: dictionaries, not nested loops over users and orders.
- Print only the lines described.
${RUNNER_NOTE}`,
      rubric: [
        { criterion: 'Correct cohorts', description: 'Every test passes: earliest signup kept, first order row kept, the 0–29 day window, unmatched orders counted once, cohorts in month order.', maxPoints: 50 },
        { criterion: 'Right structures', description: 'Dictionaries and sets for the users, seen order ids and per-user revenue; one pass over the orders; no nested loop over users and orders.', maxPoints: 30 },
        { criterion: 'Definitions stated', description: 'Each rule is visible in the code (a comment or a clearly named variable), and the cost is stated.', maxPoints: 20 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys
from datetime import date


def main():
    tok = sys.stdin.read().split()
    p = 0
    u = int(tok[p]); p += 1
    users = []
    for _ in range(u):
        users.append((tok[p], date.fromisoformat(tok[p + 1])))
        p += 2
    o = int(tok[p]); p += 1
    orders = []
    for _ in range(o):
        orders.append((tok[p], tok[p + 1], date.fromisoformat(tok[p + 2]), int(tok[p + 3])))
        p += 4

    # TODO: earliest signup date per user
    # TODO: first occurrence of each order_id only; count unmatched orders (unknown user)
    # TODO: an order counts when 0 <= (order_date - signup).days <= 29
    # TODO: per cohort (signup YYYY-MM): users, converted users, rate, revenue of counting orders
    # TODO: print the cohort lines oldest first, then unmatched_orders=...


main()
`,
        tests: [
          { input: '5\nu1 2024-01-05\nu2 2024-01-20\nu3 2024-02-01\nu4 2024-02-14\nu5 2024-02-29\n8\no1 u1 2024-01-05 500\no2 u1 2024-02-10 300\no3 u2 2024-02-18 450\no4 u3 2024-03-02 200\no5 u4 2024-02-13 999\no6 u5 2024-03-01 120\no3 u2 2024-02-18 450\no7 u9 2024-01-10 700\n', expectedOutput: '2024-01 users=2 converted=2 rate=100.0% revenue=950\n2024-02 users=3 converted=1 rate=33.3% revenue=120\nunmatched_orders=1' },
          { input: '4\na7 2024-03-10\nb2 2024-03-25\na7 2024-03-02\nc5 2024-04-11\n5\nr1 a7 2024-04-02 650\nr1 a7 2024-03-30 900\nr2 b2 2024-04-30 400\nr3 c5 2024-05-20 250\nr4 a7 2024-03-05 100\n', expectedOutput: '2024-03 users=2 converted=1 rate=50.0% revenue=100\n2024-04 users=1 converted=0 rate=0.0% revenue=0\nunmatched_orders=0' },
          { input: '3\np1 2024-06-01\np2 2024-06-15\np3 2024-07-01\n0\n', expectedOutput: '2024-06 users=2 converted=0 rate=0.0% revenue=0\n2024-07 users=1 converted=0 rate=0.0% revenue=0\nunmatched_orders=0' },
          { input: '7\nk1 2023-12-31\nk2 2023-12-05\nk3 2024-01-01\nk4 2024-01-15\nk5 2024-01-31\nk6 2024-01-31\nk7 2023-12-20\n11\nx1 k1 2024-01-29 300\nx2 k1 2024-01-30 800\nx3 k2 2024-01-03 150\nx4 k3 2024-01-01 40\nx5 k3 2024-01-12 60\nx6 k5 2024-03-01 500\nx7 k6 2024-02-29 220\nx8 k4 2024-01-14 75\nx9 zz 2024-01-02 10\nx9 zz 2024-01-02 10\nx10 k7 2024-01-19 90\n', expectedOutput: '2023-12 users=3 converted=2 rate=66.7% revenue=450\n2024-01 users=4 converted=2 rate=50.0% revenue=320\nunmatched_orders=1', isHidden: true },
          { input: '1\nsolo 2024-08-08\n4\nq1 ghost 2024-08-08 100\nq1 solo 2024-08-08 200\nq2 solo 2024-09-07 300\nq3 solo 2024-09-06 400\n', expectedOutput: '2024-08 users=1 converted=1 rate=100.0% revenue=400\nunmatched_orders=1', isHidden: true },
          { input: '6\nm1 2024-05-02\nm2 2024-05-09\nm3 2024-05-16\nm4 2024-05-23\nm5 2024-05-30\nm6 2024-05-31\n6\ne1 m1 2024-05-31 1000\ne2 m2 2024-06-08 2000\ne3 m3 2024-06-15 3000\ne4 m4 2024-06-22 4000\ne5 m5 2024-06-28 5000\ne6 m6 2024-06-30 6000\n', expectedOutput: '2024-05 users=6 converted=2 rate=33.3% revenue=6000\nunmatched_orders=0', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 60,
      },
    },
  },

  /* ── ROUND_METRICS ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_CODING_ML_ROUND_METRICS',
    notes: `"Compute this metric by hand" separates candidates who have used \`sklearn.metrics\` from candidates who
understand it. The round usually adds one edge case the library hides — ties, a probability of 0, one class, a
list shorter than k. 15 minutes a problem.

## Problem 1 — ROC-AUC without the curve

*Positives scored 0.9, 0.6, 0.4; negatives scored 0.7, 0.4, 0.3, 0.1. Compute the AUC.*

**Approach.** AUC is the probability that a random positive scores **higher** than a random negative, with a tie
counting one half. Pair counting is O(P·N):

    0.9 beats all 4 negatives           4
    0.6 beats 0.4, 0.3, 0.1             3
    0.4 ties 0.4, beats 0.3 and 0.1     0.5 + 2 = 2.5
    AUC = 9.5 / 12 = 0.7917

For large n, sort by score and sweep **groups of equal scores**: each positive in a group earns (negatives in
lower groups) + ½ × (negatives in the same group). O(n log n).

**Follow-ups.** "What if I square every score?" — the AUC is unchanged (still 0.7917): it depends only on the order.
"Only positives in the data?" — undefined; say so rather than returning 0 or 1. "Ignore the ties?" — then a model
that gives every row 0.5 gets an AUC of 0 instead of 0.5.

## Problem 2 — Log loss, safely

*Three predictions: y = 1 with p = 0.9, y = 0 with p = 0.2, y = 1 with p = 0.0. Compute the mean log loss.*

**Approach.** Loss per row is −ln p for a positive and −ln(1 − p) for a negative. The third row would need
\`math.log(0)\`, which raises ValueError — so clip p to [1e-15, 1 − 1e-15] first, as the problem usually states:

    -ln 0.9   = 0.1054
    -ln 0.8   = 0.2231
    -ln 1e-15 = 34.5388
    mean      = 11.6224

**What to say.** One confident wrong prediction dominates the mean — that is the point of log loss, and the reason a
model that outputs hard 0s and 1s is punished. (Recent scikit-learn versions clip with the float type's machine
epsilon rather than 1e-15, so match whatever the problem specifies.)

## Problem 3 — Precision at k, and a split you can reproduce

*(a) A recommender returns [p3, p7, p1, p9, p4] for a user whose relevant items are {p1, p4, p5}. Compute precision
at 3, precision at 5 and recall at 5. (b) Write a stratified 80/20 split with a seed.*

**(a)** Top 3 hold one relevant item: P@3 = 1/3. Top 5 hold two: P@5 = 2/5, R@5 = 2/3. **Ask** what to divide by
when the list is shorter than k — k, or the list length — and average per user, not over all recommendations
pooled.

    def precision_at_k(recs, relevant, k):
        return len(set(recs[:k]) & relevant) / k

**(b)** Shuffle each class separately with a seeded generator and cut each at the same fraction, so both parts keep
the class balance:

    def stratified_split(rows, labels, test_frac, seed):
        rng = random.Random(seed)                       # never the global random state
        train, test = [], []
        for c in sorted(set(labels)):
            idx = [i for i, y in enumerate(labels) if y == c]
            rng.shuffle(idx)
            cut = round(len(idx) * test_frac)
            test += idx[:cut]
            train += idx[cut:]
        return sorted(train), sorted(test)

**Follow-up.** "Rows for the same customer?" — split by customer (group split), or the same person is in train and
test. "Time-stamped data?" — split by time, not at random.

## Round habit

For every metric, state its edge cases before coding: **one class, ties, zero denominators, 0 and 1 probabilities,
k larger than the list** — and the convention you chose for each.`,
    mcqs: [
      mcq('Positives score 0.9, 0.6 and 0.4; negatives score 0.7, 0.4, 0.3 and 0.1; a tie counts one half. What is the AUC?', [
        ['0.7917', true],
        ['0.7500', false],
        ['0.8333', false],
        ['0.6667', false],
      ], 'The positives win 4, 3 and 2.5 of their 4 comparisons: 9.5 out of 12 pairs. Ignoring the tie gives 9/12 = 0.75; counting it as a full win gives 10/12 = 0.8333.'),
      mcq('A hand-written log loss crashes with "ValueError: math domain error". What is the most likely cause?', [
        ['A row has p = 0 for a positive or p = 1 for a negative, and p was not clipped', true],
        ['The labels were given as floats such as 1.0 instead of the integers 0 and 1', false],
        ['The mean was taken over more rows than math.log can process at one time', false],
        ['A probability above 0.5 was passed to the natural logarithm on a negative row', false],
      ], 'math.log(0) is undefined and Python raises ValueError. Clipping p to [1e-15, 1 − 1e-15] keeps every log finite; the clipped row then contributes about 34.5 to the sum.'),
      mcq('Every score of a model is replaced by its square (all scores are between 0 and 1). What happens to the ROC-AUC?', [
        ['It stays the same, because squaring keeps the order of the scores', true],
        ['It falls, because the squared scores are closer together near 0', false],
        ['It rises, because squaring pushes the larger scores apart from the rest', false],
        ['It cannot be computed, because the scores are no longer probabilities', false],
      ], 'AUC counts how often positives outrank negatives, so any strictly increasing transformation leaves it unchanged. Calibration and log loss, which use the values, would change.'),
      mcq('A recommender returns [p3, p7, p1, p9, p4] and the user\'s relevant items are {p1, p4, p5}. What is precision at 3?', [
        ['1/3', true],
        ['2/3', false],
        ['1/5', false],
        ['2/5', false],
      ], 'Only p1 is relevant among the top three, so P@3 = 1/3. 2/5 is precision at 5, and 2/3 is recall at 5.'),
      mcq('A candidate writes a train/test split with `random.shuffle(rows)` and no seed, then reports the test score. What is the main problem?', [
        ['The split changes on every run, so the score cannot be reproduced', true],
        ['random.shuffle only works on lists that contain numbers, not rows', false],
        ['Shuffling in place deletes the original order, so labels are lost', false],
        ['random.shuffle draws with replacement, so rows repeat in the test set', false],
      ], 'Without a seed every run gives a different split and a different score. random.Random(seed) gives a private, reproducible generator; stratifying keeps the class balance too.'),
    ],
    assignment: {
      title: 'ROC-AUC with Ties and a Safe Log Loss',
      description: 'Two metrics by hand, as a fintech round asks: the AUC in O(n log n) with tied scores counted as halves, and the mean log loss with clipping.',
      instructions: `A credit model scored n applications. For each you have the true label (1 = defaulted) and the
predicted probability. Compute two metrics.

**Input.** The first line is n (1 ≤ n ≤ 2×10⁵). Each of the next n lines holds a label (0 or 1) and a probability
between 0 and 1 inclusive.

**Output.** Two lines:

    auc=<ROC-AUC with four decimals, or the word undefined>
    logloss=<mean log loss with four decimals>

- **AUC** is the share of (positive, negative) pairs in which the positive has the **higher** probability, a tie
  counting **one half**. If all labels are the same, print \`auc=undefined\`.
- **Log loss** is the mean over all rows of −ln p for a positive and −ln(1 − p) for a negative, after clipping p to
  the range [1e-15, 1 − 1e-15].

| Input | Output |
|---|---|
| \`6\` / \`1 0.7\` / \`0 0.7\` / \`1 0.5\` / \`0 0.5\` / \`0 0.5\` / \`1 0.9\` | \`auc=0.7222\` / \`logloss=0.6242\` |
| \`4\` / \`1 1\` / \`0 0\` / \`1 0\` / \`0 0.2\` | \`auc=0.6250\` / \`logloss=8.6905\` |

Requirements:

- O(n log n). Comparing every positive with every negative is O(P·N) — over 10⁹ pairs on the largest test.
- Ties must count one half: sort by probability and handle each group of equal values together.
- Keep the pair counts as integers (or halves) until the final division.
- Print only the two lines.
${RUNNER_NOTE}`,
      rubric: [
        { criterion: 'Correct metrics', description: 'Every test passes: ties counted as halves, the one-class case, probabilities of exactly 0 and 1, and both values to four decimals.', maxPoints: 50 },
        { criterion: 'O(n log n) AUC', description: 'Scores sorted once and swept in groups of equal values with a running count of negatives below; no pairwise loop.', maxPoints: 30 },
        { criterion: 'Safe and explained', description: 'Clipping before the logarithm, integer pair counts, edge cases named in a comment, and the cost stated.', maxPoints: 20 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys
import math


def main():
    tok = sys.stdin.read().split()
    n = int(tok[0])
    rows = []
    for i in range(n):
        rows.append((int(tok[1 + 2 * i]), float(tok[2 + 2 * i])))

    # TODO: AUC — if every label is the same, print "auc=undefined"
    #       otherwise sort by probability and sweep groups of EQUAL probabilities:
    #       each positive in a group wins against every negative in lower groups,
    #       and half against each negative in its own group
    # TODO: log loss — clip p to [1e-15, 1 - 1e-15], then average -ln p (y = 1) or -ln(1 - p) (y = 0)
    # TODO: print both lines with four decimals


main()
`,
        tests: [
          { input: '8\n1 0.92\n0 0.81\n1 0.74\n0 0.40\n1 0.35\n0 0.22\n0 0.15\n1 0.08\n', expectedOutput: 'auc=0.5625\nlogloss=0.8178' },
          { input: '6\n1 0.7\n0 0.7\n1 0.5\n0 0.5\n0 0.5\n1 0.9\n', expectedOutput: 'auc=0.7222\nlogloss=0.6242' },
          { input: '4\n1 1\n0 0\n1 0\n0 0.2\n', expectedOutput: 'auc=0.6250\nlogloss=8.6905' },
          { input: '3\n0 0.3\n0 0.6\n0 0.1\n', expectedOutput: 'auc=undefined\nlogloss=0.4594', isHidden: true },
          { input: '5\n1 0.1\n1 0.2\n0 0.6\n0 0.7\n0 0.95\n', expectedOutput: 'auc=0.0000\nlogloss=1.8056', isHidden: true },
          { input: '9\n0 0.5\n1 0.5\n0 0.5\n1 0.5\n0 0.5\n1 0.5\n0 0.5\n1 0.5\n0 0.5\n', expectedOutput: 'auc=0.5000\nlogloss=0.6931', isHidden: true },
          { input: aucBig(50000), expectedOutput: 'auc=0.8350\nlogloss=0.4947', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 60,
      },
    },
  },

  /* ── CHECKPOINT ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_CODING_ML_CHECKPOINT',
    notes: `This checkpoint is a code-reading round: an interviewer shows you a short piece of data-science Python and
asks what it prints, what is wrong, or what it costs. Every snippet was run on Python 3.10+.

Recall the rules of this topic:
- **Know what the function computes** — AUC is a pair count, a stump threshold is a midpoint, a group-by is a
  dictionary.
- **Name the edge cases first** — one class, ties, zero and one probabilities, duplicates, window boundaries.
- **Python's own traps** — shared mutable defaults, aliased rows, half-even rounding, floor division, in-place
  methods that return None.

Read each snippet carefully before choosing.`,
    checkpoint: [
      mcq('What does this print?\n\n    m = [[0] * 3] * 2\n    m[0][0] = 9\n    print(m)', [
        ['[[9, 0, 0], [9, 0, 0]]', true],
        ['[[9, 0, 0], [0, 0, 0]]', false],
        ['[[9, 9, 9], [0, 0, 0]]', false],
        ['[[9, 0, 0, 0, 0, 0]]', false],
      ], 'Multiplying the outer list copies the reference to one inner list, so both rows are the same object. Build a grid with [[0] * 3 for _ in range(2)].'),
      mcq('What does `print(sorted([("b", 3), ("a", 3), ("c", 1)], key=lambda r: -r[1]))` print?', [
        ["[('b', 3), ('a', 3), ('c', 1)]", true],
        ["[('a', 3), ('b', 3), ('c', 1)]", false],
        ["[('c', 1), ('a', 3), ('b', 3)]", false],
        ["[('c', 1), ('b', 3), ('a', 3)]", false],
      ], 'Python\'s sort is stable: b and a have equal keys, so they keep their input order. Alphabetical order among ties needs the key (-r[1], r[0]).'),
      mcq('A kNN implementation compares squared distances instead of distances, to avoid the square root. What changes in its predictions?', [
        ['Nothing, because squaring non-negative distances keeps their order', true],
        ['Far points get more weight, so the predicted class can change', false],
        ['Ties between neighbours disappear, so the votes become unique', false],
        ['Predictions shift toward the majority class of the training data', false],
      ], 'The square is strictly increasing for non-negative numbers, so the k nearest neighbours are the same. It would matter only if votes were weighted by distance.'),
      mcq('This AUC function is given scores where every positive and every negative is 0.5. What does it return?\n\n    def auc(P, N):\n        return sum(p > q for p in P for q in N) / (len(P) * len(N))', [
        ['0.0, because ties earn nothing', true],
        ['0.5, the value for a random model', false],
        ['1.0, because no positive loses', false],
        ['A ZeroDivisionError on the ties', false],
      ], 'Every comparison is a tie, and p > q is False for each, so the count is 0. A tie must count one half; with that, a constant model scores 0.5, as it should.'),
      mcq('What does this print?\n\n    import math\n    y, p = 1, 0.0\n    print(-math.log(p) if y else -math.log(1 - p))', [
        ['Nothing: math.log(0) raises ValueError', true],
        ['inf, the loss of a certain wrong guess', false],
        ['34.5388, the loss after clipping to 1e-15', false],
        ['0.0, since the positive label cancels it', false],
      ], 'Python\'s math.log raises "ValueError: math domain error" for 0 rather than returning infinity. Clip p first; 34.5388 is what the clipped value gives.'),
      mcq('A gradient-descent step is written as `w = w + lr * grad_w`, where grad_w is the gradient of the loss. What will the training loss do?', [
        ['Rise, because the step moves uphill along the gradient', true],
        ['Fall, but more slowly than with the minus sign in place', false],
        ['Stay constant, because the bias absorbs the change', false],
        ['Fall quickly at first and then oscillate around the minimum', false],
      ], 'The gradient points toward increasing loss, so adding it climbs. Descent subtracts: w = w - lr * grad_w.'),
      mcq('A candidate standardises features with the mean and standard deviation of the whole dataset, then splits it into train and test. What is wrong?', [
        ['Test-set statistics leak into training; fit the scaler on train only', true],
        ['Nothing, because standardising does not change the order of values', false],
        ['The scaler must be fitted on the test set, which is the newer data', false],
        ['Standardising must happen after the model is trained, not before', false],
      ], 'Statistics computed with the test rows give training a glimpse of them. Compute the mean and standard deviation on the training part and apply those to the test part.'),
      mcq('What does this print?\n\n    from itertools import groupby\n    print([k for k, _ in groupby("aaba")])', [
        ["['a', 'b', 'a']", true],
        ["['a', 'b']", false],
        ["['a', 'a', 'b', 'a']", false],
        ["['b', 'a']", false],
      ], 'groupby starts a new group each time the key changes, so the final a is a separate group. Sort the input first to get one group per key.'),
      mcq('A stump finder evaluates thresholds at every value in the column, including between two equal values. On a column whose values are all 7, what should a correct implementation report?', [
        ['That there is no split, because a constant column has no candidate threshold', true],
        ['A split at 7, with every row on the left and an empty right side', false],
        ['A split at 3.5, halfway between zero and the only value in the column', false],
        ['A Gini of 0 for the column, since all of its values are identical', false],
      ], 'Candidates lie between consecutive distinct values, and a constant column has none. A "split" with an empty side does not divide the data and must not be reported.'),
      mcq('A precision-at-k function is `len(set(recs[:k]) & relevant) / len(recs[:k])`. For a user with only 2 recommendations, both relevant, and k = 5, what does it return, and why does that matter?', [
        ['1.0, though dividing by k would give 0.4; the convention must be agreed', true],
        ['0.4, because the slice recs[:5] pads the list with None to five items', false],
        ['An IndexError, because the list has fewer than five recommendations', false],
        ['2.0, because both relevant items are counted once for each position', false],
      ], 'Slicing past the end is safe in Python, so the denominator is 2 and the result is 1.0. Dividing by k gives 0.4. Neither is wrong; the round expects you to ask which one they want.'),
    ],
  },

  /* ══ DS_PLACE_FS — The Data Science Candidate ═════════════════════════════════════════════ */

  /* ── RESUME ───────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_PLACE_FS_RESUME',
    notes: `The shared Year-4 resume pack covers format, length and the basics. This unit is the **data-science** version:
the resume that gets through the filter for roles titled "Data Scientist", "Associate Data Scientist", "ML
Engineer", "Applied Scientist — Intern", "AI Engineer", "Decision Scientist" or "Analyst — Data Science", and a
portfolio where every claim can be opened and checked.

## Who reads it, and what they filter on

| Employer | Typical first filter | What wins the shortlist |
|---|---|---|
| Product companies, fintech, e-commerce | Python, SQL, ML, statistics; a project with a business metric | A deployed project, an honest validation, an experiment |
| Analytics and AI consultancies | Python, SQL, ML, communication | The business question and recommendation in each bullet |
| Global capability centres (banks', retailers' Indian centres) | Python, SQL, ML, cloud basics; academics | Clean, complete, documented projects; certifications you earned |
| GenAI-focused teams | Python, LLM APIs, retrieval, evaluation | An LLM feature with measured accuracy, cost and failure handling |

## The skills line a filter searches

Use the job description's spellings, grouped, and only what you can defend for ten minutes:

    Languages:    Python, SQL
    ML:           scikit-learn (pipelines, cross-validation), XGBoost/LightGBM, model evaluation, SHAP
    Data:         pandas, NumPy, data cleaning, feature engineering
    Statistics:   hypothesis testing, A/B testing, confidence intervals, bootstrap
    Deep learning: PyTorch, transfer learning, transformers (Hugging Face)
    GenAI:        LLM APIs, prompt design, retrieval (RAG), LLM evaluation
    MLOps:        FastAPI, MLflow, Docker, Git, model monitoring

Leave out what you cannot defend: "Big Data", "Spark", "Kubernetes", "computer vision" if you only ran one
tutorial. **Every word on this line is a question in round 2.**

## Project bullets: problem + method + honest metric + business value

A data-science bullet must carry a metric that means something — **against a baseline, on a held-out set
chosen honestly** — and, where possible, the value in the business's units.

- Weak: "Built a loan default prediction model with 93% accuracy."
  (On 7.1% defaults, approving everyone is 92.9% accurate. A panel will ask; the bullet will not survive.)
- Strong: "Built an early-default model for two-wheeler loans (24k applications, time-based split): PR-AUC 0.264
  vs 0.113 for a bureau-score baseline; referring the riskiest 10% raised validation value by about ₹15 lakh."
- Strong: "Served the model with FastAPI (Pydantic validation, pytest), tracked 3 model families in MLflow, and
  wrote a PSI-based monitoring plan that flagged a gig-worker mix shift (PSI 0.275)."
- Strong: "Extracted 3 fields from 23k officer notes (English and Hinglish); measured rules vs LLM on 200
  hand-labelled notes and kept the cheaper method after a paired bootstrap."

Every number must be one you can reproduce from your notebooks on the spot.

## The portfolio that backs every line

- **One GitHub repository per serious project**, README first: the decision the model supports, the data and split,
  the headline metric with its baseline and interval, a model card link, how to run it, and "Known limits".
  Notebooks keep their outputs and run top to bottom; code that is reused lives in \`.py\` modules with tests.
- **A deployed demo** — a Streamlit app or a FastAPI docs page on a free tier, **on synthetic or public data only**,
  with no API keys in the repository. A two-minute screen recording as the fallback for when the free tier sleeps.
- **A model card** — intended use, data period, metrics with intervals, limits, what it must not be used for.
- **Kaggle** counts when you can explain your validation choice and what you learned beyond the leaderboard; a
  copied top-voted notebook counts against you.
- **LinkedIn and Naukri** — headline "Data Scientist | Python, SQL, ML, GenAI"; the capstone in Featured; the same
  skill spellings as the resume.

## Copies for different roles — the facts never change, only the order

| Target | Lead with | Push down |
|---|---|---|
| Data Scientist (product / fintech) | The model, its validation, the ₹ value, the experiment | Docker details |
| ML Engineer | The API, tests, MLflow, monitoring, Docker | Statistical tests |
| AI / GenAI Engineer | The LLM feature, its evaluation, cost and fallback | Classical model tuning |
| Analyst — Data Science | SQL, statistics, the business finding | Deep learning |`,
    workedExample: `**A weak data-science resume, rewritten.** Karthik, B.Tech CSE 2026, CGPA 8.1, sends:

    SKILLS: Python, ML, DL, NLP, Computer Vision, Big Data, Spark, AWS, Tableau, Power BI, ChatGPT
    PROJECTS
    1. Loan Default Prediction — Random Forest, 94% accuracy.
    2. Titanic Survival Prediction — 82% accuracy on Kaggle.
    3. Chatbot using ChatGPT — built a chatbot.

**What a panel sees.** A skills line nobody could defend in full; "94% accuracy" on a problem where the base rate
alone gives about 93%; Titanic in a project slot; a chatbot with no measurement.

**Step 1 — inventory what is true.** His capstone (Sarathi, Option A): 24,180 rows, 180 duplicates removed, the -1
bureau sentinel turned into missing plus a flag, the leaked bounce column excluded and its effect shown (PR-AUC
0.96 with it), a date split, logistic regression and HistGradientBoosting compared in MLflow, validation PR-AUC
0.264 against a 0.113 baseline, a cutoff chosen from rupee values, the test set scored once (PR-AUC 0.287 at an
8.5% default rate), FastAPI with tests, a monitoring plan, and the officer-note extraction measured on 200 hand
labels. He has never used Spark, AWS or Tableau.

**Step 2 — rewrite.**

    Sarathi Finance — two-wheeler loan early-default model         github.com/karthik-s/sarathi-default
    Python, scikit-learn, MLflow, FastAPI, Docker, LLM API
     - Predicted early default on 24k loan applications with a time-based split: PR-AUC 0.264 vs 0.113 for a
       bureau-only baseline; referring the riskiest 10% raised validation value by ~₹15 lakh.
     - Found and fixed 180 duplicate rows, a -1 bureau-score sentinel and a leaked post-disbursal column
       (PR-AUC 0.96 with it — excluded).
     - Served the pipeline with FastAPI (Pydantic schema, 4 pytest cases) and a Streamlit demo; tracked runs
       in MLflow; monitoring plan with PSI flagged a gig-worker mix shift (0.275).
     - Measured rules vs an LLM for extracting 3 fields from Hinglish officer notes on 200 hand labels;
       reported the lift with a paired-bootstrap interval.

    SKILLS
    Python, SQL | scikit-learn (pipelines, TimeSeriesSplit), HistGradientBoosting, SHAP | pandas, NumPy
    Statistics: A/B testing, bootstrap, confidence intervals | PyTorch (transfer learning) | FastAPI, MLflow, Docker, Git

**Step 3 — check against a JD.** A fintech "Associate Data Scientist — Credit Risk" asks for "Python, SQL, ML,
model validation, PD models, MLOps a plus". Every true keyword is there; "PD model" is how credit teams say
probability of default, so the first bullet's wording can use it. Spark and AWS stay off; if asked, he says "not
yet — here is what I did deploy".

**Step 4 — make the portfolio agree.** README leads with the decision, the headline metric and its baseline, and
links the model card; the demo runs on the synthetic data; the LLM key is read from the environment and is nowhere
in the history; Titanic and the chatbot move to a "Practice" section or off the page.`,
    mcqs: [
      mcq('Sneha\'s resume says "Loan default model — 93% accuracy". The validation default rate is 7.1%. What should she change?', [
        ['Report PR-AUC against a baseline, since approving everyone is already 92.9% accurate', true],
        ['Raise the accuracy by tuning further, since 93% looks weak next to other candidates', false],
        ['Keep accuracy, since recruiters understand it better than any other model metric', false],
        ['Replace the number with "high accuracy", which avoids questions about the exact value', false],
      ], 'With 7.1% defaults, predicting "no default" for everyone scores 92.9%, so 93% says almost nothing. A ranking metric with its no-skill level and baseline, plus the rupee value, is what panels respect.'),
      mcq('A JD for "ML Engineer — Fresher" lists "Python, FastAPI or Flask, Docker, MLflow, CI". Which project bullet should lead Arun\'s copy for it?', [
        ['The model served with FastAPI, validated input, pytest cases and runs in MLflow', true],
        ['The bootstrap interval on the PR-AUC difference between the two competing model families', false],
        ['The exploratory charts of default rate by state, month and vehicle segment', false],
        ['The Kaggle notebook where he placed in the top 20% on a tabular competition', false],
      ], 'Same true facts, ordered for the reader: an ML Engineer copy leads with serving, tests and tracking. The statistics and EDA stay on the page lower down.'),
      mcq('Which deployed demo is safe to link from a public resume?', [
        ['A Streamlit app on synthetic data, with the API key read from the environment', true],
        ['A Streamlit app on her internship\'s customer data, with the names hidden', false],
        ['A notebook on a public link that contains the LLM API key in one of its cells', false],
        ['A FastAPI service that loads a pickle file anyone can upload to the server', false],
      ], 'Public demos must use data you may publish and must not expose secrets or accept untrusted model files. Hiding names does not make an employer\'s data yours to publish.'),
      mcq('Vivek lists "Spark, Kubernetes, AWS SageMaker" because the JD mentions them; he has used none. What is the best course?', [
        ['Remove them and be ready to say what he did deploy and how it would transfer', true],
        ['Keep them, since the JD lists them and the filter will not pass him otherwise', false],
        ['Move them to a "Familiar with" line, where interviewers do not ask questions', false],
        ['Keep them and complete a one-hour tutorial on each before the interview day', false],
      ], 'Every listed skill is fair game in the technical round, and one question exposes it. An honest line plus a concrete deployment story is the safer and stronger answer.'),
      mcq('A recruiter has one minute on Divya\'s capstone repository. What should the README show first?', [
        ['The decision, the headline metric with its baseline, and a link to the model card', true],
        ['The full directory tree, so the recruiter can see how the code is organised', false],
        ['The list of every library with its exact version and the installation steps', false],
        ['The story of how she chose the project and the challenges she overcame', false],
      ], 'A reader decides in a minute whether the work is real. The decision, an honest metric against a baseline and the model card answer that; setup details belong further down.'),
    ],
    checkpoint: [
      ck(PR, 'Two JDs: a fintech "Data Scientist — Credit" and a GCC "AI Engineer — GenAI". Rahul has one capstone with both a default model and an LLM extraction feature. What should his two resume copies do?', [
        ['Lead the fintech copy with the model and its ₹ value, the GenAI copy with the measured LLM feature', true],
        ['Send one identical copy to both, so his story never looks inconsistent between the two hiring companies', false],
        ['Drop the LLM feature from the fintech copy, since credit teams do not care about language models', false],
        ['Add RAG and agent frameworks to the GenAI copy, since that team will expect them to be listed', false],
      ], 'The facts stay the same and the order changes for the reader. Deleting true work or adding skills he lacks both weaken the copy.'),
      ck(PE, 'Which item best backs the bullet "Served the model with FastAPI and tested it"?', [
        ['The api/ and tests/ folders, with a README command that runs the tests and their passing output', true],
        ['A certificate from an online course on building REST APIs with FastAPI and Python', false],
        ['A screenshot of the FastAPI docs page, showing the endpoint name and its parameters', false],
        ['A sentence in the README saying that the API has been thoroughly tested by the author', false],
      ], 'Evidence is the working thing: the code, the tests and a way to run them. A certificate or a sentence says nothing about this project.'),
      ck(PR, 'Meena\'s best project bullet reads "Used Python, pandas, scikit-learn, XGBoost, SHAP and Streamlit". What is the strongest rewrite?', [
        ['State the problem, the metric against its baseline on an honest split, and the business value', true],
        ['Add PyTorch and TensorFlow to the list, so that the deep learning keywords are also matched by filters', false],
        ['Sort the tools alphabetically and put them in bold, so the recruiter notices them faster', false],
        ['Replace the tools with "end-to-end data science", which covers every step in a phrase', false],
      ], 'A list of tools is not a result. Problem, honest metric, baseline and value give the panel something to probe; the tools can follow in brackets.'),
    ],
  },

  /* ── DEFEND_CAPSTONE ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_PLACE_FS_DEFEND_CAPSTONE',
    notes: `Year 3's defence unit rehearsed the ten-minute talk and the first round of questions — why a date split, why
logistic regression, is PR-AUC 0.26 poor, how 0.148 was chosen, selection bias, fairness, the GenAI feature, the
fallback, staleness. A placement panel has read your model card and goes **one level deeper**: it asks about numbers
you did not put on a slide. These are those questions for the **Sarathi Finance** capstone (Option A), with answers
built on what the reference pipeline actually gives. If you chose Option B or C, build the same table for yours.

## The numbers you must know without looking

| Item | Validation (Apr–Jun 2024) | Test (Jul–Dec 2024) |
|---|---|---|
| Applications / defaults | 2,975 / 212 (7.1%) | 6,124 / 518 (8.5%) |
| ROC-AUC / PR-AUC (logistic regression + notes) | 0.760 / 0.264 | 0.751 / 0.287 (bootstrap 95% 0.250–0.327) |
| No-skill PR-AUC (= default rate) | 0.071 | 0.085 |
| Riskiest 10%: defaults caught, default rate inside, lift | 85 of 212 (40%), 28.5%, 4.0× | 191 of 518 (37%), 31.2%, 3.7× |
| Cutoff 0.148: share referred | 9.9% | 11.5% (706 applications: 205 defaults, 501 good) |
| Net value: approve all → with the cutoff | ₹1.64 cr → ₹1.79 cr | ₹2.97 cr → ₹3.34 cr (+₹36.9 lakh) |
| Mean predicted vs actual | — | 7.6% vs 8.5% (new-to-credit 8.9% vs 10.0%) |

Coefficients (standardised numeric features, one-hot categories): FOIR +0.632 per standard deviation (0.267), so
odds × 1.88; gig against salaried, everything else equal, odds × 1.6. Random 5-fold cross-validation on train +
validation gives PR-AUC 0.268, close to the date-split 0.264.

## 1. "Test PR-AUC is 0.287 and validation was 0.264. Did the model get better?"

**Strong:** "No — PR-AUC depends on the base rate. Test defaults are 8.5% against 7.1%, so even a no-skill model
scores higher there. ROC-AUC, which does not depend on the base rate, went from 0.760 to 0.751 — essentially the
same ranking quality. And 0.287 has a bootstrap interval of 0.250 to 0.327; I'd quote it as 'about the same'."
**Trap:** celebrating the higher number. **Follow-up:** "Then compare them how?" → PR-AUC as a multiple of the
no-skill level (3.7× on validation, 3.4× on test), or lift in the riskiest decile (4.0× and 3.7×).

## 2. "Your cutoff is fixed at 0.148, but on test it referred 11.5%, not 10%. Which is wrong?"

**Strong:** "Neither. The cutoff is a risk level, and the test applicants were riskier — more gig workers — so more
of them crossed it. I'd keep a probability cutoff rather than a fixed share: the economics are per application.
What I would check is calibration, because the model under-predicts on test (7.6% against 8.5%), so the true risk at
0.148 is a little higher than 0.148. The referral rate is also an operations number: credit managers must be able to
handle 11.5%."
**Follow-up:** "What did the cutoff earn on test?" → "Treating a referral as a decline, ₹36.9 lakh more than
approving everyone over six months — with the caveat that referred loans are not all declined in reality."

## 3. "The salaried coefficient is −0.717. Interpret it."

**Strong:** "On its own, nothing: I one-hot encoded all three employment types with L2 regularisation, so each
coefficient is relative to the others, not to a dropped baseline. Differences are what mean something: gig minus
salaried is 0.472, so a gig applicant has about 1.6 times the odds of default of an otherwise identical salaried
one. And FOIR's +0.632 is per standard deviation, 0.267, after scaling: odds × 1.88 for each 0.27 of FOIR."
**Trap:** "salaried applicants are 72% less likely to default".

## 4. "Random cross-validation gives 0.268, your date split 0.264. So the date split didn't matter?"

**Strong:** "Not between these two periods — training and validation are both before July 2024, when the mix was
stable. The date split matters for the test period, where the gig share went from 12% to 31% and the model became
under-calibrated. I chose the split before seeing either number, and the test result shows why."

## 5. "Would you recalibrate? What would it change?"

**Strong:** "Shifting the intercept by +0.137 in log-odds brings the mean prediction on test to 8.5%. It barely moves
the Brier score (0.0693 to 0.0692) and does not change ROC-AUC or PR-AUC at all, because it keeps the order. What it
changes is the decision: at a fixed cutoff more applicants are referred, so I'd re-run the rupee table first. And
the self-employed were under-predicted most, so a single shift is not enough — I'd recalibrate on recent labelled
months, by group if the data allows."

## 6. "Of the applications you refer, how many would actually default?"

**Strong:** "About 28–29%: on validation, 85 of the 298 referred; on test 205 of 706. So roughly seven good
customers are referred for every three defaulters. That is the price of catching 40% of defaults with a 10%
referral rate, and it is why it is 'refer', not 'reject' — a credit manager sees the file."

## 7. "First-time borrowers have no bureau score. Is the model fair to them?"

**Strong:** "They are about 22% of applicants. On test, the model predicts 8.9% for them and they default at 10.0%
— under-predicted by about the same margin as applicants with a score (7.2% against 8.0%). So the flag and the
imputation are not making them look safer than others; the whole period is under-predicted. Their referral rate
should be shown next to their default rate, as with gig workers."

## 8. "Walk me through one wrong prediction."

**Strong:** have one ready — an applicant with a low score who defaulted, the features that kept the score low (a
salaried job, an owned house, a co-applicant), and what the data could not see. Then the general point: "error
analysis by segment showed the misses concentrate in self-employed applicants, which matches the calibration
table."

**The rule for every answer:** the number, its definition, its uncertainty, and what you would do next. Say "the
data cannot show that; here is how I would find out" before a panel has to drag it out of you.`,
    workedExample: `**Whiteboard: "Convince our credit head the model is worth running, using only the test period."**

Write as you talk:

    Test period, Jul–Dec 2024: 6,124 applications, 518 defaults (8.5%)
      approve everyone           ₹9,000 × 5,606 good − ₹40,000 × 518 defaults  = ₹2,97,34,000
      refer when p ≥ 0.148       706 referred (205 defaults, 501 good)
                                 ₹9,000 × 5,105 − ₹40,000 × 313                = ₹3,34,25,000
      difference                                                               ≈ +₹36.9 lakh in six months

Say it in order:

1. "The model was chosen and the cutoff fixed on April–June data; these six months were scored once, at the end."
2. "Referring 11.5% of applications catches 205 of the 518 defaults — 40% of them."
3. "Even counting every referral as a lost good customer, it is worth about ₹37 lakh over six months."
4. "Two caveats I'd put on the slide: a referral is not a rejection — the credit manager approves some — so the real
   gain depends on their decisions; and the model under-predicts this period by about a point, because gig
   applicants rose from 12% to 31%. I'd recalibrate on recent months before the next quarter."

**The follow-up chain.**
- "Why not refer 20%?" — "On validation, 20% gave less value than 10% (₹1.65 cr against ₹1.79 cr): too many good
  loans lost. The break-even for a calibrated model is p ≈ 0.184."
- "Is ₹36.9 lakh certain?" — "No; it is one six-month sample. I'd bootstrap the difference before a budget depends on
  it, and the real number depends on what credit managers do with the referrals."
- "What would make you switch it off?" — "PSI on key inputs above 0.25 that recalibration does not fix, or the
  referral rate exceeding what the credit team can review."`,
    mcqs: [
      mcq('Test PR-AUC is 0.287 against 0.264 on validation; the default rate rose from 7.1% to 8.5% and ROC-AUC went from 0.760 to 0.751. What should the candidate say?', [
        ['The ranking is about the same; PR-AUC rose mostly because defaults became more common', true],
        ['The model improved on newer data, which shows that it generalises better than expected', false],
        ['The model got worse, because any fall in ROC-AUC outweighs a rise in PR-AUC on its own', false],
        ['The test result is invalid, because the test period had a different default rate', false],
      ], 'The no-skill PR-AUC equals the positive rate, so a higher base rate lifts PR-AUC by itself. ROC-AUC barely moved, and the bootstrap interval on the test PR-AUC (0.250–0.327) is wide.'),
      mcq('A logistic regression one-hot encodes all three employment types (none dropped) with L2 regularisation. The salaried coefficient is −0.717 and the gig coefficient is −0.245. Which statement is correct?', [
        ['Gig applicants have about 1.6 times the odds of salaried ones, other features equal', true],
        ['Salaried applicants are 71.7% less likely to default than the average applicant in the data', false],
        ['Gig applicants are safer than average, because their coefficient is negative', false],
        ['The coefficients cannot be compared, because they were standardised separately', false],
      ], 'With every category kept, only differences between categories are meaningful: −0.245 − (−0.717) = 0.472, and e^0.472 ≈ 1.6 on the odds. A coefficient is a log-odds effect, not a probability change.'),
      mcq('The cutoff 0.148 was chosen on validation, where it referred 9.9% of applications. On the test period it refers 11.5%. What is the best reading?', [
        ['Test applicants were riskier, so more crossed the same risk level; check calibration', true],
        ['The cutoff is broken and should be raised until it refers exactly 10% again', false],
        ['The model is overfitted, because the share referred should never change', false],
        ['The data pipeline is faulty, because the referral share should be constant', false],
      ], 'A probability cutoff is a risk level, and the test mix had more gig applicants. The share moving is expected; whether the probabilities are still right (they are about a point low) is the real question.'),
      mcq('On test the model refers 706 applications, of which 205 default. A panellist asks what that means for the credit team. What is the strongest answer?', [
        ['About 29% of referrals would default — seven good files for every three bad, so refer, not reject', true],
        ['The model is wrong 71% of the time, so it should not be used for referral decisions at all', false],
        ['The precision is 29%, which is below 50% and so worse than a coin toss for each application', false],
        ['All 706 should be rejected, since each one has a predicted risk above the break-even level', false],
      ], 'Precision among referrals at a 10% rate is around 28–29% against an 8.5% base rate — over three times the average risk. That is why a credit manager reviews the file instead of an automatic rejection.'),
      mcq('Shifting the model\'s intercept by +0.137 in log-odds makes its mean test prediction match the 8.5% default rate. What does that change?', [
        ['The probabilities and the referrals at a fixed cutoff, but not ROC-AUC or PR-AUC', true],
        ['Both AUCs rise, because the predictions now match the actual default rate', false],
        ['Nothing at all, since adding a constant to every log-odds has no effect anywhere', false],
        ['Only the Brier score, which falls sharply because calibration is now perfect', false],
      ], 'Adding a constant keeps the order, so ranking metrics are unchanged; more applicants cross a fixed cutoff. On this data the Brier score moves only from 0.0693 to 0.0692, and groups such as the self-employed stay off.'),
    ],
    checkpoint: [
      ck(TE, 'A panellist says, "Random cross-validation gave 0.268 and your date split 0.264 — so the date split was pointless." What is the strongest reply?', [
        ['Both periods were before the mix shift; on the July–December test the gig share rose and calibration slipped', true],
        ['Random cross-validation is always optimistic, so the 0.268 figure must be wrong and should be ignored', false],
        ['The difference of 0.004 is significant at the 5% level, which proves the date split was necessary', false],
        ['Date splits are required by regulators for credit models, so no other choice was ever possible', false],
      ], 'The two numbers agree because training and validation share a stable mix. The date split earns its place where the future differs: gig applicants went from 12% to 31% in the test period and the model under-predicted.'),
      ck(TE, 'Asked "Is the model fair to first-time borrowers?", which answer uses the evidence best?', [
        ['They are under-predicted by about a point, like everyone in the test period: 8.9% vs 10.0% actual', true],
        ['Yes, because the new-to-credit flag gives them their own coefficient in the logistic model', false],
        ['No, because any applicant without a bureau score is treated as missing data by the pipeline', false],
        ['Yes, because the model has a ROC-AUC of 0.75, which is acceptable for every single group of applicants', false],
      ], 'Fairness is checked by comparing predictions and outcomes within the group. First-time borrowers are under-predicted by about the same margin as scored applicants (7.2% vs 8.0%), so the treatment of the missing score is not making them look safer.'),
      ck(TE, 'A credit head asks whether referring 11.5% of test applications was worth it. What should the candidate show?', [
        ['The rupee value with and without the cutoff on test, and the caveat that a referral is not a rejection', true],
        ['The test ROC-AUC of 0.751, since a value above 0.7 is enough to justify running any credit model', false],
        ['The number of applications referred, since a larger referral share means more risk was avoided', false],
        ['The training-set accuracy, since it is the figure with the most data behind it of all the metrics reported', false],
      ], 'At ₹9,000 per good loan and ₹40,000 per default, the cutoff is worth about ₹36.9 lakh over six months if referrals were declines. Credit managers approve some referrals, so the real value depends on their decisions.'),
    ],
  },

  /* ── MOCK_LOOP ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_PLACE_FS_MOCK_LOOP',
    notes: `One complete interview day for an **entry data scientist / ML engineer** role in India. Pay varies widely
by city, company and role, and you should check current figures for each company; as a rough orientation, entry DS
roles at product companies, fintechs and GCCs commonly offer more than analyst roles at service companies. Run it with a
friend or mentor as interviewer, in one day, with real timers. The shared Year-4 mocks rehearse aptitude, HR and
generic rounds; this strings the data-science version together. The SQL and statistics topics have their own
question banks — use them for rounds 0 and 2.

## Round 0 — Online assessment (90 min, proctored)

| Section | Time | What it is |
|---|---|---|
| Aptitude | 20 min | quant, logical, data interpretation |
| SQL | 20 min | two queries on a given schema |
| Python coding | 30 min | one or two problems: a metric, a from-scratch algorithm or records manipulation |
| ML and statistics MCQs | 20 min | overfitting, metrics, distributions, p-values |

**Sample coding task.** "Given (label, score) rows, print the AUC with ties as halves." — the metrics round's
problem. **Scored on:** passing hidden tests, not just the samples.

## Round 1 — ML technical (45 min)

1. "Your churn model is 95% accurate. Good?" → depends on the base rate: with 5% churners, predicting "no churn"
   for everyone is 95%. Ask for PR-AUC or recall at a contact budget, and a baseline.
2. "Random forest vs gradient boosting — when would each lose?" → forests average deep trees (variance down, can
   under-fit smooth additive signals); boosting fits residuals sequentially (strong, but overfits noisy labels
   without early stopping and a small learning rate).
3. "Explain regularisation to a product manager." → a penalty on complexity so the model does not memorise the
   training data; we choose its strength by validation.
4. "Train loss falls, validation loss rises after epoch 6. What do you do?" → early stopping at the best epoch, more
   data or augmentation, dropout or weight decay; check that the validation set is not different in kind.
5. "Your capstone in three minutes." → then two DEFEND_CAPSTONE follow-ups.

**Scored on:** correct, explained in plain words, trade-offs named, honest at the edge of knowledge.

## Round 2 — Statistics, probability and an ML case (45 min)

1. "A fraud model flags 2% of transactions. Fraud is 0.5% of transactions and the model catches 80% of it. What
   share of flags are fraud?" → caught fraud is 0.8 × 0.5% = 0.4% of transactions; 0.4% ÷ 2% = **20%**.
2. "Two fair dice, independent. Given at least one shows 6, what is the probability the sum is 7?" → 11 outcomes
   contain a 6; two of them, (1,6) and (6,1), sum to 7: **2/11**.
3. "An A/B test gives p = 0.03. What does that mean?" → if there were no true difference, a result at least this
   extreme would occur about 3% of the time. It is not the probability that the null is true.
4. **The case.** "Design a model that decides which new sellers on a marketplace get a fast-payout facility." →
   the decision and its costs; the label (chargebacks or disputes within 90 days — known late); features available
   at onboarding only; a baseline rule; PR-AUC plus rupee value at a cutoff; a holdout launch; monitoring for drift
   and for sellers gaming the inputs.

**Scored on:** structure, arithmetic aloud, assumptions stated, a recommendation with a guardrail.

## Round 3 — Hiring manager (30 min)

"Tell me about a time your model was wrong." "A product head wants the model live this week; you know the
validation is leaky — what do you do?" → say what the leak is, what the honest number is likely to be and how long
the fix takes; offer a safe interim (a rule-based baseline or a shadow launch); put it in writing. "What would you
build in your first 90 days here?" — have read their product.

**Scored on:** ownership, judgement under pressure, communication with non-technical people.

## Round 4 — HR (15 min)

"Why data science and not software development?", "Higher studies plans?", "Relocation, service agreement?",
"Expected CTC?". Answers consistent with the resume.

## Scoring sheet for the interviewer (1–4 per row)

| Row | 1 | 4 |
|---|---|---|
| Correctness | Errors not noticed | Correct, with checks unprompted |
| Explanation | Jargon, no structure | Plain words, one idea at a time |
| Evidence | "It worked well" | Numbers with baselines and uncertainty |
| Honesty | Bluffs | "I don't know — here is how I'd find out" |
| Composure | Stalls when challenged | Updates the answer and carries on |

## Debrief template (fill within an hour)

    Round / interviewer role:
    Questions asked, verbatim:
    Answered well — why:
    Weak or blank — the question + what a strong answer contains:
    Numbers I could not reproduce on the spot:
    Fix before the next loop (max 3, each with a date):`,
    mcqs: [
      mcq('Round 2: a fraud model flags 2% of transactions; fraud is 0.5% of all transactions and the model catches 80% of it. What share of flagged transactions are fraud?', [
        ['20%', true],
        ['80%', false],
        ['40%', false],
        ['0.4%', false],
      ], 'Caught fraud is 0.8 × 0.5% = 0.4% of all transactions, and flags are 2% of them, so 0.4 ÷ 2 = 20% of flags are fraud. 0.4% is the share of all transactions, not of flags.'),
      mcq('Two fair, independent dice are rolled. Given that at least one shows a 6, what is the probability that the sum is 7?', [
        ['2/11', true],
        ['1/6', false],
        ['1/11', false],
        ['2/36', false],
      ], 'Eleven of the 36 equally likely outcomes contain a 6. Of those, (1, 6) and (6, 1) sum to 7, so the conditional probability is 2/11. 1/6 is the unconditional probability of a 7.'),
      mcq('In the ML round, the interviewer says, "Our churn model is 95% accurate." What should the candidate ask first?', [
        ['What share of customers churn, and how a do-nothing baseline scores', true],
        ['Which library was used to train the model and with what version', false],
        ['Whether the model used gradient boosting or a deep neural network', false],
        ['How many features were used, since more features mean more accuracy', false],
      ], 'With 5% churners, predicting "no churn" for everyone is 95% accurate. The base rate and a baseline decide whether 95% means anything; the library and model type do not.'),
      mcq('The hiring manager asks: "A product head wants the model live this week, and you know its validation is leaky." Which answer scores best?', [
        ['Explain the leak and the likely honest number, offer a safe interim, and put it in writing', true],
        ['Ship it as asked, since the product head owns the decision and the deadline', false],
        ['Refuse to ship anything until the full pipeline has been rebuilt from scratch', false],
        ['Ship it quietly and fix the leak in the next release before anyone notices', false],
      ], 'Ownership means making the risk visible with numbers and offering an option — a rule-based baseline or a shadow launch — rather than silent compliance or a flat refusal.'),
      mcq('After the mock loop, Priya\'s debrief says "ML round was hard". Which rewrite is most useful?', [
        ['"Missed: when boosting loses to forests; fix by 18 Nov with 3 written answers"', true],
        ['"ML round was hard; I will revise the whole of machine learning again this week"', false],
        ['"The ML interviewer asked questions that were beyond the fresher level"', false],
        ['"I was nervous in the ML round, so next time I will try to stay calmer"', false],
      ], 'A useful debrief names the exact question, the missing idea and a dated fix. Revising everything, blaming the questions or noting nerves gives nothing specific to practise.'),
    ],
  },

  /* ── CHECKPOINT ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_PLACE_FS_CHECKPOINT',
    notes: `This checkpoint measures the judgement a data-science hiring panel looks for: a resume whose every number
survives a question, a portfolio a recruiter can check in a minute, a capstone defended past the slides, and
composure across the interview day.

Recall the rules of this topic:
- **Every metric has a baseline and a base rate** — and, where it matters, an interval.
- **Every claim is checkable** — a repository, a test run, a model card, a demo on data you may publish.
- **Say what the data cannot tell you** — then how you would find out.

Each question is a scenario. Pick what a strong candidate would actually do.`,
    checkpoint: [
      ck(PR, 'Aditya\'s skills line reads "Python, ML, DL, NLP, CV, Big Data, Spark, AWS, GenAI". His projects use scikit-learn, PyTorch for one transfer-learning task, FastAPI and an LLM API. What should he do?', [
        ['List the tools his projects prove, in the JD\'s spellings, and drop Spark, AWS and Big Data', true],
        ['Keep the line as it is, since broad keywords help the resume pass more automated filters', false],
        ['Replace the line with a paragraph about his passion for artificial intelligence and data', false],
        ['Add a self-rating out of five next to each skill so recruiters can see his relative strengths', false],
      ], 'Each listed skill becomes a question in round 2. Naming what the projects show — scikit-learn pipelines, PyTorch transfer learning, FastAPI, LLM evaluation — is honest and matches more specific searches.'),
      ck(PR, 'A GCC posts "Associate Data Scientist: Python, SQL, ML, model validation, stakeholder communication". Which bullet fits it best?', [
        ['"Chose a loan cutoff from rupee values on a date-based validation set and explained it to credit"', true],
        ['"Used 14 Python libraries, including pandas, NumPy, scikit-learn, SHAP, MLflow and FastAPI"', false],
        ['"Achieved 94% accuracy on the default prediction task, beating all of my classmates\' models"', false],
        ['"Passionate about machine learning, with strong analytical skills and a keen eye for detail"', false],
      ], 'The JD asks for validation and communication; the bullet shows both with a concrete decision. A library list, an accuracy that ignores the base rate, or adjectives show neither.'),
      ck(PR, 'Kavya has a strong Kaggle tabular result and a deployed capstone. For a fintech DS role with one project slot, which should lead?', [
        ['The capstone: a business decision, an honest split, a deployed model and its limits', true],
        ['The Kaggle result, since a leaderboard rank is an objective comparison with others', false],
        ['Both merged into one bullet, so the slot holds as many separate achievements as possible', false],
        ['Neither; a fresher resume should lead with coursework grades instead of projects', false],
      ], 'A fintech panel hires for judgement on a real decision: target definition, leakage, validation, deployment and value. A leaderboard rank shows modelling skill on a fixed split someone else designed.'),
      ck(PE, 'A reviewer clones Nikhil\'s capstone repository. Which state helps most?', [
        ['A README with results first, notebooks that run top to bottom, tests that pass, a model card', true],
        ['Notebooks with outputs cleared, so that the repository is as small as it can possibly be', false],
        ['One long notebook holding every experiment he tried, so nothing at all is left out', false],
        ['A zip of the trained model only, since the model is the real deliverable of the whole project', false],
      ], 'Reviewers read before they run. Results first, reproducible notebooks with outputs, passing tests and a model card let them check each claim in minutes.'),
      ck(PE, 'Swathi\'s resume says "LLM extraction improved the model". Which evidence backs it properly?', [
        ['Accuracy on hand labels made first, and the lift with a paired-bootstrap interval', true],
        ['Twenty example extractions in the README that read correctly to her by eye', false],
        ['The LLM\'s own confidence scores, averaged over every note it processed', false],
        ['A screenshot of the LLM provider\'s dashboard showing the number of calls made', false],
      ], 'Two measurements answer the two claims: the extraction is right (against human labels), and the model is better (with an interval on the difference). The others measure neither.'),
      ck(TE, 'A panellist says, "Your test PR-AUC is higher than validation, so the model improved over time." The test default rate is higher too. What should the candidate reply?', [
        ['PR-AUC rises with the base rate; ROC-AUC barely moved, so the ranking is about the same', true],
        ['Agree, since the test set came later and the model clearly learned from the newer data', false],
        ['Disagree, since the test score must be lower than validation for any properly built model', false],
        ['Agree, and add that the model should now be retrained with a lower cutoff to use the gain', false],
      ], 'A no-skill model\'s PR-AUC equals the positive rate, so a rise from 7.1% to 8.5% defaults lifts PR-AUC on its own. Comparing against the no-skill level, or ROC-AUC, removes that effect.'),
      ck(TE, 'Asked to interpret a FOIR coefficient of +0.632 on a standardised feature whose standard deviation is 0.267, what should the candidate say?', [
        ['Each 0.267 increase in FOIR multiplies the odds of default by about 1.88, others fixed', true],
        ['Each 1-point increase in FOIR raises the probability of default by 63.2 percentage points', false],
        ['FOIR explains 63.2% of the variation in defaults, making it the most important feature', false],
        ['FOIR is significant at the 5% level, because its coefficient is larger than 0.5 in size', false],
      ], 'A logistic coefficient is a change in log-odds per unit of the input — here one standard deviation. e^0.632 ≈ 1.88 on the odds; it is neither a probability change nor a share of variance.'),
      ck(TE, 'A panellist asks why the deployed model "refers" rather than "rejects" applications above the cutoff. What is the best answer?', [
        ['About 29% of referrals default, so most are good loans that a credit manager should see', true],
        ['Rejecting applications would need a deep learning model, which the project did not include', false],
        ['Regulators forbid any model from influencing a lending decision in any way at all', false],
        ['Referring is easier to code, since rejection needs a second API endpoint and database', false],
      ], 'At a 10% referral rate, precision is around 28–29%: three defaulters for every seven good customers. A human review keeps the good ones while the model focuses attention.'),
      ck(IP, 'In the ML round, Ravi realises halfway through an answer that he stated the bias–variance trade-off backwards. What should he do?', [
        ['Stop, say he got it backwards, and give the corrected explanation', true],
        ['Carry on, since correcting himself would make him look unprepared', false],
        ['Change the topic to his capstone, where he is more comfortable', false],
        ['Wait to see whether the interviewer noticed before saying anything', false],
      ], 'Interviewers score self-correction highly: it shows the checking habit they want at work. Ploughing on or changing the subject leaves a wrong answer on the record.'),
      ck(IP, 'In the case round, the interviewer challenges Meera\'s choice of a 90-day chargeback label as "too slow". What is the best response?', [
        ['Agree it is slow, propose an earlier proxy label, and say what it costs in accuracy', true],
        ['Defend 90 days firmly, since changing the label would show that the plan was weak', false],
        ['Drop the label and suggest an unsupervised anomaly model with no labels at all', false],
        ['Ask the interviewer to choose the label, so that the answer matches what they want to hear', false],
      ], 'A challenge tests whether the structure adapts. An early proxy (a first dispute within 30 days) with its trade-off named keeps the design and shows judgement.'),
    ],
  },
];
