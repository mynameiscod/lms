/**
 * Career-track content: getting started with Python (JT_PY_START).
 *
 * The Python tracks teach the language from the first program, the way Core Java and Core C# do.
 * A student here may never have written Python, so nothing assumes an earlier year. Python is
 * examined the way it is written: a short script and "what does this print, or what does it
 * raise?". So nearly every question is about one specific snippet. The notes teach Python 3.10+;
 * the graded exercise is plain 3.10 code, because the runner is Python 3.10.
 *
 * Virtual environments and pip get one sentence here; a later topic covers them properly.
 *
 * Attribution: the topic is multi-skill (PYTHON_BASICS, IDE_PROFICIENCY). Every checkpoint
 * question names the one skill it measures, taken from its own unit's skillKeys (concept units)
 * or from the topic's list (debugging, practice, interview and checkpoint units). Practice mcqs
 * name none.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_PY_START_BUNDLES: PilotBundle[] = [
  /* ══ JT_PY_START — Getting Started with Python ══════════════════════════════════════════ */
  {
    unitCode: 'JT_PY_START_INSTALL',
    notes: `Python source code is run by a program called the **interpreter**. Installing Python
means installing that program, plus the standard library that comes with it.

## What actually gets installed

- **The interpreter** — on most machines this is **CPython**, the reference implementation,
  written in C. When people say "Python 3.12" they mean CPython 3.12.
- **The standard library** — hundreds of modules (\`math\`, \`random\`, \`json\`, \`datetime\`,
  \`os\` …) you can \`import\` without downloading anything.
- **pip**, the package installer, and **venv**, for project-private environments. You will
  meet both in a later topic; for now you only need the interpreter.

Use **Python 3.10 or newer**. Python 2 has been dead since 2020; if a tutorial writes
\`print "hi"\` without parentheses, it is Python 2 and you should close it.

## Installing, per operating system

**Windows.** Download the installer from python.org. On the first screen tick
**"Add python.exe to PATH"** before clicking Install. The installer also adds the **py
launcher**, a small program that finds every Python you have installed:

    > py --version
    Python 3.12.4
    > py -3.11 --version        (pick a specific installed version)
    Python 3.11.9
    > python --version
    Python 3.12.4

**macOS.** Install from python.org or with Homebrew (\`brew install python\`). The command is
**python3**; plain \`python\` may not exist at all.

**Linux.** Python 3 is usually preinstalled as **python3** (\`sudo apt install python3\` on
Ubuntu if not). Do not remove or replace the system Python — the operating system's own tools
depend on it.

So the same instruction is written three ways: \`py hello.py\` (Windows), \`python hello.py\`
(Windows, if PATH was ticked) and \`python3 hello.py\` (macOS and Linux).

## "python is not recognized"

    'python' is not recognized as an internal or external command,
    operable program or batch file.

The shell looked through every folder on your **PATH** and found no \`python.exe\`. Either
Python is not installed, or the PATH box was not ticked. Fixes: run the installer again, choose
*Modify*, and tick "Add Python to environment variables"; or use \`py\`, which works without
PATH. Then **open a new terminal** — a terminal reads PATH only when it starts.

A second Windows trap: typing \`python\` opens the **Microsoft Store**. That is an "app execution
alias" pretending to be Python. Turn it off in *Settings → Apps → Advanced app settings → App
execution aliases*, or install Python properly.

To see which Python a command runs:

    > where python          (Windows)
    $ which python3         (macOS / Linux)

## The interactive interpreter (the REPL)

Run \`python\` (or \`py\`, or \`python3\`) with no file name:

    >>> 7 / 2
    3.5
    >>> 7 // 2
    3
    >>> 2 ** 100
    1267650600228229401496703205376
    >>> 'ab' * 3
    'ababab'
    >>> exit()

The \`>>>\` prompt **R**eads an expression, **E**valuates it, **P**rints the result and
**L**oops. Notes:

- The REPL echoes the *representation* of a value — that is why \`'ababab'\` shows its quotes.
  \`print('ab' * 3)\` would show \`ababab\` without them. In a script nothing is echoed; only
  \`print\` produces output.
- \`/\` always gives a float; \`//\` divides and rounds down.
- Python integers never overflow: \`2 ** 100\` is exact.
- \`_\` holds the last result the REPL printed.
- Leave with \`exit()\`, or Ctrl+Z then Enter on Windows, Ctrl+D on macOS and Linux.

The REPL is the fastest way to answer "what does this do?" — keep one open while you learn.

## Interview traps

- "Is Python compiled or interpreted?" — CPython compiles your source to **bytecode** first,
  then its virtual machine runs the bytecode. "Interpreted" is the short answer; "compiled to
  bytecode, then interpreted" is the accurate one.
- "Python" is the language; CPython, PyPy and others are implementations of it.`,
    workedExample: `**Problem.** A classmate on Windows installed Python, but \`python --version\` says "not
recognized", and \`py --version\` prints \`Python 3.12.4\`. Diagnose it.

1. \`py\` works, so Python **is** installed — the py launcher found it.
2. \`python\` fails, so the folder holding \`python.exe\` is not on PATH. The "Add python.exe to
   PATH" box was left unticked.
3. Run \`py -c "import sys; print(sys.executable)"\`. It prints
   \`C:\\Users\\asha\\AppData\\Local\\Programs\\Python\\Python312\\python.exe\` — the exact location.
4. Re-run the installer, choose *Modify → Next*, tick "Add Python to environment variables",
   finish, and **open a new terminal**. \`python --version\` now prints \`Python 3.12.4\`.

The reasoning: "not recognized" is never about your code; it is the shell failing to find the
program. Find where Python lives, then make PATH point there — or simply use \`py\`.`,
    mcqs: [
      mcq('At the >>> prompt you type 9 / 3. What does the interpreter show?',
        [['3.0', true], ['3', false], ['3.00', false], ["'3'", false]],
        'The / operator always produces a float in Python 3, even when the division is exact. Use // when you want a whole-number result.'),
      mcq('On a fresh macOS machine, "python hello.py" says command not found, but "python3 hello.py" runs. Why?',
        [['macOS installs the interpreter under the name python3', true], ['The file needs a .py3 extension to run on macOS', false], ['python is the Python 2 command and was removed', false], ['macOS can only run scripts that are on the Desktop', false]],
        'On macOS and most Linux systems the Python 3 command is python3; a plain python command may not exist. Nothing about the script is wrong.'),
      mcq("In the REPL, 'go' * 2 echoes 'gogo' with quotes, but print('go' * 2) shows gogo. Why the difference?",
        [['The REPL echoes a value\'s repr; print shows its text', true], ['print removes every quote character from a string', false], ['The REPL has not finished evaluating the expression', false], ['Strings typed into the REPL are stored differently', false]],
        'The REPL displays the representation of a result, which for a string includes quotes. print writes the string\'s characters only — and a script echoes nothing at all.'),
    ],
    checkpoint: [
      ck('PYTHON_BASICS', 'A Windows terminal says "\'python\' is not recognized as an internal or external command". What is the cause?',
        [['No folder on PATH contains python.exe', true], ['The script has a syntax error on line 1', false], ['Python 3 cannot run inside cmd.exe at all', false], ['The file was saved with the wrong encoding', false]],
        'The shell searches the PATH folders for a program named python and found none. Python is missing or its folder was never added to PATH; the script is never even read.'),
      ck('PYTHON_BASICS', 'What does the REPL show for 10 // 4 followed, on the next prompt, by 10 / 4?',
        [['2 and then 2.5', true], ['2.5 and then 2.5', false], ['2 and then 2', false], ['3 and then 2.5', false]],
        '// is floor division, so 10 // 4 is 2. / is true division and always returns a float, so 10 / 4 is 2.5.'),
      ck('PYTHON_BASICS', 'Which statement about CPython running your .py file is accurate?',
        [['It compiles the source to bytecode, then runs that', true], ['It compiles the file into a native .exe each time', false], ['It reads one line of text and executes it, no compiling', false], ['It needs a separate compile step before you run it', false]],
        'CPython first compiles the whole file to bytecode (a syntax error anywhere stops it before line 1 runs), then its virtual machine executes the bytecode. No .exe is produced.'),
    ],
  },
  {
    unitCode: 'JT_PY_START_FIRST_PROGRAM',
    notes: `A Python program is a text file ending in **.py**. There is no \`main\` method, no class,
no compile command: the interpreter runs the file from the first line to the last.

## The smallest program

Create **hello.py**:

    # hello.py — my first script
    print("Hello, CareerPilot")

Run it from a terminal in the same folder:

    > python hello.py         (py hello.py on Windows, python3 hello.py on macOS/Linux)
    Hello, CareerPilot

If the terminal says \`can't open file '...hello.py': [Errno 2] No such file or directory\`, the
terminal is in a different folder. \`cd\` to the folder that holds the file (\`dir\` on Windows,
\`ls\` elsewhere, shows what is there).

## Top to bottom

    print("one")
    total = 2 + 3
    print("two", total)

prints \`one\` and then \`two 5\`. Each statement runs once, in order. A name must be assigned
**before** the line that uses it runs — if line 1 printed \`total\`, Python would stop with a
\`NameError\`, because line 2 has not happened yet.

## print

\`print\` writes its arguments separated by a space and ends with a newline:

    print("Marks:", 85)        # Marks: 85
    print("Marks: " + "85")    # Marks: 85
    print()                    # an empty line

\`"Marks: " + 85\` is an error — \`+\` joins two strings, but will not join a string and a number.
Passing them as separate arguments, or using an f-string (next units), avoids that.

## Indentation is syntax

Other languages use braces to group statements; Python uses **indentation**:

    marks = 72
    if marks >= 40:
        print("Pass")
        print("Well done")
    print("Done")

The two indented lines belong to the \`if\`; \`print("Done")\` does not. The convention is
**4 spaces** per level. Indentation that does not line up is an error, not a style problem:

    IndentationError: expected an indented block after 'if' statement on line 2
    IndentationError: unexpected indent
    IndentationError: unindent does not match any outer indentation level

Never mix tabs and spaces. Editors insert 4 spaces when you press Tab in a .py file; keep it
that way.

## Comments and docstrings

    # A comment runs from # to the end of the line. Python ignores it.
    price = 120   # comments can follow code too

    """A string on its own line is not a comment, but it is often used like one.
    At the top of a file or function it is a docstring."""

## Reading a traceback — from the bottom up

    Traceback (most recent call last):
      File "C:\\work\\bill.py", line 3, in <module>
        print("Total: " + total)
    TypeError: can only concatenate str (not "int") to str

- **The last line** is the error type and message: what went wrong.
- **The line above it** shows the source line, and the \`File ..., line 3\` line says where.
- \`<module>\` means "the top level of the file", not inside any function.
- With functions, there is one \`File\` entry per call; the deepest call is at the **bottom**.

Read the last line first, then go to the line number it names. A \`SyntaxError\` is different: it
is found while compiling, so **no line of the file runs** — not even the \`print\` on line 1.

## The errors you will meet first

    print("hi"                       SyntaxError: '(' was never closed
    print "hi"                       SyntaxError: Missing parentheses in call to 'print'
    print(totl)                      NameError: name 'totl' is not defined. Did you mean: 'total'?
    "Age: " + 21                     TypeError: can only concatenate str (not "int") to str

Names are case-sensitive: \`Total\` and \`total\` are different names.

## if __name__ == "__main__"

You will see this at the bottom of many scripts:

    def main():
        print("Running")

    if __name__ == "__main__":
        main()

When you run the file directly, \`__name__\` is \`"__main__"\` and \`main()\` is called. When another
file \`import\`s it, \`__name__\` is the module's name, so the code inside the \`if\` does not run.
It lets one file be both a script and a module.`,
    workedExample: `**Problem.** This script, \`bill.py\`, crashes. Find and fix the cause.

    item = "Notebook"
    qty = 3
    print("Item: " + item)
    print("Qty: " + qty)

Output:

    Item: Notebook
    Traceback (most recent call last):
      File "bill.py", line 4, in <module>
        print("Qty: " + qty)
    TypeError: can only concatenate str (not "int") to str

1. Line 3 ran — its output is there — so the file has no syntax error.
2. The last line says \`TypeError\`: \`+\` was given a \`str\` and an \`int\`.
3. The line above names line 4: \`"Qty: " + qty\`, where \`qty\` is the int \`3\`.
4. Fix it by letting \`print\` do the joining, \`print("Qty:", qty)\`, or by converting,
   \`print("Qty: " + str(qty))\`. Both print \`Qty: 3\`.

The reasoning: the bottom line says *what*, the line above says *where*; you change one thing
and run again.`,
    mcqs: [
      mcq('A script has a missing closing bracket on line 9 and print("start") on line 1. What happens when you run it?',
        [['Nothing prints; a SyntaxError is reported first', true], ['start prints, then a SyntaxError for line 9', false], ['start prints and line 9 is skipped quietly', false], ['Python closes the bracket for you and runs', false]],
        'The whole file is compiled before any of it runs. A syntax error anywhere stops compilation, so even line 1 never executes.'),
      mcq('What does this print?\n\n    city = "Pune"\n    if len(city) > 3:\n        print("long")\n    print("checked")',
        [['long, then checked on the next line', true], ['only long', false], ['only checked', false], ['an IndentationError for line 4', false]],
        'len("Pune") is 4, so the indented print runs. print("checked") is not indented under the if, so it runs either way.'),
      mcq('A traceback lists three File lines and ends with "ZeroDivisionError: division by zero". Which File line is where the error happened?',
        [['The last File line, just above the error message', true], ['The first File line, at the top of the traceback', false], ['The middle File line, between the two calls', false], ['None of them; you must search the file yourself', false]],
        'Tracebacks list calls from the outermost (top) to the innermost (bottom). The bottom File entry is the line that actually raised the error.'),
    ],
    checkpoint: [
      ck('PYTHON_BASICS', 'What happens when this runs?\n\n    print(greeting)\n    greeting = "Namaste"',
        [['NameError, because line 2 has not run yet', true], ['It prints Namaste, since the file is read first', false], ['It prints None, the default for a new name', false], ['It prints an empty line and then carries on', false]],
        'Statements run top to bottom. When line 1 runs, greeting has never been assigned, so Python raises NameError: name \'greeting\' is not defined.'),
      ck('PYTHON_BASICS', 'Which error does this produce?\n\n    score = 50\n    if score > 40:\n    print("pass")',
        [['IndentationError: expected an indented block', true], ['SyntaxError: missing colon after the if test', false], ['NameError: name \'print\' is not defined', false], ['No error; it prints pass because score is 50', false]],
        'The body of an if must be indented. Here print sits at the same level as the if, so Python reports that it expected an indented block after the if statement.'),
      ck('PYTHON_BASICS', 'File tools.py ends with "if __name__ == \'__main__\': main()". Another file runs "import tools". Is main() called?',
        [['No — __name__ is "tools" when it is imported', true], ['Yes — importing a file always runs main()', false], ['Yes — but only the first time it is imported', false], ['No — import fails because of the if statement', false]],
        'An imported module gets its own name in __name__, so the test is false and main() is skipped. Only running the file directly sets __name__ to "__main__".'),
    ],
  },
  {
    unitCode: 'JT_PY_START_VSCODE',
    notes: `You can write Python in any editor, but you will work faster with one that runs, checks
and debugs the code for you. **VS Code** with Microsoft's Python extension is the most common
choice; PyCharm works the same way with different keys.

## Setting it up

1. Install VS Code, open it, go to **Extensions** (Ctrl+Shift+X) and install **Python** by
   Microsoft. It brings **Pylance** (completion, error squiggles, go-to-definition) and the
   **Python Debugger**.
2. **File → Open Folder** and open the folder your project lives in. VS Code works on folders;
   opening a lone file gives you less (no saved settings, no debug configuration).
3. Create \`hello.py\` and save it — the \`.py\` extension is what switches the Python features on.

## Choosing the interpreter — the setting that causes most confusion

You may have several Pythons: 3.11 from python.org, 3.12 from the Store, one inside a project
environment. VS Code runs and checks your code with **one** of them, shown in the status bar at
the bottom right (for example \`3.12.4 64-bit\`).

To change it: **Ctrl+Shift+P → "Python: Select Interpreter"** and pick from the list.

Why it matters: if the terminal's \`python\` and VS Code's interpreter are different installs, a
library you installed in one is missing in the other, and you get

    ModuleNotFoundError: No module named 'requests'

even though "it is installed". The first check is always: *which interpreter is selected?*
Running \`import sys; print(sys.executable)\` prints the full path of the Python running your code.

## Running a file

- The **▷ Run Python File** button at the top right runs the open file in the integrated terminal
  (Ctrl+\` opens it). It is the same as typing \`python hello.py\` there, with the selected
  interpreter.
- Programs that call \`input()\` wait in that terminal — click into it and type.
- **Shift+Enter** on a selection sends just those lines to a REPL — handy for testing one line.

## Errors before you run

Pylance underlines problems as you type: a red squiggle for a syntax error, a yellow one for a
name it cannot find (\`"totl" is not defined\`). Hover to read the message; it is the same
message the interpreter would give, only earlier. The **Problems** panel (Ctrl+Shift+M) lists
them all.

## Debugging with breakpoints

Printing values works, but the debugger lets you stop the program and look at everything.

1. Click in the margin left of a line number — a red dot is a **breakpoint**. (F9 toggles one
   on the current line.)
2. Press **F5** and choose **Python File**. The program runs and **stops before** the
   breakpoint line runs.
3. Look at the **Variables** pane: every name and its current value. Hover over a name in the
   editor to see the same.
4. Move on:
   - **F10 — Step Over**: run this line, stop at the next one.
   - **F11 — Step Into**: if this line calls your own function, go inside it.
   - **Shift+F11 — Step Out**: finish the current function and stop where it returns.
   - **F5 — Continue**: run until the next breakpoint, or the end.
   - **Shift+F5 — Stop**.

Two more tools:

- **Watch**: add an expression such as \`total / count\` and it is re-evaluated at each stop.
- **Debug Console**: type any expression, using the paused program's variables, and see its value.
- **Conditional breakpoint**: right-click the dot → *Edit Breakpoint* → \`i == 7\`. It stops only
  when the condition is true — essential inside a loop that runs a thousand times.

A program run with F5 that calls \`input()\` waits in the terminal, the same as a normal run.

## Habits

- Turn on **Auto Save** (File → Auto Save) or press Ctrl+S before running; VS Code runs the file
  on disk, not the unsaved buffer.
- Format with Shift+Alt+F once a formatter is installed; it keeps indentation consistent.`,
    workedExample: `**Problem.** This loop should print the average of three marks, \`81.67\`, but it prints
\`30.0\`.

    marks = [70, 85, 90]
    total = 0
    for m in marks:
        total = m
    print(total / len(marks))

1. Put a breakpoint on \`total = m\` and press F5 → Python File.
2. First stop: Variables shows \`m = 70\`, \`total = 0\`. Press F10.
3. \`total\` is now 70. F5 to continue to the next stop: \`m = 85\`, \`total = 70\`. F10 —
   \`total\` becomes **85**, not 155. The line replaces the total instead of adding to it.
4. Fix: \`total = total + m\` (or \`total += m\`). Re-run: \`81.66666666666667\`.

The reasoning: you watched the value change one line at a time instead of guessing. The
debugger showed the exact line where the number went wrong.`,
    mcqs: [
      mcq('VS Code says "No module named \'requests\'", but pip in your terminal says requests is installed. What do you check first?',
        [['Which interpreter VS Code has selected for the file', true], ['Whether the file name ends in .py rather than .txt', false], ['Whether the requests import is on the first line', false], ['Whether Auto Save has been switched on in VS Code', false]],
        'A library is installed into one specific Python. If VS Code runs a different interpreter from the terminal\'s, the library is missing there. Python: Select Interpreter fixes it.'),
      mcq('The debugger is stopped at a breakpoint on line 12. Has line 12 run yet?',
        [['No — execution pauses just before that line', true], ['Yes — breakpoints pause just after the line', false], ['Only the left-hand side of line 12 has run', false], ['It depends on whether line 12 calls a function', false]],
        'A breakpoint stops the program before the marked line executes, so the Variables pane shows values as they were going into that line. F10 then runs it.'),
      mcq('The paused line is "result = clean(text)", and clean is your own function. Which key takes you inside clean?',
        [['F11, Step Into', true], ['F10, Step Over', false], ['Shift+F11, Step Out', false], ['F9, Toggle Breakpoint', false]],
        'Step Into follows the call into your function so you can watch it line by line. Step Over runs the whole call and stops on the next line of the current function.'),
    ],
    checkpoint: [
      ck('IDE_PROFICIENCY', 'A loop runs 500 times and the bug appears only when i is 312. What is the quickest way to stop there?',
        [['A conditional breakpoint with the condition i == 312', true], ['A plain breakpoint, pressing F5 until i is 312', false], ['A print(i) in the loop, then reading 500 lines', false], ['Step Over from the start of the program to there', false]],
        'A conditional breakpoint is checked every time the line is reached but only pauses when the condition is true, so you land on the one iteration you care about.'),
      ck('IDE_PROFICIENCY', 'You edit a script, do not save, and click Run Python File. Which version runs?',
        [['The last saved version of the file on disk', true], ['The unsaved text that is in the editor now', false], ['Neither; VS Code refuses to run an unsaved file', false], ['Whichever version Pylance last checked', false]],
        'The run button starts the interpreter on the file on disk. Unsaved edits are not in that file, so save first or turn on Auto Save.'),
      ck('IDE_PROFICIENCY', 'Stopped at a breakpoint, you want the value of price * qty * 1.18 without changing any code. Where do you type it?',
        [['The Debug Console, which uses the paused variables', true], ['The editor, then re-run the program to see it', false], ['The integrated terminal, at the PS> prompt', false], ['The Problems panel, as a new line to check', false]],
        'The Debug Console evaluates any expression in the paused frame, with the live values of price and qty, and needs no edit or restart.'),
    ],
  },
  {
    unitCode: 'JT_PY_START_INPUT_OUTPUT',
    notes: `Every coding round and online judge gives your program text on **standard input** and
compares what you print with an expected answer, line by line and character by character.

## input() always returns a string

    name = input()          # input: Asha Rao
    print("Hi", name)       # Hi Asha Rao

\`input()\` reads one line and returns it **without** the newline, as a \`str\` — always. Even
when the user types \`25\`, you get the two-character string \`"25"\`:

    age = input()           # input: 25
    print(age + 1)          # TypeError: can only concatenate str (not "int") to str
    print(age + age)        # 2525 — joining strings, not adding

Convert it:

    age = int(input())      # 25 as an int
    price = float(input())  # 49.5 as a float

\`int()\` ignores spaces and the newline around the number (\`int(" 42 ")\` is 42) but rejects
anything else: \`int("4.5")\` and \`int("12 5")\` both raise
\`ValueError: invalid literal for int() with base 10\`.

## Several numbers on one line

Judges often put values on one line: \`12 5\`. Split the line into parts, then convert each:

    a, b = map(int, input().split())
    print(a + b)            # 17

- \`split()\` with no argument splits on **any run of whitespace** and ignores spaces at the
  ends: \`"  12   5 ".split()\` is \`['12', '5']\`.
- \`split(" ")\` splits on **each single space**, so \`"12  5".split(" ")\` is \`['12', '', '5']\`
  and \`int('')\` fails. Use plain \`split()\` for input.
- \`map(int, parts)\` applies \`int\` to each part. Unpacking into \`a, b\` needs **exactly** two
  values, otherwise \`ValueError: too many values to unpack\`.
- For a whole line of numbers: \`nums = list(map(int, input().split()))\`.

## Reading until the input ends

When the number of lines is not given, read everything at once:

    import sys
    data = sys.stdin.read().split()     # every token from every line
    total = sum(int(x) for x in data)

Calling \`input()\` after the input has run out raises \`EOFError: EOF when reading a line\`.
For large inputs, \`sys.stdin.readline()\` is faster than \`input()\` (it keeps the \`\\n\`, so
\`.strip()\` it).

## print: sep and end

    print("a", "b", "c")                 # a b c
    print("a", "b", "c", sep="-")        # a-b-c
    print(1, 2, 3, sep="")               # 123
    print("no newline", end="")          # the next print continues this line
    print(10, 20, sep=", ", end=".\\n")   # 10, 20.

## f-strings — formatted output

Put \`f\` before the quotes and expressions inside \`{}\`:

    item, qty, price = "Pen", 3, 12.5
    print(f"{item} x{qty} = {qty * price}")      # Pen x3 = 37.5
    print(f"{3.14159:.2f}")                      # 3.14     two decimals, rounded
    print(f"[{7:>4}]")                           # [   7]   right-align in 4
    print(f"[{'ab':<5}]")                        # [ab   ]  left-align in 5
    print(f"{42:05d}")                           # 00042    pad with zeros
    print(f"{1234567:,}")                        # 1,234,567
    print(f"{0.256:.1%}")                        # 25.6%

The part after \`:\` is the **format spec**: alignment (\`<\`, \`>\`, \`^\`), width, then \`.2f\`
for fixed decimals or \`d\` for integers.

Rounding is done on the stored binary value: \`f"{2.675:.2f}"\` gives \`2.67\`, because 2.675
is really 2.67499999… in binary. Judges that want two decimals compute their answers the same
way, so use the format spec and do not round by hand.

## Common mistakes in judged problems

- \`input("Enter n: ")\` — the prompt text goes to standard output and makes your output wrong.
  Use plain \`input()\`.
- Printing \`5.0\` where \`5\` was expected: \`/\` gives a float; use \`//\` or format it.
- Extra spaces: \`print("Total:", x, ".")\` puts a space before the dot. Use an f-string when the
  exact layout matters.`,
    workedExample: `**Problem.** Input is a name on line 1 and two prices on line 2. Print
\`<name> pays <sum to 2 decimals>\`.

    Asha Rao
    120.5 79.25

1. Line 1 is text with a space inside, so read the whole line: \`name = input().strip()\`.
   \`strip()\` removes stray spaces at either end.
2. Line 2 has two numbers: \`a, b = map(float, input().split())\`. Now \`a = 120.5\`,
   \`b = 79.25\`.
3. Format: \`print(f"{name} pays {a + b:.2f}")\` prints \`Asha Rao pays 199.75\`.
4. Check the shapes that break careless code: two spaces between the prices (\`split()\`
   copes), a whole-number total such as \`100 50\` (prints \`150.00\`, as asked), and no
   prompts anywhere.

The reasoning: decide what each line holds, read it with the matching tool (\`input()\` for a
line of text, \`split()\` plus \`map\` for numbers), and let the format spec produce the layout.`,
    mcqs: [
      mcq('The input line is 8. What does this print?\n\n    n = input()\n    print(n * 3)',
        [['888', true], ['24', false], ['8 8 8', false], ['TypeError: can\'t multiply sequence', false]],
        'input() returns the string "8", and multiplying a string by an int repeats it. Convert first with int(input()) to get 24.'),
      mcq('The input line is "4  9" (two spaces). Which line reads both numbers as ints without an error?',
        [['a, b = map(int, input().split())', true], ['a, b = map(int, input().split(" "))', false], ['a, b = int(input().split())', false], ['a, b = int(input()), int(input())', false]],
        'split() with no argument treats any run of spaces as one separator. split(" ") yields an empty string between the two spaces; int() cannot take a list; and the last version reads two separate lines.'),
      mcq('What does this print?\n\n    print("x", "y", sep="", end="|")\n    print("z")',
        [['xy|z', true], ['x y|z', false], ['xy|\nz', false], ['x|y|z', false]],
        'sep="" joins x and y with nothing between them, and end="|" replaces the newline, so the next print continues on the same line after the bar.'),
    ],
    checkpoint: [
      ck('PYTHON_BASICS', 'What does print(f"[{5:>3}][{3.456:.1f}]") print?',
        [['[  5][3.5]', true], ['[5  ][3.4]', false], ['[  5][3.456]', false], ['[005][3.5]', false]],
        '>3 right-aligns 5 in a field three wide, padding on the left with spaces. .1f rounds 3.456 to one decimal place, giving 3.5.'),
      ck('PYTHON_BASICS', 'The input line is "7.5". What happens with qty = int(input())?',
        [['ValueError: invalid literal for int()', true], ['qty becomes 7, the decimal part dropped', false], ['qty becomes 8, rounded to the nearest', false], ['TypeError: int() cannot take a string', false]],
        'int() on a string accepts only an integer literal, so "7.5" raises ValueError. int(float("7.5")) would give 7, because int() on a float truncates.'),
      ck('PYTHON_BASICS', 'A judge expects the single line 15. Your code is n = int(input("Number? ")); print(n * 3). Why is it marked wrong?',
        [['The "Number? " prompt is printed as part of the output', true], ['input() cannot take any argument inside a judge', false], ['n * 3 is printed as 15.0 instead of 15', false], ['print adds a trailing space after the number', false]],
        'input() writes its prompt to standard output, so the output becomes "Number? 15". Judges compare everything printed; read with a bare input().'),
    ],
  },
  {
    unitCode: 'JT_PY_START_DEBUGGING',
    notes: `The first Python bugs fall into four groups: the file never starts, Python refuses the
code, it crashes on the input, or it runs and prints the wrong thing. Each has its own way of
being found.

## 1. The file never starts

    > python marks.py
    python: can't open file 'C:\\Users\\asha\\marks.py': [Errno 2] No such file or directory

Python is fine; the terminal is in the wrong folder. \`cd\` to the folder that holds the file,
or run it by its full path. If instead the shell says \`'python' is not recognized\`, the
interpreter is not on PATH — try \`py\` (Windows) or \`python3\` (macOS/Linux).

## 2. Python refuses the code — SyntaxError and IndentationError

    marks = 85
    if marks >= 40
        print("Pass")

    File "marks.py", line 2
        if marks >= 40
                      ^
    SyntaxError: expected ':'

Nothing at all ran — syntax errors are found before line 1 executes. The caret points at where
Python gave up, which is sometimes one line **after** the real mistake: an unclosed \`(\` on
line 4 can be reported at line 5. Read the named line and the one before it.

    if marks >= 40:
        print("Pass")
          print("Good")       IndentationError: unexpected indent

The second print is indented further than the first for no reason. Indent each block by exactly
4 spaces.

## 3. It crashes on the input

    count = int(input())          # input: 12 5
    ValueError: invalid literal for int() with base 10: '12 5'

The message quotes the exact text that \`int()\` received, inside quotes — read it. Here the
line held two numbers, so it needs \`split()\`:

    a, b = map(int, input().split())

Other crashes with the same root cause — the code expects one shape of input and gets another:

    a, b = map(int, input().split())    # input: 4 5 6
    ValueError: too many values to unpack (expected 2)

    name = input()                      # no more input lines
    EOFError: EOF when reading a line

## 4. It runs, but the answer is wrong — the string trap

    a = input()       # 12
    b = input()       # 30
    print(a + b)      # prints 1230

No error at all, because \`+\` on two strings is valid — it joins them. When a sum looks like two
numbers glued together, a value was never converted. Print the types while debugging:

    print(repr(a), type(a))       # '12' <class 'str'>

\`repr()\` shows the quotes, and with them any hidden spaces or an empty string:
\`repr(" 12")\` is \`' 12'\`, \`repr("")\` is \`''\`. That habit finds half of all input bugs.

## 5. Names that do not exist

    total = 0
    for x in range(3):
        totl = total + x
    print(Total)

    NameError: name 'Total' is not defined. Did you mean: 'total'?

Python 3.10+ suggests the close match. Notice the second, silent bug: \`totl = ...\` creates a
*new* name instead of updating \`total\`, so even after fixing the print the answer is 0. A
typo on the left of \`=\` never raises an error — it just makes a new variable. The debugger's
Variables pane shows both \`total\` and \`totl\`, which gives it away.

## 6. Your file hides a library

A script named \`random.py\` that does \`import random\` imports **itself**, and
\`random.randint\` fails with \`AttributeError: module 'random' has no attribute 'randint'\`.
Never name your files after modules you use (\`random.py\`, \`math.py\`, \`json.py\`).

## The method

Reproduce with the smallest input, read the last line of the traceback and the line number,
form one hypothesis, change one thing, run again. Changing three things at once tells you
nothing about which one mattered.`,
    mcqs: [
      mcq('With input lines 12 and 30, this prints 1230. What is the cause?\n\n    a = input()\n    b = input()\n    print(a + b)',
        [['The values are strings, so + joins them together', true], ['print puts the two values side by side without a space', false], ['input() reads both numbers into one single string', false], ['+ concatenates any two numbers that are on separate lines', false]],
        'input() returns strings, and + on strings concatenates. Converting with int(input()) makes + add, giving 42.'),
      mcq('Python reports "SyntaxError: \'(\' was never closed" at line 5, but line 5 looks fine. Where is the mistake most likely to be?',
        [['On an earlier line, where a bracket was opened', true], ['On line 5, in a character that cannot be seen', false], ['In the Python install, which needs reinstalling', false], ['On the last line of the file, which is too short', false]],
        'An unclosed bracket lets the next lines continue the same expression, so Python only notices later. Look back for the line that opened the bracket.'),
      mcq('A script crashes with "ValueError: invalid literal for int() with base 10: \'\'". What did int() receive?',
        [['An empty string — the line it read had no text', true], ['A string made of a single space character', false], ['The value None because input() returned nothing', false], ['A number that was too large to fit in an int', false]],
        "The message quotes the argument; '' is the empty string, so the line was blank. A space would appear as ' ', and Python integers have no size limit."),
      mcq('You save your experiment as random.py, and "import random" then "random.randint(1, 6)" raises AttributeError. Why?',
        [['import random loaded your own file, not the library', true], ['randint was removed from the random module in 3.10', false], ['A module must be imported before you can save a file', false], ['randint needs its two arguments passed as strings', false]],
        'Python looks in the script\'s own folder first, so your random.py shadows the standard module and has no randint. Rename the file (and delete any __pycache__ copy).'),
    ],
  },
  {
    unitCode: 'JT_PY_START_PRACTICE',
    notes: `Work these from the terminal first, so you see the raw tracebacks, then try them in
VS Code with the debugger.

## Exercise 1 — Hello, whoever

Read a name and print \`Hello, <name>!\`. Then try it with \`   Ravi   \` (spaces around it) and
make the output still \`Hello, Ravi!\`. (\`strip()\`.)

## Exercise 2 — Fix the script

    Print("Total marks")
    marks = input()
      bonus = 5
    print("With bonus: " + marks + bonus)

There are three problems. List all of them before fixing any — run it after each fix and read
the new error.

## Exercise 3 — Four results

Read two integers from one line and print their sum, difference, product and quotient to two
decimals, each on its own line. For \`7 2\`: \`9\`, \`5\`, \`14\`, \`3.50\`.

## Exercise 4 — A receipt line

Read an item name (it may contain spaces), then a quantity and a unit price on the next line,
and print one line such as

    Blue Pen       x  3     45.00

with an f-string: name left-aligned in 14 characters, quantity right-aligned in 3, total
right-aligned in 9 with two decimals.

## Exercise 5 — Sum everything

The input has an unknown number of lines, each with some integers. Print their total. (Read it
all with \`sys.stdin.read().split()\`.)

## Exercise 6 — Debugger drill

Write a loop that adds 1 to 10 into \`total\`. Put a breakpoint inside it, make it conditional on
\`i == 7\`, and read \`total\` in the Variables pane before the line runs. (It is 21.)

The graded exercise below combines a full line of text, two numbers on one line, \`//\` and
\`%\`, and exact formatting — exactly where input bugs live.`,
    mcqs: [
      mcq('With the input line "7 2", what does print(f"{a / b:.2f}") print after a, b = map(int, input().split())?',
        [['3.50', true], ['3', false], ['3.5', false], ['3.00', false]],
        '/ is true division, giving 3.5, and the .2f format spec always shows exactly two decimals, so 3.50 is printed. // would give 3.'),
      mcq('What does print(f"[{\'ab\':^6}]") print?',
        [['[  ab  ]', true], ['[ab    ]', false], ['[    ab]', false], ['[^6ab]', false]],
        '^ centres the value in the field width. "ab" is two characters in a width of six, so two spaces go on each side.'),
      mcq('The input has an unknown number of lines of integers. Which reads every integer?',
        [['nums = list(map(int, sys.stdin.read().split()))', true], ['nums = list(map(int, input().split()))', false], ['nums = list(map(int, sys.stdin.readline()))', false], ['nums = list(map(int, input().strip("\\n")))', false]],
        'sys.stdin.read() returns all remaining input as one string, and split() breaks it on every whitespace, newlines included. The others read one line only, or map over single characters.'),
      mcq('What does print(f"{125 // 60}h {125 % 60:02d}m") print?',
        [['2h 05m', true], ['2h 5m', false], ['2.08h 05m', false], ['2h 50m', false]],
        '125 // 60 is 2 whole hours and 125 % 60 leaves 5 minutes. The 02d spec pads the minutes to two digits with a leading zero.'),
      mcq('Which line removes spaces at both ends of the line read from input?',
        [['name = input().strip()', true], ['name = input().split()', false], ['name = input(strip=True)', false], ['name = str(input()).trim()', false]],
        'strip() returns the string without leading and trailing whitespace. split() returns a list, input() takes no strip argument, and Python strings have no trim method.'),
    ],
    assignment: {
      title: 'Watch-Time Report',
      description: 'Read a learner\'s name on one line and the minutes they watched and the number of days on the next, then print their name, the time in hours and minutes, and the average per day.',
      instructions: `Write a program that reads exactly this input:

- Line 1: the learner's name (it may contain spaces; ignore spaces at either end).
- Line 2: two integers — the total minutes watched and the number of days. They may be separated
  by more than one space.

It prints three lines:

    Learner: <name>
    Watched: <hours>h <minutes, always 2 digits>m
    Per day: <minutes / days, to 1 decimal> min

**Example.** For the input

    Asha Rao
    125 3

the output is

    Learner: Asha Rao
    Watched: 2h 05m
    Per day: 41.7 min

For \`Ravi\` and \`45 1\`, the last two lines are \`Watched: 0h 45m\` and \`Per day: 45.0 min\`.

**Rules**

- Print nothing else — no prompts such as "Enter name:".
- Hours are the whole hours (\`//\`); the minutes are what is left over (\`%\`), padded to two
  digits, so 5 minutes prints as \`05\`.
- The per-day figure is the exact division rounded to one decimal place by the format spec
  (\`:.1f\`) — always one decimal, even when it is a whole number.
- The number of days is at least 1.

**How it is graded**

Your program is run against the examples above and several hidden cases, and the output is
compared line by line. Spelling, capitals, spaces and punctuation matter.`,
      rubric: [
        { criterion: 'Correct output', description: 'All three lines are right for every test case, including a name with surrounding spaces, extra spaces between the numbers and zero minutes.', maxPoints: 60 },
        { criterion: 'Input read correctly', description: 'The name is read as a whole line and stripped, and the two numbers are split and converted to integers, without any prompt text.', maxPoints: 25 },
        { criterion: 'Readable', description: 'Names say what they hold, and the hours, minutes and average are each computed once and formatted with an f-string.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `# Read the learner's name (a whole line), then the minutes watched and the number of days.
# Print exactly three lines, in the format the instructions show. Print no prompts.

name = input()
# TODO: read the second line and turn its two parts into integers
# TODO: print the Learner, Watched and Per day lines
`,
        tests: [
          { input: 'Asha Rao\n125 3\n', expectedOutput: 'Learner: Asha Rao\nWatched: 2h 05m\nPer day: 41.7 min' },
          { input: 'Ravi\n45 1\n', expectedOutput: 'Learner: Ravi\nWatched: 0h 45m\nPer day: 45.0 min' },
          { input: '  Meera Krishnan  \n600 4\n', expectedOutput: 'Learner: Meera Krishnan\nWatched: 10h 00m\nPer day: 150.0 min', isHidden: true },
          { input: 'Team Lead\n   59    7  \n', expectedOutput: 'Learner: Team Lead\nWatched: 0h 59m\nPer day: 8.4 min', isHidden: true },
          { input: 'Arjun\n100000 30\n', expectedOutput: 'Learner: Arjun\nWatched: 1666h 40m\nPer day: 3333.3 min', isHidden: true },
          { input: 'Sam\n0 5\n', expectedOutput: 'Learner: Sam\nWatched: 0h 00m\nPer day: 0.0 min', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 60,
      },
    },
  },
  {
    unitCode: 'JT_PY_START_INTERVIEW_QUESTION',
    notes: `Three questions asked in almost every fresher Python interview, with answers that show
understanding rather than a memorised line.

## Q1. "Is Python compiled or interpreted?"

**Model answer.** "Both, in the CPython implementation most people use. When I run a file,
CPython first compiles the whole source to **bytecode** — that is why a syntax error on the
last line stops the program before the first line runs. Then the CPython virtual machine
interprets that bytecode. For imported modules the bytecode is cached as \`.pyc\` files in
\`__pycache__\`, so the next import skips the compile step. There is no separate compile command
like \`javac\`, which is why people call Python interpreted."

**Follow-up:** "Why is Python slower than Java or C, then?" — "Mostly because it is dynamically
typed: every \`a + b\` has to check at run time what \`a\` and \`b\` are and find the right
operation, and CPython has traditionally had no JIT doing that work ahead. Libraries like
NumPy are fast because the heavy loops run in compiled C."

## Q2. "What does if __name__ == '__main__' do?"

**Model answer.** "Every module has a \`__name__\`. When I run a file directly, Python sets it to
\`'__main__'\`; when the file is imported, it is the module's name, like \`'utils'\`. So code
inside that \`if\` runs only when the file is the program being run, not when something imports
it. I use it so a file can offer functions to other modules and still have a runnable entry
point — and so that importing it in a test does not start the program."

**Follow-up:** "What happens if you leave it out?" — "Any top-level calls run on import. If
\`utils.py\` ends with \`main()\` and a test does \`import utils\`, the whole program runs —
including any \`input()\` calls, so the test hangs waiting for input."

## Q3. "Why does this print 1020 instead of 30?"

    a = input()     # 10
    b = input()     # 20
    print(a + b)

**Model answer.** "\`input()\` always returns a string. \`+\` between two strings concatenates
them, so \`'10' + '20'\` is \`'1020'\`. Python does not convert automatically — it is strongly
typed, even though it is dynamically typed. I would convert at the point of reading:
\`a = int(input())\`. If both numbers are on one line, \`a, b = map(int, input().split())\`."

**Follow-up:** "And if the input has a million numbers?" — "\`input()\` per line gets slow; I
would read everything with \`sys.stdin.read().split()\` or use \`sys.stdin.readline\`, which
avoids the per-call overhead of \`input()\`."

## How to answer

Lead with the one-sentence answer, then the mechanism, then a concrete consequence. An answer
that ends with "...and that is why you see *this*" sounds like someone who has written Python,
not read about it.`,
    mcqs: [
      mcq('An interviewer asks why a typo on line 40 stops a script before line 1 prints anything. Best answer?',
        [['The whole file is compiled to bytecode before it runs', true], ['Python reads the file from the bottom to the top first', false], ['print output is held back until the script finishes', false], ['Python checks every line for typos using a spell checker', false]],
        'CPython compiles the complete source before executing any of it, and a SyntaxError anywhere stops that compile. Errors that only happen at run time, such as NameError, do let earlier lines run.'),
      mcq('Python is called "dynamically but strongly typed". Which snippet shows the strong part?',
        [['"3" + 4 raises a TypeError instead of guessing', true], ['x = 3 and then x = "three" is allowed', false], ['type(3) returns the class int at run time', false], ['int("3") turns the string into the number 3', false]],
        'Strong typing means Python will not silently convert between unrelated types; mixing str and int with + is an error. Rebinding x to a different type is the dynamic part.'),
      mcq('utils.py ends with a bare main() call that reads input(). A test file does "import utils". What happens?',
        [['main() runs on import, and the test waits for input', true], ['Nothing; import never runs any top-level code', false], ['Python raises ImportError because main is called', false], ['main() runs only if the test calls utils.main()', false]],
        'Importing a module executes its top-level code once. A bare main() call is top-level code, so it runs; guarding it with if __name__ == "__main__" prevents that.'),
    ],
  },
  {
    unitCode: 'JT_PY_START_CHECKPOINT',
    notes: `Ten questions on the whole topic: installing Python and the REPL, running a script and
reading its errors, VS Code and its debugger, and reading input and printing output. Each is a
situation you will meet in your first week of writing Python. Read every snippet as the
interpreter would, not as you hope it behaves.`,
    checkpoint: [
      ck('PYTHON_BASICS', 'On Windows, "py -3.11 app.py" runs but "python app.py" opens the Microsoft Store. What is going on?',
        [['A Store app alias is answering for python', true], ['Python 3.11 can only be run from the Store', false], ['app.py is listed in the Store as an app', false], ['The py launcher has deleted python.exe', false]],
        'Windows ships an app execution alias named python that opens the Store. The py launcher finds the real install; turn the alias off or put Python on PATH.'),
      ck('PYTHON_BASICS', 'What does this print?\n\n    print("Rs", 250, sep=".", end="/-\\n")',
        [['Rs.250/-', true], ['Rs 250/-', false], ['Rs.250./-', false], ['Rs250/-', false]],
        'sep goes between the arguments, so Rs and 250 are joined by a dot. end replaces the newline at the end, so /- is printed and then the explicit \\n ends the line.'),
      ck('PYTHON_BASICS', 'The input line is "3 4 5". What happens with x, y = map(int, input().split())?',
        [['ValueError: too many values to unpack', true], ['x is 3 and y is 4; the 5 is dropped', false], ['x is 3 and y is the list [4, 5]', false], ['TypeError: map object is not iterable', false]],
        'split() yields three parts and map converts all three, but unpacking into two names needs exactly two values, so Python raises ValueError.'),
      ck('PYTHON_BASICS', 'What does print(f"{9.5:06.2f}|{1500000:,}") print?',
        [['009.50|1,500,000', true], ['9.50|1,500,000', false], ['000009.50|1500000', false], ['9.500|1.500.000', false]],
        '06.2f means two decimals in a total width of six, padded with zeros: 009.50. The comma option inserts thousands separators every three digits.'),
      ck('PYTHON_BASICS', 'Which traceback line tells you what kind of error happened?',
        [['The last line, such as TypeError: ...', true], ['The first line, Traceback (most recent call last)', false], ['The topmost File "...", line N entry', false], ['The line holding only a ^ caret marker', false]],
        'The final line names the exception type and its message. The File lines above it show where, with the innermost call at the bottom.'),
      ck('PYTHON_BASICS', 'What does this print?\n\n    total = 0\n    for n in [4, 6]:\n        totl = total + n\n    print(total)',
        [['0, because totl is a new name each time', true], ['10, the sum of the two numbers in the list', false], ['6, the last value that was added to totl', false], ['NameError for the misspelt name totl', false]],
        'Assigning to a misspelt name creates a new variable rather than raising an error, so total is never changed. Only reading an unknown name raises NameError.'),
      ck('PYTHON_BASICS', 'What does the REPL echo for "7" * 2, and what does print("7" * 2) show?',
        [["'77' and then 77", true], ['14 and then 14', false], ["'14' and then 14", false], ["77 and then '77'", false]],
        'Multiplying a string by 2 repeats it. The REPL echoes the repr, with quotes; print shows the characters only.'),
      ck('IDE_PROFICIENCY', 'VS Code\'s status bar shows Python 3.9, but your terminal\'s python is 3.12. Which command switches VS Code?',
        [['Python: Select Interpreter from the Command Palette', true], ['Python: Restart Language Server in the status bar', false], ['Terminal: Create New Terminal from the menu bar', false], ['Run Python File, which detects the newest version', false]],
        'VS Code runs and checks code with the interpreter chosen through Python: Select Interpreter. Restarting the language server or opening a terminal does not change that choice.'),
      ck('IDE_PROFICIENCY', 'Paused on "x = scale(v)", where scale is your function, you press F10. Where does the debugger stop next?',
        [['On the next line, with scale already finished', true], ['On the first line inside the scale function', false], ['At the end of the program, if no breakpoint', false], ['On the same line again, before x is assigned', false]],
        'F10 is Step Over: it runs the whole line, including the call to scale, and stops on the next line of the current code. F11 would step into scale.'),
      ck('IDE_PROFICIENCY', 'You want a running total re-evaluated every time the debugger stops, without typing it each time. What do you use?',
        [['A Watch expression in the Run and Debug view', true], ['A print call added on every line of the loop', false], ['The Problems panel, filtered to that variable', false], ['A second breakpoint placed on the very same line', false]],
        'Watch expressions are evaluated again at every pause and shown in the Watch pane, so you see the value change as you step.'),
    ],
  },
];
