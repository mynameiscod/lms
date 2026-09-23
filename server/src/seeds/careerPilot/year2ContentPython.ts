/**
 * T2_PY_STRUCTURE and T2_PY_ROBUST — sixteen units. Year 2.
 *
 * ── WHY THESE ARE IN THE BANK ─────────────────────────────────────────────────────────────
 *
 * These two topics are enrichment rather than backbone: a student who already lays out a package
 * cleanly and handles exceptions properly does not need days spent on them, and the composer can
 * spend those days elsewhere.
 *
 * But almost nobody arrives with them. Year 1 taught a single file that runs top to bottom; a
 * second-year project has modules, an environment, files on disk and failures it must survive. That
 * is the gap these two topics close, and the projects in the backbone assume they are closed.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const PYTHON_BUNDLES: PilotBundle[] = [
  /* ── T2_PY_STRUCTURE ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'T2_PY_STRUCTURE_MODULES',
    notes: `A module is a file. Importing one runs it once and gives you its names. That is the whole
mechanism, and everything else in this unit follows from it.

    # pricing.py
    TAX_RATE = 0.18

    def with_tax(amount):
        return amount * (1 + TAX_RATE)

    # main.py
    from pricing import with_tax
    print(with_tax(100))

**The import forms, and when each fits:**

    import pricing              # pricing.with_tax(100) — explicit, good for common names
    from pricing import with_tax  # with_tax(100) — shorter, hides where it came from
    from pricing import *        # never: you no longer know what is in scope

**Splitting by what things are about, not by what they are.** A \`utils.py\` holding forty unrelated
functions is a file nobody can navigate. \`pricing.py\`, \`orders.py\`, \`email.py\` — each about one
subject, each openable with an expectation of what is inside.

**The module-level code trap.** Anything at the top level of a module runs on import. A module that
connects to a database or reads a file when imported makes every test slow and every import a side
effect. Put work inside functions.

**Which is what this line is for:**

    if __name__ == "__main__":
        main()

The code inside runs when the file is executed directly, and not when it is imported. Without it, a
script's work happens every time somebody imports one of its functions.

**Circular imports** happen when two modules import each other, and Python raises or gives you a
half-built module. Three ways out, in order of preference: move the shared thing into a third
module, import inside the function that needs it, or reconsider the split — a circular import is
usually the design telling you those two modules are really one.

**A module is also a boundary.** What it exports is its interface; a leading underscore says "mine,
not yours". Deciding what a module offers is the same thinking as designing a class or an API,
applied one level up.`,
    mcqs: [
      mcq('`from module import *` is discouraged because:',
        [['You no longer know what names are in scope', true],
          ['It imports the module twice', false],
          ['It is slower than named imports', false],
          ['It fails if the module defines a class', false]],
        'Explicit imports tell a reader where each name came from.'),
      mcq('Code at the top level of a module runs:',
        [['Every time the module is imported', true],
          ['Only when the file is executed directly', false],
          ['Once per function call into the module', false],
          ['Only if the module defines no functions', false]],
        'A module that connects to a database on import makes every test slow.'),
      mcq('`if __name__ == "__main__":` exists so that:',
        [['Script work runs on execution but not on import', true],
          ['The module can be imported more than once', false],
          ['Functions are defined before they are used', false],
          ['Python knows which file is the entry point', false]],
        'Without it, importing a helper also runs the script.'),
      mcq('The preferred fix for a circular import is to:',
        [['Move the shared thing into a third module', true],
          ['Import inside the function that needs it', false],
          ['Combine the two modules into one', false],
          ['Reorder the import statements', false]],
        'The other options work; this one usually fixes the design as well.'),
    ],
    checkpoint: [
      mcq('A `utils.py` with forty unrelated functions is a problem because:',
        [['Nobody can navigate it or predict what is inside', true],
          ['Large modules import rather more slowly', false],
          ['Python limits module size', false],
          ['It causes circular imports', false]],
        'Split by subject, not by "these are all functions".'),
      mcq('A leading underscore on a module-level name signals:',
        [['Internal to this module, not part of its interface', true],
          ['A constant that must never be changed', false],
          ['A name Python will not import', false],
          ['A function used only in tests', false]],
        'A module is a boundary, and it has an interface like anything else.'),
    ],
  },

  {
    unitCode: 'T2_PY_STRUCTURE_PACKAGES',
    notes: `A package is a directory of modules. Once a project outgrows a handful of files, its
layout is the first thing a reader meets.

    myapp/
      pyproject.toml          project metadata and dependencies
      README.md
      .gitignore
      src/
        myapp/
          __init__.py         makes this a package
          main.py             entry point
          models.py
          services/
            __init__.py
            pricing.py
            orders.py
      tests/
        test_pricing.py
        test_orders.py

**Importing within a package:**

    from myapp.services.pricing import with_tax
    from .pricing import with_tax        # relative, within the same package

**Prefer absolute imports** for anything a reader might trace. Relative imports are convenient inside
a tightly related package and confusing across one.

**\`__init__.py\`** marks a directory as a package and runs when it is first imported. Keep it small:
a docstring, and at most a few re-exports that define the package's public surface. Heavy work in an
\`__init__.py\` runs whenever anything inside the package is imported.

**Tests live outside the package**, mirroring its structure. That way they import the package the
way a user would, which catches "it only works because the file was beside it".

**The src layout** — the package inside a \`src/\` directory — exists for exactly that reason: it is
impossible to import the package accidentally from the working directory, so your tests exercise
what would actually be installed.

**One entry point.** \`main.py\`, or a console script declared in \`pyproject.toml\`. Several files
that can each be run as a program is a project nobody knows how to start.

**Where things go, when you are unsure:** data models together, business logic in services, anything
touching the outside world (HTTP, files, the database) in its own module. That is the layering from
the clean code topic, expressed as directories.

**The test of a layout:** hand it to somebody who has never seen it and ask where they would add a
new feature. If they guess right, it is working.`,
    mcqs: [
      mcq('`__init__.py` should generally be kept small because:',
        [['It runs whenever anything inside the package is imported', true],
          ['Python limits its size', false],
          ['Large ones break relative imports', false],
          ['It is not included when packaging', false]],
        'A docstring and a few re-exports is usually all it needs.'),
      mcq('Tests live outside the package so that they:',
        [['Import it the way a real user would', true],
          ['Run faster without package overhead', false],
          ['Can be excluded from version control', false],
          ['Avoid circular imports with the code', false]],
        'It catches "it only works because the file was beside it".'),
      mcq('The `src/` layout exists to:',
        [['Prevent accidentally importing from the working directory', true],
          ['Separate source files from compiled ones', false],
          ['Allow several packages in one project', false],
          ['Satisfy the packaging tools', false]],
        'Your tests then exercise what would actually be installed.'),
      mcq('Absolute imports are preferred to relative ones because:',
        [['A reader can trace where the name came from', true],
          ['They are faster at runtime', false],
          ['Relative imports fail in packages', false],
          ['They work outside a package too', false]],
        'Relative imports are fine within a tightly related package.'),
    ],
    checkpoint: [
      mcq('Several files that can each be run as a program is a problem because:',
        [['Nobody knows how to start the project', true],
          ['Python allows only one entry point', false],
          ['Imports become circular', false],
          ['Packaging tools reject it', false]],
        'One entry point, or a declared console script.'),
      mcq('The practical test of a project layout is whether:',
        [['A newcomer guesses correctly where a feature goes', true],
          ['Every directory has the same depth', false],
          ['No module exceeds two hundred lines', false],
          ['The import statements are all fully absolute', false]],
        'If they guess right, the layout is doing its job.'),
    ],
  },

  {
    unitCode: 'T2_PY_STRUCTURE_SCOPE',
    notes: `Scope decides which value a name has at a given point. Most scope bugs are silent — the
code runs and does the wrong thing.

**The order Python looks in: Local, Enclosing, Global, Built-in.**

    x = "global"

    def outer():
        x = "enclosing"
        def inner():
            print(x)        # "enclosing" — found before global
        inner()

**Assignment creates a local name**, and this is the rule behind the confusing error:

    count = 0

    def increment():
        count = count + 1       # UnboundLocalError

Python sees the assignment, decides \`count\` is local to the function, and then the right-hand side
reads it before it exists. Reading a global works; assigning to one makes it local.

**\`global\` and \`nonlocal\` exist**, and are almost always the wrong answer:

    def increment():
        global count            # works, and makes the function untestable
        count += 1

**Take a parameter and return a value instead.** A function whose behaviour depends on module state
cannot be tested in isolation, cannot be called twice safely, and changes behaviour depending on what
ran before it.

**Shadowing built-ins** is the other common one:

    list = [1, 2, 3]        # list() is now unavailable in this scope
    id = 42                 # so is id()

It works until the line that needs the original, and then the error is bewildering.

**The mutable default argument**, which catches everybody once:

    def add_item(item, basket=[]):      # the SAME list every call
        basket.append(item)
        return basket

The default is created once, when the function is defined, so the list persists across calls.

    def add_item(item, basket=None):
        basket = [] if basket is None else basket

**Loops do not create a scope** in Python, so a loop variable survives afterwards — and a closure
made inside a loop captures the variable, not its value at the time.`,
    mcqs: [
      mcq('`count = count + 1` inside a function, with `count` defined globally, raises because:',
        [['The assignment makes count local, so the read fails', true],
          ['Globals cannot be read inside functions', false],
          ['The global keyword is required to read it', false],
          ['Integers are immutable', false]],
        'Reading a global works; assigning to one makes the name local.'),
      mcq('Using `global` in a function makes it:',
        [['Untestable in isolation and unsafe to call twice', true],
          ['Slower, but otherwise equivalent', false],
          ['Impossible to import from another module', false],
          ['Thread-safe by default', false]],
        'Take a parameter and return a value instead.'),
      mcq('`def add(item, basket=[])` is a bug because:',
        [['The default list is created once and shared by every call', true],
          ['Lists cannot be default arguments', false],
          ['The list is recreated on each call, losing data', false],
          ['Mutable defaults are evaluated lazily', false]],
        'Use None as the default and create the list inside.'),
      mcq('Assigning `list = [1, 2, 3]` causes trouble because:',
        [['The built-in list() is shadowed in that scope', true],
          ['Python reserves that name', false],
          ['It changes the type of every list', false],
          ['It raises immediately', false]],
        'It works until the line that needs the original.'),
    ],
    checkpoint: [
      mcq('Python resolves a name by looking in this order:',
        [['Local, enclosing, global, built-in', true],
          ['Global, local, enclosing, built-in', false],
          ['Built-in, global, enclosing, local', false],
          ['Local, global, built-in, enclosing', false]],
        'The enclosing scope is what makes nested functions work.'),
      mcq('A loop variable in Python after the loop ends is:',
        [['Still in scope, holding its last value', true],
          ['Deleted automatically', false],
          ['Reset to its initial value', false],
          ['Only accessible inside the loop body', false]],
        'Loops do not create a scope, which also affects closures made inside them.'),
    ],
  },

  {
    unitCode: 'T2_PY_STRUCTURE_VIRTUAL_ENVIRONMENTS',
    notes: `Two projects need different versions of the same library. Without virtual environments
that is a genuine conflict; with them it is not a problem at all.

    python -m venv .venv               # create one, in the project
    source .venv/bin/activate          # macOS and Linux
    .venv\\Scripts\\activate             # Windows
    pip install requests
    deactivate

**What it actually is:** a directory holding its own Python and its own packages. Activating it puts
that directory first on your PATH, so \`python\` and \`pip\` mean the ones inside it.

**\`.venv\` goes in \`.gitignore\`.** It is large, machine-specific, and rebuildable in seconds. What
you commit is the list of what to install.

**A requirements file that actually reproduces:**

    pip freeze > requirements.txt     # everything, with exact versions

    # requirements.txt
    requests==2.31.0
    python-dotenv==1.0.0

**Pinned versions matter.** \`requests\` without a version installs whatever is current, which means
your machine and the server can be running different code — and "works locally, fails in production"
has no better-known cause.

**Recreating it elsewhere:**

    python -m venv .venv && source .venv/bin/activate
    pip install -r requirements.txt

**The check that it works:** delete your environment, recreate it from the file, and run the tests.
If they pass, somebody else can run your project. If they do not, you have been depending on
something installed globally and forgotten.

**When something behaves inexplicably:**

    which python        # which interpreter is running
    pip list            # what this environment actually has
    echo $VIRTUAL_ENV   # am I in one at all

Most "module not found" errors are a package installed into a different environment from the one
running the code.

**Newer tools** — Poetry, uv, pipenv — do the same job with lock files and nicer ergonomics, and
\`pyproject.toml\` is where modern projects declare dependencies. The concept is identical: isolated
environments, declared and reproducible.`,
    mcqs: [
      mcq('Activating a virtual environment works by:',
        [['Putting its directory first on your PATH', true],
          ['Replacing the system Python installation', false],
          ['Setting an environment variable Python reads at import', false],
          ['Creating a symlink in the project folder', false]],
        'So python and pip mean the ones inside it.'),
      mcq('`.venv` is excluded from version control because:',
        [['It is large, machine-specific and rebuildable', true],
          ['It contains credentials', false],
          ['Git cannot handle binary files in it', false],
          ['It changes on every install', false]],
        'What you commit is the list of what to install.'),
      mcq('Unpinned versions in a requirements file cause:',
        [['Different code on your machine and the server', true],
          ['Slower installation', false],
          ['Packages to be installed globally', false],
          ['Conflicts between virtual environments', false]],
        '"Works locally, fails in production" has no better-known cause.'),
      mcq('The way to verify your requirements file is complete is to:',
        [['Delete the environment, rebuild from it, and run the tests', true],
          ['Compare it against pip list', false],
          ['Install it on a second machine', false],
          ['Check every import has an entry', false]],
        'Anything installed globally and forgotten shows up immediately.'),
    ],
    checkpoint: [
      mcq('Most "module not found" errors are caused by:',
        [['The package being installed in a different environment', true],
          ['A typo somewhere in the import statement', false],
          ['A missing __init__.py file', false],
          ['An outdated pip version', false]],
        'which python and pip list answer it in two commands.'),
      mcq('Poetry, uv and pipenv differ from venv mainly by:',
        [['Adding lock files and better ergonomics for the same concept', true],
          ['Removing the need for isolation', false],
          ['Installing packages globally instead', false],
          ['Replacing pip with an entirely different tool', false]],
        'Isolated environments, declared and reproducible, either way.'),
    ],
  },

  {
    unitCode: 'T2_PY_STRUCTURE_TYPE_HINTS',
    notes: `Type hints say what a function expects and returns. Python ignores them at runtime; your
editor and a type checker do not.

    def with_tax(amount: float, rate: float = 0.18) -> float:
        return amount * (1 + rate)

    def find_customer(customer_id: int) -> Customer | None:
        ...

**What they buy:**

- **Your editor autocompletes properly**, because it knows what it is holding
- **A type checker catches mistakes before running** — passing a string where a number belongs
- **They document the function** in a way that cannot drift from the code, unlike a comment
- **Refactoring becomes safer**, because a changed signature is visible everywhere it matters

**The ones worth knowing:**

    from typing import Optional

    names: list[str]
    scores: dict[str, int]
    pair: tuple[int, str]
    maybe: str | None            # or Optional[str]

**\`str | None\` is the most valuable hint in ordinary code**, because "this might be nothing" is the
fact most often forgotten. A function returning \`Customer | None\` tells every caller, at the point
of calling, that a missing case exists.

**Running the checker:**

    pip install mypy
    mypy src/

**Add hints to public functions first.** The boundary of a module is where they pay most; a small
local helper gains little.

**They are not enforced at runtime.** Passing a string to something annotated \`int\` runs and fails
later, or worse, succeeds strangely. Hints are a tool for finding mistakes early, not a guarantee —
validation still belongs at the boundary.

**Do not over-annotate.** A hint that takes three lines to express is usually telling you the
function does too much. Simplify the function instead of describing the complexity precisely.

**On an existing codebase**, add them gradually: the module you are changing, then its neighbours.
A checker configured to complain about everything on day one gets switched off by the end of the
week.`,
    mcqs: [
      mcq('Type hints are enforced:',
        [['By a checker or editor, never at runtime', true],
          ['At runtime, raising on a wrong type', false],
          ['Only inside functions that declare them', false],
          ['At import time for the whole module', false]],
        'They find mistakes early; validation still belongs at the boundary.'),
      mcq('`Customer | None` as a return type tells every caller:',
        [['That a missing case exists and must be handled', true],
          ['That the function may raise', false],
          ['That the value is optional to use', false],
          ['That None is returned on error only', false]],
        '"This might be nothing" is the fact most often forgotten.'),
      mcq('Hints should be added first to:',
        [['Public functions, at the boundary of a module', true],
          ['Small local helpers', false],
          ['Test functions', false],
          ['Everything at once, for consistency', false]],
        'That is where they pay most.'),
      mcq('A type hint that takes three lines to express usually indicates:',
        [['The function does too much', true],
          ['The checker needs configuring', false],
          ['A newer Python version is required', false],
          ['A custom type should be imported', false]],
        'Simplify the function rather than describing the complexity precisely.'),
    ],
    checkpoint: [
      mcq('Type hints document a function better than a comment because:',
        [['They cannot drift away from the code', true],
          ['They are shorter to write', false],
          ['They appear in generated documentation', false],
          ['Comments are not read by editors', false]],
        'A comment saying "takes a list" survives the change to a dictionary.'),
      mcq('Adding a strict type checker to an existing codebase all at once:',
        [['Produces so much noise that it gets switched off', true],
          ['Is the fastest route to full coverage', false],
          ['Breaks the code at runtime', false],
          ['Is required before any hints are useful', false]],
        'Module by module, starting where you are already working.'),
    ],
  },

  {
    unitCode: 'T2_PY_STRUCTURE_DEBUGGING',
    notes: `Structure problems produce a small family of errors, and each one has an obvious cause
once you have met it.

**\`ModuleNotFoundError: No module named 'myapp'\`.** Python cannot find it. Either you are running
from the wrong directory, the package is not installed, or you are in the wrong environment. Check,
in this order:

    which python
    pip list | grep myapp
    python -c "import sys; print(sys.path)"

**\`ImportError: cannot import name 'x' from partially initialized module\`.** A circular import.
The message names both modules; one of them imports the other while still being built.

**\`AttributeError: module 'x' has no attribute 'y'\`** where \`y\` clearly exists. Usually a file of
yours named the same as a library — a local \`random.py\` or \`json.py\` shadows the real one, and it
is found first.

**\`UnboundLocalError\`.** An assignment somewhere in the function made a name local. Find the
assignment, and pass the value in instead.

**"It works when I run it from this folder but not that one."** Relative paths. A file opened as
\`"data.csv"\` is relative to where the command was run, not to the script:

    from pathlib import Path
    DATA = Path(__file__).parent / "data.csv"

**"It works for me."** Almost always the environment: something installed globally on your machine
and absent from the requirements file. Delete the environment, rebuild it from the file, and the
problem reproduces on your own machine.

**Two modules with the same name** in different packages, one shadowing the other, is the hardest of
these to see. \`print(module.__file__)\` says exactly which file was loaded, and settles it in one
line.

**The general method:** find out what Python actually loaded, from where, using which interpreter.
\`sys.path\`, \`module.__file__\` and \`which python\` answer all three, and between them they
explain nearly every import problem.`,
    mcqs: [
      mcq('`AttributeError: module has no attribute` for something that clearly exists suggests:',
        [['A local file shadowing a library of the same name', true],
          ['A circular import', false],
          ['A missing __init__.py', false],
          ['An outdated package version', false]],
        'A local random.py or json.py is found before the real one.'),
      mcq('"Partially initialized module" in an ImportError means:',
        [['A circular import between the two named modules', true],
          ['The module failed to compile', false],
          ['A missing dependency in requirements', false],
          ['The interpreter was interrupted', false]],
        'One imports the other while still being built.'),
      mcq('A file opened as `"data.csv"` is relative to:',
        [['Where the command was run, not the script', true],
          ['The script\'s own directory', false],
          ['The package root', false],
          ['The virtual environment directory', false]],
        'Path(__file__).parent is how you anchor it to the script.'),
      mcq('`module.__file__` answers:',
        [['Exactly which file was loaded for that name', true],
          ['Whether the module is a package', false],
          ['Which environment is active', false],
          ['When the module was last changed', false]],
        'It settles a shadowing question in one line.'),
    ],
    checkpoint: [
      mcq('"It works for me" is usually explained by:',
        [['Something installed globally and missing from requirements', true],
          ['A different operating system on the server', false],
          ['A stale bytecode cache', false],
          ['An editor setting', false]],
        'Rebuild the environment from the file and it reproduces locally.'),
      mcq('The three questions that explain nearly every import problem are:',
        [['What was loaded, from where, and by which interpreter', true],
          ['Which version, which platform, which shell', false],
          ['Which directory, which package, which branch', false],
          ['What is installed, what is imported, what is exported', false]],
        'sys.path, module.__file__ and which python answer them.'),
    ],
  },

  {
    unitCode: 'T2_PY_STRUCTURE_PRACTICE',
    notes: `No new ideas. Take structure that is wrong and make it right, several times.

**Do these:**

1. **Split a monolith.** Take a single file of 300 lines or more — one of yours — and split it into
   modules by subject. Nothing may change behaviour, and the tests must still pass.
2. **Build a package from scratch.** Directory layout, \`__init__.py\`, an entry point, tests
   outside, importable by its proper name.
3. **Cause a circular import deliberately**, read the error, then fix it three different ways and
   say which you would keep.
4. **Break your own environment.** Delete \`.venv\`, rebuild it from requirements, and run the tests.
   Fix whatever was missing from the file.
5. **Shadow a built-in on purpose** — name a variable \`list\` — and find the point where it breaks.
6. **Hit the mutable default bug.** Write it, call the function three times, watch the list grow.
7. **Add type hints** to a module you wrote earlier, run mypy, and fix what it finds. Record anything
   it caught that was a real bug.
8. **Fix a path bug.** Write a script that reads a file with a relative path, run it from another
   directory, watch it fail, and fix it with \`pathlib\`.

**Record for each:** what the error message was, and what it turned out to mean. Import errors are a
small family, and recognising them by their message is most of the skill.

**The reason this is practice rather than reading:** these errors are unmistakable once you have
caused them yourself and nearly opaque when you have only read about them. Ten minutes causing each
one is worth an hour of notes.`,
    mcqs: [
      mcq('Splitting a monolith into modules must:',
        [['Leave behaviour unchanged, with tests still passing', true],
          ['Improve performance measurably', false],
          ['Reduce the total number of lines', false],
          ['Remove every circular dependency first', false]],
        'It is a refactor, and a refactor that changes behaviour is a rewrite.'),
      mcq('Fixing a circular import three different ways teaches:',
        [['Which fix is best for which situation', true],
          ['That Python allows circular imports', false],
          ['How to avoid packages entirely', false],
          ['That the error message is unreliable', false]],
        'Third module, local import, or rethinking the split.'),
      mcq('Deleting `.venv` and rebuilding from requirements finds:',
        [['Dependencies you installed and never recorded', true],
          ['Packages with security vulnerabilities', false],
          ['Version conflicts between packages', false],
          ['Unused imports in your code', false]],
        'The commonest reason a project works only on its author\'s machine.'),
      mcq('Running mypy on an older module of yours often catches:',
        [['A real bug, not only a missing annotation', true],
          ['Performance problems in loops', false],
          ['Unused variables and imports', false],
          ['Security issues in dependencies', false]],
        'Usually a None that was never handled.'),
      mcq('These errors are practised rather than read about because:',
        [['They are unmistakable once caused and opaque when only read', true],
          ['The documentation does not cover them', false],
          ['They differ between Python versions', false],
          ['They cannot be reproduced reliably', false]],
        'Ten minutes causing each is worth an hour of notes.'),
    ],
    checkpoint: [
      mcq('Recording what each error message turned out to mean builds:',
        [['Recognition of a small family of import errors', true],
          ['A reference for the documentation', false],
          ['Evidence for the assessment', false],
          ['A list of the Python version differences', false]],
        'Recognising them by their message is most of the skill.'),
      mcq('Running a script from a different directory to expose a path bug demonstrates:',
        [['That relative paths depend on the working directory', true],
          ['That scripts should always be installed', false],
          ['That pathlib is faster than os.path', false],
          ['That data files belong outside the package', false]],
        'Path(__file__).parent anchors it to the script instead.'),
    ],
  },

  {
    unitCode: 'T2_PY_STRUCTURE_MINI_PROJECT',
    notes: `Take a working single-file program and turn it into a project somebody else could work
in — without changing what it does.

**Why restructure rather than build fresh.** Restructuring forces you to find the seams in code that
has none, which is the real skill. Starting from an empty directory lets you arrange things neatly
because nothing is in the way yet.

**What is being assessed:** that behaviour is genuinely unchanged, that the split is by subject
rather than by convenience, that the project installs and runs from a clean clone, and that you can
explain why each piece went where it did.

**Build it in this order:**

1. **Get it under test first.** Even a few tests covering the main paths — otherwise you cannot know
   you preserved behaviour.
2. **Find the seams**: which parts are about the same subject, what touches the outside world, what
   is pure logic.
3. **Move one thing at a time**, running the tests after each move.
4. **Add the packaging**: layout, entry point, requirements, README.
5. **Prove it**: clean clone, fresh environment, run and test.

The brief, requirements and deliverables are in the assignment attached to this unit.`,
    assignment: {
      title: 'Mini Project — From One File to a Project',
      description: 'Restructure a working single-file program into a proper package, with behaviour preserved and proved by tests.',
      instructions: `**The brief**

Take a working program of **at least 250 lines in a single file** — one of yours, or one provided —
and turn it into a maintainable project. The behaviour at the end must be identical.

**Requirements**

1. **Tests first**, covering the main paths, written against the original single file and passing
   before you move anything.
2. **A package layout** with a clear entry point, modules split by subject, and tests outside the
   package.
3. **Every module explained**: one line each on what it is about and what it does not contain.
4. **No behaviour change.** The same inputs produce the same outputs, proved by the tests passing
   before and after.
5. **A virtual environment and requirements file** that reproduces from scratch.
6. **Type hints** on the public functions of each module.
7. **A README** with what it does, how to install it, how to run it and how to test it.
8. **A commit per move**, so the restructuring can be followed step by step.

**What to submit**

1. The repository, before and after (a branch or a tagged starting commit).
2. The **module map**: each module, its subject, and why that split rather than another.
3. **Proof of unchanged behaviour**: the tests passing on the original, and passing after.
4. A **clean-clone transcript**: clone, create the environment, install, run, test.
5. A **short write-up** (250–350 words): the piece that was hardest to separate and why; one split
   you tried and reversed; what the original file made difficult that the package now makes easy.

**Constraints**

- Behaviour identical. Improvements go in a separate branch, if at all.
- No secrets, no absolute paths from your machine.
- Tests must pass from a clean clone with only the README followed.

**Where the marks are.** The proof of unchanged behaviour and the module map. Moving code into
folders is easy; showing it still does the same thing, and explaining why each piece belongs where it
is, is the exercise.`,
      rubric: [
        {
          criterion: 'Behaviour preserved',
          description: 'Tests written first against the original, passing before and after; no functional change introduced during the move.',
          maxPoints: 30,
        },
        {
          criterion: 'Structure',
          description: 'Modules split by subject with clear boundaries; tests outside the package; one entry point; layout a newcomer can navigate.',
          maxPoints: 25,
        },
        {
          criterion: 'Reproducibility',
          description: 'Clean clone installs and runs from the README alone; requirements complete; no machine-specific paths.',
          maxPoints: 20,
        },
        {
          criterion: 'Explanation',
          description: 'Module map justifying each split, including what each module deliberately excludes.',
          maxPoints: 15,
        },
        {
          criterion: 'Write-up',
          description: 'Honest about the hardest separation, a reversed decision, and what the new structure makes easier.',
          maxPoints: 10,
        },
      ],
      totalPoints: 100,
    },
  },

  /* ── T2_PY_ROBUST ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'T2_PY_ROBUST_EXCEPTIONS',
    notes: `An exception is how Python says "I cannot continue with this". Handling them well means
catching what you can actually do something about, and letting the rest surface.

    try:
        config = load_config(path)
    except FileNotFoundError:
        config = DEFAULT_CONFIG          # a real recovery
    except PermissionError:
        raise                            # not ours to fix — let it surface

**The bare except is the mistake this unit exists to prevent:**

    try:
        process(data)
    except:                    # catches everything, including your typo
        pass                   # and hides it forever

That block catches a misspelled variable name, a keyboard interrupt, and a genuine bug, then
silently continues with wrong data. Every hour anybody later spends wondering why the numbers are
wrong starts here.

**Catch the narrowest exception you can name**, and only where you have a real response.

**Raising your own:**

    class InsufficientStock(Exception):
        """Raised when an order exceeds available stock."""

    if requested > available:
        raise InsufficientStock(f"requested {requested}, only {available} available")

A custom exception lets callers handle your specific failure without catching everything else, and
the message should say what happened and with what values.

**\`finally\` runs whatever happens** — exception, return, or normal completion — which is where
cleanup belongs:

    try:
        conn = connect()
        return conn.fetch(query)
    finally:
        conn.close()

**A context manager is the better form** of that, and the reason \`with\` exists.

**Do not use exceptions for ordinary control flow.** A missing dictionary key on the normal path is
a \`get\` with a default, not a \`try\`. Exceptions are for the exceptional.

**Never swallow silently.** If you catch something and carry on, log it with enough detail that
somebody could investigate. An empty \`except\` block is a decision to never find out.`,
    mcqs: [
      mcq('A bare `except:` is dangerous because it:',
        [['Catches your own typos and hides them forever', true],
          ['Is slower than catching a specific type', false],
          ['Cannot re-raise the original error', false],
          ['Only works at module level', false]],
        'A misspelled variable is caught, and the program continues with wrong data.'),
      mcq('You should catch an exception only where:',
        [['You have a real response to it', true],
          ['It is likely to occur', false],
          ['The function has a return value', false],
          ['The caller cannot handle it', false]],
        'Otherwise let it surface to somebody who can.'),
      mcq('`finally` runs:',
        [['On exception, on return, and on normal completion', true],
          ['Only when an exception was raised', false],
          ['Only if no exception was raised', false],
          ['Before the except block', false]],
        'Which is why cleanup belongs there — or better, in a context manager.'),
      mcq('A custom exception class lets callers:',
        [['Handle your specific failure without catching everything', true],
          ['Avoid using try blocks', false],
          ['Retry the operation automatically', false],
          ['Receive a return value instead of an error', false]],
        'And the message should carry the values involved.'),
    ],
    checkpoint: [
      mcq('A missing dictionary key on the normal path should be handled with:',
        [['get() and a default, not a try block', true],
          ['A try/except KeyError', false],
          ['A custom exception', false],
          ['A check with the in operator inside a try', false]],
        'Exceptions are for the exceptional.'),
      mcq('Catching an exception and continuing without logging is:',
        [['A decision to never find out what happened', true],
          ['Acceptable when the failure is expected', false],
          ['Required to keep a service running', false],
          ['Equivalent to re-raising it later', false]],
        'If you carry on, log enough that somebody could investigate.'),
    ],
  },

  {
    unitCode: 'T2_PY_ROBUST_FILES',
    notes: `Files are where most programs meet the real world, and the real world is full of files
that are missing, locked, enormous or in the wrong encoding.

    with open("data.csv", encoding="utf-8") as f:
        for line in f:
            process(line)

**\`with\` closes the file**, including when something raises inside the block. Opening without it
leaks a handle on every exception, and a long-running process eventually runs out.

**The modes:**

| Mode | Does |
|---|---|
| \`"r"\` | Read — the default, fails if missing |
| \`"w"\` | Write — **truncates an existing file immediately** |
| \`"a"\` | Append |
| \`"x"\` | Create, failing if it exists |
| \`"rb"\` / \`"wb"\` | Binary, for images and anything not text |

**\`"w"\` destroys the file the moment it opens**, before you write anything. A crash on the next
line leaves you with nothing. For anything that matters, write to a temporary file and rename it
when it is complete — a rename is atomic, so the original survives until the new one is whole.

**Always pass the encoding.** Without it, Python uses the platform default, which differs between
your machine and the server: a file written on one and read on the other produces a
\`UnicodeDecodeError\` for the first accented character or emoji. \`encoding="utf-8"\`, every time.

**Iterate rather than read.** \`f.read()\` on a 2GB log loads 2GB into memory. Looping over the file
handle reads a line at a time and works at any size.

**Paths with \`pathlib\`:**

    from pathlib import Path

    data = Path(__file__).parent / "data" / "input.csv"
    if data.exists():
        text = data.read_text(encoding="utf-8")

That also solves the Windows-versus-Unix separator problem, which string concatenation does not.

**The failures to handle explicitly:** the file is missing, the directory is not writable, the disk
is full, and another process is holding it. Each produces a different exception, and the useful
response differs for each.`,
    mcqs: [
      mcq('Opening a file with mode `"w"`:',
        [['Truncates it immediately, before anything is written', true],
          ['Creates a backup of the original first', false],
          ['Fails if the file already exists', false],
          ['Appends to the end of the file', false]],
        'A crash on the next line leaves you with nothing.'),
      mcq('Passing `encoding="utf-8"` explicitly prevents:',
        [['A decode error when the platform default differs', true],
          ['The file being locked by another process', false],
          ['Binary data being misread as text', false],
          ['Line endings being converted', false]],
        'A file written on one machine and read on another fails at the first accented character.'),
      mcq('The safe way to overwrite an important file is to:',
        [['Write a temporary file and rename it when complete', true],
          ['Open it with mode "a" and truncate afterwards', false],
          ['Read it fully into memory first', false],
          ['Write with a larger buffer size', false]],
        'A rename is atomic, so the original survives until the new one is whole.'),
      mcq('`f.read()` on a very large file:',
        [['Loads the whole thing into memory', true],
          ['Reads lazily by default', false],
          ['Raises a MemoryError immediately', false],
          ['Reads only the first megabyte', false]],
        'Loop over the file handle instead; it works at any size.'),
    ],
    checkpoint: [
      mcq('`with open(...)` guarantees that the file is closed:',
        [['Even when something raises inside the block', true],
          ['Only when the block completes normally', false],
          ['When the variable goes out of scope', false],
          ['At the end of the program', false]],
        'Without it, a long-running process leaks a handle per exception.'),
      mcq('`pathlib` is preferred to joining path strings because:',
        [['It handles separators correctly on every platform', true],
          ['It is faster than plain string concatenation', false],
          ['It validates that the path exists', false],
          ['It supports longer paths', false]],
        'Also more readable than nested os.path.join calls.'),
    ],
  },

  {
    unitCode: 'T2_PY_ROBUST_JSON',
    notes: `JSON is how programs exchange structured data. Python maps it to dictionaries and lists,
and the mapping is almost, but not quite, direct.

    import json

    data = json.loads(text)                   # string to Python
    text = json.dumps(data, indent=2)         # Python to string

    with open("config.json", encoding="utf-8") as f:
        config = json.load(f)                 # from a file

    with open("out.json", "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)          # to a file

**What survives the round trip:** dict, list, str, int, float, bool, None. **What does not:** tuples
become lists, sets and dates raise \`TypeError\`, and dictionary keys that are not strings are
converted:

    json.dumps({1: "a"})        # '{"1": "a"}' — the key is now a string

That last one bites when the data comes back and the lookup fails.

**Dates need a decision**, and the usual one is ISO 8601 strings:

    json.dumps({"created": datetime.now().isoformat()})

**Validate what arrives.** Loading succeeding means the text was valid JSON, not that it contains
what you expected:

    data = json.loads(text)
    if not isinstance(data, dict) or "email" not in data:
        raise ValueError("expected an object with an email")

**Never trust structure from outside your program.** A missing key, a string where a number belongs,
or a null where an object was promised are all normal in real data. \`data.get("name", "")\` rather
than \`data["name"]\`, and a check on anything you will do arithmetic with.

**The two failures to handle:**

    try:
        config = json.loads(text)
    except json.JSONDecodeError as e:
        # not valid JSON at all — line and column are in the exception
    except UnicodeDecodeError:
        # the bytes were not the encoding you assumed

**For anything complex, use a schema library** — pydantic, marshmallow — which validates the shape
and gives you objects instead of nested dictionaries. Passing raw dictionaries through a codebase is
how a typo in a key name becomes a bug three modules away.`,
    mcqs: [
      mcq('A Python tuple written to JSON comes back as:',
        [['A list', true], ['A tuple', false], ['A string', false], ['An error on load', false]],
        'Sets and dates raise instead; tuples convert silently.'),
      mcq('`json.dumps({1: "a"})` produces `{"1": "a"}` because:',
        [['JSON object keys must be strings', true],
          ['Python sorts keys before writing', false],
          ['Integers are not valid JSON values', false],
          ['The dictionary was converted to a list', false]],
        'Which bites when the data comes back and the lookup fails.'),
      mcq('`json.loads` succeeding tells you:',
        [['The text was valid JSON, nothing about its contents', true],
          ['The data matches the expected structure', false],
          ['Every required key is present', false],
          ['The types are what you assumed', false]],
        'Validation of the shape is a separate step.'),
      mcq('A schema library such as pydantic is preferred for complex data because:',
        [['It validates the shape and gives you objects, not raw dictionaries', true],
          ['It parses JSON faster', false],
          ['It handles dates automatically in JSON', false],
          ['It removes the need for error handling', false]],
        'A typo in a key name otherwise becomes a bug three modules away.'),
    ],
    checkpoint: [
      mcq('`json.JSONDecodeError` means:',
        [['The text was not valid JSON at all', true],
          ['A required key was missing', false],
          ['A value had the wrong type', false],
          ['The file encoding was wrong', false]],
        'UnicodeDecodeError is the one about encoding.'),
      mcq('Dates in JSON are usually handled by:',
        [['Writing them as ISO 8601 strings', true],
          ['Using a custom JSON encoder by default', false],
          ['Storing them as Unix timestamps in floats', false],
          ['Letting json.dumps convert them', false]],
        'json.dumps raises on a datetime; the format is your decision.'),
    ],
  },

  {
    unitCode: 'T2_PY_ROBUST_COMPREHENSIONS',
    notes: `A comprehension builds a list, dictionary or set from an iterable in one expression. Used
well it is clearer than the loop; used badly it is far worse.

    squares = [n * n for n in numbers]
    evens = [n for n in numbers if n % 2 == 0]
    names = {c.id: c.name for c in customers}
    cities = {c.city for c in customers}

**The shape is always the same:** the expression, the source, and optionally a filter.

**Where a comprehension is better:** a direct transformation, a filter, or both — anything you could
describe in one short sentence. "The names of customers in Chennai" is a comprehension.

**Where a loop is better:**

- Several statements per item
- Conditions with side effects
- Anything needing a try block
- More than one level of nesting
- Anything you cannot read in one pass

**The test:** read it aloud. If you have to stop and work it out, it should be a loop. This one
should be a loop:

    result = [transform(x) if check(x) else fallback(x)
              for sublist in data for x in sublist if x is not None]

**Nested order surprises people.** \`for sublist in data for x in sublist\` reads in the same order as
the equivalent nested loops — outer first — which is the opposite of what many expect.

**Generator expressions** use parentheses and produce items lazily:

    total = sum(n * n for n in numbers)        # nothing is stored
    big = [n for n in numbers if n > 1000]     # the whole list is stored

For a large source, the generator uses almost no memory. For \`sum\`, \`any\`, \`all\` and \`max\`,
it is strictly better because nothing is kept.

**Comprehensions do not leak their variable**, unlike a loop — \`n\` does not exist afterwards, which
is a small, real advantage.

**Readability decides.** A comprehension is not more Pythonic because it is shorter; it is more
Pythonic when it is clearer, and only then.`,
    mcqs: [
      mcq('A comprehension is the wrong choice when:',
        [['It needs several statements or a try block per item', true],
          ['The source has more than a thousand items', false],
          ['The result is a dictionary rather than a list', false],
          ['A filter condition is involved', false]],
        'Anything you cannot read in one pass belongs in a loop.'),
      mcq('In `[x for sub in data for x in sub]`, the loops run:',
        [['Outer first, in the same order as nested loops', true],
          ['Inner first, right to left', false],
          ['In parallel across both sources', false],
          ['In an order determined by the expression', false]],
        'Which is the opposite of what many people expect.'),
      mcq('A generator expression differs from a list comprehension in that it:',
        [['Produces items lazily and stores nothing', true],
          ['Can only be used once per program', false],
          ['Cannot include a filter', false],
          ['Returns a tuple instead of a list', false]],
        'For sum, any, all and max it is strictly better.'),
      mcq('The practical test for whether to use a comprehension is:',
        [['Whether you can read it in one pass', true],
          ['Whether it fits on one line', false],
          ['Whether it avoids an explicit loop', false],
          ['Whether the source is already a list', false]],
        'Shorter is not the same as clearer.'),
    ],
    checkpoint: [
      mcq('`sum(n * n for n in numbers)` is preferred to the list version because:',
        [['Nothing is stored while the total is computed', true],
          ['It is easier to read', false],
          ['sum requires a generator', false],
          ['The resulting type is a different one', false]],
        'On a large source the memory difference is the whole point.'),
      mcq('A comprehension variable after the comprehension ends is:',
        [['Gone — it does not leak into the surrounding scope', true],
          ['Still available, and holding its last value', false],
          ['Reset to None', false],
          ['Available only inside a function', false]],
        'Unlike a loop variable, which survives.'),
    ],
  },

  {
    unitCode: 'T2_PY_ROBUST_ITERATORS',
    notes: `An iterator produces values one at a time instead of building them all first. It is the
difference between a program that handles a 10GB file and one that runs out of memory.

    def read_lines(path):
        with open(path, encoding="utf-8") as f:
            for line in f:
                yield line.strip()

**\`yield\` makes it a generator.** Calling the function returns immediately without running the
body; each iteration runs until the next \`yield\` and then pauses, keeping its place.

**What that buys:**

    # loads everything
    lines = open("huge.log").readlines()          # 10GB in memory

    # loads one line at a time
    for line in read_lines("huge.log"):
        process(line)                              # constant memory

**Generators compose into pipelines**, each stage lazy, nothing stored between them:

    lines = read_lines("access.log")
    errors = (l for l in lines if " 500 " in l)
    paths = (l.split()[6] for l in errors)
    for path in paths:
        print(path)

Nothing is read until the final loop asks for it, and only one line exists at a time however large
the file is.

**The limitations, and they matter:**

- **Single use.** Once exhausted, a generator is finished; iterate again and you get nothing.
- **No length.** \`len()\` does not work; there is no way to know without consuming it.
- **No indexing.** No \`items[5]\`.

If you need any of those, materialise it: \`list(generator)\`.

**\`itertools\`** is worth knowing exists: \`islice\` for taking the first n, \`chain\` for joining
sources, \`groupby\` for runs of equal values — all lazy.

**When to reach for a generator:** the data is large or unbounded, you only need one pass, or the
items are expensive to produce and you might stop early.

**When not to:** small collections, or anything you will use more than once. A list is simpler, and
simpler wins unless there is a reason.`,
    mcqs: [
      mcq('Calling a generator function:',
        [['Returns immediately without running the body', true],
          ['Runs the body and returns a list', false],
          ['Runs until the first yield and returns that value', false],
          ['Raises unless iterated immediately', false]],
        'Each iteration runs to the next yield and pauses there.'),
      mcq('Iterating a generator a second time gives:',
        [['Nothing — it is exhausted', true],
          ['The same values again', false],
          ['An error about reuse', false],
          ['The remaining values only', false]],
        'Materialise it with list() if you need it twice.'),
      mcq('A pipeline of generator expressions holds in memory:',
        [['One item at a time, whatever the source size', true],
          ['One stage\'s full output at a time', false],
          ['Everything, since each stage is evaluated first', false],
          ['A buffer sized by the interpreter', false]],
        'Nothing is read until the final loop asks for it.'),
      mcq('`len()` does not work on a generator because:',
        [['There is no way to know without consuming it', true],
          ['Generators are not sequences by type', false],
          ['The length changes as it is consumed', false],
          ['It would be too slow to compute', false]],
        'Indexing is unavailable for the same reason.'),
    ],
    checkpoint: [
      mcq('A generator is the wrong choice when:',
        [['The collection is small and used more than once', true],
          ['The source is a file on disk', false],
          ['The items are expensive to produce each time', false],
          ['You may stop iterating early', false]],
        'A list is simpler, and simpler wins without a reason.'),
      mcq('`itertools.islice` is used to:',
        [['Take the first n items lazily', true],
          ['Split an iterator into equal parts', false],
          ['Join several iterators together', false],
          ['Group adjacent equal values', false]],
        'chain joins; groupby groups runs of equal values.'),
    ],
  },

  {
    unitCode: 'T2_PY_ROBUST_DEBUGGING',
    notes: `Robustness bugs are quiet. The program does not crash; it produces slightly wrong output,
or holds a resource it never releases, or fails only on the one file that is different.

**1. The program works on the sample and fails on the real data.** Real data has empty fields,
unusual characters, missing columns, dates in two formats, and a row where somebody typed "N/A" into
a number column. Test with the real file, or a realistic sample of it, early.

**2. \`UnicodeDecodeError\` on one file out of a hundred.** That file is in a different encoding, or is
not text at all. Read it as bytes and look at the beginning; \`errors="replace"\` gets you past it
when the exact characters do not matter.

**3. Memory climbing steadily.** Something is accumulating: a list appended to in a loop that never
ends, a cache with no limit, or a file read fully instead of iterated.

**4. "Too many open files."** Files opened without \`with\`, in a loop. Every exception leaks one
until the limit is reached.

**5. An empty result where there should be rows.** A generator already consumed, most often by a
debugging \`print(list(gen))\` that exhausted it. This one wastes a lot of time the first time.

**6. Numbers that are almost right.** Floating point, or a value that arrived as a string and was
silently concatenated rather than added.

**7. It works the first time and not the second.** State left over: a module-level variable, a
mutable default argument, or a file not closed and rewritten.

**The methods:**

    print(type(x), repr(x))      # repr shows quotes, whitespace and escapes
    import traceback; traceback.print_exc()   # the full trace inside a handler

**And read the exception type before the message.** \`KeyError\` and \`TypeError\` are entirely
different problems, and the type narrows the search before you have read a word of the text.

**When output is wrong rather than absent**, work backwards: print the value at each stage until you
find the first one that is not what you expected. That point is where the bug is, and nowhere
earlier.`,
    mcqs: [
      mcq('A program that works on sample data and fails on real data usually meets:',
        [['Empty fields, odd characters and inconsistent formats', true],
          ['A memory limit', false],
          ['A permissions problem', false],
          ['A version difference in a library', false]],
        'Test with a realistic sample early rather than at the end.'),
      mcq('"Too many open files" is caused by:',
        [['Opening files without `with`, so handles leak', true],
          ['Reading files larger than memory', false],
          ['A directory with too many entries', false],
          ['Concurrent access from two processes', false]],
        'Every exception leaks one until the limit is reached.'),
      mcq('An empty result from a generator is often caused by:',
        [['It having already been consumed, sometimes by a debug print', true],
          ['The source file being locked', false],
          ['A filter condition that is always false', false],
          ['The generator not being called', false]],
        'This one wastes a lot of time the first time it happens.'),
      mcq('`repr(x)` is more useful than `print(x)` when debugging because:',
        [['It shows quotes, whitespace and escape characters', true],
          ['It prints the variable name too', false],
          ['It works on objects without __str__', false],
          ['It includes the type automatically', false]],
        'A trailing space is invisible in one and obvious in the other.'),
    ],
    checkpoint: [
      mcq('Memory climbing steadily through a run suggests:',
        [['Something accumulating — a list, a cache, or a full read', true],
          ['A circular import', false],
          ['Too many exceptions being raised', false],
          ['Garbage collection having been disabled', false]],
        'Iterating rather than reading is the usual fix.'),
      mcq('When output is wrong rather than absent, the method is to:',
        [['Print at each stage until the first unexpected value', true],
          ['Add a try block around the entire pipeline stage', false],
          ['Re-run with a smaller input', false],
          ['Check the exception type first', false]],
        'The bug is at that point, and nowhere earlier.'),
    ],
  },

  {
    unitCode: 'T2_PY_ROBUST_PRACTICE',
    notes: `No new ideas. Write programs that survive contact with real data.

**Get genuinely messy data** — a public CSV with missing values, a log file with unusual lines, an
export with mixed encodings. Clean data teaches nothing here.

**Do these:**

1. **A robust CSV reader.** Handle missing columns, blank values, wrong types, and a row that is
   simply malformed. Report what it skipped and why; never crash, and never silently drop.
2. **A large-file processor.** Summarise a file bigger than your available memory, using generators.
   Measure the memory used and prove it stays flat.
3. **A JSON round trip.** Load, validate the shape, transform, save. Then feed it JSON that is
   missing keys, has wrong types, and is not JSON at all.
4. **An exception audit.** Take existing code of yours and examine every try block: is it catching
   something it can handle? Is anything swallowed? Fix what you find.
5. **A leak on purpose.** Open files in a loop without \`with\` until it fails. Read the error, then
   fix it.
6. **Comprehension judgement.** Take ten loops and decide which should be comprehensions. Rewrite
   those; leave the rest and say why.
7. **A generator pipeline.** Three stages over a log file, producing an answer, with nothing stored.
8. **The encoding problem.** Write a file as UTF-8, read it assuming something else, see the error,
   and handle it properly.

**Record for each:** the input that broke it, and what you changed.

**The standard for this set:** a program that reports what it could not handle is finished; one that
crashes on the first odd row, or silently drops it, is not. Those are the two failure modes, and they
are equally bad.`,
    mcqs: [
      mcq('A robust CSV reader meeting a malformed row should:',
        [['Skip it and report what was skipped and why', true],
          ['Stop and raise immediately', false],
          ['Drop it silently and continue', false],
          ['Substitute default values without comment', false]],
        'Crashing and silent dropping are the two failure modes, equally bad.'),
      mcq('Proving a large-file processor uses flat memory requires:',
        [['Measuring memory during the run', true],
          ['Checking that generators were used', false],
          ['Timing the run against a smaller file', false],
          ['Counting the lines processed', false]],
        'The measurement is the evidence; the code structure is only the claim.'),
      mcq('An exception audit of existing code asks, of each try block:',
        [['Whether it catches something it can actually handle', true],
          ['Whether it could be replaced by a check', false],
          ['Whether it is inside a loop', false],
          ['Whether it logs at the right level', false]],
        'And whether anything is being swallowed.'),
      mcq('Practising on clean data teaches nothing here because:',
        [['The topic is entirely about what real data does', true],
          ['Clean data is faster to process', false],
          ['The exercises require large files', false],
          ['Encoding issues only occur in exports', false]],
        'Missing values, odd characters and inconsistent formats are the subject.'),
      mcq('Deciding which of ten loops should stay loops is an exercise in:',
        [['Judgement, since shorter is not always clearer', true],
          ['Performance measurement', false],
          ['Memory optimisation', false],
          ['Applying a consistent style rule', false]],
        'And saying why the rest stay is the valuable half.'),
    ],
    checkpoint: [
      mcq('Opening files in a loop without `with` until failure demonstrates:',
        [['That handles leak until the system limit is reached', true],
          ['That files must be closed before reopening', false],
          ['That Python limits open files per process', false],
          ['That exceptions close files automatically', false]],
        'Causing it once makes the error unmistakable afterwards.'),
      mcq('The most useful record from each exercise is:',
        [['The input that broke it, and what you changed', true],
          ['The runtime before and after', false],
          ['The number of exceptions you handled', false],
          ['The size of the file processed', false]],
        'The breaking input is the test case you now have.'),
    ],
  },

  {
    unitCode: 'T2_PY_ROBUST_MINI_PROJECT',
    notes: `A data processing tool that handles a real, messy dataset without crashing and without
lying about what it did.

**Why a processing tool.** It concentrates everything in this topic — files, encodings, JSON,
exceptions, generators — into one thing where the failures are unavoidable rather than hypothetical.

**What is being assessed:** that bad input is handled rather than crashed on or silently dropped,
that memory stays flat on a large file, that the report of what was skipped is accurate, and that
every exception caught has a reason.

**Build it in this order:**

1. **Get the messy data first**, and look at it. Find the rows that are unusual before writing code
   that assumes they are not.
2. **Write the happy path**, over a small clean sample.
3. **Feed it the real file** and let it break. Each break is a requirement you had not written down.
4. **Handle each failure deliberately** — skip with a reason, substitute with a note, or stop.
5. **Convert to generators** and measure the memory.
6. **Write the report**: what was processed, what was skipped, and why.

The brief, requirements and deliverables are in the assignment attached to this unit.`,
    assignment: {
      title: 'Mini Project — A Tool That Survives Real Data',
      description: 'Build a data processing tool that handles a genuinely messy dataset with flat memory, deliberate failure handling and an honest report of what it skipped.',
      instructions: `**The brief**

Build a command-line tool that processes a **real, messy dataset** of at least 100,000 rows and
produces a useful summary. Sources: a public government dataset, a server log, a data export, or
something you generate with realistic defects.

Examples: a log analyser producing a daily summary; a CSV cleaner producing a validated output file
and a rejects file; a dataset summariser producing statistics per category.

**Requirements**

1. **A real messy dataset**, not a clean sample. Describe its defects.
2. **Flat memory**: generators throughout, with a measurement proving memory does not grow with
   input size.
3. **Deliberate failure handling** for at least six kinds of bad input — missing field, wrong type,
   unparseable date, bad encoding, malformed row, out-of-range value. Each handled with a stated
   policy: skip, substitute, or stop.
4. **An accurate report**: rows read, processed, skipped, and a breakdown by reason.
5. **A rejects output** containing every skipped row with its reason, so nothing disappears.
6. **Explicit encodings** everywhere, with the bad-encoding case handled.
7. **Output written safely**: temporary file and rename, so a crash does not destroy the previous
   output.
8. **Every exception caught has a reason**, documented; no bare except anywhere.
9. **Tests** with fixture files containing each defect.
10. **A command-line interface** with arguments, \`--help\`, and a useful exit code.

**What to submit**

1. The code and its README.
2. A **defect catalogue**: each kind of bad input, your policy, and why that policy.
3. The **memory measurement**: peak memory against input size, at two sizes at least.
4. Sample **output and report**, including the rejects file.
5. A **short write-up** (300–400 words): the defect you did not anticipate; a case where you chose
   to skip rather than substitute and why; what you would need before running this unattended on a
   schedule.

**Constraints**

- No loading the whole dataset into memory.
- No bare except, and nothing swallowed without a record.
- Never overwrite the input; never destroy a previous output on failure.

**Where the marks are.** The defect catalogue and the rejects file. Processing clean rows is easy;
being precise and honest about the ones you could not process is the skill.`,
      rubric: [
        {
          criterion: 'Robustness',
          description: 'Six or more defect kinds handled with a stated policy; no crashes on real data; no silent drops.',
          maxPoints: 30,
        },
        {
          criterion: 'Memory behaviour',
          description: 'Generators throughout; peak memory measured at two input sizes and shown not to grow with the input.',
          maxPoints: 20,
        },
        {
          criterion: 'Honest reporting',
          description: 'Counts accurate; rejects file complete with reasons; report reconciles read, processed and skipped.',
          maxPoints: 25,
        },
        {
          criterion: 'Safety and interface',
          description: 'Explicit encodings, safe output writing, no bare except, arguments with --help and meaningful exit codes, tests per defect.',
          maxPoints: 15,
        },
        {
          criterion: 'Write-up',
          description: 'An unanticipated defect, a reasoned skip-versus-substitute decision, and what unattended scheduled running would need.',
          maxPoints: 10,
        },
      ],
      totalPoints: 100,
    },
  },
];
