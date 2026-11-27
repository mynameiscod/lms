/**
 * Career-track content, Year-4 placement for Java Full Stack + AI:
 *   JT_CODING_JAVA      — coding rounds in Java (the language habits, five timed rounds, a code-reading checkpoint)
 *   JT_MCQ_JAVA_SPRING  — the Java and Spring sections of a company online test
 *
 * Students have finished the track's Java and DSA topics, so nothing here re-teaches a structure: it is
 * the round itself — the problem a campus online assessment sets, the Java that solves it inside the
 * clock, and the Java habits that lose marks. None of the problems repeats the track's earlier exercises
 * (word frequency, longest distinct substring, Dijkstra routes and the rest).
 *
 * Every auto-graded exercise was checked before it shipped: a reference solution (not included here) was
 * compiled with javac --release 15 — the runner is Java 15, so no records — and passed every test, and every
 * starter compiles. Every "what does this print" answer was compiled and run on the same JDK.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

/* Large test inputs are built, not pasted: they exist to catch an O(n²) loop, an int total or a deep recursion. */
const zeros = (n: number) => `${n} 0\n${Array(n).fill('0').join(' ')}\n`;
const ones = (n: number) => `${n}\n${Array(n).fill('1').join(' ')}\n`;
const chain = (n: number) => `${n} ${n - 1}\n${Array.from({ length: n - 1 }, (_, i) => `${i + 1} ${i + 2}`).join('\n')}\n`;

/** The input-reading scaffold every coding-round starter shares: whitespace-separated tokens across any number of lines. */
const READER = `    static StringTokenizer tokens = new StringTokenizer("");
    static BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));

    static String next() throws IOException {
        while (!tokens.hasMoreTokens()) {
            String line = reader.readLine();
            if (line == null) return null;
            tokens = new StringTokenizer(line);
        }
        return tokens.nextToken();
    }
`;

/* ══ JT_CODING_JAVA — Coding Rounds in Java ═══════════════════════════════════════════════ */

