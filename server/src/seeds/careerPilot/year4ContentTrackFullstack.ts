/**
 * The Full-Stack Engineering specialization track — sixteen units. Module P08.
 *
 * ── THE TRAP THIS TRACK HAS TO AVOID ──────────────────────────────────────────────────────
 *
 * Full stack reads as "backend plus frontend", and a track authored that way would be a shallower
 * version of P06 followed by a shallower version of P07 — which is exactly the criticism the role
 * attracts and exactly what makes a full-stack candidate lose to a specialist in either round.
 *
 * So this track is about the SEAM, and almost nothing else. Where the line between client and
 * server goes, what crosses it, what happens when the two sides disagree, and how a change is
 * made to both halves without breaking the running system in between.
 *
 * That is genuinely the hardest part and genuinely nobody else's job. A backend engineer owns
 * their contract and a frontend engineer consumes it; the person who owns both is the only one
 * who can get the boundary wrong in a way that nobody else will notice.
 *
 * ── WHAT THE STUDENT SHOULD BE ABLE TO DO AT THE END ──────────────────────────────────────
 *
 * Trace one user action through every layer and back, out loud, and say at each boundary what is
 * trusted, what is validated, and what happens if the next layer is unavailable. That single
 * walkthrough is the track's deliverable and the thing the specialization interview is built on.
 *
 * Attribution: T4_FULLSTACK_DEPTH defaults to SOFTWARE_ARCHITECTURE with the boundary unit on
 * API_DESIGN; T4_FULLSTACK_BUILD to REST_APIS with the contract unit on AUTHENTICATION;
 * T4_FULLSTACK_QUALITY to AUTOMATED_TESTING with its harder fault on DEBUGGING and the securing
 * unit on WEB_SECURITY; T4_FULLSTACK_PROOF to SOFTWARE_ARCHITECTURE.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_FULLSTACK_BUNDLES: PilotBundle[] = [
  /* ══ T4_FULLSTACK_DEPTH ═════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_FULLSTACK_DEPTH_DRAWING_THE_LINE',
    notes: `**What belongs on the server**, and the cost of getting the line wrong in either
direction.

## Four things that are never negotiable

**Validation that matters.** The client may validate for convenience; the server validates for
correctness, because the client is under the caller's control.

**Authorization.** Always. A hidden button is presentation.

**Business rules with consequences.** A price, a discount, a total, an eligibility decision.
Anything the client computes, the client can compute differently.

**Secrets.** Anything shipped to a browser or a device is public.

## What belongs on the client

**Presentation.** What is shown, how it is arranged, what is emphasised.

**Immediate feedback.** Validation for convenience, so the user is not told about a typo after a
round trip.

**Ephemeral interaction state.** Which panel is open, what is selected, scroll position.

## Getting it wrong towards the client

**The recognisable failure:** a price calculated in the browser and posted to the server, which
stores it. Every one of these is a real vulnerability and they are common in student work.

## Getting it wrong towards the server

**Less dangerous and still costly.** A round trip for something that should have been instant.
Every keystroke validated remotely. An interface that feels sluggish for reasons a user cannot
name and will not report.

## The rule that resolves most cases

**Compute on the client for the user's benefit; compute on the server for the system's truth.**
Both may compute the same thing, and only one of them is believed.`,
    mcqs: [
      mcq('A price calculated in the browser and posted to the server is a vulnerability because the client:',
        [['Is under the caller’s control entirely', true],
         ['May be running an outdated version of the code', false],
         ['Cannot access the current pricing rules reliably', false],
         ['Computes floating point differently across browsers', false]],
        'Anything the client computes it can compute differently. The value arrives as an assertion the server has no reason to accept.'),
      mcq('Both client and server computing the same value is acceptable provided:',
        [['Only one of them is believed', true],
         ['The two implementations are kept in sync', false],
         ['The client version is recomputed on each render', false],
         ['The server version is cached for performance', false]],
        'Duplication for the user’s benefit is fine. The failure is treating the client’s answer as authoritative rather than as a preview.'),
    ],
    checkpoint: [
      mcq('The rule that resolves most boundary cases is to compute on the client for the user’s benefit and on the server for:',
        [['The system’s truth', true],
         ['Operations that require database access', false],
         ['Anything that takes longer than a moment', false],
         ['Values that several clients will need to share', false]],
        'It separates the purpose rather than the operation, which is why it answers cases that a list of operations does not cover.'),
      mcq('Getting the line wrong towards the server is less dangerous but still costly, producing an interface that feels sluggish for reasons a user:',
        [['Cannot name and will not report', true],
         ['Will attribute to their own connection speed', false],
         ['Can work around by refreshing the page again', false],
         ['Notices only on the slowest of their devices', false]],
        'The degradation is diffuse rather than a visible fault, so it depresses the experience without ever producing a ticket anybody can act on.'),
    ],
  },
  {
    unitCode: 'T4_FULLSTACK_DEPTH_THE_SHAPE_OF_THE_WHOLE',
    notes: `**One user action, all the way through, and back.** This is the track's central skill
and the thing the specialization interview opens with.

## The path

**The interaction.** A click. What the client does before anything leaves — optimistic update,
disabled button, loading state.

**The request.** Method, path, body, headers. What is being asserted and what is being asked for.

**The boundary.** Authentication, then validation, then authorization. **In that order**, because
you cannot authorise before you know who it is, and validating first means the authorisation check
is working with a known shape.

**The logic.** The rule, in domain terms.

**The data.** The query, the transaction, what must not half-happen.

**Back out.** The response shape, the status, the error case.

**Back in the client.** State updated, render, and what the user now sees — including if it failed.

## What to be able to say at each boundary

**What is trusted here?** Less at each step outward.

**What is validated here?** And the answer must not be "the previous layer did it", which is how a
layer becomes unprotected when it acquires a second caller.

**What if the next layer is unavailable?** Every boundary is a place something can be down.

## Why this walkthrough is the deliverable

**Because it is the only thing a full-stack candidate can do that neither specialist can.** A
backend engineer stops at their contract; a frontend engineer starts from it. Owning the whole
path is the role, and demonstrating it takes ninety seconds.`,
    mcqs: [
      mcq('At the boundary, the correct order is authentication, validation, then authorization, because you cannot authorise before:',
        [['You know who the caller is', true],
         ['The business logic has been executed', false],
         ['The database transaction has been opened', false],
         ['The response shape has been determined', false]],
        'Authorization is a question about a known identity acting on a known object, so identity must be established and the request shape known first.'),
      mcq('Answering "what is validated here" with "the previous layer did it" is how a layer becomes unprotected when it:',
        [['Acquires a second caller', true],
         ['Is refactored into smaller functions later', false],
         ['Starts handling a larger volume of requests', false],
         ['Is deployed separately from the previous layer', false]],
        'The guarantee lived in one caller. A job, an import or a second endpoint reaching the same layer arrives without it.'),
    ],
    checkpoint: [
      mcq('The walkthrough is the track’s deliverable because it is the only thing a full-stack candidate can do that:',
        [['Neither specialist can', true],
         ['Requires no preparation before an interview', false],
         ['Demonstrates knowledge of several frameworks', false],
         ['Can be completed within a short time limit', false]],
        'A backend engineer stops at the contract and a frontend engineer starts from it. Owning the whole path is what the role uniquely offers.'),
      mcq('"What if the next layer is unavailable" must be answerable at every boundary because each boundary is:',
        [['A place something can be down', true],
         ['Where the request is most likely to be slow', false],
         ['Subject to a different timeout configuration', false],
         ['Owned by a different team in a larger company', false]],
        'Every hop is a dependency that can fail independently, and a path described as though each layer always answers is a diagram rather than a design.'),
    ],
  },
  {
    unitCode: 'T4_FULLSTACK_DEPTH_PRACTICE',
    notes: `**Applying both ideas to an application you did not build.**

## The drill

**Take an existing full-stack application.** Produce:

**One complete path**, traced through every layer and back, written down.

**The boundary table:** at each hop, what is trusted, what is validated, what happens if the next
layer is unavailable.

**One thing on the wrong side of the line**, and what it costs. Either a rule the client computes
and the server believes, or a round trip that should have been local.

## The second half

**Trace a second path that fails.** A validation error, an unavailable dependency, a timeout.
Follow it back out to what the user sees.

**That second trace is where applications are actually weak**, because the success path gets
designed and the failure path gets whatever the framework does by default.

## What good looks like

**You can say what a user sees when the database is down**, without looking. If the answer is "I
do not know", that is the finding, and it is the commonest one.

## Why trace rather than read

**Because layers read as correct individually.** The fault is almost always a disagreement between
two of them, and disagreement is only visible when you follow one value across the boundary
rather than reading each side.`,
    mcqs: [
      mcq('Tracing a path that fails is where applications are actually weak because the failure path gets:',
        [['Whatever the framework does by default', true],
         ['Less testing than the success path receives', false],
         ['Implemented last, when time is running out', false],
         ['Designed by somebody other than the author', false]],
        'Nobody chose the behaviour. The default propagates outward and the user sees whatever it happens to produce, which is rarely useful.'),
      mcq('Tracing rather than reading is necessary because layers:',
        [['Read as correct individually', true],
         ['Are written in different languages sometimes', false],
         ['Cannot be understood without their own tests', false],
         ['Change more often than the boundaries do', false]],
        'The fault is a disagreement between two layers, which is invisible in either one and only appears when a value is followed across the boundary.'),
    ],
    checkpoint: [
      mcq('Not knowing what a user sees when the database is down is described as:',
        [['The finding, and the commonest one', true],
         ['An acceptable gap for a student project', false],
         ['A question for the operations team to answer', false],
         ['Something the framework documentation covers', false]],
        'It means nobody decided. The behaviour exists and was inherited rather than chosen, which is precisely what the trace is looking for.'),
      mcq('The boundary table records what is trusted, what is validated, and:',
        [['What happens if the next layer is unavailable', true],
         ['Which team is responsible for that layer', false],
         ['How long each hop typically takes to complete', false],
         ['Which tests cover the boundary in question', false]],
        'Trust, validation and failure behaviour are the three properties that define a boundary, and the third is the one usually left undecided.'),
    ],
  },
  {
    unitCode: 'T4_FULLSTACK_DEPTH_INTERVIEW_QUESTION',
    notes: `**"Walk me through what happens when a user clicks this button."**

## Why it is the full-stack opening question

**Because it is the role, compressed.** Ninety seconds of answer establishes whether somebody owns
a whole path or has worked on two halves of different ones.

## The answer, in order

**The client before the request.** Disabled button, optimistic update, loading state.

**The request itself.** Method, path, what is in the body, what is in the headers.

**The boundary.** Authentication, validation, authorization — and say them in that order,
deliberately, because the order is a real decision.

**The logic and the data.** The rule, the transaction, what must not half-happen.

**The response and the client.** Status, shape, state update, render.

**And the failure branch**, without being asked. What the user sees when it fails, and what they
can do about it.

## The follow-ups

**"Where would you put the validation?"** Both, with different purposes. Convenience on the
client, correctness on the server.

**"The user double-clicks."** Disable the button, and make the operation idempotent — because the
button is not a guarantee and a double request can arrive anyway.

**"The API changes shape. What breaks?"** Additive is safe, removal and rename are not, and the
client should ignore fields it does not know.

## The depth marker

**Volunteering the failure branch.** Most candidates describe a path where everything works, and
the interviewer then has to ask. Saying it unprompted is the clearest available signal that the
whole path is genuinely owned.

## What loses marks

**Stopping at the API boundary in either direction.** It is the specific weakness the role is
suspected of, and demonstrating it in the opening answer is hard to recover from.`,
    mcqs: [
      mcq('Stopping at the API boundary in either direction is damaging because it is:',
        [['The specific weakness the role is suspected of', true],
         ['A sign the candidate prefers one half of the stack', false],
         ['Evidence that the project was built by a team', false],
         ['Likely to make the answer too short overall', false]],
        'Full stack attracts the criticism of being shallow at both ends. Demonstrating the boundary stop in the opening answer confirms it immediately.'),
      mcq('Asked what happens when the user double-clicks, disabling the button is insufficient because:',
        [['A double request can arrive anyway', true],
         ['Disabling it harms the accessibility of the form', false],
         ['The button may be re-enabled before the response', false],
         ['Some browsers ignore the disabled attribute here', false]],
        'The client is not a guarantee. The server must make the operation idempotent, because the request can be repeated by a retry or by a crafted call.'),
    ],
    checkpoint: [
      mcq('The clearest available signal that the whole path is genuinely owned is volunteering:',
        [['The failure branch, without being asked', true],
         ['The names of the frameworks used at each layer', false],
         ['The performance characteristics of each hop', false],
         ['Which parts were written by somebody else', false]],
        'Most candidates describe only the working path. Covering what the user sees on failure shows the path was designed rather than assembled.'),
      mcq('Asked where validation belongs, the correct answer is both, with:',
        [['Different purposes at each of the two', true],
         ['The client duplicating the server’s rules exactly', false],
         ['The server validating only what the client missed', false],
         ['The stricter of the two applied on the client', false]],
        'Convenience on the client and correctness on the server. Framing them as the same check in two places misses why only one is authoritative.'),
    ],
  },

  /* ══ T4_FULLSTACK_BUILD ═════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_FULLSTACK_BUILD_A_FEATURE_THROUGH_EVERY_LAYER',
    notes: `**Schema, endpoint, client call, rendering, error handling — as one piece of work
rather than four.**

## Why building it as one piece matters

**Because the seams are where the time goes**, and building each layer separately hides them until
the end, when all of them surface at once and none can be isolated.

## The order that keeps it verifiable

**Schema, and look at the rows.** **Endpoint, and call it by hand.** **Client call, and log what
came back.** **Render.** **Then the error paths.**

**Checking at each step** means a mismatch is found at the step that introduced it.

## Decide the contract first

**Write down the response shape before building either side.** Three lines is enough. Its value is
that it exists outside your head, where each side can be compared against it.

**The commonest seam bug in student work is a field name differing by one character**, and it
happens because each side was written from memory of the same intention.

## The error paths are half the work

**Not an afterthought.** For every request: what does the server return when the input is bad, when
the object is missing, when the caller is not permitted, and when something unexpected fails —
and what does the client show for each.

**Four answers, decided deliberately**, or the framework decides and the user gets a stack trace
or an infinite spinner.

## What "done" means

**The feature works, and the four error cases each show something a user can act on.**

**And the boundary holds:** another user cannot reach the object by changing an identifier, and
the server does not believe anything the client computed that matters.`,
    mcqs: [
      mcq('Building each layer separately hides the seams until the end, when all of them surface at once and:',
        [['None can be isolated', true],
         ['The deadline has usually already passed', false],
         ['The layers must be rewritten from scratch', false],
         ['The tests for each layer still pass individually', false]],
        'Several simultaneous mismatches cannot be attributed to any one change, so the debugging is a search across the whole feature rather than a step.'),
      mcq('The commonest seam bug in student work is a field name differing by one character, which happens because each side was written:',
        [['From memory of the same intention', true],
         ['By a different person on the project', false],
         ['Before the schema had been finalised', false],
         ['Using different naming conventions entirely', false]],
        'Both authors intended the same field and one typed it differently. Writing the contract down first is what removes the reliance on memory.'),
    ],
    checkpoint: [
      mcq('The four error cases to decide deliberately are bad input, missing object, not permitted, and:',
        [['Something unexpected failing', true],
         ['The request timing out at the client', false],
         ['The user cancelling the operation midway', false],
         ['A conflicting update from another caller', false]],
        'The unexpected case is the one that otherwise returns a stack trace or produces an infinite spinner, because nobody chose what it should do.'),
      mcq('"Done" includes that the boundary holds, meaning another user cannot reach the object by changing an identifier and:',
        [['The server believes nothing the client computed that matters', true],
         ['The client validates every field before sending it', false],
         ['The response shape matches the written contract', false],
         ['Each layer has its own tests covering the path', false]],
        'Those two are the boundary failures with consequences. The others are quality properties rather than the line between trusted and untrusted.'),
    ],
  },
  {
    unitCode: 'T4_FULLSTACK_BUILD_CONTRACTS_BETWEEN_HALVES',
    notes: `**Keeping the client and the server agreeing about shapes**, and what happens the day
they stop.

## The contract is real whether or not it is written

**Every field the client reads is part of it.** Removing one, renaming one, or changing its type
breaks whoever was reading it — and you will not find all of them by searching, because clients
can be old, cached, or somebody else's.

## The three changes, ranked

**Adding a field is safe.** Tolerant clients ignore what they do not recognise.

**Making an optional field required is a breaking change for callers**, and is frequently made
without anybody noticing it is one.

**Removing or renaming breaks readers**, always.

## How to change safely

**Add the new, keep the old, migrate the readers, then remove the old.** Four steps, each
shippable, and at no point is anything broken.

**The temptation is to do it in one deploy** because both halves are yours. That works when there
is exactly one client and it deploys atomically with the server, and **neither is true once there
is a mobile app, a cached bundle, or a second consumer.**

## Write the contract down

**A schema, a type definition, generated types, or three lines in a comment.** The mechanism
matters far less than there being one artefact both sides are checked against.

**Generated types are the strongest version** because disagreement becomes a compile error rather
than a runtime surprise — and the surprise otherwise happens in front of a user.

## Versioning

**Only when you must remove or rename.** A version per change produces a surface nobody can
maintain; the additive path avoids almost all of them.`,
    mcqs: [
      mcq('Making an optional field required is a breaking change that is frequently made without anybody noticing because it:',
        [['Does not change the shape, only the expectation', true],
         ['Is applied gradually across the client versions', false],
         ['Affects only clients that omit the field already', false],
         ['Is reported by the type checker as compatible', false]],
        'The field already existed, so nothing looks removed. Callers that omitted it begin failing validation on a request that previously worked.'),
      mcq('Changing both halves in one deploy works only when there is exactly one client and it deploys atomically with the server, which stops being true once there is:',
        [['A mobile app, a cached bundle or a second consumer', true],
         ['More than one developer working on the code', false],
         ['A staging environment between the two of them', false],
         ['Any caching layer in front of the API itself', false]],
        'Each of those means an old client exists after the server has changed, so the two halves are live simultaneously in incompatible versions.'),
    ],
    checkpoint: [
      mcq('Generated types are the strongest way to record a contract because disagreement becomes:',
        [['A compile error rather than a runtime surprise', true],
         ['Visible in the API documentation automatically', false],
         ['Impossible, since both sides share one definition', false],
         ['Detectable by the test suite on every change', false]],
        'The failure moves from production, in front of a user, to the build, in front of the author who introduced it.'),
      mcq('Versioning should be reserved for removals and renames because a version per change produces:',
        [['A surface nobody can maintain', true],
         ['Confusion about which version clients should use', false],
         ['Duplicate code paths for every endpoint involved', false],
         ['A performance cost on the routing layer itself', false]],
        'Each version must be supported indefinitely. The additive path avoids nearly all of them, which keeps the number of live versions small.'),
    ],
  },
  {
    unitCode: 'T4_FULLSTACK_BUILD_MINI_PROJECT',
    notes: `**An application a user could actually use, from schema to screen.**

## The brief

**Authentication. Persistence. A real interface.** Three or four screens over a schema with at
least one relationship.

**Small in scope and complete in depth** — the requirement is that every layer is genuinely
present and that the seams between them hold.

## What must be demonstrable

**The walkthrough.** You can trace one action through every layer and back, out loud, including
what is trusted and validated at each boundary.

**The four error cases**, each showing the user something they can act on.

**The boundary holds.** Another user's identifier returns nothing. Nothing the client computed
that matters is believed.

**A contract exists** — written down somewhere, with both sides checked against it.

**An additive change made safely.** Add a field, deploy the server, then the client, and show
nothing broke in between.

## That last one is the exercise

**Most students change both halves at once and never learn why that is a habit that fails.** Doing
it in the safe order on a project with one client feels unnecessary, which is exactly why it is
worth doing once deliberately.

## What to submit

**The application, the written contract, the walkthrough as a page of text, and a note on the
seam that gave you the most trouble** — with what the cause turned out to be.`,
    assignment: {
      title: 'An application, end to end',
      description: 'Build a small authenticated application across every layer, with the boundary holding, a written contract, and one additive change made in the safe order.',
      instructions: `Build three or four screens over a schema with at least one relationship,
with authentication, persistence and a real interface. Small in scope and complete in depth.

**Write the contract down** — a schema, generated types, or three lines per response — and check
both sides against it.

**Handle four error cases** for each request: bad input, missing object, not permitted, and
something unexpected. Each must show the user something they can act on.

**Make the boundary hold.** Another user's identifier returns nothing, and nothing the client
computed that matters is believed by the server.

**Then make an additive change in the safe order**: add a field, deploy the server, then the
client, and show that nothing broke in between. Most students change both halves at once and never
learn why that habit fails — doing it properly once on a single-client project feels unnecessary,
which is exactly why it is worth doing deliberately.

**Submit:** the application, the written contract, a page tracing one action through every layer
and back including what is trusted and validated at each boundary, and a note on the seam that
gave you the most trouble and what the cause turned out to be.`,
      rubric: [
        { criterion: 'The walkthrough is complete', description: 'One action is traced through every layer and back, naming what is trusted and validated at each boundary.', maxPoints: 30 },
        { criterion: 'The boundary holds', description: 'Another user’s identifier returns nothing, and no client-computed value with consequences is trusted.', maxPoints: 25 },
        { criterion: 'A contract exists and is checked', description: 'The response shape is recorded somewhere both sides are verified against, not only in the code.', maxPoints: 20 },
        { criterion: 'The additive change was staged', description: 'The field was added server-side first and the client updated afterwards, with evidence nothing broke between.', maxPoints: 25 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('Making an additive change in the safe order on a single-client project feels unnecessary, which is exactly why it is:',
        [['Worth doing once deliberately', true],
         ['Best deferred until a second client exists', false],
         ['Usually skipped by experienced developers too', false],
         ['A poor use of time in a student project', false]],
        'The habit has to exist before the situation that requires it. Learning it when a stale client is already in the field is the expensive way.'),
      mcq('"Small in scope and complete in depth" means the requirement is that every layer is genuinely present and that:',
        [['The seams between them hold', true],
         ['Each layer has its own dedicated tests', false],
         ['The application could be deployed publicly', false],
         ['The interface covers every user journey', false]],
        'The seams are what the track is about. Depth here means the boundaries were designed rather than that any single layer is large.'),
    ],
  },
  {
    unitCode: 'T4_FULLSTACK_BUILD_DEBUGGING',
    notes: `**A fault visible in the interface and caused somewhere else.** Locating it without
guessing.

## Bisect the stack, do not read it

**Three observations, in order, each about a minute:**

**What is in the database?** Query it directly. Is the data what you expect?

**What does the endpoint return?** curl it. Does it match what the data says it should?

**What does the client receive?** Log the raw response before any parsing.

**After those three you know which boundary is wrong**, and you have read no code.

## What each answer tells you

**Data wrong** — the fault is at or below the write path, and the read path is innocent.

**Data right, response wrong** — serialisation, a query filter, or an authorization scope
silently excluding rows.

**Response right, display wrong** — a field name, a type, or client-side state.

## The seam faults, specifically

**A type that changed crossing the boundary.** A number that became a string through JSON, a date
that became text. The client compares it and the comparison is wrong without an error.

**A field the server stopped sending** that the client still reads, producing undefined rather
than a failure.

**An empty array that the client treats as an error**, or a null it treats as empty.

## The trap

**Fixing it in the layer where it is visible.** The client showing nothing is a symptom; the
endpoint returning nothing is the cause; the authorization scope excluding rows is the reason.
**Patching the client to handle empty makes the symptom disappear and leaves the cause**, which
resurfaces somewhere with less tolerance.`,
    mcqs: [
      mcq('After querying the database, calling the endpoint and logging the raw response, you know which boundary is wrong having read:',
        [['No code at all', true],
         ['Only the endpoint’s own handler function', false],
         ['The client and the server in parallel', false],
         ['The layer that the symptom appeared in', false]],
        'Three observations at the boundaries localise the fault by elimination, which is faster and more reliable than reading either side.'),
      mcq('A number that became a string crossing the boundary causes a comparison on the client to be wrong:',
        [['Without producing any error', true],
         ['Only when the value exceeds a certain size', false],
         ['Unless the client parses the response strictly', false],
         ['Only for values that contain a decimal point', false]],
        'The comparison is valid on strings and yields a result, so nothing signals a problem. The result is simply not the one intended.'),
    ],
    checkpoint: [
      mcq('Patching the client to handle an empty result makes the symptom disappear and leaves the cause, which:',
        [['Resurfaces somewhere with less tolerance', true],
         ['Becomes harder to find on the next occurrence', false],
         ['Is acceptable if the empty case is legitimate', false],
         ['Will be caught by the endpoint’s own tests later', false]],
        'The authorization scope still excludes rows. Another consumer without the defensive handling encounters the same cause as a hard failure.'),
      mcq('Data right but the response wrong points at serialisation, a query filter, or:',
        [['An authorization scope excluding rows', true],
         ['A client-side cache holding an old result', false],
         ['A network proxy modifying the response body', false],
         ['A type mismatch introduced by the JSON encoder', false]],
        'Scoping a query to the caller removes rows legitimately, and when the scope is wrong it removes rows that should have been returned, silently.'),
    ],
  },
  {
    unitCode: 'T4_FULLSTACK_BUILD_INTERVIEW_QUESTION',
    notes: `**"Something is wrong and the user sees a blank screen. What do you do?"**

## Why this question favours this direction

**Because it spans the whole stack and the answer reveals whether somebody owns it.** A specialist
answers from their half; a full-stack candidate should answer by bisecting.

## The answer

**"First, what exactly does blank mean?"** No data, an error swallowed, or a crash. Three different
investigations.

**Then bisect, out loud.** Database, endpoint, client — three observations, each about a minute,
and after them you know which boundary is at fault.

**Then the likely causes** at whichever boundary that turned out to be.

## The follow-ups

**"It only happens for some users."** Data-dependent. A missing optional field, a very long value,
an empty collection, or a permission difference. **The permission one is worth naming** because it
is both a bug and possibly an exposure in the other direction.

**"It works locally."** Environment, data volume, or latency. And the honest note that local
testing uses complete, small, fast data, which is the opposite of production in all three
respects.

**"How would you stop it happening again?"** An error boundary so a crash shows something useful,
a logged request id so it can be found, and the four states handled explicitly. **All three, not
one.**

## The depth marker

**Bisecting rather than hypothesising.** A candidate who starts listing possible causes is
guessing; one who starts with three observations has a method, and the method is what transfers to
the bug nobody has seen before.

## What loses marks

**Answering entirely from one half.** "I would check the component state" or "I would check the
query" both stop at a boundary, which is the thing this role is supposed not to do.`,
    mcqs: [
      mcq('A candidate who begins by listing possible causes rather than making observations is:',
        [['Guessing, where the other has a method', true],
         ['Being thorough about the likely explanations', false],
         ['Demonstrating breadth across the whole stack', false],
         ['Answering more quickly than bisection allows', false]],
        'Hypotheses are unbounded and unordered. Three boundary observations eliminate most of them in three minutes and transfer to unfamiliar bugs.'),
      mcq('"It only happens for some users" pointing at a permission difference is worth naming because it is:',
        [['Both a bug and possibly an exposure the other way', true],
         ['The most likely of the data-dependent causes', false],
         ['Easier to reproduce than the other explanations', false],
         ['The only cause that affects a subset of users', false]],
        'If a scope wrongly excludes rows here, the same logic elsewhere may wrongly include them, which is an authorization failure rather than a display one.'),
    ],
    checkpoint: [
      mcq('Asked how to stop it happening again, the answer is an error boundary, a logged request id and the four states handled — and the point is that it is:',
        [['All three, not one of them', true],
         ['The error boundary above the other two', false],
         ['Whichever is cheapest to add to the codebase', false],
         ['Enough to log the error for later analysis', false]],
        'Each addresses a different part: showing something useful, being able to find it, and not producing the blank in the first place.'),
      mcq('"I would check the component state" and "I would check the query" both fail in the same way, by:',
        [['Stopping at a boundary', true],
         ['Requiring access the candidate may not have', false],
         ['Assuming the cause rather than observing it', false],
         ['Taking longer than the bisection approach would', false]],
        'Each answers from one half of the stack, which is the specific limitation the full-stack role is expected not to have.'),
    ],
  },

  /* ══ T4_FULLSTACK_QUALITY ═══════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_FULLSTACK_QUALITY_TESTING_AND_SECURING_BOTH_HALVES',
    notes: `**Where to test each layer, and the authorization check that exists on the client
only.**

## Test each thing where it is decided

**Business rules: on the server, with plain values.** No HTTP, no database, no browser. Fast, and
they actually get written.

**The contract: at the boundary.** One test per endpoint asserting the response shape, which is
what catches a rename before a client does.

**Rendering and interaction: on the client**, with the server stubbed.

**One or two end-to-end tests**, no more. They are slow and fragile and they catch the thing
nothing else can — that the two halves actually agree in practice.

## The mistake that wastes the most effort

**Testing business rules through the interface.** It is slow, it breaks when a button moves, and
when it fails you cannot tell whether the rule or the rendering is wrong.

**The rule belongs in a function that takes values and returns a result**, and then the test is a
line.

## The security half

**Every authorization check must exist on the server**, and the client's version is presentation.

**The test that finds the gap:** call every endpoint directly, with a valid token belonging to a
different user. Not through the interface — the interface will not let you, which is exactly why
testing through it proves nothing.

## What to check at the boundary

**Does the server trust anything it should not?** A price, a role, a total, an owner id.

**Does the client render anything it should escape?**

**Does an error response leak a stack trace or a query?**

## The property worth stating

**The client is a convenience and the server is the control.** Every quality decision here follows
from that, and the checks above are that principle made into a checklist.`,
    mcqs: [
      mcq('Testing business rules through the interface is wasteful partly because when it fails you cannot tell whether:',
        [['The rule or the rendering is wrong', true],
         ['The failure is intermittent or consistent', false],
         ['The test data or the code is at fault', false],
         ['The server or the network caused the delay', false]],
        'The test spans both, so a failure implicates both. A rule tested as a function fails for exactly one reason.'),
      mcq('Authorization gaps must be tested by calling endpoints directly rather than through the interface because the interface:',
        [['Will not let you, which is why it proves nothing', true],
         ['Adds latency that obscures the actual result', false],
         ['Caches responses from previous requests made', false],
         ['Requires a full browser environment to drive it', false]],
        'The interface enforces its own presentation rules, so it can only exercise the paths it offers — which are the ones already protected.'),
    ],
    checkpoint: [
      mcq('End-to-end tests should be few because they are slow and fragile, and they catch the one thing nothing else can:',
        [['That the two halves actually agree in practice', true],
         ['That the deployment configuration is correct', false],
         ['That the database migrations have been applied', false],
         ['That performance is acceptable under real load', false]],
        'Unit and contract tests verify each side against an assumption. Only an end-to-end run exercises both assumptions against each other.'),
      mcq('The property that every quality decision in this topic follows from is that the client is a convenience and the server is:',
        [['The control', true],
         ['The source of the rendered output', false],
         ['Responsible for the user experience too', false],
         ['Where all the business logic must be written', false]],
        'It decides where checks must exist, what may be trusted, and why a client-side test of authorization is not a test of anything.'),
    ],
  },
  {
    unitCode: 'T4_FULLSTACK_QUALITY_HARDER_FAULT',
    notes: `**An application that passes every test it has and is still wrong at the seam.**

## Why these survive

**Each side's tests assert that side's assumption.** Both suites are green and the assumptions
differ. Nothing in either suite can see the other one.

## The five seam faults

**A type that changes crossing JSON.** A number becomes a string, a date becomes text. Both sides
work; the comparison between them does not.

**A field the server stopped sending.** The client reads undefined and renders nothing, which
looks like no data rather than a fault.

**Timezone.** The server stores UTC, the client renders local, and a date appears as the previous
day for some users and not others.

**Rounding.** The server computes a total in the smallest unit, the client formats it, and the two
disagree by a penny on some values.

**An ordering assumption.** The client relies on an order the server never promised, and a query
plan change reorders it months later with no code change.

## Finding them

**Test the boundary, not the sides.** One test per endpoint asserting the exact response shape and
types catches the first two immediately.

**And vary what both suites hold constant:** a user in another timezone, a value that rounds
awkwardly, a collection returned in a different order.

## The one that is hardest

**Timezone**, because it is correct for the developer and wrong for a subset of users, and those
users describe it as "the date is wrong" which sounds like a data problem rather than a rendering
one.`,
    mcqs: [
      mcq('Seam faults survive because each side’s tests assert that side’s assumption, and nothing in either suite can:',
        [['See the other one', true],
         ['Run without the other side being available', false],
         ['Detect changes made after it was written', false],
         ['Cover the error paths across the boundary', false]],
        'Unit testing works by isolating, so the disagreement between two independently reasonable assumptions is outside what either suite examines.'),
      mcq('A field the server stopped sending produces a client rendering nothing, which looks like:',
        [['No data rather than a fault', true],
         ['A network failure to the user viewing it', false],
         ['A permissions problem on that endpoint', false],
         ['A parse error in the client’s response handling', false]],
        'Reading an absent property yields undefined and renders as empty, so the interface presents a plausible empty state instead of an error.'),
    ],
    checkpoint: [
      mcq('Timezone is the hardest of these to find because it is correct for the developer and wrong for a subset of users, who describe it as:',
        [['"The date is wrong", which sounds like a data problem', true],
         ['An intermittent fault that cannot be reproduced', false],
         ['A performance issue with the date rendering', false],
         ['A permissions problem affecting their account', false]],
        'The report misdirects the investigation towards storage and away from rendering, which is where the disagreement actually is.'),
      mcq('One test per endpoint asserting the exact response shape and types immediately catches:',
        [['Type changes and removed fields', true],
         ['Timezone and rounding disagreements', false],
         ['Ordering assumptions made by the client', false],
         ['Authorization scopes that exclude rows', false]],
        'Both are properties of the response itself, so a contract test at the boundary observes them directly rather than inferring them from behaviour.'),
    ],
  },
  {
    unitCode: 'T4_FULLSTACK_QUALITY_PRACTICE',
    notes: `**Reviewing, testing and hardening an application across both halves.**

## The drill

**An application, no issue report, thirty minutes.** Findings ordered by consequence, across both
sides.

## The full-stack review checklist

**Does the server trust anything the client computed that matters?**

**Can every endpoint be reached directly with another user's token?**

**Is any business rule only reachable through HTTP?**

**Does every request have four states handled on the client?**

**Is any type or field assumed rather than asserted at the boundary?**

**Does any error response reach the user as a stack trace?**

Six questions, twenty minutes, any application.

## What makes this review different

**Half the findings are about the relationship between two things**, rather than about either one.
"The server returns a string and the client compares it as a number" is not a fault in either side
and is a fault.

**That is the class a specialist reviewer will not report**, because it is not in their half, and
it is where this direction adds something nobody else does.

## Writing it up

**Name both sides in the finding.** "The client relies on X; the server does not guarantee it."
That phrasing makes it clear it is a boundary issue and stops it being assigned to one team and
declined.`,
    mcqs: [
      mcq('"The server returns a string and the client compares it as a number" is a fault that:',
        [['Is not in either side and is still a fault', true],
         ['Belongs to whichever side was written second', false],
         ['Should be fixed on the client, which is cheaper', false],
         ['Only matters when the values are numeric ones', false]],
        'Both sides are internally consistent and the disagreement between them is the defect, which is exactly the class specialist review misses.'),
      mcq('Phrasing a boundary finding as "the client relies on X; the server does not guarantee it" stops it being:',
        [['Assigned to one team and declined', true],
         ['Confused with an unrelated performance issue', false],
         ['Reported twice by two different reviewers', false],
         ['Treated as lower priority than it deserves', false]],
        'A finding attributed to one side is examined by that side, found to be internally correct, and closed. Naming both makes the relationship the subject.'),
    ],
    checkpoint: [
      mcq('This review adds something nobody else does because half the findings are about:',
        [['The relationship between two things', true],
         ['Code that spans more than one repository', false],
         ['Performance across the whole request path', false],
         ['Security issues that cross the trust boundary', false]],
        'A backend reviewer checks the server and a frontend reviewer checks the client. The agreement between them is nobody’s half by default.'),
      mcq('"Is any business rule only reachable through HTTP" is on the checklist because such a rule cannot be:',
        [['Called by a job, an import or an admin tool', true],
         ['Tested without a running database instance', false],
         ['Changed without redeploying the whole service', false],
         ['Understood by somebody reading the client code', false]],
        'The second caller reimplements it, and two implementations of one rule drift. Extracting it to a function makes it reachable from anywhere.'),
    ],
  },
  {
    unitCode: 'T4_FULLSTACK_QUALITY_INTERVIEW_QUESTION',
    notes: `**"How do you test a full-stack feature?"**

## Why the answer separates candidates immediately

**Most say "end-to-end tests".** It is the obvious answer and it is wrong as a primary strategy:
slow, fragile, and when one fails you do not know which half broke.

## The answer

**Test each thing where it is decided.**

**Business rules** as plain functions on the server. Fast, and therefore actually written.

**The contract** at the boundary — one test per endpoint asserting shape and types. **This is the
one most candidates omit and it is the one that catches seam bugs**, so naming it is a strong
move.

**Rendering and interaction** on the client with the server stubbed.

**One or two end-to-end tests** for the main journeys, and the reason: they are the only thing
that verifies the two halves actually agree.

## The follow-ups

**"What do you stub?"** Whatever is not under test. And the caveat worth volunteering: a stub
encodes your belief about the other side, so if the belief is wrong the test passes and the
system is broken — which is precisely why the contract test exists.

**"How do you test authorization?"** Call every endpoint directly with another user's token. Not
through the interface, which will not let you.

**"What would you not test?"** The framework, getters, anything whose failure is immediately
obvious. Judgement about cost is scored here.

## The depth marker

**Naming the contract test.** It is the layer between unit and end-to-end that most people do not
have, and it is where the faults this direction is responsible for actually live.`,
    mcqs: [
      mcq('End-to-end tests are wrong as a primary strategy because they are slow, fragile, and when one fails you do not know:',
        [['Which half broke', true],
         ['Whether the failure is reproducible at all', false],
         ['How long the regression has been present', false],
         ['Whether the test or the code is incorrect', false]],
        'The test spans everything, so the failure implicates everything. Diagnosis starts from scratch rather than from a localised signal.'),
      mcq('A stub encodes your belief about the other side, which means if the belief is wrong:',
        [['The test passes and the system is broken', true],
         ['The test fails for a misleading reason', false],
         ['The stub must be regenerated from the contract', false],
         ['Only the integration tests will detect it', false]],
        'The test verifies the code against your assumption rather than against reality, which is exactly the gap a contract test at the boundary closes.'),
    ],
    checkpoint: [
      mcq('The depth marker in this answer is naming the contract test, because it is the layer between unit and end-to-end that most people:',
        [['Do not have', true],
         ['Consider too slow to run frequently', false],
         ['Replace with generated API documentation', false],
         ['Apply only to public-facing endpoints', false]],
        'It is where the seam faults live, and its absence is why those faults reach production in applications with otherwise healthy suites.'),
      mcq('Asked what you would not test, naming the framework, getters and obviously-visible failures is scored because it demonstrates:',
        [['Judgement about cost', true],
         ['Familiarity with the testing pyramid model', false],
         ['That the suite runs within a time budget', false],
         ['Awareness of what the framework guarantees', false]],
        'Enumerating what to test is common. Knowing where a test costs more than it protects is the scarcer signal and is deliberately probed.'),
    ],
  },

  /* ══ T4_FULLSTACK_PROOF ═════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_FULLSTACK_PROOF_ADVANCED_CHALLENGE',
    notes: `**The walkthrough.** Take somebody through a full request and back, out loud, from your
own application.

## Why this is the advanced challenge rather than a project

**Because building more is not what this direction needs to prove.** The tracks either side of it
produce artefacts; this one produces an account, and the account is the thing neither specialist
can give.

**A full-stack candidate who has built three applications and cannot narrate one is
indistinguishable from somebody who built the halves separately.**

## What the walkthrough must contain

**One real action** from your own application. Not a generic example.

**Every layer, in order**, with what each is responsible for.

**At each boundary: what is trusted, what is validated, what happens if the next layer is
unavailable.** These three at every hop, and the third is the one that is usually undecided.

**The failure branch**, fully. Not "and then it errors" — what the server returns, what the client
does, what the user sees, and what they can do next.

**One decision you made and the alternative you rejected.** Where the line went, what the response
shape is, where a piece of state lives.

## How to produce it

**Write it out, then say it aloud to a person, then fix what did not survive being spoken.**

**It always runs out somewhere.** Usually a boundary where you have never decided what happens if
the next layer is down, and finding that is the point of the exercise rather than a failure of it.

## What to submit

**The written walkthrough**, and a note on where the account ran out the first time you said it
aloud, and what you did about it.`,
    assignment: {
      title: 'The walkthrough',
      description: 'Produce and rehearse a full account of one real request through every layer and back, including what is trusted, validated and unavailable at each boundary.',
      instructions: `Take one real action from your own application — not a generic example — and
produce an account of it through every layer and back.

**At each boundary state three things:** what is trusted here, what is validated here, and what
happens if the next layer is unavailable. The third is usually undecided, and discovering that is
the point of the exercise.

**Include the failure branch fully.** Not "and then it errors" — what the server returns, what the
client does, what the user sees, and what they can do next.

**Include one decision you made and the alternative you rejected**: where the line between client
and server went, what the response shape is, or where a piece of state lives.

**Then say it aloud to a person**, and fix what did not survive being spoken. It always runs out
somewhere.

**Submit:** the written walkthrough, and a note on where the account ran out the first time you
said it aloud and what you did about it. Building more is not what this direction needs to prove;
the account is the thing neither specialist can give.`,
      rubric: [
        { criterion: 'Every layer, from a real action', description: 'The path is traced through each layer and back, from the candidate’s own application rather than a generic example.', maxPoints: 25 },
        { criterion: 'Three answers at every boundary', description: 'Trusted, validated and next-layer-unavailable are each answered at each hop.', maxPoints: 30 },
        { criterion: 'The failure branch is complete', description: 'Server response, client behaviour, user-visible result and the action available to the user are all covered.', maxPoints: 25 },
        { criterion: 'Rehearsed, with the gap reported', description: 'The note identifies where the account ran out when spoken aloud, and what was done about it.', maxPoints: 20 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('This is an account rather than a project because building more is not what the direction needs to prove, and the account is:',
        [['The thing neither specialist can give', true],
         ['Faster to produce than another application', false],
         ['Easier for a reviewer to assess consistently', false],
         ['The format the specialization interview uses', false]],
        'A backend engineer stops at the contract and a frontend engineer starts from it. Narrating the whole path is the unique contribution of the role.'),
      mcq('The account always runs out somewhere, usually at a boundary where you have never decided:',
        [['What happens if the next layer is down', true],
         ['Which field names the response actually uses', false],
         ['Whether the validation is duplicated on both sides', false],
         ['How long the request is permitted to take', false]],
        'Trust and validation are usually considered. Failure behaviour at each hop is typically inherited from defaults rather than chosen.'),
    ],
  },
  {
    unitCode: 'T4_FULLSTACK_PROOF_SPECIALIZATION_INTERVIEW',
    notes: `**A full interview on full-stack engineering alone.**

## It opens with the walkthrough

**Almost always.** "Take me through what happens when a user does X in your application." The
preparation for this round is the previous unit, which is why it exists.

## Where it goes

**"Why did you put that on the server?"** Or the client. Testing whether the line was drawn or
inherited.

**"What does the user see when the database is unavailable?"** The failure branch, and most
candidates have not decided.

**"You change the API. What breaks?"** Additive versus breaking, stale clients, the safe
sequence.

**"Two requests arrive at once for the same object."** Both halves: what the client shows and what
the server does.

**"Where would you test that rule?"** As a function on the server. And why not through the
interface.

## The depth marker

**Answering across the boundary rather than from one side.** Asked about a client problem, a
strong candidate says what the server could do to make it easier — and the reverse. That is the
perspective the role exists for and it is visible within two answers.

## The failure mode specific to this direction

**Being shallower than a specialist in both halves and demonstrating it.** The defence is not
claiming equal depth; it is owning the boundary, which neither specialist does. **Say that
explicitly if the round goes that way** — it is a true and strong answer.

## How to prepare

**Three stories: a seam bug that took a long time, a boundary decision you would now make
differently, and an API change you made without breaking a client.** The third is rare in student
work and lands very well.`,
    mcqs: [
      mcq('The depth marker in this round is answering across the boundary, meaning that asked about a client problem a strong candidate says:',
        [['What the server could do to make it easier', true],
         ['Which client library would solve it best', false],
         ['How they would test the client behaviour', false],
         ['That it is outside the scope of the question', false]],
        'Owning both sides means the solution space includes both, and proposing a change on the other side is what a specialist cannot do.'),
      mcq('The defence against being shallower than a specialist in both halves is not claiming equal depth but:',
        [['Owning the boundary, which neither specialist does', true],
         ['Demonstrating breadth across more technologies', false],
         ['Choosing one half to present as your stronger one', false],
         ['Arguing that full-stack roles need less depth', false]],
        'It is a true claim rather than a deflection, and it names a real contribution rather than disputing the premise.'),
    ],
    checkpoint: [
      mcq('Of the three stories to prepare, the one that is rare in student work and lands very well is:',
        [['An API change made without breaking a client', true],
         ['A seam bug that took a long time to find', false],
         ['A boundary decision you would now make differently', false],
         ['A performance problem spanning both halves', false]],
        'It requires having had a client that could not be updated in lockstep, which almost no student project produces without deliberate effort.'),
      mcq('The preparation for this round is the previous unit, which is why:',
        [['The walkthrough exists as the advanced challenge', true],
         ['The track has no final project to submit', false],
         ['The interview is scheduled after the challenge', false],
         ['The two units share the same attribution skill', false]],
        'The round opens with the walkthrough almost every time, so producing and rehearsing one is the most direct preparation available.'),
    ],
  },
  {
    unitCode: 'T4_FULLSTACK_PROOF_CHECKPOINT',
    notes: `**Whether full-stack engineering is demonstrable.**

## What the track asked for

**Drawing the line** — what belongs on the server, and the cost of getting it wrong either way.

**Building across it** — one feature through every layer, with a written contract and the four
error cases.

**Protecting it** — testing each thing where it is decided, and finding the seam faults neither
suite can see.

**Accounting for it** — the walkthrough, with trust, validation and failure behaviour at every
boundary.

## The bar

**The fourth is the direction.** The first three are competence that a specialist also has in
their half. Being able to narrate a whole path, with what is trusted and what happens when each
layer is unavailable, is the thing neither specialist can do — and it is therefore what the role
is hired for.

## What a reviewer looks at

**The walkthrough document.** It is short, it is specific, and no other kind of candidate has one.

**The staged API change**, because it demonstrates the one habit that separates somebody who has
maintained a system with clients from somebody who has only built one.

## If this does not pass

**The usual gap is the account rather than the building.** Everything works and the student cannot
say what happens at the boundaries, particularly on failure. **That is a week of deciding and
writing**, not a repeated month — and the deciding is the valuable part, because the failure
behaviour usually does not exist until somebody has to describe it.

## What this feeds

**Mock 5** on full-stack depth, which opens with the walkthrough. **The portfolio**, where the
walkthrough is the piece worth showing. **P14's production project**, which is this track at a
larger scale with deployment and monitoring added.`,
    checkpoint: [
      mcq('The capability the role is hired for, beyond competence in each half, is being able to narrate a whole path with:',
        [['What is trusted and what happens when a layer is unavailable', true],
         ['The technologies used at each of the layers', false],
         ['The performance characteristics of each hop', false],
         ['The test coverage present at every boundary', false]],
        'Trust and failure behaviour at each boundary is the property that spans both halves, and neither specialist owns it.'),
      mcq('The staged API change demonstrates the habit that separates somebody who has maintained a system with clients from somebody who has:',
        [['Only built one', true],
         ['Worked exclusively on internal applications', false],
         ['Not yet deployed anything to production', false],
         ['Used a framework that handles versioning itself', false]],
        'Changing both halves at once works until a stale client exists. Doing it in the safe order is a habit acquired only from that situation.'),
      mcq('When this checkpoint does not pass, the usual gap is the account rather than the building, and the deciding is the valuable part because failure behaviour:',
        [['Usually does not exist until somebody describes it', true],
         ['Is documented separately from the implementation', false],
         ['Changes whenever the infrastructure is modified', false],
         ['Cannot be tested without a staging environment', false]],
        'Writing the walkthrough forces a decision at each boundary, and those decisions are typically inherited defaults until the question is asked.'),
      mcq('P14’s production project is described as this track at a larger scale with the addition of:',
        [['Deployment and monitoring', true],
         ['A second client consuming the same API', false],
         ['Authentication across multiple providers', false],
         ['A team working on it in parallel with you', false]],
        'The layers and the boundaries are the same. What production adds is running it somewhere and being able to answer whether it is working.'),
    ],
  },
];
