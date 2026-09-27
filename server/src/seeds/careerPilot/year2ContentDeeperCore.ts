/**
 * The second debugging and practice unit for each of the seven programming-core topics —
 * fourteen bundles for the units `closeOut` now emits.
 *
 * ── WHAT THE SECOND UNIT IS FOR ───────────────────────────────────────────────────────────
 *
 * HARDER_FAULTS is the fault that survives a careful read. The first debugging unit of a topic
 * deals with faults that announce themselves — a traceback, an obviously wrong number. This one
 * deals with code that reads as correct and is wrong on the input nobody tried, which is the
 * class that reaches production and the class a strong learner is the right person to hunt.
 *
 * HARDER_PRACTICE is the problem whose obvious answer is correct and insufficient. Not more
 * repetitions of the first practice unit: a second question, asked once the first is fluent.
 *
 * Both exist because a learner who has proved a skill is given application rather than
 * instruction, so these are the only units left that can serve them. See the note above
 * `closeOut` in year2MegaCurriculum.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const DEEPER_CORE_BUNDLES: PilotBundle[] = [
  /* ══ T2_OOP_OBJECTS ═════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T2_OOP_OBJECTS_HARDER_FAULTS',
    notes: `**An object that reads correctly and holds the wrong state.** Nothing throws. The
values are simply not what anybody expected, three calls later.

## The faults

**A mutable default.** A list or a dict as a default argument is created **once**, not per call,
so the second object shares the first one's. Works perfectly the first time, which is what makes
it survive review.

**Assigning instead of copying.** \`self.items = items\` stores the caller's list. Whoever passed
it can still change it, and will.

**A class attribute doing a instance attribute's job.** Declared on the class, shared by every
instance, and the sharing only shows once there are two.

**State changed in a getter.** A method named as though it reads, which writes. The caller has
no reason to suspect it.

**Equality left as identity.** Two objects with identical contents are not equal, so they behave
strangely in sets, dicts and comparisons — and this fails silently rather than loudly.

**A half-built object.** The constructor raises partway through and something still holds the
reference, so an object exists in a state its own class thinks is impossible.

**And two sources of truth.** A total stored alongside the items it totals, updated in one of the
three places that change the items.

## Finding them

**Make two.** Most of this list is invisible with one instance and obvious with two. **Create
two objects, change one, and assert the other did not move** — the single most productive check
in this unit.

**Print the object between calls**, not just at the end. The state is wrong before the symptom.

**And ask what else holds this reference.** If the answer is "the caller", the object does not own
its own data.

## Repairing without making it worse

**Copy on the way in** where the object must own the data.

**Default to \`None\` and create inside** the constructor.

**Derive rather than store.** A total computed from the items cannot disagree with them, and that
removes the whole class of fault rather than one instance of it.`,
    mcqs: [
      mcq('A mutable default argument survives review because:',
        [['It works perfectly the first time it is used', true],
          ['The syntax is unusual enough to look deliberate', false],
          ['Most reviewers do not read default values', false],
          ['It only fails when the object is subclassed', false]],
        'The list is created once, not per call.'),
      mcq('Storing the caller’s list rather than a copy means:',
        [['Whoever passed it can still change it, and will', true],
          ['The object uses more memory than it needs', false],
          ['The list cannot be replaced later', false],
          ['Changes are visible only after a reload', false]],
        'Copy on the way in where the object must own its data.'),
      mcq('The single most productive check in this unit is:',
        [['Make two objects, change one, and assert the other did not move', true],
          ['Print the object state after every method call', false],
          ['Assert the constructor completed successfully', false],
          ['Compare two objects with identical contents', false]],
        'Most of these faults are invisible with one instance.'),
      mcq('Deriving a total rather than storing it:',
        [['Removes the whole class of fault rather than one instance of it', true],
          ['Costs performance that is rarely worth it', false],
          ['Makes the object harder to serialise', false],
          ['Requires the items to be immutable', false]],
        'A computed total cannot disagree with the items.'),
    ],
    checkpoint: [
      mcq('Equality left as identity fails:',
        [['Silently, in sets, dicts and comparisons', true],
          ['Loudly, with a type error on comparison', false],
          ['Only when objects are used as dict keys', false],
          ['Only for objects with mutable contents', false]],
        'Two objects with identical contents are not equal.'),
      mcq('A class attribute used where an instance attribute was meant shows up:',
        [['Only once there are two instances', true],
          ['Immediately, on the first assignment', false],
          ['When the class is subclassed', false],
          ['Only if the attribute is mutable', false]],
        'Which is why you make two.'),
      mcq('"What else holds this reference?" answered with "the caller" means:',
        [['The object does not own its own data', true],
          ['The reference should be made weak', false],
          ['The constructor needs another parameter', false],
          ['The data should be made immutable', false]],
        'Copy on the way in, so the object owns its own data.'),
    ],
  },

  {
    unitCode: 'T2_OOP_OBJECTS_HARDER_PRACTICE',
    notes: `One exercise on the fault this topic hides best: state shared between objects that
should be independent.`,
    coding: [
      {
        title: 'Two baskets that must not share',
        description: `Implement \`Basket\` with \`add(item)\` and \`total()\`, then read commands
from input, one per line:

- \`new <name>\` — create a basket under that name
- \`add <name> <item> <price>\` — add an item at that integer price
- \`total <name>\` — print \`<name>=<total>\`

Two baskets created separately must never share items. **The obvious implementation shares
them**, which is the point of the exercise.

Print one line per \`total\` command.`,
        starter: `import sys

class Basket:
    # The obvious default shares one list between every basket ever made.
    def __init__(self, items=None):
        pass

baskets = {}
for line in sys.stdin:
    parts = line.split()
    if not parts:
        continue
`,
        language: 'python',
        tests: [
          { input: 'new a\nadd a pen 5\ntotal a\n', expectedOutput: 'a=5' },
          { input: 'new a\nnew b\nadd a pen 5\ntotal b\n', expectedOutput: 'b=0' },
          { input: 'new a\nnew b\nadd a pen 5\nadd b ink 3\ntotal a\ntotal b\n', expectedOutput: 'a=5\nb=3' },
          { input: 'new a\ntotal a\n', expectedOutput: 'a=0' },
          { input: 'new x\nnew y\nnew z\nadd y q 7\nadd y r 1\ntotal x\ntotal y\ntotal z\n', expectedOutput: 'x=0\ny=8\nz=0', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Objects — Past the Obvious Answer',
      description: 'Independent objects, then the same fault hunted in code you did not write.',
      instructions: `Complete the exercise, then:

1. Say what the shared-default version prints for the second test, and why.
2. Give two other ways to write the constructor that also avoid sharing, and say which you
   prefer and why.
3. Add \`__eq__\` to \`Basket\` so two baskets with the same items compare equal. Then say what
   else you now have to add, and what breaks if you do not.

**Then, on code you did not write** — an open-source project, or a classmate's.

4. Find a class that stores a collection passed to its constructor. Say whether it copies.
5. Write the two-object test: create two, change one, assert the other did not move.
6. Find one place where a value is stored alongside the thing it is derived from. Say how many
   places update it, and whether they all do.
7. Fix one of them by deriving instead of storing, and prove behaviour is unchanged.`,
      rubric: [
        { criterion: 'Baskets independent', description: 'All cases, including three baskets and an untouched one.', maxPoints: 25 },
        { criterion: 'The shared default explained', description: 'What it prints and why, with two alternative constructors compared.', maxPoints: 15 },
        { criterion: 'Equality added correctly', description: 'With what else it requires and what breaks without it.', maxPoints: 20 },
        { criterion: 'A real class examined', description: 'Whether it copies, with the two-object test written.', maxPoints: 20 },
        { criterion: 'A derived value found and fixed', description: 'Update sites counted, one converted to derivation, behaviour unchanged.', maxPoints: 20 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

class Basket:
    def __init__(self, items=None):
        pass

baskets = {}
`,
        tests: [
          { input: 'new a\nadd a pen 5\ntotal a\n', expectedOutput: 'a=5' },
          { input: 'new a\nnew b\nadd a pen 5\ntotal b\n', expectedOutput: 'b=0' },
          { input: 'new a\nnew b\nadd a pen 5\nadd b ink 3\ntotal a\ntotal b\n', expectedOutput: 'a=5\nb=3' },
          { input: 'new a\ntotal a\n', expectedOutput: 'a=0' },
          { input: 'new x\nnew y\nnew z\nadd y q 7\nadd y r 1\ntotal x\ntotal y\ntotal z\n', expectedOutput: 'x=0\ny=8\nz=0', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('Adding equality to a class also requires:',
        [['A matching hash, or the object breaks in sets and dicts', true],
          ['An ordering method for comparisons', false],
          ['A copy method for safe duplication', false],
          ['A string representation for use when debugging it', false]],
        'Equality and hashing have to agree.'),
      mcq('A value stored alongside what it derives from is wrong when:',
        [['Any one of the places that change the source forgets to update it', true],
          ['The derivation is far too expensive to recompute each time', false],
          ['The source is mutable rather than frozen', false],
          ['It is read more often than it is written', false]],
        'Count the update sites: one of them will have been missed.'),
      mcq('The default that avoids sharing is:',
        [['None, with the collection created inside the constructor', true],
          ['An empty list literal, which is created fresh on every call', false],
          ['A tuple, which cannot be modified', false],
          ['A copy of a module-level empty list', false]],
        'The default value is evaluated once, when the function is defined.'),
    ],
  },

  /* ══ T2_OOP_PRINCIPLES ══════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T2_OOP_PRINCIPLES_HARDER_FAULTS',
    notes: `**A design that works and will not survive its next requirement.** Nothing is broken.
The next change is what finds it.

## What to look for

**A subclass that narrows.** A \`Square\` that inherits \`Rectangle\` and rejects a width change
breaks every caller that held a \`Rectangle\`. **Inheritance is a promise that the child can stand
in for the parent**, and this one does not.

**A method that checks what type it was given.** \`if isinstance(x, Dog)\` inside a loop over
animals means the polymorphism is decorative: adding a type means editing this function.

**An abstract base nobody could implement twice.** A base class with nine methods, of which a
second implementation would need two. The abstraction was taken from one case.

**Behaviour switched by a flag.** A constructor taking \`mode='fast'\` is two classes sharing a
name, and the branches diverge until neither is readable.

**A constructor that does work.** Reading a file, opening a connection, calling a service. Now
the object cannot be created in a test without all of that existing.

**And a dependency reached for rather than passed.** The class names a concrete collaborator
inside itself, so there is no way to substitute one — and no way to test it alone.

## The question that finds all of them

**"What is the next likely requirement, and what would I have to touch?"**

A second payment type. A second output format. A second source of data. **Trace it. Three files
for one idea is the finding**, and it is the same question the clean-code debugging unit asks.

## The other question

**"Could I write a second implementation of this interface?"** If the answer needs most of the
methods stubbed out, the interface describes one class rather than a role.

## Fixing without a rewrite

**Pass the collaborator in.** One parameter, and the class becomes testable.

**Replace the type check with a method on the type.** Each animal knows its own sound.

**Split the flag into two classes** sharing a small interface.

**And do not extract an abstraction from one case.** Wait for the second — **an abstraction with
one implementation is a guess, and the second case almost never fits it.**`,
    mcqs: [
      mcq('A subclass that rejects a change its parent allows:',
        [['Breaks every caller that held the parent, because inheritance promises substitution', true],
          ['Is acceptable when documented on the subclass', false],
          ['Only matters if the parent is used polymorphically', false],
          ['Should raise a more specific exception instead', false]],
        'The child has to be able to stand in for the parent.'),
      mcq('A type check inside a loop over a base type means:',
        [['The polymorphism is decorative: adding a type means editing this function', true],
          ['The base class is missing a method', false],
          ['The loop should be split by type first', false],
          ['The types should share a common field', false]],
        'Replace the check with a method on the type.'),
      mcq('A constructor that opens a connection:',
        [['Cannot be created in a test without all of that existing', true],
          ['Delays failure until the object is used', false],
          ['Should cache the connection for reuse', false],
          ['Is acceptable if the connection is lazy', false]],
        'Pass the collaborator in.'),
      mcq('An abstraction with one implementation is:',
        [['A guess, and the second case almost never fits it', true],
          ['A reasonable preparation for future needs', false],
          ['Cheaper to write now than to extract later', false],
          ['Fine provided the interface stays small', false]],
        'Wait for the second case.'),
    ],
    checkpoint: [
      mcq('The question that finds most of these faults is:',
        [['What the next likely requirement is, and what it would touch', true],
          ['Whether each of the classes has a single responsibility', false],
          ['How deep the inheritance hierarchy goes', false],
          ['Whether the methods are short enough', false]],
        'Three files for one idea is the finding.'),
      mcq('A constructor parameter named mode:',
        [['Is two classes sharing a name, and they diverge until neither reads well', true],
          ['Is acceptable when there are only two modes', false],
          ['Should be an enumeration rather than a string', false],
          ['Belongs on the individual method rather than on the constructor', false]],
        'Split it into two classes sharing a small interface.'),
      mcq('If a second implementation of an interface would stub out most methods:',
        [['The interface describes one class rather than a role', true],
          ['The interface should be split by responsibility', false],
          ['The stubs should raise not-implemented', false],
          ['The second case is the wrong fit for the abstraction', false]],
        'It was taken from one case.'),
    ],
  },

  {
    unitCode: 'T2_OOP_PRINCIPLES_HARDER_PRACTICE',
    notes: `One exercise on replacing a type check with polymorphism — the change that decides
whether adding a case means editing a function or adding a class.`,
    coding: [
      {
        title: 'Adding a shape without editing the loop',
        description: `Read one shape per line, then print each area as an integer, then
\`total=<sum>\`.

Lines are one of:

    square <side>
    rect <width> <height>
    tri <base> <height>

Areas: a square is side squared, a rectangle is width times height, a triangle is base times
height divided by two, **rounded down**.

Write it so that a fourth shape would mean **adding a class and nothing else** — no branch in
the loop, no type check. The dispatch table or the class registry is the point; a chain of
\`if kind == ...\` in the loop is the thing this exercise exists to replace.

Print an integer per line, then the total.`,
        starter: `import sys

# A fourth shape should mean a new class and no edit to the loop below.

shapes = []
for line in sys.stdin:
    parts = line.split()
    if not parts:
        continue
`,
        language: 'python',
        tests: [
          { input: 'square 4\n', expectedOutput: '16\ntotal=16' },
          { input: 'rect 3 5\ntri 4 3\n', expectedOutput: '15\n6\ntotal=21' },
          { input: 'tri 3 3\n', expectedOutput: '4\ntotal=4' },
          { input: '', expectedOutput: 'total=0' },
          { input: 'square 2\nrect 2 2\ntri 5 5\n', expectedOutput: '4\n4\n12\ntotal=20', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Object Design — Past the Obvious Answer',
      description: 'Polymorphic dispatch, then the same question asked of real code.',
      instructions: `Complete the exercise, then:

1. Add a fourth shape — a circle, area rounded down — and **count the lines you had to change
   outside the new class.** If it is more than one, say why.
2. Say what the triangle rounding does at \`tri 3 3\`, and why integer division is the fault the
   debugging unit named.
3. Say where you would put the parsing, and why it is not on the shape classes.

**Then, in real code.**

4. Find a function containing a type check or a chain of branches on a kind. Record the file.
5. **Count what adding one more case would touch.**
6. Write the version where a new case is a new class. You do not have to merge it — just write
   it and compare.
7. Find a class whose constructor does work. Say what you would pass in instead, and what that
   makes testable.
8. Find an abstraction with exactly one implementation. Say whether you would keep it, and why.`,
      rubric: [
        { criterion: 'Areas and total correct', description: 'All cases, with the triangle floored and the empty input handled.', maxPoints: 25 },
        { criterion: 'A fourth shape added cleanly', description: 'Lines changed outside the new class counted and justified.', maxPoints: 20 },
        { criterion: 'Parsing placed deliberately', description: 'With a reason for keeping it off the shape classes.', maxPoints: 10 },
        { criterion: 'A real branch chain found and costed', description: 'File recorded, cost of one more case counted, rewrite compared.', maxPoints: 25 },
        { criterion: 'Constructor and abstraction judged', description: 'What to pass in, and a keep-or-drop verdict with a reason.', maxPoints: 20 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

shapes = []
`,
        tests: [
          { input: 'square 4\n', expectedOutput: '16\ntotal=16' },
          { input: 'rect 3 5\ntri 4 3\n', expectedOutput: '15\n6\ntotal=21' },
          { input: 'tri 3 3\n', expectedOutput: '4\ntotal=4' },
          { input: '', expectedOutput: 'total=0' },
          { input: 'square 2\nrect 2 2\ntri 5 5\n', expectedOutput: '4\n4\n12\ntotal=20', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('Adding a case should require:',
        [['A new class and no edit to the code that loops over them', true],
          ['One extra branch in the dispatch as well as a new class', false],
          ['A new class and an entry in the type check', false],
          ['A change wherever the base type is used', false]],
        'That is the test of whether the polymorphism is real.'),
      mcq('Parsing does not belong on the shape classes because:',
        [['Reading input is a different responsibility from computing area', true],
          ['The input format may change independently', false],
          ['It would require each class to handle errors', false],
          ['Class methods are not able to read from standard input', false]],
        'Put it where the input is understood.'),
      mcq('A triangle of base 3 and height 3 gives 4 because:',
        [['Nine halved is floored, which is the integer-division fault', true],
          ['The area gets rounded to the nearest whole number', false],
          ['Triangles are measured differently at odd sizes', false],
          ['The specification rounds up from 4.5', false]],
        'Rounded down, as the description says.'),
    ],
  },

  /* ══ T2_DS_LINEAR ═══════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T2_DS_LINEAR_HARDER_FAULTS',
    notes: `**A list operation that is correct on paper and wrong in the loop.** These are the
faults that pass the example in the docstring.

## The faults

**Removing while iterating.** Deleting from a list you are walking skips the next element,
silently. Every second match survives, and the count looks nearly right.

**Index arithmetic at the ends.** \`i - 1\` at the start reads the last element instead of failing,
because negative indices are legal. **The most treacherous item here**, because it produces a
plausible answer rather than an error.

**A slice that is off by one.** \`a[i:j]\` excludes \`j\`. Correct everywhere except where the last
element matters.

**Comparing adjacent pairs with one element.** The loop never runs, so the function returns its
initial value — and if that initial value was chosen carelessly, the answer is wrong rather than
absent.

**An accumulator started at zero** over values that may all be negative.

**Shared sublists.** \`[[0] * 3] * 2\` makes two references to one row, so writing to one writes
to both.

**And insert or remove in a loop**, which is quadratic and looks linear. Correct, and too slow
at a size the example never reaches.

## Finding them

**Four inputs, every time.** Empty, one, two, and all-equal. **They catch most of this list and
they take under a minute** — which is why the testing topic put them first and why they are worth
repeating here.

**Then the ends.** Run the first and last iteration by hand and say what index each touches.

**And build the list backwards** when removing: iterating a copy, or building a new list, removes
the skipping fault entirely rather than working around it.

## The habit worth keeping

**Prefer building a new list to mutating one in place.** It costs memory you almost always have,
and it removes a whole family of faults rather than avoiding them one at a time.`,
    mcqs: [
      mcq('Removing from a list while walking it:',
        [['Skips the next element silently, so every second match survives', true],
          ['Raises an error on the following iteration', false],
          ['Reverses the order of the remaining items', false],
          ['Works correctly but runs in quadratic time', false]],
        'And the count looks nearly right.'),
      mcq('The most treacherous fault in this list is:',
        [['Index minus one at the start, because a negative index is legal', true],
          ['A slice that excludes its end', false],
          ['An accumulator started at zero', false],
          ['Shared sublists from list multiplication', false]],
        'It produces a plausible answer rather than an error.'),
      mcq('Comparing adjacent pairs with one element returns:',
        [['The initial value, which is wrong if it was chosen carelessly', true],
          ['The single element, which is usually right', false],
          ['An index error from reading past the end', false],
          ['Zero, whatever the element is', false]],
        'The loop never runs, so the initial value comes straight back.'),
      mcq('Building a new list rather than mutating one:',
        [['Removes a whole family of faults rather than avoiding them one at a time', true],
          ['Is faster for large lists', false],
          ['Is required when the list is shared', false],
          ['Makes the code shorter in most cases', false]],
        'It costs memory you almost always have.'),
    ],
    checkpoint: [
      mcq('The four inputs worth running every time are:',
        [['Empty, one, two, and all-equal', true],
          ['Empty, sorted, reversed, and random', false],
          ['Minimum, maximum, zero, and negative', false],
          ['One, two, many, and too many', false]],
        'They catch most of this list in under a minute.'),
      mcq('Multiplying a list of lists:',
        [['Makes several references to one row, so writing to one writes to all', true],
          ['Copies each row independently', false],
          ['Fails whenever the inner list turns out to be mutable', false],
          ['Produces rows of differing lengths', false]],
        'Shared sublists: the multiplication copies the reference.'),
      mcq('Insert or remove inside a loop is:',
        [['Quadratic while looking linear, and only slow at a size the example never reaches', true],
          ['Linear overall, because each individual operation is constant time', false],
          ['Slow only when the list is unsorted', false],
          ['Equivalent to rebuilding the list once', false]],
        'Correct, and too slow at a size the example never reaches.'),
    ],
  },

  {
    unitCode: 'T2_DS_LINEAR_HARDER_PRACTICE',
    notes: `One exercise on removal, which is where linear structures hide their faults: doing it
without skipping, and without the quadratic version that looks linear.`,
    coding: [
      {
        title: 'Removing every run of duplicates',
        description: `Read a list of integers on one line. Remove **every element that is equal
to the one before it**, keeping the first of each run, and print the result space-separated.

Print \`empty\` for an empty result.

The obvious loop removes while iterating and skips elements. **Build a new list instead** —
which is the habit the notes argue for, and it is also the linear solution rather than the
quadratic one.

Examples: \`1 1 2 2 2 3\` becomes \`1 2 3\`; \`1 2 1\` stays \`1 2 1\`, because only adjacent
equals collapse.`,
        starter: `import sys

nums = [int(x) for x in sys.stdin.read().split()]

# Build a new list. Removing in place skips elements.
`,
        language: 'python',
        tests: [
          { input: '1 1 2 2 2 3\n', expectedOutput: '1 2 3' },
          { input: '1 2 1\n', expectedOutput: '1 2 1' },
          { input: '', expectedOutput: 'empty' },
          { input: '7\n', expectedOutput: '7' },
          { input: '4 4 4 4\n', expectedOutput: '4', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Linear Structures — Past the Obvious Answer',
      description: 'Collapse runs without skipping, then hunt the same faults in real code.',
      instructions: `Complete the exercise, then:

1. Write the in-place version that removes while iterating. **Run it on \`4 4 4 4\`** and record
   what it gives. Explain the result.
2. Say what the in-place version's complexity is, and why it is not linear.
3. Say why \`1 2 1\` is unchanged, and what would change if the requirement were all duplicates
   rather than adjacent ones.

**Then, in real code.**

4. Find a loop that removes from the collection it is iterating. Record the file and say whether
   it is correct.
5. Find an index expression that could go negative. Say what it would return rather than what it
   would raise.
6. Find a slice at the end of a range and check whether the last element is included.
7. Run the four inputs against three functions you did not write. Record what each did.
8. Fix one fault you found, with a test that fails before the fix.`,
      rubric: [
        { criterion: 'Runs collapsed correctly', description: 'All cases, including empty, single and all-equal.', maxPoints: 25 },
        { criterion: 'The in-place version analysed', description: 'Its output on all-equal input explained, and its real complexity stated.', maxPoints: 20 },
        { criterion: 'The adjacency rule understood', description: 'Why non-adjacent duplicates stay, and what would change otherwise.', maxPoints: 10 },
        { criterion: 'Real faults hunted', description: 'A removal loop, a negative index and a slice end, each recorded.', maxPoints: 25 },
        { criterion: 'Four inputs run and one fault fixed', description: 'Three real functions probed, one fix with a failing-first test.', maxPoints: 20 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

nums = [int(x) for x in sys.stdin.read().split()]
`,
        tests: [
          { input: '1 1 2 2 2 3\n', expectedOutput: '1 2 3' },
          { input: '1 2 1\n', expectedOutput: '1 2 1' },
          { input: '', expectedOutput: 'empty' },
          { input: '7\n', expectedOutput: '7' },
          { input: '4 4 4 4\n', expectedOutput: '4', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('The in-place version on all-equal input:',
        [['Leaves more than one element, because it skips as it removes', true],
          ['Empties the list entirely', false],
          ['Raises an index error somewhere partway through the list', false],
          ['Produces the correct single element', false]],
        'Every second match survives.'),
      mcq('Removing in place inside a loop is quadratic because:',
        [['Each removal shifts the rest of the list', true],
          ['The loop restarts after every removal', false],
          ['The list is reallocated on each change', false],
          ['The comparison is repeated for skipped elements', false]],
        'Which is why it looks linear and is not.'),
      mcq('Collapsing all duplicates rather than adjacent ones would need:',
        [['A record of what has already been seen', true],
          ['The list sorted first in every case', false],
          ['Two passes over the list', false],
          ['A comparison against every earlier element', false]],
        'Which is a different problem with a different structure.'),
    ],
  },

  /* ══ T2_DS_KEYED ════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T2_DS_KEYED_HARDER_FAULTS',
    notes: `**A map that holds the right keys and the wrong values.** Lookups succeed; the answer
is wrong.

## The faults

**Overwriting instead of accumulating.** \`counts[k] = 1\` where \`counts[k] = counts.get(k, 0) + 1\`
was meant. Every count is 1 and the number of keys is right, so the output looks structured and
plausible.

**Storing the last occurrence when the first was wanted**, or the reverse. A map from value to
index keeps whichever it saw last — **the fault the interview debugging unit named**, and it is
the same fault here.

**A mutable value shared between keys.** \`dict.fromkeys(ks, [])\` gives every key the same list.

**A key whose type is not what you think.** \`1\` and \`'1'\` are different keys, so a lookup built
from parsed input misses one built from a literal.

**A key that is mutable.** Changing an object used as a key leaves it unreachable in the map it
is still stored in.

**Iteration order relied on** where the structure does not promise it.

**And a missing key handled by a default that hides it.** \`get(k, 0)\` is right for a counter and
wrong when "absent" and "zero" are different facts — **which is the same argument the API unit
makes about null**.

## Finding them

**Assert on the values, not the keys.** Most of these produce the correct key set, so a test
checking keys passes.

**Feed duplicates.** Two entries with the same key is the input that separates overwriting from
accumulating, and it is the one the example never has.

**And check both directions.** If you built a map from A to B, look up something that appears
twice in B and see which A you get.

## Repairing

**Use the accumulating form by default.** \`get\` with a zero, or a counter structure.

**Decide first or last deliberately** and write the choice in a comment, because the code alone
cannot say which you meant.

**And keep the key type fixed** — parse once, at the edge, so nothing downstream compares a
string to a number.`,
    mcqs: [
      mcq('Overwriting instead of accumulating produces output that:',
        [['Looks structured and plausible, because the key set is right', true],
          ['Is obviously wrong from the first key', false],
          ['Fails only when a key repeats many times', false],
          ['Raises an error on the second occurrence', false]],
        'Every count is 1 and the number of keys is correct.'),
      mcq('The input that separates overwriting from accumulating is:',
        [['Two entries with the same key', true],
          ['An empty input with no keys at all', false],
          ['A single entry repeated many times', false],
          ['Keys of two different types', false]],
        'And it is the one the example never has.'),
      mcq('Assertions should be on values rather than keys because:',
        [['Most of these faults produce the correct key set', true],
          ['Keys are harder to compare reliably', false],
          ['Values carry the type information', false],
          ['Key order is not guaranteed', false]],
        'A test checking keys passes.'),
      mcq('A default of zero for a missing key is wrong when:',
        [['Absent and zero are different facts', true],
          ['The values are not numeric', false],
          ['The key set is known in advance', false],
          ['The map is built from user input', false]],
        'The same argument the API unit makes about null.'),
    ],
    checkpoint: [
      mcq('Changing an object used as a key:',
        [['Leaves it unreachable in the map that still stores it', true],
          ['Updates the entry in the map automatically', false],
          ['Raises an error at the next lookup', false],
          ['Removes the entry from the map', false]],
        'Which is why keys should not be mutable.'),
      mcq('First-versus-last should be written in a comment because:',
        [['The code alone cannot say which you meant', true],
          ['The behaviour varies between language versions', false],
          ['A reviewer cannot otherwise test it', false],
          ['The default differs between map types', false]],
        'Decide first or last deliberately, and record which.'),
      mcq('Parsing once at the edge prevents:',
        [['A string key being compared against a numeric one downstream', true],
          ['Keys from being mutated after they have been inserted', false],
          ['Values being shared between keys', false],
          ['Reliance on iteration order', false]],
        'Keep the key type fixed by parsing once, at the edge.'),
    ],
  },

  {
    unitCode: 'T2_DS_KEYED_HARDER_PRACTICE',
    notes: `One exercise on the distinction this topic hides: counting, and knowing whether
absent and zero are the same answer.`,
    coding: [
      {
        title: 'Counts, and the keys that were never there',
        description: `Read two lines. The first is a list of words to count. The second is a list
of words to look up.

For each lookup word print \`<word>=<count>\` when it appeared, and \`<word>=absent\` when it did
not. **Absent is not zero** — that distinction is the whole exercise.

Then print \`distinct=<number of different words counted>\`.

An empty first line means nothing was counted, so every lookup is absent.`,
        starter: `import sys

lines = sys.stdin.read().split('\\n')
words = lines[0].split() if lines and lines[0].strip() else []
lookups = lines[1].split() if len(lines) > 1 and lines[1].strip() else []

# Absent and zero are different answers.
`,
        language: 'python',
        tests: [
          { input: 'a b a\na b c\n', expectedOutput: 'a=2\nb=1\nc=absent\ndistinct=2' },
          { input: 'x x x\nx\n', expectedOutput: 'x=3\ndistinct=1' },
          { input: '\nq\n', expectedOutput: 'q=absent\ndistinct=0' },
          { input: 'a\n\n', expectedOutput: 'distinct=1' },
          { input: 'p q p r p\nr p z\n', expectedOutput: 'r=1\np=3\nz=absent\ndistinct=3', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Maps and Trees — Past the Obvious Answer',
      description: 'Counting with absent distinguished, then the same faults in real code.',
      instructions: `Complete the exercise, then:

1. Write the version using a default of zero for missing keys. Say exactly which test it fails
   and what it prints.
2. Say when a default of zero is the right choice, with an example.
3. Say what changes if the counted words are read as integers rather than strings, and which
   input would expose the difference.

**Then, in real code.**

4. Find a map built in a loop. Say whether it accumulates or overwrites, and whether that is
   what was wanted.
5. Find a map from one thing to another where the source has duplicates. Say which occurrence
   survives, and whether the code says anywhere that it meant that.
6. Find a \`get\` with a default. Say whether absent and the default are genuinely the same
   fact there.
7. Write a test that feeds duplicate keys to something you did not write, and record the result.`,
      rubric: [
        { criterion: 'Counts and absence correct', description: 'All cases, including an empty count list and empty lookups.', maxPoints: 25 },
        { criterion: 'The zero-default version analysed', description: 'The failing test named and its output given.', maxPoints: 15 },
        { criterion: 'When zero is right', description: 'A case where the default is correct, with a reason.', maxPoints: 15 },
        { criterion: 'Key type reasoned about', description: 'What changes with integer keys, and the input that exposes it.', maxPoints: 15 },
        { criterion: 'Real maps examined', description: 'Accumulate-or-overwrite, duplicate survival, and a default judged.', maxPoints: 20 },
        { criterion: 'A duplicate-key test written', description: 'Against code you did not write, with the result recorded.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

lines = sys.stdin.read().split('\\n')
words = lines[0].split() if lines and lines[0].strip() else []
lookups = lines[1].split() if len(lines) > 1 and lines[1].strip() else []
`,
        tests: [
          { input: 'a b a\na b c\n', expectedOutput: 'a=2\nb=1\nc=absent\ndistinct=2' },
          { input: 'x x x\nx\n', expectedOutput: 'x=3\ndistinct=1' },
          { input: '\nq\n', expectedOutput: 'q=absent\ndistinct=0' },
          { input: 'a\n\n', expectedOutput: 'distinct=1' },
          { input: 'p q p r p\nr p z\n', expectedOutput: 'r=1\np=3\nz=absent\ndistinct=3', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('A default of zero is the right choice when:',
        [['The value is a running count and absence genuinely means none yet', true],
          ['The caller cannot handle a missing key', false],
          ['The key set is fixed in advance', false],
          ['The map happens to be read far more often than it is written', false]],
        'And wrong when absent and zero are different facts.'),
      mcq('Reading the counted words as integers changes:',
        [['Which lookups match, because a string key is not a numeric one', true],
          ['The order the counts are reported in', false],
          ['Whether the duplicates still accumulate correctly', false],
          ['Nothing, since both are hashable', false]],
        'Parse once, at the edge, so nothing downstream mixes the two.'),
      mcq('Whether the surviving duplicate was intended:',
        [['Cannot be read from the code, so it should be written down', true],
          ['Is clear enough from which loop direction was used', false],
          ['Depends on the map implementation', false],
          ['Is usually documented by the type signature', false]],
        'Decide first or last deliberately.'),
    ],
  },

  /* ══ T2_ALGORITHMS ══════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T2_ALGORITHMS_HARDER_FAULTS',
    notes: `**An algorithm that is correct and cannot be used.** It returns the right answer, and
it takes an hour on real input — or it returns the right answer for the data in the test and the
wrong one for data that is sorted, or duplicated, or empty.

## Correct and too slow

**A nested loop where a map would do.** Asking "have I seen this?" by searching instead of
looking up. **The most common and the easiest to fix.**

**Recomputing inside a loop what the loop already knew.** A sum, a maximum, a length recalculated
each pass.

**Sorting inside a loop.** Sorting once outside it is the same answer and a different program.

**A linear search on data you control.** If you are searching it repeatedly, build the index
once.

**And string concatenation in a loop**, which copies the whole string each time and is quadratic
in a way nothing in the code suggests.

## Correct on the test and wrong on the input

**A comparison that assumes no duplicates.** Strictly-greater where greater-or-equal was meant,
so equal elements are dropped.

**A binary search on data that is not sorted**, which returns a plausible index rather than
failing.

**An early return that fires on the first match** when the last was wanted.

**A tie broken arbitrarily**, so the answer changes between runs and nobody can reproduce the
bug report.

**And an initial value of zero** for a maximum over possibly-negative data.

## Finding them

**State the complexity out loud, then say where the time goes.** "Quadratic, because the inner
scan asks one question repeatedly" — **that sentence names the fix**, and it is the same move the
interview practice unit drills.

**Then check the constraints.** If the input can be a million and the algorithm is quadratic, it
is wrong regardless of what the tests say.

**And compare against a slow reference** on random input, including duplicates and an all-equal
case. **Disagreement locates the fault without any insight at all.**

## What not to do

**Do not optimise before measuring.** The slow part is frequently not where it feels.

**And do not trade correctness for speed quietly.** If the fast version only works on sorted
input, that is a precondition, and it belongs in the name or the signature rather than in
somebody's memory.`,
    mcqs: [
      mcq('The most common and easiest-to-fix slowness is:',
        [['A nested loop asking "have I seen this?" by searching rather than looking up', true],
          ['Recomputing a sum inside the loop', false],
          ['Sorting inside a loop rather than outside it', false],
          ['String concatenation across many iterations', false]],
        'That is a lookup, not a search.'),
      mcq('A binary search on unsorted data:',
        [['Returns a plausible index rather than failing', true],
          ['Raises an error when the order breaks', false],
          ['Returns the first element every time', false],
          ['Degrades to a linear search', false]],
        'Correct on the test and wrong on the input.'),
      mcq('The sentence that names the fix is:',
        [['The complexity, followed by where the time goes', true],
          ['The input size the algorithm must handle', false],
          ['The data structure currently being used', false],
          ['The difference between best and worst case', false]],
        '"Quadratic, because the inner scan asks one question repeatedly."'),
      mcq('If the fast version only works on sorted input, that precondition belongs:',
        [['In the name or the signature, not in somebody’s memory', true],
          ['In a comment above the function', false],
          ['In an assertion at the top of the body', false],
          ['In the test that covers the sorted case', false]],
        'Do not trade correctness for speed quietly.'),
    ],
    checkpoint: [
      mcq('Strictly-greater where greater-or-equal was meant:',
        [['Drops equal elements, so duplicates change the answer', true],
          ['Reverses the ordering of the whole result', false],
          ['Fails only on an empty input', false],
          ['Makes the comparison unstable', false]],
        'A comparison that assumes no duplicates.'),
      mcq('A tie broken arbitrarily means:',
        [['The answer changes between runs and nobody can reproduce the report', true],
          ['The result is wrong for half the inputs', false],
          ['The algorithm stops being deterministic at all', false],
          ['The comparison needs a secondary key', false]],
        'Which is why ties should be broken deliberately.'),
      mcq('If the input can be a million and the algorithm is quadratic:',
        [['It is wrong regardless of what the tests say', true],
          ['It should be measured before being replaced', false],
          ['It is acceptable if the average case is better', false],
          ['It needs a faster inner loop rather than a new approach', false]],
        'Check the constraints before trusting a passing test.'),
    ],
  },

  {
    unitCode: 'T2_ALGORITHMS_HARDER_PRACTICE',
    notes: `One exercise on the transformation that comes up most: a nested search replaced by a
single pass with a lookup — and getting the duplicate case right while you do it.`,
    coding: [
      {
        title: 'The first value that appears twice',
        description: `Read a list of integers on one line. Print the **first value whose second
occurrence appears earliest**, or \`none\` when every value is unique.

Read that carefully: not the first duplicated value by position of its first occurrence, but the
one whose repeat comes soonest. For \`1 2 3 2 1\` the answer is \`2\`, because its second
occurrence is at index 3 while the second 1 is at index 4.

The nested-loop version is correct and quadratic. **Write the single pass**: walk once, and the
first value you meet that you have already seen is the answer.`,
        starter: `import sys

nums = [int(x) for x in sys.stdin.read().split()]

# One pass. The first value already seen is the one whose repeat comes soonest.
`,
        language: 'python',
        tests: [
          { input: '1 2 3 2 1\n', expectedOutput: '2' },
          { input: '1 2 3\n', expectedOutput: 'none' },
          { input: '', expectedOutput: 'none' },
          { input: '5 5\n', expectedOutput: '5' },
          { input: '-1 3 -1 3\n', expectedOutput: '-1', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Algorithms — Past the Obvious Answer',
      description: 'Replace a nested search with one pass, then find the same transformation in real code.',
      instructions: `Complete the exercise, then:

1. State the complexity of the nested version and of yours, and say where the time went.
2. The problem asks for the earliest **second** occurrence. Write the input on which "first
   duplicated value by first occurrence" gives a different answer, and say what each returns.
3. Say what changes if the values could be unhashable.

**Then, in real code.**

4. Find a nested loop over the same collection. Record the file and state its complexity.
5. Say which transformation from the list applies, and what it removes.
6. Write the faster version and **compare it against the original on random input, including
   duplicates and an all-equal case.** Record any disagreement.
7. Find one comparison that assumes no duplicates. Say what it does when they are present.
8. Measure before and after on realistic input. **If it is not faster, say so** — that is a
   result, and it is the one the notes warn about.`,
      rubric: [
        { criterion: 'Earliest repeat found', description: 'All cases, including none, a two-element list and negatives.', maxPoints: 25 },
        { criterion: 'Complexity stated both ways', description: 'Before and after, with where the time went.', maxPoints: 15 },
        { criterion: 'The specification read precisely', description: 'An input distinguishing the two readings, with both answers.', maxPoints: 15 },
        { criterion: 'A real nested loop transformed', description: 'File recorded, transformation named, faster version written.', maxPoints: 25 },
        { criterion: 'Compared and measured honestly', description: 'Reference comparison including duplicates, and a before-and-after measurement.', maxPoints: 20 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

nums = [int(x) for x in sys.stdin.read().split()]
`,
        tests: [
          { input: '1 2 3 2 1\n', expectedOutput: '2' },
          { input: '1 2 3\n', expectedOutput: 'none' },
          { input: '', expectedOutput: 'none' },
          { input: '5 5\n', expectedOutput: '5' },
          { input: '-1 3 -1 3\n', expectedOutput: '-1', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('For 1 2 3 2 1, the earliest second occurrence belongs to:',
        [['2, because its repeat is at index 3 and the second 1 is at index 4', true],
          ['1, because it is simply the first value that appears twice', false],
          ['3, because it separates the two pairs', false],
          ['Either, since both appear twice', false]],
        'The specification is about the repeat, not the first sighting.'),
      mcq('If the values could be unhashable:',
        [['A set cannot be used, so the transformation needs a different structure', true],
          ['The single pass still works unchanged', false],
          ['The comparison necessarily becomes quadratic all over again', false],
          ['The values must be sorted first', false]],
        'Which is the constraint that decides whether the map transformation applies.'),
      mcq('A faster version that measures no faster is:',
        [['A result worth reporting', true],
          ['A sign the measurement was wrong', false],
          ['Still preferable for its lower complexity', false],
          ['Evidence the input was too small to matter', false]],
        'The slow part is frequently not where it feels.'),
    ],
  },

  /* ══ T2_PY_STRUCTURE ════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T2_PY_STRUCTURE_HARDER_FAULTS',
    notes: `**A project that imports and runs, and cannot be moved, tested or installed.** Nothing
is broken until somebody else clones it.

## The faults

**Work at import time.** A module that reads a file, opens a connection or prints when it is
imported. **Importing it for a test does the work**, and that is why the test suite needs a
database.

**A path relative to the working directory.** \`open('data/x.csv')\` works from the project root
and nowhere else, so it breaks the moment it is run from a different folder or by a scheduler.

**A circular import that currently resolves.** Two modules importing each other, working only
because of the order they happen to be loaded in. The next import anywhere reorders it.

**Configuration read at module level.** The value is captured once, at import, so a test cannot
change it and an environment variable set later has no effect.

**A star import.** Now nothing says where a name came from, and two modules can silently shadow
each other.

**Mutable module-level state.** A cache or a list at module scope is shared by everything in the
process, including every test, in the order they happen to run.

**And a script that is also a module**, with its work outside a main guard, so importing it
executes it.

## Finding them

**Import the module and nothing else.** In a fresh interpreter. **If anything happens, that is
the fault** — and this is a ten-second check almost nobody runs.

**Run it from another directory.** Every path fault surfaces at once.

**Run the tests in a different order**, or one file alone. Shared state shows up immediately.

**And read the top of each file.** Everything above the first function definition runs at
import, and that is the part worth being suspicious of.

## Repairing

**Move work into a function.** Import becomes free, and the caller decides when.

**Resolve paths from the module's own location**, not the working directory.

**Read configuration inside the function that needs it.**

**And put the script behind a main guard**, which costs one line and makes the file importable.`,
    mcqs: [
      mcq('A module that does work at import time means:',
        [['Importing it for a test does the work, so the suite needs a database', true],
          ['The module cannot be imported more than once', false],
          ['Import order becomes significant', false],
          ['The work happens twice under test', false]],
        'Move the work into a function so the caller decides when.'),
      mcq('A path relative to the working directory breaks:',
        [['The moment it is run from a different folder or by a scheduler', true],
          ['Only on operating systems with different separators', false],
          ['When the project is installed as a package', false],
          ['If the file is moved within the project', false]],
        'Resolve from the module’s own location.'),
      mcq('Configuration read at module level cannot be changed by a test because:',
        [['The value is captured once, at import', true],
          ['Tests run in a separate process', false],
          ['Module attributes are read-only', false],
          ['The import is cached after the first use', false]],
        'Read it inside the function that needs it.'),
      mcq('The ten-second check almost nobody runs is:',
        [['Importing the module in a fresh interpreter and seeing whether anything happens', true],
          ['Running the test suite in a random order', false],
          ['Executing the project from a different directory', false],
          ['Reading everything above the first function', false]],
        'If anything happens, that is the fault.'),
    ],
    checkpoint: [
      mcq('A circular import that currently resolves:',
        [['Works because of the order modules happen to load, and the next import reorders it', true],
          ['Is harmless as long as nothing fails', false],
          ['Will be detected and reported by the interpreter eventually anyway', false],
          ['Only matters when the modules are packaged', false]],
        'It is a fault waiting for an unrelated change.'),
      mcq('Mutable module-level state is shared by:',
        [['Everything in the process, including every test in whatever order they run', true],
          ['Only the module that declares it', false],
          ['Each separate import, each of which gets its own copy', false],
          ['Every thread, but not every test', false]],
        'Run one test file alone and it shows up.'),
      mcq('A main guard costs one line and:',
        [['Makes the file importable without executing it', true],
          ['Prevents the script being run directly', false],
          ['Stops module-level code from running', false],
          ['Isolates the module’s state from tests', false]],
        'A script that is also a module.'),
    ],
  },

  {
    unitCode: 'T2_PY_STRUCTURE_HARDER_PRACTICE',
    notes: `One exercise on the structural fault with the widest consequences: configuration
captured at import instead of read when it is needed.`,
    coding: [
      {
        title: 'Configuration that can be changed',
        description: `Read commands, one per line:

- \`set <key> <value>\` — set a configuration value
- \`get <key>\` — print \`<key>=<value>\`, or \`<key>=unset\` when it has never been set
- \`snapshot\` — record the current configuration
- \`restore\` — return the configuration to the last snapshot

A \`get\` must read the value **at the time it is called**, not at the time the program started —
which is the fault the notes describe, expressed as something you can test.

\`restore\` with no prior snapshot leaves the configuration alone. A snapshot must not share
storage with the live configuration, or \`set\` after \`snapshot\` would change the snapshot too.`,
        starter: `import sys

config = {}
snapshot = None

for line in sys.stdin:
    parts = line.split()
    if not parts:
        continue
`,
        language: 'python',
        tests: [
          { input: 'set a 1\nget a\n', expectedOutput: 'a=1' },
          { input: 'get a\n', expectedOutput: 'a=unset' },
          { input: 'set a 1\nsnapshot\nset a 2\nget a\nrestore\nget a\n', expectedOutput: 'a=2\na=1' },
          { input: 'restore\nget a\n', expectedOutput: 'a=unset' },
          { input: 'set a 1\nsnapshot\nset b 2\nrestore\nget a\nget b\n', expectedOutput: 'a=1\nb=unset', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Project Structure — Past the Obvious Answer',
      description: 'Configuration read when needed, then a real project audited for import-time faults.',
      instructions: `Complete the exercise, then:

1. Say what happens if \`snapshot\` stores the configuration without copying it, and which test
   catches it.
2. Say why \`restore\` with no snapshot leaves things alone rather than emptying the
   configuration, and what the alternative would cost a caller.
3. Describe how you would expose this configuration to the rest of a project so that a test can
   change it. Name the mechanism.

**Then, in a real project** — yours or one you can clone.

4. **Import each module in a fresh interpreter, one at a time.** Record every one where
   something happens.
5. Run the project from a different directory. Record every path that breaks.
6. Run one test file alone, then the suite in reverse order. Record anything that changes.
7. Find a value read at module level. Say what it would take to change it under test.
8. Fix one of the faults you found. Say which check now passes that did not.`,
      rubric: [
        { criterion: 'Configuration behaviour correct', description: 'All cases, including unset, restore with no snapshot, and an independent snapshot.', maxPoints: 25 },
        { criterion: 'The copying fault explained', description: 'What happens without a copy, and the test that catches it.', maxPoints: 15 },
        { criterion: 'A mechanism named', description: 'How a test would change configuration in a real project.', maxPoints: 15 },
        { criterion: 'Modules imported one at a time', description: 'In a fresh interpreter, with every side effect recorded.', maxPoints: 20 },
        { criterion: 'Paths and test order probed', description: 'Run from elsewhere and reordered, with findings recorded.', maxPoints: 15 },
        { criterion: 'One fault fixed', description: 'With the check that now passes named.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

config = {}
snapshot = None
`,
        tests: [
          { input: 'set a 1\nget a\n', expectedOutput: 'a=1' },
          { input: 'get a\n', expectedOutput: 'a=unset' },
          { input: 'set a 1\nsnapshot\nset a 2\nget a\nrestore\nget a\n', expectedOutput: 'a=2\na=1' },
          { input: 'restore\nget a\n', expectedOutput: 'a=unset' },
          { input: 'set a 1\nsnapshot\nset b 2\nrestore\nget a\nget b\n', expectedOutput: 'a=1\nb=unset', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('A snapshot that does not copy:',
        [['Changes with the live configuration, so restore does nothing', true],
          ['Raises an error the moment the configuration changes', false],
          ['Keeps only the keys present at snapshot time', false],
          ['Restores correctly but uses more memory', false]],
        'The same shared-reference fault as the objects unit.'),
      mcq('Restore with no snapshot leaving things alone is preferable because:',
        [['Emptying the configuration would destroy state the caller never saved', true],
          ['An error would be considerably harder for the caller to handle', false],
          ['It keeps the operation idempotent', false],
          ['The alternative is ambiguous to implement', false]],
        'The safer default when nothing was recorded.'),
      mcq('A value read at module level can be made testable by:',
        [['Reading it inside the function that needs it', true],
          ['Reassigning the module attribute in the test', false],
          ['Reloading the module between tests', false],
          ['Setting the environment before the import', false]],
        'Then the caller decides when it is read, including a test.'),
    ],
  },

  /* ══ T2_PY_ROBUST ═══════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T2_PY_ROBUST_HARDER_FAULTS',
    notes: `**Error handling that makes a failure harder to find than no error handling would
have.** The program does not crash. It does the wrong thing quietly instead.

## The faults

**A bare except.** Catches everything, including the interrupt you pressed and the typo in the
name of a variable. **A misspelled variable inside a bare except becomes a silent no-op**, and
that is a fault which can live for years.

**An empty handler.** The failure is swallowed, so the next symptom appears somewhere unrelated
and the cause is invisible.

**Catching too broadly.** \`except Exception\` around thirty lines, so a fault in line three is
reported as a fault in the operation as a whole.

**A handler that logs and continues** with the value unset, so the code below works on a default
nobody chose.

**Re-raising the wrong thing.** Catching a specific error and raising a generic one loses the
detail somebody needs at 3am.

**A \`finally\` that returns**, discarding the exception entirely.

**And retrying something that is not transient.** A bad request retried five times is five bad
requests, and it is slower and no more correct.

## The part people get backwards

**Handling an error is not the same as recovering from it.**

If the code cannot continue correctly, **the honest thing is to fail** — with a message naming
what was being attempted and what went wrong. A program that reports a clear failure is more
useful than one that produces a plausible wrong answer, and it is the difference between a
five-minute diagnosis and a week.

## Finding them

**Search for the bare except and the empty handler.** Two searches, and they find most of it.

**Then ask, for each handler: what does the code do next, and is that correct?** If the answer
is "carries on with nothing", the handler is hiding a fault rather than handling it.

**And read the log message.** "Error occurred" tells whoever is woken up nothing; a message
without the identifier is unsearchable, which the logging unit made its central point.

## Repairing

**Catch the specific exception** you know how to handle.

**Handle it where you can do something about it**, and let it travel otherwise.

**Include the context in the message**: what was attempted, which identifier, what came back.

**And let the unexpected crash.** A stack trace is information; a silence is not.`,
    mcqs: [
      mcq('A misspelled variable inside a bare except:',
        [['Becomes a silent no-op, and can live for years', true],
          ['Raises a name error that is reported normally', false],
          ['Is caught at import time by the interpreter', false],
          ['Fails only when the handler is reached', false]],
        'A bare except catches everything.'),
      mcq('A handler that logs and continues with the value unset means:',
        [['The code below works on a default nobody chose', true],
          ['The failure is recorded and recovered from', false],
          ['The next call will retry the operation', false],
          ['The error is reported twice', false]],
        'Ask what the code does next.'),
      mcq('The part people get backwards is that:',
        [['Handling an error is not the same as recovering from it', true],
          ['Broad handlers are safer than specific ones', false],
          ['Logging is a substitute for failing', false],
          ['Retrying is always preferable to failing', false]],
        'If the code cannot continue correctly, the honest thing is to fail.'),
      mcq('A program that reports a clear failure rather than a plausible wrong answer is:',
        [['The difference between a five-minute diagnosis and a week', true],
          ['Harder for a user to work around', false],
          ['Preferable only in development', false],
          ['Equivalent, provided the failure is logged', false]],
        'Let the unexpected crash.'),
    ],
    checkpoint: [
      mcq('Retrying something that is not transient gives you:',
        [['Five bad requests instead of one, slower and no more correct', true],
          ['A better chance of eventual success', false],
          ['Protection against a genuinely intermittent fault', false],
          ['A clearer signal in the logs', false]],
        'Retry only what can succeed on a second attempt.'),
      mcq('A finally block that returns:',
        [['Discards the exception entirely', true],
          ['Runs after the exception propagates', false],
          ['Re-raises the original error afterwards', false],
          ['Is equivalent to returning from the handler', false]],
        'One of the quieter ways to lose a failure.'),
      mcq('The two searches that find most of this class are:',
        [['The bare except and the empty handler', true],
          ['The broad catch and the retry loop', false],
          ['The finally block and the re-raise', false],
          ['The log call and the default value', false]],
        'Two searches, and they find most of this whole class.'),
    ],
  },

  {
    unitCode: 'T2_PY_ROBUST_HARDER_PRACTICE',
    notes: `One exercise on the judgement this topic turns on: which failures are worth retrying,
and which handler is hiding a fault rather than handling it.`,
    coding: [
      {
        title: 'Retry only what can succeed',
        description: `Read one attempted operation per line as \`<name> <kind> <attempts>\`,
where kind is \`timeout\`, \`server_error\`, \`bad_request\`, \`not_found\` or \`unauthorised\`,
and attempts is how many times the code retried it.

A failure is **transient** — worth retrying — when it is a \`timeout\` or a \`server_error\`.
Everything else is permanent: the same request will fail the same way.

Print per line:

- transient and attempts is 2 or more → \`<name> ok\`
- transient and attempts is 1 → \`<name> RETRY_MISSING\`
- permanent and attempts is 1 → \`<name> ok\`
- permanent and attempts is 2 or more → \`<name> WASTED <attempts>\`

Then \`wasted=<total retries spent on permanent failures>\`, counting \`attempts - 1\` for each
wasted line.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# Transient means the same request could succeed. Everything else is a wasted retry.
`,
        language: 'python',
        tests: [
          { input: 'a timeout 3\n', expectedOutput: 'a ok\nwasted=0' },
          { input: 'a timeout 1\n', expectedOutput: 'a RETRY_MISSING\nwasted=0' },
          { input: 'a bad_request 4\n', expectedOutput: 'a WASTED 4\nwasted=3' },
          { input: 'a not_found 1\n', expectedOutput: 'a ok\nwasted=0' },
          { input: 'p server_error 2\nq unauthorised 3\nr bad_request 2\n', expectedOutput: 'p ok\nq WASTED 3\nr WASTED 2\nwasted=3', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Robust Programs — Past the Obvious Answer',
      description: 'Classify what is worth retrying, then audit real error handling.',
      instructions: `Complete the exercise, then:

1. Say why a \`not_found\` retried once counts as \`ok\` while retried twice is wasted, and what
   the code should have done instead.
2. Give a failure kind that is genuinely ambiguous — sometimes transient, sometimes not — and say
   how you would decide at runtime.
3. Say what you would add to make a retry safe to repeat, and which unit of Year 2 already argued
   for it.

**Then, in real code.**

4. Search for a bare except. Record every one you find and what each would swallow.
5. Search for an empty handler. For each, say what the code does next and whether that is
   correct.
6. Find the broadest handler in the project. Count the lines inside it and say which specific
   failure it was written for.
7. Find a log message in a handler that would not help at 3am. Rewrite it with the context it
   needs.
8. Fix one handler. **Prove the failure is now visible** — show the message or the trace.`,
      rubric: [
        { criterion: 'Retry classification correct', description: 'All cases, with the wasted total computed from attempts minus one.', maxPoints: 25 },
        { criterion: 'The single-attempt rule explained', description: 'Why one attempt is fine and two is waste, with what to do instead.', maxPoints: 15 },
        { criterion: 'An ambiguous failure reasoned about', description: 'With a runtime decision rule, and idempotency raised.', maxPoints: 15 },
        { criterion: 'Bare and empty handlers found', description: 'Each recorded with what it swallows and what happens next.', maxPoints: 20 },
        { criterion: 'The broadest handler examined', description: 'Lines counted and the intended failure named.', maxPoints: 10 },
        { criterion: 'One handler fixed and proved', description: 'With the failure now visible in a message or a trace.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]
`,
        tests: [
          { input: 'a timeout 3\n', expectedOutput: 'a ok\nwasted=0' },
          { input: 'a timeout 1\n', expectedOutput: 'a RETRY_MISSING\nwasted=0' },
          { input: 'a bad_request 4\n', expectedOutput: 'a WASTED 4\nwasted=3' },
          { input: 'a not_found 1\n', expectedOutput: 'a ok\nwasted=0' },
          { input: 'p server_error 2\nq unauthorised 3\nr bad_request 2\n', expectedOutput: 'p ok\nq WASTED 3\nr WASTED 2\nwasted=3', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('A not-found retried once is acceptable because:',
        [['One attempt is the attempt itself, not a retry', true],
          ['The resource may appear on a second look', false],
          ['A single retry is cheap enough to ignore', false],
          ['Not-found is sometimes transient', false]],
        'The waste starts at the second attempt.'),
      mcq('Making a retry safe to repeat needs:',
        [['An idempotency key, as the offline queue and the API units both argued', true],
          ['A longer delay between attempts', false],
          ['A cap on the number of attempts', false],
          ['A check confirming that the first attempt really failed', false]],
        'Otherwise a retry after a lost response acts twice.'),
      mcq('A log message that would not help at 3am is one without:',
        [['The identifier, which makes it unsearchable', true],
          ['A severity level attached to it', false],
          ['A timestamp at sufficient precision', false],
          ['The name of the function that logged it', false]],
        'The logging unit made that its central point.'),
    ],
  },
];
