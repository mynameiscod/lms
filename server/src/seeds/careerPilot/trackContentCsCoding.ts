/**
 * Career-track content, Year-4 placement for .NET Full Stack + AI:
 *   JT_CODING_CSHARP — coding rounds in C# (the language habits, five timed rounds, a code-reading checkpoint)
 *
 * Students have finished the track's C# and DSA topics (JT_CS_DSA_LINEAR, JT_CS_DSA_NONLINEAR), so nothing here
 * re-teaches a structure: it is the round itself — the problem a campus online assessment sets, the C# that solves
 * it inside the clock, and the C# habits that lose marks. None of the problems repeats the track's Year-3 C#
 * exercises (subarray sum equals k, shortest steps in a grid, two-sum and the rest) or the Java and Python coding
 * rounds.
 *
 * Every auto-graded exercise was checked before it shipped: a reference solution (not included here) was written
 * in C# 5 — the grader is Mono 6.12, about C# 7, with a classic Main — compiled with the .NET Framework csc and
 * passed every test, the large hidden ones well inside a second; each was also cross-checked against a brute force
 * on hundreds of random small inputs, and every starter compiles. Every "what does this print" answer was compiled
 * and run.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

/* Large test inputs are built, not pasted: they exist to catch an O(n²) loop, an int total or a deep recursion. */
const seq = (n: number, f: (i: number) => string | number) => Array.from({ length: n }, (_, i) => String(f(i))).join(' ');
/** A path 1 – 2 – … – n whose roads alternate toll (1) and free (0), starting with a toll. */
const tollChain = (n: number) => Array.from({ length: n - 1 }, (_, i) => `${i + 1} ${i + 2} ${(i + 1) % 2}`).join('\n');

/** The input-reading scaffold every coding-round starter shares: whitespace-separated tokens across any number of lines. */
const READER = `    static string[] buf = new string[0];
    static int pos = 0;

    // The next whitespace-separated token, whatever line it is on; null at the end of input.
    static string Next()
    {
        while (pos >= buf.Length)
        {
            string line = Console.ReadLine();
            if (line == null) return null;
            buf = line.Split(new[] { ' ', '\\t' }, StringSplitOptions.RemoveEmptyEntries);
            pos = 0;
        }
        return buf[pos++];
    }
`;

const RUNNER_NOTE = `- **The grader runs C# 7 on Mono:** keep the classic \`class Program { static void Main() { ... } }\`; no
  top-level statements, no records, no \`PriorityQueue\`. The starter's \`Next()\` reads the input for you.`;

/* ══ JT_CODING_CSHARP — Coding Rounds in C# ═══════════════════════════════════════════════ */

