/**
 * T4_BR_COLLECTIONS, T4_BR_OOP and T4_BR_DSA — twelve units. Module P02, days 4-6.
 *
 * ── WHERE THE BRIDGE STOPS BEING REMEDIAL ─────────────────────────────────────────────────
 *
 * Days 1-3 repaired the mechanics: values, control flow, functions. These three are the first
 * where the question stops being "can you write it" and becomes "did you choose the right
 * thing", and that is the shape every later Year-4 module takes.
 *
 * A student who reaches day 6 able to write a loop but unable to say what it costs has the
 * mechanics and not the judgement, and the judgement is the whole of what a written round tests.
 * So the DSA day is deliberately about cost and choice rather than about implementing sorts —
 * nobody is asked to write quicksort in a placement paper, and everybody is asked which of two
 * correct approaches is cheaper.
 *
 * ── THE OOP DAY IS ONE DAY, WHICH IS A DECISION ───────────────────────────────────────────
 *
 * Year 1 and Year 2 both spend considerably longer. One day here covers classes, instances,
 * constructors and encapsulation and stops — no inheritance hierarchy, no polymorphism lecture.
 *
 * That is not an oversight. The bridge's job is to get a student to the point where the
 * ENGINEERING BUILD's OOP-design topic is openable, and that topic starts from composition and
 * interfaces. What it needs from the bridge is somebody who knows what an object holds and why
 * the inside is private. Everything else is taught properly in P03 where it belongs.
 *
 * ── SAME AUTHORING RULE AS DAYS 1-3 ───────────────────────────────────────────────────────
 *
 * Consequences, not definitions, because Years 1 and 2 already asked the definitions and a
 * repeated question measures memory of those years rather than this bridge. See
 * year4ContentBridgeProgramming for the full argument.
 *
 * Attribution: T4_BR_COLLECTIONS defaults to PYTHON_COLLECTIONS with LISTS_AND_STRINGS on
 * PYTHON_STRINGS; T4_BR_OOP to OOP_CONCEPTS with CLASSES_AND_OBJECTS on PYTHON_OOP; T4_BR_DSA to
 * DSA_COMPLEXITY with the sorting, array and searching units on their own skills.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const BRIDGE_DATA_BUNDLES: PilotBundle[] = [
  /* ══ T4_BR_COLLECTIONS ══════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_BR_COLLECTIONS_LISTS_AND_STRINGS',
    notes: `**The copy you thought you made** is the bug this unit exists for.

## Slicing copies, assignment does not

    a = [1, 2, 3]
    b = a          # the same list, under two names
    c = a[:]       # a new list with the same contents

Change \`b\` and \`a\` changes. Change \`c\` and it does not. **Every "why did my original list
change" question is this**, and it is one of the most common bugs in a placement submission.

## Strings cannot be changed at all

\`s[0] = "x"\` is an error. Every string operation returns a NEW string, which means
\`s.replace(...)\` on its own does nothing unless you assign the result somewhere.

**That is a bug that produces no error and no effect**, which makes it slower to find than one
that crashes.

## Building a string in a loop

Concatenating in a loop creates a new string every iteration. For a few hundred items nobody
notices; for a hundred thousand it is quadratic and the program does not finish.

**Collect into a list and join once.** One line, and it is linear.

## Slicing past the end is legal

\`items[5:]\` on a three-item list gives \`[]\` rather than an error. Convenient, and it means a
slice-based bug fails silently rather than loudly — the opposite of indexing, where \`items[5]\`
tells you immediately.`,
    mcqs: [
      mcq('After `b = a` on a list, appending to b leaves a:',
        [['Changed, because both names hold one list', true],
         ['Unchanged, since assignment produces a copy of it', false],
         ['Unchanged, unless a was declared at global scope', false],
         ['Changed only when the two lists are the same length', false]],
        'Assignment binds a second name to the same object. Only a slice, list() or copy() produces something independent.'),
      mcq('`s.replace("a", "b")` on its own line has no effect because strings are:',
        [['Immutable, so the method returns a new one', true],
         ['Copied on write, which defers the change made here', false],
         ['Only modifiable through indexed assignment instead', false],
         ['Cached, so the original is restored after the call', false]],
        'Every string method returns a new string and leaves the original alone. Without assigning the result, the work is computed and discarded.'),
      mcq('Building a long string by concatenating in a loop is slow because each step:',
        [['Creates a whole new string from both parts', true],
         ['Reallocates the buffer to twice its previous size', false],
         ['Has to scan the string to find its current length', false],
         ['Locks the string while the append is taking place', false]],
        'Immutability means there is no append. Each concatenation copies everything so far, making the loop quadratic in the final length.'),
    ],
    checkpoint: [
      mcq('A function sorts a list it was given and the caller’s list comes back reordered. The function used:',
        [['sort(), which reorders the list in place', true],
         ['sorted(), which returns a new list of the items', false],
         ['A slice, which shares storage with the original list', false],
         ['A comparison function that had a side effect on it', false]],
        'list.sort() mutates and returns None; sorted() returns a new list and leaves the argument alone. Choosing the wrong one reaches the caller.'),
      mcq('`items[5:]` on a three-item list gives an empty list rather than an error. Compared with indexing, this is:',
        [['More convenient, and a slower bug to find', true],
         ['Safer overall, because errors are always avoided now', false],
         ['Equivalent, since both signal the out-of-range access', false],
         ['A defect in the language that should raise an error', false]],
        'Failing silently means an out-of-range slice flows on as an empty result. Indexing would have said so at the line where it happened.'),
    ],
  },
  {
    unitCode: 'T4_BR_COLLECTIONS_MAPS_AND_SETS',
    notes: `**The answer is almost never "a list"**, and knowing why is most of what separates a
passing solution from a timing out one.

## Three questions, three structures

**"What is the value for this key?"** A dictionary. Constant time, whatever the size.

**"Have I seen this before?"** A set. Constant time, and the single most useful structure in a
timed round.

**"What is the order these arrived in?"** A list. That is what it is good at, and lookup is not.

## The pattern that costs the marks

    for x in items:
        if x in seen_list:     # linear scan, every time
            ...

**That is quadratic.** With \`seen_list\` a set it is linear, and the change is one word. This
single substitution is the difference between passing and timing out on more placement problems
than any other.

## Counting

\`d[k] = d.get(k, 0) + 1\` counts occurrences in one line without a membership check first.
\`collections.Counter\` does it in none, and both are fine; what is not fine is a nested loop
counting how many times each item appears.

## What cannot be a key

**Anything mutable.** A list cannot be a dictionary key or a set member, because its hash would
change when it changed. A tuple can. This is why it is a rule rather than an inconvenience.`,
    mcqs: [
      mcq('Replacing `if x in seen_list` with a set changes the loop’s overall cost from:',
        [['Quadratic to linear, for a one-word change', true],
         ['Linear to constant, because lookups are now free', false],
         ['Quadratic to logarithmic, because sets stay sorted', false],
         ['Linear to linear, since the scan still has to happen', false]],
        'A list membership test scans. Inside a loop over n items that is n squared; a set makes each test constant and the whole loop linear.'),
      mcq('A list cannot be used as a dictionary key because its:',
        [['Hash would change when its contents changed', true],
         ['Length is not known at the time of the insertion', false],
         ['Contents may include values of several different types', false],
         ['Identity is not stable across the program’s execution', false]],
        'A hash table finds a key by its hash. If that value could change after insertion, the entry would become unreachable in its own table.'),
      mcq('`d.get(k, 0) + 1` is preferred to checking membership first mainly because it:',
        [['Does one lookup rather than two of them', true],
         ['Handles keys of types that membership cannot check', false],
         ['Raises an error when the key is genuinely missing now', false],
         ['Is the only form that works on a nested dictionary too', false]],
        'The membership test and the read are the same lookup done twice. get with a default collapses them, which matters inside a hot loop.'),
    ],
    checkpoint: [
      mcq('A solution passes small tests and times out on large ones. The first structure to look for is:',
        [['A membership test against a list inside a loop', true],
         ['A dictionary being rebuilt on each of the iterations', false],
         ['A string being compared rather than an integer value', false],
         ['A recursive call that is not using any memoisation yet', false]],
        'It is the most common accidental quadratic in placement code, and it is invisible at small n because the scan is short.'),
      mcq('An exercise needs both "have I seen it" and "in what order did it arrive". The right answer is to:',
        [['Keep a list for order and a set for membership', true],
         ['Use a list alone and scan it for the membership test', false],
         ['Use a set alone, since sets preserve insertion order now', false],
         ['Use a dictionary keyed on the arrival position instead', false]],
        'Each structure answers one question well. Keeping both costs a few bytes and keeps every operation at the cost it should be.'),
    ],
  },
  {
    unitCode: 'T4_BR_COLLECTIONS_DEBUGGING',
    notes: `**Programs that use the wrong container, and the symptoms each mistake produces.**

## Learn the symptom, find the cause

**It times out on large input.** Almost certainly a linear scan where a hash lookup belonged.
Look for \`in\` against a list, or a nested loop comparing every pair.

**The original changed unexpectedly.** An alias rather than a copy, or an in-place method —
\`sort\`, \`append\`, \`reverse\` — called on something that was passed in.

**The output is in the wrong order.** A set or a dictionary being relied on for order it was
never asked to keep, or a sort that compared strings where numbers were meant.

**A key is missing that should be there.** Usually a type mismatch: the key was stored as an
integer and looked up as a string, or the other way round. \`d[1]\` and \`d["1"]\` are different
entries.

## The technique

**Print the container, not the loop.** One \`print(d)\` before the failing line settles what is
actually in there, and it is frequently not what you believed. Reading the code again will not
tell you this; the code is what produced the belief.`,
    mcqs: [
      mcq('A dictionary lookup misses a key that is visibly present when printed. The likeliest cause is that the key’s:',
        [['Type differs between storing and looking up', true],
         ['Value contains a character that cannot be hashed at all', false],
         ['Entry was removed by another part of the program first', false],
         ['Dictionary exceeded the size at which it is rehashed now', false]],
        'Printing shows 1 and "1" identically in many contexts, and they are different keys. It is the standard cause of a present-but-missing entry.'),
      mcq('A program’s output order changes between runs. The most likely cause is reliance on the order of:',
        [['A set, which never promised any ordering', true],
         ['A list, whose ordering can vary with its size here', false],
         ['A sorted call that was given an unstable comparison', false],
         ['A dictionary, which has been ordered since Python 3.7', false]],
        'Sets are unordered by design and their iteration order can differ. Dictionaries have preserved insertion order since 3.7, so they are not the suspect.'),
      mcq('Printing the container before the failing line is more useful than re-reading the code because the code:',
        [['Is what produced the belief that is wrong', true],
         ['May have been changed since the error was first seen', false],
         ['Is usually too long to read within the time available', false],
         ['Does not show which branch was actually taken at runtime', false]],
        'You already read the code and concluded what is in there. Only the runtime can settle a disagreement between that belief and reality.'),
    ],
    checkpoint: [
      mcq('A program is correct on ten items and times out on a hundred thousand. Before optimising anything, you should:',
        [['Find which operation is repeated most often', true],
         ['Rewrite the inner loop in a more efficient manner', false],
         ['Switch every list in the program over to being a set', false],
         ['Reduce the input size until it completes in time again', false]],
        'The cost is concentrated somewhere. Changing things before knowing where turns a two-minute fix into an afternoon of guessing.'),
      mcq('A caller’s list is reordered after a function was called on it. The function most likely used:',
        [['An in-place method on the argument it was given', true],
         ['A slice, which shares its storage with the original', false],
         ['A global reference to the list rather than the parameter', false],
         ['A comparison that had side effects on the elements', false]],
        'sort, reverse and append all mutate the object the caller still holds. Rebinding the parameter would have been local and harmless.'),
    ],
  },
  {
    unitCode: 'T4_BR_COLLECTIONS_PRACTICE',
    notes: `**Choosing the container without thinking about it.**

## What is being drilled

**The substitution.** Membership against a set rather than a list, until reaching for the set is
automatic.

**Counting in one line**, rather than with a membership test and a branch.

**Grouping.** \`setdefault\` or a \`defaultdict\`, so that collecting items under a key is one
line rather than four.

## The question to ask before writing

**"What does this problem do most often?"** Not "what data is this" — what OPERATION is repeated.
Lookup, membership, ordering, or taking the smallest. The answer names the structure, and it does
so before any code exists.

## What good looks like

**No nested loop over the same data.** If you write one, stop and ask what the inner loop is
searching for; the answer is almost always something a dictionary already knows.

## Time yourself

**These should be quick.** Slowness here is not a knowledge gap, it is an unpractised reflex, and
the reflex is what a timed round is measuring.`,
    coding: [
      {
        title: 'First word that appears twice',
        description: `One line of whitespace-separated words.

Print the first word that appears for a second time, reading left to right. Then print
\`distinct=N\`, where N is how many distinct words the input contained.

If no word repeats, print \`none\` on the first line.`,
        starter: `import sys

words = sys.stdin.read().split()
`,
        language: 'python',
        tests: [
          { input: 'the cat sat on the mat\n', expectedOutput: 'the\ndistinct=5' },
          { input: 'a b c\n', expectedOutput: 'none\ndistinct=3' },
          { input: '\n', expectedOutput: 'none\ndistinct=0', isHidden: true },
        ],
      },
    ],
    mcqs: [
      mcq('Before choosing a container, the useful question is which operation the problem:',
        [['Performs most often across its whole run', true],
         ['Performs first, since that sets up the rest of it', false],
         ['Finds hardest to express in the chosen language here', false],
         ['Performs on the largest individual piece of the data', false]],
        'Cost is frequency times unit cost. The operation repeated most is the one whose unit cost decides whether the program finishes.'),
      mcq('You have written a nested loop over the same list. The thing to ask is what the inner loop:',
        [['Is searching for, since a map likely knows it', true],
         ['Costs, so that it can be documented in a comment', false],
         ['Would do if the outer loop ran in reverse order now', false],
         ['Returns, so that the result can be cached for reuse', false]],
        'An inner loop over the same data is nearly always a lookup written out longhand, and a dictionary or set answers it in constant time.'),
    ],
    checkpoint: [
      mcq('Grouping items under a key with `setdefault` rather than a membership check and a branch is better chiefly because it:',
        [['Removes a branch that can be got wrong', true],
         ['Runs substantially faster on very large inputs', false],
         ['Handles keys that a membership test cannot check', false],
         ['Is the only approach that preserves insertion order', false]],
        'Both are correct when written correctly. The one-liner has no first-time special case to forget, which is where the bug in the long form lives.'),
      mcq('A drill exercise takes fifteen minutes rather than four, and the answer is right. This indicates:',
        [['A reflex that is not yet built, not a gap', true],
         ['A gap in understanding that needs re-teaching now', false],
         ['That the exercise was harder than it was intended', false],
         ['That the student should move on to harder material', false]],
        'Correct but slow means the knowledge is present and unrehearsed. That is exactly what repetition addresses and what a clock punishes.'),
    ],
  },

  /* ══ T4_BR_OOP ══════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_BR_OOP_CLASSES_AND_OBJECTS',
    notes: `**A class is a description; an object is a thing.** The confusion between them
produces one specific bug, and it is worth meeting deliberately.

## State belongs to the instance

    class Basket:
        items = []          # shared by EVERY basket ever made

    class Basket:
        def __init__(self):
            self.items = []  # one per basket

**The first version gives every basket the same list.** Add to one and all of them have it. It
is the class-level equivalent of the mutable default argument, and it produces a bug that looks
like data corruption.

## What __init__ is actually doing

**Not creating the object** — Python has already done that. \`__init__\` receives the new,
empty object as \`self\` and fills in its starting state. That is the whole job.

## self is not magic

It is the first parameter, and it is passed automatically when you call a method on an instance.
\`basket.add(x)\` is \`Basket.add(basket, x)\`. Once that clicks, forgetting \`self\` in a method
signature stops being mysterious.

## Why bother at all

**Because state and the operations on it travel together.** A dictionary of order data and six
loose functions that all take it as their first argument is a class written longhand, and it
falls apart the moment two of those functions disagree about the shape.`,
    mcqs: [
      mcq('A list assigned directly in a class body rather than in `__init__` is:',
        [['Shared by every instance of that class', true],
         ['Created fresh for each instance automatically anyway', false],
         ['Invalid, and raises an error when the class is defined', false],
         ['Read-only, so instances cannot append to it at all', false]],
        'A class-body assignment creates one object on the class itself. Every instance reaching for it finds the same list unless it assigns its own.'),
      mcq('`basket.add(x)` is equivalent to:',
        [['Basket.add(basket, x)', true],
         ['Basket.add(x), with the instance supplied later', false],
         ['add(basket, x), resolved from the enclosing module', false],
         ['Basket.add(x, basket), with the order reversed here', false]],
        'Calling a method on an instance passes that instance as the first argument, which is what self receives. There is nothing else to it.'),
      mcq('`__init__` does NOT:',
        [['Create the object it is given', true],
         ['Receive the new object as its first argument value', false],
         ['Set up the starting state of the new instance now', false],
         ['Run automatically when the class is called directly', false]],
        'The object exists before __init__ runs and is handed to it as self. Its job is to populate that object, not to bring it into being.'),
    ],
    checkpoint: [
      mcq('Two objects of one class unexpectedly share a value. The first place to look is:',
        [['An assignment in the class body, outside __init__', true],
         ['A missing self on one of the method definitions used', false],
         ['A method that was defined as static rather than normal', false],
         ['The constructor being called with the same arguments', false]],
        'Class-body assignment is the standard cause of shared state, and it is the direct analogue of the mutable-default-argument trap.'),
      mcq('A dictionary of data plus six functions that all take it as their first argument is:',
        [['A class written out the long way round', true],
         ['A better design, because it avoids any inheritance', false],
         ['Equivalent, and preferable for its greater simplicity', false],
         ['Only a problem when the functions are in one module', false]],
        'The coupling is already there; only the grouping is missing. The failure arrives when two of the functions disagree about the dictionary’s shape.'),
    ],
  },
  {
    unitCode: 'T4_BR_OOP_ENCAPSULATION',
    notes: `**Keeping the inside private so that the outside can stop caring**, and what breaks
the day it does not.

## The concrete version

A \`Basket\` that exposes \`add\`, \`remove\` and \`total\` can change how it stores items —
list, dictionary, whatever — **without anything outside it changing at all**.

A \`Basket\` whose \`items\` list everybody reaches into directly cannot. Every caller that wrote
\`basket.items.append(x)\` now has to change, and you will not find all of them.

## What it buys you concretely

**One place to enforce a rule.** "A quantity may never be negative" lives inside \`remove\` and
holds everywhere. Written at each call site instead, it holds at the call sites somebody
remembered.

**One place to change.** The storage decision is reversible while it is private, and permanent
the moment it is not.

## Python does not enforce this

There is no \`private\`. A leading underscore is a convention that says "this is not part of what
I promise". **It stops nobody, and it tells everybody**, which is most of the value.

## The interview version

**"What did encapsulation prevent in something you wrote?"** The answer is not the definition.
It is a specific rule that would otherwise have had to be repeated, or a storage change that
would otherwise have touched twenty files.`,
    mcqs: [
      mcq('A rule such as "quantity may never be negative" is best enforced:',
        [['Inside the method that changes the quantity', true],
         ['At every call site that reduces the quantity value', false],
         ['In a validation pass run after all the changes finish', false],
         ['By the type system, which rejects negatives outright', false]],
        'One place holds everywhere. Repeated at each call site it holds at the ones somebody remembered, and the list of those grows.'),
      mcq('Callers that reach into `basket.items` directly make which change expensive?',
        [['Replacing the list with a different structure', true],
         ['Adding a new method to the basket class itself', false],
         ['Renaming a method that nothing outside is calling', false],
         ['Creating additional instances of the basket class', false]],
        'The storage decision has leaked into every caller. Changing it now means finding and editing all of them, and missing one fails silently.'),
      mcq('A leading underscore in Python:',
        [['Signals intent without preventing access', true],
         ['Prevents access from outside the defining class', false],
         ['Renames the attribute so it cannot be found at all', false],
         ['Is enforced by the interpreter at attribute access', false]],
        'There is no access control. The convention communicates what is and is not part of the promise, and communication is most of the benefit.'),
    ],
    checkpoint: [
      mcq('Asked what encapsulation prevented in your own project, the strongest answer names:',
        [['A specific rule that would otherwise have been repeated', true],
         ['The definition of encapsulation and its main benefits', false],
         ['The number of private attributes the class ended up with', false],
         ['A design pattern that the class was written to follow', false]],
        'The question is asking whether you have experienced the benefit, not whether you can define it. A concrete instance is the only answer that shows that.'),
      mcq('A class stores items in a list and every caller reaches into it. Switching to a dictionary is:',
        [['A change to every caller, found by searching', true],
         ['A change confined to the class and its own methods', false],
         ['Impossible, because the interface is now fixed forever', false],
         ['Safe, since the callers will fail loudly if they break', false]],
        'The leak turned an internal decision into a public one. Worse, some callers will keep working by accident and fail later.'),
    ],
  },
  {
    unitCode: 'T4_BR_OOP_DEBUGGING',
    notes: `**Classes that almost work**, and the four ways they usually do not.

## Shared state between instances

Two objects that should be independent are not. **Look in the class body for an assignment that
belongs in \`__init__\`.**

## The missing self

\`def add(x):\` in a class receives the instance as \`x\` and the actual argument nowhere. The
error is confusing — a \`TypeError\` about argument counts — and the cause is one word.

## Attribute set in one method, read in another that runs first

**\`AttributeError\` on an attribute you can see being assigned.** The assignment is in a method
nobody called yet. Anything a method depends on should be created in \`__init__\`, even if only
as \`None\`.

## Equality that is identity

Two objects with identical contents are not equal unless the class says so. \`a == b\` is
\`a is b\` by default, which means a list of objects will not find a match, a set will hold
duplicates, and a dictionary lookup will miss.

## The approach

**Print the object's \`__dict__\`.** It shows exactly what that instance holds, which settles
the first three of these immediately and is faster than reading the class.`,
    mcqs: [
      mcq('A TypeError about argument counts on a method call usually means the definition is:',
        [['Missing self as its first parameter', true],
         ['Declaring a default value that cannot be evaluated now', false],
         ['Returning a value where none was expected by caller', false],
         ['Defined outside the class body it appears to be in', false]],
        'Without self, the instance fills the first declared parameter and every real argument shifts along by one, so the count is off by one.'),
      mcq('Two objects with identical contents compare as unequal because by default equality is:',
        [['Identity, so only the same object matches', true],
         ['Structural, but ignores any attributes set later on', false],
         ['Undefined, so the comparison raises a type error here', false],
         ['Based on the class name rather than on the contents', false]],
        'Unless the class defines __eq__, two distinct objects are never equal. This is why a set of them holds duplicates and a lookup misses.'),
      mcq('An AttributeError names an attribute you can see being assigned in another method. The cause is that:',
        [['That method has not been called on this object', true],
         ['The attribute name was spelled differently in one place', false],
         ['The assignment happens inside a conditional branch used', false],
         ['The attribute was deleted by a different method earlier', false]],
        'An attribute exists only after the assignment runs. Creating everything in __init__, even as None, removes this whole family of failure.'),
    ],
    checkpoint: [
      mcq('Printing an instance’s `__dict__` is a good first debugging step because it shows:',
        [['Exactly what that one object actually holds', true],
         ['Which methods have been called on that object so far', false],
         ['Where each attribute was assigned within the class', false],
         ['Whether the class was defined correctly at import time', false]],
        'It settles what is present and what its values are, which decides between shared state, a missing assignment and a misspelling in seconds.'),
      mcq('A list of objects never finds a match with `in`, though an equal-looking object is present. The class needs:',
        [['An equality definition of its own', true],
         ['Its attributes to be made public rather than private', false],
         ['A conversion to a tuple before the membership test', false],
         ['The list to be sorted before the test is carried out', false]],
        'Membership uses equality, and the default equality is identity. Until __eq__ says what "the same" means, only the very same object matches.'),
    ],
  },
  {
    unitCode: 'T4_BR_OOP_PRACTICE',
    notes: `**Small classes, written quickly, that hold a rule.**

## What is being drilled

**Deciding what is state.** Everything the object needs to answer its questions, and nothing
else. Anything derivable is a method, not an attribute — otherwise it can disagree with the
thing it was derived from.

**Putting the rule inside.** Each exercise has one invariant the class must protect, and the
whole exercise is about where that check goes.

**Keeping the interface small.** Three or four methods. If a caller needs a fifth, ask whether
they are reaching for something that should have been private.

## The check before you write

**Name the questions the object will be asked.** Those are the methods. Then name what it must
remember to answer them. That is the state. Everything else is not part of this class.

## What a good answer looks like

**Nothing outside the class touches its internals**, and the invariant cannot be broken from
outside no matter what order the methods are called in. That second part is the interesting one
and the one worth checking deliberately.`,
    coding: [
      {
        title: 'A counter that will not go negative',
        description: `Read commands, one per line: \`add N\`, \`remove N\`, or \`total\`.

\`add\` increases a running count, \`remove\` decreases it but never below zero, and \`total\`
prints the current count.

Write it as a class with the rule inside the class, then drive it from the input.`,
        starter: `import sys


class Counter:
    def __init__(self):
        self.count = 0

    # add, remove and total go here. The rule belongs in remove.


for line in sys.stdin:
    parts = line.split()
    if not parts:
        continue
`,
        language: 'python',
        tests: [
          { input: 'add 5\nremove 2\ntotal\n', expectedOutput: '3' },
          { input: 'add 1\nremove 9\ntotal\n', expectedOutput: '0' },
          { input: 'total\nadd 4\ntotal\n', expectedOutput: '0\n4', isHidden: true },
        ],
      },
    ],
    mcqs: [
      mcq('A value that can be computed from other state should be:',
        [['A method, so it cannot disagree with its source', true],
         ['An attribute, updated whenever the source changes too', false],
         ['Both, so that callers can choose whichever they prefer', false],
         ['An attribute, because computing it repeatedly is wasteful', false]],
        'Storing a derived value creates two sources of truth, and they drift the first time somebody updates one and not the other.'),
      mcq('An invariant should hold whatever order the methods are called in. Checking this means trying:',
        [['The unusual orders, not just the expected one', true],
         ['Each method once, in the order they are defined in', false],
         ['The same order repeatedly until the state stabilises', false],
         ['Only orders a real caller would plausibly produce here', false]],
        'The whole claim of an invariant is that no sequence can break it. Testing the expected order tests the case that was already in mind.'),
    ],
    checkpoint: [
      mcq('A caller needs a fifth method to do something the class does not offer. The first question is whether they:',
        [['Are reaching for something that should stay inside', true],
         ['Should be writing their own subclass of the class', false],
         ['Have understood what the existing four methods do', false],
         ['Need a second class rather than a larger first one', false]],
        'A request to expose internals is usually a request for a behaviour the class should provide. Adding the behaviour keeps the rule in one place.'),
      mcq('Naming the questions an object will be asked before writing it produces:',
        [['The method list, and then what state they need', true],
         ['The class name and the module it should live in', false],
         ['The inheritance hierarchy the class will sit within', false],
         ['The tests, which can then be written ahead of it', false]],
        'Interface first, state second, is what keeps the state minimal. Starting from what to store reliably produces attributes nothing ever reads.'),
    ],
  },

  /* ══ T4_BR_DSA ══════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_BR_DSA_COMPLEXITY',
    notes: `**Counting the work before the code is written**, which is a habit rather than a
subject.

## What the notation is for

**It describes how the work grows, not how long it takes.** A linear algorithm on a slow machine
beats a quadratic one on a fast machine as soon as the input is big enough, and "big enough"
arrives sooner than people expect.

## Reading it off the code

**One loop over n items: linear.** **A loop inside a loop over the same n: quadratic.** **Halving
the search space each step: logarithmic.** Those three cover the large majority of what appears
in a placement paper.

**Constant-time work inside a loop does not change the class.** A dictionary lookup inside a
linear loop is still linear. This is the point people most often get wrong in both directions.

## The numbers worth knowing

At roughly a hundred million simple operations per second:

**n = 1,000** — quadratic is fine. **n = 100,000** — quadratic is ten billion operations and will
not finish. **n = 1,000,000** — you need linear or n log n.

**So the constraints in the problem statement tell you which family of solution is expected**,
before you have thought about the problem at all. That is the most useful thing on the page and
most candidates skip it.

## Say it out loud

**Volunteer the complexity before being asked.** In an interview, stating it unprompted is worth
more than reaching it after the follow-up.`,
    mcqs: [
      mcq('A problem states n up to 100000 and a two-second limit. This rules out:',
        [['Any solution quadratic in n', true],
         ['Any solution that needs to sort the input first', false],
         ['Any solution that uses more than one pass of data', false],
         ['Any solution based on recursion rather than looping', false]],
        'Ten billion operations cannot finish in two seconds. The constraint is naming the family of solution before you have read the problem.'),
      mcq('A constant-time lookup inside a loop over n items makes the loop:',
        [['Linear, as it was without the lookup', true],
         ['Quadratic, because of the nesting that occurs here', false],
         ['Logarithmic, because hashing divides the search space', false],
         ['Linear only when the collection is small enough to fit', false]],
        'Complexity multiplies the cost of the body by the number of iterations. A constant body leaves the loop in the class it already was.'),
      mcq('Stating your solution’s complexity before being asked is valued because it:',
        [['Shows the cost was considered while solving', true],
         ['Saves the interviewer from needing to ask about it', false],
         ['Is required before the solution can be accepted at all', false],
         ['Demonstrates familiarity with the standard notation used', false]],
        'Volunteering it says the analysis was part of the thinking rather than something produced afterwards on request.'),
    ],
    checkpoint: [
      mcq('Two correct solutions exist: one linear with a dictionary, one quadratic with nested loops. At n = 50 you should:',
        [['Still prefer the linear one, as a habit', true],
         ['Prefer the quadratic one, being simpler to write here', false],
         ['Choose either, since both finish instantly at that size', false],
         ['Benchmark them both before making a decision about it', false]],
        'Either finishes, but the habit is what carries into the problem where n is a million and there is no time to reconsider.'),
      mcq('A candidate reaches the complexity only after the interviewer asks. Compared with volunteering it, this reads as:',
        [['Analysis done on request rather than while solving', true],
         ['An equivalent answer, since the result is the same one', false],
         ['A stronger answer, because it responds to the question', false],
         ['A failure, because the complexity should have been stated', false]],
        'It is not a failure and it is weaker. The signal being read is whether cost was part of the thinking or an afterthought.'),
    ],
  },
  {
    unitCode: 'T4_BR_DSA_SEARCH_AND_SORT',
    notes: `**Choosing between two correct approaches**, which is what placement papers actually
test.

## Linear against binary

**A linear scan needs nothing and costs n.** **A binary search needs sorted data and costs log
n.** For one lookup in unsorted data, scanning wins — sorting first costs more than the scan you
were avoiding.

**For many lookups, sort once and binary search repeatedly.** The sort is paid once and amortises
across every query after it.

**The break-even is not a formula to memorise.** It is a question to ask: how many times will I
look this up?

## Sorting is usually not the answer you implement

**You call the library sort.** Nobody is asked to write quicksort in a placement round. What is
asked is whether you knew to sort, what it cost you, and whether the comparison was right.

**The comparison is where the marks are.** Sorting tuples sorts by the first element then the
second. Sorting strings that contain numbers sorts them as text. Both produce output that looks
almost right.

## Stability, and when it matters

**A stable sort keeps equal items in their original order.** Python's is stable, which means you
can sort by one key and then another and the first ordering survives within ties. That is how
multi-key sorting is done, and it only works in that order — secondary key first.`,
    mcqs: [
      mcq('You need one lookup in unsorted data of n items. Sorting first and binary searching is:',
        [['Slower, because the sort costs more than the scan', true],
         ['Faster, because binary search is logarithmic in time', false],
         ['Equivalent, since both approaches must read all of it', false],
         ['Faster only when the data happens to be nearly sorted', false]],
        'Sorting is n log n and the scan you avoided was n. For a single lookup the preparation costs more than the thing it saves.'),
      mcq('Sorting by two keys with a stable sort requires sorting by the:',
        [['Secondary key first, then the primary one', true],
         ['Primary key first, then the secondary one after', false],
         ['Two keys together in one combined comparison call', false],
         ['Primary key only, since ties keep the input order', false]],
        'Stability preserves the existing order within ties, so the earlier sort survives as the tiebreak of the later one.'),
      mcq('A sort of values like "9", "10", "11" puts "10" first. The comparison is treating them as:',
        [['Text, which compares character by character', true],
         ['Numbers, but with the ordering reversed by default', false],
         ['Mixed types, which falls back to insertion ordering', false],
         ['Equal, so the original input order was preserved here', false]],
        'Character comparison puts "1" before "9". It is the classic near-right output, and it appears whenever numbers arrive as text.'),
    ],
    checkpoint: [
      mcq('The same collection will be searched ten thousand times. The right approach is to:',
        [['Sort once, then binary search each query', true],
         ['Scan linearly each time, avoiding the sorting cost', false],
         ['Sort before each query to guarantee it stays correct', false],
         ['Build a new sorted copy for every one of the queries', false]],
        'The sort is paid once and amortises across all ten thousand queries, each of which then costs log n instead of n.'),
      mcq('A candidate is asked to sort in an interview. What is being assessed is mainly whether they:',
        [['Knew to sort, and what it cost them', true],
         ['Can implement an efficient sorting algorithm by hand', false],
         ['Know the names of the common sorting algorithms used', false],
         ['Can recall the worst case behaviour of quicksort here', false]],
        'The library sort is what anybody writes. The judgement being tested is recognising that sorting helps and accounting for its cost.'),
    ],
  },
  {
    unitCode: 'T4_BR_DSA_DEBUGGING',
    notes: `**Solutions that are correct and too slow**, which is a different kind of broken.

## The symptom is not an error

**It finishes on the sample and hangs on the real input.** No traceback, no wrong answer — just
nothing. That is what a complexity problem looks like from the outside, and it is why people
spend twenty minutes looking for a logic bug that is not there.

## Finding where the time goes

**Count the operations, do not guess.** Find the innermost thing that runs most often and
multiply. Usually one line accounts for nearly all of it.

**The usual suspects, in order:** membership against a list inside a loop; a nested loop over the
same data; sorting inside a loop; string concatenation in a loop; and recomputing something
constant on every iteration.

## The fix is usually structural

**Not micro-optimisation.** Rewriting the inner loop more tersely does not change n squared into
n. Replacing the container does, and it is usually one line.

## The other failure in this family

**Correct, fast, and wrong on the edges.** A binary search whose bounds are off by one returns
the wrong index on exactly the boundary cases, and passes everything else. Trace it on a
two-element input; that is where it shows.`,
    mcqs: [
      mcq('A solution hangs on large input with no error. The most useful first step is to:',
        [['Find the line that runs most often', true],
         ['Add print statements throughout the whole program', false],
         ['Rewrite the solution using a different algorithm now', false],
         ['Reduce the input until it completes and compare timings', false]],
        'One line almost always dominates. Locating it turns an open-ended search into a specific and usually one-line fix.'),
      mcq('Rewriting an inner loop more tersely to fix a timeout usually fails because it:',
        [['Does not change the complexity class', true],
         ['Introduces new bugs in code that was correct before', false],
         ['Makes the program harder for a reviewer to follow now', false],
         ['Is slower in practice than the original version was', false]],
        'A constant-factor improvement cannot rescue a quadratic algorithm at large n. Only changing how the work grows does that.'),
      mcq('A binary search is wrong only on the first and last element. Tracing it on which input shows this fastest?',
        [['Two elements, which exercises both bounds', true],
         ['A hundred elements, which is closer to real usage', false],
         ['One element, which is the simplest possible case here', false],
         ['An empty input, where the bounds are not used at all', false]],
        'Two elements is the smallest input where the midpoint, the lower bound and the upper bound are all distinct and can disagree.'),
    ],
    checkpoint: [
      mcq('A solution passes every visible test and times out on the hidden ones. This indicates the hidden tests differ in:',
        [['Size, rather than in shape or content', true],
         ['Format, which the parser is failing to handle well', false],
         ['Content, containing values the logic does not handle', false],
         ['Ordering, which the algorithm depends on incorrectly', false]],
        'A timeout with no wrong answer means the logic handles the cases and the growth does not handle the scale.'),
      mcq('Sorting inside a loop that runs n times costs:',
        [['n squared log n, which is rarely acceptable', true],
         ['n log n, because the sort dominates the loop here', false],
         ['n squared, because sorting is effectively linear now', false],
         ['n log n only when the data is already nearly sorted', false]],
        'The sort is paid on every iteration. Hoisting it out of the loop, when the data does not change, is usually the whole fix.'),
    ],
  },
  {
    unitCode: 'T4_BR_DSA_PRACTICE',
    notes: `**Cost, stated before the code is written, on every exercise here.**

## The drill

**Read the constraints first.** They name the family of acceptable solution before you have
thought about the problem.

**State your intended complexity before writing.** Out loud or on paper. If it does not fit the
constraints, you have saved yourself the twenty minutes.

**Then write it, and check the cost you actually got** against the one you intended. They differ
more often than people expect, usually because of one container choice.

## What is being built

**Not knowledge of algorithms.** The habit of asking what something costs, so that in an
interview it is already answered when the question arrives.

## The exercises

Each one has an obvious quadratic solution and a linear or n log n one. Both are correct, and
only one passes at the stated size. **Deciding which family you need before starting is the
entire exercise.**`,
    coding: [
      {
        title: 'Pairs that sum to a target',
        description: `The first line holds the target. The second line holds whitespace-separated
whole numbers.

Print how many unordered pairs of distinct positions sum to the target.

The list may hold up to a hundred thousand values, so the nested-loop solution will not finish.`,
        starter: `import sys

data = sys.stdin.read().split('\\n')
target = int(data[0])
values = [int(v) for v in data[1].split()]
`,
        language: 'python',
        tests: [
          { input: '10\n1 9 2 8 3 7\n', expectedOutput: '3' },
          { input: '4\n2 2 2\n', expectedOutput: '3' },
          { input: '100\n1 2 3\n', expectedOutput: '0', isHidden: true },
        ],
      },
    ],
    mcqs: [
      mcq('Stating the intended complexity before writing code saves time chiefly when the intended approach:',
        [['Does not fit the stated constraints', true],
         ['Is correct but harder to write than an alternative one', false],
         ['Needs a data structure you have not used recently now', false],
         ['Turns out to be the same as the obvious first idea', false]],
        'Discovering the approach cannot pass before writing it costs thirty seconds. Discovering it afterwards costs the twenty minutes spent writing.'),
      mcq('Checking the complexity you actually got against the one you intended matters because they differ most often due to a:',
        [['Container choice made without thinking', true],
         ['Loop bound that was written incorrectly at first', false],
         ['Recursive call that was not tail optimised properly', false],
         ['Library function whose cost is not documented well', false]],
        'The plan says "use a lookup" and the code says "in a list". The intent was linear and the result is quadratic, from one unexamined word.'),
    ],
    checkpoint: [
      mcq('An exercise has an obvious quadratic solution and a linear one, with n up to 100000. Writing the quadratic one first is:',
        [['Wasted effort, since it cannot pass at that size', true],
         ['Sensible, as a correct baseline to then improve upon', false],
         ['Required, because the linear one builds on that logic', false],
         ['Reasonable, since partial marks are usually available', false]],
        'The constraint has already ruled it out. Writing it is time spent producing something known in advance not to pass.'),
      mcq('Reading the constraints before the problem statement is recommended because they:',
        [['Name the family of solution that is expected', true],
         ['Are shorter, so they can be read much more quickly', false],
         ['Contain the sample input that the problem will use', false],
         ['Reveal which data structure the author had in mind', false]],
        'n up to a thousand and n up to a million are different problems with the same words. The constraint decides which one you are solving.'),
    ],
  },
];
