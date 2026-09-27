/**
 * T3_FS_BOUNDARY and T3_FS_AUTH — eleven units. Year 3, full-stack track.
 * The remaining four topics of S18C are in year3ContentFullStackRest.
 *
 * ── DEPTH, NOT REPETITION ─────────────────────────────────────────────────────────────────
 *
 * This track has the hardest job of the nine, because on paper it is the frontend track plus
 * the backend track. It is not, and every unit here has to be about **the seam** — the thing
 * neither of the other tracks can see, because each of them only ever stands on one side of
 * it.
 *
 * THE_CONTRACT — the core API design unit designs an interface. This one is about the
 * agreement between two teams, or two halves of your own head, and what happens when one
 * side infers rather than agrees.
 *
 * WHAT_THE_CLIENT_KEEPS — the core caching unit is about avoiding work. This is about the
 * client holding a copy of the truth, which is a correctness question, not a speed one.
 *
 * CHANGING_BOTH_SIDES — the unit with no counterpart anywhere in the curriculum, and the
 * one that makes this track worth having. Two deployables, one change, and a minute in
 * between where one of them has shipped and the other has not.
 *
 * LOGIN_END_TO_END — the core auth units each cover one layer. This one follows a single
 * identity from a form through a token to a row, and asks what is checked at each step —
 * which is where the gaps are, because each layer assumes another one did it.
 *
 * NEVER_TRUST_THE_CLIENT — the core authorization unit says to check on the server. This
 * one is about why the client-side check is still worth writing, and what it is and is not
 * for.
 *
 * Attribution: BOUNDARY defaults to API_DESIGN with WHAT_THE_CLIENT_KEEPS on
 * STATE_MANAGEMENT. AUTH defaults to AUTHENTICATION with NEVER_TRUST_THE_CLIENT on
 * AUTHORIZATION.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const FULLSTACK_BUNDLES: PilotBundle[] = [
  /* ══ T3_FS_BOUNDARY ═════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_FS_BOUNDARY_THE_CONTRACT',
    notes: `The core API unit designed an interface. **This one is about the agreement** —
what the interface may assume and what the service promises — **and about the fact that when
nobody writes it down, both sides infer it, and they infer different things.**

## What a contract contains

**The shape.** Fields, types, which are optional. **Optional is the field everybody gets
wrong**: a field that is sometimes absent and sometimes null and sometimes an empty string is
three contracts pretending to be one.

**The meaning.** What is \`status\` allowed to be? An enumeration written down, not discovered
from the four values currently in the database.

**The errors.** Which failures are possible, how they are signalled, and what the client is
expected to do about each. **Most contracts specify the success case only, which is why most
interfaces handle failure badly.**

**The guarantees.** Is this list ordered? Is it complete? Can the same id appear twice? Is a
read after a write guaranteed to see it?

**And the limits.** Page size, rate, maximum payload.

## Written down, in one place

**In a schema both sides generate from**, if you can. Types on the client that come from the
server's definition remove an entire category of bug.

**In a document, otherwise**, beside the code.

**Not in a wiki nobody updates. Not in the client code, inferred from what it happens to
send. And not in one engineer's memory**, which is the default and the worst of the three.

## The assumptions that cause the bugs

**"This field is always present."** It is not, for the row created in 2019.

**"This list is short."** It is, for your test account.

**"This is ordered by date."** It is, until somebody adds an index.

**"Null means zero."** It means unknown, and treating them the same is how a report says a
customer spent nothing when nobody has checked.

**Each of these is a place where the client inferred a promise the server never made** —
and each is found in production rather than in review, because both sides look correct on
their own.

## Who owns it

**The service owns the contract**, because it has more callers than it can see.

**But the interface has a vote**, because a contract that is awkward to consume produces
workarounds on the client, and those workarounds become the real contract.

**Design it together, in a conversation, before either side is written.** Thirty minutes at
the start replaces a fortnight of small corrections.

## Testing it

**A contract test on both sides.** The server proves it produces what it promised; the client
proves it copes with everything the contract allows — **including the optional field being
absent, which is the case nobody writes.**

**And when they are generated from one schema**, the test is mostly free, which is the
strongest practical argument for doing it that way.`,
    mcqs: [
      mcq('The part of a contract everybody gets wrong is:',
        [['Optional, when a field is sometimes absent, sometimes null and sometimes empty', true],
          ['The types, which drift between the two sides over time', false],
          ['The error cases, which are rarely enumerated properly', false],
          ['The ordering guarantees on collections that are returned', false]],
        'Three contracts pretending to be one.'),
      mcq('Most interfaces handle failure badly because:',
        [['Most contracts specify the success case only', true],
          ['Error handling is harder to test than the happy path', false],
          ['Error responses vary between the services being called', false],
          ['Failures are rare enough to be deprioritised', false]],
        'Which failures are possible, how signalled, and what the client should do.'),
      mcq('"Null means zero" is dangerous because:',
        [['Null means unknown, and a report then says a customer spent nothing', true],
          ['Different languages represent null inconsistently', false],
          ['It produces type errors on the client side', false],
          ['Zero is a valid value that cannot then be distinguished', false]],
        'A place where the client inferred a promise the server never made.'),
      mcq('The interface gets a vote on the contract because:',
        [['A contract awkward to consume produces workarounds that become the real contract', true],
          ['The client team understands the user requirements better', false],
          ['Contracts designed by one side are usually incomplete', false],
          ['Consumers outnumber producers in most systems', false]],
        'The service owns it; design it together in a conversation.'),
    ],
    checkpoint: [
      mcq('The worst place for a contract to live is:',
        [['One engineer’s memory, which is also the default', true],
          ['A wiki page that nobody updates regularly', false],
          ['The client code, inferred from what it sends', false],
          ['A document that has drifted from the implementation', false]],
        'A schema both sides generate from is the best.'),
      mcq('The contract test case nobody writes is:',
        [['The optional field being absent', true],
          ['The list being returned empty', false],
          ['The error response for an invalid request', false],
          ['The page size limit being exceeded', false]],
        'The client must cope with everything the contract allows.'),
      mcq('Generating both sides from one schema is strongest because:',
        [['The contract test is then mostly free', true],
          ['It prevents the two sides from ever disagreeing', false],
          ['It removes the need for a written document', false],
          ['It makes breaking changes impossible to ship', false]],
        'And it removes an entire category of bug.'),
    ],
  },

  {
    unitCode: 'T3_FS_BOUNDARY_WHAT_THE_CLIENT_KEEPS',
    notes: `The core caching unit was about **avoiding work**. This is about **the client
holding a copy of the truth**, which is a correctness question rather than a speed one — and
the stale screen is the symptom.

## The three options for any piece of data

**Ask every time.** Always correct, always a round trip. **Right for anything where being
wrong matters more than being slow**: a balance, a permission, an availability.

**Cache with an expiry.** Correct within the expiry window, and you have decided how wrong
you are willing to be. **Right for most things**, and choosing the window is the actual
decision.

**Derive it.** Compute from what you already have. Free, and **correct only if the inputs
are** — a derived total from a stale list is a stale total wearing a disguise.

## Choosing

**Ask what it costs to be wrong.**

**"The user sees a count that is two minutes old"** — nothing. Cache it.

**"The user sees an item as available and it is not"** — a failed checkout and a support
ticket. Ask every time, or verify at the point of action.

**"The user sees a button they are not allowed to press"** — an error, and possibly a
security question if the server does not also check. **Which it must, always, whatever the
client caches.**

**That question answers this more reliably than any rule about data types**, because the same
field can deserve different treatment on different screens.

## Invalidating

**On your own writes.** After a change, the cached copy is known wrong. Update it or drop it.

**On time.** Simple, predictable, and enough for most things.

**On a signal**, if you have one. A push, a socket, a version header.

**And on navigation to a screen where being wrong matters** — a cheap rule that solves most
of the visible staleness with no infrastructure.

## Optimistic updates

**Apply the change immediately, reconcile with the server's answer.**

**The screen feels instant**, which is the point.

**And you must handle the reconciliation honestly.** If the server refuses, **the client must
visibly undo it** — a silently reverted optimistic update is worse than no optimistic update,
because the user believes something that is not true and has no way to discover it.

## The stale screen

**A user leaves a tab open for an hour and comes back.** Everything on it is an hour old.

**Refresh on focus** — one line, and it removes most of this class of complaint.

**Show when the data is from** for anything where age matters.

**And never let the client's copy be the authority.** The client's copy is a picture of the
truth, sometimes an old one. **Every decision that matters is made on the server, against the
server's data**, and the client's job is to be quick and to be honest about its age.`,
    mcqs: [
      mcq('The question that decides how to treat a piece of data is:',
        [['What it costs to be wrong about it', true],
          ['How often the underlying value changes', false],
          ['How expensive the request to fetch it is', false],
          ['Whether it is displayed or used in a calculation', false]],
        'The same field can deserve different treatment on different screens.'),
      mcq('A derived value is correct only if:',
        [['Its inputs are, so a total from a stale list is a stale total', true],
          ['It is recomputed on every render of the screen', false],
          ['The derivation is a pure function of the inputs', false],
          ['The inputs were fetched in a single request', false]],
        'A stale total wearing a disguise is still a stale total.'),
      mcq('A silently reverted optimistic update is:',
        [['Worse than no optimistic update, because the user cannot discover the truth', true],
          ['Acceptable when the failure rate is very low', false],
          ['Equivalent to the request having failed visibly', false],
          ['Preferable to showing an error for a transient failure', false]],
        'The client must visibly undo it.'),
      mcq('The client’s copy of the data is:',
        [['A picture of the truth, sometimes an old one, never the authority', true],
          ['Authoritative for the duration of the cache window', false],
          ['Equivalent to the server copy between invalidations', false],
          ['Reliable for decisions that do not change state', false]],
        'Every decision that matters is made on the server.'),
    ],
    checkpoint: [
      mcq('Refreshing on focus:',
        [['Is one line and removes most of the stale-tab class of complaint', true],
          ['Costs a round trip on every tab switch', false],
          ['Should be limited to screens showing volatile data only', false],
          ['Is less effective than a short cache expiry', false]],
        'A user leaves a tab open for an hour and comes back.'),
      mcq('An item shown as available when it is not costs:',
        [['A failed checkout and a support ticket, so verify at the point of action', true],
          ['A confusing message the user can recover from', false],
          ['Nothing much, provided the server rejects the purchase afterwards', false],
          ['A retry the client can perform automatically', false]],
        'Ask every time, or verify when it matters.'),
      mcq('Invalidating on navigation to a screen where being wrong matters:',
        [['Solves most visible staleness with no infrastructure', true],
          ['Duplicates what a short expiry already achieves', false],
          ['Requires tracking which screens depend on which data', false],
          ['Is only practical for a small number of screens', false]],
        'A cheap rule that needs no infrastructure behind it.'),
    ],
  },

  {
    unitCode: 'T3_FS_BOUNDARY_CHANGING_BOTH_SIDES',
    notes: `**Two deployables, one change, and a minute in between where one of them has
shipped and the other has not.** This unit has no counterpart anywhere else in the
curriculum, and it is the single thing that makes this track worth having.

## The problem

You want to rename a field, or add a required parameter, or change what a value means.

**Both sides must change. They cannot deploy at the same instant.**

**And even if they could, the user with the page already open is running the old client
against the new server** — for as long as they leave it open, which can be hours.

**That is the whole difficulty**, and every technique below is a way of arranging for both
versions to be correct at once.

## Expand, migrate, contract

**The technique that solves almost all of it.**

**Expand.** The server supports both the old way and the new way. Deploy. **Nothing breaks,
because nothing has been taken away.**

**Migrate.** The client moves to the new way. Deploy. Wait — **long enough for old clients to
be gone**, which is longer than you think if people keep tabs open.

**Contract.** The server removes the old way. Deploy.

**Three deployments, each safe on its own**, and never a moment when a live pair disagrees.

## The rules that make it work

**Adding an optional field is safe.** Old clients ignore it.

**Adding a required parameter is not.** Make it optional with a default, migrate, then
require it.

**Renaming is two changes.** Add the new name alongside, migrate, remove the old. **Never a
rename in one step**, which is the most common way this goes wrong and the most tempting
because it looks like one change.

**Changing a type or a meaning is worse than a rename.** A field that stays \`status\` but now
means something else will not be caught by anything — not the compiler, not the tests, not
the review. **Use a new field.**

**And removing anything requires knowing nobody uses it.** For a public interface, that means
a deprecation period. For your own client, it means a deploy and a wait.

## Feature flags across the seam

**The flag belongs on the server** and is read by the client.

**Otherwise the two halves can disagree about whether the feature is on**, which produces
failures nobody can reproduce because they depend on which half you ask.

## The database is the third deployable

**Schema changes follow the same pattern**, and they are the slowest part.

**Add a column** — safe, nullable.

**Backfill** — separate, resumable.

**Write to both** — for the period when old and new code are both running.

**Read from the new** — once the backfill is done.

**Drop the old** — much later, and only when nothing reads it.

**Never a migration that removes something in the same release as the code that stopped using
it**, because the rollback then has nowhere to go — which is exactly the case the next unit
is about.

## Knowing when it is safe to contract

**Log which version the caller used.** Then contract when the old one has been unused for a
week.

**Guessing is how you break the client somebody keeps open all day**, and that person is
usually the one who reports it loudest.`,
    mcqs: [
      mcq('The whole difficulty of a change across the seam is:',
        [['The user with the page already open runs the old client against the new server', true],
          ['The two deployments cannot be made at the same instant', false],
          ['The database schema has to change alongside both', false],
          ['Rollback must undo both halves together', false]],
        'For as long as they leave it open, which can be hours.'),
      mcq('The most common way this goes wrong is:',
        [['Renaming in one step, because it looks like one change', true],
          ['Adding a required parameter without a default', false],
          ['Removing a field before checking who uses it', false],
          ['Deploying the client before the server', false]],
        'Add the new name alongside, migrate, remove the old.'),
      mcq('Changing what a field means while keeping its name is worse than renaming because:',
        [['Nothing catches it — not the compiler, not the tests, not the review', true],
          ['It affects stored data as well as the interface', false],
          ['Clients cannot detect which meaning they received', false],
          ['It cannot be rolled back once data has been written', false]],
        'Use a new field, so the change is visible to everything.'),
      mcq('A feature flag spanning the seam belongs:',
        [['On the server, read by the client', true],
          ['On the client, so the interface controls its own behaviour', false],
          ['On both, set from the same configuration source', false],
          ['In the build, so each deploy is self-consistent', false]],
        'Otherwise the halves disagree and nobody can reproduce the failure.'),
    ],
    checkpoint: [
      mcq('Knowing when it is safe to contract requires:',
        [['Logging which version each caller used, then waiting a week of disuse', true],
          ['A deprecation notice with a published end date', false],
          ['Confirming that the client deploy has reached every single user', false],
          ['Checking the error rate after the migrate step', false]],
        'Guessing breaks the client somebody keeps open all day.'),
      mcq('A migration that removes a column in the same release as the code:',
        [['Leaves the rollback nowhere to go', true],
          ['Risks data loss if the deploy is interrupted', false],
          ['Requires downtime to apply safely', false],
          ['Is acceptable when the column is unused', false]],
        'The next unit is about exactly that case.'),
      mcq('Expand, migrate, contract works because:',
        [['Each of the three deployments is safe on its own', true],
          ['It reduces the total number of deployments needed', false],
          ['It keeps the client and server versions synchronised', false],
          ['It allows the change to be reverted at any point', false]],
        'Never a moment when a live pair disagrees.'),
    ],
  },

  {
    unitCode: 'T3_FS_BOUNDARY_DEBUGGING',
    notes: `Six failures that live in the seam, where neither half looks wrong on its own.

## 1. It works locally and not deployed

**Causes:** a different base URL; CORS; a proxy in development that does not exist in
production; an environment variable missing; a build-time value baked in wrongly.

**Diagnosis:** **the network tab, not the code.** What request actually went out, to where,
with what headers, and what came back. **Most seam bugs are answered in thirty seconds
there**, and most engineers read the code first.

## 2. The response is not what the client expected

**Causes:** a contract nobody wrote down; a field that is optional in reality and required in
the client's belief; a type that is a string in one place and a number in another.

**Diagnosis:** log the actual response body. **Not the parsed object — the body**, because
the parsing is sometimes where it goes wrong.

**Fix:** write the contract down and generate both sides from it.

## 3. It works for you and not for another user

**Causes:** different data; a permission; a row created before a column existed; an empty
list where you always have items.

**Diagnosis:** get their id and reproduce with their data in a safe environment. **Guessing
from a description costs more than asking for the id.**

## 4. It breaks for a minute after every deploy

**Cause:** the two halves disagreeing during the rollout, which is the previous unit's whole
subject.

**Diagnosis:** the errors have a start and an end and they line up with a deploy. **Check the
deploy time before anything else** — it is one glance and it saves an hour of reading code
that is not wrong.

## 5. The screen shows old data

**Causes:** a cache not invalidated after a write; an optimistic update not reconciled; a
stale tab; a response cached by something in between that you did not know about.

**Diagnosis:** force a hard refresh. **If it fixes it, it is a client cache; if it does not,
it is the server or something between you.** One action, and it halves the search space.

## 6. Authentication works until it does not

**Causes:** a token expiring mid-session with no refresh; a cookie attribute wrong for the
deployed domain; a clock difference; a refresh race.

**Covered in the auth topic**, which is next.

## The habits

**Network tab before code.**

**Log the body, not the object.**

**Ask for the user id.**

**Check the deploy time.**

**Hard refresh to split client from server.**

**And when the two halves disagree, find out which version each of them is**, because that is
the answer more often than anything in either codebase.`,
    mcqs: [
      mcq('Most seam bugs are answered in thirty seconds by:',
        [['The network tab, which most engineers open after reading the code', true],
          ['The server logs for the failing request', false],
          ['A comparison of the local and deployed configuration', false],
          ['Reproducing the request with a command-line client', false]],
        'What went out, to where, with what headers, and what came back.'),
      mcq('You should log the response body rather than the parsed object because:',
        [['The parsing is sometimes where it goes wrong', true],
          ['The object omits fields the client does not know about', false],
          ['Bodies are easier to compare against the contract', false],
          ['The parsed object may have been mutated already', false]],
        'Log the actual body.'),
      mcq('Errors that start and stop around a deploy point at:',
        [['The two halves disagreeing during the rollout', true],
          ['A configuration value that changed with the release', false],
          ['A cache warming after the instances restarted', false],
          ['A migration that ran during the deployment', false]],
        'Check the deploy time before reading any code.'),
      mcq('A hard refresh is useful diagnostically because:',
        [['If it fixes it the cause is a client cache, and if not it is beyond the client', true],
          ['It clears any stale authentication state', false],
          ['It forces the client to fetch the current build', false],
          ['It removes the effect of optimistic updates', false]],
        'One action, and it halves the search space.'),
    ],
    checkpoint: [
      mcq('When a bug affects another user and not you, the cheapest step is:',
        [['Ask for their id and reproduce with their data safely', true],
          ['Compare their permissions against your own', false],
          ['Check whether their account predates a recent change', false],
          ['Reproduce with an empty data set to find the edge', false]],
        'Guessing from a description costs more than asking.'),
      mcq('When the two halves disagree, the answer is more often:',
        [['Which version each of them is running', true],
          ['A defect in the more recently changed half', false],
          ['A contract assumption one side got wrong', false],
          ['A caching layer between the two of them', false]],
        'More often than anything in either codebase.'),
      mcq('A response cached by something in between:',
        [['Survives a hard refresh, which is what distinguishes it', true],
          ['Is cleared by the same action as a client cache', false],
          ['Only affects requests without authentication', false],
          ['Appears in the network tab as a cached entry', false]],
        'If the hard refresh does not fix it, look past the client.'),
    ],
  },

  {
    unitCode: 'T3_FS_BOUNDARY_PRACTICE',
    notes: `Two exercises on the mechanical parts of the seam: telling a breaking change from
a safe one, and choosing how the client should hold a piece of data.`,
    coding: [
      {
        title: 'Is this change breaking',
        description: `Read one proposed contract change per line as \`<field> <change>\`,
where change is one of:

- \`add_optional\` — a new optional field
- \`add_required\` — a new required parameter
- \`remove\` — a field taken away
- \`rename\` — the name changed in place
- \`retype\` — the type changed
- \`remean\` — the name and type stay, the meaning changes

Print \`<field> safe\` or \`<field> BREAKING\` for each. **Only \`add_optional\` is safe.**

Then \`breaking=<n>\`, and after it, for every \`remean\` line, \`SILENT <field>\` — because
that one breaks without anything noticing, which makes it the worst of the five.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# Only one of the six is safe. One of the breaking five is worse than the others.
`,
        language: 'python',
        tests: [
          { input: 'note add_optional\n', expectedOutput: 'note safe\nbreaking=0' },
          { input: 'total retype\n', expectedOutput: 'total BREAKING\nbreaking=1' },
          { input: 'status remean\n', expectedOutput: 'status BREAKING\nbreaking=1\nSILENT status' },
          { input: 'a add_optional\nb rename\nc remove\n', expectedOutput: 'a safe\nb BREAKING\nc BREAKING\nbreaking=2' },
          { input: 'x remean\ny remean\nz add_required\n', expectedOutput: 'x BREAKING\ny BREAKING\nz BREAKING\nbreaking=3\nSILENT x\nSILENT y', isHidden: true },
        ],
      },
      {
        title: 'How should the client hold it',
        description: `Read one piece of data per line as \`<name> <cost_of_wrong> <derivable>\`,
where cost is \`none\`, \`annoying\` or \`harmful\` and derivable is \`yes\` or \`no\`.

Print for each:

- cost \`harmful\` → \`<name> ask_every_time\`
- cost \`annoying\` → \`<name> cache_short\`
- cost \`none\` and derivable → \`<name> derive\`
- cost \`none\` and not derivable → \`<name> cache_long\`

Then \`ask=<n>\`.

**Cost is checked before derivability.** A harmful value that happens to be derivable from
stale inputs is still a stale harmful value, which is the disguise the notes warned about.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# Cost first. A derived value is only as fresh as its inputs.
`,
        language: 'python',
        tests: [
          { input: 'balance harmful no\n', expectedOutput: 'balance ask_every_time\nask=1' },
          { input: 'total none yes\n', expectedOutput: 'total derive\nask=0' },
          { input: 'name none no\n', expectedOutput: 'name cache_long\nask=0' },
          { input: 'count annoying yes\n', expectedOutput: 'count cache_short\nask=0' },
          { input: 'stock harmful yes\nlabel none no\n', expectedOutput: 'stock ask_every_time\nlabel cache_long\nask=1', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'The Front-Back Seam Practice',
      description: 'Classify contract changes and client data, then ship a change across a real seam.',
      instructions: `Complete both exercises, then:

1. For the first: \`remean\` is marked silent. Say what makes it worse than \`remove\`, which
   at least fails loudly, and what you would do instead.
2. For the second: cost is checked before derivability. Give a case where a derivable value
   must still be asked for every time.
3. For the second: \`cache_short\` needs a number. Say how you would choose it for a count
   that changes every few seconds.

**Then, in a real application** with a client and a server — yours, or one you build.

4. Write the contract for one endpoint: shape, meaning, errors, guarantees, limits.
5. **Include the optional fields explicitly**, and say what absent means for each.
6. Write a contract test on each side. The client test must cover the optional field being
   absent.
7. **Rename a field across the seam**, properly: expand, migrate, contract. Three deploys, or
   three commits you could deploy separately.
8. At each step, say what would happen if the other half had not deployed yet.
9. Add logging that records which version of the field each caller used.
10. Pick three pieces of data on one screen and classify each: ask, cache, derive. Justify
    each from the cost of being wrong.`,
      rubric: [
        { criterion: 'Breaking changes classified', description: 'All cases, with the silent one identified separately.', maxPoints: 15 },
        { criterion: 'Client holding classified', description: 'All cases, with cost checked before derivability.', maxPoints: 15 },
        { criterion: 'A written contract', description: 'Shape, meaning, errors, guarantees, limits, optional fields explicit.', maxPoints: 20 },
        { criterion: 'Contract tests both sides', description: 'Including the absent optional field on the client.', maxPoints: 15 },
        { criterion: 'A rename in three steps', description: 'Expand, migrate, contract, each separately deployable.', maxPoints: 20 },
        { criterion: 'Three data decisions justified', description: 'Each from the cost of being wrong on that screen.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]
`,
        tests: [
          { input: 'note add_optional\n', expectedOutput: 'note safe\nbreaking=0' },
          { input: 'total retype\n', expectedOutput: 'total BREAKING\nbreaking=1' },
          { input: 'status remean\n', expectedOutput: 'status BREAKING\nbreaking=1\nSILENT status' },
          { input: 'a add_optional\nb rename\nc remove\n', expectedOutput: 'a safe\nb BREAKING\nc BREAKING\nbreaking=2' },
          { input: 'x remean\ny remean\nz add_required\n', expectedOutput: 'x BREAKING\ny BREAKING\nz BREAKING\nbreaking=3\nSILENT x\nSILENT y', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('A changed meaning is worse than a removal because:',
        [['A removal fails loudly and a changed meaning fails silently', true],
          ['A removal can be detected by a contract test easily', false],
          ['A changed meaning affects stored data as well', false],
          ['Removals are always planned and announced', false]],
        'Use a new field instead.'),
      mcq('A derivable value that must still be asked for every time is one where:',
        [['Being wrong is harmful, so stale inputs make the derivation harmful too', true],
          ['The derivation is far too expensive to compute on the client side', false],
          ['The inputs are fetched from more than one endpoint', false],
          ['The derived value is displayed prominently', false]],
        'Cost before derivability.'),
      mcq('Choosing the expiry for a short cache means deciding:',
        [['How wrong you are willing to be, in seconds', true],
          ['How often the underlying value actually changes', false],
          ['How expensive the refetch is for the server', false],
          ['How long the user typically stays on the screen', false]],
        'Choosing the window is the actual decision.'),
    ],
  },

  {
    unitCode: 'T3_FS_BOUNDARY_MINI_PROJECT',
    notes: `Ship a change across the seam without a broken minute in between.

**The measurement is that at every point in your sequence, a live pair of old and new is
correct.** Not that the final state works — that at no intermediate moment could a user have
seen a failure.

Budget around two hours.`,
    assignment: {
      title: 'Mini Project — A Change With No Broken Minute',
      description: 'A written contract, then a breaking change shipped safely across client, server and schema.',
      instructions: `**Use** an application with a separate client and server. Yours, or a
small one you build first.

**Part one — write the contract**

1. One endpoint. Shape, types, which fields are optional and what absent means.
2. The meaning of every enumerated value.
3. The errors: which are possible, how signalled, what the client does with each.
4. The guarantees: ordering, completeness, duplicates, read-after-write.
5. The limits: page size, rate, maximum payload.

**Part two — test it both ways**

6. A server test proving it produces what the contract promises.
7. A client test proving it copes with everything the contract allows — **including the
   optional field absent and the list empty.**

**Part three — the change**

8. Choose a genuinely breaking change: rename a field, change a meaning, or make an optional
   parameter required.
9. **Plan it as expand, migrate, contract.** Write the plan before any code.
10. **For each of the three steps, say what an old client sees and what a new client sees.**
11. Implement all three as separately deployable commits.
12. Add logging recording which version each caller used.

**Part four — include the schema**

13. Make the change involve a column: add nullable, backfill, write both, read new, drop old.
14. Say which of those steps are reversible and which are not.

**Part five — prove there was no broken minute**

15. **Run the old client against the new server** at each step and record what happened.
16. Run the new client against the old server, and say whether that ordering is possible in
    your deployment.
17. **Name the single moment in your sequence that is most fragile**, and what would happen if
    a deploy failed exactly there.

**Part six — write it up**

18. How long you would wait between migrate and contract, and how you would know.
19. What you would do differently if the client were a mobile app you cannot force to update.
20. The one thing in your plan you are least confident about.

**Submit** the contract, both contract tests, the three-step plan, the commits, the old-client
transcript, and the write-up.`,
      rubric: [
        { criterion: 'A complete contract', description: 'Shape, meaning, errors, guarantees, limits, with absent defined.', maxPoints: 20 },
        { criterion: 'Contract tests both sides', description: 'Server proves the promise, client covers absent and empty.', maxPoints: 15 },
        { criterion: 'Expand, migrate, contract', description: 'Planned before code, three separately deployable commits.', maxPoints: 25 },
        { criterion: 'The schema included', description: 'Five steps, with reversibility stated for each.', maxPoints: 15 },
        { criterion: 'Old client against new server', description: 'Run at each step, with results recorded.', maxPoints: 15 },
        { criterion: 'The fragile moment named', description: 'One moment identified, with the consequence of failing there.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('The success condition for this project is:',
        [['A live pair of old and new is correct at every point in the sequence', true],
          ['The final state works across both halves', false],
          ['The written contract covers every single case the endpoint allows', false],
          ['All three deployments completed without error', false]],
        'At no intermediate moment could a user have seen a failure.'),
      mcq('A mobile client you cannot force to update changes the plan because:',
        [['The wait before contracting becomes months rather than days', true],
          ['The contract must be versioned rather than expanded', false],
          ['Optional fields behave differently on a device', false],
          ['Rollback of the client is not possible at all', false]],
        'Log which version each caller used and wait for disuse.'),
      mcq('Saying which schema steps are reversible matters because:',
        [['A drop has nowhere to roll back to, unlike the four before it', true],
          ['Reversible steps can be batched into one deployment', false],
          ['It determines the order the steps must run in', false],
          ['Backfills cannot be repeated once started', false]],
        'Never remove in the same release as the code that stopped using it.'),
    ],
  },

  /* ══ T3_FS_AUTH ═════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_FS_AUTH_LOGIN_END_TO_END',
    notes: `The core auth units each covered one layer. **This one follows a single identity
from a form, through a token, to a row** — and asks what is checked at each step, **because
each layer assumes another one did it and the gap is where the incidents are.**

## The journey

**1. The form.** Email and password over TLS. Validated for shape, not for correctness —
**"no account with that email" tells an attacker which emails exist**, so the message is the
same either way.

**2. The server checks.** Look up the user, compare the hash. **Constant-time comparison**,
and the same amount of work whether or not the user exists, or the timing tells them.

**3. A session begins.** A token, or a session id. Stored where the next unit's argument
applies.

**4. The client holds it.** In a cookie the browser manages, or in memory. **A cookie with
\`HttpOnly\`, \`Secure\` and \`SameSite\` is the default answer for a web client**, because script
cannot read it and that removes the largest class of token theft.

**5. Every request carries it.** Automatically, if it is a cookie.

**6. The server identifies the caller** from the token, on every request, with no exception.

**7. The server authorises the action.** Identity is not permission. **This is a separate
step and it is the one most often missing.**

**8. The query is scoped.** The identity reaches the data layer, and the row returned belongs
to the caller.

## Where the gaps are

**Between 6 and 7.** The server knows who you are and does the thing anyway. **The commonest
serious vulnerability in web applications**, and the access-control matrix from the security
track is how you find it.

**Between 7 and 8.** The service checks and then calls a repository that does not scope.
**One missing \`where\` clause is a data breach**, which is why scoping at the data layer is
worth the trouble.

**At 3.** A session that never expires, or expires but is not invalidated server-side on
logout.

**And at 1.** Rate limiting missing, so the login form is a password-guessing endpoint.

## What must be true at every layer

**The identity is never taken from the request body.** \`userId\` in a payload is a suggestion.
**It comes from the token, always.**

**The check is close to the data.** Not in a controller decorator that a new endpoint will
forget.

**And the failure is the same shape whatever went wrong.** Not found and not allowed should
look identical to the caller, or the error message is an enumeration tool.

## Logout, properly

**Clear the client's copy.**

**Invalidate server-side.** A token still valid after logout is not a logout — **it is a
logout-shaped animation**, and it is extremely common because the client-side half looks like
it worked.

**And on a password change, invalidate every session**, because the reason people change
passwords is that they think somebody has theirs.`,
    mcqs: [
      mcq('"No account with that email" is a problem because:',
        [['It tells an attacker which email addresses exist', true],
          ['It is unhelpful to a user who mistyped their address', false],
          ['It reveals that the lookup happened before the hash check', false],
          ['It differs from the message shown for a wrong password', false]],
        'The message is the same either way.'),
      mcq('The gap between identifying and authorising is:',
        [['The commonest serious vulnerability in web applications', true],
          ['Usually covered by the framework’s default behaviour', false],
          ['Only exploitable by an authenticated attacker', false],
          ['Detected reliably by automated scanning tools', false]],
        'The server knows who you are and does the thing anyway.'),
      mcq('A userId in the request body is:',
        [['A suggestion — the identity comes from the token, always', true],
          ['Acceptable when the server validates it against the token', false],
          ['Required for endpoints that act on behalf of others', false],
          ['Safe once the endpoint checks the caller is authenticated', false]],
        'Never take the identity from the request body.'),
      mcq('A token still valid after logout is:',
        [['A logout-shaped animation rather than a logout', true],
          ['Acceptable if the client has discarded its copy', false],
          ['A minor issue given the short token lifetime', false],
          ['Only a problem on shared devices', false]],
        'Extremely common, because the client-side half looks like it worked.'),
    ],
    checkpoint: [
      mcq('Scoping the query at the data layer is worth the trouble because:',
        [['One missing where clause is a data breach', true],
          ['It performs better than filtering in the service', false],
          ['It keeps the authorisation logic in one place', false],
          ['It removes the need for a check in the controller', false]],
        'The service can check and then call a repository that does not scope.'),
      mcq('Not found and not allowed should look identical because:',
        [['Otherwise the error message is an enumeration tool', true],
          ['It simplifies the client’s error handling', false],
          ['The distinction is rarely useful to a legitimate user', false],
          ['It avoids leaking which check failed internally', false]],
        'The same shape whatever went wrong.'),
      mcq('A password change should invalidate every session because:',
        [['People change passwords when they think somebody has theirs', true],
          ['The old sessions were issued against the old credential', false],
          ['It forces the user to verify the new password works', false],
          ['Session tokens are derived from the password hash', false]],
        'That is the reason the feature exists.'),
    ],
  },

  {
    unitCode: 'T3_FS_AUTH_NEVER_TRUST_THE_CLIENT',
    notes: `The core authorization unit said to check on the server. **This one is about why
the client-side check is still worth writing** — and about being precise about what it is
for, because the confusion between the two is where the vulnerabilities live.

## What the client cannot be trusted with

**Anything.** Every byte the client sends was chosen by whoever is holding it, and they can
send anything at all.

**Validation.** They can skip it.

**Permission.** A hidden button is still a callable endpoint.

**Price, quantity, identity, role.** All of it is a suggestion.

**And the code itself.** They can read it, change it, and run something else entirely. **A
check that exists only in code you shipped to them is not a check.**

## So why write the client check at all

**Because it is a different feature with the same name.**

**The client check is a user interface affordance.** It tells the user what they can do,
immediately, without a round trip. **Showing somebody a button that always fails is a bad
interface**, and that is a real problem worth solving.

**The server check is security.** It is the only one.

**Write both. Understand that only one of them protects anything** — and never, under any
circumstances, skip the server one because the client already checks.

## Where the confusion becomes a vulnerability

**"The form validates it."** The endpoint does not.

**"That button is only shown to admins."** The route is reachable by anybody who types it.

**"The client only sends valid statuses."** Somebody sends \`deleted\`.

**"We check the role in the router."** The API is called directly.

**Each of these is a real sentence engineers say**, and each describes a system where the
security control is running on the attacker's computer.

## Keeping the two in step

**Derive the client's view from the server's answer.** Send the permissions with the user;
the client renders from them.

**Do not reimplement the rules on the client** — two implementations of the same rules drift,
and the drift shows up as either a button that fails or a button that should not have been
there. **One of those is a bug and the other is an incident.**

## The rule for every input

**Validate on the server**, for shape, type, range and business rules.

**Re-derive anything you can** rather than accepting it. **A price sent by the client is not
a price; it is a request for a discount.**

**And check the identity from the token**, never from the payload, which the previous unit
made the central rule of the whole topic.

## The test

**Call your endpoint with a command-line client.**

**No browser, no form, no client code at all.** Send the wrong role, another user's id, a
negative quantity, a status that does not exist.

**Everything that only the interface prevented will be visible in ten minutes**, and this is
the single most useful thing in the unit because it converts an argument into a list.`,
    mcqs: [
      mcq('A check that exists only in the code you shipped to the client is:',
        [['Not a check, because they can read it, change it and run something else', true],
          ['A partial control that raises the cost of an attack', false],
          ['Adequate for inputs that are not security relevant', false],
          ['Effective against all but a determined attacker', false]],
        'Every byte the client sends was chosen by whoever holds it.'),
      mcq('The client-side check is worth writing because:',
        [['It is a user interface affordance, telling the user what they can do', true],
          ['It reduces load on the server for invalid requests', false],
          ['It catches most invalid input before it is sent', false],
          ['It provides defence in depth alongside the server check', false]],
        'Showing somebody a button that always fails is a bad interface.'),
      mcq('Reimplementing the rules on the client is a mistake because:',
        [['The two drift, giving either a failing button or one that should not exist', true],
          ['The client cannot access the data the rules depend on', false],
          ['It doubles the work when the rules change', false],
          ['Client code is visible to anybody who looks', false]],
        'Derive the client view from the server’s answer instead.'),
      mcq('A price sent by the client is:',
        [['Not a price but a request for a discount', true],
          ['Acceptable when the server verifies it against the catalogue', false],
          ['Necessary for the client to display a total', false],
          ['Safe if the request is signed or over TLS', false]],
        'Re-derive anything you can rather than accepting it.'),
    ],
    checkpoint: [
      mcq('The single most useful thing in this unit is:',
        [['Calling your endpoint from a command line with no client code at all', true],
          ['Writing the same validation rules on both sides', false],
          ['Sending permissions with the user for the client to render', false],
          ['Reviewing every endpoint for a missing authorisation check', false]],
        'It converts an argument into a list, in ten minutes.'),
      mcq('"That button is only shown to admins" describes:',
        [['A system where the security control runs on the attacker’s computer', true],
          ['A reasonable first layer of access control', false],
          ['Primarily an interface concern rather than a security issue', false],
          ['A control that works until the route is guessed', false]],
        'The route is reachable by anybody who types it.'),
      mcq('A drifted client rule producing a button that should not be there is:',
        [['An incident, where the failing-button case is only a bug', true],
          ['The same severity as a button that always fails', false],
          ['Harmless if the server still rejects the action', false],
          ['A validation problem rather than an authorisation one', false]],
        'One of those is a bug and the other is not.'),
    ],
  },

  {
    unitCode: 'T3_FS_AUTH_DEBUGGING',
    notes: `Six ways full-stack authentication fails, and the fastest way to tell them apart.

## 1. It works locally and not deployed

**Causes:** a cookie attribute wrong for the deployed domain — **\`Secure\` over plain HTTP, or
\`SameSite\` too strict for a cross-site setup, or a domain that does not match**; CORS not
allowing credentials; a proxy stripping the header.

**Diagnosis:** **the network tab, on the request that fails.** Is the cookie being sent at
all? That one observation splits this into two entirely different investigations.

## 2. Logged out at random

**Causes:** a token expiring with no refresh; **a refresh race where several parallel requests
each try to refresh and rotate each other out**; a server restart discarding in-memory
sessions; a load balancer sending you to an instance that does not know you.

**Diagnosis:** log every refresh with a timestamp and a request id. **The race is visible
immediately and invisible otherwise.**

## 3. Works for one user, not another

**Causes:** a role not what you assumed; data belonging to a different tenant; a permission
cached from a previous session; a row created before the permission model changed.

**Diagnosis:** print the identity and the permissions **as the server sees them**, on the
failing request. **Not what the client thinks they are**, which is the thing you already
believed.

## 4. Allowed when it should not be

**Cause:** a missing authorisation check between identification and action — **the gap the
login unit named.**

**Diagnosis:** the two-account test. As B, call every endpoint with A's identifiers.

**This is not a bug to find by reading.** It is a matrix to fill in, and the security track
said the same thing.

## 5. Denied when it should not be

**Causes:** a check too strict; the identity not reaching the data layer so the scope matches
nothing; a cached permission from before a role change.

**Diagnosis:** log the decision **and its reason**. "Denied" is not a diagnosis; **"denied
because the row's ownerId did not match the caller" is one**, and the difference is ten
minutes against an afternoon.

## 6. The session persists after logout

**Cause:** the client cleared its copy and the server did not invalidate.

**Diagnosis:** capture the token before logout, then use it afterwards. **If it still works,
that is the answer** — and this takes one minute to check and is very often the case.

## The habits

**Network tab: is the credential being sent?**

**Log every refresh with a request id.**

**Print identity and permissions as the server sees them.**

**Log the reason for every denial.**

**Fill the two-account matrix rather than reading the code.**

**And test the token after logout.**`,
    mcqs: [
      mcq('The observation that splits a deployed cookie problem into two investigations is:',
        [['Whether the cookie is being sent on the failing request at all', true],
          ['Whether the response sets a new cookie', false],
          ['Which attributes the cookie was issued with', false],
          ['Whether CORS allows credentials on that origin', false]],
        'The network tab, on the request that fails.'),
      mcq('A refresh race is:',
        [['Visible immediately with per-refresh logging and invisible otherwise', true],
          ['Detectable from the rate of authentication failures', false],
          ['Reproducible by expiring a token deliberately', false],
          ['Distinguishable from an expiry by the error returned', false]],
        'Log every refresh with a timestamp and a request id.'),
      mcq('When a user is denied something they should have, log:',
        [['The decision and its reason, naming which comparison failed', true],
          ['The full permission set the user holds', false],
          ['The endpoint and the identity that called it', false],
          ['The role required and the role presented', false]],
        '"Denied" is not a diagnosis.'),
      mcq('Finding a missing authorisation check is:',
        [['A matrix to fill in, not a bug to find by reading', true],
          ['A question of reviewing each endpoint’s decorators', false],
          ['Best done with an automated scanning tool', false],
          ['Usually revealed by the integration test suite', false]],
        'As B, call every endpoint with A’s identifiers.'),
    ],
    checkpoint: [
      mcq('Printing identity and permissions as the server sees them matters because:',
        [['What the client thinks they are is the thing you already believed', true],
          ['The client may be showing a cached copy', false],
          ['The server representation includes considerably more detail', false],
          ['It confirms the token was parsed correctly', false]],
        'On the failing request.'),
      mcq('Capturing the token before logout and using it afterwards:',
        [['Takes one minute and is very often the answer', true],
          ['Requires a tool that can replay requests', false],
          ['Only works if the token has not expired', false],
          ['Confirms whether the client cleared its copy', false]],
        'If it still works, the server never invalidated it.'),
      mcq('A load balancer sending you to another instance causes logouts when:',
        [['Sessions are held in memory rather than shared', true],
          ['The instances have different clock settings', false],
          ['The token was issued by a different instance', false],
          ['The instances run different application versions', false]],
        'One of several causes of being logged out at random.'),
    ],
  },

  {
    unitCode: 'T3_FS_AUTH_PRACTICE',
    notes: `Two exercises on the parts of full-stack auth that are pure logic: where an
identity may come from, and filling in the two-account matrix.`,
    coding: [
      {
        title: 'Where the identity came from',
        description: `Read one request per line as \`<endpoint> <source> <server_checked>\`,
where source is \`token\`, \`body\`, \`query\` or \`header_custom\`, and server_checked is
\`yes\` or \`no\`.

Print for each:

- source \`token\` and checked → \`<endpoint> ok\`
- source \`token\` and not checked → \`<endpoint> UNCHECKED\`
- any other source → \`<endpoint> UNTRUSTED <source>\`

Then \`safe=<n>\`, counting only the \`ok\` lines.

**An identity from anywhere but the token is untrusted whether or not the server checked
it**, because what was checked is a value the caller chose.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# Checking a value the caller chose does not make it an identity.
`,
        language: 'python',
        tests: [
          { input: '/me token yes\n', expectedOutput: '/me ok\nsafe=1' },
          { input: '/me token no\n', expectedOutput: '/me UNCHECKED\nsafe=0' },
          { input: '/order body yes\n', expectedOutput: '/order UNTRUSTED body\nsafe=0' },
          { input: '/x query no\n/y header_custom yes\n', expectedOutput: '/x UNTRUSTED query\n/y UNTRUSTED header_custom\nsafe=0' },
          { input: '/a token yes\n/b body yes\n/c token no\n', expectedOutput: '/a ok\n/b UNTRUSTED body\n/c UNCHECKED\nsafe=1', isHidden: true },
        ],
      },
      {
        title: 'The two-account matrix',
        description: `Read one result per line as \`<endpoint> <owner> <caller> <response>\`,
where response is \`allowed\` or \`denied\`.

A cell is correct when \`owner == caller\` and the response is \`allowed\`, or when they
differ and the response is \`denied\`.

Print for each:

- correct and allowed → \`<endpoint> pass\`
- correct and denied → \`<endpoint> pass_denied\`
- owner differs and allowed → \`<endpoint> BREACH\`
- owner matches and denied → \`<endpoint> BROKEN\`

Then \`breaches=<n>\`.

**Report the correctly-denied cells too.** A matrix showing only the failures does not say
how much was tested, which was the security track's whole argument about coverage.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# Report the correctly denied cells as well as the failures.
`,
        language: 'python',
        tests: [
          { input: '/o a a allowed\n', expectedOutput: '/o pass\nbreaches=0' },
          { input: '/o a b denied\n', expectedOutput: '/o pass_denied\nbreaches=0' },
          { input: '/o a b allowed\n', expectedOutput: '/o BREACH\nbreaches=1' },
          { input: '/o a a denied\n', expectedOutput: '/o BROKEN\nbreaches=0' },
          { input: '/x a b allowed\n/y c c allowed\n/z d e allowed\n', expectedOutput: '/x BREACH\n/y pass\n/z BREACH\nbreaches=2', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Full-Stack Auth Practice',
      description: 'Classify identity sources, fill a two-account matrix, then run both against a real application.',
      instructions: `Complete both exercises, then:

1. For the first: an identity from the body is untrusted even when checked. Say what "checked"
   can and cannot mean there, and give the one case where a body identifier is legitimate.
2. For the second: \`BROKEN\` is not counted as a breach. Say why it is still worth reporting,
   and who it affects.
3. For the second: say what a matrix of only failures hides from the reader.

**Then, on a real application** with authentication — yours, or one you can run locally.

4. Trace one login from the form to a database row. **Write down what is checked at each of
   the eight steps**, and name any step where nothing is.
5. Create two accounts with the same role and separate data.
6. **Fill the two-account matrix**: every endpoint, every method, identifiers in paths and in
   bodies. Record the correctly-denied cells.
7. For every endpoint, try sending the identity in the body as well as the token, with
   different values. Record what happened.
8. **Call every endpoint from a command line**, with no client code: wrong role, another
   user's id, a negative quantity, an invalid status.
9. Capture a token, log out, and use it. Record the result.
10. Change a password and check whether other sessions survived.`,
      rubric: [
        { criterion: 'Identity sources classified', description: 'All cases, with checked-but-untrusted handled correctly.', maxPoints: 15 },
        { criterion: 'Matrix cells classified', description: 'All cases, including correctly-denied and broken.', maxPoints: 15 },
        { criterion: 'A login traced end to end', description: 'Eight steps, what is checked at each, gaps named.', maxPoints: 20 },
        { criterion: 'A real two-account matrix', description: 'Every endpoint and method, paths and bodies, denials recorded.', maxPoints: 20 },
        { criterion: 'Called with no client code', description: 'Four hostile inputs per endpoint, results recorded.', maxPoints: 20 },
        { criterion: 'Logout and password change verified', description: 'Token tested after logout, other sessions checked after a change.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]
`,
        tests: [
          { input: '/me token yes\n', expectedOutput: '/me ok\nsafe=1' },
          { input: '/me token no\n', expectedOutput: '/me UNCHECKED\nsafe=0' },
          { input: '/order body yes\n', expectedOutput: '/order UNTRUSTED body\nsafe=0' },
          { input: '/x query no\n/y header_custom yes\n', expectedOutput: '/x UNTRUSTED query\n/y UNTRUSTED header_custom\nsafe=0' },
          { input: '/a token yes\n/b body yes\n/c token no\n', expectedOutput: '/a ok\n/b UNTRUSTED body\n/c UNCHECKED\nsafe=1', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('The one legitimate use of an identifier in the body is:',
        [['Naming who the action is about, after the token says who is acting', true],
          ['Allowing an administrator to act on another account', false],
          ['Reducing the number of path parameters an endpoint needs', false],
          ['Carrying the identity when no token is available yet', false]],
        'Acting identity from the token; subject identifier from the request, then authorised.'),
      mcq('A BROKEN cell is worth reporting because:',
        [['It affects a legitimate user who cannot do something they should', true],
          ['It usually indicates a missing authorisation rule somewhere', false],
          ['It may become a breach after the next change', false],
          ['It shows the matrix was filled in completely', false]],
        'Not a breach, and still a defect.'),
      mcq('A matrix showing only failures hides:',
        [['How much was actually tested', true],
          ['Which endpoints have no authorisation at all', false],
          ['Whether the accounts were configured correctly', false],
          ['The severity of each individual failure', false]],
        'The security track made the same argument about coverage.'),
    ],
  },

  {
    unitCode: 'T3_FS_AUTH_MINI_PROJECT',
    notes: `Build authentication across both halves and prove the client cannot be trusted
into anything.

**The measurement is the command-line transcript.** Every endpoint, called with no client
code at all, with hostile inputs — and a matrix showing what was denied as well as what was
allowed.

Budget around two hours.`,
    assignment: {
      title: 'Mini Project — Auth That Does Not Depend on the Client',
      description: 'A login end to end, an authorisation layer at the data boundary, and a transcript proving it.',
      instructions: `**Build or use** an application with a client, a server, and at least
five endpoints that act on owned data.

**Part one — the login**

1. A form posting over TLS, with the same message whether the email exists or not.
2. Server-side comparison that takes the same time whether or not the user exists.
3. Rate limiting on the login endpoint. Say what limit and why.
4. A session token in a cookie with \`HttpOnly\`, \`Secure\` and \`SameSite\` set, or say why
   not for your client.

**Part two — identity all the way down**

5. Identity taken from the token on every request, **never from the body.**
6. Authorisation as a separate step from identification, **after** it, on every endpoint.
7. **Scoping at the data layer**, so the query cannot return another caller's row.
8. Not-found and not-allowed returning identical responses.

**Part three — the client half**

9. Permissions sent with the user; the client renders from them.
10. **No authorisation rules reimplemented on the client.** Say how you ensured that.
11. A client-side validation on one form, plus the server validation it does not replace.

**Part four — prove it**

12. Two accounts, same role, separate data.
13. **The full two-account matrix**: every endpoint, every method, paths and bodies. Record
    the correctly-denied cells.
14. **The command-line transcript**: every endpoint with no client code — wrong role, another
    user's id, a negative number, an invalid enumerated value, the identity in the body.
15. Capture a token, log out, use it. Record the result and fix it if it works.
16. Change a password and check every other session.

**Part five — write it up**

17. Which step of the eight had nothing checked at it before you started?
18. What did the command-line transcript find that reading the code did not?
19. **The one endpoint you are least confident about**, and why.

**Submit** the code, the matrix including denials, the full command-line transcript, and the
write-up.`,
      rubric: [
        { criterion: 'A login with the details right', description: 'Uniform message, uniform timing, rate limit, cookie attributes justified.', maxPoints: 20 },
        { criterion: 'Identity from the token, scoped at the data layer', description: 'Never from the body, authorisation separate, queries scoped.', maxPoints: 25 },
        { criterion: 'A client that renders permissions', description: 'Derived from the server, no rules reimplemented, with the method stated.', maxPoints: 15 },
        { criterion: 'A complete two-account matrix', description: 'Every endpoint and method, paths and bodies, denials recorded.', maxPoints: 20 },
        { criterion: 'A command-line transcript', description: 'Five hostile inputs per endpoint, with results.', maxPoints: 15 },
        { criterion: 'Logout and password change', description: 'Token tested after logout, sessions checked after a change, fixes made.', maxPoints: 5 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('What this mini project turns on is:',
        [['The command-line transcript, with hostile inputs and no client code', true],
          ['The login working correctly end to end', false],
          ['Every one of the endpoints having its own authorisation check', false],
          ['The two-account matrix being complete', false]],
        'Plus a matrix showing what was denied as well as allowed.'),
      mcq('Ensuring no authorisation rules are reimplemented on the client requires:',
        [['Deriving what the client shows from permissions the server sends', true],
          ['Keeping the two implementations under one shared module', false],
          ['Testing the client rules against the server rules', false],
          ['Reviewing the client code for permission conditionals', false]],
        'Two implementations of the same rules drift.'),
      mcq('Asking what the transcript found that reading the code did not:',
        [['Is the point of the exercise, because reading misses missing checks', true],
          ['Measures how thorough the code review was', false],
          ['Identifies which endpoints lack test coverage', false],
          ['Shows whether the client-side validation was really sufficient', false]],
        'A missing check is not visible in the code that is there.'),
    ],
  },
];
