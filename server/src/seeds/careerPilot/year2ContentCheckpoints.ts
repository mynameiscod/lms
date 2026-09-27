/**
 * A measurement at the end of every teaching topic, plus three units for the two topics that
 * had almost no application work — twenty-five bundles.
 *
 * ── WHY EVERY TOPIC NEEDED ONE ────────────────────────────────────────────────────────────
 *
 * Year 2 held seven CHECKPOINT units across thirty-three topics. Twenty-six topics taught,
 * drilled and built something and never asked whether any of it stuck. That is a gap on its
 * own terms: a topic with no measurement produces no evidence, and Skill DNA is built from
 * evidence, so a student could complete a whole topic and the system would still know nothing
 * about them.
 *
 * It also happens to be the unit a strong learner most needs. `unitSuitabilityPolicy` has
 * CHECKPOINT serving every state — measuring is how a state is established in the first place
 * — where a CONCEPT unit stops at STANDARD.
 *
 * ── WHAT A CHECKPOINT UNIT IS ─────────────────────────────────────────────────────────────
 *
 * Not a quiz on the notes. A short measured check of whether the work of the topic can be done
 * without help: the notes say what is being measured and what a weak result means, and the
 * questions are the measurement. Each one names the specific thing that separates somebody who
 * holds the topic from somebody who has read it.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

/**
 * Every checkpoint shares a shape, so the shape is written once.
 *
 * `what` is the topic's own name, `holds` is the sentence that distinguishes holding the topic
 * from having read it, and `weak` says what a poor result actually means — which is the part a
 * student needs, because a low score with no interpretation is discouraging rather than useful.
 */
const checkpoint = (
  unitCode: string, what: string, holds: string, weak: string,
  questions: ReturnType<typeof mcq>[], graded: ReturnType<typeof mcq>[],
): PilotBundle => ({
  unitCode,
  notes: `A short measured check of ${what.toLowerCase()}. Not a quiz on the reading — a check
of whether the work of this topic can be done without help.

**What is being measured:** ${holds}

**How to take it:** without notes, without looking anything up, and in one sitting. A result
you got with help measures the help.

**What a weak result means:** ${weak} It is a measurement, not a verdict — the point of taking
it now is that there is still time for it to change what you do next.

**What to do with it:** if it goes badly, the topic's practice and debugging units are where to
go, not the lessons. You have read those. What is missing is the doing.`,
  mcqs: questions,
  checkpoint: graded,
});

