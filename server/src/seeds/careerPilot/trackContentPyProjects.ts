/**
 * Career-track content: modules, packages and real Python projects (JT_PY_PROJECTS).
 *
 * The Python tracks teach the language from the first program, the way Core Java and Core C# do.
 * By this topic the student writes types, conditions, loops, collections and functions; what they
 * have not done is split a program across files, lay it out as a package, run it in its own
 * environment and lean on the standard library. That is what a first job asks for on day one, and
 * what an interviewer checks with "why does this import fail?" and "what does this print?". So
 * nearly every question is about one specific layout, command or snippet.
 *
 * The notes teach Python 3.10+; the graded exercise is plain 3.10 code, because the runner is
 * Python 3.10. tomllib is 3.11+, so it is mentioned but never used. Commands are shown for Windows
 * and for macOS/Linux wherever the two differ (activating a venv, the venv's python path).
 * Comprehensions, generators, decorators, writing your own context managers, type hints and
 * dataclasses belong to JT_PY_MODERN and are not taught here.
 *
 * Attribution: the topic is single-skill (PYTHON_MODULES), so every checkpoint question names
 * that one skill. Practice mcqs name none.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

const SKILL = 'PYTHON_MODULES';

export const TRACK_PY_PROJECTS_BUNDLES: PilotBundle[] = [
  /* ══ JT_PY_PROJECTS — Modules, Packages and Projects ═══════════════════════════════════ */
  {
    unitCode: 'JT_PY_PROJECTS_MODULES',
    notes: `Every program so far has lived in one file. Real programs do not: a billing system has a
file for prices, one for invoices, one for the command line. In Python each of those files is a
**module**, and \`import\` is how one file uses another.

## A module is just a .py file

Put two files in the same folder:

    # pricing.py
    TAX_RATE = 0.18

    def with_tax(amount):
        return round(amount * (1 + TAX_RATE), 2)

    print("pricing loaded")

    # main.py
    import pricing
    import pricing
    print(pricing.with_tax(100))

Run \`python main.py\` (\`py main.py\` on Windows, \`python3 main.py\` on macOS/Linux):

    pricing loaded
    118.0

Three facts explain that output:

1. **import runs the module's file**, top to bottom, the first time. That is why
   \`pricing loaded\` appears — every top-level statement executed, including the \`print\`.
2. **It runs only once.** The finished module object is cached in \`sys.modules\`; the second
   \`import pricing\` finds it there and does nothing. (In a long-running REPL,
   \`importlib.reload(pricing)\` forces a re-run — you rarely need it in a program.)
3. **import binds a name.** After \`import pricing\`, the name \`pricing\` refers to the module
   object, and its contents are reached with a dot: \`pricing.with_tax\`, \`pricing.TAX_RATE\`.

A module should *define* things — constants, functions, classes — and do nothing else when it
is imported. A stray \`print\` or \`input()\` at the top level runs for every importer.

## The import forms

    import pricing                     # use as pricing.with_tax(...)
    import pricing as pr               # an alias: pr.with_tax(...)
    from pricing import with_tax       # copy one name in: with_tax(...)
    from pricing import with_tax as wt # copy it in under another name
    from pricing import *              # copy every public name — avoid

Which to use:

- \`import module\` keeps the origin visible: \`pricing.with_tax\` says where it came from. It is
  the safe default, especially for your own modules.
- \`from module import name\` is fine for a few names used often (\`from math import sqrt\`).
- \`as\` is for long names or a convention (\`import numpy as np\`), not for disguising.
- \`from module import *\` dumps unknown names into your file, can silently overwrite your own,
  and makes every reader guess where a name came from. Do not use it in real code.

## from-import copies a binding, not a variable

    # rates.py
    RATE = 0.18
    def apply(x):
        return round(x * (1 + RATE), 2)

    # main.py
    from rates import RATE, apply
    RATE = 0.05
    print(apply(100))          # 118.0 — apply still reads rates.RATE

    import rates
    rates.RATE = 0.05
    print(apply(100))          # 105.0 — now the module's own global changed

\`from rates import RATE\` creates a new name \`RATE\` in main.py pointing at the same value. Assigning
to it rebinds *main's* name only. A function always looks up globals in the module where it was
**defined**, so \`apply\` keeps seeing \`rates.RATE\`. To change module state, go through the
module: \`rates.RATE = ...\` — and better still, pass values in as arguments.

## __all__ and the star import

A module can list its public names:

    # shapes.py
    __all__ = ['area']
    def area(w, h): return w * h
    def perimeter(w, h): return 2 * (w + h)

\`from shapes import *\` now brings in \`area\` only; calling \`perimeter(2, 3)\` afterwards raises
\`NameError: name 'perimeter' is not defined\`. Without \`__all__\`, \`*\` takes every name not
starting with an underscore. \`__all__\` never stops \`from shapes import perimeter\` — it only
shapes the star.

## Where Python looks: sys.path

\`import pricing\` searches the folders in the list \`sys.path\`, in order, and takes the first
\`pricing.py\` (or \`pricing\` package) it finds:

1. **The folder of the script you ran** (for \`python app/main.py\`, that is \`app/\`) — or the
   current folder for \`python -m ...\` and the REPL.
2. Folders in the \`PYTHONPATH\` environment variable, if it is set.
3. The standard library.
4. \`site-packages\` — where pip installs third-party packages.

    import sys
    for folder in sys.path:
        print(folder)

Two consequences that cause real bugs:

- **Your file can hide a library.** A file named \`random.py\`, \`json.py\` or \`math.py\` next to
  your script is found *before* the standard library, so \`import json\` imports your file.
- **Where you run from matters.** \`sys.path[0]\` is the script's folder, not your project root,
  so a script in a subfolder cannot see modules that sit beside the subfolder. The next unit
  fixes that properly.

When a module is found, Python also caches its compiled bytecode as a \`.pyc\` file in a
\`__pycache__\` folder beside it. It is safe to delete and should be in \`.gitignore\`.

## __name__: imported or run?

Every module has a global \`__name__\`. When a file is **run** as the program it is
\`'__main__'\`; when it is **imported**, it is the module's name.

    # helper.py
    print(__name__)

\`python helper.py\` prints \`__main__\`. A \`main.py\` that does \`import helper\` makes the same line
print \`helper\`. That is why every runnable module ends with the guard:

    def main():
        ...

    if __name__ == "__main__":
        main()

Run the file and \`main()\` is called; import it from another module or a test and nothing
starts — the importer just gets the functions.

## Interview traps

- A module's top-level code runs **once per process**, on the first import, however many files
  import it.
- \`from m import x\` then \`x = ...\` never changes \`m.x\`.
- \`import\` searches \`sys.path\` in order, and the script's own folder comes first.`,
    workedExample: `**Problem.** A one-file script \`report.py\` has grown to 200 lines: it reads marks, computes
grades and prints a report. Split it so the grading logic can be reused and tested.

1. Move the pure logic into **grading.py** — functions only, nothing that runs on import:

        # grading.py
        PASS_MARK = 40

        def grade(mark):
            if mark >= 75:
                return "A"
            if mark >= PASS_MARK:
                return "B"
            return "F"

        def summary(marks):
            counts = {"A": 0, "B": 0, "F": 0}
            for m in marks:
                counts[grade(m)] += 1
            return counts

2. Keep the input and output in **report.py**, behind the main guard:

        # report.py
        import grading

        def main():
            marks = list(map(int, input().split()))
            print(grading.summary(marks))

        if __name__ == "__main__":
            main()

3. Run it: \`python report.py\` (Windows: \`py report.py\`; macOS/Linux: \`python3 report.py\`)
   with the input \`80 35 60 92\` prints \`{'A': 2, 'B': 1, 'F': 1}\`.

4. Check the split works the other way: open a REPL in the same folder and type
   \`import grading\` then \`grading.grade(39)\`. It returns \`'F'\` and nothing else happens — no
   prompt for input — because grading.py only defines things.

The reasoning: **logic in modules that define, I/O in one module that runs.** \`import grading\`
(not \`from grading import *\`) keeps it obvious which file \`summary\` comes from.`,
    mcqs: [
      mcq('pricing.py ends with print("pricing loaded"). main.py runs "import pricing" on two lines in a row, then prints pricing.with_tax(100), which is 118.0. What is the output?',
        [['pricing loaded once, then 118.0', true], ['pricing loaded twice, then 118.0', false], ['Only 118.0; an import never prints', false], ['ImportError: pricing already imported', false]],
        'The first import runs pricing.py top to bottom, which prints the line, and caches the module in sys.modules. The second import finds it in the cache and runs nothing.'),
      mcq('rates.py defines RATE = 0.18 and def apply(x): return round(x * (1 + RATE), 2). What does this main.py print?\n\n    from rates import RATE, apply\n    RATE = 0.05\n    print(apply(100))',
        [['118.0', true], ['105.0', false], ['100.0', false], ['NameError: RATE is not defined', false]],
        'from-import made a new name RATE in main.py; rebinding it leaves rates.RATE at 0.18. apply looks up RATE in the module where it was defined, so it still adds 18 per cent.'),
      mcq('helper.py contains only print(__name__). What appears when you run "python main.py", where main.py is just "import helper"?',
        [['helper', true], ['__main__', false], ['main', false], ['helper.py', false]],
        'An imported module\'s __name__ is its module name, so helper.py prints helper. Only the file run as the program gets __name__ equal to "__main__".'),
    ],
    checkpoint: [
      ck(SKILL, 'After which line can you write sqrt(49), with no prefix, and get 7.0?',
        [['from math import sqrt', true], ['import math as sqrt', false], ['import sqrt from math', false], ['import math.sqrt as s', false]],
        'from math import sqrt binds the function itself to the name sqrt. "import math as sqrt" binds the module, so sqrt(49) would call a module; the other two are not valid ways to get the bare name.'),
      ck(SKILL, 'shapes.py sets __all__ = ["area"] and defines area and perimeter. A script does "from shapes import *" and calls perimeter(2, 3). What happens?',
        [['NameError: name perimeter is not defined', true], ['It runs, because __all__ only affects docs', false], ['ImportError when the star import runs', false], ['It returns 10, since * ignores __all__', false]],
        '__all__ is exactly the list a star import copies, so only area arrives. perimeter is still importable by name, with from shapes import perimeter, but * leaves it out.'),
      ck(SKILL, 'You run "python tools/check.py" from the project folder. Which folder does Python search first for "import config"?',
        [['tools, the folder holding check.py', true], ['The project folder you ran it from', false], ['The standard library, then site-packages', false], ['The folder in which Python is installed', false]],
        'When a script is run by path, sys.path[0] is the folder containing that script, not the current directory. That is why a script in a subfolder cannot see modules that sit beside the subfolder.'),
    ],
  },
  {
    unitCode: 'JT_PY_PROJECTS_PACKAGES',
    notes: `Ten modules in one folder is a mess. A **package** groups related modules in a folder, and
gives them a shared name: \`invoicing.tax\`, \`invoicing.models\`.

## A folder with __init__.py

    shop/
        __init__.py
        prices.py
        cart.py

\`shop\` is now a package; \`shop.prices\` and \`shop.cart\` are its modules. \`__init__.py\` may be
empty. When anything inside the package is imported for the first time, \`__init__.py\` runs
first:

    # shop/__init__.py
    print("init shop")

    # shop/prices.py
    print("load prices")
    def total(items):
        return sum(items)

    # shop/cart.py
    print("load cart")
    from .prices import total
    print(total([10, 20]))

    # main.py   (beside the shop folder)
    import shop.cart

\`python main.py\` prints:

    init shop
    load cart
    load prices
    30

The package's \`__init__\` runs, then cart.py starts, and its import of prices runs prices.py
before cart.py carries on. (A folder *without* \`__init__.py\` can still be imported, as a
"namespace package", but that exists for splitting one package across several folders. For your
own code, always add \`__init__.py\`.)

**What goes in __init__.py?** Usually nothing, or a few re-exports so users can write a short
import:

    # invoicing/__init__.py
    from .tax import gst
    from .models import Invoice

Now \`from invoicing import Invoice\` works. Keep it light — everything in it runs on every import
of the package.

## Absolute and relative imports

Inside a package you can name a sibling two ways:

    from shop.prices import total     # absolute: the full path from the top package
    from .prices import total         # relative: "prices, in my own package"
    from ..utils import slugify       # relative: "utils, one package up"

One dot is the current package, two dots its parent. Both work; **absolute imports are the
default choice** (PEP 8) because they read the same in every file. Relative imports are handy
inside a large package that may be renamed.

Relative imports have one hard rule: they work **only when the file is loaded as part of its
package**. Run the file directly and its package is unknown:

    > python shop/cart.py
    load cart
    ...
    ImportError: attempted relative import with no known parent package

Run it as a module of the package instead, from the folder that **contains** \`shop\`:

    > python -m shop.cart
    init shop
    load cart
    load prices
    30

\`python -m shop.cart\` puts the *current* folder on \`sys.path\`, imports \`shop\`, then runs
\`cart\` as \`__main__\` — so both relative and absolute imports resolve.

## A layout a team can read

    invoice-app/
        pyproject.toml          (project metadata — later unit)
        README.md
        requirements.txt
        .gitignore              (.venv/, __pycache__/)
        src/
            invoicing/
                __init__.py
                __main__.py     (so "python -m invoicing" runs the app)
                models.py
                tax.py
                cli.py
        tests/
            test_tax.py

- **One top-level package** named after the project (\`invoicing\`), not a pile of loose modules
  that could clash with other libraries (\`utils.py\`, \`config.py\`).
- **\`src/\` layout**: the package sits inside \`src/\`, so it can only be imported once it is
  *installed* (\`pip install -e .\`, a later unit). That stops tests from accidentally importing
  the loose folder instead of what users will get. A flat layout (\`invoicing/\` at the root) is
  also common and fine for small projects.
- **Tests outside the package**, mirroring its modules.
- Module names are short, lowercase, with underscores if needed: \`tax_rules.py\`, never
  \`Tax-Rules.py\` (a hyphen cannot appear in an import).

## The import errors a bad layout causes

    proj/
        shop/__init__.py, core.py
        tools/__init__.py, report.py      (report.py does: import shop.core)

    > cd proj
    > python tools/report.py
    ModuleNotFoundError: No module named 'shop'

\`sys.path[0]\` is \`proj/tools\`, and \`shop\` is not inside it. The fix is **not**
\`sys.path.append("..")\` sprinkled through the code — it breaks as soon as someone runs from
another folder. The fixes are, in order of preference:

1. Run it as a module from the root: \`python -m tools.report\`.
2. Install your project into its environment (\`pip install -e .\`) so \`shop\` is importable
   from anywhere.

Other classics: a module named like its package (\`shop/shop.py\` makes \`import shop.shop\`
confusing), a hyphen in a folder name, and a missing \`__init__.py\` in one folder of a chain.

## Interview traps

- \`__init__.py\` runs the first time anything in the package is imported.
- "attempted relative import with no known parent package" means the file was run directly;
  use \`python -m package.module\`.
- Absolute imports are the default; relative imports only work inside a package.`,
    workedExample: `**Problem.** A project has these files, all at the root: \`app.py\`, \`db.py\`, \`models.py\`,
\`utils.py\`, \`email.py\`. \`app.py\` does \`import email\` to use its \`send_welcome\` function, and
another file uses the standard library's \`email.message\`. It fails with
\`ModuleNotFoundError: No module named 'email.message'; 'email' is not a package\`. Restructure it.

1. **Diagnose.** The root is \`sys.path[0]\`, so \`import email\` finds the project's \`email.py\`
   before the standard library's \`email\` package — and a plain module has no \`.message\`.
2. **Give the project one package name.** Create \`signup/\` with an \`__init__.py\` and move the
   modules in, renaming the clashing one to say what it does:

        signup/
            __init__.py
            __main__.py        (was app.py)
            db.py
            models.py
            utils.py
            mailer.py          (was email.py)

3. **Fix the imports** to absolute ones from the package:

        # signup/__main__.py
        from signup.mailer import send_welcome
        from signup.models import User

4. **Run it as a package** from the folder that contains \`signup\`:
   \`python -m signup\` (\`py -m signup\` on Windows, \`python3 -m signup\` on macOS/Linux).

Now \`import email\` anywhere means the standard library again, every module has an unambiguous
home, and the app has one obvious entry point.`,
    mcqs: [
      mcq('shop/__init__.py prints "init shop", shop/cart.py prints "load cart" and then imports .prices, and shop/prices.py prints "load prices". main.py does "import shop.cart". What are the first two lines printed?',
        [['init shop, then load cart', true], ['load cart, then load prices', false], ['load cart, then init shop', false], ['load prices, then load cart', false]],
        'Importing shop.cart imports the package shop first, so __init__.py runs and prints init shop. Then cart.py starts and prints load cart before its own import of prices runs.'),
      mcq('shop/cart.py contains "from .prices import total". What happens when you run "python shop/cart.py"?',
        [['ImportError: no known parent package', true], ['It runs, since the dot means "this folder"', false], ['ModuleNotFoundError: no module named prices', false], ['SyntaxError: a dot cannot start an import', false]],
        'Run by path, cart.py is just __main__ with no package, so a relative import has nothing to be relative to. Running python -m shop.cart from the parent folder loads it as part of shop.'),
      mcq('In app/api/views.py, which module does "from ..helpers import slug" import?',
        [['app/helpers.py', true], ['app/api/helpers.py', false], ['helpers.py in the folder above app', false], ['A helpers package in site-packages', false]],
        'One dot is the current package (app.api) and two dots its parent (app), so ..helpers is app.helpers. A single dot would have meant app/api/helpers.py.'),
    ],
    checkpoint: [
      ck(SKILL, 'proj/tools/report.py does "import shop.core", and shop/ is a package in proj/. From proj, "python tools/report.py" says No module named shop. Which fix holds up?',
        [['Run it from proj as python -m tools.report', true], ['Add sys.path.append("..") at the top of report.py', false], ['Copy the shop folder into the tools folder too', false], ['Rename the shop package so that it is shop.py', false]],
        'Run by path, sys.path[0] is proj/tools, which does not contain shop. python -m puts the current folder, proj, on sys.path. A sys.path hack depends on where the command is typed, and copies drift apart.'),
      ck(SKILL, 'When does the code in a package\'s __init__.py run?',
        [['On the first import of the package or a module in it', true], ['Every time any module inside the package is imported', false], ['Only when the program uses from package import *', false], ['Never; __init__.py is a marker file Python ignores', false]],
        'Importing the package, or anything inside it, imports the package first, which executes __init__.py once and caches the result in sys.modules. Later imports reuse it.'),
      ck(SKILL, 'Why can a folder named "order-service" never be imported with an import statement?',
        [['A hyphen is not allowed in a Python identifier', true], ['Package names must be one word with no separator', false], ['Folder names longer than ten characters are ignored', false], ['import only searches folders without any letters', false]],
        'import order-service would parse as import order minus service. Module and package names must be valid identifiers, so use order_service.'),
    ],
  },
  {
    unitCode: 'JT_PY_PROJECTS_SCOPE',
    notes: `Once code is spread over functions and modules, the question "which \`total\` does this line
mean?" matters. Python answers it with one rule.

## The LEGB rule

When a function **reads** a name, Python looks in four places, in order, and stops at the first
match:

1. **L — Local**: names assigned inside the current function (including its parameters).
2. **E — Enclosing**: names in any function that contains this one (nested functions).
3. **G — Global**: names assigned at the top level of the **module** the function was defined in.
4. **B — Built-in**: \`len\`, \`print\`, \`sum\`, \`list\`, \`max\`, \`ValueError\` …

If none has it: \`NameError\`.

    x = 'global'

    def outer():
        x = 'enclosing'
        def inner():
            print(x)       # not local, found in the enclosing function
        inner()

    outer()                # enclosing
    print(x)               # global

"Global" means **module-level**: each module has its own globals. There is no program-wide
global namespace — that is what \`import\` and the dot are for.

## Blocks do not make a scope

Only modules, functions, classes (and comprehensions) create scopes. \`if\`, \`for\`, \`while\`,
\`with\` and \`try\` do not:

    if True:
        msg = "hi"
    print(msg)             # hi

    for i in range(3):
        pass
    print(i)               # 2 — the loop variable survives the loop

## Assignment decides: the UnboundLocalError

The compiler decides a name's scope when it compiles the function: **if the function assigns
to a name anywhere in its body, that name is local everywhere in that function.**

    total = 5

    def show():
        print(total)       # UnboundLocalError!
        total = 1

    show()

\`total = 1\` makes \`total\` local to \`show\` for the whole function — so the \`print\`, which comes
first, refers to a local that has no value yet. It does **not** fall back to the global. The
same happens with \`+=\`, which is an assignment:

    count = 10
    def bump():
        count += 1         # UnboundLocalError
    bump()

Python 3.10 words it as \`local variable 'count' referenced before assignment\`; 3.11+ says
\`cannot access local variable 'count' where it is not associated with a value\`. Same error.

## Changing, versus rebinding

Calling a method on a global object is a *read* of the name, so no declaration is needed:

    items = []
    def add(x):
        items.append(x)    # reads the name items, mutates the list
    add(1); add(2)
    print(items)           # [1, 2]

Only **assigning** to the name (\`items = ...\`, \`items += ...\`) makes it local.

## global and nonlocal

To assign to a module-level name from inside a function, declare it:

    calls = 0
    def track():
        global calls
        calls += 1
    track(); track()
    print(calls)           # 2

To assign to a name in the **enclosing** function, use \`nonlocal\`:

    def make():
        n = 0
        def step():
            nonlocal n
            n += 2
            return n
        step()
        return step()
    print(make())          # 4

\`nonlocal\` needs the name to exist in an enclosing function; at module level there is none, and
\`nonlocal z\` with no enclosing \`z\` is a \`SyntaxError\`. Without either keyword, an assignment in
an inner function just creates a new local:

    def f():
        y = 1
        def g():
            y = 2          # a new local y inside g
        g()
        return y
    print(f())             # 1

**Use global sparingly.** A function that rewrites module state is hard to test and hard to reason
about. Prefer passing values in and returning results: \`calls = track(calls)\`.

## Shadowing a built-in

Built-ins come last in LEGB, so any name you assign hides them:

    list = [3, 1, 2]
    print(list(range(2)))  # TypeError: 'list' object is not callable

    sum = 0
    for n in [1, 2, 3]:
        sum += n
    print(sum([4, 5]))     # TypeError: 'int' object is not callable

The error appears far from the cause. Never name variables \`list\`, \`dict\`, \`str\`, \`sum\`,
\`max\`, \`min\`, \`id\`, \`input\` or \`type\`; use \`items\`, \`total\`, \`largest\`. In the REPL,
\`del list\` removes your name and the built-in shows through again.

## Interview traps

- A name assigned anywhere in a function is local for the whole function.
- \`items.append(x)\` needs no \`global\`; \`items = items + [x]\` does.
- \`global\` means module-level, not program-wide.`,
    workedExample: `**Problem.** This script should count how many orders were large, but it crashes.

    large_orders = 0
    LIMIT = 1000

    def record(amount):
        if amount > LIMIT:
            large_orders += 1

    for amount in [500, 1500, 2500]:
        record(amount)
    print(large_orders)

1. **Read the error**: \`UnboundLocalError\` on \`large_orders += 1\`. \`+=\` assigns, so
   \`large_orders\` is local to \`record\`, and the local has no value when \`+=\` reads it.
2. **Notice what did not fail**: \`LIMIT\` is only read inside \`record\`, so LEGB finds the global.
3. **The quick fix** is \`global large_orders\` as the first line of \`record\`. It prints \`2\`.
4. **The better fix** removes the shared state, so the function can be tested on its own:

        LIMIT = 1000

        def is_large(amount):
            return amount > LIMIT

        def count_large(orders):
            count = 0
            for amount in orders:
                if is_large(amount):
                    count += 1
            return count

        print(count_large([500, 1500, 2500]))     # 2

   \`count\` is now local to \`count_large\`, assigned before it is read, and returned. Both
   functions read only their arguments and a constant.

The reasoning: **reading** a global is fine; **assigning** one from a function needs \`global\`,
and is usually a sign the value should be returned instead.`,
    mcqs: [
      mcq('What happens when this runs?\n\n    total = 5\n    def show():\n        print(total)\n        total = 1\n    show()',
        [['UnboundLocalError on the print line', true], ['It prints 5, then sets a local total', false], ['It prints 1, the value set in show()', false], ['NameError, since total is not global', false]],
        'Because show assigns to total, the compiler makes total local to the whole function. The print reads that local before it has a value; Python never falls back to the global.'),
      mcq('What does this print?\n\n    def f():\n        y = 1\n        def g():\n            y = 2\n        g()\n        return y\n    print(f())',
        [['1', true], ['2', false], ['None', false], ['UnboundLocalError', false]],
        'Without nonlocal, the assignment in g creates a new local y in g. f\'s own y is untouched, so f returns 1.'),
      mcq('A script sets sum = 0, adds some numbers into it in a loop, and later calls sum([4, 5]). What happens?',
        [["TypeError: 'int' object is not callable", true], ['It returns 9; built-ins cannot be replaced', false], ["NameError: name 'sum' is not defined", false], ['It returns 9 plus whatever sum held', false]],
        'The global sum now holds an int, and LEGB finds the global before the built-in. Calling an int raises TypeError. Rename the variable, for example to total.'),
    ],
    checkpoint: [
      ck(SKILL, 'What does this print?\n\n    def make():\n        n = 0\n        def step():\n            nonlocal n\n            n += 2\n            return n\n        step()\n        return step()\n    print(make())',
        [['4', true], ['2', false], ['0', false], ['SyntaxError', false]],
        'nonlocal makes step assign to make\'s n. The first call raises it to 2 and the second to 4, which make returns.'),
      ck(SKILL, 'Which function needs a global declaration to work, given a module-level list named log?',
        [['def reset(): log = []', true], ['def add(e): log.append(e)', false], ['def size(): return len(log)', false], ['def last(): return log[-1]', false]],
        'Only reset assigns to the name log; without global it would create a new local list and leave the module\'s list alone. The others read the name, and append mutates the list it refers to.'),
      ck(SKILL, 'What does this print?\n\n    x = 1\n    def a():\n        x = 2\n        def b():\n            global x\n            x = 3\n        b()\n        print(x)\n    a()\n    print(x)',
        [['2 and then 3', true], ['3 and then 3', false], ['2 and then 1', false], ['3 and then 1', false]],
        'global x in b skips the enclosing function and rebinds the module-level x to 3. a\'s own local x is still 2, so a prints 2 and the final print shows the global 3.'),
    ],
  },
  {
    unitCode: 'JT_PY_PROJECTS_VENV_PIP',
    notes: `The standard library is not everything: web frameworks, database drivers and HTTP clients come
from **PyPI**, the Python Package Index, and are installed with **pip**. The question is *where*
they get installed.

## Why one environment per project

If every project installs into the one system Python, they share one \`site-packages\`. Project A
needs Django 4.2, project B needs Django 5.1 — only one can be installed. Upgrading for B breaks A,
and nobody can say which packages a project actually needs.

A **virtual environment** is a folder holding a private \`site-packages\` and a \`python\` that uses
it. Each project gets its own; installing into one touches nothing else.

## Creating and activating one

From the project folder:

    python -m venv .venv          (Windows: py -m venv .venv; macOS/Linux: python3 -m venv .venv)

That creates \`.venv/\` with its own interpreter. Now **activate** it, so \`python\` and \`pip\` in this
terminal mean the venv's:

| Shell | Activate | The venv's python |
|---|---|---|
| Windows cmd | \`.venv\\Scripts\\activate.bat\` | \`.venv\\Scripts\\python.exe\` |
| Windows PowerShell | \`.venv\\Scripts\\Activate.ps1\` | \`.venv\\Scripts\\python.exe\` |
| macOS / Linux (bash, zsh) | \`source .venv/bin/activate\` | \`.venv/bin/python\` |

The prompt changes to show \`(.venv)\`, and inside it plain \`python\` works on every OS:

    (.venv) > python -c "import sys; print(sys.prefix)"
    C:\\projects\\invoice-app\\.venv

\`deactivate\` returns you to the normal shell. Activation only changes **that terminal**; a new
terminal starts outside the venv. You do not have to activate at all — running the venv's python
by path (\`.venv\\Scripts\\python.exe app.py\` on Windows, \`.venv/bin/python app.py\` on macOS/Linux)
uses the venv just the same. That is how scripts and schedulers run it.

**PowerShell says "running scripts is disabled on this system"?** That is its execution policy,
not Python. Allow local scripts for your user once:
\`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned\` — or use cmd's \`activate.bat\`.

**VS Code**: *Python: Select Interpreter* and choose the \`.venv\` one; its terminals then activate
the venv automatically.

Never commit \`.venv/\`: it is large, full of machine-specific paths, and rebuilt in a minute. Put it
in \`.gitignore\`. Never copy a venv to another folder either — its paths would point at the old one.

## pip

    python -m pip install requests              # the latest version
    python -m pip install "requests==2.32.3"    # exactly that version
    python -m pip install "django>=4.2,<5"      # a range
    python -m pip install --upgrade requests
    python -m pip uninstall requests
    python -m pip list                          # what is installed here
    python -m pip show requests                 # version, location, what it requires

**Why \`python -m pip\` rather than \`pip\`?** \`pip\` is whichever pip is first on PATH, which may
belong to a different Python than the \`python\` you run. \`python -m pip\` is *that* interpreter's
pip, so the package lands where your program will look. Most "I installed it but I get
ModuleNotFoundError" bugs are exactly this mismatch.

On recent Ubuntu and Debian, \`pip install\` outside a venv refuses with
\`error: externally-managed-environment\`. That is the OS protecting its own Python — the answer is
a venv, not \`--break-system-packages\`.

## Version specifiers

| Specifier | Means |
|---|---|
| \`==2.32.3\` | exactly this version |
| \`>=2.31\` | this or anything newer, including a new major version |
| \`>=4.2,<5\` | any 4.x from 4.2 on |
| \`~=2.31\` | "compatible": \`>=2.31\` and \`==2.*\` |
| \`~=2.31.0\` | \`>=2.31.0\` and \`==2.31.*\` (bug-fix releases only) |

## requirements.txt: rebuilding the environment anywhere

    python -m pip freeze > requirements.txt

\`freeze\` writes every installed package, *including the dependencies of your dependencies*, with
exact versions:

    certifi==2024.8.30
    charset-normalizer==3.4.0
    idna==3.10
    requests==2.32.3
    urllib3==2.2.3

A teammate, a CI server or production then rebuilds the identical set:

    python -m venv .venv
    (activate it)
    python -m pip install -r requirements.txt

Pinning exact versions means "works on my machine" also means "works on yours": a new release of
some library cannot sneak in and break the build. Upgrades become deliberate — change the pin,
test, commit.

## Interview traps

- A venv isolates packages per project; it is not a VM or a container.
- Use \`python -m pip\` so the package goes to the interpreter you run.
- Commit \`requirements.txt\`, never \`.venv/\`.`,
    workedExample: `**Problem.** You clone a teammate's project. It has \`app.py\` and \`requirements.txt\`, and
\`python app.py\` fails with \`ModuleNotFoundError: No module named 'requests'\`. Get it running
without touching any other project.

1. **Create the environment** in the project folder:

        Windows:       py -m venv .venv
        macOS/Linux:   python3 -m venv .venv

2. **Activate it:**

        Windows cmd:         .venv\\Scripts\\activate.bat
        Windows PowerShell:  .venv\\Scripts\\Activate.ps1
        macOS/Linux:         source .venv/bin/activate

   The prompt now starts with \`(.venv)\`.

3. **Install the pinned set:** \`python -m pip install -r requirements.txt\`. pip installs exactly the
   versions listed, into \`.venv\` only.

4. **Check you are using it:** \`python -c "import sys; print(sys.prefix)"\` prints a path ending in
   \`.venv\`, and \`python -m pip show requests\` shows its location inside \`.venv\`.

5. **Run:** \`python app.py\` now works.

6. **Later you add a library** — say \`python -m pip install python-dateutil\`. Regenerate the file
   with \`python -m pip freeze > requirements.txt\` and commit it, so the next person gets it too.
   Check that \`.venv/\` is listed in \`.gitignore\` before you commit.

The reasoning: an import error for a third-party package almost always means "not installed in
**the interpreter that is running**". A venv plus \`python -m pip\` makes those the same thing.`,
    mcqs: [
      mcq('You created .venv in your project on macOS. Which command activates it in bash or zsh?',
        [['source .venv/bin/activate', true], ['.venv\\Scripts\\activate.bat', false], ['python -m venv activate .venv', false], ['pip activate .venv/bin/python', false]],
        'On macOS and Linux the activate script lives in .venv/bin and must be sourced so it changes the current shell. Scripts\\activate.bat is the Windows cmd path, and neither python -m venv nor pip activates anything.'),
      mcq('pip install pandas succeeds, but python app.py still raises ModuleNotFoundError: No module named pandas. What is the most likely cause?',
        [['pip belongs to a different Python than python', true], ['pandas must be imported as Pandas, capitalised', false], ['A package needs a restart of the computer first', false], ['pip installs only into the folder of app.py', false]],
        'The pip first on PATH can belong to another interpreter, so the package went to that one\'s site-packages. Installing with python -m pip guarantees it goes to the interpreter that runs app.py.'),
      mcq('Which specifier accepts 2.31.4 but rejects 2.32.0?',
        [['~=2.31.0', true], ['>=2.31', false], ['~=2.31', false], ['==2.*', false]],
        '~=2.31.0 means at least 2.31.0 and still 2.31.*, so only bug-fix releases qualify. ~=2.31 allows any 2.x from 2.31 on, which includes 2.32.0.'),
    ],
    checkpoint: [
      ck(SKILL, 'Which of these belongs in the project\'s git repository?',
        [['requirements.txt with pinned versions', true], ['The .venv folder, so others skip installing', false], ['The __pycache__ folders with their .pyc files', false], ['A copy of site-packages from your machine', false]],
        'requirements.txt is small and lets anyone rebuild the same environment. .venv, __pycache__ and site-packages are generated, large and full of paths that only work on one machine.'),
      ck(SKILL, 'In PowerShell, .venv\\Scripts\\Activate.ps1 fails with "running scripts is disabled on this system". What is wrong?',
        [['PowerShell\'s execution policy blocks the script', true], ['The venv was created by a different Python version', false], ['Activate.ps1 is only for macOS and Linux shells', false], ['The .venv folder must first be added to PATH', false]],
        'PowerShell refuses to run local scripts under its default policy. Set-ExecutionPolicy -Scope CurrentUser RemoteSigned allows them, or use activate.bat from cmd, or run .venv\\Scripts\\python.exe directly.'),
      ck(SKILL, 'What does python -m pip freeze > requirements.txt write?',
        [['Every installed package with its exact version', true], ['Only the packages that your code imports', false], ['Each package\'s newest version on PyPI', false], ['Only the packages you named on the command line', false]],
        'freeze lists everything in the environment, dependencies of dependencies included, pinned with ==. That is what makes pip install -r rebuild an identical set.'),
    ],
  },
  {
    unitCode: 'JT_PY_PROJECTS_PYPROJECT',
    notes: `requirements.txt says which packages to install. It does not say what *your* project is: its
name, its version, which Python it needs, or how to run it. That is **pyproject.toml**, the one
standard file every modern Python project has at its root.

## A pyproject.toml

    [build-system]
    requires = ["setuptools>=68"]
    build-backend = "setuptools.build_meta"

    [project]
    name = "invoice-app"
    version = "0.3.0"
    description = "Create and total GST invoices from the command line"
    requires-python = ">=3.10"
    dependencies = [
        "requests>=2.31,<3",
    ]

    [project.optional-dependencies]
    dev = ["pytest>=8", "mypy>=1.8"]

    [project.scripts]
    invoice = "invoicing.cli:main"

Reading it:

- **TOML** is a simple config format: \`[tables]\`, \`key = value\`, strings in quotes, lists in
  brackets.
- **[build-system]** names the tool that turns the project into something pip can install
  (setuptools here; hatchling and poetry-core are common alternatives). You rarely touch it.
- **[project]** is the metadata. \`name\` is the *distribution* name (\`invoice-app\`, hyphens fine);
  the package you import is still \`invoicing\`.
- **requires-python** makes pip refuse to install on an older interpreter instead of failing later
  with a confusing SyntaxError.
- **dependencies** are what the project needs at run time — usually **ranges**, not pins.
- **optional-dependencies** groups extras such as dev tools: \`pip install -e ".[dev]"\`.
- **[project.scripts]** creates a command (below).

(Reading TOML from your own code uses \`tomllib\`, which arrived in Python 3.11; on 3.10 you would
need the third-party \`tomli\`. You do not need either to *use* a pyproject.toml.)

## pyproject.toml versus requirements.txt

- **pyproject \`dependencies\`**: what the code needs to work — \`requests>=2.31,<3\`. Ranges, so it
  can coexist with other packages.
- **requirements.txt** (or a lock file): the exact set a deployment ran with —
  \`requests==2.32.3\` plus every sub-dependency. Pins, so every server is identical.

A library publishes only ranges; an application keeps both.

## python -m: running a module or a package

\`python -m name\` finds \`name\` on \`sys.path\` the way \`import\` does and runs it as \`__main__\`.
It adds the **current folder** to \`sys.path\`, which is why it fixes package imports.

To make a package runnable as a whole, give it a **\`__main__.py\`**:

    # invoicing/__main__.py
    from invoicing.cli import main
    main()

    > python -m invoicing
    (the app runs)

Without one:

    > python -m invoicing
    No module named invoicing.__main__; 'invoicing' is a package and cannot be directly executed

You already use this form daily: \`python -m venv\`, \`python -m pip\`, \`python -m json.tool\`,
\`python -m http.server\` are standard-library modules run as programs.

## An entry point

\`invoice = "invoicing.cli:main"\` in \`[project.scripts]\` means: create a command named
\`invoice\` that imports \`invoicing.cli\` and calls its \`main()\` function. pip writes that command
into the environment's scripts folder when the project is installed:

- Windows: \`.venv\\Scripts\\invoice.exe\`
- macOS/Linux: \`.venv/bin/invoice\`

With the venv active, \`invoice\` is then an ordinary terminal command. \`main\` should take no
arguments and read \`sys.argv\` itself (next unit) — and \`return\` a number or call \`sys.exit\` to
set the exit code.

## Installing your own project, editable

From the folder with pyproject.toml, with the venv active:

    python -m pip install -e .
    python -m pip install -e ".[dev]"     (also the dev extras)

\`.\` means "the project in this folder"; \`-e\` means **editable**: instead of copying your code
into site-packages, pip links to your source folder. Edit a file and the next run sees the change
— no reinstall. Reinstall only when pyproject.toml itself changes (a new dependency or a new
script).

After it, \`import invoicing\` works from **any** folder in that environment — tests, scripts, the
REPL — which ends the \`sys.path\` games for good. It is also what makes the \`src/\` layout work.

## Interview traps

- \`python -m pkg\` runs \`pkg/__main__.py\`; \`python pkg/__main__.py\` breaks relative imports.
- Project \`name\` (\`invoice-app\`) and import name (\`invoicing\`) can differ.
- \`pip install -e .\` links to your source, so edits need no reinstall.`,
    workedExample: `**Problem.** Turn a loose folder into a project a teammate can install and run with one command.

Starting point: \`src/invoicing/\` holds \`__init__.py\`, \`tax.py\` and \`cli.py\`. \`cli.py\` has:

    import sys
    from invoicing.tax import gst

    def main():
        amounts = [float(a) for a in sys.argv[1:]]
        for a in amounts:
            print(f"{a:10.2f} + GST {gst(a):8.2f}")
        return 0

1. **Write pyproject.toml** at the root:

        [build-system]
        requires = ["setuptools>=68"]
        build-backend = "setuptools.build_meta"

        [project]
        name = "invoice-app"
        version = "0.1.0"
        requires-python = ">=3.10"
        dependencies = []

        [project.scripts]
        invoice = "invoicing.cli:main"

   (setuptools finds packages under \`src/\` automatically.)

2. **Add src/invoicing/__main__.py** so the package also runs with \`-m\`:

        import sys
        from invoicing.cli import main
        sys.exit(main())

3. **Install it editable** in a fresh venv:

        Windows:      py -m venv .venv  then  .venv\\Scripts\\activate.bat
        macOS/Linux:  python3 -m venv .venv  then  source .venv/bin/activate
        Both:         python -m pip install -e .

4. **Run it two ways**, from any folder: \`invoice 1000 250\` or \`python -m invoicing 1000 250\`.

5. **Change \`gst\`** in tax.py and run again — the new result appears with no reinstall,
   because \`-e\` linked the source.

The reasoning: pyproject.toml describes the project once; \`pip install -e .\` makes it importable
everywhere; \`__main__.py\` and \`[project.scripts]\` give it a single obvious way to run.`,
    mcqs: [
      mcq('You run "python -m invoicing" and get "\'invoicing\' is a package and cannot be directly executed". What is missing?',
        [['An invoicing/__main__.py file', true], ['A main() call in invoicing/__init__.py', false], ['A [project.scripts] table in setup.cfg', false], ['The .py extension on the command line', false]],
        'python -m on a package runs the package\'s __main__ module. Without __main__.py there is nothing to execute; code in __init__.py runs on import but is not the entry point -m looks for.'),
      mcq('In pyproject.toml, what does invoice = "invoicing.cli:main" under [project.scripts] do?',
        [['Installs an invoice command that calls cli.main()', true], ['Runs invoicing/cli.py every time pip installs', false], ['Renames the importable package invoicing to invoice', false], ['Makes main() run whenever invoicing is imported', false]],
        'An entry point tells pip to write a small launcher named invoice into the environment\'s scripts folder; running it imports invoicing.cli and calls main. Nothing runs at install or import time.'),
      mcq('After python -m pip install -e . you change a function in your package. What must you do before the next run sees it?',
        [['Nothing; the install links to the source', true], ['Run pip install -e . again to copy it in', false], ['Delete __pycache__ so the change is found', false], ['Bump the version number in pyproject.toml', false]],
        'An editable install points the environment at your source folder rather than copying it, so edits are picked up immediately. Reinstall only when pyproject.toml changes, such as a new dependency or script.'),
    ],
    checkpoint: [
      ck(SKILL, 'What does requires-python = ">=3.10" in pyproject.toml achieve?',
        [['pip refuses to install it on Python 3.9 or older', true], ['Python 3.10 is downloaded if it is not installed', false], ['The code is converted to run on older versions', false], ['Every import is checked against Python 3.10', false]],
        'requires-python is metadata pip checks before installing. On an older interpreter it stops with a clear message instead of letting the code fail later with a SyntaxError.'),
      ck(SKILL, 'Which line belongs in pyproject.toml\'s dependencies for an app, rather than in its requirements.txt?',
        [['"requests>=2.31,<3"', true], ['urllib3==2.2.3', false], ['certifi==2024.8.30', false], ['idna==3.10', false]],
        'pyproject dependencies state what the code needs, as a range on the packages it imports. Exact pins of every sub-dependency, like urllib3, certifi and idna, are what freeze writes into requirements.txt for a deployment.'),
      ck(SKILL, 'With pyproject.toml\'s name = "invoice-app" and the code in src/invoicing/, what does the code import?',
        [['import invoicing', true], ['import invoice-app', false], ['import invoice_app', false], ['import src.invoicing', false]],
        'The project name is what pip installs and lists; the import name is the package folder, invoicing. A hyphen cannot appear in an import, and with the src layout the package is installed without the src prefix.'),
    ],
  },
  {
    unitCode: 'JT_PY_PROJECTS_STDLIB',
    notes: `Python ships "batteries included": before you write a helper or install a package, check the
standard library. These six modules cover most everyday tasks.

## sys — the running interpreter

    import sys

    print(sys.argv)          # python args.py report.csv --top 3
                             # ['args.py', 'report.csv', '--top', '3']
    data = sys.stdin.read()  # all of standard input, as one string
    sys.exit(1)              # stop now with exit code 1 (0 means success)
    print(sys.version)       # the interpreter version
    print(sys.path)          # where import looks

\`sys.argv[0]\` is the script name; the arguments are strings — convert them yourself. For anything
beyond two arguments, \`argparse\` (also standard) builds a proper command line with \`--help\`.
\`sys.exit("message")\` prints the message to stderr and exits with code 1.

## math

    import math
    math.sqrt(2)             # 1.4142135623730951
    math.ceil(-2.5)          # -2   (towards +infinity)
    math.floor(-2.5)         # -3   (towards -infinity)
    math.gcd(12, 18)         # 6
    math.prod([2, 3, 4])     # 24
    math.pi, math.inf        # constants
    0.1 + 0.2 == 0.3                   # False — float rounding
    math.isclose(0.1 + 0.2, 0.3)       # True — compare floats this way

The built-in \`round\` rounds halves to the **even** neighbour: \`round(2.5)\` is \`2\`, \`round(3.5)\` is
\`4\`. Use \`math.ceil\` and \`math.floor\` when the direction matters (pages needed, whole boxes).

## random

    import random
    random.randint(1, 6)      # 1 to 6 — BOTH ends included
    random.choice(["a", "b"]) # one element
    random.sample(range(50), 5)   # 5 distinct elements
    deck = [1, 2, 3, 4]
    random.shuffle(deck)      # shuffles IN PLACE and returns None
    random.seed(7)            # same seed, same sequence: reproducible tests

\`print(random.shuffle(deck))\` prints \`None\` — the same in-place convention as \`list.sort()\`.
\`random\` is for simulations and games; for passwords and tokens use \`secrets\`.

## datetime — dates, times and differences

    from datetime import date, datetime, timedelta

    d = date(2024, 2, 1)
    (date(2024, 3, 1) - d).days                    # 29 — 2024 is a leap year
    date(2024, 1, 31) + timedelta(days=30)         # date(2024, 3, 1)
    date.fromisoformat("2026-02-28")               # parse YYYY-MM-DD
    date(2026, 11, 6).weekday()                    # 4 — Monday is 0
    date(2026, 11, 6).strftime("%a %d %b")         # 'Fri 06 Nov'

    dt = datetime.strptime("05/11/2026", "%d/%m/%Y")   # parse with a format
    dt.strftime("%A")                              # 'Thursday'
    datetime(2026, 1, 1, 9, 30).isoformat()        # '2026-01-01T09:30:00'
    datetime.now()                                 # the current local date and time

Subtracting two dates gives a \`timedelta\`; adding one moves a date, handling month ends and leap
years for you. A \`timedelta\` stores days and seconds: \`timedelta(hours=36)\` prints as
\`1 day, 12:00:00\` and its \`.days\` is \`1\`. The common codes: \`%Y\` year, \`%m\` month, \`%d\` day,
\`%H:%M\` time, \`%A\` weekday name, \`%b\` short month name.

**The name trap:** the module and its main class are both called \`datetime\`.
\`import datetime\` then \`datetime.now()\` raises \`AttributeError: module 'datetime' has no
attribute 'now'\` — you need \`datetime.datetime.now()\`, or \`from datetime import datetime\`.

## collections — better containers

    from collections import Counter, defaultdict, deque, namedtuple

    Counter("banana").most_common(2)     # [('a', 3), ('n', 2)]
    Counter("banana")["z"]               # 0 — a missing key counts as zero

    groups = defaultdict(list)           # missing keys start as an empty list
    for w in ["apple", "avocado", "banana"]:
        groups[w[0]].append(w)
    dict(groups)       # {'a': ['apple', 'avocado'], 'b': ['banana']}

    recent = deque([1, 2, 3], maxlen=3)
    recent.append(4)   # deque([2, 3, 4], maxlen=3) — the oldest falls off
    # deque: fast append/pop at BOTH ends (appendleft, popleft), unlike list.pop(0)

    Point = namedtuple("Point", "x y")
    p = Point(2, 5)    # Point(x=2, y=5); p.x + p.y is 7

- **Counter** replaces the "if key in d: d[key] += 1 else ..." counting loop. Ties in
  \`most_common\` keep **first-seen order** — if you need "alphabetical on a tie", sort yourself.
- **defaultdict** removes the "create the list if missing" step when grouping.
- **deque** is the right queue (\`popleft\` is fast; \`list.pop(0)\` shifts every element).
- **namedtuple** is a tuple with field names — a lightweight record.

## time — clocks and pauses

    import time
    start = time.perf_counter()
    ...                                   # the work you are timing
    print(f"{time.perf_counter() - start:.3f}s")
    time.sleep(0.5)                       # pause half a second

Use \`perf_counter\` for measuring durations; \`time.time()\` is wall-clock seconds since 1970 and can
jump when the system clock is corrected. For calendar dates, use \`datetime\`, not \`time\`.

## Others worth knowing exist

\`statistics\` (mean, median), \`itertools\`, \`functools\`, \`json\` and \`csv\`, \`pathlib\` and \`os\`,
\`logging\`, \`argparse\`, \`secrets\`, \`unittest\`. Several get their own units later.

## Interview traps

- \`random.randint(a, b)\` includes \`b\`; \`random.shuffle\` returns \`None\`.
- \`import datetime\` gives the module; the class is \`datetime.datetime\`.
- Ties in \`Counter.most_common\` come out in first-seen order, not sorted.`,
    workedExample: `**Problem.** Read a list of order timestamps from standard input, one \`YYYY-MM-DD HH:MM\` per line,
and print how many orders fell on each weekday (most first) and the gap between the first and the
last order.

    import sys
    from collections import Counter
    from datetime import datetime

    def main():
        stamps = []
        by_day = Counter()
        for line in sys.stdin:
            if line.strip():
                stamp = datetime.strptime(line.strip(), "%Y-%m-%d %H:%M")
                stamps.append(stamp)
                by_day[stamp.strftime("%A")] += 1
        for day, count in by_day.most_common():
            print(f"{day}: {count}")
        span = max(stamps) - min(stamps)
        print(f"Span: {span.days} days, {span.seconds // 3600} hours")

    if __name__ == "__main__":
        main()

For the input

    2026-11-02 09:15
    2026-11-02 18:40
    2026-11-05 11:00
    2026-11-09 08:15

the output is

    Monday: 3
    Thursday: 1
    Span: 6 days, 23 hours

Step by step: \`strptime\` turns each line into a \`datetime\`; \`strftime("%A")\` gives the weekday
name; \`Counter\` does the counting and \`most_common()\` the ordering; subtracting the earliest from
the latest gives a \`timedelta\` whose \`.days\` and \`.seconds\` give the span. Four standard modules,
no hand-written date arithmetic, no installs.`,
    mcqs: [
      mcq('What does this print?\n\n    from collections import Counter\n    c = Counter(["x", "y", "x"])\n    c.update(["y", "y"])\n    print(c)',
        [["Counter({'y': 3, 'x': 2})", true], ["Counter({'x': 2, 'y': 2})", false], ["Counter({'y': 2, 'x': 2})", false], ["Counter({'x': 3, 'y': 2})", false]],
        'update adds counts rather than replacing them: y goes from 1 to 3 and x stays 2. A Counter prints its items from the highest count down.'),
      mcq('What does print(date(2024, 1, 31) + timedelta(days=30)) print, with both imported from datetime?',
        [['2024-03-01', true], ['2024-02-30', false], ['2024-02-29', false], ['2024-03-02', false]],
        'January 31 plus 30 days runs through all 29 days of February 2024, a leap year, and lands on March 1. timedelta arithmetic handles month lengths for you, and a date prints in ISO format.'),
      mcq('What does this print?\n\n    import math\n    print(math.ceil(-2.5), math.floor(-2.5), round(2.5))',
        [['-2 -3 2', true], ['-3 -2 3', false], ['-2 -3 3', false], ['-3 -3 2', false]],
        'ceil rounds towards positive infinity (-2) and floor towards negative infinity (-3). The built-in round sends an exact half to the even neighbour, so round(2.5) is 2.'),
    ],
    checkpoint: [
      ck(SKILL, 'A script does "import datetime" and then calls datetime.now(). What happens?',
        [["AttributeError: module 'datetime' has no attribute 'now'", true], ['It prints the current local date and time, as it normally does', false], ["NameError: name 'now' is not defined in the current module", false], ["ImportError: cannot import name 'now' from module 'datetime'", false]],
        'import datetime binds the module, and now is a method of the datetime class inside it. Use datetime.datetime.now(), or from datetime import datetime first.'),
      ck(SKILL, 'What does this print?\n\n    from collections import deque\n    q = deque()\n    q.append(1)\n    q.append(2)\n    q.appendleft(0)\n    print(q.popleft(), q.pop(), list(q))',
        [['0 2 [1]', true], ['1 2 [0]', false], ['0 1 [2]', false], ['2 0 [1]', false]],
        'After the appends the deque is 0, 1, 2. popleft takes 0 from the left, pop takes 2 from the right, and 1 is left.'),
      ck(SKILL, 'Running "python args.py data.csv 5", what is sys.argv[2]?',
        [["'5', the string", true], ['5, the integer', false], ["'data.csv'", false], ["'args.py'", false]],
        'sys.argv[0] is the script name, so index 1 is data.csv and index 2 is the second argument. Every argument arrives as a string; convert it with int() yourself.'),
    ],
  },

  /* ── ending units ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_PY_PROJECTS_DEBUGGING',
    notes: `Bugs in a multi-file project are rarely in the logic. They are in *which file got imported*,
*which interpreter is running*, and *which name a line refers to*. Each has a short path to the
cause.

## 1. "No module named X" for a package you installed

    ModuleNotFoundError: No module named 'requests'

You installed it — but into which Python? Compare the two:

    python -c "import sys; print(sys.executable)"
    python -m pip show requests

If \`pip show\` says "not found", the package went to another interpreter. Activate the project's
venv (\`.venv\\Scripts\\activate.bat\` on Windows, \`source .venv/bin/activate\` on macOS/Linux) and
install with \`python -m pip install requests\`. In VS Code, check the interpreter in the status bar
is the \`.venv\` one — the editor and the terminal can be using different Pythons.

## 2. "No module named X" for your own code

    ModuleNotFoundError: No module named 'shop'

Print where Python is looking, at the top of the failing file:

    import sys; print(sys.path[0])

If it shows a subfolder (\`proj\\tools\`), you ran a script by path from inside the project, and the
package beside it is invisible. Run \`python -m tools.report\` from the project root, or install the
project with \`pip install -e .\`. Do not paper over it with \`sys.path.append\`.

## 3. Relative import with no parent package

    ImportError: attempted relative import with no known parent package

The file was run directly (\`python shop/cart.py\`). Run it as part of its package from the folder
that contains \`shop\`: \`python -m shop.cart\`.

## 4. Your file hides a library

    import json
    print(json.dumps({"a": 1}))
    AttributeError: module 'json' has no attribute 'dumps'

The script itself is called **json.py**, and the script's folder is searched first — so
\`import json\` imported the script. Recent Pythons add a hint ("consider renaming ... since it has
the same name as the standard library module"); 3.10 does not. Check what was imported:

    import json; print(json.__file__)

If the path is yours, rename the file and delete its \`__pycache__\`.

## 5. A circular import

    # users.py                        # billing.py
    from billing import charge        from users import find_user

    def find_user(uid): ...           def charge(uid, amount): ...

\`import users\` starts users.py, whose first line imports billing; billing.py then asks users for
\`find_user\` — but users.py has not got that far, so the name does not exist yet:

    ImportError: cannot import name 'find_user' from partially initialized module 'users'
    (most likely due to a circular import)

(3.10–3.12 wording; 3.13 words it differently.) The fix is structural: move what both need into a
third module (\`accounts.py\`) that imports neither, or have one side \`import users\` and use
\`users.find_user\` inside the function, so the name is looked up at call time, not import time.

## 6. The same name means two things

    import datetime
    print(datetime.now())    # AttributeError: module 'datetime' has no attribute 'now'

and its mirror image, after \`from datetime import datetime\`:

    print(datetime.timedelta(days=1))
    AttributeError: type object 'datetime.datetime' has no attribute 'timedelta'

— now \`datetime\` is the class, not the module. Pick one style per file. Built-ins shadowed by your variables (\`list\`, \`sum\`, \`input\`) produce
the same confusion: \`TypeError: 'list' object is not callable\` means "you assigned to list".

## 7. UnboundLocalError

    UnboundLocalError: ...local variable 'count'...

The function assigns to \`count\` somewhere, so \`count\` is local in all of it. Either declare
\`global count\`, or — better — pass it in and return it.

## The method

Every one of these is answered by asking Python, not guessing: \`sys.executable\` (which
interpreter), \`sys.path\` (where it looks), \`module.__file__\` (what it actually imported), and
\`python -m pip show\` (where a package is). Run the check, read the path, then change one thing.`,
    mcqs: [
      mcq('Your script is saved as json.py and starts with "import json". Calling json.dumps raises AttributeError. Which check confirms the cause fastest?',
        [['print(json.__file__) shows your own path', true], ['print(sys.version) shows an old Python', false], ['pip show json lists the module version', false], ['print(dir()) shows dumps is not defined', false]],
        'module.__file__ says which file was actually imported. If it is your script, the name clash is confirmed; rename the file and remove its __pycache__.'),
      mcq('users.py does "from billing import charge" and billing.py does "from users import find_user". Which change removes the circular import?',
        [['Move the shared code into a module neither imports', true], ['Swap the order of the two from-import lines', false], ['Add an empty __init__.py next to both files', false], ['Import the two modules with from x import *', false]],
        'The cycle exists because each module needs the other while it is still loading. Moving the shared pieces into a third module that imports neither breaks it; reordering or star imports keep the same cycle.'),
      mcq('VS Code shows "Import requests could not be resolved", but python app.py in your activated terminal runs fine. What is the likely cause?',
        [['The editor is using a different interpreter', true], ['requests has to be installed once per file', false], ['The terminal is ignoring the import line', false], ['The file must be saved with a .pyw extension', false]],
        'The terminal runs the venv\'s python, which has requests, while the editor checks code against whichever interpreter it selected. Python: Select Interpreter and choose the .venv one.'),
      mcq('Inside a function, "sorted_items = list(items)" raises TypeError: \'list\' object is not callable. What should you look for?',
        [['An earlier assignment to the name list', true], ['A missing import of list from builtins', false], ['items being a tuple instead of a list', false], ['A list nested deeper than one level', false]],
        'list is a built-in and needs no import. The error says the name list currently holds a list object, so somewhere in scope a line like list = [...] shadowed the built-in.'),
    ],
  },
  {
    unitCode: 'JT_PY_PROJECTS_PRACTICE',
    notes: `Work these in a real project folder, with a venv, so the commands become habit. Then solve the
graded exercise, which is one file, standard library only.

## Exercise 1 — Split a script

Take any earlier 50-line script and split it into \`logic.py\` (functions only) and \`main.py\`
(input, output, the \`if __name__ == "__main__":\` guard). Prove the split: in a REPL,
\`import logic\` must print nothing and ask for nothing.

## Exercise 2 — Make it a package

Move the modules into \`tally/\` with an \`__init__.py\` and a \`__main__.py\`. Run it with
\`python -m tally\` from the parent folder. Then run \`python tally/__main__.py\` and read the error a
relative import gives you.

## Exercise 3 — Environment from scratch

    Windows:       py -m venv .venv      .venv\\Scripts\\activate.bat
    macOS/Linux:   python3 -m venv .venv  source .venv/bin/activate

Install one package, \`python -m pip freeze > requirements.txt\`, delete \`.venv\`, and rebuild it
from the file. Write the steps in a README.

## Exercise 4 — Scope predictions

Before running each, write down the output:

    n = 1
    def a():
        n = 2
        def b():
            nonlocal n
            n = 3
        b()
        return n
    print(a(), n)

(It is \`3 1\`.) Then change \`nonlocal\` to \`global\` and predict again.

## Exercise 5 — Standard library drills

- Count the words in a line and print the three most common with \`Counter\`.
- Read a birth date \`DD-MM-YYYY\` and print the age in whole years and the weekday of birth.
- Simulate 10,000 rolls of two dice with \`random.seed(1)\` and print how often each total appeared.
- Time both \`list.pop(0)\` and \`deque.popleft()\` on 100,000 items with \`time.perf_counter\`.

## The graded exercise

A library loans report from standard input: parse dates with \`datetime\`, count with \`Counter\`,
and break ties deliberately — \`most_common\` alone will not do it.`,
    mcqs: [
      mcq('Which reads the date in the line "Asha 2026-01-05 2026-01-12" into a date object?',
        [['date.fromisoformat(line.split()[1])', true], ['date(line.split()[1])', false], ['date.strptime(line.split()[1])', false], ['datetime.date(line.split()[1])', false]],
        'fromisoformat parses a YYYY-MM-DD string. The date constructor wants three integers, date has no strptime (datetime does, and it needs a format), and datetime.date is the same constructor.'),
      mcq('Counter({"Zoya": 2, "Bala": 2}).most_common(1) returns [("Zoya", 2)]. Why Zoya and not Bala?',
        [['Ties keep the order the keys were first seen', true], ['most_common sorts tied keys in reverse order', false], ['Keys are compared by length, longer first', false], ['The choice among ties is random on each run', false]],
        'most_common sorts by count only, and the sort is stable, so equal counts stay in insertion order. To break ties alphabetically, sort by (-count, name) yourself.'),
      mcq('What does print((date(2024, 3, 10) - date(2024, 2, 20)).days) print?',
        [['19', true], ['18', false], ['20', false], ['17', false]],
        'February 2024 has 29 days, so from the 20th there are 9 days to March 1, plus 10 more to March 10: 19. Subtracting dates gives a timedelta, and .days reads its whole days.'),
      mcq('Which expression gives the full weekday name, such as Monday, for a date d?',
        [['d.strftime("%A")', true], ['d.strftime("%B")', false], ['d.weekday()', false], ['d.strftime("%w")', false]],
        '%A is the full weekday name. %B is the full month name, %w is the weekday as a digit with Sunday as 0, and weekday() returns an int with Monday as 0.'),
    ],
    assignment: {
      title: 'Library Loans Report',
      description: 'Read a list of book loans from standard input and print a six-line report: how many loans, the average loan length, late returns, fines, the top member and the busiest weekday.',
      instructions: `Write a program that reads this input:

- Line 1: an integer **N**, the number of loans (at least 1).
- The next N lines: \`<member> <borrowed> <returned>\` — a one-word member name and two dates in
  \`YYYY-MM-DD\` form. The fields may be separated (and surrounded) by more than one space. The
  return date is never before the borrow date.

A loan lasts \`returned - borrowed\` days. The loan period is **14 days**: a loan of more than 14
days is **late**, and its fine is **Rs 5 for every day over 14**.

Print exactly six lines:

    Loans: <N>
    Average days: <mean loan length, to 1 decimal>
    Late returns: <number of late loans>
    Fines: Rs <total fines, a whole number>
    Top member: <member with the most loans> (<their loan count>)
    Busiest weekday: <weekday of the borrow date with the most loans> (<count>)

**Ties.** If several members share the most loans, print the one that comes first
alphabetically. If several weekdays share the most loans, print the one earliest in the week,
Monday first. (Counter's \`most_common\` alone does not do this.)

**Example.** For the input

    4
    Asha 2026-01-05 2026-01-12
    Ravi 2026-01-05 2026-01-25
    Asha 2026-01-07 2026-01-21
    Meera 2026-01-09 2026-01-10

the loans last 7, 20, 14 and 1 days, so the output is

    Loans: 4
    Average days: 10.5
    Late returns: 1
    Fines: Rs 30
    Top member: Asha (2)
    Busiest weekday: Monday (2)

Ravi's 20-day loan is 6 days over, so Rs 30. Asha's 14-day loan is not late. Two loans began
on Monday 5 January.

**Rules**

- Use only the standard library (\`datetime\`, \`collections\` and so on); no other imports.
- Print the average with \`:.1f\`, so it always has one decimal — \`0.0\`, \`10.5\`.
- The weekday is the full English name: Monday, Tuesday … Sunday.
- Print nothing else — no prompts.

**How it is graded**

Your program is run against the example, a one-loan case and several hidden cases (ties, leap
years, loans across a new year, a loan of exactly 14 or 15 days), and the output is compared line
by line. Spelling, capitals, spaces and punctuation matter.`,
      rubric: [
        { criterion: 'Correct output', description: 'All six lines are right for every test, including ties broken as specified, leap years, loans across a year end and the 14/15-day boundary.', maxPoints: 60 },
        { criterion: 'Standard library used well', description: 'Dates are parsed with datetime and subtracted as timedelta, counting uses Counter or a dict, and no date arithmetic is hand-written.', maxPoints: 25 },
        { criterion: 'Readable', description: 'The loan period and fine are named constants, the work is in a main() behind the __name__ guard, and the report is printed with f-strings.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `# Library loans report. Read the input, then print exactly six lines in the format the
# instructions show. Use the standard library: datetime for the dates, Counter for counting.
import sys
from collections import Counter
from datetime import date


def main():
    lines = sys.stdin.read().splitlines()
    n = int(lines[0])
    for line in lines[1:n + 1]:
        member, borrowed, returned = line.split()
        # TODO: turn borrowed and returned into date objects and work out the days on loan
        # TODO: count late returns, fines, loans per member and loans per weekday
    # TODO: print the six report lines


if __name__ == "__main__":
    main()
`,
        tests: [
          { input: '4\nAsha 2026-01-05 2026-01-12\nRavi 2026-01-05 2026-01-25\nAsha 2026-01-07 2026-01-21\nMeera 2026-01-09 2026-01-10\n', expectedOutput: 'Loans: 4\nAverage days: 10.5\nLate returns: 1\nFines: Rs 30\nTop member: Asha (2)\nBusiest weekday: Monday (2)' },
          { input: '1\nKiran 2026-03-14 2026-03-14\n', expectedOutput: 'Loans: 1\nAverage days: 0.0\nLate returns: 0\nFines: Rs 0\nTop member: Kiran (1)\nBusiest weekday: Saturday (1)' },
          { input: '4\nZoya 2026-02-01 2026-02-05\nBala 2026-02-03 2026-02-04\nZoya 2026-02-08 2026-02-26\nBala 2026-02-10 2026-02-13\n', expectedOutput: 'Loans: 4\nAverage days: 6.5\nLate returns: 1\nFines: Rs 20\nTop member: Bala (2)\nBusiest weekday: Tuesday (2)', isHidden: true },
          { input: '3\n  Ishaan   2024-02-20   2024-03-10\nFatima 2025-12-25 2026-01-15\nIshaan 2024-02-27 2024-03-01\n', expectedOutput: 'Loans: 3\nAverage days: 14.3\nLate returns: 2\nFines: Rs 60\nTop member: Ishaan (2)\nBusiest weekday: Tuesday (2)', isHidden: true },
          { input: '2\nNoor 2026-04-01 2026-04-15\nNoor 2026-04-01 2026-04-16\n', expectedOutput: 'Loans: 2\nAverage days: 14.5\nLate returns: 1\nFines: Rs 5\nTop member: Noor (2)\nBusiest weekday: Wednesday (2)', isHidden: true },
          { input: '7\nArun 2026-05-04 2026-05-06\nBeena 2026-05-05 2026-06-04\nChetan 2026-05-06 2026-05-06\nArun 2026-05-11 2026-05-30\nDiya 2026-05-12 2026-05-13\nBeena 2026-05-13 2026-05-20\nDiya 2026-05-18 2026-05-19\n\n', expectedOutput: 'Loans: 7\nAverage days: 8.6\nLate returns: 2\nFines: Rs 105\nTop member: Arun (2)\nBusiest weekday: Monday (3)', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 60,
      },
    },
  },
  {
    unitCode: 'JT_PY_PROJECTS_INTERVIEW_QUESTION',
    notes: `Three questions that separate someone who has run a real Python project from someone who has
only written scripts.

## Q1. "What actually happens when Python runs import shop.cart?"

**Model answer.** "Python first checks \`sys.modules\`, the cache of already-imported modules; if
\`shop.cart\` is there, it just binds the name and is done. Otherwise it imports the parent package
\`shop\` first — which runs \`shop/__init__.py\` — then searches for \`cart\` inside it. For a top-level
name it searches the folders in \`sys.path\` in order: the script's folder first, then
\`PYTHONPATH\`, the standard library and site-packages. When it finds the file it creates a module
object, puts it in \`sys.modules\` *before* running it, executes the file top to bottom, and finally
binds the name \`shop\` in my namespace. That is why a module's top-level code runs only once, and
why a file named \`json.py\` beside my script hides the real \`json\`."

**Follow-up:** "Why does it put the module in sys.modules before running it?" — "So that circular
imports do not loop forever. The cost is that the second module sees a *partially initialised*
first module, which is where 'cannot import name ... from partially initialized module' comes from.
The fix is to move the shared code into a third module, or import the module rather than names
from it."

## Q2. "Why does this raise UnboundLocalError when count is clearly defined?"

    count = 0
    def hit():
        count += 1

**Model answer.** "Scope is decided when the function is compiled, not line by line. \`count += 1\`
is an assignment, so \`count\` is local to \`hit\` for the whole function, and the read inside \`+=\`
happens before the local has a value. Python never falls back to the global for a name it has
decided is local. Names resolve by LEGB — local, enclosing, global, built-in — and assignment
pins a name to the local scope. I could add \`global count\`, but I would rather have \`hit\` take
the count and return the new value, so it has no hidden state and is easy to test."

**Follow-up:** "When would you use nonlocal?" — "When an inner function needs to update a variable
of the function around it — a counter in a closure, say. global is module level; nonlocal is the
nearest enclosing function."

## Q3. "A teammate says your project works on your machine but not theirs. How do you prevent that?"

**Model answer.** "Three layers. A **virtual environment** per project, so nothing depends on
what happens to be installed globally — \`python -m venv .venv\`, activated with
\`.venv\\Scripts\\activate\` on Windows or \`source .venv/bin/activate\` on macOS and Linux.
**Pinned dependencies** — \`pip freeze > requirements.txt\` or a lock file — committed, so
\`pip install -r requirements.txt\` gives everyone the same versions; \`.venv\` itself is in
\`.gitignore\`. And **pyproject.toml** with \`requires-python\`, so an old interpreter is refused
up front, plus \`pip install -e .\` so imports work from any folder instead of depending on where
someone runs the script. I always install with \`python -m pip\` so the package goes to the
interpreter that will run the code."

**Follow-up:** "Then why not pin exact versions in pyproject.toml too?" — "Because a library's
pyproject has to coexist with other libraries in someone else's environment; exact pins would make
it impossible to install next to anything else. Ranges describe what the code works with; the lock
file or requirements.txt records the exact set one deployment uses."

## How to answer

Name the mechanism (the cache, the search path, compile-time scope), then the consequence you have
actually hit (the hidden \`json\`, the UnboundLocalError), then what you do about it.`,
    mcqs: [
      mcq('An interviewer asks why a module\'s top-level print runs only once even though three files import it. Best answer?',
        [['The first import caches it in sys.modules', true], ['Python merges all three imports into one file', false], ['print is suppressed during a second import', false], ['Only the first file that imports it can run it', false]],
        'After the first import the module object lives in sys.modules, and every later import of that name returns the cached object without re-executing the file.'),
      mcq('Why can a library\'s pyproject.toml list "requests>=2.31,<3" when its deployment\'s requirements.txt pins requests==2.32.3?',
        [['Ranges let it coexist; pins fix one deployment', true], ['pyproject.toml cannot hold an exact version', false], ['pip reads only requirements.txt when installing', false], ['The two files are combined into one at build', false]],
        'A library must install next to other packages, so it states the range it supports. An application records the exact set it was tested with in requirements.txt or a lock file.'),
      mcq('In an interview you are asked which comes first on sys.path when you run "python app/main.py". Which answer is right?',
        [['The folder app, which holds main.py', true], ['site-packages for the active environment', false], ['Every folder listed in the PATH variable', false], ['The standard library\'s own install folder', false]],
        'The running script\'s folder is searched first, before PYTHONPATH, the standard library and site-packages. The shell\'s PATH is for finding programs, not modules.'),
    ],
  },
  {
    unitCode: 'JT_PY_PROJECTS_CHECKPOINT',
    notes: `Ten questions on the whole topic: modules and the import forms, packages and layout, scope and
LEGB, virtual environments and pip, pyproject.toml and \`python -m\`, and the standard library. Each
is a situation from a real project — read every command and snippet as Python would.`,
    checkpoint: [
      ck(SKILL, 'What does python main.py print, with these two files in one folder?\n\n    # config.py\n    print("config loaded")\n    DEBUG = False\n\n    # main.py\n    import config\n    from config import DEBUG\n    print(DEBUG)',
        [['config loaded, then False', true], ['config loaded twice, then False', false], ['False only; the module was cached', false], ['config loaded, then True', false]],
        'The first import runs config.py and caches it. The from-import finds the cached module, runs nothing and copies the name DEBUG, which is False.'),
      ck(SKILL, 'From the folder that contains the shop package, which command runs shop/cart.py so that its "from .prices import total" works?',
        [['python -m shop.cart', true], ['python shop/cart.py', false], ['python -m shop/cart.py', false], ['python shop.cart.py', false]],
        'python -m takes a dotted module name, imports shop first and runs cart as __main__ inside it, so the relative import has a package. Running the file by path loses the package.'),
      ck(SKILL, 'What does this print?\n\n    def outer():\n        items = []\n        def add(x):\n            items.append(x)\n        add(1)\n        add(2)\n        return items\n    print(outer())',
        [['[1, 2]', true], ['[]', false], ['UnboundLocalError', false], ['[2]', false]],
        'add only reads the name items and calls append on the list it refers to, so no nonlocal is needed. Both appends go into outer\'s list.'),
      ck(SKILL, 'On Linux, which command runs app.py with the project\'s .venv without activating it first?',
        [['.venv/bin/python app.py', true], ['.venv/Scripts/python app.py', false], ['python -m venv .venv app.py', false], ['source .venv app.py', false]],
        'The venv\'s own interpreter lives in .venv/bin on macOS and Linux (in .venv\\Scripts on Windows); running it by path uses the venv\'s packages exactly as activation would.'),
      ck(SKILL, 'A teammate pulls your project and runs one command to get the same package versions as you. Which one?',
        [['python -m pip install -r requirements.txt', true], ['python -m pip install --upgrade requirements', false], ['python -m pip freeze > requirements.txt', false], ['python -m venv --copy requirements.txt', false]],
        'install -r installs every line of the file at its pinned version. freeze writes the file instead of reading it, and the other two are not how requirements are installed.'),
      ck(SKILL, 'Your package has __main__.py and pyproject.toml defines report = "tally.cli:main" under [project.scripts]. After pip install -e ., which two commands run the app?',
        [['report and python -m tally', true], ['tally and python -m report', false], ['report and python tally.cli', false], ['main and python -m tally.cli:main', false]],
        'The entry point creates a command named report that calls tally.cli.main. python -m tally runs the package\'s __main__.py. -m takes a module name, not a module:function pair.'),
      ck(SKILL, 'What does this print?\n\n    from collections import Counter\n    print(Counter("mississippi").most_common(2))',
        [["[('i', 4), ('s', 4)]", true], ["[('s', 4), ('i', 4)]", false], ["[('i', 4), ('p', 2)]", false], ["[('m', 1), ('i', 4)]", false]],
        'i and s both appear four times. Ties keep first-seen order, and i is seen (at index 1) before s (at index 2), so i comes first.'),
      ck(SKILL, 'What does this print?\n\n    import random\n    deck = [1, 2, 3]\n    print(random.shuffle(deck))',
        [['None', true], ['[1, 2, 3]', false], ['A shuffled list such as [3, 1, 2]', false], ['TypeError', false]],
        'shuffle rearranges the list in place and returns None, like list.sort. Print deck afterwards to see the new order.'),
      ck(SKILL, 'What does this print?\n\n    from datetime import timedelta\n    gap = timedelta(hours=36)\n    print(gap.days, gap.seconds)',
        [['1 43200', true], ['1.5 0', false], ['0 129600', false], ['36 0', false]],
        'A timedelta normalises to whole days plus leftover seconds: 36 hours is 1 day and 12 hours, and 12 hours is 43200 seconds.'),
      ck(SKILL, 'utils.py has a bare main() call at the bottom, which asks for input. Importing utils in a test makes the test hang. What is the right fix?',
        [['Put the call under if __name__ == "__main__":', true], ['Import it with from utils import * instead', false], ['Call importlib.reload(utils) inside the test', false], ['Rename utils.py so that it starts with _', false]],
        'Top-level code runs on import. Behind the guard, main() runs only when utils.py is the program being run, and importing it just provides the functions.'),
    ],
  },
];
