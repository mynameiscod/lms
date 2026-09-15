/**
 * T_TECH_COMM and T_CAPSTONE — explaining technical work, and the Foundation capstone.
 *
 * ── WHY THESE TWO TOPICS SIT TOGETHER ─────────────────────────────────────────────────────
 *
 * Both are UNIVERSAL and both come at the end of Foundation, where the separate skills of the
 * year have to work together on something the learner is responsible for. The capstone produces
 * work; communication is how anybody other than its author finds out that the work exists, runs
 * and does what it should.
 *
 * ── THE LINE T_TECH_COMM HOLDS ────────────────────────────────────────────────────────────
 *
 * Communication taught as "soft skills" — be confident, make eye contact, believe in yourself —
 * changes nothing a reviewer can observe. Every unit here is about an ARTEFACT somebody else acts
 * on: a question a mentor can answer, a README a stranger can follow, a five-minute demo, a review
 * comment an author can fix in ten minutes. Each is judged by what the reader or listener can do
 * afterwards, never by how the author felt giving it.
 *
 * It does not re-teach what already exists. Commit messages belong to T_GIT_COMMIT_MESSAGES and
 * are referenced, not repeated. That review is normal and that "it's broken" is not a bug report
 * are established in T_CAREER_MAP_HOW_TEAMS_WORK; here the learner is taught how to write the
 * report that replaces it, including a minimal reproducible example.
 *
 * T_TECH_COMM_DEBUGGING repairs an explanation that FAILED, which is a different skill from
 * writing a fresh one: it reads a listener's confusion as a symptom and names the fault.
 * T_TECH_COMM_MINI_PROJECT documents the learner's own earlier project and proves the documentation
 * with silent tests by people who are not its author — the only evidence documentation can have.
 *
 * Checkpoint questions name the one skill each measures: TECHNICAL_EXPLANATION when the question
 * is about making a technical idea clear to a particular audience, TECHNICAL_COMMUNICATION when it
 * is about the conduct of asking, writing, presenting or reviewing.
 *
 * ── THE LINE T_CAPSTONE HOLDS ─────────────────────────────────────────────────────────────
 *
 * A first-year Foundation capstone: small, complete, of the learner's choosing, a Python
 * command-line program or a simple web project, about two weeks of part-time work. The units value
 * finished, working and explainable over large and impressive, because those are what a reviewer
 * can actually see.
 *
 * T_CAPSTONE_DOCUMENTING and T_CAPSTONE_PRESENTING are not authored, so T_CAPSTONE_BUILDING's
 * assignment is self-sufficient: the README and demo recording are deliverables inside it.
 *
 * The two debugging units are deliberately different. T_CAPSTONE_DEBUGGING is the learner's OWN
 * project, where the intent is known and the trap is reading the code as it was meant rather than
 * as it was written. T_CAPSTONE_READING_SOMEBODY_ELSES is unfamiliar human code, broken, with no
 * author to ask, where establishing the intent is the hard part and a strange line may be a
 * decision rather than a bug. Neither repeats the message-by-message diagnosis already taught in
 * T_FUNCTIONS_DEBUGGING and T_LOOPS_INFINITE_LOOPS; both are about method across a whole program.
 *
 * SELF_LEARNING is declared by the topic but is not assessable, so every capstone checkpoint
 * question names PROBLEM_SOLVING or DEBUGGING.
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

const COMM = 'TECHNICAL_COMMUNICATION';
const EXPL = 'TECHNICAL_EXPLANATION';
const PS = 'PROBLEM_SOLVING';
const DBG = 'DEBUGGING';

export const COMMUNICATION_CAPSTONE_BUNDLES: PilotBundle[] = [
  /* ════════════════════════════════════════════════════════════════════════════════════════
   * T_TECH_COMM — Explaining Technical Work
   * ══════════════════════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T_TECH_COMM_KNOW_YOUR_AUDIENCE',
    notes: `An explanation is judged by what the listener can do once you have finished, not by how
accurate it sounded to you. The same piece of work needs a different explanation for each person who
hears it, and choosing well starts before you say a word.

**Three questions to answer first:**

1. **What do they already know?** A classmate knows what a loop is. The department coordinator may
   not, and does not need to.
2. **What will they do with it?** Use it, approve it, review the code, or decide whether to hire
   you. The answer decides what belongs in the explanation.
3. **How much attention do they have?** Two minutes in a corridor is not a lab viva.

**One project, three listeners.** Suppose you wrote a Python script that reads the attendance sheet
and flags students below the 75% requirement.

- **To a classmate who knows Python:** "It reads the CSV with \`csv.DictReader\`, counts lectures
  attended per roll number, and flags anyone under 0.75. Late joiners are divided by the lectures
  held since they joined, not by the whole term."
- **To the coordinator who will use it:** "Upload the attendance sheet and it lists everyone below
  75%, with their percentage. It allows for students who joined late. It does not know about
  medical leave, so check those names by hand."
- **To an interviewer:** "Staff were checking 180 students by hand every month. I automated it, and
  the interesting decision was how to treat late joiners fairly."

The facts are the same in all three. The vocabulary, the level of detail and what comes first all
change.

**The curse of knowledge.** Once you understand something, you cannot easily remember not
understanding it, so the steps that were hard for you a month ago now feel too obvious to say. Most
failed explanations skip exactly those steps.

**A common misconception** is that simplifying means being less accurate. It does not. "It lists
everyone below 75%" is simpler than the classmate version, and every word of it is true. What you
remove is detail the listener cannot use, never correctness.

**When you do not know the listener, ask.** "Have you used Python before?" takes five seconds, and
it is far better than guessing and pitching the whole explanation at the wrong level.

**Why it matters.** The people who approve, use and pay for your work are usually not the people
who can read your code. An engineer who can only explain things to other engineers stays stuck
explaining things to other engineers.`,
    mcqs: [
      mcq('You explain your attendance script to the department coordinator who will use it. Which detail belongs in that explanation?',
        [['That medical leave is not handled, so those names need a hand check', true],
          ['That it uses csv.DictReader rather than splitting each line by hand', false],
          ['That the percentage is computed with float division in Python 3', false],
          ['That the roll numbers are stored as dictionary keys for fast lookup', false]],
        'The coordinator will act on the list, so a gap that changes what they must do belongs in it. The implementation details are true but give this listener nothing to act on.'),
      mcq('What does the "curse of knowledge" mean when you explain your own work?',
        [['You forget which steps felt hard before you understood them', true],
          ['You know so much that you cannot decide which fact comes first', false],
          ['Listeners distrust anybody who clearly knows more than they do', false],
          ['You talk at length because you want to show how much you know', false]],
        'Once something is understood, the steps that made it hard stop feeling worth saying. Those skipped steps are exactly where a newcomer gets lost.'),
      mcq('Before explaining your project to somebody new, which single question tells you the most about what to include?',
        [['What will you need to do with this once I have explained it?', true],
          ['How long would you like me to spend on the explanation today?', false],
          ['Would you like me to start with the code or with the slides?', false],
          ['Have you ever worked on a project that is similar to mine?', false]],
        'What the listener must do afterwards decides what belongs in the explanation. Time and format matter, but they do not tell you which facts to include.'),
      mcq('A friend studying commerce asks what an API is. Which answer suits this listener?',
        [['The requests one program accepts from another, like a menu you order from', true],
          ['An interface exposing endpoints that accept and return JSON over HTTP', false],
          ['Application Programming Interface, the name for how software talks', false],
          ['A kind of database that other companies let you download their data from', false]],
        'It is accurate and uses an idea the listener already has. The JSON version is correct for a developer but opaque here, and expanding the acronym explains nothing.'),
    ],
    checkpoint: [
      mcq('Your explanation to a non-technical manager is accurate, but they look lost. What is the most useful change?',
        [['Replace each technical term with what that part does for users', true],
          ['Repeat the same explanation more slowly and with more emphasis', false],
          ['Add more technical detail so that nothing important is left out', false],
          ['Send a link to the documentation and move on to the next item', false]],
        'Accuracy was never the problem; the vocabulary was. Slower delivery or more detail repeats the same barrier, and a link hands the problem back to the manager.', EXPL),
      mcq('You must explain your project to a visiting engineer whose background you do not know. What should you do first?',
        [['Ask briefly what they have worked with, then pitch to that', true],
          ['Assume expertise, since simplifying for an engineer seems rude', false],
          ['Assume a beginner, since a simple version can never lose them', false],
          ['Give a simple and a detailed version back to back, to be safe', false]],
        'A five-second question replaces a guess. Pitching too high loses them, pitching too low wastes their time, and giving both versions doubles the length for no gain.', COMM),
      mcq('You explain the same project to a peer and to a non-technical user. What should change between the two explanations?',
        [['The vocabulary and the detail, while the facts stay the same', true],
          ['The facts, since a non-technical user needs only a rough idea', false],
          ['Nothing, since a correct explanation is clear to any listener', false],
          ['Only the length, with the user version cut to half the words', false]],
        'Simplifying removes detail the listener cannot use, never correctness. Changing the facts misleads, and one explanation for everybody fits nobody.', EXPL),
    ],
  },
  {
    unitCode: 'T_TECH_COMM_STRUCTURE',
    notes: `Most explanations fail not because a fact is wrong but because the facts arrive in an order
the listener cannot use. They hold every detail in their head, waiting to learn why they are hearing
it, and give up before they find out.

**Put the point first.** Before you start, write the one sentence you most want the listener to
remember. If you cannot, you are not ready to explain yet — you are still working out what you
think.

**A dependable order: what it is, why it matters, how it works.**

1. **What it is.** One sentence. "Result lookup now uses a dictionary instead of scanning a list."
2. **Why it matters.** What the listener gets. "Finding one student among 50,000 went from about
   four seconds to effectively instant."
3. **How it works.** Only as deep as this listener needs in order to use, review or change it.
4. **Then limits or next steps**, if there are any. "It needs the roll numbers to be unique."

**Chronological order is the natural way to remember and the worst way to explain.** "First I tried
a list, then it was slow, then I read about hashing, then..." makes the listener sit through every
dead end before learning what the point was. Tell the story in the order it matters, not the order
it happened. The dead ends can come afterwards, if somebody asks.

**Signpost.** "There are two reasons. The first..." tells the listener how much is coming and where
they are in it. In writing, headings and short paragraphs do the same job.

**One idea at a time.** A sentence that introduces a term, uses it and qualifies it all at once is
three sentences pretending to be one.

**Concrete before abstract.** For a listener who is new to an idea, a small example first — sorting
\`[3, 8, 1]\` gives \`[1, 3, 8]\` — gives the general rule something to attach to.

**A misconception worth dropping:** that leading with the conclusion is abrupt. Your listener is not
waiting for suspense. They are deciding whether the rest deserves their attention, and the point is
what lets them decide.

**Why it matters.** People read the first two lines of an email, a pull request description or a bug
report, and skim the rest. A spoken explanation gets about the same patience. Whatever is not at the
top is often never received at all.`,
    mcqs: [
      mcq('Which opening sentence best starts an explanation of a change you made to the results page?',
        [['Results now load in one second instead of eight; here is what changed', true],
          ['So on Monday I started looking at why the page felt a little slow', false],
          ['There were several things I tried before I found the actual cause', false],
          ['Performance is an important quality for any modern web application', false]],
        'It states the point and the benefit first, so the listener knows why the detail that follows matters. The others delay the point or never reach it.'),
      mcq('Why is chronological order usually a poor structure for explaining a fix?',
        [['The listener sits through every dead end before learning the point', true],
          ['Listeners cannot follow events unless they are told in reverse', false],
          ['It makes the explanation too short to cover all of the details', false],
          ['Dates and times confuse people who were not there when it happened', false]],
        'The order you discovered things in is not the order a listener needs them in. Lead with what matters; the dead ends can follow if anybody asks.'),
      mcq('You cannot state the point of your explanation in one sentence. What does that tell you?',
        [['You have not yet decided what the listener most needs to take away', true],
          ['The topic is too advanced to be explained to anyone in a short time', false],
          ['You should use slides, since spoken explanations need a single point', false],
          ['The explanation needs more examples before its point can be stated', false]],
        'The difficulty is in your thinking, not the topic. Deciding the one takeaway first is what makes the rest of the structure possible.'),
      mcq('In "what it is, why it matters, how it works", why does "why it matters" come before "how it works"?',
        [['It gives the listener a reason to follow the detail that comes next', true],
          ['The detail of how it works is less accurate than the reasons for it', false],
          ['Listeners forget the start, so the least important part goes first', false],
          ['It lets you skip how it works whenever the listener agrees with you', false]],
        'Detail is hard to hold without knowing what it is for. The reason first turns the mechanism into an answer instead of a list.'),
    ],
    checkpoint: [
      mcq('Explaining recursion to a classmate who has never met it, which order is likely to work best?',
        [['A small concrete example, then the general rule it shows', true],
          ['The formal definition, then a list of every place it is used', false],
          ['The history of the idea, then a worked example, then the rule', false],
          ['A long example with every call traced, and no rule stated at all', false]],
        'For a newcomer the example gives the rule something to attach to. A definition first has nothing to hold on to, and an example with no rule never generalises.', EXPL),
      mcq('Your message to a mentor about a delayed submission opens with three paragraphs of background. What should change?',
        [['Put the request and the new date first, and the background after it', true],
          ['Remove the background, since mentors do not need any context at all', false],
          ['Add a fourth paragraph so the reasons for the delay are complete', false],
          ['Split it into three separate messages, one for each paragraph', false]],
        'The mentor needs to know what you are asking before the background means anything. Context still helps, but after the point, not in front of it.', COMM),
      mcq('A teammate asks how your login check works. After "what it is" and "why", how deep should "how it works" go?',
        [['As deep as they need to use or change it, and no further', true],
          ['Down to every line, so that no possible question is left open', false],
          ['Not at all, since what and why are enough for any teammate', false],
          ['As deep as you went while building it, in the order you did it', false]],
        'Depth is set by what the listener will do with it. Every line buries the useful part, and your build order is chronology again.', EXPL),
    ],
  },
  {
    unitCode: 'T_TECH_COMM_ASKING_QUESTIONS',
    notes: `A good question is one that can be answered without a follow-up question. Every detail you
leave out costs a round trip — a reply asking for it and a wait for your answer — and on a forum each
round trip can cost a day.

**The shape of a question that gets answered:**

1. **What you are trying to do** — the goal, not only the step you are stuck on.
2. **What you expected to happen.**
3. **What actually happened**, with the error message copied as text, never paraphrased.
4. **What you have already tried**, so nobody suggests it again.
5. **Your environment** when it could matter: Python version, operating system, library version.
6. **A minimal reproducible example.**

**A minimal reproducible example** is the smallest piece of code that still shows the problem:

- **Minimal** — everything unrelated removed. Cutting a 300-line program down to eight lines very
  often reveals the bug on its own, before you post anything.
- **Complete** — it runs as pasted, including the data it needs. \`marks\` must be defined in the
  example, not "loaded from my file".
- **Reproducible** — it produces the same error you are asking about.

Paste code and errors as text in a code block. A photo of a screen cannot be searched, copied or
run.

**Ask about the goal, not only your attempt.** Asking "how do I get the last three characters of a
filename?" when you really want to know whether a file is a PDF gets a correct answer to the wrong
question, and that answer fails on \`report.jpeg\`. This is called the XY problem.

**Bug reports** for software somebody else maintains use the same parts: a title that states the
symptom ("Timetable shows Monday's slots after switching to next week"), numbered steps to
reproduce, expected and actual behaviour, environment, and whether it happens every time.

**A common misconception** is that a short question respects the helper's time. It does the
opposite: "pls help, code not working" makes them do the work of finding out what you already know.

**Close the loop.** When an answer works, say so, and say what the cause was. The next person with
the same error finds the whole story in one place.

**Why it matters.** Mentors, seniors and forums answer the questions that are easy to answer.
Writing one well is the fastest way to get unstuck, and quite often the way you unstick yourself.`,
    workedExample: `**Goal: turn a question nobody can answer into one somebody will.**

The first attempt:

    my code not working, getting value error, pls help urgent

Nothing here can be acted on. Which code? Which error? What was supposed to happen?

Cutting the program down to the lines that fail gives a minimal example:

    marks = ["78", "91", "AB", "64"]
    total = sum(int(m) for m in marks)
    print(total / len(marks))

Running it reproduces the error exactly:

    ValueError: invalid literal for int() with base 10: 'AB'

The rewritten question:

    Title: int() fails on "AB" (absent) when averaging a marks list

    I want the class average from a list of marks copied from a spreadsheet
    (Python 3.11). Absent students are recorded as "AB". I expected 77.67,
    the average of the three numeric marks. Instead I get:
    ValueError: invalid literal for int() with base 10: 'AB'
    I tried int(m.strip()), which gives the same error. Minimal example
    below. Should absentees be skipped before converting, and should they
    count in the number I divide by?

Writing the example has already shown where the problem is: \`"AB"\` is not a number. That happens
often, and it is a good reason to write the example before posting at all.`,
    mcqs: [
      mcq('While cutting your program down to a minimal example, the bug disappears when you delete one function. What have you learned?',
        [['That function, or the way it is called, is involved in the fault', true],
          ['The example is no longer minimal, so the deletion must be undone', false],
          ['The bug was random, so the full program should just be run again', false],
          ['Minimal examples hide bugs, so post the complete program instead', false]],
        'Removing code until the fault vanishes locates it. That is why building the example so often answers the question before you post it.'),
      mcq('Why paste the exact error text rather than writing "it gives some value error"?',
        [['The exact message names the failing value, which a paraphrase loses', true],
          ['Forums reject any question that does not contain an error message', false],
          ['Paraphrasing an error is considered rude on programming forums', false],
          ['Helpers search the exact text to check you did not copy the code', false]],
        'A message such as invalid literal for int() with base 10: \'AB\' contains the clue itself. A paraphrase keeps the category and throws the clue away.'),
      mcq('You ask "how do I get the last three characters of a filename?" when you really need to know whether a file is a PDF. Why is that risky?',
        [['Helpers solve the slice you asked about, not the check you need', true],
          ['String slicing questions are thought too basic for most forums', false],
          ['Filenames cannot be sliced in Python, so no answer will work', false],
          ['A PDF check would need a separate question for each file type', false]],
        'This is the XY problem: a correct answer to the wrong question, which then fails on names like report.jpeg or NOTES.PDF. Stating the goal lets the helper suggest the right approach.'),
      mcq('Which is the best title for a bug report on your college timetable app?',
        [['Timetable shows Monday slots on Tuesday after switching week', true],
          ['Timetable app is completely broken, please fix this urgently', false],
          ['Found a bug in the timetable feature while using the app today', false],
          ['Timetable issue (important, affects many students in CSE)', false]],
        'A title that states the symptom and when it happens can be triaged and searched. The others say only that something is wrong.'),
    ],
    checkpoint: [
      mcq('A classmate posts "pls help, code not working" with a phone photo of their screen. What is the most useful advice?',
        [['Paste the code and error as text, and say what you expected', true],
          ['Post a clearer photo so that every line of the code can be read', false],
          ['Wait longer, since short questions get answered as people see them', false],
          ['Tag more people, so somebody who knows the answer will notice it', false]],
        'Text can be searched, copied and run, and the expected behaviour tells helpers what "not working" means. A sharper photo still cannot be run.', COMM),
      mcq('Your marks program fails inside `int()`. Which is a minimal reproducible example to post?',
        [['`marks = ["78", "AB"]` followed by `sum(int(m) for m in marks)`', true],
          ['The full 300-line project, zipped up with its marks spreadsheet', false],
          ['`sum(int(m) for m in marks)` on its own, with marks not defined', false],
          ['A screenshot of the traceback that shows the line that failed', false]],
        'It is small, runs as pasted and reproduces the same ValueError. The full project is not minimal, the lone line is not complete, and a screenshot cannot be run.', EXPL),
      mcq('You have been stuck for forty minutes and are writing to your mentor. Beyond the error, what must the message include?',
        [['What you already tried, so they do not suggest it again', true],
          ['An apology for disturbing them during their working hours', false],
          ['The whole project, so they can look for anything else wrong', false],
          ['How urgent it is, so they reply before their other messages', false]],
        'Listing what you tried saves a round trip and shows where the problem is not. Urgency and apologies add nothing a mentor can act on.', COMM),
    ],
  },
  {
    unitCode: 'T_TECH_COMM_WRITING_IT_DOWN',
    notes: `Written work is read when you are not there. The reader cannot stop you and ask what you
meant, so every gap in the text becomes a guess — and a wrong guess looks to them like your software
being broken.

**What a README must answer, in this order:**

1. **What is it?** One or two sentences: what it does and who it is for.
2. **What do I need?** Prerequisites with versions: "Python 3.10 or later".
3. **How do I set it up?** The exact commands, in the order they run.
4. **How do I use it?** At least one real example, with the output it produces.
5. **What does it not do?** Known limitations, stated plainly.
6. **How is it organised?** For somebody who will change it: which file does what.

A skeleton:

    # Hostel Expense Splitter
    Splits shared hostel expenses and prints who owes whom.

    ## Requirements
    Python 3.10 or later. No other packages.

    ## Run
        python split.py expenses.csv

    ## Example
    With the sample file in examples/, the output is:
        Ravi pays Asha 105.00

    ## Limitations
    Every expense is shared equally by everybody in the file.

**Commands, not descriptions.** "Install the dependencies" leaves the reader to work out how.
\`python -m pip install -r requirements.txt\` does not. Anything the reader will type goes in a code
block, exactly as they will type it.

**Test it the only way that counts.** Follow your README in a fresh folder or, better, watch somebody
else follow it without helping. Every place they stop, hesitate or ask you something is a defect in
the README, not in the reader.

**A common misconception** is that clean code documents itself. Good names tell a reader how the code
works. They cannot tell anybody what the program is for, which Python version it needs, or what to
type to run it.

**Commit messages** follow the same principle — say why, since the diff already records what — and
are covered in the Git unit on commit messages.

**Short written updates**, such as a pull request description or a progress message to a mentor,
need four things: what changed, why, how to check it, and anything the reader should look at
closely.

**Write for scanning.** Headings, short paragraphs and code blocks let a reader find the one part
they need.

**Why it matters.** A project nobody else can run is, to everybody except you, a project that does
not work.`,
    mcqs: [
      mcq('Which README line lets a reader act without guessing?',
        [['Run `python tracker.py add 250 food` to record an expense', true],
          ['Run the tracker script with the right arguments to add items', false],
          ['Usage should be fairly obvious from reading the source code', false],
          ['The program supports adding, listing and deleting expenses', false]],
        'It gives the exact command, with real arguments, and says what it does. The others leave the reader to work out what to type.'),
      mcq('You follow your own README in a fresh folder and it fails at step 2. What does that mean?',
        [['The README relies on something only your machine already had', true],
          ['The fresh folder is set up wrongly, since it works on your laptop', false],
          ['Step 2 should be removed, as most readers will skip it anyway', false],
          ['The code has a bug that a README cannot be expected to cover', false]],
        'Working on your laptop and failing from nothing is the signature of hidden setup: a package installed long ago, a file outside the project, a path of your own.'),
      mcq('Why state "Requires Python 3.10 or later" in a README?',
        [['A reader on an older version otherwise hits errors with no hint why', true],
          ['It proves to reviewers that you are using an up-to-date setup', false],
          ['Python refuses to run any script whose README omits a version', false],
          ['It makes the program run faster on the newer interpreter version', false]],
        'Syntax or library features from a newer version fail on an older one with errors that do not mention versions at all. One line prevents that search.'),
      mcq('Which sentence belongs in the "Known limitations" section of a README?',
        [['Amounts with paise, such as 12.50, are rounded to whole rupees', true],
          ['The code could probably be written more neatly with more time', false],
          ['Thanks to everyone who helped test the project over the week', false],
          ['This project was built as part of the first-year capstone', false]],
        'A limitation tells the user what the program will not do, so they can avoid being surprised by it. The others are not about behaviour at all.'),
    ],
    checkpoint: [
      mcq('A classmate says your code is readable enough that the project needs no README. What is the strongest reply?',
        [['Code shows how it works, not how to run it or what it is for', true],
          ['GitHub rejects every repository that does not have a README file', false],
          ['Readers never look at code, so all detail must go in the README', false],
          ['Readable code is impossible, so written comments are always needed', false]],
        'Names and structure explain the mechanism to somebody already inside the code. Purpose, requirements and the command to run it are not in the code at all.', COMM),
      mcq('Your pull request description says only "fixed stuff". What should replace it to help the reviewer most?',
        [['What changed, why, and how the reviewer can check that it works', true],
          ['A list of every file changed, with the line number of each edit', false],
          ['An apology for the delay and a promise to write more next time', false],
          ['The full commit history of the branch, pasted in date order', false]],
        'The diff already shows files and lines. What it cannot show is the reason and the way to confirm the fix, which is what a reviewer needs first.', EXPL),
      mcq('Watching a friend follow your README, they stop and ask "which folder do I run this in?". What is the right response?',
        [['Answer, then add that detail to the README so nobody else asks', true],
          ['Answer them, since one question means the README is basically fine', false],
          ['Tell them to read the code, which shows how the folders are laid out', false],
          ['Take the keyboard and run it, so the test finishes more quickly', false]],
        'Every stop is a defect in the documentation. Answering without changing the README fixes it for one reader and leaves it broken for the next.', EXPL),
    ],
  },
  {
    unitCode: 'T_TECH_COMM_PRESENTING',
    notes: `A demonstration shows the thing working, for the person it was built for. It is not a tour
of your code and not an account of how hard it was to build.

**A five-minute shape:**

1. **The problem, in thirty seconds.** "Hostel students miss changes to mess timings because they
   are posted on one notice board."
2. **The main path, live, in two to three minutes.** One user doing the one thing the project exists
   for, from start to finish, with realistic data.
3. **One decision, in a minute.** Something you chose, and why: "I used SMS rather than an app
   because half the hostel will not install one."
4. **Limits and next steps, in thirty seconds**, stated plainly.
5. **Questions.**

**Show, do not describe.** "It lets you add a notice" is weaker than adding one. Realistic data
matters too: a notice that reads "Dinner moves to 8:30 pm on Friday" tells the audience what the
program is for, while entries like \`test\` and \`aaa\` tell them nothing.

**Prepare the path, not only the project.** Write down the exact clicks or commands. Have the data
loaded, the tabs open, the font large enough for the back row and notifications switched off.
Rehearse aloud once with a timer; nearly every first rehearsal runs long.

**Have a backup.** A screen recording of the main path, or a handful of screenshots. If the network
or the laptop fails, say "here is the recording" and carry on.

**When something breaks live**, say what should have happened, switch to the backup and move on.
Debugging in front of an audience uses up your five minutes and teaches them nothing about the
project.

**Do not open with an apology.** "It is not very good and it might crash" tells the audience what to
look for, and spends time on nothing. Limitations belong at the end, as facts: "It does not yet
handle two wardens editing the same notice."

**Code on screen**, if at all, should be the few lines behind a decision you are explaining. Nobody
can read a scrolling file from across a room.

**Questions you cannot answer.** "I do not know; I would find out by..." is a strong answer. A guess
delivered confidently gets found out, and then everything else you said is doubted too.

**A common misconception** is that showing more features makes a stronger demo. Five features rushed
leave one impression: rushed. One path shown clearly lets the audience understand what you built.

**Why it matters.** Vivas, hackathon judging, internship interviews and team meetings all reward the
same thing: making somebody else see, quickly, that your work does what it should.`,
    mcqs: [
      mcq('Your five-minute demo slot starts. Which opening works best?',
        [['Hostel students miss mess-timing changes; this app sends them alerts', true],
          ['Sorry, it is not finished and some parts might crash during this', false],
          ['I will first walk through the folder structure and every file in it', false],
          ['Let me begin with the story of how I first thought of the idea', false]],
        'It states the problem and what the project does about it in one breath. The apology sets expectations low, and the file tour and origin story delay the point.'),
      mcq('The app crashes halfway through your live demo. What should you do?',
        [['Say what should have happened and switch to your recorded backup', true],
          ['Open the code and fix the fault while the audience waits for you', false],
          ['Restart and repeat the demo from the beginning until it works', false],
          ['Apologise, end the demo early and go straight on to questions', false]],
        'The audience still sees the main path, and your time is spent on the project rather than on live debugging or starting again.'),
      mcq('Why demonstrate with realistic data rather than entries such as "test" and "aaa"?',
        [['The audience can see what the program is for from what it shows', true],
          ['Realistic data makes the program run faster during the demo', false],
          ['Test entries are more likely to crash any program that reads them', false],
          ['Examiners deduct marks whenever the word test appears on screen', false]],
        'A notice that reads like a real notice explains the purpose without a word from you. Dummy entries leave the audience to imagine what it is for.'),
      mcq('An audience member asks a question you cannot answer. Which reply is best?',
        [['I am not sure; I would check by timing it with 10,000 records', true],
          ['It should be fine; I expect it copes with that without any issues', false],
          ['That is outside the scope of this project, so it does not apply', false],
          ['Good question, and let me come back to it at the very end of this', false]],
        'It is honest and shows how you would find out. A confident guess is found out, a scope dodge sounds evasive, and a deferred answer usually never arrives.'),
    ],
    checkpoint: [
      mcq('Rehearsing, your demo takes nine minutes against a five-minute slot. What should you cut first?',
        [['Secondary features, keeping the one path that shows the main value', true],
          ['The problem statement, since the audience can work it out alone', false],
          ['The limitations, since they make the project look less complete', false],
          ['Nothing; speaking faster will fit all nine minutes into the five', false]],
        'The main path is what the audience must see. Without the problem they cannot judge it, and the limitations are what make the rest credible.', COMM),
      mcq('Where should code appear in a five-minute project demonstration?',
        [['Only the few lines behind a decision you are explaining', true],
          ['On every slide, so the audience can see that you wrote it', false],
          ['Nowhere at all, since audiences never care about the code', false],
          ['Scrolled through in full at the end, to show the effort', false]],
        'Code earns screen time when it explains a choice the audience is weighing. A scrolling file cannot be read, and banning code hides a decision worth showing.', EXPL),
      mcq('Your project does not yet handle two users editing at once. How should your demo deal with this?',
        [['State it plainly near the end, as a known limitation', true],
          ['Open by apologising for it, so expectations are set low', false],
          ['Leave it out, and hope that nobody asks you about it', false],
          ['Claim it is handled, then fix it before anybody checks', false]],
        'A limitation stated as a fact is honest and shows you understand your own system. An apology spends your opening on it, and hiding it fails the moment somebody asks.', COMM),
    ],
  },
  {
    unitCode: 'T_TECH_COMM_FEEDBACK',
    notes: `Feedback is useful when the person receiving it knows exactly what to change and why. Vague
feedback, whether kind or harsh, gives them nothing to act on.

**Giving feedback: observation, impact, suggestion.**

- **Observation** — what you saw, and where. Point at the function, the step or the screen.
- **Impact** — why it matters: what breaks, what confused you, what it costs.
- **Suggestion or question** — one possible change, or a question that lets the author check.

Compare:

    "The code is messy."

    "process() is 80 lines and reads the file, calculates and prints.
     When the total was wrong I could not tell which part to check.
     Could the calculation be its own function?"

The first is an opinion the author can only argue with. The second can be acted on in ten minutes.

**Say how much each point matters.** Mark the difference between "must fix: crashes on an empty
file" and "optional: \`x\` could be called \`total_marks\`". Without labels, an author gives a naming
preference the same weight as a crash, and often fixes the easy one first.

**Ask when you are unsure.** "What happens if the file is empty?" invites the author to check. "This
does not handle empty files" is wrong half the time, and invites a defence.

**Specific praise is feedback too.** "The validation in \`read_mark\` rejected every bad input I
tried" tells the author what to keep doing. "Nice work" tells them nothing.

**About the work, never the person.** "This function returns None on the error path", rather than
"you forgot to handle errors".

**Receiving feedback.**

1. **Understand before you respond.** Ask for an example if a comment is unclear. Explaining why you
   wrote it that way comes after, if at all.
2. **Treat confusion as data.** If a reviewer misread your code, something in the code invited that
   reading. A clearer name or a short comment is usually the fix, even when the reviewer was wrong.
3. **Disagree with reasons.** You may keep your approach. Say why, and ask whether that answers their
   concern.
4. **Close the loop.** Reply saying what you changed, so the reviewer does not have to re-read
   everything to find out.

**A common misconception** is that being kind means being vague. Specific feedback is the kind
version: it saves the author the time of guessing what you meant.

**Why it matters.** Every professional team reviews code, designs and documents. People who give
useful reviews, and take them without defensiveness, are the ones trusted with more.`,
    mcqs: [
      mcq('Which review comment on a classmate\'s code is most useful?',
        [['`load()` crashes on an empty file; could it return an empty list?', true],
          ['The loading code seems a bit fragile and should be improved', false],
          ['I would have written this whole part quite differently myself', false],
          ['Great work overall, just a few small things here and there!', false]],
        'It names where, what goes wrong and one way to fix it. The others are opinions the author cannot act on.'),
      mcq('A reviewer misread what your function does and commented on the wrong behaviour. What is the most useful conclusion?',
        [['Its name or structure invites that misreading and may need changing', true],
          ['The reviewer was careless, so the comment can be safely ignored', false],
          ['Reviewers should run the code before they are allowed to comment', false],
          ['The function is correct, so the review should not have been asked for', false]],
        'The next reader will probably misread it the same way. A clearer name or a short comment removes the confusion for everybody.'),
      mcq('Why label some review comments "must fix" and others "optional"?',
        [['So the author spends effort on what matters before small preferences', true],
          ['So the reviewer can prove they read every line of the code carefully', false],
          ['So a grader can skip the optional comments when marking the review', false],
          ['So the author knows which of the comments are only being polite', false]],
        'Without severity, a naming preference and a crash look equally important, and the easy one tends to get fixed first.'),
      mcq('Reading a review of your work, your first urge is to explain why you wrote it that way. What should come first?',
        [['Making sure you understand the point, asking for an example if needed', true],
          ['Explaining your reasoning, so the reviewer can withdraw the comment', false],
          ['Making every requested change, whether or not you understand it', false],
          ['Waiting a day before replying, so the reviewer can reconsider it', false]],
        'A defence of a point you have not understood usually answers the wrong point. Understanding first lets you either fix it or disagree with reasons.'),
    ],
    checkpoint: [
      mcq('Reviewing a friend\'s portfolio site before a placement drive, you find the contact form does nothing. How do you tell them?',
        [['Name the form, what happened when you submitted, and why it matters', true],
          ['Mention it gently as a small detail after a list of compliments', false],
          ['Leave it out, since they asked for feedback and not bug reports', false],
          ['Tell them the whole site needs rework before they share it again', false]],
        'Observation, impact and location let them fix it today. Softening hides the one problem that costs them contacts, and a blanket verdict gives nothing to act on.', COMM),
      mcq('Which review comment explains the impact of a problem, not only the problem?',
        [['Marks are stored as text, so "9" ranks above "10" in the list', true],
          ['Marks are stored as text here, which is the wrong type for them', false],
          ['Please change the marks column type from text to an integer', false],
          ['Storing marks as text is a common beginner mistake to avoid', false]],
        'Text compares character by character, so "9" sorts after "10" and a descending rank list puts 9 first. Showing the consequence tells the author why the change matters.', EXPL),
      mcq('After understanding a review comment, you still disagree with it. What is the professional response?',
        [['Reply with your reason and ask whether it answers their concern', true],
          ['Change the code anyway, since the reviewer always has the final say', false],
          ['Resolve the comment without replying, since you know the code best', false],
          ['Ask a third person to overrule the reviewer before replying to them', false]],
        'A reasoned reply either persuades the reviewer or reveals something you missed. Silent compliance or silent dismissal both lose that.', COMM),
    ],
  },
  {
    unitCode: 'T_TECH_COMM_PRACTICE',
    notes: `No new ideas. Everything here uses audience, structure, asking questions, writing,
presenting and feedback, applied to situations you have not seen yet.

**The method, for any piece of communication:**

1. **Name the reader or listener, and what they must do afterwards.** Use it, approve it, fix it,
   answer it, hire you.
2. **Write the point in one sentence** before anything else.
3. **Choose the shape that fits the job:**
   - explanation — what it is, why it matters, how it works
   - question or bug report — goal, expected, actual, what you tried, minimal example
   - README — what it is, requirements, setup, usage example, limitations
   - demo — problem, main path live, one decision, limitations
   - review comment — observation, impact, suggestion, severity
4. **Draft, then cut** anything this audience cannot use.
5. **Test it on a real person.** Watch them follow it or explain it back. Do not ask "does that make
   sense?", because the answer is always yes.
6. **Revise, and close the loop.**

**The checklist that catches most failures:**

- The point is in the first two sentences.
- Every command the reader types is exact and in a code block.
- Error messages are copied as text, not paraphrased or photographed.
- Terms are matched to the audience, or explained in a line.
- Limitations are stated plainly, neither hidden nor apologised for.
- Every review comment says where, why it matters, and how much.
- Nothing depends on you being in the room to explain it.

**Work each scenario before reading the options.** Decide what you would write or say, then compare.
Recognising a good answer is easier than producing one, and producing one is the skill.`,
    mcqs: [
      mcq('You must email the placement cell that your team\'s hackathon demo needs a projector. Which subject line works best?',
        [['Projector and HDMI needed for Team 7 demo, Friday 2 pm, Lab 3', true],
          ['Regarding the hackathon on Friday afternoon and some requirements', false],
          ['Urgent request from Team 7, please read this as soon as possible', false],
          ['Hackathon demo query from a CSE first-year team participant', false]],
        'It carries the request, who, when and where, so it can be acted on from the inbox. The others make the reader open the email to learn anything.'),
      mcq('A junior asks you to explain Git branches in two minutes before their lab. What do you open with?',
        [['A branch lets you try a change without touching the working version', true],
          ['Git was created in 2005 to manage the source code of the Linux kernel', false],
          ['A branch is a movable pointer to a commit in the history graph', false],
          ['There are many commands, so let us begin with git branch and -d', false]],
        'It gives the purpose in words a beginner can use in the lab. The pointer definition is accurate but assumes a model they do not have yet, and history and commands delay the point.'),
      mcq('Your README says "set up the database first", and a tester asks how. What is the fix?',
        [['Replace the phrase with the exact commands, in the order they run', true],
          ['Add a link to the home page of the database\'s official documentation', false],
          ['Leave it, since anyone running the project should know databases', false],
          ['Add a note that setup is simple and takes only about five minutes', false]],
        'A description of an action leaves the reader to invent the steps. Exact commands can be followed, and a general documentation link is a search, not an instruction.'),
      mcq('Reviewing a classmate\'s quiz app, you find a crash on a blank answer and two naming issues. How do you order the comments?',
        [['The crash on a blank answer first, then the minor naming points', true],
          ['In the order you found them, so the author can follow your path', false],
          ['Naming points first, to ease in before the more serious crash', false],
          ['Alphabetically by file name, so none of them looks more severe', false]],
        'Severity decides order. The author may only have time for one change, and it should be the one that stops the app crashing.'),
      mcq('A question you posted on a forum has had no reply for a day. What is the best next step?',
        [['Improve it with a minimal example and the exact error, then edit', true],
          ['Post the same question again, so that it appears at the top', false],
          ['Reply to your own post with "bump" to bring attention back', false],
          ['Message several regular users directly, asking them to look', false]],
        'An unanswered question is usually one that is hard to answer. Making it answerable helps; repeating it or chasing people does not change what they can do with it.'),
    ],
    checkpoint: [
      mcq('You have sixty seconds to explain your capstone to a recruiter at a career fair. What do you cover?',
        [['The problem it solves, what you built, and one decision you made', true],
          ['The languages and libraries used, in the order you added them', false],
          ['Every feature it has, so the recruiter sees the full scope of it', false],
          ['The difficulties you faced, so they appreciate how hard it was', false]],
        'In a minute the listener needs the point, the result and one piece of evidence that you think. A tool list or feature list gives them nothing to remember you by.', EXPL),
      mcq('A teammate\'s pull request has an empty description and you are asked to review it. What comment do you leave?',
        [['Ask what changed, why, and how to check it, so you can review it', true],
          ['Approve it, since the code itself shows everything that was done', false],
          ['Reject it without a comment, so they learn to write descriptions', false],
          ['Rewrite the description yourself from your reading of the code', false]],
        'A specific request tells them exactly what is missing and why you need it. Approving blind skips the review, and a silent rejection or a guessed description teaches nothing.', COMM),
      mcq('You have written setup steps for a lab exercise. Which check gives the best evidence that they work?',
        [['Watch a classmate follow them on a fresh machine, without helping', true],
          ['Read them through twice yourself, slowly, checking every step', false],
          ['Ask a classmate whether the steps look clear enough to them', false],
          ['Run the steps on your own laptop, where it is all set up already', false]],
        'Only somebody who does not already know the missing steps can reveal them. Your own reading and your own laptop both fill the gaps silently.', EXPL),
    ],
  },
  {
    unitCode: 'T_TECH_COMM_DEBUGGING',
    notes: `An explanation that failed is a bug report about your explanation. Rewriting it from
scratch, or repeating it louder, throws that evidence away. Diagnose it the way you would diagnose
code: find where it first went wrong, name the fault, fix that, and test again.

**Step 1 — get real evidence.** "Does that make sense?" is always answered yes. Ask the listener to
explain it back instead, or to do the first step while you watch. Their mistake shows you exactly
what they understood.

**Step 2 — find the first point of failure.** Like the first of forty compiler errors, the first
place they got lost usually causes everything after it. Fixing a later confusion first is wasted
work.

**Step 3 — name the fault.** Symptoms point to causes:

- **They stop at a word or a step** ("what is a virtual environment?") → **missing prerequisite.**
  You assumed knowledge they do not have. Define it in one line, or add the missing step.
- **They follow every sentence but ask "so what do I do?"** → **buried point.** The conclusion or
  the request is missing, or hidden at the end. Move it to the top.
- **They nod along but cannot repeat any of it** → **overload.** Too many new ideas at once. Cut to
  what they need and introduce one idea at a time.
- **They do something different from what you meant** → **ambiguity.** "Run it in the folder" —
  which folder? Replace descriptions with exact names and commands.
- **They can recite the rule but cannot apply it** → **no worked example.** Work one case through
  in front of them, then let them try a second.
- **They confidently reach a wrong conclusion** → **a misleading analogy.** "A variable is a box"
  leads them to expect \`b = a\` to copy a list. Say where the analogy stops being true, or use one
  that fits better: a name tag attached to an object.

**Step 4 — change one thing and test again**, with the same person or with somebody who has not
heard the first version.

**What does not work:**

- **Repeating it more slowly.** If a prerequisite or the structure was the fault, slower delivery of
  the same fault fails in the same place.
- **Adding everything you left out.** That turns a missing prerequisite into overload.
- **Blaming the listener.** Sometimes they were not paying attention. Far more often, the next person
  you try gets lost at exactly the same point.

**Why it matters.** Writing a fresh explanation and repairing a failed one are different skills.
Documentation, lecture notes and onboarding guides are rarely right first time; the people who
improve them are the ones who can read a confused question as a precise symptom.`,
    workedExample: `**Goal: repair a setup step that three testers could not follow.**

The original README step:

    Install the requirements, then start the app.

Tester A typed \`pip install flask\` and then \`python app.py\`, and got:

    ModuleNotFoundError: No module named 'flask'

Tester B asked "what requirements?". Tester C double-clicked \`app.py\`, and a window flashed and
closed.

**First point of failure.** Everybody failed on the first step, so nothing later in the README can be
judged yet.

**Naming the faults.** Tester B shows a missing prerequisite: the README never says the requirements
are listed in \`requirements.txt\`. Testers A and C show ambiguity: "install" and "start" name
actions without saying how to do them. Tester A's error has a specific cause worth knowing — on a
machine with more than one Python installed, \`pip\` can install into a different Python from the
one \`python\` runs.

**The repair, aimed at those faults:**

    1. Open a terminal in the folder that contains app.py.
    2. Install the packages listed in requirements.txt:
           python -m pip install -r requirements.txt
    3. Start the app:
           python app.py
    4. Open http://127.0.0.1:5000 in a browser. You should see the login page.

\`python -m pip\` makes sure the packages go into the same Python that runs the app. Step 4 gives the
reader a way to know they have succeeded.

**Test again.** A fourth tester, who had not seen the first version, followed it without a single
question. That, not the rewrite itself, is the evidence the repair worked.`,
    mcqs: [
      mcq('After your explanation of Git staging, a friend asks "so do I commit first or add first?". Which fault does that reveal?',
        [['The order of the steps was never stated as a clear sequence', true],
          ['The friend was not paying attention during the explanation', false],
          ['Git staging is too advanced to be explained in one sitting', false],
          ['The explanation needed more detail on how Git stores objects', false]],
        'They understood both steps and not their order, so the order is what was missing. More internals would add overload without supplying the sequence.'),
      mcq('You asked "does that make sense?", heard yes, and then watched the task done wrongly. What should you have done instead?',
        [['Ask them to explain it back, or try the first step while you watch', true],
          ['Ask "are you sure?" to give them a second chance to admit confusion', false],
          ['Repeat the whole explanation once more, just to be certain of it', false],
          ['Give them a written copy, since spoken explanations get forgotten', false]],
        'Yes is the polite answer whatever was understood. Explaining back or doing the step produces evidence of what actually landed.'),
      mcq('Your README says "run it from the project folder", and three testers run it from three different folders. What is the fault?',
        [['Ambiguity: it never names the folder or shows the command to type', true],
          ['The testers did not read the README closely before they started', false],
          ['Missing prerequisite: the testers do not know what a folder is', false],
          ['Buried point: the run step should have been the README\'s first line', false]],
        'Three readers, three reasonable interpretations: that is the signature of ambiguity. Naming the folder that contains the entry file, or showing the cd command, removes it.'),
      mcq('You told a classmate "a list variable is a box holding the list", and now they expect `b = a` to make a copy. What went wrong?',
        [['The analogy was pushed past where it holds, and nobody said where', true],
          ['The classmate misunderstood what was a correct, complete analogy', false],
          ['Lists are too unusual to be explained by any analogy whatsoever', false],
          ['The explanation needed the formal definition of assignment first', false]],
        'A box suggests each variable has its own contents, so b = a looks like copying. Saying that both names are tags on one list fixes the model the analogy broke.'),
    ],
    checkpoint: [
      mcq('A junior can recite your explanation of for loops but cannot write one for a new problem. What is the most likely fault?',
        [['It gave the rule without a worked example of applying it', true],
          ['It was too short to cover every variation of the loop syntax', false],
          ['The junior needs to memorise the explanation more carefully', false],
          ['It started with an example, when it should start with the rule', false]],
        'Reciting without applying is the symptom of a missing worked example. More syntax variations would add overload, and more memorising strengthens recall, not use.', EXPL),
      mcq('An explanation you gave has clearly lost the listener. Which repair approach is most reliable?',
        [['Find the first point they got lost, fix that, and check again', true],
          ['Rewrite the whole explanation from scratch in another style', false],
          ['Repeat it more slowly, since the content was already correct', false],
          ['Add every detail you left out, so that no gap can remain', false]],
        'The first point of failure usually causes the rest, so fixing it and re-testing is targeted. A rewrite discards the evidence, and adding everything creates overload.', COMM),
      mcq('The faculty coordinator reads your one-page project summary and asks "but what does it actually do for us?". What is the fault?',
        [['The benefit to the reader is missing, or buried under the method', true],
          ['The summary is too short and should be extended to three pages', false],
          ['The coordinator lacks the background needed to read summaries', false],
          ['The technologies used should have been listed at the very top', false]],
        'The question asks for exactly what a summary should lead with. Moving the benefit to the top answers it; more length or a technology list buries it further.', EXPL),
    ],
  },
  {
    unitCode: 'T_TECH_COMM_MINI_PROJECT',
    notes: `Take a project you have already built in this programme — a Python script, a SQL project, a
web page, a C program — and document it well enough that another learner can set it up, run it and
use it without asking you a single question.

**Why this is a project and not another exercise.** Every earlier unit asked you to write something
and judge it yourself. You cannot judge documentation yourself, because you already know every step
it leaves out. The only evidence that documentation works is somebody who is not you acting on it
successfully, and producing that evidence takes planning, real testers and at least one revision.

**This is not the Git mini project.** That one is about a repository's branches and history. Here
the artefact is the documentation, and the evidence that somebody else could act on it. Where the
project is stored does not matter.

**How to work:**

1. **Choose a project with at least one real setup step** — a package to install, a database to
   create, a data file to put in the right place, or a compile command. A single page with nothing
   to set up is too small to test anything.
2. **Write for a named reader**: another first-year who has never seen the project, on their own
   machine.
3. **Start from nothing.** Copy the project to a fresh folder or a different machine, and follow
   your own first draft literally. Fix what fails before you involve anybody else.
4. **Run a silent test.** Give your tester only the documentation. Watch, do not help, and write
   down every stop, question and wrong turn, with what they were reading at the time.
5. **Diagnose and revise.** Treat each stop as a symptom — missing prerequisite, ambiguity, buried
   point, no example — and fix the cause, not only the sentence.
6. **Test again** with somebody who has not seen the first version.

**What good looks like.** A second tester who reaches a working result at the first attempt, a
README in which every typed command is exact, an honest limitations section, and a test log that
shows the second version really was better than the first.

The brief, requirements and rubric are in the assignment attached to this unit.`,
    assignment: {
      title: 'Mini Project — Documentation Somebody Else Can Act On',
      description: 'Document one of your own earlier projects so that another learner can set it up and use it unaided, prove it with two silent tests by people who are not you, and show how the documentation improved between them.',
      instructions: `**The scenario**

A first-year in another section wants to use one of the projects you built earlier in this
programme. You will not be available to help them. Everything they need must be in the documentation
you write.

**Requirements**

1. **Choose the project.** It must be your own earlier work, and it must need at least one setup step
   beyond opening a file: installing a package, creating a database or table, compiling, or placing a
   data file. Say which project you chose, and why, in one or two sentences.
2. **Write a README** with these sections, in this order: what the project is and who it is for;
   requirements, with versions; setup, as numbered steps with every command in a code block exactly
   as typed; usage, with at least two examples showing the input and the output the reader should
   see; troubleshooting, with at least one error a reader is likely to hit and how to fix it; known
   limitations; and how the project is organised, naming each important file and what it does.
3. **Tell success from failure.** At the end of setup, the reader must be told exactly what they
   should see if it worked.
4. **No hidden knowledge.** Nothing may rely on your machine: no absolute paths from your laptop, no
   package you installed long ago and forgot, no data file that is neither included nor explained.

**Testing you must do and record**

1. **Self-test from nothing.** Copy the project to a fresh folder or machine and follow your README
   literally. Record what failed and what you changed.
2. **Silent test 1.** A learner who has never seen the project follows only the README while you
   watch without helping. Record every stop, question or wrong turn: the step they were on, what they
   did, and how long they were stuck. Note whether they reached a working result.
3. **Revise.** For each problem recorded, name the fault (for example missing prerequisite,
   ambiguity or missing example) and the change you made.
4. **Silent test 2.** A different learner, who has not seen the first version, follows the revised
   README. Record it in the same way.

**What to submit**

1. The final README, and the version that existed before silent test 1.
2. The test log for the self-test and both silent tests, with each tester's initials and the date.
3. A revision table: each problem found, the fault you named, and the change you made.
4. A reflection of 150-250 words: which fault appeared most often, why you did not see it while
   writing, and what you will do differently the next time you document something.`,
      rubric: [
        { criterion: 'Unaided result', description: 'The second silent tester reaches a working result without help; any remaining stops are minor and recorded honestly.', maxPoints: 25 },
        { criterion: 'Accuracy and completeness', description: 'Every required README section is present; commands are exact and correct; usage examples show real input and output; setup ends with a success check; nothing relies on the author\'s machine.', maxPoints: 30 },
        { criterion: 'Audience fit and structure', description: 'Written for a first-year who has never seen the project: the point of each section comes first, terms are explained or avoided, and limitations are stated plainly.', maxPoints: 15 },
        { criterion: 'Testing evidence and revision', description: 'The self-test and both silent tests are recorded in detail; each problem is traced to a named fault and a specific change; the two versions show the improvement.', maxPoints: 20 },
        { criterion: 'Reflection', description: 'Identifies the most frequent fault with evidence from the log, explains why the author could not see it while writing, and names a concrete change of practice.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
  },

  /* ════════════════════════════════════════════════════════════════════════════════════════
   * T_CAPSTONE — Foundation Project
   * ══════════════════════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T_CAPSTONE_CHOOSING_A_PROJECT',
    notes: `The Foundation capstone is a small but complete project of your own choosing, built in
about two weeks of part-time work — roughly 25 to 30 hours. Most capstones that fail do so here, at
the choice, long before any code is written: the idea was too big to finish, too small to show
anything, or not really yours.

**What a good choice has:**

- **A real user with a real problem.** You, your hostel, a club, a family shop, a classmate. "Who
  would use this, and what do they do today instead?" should have a concrete answer.
- **One core flow you can finish.** A single path, from start to end, that delivers the value.
  Everything else is stretch.
- **Built from what you know, plus one new thing.** Python with files, functions and perhaps SQLite,
  or HTML, CSS and JavaScript — with one unfamiliar library or technique, not five.
- **Data you can actually get.** A CSV you can create, or a free API you have already called
  successfully at least once.
- **Something you can show in three minutes.**

**Too big, too small, about right:**

- **Too big:** a food delivery app with payments and live tracking; a college ERP; "an AI that
  predicts exam marks". Each needs months, and several skills you do not have yet.
- **Too small:** a four-operation calculator; a single static page; a tutorial followed step by step
  with the variables renamed.
- **About right:** a command-line expense splitter for roommates that reads a CSV and prints who owes
  whom; a quiz page for your club's orientation that keeps high scores in the browser; a due-date
  tracker for a class library, using SQLite.

**Two tests before you commit.** First, describe the project in one sentence of the form "It lets
[who] [do what]". If the sentence needs "and" three times, it is too big. Second, write the core flow
in at most five steps. If any step needs something you have never done — signing in with Google,
taking payments, real-time chat — either test that one thing in a tiny experiment on the first day,
or cut it from the core.

**A common misconception** is that an impressive capstone is a big or original one. What a reviewer
can actually see is whether it is finished, whether it works on input you did not prepare, and
whether you can explain every decision in it. A modest idea done completely shows all three. An
ambitious one abandoned at 60% shows none, and a tutorial copy fails the third, because the
decisions were somebody else's.

**Why it matters.** Choosing scope is a professional skill in its own right. Most software projects
that run late do so because of what was agreed at the start, not because of how fast anybody typed.`,
    mcqs: [
      mcq('Which is the best-sized Foundation capstone for about two weeks of part-time work?',
        [['A CLI that splits shared hostel expenses from a CSV and shows who owes whom', true],
          ['A food delivery app with live tracking, payments and a restaurant dashboard', false],
          ['A calculator that adds, subtracts, multiplies and divides two numbers', false],
          ['A college ERP covering attendance, fees, timetables and exam results', false]],
        'It has a real user, one core flow and room for stretch, all within skills a first-year has. The delivery app and ERP need months; the calculator shows almost nothing.'),
      mcq('Your project idea needs Google sign-in, which you have never done. How should you treat it?',
        [['Test it in a tiny experiment on day one, or cut it from the core', true],
          ['Leave it to the final days, once the rest of the app is finished', false],
          ['Keep it, because learning sign-in is the point of any capstone', false],
          ['Replace the whole idea with one that has no unfamiliar parts', false]],
        'The unknown part is the biggest risk, so find out early whether it is possible. Leaving it to the end means discovering a blocker when there is no time left.'),
      mcq('Which one-sentence description shows a project that is clearly scoped?',
        [['It lets club members book one of four lab slots and see who holds each', true],
          ['A platform to improve how students manage their academic lives', false],
          ['An innovative app that uses modern technology to help students', false],
          ['A system for handling everything related to the college library and its users', false]],
        'It names who, what they do and how much. The others could describe almost anything, which means the scope has not been decided.'),
      mcq('Why is following a tutorial and renaming its variables a weak capstone?',
        [['You cannot explain decisions you did not make, so it shows little', true],
          ['Tutorials always contain bugs that make the final project fail', false],
          ['Reviewers run plagiarism checks that reject all tutorial code', false],
          ['Tutorial projects are too large to finish in only two weeks', false]],
        'A capstone is evidence of your judgement. When every choice was made by the tutorial author, there is nothing of yours to show or defend.'),
    ],
    checkpoint: [
      mcq('Your capstone idea has eight features and you have two weeks. What do you do?',
        [['Pick the one flow that delivers the value, and list the rest as stretch', true],
          ['Build all eight at half quality, so that every one of them can be shown', false],
          ['Choose the four features that sound most impressive to reviewers', false],
          ['Start coding at once, and cut whatever is unfinished at the end', false]],
        'A finished core with optional extras beats eight half-working features. Cutting at the end leaves the choice to chance instead of to the value each feature adds.', PS),
      mcq('Your idea depends on a free public API that limits requests per hour. Which risk matters most for getting it working?',
        [['Faults you cannot reproduce when the limit or an outage hits', true],
          ['The API being written in a language you have not learnt yet', false],
          ['The limit making your own Python code run more slowly overall', false],
          ['Reviewers refusing any project that relies on outside services', false]],
        'When the service refuses or fails, your bug may not happen again on demand. Saving a real response to a file early lets you test and debug without depending on the API.', DBG),
      mcq('You are torn between an original AI study planner you cannot build yet and a library due-date tracker you can finish. What best supports the tracker?',
        [['Finished, working and explainable is the evidence a capstone gives', true],
          ['Simple projects always score higher than more ambitious ones do', false],
          ['AI projects are not allowed in a first-year Foundation capstone', false],
          ['A tracker needs no testing, so it leaves more time for polish', false]],
        'Originality that never runs shows nothing. A complete project you can demonstrate and defend shows scoping, building and judgement, which is what the capstone exists to show.', PS),
    ],
  },
  {
    unitCode: 'T_CAPSTONE_PLANNING',
    notes: `A plan is not a document you write to satisfy somebody. It is a tool that tells you, on day
six rather than day fourteen, that you are behind — while there is still time to do something about
it.

**Start with a definition of done.** A list of behaviours you could check by running the program,
not adjectives:

- Given \`examples/trip.csv\`, the command \`python split.py examples/trip.csv\` prints who pays
  whom, and the balances add up to zero.
- An empty file prints \`No expenses found.\` and does not crash.
- A row with a missing amount is reported with its line number and skipped.

"Works well" and "handles errors" are not a definition of done. They cannot be checked, so they can
never be finished.

**Break the work into thin vertical slices.** Each slice runs end to end, however crudely:

1. Read the file and print each row back.
2. Total what each person paid.
3. Work out each person's balance.
4. Turn the balances into "who pays whom".
5. Handle the bad inputs from the definition of done.

The alternative — all the input code, then all the logic, then all the output — means nothing runs
until the last few days, and every fault arrives at once.

**Size every task at half a day or less.** "Build the backend" cannot be estimated or ticked off.
"Read the CSV into a list of (name, amount) pairs" can.

**Order by risk.** The unfamiliar library, or the part you are least sure is possible, goes first as
a small experiment. Then the core slices. Stretch features come last, and only if the core is done.

**Allow for what you cannot see yet.** First-year estimates are reliably optimistic. Add about a
third to your total, keep the last two or three sessions for getting things working, and write a cut
list: the features that go, in order, if you fall behind.

**Plan for debugging now.** Create sample input files at the start, including the awkward ones — an
empty file, a malformed row, a name with a trailing space. You will run them after every change, and
they turn "it seems to work" into evidence.

**Set a midpoint check.** By about day six the core flow must run end to end. If it does not, cut
stretch work immediately rather than hoping the second week will be faster than the first.

**A common misconception** is that a plan, once written, must be followed. A plan is a prediction
made with the least information you will ever have. Its job is to show you the gap early, and
changing it when reality disagrees is the plan working.

**Why it matters.** Scope, sequence and estimates are what separate "I built most of something" from
"I finished something", and they are the same skills a team uses on work a hundred times larger.`,
    workedExample: `**Goal: a two-week plan for a club quiz page, about 29 hours in total.**

**The one sentence:** It lets new club members take a ten-question orientation quiz in the browser
and see the top five scores.

**Definition of done:**

- Opening \`index.html\` shows question 1 of 10, with four choices.
- Choosing an answer and pressing Next moves on, and the score at the end is correct.
- After the last question a name can be entered, the top five scores are shown, and they are still
  there after the page is reloaded.
- Pressing Next with nothing selected shows a message instead of moving on.

**Plan:**

    Day 1   (2h)  Experiment: save and read a list in localStorage   [risk first]
    Day 2   (2h)  Page shows question 1 from a hard-coded array
    Day 3   (2h)  Next button moves through all 10 questions
    Day 4   (2h)  Score counted and shown at the end
    Day 5   (2h)  Name entry; scores saved to localStorage
    Day 6   (2h)  Top five shown, sorted          -> MIDPOINT: core flow end to end
    Day 7   (2h)  No-selection message; reload keeps scores
    Day 8   (2h)  Questions moved to a separate questions.js file
    Day 9   (2h)  Styling for phone screens                          [stretch]
    Day 10  (2h)  Timer for each question                            [stretch]
    Day 11  (3h)  Getting it working: every item on the done list, on real use
    Day 12  (3h)  Getting it working; README; short recording
    Buffer  (3h)  Not assigned to anything

**Cut list, in order:** the timer, then phone styling, then moving the questions to a separate file.

The first experiment comes first because every later day depends on scores surviving a reload. Day 6
is the honest test: if the top-five list is not working by then, the timer and the phone styling are
cut that evening, not on day 12.`,
    mcqs: [
      mcq('Which is a usable definition of done for an expense splitter?',
        [['Given a sample CSV it prints settlements whose balances sum to zero', true],
          ['The splitter works well and handles the main cases users will need', false],
          ['All the code has been written, and the program starts and runs', false],
          ['The project is finished when there is nothing left worth adding', false]],
        'It can be checked by running the program. The others are judgements that can never be ticked off, so the work never provably ends.'),
      mcq('Why build in thin vertical slices rather than all the input code first, then all the logic?',
        [['Something runs end to end early, so faults show up while small', true],
          ['Vertical slices need fewer lines of code than layers would need', false],
          ['Layers suit only web projects, and never command-line programs', false],
          ['Slices let you skip testing, since each one is already so small', false]],
        'Each slice is run as soon as it exists, so a new fault can only be in what you just added. Built in layers, nothing runs until the end and every fault arrives together.'),
      mcq('One task on your capstone plan reads "build the backend". What is wrong with it?',
        [['It is too big to estimate, or to know when it is finished', true],
          ['Backend is the wrong word for a first-year Python CLI project', false],
          ['It should come last, once the whole of the frontend is done', false],
          ['A task must name the file it changes, and this one does not', false]],
        'A task you cannot finish in about half a day cannot be estimated or ticked off. Splitting it into checkable pieces is what makes progress visible.'),
      mcq('Which task should go first in a two-week capstone plan?',
        [['Trying the one unfamiliar library you depend on, in a small test', true],
          ['Designing the logo and colour scheme so the app looks finished', false],
          ['Writing the README, since documentation should come before code', false],
          ['The easiest feature, to build confidence before anything else', false]],
        'Risk first: if the unfamiliar part is impossible or slow, you need to know on day one, while the plan can still change.'),
    ],
    checkpoint: [
      mcq('On day 6 of 14, your core flow still does not run end to end. What does a good plan tell you to do?',
        [['Cut stretch features now and put that time into the core flow', true],
          ['Keep to the plan, since the remaining days will make up the gap', false],
          ['Start a new, smaller project so there is time left to finish it', false],
          ['Work longer hours, and add all the stretch features back later', false]],
        'The midpoint check exists to force this decision early. Hoping the second week is faster is how projects end with nothing complete.', PS),
      mcq('While planning, you create sample input files that include an empty file and a malformed row. How does that help later?',
        [['You can reproduce faults on demand and recheck them after fixes', true],
          ['Sample files make the program faster, since it reads less data', false],
          ['They remove the need to run the program on any real data at all', false],
          ['Reviewers expect them, though they do not affect the building', false]],
        'Awkward inputs you can re-run turn a vague failure into a repeatable one, and re-running them after each change catches a fix that breaks something else.', DBG),
      mcq('Your honest estimate for the whole capstone is 20 hours. What is the sensible plan?',
        [['Schedule about 26 to 30 hours, with a list of what to cut', true],
          ['Schedule exactly 20 hours, because a plan should be precise', false],
          ['Schedule 60 hours, since estimates are always three times too low', false],
          ['Schedule no fixed hours, and let the work take what it takes', false]],
        'Estimates made before building are optimistic, so a buffer of about a third plus a cut list absorbs the surprises. No schedule at all cannot tell you when you are behind.', PS),
    ],
  },
  {
    unitCode: 'T_CAPSTONE_BUILDING',
    notes: `This is where the plan meets reality. You build the project you chose and planned, and you
handle what the plan did not foresee — which will be something, for everybody.

**Why this is a project.** Every earlier unit gave you a problem with its edges already drawn. Here
you decide what counts as finished, you find the problems yourself, and nobody tells you which topic
a fault belongs to. The capstone shows whether the separate things you have learnt work together when
you are the one in charge of them.

**A daily loop that keeps a two-week build under control:**

1. **Pick the next task from the plan** and write down, in one line, what it will do when it works.
2. **Build the smallest version** that does that, and run it straight away.
3. **Run your sample files**, including the awkward ones, after every change and not only at the end.
4. **Commit** once it works, with a message saying why the change was made.
5. **Write two lines in your build log:** what you did, and anything that surprised you.

**When something unforeseen happens:**

- **Stuck for 45 minutes?** Narrow it down: a minimal example, a print of the data at each step. Most
  faults give way here.
- **Stuck for two hours?** Ask, with the goal, the expected and actual behaviour, the exact error and
  a minimal example.
- **The plan was wrong?** Change it deliberately. Write the scope decision and the reason in the build
  log — "dropped the timer on day 7; saving scores took two extra sessions" — rather than letting
  features quietly disappear.

**Keep it runnable.** At the end of every session the main branch should run, even if a feature is
half built. A project that works with three features beats one that almost works with six, and a
runnable project is never more than a day away from being demonstrable.

**Hand it over properly.** A capstone somebody else cannot run, or cannot see working, cannot be
judged. The README and a short demo recording are part of the build, not an extra at the end: write
the README as you go, and record the demo once the core flow is stable.

**What good looks like.** The core flow works end to end on data you did not hand-craft; invalid input
produces a clear message rather than a traceback; the code is split into functions or files whose
purpose you can name; the Git history tells the story of the build; and a stranger can run it from
the README and see it working in your recording.

The brief, requirements and rubric are in the assignment attached to this unit.`,
    assignment: {
      title: 'Foundation Capstone — Build It, Prove It Works, Hand It Over',
      description: 'Build the project you scoped and planned, keep evidence of how you built and tested it, and hand it over with a README and a short demo recording that let somebody else run it and see it work.',
      instructions: `**The scenario**

You chose a project and planned it. Now build it: a small but complete program of your own choosing,
either a Python command-line program (using files and, if you wish, SQLite) or a simple web project
(HTML, CSS and JavaScript). Budget about two weeks of part-time work, roughly 25 to 30 hours. When you
finish, somebody who has never met you must be able to run it from your README, and a reviewer must
be able to see it working from your demo recording.

**Requirements**

1. **The core flow works end to end** and meets every item of the definition of done from your plan.
   Include the definition of done, marking each item met or not met. If you changed it during the
   build, include the change and the reason.
2. **Invalid input is handled.** At least three kinds of bad input relevant to your project (for
   example an empty file, a non-numeric value, a missing field, or nothing selected) produce a clear
   message rather than a crash or a wrong result.
3. **The code is organised.** Work is split into functions, and into files where that helps, with
   names that say what they do. No single function reads input, processes it and produces output.
4. **Version control.** The project is a Git repository with at least ten commits made on at least
   five different days, each message saying why the change was made.
5. **A README** containing: what the project is and who it is for; requirements, with versions; setup
   and run commands exactly as typed; at least one usage example with its real output; known
   limitations; and a short description of how the files are organised.
6. **Demo evidence.** A screen recording of two to four minutes that starts from a fresh run and shows
   the core flow on realistic data, one invalid input being handled, and one known limitation stated
   in your own words. If recording is genuinely impossible, submit six to eight annotated screenshots
   covering the same ground.

**Testing you must do and record**

Keep a test table of at least eight cases, including at least three invalid or edge cases. For each
case give the input or steps, the expected result, the actual result, and pass or fail. Run the whole
table again after your last change and record that final run.

Keep a build log with at least one dated entry per working session. It must describe at least three
problems your plan did not foresee: what happened, how you found the cause, and what you did.

**What to submit**

1. A link to the repository, or a zip file that includes the \`.git\` folder.
2. The README, in the repository.
3. The definition of done, with each item marked met or not met.
4. The test table, including the final run.
5. The build log.
6. The demo recording link, or the annotated screenshots.
7. A reflection of 150-250 words: the decision you are most glad you made, the one you would change,
   and what you would build next with one more week.`,
      rubric: [
        { criterion: 'Working core flow', description: 'Every item of the definition of done is met, or honestly marked and explained; the core flow works on realistic data the author did not hand-craft, and the demo confirms it.', maxPoints: 30 },
        { criterion: 'Robustness and code organisation', description: 'At least three kinds of invalid input produce clear messages rather than crashes or wrong results; functions and files each have a single purpose that their names state.', maxPoints: 20 },
        { criterion: 'Testing evidence', description: 'At least eight recorded cases with expected and actual results, three or more of them invalid or edge cases, re-run in full after the final change.', maxPoints: 15 },
        { criterion: 'Hand-over: README and demo', description: 'A stranger could set up and run the project from the README alone; the recording shows a fresh run, the core flow, an invalid input and a stated limitation within four minutes.', maxPoints: 20 },
        { criterion: 'Build log, history and reflection', description: 'Dated sessions describing three genuine unforeseen problems and how each was diagnosed; ten or more commits over five or more days with messages that say why; a reflection naming specific decisions.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
  },
  {
    unitCode: 'T_CAPSTONE_DEBUGGING',
    notes: `The last twenty percent of a project takes the other eighty, because it is where the parts
meet real data. Debugging your own project has one advantage and one trap. The advantage: you know
what every part is meant to do. The trap: you read the code as you meant it, not as you wrote it, so
the line with the fault looks correct every time you pass it.

The individual error messages are covered in the Python debugging units. This unit is the method for
when a whole project misbehaves.

**Step 1 — pin the failure to an input you can re-run.** A file, a command or a list of clicks, plus
the output your definition of done says it should give. Save it with your sample files. A fault you
can trigger on demand is half fixed.

**Step 2 — ask what changed.** If it worked yesterday, the cause is almost always in what you changed
since. \`git diff\` shows it line by line. If that is not enough, check out the last commit that
worked, confirm it passes, and narrow down which change broke it.

**Step 3 — check the data at every boundary.** A project is a pipeline: read, parse, calculate,
output. Print \`repr()\` of the data as it crosses each boundary, and find the first place it is
wrong. \`repr()\` shows the quotes, spaces and newlines your eye skips.

**Step 4 — change one thing, then re-run everything.** Every sample file, not only the one that
failed. A fix that breaks another case has not fixed anything.

**Faults that turn up in nearly every capstone:**

- **Works on your file, fails on somebody else's.** Trailing spaces (\`"Ravi "\` is not
  \`"Ravi"\`), a blank last line, different capitalisation in a header, or a spreadsheet export that
  begins with an invisible byte-order mark, so the first header is not the name you expect. Opening
  the file with \`encoding="utf-8-sig"\` removes the mark.
- **Data disappears between runs.** Opening a file with mode \`"w"\` empties it immediately, so
  opening the save file for writing before reading it destroys what was saved. Or the file path is
  relative, and the program was started from a different folder.
- **Money totals such as \`0.30000000000000004\`.** Binary floating point cannot store 0.1 exactly.
  Store amounts in paise as integers, or round only when displaying.
- **A web button that silently does nothing.** The browser console shows a JavaScript error, or the
  script ran before the button existed on the page.

**Knowing when to stop.** Near the deadline, list the remaining faults and rank them against your
definition of done. Fix what stops the core flow, and write the rest into the README's limitations. A
known, stated limitation is honest; a hidden one is a bug a reviewer finds for you.`,
    workedExample: `**Goal: find why a roommate's file breaks a splitter that works on yours.**

Your code opens the file with \`encoding="utf-8"\` and reads it with \`csv.DictReader\`. Your own
file works. Your roommate exports the shared expenses from Excel as "CSV UTF-8", and:

    Traceback (most recent call last):
      File "split.py", line 9, in read_expenses
        name = row["name"]
    KeyError: 'name'

Opening the file in an editor shows a header row of \`name,amount\`, exactly like yours. Reading the
code again tells you nothing, because the code does what you meant it to.

**Check the data at the boundary** instead of the code:

    reader = csv.DictReader(f)
    print(repr(reader.fieldnames))

On your file this prints \`['name', 'amount']\`. On your roommate's it prints
\`['\\ufeffname', 'amount']\`.

The export put a byte-order mark at the start of the file, and it has become part of the first header.
The key is not \`'name'\`, so the lookup fails even though the file looks identical in an editor.

**The fix, one change:**

    with open(path, newline="", encoding="utf-8-sig") as f:

\`utf-8-sig\` removes the mark when it is present and does nothing when it is not, so your own file
still works. **Re-run everything:** your sample files, the roommate's file, the empty file and the
malformed one. All pass, so it goes in the bug log and into a commit: "Read CSVs exported with a
byte-order mark".`,
    coding: [{
      title: 'Get your expense splitter working on real input',
      description: `Suppose this is your own capstone: an expense splitter for roommates. It worked on the sample you typed, and now your roommates' real list breaks it. You know exactly what it is meant to do:

- Each input line is \`name,amount\`. Spaces around the name or the amount are ignored, and blank lines are skipped.
- Amounts may include paise, such as \`120.50\`.
- Everybody who appears in the list shares the total equally. A person's balance is what they paid minus their share.
- Print one line per person, sorted by name: the name, a space, and the balance to two decimal places. A negative balance means that person owes money.

Example: the lines \`Asha,300\`, \`Ravi,150\` and \`Asha,60\` give \`Asha 105.00\` and \`Ravi -105.00\`.

Find each fault by running the program on input that breaks it and checking the data at each step, rather than by rereading the code you think you wrote.`,
      starter: `import sys


def read_expenses(lines):
    paid = {}
    for line in lines:
        name, amount = line.split(",")
        paid[name] = paid.get(name, 0) + int(amount)
    return paid


def balances(paid, count):
    total = sum(paid.values())
    share = total / count
    return {name: paid[name] - share for name in paid}


lines = sys.stdin.read().splitlines()
paid = read_expenses(lines)
result = balances(paid, len(lines))
for name in sorted(result):
    print(f"{name} {result[name]:.2f}")
`,
      language: 'python',
      tests: [
        { input: 'Asha,300\nRavi,150\nAsha,60', expectedOutput: 'Asha 105.00\nRavi -105.00' },
        { input: 'Kiran , 120.50\nDev,79.50\nKiran,40', expectedOutput: 'Dev -40.50\nKiran 40.50' },
        { input: 'Asha,90\n\nRavi,30\nMeena,45\n', expectedOutput: 'Asha 35.00\nMeena -10.00\nRavi -25.00', isHidden: true },
        { input: 'Ravi ,100\n Ravi,50\nAsha,25', expectedOutput: 'Asha -62.50\nRavi 62.50', isHidden: true },
      ],
    }],
    mcqs: [
      mcq('Your splitter works on your CSV, but a roommate\'s Excel export raises `KeyError: \'name\'` although the header plainly reads name. What is the likely cause?',
        [['An invisible byte-order mark is attached to the first header name', true],
          ['Excel changes the header to capitals whenever it saves the file', false],
          ['DictReader only reads CSV files that Python itself has written', false],
          ['The file has more rows than a Python dictionary is able to hold', false]],
        'Printing repr(reader.fieldnames) shows the mark glued to the first name. Opening the file with encoding="utf-8-sig" removes it; a capitalised header would be visible in the editor.'),
      mcq('The app worked yesterday. Today the totals are wrong, and you have changed three files since. What is the fastest first step?',
        [['Run `git diff` against yesterday\'s commit to see what changed', true],
          ['Read every file from the top, since the bug could be anywhere now', false],
          ['Undo the most complex of the three changes, as it is most likely', false],
          ['Add print statements to every function in the whole project', false]],
        'Working yesterday and broken today puts the cause in the difference. The diff shows exactly that, where guessing at the complex change may undo good work.'),
      mcq('Your command-line task list loses every saved task each time it starts, yet `save()` writes correctly. Where do you look first?',
        [['Whether startup opens the save file in "w" mode before reading', true],
          ['Whether the task list is sorted before it is written to disk', false],
          ['Whether the file cache was cleared when the program last exited', false],
          ['Whether the save function is called too often while it runs', false]],
        'Opening a file for writing empties it at once. If startup does that before loading, the saved tasks are destroyed before they can be read.'),
      mcq('Your expense report shows a total of 0.30000000000000004. What are the cause and the fix?',
        [['Binary floats cannot store 0.1 exactly; keep paise as integers', true],
          ['A rounding bug in sum(); add the values one by one in a loop', false],
          ['The CSV stores extra digits; strip them before converting', false],
          ['Python 3 division is inexact; use // instead of / for money', false]],
        'The error comes from representing decimal fractions in binary, and adding in a loop gives the same result. Integer paise are exact; alternatively round only for display.'),
    ],
    checkpoint: [
      mcq('You have just fixed a bug in how your capstone parses expenses. Before moving on, what should you do?',
        [['Re-run all your sample files, not only the one that failed', true],
          ['Commit at once, since the failing case now passes as it should', false],
          ['Delete the sample file that exposed it, as the bug is now solved', false],
          ['Rewrite the parsing function from scratch, to be safe from now on', false]],
        'A parsing fix can easily break a case that used to pass. Re-running everything is what shows the fix did not trade one bug for another.', DBG),
      mcq('The Next button on your web quiz does nothing, and nothing appears on the page. What is the most informative first check?',
        [['The browser console, for a JavaScript error when it is clicked', true],
          ['The CSS file, in case the button is hidden behind another one', false],
          ['The HTML validator, since invalid markup stops all click events', false],
          ['The server logs, since each button click is sent to the server', false]],
        'A click that does nothing visible usually means the handler threw an error or was never attached, and the console reports both. A static quiz may have no server at all.', DBG),
      mcq('Three days before the deadline, your capstone has five known bugs. What is the best approach?',
        [['Rank them against your definition of done; fix those, list the rest', true],
          ['Fix them in the order they were found, until the time runs out', false],
          ['Fix the easiest first, so that the bug count falls the fastest', false],
          ['Hide the features that have bugs, and say nothing about them', false]],
        'The definition of done says which faults stop the project being finished. Those come first; the remainder become stated limitations rather than hidden surprises.', PS),
    ],
  },
  {
    unitCode: 'T_CAPSTONE_READING_SOMEBODY_ELSES',
    notes: `Every first job starts here: a program you did not write, a report that it is wrong, and an
author who has left, moved team, or simply does not remember. Debugging your own project is hard
because you read what you meant. Debugging a stranger's is hard for the opposite reason — you do not
know what they meant, and until you do, you cannot tell a bug from a decision.

**Step 1 — establish the intent without the author.** Roughly in order of reliability:

- **The people who use the output.** What do they expect it to do? A report of "wrong" always
  implies a "right", so find out what it is.
- **Written rules** the program implements: a fee notice, an assignment brief, a policy.
- **Tests and sample data**, which show what the author checked.
- **The history.** \`git log -p filename\` shows each change with its message, which often explains
  a strange line.
- **Names and comments** — useful, but the least reliable, because nothing checks them and they
  drift out of date.

Write the intended behaviour down in a sentence or two before reading much code.

**Step 2 — reproduce it.** Get the failing input and see the wrong output for yourself.

**Step 3 — trace only the failing path.** Do not read the whole codebase. Find where the output is
produced — search for the text it prints, or follow the traceback's call chain — and work backwards
from there.

**Step 4 — record what it does now.** Run it on several inputs, including ones that seem to work,
and write down the outputs. After your change you can see exactly which outputs moved, and whether
any of them should not have.

**Step 5 — suspect your understanding before the code.** A line that looks wrong may be deliberate.
\`if b < a: b += 365\` looks like nonsense until you learn that day numbers restart each year, and
books borrowed in December come back in January. Deleting it "fixes" something that was never
broken. Before changing a strange line, find evidence for what it is for.

**Symptoms that mean something specific in unfamiliar code:**

- **A value changes when nothing seems to touch it** → a function with a misleading name has a side
  effect, such as a \`get_total()\` that also empties the list it totals.
- **Results pile up across calls** → a mutable default argument, as in \`def add(item, items=[])\`,
  which shares one list between every call.
- **Right for most inputs, wrong at one boundary** → a \`>\` where the rule says "or more", or a
  count that starts in the wrong place.

**Step 6 — make the smallest fix, in their style.** Resist rewriting code you have only just met. A
small fix can be reviewed and trusted; a rewrite mixes the fix with a hundred other changes. Write a
commit message that states the rule and how you established it, because the next person will have
nobody to ask either.`,
    workedExample: `**Goal: fix a stranger's late-fee script without breaking its one strange line.**

Staff report that the total late fee is wrong. The author has left. The script is the one in this
unit's exercise, with names like \`f\`, \`a\`, \`b\` and \`d\`, and no comments.

**Intent, without the author.** The library's printed fee notice says: due 14 days after issue; each
day after that costs 2 rupees; at most 100 rupees for one book. That is the specification now.

**Reproduce and record.** Two books issued on day 10, returned on days 24 and 30, should cost 0 and
12. The script prints 100. One book issued on day 100 and returned on day 175 should hit the cap of
100; the script prints 150.

**Trace the failing path, line against rule:**

    d = b - a                 # days kept, not days LATE: the 14 free days are never subtracted
    return max(d * 2, 100)    # max makes 100 the minimum fee; the notice says maximum
    t = f(x, y)               # replaces the running total, so only the last book counts

**The strange line.** \`if b < a: b += 365\` looks wrong, but a book issued on day 360 and returned
on day 10 was kept for 15 days across the new year. It matches the notice's numbering, so it stays.

**Smallest fix, in their style:** \`d = b - a - 14\`, \`if d > 0: return min(d * 2, 100)\`, and
\`t += f(x, y)\`. Re-running the recorded cases gives 12 and 100, and the cases that were already right
are unchanged.`,
    coding: [{
      title: 'Fix a stranger\'s late-fee script',
      description: `This script calculates library late fees. Its author has left, there are no comments, and staff say the totals are wrong. You cannot ask the author, but the library's fee notice states the rules:

- A book is due 14 days after the day it is issued. Returning it on the due day or earlier costs nothing.
- Each day after the due day costs 2 rupees, up to a maximum of 100 rupees for one book.
- Days are numbered 1 to 365 within the year. A return day smaller than the issue day means the book came back in the following year.

Input: the first line is the number of books, and each following line holds a book's issue day and return day. Output: the total fee for all the books.

Example: two books issued on day 10 and returned on days 24 and 30 cost 0 and 12, so the output is \`12\`.

Establish which lines disagree with the notice before changing anything. At least one line that looks strange is correct, so do not delete it.`,
      starter: `def f(a, b):
    if b < a:
        b += 365
    d = b - a
    if d > 14:
        return max(d * 2, 100)
    return 0


n = int(input())
t = 0
for _ in range(n):
    x, y = map(int, input().split())
    t = f(x, y)
print(t)
`,
      language: 'python',
      tests: [
        { input: '2\n10 24\n10 30', expectedOutput: '12' },
        { input: '1\n100 175', expectedOutput: '100' },
        { input: '3\n360 10\n1 15\n50 70', expectedOutput: '14', isHidden: true },
        { input: '2\n5 19\n5 20', expectedOutput: '2', isHidden: true },
        { input: '1\n300 20', expectedOutput: '100', isHidden: true },
      ],
    }],
    mcqs: [
      mcq('In an unfamiliar script you find `if b < a: b += 365`, which looks odd. What should you do before touching it?',
        [['Find evidence of intent, such as data where the return day wraps', true],
          ['Delete it, since one day number can never be smaller than another', false],
          ['Add a comment asking the author, and carry on with your change', false],
          ['Replace it with a date library, which is always the safer choice', false]],
        'A strange line may encode a rule you have not learnt yet. Here it handles a return in the following year, and deleting it would introduce the very bug you were sent to fix.'),
      mcq('A report says "the invoice total is wrong". The codebase has 40 files and its author has left. Where do you start?',
        [['Reproduce it, then find where the total is printed and trace back', true],
          ['Read every file in order, so nothing is missed before you begin', false],
          ['Rewrite the invoice module cleanly, since the old one is untrusted', false],
          ['Start with the largest file, where bugs are most likely to be found', false]],
        'Only the failing path matters. Searching for where the output is produced gives a starting point, and working backwards skips the 38 files that are not involved.'),
      mcq('In a stranger\'s code, a method named `get_total()` also sets `self.items = []`. Why does this matter when diagnosing?',
        [['Calling it to print a total wipes the items, and the name hides that', true],
          ['Names longer than nine characters are ignored by the interpreter', false],
          ['It is harmless, since a method named get can only ever return a value', false],
          ['It means the class has a syntax error that Python did not report', false]],
        'The name promises a read and the body makes a change. When data vanishes for no visible reason, a side effect behind an innocent name is a prime suspect.'),
      mcq('Before changing a stranger\'s pricing function, you run it on ten inputs and record the outputs. Why?',
        [['So you can tell which outputs your fix changed, and which it did not', true],
          ['So the original author can compare the outputs when they return', false],
          ['So the function runs faster, since Python caches the earlier calls', false],
          ['So you can hand in the outputs as tests instead of writing any', false]],
        'In code you do not understand, a fix can change behaviour that was correct. A record of current outputs makes every change visible, so only the intended ones get through.'),
    ],
    checkpoint: [
      mcq('The author of a broken attendance script has left and there is no README. What is the most reliable source of the intended behaviour?',
        [['The people who use its output, and what they expect it to show', true],
          ['The variable names, since they always state what the code does', false],
          ['Your own opinion of what an attendance script ought to do', false],
          ['The comments, since they are updated whenever the code changes', false]],
        'The users know what "right" means, and the rules they follow are the specification. Names and comments are unchecked and drift, and your opinion is a guess.', PS),
      mcq('You find the bug in an unfamiliar module and also dislike its style. What should your change contain?',
        [['The smallest fix, in the existing style, with a message saying why', true],
          ['The fix plus a full refactor, since you understand the module now', false],
          ['A rewrite in your own style, so the next reader finds it easier', false],
          ['The fix only, with no message, since the diff explains itself', false]],
        'A small fix can be reviewed and trusted, and the message records the rule for the next person who has nobody to ask. A rewrite hides the fix among unrelated changes.', DBG),
      mcq('A stranger\'s report generator crashes with `IndexError` on line 212 of a 600-line file. What is the best first move?',
        [['Follow the traceback\'s call chain, and check the data reaching line 212', true],
          ['Read lines 1 to 211 first, so you understand everything before it', false],
          ['Wrap line 212 in try/except so the report finishes generating', false],
          ['Compare the file with a similar script you wrote for another course', false]],
        'The traceback shows how execution reached the failing line, and the data arriving there explains the bad index. Reading from line 1 wastes effort, and try/except hides the fault.', DBG),
    ],
  },
];
