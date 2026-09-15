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
 * own prerequisite chain — the early checkpoint asks about decomposition and what the machine
 * does with a plan, because that is what precedes it; the systems checkpoint asks about
 * processes, permissions and memory, because that is what precedes it. A question that could
 * appear in any of the seven is, by construction, measuring nothing in particular.
 *
 * They are deliberately not recall quizzes. A checkpoint question here gives a scenario and
 * asks what follows from it, because "define a process" and "this process is using 100% CPU
 * and no memory, what is it doing" measure different things and only the second is evidence.
 *
 * ── THE REVIEW IS TARGETED, NOT A REPEAT ──────────────────────────────────────────────────
 *
 * T_MILESTONE_PROGRAMMING_REVISION exists to close the specific gap its checkpoint found. Its
 * notes are therefore organised by MISCONCEPTION rather than by syllabus: a student arrives
 * knowing which construct let them down, and re-reading the whole module is what they would
 * do if nobody helped them.
 *
 * ── READINESS ─────────────────────────────────────────────────────────────────────────────
 *
 * CHECKPOINT reaches READY on a bound assessment alone — that is its type rule, and the
 * `checkpoint` questions below become the bound Quiz. REVIEW needs teaching of its own, which
 * is the notes. Neither needs video, and none is invented.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const VERIFICATION_BUNDLES: PilotBundle[] = [
  /* ════════════════════════════════════════════════════════════════════════════════════════
   * M02 — From problem to plan
   * ══════════════════════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T_MILESTONE_EARLY_CHECKPOINT',
    notes: `This checkpoint measures one thing: **can you turn a problem you have never seen into a
plan somebody else could follow, and say what the machine will do with it.**

It covers the four things you have met so far, deliberately together rather than one at a time:

- **Decomposition** — breaking a problem into parts small enough to start on
- **Pseudocode and flowcharts** — writing the plan so any language could implement it
- **How computers work** — what actually happens when that plan runs
- **Files and permissions** — where the data lives and who may touch it

**Why they are assessed together.** Separately, each is a definition you can memorise. Together
they are the actual skill: a plan that ignores where the input comes from is not a plan, and a
decomposition that produces a step the machine cannot do is not finished.

**There is no code in this checkpoint.** You are not being asked to program. You are being asked
to think, on paper, before programming — which is the habit the whole of Computational Thinking
has been building.

**How to prepare.** Take a problem you have not solved — "work out which students are eligible
for a scholarship from a spreadsheet of marks" is a fair example — and do the whole sequence:
restate it in your own words, list the edge cases, decompose it, write pseudocode with a decision
and a loop, then dry-run it with three inputs including an empty one. If you can do that, this
checkpoint holds no surprises.

**What the result is for.** It sets your measured state for these skills, and the rest of your
ninety days is built on that measurement rather than on which lessons you happened to open. A
low result is not a verdict; it changes what you are given next.`,
    checkpoint: [
      mcq('You are given: "Produce a list of students who have passed every subject." Which is the best FIRST step?',
        [['Restate the problem in your own words and settle what "passed" and "every subject" mean', true],
          ['Start writing the loop that goes through the students', false],
          ['Decide which programming language to use', false],
          ['Draw a flowchart of the whole thing', false]],
        'Decomposition comes after understanding. "Passed" might mean 35, 40, or "not failed any" — and a plan built on the wrong reading is wrong no matter how well it is drawn.'),
      mcq('A decomposition has produced the step "handle the data properly". What is wrong with it?',
        [['It is not something anybody could carry out — it names an intention, not an action', true],
          ['It is too short', false],
          ['It should be written in pseudocode', false],
          ['Nothing; it will be refined later', false]],
        'The test for a finished decomposition is that each step is small enough to START on. A step nobody can begin is a restatement of the problem hiding inside the solution.'),
      mcq('Your pseudocode reads: "FOR each student: IF marks > 40 THEN add to list". Which edge case does it silently get wrong?',
        [['A student with exactly 40, who is excluded by > but may well have passed', true],
          ['A student with 100 marks', false],
          ['An empty list of students', false],
          ['A student with negative marks', false]],
        'Boundary values are where plans fail quietly. An empty list is also worth checking, but it produces an empty result, which is correct; exactly-40 produces a WRONG result.'),
      mcq('You dry-run a plan on paper and it produces the right answer. What has that established?',
        [['That the plan is correct for that one input — nothing more', true],
          ['That the plan is correct', false],
          ['That the code will work', false],
          ['That the edge cases are handled', false]],
        'A dry run is evidence about the input you ran. It is valuable exactly because it is cheap enough to repeat with the empty case, the single-item case and the boundary.'),
      mcq('The plan says "read the file of marks". On a real machine, what must be true before that step can succeed?',
        [['The file exists at the path given AND the running user has read permission on it', true],
          ['The file exists', false],
          ['The file is not open in another program', false],
          ['The file is in the same folder as the program', false]],
        'Existence and permission are separate conditions and a plan that assumes the second is the source of the "it works on my machine" class of failure.'),
      mcq('Where is a program\'s data while it runs, and where is it after the machine is switched off?',
        [['In RAM while running; only in a file if it was deliberately written to storage', true],
          ['In RAM both times', false],
          ['On disk both times', false],
          ['In the CPU while running, on disk afterwards', false]],
        'This is why "save" exists as a concept at all. RAM is fast and forgets; storage is slower and remembers, and moving data between them is a step your plan has to contain.'),
      mcq('Two steps of your plan could be done in either order. What does that tell you?',
        [['They are independent, so the order is a free choice you should make for readability', true],
          ['The decomposition is wrong', false],
          ['They should be merged into one step', false],
          ['One of them is unnecessary', false]],
        'Recognising independence is what lets a plan be reorganised safely. Steps that genuinely depend on each other cannot be reordered, and knowing which is which is the difference between editing a plan and breaking it.'),
      mcq('A flowchart beats a numbered list when:',
        [['The logic branches and rejoins, so the shape of the paths is the thing worth seeing', true],
          ['The plan is long', false],
          ['The plan has a loop', false],
          ['You are presenting to somebody non-technical', false]],
        'A straight sequence reads better as a list. A diagram earns its space when there are paths that split and come back together, which a list can only describe in words.'),
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

- **Variables** — holding a value, and choosing a name that says what it holds
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
          ['A `while` loop, because it reads input', false],
          ['Either; there is no difference', false],
          ['A `while True` with a break after five', false]],
        'Known count means `for`. A `while` works but tells the reader "this might run any number of times", which is false here — the construct is part of the explanation.'),
      mcq('A brief says "keep asking until the user types a valid number". Which loop is right?',
        [['A `while` loop, because the number of attempts is not known in advance', true],
          ['A `for` loop over a large range', false],
          ['A `for` loop with a break', false],
          ['No loop; validate once and exit', false]],
        'Unknown count means `while`. The pair of these two questions is the whole distinction, and choosing correctly for the wrong reason is what the explanation exposes.'),
      mcq('Your function computes an average and ends with `print(avg)`. The caller cannot use the result. Why?',
        [['Printing sends a value to the screen; only `return` sends it back to the caller', true],
          ['The function needs a parameter', false],
          ['`avg` is out of scope', false],
          ['It must be called differently', false]],
        'The single most common confusion at this stage. Printing is a side effect for a human; returning is how one piece of code hands a value to another.'),
      mcq('`total = 0` sits INSIDE your loop and your sum always comes out as the last value. The fix is:',
        [['Move the initialisation above the loop, so it happens once rather than every pass', true],
          ['Change `total = 0` to `total += 0`', false],
          ['Use a `while` loop instead', false],
          ['Initialise it to the first element', false]],
        'The accumulator pattern: set up before, accumulate inside, read after. Resetting inside means each pass discards everything before it.'),
      mcq('A brief needs the same three-line calculation in four places. What should you do, and why?',
        [['Write one function and call it four times, so a correction is made once', true],
          ['Copy the three lines four times; it is only twelve lines', false],
          ['Write a loop around them', false],
          ['Use a global variable', false]],
        'Functions are not about saving typing. They are about there being ONE place where that logic lives, so it cannot be fixed in three places and missed in the fourth.'),
      mcq('Your program crashes with `TypeError: unsupported operand` on `marks + 10` where marks came from `input()`. The cause is:',
        [['`input()` returns a string, and a string cannot be added to an integer', true],
          ['`marks` was never assigned', false],
          ['10 must be a float', false],
          ['The variable name is reserved', false]],
        'Every value from `input()` is text. Converting at the point of input keeps the conversion in one place rather than scattered through the program.'),
      mcq('A variable inside a function is invisible outside it. What is that called, and why is it good?',
        [['Scope — it means a function cannot accidentally break the rest of the program', true],
          ['Encapsulation, and it saves memory', false],
          ['Shadowing, and it prevents typos', false],
          ['A bug that globals solve', false]],
        'Local scope is what makes a function safe to reuse: its internals cannot collide with a name somebody else chose elsewhere.'),
      mcq('You wrote a working program and cannot explain why you used a `for` rather than a `while`. What does that mean?',
        [['The program works and the understanding is not secure yet — which is what this checkpoint is for finding', true],
          ['Nothing; working code is the only thing that matters', false],
          ['The program is probably wrong', false],
          ['You should rewrite it with a while', false]],
        'Honest answer. Code that works by accident works until the problem changes slightly, and the point of measuring now is that the revision unit can target exactly this.'),
      mcq('Which of these is a genuine reason to split a working 40-line program into functions?',
        [['Each piece can then be tested and understood on its own', true],
          ['It will run faster', false],
          ['It uses less memory', false],
          ['It is the convention', false]],
        'Decomposition in code buys the same thing it buys on paper: smaller pieces you can be sure about separately.'),
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
          ['Always use >=', false],
          ['Add more test cases generally', false],
          ['Use a chain rather than a single if', false]],
        'Off-by-one lives exactly at the boundary. Inputs far from it pass under both the correct and the incorrect operator, which is why general testing misses it.'),
      mcq('A sum always equals the last value entered. Which line is in the wrong place?',
        [['`total = 0`, which is inside the loop rather than above it', true],
          ['The `print`, which is inside the loop', false],
          ['The input line', false],
          ['The loop condition', false]],
        'Set up before, accumulate inside, read after. The symptom — the result equals the final input — identifies this bug on sight.'),
      mcq('Why is "my program worked but I cannot explain the loop choice" worth acting on?',
        [['Code that works by accident stops working when the problem changes slightly', true],
          ['It is not; working code is sufficient', false],
          ['Because explanations are marked', false],
          ['Because the loop is probably wrong', false]],
        'The checkpoint separates working-by-understanding from working-by-accident precisely so this can be closed while the problem is still small.'),
      mcq('What does completing this revision unit establish about your skill level?',
        [['Nothing by itself — the reassessment that follows is the evidence', true],
          ['That the gap is closed', false],
          ['That the skill is verified', false],
          ['That the checkpoint can be skipped', false]],
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
        [['A button is focusable, fires on Enter and Space, and announces itself as a button', true],
          ['A div cannot have a click handler', false],
          ['Buttons are easier to style', false],
          ['There is no real difference', false]],
        'A div can be made to work with tabindex, key handlers and a role — which is three things you must remember and a button gives you for free.'),
      mcq('Your form validates with JavaScript and shows red borders. What is missing for a screen-reader user?',
        [['A text message associated with the field, so the error is announced rather than only coloured', true],
          ['A louder colour', false],
          ['Server-side validation', false],
          ['Nothing; red is standard', false]],
        'Colour is one channel and not everybody receives it. The error has to exist as text, tied to the input, or the page has told only some of its users what went wrong.'),
      mcq('A heading should be `<h2>` rather than `<h1>` because:',
        [['It is a subsection of the page\'s single main topic — heading level is structure, not size', true],
          ['h1 is too large', false],
          ['There can only be one h1 per site', false],
          ['h2 is better for SEO', false]],
        'Choosing a heading by how big it renders is the mistake. Size is CSS; level says how the document is organised, and that is what assistive technology and search engines read.'),
      mcq('Your layout breaks at 375px wide. Which is the most likely cause?',
        [['A fixed pixel width or min-width on a container that cannot shrink', true],
          ['Too many elements', false],
          ['Missing viewport meta tag only', false],
          ['Using flexbox', false]],
        'A missing viewport tag is also a common cause and worth checking. But a hard-coded width is the one that survives the tag being present, because the element simply cannot fit.'),
      mcq('`document.querySelector(\'.total\').textContent = sum` throws "Cannot set properties of null". Why?',
        [['No element matched the selector when the script ran — wrong selector, or the script ran before the element existed', true],
          ['`sum` is not a string', false],
          ['textContent is read-only', false],
          ['The element needs an id', false]],
        'Two causes with the same message, and the fix differs: correct the selector, or move the script to the end of the body / use defer so the element exists by then.'),
      mcq('A label is associated with its input so that:',
        [['Clicking the label focuses the input, and the field is announced with its name', true],
          ['The form looks tidier', false],
          ['Validation works', false],
          ['It is required by HTML', false]],
        'Two benefits, one visible and one not. A placeholder is not a substitute: it disappears the moment somebody types.'),
      mcq('You style with `div.card` everywhere and the page works. What have you given up?',
        [['Meaning — nothing in the markup says what these regions are, so only the CSS knows', true],
          ['Performance', false],
          ['Nothing at all', false],
          ['Browser support', false]],
        'It renders identically and reads as nothing. `<nav>`, `<main>`, `<article>` cost the same to write and say what the regions are to anything that is not looking at pixels.'),
      mcq('Your page works with a mouse and cannot be used with a keyboard. The most likely cause is:',
        [['Interactive behaviour attached to non-focusable elements', true],
          ['Missing CSS', false],
          ['A JavaScript error', false],
          ['Too many form fields', false]],
        'This is what the Tab-key test finds in about thirty seconds, and it is why that test is worth running before you believe a page is finished.'),
    ],
  },

  /* ════════════════════════════════════════════════════════════════════════════════════════
   * M09 — Systems
   * ══════════════════════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T_MILESTONE_SYSTEMS_CHECKPOINT',
    notes: `This checkpoint measures whether you can **work on an unfamiliar machine without
step-by-step instructions, and explain what the operating system was doing while you did.**

The tasks are the ordinary ones: find a file when you do not know where it is, fix a permission
that is stopping something running, look at what is consuming the machine, and account for where
the memory went.

**Why "unfamiliar" is in the description.** Following a command you were given proves you can
type. The skill is knowing *which* command, from what you can see, when nobody has told you — and
that only shows up on a machine you have not been set up on.

**What it covers, together:**

- **Shell commands and pipelines** — composing small tools rather than looking for one big one
- **Files and permissions** — who may read, write and execute, and why that is refused
- **Processes** — what is running, what state it is in, and how to look
- **Memory** — why "free" memory being low is usually not a problem

**The explanation half is not decoration.** "I ran \`chmod 777\` and it worked" and "the script was
not executable for its owner, so I added the execute bit for the owner only" are the same fix and
completely different levels of understanding — and the first one is a habit that causes real
incidents later.

**How to prepare.** On any Linux machine or WSL: find every file over 10MB modified this week
without knowing where they are; make a script executable and run it; find the process using the
most memory and say what state it is in; then read \`free -h\` and explain the buff/cache column to
yourself out loud.`,
    checkpoint: [
      mcq('You need every `.log` file under a directory tree modified in the last two days. Which approach fits the shell?',
        [['`find` with the right predicates, piped onward if more is needed', true],
          ['Open each folder and look', false],
          ['`ls -R` and read the output', false],
          ['`grep -r` for ".log"', false]],
        'The shell is composition: one tool that selects, another that acts. `grep` searches CONTENT, which is a different question from selecting files by name and age.'),
      mcq('`./deploy.sh` returns "Permission denied" and the file exists. What is the most likely cause?',
        [['The execute bit is not set for you on that file', true],
          ['The file is owned by root', false],
          ['The script has a syntax error', false],
          ['The disk is full', false]],
        'Read permission lets you open it; execute permission lets you run it. The two are separate bits and this message is about the second.'),
      mcq('Which is the right fix for that, and why?',
        [['Add execute for the owner only — the narrowest change that solves the problem', true],
          ['`chmod 777` — it definitely works', false],
          ['Run everything with sudo', false],
          ['Change the owner to yourself', false]],
        '777 grants write to everybody on the machine, which is a much larger change than the problem needed. Reaching for it is the habit that causes real incidents later.'),
      mcq('A process shows 100% CPU and almost no memory growth. What is it most likely doing?',
        [['Computing — spinning on work or in a loop, rather than waiting for anything', true],
          ['Leaking memory', false],
          ['Waiting for disk', false],
          ['Blocked on the network', false]],
        'A process waiting for disk or network is not using CPU — it is asleep. High CPU with flat memory is the signature of computation, including the accidental kind.'),
      mcq('`free -h` shows very little free memory and a large buff/cache. Is this a problem?',
        [['No — the kernel caches file data in otherwise idle RAM and releases it on demand', true],
          ['Yes, the machine is out of memory', false],
          ['Yes, a process is leaking', false],
          ['Only if swap is in use', false]],
        'Unused RAM is wasted RAM, so the kernel fills it with cache. The number worth watching is "available", not "free".'),
      mcq('Why compose small commands with a pipe rather than looking for one command that does everything?',
        [['Each tool does one job well, and the combination covers cases no single tool anticipated', true],
          ['Pipes are faster', false],
          ['It uses less memory', false],
          ['One-command solutions do not exist', false]],
        'This is the design of the shell rather than a style preference, and it is why knowing six composable tools beats memorising sixty flags.'),
      mcq('A file is `-rw-r--r--` and owned by another user. You need to edit it. What is true?',
        [['You can read it but not write it; you need ownership, group write, or elevated rights', true],
          ['You can edit it because it is readable', false],
          ['You cannot even read it', false],
          ['Only root can read it', false]],
        'Reading the mode string is the skill: owner, group, others, each with read/write/execute. Here others have read only.'),
      mcq('A process is in state Z (zombie). What does that mean?',
        [['It has finished but its parent has not collected its exit status yet', true],
          ['It is using 100% CPU', false],
          ['It is stuck and must be killed', false],
          ['It is swapped out', false]],
        'A zombie is already dead and consumes no CPU or memory beyond its entry in the process table. Killing it does nothing; the parent has to reap it.'),
    ],
  },

  /* ════════════════════════════════════════════════════════════════════════════════════════
   * M10 — Quantitative
   * ══════════════════════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T_MILESTONE_QUANT_CHECKPOINT',
    notes: `This checkpoint measures whether you can **solve problems that need more than one branch
of the quantitative foundation at once, and show working somebody else can check.**

The branches you have met are number systems, propositional logic, set theory, boolean algebra
and relations. Each is tractable on its own. This asks for problems where they meet — because
that is where they are actually used, and because a student who has memorised five procedures
separately cannot tell which one a problem needs.

**Working shown, not the answer alone.** An answer is a claim. Working is the evidence for it,
and it is also the only thing that can be marked usefully when the answer is wrong: a single
arithmetic slip inside correct reasoning is a different result from correct arithmetic applied to
the wrong method.

**Where these actually turn up**, so the effort has a point:

- Binary and hex — reading memory, permissions, colours, network masks
- Propositional logic and boolean algebra — every condition you will ever write, and simplifying
  the ones that got out of hand
- Sets — deduplication, membership, joins, "who is in both lists"
- Relations and functions — what a mapping is, which is the whole idea behind a lookup table

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
        "De Morgan's law. Negating a conjunction flips it to a disjunction and negates both sides — and this is the rule that untangles most over-complicated conditions."),
      mcq('The rule is "access unless the account is suspended AND unpaid". Which condition grants access?',
        [['`not (suspended and unpaid)`, equivalently `not suspended or not unpaid`', true],
          ['`not suspended and not unpaid`', false],
          ['`suspended or unpaid`', false],
          ['`not suspended`', false]],
        'The second option is stricter than the rule: it denies access to a suspended account that has paid, which the English does not say. Translating carefully is the actual skill here.'),
      mcq('Binary 1011 1010 in hexadecimal is:',
        [['BA', true], ['AB', false], ['B8', false], ['DA', false]],
        'Four bits per hex digit: 1011 = B, 1010 = A. Grouping from the right is the technique, and it is why hex is used to write bytes at all.'),
      mcq('|A| = 12, |B| = 9, |A ∩ B| = 4. What is |A ∪ B|?',
        [['17', true], ['21', false], ['25', false], ['13', false]],
        'Inclusion-exclusion: 12 + 9 − 4. Adding the sets without subtracting the overlap counts the shared members twice, which is exactly the bug in a naive deduplication.'),
      mcq('A relation maps each student to exactly one roll number. Is it a function, and which way?',
        [['Yes — a function from students to roll numbers, because each input has exactly one output', true],
          ['No, it is only a relation', false],
          ['Yes, from roll numbers to students', false],
          ['Only if it is also onto', false]],
        'The defining property is one output per input. The direction matters: the inverse is a function only if no two students share a roll number.'),
      mcq('`A OR (A AND B)` simplifies to:',
        [['`A`', true], ['`B`', false], ['`A AND B`', false], ['`A OR B`', false]],
        'Absorption. The second branch can only be true where A is already true, so it adds nothing. Spotting it is what stops a condition gaining a clause every time somebody remembers another case.'),
      mcq('Why is the working worth more than the answer on a problem like these?',
        [['A slip inside correct reasoning is a different result from correct arithmetic on the wrong method', true],
          ['It is not; the answer is what counts', false],
          ['Because working is easier to mark', false],
          ['To prevent copying', false]],
        'The two failures need different responses, and only the working distinguishes them — which is also why you should write it for yourself, not for a marker.'),
      mcq('0.1 + 0.2 == 0.3 is False in most languages. Which idea explains it?',
        [['Binary floating point cannot represent 0.1 exactly, so a tiny error survives the addition', true],
          ['The comparison operator is wrong', false],
          ['Rounding is disabled by default', false],
          ['It is a language bug', false]],
        'A number system fact with daily consequences: compare floats within a tolerance, and never use them for money.'),
    ],
  },

  /* ════════════════════════════════════════════════════════════════════════════════════════
   * M14 — Capstone milestones
   * ══════════════════════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T_MILESTONE_FOUNDATION_MIDPOINT',
    notes: `Halfway. This measures **what has actually stuck across every module you have met so
far**, so the second half of your programme is built on evidence rather than on attendance.

**Why a measurement rather than a summary.** Forty-five days in, the honest position is that some
of what you covered is secure, some is half-remembered, and neither you nor the plan currently
knows which is which. Attendance tells you what was scheduled. This tells you what remains.

**It is deliberately mixed and deliberately unannounced by topic.** Questions arrive without a
label saying which module they belong to, because recognising *which idea a problem needs* is
part of what is being measured — and it is the part that separates somebody who can use this
material from somebody who can answer it when told what chapter it is from.

**What it covers:** problem solving, debugging, self-directed learning and programming
fundamentals — the four things that recur in every module rather than the contents of any one.

**What happens with the result.** Your remaining days are recomposed against it. A skill that
comes out strong stops being taught and starts being applied; one that comes out weak gets the
foundation work it needs. Nothing is deleted and nothing is skipped as a punishment — the plan
stays ninety days, and only its contents change.

**How to prepare — and a caution.** Do not cram. A crammed result changes your plan in the wrong
direction: it hides a gap that will then not be addressed, and you will meet it again later with
less time. The most useful preparation is to attempt something you have not been taught and
notice where you get stuck.`,
    checkpoint: [
      mcq('A program gives the wrong answer and produces no error. What is the first useful step?',
        [['Print the values and types involved, then compare them with what you assumed', true],
          ['Rewrite the function', false],
          ['Add a try/except', false],
          ['Search the error message', false]],
        'There is no error message — that is the defining feature of this class of bug. Observation replaces the stack trace, and assumption is what you are looking for.'),
      mcq('You meet a library you have never used. What is the most reliable first move?',
        [['Find the smallest working example, run it, then change one thing at a time', true],
          ['Read the entire documentation first', false],
          ['Copy a solution from a forum', false],
          ['Ask somebody', false]],
        'Self-directed learning is a procedure, not a talent. A running example gives feedback on every change; reading everything gives none until the end.'),
      mcq('Your loop runs one time too many. Which is the most likely cause?',
        [['A range or condition boundary that includes one value too many', true],
          ['A missing return', false],
          ['Wrong indentation', false],
          ['An uninitialised variable', false]],
        'Off-by-one is the most common loop bug in existence, and it is worth being able to name the symptom before you look at the code.'),
      mcq('A function works for your test and fails for a colleague. What should you suspect first?',
        [['An assumption about the input that your test happened to satisfy', true],
          ['Their machine', false],
          ['A language version difference', false],
          ['Random failure', false]],
        'Almost always an unstated precondition — non-empty, sorted, already converted. Naming the assumption is what turns a mysterious failure into a one-line fix.'),
      mcq('Which of these is EVIDENCE that you understand a concept?',
        [['You can predict the output before running it, and you are right', true],
          ['You have read about it', false],
          ['Your code using it works', false],
          ['You can recognise it in an exam', false]],
        'Working code can be arrived at by accident or by adjustment. Prediction cannot — it is the one test that distinguishes a model from a result.'),
      mcq('Halfway through, you find a topic you thought you knew is gone. What is the right response?',
        [['Record it honestly — the plan can only route around a gap it can see', true],
          ['Revise it quietly before the checkpoint', false],
          ['Ignore it; it was covered', false],
          ['Restart the module', false]],
        'The single most useful thing this reassessment can produce is an accurate picture. A hidden gap is met again later with less time to fix it.'),
      mcq('Why are the questions not labelled by module?',
        [['Recognising which idea a problem needs is part of the skill being measured', true],
          ['To make it harder', false],
          ['To prevent cheating', false],
          ['It is an oversight', false]],
        'Being told the chapter does half the work. Outside an exam nobody tells you, and the whole point of a midpoint measurement is to predict how you will do outside one.'),
    ],
  },
  {
    unitCode: 'T_MILESTONE_FOUNDATION_READINESS',
    notes: `The exit measurement. This establishes **what you can do unaided, what you can explain,
and what the next stage should assume about you.**

**It is not a pass/fail gate.** Nothing is withheld on the strength of it. What it produces is an
accurate statement of your current capability — and that statement is used twice: by the next
stage of your learning, which needs to know where to start, and by you, when somebody asks what
you can do.

**Three things are measured, and they are genuinely different:**

1. **Can you do it unaided.** Not with a tutorial open. The gap between following and doing is
   the one that matters the day somebody gives you a real task.
2. **Can you explain it.** A choice you can defend is a choice you can repeat on a different
   problem. A choice you cannot defend worked once.
3. **Can you state it in terms somebody hiring would recognise.** "I know Python" is not a claim
   anybody can evaluate. "I can write a program that reads a file, validates the rows and reports
   which ones failed and why" is, and it is the same knowledge described usefully.

**The third one is a real skill and it is usually the weakest.** Students who can do the work
routinely undersell it, because they describe the topics they covered rather than the problems
they can now solve. Topics are what a syllabus contains; problems are what an employer has.

**How to prepare.** Take three things you built during Foundation and, for each, write two
sentences: what problem it solves, and what you had to understand to build it. That is the
material for the third part, and writing it is usually when people notice how much they learned.

**After this**, your measured state carries into the next stage. Nothing you demonstrated is
re-taught, and nothing you did not is assumed.`,
    checkpoint: [
      mcq('Which statement is most useful to somebody deciding whether you can do a job?',
        [['"I can read a CSV, validate each row, and report which failed and why"', true],
          ['"I know Python"', false],
          ['"I completed the Foundation programme"', false],
          ['"I scored 82% in programming"', false]],
        'The first names a problem you can solve. The others name a language, a course and a number — none of which tells a reader what would happen if they handed you a task.'),
      mcq('You solved a problem by adjusting code until it worked. What does that establish?',
        [['That this instance is solved; it is not yet evidence you could solve the next one', true],
          ['That you understand the problem', false],
          ['Nothing at all', false],
          ['That the approach was correct', false]],
        'Not worthless — getting something working is real. It is simply a different claim from understanding, and conflating the two is what makes the next problem a surprise.'),
      mcq('Being able to EXPLAIN a design choice matters because:',
        [['A choice you can defend transfers to a different problem; one you cannot worked once', true],
          ['Interviews ask for explanations', false],
          ['It demonstrates communication skills', false],
          ['It proves you wrote the code', false]],
        'Transfer is the point. The interview is downstream of it, not the reason for it.'),
      mcq('Your readiness review shows a skill as not yet demonstrated. What follows?',
        [['The next stage does not assume it — nothing is withheld, and nothing is pretended', true],
          ['You must repeat Foundation', false],
          ['The skill is marked as failed', false],
          ['You cannot progress', false]],
        'The measurement exists so the next stage starts in the right place. An assumed skill that is absent is far more damaging to a learner than a recorded gap.'),
      mcq('Which is the strongest evidence of Foundation-level capability?',
        [['Building something small end to end and explaining every decision in it', true],
          ['Finishing every unit in the programme', false],
          ['A high score on the final quiz', false],
          ['Being able to read other people\'s code', false]],
        'End to end is the phrase doing the work: it forces the parts to meet, which is where the understanding either holds or does not.'),
      mcq('Why is "what the next stage should assume" part of the output?',
        [['So later material starts from what is true rather than from what was scheduled', true],
          ['For reporting', false],
          ['To rank students', false],
          ['To decide who continues', false]],
        'Scheduled and learned are different, and the whole programme is built on measuring the difference rather than assuming it away.'),
    ],
  },
];
