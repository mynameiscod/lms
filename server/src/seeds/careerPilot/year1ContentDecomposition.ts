/**
 * T_DECOMPOSITION — Breaking Problems Down, the whole topic: six concepts and a PRACTICE.
 *
 * ── WHY THIS TOPIC ────────────────────────────────────────────────────────────────────────
 *
 * The first topic of M02 Computational Thinking, and UNIVERSAL: it comes before a learner has
 * written pseudocode or code, and it is what every later programming unit silently assumes.
 * A first-year who "cannot start" a programming problem almost never lacks syntax. They lack a
 * way to turn one large, vague problem into several small, precise ones.
 *
 * ── THE LINE THIS TOPIC HOLDS ─────────────────────────────────────────────────────────────
 *
 * Computational thinking is usually taught as four vocabulary words — decomposition, pattern
 * recognition, abstraction, algorithms — which students define in an exam and never use. Every
 * unit here is instead a HABIT with a test you can apply to a real problem: can you restate it so
 * somebody agrees; does each piece do one job; would the answer change if this detail changed;
 * could somebody follow these steps without asking you anything; what input breaks it.
 *
 * Problems are everyday ones (bills, timetables, a bakery, a library) alongside programming ones,
 * because the habits are the same and a first-year already has intuitions about the everyday.
 *
 * What it deliberately does not do:
 *   - Write pseudocode or draw flowcharts. That is T_PSEUDOCODE, which follows this topic and
 *     assumes it. Steps here are plain numbered sentences.
 *   - Teach dry running. T_PSEUDOCODE_DRY_RUNNING owns tracing a plan by hand; the edge-cases
 *     unit here stops at LISTING cases and deciding expected outputs, which is what a test is.
 *   - Teach loops or functions. The patterns and decomposition units point forward to them.
 *
 * Single skill, PROBLEM_SOLVING, so no question carries a skillKey.
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

export const DECOMPOSITION_BUNDLES: PilotBundle[] = [
  {
    unitCode: 'T_DECOMPOSITION_WHAT_IS_A_PROBLEM',
    notes: `Most wrong programs are careful, correct solutions to a problem nobody asked. The first
job is not solving anything. It is finding out exactly what is being asked.

**Four questions to answer before anything else:**

1. **What goes in?** The inputs, and what form they arrive in.
2. **What comes out?** Exactly: a number, a list, a yes or no, a printed report.
3. **What are the rules?** The conditions a correct answer must satisfy, and any limits.
4. **What is unclear?** Every word that two sensible people could read differently.

**Example: "Split the restaurant bill between the friends."**

- **In:** the bill total — with or without GST and tip? — and the number of friends. Or is it
  each person's own order?
- **Out:** an amount for each person. Rounded to rupees, or to paise?
- **Rules:** an equal split, or each pays for what they ate?
- **Unclear:** the word "split" itself. Two completely different solutions hide inside it.

**Restate it in your own words, and check the restatement.** "Given a total including GST and
the number of people, give each person an equal share, rounded up to the nearest rupee." Now
somebody can say "no, we pay for what we ordered" before you have built the wrong thing. A
restatement nobody disagrees with is the cheapest progress available.

**Work one small example by hand.** A bill of ₹1,450 among 4 friends is ₹362.50 each. If you
cannot produce the right answer for one small case yourself, you are not ready to describe how a
computer should. The example also raises questions the wording hid: rounding each share up to
₹363 collects ₹1,452, so who keeps the extra ₹2?

**Separate the goal from a suggested method.** "Sort the marks and take the middle one" is a
method; the problem is "find the median mark". Keeping them apart leaves room for a better
method, and it exposes what the method forgot: with an even number of marks there is no single
middle one.

**The common misconception** is that time spent here is time not spent solving. It is the
reverse. A teacher who asks for "students with low attendance" may mean below 75 per cent, this
semester, in one subject. Ten minutes of questions costs less than an afternoon building a report
on the wrong definition.

**Why it matters.** Everything later in this topic — breaking the problem into parts, spotting
patterns, writing steps, listing what could go wrong — works on your understanding of the
problem. If that understanding is wrong, every later step builds the wrong thing carefully.`,
    mcqs: [
      mcq('A teacher asks you for "the top students in the class". Which question most needs answering before you plan anything?',
        [['Top by what measure, and how many count as top?', true],
          ['Should the list be printed or saved to a file?', false],
          ['How quickly does the list need to be ready?', false],
          ['Which language should the solution be in?', false]],
        '"Top" has no meaning until the measure and the cut-off are known. The other questions matter later, but none of them changes what the answer is.'),
      mcq('What is the output of the problem "Given a list of train departure times and the time now, find the next train"?',
        [['One departure time: the earliest one not yet gone', true],
          ['The full list of departure times, in sorted order', false],
          ['The current time, checked against the timetable', false],
          ['The number of trains still left to depart today', false]],
        'The departure list and the current time are the inputs. The problem asks for a single time, which is worth being exact about before planning.'),
      mcq('Why work one small example by hand before planning a solution?',
        [['It shows you can reach the right answer, and it raises hidden questions', true],
          ['It produces a test case, which is the only real reason for doing it', false],
          ['It is faster than planning, so small problems never need a plan', false],
          ['It lets you skip restating the problem, since the example replaces it', false]],
        'If you cannot solve one case yourself, you cannot describe how to solve every case. Doing it also surfaces decisions, such as rounding, that the wording skipped.'),
      mcq('A task reads "Sort the marks and pick the middle one". What is the actual problem being solved?',
        [['Finding the median mark; sorting is one way to do it', true],
          ['Sorting the marks, since that is what it says to do first', false],
          ['Picking one mark, since the middle is just a position', false],
          ['Arranging the marks so the middle is easy to read off', false]],
        'The instruction mixes a goal with a method. Naming the goal leaves room for other methods and shows the gap: an even count has no single middle mark.'),
    ],
    checkpoint: [
      mcq('You restate a task as "list every student below 75% attendance this semester" and send it to the teacher who set it. What does this achieve?',
        [['It lets them correct a wrong reading before anything is built', true],
          ['It commits the teacher to that reading, so changes are theirs', false],
          ['It removes the need to ask any questions about the inputs', false],
          ['It proves the task can be solved before any plan is written', false]],
        'A restatement turns hidden assumptions — which threshold, which period — into something another person can check. Its value is the correction it invites.'),
      mcq('A bill of ₹1,450 is split equally among 4 friends, and each share is rounded up to a whole rupee. How much is collected in total?',
        [['₹1,452', true], ['₹1,450', false], ['₹1,448', false], ['₹1,456', false]],
        'Each exact share is ₹362.50, which rounds up to ₹363, and 4 × 363 is 1,452. The extra ₹2 is exactly the kind of question working an example exposes.'),
      mcq('Two students read the same problem statement and each carefully plan a very different solution. What is the most likely root cause?',
        [['A word or rule in the statement that each of them read differently', true],
          ['One of them made an error while splitting the problem into steps', false],
          ['The problem has several correct answers, so both plans are right', false],
          ['Their plans differ in speed, which no statement is able to specify', false]],
        'Careful work from different starting points produces different results. The fix is to settle the reading first, which is what restating and questioning are for.'),
    ],
  },
  {
    unitCode: 'T_DECOMPOSITION_BREAKING_DOWN',
    notes: `Decomposition is splitting a problem too big to start into smaller problems you can
solve — and splitting those again, until every piece is obvious.

**Example: "Produce report cards for a class."** Nobody can start that. Split it:

    Produce report cards
        Get the data
            Read each student's name and roll number
            Read their marks in each subject
        Work out the results
            Total and percentage for each student
            Grade from the percentage
            Rank within the class
        Present the results
            Lay out one card per student
            Print or save all the cards

Each line is a smaller problem than the one above it, and the lowest lines are small enough to
begin.

**When to stop splitting.** A piece is small enough when you know how to do it directly, or can
describe it in one sentence without "and then". "Read their marks" is done. "Rank within the
class" may not be: it hides "order the students by percentage" and "decide what equal
percentages share".

**A good piece has three properties:**

- **One job.** "Work out the grade and print it" is two jobs. Separated, the grade can be checked
  without printing anything.
- **A clear hand-over.** Each piece says what it needs and what it gives: "Grade" needs a
  percentage and gives a letter. If you cannot say this, the boundary is in the wrong place.
- **Independence, where possible.** Totals do not care how the card is laid out. Independent
  pieces can be done in any order, by different people, and checked on their own.

**Order comes from dependencies, not from the list.** Cooking dinner splits into rice, dal and a
vegetable. Rice takes longest and the dal needs soaked lentils, so those start first. The pieces
are the same whichever order you write them in; what depends on what decides when each runs.

**Two ways it goes wrong:**

- **Splitting by time instead of by job.** "Morning tasks" and "afternoon tasks" is a schedule.
  Each part still contains a bit of everything, so neither can be understood alone.
- **Splitting too far.** "Pick up the pen. Remove the cap." Once pieces are smaller than a single
  thought, the plan becomes harder to read than the problem was.

**The misconception** is that there is one correct decomposition. There are many good ones and
many poor ones, and the three properties are how you tell them apart.

**Why it matters.** A big problem gives you nowhere to start; a decomposed one hands you a first
step. When you reach the functions topic, each well-chosen piece often becomes one function, and
the same one-job, clear-hand-over test is applied to code.`,
    mcqs: [
      mcq('Which piece of a "plan the class trip" decomposition still needs to be split further?',
        [['"Organise everything about getting there and back"', true],
          ['"Collect a signed permission slip from every student"', false],
          ['"Book a 45-seat bus for the morning of 12 March"', false],
          ['"Email the final itinerary to all of the parents"', false]],
        'It hides several jobs — transport, timing, the return journey — and nobody could begin it as written. The others are single actions somebody could start now.'),
      mcq('A decomposition of "run the college fest" has two parts: "Morning jobs" and "Afternoon jobs". What is wrong with it?',
        [['It splits by time, so neither part does one job of its own', true],
          ['It has two parts, and a decomposition needs at least three', false],
          ['It ought to be a flowchart, not a written list of the parts', false],
          ['Nothing; any split that covers the whole day is a good one', false]],
        'A schedule is not a decomposition. Each half still mixes food, stage, security and registration, so neither can be planned or checked on its own.'),
      mcq('In a report-card plan, the piece "Grade" needs a percentage and gives a letter. Why is stating that useful?',
        [['Grade can be worked out and checked apart from everything else', true],
          ['It fixes the exact order in which all the pieces must be done', false],
          ['It proves the percentages handed to Grade are already correct', false],
          ['It shows that Grade is small enough to need no checking at all', false]],
        'A clear hand-over makes a piece independent: give it 72 per cent and see whether the right letter comes back, without totals or printing existing yet.'),
      mcq('A dinner plan lists "make dal" before "cook rice", though rice takes longest. What should decide the order of the pieces?',
        [['What depends on what, and how long each piece takes', true],
          ['The order the pieces happened to be written down in', false],
          ['Alphabetical order, so that no piece gets forgotten', false],
          ['The smallest pieces first, to build some momentum', false]],
        'The list of pieces is the decomposition; the order is a separate decision driven by dependencies and duration.'),
    ],
    checkpoint: [
      mcq('When is a piece of a decomposition small enough to stop splitting?',
        [['When you know how to do it directly, with no "and then" in it', true],
          ['When it fits on a single line of the page the plan is written on', false],
          ['When the whole plan has reached exactly three levels of pieces', false],
          ['When every piece takes about the same amount of time to carry out', false]],
        'The test is whether you could begin the piece now. Line length, depth and duration say nothing about that.'),
      mcq('A plan contains the step "Pick up the pen" followed immediately by "Remove the cap". What does this show?',
        [['Splitting past the point where pieces help anyone understand', true],
          ['Too little detail, since the colour of the pen is not stated', false],
          ['The wrong order, since the cap has to come off before pickup', false],
          ['Two jobs merged into one step that should have been separated', false]],
        'Pieces smaller than a single thought add length without adding understanding. The plan becomes harder to read than the task.'),
      mcq('Two students decompose the same problem in different ways. How should you judge which decomposition is better?',
        [['By whether each piece does one job, with a clear hand-over', true],
          ['By which has more pieces, since more detail shows more care', false],
          ['By which one matches the model answer given in the textbook', false],
          ['By neither, since none can be judged until both are coded', false]],
        'There is no single correct decomposition. One job per piece, clear hand-overs and independence are what make one better than another.'),
    ],
  },
  {
    unitCode: 'T_DECOMPOSITION_PATTERNS',
    notes: `Once a problem is in pieces, look at the pieces. Many are the same piece in a different
costume, and a piece you have solved once never needs solving from scratch again.

**A pattern inside one problem.** In the report-card plan, "total for Asha", "total for Ravi" and
"total for Meena" are one step done for each student. Seeing that turns forty steps into one step
plus "for each student" — and "for each" is exactly what a loop will be when this becomes code.

**A pattern across problems.** Three problems:

- How many students scored above 90?
- How many days this month were hotter than 40°C?
- How many words in this sentence start with a vowel?

Different subjects, one shape: go through a collection, test each item, count the items that pass.
What changes is the collection and the test. What stays is the whole method.

**Shapes that come back constantly:**

| Shape | Question it answers | Example |
|---|---|---|
| Count | How many satisfy a rule? | Days above 40°C |
| Total | What do they add up to? | This month's expenses |
| Best | Which is largest, smallest or earliest? | The cheapest flight |
| Find | Is there one, and where? | Is roll number 27 present? |
| Filter | Which ones satisfy a rule? | Students eligible for a scholarship |
| Transform | Change every item the same way | Add 18% GST to every price |

**Generalise by naming what varies.** Once you see "count the items that pass a test", the
collection and the test become slots to fill. That is the idea behind giving a function
parameters, which the functions topic builds on.

**The misconception: similar subject means similar problem.** "The average maths mark" and "find
the student with roll number 27" are both about students and share nothing else — one combines
every value, the other searches for one item. "Count hot days" and "count vowels" share nothing on
the surface and are the same problem. Match problems by the question being asked, never by the
nouns in them.

**A pattern is a hypothesis, so check the fit.** "Find the cheapest flight" looks like Best. But
if two flights cost the same, which one? If there are no flights, what then? The pattern gives
you the method, and it also hands you that shape's known pitfalls — ties, and an empty collection
— to check deliberately.

**Why it matters.** Experienced programmers are rarely faster because they think faster. They
recognise a shape they have solved before and start from the method instead of from nothing.
That library of shapes is built deliberately, one noticed pattern at a time.`,
    mcqs: [
      mcq('"Which month had the highest electricity bill?" matches which shape?',
        [['Best: pick the largest by some measure', true],
          ['Total: add up all the monthly bills', false],
          ['Count: how many bills went over a limit', false],
          ['Filter: keep months that had any bill', false]],
        'One item is chosen by comparing all of them, which is the Best shape. The answer is a month, not a sum or a count.'),
      mcq('What do "count the hot days this month" and "count words starting with a vowel" have in common?',
        [['The same method, differing only in the collection and the test', true],
          ['Nothing, since one concerns weather data and the other text', false],
          ['Both require the data to be sorted before counting can begin', false],
          ['Both have to be written in the same programming language', false]],
        'Go through a collection, test each item, count the passes. Structure, not subject, is what makes two problems the same.'),
      mcq('A report-card plan needs "calculate the total" for each of 40 students. What does noticing this pattern let you write?',
        [['One total step, applied to each student in turn', true],
          ['Forty separate total steps, one for each name', false],
          ['One total step that adds up the whole class', false],
          ['A different total step for high and low scorers', false]],
        'The step is identical for every student; only the student changes. That "for each" is what later becomes a loop.'),
      mcq('"Convert every price in a list to include 18% GST" is an example of which shape?',
        [['Transform', true], ['Filter', false], ['Find', false], ['Count', false]],
        'Every item is changed in the same way and every item stays in the result, which is a Transform rather than a Filter.'),
    ],
    checkpoint: [
      mcq('"The average maths mark" and "find the student with roll number 27" both concern students. Do they share a pattern?',
        [['No: one combines every value, the other searches for one item', true],
          ['Yes: both go through a list of students, so they must match', false],
          ['Yes: both produce a single answer, so they have one shape', false],
          ['No: one works with numbers and the other works with names', false]],
        'Averaging is a Total followed by a division; looking up a roll number is a Find. A shared subject is not a shared structure.'),
      mcq('You recognise "find the cheapest flight" as a Best problem. What else does recognising the pattern give you?',
        [['The shape\'s known pitfalls, such as ties and having no flights', true],
          ['A guarantee that the method will work with no further checking', false],
          ['The finished code, since every Best problem is written the same', false],
          ['Nothing more; the name of a pattern is only a convenient label', false]],
        'A pattern carries its method and its traps. Ties and an empty collection are where Best problems usually go wrong.'),
      mcq('Which pair of problems shares the same structure?',
        [['"How many orders exceeded ₹500?" and "How many emails are unread?"', true],
          ['"How many orders exceeded ₹500?" and "What was the largest order?"', false],
          ['"List the unread emails" and "What is the total size of all emails?"', false],
          ['"What was the largest order?" and "List every order over ₹500"', false]],
        'Both count the items that pass a test: over ₹500, or unread. The other pairs mix Count with Best, Filter with Total, and Best with Filter.'),
    ],
  },
  {
    unitCode: 'T_DECOMPOSITION_ABSTRACTION',
    notes: `Abstraction is deciding which details matter to the problem in front of you, and
deliberately leaving out the rest.

**The metro map.** A city's metro map shows stations, lines and interchanges. It leaves out real
distances, the bends in the track and every street above. It is geographically wrong, and exactly
right for the question "which trains get me from here to there?". A map that included everything
would be worse at that question. But it is the wrong map for "is it quicker to walk between these
two stations?", because the one detail that question needs was removed. **An abstraction fits a
question, not a thing.**

**The same thing, abstracted differently.** A student is:

- for attendance: a roll number, a name, and present or absent on each day
- for hostel allocation: year of study, distance from home, and room preference
- for a scholarship: family income, marks, and eligibility category

There is no single model of "a student". The problem decides which details survive.

**Stripping a problem statement.** "Priya runs a small bakery in Nashik. Every morning she bakes
bread, cakes and cookies. At closing time she wants to know which item sold the most that day, so
she can bake more of it tomorrow."

- **Matters:** a list of items, each with the quantity sold today; the answer is the item with
  the largest quantity.
- **Noise:** Nashik, that it is a bakery, that baking happens in the morning, and why she wants
  to know.

What is left is the Best shape from the previous unit. Abstraction is often how the pattern
hidden under a story is found.

**The test for every detail: would the answer change if this detail were different?** If the
bakery were in Pune, no — leave it out. If cookies were sold by the kilogram and cakes by the
piece, yes: "sold the most" cannot be decided until somebody says how to compare them. That
detail must stay.

**Naming a step without explaining it is abstraction too.** "Sort the list" in a plan hides how
sorting is done, and you rely on what the step achieves rather than how. That lets you think about
a large plan without holding every detail at once — the same reason a well-named function is
useful later.

**Two ways to get it wrong:**

- **Leaving out something that matters.** A delivery planner that only knows which roads connect,
  not how long they are, will happily choose a route through fewer roads and far more
  kilometres.
- **Mistaking vagueness for abstraction.** "Process the data" is not an abstraction; it hides the
  decisions along with the details. Abstraction removes what is irrelevant and keeps what is
  relevant precise.

**Why it matters.** Real problems arrive wrapped in stories, and the story is mostly noise.
Finding the small precise problem inside is what makes it solvable.`,
    mcqs: [
      mcq('A metro map ignores the real distances between stations. For which question is that abstraction a poor fit?',
        [['Is it quicker to walk between two nearby stations?', true],
          ['Which line do I take to reach the airport station?', false],
          ['Where do I change trains to reach the university?', false],
          ['How many stops are there between here and Central?', false]],
        'Walking time depends on distance, which is exactly what the map removed. The other questions need only stations, lines and interchanges.'),
      mcq('For a daily attendance system, which detail about a student is noise?',
        [['Their favourite subject', true],
          ['Their roll number', false],
          ['Which days they attended', false],
          ['Which section they are in', false]],
        'Changing a favourite subject changes no attendance answer. The roll number identifies the student, and the section decides which register they belong to.'),
      mcq('"Priya\'s bakery in Nashik wants to know which item sold the most today." After abstraction, what is left?',
        [['A list of items with quantities sold; find the largest', true],
          ['A bakery in Nashik that sells bread, cakes and cookies', false],
          ['A plan for how much of each item to bake tomorrow', false],
          ['The reason Priya wants the answer, and when she needs it', false]],
        'The location, the business and the motive do not change the answer. The quantities and the question "which is largest" are all that remain.'),
      mcq('Which question best tests whether a detail can be left out of a problem?',
        [['Would the answer change if this detail were different?', true],
          ['Is this detail mentioned more than once in the problem?', false],
          ['Would the problem statement be shorter without it?', false],
          ['Is this detail a number rather than a piece of text?', false]],
        'Relevance is about effect on the answer. A detail mentioned once, or written as text, can still be the one that decides it.'),
    ],
    checkpoint: [
      mcq('A plan step says "process the data", and its author defends it as abstraction. What is wrong with that defence?',
        [['It hides the decisions too; abstraction keeps what matters precise', true],
          ['Nothing; any step that leaves details out counts as abstraction', false],
          ['It is too short, as an abstract step must be a full sentence long', false],
          ['It uses the word data, which abstraction is meant to avoid using', false]],
        'Abstraction removes irrelevant detail. A step that nobody could carry out has removed the relevant detail as well, which is vagueness.'),
      mcq('A delivery app plans routes knowing only which roads connect to which, with no road lengths. What will go wrong?',
        [['It may choose routes through fewer roads but far more kilometres', true],
          ['It will find no routes at all, since connections are not enough', false],
          ['Nothing, since connections are all that a route depends upon', false],
          ['It will send each delivery to the wrong address on the route', false]],
        'Length was abstracted away, yet it is what the real cost depends on. Leaving out a detail that changes the answer produces confident wrong answers.'),
      mcq('A shop sold 3 kg of sweets and 40 samosas and asks "which sold the most?". Why can the units not be abstracted away?',
        [['Kilograms and pieces cannot be compared until "most" is defined', true],
          ['The shop sells only two items, so no comparison is needed at all', false],
          ['Samosas are always counted first when a shop ranks what it sells', false],
          ['The units are noise, so 40 is clearly the larger of the two here', false]],
        'Change the unit and the answer changes, so the unit matters. The question needs a common measure, such as money taken, before it can be answered.'),
    ],
  },
  {
    unitCode: 'T_DECOMPOSITION_ALGORITHM_IDEA',
    notes: `An algorithm is a finite sequence of unambiguous steps that, followed exactly, solves a
problem and finishes. Every word in that sentence rules something out.

- **Unambiguous.** Each step has exactly one meaning. "Add salt to taste" does not; "add 5 g of
  salt" does. If two people following the steps could do different things, it is not yet an
  algorithm.
- **Executable.** Each step is something the follower can actually do. "Find the best route" is
  not a step for anybody who does not already know how.
- **Finishes.** It stops, for every valid input — not just the one you tried.
- **Solves the problem.** It gives a correct result for every valid input.

**A recipe is almost an algorithm.** "Fry until golden" relies on the cook's judgement, and a
computer has none. Every place a set of steps leans on judgement is a place a computer will do
something — just not necessarily what you meant.

**The finishing test.** "Start with the number you are given. Subtract 2. Repeat until you reach
0." Given 8: 6, 4, 2, 0, and it stops. Given 7: 5, 3, 1, −1, −3, and it never stops, because it
never lands exactly on 0. Steps that work on the example you tried can still fail to finish on
another input. "Repeat while the number is greater than 0" finishes for every whole number.

**A classic algorithm: the greatest common divisor, due to Euclid.**

    1. Take two whole numbers a and b, with b not larger than a.
    2. If b is 0, the answer is a. Stop.
    3. Otherwise, replace a with b, and b with the remainder of a divided by b.
    4. Go back to step 2.

For 48 and 18: the remainder of 48 ÷ 18 is 12, giving (18, 12); then (12, 6); then (6, 0). The
answer is 6. Each step is exact, and it must finish, because b gets smaller every time and cannot
go below 0.

**An algorithm is not a program.** The same algorithm can be carried out in Python, in C, or by a
person with a pencil. A program is one expression of an algorithm in one language; the pseudocode
topic is how you write an algorithm down clearly before choosing that language.

**One problem, several algorithms.** To find a name in a register of 60 names in alphabetical
order, you could read from the top: up to 60 looks. Or open at the middle, decide which half the
name must be in, and repeat on that half: never more than 6 looks. Both are correct algorithms;
they differ in cost, and choosing between correct algorithms is a question you will return to.

**The misconception** is that an algorithm must be mathematical or must involve a computer.
Precise directions to your house are an algorithm. What makes something one is precision and
finishing, not subject matter.

**Why it matters.** A computer is a follower with no judgement at all. Every ambiguity you leave
in your steps, it resolves somehow, and you will not have chosen how.`,
    mcqs: [
      mcq('Which instruction stops a set of cooking steps from being an algorithm?',
        [['"Stir until it looks right"', true],
          ['"Stir for exactly three minutes"', false],
          ['"Stir 20 times, then stop stirring"', false],
          ['"Stir until the kitchen timer rings"', false]],
        '"Looks right" depends on judgement, so two people could stop at different moments. The others give a condition anybody can check the same way.'),
      mcq('The steps are "Subtract 2, and repeat until you reach 0". For which starting number do they never finish?',
        [['7', true], ['8', false], ['0', false], ['2', false]],
        'From 7 the values go 5, 3, 1, −1 and onwards, never landing exactly on 0. Even starting numbers reach 0 and stop.'),
      mcq('Following "if b is 0 the answer is a; otherwise replace a with b and b with the remainder of a ÷ b, then repeat", what is the answer for a = 48 and b = 18?',
        [['6', true], ['2', false], ['3', false], ['12', false]],
        'The pairs go (48, 18), (18, 12), (12, 6), (6, 0). When b reaches 0, a is 6, which is the greatest common divisor.'),
      mcq('One student writes an algorithm in Python and another writes the same algorithm in C. What do the two programs share?',
        [['The steps, and the results those steps produce', true],
          ['The syntax, since both follow the same plan', false],
          ['The exact running time on any given machine', false],
          ['Nothing, since each language needs its own', false]],
        'The algorithm is the sequence of steps. Each language expresses it differently, but the steps and the answers are the same.'),
    ],
    checkpoint: [
      mcq('A set of steps gives the correct answer for the one example its author tried. Why is that not enough to call it an algorithm?',
        [['It must finish and be correct for every valid input, not just one', true],
          ['It must also be written in a programming language before it counts', false],
          ['It must be the fastest possible set of steps for solving the task', false],
          ['It must be checked by a second person before it can qualify as one', false]],
        'One example shows it can work. Being an algorithm is a claim about every valid input, which is why steps that never finish on some input fail the definition.'),
      mcq('A register of 60 names is in alphabetical order. If you repeatedly open at the middle of the part that could still hold the name, at most how many names must you look at?',
        [['6', true], ['30', false], ['60', false], ['8', false]],
        'Each look removes the middle name and about half of the rest: 60, then at most 30, 15, 7, 3 and 1 names remain to search. That is six looks at most.'),
      mcq('Two correct algorithms solve the same problem. Which is a legitimate reason to prefer one of them?',
        [['It needs far fewer steps on large inputs', true],
          ['It gives a more correct answer than the other', false],
          ['It was the one that somebody thought of first', false],
          ['It uses more steps, so it is more thorough', false]],
        'Both are correct by assumption, so correctness cannot separate them. Cost, such as the number of steps as input grows, can.'),
    ],
  },
  {
    unitCode: 'T_DECOMPOSITION_EDGE_CASES',
    notes: `An edge case is an input at the limits of what a problem allows — or just outside them —
where a method that works on ordinary input quietly breaks. You list them before the plan is
finished, because some of them change the plan.

**Where to look: go through each input, and each rule, and ask:**

| Category | Ask | Example: "split a bill equally among n friends" |
|---|---|---|
| Nothing | What if there is none, or it is zero? | n is 0, so the division fails |
| One | What if there is exactly one? | n is 1, so one person pays the lot |
| Boundaries | What happens exactly at a limit? | A bill of exactly the minimum for a card payment |
| Awkward arithmetic | Does it divide cleanly? | ₹100 among 3 is 33.33 each, collecting only ₹99.99 |
| Invalid | What if it is the wrong kind of value? | n is −2, or "four" |
| Very large | What if it is enormous? | A bill of ₹10 crore |
| Ties and duplicates | What if two are equal? | Two friends with the same name |

The pseudocode topic's dry runs try empty, one, all the same and reversed on a plan. This unit
comes first and asks a wider question: what do THIS problem's inputs and rules make awkward?

**Every rule has a boundary.** "Free delivery on orders over ₹499": what about exactly ₹499? And
₹499.50? Words like "over", "at least", "up to" and "between" each need pinning down, and the
case exactly on the boundary is the one most often wrong.

**The real world supplies edge cases nobody lists first.** 29 February, when a program adds one
year to a date. A surname with an apostrophe, like D'Souza. Two students with the same name. A
student with no marks yet because they joined late.

**For each edge case, decide what should happen. There are three honest choices:**

1. **Handle it** — give a correct answer. With n of 1, the one friend pays the whole bill.
2. **Reject it clearly** — with n of 0 or −2, say "at least one person is needed".
3. **Declare it out of scope, in writing** — "bills are assumed to be under ₹10 lakh".

Silently doing whatever happens is not one of the choices.

**From edge case to test.** Every case on your list becomes a test: an input and the output you
decided on, written down before any code exists.

| Input | Expected output |
|---|---|
| ₹1,200 among 4 | ₹300 each |
| ₹1,200 among 1 | ₹1,200 |
| ₹100 among 3 | ₹33.33, ₹33.33 and ₹33.34 |
| ₹1,200 among 0 | "At least one person is needed" |

Deciding the expected output first matters. After the code runs, it is very tempting to accept
whatever it printed as correct. A table like this is the first set of tests the finished program
must pass, and it is exactly what testing a program means.

**The misconception** is that edge cases are rare, so they can wait. Real users meet them daily:
an empty shopping cart, a first-time user with no history, a class of one. And bugs gather there,
because the ordinary case is the one everybody already tried.

**Why it matters.** Listing edge cases is not a beginner's exercise that experience removes. It is
spent again on every new problem, and experienced engineers do it more deliberately, not less.`,
    mcqs: [
      mcq('A shop offers "free delivery on orders over ₹499". Which order values are the most useful to test first?',
        [['₹499 and ₹500, on either side of the limit', true],
          ['₹100 and ₹2,000, well away from the limit', false],
          ['₹0 alone, as empty orders break most things', false],
          ['Any one order, since all amounts behave alike', false]],
        '"Over ₹499" means ₹499 does not qualify and ₹500 does. The case exactly at the boundary is where a wrong comparison hides.'),
      mcq('A program greets users by first name, taken as everything before the first space in their full name. Which input is an edge case worth listing?',
        [['A name with no space in it at all, such as "Rahul"', true],
          ['A long name such as "Venkataraman Subramaniam"', false],
          ['A name typed in capital letters, such as "ASHA"', false],
          ['A name that starts with a common letter, like "S"', false]],
        'The rule assumes a space exists. With no space there is no "before the first space", so the plan must say what happens.'),
      mcq('For "split a bill equally among n friends", what should the plan do when n is 0?',
        [['Reject it with a clear message, since nobody can pay', true],
          ['Return 0, since nobody has to pay anything at all', false],
          ['Return the full bill, as if one person were paying', false],
          ['Divide anyway and show whatever result comes out', false]],
        'Dividing by zero has no meaningful answer, and returning 0 would hide a bill nobody paid. An invalid input deserves a clear rejection.'),
      mcq('Why decide the expected output for each edge case before writing any code?',
        [['Afterwards it is tempting to accept whatever the code printed', true],
          ['Expected outputs cannot be worked out once code has been written', false],
          ['The code needs the expected outputs written down in order to run', false],
          ['It saves time, because the tests can then be skipped completely', false]],
        'A decision made first is a test. A decision made after seeing the output is usually just agreement with the program, bugs included.'),
    ],
    checkpoint: [
      mcq('A program works out "the same date next year" by adding 1 to the year. Which input breaks it?',
        [['29 February 2028', true],
          ['31 December 2027', false],
          ['1 January 2028', false],
          ['28 February 2027', false]],
        '2028 is a leap year and 2029 is not, so 29 February 2029 does not exist. The other dates all exist in the following year.'),
      mcq('₹100 is split equally among 3 people, with each share rounded to the nearest paisa. What must the plan decide?',
        [['Who pays the extra paisa, as 33.33 × 3 is only 99.99', true],
          ['Nothing, because 100 divided by 3 is exactly 33.33', false],
          ['Whether to round to rupees, as paise cannot be split', false],
          ['Whether 3 people is too many for an equal bill split', false]],
        'Three rounded shares collect ₹99.99, so one paisa is missing. A plan must say who pays it, for example one share of ₹33.34.'),
      mcq('A specification says amounts will always be under ₹10 lakh, and your plan does not handle larger amounts. When is that acceptable?',
        [['When the limit is written down as a stated assumption of the plan', true],
          ['Always, since very large amounts are too rare to be worth handling', false],
          ['Never, because every possible input must be given a proper answer', false],
          ['Only if the program crashes loudly whenever a large amount arrives', false]],
        'Declaring a case out of scope is a legitimate decision when it is recorded. What is not acceptable is leaving it undecided, so nobody knows the limit exists.'),
    ],
  },
  {
    unitCode: 'T_DECOMPOSITION_PRACTICE',
    notes: `No new ideas. Take problems you have not seen and work them on paper, before any code,
using the whole sequence from this topic.

**The method, every time:**

1. **Understand.** Inputs, output, rules, and every unclear word. Restate the problem and work
   one small example by hand.
2. **Abstract.** Strip the story. Keep only the details that would change the answer.
3. **Decompose.** Split into pieces with one job and a clear hand-over each. Stop when every piece
   is something you could start now.
4. **Name the patterns.** Which pieces are Count, Total, Best, Find, Filter or Transform? Which
   pieces repeat for each item?
5. **Write the steps.** For each piece: unambiguous, executable, and certain to finish.
6. **List the edge cases.** For each input and each rule. Decide, for every one, whether to
   handle it, reject it, or declare it out of scope — and write down the expected output.
7. **Check against your hand-worked example.** Do the steps reproduce the answer you got by hand?

**Problems worth working:**

- **Library fines:** ₹2 a day for the first 7 days late, ₹5 a day after that, never more than the
  book's price.
- **Mess menu:** no dish may appear twice in any 3 consecutive days.
- **Exam seating:** no two students from the same class may sit side by side.
- **Cricket scorecard:** each batter's strike rate (runs ÷ balls faced × 100), and the top scorer.
- **Project teams:** put a class into teams of 4.
- **Poll replies:** find which members of a group chat have not replied to a poll.

**Each hides an awkward case worth finding on paper:** a book returned exactly 7 days late, or so
late the cap applies; a menu with fewer dishes than the rule needs; a batter who faced no balls; a
class size that is not a multiple of 4; a member who replied and then withdrew their reply.

**The checklist before calling a plan finished:**

- Could I restate the problem so the person who set it agrees?
- Did I solve one small example by hand?
- Does every piece do one job, with what it needs and gives stated?
- Have I named the patterns, and checked the known pitfalls of each?
- Is every step unambiguous, and will it finish for every valid input?
- Have I listed nothing, one, boundaries, ties, invalid values, very large values and real-world
  cases such as dates and names?
- Is the expected output for each edge case written down, before any code?`,
    mcqs: [
      mcq('Library fines are ₹2 a day for the first 7 days late and ₹5 a day after that. What is the fine for a book returned 10 days late?',
        [['₹29', true], ['₹50', false], ['₹20', false], ['₹35', false]],
        'The first 7 days cost 7 × ₹2 = ₹14, and the remaining 3 days cost 3 × ₹5 = ₹15, giving ₹29.'),
      mcq('Planning each batter\'s strike rate as runs ÷ balls faced × 100, which edge case must the plan decide?',
        [['A batter who faced no balls, where the division fails', true],
          ['A batter who scored exactly 50 runs in the innings', false],
          ['A batter whose name is longer than ten characters', false],
          ['A batter who scored more runs than balls they faced', false]],
        'Dividing by zero balls has no answer, so the plan must choose what to show. Scoring faster than a run a ball is ordinary and just gives a rate above 100.'),
      mcq('You are asked to "put the 42 students into project teams of 4". What should you settle before planning anything?',
        [['What happens to the 2 students left over', true],
          ['Which students should be the team leaders', false],
          ['How the team list will be printed on paper', false],
          ['Which language the grouping tool will use', false]],
        '42 is 10 teams of 4 with 2 students remaining. Whether they form a team of 2 or join others is a rule the person asking must decide.'),
      mcq('"Find which friends have not replied to the poll." After abstraction, which pattern is this?',
        [['Filter: keep the members with no reply', true],
          ['Best: find the member who replied last', false],
          ['Total: add up the number of replies', false],
          ['Transform: change each reply into a name', false]],
        'The answer is the subset of members who fail one test, "has replied", which is the Filter shape.'),
      mcq('An exam-seating decomposition contains the piece "seat everyone correctly". What should you do with that piece?',
        [['Split it, since it hides the rules for who may sit where', true],
          ['Keep it, since those details belong in the code later on', false],
          ['Delete it, since seating is obvious and needs no piece', false],
          ['Move it, since it ought to be the first piece in the plan', false]],
        'Nobody could start "seat everyone correctly". It contains the whole difficulty of the problem, so it needs splitting into rules and steps.'),
    ],
    checkpoint: [
      mcq('A fine is ₹2 a day for 7 days, then ₹5 a day, capped at the book\'s price. A ₹150 book is returned 40 days late. What is the fine?',
        [['₹150', true], ['₹179', false], ['₹165', false], ['₹200', false]],
        'Uncapped, it is 7 × ₹2 + 33 × ₹5 = ₹14 + ₹165 = ₹179. The cap is the book\'s price, so the fine is ₹150 — an edge case the rule was written for.'),
      mcq('A mess menu must not repeat any dish within 3 consecutive days, and the kitchen has only 2 dishes. What does listing edge cases reveal?',
        [['The rule cannot be met, so the plan must say what happens', true],
          ['Nothing, since two dishes can simply alternate day by day', false],
          ['That the dishes must be sorted before planning any days', false],
          ['That the menu has to be served in alphabetical order', false]],
        'Any 3 consecutive days need 3 different dishes. Alternating two dishes puts one of them on days 1 and 3, so the plan must reject or relax the rule.'),
      mcq('Which order of work best reflects the method for an unfamiliar problem?',
        [['Understand, strip the story, split, then write and check steps', true],
          ['Write the steps, then check them, then read the problem closely', false],
          ['List edge cases, then restate the problem, then split it up', false],
          ['Split the problem, then restate it, then work one example', false]],
        'Each stage works on the output of the one before. Splitting or listing edge cases before understanding the problem risks doing both for the wrong problem.'),
    ],
  },
];