export const CHECKPOINT_BUNDLES: PilotBundle[] = [
  checkpoint('T2_OOP_OBJECTS_CHECKPOINT', 'Objects',
    'whether you can tell what state an object owns from what it merely holds a reference to.',
    'Most likely the sharing faults — a default created once, or a collection stored rather than copied.',
    [
      mcq('You create two carts, add nothing to the second, and its total is not zero. The likeliest cause is:',
        [['A mutable default, so both carts are using the same list object', true],
          ['The total being cached from the first cart that was created', false],
          ['The constructor running before the attributes are assigned', false],
          ['An equality method comparing the carts by their contents', false]],
        'Created once at definition, not once per call.'),
      mcq('A caller passes a list, then appends to it, and the object changes too. That tells you:',
        [['The object stored the caller’s list rather than a copy of it', true],
          ['The object exposed its own list through an accessor', false],
          ['The list was frozen after it was handed over', false],
          ['The append happened before the constructor finished', false]],
        'Copy on the way in where the object must own its data.'),
      mcq('An order total and its line items disagree after an edit. The safest repair is:',
        [['To stop storing the total and compute it from the items instead', true],
          ['To update the total in the one place that missed it', false],
          ['To recalculate the total whenever the order is read', false],
          ['To lock the items once the total has been computed', false]],
        'A derived value cannot disagree with what it derives from.'),
      mcq('Two objects you consider identical behave as different keys in a dictionary. You have:',
        [['Defined equality without a hash that agrees with it', true],
          ['Compared them before their attributes were set', false],
          ['Used a mutable attribute in the comparison', false],
          ['Defined an ordering rather than an equality', false]],
        'Both have to agree, or the object misbehaves in sets and maps.'),
    ],
    [
      mcq('Given one instance and a suspicion of shared state, the next thing to do is:',
        [['Make a second instance and see whether changing one moves the other', true],
          ['Print every attribute of the instance you have', false],
          ['Check the constructor for an assignment order fault', false],
          ['Compare the instance against a freshly created one', false]],
        'Most of these faults are invisible with one.'),
      mcq('A constructor raises halfway through and something still holds the object. You now have:',
        [['An object in a state its own class believes is impossible', true],
          ['A reference that will be collected at the next opportunity', false],
          ['An object whose remaining attributes hold their defaults', false],
          ['A copy of the object as it was before the failure', false]],
        'Which is why a half-built object is worth guarding against.'),
      mcq('A method named as though it reads, which also writes, is a problem because:',
        [['The caller has no reason to suspect the state changed', true],
          ['It makes the method harder to test in isolation', false],
          ['It prevents the result from being cached safely', false],
          ['It breaks the convention most codebases follow', false]],
        'The name is the contract.'),
    ]),

  checkpoint('T2_OOP_PRINCIPLES_CHECKPOINT', 'Object Design',
    'whether you can say what a design will cost at its next requirement, not whether you can name the principles.',
    'Usually the substitution and dependency ideas — knowing the words for them is not the same as seeing them in code.',
    [
      mcq('You are asked to add a second payment type and find yourself editing four files. That is:',
        [['The finding: one idea is spread across four places', true],
          ['Normal for a change that touches persistence', false],
          ['A sign the payment logic needs an interface', false],
          ['Acceptable if the four changes are small', false]],
        'Trace the next requirement and count what it touches.'),
      mcq('Code holding a Rectangle breaks when handed a Square that refuses a width change. The fault is:',
        [['In the subclass, which cannot stand in for its parent', true],
          ['In the caller, for assuming the width is mutable', false],
          ['In the parent, for exposing a mutable width', false],
          ['In the type system, for allowing the substitution', false]],
        'Inheritance is a promise of substitutability.'),
      mcq('A class cannot be tested without a live database. The smallest useful change is:',
        [['Taking the collaborator as a parameter rather than creating it inside', true],
          ['Adding a test database to the suite’s setup', false],
          ['Extracting the database calls into a second class', false],
          ['Making the connection lazy so it opens on first use', false]],
        'One parameter, and the class becomes testable.'),
      mcq('Adding a third report format means adding a branch to an existing function. That means:',
        [['The polymorphism is decorative and the type check is doing the work', true],
          ['The function has grown beyond a single responsibility', false],
          ['The formats should share a base class', false],
          ['The branch should be replaced by a lookup table', false]],
        'Adding a case should mean adding a class.'),
    ],
    [
      mcq('You have one implementation and are asked to extract an interface for it. The risk is:',
        [['The abstraction fits that one case and the second will not match it', true],
          ['The interface will be larger than the class needs', false],
          ['The indirection will cost measurable performance', false],
          ['The implementation will have to be rewritten', false]],
        'Wait for the second case.'),
      mcq('A constructor taking a mode string is better replaced by:',
        [['Two classes sharing a small interface', true],
          ['An enumeration instead of a string', false],
          ['A factory function selecting the behaviour', false],
          ['A subclass for each mode', false]],
        'It is two classes already, sharing a name.'),
      mcq('A class names a concrete collaborator inside itself. The consequence is:',
        [['No way to substitute it, and therefore no way to test the class alone', true],
          ['A circular dependency between the two modules', false],
          ['A performance cost from creating it repeatedly', false],
          ['A coupling that only matters if the collaborator changes', false]],
        'Reached for rather than passed in.'),
    ]),

  checkpoint('T2_DS_LINEAR_CHECKPOINT', 'Linear Structures',
    'whether the four standard inputs are something you run by reflex rather than something you know about.',
    'Usually the ends — the empty list, the single element, and the index that goes negative rather than failing.',
    [
      mcq('A filter removes roughly half the matches it should. The likeliest cause is:',
        [['Removing from the list while iterating over it', true],
          ['A comparison using the wrong equality', false],
          ['An off-by-one in the loop bound', false],
          ['A filter condition that is inverted', false]],
        'Every second match survives the skip.'),
      mcq('A function returns a sensible-looking value for an empty list. Before trusting it:',
        [['Check whether the loop ran at all, or the initial value came straight back', true],
          ['Check whether the empty case raises somewhere deeper', false],
          ['Confirm the return type matches the populated case', false],
          ['Verify that the caller handles an empty result', false]],
        'A carelessly chosen initial value looks like an answer.'),
      mcq('Reading position i minus one at the start of a list gives you:',
        [['The last element, and therefore a wrong answer rather than an error', true],
          ['An index error the caller can catch', false],
          ['A default value for the element type', false],
          ['The first element, since the index is clamped', false]],
        'Negative indices are legal, which is what makes it treacherous.'),
      mcq('A routine that finds the largest gap between neighbours returns zero for one element. That is:',
        [['The initial value, because the loop never ran', true],
          ['Correct, since a single element has no gap', false],
          ['An error the caller should have prevented', false],
          ['A rounding artefact of the comparison', false]],
        'Whether zero is the right answer is a decision, not an accident.'),
    ],
    [
      mcq('You are handed an unfamiliar list function. The first thing to run is:',
        [['Empty, one, two and all-equal, before reading the body', true],
          ['A large random input to check the timing', false],
          ['The example from the docstring', false],
          ['A sorted and a reversed input', false]],
        'Under a minute, and it catches most of the topic.'),
      mcq('Building a grid with list multiplication and writing to one row changes them all. You have:',
        [['Several references to one row rather than separate rows', true],
          ['Written to the wrong index in each row', false],
          ['Created rows of a shared immutable type', false],
          ['Multiplied the outer list instead of the inner one', false]],
        'Shared sublists: the multiplication copied the reference.'),
      mcq('A routine that is fast in testing and slow in production most likely:',
        [['Inserts or removes inside a loop, which is quadratic', true],
          ['Allocates more memory than the test data needed', false],
          ['Sorts the input when it did not need to', false],
          ['Copies the list once per call', false]],
        'Correct, and too slow at a size the example never reaches.'),
    ]),

  checkpoint('T2_DS_KEYED_CHECKPOINT', 'Maps and Trees',
    'whether you check the values a map holds rather than the keys, since most faults here leave the key set correct.',
    'Usually the accumulate-versus-overwrite distinction, and the difference between absent and zero.',
    [
      mcq('A word count returns the right words and every count is one. The fault is:',
        [['Assignment where accumulation was meant', true],
          ['A key type that differs between the passes', false],
          ['A default that hides the missing keys', false],
          ['Iteration order changing between runs', false]],
        'The key set is right, which is why the output looks plausible.'),
      mcq('You build a map from email to user id and one user is missing afterwards. Two users:',
        [['Shared an email, and the second overwrote the first', true],
          ['Had ids that collided in the map', false],
          ['Were filtered out before the map was built', false],
          ['Had emails differing only by case', false]],
        'Whichever was seen last survives, unless you chose otherwise.'),
      mcq('A report shows a customer spending zero. Before believing it, check whether:',
        [['The value was absent and a default turned it into a zero', true],
          ['The customer’s orders were filtered by date', false],
          ['The currency conversion produced a rounding error', false],
          ['The aggregate excluded refunded orders', false]],
        'Absent and zero are different facts.'),
      mcq('An object used as a key cannot be found again, though it is still in the map. It was:',
        [['Changed after it was inserted', true],
          ['Compared against a copy rather than itself', false],
          ['Inserted before its attributes were set', false],
          ['Removed by a concurrent write', false]],
        'Keys should not be mutable.'),
    ],
    [
      mcq('To test a map-building function properly, the input must contain:',
        [['A repeated key, which the example never has', true],
          ['At least one key of each expected type', false],
          ['More keys than the map is expected to hold', false],
          ['A key that sorts last alphabetically', false]],
        'It is what separates accumulating from overwriting.'),
      mcq('A test asserting the map has the right keys passes while the code is wrong because:',
        [['Most faults in this topic leave the key set intact', true],
          ['Key comparison ignores the value types', false],
          ['The assertion runs before the map is complete', false],
          ['Keys are compared by identity rather than equality', false]],
        'Assert on the values, which is where the fault shows.'),
      mcq('A lookup built from parsed input misses entries built from literals. The cause is:',
        [['A key type mismatch between the two paths', true],
          ['Whitespace left on the parsed keys', false],
          ['A hash collision between the two sets', false],
          ['A default masking the missing entries', false]],
        'Parse once, at the edge, and the types cannot diverge.'),
    ]),

  checkpoint('T2_ALGORITHMS_CHECKPOINT', 'Algorithms',
    'whether you can say where the time goes in a piece of code, which is the sentence that names the fix.',
    'Usually the transformations — recognising that a repeated question is a lookup rather than a search.',
    [
      mcq('A routine scans the whole list inside a loop over the list. The sentence that names the fix is:',
        [['It is quadratic, and the inner scan asks one question repeatedly', true],
          ['It is quadratic, and the input needs to be smaller', false],
          ['It is quadratic, and the loop should be parallelised', false],
          ['It is quadratic, and the list should be sorted first', false]],
        'A repeated question with a fixed answer is a lookup.'),
      mcq('A search works in testing and returns nonsense on real data. The likeliest cause is:',
        [['A binary search over data that was not actually sorted', true],
          ['An index that goes out of range at the end', false],
          ['A comparison that mishandles equal values', false],
          ['An accumulator initialised to the wrong value', false]],
        'It returns a plausible index rather than failing.'),
      mcq('A maximum routine returns zero for a list of negative temperatures. It:',
        [['Started its accumulator at zero rather than at the first value', true],
          ['Compared with greater-or-equal rather than greater', false],
          ['Skipped the first element of the list', false],
          ['Treated the negatives as unsigned values', false]],
        'Start from the first real element.'),
      mcq('The constraints say the input may reach a million. Your solution is quadratic. It is:',
        [['Wrong, whatever the tests report', true],
          ['Worth profiling before deciding', false],
          ['Acceptable if the average case is smaller', false],
          ['Fine until a real input proves otherwise', false]],
        'The constraints are the hint.'),
    ],
    [
      mcq('Two implementations disagree on one random input. That input is:',
        [['The fault, located, without needing any insight', true],
          ['Evidence the reference is also wrong', false],
          ['A sign of non-determinism in one of them', false],
          ['Only useful if it can be simplified first', false]],
        'Which is why the reference comparison is the most reliable technique.'),
      mcq('A faster version only works on sorted input. That fact belongs:',
        [['In the name or the signature', true],
          ['In a comment above the function', false],
          ['In an assertion inside the body', false],
          ['In the test covering sorted input', false]],
        'Not in somebody’s memory.'),
      mcq('An optimisation measures no faster than the original. The right response is:',
        [['To report it, because the slow part was somewhere else', true],
          ['To keep it for its better complexity', false],
          ['To re-measure with a larger input', false],
          ['To assume the measurement was flawed', false]],
        'The slow part is frequently not where it feels.'),
    ]),

  checkpoint('T2_PY_STRUCTURE_CHECKPOINT', 'Project Structure',
    'whether importing your modules does anything, which is the ten-second check almost nobody runs.',
    'Usually import-time work and paths relative to the working directory, both of which pass every test run from the project root.',
    [
      mcq('Your test suite fails without a database, though the test under test needs none. Likely:',
        [['A module does work when imported, and the test imports it', true],
          ['A fixture opens a connection for every test', false],
          ['The test runner loads a configuration file first', false],
          ['A shared fixture was not torn down', false]],
        'Import should be free of everything but definitions.'),
      mcq('A job that works from your terminal fails under the scheduler. Check first:',
        [['Whether any path is relative to the working directory', true],
          ['Whether the scheduler has the right permissions', false],
          ['Whether the environment variables were exported', false],
          ['Whether the interpreter version differs', false]],
        'The working directory is not what it is in your shell.'),
      mcq('A test cannot change a configuration value however it sets it. The value was:',
        [['Read at module level and captured at import', true],
          ['Marked read-only by the configuration library', false],
          ['Cached after the first function call', false],
          ['Overridden by an environment variable', false]],
        'Read it inside the function that needs it.'),
      mcq('One test file passes alone and fails in the suite. The likeliest cause is:',
        [['Mutable state at module scope, shared across the run', true],
          ['A timeout that only triggers under load', false],
          ['An import that resolves differently in order', false],
          ['A fixture that is slower when reused', false]],
        'Run one file alone and it appears.'),
    ],
    [
      mcq('The cheapest structural check on an unfamiliar project is:',
        [['Importing each module in a fresh interpreter and watching for side effects', true],
          ['Running the suite in a randomised order', false],
          ['Reading every file above its first definition', false],
          ['Running the project from another directory', false]],
        'Ten seconds, and almost nobody runs it.'),
      mcq('Adding one unrelated import breaks the project with a circular import error. That:',
        [['Was already circular and only worked because of load order', true],
          ['Introduced the cycle for the first time', false],
          ['Exposed a missing dependency declaration', false],
          ['Means the new import should be moved inside a function', false]],
        'The next change reorders it.'),
      mcq('A file that runs its work outside a main guard:',
        [['Executes that work whenever anything imports it', true],
          ['Cannot be run directly from the command line', false],
          ['Runs the work twice when imported and executed', false],
          ['Exposes its variables to the importing module', false]],
        'One line makes it importable.'),
    ]),

  checkpoint('T2_PY_ROBUST_CHECKPOINT', 'Robust Programs',
    'whether you can tell handling an error from hiding one, which is the distinction the whole topic turns on.',
    'Usually the broad handler and the retry — both look responsible and both make a failure harder to find.',
    [
      mcq('A feature silently does nothing and there is no error anywhere. Look first for:',
        [['A bare or empty handler swallowing the failure', true],
          ['A condition that is never true', false],
          ['A return value nobody checks', false],
          ['A configuration flag disabling the feature', false]],
        'A silence is a fault that was caught and dropped.'),
      mcq('A misspelled variable name inside a bare except:',
        [['Is caught by that same handler and disappears', true],
          ['Raises at import time before it can run', false],
          ['Fails loudly the first time the handler runs', false],
          ['Is reported as a warning by most interpreters', false]],
        'Which is how it can live for years.'),
      mcq('A client retries a rejected request five times. The result is:',
        [['Five rejections, taking five times as long', true],
          ['A better chance the request eventually lands', false],
          ['A different error on the later attempts', false],
          ['A rate limit triggering and masking the cause', false]],
        'Retry only what could succeed on a second attempt.'),
      mcq('Code cannot continue correctly after a failure. The honest response is:',
        [['To fail, saying what was attempted and what went wrong', true],
          ['To log the failure and return a safe default', false],
          ['To retry a bounded number of times', false],
          ['To raise a generic error higher up', false]],
        'A clear failure beats a plausible wrong answer.'),
    ],
    [
      mcq('Two searches that find most of this class in any codebase are:',
        [['The bare except and the empty handler', true],
          ['The retry loop and the timeout value', false],
          ['The finally block and the re-raise', false],
          ['The log call and the default argument', false]],
        'Two searches, and between them they find most of it.'),
      mcq('An exception disappears and the function returns normally. Suspect:',
        [['A return inside a finally block', true],
          ['A handler that re-raised the wrong type', false],
          ['A context manager suppressing it deliberately', false],
          ['An exception raised during cleanup', false]],
        'One of the quieter ways to lose a failure.'),
      mcq('Before a retry can be safe to repeat, the request needs:',
        [['A key the server can deduplicate on', true],
          ['A longer gap between the attempts', false],
          ['A maximum attempt count', false],
          ['Confirmation the first attempt failed', false]],
        'A retry after a lost response otherwise acts twice.'),
    ]),

  checkpoint('T2_TESTING_CHECKPOINT', 'Testing',
    'whether you can say what your suite would catch, which is a different question from what it covers.',
    'Usually the difference between coverage and detection — a suite can execute every line and assert nothing.',
    [
      mcq('You delete a line of logic and the whole suite stays green. That tells you:',
        [['The suite does not check that behaviour, whatever the coverage says', true],
          ['The line was dead code and can be removed', false],
          ['The tests run against a cached build', false],
          ['The line is covered only by an integration test', false]],
        'Two minutes, and nothing to argue with.'),
      mcq('A test calls a function, raises nothing, and passes. It is:',
        [['Covering the lines and checking nothing', true],
          ['A smoke test, which is a legitimate kind', false],
          ['Testing that the function does not throw', false],
          ['Incomplete but still a regression guard', false]],
        'Invisible in a coverage report.'),
      mcq('A refactor that changes no behaviour breaks twelve tests. Those tests:',
        [['Assert the implementation rather than the behaviour', true],
          ['Were written against an older interface', false],
          ['Are integration tests rather than unit tests', false],
          ['Depend on the order the suite runs in', false]],
        'Which is what a test written from pasted output does.'),
      mcq('Coverage is at a hundred percent and a bug reaches production. That is:',
        [['Entirely possible, because coverage counts execution, not checking', true],
          ['A sign the coverage tool was misconfigured', false],
          ['Only possible if the bug is in untested glue code', false],
          ['Evidence the tests were disabled in the pipeline', false]],
        'Every line ran; nothing was asserted about it.'),
    ],
    [
      mcq('A test passes alone and fails in the suite. The likeliest cause is:',
        [['A fixture mutated by an earlier test', true],
          ['A timeout that only triggers under load', false],
          ['A random seed differing between runs', false],
          ['An import cached from another module', false]],
        'Order-dependent, and it fails the other way round just as often.'),
      mcq('The expected value in a test should come from:',
        [['A hand calculation or an independent method', true],
          ['The function under test, verified once', false],
          ['A simplified version of the same logic', false],
          ['A recorded run of the previous release', false]],
        'Otherwise the test agrees with the bug.'),
      mcq('A suite contains eleven skipped tests, the oldest from two years ago. They should be:',
        [['Deleted, because they inflate the count and signal false coverage', true],
          ['Kept as a record of intended behaviour', false],
          ['Unskipped so the failures force attention', false],
          ['Excluded from reporting but left in place', false]],
        'A test nobody will fix is noise.'),
    ]),

  checkpoint('T2_LINUX_CHECKPOINT', 'the Command Line',
    'whether you can tell a command that succeeded from one that reported success.',
    'Usually quoting and exit status — both are invisible on the filenames and the inputs you tested with.',
    [
      mcq('A script works on every file until one named "my report.txt". The cause is:',
        [['An unquoted variable, splitting the name into two arguments', true],
          ['A glob that failed to match the name', false],
          ['A path length exceeding a limit', false],
          ['A character the shell treats as an operator', false]],
        'It works on every filename you tested with.'),
      mcq('A pipeline logs an error in its middle stage and the script continues. Because:',
        [['The exit status reported is the last stage’s', true],
          ['Errors written to standard error are not statuses', false],
          ['The pipeline buffers until every stage finishes', false],
          ['A failing stage is retried transparently', false]],
        'A script checking the status sees success.'),
      mcq('After running a sort that writes back to its own input file, the file is empty. Because:',
        [['The redirect truncated it before the command read it', true],
          ['The sort failed and wrote nothing', false],
          ['The file was locked by the reading process', false],
          ['The output was buffered and lost on exit', false]],
        'Write elsewhere and move it.'),
      mcq('A script fails at line three and keeps running to line nine. It is missing:',
        [['The setting that stops the script on an error', true],
          ['An explicit check of the exit status', false],
          ['A trap handler for the failure', false],
          ['A conditional guarding line nine', false]],
        'Two lines at the top change that.'),
    ],
    [
      mcq('The cheapest way to see a quoting fault before it happens is:',
        [['Echo the command instead of running it', true],
          ['Run it with the shell in verbose mode', false],
          ['Expand the variables manually first', false],
          ['Check each variable is set before use', false]],
        'Print exactly what would execute.'),
      mcq('One deliberate test finds most quoting faults:',
        [['A filename containing a space', true],
          ['A filename containing a newline', false],
          ['An empty variable value', false],
          ['A path with a trailing slash', false]],
        'Once, deliberately, and it settles the whole class.'),
      mcq('Quoting a variable that contains no spaces:',
        [['Changes nothing, which is why quoting always is safe', true],
          ['Adds a small cost the shell must parse', false],
          ['Prevents the shell expanding a glob inside it', false],
          ['Is unnecessary and clutters the script', false]],
        'There is no trade-off to weigh.'),
    ]),

  checkpoint('T2_DB_QUERY_CHECKPOINT', 'SQL',
    'whether you check the row count at each join, which is the one number that exposes most wrong answers.',
    'Usually joins — the inner one that dropped rows, or the second one-to-many that multiplied every sum.',
    [
      mcq('A customer report shows fewer customers than the customer table holds. Suspect:',
        [['An inner join to orders, dropping customers who have not ordered', true],
          ['A filter on a nullable column', false],
          ['A grouping that collapsed duplicates', false],
          ['A limit left on the query', false]],
        'The result looks complete, which is what makes it dangerous.'),
      mcq('A revenue total is exactly three times too large. The likeliest cause is:',
        [['A second one-to-many join multiplying every row', true],
          ['A currency conversion applied twice', false],
          ['Refunded orders being counted as sales', false],
          ['A grouping at the wrong level', false]],
        'Aggregate each branch before joining.'),
      mcq('Adding a filter to an outer-joined table makes the unmatched rows vanish. Because:',
        [['The filter is in the WHERE clause and nulls fail it', true],
          ['Outer joins ignore filters on the right table', false],
          ['The filter runs before the join is evaluated', false],
          ['The optimiser rewrote the join as an inner one', false]],
        'Move it into the ON clause.'),
      mcq('A NOT IN query returns no rows at all, though you expect many. Check for:',
        [['A null inside the set being compared against', true],
          ['A type mismatch between the two columns', false],
          ['An index missing on the compared column', false],
          ['A subquery returning more rows than expected', false]],
        'A comparison with null is never true.'),
    ],
    [
      mcq('The one number that would have caught all of these is:',
        [['The row count taken on each side of every join', true],
          ['The count of distinct keys in the result', false],
          ['The query execution time', false],
          ['The number of nulls in the joined columns', false]],
        'One number per join, taken on each side of it.'),
      mcq('A count of a nullable column is lower than the row count. That is:',
        [['Expected, because it counts values rather than rows', true],
          ['A sign rows were dropped by a join', false],
          ['A rounding effect of the aggregate', false],
          ['Caused by duplicates being collapsed', false]],
        'Which makes it quietly the wrong number to report.'),
      mcq('Adding DISTINCT makes the count correct and leaves the sum wrong. That tells you:',
        [['The duplicates are real and the join is multiplying', true],
          ['The sum needs a distinct aggregate too', false],
          ['The grouping is at the wrong level', false],
          ['The count was the wrong metric to check', false]],
        'It hid the symptom and left the cause.'),
    ]),

  checkpoint('T2_DB_DESIGN_CHECKPOINT', 'Database Design',
    'whether you can say what the database itself would refuse, rather than what the application checks.',
    'Usually constraints — a rule that lives only in the application is a rule that will be broken.',
    [
      mcq('A data import creates rows the application would never allow. That shows:',
        [['The rule lives in the application and not in the database', true],
          ['The import bypassed validation deliberately', false],
          ['The application validation has a gap', false],
          ['The import used a privileged connection', false]],
        'The database is the only layer nothing gets past.'),
      mcq('A query cannot distinguish customers with no phone from those who declined to give one. The column:',
        [['Uses null for two different facts', true],
          ['Needs an index to make the query cheap', false],
          ['Should have a default empty string', false],
          ['Is the wrong type for the data', false]],
        '"Not yet" and "not applicable" are different.'),
      mcq('A tags column holds comma-separated values. The first tag containing a comma:',
        [['Corrupts the field, because the separator is also data', true],
          ['Is rejected by the column constraint', false],
          ['Is escaped automatically on write', false],
          ['Splits into two tags harmlessly', false]],
        'One row per value, so the fourth one costs nothing.'),
      mcq('Adding a unique constraint fails because rows already violate it. That is:',
        [['The proof it was needed, and the rows are the work', true],
          ['A reason to reconsider the constraint', false],
          ['A sign the data needs cleaning first, separately', false],
          ['An argument for enforcing it in the application', false]],
        'Expect it to fail: those rows are why it was needed.'),
    ],
    [
      mcq('A total is consistently a penny out and nobody can explain it. Check whether:',
        [['Money is stored as a floating-point number', true],
          ['The rounding happens at the wrong stage', false],
          ['Two currencies are being mixed', false],
          ['The aggregate excludes a row', false]],
        'The arithmetic is approximate.'),
      mcq('A user changes their email and their history disappears. The email was:',
        [['Used as the primary key', true],
          ['Not updated in the related tables', false],
          ['Validated differently on update', false],
          ['Indexed but not constrained', false]],
        'A natural key that is not stable.'),
      mcq('The question that finds schema faults before the data exists is:',
        [['What the next likely requirement is, and whether the schema holds it', true],
          ['Whether the schema is in third normal form', false],
          ['Which queries will need an index', false],
          ['How large each table is expected to grow', false]],
        'Asked on paper, where changing it is free.'),
    ]),

  checkpoint('T2_WEB_HTTP_CHECKPOINT', 'HTTP',
    'whether you read what went over the wire rather than what the client library reported.',
    'Usually the status — a 200 carrying an error is the fault that breaks every client that trusts the status.',
    [
      mcq('A client reports everything succeeded while nothing was created. Check whether:',
        [['The server returns 200 with an error inside the body', true],
          ['The client ignored the response entirely', false],
          ['The request was cached by an intermediary', false],
          ['The creation happened asynchronously', false]],
        'Every client that branches on the status is misled.'),
      mcq('A POST arrives at the server as a GET with no body. Between them was:',
        [['A redirect the client followed silently', true],
          ['A proxy stripping the request body', false],
          ['A content type the server rejected', false],
          ['A retry after a connection reset', false]],
        'The method can change across a redirect.'),
      mcq('A failing call gives your client a status and nothing else. The caller now:',
        [['Knows it failed and nothing about why', true],
          ['Must retry to discover the reason', false],
          ['Can infer the cause from the status alone', false],
          ['Should treat it as a transient failure', false]],
        'Every error needs a code and a message.'),
      mcq('A request against a dead host hangs indefinitely. It was missing:',
        [['A timeout, on connect or on read', true],
          ['A retry with exponential backoff', false],
          ['A health check before the call', false],
          ['A circuit breaker around the client', false]],
        'Having one matters more than the value.'),
    ],
    [
      mcq('When the client library and the server disagree, the deciding evidence is:',
        [['A command-line request showing exactly what crossed the wire', true],
          ['The server log for that request id', false],
          ['The library’s verbose debug output', false],
          ['A capture of the raw packets', false]],
        'It settles what the abstraction cannot.'),
      mcq('An order is created twice after the user pressed the button once. Likely:',
        [['A retry somewhere, against a write with no idempotency key', true],
          ['Two clicks registered by the interface', false],
          ['A race between two server instances', false],
          ['A cached response replayed by a proxy', false]],
        'Send the same request twice and see.'),
      mcq('A change is live for you and not for a colleague. Suspect:',
        [['A response cached by something between them and the server', true],
          ['A deployment that reached only some instances', false],
          ['A feature flag evaluated per user', false],
          ['A browser holding an old bundle', false]],
        'Which is what makes caching faults confusing.'),
    ]),

  checkpoint('T2_APIS_CHECKPOINT', 'APIs',
    'whether you can tell a change that breaks callers from one that does not, before it ships.',
    'Usually the silent ones — a retype or a narrowed enumeration keeps the field name and changes what it means.',
    [
      mcq('You add a field to a response and an old client keeps working. Because:',
        [['It ignores what it does not know about', true],
          ['The field was marked optional in the schema', false],
          ['The client validates only the fields it uses', false],
          ['The response size was unchanged', false]],
        'The only safe addition there is to an existing response.'),
      mcq('A field changes from a number to a string and no client errors, but reports go wrong. That is:',
        [['The silent kind of breaking change, which nothing detects', true],
          ['A serialisation fault rather than a contract change', false],
          ['Safe, since the value is unchanged', false],
          ['Caught by any client with schema validation', false]],
        'A removal would at least fail loudly.'),
      mcq('A caller walking pages by offset misses records while new ones arrive. They need:',
        [['A cursor, which does not shift when the list changes', true],
          ['A larger page size to reduce the window', false],
          ['A snapshot taken before the walk begins', false],
          ['An ordering by identifier rather than date', false]],
        'Offset pagination over changing data loses rows.'),
      mcq('A caller writes three checks for one field because it is sometimes absent, null or empty. That is:',
        [['A defect in the contract, not in the client', true],
          ['Defensive programming and good practice', false],
          ['A consequence of the serialisation format', false],
          ['Necessary for any optional field', false]],
        'Pick one representation of absence.'),
    ],
    [
      mcq('You need to rename a field without breaking anybody. The sequence is:',
        [['Add the new name, migrate the callers, then remove the old', true],
          ['Add the new name and deprecate the old immediately', false],
          ['Version the endpoint and rename inside the new version', false],
          ['Alias the old name to the new one permanently', false]],
        'Expand, migrate, contract.'),
      mcq('The cheapest way to find defects in a contract is:',
        [['Have somebody write a client from the documentation alone', true],
          ['Review the responses against a style guide', false],
          ['Generate a schema and validate against it', false],
          ['Compare it with a similar public API', false]],
        'Every question they must ask is a defect.'),
      mcq('Adding a value to an enumeration is safe and removing one is not, because:',
        [['A client may already hold and rely on the removed value', true],
          ['Clients must accept unknown values by specification', false],
          ['Additions do not change the response size', false],
          ['Removals require a database migration', false]],
        'Widening reaches only a client that asked for it.'),
    ]),

  checkpoint('T2_SECURITY_CHECKPOINT', 'Secure Coding',
    'whether you look for the pattern across the codebase rather than the bug in one place.',
    'Usually the gap beside the defence — the one query, the one context, the one endpoint that was missed.',
    [
      mcq('Every query is parameterised except a search that needed a dynamic column. That is:',
        [['Enough to be vulnerable, and it is the usual shape', true],
          ['Acceptable, since a column name is not user data', false],
          ['A performance trade-off rather than a risk', false],
          ['Safe if the column is checked against a list', false]],
        'One place is all it takes.'),
      mcq('Output is escaped and still executes when placed inside an attribute. Because:',
        [['It was escaped for text, and an attribute has different rules', true],
          ['The template engine escaped it twice', false],
          ['Attributes are not escaped by default', false],
          ['The value contained an encoded quote', false]],
        'Escaped for one context, used in another.'),
      mcq('Every write endpoint checks authorisation and the reads do not. You have:',
        [['A breach, because reading another record is one', true],
          ['A performance optimisation on the read path', false],
          ['An acceptable gap if the data is not sensitive', false],
          ['A gap that only matters for list endpoints', false]],
        'Test the two-account case on reads as well.'),
      mcq('A defence was added after a report and the same fault exists elsewhere. Because:',
        [['The fix repaired one place and no rule made the rest follow', true],
          ['The report only covered one endpoint', false],
          ['The other places were added afterwards', false],
          ['The fix was reverted during a merge', false]],
        'A fix repairs one place; a rule repairs a class.'),
    ],
    [
      mcq('The security check that costs one command and is most often skipped is:',
        [['The dependency audit', true],
          ['The two-account access matrix', false],
          ['The history search for secrets', false],
          ['The review of authorisation decorators', false]],
        'It is one command, and the one most often not run.'),
      mcq('To close a class of fault rather than an instance, you need:',
        [['Every site swept and a rule that stops the next one', true],
          ['Every site swept and a test for each', false],
          ['A rule added and enforced in review', false],
          ['A scanner configured in the pipeline', false]],
        'A sweep fixes today; a rule stops tomorrow.'),
      mcq('An unsafe call still exists beside the safe one. The consequence is:',
        [['Somebody reaches for it on a busy day', true],
          ['Reviewers must check for it every time', false],
          ['The linter reports it as a warning', false],
          ['New code is more likely to be correct', false]],
        'Make the safe way the only way.'),
    ]),

  checkpoint('T2_AI_ASSISTED_CHECKPOINT', 'AI-Assisted Work',
    'whether you would ship something you could not explain, which is the line the whole topic draws.',
    'Usually the checking habits — running it, verifying the API, and testing the edges take minutes and get skipped.',
    [
      mcq('Generated code reads well, is conventionally structured and is wrong. Your usual signal failed because:',
        [['Fluency is the proxy you use for competence, and it does not apply here', true],
          ['The conventions came from a different codebase', false],
          ['The comments described intent rather than behaviour', false],
          ['The naming was chosen to match the request', false]],
        'Sensible naming, conventional structure, comments present.'),
      mcq('The code and the test it came with agree perfectly. That proves:',
        [['Nothing, since both can share one misunderstanding', true],
          ['The described behaviour was implemented', false],
          ['The test was written from the specification', false],
          ['The edge cases were considered together', false]],
        'The pair agrees with itself.'),
      mcq('You ask why something happens and then ask why it would not. Both answers are confident. That means:',
        [['The confidence carries no information either way', true],
          ['The question was genuinely ambiguous', false],
          ['A third, narrower question is needed', false],
          ['The first answer was the more reliable one', false]],
        'It takes a minute to find out.'),
      mcq('You inherit a file written at two in the morning by a colleague who has left. The standard is:',
        [['The same: do not ship what you cannot explain', true],
          ['Lower, since you did not write it', false],
          ['Met once the tests around it pass', false],
          ['Met once somebody reviews it with you', false]],
        'The source does not change the standard.'),
    ],
    [
      mcq('The check most often skipped, and where these faults hide, is:',
        [['Actually running the small piece of generated code', true],
          ['Reading it line by line before merging', false],
          ['Checking it against the project conventions', false],
          ['Asking for an explanation of the approach', false]],
        'Small things are where they hide.'),
      mcq('An API call runs today and will break later. It was:',
        [['Deprecated at the version you depend on', true],
          ['Invented and coincidentally valid', false],
          ['Correct but used with the wrong arguments', false],
          ['Replaced by an alias in a newer release', false]],
        'Check against the documentation for your version.'),
      mcq('You phrase a question to include the answer you expect. You will get:',
        [['Your own assumption back, more confidently stated', true],
          ['A narrower and more accurate answer', false],
          ['A correction if the assumption is wrong', false],
          ['An answer weighted towards the common case', false]],
        'Where most of the lost hours come from.'),
    ]),

  checkpoint('T2_TRACK_BACKEND_CHECKPOINT', 'Backend Work',
    'whether you think about two requests arriving at once, which no single-threaded test will ever show you.',
    'Usually concurrency — read, decide, write is correct alone and wrong in production.',
    [
      mcq('Stock goes negative although every code path checks it first. Two requests:',
        [['Read the same value, both decided it was safe, and both wrote', true],
          ['Were processed out of the order they arrived', false],
          ['Used different connections to the database', false],
          ['Were retried after a timeout', false]],
        'Behind most double bookings and negative stock.'),
      mcq('A view counter drifts lower than the true count over time. Because:',
        [['Increments computed in application code overwrite each other', true],
          ['The counter resets when the service restarts', false],
          ['Some views are filtered before counting', false],
          ['The write is batched and occasionally dropped', false]],
        'Let the database increment atomically.'),
      mcq('A list page is slow in production and fast locally with the same code. Suspect:',
        [['A query with no index, over a table that is small locally', true],
          ['A network round trip added by the load balancer', false],
          ['Serialisation of a larger response body', false],
          ['A cache that is cold after each deploy', false]],
        'Run against realistic row counts.'),
      mcq('One page makes fifty-one database round trips. That pattern is:',
        [['N plus one, from a query inside a loop over results', true],
          ['A batch that was split across connections', false],
          ['A retry storm from a failing dependency', false],
          ['Normal for a page rendering fifty items', false]],
        'Count the queries for one request.'),
    ],
    [
      mcq('The test that reveals a race and nothing else will is:',
        [['Two identical requests sent at the same instant', true],
          ['The suite run with parallel workers', false],
          ['A load test at production volume', false],
          ['A transaction isolation level review', false]],
        'It never appears otherwise.'),
      mcq('For a seat that must not be booked twice, the right mechanism is:',
        [['A unique constraint that refuses the second insert', true],
          ['A conditional update on the seat status', false],
          ['An atomic counter of remaining seats', false],
          ['A lock held for the duration of the request', false]],
        'Stock suits a conditional update instead.'),
      mcq('State stored at module level in a web service is shared by:',
        [['Every request the process handles', true],
          ['Every request from the same client', false],
          ['Every thread, but not across requests', false],
          ['Nothing, since each request is isolated', false]],
        'Make state per-request unless it is deliberately shared.'),
    ]),

  checkpoint('T2_TRACK_FRONTEND_CHECKPOINT', 'Frontend Work',
    'whether you build every screen for four states rather than for the one you have data for.',
    'Usually the three states you never see locally — loading, empty and error.',
    [
      mcq('A screen shows a blank panel while data loads, then fills in. A user on a slow connection sees:',
        [['A screen that looks broken for two seconds', true],
          ['A brief flicker they will not notice', false],
          ['The previous screen until data arrives', false],
          ['A loading indicator supplied by the framework', false]],
        'Three of the four states are usually unbuilt.'),
      mcq('A new user opens the app and sees an empty table with headers. That screen needs:',
        [['An empty state saying what to do next', true],
          ['A loading indicator until data exists', false],
          ['Sample data to demonstrate the layout', false],
          ['A redirect to the setup flow', false]],
        'You always have data; they do not.'),
      mcq('Reordering a list moves the wrong text into the wrong row. The list is:',
        [['Keyed by index rather than by identity', true],
          ['Re-rendering before the state settles', false],
          ['Sorting a mutable array in place', false],
          ['Missing a stable comparison function', false]],
        'Key by identity, so a row follows its own content.'),
      mcq('A button acts on data that was on screen two renders ago. That is:',
        [['A stale closure capturing an old value', true],
          ['A race between two state updates', false],
          ['An effect missing from the dependency list', false],
          ['A cache serving an old response', false]],
        'The callback and the screen disagree.'),
    ],
    [
      mcq('Two clicks in the browser tools surface every loading fault:',
        [['Throttle the network, then reload', true],
          ['Disable the cache, then reload', false],
          ['Emulate a small screen, then reload', false],
          ['Block the API domain, then reload', false]],
        'Your API answers instantly from localhost.'),
      mcq('Navigating a screen with the keyboard alone finds:',
        [['Accessibility faults and a number of ordinary ones', true],
          ['Only issues affecting assistive technology', false],
          ['Focus ring styling problems', false],
          ['Tab order issues but not reachability', false]],
        'A custom control may not be reachable at all.'),
      mcq('A forty-character name breaks the layout. That was invisible because:',
        [['Your test data was short', true],
          ['The container has no maximum width', false],
          ['The font metrics differ per platform', false],
          ['The name field had no length validation', false]],
        'Everything the user has that you do not.'),
    ]),

  checkpoint('T2_TRACK_DATA_CHECKPOINT', 'Data Analysis',
    'whether you can account for every row between the source and the number you are reporting.',
    'Usually the silent drops — a join, a filter or a parse that removed rows nobody counted.',
    [
      mcq('A report covers 8,400 of 10,000 source rows and nobody noticed. The missing check is:',
        [['A row count at each stage of the pipeline', true],
          ['A validation of the source schema', false],
          ['A comparison against the previous run', false],
          ['A null check on the join keys', false]],
        'One line per stage, and it catches most wrong numbers.'),
      mcq('An average spend looks lower than the business expects. Check first whether:',
        [['Missing values were treated as zeroes', true],
          ['Refunds were included in the total', false],
          ['The currency conversion used the wrong rate', false],
          ['The period boundaries were inclusive', false]],
        'An average over missing values is not an average.'),
      mcq('A date column parses fine for most rows and fails for a few. The likeliest cause is:',
        [['Day and month reversed, which only shows above the twelfth', true],
          ['A mixture of two date formats in the file', false],
          ['A timezone shifting some rows across midnight', false],
          ['Leap-year handling in a specific library', false]],
        'The fifth of March and the third of May.'),
      mcq('A conclusion drawn from one month of data is presented as a general finding. That is:',
        [['A sample treated as the population', true],
          ['A seasonality effect that needs adjusting', false],
          ['An insufficient sample size for significance', false],
          ['A reporting period chosen arbitrarily', false]],
        'The confident wrong conclusion.'),
    ],
    [
      mcq('Before reporting a number, the check that finds the most is:',
        [['Sorting by the value and reading the top and bottom ten', true],
          ['Recomputing the aggregate a second way', false],
          ['Checking the null counts in each column', false],
          ['Comparing against the previous period', false]],
        'Anything absurd is a parsing or unit fault.'),
      mcq('Stating what you excluded matters because:',
        [['Each exclusion is a judgement the reader may dispute', true],
          ['It affects the row counts at that stage', false],
          ['Reviewers expect a complete method section', false],
          ['The exclusions may be reversed later', false]],
        'Say what you excluded and why.'),
      mcq('You cannot name a way your conclusion might be wrong. That means:',
        [['You produced it rather than checked it', true],
          ['The analysis was straightforward enough', false],
          ['The data quality was high throughout', false],
          ['A reviewer should look at it instead', false]],
        'Say what would make it wrong.'),
    ]),

  checkpoint('T2_TRACK_AI_CHECKPOINT', 'Machine Learning',
    'whether you computed the baseline before you trained anything, and whether the score beats it.',
    'Usually leakage and the split — both inflate a score in ways that look like success.',
    [
      mcq('A model scores 0.98 and fails completely in production. Check first for:',
        [['A feature that would not exist at prediction time', true],
          ['A learning rate that was set too high', false],
          ['A distribution shift since training', false],
          ['An evaluation metric that flatters the model', false]],
        'One question asked of every single column.'),
      mcq('You scale the features and then split into train and test. You have:',
        [['Let test data influence the training set, quietly', true],
          ['Produced inconsistent ranges across the split', false],
          ['Slowed training with no effect on the score', false],
          ['Made the split unstratified', false]],
        'Extremely common and invisible in the score.'),
      mcq('A classifier reaches 99 percent on a rare-event problem. Before celebrating:',
        [['Check what predicting the majority every time would score', true],
          ['Check whether the classes were balanced', false],
          ['Check the confidence intervals on the score', false],
          ['Check whether the model overfitted', false]],
        'Compute the baseline first, before anything is trained.'),
      mcq('The same customer appears in both train and test. The model may have:',
        [['Memorised that customer rather than learned a pattern', true],
          ['Been trained on duplicate rows', false],
          ['Overfitted to the majority class', false],
          ['Seen the label through a correlated feature', false]],
        'Group by whatever should not straddle the split.'),
    ],
    [
      mcq('A model ties the baseline exactly. It has demonstrated:',
        [['Nothing, whatever its accuracy number looks like', true],
          ['Moderate skill on a hard problem', false],
          ['That the features contain weak signal', false],
          ['That more training data would help', false]],
        'The baseline is what you have to beat.'),
      mcq('Twenty misclassified examples are worth reading because:',
        [['They tell you more than any aggregate metric', true],
          ['They confirm the error rate is correct', false],
          ['They identify features to remove', false],
          ['They show whether the classes are balanced', false]],
        'Look at the errors themselves.'),
      mcq('The statement most often missing when a model is handed over is:',
        [['What it should not be used for', true],
          ['Which metric was optimised', false],
          ['How the data was collected', false],
          ['What its confidence intervals are', false]],
        'It matters when somebody applies it elsewhere.'),
    ]),

  checkpoint('T2_TRACK_MOBILE_CHECKPOINT', 'Mobile Work',
    'whether your app survives the operating system ending it without warning.',
    'Usually state — anything held only in memory is gone, and the user reads that as your app forgetting.',
    [
      mcq('A user writes a message, takes a call, comes back and it is gone. They conclude:',
        [['Your app lost their work', true],
          ['The operating system closed the app', false],
          ['The message was sent already', false],
          ['The network dropped the draft', false]],
        'They do not know a process was killed.'),
      mcq('A screen restores after a process kill showing nothing. It was passed:',
        [['An object held in memory rather than an identifier', true],
          ['A cached response that had expired', false],
          ['A reference to the previous screen', false],
          ['A state object that failed to serialise', false]],
        'An id survives; an object does not.'),
      mcq('Navigating back and forth twenty times leaves twenty screen instances alive. That is:',
        [['A leak, from listeners registered and never removed', true],
          ['Normal, since the stack retains history', false],
          ['A profiler artefact of sampling', false],
          ['Expected until memory pressure triggers collection', false]],
        'The most diagnostic observation in mobile performance work.'),
      mcq('An app drops frames while scrolling a list of photos. Most likely:',
        [['Images are being decoded on the main thread', true],
          ['The list is not recycling its rows', false],
          ['The scroll handler fires too frequently', false],
          ['The images are larger than the screen', false]],
        'Keep the main thread for drawing.'),
    ],
    [
      mcq('The development setting worth leaving on for a whole build is:',
        [['The one that kills backgrounded processes', true],
          ['The one that slows animations down', false],
          ['The one that shows layout boundaries', false],
          ['The one that logs every network call', false]],
        'Everything fragile surfaces within an hour.'),
      mcq('A save on a save button rather than as the user types fails because:',
        [['The phone rings before they press it', true],
          ['The button may be off screen', false],
          ['Saving is slower than typing', false],
          ['The user expects automatic saving', false]],
        'Save on change, debounced, and on backgrounding.'),
      mcq('Revoking a permission mid-session crashes many apps because:',
        [['Almost nobody tests that case', true],
          ['The platform gives no callback for it', false],
          ['The permission cannot be re-requested', false],
          ['It happens only on some manufacturers', false]],
        'Revoke one deliberately and watch what the app does next.'),
    ]),

  checkpoint('T2_TRACK_CLOUD_CHECKPOINT', 'Cloud Work',
    'whether you have caused the conditions you claim to handle, rather than configured for them.',
    'Usually the untested ones — the rollback nobody has run and the health check that proves nothing.',
    [
      mcq('The database is down and the platform keeps sending traffic to the service. The health check:',
        [['Returns success from a handler that touches nothing', true],
          ['Is being called less often than configured', false],
          ['Reports readiness rather than liveness', false],
          ['Has a timeout longer than the check interval', false]],
        'Make it touch what the service needs.'),
      mcq('An incident starts and nobody knows how long a rollback takes. Because:',
        [['It has never been run', true],
          ['The procedure is documented but not automated', false],
          ['The previous artefact was not retained', false],
          ['The deployment tool reports no estimate', false]],
        'A procedure nobody has performed is not a capability.'),
      mcq('A service works until its instance is replaced, then loses data. It was writing to:',
        [['The instance’s local disk', true],
          ['A cache that was not warmed', false],
          ['A connection pool held open too long', false],
          ['A region that failed over', false]],
        'Keep nothing on local disk.'),
      mcq('Everything in this list is fine on a good day. That is what makes them:',
        [['Invisible until the moment they matter, which is an incident', true],
          ['Lower priority than functional defects', false],
          ['Difficult to reproduce in a test environment', false],
          ['Configuration problems rather than code ones', false]],
        'Cause the condition deliberately.'),
    ],
    [
      mcq('To find out whether your health check is honest, you:',
        [['Stop the database and call it', true],
          ['Read its implementation carefully', false],
          ['Compare it against the platform default', false],
          ['Check how often it is polled', false]],
        'If it still says healthy, that is the finding.'),
      mcq('Liveness decides whether to restart an instance; readiness decides:',
        [['Whether to route traffic to it', true],
          ['Whether the deployment has finished', false],
          ['Whether to scale the service up', false],
          ['Whether dependencies are healthy', false]],
        'Two questions, two endpoints.'),
      mcq('Copied permissions are broader than needed. To find out what is needed:',
        [['Remove one and see what stops working', true],
          ['Read the platform audit log for used actions', false],
          ['Compare against the documented minimum', false],
          ['Ask whoever configured the original', false]],
        'Then put it back, having learned what it was for.'),
    ]),

  checkpoint('T2_TRACK_SECURITY_CHECKPOINT', 'Security Work',
    'whether your findings are written so somebody can act on them, which is what decides if anything changes.',
    'Usually impact and effort — the two parts that decide whether a finding is scheduled and the two most often missing.',
    [
      mcq('A finding says "could lead to data exposure" and is not scheduled. It needed:',
        [['The consequence: who can read what, specifically', true],
          ['A higher severity rating', false],
          ['Escalation to a manager', false],
          ['A reference to a known vulnerability class', false]],
        'Only a consequence gets scheduled.'),
      mcq('A fix reading "implement proper access control" is:',
        [['The finding restated, not work anybody can pick up', true],
          ['Appropriate when the design is at fault', false],
          ['Suitable guidance for a senior team', false],
          ['Better than prescribing one implementation', false]],
        'Name the method and the change.'),
      mcq('Every finding in a report is marked critical. The team:',
        [['Cannot tell where to start, and stops believing the report', true],
          ['Addresses them in the order listed', false],
          ['Escalates the whole report at once', false],
          ['Asks for the severities to be recalculated', false]],
        'Be willing to mark something low.'),
      mcq('Three months later the same findings are rediscovered. The report was:',
        [['Delivered as a document rather than as tickets', true],
          ['Sent to the wrong team', false],
          ['Too long to read fully', false],
          ['Written before the code changed', false]],
        'A report is a document; a ticket is work.'),
    ],
    [
      mcq('Forwarding a scanner’s output without triage signals:',
        [['That no judgement was applied', true],
          ['That the engagement was time-limited', false],
          ['That the tool was well configured', false],
          ['That the team should triage it themselves', false]],
        'They will find the false positives before you do.'),
      mcq('One line naming something the system does well:',
        [['Changes how the rest of the report is read', true],
          ['Softens findings the team may dispute', false],
          ['Is a professional courtesy only', false],
          ['Balances the tone for management', false]],
        'A report that is only negative is read defensively.'),
      mcq('A quarter after the report, the number worth knowing is:',
        [['How many findings became merged changes', true],
          ['How many were accepted as valid', false],
          ['How many remain open', false],
          ['How many were rated critical', false]],
        'Nobody produces it unless you do.'),
    ]),

  {
    unitCode: 'T2_DIRECTION_SAMPLING',
    notes: `**A direction is chosen by doing a piece of its work, not by reading about it.** Every
description makes every direction sound reasonable, which is why descriptions cannot separate
them.

## What a sample is

**Two hours of the actual work.** Not a tutorial, not a video — a small real task of the kind
that direction does every day.

**Backend:** an endpoint that stores something and gives it back, with a wrong input rejected.

**Frontend:** one screen, with the loading, empty and error states built.

**Data:** a messy file loaded, cleaned, and one question answered from it — with the rows
accounted for.

**Mobile:** one screen on a real device that survives being rotated.

**Cloud:** one service deployed, reachable by somebody else.

**Security:** one small application tested, with two findings written up properly.

**AI:** a baseline computed on a small dataset, and a model that has to beat it.

## What to notice while you do it

**Not whether it was easy.** Everything is hard the first time, and difficulty at two hours
predicts nothing.

**Whether you wanted to keep going** when the two hours were up. **That is the signal**, and it
is the only one at this stage that has ever meant anything.

**What kind of problem it was.** Some people find an ambiguous requirement interesting and a
fiddly layout tedious; some are the reverse. Both are fine and they point at different work.

**And what you did when it broke**, because it will break. Whether that was absorbing or
irritating is more informative than whether you succeeded.

## Doing it honestly

**Two directions, not one.** A single sample tells you how you feel about that morning, not how
you compare it to anything.

**The same amount of time each.**

**Write three sentences immediately afterwards**, before you have rationalised it. What you
liked, what you did not, and whether you would do it again tomorrow.

## What this does not decide

**Not your career.** The first job rarely matches the direction and almost nobody stays in the
one they started in.

**It decides what you spend the next months on**, which is a smaller and more answerable
question — and getting that wrong costs months rather than years.`,
    coding: [
      {
        title: 'Reading your own signals',
        description: `Read one sampled direction per line as
\`<name> <finished> <wanted_more> <enjoyed_debugging> <hours>\`, where the middle three are
\`yes\` or \`no\` and hours is an integer.

Print per line:

- \`wanted_more\` yes and \`enjoyed_debugging\` yes → \`<name> strong\`
- \`wanted_more\` yes → \`<name> interested\`
- \`finished\` yes → \`<name> completed\`
- otherwise → \`<name> weak\`

Then \`compare=<yes|INSUFFICIENT>\`, which is \`yes\` only when at least two directions were
sampled for **the same number of hours**.

**Finishing is the weakest signal of the three.** Plenty of people finish something they never
want to see again, and that is exactly the outcome this exercise exists to separate.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# Finishing is the weakest signal. Wanting to continue is the strongest.
`,
        language: 'python',
        tests: [
          { input: 'backend yes yes yes 2\n', expectedOutput: 'backend strong\ncompare=INSUFFICIENT' },
          { input: 'backend yes yes no 2\ndata yes no no 2\n', expectedOutput: 'backend interested\ndata completed\ncompare=yes' },
          { input: 'backend no no no 2\n', expectedOutput: 'backend weak\ncompare=INSUFFICIENT' },
          { input: 'a yes yes yes 2\nb yes yes yes 3\n', expectedOutput: 'a strong\nb strong\ncompare=INSUFFICIENT' },
          { input: 'a no yes no 4\nb yes no no 4\nc yes yes yes 1\n', expectedOutput: 'a interested\nb completed\nc strong\ncompare=yes', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Trying One Before Choosing It',
      description: 'Sample two directions for real, then read your own signals honestly.',
      instructions: `Complete the exercise, then:

1. Finishing is the weakest signal. Say why, from your own experience of finishing something you
   disliked.
2. \`compare\` needs equal hours. Say what an unequal comparison would tell you, and why it is
   misleading.
3. Say what signal you would add to the three, and how you would record it.

**Then sample two directions, two hours each.**

Use the tasks in the notes, or equivalents.

4. **Set a timer at two hours and stop.** Record what you got working.
5. Record whether you wanted to keep going, immediately, before rationalising.
6. Record what broke and how you felt about fixing it.
7. Repeat for a second direction. **The same two hours.**

**Then decide.**

8. Write your three sentences for each: what you liked, what you did not, would you do it again
   tomorrow.
9. Say which you would choose, and **name the thing about the other one that you will miss**.
10. Say what would make you change your mind in three months, specifically.`,
      rubric: [
        { criterion: 'Signals classified', description: 'All cases, including the equal-hours comparison rule.', maxPoints: 20 },
        { criterion: 'Finishing judged as weak', description: 'With a real example from your own experience.', maxPoints: 15 },
        { criterion: 'Two directions sampled equally', description: 'Two hours each, timed, with what worked recorded.', maxPoints: 25 },
        { criterion: 'Signals recorded before rationalising', description: 'Wanting to continue, and the reaction to breakage.', maxPoints: 20 },
        { criterion: 'A choice with a cost named', description: 'Which direction, and what will be missed about the other.', maxPoints: 10 },
        { criterion: 'A condition for changing your mind', description: 'Specific, and checkable in three months.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]
`,
        tests: [
          { input: 'backend yes yes yes 2\n', expectedOutput: 'backend strong\ncompare=INSUFFICIENT' },
          { input: 'backend yes yes no 2\ndata yes no no 2\n', expectedOutput: 'backend interested\ndata completed\ncompare=yes' },
          { input: 'backend no no no 2\n', expectedOutput: 'backend weak\ncompare=INSUFFICIENT' },
          { input: 'a yes yes yes 2\nb yes yes yes 3\n', expectedOutput: 'a strong\nb strong\ncompare=INSUFFICIENT' },
          { input: 'a no yes no 4\nb yes no no 4\nc yes yes yes 1\n', expectedOutput: 'a interested\nb completed\nc strong\ncompare=yes', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('The signal that means something at this stage is:',
        [['Whether you wanted to keep going when the time was up', true],
          ['Whether you finished what you set out to do', false],
          ['Whether you found it easy relative to the other', false],
          ['How much of it you could do without help', false]],
        'Difficulty at two hours predicts nothing.'),
      mcq('Sampling one direction rather than two tells you:',
        [['How you felt about that morning, not how it compares to anything', true],
          ['Enough, if the sample was long enough', false],
          ['Whether that one direction actually suits you in isolation', false],
          ['More than two shorter samples would', false]],
        'Two, for the same time each.'),
      mcq('This choice decides:',
        [['What you spend the next months on, not your career', true],
          ['The kind of role you will be hired into', false],
          ['Which parts of Year 3 are available to you', false],
          ['Whether you can change track later', false]],
        'A smaller and more answerable question.'),
    ],
  },

  {
    unitCode: 'T2_INTERNSHIP_APPLICATION_REVIEW',
    notes: `**Six seconds on the first pass.** That is what your application gets, and judging
other people's is the only way to learn what survives it.

## What a recruiter is doing

**Matching against the posting**, quickly. Not reading, scanning — for the words the posting
used, evidence of building something, and a reason to keep going.

**Discarding on one signal.** A missing requirement they treat as hard, no evidence of any
project, a link that does not work, or a wall of text with no structure.

**And looking for a reason to advance you**, which is a more useful way to hold it: they need
one thing to point at when they pass it on.

## What survives the scan

**A project with a link that works.** Immediately visible, not on page two.

**The posting's own words**, where they are honestly true of you.

**Evidence rather than adjectives.** "Passionate about backend development" is what everybody
writes; "built and deployed an API handling concurrent bookings, with the race condition
described in the write-up" is checkable.

**One page**, with structure you can see without reading.

**And no obvious gap against the two or three requirements the posting repeats.**

## What does not

**A skills list with no work behind it.** Ten technologies and nothing built with any of them.

**Projects described by their technology** rather than by what they do.

**A summary of adjectives.**

**Education above projects**, for somebody with no experience — the most common structural
mistake on a graduate CV.

**And anything that cannot be checked**, because it will be assumed to be decoration.

## Judging somebody else's

**Give yourself six seconds.** Then say: advance, or not, and the one reason.

**Then two minutes**, and say what changed. Things that look fine in six seconds and bad in two
are a useful category — a project with a good title and an empty repository behind it.

**Then say the one change with the largest effect.** Usually the first two lines, or the order
of the sections.

## Then your own

**You cannot apply these criteria to your own from memory**, which is the whole reason this unit
asks you to judge other people's first. **Do three, then yours, with the same six seconds** —
and expect to fail your own checks, because everybody does.`,
    mcqs: [
      mcq('A recruiter on the first pass is:',
        [['Scanning for the posting’s words and a reason to advance you', true],
          ['Reading the whole document once for content', false],
          ['Checking each requirement against a list', false],
          ['Comparing you against the other applicants', false]],
        'Six seconds, matching against the posting.'),
      mcq('"Passionate about backend development" fails because:',
        [['Everybody writes it, so it distinguishes nobody and cannot be checked', true],
          ['It describes attitude rather than skill', false],
          ['It does not use the posting’s vocabulary', false],
          ['It belongs in a covering letter instead', false]],
        'Evidence rather than adjectives.'),
      mcq('On a CV with no work history, the section that should come first is:',
        [['Projects, because for a graduate they are the experience section', true],
          ['Education, since it is the strongest credential available', false],
          ['A skills list, so the reader can match against the posting', false],
          ['A summary paragraph stating what you are looking for', false]],
        'Putting education above projects is the usual mistake.'),
      mcq('You cannot apply these criteria to your own application because:',
        [['You know what every line means, so you cannot tell whether it says so', true],
          ['You are too invested to judge it fairly', false],
          ['You wrote it, so it reads clearly to you', false],
          ['You cannot time yourself accurately', false]],
        'Which is why you judge three others first.'),
    ],
    checkpoint: [
      mcq('Something that looks fine in six seconds and bad in two minutes is:',
        [['A useful category — a good title over an empty repository', true],
          ['A sign the first impression was wrong', false],
          ['Rare enough not to matter', false],
          ['An argument for spending rather longer on each one', false]],
        'Do both passes: six seconds, then two minutes.'),
      mcq('Anything that cannot be checked is:',
        [['Assumed to be decoration', true],
          ['Taken at face value until contradicted', false],
          ['Verified at the interview stage', false],
          ['Weighted less than checkable claims', false]],
        'Which is what makes a working link valuable.'),
      mcq('The one change with the largest effect is usually:',
        [['The first two lines, or the order of the sections', true],
          ['The list of technologies mentioned', false],
          ['The overall length of the project descriptions', false],
          ['The formatting and visual layout', false]],
        'Name one change, not fourteen.'),
    ],
  },

  {
    unitCode: 'T2_INTERNSHIP_ANSWER_PRACTICE',
    notes: `One exercise on the material behind a behavioural answer: whether you have a real
story ready, or will improvise a general one.`,
    coding: [
      {
        title: 'Is this answer ready',
        description: `Read one prepared story per line as
\`<name> <specific_instance> <own_actions> <would_change> <under_two_min>\`, each \`yes\` or
\`no\`.

Print, checking in this order:

- not a specific instance → \`<name> TOO_GENERAL\`
- not own actions → \`<name> NO_I\`
- no would-change → \`<name> NO_REFLECTION\`
- over two minutes → \`<name> TOO_LONG\`
- otherwise → \`<name> ready\`

Then \`ready=<n>\`, and \`COVERAGE_THIN\` on the next line when fewer than four stories are
ready — because the standard questions need roughly six, and four is the point below which you
will be improvising one of them.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# A general answer to "tell me about a time" is not an answer.
`,
        language: 'python',
        tests: [
          { input: 'conflict yes yes yes yes\n', expectedOutput: 'conflict ready\nready=1\nCOVERAGE_THIN' },
          { input: 'failure no yes yes yes\n', expectedOutput: 'failure TOO_GENERAL\nready=0\nCOVERAGE_THIN' },
          { input: 'proud yes no yes yes\n', expectedOutput: 'proud NO_I\nready=0\nCOVERAGE_THIN' },
          { input: 'stuck yes yes no yes\n', expectedOutput: 'stuck NO_REFLECTION\nready=0\nCOVERAGE_THIN' },
          { input: 'a yes yes yes yes\nb yes yes yes yes\nc yes yes yes yes\nd yes yes yes yes\n', expectedOutput: 'a ready\nb ready\nc ready\nd ready\nready=4', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'The Questions That Always Come',
      description: 'Judge whether your stories are ready, then build and test six of them.',
      instructions: `Complete the exercise, then:

1. \`TOO_GENERAL\` is checked first. Say why a general answer fails before the others matter.
2. Four ready stories is the threshold. Say which question you would be improvising at four,
   and why that one is the risk.
3. Say why "we" rather than "I" is marked as a failure rather than a style point.

**Then build six stories** from your own Year-2 work.

4. Something that did not work and you found out why.
5. A decision with a real trade-off.
6. A time you were wrong and changed your mind.
7. A time you were stuck and got unstuck.
8. A time you cut scope to finish.
9. A disagreement about your own work.

**For each: five bullet points, not sentences.** Situation, what you did, why, what happened,
what you would change.

**Then test them.**

10. Say each one out loud, timed. **Record which ran over two minutes.**
11. Find the specific number in each — how many endpoints, how long, what the result was. **Add
    it if it is missing.**
12. Have somebody ask you three of the six at random. Record which one you had least ready.
13. Say honestly which story you are tempted to exaggerate, and write the true version.`,
      rubric: [
        { criterion: 'Readiness classified', description: 'All cases, in the stated order, with the coverage warning.', maxPoints: 20 },
        { criterion: 'The precedence and threshold explained', description: 'Why general fails first, and which question four leaves exposed.', maxPoints: 15 },
        { criterion: 'Six stories built from real work', description: 'Five bullets each, covering the six kinds.', maxPoints: 25 },
        { criterion: 'Timed out loud', description: 'Each said aloud, with the overruns recorded.', maxPoints: 15 },
        { criterion: 'A number in each', description: 'Specific figures found or added.', maxPoints: 15 },
        { criterion: 'Tested and honest', description: 'Three asked at random, and the temptation to exaggerate named.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]
`,
        tests: [
          { input: 'conflict yes yes yes yes\n', expectedOutput: 'conflict ready\nready=1\nCOVERAGE_THIN' },
          { input: 'failure no yes yes yes\n', expectedOutput: 'failure TOO_GENERAL\nready=0\nCOVERAGE_THIN' },
          { input: 'proud yes no yes yes\n', expectedOutput: 'proud NO_I\nready=0\nCOVERAGE_THIN' },
          { input: 'stuck yes yes no yes\n', expectedOutput: 'stuck NO_REFLECTION\nready=0\nCOVERAGE_THIN' },
          { input: 'a yes yes yes yes\nb yes yes yes yes\nc yes yes yes yes\nd yes yes yes yes\n', expectedOutput: 'a ready\nb ready\nc ready\nd ready\nready=4', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('A general answer fails before the other checks matter because:',
        [['It does not answer the question asked, whatever else is right about it', true],
          ['It is usually longer than two minutes', false],
          ['It hides whose actions are actually being described in the story', false],
          ['It cannot include a specific number', false]],
        '"I usually try to" is not an answer to "tell me about a time".'),
      mcq('"We" rather than "I" is a failure because:',
        [['They are assessing you, and a story told in we hides your part', true],
          ['It understates your contribution modestly', false],
          ['It suggests you cannot work alone', false],
          ['It is grammatically inconsistent with the question asked', false]],
        'Not to claim credit — to be assessable.'),
      mcq('Putting a real figure into a story does what:',
        [['Makes the whole story credible in a way nothing else manages', true],
          ['Demonstrates that you measured your own work carefully', false],
          ['Keeps the answer comfortably within the time limit', false],
          ['Invites a follow-up question you can prepare for', false]],
        'How many endpoints, how long it took, what the result was.'),
    ],
  },
];
