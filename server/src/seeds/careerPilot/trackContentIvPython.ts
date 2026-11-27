/**
 * Career-track placement content: Python at interview depth (JT_IV_PYTHON), for Python Full Stack +
 * AI.
 *
 * Students have finished the track's Python, modern Python and testing topics, so this is not
 * teaching from zero: each question-set unit is the 8–12 questions interviewers really ask on its
 * subject, with the strong answer, the follow-up and the wrong answers that lose the round. The
 * stems go one level deeper than the teaching topics — names and objects, the tuple += trap, the
 * 1 / 1.0 / True dict key, mutable defaults, late-binding closures, decorators with arguments, MRO
 * and super(), __eq__ without __hash__, the GIL and what it does not protect, asyncio blocking,
 * finally overriding a return, raise from, reference counting, cycles and weakref.
 *
 * CPython 3.13 is the reference, and every "what does this print" was run on it. Where a behaviour
 * is an implementation detail (small-int caching, string interning, immediate freeing by reference
 * count) or changed between versions (dict order in 3.6 vs 3.7, the free-threaded build, the 3.14
 * warning for return in finally) the notes say so.
 *
 * Attribution: the topic is multi-skill (default PYTHON_ADVANCED). Each IV_* unit declares one skill
 * and every checkpoint question in it names that skill; the CHECKPOINT unit names the skill each
 * question measures. Practice mcqs name none.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_IV_PYTHON_BUNDLES: PilotBundle[] = [
  /* ── IV_LANGUAGE ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_PYTHON_IV_LANGUAGE',
    notes: `Python interviews open with the data model because one sentence decides the rest of the
round: "variables are names bound to objects." A candidate who really holds that model answers the
copy, aliasing, \`is\` and argument-passing questions without memorising them. Each question below has
the answer that earns the follow-up, the follow-up itself, and the answers that end the topic badly.

## Q1. "What is a variable in Python?"

**Strong answer.** "A name bound to an object. The object has the type and the value; the name has
neither. Assignment never copies — \`b = a\` binds a second name to the same object. Every object has
an identity (\`id()\`), a type and a value; identity never changes while the object lives."

**Follow-up:** "So what does \`id()\` return?" — an integer unique among *live* objects; in CPython it
is the memory address, and it can be reused once the object is freed.

**Wrong answers:** "A variable is a box holding a value" (that is C), "\`b = a\` copies the list".

## Q2. "Is Python pass-by-value or pass-by-reference?"

**Strong answer.** "Neither label fits — it is pass-by-object-reference, or call by sharing. The
function receives a new name bound to the *same object*. Mutating the object is visible to the
caller; rebinding the parameter is not."

    def register(user, roles):
        roles.append("viewer")   # mutates the caller's list
        roles = ["admin"]        # rebinds the local name only
        user = user.upper()      # str is immutable: a new object, local name

    name, perms = "ravi", ["editor"]
    register(name, perms)
    print(name, perms)           # ravi ['editor', 'viewer']

**Follow-up:** "How do you give a function back two values, then?" — return a tuple (or a dataclass)
and unpack it.

## Q3. "Which types are mutable? Is a tuple really immutable?"

**Strong answer.** Immutable: \`int\`, \`float\`, \`bool\`, \`str\`, \`bytes\`, \`tuple\`, \`frozenset\`,
\`None\`. Mutable: \`list\`, \`dict\`, \`set\`, \`bytearray\`, most user classes. A tuple's *slots* cannot
be rebound, but the objects in them can be mutable — and then the famous trap:

    pair = ("ids", [1, 2])
    try:
        pair[1] += [3]
    except TypeError:
        print("TypeError")
    print(pair)                  # TypeError, then ('ids', [1, 2, 3])

\`+=\` first calls \`list.__iadd__\`, which extends the list in place, *then* tries to store the result
back into \`pair[1]\` — and that assignment raises. The error is real and the mutation already
happened.

## Q4. "is vs ==?"

**Strong answer.** \`==\` compares values by calling \`__eq__\`; \`is\` compares identity — the same
object. Use \`is\` only for singletons: \`None\`, \`True\`/\`False\`, sentinel objects. \`if x == None\`
works until a class overrides \`__eq__\`; \`if x is None\` cannot be fooled and is what PEP 8 asks for.

**Follow-up:** "Why does \`x is 1\` give a warning?" — since 3.8 the compiler emits a
\`SyntaxWarning\` for \`is\` with a literal, because the result depends on caching.

## Q5. "Why is 256 is 256 True but 257 is 257 sometimes False?"

**Strong answer.** "CPython pre-creates the small integers **-5 to 256**, so every 256 is the same
object. 257 is created on demand — two separate computations give two objects. Within one compiled
block equal constants may be merged, so the result changes between the REPL and a script. It is an
implementation detail; the only correct comparison is \`==\`."

    x = int("257"); y = int("257")
    print(x is y)                # False — two objects

**Follow-up:** "And strings?" — CPython interns identifier-like literals and constant-folds
\`"hello" + "_world"\` at compile time, so those can be identical; a string built at runtime
(\`"".join(...)\`) is a new object. \`sys.intern()\` interns deliberately — useful for millions of
repeated dictionary keys, never for correctness.

## Q6. "Shallow vs deep copy?"

**Strong answer.** A **shallow** copy (\`copy.copy\`, \`list(x)\`, \`x[:]\`, \`dict.copy()\`) makes a new
outer container holding the *same* inner objects. A **deep** copy (\`copy.deepcopy\`) recursively
copies the inner objects, and keeps a memo so shared references and cycles are copied once.

    import copy
    config = {"hosts": ["a"], "port": 80}
    shallow = copy.copy(config)
    shallow["hosts"].append("b")   # visible through config
    shallow["port"] = 81           # not visible: a rebinding in the new dict

**Follow-up:** "Where does this bite in real code?" — \`[[0] * 3] * 2\` builds a list holding the same
inner list twice; use \`[[0] * 3 for _ in range(2)]\`.

## Q7. "Is a += b the same as a = a + b?"

**Strong answer.** Not for mutable types. For a list, \`a += b\` calls \`__iadd__\` and extends the
same object — every alias sees it. \`a = a + b\` builds a new list and rebinds only \`a\`. For
immutable types both create a new object, because there is no \`__iadd__\`.

## Q8. "What is UnboundLocalError?"

**Strong answer.** "If a function assigns to a name anywhere in its body, the compiler makes that name
local for the *whole* function. Reading it before the assignment raises \`UnboundLocalError\`, even if
a global of the same name exists." The fix is \`global\` (module level) or \`nonlocal\` (enclosing
function) — or better, pass the value in and return the new one. Name lookup is LEGB: local,
enclosing, global, built-in.

## Q9. "Why is string concatenation in a loop slow, and what do you use?"

**Strong answer.** Strings are immutable, so \`s += piece\` may copy the whole string each time —
O(n²) in the worst case. CPython sometimes resizes in place when the refcount allows, but that is an
optimisation, not a guarantee. Collect pieces in a list and \`"".join(parts)\` once.

## How you are judged

Strong candidates explain with *names and objects* and label implementation details as such ("in
CPython, small ints are cached"). Weak ones say "Python passes by reference" or use \`is\` to compare
numbers and strings.`,
    mcqs: [
      mcq(`What does this print?

    def register(user, roles):
        roles.append("viewer")
        roles = ["admin"]
        user = user.upper()

    name = "ravi"
    perms = ["editor"]
    register(name, perms)
    print(name, perms)`, [
        ["ravi ['admin']", false],
        ["ravi ['editor', 'viewer']", true],
        ["RAVI ['admin', 'viewer']", false],
        ["ravi ['editor']", false],
      ], 'The parameter roles is a second name for the caller\'s list, so append mutates that list. Rebinding roles and user afterwards only changes the local names; str.upper() returns a new string anyway.'),
      mcq(`An interviewer asks for the exact output:

    pair = ("ids", [1, 2])
    try:
        pair[1] += [3]
    except TypeError:
        print("TypeError")
    print(pair)`, [
        ["('ids', [1, 2]) only, since the tuple blocks the change", false],
        ["('ids', [1, 2, 3]) only, since lists inside tuples mutate", false],
        ["TypeError, then ('ids', [1, 2, 3])", true],
        ["TypeError, then ('ids', [1, 2])", false],
      ], 'pair[1] += [3] first runs list.__iadd__, which extends the list in place, and then tries to assign the result back into the tuple slot. That store raises TypeError, but the list was already extended.'),
      mcq(`What does this print?

    seats = [[0] * 3] * 2
    seats[0][1] = 7
    print(seats)`, [
        ['[[0, 7, 0], [0, 0, 0]]', false],
        ['[[0, 7, 0], [0, 7, 0]]', true],
        ['[[7, 7, 7], [0, 0, 0]]', false],
        ['[[0, 0, 0], [0, 7, 0]]', false],
      ], 'Multiplying the outer list copies references, so both rows are the same inner list object. Writing through seats[0] is visible through seats[1]. A comprehension creates a fresh row each time.'),
    ],
    checkpoint: [
      ck('PYTHON_BASICS', `What does this print?

    import copy
    config = {"hosts": ["a"], "port": 80}
    shallow = copy.copy(config)
    deep = copy.deepcopy(config)
    shallow["hosts"].append("b")
    shallow["port"] = 81
    print(config["hosts"], config["port"], deep["hosts"])`, [
        ["['a'] 80 ['a']", false],
        ["['a', 'b'] 81 ['a']", false],
        ["['a', 'b'] 80 ['a']", true],
        ["['a', 'b'] 80 ['a', 'b']", false],
      ], 'The shallow copy is a new dict holding the same list object, so appending to it shows in config. Assigning a new port rebinds a key only in the copy. The deep copy got its own list before the append.'),
      ck('PYTHON_BASICS', `What happens when bump() runs?

    total = 10
    def bump():
        print(total)
        total = total + 1
    bump()`, [
        ['It prints 10 and sets global total to 11', false],
        ['It prints 10 and leaves the global as is', false],
        ['It raises NameError: total is undefined', false],
        ['It raises UnboundLocalError on the print line', true],
      ], 'The assignment makes total local to the whole of bump, decided at compile time. The print reads that local before anything is bound to it, so CPython raises UnboundLocalError (a NameError subclass) rather than reading the global.'),
      ck('PYTHON_BASICS', `What does this print?

    base = [1, 2]
    alias = base
    alias += [3]
    alias = alias + [4]
    print(base, alias)`, [
        ['[1, 2] [1, 2, 3, 4]', false],
        ['[1, 2, 3] [1, 2, 3, 4]', true],
        ['[1, 2, 3, 4] [1, 2, 3, 4]', false],
        ['[1, 2, 3] [1, 2, 3]', false],
      ], 'alias += [3] calls list.__iadd__ and extends the shared list in place, so base sees 3. alias + [4] builds a new list and rebinds only alias, so base stops at [1, 2, 3].'),
    ],
  },

  /* ── IV_DATA_STRUCTURES ─────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_PYTHON_IV_DATA_STRUCTURES',
    notes: `"How is a dict implemented?" is to a Python interview what "how does HashMap work?" is to a
Java one. Interviewers then ask the cost of everyday operations, because a candidate who writes
\`if x in some_list\` inside a loop over a lakh of items has just written an O(n²) API.

## Q1. "How is a Python list implemented?"

**Strong answer.** "A dynamic array of pointers to objects. Indexing is O(1). \`append\` is amortised
O(1): when the array is full CPython over-allocates a little extra, so most appends write into spare
room. \`insert(0, x)\` and \`pop(0)\` shift every element — O(n). \`x in lst\` is a linear scan."

**Follow-up:** "You need a queue." — \`collections.deque\`: O(1) \`append\` and \`popleft\` at both ends,
but O(n) indexing into the middle.

**Wrong answer:** "A list is a linked list."

## Q2. "How does a dict work?"

**Strong answer.** "A hash table with open addressing. \`hash(key)\` picks a slot; on a collision
CPython probes other slots using a perturbation of the hash. Since 3.6 the table is *compact*: a
small sparse index array points into a dense entries array of (hash, key, value) in insertion order.
That saves memory and is why iteration follows insertion order. Lookup, insert and delete are O(1)
on average, O(n) in the pathological worst case. The table grows when it is about two-thirds full."

**Follow-up:** "Is the order guaranteed?" — an implementation detail in CPython 3.6, a **language
guarantee since 3.7**. Updating an existing key keeps its position; deleting and re-inserting moves
it to the end.

## Q3. "What makes an object hashable? Why can't a list be a dict key?"

**Strong answer.** A hashable object has a \`__hash__\` that never changes during its lifetime and an
\`__eq__\` consistent with it (equal objects must have equal hashes). A list is mutable — if its hash
followed its contents, mutating it would strand it in the wrong slot — so \`list.__hash__\` is
\`None\`. A tuple is hashable **only if every element is**: \`hash((1, [2]))\` raises
\`TypeError: unhashable type: 'list'\`. Use a tuple or \`frozenset\` as a composite key.

## Q4. "What does {1: 'int', 1.0: 'float', True: 'bool'} contain?"

**Strong answer.** \`{1: 'bool'}\`. \`1 == 1.0 == True\` and their hashes are equal, so they are the
same key. The first key object (\`1\`) is kept; each later assignment only replaces the value.

## Q5. "Can you change a dict while iterating over it?"

**Strong answer.** Changing *values* is fine. Adding or removing keys raises
\`RuntimeError: dictionary changed size during iteration\`. Iterate over a snapshot —
\`for k in list(d):\` — or build a new dict with a comprehension.

## Q6. "list vs tuple vs set — when do you use which?"

**Strong answer.** List: ordered, mutable, duplicates allowed. Tuple: fixed record, hashable when its
contents are, slightly smaller and faster to create. Set: unique hashable items with O(1) average
membership and set algebra (\`|\`, \`&\`, \`-\`, \`^\`). Converting a list to a set to test membership many
times is the classic speed-up.

## Q7. "What sort does Python use?"

**Strong answer.** Timsort (3.11+ uses the Powersort merge policy within it): O(n log n) worst case,
O(n) on already-sorted runs, and **stable** — equal keys keep their original order, even with
\`reverse=True\`. \`list.sort()\` sorts in place and returns \`None\`; \`sorted()\` returns a new list from
any iterable. Sort on several fields with a tuple key, or with successive stable sorts.

## Q8. "When would you still use OrderedDict, defaultdict or Counter?"

**Strong answer.** \`defaultdict(list)\` for grouping without \`setdefault\` noise. \`Counter\` for
frequencies, \`most_common(k)\` and multiset arithmetic. \`OrderedDict\` still has
\`move_to_end()\` and \`popitem(last=False)\` — the building blocks of an LRU cache — and its equality is
order-sensitive, while two plain dicts with the same items are equal in any order.

## Q9. "What are dict views?"

**Strong answer.** \`keys()\`, \`values()\` and \`items()\` return *live* views, not copies — they reflect
later changes. \`keys()\` and (for hashable values) \`items()\` are set-like: \`d.keys() & other\` works.

## Q10. "List comprehension or generator expression?"

**Strong answer.** A list comprehension builds the whole list in memory; a generator expression
yields one item at a time. \`sum(x * x for x in range(10**7))\` uses constant memory; the bracketed
version allocates ten million ints first. Use the list when you need to index it or iterate twice.

## How you are judged

Strong candidates give Big-O with the reason (shifting, probing, over-allocation) and know which
guarantees are language and which are CPython. Weak ones say "dicts are unordered" in 2026, or reach
for \`list.pop(0)\` in a queue.`,
    mcqs: [
      mcq(`What does this print?

    d = {1: "int", 1.0: "float", True: "bool"}
    print(d)`, [
        ["{1: 'int', 1.0: 'float', True: 'bool'}", false],
        ["{True: 'bool'}", false],
        ["{1: 'bool'}", true],
        ["{1: 'int'}", false],
      ], '1, 1.0 and True are equal and hash the same, so they are one key. The dict keeps the first key object it saw (the int 1) and each later assignment just overwrites the value, leaving "bool".'),
      mcq('A job scheduler keeps 1,00,000 pending jobs in a list and takes the next one with jobs.pop(0). It is slow under load. What is the right diagnosis and fix?', [
        ['pop(0) shifts every element, so use a deque and popleft()', true],
        ['pop(0) rehashes the list, so switch to a set of jobs instead', false],
        ['The list is a linked list; convert it to a tuple for speed', false],
        ['pop(0) is O(1) but holds the GIL; use threads to pop', false],
      ], 'A list is a dynamic array, so removing from the front moves all remaining pointers down: O(n) per pop. collections.deque supports O(1) append and popleft at both ends, which is exactly a queue.'),
      mcq(`What happens on the last line?

    cache = {}
    key = (1, [2])
    cache[key] = "x"`, [
        ['The entry is stored, because a tuple is always hashable', false],
        ['TypeError: unhashable type, because of the inner list', true],
        ['The key is stored as a frozen copy of the inner list', false],
        ['KeyError, because the tuple contains a mutable item', false],
      ], 'Hashing a tuple hashes each element. The inner list has no hash (list.__hash__ is None), so building the key raises TypeError: unhashable type: \'list\'. Only tuples of hashable items can be keys.'),
    ],
    checkpoint: [
      ck('PYTHON_COLLECTIONS', `What happens when this runs?

    stock = {"pen": 0, "ink": 3, "cap": 0}
    for item in stock:
        if stock[item] == 0:
            del stock[item]`, [
        ['RuntimeError: dictionary changed size during iteration', true],
        ['It finishes and stock becomes {"ink": 3}', false],
        ['It finishes but silently skips the key after "pen"', false],
        ['KeyError, because "pen" was deleted while still in use', false],
      ], 'Deleting "pen" changes the dict\'s size, and the dict iterator checks the size on its next step and raises RuntimeError. Iterate over list(stock) or rebuild the dict with a comprehension instead.'),
      ck('PYTHON_COLLECTIONS', `What does this print?

    rows = [("asha", 82), ("bala", 75), ("chen", 82), ("dev", 75)]
    rows.sort(key=lambda r: r[1], reverse=True)
    print([n for n, _ in rows])`, [
        ["['chen', 'asha', 'dev', 'bala']", false],
        ["['asha', 'chen', 'dev', 'bala']", false],
        ["['chen', 'asha', 'bala', 'dev']", false],
        ["['asha', 'chen', 'bala', 'dev']", true],
      ], 'Python\'s sort is stable, and reverse=True keeps that stability rather than reversing the whole list. Ties stay in their original order: asha before chen at 82, bala before dev at 75.'),
      ck('PYTHON_COLLECTIONS', `What does this print on Python 3.7 or later?

    d = {"x": 1, "y": 2, "z": 3}
    d["x"] = 9
    del d["y"]
    d["y"] = 5
    print(list(d.items()))`, [
        ["[('x', 9), ('y', 5), ('z', 3)]", false],
        ["[('x', 9), ('z', 3), ('y', 5)]", true],
        ["[('z', 3), ('x', 9), ('y', 5)]", false],
        ["[('y', 5), ('x', 9), ('z', 3)]", false],
      ], 'Dicts preserve insertion order. Updating "x" keeps its original position; deleting "y" and inserting it again makes it a new entry at the end, after "z".'),
    ],
  },

  /* ── IV_FUNCTIONS ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_PYTHON_IV_FUNCTIONS',
    notes: `Functions are first-class objects in Python, and almost every tricky Python question —
mutable defaults, closures in loops, decorators, generators — follows from two facts: a \`def\` runs
once and creates an object, and a closure captures *variables*, not values.

## Q1. "Explain *args and **kwargs."

**Strong answer.** \`*args\` collects extra positional arguments into a **tuple**, \`**kwargs\` collects
extra keyword arguments into a **dict**. Parameters after \`*args\` (or a bare \`*\`) are
**keyword-only**; parameters before a \`/\` (3.8+) are **positional-only**.

    def connect(host, *args, port=5432, **opts):
        return host, args, port, opts

    connect("db", 1, 2, port=3306, ssl=True)
    # ('db', (1, 2), 3306, {'ssl': True})

**Follow-up:** "Where do you use them?" — decorators that wrap any function (\`*args, **kwargs\`
forwarded unchanged), and \`f(*items, **options)\` to unpack at the call site.

## Q2. "What is wrong with def add_tag(tag, tags=[])?"

**Strong answer.** "Default values are evaluated **once**, when the \`def\` statement runs, and stored on
the function (\`add_tag.__defaults__\`). Every call that omits \`tags\` shares that one list, so tags
leak between calls."

    def add_tag(tag, tags=None):
        if tags is None:
            tags = []
        tags.append(tag)
        return tags

**Follow-up:** "Why not \`tags = tags or []\`?" — an empty list the caller passed is falsy, so it is
silently replaced and the caller's list never sees the append. Test \`is None\`.

## Q3. "What does [lambda: i for i in range(3)] give when called?"

**Strong answer.** \`[2, 2, 2]\`. Closures are **late-binding**: each lambda looks up \`i\` when it is
called, and by then the loop has finished with \`i == 2\`. Fix it by binding at definition time —
\`lambda i=i: i\` — or with \`functools.partial\`.

## Q4. "Write a decorator. What does functools.wraps do?"

**Strong answer.**

    import functools, time

    def timed(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            start = time.perf_counter()
            try:
                return fn(*args, **kwargs)
            finally:
                print(f"{fn.__name__} took {time.perf_counter() - start:.3f}s")
        return wrapper

\`@timed\` above \`def f\` is just \`f = timed(f)\`. Without \`wraps\` the decorated function reports
\`__name__ == 'wrapper'\` and \`__doc__ == None\`, which breaks logs, debugging, docs and frameworks
that read the name. \`wraps\` copies name, doc, module and qualname and sets \`__wrapped__\` to the
original.

## Q5. "How do you write a decorator that takes arguments?"

**Strong answer.** One more level: a factory that receives the arguments and *returns* the decorator.

    def retry(times):
        def decorator(fn):
            @functools.wraps(fn)
            def wrapper(*args, **kwargs):
                for attempt in range(1, times + 1):
                    try:
                        return fn(*args, **kwargs)
                    except ConnectionError:
                        if attempt == times:
                            raise
            return wrapper
        return decorator

\`@retry(3)\` means \`f = retry(3)(f)\`. **Follow-up:** "What if someone writes \`@retry\` with no
parentheses?" — \`retry(f)\` returns \`decorator\`, so \`f\` becomes \`decorator\`; calling \`f(x)\` then
returns a function object instead of running anything. No error until much later.

## Q6. "Generator vs list — and what is generator exhaustion?"

**Strong answer.** A generator function (one containing \`yield\`) returns a generator that produces
values lazily, keeping its frame suspended between \`next()\` calls; memory stays constant. It can be
iterated **once**: after it raises \`StopIteration\`, every later loop sees nothing.

    squares = (n * n for n in range(4))
    print(sum(squares), sum(squares))   # 14 0

**Follow-up:** "Where did this bite you?" — passing a generator to a function that iterates it twice
(once to validate, once to save) — the second pass is empty and no error is raised.

## Q7. "What do nonlocal and global do?"

**Strong answer.** They let an assignment rebind a name in an enclosing function (\`nonlocal\`) or at
module level (\`global\`) instead of creating a local. A counter closure needs \`nonlocal count\`; just
*reading* an enclosing variable needs nothing. Each call to the factory creates a fresh cell, so two
counters are independent.

## Q8. "What does functools.lru_cache need from the arguments?"

**Strong answer.** They must be **hashable** — the arguments form the cache key — so calling a cached
function with a list raises \`TypeError: unhashable type: 'list'\`. Also: \`maxsize=None\` grows without
bound, and caching a method holds every \`self\` alive (use it on functions, or \`cached_property\`).

## Q9. "What can't a lambda do?"

**Strong answer.** A lambda is a single expression — no statements, no assignment (except \`:=\`), no
annotations. It is fine as a \`key=\` argument; anything named or longer belongs in a \`def\`, which also
gives a useful name in tracebacks.

## How you are judged

Strong candidates say *when* things are evaluated (defaults at \`def\` time, closure variables at call
time, generator bodies on \`next()\`). Weak ones can write \`@decorator\` but cannot desugar it.`,
    workedExample: `**Question: "Write @retry(times) for flaky network calls, then tell me what each layer is."**

**Step 1 — desugar first, out loud.** "\`@retry(3)\` above \`def fetch\` means \`fetch = retry(3)(fetch)\`.
So \`retry(3)\` must *return a decorator*, and that decorator must return the replacement function.
That gives three nested functions."

    import functools

    def retry(times, on=(ConnectionError, TimeoutError)):
        def decorator(fn):
            @functools.wraps(fn)
            def wrapper(*args, **kwargs):
                for attempt in range(1, times + 1):
                    try:
                        return fn(*args, **kwargs)
                    except on:
                        if attempt == times:
                            raise
            return wrapper
        return decorator

    @retry(3)
    def fetch(url):
        ...

**Step 2 — name each layer.** \`retry\` runs **once**, at decoration time, and captures \`times\` and
\`on\`. \`decorator\` also runs once and captures \`fn\`. \`wrapper\` runs on **every call**; it reads
\`times\`, \`on\` and \`fn\` through closures.

**Step 3 — justify the details.** \`*args, **kwargs\` so it wraps any signature. \`functools.wraps\` so
\`fetch.__name__\` is still \`"fetch"\` in logs and \`fetch.__wrapped__\` reaches the original for tests.
A bare \`raise\` on the last attempt re-raises the original exception with its traceback. Only the
listed exceptions retry — a \`ValueError\` from bad input should fail immediately, not three times.

**Step 4 — the follow-up you should raise yourself.** "In production I would add a backoff
(\`time.sleep(base * 2 ** attempt)\`), and in async code the wrapper must be \`async def\` and
\`await asyncio.sleep\`, otherwise it blocks the event loop."

That desugaring sentence in Step 1 is what interviewers listen for.`,
    mcqs: [
      mcq(`What does this print?

    def add_tag(tag, tags=[]):
        tags.append(tag)
        return tags

    a = add_tag("py")
    b = add_tag("sql")
    print(a, b, a is b)`, [
        ["['py'] ['sql'] False", false],
        ["['py', 'sql'] ['py', 'sql'] True", true],
        ["['py'] ['py', 'sql'] False", false],
        ["['py', 'sql'] ['sql'] False", false],
      ], 'The default list is created once, when def runs, and every call that omits tags appends to that same object. a and b are both that list, so they print the same contents and a is b is True.'),
      mcq(`What does this print?

    handlers = [lambda: n * 10 for n in range(1, 4)]
    print([h() for h in handlers])`, [
        ['[10, 20, 30]', false],
        ['[0, 10, 20]', false],
        ['[30, 30, 30]', true],
        ['[10, 10, 10]', false],
      ], 'Each lambda closes over the variable n, not its value at creation. They are called after the comprehension finishes, when n is 3, so all return 30. Binding n=n as a default argument captures the value.'),
      mcq(`What does this print?

    squares = (n * n for n in range(4))
    print(sum(squares), sum(squares), 9 in squares)`, [
        ['14 14 True', false],
        ['14 0 True', false],
        ['14 14 False', false],
        ['14 0 False', true],
      ], 'A generator can be consumed once. The first sum drains it (0+1+4+9 = 14); the second sum sees no items and returns 0, and the membership test also finds nothing, so it is False.'),
    ],
    checkpoint: [
      ck('PYTHON_FUNCTIONS', `What does this print?

    def logged(fn):
        def wrapper(*args, **kwargs):
            return fn(*args, **kwargs)
        return wrapper

    @logged
    def checkout(cart):
        """Charge the cart."""
        return len(cart)

    print(checkout.__name__, checkout.__doc__)`, [
        ['checkout Charge the cart.', false],
        ['wrapper Charge the cart.', false],
        ['wrapper None', true],
        ['checkout None', false],
      ], 'The name checkout is rebound to wrapper, and wrapper has its own __name__ and no docstring. functools.wraps(fn) on wrapper would copy the original name and docstring across.'),
      ck('PYTHON_FUNCTIONS', `The decorator is meant to be used as @repeat(3), but a teammate writes it without parentheses. What does ping("db01") return?

    def repeat(times):
        def deco(fn):
            def wrapper(*a):
                return [fn(*a) for _ in range(times)]
            return wrapper
        return deco

    @repeat
    def ping(host):
        return host[:2]`, [
        ['A function object (wrapper), not any list', true],
        ["The list ['db'], because times defaults to 1", false],
        ['A TypeError the moment the module is imported', false],
        ["The list ['db', 'db', 'db'] as intended", false],
      ], 'Without the call, ping = repeat(ping), which returns deco. ping("db01") is then deco("db01"), which builds and returns wrapper. No error is raised; the bug surfaces only where the result is used.'),
      ck('PYTHON_FUNCTIONS', `What does this print?

    def connect(host, *args, port=5432, **opts):
        return host, args, port, opts

    print(connect("db", 1, 2, port=3306, ssl=True))`, [
        ["('db', [1, 2], 3306, {'ssl': True})", false],
        ["('db', (1, 2), 5432, {'port': 3306, 'ssl': True})", false],
        ["('db', (1, 2), 3306, {'ssl': True})", true],
        ["('db', (1, 2, 3306), 5432, {'ssl': True})", false],
      ], 'Extra positionals are packed into a tuple. port comes after *args, so it is keyword-only and takes 3306 directly; only keywords that match no parameter, here ssl, land in the opts dict.'),
    ],
  },

  /* ── IV_OOP ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_PYTHON_IV_OOP',
    notes: `Python OOP questions are less about the four pillars and more about the data model: which
dunder method runs when, how \`super()\` really walks the class hierarchy, and why a class that
defines \`__eq__\` suddenly cannot go in a set.

## Q1. "__str__ vs __repr__?"

**Strong answer.** \`__repr__\` is for developers — unambiguous, ideally \`eval\`-able
(\`Ticket(7)\`); \`__str__\` is for end users. \`print()\` and \`str()\` use \`__str__\` and fall back to
\`__repr__\`. Containers always show their elements with \`repr\`, so \`print([t])\` shows
\`[Ticket(7)]\` even when \`print(t)\` shows \`T7\`. If you write only one, write \`__repr__\`.

## Q2. "If I define __eq__, what happens to __hash__?"

**Strong answer.** "Defining \`__eq__\` without \`__hash__\` sets \`__hash__\` to \`None\`, so instances
become **unhashable** — \`{Point(1, 2)}\` raises \`TypeError\`. That is deliberate: the default hash is
identity-based, which would break 'equal objects have equal hashes'. If the object is immutable,
define \`__hash__\` from the same fields \`__eq__\` compares — \`hash((self.x, self.y))\`."

**Follow-up:** "And if it is mutable?" — leave it unhashable. A mutable key whose hash changes is
lost inside the dict.

## Q3. "What is the MRO? What does super() call?"

**Strong answer.** The **method resolution order** is the C3 linearisation of the class and its
bases: each class appears before its parents, and parents keep the order they were listed in.
\`super()\` means "the **next class in the MRO of the object's type**", not "my parent".

    class Base:
        def save(self): return ["Base"]
    class Audit(Base):
        def save(self): return ["Audit"] + super().save()
    class Cache(Base):
        def save(self): return ["Cache"] + super().save()
    class Order(Audit, Cache):
        def save(self): return ["Order"] + super().save()

    Order().save()   # ['Order', 'Audit', 'Cache', 'Base']

\`Audit\`'s \`super()\` goes to \`Cache\` — a class \`Audit\` has never heard of — because the instance is an
\`Order\`. That is cooperative multiple inheritance: every class calls \`super()\`, and \`Base\` runs once.

**Follow-up:** "How do you see it?" — \`Order.__mro__\` or \`Order.mro()\`. "When does C3 fail?" — when
two bases demand contradictory orders; class creation raises \`TypeError\`.

## Q4. "What is @property for?"

**Strong answer.** It turns a method into a computed attribute, so you can start with a plain public
attribute and later add validation **without changing callers** — Python needs no getters and
setters up front. The setter runs on every assignment, including \`self.balance = balance\` in
\`__init__\`, so validation covers construction too.

## Q5. "classmethod vs staticmethod?"

**Strong answer.** A **classmethod** receives the class (\`cls\`) — used for alternative constructors
(\`Report.from_csv(path)\`), and when called on a subclass, \`cls\` is the subclass, so
\`SalesReport.blank()\` returns a \`SalesReport\`. A **staticmethod** receives nothing implicit — a
plain function namespaced in the class. An instance method receives \`self\`.

## Q6. "What is an abstract base class?"

**Strong answer.** A class deriving from \`abc.ABC\` with \`@abstractmethod\` members. A subclass that
does not implement every abstract method **cannot be instantiated** — the \`TypeError\` comes at
construction time, not at import, and not when the missing method is called. Useful for plugin
interfaces (\`PaymentGateway.charge\`). \`isinstance\` checks against an ABC can also succeed via
\`register()\` or \`__subclasshook__\`.

## Q7. "What do dataclasses generate? eq, frozen, slots?"

**Strong answer.** \`@dataclass\` writes \`__init__\`, \`__repr__\` and \`__eq__\` from the annotated
fields. With the default \`eq=True\` and \`frozen=False\` it sets \`__hash__ = None\` — mutable, so
unhashable. \`frozen=True\` blocks assignment (\`FrozenInstanceError\`) and generates \`__hash__\`, so
instances work as keys and in sets. \`order=True\` adds comparisons. \`slots=True\` (3.10+) uses
\`__slots__\`: less memory, and no new attributes. A mutable default such as \`items: list = []\` raises
\`ValueError\` at class creation — use \`field(default_factory=list)\`.

## Q8. "What is duck typing?"

**Strong answer.** "If it has the method, use it" — code depends on behaviour, not on a base class.
Anything with \`read()\` works as a file; anything with \`__iter__\` works in a \`for\`. For type checkers,
\`typing.Protocol\` describes that structural contract without inheritance. The cost: a missing method
fails at runtime, so tests matter.

## Q9. "Class attribute vs instance attribute?"

**Strong answer.** A class attribute is shared by every instance; reading \`self.x\` finds it if the
instance has none. The trap: \`items = []\` at class level, then \`self.items.append(...)\` mutates the
one shared list. Assigning \`self.items = [...]\` instead creates an instance attribute that shadows
it. Initialise per-instance state in \`__init__\`.

## Q10. "Is there private in Python? What does __name do?"

**Strong answer.** No enforced privacy. \`_name\` is a convention ("internal"). \`__name\` inside a class
is **name-mangled** to \`_ClassName__name\` to avoid clashes in subclasses — not security;
\`obj._Account__secret\` still reaches it.

## How you are judged

Strong candidates trace the MRO instead of guessing, and know the \`__eq__\`/\`__hash__\` rule without
being prompted. Weak ones say "\`super()\` calls the parent class" or "Python has private variables
with double underscores".`,
    workedExample: `**Question: "Trace Order().save() and tell me why Base appears once."**

    class Base:
        def save(self): return ["Base"]
    class Audit(Base):
        def save(self): return ["Audit"] + super().save()
    class Cache(Base):
        def save(self): return ["Cache"] + super().save()
    class Order(Audit, Cache):
        def save(self): return ["Order"] + super().save()

**Step 1 — compute the MRO before tracing any call.** C3 rule: a class comes before its bases, and
the bases keep their listed order. \`Order\` first; then its bases in order, \`Audit\` and \`Cache\`;
\`Base\` must come after *both* of its children; then \`object\`.
MRO = \`Order, Audit, Cache, Base, object\`.

**Step 2 — trace with the MRO of the instance, not of the class the code sits in.**
\`Order.save\` → \`super()\` is the class after \`Order\` in that list → \`Audit.save\`.
\`Audit.save\` → the class after \`Audit\` in the **instance's** MRO is \`Cache\`, not \`Base\`.
\`Cache.save\` → next is \`Base\`. \`Base.save\` returns \`["Base"]\`.

**Step 3 — unwind.** \`["Order", "Audit", "Cache", "Base"]\`.

**Step 4 — say why this matters.** "Because each class delegates with \`super()\`, every class runs
exactly once even in a diamond — that is why Django's class-based view mixins all call
\`super().dispatch()\`. If \`Audit\` had called \`Base.save(self)\` directly, \`Cache\` would be skipped
silently."

**Step 5 — verify.** "In a real codebase I would not trust my trace: \`print(Order.__mro__)\`."`,
    mcqs: [
      mcq(`What does this print?

    class Base:
        def save(self): return ["Base"]
    class Audit(Base):
        def save(self): return ["Audit"] + super().save()
    class Cache(Base):
        def save(self): return ["Cache"] + super().save()
    class Order(Audit, Cache):
        def save(self): return ["Order"] + super().save()

    print(Order().save())`, [
        ["['Order', 'Audit', 'Base']", false],
        ["['Order', 'Audit', 'Base', 'Cache', 'Base']", false],
        ["['Order', 'Cache', 'Audit', 'Base']", false],
        ["['Order', 'Audit', 'Cache', 'Base']", true],
      ], 'The MRO of Order is Order, Audit, Cache, Base, object. super() inside Audit moves to the next class in the instance\'s MRO, which is Cache, so every class runs once and Base runs last.'),
      mcq(`What happens on the last line?

    class Point:
        def __init__(self, x, y):
            self.x, self.y = x, y
        def __eq__(self, other):
            return (self.x, self.y) == (other.x, other.y)

    seen = {Point(1, 2)}`, [
        ['A set holding one Point, hashed by its object identity', false],
        ['TypeError: unhashable type, as __hash__ is now None', true],
        ['A set holding one Point, hashed from the x and y fields', false],
        ['AttributeError, because Point never defines __hash__', false],
      ], 'A class that defines __eq__ without __hash__ gets __hash__ = None, so its instances cannot go into sets or be dict keys. Keeping the identity hash would break the rule that equal objects hash equally.'),
      mcq(`What does this print?

    class Report:
        @classmethod
        def blank(cls): return cls()
        @staticmethod
        def kind(): return "report"

    class SalesReport(Report):
        pass

    r = SalesReport.blank()
    print(type(r).__name__, SalesReport.kind())`, [
        ['Report report', false],
        ['SalesReport report', true],
        ['Report SalesReport', false],
        ['SalesReport SalesReport', false],
      ], 'A classmethod receives the class it was called on, so cls is SalesReport and blank() builds a SalesReport. A staticmethod receives nothing implicit and simply returns its fixed string.'),
    ],
    checkpoint: [
      ck('PYTHON_OOP', `What does this print?

    from dataclasses import dataclass

    @dataclass(frozen=True)
    class Money:
        amount: int
        currency: str = "INR"

    a = Money(100)
    b = Money(100)
    print(a == b, a is b, len({a, b}))`, [
        ['True False 1', true],
        ['True True 1', false],
        ['False False 2', false],
        ['True False 2', false],
      ], 'The generated __eq__ compares fields, so a == b, but they are two objects. frozen=True with eq=True also generates a field-based __hash__, so the set treats them as one element.'),
      ck('PYTHON_OOP', `What does this print?

    class Cart:
        items = []
        def add(self, x):
            self.items.append(x)

    c1, c2 = Cart(), Cart()
    c1.add("pen")
    print(c2.items, Cart.items is c1.items)`, [
        ['[] False', false],
        ["['pen'] False", false],
        ['[] True', false],
        ["['pen'] True", true],
      ], 'items is a class attribute, so self.items finds the single shared list and append mutates it for every instance. Initialise self.items = [] in __init__ to give each cart its own list.'),
      ck('PYTHON_OOP', `What does this print?

    class Ticket:
        def __init__(self, n): self.n = n
        def __str__(self): return f"T{self.n}"
        def __repr__(self): return f"Ticket({self.n})"

    t = Ticket(7)
    print(t, [t], f"{t!r}")`, [
        ['T7 [T7] Ticket(7)', false],
        ['Ticket(7) [Ticket(7)] Ticket(7)', false],
        ['T7 [Ticket(7)] Ticket(7)', true],
        ['T7 [T7] T7', false],
      ], 'print uses __str__ for t itself, but a list formats its elements with repr, so the list shows Ticket(7). The !r conversion in the f-string asks for repr explicitly.'),
    ],
  },

  /* ── IV_CONCURRENCY ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_PYTHON_IV_CONCURRENCY',
    notes: `"Explain the GIL" is asked in nearly every Python backend interview, and most candidates
fail it in one of two ways: "Python cannot do concurrency" or "the GIL makes my code thread-safe".
Both are wrong. The questions below build the accurate picture.

## Q1. "What is the GIL?"

**Strong answer.** "The Global Interpreter Lock is a mutex in CPython that allows only **one thread
to execute Python bytecode at a time**. It exists because CPython's memory management —
reference counts on every object — is not thread-safe without it, and a single lock is cheap for
single-threaded code. It is a CPython detail, not part of the language."

**Follow-up:** "When is it released?" — around blocking I/O (sockets, files, \`time.sleep\`), by C
extensions that do long work without touching Python objects (NumPy, hashlib on large buffers, zlib),
and periodically: a thread holding it is asked to drop it every switch interval
(\`sys.getswitchinterval()\`, 5 ms by default).

## Q2. "So does the GIL make my code thread-safe?"

**Strong answer.** "No. It protects the interpreter's internals, not your invariants. \`counter += 1\`
is several bytecodes — load, add, store — and a switch can happen between the load and the store, so
two threads lose updates." Use \`threading.Lock\` (\`with lock:\`), or hand work through a
\`queue.Queue\`, which is already thread-safe.

**Wrong answer:** "Because of the GIL only one thread runs, so no locks are needed."

## Q3. "Threads, processes or asyncio — how do you choose?"

**Strong answer.**

| Workload | Use | Why |
|---|---|---|
| I/O-bound, tens of tasks (HTTP calls, DB) | \`threading\` / \`ThreadPoolExecutor\` | The GIL is released while waiting |
| I/O-bound, thousands of connections | \`asyncio\` | One thread, cheap coroutines, no per-task stack |
| CPU-bound pure Python | \`multiprocessing\` / \`ProcessPoolExecutor\` | Each process has its own interpreter and GIL |
| CPU-bound in NumPy or a C extension | Often threads are fine | The extension releases the GIL |

## Q4. "What does multiprocessing cost?"

**Strong answer.** Process start-up, memory for each interpreter, and **pickling** every argument and
result across the process boundary — so it pays only for chunky CPU work, not tiny tasks. On Windows
and macOS the default start method is **spawn**: the child re-imports your module, so the code that
starts processes must sit under \`if __name__ == "__main__":\`, and lambdas or local functions cannot
be sent (they do not pickle).

## Q5. "How does asyncio work?"

**Strong answer.** "One thread runs an **event loop**. \`async def\` creates a coroutine; \`await\`
suspends it and hands control back to the loop until the awaited I/O is ready. It is **cooperative**:
a coroutine runs until it awaits. \`asyncio.gather\` runs several concurrently and returns results in
**argument order**, not completion order."

**Follow-up:** "What if a coroutine calls \`time.sleep(1)\` or \`requests.get\`?" — it blocks the whole
loop; nothing else runs. Use \`await asyncio.sleep\`, an async client (\`httpx.AsyncClient\`), or push
blocking calls to a thread with \`await asyncio.to_thread(fn, ...)\`.

## Q6. "What happens if you call an async function without await?"

**Strong answer.** Nothing runs. Calling it only creates a coroutine object; when that object is
garbage-collected Python emits \`RuntimeWarning: coroutine '...' was never awaited\`. A classic bug in
a "send email" call inside a request handler.

## Q7. "Has Python 3.13 removed the GIL?"

**Strong answer — say it carefully.** "PEP 703 added an **optional free-threaded build** of CPython,
shipped as experimental in 3.13 (the \`python3.13t\` executable). The regular build — what you get by
default — **still has the GIL**. In the free-threaded build, pure-Python threads can run CPU work in
parallel, but single-threaded code is somewhat slower and C extensions must be rebuilt to declare
support. 3.14 moved it from experimental to officially supported, still as a separate build. I would
not plan a production service around it yet."

## Q8. "Give me a deadlock, and how you avoid it."

**Strong answer.** Thread 1 holds lock A and waits for B; thread 2 holds B and waits for A. Avoid it by
always acquiring locks in one global order, holding them briefly, using \`with\` so they are released
on exceptions, or by \`acquire(timeout=...)\`. A plain \`Lock\` re-acquired by the same thread
deadlocks too — that is what \`RLock\` is for.

## Q9. "In a Django or FastAPI backend, where does this matter?"

**Strong answer.** Django serves each request in a worker (Gunicorn processes, optionally threads),
so CPU-heavy work belongs in a background worker like Celery, not in the view. FastAPI runs \`async
def\` endpoints on the event loop — a blocking call inside one stalls every request — and runs plain
\`def\` endpoints in a thread pool. An AI service that awaits many LLM calls is the textbook asyncio
case.

## How you are judged

Strong candidates separate I/O-bound from CPU-bound before naming a tool, and know the GIL does not
remove the need for locks. Weak ones say "Python has no real threads" or "3.13 has no GIL".`,
    mcqs: [
      mcq('A service checks 50,000 numbers for primality in pure Python, then splits the work across 4 threads on the default CPython 3.13 build. What happens to the run time?', [
        ['It drops to a quarter, one quarter per thread', false],
        ['About the same: one thread runs bytecode at a time', true],
        ['It doubles, because each thread copies the data', false],
        ['It fails: threads cannot run CPU-bound Python code', false],
      ], 'The GIL lets only one thread execute Python bytecode at a time, and pure-Python arithmetic never releases it, so CPU-bound threads take turns. Separate processes, each with its own interpreter and GIL, give real parallelism.'),
      mcq(`About how many seconds does this print?

    import asyncio, time

    async def fetch(i):
        time.sleep(1)
        return i

    async def main():
        t = time.perf_counter()
        await asyncio.gather(*(fetch(i) for i in range(3)))
        print(round(time.perf_counter() - t))

    asyncio.run(main())`, [
        ['1, since gather runs the three coroutines at once', false],
        ['0, since the coroutines are never actually awaited', false],
        ['3, since time.sleep blocks the whole event loop', true],
        ['It raises, since time.sleep is banned inside async', false],
      ], 'time.sleep is a blocking call: it never yields to the event loop, so the three coroutines run one after another. With await asyncio.sleep(1) the loop could switch while waiting and the total would be about 1 second.'),
      mcq(`A request handler calls this helper. What does the user see in the logs?

    async def send_mail():
        print("sent")

    def handler():
        send_mail()

    handler()`, [
        ['"sent", printed in the background a little later', false],
        ['"sent", printed at once, as it would be for any function', false],
        ['A TypeError: coroutines cannot be called from def code', false],
        ['No "sent", and a warning that it was never awaited', true],
      ], 'Calling an async function only creates a coroutine object; its body never runs. When the unused coroutine is collected, Python emits RuntimeWarning: coroutine \'send_mail\' was never awaited.'),
    ],
    checkpoint: [
      ck('PYTHON_ADVANCED', `Four threads each run this 1,00,000 times on the default CPython build. A teammate says "the GIL makes it safe, so no lock is needed." Why is that wrong?

    counter = 0
    def inc():
        global counter
        counter += 1`, [
        ['+= is a load, an add and a store; a switch in between loses updates', true],
        ['The GIL is held only while a thread does I/O, never for arithmetic', false],
        ['Globals are copied per thread, so each has its own counter', false],
        ['The GIL serialises threads, so counter is always exactly 4,00,000', false],
      ], 'The GIL guarantees one bytecode at a time, not that a Python statement is atomic. counter += 1 compiles to separate load, add and store instructions, and a thread switch between them overwrites another thread\'s update. Guard it with a Lock.'),
      ck('PYTHON_ADVANCED', 'On the default CPython build, which job gets a real speed-up from a ThreadPoolExecutor with 20 workers?', [
        ['Resizing 10,000 images with a pure-Python pixel loop', false],
        ['Calling a slow partner API for 500 order IDs over HTTP', true],
        ['Computing SHA-style checksums in a pure-Python loop', false],
        ['Sorting ten lists of a million integers in Python', false],
      ], 'Threads help when they spend their time waiting: a thread blocked on a socket releases the GIL so the others can send their requests. The other jobs are CPU-bound Python and would contend for the GIL.'),
      ck('PYTHON_ADVANCED', 'A teammate says: "Python 3.13 removed the GIL, so our CPU-bound threads scale now." What is the accurate correction?', [
        ['3.13 removed it, but only for code run inside asyncio', false],
        ['3.13 removed it, so only C extensions still need locks', false],
        ['3.13 adds an optional free-threaded build; default keeps it', true],
        ['3.13 made the GIL per-thread, so threads never contend', false],
      ], 'PEP 703 shipped an experimental free-threaded CPython (python3.13t) alongside the normal build. The default interpreter still has the GIL, and extensions must support the free-threaded build before code can rely on it.'),
    ],
  },

  /* ── IV_ERRORS_MEMORY ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_PYTHON_IV_ERRORS_MEMORY',
    notes: `This set pairs two things interviewers often ask together: exception design (does the
candidate write handlers that hide bugs?) and memory (does the candidate know what CPython does when
the last reference to an object goes away?).

## Q1. "Describe the exception hierarchy. Why not catch BaseException?"

**Strong answer.** Everything derives from \`BaseException\`. Its direct children include
\`Exception\` (all ordinary errors), \`KeyboardInterrupt\`, \`SystemExit\` and \`GeneratorExit\` — the
last three are *not* \`Exception\` subclasses, precisely so \`except Exception:\` does not swallow
Ctrl+C or \`sys.exit()\`. A bare \`except:\` catches \`BaseException\` and does swallow them. Catch the
narrowest type you can handle, put subclasses before their bases, and never \`except Exception: pass\`.

## Q2. "What are else and finally for?"

**Strong answer.** \`else\` runs only if the \`try\` block raised nothing — it keeps code that should
*not* be protected out of the \`try\`. \`finally\` always runs: on success, on an exception, and on
\`return\`, \`break\` or \`continue\` leaving the block.

    def charge():
        try:
            return "charged"
        finally:
            print("audit", end=" ")
    print(charge())                 # audit charged

The return value is computed first, \`finally\` runs, then the function returns.

## Q3. "What if finally has its own return?"

**Strong answer.** It **overrides** the try's return *and swallows any exception in flight*:

    def load():
        try:
            raise ValueError("bad row")
        finally:
            return "fallback"       # the ValueError is silently lost

That is why it is a bug in code review. Python 3.14 (PEP 765) emits a \`SyntaxWarning\` for
\`return\`, \`break\` or \`continue\` that leave a \`finally\` block.

## Q4. "What does raise ... from do?"

**Strong answer.** \`raise NewError(...) from err\` sets \`__cause__\` and prints "The above exception
was the direct cause of the following exception". Raising inside an \`except\` without \`from\` still
records the original as \`__context__\` ("During handling of the above exception, another exception
occurred"). \`raise ... from None\` hides the original — useful when translating a low-level
\`KeyError\` into a clean domain error at an API boundary.

**Follow-up:** "When do you translate exceptions?" — at layer boundaries: a repository turns
\`pymysql.err.IntegrityError\` into \`DuplicateEmail\`, so the view does not know about the driver.

## Q5. "EAFP or LBYL?"

**Strong answer.** Python favours **EAFP** — "easier to ask forgiveness than permission": try the
operation and catch the specific failure (\`try: d[k] except KeyError\`). LBYL (\`if k in d\`) is fine
but racy for shared resources: \`if os.path.exists(p): open(p)\` can fail between check and use.

## Q6. "Explain the context manager protocol."

**Strong answer.** \`with expr as x:\` calls \`expr.__enter__()\` (its return value is bound to \`x\`),
runs the block, then *always* calls \`__exit__(exc_type, exc, tb)\` — with \`None\`s on success. If
\`__exit__\` returns a truthy value the exception is **suppressed**. \`contextlib.contextmanager\` turns a
generator into one: code before \`yield\` is enter, code after is exit (put it in \`finally\`).
\`contextlib.suppress(FileNotFoundError)\` is the explicit way to ignore an error.

## Q7. "How does CPython manage memory?"

**Strong answer.** "Mainly **reference counting**: every object counts the references to it, and
when the count drops to zero it is freed *immediately* — that is why a file object closed by its
destructor closes at a predictable point in CPython (but not on PyPy). \`del x\` removes a name and
decrements the count; it does not delete the object if others refer to it. On top of that a
**generational cycle collector** (\`gc\` module) finds groups of objects that refer only to each
other."

**Follow-up:** "What does \`sys.getrefcount(x)\` show?" — one more than you expect, because passing
\`x\` as an argument creates a temporary reference.

## Q8. "What is a reference cycle, and why does it matter?"

**Strong answer.** \`a.peer = b; b.peer = a\` — after \`del a, b\` both counts are still 1, so reference
counting alone never frees them. The cycle collector does, on its own schedule or on
\`gc.collect()\`. Cycles delay freeing (bad for big buffers) and used to block collection of objects
with \`__del__\` before 3.4. Break cycles with \`weakref\` for back-pointers (child → parent).

## Q9. "What is a weakref, and where would you use one?"

**Strong answer.** A reference that does **not** increase the count. \`weakref.ref(obj)()\` returns the
object while it lives and \`None\` afterwards. \`WeakValueDictionary\` makes a cache that never keeps
its entries alive on its own; observers and parent pointers are other uses. Not every type supports
weak references (\`int\`, \`list\` and \`dict\` instances do not).

## Q10. "Can Python leak memory?"

**Strong answer.** Yes — through anything that stays reachable: a module-level dict used as an
unbounded cache, \`lru_cache(maxsize=None)\` on a method (it holds every \`self\`), growing lists of
callbacks, or C extensions. Find it with \`tracemalloc\` snapshots compared over time.

## How you are judged

Strong candidates can say what runs in what order (\`try\` → \`else\` → \`finally\`), translate
exceptions at a boundary with \`from\`, and describe refcounting plus the cycle collector. Weak ones
use bare \`except:\` or say "Python has a garbage collector like Java, so memory is not my problem".`,
    mcqs: [
      mcq(`What does this print?

    def charge():
        try:
            return "charged"
        finally:
            print("audit", end=" ")

    print(charge())`, [
        ['charged audit', false],
        ['charged, and the finally block is skipped', false],
        ['audit charged', true],
        ['audit, then None, since finally ran last', false],
      ], 'The return value is evaluated first, then finally runs before the function actually returns, printing "audit ". The caller then prints the returned "charged" on the same line.'),
      mcq(`What does this print on Python 3.13?

    def load():
        try:
            raise ValueError("bad row")
        finally:
            return "fallback"

    print(load())`, [
        ['fallback, and the ValueError is silently discarded', true],
        ['fallback, followed by the ValueError traceback', false],
        ['Only the ValueError traceback; nothing is printed', false],
        ['None, because the exception cancels the return', false],
      ], 'A return inside finally replaces whatever the try block was doing, including an exception being raised, so the error vanishes. Python 3.14 adds a SyntaxWarning for this pattern (PEP 765).'),
      mcq(`What does this print?

    class Quiet:
        def __enter__(self):
            return self
        def __exit__(self, exc_type, exc, tb):
            print("exit", exc_type.__name__)
            return True

    with Quiet():
        1 / 0
    print("after")`, [
        ['A ZeroDivisionError traceback, and nothing else', false],
        ['"exit ZeroDivisionError", then a traceback', false],
        ['"after" only, as __exit__ is skipped on errors', false],
        ['"exit ZeroDivisionError", then "after"', true],
      ], '__exit__ always runs and receives the exception\'s type, value and traceback. Returning True tells the with statement the exception was handled, so it is suppressed and execution continues after the block.'),
    ],
    checkpoint: [
      ck('PYTHON_ERROR_HANDLING', `What does this print?

    try:
        try:
            int("x")
        except ValueError as e:
            raise KeyError("config") from e
    except KeyError as k:
        print(type(k.__cause__).__name__, k.__suppress_context__)`, [
        ['NoneType False', false],
        ['ValueError True', true],
        ['ValueError False', false],
        ['KeyError True', false],
      ], 'raise ... from e stores the ValueError as __cause__ and sets __suppress_context__ to True, so the traceback shows the explicit "direct cause" message rather than the implicit "during handling" one.'),
      ck('PYTHON_ERROR_HANDLING', `What does this print?

    def parse(s):
        try:
            n = int(s)
        except ValueError:
            return "bad"
        else:
            return "ok"
        finally:
            print("done", end=" ")

    print(parse("12"), parse("x"))`, [
        ['done ok done bad', false],
        ['ok bad done done', false],
        ['done done ok bad', true],
        ['ok done bad done', false],
      ], 'print evaluates both arguments before printing anything. Each call runs its finally block, printing "done " twice, and the return values "ok" (from else) and "bad" (from except) are printed afterwards.'),
      ck('PYTHON_ERROR_HANDLING', `On CPython, what does this print?

    import weakref

    class Session: pass

    s = Session()
    r = weakref.ref(s)
    print(r() is s, end=" ")
    del s
    print(r())`, [
        ['True None', true],
        ['True, then the Session object again', false],
        ['False None', false],
        ['A TypeError: weak references need a slot', false],
      ], 'A weak reference does not keep the object alive. del s drops the only strong reference; CPython frees the object at once by reference counting, so calling the weakref then returns None.'),
    ],
  },

  /* ── RAPID_FIRE ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_PYTHON_RAPID_FIRE',
    notes: `A screening call: thirty questions in about ten minutes. The interviewer wants a correct,
one-line answer — not an essay. Cover the answer, say yours out loud, then check.

## Data model

1. **Which small integers does CPython cache?** — -5 to 256 (an implementation detail).
2. **\`[] is []\`?** — False; two new list objects.
3. **Right way to test for None?** — \`x is None\`.
4. **What does \`id()\` return in CPython?** — The object's memory address, unique among live objects.
5. **Is a tuple holding a list hashable?** — No; hashing reaches the list and raises \`TypeError\`.
6. **\`round(2.5)\`?** — 2; Python rounds halves to even (banker's rounding).
7. **\`0.1 + 0.2 == 0.3\`?** — False; use \`math.isclose\` or \`Decimal\`.
8. **\`7 // -2\`?** — -4; floor division rounds toward negative infinity.
9. **Type of \`1 / 2\`?** — \`float\` (0.5); \`//\` for integer division.

## Collections

10. **Since when is dict order guaranteed?** — Python 3.7 (CPython 3.6 as a detail).
11. **Average cost of \`x in some_set\`?** — O(1); in a list, O(n).
12. **Cost of \`list.insert(0, x)\`?** — O(n); every element shifts.
13. **Queue type with O(1) pops from the left?** — \`collections.deque\`.
14. **What does \`list.sort()\` return?** — \`None\`; it sorts in place.
15. **Is Python's sort stable?** — Yes (Timsort).
16. **Hashable version of a set?** — \`frozenset\`.

## Functions

17. **When are default arguments evaluated?** — Once, when \`def\` runs.
18. **Type of \`args\` in \`*args\`?** — A tuple.
19. **What does a bare \`*\` in a signature do?** — Makes the later parameters keyword-only.
20. **What does \`/\` in a signature do?** — Makes earlier parameters positional-only (3.8+).
21. **What does \`functools.wraps\` preserve?** — Name, docstring, module, qualname, plus \`__wrapped__\`.
22. **What does \`next()\` on an exhausted generator raise?** — \`StopIteration\`.
23. **Default recursion limit?** — 1000 (\`sys.getrecursionlimit()\`).

## OOP

24. **Define \`__eq__\` only — what happens to \`__hash__\`?** — It becomes \`None\`; instances are unhashable.
25. **What is \`super()\` relative to?** — The next class in the instance's MRO.
26. **What does \`__name\` in a class become?** — \`_ClassName__name\` (name mangling).

## Concurrency and runtime

27. **Default GIL switch interval?** — 5 ms (\`sys.getswitchinterval()\` is 0.005).
28. **Default multiprocessing start method on Windows?** — spawn.
29. **Two exceptions \`except Exception\` does not catch?** — \`KeyboardInterrupt\`, \`SystemExit\`.
30. **Primary memory management in CPython?** — Reference counting, plus a cycle collector.

## Scoring

25+ correct and quick: strong. 20–24: fine, revise the misses. Under 20, or any "Python passes by
reference" / "dicts are unordered" / "the GIL makes code thread-safe": go back to the question sets.`,
    mcqs: [
      mcq('Rapid fire: "What does round(2.5) return in Python 3?"', [
        ['3, because halves always round up', false],
        ['2.5, because round keeps one decimal', false],
        ['2, because halves round to the even number', true],
        ['3.0, because round always returns a float', false],
      ], 'Python 3 uses round-half-to-even (banker\'s rounding) to avoid a systematic upward bias, so round(2.5) is 2 and round(3.5) is 4. With no ndigits argument the result is an int.'),
      mcq('Rapid fire: "Which range of integers does CPython keep as pre-made shared objects?"', [
        ['-5 to 256', true],
        ['0 to 255', false],
        ['-128 to 127', false],
        ['-1 to 1024', false],
      ], 'CPython pre-creates the small ints from -5 to 256, so every occurrence is the same object. It is an implementation detail; -128 to 127 is Java\'s Integer cache, a common mix-up.'),
      mcq('Rapid fire: "From which Python version is dict insertion order part of the language?"', [
        ['Python 3.6, when the compact dict landed', false],
        ['Python 3.0, when dicts were rewritten', false],
        ['Python 2.7, through OrderedDict merging', false],
        ['Python 3.7, as a language guarantee', true],
      ], 'CPython 3.6\'s compact dict preserved order as an implementation detail; Python 3.7 made insertion order an official guarantee of the language that every implementation must follow.'),
      mcq('Rapid fire: "What does 7 // -2 evaluate to?"', [
        ['-3, because // truncates toward zero', false],
        ['-4, because // floors toward minus infinity', true],
        ['-3.5, because // keeps the fraction', false],
        ['3, because // drops the divisor sign', false],
      ], 'Floor division rounds down to the next lower integer, so -3.5 becomes -4. C and Java truncate toward zero and would give -3 — interviewers ask it to see whether you know the difference.'),
      mcq('Rapid fire: "Which of these does except Exception NOT catch?"', [
        ['ValueError raised by int("x")', false],
        ['KeyError raised by a missing key', false],
        ['SystemExit raised by sys.exit()', true],
        ['ZeroDivisionError raised by 1 / 0', false],
      ], 'SystemExit, KeyboardInterrupt and GeneratorExit inherit from BaseException directly, not from Exception, so ordinary handlers let a program exit or be interrupted. A bare except would catch them.'),
      mcq('Rapid fire: "Is Python\'s built-in sort stable?"', [
        ['Only when sorting with a key function', false],
        ['Yes; equal keys keep their original order', true],
        ['No; it is a quicksort variant for speed', false],
        ['Only for lists, not for sorted() output', false],
      ], 'Both list.sort and sorted use Timsort, which is guaranteed stable for any input, so sorting by one field and then by another gives a correct multi-key ordering.'),
    ],
  },

  /* ── MOCK ───────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_PYTHON_MOCK',
    notes: `This is the interviewer's script for a 35-minute Python round at a product company or the
technical round of a service company's premium hiring. Do it with a friend reading the interviewer's
lines, or record yourself. The scoring notes are what a real panel writes down.

## Opening (2 min)

"Which Python version did your capstone use, and name one feature newer than 3.8 that you actually
used."

- **Strong:** "3.12. I used \`match\` to route webhook event types, and Pydantic models with
  \`str | None\` annotations in the FastAPI service."
- **OK:** names the version, vague on features.
- **Weak:** cannot name the version, or names a feature and cannot write a line of it.

## Q1. Names and objects (4 min)

"\`def f(lst): lst.append(1); lst = [9]\` — what does the caller's list look like after \`f(mine)\`?"
**Follow-up:** "Is Python pass-by-reference?"

- **Strong:** the append is visible, the rebinding is not; "pass-by-object-reference" with the
  reason.
- **OK:** correct output, fuzzy terminology.
- **Weak:** "the list becomes [9]" or "Python passes by reference".

## Q2. Mutable default (4 min)

"Find the bug: \`def add_item(x, items=[])\`. Now fix it."
**Follow-up:** "Why is \`items = items or []\` not a complete fix?"

- **Strong:** defaults evaluated once at \`def\`; fix with \`None\` and \`is None\`; explains that \`or\`
  replaces a caller's *empty* list, so the caller's list is never appended to.
- **Weak:** "Python resets defaults on each call".

## Q3. Dict internals (5 min)

"How does a dict find a key? What makes something hashable? Why is \`{1: 'a', True: 'b'}\` one entry?"

- **Strong:** hash → slot → probe on collision, compare with \`==\`; insertion order guaranteed since
  3.7; hash must not change and must agree with \`__eq__\`; \`1 == True\` with equal hashes.
- **OK:** "it's a hash table", no probing or hash/eq contract.

## Q4. Closures and decorators (5 min)

"What does \`[lambda: i for i in range(3)]\` return when each is called? Then write a decorator that
logs how long a function took, with an optional label: \`@timed("db")\`."

- **Strong:** \`[2, 2, 2]\` with *late binding* named; three-level decorator with
  \`functools.wraps\`, \`*args, **kwargs\`, and \`try/finally\` so a failing call is still timed.
- **OK:** correct decorator without \`wraps\`.
- **Weak:** cannot desugar \`@timed("db")\` into \`f = timed("db")(f)\`.

## Q5. OOP (4 min)

"I define \`__eq__\` on a class and now \`set()\` of its objects fails. Why? Then: what does \`super()\`
call in \`class D(B, C)\`?"

- **Strong:** \`__hash__\` is set to \`None\`; add a field-based hash only if immutable (or
  \`@dataclass(frozen=True)\`); \`super()\` follows the MRO of the instance — D, B, C, A.
- **Weak:** "super calls the parent".

## Q6. The GIL (5 min)

"Our report job is CPU-heavy. A colleague added 8 threads and nothing got faster. Explain, and fix
it." **Follow-up:** "Then why do threads help our web scraper?"

- **Strong:** one thread runs bytecode at a time; pure-Python CPU work never releases the GIL; use
  \`ProcessPoolExecutor\` (mind pickling and the \`__main__\` guard); I/O releases the GIL, so threads or
  asyncio help the scraper. Mentions the 3.13 free-threaded build *as optional and experimental*.
- **OK:** "use multiprocessing", cannot say why threads help I/O.
- **Weak:** "Python can't do parallelism" or "3.13 removed the GIL".

## Q7. Errors and memory (4 min)

"When does \`finally\` run? What happens if it contains \`return\`? Then: how does CPython free an
object, and what about \`a.peer = b; b.peer = a\`?"

- **Strong:** always runs; a \`return\` in it overrides the result and swallows exceptions; reference
  counting frees at zero, the cycle collector handles cycles, \`weakref\` for back-pointers.
- **Weak:** "Python has garbage collection so leaks can't happen".

## Whiteboard task (5 min)

"Write an LRU cache class with \`get(key)\` and \`put(key, value)\` and a capacity, without
\`functools.lru_cache\`."

    from collections import OrderedDict

    class LRU:
        def __init__(self, capacity):
            self.capacity, self.data = capacity, OrderedDict()
        def get(self, key):
            if key not in self.data:
                return None
            self.data.move_to_end(key)          # mark as recently used
            return self.data[key]
        def put(self, key, value):
            self.data[key] = value
            self.data.move_to_end(key)
            if len(self.data) > self.capacity:
                self.data.popitem(last=False)   # evict least recently used

- **Strong:** the above, O(1) per operation, and says \`get\` must update recency; mentions a lock if
  shared across threads.
- **OK:** correct but O(n) eviction (scanning for the oldest).
- **Weak:** a plain dict with no recency on \`get\` — that is FIFO, not LRU.

## Scoring

Hire bar: strong on Q2, Q4 and Q6, at least OK everywhere else, and the whiteboard task correct. One
confident wrong fact ("the GIL makes code thread-safe", "dicts are unordered") outweighs two OK
answers.`,
    mcqs: [
      mcq(`For Q2, a candidate "fixes" the default like this. Why does the panel still mark it down?

    def collect(x, items=None):
        items = items or []
        items.append(x)
        return items

    mine = []
    collect(1, mine)`, [
        ['items or [] still shares one list between all callers', false],
        ['mine stays [], because an empty list is falsy and replaced', true],
        ['It raises TypeError, since None cannot be used with or', false],
        ['mine becomes [1, 1], because append runs twice here', false],
      ], 'An empty list is falsy, so items or [] creates a new list and the caller\'s mine is never appended to. Testing if items is None distinguishes "not given" from "given but empty".'),
      mcq('In the whiteboard task a candidate stores entries in a plain dict, evicts with next(iter(d)) when full, and does not touch the order in get(). What has the candidate built?', [
        ['A correct LRU cache, as dicts keep insertion order', false],
        ['A cache that never evicts, as dicts cannot drop keys', false],
        ['A FIFO cache: reads never refresh how recent a key is', true],
        ['An LRU that fails on Python 3.6 but works from 3.7', false],
      ], 'Evicting the first-inserted key without moving keys on each read removes the oldest insertion, not the least recently used. An LRU must move a key to the end on get (move_to_end, or pop and reinsert).'),
      mcq('For Q6, which answer earns "strong" on the CPU-heavy report job that 8 threads did not speed up?', [
        ['Raise the switch interval so each thread keeps the GIL longer', false],
        ['Use asyncio instead, since coroutines run on all CPU cores', false],
        ['Add a Lock around the work so threads stop fighting the GIL', false],
        ['Use a ProcessPoolExecutor; each process has its own GIL', true],
      ], 'Pure-Python CPU work holds the GIL, so threads take turns. Separate processes each run their own interpreter and GIL, giving real parallelism at the cost of pickling data across the boundary. asyncio is single-threaded.'),
    ],
  },

  /* ── CHECKPOINT ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_PYTHON_CHECKPOINT',
    notes: `Ten questions across the whole topic — names and identity, dicts and counters, closures and
generators, properties and ABCs, asyncio, exceptions and the cycle collector. Each is the kind of
code an interviewer slides across the table. Read the code fully before you answer; the traps are in
the details (a typo in a method name, a missing \`await\`, the order arguments are evaluated in).`,
    checkpoint: [
      ck('PYTHON_BASICS', `On CPython, what does this print?

    x = 100
    y = 1000
    print(int("100") is x, int("1000") is y)`, [
        ['True True', false],
        ['False False', false],
        ['True False', true],
        ['False True', false],
      ], 'CPython hands out the cached small-int object for 100, so both names refer to it. 1000 is outside the -5..256 cache, so int("1000") builds a new object. Compare numbers with ==; identity here is an implementation detail.'),
      ck('PYTHON_COLLECTIONS', `What does this print?

    from collections import Counter
    votes = Counter("abracadabra")
    print(votes.most_common(2))`, [
        ["[('a', 5), ('r', 2)]", false],
        ["[('a', 5), ('b', 2)]", true],
        ["[('a', 5), ('c', 1)]", false],
        ["[('a', 4), ('b', 2)]", false],
      ], '"abracadabra" has five a, two b, two r. b and r tie on 2; most_common sorts stably, so ties keep the order elements were first seen, and b appears before r.'),
      ck('PYTHON_COLLECTIONS', `What does this print?

    prices = {"tea": 10}
    keys = prices.keys()
    prices["coffee"] = 20
    print(len(keys), "coffee" in keys)`, [
        ['1 False', false],
        ['1 True', false],
        ['2 False', false],
        ['2 True', true],
      ], 'dict.keys() returns a live view, not a snapshot copy. After "coffee" is added the view reflects the dict\'s current keys, so it has length 2 and contains "coffee".'),
      ck('PYTHON_FUNCTIONS', `What does this print?

    def make_counter():
        count = 0
        def inc():
            nonlocal count
            count += 1
            return count
        return inc

    c1 = make_counter()
    c2 = make_counter()
    c1(); c1()
    print(c1(), c2())`, [
        ['3 4', false],
        ['1 1', false],
        ['3 3', false],
        ['3 1', true],
      ], 'Each call to make_counter creates a new count cell that only its own inc closes over. c1 has been called three times by the print; c2 is a separate counter called once.'),
      ck('PYTHON_FUNCTIONS', `What does this print?

    def read_rows():
        print("open", end=" ")
        yield 1
        print("close", end=" ")

    rows = read_rows()
    print("start", end=" ")
    for r in rows:
        print(r, end=" ")`, [
        ['open start 1 close', false],
        ['start open 1 close', true],
        ['open close start 1', false],
        ['start open 1', false],
      ], 'Calling a generator function runs none of its body; it only creates the generator. The body starts at the first next() from the loop, pauses at yield, and the loop\'s final next() runs the code after yield.'),
      ck('PYTHON_OOP', `What does this print?

    class Account:
        def __init__(self, balance):
            self.balance = balance
        @property
        def balance(self):
            return self._balance
        @balance.setter
        def balance(self, v):
            if v < 0:
                raise ValueError("negative")
            self._balance = v

    try:
        Account(-5)
    except ValueError as e:
        print("rejected:", e)`, [
        ['Nothing: __init__ bypasses the property', false],
        ['rejected: negative', true],
        ['AttributeError: object has no _balance', false],
        ['Account object with a balance of -5', false],
      ], 'self.balance = balance inside __init__ is an ordinary attribute assignment, so it goes through the property setter, which validates and raises. That is why a property protects construction too.'),
      ck('PYTHON_OOP', `What happens on the last line?

    from abc import ABC, abstractmethod

    class Notifier(ABC):
        @abstractmethod
        def send(self, msg): ...

    class SMS(Notifier):
        def sned(self, msg):
            return "ok"

    SMS()`, [
        ['An SMS object; send() fails only when called', false],
        ['An error at import, when the class SMS is defined', false],
        ['An SMS object whose send() silently returns None', false],
        ['TypeError: cannot instantiate, as send is abstract', true],
      ], 'The typo means SMS never overrides the abstract send, so SMS is still abstract. ABCs check this at instantiation: SMS() raises TypeError naming the unimplemented method. Defining the class itself is allowed.'),
      ck('PYTHON_ADVANCED', `What does this print?

    import asyncio

    async def job(name, delay):
        await asyncio.sleep(delay)
        print(name, end=" ")
        return name

    async def main():
        res = await asyncio.gather(job("A", 0.2), job("B", 0.1))
        print(res)

    asyncio.run(main())`, [
        ["A B ['A', 'B']", false],
        ["B A ['B', 'A']", false],
        ["B A ['A', 'B']", true],
        ["A B ['B', 'A']", false],
      ], 'Both coroutines sleep concurrently, so B finishes first and prints first. gather still returns results in the order the awaitables were passed in, not the order they completed.'),
      ck('PYTHON_ERROR_HANDLING', `What does this print, and how does the program end?

    import sys
    try:
        sys.exit(2)
    except Exception:
        print("caught")
    finally:
        print("cleanup")`, [
        ['"caught", "cleanup", then the program continues', false],
        ['"cleanup", then the program exits with status 2', true],
        ['"caught", then the program exits with code 2', false],
        ['Nothing; sys.exit stops the process immediately', false],
      ], 'sys.exit raises SystemExit, which derives from BaseException, not Exception, so the handler does not match. finally still runs and prints "cleanup", and the SystemExit then ends the program with code 2.'),
      ck('PYTHON_ERROR_HANDLING', `On CPython, what does this print?

    import gc, weakref

    class Node: pass

    gc.disable()
    a, b = Node(), Node()
    a.peer, b.peer = b, a
    probe = weakref.ref(a)
    del a, b
    print(probe() is None, end=" ")
    gc.collect()
    print(probe() is None)`, [
        ['True True', false],
        ['False False', false],
        ['True False', false],
        ['False True', true],
      ], 'After del, each Node is still referenced by the other, so reference counting cannot free them and the weakref stays alive. The cycle collector finds the unreachable pair on gc.collect(), after which the weakref returns None.'),
    ],
  },
];
