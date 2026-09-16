/**
 * T_VARIABLES (nine concept units, debugging, practice, mini project) and T_GIT_MINI_PROJECT.
 *
 * ── WHY THESE, TOGETHER ───────────────────────────────────────────────────────────────────
 *
 * Both topics are UNIVERSAL and both had instruction without an ending. T_VARIABLES is the first
 * programming topic every learner meets, and its concept units were never followed by the three
 * application units the design calls for — so the very first programming a beginner does had
 * nothing to debug, nothing to practise against and nothing to build. T_GIT had ten units of
 * commands and practice and nothing that asked a learner to live with a history for longer than
 * one sitting, which is the only way Git's value becomes visible.
 *
 * ── THE NINE CONCEPT UNITS, AND WHY THEY WERE THE HOLE IN THE PRODUCT ─────────────────────
 *
 * The three application units above were written first, and the nine units they rest on were not
 * written at all. Every one of T_VARIABLES_FIRST_PROGRAM … T_VARIABLES_NAMING existed as a unit
 * row — a title, a description and one learning outcome — with no lesson, no practice and no
 * checkpoint, which left each of them PARTIAL and therefore unpublishable. A CONCEPT unit is READY
 * only with its own teaching, its own practice and something that measures it, and inherited
 * topic-level content can never lift it (see unitReadinessPolicy).
 *
 * The consequence reached production. PROGRAMMING_FUNDAMENTALS is declared by these units and by
 * nothing else that teaches, so the skill had no instructional unit the composer could schedule:
 * a first-year could be handed "debug your variables" and "practise variables" while every unit
 * that says what a variable IS sat in DRAFT. That is the real reason a beginner's ninety days
 * opened on filesystems and arrays rather than on programming.
 *
 * These bundles stay strictly inside the topic, exactly as the three application units do: no
 * conditions, no loops, no lists in anything a learner is asked to write. The order is the
 * authored one — a program that runs, then names for values, then the types those values have,
 * then reading input, and naming last because it is a judgement that needs something to judge.
 *
 * ── THE LINE THESE UNITS HOLD ─────────────────────────────────────────────────────────────
 *
 * The variables units stay strictly inside the topic: printing, assignment, numbers, strings,
 * booleans, types and input. No conditions, loops or lists appear in a task a learner is asked to
 * write, because those topics come later and a unit that silently needs them is unreachable. What
 * the units drill instead is the fault that dominates first programs: a value whose type is not
 * the one the programmer believes.
 *
 * The Git project is assessed on the repository rather than the code in it — a history that
 * reads, branches that existed for reasons, and a README that survived a real stranger.
 *
 * T_VARIABLES units declare three skills, so every checkpoint question names the one it measures:
 * PROGRAMMING_FUNDAMENTALS for language-independent ideas such as assignment, PYTHON_BASICS for
 * how Python itself behaves, PYTHON_STRINGS for text.
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

const PF = 'PROGRAMMING_FUNDAMENTALS';
const PB = 'PYTHON_BASICS';
const PS = 'PYTHON_STRINGS';

export const VARIABLES_GIT_BUNDLES: PilotBundle[] = [
  {
    unitCode: 'T_VARIABLES_FIRST_PROGRAM',
    notes: `A program is a text file the computer reads from top to bottom, one line at a time, and
does exactly what each line says. Nothing more mysterious than that.

Open an editor, type one line, and save it as \`hello.py\`:

    print("Hello.")

Then run it from a terminal, in the folder where you saved it:

    python hello.py

\`print\` shows something to the person running the program. It is not how a value is stored or
used — it is only how a value is made visible. That distinction matters later, when a program
computes the right answer and prints nothing, which looks identical to computing nothing.

**A file, not a chat.** Typing \`python\` on its own opens an interactive prompt that answers each
line as you type it. It is useful for trying one thing. It is not where programs live: close it
and everything you typed is gone. A program is a file precisely because it can be run again
tomorrow, by somebody else, without you there to retype it.

**The three failures you will meet in the first hour**, and none of them mean you are doing badly:

\`python: can't open file 'hello.py'\` — the terminal is not in the folder holding the file.
Nothing is wrong with the program; you are standing somewhere else.

\`SyntaxError: unterminated string literal\` — a quote was opened and never closed. Python stops
before running anything at all, so no output is not a sign the program did nothing wrong.

\`NameError: name 'Print' is not defined\` — capitals matter. \`Print\` and \`print\` are two
different names, and only one exists.

Lines starting with \`#\` are comments. Python ignores them entirely; they are for the human
reading the file, which is usually you, later.`,
    mcqs: [
      mcq('A file `hello.py` contains one line: `print("Hello.")`. What does running `python hello.py` do?',
        [['Shows Hello. and ends', true],
          ['Opens an interactive prompt where more lines can be typed', false],
          ['Saves the text Hello. into a new file beside hello.py', false],
          ['Nothing, because a one-line file is not a complete program', false]],
        'The file is read top to bottom and each line is carried out. One line means one action, then the program ends.'),
      mcq('Running a program gives `python: can\'t open file \'hello.py\'`. What is wrong?',
        [['The terminal is not in the folder that holds the file', true],
          ['The file needs to be saved again before it can be run', false],
          ['print() cannot be the only line in a program file', false],
          ['Python must be told the file is a program before running it', false]],
        'That message is about finding the file, not about its contents. Move to the folder holding it, or give the full path.'),
      mcq('A program contains `Print("Hi")` and stops with `NameError: name \'Print\' is not defined`. Why?',
        [['Names are case-sensitive, and the function is called print', true],
          ['Print needs its argument in single quotes rather than double', false],
          ['Print may only be used after something has been stored first', false],
          ['The line is missing a semicolon at the end', false]],
        'Python treats Print and print as unrelated names. Only print exists, so the capitalised one was never defined.'),
      mcq('What is the difference between typing lines at the `python` prompt and writing them in a file?',
        [['The file can be run again later; the prompt forgets everything when closed', true],
          ['The prompt runs faster because it skips reading from disk', false],
          ['Only a file can use print(); the prompt shows values another way', false],
          ['There is no difference beyond where the text is typed', false]],
        'A program is a file so it can be repeated without you retyping it. The prompt is for trying one thing.'),
    ],
    checkpoint: [
      mcq('A program file contains these two lines, in this order: `print("second")` then `print("first")`. What is shown?',
        [['second then first, because lines run top to bottom', true],
          ['first then second, because Python orders output alphabetically', false],
          ['Only second, because a program ends after its first instruction', false],
          ['An error, because the words do not match the order they name', false]],
        'Execution order is the order the lines are written in. The words inside the quotes are just text and mean nothing to Python.', PF),
      mcq('`print("Hello.)` stops with `SyntaxError: unterminated string literal` and shows no output at all. Why is there no output?',
        [['Python checks the whole file before running any of it', true],
          ['The output was shown but immediately erased by the error', false],
          ['print() refuses text that contains a full stop', false],
          ['The program ran correctly and the error came afterwards', false]],
        'A syntax error is found while reading the file, before the first line is carried out — so nothing runs, rather than running partly.', PB),
      mcq('Which line, added to a program, does nothing when it runs?',
        [['`# work out the total`', true],
          ['`print("# work out the total")`', false],
          ['`print()`', false],
          ['`print("")`', false]],
        'A # line is a comment, ignored entirely. The other three all reach print(), and two of them print an empty line, which is still an action.', PB),
    ],
  },
  {
    unitCode: 'T_VARIABLES_VARIABLES',
    notes: `A variable is a name for a value, so the value can be used more than once and referred
to by what it means rather than by what it is.

    fees = 5000
    print(fees)

The \`=\` is **assignment**, not equality. Read it as "gets" or "is now": \`fees = 5000\` means
*put 5000 in the box called fees*. It is an instruction, not a statement of fact, which is why
this is perfectly legal and extremely common:

    total = 0
    total = total + 250

The right-hand side is worked out FIRST, using the current value, and the result is then stored
back under the same name. So \`total\` becomes 250. Nothing here is circular, because the two
sides happen at different moments.

**A name holds one value at a time.** Assigning again replaces what was there; the old value is
simply gone, with no warning and no record.

    paid = 1000
    paid = 2000       # 1000 is no longer anywhere

**Reading a name that was never assigned is an error**, and a useful one:

    print(blance)     # NameError: name 'blance' is not defined

But assigning to a misspelt name is NOT an error — it quietly creates a second variable. This is
the single most expensive typo a beginner makes:

    balance = 500
    balanse = balance - 200
    print(balance)    # 500, unchanged, and nothing warned you

The value was computed correctly and stored under a name nobody reads again. Python cannot help
here: creating a new name is exactly what you asked for.

**The order of lines is the order of events.** A name must be assigned above the line that reads
it, because the file runs top to bottom.`,
    mcqs: [
      mcq('`total = 10`, then `total = total + 5`, then `print(total)`. What is printed?',
        [['15, because the right side is worked out before it is stored', true],
          ['An error, because total cannot be defined using itself', false],
          ['10, because the second line does not change the stored value', false],
          ['5, because total is replaced by the amount being added', false]],
        'The right-hand side uses the current value (10), producing 15, which is then stored back under the same name.'),
      mcq('`price = 100`, then `price = 250`, then `print(price)`. Where did 100 go?',
        [['It was replaced and is no longer stored anywhere', true],
          ['It is kept as the previous value and can be read back', false],
          ['Both values are held, and print shows the first one', false],
          ['The second assignment fails because price already exists', false]],
        'A name holds one value at a time. Reassignment overwrites, and the old value is not recoverable.'),
      mcq('Which of these raises an error?',
        [['`print(count)` when count was never assigned', true],
          ['`cont = 5` when the intended name was count', false],
          ['`count = count_of_items` when both names exist', false],
          ['`count = 5` followed later by `count = "five"`', false]],
        'Only READING an unassigned name fails. Assigning to a new or misspelt name is always legal, which is what makes that typo dangerous.'),
      mcq('Why is `balance = 500` then `balanse = balance - 200` then `print(balance)` showing 500 rather than 300?',
        [['The subtraction was stored under a different, misspelt name', true],
          ['Subtraction needs to be written as balance -= 200 to take effect', false],
          ['print() shows the value from before the most recent change', false],
          ['Python refused the subtraction because 200 was not stored first', false]],
        'balanse is a new variable holding 300. balance was never changed, and nothing warns you, because creating a name is legal.'),
    ],
    checkpoint: [
      mcq('What does `=` mean in `fees = 5000`?',
        [['Store 5000 under the name fees', true],
          ['Claim that fees and 5000 are equal', false],
          ['Compare fees with 5000 and report the result', false],
          ['Create a permanent constant that cannot change', false]],
        'The equals sign assigns. Comparison is a different operator, and a name assigned once can be assigned again freely.', PF),
      mcq('A program reads `print(subtotal)` on line 3 and assigns `subtotal = 400` on line 5. What happens?',
        [['NameError on line 3, because the name has no value yet', true],
          ['400 is printed, because Python reads the whole file first', false],
          ['Nothing is printed, and the program continues silently', false],
          ['0 is printed, as the starting value for a number', false]],
        'The file runs top to bottom. At line 3 the name does not exist yet, and reading a name that has no value is an error.', PB),
      mcq('After `name = "Asha"` and then `name = "Ben"`, what does `print(name)` show?',
        [['Ben', true],
          ['Asha', false],
          ['AshaBen', false],
          ['An error, because a name cannot hold text twice', false]],
        'The second assignment replaced the first value. Only the most recent value is held.', PS),
    ],
  },
  {
    unitCode: 'T_VARIABLES_NUMBERS',
    notes: `Python has two kinds of number, and the difference shows up in answers rather than in
how they are written.

An **int** is a whole number: \`5\`, \`0\`, \`-40\`. A **float** carries a fractional part:
\`5.0\`, \`2.75\`. Writing \`5.0\` instead of \`5\` changes the type, even though the value looks
the same.

The operators are what you expect, with two that are not:

    7 + 2     # 9
    7 - 2     # 5
    7 * 2     # 14
    7 / 2     # 3.5      true division — ALWAYS a float
    7 // 2    # 3        floor division — the whole part, fraction discarded
    7 % 2     # 1        remainder
    7 ** 2    # 49       power

**\`/\` always produces a float**, even when it divides exactly: \`6 / 3\` is \`2.0\`, not \`2\`.
If you want a whole number, \`//\` is the operator that gives one.

**\`//\` discards, it does not round.** \`7 // 2\` is 3, and so is \`3.9 // 1\`. Nothing is
rounded to nearest; the fraction is simply dropped.

Together \`//\` and \`%\` split a quantity into units and leftovers, which is most of the
arithmetic a first program does:

    minutes = 135
    hours = minutes // 60      # 2
    rest  = minutes % 60       # 15

**Mixing int and float gives a float.** \`3 + 0.5\` is \`3.5\`; the int is widened to keep the
fraction rather than the fraction being thrown away.

**Floats are approximations.** \`0.1 + 0.2\` prints \`0.30000000000000004\`. This is not a Python
fault — it is how fractions are stored in binary, and every mainstream language does it. Never
compare two floats for exact equality; compare whole numbers, or round for display.

Order of operations follows normal arithmetic: \`**\` first, then \`*\`, \`/\`, \`//\`, \`%\`,
then \`+\` and \`-\`. Brackets settle anything you would otherwise have to think about.`,
    mcqs: [
      mcq('What is the value and type of `6 / 3`?',
        [['2.0, a float, because / always divides to a float', true],
          ['2, an int, because the division came out exactly', false],
          ['2.0, an int written with a decimal point for clarity', false],
          ['An error, because / cannot be used on whole numbers', false]],
        'True division always produces a float, whether or not it divides exactly. // is the operator that yields a whole number.'),
      mcq('A program needs 135 minutes shown as hours and minutes. Which pair gives 2 and 15?',
        [['`minutes // 60` and `minutes % 60`', true],
          ['`minutes / 60` and `minutes % 60`', false],
          ['`minutes % 60` and `minutes // 60`', false],
          ['`round(minutes / 60)` and `minutes - 60`', false]],
        '// keeps the whole hours and % keeps the remainder. Plain / gives 2.25, which is neither of the two numbers wanted.'),
      mcq('What is `7 // 2`?',
        [['3, because the fraction is discarded rather than rounded', true],
          ['4, because 3.5 rounds up to the nearest whole number', false],
          ['3.5, the same as 7 / 2', false],
          ['1, which is the remainder of dividing 7 by 2', false]],
        'Floor division drops the fractional part. Rounding to nearest would give 4, and the remainder is what % returns.'),
      mcq('`print(0.1 + 0.2)` shows `0.30000000000000004`. What does this indicate?',
        [['Floats are stored as approximations, in every mainstream language', true],
          ['Python has a bug in its addition of small decimals', false],
          ['The numbers must be written as 0.10 and 0.20 to add exactly', false],
          ['Addition of floats requires round() to work at all', false]],
        'Binary cannot represent 0.1 exactly. The consequence to remember is that exact equality between floats is unreliable.'),
    ],
    checkpoint: [
      mcq('What is printed by `print(10 % 3)`?',
        [['1', true],
          ['3', false],
          ['3.333333333333333', false],
          ['0', false]],
        '% gives the remainder after whole division: 3 goes into 10 three times with 1 left over.', PF),
      mcq('`total = 5 + 2.0`. What is the type of total, and why?',
        [['float, because mixing an int with a float widens the result', true],
          ['int, because the fractional part of 2.0 is zero', false],
          ['str, because two different types were combined', false],
          ['It raises a TypeError, since int and float cannot be added', false]],
        'Mixed arithmetic keeps the fraction rather than discarding it, so the result is a float — here 7.0.', PB),
      mcq('Which expression gives the whole number of complete boxes when 47 items are packed 10 to a box?',
        [['`47 // 10`', true],
          ['`47 / 10`', false],
          ['`47 % 10`', false],
          ['`47 ** 10`', false]],
        '// gives 4 complete boxes. / gives 4.7, % gives the 7 left over, and ** is a power.', PF),
    ],
  },
  {
    unitCode: 'T_VARIABLES_STRINGS',
    notes: `A string is text: a sequence of characters, written between quotes.

    college = "CodeBegun"
    greeting = 'Hello'

Single and double quotes mean exactly the same thing. Having both is convenient — a string
containing an apostrophe is easiest in double quotes: \`"it's fine"\`.

**Quotes are the boundary, not part of the value.** \`"5"\` is text one character long; \`5\` is a
number. They look similar and behave entirely differently, which is the source of most early
confusion.

**Joining.** \`+\` between two strings concatenates them:

    full = "Code" + "Begun"        # "CodeBegun"

It joins exactly what it is given, so spaces must be written explicitly:
\`first + " " + last\`.

**\`+\` cannot join text to a number.** \`"Age: " + 25\` raises
\`TypeError: can only concatenate str (not "int") to str\`. This is the first TypeError almost
everyone meets.

**f-strings are the answer.** Put \`f\` before the opening quote and any value in braces:

    age = 25
    print(f"Age: {age}")          # Age: 25

The braces accept any type and any expression — \`f"Total: {price * 2}"\` — which is why
f-strings have replaced older joining styles almost everywhere.

**Length and position.** \`len(name)\` gives the number of characters. Individual characters are
read by position, counting from **zero**:

    name = "Asha"
    name[0]     # "A"
    name[3]     # "a"
    name[-1]    # "a"   negative counts from the end

The last valid position is \`len(name) - 1\`. Going past it raises \`IndexError\`, and counting
from one instead of zero is the classic way to reach it.

**A string cannot be changed in place.** \`name[0] = "B"\` is an error. Strings are immutable:
operations on them return a NEW string, and the original is untouched.`,
    mcqs: [
      mcq('`age = 25`, then `print("Age: " + age)` raises a TypeError. Which line prints `Age: 25`?',
        [['`print(f"Age: {age}")`', true],
          ['`print("Age: " + int(age))`', false],
          ['`print("Age: " {age})`', false],
          ['`print("Age: " . age)`', false]],
        'The f prefix turns {age} into its value, whatever its type. int(age) leaves a number, so + still fails.'),
      mcq('`name = "Asha"`. What is `name[0]`?',
        [['"A", because positions count from zero', true],
          ['"s", because position 0 is skipped as the start marker', false],
          ['"Asha", because a single index returns the whole string', false],
          ['An error, because 0 is not a valid position', false]],
        'Indexing starts at 0, so the first character is at position 0 and the last is at len(name) - 1.'),
      mcq('What does `len("Code Begun")` return?',
        [['10, counting the space as a character', true],
          ['9, because spaces separate words rather than count', false],
          ['2, the number of words in the text', false],
          ['11, counting the space and the end of the string', false]],
        'Every character counts, including spaces. Four plus one plus five is ten.'),
      mcq('`greeting = "Hello"`, then `greeting[0] = "J"`. What happens?',
        [['TypeError, because a string cannot be changed in place', true],
          ['greeting becomes "Jello" and nothing is reported', false],
          ['A new variable is created holding "J"', false],
          ['The assignment is ignored silently', false]],
        'Strings are immutable. To get "Jello" you build a new string, for example "J" + greeting[1:].'),
    ],
    checkpoint: [
      mcq('Which pair of values are of DIFFERENT types?',
        [['`"5"` and `5`', true],
          ['`\'hello\'` and `"hello"`', false],
          ['`"5"` and `"five"`', false],
          ['`5` and `5`', false]],
        'Quotes make a value text. "5" is a one-character string and 5 is a number; single and double quotes are interchangeable.', PS),
      mcq('`first = "Asha"` and `last = "Rao"`. Which produces `Asha Rao`?',
        [['`first + " " + last`', true],
          ['`first + last`', false],
          ['`first " " last`', false],
          ['`first, last`', false]],
        '+ joins exactly what it is given, so the space must be supplied as its own string.', PS),
      mcq('`word = "Pune"`. What is `word[-1]`?',
        [['"e", because negative positions count from the end', true],
          ['"P", because -1 wraps around to the start', false],
          ['An error, because positions cannot be negative', false],
          ['"Pun", because -1 removes the last character', false]],
        'Negative indexing counts backwards from the end, so -1 is the last character and -2 the one before it.', PS),
    ],
  },
  {
    unitCode: 'T_VARIABLES_STRING_METHODS',
    notes: `Text arrives messier than you want it: extra spaces, the wrong case, several fields in
one line. These are the operations that clean it up, and you will use them daily.

**Every one of them returns a NEW string.** The original is never modified. This is the mistake
that costs people an afternoon:

    city = "  Pune  "
    city.strip()          # returns "Pune" — and throws it away
    city = city.strip()   # this is what keeps it

**Slicing** takes a range of positions, from the first up to but NOT including the second:

    word = "Begun"
    word[0:3]     # "Beg"
    word[2:]      # "gun"     to the end
    word[:2]      # "Be"      from the start
    word[:]       # "Begun"   the whole thing

The "up to but not including" rule is deliberate: \`word[0:3]\` has exactly 3 characters, and
\`word[:n] + word[n:]\` always rebuilds the original with nothing lost or repeated.

**Searching.** \`in\` answers yes or no; \`.find()\` gives a position, or \`-1\` when absent:

    "gun" in word         # True
    word.find("gun")      # 2
    word.find("xyz")      # -1, not an error

**Splitting** turns one string into a list of pieces:

    "asha,ben,cara".split(",")     # ["asha", "ben", "cara"]
    "one two three".split()        # ["one", "two", "three"]  — any whitespace

**Case and cleanup**, all returning new strings: \`.upper()\`, \`.lower()\`, \`.strip()\`,
\`.replace(old, new)\`, \`.startswith(...)\`, \`.endswith(...)\`.

Comparing text typed by a person almost always wants case folded first:

    answer.strip().lower() == "yes"

Methods chain left to right, each working on the result of the one before it. That single line
handles \`" Yes "\`, \`"YES"\` and \`"yes"\` identically, which is the whole point.`,
    mcqs: [
      mcq('`line = "pune,mumbai,nagpur"`. Which expression gives `nagpur`?',
        [['`line.split(",")[2]`', true],
          ['`line.split(",")[3]`', false],
          ['`line[-1]`', false],
          ['`line.find("nagpur")`', false]],
        'split(",") gives three pieces and positions count from zero, so the third is [2]. [3] is past the end, line[-1] is the single character "r", and find() returns a position rather than the text.'),
      mcq('`word = "Begun"`. What is `word[1:4]`?',
        [['"egu", from position 1 up to but not including 4', true],
          ['"egun", from position 1 up to and including 4', false],
          ['"Beg", the first four characters minus one', false],
          ['"Bgn", every character except positions 1 to 4', false]],
        'A slice stops before the second index, so [1:4] yields exactly 3 characters: positions 1, 2 and 3.'),
      mcq('What does `"hello".find("xyz")` return?',
        [['-1, meaning not found', true],
          ['0, meaning the search reached the start', false],
          ['None, because there is nothing to return', false],
          ['A ValueError, because the text is absent', false]],
        'find() reports -1 for absent text rather than failing, which is why it can be tested without stopping the program.'),
      mcq('A person may type `" Yes "`, `"YES"` or `"yes"`. Which comparison treats all three as agreement?',
        [['`answer.strip().lower() == "yes"`', true],
          ['`answer == "yes"`', false],
          ['`answer.strip() == "Yes"`', false],
          ['`answer.upper() == "yes"`', false]],
        'strip() removes the spaces and lower() folds the case, so all three reduce to "yes". Comparing to "yes" after upper() can never match.'),
    ],
    checkpoint: [
      mcq('Which line actually changes what `name` holds?',
        [['`name = name.upper()`', true],
          ['`name.upper()`', false],
          ['`upper(name)`', false],
          ['`name.upper` ', false]],
        'String methods return a new value; only assigning it back changes the variable. upper(name) is not how a method is called.', PS),
      mcq('`"asha,ben,cara".split(",")` produces what?',
        [['A list of three strings', true],
          ['One string with the commas removed', false],
          ['Three separate variables named asha, ben and cara', false],
          ['A list of every individual character', false]],
        'split() breaks the text at each separator and returns the pieces as a list.', PS),
      mcq('`word = "Begun"`. Which expression rebuilds the original exactly?',
        [['`word[:2] + word[2:]`', true],
          ['`word[:2] + word[3:]`', false],
          ['`word[:3] + word[2:]`', false],
          ['`word[0:2] + word[2:4]`', false]],
        'Because a slice stops before its end index, [:n] and [n:] meet exactly once with nothing lost or repeated.', PS),
    ],
  },
  {
    unitCode: 'T_VARIABLES_BOOLEANS',
    notes: `\`True\` and \`False\` are values in their own right, like \`5\` or \`"Pune"\`. They can
be stored, printed and passed around.

    passed = True
    print(passed)        # True

Both are capitalised, and neither takes quotes. \`"True"\` is a five-character string, not a
boolean, and it behaves nothing like one.

**Comparisons produce booleans.** That is where they usually come from:

    marks = 72
    marks > 40          # True
    marks == 100        # False

The operators are \`==\` equal, \`!=\` not equal, \`>\`, \`<\`, \`>=\`, \`<=\`.

**\`==\` compares; \`=\` assigns.** They are different operators and confusing them is the most
common single-character mistake in programming:

    marks = 100         # sets marks to 100
    marks == 100        # asks whether marks is 100

**Types matter in comparison.** \`"72" == 72\` is \`False\` — text is never equal to a number,
even when it looks the same. This is exactly what goes wrong after reading input, which always
arrives as text.

Comparing text with \`>\` compares alphabetically, not by length: \`"apple" < "banana"\` is
\`True\`. Capitals sort before lowercase letters, so \`"Zebra" < "apple"\` is also \`True\` —
another reason to fold case before comparing.

**Combining.** \`and\` is True only when both sides are; \`or\` when at least one is; \`not\`
flips a value.

    marks > 40 and attendance > 75

**Chaining works as it reads.** \`0 <= marks <= 100\` means both comparisons at once, which is
one of the few places Python differs pleasantly from most languages.

Comparisons are just values, so they can be stored and reused:

    eligible = marks > 40 and attendance > 75`,
    mcqs: [
      mcq('What is the value of `"72" == 72`?',
        [['False, because text is never equal to a number', true],
          ['True, because both represent the same quantity', false],
          ['True, because Python converts the text automatically', false],
          ['A TypeError, because the types cannot be compared', false]],
        'Comparing across those types is allowed and simply answers False. This is why a value read from input must be converted before it is compared.'),
      mcq('Which line asks whether marks is 100, rather than setting it?',
        [['`marks == 100`', true],
          ['`marks = 100`', false],
          ['`marks := 100`', false],
          ['`marks equals 100`', false]],
        'A single = assigns; a double == compares. The two are different operators that look almost identical.'),
      mcq('`marks = 72` and `attendance = 60`. What is `marks > 40 and attendance > 75`?',
        [['False, because and requires both sides to be True', true],
          ['True, because the first comparison holds', false],
          ['True, because 72 and 60 are both positive', false],
          ['An error, because two comparisons cannot be combined', false]],
        'The first is True and the second False, and `and` yields True only when both do.'),
      mcq('What does `0 <= marks <= 100` mean?',
        [['Both comparisons must hold at once', true],
          ['The two comparisons are worked out and the last one kept', false],
          ['marks is set to a value between 0 and 100', false],
          ['It is invalid and raises a SyntaxError', false]],
        'Python allows chained comparison, and it means exactly what it reads: marks is at least 0 and at most 100.'),
    ],
    checkpoint: [
      mcq('Which of these is a boolean?',
        [['`True`', true],
          ['`"True"`', false],
          ['`0`', false],
          ['`"yes"`', false]],
        '"True" is text despite the word it spells, and neither 0 nor "yes" is a boolean — though both can be tested for truth. Only True and False are boolean values.', PB),
      mcq('`answer = "yes"`. What is the value of `answer == "Yes"`?',
        [['False, because comparison of text is case-sensitive', true],
          ['True, because the letters are the same', false],
          ['True, because Python ignores case in comparisons', false],
          ['An error, because case must be folded before comparing', false]],
        'Text comparison is exact, including case. Fold with .lower() on both sides when a person typed the value.', PS),
      mcq('What is `not (5 > 3)`?',
        [['False, because 5 > 3 is True and not flips it', true],
          ['True, because not makes any comparison true', false],
          ['5, because not applies to the number rather than the result', false],
          ['An error, because not needs two values', false]],
        '5 > 3 evaluates to True first, and not inverts it to False.', PF),
    ],
  },
  {
    unitCode: 'T_VARIABLES_TYPES',
    notes: `Every value has a **type**, and the type decides what the operators do to it. The same
\`+\` adds numbers and joins text, so knowing the type is how you predict the answer.

    type(5)         # <class 'int'>
    type(5.0)       # <class 'float'>
    type("5")       # <class 'str'>
    type(True)      # <class 'bool'>

**A variable has no type of its own.** The VALUE it currently holds has one, and assigning
something else changes it:

    x = 5           # x holds an int
    x = "five"      # now it holds a str, and this is legal

**The same operator, two behaviours:**

    5 + 3           # 8       addition
    "5" + "3"       # "53"    concatenation
    "5" + 3         # TypeError

The error message names both types, and reading it is usually enough to find the cause:
\`can only concatenate str (not "int") to str\`.

**Converting** is explicit and deliberate:

    int("25")       # 25
    float("2.5")    # 2.5
    str(25)         # "25"

\`int()\` is strict: \`int("25")\` works, \`int(" 25 ")\` works, and \`int("25.5")\` raises
\`ValueError: invalid literal for int() with base 10: '25.5'\`. If a value can have a fraction,
\`float()\` was the right conversion all along.

\`int(25.9)\` gives **25** — it truncates rather than rounding. Use \`round()\` when you want the
nearest whole number.

**Checking rather than assuming.** When an answer is wrong and no error appeared, print the type
beside the value:

    print(type(total), repr(total))

\`repr\` shows quotes around text, so \`'25'\` and \`25\` stop looking identical on screen. Most
type bugs end at that line — the value was text all along, and \`+\` was quietly joining rather
than adding.`,
    mcqs: [
      mcq('What is the result of `"5" + 3`?',
        [['A TypeError naming str and int', true],
          ['"53", because 3 is turned into text', false],
          ['8, because "5" is turned into a number', false],
          ['53, as a number', false]],
        'Python refuses to guess which meaning of + was intended, so it reports the mismatch instead of converting silently.'),
      mcq('What does `int(25.9)` give?',
        [['25, because the fraction is truncated', true],
          ['26, because it rounds to the nearest whole number', false],
          ['25.9, unchanged, since it is already numeric', false],
          ['A ValueError, because the value has a fraction', false]],
        'int() truncates toward zero. round() is the function that goes to the nearest whole number.'),
      mcq('`int("72.5")` raises `ValueError`. What is the correct fix, assuming a fraction is legitimate?',
        [['Use `float("72.5")` instead', true],
          ['Wrap it as `int(str("72.5"))`', false],
          ['Call `int()` twice, once per part', false],
          ['Remove the quotes so it is already a number', false]],
        'int() only accepts whole-number text. If the value may have a fraction, the conversion itself was the wrong choice.'),
      mcq('An answer is wrong but no error appeared. Which line best reveals a type problem?',
        [['`print(type(total), repr(total))`', true],
          ['`print("total is", total)`', false],
          ['`print(int(total))`', false],
          ['`print(len(total))`', false]],
        'type() names the type and repr() shows quotes around text, so a value that is secretly a string becomes obvious.'),
    ],
    checkpoint: [
      mcq('`x = 5` then `x = "five"`. What happens?',
        [['Both are legal; x now holds a string', true],
          ['A TypeError, because x was created as a number', false],
          ['x holds 5 still, because the types do not match', false],
          ['Python stores both values and uses the newer one for numbers', false]],
        'A variable is a name, not a typed box. The type belongs to the value it currently holds.', PF),
      mcq('Which expression gives the number 53?',
        [['`int("5" + "3")`', true],
          ['`"5" + "3"`', false],
          ['`"5" + 3`', false],
          ['`int("5") + int("3")`', false]],
        '"5" + "3" joins to "53", and int() then converts that text to the number 53. The last option adds to 8.', PB),
      mcq('`total = "10"` and `total = total + 5` raises a TypeError. Which fix makes total 15?',
        [['`total = int(total) + 5`', true],
          ['`total = total + "5"`', false],
          ['`total = str(total) + 5`', false],
          ['`total = float(total) + "5"`', false]],
        'The stored value is text, so it must be converted to a number before arithmetic. Joining "5" would give "105".', PB),
    ],
  },
  {
    unitCode: 'T_VARIABLES_INPUT_OUTPUT',
    notes: `\`input()\` stops the program, waits for someone to type a line and press Enter, and
hands back what they typed.

    name = input("Your name: ")
    print("Hello,", name)

The text inside \`input(...)\` is the prompt. It is shown without a newline, so end it with a
space or the typing runs into the question.

**Everything input() returns is a string. Always.** Type \`25\` and you get \`"25"\`, not \`25\`.
This one fact causes more first-week bugs than anything else:

    age = input("Age: ")
    print(age >= 18)      # TypeError: '>=' not supported between 'str' and 'int'

**Convert once, on the line that reads it:**

    age = int(input("Age: "))

Doing it there means every later line works with a number, and there is one place to look when a
value is the wrong type. Converting at the point of use instead scatters \`int(...)\` through the
program and guarantees one gets forgotten.

Two numbers read separately and added without converting produce the classic wrong answer:
typing 10 and 20 gives \`1020\`, because \`+\` joined two strings.

**Conversion can fail**, and it fails on exactly the input a person is most likely to give by
accident — an empty line, a word, or a decimal where a whole number was expected:

    int("")        # ValueError
    int("seven")   # ValueError
    int("7.5")     # ValueError

**print() takes several values**, separating them with a space and ending with a newline:

    print("Total:", 500)         # Total: 500

Two controls are worth knowing: \`sep\` changes the separator and \`end\` changes the ending.

    print("a", "b", sep="-")     # a-b
    print("working", end="")     # no newline after it

For anything with a value inside it, an f-string usually reads better than a list of arguments:

    print(f"{name} owes {balance:.2f}")

\`:.2f\` formats a number to two decimal places, which is how money should be shown.`,
    mcqs: [
      mcq('`age = input("Age: ")` then `print(age >= 18)` raises a TypeError. Why?',
        [['input() returned text, and text cannot be compared with a number', true],
          ['18 must be written as 18.0 for the comparison to work', false],
          ['print() cannot display the result of a comparison', false],
          ['age is a reserved name and cannot hold input', false]],
        'Whatever is typed, input() hands back a str. Converting once — age = int(input("Age: ")) — makes the comparison work.'),
      mcq('`n = input("How many? ")` then `print(n * 3)` shows `444` when 4 is typed. Which change shows `12`?',
        [['`n = int(input("How many? "))`', true],
          ['`print(int(n * 3))`', false],
          ['`print(n + n + n)`', false],
          ['`print(n * "3")`', false]],
        'n holds the text "4", and multiplying text repeats it. Converting on the line that reads it makes every later use arithmetic; int("444") is still 444.'),
      mcq('`print("Name: ", end="")` is followed on the next line by `name = input()`. What does the `end=""` achieve?',
        [['What is typed appears on the same line as the label', true],
          ['The typed value is stored without a trailing newline', false],
          ['The label is shown twice, once by each call', false],
          ['input() is given a default value of "Name: "', false]],
        'print() normally ends with a newline, which would put the cursor on the line below. end="" removes it so the cursor stays put. input() strips the newline from what is typed either way.'),
      mcq('Which line prints `Total: Rs 49.50` when `price = 49.5`?',
        [['`print(f"Total: Rs {price:.2f}")`', true],
          ['`print("Total: Rs", price)`', false],
          ['`print("Total: Rs " + price)`', false],
          ['`print(f"Total: Rs {price}")`', false]],
        ':.2f fixes the number at two decimal places. Without it the value prints as 49.5, and + fails on a float.'),
    ],
    checkpoint: [
      mcq('What type does `input()` always return?',
        [['str, whatever was typed', true],
          ['int when digits were typed, str otherwise', false],
          ['The type that matches what was typed', false],
          ['float, so both whole and decimal numbers are handled', false]],
        'input() never interprets what was typed. Converting is always the programmer\'s job.', PB),
      mcq('Which line reads a whole number and stores it as a number?',
        [['`n = int(input("N: "))`', true],
          ['`n = input(int("N: "))`', false],
          ['`n = int(input)("N: ")`', false],
          ['`n = input("N: ").int()`', false]],
        'input() is called first and its text result is passed to int(). The other forms convert the prompt or are not valid calls.', PB),
      mcq('`print("a", "b")` shows `a b`. Which call shows `a-b` instead?',
        [['`print("a", "b", sep="-")`', true],
          ['`print("a", "b", end="-")`', false],
          ['`print("a" - "b")`', false],
          ['`print("a", "b", sep=" - ")`', false]],
        'sep controls what goes BETWEEN values, so sep="-" gives a-b. end controls what follows the line, sep=" - " keeps spaces around the dash, and "a" - "b" is a TypeError because text cannot be subtracted.', PB),
    ],
  },
  {
    unitCode: 'T_VARIABLES_NAMING',
    notes: `A name is the cheapest documentation you will ever write, and the only one that cannot
go out of date — because the program stops working if you change it and forget.

Compare:

    a = 5000
    b = 1200
    c = a - b

with:

    fees = 5000
    paid = 1200
    balance = fees - paid

Both run identically. Only one can be read six months later, or by the person marking it.

**The rules Python enforces.** A name may use letters, digits and underscores; it may not start
with a digit; and it is case-sensitive, so \`total\` and \`Total\` are two different names. A
handful of words are reserved — \`if\`, \`for\`, \`class\`, \`return\` and others — and using one
raises a SyntaxError.

**The conventions Python does not enforce**, but every Python programmer follows:
\`lower_case_with_underscores\` for variables, and a name that says what the value IS rather than
how it is stored. \`student_count\` beats \`num\`, and \`n\` is fine only where the scope is two
lines long.

**Do not name a variable after a built-in.** This is legal and quietly destructive:

    str = "Result"
    print(str(total))    # TypeError: 'str' object is not callable

The name \`str\` no longer means the built-in function, for the rest of the program. The same trap
waits with \`list\`, \`sum\`, \`input\`, \`len\`, \`max\` and \`type\`. The fix is always to rename
your variable, never to work around the symptom.

**Spelling is load-bearing.** \`balanse = balance - paid\` creates a second variable and reports
nothing, because creating a name is exactly what you asked for. Consistent, deliberate names make
this class of bug visible: a name you can pronounce is a name you will spell the same way twice.

**Rename fearlessly.** A name that was right when you wrote the line is often wrong by the time
the program works, and an editor renames every occurrence in one action.`,
    mcqs: [
      mcq('Which of these is NOT a valid Python variable name?',
        [['`2nd_total`', true],
          ['`total_2`', false],
          ['`_total`', false],
          ['`Total`', false]],
        'A name may contain digits but may not begin with one. The other three are all legal, though Total breaks the usual convention.'),
      mcq('A program runs `str = "Result"` near the top. Later, `print(str(total))` raises `TypeError: \'str\' object is not callable`. Why?',
        [['str now names a string, hiding the built-in function', true],
          ['total is already text and cannot be converted again', false],
          ['str() cannot be used inside print()', false],
          ['The assignment should have used a double equals', false]],
        'Assigning to a built-in name replaces it for the rest of the program. Renaming the variable restores str().'),
      mcq('Why is `balance = fees - paid` better than `c = a - b` if both run identically?',
        [['The names state what the values mean, so the line can be read later', true],
          ['Longer names make the program run more accurately', false],
          ['Python optimises descriptive names more effectively', false],
          ['Single letters are not permitted outside short programs', false]],
        'Both are equally correct to Python. The difference is entirely for the humans who read it, including you next month.'),
      mcq('Which name best follows Python convention for a count of enrolled students?',
        [['`student_count`', true],
          ['`StudentCount`', false],
          ['`nStudents`', false],
          ['`sc`', false]],
        'Variables use lower_case_with_underscores. StudentCount and nStudents are conventions carried over from other languages, and sc says nothing at all.'),
    ],
    checkpoint: [
      mcq('Which pair are two DIFFERENT variables?',
        [['`total` and `Total`', true],
          ['`total` and `total `', false],
          ['`total_1` and `total_1`', false],
          ['`_total` and `_total`', false]],
        'Names are case-sensitive, so a capital makes a separate variable — a common cause of a NameError that looks impossible.', PF),
      mcq('What is the safest fix for a program that assigns `list = [1, 2, 3]` and later fails on `list("abc")`?',
        [['Rename the variable, for example to numbers', true],
          ['Delete the variable with del before calling list()', false],
          ['Call the built-in as builtins.list instead', false],
          ['Reassign list back to its original meaning afterwards', false]],
        'The variable shadowed the built-in. Renaming removes the conflict outright; the others work around a problem that need not exist.', PF),
      mcq('`balance = 500` then `balanse = balance - 200` then `print(balance)` prints 500. What does this show about names?',
        [['Assigning to a new name is legal, so a misspelling is silent', true],
          ['Python matches names that are spelt nearly alike', false],
          ['A variable cannot be used on both sides of an assignment', false],
          ['The subtraction failed because the result was not used', false]],
        'Only READING an unassigned name raises NameError. Creating one by misspelling is exactly what the language was asked to do.', PF),
    ],
  },
  {
    unitCode: 'T_VARIABLES_DEBUGGING',
    notes: `Variable bugs come in two kinds: the ones Python stops for, with a message that nearly
names the cause, and the ones it runs straight through, printing an answer that looks reasonable
and is wrong. The method is the same for both — find out what the variable actually holds, not
what you believe it holds.

**Step 1 — read the last line of the traceback first.** It names the exception and the value
involved. The line above it shows where it happened.

**Step 2 — print the value together with its type.**

    print(type(age), repr(age))

\`repr\` puts quotes around text, so \`'25'\` and \`25\` stop looking identical. Most variable
bugs end at this line.

**The faults, symptom first:**

**\`NameError: name 'totl' is not defined\`** — the name was never assigned. Check spelling, then
capitals (\`Total\` and \`total\` are different names), then whether the assignment is below the
line that reads it. Recent Python versions add \`Did you mean: 'total'?\`, which is worth reading.

**\`TypeError: can only concatenate str (not "int") to str\`** — text joined to a number with
\`+\`. Write \`f"Age: {age}"\`, which accepts any type, or convert with \`str(age)\`.

**\`TypeError: '>' not supported between instances of 'str' and 'int'\`** — a value from
\`input()\` compared with a number. \`input()\` always returns text, even when digits were typed.
Convert once, on the line that reads it: \`age = int(input("Age: "))\`.

**\`ValueError: invalid literal for int() with base 10: '72.5'\`** — the conversion itself failed.
\`int()\` accepts \`"72"\` and \`" 72 "\` but not \`"72.5"\`, \`"seventy"\` or the empty string from
somebody pressing Enter. If the value can have a fraction, \`float()\` was the right choice.

**\`TypeError: 'str' object is not callable\`** — earlier the program ran \`str = "Result"\`, so
the name no longer means the built-in function. The same happens with \`sum\`, \`input\`, \`len\`
and \`max\`. Rename the variable.

**No error, wrong answer.** Inputs of 10 and 20 print \`1020\`: both were strings, and \`+\`
joined them.

**Worked diagnosis.** A fees program prints \`Balance: 5000\` whatever is paid.

    fees = 5000
    paid = int(input("Paid: "))
    balance = fees
    balanse = balance - paid
    print("Balance:", balance)

\`print(type(paid), repr(paid))\` shows an int, so the input is fine. The subtraction runs — and
stores its result under the misspelt \`balanse\`, a brand-new variable. \`balance\` never changes.
A misspelling on the reading side raises \`NameError\`; on the assigning side it raises nothing.`,
    coding: [
      {
        title: 'Fix the bill splitter, one traceback at a time',
        description: `This program splits a restaurant bill evenly. It reads three lines: a name, the bill amount (which may have paise, such as \`999.90\`) and the number of people. It should print one line: the name, the word \`pays\`, and the share to two decimal places.

For the input \`Asha\`, \`1000\` and \`4\` the output is \`Asha pays 250.00\`.

As written it fails with three different errors, one after another. Fix each by reading the last line of its traceback and printing the variable's type and value. Do not rewrite the program from scratch.`,
        starter: `name = input()
bill = input()
people = input()

share = bill / people
message = name + " pays " + share
print(mesage)
`,
        language: 'python',
        tests: [
          { input: 'Asha\n1000\n4', expectedOutput: 'Asha pays 250.00' },
          { input: 'Ravi\n999.90\n3', expectedOutput: 'Ravi pays 333.30' },
          { input: 'Meera\n100\n3', expectedOutput: 'Meera pays 33.33', isHidden: true },
          { input: 'Kiran\n0\n5', expectedOutput: 'Kiran pays 0.00', isHidden: true },
        ],
      },
    ],
    mcqs: [
      mcq('`age = input("Age: ")` followed by `print(age >= 18)` stops with `TypeError: \'>=\' not supported between instances of \'str\' and \'int\'`. What is the cause?',
        [['input() returned text, and text cannot be compared with a number', true],
          ['18 must be written as 18.0 before it can be compared with age', false],
          ['The comparison needs brackets around it inside the print call', false],
          ['age is a reserved word in Python and cannot hold a typed value', false]],
        'Whatever is typed, input() hands back a str. Converting once, as in age = int(input("Age: ")), makes the comparison work.'),
      mcq('Two numbers are read with `a = input()` and `b = input()`. Typing 10 and 20 makes `print(a + b)` show `1020`. Why?',
        [['Both are strings, so + joined the text instead of adding', true],
          ['Python adds the digits one by one and prints them side by side', false],
          ['print() places its arguments next to each other with no space', false],
          ['The values were too small for addition to be carried out', false]],
        'For str, + means concatenation. Convert with int() when reading, and + means addition again.'),
      mcq('A program has `str = "Result"` near the top. Later, `print(str(total))` raises `TypeError: \'str\' object is not callable`. What is the cause?',
        [['str now names a string, hiding the built-in str function', true],
          ['total is already a string, so it cannot be converted again', false],
          ['str() only works on whole numbers, and total has a fraction', false],
          ['print() cannot take the result of another function call', false]],
        'Assigning to a built-in name replaces it for the rest of the program. Renaming the variable to label restores str().'),
      mcq('`mark = int(input())` crashes with `ValueError: invalid literal for int() with base 10: \'72.5\'`. What is the right fix?',
        [['Read it with float(), because a mark can have a fraction', true],
          ['Wrap the input in str() first so int() receives some text', false],
          ['Tell the user to type the mark again, but more carefully', false],
          ['Call int() twice, once for each half of the typed number', false]],
        'int() only accepts whole-number text. If 72.5 is a legitimate mark, the conversion was the wrong choice, not the input.'),
    ],
    checkpoint: [
      mcq('A program runs `balance = 500`, then `balanse = balance - 200`, then `print(balance)`. What is printed, and why?',
        [['500, because the misspelt name created a separate variable', true],
          ['300, because Python matches names that are spelt nearly alike', false],
          ['An error, because balanse was never declared before its use', false],
          ['200, because the last value assigned anywhere is the one printed', false]],
        'Assigning to a new name is always legal, so a misspelling on the left of = raises nothing. Only reading an unassigned name raises NameError.', PF),
      mcq('`score = 42` and `print("Score: " + score)` raises a TypeError. Which line prints `Score: 42` correctly?',
        [['`print(f"Score: {score}")`', true],
          ['`print("Score: " + int(score))`', false],
          ['`print("Score: " - score)`', false],
          ['`print("Score: {score}")`', false]],
        'The f prefix is what turns {score} into the value. Without it the braces are printed literally, and int() leaves the number a number.', PS),
      mcq('Somebody presses Enter without typing anything at `count = int(input("How many? "))`. What happens?',
        [['ValueError, because an empty string is not a whole number', true],
          ['count is set to 0, since nothing was typed at the prompt', false],
          ['The prompt waits until at least one digit has been typed', false],
          ['NameError, because count is never given any value at all', false]],
        'input() returns the empty string, and int() cannot convert it. The traceback shows the empty literal as two quotes with nothing between.', PB),
    ],
  },
  {
    unitCode: 'T_VARIABLES_COMPUTE_PRACTICE',
    notes: `No new ideas. Every problem here uses \`print\`, variables, numbers and strings — and
nothing else. There is no input yet: every value you need is already written in the program. That
keeps the attention on the two things this stage is really about, which are getting the arithmetic
right and printing the result exactly.

**The method, for every problem:**

1. **Work the answer out by hand first**, for the values in the file. Write the exact line you
   expect to see, spaces and all.
2. **Give each value a name** that says what it is: \`parcels\`, \`per_van\`, not \`a\` and \`b\`.
3. **Compute into a new name**, one step per line, so each step can be printed on its own if the
   answer is wrong.
4. **Build the output with an f-string**: \`f"Full vans: {full_vans}"\`. It accepts numbers and
   text alike and keeps the spacing visible in one place.
5. **Run it and compare character by character** with what you wrote down in step 1.

**The checklist before you run:**

- \`/\` always gives a float. When you want whole units, use \`//\`, and \`%\` for what is left over.
- Brackets say what you mean: \`(a + b) * c\` is not \`a + b * c\`.
- \`+\` joins text to text only. \`"Total: " + 360\` is a TypeError; the f-string is the fix.
- Positions count from zero. The last character of \`name\` is \`name[-1]\`, or
  \`name[len(name) - 1]\`.
- A name must be assigned on a line above the one that reads it.

**When the output is wrong**, print each intermediate name on its own line before changing anything.
The wrong step is almost always the first one whose printed value surprises you.`,
    mcqs: [
      mcq('`items = 23` and a box holds 5. Which line prints `4 boxes, 3 left over`?',
        [['`print(f"{items // 5} boxes, {items % 5} left over")`', true],
          ['`print(f"{items / 5} boxes, {items % 5} left over")`', false],
          ['`print(f"{items % 5} boxes, {items // 5} left over")`', false],
          ['`print(items // 5 + " boxes, " + items % 5 + " left over")`', false]],
        '// counts whole boxes and % gives the leftover. / gives 4.6, the swapped version prints 3 boxes, and + cannot join a number to text.'),
      mcq('After `count = 3`, then `count = count * 2`, then `count = count + 1`, what does `print(count)` show?',
        [['7', true], ['6', false], ['8', false], ['9', false]],
        'Each line uses the value the name holds at that moment: 3, then 6, then 7.'),
      mcq('`city = "Chennai"`. What does `print(city[0] + city[-1])` show?',
        [['Ci', true], ['Cn', false], ['Ch', false], ['ai', false]],
        'Position 0 is the first character and position -1 is the last, so the two joined are C and i.'),
      mcq('What does `print(2 + 3 * 4 ** 2)` show?',
        [['50', true], ['80', false], ['146', false], ['400', false]],
        'Power first (16), then multiplication (48), then addition (50). 80 and 400 come from adding first; 146 from squaring 12.'),
      mcq('`price = 120` and `qty = 3`. Which line prints `Total: 360`?',
        [['`print(f"Total: {price * qty}")`', true],
          ['`print("Total: " + price * qty)`', false],
          ['`print(f"Total: {price} * {qty}")`', false],
          ['`print("Total: {price * qty}")`', false]],
        'Inside the braces the expression is worked out. Without the f the braces print literally, + cannot join text and a number, and two separate braces print both values.'),
    ],
    coding: [
      {
        title: 'Print a delivery summary',
        description: `A warehouse sends parcels out in vans. The program already sets three values: how many parcels there are, how many fit in one van, and how far each van trip is in kilometres.

Print exactly three lines: how many vans can be completely filled, how many parcels are left over after filling them, and the total distance driven by the full vans.

For example, if there were 30 parcels, 10 per van and 18 km per trip, it would print:

    Full vans: 3
    Parcels left over: 0
    Distance for full vans: 54 km

Do not type the answers in — calculate them from the three names, so the program stays right when the values change.`,
        starter: `parcels = 47
per_van = 12
km_per_trip = 18

# calculate and print the three lines
`,
        language: 'python',
        tests: [
          { input: '', expectedOutput: 'Full vans: 3\nParcels left over: 11\nDistance for full vans: 54 km', isHidden: true },
        ],
      },
      {
        title: 'Print a name badge',
        description: `The program already sets a first name, a last name and a roll number. Print exactly three lines: the full name followed by the roll number in brackets, the initials each followed by a full stop, and the number of characters in the full name including the space.

For example, for Asha, Rao and 7 it would print:

    Asha Rao (Roll 7)
    Initials: A.R.
    Name length: 8

Build every line from the three names rather than typing the text in.`,
        starter: `first = "Priya"
last = "Sharma"
roll = 42

# build and print the three lines
`,
        language: 'python',
        tests: [
          { input: '', expectedOutput: 'Priya Sharma (Roll 42)\nInitials: P.S.\nName length: 12', isHidden: true },
        ],
      },
    ],
    checkpoint: [
      mcq('These lines run in order: `total = 250`, `total = total + 140`, `total = total + 60`, `print(total)`. What is shown?',
        [['450', true], ['390', false], ['310', false], ['200', false]],
        'Each assignment works out the right-hand side with the current value, then stores the result: 250, then 390, then 450.', PF),
      mcq('Which expression gives the number of complete weeks in 50 days?',
        [['50 // 7', true], ['50 / 7', false], ['50 % 7', false], ['7 // 50', false]],
        '// keeps only the whole number of sevens, which is 7. / gives a float with a fraction, and % gives the 1 day left over.', PB),
      mcq('`code = "CB2026"`. What does `print(len(code), code[2])` show?',
        [['6 2', true], ['6 B', false], ['5 2', false], ['6 0', false]],
        'There are six characters, and position 2 is the third one, because positions count from zero: C, B, then 2.', PS),
    ],
  },
  {
    unitCode: 'T_VARIABLES_PRACTICE',
    notes: `No new ideas. Every problem here uses printing, variables, numbers, strings and their
methods, booleans, types and input — the whole of this topic, and nothing from later ones.

**The method, for every problem:**

1. **Write down each input and its type before any code.** "A name (text), a price (can have
   paise, so float), a quantity (a whole number, so int)." The type decision is the one that
   causes the errors.
2. **Convert once, on the line that reads.** \`qty = int(input())\`, not a bare \`input()\`
   converted somewhere further down.
3. **Work out the expected output by hand for one input**, exactly, including spaces and decimal
   places.
4. **Build the output with an f-string.** It accepts any type and keeps the spacing visible in one
   place.
5. **Run it and compare character by character** with what you predicted.
6. **Then try the awkward inputs**: spaces around a name, a decimal where you expected a whole
   number, zero.

**The checklist before you submit:**

- Every value from \`input()\` that is used as a number has been converted.
- \`int()\` for counts, \`float()\` for anything that can have a fraction.
- \`/\` when a fraction is wanted; \`//\` and \`%\` when whole units and a remainder are.
- No variable is called \`sum\`, \`str\`, \`input\`, \`len\` or \`max\`.
- Every string method's result is kept: \`name = name.strip()\`.
- Names say what they hold: \`price_per_ticket\`, not \`p\` or \`x2\`.
- Decimal places come from the format, as in \`f"{amount:.2f}"\`, not from \`round()\`, which never
  adds trailing zeros.

**When the output is wrong but nothing crashed**, print the suspect as
\`print(type(v), repr(v))\` before changing anything. Guessing costs more time than that line.`,
    coding: [
      {
        title: 'Print a recharge receipt',
        description: `A mobile shop prints a receipt for a prepaid plan. Read three lines: the customer's name (typed in any case, possibly with spaces around it), the monthly price of the plan (it may have paise) and the number of months (a whole number).

Print exactly three lines, for example:

    Customer: Asha Rao
    Months: 3
    Total: Rs 597.00

The name is trimmed and in title case. The total is the price times the months, always shown with two decimal places.`,
        starter: `name = input()
price = input()
months = input()

# convert, calculate and print the three lines
`,
        language: 'python',
        tests: [
          { input: '  asha rao  \n199\n3', expectedOutput: 'Customer: Asha Rao\nMonths: 3\nTotal: Rs 597.00' },
          { input: 'meera\n249.5\n12', expectedOutput: 'Customer: Meera\nMonths: 12\nTotal: Rs 2994.00' },
          { input: 'RAVI KUMAR\n99.99\n2', expectedOutput: 'Customer: Ravi Kumar\nMonths: 2\nTotal: Rs 199.98', isHidden: true },
          { input: 'dev\n0\n6', expectedOutput: 'Customer: Dev\nMonths: 6\nTotal: Rs 0.00', isHidden: true },
        ],
      },
    ],
    mcqs: [
      mcq('A program reads a whole number of minutes, such as 135, and must print it as hours and minutes. Which pair of expressions gives 2 and 15?',
        [['`minutes // 60` and `minutes % 60`', true],
          ['`minutes / 60` and `minutes % 60`', false],
          ['`minutes % 60` and `minutes // 60`', false],
          ['`int(minutes / 100)` and `minutes - 100`', false]],
        '// keeps the whole hours and % keeps the leftover minutes. Plain / gives 2.25, which is neither.'),
      mcq('`city = "  Pune "`, then `city.strip()` on a line of its own, then `print(len(city))`. What is printed?',
        [['7, since strip() returned a new string that was not kept', true],
          ['4, since the spaces at both ends have now been removed', false],
          ['6, since only the spaces at the start were removed', false],
          ['An error, since len() cannot measure a stripped string', false]],
        'Strings never change in place. city = city.strip() is what keeps the trimmed result.'),
      mcq('`price = 49.5`. Which line prints exactly `Total: Rs 49.50`?',
        [['`print(f"Total: Rs {price:.2f}")`', true],
          ['`print("Total: Rs", round(price, 2))`', false],
          ['`print(f"Total: Rs {price:2}")`', false],
          ['`print("Total: Rs " + str(price))`', false]],
        'round() does not add trailing zeros, and :2 sets a minimum width rather than decimal places. Only .2f fixes how many places are shown.'),
      mcq('`word = "hyderabad"`. Which expression gives `"Hyderabad"`?',
        [['`word[0].upper() + word[1:]`', true],
          ['`word[0].upper() + word`', false],
          ['`word[1].upper() + word[2:]`', false],
          ['`word.upper()`', false]],
        'word[1:] is everything after the first character, so the capital replaces the first letter instead of being added in front of it.'),
      mcq('A form runs `height = input("Height in cm: ")` and must print the height in metres. Which line is correct for an input of 172?',
        [['`print(int(height) / 100)`', true],
          ['`print(height / 100)`', false],
          ['`print(int(height / 100))`', false],
          ['`print(int(height) // 100)`', false]],
        'Convert first, then divide with /. Dividing the text raises a TypeError, and // throws the 0.72 away.'),
    ],
    checkpoint: [
      mcq('After `x = 7`, `y = x` and `x = x + 1`, what does `print(y)` show?',
        [['7', true], ['8', false], ['x + 1', false], ['An error', false]],
        'y was given the value 7 at the moment of assignment. Giving x a new value afterwards leaves y alone.', PF),
      mcq('What does `print(7 / 2, 7 // 2, 7 % 2)` show?',
        [['3.5 3 1', true], ['3.5 3.5 1', false], ['3 3 1', false], ['3.5 4 1', false]],
        '/ always gives a float, // gives the whole number of times 2 fits, and % gives what is left over.', PB),
      mcq('`s = "banana"`. What does `print(s.count("a"), s.find("n"))` show?',
        [['3 2', true], ['3 1', false], ['2 2', false], ['3 3', false]],
        'There are three a characters, and the first n is at index 2, because indexing starts from 0.', PS),
    ],
  },
  {
    unitCode: 'T_VARIABLES_MINI_PROJECT',
    notes: `One small program, built end to end from nothing but the ideas in this topic: input,
variables, numbers, strings and output. No conditions and no loops. That limit is deliberate —
it keeps the attention on the part beginners get wrong most, which is what type each value is and
what happens when two types meet.

**Why this is a project and not another exercise.** An exercise names the variables and tells you
which conversion to use. Here you decide: which values are text and which are numbers, which
numbers can have a fraction, what each variable is called, and exactly how the output should
read. Those decisions, made together in one program, are where \`TypeError\` and \`ValueError\`
actually come from.

**How to work:**

1. **Write the sample run first** — what the person types and exactly what the program prints —
   before any code.
2. **List every variable with its type and the reason.** "\`distance_km\`, float, because trips
   are not whole kilometres."
3. **Build in slices.** Read the inputs and print them straight back with their types. Then
   calculate one value and print it. Run after every few lines, so a new error can only be in
   what you just wrote.
4. **Keep a bug log as you go**: the last line of each traceback, the cause and the fix, written
   while it is fresh.
5. **Attack your own program.** Type a decimal where a whole number belongs, a word where a
   number belongs, spaces around the trip name. Some of what happens you cannot fix yet; saying
   accurately why it happens is part of the work.

**What good looks like.** Every input converted once, on the line that reads it. Names that make
the calculation readable without comments. Output that matches the specification to the
character. And a write-up that explains why each value has the type it has, rather than
narrating what the code does.

The brief, requirements and rubric are in the assignment attached to this unit.`,
    assignment: {
      title: 'Mini Project — The Trip Cost Splitter',
      description: 'Write a Python program that reads the details of a shared car trip, calculates the petrol cost, the total and each person\'s share, and prints a precisely formatted summary. Assessed on type decisions, exact output, testing and a bug log.',
      instructions: `**The scenario**

A group of friends is driving from Bengaluru to Mysuru and back, and wants to split the cost
fairly. Write \`trip.py\`, which asks for the details and prints a summary.

**Input, in this order**, each on its own line with a short prompt:

1. The trip name, such as \`  mysuru weekend \` — any case, possibly with spaces around it.
2. The number of people sharing the cost — a whole number.
3. The total distance in kilometres — may have a fraction, such as \`296.4\`.
4. The car's mileage in kilometres per litre — may have a fraction.
5. The petrol price in rupees per litre — may have paise.
6. The total toll paid in rupees — a whole number.

**Output**, after the prompts, in exactly this shape. These numbers are for the input
\`mysuru weekend\`, 4 people, 296.4 km, 18.5 km per litre, Rs 102.86 per litre and Rs 330 of toll:

    Trip: Mysuru Weekend (MYS-4)
    Petrol used: 16.02 litres
    Petrol cost: Rs 1647.98
    Toll: Rs 330
    Total: Rs 1977.98
    Each person pays: Rs 494.50

**Requirements**

1. Convert each input once, on the line that reads it, choosing \`int()\` or \`float()\` as the
   list above implies.
2. Petrol used is distance divided by mileage. Petrol cost is petrol used times the price. Total
   is petrol cost plus toll. Each share is the total divided by the number of people.
3. Calculate with unrounded values; round only when displaying. Litres and every rupee amount
   except the toll are shown to two decimal places.
4. The trip name is trimmed and in title case. The trip code in brackets is the first three
   characters of the trimmed name in upper case, a hyphen, and the number of people.
5. Build every output line with an f-string.
6. Use no conditions, loops or lists, and do not reuse a built-in name such as \`sum\`, \`str\`
   or \`input\` as a variable.
7. Name every variable for what it holds, with its unit where it has one, such as
   \`distance_km\` and \`price_per_litre\`.

**Testing you must do and record**

- The example input above, showing that your output matches line for line.
- Two runs with values of your own, writing the expected output by hand or with a calculator
  BEFORE running, then recording the actual output beside it.
- A run with a single person, and a run with a whole-number distance such as \`300\`.
- Three attack runs: letters typed for the number of people; \`4.5\` typed for the number of
  people; Enter pressed with nothing typed for the toll. Record the last line of each traceback
  and explain in one sentence why it happened. You are not expected to handle these yet —
  conditions and error handling come later — but your explanations must be correct.

**What to submit**

1. \`trip.py\`.
2. A test record: for every run, the input, your predicted output and the actual output.
3. A bug log of at least three errors you really met while building it: the last line of the
   traceback, the cause and the fix.
4. A write-up of 200-300 words: the type you chose for each of the six inputs and why; why
   \`input()\` needs converting at all; why rounding happens only when printing; and what the
   attack runs showed.`,
      rubric: [
        { criterion: 'Correct output', description: 'Matches the specified six-line format exactly on the example and on the learner\'s own runs, including the trip code, title-cased name and two decimal places.', maxPoints: 25 },
        { criterion: 'Types and conversion', description: 'Each input converted once, on the line that reads it, with the right choice of int or float; no arithmetic on text; unrounded values used in every calculation.', maxPoints: 25 },
        { criterion: 'Naming and readability', description: 'Names carry meaning and units, every output line uses an f-string, no built-in names are reused, and the calculation reads clearly without comments.', maxPoints: 15 },
        { criterion: 'Testing and bug log', description: 'Predictions recorded before running, every required run present with real output, and at least three genuine bugs logged with traceback, cause and fix.', maxPoints: 20 },
        { criterion: 'Write-up', description: 'Justifies each type choice, explains that input() returns text, explains why rounding waits for display, and explains each attack run accurately.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
  },
  {
    unitCode: 'T_GIT_MINI_PROJECT',
    notes: `Build a small project inside a Git repository over several sittings, then hand it to
somebody who has never seen it. What is assessed is not the code in the repository but the
repository itself: whether its history tells the story of the work, whether its branches existed
for reasons, and whether a stranger can clone it and get going from the README alone.

**Why this has to be a project.** Every Git unit so far fits in one sitting, on a practice
repository you could delete afterwards. Git's value only shows over time — a week later, when you
need to know why a line changed, or when a half-finished idea has to wait on a branch while you
fix something urgent on \`main\`. Nobody can simulate that in forty minutes, so this unit asks you
to live with a history long enough to need it.

**How to work:**

1. **Pick something small that you will genuinely change several times** — a program from the
   programming topics, a one-page website, a set of solved exercises with a script that runs
   them. The content matters less than having real reasons to change it.
2. **Commit when a piece of work is finished, not when you stop for the day.** Each commit should
   be one change you can describe in a sentence.
3. **Branch when there is a reason to keep work apart**: an experiment that might be abandoned, a
   feature that takes more than one sitting, a fix needed while something else is half done.
   Note the reason when you create the branch; you will be asked for it.
4. **Push at the end of every sitting**, so the remote is the copy that counts.
5. **Start each sitting by reading \`git log --oneline --graph\`.** If it does not remind you where
   you were, your messages are not doing their job yet, and this is the cheapest moment to notice.

**What good looks like.** A log a reviewer can read top to bottom; no commit called \`update\` or
\`final\`; branches that were merged and then deleted; a \`.gitignore\` that kept generated files
and secrets out from the start; and a README that survived a real stranger trying to follow it.

The brief, requirements and rubric are in the assignment attached to this unit.`,
    assignment: {
      title: 'Mini Project — A Repository Somebody Else Can Follow',
      description: 'Develop a small project in Git across at least three sittings on different days, with meaningful commits, purposeful branches, a resolved conflict and a published revert, then prove the README works by handing the repository to a stranger.',
      instructions: `**The brief**

Create a repository on GitHub, public or shared with your mentor, for a small project of your
choice, and develop it with Git across **at least three separate sittings on different days**.
At the end, somebody who has never seen it must be able to clone it and use it by following the
README alone.

Choose something you will genuinely change several times: a Python program from the programming
topics, extended by one feature per sitting; a small static website; or a collection of solved
exercises with a script that runs them all.

**Requirements**

1. **History.** At least 12 commits spread across the three sittings. Each commit is one coherent
   change, and each message follows the convention from the commit-messages unit: a short
   imperative summary that says why, with a body where the change is not obvious. No message may
   be a bare \`update\`, \`fix\`, \`changes\` or anything similar.
2. **A clean start.** A \`.gitignore\` in the first or second commit that excludes whatever is
   generated or private in your project, for example \`__pycache__/\`, \`.venv/\`, \`.env\` and
   editor folders. No such file may appear in any commit.
3. **Branches with reasons.** At least three branches besides \`main\`, each named for its purpose
   (such as \`feature/export-csv\` or \`fix/empty-input\`). Each is merged into \`main\` and then
   deleted. At least one merge must be a genuine three-way merge with a merge commit, because
   \`main\` moved on while that branch was open.
4. **One real conflict.** At least one merge produces a conflict, and you resolve it by deciding
   what the file should say, not by keeping one side unread. No conflict markers may remain
   anywhere.
5. **One published undo.** Push a commit to \`main\`, then undo it with \`git revert\` rather than
   by rewriting history, with a message explaining why it was reverted.
6. **A README that works.** It says what the project is, what must be installed to run it, the
   exact commands from a fresh clone to a running result, and how somebody could contribute a
   change: branch naming, commit message style, and how to open a pull request.
7. **The stranger test.** A classmate who has not seen the project clones it and follows the
   README without your help, writing down every point where they got stuck or had to guess. You
   then fix the README, and anything else they found, in commits whose messages say what was
   found.

**Evidence to collect as you go**

- The output of \`git log --oneline --graph --all\` at the end of the project.
- For each branch: its name, why it existed, and the hash of the commit that merged it.
- For the conflict: the conflicted section as Git showed it, what you decided the file should say,
  and why.
- The stranger's notes, unedited, and the hashes of the commits that responded to them.

**What to submit**

1. The repository URL.
2. A report of 300-400 words containing the evidence above, plus one example of reading your own
   history helping you in a later sitting, and one of your commit messages you would now write
   differently, with the rewrite.

**Constraints**

- Never force-push to \`main\`.
- No generated or secret file in any commit, including one deleted later: deleting a file in a
  later commit does not remove it from the history.`,
      rubric: [
        { criterion: 'History and messages', description: 'At least twelve coherent commits across three sittings on different days; messages are imperative, explain why, and none is a bare update or fix.', maxPoints: 25 },
        { criterion: 'Branching, merging and the conflict', description: 'Three purposeful, well-named branches merged and deleted; at least one genuine three-way merge; a conflict resolved by a reasoned decision with no markers left.', maxPoints: 25 },
        { criterion: 'Clean start and published undo', description: '.gitignore present from the first or second commit with nothing generated or secret anywhere in history; a pushed commit undone with git revert and an explanatory message; no force-push.', maxPoints: 15 },
        { criterion: 'README and stranger test', description: 'README covers purpose, requirements, exact run commands and how to contribute; a real stranger\'s unedited notes are included and each point was fixed in a traceable commit.', maxPoints: 25 },
        { criterion: 'Report and reflection', description: 'Evidence complete and accurate; the example of history helping is concrete; the rewritten commit message is a genuine improvement.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
  },
];
