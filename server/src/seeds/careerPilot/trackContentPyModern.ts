/**
 * Career-track content: Modern Python (JT_PY_MODERN), for Python Full Stack + AI.
 *
 * Years 1–2 already taught loops, functions, OOP, modules, files and errors in Python. This topic is
 * the next level an interviewer and a Django/FastAPI codebase assume: comprehensions and generators,
 * closures and decorators, context managers, type hints with dataclasses and enums, and asyncio. The
 * questions are about specific code and what CPython does with it — every "what does this print"
 * was run on CPython 3.13 and relies on nothing that changed since 3.10.
 *
 * The topic is single-skill (PYTHON_ADVANCED), so no question names a skillKey. The auto-graded
 * practice runs on Python 3.10: no 3.11+ syntax or modules.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_PY_MODERN_BUNDLES: PilotBundle[] = [
  /* ── COMPREHENSIONS ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_PY_MODERN_COMPREHENSIONS',
    notes: `You can already write a \`for\` loop that builds a list. Production Python code — and every
Python interviewer — expects the shorter, clearer forms for the common cases, and the judgement to
know when a plain loop is still the better choice.

## The four comprehensions

    prices = [120, 45, 300, 80]

    with_gst  = [round(p * 1.18) for p in prices]              # list
    expensive = [p for p in prices if p >= 100]                 # list, filtered
    by_name   = {name: len(name) for name in ['asha', 'ravi']}  # dict
    initials  = {name[0] for name in ['asha', 'arun', 'ravi']}  # set -> {'a', 'r'}
    total     = sum(p * 1.18 for p in prices)                   # generator expression

A comprehension reads left to right as "**this expression**, for each item, **if** this holds". The
generator expression in the last line builds no list at all; \`sum\` pulls one value at a time (the
next unit is about exactly that).

## Filter versus conditional expression

The position of \`if\` changes its meaning:

    [n for n in range(6) if n % 2]           # filter:  [1, 3, 5]
    [n if n % 2 else 0 for n in range(5)]     # choose:  [0, 1, 0, 3, 0]

A trailing \`if\` drops items. An \`if ... else\` before the \`for\` keeps every item and picks a value.

## Nested loops read in the same order as nested for statements

    [x * y for x in range(1, 4) for y in range(x)]
    # the same as:
    # for x in range(1, 4):
    #     for y in range(x):
    #         result.append(x * y)
    # -> [0, 0, 2, 0, 3, 6]

Flattening a list of lists is the everyday case: \`[cell for row in grid for cell in row]\`.

## The idioms that replace index loops

    for i, name in enumerate(names, start=1):     # index and value together
        print(i, name)

    for name, mark in zip(names, marks):          # walk two sequences in step
        ...

    report = dict(zip(names, marks))              # two lists -> a dict
    columns = [list(c) for c in zip(*rows)]       # transpose a matrix

    first, *middle, last = [3, 5, 8, 13]          # extended unpacking
    for (city, (lat, lon)) in places.items(): ... # nested unpacking

\`zip\` stops at the **shortest** input without complaint: \`list(zip([1, 2, 3], 'ab'))\` is
\`[(1, 'a'), (2, 'b')]\`. When the lengths must match, Python 3.10 added \`zip(a, b, strict=True)\`,
which raises \`ValueError\` instead of silently dropping data.

## The comprehension variable stays inside

    x = 'outer'
    squares = [x * x for x in range(3)]
    print(x)        # outer — a comprehension has its own scope

A plain \`for\` loop, by contrast, leaves its variable bound to the last value after the loop.

## The walrus operator in a filter (3.8+)

    readings = [1, 2, 3, 4]
    doubled_big = [y for v in readings if (y := v * 2) > 4]    # [6, 8]

\`:=\` stores the computed value so the filter and the output do not compute it twice. Use it when the
expression is expensive (a parse, a regex match); for \`v * 2\` it is only an illustration.

## Dict comprehensions overwrite silently

    {len(w): w for w in ['hi', 'yo', 'abc']}    # {2: 'yo', 3: 'abc'}

Two words have length 2; the later one wins and the earlier one disappears with no error. When
duplicates matter, group instead: \`groups.setdefault(len(w), []).append(w)\`.

## When a loop reads better

A comprehension is for building a collection. Write a loop when:

- the body has side effects (printing, writing to a database) — \`[print(x) for x in xs]\` builds a
  useless list of \`None\`;
- there are more than two \`for\`/\`if\` clauses, or the expression needs a \`try\`;
- you need to \`break\` early.

## Common mistakes and interview traps

- \`[[0] * 3] * 3\` makes **one** inner list referenced three times; changing \`grid[0][0]\` changes
  every row. Build rows with a comprehension: \`[[0] * 3 for _ in range(3)]\`.
- Writing \`{}\` for an empty set — it is an empty **dict**. Use \`set()\`.
- Building a list just to pass it to \`sum\`, \`any\`, \`max\` or \`''.join\`: pass a generator
  expression and skip the list.`,
    workedExample: `**Problem.** An exam portal returns rows as \`(roll, subject, marks)\`. Produce a dict mapping
each roll number to its total, but only over subjects where the student scored at least 35, and list
the rolls that failed any subject.

    rows = [
        ('R1', 'maths', 78), ('R1', 'physics', 30),
        ('R2', 'maths', 90), ('R2', 'physics', 85),
    ]

**Step 1 — the failures are a set comprehension.** A roll can fail twice; a set removes repeats.

    failed = {roll for roll, _, marks in rows if marks < 35}      # {'R1'}

**Step 2 — totals need accumulation, so a comprehension alone is wrong.** A dict comprehension
\`{roll: marks for roll, _, marks in rows}\` would keep only the *last* row per roll (later keys
overwrite earlier ones). Accumulate with a loop instead:

    totals = {}
    for roll, _, marks in rows:
        if marks >= 35:
            totals[roll] = totals.get(roll, 0) + marks
    # {'R1': 78, 'R2': 175}

**Step 3 — or group first, then comprehend.** If a per-roll list is useful anyway:

    by_roll = {}
    for roll, _, marks in rows:
        by_roll.setdefault(roll, []).append(marks)
    totals = {roll: sum(m for m in ms if m >= 35) for roll, ms in by_roll.items()}

**Why this shape.** The comprehension is used where each output item depends on one input item
(the set of failures, the per-roll sum). Where output depends on *several* input rows, a loop that
accumulates is clearer and correct; forcing it into one comprehension is the bug in Step 2.`,
    mcqs: [
      mcq(`What does this print?

    print([x * y for x in range(1, 4) for y in range(x)])`, [
        ['[0, 0, 2, 0, 3, 6]', true],
        ['[0, 2, 6]', false],
        ['[[0], [0, 2], [0, 3, 6]]', false],
        ['[1, 2, 3, 2, 4, 6]', false],
      ], 'The for clauses nest left to right: x takes 1, 2, 3 and for each x, y runs over range(x). The pairs are (1,0), (2,0), (2,1), (3,0), (3,1), (3,2), and the products form one flat list.'),
      mcq(`An attendance script runs this. What is \`by_len\`?

    words = ['hi', 'yo', 'abc']
    by_len = {len(w): w for w in words}`, [
        ['{2: \'hi\', 3: \'abc\'}', false],
        ['{2: [\'hi\', \'yo\'], 3: [\'abc\']}', false],
        ['{2: \'yo\', 3: \'abc\'}', true],
        ['It raises KeyError on the duplicate key 2', false],
      ], 'A dict comprehension assigns key by key, so a repeated key is overwritten by the later value without any error. Both hi and yo have length 2 and yo comes last.'),
      mcq('A teammate writes `[send_email(u) for u in users]` to email every user and never uses the result. What is the best review comment?', [
        ['Fine as written: comprehensions are faster than loops', false],
        ['Wrap it in list() so that the emails are actually sent', false],
        ['Change it to a set comprehension to skip duplicate users', false],
        ['Use a plain for loop; this builds a list of unused results', true],
      ], 'A comprehension exists to build a collection. Used only for side effects it allocates a throwaway list (here of whatever send_email returns) and hides the intent; a for loop says what is happening.'),
    ],
    checkpoint: [
      mcq(`What does this print?

    x = 'outer'
    squares = [x * x for x in range(3)]
    print(x)`, [
        ['2', false],
        ['outer', true],
        ['4', false],
        ['It raises NameError', false],
      ], 'In Python 3 a comprehension runs in its own scope, so its loop variable x does not overwrite the outer x. A plain for loop would have left x bound to 2.'),
      mcq(`What is \`pairs\` after this runs?

    pairs = list(zip([1, 2, 3], 'ab'))`, [
        ['It raises ValueError because the lengths differ', false],
        ['[(1, \'a\'), (2, \'b\'), (3, None)]', false],
        ['[(1, \'a\'), (2, \'b\'), (3, \'\')]', false],
        ['[(1, \'a\'), (2, \'b\')]', true],
      ], 'zip stops as soon as the shortest input runs out and says nothing about the dropped 3. Only zip(..., strict=True), added in 3.10, raises ValueError on a length mismatch.'),
      mcq(`A seating chart is built and one seat is booked. What does \`grid\` hold?

    grid = [[0] * 3] * 3
    grid[0][0] = 9`, [
        ['[[9, 0, 0], [0, 0, 0], [0, 0, 0]]', false],
        ['[[9, 0, 0], [9, 0, 0], [9, 0, 0]]', true],
        ['[[9, 9, 9], [0, 0, 0], [0, 0, 0]]', false],
        ['It raises TypeError: list multiplication', false],
      ], 'Multiplying the outer list copies the reference to one inner list three times, so all three rows are the same object and the change shows in each. [[0] * 3 for _ in range(3)] builds three separate rows.'),
    ],
  },

  /* ── ITERATORS_GENERATORS ──────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_PY_MODERN_ITERATORS_GENERATORS',
    notes: `A list holds all its items in memory at once. A **generator** produces them one at a time, on
request, and forgets each one once it has been handed over. That is how a 5 GB log file is processed
on a laptop with 8 GB of RAM.

## The iterator protocol

\`for item in thing\` does two things behind the scenes:

    it = iter(thing)          # thing.__iter__() returns an iterator
    while True:
        try:
            item = next(it)   # it.__next__() returns the next item...
        except StopIteration: # ...or raises StopIteration when there are no more
            break

An **iterable** is anything \`iter()\` accepts (a list, a dict, a file, a range). An **iterator** is
the object that remembers the position and answers \`next()\`. A list is iterable but not an
iterator: every \`for\` over it starts a fresh iterator from the beginning. An iterator, once used,
stays used.

## Generator functions

A function containing \`yield\` returns a generator object when called — **its body does not run
yet**:

    def countdown(n):
        print('start')
        while n > 0:
            yield n
            n -= 1

    c = countdown(3)     # prints nothing
    next(c)              # prints 'start', returns 3
    list(c)              # [2, 1] — resumes where it paused

Each \`yield\` pauses the function with all its local variables intact; \`next\` resumes it. When the
function returns, the generator raises \`StopIteration\` and is finished.

## Generators are single-use

    squares = (x * x for x in range(3))
    print(sum(squares), sum(squares))     # 5 0

The second \`sum\` gets an exhausted generator and sees nothing. No error, just an empty result —
this is the most common generator bug in real code. If you need the data twice, either keep a list
or call the generator function again.

The same single-use rule produces a neat idiom:

    it = iter([1, 2, 3, 4])
    list(zip(it, it))      # [(1, 2), (3, 4)] — both zip arguments pull from one iterator

## Laziness, precisely

A generator expression evaluates its **first** iterable immediately and everything else lazily:

    nums = [1, 2, 3]
    sq = (n * n for n in nums)
    nums.append(4)
    list(sq)       # [1, 4, 9, 16] — the same list object grew before it was read

    nums = [1, 2, 3]
    sq = (n * n for n in nums)
    nums = [10]
    list(sq)       # [1, 4, 9] — sq kept the original list; the name was rebound

## A pipeline of generators

Each stage takes an iterable and yields; nothing is held in memory but the current line.

    def read_lines(path):
        with open(path, encoding='utf-8') as f:
            for line in f:
                yield line.rstrip('\\n')

    def errors(lines):
        return (line for line in lines if ' ERROR ' in line)

    def services(lines):
        for line in lines:
            yield line.split()[2]

    from collections import Counter
    top = Counter(services(errors(read_lines('app.log')))).most_common(3)

\`yield from inner()\` delegates to another generator and also receives its \`return\` value:

    def inner():
        yield 1
        yield 2
        return 'done'

    def outer():
        result = yield from inner()
        yield result

    list(outer())    # [1, 2, 'done']

## itertools for real work

    from itertools import islice, count, chain, groupby

    list(islice(count(10, 5), 3))         # [10, 15, 20] — first 3 of an infinite stream
    list(chain([1], 'ab'))                 # [1, 'a', 'b'] — one stream after another
    [(k, len(list(g))) for k, g in groupby('aabaa')]
    # [('a', 2), ('b', 1), ('a', 2)] — groups only ADJACENT equal items

\`groupby\` does not sort: to group all equal keys together, sort by the same key first.
\`itertools.batched\` (chunks of n) arrived only in 3.12; on 3.10 use \`islice\` in a loop.

## A class can be iterable by making __iter__ a generator

    class Countdown:
        def __init__(self, n):
            self.n = n
        def __iter__(self):
            k = self.n
            while k > 0:
                yield k
                k -= 1

    cd = Countdown(2)
    list(cd), list(cd)     # ([2, 1], [2, 1]) — a fresh generator each time

Because \`__iter__\` returns a new generator on every call, \`Countdown\` is reusable — unlike a bare
generator object.

## Common mistakes and interview traps

- Iterating a generator twice and getting nothing the second time.
- \`len(gen)\` and \`gen[0]\` — generators support neither.
- \`3 in gen\` **consumes** the generator up to the 3; what follows starts after it.
- Raising \`StopIteration\` by hand inside a generator: since Python 3.7 it becomes
  \`RuntimeError\`. Just \`return\`.`,
    workedExample: `**Problem.** A payments CSV has 20 million lines (\`txn_id,city,amount\`). Print the total
amount per city without loading the file into memory, skipping the header and malformed lines.

**Step 1 — stream the lines.** Opening the file and iterating it already reads one line at a time:

    def rows(path):
        with open(path, encoding='utf-8') as f:
            next(f, None)                       # skip the header (None if the file is empty)
            for line in f:
                parts = line.rstrip('\\n').split(',')
                if len(parts) == 3:
                    yield parts

**Step 2 — convert, dropping what does not parse.** A separate stage keeps each one testable:

    def amounts(parts_iter):
        for txn_id, city, amount in parts_iter:
            try:
                yield city, float(amount)
            except ValueError:
                continue

**Step 3 — aggregate in one pass.**

    totals = {}
    for city, amount in amounts(rows('payments.csv')):
        totals[city] = totals.get(city, 0.0) + amount
    for city in sorted(totals):
        print(f'{city}: {totals[city]:.2f}')

**Why it works.** At any moment the program holds one line, one tuple and the \`totals\` dict
(one entry per city). Memory is proportional to the number of cities, not the number of rows.

**The trap avoided.** Writing \`data = list(rows(...))\` "to look at it" would load all 20 million
rows — and if the code then looped over \`rows(...)\` *the generator object* twice, the second pass
would silently see nothing.`,
    mcqs: [
      mcq(`What does this print?

    squares = (x * x for x in range(3))
    print(sum(squares), sum(squares))`, [
        ['5 5', false],
        ['5 0', true],
        ['0 5', false],
        ['It raises StopIteration on the second sum', false],
      ], 'A generator can be consumed only once. The first sum reads 0, 1 and 4; the second receives an exhausted generator, sees no items and returns 0 without raising.'),
      mcq(`What is printed, in order?

    def countdown(n):
        print('start')
        while n > 0:
            yield n
            n -= 1

    c = countdown(3)
    print('created')
    print(next(c))`, [
        ['start, then created, then 3', false],
        ['created, then 3, and start is never printed', false],
        ['start, then 3, then created', false],
        ['created, then start, then 3', true],
      ], 'Calling a generator function only builds the generator; its body runs on the first next(). So created prints first, then next() runs the body: start, then the yielded 3.'),
      mcq(`What does this print?

    from itertools import groupby
    print([(k, len(list(g))) for k, g in groupby('aabaa')])`, [
        ['[(\'a\', 4), (\'b\', 1)]', false],
        ['[(\'a\', 2), (\'b\', 1), (\'a\', 2)]', true],
        ['[(\'a\', 3), (\'b\', 1), (\'a\', 1)]', false],
        ['[(\'a\', 2), (\'b\', 1)]', false],
      ], 'groupby groups only consecutive equal items, so the two runs of a are separate groups. Sorting the input first would give one group of four.'),
    ],
    checkpoint: [
      mcq(`What does this print?

    it = iter([1, 2, 3, 4])
    print(list(zip(it, it)))`, [
        ['[(1, 1), (2, 2), (3, 3), (4, 4)]', false],
        ['[(1, 2), (2, 3), (3, 4)]', false],
        ['[(1, 2), (3, 4)]', true],
        ['[]', false],
      ], 'Both arguments are the same iterator, so zip takes one item from it for the first slot and the next for the second: (1, 2), then (3, 4). It is a common idiom for pairing up a flat stream.'),
      mcq(`What does this print?

    nums = [1, 2, 3]
    sq = (n * n for n in nums)
    nums = [10]
    print(list(sq))`, [
        ['[1, 4, 9]', true],
        ['[100]', false],
        ['[1, 4, 9, 100]', false],
        ['[]', false],
      ], 'A generator expression evaluates its first iterable when it is created, so sq holds the original list. Rebinding the name nums afterwards points the name elsewhere and does not affect sq.'),
      mcq(`What does this print?

    gen = (n for n in range(5))
    print(3 in gen, list(gen))`, [
        ['True [0, 1, 2, 3, 4]', false],
        ['True []', false],
        ['False [4]', false],
        ['True [4]', true],
      ], 'The in test pulls items from the generator until it finds 3, consuming 0 to 3 on the way. list(gen) then gets only what remains, which is 4.'),
    ],
  },

  /* ── DECORATORS ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_PY_MODERN_DECORATORS',
    notes: `In Python a function is an object like any other: it can be stored in a variable, put in a
list, passed to another function and returned from one. Decorators are built entirely from that one
fact — and so are two of the most-asked Python interview traps.

## Flexible parameters

    def f(a, b=2, *rest, key, **extra):
        return (a, b, rest, key, extra)

    f(1, 3, 4, 5, key='k', z=0)   # (1, 3, (4, 5), 'k', {'z': 0})
    f(1, key='k')                 # (1, 2, (), 'k', {})

\`*rest\` collects extra positional arguments into a tuple; parameters after it (\`key\`) are
**keyword-only**; \`**extra\` collects unknown keyword arguments into a dict. A wrapper that must accept
"whatever the original accepts" is written \`def wrapper(*args, **kwargs)\` and passes both on.

## Trap 1 — the mutable default argument

    def add(item, bag=[]):
        bag.append(item)
        return bag

    add(1)
    print(add(2))      # [1, 2], not [2]

Default values are evaluated **once, when the def runs**, and stored on the function. Every call
that omits \`bag\` shares that one list. The fix is a sentinel:

    def add(item, bag=None):
        if bag is None:
            bag = []
        bag.append(item)
        return bag

## Closures

An inner function remembers the variables of the function it was defined in:

    def make_counter():
        count = 0
        def inc():
            nonlocal count      # without this, count += 1 raises UnboundLocalError
            count += 1
            return count
        return inc

    c1, c2 = make_counter(), make_counter()
    c1(); c1()
    print(c1(), c2())          # 3 1 — each counter has its own count

Assigning to a name inside a function makes it local to that function, so \`count += 1\` without
\`nonlocal\` tries to read a local that does not exist yet.

## Trap 2 — late-binding closures

    handlers = [lambda: i for i in range(3)]
    print([h() for h in handlers])     # [2, 2, 2]

The lambdas capture the **variable** \`i\`, not its value at creation time; when they finally run,
\`i\` is 2. Bind the current value as a default: \`lambda i=i: i\` gives \`[0, 1, 2]\`. The same
happens with callbacks registered in a loop — buttons, routes, scheduled jobs.

## A decorator is a function that takes a function and returns one

    import functools, time

    def timed(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            start = time.perf_counter()
            try:
                return fn(*args, **kwargs)
            finally:
                print(f'{fn.__name__} took {time.perf_counter() - start:.3f}s')
        return wrapper

    @timed
    def load_report(day): ...

\`@timed\` above a def means exactly \`load_report = timed(load_report)\`. Three rules make a
decorator correct:

1. **Accept and forward everything** — \`*args, **kwargs\`.
2. **Return the result** — a wrapper that calls \`fn(...)\` without \`return\` makes every decorated
   function return \`None\`.
3. **Use \`functools.wraps\`** — without it the decorated function's \`__name__\` is \`'wrapper'\` and its
   docstring is \`None\`, which breaks logs, help(), pytest output and frameworks that register views
   by function name (Flask raises an error when two routes end up with the same endpoint name).
   \`wraps\` also sets \`__wrapped__\`, the original function.

## Decorators with arguments add one more level

    def retry(times, on=(ConnectionError,)):
        def decorate(fn):
            @functools.wraps(fn)
            def wrapper(*args, **kwargs):
                for attempt in range(1, times + 1):
                    try:
                        return fn(*args, **kwargs)
                    except on:
                        if attempt == times:
                            raise
            return wrapper
        return decorate

    @retry(3)
    def fetch_rates(): ...

\`@retry(3)\` first calls \`retry(3)\`, which returns the real decorator. Stacked decorators apply
bottom-up: \`@a\` over \`@b\` over \`def f\` is \`f = a(b(f))\`, so \`a\`'s wrapper runs outermost.

A decorator runs **when the def executes** — at import time for module-level functions — not when the
function is called.

## functools.lru_cache

    @functools.lru_cache(maxsize=None)     # functools.cache is the same, 3.9+
    def fare(src: str, dst: str) -> int:
        ...  # an expensive lookup

    fare('HYD', 'BLR'); fare('HYD', 'BLR')
    fare.cache_info()   # CacheInfo(hits=1, misses=1, maxsize=None, currsize=1)

The arguments become a dict key, so they **must be hashable**: calling a cached function with a list
raises \`TypeError: unhashable type: 'list'\`. Cache only pure functions — the cache never notices
that the database row behind \`fare\` changed. On a method, \`lru_cache\` also keeps every \`self\`
alive for as long as the cache does.

## Common mistakes and interview traps

- Forgetting \`return\` inside the wrapper.
- Writing \`@retry\` (no parentheses) for a decorator that takes arguments: \`retry\` receives the
  function as \`times\`.
- Expecting a default list or dict to be fresh on every call.`,
    mcqs: [
      mcq(`What does this print?

    def add(item, bag=[]):
        bag.append(item)
        return bag

    add(1)
    print(add(2))`, [
        ['[2]', false],
        ['[1]', false],
        ['[1, 2]', true],
        ['[2, 1]', false],
      ], 'The default list is created once, when def runs, and every call that omits bag appends to that same list. The first call leaves [1] in it, so the second returns [1, 2].'),
      mcq(`What does this print?

    handlers = [lambda: i for i in range(3)]
    print([h() for h in handlers])`, [
        ['[0, 1, 2]', false],
        ['[2, 2, 2]', true],
        ['[0, 0, 0]', false],
        ['It raises NameError, since i is out of scope', false],
      ], 'Each lambda looks up i when it is called, not when it was made. By then the comprehension has finished with i at 2, so all three return 2. lambda i=i: i captures the value instead.'),
      mcq(`A decorator is written without functools.wraps. What does the last line print?

    def logged(fn):
        def wrapper(*args, **kwargs):
            return fn(*args, **kwargs)
        return wrapper

    @logged
    def total(xs):
        """Sum xs."""
        return sum(xs)

    print(total.__name__, total.__doc__)`, [
        ['total Sum xs.', false],
        ['wrapper Sum xs.', false],
        ['total None', false],
        ['wrapper None', true],
      ], 'total now names the wrapper function, which has its own __name__ and no docstring. functools.wraps(fn) copies __name__, __doc__ and more onto the wrapper.'),
    ],
    checkpoint: [
      mcq(`What does this print?

    def tag(name):
        def deco(fn):
            def wrapper():
                return f'<{name}>' + fn() + f'</{name}>'
            return wrapper
        return deco

    @tag('b')
    @tag('i')
    def hello():
        return 'hi'

    print(hello())`, [
        ['<b><i>hi</i></b>', true],
        ['<i><b>hi</b></i>', false],
        ['<b>hi</b><i>hi</i>', false],
        ['<i>hi</i>', false],
      ], 'Stacked decorators apply bottom-up: hello = tag(\'b\')(tag(\'i\')(hello)). The i wrapper is innermost, so its tags sit closest to hi and the b tags wrap the whole result.'),
      mcq(`A cached function is called three times. What is printed?

    import functools

    @functools.lru_cache(maxsize=None)
    def slow_square(n):
        print('computing', n)
        return n * n

    slow_square(4); slow_square(4); slow_square(5)`, [
        ['computing 4 twice, then computing 5', false],
        ['computing 4, then computing 5', true],
        ['only computing 4; the cache holds one entry', false],
        ['nothing, since a cached function never prints', false],
      ], 'The second call with 4 is a cache hit and does not run the body. 5 is a miss, so the body runs and prints. cache_info() would show hits=1, misses=2.'),
      mcq(`What happens when \`broken()()\` runs?

    def broken():
        count = 0
        def inc():
            count += 1
            return count
        return inc`, [
        ['It returns 1, as inc updates the enclosing count', false],
        ['It returns 0, as the assignment is ignored', false],
        ['It raises UnboundLocalError inside inc', true],
        ['It raises NameError when broken is defined', false],
      ], 'Because inc assigns to count, Python treats count as local to inc, and count += 1 reads it before any assignment. nonlocal count tells Python to use the enclosing variable.'),
    ],
  },

  /* ── CONTEXT_MANAGERS ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_PY_MODERN_CONTEXT_MANAGERS',
    notes: `Files, database connections, locks, temporary directories and network sockets all have to be
released, and released even when the code in between raises. \`with\` is how Python guarantees that.

## What with does

    with open('report.csv', encoding='utf-8') as f:
        data = f.read()
    # f is closed here, whether read() succeeded or raised

is roughly:

    mgr = open('report.csv', encoding='utf-8')
    f = mgr.__enter__()
    try:
        data = f.read()
    except BaseException as e:
        if not mgr.__exit__(type(e), e, e.__traceback__):
            raise                                # re-raise unless __exit__ returned True
    else:
        mgr.__exit__(None, None, None)

\`__enter__\`'s return value is what \`as\` binds. \`__exit__\` runs on every way out of the block —
normal end, exception, \`return\`, \`break\`. If it returns a **truthy** value, the exception is
**suppressed**; \`None\` (the usual) lets it propagate.

## Writing one as a class

    import time

    class Timer:
        def __init__(self, label):
            self.label = label
        def __enter__(self):
            self.start = time.perf_counter()
            return self
        def __exit__(self, exc_type, exc, tb):
            self.elapsed = time.perf_counter() - self.start
            print(f'{self.label}: {self.elapsed:.3f}s')
            return False            # never swallow the caller's exception

    with Timer('import'):
        load_csv()

Returning \`True\` from \`__exit__\` "just in case" is a serious bug: every exception in the block —
including a typo's \`NameError\` — vanishes silently.

## Writing one as a generator: contextlib.contextmanager

    from contextlib import contextmanager

    @contextmanager
    def db_transaction(conn):
        cur = conn.cursor()
        try:
            yield cur              # the body of the with-block runs here
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            cur.close()

Code before \`yield\` is setup, the yielded value is what \`as\` binds, code after is teardown. The
exception from the with-block is **re-raised at the yield**, so teardown that is not inside
\`try/finally\` is skipped when the block fails:

    @contextmanager
    def opened(name):
        print('open', name)
        yield name
        print('close', name)     # NOT printed if the with-block raises

This is the single most common contextmanager bug. Put cleanup in \`finally\`.

## Several resources

    with open('in.txt') as src, open('out.txt', 'w') as dst:
        dst.write(src.read())

Managers are entered left to right and exited in **reverse** order (the last one opened closes
first). Python 3.10 officially allows wrapping a long list in parentheses across lines.

When the number of resources is only known at runtime, use \`ExitStack\`:

    from contextlib import ExitStack

    with ExitStack() as stack:
        files = [stack.enter_context(open(p)) for p in paths]
        merge(files)
    # every file that was opened is closed — even if opening the 7th one failed

## Two small helpers worth knowing

    from contextlib import suppress
    import os

    with suppress(FileNotFoundError):
        os.remove('cache.tmp')       # fine if it was never there

\`suppress\` is the honest version of \`try: ... except X: pass\` — but name the specific exception,
never \`Exception\`. Note that the rest of the block is skipped after the exception:

    with suppress(KeyError):
        value = settings['theme']
        print('unreached if the key is missing')

\`contextlib.closing(obj)\` calls \`obj.close()\` on exit for objects that have \`close\` but are not
context managers. Locks (\`threading.Lock\`) are context managers too: \`with lock:\` acquires and
always releases.

## return inside with

    def first_line(path):
        with open(path) as f:
            return f.readline()   # __exit__ runs (the file closes) before the caller gets the value

## Common mistakes and interview traps

- \`f = open(path)\` with no \`with\` and no \`close\` — on CPython the file usually closes when \`f\` is
  garbage-collected, on other interpreters and in long loops it does not; "too many open files" in
  production.
- A \`@contextmanager\` generator that yields twice, or never — \`RuntimeError\`.
- Using the file object after the block: \`f.read()\` there raises \`ValueError: I/O operation on
  closed file\`.`,
    mcqs: [
      mcq(`What does this print?

    class Quiet:
        def __enter__(self):
            print('enter')
            return self
        def __exit__(self, exc_type, exc, tb):
            print('exit', exc_type.__name__ if exc_type else None)
            return True

    with Quiet():
        1 / 0
        print('never')
    print('after')`, [
        ['enter, exit ZeroDivisionError, and then a traceback', false],
        ['enter, exit ZeroDivisionError, after', true],
        ['enter, never, exit None, after', false],
        ['enter, exit None, after', false],
      ], 'The division raises, so the rest of the block is skipped and __exit__ receives ZeroDivisionError. It returns True, which suppresses the exception, so execution continues after the with.'),
      mcq(`What does this print?

    from contextlib import contextmanager

    @contextmanager
    def opened(name):
        print('open', name)
        yield name
        print('close', name)

    try:
        with opened('a.txt'):
            raise ValueError('bad')
    except ValueError:
        print('caught')`, [
        ['open a.txt, close a.txt, caught', false],
        ['open a.txt, caught, close a.txt', false],
        ['open a.txt, caught', true],
        ['caught', false],
      ], 'The block\'s exception is re-raised inside the generator at the yield. With no try/finally around the yield, the line after it never runs, so close is skipped. Cleanup belongs in finally.'),
      mcq('A script must open a list of input files whose length is only known at runtime and guarantee all of them close. What is the right tool?', [
        ['A for loop of nested with statements, one per file', false],
        ['contextlib.suppress around each open() call', false],
        ['open() in a list comprehension, then del the list', false],
        ['contextlib.ExitStack with enter_context per file', true],
      ], 'ExitStack registers each manager as it is entered and exits all of them, in reverse order, when its own block ends, including when a later open fails. Nested with statements cannot vary in number.'),
    ],
    checkpoint: [
      mcq(`What is the order of the printed lines?

    class Named:
        def __init__(self, n): self.n = n
        def __enter__(self): print('enter', self.n); return self
        def __exit__(self, *exc): print('exit', self.n)

    with Named(1), Named(2):
        print('body')`, [
        ['enter 1, enter 2, body, exit 1, exit 2', false],
        ['enter 1, enter 2, body, exit 2, exit 1', true],
        ['enter 2, enter 1, body, exit 1, exit 2', false],
        ['enter 1, exit 1, enter 2, body, exit 2', false],
      ], 'Managers are entered left to right and exited in reverse, like nested with blocks: the last one entered is the first one exited.'),
      mcq(`What does this print?

    from contextlib import suppress

    with suppress(KeyError):
        {}['x']
        print('unreached')
    print('went on')`, [
        ['unreached, then went on', false],
        ['Only a KeyError traceback', false],
        ['went on', true],
        ['unreached', false],
      ], 'The KeyError ends the with-block at once, and suppress swallows it on exit. The line after the failing lookup is skipped, and execution resumes after the block.'),
      mcq('A `@contextmanager` function wraps a database cursor. Where must `cursor.close()` go so it runs even when the with-block raises?', [
        ['On the line straight after the yield', false],
        ['In a finally clause around the yield', true],
        ['Before the yield, so it runs first', false],
        ['In the caller, after the with-block', false],
      ], 'An exception from the block is thrown into the generator at the yield, so plain code after the yield is skipped. A finally around the yield runs on success and on failure.'),
    ],
  },

  /* ── TYPE_HINTS_DATACLASSES ────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_PY_MODERN_TYPE_HINTS_DATACLASSES',
    notes: `FastAPI builds request validation from type hints. Django and SQLAlchemy 2.0 use annotations
to describe models. Every serious Python codebase you join will be typed and checked by **mypy**
(or pyright) in CI. This unit is the vocabulary.

## Hints are documentation the tools can check — not runtime checks

    def twice(x: int) -> int:
        return x * 2

    twice('ab')     # 'abab' — Python itself does not check the hint

The interpreter stores annotations in \`twice.__annotations__\` and otherwise ignores them. **mypy**
reads them without running the code and reports \`Argument 1 to "twice" has incompatible type
"str"; expected "int"\`. Run it in a project with \`pip install mypy\` and \`mypy src/\`; add
\`--strict\` once the codebase is clean.

## The everyday annotations (3.10+ syntax)

    def find_user(user_id: int) -> dict[str, str] | None: ...
    names: list[str] = []
    scores: dict[str, float] = {}
    point: tuple[int, int] = (3, 4)
    row: tuple[str, ...] = ('a', 'b', 'c')       # any length

- \`X | None\` is the same as \`Optional[X]\` from \`typing\`. **Optional means "may be None"**,
  not "this argument may be left out" — that is what a default value does.
- \`list[str]\` and \`dict[str, int]\` work directly on 3.9+; older code imports \`List\`, \`Dict\`.
- \`from collections.abc import Iterable, Iterator, Callable\` for parameters: accept the most
  general type you use (\`Iterable[str]\`), return the most specific you produce (\`list[str]\`).
- A generator function returns \`Iterator[T]\` (or \`Generator[T, None, None]\`).

## Shapes for dicts and duck types

    from typing import TypedDict, Protocol

    class MovieRow(TypedDict):
        title: str
        year: int

    m: MovieRow = {'title': 'Sholay', 'year': 1975}   # at runtime: an ordinary dict

    class Notifier(Protocol):
        def send(self, to: str, text: str) -> None: ...

    class SmsNotifier:                 # does NOT inherit Notifier
        def send(self, to: str, text: str) -> None: ...

    def alert(n: Notifier) -> None: ...
    alert(SmsNotifier())               # accepted: it has a matching send()

\`TypedDict\` types JSON-shaped dicts key by key. \`Protocol\` is **structural** typing: any class with
the right methods qualifies, no inheritance needed — the type-checker's version of duck typing.
Neither checks anything at runtime.

## @dataclass

    from dataclasses import dataclass, field

    @dataclass
    class Order:
        order_id: int
        customer: str
        items: list[str] = field(default_factory=list)
        paid: bool = False

    o = Order(1, 'asha')
    o                      # Order(order_id=1, customer='asha', items=[], paid=False)
    o == Order(1, 'asha')  # True — __eq__ compares fields

\`@dataclass\` writes \`__init__\`, \`__repr__\` and \`__eq__\` from the annotations. Rules worth knowing:

- **Mutable defaults are refused.** \`items: list = []\` raises \`ValueError\` when the class is
  defined ("mutable default ... is not allowed: use default_factory"). \`field(default_factory=list)\`
  makes a fresh list per instance — the dataclass answer to the mutable-default-argument trap.
- **Fields with defaults come last.** A field without a default after one with a default is a
  \`TypeError\` at class creation (3.10 added \`kw_only=True\` to lift that).
- \`@dataclass(frozen=True)\` makes instances immutable (assigning raises
  \`dataclasses.FrozenInstanceError\`) and hashable, so they can be dict keys and set members. To
  "change" one, build a copy: \`dataclasses.replace(p, x=5)\`.
- A plain \`@dataclass\` sets \`__hash__\` to \`None\` because it defines \`__eq__\` on mutable fields:
  putting one in a set raises \`TypeError: unhashable type\`.
- \`@dataclass(order=True)\` adds \`<\`, \`>\` etc. comparing fields **as a tuple, in declaration
  order**.
- \`@dataclass(slots=True)\` (3.10+) uses \`__slots__\`: less memory per instance and assigning an
  attribute that is not a field raises \`AttributeError\` instead of silently creating it.
- \`dataclasses.asdict(o)\` converts recursively to a dict, ready for \`json.dumps\`.

## Enum

    from enum import Enum, auto

    class Status(Enum):
        ACTIVE = 'active'
        BLOCKED = 'blocked'

    Status('blocked')         # Status.BLOCKED — look up by value (ValueError if unknown)
    Status['ACTIVE']          # Status.ACTIVE — look up by name
    Status.ACTIVE.value       # 'active'
    Status.ACTIVE == 'active' # False — an Enum member is not equal to its raw value

Use \`auto()\` when the values do not matter. When members must compare equal to strings (to go
straight into JSON or a database column), \`class Status(str, Enum)\` works on 3.10, and
\`enum.StrEnum\` is the 3.11+ spelling. Two members with the same value make the second an
**alias** of the first.

## Common mistakes and interview traps

- Believing hints are enforced. They are not — validation needs pydantic, FastAPI or explicit checks.
- \`def f(x: Optional[int])\` and then calling \`f()\`: still a \`TypeError\`, the argument is required.
- Comparing an Enum member to a string and always getting \`False\`.`,
    mcqs: [
      mcq(`What happens when this module is imported?

    from dataclasses import dataclass

    @dataclass
    class Post:
        title: str
        tags: list = []`, [
        ['It imports fine, and all Post objects share one tags list', false],
        ['It imports fine, and each Post gets a fresh tags list', false],
        ['It raises ValueError and suggests default_factory', true],
        ['It imports, but Post() then fails with TypeError', false],
      ], 'dataclass refuses list, dict and set defaults when the class is created, precisely to stop the shared-mutable-default bug. tags: list = field(default_factory=list) gives each instance its own list.'),
      mcq(`What does this print?

    from enum import Enum

    class Status(Enum):
        ACTIVE = 'active'
        BLOCKED = 'blocked'

    print(Status.ACTIVE == 'active', Status('blocked'))`, [
        ['True Status.BLOCKED', false],
        ['False Status.BLOCKED', true],
        ['False blocked', false],
        ['True blocked', false],
      ], 'A plain Enum member never equals its raw value, so the comparison is False. Status(\'blocked\') looks the member up by value, and printing a member shows Status.BLOCKED.'),
      mcq('A function is declared `def find(uid: int, cache: Optional[dict] = None) -> Optional[str]`. What does `Optional[str]` on the return tell a reader?', [
        ['find may skip its return statement altogether', false],
        ['The caller is allowed to ignore what comes back', false],
        ['find returns a str or None, so callers check None', true],
        ['The return value is converted to str at runtime', false],
      ], 'Optional[X] is X | None: the value can be absent. It says nothing about whether an argument may be omitted (that is the default) and Python performs no conversion or check.'),
    ],
    checkpoint: [
      mcq(`What does this print?

    def twice(x: int) -> int:
        return x * 2

    print(twice('ab'))`, [
        ['It raises TypeError because x must be an int', false],
        ['abab', true],
        ['It raises ValueError converting ab to int', false],
        ['None, since the hint check fails', false],
      ], 'Annotations are not enforced at runtime. \'ab\' * 2 is \'abab\'. A static checker such as mypy would flag the call before the code ever ran.'),
      mcq(`What is printed?

    from dataclasses import dataclass

    @dataclass(order=True)
    class Version:
        major: int
        minor: int

    vs = sorted([Version(1, 10), Version(1, 2), Version(0, 99)])
    print([(v.major, v.minor) for v in vs])`, [
        ['[(1, 10), (1, 2), (0, 99)]', false],
        ['[(0, 99), (1, 10), (1, 2)]', false],
        ['[(1, 2), (1, 10), (0, 99)]', false],
        ['[(0, 99), (1, 2), (1, 10)]', true],
      ], 'order=True compares instances as tuples of their fields in declaration order: (0, 99) < (1, 2) < (1, 10). The ints compare numerically, so 2 sorts before 10.'),
      mcq('After `from dataclasses import replace`, a `@dataclass(frozen=True) class Point` has fields x and y, and `p = Point(1, 2)`. Which statement runs without raising?', [
        ['p.x = 5', false],
        ['setattr(p, \'x\', 5)', false],
        ['q = replace(p, x=5)', true],
        ['del p.x; p.x = 5', false],
      ], 'A frozen dataclass blocks assignment and deletion through every route, raising FrozenInstanceError. replace builds a new Point with x changed and leaves p untouched.'),
    ],
  },

  /* ── ASYNC_BASICS ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_PY_MODERN_ASYNC_BASICS',
    notes: `A web server spends most of its time **waiting**: for the database, for another API, for the
client to send bytes. \`asyncio\` lets one thread start many such waits and work on whichever finishes
first. FastAPI, aiohttp and async Django views are built on it.

## Coroutines and the event loop

    import asyncio

    async def fetch(name: str, delay: float) -> str:
        await asyncio.sleep(delay)      # stands in for a network call
        print('done', name)
        return name.upper()

    asyncio.run(fetch('a', 0.1))

- \`async def\` defines a **coroutine function**. Calling it does **not** run it — it returns a
  coroutine object. Forgetting \`await\` produces "RuntimeWarning: coroutine ... was never awaited" and
  the work silently never happens.
- \`await x\` pauses *this* coroutine until \`x\` finishes and hands control back to the **event loop**,
  which runs other coroutines meanwhile.
- \`asyncio.run(main())\` creates the loop, runs \`main\` to completion and closes the loop. Call it
  once, at the top of the program.

## Sequential versus concurrent

    async def main():
        await fetch('p', 0.2)
        await fetch('q', 0.2)            # about 0.4 s: the second starts after the first

    async def main():
        results = await asyncio.gather(fetch('a', 0.3), fetch('b', 0.1))
        print(results)                    # ['A', 'B'] after about 0.3 s

\`gather\` runs its arguments concurrently and returns results **in the order of the arguments**, not
the order they finished (b prints "done" first, but its result is still second).

\`asyncio.create_task(coro)\` schedules a coroutine to start running at the next \`await\`, and returns a
handle to await later:

    async def main():
        t1 = asyncio.create_task(fetch('m', 0.2))
        t2 = asyncio.create_task(fetch('n', 0.2))
        # ... other work here ...
        await t1
        await t2                          # about 0.2 s in total

Keep a reference to every task you create: the loop holds tasks only weakly, and an unreferenced
task can be garbage-collected mid-flight.

## Errors and timeouts

    results = await asyncio.gather(fetch('ok', 0), failing(), return_exceptions=True)
    # ['OK', ValueError(...)] — exceptions come back as values instead of cancelling the call

Without \`return_exceptions=True\`, the first exception propagates out of \`gather\` (the other
awaitables keep running unless you cancel them).

    try:
        await asyncio.wait_for(fetch('slow', 5), timeout=1.0)
    except asyncio.TimeoutError:          # an alias of the built-in TimeoutError from 3.11
        ...

\`wait_for\` cancels the slow coroutine when the time is up. Python 3.11 added
\`async with asyncio.timeout(1.0):\` and \`asyncio.TaskGroup\`, the structured replacement for
\`gather\`; on 3.10 use \`wait_for\` and \`gather\`.

## What async does NOT help: blocking calls

The event loop is one thread. A coroutine that calls a **blocking** function holds that thread and
nothing else can run:

    async def bad(name):
        time.sleep(0.2)       # blocks the whole loop
        return name

    await asyncio.gather(bad('x'), bad('y'), bad('z'))   # about 0.6 s — no concurrency at all

\`time.sleep\`, \`requests.get\`, a synchronous database driver, reading a big file and heavy CPU work
all block. The fixes:

- use the async library instead (\`asyncio.sleep\`, \`httpx.AsyncClient\`, \`aiomysql\`, \`asyncpg\`);
- push an unavoidable blocking call to a thread: \`await asyncio.to_thread(requests.get, url)\` (3.9+);
- for CPU-bound work (image resizing, number crunching), async is the **wrong tool** — use a process
  pool (\`concurrent.futures.ProcessPoolExecutor\`) so the work runs on other cores.

## Choosing the tool

| Work | Tool |
|---|---|
| Many network/database waits | asyncio (or threads for blocking libraries) |
| A few blocking calls in an async app | \`asyncio.to_thread\` |
| CPU-heavy computation | multiprocessing / ProcessPoolExecutor |

Threads in CPython share the GIL, so they help with waiting but not with pure-Python computation.

## Common mistakes and interview traps

- Calling \`fetch()\` without \`await\` — the body never runs.
- \`await\` outside an \`async def\` is a \`SyntaxError\` (except in the asyncio REPL and notebooks).
- \`asyncio.run\` inside an already-running loop (a Jupyter cell, a FastAPI handler) raises
  \`RuntimeError\`; there you just \`await\`.
- Saying "async makes code faster". It makes **waiting** overlap; a single computation is not faster.`,
    mcqs: [
      mcq(`Roughly how long does \`main()\` take, and what is \`results\`?

    async def fetch(name, delay):
        await asyncio.sleep(delay)
        return name.upper()

    async def main():
        results = await asyncio.gather(fetch('a', 0.3), fetch('b', 0.1))`, [
        ['About 0.4 s, and results is [\'A\', \'B\']', false],
        ['About 0.3 s, and results is [\'B\', \'A\']', false],
        ['About 0.3 s, and results is [\'A\', \'B\']', true],
        ['About 0.1 s, and results is [\'B\']', false],
      ], 'gather runs both concurrently, so the total is the longer delay, 0.3 s. Results come back in the order the awaitables were passed, not the order they completed.'),
      mcq(`Each call blocks for 0.2 s. Roughly how long does the gather take?

    async def lookup(name):
        time.sleep(0.2)
        return name

    async def main():
        await asyncio.gather(lookup('x'), lookup('y'), lookup('z'))`, [
        ['About 0.6 s', true],
        ['About 0.2 s', false],
        ['About 0.0 s', false],
        ['It never ends, a deadlock', false],
      ], 'time.sleep blocks the event loop thread, so the three coroutines cannot overlap and run one after another. asyncio.sleep, or asyncio.to_thread(time.sleep, 0.2), would let them overlap.'),
      mcq('A FastAPI endpoint must resize a 20 MB image with a pure-Python loop before replying. What is the right approach?', [
        ['Mark the function async def so the loop does it faster', false],
        ['Split the work into many small asyncio.gather tasks', false],
        ['Add await asyncio.sleep(0) inside the resize loop', false],
        ['Run the resize in a process pool, off the event loop', true],
      ], 'The resize is CPU-bound. Async only overlaps waiting, and on one thread the work still runs serially and blocks other requests. A process pool runs it on another core.'),
    ],
    checkpoint: [
      mcq(`What does this print?

    async def hello():
        print('hello ran')
        return 'hi'

    async def main():
        r = hello()
        print(type(r).__name__)

    asyncio.run(main())`, [
        ['hello ran, then str', false],
        ['coroutine, and hello ran is never printed', true],
        ['hello ran, then coroutine', false],
        ['It raises SyntaxError for the missing await', false],
      ], 'Calling a coroutine function only creates a coroutine object; its body does not start until awaited. Python warns that it was never awaited, but nothing inside hello runs.'),
      mcq(`In what order are the lines printed?

    async def worker(n):
        print('start', n)
        await asyncio.sleep(0)
        print('end', n)

    async def main():
        await asyncio.gather(worker(1), worker(2))`, [
        ['start 1, end 1, start 2, end 2', false],
        ['start 1, start 2, end 2, end 1', false],
        ['start 2, start 1, end 2, end 1', false],
        ['start 1, start 2, end 1, end 2', true],
      ], 'Each await hands control back to the loop. worker 1 runs until its await, then worker 2 does the same, then each resumes in turn. That interleaving is exactly what cooperative concurrency means.'),
      mcq('`await asyncio.gather(a(), b(), c())` is called without return_exceptions and b raises ValueError. What does the caller see?', [
        ['A list with None where b\'s result would be', false],
        ['The ValueError, raised out of the await', true],
        ['A list holding the ValueError object as b\'s result', false],
        ['Nothing at all until a and c both finish', false],
      ], 'By default the first exception propagates from gather to the awaiting code. Only return_exceptions=True turns exceptions into values in the result list.'),
    ],
  },

  /* ── DEBUGGING ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_PY_MODERN_DEBUGGING',
    notes: `Seven bugs from real Python code reviews. None of them raises an obvious error at the line that
is wrong — that is why they survive. For each: the symptom, the cause, the fix.

## 1. The cart that remembers other customers

    def add_to_cart(item, cart=[]):
        cart.append(item)
        return cart

**Symptom.** In a Flask app, a new user's cart already contains another user's items.
**Cause.** The default list is created once when the module loads and shared by every call that
omits \`cart\`. **Fix.** \`cart=None\`, then \`if cart is None: cart = []\`.

## 2. Every button deletes the last row

    for row_id in [101, 102, 103]:
        buttons.append(Button(on_click=lambda: delete(row_id)))

**Symptom.** Whichever button is clicked, row 103 is deleted.
**Cause.** Late binding: each lambda looks \`row_id\` up when it runs, after the loop has finished.
**Fix.** \`lambda row_id=row_id: delete(row_id)\` or \`functools.partial(delete, row_id)\`.

## 3. The second report is empty

    rows = (parse(line) for line in open('sales.csv'))
    total = sum(r.amount for r in rows)
    top = max(rows, key=lambda r: r.amount)     # ValueError: the iterable is empty

**Cause.** \`rows\` is a generator; the first pass exhausted it. **Fix.** If you need two passes,
\`rows = list(...)\` (it fits in memory) or compute both in one loop. Also open the file with \`with\`.

## 4. Every decorated view returns None

    def login_required(view):
        def wrapper(*args, **kwargs):
            if not current_user():
                return redirect('/login')
            view(*args, **kwargs)
        return wrapper

**Symptom.** Logged-in users get a blank page. **Cause.** The wrapper calls \`view\` but drops its
result. **Fix.** \`return view(*args, **kwargs)\` — and add \`@functools.wraps(view)\`, or Flask
complains that two endpoints share the name \`wrapper\`.

## 5. The lock that is never released

    @contextmanager
    def locked(lock):
        lock.acquire()
        yield
        lock.release()

**Symptom.** After one failed request every other request hangs.
**Cause.** The failure was raised at the \`yield\`; \`release()\` after it was skipped.
**Fix.** \`try: yield\` / \`finally: lock.release()\` — or simply \`with lock:\`.

## 6. Shared tags across instances

    class Article:
        tags = []                       # class attribute, shared
        def __init__(self, title):
            self.title = title

**Symptom.** Tagging one article tags all of them. **Cause.** \`self.tags.append\` mutates the one
list on the class. **Fix.** Create it in \`__init__\` (\`self.tags = []\`) or, as a dataclass,
\`tags: list[str] = field(default_factory=list)\`.

## 7. The async endpoint that is slower than the sync one

    async def get_rates():
        r = requests.get(RATES_URL, timeout=5)    # blocking
        return r.json()

**Symptom.** Under load, every request waits behind every other one.
**Cause.** \`requests.get\` blocks the event loop thread, so no other coroutine runs during the call.
**Fix.** Use an async client (\`async with httpx.AsyncClient() as c: r = await c.get(...)\`) or
\`await asyncio.to_thread(requests.get, RATES_URL, timeout=5)\`.

A close cousin: \`fetch_rates()\` called without \`await\` — the coroutine object is created, a
"never awaited" warning is logged, and the work silently does not happen.

## How to find these faster

- Run \`mypy\` and a linter (ruff/flake8-bugbear flag mutable defaults, loop-variable closures and
  unused coroutines).
- Start Python with \`-X dev\` or \`PYTHONASYNCIODEBUG=1\` to see slow callbacks that block the loop.
- When a value "changes by itself", ask: **is this object shared?** \`id(obj)\` in two places tells
  you.`,
    mcqs: [
      mcq('A Flask app\'s `add_to_cart(item, cart=[])` shows one user\'s items in another user\'s cart. What is the root cause?', [
        ['Flask shares the request object between different users', false],
        ['The default list is made once and reused by every call', true],
        ['append is not thread-safe, so the items get mixed up', false],
        ['The browser caches the earlier cart response', false],
      ], 'Default values are evaluated once, when def runs. Every call that omits cart appends to that single list, which lives as long as the process. Use None as the default and create the list inside.'),
      mcq(`A report computes a total and then a maximum from the same rows. What happens on the last line?

    rows = (int(x) for x in ['4', '9', '2'])
    total = sum(rows)
    biggest = max(rows)`, [
        ['biggest is 9, the largest of the three values', false],
        ['biggest is 0, because the rows are now empty', false],
        ['max raises ValueError: the iterable is empty', true],
        ['biggest is None, as the generator is spent', false],
      ], 'sum consumed the generator, so max receives an exhausted iterator and has nothing to compare. max of an empty iterable raises ValueError unless a default= is given.'),
      mcq('A `@contextmanager` acquires a lock, yields, then calls `lock.release()` on the next line. After one request fails inside the with-block, all later requests hang. Why?', [
        ['The lock was released twice, which corrupted it', false],
        ['contextmanager cannot be used with threading locks', false],
        ['The yield returned None instead of the lock object', false],
        ['The error was raised at the yield and skipped release', true],
      ], 'An exception in the block is thrown into the generator at the yield, so code after it does not run. Wrapping the yield in try/finally, or using with lock:, guarantees the release.'),
      mcq('An `async def` FastAPI handler calls `requests.get(url)` and the service stalls under load. Which change fixes it?', [
        ['Await an async HTTP client such as httpx.AsyncClient', true],
        ['Raise the timeout passed to requests.get', false],
        ['Wrap the requests.get call inside asyncio.run()', false],
        ['Put the requests.get call in a generator function', false],
      ], 'requests.get blocks the single event-loop thread, so no other request progresses during the call. An async client awaits instead; asyncio.to_thread is the fallback for a library with no async version.'),
    ],
  },

  /* ── PRACTICE ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_PY_MODERN_PRACTICE',
    notes: `No new ideas: repetition until these forms come out without thinking. Write each exercise in a
file, **predict the output before running it**, then run it.

**Exercise 1 — Comprehension rewrite.** Rewrite as one comprehension, then say whether it reads
better:

    result = {}
    for name, marks in students:
        if marks >= 60:
            result[name.title()] = marks

**Exercise 2 — A lazy chunker.** Write a generator \`chunks(iterable, n)\` that yields lists of up to
\`n\` items using \`itertools.islice\`, and works on an infinite \`itertools.count()\` when combined with
\`islice\` on the outside. \`list(chunks(range(7), 3))\` must be \`[[0, 1, 2], [3, 4, 5], [6]]\`.

**Exercise 3 — A decorator with an argument.** Write \`@slow_warning(ms=200)\` that prints
\`<name> slow: <elapsed> ms\` only when the call took longer than \`ms\`, returns the function's result
unchanged and keeps its \`__name__\` (use \`functools.wraps\`).

**Exercise 4 — Two context managers.** Write \`cd(path)\` that changes the working directory and
always changes back, first as a class with \`__enter__\`/\`__exit__\`, then with
\`@contextmanager\`. Prove the "always": raise inside the block and print \`os.getcwd()\` afterwards.

**Exercise 5 — Model with a dataclass.** A \`Ticket\` has an \`id\`, a \`title\`, a \`Priority\` enum
(LOW, MEDIUM, HIGH), \`labels\` (a list, default empty) and is ordered by priority then id. Show that
two tickets do not share \`labels\`, and sort a list of five tickets.

**Exercise 6 — Concurrent waits.** With \`asyncio.sleep\` standing in for HTTP calls of 0.3, 0.5 and
0.2 s, print the three results and the total time, first awaited one by one, then with \`gather\`.
Then replace one \`asyncio.sleep\` with \`time.sleep\` and explain the new timing.

## The graded exercise — Sensor stream summary

A generator pipeline that reads readings from standard input and prints per-sensor statistics. Your
program is run against test cases, so the output format must match exactly. The full specification
is in the assignment.`,
    mcqs: [
      mcq('In Exercise 1, which comprehension is equivalent to the loop?', [
        ['{name.title(): marks for name, marks in students if marks >= 60}', true],
        ['{name.title(): marks if marks >= 60 for name, marks in students}', false],
        ['[name.title(): marks for name, marks in students if marks >= 60]', false],
        ['{name.title() for name, marks in students if marks >= 60}', false],
      ], 'A dict comprehension needs braces, a key: value pair and the filter after the for. An if without else before the for is a syntax error, square brackets cannot hold key: value, and the last builds a set.'),
      mcq('In Exercise 2, `chunks(range(7), 3)` is first written to use `len(iterable)`. Why does that break the exercise?', [
        ['len() is too slow on a range of seven items', false],
        ['range objects do not support len() at all', false],
        ['Generators and count() have no len()', true],
        ['len() would make the chunks come out in reverse', false],
      ], 'The point of the generator is to accept any iterable, including generators and infinite count(), which have no length. Pulling n items at a time with islice needs no length at all.'),
      mcq('In Exercise 3, the slow_warning wrapper prints the warning but callers now always receive None. What was left out?', [
        ['The functools.wraps decorator on the wrapper', false],
        ['The **kwargs parameter of the wrapper', false],
        ['A return of the wrapped function\'s result', true],
        ['A nonlocal declaration for the ms parameter', false],
      ], 'A wrapper that calls fn(...) without returning its value makes the decorated function return None. wraps only copies metadata, and ms is only read, so it needs no nonlocal.'),
      mcq('In Exercise 5, `labels: list = []` is written on the Ticket dataclass. What happens?', [
        ['Every Ticket shares one labels list', false],
        ['Each Ticket gets its own empty labels list', false],
        ['Defining the class raises ValueError', true],
        ['labels silently becomes a tuple', false],
      ], 'dataclass rejects mutable defaults (list, dict, set) when the class body is processed and tells you to use field(default_factory=list), which creates a new list per instance.'),
      mcq(`In Exercise 6, one wait is changed to a blocking call. Roughly how long does the gather take?

    async def wait(d): await asyncio.sleep(d)
    async def block(d): time.sleep(d)

    await asyncio.gather(wait(0.3), block(0.5), wait(0.2))`, [
        ['About 0.5 s, the longest of the three', false],
        ['About 1.0 s, all three back to back', false],
        ['About 0.7 s, block then the last wait', true],
        ['About 0.3 s, as the waits overlap it', false],
      ], 'The first wait starts its sleep and yields; block then holds the loop for 0.5 s, during which that sleep finishes. The last wait only starts after block returns, adding 0.2 s.'),
    ],
    assignment: {
      title: 'Sensor Stream Summary with Generators',
      description: 'Read sensor readings from standard input through a generator pipeline, skip comments and malformed lines, and print per-sensor statistics in one pass.',
      instructions: `Write a Python program that reads lines from standard input until end of input and summarises
sensor readings.

**Input**

Each line, after stripping surrounding whitespace, is one of:

- **blank**, or starting with \`#\` — a comment: ignore it, do not count it;
- **a reading**: exactly two whitespace-separated fields \`<sensor> <value>\`, where \`<value>\` is a
  number that \`float()\` accepts and that is finite (not \`nan\` or \`inf\`);
- **anything else** — malformed: count it and skip it. That includes a wrong number of fields and a
  value that is not a finite number.

**What to compute**

For every sensor: the count of valid readings, the minimum, the maximum and the average.

A **spike** is a reading that is **more than 10** greater than the previous valid reading of the
**same** sensor (exactly 10 is not a spike; the first reading of a sensor is never a spike).

**Output**

One line per sensor, sensors in alphabetical order, numbers with two decimals:

    <sensor>: n=<count> min=<min> max=<max> avg=<average>

If there were no valid readings at all, print the single line \`No readings\` instead. Then always
print:

    Spikes: <number of spikes>
    Malformed: <number of malformed lines>

**Example**

Input:

    t1 20.5
    t2 18
    t1 22.5
    t2 31

Output:

    t1: n=2 min=20.50 max=22.50 avg=21.50
    t2: n=2 min=18.00 max=31.00 avg=24.50
    Spikes: 1
    Malformed: 0

(t2 went from 18 to 31, a rise of 13.)

**Design (this is what the exercise is for)**

- \`clean_lines(stream)\` is a **generator** that yields the stripped, non-blank, non-comment lines.
- \`parse(lines, bad)\` is a **generator** that yields \`(sensor, value)\` pairs and counts malformed
  lines.
- \`main\` consumes the pipeline **exactly once**, in a single loop, and never builds a list of all
  readings — the program must work on an input too large to hold in memory.

**How it is graded**

Your program is run against every test case — the examples you can see and several you cannot — and
scored on how many it passes. Output is compared line by line. A reviewer uses the rubric for the
design marks.`,
      rubric: [
        { criterion: 'Correct output', description: 'Every line matches for every test case, including comments, malformed and non-finite values, an exactly-10 rise and input with no readings.', maxPoints: 60 },
        { criterion: 'Generator pipeline', description: 'clean_lines and parse are generators; the readings are consumed once in a single loop; no list of all readings is built.', maxPoints: 25 },
        { criterion: 'Clarity', description: 'Small functions with type hints, clear names, no repeated parsing logic and no bare except.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys
import math


def clean_lines(stream):
    """Yield each line, stripped, that is not blank and not a # comment."""
    # TODO: make this a generator: loop over stream and yield the lines to keep
    ...


def parse(lines, bad):
    """Yield (sensor, value) pairs. Add 1 to bad['count'] for every malformed line."""
    # TODO: make this a generator too
    ...


def main():
    bad = {'count': 0}
    readings = parse(clean_lines(sys.stdin), bad)
    # TODO: consume readings ONCE: per-sensor count/min/max/total, and spikes
    # TODO: print the report in the format the instructions give


main()
`,
        tests: [
          { input: 't1 20.5\nt2 18\nt1 22.5\nt2 31\n', expectedOutput: 't1: n=2 min=20.50 max=22.50 avg=21.50\nt2: n=2 min=18.00 max=31.00 avg=24.50\nSpikes: 1\nMalformed: 0' },
          { input: '# morning readings\na 5\n\na x\nb 1 2\nb 3\nc\n', expectedOutput: 'a: n=1 min=5.00 max=5.00 avg=5.00\nb: n=1 min=3.00 max=3.00 avg=3.00\nSpikes: 0\nMalformed: 3' },
          { input: '# nothing today\n\n', expectedOutput: 'No readings\nSpikes: 0\nMalformed: 0', isHidden: true },
          { input: 'zeta -5\nalpha 0\nzeta 5\nzeta 15.5\nalpha 10\nbeta2 -2.25\n', expectedOutput: 'alpha: n=2 min=0.00 max=10.00 avg=5.00\nbeta2: n=1 min=-2.25 max=-2.25 avg=-2.25\nzeta: n=3 min=-5.00 max=15.50 avg=5.17\nSpikes: 1\nMalformed: 0', isHidden: true },
          { input: '  s1   7  \ns1 nan\ns1 inf\ns1 19\n', expectedOutput: 's1: n=2 min=7.00 max=19.00 avg=13.00\nSpikes: 1\nMalformed: 2', isHidden: true },
          { input: 'bad\n', expectedOutput: 'No readings\nSpikes: 0\nMalformed: 1', isHidden: true },
          { input: 'a 0\nb 100\na 11\nb 50\na 30\nb 61\n', expectedOutput: 'a: n=3 min=0.00 max=30.00 avg=13.67\nb: n=3 min=50.00 max=100.00 avg=70.33\nSpikes: 3\nMalformed: 0', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 60,
      },
    },
  },

  /* ── INTERVIEW_QUESTION ────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_PY_MODERN_INTERVIEW_QUESTION',
    notes: `Three questions a Python full-stack interview almost always reaches. For each: the answer that
gets you through, and the follow-up a good answer earns.

## 1. "What is a generator, and when would you use one instead of a list?"

**Model answer.** A generator is an iterator produced by a function containing \`yield\` (or a
generator expression). It computes values on demand and keeps only its current state, so memory use
is constant however many values it produces. I use one when the data is large or unbounded — streaming
a log file, paging through an API, reading database rows — or when the consumer may stop early.
I use a list when I need the data more than once, need \`len()\` or indexing, or the data is small.

**Follow-up:** "What happens if you iterate a generator twice?" The second loop sees nothing — the
generator is exhausted, and there is no error. Store a list, or call the generator function again.
**Follow-up:** "\`yield\` versus \`return\`?" \`return\` ends the function; \`yield\` pauses it with its
locals intact and resumes on the next \`next()\`.

## 2. "Explain decorators. Write one."

**Model answer.** A decorator is a callable that takes a function and returns a replacement,
usually a wrapper that adds behaviour before and after the call. \`@timed\` over a def is just
\`f = timed(f)\`. It works because functions are first-class objects and the wrapper is a closure
over the original:

    def timed(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            start = time.perf_counter()
            try:
                return fn(*args, **kwargs)
            finally:
                log.info('%s took %.3fs', fn.__name__, time.perf_counter() - start)
        return wrapper

Real uses: \`@login_required\`, \`@app.get('/items')\`, \`@functools.lru_cache\`, \`@pytest.fixture\`,
\`@retry\`.

**Follow-up:** "Why \`functools.wraps\`?" It copies \`__name__\`, \`__doc__\`, \`__module__\` and
\`__wrapped__\` onto the wrapper; without it logs, stack traces and frameworks that register by
function name all see \`wrapper\`. **Follow-up:** "A decorator that takes arguments?" One more level:
\`retry(times)\` returns the decorator, which returns the wrapper.

## 3. "Is async Python parallel? When would you use asyncio, threads or processes?"

**Model answer.** asyncio is **concurrent, not parallel**: one thread, one event loop, and coroutines
take turns at every \`await\`. It shines when the program mostly waits on I/O — many HTTP calls or
database queries — because thousands of waits overlap cheaply. Threads also overlap I/O and suit
blocking libraries, but the GIL means only one thread runs Python bytecode at a time, so neither
helps pure-Python CPU work. For CPU-bound work I use processes (\`ProcessPoolExecutor\`,
multiprocessing), which run on several cores. (CPython 3.13 has an experimental free-threaded build
without the GIL; it is not the default.)

**Follow-up:** "What happens if you call \`time.sleep\` or \`requests.get\` inside an async function?"
It blocks the event loop; every other coroutine waits. Use the async library or
\`asyncio.to_thread\`.

## Answering aloud

Definition, a short example you could write on a whiteboard, then the trade-off or trap. The trap —
exhaustion, \`wraps\`, a blocking call in async code — is what tells the interviewer you have used it.`,
    mcqs: [
      mcq('An interviewer asks when a list is a better choice than a generator. Which answer is right?', [
        ['When the data is too large to fit in memory', false],
        ['When the consumer may stop after a few items', false],
        ['When the data must be read twice or indexed', true],
        ['When the values come from a network stream', false],
      ], 'A generator is single-use and supports neither len() nor indexing, so repeated passes or random access call for a list. The other three cases are exactly where a generator wins.'),
      mcq('Follow-up: "What does `@timed` above `def report(): ...` actually do?"', [
        ['It runs timed every time report is called, then report', false],
        ['It rebinds report to the result of timed(report), at def time', true],
        ['It registers report as a method of the timed function', false],
        ['It makes report run on a background thread', false],
      ], 'Decorator syntax is shorthand for report = timed(report), executed once when the def statement runs. What happens on each call is whatever the returned wrapper does.'),
      mcq('"Is asyncio parallel?" Which answer is accurate for standard CPython?', [
        ['Yes: each coroutine runs on its own CPU core', false],
        ['Yes, but only when asyncio.gather is used', false],
        ['No: it is slower than plain sequential code', false],
        ['No: one thread interleaves tasks at each await', true],
      ], 'asyncio runs coroutines on a single thread and switches between them only where they await. That overlaps waiting on I/O, but it never executes two pieces of Python at the same time.'),
    ],
  },

  /* ── MINI_PROJECT ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_PY_MODERN_MINI_PROJECT',
    notes: `# Mini Project — A Log Analyser, the Pythonic Way

Build \`loganalyse\`, a command-line tool that answers "what went wrong, where, and how often" for a web
server log far larger than memory. No third-party packages except \`mypy\` and \`pytest\` for checking.
The point is not the log format — it is using every idea from this topic where it genuinely fits.

## Input

Lines like:

    2026-10-14T09:15:02 INFO  orders  GET /api/orders 200 34ms
    2026-10-14T09:15:03 ERROR payments POST /api/pay 502 1203ms
    2026-10-14T09:15:03 WARN  auth    POST /api/login 401 12ms

Fields: ISO timestamp, level, service, method, path, status, duration with an \`ms\` suffix. Real logs
contain junk: blank lines, stack-trace continuation lines, truncated lines. Generate a test file of a
million lines with a small script of your own.

## Usage

    python -m loganalyse app.log --level ERROR --since 2026-10-14T09:00 --top 5
    python -m loganalyse app.log app.log.1 --json

## Requirements

1. **Streaming with generators.** \`read_lines(paths)\` yields lines from one or more files in order
   (use \`yield from\`); \`parse(lines)\` yields \`LogEntry\` objects and counts unparseable lines;
   \`filter_entries(entries, level, since)\` yields only matching entries. The program never holds
   all lines or all entries in a list. Memory stays flat on a 1 GB file.
2. **A typed data model.** \`LogEntry\` is a \`@dataclass(frozen=True, slots=True)\` with typed fields
   (\`datetime\`, \`Level\`, \`str\`, \`int\`). \`Level\` is an \`Enum\` (DEBUG, INFO, WARN, ERROR). The
   module passes \`mypy --strict\`.
3. **Comprehensions where they fit.** The report's per-service and per-status summaries are built
   with \`collections.Counter\` and dict/list comprehensions — and the accumulation over the stream is a
   plain loop, because it reads many rows into one result.
4. **A decorator.** \`@timed\` (with \`functools.wraps\`) reports how long the analysis took on stderr,
   and returns the wrapped function's result unchanged.
5. **Context managers.** Every file is opened with \`with\`; several input files are managed with
   \`ExitStack\` (or one at a time inside \`read_lines\`). A \`--out report.json\` option writes through a
   \`with\` block, and a failure halfway leaves no half-written file (write to a temp file, then rename).
6. **The report.** Totals by level; the top N services by error count; the top N slowest endpoints
   by average duration; error rate per hour; count of unparseable lines. Plain-text by default,
   JSON with \`--json\` (via \`dataclasses.asdict\` where it helps).
7. **Tests.** pytest tests for \`parse\` (good line, junk line, missing \`ms\`) and for the filters, using
   small in-memory lists — generators accept any iterable, so no file is needed.

## Acceptance criteria

- On a 1,000,000-line file, peak memory (check with \`/usr/bin/time -v\` or Task Manager) is well
  under 100 MB and does not grow with the file size.
- Blank and garbage lines never crash the tool; they appear only in the "unparseable" count.
- \`--level ERROR\` shows only ERROR entries; \`--since\` excludes earlier ones; both combine.
- Two input files are read in the order given, and all of them are closed when the tool exits,
  including when it fails.
- \`mypy --strict loganalyse\` reports no errors; \`pytest\` passes.
- Assigning to a field of a \`LogEntry\` raises \`FrozenInstanceError\`.

## Stretch goals

\`--follow\` mode that tails a growing file (a generator that sleeps and retries); an async variant
that fetches logs from three HTTP endpoints concurrently with \`asyncio.gather\`.

## What to submit

The package, the tests, a README with two sample runs (text and JSON) and five sentences on where you
chose a generator, a comprehension or a plain loop, and why.`,
    mcqs: [
      mcq('The brief requires the tool to keep memory flat on a 1 GB log. Which design meets that?', [
        ['lines = f.readlines(), then filter the list with a comprehension', false],
        ['Chained generators feeding a Counter, consumed in one loop', true],
        ['Read the file into one string, then split it on newlines', false],
        ['Build a list of LogEntry objects and sort it before counting', false],
      ], 'Generators hand over one line or entry at a time, so memory depends on the size of the counters, not the file. Each of the others materialises every line or entry at once.'),
      mcq('Why does the brief ask for LogEntry to be `@dataclass(frozen=True, slots=True)`?', [
        ['Frozen dataclasses parse log lines faster', false],
        ['mypy refuses to check a non-frozen dataclass', false],
        ['Entries cannot change, hash, and use less memory', true],
        ['slots=True lets the entries be sorted by time', false],
      ], 'frozen makes entries immutable and hashable, so they are safe to share and usable as keys; slots removes the per-instance __dict__, which matters when millions pass through.'),
    ],
    assignment: {
      title: 'A Log Analyser, the Pythonic Way',
      description: 'A streaming command-line log analyser built with generators, comprehensions, a timing decorator, context managers and a fully type-hinted data model.',
      instructions: `Build the log analyser described in this unit's brief and submit it as a repository link or a
zip.

**Submit:**

1. The \`loganalyse\` package: the generator pipeline (\`read_lines\`, \`parse\`, \`filter_entries\`),
   the \`LogEntry\` dataclass and \`Level\` enum, the \`@timed\` decorator, the report and a \`__main__.py\`
   with argparse.
2. pytest tests for parsing and filtering, run on small in-memory inputs.
3. A README with two sample runs (plain text and \`--json\`), the peak memory you measured on a
   million-line file, and five sentences explaining where you used a generator, a comprehension or a
   plain loop, and why.

**Before you submit,** run \`mypy --strict\` and \`pytest\`, and check every acceptance criterion in
the brief by running the tool, not by reading your code.`,
      rubric: [
        { criterion: 'Correct report', description: 'Level totals, top services by errors, slowest endpoints, hourly error rate and unparseable count are right; --level, --since, --top and --json behave as the brief states.', maxPoints: 30 },
        { criterion: 'Streaming design', description: 'A generator pipeline with yield from; no list of all lines or entries; memory stays flat on a large file.', maxPoints: 25 },
        { criterion: 'Typed data model', description: 'Frozen, slotted LogEntry dataclass and a Level enum; type hints throughout; mypy --strict passes.', maxPoints: 15 },
        { criterion: 'Decorator and context managers', description: '@timed uses functools.wraps and returns the result; every file is closed by with or ExitStack, including on failure; output is written atomically.', maxPoints: 15 },
        { criterion: 'Tests and explanation', description: 'pytest covers good, junk and edge lines and the filters; the README justifies generator, comprehension and loop choices.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_PY_MODERN_CHECKPOINT',
    notes: `Ten questions across the whole topic: comprehensions, generators, closures and decorators,
context managers, type hints with dataclasses and enums, and asyncio. Most show a few lines of Python
and ask what happens. Trace the code by hand — when each line actually runs, which object is shared,
and what is consumed — before you look at the options.`,
    checkpoint: [
      mcq(`What does this print?

    print([n if n % 2 else 0 for n in range(5)])`, [
        ['[1, 3]', false],
        ['[0, 1, 0, 3, 0]', true],
        ['[0, 2, 4]', false],
        ['It raises SyntaxError', false],
      ], 'An if/else before the for is a conditional expression applied to every item, so all five survive: odd numbers keep their value and even ones become 0. A trailing if would have filtered instead.'),
      mcq(`What does this print?

    def inner():
        yield 1
        yield 2
        return 'done'

    def outer():
        result = yield from inner()
        yield result

    print(list(outer()))`, [
        ['[1, 2]', false],
        ['[\'done\']', false],
        ['[1, 2, None]', false],
        ['[1, 2, \'done\']', true],
      ], 'yield from passes through every value inner yields and then evaluates to inner\'s return value. outer yields that value too, so the list has three items.'),
      mcq(`What does the last line print?

    nums = [1, 2, 3]
    sq = (n * n for n in nums)
    nums.append(4)
    print(list(sq))`, [
        ['[1, 4, 9, 16]', true],
        ['[1, 4, 9]', false],
        ['[16]', false],
        ['[]', false],
      ], 'The generator holds an iterator over the same list object and reads it lazily. The append happened before any item was read, so the fourth element is seen too.'),
      mcq(`What does this print?

    def make_counter():
        count = 0
        def inc():
            nonlocal count
            count += 1
            return count
        return inc

    c1, c2 = make_counter(), make_counter()
    c1(); c1()
    print(c1(), c2())`, [
        ['3 4', false],
        ['1 1', false],
        ['3 1', true],
        ['2 1', false],
      ], 'Every call of make_counter creates a new count variable for its own inc to close over. c1 has been called three times by the print, c2 once, and they never share state.'),
      mcq('A `@retry(3)` decorator is accidentally applied as `@retry` with no parentheses. What happens?', [
        ['It retries with a default of one attempt per call', false],
        ['The function becomes times; a decorator replaces it', true],
        ['Python raises SyntaxError at the decorator line itself', false],
        ['It behaves the same as @retry(3), since 3 is the default', false],
      ], 'Without the call, retry(fn) runs: the function lands in the times parameter and the inner decorate function is returned in its place, so calling the decorated name later does not do what was meant.'),
      mcq(`What does this print?

    def first_line():
        with Named('r'):
            return 'value'

    print(first_line())

where Named prints \`enter r\` in __enter__ and \`exit r\` in __exit__.`, [
        ['enter r, value, exit r', false],
        ['enter r, exit r, value', true],
        ['enter r, value', false],
        ['value, enter r, exit r', false],
      ], 'The return leaves the with-block, which runs __exit__ before the function actually returns. print then receives the value, so exit r is printed before value.'),
      mcq(`What does this print?

    from dataclasses import dataclass, field

    @dataclass
    class Post:
        title: str
        tags: list = field(default_factory=list)

    a, b = Post('x'), Post('x')
    a.tags.append('py')
    print(b.tags, a == b)`, [
        ['[\'py\'] True', false],
        ['[] True', false],
        ['[\'py\'] False', false],
        ['[] False', true],
      ], 'default_factory gives each instance its own list, so b.tags is still empty. The generated __eq__ compares all fields, and the tags now differ, so a == b is False.'),
      mcq(`What happens on the last line?

    from dataclasses import dataclass

    @dataclass
    class Point:
        x: int
        y: int

    seen = {Point(1, 2)}`, [
        ['seen holds one Point', false],
        ['It raises TypeError: unhashable type', true],
        ['seen holds an empty set', false],
        ['It raises AttributeError for __hash__', false],
      ], 'A dataclass with eq=True and frozen=False sets __hash__ to None, because hashing a mutable value would break sets and dicts. frozen=True (or unsafe_hash) makes it hashable.'),
      mcq(`Roughly how long does \`main()\` take?

    async def fetch(name, delay):
        await asyncio.sleep(delay)
        return name

    async def main():
        t1 = asyncio.create_task(fetch('m', 0.2))
        t2 = asyncio.create_task(fetch('n', 0.2))
        await t1
        await t2`, [
        ['About 0.4 s', false],
        ['About 0.0 s', false],
        ['About 0.2 s', true],
        ['It never ends', false],
      ], 'create_task schedules both coroutines at once, so their sleeps overlap while main awaits t1. By the time t1 finishes, t2 has finished too, and awaiting it returns immediately.'),
      mcq(`What is printed?

    async def slow():
        await asyncio.sleep(1)
        return 'late'

    async def main():
        try:
            print(await asyncio.wait_for(slow(), timeout=0.1))
        except asyncio.TimeoutError:
            print('timed out')

    asyncio.run(main())`, [
        ['late, after about 1 s', false],
        ['late, after about 0.1 s', false],
        ['None', false],
        ['timed out', true],
      ], 'wait_for cancels slow() once 0.1 s pass and raises asyncio.TimeoutError, which the except clause catches. On 3.11+ that name is an alias of the built-in TimeoutError.'),
    ],
  },
];
