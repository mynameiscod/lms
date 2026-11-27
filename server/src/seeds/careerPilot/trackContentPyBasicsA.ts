/**
 * Career-track content: Python fundamentals, first half (JT_PY_BASICS) — types, conversions,
 * operators, conditions and loops. The rest of the topic (lists and tuples, strings, dictionaries
 * and sets, functions, and the ending units) lives in a sibling file.
 *
 * Python is examined the way it is written: a short snippet and "what does this print?". So nearly
 * every question here is about one specific snippet. Everything is Python 3.10, because that is
 * what the grader runs; every quoted output was run and checked.
 *
 * Attribution: the topic is multi-skill. Every checkpoint question names the one skill it
 * measures, taken from its own unit's skillKeys. Practice mcqs name none.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_PY_BASICS_A_BUNDLES: PilotBundle[] = [
  /* ══ JT_PY_BASICS — Python Fundamentals (types → loops) ═════════════════════════════════ */
  {
    unitCode: 'JT_PY_BASICS_TYPES',
    notes: `Python is **dynamically typed**: a variable has no type of its own. A name is a label
bound to an object, and the *object* carries the type. The same name can point at an int now and
a string a line later.

## Names are bound, not declared

    score = 90          # the name score now refers to the int object 90
    score = "ninety"    # same name, now bound to a str object
    print(type(score))  # <class 'str'>

There is no \`int score;\` and no "variable might not be initialised" at compile time. Reading a
name that was never assigned raises \`NameError\` when that line runs.

Assignment never copies an object; it binds another name to the same one:

    marks = [70, 80]
    backup = marks          # two names, ONE list
    backup.append(90)
    print(marks)            # [70, 80, 90]

For numbers and strings this never surprises you, because they are **immutable**: \`y += 1\` builds
a new int and rebinds \`y\`, leaving every other name alone.

    x = 5
    y = x
    y += 1
    print(x, y)             # 5 6

## The built-in types you use every day

    type        example           notes
    int         42, -7, 10**30     whole numbers of ANY size — no overflow
    float       3.5, 1e3, 0.1      64-bit floating point, ~15-16 significant digits
    str         "hi", 'hi'         text, immutable
    bool        True, False        a subclass of int: True == 1, False == 0
    NoneType    None               "no value"; the only value of its type

## int never overflows

    print(2 ** 100)         # 1267650600228229401496703205376
    print(10**20 + 1)       # 100000000000000000001

Python's int grows as large as memory allows. There is no \`long\`, no wrap-around and no
\`MAX_VALUE\` trap. Underscores make big literals readable: \`1_000_000\`.

## float is approximate

    print(0.1 + 0.2)            # 0.30000000000000004
    print(0.1 + 0.2 == 0.3)     # False
    import math
    print(math.isclose(0.1 + 0.2, 0.3))   # True

Most decimal fractions have no exact binary form, so compare floats with \`math.isclose\`, never
\`==\`. Money is kept as whole paise (an int) or with the \`decimal\` module.

Two more float facts that appear in interviews:

    print(7 / 7)                # 1.0 — the / operator ALWAYS gives a float
    print(round(2.5), round(3.5))   # 2 4 — round() rounds half to EVEN ("banker's rounding")
    print(1e3)                  # 1000.0 — scientific notation is always a float

## bool is a number

    print(True + True)          # 2
    print(isinstance(True, int))    # True

That is why \`sum(flags)\` counts how many are True.

## None

\`None\` means "nothing here": a function that returns nothing returns None, and it is the usual
placeholder for "not set yet". Test it with \`is\`: \`if result is None:\`. \`None == False\` is
False — None is not a number.

## Checking a type

    type(3 + 2.0)               # <class 'float'> — mixing int and float gives float
    isinstance(score, str)      # True — prefer isinstance in real code

## Interview traps

- "What is the size of an int in Python?" — unbounded; it is not 32 or 64 bits.
- \`a = b = []\` gives two names for one list, not two lists.
- Names are case-sensitive: \`Total\` and \`total\` are different variables.
- Never name a variable \`list\`, \`str\` or \`type\` — it hides the built-in for the rest of the file.`,
    workedExample: `**Problem.** A bill-splitting script prints \`Each pays 33.333333333333336\` and the total
check \`each * 3 == 100\` is sometimes False. Fix it properly.

1. Find the type. \`each = 100 / 3\` — the \`/\` operator always gives a float, and 100/3 has no
   exact binary form, so the value is approximate.
2. Decide what the numbers *are*. Money is a count of paise, which is a whole number. Work in
   paise with ints: \`total = 10000\` (₹100.00).
3. Split with whole numbers: \`each, left = divmod(total, 3)\` gives 3333 and 1. One person pays
   3334 paise; nothing is lost, and \`3333 * 2 + 3334 == 10000\` is exactly True.
4. Print as rupees only at the end: \`print(f"Each pays {each / 100:.2f}")\` → \`Each pays 33.33\`.

The reasoning: ints are exact and never overflow, so they are the right type for anything you
count. Floats are for measurements, and are compared with \`math.isclose\`, never \`==\`.`,
    mcqs: [
      mcq('What does this print? big = 3 ** 50; print(big > 2 ** 63)',
        [['True', true], ['False', false], ['OverflowError: int too large', false], ['A negative number, from wrap-around', false]],
        'Python ints have no fixed width, so 3 ** 50 is computed exactly (about 7.2 × 10^23) and is far larger than 2 ** 63. Nothing overflows or wraps.'),
      mcq('What does this print? rate = 9; rate = "nine"; print(type(rate).__name__)',
        [['str', true], ['int', false], ['TypeError on line two', false], ['NoneType', false]],
        'A name has no fixed type. The second assignment simply rebinds rate to a str object, so type(rate) is str. Only the object carries a type.'),
      mcq('What does this print? first = [4]; second = first; second.append(5); print(first)',
        [['[4, 5]', true], ['[4]', false], ['[5]', false], ['[4, [5]]', false]],
        'second = first copies no list; it binds a second name to the same list object. Appending through either name changes the one list both see.'),
    ],
    checkpoint: [
      ck('PYTHON_BASICS', 'What does this print? print(round(0.5), round(1.5), round(2.5))',
        [['0 2 2', true], ['1 2 3', false], ['0 1 2', false], ['1 1 3', false]],
        'round() uses round-half-to-even: an exact .5 goes to the nearest even integer. So 0.5 becomes 0, 1.5 becomes 2 and 2.5 becomes 2.'),
      ck('PYTHON_BASICS', 'Why is 0.1 + 0.2 == 0.3 False in Python?',
        [['0.1 and 0.2 have no exact binary form, so the sum is off', true], ['Python rounds every float result to one decimal place', false], ['== compares the identity of two floats, not their value', false], ['The literal 0.3 is stored as a str until it is printed', false]],
        'Floats are binary fractions. 0.1 and 0.2 are stored as the nearest binary values, and their sum is 0.30000000000000004. Use math.isclose to compare.'),
      ck('PYTHON_BASICS', 'What does this print? flags = [True, False, True, True]; print(sum(flags))',
        [['3', true], ['True', false], ['4', false], ['TypeError: cannot sum bools', false]],
        'bool is a subclass of int, with True equal to 1 and False equal to 0. Summing the list adds 1 + 0 + 1 + 1, which is 3.'),
    ],
  },
  {
    unitCode: 'JT_PY_BASICS_CONVERSIONS',
    notes: `Everything \`input()\` gives you is a string. Turning text into numbers, and back, is the
first thing every program does, and the place where most beginner crashes come from.

## Python does not convert for you

    print("5" + str(5))     # 55
    print(int("5") + 5)     # 10
    "5" + 5                 # TypeError: can only concatenate str (not "int") to str

Python is dynamically typed but **strongly** typed: it never silently turns a str into a number
or a number into a str. Mixing int and float is the one automatic step (\`2 + 0.5\` is 2.5).

## int()

    int("42")       # 42
    int(" 42 ")     # 42 — leading/trailing whitespace (and a trailing newline) is ignored
    int("-7")       # -7
    int("+12")      # 12
    int(3.99)       # 3 — a float is TRUNCATED toward zero
    int(-3.99)      # -3
    int(True)       # 1

Text must be a whole number written in digits. All of these raise \`ValueError: invalid literal
for int() with base 10\`:

    int("4.0")      int("")      int("1e3")      int("12 apples")      int("0x1F")

If the text holds a decimal, go through float: \`int(float("12.5"))\` is 12.

A second argument gives the base: \`int("101", 2)\` is 5, \`int("1F", 16)\` is 31.

## float() and str()

    float("3.5")    # 3.5
    float(" 2 ")    # 2.0
    float("1e3")    # 1000.0
    str(3.0)        # '3.0'
    str(None)       # 'None'

## Handling bad input

    raw = input()
    try:
        qty = int(raw)
    except ValueError:
        print("Please enter a whole number")

Catch \`ValueError\` exactly — a bare \`except:\` would also hide real bugs. A *type* mistake, like
\`int(None)\` or \`int([1])\`, raises \`TypeError\` instead.

## Truthiness: what counts as false

Any value can stand in a condition. These are **falsy**; everything else is truthy:

    False   None   0   0.0   ""   []   ()   {}   set()   range(0)

So:

    bool("0")       # True  — a non-empty string, whatever it says
    bool("False")   # True
    bool(" ")       # True  — a space is a character
    bool([0])       # True  — a list with one item, even if that item is 0
    bool(0.0)       # False

Idiomatic Python tests emptiness directly:

    if not name:            # instead of: if name == "" or name is None
        print("name is required")

## or as a default

\`or\` returns its first truthy operand, so it is often used to supply a default:

    city = input().strip() or "Hyderabad"   # empty input → "Hyderabad"

(The next unit explains exactly what \`and\` and \`or\` return.)

## Interview traps

- \`bool("False")\` is True — only the *empty* string is false.
- \`int("3.0")\` fails but \`int(3.0)\` works: the rule for text is stricter than for floats.
- \`int()\` truncates; \`round()\` rounds. \`int(7.5)\` is 7, \`round(7.5)\` is 8.`,
    workedExample: `**Problem.** A program reads a quantity and crashes with
\`ValueError: invalid literal for int() with base 10: '2.5'\`. Make it accept whole numbers, refuse
anything else politely, and treat an empty line as 1.

1. Read the traceback bottom up: the last line names the exception (ValueError) and the exact text
   that failed, \`'2.5'\`. int() refuses text that is not a whole number.
2. Handle the empty case first, with truthiness: \`raw = input().strip()\`, then
   \`if not raw: qty = 1\`. An empty string is falsy, so no \`== ""\` is needed.
3. Otherwise convert inside \`try\`, catching only \`ValueError\`:

        else:
            try:
                qty = int(raw)
            except ValueError:
                print("Enter a whole number, like 3")
                qty = None

4. Test the edges: \`"3"\` → 3, \`" 3 "\` → 3 (int ignores the spaces), \`""\` → 1,
   \`"2.5"\` and \`"three"\` → the message.

The reasoning: input is always text, int() is strict about text, and catching the precise
exception keeps unrelated bugs visible.`,
    mcqs: [
      mcq('Which call raises ValueError?',
        [['int("7.0")', true], ['int(7.9)', false], ['int(" 7 ")', false], ['float("7")', false]],
        'int() accepts text only if it is a whole number in digits, so "7.0" fails. A float argument is simply truncated, surrounding spaces are ignored, and float() accepts "7".'),
      mcq('What does this print? print(bool("0"), bool(0), bool([0]))',
        [['True False True', true], ['False False False', false], ['False False True', false], ['True False False', false]],
        '"0" is a non-empty string, so it is truthy. The number 0 is falsy. [0] is a list holding one item, and any non-empty list is truthy.'),
      mcq('What does this print? code = "" or "N/A"; print(code)',
        [['N/A', true], ['An empty line', false], ['False', false], ['True', false]],
        'or returns its first truthy operand. The empty string is falsy, so the expression evaluates to the second operand, "N/A".'),
    ],
    checkpoint: [
      ck('PYTHON_BASICS', 'What does this print? print(int(-6.8), int("  -6  "))',
        [['-6 -6', true], ['-7 -6', false], ['-6 ValueError', false], ['-7 ValueError', false]],
        'int() on a float truncates toward zero, so -6.8 becomes -6 (not -7). On text it ignores surrounding whitespace and accepts a sign, giving -6.'),
      ck('PYTHON_BASICS', 'Used as an if condition, which of these values counts as true?',
        [['" " (one single space)', true], ['0.0, the float zero', false], ['None, the null value', false], ['"" (the empty string)', false]],
        'Only empty strings are falsy; a space is a character, so " " is truthy. 0.0, None and "" are all on the list of falsy values.'),
      ck('PYTHON_BASICS', 'age = input() reads "21". What does print(age + 1) do?',
        [['Raises TypeError: str and int do not add', true], ['Prints 22, after converting age to int', false], ['Prints 211, joining the two as text', false], ['Raises ValueError: "21" is not a number', false]],
        'input() always returns a str. Python never converts implicitly between str and int, so "21" + 1 raises TypeError. Write int(age) + 1.'),
    ],
  },
  {
    unitCode: 'JT_PY_BASICS_OPERATORS',
    notes: `Operator questions are "what is the value of this expression?". There are few rules;
apply them mechanically and you will not be caught out.

## Arithmetic

    print(10 / 4)       # 2.5   true division, always a float
    print(10 // 4)      # 2     floor division
    print(10 % 4)       # 2     remainder
    print(2 ** 10)      # 1024  power
    print(2 ** -1)      # 0.5   a negative power gives a float

## // and % with negatives — Python floors

\`//\` rounds **down** (toward minus infinity), not toward zero, and \`%\` takes the sign of the
**right** operand. The two always satisfy \`a == (a // b) * b + a % b\`.

    print(7 // 2, -7 // 2, 7 // -2)    # 3 -4 -4
    print(7 % 3, -7 % 3, 7 % -3)       # 1 2 -2
    print(divmod(-17, 5))              # (-4, 3)

This differs from Java and C, where -7 / 2 is -3 and -7 % 3 is -1. It is very useful: \`n % 7\`
is always 0..6 for any n, which is exactly what a weekday or a circular index needs.

\`//\` with a float operand gives a float: \`7.0 // 2\` is \`3.0\`.

## Precedence and **

From high to low: \`**\`, unary \`-\`, \`* / // %\`, \`+ -\`, comparisons, \`not\`, \`and\`, \`or\`.

    print(1 + 2 * 3 ** 2)    # 19 — 3**2 first, then *, then +
    print(-2 ** 2)           # -4 — ** binds tighter than the minus sign
    print((-2) ** 2)         # 4
    print(2 ** 3 ** 2)       # 512 — ** is right-associative: 2 ** 9

When in doubt, add parentheses; readers will thank you.

## Augmented assignment

    n = 10
    n //= 3      # 3
    n **= 2      # 9

There is no \`++\` or \`--\` in Python. \`n++\` is a SyntaxError, and \`++n\` is just \`+(+n)\`.

## Comparisons chain

    x = 5
    print(1 < x < 10)        # True — means 1 < x and x < 10
    print(1 < 3 > 2)         # True — 1 < 3 and 3 > 2
    print(5 == 5.0)          # True — int and float compare by value

Strings compare character by character by code point: \`"apple" < "banana"\`, \`"Z" < "a"\`
(capitals come first) and \`"10" < "9"\` (the first characters "1" and "9" decide).

## and / or return an operand, not a bool

\`and\` and \`or\` **short-circuit** and return one of their operands:

- \`a or b\` — returns a if a is truthy, otherwise b.
- \`a and b\` — returns a if a is falsy, otherwise b.

    print(0 or "x")          # x
    print(3 and 4)           # 4
    print("" and 5)          # (an empty string)
    print(None or 0)         # 0
    print(not 0)             # True — not ALWAYS returns a bool

Short-circuiting means the right side may never run: \`count > 0 and total / count > 50\` never
divides by zero.

## is versus ==

\`==\` asks "equal value?"; \`is\` asks "the very same object?".

    a = [1, 2]
    b = [1, 2]
    print(a == b, a is b)    # True False

Use \`is\` only for singletons: \`x is None\`, \`x is not None\`. Never write \`if name is "admin"\`
or \`if n is 300\` — whether two equal strings or ints are the same object is an implementation
detail, and Python warns about it.

## The walrus operator :=

\`:=\` assigns inside an expression (Python 3.8+):

    while (line := input().strip()) != "end":
        print(line.upper())

## Interview traps

- \`-7 // 2\` is -4 and \`-7 % 2\` is 1 in Python.
- \`a < b < c\` is not \`(a < b) < c\`.
- \`x == None\` works but \`x is None\` is the correct test.
- \`True + 1\` is 2: bool is an int.`,
    workedExample: `**Problem.** A timetable program stores a time as minutes after midnight and must print the
clock time 150 minutes *before* 01:00, i.e. from \`t = 60 - 150 = -90\`. A teammate's Java
habit says "handle negatives with an if". Do it in one line, and explain it.

1. A day has 1440 minutes. We want a minute-of-day in 0..1439 for any t, positive or negative.
2. Python's \`%\` takes the sign of the right operand, so \`t % 1440\` is always 0..1439:
   \`-90 % 1440\` is \`1350\`.
3. Split into hours and minutes with floor division: \`h, m = divmod(1350, 60)\` gives \`(22, 30)\`.
4. Print with zero padding: \`print(f"{h:02d}:{m:02d}")\` → \`22:30\`. 22:30 the previous evening is
   indeed 150 minutes before 01:00.

The reasoning: Python's \`//\` floors and its \`%\` follows the divisor, which is exactly the
wrap-around arithmetic clocks, weekdays and circular buffers need. No if is required.`,
    mcqs: [
      mcq('What does this print? print(-9 // 4, -9 % 4)',
        [['-3 3', true], ['-2 -1', false], ['-2 1', false], ['-3 -1', false]],
        '// floors toward minus infinity, so -9 / 4 = -2.25 floors to -3. The remainder then satisfies -9 == -3 * 4 + r, so r is 3, which takes the sign of the divisor.'),
      mcq('What does this print? print(2 ** 2 ** 3, -3 ** 2)',
        [['256 -9', true], ['64 9', false], ['64 -9', false], ['256 9', false]],
        '** is right-associative, so 2 ** 2 ** 3 is 2 ** 8 = 256. It also binds tighter than unary minus, so -3 ** 2 is -(3 ** 2) = -9.'),
      mcq('What does this print? print(None or [] or "end", 7 and 0 and 9)',
        [['end 0', true], ['True False', false], ['None 9', false], ['[] 0', false]],
        'or returns the first truthy operand: None and [] are falsy, so "end". and returns the first falsy operand: 7 is truthy, 0 is falsy, so 0, and 9 is never evaluated.'),
    ],
    checkpoint: [
      ck('PYTHON_BASICS', 'What does this print? n = 4; print(0 < n <= 4 < 5)',
        [['True', true], ['False', false], ['TypeError: bool and int compared', false], ['SyntaxError: only two comparisons allowed', false]],
        'Comparisons chain: the expression means 0 < n and n <= 4 and 4 < 5. All three hold for n = 4, so it is True. It is never evaluated as (0 < n) <= 4.'),
      ck('PYTHON_BASICS', 'p = [3]; q = [3]. Which pair is right for p == q and p is q?',
        [['True and False', true], ['True and True', false], ['False and False', false], ['False and True', false]],
        '== compares values, and both lists hold 3. is compares identity, and the two literals built two separate list objects, so p is q is False.'),
      ck('PYTHON_BASICS', 'What does this print? print(17 // 5 * 5 + 17 % 5)',
        [['17', true], ['20', false], ['15', false], ['5', false]],
        '17 // 5 is 3 and 17 % 5 is 2, so the expression is 3 * 5 + 2 = 17. This identity, (a // b) * b + a % b == a, always holds in Python.'),
    ],
  },
  {
    unitCode: 'JT_PY_BASICS_CONDITIONS',
    notes: `## if / elif / else

    marks = 72
    if marks >= 90:
        grade = "A"
    elif marks >= 75:
        grade = "B"
    elif marks >= 60:
        grade = "C"
    else:
        grade = "F"
    print(grade)            # C

Three things matter:

1. **Indentation is the block.** There are no braces. The body is every line indented under the
   colon; the first line back at the old indentation ends it. Use four spaces, never mix in tabs.
2. **Only the first true branch runs**, top to bottom. Put the narrowest test first — testing
   \`marks >= 60\` before \`marks >= 90\` would give 95 a C.
3. **A condition can be any value**, not just a bool. Truthiness applies: \`if items:\` means "if
   the list is not empty", \`if not name:\` means "if name is empty or None".

An \`if\` with an empty body is a syntax error; write \`pass\` as a placeholder.

## elif chain versus separate ifs

    n = 0
    if n == 0:
        print("zero")
    if n < 5:               # a SEPARATE if — tested as well
        print("small")
    # zero
    # small

An \`elif\` would have printed only "zero". Use separate ifs only when several things can be true
and all of them should happen.

## Combining conditions

    if 18 <= age < 60 and has_id:
        ...
    if role == "admin" or role == "owner":    # NOT: if role == "admin" or "owner"
        ...
    if role in ("admin", "owner"):           # cleaner

\`if role == "admin" or "owner":\` is always true: it means \`(role == "admin") or "owner"\`, and the
non-empty string "owner" is truthy.

## The conditional expression

    label = "even" if n % 2 == 0 else "odd"
    fee = 0 if age < 5 else 50 if age < 18 else 100

It is an *expression*, so it produces a value and fits inside a print or an f-string. Read it as
"value-if-true **if** condition **else** value-if-false". Do not chain more than two; use if/elif.

## match-case (Python 3.10+)

\`match\` compares one value against **patterns** — it is not just a switch on constants:

    def http_status(code):
        match code:
            case 200 | 201:
                return "ok"
            case 404:
                return "missing"
            case n if n >= 500:
                return "server error"
            case _:
                return "other"

- Cases are tried top to bottom; the first match wins and there is **no fall-through**.
- \`|\` joins alternatives. \`_\` matches anything (the default).
- A bare name such as \`n\` is a **capture**: it matches anything and binds the value. The
  \`if\` after it is a **guard**.
- With no matching case and no \`_\`, nothing happens — no error.

Patterns can take a sequence apart, which is where match shines:

    def run(command):
        match command.split():
            case ["go", direction]:
                return f"move {direction}"
            case ["look"]:
                return "look around"
            case ["drop", *things]:
                return f"drop {len(things)} items"
            case _:
                return "unknown command"

    run("go north")     # 'move north'
    run("drop pen key") # 'drop 2 items'
    run("go")           # 'unknown command' — ["go"] has one item, the pattern needs two

## The capture trap

    match colour:
        case RED:           # this does NOT compare with a constant RED
            ...

A bare name in a case always captures, so \`case RED:\` matches every value (Python even refuses to
compile it if more cases follow). To match a constant, use a literal (\`case "red":\`) or a dotted
name (\`case Colour.RED:\`).

## Interview traps

- \`if x = 5:\` is a SyntaxError; comparison is \`==\`.
- \`match\` needs Python 3.10 or later.
- \`case int():\` also matches True, because bool is a subclass of int.`,
    workedExample: `**Problem.** A shipping rule: orders of ₹500 or more ship free; otherwise it is ₹40, or ₹80
for the express option; members always ship free. Write it so every case is covered and none
overlaps.

1. List the inputs: \`total\` (a number), \`express\` (bool), \`member\` (bool).
2. Order the branches narrowest first. Membership overrides everything, so it goes first:

        if member or total >= 500:
            fee = 0
        elif express:
            fee = 80
        else:
            fee = 40

3. Trace the edges: member with ₹100 → 0; non-member ₹500 → 0 (the \`>=\` matters, ₹500 is
   free); ₹499 express → 80; ₹499 standard → 40.
4. Check for the gap: every path ends in an assignment, so \`fee\` is always set — no \`NameError\`
   later when a branch is missed.

The reasoning: an if/elif chain runs only the first true branch, so the ordering *is* the rule.
Writing the overriding condition first keeps each later branch simple.`,
    mcqs: [
      mcq('What does this print? temp = 34\nif temp > 25: print("warm")\nelif temp > 30: print("hot")\nelse: print("cool")',
        [['warm', true], ['hot', false], ['warm then hot', false], ['cool', false]],
        'An if/elif chain runs only the first branch whose condition is true. 34 > 25 already holds, so the hotter check is never reached; it should come first.'),
      mcq('What does run("go") return, for run() with the cases ["go", direction], ["look"] and _ in that order?',
        [['The result of the _ case', true], ['The ["go", direction] case', false], ['None, with no case matched', false], ['A ValueError from unpacking', false]],
        '"go".split() is ["go"], a one-item list. The pattern ["go", direction] needs exactly two items and ["look"] needs "look", so only the wildcard _ matches.'),
      mcq('role = "guest". What does if role == "admin" or "owner": print("in") do?',
        [['Prints in, because the string "owner" is truthy', true], ['Prints nothing, since role is "guest"', false], ['Raises TypeError comparing str and bool', false], ['Raises SyntaxError at the or keyword', false]],
        'The condition is (role == "admin") or "owner". The first part is False, so or returns "owner", a non-empty string, which is truthy. Write role in ("admin", "owner").'),
    ],
    checkpoint: [
      ck('PYTHON_CONTROL_FLOW', 'What does this print? age = 15; print("adult" if age >= 18 else "teen" if age >= 13 else "child")',
        [['teen', true], ['adult', false], ['child', false], ['SyntaxError', false]],
        'Chained conditional expressions are read left to right: age >= 18 is False, so the else part runs, which is another conditional; age >= 13 is True, giving "teen".'),
      ck('PYTHON_CONTROL_FLOW', 'In match code: the case n if n >= 500: — what does n do?',
        [['Captures any value, and the guard then filters it', true], ['Compares code with a variable n defined earlier', false], ['Matches only when code holds an int value', false], ['Raises NameError unless n was assigned before', false]],
        'A bare name in a pattern is a capture pattern: it matches anything and binds it to n. The if after it is a guard, so the case applies only when n >= 500.'),
      ck('PYTHON_CONTROL_FLOW', 'What does this print? n = 0\nif n: print("A")\nelif n == 0: print("B")\nif n == 0: print("C")',
        [['B then C', true], ['B only', false], ['A then C', false], ['C only', false]],
        'n = 0 is falsy, so the first branch is skipped and the elif prints B. The last line is a separate if, not part of the chain, so it is tested too and prints C.'),
    ],
  },
  {
    unitCode: 'JT_PY_BASICS_LOOPS',
    notes: `## for — over anything iterable

Python's \`for\` has no counter of its own. It takes each item of an *iterable* in turn: a range,
a string, a list, a file, and more.

    for ch in "hey":
        print(ch.upper(), end="")       # HEY

## range

\`range(stop)\`, \`range(start, stop)\` and \`range(start, stop, step)\`. The stop is **excluded**.

    list(range(5))          # [0, 1, 2, 3, 4]
    list(range(2, 11, 3))   # [2, 5, 8]
    list(range(5, 0, -2))   # [5, 3, 1]
    list(range(3, 3))       # [] — empty, the loop body never runs
    len(range(0, 10, 3))    # 4 — 0, 3, 6, 9

\`range\` stores only start, stop and step, so \`range(10**9)\` costs no memory. To count from 1 to
n inclusive write \`range(1, n + 1)\`.

## enumerate and zip

When you need the position too, do not write \`range(len(...))\`:

    for i, ch in enumerate("abc", start=1):
        print(i, ch)
    # 1 a
    # 2 b
    # 3 c

\`zip\` walks two iterables in step and stops at the **shorter** one:

    for n, letter in zip([1, 2, 3], "xy"):
        print(n, letter)
    # 1 x
    # 2 y

## while — until something happens

    n, digits = 1234, 0
    while n > 0:
        n //= 10
        digits += 1
    print(digits)           # 4

Something inside the body must move the condition toward False, or the loop never ends. Python
has no do-while; the idiom is \`while True:\` with a \`break\`:

    while True:
        raw = input()
        if raw.isdigit():
            break
        print("digits only, try again")

## break and continue

    total = 0
    for k in range(1, 11):
        if k % 3 == 0:
            continue        # skip the rest of THIS pass
        if k > 7:
            break           # leave the loop entirely
        total += k
    print(total)            # 1+2+4+5+7 = 19

In nested loops, \`break\` leaves only the innermost loop. To stop both, put the loops in a
function and \`return\`, or use a flag.

## The loop else

A \`for\` or \`while\` may have an \`else\`. It runs when the loop finishes **without a break**:

    for n in [3, 5, 7]:
        if n % 2 == 0:
            print("found", n)
            break
    else:
        print("no even number")     # runs: the loop never hit break

Read it as "no break". It replaces the found-flag pattern for searches. It also runs when the
loop body never ran at all (an empty sequence).

## The loop variable

    for i in range(3):
        pass
    print(i)                # 2 — the variable survives the loop

Assigning to the loop variable inside the body does not change the next pass: the for statement
takes the next item regardless.

    for i in range(3):
        i = 10              # pointless — the next pass sets i = 1
        print(i, end=" ")   # 10 10 10

## Nested loops — a pattern

    for row in range(1, 4):
        print("*" * row)
    # *
    # **
    # ***

Python's string repetition removes the inner loop that other languages need. When you do nest,
count passes: \`for r in range(4): for c in range(r):\` runs 0 + 1 + 2 + 3 = 6 times.

## Choosing

- Known items or count → \`for\` (with \`range\`, \`enumerate\` or \`zip\`).
- Unknown number of passes (until input is valid, until a value converges) → \`while\`.

## Common mistakes

- \`range(1, n)\` stops at n - 1.
- A \`while\` whose variable never changes → an infinite loop (Ctrl+C stops it).
- Changing a list while looping over it skips items; loop over a copy.
- Putting the loop \`else\` under the \`if\` by mistake: indentation decides whether it belongs to
  the \`for\` or to the \`if\`.`,
    workedExample: `**Problem.** Find the first number in \`readings = [12, 7, 19, 4, 30]\` that is over 15 and
print it, or print \`none over 15\` if there is none — without a flag variable.

1. A search loops until it finds something, then stops, so it is a \`for\` with a \`break\`.
2. The "not found" case is exactly "the loop finished without a break" — the loop \`else\`:

        for r in readings:
            if r > 15:
                print("first over 15:", r)
                break
        else:
            print("none over 15")

3. Trace it: 12 no, 7 no, 19 yes → prints \`first over 15: 19\` and breaks; the else is skipped.
4. Test the other edge: with \`[1, 2, 3]\` the loop ends normally and the else prints
   \`none over 15\`. With \`[]\` the body never runs and the else still prints it — which is right.
5. Check the indentation: \`else\` lines up with \`for\`, not with \`if\`. Under the \`if\` it would
   print "none over 15" for every reading that was small.

The reasoning: break means "found", the loop else means "never found", and the indentation of
\`else\` decides which statement it belongs to.`,
    mcqs: [
      mcq('What does this print? print(list(range(10, 1, -3)))',
        [['[10, 7, 4]', true], ['[10, 7, 4, 1]', false], ['[]', false], ['[1, 4, 7, 10]', false]],
        'range counts down from 10 in steps of -3 and stops before reaching 1, which is excluded. So the values are 10, 7 and 4.'),
      mcq('What does this print? for v in [2, 4, 6]:\n    if v % 2: break\nelse:\n    print("all even")',
        [['all even', true], ['Nothing at all', false], ['all even, three times', false], ['SyntaxError: else needs an if', false]],
        'v % 2 is 0 for every value, so break never runs. A loop that ends without break runs its else, so "all even" prints once.'),
      mcq('What does this print? for a, b in zip("pqr", [1, 2]): print(a, b, end=" ")',
        [['p 1 q 2 ', true], ['p 1 q 2 r None ', false], ['ValueError: lengths differ', false], ['p q r 1 2 ', false]],
        'zip pairs items in step and stops as soon as the shorter iterable runs out. The list has two items, so only two pairs are produced and "r" is never used.'),
    ],
    checkpoint: [
      ck('PYTHON_CONTROL_FLOW', 'What does this print? s = 0\nfor k in range(1, 8):\n    if k == 4: continue\n    if k == 6: break\n    s += k\nprint(s)',
        [['11', true], ['15', false], ['24', false], ['10', false]],
        'k takes 1, 2, 3 (added), 4 is skipped by continue, 5 is added, and at 6 the loop breaks. So s is 1 + 2 + 3 + 5 = 11.'),
      ck('PYTHON_CONTROL_FLOW', 'What does this print? x = 1\nwhile x < 50:\n    x *= 4\nprint(x)',
        [['64', true], ['16', false], ['50', false], ['256', false]],
        'x goes 1, 4, 16, 64. The test runs before each pass: 16 < 50 is True so x becomes 64, then 64 < 50 is False and the loop ends. Print shows 64.'),
      ck('PYTHON_CONTROL_FLOW', 'When does the else block of a for loop run?',
        [['When the loop finishes without hitting a break', true], ['Only when the loop body never ran even once', false], ['Every time the if inside the loop is False', false], ['After a break, as cleanup before leaving', false]],
        'The loop else runs when the for finishes normally, including over an empty iterable, and is skipped when a break ends the loop. Read it as "no break".'),
    ],
  },
];
