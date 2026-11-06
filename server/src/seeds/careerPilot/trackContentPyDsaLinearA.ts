/**
 * Career-track content: DSA in Python over linear structures (JT_PY_DSA_LINEAR), first half —
 * complexity, array and string patterns, linked lists, and stacks and queues. Hashing, recursion,
 * sorting and searching, and the ending units live in a sibling file.
 *
 * The Python tracks used to borrow the years' DSA topics. They now teach DSA here, in Python, the
 * way DSA in Java and DSA in C# are taught in their tracks: every concept unit names a classic
 * problem, solves it in full, states its cost and its edge cases, and says plainly where Python
 * differs from Java — list.pop(0) is O(n), there is no built-in linked list or TreeMap, ints never
 * overflow, and recursion stops at about 1000 frames.
 *
 * Attribution: the topic is multi-skill. Every checkpoint question names the one skill it
 * measures, taken from its own unit's skillKeys. Practice mcqs name none.
 *
 * Everything is Python 3.10, because that is what the grader runs; every quoted output was run
 * and checked.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_PY_DSA_LINEAR_A_BUNDLES: PilotBundle[] = [
  /* ══ JT_PY_DSA_LINEAR — DSA in Python: Linear Structures (first half) ═══════════════════ */
  {
    unitCode: 'JT_PY_DSA_LINEAR_COMPLEXITY',
    notes: `Big-O describes how the work a piece of code does **grows** as the input grows. You find it by
asking how many times the innermost operation runs for an input of size n, then keeping only the
fastest-growing term and dropping the constants. An interviewer expects you to state it for every
solution you write, without being asked.

## Counting in Python code

    total = 0
    for x in nums:                     # n iterations of O(1) work: O(n)
        total += x

    for i in range(len(nums)):         # n(n-1)/2 comparisons: O(n²)
        for j in range(i + 1, len(nums)):
            if nums[i] == nums[j]:
                ...

    n, steps = 64, 0
    while n > 1:                       # halves each time: O(log n)
        n //= 2
        steps += 1                     # steps ends at 6, because 2**6 == 64

A loop that halves or doubles is logarithmic; two nested loops over the input are quadratic; two
loops one *after* the other are still O(n), because O(n) + O(n) = O(2n) = O(n).

## The hidden cost is in the built-in

Python hides loops inside single, innocent-looking lines. These are the costs you must know by
heart (n is the size of the container):

| Operation | list | collections.deque | dict / set |
|---|---|---|---|
| \`len(c)\` | O(1) | O(1) | O(1) |
| index \`c[i]\` | O(1) | O(n) in the middle, O(1) at the ends | key lookup O(1) average |
| add at the end | \`append\` O(1) amortised | \`append\` O(1) | \`d[k] = v\` / \`add\` O(1) average |
| remove at the end | \`pop()\` O(1) | \`pop()\` O(1) | — |
| add / remove at the front | \`insert(0, x)\` / \`pop(0)\` **O(n)** | \`appendleft\` / \`popleft\` O(1) | — |
| \`x in c\` | **O(n)** | **O(n)** | **O(1) average** |
| \`remove(x)\`, \`index(x)\`, \`count(x)\` | O(n) | O(n) | \`del d[k]\` O(1) average |
| slice \`c[a:b]\` | O(b - a): it **copies** | not supported | — |
| \`min\`, \`max\`, \`sum\` | O(n) | O(n) | O(n) |
| \`sorted(c)\`, \`c.sort()\` | O(n log n) | via \`sorted\` | via \`sorted\` |

The four that catch people out:

- **\`x in some_list\` is a linear scan.** Inside a loop over n items it makes the loop O(n²).
  Build a \`set\` once (O(n)) and every later \`in\` is O(1) on average.
- **\`list.pop(0)\` and \`list.insert(0, x)\` are O(n)**, because a list is an array and every other
  element shifts. Java's \`ArrayList.remove(0)\` has the same cost; in Python the fix is
  \`collections.deque\`, whose \`popleft\` is O(1).
- **A slice copies.** \`rest = nums[1:]\` builds a new list of n - 1 elements. A recursive function
  that passes \`nums[1:]\` down every call does O(n²) copying in total.
- **\`s += piece\` in a loop can be O(n²).** Strings are immutable, so each \`+=\` may copy the whole
  string built so far. CPython sometimes optimises it, but you must not rely on that: collect the
  pieces in a list and call \`"".join(pieces)\` once, which is O(total length).

**Amortised O(1)** means an occasional \`append\` must allocate a bigger array and copy everything
into it, but CPython over-allocates so those copies are rare, and the total cost of n appends is
O(n). **Average O(1)** for a dict or set means a lookup is constant when the hash values spread
well. Unlike Java 8's HashMap, which turns a crowded bucket into a tree, a Python dict has no
fallback: the theoretical worst case is O(n). In interviews you state O(1) average.

## A classic: contains duplicate

**Problem.** Return True if any value appears twice in a list of ints.

    def has_duplicate(nums):
        seen = set()
        for x in nums:
            if x in seen:          # O(1) average
                return True
            seen.add(x)
        return False

**Cost.** One pass with O(1) average work per element: **O(n) time, O(n) space.** The one-liner
\`len(set(nums)) != len(nums)\` has the same cost but never stops early. The nested-loop version is
O(n²) time and O(1) space; sorting first and comparing neighbours is O(n log n) time. That
trade — time for space — is the conversation an interviewer wants you to have.

## Space, and Python's recursion limit

Space counts the **extra** memory the algorithm allocates — new lists, sets, dicts, slices — plus
the **recursion depth**, because every active call keeps a frame. A recursive function that goes n
calls deep uses O(n) stack even if it allocates nothing else. In Python the depth is capped:
\`sys.getrecursionlimit()\` is 1000 by default, and going deeper raises \`RecursionError\`. Java's
limit depends on the stack size and is usually several thousand frames; Python's is much lower, so
a recursive solution over a list of 100,000 elements must be rewritten as a loop.

## Measuring, when in doubt

    import timeit
    data = list(range(100_000))
    as_set = set(data)
    print(timeit.timeit(lambda: 99_999 in data, number=100))     # slow: scans the list
    print(timeit.timeit(lambda: 99_999 in as_set, number=100))   # fast: one hash lookup

Edge cases to check in every cost claim: an empty input, one element, and all elements equal.`,
    workedExample: `**Problem.** A report script finds the customer IDs that appear in both this month's and
last month's orders. With 50,000 IDs in each list it takes minutes. Find out why and fix it.

    def common(this_month, last_month):
        return [c for c in this_month if c in last_month]

1. **Count the work.** The comprehension runs once per item of \`this_month\`: n times. Inside it,
   \`c in last_month\` is a linear scan of a list of m items. So the cost is **O(n · m)** — with
   50,000 each, up to 2.5 billion comparisons.
2. **Find the hidden loop.** The only expensive line is the \`in\`. Swap the container it searches
   so that \`in\` becomes O(1):

    def common(this_month, last_month):
        last = set(last_month)                    # O(m), done once
        return [c for c in this_month if c in last]   # n lookups, O(1) average each

3. **State the new cost.** Building the set is O(m); the comprehension is O(n). Total
   **O(n + m) time**, and **O(m) extra space** for the set. The script now finishes in
   milliseconds.
4. **Check the edge cases.** An empty \`last_month\` gives an empty set and an empty result. A
   customer who ordered twice this month appears twice in the result — exactly as before, because
   only the lookup changed. If the report must list each customer once, say so and use
   \`set(this_month) & set(last_month)\`, which loses the original order.

The reasoning to say aloud: "the loop is fine; the cost is the \`in\` on a list. A set turns each
lookup from O(m) into O(1) average, for O(m) memory."`,
    mcqs: [
      mcq('In Python, what is the time cost of checking target in names when names is a list of n strings?',
        [['O(n), since the list is scanned item by item', true], ['O(1), since lists keep an index of their values', false], ['O(log n), since Python binary-searches the list', false], ['O(n log n), since the list is sorted before the scan', false]],
        'A list has no index of its contents. The in operator compares target with each element in turn until it finds a match, which is a linear scan in the worst case.'),
      mcq('A worker loop does while jobs: job = jobs.pop(0) on a list of n jobs. What is the total cost of draining the list?',
        [['O(n²), as each pop(0) shifts the rest left', true], ['O(n), as each pop(0) costs constant time', false], ['O(n log n), as the list halves on each pass', false], ['O(1), as the list is emptied all at once', false]],
        'pop(0) removes the first slot of an array, so every remaining element moves one place: n-1, n-2, ... shifts in total, which is quadratic. collections.deque.popleft() makes each removal O(1).'),
      mcq('What is the cost of the line tail = nums[1:] on a Python list of n elements?',
        [['O(n) time and space, because the slice copies', true], ['O(1), because the slice is a view onto nums', false], ['O(log n), because only half the list is copied', false], ['O(1) time but O(n) space, done lazily on use', false]],
        'A list slice builds a brand-new list holding n-1 references, so both the time and the extra memory grow with n. Unlike a NumPy slice, it is not a view.'),
    ],
    checkpoint: [
      ck('DSA_COMPLEXITY', 'What does this print? n = 64; steps = 0; then while n > 1: n //= 2; steps += 1; and finally print(steps)',
        [['6', true], ['7', false], ['32', false], ['64', false]],
        'n goes 64, 32, 16, 8, 4, 2, 1, which is six halvings before the condition n > 1 fails. A halving loop runs about log2(n) times, so it is O(log n).'),
      ck('DSA_COMPLEXITY', 'A dedupe function starts with kept = [] and, for each of n items, runs if x not in kept: kept.append(x). What is its time complexity?',
        [['O(n²), as each not in scans the kept list', true], ['O(n), as append is amortised O(1) each', false], ['O(n log n), as kept grows by one at a time', false], ['O(1), as not in stops at the first match', false]],
        'The append is cheap, but the membership test is a linear scan of a list that can hold up to n items, done n times. Using a set for the seen values makes it O(n).'),
      ck('DSA_COMPLEXITY', 'def total(xs): return 0 if not xs else xs[0] + total(xs[1:]). What happens on total(list(range(5000))) with default settings?',
        [['RecursionError: the depth passes the 1000 limit', true], ['It returns 12497500 after O(n²) copying work', false], ['MemoryError, from the 5000 slices made', false], ['It returns 0, as the base case is hit first', false]],
        'Each call recurses one level deeper, and Python stops at about 1000 frames by default, raising RecursionError. Even below the limit the slices make it O(n²); a loop or sum(xs) is the fix.'),
    ],
  },
  {
    unitCode: 'JT_PY_DSA_LINEAR_ARRAY_PATTERNS',
    notes: `Most list and string questions are a nested loop in disguise. Two patterns turn that O(n²)
into O(n): **two pointers** and the **sliding window**. Recognising which one a problem wants is
half the interview.

## Two pointers from opposite ends: a pair with a target sum

**Problem (Two Sum II).** Given a sorted list and a target, return the 1-based positions of two
numbers that add up to it, or \`(-1, -1)\`.

    def pair_sum(a, target):
        lo, hi = 0, len(a) - 1
        while lo < hi:
            s = a[lo] + a[hi]
            if s == target:
                return (lo + 1, hi + 1)
            if s < target:
                lo += 1          # need a bigger sum: move the small end up
            else:
                hi -= 1          # need a smaller sum: move the big end down
        return (-1, -1)

    pair_sum([1, 3, 4, 6, 9], 13)   # (3, 5): 4 + 9

**Why it is correct.** If \`a[lo] + a[hi]\` is too small, \`a[lo]\` cannot pair with anything left —
every other partner is at most \`a[hi]\`. So \`lo\` can be discarded. The same argument discards \`hi\`
when the sum is too big. **O(n) time, O(1) space.** It depends entirely on the list being sorted;
on an unsorted list the discard is not safe and pairs are missed.

An empty list needs no special case: \`hi\` starts at -1, so \`lo < hi\` is false at once.

## Two pointers in the same direction: compact in place

**Problem.** Remove duplicates from a sorted list in place and return the new length.

    def dedupe_sorted(a):
        if not a:
            return 0
        w = 1                          # a[:w] holds the kept values
        for r in range(1, len(a)):
            if a[r] != a[w - 1]:
                a[w] = a[r]
                w += 1
        return w

    nums = [1, 1, 2, 3, 3, 3]
    k = dedupe_sorted(nums)            # k == 3, nums[:k] == [1, 2, 3]

A **read** pointer visits every element; a **write** pointer marks the end of the answer. O(n)
time, O(1) extra space. In everyday Python you would write \`sorted(set(a))\`, but the interviewer is
asking for the in-place version.

**Palindrome, ignoring punctuation and case** — the same idea from both ends:

    def is_pal(s):
        i, j = 0, len(s) - 1
        while i < j:
            if not s[i].isalnum():
                i += 1
            elif not s[j].isalnum():
                j -= 1
            elif s[i].lower() != s[j].lower():
                return False
            else:
                i, j = i + 1, j - 1
        return True

\`s == s[::-1]\` is shorter, but it copies the string (O(n) space) and cannot skip punctuation.

## Sliding window, fixed size: maximum sum of k consecutive elements

    def max_window(a, k):
        window = sum(a[:k])                # first window: O(k)
        best = window
        for i in range(k, len(a)):
            window += a[i] - a[i - k]      # add the entering element, drop the leaving one
            best = max(best, window)
        return best

The tempting one-liner \`max(sum(a[i:i + k]) for i in range(len(a) - k + 1))\` slices and sums
every window: **O(n · k)**. Sliding the window is **O(n) time, O(1) space**. Unlike Java, you need
not worry about overflow — Python ints grow as needed — but you must guard \`k > len(a)\` and
\`k <= 0\` yourself.

## Sliding window, variable size: longest substring without a repeated character

Move the right edge every step; move the left edge only when the window becomes invalid.

    def longest_unique(s):
        last = {}                          # char -> index where it was last seen
        left = best = 0
        for right, ch in enumerate(s):
            if ch in last and last[ch] >= left:
                left = last[ch] + 1        # jump past the earlier copy
            last[ch] = right
            best = max(best, right - left + 1)
        return best

    longest_unique("abcabcbb")   # 3, "abc"
    longest_unique("abba")       # 2

The check \`last[ch] >= left\` matters: in \`"abba"\`, the second \`a\` was last seen at index 0, which
is already outside the window, so \`left\` must not jump back. Each index enters and leaves the
window at most once, so this is **O(n)**, and the dict holds at most one entry per distinct
character.

## When a window does not work

"Shrink while the sum is too big" assumes adding an element never makes the sum smaller. With
**negative numbers** that is false, and the window gives wrong answers; "subarray sum equals k"
with negatives needs prefix sums and a dict instead (the hashing unit).

## Edge cases to test

An empty list or string, a single element, \`k\` larger than the list, all-equal values, and
negative numbers.`,
    workedExample: `**Problem.** Given a string, return the length of its longest substring with no repeated
character. Trace \`longest_unique("pwwkew")\` to be sure the window logic is right, then state the cost.

1. **Brute force first.** Check every substring for uniqueness: O(n²) substrings, each checked in
   up to O(n) — O(n³). Say it, then improve it.
2. **The window.** Keep \`left\`, the start of the current valid window, and \`last\`, a dict of the
   most recent index of each character. Walk \`right\` across the string:

   | right | ch | last[ch] before | left after | window | best |
   |---|---|---|---|---|---|
   | 0 | p | — | 0 | p | 1 |
   | 1 | w | — | 0 | pw | 2 |
   | 2 | w | 1 (≥ 0) | 2 | w | 2 |
   | 3 | k | — | 2 | wk | 2 |
   | 4 | e | — | 2 | wke | 3 |
   | 5 | w | 2 (≥ 2) | 3 | kew | 3 |

   The answer is **3** ("wke" or "kew").
3. **The subtle case.** On \`"abba"\`, at the final \`a\` the dict says index 0, but \`left\` is already
   2. Without the \`last[ch] >= left\` check, \`left\` would move back to 1 and the code would report
   3 — the window "bba" has a repeat. With it, the answer is 2.
4. **Cost.** \`right\` moves n times and \`left\` only moves forward, so **O(n) time**. The dict holds
   one entry per distinct character: **O(min(n, alphabet)) space**.
5. **Edge cases.** The empty string gives 0 (the loop never runs); \`"aaaa"\` gives 1.`,
    mcqs: [
      mcq('What does pair_sum([1, 3, 4, 6, 9], 13) return, using the two-pointer version with 1-based positions?',
        [['(3, 5)', true], ['(2, 5)', false], ['(4, 4)', false], ['(-1, -1)', false]],
        '1 + 9 = 10 is too small, so lo moves up; 3 + 9 = 12 is still too small; 4 + 9 = 13 matches at indexes 2 and 4, reported 1-based as (3, 5).'),
      mcq('Why is max(sum(a[i:i + k]) for i in range(len(a) - k + 1)) slower than a sliding window?',
        [['Every window is sliced and summed: O(n · k)', true], ['max() sorts the generated sums first: O(n log n)', false], ['The generator is evaluated twice, doubling the work', false], ['range() builds the whole index list in memory first', false]],
        'Each a[i:i + k] copies k elements and sum adds them, for each of about n windows. A running sum changes by only two elements per step, giving O(n).'),
      mcq('In longest_unique, why does the code check last[ch] >= left before moving left?',
        [['An earlier copy of ch may already be outside the window', true], ['A dict raises KeyError when an index is compared to left', false], ['It keeps left from going past the right pointer', false], ['It makes the loop stop as soon as a repeat is found', false]],
        'left must only move forward. If the previous copy of ch sits before left, the window is still valid; jumping to it would wrongly shrink or move the window back, as "abba" shows.'),
    ],
    checkpoint: [
      ck('DSA_ARRAYS', 'What does this print? a = [1, 1, 2, 3, 3, 3]; w = 1; for r in range(1, len(a)): if a[r] != a[w - 1]: a[w] = a[r]; w += 1. Then print(w, a[:w])',
        [['3 [1, 2, 3]', true], ['6 [1, 1, 2, 3, 3, 3]', false], ['4 [1, 2, 3, 3]', false], ['3 [1, 1, 2]', false]],
        'w marks the end of the kept prefix. Only 2 and the first 3 differ from the last kept value, so w moves from 1 to 3 and the prefix is [1, 2, 3].'),
      ck('DSA_ARRAYS', 'What does max_window([2, -1, 3, -4, 5], 2) return, using the running-sum sliding window?',
        [['2', true], ['5', false], ['3', false], ['1', false]],
        'The windows of size 2 sum to 1, 2, -1 and 1. The running sum updates by adding the entering element and subtracting the leaving one, and the best is 2, from [-1, 3].'),
      ck('DSA_ARRAYS', 'Why does "shrink the window while its sum is over the target" fail when the list may hold negative numbers?',
        [['Adding an element can lower the sum, so shrinking is unsafe', true], ['Python cannot subtract a negative number from a running sum', false], ['Negative numbers make the window grow past the list length', false], ['The window must then be sorted before it can be scanned', false]],
        'The shrink rule assumes the sum only rises as the window grows. A negative element breaks that, so a window dropped as too big might have become valid later. Prefix sums with a dict handle negatives.'),
    ],
  },
  {
    unitCode: 'JT_PY_DSA_LINEAR_LINKED_LISTS',
    notes: `A singly linked list is a chain of nodes, each holding a value and a reference to the next
node. Python has **no built-in singly linked list** — \`list\` is a dynamic array, and
\`collections.deque\` is a doubly linked list of blocks you cannot reach into — so in an interview you
write the node class yourself.

    class Node:
        def __init__(self, val, next=None):
            self.val = val
            self.next = next

    def build(values):                  # helper: [1, 2, 3] -> 1 -> 2 -> 3
        dummy = tail = Node(0)
        for v in values:
            tail.next = Node(v)
            tail = tail.next
        return dummy.next

    def to_list(head):                  # helper: 1 -> 2 -> 3 -> [1, 2, 3]
        out = []
        while head:
            out.append(head.val)
            head = head.next
        return out

The list *is* its head reference. An empty list is \`head is None\`, and the last node's \`next\` is
\`None\`. Write \`build\` and \`to_list\` first in an interview: they let you test everything else.

## Insert and delete

    head = Node(5, head)                # insert at the front: O(1)

    def delete(head, x):                # delete the first node holding x
        dummy = Node(0, head)
        cur = dummy
        while cur.next and cur.next.val != x:
            cur = cur.next
        if cur.next:
            cur.next = cur.next.next    # unlink it; Python frees it when nothing refers to it
        return dummy.next

The **dummy node** in front of the head means deleting the head is not a special case: every real
node now has a predecessor. Without it, a loop that starts at \`head\` only ever looks at
\`cur.next\`, so it can never delete the head itself. Use a dummy whenever the head might change, and
always **return the new head** — the caller's variable does not update by itself.

Insert at the end is O(n) unless you keep a \`tail\` reference; finding the k-th node is O(k). That
is the trade against a Python \`list\`: O(1) insert and delete *where you already hold a node*, but
no O(1) indexing.

## The classic: reverse a linked list

    def reverse(head):
        prev, cur = None, head
        while cur:
            nxt = cur.next      # 1. remember the rest of the list
            cur.next = prev     # 2. point this node backwards
            prev = cur          # 3. advance prev
            cur = nxt           # 4. advance cur
        return prev             # the old tail is the new head

**O(n) time, O(1) space.** If you overwrite \`cur.next\` before saving it, the rest of the list is
lost. Trace it on \`1 -> 2 -> 3\`, on an empty list (returns \`None\`) and on one node (returns
itself).

Python lets you write the loop body as one tuple assignment, but **the order of the targets
matters**. The right-hand side is evaluated first, then the targets are assigned left to right:

    cur.next, prev, cur = prev, cur, cur.next      # correct: cur.next is set while cur is the old node
    prev, cur, cur.next = cur, cur.next, prev      # wrong: cur is reassigned before cur.next is set

In the wrong version, \`cur.next\` is assigned on the *new* \`cur\`, which unlinks the list and soon
raises \`AttributeError\` on \`None\`. If in doubt, use the four plain lines.

A recursive reversal is elegant, but it goes one frame per node, and Python stops at about 1000
frames: on a 5,000-node list it raises \`RecursionError\`. The iterative version has no such limit.

## Fast and slow pointers

Move \`slow\` one step and \`fast\` two steps per iteration.

    def middle(head):
        slow = fast = head
        while fast and fast.next:
            slow = slow.next
            fast = fast.next.next
        return slow             # for an even length, the second of the two middles

    def has_cycle(head):
        slow = fast = head
        while fast and fast.next:
            slow = slow.next
            fast = fast.next.next
            if slow is fast:    # the same node object, not equal values
                return True
        return False

In a cycle, the fast pointer gains one node per step on the slow one, so it must land on it
(Floyd's algorithm): **O(n) time, O(1) space**, against O(n) space for a set of visited nodes. The
loop condition checks \`fast\` **and** \`fast.next\`; dropping either gives
\`AttributeError: 'NoneType' object has no attribute 'next'\` on some lengths. Compare with **\`is\`**:
if \`Node\` defines \`__eq__\` by value, two different nodes holding 5 would compare equal with \`==\`.

## Merge two sorted lists

    def merge(a, b):
        dummy = tail = Node(0)
        while a and b:
            if a.val <= b.val:
                tail.next, a = a, a.next
            else:
                tail.next, b = b, b.next
            tail = tail.next
        tail.next = a or b      # attach whatever is left
        return dummy.next

The dummy again removes the "which list gives the head?" special case. O(n + m) time, O(1) extra
space, because the existing nodes are relinked, not copied.`,
    workedExample: `**Problem.** Remove the n-th node from the end of a singly linked list in one pass, and
return the head. For \`10 -> 20 -> 30 -> 40 -> 50\` and n = 2, the result is \`10 -> 20 -> 30 -> 50\`.

1. **The naive way.** Count the length L in one pass, then walk L - n steps and unlink. Correct,
   O(L) time, but two passes. The interviewer asks for one.
2. **The gap idea.** Put two pointers n + 1 nodes apart. When the leading one falls off the end,
   the trailing one sits just *before* the node to remove.
3. **Handle the head with a dummy.** If n equals the length, the head itself is removed. Starting
   both pointers at a dummy makes that an ordinary case.

    def remove_nth_from_end(head, n):
        dummy = Node(0, head)
        lead = trail = dummy
        for _ in range(n + 1):        # open a gap of n + 1 nodes
            lead = lead.next
        while lead:                   # move both until lead falls off the end
            lead = lead.next
            trail = trail.next
        trail.next = trail.next.next  # trail is just before the target
        return dummy.next

4. **Trace n = 2.** After the gap loop, \`lead\` is at 30 and \`trail\` at the dummy. They move
   together three times: \`lead\` reaches None, \`trail\` is at 30. Unlinking \`trail.next\` removes 40.
5. **Edge cases.** \`[10]\` with n = 1 returns an empty list (\`None\`); \`[10, 20]\` with n = 2
   removes the head and returns \`20\`. Both work only because of the dummy.
6. **Cost.** One pass: **O(L) time, O(1) space.**`,
    mcqs: [
      mcq('What does middle(build([1, 2, 3, 4])).val return, with slow moving one step and fast two while fast and fast.next?',
        [['3', true], ['2', false], ['4', false], ['1', false]],
        'slow moves to 2 then 3 while fast moves to 3 then None. For an even length this loop stops on the second of the two middle nodes, which holds 3.'),
      mcq('The Node class defines __eq__ to compare val. Why should the cycle check still test slow is fast?',
        [['== would match two different nodes that hold equal values', true], ['is is faster, but == would give exactly the same answers', false], ['== on Node objects raises TypeError inside a loop', false], ['is compares the val fields, while == compares next', false]],
        'A cycle means the very same node object is reached again, which is identity. With a value-based __eq__, a list like 5 -> 5 -> 5 would report a cycle that does not exist.'),
      mcq('A recursive reverse_list(head) is called on a 5,000-node list with Python default settings. What happens?',
        [['RecursionError, from one frame per node past ~1000', true], ['It works, since Python grows the stack as needed', false], ['It returns only the first 1000 nodes, reversed', false], ['MemoryError, since each frame copies the list', false]],
        'Each node adds one call frame and the default limit is about 1000, so Python raises RecursionError. The iterative reversal uses O(1) space and handles any length.'),
    ],
    checkpoint: [
      ck('DSA_LINKED_LIST', 'The reversal loop body is written as prev, cur, cur.next = cur, cur.next, prev. What happens on build([1, 2, 3])?',
        [['AttributeError, as cur.next is set on the new cur', true], ['It returns 3 -> 2 -> 1, the same as the four-line form', false], ['It returns 1 -> 2 -> 3 unchanged, as nothing is relinked', false], ['It loops forever, as a two-node cycle forms', false]],
        'The right side is evaluated first, then the targets are assigned left to right. cur is rebound before cur.next is set, so the wrong node is relinked, cur becomes None and None.next fails.'),
      ck('DSA_LINKED_LIST', 'A delete(head, x) has no dummy: cur = head; while cur.next and cur.next.val != x: cur = cur.next; then unlinks cur.next. What is to_list(delete(build([1, 2, 3]), 1))?',
        [['[1, 2, 3]', true], ['[2, 3]', false], ['[1, 3]', false], ['[]', false]],
        'The loop only ever inspects cur.next, so the head node itself is never compared with x. A dummy node before the head gives the head a predecessor and fixes it.'),
      ck('DSA_LINKED_LIST', 'A cycle check stores every visited node in a set instead of using fast and slow pointers. What does that cost?',
        [['O(n) extra memory; the time is O(n) either way', true], ['Nothing extra; a set of nodes is O(1) memory', false], ['O(n²) time, because each set lookup scans', false], ['O(log n) time, because the set is kept sorted', false]],
        'Set lookups are O(1) on average, so the time is still linear, but the set can hold every node. Floyd needs two references, O(1) space.'),
    ],
  },
  {
    unitCode: 'JT_PY_DSA_LINEAR_STACKS_QUEUES',
    notes: `A **stack** is last-in, first-out; a **queue** is first-in, first-out. Python has no separate
Stack class: a plain \`list\` is the stack, and \`collections.deque\` is the queue.

    stack = []
    stack.append('(')        # push: O(1) amortised
    top = stack[-1]          # peek: O(1); IndexError if empty
    stack.pop()              # pop:  O(1); IndexError: pop from empty list
    if not stack: ...        # empty check

    from collections import deque
    queue = deque()
    queue.append(1)          # enqueue at the right: O(1)
    queue.popleft()          # dequeue from the left: O(1)
    queue[0]                 # peek at the front: O(1)

Do **not** use a list as a queue: \`list.pop(0)\` shifts every element, so draining n items costs
O(n²). A \`deque\` is O(1) at both ends (it also has \`appendleft\`, \`pop\` and \`rotate\`), but indexing
into its middle is O(n). \`queue.Queue\` is a different tool: a thread-safe queue with locks, for
passing work between threads. It is slower and has no peek, so it is wrong for an algorithm.

Where Java returns \`null\` from \`peek\` or \`poll\` on an empty \`ArrayDeque\`, Python raises
\`IndexError\`. Check \`if stack:\` before you look.

A handy extra: \`deque(maxlen=3)\` keeps only the last three items appended, which is a ready-made
"most recent k" buffer.

## Classic 1: valid brackets

**Problem.** Is a string of \`()[]{}\` correctly matched and nested?

    def is_valid(s):
        pairs = {')': '(', ']': '[', '}': '{'}
        stack = []
        for c in s:
            if c in '([{':
                stack.append(c)
            elif not stack or stack.pop() != pairs[c]:
                return False
        return not stack

The \`not stack\` check comes first, so \`pop\` is never called on an empty list (\`or\` short-circuits).
The two edge cases people miss are a closer with nothing open (\`"]"\`) and openers left over at the
end (\`"(()"\`) — that is what \`return not stack\` catches. \`"([)]"\` fails at the \`)\`, because the
top of the stack is \`[\`. The empty string is valid. **O(n) time, O(n) space.**

## Classic 2: next greater element (a monotonic stack)

**Problem.** For each element, the first larger element to its right, or -1.

    def next_greater(a):
        res = [-1] * len(a)
        stack = []                         # indices whose answer is still unknown
        for i, x in enumerate(a):
            while stack and a[stack[-1]] < x:
                res[stack.pop()] = x       # x is the answer for every smaller one waiting
            stack.append(i)
        return res

    next_greater([2, 1, 5, 3])             # [5, 5, -1, -1]

The values of the waiting indices are **decreasing** from bottom to top — that is why it is called
a monotonic stack. Each index is pushed once and popped at most once, so it is **O(n)**, not O(n²),
even with the inner \`while\`. Store **indices**, not values: you need to know which slot of \`res\`
to fill. The same shape answers "how many days until a warmer temperature" — store the index and
write \`i - j\` instead of the value.

## Queues for simulation (and, later, breadth-first search)

A queue processes things in arrival order. A typical exercise is a **round-robin scheduler**: each
task runs for at most \`quantum\` units, then goes to the back of the queue if it is not finished.

    def round_robin(tasks, quantum):
        queue = deque(tasks)               # (name, time_left) pairs
        clock, done = 0, []
        while queue:
            name, left = queue.popleft()
            run = min(quantum, left)
            clock += run
            if left > run:
                queue.append((name, left - run))
            else:
                done.append((name, clock))
        return done

    round_robin([("A", 5), ("B", 2), ("C", 4)], 2)
    # [('B', 4), ('C', 10), ('A', 11)]

Each step is a \`popleft\`, some work and maybe an \`append\` — all O(1). The same loop, with "the
neighbours of this node" in place of "the task again", is breadth-first search, which the trees and
graphs units build on.

## Edge cases to test

An empty input (the loop never runs), a single element, all-equal values (\`next_greater([5, 5, 5])\`
is \`[-1, -1, -1]\` because \`<\` is strict), and a stack or queue that is empty when you peek.`,
    workedExample: `**Problem.** For a list of daily temperatures, return for each day how many days you must
wait for a warmer one, or 0 if none comes. For \`[30, 31, 29, 28, 33]\` the answer is
\`[1, 3, 2, 1, 0]\`.

1. **Brute force.** For each day, scan forward until a warmer day: O(n²) in the worst case (a
   falling run of temperatures). Say it, then improve.
2. **Spot the pattern.** "The next larger value to the right" is the next-greater-element problem,
   so a monotonic stack of **indices** of days still waiting fits. The answer is a distance, so
   store indices and write \`i - j\`.

    def daily_wait(temps):
        res = [0] * len(temps)
        stack = []                              # indices of days still waiting
        for i, t in enumerate(temps):
            while stack and temps[stack[-1]] < t:
                j = stack.pop()
                res[j] = i - j                  # day j waited i - j days
            stack.append(i)
        return res

3. **Trace.** Day 0 (30) waits. Day 1 (31) pops day 0: \`res[0] = 1\`. Days 2 (29) and 3 (28) wait,
   so the stack holds indices 1, 2, 3 with temperatures 31, 29, 28 — decreasing. Day 4 (33) pops 3,
   2 and 1: \`res[3] = 1\`, \`res[2] = 2\`, \`res[1] = 3\`. Day 4 stays with 0.
4. **Cost.** Each index is pushed once and popped at most once: **O(n) time, O(n) space** for the
   stack in the worst case (a falling run).
5. **Edge cases.** An empty list returns \`[]\`; equal temperatures do not count as warmer because
   the comparison is a strict \`<\`, so \`[30, 30]\` gives \`[0, 0]\`.`,
    mcqs: [
      mcq('What does this print? s = []; s.append(1); s.append(2); s.pop(); s.append(3); print(s[-1], len(s))',
        [['3 2', true], ['2 2', false], ['3 3', false], ['1 2', false]],
        'The list holds [1, 2], pop removes the last item 2, then 3 is appended, giving [1, 3]. s[-1] is the top of the stack, 3, and the length is 2.'),
      mcq('Why is collections.deque, not a list, the usual choice for a FIFO queue in a Python algorithm?',
        [['deque.popleft() is O(1); list.pop(0) shifts the rest, O(n)', true], ['A list cannot hold tuples, but a deque can store any object', false], ['deque keeps its items sorted, so the smallest comes out first', false], ['A list raises an error once it holds over 1000 items', false]],
        'A list is an array, so removing its first slot moves every other element. A deque is built from linked blocks and removes from either end in constant time.'),
      mcq('Using is_valid with a stack and a closer-to-opener dict, at which character does "([)]" first fail?',
        [['At ")", because the top of the stack is "["', true], ['At "]", because the stack is already empty there', false], ['At the end, as one opener is still left on the stack', false], ['It never fails; the string counts as valid here', false]],
        'After "(" and "[" are pushed, ")" pops "[", which is not its opener "(", so the function returns False there. Brackets must close in reverse order of opening.'),
    ],
    checkpoint: [
      ck('DSA_STACK', 'What does next_greater([3, 8, 4, 1, 9]) return, using the monotonic stack of indices?',
        [['[8, 9, 9, 9, -1]', true], ['[8, -1, 9, 9, -1]', false], ['[8, 9, 1, 9, -1]', false], ['[-1, 9, 9, 9, -1]', false]],
        '8 resolves 3. 4 and 1 wait above 8 on the stack; 9 then pops 1, 4 and 8, giving each of them 9. Nothing comes after 9, so it keeps -1.'),
      ck('DSA_STACK', 'What does this print? from collections import deque; d = deque([1, 2, 3]); d.appendleft(0); d.pop(); d.rotate(1); print(list(d))',
        [['[2, 0, 1]', true], ['[0, 1, 2]', false], ['[1, 2, 0]', false], ['[3, 0, 1]', false]],
        'appendleft gives [0, 1, 2, 3]; pop removes 3 from the right, leaving [0, 1, 2]; rotate(1) moves the last item to the front, giving [2, 0, 1].'),
      ck('DSA_STACK', 'A bracket checker writes elif stack.pop() != pairs[c]: return False, without the not stack check. What happens on "]"?',
        [['IndexError: pop from empty list', true], ['It returns False, as an empty pop gives None', false], ['It returns True, as the stack ends empty', false], ['KeyError, as "]" is missing from pairs', false]],
        'Unlike Java\'s poll, list.pop() on an empty list raises IndexError. Checking not stack first, joined by or, short-circuits before pop is ever called.'),
    ],
  },
];
