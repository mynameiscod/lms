/**
 * T2_DS_LINEAR and T2_DS_KEYED — sixteen units. Year 2, mandatory backbone.
 *
 * ── THE LINE THESE TOPICS HOLD ────────────────────────────────────────────────────────────
 *
 * Data structures are usually taught as implementations to reproduce: write a linked list, write a
 * stack. A student finishes able to code a structure nobody will ask them to code, and still unable
 * to say which one a problem wants. Python already has all of them.
 *
 * So the emphasis here is on CHOOSING and on COST. Each unit answers: what does this make cheap,
 * what does it make expensive, and which problems are shaped like it? Implementations appear where
 * building one teaches something the library hides — a linked list, a hash collision — and never as
 * the point of the unit.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const DATA_STRUCTURE_BUNDLES: PilotBundle[] = [
  /* ── T2_DS_LINEAR ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'T2_DS_LINEAR_DYNAMIC_ARRAYS',
    notes: `A Python list is a **dynamic array**: a block of memory holding items in order, which
quietly moves itself somewhere bigger when it runs out of room.

**What that makes cheap:**

    nums[5]              # instant, whatever the size — it is an address calculation
    nums.append(x)       # almost always instant
    nums[-1]             # instant
    len(nums)            # instant, the length is stored

**What it makes expensive:**

    nums.insert(0, x)    # every item shifts right
    nums.pop(0)          # every item shifts left
    x in nums            # looks at each item until it finds one

The pattern: **anything at the end is cheap, anything at the front moves everything.**

**Why append is "almost always" instant.** When the block fills, Python allocates a larger one and
copies everything across. That one append is slow, but the block grows by a proportion rather than
by one, so the copies get rarer as the list grows. Averaged out, an append costs a constant amount.
That average is called *amortised*, and it is why nobody worries about appending in a loop.

**The cost table worth memorising:**

| Operation | Cost | Why |
|---|---|---|
| \`lst[i]\` | O(1) | Address arithmetic |
| \`lst.append(x)\` | O(1) amortised | Occasional copy, rarely |
| \`lst.insert(0, x)\` | O(n) | Shifts everything |
| \`lst.pop()\` | O(1) | Nothing moves |
| \`lst.pop(0)\` | O(n) | Shifts everything |
| \`x in lst\` | O(n) | Checks one by one |
| \`lst.sort()\` | O(n log n) | See the algorithms topic |

**The mistake this unit exists to prevent:**

    while queue:
        item = queue.pop(0)     # O(n) every time — O(n²) for the loop

For a queue, use \`collections.deque\`, where \`popleft()\` is O(1). Same idea, right structure.

**Slicing copies.** \`lst[:]\` and \`lst[1:]\` build new lists, so slicing inside a loop is a hidden
O(n²). It is also the easiest way to take a safe copy, which is what you want when handing a list
to somebody else.`,
    mcqs: [
      mcq('Why is `lst.pop(0)` expensive while `lst.pop()` is cheap?',
        [['Removing from the front shifts every other item', true],
          ['pop(0) searches the list for the first item', false],
          ['pop() is implemented in C and pop(0) is not', false],
          ['pop(0) has to recalculate the list length', false]],
        'A dynamic array keeps items adjacent, so removing from the front moves everything after it.'),
      mcq('`append` is called O(1) amortised because:',
        [['The occasional resize is rare enough to average out', true],
          ['Python reserves unlimited space in advance', false],
          ['Appending never needs more memory', false],
          ['The cost is paid when the list is created', false]],
        'The block grows by a proportion, so copies get rarer as the list gets bigger.'),
      mcq('A loop doing `queue.pop(0)` on a list of 10,000 items is:',
        [['O(n²) overall, and should use a deque', true],
          ['O(n) overall, which is fine', false],
          ['O(log n) because the list shrinks', false],
          ['O(1) because pop is a built-in', false]],
        'Each pop shifts the rest; deque.popleft() is constant.'),
      mcq('What does `lst[1:]` do?',
        [['Builds a new list, copying the items', true],
          ['Returns a view onto the original list', false],
          ['Removes the first item from the list', false],
          ['Returns an iterator over the items', false]],
        'Which is why slicing inside a loop is a hidden quadratic cost.'),
    ],
    checkpoint: [
      mcq('Which operation on a Python list costs the most as it grows?',
        [['Inserting at the front', true],
          ['Reading an item by index', false],
          ['Appending at the end', false],
          ['Reading the length', false]],
        'Front operations shift every item; the others are constant.'),
      mcq('You need to repeatedly take items from the front. The right structure is:',
        [['A deque', true], ['A list', false], ['A tuple', false], ['A set', false]],
        'deque.popleft() is O(1); list.pop(0) is O(n) every time.'),
    ],
  },

  {
    unitCode: 'T2_DS_LINEAR_STRINGS',
    notes: `A string is a sequence of characters that **cannot be changed**. Every "modification"
builds a new string.

    s = "hello"
    s[0] = "H"          # TypeError: str does not support item assignment
    s = "H" + s[1:]     # a new string; the old one is untouched

**Why immutability is a feature:** a string can be a dictionary key, can be shared without
defensive copies, and can be cached. The cost is that building one in a loop is quadratic:

    # Slow: a new string every time, copying everything so far
    out = ""
    for word in words:
        out += word + " "

    # Fast: collect, then join once
    out = " ".join(words)

\`join\` walks the list once, works out the final size, and copies each piece in. One allocation
instead of thousands.

**The operations worth knowing, and what each costs:**

| Operation | Cost |
|---|---|
| \`s[i]\` | O(1) |
| \`len(s)\` | O(1) |
| \`s + t\` | O(n + m) — builds a new string |
| \`sub in s\` | O(n × m) worst case |
| \`s.split()\`, \`s.strip()\`, \`s.lower()\` | O(n), each returning a new string |
| \`"".join(parts)\` | O(total length) |

**Slicing is copying**, exactly as with lists: \`s[1:]\` in a loop over a long string is quadratic.
When you need to walk a string, use an index rather than repeatedly slicing it.

**Characters are not bytes.** \`len("café")\` is 4 characters; encoded as UTF-8 it is 5 bytes.
Indexing works on characters, which is usually what you want; anything that writes to a file or a
socket works on bytes, and that is where encodings have to be explicit.

**Comparisons worth knowing:**

    "Apple" == "apple"           # False — case matters
    "apple" < "banana"           # True  — dictionary order, by code point
    "10" < "9"                   # True  — string order, not numeric order

The last one causes real bugs when numbers arrive as text and are sorted without conversion.`,
    mcqs: [
      mcq('Why is building a string with `+=` in a loop slow?',
        [['Each step copies everything built so far into a new string', true],
          ['Python checks the encoding on every concatenation', false],
          ['The interpreter cannot optimise loops over strings', false],
          ['Strings are stored as linked lists of characters', false]],
        'Strings are immutable, so += allocates and copies; join does it once.'),
      mcq('`"10" < "9"` evaluates to True because:',
        [['Strings compare character by character, not numerically', true],
          ['Shorter strings always sort before longer ones', false],
          ['Python converts both sides to integers first', false],
          ['Digits sort in reverse order inside strings', false]],
        'Character "1" comes before "9", so the comparison ends there.'),
      mcq('What does `len("café")` return, and why?',
        [['4, because len counts characters rather than bytes', true],
          ['5, because the accented character takes two bytes', false],
          ['4, because Python strips accents when measuring', false],
          ['5, because a terminator is counted as well', false]],
        'Bytes matter when encoding for a file or socket, not when indexing.'),
      mcq('Walking a long string by repeatedly slicing `s = s[1:]` is:',
        [['Quadratic, because each slice copies the remainder', true],
          ['Linear, because slicing returns a view', false],
          ['Constant, because strings share memory', false],
          ['Illegal, because strings are immutable', false]],
        'Use an index instead of rebuilding the string each step.'),
    ],
    checkpoint: [
      mcq('The right way to build one string from a list of words is:',
        [['" ".join(words)', true],
          ['A loop using += on a string', false],
          ['A loop using append on a string', false],
          ['str(words) with the brackets removed', false]],
        'join allocates once; += allocates on every iteration.'),
      mcq('Strings being immutable means they can:',
        [['Be used as dictionary keys', true],
          ['Be modified in place efficiently', false],
          ['Grow without copying their contents', false],
          ['Be compared faster than numbers', false]],
        'A key must not change after it is hashed, which immutability guarantees.'),
    ],
  },

  {
    unitCode: 'T2_DS_LINEAR_STACKS',
    notes: `A stack is **last in, first out**. You add to the top and take from the top, and that is
all it lets you do — which is exactly why it is useful.

    stack = []
    stack.append(x)      # push
    top = stack.pop()    # pop
    stack[-1]            # peek, without removing

A Python list is already a stack: append and pop are both O(1) at the end.

**The shape of a stack problem:** *something opened, and the most recent one must close first.*

**Matching brackets** — the classic, and worth writing once:

    def balanced(text):
        pairs = {")": "(", "]": "[", "}": "{"}
        stack = []
        for ch in text:
            if ch in "([{":
                stack.append(ch)
            elif ch in pairs:
                if not stack or stack.pop() != pairs[ch]:
                    return False
        return not stack

Note the two failure cases: a closing bracket with nothing open, and something left open at the
end. Forgetting the second is the usual bug.

**Where stacks already surround you:**

- **The call stack.** Each function call pushes a frame; returning pops it. A traceback is that
  stack printed. Infinite recursion is it overflowing.
- **Undo.** Each action pushed; undo pops the most recent.
- **Back buttons**, in a browser or an app.
- **Expression evaluation**, which is why compilers are full of them.
- **Depth-first search**, where the stack holds where to return to.

**Recursion is a stack you did not write.** Any recursive walk can be rewritten with an explicit
stack, and that is the standard fix when recursion goes too deep.

**When it is the wrong structure:** when you need the *oldest* item (that is a queue), when you
need arbitrary access (that is a list or a map), or when order does not matter at all (a set).`,
    mcqs: [
      mcq('A stack gives you:',
        [['The most recently added item first', true],
          ['The oldest added item first', false],
          ['Items in sorted order', false],
          ['Any item by its index', false]],
        'Last in, first out — which is what makes it match "most recent must close first" problems.'),
      mcq('In the bracket matcher, what does a non-empty stack at the end mean?',
        [['Something was opened and never closed', true],
          ['A closing bracket appeared with nothing open', false],
          ['The brackets were correctly balanced', false],
          ['The input contained no brackets at all', false]],
        'Forgetting this check is the usual bug in a first attempt.'),
      mcq('A traceback printed on a crash is:',
        [['The call stack at the moment of the error', true],
          ['A queue of functions waiting to run', false],
          ['The list of imported modules', false],
          ['A log of every line executed', false]],
        'Each call pushes a frame; the traceback prints them from the error outwards.'),
      mcq('Deep recursion overflowing the stack is usually fixed by:',
        [['Rewriting it with an explicit stack', true],
          ['Adding more base cases to the function', false],
          ['Converting the function to a generator', false],
          ['Sorting the input before recursing', false]],
        'The explicit version uses heap memory instead of the call stack.'),
    ],
    checkpoint: [
      mcq('Which problem is shaped like a stack?',
        [['Undo in an editor', true],
          ['Serving customers in arrival order', false],
          ['Finding the highest score in a list', false],
          ['Counting how often each word appears', false]],
        'Undo removes the most recent action, which is exactly last in, first out.'),
      mcq('Push and pop on a Python list at the end cost:',
        [['O(1) each', true], ['O(n) each', false], ['O(log n) each', false], ['O(n) for push only', false]],
        'Operations at the end of a dynamic array move nothing.'),
    ],
  },

  {
    unitCode: 'T2_DS_LINEAR_QUEUES',
    notes: `A queue is **first in, first out** — the fairest structure there is, and the one most
real systems are built on.

    from collections import deque

    queue = deque()
    queue.append(x)        # join the back
    first = queue.popleft()  # leave from the front — O(1)

**Use a deque, not a list.** \`list.pop(0)\` shifts every remaining item, turning a loop over a
queue into a quadratic one. A deque is built for both ends.

**The shape of a queue problem:** *things are served in the order they arrived*, or *explore what
is nearest before what is further away*.

**Breadth-first search** is the important one, and it is a queue with a loop around it:

    def shortest_path_length(graph, start, goal):
        seen = {start}
        queue = deque([(start, 0)])
        while queue:
            node, distance = queue.popleft()
            if node == goal:
                return distance
            for neighbour in graph[node]:
                if neighbour not in seen:
                    seen.add(neighbour)
                    queue.append((neighbour, distance + 1))
        return None

Because the queue serves nearer nodes first, the first time you reach the goal is by the shortest
route. Swap the queue for a stack and it becomes depth-first, and that guarantee disappears.

**\`seen\` must be added to when you enqueue, not when you dequeue.** Otherwise the same node is
added several times before it is first processed — a bug that only shows up on bigger graphs.

**Queues in real systems:** print jobs, request handling, background tasks, message brokers,
rate limiting. Most systems that must not lose work and must be fair have a queue at the centre.

**Priority queues** are the variation worth knowing about: items come out by priority rather than
arrival, using \`heapq\`. Hospital triage, not a bank counter.`,
    mcqs: [
      mcq('Why use `deque` rather than a list for a queue?',
        [['popleft is O(1) while list.pop(0) is O(n)', true],
          ['A deque can hold more items than a list', false],
          ['A list cannot remove from the front at all', false],
          ['A deque keeps its items sorted automatically', false]],
        'Both ends are cheap on a deque; a list is only cheap at the end.'),
      mcq('In breadth-first search, nodes should be marked as seen:',
        [['When they are added to the queue', true],
          ['When they are taken off the queue', false],
          ['After all their neighbours are processed', false],
          ['Only when the goal is found', false]],
        'Marking on dequeue lets the same node be queued several times first.'),
      mcq('Swapping the queue in BFS for a stack gives you:',
        [['Depth-first search, losing the shortest-path guarantee', true],
          ['The same traversal in a different order', false],
          ['A faster shortest-path algorithm', false],
          ['An infinite loop on any cyclic graph', false]],
        'The order of exploration is exactly what BFS\'s guarantee rests on.'),
      mcq('Which situation wants a priority queue rather than a plain queue?',
        [['Hospital triage, where the most urgent is seen first', true],
          ['A printer serving jobs in the order received', false],
          ['A background worker taking tasks as they arrive', false],
          ['A checkout line in a shop', false]],
        'Priority replaces arrival order; heapq is the tool.'),
    ],
    checkpoint: [
      mcq('The first time BFS reaches the goal, the path length found is:',
        [['The shortest, because nearer nodes are served first', true],
          ['Any valid path, not necessarily the shortest', false],
          ['The longest possible path to the goal', false],
          ['Shortest only if the graph has no cycles', false]],
        'That guarantee comes from the queue and disappears with a stack.'),
      mcq('A queue serves:',
        [['The oldest waiting item first', true],
          ['The most recently added item first', false],
          ['The smallest item first', false],
          ['Items in random order', false]],
        'First in, first out — the fairness property.'),
    ],
  },

  {
    unitCode: 'T2_DS_LINEAR_LINKED_LISTS',
    notes: `A linked list stores each item in its own node, with a pointer to the next. Nothing is
adjacent in memory, and that single difference changes every cost.

    class Node:
        def __init__(self, value, next=None):
            self.value = value
            self.next = next

    # 1 -> 2 -> 3
    head = Node(1, Node(2, Node(3)))

**What it makes cheap:** inserting or removing at a position you already hold, by rewiring two
pointers. Nothing shifts.

**What it makes expensive:** reaching position *n*. There is no arithmetic that finds it — you walk
from the head, one node at a time.

| | Dynamic array | Linked list |
|---|---|---|
| \`x[i]\` | O(1) | O(n) |
| Insert at front | O(n) | O(1) |
| Insert after a node you hold | O(n) | O(1) |
| Memory per item | Just the item | Item plus a pointer |
| Cache behaviour | Excellent — adjacent | Poor — scattered |

**Why you rarely use one in Python.** A list gives O(1) indexing, and \`deque\` gives O(1) at both
ends — which covers nearly every case a linked list is taught for. The exceptions are real but
specific: LRU caches, some allocators, and a few structures that splice lists together.

**Why it is still worth understanding.** Linked structures are everywhere underneath: file system
blocks, undo chains, adjacency lists, and the \`next\` pointer in a hash-table bucket. And the
interview question "reverse a linked list" is really "can you hold three pointers in your head".

    def reverse(head):
        previous = None
        while head:
            head.next, previous, head = previous, head, head.next
        return previous

**The bugs this structure attracts:** losing the rest of the list by reassigning \`next\` before
saving it, and forgetting that an empty list is \`None\` rather than an object.`,
    mcqs: [
      mcq('Why is reaching the tenth item of a linked list O(n)?',
        [['You must walk from the head, node by node', true],
          ['Each node has to be unpacked from memory', false],
          ['Python has no pointer arithmetic at all', false],
          ['The list must be sorted before indexing', false]],
        'Nothing is adjacent, so there is no address to calculate.'),
      mcq('A linked list beats a dynamic array when you:',
        [['Insert repeatedly at a position you already hold', true],
          ['Read items by index in a loop', false],
          ['Need the items stored compactly in memory', false],
          ['Need to sort the items frequently', false]],
        'Rewiring two pointers moves nothing; an array shifts everything after.'),
      mcq('Why do arrays usually beat linked lists in practice even when costs look equal?',
        [['Adjacent memory is far friendlier to the CPU cache', true],
          ['Arrays are implemented in C and lists are not', false],
          ['Arrays use less memory per item in every case', false],
          ['Linked lists cannot store objects, only numbers', false]],
        'Scattered nodes mean a cache miss per step; adjacency is why arrays win.'),
      mcq('The classic bug when reversing a linked list is:',
        [['Reassigning next before saving the rest of the list', true],
          ['Returning the old head instead of the new one', false],
          ['Forgetting to count the nodes first', false],
          ['Using a loop where recursion is required', false]],
        'Save the next node before rewiring, or the remainder is lost.'),
    ],
    checkpoint: [
      mcq('In Python, the structure to reach for when you need cheap operations at both ends is:',
        [['deque', true], ['A linked list you write yourself', false], ['A tuple', false], ['A set', false]],
        'deque covers the common case a linked list is usually taught for.'),
      mcq('An empty linked list is represented by:',
        [['None, rather than an object', true],
          ['A node with a value of zero', false],
          ['An empty list object', false],
          ['A node whose next points to itself', false]],
        'Which is why every walk must handle the empty case first.'),
    ],
  },

  {
    unitCode: 'T2_DS_LINEAR_DEBUGGING',
    notes: `Bugs in linear structures are rarely mysterious once you know their five shapes.

**1. Off by one at the edges.** The first item, the last item, and the empty case. Most loops that
"nearly work" fail on exactly one of those:

    for i in range(len(items) - 1):    # never touches the last item
        ...

Test with zero items, one item, and two.

**2. Modifying a list while iterating it.**

    for item in items:
        if item.expired:
            items.remove(item)     # skips the item after each removal

The iterator keeps its index while the list shrinks under it. Build a new list instead:
\`items = [i for i in items if not i.expired]\`.

**3. Aliasing.** Two names for one list.

    b = a          # the same list
    b.append(1)    # a changed too
    b = a[:]       # a copy

The symptom is a list changing when nothing touched it.

**4. Quadratic loops hiding in plain sight.** \`pop(0)\`, \`insert(0, x)\`, \`x in lst\` and slicing
inside a loop each turn an O(n) loop into O(n²). It works on ten items and hangs on a hundred
thousand — so measure with realistic sizes.

**5. The empty case.** \`lst[0]\`, \`max(lst)\`, \`lst.pop()\` all raise on an empty list. Ask what
should happen with nothing, before the code decides for you.

**How to look:** print the length and the first and last items at the top of the loop rather than
the whole structure. And when a loop is misbehaving, print the index with the item — half of these
bugs are visible the moment the index is on screen.`,
    mcqs: [
      mcq('Removing items from a list while iterating over it causes:',
        [['Items being skipped as the list shrinks', true],
          ['An immediate exception from Python', false],
          ['The loop to run twice over each item', false],
          ['The removals to be silently ignored', false]],
        'Build a new list with a comprehension instead.'),
      mcq('`b = a` for a list means:',
        [['Both names refer to the same list', true],
          ['b is a copy that can be changed safely', false],
          ['b is a read-only view of a', false],
          ['b is a copy only until a changes', false]],
        'Use a[:] or list(a) when a real copy is wanted.'),
      mcq('Code that works on ten items and hangs on a hundred thousand suggests:',
        [['A quadratic loop such as pop(0) or `in`', true],
          ['A memory leak in the interpreter', false],
          ['An infinite loop that never triggers on small inputs', false],
          ['A missing base case in a recursion', false]],
        'Test with realistic sizes; the shape of the cost only shows up there.'),
      mcq('Which three cases catch most linear-structure bugs?',
        [['Empty, one item, and two items', true],
          ['Sorted, reversed, and random order', false],
          ['Small, medium and very large inputs', false],
          ['Numbers, strings and objects', false]],
        'The edges are where off-by-one errors live.'),
    ],
    checkpoint: [
      mcq('A list changes value although nothing in the current function touched it. The likely cause is:',
        [['Another name refers to the same list', true],
          ['The list was garbage collected and rebuilt', false],
          ['Python cached an older version of it', false],
          ['The list was sorted in place elsewhere', false]],
        'Aliasing: assignment shares the object rather than copying it.'),
      mcq('Before indexing `lst[0]`, the case to handle is:',
        [['The list being empty', true],
          ['The list being unsorted', false],
          ['The list holding mixed types', false],
          ['The list being very large', false]],
        'Indexing an empty list raises; decide what "nothing" should mean first.'),
    ],
  },

  {
    unitCode: 'T2_DS_LINEAR_PRACTICE',
    notes: `No new ideas. Work problems until the structure suggests itself before you start coding.

**For each of these, name the structure first, then write it:**

1. **Balanced brackets** — including the nothing-open and something-left-open cases.
2. **Undo/redo** — two stacks, and redo cleared when a new action is taken.
3. **Recent items** — keep the last five viewed, most recent first, no duplicates.
4. **Print queue** — jobs served in order, with the ability to cancel one that has not run.
5. **Reverse a linked list** — then say what it cost and what it changed.
6. **Palindrome check** — with and without extra memory.
7. **Merge two sorted lists** into one sorted list, in one pass.
8. **Sliding window maximum** over a list of numbers — with a deque, not a nested loop.

**For every solution, write down:**

| Question | Your answer |
|---|---|
| Which structure, and why | |
| Cost in time | |
| Cost in extra memory | |
| The three edge cases you tested | |

**Then break each one deliberately:** run it on an empty input, on one item, and on a hundred
thousand items. The third finds the quadratic loops that a small test never will.

**The slip this set exposes most:** reaching for a list because it is familiar, when the problem is
plainly a queue — and paying O(n) on every step for the rest of the program's life.`,
    mcqs: [
      mcq('Undo and redo are best modelled with:',
        [['Two stacks, with redo cleared on a new action', true],
          ['A single queue of actions', false],
          ['A list sorted by timestamp', false],
          ['A set of performed actions', false]],
        'Undo pops the most recent; a new action invalidates the redo stack.'),
      mcq('"Keep the five most recent items, no duplicates" wants:',
        [['A deque with a maximum length, plus a membership check', true],
          ['A list that is sorted after every insertion', false],
          ['A set, which keeps insertion order', false],
          ['A stack, with the oldest popped each time', false]],
        'deque(maxlen=5) drops the oldest automatically; the check keeps it unique.'),
      mcq('Merging two sorted lists in one pass costs:',
        [['O(n + m)', true], ['O(n × m)', false], ['O(n log n)', false], ['O(1)', false]],
        'Each item is looked at once, which is the whole point of the one-pass version.'),
      mcq('A sliding-window maximum written with a nested loop is:',
        [['O(n × k), and a deque makes it O(n)', true],
          ['Already optimal for this problem', false],
          ['O(n log n) because of the sorting', false],
          ['Incorrect, rather than merely slow', false]],
        'The deque keeps candidates in order so each item enters and leaves once.'),
      mcq('Which test most reliably exposes a hidden quadratic loop?',
        [['Running it on a very large input', true],
          ['Running it on an empty input', false],
          ['Running it twice in the same process', false],
          ['Running it on sorted input', false]],
        'Cost shape only becomes visible at scale.'),
    ],
    checkpoint: [
      mcq('Choosing a structure should happen:',
        [['Before writing the solution, from the problem\'s shape', true],
          ['After the first version works, as an optimisation', false],
          ['Only when performance becomes a problem', false],
          ['Based on which one you know best', false]],
        'The structure is the decision; the code follows from it.'),
      mcq('The cost of a solution should be stated in terms of:',
        [['Time and extra memory', true],
          ['Lines of code and function count', false],
          ['Seconds measured on your laptop', false],
          ['The number of loops it contains', false]],
        'Both matter, and a faster solution that uses far more memory is a trade, not a win.'),
    ],
  },

  {
    unitCode: 'T2_DS_LINEAR_MINI_PROJECT',
    notes: `One small system where the structure choice is the design, and the wrong choice is
visibly slow.

**Why it is judged on choice rather than code.** Any of these can be written with lists and nested
loops, and will work on the sample data. The project asks for something harder: a solution that
still works when the data is a hundred thousand items, and a written justification of why each
structure was chosen.

**What "justified" means here:** for each structure, what it made cheap, what it made expensive,
and what you would have paid with the obvious alternative.

**Build it in this order:**

1. **Write the operations down** — every action the system must support, with how often each happens.
2. **Choose a structure per operation**, and note the conflicts (fast lookup versus fast ordering).
3. **Build the simple version**, correct before fast.
4. **Measure with a large input**, and record the numbers.
5. **Fix the slow operation**, and record the numbers again.

The brief, requirements and deliverables are in the assignment attached to this unit.`,
    assignment: {
      title: 'Mini Project — Choosing the Right Structure',
      description: 'Build a small system whose operations have conflicting costs, choose structures deliberately, and prove the choice with measurements on a large input.',
      instructions: `**The brief**

Build ONE of these, or something of comparable scope:

- **Browser history** — visit, back, forward, and "last ten sites visited", with no duplicates in
  the recent list.
- **Support ticket queue** — tickets served in arrival order, with cancellation by id, and
  "tickets waiting" answered instantly.
- **Text editor buffer** — insert, delete, undo, redo, and jump to a line.

**Requirements**

1. **At least four operations**, one of which is naturally expensive with the obvious structure.
2. **A written cost table** before coding: each operation, expected frequency, chosen structure,
   and its cost.
3. **A working implementation** that handles empty, single-item and large inputs.
4. **A measurement**: time each operation over at least 100,000 items, recorded as a table.
5. **One deliberate fix**: identify the slow operation, change the structure, and measure again.
6. **Tests** covering every operation, including the empty case and the largest case.

**What to submit**

1. Source files and tests.
2. The **cost table**, as written before implementation:

   | Operation | How often | Structure | Expected cost |
   |---|---|---|---|

3. **Measurements before and after** the fix, with the real numbers.
4. A **short write-up** (250–350 words): which two costs conflicted and how you resolved it; what
   the naive version cost; one structure you considered and rejected, with the reason.

**Constraints**

- Standard library only.
- No operation may be O(n) if the structure chart shows it need not be.
- The measurement must be real output, not an estimate.

**Where the marks are.** The measurements and the justification. A simple system with honest
numbers and a clear explanation scores above a larger one asserted to be efficient.`,
      rubric: [
        {
          criterion: 'Choice and justification',
          description: 'Cost table written before coding; each structure justified by what it makes cheap and expensive; the conflict between operations identified.',
          maxPoints: 30,
        },
        {
          criterion: 'Implementation',
          description: 'Every operation correct, including empty and single-item cases; no accidental quadratic loops; standard library used idiomatically.',
          maxPoints: 25,
        },
        {
          criterion: 'Measurement',
          description: 'Real timings over a large input, before and after the deliberate fix, presented as a table.',
          maxPoints: 25,
        },
        {
          criterion: 'Tests',
          description: 'Every operation tested, including edge cases and the large input.',
          maxPoints: 10,
        },
        {
          criterion: 'Write-up',
          description: 'Explains the conflict, the cost of the naive version, and a rejected alternative with its reason.',
          maxPoints: 10,
        },
      ],
      totalPoints: 100,
    },
  },

  /* ── T2_DS_KEYED ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'T2_DS_KEYED_HASH_MAPS',
    notes: `A dictionary turns a key into a **place**, so finding something takes the same time
whether there are ten items or ten million.

    ages = {"asha": 19, "ravi": 20}
    ages["asha"]          # O(1) — no searching
    "asha" in ages        # O(1)
    ages["meera"] = 21    # O(1)

Compare with a list of pairs, where every lookup walks the list. This is the single biggest
practical speed-up available to a second-year programmer.

**How it works, in one paragraph.** A hash function turns the key into a number, and the number
decides which slot to use. Two keys can land on the same slot — a **collision** — so each slot
holds a small list, and lookups compare within it. As long as collisions stay rare, lookup is
effectively constant. Python grows the table when it fills, rehashing everything, which is why
individual inserts are occasionally slower.

**Why keys must be immutable.** The slot was chosen from the key's value. Change the key and it no
longer hashes to where it is stored:

    d = {(1, 2): "point"}        # tuple: fine, immutable
    d = {[1, 2]: "point"}        # TypeError: unhashable type: 'list'

**The patterns worth having at your fingertips:**

    from collections import Counter, defaultdict

    Counter(words)                       # how many of each
    defaultdict(list)                    # group things by a key
    {row["id"]: row for row in rows}     # index by id, then look up

**Counting and grouping is where dictionaries earn their keep:**

    # Slow: O(n × m)
    for word in words:
        count = sum(1 for w in words if w == word)

    # Fast: O(n)
    counts = Counter(words)

**What a dictionary does not give you:** order by value (sort it), a range query ("all keys between
x and y" — that wants a tree), or duplicate keys (a key holds one value; use a list as the value).

**Memory is the trade.** A dictionary carries empty slots by design, so it uses more memory than a
list of the same data. Almost always worth it.`,
    mcqs: [
      mcq('Why is dictionary lookup roughly constant regardless of size?',
        [['The key is turned into the location directly', true],
          ['The keys are kept sorted for binary search', false],
          ['Python caches the most recent lookups', false],
          ['The dictionary is stored as a balanced tree', false]],
        'Hashing computes where to look rather than searching for it.'),
      mcq('`{[1, 2]: "point"}` raises TypeError because:',
        [['A list can change, so it cannot be hashed reliably', true],
          ['Lists are too large to use as keys', false],
          ['Only strings and numbers may be keys', false],
          ['The list must be sorted before use as a key', false]],
        'The slot is derived from the value; a mutable key could move after insertion.'),
      mcq('A collision in a hash table means:',
        [['Two keys landed in the same slot', true],
          ['Two different values were stored under one key', false],
          ['The table ran out of memory', false],
          ['A key was inserted twice', false]],
        'Each slot holds a small list; lookups compare within it.'),
      mcq('Counting occurrences with a nested loop instead of a Counter is:',
        [['O(n²) instead of O(n)', true],
          ['The same cost, written differently', false],
          ['Faster for small inputs and slower for large ones', false],
          ['Incorrect rather than merely slower', false]],
        'Each word scanning the whole list is the quadratic pattern a map removes.'),
    ],
    checkpoint: [
      mcq('Which question is a dictionary the wrong tool for?',
        [['All keys between two values', true],
          ['Whether a key is present', false],
          ['The value stored for a key', false],
          ['How many times each item appears', false]],
        'Range queries want an ordered structure such as a tree or a sorted list.'),
      mcq('Grouping rows by a field is done most directly with:',
        [['defaultdict(list)', true],
          ['A list of tuples, sorted', false],
          ['A set of the field values', false],
          ['A nested loop over the rows', false]],
        'Append to d[key] without checking whether the key exists yet.'),
    ],
  },

  {
    unitCode: 'T2_DS_KEYED_SETS',
    notes: `A set is a collection with **no duplicates and no order**, and membership tests that are
effectively instant.

    seen = set()
    seen.add(x)
    x in seen            # O(1), like a dictionary key
    len(seen)

**The pattern it replaces**, which is worth recognising instantly:

    # O(n²) — a list membership test inside a loop
    unique = []
    for x in items:
        if x not in unique:
            unique.append(x)

    # O(n)
    unique = list(set(items))          # order lost
    unique = list(dict.fromkeys(items))  # order kept

**Set operations answer questions you would otherwise loop for:**

    a & b      # in both            — intersection
    a | b      # in either          — union
    a - b      # in a but not in b  — difference
    a ^ b      # in exactly one     — symmetric difference

"Which students have not submitted?" is \`enrolled - submitted\`, and it reads like the question.

**What sets cost you:** order (until Python 3.7 dicts kept insertion order and sets still do not),
indexing (\`s[0]\` is an error), and duplicates (if you need counts, use \`Counter\`).

**Elements must be hashable**, for the same reason dictionary keys must be: a list cannot go in a
set, a tuple can.

**Where sets quietly fix real bugs:**

- **Deduplicating** ids before a database query
- **Seen-before** checks in a graph walk or a crawler
- **Permission checks** — \`required <= held\` asks "does the user have all of these?"

**The subset operators** are worth knowing: \`a <= b\` means every element of a is in b. Written out
as a loop it is three lines and a bug waiting to happen.`,
    mcqs: [
      mcq('Deduplicating with `if x not in result` on a list is:',
        [['O(n²), because each check scans the list', true],
          ['O(n), because Python optimises membership', false],
          ['O(n log n), because the list stays sorted', false],
          ['Constant, because the list is short', false]],
        'Set membership is the fix, at the cost of order.'),
      mcq('"Which enrolled students have not submitted?" is:',
        [['enrolled - submitted', true],
          ['enrolled & submitted', false],
          ['enrolled | submitted', false],
          ['submitted - enrolled', false]],
        'Difference reads exactly as the question does.'),
      mcq('What does a set cost you compared with a list?',
        [['Order and indexing', true],
          ['Constant-time membership', false],
          ['The ability to hold strings', false],
          ['Iteration over its elements', false]],
        'Use dict.fromkeys when you need uniqueness and order together.'),
      mcq('`required <= held` for two sets asks:',
        [['Whether every required item is held', true],
          ['Whether required has fewer items than held', false],
          ['Whether the sets share any items', false],
          ['Whether the two sets are equal', false]],
        'Subset, which is the permission check written honestly.'),
    ],
    checkpoint: [
      mcq('To remove duplicates while keeping the original order, use:',
        [['dict.fromkeys(items)', true],
          ['set(items)', false],
          ['sorted(set(items))', false],
          ['A loop with a list membership check', false]],
        'Dictionaries preserve insertion order; sets do not.'),
      mcq('A set cannot contain:',
        [['A list', true], ['A tuple', false], ['A string', false], ['A number', false]],
        'Elements must be hashable, and a list can change after insertion.'),
    ],
  },

  {
    unitCode: 'T2_DS_KEYED_TREES',
    notes: `A tree is data with a **shape**: one root, and every node holding children. It is the
structure for anything hierarchical — and a great deal is.

    class Node:
        def __init__(self, value, children=None):
            self.value = value
            self.children = children or []

**Where you already meet trees:** a file system, the DOM of a web page, JSON, an organisation
chart, a comment thread, a decision tree, the syntax of the program you just wrote.

**The vocabulary, briefly:** the **root** has no parent; a **leaf** has no children; the **depth**
of a node is its distance from the root; the **height** of the tree is the deepest depth.

**Walking a tree is naturally recursive**, because each child is itself a tree:

    def total_size(node):
        return node.size + sum(total_size(child) for child in node.children)

Three lines, and it works to any depth. The same walk written with an explicit stack is ten, which
is why trees are where recursion earns its place.

**Two ways to walk, and they answer different questions:**

- **Depth-first** — go as deep as possible, then back up. Natural with recursion. Good for "sum
  everything", "find any match", "render nested structure".
- **Breadth-first** — level by level, with a queue. Good for "nearest match", "print by level".

**Why depth matters.** Work on a tree is usually proportional to its height. A balanced tree of a
million nodes is about 20 deep; a tree that degenerated into a chain is a million deep — which is
both slow and a stack overflow waiting to happen.

**Do not build a tree where a dictionary will do.** If the only question is "give me the node with
id X", a dictionary answers it instantly. Trees earn their place when the *relationships* matter:
ancestors, descendants, ordering, nesting.`,
    mcqs: [
      mcq('Why is recursion natural for walking a tree?',
        [['Each child is itself a tree of the same shape', true],
          ['Trees are always balanced by definition', false],
          ['Recursion is faster than an explicit stack', false],
          ['Python cannot loop over nested structures', false]],
        'The structure is self-similar, so the function is too.'),
      mcq('Breadth-first traversal of a tree uses:',
        [['A queue, visiting level by level', true],
          ['A stack, going as deep as possible', false],
          ['A set of visited nodes only', false],
          ['Recursion with no extra structure', false]],
        'Depth-first uses a stack, explicitly or as the call stack.'),
      mcq('A tree that has degenerated into a chain is a problem because:',
        [['Its height, and so the work per operation, grows with n', true],
          ['It uses more memory than a balanced tree', false],
          ['It can no longer be walked recursively', false],
          ['Its nodes lose their parent pointers', false]],
        'Balanced is about 20 deep for a million nodes; a chain is a million.'),
      mcq('Which question does NOT need a tree?',
        [['Give me the record with id 4821', true],
          ['List every descendant of this node', false],
          ['How deeply is this comment nested', false],
          ['Which folder contains this file', false]],
        'A dictionary answers lookup by key instantly; trees are for relationships.'),
    ],
    checkpoint: [
      mcq('The height of a balanced tree with a million nodes is roughly:',
        [['20', true], ['1,000', false], ['1,000,000', false], ['100,000', false]],
        'Each level roughly doubles the nodes, so height grows logarithmically.'),
      mcq('Work on a tree is usually proportional to:',
        [['Its height', true], ['Its number of leaves', false], ['Its widest level', false], ['Its memory size', false]],
        'Which is why balance matters more than size.'),
    ],
  },

  {
    unitCode: 'T2_DS_KEYED_BINARY_SEARCH_TREES',
    notes: `A binary search tree keeps its values in order: everything smaller on the left,
everything larger on the right. That one rule turns searching into halving.

    def find(node, target):
        if node is None:
            return None
        if target == node.value:
            return node
        return find(node.left if target < node.value else node.right, target)

Each step discards half the remaining tree, so finding something in a balanced tree of a million
values takes about twenty comparisons.

**What it gives you that a dictionary does not:**

- **Sorted order for free** — an in-order walk emits everything sorted.
- **Range queries** — "every score between 60 and 80" is a walk of the relevant part.
- **Nearest neighbour** — "the smallest value greater than x".

A dictionary beats it for plain lookup, and cannot answer any of those three.

**And the catch: it only works while the tree is balanced.** Insert sorted data into a naive BST
and every value goes right, producing a chain:

    for i in range(1, 6):
        insert(tree, i)      # 1 -> 2 -> 3 -> 4 -> 5, a linked list

Now every operation is O(n), and sorted input is the most common input there is. Self-balancing
trees (AVL, red-black) rebalance on insert, which is what real implementations use — Java's
\`TreeMap\`, C++'s \`std::map\`, and most database indexes (a B-tree, the same idea with wider
nodes).

**In Python**, use \`sortedcontainers\` or keep a sorted list with \`bisect\` for ranges; the
built-in dict covers unordered lookup. Understanding the tree still matters, because it is what a
database index is doing when it uses one and what it cannot do when it does not.

**The idea to keep:** ordering is what buys the range query, and balance is what keeps it fast.`,
    mcqs: [
      mcq('Why does searching a balanced BST take about log n steps?',
        [['Each comparison discards half of what is left', true],
          ['Each node stores a shortcut to the answer', false],
          ['The values are copied into an array first', false],
          ['The tree is rebuilt for every search', false]],
        'Halving repeatedly is exactly a logarithm.'),
      mcq('Inserting already-sorted values into a naive BST produces:',
        [['A chain, with every operation O(n)', true],
          ['A perfectly balanced tree', false],
          ['An error, since duplicates are not allowed', false],
          ['A tree of height two', false]],
        'Every value goes the same way, and sorted input is extremely common.'),
      mcq('Which question can a BST answer that a dictionary cannot?',
        [['Every key between 60 and 80', true],
          ['The value stored for one key', false],
          ['Whether a key is present', false],
          ['How many keys there are', false]],
        'Ordering is what buys range queries.'),
      mcq('Database indexes typically use:',
        [['A B-tree, the same idea with wider nodes', true],
          ['A hash table, for range support', false],
          ['A linked list of sorted pages', false],
          ['An unbalanced binary search tree', false]],
        'Wide nodes suit disk pages; the ordering idea is identical.'),
    ],
    checkpoint: [
      mcq('An in-order walk of a binary search tree gives you:',
        [['The values in sorted order', true],
          ['The values by depth, level by level', false],
          ['The values in insertion order', false],
          ['Only the leaf values', false]],
        'Left, node, right — which is why ordering comes free.'),
      mcq('Self-balancing exists to guarantee:',
        [['That height stays logarithmic whatever the input order', true],
          ['That no duplicate values are stored', false],
          ['That lookups never need comparisons', false],
          ['That the tree fits in memory', false]],
        'Without it, sorted input degrades the structure to a list.'),
    ],
  },

  {
    unitCode: 'T2_DS_KEYED_CHOOSING',
    notes: `Choosing a structure is a decision you make **from the operations**, before writing any
code. This unit is the decision itself.

**Step 1: list the operations, and how often each happens.** A structure that makes a rare
operation fast and a constant one slow is the wrong trade.

**Step 2: match the operation to the structure.**

| What you need most | Use |
|---|---|
| Lookup by key | Dictionary |
| Membership, uniqueness | Set |
| Order preserved, index access | List |
| Add and remove at both ends | Deque |
| Most recent first | Stack (a list) |
| Oldest first | Queue (a deque) |
| Smallest or largest first | Heap (\`heapq\`) |
| Sorted order, ranges, nearest | Sorted list or a tree |
| Counting occurrences | \`Counter\` |
| Grouping by a key | \`defaultdict(list)\` |

**Step 3: notice the conflicts.** Most real problems want two things at once:

- *Fast lookup and sorted output* → a dictionary plus sorting when you output.
- *Fast lookup and insertion order* → a dictionary, which keeps insertion order in modern Python.
- *Fast lookup and a range query* → a sorted structure, or an index built alongside.
- *Uniqueness and counts* → \`Counter\`, which is both.

**Step 4: be willing to hold two structures.** Keeping a dictionary for lookup and a list for
order is normal, not a failure — provided one piece of code keeps them in step. Two structures
maintained by three functions is where the bugs come from.

**Step 5: say the cost out loud.** "Lookup O(1), insertion O(1), listing in order O(n log n)
because I sort on output, and sorting happens once per request." If you cannot say that sentence,
the choice has not been made yet.

**The two mistakes this unit exists to prevent:** using a list because it is familiar and paying
O(n) forever; and optimising a structure for an operation that happens once a day while the one
that happens ten thousand times a second stays slow.`,
    mcqs: [
      mcq('The first step in choosing a structure is:',
        [['Listing the operations and how often each happens', true],
          ['Estimating how much data there will be', false],
          ['Picking the structure with the best average cost', false],
          ['Writing the simple version and measuring it', false]],
        'Frequency decides which cost actually matters.'),
      mcq('You need both fast lookup and output in sorted order. A reasonable approach is:',
        [['A dictionary, sorted when you output', true],
          ['A list kept sorted on every insert', false],
          ['A set, sorted on every lookup', false],
          ['Two dictionaries, one keyed by value', false]],
        'Pay the sort once at output rather than on every insertion.'),
      mcq('Holding both a dictionary and a list for the same data is:',
        [['Normal, if one place keeps them in step', true],
          ['Always a design mistake', false],
          ['Only acceptable for small datasets', false],
          ['Required whenever order matters', false]],
        'The risk is several functions updating them separately.'),
      mcq('"Smallest item first, repeatedly" points to:',
        [['A heap', true], ['A sorted list rebuilt each time', false], ['A set', false], ['A stack', false]],
        'heapq gives the minimum in O(1) and removal in O(log n).'),
    ],
    checkpoint: [
      mcq('Which is the clearest sign a structure choice has not been made properly?',
        [['You cannot state the cost of each operation', true],
          ['The code uses more than one structure', false],
          ['The structure is from the standard library', false],
          ['The data fits comfortably in memory', false]],
        'If the sentence cannot be said, the trade has not been considered.'),
      mcq('Optimising the operation that runs once a day while the hot one stays slow is:',
        [['The classic wrong trade', true],
          ['Sensible, since both are improved eventually', false],
          ['Correct if the daily one is more complex', false],
          ['Unavoidable when costs conflict', false]],
        'Frequency, not complexity, decides which cost you should pay attention to.'),
    ],
  },

  {
    unitCode: 'T2_DS_KEYED_DEBUGGING',
    notes: `Keyed structures fail in quieter ways than lists. Five shapes cover nearly all of it.

**1. The key is not what you think.** Whitespace, case, or a string where a number belongs:

    counts["Asha "] and counts["asha"]     # two different keys

Print \`repr(key)\` rather than the key — \`'asha '\` shows the space that \`asha \` hides.

**2. KeyError, or the silent default.** \`d[k]\` raises; \`d.get(k)\` returns \`None\`. The second is
worse when you did not mean it, because the \`None\` travels somewhere else before failing:

    total += d.get(name)      # TypeError much later: unsupported operand

Use \`d.get(k, 0)\` deliberately, or let the KeyError happen where the mistake is.

**3. Mutating a key after insertion.** A tuple of lists, an object whose \`__hash__\` uses a field
you changed — the entry is now unreachable although it is still in the dictionary.

**4. Iterating while inserting or deleting.**

    for k in d:
        if not d[k]:
            del d[k]      # RuntimeError: dictionary changed size during iteration

Iterate over \`list(d)\` or build a new dictionary.

**5. Sets losing your order.** Data goes in ordered, comes out shuffled, and something downstream
depends on the order nobody promised. If order matters, a set is the wrong structure.

**How to look:** print the length, then \`repr\` of a few keys. For a tree, print the height — a
height close to the node count means it degenerated into a chain, which explains any slowness
without further investigation.`,
    mcqs: [
      mcq('Why print `repr(key)` rather than the key itself?',
        [['It shows whitespace and quoting that hide the difference', true],
          ['It is faster than printing the key directly', false],
          ['It converts the key to its hash value', false],
          ['It prevents the key from being modified', false]],
        'A trailing space is invisible until repr shows the quotes.'),
      mcq('`d.get(k)` without a default is risky because:',
        [['A None travels on and fails somewhere unrelated', true],
          ['It is slower than indexing the dictionary', false],
          ['It inserts the key with a None value', false],
          ['It raises a different exception from KeyError', false]],
        'Either supply a default deliberately, or let KeyError point at the real mistake.'),
      mcq('Deleting from a dictionary while iterating over it gives:',
        [['A RuntimeError about the size changing', true],
          ['Silently skipped entries', false],
          ['A copy of the dictionary being iterated', false],
          ['No problem at all in modern Python', false]],
        'Iterate over list(d), or build a new dictionary.'),
      mcq('An entry exists in a dictionary but cannot be found. A likely cause is:',
        [['The key was mutated after insertion', true],
          ['The dictionary exceeded its maximum size', false],
          ['The value was set to None', false],
          ['The dictionary was iterated too many times', false]],
        'The hash no longer matches the slot the entry sits in.'),
    ],
    checkpoint: [
      mcq('A tree whose height is close to its node count has:',
        [['Degenerated into a chain', true],
          ['Been balanced correctly', false],
          ['Run out of memory', false],
          ['Lost its root node', false]],
        'Which explains the slowness without any further investigation.'),
      mcq('Data goes into a set ordered and comes out shuffled. The fix is:',
        [['Use a structure that promises order', true],
          ['Sort the set before iterating it', false],
          ['Insert the items more slowly', false],
          ['Convert the set to a tuple', false]],
        'A set never promised order; depending on it is the bug.'),
    ],
  },

  {
    unitCode: 'T2_DS_KEYED_PRACTICE',
    notes: `No new ideas. Practise until the words in a problem statement map straight onto a
structure.

**Name the structure, then solve:**

1. **First non-repeating character** in a string, in one pass plus one.
2. **Two-sum** — find two numbers that add to a target, without a nested loop.
3. **Group anagrams** from a list of words.
4. **Most common words** — the top ten, with counts, from a large text.
5. **Common friends** between two users, then "friends of A not friends of B".
6. **Detect a cycle** while walking links, using seen-before.
7. **Range of scores** — every student scoring between 60 and 80, from data that is added once and
   queried often.
8. **Nested comments** — print a comment thread indented by depth.

**For each, write one line:** the structure, its cost, and what the obvious alternative would have
cost.

**The signal words worth learning to hear:**

| Words in the problem | Structure |
|---|---|
| "have I seen", "unique", "duplicate" | Set |
| "how many of each", "most common" | Counter |
| "group by", "for each category" | defaultdict(list) |
| "look up by id" | Dictionary |
| "between X and Y", "next larger" | Sorted structure |
| "nested", "parent", "children" | Tree |
| "in order of arrival" | Queue |
| "most recent" | Stack |

**The slip this set exposes:** solving with nested loops because it works on the example input, and
never noticing that the same problem with a dictionary is both shorter and a hundred times faster.`,
    mcqs: [
      mcq('"Find two numbers that add to a target, without a nested loop" wants:',
        [['A dictionary of values already seen', true],
          ['A sorted list and a binary search per item', false],
          ['A set of all pairs, checked afterwards', false],
          ['A heap of the largest values', false]],
        'For each number, ask whether target − number has been seen. One pass.'),
      mcq('Grouping anagrams is done by keying on:',
        [['The sorted letters of each word', true],
          ['The length of each word', false],
          ['The first letter of each word', false],
          ['A hash of the whole word', false]],
        'Anagrams share the same multiset of letters, and sorted letters represent it.'),
      mcq('"Every student scoring between 60 and 80", queried often, wants:',
        [['A sorted structure supporting ranges', true],
          ['A dictionary keyed by student id', false],
          ['A set of all scores', false],
          ['A queue ordered by arrival', false]],
        'A dictionary cannot answer a range without scanning everything.'),
      mcq('"Have I seen this before" in a walk points to:',
        [['A set', true], ['A list', false], ['A stack', false], ['A counter', false]],
        'Membership is what a set makes instant.'),
      mcq('The first non-repeating character is found with:',
        [['A count of each character, then one pass in order', true],
          ['A nested loop comparing every pair', false],
          ['Sorting the string and scanning it', false],
          ['A set of characters seen so far only', false]],
        'Counts give the repeats; the second pass restores the original order.'),
    ],
    checkpoint: [
      mcq('"How many of each" in a problem statement points to:',
        [['Counter', true], ['A set', false], ['A stack', false], ['A binary search tree', false]],
        'Counting is exactly what Counter exists for.'),
      mcq('A nested loop over the same list usually means:',
        [['A map or set would make it one pass', true],
          ['The problem genuinely needs every pair', false],
          ['The data must be sorted first', false],
          ['A recursive solution is required', false]],
        'Sometimes every pair really is needed — but check for the one-pass version first.'),
    ],
  },

  {
    unitCode: 'T2_DS_KEYED_MINI_PROJECT',
    notes: `One system built on lookups, groupings and ranges over enough data that the wrong
structure is obvious.

**Why data at scale.** Every structure looks fine on a hundred records. The project uses at least
a hundred thousand so that a linear scan inside a loop is felt rather than argued about, and so the
measurements mean something.

**What is being assessed:** that each query is answered by a structure chosen for it, that you
noticed where two requirements conflicted, and that you can show the difference with numbers.

**Build it in this order:**

1. **Write the queries down** — everything the system must answer, and how often.
2. **Design the structures**, one per query, and note where they conflict.
3. **Load the data** and build the indexes once.
4. **Answer each query**, timing it.
5. **Do one query the naive way on purpose**, time it, and keep both numbers.

The brief, requirements and deliverables are in the assignment attached to this unit.`,
    assignment: {
      title: 'Mini Project — Indexing Real Data',
      description: 'Build indexes over a large dataset so that lookups, groupings and ranges are all fast, and prove the difference against the naive version with measurements.',
      instructions: `**The brief**

Take a dataset of at least **100,000 rows** — generate it, or use a public one (city bus stops,
movies, products, weather readings). Build a small query tool over it.

Answer ONE of these sets, or something of comparable scope:

- **Products** — lookup by id, all products in a category, products priced between X and Y, the ten
  most common brands, duplicate names.
- **Students** — lookup by roll number, all students of a department, marks between X and Y, top
  ten by average, students in one subject but not another.
- **Transport** — lookup by stop id, all stops on a route, stops within a range of ids, the ten
  busiest routes, routes serving two given stops.

**Requirements**

1. **At least five queries**, including one lookup, one grouping, one range and one set operation.
2. **Indexes built once**, at load, and reused for every query.
3. **A structure table** written before coding: query, structure, expected cost.
4. **Timings** for every query on the full dataset.
5. **One query implemented twice** — naive and indexed — with both timings recorded.
6. **Memory noted**: roughly what the indexes cost you in exchange.
7. **Tests** for each query, including a query that matches nothing.

**What to submit**

1. Source files and tests.
2. The **structure table**:

   | Query | Structure | Expected cost | Measured |
   |---|---|---|---|

3. The **naive versus indexed** comparison, with real numbers.
4. A **short write-up** (250–350 words): which two requirements conflicted and how you resolved
   them; what the indexes cost in memory; one query you would index differently for a larger
   dataset.

**Constraints**

- Standard library only; no database.
- Indexes built once, never rebuilt per query.
- Every timing must be real output.

**Where the marks are.** The conflict and the numbers. Recognising that fast lookup and range
queries want different structures, and showing what you paid for each, is the point of the project.`,
      rubric: [
        {
          criterion: 'Index design',
          description: 'A structure chosen per query with a stated cost; the conflict between lookup, grouping and range identified and resolved deliberately.',
          maxPoints: 30,
        },
        {
          criterion: 'Implementation',
          description: 'Indexes built once and reused; every query correct, including no-match cases; no accidental full scans.',
          maxPoints: 25,
        },
        {
          criterion: 'Measurement',
          description: 'Real timings for every query, plus a naive-versus-indexed comparison and a note on memory cost.',
          maxPoints: 25,
        },
        {
          criterion: 'Tests',
          description: 'Each query tested, including an empty result and a boundary of the range query.',
          maxPoints: 10,
        },
        {
          criterion: 'Write-up',
          description: 'Explains the conflict, the memory trade, and what would change at a larger scale.',
          maxPoints: 10,
        },
      ],
      totalPoints: 100,
    },
  },
];
