/**
 * The eight VERIFICATION units: seven checkpoints and one review.
 *
 * ── WHY THESE FIRST ───────────────────────────────────────────────────────────────────────
 *
 * They have no slack. An ESTABLISHED learner's plan allocates eight days to VERIFICATION and
 * exactly eight such units exist in the whole curriculum, so every one of them must be READY
 * or a strong student's ninety days cannot be composed at all. Everything else in Year 1 has
 * alternatives; this does not.
 *
 * ── WHAT A CHECKPOINT IS, AND WHAT IT IS NOT ──────────────────────────────────────────────
 *
 * It measures whether the block BEFORE it actually landed. So each one is written against its
 * own prerequisite chain, and against learning the production inventory actually teaches. A
 * question about something no published unit covers measures what the student happened to know
 * before they arrived, and a checkpoint that does that cannot tell the plan anything about the
 * plan.
 *
 * Phase 21 found four of the seven had drifted from that: the systems checkpoint asked mostly
 * about processes, memory and permissions, the quantitative one about sets and number systems,
 * the early one about hardware, and the two programme milestones about the assessment itself.
 * None of that is taught by a READY unit. Those questions were replaced with ones about the
 * material that is, each unit's skillKeys now name only skills it measures, and its prerequisites
 * name the practice that teaches them.
 *
 * They are deliberately not recall quizzes. A checkpoint question here gives a scenario and
 * asks what follows from it.
 *
 * ── EVERY QUESTION NAMES THE SKILL IT MEASURES ────────────────────────────────────────────
 *
 * Checkpoints span several skills, so the seed has nothing to derive a mapping from, and without
 * one a checkpoint is graded and never reaches Skill DNA. Each question below carries the one
 * skill it tests, chosen question by question from what it actually asks — never skillKeys[0].
 *
 * ── THE REVIEW IS TARGETED, NOT A REPEAT ──────────────────────────────────────────────────
 *
 * T_MILESTONE_PROGRAMMING_REVISION exists to close the specific gap its checkpoint found. Its
 * notes are therefore organised by MISCONCEPTION rather than by syllabus.
 *
 * ── READINESS ─────────────────────────────────────────────────────────────────────────────
 *
 * CHECKPOINT reaches READY on a bound assessment alone — that is its type rule, and the
 * `checkpoint` questions below become the bound Quiz. REVIEW needs teaching of its own, which
 * is the notes. Neither needs video, and none is invented.
 */

import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string, skillKey?: string,
): PilotMcq => ({
  question,
  options: options.map(([text, isCorrect]) => ({ text, isCorrect })),
  explanation,
  ...(skillKey ? { skillKey } : {}),
});

