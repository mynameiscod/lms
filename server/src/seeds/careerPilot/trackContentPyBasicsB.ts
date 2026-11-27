/**
 * Career-track content: Python fundamentals, second half (JT_PY_BASICS) — lists and tuples,
 * strings and f-strings, dictionaries and sets, functions, and the topic's ending units
 * (debugging, practice, the interview question and the checkpoint). The first five units of the
 * topic (types, conversions, operators, conditions, loops) live in their own file.
 *
 * Python is examined the way it is written: a short snippet and "what does this print, or which
 * error does it raise?". So nearly every question here is about one specific snippet, and every
 * quoted output was run. The notes teach Python 3.10+, and the graded exercise is plain 3.10
 * code, because the runner is Python 3.10.
 *
 * Attribution: the topic is multi-skill. Every checkpoint question names the one skill it
 * measures, taken from its own unit's skillKeys (concept units) or from the topic's list
 * (debugging, practice, interview and checkpoint units). Practice mcqs name none.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_PY_BASICS_B_BUNDLES: PilotBundle[] = [
  /* ══ JT_PY_BASICS — Python Fundamentals (lists to the checkpoint) ════════════════════════ */
  {
    unitCode: 'JT_PY_BASICS_LISTS_TUPLES',
    notes: `A **list** is an ordered, changeable sequence of any objects. A **tuple** is the same idea,
but it cannot be changed once made. Between them they hold most of the data a beginner program
touches, and three things about them cause most of the bugs: indexes start at 0, slices stop
*before* the end index, and assigning a list to a second name does not copy it.

## Making and indexing a list

    marks = [72, 85, 91, 60]
    print(len(marks))      # 4
    print(marks[0])        # 72  — the first element is index 0
    print(marks[-1])       # 60  — negative indexes count from the end
    print(marks[4])        # IndexError: list index out of range

A list can hold mixed types (\`[1, "two", 3.0, None]\`), but in real code a list usually holds
one kind of thing: a list of marks, a list of names.

## Slicing: \`[start:stop:step]\`

    letters = ["a", "b", "c", "d", "e", "f"]
    letters[1:4]     # ['b', 'c', 'd']   — stop (4) is excluded
    letters[:2]      # ['a', 'b']        — from the start
    letters[3:]      # ['d', 'e', 'f']   — to the end
    letters[-2:]     # ['e', 'f']        — the last two
    letters[::2]     # ['a', 'c', 'e']   — every second one
    letters[::-1]    # ['f', 'e', 'd', 'c', 'b', 'a']  — reversed
    letters[10:20]   # []                — a slice never raises IndexError

The length of \`x[i:j]\` is \`j - i\` (when both are in range). A slice always builds a **new**
list.

## Changing a list

    cart = ["pen"]
    cart.append("ink")          # ['pen', 'ink']            — one item at the end
    cart.extend(["pad", "clip"])# ['pen', 'ink', 'pad', 'clip'] — every item of another list
    cart.insert(0, "bag")       # ['bag', 'pen', 'ink', 'pad', 'clip']
    last = cart.pop()           # 'clip' is removed and returned
    first = cart.pop(0)         # 'bag'
    cart.remove("ink")          # removes the first 'ink'; ValueError if there is none
    cart[0] = "pencil"          # replace by index
    print(cart)                 # ['pencil', 'pad']
    print("pad" in cart)        # True

\`append(["a", "b"])\` adds *one* element, which is itself a list; \`extend\` adds each item.

## sort() versus sorted()

    nums = [5, 2, 9]
    result = nums.sort()
    print(result)           # None — sort() changes nums in place and returns nothing
    print(nums)             # [2, 5, 9]
    print(sorted([5, 2, 9], reverse=True))   # [9, 5, 2] — a new list; the original is untouched

The same split holds for \`reverse()\` (in place, returns None) and \`reversed()\` / \`[::-1]\`.
\`nums = nums.sort()\` is a classic bug: \`nums\` becomes \`None\`.

## Names, not boxes: aliasing

    a = [1, 2, 3]
    b = a              # b is a second name for the SAME list
    b.append(4)
    print(a)           # [1, 2, 3, 4]

    c = a[:]           # a copy — also list(a) or a.copy()
    c.append(5)
    print(a)           # [1, 2, 3, 4] — unchanged

Assignment never copies in Python; it binds another name to the same object. Even \`a += [5]\`
on a list changes the list in place, so every name sharing it sees the change.

These copies are **shallow**: a copy of a list of lists shares the inner lists. For a nested
copy use \`copy.deepcopy\`.

## The nested-list trap

    grid = [[0] * 3] * 2     # two references to ONE inner list
    grid[0][0] = 7
    print(grid)              # [[7, 0, 0], [7, 0, 0]]

    grid = [[0] * 3 for _ in range(2)]   # two separate inner lists
    grid[0][0] = 7
    print(grid)              # [[7, 0, 0], [0, 0, 0]]

## Tuples

    point = (3, 4)
    print(point[0])          # 3
    point[0] = 9             # TypeError: 'tuple' object does not support item assignment
    single = (5,)            # a one-element tuple needs the comma; (5) is just the int 5
    empty = ()

Use a tuple for a fixed group of values that belong together — a coordinate, a (name, mark)
pair, a date — and when you need it as a dictionary key (lists cannot be keys). A tuple is
immutable, but if it *holds* a list, that list can still change.

## Unpacking

    name, mark = ("Asha", 91)        # one name per element, or ValueError
    x, y = y, x                      # swap without a temporary
    head, *tail = [1, 2, 3, 4]       # head = 1, tail = [2, 3, 4]
    *body, end = "abc"               # body = ['a', 'b'], end = 'c'
    for i, item in enumerate(["x", "y"]):
        print(i, item)               # 0 x, then 1 y

A starred name always collects into a **list**, even when the source is a tuple or a string.

## Interview traps

- \`[1, 2, 3][3]\` raises IndexError, but \`[1, 2, 3][3:]\` is \`[]\`.
- \`list.sort()\` returns \`None\`; use \`sorted()\` when you want the result as a value.
- \`b = a\` does not copy. \`a[:]\`, \`list(a)\` and \`a.copy()\` do, one level deep.`,
    workedExample: `**Task.** Read marks separated by spaces, and print the top three in descending order,
the lowest mark, and the marks with the first and last removed (they are "warm-up" scores).

    raw = input()                         # e.g. 55 91 78 66 84 40
    marks = [int(m) for m in raw.split()] # [55, 91, 78, 66, 84, 40]

    top3 = sorted(marks, reverse=True)[:3]
    print("Top three:", top3)             # Top three: [91, 84, 78]

    print("Lowest:", min(marks))          # Lowest: 40

    middle = marks[1:-1]
    print("Without warm-ups:", middle)    # Without warm-ups: [91, 78, 66, 84]

    print(marks)                          # [55, 91, 78, 66, 84, 40] — still in input order

**Why it is written this way.**

- \`sorted(...)\` rather than \`marks.sort()\`: the original order is needed again at the end, and
  \`sorted\` leaves it alone.
- \`[:3]\` on the sorted list is safe even if fewer than three marks are entered; a slice never
  raises IndexError, while \`[0]\`, \`[1]\`, \`[2]\` would.
- \`marks[1:-1]\` drops the first and last in one expression and builds a new list.
- If a later line needs a changed copy, write \`working = marks[:]\` first, never
  \`working = marks\`.`,
    mcqs: [
      mcq('nums = [10, 20, 30, 40, 50] — what does print(nums[1:4:2]) show?',
        [['[20, 40]', true], ['[20, 30, 40]', false], ['[20, 40, 50]', false], ['[10, 30]', false]],
        'The slice starts at index 1 (20), stops before index 4, and takes every second element: indexes 1 and 3, which are 20 and 40.'),
      mcq('scores = [7, 8]; backup = scores; scores += [9] — what is len(backup) afterwards?',
        [['3, since += extended the one shared list', true], ['2, since += built a new list for scores', false], ['2, since backup was copied at assignment', false], ['It raises TypeError: a list cannot use +=', false]],
        'backup = scores binds a second name to the same list, and += on a list extends it in place. Both names see three elements.'),
      mcq('What does print(type((5)).__name__, type((5,)).__name__) print?',
        [['int tuple', true], ['tuple tuple', false], ['int int', false], ['tuple int', false]],
        'Parentheses alone only group an expression, so (5) is the int 5. It is the comma that makes a tuple: (5,) is a one-element tuple.'),
    ],
    checkpoint: [
      ck('PYTHON_LISTS_BASICS', 'grid = [[0] * 2] * 3; grid[0][0] = 1; print(grid) — what is printed?',
        [['[[1, 0], [1, 0], [1, 0]]', true], ['[[1, 0], [0, 0], [0, 0]]', false], ['[[1, 1], [0, 0], [0, 0]]', false], ['[[1, 0, 0], [0, 0], [0, 0]]', false]],
        'Multiplying the outer list repeats a reference to one inner list three times, so changing grid[0] changes the only inner list there is. Build rows with a comprehension instead.'),
      ck('PYTHON_LISTS_BASICS', 'a, *mid, z = [3, 1, 4, 1, 5] — what is mid?',
        [['[1, 4, 1]', true], ['(1, 4, 1)', false], ['[1, 4, 1, 5]', false], ['1', false]],
        'a takes the first element and z the last; the starred name collects everything in between, and a starred name is always a list.'),
      ck('PYTHON_LISTS_BASICS', 'vals = [3, 1, 2]; out = vals.sort(); print(out, vals) — what is printed?',
        [['None [1, 2, 3]', true], ['[1, 2, 3] [1, 2, 3]', false], ['[1, 2, 3] [3, 1, 2]', false], ['None [3, 1, 2]', false]],
        'list.sort() sorts the list in place and returns None. So out is None and vals itself is now sorted. sorted(vals) would return a new list instead.'),
    ],
  },
  {
    unitCode: 'JT_PY_BASICS_STRINGS',
    notes: `A \`str\` is an immutable sequence of characters. Everything you learned about indexing
and slicing lists works on strings; what does not work is changing one in place.

## Indexing, slicing and immutability

    city = "Hyderabad"
    city[0]        # 'H'
    city[-3:]      # 'bad'
    city[::-1]     # 'dabaredyH'
    len(city)      # 9
    city[0] = "h"  # TypeError: 'str' object does not support item assignment

    city.upper()
    print(city)            # Hyderabad — unchanged
    city = city.upper()    # keep the new string by assigning it
    print(city)            # HYDERABAD

Every string method returns a **new** string. A call whose result is not kept does nothing.

## The methods you will use daily

    s = "  Career Pilot  "
    s.strip()              # 'Career Pilot'   (lstrip / rstrip trim one side)
    s.lower()              # '  career pilot  '
    t = "Career Pilot"
    t.replace("Pilot", "Plan")  # 'Career Plan'
    t.startswith("Car")    # True
    t.endswith("t")        # True
    t.find("Pilot")        # 7
    t.find("z")            # -1   — find returns -1 when absent
    t.index("z")           # ValueError — index raises instead
    t.count("e")           # 2
    "Pilot" in t           # True
    "2026".isdigit()       # True;  "-5".isdigit() is False
    "x" * 3                # 'xxx'

## split and join

    "a b  c".split()       # ['a', 'b', 'c']        — no argument: any run of whitespace
    "a b  c".split(" ")    # ['a', 'b', '', 'c']    — exactly one space: empty pieces appear
    "2026-11-06".split("-")  # ['2026', '11', '06']
    "-".join(["x", "y", "z"])  # 'x-y-z'
    ", ".join(["red", "blue"]) # 'red, blue'
    "".join(reversed("abc"))   # 'cba'

\`join\` is called on the **separator**, and every item must already be a string:
\`",".join([1, 2])\` raises TypeError. Convert first: \`",".join(str(n) for n in nums)\`.

Reading numbers from one input line is the most common use of both:

    nums = [int(x) for x in input().split()]

## Strings and numbers do not mix silently

    age = 21
    "Age: " + age          # TypeError: can only concatenate str (not "int") to str
    "Age: " + str(age)     # 'Age: 21'
    "5" * 2                # '55'  — repetition, not arithmetic
    "10" < "9"             # True  — strings compare character by character

## f-strings

An f-string puts expressions inside \`{}\` and formats them with an optional spec after a colon.

    name, marks, total = "Asha", 437, 500
    pct = marks / total
    print(f"{name} scored {marks}/{total}")   # Asha scored 437/500
    print(f"{pct:.1%}")                       # 87.4%
    print(f"{marks / 3:.2f}")                 # 145.67  — two decimals, rounded
    print(f"{1234567:,}")                     # 1,234,567
    print(f"[{name:<6}]")                     # [Asha  ]  — left-align in 6
    print(f"[{marks:>6}]")                    # [   437]  — right-align in 6
    print(f"{7:03d}")                         # 007       — pad with zeros
    print(f"{marks=}")                        # marks=437 — handy while debugging

Columns of output line up when every row uses the same widths: \`f"{item:<10}{qty:>4}"\`.

## Characters and codes

    ord("A")      # 65
    chr(97)       # 'a'
    "apple" < "banana"   # True — compared by character codes
    "Zebra" < "apple"    # True — every capital letter sorts before every lowercase one

## Interview traps

- \`s.replace("a", "b")\` alone changes nothing; strings are immutable.
- \`split()\` and \`split(" ")\` differ whenever there are repeated spaces.
- \`find\` returns -1, \`index\` raises ValueError. Pick the one whose failure you want.`,
    workedExample: `**Task.** Read a full name typed carelessly (extra spaces, any case) and a score out of
80, and print a neat result card.

    raw_name = input()      # "   rAVI   kumar  "
    score = int(input())    # 67

    parts = raw_name.split()                    # ['rAVI', 'kumar'] — split() eats every run of spaces
    name = " ".join(p.capitalize() for p in parts)   # 'Ravi Kumar'
    initials = "".join(p[0].upper() for p in parts)  # 'RK'

    pct = score / 80
    print(f"{'Name':<8}{name}")         # Name    Ravi Kumar
    print(f"{'Initials':<8}{initials}")  # InitialsRK
    print(f"{'Score':<8}{score:>3}/80")  # Score    67/80
    print(f"{'Percent':<8}{pct:.1%}")    # Percent 83.8%

**Why it is written this way.**

- \`split()\` with no argument, not \`split(" ")\`: the input has several spaces in a row, and
  only the no-argument form ignores them all.
- \`capitalize()\` lowercases the rest of each word, so \`rAVI\` becomes \`Ravi\`.
- The label column is 8 wide and "Initials" is exactly 8 characters, so it touches the value.
  Seeing that in the output is the cue to widen the column to 10 — the format spec is the one
  place to change.
- \`:.1%\` multiplies by 100 and adds the sign, so there is no \`* 100\` to forget.`,
    mcqs: [
      mcq('What does print(len("  x  y ".split(" "))) print?',
        [['6', true], ['2', false], ['4', false], ['7', false]],
        'Splitting on exactly one space keeps an empty string between each pair of adjacent spaces and at each end: ["", "", "x", "", "y", ""], six pieces. split() with no argument would give 2.'),
      mcq('price = 1234.5 — what does print(f"{price:,.2f}") print?',
        [['1,234.50', true], ['1234.50', false], ['1,234.5', false], ['1,235', false]],
        'The comma adds a thousands separator and .2f shows exactly two decimals, padding 1234.5 to 1234.50.'),
      mcq('word = "python"; word[0] = "P" — what happens?',
        [['TypeError, since a str cannot be changed in place', true], ['word becomes "Python" as expected', false], ['IndexError, since index 0 is read-only', false], ['A new string is made and word is unchanged', false]],
        'Strings are immutable, so item assignment raises TypeError. To get "Python", build a new string: word = "P" + word[1:] or word.capitalize().'),
    ],
    checkpoint: [
      ck('PYTHON_BASICS', 'What does print("+".join("abc")) print?',
        [['a+b+c', true], ['abc+', false], ['+a+b+c', false], ['a+bc', false]],
        'A string is iterable, so join treats "abc" as the three items "a", "b" and "c" and puts the separator between them — never before the first or after the last.'),
      ck('PYTHON_BASICS', 's = "banana" — what does print(s.find("x"), s.count("an")) print?',
        [['-1 2', true], ['ValueError is raised', false], ['None 2', false], ['-1 3', false]],
        'find returns -1 when the text is absent (index would raise ValueError). "an" occurs twice without overlapping: b-an-an-a.'),
      ck('PYTHON_BASICS', 'n = 7 — what does print(f"[{n:>3}][{n:03d}]") print?',
        [['[  7][007]', true], ['[7  ][007]', false], ['[  7][  7]', false], ['[007][  7]', false]],
        '>3 right-aligns in a field of 3, padding with spaces; 03d pads with zeros to 3 digits. The first is padding for layout, the second for fixed-width numbers.'),
    ],
  },
  {
    unitCode: 'JT_PY_BASICS_DICTS_SETS',
    notes: `A **dict** maps keys to values: look up a value by its key instead of by position. A
**set** is a collection of unique values with no order. Both are hash-based, so checking
"is this key here?" is fast however large they grow.

## Dictionaries

    fees = {"basic": 999, "pro": 1999}
    print(fees["pro"])          # 1999
    fees["team"] = 4999         # add a key
    fees["basic"] = 899         # replace a value
    print(len(fees))            # 3
    print("pro" in fees)        # True  — in checks KEYS, not values
    print(1999 in fees)         # False
    print(fees["gold"])         # KeyError: 'gold'

## Looking up safely: get and setdefault

    print(fees.get("gold"))         # None — no error
    print(fees.get("gold", 0))      # 0    — your default
    tags = {}
    tags.setdefault("python", []).append("day1")
    tags.setdefault("python", []).append("day2")
    print(tags)                     # {'python': ['day1', 'day2']}

\`setdefault(key, default)\` returns the existing value if the key is there, and otherwise
stores the default first and returns it. It never overwrites.

## Removing

    del fees["team"]            # KeyError if missing
    price = fees.pop("basic")   # removes and returns 899
    fees.pop("gold", None)      # with a default, no error when missing

## Iterating

    marks = {"Asha": 91, "Ravi": 78, "Meena": 85}
    for name in marks:                 # keys
        print(name)
    for name, mark in marks.items():   # key and value together
        print(f"{name}: {mark}")
    print(list(marks.values()))        # [91, 78, 85]
    print(max(marks, key=marks.get))   # Asha — the key with the largest value

Since Python 3.7 a dict keeps keys in **insertion order**. Do not add or remove keys while
looping over the same dict (RuntimeError); loop over \`list(d)\` if you must.

## Counting and grouping — the two patterns you will write most

    counts = {}
    for word in "to be or not to be".split():
        counts[word] = counts.get(word, 0) + 1
    print(counts)    # {'to': 2, 'be': 2, 'or': 1, 'not': 1}

    by_letter = {}
    for word in ["apple", "avocado", "banana"]:
        by_letter.setdefault(word[0], []).append(word)
    print(by_letter) # {'a': ['apple', 'avocado'], 'b': ['banana']}

The standard library has ready-made versions: \`collections.Counter(words)\` and
\`collections.defaultdict(list)\`. Write the plain version first so you know what they do.

## What can be a key

Keys must be **hashable** — in practice, immutable: numbers, strings, tuples of those. A list
cannot be a key:

    seat = {(2, 5): "Asha"}     # fine — a tuple
    bad = {[2, 5]: "Asha"}      # TypeError: unhashable type: 'list'

Equal keys are the same key, and \`True == 1 == 1.0\`, so \`{1: "a", True: "b"}\` has one key.

## Sets

    visited = {"Delhi", "Pune", "Delhi"}
    print(visited)              # {'Delhi', 'Pune'} — duplicates vanish (order not guaranteed)
    visited.add("Goa")
    visited.discard("Mars")     # no error if absent (remove would raise KeyError)
    unique = set([3, 1, 3, 2])  # {1, 2, 3}
    empty = set()               # {} is an empty DICT, not a set

    a = {1, 2, 3}
    b = {2, 3, 4}
    a | b    # {1, 2, 3, 4}  union
    a & b    # {2, 3}        intersection
    a - b    # {1}           in a but not b
    a ^ b    # {1, 4}        in exactly one

A set has no index (\`visited[0]\` is a TypeError). To remove duplicates and keep the original
order, use \`list(dict.fromkeys(items))\`.

## Choosing

| You need | Use |
|---|---|
| Items in order, duplicates allowed | list |
| A fixed record that never changes, or a key | tuple |
| Look something up by name or id | dict |
| Uniqueness, or "is x one of these?" | set |

\`x in a_list\` checks every element; \`x in a_set\` is a single hash lookup. For a membership
test inside a loop over thousands of items, that difference is the whole run time.`,
    workedExample: `**Task.** Two lines of input list the students who attended Monday and Tuesday (names
separated by spaces, a name may repeat by mistake). Print how many came each day, who came both
days, who came only Monday, and how many times each name appears across both lines.

    monday = input().split()     # Asha Ravi Meena Asha
    tuesday = input().split()    # Ravi Kiran Asha

    mon, tue = set(monday), set(tuesday)
    print("Monday:", len(mon))                 # Monday: 3   — the repeat counted once
    print("Tuesday:", len(tue))                # Tuesday: 3
    print("Both:", sorted(mon & tue))          # Both: ['Asha', 'Ravi']
    print("Only Monday:", sorted(mon - tue))   # Only Monday: ['Meena']

    seen = {}
    for name in monday + tuesday:
        seen[name] = seen.get(name, 0) + 1
    for name, n in seen.items():
        print(f"{name}: {n}")
    # Asha: 3
    # Ravi: 2
    # Meena: 1
    # Kiran: 1

**Why it is written this way.**

- Sets answer the "who" questions, because attendance is about membership, not order or count.
- \`sorted(...)\` turns each set into a list in a fixed order; printing a set directly gives an
  order you cannot rely on, which makes output impossible to test.
- The count needs every occurrence, so it loops over the original lists, not the sets.
- \`seen.get(name, 0) + 1\` is the counting pattern: no KeyError on the first sighting.`,
    mcqs: [
      mcq('stock = {"pen": 3} — what does print(stock.get("ink", 0) + stock["pen"]) print?',
        [['3', true], ['KeyError: \'ink\'', false], ['None', false], ['TypeError: None + int', false]],
        'get with a default returns 0 for the missing key "ink" instead of raising, and stock["pen"] is 3, so the sum is 3.'),
      mcq('What does print(type({}).__name__) print?',
        [['dict', true], ['set', false], ['NoneType', false], ['frozenset', false]],
        'Empty braces make an empty dictionary — dicts had the {} syntax first. An empty set must be written set().'),
      mcq('What is {1, 2, 3} ^ {2, 3, 4}?',
        [['{1, 4}', true], ['{2, 3}', false], ['{1, 2, 3, 4}', false], ['{1}', false]],
        '^ is symmetric difference: elements in exactly one of the two sets. 2 and 3 are in both, so only 1 and 4 remain.'),
    ],
    checkpoint: [
      ck('PYTHON_COLLECTIONS', 'counts = {}; for ch in "abca": counts[ch] = counts.get(ch, 0) + 1 — what is counts?',
        [["{'a': 2, 'b': 1, 'c': 1}", true], ["{'a': 1, 'b': 1, 'c': 1}", false], ["{'a': 2, 'c': 1, 'b': 1}", false], ['A KeyError on the first character', false]],
        'get(ch, 0) supplies 0 the first time each letter is seen, so there is no KeyError. "a" appears twice, and keys keep the order they were first inserted: a, b, c.'),
      ck('PYTHON_COLLECTIONS', 'd = {"x": 1}; d.setdefault("x", 5); d.setdefault("y", 5) — what is d now?',
        [["{'x': 1, 'y': 5}", true], ["{'x': 5, 'y': 5}", false], ["{'x': 1}", false], ["{'x': 5}", false]],
        'setdefault only stores the default when the key is missing. "x" already exists, so it keeps 1; "y" is new, so it is added with 5.'),
      ck('PYTHON_COLLECTIONS', 'What does print(len({True, 1, 1.0})) print?',
        [['1', true], ['3', false], ['2', false], ['TypeError: mixed types', false]],
        'A set keeps one of each equal value, and True == 1 == 1.0 with equal hashes. All three count as the same element, so the set has one member.'),
    ],
  },
  {
    unitCode: 'JT_PY_BASICS_FUNCTIONS',
    notes: `A function gives a block of code a name, takes inputs as **parameters**, and hands back a
result with \`return\`. Most real Python is functions calling functions.

## def and return

    def gst(amount, rate):
        """Return the tax on amount at the given percentage rate."""
        return amount * rate / 100

    tax = gst(1000, 18)
    print(tax)            # 180.0

A function without \`return\` (or with a bare \`return\`) returns \`None\`. Printing inside a
function is **not** returning:

    def shout(word):
        print(word.upper())

    result = shout("hi")  # prints HI
    print(result)         # None

\`return\` ends the function immediately; lines after it in the same block never run.

## Returning several values

    def min_max(values):
        return min(values), max(values)   # really one tuple

    lo, hi = min_max([4, 8, 1])            # unpacked: lo = 1, hi = 8

## Default and keyword arguments

    def ticket(name, seats=1, cls="economy"):
        return f"{name}: {seats} x {cls}"

    ticket("Asha")                    # 'Asha: 1 x economy'
    ticket("Asha", 2)                 # 'Asha: 2 x economy'
    ticket("Asha", cls="business")    # 'Asha: 1 x business' — skip seats by naming cls
    ticket(seats=3, name="Ravi")      # keyword arguments can come in any order
    ticket(name="Ravi", 3)            # SyntaxError: positional argument follows keyword argument
    ticket()                          # TypeError: missing 1 required positional argument: 'name'

Parameters with defaults must come after those without:
\`def f(a=1, b)\` is a SyntaxError.

## The mutable-default trap

A default value is created **once**, when \`def\` runs — not on each call.

    def add_item(item, basket=[]):
        basket.append(item)
        return basket

    print(add_item("pen"))   # ['pen']
    print(add_item("ink"))   # ['pen', 'ink']  — the same list, remembered between calls

The fix is a \`None\` default and a new list inside:

    def add_item(item, basket=None):
        if basket is None:
            basket = []
        basket.append(item)
        return basket

Immutable defaults (\`0\`, \`""\`, \`None\`, a tuple) are safe.

## *args and **kwargs

    def total(*nums):            # any number of positional arguments, as a tuple
        return sum(nums)

    total()          # 0
    total(4, 5, 6)   # 15

    def profile(name, **extra):  # any number of keyword arguments, as a dict
        return name, extra

    profile("Asha", city="Pune", year=2)   # ('Asha', {'city': 'Pune', 'year': 2})

    values = [1, 2, 3]
    total(*values)   # 6 — * unpacks a list into separate arguments

A parameter after \`*args\` (or after a bare \`*\`) can only be passed by keyword:
\`def send(to, *, urgent=False)\` forces callers to write \`urgent=True\`, which reads clearly.

## Scope: local names

    count = 0
    def bump():
        count += 1     # UnboundLocalError

    def show():
        print(count)   # fine — reading a global is allowed

Assigning to a name anywhere inside a function makes it **local** to that function for the
whole body, so \`count += 1\` tries to read a local that has no value yet. \`global count\` would
make it work, but the better design is to pass the value in and return the new one:

    def bump(count):
        return count + 1

    count = bump(count)

## Arguments are passed by assignment

The parameter is bound to the same object the caller passed. Changing a **mutable** object
(\`lst.append\`) is visible to the caller; rebinding the parameter (\`lst = [...]\`) is not.

    def grow(lst):
        lst.append(99)     # the caller's list changes
        lst = [0]          # only the local name moves

    data = [1]
    grow(data)
    print(data)            # [1, 99]

## Functions are values

    def double(x):
        return x * 2

    action = double        # no parentheses: the function itself
    print(action(5))       # 10
    print(sorted(["pear", "fig", "banana"], key=len))   # ['fig', 'pear', 'banana']

Passing a function as \`key=\` is how you sort or pick the max by any rule.`,
    workedExample: `**Task.** Write \`grade(mark, pass_mark=40)\` that returns a letter, and
\`summary(*marks)\` that returns the average and a list of grades, and use them.

    def grade(mark, pass_mark=40):
        """Return 'A', 'B', 'C' or 'F' for one mark out of 100."""
        if mark < pass_mark:
            return "F"
        if mark >= 80:
            return "A"
        if mark >= 60:
            return "B"
        return "C"

    def summary(*marks, pass_mark=40):
        if not marks:
            return 0.0, []
        avg = sum(marks) / len(marks)
        grades = [grade(m, pass_mark) for m in marks]
        return round(avg, 1), grades

    avg, grades = summary(85, 62, 39, 47)
    print(avg, grades)                     # 58.2 ['A', 'B', 'F', 'C']
    print(summary(85, 62, 39, 47, pass_mark=50)[1])   # ['A', 'B', 'F', 'F']
    print(summary())                       # (0.0, [])

**Why it is written this way.**

- Each \`return\` leaves at once, so \`grade\` needs no \`elif\`/\`else\` chain: by the time the
  last line runs, every other case has returned.
- \`pass_mark\` comes after \`*marks\`, so it can only be given by keyword — nobody can pass 50 by
  accident as a mark.
- \`if not marks\` guards the empty call; without it, \`sum(()) / len(())\` raises
  ZeroDivisionError.
- The functions return values and print nothing, so the caller decides what to show and the
  functions can be tested.`,
    mcqs: [
      mcq('def greet(name): print("Hi", name) — then r = greet("Ravi"); print(r). What is printed?',
        [['Hi Ravi, then None', true], ['Hi Ravi, then Hi Ravi', false], ['Only None, since print returns', false], ['Hi Ravi, then an empty line', false]],
        'The call prints "Hi Ravi" as a side effect, but the function has no return statement, so it returns None, which the second print shows.'),
      mcq('def total(*nums): return sum(nums) — what does print(total(), total(2, 3)) print?',
        [['0 5', true], ['None 5', false], ['TypeError for total()', false], ['() 5', false]],
        '*nums collects the positional arguments into a tuple, which may be empty. sum of an empty tuple is 0, and sum((2, 3)) is 5.'),
      mcq('def area(w, h=2): return w * h — what does print(area(h=5, w=3)) print?',
        [['15', true], ['6', false], ['10', false], ['TypeError: wrong order', false]],
        'Keyword arguments are matched by name, not position, so w is 3 and h is 5; the default 2 is not used because h was given.'),
    ],
    checkpoint: [
      ck('PYTHON_FUNCTIONS', 'def add(item, bag=[]): bag.append(item); return bag — after add(1), what does print(add(2)) print?',
        [['[1, 2]', true], ['[2]', false], ['[1]', false], ['[2, 1]', false]],
        'The default list is created once, when def runs, and every call that omits bag shares it. The first call left 1 in it, so the second returns [1, 2].'),
      ck('PYTHON_FUNCTIONS', 'count = 0; def bump(): count += 1 — what happens when bump() is called?',
        [['UnboundLocalError is raised', true], ['The global count becomes 1', false], ['A local count becomes 1', false], ['NameError: no count yet', false]],
        'Assigning to count inside the function makes count local for the whole body, so += reads a local that has no value yet. Pass it in and return it, or declare global.'),
      ck('PYTHON_FUNCTIONS', 'def stats(xs): return min(xs), max(xs) — after lo, hi = stats([4, 9, 1]), what is hi - lo?',
        [['8', true], ['5', false], ['-8', false], ['TypeError: tuple', false]],
        'return min(xs), max(xs) returns the tuple (1, 9), which unpacks into lo = 1 and hi = 9. 9 - 1 is 8.'),
    ],
  },
  {
    unitCode: 'JT_PY_BASICS_DEBUGGING',
    notes: `These are the bugs every Python fundamentals reviewer sees weekly. Some raise an error
with a traceback; the dangerous ones run quietly and print the wrong answer.

## Reading a traceback

    Traceback (most recent call last):
      File "report.py", line 9, in <module>
        print(average(marks))
      File "report.py", line 4, in average
        return total / len(values)
    ZeroDivisionError: division by zero

Read from the **bottom**: the last line is the error type and message, the line above it is
where it happened, and the lines above that are the calls that led there. Here \`average\` was
given an empty list. The fix is in the caller or a guard in \`average\` — not in the division.

## 1. input() always returns a string

    age = input("Age: ")       # user types 19
    if age >= 18:
        print("adult")
    # TypeError: '>=' not supported between instances of 'str' and 'int'

Convert at the point you read: \`age = int(input("Age: "))\`. If the user may type \`19.5\` or
\`nineteen\`, \`int\` raises \`ValueError: invalid literal for int() with base 10\`; catch it or
validate first.

## 2. Joining text and numbers with +

    score = 42
    print("Score: " + score)
    # TypeError: can only concatenate str (not "int") to str

Use an f-string, \`f"Score: {score}"\`, or \`print("Score:", score)\`.

## 3. A missing colon or a stray indent

    if total > 100
        print("big")
    # SyntaxError: expected ':'

    def area(r):
    return 3.14 * r * r
    # IndentationError: expected an indented block after function definition on line 1

The caret in the message points at, or just after, the problem. Never mix tabs and spaces; let
the editor insert four spaces.

## 4. Off by one with range

    n = 5
    for i in range(1, n):
        print(i)          # 1 2 3 4 — five was meant to be included

\`range(a, b)\` stops before \`b\`. To include n, write \`range(1, n + 1)\`. Print the first and
last value of the loop variable when a count is off by one.

## 5. Removing from a list while looping over it

    nums = [2, 4, 5, 6]
    for n in nums:
        if n % 2 == 0:
            nums.remove(n)
    print(nums)           # [4, 5] — 4 survived

Removing 2 shifts every element left, so the loop's next index lands on 5 and skips 4. Build a
new list instead: \`nums = [n for n in nums if n % 2 != 0]\`.

## 6. Aliasing: one list, two names

    template = ["header"]
    page = template
    page.append("body")
    print(template)       # ['header', 'body'] — the template is damaged

Copy when you mean a copy: \`page = template[:]\`. The same bug hides in \`[[0] * 3] * 3\`.

## 7. KeyError on the first sighting

    counts = {}
    for w in words:
        counts[w] += 1    # KeyError: 'the'

Use \`counts[w] = counts.get(w, 0) + 1\`.

## 8. The function that prints instead of returning

    def double(x):
        print(x * 2)

    y = double(4)         # prints 8
    print(y + 1)
    # TypeError: unsupported operand type(s) for +: 'NoneType' and 'int'

\`NoneType\` in a message almost always means "a function returned nothing". Find the function
whose result you used and give it a \`return\`. The same message follows \`nums = nums.sort()\`.

## 9. State that survives between calls

    def register(name, roster=[]):
        roster.append(name)
        return roster

The second class's roster contains the first class's students. Use \`roster=None\` and create
the list inside.

## How to find these

1. Read the last line of the traceback, then the line it points to.
2. Print the values going into that line, with their types: \`print(repr(age), type(age))\`
   shows \`'19' <class 'str'>\`, which explains bug 1 at once. \`f"{age=}"\` does the same.
3. For a wrong answer with no error, shrink the input until the bug still shows, and trace the
   loop by hand or with \`breakpoint()\` (type \`n\` to step, \`p name\` to print, \`c\` to continue).
4. Change one thing, run again, and confirm the fix explains the symptom.`,
    mcqs: [
      mcq('nums = [2, 4, 5, 6]; a for loop over nums calls nums.remove(n) for each even n. What is nums afterwards?',
        [['[4, 5] — removing shifts items, so 4 is skipped', true], ['[5] — every even number is removed as planned', false], ['[2, 4, 5, 6] — remove only works outside a loop', false], ['RuntimeError — a list changed during iteration', false]],
        'Removing 2 moves 4 into index 0 while the loop moves on to index 1, which is now 5. Then 6 is removed. Filtering into a new list avoids this.'),
      mcq('age = input("Age: ") followed by if age >= 18: raises TypeError. What is the cause?',
        [['input() returned a str, which cannot be compared to an int', true], ['18 must be written as 18.0 when compared to input', false], ['>= cannot be used inside an if condition in Python', false], ['The prompt text "Age: " is compared instead of the answer', false]],
        'input always returns a string, even when the user types digits. Comparing a str with an int using >= is a TypeError; convert with int(input(...)).'),
      mcq('A traceback ends with: TypeError: unsupported operand type(s) for +: \'NoneType\' and \'int\'. What is the most likely cause?',
        [['A value on the left came from a function that returned nothing', true], ['An int and a float were added without converting one first', false], ['The variable on the left was never defined anywhere', false], ['A string holding digits was added to an int by mistake', false]],
        'NoneType means the value was None, which is what a function without a return statement gives back (as does list.sort()). An undefined name would be NameError; a str would say str.'),
      mcq('for i in range(1, n): print(i) with n = 5 prints 1 to 4, but 1 to 5 was wanted. What is the fix?',
        [['for i in range(1, n + 1):', true], ['for i in range(0, n):', false], ['for i in range(1, n, 1):', false], ['for i in range(n):', false]],
        'range stops before its end value, so the end must be one past the last number you want. range(0, n) and range(n) give 0 to 4, and a step of 1 changes nothing.'),
    ],
  },
  {
    unitCode: 'JT_PY_BASICS_PRACTICE',
    notes: `Write each of these from an empty file, reading from standard input with \`input()\`,
before looking anything up. Each one uses several parts of the topic at once.

## Exercise 1 — Number facts

Read an integer and print whether it is positive, negative or zero, even or odd, and how many
digits it has (\`-305\` has 3). Use \`abs\` and \`len(str(...))\`, then do it again with a
\`while\` loop and \`//= 10\`. Test with 0.

## Exercise 2 — Grade bands with match

Read a mark and print its band with \`match\` and guards (\`case m if m >= 80:\`), then rewrite
it with \`if\`/\`elif\`. Reject anything outside 0–100 with a message, and a non-number with a
caught \`ValueError\`.

## Exercise 3 — Second largest

Read numbers on one line and print the second-largest distinct value, or \`NONE\`. Do it once
with \`sorted(set(nums))\` and once in a single loop with two variables.

## Exercise 4 — Palindrome and vowels

Read a line, and print whether it is a palindrome ignoring case and spaces, and how many vowels
it has. Do it once with \`[::-1]\` and once with two indexes moving inward.

## Exercise 5 — Group by first letter

Read words on one line and print each first letter with its words, letters in alphabetical
order: \`a: apple, avocado\`. Use \`setdefault\`, then \`sorted\` on the keys, then \`", ".join\`.

## Exercise 6 — Functions

Rewrite Exercise 3 so that the main code only reads input and prints, and
\`def second_largest(nums)\` does the work and returns \`None\` when there is no answer. Write
\`def is_prime(n)\` and print the primes in the list.

The graded exercise below combines a list of words from a string, a dict that counts them, a
function that returns the dict, and f-string output.`,
    mcqs: [
      mcq('What does print(max(["fig", "kiwi", "plum"], key=len)) print?',
        [['kiwi', true], ['plum', false], ['fig', false], ['[\'kiwi\', \'plum\']', false]],
        'With key=len, max compares lengths: 3, 4 and 4. On a tie max keeps the first maximum it met, so "kiwi" wins over "plum".'),
      mcq('What does print(sorted(set("b a b".split()))) print?',
        [["['a', 'b']", true], ["{'a', 'b'}", false], ["['b', 'a', 'b']", false], ["['b', 'a']", false]],
        'split gives ["b", "a", "b"], set removes the duplicate, and sorted always returns a list, in ascending order.'),
      mcq('What does print(" ".join(reversed("x y z".split()))) print?',
        [['z y x', true], ['x y z', false], ['zyx', false], ['z  y  x', false]],
        'split makes ["x", "y", "z"], reversed walks it backwards, and join puts one space between the pieces.'),
      mcq('counts = {"a": 2, "b": 3} — what does print(max(counts, key=counts.get)) print?',
        [['b', true], ['3', false], ['a', false], ["('b', 3)", false]],
        'Iterating a dict gives its keys; key=counts.get ranks each key by its value, and max returns the key itself, not the value.'),
    ],
    assignment: {
      title: 'Word Report',
      description: 'Read one line of words and print how many there are, how many are distinct, the most frequent word, the longest word, and the words in reverse order.',
      instructions: `Write a program that reads **one line** of words separated by spaces (there may be
several spaces between words, and spaces at either end). There is at least one word, and words
contain only letters.

Words are compared **ignoring case**: \`Apple\`, \`apple\` and \`APPLE\` are the same word.

It prints exactly five lines:

    Words: <how many words the line has>
    Unique: <how many different words, ignoring case>
    Top: <the most frequent word, in lowercase> <how many times it appears>
    Longest: <the longest word, in lowercase>
    Reversed: <the words in reverse order, exactly as typed, separated by single spaces>

**Ties.** If several words share the highest count, \`Top\` is the one that appears first in
the line. If several words share the greatest length, \`Longest\` is the one that appears first.

**Example.** For the input

    Red apple green apple red APPLE

the output is

    Words: 6
    Unique: 3
    Top: apple 3
    Longest: apple
    Reversed: APPLE red apple green apple Red

\`apple\` and \`green\` are both five letters long; \`apple\` comes first, so it is the longest.

For \`one two three two one two\` the output is \`Words: 6\`, \`Unique: 3\`, \`Top: two 3\`,
\`Longest: three\`, \`Reversed: two one two three two one\`.

**Rules**

- Turn the line into a list of words, and keep that list — Reversed needs the words as typed.
- Write a function \`word_counts(words)\` that takes the list and **returns** a dict mapping
  each lowercased word to its count. It must not print anything. Use it for Unique and Top.
- Do not import anything (no \`collections.Counter\`); count with the dict yourself.
- Print with f-strings or \`print\`, with exactly one space after each colon and no trailing
  space.

**How it is graded**

Your program is run against the examples and several hidden cases (a single word, extra spaces,
ties for the top word, mixed case). Output is compared line by line.`,
      rubric: [
        { criterion: 'Correct output', description: 'All five lines are right for every test case, including a single word, extra spaces, mixed case and both tie rules.', maxPoints: 60 },
        { criterion: 'Lists, strings and the dict', description: 'The line is split into a list kept for Reversed, words are lowercased for counting, and a dict built with get (or an equivalent) does the counting without imports.', maxPoints: 25 },
        { criterion: 'Function and readability', description: 'word_counts returns the dict and prints nothing, names are clear, and the output is built with f-strings or join rather than by hand.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `def word_counts(words):
    """Return a dict mapping each lowercased word to how many times it appears."""
    counts = {}
    # TODO: add 1 to the count of each word, lowercased
    return counts


def main():
    words = input().split()
    counts = word_counts(words)
    # TODO: print the five lines: Words, Unique, Top, Longest and Reversed


main()
`,
        tests: [
          { input: 'Red apple green apple red APPLE\n', expectedOutput: 'Words: 6\nUnique: 3\nTop: apple 3\nLongest: apple\nReversed: APPLE red apple green apple Red' },
          { input: 'one two three two one two\n', expectedOutput: 'Words: 6\nUnique: 3\nTop: two 3\nLongest: three\nReversed: two one two three two one' },
          { input: 'Hello\n', expectedOutput: 'Words: 1\nUnique: 1\nTop: hello 1\nLongest: hello\nReversed: Hello', isHidden: true },
          { input: '  a  bb   a  bb  \n', expectedOutput: 'Words: 4\nUnique: 2\nTop: a 2\nLongest: bb\nReversed: bb a bb a', isHidden: true },
          { input: 'Zeta alpha ZETA Alpha beta\n', expectedOutput: 'Words: 5\nUnique: 3\nTop: zeta 2\nLongest: alpha\nReversed: beta Alpha ZETA alpha Zeta', isHidden: true },
          { input: 'Go go GO\n', expectedOutput: 'Words: 3\nUnique: 1\nTop: go 3\nLongest: go\nReversed: GO go Go', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 60,
      },
    },
  },
  {
    unitCode: 'JT_PY_BASICS_INTERVIEW_QUESTION',
    notes: `Three fundamentals questions that appear in nearly every Python screening, with model
answers and the follow-up a good answer earns.

## Q1. "What is the difference between a list and a tuple, and when would you use each?"

**Model answer.** "Both are ordered sequences that can hold any objects. A list is **mutable** —
you can append, remove and replace items — so it fits a collection that grows or changes, like
the lines of a file or a shopping cart. A tuple is **immutable**, so it fits a fixed record
whose parts mean different things, like a coordinate \`(x, y)\` or a \`(name, mark)\` pair, and
it is what a function returns when it returns several values. Because a tuple of immutable
values is hashable, it can be a dictionary key or a set member; a list cannot. A tuple is also
slightly smaller and faster to create, but I choose by meaning, not speed."

    seats = {(2, 5): "Asha"}      # a tuple key works
    seats = {[2, 5]: "Asha"}      # TypeError: unhashable type: 'list'

**Follow-up:** "So a tuple can never change?" — "The tuple itself can't: you can't rebind its
slots. But if it holds a mutable object, that object can change. \`t = ([1], 2)\` then
\`t[0].append(3)\` gives \`([1, 3], 2)\`. And such a tuple is no longer hashable, so it can't be
a key."

## Q2. "What is wrong with \`def add(item, items=[])\`?"

**Model answer.** "Default values are evaluated once, when the \`def\` statement runs, not on
every call. So every call that leaves out \`items\` shares one list, and items from earlier
calls leak into later ones. The idiom is a \`None\` default and a new list inside:"

    def add(item, items=None):
        if items is None:
            items = []
        items.append(item)
        return items

"It applies to any mutable default — a dict or a set too. Immutable defaults like \`0\` or
\`""\` are safe because nothing can change them."

**Follow-up:** "Why \`is None\` and not \`== None\` or \`if not items\`?" — "\`is\` checks
identity, and None is a single object, so it is exact and can't be fooled by a class's
\`__eq__\`. \`if not items\` would also replace an empty list the caller passed on purpose,
which is a different bug."

## Q3. "What is the difference between \`is\` and \`==\`?"

**Model answer.** "\`==\` asks whether two values are equal — it calls \`__eq__\`, so two
different lists with the same items are equal. \`is\` asks whether both names refer to the
**same object**. I use \`is\` only for singletons — \`None\`, \`True\`, \`False\` — and \`==\` for
everything else."

    a = [1, 2]
    b = [1, 2]
    print(a == b, a is b)    # True False
    c = a
    print(c is a)            # True — one list, two names

**Follow-up:** "Then why can \`x is y\` be True for two small ints?" — "CPython keeps one shared
object for each small integer, roughly -5 to 256, and often for short strings, as an
optimisation. That's an implementation detail, not a language rule, so code must never rely on
\`is\` for numbers or strings."

## Delivering it

State the distinction in one sentence, show a two-line example, and name the trap. The
follow-up is where the interviewer separates memorised answers from understanding — have the
tuple-holding-a-list, the \`None\` sentinel and the small-int cache answers ready.`,
    mcqs: [
      mcq('t = ([1], 2); t[0].append(3); print(t) — what happens?',
        [['([1, 3], 2) is printed', true], ['TypeError: tuples are immutable', false], ['([1], 2) is printed unchanged', false], ['([1], 2, 3) is printed instead', false]],
        'The tuple\'s slots cannot be rebound, but slot 0 holds a list, and the list itself is mutable. append changes that list, which the tuple still refers to.'),
      mcq('Which signature is the standard fix for a function that must start with a fresh list each call?',
        [['def log(msg, lines=None): lines = lines if lines is not None else []', true], ['def log(msg, lines=[]): lines.clear() before it appends the new msg', false], ['def log(msg, lines=list): the class is called on each call for you', false], ['def log(msg, lines=[][:]): the slice makes a new copy at each call', false]],
        'The default must be a value no call can change. None is that value, and the function creates the new list itself. [][:] is still evaluated once at def time, and clear() would wipe a list the caller passed.'),
      mcq('Which of these can be used as a dictionary key?',
        [['(1, 2)', true], ['[1, 2]', false], ['{1, 2}', false], ['{"a": 1}', false]],
        'A key must be hashable. A tuple of immutable values is; lists, sets and dicts are mutable and unhashable, so using one as a key raises TypeError.'),
    ],
  },
  {
    unitCode: 'JT_PY_BASICS_CHECKPOINT',
    notes: `Ten questions across Python fundamentals: types and conversion, truthiness, loops and the
loop else, lists and slicing, dictionaries and sets, and functions with default and variable
arguments. Each one is a snippet to trace by hand — write down the value of each name after each
line rather than guessing from the shape of the code.`,
    checkpoint: [
      ck('PYTHON_BASICS', 'x = "5" — what does print(x * 2, int(x) * 2) print?',
        [['55 10', true], ['10 10', false], ['55 55', false], ['TypeError: str * int', false]],
        'Multiplying a str by an int repeats it, so "5" * 2 is "55". int("5") is the number 5, and 5 * 2 is 10.'),
      ck('PYTHON_BASICS', 'What does print(bool("0"), bool(0.0), bool([0])) print?',
        [['True False True', true], ['False False False', false], ['False False True', false], ['True False False', false]],
        'Only empty or zero values are false. "0" is a non-empty string and [0] is a non-empty list, so both are True; 0.0 is zero, so it is False.'),
      ck('PYTHON_CONTROL_FLOW', 'for n in [1, 3, 5]: if n % 2 == 0: print("even"); break — followed by else: print("all odd"). What is printed?',
        [['all odd', true], ['even', false], ['Nothing at all', false], ['all odd, three times', false]],
        'A loop\'s else block runs when the loop finishes without break. No element is even, so break never runs and "all odd" is printed once.'),
      ck('PYTHON_CONTROL_FLOW', 'total = 0; for i in range(10, 0, -3): total += i — what is total?',
        [['22', true], ['21', false], ['12', false], ['55', false]],
        'range(10, 0, -3) gives 10, 7, 4 and 1 and stops before reaching 0. Their sum is 22.'),
      ck('PYTHON_LISTS_BASICS', 'a = [1, 2, 3]; b = a[:]; b[0] = 9 — what does print(a[0], b[0]) print?',
        [['1 9', true], ['9 9', false], ['1 1', false], ['9 1', false]],
        'a[:] builds a new list, so b is a separate copy. Replacing b[0] leaves a untouched. With b = a it would have printed 9 9.'),
      ck('PYTHON_LISTS_BASICS', 'What does print([5, 6, 7, 8][-3:]) print?',
        [['[6, 7, 8]', true], ['[5, 6, 7]', false], ['[8, 7, 6]', false], ['[7, 8]', false]],
        'Index -3 is the third from the end, which is 6, and an empty stop runs to the end of the list, giving the last three elements in their original order.'),
      ck('PYTHON_COLLECTIONS', 'What does print(len(set("letter"))) print?',
        [['4', true], ['6', false], ['5', false], ['1', false]],
        'set over a string collects its characters without duplicates: l, e, t and r. The repeated e and t count once, so there are 4.'),
      ck('PYTHON_COLLECTIONS', 'd = {"a": 1} — what does print(d.pop("a"), d) print?',
        [['1 {}', true], ["1 {'a': 1}", false], ["{'a': 1} {}", false], ['None {}', false]],
        'pop removes the key and returns its value. The arguments are evaluated left to right, so 1 is returned first and d is already empty when it is printed.'),
      ck('PYTHON_FUNCTIONS', 'def f(a, b=2, *rest): return a + b + len(rest) — what does print(f(1, 1, 1, 1)) print?',
        [['4', true], ['5', false], ['3', false], ['6', false]],
        'a takes 1, b takes the second 1 (overriding the default 2), and rest collects the last two into a tuple of length 2. 1 + 1 + 2 = 4.'),
      ck('PYTHON_FUNCTIONS', 'def tag(**kw): return sorted(kw) — what does print(tag(z=1, a=2)) print?',
        [["['a', 'z']", true], ["{'a': 2, 'z': 1}", false], ['[1, 2]', false], ["['z', 'a']", false]],
        '**kw collects the keyword arguments into a dict. Iterating a dict (which sorted does) gives its keys, so the result is the sorted list of names.'),
    ],
  },
];
