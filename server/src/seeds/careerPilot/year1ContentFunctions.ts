/**
 * T_FUNCTIONS — the complete topic, eleven units.
 *
 * ── WHY THE WHOLE CHAIN RATHER THAN THE ONE UNIT THAT WAS BLOCKING ────────────────────────
 *
 * The capacity audit reported T_FUNCTIONS_PRACTICE as a prerequisite "never written", which
 * blocks the programming checkpoint. Authoring that unit alone would have moved the blocker
 * rather than removed it: its own prerequisite is T_FUNCTIONS_DEBUGGING, whose prerequisites
 * run back through the topic. A prerequisite chain is only as available as its weakest link,
 * so the unit of work is the topic.
 *
 * It is also the highest-leverage topic in Year 1 after conditions. Functions are a
 * prerequisite of DSA, of every project, and of the programming checkpoint that gates a
 * student's measured state at the end of the module.
 *
 * ── ROLES THIS DELIVERS ───────────────────────────────────────────────────────────────────
 *
 * Eight FOUNDATION_INSTRUCTION, one APPLICATION (the debug unit), one PRACTICE and one
 * INTEGRATION (the mini project) — four of the nine composition roles from one coherent topic,
 * which is why complete topics beat scattered units when filling a deficit.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const FUNCTIONS_BUNDLES: PilotBundle[] = [
  {
    unitCode: 'T_FUNCTIONS_WHY_FUNCTIONS',
    notes: `A function is a piece of work you have given a name to. That sounds small. It is the
single biggest change in how you write programs.

**The weak reason to use one: saving typing.** True, and if it were the only reason you would
only bother after the third copy.

**The three real reasons:**

1. **One place to be right.** A calculation copied into four places has four places to fix when
   it turns out to be wrong, and you will fix three. Named once, it is corrected once.

2. **You can be sure of it separately.** A forty-line program is right or wrong as a whole. The
   same program as five functions can be checked one piece at a time, and a piece you have
   convinced yourself about stops consuming attention.

3. **The name carries the meaning.** Compare:

       t = (p * r * n) / 100

       interest = simple_interest(principal, rate, years)

   The second needs no comment. Naming a calculation is how the *why* gets into the code
   instead of into a comment beside it that will drift.

**What a function is made of:**

- A **name** that says what it does
- **Parameters** — what it needs
- A **body** — the work
- A **return value** — the answer it hands back

**The test for whether something should be a function:** can you name it in a short verb phrase
without using "and"? \`calculate_total\` is a function. \`validate_and_save_and_email\` is three.`,
    mcqs: [
      mcq('What is the strongest reason to extract a repeated calculation into a function?',
        [['There is then ONE place the logic lives, so a fix cannot be half-applied', true],
          ['It saves typing the same lines out several times over', false],
          ['Functions run faster than repeated code', false],
          ['It is required by the language', false]],
        'Saving typing is real and minor. The maintenance property is what changes the odds of the program being correct six months later.'),
      mcq('Which name suggests the thing should be more than one function?',
        [['`validate_and_save_user`', true], ['`calculate_total`', false], ['`find_student`', false], ['`is_valid_email`', false]],
        'The word "and" in a name is the clue. A function that cannot be described without it is doing two jobs and can only be tested as a pair.'),
      mcq('`interest = simple_interest(principal, rate, years)` is better than the raw formula mainly because:',
        [['The name puts the intent in the code, where a comment would drift', true],
          ['It is shorter than writing the formula out each time', false],
          ['It is faster, because the formula is compiled once', false],
          ['It avoids declaring variables for the intermediate values', false]],
        'Comments are not checked by anything and rot silently. A name is used at every call site, so a wrong one is noticed.'),
    ],
    checkpoint: [
      mcq('A three-line calculation appears in four places. What is the real cost of leaving it there?',
        [['Four places must be corrected together, and one will be missed', true],
          ['Only the extra typing, which a good editor makes almost free', false],
          ['Slower execution, since the same work is parsed four times over', false],
          ['More memory used, because each copy is stored separately', false]],
        'The maintenance cost is the one that matters, and it is paid at the worst moment - when the logic turns out to be wrong.'),
      mcq('You cannot name a block of code without using the word "and". What does that tell you?',
        [['It is doing more than one job and should be split', true],
          ['The name simply needs to be longer and more descriptive', false],
          ['It needs a comment above it explaining what it does', false],
          ['Nothing in particular; many blocks do two related things', false]],
        'The naming test is the cheapest decomposition check available, and it works before a line is written.'),
    ],
  },
  {
    unitCode: 'T_FUNCTIONS_DEFINING',
    notes: `Defining a function and calling it are two different events, and confusing them is the
first thing that goes wrong.

    def greet():                 # DEFINITION — describes the work, runs nothing
        print("Hello")

    greet()                      # CALL — now it runs

Run a file containing only the definition and nothing happens. That is correct: \`def\` creates
the function and stores it under the name. Nothing inside the body executes until a call.

**The pieces of the line:** \`def\`, the name, parentheses, a colon, then an indented body — the
same indentation rule as \`if\`. The body is exactly the indented lines.

**Definition must come before the call, in reading order:**

    greet()                      # NameError: 'greet' is not defined
    def greet():
        print("Hello")

Python reads the file top to bottom. At the moment it reaches \`greet()\` the name does not exist
yet.

**Calling without parentheses does not call it:**

    greet        # a reference to the function object — no output
    greet()      # a call

\`print(greet)\` shows something like \`<function greet at 0x...>\`. That is not a bug; it is the
function itself rather than its result, and recognising that message saves an hour later.

**Naming.** A verb or verb phrase, lower case with underscores: \`send_email\`, \`calculate_total\`,
\`is_valid\`. A function that answers yes or no conventionally starts \`is_\` or \`has_\`, so the
call site reads like the question it asks.`,
    workedExample: `**Goal: a function that prints a line of dashes, used three times.**

Start with the repetition:

    print("Report")
    print("-" * 40)
    print("Section A")
    print("-" * 40)
    print("Section B")
    print("-" * 40)

The separator appears three times. Name it:

    def separator():
        print("-" * 40)

    print("Report")
    separator()
    print("Section A")
    separator()
    print("Section B")
    separator()

Now change the width to 60 in one place and all three follow. That is the property worth having,
and it arrived the moment the thing had a name.

**A deliberate mistake, so you recognise it.** Move the definition to the bottom:

    print("Report")
    separator()

    def separator():
        print("-" * 40)

    NameError: name 'separator' is not defined

Python had not reached the \`def\` when the call ran. The convention — definitions at the top,
the code that uses them below — exists to make this impossible rather than merely unlikely.`,
    mcqs: [
      mcq('A file contains only `def greet(): print("Hi")`. What happens when you run it?',
        [['Nothing is printed — the function is defined but never called', true],
          ['"Hi" is printed, because defining a function runs it', false],
          ['A SyntaxError', false],
          ['The function runs once automatically', false]],
        '`def` stores the work under a name. Nothing in the body executes until something calls it.'),
      mcq('`greet` without parentheses evaluates to:',
        [['The function object itself, not its result', true],
          ['The result of calling it with no arguments at all', false],
          ['A syntax error, since a call requires parentheses', false],
          ['None, which is what an uncalled function evaluates to', false]],
        'This is why `print(greet)` shows `<function greet at 0x...>`. Recognising that output as "you forgot the parentheses" saves real time.'),
      mcq('Why does calling a function above its `def` raise NameError?',
        [['Python runs top to bottom, so the name does not exist yet', true],
          ['Functions have to be defined in alphabetical order', false],
          ['The call is missing the parentheses it needs to run', false],
          ['It does not raise anything; calling upwards works fine', false]],
        'Definitions first, then the code that uses them. The convention exists to make this impossible rather than merely unlikely.'),
      mcq('Which name follows the convention for a function answering yes or no?',
        [['`is_valid_email`', true], ['`email_check`', false], ['`validate`', false], ['`EmailValid`', false]],
        'The `is_`/`has_` prefix makes the call site read as the question being asked: `if is_valid_email(x):`.'),
    ],
    checkpoint: [
      mcq('A file has a call placed ABOVE the definition it calls. What happens?',
        [['NameError - the name does not exist yet when the call is reached', true],
          ['It works, because Python scans the whole file first', false],
          ['A SyntaxError', false],
          ['The function runs twice, once per time it is mentioned', false]],
        'Top-to-bottom execution. Definitions above the code that uses them is the convention that makes this impossible.'),
      mcq('print(greet) outputs "<function greet at 0x...>". What was forgotten?',
        [['The parentheses - the function was printed rather than called', true],
          ['A return statement, so the function evaluates to nothing useful', false],
          ['An argument, without which the function cannot produce a value', false],
          ['The def keyword, so Python treated the name as a plain variable', false]],
        'Recognising that output on sight is worth real time: it is a reference to the function, not its result.'),
    ],
  },
  {
    unitCode: 'T_FUNCTIONS_PARAMETERS',
    notes: `A function with no parameters can only ever do the same thing. Parameters are how it
becomes useful for work you have not thought of yet.

    def greet(name):             # \`name\` is a PARAMETER
        print("Hello,", name)

    greet("Asha")                # "Asha" is an ARGUMENT

**Parameter and argument are not the same word for the same thing.** The parameter is the name
in the definition — a placeholder. The argument is the actual value at the call. One definition,
many calls, a different argument each time.

**The parameter is a local name.** Inside the body, \`name\` refers to whatever was passed. It has
nothing to do with a variable called \`name\` elsewhere in your program, and it disappears when
the function returns.

**Several parameters are matched by position:**

    def rectangle(width, height):
        return width * height

    rectangle(3, 4)      # width=3, height=4
    rectangle(4, 3)      # width=4, height=3 — same answer here, but not for \`divide\`

Positional matching is why argument order matters, and why a function with five positional
parameters is unpleasant to call correctly.

**A parameter is not magically the right type.** Nothing stops \`rectangle("3", 4)\`, and it fails
inside the function with a message about \`*\`, some distance from the call that caused it. The
name is a promise about intent, not a guarantee the language enforces.

**How many is too many?** Past three or four positional parameters, call sites become unreadable
— \`create_user("Asha", 20, True, False, True)\` tells the reader nothing. That is what named
arguments, in the next unit but one, are for.`,
    workedExample: `**Goal: one function that works for every student instead of one that works for Asha.**

The hard-coded version:

    def report():
        print("Asha scored 78")

Useless for anybody else. Ask what changes between calls: the name and the score. Those are the
parameters.

    def report(name, score):
        print(name, "scored", score)

    report("Asha", 78)      # Asha scored 78
    report("Ravi", 61)      # Ravi scored 61

Now trace the positional matching by getting it wrong:

    report(78, "Asha")      # 78 scored Asha

No error. Both values are printable, so Python does exactly what it was told. This is the
failure mode of positional arguments — it is silent — and it is the argument for keeping the
count low and the names obvious.

**One more, with a real trap.**

    def percentage(scored, total):
        return (scored / total) * 100

    percentage(45, 50)      # 90.0
    percentage(50, 45)      # 111.1 — no error, wrong answer

Reversing them is meaningless here and nothing objects. Compare with \`rectangle(3, 4)\`, where
reversing happens not to matter. The difference is a property of the operation, not of Python,
and knowing which kind you have written is part of writing it.`,
    mcqs: [
      mcq('In `def greet(name)` called as `greet("Asha")`, which is the ARGUMENT?',
        [['"Asha"', true], ['`name`', false], ['`greet`', false], ['Both', false]],
        'The parameter is the placeholder in the definition; the argument is the actual value at the call. One definition, many arguments.'),
      mcq('`percentage(50, 45)` where the definition is `percentage(scored, total)` gives 111.1. Why no error?',
        [['Both are numbers, so the division is valid; the values were swapped', true],
          ['There is an error, and something has hidden it from you', false],
          ['Python cannot check argument order without type hints', false],
          ['It returns None, which then prints as a large number', false]],
        'Positional arguments fail silently when both types are valid. Nothing in the language can know which order you meant.'),
      mcq('A parameter named `total` inside a function and a variable named `total` outside it are:',
        [['Unrelated: the parameter is local and goes when the call ends', true],
          ['The same variable, so assigning to one changes the other', false],
          ['A name collision, which Python reports when defining it', false],
          ['Linked only when the outer variable is the argument passed', false]],
        'Local scope is exactly what makes a function safe to call from anywhere without knowing what names the caller happens to use.'),
      mcq('Why is `create_user("Asha", 20, True, False, True)` a problem?',
        [['Nothing at the call site says what the three booleans mean', true],
          ['Five positional arguments is more than Python permits', false],
          ['Booleans cannot be passed positionally, only by keyword', false],
          ['It will be slow, since each boolean is boxed on the way in', false]],
        'The call is unreadable and the failure mode is a silent swap. Named arguments exist for exactly this.'),
    ],
    checkpoint: [
      mcq('percentage(scored, total) called as percentage(50, 45) returns 111.1 and raises nothing. Why?',
        [['Both arguments are valid numbers, so only the ORDER was wrong', true],
          ['Python cannot divide those two numbers in that order', false],
          ['The function is missing a guard on its arguments', false],
          ['There is an error, and something is suppressing it', false]],
        'Silent failure is the characteristic risk of positional arguments, and the reason to keep the count small.'),
      mcq('A parameter named total and an outer variable named total are related how?',
        [['Not at all: the parameter is local and vanishes when it returns', true],
          ['They are the same variable, and assigning to one changes both', false],
          ['The parameter shadows the outer name for the rest of the program', false],
          ['Python raises a warning about the shadowed name being reused', false]],
        'That independence is what lets a function be called from anywhere without knowing what names the caller uses.'),
    ],
  },
  {
    unitCode: 'T_FUNCTIONS_RETURN',
    notes: `\`return\` sends a value back to whoever called the function. \`print\` puts text on the
screen for a human. They are not alternatives, and confusing them is the most common error at
this stage by a wide margin.

    def double(n):
        print(n * 2)         # shows it

    def double(n):
        return n * 2         # hands it back

With the first, \`result = double(5)\` prints 10 and leaves \`result\` as \`None\`. The value went to
the screen; nothing came back.

**Every function returns something.** A function with no \`return\` returns \`None\`. That is why
the mistake produces \`None\` downstream rather than an error at the point of the bug — the error
surfaces later, somewhere else.

**\`return\` exits immediately:**

    def check(n):
        if n < 0:
            return "negative"
        return "non-negative"

No \`else\` is needed. Once the first \`return\` runs, the function is over — which is exactly what
makes the guard-clause shape work.

**Code after a return never runs:**

    def f():
        return 1
        print("never")       # unreachable

**Returning several values** is really returning one tuple, unpacked at the call:

    def stats(numbers):
        return min(numbers), max(numbers)

    low, high = stats([3, 9, 1])

**Which should you use?** A function that computes should \`return\`. A function whose job is to
show something to a person may \`print\`. A function that does both is usually two functions, and
the one that computes is the one you can test.`,
    workedExample: `**Goal: find the bug in a program that prints the right numbers and stores nothing.**

    def average(numbers):
        print(sum(numbers) / len(numbers))

    a = average([10, 20, 30])
    b = average([5, 15])
    print("Difference:", a - b)

Running it:

    20.0
    10.0
    TypeError: unsupported operand type(s) for -: 'NoneType' and 'NoneType'

The first two lines are right, which is what makes this confusing. The averages were computed
correctly — and then sent to the screen instead of back to the caller, so \`a\` and \`b\` are both
\`None\`.

Notice where the error appears: on the subtraction, not on the function. The bug is in
\`average\`; the symptom is three lines later. That distance is characteristic of this mistake.

The fix is one word:

    def average(numbers):
        return sum(numbers) / len(numbers)

Now \`a\` is 20.0, \`b\` is 10.0, and the difference prints.

**The general rule this gives you:** if a function's value is used by anything other than a
human's eyes, it must return. And if you are unsure which you wrote, assign the call to a
variable and print that — \`None\` tells you immediately.`,
    mcqs: [
      mcq('`def f(n): print(n * 2)` — what is `x` after `x = f(5)`?',
        [['None, because the function printed rather than returned', true],
          ['10, which is what the function computed and printed', false], ['5, the argument, since nothing else was returned', false], ['An error, because the function returns no value at all', false]],
        'A function with no `return` returns None. The 10 went to the screen and nothing came back.'),
      mcq('Why does the missing-return bug usually surface far from its cause?',
        [['The function succeeds; the None only fails when something USES it', true],
          ['Python delays reporting errors until the program ends', false],
          ['`print` is asynchronous, so the error arrives later', false],
          ['It does not; the error appears on the line that caused it', false]],
        'The call works and produces output, which is precisely what makes it convincing. The TypeError arrives wherever the value was first needed.'),
      mcq('What runs after `return 1` inside a function?',
        [['Nothing — return exits immediately', true],
          ['The next line, then it exits', false],
          ['Only print statements', false],
          ['The finally block only', false]],
        'This is what makes guard clauses work: an early return means the code below has already earned the right to run.'),
      mcq('`def stats(n): return min(n), max(n)` returns:',
        [['One tuple, which the caller can unpack into two names', true],
          ['Two separate values, assigned to two separate names', false],
          ['A list holding the minimum and the maximum in order', false],
          ['Only the minimum, since a function returns one thing', false]],
        'Python packs them into a tuple and `low, high = stats(...)` unpacks it. Useful to know when the caller wants just one.'),
    ],
    checkpoint: [
      mcq('A function prints its result instead of returning it. Where does the error appear?',
        [['Wherever something first tries to USE the value, perhaps lines away', true],
          ['On the print line, which is where the value is consumed', false],
          ['Immediately at the call, since the call evaluates to nothing', false],
          ['At the def line, which is where the missing return belongs', false]],
        'The call succeeds and even produces correct-looking output. That distance between cause and symptom is what makes this bug convincing.'),
      mcq('What does a function with no return statement hand back?',
        [['None', true],
          ['0', false],
          ['An empty string', false],
          ['Nothing - it cannot be assigned', false]],
        'Every function returns something. None is why the failure surfaces later as a TypeError rather than at the bug itself.'),
    ],
  },
  {
    unitCode: 'T_FUNCTIONS_DEFAULTS',
    notes: `A default gives a parameter a value to use when the caller does not supply one.

    def greet(name, greeting="Hello"):
        print(greeting + ",", name)

    greet("Asha")                  # Hello, Asha
    greet("Asha", "Welcome")       # Welcome, Asha

The common case stays a one-argument call; the unusual case is still possible. That combination
is the whole point — without defaults you either force every caller to spell out every option or
you write two functions.

**Defaults must come after non-defaults.** \`def f(a=1, b)\` is a SyntaxError, and necessarily so:
with \`f(5)\` Python could not tell whether 5 was \`a\` or \`b\`.

**Named arguments** let the caller pass by name instead of position:

    def create_user(name, age, active=True, admin=False):
        ...

    create_user("Asha", 20, admin=True)

Compare with \`create_user("Asha", 20, True, False)\`. The second requires the reader to know the
signature; the first says what it means. **Once the argument list has more than about three
items, or contains booleans, name them.**

Named arguments also free you from order: \`greet(greeting="Hi", name="Asha")\` is fine.

**The mutable default trap**, which catches everybody once:

    def add_item(item, basket=[]):        # WRONG
        basket.append(item)
        return basket

    add_item("apple")      # ['apple']
    add_item("banana")     # ['apple', 'banana']  — the SAME list

The default is evaluated **once**, when the function is defined, not on each call. Every caller
who relies on the default shares one list. The fix:

    def add_item(item, basket=None):
        if basket is None:
            basket = []
        basket.append(item)
        return basket

Use \`None\` as the default for any mutable value — list, dict, set.`,
    mcqs: [
      mcq('Why is `def f(a=1, b)` a SyntaxError?',
        [['With `f(5)` Python could not tell whether 5 was `a` or `b`', true],
          ['Default values are not allowed in Python function definitions', false],
          ['`a` has to be a string before it can carry a default', false],
          ['Only one parameter in a signature may carry a default', false]],
        'Positional matching goes left to right, so a gap in the middle would be ambiguous. Defaults last removes the ambiguity.'),
      mcq('`def add(item, basket=[])` returns a growing list across separate calls. Why?',
        [['The default list is made once at definition and shared by every call', true],
          ['Lists are global in Python unless explicitly copied first', false],
          ['`append` mutates the caller\u2019s list rather than a local copy', false],
          ['Python caches return values', false]],
        'Default values are evaluated once, when the `def` executes. A mutable default therefore becomes shared state between unrelated callers.'),
      mcq('The correct fix for a mutable default is:',
        [['Default to None and create the value inside the function', true],
          ['Use an empty tuple, which cannot be mutated by accident', false],
          ['Copy the list before returning it from the function', false],
          ['Make the list a global, so the sharing is at least visible', false]],
        'None is immutable and unambiguous, and creating the list inside means each call gets its own.'),
      mcq('When is naming arguments at the call site most valuable?',
        [['When there are several, or any of them are booleans', true],
          ['Always, without exception, however few arguments there are', false],
          ['Only for the arguments that have defaults in the signature', false],
          ['Never; the position of each argument is clearer as it is', false]],
        '`create_user("Asha", 20, True, False)` requires the reader to know the signature. `admin=True` does not.'),
    ],
    checkpoint: [
      mcq('def add(item, basket=[]) accumulates across separate calls. The cause is:',
        [['The default is evaluated once at definition, so all callers share it', true],
          ['`append` modifies the list belonging to the caller rather than a copy', false],
          ['Lists are global in Python unless they are explicitly copied', false],
          ['Python caches return values', false]],
        'Default values are created when the def runs, not per call, so any mutable default becomes shared state between unrelated callers.'),
      mcq('Why must parameters carrying defaults come last?',
        [['Otherwise a single positional argument could not be matched unambiguously', true],
          ['Readability only; the interpreter does not actually care about order', false],
          ['It is an arbitrary convention inherited from older versions of Python', false],
          ['To allow named arguments, which cannot be used before a positional one', false]],
        'Positional matching runs left to right, so a gap in the middle would have no defined meaning.'),
    ],
  },
  {
    unitCode: 'T_FUNCTIONS_SCOPE',
    notes: `Scope is the answer to "where does this name exist". Get it wrong and you get either a
NameError or, worse, a program that reads two different variables that share a name.

**A name created inside a function is local to it:**

    def calculate():
        result = 42          # local
        return result

    calculate()
    print(result)            # NameError: name 'result' is not defined

\`result\` was created when the function ran and destroyed when it returned. **This is a feature.**
It means you can write a function using any names you like without worrying about what the rest
of the program calls things.

**A function can READ an outer name:**

    TAX_RATE = 0.18

    def total(amount):
        return amount * (1 + TAX_RATE)     # fine

**But assigning creates a new local instead of changing the outer one:**

    count = 0

    def increment():
        count = count + 1        # UnboundLocalError

    increment()

The error looks contradictory — \`count\` clearly exists. But the assignment makes \`count\` local
for the whole function, so the read on the right-hand side refers to a local that has no value
yet. The rule is decided for the entire body, not line by line.

**The fix is almost never \`global\`.** Pass it in and return it out:

    def increment(count):
        return count + 1

    count = increment(count)

Now the function's effect is visible at the call site. A function that silently modifies a global
can be called from anywhere and change behaviour somewhere unrelated, which is exactly the class
of bug that is hardest to find.

**Constants are the honest exception.** A module-level \`TAX_RATE\` read by several functions is
fine — it is read, never assigned, and naming it once beats repeating 0.18.`,
    workedExample: `**Goal: understand UnboundLocalError by making it appear and then removing it.**

    total = 0

    def add(n):
        total = total + n
        return total

    print(add(5))

    UnboundLocalError: cannot access local variable 'total' where it is not associated with a value

The confusing part: \`total\` is defined, right there at the top. Why is it "not associated with a
value"?

Because the assignment on line 4 makes \`total\` **local for the whole function**, decided before a
single line runs. So the \`total\` on the right-hand side is the local one — and at that moment it
has never been assigned.

Prove it by removing the assignment:

    def show(n):
        print(total + n)      # works — reads the outer \`total\`

Reading is fine. Only assignment changes the classification.

Now the two fixes, and why one is better.

**With \`global\` — works, and do not do this:**

    def add(n):
        global total
        total = total + n

It works. It also means calling \`add\` changes state somewhere else in the program, invisibly
from the call site. Twenty functions doing this is a program where nobody can say what any value
is at any point.

**By passing and returning — do this:**

    def add(total, n):
        return total + n

    total = add(total, 5)

The function now has no memory and no reach: same inputs, same output, every effect visible on
the line that calls it. It is also the version you can test.`,
    mcqs: [
      mcq('Why does `count = count + 1` inside a function raise UnboundLocalError when `count` exists outside?',
        [['The assignment makes `count` local for the whole body, unassigned at the read', true],
          ['The outer variable is read-only from inside any function', false],
          ['`count` has to be declared inside the function before use', false],
          ['Integers are immutable, so the new value cannot be stored', false]],
        'The classification is decided for the entire function before it runs, not line by line. That is why the error seems to contradict the visible code.'),
      mcq('A function READING a module-level constant is:',
        [['Fine — reading an outer name needs no declaration', true],
          ['An error, because a name from outside cannot be read', false],
          ['Only allowed if the name is declared `global` first', false],
          ['Bad practice in every case, and worth refactoring away', false]],
        'Reading is unrestricted; only assignment changes the classification. A named constant read by several functions is the honest use of this.'),
      mcq('Why prefer passing and returning over `global`?',
        [['The effect becomes visible at the call site instead of happening elsewhere', true],
          ['It is faster, since a global lookup costs more than a local one', false],
          ['`global` is deprecated and will be removed from the language', false],
          ['It uses less memory, because nothing outlives the call', false]],
        'A function that mutates globals can change behaviour in an unrelated part of the program, which is the hardest class of bug to locate.'),
      mcq('Local scope is described as a feature because:',
        [['You can name things inside without knowing what the rest of the program uses', true],
          ['It saves memory, because the frame is discarded on return', false],
          ['It makes the function faster, since lookups stay local', false],
          ['It prevents a typo inside from reaching the outer scope', false]],
        'Reusability depends on it. Without local scope, every function would need globally unique internal names.'),
    ],
    checkpoint: [
      mcq('count = count + 1 inside a function raises UnboundLocalError though count exists outside. Why?',
        [['Assigning anywhere in the body makes the name local for the WHOLE body', true],
          ['The outer variable is private to the module and cannot be read', false],
          ['Integers are immutable, so `count + 1` cannot be stored back', false],
          ['`count` is a reserved word, and shadowing it raises this error', false]],
        'The classification is decided before the function runs, which is why the error appears to contradict the code in front of you.'),
      mcq('The preferred fix for that is:',
        [['Pass the value in and return the new one, so the effect is visible', true],
          ['Declare it global, so both places refer to the same name', false],
          ['Rename the outer variable so the two cannot be confused', false],
          ['Initialise it inside the function before it is first read', false]],
        'global works and hides the effect. A function that silently mutates outer state can change behaviour somewhere entirely unrelated.'),
    ],
  },
  {
    unitCode: 'T_FUNCTIONS_COMPOSITION',
    notes: `Functions calling functions is how a large behaviour is built from pieces you can each
be sure about. It is decomposition — the thing you learned on paper — applied to code.

    def read_scores(text):
        return [int(x) for x in text.split(",")]

    def average(numbers):
        return sum(numbers) / len(numbers)

    def grade(avg):
        if avg >= 75: return "A"
        if avg >= 50: return "B"
        return "C"

    def report(text):
        scores = read_scores(text)
        avg = average(scores)
        return grade(avg)

\`report\` is four lines and reads like the description of the task. Each piece can be checked on
its own: \`average([10, 20])\` should be 15, and you can confirm that without any of the rest
existing.

**Each function does ONE thing.** The test is the naming one again: if you cannot name it without
"and", it is more than one.

**Why this beats one long function**, concretely. Suppose the grade boundaries change. In the
composed version you edit \`grade\`, which is six lines you can read in full, and you know nothing
else is affected because nothing else mentions boundaries. In a forty-line version you search for
the numbers and hope you found them all.

**Depth is not the goal.** Three or four levels of "this calls that which calls the other" is
harder to follow than two, because you have to hold the chain in your head. Composition is about
*separating concerns*, not about producing the most functions.

**A caution on shared state.** Composition only gives you the "check it separately" property if
each function depends on its arguments alone. A function that reads a global is not independent,
and testing it means setting up the world first.`,
    workedExample: `**Goal: turn one forty-line block into four functions, and see what that buys.**

The original, abbreviated:

    raw = input("Scores: ")
    parts = raw.split(",")
    numbers = []
    for p in parts:
        numbers.append(int(p.strip()))
    total = 0
    for n in numbers:
        total = total + n
    avg = total / len(numbers)
    if avg >= 75:
        g = "A"
    elif avg >= 50:
        g = "B"
    else:
        g = "C"
    print("Average", avg, "Grade", g)

It works. Now ask what distinct jobs it contains — that is the decomposition question, unchanged
from doing it on paper:

1. Turn text into numbers
2. Average them
3. Turn an average into a grade
4. Report

Four jobs, four functions:

    def parse(raw):
        return [int(p.strip()) for p in raw.split(",")]

    def average(numbers):
        return sum(numbers) / len(numbers)

    def grade(avg):
        if avg >= 75: return "A"
        if avg >= 50: return "B"
        return "C"

    def report(raw):
        numbers = parse(raw)
        avg = average(numbers)
        return f"Average {avg} Grade {grade(avg)}"

**What it bought.** You can now run \`grade(75)\` and check it returns "A" — a boundary you could
not test in isolation before without running the whole program and typing input. \`parse(" 3, 4 ")\`
can be checked against whitespace. And when the boundary moves to 80, exactly one six-line
function changes.

**What it did not buy.** It is not faster, and it is not shorter. If somebody tells you functions
are for performance, they have the wrong reason.`,
    mcqs: [
      mcq('The main benefit of splitting one long function into four is:',
        [['Each piece can be checked alone, and a change stays inside one', true],
          ['The program runs faster with several smaller functions', false],
          ['It uses less memory, since each frame is short-lived', false],
          ['The file is shorter overall once the split is done', false]],
        'It is usually slightly longer. The benefit is confidence per piece and confinement of change.'),
      mcq('When grade boundaries change in the composed version, what must you inspect?',
        [['Only the `grade` function, because nothing else mentions boundaries', true],
          ['Every function, since the change may reach any of them', false],
          ['The whole file, to be certain nothing else is affected', false],
          ['Both `report` and `grade`, since one calls the other', false]],
        'That confinement is the payoff. In the monolithic version you search for numbers and hope you found them all.'),
      mcq('Why does a function that reads a global lose the "check it separately" property?',
        [['Its result depends on state you must arrange first, so it is not independent', true],
          ['Globals are slow to read compared with a local name', false],
          ['It cannot be called twice without resetting the global', false],
          ['It raises an error when the global has not been set', false]],
        'Composition buys independence only when each function depends on its arguments alone.'),
      mcq('Which indicates composition has gone too far?',
        [['A chain of four or five calls to follow one single operation', true],
          ['Having more than three functions in a single source file', false],
          ['Any function shorter than about five lines of real code', false],
          ['One function calling another function at all, ever', false]],
        'The goal is separating concerns, not maximising the count. Depth costs the reader working memory.'),
    ],
    checkpoint: [
      mcq('Splitting one long function into four buys which property?',
        [['Each piece can be verified alone, and a change stays in one of them', true],
          ['Faster execution, since smaller functions are cheaper to run', false],
          ['Shorter code overall, once the duplication has been removed', false],
          ['Less memory, because each frame is discarded as it returns', false]],
        'It is usually slightly longer. Confidence per piece and confinement of change are the payoff.'),
      mcq('Which function in a composed chain is hardest to test, and why?',
        [['One that reads a global, because it depends on state you must arrange first', true],
          ['The longest one, because there is more of it to set up and check', false],
          ['The one called most often, since every caller has to be considered', false],
          ['The top-level one, which can only be tested through everything below', false]],
        'Independence from everything but its arguments is precisely what makes a function checkable on its own.'),
    ],
  },
  {
    unitCode: 'T_FUNCTIONS_DOCSTRINGS',
    notes: `A docstring is a sentence at the top of a function saying what it does, so the next
reader does not have to read the body to find out.

    def compound_interest(principal, rate, years):
        """Return the final amount after compound interest.

        rate is a percentage, so 7.5 means 7.5%, not 0.075.
        """
        return principal * (1 + rate / 100) ** years

**It is a string, not a comment.** Triple quotes, first thing in the body. Python stores it, so
\`help(compound_interest)\` prints it and editors show it on hover. A \`#\` comment in the same place
is invisible to all of that.

**What to write, and what not to.** The useless docstring restates the name:

    def calculate_total(items):
        """Calculate the total."""          # says nothing

The useful one answers what the reader cannot see:

    def calculate_total(items):
        """Return the total including 18% GST, rounded to 2 decimals.

        Returns 0 for an empty list rather than raising.
        """

Three things worth stating, because none is visible from the signature:

1. **Units and conventions** — is \`rate\` 7.5 or 0.075? This is a real source of bugs.
2. **Edge-case behaviour** — empty input, zero, missing values: does it return a default or
   raise?
3. **Anything surprising** — "assumes the list is sorted" is exactly what the caller must know
   and cannot deduce.

**Why not a comment beside the call?** Because it would have to be repeated at every call site
and would rot independently at each one. The docstring lives with the thing it describes.

**The honest test:** could somebody use this function correctly, including its edge cases,
without reading the body? If not, the docstring is not finished.`,
    mcqs: [
      mcq('Why is a docstring better than a `#` comment above the function?',
        [['It is stored by Python, so help() and editors can show it', true],
          ['A comment is not permitted in that position in a function', false],
          ['A docstring is shorter than the equivalent comment', false],
          ['Comments slow the program, since they are parsed each run', false]],
        'A comment is discarded at parse time. A docstring is an attribute of the function and travels with it everywhere it is used.'),
      mcq('Which docstring is actually useful?',
        [['"Return the total including 18% GST. Returns 0 for an empty list."', true],
          ['"Calculates the total of all the items supplied."', false],
          ['"This function calculates the total of the items."', false],
          ['"Adds the items up and hands back the answer."', false]],
        'The first states a convention and an edge case, neither of which is visible from the signature. The others restate the name.'),
      mcq('Why does stating the unit of a `rate` parameter matter?',
        [['7.5 and 0.075 both look plausible and the caller cannot tell which', true],
          ['PEP 8 requires that every parameter state its units', false],
          ['It lets the interpreter choose a faster numeric type', false],
          ['Python checks the stated unit against what is passed in', false]],
        'This exact ambiguity is a recurring source of silently wrong financial calculations.'),
      mcq('The test for a finished docstring is:',
        [['Somebody could use it correctly, edge cases included, without the body', true],
          ['It runs to at least three lines of description', false],
          ['It mentions every parameter the function accepts', false],
          ['It explains the algorithm the body implements', false]],
        'The purpose is saving the reader from the body. Explaining the algorithm is usually what a comment inside the body is for.'),
    ],
    checkpoint: [
      mcq('Which fact belongs in a docstring because the signature cannot show it?',
        [['Whether a rate parameter means 7.5 or 0.075', true],
          ['How many parameters the function expects to be given', false],
          ['The name of the function and what it is called for', false],
          ['That the object being described is a function at all', false]],
        'Units and conventions are invisible from the signature and are a recurring source of silently wrong results.'),
      mcq('A docstring reading "Calculates the total" above `def calculate_total(items):` is weak because:',
        [['It repeats what the name already says and adds nothing a caller needs', true],
          ['A docstring should always open with a verb in the imperative mood', false],
          ['A single-line docstring is too short to be worth writing at all', false],
          ['It belongs in a `#` comment, since it describes the implementation', false]],
        'The reader already had the name. A docstring earns its place by saying what the name cannot — what counts as an item, what happens when the list is empty, and what unit the returned number is in.'),
    ],
  },
  {
    unitCode: 'T_FUNCTIONS_DEBUGGING',
    notes: `Functions produce a small, recognisable set of failures. Learn the four and you will
diagnose most of them from the message alone.

**1. \`TypeError: f() missing 1 required positional argument: 'b'\`**
You called with fewer arguments than the definition requires. Read the name in the quotes — it
tells you which one. The reverse, "takes 2 positional arguments but 3 were given", is the same
mistake in the other direction.

**2. \`NameError: name 'f' is not defined\`**
Either the call is above the \`def\`, or the name is misspelt. Check spelling first; it is more
often that.

**3. \`UnboundLocalError: cannot access local variable 'x'\`**
You assigned to \`x\` somewhere in the function, which made it local for the whole body, and then
read it before that assignment ran. The fix is to pass it in as a parameter.

**4. \`TypeError: unsupported operand type(s) for +: 'NoneType' and 'int'\`**
The classic. Some function printed instead of returning, so its caller received \`None\`. **The
bug is not where the error is** — it is in whichever function produced the None.

---

**The method, when the message is not enough.**

A function is the easiest thing in programming to debug, because it has a defined input and a
defined output. Use that:

    print(f"average called with {numbers!r}")
    result = sum(numbers) / len(numbers)
    print(f"average returning {result!r}")
    return result

Two lines — what came in, what went out — answer the only question that matters: **is this
function wrong, or is it being given the wrong thing?** Those need completely different fixes and
guessing between them wastes most debugging time.

Use \`!r\` rather than plain interpolation. It shows quotes, so \`'5'\` and \`5\` are distinguishable —
and that distinction is the cause about a third of the time.

**Then bisect.** In a chain \`a() -> b() -> c()\`, print at each boundary and find the first place
the value is wrong. Everything before it is fine and does not need reading.`,
    coding: [
      {
        title: 'Diagnose three broken functions',
        description: `Each function below is broken in a different way. Work out WHICH of the four failure modes each one is before you change anything, then make the smallest fix.

The program should read three integers on one line and print the largest, then the average to one decimal place.`,
        starter: `def largest(a, b, c):
    print(max(a, b, c))

def mean(a, b, c):
    total = total + a + b + c
    return total / 3

def report(a, b, c):
    big = largest(a, b, c)
    avg = mean(a, b, c)
    return f"{big} {avg:.1f}"

a, b, c = [int(x) for x in input().split()]
print(report(a, b, c))`,
        language: 'python',
        tests: [
          { input: '3 9 6', expectedOutput: '9 6.0' },
          { input: '1 1 1', expectedOutput: '1 1.0' },
          { input: '10 2 3', expectedOutput: '10 5.0', isHidden: true },
          { input: '0 0 3', expectedOutput: '3 1.0', isHidden: true },
        ],
      },
    ],
    mcqs: [
      mcq('`TypeError: unsupported operand type(s) for +: \'NoneType\' and \'int\'`. Where is the bug?',
        [['In whichever function printed instead of returning, not the failing line', true],
          ['On the line with the `+`, which is where it was raised', false],
          ['In the input parsing, which produced a None instead', false],
          ['In the function signature, which declares the wrong type', false]],
        'The None travelled from somewhere else. Tracing back to the function that produced it is the whole diagnosis.'),
      mcq('`UnboundLocalError` for a name that clearly exists above the function means:',
        [['You assigned to it inside, making it local for the entire body', true],
          ['The variable is misspelt somewhere inside the function', false],
          ['The function needs a `global` declaration to read it', false],
          ['The outer variable is out of scope', false]],
        '`global` would silence it and create a worse problem. Passing it in as a parameter is the fix.'),
      mcq('Why print both the arguments and the return value when debugging a function?',
        [['It separates "this is wrong" from "it is being given the wrong thing"', true],
          ['It is faster than setting a breakpoint and stepping through', false],
          ['It prevents a type error by forcing the values to strings', false],
          ['Two prints per function is the conventional debugging style', false]],
        'Those two diagnoses need completely different fixes, and guessing between them is where most debugging time goes.'),
      mcq('Why use `!r` in a debug print?',
        [['It shows quotes, so the string "5" is distinguishable from the number 5', true],
          ['It is shorter than formatting the value by hand', false],
          ['It prints faster, since no conversion is required', false],
          ['It prefixes the value with the name of its type', false]],
        'That distinction is the actual cause roughly a third of the time, and plain interpolation hides it completely.'),
    ],
  },
  {
    unitCode: 'T_FUNCTIONS_PRACTICE',
    notes: `No new ideas. Everything here uses definition, parameters, return, defaults, scope,
composition and the debugging method — and nothing else.

The goal is fluency. Functions should cost you no attention, so the attention is available for
the problem you are actually solving.

**Work these without looking anything up.** If you have to check what \`return\` does, go back to
that unit rather than pushing through — practice cements whatever you are doing, including the
wrong thing.

**The checklist to run on every function before you run it:**

1. Does it \`return\`, or did I \`print\` by accident?
2. Is each parameter used? An unused one usually means the signature is wrong.
3. Does it do one thing? Could I name it without "and"?
4. What does it do with empty input, zero, or a single item?
5. Am I assigning to any name that also exists outside?

**Trace before running.** Pick an input, walk the function on paper, write down the expected
return value, then run it. When they disagree you have learned something; when you run first you
have only learned what it does.`,
    mcqs: [
      mcq('`def f(items): return len(items) / 2` — what should you check before trusting it?',
        [['What it does with an empty list, and which kind of division you wanted', true],
          ['Whether `items` is a list rather than some other sequence', false],
          ['That it has a docstring describing what it returns', false],
          ['Nothing; the function is short enough to be obviously correct', false]],
        'Empty gives 0.0 here rather than an error, which may or may not be what you want — and `/` versus `//` is a decision, not a detail.'),
      mcq('A function takes four parameters and uses two. What does that suggest?',
        [['The signature is wrong — it is asking callers for things it does not need', true],
          ['Nothing; unused parameters are harmless and cost nothing', false],
          ['The unused parameters need defaults so callers may omit them', false],
          ['It should be split into two functions, one for each pair', false]],
        'Every parameter is a demand on the caller. Unused ones are a maintenance cost and often a leftover from a refactor.'),
      mcq('Which correctly returns the larger of two numbers without using max?',
        [['`def bigger(a, b): return a if a > b else b`', true],
          ['`def bigger(a, b): print(a if a > b else b)`', false],
          ['`def bigger(a, b): a if a > b else b`', false],
          ['`def bigger(a, b): if a > b: a; else: b`', false]],
        'The second prints; the third computes and discards; the fourth is not valid Python. Only the first hands a value back.'),
      mcq('`def tax(amount, rate=0.18)` called as `tax(100, 18)` returns 1800. The bug is:',
        [['The caller used a percentage where the default implies a fraction', true],
          ['The default value of 0.18 is wrong and should be 18', false],
          ['Two arguments are not allowed when one has a default', false],
          ['`rate` should be a string so the percent sign is explicit', false]],
        'Exactly the ambiguity a docstring is for. The function is fine; the convention was never stated.'),
      mcq('Why trace a function on paper before running it?',
        [['Running says what it does; predicting says whether your model is right', true],
          ['It is faster than starting the interpreter and running it', false],
          ['It finds syntax errors before the interpreter reports them', false],
          ['It is required before any function may be run for the first time', false]],
        'The model is the thing being trained. Code that works while your model is wrong fails on the next problem.'),
    ],
    coding: [
      {
        title: 'Build three functions that compose',
        description: `Write three functions and use them together.

- \`celsius_to_fahrenheit(c)\` — returns the converted temperature
- \`is_freezing(c)\` — returns True when the temperature is at or below 0°C
- \`describe(c)\` — returns a string like "20C = 68.0F" or "-5C = 23.0F (freezing)"

\`describe\` must CALL the other two rather than repeating their logic. Read one integer and print \`describe\` of it.

Get the boundary right: exactly 0 counts as freezing.`,
        starter: `# your functions here

c = int(input())
print(describe(c))`,
        language: 'python',
        tests: [
          { input: '20', expectedOutput: '20C = 68.0F' },
          { input: '0', expectedOutput: '0C = 32.0F (freezing)' },
          { input: '-5', expectedOutput: '-5C = 23.0F (freezing)' },
          { input: '100', expectedOutput: '100C = 212.0F', isHidden: true },
          { input: '1', expectedOutput: '1C = 33.8F', isHidden: true },
        ],
      },
      {
        title: 'A function with a default that behaves',
        description: `Write \`join_names(names, separator=", ")\` which returns the names joined by the separator.

Requirements:
- An empty list returns the empty string, not an error.
- A single name returns just that name.
- The default separator is used when the caller does not supply one.

Read a line of space-separated names, then a second line which is either a separator or the word DEFAULT. Print the result.`,
        starter: `# your function here

names = input().split()
sep = input()
if sep == "DEFAULT":
    print(join_names(names))
else:
    print(join_names(names, sep))`,
        language: 'python',
        tests: [
          { input: 'Asha Ravi Meera\nDEFAULT', expectedOutput: 'Asha, Ravi, Meera' },
          { input: 'Asha Ravi\n | ', expectedOutput: 'Asha | Ravi' },
          { input: 'Asha\nDEFAULT', expectedOutput: 'Asha' },
          { input: '\nDEFAULT', expectedOutput: '', isHidden: true },
        ],
      },
    ],
  },
  {
    unitCode: 'T_FUNCTIONS_MINI_PROJECT',
    notes: `You have the whole of functions now. This is one small program built end to end out of
them, and then explained.

**Why building beats another exercise.** An exercise tells you what the functions should be —
"write \`celsius_to_fahrenheit\`". A brief does not. You have to decide how many functions there
are, what each one takes and returns, and which of them may print. That decomposition is the
actual skill, and it only shows up when nobody has done it for you.

**The shape of the work.**

1. **List the jobs.** Read the brief and write each distinct job as a short verb phrase. If a
   phrase needs "and", split it. These are your functions.
2. **Decide each signature.** What does it need, and what does it hand back? Write the \`def\`
   lines with empty bodies first — the shape of the program is visible before any logic exists.
3. **Decide who prints.** Usually exactly one function, at the top. Everything below it returns.
4. **Write the pieces, checking each alone.** \`grade(75)\` before \`report(...)\`.
5. **Compose.** The top-level function should read like the brief.
6. **Test the edges.** Empty input, one item, the boundary of every threshold.
7. **Write the explanation.**

**The explanation is where you discover things.** Writing "this is a function because ___" is
how you notice a function that exists for no reason, or two that should be one.

The brief, acceptance criteria and deliverables are in the assignment attached to this unit.`,
    assignment: {
      title: 'Mini Project — Attendance Register',
      description: `Build a small program that turns raw attendance records into a summary, decomposed into functions that each do one thing. Deliberately bigger than a single function and deliberately smaller than anything needing files or classes.`,
      instructions: `**The brief**

A lecturer has attendance for one subject. For each student there is a name and a string of
marks, one character per class: \`P\` present, \`A\` absent, \`L\` late.

Read the number of students, then that many lines of \`name record\`, for example:

    3
    Asha PPPLAP
    Ravi AAPPPP
    Meera PPPPPP

Produce, for each student, a line:

    Asha: 5/6 (83.3%) - ELIGIBLE

Rules:

1. A late counts as **half** a present.
2. The percentage is attendance over total classes, to one decimal place.
3. 75% or above is \`ELIGIBLE\`; 60% up to but not including 75% is \`CONDONABLE\`; below 60% is
   \`SHORT\`.
4. A student with no classes recorded is \`NO DATA\` and must not crash the program.
5. After the per-student lines, print one summary line:
   \`Class average: 78.3%\`

**What to submit**

1. Your program in a single \`.py\` file.
2. A written explanation (roughly 250-400 words) covering:
   - the jobs you identified and the function you made for each
   - for each function: what it takes, what it returns, and why it returns rather than prints
   - which single function prints, and why the others do not
   - how you handled rule 4 without a special case scattered through the code
   - the boundary inputs you tested and what each proved
3. Your test table, including at minimum: a student at exactly 75%, one at exactly 60%, one with
   an empty record, and one whose record is all lates.

**Constraints**

- At least four functions, each doing one thing, each nameable without "and".
- Only ONE function may print. Every other function returns.
- No global variables other than constants.
- No external libraries.

**Boundary hints, so you test the right things**

\`LLLLLL\` is 3/6 = 50.0% = SHORT. A record of exactly \`PPPLLL\` is 4.5/6 = 75.0% and must be
ELIGIBLE, not CONDONABLE. Getting the half-count and the inclusive boundary right together is
most of the marks.`,
      rubric: [
        {
          criterion: 'Decomposition',
          description: 'At least four functions, each doing one thing and nameable without "and". Exactly one prints; the rest return. No globals beyond constants.',
          maxPoints: 30,
        },
        {
          criterion: 'Correctness',
          description: 'Lates count as half. Percentages to one decimal. All three bands correct, and the empty record handled as NO DATA without crashing.',
          maxPoints: 25,
        },
        {
          criterion: 'Boundaries',
          description: 'Exactly 75% is ELIGIBLE and exactly 60% is CONDONABLE, demonstrated by the submitted test table including the PPPLLL case.',
          maxPoints: 20,
        },
        {
          criterion: 'Written explanation',
          description: 'Explains each signature and the return-versus-print decision with reasons, rather than narrating what the code does line by line.',
          maxPoints: 15,
        },
        {
          criterion: 'Testing evidence',
          description: 'A test table covering both boundaries, the empty record and the all-lates case, with expected and actual output.',
          maxPoints: 10,
        },
      ],
      totalPoints: 100,
    },
  },
];
