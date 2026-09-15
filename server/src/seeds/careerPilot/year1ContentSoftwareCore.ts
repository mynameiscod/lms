/**
 * The software core, applied — eight practical units across Programming, C, DSA, Databases and
 * Developer Tools.
 *
 * ── WHY THESE UNITS, AND WHO THEY ARE FOR ─────────────────────────────────────────────────
 *
 * SOFTWARE_BACKEND has no direction module of its own: by frozen policy it is served by the
 * universal software core. A learner who has already demonstrated that core is therefore left
 * with its practical work and nothing else, and Phase 21 measured that running out a week short.
 * These eight units are that practical work — six fault families that the existing debugging
 * units do not cover, and two artefacts nobody had asked a first-year to produce.
 *
 * ── THE LINE THESE UNITS HOLD ─────────────────────────────────────────────────────────────
 *
 * Each unit is a DIFFERENT failure from its nearest neighbour, not a harder copy of it:
 *
 * - a loop that ends with the wrong answer, where T_LOOPS_INFINITE_LOOPS never ends;
 * - a query that returns confident wrong totals, where T_SQL_DEBUGGING returns nothing;
 * - correct code that is too slow, where T_ARRAYS_DEBUGGING is about wrong indices;
 * - remote and branch-state mishaps, where T_GIT_CONFLICTS resolves a merge;
 * - C strings specifically, which T_C_BASICS_DEBUGGING mentions only in passing;
 * - a schema diagnosed from its anomalies, where T_SQL_MINI_PROJECT designs one from scratch;
 * - tests pinned to a specification, where T_FUNCTIONS_MINI_PROJECT builds and
 *   T_FUNCTIONS_REFACTORING restructures;
 * - a workspace that works for somebody other than its author, which no T_EDITOR unit asks for.
 *
 * Every unit here is single-skill, so no question names a skillKey.
 */

import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string, skillKey?: string,
): PilotMcq => ({
  question,
  options: options.map(([text, isCorrect]) => ({ text, isCorrect })),
  explanation,
  ...(skillKey ? { skillKey } : {}),
});

