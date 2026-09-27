/**
 * The second debugging and practice unit for AI-assisted work and each of the seven direction
 * tracks — sixteen bundles for units `closeOut` now emits.
 *
 * ── THE TRACK UNITS CARRY AN EXTRA CONSTRAINT ─────────────────────────────────────────────
 *
 * A track unit reaches only the students who chose that direction, so it has to be worth a day
 * to somebody committed to the area rather than sampling it. These are written accordingly:
 * the fault each one hunts is specific to that kind of work and would not appear in another
 * track's version of the same unit.
 *
 * Attribution: all eight topics are single-skill at the topic level or already covered by
 * year2SkillAttribution, so these units take their topic default.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const DEEPER_TRACK_BUNDLES: PilotBundle[] = [
  /* ══ T2_AI_ASSISTED ═════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T2_AI_ASSISTED_HARDER_FAULTS',
    notes: `**Generated code that is fluent, conventional and wrong.** The obvious failures — a
method that does not exist, a syntax error — announce themselves. These do not.

## The shapes

**A subtly wrong boundary.** The loop runs to the wrong limit, and the generated test makes the
same mistake, so the pair agrees with itself.

**An algorithm that is right in general and wrong for your data.** Correct unless there are
duplicates, or the list is empty, or the values can be negative.

**Error handling that swallows.** A broad catch added because it looks responsible, turning a
failure into a silence.

**A plausible explanation that is not the reason.** You ask why something happens and get a
clear, coherent answer that is wrong — **the most dangerous shape**, because you will remember
it as a fact and repeat it.

**Code that matches your bad pattern.** It read the surrounding file. If that file concatenates
queries, so will this.

**An unnecessary abstraction**, because the request sounded general.

**And a deprecated call** that runs today with a warning nobody read.

## Why review misses them

**Fluency is your proxy for competence**, and here it is broken: the naming is sensible, the
structure conventional, the comments present.

**And you asked for it**, which makes you inclined to accept it. Reviewing what you requested is
harder than reviewing what you were sent.

## The checks that work

**Run it.** The single highest-value check and the one skipped most for small things, which is
where these hide.

**Run the four inputs**: empty, one, two identical, all negative.

**Ask it the opposite question.** "Why would this not work?" **A confident answer to both means
the confidence means nothing**, and it takes a minute to find out.

**Check any API against the documentation at your version.**

**And never accept an explanation you cannot verify somewhere that cannot be fluent** — the
source, the documentation, an experiment.

## The line

**If you cannot explain every line, you are not ready to ship it.** Not roughly what it does —
why it is that line. The source does not matter: generated, copied, inherited or written by you
at two in the morning, the standard is the same.`,
    mcqs: [
      mcq('Which kind of wrong answer does the most damage:',
        [['A plausible explanation that is not the reason, which you will repeat as fact', true],
          ['A method that does not exist in the library at all', false],
          ['A boundary that is wrong by exactly one', false],
          ['A deprecated call that still runs today', false]],
        'Clear, coherent, and not the reason.'),
      mcq('Generated code matching your bad pattern happens because:',
        [['It read the surrounding file, so it copies what is there', true],
          ['Safe patterns are underrepresented in training data', false],
          ['The request did not mention the safe approach', false],
          ['Conventions differ between languages', false]],
        'If that file concatenates queries, so will this.'),
      mcq('Putting the opposite question to the assistant helps because:',
        [['A confident answer to both questions means the confidence means nothing', true],
          ['Negative framing produces more careful reasoning', false],
          ['It surfaces edge cases the first answer omitted', false],
          ['It reveals which assumptions were made', false]],
        'And it takes a minute to find out.'),
      mcq('Reviewing code you requested is harder because:',
        [['Having asked for it makes you inclined to accept it', true],
          ['You already know what it is supposed to do', false],
          ['There is no author to question about it', false],
          ['It arrives without a description to check against', false]],
        'Harder than reviewing what you were sent.'),
    ],
    checkpoint: [
      mcq('Generated code and its generated test agreeing:',
        [['Proves nothing, because both can share the same mistake', true],
          ['Is reasonable evidence the behaviour is correct', false],
          ['Means the test was derived from the implementation', false],
          ['Only matters when the test was written first', false]],
        'The pair agrees with itself.'),
      mcq('Running it is skipped most often for:',
        [['Small things, which is exactly where these faults hide', true],
          ['Code in unfamiliar languages', false],
          ['Changes that are already covered by existing tests', false],
          ['Snippets that were explained clearly', false]],
        'The single highest-value check.'),
      mcq('The standard for shipping applies to:',
        [['Any code you ship, whatever its source', true],
          ['Generated code specifically, given its risks', false],
          ['Code in areas you are unfamiliar with', false],
          ['Changes above a certain size', false]],
        'Generated, copied, inherited, or written at two in the morning.'),
    ],
  },

  {
    unitCode: 'T2_AI_ASSISTED_HARDER_PRACTICE',
    notes: `One exercise on the judgement this topic turns on: whether a piece of generated code
has been checked enough to ship.`,
    coding: [
      {
        title: 'Is it ready to ship',
        description: `Read one generated change per line as
\`<name> <ran_it> <checked_apis> <edges_tested> <can_explain>\`, each \`yes\` or \`no\`.

Print, checking in this order:

- \`can_explain\` is no → \`<name> DO_NOT_SHIP\`
- \`ran_it\` is no → \`<name> RUN_IT\`
- \`checked_apis\` is no → \`<name> VERIFY_APIS\`
- \`edges_tested\` is no → \`<name> TEST_EDGES\`
- otherwise → \`<name> ship\`

Then \`ship=<n>\`.

**Explanation is checked first**, because it is the only one of the four that cannot be
delegated: the other three are work somebody could do for you, and that one is the reason your
name is on the change.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# Three of these can be delegated. One cannot.
`,
        language: 'python',
        tests: [
          { input: 'a yes yes yes yes\n', expectedOutput: 'a ship\nship=1' },
          { input: 'a yes yes yes no\n', expectedOutput: 'a DO_NOT_SHIP\nship=0' },
          { input: 'a no yes yes yes\n', expectedOutput: 'a RUN_IT\nship=0' },
          { input: 'a yes no yes yes\n', expectedOutput: 'a VERIFY_APIS\nship=0' },
          { input: 'p yes yes no yes\nq no no no no\n', expectedOutput: 'p TEST_EDGES\nq DO_NOT_SHIP\nship=0', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'AI-Assisted Work — Past the Obvious Answer',
      description: 'Judge readiness to ship, then find a confident wrong answer deliberately.',
      instructions: `Complete the exercise, then:

1. Explanation is checked first. Say why the other three can be delegated and that one cannot.
2. Give a case where you would ship without testing the edges, and say what you would do
   instead.
3. Say what \`checked_apis\` should mean concretely — against what, exactly.

**Then, deliberately produce a wrong answer.**

4. Ask an assistant for something in an area you know well. **Ask a leading question**, phrased
   to invite your own assumption back.
5. Record the answer. Say whether it agreed with you, and whether it was right.
6. Ask the opposite question about the same thing. Record whether it agreed with that too.
7. Ask it to explain a behaviour you can verify from documentation. **Check the explanation.**
   Record whether it was correct, plausible-but-wrong, or an answer to a different question.

**Then, on generated code.**

8. Generate a function of thirty lines or more in a language you know.
9. Run the four inputs against it. Record what broke.
10. Check every API call it used against the documentation at your version. Record any that do
    not exist or are deprecated.
11. **Walk the diff and say out loud why each line is there.** Name every line you hesitated on.
12. Decide: ship, fix, or write it yourself. Say which and why.`,
      rubric: [
        { criterion: 'Readiness classified', description: 'All cases, with explanation checked first.', maxPoints: 20 },
        { criterion: 'The precedence justified', description: 'Why three delegate and one does not, with a concrete meaning for API checking.', maxPoints: 15 },
        { criterion: 'A leading question run', description: 'Answer recorded, agreement and correctness judged separately.', maxPoints: 15 },
        { criterion: 'The opposite question run', description: 'With what agreeing to both implies.', maxPoints: 15 },
        { criterion: 'Generated code probed', description: 'Four inputs run, every API checked against the documentation.', maxPoints: 20 },
        { criterion: 'A decision with a reason', description: 'Hesitations named, and a ship-fix-rewrite verdict defended.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]
`,
        tests: [
          { input: 'a yes yes yes yes\n', expectedOutput: 'a ship\nship=1' },
          { input: 'a yes yes yes no\n', expectedOutput: 'a DO_NOT_SHIP\nship=0' },
          { input: 'a no yes yes yes\n', expectedOutput: 'a RUN_IT\nship=0' },
          { input: 'a yes no yes yes\n', expectedOutput: 'a VERIFY_APIS\nship=0' },
          { input: 'p yes yes no yes\nq no no no no\n', expectedOutput: 'p TEST_EDGES\nq DO_NOT_SHIP\nship=0', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('The three delegable checks can be done by somebody else because:',
        [['They are mechanical, while understanding the change is why your name is on it', true],
          ['They require particular tooling rather than any real judgement at all', false],
          ['They can be automated in a pipeline', false],
          ['They do not depend on knowing the codebase', false]],
        'Explanation is the one that cannot be delegated.'),
      mcq('Checking the APIs means checking against:',
        [['The documentation at the version you actually depend on', true],
          ['The latest documentation published by the library', false],
          ['Whether the call runs without raising', false],
          ['The type hints exposed by the package', false]],
        'A deprecated call runs today.'),
      mcq('Shipping without testing the edges is defensible when:',
        [['The change is covered by an existing suite you have verified goes red', true],
          ['The code is short enough to read through in full at a glance', false],
          ['The assistant reported no edge cases', false],
          ['The function has a single obvious input', false]],
        'Something else has to be doing that work.'),
    ],
  },

  /* ══ T2_TRACK_BACKEND ═══════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T2_TRACK_BACKEND_HARDER_FAULTS',
    notes: `**A service that is correct with one request at a time.** Everything passes locally,
where nothing happens at once.

## The faults concurrency finds

**Read, decide, write.** Two requests read the same value, both decide it is safe, both write.
The last one wins and the first one's work is gone. **This is the fault behind most double
bookings, double charges and negative stock**, and it is invisible to every single-threaded
test.

**A check in one request and an action in another.** Availability confirmed, then reserved a
moment later, with somebody else in between.

**A counter incremented in application code** rather than by the database.

**Shared mutable state between requests.** A module-level cache, a connection reused, a
variable that was not per-request.

**And a background job racing a request** for the same row.

## The faults load finds

**A query that is fine at a thousand rows.** No index, and the plan is a full scan nobody noticed
because the development database is small.

**A connection leaked per request**, which works for an hour.

**N+1 queries**, where a list of fifty makes fifty-one round trips.

**And an unbounded response**, which is fast until somebody has ten thousand of something.

## Finding them before production

**Send the same request twice at once.** Two terminals, or a loop. **The read-decide-write fault
appears immediately and never appears otherwise** — which makes this the single most valuable
thing in the unit.

**Count the queries for one request.** Most frameworks can log them. Fifty-one is a finding.

**Run against a database with realistic row counts**, not fifty rows.

**And look at the query plan** for anything filtering or joining, rather than assuming the index
is used.

## Repairing

**Let the database decide.** A unique constraint, a conditional update, an atomic increment — the
database is the one place that can serialise, and application code cannot substitute for it.

**Hold the decision and the action in one transaction**, or make the write conditional on what
was read.

**And make state per-request** unless it is deliberately shared and safe to be.`,
    mcqs: [
      mcq('Read, decide, write is the fault behind:',
        [['Most double bookings, double charges and negative stock', true],
          ['Most slow queries under production load', false],
          ['Most connection leaks in long-running services', false],
          ['Most failures that appear only after a deploy', false]],
        'And it is invisible to every single-threaded test.'),
      mcq('The single most valuable check in this unit is:',
        [['Sending the same request twice at once', true],
          ['Counting the queries made for one request', false],
          ['Running against realistic row counts', false],
          ['Reading the query plan for every join', false]],
        'The fault appears immediately and never appears otherwise.'),
      mcq('Letting the database decide works because:',
        [['It is the one place that can serialise, and application code cannot substitute', true],
          ['Database operations are faster than application logic', false],
          ['Constraints are easier to review than code', false],
          ['It moves the check closer to the data', false]],
        'A unique constraint, a conditional update, an atomic increment.'),
      mcq('N+1 queries mean a list of fifty makes:',
        [['Fifty-one round trips', true],
          ['Fifty round trips, one per item', false],
          ['Two round trips, one of them large', false],
          ['One round trip returning fifty times the data', false]],
        'Count the queries for one request.'),
    ],
    checkpoint: [
      mcq('A missing index goes unnoticed because:',
        [['The development database is small enough for a full scan to be fast', true],
          ['Query plans are not logged by default', false],
          ['The framework adds indexes automatically', false],
          ['Scans and index lookups look much the same in the ordinary logs', false]],
        'Run against realistic row counts.'),
      mcq('A counter incremented in application code:',
        [['Loses increments when two requests read the same value', true],
          ['Is slower than an atomic increment in the database', false],
          ['Cannot be rolled back with the transaction', false],
          ['Drifts only when the service restarts', false]],
        'Let the database do it atomically.'),
      mcq('Shared mutable state between requests includes:',
        [['A module-level cache and a variable that was not per-request', true],
          ['Anything stored in the database', false],
          ['The request and the response objects for that call', false],
          ['Configuration read at startup', false]],
        'Make state per-request unless it is deliberately shared.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_BACKEND_HARDER_PRACTICE',
    notes: `One exercise on the fault a single-threaded test can never find: two requests that
each read, decide and write.`,
    coding: [
      {
        title: 'Two requests, one seat',
        description: `Read a starting stock on the first line, then one request per line as
\`<name> <quantity> <guarded>\`, where guarded is \`yes\` when the write is conditional on the
stock still being what was read, and \`no\` when it is a plain read-decide-write.

Process requests **in order**, but model the unguarded ones as having read the stock **before
any of them wrote** — which is what concurrency does.

Print per request \`<name> ok\` or \`<name> REJECTED\`, then \`final=<stock>\` and
\`oversold=<n>\`, where oversold counts requests that succeeded beyond what the stock allowed.

A guarded request sees the true current stock. An unguarded one sees the stock as it was at the
start, which is how two requests both decide there is room.`,
        starter: `import sys

lines = [l for l in sys.stdin.read().split('\\n') if l.strip()]
stock = int(lines[0])
initial = stock

# A guarded write sees the truth. An unguarded one sees the stock as it was at the start.
`,
        language: 'python',
        tests: [
          { input: '1\na 1 yes\nb 1 yes\n', expectedOutput: 'a ok\nb REJECTED\nfinal=0\noversold=0' },
          { input: '1\na 1 no\nb 1 no\n', expectedOutput: 'a ok\nb ok\nfinal=-1\noversold=1' },
          { input: '5\na 2 yes\n', expectedOutput: 'a ok\nfinal=3\noversold=0' },
          { input: '0\na 1 yes\n', expectedOutput: 'a REJECTED\nfinal=0\noversold=0' },
          { input: '2\na 2 no\nb 2 no\nc 1 yes\n', expectedOutput: 'a ok\nb ok\nc REJECTED\nfinal=-2\noversold=1', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Backend Work — Past the Obvious Answer',
      description: 'Model the race, then produce it against a real service.',
      instructions: `Complete the exercise, then:

1. Say why the guarded request in the last case is rejected even though the unguarded ones
   succeeded, and what that models.
2. Say what \`oversold\` would be if every request were guarded, whatever the quantities.
3. Name the two database mechanisms that make the guard real, and say which you would use for
   stock and which for a unique booking.

**Then, against a real service** — one you write for this, with a database behind it.

4. Build an endpoint that reads a value, decides, and writes. Do it the naive way first.
5. **Send two requests at the same instant.** Two terminals, or a loop in the background.
   Record what happened to the data.
6. Repeat it twenty times and record how often the race fired.
7. Fix it with a database-level guard. Repeat the twenty and record the result.
8. **Count the queries for one request.** Record the number and say whether it is N+1.
9. Load the table with a realistic number of rows and time the same query. Record before and
   after.
10. Read the query plan and say whether the index you expected is used.`,
      rubric: [
        { criterion: 'The race modelled correctly', description: 'All cases, with oversold counted and the guarded request rejected.', maxPoints: 25 },
        { criterion: 'The guard explained', description: 'What the last case models, and the all-guarded answer.', maxPoints: 15 },
        { criterion: 'Mechanisms named and chosen', description: 'Two, with which suits stock and which suits a unique booking.', maxPoints: 10 },
        { criterion: 'A real race produced', description: 'Two simultaneous requests, twenty repeats, frequency recorded.', maxPoints: 25 },
        { criterion: 'Fixed and re-tested', description: 'Database-level guard added, twenty repeats clean.', maxPoints: 15 },
        { criterion: 'Queries and plan examined', description: 'Count per request, realistic timing, plan read.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

lines = [l for l in sys.stdin.read().split('\\n') if l.strip()]
stock = int(lines[0])
initial = stock
`,
        tests: [
          { input: '1\na 1 yes\nb 1 yes\n', expectedOutput: 'a ok\nb REJECTED\nfinal=0\noversold=0' },
          { input: '1\na 1 no\nb 1 no\n', expectedOutput: 'a ok\nb ok\nfinal=-1\noversold=1' },
          { input: '5\na 2 yes\n', expectedOutput: 'a ok\nfinal=3\noversold=0' },
          { input: '0\na 1 yes\n', expectedOutput: 'a REJECTED\nfinal=0\noversold=0' },
          { input: '2\na 2 no\nb 2 no\nc 1 yes\n', expectedOutput: 'a ok\nb ok\nc REJECTED\nfinal=-2\noversold=1', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('With every request guarded, oversold would be:',
        [['Zero, whatever the quantities, because each write checks the truth', true],
          ['Zero only when the quantities are all one', false],
          ['Unchanged, since guarding affects the order and not the correctness', false],
          ['Lower, but not necessarily zero', false]],
        'The guard is what makes the decision and the write one step.'),
      mcq('The mechanism for a unique booking is:',
        [['A unique constraint, which refuses the second insert outright', true],
          ['A conditional update on the current value', false],
          ['An atomic increment on a counter', false],
          ['A transaction running at the highest isolation level', false]],
        'Stock suits a conditional update; uniqueness suits a constraint.'),
      mcq('Repeating the race twenty times matters because:',
        [['A race that fires sometimes is still a race, and once may not show it', true],
          ['Twenty is the accepted minimum for a meaningful measurement', false],
          ['The database caches the first result', false],
          ['It warms the connection pool first', false]],
        'Record how often it fired.'),
    ],
  },

  /* ══ T2_TRACK_FRONTEND ══════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T2_TRACK_FRONTEND_HARDER_FAULTS',
    notes: `**An interface that works for you, on your machine, with your data.** Everything the
user has that you do not is where it breaks.

## What you do not have

**Slow data.** Your API answers instantly from localhost. Theirs takes two seconds, so the
component renders before the data arrives — and if nothing handles that, it renders wrong rather
than empty.

**Long text.** Your test name is "Test User". Theirs is forty characters and breaks the layout.

**Empty lists.** You always have data. A first-time user has none, and a screen that does not say
so looks broken.

**Errors.** Your requests succeed. Theirs fail, and the interface shows a spinner forever.

**A keyboard.** You use a mouse. Somebody navigating by keyboard cannot reach your custom
control at all.

**A small screen.** And a browser zoomed to 150 percent, which is the same problem arriving
differently.

**And a slow device**, where the render you never noticed takes half a second.

## The faults these produce

**Four states collapsed into one.** Loading, empty, error and success all render the same markup,
so three of them are wrong. **The single most common frontend defect**, and the cheapest to fix.

**State that disagrees with itself.** Two places holding the same fact, updated separately.

**A stale closure.** A callback capturing a value from an earlier render, so it acts on data that
has moved.

**An effect with the wrong dependencies**, running too often or not enough.

**A key that is an index**, so reordering a list moves the wrong content.

**And a form that loses input** when something above it re-renders.

## Finding them

**Throttle the network and reload.** Every loading fault appears at once, and it takes two
clicks.

**Empty the data.** Every empty-state fault.

**Make the API fail.** Every error path.

**Type a forty-character name.** Every layout assumption.

**And navigate the whole screen with the keyboard**, which finds the accessibility faults and a
surprising number of ordinary ones.

## Repairing

**Render all four states explicitly**, every time, even when three are one line each.

**One source of truth per fact.**

**And test on a throttled connection by default**, because the fast path is the one that already
works.`,
    mcqs: [
      mcq('The single most common frontend defect is:',
        [['Loading, empty, error and success rendering the same markup', true],
          ['State held in two places and updated separately', false],
          ['A list keyed by index rather than identity', false],
          ['An effect with the wrong dependency list', false]],
        'Three of the four are then wrong.'),
      mcq('Throttling the network and reloading:',
        [['Surfaces every loading fault at once, and takes two clicks', true],
          ['Reveals which requests are made in parallel', false],
          ['Shows whether the cache is being used', false],
          ['Measures the real time to first render', false]],
        'Your API answers instantly from localhost.'),
      mcq('A key that is an index causes:',
        [['Reordering a list to move the wrong content', true],
          ['The whole list to re-render on any change', false],
          ['Duplicate keys when items are added', false],
          ['Items to lose their scroll position', false]],
        'Key by identity, not by position.'),
      mcq('Navigating the whole screen by keyboard finds:',
        [['The accessibility faults and a surprising number of ordinary ones', true],
          ['Only the faults affecting assistive technology', false],
          ['Focus styling problems specifically', false],
          ['Faults in custom controls but not standard ones', false]],
        'Somebody navigating by keyboard cannot reach your custom control at all.'),
    ],
    checkpoint: [
      mcq('A stale closure acts on:',
        [['A value captured from an earlier render, which has since moved', true],
          ['A value that was never initialised', false],
          ['The most recent value, arriving one render too late', false],
          ['A copy made when the component mounted', false]],
        'So the callback and the screen disagree.'),
      mcq('A screen with no data and no empty state:',
        [['Looks broken to a first-time user', true],
          ['Shows a loading indicator indefinitely', false],
          ['Renders nothing and is therefore harmless', false],
          ['Falls back to the error state automatically', false]],
        'You always have data; they do not.'),
      mcq('Testing on a throttled connection by default is right because:',
        [['The fast path is the one that already works', true],
          ['Most users are on slow connections', false],
          ['It makes render timing easier to measure', false],
          ['Throttling also simulates a slow device', false]],
        'The default should be the harder case.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_FRONTEND_HARDER_PRACTICE',
    notes: `One exercise on the defect that costs the most and is cheapest to fix: a screen that
does not render all four of its states.`,
    coding: [
      {
        title: 'Which state should this screen be in',
        description: `Read one screen render per line as
\`<name> <request_done> <failed> <item_count>\`, where request_done and failed are \`yes\` or
\`no\` and item_count is an integer.

Print the state each render should show:

- request not done → \`<name> loading\`
- failed → \`<name> error\`
- zero items → \`<name> empty\`
- otherwise → \`<name> success\`

Then \`states=<the distinct states seen, in the order loading, error, empty, success, space
separated>\`, and \`UNTESTED <n>\` on the next line when fewer than four distinct states
appeared, where n is how many are missing.

**A screen you have only seen in one state is a screen with three untested renders.**`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# Four states. A screen seen in one has three untested renders.
`,
        language: 'python',
        tests: [
          { input: 'a no no 0\n', expectedOutput: 'a loading\nstates=loading\nUNTESTED 3' },
          { input: 'a yes yes 0\n', expectedOutput: 'a error\nstates=error\nUNTESTED 3' },
          { input: 'a yes no 0\nb yes no 5\n', expectedOutput: 'a empty\nb success\nstates=empty success\nUNTESTED 2' },
          { input: 'a no no 0\nb yes yes 0\nc yes no 0\nd yes no 9\n', expectedOutput: 'a loading\nb error\nc empty\nd success\nstates=loading error empty success' },
          { input: 'p yes no 3\nq no yes 7\n', expectedOutput: 'p success\nq loading\nstates=loading success\nUNTESTED 2', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Frontend Work — Past the Obvious Answer',
      description: 'Enumerate the four states, then force every one of them on a real screen.',
      instructions: `Complete the exercise, then:

1. In the hidden case a render is not done **and** failed, and the answer is \`loading\`. Say
   whether that precedence is right, and what the alternative would show a user.
2. Say what a fifth state might be, and whether it belongs in this list.
3. Say why the count of missing states is more useful than a list of the ones seen.

**Then, on a real screen** — one you have built, or one you can run.

4. **Force all four states and screenshot each.** Not describe — force.
5. For loading: throttle the network. Record what the screen showed before the data arrived.
6. For empty: remove the data. Record whether the screen explains itself.
7. For error: make the request fail. Record whether the user is told what failed and offered a
   retry.
8. For success: the normal case.
9. **Then type a forty-character name** into the longest field and record what the layout did.
10. Navigate the whole screen with the keyboard only. Record everything you could not reach.
11. Fix the worst two and say which they were.`,
      rubric: [
        { criterion: 'States derived correctly', description: 'All cases, with the precedence and the missing count.', maxPoints: 20 },
        { criterion: 'The precedence judged', description: 'Whether loading should win, and what the alternative shows.', maxPoints: 15 },
        { criterion: 'All four states forced and captured', description: 'Screenshots, not descriptions.', maxPoints: 25 },
        { criterion: 'Error state judged properly', description: 'Whether the user is told what failed and offered a retry.', maxPoints: 15 },
        { criterion: 'Long text and keyboard probed', description: 'Forty characters typed, whole screen navigated, findings recorded.', maxPoints: 15 },
        { criterion: 'Two fixed', description: 'The worst two named and repaired.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]
`,
        tests: [
          { input: 'a no no 0\n', expectedOutput: 'a loading\nstates=loading\nUNTESTED 3' },
          { input: 'a yes yes 0\n', expectedOutput: 'a error\nstates=error\nUNTESTED 3' },
          { input: 'a yes no 0\nb yes no 5\n', expectedOutput: 'a empty\nb success\nstates=empty success\nUNTESTED 2' },
          { input: 'a no no 0\nb yes yes 0\nc yes no 0\nd yes no 9\n', expectedOutput: 'a loading\nb error\nc empty\nd success\nstates=loading error empty success' },
          { input: 'p yes no 3\nq no yes 7\n', expectedOutput: 'p success\nq loading\nstates=loading success\nUNTESTED 2', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('A render that is both not done and failed shows loading because:',
        [['The request is still in flight, so the failure belongs to an earlier attempt', true],
          ['Loading is the safer default for an ambiguous state', false],
          ['An error simply cannot be known before the request has completed', false],
          ['Showing both would confuse the user', false]],
        'The precedence encodes which fact is current.'),
      mcq('The count of missing states is more useful than the list seen because:',
        [['It names the work remaining rather than the work done', true],
          ['It is shorter to report in a summary', false],
          ['The states seen are obvious from the renders', false],
          ['It avoids listing states that do not apply', false]],
        'Three untested renders is the finding.'),
      mcq('Forcing a state rather than describing it matters because:',
        [['A described state is a claim and a forced one is evidence', true],
          ['Descriptions omit the visual details', false],
          ['Forcing is faster than writing it up', false],
          ['Some of the states cannot be described accurately at all', false]],
        'Screenshot each one, so the claim carries its own proof.'),
    ],
  },

  /* ══ T2_TRACK_DATA ══════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T2_TRACK_DATA_HARDER_FAULTS',
    notes: `**An analysis that runs, produces a number, and the number is wrong.** Nothing errors.
Somebody makes a decision on it.

## Where the wrong number comes from

**Rows dropped silently.** A join that lost the unmatched, a filter that also removed the nulls,
a parse that skipped the malformed. **The count is the check**: how many rows did you start with
and how many do you have now?

**A null treated as a zero.** An average over missing values is not an average, and it is lower
than the truth in a way that looks plausible.

**Duplicates counted twice.** From a join, from a re-run, from an append that was not idempotent.

**A date parsed in the wrong order.** The fifth of March and the third of May are the same nine
characters in different conventions, and the wrong reading fails only for days above twelve.

**A timezone shifting a day boundary**, so daily totals are wrong at the edges and right in the
middle.

**Numbers as text**, sorting so that 10 comes before 9.

**A unit mismatch.** Two sources in cents and pounds, added.

**And a sample mistaken for the population**, which is the one that produces a confident wrong
conclusion rather than a wrong number.

## The checks worth doing every time

**Count in, count out**, at every step. **A pipeline that does not report its row counts cannot
be trusted**, and adding them is one line per stage.

**Look at the extremes.** Sort by the value and read the top and bottom ten. Anything absurd is
a parsing or unit fault.

**Compare a total against something independent.** A known figure, another system, a hand count
of a subset.

**And plot it.** A distribution shows a duplicate spike, a truncation, an impossible value and a
missing week faster than any summary statistic.

## Before anybody acts on it

**Say what would make the conclusion wrong.** If you cannot name a way it could be wrong, you
have not checked it — you have produced it.

**And say what you excluded and why.** Every exclusion is a judgement, and the reader is entitled
to disagree with it.`,
    mcqs: [
      mcq('The check for silently dropped rows is:',
        [['Counting how many rows you started with and how many remain', true],
          ['Comparing the output against a previous run', false],
          ['Checking each join key for nulls', false],
          ['Validating the schema at every stage', false]],
        'One line per stage, and it catches most wrong numbers.'),
      mcq('A date parsed in the wrong order fails:',
        [['Only for days above twelve, so most of the data looks right', true],
          ['On every row, loudly and immediately', false],
          ['Only when the year is ambiguous as well', false],
          ['Only across a month boundary', false]],
        'The fifth of March and the third of May.'),
      mcq('Plotting the data finds:',
        [['A duplicate spike, a truncation and a missing week faster than any summary', true],
          ['Errors that statistics would also reveal, but sooner', false],
          ['Outliers that should be removed before analysis', false],
          ['Whether the distribution matches an expected shape', false]],
        'A distribution shows what a mean hides.'),
      mcq('If you cannot name a way the conclusion could be wrong:',
        [['You have produced it rather than checked it', true],
          ['The analysis is probably sound', false],
          ['You should seek a second reviewer', false],
          ['The data was too clean to need checking', false]],
        'Say what would make it wrong.'),
    ],
    checkpoint: [
      mcq('A null treated as zero makes an average:',
        [['Lower than the truth, in a way that looks plausible', true],
          ['Higher than the truth by the count of nulls', false],
          ['Undefined rather than wrong', false],
          ['Correct, since zero is a valid value', false]],
        'An average over missing values is not an average.'),
      mcq('A sample mistaken for the population produces:',
        [['A confident wrong conclusion rather than a wrong number', true],
          ['A number that is wrong by a known factor', false],
          ['An error that scales with the size of the sample', false],
          ['A result that cannot be reproduced', false]],
        'Which is why it is the worst of the list.'),
      mcq('Every exclusion should be stated because:',
        [['It is a judgement and the reader is entitled to disagree with it', true],
          ['It affects the row counts at each stage', false],
          ['Reviewers generally require a complete method section', false],
          ['It may be reversed in a later analysis', false]],
        'Say what you excluded and why.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_DATA_HARDER_PRACTICE',
    notes: `One exercise on the check that catches most wrong numbers: counting rows in and out
at every stage of a pipeline.`,
    coding: [
      {
        title: 'Where the rows went',
        description: `Read a starting row count on the first line, then one pipeline stage per
line as \`<name> <rows_out>\`.

Print per stage \`<name> <rows_out> (<change>)\`, where change is \`-n\` for rows lost, \`+n\`
for rows gained, or \`same\`.

Then:

    final=<rows>
    lost=<total rows lost across all stages>

and, on the next line, \`UNEXPLAINED <name>\` for the **first** stage that lost more than 10
percent of what went into it — because a large silent drop is the one worth finding before the
number is used.

Use integer arithmetic: a stage loses more than 10 percent when \`lost * 10 > rows_in\`.`,
        starter: `import sys

lines = [l for l in sys.stdin.read().split('\\n') if l.strip()]
rows = int(lines[0])

# Count in, count out, at every stage.
`,
        language: 'python',
        tests: [
          { input: '100\nclean 100\n', expectedOutput: 'clean 100 (same)\nfinal=100\nlost=0' },
          { input: '100\njoin 80\n', expectedOutput: 'join 80 (-20)\nfinal=80\nlost=20\nUNEXPLAINED join' },
          { input: '100\nclean 95\n', expectedOutput: 'clean 95 (-5)\nfinal=95\nlost=5' },
          { input: '100\nexplode 300\n', expectedOutput: 'explode 300 (+200)\nfinal=300\nlost=0' },
          { input: '200\na 190\nb 100\nc 100\n', expectedOutput: 'a 190 (-10)\nb 100 (-90)\nc 100 (same)\nfinal=100\nlost=100\nUNEXPLAINED b', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Data Analysis — Past the Obvious Answer',
      description: 'Account for every row, then produce a number somebody could act on.',
      instructions: `Complete the exercise, then:

1. A stage that gains rows contributes nothing to \`lost\`. Say whether gained rows are also
   worth flagging, and when.
2. Only the first large drop is reported. Say why, and what you would want in a real pipeline.
3. Say what a 10 percent threshold misses, and what you would use instead.

**Then, on real data** — any dataset of a few thousand rows you can obtain.

4. Build a pipeline of at least four stages: load, clean, join or group, output.
5. **Report the row count at every stage.** Record them all.
6. Account for every lost row. **"Probably duplicates" is not accounting for them** — say which
   rows and why.
7. Sort by your main value and read the top and bottom ten. Record anything absurd.
8. Plot the distribution. Record what the plot shows that the mean did not.
9. Check every date column for the day-month ambiguity. Say how you checked.
10. Compare your headline number against something independent. Record both.
11. **Write the sentence saying what would make your conclusion wrong**, and the list of what
    you excluded.`,
      rubric: [
        { criterion: 'Row accounting correct', description: 'All cases, with gains, losses and the first large drop.', maxPoints: 20 },
        { criterion: 'The threshold examined', description: 'What 10 percent misses, and what you would use.', maxPoints: 15 },
        { criterion: 'A four-stage pipeline with counts', description: 'Every stage reporting, all counts recorded.', maxPoints: 20 },
        { criterion: 'Every lost row accounted for', description: 'Specifically, not by guess.', maxPoints: 20 },
        { criterion: 'Extremes, plot and dates checked', description: 'Top and bottom read, distribution plotted, ambiguity tested.', maxPoints: 15 },
        { criterion: 'An independent comparison and a caveat', description: 'Two numbers set against each other, with what would make it wrong.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

lines = [l for l in sys.stdin.read().split('\\n') if l.strip()]
rows = int(lines[0])
`,
        tests: [
          { input: '100\nclean 100\n', expectedOutput: 'clean 100 (same)\nfinal=100\nlost=0' },
          { input: '100\njoin 80\n', expectedOutput: 'join 80 (-20)\nfinal=80\nlost=20\nUNEXPLAINED join' },
          { input: '100\nclean 95\n', expectedOutput: 'clean 95 (-5)\nfinal=95\nlost=5' },
          { input: '100\nexplode 300\n', expectedOutput: 'explode 300 (+200)\nfinal=300\nlost=0' },
          { input: '200\na 190\nb 100\nc 100\n', expectedOutput: 'a 190 (-10)\nb 100 (-90)\nc 100 (same)\nfinal=100\nlost=100\nUNEXPLAINED b', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('Rows gained are worth flagging when:',
        [['A join was expected to match one-to-one and multiplied instead', true],
          ['The pipeline appends from a second source', false],
          ['A stage deliberately explodes a list column into rows', false],
          ['The gain exceeds the original row count', false]],
        'The same multiplying join the SQL unit describes.'),
      mcq('"Probably duplicates" as an explanation for lost rows is:',
        [['Not accounting for them, because it names no rows', true],
          ['Adequate when the count is small', false],
          ['Reasonable if a deduplication step ran', false],
          ['Acceptable provided the total is reported', false]],
        'Say which rows were lost and why each of them went.'),
      mcq('Reporting only the first large drop is:',
        [['A simplification, since a real pipeline should flag every one', true],
          ['Correct, because the later drops all follow from the first', false],
          ['Right, since the first is always the largest', false],
          ['Necessary to keep the output readable', false]],
        'Say what you would want instead.'),
    ],
  },

  /* ══ T2_TRACK_AI ════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T2_TRACK_AI_HARDER_FAULTS',
    notes: `**A model with good accuracy that does not work.** The number is high, the code runs,
and the thing is useless or worse.

## The faults that inflate a score

**Leakage.** A feature that would not exist at prediction time — an outcome field, a value
derived from the label, an identifier that correlates with it. **The model has seen the answer**,
and the score is a measurement of that rather than of anything useful.

**Test data in the training set.** From a duplicate row, from an overlapping split, from
preprocessing fitted on everything before splitting. **Scaling before splitting is the quiet
version**, and it is extremely common.

**A split that respects no grouping.** The same customer in train and test, so the model
memorises the customer.

**A time series split at random**, so the model trains on the future to predict the past.

**And an imbalanced dataset with accuracy as the metric.** Ninety-nine percent accuracy on a one
percent problem is achieved by predicting "no" every time, and it is not a model.

## The faults that hide a real problem

**No baseline.** Without one, a score means nothing — **the first thing to compute is what
guessing gets you**, because a model that does not beat it is a model with no value whatever its
accuracy.

**One metric.** Accuracy alone hides which errors it makes, and the two kinds of error usually
have different costs.

**Evaluation on the training distribution** when deployment sees another.

**And a threshold left at its default**, chosen by nobody, deciding the balance between the two
error types.

## Finding them

**Ask of every feature: would I have this at prediction time?** One question per column, and it
finds leakage.

**Compute the baseline first.** Always predict the majority; predict the previous value. That
number is what you must beat.

**Look at the errors themselves.** Twenty misclassified examples tell you more than any
aggregate.

**And check the split.** Group by whatever should not straddle it, and count.

## Before it is used

**Say what it does when it is wrong**, and who that affects.

**Say what it was trained on**, and what it will meet.

**And say what it should not be used for**, which is the part that gets left out and the part
that matters when somebody applies it to a population it never saw.`,
    mcqs: [
      mcq('Leakage means the score measures:',
        [['That the model has seen the answer, rather than anything useful', true],
          ['Overfitting to the training distribution', false],
          ['Noise in the labelling process', false],
          ['A feature that is unavailable in production', false]],
        'One question per column: would I have this at prediction time?'),
      mcq('The quiet version of test data in the training set is:',
        [['Scaling fitted on everything before the split', true],
          ['Duplicate rows across the two sets', false],
          ['An overlapping random split', false],
          ['The same customer appearing in both', false]],
        'Extremely common, and invisible in the score.'),
      mcq('The first thing to compute is:',
        [['What guessing gets you, because a model that does not beat it has no value', true],
          ['The accuracy on a held-out set', false],
          ['The distribution of the target variable', false],
          ['The correlation between features and label', false]],
        'Without a baseline a score means nothing.'),
      mcq('Ninety-nine percent accuracy on a one percent problem:',
        [['Is achieved by predicting no every time, and is not a model', true],
          ['Indicates the model has learned the minority class', false],
          ['Is good provided the recall is also measured', false],
          ['Suggests the classes need rebalancing', false]],
        'Accuracy is the wrong metric for an imbalanced problem.'),
    ],
    checkpoint: [
      mcq('A time series split at random means the model:',
        [['Trains on the future to predict the past', true],
          ['Sees each period an equal number of times', false],
          ['Loses the ordering information in the features', false],
          ['Cannot learn seasonal patterns', false]],
        'Split by time, not at random.'),
      mcq('Looking at twenty misclassified examples:',
        [['Tells you more than any aggregate metric', true],
          ['Confirms the error rate is correctly computed', false],
          ['Identifies which features to remove', false],
          ['Is only useful when the classes are balanced', false]],
        'Look at the errors themselves.'),
      mcq('The part most often left out before a model is used is:',
        [['What it should not be used for', true],
          ['What it does when it is wrong', false],
          ['What data it was trained on', false],
          ['Which metric was optimised', false]],
        'And it is what matters when somebody applies it elsewhere.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_AI_HARDER_PRACTICE',
    notes: `One exercise on the number that decides whether a model is worth anything: the
baseline it has to beat.`,
    coding: [
      {
        title: 'Does it beat guessing',
        description: `Read a line of true labels and a line of predicted labels, both
space-separated, of equal length.

Print:

    accuracy=<correct>/<total>
    baseline=<count of the most common true label>/<total>
    verdict=<beats|ties|WORSE_THAN_GUESSING>

The baseline is always predicting whichever true label is most common. The verdict compares the
model's correct count against the baseline's.

With no labels at all, print \`accuracy=0/0\`, \`baseline=0/0\` and \`verdict=ties\`.

**A model that ties the baseline has demonstrated nothing**, whatever its accuracy looks like.`,
        starter: `import sys

lines = sys.stdin.read().split('\\n')
truth = lines[0].split() if lines and lines[0].strip() else []
pred = lines[1].split() if len(lines) > 1 and lines[1].strip() else []

# The baseline is predicting the most common label every time.
`,
        language: 'python',
        tests: [
          { input: 'a a a b\na a a b\n', expectedOutput: 'accuracy=4/4\nbaseline=3/4\nverdict=beats' },
          { input: 'a a a b\na a a a\n', expectedOutput: 'accuracy=3/4\nbaseline=3/4\nverdict=ties' },
          { input: 'a a a b\nb b b b\n', expectedOutput: 'accuracy=1/4\nbaseline=3/4\nverdict=WORSE_THAN_GUESSING' },
          { input: '\n\n', expectedOutput: 'accuracy=0/0\nbaseline=0/0\nverdict=ties' },
          { input: 'x y x x y x\nx x x x x x\n', expectedOutput: 'accuracy=4/6\nbaseline=4/6\nverdict=ties', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Machine Learning — Past the Obvious Answer',
      description: 'Compute the baseline, then audit a model for leakage and a bad split.',
      instructions: `Complete the exercise, then:

1. The last case has 67 percent accuracy and ties the baseline. Say what that model has
   demonstrated, and what you would report about it.
2. Say what the baseline should be for a regression problem rather than a classification one.
3. Say why accuracy is reported as a fraction here rather than a percentage.

**Then, on a real model** — one you train, on any dataset.

4. **Compute the baseline before you train anything.** Record it.
5. Train a model. Record its score against the baseline.
6. **Go through every feature and ask whether it would exist at prediction time.** Record the
   answer for each. Remove any that would not, and record the new score.
7. Check the split: is any group — a customer, a device, a date — present on both sides? Count
   them.
8. If you scaled or encoded anything, check whether it was fitted before or after the split.
   Record which, and fix it if it was before.
9. Report a second metric alongside accuracy, and say which errors it exposes.
10. **Look at twenty misclassified examples.** Write down what you notice.
11. Write the three sentences: what it does when wrong, what it was trained on, and what it
    should not be used for.`,
      rubric: [
        { criterion: 'Baseline and verdict correct', description: 'All cases, including empty input and the tie.', maxPoints: 20 },
        { criterion: 'The tie interpreted', description: 'What a tying model has demonstrated, and the regression baseline.', maxPoints: 15 },
        { criterion: 'Baseline computed before training', description: 'Recorded first, with the model score set against it.', maxPoints: 15 },
        { criterion: 'Every feature audited for leakage', description: 'One answer per column, removals made, new score recorded.', maxPoints: 25 },
        { criterion: 'Split and preprocessing checked', description: 'Group overlap counted, fit-before-split found and fixed.', maxPoints: 15 },
        { criterion: 'Errors read and limits written', description: 'Twenty examples examined, three sentences written.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

lines = sys.stdin.read().split('\\n')
truth = lines[0].split() if lines and lines[0].strip() else []
pred = lines[1].split() if len(lines) > 1 and lines[1].strip() else []
`,
        tests: [
          { input: 'a a a b\na a a b\n', expectedOutput: 'accuracy=4/4\nbaseline=3/4\nverdict=beats' },
          { input: 'a a a b\na a a a\n', expectedOutput: 'accuracy=3/4\nbaseline=3/4\nverdict=ties' },
          { input: 'a a a b\nb b b b\n', expectedOutput: 'accuracy=1/4\nbaseline=3/4\nverdict=WORSE_THAN_GUESSING' },
          { input: '\n\n', expectedOutput: 'accuracy=0/0\nbaseline=0/0\nverdict=ties' },
          { input: 'x y x x y x\nx x x x x x\n', expectedOutput: 'accuracy=4/6\nbaseline=4/6\nverdict=ties', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('A model tying the baseline at 67 percent has demonstrated:',
        [['Nothing, because predicting the majority achieves the same', true],
          ['Moderate skill that would need more training data', false],
          ['That the problem is harder than expected', false],
          ['That the features carry some signal', false]],
        'Whatever its accuracy looks like.'),
      mcq('The baseline for a regression problem is usually:',
        [['Predicting the mean, or the previous value for a series', true],
          ['Predicting zero for every input', false],
          ['A linear model with one feature', false],
          ['The median of the training targets, and nothing else', false]],
        'Whatever guessing looks like for that shape.'),
      mcq('Accuracy is reported as a fraction because:',
        [['The denominator shows how much the number rests on', true],
          ['Percentages round away small differences', false],
          ['Fractions are easier to compare between models', false],
          ['It avoids implying more precision than exists', false]],
        'Four out of six is a different claim from sixty-seven percent.'),
    ],
  },

  /* ══ T2_TRACK_MOBILE ════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T2_TRACK_MOBILE_HARDER_FAULTS',
    notes: `**An app that works while you are holding it.** The faults arrive when the operating
system does something you did not ask for.

## What the system does without asking

**Kills your process** to reclaim memory, then restores the screen as though nothing happened.
Anything held only in memory is gone — and the user does not know a thing went wrong, only that
your app forgot what they typed.

**Rotates the device**, which on some platforms recreates the screen with the same consequences
and a much shorter timescale.

**Interrupts you.** A call, a notification, the app switcher.

**Revokes a permission** while the app is running, which almost nobody tests and which crashes a
lot of apps.

**Changes the network** mid-request, from one connection to another.

**And stops background work** under an aggressive battery policy that differs by manufacturer.

## The faults these produce

**State lost on restore.** The screen comes back empty, reset, or showing the wrong thing.

**A request that outlives its screen**, updating a view that no longer exists.

**A leak.** Screens retained in the stack, listeners registered on every creation and never
removed. **A screen instance count that only goes up is the single most diagnostic observation
in mobile performance work.**

**An object passed between screens** that is not there after a process kill, where an identifier
would have been.

**And work on the main thread** — parsing, decoding, a database read — which drops frames the
user sees as the app being bad.

## Finding them

**Turn on the developer setting that kills backgrounded processes and leave it on.** Everything
fragile surfaces within an hour of ordinary use, and it costs nothing.

**Rotate every screen**, which is the cheap version of the same test.

**Watch the screen instance count** while navigating back and forth.

**Revoke a permission** mid-session, deliberately.

**And test on the cheapest device you support**, which finds more than the newest one.

## Repairing

**Save on every meaningful change**, debounced, and on backgrounding — not on a save button and
not on termination, which you may never be told about.

**Restore from an identifier and reload**, showing saved state immediately.

**Cancel work with the screen that started it.**

**And keep the main thread for drawing.**`,
    mcqs: [
      mcq('When the system kills your process the user:',
        [['Does not know anything went wrong, only that the app forgot what they typed', true],
          ['Sees a crash dialog from the operating system', false],
          ['Is returned to the home screen', false],
          ['Notices the app restarting from the beginning', false]],
        'The screen is restored as though nothing happened.'),
      mcq('The single most diagnostic observation in mobile performance work is:',
        [['A screen instance count that only goes up', true],
          ['A frame time above the budget under scroll', false],
          ['Memory growing steadily during a session', false],
          ['Battery drain measured over several hours', false]],
        'Watch it while navigating back and forth.'),
      mcq('Passing an object rather than an identifier between screens fails because:',
        [['The object is not there after a process kill, and an identifier would have been', true],
          ['Objects cannot be serialised across a screen boundary', false],
          ['The receiving screen may mutate it unexpectedly', false],
          ['It keeps the previous screen alive in memory', false]],
        'Restore from the identifier and reload.'),
      mcq('The setting that kills backgrounded processes:',
        [['Surfaces everything fragile within an hour, and costs nothing', true],
          ['Should be enabled only for a final test pass', false],
          ['Simulates a condition that is rare in practice', false],
          ['Makes ordinary development noticeably slower', false]],
        'Turn it on and leave it on.'),
    ],
    checkpoint: [
      mcq('State should be saved:',
        [['On every meaningful change, debounced, and on backgrounding', true],
          ['When the user presses save, and on termination', false],
          ['On termination, which is the last chance', false],
          ['At a fixed interval for as long as the screen is visible', false]],
        'You may never be told about termination.'),
      mcq('A permission revoked mid-session is:',
        [['Almost never tested, and it crashes a lot of apps', true],
          ['Handled by the platform permission framework', false],
          ['Impossible without restarting the app', false],
          ['Only relevant to location and camera', false]],
        'Revoke one deliberately and watch what the app does.'),
      mcq('Work on the main thread shows up to the user as:',
        [['Dropped frames, which read as the app being bad', true],
          ['A delay before the screen appears', false],
          ['Increased battery consumption', false],
          ['An unresponsive-application warning from the system', false]],
        'Keep the main thread for drawing.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_MOBILE_HARDER_PRACTICE',
    notes: `One exercise on the fault that defines mobile work: deciding what has to survive the
operating system deciding to end your process.`,
    coding: [
      {
        title: 'What survives the kill',
        description: `Read one piece of state per line as \`<name> <kind> <saved_to>\`, where
kind is \`ephemeral\`, \`entered\` or \`fetched\`, and saved_to is \`memory\`, \`disk\` or
\`server\`.

After a process kill, print per line:

- saved to \`disk\` or \`server\` → \`<name> survives\`
- in memory and \`ephemeral\` → \`<name> acceptable\`
- in memory and \`fetched\` → \`<name> refetch\`
- in memory and \`entered\` → \`<name> LOST\`

Then \`lost=<n>\`, counting only the \`LOST\` lines.

**Only user-entered data in memory is a defect.** Ephemeral loss is fine and fetched data can be
asked for again; what cannot be recovered is what the user typed and nobody stored.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# What the user typed and nobody stored is the only real loss.
`,
        language: 'python',
        tests: [
          { input: 'draft entered memory\n', expectedOutput: 'draft LOST\nlost=1' },
          { input: 'scroll ephemeral memory\n', expectedOutput: 'scroll acceptable\nlost=0' },
          { input: 'feed fetched memory\n', expectedOutput: 'feed refetch\nlost=0' },
          { input: 'form entered disk\n', expectedOutput: 'form survives\nlost=0' },
          { input: 'a entered memory\nb entered server\nc ephemeral disk\nd fetched memory\n', expectedOutput: 'a LOST\nb survives\nc survives\nd refetch\nlost=1', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Mobile Work — Past the Obvious Answer',
      description: 'Classify what survives, then prove it on a device.',
      instructions: `Complete the exercise, then:

1. Ephemeral state in memory is \`acceptable\` rather than \`survives\`. Say what the difference
   means for a user, and give a case where ephemeral loss is not acceptable.
2. \`refetch\` assumes the network is available. Say what happens when it is not, and what that
   means for the classification.
3. Say what \`saved_to: disk\` does **not** guarantee.

**Then, on a real device** — not a simulator.

4. Build or take an app with at least three screens and one editable field.
5. **Turn on the setting that kills backgrounded processes.** Leave it on for everything below.
6. List every piece of state on each screen and classify it with the four categories.
7. For each one you classified as surviving, **prove it**: background the app, open several
   others, come back, and record what was actually there.
8. Type into the editable field, background without saving, and come back. Record the result.
9. Rotate every screen and record what disappeared.
10. Navigate back and forth twenty times and watch the screen instance count. Record whether it
    returns to where it started.
11. Revoke a permission mid-session and record what happened.
12. Fix the worst thing you found and re-run the check that caught it.`,
      rubric: [
        { criterion: 'Survival classified', description: 'All cases, with only entered-in-memory counted as lost.', maxPoints: 20 },
        { criterion: 'The categories interrogated', description: 'Acceptable versus survives, refetch without a network, what disk does not guarantee.', maxPoints: 15 },
        { criterion: 'State inventoried per screen', description: 'Every piece classified across at least three screens.', maxPoints: 15 },
        { criterion: 'Survival proved, not assumed', description: 'Backgrounded with the kill setting on, results recorded.', maxPoints: 25 },
        { criterion: 'Rotation, leaks and permissions', description: 'Every screen rotated, instance count watched, a permission revoked.', maxPoints: 15 },
        { criterion: 'One fault fixed and re-checked', description: 'The worst thing found, repaired, and the check re-run.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]
`,
        tests: [
          { input: 'draft entered memory\n', expectedOutput: 'draft LOST\nlost=1' },
          { input: 'scroll ephemeral memory\n', expectedOutput: 'scroll acceptable\nlost=0' },
          { input: 'feed fetched memory\n', expectedOutput: 'feed refetch\nlost=0' },
          { input: 'form entered disk\n', expectedOutput: 'form survives\nlost=0' },
          { input: 'a entered memory\nb entered server\nc ephemeral disk\nd fetched memory\n', expectedOutput: 'a LOST\nb survives\nc survives\nd refetch\nlost=1', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('Ephemeral loss is not acceptable when:',
        [['The user would have to redo work to get back to where they were', true],
          ['It affects more than one screen at a time', false],
          ['The state was expensive to compute', false],
          ['It happens on every single rotation rather than rarely', false]],
        'Then it was not really ephemeral.'),
      mcq('Refetch without a network means the state:',
        [['Is lost in practice, so the classification was optimistic', true],
          ['Falls back to whatever was last displayed', false],
          ['Is retried automatically until it eventually succeeds', false],
          ['Should have been classified as ephemeral', false]],
        'Which is why offline changes the answer.'),
      mcq('Saving to disk does not guarantee:',
        [['That the write completed before the process ended', true],
          ['That the data survives a reinstall', false],
          ['That the data is readable by the next version', false],
          ['That the write was atomic', false]],
        'A save begun is not a save finished.'),
    ],
  },

  /* ══ T2_TRACK_CLOUD ═════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T2_TRACK_CLOUD_HARDER_FAULTS',
    notes: `**A deployment that succeeded and a service that is not working.** The pipeline is
green. Something else is wrong.

## The faults

**A health check that only proves the process started.** It returns 200 from a handler that
touches nothing, so an instance with no database connection is reported healthy and put into
rotation.

**Configuration that differs between environments** in a way nobody wrote down. It works in
staging because of a value staging has.

**A secret in an environment variable that is logged.** Printed at startup by a framework that
dumps its configuration.

**Permissions copied from something that worked.** Broader than needed, and nobody can now say
what is actually required.

**A rollback that was never rehearsed.** The command exists; nobody has run it, so nobody knows
it takes forty minutes.

**A migration that ran on application start**, with several instances racing it.

**An instance that works until it is replaced**, because something was written to its local disk.

**And an alert nobody receives**, configured against a channel that was renamed.

## What makes these different from ordinary bugs

**They are invisible until the moment they matter**, and that moment is usually an incident.
Everything above is fine on a good day.

**Which means the only way to find them is to cause the condition deliberately** — and that is
the whole method of this unit.

## Causing the condition

**Stop the database and see whether the health check notices.** If it still returns healthy,
that is the finding.

**Kill an instance** and see whether anything was lost.

**Run the rollback**, in staging, with a timer.

**Deploy the same version twice** and confirm nothing breaks.

**Remove a permission** and find out what stops working — which is how you learn what was
actually needed.

**And check that the alert reaches a person**, by firing it.

## Repairing

**Make the health check touch what the service needs**, and separate readiness from liveness.

**Make configuration identical except for values**, and list the values.

**Run migrations as their own step.**

**Keep nothing on local disk.**

**And rehearse the rollback until the time is known**, because a procedure nobody has performed
is not a capability.`,
    mcqs: [
      mcq('A health check that touches nothing:',
        [['Reports an instance with no database connection as healthy and puts it in rotation', true],
          ['Responds faster than one that checks dependencies', false],
          ['Is correct for liveness but not for readiness', false],
          ['Fails only when the process itself has crashed', false]],
        'Make it touch what the service needs.'),
      mcq('These faults are different from ordinary bugs because:',
        [['They are invisible until the moment they matter, which is usually an incident', true],
          ['They occur only in production environments', false],
          ['They cannot be reproduced in a test', false],
          ['They are caused by configuration rather than code', false]],
        'Everything in the list is fine on a good day.'),
      mcq('The only way to find them is:',
        [['To cause the condition deliberately', true],
          ['To review the deployment configuration carefully', false],
          ['To monitor the service over a long period', false],
          ['To compare environments against a checklist', false]],
        'Which is the whole method of this unit.'),
      mcq('Removing a permission to see what stops working:',
        [['Is how you learn what was actually needed', true],
          ['Is too disruptive to do outside an incident', false],
          ['Only works when permissions are granular', false],
          ['Should be done in production to be realistic', false]],
        'Permissions copied from something that worked are broader than needed.'),
    ],
    checkpoint: [
      mcq('A rollback nobody has run:',
        [['Is a procedure rather than a capability, and its duration is unknown', true],
          ['Is safe provided the command is documented', false],
          ['Works as long as the previous artefact exists', false],
          ['Should be tested for the first time during the next real incident', false]],
        'Rehearse it until the time is known.'),
      mcq('An instance that works until it is replaced indicates:',
        [['Something was written to its local disk', true],
          ['The image was built from a stale base', false],
          ['The health check is checking the wrong thing', false],
          ['Configuration was applied after startup', false]],
        'Keep nothing on local disk.'),
      mcq('Deploying the same version twice tests:',
        [['Whether the deployment is safe to repeat', true],
          ['Whether the artefact is reproducible', false],
          ['Whether the rollback would work', false],
          ['Whether the health check is stable', false]],
        'A deploy that is not idempotent fails on a retry.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_CLOUD_HARDER_PRACTICE',
    notes: `One exercise on the check that decides whether a deployment is really healthy: what
the health endpoint actually proves.`,
    coding: [
      {
        title: 'What does this health check prove',
        description: `Read one health endpoint per line as
\`<name> <touches_db> <touches_deps> <separate_readiness>\`, each \`yes\` or \`no\`.

Print per line:

- touches neither → \`<name> PROVES_NOTHING\`
- touches the database only → \`<name> partial\`
- touches both but readiness is not separate → \`<name> NO_READINESS\`
- touches both with readiness separate → \`<name> sound\`

Then \`sound=<n>\`.

**\`PROVES_NOTHING\` is the dangerous one**: it returns healthy from a process that has started
and can do nothing, which is worse than no health check because the platform trusts it and sends
traffic.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# A check that proves nothing is worse than none: the platform trusts it.
`,
        language: 'python',
        tests: [
          { input: 'a yes yes yes\n', expectedOutput: 'a sound\nsound=1' },
          { input: 'a no no no\n', expectedOutput: 'a PROVES_NOTHING\nsound=0' },
          { input: 'a yes no no\n', expectedOutput: 'a partial\nsound=0' },
          { input: 'a yes yes no\n', expectedOutput: 'a NO_READINESS\nsound=0' },
          { input: 'p no yes yes\nq yes yes yes\n', expectedOutput: 'p PROVES_NOTHING\nq sound\nsound=1', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Cloud Work — Past the Obvious Answer',
      description: 'Judge a health check, then cause every condition deliberately.',
      instructions: `Complete the exercise, then:

1. In the hidden case an endpoint touches dependencies but not the database and counts as
   \`PROVES_NOTHING\`. Say whether that is right.
2. Say why a check that proves nothing is worse than having no check at all.
3. Say what readiness should mean that liveness does not, in one sentence each.

**Then, on something deployed** — a small service you deploy for this is enough.

4. Deploy it. Record how long from commit to running.
5. **Stop the database and call the health endpoint.** Record what it said. Fix it if it lied.
6. Separate readiness from liveness. Say what each now checks.
7. **Kill an instance mid-request.** Record what the user saw and whether anything was lost.
8. **Run the rollback and time it.** Record the number.
9. Deploy the same version twice. Record whether anything broke.
10. Remove one permission and record what stopped working. Put it back.
11. Fire an alert and confirm a person receives it. Record who and how long it took.
12. Write down the one condition you did not manage to cause, and why.`,
      rubric: [
        { criterion: 'Health checks classified', description: 'All cases, with the dangerous one identified.', maxPoints: 20 },
        { criterion: 'Readiness and liveness distinguished', description: 'One sentence each, and why a hollow check is worse than none.', maxPoints: 15 },
        { criterion: 'The database stopped and the check tested', description: 'What it reported, and the fix if it lied.', maxPoints: 20 },
        { criterion: 'An instance killed mid-request', description: 'What the user saw and whether anything was lost.', maxPoints: 15 },
        { criterion: 'Rollback run and timed', description: 'An actual number, from an actual run.', maxPoints: 20 },
        { criterion: 'Permissions and alerting probed', description: 'One permission removed, one alert fired and received.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]
`,
        tests: [
          { input: 'a yes yes yes\n', expectedOutput: 'a sound\nsound=1' },
          { input: 'a no no no\n', expectedOutput: 'a PROVES_NOTHING\nsound=0' },
          { input: 'a yes no no\n', expectedOutput: 'a partial\nsound=0' },
          { input: 'a yes yes no\n', expectedOutput: 'a NO_READINESS\nsound=0' },
          { input: 'p no yes yes\nq yes yes yes\n', expectedOutput: 'p PROVES_NOTHING\nq sound\nsound=1', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('An endpoint touching dependencies but not the database counts as proving nothing because:',
        [['The database is the dependency the service cannot work without', true],
          ['Dependency checks are unreliable in general', false],
          ['Two checks are needed before either counts', false],
          ['The classification simply treats the database as mandatory', false]],
        'A service that cannot reach its data is not healthy.'),
      mcq('A hollow health check is worse than none because:',
        [['The platform trusts it and sends traffic to an instance that cannot serve', true],
          ['It adds latency to every check', false],
          ['It gives the operators a false sense of the coverage they have', false],
          ['It cannot be distinguished from a real one', false]],
        'No check at all would leave the platform cautious.'),
      mcq('Readiness differs from liveness in that readiness asks:',
        [['Whether this instance can serve traffic right now', true],
          ['Whether the process is still running at all', false],
          ['Whether the deployment finished successfully', false],
          ['Whether dependencies are within their latency budget', false]],
        'Liveness asks whether to restart it; readiness asks whether to route to it.'),
    ],
  },

  /* ══ T2_TRACK_SECURITY ══════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T2_TRACK_SECURITY_HARDER_FAULTS',
    notes: `**A finding that is real, correct, and changes nothing.** The security work was done.
The system is no safer.

## Why findings die

**No evidence.** The report asserts a problem and the team cannot reproduce it, so it is
deprioritised behind things that are demonstrated.

**No impact.** "Could lead to data exposure" describes a category. **"Any logged-in user can read
any other user's orders, including their addresses" describes a consequence**, and only one of
those gets scheduled.

**No fix.** "Implement proper access control" is a restatement of the finding. "Scope the query
to the caller in this named method" is work somebody can do.

**No effort estimate**, so it cannot be planned against anything else.

**Everything marked critical**, so nobody can tell where to start, and the report is not believed
either.

**Delivered as a document** rather than as tickets, so it is filed.

**Written as a gotcha**, so it is argued with rather than fixed.

**And no follow-up**, so the team learns that the exercise changes nothing.

## The failures on the finding side

**A scanner's output reported unfiltered.** Forty findings where three are real, and the team
finds the false positives before you do.

**A theoretical issue reported as confirmed.**

**And a finding you cannot defend**, withdrawn late and expensively — **defending one you cannot
support costs more credibility than the finding was worth.**

## What actually works

**Capture everything as you go.** Request, response, timestamp, account. It costs nothing at the
time and everything afterwards.

**Three findings at the top**, in full, with impact and effort.

**One ticket per finding**, in their tracker, with a file and a change.

**Offer the fix.** For anything small, a change is worth more than a paragraph.

**Name one thing that is good**, which costs a line and changes how the rest lands.

**And follow up.** **How many of your findings became merged changes within a quarter is the only
number that says whether the work was worth doing**, and nobody will produce it unless you do.`,
    mcqs: [
      mcq('The difference between a category and a consequence is:',
        [['"Could lead to data exposure" against "any user can read any other user’s orders"', true],
          ['Whether the finding names the affected endpoint', false],
          ['Whether a severity rating has been assigned', false],
          ['Whether the impact is quantified in records', false]],
        'Only one of those gets scheduled.'),
      mcq('"Implement proper access control" as a fix is:',
        [['A restatement of the finding rather than work somebody can do', true],
          ['Adequate guidance for an experienced team', false],
          ['Appropriate when the design is the problem', false],
          ['Better than prescribing a specific change', false]],
        '"Scope the query to the caller in this named method."'),
      mcq('Marking everything critical means:',
        [['Nobody can tell where to start, and the report is not believed', true],
          ['The most serious items get attention first', false],
          ['The team escalates the work appropriately', false],
          ['Severity stops being a useful filter only for large reports', false]],
        'Be willing to mark something low.'),
      mcq('The number that shows a security report was worth writing is:',
        [['How many findings became merged changes within a quarter', true],
          ['How many findings were confirmed by the team', false],
          ['How many were rated high or critical', false],
          ['How much of the system was covered', false]],
        'And nobody will produce it unless you do.'),
    ],
    checkpoint: [
      mcq('Standing behind a finding you have no evidence for:',
        [['Costs more credibility than the finding was worth', true],
          ['Is appropriate until the team demonstrates a control', false],
          ['Shows confidence in the assessment method', false],
          ['Is reasonable when the evidence was lost', false]],
        'Withdraw quickly instead.'),
      mcq('Naming one thing that is good:',
        [['Costs a line and changes how the rest of the report lands', true],
          ['Softens findings the team may dispute', false],
          ['Is expected in a professional report', false],
          ['Balances the tone of the report for a non-technical reader', false]],
        'A report that is only negative is read defensively.'),
      mcq('A report delivered as a document rather than tickets:',
        [['Is filed, and the findings are rediscovered later', true],
          ['Reaches a wider audience within the team', false],
          ['Is easier for a manager to prioritise', false],
          ['Keeps the findings together for context', false]],
        'One ticket per finding, in their tracker.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_SECURITY_HARDER_PRACTICE',
    notes: `One exercise on the thing that separates a security report that works from one that
is filed: whether each finding can be acted on.`,
    coding: [
      {
        title: 'Will this finding get fixed',
        description: `Read one finding per line as
\`<name> <has_evidence> <has_impact> <has_fix> <has_effort>\`, each \`yes\` or \`no\`.

Print, checking in this order:

- no evidence → \`<name> NOT_CREDIBLE\`
- no fix → \`<name> NOT_ACTIONABLE\`
- no impact → \`<name> WONT_BE_PRIORITISED\`
- no effort → \`<name> CANNOT_BE_PLANNED\`
- otherwise → \`<name> ready\`

Then \`ready=<n>\`.

**Evidence is first** because without it the finding may not be true, and the other three
describe something that might not exist. **Fix comes before impact** because a finding nobody
can act on is not scheduled however serious it sounds.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# Evidence first: the rest describes something that may not be real.
`,
        language: 'python',
        tests: [
          { input: 'a yes yes yes yes\n', expectedOutput: 'a ready\nready=1' },
          { input: 'a no yes yes yes\n', expectedOutput: 'a NOT_CREDIBLE\nready=0' },
          { input: 'a yes yes no yes\n', expectedOutput: 'a NOT_ACTIONABLE\nready=0' },
          { input: 'a yes no yes yes\n', expectedOutput: 'a WONT_BE_PRIORITISED\nready=0' },
          { input: 'p yes yes yes no\nq no no no no\n', expectedOutput: 'p CANNOT_BE_PLANNED\nq NOT_CREDIBLE\nready=0', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Security Work — Past the Obvious Answer',
      description: 'Judge whether findings are actionable, then write three that are.',
      instructions: `Complete the exercise, then:

1. Fix is checked before impact. Say why, and give a case where you would report a finding with
   no fix anyway.
2. Say what \`has_evidence\` should mean concretely for an access-control finding.
3. Say how you would mark a finding you suspect but cannot demonstrate.

**Then, on something you may lawfully test** — a deliberately vulnerable application, something
you own, or something you have written permission for.

4. Find at least three real issues. **Capture the request and response for each as you go.**
5. Write each as: title, severity with reasoning from this system, location, evidence, impact,
   fix, effort.
6. **Write the impact as a consequence, not a category.** Show both versions and say which you
   would send.
7. Write the three-sentence summary that goes at the top.
8. Name one thing that is good about the system.
9. **Turn each finding into a ticket** with a file, a change and an estimate.
10. Fix one yourself, with a test that would catch it returning.
11. Say what you would measure in a quarter to know whether the report worked.`,
      rubric: [
        { criterion: 'Findings classified', description: 'All cases, in the stated order of checks.', maxPoints: 20 },
        { criterion: 'The precedence justified', description: 'Why fix precedes impact, with a case for reporting without one.', maxPoints: 15 },
        { criterion: 'Three real findings with evidence', description: 'Captured as the work happened, not reconstructed.', maxPoints: 25 },
        { criterion: 'Written in seven parts each', description: 'With impact as a consequence, shown both ways.', maxPoints: 20 },
        { criterion: 'Delivered as tickets', description: 'One per finding, with a file, a change and an estimate.', maxPoints: 10 },
        { criterion: 'One fixed and a measure named', description: 'A change with a test, and what to measure in a quarter.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]
`,
        tests: [
          { input: 'a yes yes yes yes\n', expectedOutput: 'a ready\nready=1' },
          { input: 'a no yes yes yes\n', expectedOutput: 'a NOT_CREDIBLE\nready=0' },
          { input: 'a yes yes no yes\n', expectedOutput: 'a NOT_ACTIONABLE\nready=0' },
          { input: 'a yes no yes yes\n', expectedOutput: 'a WONT_BE_PRIORITISED\nready=0' },
          { input: 'p yes yes yes no\nq no no no no\n', expectedOutput: 'p CANNOT_BE_PLANNED\nq NOT_CREDIBLE\nready=0', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('Fix is checked before impact because:',
        [['A finding nobody can act on is not scheduled however serious it sounds', true],
          ['Impact is easier to add later than a fix', false],
          ['Severity is usually obvious enough from the title alone', false],
          ['The fix determines the effort estimate', false]],
        'Though a finding with no fix is still worth reporting sometimes.'),
      mcq('Evidence for an access-control finding means:',
        [['The request as the second account, and the response containing the first account’s data', true],
          ['A written description of precisely which endpoint is lacking the check', false],
          ['The line of code where the check should be', false],
          ['A scanner result naming the vulnerability class', false]],
        'Captured as the work happens, never reconstructed later.'),
      mcq('A finding you suspect but cannot demonstrate should be:',
        [['Marked suspected rather than confirmed, and reported as such', true],
          ['Left out until it can be demonstrated', false],
          ['Reported at a lower severity instead', false],
          ['Described as requiring some further investigation only', false]],
        'Never overstate; never understate a serious one either.'),
    ],
  },
];
