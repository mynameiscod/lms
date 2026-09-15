/**
 * T_VARIABLES (debugging, practice, mini project) and T_GIT_MINI_PROJECT.
 *
 * ── WHY THESE FOUR, TOGETHER ──────────────────────────────────────────────────────────────
 *
 * Both topics are UNIVERSAL and both had instruction without an ending. T_VARIABLES is the first
 * programming topic every learner meets, and its concept units were never followed by the three
 * application units the design calls for — so the very first programming a beginner does had
 * nothing to debug, nothing to practise against and nothing to build. T_GIT had ten units of
 * commands and practice and nothing that asked a learner to live with a history for longer than
 * one sitting, which is the only way Git's value becomes visible.
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