const CODING_BUNDLES: PilotBundle[] = [
  {
    unitCode: 'JT_CODING_JAVA_JAVA_FOR_CODING',
    notes: `A coding round grades two things at once: whether your algorithm is right, and whether your Java
gets it to the judge inside the time limit without a wrong answer from overflow, a slow input loop or a
missing \`L\`. These are the questions interviewers and proctors actually ask about Java in a coding round,
and the habits that decide the second half of the grade.

## Q1. "Your solution is O(n log n) but timed out on n = 2×10⁵. What would you check first?"

**Strong answer.** "Input and output before the algorithm. \`Scanner\` parses with regular expressions and is
several times slower than a \`BufferedReader\` with a \`StringTokenizer\`; on a few hundred thousand numbers
that alone can cost a second. Then output: printing 10⁵ lines with \`System.out.println\` one at a time is
slow, so I build the output in a \`StringBuilder\` (or a \`PrintWriter\` around a \`BufferedWriter\`) and print
once."

    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    StringTokenizer st = new StringTokenizer(br.readLine());
    int n = Integer.parseInt(st.nextToken());

**Likely follow-up.** "Where does \`StreamTokenizer\` fit?" — it is fastest of the three, but it parses every
number as a \`double\`, so a \`long\` above 2⁵³ loses precision. Fine for ints, wrong for big longs.

**Common wrong answers.** "Java is just slow" (the same algorithm passes with fast I/O); "use more threads".

## Q2. "Why does reading n with nextInt() and then a line with nextLine() give an empty string?"

**Strong answer.** "\`nextInt()\` stops after the digits and leaves the newline in the buffer, so the next
\`nextLine()\` returns the rest of that line — empty. Either call \`nextLine()\` once to discard it, or read
everything line by line with \`BufferedReader\` and parse it myself."

**Follow-up.** "And with \`BufferedReader\`?" — \`readLine()\` returns \`null\` at end of input, so a loop
\`while ((line = br.readLine()) != null)\` reads input whose length is not given.

## Q3. "Where does int overflow bite in a coding round?"

**Strong answer.** "Anywhere a value can pass 2 147 483 647: sums of 10⁵ values up to 10⁹, products, counts
of pairs (n² / 2 for n = 10⁵ is 5×10⁹), and \`(a * b) % MOD\` with both near 10⁹. The fix is to make the
arithmetic long *before* it overflows — \`(long) a * b % MOD\` — because \`long r = a * b;\` multiplies in int
and only then widens the already-wrong result."

    int a = 1_000_000_000, b = 1_000_000_000;
    long wrong = a * b;           // -1486618624: overflowed in int, then widened
    long right = (long) a * b;    // 1000000000000000000

**Follow-up.** "And binary search?" — \`(lo + hi) / 2\` overflows when both are large; write
\`lo + (hi - lo) / 2\`.

**Common wrong answers.** "Use double" (loses exactness past 2⁵³); "use BigInteger everywhere" (correct but
slow, and nobody needs it for a 64-bit answer).

## Q4. "Arrays.sort on an int[] versus an Integer[] — is there a difference?"

**Strong answer.** "\`int[]\` uses a dual-pivot quicksort: fast in practice, O(n²) in the worst case, and not
stable. \`Integer[]\` and \`List\` use TimSort: O(n log n) guaranteed and stable, but every element is a boxed
object, so it is slower and uses more memory. To sort an \`int[]\` descending you either sort and read it
backwards or box it to use \`Collections.reverseOrder()\` — there is no comparator overload for primitives."

**Follow-up.** "When does stability matter?" — sorting records by a second key after a first, e.g. students
by marks where equal marks must keep roll-number order.

## Q5. "Which class do you use for a stack in Java?"

**Strong answer.** "\`ArrayDeque\`. \`push\`, \`pop\` and \`peek\` work on its head; \`offer\` and \`poll\` make it a
queue. The old \`Stack\` class extends \`Vector\`, so every call is synchronized — pointless in a single-thread
solution. \`ArrayDeque\` rejects \`null\`, which also catches a bug early."

**Follow-up.** "\`LinkedList\` also implements \`Deque\` — why not that?" — every node is a separate object; the
array-backed deque is faster and lighter.

## Q6. "How do you make a max-heap, or a heap of pairs?"

**Strong answer.** "\`new PriorityQueue<>(Collections.reverseOrder())\` for a max-heap of numbers. For pairs I
store \`int[]\` or a small class and pass a comparator — \`(x, y) -> Integer.compare(x[0], y[0])\`. I never write
\`(x, y) -> x - y\`: with large values of opposite sign the subtraction overflows and the order flips."

**Follow-up.** "Does iterating a PriorityQueue give sorted order?" — no; only repeated \`poll()\` does. The
backing array is a heap, not a sorted list.

## Q7. "Count frequencies — show me the Java."

**Strong answer.**

    Map<String, Integer> freq = new HashMap<>();
    for (String w : words) freq.merge(w, 1, Integer::sum);       // or put(w, getOrDefault(w, 0) + 1)
    int[] letters = new int[26];
    for (char c : s.toCharArray()) letters[c - 'a']++;           // lowercase only: an array beats a map

"For lowercase letters a 26-slot array is faster than a map. For adjacency lists I use
\`graph.computeIfAbsent(u, k -> new ArrayList<>()).add(v)\`."

**Follow-up.** "Two counts are both 200 — \`freq.get(a) == freq.get(b)\` prints false. Why?" — the values are
\`Integer\` objects; \`==\` compares references, and only -128 to 127 are cached. Compare with \`equals\` or unbox.

## Q8. "What is wrong with building the answer with s += c in a loop?"

**Strong answer.** "Strings are immutable, so every \`+=\` copies the whole string so far: n appends cost O(n²).
A \`StringBuilder\` appends in amortised O(1). Same for output: append to one builder and print once."

**Follow-up.** "Is \`substring\` O(1)?" — not since Java 7u6: it copies the characters, so it is O(length).

## Q9. "Your DFS passes small tests and crashes on a 10⁵-node path. What happened?"

**Strong answer.** "A \`StackOverflowError\`: recursion depth equals the path length, and the default thread
stack holds only some thousands of frames. I rewrite it iteratively with an explicit \`ArrayDeque\`, use BFS, or
for connectivity use union-find. As a last resort I run \`solve()\` in a \`new Thread(null, task, "main", 1 << 26)\`
with a 64 MB stack."

**Common wrong answer.** "Increase -Xss" — you do not control the judge's JVM flags.

## Q10. "Name the Java mistakes that cost marks in a timed round."

**Strong answer.**
- The class is not named \`Main\` (or is in a package), so the judge cannot run it.
- Debug prints or a trailing "Answer:" label left in the output — judges compare text exactly.
- \`Integer\` compared with \`==\`; \`String\` compared with \`==\`.
- \`a % m\` is negative when \`a\` is negative: use \`((a % m) + m) % m\` or \`Math.floorMod(a, m)\`.
- Removing from a list inside a for-each loop → \`ConcurrentModificationException\`; use an \`Iterator\` or
  \`removeIf\`.
- \`list.remove(i)\` on a \`List<Integer>\` removes by **index**; \`list.remove(Integer.valueOf(i))\` removes the value.
- \`Arrays.fill(dp, Integer.MAX_VALUE)\` and then \`dp[j] + 1\` — overflows to the most negative int.

**Follow-up.** "How do you check before submitting?" — run the sample, an empty or one-element case, the
largest values (overflow), and the largest n (time).`,
    workedExample: `**Goal: a timed-round template, then one problem solved in it — "print the k largest of n numbers, largest first".**

**1. The template you type at the start of every round.**

    import java.io.*;
    import java.util.*;

    public class Main {
        public static void main(String[] args) throws IOException {
            BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
            StringTokenizer st = new StringTokenizer(br.readLine());
            int n = Integer.parseInt(st.nextToken());
            int k = Integer.parseInt(st.nextToken());
            int[] a = new int[n];
            st = new StringTokenizer(br.readLine());
            for (int i = 0; i < n; i++) a[i] = Integer.parseInt(st.nextToken());

            StringBuilder out = new StringBuilder();
            // ... solve, appending to out ...
            System.out.print(out);
        }
    }

**2. Choose the idea before typing.** Sorting all n is O(n log n). A **min-heap of size k** keeps the k largest
seen so far: push each number, and when the heap holds k + 1, poll the smallest. That is O(n log k) — better when
k is small, and it works on a stream.

**3. The solving part.**

    PriorityQueue<Integer> heap = new PriorityQueue<>();           // min-heap
    for (int x : a) {
        heap.offer(x);
        if (heap.size() > k) heap.poll();                           // drop the smallest
    }
    int[] top = new int[heap.size()];
    for (int i = top.length - 1; i >= 0; i--) top[i] = heap.poll(); // poll ascending, fill from the back
    for (int x : top) out.append(x).append(' ');

**4. Say the checks aloud.** "k equal to n keeps everything; duplicates are kept because the heap holds values,
not a set; I fill \`top\` from the back because \`poll()\` gives ascending order, and iterating the heap would
not be sorted at all."

**5. State the cost.** Time O(n log k), extra space O(k). Input read with \`BufferedReader\`, output built once.`,
    mcqs: [
      mcq('A solution reads 200 000 integers with Scanner.nextInt() and times out; the same algorithm passes elsewhere. Which change most directly fixes it?',
        [['Replace the ArrayList with a LinkedList', false],
         ['Catch InputMismatchException around the loop', false],
         ['Make every helper method static and final', false],
         ['Read with BufferedReader and StringTokenizer', true]],
        'Scanner tokenises with regular expressions, which costs far more per number than splitting a line read by BufferedReader. On a few hundred thousand values the difference alone can exceed the time limit.'),
      mcq('In a round, `long total = count * price;` where both are int and each can be 100 000. What is the risk?',
        [['Nothing, since the declared type of total is long', false],
         ['A compile error about lossy conversion', false],
         ['The result is rounded to the nearest 1000', false],
         ['The product overflows in int before widening', true]],
        'Java evaluates count * price in int because both operands are int, and 10^10 exceeds the int range; only the already-wrapped result is widened to long. Cast one operand first: (long) count * price.'),
      mcq('You need a max-heap of int[] pairs ordered by the first element. Which comparator is safe for values from -10^9 to 10^9?',
        [['(x, y) -> y[0] - x[0]', false],
         ['(x, y) -> Integer.compare(y[0], x[0])', true],
         ['(x, y) -> x[0] > y[0] ? 1 : 0', false],
         ['(x, y) -> Math.abs(x[0] - y[0])', false]],
        'Integer.compare never overflows. y[0] - x[0] can exceed the int range when the values have opposite signs (10^9 minus -10^9) and flip the order; the other two never return a negative result, so they are not valid comparators.'),
    ],
    checkpoint: [
      ck('JAVA_BASICS', 'freq is a HashMap<String, Integer> in which both "a" and "b" were counted 200 times. What does `System.out.println(freq.get("a") == freq.get("b"));` print?',
        [['true, because both counts are 200', false],
         ['It throws a NullPointerException', false],
         ['It does not compile: Integer cannot use ==', false],
         ['false, because == compares Integer references', true]],
        'get returns Integer objects. Integer.valueOf caches only -128 to 127, so two separately boxed 200s are different objects and == compares references. equals, or unboxing to int, compares the values.'),
      ck('JAVA_BASICS', 'A judge feeds "3\\nalpha beta\\n". The code does `int n = sc.nextInt(); String line = sc.nextLine();`. What is line?',
        [['"alpha beta"', false],
         ['"3"', false],
         ['An empty string', true],
         ['null, at the end of input', false]],
        'nextInt consumes the digits but leaves the line break after them, so nextLine returns the remainder of that first line, which is empty. A second nextLine would return "alpha beta".'),
      ck('JAVA_BASICS', 'Which statement about Arrays.sort is correct?',
        [['Sorting int[] has an O(n²) worst case; Integer[] does not', true],
         ['An int[] can take Collections.reverseOrder()', false],
         ['Sorting an Integer[] is never stable in Java', false],
         ['Both use the same algorithm, only boxing differs', false]],
        'Primitive arrays use dual-pivot quicksort, O(n²) on adversarial input and not stable; object arrays use TimSort, stable and O(n log n). A comparator overload exists only for object arrays.'),
    ],
  },

  /* ── Round 1: arrays and strings ── */
  {
    unitCode: 'JT_CODING_JAVA_ROUND_ARRAYS_STRINGS',
    notes: `Arrays and strings open almost every campus online assessment. The patterns are prefix sums, two
pointers and sliding windows; the Java traps are int totals, \`s += c\` in a loop and \`==\` on strings. For each
problem below: read it, decide the pattern **before** looking at the approach, then compare.

## Problem 1 — Maximum subarray sum (Kadane)

*Given n integers (some negative), print the largest sum of a contiguous, non-empty subarray.*

**Approach.** At each index the best subarray ending here either extends the previous one or starts fresh:
\`cur = max(a[i], cur + a[i])\`. Track the best \`cur\` seen. Start \`best\` at \`a[0]\`, **not 0** — when every value
is negative the answer is the largest single value, and a \`best = 0\` start prints 0.

    long cur = a[0], best = a[0];
    for (int i = 1; i < n; i++) {
        cur = Math.max(a[i], cur + a[i]);
        best = Math.max(best, cur);
    }
    System.out.println(best);

**Complexity.** O(n) time, O(1) space. Use \`long\`: 10⁵ values of 10⁹ overflow an int.

## Problem 2 — Sort an array of 0s, 1s and 2s in one pass (Dutch national flag)

**Approach.** Three pointers: everything before \`low\` is 0, everything after \`high\` is 2, \`mid\` scans. A 0 swaps
to \`low\` (both advance); a 2 swaps to \`high\` (only \`high\` moves back, because the value swapped in is unchecked);
a 1 just advances \`mid\`.

    int low = 0, mid = 0, high = n - 1;
    while (mid <= high) {
        if (a[mid] == 0) { int t = a[low]; a[low] = a[mid]; a[mid] = t; low++; mid++; }
        else if (a[mid] == 1) mid++;
        else { int t = a[high]; a[high] = a[mid]; a[mid] = t; high--; }
    }

**Complexity.** O(n), one pass, O(1) space. Counting sort (count, then rewrite) is also O(n) but two passes —
say both; the interviewer usually wants the one-pass version.

## Problem 3 — String compression

*"aaabccdddd" → "a3b1c2d4". If the compressed form is not shorter, print the original.*

**Approach.** Walk runs with two indices; append the character and the run length to a \`StringBuilder\`.

    StringBuilder sb = new StringBuilder();
    int i = 0;
    while (i < s.length()) {
        int j = i;
        while (j < s.length() && s.charAt(j) == s.charAt(i)) j++;
        sb.append(s.charAt(i)).append(j - i);
        i = j;
    }
    System.out.println(sb.length() < s.length() ? sb.toString() : s);

**Complexity.** O(n) — each index is visited once by \`j\`. With \`String result += ...\` it would be O(n²).

## Problem 4 — Palindrome after deleting at most one character

*Print YES if s becomes a palindrome after removing at most one character.*

**Approach.** Two pointers from the ends. At the first mismatch you get exactly one deletion: skip the left
character **or** the right one, and check whether the rest is a plain palindrome.

    static boolean isPal(String s, int i, int j) {
        while (i < j) if (s.charAt(i++) != s.charAt(j--)) return false;
        return true;
    }
    static boolean almost(String s) {
        int i = 0, j = s.length() - 1;
        while (i < j) {
            if (s.charAt(i) != s.charAt(j)) return isPal(s, i + 1, j) || isPal(s, i, j - 1);
            i++; j--;
        }
        return true;
    }

**Complexity.** O(n): the two inner checks run at most once each. Trying every deletion is O(n²).

## Round habit

Before typing: name the pattern, the cost, and the overflow risk. After typing: run the sample, n = 1, all
equal values, all negative values, and the largest values.`,
    mcqs: [
      mcq('Kadane\'s loop starts with `best = 0, cur = 0` and the input is -4 -1 -3. What does it print?',
        [['-1', false],
         ['0', true],
         ['-8', false],
         ['-4', false]],
        'cur becomes negative at every step, but best = max(best, cur) never drops below its starting 0, so 0 is printed even though no subarray sums to 0. Starting best at a[0] gives the correct -1.'),
      mcq('In the one-pass 0/1/2 sort, why does `mid` not advance after swapping a 2 with a[high]?',
        [['Because a[high] was already known to be a 2', false],
         ['Because high must stay greater than mid', false],
         ['To keep the relative order of equal values stable', false],
         ['The value swapped in has not been examined yet', true]],
        'Whatever came from a[high] is unclassified — it could be 0, 1 or 2 — so mid must look at it again. Values swapped from low are already known to be 1s, which is why mid advances in that branch.'),
      mcq('A compression routine builds its result with `result += ch + "" + count;` for a 100 000-character string of distinct characters. What is the cost?',
        [['O(n²), since each += copies the string', true],
         ['O(n log n) from string resizing', false],
         ['O(n), since each append is constant', false],
         ['O(1) per character after JIT inlining', false]],
        'String is immutable, so each += builds a new string holding everything so far; summed over n appends that is quadratic. A StringBuilder appends in amortised constant time.'),
      mcq('For "abca", the almost-palindrome check hits its first mismatch at which pair, and what does it return?',
        [['a and a; it returns true without deleting', false],
         ['b and c; it returns true by skipping one', true],
         ['b and c; it returns false after two skips', false],
         ['a and c; it returns false immediately', false]],
        'The outer a/a pair matches, then b and c differ. Skipping b leaves "c" between the pointers, a palindrome, so the answer is true — "aca" after deleting b.'),
      mcq('An OA says n ≤ 10^5 and each value ≤ 10^9, and asks for the sum of a range. Which declaration is the safe one?',
        [['int sum = 0;', false],
         ['double sum = 0;', false],
         ['short sum = 0;', false],
         ['long sum = 0;', true]],
        'The sum can reach 10^14, past the int limit of about 2.1×10^9. long holds about 9.2×10^18 exactly; double would also hold 10^14 but drifts once totals pass 2^53, and a judge compares the digits.'),
    ],
    assignment: {
      title: 'Rain Water Trapped Between Walls',
      description: 'A two-pointer array problem with a long answer: how much water stays between walls of given heights.',
      instructions: `Walls of width 1 stand side by side. After rain, water collects in the dips between taller
walls. Compute how many units of water are trapped.

**Input.** The first line is n (1 ≤ n ≤ 200 000). The next line(s) hold n heights, each 0 ≤ h ≤ 10⁹, separated
by spaces (they may be split across several lines).

**Output.** One integer: the total water trapped.

| Input | Output |
|---|---|
| \`12\` / \`0 1 0 2 1 0 1 3 2 1 2 1\` | \`6\` |
| \`6\` / \`4 2 0 3 2 5\` | \`9\` |
| \`1\` / \`5\` | \`0\` |

Requirements:

- O(n) time. The water above index i is min(tallest wall on its left, tallest on its right) − h[i]; find a way
  to know both without rescanning the array for every index.
- The total can exceed the int range — two walls of 10⁹ with three empty cells between them hold 3×10⁹.
- Use the provided fast reader; print only the number.
- Write the time and space cost in a comment at the top of \`main\`.`,
      rubric: [
        { criterion: 'Correct total', description: 'Every test passes, including a single wall, falling heights and totals beyond the int range.', maxPoints: 50 },
        { criterion: 'Linear time', description: 'Two pointers, or left-max and right-max arrays; no nested rescans per index.', maxPoints: 30 },
        { criterion: 'Overflow-safe and stated cost', description: 'The total is a long, and the cost is stated in a comment.', maxPoints: 20 },
      ],
      totalPoints: 100,
      coding: {
        language: 'java',
        starter: `import java.io.*;
import java.util.*;

public class Main {
${READER}
    public static void main(String[] args) throws IOException {
        int n = Integer.parseInt(next());
        long[] h = new long[n];
        for (int i = 0; i < n; i++) h[i] = Long.parseLong(next());

        // TODO: compute the total water trapped in O(n)
        // TODO: print it (the total may not fit in an int)
    }
}
`,
        tests: [
          { input: '12\n0 1 0 2 1 0 1 3 2 1 2 1\n', expectedOutput: '6' },
          { input: '6\n4 2 0 3 2 5\n', expectedOutput: '9' },
          { input: '1\n5\n', expectedOutput: '0' },
          { input: '3\n3 2 1\n', expectedOutput: '0', isHidden: true },
          { input: '5\n1000000000 0 0 0 1000000000\n', expectedOutput: '3000000000', isHidden: true },
          { input: '7\n5 0 5\n0 5 0 5\n', expectedOutput: '15', isHidden: true },
          { input: '4\n2 2 2 2\n', expectedOutput: '0', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 60,
      },
    },
  },

  /* ── Round 2: hashing ── */
  {
    unitCode: 'JT_CODING_JAVA_ROUND_HASHING',
    notes: `Hashing turns "have I seen this before?" from a scan into an O(1) lookup. In an OA the signal is a
brute force that compares every pair: if the inner loop is searching for a value, a \`HashSet\` or \`HashMap\`
usually removes it. State the expected O(1) — and that a \`HashMap\` costs memory and has a worst case.

## Problem 1 — Longest consecutive sequence

*Given unsorted integers, print the length of the longest run of consecutive values (100 4 200 1 3 2 → 4).*

**Approach.** Put everything in a \`HashSet\`. A value starts a run only if \`x - 1\` is absent; from each start,
count upward. Every value is counted at most once as part of a run, so the whole thing is linear.

    Set<Integer> set = new HashSet<>();
    for (int x : a) set.add(x);
    int best = 0;
    for (int x : set) {
        if (set.contains(x - 1)) continue;          // not the start of a run
        int len = 1;
        while (set.contains(x + len)) len++;
        best = Math.max(best, len);
    }

**Complexity.** O(n) expected time, O(n) space. Sorting first is O(n log n) and also accepted — say both.

## Problem 2 — Top k most frequent numbers

**Approach.** Count with a \`HashMap\`, then keep a **min-heap of size k** ordered by count (ties by value, so the
output is deterministic).

    Map<Integer, Integer> cnt = new HashMap<>();
    for (int x : a) cnt.merge(x, 1, Integer::sum);
    PriorityQueue<Map.Entry<Integer, Integer>> pq = new PriorityQueue<>(
        (p, q) -> !p.getValue().equals(q.getValue())
                  ? Integer.compare(p.getValue(), q.getValue())
                  : Integer.compare(q.getKey(), p.getKey()));
    for (Map.Entry<Integer, Integer> e : cnt.entrySet()) {
        pq.offer(e);
        if (pq.size() > k) pq.poll();
    }

**Complexity.** O(n + m log k) for m distinct values. Note \`.equals\` on the counts — \`!=\` on two \`Integer\`
values above 127 compares references.

## Problem 3 — Isomorphic strings

*"egg" and "add" are isomorphic (e→a, g→d); "foo" and "bar" are not. Each character must map to exactly one
character, and no two characters may map to the same one.*

**Approach.** Two maps, one each way — or two \`int[256]\` arrays remembering the last index each character was
seen at.

    int[] lastS = new int[256], lastT = new int[256];
    for (int i = 0; i < s.length(); i++) {
        char x = s.charAt(i), y = t.charAt(i);
        if (lastS[x] != lastT[y]) return false;
        lastS[x] = i + 1;                            // +1 so "never seen" (0) differs from index 0
        lastT[y] = i + 1;
    }
    return s.length() == t.length();

**Complexity.** O(n), O(1) space (fixed alphabet). One map only checks one direction: "ab" → "cc" would pass.

## Problem 4 — Count pairs with difference exactly k

*Count index pairs i < j with |a[i] − a[j]| = k.*

**Approach.** Walk the array once; for each x, add how many earlier values equal \`x - k\` and \`x + k\`, then
record x. When k = 0 the two lookups are the same value — count it once.

    Map<Long, Integer> seen = new HashMap<>();
    long pairs = 0;
    for (long x : a) {
        pairs += seen.getOrDefault(x - k, 0);
        if (k != 0) pairs += seen.getOrDefault(x + k, 0);
        seen.merge(x, 1, Integer::sum);
    }

**Complexity.** O(n) expected. The count is \`long\`: all-equal input with k = 0 gives n(n−1)/2 pairs.

## Round habit

Say "expected O(1) per operation" rather than "O(1)". If the keys are small integers (marks 0–100, lowercase
letters), an array beats a map. And box with care: \`Map<Long, Integer>\` lookups need a \`long\` key —
\`seen.get(5)\` boxes to \`Integer\` and finds nothing.`,
    mcqs: [
      mcq('In the longest-consecutive solution, what does `if (set.contains(x - 1)) continue;` buy?',
        [['It skips duplicate values that are already in the set', false],
         ['It handles negative numbers correctly', false],
         ['It sorts the values into ascending order', false],
         ['It keeps each run counted once, so it is O(n)', true]],
        'Counting upward only from the smallest value of each run means every element is visited by one while loop at most. Without the check, each element of a run of length L would recount the rest, which is quadratic on a long run.'),
      mcq('A Map<Long, Integer> called seen holds the key 5L. What does `seen.get(5)` return?',
        [['null, since 5 boxes to an Integer key', true],
         ['1, the count stored under 5L', false],
         ['A compile error, since the key type must be Long', false],
         ['A ClassCastException at runtime', false]],
        'get takes Object, so the int literal 5 is boxed to Integer, and Integer.valueOf(5) is not equal to Long.valueOf(5). The call compiles and quietly returns null; write seen.get(5L) or keep the key types consistent.'),
      mcq('Checking isomorphism with one map from s to t only, which pair would wrongly pass?',
        [['"ab" and "cc"', true],
         ['"egg" and "add"', false],
         ['"paper" and "title"', false],
         ['"ab" and "ca"', false]],
        'a→c and b→c are both consistent in the forward direction, so a one-way map accepts it, but two characters may not map to the same one. The reverse map (or the last-seen arrays) catches c being claimed twice.'),
      mcq('Counting pairs with difference k = 0 on an array of 100 000 equal values. What goes wrong if the code adds both getOrDefault(x - k) and getOrDefault(x + k)?',
        [['Nothing: k = 0 is never an edge case', false],
         ['Every pair is counted twice', true],
         ['It throws ArithmeticException on k = 0', false],
         ['Pairs are missed because x - k equals x', false]],
        'With k = 0 both lookups ask for the same key, so each earlier equal value is added twice. Guard the second lookup with k != 0; the correct total is n(n−1)/2, which also needs a long.'),
    ],
    assignment: {
      title: 'Subarrays That Sum to K',
      description: 'Prefix sums with a HashMap: count the contiguous subarrays whose sum is exactly k, negatives included.',
      instructions: `Count the **contiguous, non-empty** subarrays whose elements sum to exactly k.

**Input.** The first line is \`n k\` (1 ≤ n ≤ 100 000, |k| ≤ 10¹⁴). The next line(s) hold n integers, each
between −10⁹ and 10⁹ (they may be negative, and may be split across lines).

**Output.** One integer: the number of such subarrays.

| Input | Output | Why |
|---|---|---|
| \`5 3\` / \`1 2 3 0 3\` | \`5\` | [1 2], [3], [3 0], [0 3], [3] |
| \`3 2\` / \`1 1 1\` | \`2\` | [1 1] twice |
| \`4 0\` / \`1 -1 1 -1\` | \`4\` | |

Requirements:

- O(n) expected time. A sliding window does **not** work here — values can be negative, so growing the window
  can make the sum smaller. Think about prefix sums: the sum of a[i..j] is prefix[j] − prefix[i − 1].
- k and the running sums need \`long\`; so does the count — 70 000 zeros with k = 0 have 2 450 035 000 subarrays.
- Print only the number, and state the cost in a comment at the top of \`main\`.`,
      rubric: [
        { criterion: 'Correct count', description: 'Every test passes, including negatives, k = 0, a k outside the int range and a count beyond the int range.', maxPoints: 50 },
        { criterion: 'Prefix sums with a map', description: 'One pass with a HashMap of prefix-sum counts, seeded so subarrays starting at index 0 are counted.', maxPoints: 30 },
        { criterion: 'Overflow-safe and stated cost', description: 'Sums, k and the count are long; O(n) time and O(n) space stated.', maxPoints: 20 },
      ],
      totalPoints: 100,
      coding: {
        language: 'java',
        starter: `import java.io.*;
import java.util.*;

public class Main {
${READER}
    public static void main(String[] args) throws IOException {
        int n = Integer.parseInt(next());
        long k = Long.parseLong(next());
        long[] a = new long[n];
        for (int i = 0; i < n; i++) a[i] = Long.parseLong(next());

        // TODO: count subarrays whose sum is exactly k, in one pass
        // TODO: print the count
    }
}
`,
        tests: [
          { input: '5 3\n1 2 3 0 3\n', expectedOutput: '5' },
          { input: '3 2\n1 1 1\n', expectedOutput: '2' },
          { input: '4 0\n1 -1 1 -1\n', expectedOutput: '4' },
          { input: '1 4\n5\n', expectedOutput: '0', isHidden: true },
          { input: '3 3000000000\n1000000000 1000000000 1000000000\n', expectedOutput: '1', isHidden: true },
          { input: '6 -2\n-1 -1 2 -2 0 0\n', expectedOutput: '7', isHidden: true },
          { input: zeros(70000), expectedOutput: '2450035000', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 60,
      },
    },
  },

  /* ── Round 3: stacks, queues and linked lists ── */
  {
    unitCode: 'JT_CODING_JAVA_ROUND_STACKS_LISTS',
    notes: `Stack and queue problems in an OA are mostly **monotonic** structures in disguise: "the next greater",
"the previous smaller", "the maximum of each window". Linked-list problems are pointer bookkeeping, and a dummy
head removes most of the special cases. In Java, the stack and the queue are both \`ArrayDeque\`.

## Problem 1 — Stock span

*For each day's price, print how many consecutive days up to and including today had a price ≤ today's.
Prices 100 80 60 70 60 75 85 → spans 1 1 1 2 1 4 6.*

**Approach.** Keep a stack of indices whose prices are strictly decreasing. For each day, pop every index with a
price ≤ today's — they can never be the "previous greater" for a later day. The span is the distance to the index
left on top (or to the start if the stack is empty).

    ArrayDeque<Integer> st = new ArrayDeque<>();
    StringBuilder out = new StringBuilder();
    for (int i = 0; i < n; i++) {
        while (!st.isEmpty() && price[st.peek()] <= price[i]) st.pop();
        out.append(st.isEmpty() ? i + 1 : i - st.peek()).append(' ');
        st.push(i);
    }

**Complexity.** O(n): every index is pushed once and popped at most once, even though there is a loop inside a loop.

## Problem 2 — A stack that returns its minimum in O(1)

**Approach.** Push a pair: the value and the minimum so far. \`getMin\` reads the top pair.

    class MinStack {
        private final ArrayDeque<long[]> st = new ArrayDeque<>();
        void push(long x) { long m = st.isEmpty() ? x : Math.min(x, st.peek()[1]); st.push(new long[]{x, m}); }
        long pop()        { return st.pop()[0]; }
        long getMin()     { return st.peek()[1]; }
    }

**Complexity.** O(1) per operation, O(n) space. **Follow-up:** "with O(1) extra space?" — store encoded
differences from the current minimum; mention it, but the pair version is what you write under a clock.

## Problem 3 — Merge two sorted linked lists

**Approach.** A dummy node and a tail pointer; take the smaller head each step; attach whatever list remains.

    static Node merge(Node a, Node b) {
        Node dummy = new Node(0), tail = dummy;
        while (a != null && b != null) {
            if (a.val <= b.val) { tail.next = a; a = a.next; }
            else                { tail.next = b; b = b.next; }
            tail = tail.next;
        }
        tail.next = (a != null) ? a : b;
        return dummy.next;
    }

**Complexity.** O(n + m), O(1) extra — it relinks the existing nodes. \`<=\` keeps it stable (ties come from \`a\` first).

## Problem 4 — Maximum of every window of size k

*1 3 -1 -3 5 3 6 7 with k = 3 → 3 3 5 5 6 7.*

**Approach.** An \`ArrayDeque\` of indices whose values are decreasing from front to back. For each i: drop the
front if it has left the window; drop from the back every index whose value ≤ a[i]; add i; once i ≥ k − 1 the
front is the window's maximum.

    ArrayDeque<Integer> dq = new ArrayDeque<>();
    for (int i = 0; i < n; i++) {
        if (!dq.isEmpty() && dq.peekFirst() <= i - k) dq.pollFirst();
        while (!dq.isEmpty() && a[dq.peekLast()] <= a[i]) dq.pollLast();
        dq.offerLast(i);
        if (i >= k - 1) out.append(a[dq.peekFirst()]).append(' ');
    }

**Complexity.** O(n). A \`PriorityQueue\` with lazy deletion is O(n log n) and also passes — name it as the
fallback.

## Round habit

Store **indices** on the stack, not values: you need the index for distances and widths. And say aloud why a
nested pop loop is still linear — interviewers ask.`,
    mcqs: [
      mcq('In the stock-span loop the condition is changed from `<=` to `<`. For prices 50 50 50, what spans are printed?',
        [['1 2 3', false],
         ['3 3 3', false],
         ['1 2 2', false],
         ['1 1 1', true]],
        'With <, an equal earlier price is not popped, so each day stops at the previous 50 and the span is 1 every time. The definition counts days with price ≤ today, so equal prices must be popped to get 1 2 3.'),
      mcq('An ArrayDeque<Integer> dq runs `dq.push(1); dq.push(2); dq.offer(3);` and then prints `dq.poll()`. What is printed?',
        [['1', false],
         ['3', false],
         ['2', true],
         ['It throws: a deque cannot mix push and offer', false]],
        'push adds at the head, so the deque reads [2, 1]; offer adds at the tail, giving [2, 1, 3]; poll removes from the head, which is 2. Mixing them is legal, which is exactly why it is easy to get wrong.'),
      mcq('The sliding-window maximum has a while loop inside its for loop. Why is the whole thing O(n) and not O(nk)?',
        [['Each index enters and leaves the deque once', true],
         ['ArrayDeque operations are O(log n) each', false],
         ['The inner loop runs at most k times per step', false],
         ['k is a constant, so it does not count', false]],
        'The work is bounded by pushes plus pops over the whole run, and each index is pushed once and popped at most once, so the total is 2n operations. The per-step bound of k is true but gives the looser O(nk).'),
      mcq('Merging two sorted lists, why start from a dummy node?',
        [['It stops the merged list from accidentally forming a cycle', false],
         ['It makes the merge stable for equal values', false],
         ['It lets you append with no special case for the head', true],
         ['It avoids allocating new nodes for the result', false]],
        'With a dummy, tail always exists, so the first node is appended exactly like every other one and the answer is dummy.next. Stability comes from using <=, and the relinking (not the dummy) is why no new nodes are made.'),
      mcq('A min-stack stores long[]{value, minSoFar}. After push(5), push(2), push(7), pop(), what is getMin()?',
        [['2', true],
         ['5', false],
         ['7', false],
         ['It is undefined until a new push', false]],
        'The pairs are {5,5}, {2,2}, {7,2}. Popping removes {7,2}, leaving {2,2} on top, so the minimum is 2. Each entry remembers the minimum at the time it was pushed, which is why pop never needs to search.'),
    ],
    assignment: {
      title: 'Largest Rectangle in a Skyline',
      description: 'A monotonic stack over bar heights: the largest rectangle that fits under a histogram, with a long area.',
      instructions: `n bars of width 1 stand side by side with the given heights. Find the area of the largest
axis-aligned rectangle that fits entirely under the bars.

**Input.** The first line is n (1 ≤ n ≤ 100 000). The next line(s) hold n heights, each 0 ≤ h ≤ 10⁹.

**Output.** One integer: the largest area.

| Input | Output | Why |
|---|---|---|
| \`6\` / \`2 1 5 6 2 3\` | \`10\` | heights 5 and 6, width 2 |
| \`2\` / \`2 4\` | \`4\` | |
| \`5\` / \`1 2 3 4 5\` | \`9\` | height 3 over the last three bars |

Requirements:

- O(n) time: a stack of indices with increasing heights. When a bar is popped, its rectangle extends from the
  index under it on the stack to the bar that popped it. A nested loop over all pairs is O(n²) and will time out
  on the largest test.
- Areas reach 10¹⁴: use \`long\`.
- Handle the bars still on the stack at the end (a sentinel height 0 at index n is the usual trick).
- Print only the number, and state the cost in a comment at the top of \`main\`.`,
      rubric: [
        { criterion: 'Correct area', description: 'Every test passes, including rising and falling heights, zeros and areas beyond the int range.', maxPoints: 50 },
        { criterion: 'Monotonic stack in O(n)', description: 'Each index is pushed and popped once; leftover bars are flushed at the end.', maxPoints: 30 },
        { criterion: 'Overflow-safe and stated cost', description: 'Area computed in long; O(n) time and O(n) space stated.', maxPoints: 20 },
      ],
      totalPoints: 100,
      coding: {
        language: 'java',
        starter: `import java.io.*;
import java.util.*;

public class Main {
${READER}
    public static void main(String[] args) throws IOException {
        int n = Integer.parseInt(next());
        long[] h = new long[n];
        for (int i = 0; i < n; i++) h[i] = Long.parseLong(next());

        ArrayDeque<Integer> stack = new ArrayDeque<>();
        // TODO: keep indices of increasing heights on the stack
        // TODO: when a bar is popped, compute the widest rectangle of its height
        // TODO: print the largest area
    }
}
`,
        tests: [
          { input: '6\n2 1 5 6 2 3\n', expectedOutput: '10' },
          { input: '2\n2 4\n', expectedOutput: '4' },
          { input: '5\n1 2 3 4 5\n', expectedOutput: '9' },
          { input: '1\n7\n', expectedOutput: '7', isHidden: true },
          { input: '7\n6 2 5 4 5 1 6\n', expectedOutput: '12', isHidden: true },
          { input: '3\n1000000000 1000000000 1000000000\n', expectedOutput: '3000000000', isHidden: true },
          { input: '4\n0 0 0 0\n', expectedOutput: '0', isHidden: true },
          { input: ones(100000), expectedOutput: '100000', isHidden: true },
        ],
        difficulty: 'hard',
        passingPoints: 60,
      },
    },
  },

  /* ── Round 4: trees and graphs ── */
  {
    unitCode: 'JT_CODING_JAVA_ROUND_TREES_GRAPHS',
    notes: `Tree and graph rounds test two things the earlier topics took for granted: **reading** the structure
from plain input, and choosing a traversal that survives the largest input. In Java the second matters more than
in most languages — a recursive DFS on a 10⁵-node path overflows the thread stack.

## Problem 1 — Build a binary tree from level-order input and print its height

*Input: values in level order, \`-1\` for a missing child. "1 2 3 -1 4 -1 -1 -1 -1" is 1 with children 2 and 3,
and 4 as 2's right child; height (in nodes) 3.*

**Approach.** A queue of nodes waiting for children; read two tokens per node polled. Then height by BFS, counting
levels — no recursion.

    Node root = new Node(vals[0]);
    ArrayDeque<Node> q = new ArrayDeque<>();
    q.offer(root);
    int i = 1;
    while (!q.isEmpty() && i < vals.length) {
        Node cur = q.poll();
        if (vals[i] != -1) { cur.left = new Node(vals[i]); q.offer(cur.left); }
        i++;
        if (i < vals.length && vals[i] != -1) { cur.right = new Node(vals[i]); q.offer(cur.right); }
        i++;
    }
    // height: BFS level by level
    int height = 0;
    q.clear(); q.offer(root);
    while (!q.isEmpty()) {
        height++;
        for (int s = q.size(); s > 0; s--) {
            Node c = q.poll();
            if (c.left != null) q.offer(c.left);
            if (c.right != null) q.offer(c.right);
        }
    }

**Complexity.** O(n) time and space. Snapshot \`q.size()\` before the inner loop — the loop adds to the queue.

## Problem 2 — Diameter of a binary tree

*The longest path, counted in edges, between any two nodes.*

**Approach.** For each node, the longest path through it is depth(left) + depth(right). One post-order pass
returns depth and updates a running maximum.

    static int best = 0;
    static int depth(Node n) {
        if (n == null) return 0;
        int l = depth(n.left), r = depth(n.right);
        best = Math.max(best, l + r);
        return 1 + Math.max(l, r);
    }

**Complexity.** O(n). Calling a separate \`height()\` from every node is O(n²) on a skewed tree — the classic slow
answer. Recursion is fine for balanced trees; for a possibly skewed 10⁵-node tree, do the post-order iteratively.

## Problem 3 — Can the students be split into two teams? (bipartite check)

*n students, m "dislike" pairs; two who dislike each other must be in different teams. Print YES or NO.*

**Approach.** Colour by BFS from every uncoloured node; a neighbour with the same colour means an odd cycle.

    List<List<Integer>> g = new ArrayList<>();
    for (int i = 0; i <= n; i++) g.add(new ArrayList<>());
    // read m edges: g.get(u).add(v); g.get(v).add(u);
    int[] color = new int[n + 1];                      // 0 = unvisited, 1 / 2 = team
    for (int s = 1; s <= n; s++) {
        if (color[s] != 0) continue;
        color[s] = 1;
        ArrayDeque<Integer> q = new ArrayDeque<>(List.of(s));
        while (!q.isEmpty()) {
            int u = q.poll();
            for (int v : g.get(u)) {
                if (color[v] == 0) { color[v] = 3 - color[u]; q.offer(v); }
                else if (color[v] == color[u]) { System.out.println("NO"); return; }
            }
        }
    }
    System.out.println("YES");

**Complexity.** O(n + m). Starting BFS only from node 1 misses every other component — the most common bug.

## Problem 4 — Lowest common ancestor in a BST

**Approach.** Walk from the root: if both values are smaller go left, if both are larger go right, otherwise this
node splits them and is the answer.

    Node cur = root;
    while (cur != null) {
        if (p < cur.val && q < cur.val) cur = cur.left;
        else if (p > cur.val && q > cur.val) cur = cur.right;
        else return cur;
    }

**Complexity.** O(h) time, O(1) space. Using the BST order is the point — the general-tree LCA is O(n).

## Round habit

Read the input format twice: 0- or 1-indexed nodes? directed or undirected? can there be self-loops or repeated
edges? Build \`List<List<Integer>>\` adjacency, and prefer BFS or an explicit stack whenever depth can reach 10⁴.`,
    mcqs: [
      mcq('A level-order BFS writes `for (int s = 0; s < q.size(); s++)` instead of snapshotting the size first. What happens?',
        [['Nothing: size() is read once by the compiler', false],
         ['Nodes from the next level join the current level', true],
         ['It throws ConcurrentModificationException', false],
         ['The last node of each level is skipped', false]],
        'size() is re-evaluated each iteration and the body offers children, so the bound keeps moving and later levels are processed as part of the current one. Copy the size into a variable before the loop.'),
      mcq('Diameter is computed by calling a separate height(node) from every node. On a 10^5-node tree shaped like a linked list, what is the cost?',
        [['O(n²), as each height call walks its subtree', true],
         ['O(n log n), as the tree has log n levels', false],
         ['O(n), as each height call is O(1)', false],
         ['O(h), the height of the tree', false]],
        'A skewed tree has height n, and calling height from each node walks the whole subtree below it: n + (n−1) + … = O(n²). Returning depth from the same post-order pass that updates the diameter makes it O(n).'),
      mcq('The two-teams check starts BFS only from student 1. The input has two components, and only the second contains an odd cycle. What does it print?',
        [['YES: the second component is never visited', true],
         ['NO, because BFS from one node finds every cycle', false],
         ['It throws ArrayIndexOutOfBoundsException', false],
         ['NO, but only if student 1 has an edge', false]],
        'BFS from one source reaches only that source\'s component. The odd cycle sits elsewhere, is never coloured and never checked, so the answer is wrongly YES. Loop over every uncoloured node as a new source.'),
      mcq('In the BST, p = 4 and q = 9, and the root holds 6. Where does the LCA walk go?',
        [['Left, because 4 is smaller than 6', false],
         ['Right, because 9 is larger than 6', false],
         ['Both ways, comparing the two results', false],
         ['It stops: 6 is the LCA', true]],
        'One value is below 6 and the other above, so they sit in different subtrees and 6 is the lowest node with both beneath it. The walk only moves when both values are on the same side.'),
    ],
    assignment: {
      title: 'Office Network Clusters',
      description: 'Read an undirected graph from input and report its connected components and the largest one — at a size where recursion fails.',
      instructions: `An office has n computers numbered 1 to n and m cables, each joining two computers. Computers
that can reach each other through cables form a **cluster**. Print how many clusters there are and the size of
the largest.

**Input.** The first line is \`n m\` (1 ≤ n ≤ 100 000, 0 ≤ m ≤ 200 000). Each of the next m lines is \`u v\`
(1 ≤ u, v ≤ n). A cable may join a computer to itself, and the same pair may appear more than once.

**Output.** Exactly two lines:

    Components: <count>
    Largest: <size>

| Input | Output |
|---|---|
| \`5 3\` / \`1 2\` / \`2 3\` / \`4 5\` | \`Components: 2\` / \`Largest: 3\` |
| \`4 0\` | \`Components: 4\` / \`Largest: 1\` |

Requirements:

- O(n + m) (or near it): BFS with an explicit queue, or union-find with path compression.
- One hidden test is a single chain of 100 000 computers. A recursive DFS overflows the thread stack on it —
  your solution must not recurse that deep.
- Self-loops and repeated cables must not change the answer.
- State the cost in a comment at the top of \`main\`.`,
      rubric: [
        { criterion: 'Correct clusters', description: 'Every test passes, including isolated computers, self-loops, repeated cables and the 100 000-node chain.', maxPoints: 50 },
        { criterion: 'Iterative traversal or union-find', description: 'No deep recursion; adjacency lists or union-find give near-linear time.', maxPoints: 30 },
        { criterion: 'Exact output and stated cost', description: 'Both lines in the given format; time and space stated.', maxPoints: 20 },
      ],
      totalPoints: 100,
      coding: {
        language: 'java',
        starter: `import java.io.*;
import java.util.*;

public class Main {
${READER}
    public static void main(String[] args) throws IOException {
        int n = Integer.parseInt(next());
        int m = Integer.parseInt(next());
        for (int i = 0; i < m; i++) {
            int u = Integer.parseInt(next());
            int v = Integer.parseInt(next());
            // TODO: record the cable between u and v
        }

        // TODO: find the clusters without deep recursion
        // TODO: print "Components: <count>" and "Largest: <size>"
    }
}
`,
        tests: [
          { input: '5 3\n1 2\n2 3\n4 5\n', expectedOutput: 'Components: 2\nLargest: 3' },
          { input: '4 0\n', expectedOutput: 'Components: 4\nLargest: 1' },
          { input: '6 4\n1 2\n2 3\n3 1\n5 6\n', expectedOutput: 'Components: 3\nLargest: 3' },
          { input: '1 0\n', expectedOutput: 'Components: 1\nLargest: 1', isHidden: true },
          { input: '3 3\n1 1\n2 3\n3 2\n', expectedOutput: 'Components: 2\nLargest: 2', isHidden: true },
          { input: '7 3\n1 7\n7 4\n2 3\n', expectedOutput: 'Components: 4\nLargest: 3', isHidden: true },
          { input: chain(100000), expectedOutput: 'Components: 1\nLargest: 100000', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 60,
      },
    },
  },

  /* ── Round 5: greedy and dynamic programming ── */
  {
    unitCode: 'JT_CODING_JAVA_ROUND_DP_GREEDY',
    notes: `The hard part of a DP or greedy question in a round is the first two minutes: deciding which it is.
**Greedy** works when a locally best choice can be proved never to hurt (an exchange argument). **DP** is for when
choices interact and you must try them, but the subproblems repeat. If you cannot argue the greedy in one
sentence, assume DP and write the state.

## Problem 1 — House robber

*Houses in a row hold amounts; you cannot take two adjacent houses. Print the maximum you can take.*

**Approach.** State: best[i] = best using houses 0..i. Either skip house i (best[i−1]) or take it
(best[i−2] + a[i]). Only the last two values are needed.

    long prev2 = 0, prev1 = 0;
    for (int i = 0; i < n; i++) {
        long cur = Math.max(prev1, prev2 + a[i]);
        prev2 = prev1;
        prev1 = cur;
    }
    System.out.println(prev1);

**Complexity.** O(n) time, O(1) space. **Why not greedy?** "Take every other house" fails on 2 1 1 9 (answer 11).

## Problem 2 — Minimum platforms

*Given arrival and departure times of trains, print the fewest platforms so no train waits.*

**Approach (greedy).** Sort arrivals and departures separately; sweep both with two pointers. An arrival before
the next departure needs a platform; otherwise a platform frees up. The answer is the peak.

    Arrays.sort(arr);
    Arrays.sort(dep);
    int i = 0, j = 0, cur = 0, best = 0;
    while (i < n) {
        if (arr[i] <= dep[j]) { cur++; i++; best = Math.max(best, cur); }
        else { cur--; j++; }
    }

**Complexity.** O(n log n) for the sorts. \`<=\` means a train arriving at the exact minute another leaves still
needs its own platform — read the statement for which convention it uses.

## Problem 3 — Longest increasing subsequence in O(n log n)

**Approach.** \`tails[len]\` = the smallest possible tail of an increasing subsequence of length len + 1. For each x,
binary-search the first tail ≥ x and replace it (or append).

    int[] tails = new int[n];
    int len = 0;
    for (int x : a) {
        int lo = 0, hi = len;
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (tails[mid] < x) lo = mid + 1; else hi = mid;
        }
        tails[lo] = x;
        if (lo == len) len++;
    }

**Complexity.** O(n log n). \`tails\` is **not** an actual subsequence — say so if asked. The O(n²) DP is the
expected first answer; this is the follow-up.

## Problem 4 — Edit distance

*Fewest insertions, deletions and replacements to turn s into t.*

**Approach.** dp[i][j] = cost to turn the first i characters of s into the first j of t.

    int[][] dp = new int[s.length() + 1][t.length() + 1];
    for (int i = 0; i <= s.length(); i++) dp[i][0] = i;
    for (int j = 0; j <= t.length(); j++) dp[0][j] = j;
    for (int i = 1; i <= s.length(); i++)
        for (int j = 1; j <= t.length(); j++)
            dp[i][j] = s.charAt(i - 1) == t.charAt(j - 1)
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j - 1], Math.min(dp[i - 1][j], dp[i][j - 1]));

**Complexity.** O(|s|·|t|) time and space; one row suffices for O(|t|) space.

## Round habit

Write the state in words before the code ("dp[c] = best value with capacity c"). Fill \`dp\` with a sentinel only
if you guard the addition — \`Integer.MAX_VALUE + 1\` is negative and silently wins every \`min\`.`,
    mcqs: [
      mcq('For house amounts 2 1 1 9, what does the house-robber DP print?',
        [['11', true],
         ['12', false],
         ['10', false],
         ['3', false]],
        'Taking houses 0 and 3 gives 2 + 9 = 11, and they are not adjacent. Alternating from the first house (2 + 1) gives 3, and 12 would need three houses that include an adjacent pair.'),
      mcq('In the platform sweep, the first train arrives at 900 and another leaves at 900, and the code compares with `arr[i] <= dep[j]`. What does that model?',
        [['The arriving train reuses the freed platform', false],
         ['Only trains after 900 are counted', false],
         ['The departing train is ignored altogether', false],
         ['Both trains need a platform at 900', true]],
        'With <=, an arrival at the same minute as a departure is processed first, so the count goes up before the platform frees. If the statement says a platform freed at 900 can be reused at 900, the comparison must be <.'),
      mcq('After the O(n log n) LIS loop on 3 10 2 1 20, what is in tails[0..len-1]?',
        [['3 10 20', false],
         ['1 10 20', true],
         ['2 10 20', false],
         ['1 2 20', false]],
        '3 → [3]; 10 → [3,10]; 2 replaces 3 → [2,10]; 1 replaces 2 → [1,10]; 20 appends → [1,10,20]. The length 3 is right, but 1 10 20 is not a subsequence in order — tails only records the best possible ends.'),
      mcq('A 0/1 knapsack in one array loops capacity upward: `for (int c = w; c <= W; c++) dp[c] = max(dp[c], dp[c - w] + v)`. With one item (weight 2, value 3) and W = 10, what does it print?',
        [['3', false],
         ['15', true],
         ['5', false],
         ['0', false]],
        'Going upward, dp[c - w] has already been updated with this same item, so the item is taken again and again: five copies give 15. Looping capacity downward reads only values from before this item, which gives the 0/1 answer of 3.'),
      mcq('Which signal most strongly says a problem needs DP rather than greedy?',
        [['The input arrives sorted and the task asks for a minimum', false],
         ['A small counterexample beats the best local choice', true],
         ['The answer fits comfortably in a long', false],
         ['The problem can be solved with recursion', false]],
        'Greedy is safe only if the local choice provably never hurts. Finding a small input where the best-looking step loses (like 2 1 1 9 for alternate houses) means choices interact, and you need to try them with overlapping subproblems.'),
    ],
    assignment: {
      title: 'Exam-Week Knapsack',
      description: 'The 0/1 knapsack in one array: pick topics to revise within a fixed number of hours to maximise marks.',
      instructions: `Before an exam you have W hours. There are n topics; revising topic i takes wᵢ hours and is
worth vᵢ marks. Each topic is revised once or not at all. Print the most marks you can secure.

**Input.** The first line is \`n W\` (1 ≤ n ≤ 100, 0 ≤ W ≤ 10 000). Each of the next n lines is \`w v\`
(1 ≤ w ≤ 10 000, 0 ≤ v ≤ 10⁹).

**Output.** One integer: the maximum total value.

| Input | Output |
|---|---|
| \`3 50\` / \`10 60\` / \`20 100\` / \`30 120\` | \`220\` |
| \`4 7\` / \`1 1\` / \`3 4\` / \`4 5\` / \`5 7\` | \`9\` |
| \`1 5\` / \`6 100\` | \`0\` |

Requirements:

- Dynamic programming in O(n·W) time and O(W) space: one \`long[]\` indexed by capacity.
- Each topic is used at most once — loop the capacity in the direction that guarantees it.
- Greedy by value per hour is wrong for 0/1 knapsack; one hidden test is built to catch it.
- Values add up past the int range: use \`long\`. State the cost in a comment at the top of \`main\`.`,
      rubric: [
        { criterion: 'Correct maximum', description: 'Every test passes, including an item that does not fit, W = 0, a greedy trap and totals beyond the int range.', maxPoints: 50 },
        { criterion: '0/1 DP in O(W) space', description: 'A single dp array over capacity, filled in the direction that uses each item once.', maxPoints: 30 },
        { criterion: 'Overflow-safe and stated cost', description: 'Values held in long; O(n·W) time and O(W) space stated.', maxPoints: 20 },
      ],
      totalPoints: 100,
      coding: {
        language: 'java',
        starter: `import java.io.*;
import java.util.*;

public class Main {
${READER}
    public static void main(String[] args) throws IOException {
        int n = Integer.parseInt(next());
        int W = Integer.parseInt(next());
        int[] w = new int[n];
        long[] v = new long[n];
        for (int i = 0; i < n; i++) {
            w[i] = Integer.parseInt(next());
            v[i] = Long.parseLong(next());
        }

        long[] dp = new long[W + 1];
        // TODO: fill dp so that each topic is used at most once
        // TODO: print the best value for capacity W
    }
}
`,
        tests: [
          { input: '3 50\n10 60\n20 100\n30 120\n', expectedOutput: '220' },
          { input: '4 7\n1 1\n3 4\n4 5\n5 7\n', expectedOutput: '9' },
          { input: '1 5\n6 100\n', expectedOutput: '0' },
          { input: '2 0\n1 5\n2 3\n', expectedOutput: '0', isHidden: true },
          { input: '3 15\n5 1000000000\n5 1000000000\n5 1000000000\n', expectedOutput: '3000000000', isHidden: true },
          { input: '3 10\n6 30\n5 20\n5 20\n', expectedOutput: '40', isHidden: true },
          { input: '1 10\n2 3\n', expectedOutput: '3', isHidden: true },
          { input: '4 10\n5 10\n4 40\n6 30\n3 50\n', expectedOutput: '90', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 60,
      },
    },
  },

  /* ── Checkpoint ── */
  {
    unitCode: 'JT_CODING_JAVA_CHECKPOINT',
    notes: `Ten short Java solutions, the kind an interviewer pastes in after your coding round: "what does this
print?", "what is its cost?", "where is the bug?". Read each one as you would your own code before submitting —
types first (int or long? Integer or int?), then loop bounds, then what the data structure really does.`,
    checkpoint: [
      ck('DSA_ARRAYS', 'This binary search runs with lo = 1_500_000_000 and hi = 2_000_000_000 (both int): `int mid = (lo + hi) / 2;`. What is mid?',
        [['1750000000', false],
         ['It throws ArithmeticException', false],
         ['2147483647', false],
         ['A negative number', true]],
        'lo + hi is 3.5×10^9, past the int maximum, so it wraps to a negative value before the division (it prints -397483648). lo + (hi - lo) / 2 gives 1750000000 without overflowing.'),
      ck('JAVA_BASICS', 'With `int MOD = 1_000_000_007, x = 1_000_000_000, y = 1_000_000_000;`, a solution prints `x * y % MOD` and then `(long) x * y % MOD`. What are the two results?',
        [['49 and 49', false],
         ['A negative number, then 49', true],
         ['49, then a negative number', false],
         ['0 and 49', false]],
        'x * y is computed in int and wraps around before the remainder is taken, so the first result is negative (-486618617). Casting one operand to long makes the product 10^18 exactly, and its remainder is 49.'),
      ck('DSA_STRINGS', 'A solution builds its answer with `String out = ""; for (int i = 0; i < n; i++) out += i + " ";` for n = 10^5. What is the cost of that loop?',
        [['O(n), one append per i', false],
         ['O(n log n), from amortised resizing', false],
         ['O(n²), as each += copies all of out', true],
         ['O(1), as the compiler hoists it', false]],
        'Each += creates a new String containing everything built so far, so the copies add up to about n²/2 characters. One StringBuilder appended in the loop and printed once is linear.'),
      ck('DSA_HASHING', 'Two words were counted 300 times each in a `HashMap<String, Integer> freq`. A solution checks `if (freq.get(w1) == freq.get(w2))` to find equal counts. What happens?',
        [['It works for every count up to Integer.MAX_VALUE', false],
         ['It does not compile: Integer cannot use ==', false],
         ['It is false for these 300s', true],
         ['It throws ClassCastException', false]],
        'The counts are Integer objects; == compares references, and only -128 to 127 come from the shared cache. Two separately boxed 300s are different objects. Use equals or compare the unboxed ints.'),
      ck('DSA_STACK', 'A heap is built with `new PriorityQueue<Integer>((a, b) -> a - b)` and receives 2_000_000_000 then -2_000_000_000. What does poll() return first?',
        [['-2000000000, the smaller value', false],
         ['It throws ArithmeticException on overflow', false],
         ['Either one, as the heap\'s internal order is unspecified', false],
         ['2000000000, because the subtraction overflows', true]],
        '-2×10^9 minus 2×10^9 overflows to a positive int, so the comparator claims the negative number is larger and the heap puts 2×10^9 first. Integer::compare (or Integer.compare(a, b)) orders them correctly.'),
      ck('DSA_STACK', '`ArrayDeque<Integer> dq = new ArrayDeque<>(); dq.push(1); dq.push(2); dq.offer(3);` — what does `System.out.println(dq);` print?',
        [['[1, 2, 3]', false],
         ['[3, 2, 1]', false],
         ['[2, 1, 3]', true],
         ['[1, 3, 2]', false]],
        'push inserts at the head (giving [2, 1]) and offer appends at the tail (giving [2, 1, 3]); toString lists head to tail. Using push with poll, or offer with pop, is a common way to turn a queue into a stack by accident.'),
      ck('DSA_GRAPHS', 'A recursive DFS counts components and passes every sample. On a hidden test the graph is one path of 100 000 nodes. What is the most likely result?',
        [['A StackOverflowError at runtime', true],
         ['Time limit exceeded from the recursion', false],
         ['Accepted, because DFS is O(n + m)', false],
         ['A wrong count of exactly 2 components', false]],
        'The recursion is 100 000 calls deep along the path, beyond what the default thread stack holds, so the JVM throws StackOverflowError. The algorithm is linear; the fix is an explicit stack, BFS or union-find.'),
      ck('DSA_TREES', 'Level-order printing uses `for (int i = 0; i < q.size(); i++) { int c = q.poll(); line.append(c); ...offer children 2c and 2c+1... }` and prints one line per while-loop pass. On the perfect tree 1..7, what is the first line?',
        [['1', false],
         ['1 2 3', false],
         ['1 2 3 4', true],
         ['1 2 4', false]],
        'q.size() is re-read every iteration while children are being offered: after polling 1 the size is 2, after 2 it is 3, after 3 it is 4, so node 4 is pulled into the first line before i catches up. Snapshot the size before the loop to get one level per line.'),
      ck('DSA_DP', 'A 0/1 knapsack fills `long[] dp` with `for (int c = w; c <= W; c++)` for each item. For one item (weight 3, value 5) and W = 9, what is dp[9]?',
        [['15', true],
         ['0', false],
         ['5', false],
         ['45', false]],
        'Iterating capacity upward reuses dp[c - w] already updated by this item, so it is counted three times: 15. That is the unbounded knapsack. For 0/1, loop c from W down to w and the answer is 5.'),
      ck('DSA_GREEDY', 'Meetings are sorted by start time, and a greedy picks every meeting that starts after the last picked one ends. On (1, 10), (2, 3), (4, 5), how many does it pick, and how many fit?',
        [['It picks 3; 3 fit', false],
         ['It picks 2; 2 fit', false],
         ['It picks 2; 3 fit', false],
         ['It picks 1; 2 fit', true]],
        'Sorted by start, it takes (1, 10) first, which blocks both others, so it picks 1. Taking (2, 3) and (4, 5) fits 2. The proven greedy sorts by end time, which leaves the most room for the rest.'),
    ],
  },
];

/* ══ JT_MCQ_JAVA_SPRING — Java and Spring MCQ Rounds ══════════════════════════════════════ */

const MCQ_BUNDLES: PilotBundle[] = [
  {
    unitCode: 'JT_MCQ_JAVA_SPRING_MCQ_OUTPUT',
    notes: `The Java section of a company online test is mostly "what does this print?". Each snippet hides one
rule of the language; you have about a minute, so the skill is spotting **which** rule. Here are the twelve rules
these questions are built on. Every snippet below was compiled and run; the output shown is real. Cover the
answer, predict it, then read why.

## 1. The string pool and ==

    String a = "hi";
    String b = "hi";
    String c = new String("hi");
    System.out.println(a == b);
    System.out.println(a == c);
    System.out.println(a == c.intern());

**Prints** \`true\`, \`false\`, \`true\`. **Why:** identical literals share one pooled object; \`new String\` always
makes a fresh object on the heap; \`intern()\` returns the pooled one. \`==\` compares references — that is the whole
trick. Use \`equals\` for content.

**Follow-up an interviewer adds:** "Is the pool on the heap?" — yes, since Java 7 (it was in PermGen before).

## 2. Compile-time constants join the pool

    String s2 = "java";
    String s1 = "ja" + "va";
    String p = "ja";
    String s3 = p + "va";
    final String fp = "ja";
    String s4 = fp + "va";
    System.out.println((s1 == s2) + " " + (s3 == s2) + " " + (s4 == s2));

**Prints** \`true false true\`. **Why:** \`"ja" + "va"\` and \`fp + "va"\` (a \`final\` variable initialised with a
constant) are folded by the compiler into the literal "java". \`p + "va"\` happens at run time and builds a new object.

## 3. Integer caching from -128 to 127

    Integer a = 127, b = 127;
    Integer c = 128, d = 128;
    System.out.println(a == b);
    System.out.println(c == d);
    System.out.println(c.equals(d));

**Prints** \`true\`, \`false\`, \`true\`. **Why:** autoboxing calls \`Integer.valueOf\`, which returns cached objects
for -128..127. 128 is outside the cache, so each box is a new object and \`==\` is false. \`Long\`, \`Short\`,
\`Byte\` and \`Character\` (0..127) cache the same way; \`Double\` and \`Float\` do not cache at all.

**Common wrong answer:** "false, false, true — == on objects is always false". Inside the cache it is true.

## 4. Overflow is silent

    int x = Integer.MAX_VALUE;
    System.out.println(x + 1);
    System.out.println(Math.abs(Integer.MIN_VALUE));
    long big = 1000000 * 1000000;
    System.out.println(big);
    long fixed = 1000000L * 1000000;
    System.out.println(fixed);

**Prints** \`-2147483648\`, \`-2147483648\`, \`-727379968\`, \`1000000000000\`. **Why:** int arithmetic wraps
around without an exception. \`Math.abs(MIN_VALUE)\` has no positive int to return, so it returns itself. The third
line multiplies two ints *before* the result is widened to long; the \`L\` in the fourth makes it long arithmetic.
(\`Math.addExact\` and \`Math.multiplyExact\` throw instead of wrapping, if you want overflow to be loud.)

## 5. char arithmetic

    char c = 'A';
    System.out.println(c + 1);
    System.out.println((char) (c + 1));
    System.out.println('a' + 'b');
    System.out.println("" + 'a' + 'b');
    c += 1;
    System.out.println(c);

**Prints** \`66\`, \`B\`, \`195\`, \`ab\`, \`B\`. **Why:** \`char + int\` is an int (65 + 1). Two chars added are
also ints (97 + 98). Once a String is on the left, \`+\` concatenates. \`c += 1\` compiles because compound assignment
casts back to char; \`c = c + 1\` would not compile.

## 6. static versus instance fields

    class Counter {
        static int shared;
        int own;
        Counter() { shared++; own++; }
    }
    // in main:
    Counter x = new Counter();
    new Counter();
    Counter z = new Counter();
    System.out.println(Counter.shared + " " + x.own + " " + z.own);

**Prints** \`3 1 1\`. **Why:** one \`shared\` belongs to the class and counts all three constructions; every object
has its own \`own\`, incremented once.

## 7. Fields and static methods are not overridden

    class Parent {
        String name = "parent";
        static String kind() { return "Parent.kind"; }
        String hello() { return "Parent.hello"; }
    }
    class Child extends Parent {
        String name = "child";
        static String kind() { return "Child.kind"; }
        @Override String hello() { return "Child.hello"; }
    }
    // in main:
    Parent p = new Child();
    System.out.println(p.name + " " + p.kind() + " " + p.hello());

**Prints** \`parent Parent.kind Child.hello\`. **Why:** only instance methods are dispatched on the run-time object.
Fields and static methods are chosen by the **declared** type (\`Parent\`) — the child's versions *hide* them.

## 8. Overload resolution: widening, then boxing, then varargs

    static void f(long x)     { System.out.println("long"); }
    static void f(Integer x)  { System.out.println("Integer"); }
    static void f(int... x)   { System.out.println("varargs"); }
    static void g(Object o)   { System.out.println("Object"); }
    static void g(String s)   { System.out.println("String"); }
    // in main:
    f(5);
    g(null);

**Prints** \`long\`, \`String\`. **Why:** the compiler tries, in order, methods that need no boxing (int widens to
long), then boxing, then varargs; the first phase that finds a match wins. With \`null\`, both \`g\`s apply and the
**most specific** one (String is a subtype of Object) is chosen. Add a \`g(Integer)\` and \`g(null)\` stops compiling
— ambiguous.

## 9. finally can override a return

    static int first() {
        try { return 1; } finally { return 2; }
    }
    static int second() {
        int x = 10;
        try { return x; } finally { x = 99; }
    }
    // in main:
    System.out.println(first() + " " + second());

**Prints** \`2 10\`. **Why:** a \`return\` in \`finally\` replaces the pending one (and would swallow an exception too —
never write it). In \`second\`, the value 10 is captured when \`return x\` runs; changing the local in \`finally\`
does not change what was already chosen.

## 10. An exception in a static initialiser

    class Boom {
        static int value = 10 / Integer.parseInt("0");
    }
    // in main:
    for (int i = 0; i < 2; i++) {
        try {
            System.out.println(Boom.value);
        } catch (Throwable t) {
            System.out.println(t.getClass().getSimpleName());
        }
    }

**Prints** \`ExceptionInInitializerError\`, then \`NoClassDefFoundError\`. **Why:** the ArithmeticException during
class initialisation is wrapped in an ExceptionInInitializerError. The class is then marked unusable, and every later
use fails with NoClassDefFoundError — a classic production puzzle, too: the second error in the log is not the cause.

## 11. i++ versus ++i

    int i = 5;
    i = i++;
    int j = 5;
    int k = j++ + ++j;
    System.out.println(i + " " + j + " " + k);

**Prints** \`5 7 12\`. **Why:** \`i++\` yields the old value 5, increments i to 6, and then the assignment stores the
old 5 back. In \`j++ + ++j\`, operands are evaluated left to right: \`j++\` gives 5 (j becomes 6), \`++j\` makes j 7
and gives 7; 5 + 7 = 12.

## 12. The ternary operator promotes numbers

    Object o = true ? Integer.valueOf(1) : Double.valueOf(2.0);
    System.out.println(o);
    char x = 'X';
    int i = 0;
    System.out.println(true ? x : 0);
    System.out.println(false ? i : x);

**Prints** \`1.0\`, \`X\`, \`88\`. **Why:** when both branches are numeric, the result gets the promoted type, so the
Integer is unboxed and widened to double even though that branch was chosen. A char with an int **constant** that
fits in char stays char (X); a char with an int **variable** becomes int (88).

## How to work an output question in the test

1. Find the types first — int or long, Integer or int, String or char.
2. Ask which rule the snippet is testing; there is almost always exactly one.
3. Check whether it even compiles — "compile error" is often an option and sometimes right.`,
    mcqs: [
      mcq('What does `System.out.println(1 + 2 + "3" + 4 + 5);` print?',
        [['15', false],
         ['3345', true],
         ['12345', false],
         ['339', false]],
        '+ is evaluated left to right: 1 + 2 is the int 3; then 3 + "3" is the String "33"; from there every + concatenates, giving "3345". Only the operations before the first String are arithmetic.'),
      mcq('`class Base { Base() { show(); } void show() {} }` and `class Derived extends Base { int v = 5; String s = "set"; void show() { System.out.println(v + " " + s); } }`. What does `new Derived();` print?',
        [['5 set', false],
         ['Nothing, since Base.show is empty', false],
         ['0 null', true],
         ['A NullPointerException', false]],
        'Base\'s constructor runs before Derived\'s field initialisers, yet show() dispatches to the Derived override. At that moment v and s still hold their defaults, 0 and null. Concatenating null prints "null", so there is no exception.'),
      mcq('`Set<Short> set = new HashSet<>(); for (short i = 0; i < 100; i++) { set.add(i); set.remove(i - 1); }` — what is set.size()?',
        [['1', false],
         ['0', false],
         ['99', false],
         ['100', true]],
        'i - 1 is an int expression, so remove receives an Integer. No Integer equals a Short, so nothing is ever removed and all 100 Shorts stay. remove takes Object, which is why this compiles without a warning.'),
    ],
    checkpoint: [
      ck('JAVA_OOP', '`class A { static { System.out.print("S"); } { System.out.print("I"); } A() { System.out.print("C"); } }` — what does `new A(); new A();` print?',
        [['SICSIC', false],
         ['SICIC', true],
         ['SSICIC', false],
         ['ICSIC', false]],
        'The static block runs once, when the class is initialised. Each object then runs the instance initialiser before the constructor body, so two objects give IC twice after a single S.'),
      ck('JAVA_BASICS', '`List<Integer> list = new ArrayList<>(List.of(10, 20, 30, 1)); list.remove(1); list.remove(Integer.valueOf(1));` — what is printed by `System.out.println(list);`?',
        [['[20, 30]', false],
         ['[10, 30]', true],
         ['[10, 20, 30]', false],
         ['[30, 1]', false]],
        'remove(1) with an int picks remove(int index) and deletes 20 at index 1. remove(Integer.valueOf(1)) picks remove(Object) and deletes the value 1. What is left is [10, 30].'),
      ck('JAVA_OOP', 'Given `test(Object o)`, `test(long l)` and `test(Integer... xs)`, with `byte b = 1; Integer boxed = 2;`, what does `test(b) + " " + test(boxed) + " " + test()` produce?',
        [['long long Integer...', false],
         ['Object Object Integer...', false],
         ['long Object Integer...', true],
         ['Integer... Object long', false]],
        'byte widens to long without boxing, so test(long) wins. An Integer already is an Object, a match in the first phase, while reaching long would need unboxing. With no argument only the varargs method applies.'),
    ],
  },
  {
    unitCode: 'JT_MCQ_JAVA_SPRING_MCQ_SPRING',
    notes: `Spring questions in an online test check defaults: what Spring does when you did not say. Twelve
questions in the test's own format, each with the answer and the reason. The facts are for Spring Framework 6 and
Spring Boot 3 (Jakarta EE 9+, so \`jakarta.*\` imports — Boot 2 used \`javax.*\`).

## 1. What is the default scope of a bean declared with @Component?
Options: prototype · singleton · request · session.
**Answer: singleton.** One instance per application context, created eagerly at startup. Prototype gives a new
instance per lookup; request and session exist only in web-aware contexts.

## 2. @SpringBootApplication combines which annotations?
**Answer: @SpringBootConfiguration (a @Configuration), @EnableAutoConfiguration and @ComponentScan.** The scan
starts at the package of the annotated class — a component in a sibling package is not found, a common
"bean not found" cause.

## 3. Two beans implement PaymentService, neither is @Primary, and a constructor takes PaymentService. What happens at startup?
**Answer:** startup fails with NoUniqueBeanDefinitionException — **unless** the parameter name matches one bean's
name, which Spring uses as a fallback. Fix it explicitly with @Primary on one bean or @Qualifier("upiPayment") on
the parameter.

## 4. A class has exactly one constructor and no @Autowired. Is it injected?
**Answer: yes.** Since Spring 4.3 a single constructor is used for injection automatically. With two or more
constructors, mark the one to use.

## 5. What is the default bean name of @Component class OrderService? Of class URLShortener?
**Answer:** \`orderService\` and \`URLShortener\`. Spring lower-cases the first letter — except when the first two
letters are both capitals, when the name is kept as is (the JavaBeans decapitalize rule).

## 6. A @Configuration class has @Bean a() and @Bean b() { return new B(a()); }. How many A objects exist?
**Answer: one.** @Configuration classes are CGLIB-proxied, so calling a() returns the container's singleton. In a
plain @Component ("lite" mode) the same code would construct a second A.

## 7. A singleton bean has a prototype-scoped dependency injected through its constructor. How many prototype instances does it use over its life?
**Answer: one.** Injection happens once, when the singleton is created. To get a fresh one per use, inject
\`ObjectProvider<T>\` and call \`getObject()\`, or use a lookup method.

## 8. @Transactional on a service method that throws a checked IOException — commit or rollback?
**Answer: commit.** By default Spring rolls back on RuntimeException and Error only. Use
\`@Transactional(rollbackFor = IOException.class)\` to change it.

## 9. Method a() calls this.b() in the same bean; only b() is @Transactional. Does b() run in a transaction?
**Answer: no** (not one of its own). Transactions are applied by a proxy, and a call through \`this\` never passes
through the proxy. Move b() to another bean or make the outer method transactional.

## 10. Default fetch types in JPA?
**Answer:** @ManyToOne and @OneToOne are EAGER; @OneToMany and @ManyToMany are LAZY. Interviewers follow up with
"so why do you see N+1 queries on a list of orders?" — the eager @ManyToOne loads a customer per order.

## 11. What does @Value("\${app.timeout:30}") inject if app.timeout is not set?
**Answer: 30.** The part after the colon is the default. Without a default, a missing property fails startup.

## 12. Which actuator endpoint is exposed over HTTP by default in Spring Boot 3?
**Answer: only /actuator/health.** Others (info, metrics, env, beans) must be listed in
\`management.endpoints.web.exposure.include\`.

## Quick facts the same tests ask

- Default embedded server Tomcat on port 8080; \`server.port=0\` picks a random free port.
- @RestController = @Controller + @ResponseBody.
- @RequestParam is required by default; a missing one gives 400 Bad Request.
- \`spring.jpa.hibernate.ddl-auto\`: none, validate, update, create, create-drop; Boot defaults to create-drop for an
  embedded database (H2) and none otherwise.
- With the profile \`dev\` active, application-dev.properties overrides application.properties.
- Boot 2.6+ refuses circular bean references by default.`,
    mcqs: [
      mcq('A Spring Boot app has `@Component class URLShortener`. Another bean asks for it with `@Qualifier("urlShortener")`. What happens?',
        [['It is injected: names match case-insensitively', false],
         ['Startup fails: the bean is named URLShortener', true],
         ['A second URLShortener is created for it', false],
         ['Spring logs a warning and injects by type', false]],
        'When the first two letters of the class name are capitals, the default bean name keeps the class name unchanged, so the bean is URLShortener, not urlShortener. No bean matches the qualifier and startup fails with NoSuchBeanDefinitionException.'),
      mcq('A `@Configuration` class declares `@Bean Clock clock()`, `@Bean Audit audit() { return new Audit(clock()); }` and `@Bean Report report() { return new Report(clock()); }`. How many Clock objects does the context hold?',
        [['Three, one per call site', false],
         ['Two, one per bean that calls clock()', false],
         ['One, since the calls go through the proxy', true],
         ['None, as clock() is never called directly', false]],
        'Full @Configuration classes are subclassed by CGLIB, and calls to @Bean methods are intercepted to return the container\'s singleton. In a @Component (lite mode) each call would construct a new Clock.'),
      mcq('A `@Transactional` method saves an order and then throws `new IOException("disk full")`, a checked exception, with no rollbackFor. What is in the database afterwards?',
        [['No order: every exception rolls back', false],
         ['The order: checked exceptions commit', true],
         ['No order, but only on MySQL', false],
         ['The order, but only without a proxy', false]],
        'Spring\'s default rule rolls back for RuntimeException and Error only; a checked exception lets the transaction commit. Declaring rollbackFor = IOException.class (or Exception.class) changes that.'),
    ],
    checkpoint: [
      ck('SPRING_CORE', 'OrderService.placeOrder() (not transactional) calls `this.saveAudit()`, which is annotated @Transactional(propagation = REQUIRES_NEW). How does saveAudit run?',
        [['In a new transaction, as annotated', false],
         ['Inside the caller\'s transaction', false],
         ['Without a transaction from that annotation', true],
         ['It fails startup: self-calls are rejected', false]],
        'The transactional behaviour lives in the proxy around the bean, and this.saveAudit() is a plain call on the target object that skips the proxy. The annotation has no effect on that call; call it through another bean.'),
      ck('SPRING_CORE', 'A singleton ReportService gets a @Scope("prototype") Formatter through its constructor and calls it 1 000 times. How many Formatter instances does it use?',
        [['One, injected once at creation', true],
         ['1 000, one per call', false],
         ['One per thread that calls it', false],
         ['None, as the scopes are incompatible', false]],
        'The prototype is resolved when the singleton is built, so the same Formatter is reused for every call. Injecting ObjectProvider<Formatter> and calling getObject() each time gives a fresh instance.'),
      ck('SPRING_BOOT', 'A fresh Spring Boot 3 app adds spring-boot-starter-actuator with no other settings. Which HTTP request returns 200?',
        [['GET /actuator/beans', false],
         ['GET /actuator/health', true],
         ['GET /actuator/env', false],
         ['GET /actuator/metrics', false]],
        'Only the health endpoint is exposed over the web by default; the others are not exposed and return 404 until listed in management.endpoints.web.exposure.include. env and beans can leak secrets, which is why.'),
    ],
  },
  {
    unitCode: 'JT_MCQ_JAVA_SPRING_TIMED_SET',
    notes: `A company online test usually gives the Java and Spring section **20 questions in 20 minutes**, and a
quarter-mark negative marking is common; the questions do not get easier towards the end. Take this set with a
timer: one minute per question, skip anything over ninety seconds and come back. Then check the answer key — the
reasoning matters more than the score. Every Java output below was compiled and run.

## The set

**Q1.** \`System.out.println((-7 / 2) + " " + (-7 % 2) + " " + (7 % -2));\`

**Q2.** \`byte b = (byte) 200; int shifted = 1 << 33; System.out.println(b + " " + shifted);\`

**Q3.** \`double d = 7 / 2; System.out.println(d + " " + (0.1 + 0.2 == 0.3));\`

**Q4.** Two \`StringBuilder\`s both holding "a": print \`x.equals(y)\`, \`x.toString().equals(y.toString())\` and
\`x.compareTo(y) == 0\`.

**Q5.** \`int x = 2; switch (x) { case 1: s += "a"; case 2: s += "b"; case 3: s += "c"; break; default: s += "d"; }\`
— what is s, starting from ""?

**Q6.** \`String s = "abc"; s.toUpperCase(); s.concat("d"); String t = s.replace('a', 'z');\` — print \`s + " " + t\`.

**Q7.** A method throws IllegalStateException in try, catches RuntimeException and returns 1, and prints "F " in
finally. What does \`System.out.println(f())\` print?

**Q8.** \`Math.round(-2.5) + " " + Math.round(2.5) + " " + Math.round(-2.6)\`

**Q9.** \`"a,b,,c,,".split(",").length\`

**Q10.** \`Integer n = null; int v = true ? n : 0;\` — what happens?

**Q11.** A \`Point\` class overrides \`equals\` but not \`hashCode\`; two equal points go into a \`HashSet\`. Print
\`set.size()\` and \`new Point(1, 2).equals(new Point(1, 2))\`.

**Q12.** \`short s = 10; s += 5; int total = 0; for (int i = 0; i < 5; i++) total += i++;\` — print \`s + " " + total\`.

**Q13.** Which annotation makes every handler in a class return its result as the response body?

**Q14.** A handler declares \`@PathVariable Long id\` on \`@GetMapping("/orders/{orderId}")\`. What happens on
GET /orders/7?

**Q15.** Which \`ddl-auto\` value creates the schema at startup and drops it at shutdown?

**Q16.** Which annotation on a \`@RequestBody\` parameter triggers Bean Validation of its fields?

**Q17.** \`@OneToMany List<OrderLine> lines\` — default fetch type?

**Q18.** In Spring Data JPA, what does \`findTop3ByStatusOrderByCreatedAtDesc(String status)\` return?

**Q19.** Which property makes an app listen on port 9090?

**Q20.** Which starter brings in Tomcat, Spring MVC and Jackson?

## Answer key and reasoning

1. **\`-3 -1 1\`** — integer division truncates toward zero; the remainder takes the sign of the **dividend**.
2. **\`-56 2\`** — 200 does not fit in a byte: 200 − 256 = −56. Shift distances on an int are taken mod 32, so
   \`1 << 33\` is \`1 << 1\`.
3. **\`3.0 false\`** — \`7 / 2\` is int division (3) before widening. 0.1 + 0.2 is 0.30000000000000004 in binary
   floating point.
4. **\`false true true\`** — StringBuilder does not override \`equals\` (it is identity), but it is \`Comparable\`
   since Java 11, and comparing the Strings works.
5. **\`bc\`** — no \`break\` after case 2, so execution falls through into case 3, which breaks.
6. **\`abc zbc\`** — Strings are immutable; the results of toUpperCase and concat were thrown away.
7. **\`F 1\`** — finally runs before the method actually returns, so "F " is printed first, then main prints 1.
8. **\`-2 3 -3\`** — Math.round is floor(x + 0.5): −2.5 + 0.5 = −2.0; 2.5 + 0.5 = 3.0; −2.6 + 0.5 = −2.1 → −3.
9. **\`4\`** — split removes **trailing** empty strings but keeps the empty one between b and c.
10. **NullPointerException** — the branches are Integer and int, so the result type is int and \`n\` is unboxed.
11. **\`2 true\`** — equal objects with different (identity) hash codes land in different buckets and are never
    compared with equals. Override both or neither.
12. **\`15 6\`** — \`s += 5\` casts back to short (\`s = s + 5\` would not compile). The body's \`i++\` plus the
    header's skips every other value: total = 0 + 2 + 4.
13. **@RestController** — @Controller + @ResponseBody on every handler.
14. **It fails** — with no name given, Spring looks for a template variable named after the parameter, \`id\`,
    finds only \`orderId\`, and throws MissingPathVariableException (a 500). Write \`@PathVariable("orderId") Long id\`.
15. **create-drop** — Boot's default for an embedded database; \`create\` drops and recreates at startup only.
16. **@Valid** (or @Validated) — failures raise MethodArgumentNotValidException, a 400 by default.
17. **LAZY** — every to-many association is lazy by default.
18. **Up to three entities with that status, newest first** — Top3 limits, OrderBy…Desc sorts.
19. **\`server.port=9090\`**.
20. **spring-boot-starter-web** — embedded Tomcat, Spring MVC and Jackson for JSON.

**Scoring yourself:** 17+ is test-ready; 13–16 means review the rule behind each miss; below 13, redo the output
and Spring units before the next attempt.`,
    mcqs: [
      mcq('`int a = 0;` — what do `System.out.println((a != 0) && (10 / a > 1));` and then the same line with `&` instead of `&&` produce?',
        [['false, then false', false],
         ['ArithmeticException on both lines', false],
         ['false, then an ArithmeticException', true],
         ['true, then an ArithmeticException', false]],
        '&& short-circuits: the left side is false, so 10 / a is never evaluated. & always evaluates both operands, so the division by zero runs and throws.'),
      mcq('`int[] arr = new int[3]; int i = 0; arr[i] = i = 2;` and `static int next() { return ++count; }` with count = 0. What does `arr[0] + " " + arr[2] + " " + i + " " + (next() + next() * next())` print?',
        [['0 2 2 9', false],
         ['2 0 2 7', true],
         ['2 0 2 9', false],
         ['0 2 2 7', false]],
        'The array index is evaluated before the right-hand side, so arr[0] gets 2 and arr[2] stays 0. Operands are evaluated left to right (1, 2, 3) and then precedence applies: 1 + 2 * 3 = 7.'),
      mcq('With `static String m(Object o)` and `static String m(String s)`, and `Object o = "text";`, what does `m(o) + " " + m((String) o)` return?',
        [['String String', false],
         ['Object Object', false],
         ['String Object', false],
         ['Object String', true]],
        'Overloads are chosen at compile time from the declared type. o is declared Object, so m(Object) is picked even though the object is a String; the cast changes the static type and selects m(String).'),
      mcq('`int[] a = {1, 2}; int[] b = {1, 2};` — what does `(a == b) + " " + a.equals(b) + " " + Arrays.equals(a, b)` give?',
        [['false false true', true],
         ['false true true', false],
         ['true true true', false],
         ['false false false', false]],
        'Arrays inherit equals from Object, which is identity, so a.equals(b) is the same as a == b. Arrays.equals compares length and elements, which is what you almost always want.'),
      mcq('`List.of(1, 2).add(3)` and `Arrays.asList(1, 2).set(0, 9)` are each run. Which one throws?',
        [['Only the Arrays.asList set call', false],
         ['Only the List.of add call', true],
         ['Both, as both lists are immutable', false],
         ['Neither, as both lists are resizable', false]],
        'List.of returns an unmodifiable list, so add throws UnsupportedOperationException. Arrays.asList is fixed-size but writable: set works (and writes through to the array), while add or remove would throw.'),
      mcq('A controller method is `@GetMapping("/orders") List<Order> list(@RequestParam int page)`. A client calls GET /orders with no query string. What does it get?',
        [['200 with page set to 0', false],
         ['404 Not Found', false],
         ['500 Internal Server Error', false],
         ['400 Bad Request', true]],
        '@RequestParam is required by default, so Spring rejects the request with MissingServletRequestParameterException, mapped to 400. For a primitive int, defaultValue = "0" is the fix; required = false alone would fail on the missing int.'),
      mcq('An entity `User` maps to table users. `@Query("select u from users u where u.active = true")` fails at startup. What is the fix?',
        [['Add nativeQuery = false explicitly', false],
         ['Rename the MySQL table to User', false],
         ['Write select u from User u', true],
         ['Annotate the repository with @Table', false]],
        'JPQL is written against entity names and fields, not tables and columns, so "users" is an unknown entity and the query fails validation at startup. Use the entity name, or mark it nativeQuery = true to write SQL.'),
      mcq('`spring.jpa.hibernate.ddl-auto=validate` is set and an entity has a field with no matching column. What happens?',
        [['The column is added automatically', false],
         ['The app starts and the field stays null', false],
         ['The table is dropped and recreated', false],
         ['Startup fails on schema validation', true]],
        'validate compares the mapping with the existing schema and changes nothing; a missing column is a SchemaManagementException at startup. update would add the column, and create or create-drop would rebuild the table.'),
    ],
  },
  {
    unitCode: 'JT_MCQ_JAVA_SPRING_CHECKPOINT',
    notes: `Ten questions in the format of a company online test: Java output first, then Spring. Give yourself
ten minutes, and for each Java snippet decide the types before the value.`,
    checkpoint: [
      ck('JAVA_BASICS', '`String s = null; s = s + "x"; String t = "abc".substring(1, 1);` — what does `s + " [" + t + "] " + t.isEmpty()` print?',
        [['x [] true', false],
         ['nullx [] true', true],
         ['A NullPointerException', false],
         ['nullx [b] false', false]],
        'String concatenation turns a null reference into the text "null", so s becomes "nullx" with no exception. substring(1, 1) has equal begin and end indexes, which is the empty string.'),
      ck('JAVA_OOP', '`class Animal { String sound() { return "..."; } String describe() { return "I say " + sound(); } }` and `class Dog extends Animal { String sound() { return "woof"; } String describe(String p) { return p + sound(); } }`. What does `Animal a = new Dog(); a.describe()` return?',
        [['"I say ..."', false],
         ['"woof"', false],
         ['"I say woof"', true],
         ['It does not compile', false]],
        'describe() is inherited unchanged (Dog only adds an overload with a parameter), and inside it sound() dispatches on the real object, a Dog. So the Animal method runs but calls Dog.sound().'),
      ck('JAVA_BASICS', 'What does `(-7 % 3) + " " + Math.floorMod(-7, 3) + " " + (((-7 % 3) + 3) % 3)` print?',
        [['2 2 2', false],
         ['-1 -1 2', false],
         ['1 2 2', false],
         ['-1 2 2', true]],
        'The % operator keeps the sign of the dividend, giving -1. floorMod returns a result with the sign of the divisor, 2, and adding the modulus before the second % is the manual way to get the same 2.'),
      ck('JAVA_BASICS', '`Integer i = 127; Long l = 127L;` — what does `i.equals(l) + " " + l.equals(127) + " " + (l == 127) + " " + l.equals(127L)` print?',
        [['false false true true', true],
         ['true true true true', false],
         ['false true true true', false],
         ['false false false true', false]],
        'equals on wrapper types requires the same class: an Integer never equals a Long, and l.equals(127) boxes 127 to Integer. l == 127 compares a Long with an int, so l is unboxed and the values match.'),
      ck('JAVA_OOP', 'Inner try throws RuntimeException("a"); its catch throws IllegalStateException("b"); its finally prints "f ". An outer catch prints e.getMessage(). What is the output?',
        [['f a', false],
         ['b f', false],
         ['f b', true],
         ['a b f', false]],
        'The exception from the catch block is the one propagating, so "a" is gone. finally runs before that exception leaves the inner try statement, printing "f " first, and the outer handler then prints "b".'),
      ck('SPRING_CORE', 'Two @Service classes implement NotificationService: EmailNotifier and SmsNotifier, neither @Primary. A controller has a constructor parameter `NotificationService notifier`. What happens at startup?',
        [['EmailNotifier is injected, first by name', false],
         ['Both are injected as a list', false],
         ['NoUniqueBeanDefinitionException', true],
         ['Whichever bean was created first is used', false]],
        'Two candidates match the type and the parameter name "notifier" matches neither bean name, so Spring cannot choose and startup fails. @Primary, @Qualifier, or a parameter named emailNotifier resolves it; List<NotificationService> would receive both.'),
      ck('SPRING_CORE', '@SpringBootApplication sits on com.shop.app.ShopApplication, and a @RestController lives in com.shop.api. The endpoint returns 404. Why?',
        [['The controller also needs @Component', false],
         ['Scanning starts at com.shop.app', true],
         ['Controllers must sit in a controller package', false],
         ['@RestController needs @EnableWebMvc', false]],
        'The implicit @ComponentScan scans the main class\'s package and its sub-packages. com.shop.api is a sibling, so the controller is never registered. Move the main class to com.shop or set scanBasePackages.'),
      ck('SPRING_BOOT', 'application.properties sets server.port=8080 and application-prod.properties sets server.port=9000. The app starts with the prod profile active. Which port?',
        [['8080, the base file wins', false],
         ['Both, one connector each', false],
         ['9000, the profile file wins', true],
         ['Startup fails on the duplicate key', false]],
        'Profile-specific files are loaded after the base file and override matching keys, so 9000 wins. Keys present only in application.properties still apply under the prod profile.'),
      ck('SPRING_BOOT', 'A @RestController method takes `@Valid @RequestBody SignupRequest req`, where email is @NotBlank. A client posts {"email": ""}. What is returned by default?',
        [['200, with the empty email saved', false],
         ['400, after MethodArgumentNotValidException', true],
         ['422 Unprocessable Entity', false],
         ['500, with ConstraintViolationException', false]],
        '@Valid on a request body runs Bean Validation before the method; a failure raises MethodArgumentNotValidException, which Spring maps to 400 Bad Request. A @RestControllerAdvice can reshape the error body.'),
      ck('SPRING_BOOT', 'Order has `@ManyToOne Customer customer` with no fetch setting. A page lists 50 orders, each with a different customer, loaded by `orderRepository.findAll()`. How many SQL queries run?',
        [['1, as findAll joins the customer', false],
         ['51: the orders, then one per customer', true],
         ['50, one per order', false],
         ['2, one for orders and one for customers', false]],
        '@ManyToOne is EAGER by default, but findAll is a JPQL query with no join, so Hibernate loads the orders and then each customer separately: the N+1 problem. A join fetch or @EntityGraph makes it one query.'),
    ],
  },
];

export const TRACK_CODING_JAVA_BUNDLES: PilotBundle[] = [...CODING_BUNDLES, ...MCQ_BUNDLES];
