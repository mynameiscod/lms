/**
 * The Frontend Engineering specialization track — sixteen units. Module P07.
 *
 * ── WHAT THIS DIRECTION IS AND IS NOT ─────────────────────────────────────────────────────
 *
 * Not visual design, which is a separate discipline with separate training. The hard parts here
 * are where a piece of state lives, why a screen feels slow when nothing is slow, and what a
 * keyboard-only user experiences — and all three are engineering problems with wrong answers.
 *
 * Students arriving at this track frequently expect it to be the easy one. It is not: it is the
 * only direction where the runtime is hostile by default — an unknown device, an unknown network,
 * a user who may be using none of the input methods you tested with.
 *
 * ── WHY THE TRACK IS FRAMEWORK-FREE ───────────────────────────────────────────────────────
 *
 * Every question below is about what the browser does, what state is, and what a user
 * experiences. A framework-specific track would be obsolete within three years and would teach a
 * student to answer "how does React do X" rather than "what is the problem X solves". The second
 * survives a change of employer; the first does not survive a change of version.
 *
 * Attribution: T4_FRONTEND_DEPTH defaults to STATE_MANAGEMENT with the browser unit on
 * BROWSER_FUNDAMENTALS; T4_FRONTEND_BUILD to RESPONSIVE_DESIGN with the async unit on JS_ASYNC
 * and the fault on JS_DOM; T4_FRONTEND_QUALITY to WEB_ACCESSIBILITY with its harder fault on
 * DEBUGGING; T4_FRONTEND_PROOF to STATE_MANAGEMENT with the interview on TECHNICAL_EXPLANATION.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_FRONTEND_BUNDLES: PilotBundle[] = [
  /* ══ T4_FRONTEND_DEPTH ══════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_FRONTEND_DEPTH_WHERE_STATE_BELONGS',
    notes: `**Local, lifted, shared or on the server** — and a specific bug for each wrong answer.

## The four places

**Local to one component.** A dropdown's open-or-closed. Nothing else needs it and nothing else
should see it.

**Lifted to a common parent.** Two siblings need the same value. The parent owns it and passes it
down.

**Shared application state.** Many unrelated parts need it — the signed-in user, a theme, a cart.

**On the server.** Anything that must survive a refresh, be seen by another device, or be trusted.

## The wrong answers and what each produces

**Too local:** the same value in two components, drifting. A filter shown in two places that
disagree.

**Too shared:** every component re-renders when anything changes, and no one can tell what writes
it. **This is the commonest fault in a large frontend** — everything in a global store because
that was easier than deciding.

**Too client-side:** it disappears on refresh, or two tabs disagree, or a user believes something
saved that did not.

**Too server-side:** a round trip for something that should have been instant, and an interface
that feels sluggish for no reason a user can name.

## Derived state is not state

**If it can be computed from other state, compute it.** Storing it creates two sources of truth
that drift the first time somebody updates one.

**A filtered list is not state.** The list is state, the filter is state, the filtered result is a
computation.

## The question that decides it

**Who needs this, and what must be true after a refresh?** Those two answers between them name
the place, and asking them explicitly is the whole technique.`,
    mcqs: [
      mcq('Putting everything in a global store produces a frontend where:',
        [['Nobody can tell what writes any given value', true],
         ['Values are lost whenever the page is refreshed', false],
         ['Components cannot share data with their siblings', false],
         ['The server must be consulted on every change made', false]],
        'Global write access means the set of possible writers is the whole application, so tracing where a value came from becomes a search rather than a read.'),
      mcq('A filtered list should be computed rather than stored because storing it creates:',
        [['Two sources of truth that will drift', true],
         ['A performance cost on every render cycle', false],
         ['A value that cannot be shared between components', false],
         ['State that the server has no way to validate', false]],
        'The list and the filter are the inputs. Storing the result means an update to either can leave the stored value describing a state that no longer exists.'),
    ],
    checkpoint: [
      mcq('The two questions that between them name the right place for state are who needs it and:',
        [['What must be true after a refresh', true],
         ['How often the value is expected to change', false],
         ['Whether the value is expensive to compute', false],
         ['Which component originally created the value', false]],
        'Scope decides local, lifted or shared; durability decides client or server. Together they determine the answer without further judgement.'),
      mcq('State held too client-side produces the failure where a user:',
        [['Believes something saved that did not', true],
         ['Waits for a round trip that was unnecessary', false],
         ['Sees two components disagree about one value', false],
         ['Triggers re-renders across unrelated components', false]],
        'The interface acknowledged the change locally and nothing persisted it, so the loss is discovered later and the user reasonably assumes a bug.'),
    ],
  },
  {
    unitCode: 'T4_FRONTEND_DEPTH_THE_BROWSER_UNDERNEATH',
    notes: `**Why an interface feels slow when nothing is slow.**

## One thread does everything

**JavaScript, layout, paint and event handling share a single thread.** While your code runs,
nothing else can — no scrolling, no clicks, no rendering.

**So a function taking 200ms is not "fast enough".** It is 200ms during which the interface is
frozen, and users perceive anything over about 100ms as a stutter.

## The event loop, at the level that matters

**Your code runs to completion, then the browser does its work.** A long synchronous loop blocks
everything until it finishes, whatever else is queued.

**Breaking work into chunks that yield** lets rendering happen between them. The total time is
the same and the experience is completely different, which is the thing worth understanding.

## Layout and paint

**Changing geometry forces layout** — the browser recomputes positions. Changing colour or opacity
usually does not.

**Reading a computed geometry immediately after writing one forces a synchronous layout**, and
doing that inside a loop is the classic cause of a scroll that stutters. Batch the reads, then the
writes.

## What actually makes interfaces feel slow

**Rarely raw computation.** Usually: too much work on the main thread at once, layout thrashing in
a loop, an enormous DOM, or images without dimensions causing the page to jump as they load.

## The measurement

**The browser's performance tools show which of those it is**, and guessing is unusually
unproductive here because the cause is frequently not in your code at all — it is in how your code
made the browser work.`,
    mcqs: [
      mcq('A 200ms synchronous function is a problem because during it the browser cannot:',
        [['Render, scroll or handle any events', true],
         ['Fetch resources that were already requested', false],
         ['Run any other script on a different thread', false],
         ['Maintain the connection to the server socket', false]],
        'One thread serves scripting, layout, paint and events. While your code holds it, the interface is frozen from the user’s point of view.'),
      mcq('Reading a computed geometry immediately after writing one forces a synchronous layout, which inside a loop causes:',
        [['A scroll or animation that stutters visibly', true],
         ['Memory consumption to grow with each iteration', false],
         ['The browser to drop the queued event handlers', false],
         ['Styles to be applied in an inconsistent order', false]],
        'Each read must flush the pending write, so the loop alternates write and full layout. Batching reads then writes removes the repeated recomputation.'),
    ],
    checkpoint: [
      mcq('Breaking long work into chunks that yield changes the experience without changing:',
        [['The total time the work takes', true],
         ['The order in which the work is performed', false],
         ['The correctness of the computed result', false],
         ['The amount of memory the work requires', false]],
        'The same work happens; the difference is that rendering and event handling can occur between chunks, so the interface stays responsive.'),
      mcq('Guessing is unusually unproductive for frontend performance because the cause is frequently:',
        [['In how your code made the browser work', true],
         ['In a third-party script outside your control', false],
         ['In the network rather than in the page itself', false],
         ['Different between one browser and another one', false]],
        'The expensive operation is often layout or paint triggered by innocuous-looking code, which is invisible when reading the source.'),
    ],
  },
  {
    unitCode: 'T4_FRONTEND_DEPTH_PRACTICE',
    notes: `**Applying both ideas to an interface you did not build.**

## The drill

**Take an existing application.** Produce:

**A state map.** What state exists, where it lives, and where it should live. Name one piece that
is in the wrong place and what bug that produces.

**One derived value being stored**, and what would make it drift.

**One performance observation from measurement**, not from reading — which interaction is slow
and what the browser is actually doing during it.

## The second half

**Fix one of them** and demonstrate the difference. For state, show the bug before and its absence
after. For performance, show the measurement before and after.

**Demonstrating is the requirement.** "I moved this state up" is a claim; a reproduction of the
drift and its disappearance is evidence.

## What good looks like

**You can name the bug a state decision produces**, rather than describing the decision as wrong.
"These two filters disagree after you navigate away and back" is a finding. "This state should be
lifted" is a preference somebody can decline.

## Why measurement rather than reading

**Because frontend performance intuition is unreliable even for experienced engineers.** The slow
thing is very often not the thing that looks expensive, and the only way to build calibrated
intuition is to keep being surprised by the profiler.`,
    mcqs: [
      mcq('"These two filters disagree after you navigate away and back" is stronger than "this state should be lifted" because the first names:',
        [['The bug the decision produces', true],
         ['The component that owns the state now', false],
         ['A principle the current design violates', false],
         ['The refactor that would resolve the issue', false]],
        'A reproducible defect is a cost. A structural preference is something the author may reasonably decline without further discussion.'),
      mcq('Frontend performance is measured rather than read because the slow thing is very often:',
        [['Not the thing that looks expensive', true],
         ['Located in a third-party dependency instead', false],
         ['Only slow on devices with limited memory', false],
         ['Caused by the network rather than the code', false]],
        'Layout and paint costs are triggered by code that reads innocuously, so source inspection systematically misidentifies the cause.'),
    ],
    checkpoint: [
      mcq('Demonstrating rather than claiming a state fix means showing:',
        [['The bug before and its absence afterwards', true],
         ['The component tree before and after the change', false],
         ['That the tests still pass after the refactor', false],
         ['A reduction in the number of state variables', false]],
        'The state change was justified by a defect, so the defect disappearing is the evidence that the change achieved what it claimed.'),
      mcq('Calibrated performance intuition is built by:',
        [['Repeatedly being surprised by the profiler', true],
         ['Reading about how browser rendering works', false],
         ['Optimising the same interface several times', false],
         ['Comparing frameworks on standard benchmarks', false]],
        'Intuition improves only when it is contradicted by measurement. Without the surprise, incorrect beliefs about cost persist indefinitely.'),
    ],
  },
  {
    unitCode: 'T4_FRONTEND_DEPTH_INTERVIEW_QUESTION',
    notes: `**"How do you decide where state should live?"**

## Why this is the frontend depth question

**Because it is the decision that shapes everything else.** Component structure, testability,
performance and most of the bugs follow from it, and a candidate's answer reveals whether they
have maintained a large interface or only built small ones.

## The answer

**Two questions.** Who needs this, and what must be true after a refresh.

**Then the four places**, with a bug for each wrong answer. Naming the bug rather than the rule is
what shows this came from experience.

**And derived state**, unprompted: if it can be computed, compute it. Volunteering that is a
strong marker because it is the mistake that produces the most confusing bugs.

## The follow-ups

**"When would you use a global store?"** When many unrelated parts genuinely need it. And the
honest addition: most applications put far too much there, because it is easier than deciding.

**"How do you handle server data?"** It is not really client state — it is a cache of something
the server owns, with a staleness question attached. Saying that distinguishes a candidate
immediately.

**"Two components show the same value and they disagree. What happened?"** Duplicated state rather
than one source, or a derived value stored.

## What loses marks

**Naming a library.** "I use Redux" answers a different question. The interviewer wants the
decision procedure, and the library is an implementation of whatever you decide.`,
    mcqs: [
      mcq('Server data is best described not as client state but as:',
        [['A cache of something the server owns', true],
         ['Global state shared across the application', false],
         ['Local state belonging to the fetching component', false],
         ['Derived state computed from the request result', false]],
        'The server is the source of truth and the client holds a copy, which brings a staleness question that ordinary client state does not have.'),
      mcq('Answering "I use Redux" loses marks because the interviewer wants:',
        [['The decision procedure, not the implementation', true],
         ['A comparison between the available libraries', false],
         ['Evidence of experience with large applications', false],
         ['A framework-agnostic description of the pattern', false]],
        'A library implements whatever you decide. Naming one skips the decision entirely, which is the thing being assessed.'),
    ],
    checkpoint: [
      mcq('Volunteering that derived state should be computed rather than stored is a strong marker because it is the mistake that produces:',
        [['The most confusing bugs', true],
         ['The greatest performance cost at scale', false],
         ['The largest amount of duplicated code', false],
         ['The most disagreement between developers', false]],
        'Two sources of truth drift silently, so the interface shows a value that is internally inconsistent with no error anywhere.'),
      mcq('Two components showing the same value and disagreeing indicates duplicated state or:',
        [['A derived value that was stored', true],
         ['A race between two network requests', false],
         ['A render that happened out of order', false],
         ['State held on the server rather than the client', false]],
        'Both are the same underlying fault — more than one place holding what should be one answer, with nothing keeping them synchronised.'),
    ],
  },

  /* ══ T4_FRONTEND_BUILD ══════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_FRONTEND_BUILD_ASYNC_IN_AN_INTERFACE',
    notes: `**Three states per request, the one everybody forgets, and the response that arrives
after the next one.**

## Every request has at least three states

**Loading. Succeeded. Failed.**

**The third is the one that is forgotten**, and the result is an interface that shows a spinner
forever when something goes wrong, which is the worst available outcome — the user cannot tell
whether to wait or to retry.

**And a fourth, frequently: empty.** Succeeded with no results is not the same as loading and is
not an error, and treating it as either is a bug users notice immediately.

## The race

**Type "ab", a request goes. Type "abc", another goes. The first returns second.** The interface
now shows results for "ab" while the box says "abc".

**This is not rare.** It happens on every search box that does not handle it, and it is invisible
in development because localhost is fast.

**The fix:** ignore a response that is not for the current request. Track which request is current
— a sequence number or an abort signal — and discard the rest.

## Do not fire on every keystroke

**Debounce.** Wait until typing pauses. It reduces requests by an order of magnitude and removes
most of the race as a side effect, though not all of it, so both are needed.

## Optimistic updates

**Show the result before the server confirms.** Excellent when it usually succeeds, and it
requires a genuine plan for failure: revert and tell the user, clearly enough that they know their
change did not happen.

**An optimistic update with no revert path is a lie the interface tells.**`,
    mcqs: [
      mcq('A spinner shown forever on failure is the worst available outcome because the user cannot tell:',
        [['Whether to wait or to retry', true],
         ['Which part of the request actually failed', false],
         ['Whether the server received the request at all', false],
         ['How long the operation normally takes to finish', false]],
        'An error offers an action. An indefinite loading state offers none and leaves the user unable to decide what to do next.'),
      mcq('A search box that does not handle out-of-order responses is broken in a way invisible during development because:',
        [['Localhost is fast, so responses rarely overtake', true],
         ['Developers type more slowly than real users do', false],
         ['The browser caches repeated search requests', false],
         ['Test data sets are too small to show the delay', false]],
        'The race requires variable latency. With sub-millisecond local responses, requests effectively complete in the order they were sent.'),
    ],
    checkpoint: [
      mcq('Debouncing removes most of the race as a side effect but not all of it, which means:',
        [['Both debouncing and discarding stale responses are needed', true],
         ['Debouncing should be set to a longer interval', false],
         ['Requests should be sent sequentially rather than in parallel', false],
         ['The race is acceptable at the remaining frequency', false]],
        'Debouncing reduces how often overlapping requests occur; tracking the current request is what makes the remaining overlaps harmless.'),
      mcq('An optimistic update with no revert path is described as:',
        [['A lie the interface tells the user', true],
         ['An acceptable trade for perceived speed', false],
         ['A pattern that only fails under poor networks', false],
         ['Equivalent to showing a loading state instead', false]],
        'The user is shown a change that did not happen and is never told otherwise, so they act on a state the system does not hold.'),
    ],
  },
  {
    unitCode: 'T4_FRONTEND_BUILD_BUILDING_FOR_REAL_DEVICES',
    notes: `**A small screen and a slow connection**, treated as requirements rather than as a
final pass.

## Why retrofitting fails

**A layout built for a wide screen and then squeezed produces compromises everywhere.** Starting
from the constrained case and adding space is straightforward; the reverse is a rewrite that
nobody budgets for.

## What actually breaks on a phone

**Fixed widths.** Anything in pixels that should have been relative.

**Tables.** They do not fit, and the usual answers — horizontal scroll, or restructuring into
cards — are both decisions rather than defaults.

**Touch targets.** A link that is fine with a mouse is a frustration with a thumb.

**Hover.** There is none. Anything only reachable by hovering is unreachable, and this is a
correctness problem rather than a styling one.

## Payload

**Every byte is paid for on a slow connection.** The largest costs, in order: images, fonts,
JavaScript.

**Images without dimensions cause layout shift** as they load — the page jumps and the user taps
the wrong thing. Specifying the dimensions costs nothing and removes it entirely.

## Test on the real thing

**A narrow browser window is not a phone.** It does not have the CPU, the network, or the input
method. Throttling in the browser's tools gets you closer; a real device on a real network is the
only honest test.

## The ordering that matters

**Content first, then enhancement.** Something useful before the JavaScript loads means a slow
connection degrades rather than fails, and it is the same decision that makes the page work when a
script errors.`,
    mcqs: [
      mcq('Anything reachable only by hovering is a correctness problem rather than a styling one because on a touch device it is:',
        [['Unreachable', true],
         ['Displayed but difficult to activate', false],
         ['Triggered by the first tap instead of a click', false],
         ['Shown permanently rather than on interaction', false]],
        'There is no hover state on touch, so the functionality simply cannot be accessed. That makes it a defect rather than a presentational choice.'),
      mcq('Images without specified dimensions cause layout shift, which results in the user:',
        [['Tapping the wrong thing as the page jumps', true],
         ['Waiting longer for the page to finish loading', false],
         ['Seeing the images at an incorrect aspect ratio', false],
         ['Losing their scroll position when navigating back', false]],
        'Space is reserved only once the image arrives, so content moves under the pointer or thumb after the user has already committed to a target.'),
    ],
    checkpoint: [
      mcq('A narrow browser window is not a phone because it lacks the CPU, the network and:',
        [['The input method', true],
         ['The screen resolution of a real device', false],
         ['The operating system’s rendering engine', false],
         ['The memory constraints of a mobile browser', false]],
        'Touch has different target sizes, no hover and different gestures, none of which a resized desktop window reproduces.'),
      mcq('Content first and then enhancement means a slow connection produces a page that:',
        [['Degrades rather than fails', true],
         ['Loads in a different order than intended', false],
         ['Shows a loading indicator until fully ready', false],
         ['Requests fewer resources from the server', false]],
        'Something useful exists before the scripts arrive, which also covers the case where a script errors and never runs at all.'),
    ],
  },
  {
    unitCode: 'T4_FRONTEND_BUILD_MINI_PROJECT',
    notes: `**An interface whose failure states are as considered as its success state.**

## The brief

**A multi-screen interface over a real API.** Not a mockup — real requests, real latency, real
failures.

## What must be demonstrable

**Every request has four states handled:** loading, success, empty, error. **Empty and error are
where the marks are**, because everybody builds the success path.

**The race is handled.** A search or filter where responses can arrive out of order, with stale
ones discarded. Demonstrate it by delaying one response artificially.

**It works on a phone**, on a throttled connection. Test on a real device.

**One optimistic update with a working revert.** Show the revert.

## The demonstration is the deliverable

**Throttle the network and record what happens.** Fail a request deliberately and record what the
user sees. Make a response arrive out of order and show the stale one being discarded.

**A submission that only shows the interface working has not shown the part that was hard.**

## What to submit

**The interface, a short recording or a set of screenshots of each failure state**, and a note on
which state you had not handled before you started this exercise.

**Most people find the empty state**, because it is the one that feels like success and behaves
like neither.`,
    assignment: {
      title: 'An interface that holds up',
      description: 'Build a multi-screen interface over a real API with all four request states handled, the out-of-order race managed, and a revertible optimistic update.',
      instructions: `Build a multi-screen interface over a real API — real requests, real latency,
real failures, not a mockup.

**Every request must handle four states: loading, success, empty and error.** Empty and error are
where the marks are, because everybody builds the success path.

**Handle the out-of-order race.** Include a search or filter where responses can overtake each
other, and discard stale ones. Demonstrate it by delaying one response artificially.

**Make it work on a phone, on a throttled connection**, tested on a real device rather than a
narrow window.

**Include one optimistic update with a working revert**, and show the revert running.

**Submit:** the interface, a short recording or screenshots of **each failure state**, and a note
saying which state you had not handled before starting. A submission that only shows the interface
working has not shown the part that was hard. Most people find the empty state, because it feels
like success and behaves like neither.`,
      rubric: [
        { criterion: 'Four states, demonstrated', description: 'Loading, success, empty and error are each shown, not merely claimed, with the error state offering the user an action.', maxPoints: 30 },
        { criterion: 'The race is handled and shown', description: 'A stale response is demonstrably discarded, with the delay applied deliberately to produce the condition.', maxPoints: 25 },
        { criterion: 'Real device, throttled network', description: 'Evidence of testing on an actual phone on a constrained connection rather than a resized browser.', maxPoints: 20 },
        { criterion: 'Optimistic update reverts', description: 'A failure path is triggered and the interface visibly returns to the true state and tells the user.', maxPoints: 25 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('The empty state is the one most people find they had not handled because it:',
        [['Feels like success and behaves like neither', true],
         ['Occurs less often than the error state does', false],
         ['Requires a different request to detect it', false],
         ['Is indistinguishable from a loading state', false]],
        'The request succeeded, so the success branch runs and renders nothing, leaving the user with a blank area and no explanation.'),
      mcq('A submission that only shows the interface working has not shown:',
        [['The part that was hard', true],
         ['Enough screens to assess the navigation', false],
         ['That the API integration is actually real', false],
         ['Whether the layout adapts to small screens', false]],
        'Success paths are straightforward. The assignment is entirely about the states and conditions that only appear when something goes wrong.'),
    ],
  },
  {
    unitCode: 'T4_FRONTEND_BUILD_DEBUGGING',
    notes: `**Stale state, an effect firing twice, a value one render behind.** Finding which of
the three it is.

## They look identical from outside

**The interface shows something wrong.** Distinguishing them is the whole exercise, and the
technique is the same in every framework because the causes are structural rather than
library-specific.

## Stale state

**A handler captured a value when it was created and is still using it.** The value has changed;
the closure has not.

**The tell:** it is correct on the first interaction and wrong afterwards, and the wrong value is
always the previous one.

## An effect firing twice

**Something re-ran that was meant to run once.** Usually a dependency that changes identity on
every render — a new object or function created inline — so the comparison always sees a
difference.

**The tell:** duplicated requests, doubled counters, an animation that restarts.

## A value one render behind

**Reading state immediately after setting it.** The set is queued; the read sees the old value.

**The tell:** the display is always one step behind the truth, and an extra interaction "fixes"
it.

## The one technique that separates them

**Log the value with a marker for which render you are in.** Whether the value is old, whether the
effect ran twice, and whether the render happened are three different observations, and one log
line showing all three settles it in one run.

**Reading the code will not**, because all three look correct — that is precisely why they were
written.`,
    mcqs: [
      mcq('An effect firing twice is usually caused by a dependency that:',
        [['Changes identity on every render', true],
         ['Was omitted from the dependency list entirely', false],
         ['Updates asynchronously after the render completes', false],
         ['Is derived from state rather than from props', false]],
        'An object or function created inline is a new value each time, so an identity comparison always sees a change and re-runs the effect.'),
      mcq('Stale state is distinguished by being correct on the first interaction and wrong afterwards, with the wrong value always being:',
        [['The previous one', true],
         ['The initial value the state was given', false],
         ['Undefined until the next render occurs', false],
         ['Whichever value another component set last', false]],
        'The closure captured the value at creation time, so it reproduces whatever was current then — which after one change is the immediately preceding value.'),
    ],
    checkpoint: [
      mcq('The one technique that separates all three is logging the value together with:',
        [['A marker for which render you are in', true],
         ['The timestamp at which it was written', false],
         ['The component that produced the update', false],
         ['The full state tree at that moment in time', false]],
        'Whether the value is old, whether the effect ran twice and whether a render occurred are three observations, and the render marker joins them.'),
      mcq('Reading the code will not distinguish them because all three:',
        [['Look correct, which is why they were written', true],
         ['Depend on framework internals that are hidden', false],
         ['Occur only in production builds of the code', false],
         ['Involve asynchronous behaviour that is invisible', false]],
        'Each is a reasonable-looking piece of code whose fault is in timing or identity rather than in logic, so inspection reproduces the original mistake.'),
    ],
  },
  {
    unitCode: 'T4_FRONTEND_BUILD_INTERVIEW_QUESTION',
    notes: `**"Build a search box that queries an API as the user types."**

## Why this question is used so much

**Because it contains the whole direction in five minutes.** State, asynchrony, a race, a debounce,
error handling, an empty state, and accessibility if they push. A candidate's answer separates
along every one of those.

## The order to work in

**The naive version first**, out loud: a request on every keystroke. Then say what is wrong with
it, unprompted.

**Too many requests** — debounce.

**Out-of-order responses** — track the current request and discard the rest. **Mentioning this
without being asked is the single strongest move in the question**, because most candidates do not
know it happens.

**No error state** — what does the user see, and what can they do.

**No empty state** — "no results" is not the same as loading.

**No accessibility** — results appear and a screen reader user is not told. A live region, at
minimum.

## The follow-ups

**"What if the user has a slow connection?"** Debounce longer, show the loading state promptly,
and keep the previous results visible rather than blanking them.

**"What if the API is rate limited?"** Back off, and tell the user rather than silently failing.

**"How would you test it?"** The race, specifically, by controlling response timing.

## What loses marks

**Producing working code that has none of the above and stopping.** The code is the easy part.
Everything that distinguishes the answer is what you say about it afterwards.`,
    mcqs: [
      mcq('The single strongest move in this question is mentioning, unprompted:',
        [['Out-of-order responses and how to discard them', true],
         ['The debounce interval you would choose to use', false],
         ['Which state management library you would reach for', false],
         ['How the results would be cached between searches', false]],
        'Most candidates do not know the race happens. Raising it without prompting demonstrates experience of the problem rather than of the pattern.'),
      mcq('Asked what to do on a slow connection, keeping previous results visible rather than blanking them is better because blanking:',
        [['Removes information the user still had', true],
         ['Costs an additional render of the component', false],
         ['Makes the loading state harder to notice', false],
         ['Triggers a layout shift when results return', false]],
        'The old results are stale but useful. Clearing them leaves the user with nothing during exactly the period when waiting is longest.'),
    ],
    checkpoint: [
      mcq('This question is used heavily because it contains the whole direction in five minutes: state, asynchrony, a race, a debounce, error handling, an empty state and:',
        [['Accessibility, if the interviewer pushes', true],
         ['Performance profiling of the render cycle', false],
         ['Server-side rendering considerations too', false],
         ['Authentication of the API being queried', false]],
        'Results appearing without announcement is a real accessibility defect, and it is the natural extension the interviewer reaches for.'),
      mcq('Producing working code with none of these concerns addressed loses marks because:',
        [['The code is the easy part of the question', true],
         ['Working code is not what was asked for here', false],
         ['The concerns are prerequisites for the code', false],
         ['Time spent coding leaves less time to talk', false]],
        'Everything that distinguishes candidates is in the commentary. A correct naive implementation is the baseline rather than the answer.'),
    ],
  },

  /* ══ T4_FRONTEND_QUALITY ════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_FRONTEND_QUALITY_ACCESSIBILITY_AND_SECURITY',
    notes: `**Two quality failures that are invisible in testing and obvious to the person they
affect.**

## Accessibility is not a feature

**It is whether the thing works.** A form that cannot be completed with a keyboard is broken for
the people who cannot use a mouse, and "broken for some users" is the same category as any other
defect.

## The four that account for most of it

**Semantic elements.** A \`div\` with a click handler is not a button. It cannot be focused,
cannot be activated by keyboard, and is not announced as interactive. Using the real element
solves all three for free.

**Labels.** An input without one is an unlabelled box to a screen reader.

**Focus.** Visible, and in a sensible order. Removing the focus outline for aesthetics makes the
interface unnavigable for keyboard users, and it is done constantly.

**Announcing change.** Content that appears without a page load is invisible to a screen reader
unless a live region says otherwise. Search results, validation errors, toasts.

## The test that costs five minutes

**Unplug the mouse.** Navigate the whole flow with the keyboard alone. Anything you cannot reach
is a defect, and you will find one.

## The security half

**Rendering user content as HTML.** If it can contain a script, it will. Frameworks escape by
default and every one of them has an explicit opt-out, and that opt-out is where the injection is.

**A token in local storage** is readable by any script on the page, including an injected one.

**Trusting anything from the client** — a price, a role, a total — is a server-side failure that
appears as a frontend decision.

## What the two have in common

**Both are invisible to the developer who built it**, because they tested with a mouse, a fast
connection and honest input.`,
    mcqs: [
      mcq('A `div` with a click handler differs from a button in that it cannot be focused, cannot be activated by keyboard, and:',
        [['Is not announced as interactive', true],
         ['Cannot receive styling for a hover state', false],
         ['Does not trigger the handler on a real click', false],
         ['Is excluded from the accessibility tree entirely', false]],
        'Assistive technology reports elements by role. A generic container has none, so a user is not told there is anything there to activate.'),
      mcq('Removing the focus outline for aesthetic reasons makes the interface:',
        [['Unnavigable for keyboard users', true],
         ['Slower to render on complex pages', false],
         ['Inconsistent between different browsers', false],
         ['Harder to test with automated tooling', false]],
        'Without a visible indicator the user cannot tell where they are, so tabbing through becomes guessing rather than navigation.'),
    ],
    checkpoint: [
      mcq('The five-minute accessibility test is to:',
        [['Unplug the mouse and navigate the whole flow', true],
         ['Run an automated accessibility scanner on it', false],
         ['Check the colour contrast of every element', false],
         ['Review the markup for semantic correctness', false]],
        'Keyboard navigation exercises focus order, focusability and activation at once, and reliably finds something a scanner would not.'),
      mcq('What accessibility failures and injection risks have in common is that both are invisible to the developer who built it, because they tested with a mouse, a fast connection and:',
        [['Honest input', true],
         ['A recent version of one browser', false],
         ['A display large enough to show everything', false],
         ['Data that was generated rather than entered', false]],
        'The developer supplies input that behaves, so content that contains markup or script is never exercised during development.'),
    ],
  },
  {
    unitCode: 'T4_FRONTEND_QUALITY_HARDER_FAULT',
    notes: `**An interface that passes every test it has and is still wrong.**

## Why frontend tests miss so much

**They run in a simulated environment, at one size, with one input method, on fast responses, with
well-formed data.** Every one of those is a condition the fault needs.

## The five

**A layout that breaks at one width.** Fine at the two sizes anybody checked, broken between
them.

**A component that works alone and not in context.** Its parent constrains it, or a sibling's
style reaches it.

**A memory leak from a subscription never removed.** The component unmounts, the listener remains,
and after enough navigation the page degrades.

**A race that only appears on a slow network.** Tested locally, where responses never overtake.

**Content that overflows.** Every string in testing was short. A real name, a real description, a
real translation into German, and the layout fails.

## Finding them

**Vary what the tests hold constant.** Resize continuously rather than at breakpoints. Navigate
away and back twenty times. Throttle the network. Paste a very long string into every field.

**Each takes two minutes and each finds a class the suite cannot.**

## The one that is hardest to find

**The memory leak**, because it needs accumulation. The symptom is a page that is fine for five
minutes and sluggish after twenty, which nobody reproduces deliberately and every user
experiences.`,
    mcqs: [
      mcq('Frontend tests miss this class because they run at one size, with one input method, on fast responses and with:',
        [['Well-formed data', true],
         ['A single browser engine under test', false],
         ['Mocked versions of the API responses', false],
         ['Components rendered in isolation only', false]],
        'Short, valid strings never overflow a layout. Real names, descriptions and translations are what expose the constraint that was assumed.'),
      mcq('A memory leak from an unremoved subscription is hardest to find because it requires:',
        [['Accumulation over repeated navigation', true],
         ['A specific browser that reports the growth', false],
         ['Concurrent users on the same page instance', false],
         ['Profiling tools that are not widely available', false]],
        'One unmount leaks a negligible amount. The symptom only appears after enough repetitions that nobody performs deliberately.'),
    ],
    checkpoint: [
      mcq('A layout that breaks at one width but is fine at the two sizes anybody checked is found by:',
        [['Resizing continuously rather than at breakpoints', true],
         ['Testing on a wider range of real devices', false],
         ['Reviewing the stylesheet for fixed dimensions', false],
         ['Running the layout through an automated checker', false]],
        'Checking at defined breakpoints tests exactly the widths that were designed for. The failure lives between them, where nothing was verified.'),
      mcq('A component that works alone and fails in context indicates that its parent constrains it or:',
        [['A sibling’s style reaches it', true],
         ['It was tested with different data than production', false],
         ['Its own state was initialised incorrectly there', false],
         ['The framework renders it in a different order', false]],
        'Styles are not scoped by default, so a rule written for one element can apply to another. Isolated tests remove exactly that interaction.'),
    ],
  },
  {
    unitCode: 'T4_FRONTEND_QUALITY_PRACTICE',
    notes: `**Reviewing and hardening an interface without being told what to look for.**

## The drill

**An interface, no issue report, thirty minutes.** Findings ordered by consequence.

## The frontend review checklist

**Can I complete every flow with the keyboard alone?**

**What does each request do on error, and on empty?**

**What happens at an awkward width, and with a very long string?**

**Is any user content rendered as HTML?**

**Is any state duplicated or derived-and-stored?**

**Does anything subscribe without unsubscribing?**

Six questions, twenty minutes, any interface.

## Ordering the findings

**By who it affects and how badly.** A form unusable by keyboard affects a group of users
completely and outranks a layout that is slightly off at one width.

**Not by how visible it is to you**, which is the natural instinct and systematically deprioritises
exactly the faults that are invisible to developers.

## Writing it up

**Name the user and the consequence.** "A keyboard user cannot submit this form" is actionable.
"Missing accessibility attributes" is a category, and the author does not know what it costs.

## Why this is the practice unit here

**Because frontend quality failures are disproportionately invisible to the person who wrote
them.** The habit that fixes that is a deliberate pass with questions that assume nothing about
how the thing is used.`,
    mcqs: [
      mcq('Ordering findings by how visible they are to you systematically deprioritises:',
        [['Exactly the faults that are invisible to developers', true],
         ['Issues that occur only on mobile devices', false],
         ['Problems reported by automated tooling first', false],
         ['Defects in code that somebody else wrote', false]],
        'Accessibility, slow-network and long-content failures are invisible during development, so visibility as a ranking is inversely related to their importance.'),
      mcq('"A keyboard user cannot submit this form" is more actionable than "missing accessibility attributes" because the second is:',
        [['A category, with no stated cost attached', true],
         ['Technically inaccurate in most of these cases', false],
         ['Too broad to be fixed in a single change', false],
         ['Something automated tooling already reports', false]],
        'Naming the user and what they cannot do turns a compliance note into a defect the author can weigh against other work.'),
    ],
    checkpoint: [
      mcq('A form unusable by keyboard outranks a slightly wrong layout because the first affects:',
        [['A group of users completely', true],
         ['More users than the layout issue does', false],
         ['Users on every device rather than just some', false],
         ['The most common path through the application', false]],
        'Severity is about how badly a group is affected, not how many are. Complete exclusion outranks a degraded experience.'),
      mcq('Frontend quality failures are disproportionately invisible to their author, which is why the review pass must use questions that:',
        [['Assume nothing about how the thing is used', true],
         ['Are drawn from an accessibility standard', false],
         ['Have been agreed with the rest of the team', false],
         ['Focus on the areas that changed most recently', false]],
        'The author tested the way they use it. Only questions independent of that assumption reach the conditions they never created.'),
    ],
  },
  {
    unitCode: 'T4_FRONTEND_QUALITY_INTERVIEW_QUESTION',
    notes: `**"How do you make sure an interface works for everybody?"**

## Why the question is phrased that way

**It is deliberately open.** A candidate who hears it as "tell me about accessibility" and recites
attribute names has answered a narrower question than was asked.

**"Everybody" includes** a keyboard user, a screen reader user, somebody on a phone on a train,
somebody whose name is forty characters, and somebody whose connection drops halfway through.

## The answer

**Start with the test, not the standard.** "I navigate the whole flow with the keyboard" is a
practice. Reciting guideline numbers is knowledge that may never have been applied.

**Then the four structural things:** real elements rather than divs, labels, visible focus, and
announcing change.

**Then the conditions:** slow network, small screen, long content, failed request.

**Then, honestly, what you do not do.** Nobody tests with every assistive technology. Saying "I
cover the keyboard path and semantics, and I know that is not the whole of it" is more credible
than implying completeness.

## The follow-up

**"How would you convince a team to prioritise this?"** The strong answer is a cost argument: it
is a defect class, it affects a defined group completely, and it is cheapest at the point of
writing. **Not a moral argument**, which teams have heard and which does not compete with a
deadline.

## What loses marks

**Treating it as a separate phase.** "We do an accessibility pass before release" is how it gets
cut when the release is late, and interviewers who care about this have watched that happen.`,
    mcqs: [
      mcq('Starting the answer with the test rather than the standard matters because reciting guideline numbers is knowledge that:',
        [['May never have been applied', true],
         ['Changes between the different standards bodies', false],
         ['Is available to look up when it is needed', false],
         ['Applies only to public-sector applications', false]],
        'A described practice demonstrates the behaviour. Naming a standard demonstrates awareness of its existence and nothing about whether it is followed.'),
      mcq('The strong answer to convincing a team is a cost argument rather than a moral one because a moral argument:',
        [['Does not compete with a deadline', true],
         ['Is likely to offend somebody on the team', false],
         ['Applies only where there is a legal obligation', false],
         ['Has already been made by somebody else before', false]],
        'Teams have heard it and agree with it. What changes prioritisation is framing it as a defect class that is cheapest to fix at writing time.'),
    ],
    checkpoint: [
      mcq('Saying what you do not do — that you cover the keyboard path and semantics and know that is not the whole of it — is more credible than:',
        [['Implying completeness', true],
         ['Naming the tools you use for testing', false],
         ['Describing a process the team follows', false],
         ['Listing the standards you are familiar with', false]],
        'Nobody tests with every assistive technology. A claim of full coverage is either untrue or reveals an unrealistic idea of the scope.'),
      mcq('"We do an accessibility pass before release" is a weak answer because a separate phase is:',
        [['How it gets cut when the release is late', true],
         ['More expensive than continuous checking is', false],
         ['Impossible to schedule reliably in advance', false],
         ['Only effective for newly written features', false]],
        'Anything positioned as a final phase competes directly with the deadline, and interviewers who care about this have watched it lose.'),
    ],
  },

  /* ══ T4_FRONTEND_PROOF ══════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_FRONTEND_PROOF_ADVANCED_CHALLENGE',
    notes: `**An interface that works and feels slow. Measure it, fix the actual cause, prove the
improvement.**

## The brief

**Find or build something that feels sluggish** — a long list, a heavy form, a page with many
images, an animation that stutters.

**Measure before touching anything.** The browser's performance tools, on a throttled CPU, because
a fast laptop hides everything.

## The requirement that makes it an exercise

**The cause must be identified from measurement, not from reading.** Write down what you believe
is slow before you measure, then record whether you were right.

**You frequently will not be**, and that record is worth more than the fix. Frontend performance
intuition is unreliable even for experienced engineers, and the only way to calibrate it is to be
wrong with the evidence in front of you.

## The usual causes, none of which look expensive

**Too much work in one go**, blocking the thread. **Layout thrashing** in a loop. **Rendering
thousands of elements** when twenty are visible. **Images without dimensions**, causing shift.
**A re-render cascade** from one state change at the top.

## The fix, then the proof

**Measure again the same way.** Same device, same throttling, same interaction.

**And state what it cost.** Virtualising a list costs complexity. Chunking work costs a more
complicated flow. Nothing is free, and the write-ups that omit the cost are the ones nobody can
learn from.

## Why this is the advanced challenge for frontend

**Because it is the only one of the direction's problems that is objectively measurable**, and a
candidate who can say "it was 1200ms, the cause was X, it is now 300ms, and here is what that cost"
has an artefact almost no student portfolio contains.`,
    assignment: {
      title: 'Making it fast enough, measured',
      description: 'Diagnose a genuinely sluggish interface from measurement rather than reading, fix the real cause, and prove the improvement with the cost stated.',
      instructions: `Find or build an interface that genuinely feels sluggish — a long list, a
heavy form, a page with many images, a stuttering animation.

**Before measuring, write down what you believe is slow.** Then measure with the browser's
performance tools **on a throttled CPU**, because a fast laptop hides everything.

**Record whether you were right.** You frequently will not be, and that record is worth more than
the fix: frontend performance intuition is unreliable even for experienced engineers, and the only
way to calibrate it is to be wrong with the evidence in front of you.

**Fix the cause the measurement identified**, then measure again the same way — same device, same
throttling, same interaction.

**Submit:** your prediction, the before and after measurements, what the cause turned out to be,
and **what the fix cost** in complexity, code size or added dependency. Nothing is free, and
write-ups that omit the cost are the ones nobody can learn from.`,
      rubric: [
        { criterion: 'Prediction recorded before measuring', description: 'The belief about the cause is written down first and the write-up reports honestly whether it was correct.', maxPoints: 25 },
        { criterion: 'Measured under throttling', description: 'Both measurements use a throttled CPU and the same interaction, so the comparison is meaningful.', maxPoints: 25 },
        { criterion: 'The real cause was found', description: 'The fix addresses what the measurement identified rather than what looked expensive in the source.', maxPoints: 30 },
        { criterion: 'The cost is stated', description: 'The write-up names what the improvement cost in complexity, size or dependencies.', maxPoints: 20 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('Recording your prediction before measuring is worth more than the fix because being wrong with evidence in front of you is:',
        [['The only way to calibrate the intuition', true],
         ['Required for the measurement to be valid', false],
         ['Evidence that the profiling tool is accurate', false],
         ['A way of documenting the work for reviewers', false]],
        'Unchallenged beliefs about cost persist indefinitely. The contradiction is what updates them, and it needs to be noticed to do so.'),
      mcq('Measuring on a throttled CPU matters because a fast laptop:',
        [['Hides everything the users will experience', true],
         ['Produces measurements that vary between runs', false],
         ['Cannot run the browser profiling tools reliably', false],
         ['Optimises the JavaScript differently at runtime', false]],
        'The work is the same and the machine absorbs it. Throttling reproduces the conditions under which the sluggishness was reported.'),
    ],
  },
  {
    unitCode: 'T4_FRONTEND_PROOF_SPECIALIZATION_INTERVIEW',
    notes: `**A full interview on frontend engineering alone.**

## Where it starts

**Something you built.** They are establishing that real work exists, and then probing whether you
understood it or assembled it.

## Where it goes

**"Where does the state live and why?"** The depth question of the direction. Expect a follow-up
about a value that could go in two places.

**"What happens on a slow connection?"** Loading, error, empty, and keeping previous results
rather than blanking.

**"Two requests, the first returns second."** The race. Knowing it exists is most of the answer.

**"How do you know it is fast?"** Measurement, on throttled hardware, with a number.

**"Can somebody use this with a keyboard?"** And the honest scope of what you checked.

**"Why is this component re-rendering?"** Identity of dependencies, derived state stored, or a
context that changes too often.

## The depth marker

**Talking about what a user experiences rather than what the code does.** "The list re-renders"
is an implementation fact. "Typing feels laggy after the twentieth row because each keystroke
re-renders the whole list" is the same fact connected to a person, and it is the register this
direction is hired for.

## The failure mode

**Framework answers to conceptual questions.** Asked where state should live and answering with a
library's API means the question was not understood. Every framework has an answer; the question
was how you decide what to ask it for.

## How to prepare

**Three stories: a state decision that was wrong and how you found out, a performance problem
diagnosed from measurement, and an accessibility fault you found in your own work.** The third is
rare and lands very well.`,
    mcqs: [
      mcq('The depth marker in this round is talking about what a user experiences rather than:',
        [['What the code does', true],
         ['Which framework features were used', false],
         ['How the component tree is structured', false],
         ['The measurements taken during development', false]],
        '"The list re-renders" is an implementation fact. Connecting it to what typing feels like is the register the direction is hired for.'),
      mcq('Answering a question about where state should live with a library’s API means:',
        [['The question was not understood', true],
         ['The candidate prefers a specific ecosystem', false],
         ['The answer is correct but insufficiently general', false],
         ['The interviewer should rephrase the question', false]],
        'Every framework provides a mechanism. What was asked is how you decide what to ask it for, which is a decision the library does not make.'),
    ],
    checkpoint: [
      mcq('Of the three stories to prepare, the rare one that lands very well is:',
        [['An accessibility fault found in your own work', true],
         ['A performance problem diagnosed by measurement', false],
         ['A state decision that turned out to be wrong', false],
         ['A race condition reproduced and then fixed', false]],
        'It requires having looked at your own work from a perspective you do not use, which almost no candidate has done deliberately.'),
      mcq('Asked "why is this component re-rendering", the three standard causes are dependency identity, derived state stored, and:',
        [['A context that changes too often', true],
         ['An effect with a missing cleanup function', false],
         ['A parent that was mounted more than once', false],
         ['A key that is not stable across renders', false]],
        'A frequently-changing context propagates to every consumer regardless of whether the part they use changed, which is the third common cause.'),
    ],
  },
  {
    unitCode: 'T4_FRONTEND_PROOF_CHECKPOINT',
    notes: `**Whether frontend engineering is demonstrable.**

## What the track asked for

**Deciding** — where state lives, with the bug each wrong answer produces.

**Building** — four request states, the race handled, a real device on a real network.

**Protecting** — keyboard navigation, announced change, and not rendering user content as HTML.

**Measuring** — a performance problem found from evidence rather than from reading.

## The bar

**The fourth is the direction's only objectively provable claim**, and it is what makes a frontend
portfolio credible. Anybody can show an interface; a before-and-after measurement with a stated
cause and cost is rare.

## What a reviewer looks at

**The failure states.** Screenshots of loading, empty and error say more about the engineering
than any amount of visual polish.

**The measurement**, for the same reason.

## If this does not pass

**The usual gap is that everything works and nothing was measured or tested under constraint.**
The interface is fine on a laptop with a fast connection, honest input and a mouse. That is a
targeted week — throttle, resize, unplug the mouse, paste a long string — rather than a repeated
month.

## What this feeds

**Mock 5** on frontend depth. **The portfolio**, where the failure states and the measurement are
the two pieces worth showing. **P14's production project**, whose interface requirement assumes
you can build one that behaves under conditions you did not choose.`,
    checkpoint: [
      mcq('The direction’s only objectively provable claim, and what makes a frontend portfolio credible, is:',
        [['A before-and-after performance measurement', true],
         ['A visually polished and consistent interface', false],
         ['A component library built from scratch', false],
         ['Test coverage across the component tree', false]],
        'Everything else in the direction is judgement. A measured improvement with a stated cause and cost is evidence a reviewer can check.'),
      mcq('Screenshots of loading, empty and error states say more about the engineering than visual polish because they show:',
        [['The conditions the developer chose to handle', true],
         ['That the interface was tested by real users', false],
         ['How the component hierarchy is organised', false],
         ['Which design system the project follows', false]],
        'Polish is the default outcome of effort on the success path. Handled failure states are the deliberate part and most projects lack them.'),
      mcq('When this checkpoint does not pass, the usual gap is that everything works and nothing was:',
        [['Measured or tested under constraint', true],
         ['Reviewed by another developer at all', false],
         ['Built with accessibility in mind initially', false],
         ['Documented for somebody else to maintain', false]],
        'A laptop with a fast connection, honest input and a mouse creates none of the conditions the faults require. It is a targeted week rather than a month.'),
      mcq('P14’s interface requirement assumes from this track that you can build one that behaves under:',
        [['Conditions you did not choose', true],
         ['A design specification given to you', false],
         ['Load from many concurrent users at once', false],
         ['A framework you have not used before', false]],
        'Production means unknown devices, unknown networks and unknown input methods, which is precisely what this track spent its month on.'),
    ],
  },
];