export const VERIFICATION_BUNDLES: PilotBundle[] = [
  /* ════════════════════════════════════════════════════════════════════════════════════════
   * M02 — From problem to plan
   * ══════════════════════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T_MILESTONE_EARLY_CHECKPOINT',
    notes: `This checkpoint measures one thing: **can you turn a problem you have never seen into a
plan somebody else could follow, and prove on paper that the plan does what you think.**

It covers what the pseudocode topic has been building, deliberately together rather than one
piece at a time:

- **Understanding the problem** — settling what it actually asks before planning anything
- **Writing the plan** — steps small enough to start on, in pseudocode any language could use
- **Flowcharts** — where the logic branches, and what happens on every branch
- **Dry running** — tracing the plan by hand, value by value, and finding the logic error

**Why they are assessed together.** Separately, each is a definition you can memorise. Together
they are the actual skill: a plan you never traced is a guess, and a trace of a plan that
misread the problem proves the wrong thing.

**There is no code in this checkpoint.** You are being asked to think, on paper, before
programming — which is the habit the whole of Computational Thinking has been building.

**How to prepare.** Take a problem you have not solved — "work out which students are eligible
for a scholarship from a spreadsheet of marks" is a fair example — and do the whole sequence:
restate it in your own words, write pseudocode with a decision and a loop, draw the decision as
a flowchart, then dry-run it with three inputs including an empty one. If you can do that, this
checkpoint holds no surprises.

**What the result is for.** It sets your measured state for these skills, and the rest of your
ninety days is built on that measurement rather than on which lessons you happened to open. A
low result is not a verdict; it changes what you are given next.`,
    checkpoint: [
      mcq('You are given: "Produce a list of students who have passed every subject." Which is the best FIRST step?',
        [['Restate it in your own words and settle what "passed" actually means', true],
          ['Start writing the loop that goes through the students one at a time', false],
          ['Decide which programming language the finished solution will be in', false],
          ['Draw a flowchart of the whole thing before writing anything else down', false]],
        'Planning comes after understanding. "Passed" might mean 35, 40, or "not failed any" — and a plan built on the wrong reading is wrong no matter how well it is drawn.',
        'PSEUDOCODE_FLOWCHARTS'),
      mcq('A decomposition has produced the step "handle the data properly". What is wrong with it?',
        [['It names an intention rather than an action somebody could carry out', true],
          ['It is too short, and every step should run to a full sentence', false],
          ['It should have been written in pseudocode rather than in plain English', false],
          ['Nothing is wrong; the detail gets filled in once the code is written', false]],
        'The test for a finished plan is that each step is small enough to START on. A step nobody can begin is a restatement of the problem hiding inside the solution.',
        'PSEUDOCODE_FLOWCHARTS'),
      mcq('Your pseudocode reads: "FOR each student: IF marks > 40 THEN add to list". Which edge case does it silently get wrong?',
        [['A student with exactly 40, excluded by > but who may well have passed', true],
          ['A student with 100 marks, which is above the range the test expects', false],
          ['An empty list of students, which makes the loop body never run at all', false],
          ['A student with negative marks, which the comparison cannot handle', false]],
        'Boundary values are where plans fail quietly. An empty list is also worth checking, but it produces an empty result, which is correct; exactly-40 produces a WRONG result.',
        'PSEUDOCODE_FLOWCHARTS'),
      mcq('You dry-run a plan on paper and it produces the right answer. What has that established?',
        [['That the plan is correct for that one input, and nothing beyond it', true],
          ['That the plan is correct, since a wrong plan could not produce it', false],
          ['That the code written from the plan will work the same way', false],
          ['That the edge cases are handled, or one of them would have shown', false]],
        'A dry run is evidence about the input you ran. It is valuable exactly because it is cheap enough to repeat with the empty case, the single-item case and the boundary.',
        'PSEUDOCODE_FLOWCHARTS'),
      mcq('Your pseudocode sets "count ← 0" inside the loop that reads each student. Dry-running three students, what do you see?',
        [['count finishes at 1 or 0, because it restarts on every pass', true],
          ['count finishes at 3, because the loop still visits every student', false],
          ['The loop stops after one student, because count was set back to 0', false],
          ['Nothing changes; where a variable is set does not affect a trace', false]],
        'A trace table shows the reset on its second row: the value that should carry forward goes back to zero each time. Finding that on paper is the whole reason to dry-run before writing code.',
        'PSEUDOCODE_FLOWCHARTS'),
      mcq('A flowchart has a decision diamond with two exits, but only one of them leads anywhere. What has the plan left out?',
        [['What happens when the decision comes out the other way', true],
          ['A start symbol, since every flowchart needs a clearly marked start', false],
          ['A loop, because a decision on its own cannot repeat anything', false],
          ['A note on the diamond saying which language will implement it', false]],
        'A decision always has two outcomes, and a plan that describes only one is silent about half of its inputs. That silent branch is where a program ends up doing something nobody chose.',
        'PSEUDOCODE_FLOWCHARTS'),
      mcq('Two steps of your plan could be done in either order. What does that tell you?',
        [['They are independent, so the order is yours to choose for readability', true],
          ['The decomposition is wrong, because the steps of a plan must be ordered', false],
          ['They should be merged, since order-free steps are really one step', false],
          ['One of them is unnecessary, or the plan would have fixed an order', false]],
        'Recognising independence is what lets a plan be reorganised safely. Steps that genuinely depend on each other cannot be reordered, and knowing which is which is the difference between editing a plan and breaking it.',
        'PSEUDOCODE_FLOWCHARTS'),
      mcq('A flowchart beats a numbered list when:',
        [['The logic branches and rejoins, so the shape of the paths is the point', true],
          ['The plan is long, and a diagram fits more onto one page than a list', false],
          ['The plan has a loop, which a numbered list has no way of expressing', false],
          ['You are presenting to somebody non-technical, who will not read a list', false]],
        'A straight sequence reads better as a list. A diagram earns its space when there are paths that split and come back together, which a list can only describe in words.',
        'PSEUDOCODE_FLOWCHARTS'),
    ],
  },

  /* ════════════════════════════════════════════════════════════════════════════════════════
   * M03 — Programming
   * ══════════════════════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T_MILESTONE_PROGRAMMING_CHECKPOINT',
    notes: `This checkpoint measures whether you can **write a working program from a plain-language
brief, unaided, and say why each construct was the right one.**

Unaided is the operative word. Everything up to here has come with a worked example in front of
you; this does not. The gap between "I followed that" and "I can do that" is precisely what is
being measured, and it is a gap almost everybody has at this point.

**What it covers, together:**

- **Conditions** — deciding between alternatives, with boundaries you got right
- **Loops** — repeating without repeating yourself, and terminating
- **Functions** — naming a piece of work so it can be reused and tested

**The second half is the explanation, and it carries real weight.** "Why a \`for\` loop rather than
a \`while\`?" has a correct answer for a given problem — the count is known in advance — and a
student who chose correctly by accident is in a different position from one who chose
deliberately. The explanation is what tells those two apart, and it is why the checkpoint is not
just a program you either got running or did not.

**How to prepare.** Take any small brief and implement it without looking anything up: a program
that reads a list of numbers and reports the largest, the average and how many were above
average. Then, before you run it, write one sentence per construct saying why you used it. If the
sentences are hard to write, that is the gap, and it is more useful to know now than later.

**If this checkpoint finds a gap**, the revision unit that follows is built on its result — it
returns to the specific construct that was not secure rather than to the whole module.`,
    checkpoint: [
      mcq('A brief says "ask the user for exactly five marks and report the average". Which loop is right, and why?',
        [['A `for` loop, because the number of repetitions is known before the loop starts', true],
          ['A `while` loop, because the program is reading input from a person', false],
          ['Either one; with a fixed count the two are exactly equivalent', false],
          ['A `while True` with a break after five, which reads most directly', false]],
        'Known count means `for`. A `while` works but tells the reader "this might run any number of times", which is false here — the construct is part of the explanation.',
        'LOOPS_BASICS'),
      mcq('A brief says "keep asking until the user types a valid number". Which loop is right?',
        [['A `while` loop, because the number of attempts is not known in advance', true],
          ['A `for` loop over a range large enough to cover every attempt', false],
          ['A `for` loop with a break once a valid number finally arrives', false],
          ['No loop at all; validate once and exit if the input is wrong', false]],
        'Unknown count means `while`. The pair of these two questions is the whole distinction, and choosing correctly for the wrong reason is what the explanation exposes.',
        'LOOPS_BASICS'),
      mcq('Your function computes an average and ends with `print(avg)`. The caller cannot use the result. Why?',
        [['Printing sends a value to the screen; only `return` sends it back to the caller', true],
          ['The function needs a parameter for the value it is supposed to give back', false],
          ['`avg` is out of scope by the time the caller tries to read it', false],
          ['It must be called differently for the printed value to be captured', false]],
        'The single most common confusion at this stage. Printing is a side effect for a human; returning is how one piece of code hands a value to another.',
        'FUNCTIONS_BASICS'),
      mcq('`total = 0` sits INSIDE your loop and your sum always comes out as the last value. The fix is:',
        [['Move the initialisation above the loop, so it happens once rather than every pass', true],
          ['Change `total = 0` to `total += 0` so the running sum is preserved', false],
          ['Use a `while` loop instead, which does not reset its own variables', false],
          ['Initialise it to the first element and start the loop from the second', false]],
        'The accumulator pattern: set up before, accumulate inside, read after. Resetting inside means each pass discards everything before it.',
        'LOOPS_BASICS'),
      mcq('A brief needs the same three-line calculation in four places. What should you do, and why?',
        [['Write one function and call it four times; a correction is made once', true],
          ['Copy the three lines four times; it is only twelve lines', false],
          ['Write a loop around them, so the lines appear only once', false],
          ['Use a global variable to hold the result of the calculation', false]],
        'Functions are not about saving typing. They are about there being ONE place where that logic lives, so it cannot be fixed in three places and missed in the fourth.',
        'FUNCTIONS_BASICS'),
      mcq('A brief says "a mark of 40 or more is a pass". Your condition is `if mark > 40:`. Which input exposes the bug?',
        [['40, which should pass but is treated as a fail', true],
          ['0, which is the lowest mark the program will ever be given', false],
          ['100, which is the highest mark and the top edge of the range', false],
          ['41, which is the first whole mark above the pass line', false]],
        '"40 or more" includes 40, which `>` excludes. Only the boundary value exposes the difference; every other input behaves the same under `>` and `>=`.',
        'CONDITIONALS_BASICS'),
      mcq('A variable inside a function is invisible outside it. What is that called, and why is it good?',
        [['Scope — it means a function cannot accidentally break the rest of the program', true],
          ['Encapsulation, and it saves memory by freeing the frame on return', false],
          ['Shadowing, and it prevents a typo from reaching the outer name', false],
          ['A limitation, and declaring the variable global is the usual fix', false]],
        'Local scope is what makes a function safe to reuse: its internals cannot collide with a name somebody else chose elsewhere.',
        'FUNCTIONS_BASICS'),
      mcq('An if/elif chain tests `score >= 50` before it tests `score >= 80`. What happens to a score of 90?',
        [['It takes the 50 branch, so the 80 branch can never be reached', true],
          ['It takes the 80 branch, because the more specific test always wins', false],
          ['It takes both branches, since both conditions are true for 90', false],
          ['It raises an error, because two conditions overlap for one value', false]],
        'An elif chain stops at the first condition that is true. Ordering thresholds strictest first is what makes every branch reachable, and walking the highest input through the chain is how to check.',
        'CONDITIONALS_BASICS'),
      mcq('Which of these is a genuine reason to split a working 40-line program into functions?',
        [['Each piece can then be tested and understood on its own', true],
          ['It will run faster, since each function is compiled separately', false],
          ['It uses less memory, because each frame is freed on return', false],
          ['It is the convention, and reviewers expect short functions', false]],
        'Decomposition in code buys the same thing it buys on paper: smaller pieces you can be sure about separately.',
        'FUNCTIONS_BASICS'),
    ],
  },
  {
    unitCode: 'T_MILESTONE_PROGRAMMING_REVISION',
    notes: `This unit is **not a repeat of the Programming module.** It is a targeted return to
whichever construct your checkpoint showed was not secure, organised by the mistake rather than
by the syllabus — because re-reading everything is exactly what you would do if nobody helped
you, and it is the least efficient possible response to a specific gap.

Find your result below and work only that section. If two apply, work both. If none applies,
your gap was the *explanation* rather than the construct, and the last section is yours.

---

**IF CONDITIONS WERE THE GAP**

The three failures, in the order they actually occur:

1. **The boundary.** You wrote \`>\` where the brief said "at least", or \`<\` where it said "up to
   and including". This produces a program that is correct for almost every input and wrong for
   exactly one value. *The habit that fixes it:* for every threshold \`n\`, run \`n-1\`, \`n\`, \`n+1\`
   before you believe the program.
2. **The chain order.** You put a looser test above a stricter one, so one branch claims
   everything and another is unreachable. *The habit:* order thresholds strictest first, then
   take the highest value you expect and walk the tests — if it matches anything but the top
   branch, the order is wrong.
3. **\`x == 1 or 2\`.** This is always true, because \`2\` is a truthy value in its own right rather
   than part of a comparison. Write \`x in (1, 2)\`.

**Re-measure yourself:** write a grading function with four bands and prove all three boundaries
with a test table before running it.

---

**IF LOOPS WERE THE GAP**

1. **Choosing the wrong loop.** Known count → \`for\`. Unknown count → \`while\`. If you cannot say
   which you have, you do not yet understand the brief.
2. **The accumulator reset.** \`total = 0\` belongs *above* the loop. Inside it, every pass throws
   away everything before it, and the result is always the last value — a symptom worth
   recognising on sight.
3. **The loop that never ends.** A \`while\` whose condition can never become false. Every \`while\`
   needs something inside it that moves towards stopping; find that line before you run it.

**Re-measure yourself:** without looking anything up, write a program that reads numbers until
the user enters 0, then reports the count and the average. It needs the right loop, an
accumulator and a guard against dividing by zero.

---

**IF FUNCTIONS WERE THE GAP**

1. **\`print\` instead of \`return\`.** Printing shows a human; returning hands the value to the
   caller. A function that prints its answer cannot be used by anything.
2. **Scope.** A name created inside a function does not exist outside it. This is a feature: it
   is what makes a function safe to reuse anywhere.
3. **Doing more than one thing.** A function called \`process_data\` that reads a file, calculates
   and prints is three functions wearing one name, and it cannot be tested.

**Re-measure yourself:** take the 40-line program from your checkpoint and split it into three
functions, each of which returns rather than prints, then call them from four lines.

---

**IF THE EXPLANATION WAS THE GAP**

Your program worked and you could not say why you made each choice. This is the most common
result and the least worrying, but it does need closing — code that works by accident works
until the problem changes slightly.

The exercise: take that same program and write one sentence per construct.

- "I used a \`for\` because ______"
- "The condition is \`>=\` rather than \`>\` because the brief said ______"
- "This is a function because ______"

If a sentence is hard to write, that construct is the gap, and you now know which section above
to work.

---

**WHAT HAPPENS NEXT.** Whatever you do here, you will be measured again — this unit changes what
you are given, not what you have been recorded as knowing. A revision day is not evidence; the
reassessment that follows it is.`,
    mcqs: [
      mcq('Your checkpoint showed the boundary was wrong. Which habit prevents a repeat?',
        [['Run n-1, n and n+1 for every threshold before believing the program', true],
          ['Always use `>=`, which includes the boundary value by default', false],
          ['Add more test cases generally, so the coverage is wider', false],
          ['Use an if/elif chain rather than a single if with a comparison', false]],
        'Off-by-one lives exactly at the boundary. Inputs far from it pass under both the correct and the incorrect operator, which is why general testing misses it.'),
      mcq('A sum always equals the last value entered. Which line is in the wrong place?',
        [['`total = 0`, which is inside the loop rather than above it', true],
          ['The `print`, which is inside the loop instead of after it', false],
          ['The input line, which is reading a new value each pass', false],
          ['The loop condition, which stops one iteration too early', false]],
        'Set up before, accumulate inside, read after. The symptom — the result equals the final input — identifies this bug on sight.'),
      mcq('Why is "my program worked but I cannot explain the loop choice" worth acting on?',
        [['Code that works by accident stops working when the problem changes slightly', true],
          ['It is not worth acting on; working code is sufficient evidence', false],
          ['Because the explanation carries marks in the assessment itself', false],
          ['Because a loop you cannot justify is probably the wrong loop', false]],
        'The checkpoint separates working-by-understanding from working-by-accident precisely so this can be closed while the problem is still small.'),
      mcq('What does completing this revision unit establish about your skill level?',
        [['Nothing by itself — the reassessment that follows is the evidence', true],
          ['That the gap the checkpoint found has now been closed', false],
          ['That the skill is verified and will not be reassessed again', false],
          ['That the reassessment can be skipped, since the work is done', false]],
        'A scheduled day is not a measurement. This unit changes what you are given next; only a reassessment changes what is recorded about you.'),
    ],
  },

  /* ════════════════════════════════════════════════════════════════════════════════════════
   * M05 — Web
   * ══════════════════════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T_MILESTONE_WEB_CHECKPOINT',
    notes: `This checkpoint measures whether you can **build a small page to a brief using structure,
style and behaviour together — and defend each choice, including the accessibility ones.**

Up to now you have met HTML, CSS, the DOM and forms as separate topics. A real page is all four
at once, and the interesting mistakes only appear when they meet: a form that validates in
JavaScript and tells nobody using a screen reader, a layout that works until the text is longer
than the designer imagined, a heading chosen because it looked the right size.

**What you will be asked to produce:** a page with real structure, styling that survives a
narrow screen, one piece of behaviour driven by the DOM, and a form that reports its own errors
in a way everybody can perceive.

**The defence matters as much as the page.** "Why \`<button>\` and not a styled \`<div>\`?" has a
real answer — keyboard focus, Enter and Space, and the announced role — and a student who used
a button because the tutorial did is in a different position from one who used it deliberately.

**How to prepare.** Build a contact form page from scratch, then test it three ways: navigate it
using only the Tab key, narrow the browser to phone width, and make every field invalid at once.
Most of what this checkpoint asks is visible in those three tests.`,
    checkpoint: [
      mcq('You need a clickable control that runs JavaScript. Why `<button>` rather than a styled `<div>`?',
        [['It is focusable, fires on Enter and Space, and announces itself', true],
          ['A `<div>` cannot carry a click handler without a `role` as well', false],
          ['A `<button>` is easier to style consistently across browsers', false],
          ['There is no real difference once a keydown handler is added', false]],
        'A div can be made to work with tabindex, key handlers and a role — which is three things you must remember and a button gives you for free.',
        'WEB_ACCESSIBILITY'),
      mcq('Your form validates with JavaScript and shows red borders. What is missing for a screen-reader user?',
        [['A text message tied to the field, so the error is announced and not only coloured', true],
          ['A stronger colour, since red on white is too faint to notice', false],
          ['Server-side validation, because client-side checks are not announced at all', false],
          ['Nothing is missing: a red border is the standard error convention', false]],
        'Colour is one channel and not everybody receives it. The error has to exist as text, tied to the input, or the page has told only some of its users what went wrong.',
        'HTML_FORMS'),
      mcq('A heading should be `<h2>` rather than `<h1>` because:',
        [['It is a subsection of the one main topic; level is structure, not size', true],
          ['An `<h1>` is too large here, and the heading should not dominate', false],
          ['There may only be one `<h1>` in an entire site, not merely per page', false],
          ['An `<h2>` ranks better, because search engines weight it differently', false]],
        'Choosing a heading by how big it renders is the mistake. Size is CSS; level says how the document is organised, and that is what assistive technology and search engines read.',
        'HTML'),
      mcq('Your layout breaks at 375px wide. Which is the most likely cause?',
        [['A fixed pixel width or min-width on something that cannot shrink', true],
          ['Too many elements in one row for the browser to lay out neatly', false],
          ['A missing viewport meta tag, and nothing else in the stylesheet', false],
          ['Using flexbox, which does not reflow below a certain width', false]],
        'A missing viewport tag is also a common cause and worth checking. But a hard-coded width is the one that survives the tag being present, because the element simply cannot fit.',
        'CSS'),
      mcq('`document.querySelector(\'.total\').textContent = sum` throws "Cannot set properties of null". Why?',
        [['No element matched the selector when the script ran, so there is nothing to set', true],
          ['`sum` is a number, and textContent only accepts a string value', false],
          ['textContent is read-only, so it can be read but never assigned to', false],
          ['The element needs an id, because a class selector cannot be written to', false]],
        'Two causes with the same message, and the fix differs: correct the selector, or move the script to the end of the body / use defer so the element exists by then.',
        'JS_DOM'),
      mcq('A label is associated with its input so that:',
        [['Clicking the label focuses the input, and the field is announced by name', true],
          ['The form looks tidier, because the label aligns with the field it names', false],
          ['Validation works, since the browser needs the label to report an error', false],
          ['It is required by HTML, and the page will not validate without it', false]],
        'Two benefits, one visible and one not. A placeholder is not a substitute: it disappears the moment somebody types.',
        'HTML_FORMS'),
      mcq('You style with `div.card` everywhere and the page works. What have you given up?',
        [['Meaning: nothing in the markup says what the regions are, so only the CSS knows', true],
          ['Performance, because class selectors are slower for the browser', false],
          ['Nothing at all, provided the class names describe each region', false],
          ['Browser support, since older browsers do not style class selectors reliably', false]],
        'It renders identically and reads as nothing. `<nav>`, `<main>`, `<article>` cost the same to write and say what the regions are to anything that is not looking at pixels.',
        'HTML'),
      mcq('Your page works with a mouse and cannot be used with a keyboard. The most likely cause is:',
        [['Interactive behaviour attached to elements that cannot take focus', true],
          ['Missing CSS, so the focus ring is invisible against the background', false],
          ['A JavaScript error that stops the key handlers from being attached', false],
          ['Too many form fields, so the tab order runs out before the end', false]],
        'This is what the Tab-key test finds in about thirty seconds, and it is why that test is worth running before you believe a page is finished.',
        'WEB_ACCESSIBILITY'),
    ],
  },

  /* ════════════════════════════════════════════════════════════════════════════════════════
   * M09 — Systems
   * ══════════════════════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T_MILESTONE_SYSTEMS_CHECKPOINT',
    notes: `This checkpoint measures whether you can **get real work done at a shell without
step-by-step instructions, and explain what each stage of what you typed is doing.**

The tasks are the ordinary ones: pull the lines that matter out of a large log, count and rank
what you found, capture the output and the errors where somebody can read them later, and write
a small script that stops rather than carrying on when a step fails.

**Why "without step-by-step instructions" matters.** Following a command you were given proves
you can type. The skill is knowing *which* tools to compose, from what you can see, when nobody
has told you — and predicting what the pipeline will produce before you press Enter.

**What it covers, together:**

- **Pipes** — small tools that each do one job, composed left to right
- **Streams and redirection** — standard output and standard error are different, and \`>\`, \`>>\`
  and \`2>\` each do something different with them
- **grep, sort, uniq and cut** — selecting, ordering, counting and slicing text
- **Scripts** — the same commands saved, run again, and made to stop safely on a failure

**The explanation half is not decoration.** "I added \`sort\` and then it worked" and "\`uniq\` only
merges adjacent lines, so the input has to be sorted first" are the same fix and completely
different levels of understanding.

**How to prepare.** Take any large text file and, without looking anything up: find the lines
containing a word, count how many times each distinct value appears, list the top five, save the
result to a file, and run the whole thing from a script that exits the moment a command fails.`,
    checkpoint: [
      mcq('You need every `.log` file under a directory tree modified in the last two days. Which approach fits the shell?',
        [['`find` with the right predicates, piped onward if more is needed', true],
          ['Open each folder in turn and read the modification dates', false],
          ['`ls -R` over the tree, then read the output for recent dates', false],
          ['`grep -r` for ".log", which searches the tree recursively', false]],
        'The shell is composition: one tool that selects, another that acts. `grep` searches CONTENT, which is a different question from selecting files by name and age.',
        'SHELL_PIPELINES'),
      mcq('A script prints its errors, and `./run.sh > out.txt` still shows them on the screen. Why?',
        [['Errors go to standard error, and `>` only redirects standard output', true],
          ['The file was not writable, so the output fell back to the screen', false],
          ['`>` only captures output lines that end with a newline character', false],
          ['The script needs `echo` for anything at all to reach the file', false]],
        'There are two output streams. Capturing the errors too needs `2>` or `2>&1`, and knowing the streams are separate is what makes that fix obvious rather than magical.',
        'SHELL_PIPELINES'),
      mcq('You run `./report.sh > log.txt` every hour and only ever find the latest run in the file. What should change?',
        [['Use `>>`, which appends, instead of `>`, which empties the file first', true],
          ['Run the script with sudo, so the shell does not reset the file', false],
          ['Add a `sleep` at the end so the file is saved before it closes', false],
          ['Write to a new folder, since one file cannot hold two separate runs', false]],
        'A single `>` truncates the file before writing to it. Appending keeps the history, which is usually the point of a log.',
        'SHELL_PIPELINES'),
      mcq('`cat access.log | uniq -c` still shows the same IP address on several separate lines. Why?',
        [['`uniq` only merges adjacent lines, so the input needs `sort` first', true],
          ['`uniq -c` counts characters, so the addresses are never compared', false],
          ['`cat` reorders the lines, which stops `uniq` from matching them', false],
          ['The addresses differ in trailing spaces that `uniq` cannot ignore', false]],
        'The idiom is `sort | uniq -c`. Knowing why the sort is there is the difference between remembering a recipe and understanding the tools it is made from.',
        'SHELL_PIPELINES'),
      mcq('Which pipeline counts the lines in `app.log` that do NOT contain the word DEBUG?',
        [['`grep -v DEBUG app.log | wc -l`', true],
          ['`grep DEBUG app.log | wc -l`', false],
          ['`grep -c DEBUG app.log`', false],
          ['`wc -l app.log | grep -v DEBUG`', false]],
        '`-v` inverts the match and `wc -l` counts what survives. Filtering has to come before counting; counting first leaves nothing meaningful to filter.',
        'SHELL_PIPELINES'),
      mcq('Why compose small commands with a pipe rather than looking for one command that does everything?',
        [['Each tool does one job well, and combining them covers unforeseen cases', true],
          ['Pipes are faster, because no intermediate file is ever written', false],
          ['It uses less memory than one tool holding the whole input', false],
          ['A single command that does all of it does not usually exist', false]],
        'This is the design of the shell rather than a style preference, and it is why knowing six composable tools beats memorising sixty flags.',
        'SHELL_PIPELINES'),
      mcq('A script runs `cd /data` and then `rm *.tmp`. The `cd` fails. What should the script have done?',
        [['Stop on the failure, for example with `set -e` or by checking `$?`', true],
          ['Nothing; the shell skips every command after a failed `cd`', false],
          ['Run `rm` with `-i`, so that each deletion asks before it happens', false],
          ['Run `ls` first, which is what makes a directory change take effect', false]],
        'A shell script carries on after a failed command by default, so `rm` runs in whatever directory it was already in. Checking the exit status is what stops one failure turning into a worse one.',
        'SHELL_PIPELINES'),
      mcq('`cut -d, -f2 users.csv | sort | uniq` lists the distinct values of what?',
        [['The second comma-separated column of every row', true],
          ['The second line of the file, split into its comma fields', false],
          ['Every column except the second, with duplicates removed', false],
          ['The first two columns, joined and then sorted together', false]],
        '`-d,` sets the delimiter and `-f2` selects the field. Reading a pipeline left to right, one stage at a time, is how you predict what it will produce.',
        'SHELL_PIPELINES'),
    ],
  },

  /* ════════════════════════════════════════════════════════════════════════════════════════
   * M10 — Quantitative
   * ══════════════════════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T_MILESTONE_QUANT_CHECKPOINT',
    notes: `This checkpoint measures whether you can **reason with boolean logic and propositional
logic together, and show working somebody else can check.**

You have met truth values, truth tables, gates, an adder built from gates, and the algebra that
simplifies a condition. Each is tractable on its own. This asks for problems where they meet —
because that is where they are actually used, and because a student who has memorised the laws
separately cannot tell which one a problem needs.

**Working shown, not the answer alone.** An answer is a claim. Working is the evidence for it:
a truth table, the law applied at each step, the gate that produces each output. It is also the
only thing that can be marked usefully when the answer is wrong.

**Where these actually turn up**, so the effort has a point:

- Every condition you will ever write is a boolean expression, and simplifying the ones that got
  out of hand is algebra, not guesswork
- Negating a condition correctly — including the boundary inside a comparison — is De Morgan
- "If this, then that" rules in specifications are implications, and are broken in exactly one way
- Arithmetic in hardware is gates: the half adder is XOR and AND and nothing more

**How to prepare.** Work problems that force a translation: turn an English rule into a boolean
expression, simplify it, and then say in English what the simplified form means. If the simplified
sentence still describes the original rule, you have understood the algebra rather than applied
it.`,
    checkpoint: [
      mcq('Simplify `NOT (A AND B)`.',
        [['`(NOT A) OR (NOT B)`', true],
          ['`(NOT A) AND (NOT B)`', false],
          ['`A OR B`', false],
          ['`NOT A AND B`', false]],
        "De Morgan's law. Negating a conjunction flips it to a disjunction and negates both sides — and this is the rule that untangles most over-complicated conditions.",
        'BOOLEAN_ALGEBRA'),
      mcq('The rule is "access unless the account is suspended AND unpaid". Which condition grants access?',
        [['`not (suspended and unpaid)`, equivalently `not suspended or not unpaid`', true],
          ['`not suspended and not unpaid`, requiring both to be false', false],
          ['`suspended or unpaid`, which is the condition stated in the rule', false],
          ['`not suspended`, since payment is a separate matter entirely', false]],
        'The second option is stricter than the rule: it denies access to a suspended account that has paid, which the English does not say. Translating carefully is the actual skill here.',
        'PROPOSITIONAL_LOGIC'),
      mcq('A truth table for an expression with four input variables has how many rows?',
        [['16', true], ['8', false], ['4', false], ['12', false]],
        'Each input doubles the number of combinations, so four inputs give 2 × 2 × 2 × 2. It is also why truth tables stop being practical by hand beyond a handful of inputs.',
        'BOOLEAN_ALGEBRA'),
      mcq('In a half adder, which gates produce the sum bit and the carry bit?',
        [['XOR for the sum, AND for the carry', true],
          ['AND for the sum, XOR for the carry', false],
          ['OR for the sum, AND for the carry', false],
          ['XOR for both, with the carry inverted', false]],
        '1 + 1 is 0 carry 1. The sum is 1 only when exactly one input is 1, which is XOR; the carry is 1 only when both are, which is AND.',
        'BOOLEAN_ALGEBRA'),
      mcq('"If it rains, the match is cancelled." Which situation shows that statement is FALSE?',
        [['It rains and the match goes ahead', true],
          ['It does not rain and the match is cancelled', false],
          ['It does not rain and the match goes ahead', false],
          ['It rains and the match is cancelled', false]],
        'An implication is broken only when the condition holds and the result does not. A cancelled match on a dry day does not contradict it, which is the case people most often get wrong.',
        'PROPOSITIONAL_LOGIC'),
      mcq('`A OR (A AND B)` simplifies to:',
        [['`A`', true], ['`B`', false], ['`A AND B`', false], ['`A OR B`', false]],
        'Absorption. The second branch can only be true where A is already true, so it adds nothing. Spotting it is what stops a condition gaining a clause every time somebody remembers another case.',
        'BOOLEAN_ALGEBRA'),
      mcq('A condition reads `not (x > 5 or y < 2)`. Which expression is equivalent?',
        [['`x <= 5 and y >= 2`', true],
          ['`x <= 5 or y >= 2`', false],
          ['`x < 5 and y > 2`', false],
          ['`not x > 5 or y < 2`', false]],
        'De Morgan again, with the comparisons negated as well: the negation of > is <=, not <. Getting that boundary right is what keeps a simplified condition equivalent to the original.',
        'BOOLEAN_ALGEBRA'),
      mcq('A gate outputs 1 only when its two inputs are different. Which gate is it?',
        [['XOR', true], ['OR', false], ['NAND', false], ['XNOR', false]],
        'XOR is true for exactly one true input. XNOR is its opposite, true when the inputs match, and confusing the two is the usual slip.',
        'BOOLEAN_ALGEBRA'),
    ],
  },

  /* ════════════════════════════════════════════════════════════════════════════════════════
   * M14 — Capstone milestones
   * ══════════════════════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T_MILESTONE_FOUNDATION_MIDPOINT',
    notes: `Halfway. This measures **what has actually stuck from the first half of the programme** —
planning a solution and the core of programming — so the second half is built on evidence
rather than on attendance.

**Why a measurement rather than a summary.** By this point, the honest position is that some of
what you covered is secure, some is half-remembered, and neither you nor the plan currently knows
which is which. Attendance tells you what was scheduled. This tells you what remains.

**It arrives after the work it measures.** You meet it only once you have practised planning in
pseudocode, conditions, loops and functions — or have already shown you can — because a
reassessment of material you have not reached measures nothing.

**It is deliberately mixed and deliberately unannounced by topic.** Questions arrive without a
label saying which topic they belong to, because recognising *which idea a problem needs* is
part of what is being measured.

**What it covers:** tracing a plan, conditions, loops and functions — the four things everything
in the second half is built on.

**What happens with the result.** Your remaining days are recomposed against it. A skill that
comes out strong stops being taught and starts being applied; one that comes out weak gets the
foundation work it needs. Nothing is deleted and nothing is skipped as a punishment — the plan
stays ninety days, and only its contents change.

**How to prepare — and a caution.** Do not cram. A crammed result changes your plan in the wrong
direction: it hides a gap that will then not be addressed, and you will meet it again later with
less time.`,
    checkpoint: [
      mcq('A grading function returns "C" for every mark from 40 to 100. Which is the most likely cause?',
        [['A looser test such as `>= 40` is checked before the stricter ones', true],
          ['The function returns before any of its conditions are evaluated', false],
          ['The mark arrives as text, so every comparison happens to be true', false],
          ['`elif` is used, and it should be a series of separate `if` tests', false]],
        'An if/elif chain takes the first true branch. When one result swallows a whole range, the order of the thresholds is the first thing to check.',
        'CONDITIONALS_BASICS'),
      mcq('Dry-run `total ← 0; FOR n IN [3, 5, 2]: total ← total + n`. What is `total` after the second pass?',
        [['8', true], ['5', false], ['10', false], ['3', false]],
        'After the first pass total is 3; after the second it is 3 + 5 = 8. Writing the value after each pass, rather than guessing the end, is what a dry run is for.',
        'PSEUDOCODE_FLOWCHARTS'),
      mcq('Your loop runs one time too many. Which is the most likely cause?',
        [['A range or condition boundary that includes one value too many', true],
          ['A missing return, so the loop continues past where it should stop', false],
          ['Wrong indentation, putting a line inside the loop that belongs after', false],
          ['An uninitialised variable that starts one higher than it should', false]],
        'Off-by-one is the most common loop bug in existence, and it is worth being able to name the symptom before you look at the code.',
        'LOOPS_BASICS'),
      mcq('`def average(xs): return sum(xs) / len(xs)` passes your tests and crashes for a colleague. What should you suspect first?',
        [['They called it with an empty list, so it divides by zero', true],
          ['Their Python has a different `sum` that returns a string', false],
          ['`len` is slow on long lists, and the call timed out for them', false],
          ['A function cannot be shared between two different machines', false]],
        'The function has an unstated precondition: at least one value. Naming it — and either checking for it or documenting it — turns a mysterious failure into a one-line fix.',
        'FUNCTIONS_BASICS'),
      mcq('Which loop prints 1, 2 and 3, and then stops?',
        [['`for i in range(1, 4): print(i)`', true],
          ['`for i in range(1, 3): print(i)`', false],
          ['`for i in range(3): print(i)`', false],
          ['`for i in range(0, 4): print(i)`', false]],
        '`range(1, 4)` starts at 1 and stops BEFORE 4. The end is excluded, which is where most off-by-one loop bugs come from.',
        'LOOPS_BASICS'),
      mcq('A function is defined with a parameter `rate=0.1`. A caller writes `price(100)`. What is `rate`?',
        [['0.1, the default, because the caller did not pass a rate', true],
          ['None, because the caller did not provide a value for it', false],
          ['100, since the only argument fills every parameter in turn', false],
          ['Nothing: it raises an error, as every parameter must be passed', false]],
        'A default is used only when the argument is omitted. It lets a function serve the common case simply while still accepting a different rate when one is needed.',
        'FUNCTIONS_BASICS'),
      mcq('Why does `if x == 1 or 2:` run its body even when `x` is 5?',
        [['`2` on its own is truthy, so the `or` is always true', true],
          ['`or` compares both sides with `x`, and 2 is close enough to 5', false],
          ['`==` binds after `or`, so it really tests `x == (1 or 2)`', false],
          ['Python treats any comparison involving 5 as true in a condition', false]],
        'Each side of `or` is its own condition. The fix is `x in (1, 2)` or `x == 1 or x == 2`, and recognising the pattern is worth more than memorising the fix.',
        'CONDITIONALS_BASICS'),
    ],
  },
  {
    unitCode: 'T_MILESTONE_FOUNDATION_READINESS',
    notes: `The exit measurement. This establishes **what you can do unaided across the core of the
Foundation — data in arrays, data in a database, and work kept safely in version control — and
what the next stage should assume about you.**

**It is not a pass/fail gate.** Nothing is withheld on the strength of it. What it produces is an
accurate statement of your current capability — used by the next stage of your learning, which
needs to know where to start, and by you, when somebody asks what you can do.

**It arrives last on purpose.** You meet it after the midpoint reassessment and after you have
practised arrays, SQL and Git — or have already shown you can — because an exit measurement of
work you have not done measures only what you walked in with.

**What is measured:**

1. **Arrays** — choosing the approach the data allows, and knowing what it costs as the data grows
2. **Databases** — asking a question of grouped data, and why a fact belongs in one place
3. **Version control** — undoing safely on a shared branch, and what a merge conflict is asking you

Each question gives a situation and asks what you would do. Knowing the name of a technique is
not enough; choosing it for the right reason is what transfers to the next problem.

**How to prepare.** Take three things you built during Foundation and, for each, write two
sentences: what problem it solves, and what you had to understand to build it. Then, for each
of the three areas above, explain one decision you made and what the alternative would have
cost. That is exactly the kind of reasoning this review asks for.

**After this**, your measured state carries into the next stage. Nothing you demonstrated is
re-taught, and nothing you did not is assumed.`,
    checkpoint: [
      mcq('You need to check whether a sorted array of a million numbers contains 42. Which approach, and why?',
        [['Binary search, halving the range each step because the order is known', true],
          ['A linear scan, because it is the only method that works on any array', false],
          ['Sort it again first, since a search cannot trust an existing order', false],
          ['Put every value into a set, which always beats searching the array', false]],
        'Sortedness is the precondition binary search exploits: about twenty comparisons instead of up to a million. Knowing the precondition is what tells you when the faster method is allowed.',
        'DSA_ARRAYS'),
      mcq('Checking every pair in a list for a duplicate uses two nested loops. How does the work grow when the list doubles?',
        [['About four times as much, because the number of pairs grows with the square', true],
          ['About twice as much, because the list itself is only twice as long now', false],
          ['The same, because each comparison still takes a fixed amount of time', false],
          ['About eight times as much, since there are two loops and a comparison', false]],
        'Nested loops over the same list are quadratic: n² pairs. That is why a set, which checks membership in constant time on average, changes the problem rather than just speeding it up.',
        'DSA_ARRAYS'),
      mcq('You want the departments that have more than five employees. Where does `COUNT(*) > 5` belong?',
        [['In HAVING, because it filters groups after GROUP BY has formed them', true],
          ['In WHERE, because WHERE is where every filtering condition goes', false],
          ['In SELECT, as an alias that the rest of the query then filters on', false],
          ['In ORDER BY, so that the larger departments are listed at the top', false]],
        'WHERE filters rows before grouping, so it cannot see a count that does not exist yet. HAVING filters the groups, which is why the two clauses both exist.',
        'SQL_BASICS'),
      mcq('An orders table stores the customer\'s name on every row. The customer changes their name. What goes wrong?',
        [['Every past order must be updated, and a missed row now disagrees', true],
          ['Nothing, because a name is text and can be changed in place', false],
          ['The primary key breaks, since the name was part of every row', false],
          ['Old orders are deleted automatically once the name has changed', false]],
        'Storing one fact in many places means changing it in many places. A customers table referenced by id keeps the name in one row, which is what keys and foreign keys are for.',
        'DB_FUNDAMENTALS'),
      mcq('A commit already pushed to a shared branch contains a bug. What is the safe way to undo it?',
        [['`git revert`, which adds a new commit that reverses the change', true],
          ['`git reset --hard` to the previous commit, then push with force', false],
          ['Delete the changed file, commit that, and ask others to pull again', false],
          ['Amend the commit, which replaces it cleanly in everybody\'s history', false]],
        'Rewriting history that others already have breaks their copies. A revert records the undo as ordinary history, so everybody can pull it without conflict.',
        'GIT_FUNDAMENTALS'),
      mcq('Git reports a conflict while merging your branch. What does that mean?',
        [['Both branches changed the same lines, so Git needs you to choose', true],
          ['Your branch is broken and has to be deleted and created again', false],
          ['Somebody else is merging at the same moment, so wait and retry', false],
          ['The two branches have names that Git has no way to reconcile', false]],
        'A conflict is Git declining to guess, not an error. It merges changes to different lines by itself; overlapping edits need a human decision, which is then committed like any other change.',
        'GIT_BRANCHING'),
    ],
  },
];