export const SOFTWARE_CORE_BUNDLES: PilotBundle[] = [
  // ─────────────────────────────────────────────────────────────────────────────────────────
  // T_LOOPS — a loop that ends with the wrong answer
  // ─────────────────────────────────────────────────────────────────────────────────────────
  {
    unitCode: 'T_LOOPS_ALMOST_RIGHT_DEBUGGING',
    notes: `A loop that never ends gets noticed within seconds. A loop that ends with 45 instead of 55
gets handed in. This unit is about the second kind: the loop terminates, the output looks
reasonable, and it is wrong.

**The method.** Do not reread the code hoping to spot it — you will read it as you meant it. Make
the loop show you what it actually did.

1. **Find the smallest input that gives a wrong answer**, and work out the right answer by hand.
2. **Print one line per pass**, at the end of the loop body, showing the loop variable and every
   accumulator:

        print(f"i={i} total={total}")

3. **Check three things in that trace:** how many passes there were, what the first and last
   loop values were, and whether each accumulator grew steadily or kept starting again.

The shape of the wrong answer usually names the fault before you find the line.

**One pass too few or too many → the range.** \`range(1, 10)\` stops before 10, so summing 1 to 10
with it gives 45, and the trace's last line shows \`i=9\`. Compare the first and last values in the
trace with the ones the problem needs, rather than trusting how the bound looks.

**The result is only the last item's contribution → an accumulator reset inside the loop.**

    for mark in marks:
        total = 0              # starts again on every pass
        total = total + mark

The trace shows \`total\` equal to \`mark\` on every line. Move the initialisation above the loop.

**Some items skipped, always the one after an item you removed → the list changed while it was
being iterated.**

    words = ["a", "", "", "b"]
    for w in words:
        if w == "":
            words.remove(w)    # leaves ["a", "", "b"]

Removing shifts the next item back into the position the loop has already passed, so it is never
examined. Build a new list instead, \`words = [w for w in words if w != ""]\`, or loop over a copy
with \`for w in words[:]\`.

**"Not found" printed several times, or next to "found" → an \`else\` in the wrong place.**

    for name in names:
        if name == target:
            print("found")
            break
        else:
            print("not found")   # runs for every name that does not match

Python's \`for ... else\` runs its \`else\` once, and only if the loop finished WITHOUT a
\`break\`. Indent the \`else\` level with the \`for\`, not with the \`if\`.

**Values after an inner loop are wrong → the inner loop reuses the outer loop's variable.**

    for i in range(3):
        for i in range(2):
            pass
        print(i)                 # prints 1, 1, 1 rather than 0, 1, 2

A Python \`for\` takes its next value from its own range, so the outer loop still runs three times —
but everything after the inner loop sees the inner loop's last value. In a \`while\` loop with a
counter you update by hand, or in C, the same reuse also changes how many times the outer loop runs.
Give every loop its own name.

**Why the trace wins.** The first line where the trace disagrees with your prediction is the bug,
and you did not have to guess which of five faults to look for.`,
    coding: [{
      title: 'Four faults in a loop that finishes',
      description: `This program reads a line of integers and should print three lines: the total of all the numbers; the numbers with every negative removed, in their original order; and the position, counting from 1, of the first zero, or \`none\` if there is no zero.

It runs to the end, and every line it prints can be wrong. There are four faults, each one from this unit. For each, predict the symptom on the input \`4 -1 -2 0 5\` before changing anything, then make the smallest fix.

For \`4 -1 -2 0 5\` the correct output is \`6\`, then \`4 0 5\`, then \`4\`.`,
      starter: `nums = [int(x) for x in input().split()]

for i in range(1, len(nums)):
    total = 0
    total = total + nums[i]
print(total)

kept = list(nums)
for n in kept:
    if n < 0:
        kept.remove(n)
print(" ".join(str(n) for n in kept))

for i in range(len(nums)):
    if nums[i] == 0:
        print(i + 1)
        break
    else:
        print("none")
`,
      language: 'python',
      tests: [
        { input: '4 -1 -2 0 5', expectedOutput: '6\n4 0 5\n4' },
        { input: '4 7 1', expectedOutput: '12\n4 7 1\nnone' },
        { input: '-5 -6 2 0 0', expectedOutput: '-9\n2 0 0\n4', isHidden: true },
        { input: '0', expectedOutput: '0\n0\n1', isHidden: true },
        { input: '1 -3 -3 -3 8', expectedOutput: '0\n1 8\nnone', isHidden: true },
      ],
    }],
    mcqs: [
      mcq('`total = 0` then `for i in range(1, 10): total += i` prints 45, but the task was to add 1 to 10. What went wrong?',
        [['The range stops before 10, so the last number is never added', true],
          ['The accumulator should start at 1, because the loop starts at 1', false],
          ['`+=` adds the previous total again, so some values are doubled', false],
          ['The loop runs ten times, but its first pass is silently skipped', false]],
        'range(1, 10) produces 1 to 9, whose sum is 45. range(1, 11) includes 10 and gives 55.'),
      mcq('The count printed after a loop is always 1 when the last mark in the list passed, and 0 when it failed. What should you check first?',
        [['Whether `count = 0` sits inside the loop body', true],
          ['Whether the comparison uses `>=` rather than `>`', false],
          ['Whether the list is sorted before it is counted', false],
          ['Whether the marks were read in the right order', false]],
        'A result that reflects only the last item means the accumulator is being reset on every pass, so only the final pass survives.'),
      mcq('`for w in words: if w == "": words.remove(w)` leaves one empty string behind in `["a", "", "", "b"]`. Why?',
        [['Removing shifts the next item into the slot the loop just passed', true],
          ['`remove` deletes the last matching item rather than the first one', false],
          ['Empty strings stop comparing equal to "" once they are in a list', false],
          ['The loop works on a copy made at the start, so removals are lost', false]],
        'After the first empty string is removed, the second slides into its position and the loop moves on past it. Build a new list, or iterate over words[:].'),
      mcq('A search prints `not found` three times and then `found`. Its `else` is indented under the `if` inside the loop. What is the fix?',
        [['Align the `else` with the `for`, so it runs only when no break happened', true],
          ['Add a `continue` after the not-found message to skip the rest of the body', false],
          ['Replace `break` with `return`, so the else branch can never be reached', false],
          ['Move the `break` above the found message, so the loop exits sooner', false]],
        'An else attached to the if runs for every non-matching item. A for ... else runs once, and only when the loop ended without a break.'),
    ],
    checkpoint: [
      mcq('`for i in range(3):` contains `for i in range(2):`, and a `print(i)` placed after the inner loop shows 1, 1, 1. What is happening?',
        [['The inner loop reuses `i`, so `i` holds its last value, 1', true],
          ['The outer loop is running once and printing three times', false],
          ['`range(2)` restarts the outer range from its beginning', false],
          ['`print` shows the value `i` had before the outer loop began', false]],
        'The outer for still takes 0, 1 and 2 from its own range, so it runs three times, but after each inner loop i is 1. Renaming the inner variable fixes it.'),
      mcq('A loop ends with a plausible but wrong total. What is the most effective first step?',
        [['Trace the smallest failing input pass by pass against a prediction', true],
          ['Rewrite it as a while loop, which makes the counter fully explicit', false],
          ['Run it on a much larger input, so the error becomes more obvious', false],
          ['Add a break after the first pass, so only one value is processed', false]],
        'The first pass where the traced values disagree with your prediction is the bug. A larger input hides the pattern rather than revealing it.'),
      mcq('A function averaging a list returns exactly the last number divided by the length of the list. Which fault fits that symptom?',
        [['The total is reset to zero inside the loop', true],
          ['The range stops one item before the end of the list', false],
          ['The list is being changed while the loop runs over it', false],
          ['The loop\'s else branch runs after every single item', false]],
        'Only the last pass\'s addition survives a reset inside the loop. A range one short would give the sum of all but the last item instead.'),
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────────────────
  // T_SQL — plausible totals that are wrong
  // ─────────────────────────────────────────────────────────────────────────────────────────
  {
    unitCode: 'T_SQL_JOIN_DEBUGGING',
    notes: `A query that returns nothing gets investigated. A query that returns a tidy table of wrong
numbers gets pasted into a report. Nothing errors, so the only defence is a method.

These three tables are used throughout:

    students           fees                         enrolments
    | id | name  |     | id | student_id | amount |  | student_id | course |
    |  1 | Asha  |     |  1 |          1 |   5000 |  |          1 | DBMS   |
    |  2 | Ravi  |     |  2 |          1 |   3000 |  |          1 | Python |
    |  3 | Meera |     |  3 |          2 |   4000 |  |          2 | DBMS   |

By hand: Asha paid 8000 and takes 2 courses, Ravi paid 4000 and takes 1, Meera has paid nothing
and takes none.

**The method.**

1. **Say what one result row should be** — "one row per student" — and work out one entity's
   numbers by hand.
2. **Remove the GROUP BY and the aggregates**, filter to that entity, and look at the rows the
   aggregate would have received. Two fee rows expected and four present means the join multiplied
   them.
3. **Compare row counts with the base table.** A per-student report with fewer rows than
   \`students\` has dropped somebody.
4. **Ask what each aggregate does with NULL.**

**Fan-out: totals exactly doubled.**

    SELECT s.name, SUM(f.amount) AS paid, COUNT(e.course) AS courses
    FROM students s
    JOIN fees f       ON f.student_id = s.id
    JOIN enrolments e ON e.student_id = s.id
    GROUP BY s.id, s.name;

Asha comes back with 16000 and 4 courses. Each of her 2 fee rows pairs with each of her 2
enrolments, making 4 rows, so every amount and every course is counted twice. Ravi, with one of
each, is correct — which is why this survives testing on tidy data. Aggregate each table on its
own, then join the totals:

    SELECT s.name, COALESCE(f.paid, 0) AS paid, COALESCE(e.courses, 0) AS courses
    FROM students s
    LEFT JOIN (SELECT student_id, SUM(amount) AS paid
               FROM fees GROUP BY student_id) f ON f.student_id = s.id
    LEFT JOIN (SELECT student_id, COUNT(*) AS courses
               FROM enrolments GROUP BY student_id) e ON e.student_id = s.id;

That gives 8000 and 2, 4000 and 1, and 0 and 0. \`SUM(DISTINCT f.amount)\` is not a fix: two genuine
payments of the same amount would be counted once.

**An INNER JOIN silently dropping rows.** The fan-out query has no row for Meera at all, because an
inner join keeps only students with a match in every joined table. A report "for every student"
needs LEFT JOINs.

**COUNT(*) after a LEFT JOIN.**

    SELECT s.name, COUNT(*) AS payments
    FROM students s LEFT JOIN fees f ON f.student_id = s.id
    GROUP BY s.id, s.name;

Meera gets 1. The LEFT JOIN gave her one row with NULL fee columns, and \`COUNT(*)\` counts rows.
\`COUNT(f.id)\` counts non-NULL values and gives her 0.

**AVG skipping NULLs.** After a LEFT JOIN, \`SUM(f.amount)\` for Meera is NULL, not 0. Averaging the
per-student totals then gives (8000 + 4000) / 2 = 6000, when the average per student is
12000 / 3 = 4000. \`COALESCE(SUM(f.amount), 0)\` makes her count as zero.

**Grouping by the wrong column.** \`GROUP BY s.name\` merges two different students who share a name
into one row holding both their fees. Adding \`f.amount\` to the GROUP BY to silence an error gives
one row per student per distinct amount. Group by the key of the thing a row describes, \`s.id\`,
and carry the name alongside it.`,
    mcqs: [
      mcq('A query joins customers to orders and to support tickets, then sums order amounts per customer. Customer 1 has 3 orders totalling 900 and 2 tickets. What total is reported for them?',
        [['1800', true], ['900', false], ['2700', false], ['5400', false]],
        'Each order row is paired with both tickets, making 6 rows in which every order amount appears twice, so 900 becomes 1800.'),
      mcq('A LEFT JOIN from customers to orders, grouped per customer with `COUNT(*)`, shows 1 for a customer who has never ordered. What fixes it?',
        [['Count `o.id`, which is NULL on the unmatched row', true],
          ['Use an INNER JOIN, so that customer keeps a count', false],
          ['Add `WHERE o.id IS NOT NULL` to keep every customer', false],
          ['Group by the name alone, so the extra row is merged', false]],
        'The LEFT JOIN produces one row of NULLs for the customer, and COUNT(*) counts that row. COUNT of a column skips NULLs and gives 0.'),
      mcq('Per-student fee totals from a LEFT JOIN are 8000, 4000 and NULL for a student who paid nothing. Which expression gives the true average per student, 4000?',
        [['`AVG(COALESCE(paid, 0))`', true],
          ['`AVG(paid)`', false],
          ['`SUM(paid) / COUNT(paid)`', false],
          ['`COALESCE(AVG(paid), 0)`', false]],
        'AVG skips the NULL and divides 12000 by 2, giving 6000. Replacing NULL with 0 before averaging divides by all 3 students.'),
      mcq('A dashboard reports 212 students, but `SELECT COUNT(*) FROM students` returns 240. The dashboard query joins students to fee payments. What is the likeliest cause?',
        [['The inner join drops the 28 students with no payment rows', true],
          ['COUNT(*) on the students table counts the NULL rows twice', false],
          ['The join merged 28 pairs of students who share an email', false],
          ['Twenty-eight payment rows belong to students counted twice', false]],
        'An inner join keeps only students with at least one matching payment. Comparing against the base table\'s count is how the loss is spotted.'),
    ],
    checkpoint: [
      mcq('Two different students are both named Priya. A fees report uses `GROUP BY s.name`. What does it show for them?',
        [['One Priya row holding both students\' fees added together', true],
          ['Two Priya rows, because their ids are different values', false],
          ['An error, because the name column is not a unique key', false],
          ['Only the Priya with the lower id, with her own fees only', false]],
        'Grouping by name treats equal names as one group. Grouping by s.id, with the name alongside, keeps different people apart.'),
      mcq('Before trusting a total from a join, what is the quickest check that the join has not multiplied rows?',
        [['Run it ungrouped for one entity and count that entity\'s rows', true],
          ['Add DISTINCT inside SUM, so that repeated amounts are ignored', false],
          ['Add an index on the join columns and then run the query again', false],
          ['Switch every join to a LEFT JOIN and compare the two totals', false]],
        'If one student should contribute two fee rows and the ungrouped query shows four, the join has fanned out before the aggregate ran.'),
      mcq('A join doubled every fee row, so somebody changes `SUM(f.amount)` to `SUM(DISTINCT f.amount)`. Why is that not a real fix?',
        [['Two genuine payments of the same amount would be counted once', true],
          ['DISTINCT is not allowed inside an aggregate function in SQL', false],
          ['DISTINCT removes NULLs, which the total still needs to include', false],
          ['It still doubles the total, because DISTINCT is applied last', false]],
        'DISTINCT removes equal values, not duplicated rows. The fix is to aggregate the fees on their own before joining.'),
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────────────────
  // T_ARRAYS — correct and too slow
  // ─────────────────────────────────────────────────────────────────────────────────────────
  {
    unitCode: 'T_ARRAYS_COMPLEXITY_DEBUGGING',
    notes: `A solution that passes the examples and fails with "Time Limit Exceeded" is correct and too
slow. The fix is rarely a clever new algorithm. It is finding the one line that does far more work
than it looks like, and replacing it without changing the answer.

**Step 1 — estimate before you optimise.** Read the input limits and multiply. A common rule of
thumb is about 10^8 simple operations per second in a compiled language such as C++. Python manages
far fewer, so for a one-second limit budget roughly 10^6 to 10^7.

| n | O(n) | O(n log n) | O(n²) |
|---|---|---|---|
| 10^3 | 10^3 | about 10^4 | 10^6 |
| 10^5 | 10^5 | about 1.7 × 10^6 | 10^10 |

At n = 10^5, anything quadratic is hopeless in every language. A timeout there means a hidden
quadratic, not a slow constant.

**Step 2 — find the hidden loop.** For every line inside a loop, ask what it costs on a list of
length n. The usual suspects:

- \`x in some_list\`, \`some_list.index(x)\`, \`some_list.count(x)\` — each scans the list.
- \`some_list.remove(x)\`, \`insert(0, x)\`, \`pop(0)\` — each shifts every later element.
- \`text = text + piece\` — builds a new string by copying the old one.
- \`sorted(...)\` or \`.sort()\` — O(n log n) every time it runs.
- \`sum(arr[:i])\`, \`max(arr)\`, any slice — each touches up to n items.

One of these inside a loop of n passes is O(n²), while the source still looks like a single loop.

**Step 3 — replace it with something built once.**

| Slow inside a loop | Replacement |
|---|---|
| \`x in list\` | a \`set\`, with O(1) average membership |
| \`list.index(x)\` | a \`dict\` from value to position |
| \`pop(0)\` | \`collections.deque\` and \`popleft()\` |
| string \`+\` | a list of pieces, then one \`"".join(parts)\` |
| sorting to find the largest | a running maximum |
| \`sum(arr[:k])\` per query | prefix sums |
| nested loops over sorted data | two pointers |

**Worked example.** n numbers, then q queries, each asking for the sum of the first k numbers, with
n and q up to 10^5.

    for k in queries:
        print(sum(arr[:k]))          # up to 10^5 × 10^5 = 10^10 steps

Build prefix sums once, where \`prefix[i]\` is the sum of the first i numbers:

    prefix = [0]
    for x in arr:
        prefix.append(prefix[-1] + x)
    for k in queries:
        print(prefix[k])             # O(1) per query

\`prefix\` has n + 1 entries: \`prefix[0]\` is 0 and \`prefix[n]\` is the whole total. Dropping that
leading zero is the off-by-one this fix usually introduces.

**Step 4 — prove the answer did not change.** Fast and wrong is worse than slow and right. Keep the
slow version, run both on a few hundred small random inputs, and compare. The classic breakages: a
\`set\` throws away duplicates when the count of each value mattered, and
\`{v: i for i, v in enumerate(arr)}\` keeps the LAST position of a repeated value when the first was
required.`,
    mcqs: [
      mcq('n is up to 200,000, the limit is one second, and your Python solution compares every pair. Roughly how many comparisons is that, and is it viable?',
        [['About 2 × 10^10, far beyond the budget', true],
          ['About 4 × 10^5, comfortably within budget', false],
          ['About 2 × 10^8, fine on a fast judge machine', false],
          ['About 4 × 10^10, but fine if each check is simple', false]],
        'n squared over 2 is (2 × 10^5)² / 2 = 2 × 10^10. Python manages around 10^6 to 10^7 simple operations a second, so no constant saves it.'),
      mcq('This times out when both lists hold 100,000 items: `for x in queries: if x in seen_list: hits += 1`. What is the fix?',
        [['Build `seen = set(seen_list)` once, before the loop', true],
          ['Sort `seen_list` inside the loop before each check', false],
          ['Use `seen_list.index(x)` inside a try block instead', false],
          ['Loop over indices instead of values, to avoid the copies', false]],
        'Membership in a list scans it, making the loop quadratic. A set built once answers each check in constant time on average.'),
      mcq('For each of q queries a program prints `sum(arr[:k])`. With n and q both 10^5 it times out. What should replace the repeated sum?',
        [['A prefix-sum list built once and read as `prefix[k]`', true],
          ['`total - sum(arr[k:])`, computed afresh for each query', false],
          ['Sorting `arr` first, so each slice is cheaper to add up', false],
          ['A dict caching each answer, keyed by the query value k', false]],
        'The subtraction still scans a slice per query, and a cache only helps repeated k. Prefix sums make every query a single lookup.'),
      mcq('A loop runs `out = out + str(x) + " "` for 200,000 numbers and is slow. What is the standard fix?',
        [['Append each piece to a list, then join the list once', true],
          ['Convert every number with `repr` instead of `str`', false],
          ['Build the string backwards so each addition is short', false],
          ['Wrap the loop body in a function so that it runs compiled', false]],
        'Each + builds a new string by copying everything so far. Collecting the pieces and calling " ".join once copies each character once.'),
    ],
    checkpoint: [
      mcq('A queue simulation calls `items.pop(0)` in a loop over 10^5 items and times out. Which change keeps the order and removes the hidden cost?',
        [['`collections.deque` with `popleft()`', true],
          ['`items.pop()`, taking from the end instead', false],
          ['`items.remove(items[0])`, avoiding the pop call', false],
          ['`del items[0]`, which does not return the item', false]],
        'Removing from the front of a list shifts every remaining element. A deque removes from either end in constant time, and pop() would reverse the order.'),
      mcq('To speed up "index of the first occurrence of each query value", you build `pos = {v: i for i, v in enumerate(arr)}`. Tests with repeated values now fail. Why?',
        [['A later duplicate overwrites the earlier index in the dict', true],
          ['Python dictionaries do not keep keys in insertion order', false],
          ['enumerate counts from 1, so every stored index is shifted by one', false],
          ['Dictionary lookups scan every key, so the index is stale', false]],
        'Each repeat reassigns the key, leaving the last position. Store a value only when it is not already in the dict.'),
      mcq('Each time a score is added, the code runs `best = sorted(scores)[-1]`. Over n additions, what does that cost, and what should replace it?',
        [['At least quadratic overall; keep a running maximum instead', true],
          ['Linear overall, since sorting nearly sorted data is quick', false],
          ['Logarithmic, because the largest value is already at the end', false],
          ['Quadratic, and a nested loop over the scores would be faster', false]],
        'sorted copies and sorts the whole list on every addition. Comparing each new score with the best so far is one step per addition.'),
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────────────────
  // T_GIT — remote and branch-state mishaps
  // ─────────────────────────────────────────────────────────────────────────────────────────
  {
    unitCode: 'T_GIT_REMOTE_DEBUGGING',
    notes: `Remote and branch mishaps are frightening because the fixes people reach for in a panic —
force, reset, delete the folder and clone again — are the ones that destroy work. Almost every one
is safe to fix once you read the message and look at where things point.

**The method, every time.**

1. **Read the whole message**, especially the words in brackets and any \`hint:\` lines. Git
   usually names the problem exactly.
2. **Look before acting:**

        git status
        git fetch origin
        git log --oneline --graph --all -15

   \`git status\` says which branch you are on and how it compares with its remote. The graph shows
   where \`HEAD\`, \`main\` and \`origin/main\` point. \`fetch\` downloads without changing your files.
3. **Prefer the fix that adds over the fix that rewrites** whenever anybody else has the commits.

**Push rejected.**

    ! [rejected]        main -> main (fetch first)
    ! [rejected]        main -> main (non-fast-forward)

Both mean the remote branch has commits yours does not, so accepting your push would throw them
away. Fetch, integrate, then push:

    git fetch origin
    git merge origin/main        # or: git rebase origin/main
    git push origin main

Rebase only commits nobody else has yet. **Never \`git push --force\` to a shared branch.** When you
genuinely must rewrite your own feature branch, \`git push --force-with-lease\` refuses if the remote
has moved since you last fetched.

**Diverged.** \`git status\` says your branch and \`origin/main\` "have diverged, and have 2 and 3
different commits each". You have 2 commits the remote lacks, and it has 3 you lack. Recent
versions of Git stop a plain \`git pull\` here and ask how to reconcile: \`git pull --no-rebase\`
merges, and \`git pull --rebase\` replays your 2 on top of theirs.

**Detached HEAD.** \`git checkout\` of a commit hash or a tag puts you on no branch, and \`git status\`
says \`HEAD detached at 4e1f2a9\`. Commits made there belong to no branch, and switching away leaves
them behind. Before leaving, give them one:

    git switch -c rescue-work

Already switched away? \`git reflog\` lists every position \`HEAD\` has had, with hashes. Find the
commit and point a branch at it with \`git branch rescue-work 4e1f2a9\`. Unreachable commits are
kept for weeks by default, so this works long after the mistake.

**Committed on main instead of a feature branch, not yet pushed.** Make sure \`git status\` is clean,
because \`reset --hard\` discards uncommitted changes, then:

    git branch feature/login       # a branch pointing at your commits
    git reset --hard origin/main   # move main back to the remote's position
    git switch feature/login

The commits are safe on \`feature/login\` before \`main\` moves. If they were already pushed to a
shared \`main\`, do not reset; agree a fix with the team, usually \`git revert\`.

**Wrong remote or failed authentication** — the message says which:

- \`Repository not found\` → a typo in the URL, or an account without access. Check
  \`git remote -v\`, then \`git remote set-url origin <correct-url>\`.
- \`Authentication failed\` over HTTPS → GitHub does not accept account passwords for Git
  operations; use a personal access token, or switch the remote to SSH.
- \`Permission denied (publickey)\` → no SSH key, or one not added to your account;
  \`ssh -T git@github.com\` tests it.
- \`Permission to team/app.git denied to <user>\` with a 403 → you are signed in as an account
  without write access, often an old saved credential.`,
    mcqs: [
      mcq('`git push` fails with `! [rejected] main -> main (fetch first)`. Which sequence is right?',
        [['Fetch, integrate origin/main, then push again', true],
          ['Push with --force, since your copy is the newest', false],
          ['Reset --hard to origin/main, then push your work', false],
          ['Clone the repository again and push from the clone', false]],
        'The remote has commits you do not. Integrating them first makes your push a fast-forward; forcing would delete them, and resetting would discard yours.'),
      mcq('`git status` says your branch and origin/main have diverged, with 2 and 3 different commits each. What does that mean?',
        [['You have 2 commits the remote lacks, and it has 3 you lack', true],
          ['Your branch is 2 commits behind and 3 commits ahead of it', false],
          ['Five files differ between your copy and the remote branch', false],
          ['The remote rejected 2 of your 5 most recent commits so far', false]],
        'The first number is your side and the second is theirs. Both sides moved, so a merge or a rebase is needed before you can push.'),
      mcq('You checked out an old commit, made two commits, and `git status` says `HEAD detached at 4e1f2a9`. How do you keep that work?',
        [['Run `git switch -c keep-work` before switching anywhere', true],
          ['Run `git switch main`, and the commits come along with you', false],
          ['Run `git push`, which stores the commits on origin/main', false],
          ['Run `git stash`, which saves commits for use on a branch', false]],
        'Detached commits belong to no branch. Creating a branch where you stand gives them a name, so switching away cannot leave them behind.'),
      mcq('Pushing over HTTPS to GitHub prints `fatal: Authentication failed` after you typed your account password. What is the likely fix?',
        [['Use a personal access token or an SSH key instead', true],
          ['Run `git remote set-url` with the same URL to reset it', false],
          ['Push with --force, which skips the credential check', false],
          ['Delete .git and clone again to renew the saved password', false]],
        'GitHub no longer accepts account passwords for Git over HTTPS. A token or an SSH key is what authenticates the push.'),
    ],
    checkpoint: [
      mcq('You made three commits on main that belong on a new branch, and none is pushed. Which sequence is safe?',
        [['`git branch feature`, then reset main to origin/main', true],
          ['`git revert` all three, then create the branch from main', false],
          ['`git reset --hard origin/main`, then create the branch', false],
          ['`git push --force` main, then rename main to feature', false]],
        'Creating the branch first keeps a pointer to the commits, so moving main back loses nothing. Resetting first leaves the commits on no branch.'),
      mcq('You left a detached HEAD, and your commit no longer appears in `git log`. Where do you find its hash?',
        [['`git reflog`, which lists where HEAD has been', true],
          ['`git status`, which shows the newest commit made', false],
          ['`git log origin/main`, which shows every commit', false],
          ['`git diff HEAD`, which lists commits off a branch', false]],
        'The reflog records every move of HEAD, including commits no branch points at. A branch created at that hash recovers the work.'),
      mcq('`git push` over SSH prints `Permission denied (publickey)`. What does that tell you?',
        [['Your SSH key is missing or not added to your account', true],
          ['The remote branch has commits you have not fetched yet', false],
          ['Your local branch has diverged from its remote branch', false],
          ['The branch is protected and needs a pull request first', false]],
        'The server could not match any key you offered to an account. ssh -T git@github.com confirms whether authentication works.'),
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────────────────
  // T_FUNCTIONS — tests pinned to a specification
  // ─────────────────────────────────────────────────────────────────────────────────────────
  {
    unitCode: 'T_FUNCTIONS_TESTING_PROJECT',
    notes: `You have checked functions by running them and looking at the output. That tells you what a
function does. It does not tell you whether that is what it was supposed to do, and the check is
forgotten the moment you change the code. A test is that check written down: a call, the answer
the specification demands, and an \`assert\` that fails loudly when they differ.

**Why this is a project and not an exercise.** Writing one \`assert\` is trivial. The skill is
deciding WHICH calls to make — which inputs could possibly break this function — and that only
shows up against a real specification with real bugs hiding in the code. The assignment gives you
both.

**How to work.**

1. **Read the specification, not the code.** Take every expected value from what the specification
   says. A test written by running the code and copying its output will faithfully confirm the bug.
2. **For every function, list three kinds of input before writing a test:** normal values;
   boundaries, where the answer changes (a mark of exactly 80, a password of exactly 8 characters,
   29 February); and invalid input the specification says must be rejected.
3. **One behaviour per test**, with a name that says what it checks — \`test_grade_80_is_A\`, not
   \`test1\`. When it fails, the name is the first line of the diagnosis.
4. **Run the tests against the code as given, and keep the output.** A failing test is not
   something to hide; it is the evidence.
5. **For each failure, decide who is wrong.** Usually the code breaks the specification. Sometimes
   the test misread it. Fix whichever is wrong, and say which.
6. **Fix with the smallest change, then run everything again.** A fix that breaks another test has
   not fixed anything.

**What good looks like.** Tests that would have caught each bug before anybody ran the program by
hand; every threshold in the specification tested on both sides; failures explained against the
specification rather than as "it was wrong"; and a final run where every test passes, with you able
to say why that run means something.

The brief, requirements and rubric are in the assignment attached to this unit.`,
    assignment: {
      title: 'Project — Prove Your Functions Work',
      description: 'Write plain assert-based tests that pin four small Python functions to their specification, use them to find the bugs planted in the starter code, fix the bugs, and show every test passing.',
      instructions: `**The scenario**

A student-services team is collecting small helper functions into one module, \`toolkit.py\`. Before
anybody relies on it, you must pin each function to its specification with tests. The
implementations below were written in a hurry and contain planted bugs — more than one, and not in
every function. Test against the specification rather than hunting through the code for clues.

**The specification**

1. \`grade(mark)\` takes an integer and returns \`"A"\` for 80 to 100, \`"B"\` for 65 to 79, \`"C"\` for
   50 to 64 and \`"F"\` for 0 to 49. A mark below 0 or above 100 raises \`ValueError\`.
2. \`password_strength(password)\` checks five rules: at least 8 characters; contains a digit;
   contains an uppercase letter; contains a lowercase letter; contains a character that is neither a
   letter nor a digit. It returns \`"strong"\` when all five hold, \`"medium"\` when three or four
   hold, and \`"weak"\` otherwise.
3. \`is_valid_date(text)\` returns \`True\` only for a real calendar date written exactly as
   \`DD-MM-YYYY\` with a year from 1900 to 2100, and \`False\` for anything else. February has 29
   days in a leap year: a year divisible by 4, except century years, which are leap years only when
   divisible by 400.
4. \`summarise(numbers)\` takes a list of numbers and returns a tuple
   \`(count, smallest, largest, mean)\`, with the mean rounded to 2 decimal places. An empty list
   returns \`(0, None, None, None)\`.

**The starter code** — save it as \`toolkit.py\`:

    def grade(mark):
        if mark < 0 or mark > 100:
            raise ValueError("mark must be from 0 to 100")
        if mark > 80:
            return "A"
        if mark >= 65:
            return "B"
        if mark >= 50:
            return "C"
        return "F"


    def password_strength(password):
        rules = [
            len(password) >= 8,
            any(c.isdigit() for c in password),
            any(c.isupper() for c in password),
            any(c.islower() for c in password),
            any(not c.isalnum() for c in password),
        ]
        met = sum(rules)
        if met == 5:
            return "strong"
        if met >= 3:
            return "medium"
        return "weak"


    def is_valid_date(text):
        parts = text.split("-")
        if len(parts) != 3:
            return False
        day_s, month_s, year_s = parts
        if len(day_s) != 2 or len(month_s) != 2 or len(year_s) != 4:
            return False
        if not (day_s.isdigit() and month_s.isdigit() and year_s.isdigit()):
            return False
        day, month, year = int(day_s), int(month_s), int(year_s)
        if year < 1900 or year > 2100 or month < 1 or month > 12:
            return False
        days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
        if month == 2 and year % 4 == 0:
            days[1] = 29
        return 1 <= day <= days[month - 1]


    def summarise(numbers):
        count = len(numbers)
        mean = round(sum(numbers) / count, 2)
        return (count, min(numbers), max(numbers), mean)

**Requirements**

1. Write your tests in \`test_toolkit.py\` as plain functions whose names begin with \`test_\` and
   which use \`assert\`. No testing framework is required; if you know pytest, you may also run the
   same file with it.
2. Take every expected value from the specification, never from running the starter code.
3. For each of the four functions, test normal inputs, boundary inputs (both sides of every
   threshold the specification names) and invalid or unusual inputs — for example an out-of-range
   mark, \`"31-04-2024"\`, \`"1-1-2024"\`, an empty password and an empty list. Write at least 20
   test functions in total, with at least four for each function.
4. Test that an exception is raised with this pattern:

        def test_grade_rejects_101():
            try:
                grade(101)
            except ValueError:
                return
            assert False, "grade(101) should raise ValueError"

5. Add a runner at the bottom of the file so that \`python test_toolkit.py\` runs every test, prints
   PASS or FAIL with each test's name (and the error for a failure), and ends with the number that
   failed. A test that raises an unexpected exception counts as a failure, not a crash of the runner.
6. Run the tests against the unmodified starter code and save the complete output.
7. For every failing test, record in a bug report: the test name, the sentence of the specification
   it checks, the cause in the code (or in your test, if the test was wrong), and the fix.
8. Fix \`toolkit.py\` with the smallest changes that satisfy the specification. Do not edit a test to
   make it pass unless the test itself misread the specification, and say so in the report when that
   happens.
9. Run all the tests again until every one passes.

**What to submit**

1. \`toolkit.py\`, fixed.
2. \`test_toolkit.py\`, with your tests and runner.
3. The saved output of the first run against the starter code, and of the final run with every test
   passing.
4. The bug report from requirement 7.
5. A reflection of 150-250 words: which of your tests found each bug, one kind of bug your tests
   would still miss, and a test that would catch it.`,
      rubric: [
        { criterion: 'Coverage of the specification', description: 'At least 20 tests; every function tested on normal, boundary and invalid inputs, with both sides of each threshold covered — 79 and 80, 64 and 65, 49 and 50, 0 and 100, 7 and 8 characters, ordinary, century and 400-year leap years, and the empty list.', maxPoints: 30 },
        { criterion: 'Quality of the tests', description: 'Expected values come from the specification; one behaviour per test with a descriptive name and a useful assert message; ValueError tested correctly; the runner reports every result and the failure count without stopping at the first exception.', maxPoints: 20 },
        { criterion: 'Diagnosis of failures', description: 'Every failure in the first run is traced to a specific sentence of the specification and a specific cause in the code, and any test that was itself wrong is identified as such rather than quietly changed.', maxPoints: 20 },
        { criterion: 'Fixes and evidence', description: 'All planted bugs fixed with minimal changes, no test weakened to pass, and saved output showing both the failing first run and a final run with every test passing.', maxPoints: 15 },
        { criterion: 'Reflection', description: 'Names the test that caught each bug and identifies a realistic remaining gap in the tests, with a concrete test that would close it.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────────────────
  // T_C_BASICS — strings
  // ─────────────────────────────────────────────────────────────────────────────────────────
  {
    unitCode: 'T_C_BASICS_STRING_DEBUGGING',
    notes: `A Python string knows its length and refuses to overflow. A C string is a \`char\` array with
a \`'\\0'\` somewhere in it, and every string function trusts you about where that is and how much
room there is. So most string bugs compile cleanly, and many print something almost right.

**The method: three questions for any misbehaving string.**

1. **Where is the terminator?** \`%s\`, \`strlen\`, \`strcpy\` and \`strcmp\` all read until \`'\\0'\`.
2. **How many bytes does the destination own?** Text of length n needs n + 1.
3. **Am I working on the characters, or on a pointer?** \`==\` and \`sizeof\` applied to a \`char *\`
   see only the pointer.

Compile with \`-Wall\`, and add \`-fsanitize=address\` whenever bytes may be going past an end — it
stops at the exact call that overflows.

**Symptom: the right word, followed by garbage.** A hand-written copy stopped before copying the
terminator:

    for (i = 0; src[i] != '\\0'; i++) {
        dst[i] = src[i];
    }
    dst[i] = '\\0';                 /* the missing line */

Without that last line, \`printf("%s", dst)\` carries on through whatever bytes follow.

**Symptom: a crash, or an unrelated variable changes, after a copy or a join.**

    char name[8];
    strcpy(name, "Srinivasan");     /* 11 bytes into 8 */

\`strcpy\` and \`strcat\` never check sizes. Before \`strcat(dst, src)\` the destination needs
\`strlen(dst) + strlen(src) + 1\` bytes. \`snprintf(name, sizeof name, "%s", src)\` truncates to fit
and always terminates. \`strncpy\` is not the safe version it looks like: when the source is too long
it leaves no terminator at all.

**Symptom: \`==\` is never true.** \`if (answer == "yes")\` compares two addresses, which differ however
well the text matches. Write \`strcmp(answer, "yes") == 0\`, and keep the \`== 0\`: \`strcmp\` returns
0 for equal strings, so \`if (strcmp(a, b))\` means "if different".

**Symptom: a loop over a string always handles 8 characters.**

    void upper(char *s) {
        for (size_t i = 0; i < sizeof(s); i++) {   /* size of the pointer */
            s[i] = toupper(s[i]);
        }
    }

Inside the function \`s\` is a pointer, and \`sizeof(s)\` is the size of a pointer, typically 8 on a
64-bit machine. Use \`strlen(s)\` for the length of the text. Even where an array is declared,
capacity and length are different questions: for \`char buf[20] = "hi";\`, \`sizeof buf\` is 20 and
\`strlen(buf)\` is 2.

**Symptom: input that looks identical does not match.**

    fgets(line, sizeof line, stdin);    /* the user types quit */
    strcmp(line, "quit")                /* not 0: line holds "quit\\n" */

\`fgets\` keeps the newline whenever it fits. Remove it with \`line[strcspn(line, "\\n")] = '\\0';\`.

**Symptom: a crash when changing one character.**

    char *greeting = "hello";
    greeting[0] = 'H';                  /* undefined behaviour */

A string literal may live in read-only memory, and writing to it is undefined — commonly a
segmentation fault. \`char greeting[] = "hello";\` makes a writable array copy. Declaring pointers
to literals as \`const char *\` makes the compiler reject the write instead.`,
    mcqs: [
      mcq('A loop copies `src` into `dst` one character at a time, stopping at `\'\\0\'`. Printing `dst` shows the word followed by random symbols. Why?',
        [['The loop stops before it copies the terminator into dst', true],
          ['printf with %s prints the whole array, used or unused', false],
          ['dst was declared too large, so its spare bytes are shown', false],
          ['The characters were copied into dst in reverse byte order', false]],
        'Nothing marks the end of dst, so printf keeps reading the bytes after the copied text. Writing dst[i] = \'\\0\' after the loop fixes it.'),
      mcq('`if (answer == "yes")` is false even when the user typed yes. What is the fix?',
        [['`strcmp(answer, "yes") == 0`, comparing the characters', true],
          ['`answer = "yes"`, assigning the value before testing it', false],
          ['`*answer == "yes"`, dereferencing the pointer first', false],
          ['`strlen(answer) == strlen("yes")`, comparing lengths', false]],
        '== on two strings compares their addresses, which are never the same. strcmp compares the characters and returns 0 when they match.'),
      mcq('Inside `void upper(char *s)`, a loop runs `for (i = 0; i < sizeof(s); i++)`. On a typical 64-bit machine, how many characters does it visit?',
        [['8, the size of the pointer, whatever the string', true],
          ['The length of the text, exactly as strlen gives', false],
          ['The size of the caller\'s array, terminator included', false],
          ['1, the size of the single char that s points to', false]],
        'In the function s is a pointer, so sizeof measures the pointer. strlen(s) gives the length of the text it points to.'),
      mcq('After `fgets(line, sizeof line, stdin)`, the test `strcmp(line, "quit") == 0` fails when the user types quit. Why?',
        [['fgets keeps the newline, so line holds quit plus a newline', true],
          ['fgets skips the first character that was typed on the line', false],
          ['strcmp returns 1 for equal strings, so the test is reversed', false],
          ['sizeof line is the pointer size, so only 8 bytes were read', false]],
        'The Enter key\'s newline is stored when it fits. line[strcspn(line, "\\n")] = \'\\0\' removes it before comparing.'),
    ],
    checkpoint: [
      mcq('`char code[6]; strcpy(code, "CS1052");` Why is this a bug?',
        [['It writes 7 bytes, counting the terminator, into 6', true],
          ['strcpy cannot copy text that contains any digits', false],
          ['It is correct, since the text is exactly 6 bytes long', false],
          ['strcpy appends a newline, which does not fit in code', false]],
        'Six characters need a seventh byte for the terminator, and strcpy writes it past the end of the array without checking.'),
      mcq('`char *name = "asha"; name[0] = \'A\';` crashes. What is the fix?',
        [['Declare `char name[] = "asha";`, a writable copy', true],
          ['Write `*name[0] = \'A\';` to dereference it first', false],
          ['Use `name[1] = \'A\';`, since index 0 is the length', false],
          ['Cast the literal with `(char *)` to make it writable', false]],
        'A pointer to a string literal may point into read-only memory, and writing there is undefined. An array initialised from the literal is an ordinary copy you own.'),
      mcq('`char msg[12] = "Hello, ";` is followed by `strcat(msg, "Priya");`. Is the array big enough?',
        [['No: 12 characters plus the terminator need 13 bytes', true],
          ['Yes: the two strings hold exactly 12 characters', false],
          ['Yes: strcat grows the array when it runs out of room', false],
          ['No: strcat needs twice the length of the final text', false]],
        '"Hello, " is 7 characters and "Priya" is 5. The result is 12 characters, and the terminator makes 13 bytes in a 12-byte array.'),
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────────────────
  // T_EDITOR — a workspace somebody else can use
  // ─────────────────────────────────────────────────────────────────────────────────────────
  {
    unitCode: 'T_EDITOR_WORKSPACE_PROJECT',
    notes: `Every earlier editor unit made the editor work for you. This project makes it work for
somebody else. "It works on my machine" is nearly always true and almost never useful: the program
quietly depended on a library you installed months ago, an interpreter the editor happened to find,
a setting only you changed, or a file that never made it into Git.

**Why this is a project.** Nothing here is hard on its own — a virtual environment, a requirements
file, a few small configuration files, a README. What is hard is noticing what you have silently
relied on, and the only reliable way to notice is to start from nothing and follow your own
instructions exactly. The verification run is the real test; the files are what make it pass.

**How to work.**

1. **Start from a fresh virtual environment**, not your global Python, so the requirements file
   lists what the project actually needs and nothing it merely happened to find.
2. **Pin exact versions** — \`tabulate==0.9.0\`, not \`tabulate\`. An unpinned requirement installs
   whatever is newest on the day somebody else clones the project.
3. **Decide what belongs in Git.** Settings every contributor should share — the interpreter, the
   formatter, the run and debug configuration — are committed. The virtual environment, caches and
   personal preferences such as theme or font size are not.
4. **Write the README while you set up**, one exact command per step, for each operating system
   your team uses. Activation differs between Windows and macOS or Linux, and that difference is
   the commonest failed step.
5. **Verify by cloning into an empty folder** — better, on a classmate's machine — and follow only
   the README. Every time you have to do something it did not say, that is a defect: log it, fix the
   README or the configuration, and start again from a fresh clone.

**What good looks like.** A classmate who has never seen the project clones it, follows the README,
and within ten minutes can run it, stop at a breakpoint, and have their editor format a file on save
exactly as yours does — without asking you anything. Alongside it, a verification log showing the
failures you found on the way, because a first attempt with none usually means the test did not
really start from a clean slate.

The brief, requirements and rubric are in the assignment attached to this unit.`,
    assignment: {
      title: 'Project — A Workspace Anyone Can Open',
      description: 'Turn a small Python project into a reproducible workspace — pinned dependencies, a configured formatter and linter, shared run and debug settings, and a README — then prove it by setting it up from a fresh clone using only the README.',
      instructions: `**The scenario**

A small Python program, \`marks-report\`, prints a table of student marks from a CSV file. It runs
on its author's laptop and nowhere else has tried. Your job is to make it a workspace that anybody
can clone, open, run, debug, lint and format the same way — and to prove it. You may use this
program, or a Python project of your own of similar size that uses at least one third-party
library.

    marks-report/
        report.py
        data/marks.csv

\`report.py\`:

    import csv
    from pathlib import Path

    from tabulate import tabulate

    DATA = Path(__file__).parent / "data" / "marks.csv"


    def load(path):
        with open(path, newline="") as f:
            return [(row["name"], int(row["mark"])) for row in csv.DictReader(f)]


    def main():
        rows = load(DATA)
        print(tabulate(rows, headers=["Name", "Mark"]))


    if __name__ == "__main__":
        main()

\`data/marks.csv\` has the header line \`name,mark\` followed by a few rows such as \`Asha,82\`.

**Requirements**

1. **Version control.** The project is a Git repository with at least three meaningful commits,
   pushed to a remote your assessor can clone.
2. **Virtual environment.** Create it inside the project with \`python -m venv .venv\`. It must not
   be committed.
3. **Pinned dependencies.** \`requirements.txt\` lists every runtime dependency with an exact
   version (\`package==x.y.z\`). Development tools — your formatter and linter — go in
   \`requirements-dev.txt\`, also pinned, and that file begins with the line \`-r requirements.txt\`.
4. **Formatter and linter.** Configure one of each (Ruff can serve as both; Black with Flake8 is
   also acceptable) in \`pyproject.toml\` or the tool's own configuration file, with at least one
   deliberate setting such as the line length. The committed code must pass both with no reports.
5. **Shared editor settings.** Commit \`.vscode/settings.json\`, which selects the project's
   interpreter and formats Python on save with your chosen formatter; \`.vscode/extensions.json\`,
   recommending the extensions a contributor needs; and \`.vscode/launch.json\`, with a named
   configuration that runs and debugs \`report.py\` from the workspace folder, for example:

        {
          "version": "0.2.0",
          "configurations": [
            {
              "name": "Run marks report",
              "type": "debugpy",
              "request": "launch",
              "program": "\${workspaceFolder}/report.py",
              "cwd": "\${workspaceFolder}",
              "console": "integratedTerminal"
            }
          ]
        }

   Personal preferences such as theme and font size stay in your user settings.
6. **Ignore file.** \`.gitignore\` excludes at least \`.venv/\`, \`__pycache__/\` and your linter's
   cache folder, without excluding the \`.vscode\` files above.
7. **README.md.** State the Python version required, then give numbered setup steps for Windows and
   for macOS or Linux (activation differs: \`.venv\\Scripts\\activate\` on Windows,
   \`source .venv/bin/activate\` elsewhere), how to install both requirements files, how to run the
   program from a terminal, how to run and debug it in the editor, and how to run the formatter and
   the linter.
8. **Clean-clone verification.** Clone the repository into a new, empty folder — ideally on a
   classmate's machine — and follow ONLY the README. Log every step that failed or needed something
   the README did not say: the step, what happened, the cause, and the fix. Commit each fix, then
   repeat the verification from a fresh clone until it passes with no deviations. The final run
   must show the program's output, a breakpoint in \`load\` being hit from the debug configuration,
   format-on-save correcting a deliberately misformatted line, and both tools reporting no problems.

Another editor is acceptable if you commit its equivalent shared run, debug and format configuration
and explain it in the README.

**What to submit**

1. The repository URL, or a zip that includes the \`.git\` folder.
2. The verification log from requirement 8, covering every attempt.
3. Evidence of the final clean run: a terminal transcript from the clone to the program's output,
   plus screenshots of the breakpoint being hit and of format-on-save.
4. A note of 150-250 words: what the project silently depended on before this work, which failure
   surprised you most, and how your fix prevents it for the next person.`,
      rubric: [
        { criterion: 'Reproducible environment', description: 'The virtual environment is not committed; both requirements files pin exact versions and install cleanly into a fresh environment; .gitignore excludes the environment and caches while keeping the shared .vscode files.', maxPoints: 20 },
        { criterion: 'Shared editor and tool configuration', description: 'settings.json selects the project interpreter and formats on save; extensions.json recommends what is needed; launch.json runs and debugs report.py from the workspace folder; the formatter and linter are configured and the code passes both.', maxPoints: 25 },
        { criterion: 'README', description: 'A newcomer can follow it unaided: Python version, setup for Windows and for macOS or Linux, install, run, debug, format and lint, each given as exact commands or editor actions.', maxPoints: 20 },
        { criterion: 'Clean-clone verification', description: 'Carried out from a genuinely fresh clone; every failed step logged with its cause and fix; repeated until clean; final evidence shows output, a breakpoint hit, format-on-save and clean tool runs.', maxPoints: 25 },
        { criterion: 'Reflection', description: 'Names the specific hidden dependencies the project had and explains how each fix prevents the same failure for the next contributor.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────────────────
  // T_SQL — a schema diagnosed from its anomalies
  // ─────────────────────────────────────────────────────────────────────────────────────────
  {
    unitCode: 'T_SQL_SCHEMA_DEBUGGING',
    notes: `Some database bugs are not in any query. The data contradicts itself, or a fact vanishes, and
every statement that caused it was correct. The fault is the design of the tables, and the
diagnosis runs backwards: from the anomaly, to the fact stored in the wrong place, to the split
that fixes it.

**The method.**

1. **Describe the anomaly exactly.** Which value is now wrong or missing, and after which INSERT,
   UPDATE or DELETE?
2. **Ask what that value is a fact about.** A phone number is about a customer, not an order. A
   course title is about a course, not an enrolment.
3. **Find where it is stored.** A fact about one thing kept in the rows of another is stored many
   times, or exists only while something else does.
4. **Split, then connect.** Move the fact into a table about that thing, give it a primary key, and
   refer to it with a foreign key.

**Update anomaly: copies of one fact drift apart.**

    orders
    | order_id | customer | phone       | item     |
    | 101      | Asha     | 90000 00001 | Pen      |
    | 102      | Asha     | 90000 00001 | Notebook |

After \`UPDATE orders SET phone = '90000 00009' WHERE order_id = 102;\` Asha has two phone numbers,
and no query can say which is current. The phone is a customer fact stored once per order. Fix:
\`customers(id, name, phone)\` and \`orders(order_id, customer_id, item)\`, so the number lives in
exactly one row.

**Delete anomaly: removing one fact removes another.**

    enrolments
    | student | course_code | course_title   | credits |
    | Ravi    | CS105       | Discrete Maths | 4       |

If this is the last enrolment on CS105 and Ravi drops it, deleting the row also deletes the only
record that CS105 is Discrete Maths, worth 4 credits.

**Insert anomaly: a fact cannot be recorded on its own.** The same table cannot record a new course
until somebody enrols, short of inventing a fake student or leaving the student blank. Both
anomalies have one fix: a \`courses(code, title, credits)\` table, with
\`enrolments(student_id, course_code)\` referring to it.

**Several values in one column.**

    students
    | id | name  | courses     |
    | 1  | Meera | CS101,CS105 |

Counting students per course now needs string searching instead of \`GROUP BY\`;
\`WHERE courses LIKE '%CS10%'\` matches both codes; dropping one course means editing text; and no
foreign key can check that CS105 exists. Fix: one row per student and course in \`enrolments\`, with
\`(student_id, course_code)\` as its primary key.

**Orphans: rows that point at nothing.** Without a foreign key, deleting customer 7 leaves their
orders holding \`customer_id = 7\`. Inner joins then drop those orders silently, and totals stop
matching the orders table. Find them:

    SELECT o.order_id, o.customer_id
    FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    WHERE c.id IS NULL;

Decide what each orphan should become, then add the constraint so it cannot recur:
\`customer_id INTEGER NOT NULL REFERENCES customers(id)\`. In SQLite, foreign keys are only enforced
after \`PRAGMA foreign_keys = ON;\`.

**The name for this.** Reorganising tables so each fact is stored once, in the table about the
thing it describes, is called **normalisation**. A later database course defines it formally through
normal forms; the working rule — one fact, one place — is enough to diagnose every anomaly above.`,
    mcqs: [
      mcq('An orders table stores the customer\'s phone number on every order. After one UPDATE, a customer shows two different numbers across their orders. What design decision caused this?',
        [['A fact about the customer is stored once per order', true],
          ['The phone column has a text type instead of a number', false],
          ['The orders table has no index on the customer name', false],
          ['The UPDATE was run without wrapping it in a transaction', false]],
        'Every order carries its own copy of the number, so updating one copy leaves the others behind. A customers table holds it once.'),
      mcq('Enrolment rows carry each course\'s title and credits. The last student on CS105 drops it, and the course\'s title and credits vanish. What is the fix?',
        [['A courses table, with enrolments referring to it by code', true],
          ['Add ON DELETE CASCADE to the foreign key on enrolments rows', false],
          ['Make the course title NOT NULL so it cannot be removed', false],
          ['Copy every course\'s details into a backup table nightly', false]],
        'The course facts existed only inside enrolment rows. Stored in their own table, they survive any number of enrolments being deleted.'),
      mcq('A students table has a column `courses` holding values such as `CS101,CS105`. Which problem follows directly from that design?',
        [['Counting students per course needs string searching', true],
          ['The column cannot hold more than two course codes', false],
          ['Commas are not permitted inside a text column in SQL', false],
          ['Each student can then be enrolled on only one course', false]],
        'Several values in one column cannot be grouped, joined or checked by a foreign key. One row per student and course makes all three possible.'),
      mcq('In a single table of (student, course_code, course_title), a new course cannot be recorded until a student enrols. What is this, and what causes it?',
        [['An insert anomaly: course facts live only on enrolment rows', true],
          ['A delete anomaly: the course row was removed at some earlier point', false],
          ['A key violation: course_code must be unique in that table', false],
          ['An update anomaly: the course title was changed elsewhere', false]],
        'A course can only appear as part of an enrolment, so it cannot exist without one. A separate courses table lets it be inserted on its own.'),
    ],
    checkpoint: [
      mcq('Which query finds orders whose `customer_id` matches no existing customer?',
        [['LEFT JOIN customers, then WHERE the customer id IS NULL', true],
          ['INNER JOIN customers, then WHERE the customer_id IS NULL', false],
          ['SELECT from orders WHERE customer_id IS NOT NULL', false],
          ['GROUP BY customer_id, then HAVING COUNT(*) = 0', false]],
        'The LEFT JOIN keeps every order, and an order with no matching customer has NULL in every customer column.'),
      mcq('A report joining orders to customers shows fewer orders than the orders table holds, because some rows point at deleted customers. What stops this recurring?',
        [['A foreign key from orders.customer_id to customers.id', true],
          ['A UNIQUE constraint on the orders.customer_id column', false],
          ['An index on customers.id so every lookup finds its row', false],
          ['A LEFT JOIN in the report, so no order is ever left out', false]],
        'The constraint refuses to delete a customer who still has orders, or to insert an order for a customer who does not exist. The LEFT JOIN only hides the symptom.'),
      mcq('What is the working rule behind splitting a table to remove update, insert and delete anomalies?',
        [['Store each fact once, in the table about that thing', true],
          ['Keep every table under a fixed, small number of columns', false],
          ['Put a UNIQUE constraint on every column you can', false],
          ['Avoid joins, since each one is a chance for error', false]],
        'Every anomaly comes from a fact stored in the wrong place or in many places. One fact, one place is the intuition behind normalisation.'),
    ],
  },
];