export const TRACK_CS_CODING_BUNDLES: PilotBundle[] = [
  {
    unitCode: 'JT_CODING_CSHARP_CSHARP_FOR_CODING',
    notes: `A coding round grades two things at once: whether your algorithm is right, and whether your C# gets
it to the judge inside the time limit without a wrong answer from overflow, a lost buffer or a stack that ran out.
These are the questions interviewers and proctors actually ask about C# in a coding round, and the habits that
decide the second half of the grade.

## Q1. "Your solution is O(n log n) but timed out on n = 2×10⁵. What do you check first?"

**Strong answer.** "Input and output before the algorithm. I read whole lines with \`Console.ReadLine()\` and split
them into tokens, and I parse with \`int.Parse\` / \`long.Parse\` — no LINQ pipeline per number, no regular
expressions, no \`Convert.ChangeType\`. For output, 10⁵ calls to \`Console.WriteLine\` each go to the
console stream; I append to one \`StringBuilder\` and write once, or wrap stdout in a buffered \`StreamWriter\`."

    var output = new StreamWriter(Console.OpenStandardOutput());
    output.AutoFlush = false;
    // ... output.WriteLine(answer) many times ...
    output.Flush();                      // forget this and the judge may see nothing at all

**Likely follow-up.** "What happens without the \`Flush()\`?" — the text is still in the writer's buffer when
\`Main\` returns, and nothing flushes it for you: the judge receives an empty or cut-off output and marks it wrong.

**Common wrong answers.** "C# is just slow" (the same algorithm passes with buffered output); "use
\`Parallel.For\`" (the bottleneck is I/O, and parallel output comes out in the wrong order).

## Q2. "Where does integer overflow bite in a C# round, and what does C# do about it?"

**Strong answer.** "By default nothing: arithmetic on \`int\` and \`long\` is **unchecked**, so it wraps silently.
\`long r = a * b;\` with two \`int\`s multiplies in \`int\` and only widens the already-wrong result. I make the
arithmetic long *before* it can overflow — \`(long)a * b\` — and declare sums, counts of pairs and prefix sums as
\`long\` from the start."

    int a = 50000, b = 50000;
    long wrong = a * b;            // -1794967296: wrapped in int, then widened
    long right = (long)a * b;      // 2500000000

**Follow-up.** "Can C# catch it for you?" — yes: a \`checked { ... }\` block (or the \`-checked\` compiler switch)
throws \`OverflowException\` instead of wrapping. Useful while debugging; in a round, fix the type.

## Q3. "Math.Abs(int.MinValue) — what happens?"

**Strong answer.** "In C# it throws \`OverflowException\`, because +2 147 483 648 does not fit in an \`int\`.
(Java silently returns the negative number.) Any code that takes \`Math.Abs\` of a difference of two \`int\`s near
the limits should do it in \`long\`."

## Q4. "What is -7 % 3 in C#, and why does it matter for hashing?"

**Strong answer.** "-1, and -7 / 3 is -2: division truncates toward zero and the remainder takes the sign of the
dividend. So when I bucket values or prefix sums by remainder, -1 and 2 land in different buckets although they
are the same mod 3. I normalise: \`((x % k) + k) % k\`."

## Q5. "Is Array.Sort stable? How do you sort pairs?"

**Strong answer.** "No. \`Array.Sort\` and \`List<T>.Sort\` use introsort — fast, O(n log n), but equal keys may
come out in any order. LINQ's \`OrderBy\` / \`ThenBy\` **is** stable, at the cost of allocating. For pairs I either
sort an array of a small class with a \`Comparison<T>\`, or use \`Array.Sort(keys, items)\`, which sorts \`items\`
by \`keys\`."

    Array.Sort(people, (x, y) => x.Age != y.Age ? x.Age.CompareTo(y.Age) : x.Id.CompareTo(y.Id));

**Follow-up.** "Why \`CompareTo\` and not \`x.Age - y.Age\`?" — the subtraction overflows for values of opposite
sign near the limits and flips the order. Sorting 2000000000, -2000000000, 5 with \`(p, q) => p - q\` really does
produce 5 2000000000 -2000000000.

## Q6. "Dictionary: indexer, ContainsKey or TryGetValue?"

**Strong answer.** "Reading a missing key with the indexer throws \`KeyNotFoundException\` — so \`count[x]++\` on a
new key crashes. \`ContainsKey\` then the indexer works but hashes twice. \`TryGetValue\` does one lookup:"

    int c;
    count.TryGetValue(x, out c);       // c is 0 when x is absent
    count[x] = c + 1;                  // the indexer's setter adds or overwrites

**Follow-up.** "Can a \`HashSet<int[]>\` hold grid cells?" — it compiles, but arrays use **reference** equality,
so \`Contains(new[] { r, c })\` is always false. Encode the cell as one number, \`r * cols + c\`, or as a \`long\`.

## Q7. "You need a heap. What do you use?"

**Strong answer.** "\`PriorityQueue<TElement, TPriority>\` exists from .NET 6, but many judges — including Mono-based
ones — do not have it. Then I either write a small binary heap over a \`List<long>\`, or use a \`SortedSet<T>\` —
remembering that a set drops 'duplicates': two entries the comparer calls equal are one entry. So I make every key
unique, for example \`distance * n + node\` as one \`long\`, or a comparer that breaks ties by node."

## Q8. "What is wrong with s += c in a loop?"

**Strong answer.** "Strings are immutable, so every \`+=\` copies the whole string so far: n appends cost O(n²).
\`StringBuilder.Append\` is amortised O(1). The same goes for output — one builder, one \`Console.Write\`."

**Follow-up.** "Does \`==\` on strings compare references, as in Java?" — no: C#'s \`string ==\` is overloaded to
compare contents. Only after a cast to \`object\` does \`==\` compare references.

## Q9. "Your recursive DFS passes the samples and the judge reports a runtime error on a 10⁵-node path."

**Strong answer.** "Recursion depth equals the path length, and the main thread's stack (about 1 MB) runs out.
In .NET a \`StackOverflowException\` cannot be caught — the process just dies. I write the DFS with an explicit
\`Stack<int>\`, switch to BFS, or as a last resort run the work on a thread with a bigger stack:
\`new Thread(Solve, 256 * 1024 * 1024)\`, then \`Start()\` and \`Join()\`."

## Q10. "Name the C# mistakes that cost marks in a timed round."

**Strong answer.**
- Debug \`Console.WriteLine\` calls or an "Answer:" label left in the output — judges compare text exactly.
- A buffered writer never flushed.
- \`int\` totals, \`a * b\` in \`int\`, and \`Math.Abs\` on \`int.MinValue\`.
- \`x % k\` negative for negative x.
- Removing from a \`List<T>\` inside its own \`foreach\` → \`InvalidOperationException\`; loop backwards with an
  index, or use \`RemoveAll\`.
- \`'a' + 1\` is the \`int\` 98, not "a1" or 'b'; cast back with \`(char)('a' + 1)\`, and turn a digit into its
  value with \`s[i] - '0'\`.
- \`double.Parse\` and \`ToString()\` follow the machine's culture — on a German judge 0.5 prints as "0,5". Pass
  \`CultureInfo.InvariantCulture\` whenever decimals go in or out.

**Follow-up.** "How do you check before submitting?" — run the sample, n = 1, all-equal and all-negative values,
the largest values (overflow), and the largest n (time).`,
    workedExample: `**Goal: a timed-round template, then one problem solved in it — "print the values sorted by how often they occur, most frequent first, ties by smaller value".**

**1. The template you type at the start of every round.**

    using System;
    using System.Collections.Generic;
    using System.Text;

    class Program
    {
        static string[] buf = new string[0];
        static int pos = 0;
        static string Next()
        {
            while (pos >= buf.Length)
            {
                string line = Console.ReadLine();
                if (line == null) return null;
                buf = line.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
                pos = 0;
            }
            return buf[pos++];
        }

        static void Main()
        {
            int n = int.Parse(Next());
            int[] a = new int[n];
            for (int i = 0; i < n; i++) a[i] = int.Parse(Next());
            StringBuilder sb = new StringBuilder();
            // ... solve, appending to sb ...
            Console.Write(sb.ToString());
        }
    }

\`Next()\` does not care how the judge splits the numbers across lines — the most common reason a correct
solution fails on hidden tests.

**2. Choose the idea before typing.** Count with a \`Dictionary<int, int>\`, then sort the **distinct** values with
a comparison that looks up their counts. O(n + m log m) for m distinct values.

**3. The solving part.**

    var count = new Dictionary<int, int>();
    foreach (int x in a)
    {
        int c;
        count.TryGetValue(x, out c);
        count[x] = c + 1;
    }
    int[] keys = new int[count.Count];
    count.Keys.CopyTo(keys, 0);
    Array.Sort(keys, (p, q) => count[p] != count[q] ? count[q].CompareTo(count[p]) : p.CompareTo(q));
    foreach (int k in keys) sb.Append(k).Append(' ').Append(count[k]).Append('\\n');

**4. Say the checks aloud.** "The comparison is total — equal counts fall back to the value — so the unstable
\`Array.Sort\` still gives one deterministic answer. I compare with \`CompareTo\`, not subtraction. A value that is
negative works because the keys are the values themselves, not array indices."

**5. State the cost.** Time O(n + m log m), extra space O(m). One output write.`,
    mcqs: [
      mcq('A contestant writes `Console.WriteLine(Math.Abs(int.MinValue));` in C#. What happens when it runs?',
        [['It prints 2147483648', false],
         ['It prints -2147483648, as Java does', false],
         ['It throws OverflowException', true],
         ['It prints 0 after wrapping around', false]],
        'The positive value 2147483648 does not fit in an int, and C#\'s Math.Abs(int) checks for exactly this case and throws OverflowException. Java returns the negative value instead. Do the arithmetic in long when the input can reach the limits.'),
      mcq('A solution writes 10^5 answers through `var w = new StreamWriter(Console.OpenStandardOutput());` and returns from Main without calling Flush or Dispose. What does the judge receive?',
        [['Every answer, because the process exit flushes it', false],
         ['Possibly nothing: the buffer was never written out', true],
         ['A compile-time warning about an undisposed writer', false],
         ['All the answers, but not in the order written', false]],
        'A StreamWriter buffers text and nothing flushes it automatically when Main returns, so the final buffer — or all of a small output — is lost. Call Flush (or wrap it in using) before Main ends.'),
      mcq('Records with equal marks must keep their input order, and the code sorts with `Array.Sort(arr, (x, y) => x.Marks.CompareTo(y.Marks))`. Is that order guaranteed?',
        [['Yes: Array.Sort is a stable merge sort', false],
         ['Yes, as long as the comparison is consistent', false],
         ['Only when the records are in a List<T> instead', false],
         ['No: Array.Sort is unstable; OrderBy is stable', true]],
        'Array.Sort and List<T>.Sort use introsort, which may reorder equal keys. LINQ OrderBy is documented as a stable sort, or the comparison can break ties on the original index.'),
    ],
    checkpoint: [
      ck('CSHARP_BASICS', 'What does `Console.WriteLine(-7 % 3); Console.WriteLine(-7 / 3);` print in C#?',
        [['2 and -3', false],
         ['-1 and -2', true],
         ['-1 and -3', false],
         ['2 and -2', false]],
        'C# integer division truncates toward zero, so -7 / 3 is -2, and the remainder takes the sign of the dividend: -7 % 3 is -1. To get a remainder in 0..k-1, normalise with ((x % k) + k) % k.'),
      ck('CSHARP_BASICS', 'With `int a = 50000, b = 50000; long r = a * b;`, what does `Console.WriteLine(r)` print?',
        [['-1794967296', true],
         ['2500000000', false],
         ['Nothing: assigning int * int to long needs a cast', false],
         ['Nothing: an OverflowException is thrown', false]],
        'Both operands are int, so the multiplication happens in int, unchecked by default, and wraps to -1794967296 before it is widened to long. (long)a * b gives 2500000000.'),
      ck('CSHARP_BASICS', 'A frequency count does `var d = new Dictionary<string, int>(); d["x"]++;`. What happens?',
        [['d["x"] becomes 1, because a missing int reads as 0', false],
         ['It does not compile: ++ needs a plain variable', false],
         ['Nothing: "x" stays absent and no error occurs', false],
         ['It throws KeyNotFoundException', true]],
        'd["x"]++ first reads d["x"], and the indexer\'s getter throws KeyNotFoundException for a missing key. Use TryGetValue (which gives 0 when absent) and then assign with the indexer.'),
    ],
  },

  /* ── Round 1: arrays and strings ── */
  {
    unitCode: 'JT_CODING_CSHARP_ROUND_ARRAYS_STRINGS',
    notes: `Arrays and strings open almost every campus online assessment. The patterns are reversal tricks,
sliding windows and difference arrays; the C# traps are \`int\` totals, \`k\` larger than n, and building strings
with \`+=\`. For each problem below: read it, decide the pattern **before** looking at the approach, then compare.
Give yourself 15 minutes a problem.

## Problem 1 — Rotate an array right by k, in place

*1 2 3 4 5 rotated right by 2 is 4 5 1 2 3. O(1) extra space.*

**Approach.** Three reversals: the whole array, then the first k, then the rest. First reduce \`k %= n\` — k can be
larger than n, and rotating by n changes nothing.

    static void Reverse(int[] a, int i, int j)
    {
        while (i < j) { int t = a[i]; a[i] = a[j]; a[j] = t; i++; j--; }
    }

    k %= n;
    Reverse(a, 0, n - 1);
    Reverse(a, 0, k - 1);
    Reverse(a, k, n - 1);

**Complexity.** O(n) time, O(1) space. Copying into a new array at \`(i + k) % n\` is also O(n) but uses O(n) space
— say both; the interviewer wants the in-place one.

## Problem 2 — Longest stretch of one letter after at most k replacements

*Uppercase string s; you may change up to k characters. Print the length of the longest substring of one repeated
letter you can make. "AABABBA" with k = 1 → 4.*

**Approach.** Sliding window with a count of each letter. A window is fixable when
\`length − (count of its most frequent letter) ≤ k\`. Grow the right end; when the window stops being fixable, move
the left end once.

    int[] cnt = new int[26];
    int left = 0, maxCount = 0, best = 0;
    for (int right = 0; right < s.Length; right++)
    {
        maxCount = Math.Max(maxCount, ++cnt[s[right] - 'A']);
        while (right - left + 1 - maxCount > k) { cnt[s[left] - 'A']--; left++; }
        best = Math.Max(best, right - left + 1);
    }

**Complexity.** O(n). \`maxCount\` is never decreased when the window shrinks — that is safe, because the answer
can only grow when some letter's count beats the old maximum. Interviewers ask exactly that.

## Problem 3 — Apply q range increments, then print the array

*n zeros; each of q updates adds v to every index from l to r. Print the final array. n, q ≤ 2×10⁵.*

**Approach.** Applying each update cell by cell is O(n·q) — 4×10¹⁰. A **difference array** records each update in
two cells and one prefix sum rebuilds the array.

    long[] diff = new long[n + 1];
    // for each update (l, r, v):
    diff[l] += v;
    diff[r + 1] -= v;
    // afterwards:
    long run = 0;
    for (int i = 0; i < n; i++) { run += diff[i]; sb.Append(run).Append(' '); }

**Complexity.** O(n + q). The extra cell at index n means \`r + 1\` never needs a bounds check.

## Problem 4 — Next permutation

*Rearrange the numbers into the next larger ordering; if it is the largest, wrap to the smallest. 1 3 5 4 2 → 1 4 2 3 5.*

**Approach.** From the right, find the first i with a[i] < a[i + 1] (the pivot). If none, reverse everything.
Otherwise swap the pivot with the rightmost value larger than it, then reverse the suffix after the pivot — it was
descending, and the smallest arrangement of it is ascending.

**Complexity.** O(n), O(1) space. Generating all permutations to find the next is O(n!·n).

## Round habit

Before typing: name the pattern, the cost, and the overflow risk. After typing: run the sample, n = 1, k = 0,
k > n, all-negative values and the largest values.`,
    mcqs: [
      mcq('Rotating 1 2 3 4 5 right by k = 7 with the three-reversal method, after `k %= n`. What is the result?',
        [['3 4 5 1 2', false],
         ['4 5 1 2 3', true],
         ['1 2 3 4 5', false],
         ['An IndexOutOfRangeException', false]],
        '7 % 5 is 2, so it is a rotation by 2: reverse all (5 4 3 2 1), the first two (4 5 3 2 1), then the rest (4 5 1 2 3). Without k %= n, Reverse(a, 0, 6) would index past the end.'),
      mcq('With the replacement window and k = 1, what is the longest one-letter stretch you can make from "AABABBA"?',
        [['4', true],
         ['3', false],
         ['5', false],
         ['7', false]],
        'The window "BABB" (indices 2 to 5) has one A; replacing it gives "BBBB", length 4. Every window of length 5 has at least two letters that differ from its most frequent one, so 4 is the best.'),
      mcq('Five zeros receive one update, "add 5 to indices 1 to 3", through a difference array diff of length n + 1. Which entries of diff change?',
        [['diff[1] += 5 and diff[3] -= 5', false],
         ['diff[0] += 5 and diff[3] -= 5', false],
         ['diff[1], diff[2] and diff[3] all get += 5', false],
         ['diff[1] += 5 and diff[4] -= 5', true]],
        'The increment starts at l = 1 and must stop after r = 3, so it is cancelled at r + 1 = 4. The prefix sum of 0 5 0 0 -5 is 0 5 5 5 0, the intended array.'),
      mcq('For the circular maximum subarray, why is "total minus the minimum subarray" wrong for -3 -2 -5?',
        [['The total overflows a long when all values are negative', false],
         ['Kadane can find a maximum but never a minimum subarray', false],
         ['It removes every element, leaving 0', true],
         ['It counts the largest element twice', false]],
        'Every value is negative, so the minimum subarray is the whole array and total minus it is 0 — the sum of an empty selection. The answer must be non-empty, so when every value is negative, return the plain maximum (-2).'),
      mcq('What is the next permutation of 1 3 5 4 2?',
        [['1 3 5 2 4', false],
         ['1 4 5 3 2', false],
         ['1 4 2 3 5', true],
         ['1 5 2 3 4', false]],
        'The pivot is 3 (the first value from the right smaller than its neighbour). Swap it with the rightmost larger value, 4, giving 1 4 5 3 2, then reverse the descending suffix to 1 4 2 3 5.'),
    ],
    assignment: {
      title: 'Best Stretch on a Circular Track',
      description: 'Kadane twice: the largest sum of a contiguous stretch when the array wraps around, with a long answer.',
      instructions: `n checkpoints sit on a circular track, each with a score that can be negative. You may pick one
contiguous stretch of checkpoints — it may wrap from the last checkpoint back to the first — but each checkpoint
can be used at most once and the stretch cannot be empty. Print the largest total score you can collect.

**Input.** The first line is n (1 ≤ n ≤ 200 000). The next line(s) hold n integers, each between −10⁹ and 10⁹,
separated by spaces (they may be split across several lines).

**Output.** One integer: the largest total of a non-empty circular stretch.

| Input | Output | Why |
|---|---|---|
| \`5\` / \`5 -3 5 -2 1\` | \`9\` | 5 −2 1 5, wrapping round |
| \`3\` / \`-3 -2 -5\` | \`-2\` | every value is negative: take the largest |
| \`1\` / \`7\` | \`7\` | |

Requirements:

- O(n) time. Trying every start and length is O(n²) — 4×10¹⁰ steps on the largest test. A wrapping stretch
  leaves out a contiguous middle part; think about which part you would want to leave out.
- The total can exceed the \`int\` range: 200 000 values of 10⁹ sum to 2×10¹⁴. Use \`long\`.
- Watch the case where every value is negative.
- Print only the number, and state the cost in a comment at the top of \`Main\`.
${RUNNER_NOTE}`,
      rubric: [
        { criterion: 'Correct total', description: 'Every test passes, including wrap-around stretches, all-negative input, a single value and totals beyond the int range.', maxPoints: 50 },
        { criterion: 'Linear time', description: 'Kadane for the best stretch and the worst stretch (or an equivalent prefix approach); no nested loops over starts.', maxPoints: 30 },
        { criterion: 'Overflow-safe and stated cost', description: 'Totals are long; O(n) time and O(1) extra space stated.', maxPoints: 20 },
      ],
      totalPoints: 100,
      coding: {
        language: 'csharp',
        starter: `using System;

class Program
{
${READER}
    static void Main()
    {
        int n = int.Parse(Next());
        long[] a = new long[n];
        for (int i = 0; i < n; i++) a[i] = long.Parse(Next());

        // TODO: find the largest sum of a non-empty stretch, allowing it to wrap around, in O(n)
        // TODO: print it (it may not fit in an int)
    }
}
`,
        tests: [
          { input: '5\n5 -3 5 -2 1\n', expectedOutput: '9' },
          { input: '3\n-3 -2 -5\n', expectedOutput: '-2' },
          { input: '1\n7\n', expectedOutput: '7' },
          { input: '6\n8 -1 -1\n-1 -1 8\n', expectedOutput: '16', isHidden: true },
          { input: '1\n-1000000000\n', expectedOutput: '-1000000000', isHidden: true },
          { input: '5\n-2 4 -5 4 -5\n', expectedOutput: '4', isHidden: true },
          { input: `200000\n${seq(200000, () => 1000000000)}\n`, expectedOutput: '200000000000000', isHidden: true },
          { input: `200000\n${seq(200000, i => (i === 100000 ? -1000000000 : 1000000000))}\n`, expectedOutput: '199999000000000', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 60,
      },
    },
  },

  /* ── Round 2: hashing ── */
  {
    unitCode: 'JT_CODING_CSHARP_ROUND_HASHING',
    notes: `Hashing turns "have I seen this before?" from a scan into an expected O(1) lookup. The signal in an OA
is a brute force that compares every pair: if the inner loop is *searching* for a value, a \`Dictionary\` or
\`HashSet\` usually removes it. In C#, the tools are \`Dictionary<TKey, TValue>\` with \`TryGetValue\`, and
\`HashSet<T>\` — and the keys must have value equality (numbers and strings do; arrays do not).

## Problem 1 — Count the distinct values in every window of size k

*n values and k; print the number of distinct values in each of the n − k + 1 windows.*

**Approach.** Keep counts for the current window. Moving right adds one value and removes one; when a count drops
to 0, **remove the key**, so \`Count\` is the number of distinct values.

    var cnt = new Dictionary<int, int>();
    for (int i = 0; i < n; i++)
    {
        int c;
        cnt.TryGetValue(a[i], out c);
        cnt[a[i]] = c + 1;
        if (i >= k)
        {
            int old = a[i - k];
            if (--cnt[old] == 0) cnt.Remove(old);
        }
        if (i >= k - 1) sb.Append(cnt.Count).Append(' ');
    }

**Complexity.** O(n) expected. Rebuilding a set for every window is O(n·k).

## Problem 2 — Group strings that are shifts of each other

*"abc", "bcd" and "xyz" are one group (each letter moved by the same amount, wrapping z → a); "az" and "ba" are
another.*

**Approach.** A group shares the gaps between consecutive letters, taken mod 26. Build that as a string key.

    static string Key(string s)
    {
        var sb = new StringBuilder();
        for (int i = 1; i < s.Length; i++)
            sb.Append(((s[i] - s[i - 1]) % 26 + 26) % 26).Append(',');
        return sb.ToString();
    }

Then \`Dictionary<string, List<string>>\`, adding each word under its key.

**Complexity.** O(total characters). The \`+ 26\` matters: in C# \`('a' - 'z') % 26\` is -25, not 1.

## Problem 3 — A duplicate within distance k

*Print YES if two equal values sit at indices i ≠ j with |i − j| ≤ k.*

**Approach.** Remember the last index of each value; a repeat is close enough if it is within k of that index.

    var last = new Dictionary<int, int>();
    for (int i = 0; i < n; i++)
    {
        int j;
        if (last.TryGetValue(a[i], out j) && i - j <= k) return true;
        last[a[i]] = i;
    }
    return false;

**Complexity.** O(n) expected, O(n) space (or O(k) with a \`HashSet\` holding only the last k values).

## Problem 4 — The longest subarray with sum exactly k (negatives allowed)

**Approach.** Prefix sums again, but this time store the **first** index at which each prefix sum appears. At
index i with prefix p, the longest subarray ending here starts just after the first index whose prefix is p − k.
Never overwrite an earlier index — the earliest one gives the longest subarray.

    var first = new Dictionary<long, int>();
    first[0] = -1;
    long p = 0; int best = 0;
    for (int i = 0; i < n; i++)
    {
        p += a[i];
        int j;
        if (first.TryGetValue(p - k, out j)) best = Math.Max(best, i - j);
        if (!first.ContainsKey(p)) first[p] = i;
    }

**Complexity.** O(n) expected. A sliding window does not work: with negatives, growing a window can shrink its sum.

## Round habit

Say "expected O(1) per operation" rather than "O(1)". If the keys are small integers (marks 0–100, lowercase
letters), an \`int[]\` beats a \`Dictionary\`. And normalise every remainder of a value that can be negative.`,
    mcqs: [
      mcq('The window-distinct code decrements the outgoing value\'s count but never removes keys that reach 0. What does it print?',
        [['Too many: keys at zero are still counted', true],
         ['Too few: zero keys block new values', false],
         ['The right count: a zero entry means absent', false],
         ['A KeyNotFoundException on the next window', false]],
        'Dictionary.Count counts keys, not positive values, so every value that has left the window still adds one. Remove the key when its count drops to 0.'),
      mcq('Prefix sums are bucketed by `prefix % k` in C# with k = 5 and no normalising. Which two prefix sums are equal mod 5 but land in different buckets?',
        [['-5 and 0', false],
         ['3 and 8', false],
         ['-2 and 3', true],
         ['-2 and -7', false]],
        'In C# -2 % 5 is -2 and 3 % 5 is 3, so they get different keys although -2 ≡ 3 (mod 5). -5 and 0 both give 0, and 3 and 8 both give 3, as do -2 and -7 with -2 each. ((p % k) + k) % k fixes it.'),
      mcq('In the longest-subarray-with-sum-k solution, why is a prefix sum\'s index stored only the first time it is seen?',
        [['Overwriting it would make the Dictionary throw on a duplicate key', false],
         ['Later indices of the same prefix sum are never reachable', false],
         ['It halves the memory the Dictionary uses on long inputs', false],
         ['The earliest start gives the longest subarray ending at i', true]],
        'For a fixed end i, the subarray starts just after the index whose prefix is p − k; the earlier that index, the longer the subarray. The indexer setter would happily overwrite, which is exactly the bug.'),
      mcq('Grouping shifted strings by the gaps between letters mod 26, which pair lands in the same group?',
        [['"ab" and "ba"', false],
         ['"az" and "ba"', true],
         ['"abc" and "abd"', false],
         ['"aa" and "ab"', false]],
        '"az" has a gap of 25; "ba" has a gap of -1, which is 25 mod 26 — same key, so each is a shift of the other (move every letter by one: a→b, z→a). The other pairs have gaps 1 vs 25, 1,1 vs 1,2 and 0 vs 1.'),
      mcq('Why is `count.TryGetValue(x, out c)` usually preferred to `if (count.ContainsKey(x)) c = count[x];`?',
        [['It hashes and probes x once, not twice', true],
         ['ContainsKey is O(n) on a Dictionary', false],
         ['The indexer copies the value out', false],
         ['ContainsKey misses newly added keys', false]],
        'Both are expected O(1), but ContainsKey followed by the indexer hashes and probes twice; TryGetValue does it once and gives the default value when the key is absent.'),
    ],
    assignment: {
      title: 'Stretches That Divide Evenly',
      description: 'Prefix sums and a Dictionary of remainders: count the subarrays whose sum is divisible by k, negatives included.',
      instructions: `A shop records n daily cash changes (negative on a bad day). Count the **contiguous, non-empty**
stretches of days whose total is divisible by k.

**Input.** The first line is \`n k\` (1 ≤ n ≤ 200 000, 1 ≤ k ≤ 10¹²). The next line(s) hold n integers, each between
−10⁹ and 10⁹ (they may be negative, and may be split across lines).

**Output.** One integer: the number of such stretches.

| Input | Output |
|---|---|
| \`6 5\` / \`4 5 0 -2 -3 1\` | \`7\` |
| \`1 9\` / \`5\` | \`0\` |
| \`3 1\` / \`-1 -2 -3\` | \`6\` |

Requirements:

- O(n) expected time. The sum of a[i..j] is prefix[j] − prefix[i − 1], and it is divisible by k exactly when the two
  prefixes have the same remainder.
- In C#, \`%\` of a negative number is negative or zero. Two prefixes with the same remainder mod k must land in the
  same bucket — one hidden test is built to catch this.
- k, the prefix sums and the count need \`long\`: 100 000 zeros already give 5 000 050 000 stretches.
- Print only the number, and state the cost in a comment at the top of \`Main\`.
${RUNNER_NOTE}`,
      rubric: [
        { criterion: 'Correct count', description: 'Every test passes, including negative values, k = 1, a k beyond the int range and a count beyond the int range.', maxPoints: 50 },
        { criterion: 'Remainders in a Dictionary', description: 'One pass with a Dictionary of remainder counts, seeded with remainder 0, and remainders normalised into 0..k-1.', maxPoints: 30 },
        { criterion: 'Overflow-safe and stated cost', description: 'k, sums and the count are long; O(n) time and O(min(n, k)) space stated.', maxPoints: 20 },
      ],
      totalPoints: 100,
      coding: {
        language: 'csharp',
        starter: `using System;
using System.Collections.Generic;

class Program
{
${READER}
    static void Main()
    {
        int n = int.Parse(Next());
        long k = long.Parse(Next());
        long[] a = new long[n];
        for (int i = 0; i < n; i++) a[i] = long.Parse(Next());

        // TODO: count stretches whose sum is divisible by k, in one pass over the prefix sums
        // TODO: print the count
    }
}
`,
        tests: [
          { input: '6 5\n4 5 0 -2 -3 1\n', expectedOutput: '7' },
          { input: '1 9\n5\n', expectedOutput: '0' },
          { input: '3 1\n-1 -2 -3\n', expectedOutput: '6' },
          { input: '3 2\n-1 2 -2\n', expectedOutput: '3', isHidden: true },
          { input: '4 3000000000\n1000000000 1000000000 1000000000 -3000000000\n', expectedOutput: '3', isHidden: true },
          { input: `100000 7\n${seq(100000, () => 0)}\n`, expectedOutput: '5000050000', isHidden: true },
          { input: `200000 1000000007\n${seq(200000, i => (i % 2 === 0 ? -1000000000 : 999999999))}\n`, expectedOutput: '99993', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 60,
      },
    },
  },

  /* ── Round 3: stacks, queues and linked lists ── */
  {
    unitCode: 'JT_CODING_CSHARP_ROUND_STACKS_LISTS',
    notes: `Stack problems in an OA are mostly "the nearest bigger thing" or "undo the last thing" in disguise;
linked-list problems are pointer bookkeeping. In C# the stack is \`Stack<T>\`, the queue \`Queue<T>\`, and a
two-ended queue is \`LinkedList<T>\` (\`AddFirst\`, \`AddLast\`, \`RemoveFirst\`, \`RemoveLast\`, all O(1)). Two C#
facts matter here: \`Pop\` and \`Peek\` on an empty stack throw \`InvalidOperationException\`, and **enumerating a
\`Stack<T>\` goes from the top down**.

## Problem 1 — Next greater element in a circular array

*For each value, print the first larger value met walking right and wrapping around, or -1. 1 2 1 → 2 -1 2.*

**Approach.** A monotonic stack of indices waiting for their answer, walked over the array **twice** (i from 0 to
2n − 1, index i % n), pushing only in the first pass.

    int[] ans = new int[n];
    for (int i = 0; i < n; i++) ans[i] = -1;
    var st = new Stack<int>();
    for (int i = 0; i < 2 * n; i++)
    {
        int x = a[i % n];
        while (st.Count > 0 && a[st.Peek()] < x) ans[st.Pop()] = x;
        if (i < n) st.Push(i);
    }

**Complexity.** O(n): each index is pushed once and popped at most once.

## Problem 2 — Simplify a Unix path

*"/home//user/./docs/../pics/" → "/home/user/pics". ".." goes up one level (not above the root), "." and empty parts
are ignored.*

**Approach.** Split on '/', push names, pop on "..". The trap is the output: \`string.Join("/", stack)\` lists the
stack **top first**, so the path comes out backwards. Use a \`List<string>\` as the stack (Add / RemoveAt the end),
or reverse before joining.

    var parts = new List<string>();
    foreach (string p in path.Split('/'))
    {
        if (p == "" || p == ".") continue;
        if (p == "..") { if (parts.Count > 0) parts.RemoveAt(parts.Count - 1); }
        else parts.Add(p);
    }
    Console.WriteLine("/" + string.Join("/", parts));

**Complexity.** O(length of the path).

## Problem 3 — Reorder a linked list as L0 Ln L1 Ln−1 …

*1 → 2 → 3 → 4 → 5 becomes 1 → 5 → 2 → 4 → 3, in place.*

**Approach.** Three pointer steps you should be able to write blind: find the middle with slow and fast pointers;
reverse the second half; merge the two halves alternately.

    ListNode slow = head, fast = head;
    while (fast.Next != null && fast.Next.Next != null) { slow = slow.Next; fast = fast.Next.Next; }
    ListNode prev = null, cur = slow.Next;
    slow.Next = null;                                   // cut: the first half ends here
    while (cur != null) { ListNode nx = cur.Next; cur.Next = prev; prev = cur; cur = nx; }
    ListNode a = head, b = prev;
    while (b != null)
    {
        ListNode an = a.Next, bn = b.Next;
        a.Next = b; b.Next = an;
        a = an; b = bn;
    }

**Complexity.** O(n) time, O(1) space. Copying the nodes into a \`List\` and relinking is O(n) space — fine to
mention, but the interviewer wants the pointer version. Forgetting \`slow.Next = null\` leaves a cycle.

## Round habit

Before every \`Pop\` or \`Peek\`, ask "can this be empty here?". After a linked-list solution, trace it on 0, 1 and
2 nodes — that is where the null references hide.`,
    mcqs: [
      mcq('With the two-pass monotonic stack, what does the circular next-greater-element give for 1 2 1?',
        [['2 -1 -1', false],
         ['-1 -1 2', false],
         ['2 2 -1', false],
         ['2 -1 2', true]],
        'The first 1 sees 2; the 2 has nothing larger anywhere, so -1; the last 1 wraps round to the 2. Without the second pass the last 1 would wrongly get -1.'),
      mcq('After `var st = new Stack<string>(); st.Push("a"); st.Push("b"); st.Push("c");`, what does `string.Join("/", st)` return?',
        [['a/b/c', false],
         ['c/b/a', true],
         ['a/c/b', false],
         ['Nothing: it does not compile without ToArray()', false]],
        'Stack<T> enumerates from the top down, so Join sees c, b, a. A path simplifier that joins its stack directly prints the path backwards.'),
      mcq('What does reordering 1 → 2 → 3 → 4 → 5 as L0 Ln L1 Ln−1 … produce?',
        [['1 → 2 → 5 → 4 → 3', false],
         ['1 → 3 → 5 → 2 → 4', false],
         ['1 → 5 → 2 → 4 → 3', true],
         ['5 → 1 → 4 → 2 → 3', false]],
        'The middle is 3; the second half 4 → 5 reversed is 5 → 4; merging 1 2 3 with 5 4 alternately gives 1 5 2 4 3.'),
      mcq('In a two-stack expression evaluator, operators already on the stack are applied while their precedence is >= the new one. What would `>` instead of `>=` break?',
        [['8 - 3 - 2 would evaluate to 7, not 3', true],
         ['3 + 4 * 2 would give 14, not 11', false],
         ['Parentheses would no longer match', false],
         ['Division would round up, not down', false]],
        'With >, the first minus stays on the stack when the second arrives, so 3 - 2 is computed first and 8 - 1 = 7. Popping equal precedence first makes - and / left-associative: (8 - 3) - 2 = 3.'),
      mcq('What does `Pop()` do on an empty `Stack<char>`?',
        [['It returns the default value, \'\\0\'', false],
         ['It throws IndexOutOfRangeException', false],
         ['It returns null', false],
         ['It throws InvalidOperationException', true]],
        'Stack<T>.Pop and Peek throw InvalidOperationException ("Stack empty") when Count is 0. In a bracket or expression problem that is a malformed-input case you must check with Count > 0 first.'),
    ],
    assignment: {
      title: 'A Calculator Without eval',
      description: 'Two stacks — values and operators — to evaluate an arithmetic expression with precedence and parentheses, exactly.',
      instructions: `Evaluate one arithmetic expression. It contains non-negative integers, the operators \`+ - * /\`,
parentheses and spaces. \`*\` and \`/\` bind tighter than \`+\` and \`-\`; operators of equal precedence go left to
right; \`/\` is integer division that truncates toward zero (as C# does). There is no unary minus.

**Input.** One line, up to 400 000 characters. Every number is at most 10⁹; parentheses are balanced; no division
by zero occurs; every intermediate value fits in a \`long\`. Parentheses may be nested up to 20 000 deep.

**Output.** One integer: the value.

| Input | Output |
|---|---|
| \`3 + 4 * 2\` | \`11\` |
| \`(1 + 2) * (3 - 10) / 2\` | \`-10\` |
| \`  7 \` | \`7\` |

Requirements:

- O(length) time, using two \`Stack\`s (values and operators) — the classic shunting-yard evaluation.
- Left to right for equal precedence: \`1 - 2 - 3\` is -4, and \`64 / 4 / 2 * 3\` is 24.
- Values need \`long\` (\`100000000 * 100000000\` is 10¹⁶).
- No recursion: nesting 20 000 deep is enough to overflow the stack of a recursive parser.
- Do not call any expression-evaluating library; print only the number.
${RUNNER_NOTE}`,
      rubric: [
        { criterion: 'Correct value', description: 'Every test passes, including precedence, left-to-right subtraction and division, negative results, 10^16 products and deep nesting.', maxPoints: 50 },
        { criterion: 'Two stacks, no recursion', description: 'A value stack and an operator stack, applying operators by precedence and at closing parentheses; linear time.', maxPoints: 30 },
        { criterion: 'Robust parsing', description: 'Multi-digit numbers, spaces anywhere and long arithmetic handled; no Peek or Pop on an empty stack.', maxPoints: 20 },
      ],
      totalPoints: 100,
      coding: {
        language: 'csharp',
        starter: `using System;
using System.Collections.Generic;

class Program
{
    static void Main()
    {
        string s = Console.ReadLine();
        var values = new Stack<long>();
        var ops = new Stack<char>();

        // TODO: scan s once: push numbers, push '(' , on ')' apply operators back to '(',
        //       and before pushing an operator apply those on the stack with precedence >= its own
        // TODO: apply what is left and print the single remaining value
    }
}
`,
        tests: [
          { input: '3 + 4 * 2\n', expectedOutput: '11' },
          { input: '(1 + 2) * (3 - 10) / 2\n', expectedOutput: '-10' },
          { input: '  7 \n', expectedOutput: '7' },
          { input: '1 - 2 - 3\n', expectedOutput: '-4', isHidden: true },
          { input: '2 * (3 + 4 * (5 - 6)) - 8 / 3\n', expectedOutput: '-4', isHidden: true },
          { input: '64 / 4 / 2 * 3\n', expectedOutput: '24', isHidden: true },
          { input: '100000000 * 100000000 / 7\n', expectedOutput: '1428571428571428', isHidden: true },
          { input: `${'('.repeat(20000)}1+2${')'.repeat(20000)}*3\n`, expectedOutput: '9', isHidden: true },
          { input: `${Array(50000).fill('2*3-5').join(' + ')}\n`, expectedOutput: '50000', isHidden: true },
        ],
        difficulty: 'hard',
        passingPoints: 60,
      },
    },
  },

  /* ── Round 4: trees and graphs ── */
  {
    unitCode: 'JT_CODING_CSHARP_ROUND_TREES_GRAPHS',
    notes: `Tree questions test whether one traversal can return two things at once; graph questions test whether
you pick the right search for the edge weights. In C#: a tree node is a small class with \`Left\` and \`Right\`;
a graph is \`List<int>[]\` (or \`List<int[]>[]\` with weights) filled from the input; deep inputs mean **no
recursion** — Mono and .NET both kill the process on a stack overflow.

## Problem 1 — Is the tree height-balanced?

*Every node's two subtrees differ in height by at most 1.*

**Approach.** Calling \`Height\` at every node is O(n²) on a skewed tree. Instead, one post-order pass returns the
height, or -1 as a "not balanced" signal that propagates up.

    static int Check(TreeNode node)
    {
        if (node == null) return 0;
        int l = Check(node.Left);
        if (l < 0) return -1;
        int r = Check(node.Right);
        if (r < 0 || Math.Abs(l - r) > 1) return -1;
        return Math.Max(l, r) + 1;
    }
    // balanced  <=>  Check(root) >= 0

**Complexity.** O(n), O(height) stack. Say so: on a 10⁵-node chain, write it iteratively.

## Problem 2 — The kth smallest value in a BST

**Approach.** In-order traversal of a BST visits values in ascending order; stop at the kth. Iteratively, with a
\`Stack<TreeNode>\`:

    var st = new Stack<TreeNode>();
    TreeNode cur = root;
    while (cur != null || st.Count > 0)
    {
        while (cur != null) { st.Push(cur); cur = cur.Left; }
        cur = st.Pop();
        if (--k == 0) return cur.Val;
        cur = cur.Right;
    }

**Complexity.** O(h + k): it never visits more than the path down plus k nodes.

## Problem 3 — The largest island in a grid

*'1' is land, '0' water; land connects up, down, left and right. Print the area of the largest island.*

**Approach.** For every unvisited land cell, flood-fill with an explicit stack and count the cells. Encode a cell
as \`r * cols + c\` — one \`int\` — instead of an \`int[]\` (which also would not work as a \`HashSet\` key).

    int[] dr = { 1, -1, 0, 0 }, dc = { 0, 0, 1, -1 };
    var seen = new bool[rows, cols];
    int best = 0;
    for (int r = 0; r < rows; r++)
        for (int c = 0; c < cols; c++)
        {
            if (grid[r][c] != '1' || seen[r, c]) continue;
            var st = new Stack<int>();
            st.Push(r * cols + c); seen[r, c] = true;
            int area = 0;
            while (st.Count > 0)
            {
                int cell = st.Pop(); area++;
                int cr = cell / cols, cc = cell % cols;
                for (int d = 0; d < 4; d++)
                {
                    int nr = cr + dr[d], nc = cc + dc[d];
                    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
                    if (grid[nr][nc] == '1' && !seen[nr, nc]) { seen[nr, nc] = true; st.Push(nr * cols + nc); }
                }
            }
            best = Math.Max(best, area);
        }

**Complexity.** O(rows × cols). Mark a cell when it is pushed, not when it is popped, or it is pushed many times.

## Choosing the search

| Edge weights | Search | Structure in C# |
|---|---|---|
| none (count edges) | BFS | \`Queue<int>\` |
| only 0 and 1 | 0-1 BFS | \`LinkedList<int>\` as a deque |
| non-negative | Dijkstra | a hand-written heap or \`SortedSet\` with unique keys |

The graded exercise below is the middle row.

## Round habit

Read the edge list into adjacency lists first, then decide the search. Say the cost as O(n + m) and name the
recursion risk before the interviewer does.`,
    mcqs: [
      mcq('A balance check calls a separate Height(node) at every node. What is its cost on a 10^5-node tree that is one long chain?',
        [['O(n), since each node is visited once', false],
         ['O(n²), since heights are recomputed at every level', true],
         ['O(n log n), since the tree halves at each level', false],
         ['O(log n), since only one path is followed', false]],
        'On a chain, Height at depth d walks the n − d nodes below it, and summing that over every node is about n²/2. Returning the height and the balanced flag from one post-order pass makes it O(n).'),
      mcq('A BST is built by inserting 50 30 70 20 40 60 80. What does the kth-smallest routine return for k = 3?',
        [['40', true],
         ['30', false],
         ['50', false],
         ['60', false]],
        'In-order visits 20 30 40 50 60 70 80, so the third value is 40. The routine pushes 50, 30, 20 down the left spine, then pops 20, 30 and finally 40 from 30\'s right subtree.'),
      mcq('In 0-1 BFS, why is a neighbour reached by a free (0) road added to the front of the deque?',
        [['To process free roads before toll roads anywhere in the graph', false],
         ['Because LinkedList<T> only allows O(1) inserts at the front', false],
         ['It has the same distance as the current node', true],
         ['So that each node is enqueued at most once', false]],
        'A 0-edge does not increase the distance, so that neighbour belongs with the nodes at the current distance, which are at the front. The deque then always holds at most two consecutive distances in order, like Dijkstra\'s heap.'),
      mcq('One hidden test has a toll road 1–5 and a free path 1–2–3–4–5. What does a plain BFS that follows the fewest roads and then counts their tolls print?',
        [['0', false],
         ['1', true],
         ['4', false],
         ['-1', false]],
        'Plain BFS minimises the number of roads, so it takes the single road 1–5 and reports its one toll. The free path uses four roads but no tolls, so the right answer is 0 — which is why the weights need 0-1 BFS.'),
      mcq('On a judge without PriorityQueue, which .NET type gives O(1) insert and remove at both ends for a 0-1 BFS?',
        [['Queue<int>', false],
         ['List<int> with Insert(0, x)', false],
         ['Stack<int>', false],
         ['LinkedList<int>', true]],
        'LinkedList<T> has AddFirst, AddLast, RemoveFirst and RemoveLast, all O(1). Queue<T> cannot add at the front, Stack<T> only works at one end, and List<T>.Insert(0, x) shifts every element, O(n).'),
    ],
    assignment: {
      title: 'Fewest Tolls Across the City',
      description: 'A 0-1 BFS with a LinkedList deque: the route from junction 1 to junction n that pays the fewest tolls.',
      instructions: `A city has n junctions and m two-way roads. Some roads are free (0) and some charge a toll (1).
A delivery rider starts at junction 1 and must reach junction n, paying as few tolls as possible; the number of
roads used does not matter. Print the fewest tolls, or -1 if junction n cannot be reached.

**Input.** The first line is \`n m\` (2 ≤ n ≤ 100 000, 0 ≤ m ≤ 200 000). Each of the next m lines is \`u v t\`: a
road between u and v (1-based) with toll t ∈ {0, 1}. There may be several roads between the same two junctions,
and a road may join a junction to itself.

**Output.** One integer: the fewest tolls from 1 to n, or \`-1\`.

| Input | Output |
|---|---|
| \`4 4\` / \`1 2 1\` / \`2 4 1\` / \`1 3 0\` / \`3 4 1\` | \`1\` |
| \`3 1\` / \`1 2 0\` | \`-1\` |
| \`2 1\` / \`1 2 0\` | \`0\` |

Requirements:

- O(n + m) time: a 0-1 BFS, using a \`LinkedList<int>\` as a deque — free roads to the front, toll roads to the back.
  A plain BFS counts roads, not tolls, and one hidden test is built to catch it.
- Store the graph as adjacency lists; an n × n matrix is 10¹⁰ cells.
- No recursion: one hidden test is a single path through all 100 000 junctions.
- Print only the number, and state the cost in a comment at the top of \`Main\`.
${RUNNER_NOTE}`,
      rubric: [
        { criterion: 'Correct tolls', description: 'Every test passes, including an unreachable junction, a free detour beating a direct toll road, parallel roads and a 100 000-junction path.', maxPoints: 50 },
        { criterion: '0-1 BFS in linear time', description: 'Adjacency lists and a deque that puts 0-edges at the front and 1-edges at the back, relaxing a distance array.', maxPoints: 30 },
        { criterion: 'Readable and safe', description: 'No recursion, no matrix; clear names; cost stated.', maxPoints: 20 },
      ],
      totalPoints: 100,
      coding: {
        language: 'csharp',
        starter: `using System;
using System.Collections.Generic;

class Program
{
${READER}
    static void Main()
    {
        int n = int.Parse(Next());
        int m = int.Parse(Next());
        List<int[]>[] adj = new List<int[]>[n + 1];
        for (int i = 1; i <= n; i++) adj[i] = new List<int[]>();
        for (int e = 0; e < m; e++)
        {
            int u = int.Parse(Next()), v = int.Parse(Next()), t = int.Parse(Next());
            adj[u].Add(new int[] { v, t });
            adj[v].Add(new int[] { u, t });
        }

        // TODO: 0-1 BFS from junction 1 with a LinkedList<int> as the deque
        // TODO: print the fewest tolls to junction n, or -1
    }
}
`,
        tests: [
          { input: '4 4\n1 2 1\n2 4 1\n1 3 0\n3 4 1\n', expectedOutput: '1' },
          { input: '3 1\n1 2 0\n', expectedOutput: '-1' },
          { input: '2 1\n1 2 0\n', expectedOutput: '0' },
          { input: '5 5\n1 5 1\n1 2 0\n2 3 0\n3 4 0\n4 5 0\n', expectedOutput: '0', isHidden: true },
          { input: '3 3\n1 2 1\n1 2 0\n2 3 1\n', expectedOutput: '1', isHidden: true },
          { input: `100000 99999\n${tollChain(100000)}\n`, expectedOutput: '50000', isHidden: true },
          { input: `100000 100000\n${tollChain(100000)}\n1 100000 1\n`, expectedOutput: '1', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 60,
      },
    },
  },

  /* ── Round 5: greedy and dynamic programming ── */
  {
    unitCode: 'JT_CODING_CSHARP_ROUND_DP_GREEDY',
    notes: `The question in this round is always the same: does the best-looking step ever lose? If you can find a
small input where it does, it is DP — write the state in words, then the recurrence, then the table. If you can
argue it never loses, it is greedy — and say the argument aloud. In C#, a 1-D \`long[]\` or \`bool[]\` table is
the usual answer; \`new int[n]\` starts at zeros, which matters when 0 is a real answer.

## Problem 1 — Minimum path sum in a grid

*Move only right or down from the top-left to the bottom-right; print the smallest total of the cells visited.
[[1,3,1],[1,5,1],[4,2,1]] → 7 (1 → 3 → 1 → 1 → 1).*

**Approach.** dp[c] = best total to reach column c of the current row. Each cell takes the better of "from above"
(the old dp[c]) and "from the left" (the new dp[c − 1]) — one row is enough.

    long[] dp = new long[cols];
    for (int r = 0; r < rows; r++)
        for (int c = 0; c < cols; c++)
        {
            if (r == 0 && c == 0) dp[c] = g[0][0];
            else if (r == 0) dp[c] = dp[c - 1] + g[r][c];
            else if (c == 0) dp[c] = dp[c] + g[r][c];
            else dp[c] = Math.Min(dp[c], dp[c - 1]) + g[r][c];
        }

**Complexity.** O(rows × cols) time, O(cols) space. Greedy ("go to the smaller neighbour") fails; find the grid
that beats it in your head.

## Problem 2 — Word break

*Can s be split into words from a dictionary? "applepenapple" with {apple, pen} → true; "catsandog" with {cats,
dog, sand, and, cat} → false.*

**Approach.** ok[i] = the first i characters can be split. ok[0] is true; ok[i] is true if some word ends at i and
ok[i − length] is true.

    var words = new HashSet<string>(dict);
    bool[] ok = new bool[s.Length + 1];
    ok[0] = true;
    for (int i = 1; i <= s.Length; i++)
        for (int len = 1; len <= maxLen && len <= i && !ok[i]; len++)
            if (ok[i - len] && words.Contains(s.Substring(i - len, len))) ok[i] = true;

**Complexity.** O(n · maxLen) lookups, each hashing a substring of up to maxLen. Plain recursion without the table
is exponential on "aaaa…ab".

## Problem 3 — Fewest candies (greedy in two passes)

*Children in a row have ratings; each gets at least one candy, and a child with a higher rating than a neighbour
gets more than that neighbour. Print the fewest candies. 1 2 2 → 4.*

**Approach.** Left to right, give one more than the left neighbour when rated higher; right to left, raise to one
more than the right neighbour when rated higher. Each pass enforces one side without breaking the other.

    long[] c = new long[n];
    for (int i = 0; i < n; i++) c[i] = 1;
    for (int i = 1; i < n; i++) if (r[i] > r[i - 1]) c[i] = c[i - 1] + 1;
    for (int i = n - 2; i >= 0; i--) if (r[i] > r[i + 1]) c[i] = Math.Max(c[i], c[i + 1] + 1);

**Complexity.** O(n). Equal ratings impose nothing — 1 2 2 gives 1 2 1.

## Round habit

Write the state in words before the code ("can[s] = some subset sums to s"). In a 0/1 table updated in place, the
direction of the inner loop decides whether an item is used once or many times — say which you need.`,
    mcqs: [
      mcq('What is the minimum path sum, moving only right or down, for the grid [[1,3,1],[1,5,1],[4,2,1]]?',
        [['8', false],
         ['12', false],
         ['7', true],
         ['5', false]],
        'The best route is 1 → 3 → 1 → 1 → 1 = 7, along the top row and down the right column. Going down first costs at least 1 + 1 + 4 + 2 + 1 = 9.'),
      mcq('Which of these word-break inputs gives false?',
        [['"catsandog" with cats, dog, sand, and, cat', true],
         ['"applepenapple" with apple, pen and pine', false],
         ['"leetcodeleet" with leet, code and lee', false],
         ['"aaaaab" with a, aa, aaa and b', false]],
        '"cats"+"and" or "cat"+"sand" both leave "og", which no word covers, so no split exists. The others split as apple|pen|apple, leet|code|leet and aaa|aa|b (among others).'),
      mcq('With ratings 1 2 2, how many candies does the two-pass greedy hand out?',
        [['5', false],
         ['6', false],
         ['3', false],
         ['4', true]],
        'Left to right gives 1 2 1 (the second 2 is not higher than its left neighbour); the right-to-left pass changes nothing. Equal neighbours have no constraint, so 4 is the minimum.'),
      mcq('In the subset-sum table `can[s]`, why does the inner loop run s from the top down to x for each value x?',
        [['It is faster for the CPU cache', false],
         ['So each value is used at most once', true],
         ['To find the largest sum first', false],
         ['An upward loop overruns the array', false]],
        'Going down, can[s − x] still holds the table from before this value was considered. Going up, can[s − x] may already include x, so x could be added again and again — the unbounded version.'),
      mcq('A greedy splits 8 7 6 5 4 into two teams by giving each value, largest first, to the lighter team. What difference does it end with?',
        [['0', false],
         ['2', false],
         ['4', true],
         ['6', false]],
        'Team A gets 8, B gets 7 and 6 (13), A gets 5 (13), then 4 goes to one side: 17 against 13, a difference of 4. But 8 + 7 = 15 and 6 + 5 + 4 = 15 gives 0, so the greedy is wrong.'),
    ],
    assignment: {
      title: 'Two Teams, as Even as Possible',
      description: 'Subset-sum DP over a bool table: split the players into two teams whose total ratings differ as little as possible.',
      instructions: `n players have ratings. Split them into two teams — every player in exactly one, and a team may
be empty — so that the two teams' total ratings differ as little as possible. Print that smallest difference.

**Input.** The first line is n (1 ≤ n ≤ 200). The next line(s) hold n ratings, each between 1 and 1000.

**Output.** One integer: the smallest possible difference between the two totals.

| Input | Output |
|---|---|
| \`4\` / \`1 6 11 5\` | \`1\` |
| \`1\` / \`7\` | \`7\` |
| \`2\` / \`3 3\` | \`0\` |

Requirements:

- Dynamic programming over reachable sums: a \`bool[]\` indexed by sum, at most total / 2 + 1 cells. O(n × total)
  is at most 200 × 100 000 = 2×10⁷ steps. Trying every split is 2²⁰⁰.
- Each player is used once — loop the sum in the direction that guarantees it.
- Greedy (largest first, to the lighter team) is wrong; one hidden test is built to catch it.
- Print only the number, and state the cost in a comment at the top of \`Main\`.
${RUNNER_NOTE}`,
      rubric: [
        { criterion: 'Correct difference', description: 'Every test passes, including one player, equal ratings, the greedy trap and 200 players.', maxPoints: 50 },
        { criterion: '0/1 subset-sum DP', description: 'A single bool table over sums up to total / 2, filled in the direction that uses each player once.', maxPoints: 30 },
        { criterion: 'Clear state and stated cost', description: 'The meaning of the table is written down; O(n × total) time and O(total) space stated.', maxPoints: 20 },
      ],
      totalPoints: 100,
      coding: {
        language: 'csharp',
        starter: `using System;

class Program
{
${READER}
    static void Main()
    {
        int n = int.Parse(Next());
        int[] a = new int[n];
        int total = 0;
        for (int i = 0; i < n; i++) { a[i] = int.Parse(Next()); total += a[i]; }

        // TODO: mark which team totals up to total / 2 are reachable, using each player once
        // TODO: print total - 2 * (the largest reachable total)
    }
}
`,
        tests: [
          { input: '4\n1 6 11 5\n', expectedOutput: '1' },
          { input: '1\n7\n', expectedOutput: '7' },
          { input: '2\n3 3\n', expectedOutput: '0' },
          { input: '5\n8 7 6 5 4\n', expectedOutput: '0', isHidden: true },
          { input: '3\n1 2 1000\n', expectedOutput: '997', isHidden: true },
          { input: `199\n${seq(199, () => 1000)}\n`, expectedOutput: '1000', isHidden: true },
          { input: `200\n${seq(200, i => 1000 - (i % 3) * 333)}\n`, expectedOutput: '267', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 60,
      },
    },
  },

  /* ── Checkpoint ── */
  {
    unitCode: 'JT_CODING_CSHARP_CHECKPOINT',
    notes: `Ten short C# snippets, the kind an interviewer pastes in after your coding round: "what does this
print?", "what is its cost?", "where is the bug?". Read each one as you would your own code before submitting —
types first (int or long? value or reference?), then loop bounds, then what the collection really does. Every
output below was compiled and run.`,
    checkpoint: [
      ck('CSHARP_BASICS', 'What does this print? `string a = "ab"; string b = new string(new[] { \'a\', \'b\' }); Console.WriteLine(a == b); Console.WriteLine((object)a == (object)b);`',
        [['True, then True', false],
         ['False, then False', false],
         ['True, then False', true],
         ['False, then True', false]],
        'C# overloads == for string to compare contents, so the first is True. Cast to object, == compares references, and the string built from a char array is a different object from the literal, so the second is False.'),
      ck('DSA_ARRAYS', '`int[] a = { 3, 1, 2 }; int[] b = a; Array.Sort(b); Console.WriteLine(a[0]);` — what is printed?',
        [['3', false],
         ['1', true],
         ['2', false],
         ['Nothing: Array.Sort(b) throws because b aliases a', false]],
        'Arrays are reference types: b = a copies the reference, not the elements, so sorting b sorts the one array both names point to. Use a.Clone() or Array.Copy to sort a separate copy.'),
      ck('DSA_STRINGS', 'What do `Console.WriteLine("" + \'a\' + 1);` and `Console.WriteLine(\'a\' + 1 + "");` print?',
        [['a1, then 98', true],
         ['a1, then a1', false],
         ['98, then 98', false],
         ['b, then 98', false]],
        'Evaluation is left to right. "" + \'a\' is the string "a", and adding 1 appends "1". In the second, \'a\' + 1 is char plus int, which is the int 98, and only then becomes a string.'),
      ck('DSA_HASHING', 'A BFS keeps visited cells in `var seen = new HashSet<int[]>();` and checks `seen.Contains(new[] { r, c })` after `seen.Add(new[] { r, c })` for the same r and c. What does Contains return?',
        [['True, because the arrays hold the same values', false],
         ['It does not compile: arrays cannot be set keys', false],
         ['True on .NET, but False on Mono', false],
         ['False, because arrays use reference equality', true]],
        'int[] does not override Equals or GetHashCode, so HashSet compares the array objects themselves and the new array is never found; the BFS loops forever or revisits cells. Encode the cell as r * cols + c.'),
      ck('DSA_STACK', 'With `var st = new Stack<int>(new[] { 1, 2, 3 });`, what are `st.Peek()` and `string.Join(",", st)`?',
        [['1, and 1,2,3', false],
         ['3, and 1,2,3', false],
         ['3, and 3,2,1', true],
         ['1, and 3,2,1', false]],
        'The constructor pushes the items in order, so 3 ends on top and Peek returns 3. Enumerating a Stack<T> goes from top to bottom, so Join gives 3,2,1.'),
      ck('DSA_LINKED_LIST', 'A reversal walks the list with prev and cur, re-pointing each cur.Next to prev correctly, but ends with `return head;`. For 1 → 2 → 3, what does printing from the returned node give?',
        [['1', true],
         ['3 2 1', false],
         ['1 2 3', false],
         ['It never stops: the list is now a cycle', false]],
        'The loop does reverse the links, so the old head 1 is now the tail with Next = null. Returning head prints just 1; the new head is prev, which points at 3.'),
      ck('DSA_TREES', 'A BST is built by inserting 5, 3, 8, 1, 4 in that order. What is its pre-order traversal?',
        [['1 3 4 5 8', false],
         ['5 3 8 1 4', false],
         ['1 4 3 8 5', false],
         ['5 3 1 4 8', true]],
        '5 is the root, 3 and 8 its children, and 1 and 4 the children of 3. Pre-order visits a node before its subtrees: 5, then 3 with 1 and 4, then 8. 1 3 4 5 8 is in-order and 1 4 3 8 5 is post-order.'),
      ck('DSA_GRAPHS', 'A Dijkstra uses `SortedSet<int[]>` with a comparer that compares only the distance, element [0]. Nodes 4 and 7 are both added at distance 9. What happens?',
        [['Both stay, in the order they were added', false],
         ['The second Add returns false and node 7 is lost', true],
         ['Add throws ArgumentException on the tie', false],
         ['Both stay, with node 7 placed before node 4', false]],
        'A SortedSet treats elements its comparer calls equal as the same element, so the second Add quietly returns false. Break ties in the comparer (by node), or encode distance * n + node as one long.'),
      ck('DSA_DP', 'A memoised count of ways uses `long[] memo = new long[n + 1];` and starts with `if (memo[i] != 0) return memo[i];`. Many states have 0 ways. What happens?',
        [['Nothing: a 0 is cached like any value', false],
         ['The count is wrong for states with 0 ways', false],
         ['States with 0 ways are recomputed every time', true],
         ['It throws IndexOutOfRangeException', false]],
        'new long[] starts at zeros, so a stored 0 looks like "not computed" and those states are solved again on every visit — back to exponential time. Fill memo with -1 first, or keep a separate bool[] done.'),
      ck('DSA_GREEDY', 'Using the two-pass candy greedy, how many candies are needed for ratings 1 0 2?',
        [['5', true],
         ['3', false],
         ['4', false],
         ['6', false]],
        'Left to right: 1 1 2 (the 2 beats its left neighbour 0). Right to left: the first child (1) beats its right neighbour (0), so it becomes 2. The result 2 1 2 totals 5.'),
    ],
  },
];
