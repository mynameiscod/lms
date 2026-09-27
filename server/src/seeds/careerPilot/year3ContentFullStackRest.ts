/**
 * T3_FS_DATA, T3_FS_QUALITY, T3_FS_DEPLOY and T3_FS_PROJECT — twelve units.
 * Finishes S18C and the full-stack track.
 *
 * ── DEPTH, NOT REPETITION ─────────────────────────────────────────────────────────────────
 *
 * Every unit here is about the seam, because that is the only thing this track owns.
 *
 * ONE_IDEA_THREE_SHAPES — the core database design unit designs a table. This one is about
 * the same concept existing as a row, a response and a screen at once, and drifting until
 * the three disagree about what a thing is.
 *
 * WHERE_TO_TRANSFORM — no core counterpart. The same transformation can live in the query,
 * the service or the component, all three work, and the choice is about who can see it in a
 * year.
 *
 * EACH_HALF_ALONE — the core testing units cover levels. This is specifically about the mock
 * at the boundary, which is the one mock that can quietly become the thing being tested.
 *
 * AND_THE_SEAM — the integration test that catches what neither half can see alone, and how
 * to say which failure it catches, since a test that catches nothing nameable is overhead.
 *
 * SHIPPING_THREE_THINGS and ROLLING_ALL_THREE_BACK — the core deployment topic ships one
 * thing. These ship an interface, a service and a schema together, and then undo them,
 * including the migration, which is the part that does not undo itself.
 *
 * Attribution: DATA defaults to DB_DESIGN with WHERE_TO_TRANSFORM on DATA_WRANGLING.
 * QUALITY is single-skill and derived. DEPLOY defaults to DEPLOYMENT with the shipping unit
 * on CONTAINERS_DOCKER. The project is all PRODUCTION_ENGINEERING.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const FULLSTACK_REST_BUNDLES: PilotBundle[] = [
  /* ══ T3_FS_DATA ═════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_FS_DATA_ONE_IDEA_THREE_SHAPES',
    notes: `**A row, a response and a screen are the same thing dressed differently.** The
core database unit designed the row. This one is about keeping all three honest, because they
drift, and when they drift the system no longer agrees with itself about what a thing is.

## The three shapes

**The row.** Normalised, constrained, indexed for the queries you make. **Shaped for
correctness and for storage.**

**The response.** Shaped for the caller. Often a join of several rows, with some fields
omitted and some computed.

**The screen.** Shaped for a person. Formatted, grouped, sorted, with labels rather than
codes.

**All three are legitimate.** The mistake is not having three shapes — **it is letting them
mean different things.**

## How they drift

**A field renamed in one shape and not the others**, so the same thing is \`status\`, \`state\`
and "Stage" depending on where you look. **Then a conversation about the stage field takes
ten minutes to establish what anybody is talking about.**

**A value that exists in one shape and not another.** The row has a \`cancelled\` status; the
screen has no label for it, so it renders blank.

**A computation done twice, differently.** The total on the screen and the total in the
report disagree by a rounding rule, **and both are defended by the engineer who wrote them.**

**And a constraint enforced in one place.** The database allows it, the interface prevents
it, and the API — called directly — creates the row nobody's code expects.

## Keeping them honest

**One name for one concept**, all the way through. If the table says \`status\`, the response
says \`status\` and the screen calls it Status. **Renaming in transit is a cost with no
benefit**, and the cost is paid by everybody who ever debugs it.

**One enumeration, defined once**, generated into both halves if you can.

**Compute in one place.** If the total is derived, derive it on the server and send it. **Two
implementations of a business rule will disagree**, and the one the customer sees is not
necessarily the correct one.

**And constrain at the bottom.** The database is the last line and the only one nothing can
get past.

## When the shapes genuinely differ

Sometimes they must, and that is fine when it is deliberate:

**The response omits fields the caller must not see.**

**The screen formats.** Currency, dates, relative times.

**The screen groups and sorts** for a person.

**The rule: transformations that add presentation are fine; transformations that change
meaning are not.** Formatting a date is presentation. Turning three statuses into two is a
change of meaning, and it will be discovered when somebody asks why a filter returns nothing.

## The check worth doing

**Take one concept and follow it.** Column, model, response field, client type, screen label.

**Write the five names down.** If they are not the same word, that is the finding, and it is
almost always there in a codebase over a year old.`,
    mcqs: [
      mcq('The mistake with three shapes is:',
        [['Letting them mean different things, not having three of them', true],
          ['Maintaining three representations of the same data', false],
          ['Transforming between them more than once', false],
          ['Allowing the screen shape to influence the row', false]],
        'All three are legitimate.'),
      mcq('The same concept named three ways causes:',
        [['A ten-minute conversation to establish what anybody is talking about', true],
          ['Type errors at the boundary between the halves', false],
          ['Extra mapping code that must be maintained', false],
          ['Confusion only for engineers new to the codebase', false]],
        'Renaming in transit is a cost with no benefit.'),
      mcq('Two implementations of a business rule:',
        [['Will disagree, and the one the customer sees may not be correct', true],
          ['Diverge only when the rule itself changes', false],
          ['Can be kept in step by a shared test suite', false],
          ['Are acceptable when each is tested independently', false]],
        'Compute in one place and send the result.'),
      mcq('The rule distinguishing acceptable transformations is:',
        [['Presentation is fine; changing meaning is not', true],
          ['Server-side is fine; client-side is not', false],
          ['Reversible is fine; lossy is not', false],
          ['Per-screen is fine; global is not', false]],
        'Turning three statuses into two will be found when a filter returns nothing.'),
    ],
    checkpoint: [
      mcq('The check worth doing is to follow one concept and:',
        [['Write down all five names, and see whether they are the same word', true],
          ['Verify the type is consistent at each stage', false],
          ['Count how many transformations it passes through on the way', false],
          ['Check the value is not modified along the way', false]],
        'Almost always a finding in a codebase over a year old.'),
      mcq('Constraints belong at the bottom because:',
        [['The database is the only layer nothing can get past', true],
          ['Database constraints are faster to evaluate', false],
          ['It keeps the validation rules in one file', false],
          ['The application layer cannot express all of them', false]],
        'The API called directly creates the row nobody’s code expects.'),
      mcq('A status with no label on the screen renders blank because:',
        [['A value exists in one shape and not in another', true],
          ['The enumeration was not generated into the client', false],
          ['The response omitted the field for that case', false],
          ['The screen defaults to empty for unknown values', false]],
        'One enumeration, defined once.'),
    ],
  },

  {
    unitCode: 'T3_FS_DATA_WHERE_TO_TRANSFORM',
    notes: `**The same transformation can live in the query, the service or the component.
All three work.** This unit has no core counterpart, and the choice is not about correctness —
it is about **who can find it in a year.**

## The three places

**In the query.** The database does it: joins, aggregates, sorting, filtering.

**Fast, because the database is good at this and because less data crosses the wire.**

**Invisible to anybody reading the application code**, which is the cost — a rule that only
exists in SQL is a rule most of the team will not find.

**In the service.** The application does it, between fetching and responding.

**Testable, readable, in the same language as everything else.** **The default, and the right
answer most of the time.**

**Costs memory and a round trip of unfiltered data**, which matters at volume and not
otherwise.

**In the component.** The interface does it, at render.

**Closest to the need, and it can use what only the interface knows** — the viewport, the
locale, what the user has selected.

**Costs a repetition per component** and it is where duplicated business rules breed.

## The rule

**Filtering and aggregation belong in the query**, because moving a million rows to count
them is the wrong thing however readable it is.

**Business rules belong in the service.** One place, tested, visible.

**Presentation belongs in the component.** Formatting, ordering for display, grouping for a
person.

**And when you are unsure, the service** — it is the easiest of the three to move out of
later, in both directions.

## What each choice costs later

**In the query:** the next engineer changes the business rule in the service and does not
realise half of it is in SQL. **The commonest version of this problem**, and it is why a rule
split across two layers is worse than a rule in the wrong one.

**In the service:** at volume you discover you are loading a hundred thousand rows to return
ten. Visible in a profiler, and a straightforward fix.

**In the component:** three screens format the same thing three ways, and the fourth one gets
it wrong. **Discovered by a user, usually in a report to somebody senior.**

## The one thing never to do

**Never split one rule across two layers.**

Half the discount logic in SQL and half in the service is not a compromise; **it is a rule
nobody can read in either place**, and it survives because each half looks reasonable on its
own.

## Moving it later

**Query to service:** easy, and usually a performance regression you must measure.

**Service to query:** easy, and the rule becomes invisible — so leave a comment saying it
moved and why.

**Component to service:** almost always right, and it is the refactor this unit most wants
you to make.

**Service to component:** rarely right, and worth a second look before you do it.`,
    mcqs: [
      mcq('The cost of putting a rule in the query is:',
        [['It is invisible to anybody reading the application code', true],
          ['It cannot be unit tested in isolation', false],
          ['Database logic is harder to version control', false],
          ['It ties the rule to one database engine', false]],
        'Most of the team will not find it.'),
      mcq('Filtering and aggregation belong in the query because:',
        [['Moving a million rows to count them is wrong however readable it is', true],
          ['Databases express these operations more precisely', false],
          ['It keeps the service layer free of data concerns', false],
          ['The query planner can optimise them together', false]],
        'Business rules in the service, presentation in the component.'),
      mcq('The commonest version of this problem is:',
        [['Changing a business rule in the service without realising half is in SQL', true],
          ['Loading far more rows than the response needs', false],
          ['The same formatting implemented differently per screen', false],
          ['A rule in the component that belongs in the service', false]],
        'A rule split across two layers is worse than one in the wrong layer.'),
      mcq('The refactor this unit most wants you to make is:',
        [['Component to service', true],
          ['Service to query, for performance', false],
          ['Query to service, for visibility', false],
          ['Service to component, for locality', false]],
        'Almost always right.'),
    ],
    checkpoint: [
      mcq('When you are unsure where a transformation belongs, choose:',
        [['The service, which is easiest to move out of in both directions', true],
          ['The query, since it is by far the most efficient option', false],
          ['The component, since it is closest to the need', false],
          ['Wherever the surrounding code already puts it', false]],
        'The default, and right most of the time.'),
      mcq('A rule split half in SQL and half in the service is:',
        [['Unreadable in either place, surviving because each half looks fine', true],
          ['A reasonable compromise between raw speed and clarity', false],
          ['Acceptable when the SQL half is only filtering', false],
          ['Easier to optimise than a rule in one layer', false]],
        'Never split one rule across two layers.'),
      mcq('Three screens formatting the same thing three ways is:',
        [['Discovered by a user, usually in a report to somebody senior', true],
          ['Caught by the component test suite', false],
          ['A minor inconsistency with very little consequence', false],
          ['Prevented by a shared formatting utility', false]],
        'The cost of putting it in the component.'),
    ],
  },

  {
    unitCode: 'T3_FS_DATA_DEBUGGING',
    notes: `Five ways data goes wrong across a full stack, where the value is right in one
place and wrong in another.

## 1. The number is different in two places

**Symptom:** the dashboard says one thing and the export says another.

**Cause:** the same calculation implemented twice, with a different rounding rule, a
different filter, or a different notion of what counts.

**Diagnosis:** **compute it a third way, by hand, on a small data set.** That tells you which
of the two is wrong, which is a question that otherwise produces an argument rather than an
answer.

**Fix:** one implementation, in the service, used by both.

## 2. The screen shows nothing and the data is there

**Causes:** a filter on a value the row does not have; a status the client has no case for; a
timezone putting the row on the previous day; a permission scope excluding it.

**Diagnosis:** look at the actual response body, not the screen. **If the row is in the
response, the bug is in the client; if it is not, it is in the query.** One observation,
halving the search.

## 3. It is correct until somebody saves

**Causes:** the write transforms differently from the read; a default applied on the way in
that was not there before; a partial update wiping fields the client did not send.

**The last one is worth naming: a PUT with a partial body that overwrites the whole record.**
It is a data loss bug that looks like a rendering bug and it is extremely common.

**Fix:** be explicit about whether an update is partial or complete, on both sides, in the
contract.

## 4. Old rows behave differently

**Causes:** a column added later with nulls behind it; a default applied only to new rows; a
meaning that changed without a migration.

**Diagnosis:** sort by creation date and look at the oldest. **Almost nobody does this, and it
answers this class of bug in a minute.**

**Fix:** backfill, or handle the null explicitly and say in the code why it exists.

## 5. The types disagree

**Causes:** a number sent as a string; a date as a string in an unspecified format; an integer
that exceeds what the client can represent exactly; a boolean as \`0\` and \`1\` and \`"false"\`.

**"false" as a string is truthy**, which is the single most productive bug in this category.

**Fix:** generate the client types from the server's schema and the whole class goes away.

## The habits

**Compute it a third way when two disagree.**

**Look at the response body, not the screen.**

**Say whether an update is partial or complete.**

**Sort by creation date and look at the oldest rows.**

**And generate the types rather than writing them twice.**`,
    mcqs: [
      mcq('When two numbers disagree, computing it a third way by hand:',
        [['Tells you which of the two is wrong, rather than producing an argument', true],
          ['Confirms the rounding rule each one applies', false],
          ['Is only practical on a very small data set', false],
          ['Establishes which implementation came first', false]],
        'Then one implementation, in the service, used by both.'),
      mcq('Whether the row appears in the response body:',
        [['Halves the search — client bug if present, query bug if not', true],
          ['Confirms the permission scope was applied correctly', false],
          ['Shows whether the filter ran on the server', false],
          ['Distinguishes a rendering error from a timezone one', false]],
        'Look at the body, not the screen.'),
      mcq('A partial body that overwrites the whole record is:',
        [['A data loss bug that looks like a rendering bug', true],
          ['A contract violation the server should reject', false],
          ['Prevented by using PATCH rather than PUT', false],
          ['Only a problem when fields are optional', false]],
        'Be explicit about partial or complete, on both sides.'),
      mcq('The single most productive bug in the type category is:',
        [['"false" as a string, which is truthy', true],
          ['A number sent as a string', false],
          ['A date in an unspecified format', false],
          ['An integer beyond exact client representation', false]],
        'Generate the client types from the server schema.'),
    ],
    checkpoint: [
      mcq('Sorting by creation date and looking at the oldest rows:',
        [['Answers a whole class of bug in a minute, and almost nobody does it', true],
          ['Reveals which migrations have been applied', false],
          ['Shows the growth rate of the table over time', false],
          ['Identifies the rows that predate the current schema version', false]],
        'A column added later with nulls behind it.'),
      mcq('A null left in place rather than backfilled should be:',
        [['Handled explicitly, with a comment saying why it exists', true],
          ['Treated as the column default at read time', false],
          ['Excluded from the query that reads that column', false],
          ['Backfilled the next time the row is written', false]],
        'Backfill, or handle it and explain it.'),
      mcq('Generating client types from the server schema removes:',
        [['The whole class of type disagreements at the boundary', true],
          ['The need for a contract test on the client', false],
          ['Runtime validation of incoming responses', false],
          ['Mismatches between the row and the response shape', false]],
        'Rather than writing the types twice.'),
    ],
  },

  {
    unitCode: 'T3_FS_DATA_PRACTICE',
    notes: `Two exercises on keeping one concept coherent across three shapes, and on putting
a transformation where it belongs.`,
    coding: [
      {
        title: 'Following one concept',
        description: `Read five lines, each \`<layer>=<name>\`, in the order \`column\`,
\`model\`, \`response\`, \`client\`, \`screen\`.

Print \`coherent\` if all five names are identical, **ignoring case and ignoring underscores**
— \`order_status\`, \`orderStatus\` and \`Order Status\` are the same word wearing different
casing conventions, and that is presentation rather than drift.

Otherwise print \`DRIFT\` and then, one per line, \`<layer>=<name>\` for every layer whose
normalised name differs from the **column's**, since the column is the bottom and the other
four are describing it.

Normalise by lowercasing and removing underscores and spaces.`,
        starter: `import sys

rows = [l.strip() for l in sys.stdin if l.strip()]

# The column is the bottom; the other four are describing it.
`,
        language: 'python',
        tests: [
          { input: 'column=status\nmodel=status\nresponse=status\nclient=status\nscreen=Status\n', expectedOutput: 'coherent' },
          { input: 'column=order_status\nmodel=orderStatus\nresponse=orderStatus\nclient=orderStatus\nscreen=Order Status\n', expectedOutput: 'coherent' },
          { input: 'column=status\nmodel=state\nresponse=status\nclient=status\nscreen=Status\n', expectedOutput: 'DRIFT\nmodel=state' },
          { input: 'column=status\nmodel=state\nresponse=state\nclient=stage\nscreen=Stage\n', expectedOutput: 'DRIFT\nmodel=state\nresponse=state\nclient=stage\nscreen=Stage' },
          { input: 'column=a_b\nmodel=AB\nresponse=a b\nclient=ab\nscreen=A B\n', expectedOutput: 'coherent', isHidden: true },
        ],
      },
      {
        title: 'Where does it belong',
        description: `Read one transformation per line as \`<name> <kind> <current>\`, where
kind is \`filter\`, \`aggregate\`, \`business_rule\` or \`presentation\`, and current is
\`query\`, \`service\` or \`component\`.

The right layer is: \`filter\` and \`aggregate\` → \`query\`; \`business_rule\` →
\`service\`; \`presentation\` → \`component\`.

Print \`<name> ok\` when current matches, otherwise \`<name> MOVE <current> -> <right>\`.

Then \`moves=<n>\`, and after it print \`WORST <name>\` for every business rule currently in
the \`query\`, because a rule hidden in SQL is the case the notes called the commonest
version of this problem.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# A business rule hidden in SQL is the worst of the misplacements.
`,
        language: 'python',
        tests: [
          { input: 'recent filter query\n', expectedOutput: 'recent ok\nmoves=0' },
          { input: 'discount business_rule query\n', expectedOutput: 'discount MOVE query -> service\nmoves=1\nWORST discount' },
          { input: 'currency presentation component\n', expectedOutput: 'currency ok\nmoves=0' },
          { input: 'total aggregate service\n', expectedOutput: 'total MOVE service -> query\nmoves=1' },
          { input: 'a business_rule component\nb business_rule query\nc presentation service\n', expectedOutput: 'a MOVE component -> service\nb MOVE query -> service\nc MOVE service -> component\nmoves=3\nWORST b', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Full-Stack Data Practice',
      description: 'Trace one concept through five layers, place transformations, then do both on real code.',
      instructions: `Complete both exercises, then:

1. For the first: casing differences are not drift. Say where you would draw the line, and
   give a case where a casing change is a real problem.
2. For the second: a business rule in the query is marked worst. Say why it is worse than the
   same rule in a component, which is also wrong.
3. For the second: give a transformation that is genuinely ambiguous between two layers, and
   say how you would decide.

**Then, in a real application** with a database, a service and an interface.

4. **Pick one concept and follow it through all five layers.** Write the five names down.
5. If they differ, say when each name was introduced, from the history.
6. **Find one value computed in two places.** Compute it a third way by hand and say which
   is right.
7. Find one enumeration. Check every value has a case in the client and a label on the
   screen. Record any that do not.
8. List every transformation on one screen's data and say which layer each is in.
9. **Name the ones in the wrong layer**, and what moving each would cost.
10. Find one constraint enforced above the database and say what would happen if the API were
    called directly.`,
      rubric: [
        { criterion: 'Concept coherence checked', description: 'All cases, with casing normalised correctly.', maxPoints: 15 },
        { criterion: 'Transformations placed', description: 'All cases, with the hidden business rule flagged.', maxPoints: 15 },
        { criterion: 'One concept traced through five layers', description: 'Five names written down, differences dated from the history.', maxPoints: 20 },
        { criterion: 'A double computation resolved', description: 'Computed a third way by hand, with a verdict on which is right.', maxPoints: 20 },
        { criterion: 'Transformations audited', description: 'Every one on a screen listed, layer stated, misplacements named with a cost.', maxPoints: 20 },
        { criterion: 'A constraint tested from outside', description: 'One found above the database, with the consequence stated.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]
`,
        tests: [
          { input: 'recent filter query\n', expectedOutput: 'recent ok\nmoves=0' },
          { input: 'discount business_rule query\n', expectedOutput: 'discount MOVE query -> service\nmoves=1\nWORST discount' },
          { input: 'currency presentation component\n', expectedOutput: 'currency ok\nmoves=0' },
          { input: 'total aggregate service\n', expectedOutput: 'total MOVE service -> query\nmoves=1' },
          { input: 'a business_rule component\nb business_rule query\nc presentation service\n', expectedOutput: 'a MOVE component -> service\nb MOVE query -> service\nc MOVE service -> component\nmoves=3\nWORST b', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('A casing difference becomes a real problem when:',
        [['Two distinct concepts normalise to the same name', true],
          ['The screen label differs from the column name', false],
          ['The client convention differs from the server one', false],
          ['A field is renamed as part of a migration', false]],
        'Otherwise casing is a presentation convention.'),
      mcq('A business rule in the query is worse than the same rule in a component because:',
        [['It is invisible to somebody changing the rule in the service', true],
          ['It cannot be tested without a database', false],
          ['It is harder to change without a migration', false],
          ['It runs on every single query rather than on render', false]],
        'A component at least sits in the application code.'),
      mcq('A constraint enforced above the database means:',
        [['The API called directly creates the row nobody’s code expects', true],
          ['The validation runs twice on every write', false],
          ['The constraint cannot easily be checked at read time', false],
          ['Existing rows may already violate it', false]],
        'Constrain at the bottom.'),
    ],
  },

  {
    unitCode: 'T3_FS_DATA_MINI_PROJECT',
    notes: `Take one concept and make it coherent from table to screen.

**The measurement is the five names being the same word.** Everything else in this project
follows from it: one name, one enumeration, one place each rule lives.

Budget around two hours.`,
    assignment: {
      title: 'Mini Project — One Concept, Coherent All the Way',
      description: 'Trace a concept through five layers, fix the drift, and move every transformation to its right place.',
      instructions: `**Use** an application with a database, a service and an interface. Yours,
or an open-source project you can run.

**Part one — trace it**

1. Pick one concept that appears on a screen. Something with a status or a category.
2. **Write its name at all five layers:** column, model, response field, client type, screen
   label.
3. From the history, say when each name was introduced and by which change.
4. Trace one enumerated value the same way. **Does every value have a case in the client and
   a label on the screen?**

**Part two — find the drift**

5. Every place the same value is computed. At least look for two.
6. **Compute one of them a third way, by hand, on a small data set.** Say which existing
   implementation is right.
7. Every transformation applied to this concept between the row and the screen. Which layer
   is each in?
8. One constraint. Which layers enforce it? **Call the API directly and find out whether the
   database does.**

**Part three — fix it**

9. **One name, all the way through.** Make the change, as a rename across the seam if it
   crosses it — expand, migrate, contract.
10. One enumeration, defined once, with every value handled on the client.
11. One implementation of the computation, in the service, used by both callers.
12. Move any transformation in the wrong layer, and say what each move cost.
13. Add the missing constraint at the database, and a migration that copes with rows already
    violating it.

**Part four — prove it**

14. The five names, before and after.
15. The enumeration values, before and after, with any that had no label.
16. The two computations reconciled, with the hand calculation shown.
17. **Call the API directly and show the constraint now holds.**

**Part five — write it up**

18. Which drift had been there longest, and how it got in.
19. **What would stop it happening again?** Be specific — a generated type, a shared
    enumeration, a test — not "be careful".
20. What you left drifted, and why.

**Submit** the before-and-after tables, the migration, the code, the direct API transcript,
and the write-up.`,
      rubric: [
        { criterion: 'Traced through five layers', description: 'Names and an enumerated value, with introduction dates from history.', maxPoints: 20 },
        { criterion: 'Drift found', description: 'Double computation located, resolved by hand, transformations placed.', maxPoints: 20 },
        { criterion: 'One name, one enumeration', description: 'Rename carried across the seam safely, every value handled.', maxPoints: 20 },
        { criterion: 'One computation, right layer', description: 'Single implementation, transformations moved with costs stated.', maxPoints: 15 },
        { criterion: 'Constraint at the database', description: 'Added with a migration coping with violating rows, proved directly.', maxPoints: 15 },
        { criterion: 'A specific prevention', description: 'A mechanism named, not an intention, plus what was left drifted.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('This project succeeds when:',
        [['The five names are the same word', true],
          ['Every transformation sits in its right layer', false],
          ['The constraint holds when the API is called directly', false],
          ['Both computations produce the same number', false]],
        'Everything else follows from it.'),
      mcq('The migration adding a constraint must:',
        [['Cope with rows that already violate it', true],
          ['Run before the application code is deployed', false],
          ['Be reversible without data loss', false],
          ['Lock the table for the duration', false]],
        'Some rows predate the rule.'),
      mcq('"Be careful" fails as a prevention because:',
        [['It is an intention rather than a mechanism', true],
          ['It depends on the same people staying on the team', false],
          ['It cannot be checked during code review', false],
          ['Drift usually happens under time pressure', false]],
        'A generated type, a shared enumeration, a test.'),
    ],
  },

  /* ══ T3_FS_QUALITY ══════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_FS_QUALITY_EACH_HALF_ALONE',
    notes: `Fast tests either side of the seam — and **the mock at the boundary, which is the
one mock that can quietly become the thing being tested.**

## Testing the server half

**Without the client.** Call the endpoint directly, assert on the response.

**Fast, and it covers most of what matters**: validation, authorisation, the business rule,
the error cases.

**Assert on the contract**, not on the implementation. **A test that breaks when you rename a
private method is a test you will delete**, and deleting it takes the coverage with it.

## Testing the client half

**Without the server.** Feed the component a response and assert on what the user sees.

**Which means every test needs a fake response**, and that is where the trouble starts.

## The mock that becomes the test

**You write a fake response. You base it on what the server currently sends. Your tests
pass.**

**Then the server changes**, and your fake does not. **Your tests still pass and the
application is broken** — because what you are testing is your belief about the server, and
your belief is out of date.

**This is the characteristic failure of the full-stack test suite**, and a suite with a
hundred client tests and no contract test has this problem whether or not anybody has noticed
yet.

## Three ways out, in order of strength

**Generate the fakes from the schema.** If the contract changes, the fakes change, and the
tests fail for the right reason. **Strongest, and free once the schema exists.**

**Contract tests.** The server proves it produces what the contract says; the client proves it
handles what the contract allows. **Neither half tests the other, and both test the same
document.**

**A recorded real response**, refreshed periodically and checked in. **Weakest — because
"periodically" means "never" after the first month** — and still much better than a fake
somebody typed.

## What to fake and what not to

**Fake the network.** Always. A client test hitting a real server is not a client test.

**Do not fake your own logic.** A component test that mocks the function it is testing is
testing nothing.

**Do not fake the thing under test's dependencies so thoroughly that the test passes on an
empty implementation.** **The check: delete the body of the function and see whether the test
fails.** If it passes, the mocks were the test.

## Keeping both halves fast

**No network, no database, no filesystem**, in this layer.

**Under a second for the whole client suite**, ideally. **Under ten for the server unit
tests.**

**Because a suite this fast is run on every save, and a suite run on every save catches
things a minute after you wrote them** — which is worth more than any amount of thoroughness
in a suite that runs after you have moved on.`,
    mcqs: [
      mcq('The characteristic failure of a full-stack test suite is:',
        [['The fake response encoding a belief about the server that is out of date', true],
          ['Integration tests being too slow to run regularly', false],
          ['The two halves being tested by different teams', false],
          ['End-to-end tests replacing unit tests at the boundary', false]],
        'Your tests pass and the application is broken.'),
      mcq('Generating the fakes from the schema is strongest because:',
        [['If the contract changes the fakes change, and tests fail for the right reason', true],
          ['It produces more realistic data than a hand-written fake', false],
          ['It covers more cases than a recorded response', false],
          ['It removes the need for contract tests on the server', false]],
        'And it is free once the schema exists.'),
      mcq('A recorded real response is the weakest option because:',
        [['"Periodically" means "never" after the first month', true],
          ['Recorded responses contain data that goes stale', false],
          ['It only captures the cases that were exercised', false],
          ['It cannot represent error responses accurately', false]],
        'And it is still better than a fake somebody typed.'),
      mcq('The check for whether the mocks became the test is:',
        [['Delete the body of the function and see whether the test fails', true],
          ['Count how many dependencies each test mocks', false],
          ['Compare the mock against the real dependency', false],
          ['Run the test against the real implementation', false]],
        'If it passes, the mocks were the test.'),
    ],
    checkpoint: [
      mcq('A test that breaks when you rename a private method is:',
        [['A test you will delete, taking its coverage with it', true],
          ['Evidence the test is checking the implementation closely', false],
          ['Acceptable for code with complex internals', false],
          ['A reason to make the method public', false]],
        'Assert on the contract, not the implementation.'),
      mcq('A contract test differs from a mock-based test because:',
        [['Neither half tests the other, and both test the same document', true],
          ['It runs against a real instance of the dependency', false],
          ['It covers error cases the mock does not', false],
          ['It is maintained by the team that owns the contract', false]],
        'The server proves the promise; the client proves it copes.'),
      mcq('A suite fast enough to run on every save:',
        [['Catches things a minute after you wrote them', true],
          ['Encourages developers to write more tests', false],
          ['Reduces the load on the build pipeline', false],
          ['Covers more cases in the same wall-clock time', false]],
        'Worth more than thoroughness in a suite that runs after you have moved on.'),
    ],
  },

  {
    unitCode: 'T3_FS_QUALITY_AND_THE_SEAM',
    notes: `**The integration test that catches what neither half can see on its own** — and
saying which failure it catches, because **a test that catches nothing you can name is
overhead pretending to be safety.**

## What only a seam test can find

**A contract mismatch neither side noticed**, because each was tested against its own belief.

**A serialisation difference.** A date that the server writes one way and the client parses
another.

**Authentication actually working end to end**, with a real token and a real cookie — a thing
that is mocked on both sides and therefore untested on both sides.

**The order of operations across the boundary.** Two requests that work individually and
conflict together.

**And configuration.** A base URL, a header, a CORS rule — none of which exist in either
half's own tests.

## What it should not be

**Not a copy of the unit tests, run slowly.** If the failure would be caught by a unit test,
it belongs in a unit test.

**Not a user journey with twelve steps.** That is an end-to-end test, it is slower and
flakier, and one or two per feature is the budget.

**And not "integration" meaning "we could not decide".** **Every seam test should have a
sentence saying what it catches that neither half's tests could**, written in the test name
or beside it.

## How many, and which

**Per contract, not per endpoint.** One test proving the shapes agree covers every endpoint
using that shape.

**One authentication test**, end to end, with a real credential.

**One test per interaction that spans the boundary in a non-obvious way**: a write followed
by a read, a paginated fetch, a conditional request.

**Five to ten for a small application**, and if you have fifty you have written the unit
tests twice.

## Making them stable

**Own the data.** Each test creates what it needs and cleans up. **Tests that depend on data
somebody else created are the flaky ones**, and they fail on a Monday for reasons nobody can
reconstruct.

**No sleeps.** Wait for a condition, with a timeout.

**Real dependencies in containers**, not shared environments. **A shared test environment is
where seam tests go to become unreliable**, because somebody else's run changes your data
underneath you.

**And run them in the pipeline, not on every save.** They are the slow suite, by design.

## Reading a failure

**A seam test failing tells you the two halves disagree. It does not tell you which is
wrong.**

**So log both:** what was sent and what came back, in full. A seam test that fails with
"expected true, got false" has cost you the hour it was supposed to save.

**And check the contract first.** More often than not the test is right, one of the halves
drifted, and the contract says which.`,
    mcqs: [
      mcq('Every seam test should have:',
        [['A sentence saying what it catches that neither half’s tests could', true],
          ['An assertion on both the request and the response', false],
          ['A corresponding unit test on each side', false],
          ['A named owner responsible for keeping it green', false]],
        'A test that catches nothing nameable is overhead pretending to be safety.'),
      mcq('Authentication needs a seam test because:',
        [['It is mocked on both sides and therefore untested on both sides', true],
          ['Token handling differs between environments', false],
          ['It involves the most security-sensitive code paths', false],
          ['Authentication failures are hard to diagnose later', false]],
        'With a real token and a real cookie.'),
      mcq('Fifty seam tests for a small application means:',
        [['You have written the unit tests twice', true],
          ['The contract has too many endpoints', false],
          ['The suite will be too slow for the pipeline', false],
          ['Coverage at the boundary is unusually thorough', false]],
        'Five to ten, and per contract rather than per endpoint.'),
      mcq('A seam test failing tells you:',
        [['The two halves disagree, not which of them is wrong', true],
          ['The contract has been violated by the server', false],
          ['A recent change broke the integration', false],
          ['The client made an incorrect assumption', false]],
        'So log what was sent and what came back, in full.'),
    ],
    checkpoint: [
      mcq('Tests depending on data somebody else created are:',
        [['The flaky ones, failing on a Monday for unreconstructable reasons', true],
          ['Faster to run, because the setup is shared across tests', false],
          ['Acceptable when the data is read-only', false],
          ['A reasonable trade in a small suite', false]],
        'Each test creates what it needs and cleans up.'),
      mcq('A shared test environment is:',
        [['Where seam tests go to become unreliable', true],
          ['Cheaper than containers for a small team', false],
          ['Appropriate for tests that need real dependencies', false],
          ['Acceptable if runs are scheduled rather than concurrent', false]],
        'Somebody else’s run changes your data underneath you.'),
      mcq('A seam test failing with "expected true, got false":',
        [['Has cost you the hour it was supposed to save', true],
          ['Still narrows the problem to the boundary', false],
          ['Is adequate if the test name is descriptive', false],
          ['Can be diagnosed by re-running with logging on', false]],
        'Log both sides in full, every time.'),
    ],
  },

  /* ══ T3_FS_DEPLOY ═══════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_FS_DEPLOY_SHIPPING_THREE_THINGS',
    notes: `The core deployment topic shipped one thing. **Here there are three — interface,
service and schema — and the only question that matters is the order**, because every
ordering leaves a window where two of them disagree, and you are choosing which window is
survivable.

## The three, and how they differ

**The schema.** Slowest, hardest to reverse, and **the only one that holds data** — which is
why it is different in kind from the other two rather than just slower.

**The service.** Deployed as a rolling replacement, so old and new run together for minutes.

**The interface.** Deployed to a server, and then **arrives on each user's machine whenever
they next load it** — which may be immediately, or tomorrow, or never for the person with a
tab open since Tuesday.

## The order

**Schema first, additively.** Add the column. Do not remove, do not rename, do not constrain
yet.

**Service second.** It can now use the new column, and it must still work without it if the
rollback happens.

**Interface last.** It can now rely on the service.

**The rule behind it: deploy in dependency order, and make each step work with the previous
version of everything after it.** Each step must be safe with the old versions of everything
that comes later, because for a while that is exactly what is running.

## Why not the other way

**Interface first** and it calls an endpoint that does not exist.

**Service first** and it queries a column that is not there.

**Schema last** and both the halves above it are broken until it lands.

**There is no clever ordering that avoids this** — the additive-first sequence is the only one
where every intermediate state is valid, which is why it is worth learning as a rule rather
than reasoning about each time.

## The three-way window

**Even in the right order, there is a period** where the new schema, the old service and the
old interface are all running.

**That is fine, because additive changes are invisible to code that does not know about
them.**

**The window that is not fine** is a required column, a removed column, a renamed field, or a
changed constraint — and each of those is a contract change, handled with expand, migrate,
contract from the boundary topic.

## Containers make this concrete

**One image per service, tagged with the commit.** The thing you tested is the thing you ship.

**The interface is a build artefact too** — the same discipline, and it is the half people
forget because it feels like files rather than a release.

**Migrations run as their own step**, not on application start. **A migration running on
startup means several instances racing to run it**, which is a real and unpleasant failure
mode, and it also means a failed migration takes the application down rather than failing
visibly on its own.

## Verifying between steps

**After the schema:** the old application still works. Check it.

**After the service:** the old interface still works. Check that too, with a browser tab you
opened before the deploy.

**After the interface:** the whole thing works.

**Three checks, each thirty seconds**, and they are how you find out at the step that broke it
rather than at the end.`,
    mcqs: [
      mcq('The schema differs in kind from the other two because:',
        [['It is the only one that holds data', true],
          ['It takes the longest to apply', false],
          ['It cannot be deployed as a rolling replacement', false],
          ['It is shared by every instance of the service', false]],
        'Not just slower — different in kind.'),
      mcq('The rule behind the ordering is:',
        [['Each step must work with the old versions of everything after it', true],
          ['The slowest change goes first to overlap the others', false],
          ['The layer with the most dependents goes last', false],
          ['Reversible steps precede irreversible ones', false]],
        'Because for a while that is exactly what is running.'),
      mcq('There is no clever ordering that avoids the problem because:',
        [['Additive-first is the only sequence where every intermediate state is valid', true],
          ['The three parts cannot be deployed simultaneously', false],
          ['Rolling replacement always overlaps two versions', false],
          ['Users load the interface at unpredictable times', false]],
        'Worth learning as a rule rather than reasoning about each time.'),
      mcq('Running migrations on application start means:',
        [['Several instances racing to run it, and a failure taking the app down', true],
          ['The migration runs later than it should', false],
          ['The schema version cannot be verified beforehand', false],
          ['Rollback has to be performed manually', false]],
        'Run them as their own step.'),
    ],
    checkpoint: [
      mcq('The interface arrives on a user’s machine:',
        [['Whenever they next load it, which may be never for an open tab', true],
          ['As soon as the deployment to the web server completes', false],
          ['On their next navigation within the application', false],
          ['When the service signals a version change', false]],
        'Which is why it is deployed last.'),
      mcq('The half people forget is a build artefact is:',
        [['The interface, because it feels like files rather than a release', true],
          ['The schema, because migrations are scripts', false],
          ['The service, when it is deployed from a container registry', false],
          ['The configuration, which changes per environment', false]],
        'One artefact per part, tagged with the commit.'),
      mcq('Checking the old interface after deploying the service is done with:',
        [['A browser tab opened before the deploy', true],
          ['A rebuild of the previous interface version', false],
          ['A request replayed from the previous release', false],
          ['A staging environment on the old version', false]],
        'Three checks, each thirty seconds.'),
    ],
  },

  {
    unitCode: 'T3_FS_DEPLOY_ROLLING_ALL_THREE_BACK',
    notes: `Rolling back the interface and the service is easy. **Rolling back the migration
is the part that does not undo itself**, and it is why a full-stack rollback needs a plan
rather than a command.

## Reverse order

**Interface first**, then service, then schema — the reverse of the deploy.

**Each step restores a state that worked**, provided the deploy was additive.

**And usually you stop after two.** An additive schema change does not need to be reversed —
the old service ignores the new column, and leaving it costs nothing but tidiness.

**That is the main practical point of the unit**: most full-stack rollbacks are two steps, not
three, and treating the schema as something that must also come back is what turns a
five-minute rollback into an incident.

## When the schema must come back

**Only when the change was not additive.** A dropped column, a changed type, a tightened
constraint.

**And then you have a problem**, because:

**A dropped column has taken the data with it.** The rollback restores the column and not what
was in it. **There is no undo for data**, only a restore from a backup, which is a different
and much slower operation.

**A changed type may have lost precision** on the way through.

**And a tightened constraint means rows were rejected or altered** while it was in force.

**Which is why the previous unit said additive first**, and why "we will roll back if it goes
wrong" is not a plan when the migration is destructive.

## Making the schema reversible

**Additive only during a release.**

**Destructive changes in a separate, later release**, when the previous one has been stable
for long enough that you will not roll it back.

**Never both in the same deploy.** Adding the new column and dropping the old one together is
the single most common way a rollback becomes a restore.

**And a written down migration**, with a tested reverse — **tested, not written**, because a
reverse migration nobody has run is a paragraph rather than a capability.

## Data written by the new version

**The worst case, and the one people do not plan for.**

New code ran for twenty minutes and wrote rows in the new shape. You roll back. **The old code
now reads rows it does not understand.**

**Design for it:** make the new shape readable by the old code where you can. A new column the
old code ignores is fine. **A changed meaning in an existing column is not**, and that is the
strongest argument in the curriculum for using a new field rather than changing what an old
one means.

## Rehearsing it

**Do it in staging. Actually do it.**

**Time it.** A rollback that takes forty minutes is not a rollback; it is a second outage.

**And write down who can trigger it**, because a rollback that needs a person who is asleep
is not available at the time you need it — which is always that time.

## Knowing when to roll back

**Decide the trigger before you deploy.** An error rate, a latency, a specific failure.

**And roll back first, diagnose afterwards.** **The instinct to find the cause while the
system is broken is the expensive one**, and it is the instinct almost everybody has.`,
    mcqs: [
      mcq('The main practical point of this unit is:',
        [['Most full-stack rollbacks are two steps, not three', true],
          ['The schema must be reversed in the opposite order', false],
          ['A rollback plan needs a tested reverse migration', false],
          ['The interface must be rolled back before the service', false]],
        'Treating the schema as something that must come back turns five minutes into an incident.'),
      mcq('A dropped column cannot be rolled back because:',
        [['The rollback restores the column and not what was in it', true],
          ['Reverse migrations cannot recreate indexes', false],
          ['The application will have cached the old schema', false],
          ['Other tables may reference the dropped data', false]],
        'There is no undo for data, only a restore.'),
      mcq('Adding a new column and dropping the old one in the same deploy is:',
        [['The single most common way a rollback becomes a restore', true],
          ['Acceptable once the backfill has completed', false],
          ['Necessary to avoid a period of duplicated data', false],
          ['Safe if the reverse migration has been written', false]],
        'Destructive changes go in a separate, later release.'),
      mcq('The strongest argument for using a new field rather than changing a meaning is:',
        [['Rolled-back code must still be able to read what the new code wrote', true],
          ['A new field is easier to document in the contract', false],
          ['Changed meanings are invisible to the type system', false],
          ['It avoids a migration on the existing column', false]],
        'A new column the old code ignores is fine.'),
    ],
    checkpoint: [
      mcq('A reverse migration that has been written but not run is:',
        [['A paragraph rather than a capability', true],
          ['Adequate provided it was reviewed', false],
          ['Sufficient for an additive change', false],
          ['Testable only against production data', false]],
        'Tested, not written.'),
      mcq('A rollback taking forty minutes is:',
        [['A second outage rather than a rollback', true],
          ['Acceptable for a change involving a schema', false],
          ['Normal when three parts must be reversed', false],
          ['Improved by running the steps in parallel', false]],
        'Rehearse it in staging and time it.'),
      mcq('The expensive instinct during an incident is:',
        [['Finding the cause while the system is still broken', true],
          ['Rolling back before confirming the deploy caused it', false],
          ['Escalating before the trigger threshold is met', false],
          ['Reversing all three parts rather than two', false]],
        'Roll back first, diagnose afterwards.'),
    ],
  },

  /* ══ T3_FS_PROJECT ══════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_FS_PROJECT_BRIEF',
    notes: `One application, both halves, and **what done means for each** — which is the part
that stops a full-stack project becoming two half-finished ones.

## The failure this brief prevents

**A beautiful interface calling three endpoints that do not handle failure.**

**Or a well-built service with a screen that was made in the last hour.**

**Both are extremely common**, and both come from the same cause: no written statement of
what done means on each side, so effort went where it was most enjoyable rather than where it
was needed.

## The brief

1. **What it does**, in two sentences.
2. **The screens.** Three to five.
3. **The endpoints.** With the contract for each: shape, optional fields, errors, guarantees.
4. **The data.** Tables, and the one concept you will trace through all five layers.
5. **Auth.** What is checked where, and what logout clears.
6. **What it deliberately does not do.**

## Done, for the interface

- Every screen handles loading, empty, error and success. **Four states, not one.**
- Every failure says what failed and offers a retry
- Nothing depends on a client-side check for correctness
- Stale data is either refreshed or labelled

## Done, for the service

- Every endpoint validates, authorises, and scopes to the caller
- Identity from the token, never the body
- Errors are the shape the contract says
- No business rule implemented twice

## Done, for the data

- One name per concept across all five layers
- One enumeration, defined once
- Constraints at the database
- A migration that copes with existing rows

## Done, for the whole

- **A two-account matrix, including the denials**
- Contract tests both sides, and five to ten seam tests
- A three-part deploy in the right order, verified between steps
- A rollback rehearsed and timed
- **An old tab, opened before the deploy, still working after it**

**That last item is the one that makes this a full-stack brief.** It is the thing neither
half can check alone, it takes ten seconds, and almost nobody does it.

## Time

**A third interface, a third service, a third the seam** — contract, tests, deploy, rollback.

**The seam third is the one that gets eaten**, and it is the only part of this project that
the other two tracks do not also teach.`,
    mcqs: [
      mcq('A beautiful interface over unhandled failures and a good service with a rushed screen:',
        [['Come from the same cause — no written definition of done per side', true],
          ['Reflect the strengths of the engineer who built them', false],
          ['Are acceptable outcomes for a time-boxed project', false],
          ['Indicate the brief scoped too much work', false]],
        'Effort went where it was enjoyable rather than where it was needed.'),
      mcq('Every screen must handle:',
        [['Loading, empty, error and success — four states, not one', true],
          ['Success and error, with loading handled globally', false],
          ['Every response the contract permits', false],
          ['The states the design covers explicitly', false]],
        'Done, for the interface.'),
      mcq('The item that makes this a full-stack brief is:',
        [['An old tab, opened before the deploy, still working after it', true],
          ['The two-account matrix including denials', false],
          ['Contract tests on both sides of the seam', false],
          ['One name per concept across all five layers', false]],
        'Neither half can check it alone, it takes ten seconds, and almost nobody does it.'),
      mcq('The third of the time that gets eaten is:',
        [['The seam, which is the only part the other tracks do not teach', true],
          ['The service, which is the largest body of code', false],
          ['The interface, which is the most visible', false],
          ['The data layer, which is the least interesting', false]],
        'A third each, and guard the third one.'),
    ],
    checkpoint: [
      mcq('Done for the service includes identity:',
        [['From the token, never from the body', true],
          ['Validated against the body where both are present', false],
          ['Resolved once per request and cached', false],
          ['Checked at the controller for every endpoint', false]],
        'The central rule of the auth topic.'),
      mcq('The contract for each endpoint must state:',
        [['Shape, optional fields, errors and guarantees', true],
          ['The expected response time and payload size', false],
          ['Which screens consume it and how', false],
          ['The database tables it reads from', false]],
        'Written in the brief, before either half is built.'),
      mcq('Done for the data requires a migration that:',
        [['Copes with rows that already exist', true],
          ['Can be reversed without losing data', false],
          ['Runs before the service is deployed', false],
          ['Applies the constraint at the application layer too', false]],
        'Some rows predate every rule you add.'),
    ],
  },

  {
    unitCode: 'T3_FS_PROJECT_BUILD',
    notes: `Build the whole thing: interface, service, data, auth and a deployment. **Finished,
not demonstrated.**

**The difference between finished and demonstrated is every state that is not the happy one**
— the empty list, the failed request, the denied action, the old tab. A demonstration shows
the happy path working. This asks for the rest.

Budget around three and a half hours of focused work.`,
    assignment: {
      title: 'Full-Stack Project — Building the Whole Thing',
      description: 'Contract first, both halves, auth all the way down, and a three-part deploy with a rollback.',
      instructions: `**Work from your brief.**

**Part one — the contract, first**

1. Write the contract for every endpoint before either half exists: shape, optional fields
   and what absent means, errors, guarantees, limits.
2. Generate types for both sides from it if you can. If not, say why and write the contract
   test instead.

**Part two — the data**

3. The tables, with constraints at the database.
4. **One name per concept**, all five layers. Write the five names down.
5. One enumeration, defined once, every value handled on the client.
6. A migration that copes with rows that already exist.

**Part three — the service**

7. Every endpoint: validate, identify from the token, authorise as a separate step, scope to
   the caller at the data layer.
8. Errors in the shape the contract says.
9. **No business rule implemented twice.** Say how you checked.

**Part four — the interface**

10. Every screen handles loading, empty, error and success.
11. Every failure names what failed and offers a retry.
12. Permissions rendered from what the server sent, with no rules reimplemented.
13. Data classified per screen: ask, cache or derive, each justified.

**Part five — test it**

14. Fast tests both halves, no network. **Delete a function body and prove a test fails.**
15. Contract tests both sides, including the optional field absent.
16. **Five to ten seam tests**, each with a sentence saying what it catches that neither half
    could.
17. **The two-account matrix**, including the denials.

**Part six — ship it**

18. A three-part deploy: schema additively, then service, then interface.
19. **Verify between each step.** Record the three checks.
20. **Open a tab before the deploy and use it afterwards.** Record what happened.
21. Rehearse the rollback. Time it. Say how many steps it actually needed.
22. Write down the trigger that would make you roll back.

**Submit** the contract, the code, the five names, the mutation result, the seam tests with
their sentences, the matrix, the deploy log with the three checks, and the rollback timing.`,
      rubric: [
        { criterion: 'Contract before code', description: 'Complete, with types generated or a contract test in their place.', maxPoints: 15 },
        { criterion: 'Data coherent and constrained', description: 'Five names, one enumeration, constraints at the database, a safe migration.', maxPoints: 15 },
        { criterion: 'A service that does not trust the client', description: 'Validate, identify from token, authorise separately, scope at the data layer.', maxPoints: 20 },
        { criterion: 'An interface with four states', description: 'Loading, empty, error, success on every screen, with data decisions justified.', maxPoints: 15 },
        { criterion: 'Tested either side and across', description: 'Mutation proved, contract tests both ways, seam tests each with a sentence, matrix filled.', maxPoints: 20 },
        { criterion: 'Shipped in three parts, reversibly', description: 'Right order, verified between steps, old tab checked, rollback rehearsed and timed.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('The difference between finished and demonstrated is:',
        [['Every state that is not the happy one', true],
          ['Whether the application is deployed anywhere', false],
          ['How much of the brief was completed', false],
          ['Whether the code has been reviewed', false]],
        'The empty list, the failed request, the denied action, the old tab.'),
      mcq('Deleting a function body during testing proves:',
        [['That the test fails, rather than the mocks being the test', true],
          ['That the function is covered by at least one test', false],
          ['That the test asserts on behaviour rather than structure', false],
          ['That the dependencies were mocked correctly', false]],
        'If it passes, the mocks were the test.'),
      mcq('Recording how many steps the rollback actually needed matters because:',
        [['An additive schema change does not need reversing, making it two', true],
          ['It measures how long the rollback will take', false],
          ['It shows which of the parts were deployed correctly', false],
          ['It confirms the reverse migration works', false]],
        'Most full-stack rollbacks are two steps, not three.'),
    ],
  },

  {
    unitCode: 'T3_FS_PROJECT_EXPLAIN',
    notes: `Defend where you drew the line between the halves.

**Full-stack is not "I can do both". It is "I know where the boundary goes and what it
costs"** — and that is the entire difference between the two answers in this conversation.

## The question

**"Where is your boundary, why there, and what did it cost you?"**

Every choice about the seam is a trade:

**A fat server and a thin client.** One place for the rules, and the interface waits for a
round trip on everything.

**A fat client and a thin server.** Responsive, and the rules are now in a place you do not
control, running on a machine you cannot trust.

**Something in between**, which is everything real, and **the interesting part is where you
put each individual decision** rather than the general posture.

## What you will be asked

**Which transformations are in the query, and why?** Name one, and say what it would cost to
move.

**What does the client hold, and how wrong can it be?** Per piece of data, with the cost of
being wrong.

**What happens to a user with an old tab open during your deploy?** **You should be able to
say "I tested that", and say what happened.**

**How would you rename a field?** Three steps, and say how you would know when to contract.

**Where is the same rule implemented twice?** There usually is one. **Naming it yourself is
much stronger than being shown it.**

## The comparison to have ready

For your boundary decision:

> "I compute the total on the server and send it, rather than deriving it on the client. The
> client version would be instant and would avoid a round trip on every quantity change. I
> went with the server because the discount rules are there and two implementations would
> drift — and drift in a price is a customer-visible error, not a rendering one. The cost is
> that the quantity control feels slower than it could, which I mitigated with an optimistic
> update that reconciles."

**Choice, alternative, reason, cost, mitigation.** That is a full-stack answer and it is
rarer than it should be.

## What not to say

**"Full-stack means I can do everything."** It means you understand the seam.

**"The client validates it."** Somebody will ask about the API.

**"We would roll back."** Not if the migration dropped a column.

**And do not present both halves separately for ten minutes each.** **Present the seam**,
which is the only part of this project that is about full-stack rather than about frontend
and backend in sequence.

## The closing answer

**"What was hardest?"**

**The honest answer is almost always the seam** — a contract that was wrong, a deploy ordering
that broke a tab, a rule that turned out to be in two places.

**Say which one, and what you did.** That is the answer that distinguishes somebody who built
both halves from somebody who joined them.`,
    mcqs: [
      mcq('Full-stack means:',
        [['Knowing where the boundary goes and what it costs', true],
          ['Being able to work on both halves competently', false],
          ['Owning a feature from the screen to the table', false],
          ['Understanding the technologies on each side', false]],
        'The entire difference between the two answers in this conversation.'),
      mcq('The interesting part of the boundary question is:',
        [['Where you put each individual decision, not the general posture', true],
          ['Whether the server or the client carries more logic', false],
          ['How many round trips a typical screen needs', false],
          ['Which half you chose to optimise for', false]],
        'Everything real is somewhere in between.'),
      mcq('Naming yourself the place a rule is implemented twice:',
        [['Is much stronger than being shown it', true],
          ['Suggests the design was not thought through', false],
          ['Should be left until the interviewer raises it', false],
          ['Matters less than having fixed it', false]],
        'There usually is one.'),
      mcq('A full-stack answer about a decision contains:',
        [['Choice, alternative, reason, cost and mitigation', true],
          ['Choice, alternative, reason and cost', false],
          ['The trade-off and how it was measured', false],
          ['The requirement and how the choice satisfies it', false]],
        'Rarer than it should be.'),
    ],
    checkpoint: [
      mcq('"We would roll back" is a weak answer when:',
        [['The migration dropped a column', true],
          ['The deploy involved three separate parts', false],
          ['The interface had already reached users', false],
          ['The rollback has not been rehearsed', false]],
        'There is no undo for data.'),
      mcq('Rather than presenting both halves separately you should present:',
        [['The seam, which is the only genuinely full-stack part', true],
          ['The architecture, covering both halves at once', false],
          ['The user journey through the whole application', false],
          ['Whichever half contains the harder problem', false]],
        'Otherwise it is frontend and backend in sequence.'),
      mcq('The honest answer to "what was hardest" is almost always:',
        [['The seam — a wrong contract, a deploy ordering, a duplicated rule', true],
          ['The part of the stack you were least familiar with', false],
          ['Fitting the whole application into the time that was available', false],
          ['The authorisation model across both halves', false]],
        'It distinguishes building both halves from joining them.'),
    ],
  },
];
