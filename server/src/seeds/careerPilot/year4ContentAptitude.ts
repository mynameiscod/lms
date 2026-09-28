/**
 * T4_AP_QUANT, T4_AP_DI, T4_AP_REASONING and T4_AP_VERBAL — twenty-two units. Module P16.
 *
 * ── THE ROUND THAT ELIMINATES MOST CANDIDATES ─────────────────────────────────────────────
 *
 * Aptitude opens almost every campus drive, and it removes more people than any technical round
 * that follows. A student who can design a system and cannot finish thirty arithmetic questions
 * in twenty-five minutes never reaches the stage where the design matters.
 *
 * That is the entire justification for this module. It is not intellectually deep and it is not
 * optional, and treating it as beneath attention is the single most expensive attitude a strong
 * technical student can hold in their placement year.
 *
 * ── SPEED IS THE SUBJECT, NOT THE MATHEMATICS ─────────────────────────────────────────────
 *
 * Every topic here is arithmetic a fifteen-year-old can do. What is being assessed is doing it in
 * forty seconds under pressure, repeatedly, without a calculator. So the units are about
 * recognition, shortcuts and elimination rather than about method — a student who works every
 * percentage question from first principles is correct and will not finish.
 *
 * ── WHY IT IS SPREAD ACROSS THE YEAR ──────────────────────────────────────────────────────
 *
 * The spec requires placement practice to be continuous, and aptitude is the clearest case: it
 * improves through spaced repetition and barely at all through concentrated effort. Twenty minutes
 * a week for six months beats twelve hours the weekend before, and the second is what students do
 * without a plan that says otherwise.
 *
 * Attribution: T4_AP_QUANT defaults to APTITUDE_QUANT_ARITHMETIC with the rates unit and the
 * timed set on APTITUDE_QUANT_TIME; T4_AP_DI is single-skill and derived; T4_AP_REASONING to
 * APTITUDE_REASONING_SERIES with coding-decoding, arrangements and the timed set on
 * APTITUDE_REASONING_LOGIC; T4_AP_VERBAL to APTITUDE_VERBAL_GRAMMAR with comprehension and the
 * timed set on APTITUDE_VERBAL_READING.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const APTITUDE_BUNDLES: PilotBundle[] = [
  /* ══ T4_AP_QUANT ════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_AP_QUANT_PERCENTAGES_AND_RATIOS',
    notes: `**The arithmetic half of every paper, at the speed the paper assumes.**

## Percentages, without writing algebra

**A percentage change and its reverse are not the same.** Up 20% then down 20% does not return you
to the start — it leaves 96%. This asymmetry is the single most exploited fact in these papers.

**Increase by 20% means multiply by 1.2.** Decrease by 20% means multiply by 0.8. **Chaining is
multiplication**, and doing it that way removes almost all the arithmetic.

**Reverse percentage:** if a price after a 20% discount is 400, the original is 400 ÷ 0.8 = 500.
**Not 400 × 1.2**, which is the mistake the question is set to catch.

## The fractions worth knowing by sight

**1/2 = 50%. 1/3 ≈ 33.3%. 1/4 = 25%. 1/5 = 20%. 1/6 ≈ 16.7%. 1/8 = 12.5%. 1/9 ≈ 11.1%.**

**Recognising that 37.5% is 3/8 turns a multiplication into a fraction**, and at speed that is the
difference between finishing and not.

## Ratios

**A ratio is a fraction with the total hidden.** 3:5 means 3/8 and 5/8 of the whole, and converting
immediately is usually faster than working in parts.

**When two ratios share a term, scale to match it.** A:B = 2:3 and B:C = 4:5 becomes A:B:C = 8:12:15
by scaling B to 12.

## Averages

**The average times the count is the total**, and nearly every average question is solved by
recovering the total rather than by manipulating averages.

**A new item changes the average by (new value − old average) ÷ new count**, which answers the
"how does the average change" family in one step.

## The habit

**Estimate first, then compute.** If the options are far apart, an estimate eliminates three of
them in five seconds and you never do the arithmetic at all.`,
    mcqs: [
      mcq('A price after a 20% discount is 400. The original price is:',
        [['500, because 400 divided by 0.8', true],
         ['480, because 400 multiplied by 1.2', false],
         ['420, because 20 added back to the price', false],
         ['450, because the midpoint of the two values', false]],
        'The discount multiplied the original by 0.8, so recovering it divides rather than applying the same percentage upward.'),
      mcq('Increasing a value by 20% and then decreasing the result by 20% leaves:',
        [['96% of the original', true],
         ['100% of the original, unchanged', false],
         ['104% of the original amount', false],
         ['80% of the original amount', false]],
        'The second change applies to the larger figure, so 1.2 times 0.8 gives 0.96 rather than returning to the start.'),
    ],
    checkpoint: [
      mcq('Recognising that 37.5% is 3/8 matters at speed because it turns a multiplication into:',
        [['A fraction', true],
         ['A ratio with a hidden total', false],
         ['An estimate that eliminates options', false],
         ['A percentage change calculation', false]],
        'Multiplying by three and dividing by eight is faster by hand than multiplying by a decimal, which is where the time is saved.'),
      mcq('Nearly every average question is solved by recovering the total rather than by manipulating averages, because the average times the count:',
        [['Is the total', true],
         ['Removes the need for the count', false],
         ['Gives the change per new item', false],
         ['Equals the sum of the differences', false]],
        'Converting to a total makes additions and removals straightforward arithmetic rather than requiring reasoning about the mean directly.'),
    ],
  },
  {
    unitCode: 'T4_AP_QUANT_PROFIT_AND_INTEREST',
    notes: `**The commercial arithmetic in every drive, and the two formulas worth
memorising.**

## Profit and loss

**Percentage is always on the cost price unless the question says otherwise.** That default catches
people, because a "20% margin" in business usually means on the selling price and in these papers
it does not.

**Selling price = cost × (1 + profit%).** **Cost = selling ÷ (1 + profit%).** The second is the
reverse case and is where the errors are.

**Successive discounts multiply.** 20% then 10% is 0.8 × 0.9 = 0.72, so 28% off — **not 30%**, and
that difference is the whole question.

## The marked price trap

**Three numbers, not two:** marked price, selling price, cost price. A question giving a discount
on the marked price and a profit on the cost is testing whether you keep them separate.

**Write down which is which before computing anything.** Ten seconds, and it prevents the most
common error on this topic.

## Simple and compound interest

**Simple: interest = P × R × T / 100.** The principal never changes.

**Compound: amount = P × (1 + R/100)^T.** The interest earns interest.

**The difference for two years is P × (R/100)²**, which is worth knowing because it answers a whole
family of questions in one step rather than computing both and subtracting.

## The recognition

**"Per annum" and a single period — simple.** **"Compounded annually" or more than one period with
growth — compound.**

**And for short periods the two are close**, which is why estimation works and why the options are
usually set far enough apart to allow it.

## The habit

**Identify cost, selling and marked before touching the numbers.** Most losses on this topic are
not arithmetic; they are applying a percentage to the wrong base.`,
    mcqs: [
      mcq('Successive discounts of 20% and then 10% give a total discount of:',
        [['28%, because 0.8 times 0.9 is 0.72', true],
         ['30%, because the two discounts add up', false],
         ['26%, because the second applies to the cost', false],
         ['32%, because the discounts compound upward', false]],
        'The second discount applies to the already reduced price, so the multipliers combine rather than the percentages adding.'),
      mcq('In these papers, a profit percentage is taken on the cost price unless stated otherwise, which catches people because in business a margin usually means:',
        [['On the selling price', true],
         ['On the marked price before discount', false],
         ['After tax has been deducted', false],
         ['On the total revenue for the period', false]],
        'The commercial convention differs from the examination convention, so the habit brought from outside produces a consistently wrong base.'),
    ],
    checkpoint: [
      mcq('The difference between compound and simple interest over two years equals:',
        [['P times (R/100) squared', true],
         ['P times R times 2 divided by 100', false],
         ['The compound amount minus the principal', false],
         ['R squared divided by the principal', false]],
        'It is the interest earned on the first year’s interest, which is a single term and answers the family without computing both.'),
      mcq('Most losses on profit and loss questions are not arithmetic but:',
        [['Applying a percentage to the wrong base', true],
         ['Forgetting to convert between the units', false],
         ['Misreading the sign of the change given', false],
         ['Running out of time before finishing them', false]],
        'Marked, selling and cost are three different bases, and using one where another was meant produces a plausible wrong answer.'),
    ],
  },
  {
    unitCode: 'T4_AP_QUANT_TIME_WORK_AND_SPEED',
    notes: `**Rates, combined work and relative speed — one idea wearing three costumes.**

## The single idea

**Rate = work ÷ time**, and rates add when things work together.

**That one sentence solves the whole topic**, and recognising that time-and-work, speed-distance
and pipes-and-cisterns are the same problem is most of the speed gain available here.

## Work

**If A finishes in 6 days, A's rate is 1/6 per day.** Two people together: add the rates. 1/6 + 1/3
= 1/2, so two days.

**Work with rates, not with times.** Times do not add and rates do; averaging the times is the
standard wrong answer and it is exactly what the question is set to catch.

**The LCM trick:** let the total work be the LCM of the given times. A in 6 and B in 3 becomes 6
units of work, A doing 1 per day and B doing 2. **No fractions at all**, which is considerably
faster by hand.

## Speed

**Relative speed adds when approaching and subtracts when moving apart or overtaking.**

**Trains crossing:** the distance is the sum of both lengths when passing each other, and the
length of the train plus the platform when crossing a platform. **Getting that distance wrong is
the usual error**, not the arithmetic.

## Average speed

**Total distance over total time. Never the average of the two speeds.**

**For equal distances at speeds a and b, it is 2ab/(a+b)** — the harmonic mean, and worth
memorising because that exact question appears constantly.

## The habit

**Convert everything to one unit before starting.** Kilometres per hour and metres per second in
the same question is deliberate, and 5/18 converts the second to the first.`,
    mcqs: [
      mcq('Two people finish a job in 6 days and 3 days respectively. Working together they take:',
        [['2 days, because the rates add to 1/2', true],
         ['4.5 days, the average of the two times', false],
         ['9 days, because the times are added', false],
         ['3 days, limited by the slower worker', false]],
        'Rates add where times do not, so 1/6 plus 1/3 gives 1/2 of the job per day and therefore two days.'),
      mcq('For equal distances travelled at speeds a and b, the average speed is:',
        [['2ab divided by (a plus b)', true],
         ['The arithmetic mean of a and b', false],
         ['The larger of the two speeds used', false],
         ['ab divided by (a plus b) overall', false]],
        'More time is spent at the slower speed, so the harmonic mean applies and the arithmetic mean overstates the result.'),
    ],
    checkpoint: [
      mcq('The LCM trick sets the total work to the LCM of the given times, which removes:',
        [['Fractions from the calculation entirely', true],
         ['The need to identify the rates at all', false],
         ['Any dependence on the number of workers', false],
         ['The difference between work and speed problems', false]],
        'Whole-number units per day are faster to combine by hand than adding fractions, which is where the time saving comes from.'),
      mcq('In train problems the usual error is not the arithmetic but:',
        [['Getting the distance wrong', true],
         ['Adding the speeds when they should subtract', false],
         ['Converting between the units incorrectly', false],
         ['Assuming the trains are the same length', false]],
        'Crossing another train covers both lengths and crossing a platform covers the train plus the platform, and confusing them changes the answer.'),
    ],
  },
  {
    unitCode: 'T4_AP_QUANT_TIMED_SET',
    notes: `**Thirty quantitative questions, twenty-five minutes.**

## The arithmetic of the round itself

**Fifty seconds per question, and you will not get all of them.** That is by design — these papers
are built so nobody finishes comfortably, and the scoring is about how many you get right rather
than how many you attempt.

**Which makes selection the skill.** Three easy questions answered correctly beat one hard one
solved and two rushed.

## The three-pass approach

**First pass: answer everything you can do in under thirty seconds.** Skip anything that needs
setting up.

**Second pass: the ones needing a minute.**

**Third pass: whatever is left, if there is time.**

**Most candidates work straight through and spend four minutes on question seven**, which costs
them five easy questions at the end they never reach.

## Negative marking

**Where it exists, a guess with four options and no elimination is neutral at best.** With one
option eliminated it becomes worth taking.

**Know the rule before the round starts** — it changes the strategy completely and candidates
regularly do not check.

## Estimation

**Look at the options before computing.** If they are far apart, estimate and eliminate. A
surprising proportion of questions are answerable in ten seconds this way, and the arithmetic is
never done.

## After the set

**Separate three categories: got it right, got it wrong, did not reach.**

**"Did not reach" is a pacing problem and "got it wrong" is a knowledge problem**, and they need
completely different responses. Most students conflate them into "I need more practice", which
does not identify anything.`,
    mcqs: [
      mcq('Working straight through the paper rather than in passes typically costs candidates:',
        [['Easy questions at the end they never reach', true],
         ['Accuracy on the questions they do attempt', false],
         ['The opportunity to check their answers', false],
         ['Marks lost to negative marking rules', false]],
        'Time spent on a hard early question is time unavailable for straightforward ones later, and the marks are identical.'),
      mcq('Separating "got it wrong" from "did not reach" matters because the first is a knowledge problem and the second is:',
        [['A pacing problem', true],
         ['A sign of insufficient practice', false],
         ['Evidence the paper was too long', false],
         ['A consequence of poor question choice', false]],
        'One needs the material revisited and the other needs the selection strategy changed, and conflating them identifies neither.'),
    ],
    checkpoint: [
      mcq('These papers are built so nobody finishes comfortably, which makes the skill:',
        [['Selection', true],
         ['Speed of arithmetic calculation', false],
         ['Accuracy on every attempted question', false],
         ['Knowledge of the full syllabus', false]],
        'With more questions than time, which ones to attempt determines the score more than how quickly any single one is solved.'),
      mcq('Knowing the negative marking rule before the round starts matters because it:',
        [['Changes the guessing strategy completely', true],
         ['Determines how many questions to attempt', false],
         ['Affects which topics are worth revising', false],
         ['Is different for each section of the paper', false]],
        'Whether an unresolved question should be guessed or left blank depends entirely on the penalty, and candidates regularly do not check.'),
    ],
  },
  {
    unitCode: 'T4_AP_QUANT_INTERVIEW_QUESTION',
    notes: `**Mental arithmetic in a technical interview**, which happens more often than students
expect.

## Where it appears

**Not as an aptitude round.** As a throwaway inside a technical discussion: "roughly how many
requests is that per second?", "if each row is 200 bytes, how big is the table?", "what fraction
of the total is that?"

**And the assessment is not the arithmetic.** It is whether you can produce a reasonable number
quickly instead of freezing or reaching for a calculator.

## The skill being tested

**Estimation with round numbers.** A million seconds is about eleven days. A day is about 86,400
seconds, which is near enough 100,000 for a first pass. Ten million requests a day is roughly a
hundred per second.

**Being comfortable with an approximation and saying it is one** — "call it a hundred per second,
give or take" — is the correct register, and precision is not what was wanted.

## The failure modes

**Freezing.** The silence is the problem, not the difficulty.

**False precision.** Producing 115.74 per second from a figure that was itself a guess suggests the
approximation was not understood.

**And apologising for estimating**, when estimating was the point.

## The related question

**"How would you check that number?"** Sanity checks: an order of magnitude, a comparison to
something known, a different route to the same figure. **Having a second route is what makes a
number trustworthy**, and it is the same habit the data track builds as reconciliation.

## How to prepare

**Powers of ten, and a handful of conversions.** Seconds in a day, bytes in a gigabyte, the
fractions as percentages. **Ten minutes of memorisation** covers nearly every version of this that
appears.`,
    mcqs: [
      mcq('Mental arithmetic in a technical interview assesses not the arithmetic but whether you can:',
        [['Produce a reasonable number quickly', true],
         ['Recall the exact conversion factors', false],
         ['Perform the calculation without errors', false],
         ['Explain the method you used to get it', false]],
        'The context is a discussion rather than a test, so a fast approximation serves the conversation where an exact figure does not.'),
      mcq('Producing 115.74 per second from a figure that was itself a guess suggests:',
        [['The approximation was not understood', true],
         ['The candidate is unusually careful', false],
         ['A calculator was used for the working', false],
         ['The original figure was more precise', false]],
        'Precision cannot exceed that of the inputs, so carrying decimals from an estimate misrepresents how much is actually known.'),
    ],
    checkpoint: [
      mcq('"How would you check that number?" is answered with sanity checks, and having a second route is described as the same habit the data track builds as:',
        [['Reconciliation', true],
         ['Error analysis by group', false],
         ['Shape checking before analysis', false],
         ['Stating what the data cannot answer', false]],
        'Both compare a figure against an independently derived one, which is what converts a computed number into a trusted one.'),
      mcq('Preparation for this is powers of ten and a handful of conversions, described as:',
        [['Ten minutes of memorisation', true],
         ['A regular weekly practice session', false],
         ['Something best learned during the round', false],
         ['Covered adequately by the aptitude drills', false]],
        'Seconds in a day, bytes in a gigabyte and the common fractions cover nearly every instance, so the preparation is small and bounded.'),
    ],
  },
  {
    unitCode: 'T4_AP_QUANT_CHECKPOINT',
    notes: `**Whether quantitative aptitude is at drive speed.**

## The bar

**Twenty-five questions in twenty-five minutes, with at least eighteen correct.**

**And the three-pass discipline applied**, which is visible in whether the easy questions at the
end were reached.

## What a weak result means

**Accuracy low, coverage high**: the method is shaky. Percentages on the wrong base, times averaged
instead of rates added. **This is a knowledge gap and it closes quickly** — the material is small
and the errors are a short list.

**Accuracy high, coverage low**: pacing. The knowledge is there and the selection is not. **This
closes even faster**, because it is a decision rather than a skill: three passes, and skip anything
needing setup on the first.

**Both low**: start with accuracy. Speed built on a wrong method produces confident wrong answers
faster.

## Why this is measured rather than assumed

**Because strong technical students routinely assume this is beneath them**, do not practise it,
and are eliminated in the first round of drives they would otherwise have passed comfortably.

**The checkpoint exists to make that visible while there is time**, which is the whole argument for
placing aptitude early and repeating it rather than scheduling it before the drive season.

## What this feeds

**The first round of most campus drives**, and P23's simulation, which opens with it for exactly
the reason a real drive does.`,
    checkpoint: [
      mcq('Accuracy high and coverage low indicates a pacing problem, which closes faster than a knowledge gap because it is:',
        [['A decision rather than a skill', true],
         ['A smaller amount of material to learn', false],
         ['Addressed by attempting more papers', false],
         ['Independent of the topics being tested', false]],
        'Adopting three passes and skipping setup-heavy questions on the first requires no new learning, so it improves immediately once chosen.'),
      mcq('When both accuracy and coverage are low, accuracy is addressed first because speed built on a wrong method:',
        [['Produces confident wrong answers faster', true],
         ['Cannot be improved until accuracy is fixed', false],
         ['Leads to more questions being skipped', false],
         ['Is harder to measure in a timed set', false]],
        'Increasing the rate of a flawed procedure increases the number of errors rather than the score.'),
      mcq('The checkpoint exists to make the gap visible while there is time because strong technical students routinely:',
        [['Assume this is beneath them and do not practise', true],
         ['Overestimate how quickly they can improve', false],
         ['Prioritise the technical rounds over this one', false],
         ['Find the arithmetic harder than they expected', false]],
        'The material is elementary, which invites dismissal, and the elimination happens before any technical capability is assessed.'),
      mcq('P23’s simulation opens with aptitude for exactly the reason:',
        [['A real drive does', true],
         ['It is the shortest of the six rounds', false],
         ['Candidates are freshest at the start', false],
         ['The results determine the later rounds', false]],
        'The simulation reproduces the drive’s structure, and aptitude first is what makes the elimination it performs realistic.'),
    ],
  },

  /* ══ T4_AP_DI ═══════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_AP_DI_READING_A_TABLE',
    notes: `**Finding the one number the question needs**, rather than working out the whole grid.

## The mistake that costs the most

**Computing everything first.** A table with six rows and five columns invites a full calculation,
and the question asks about two cells. **Four minutes spent, thirty seconds needed.**

**Read the question before the table**, every time. It is the opposite of what feels natural and it
is the single largest time saving available on this topic.

## What to read in the table first

**The units.** Thousands, lakhs, percentages, or a mix — and a column in a different unit from its
neighbours is deliberate.

**The totals row or column**, if there is one. Most questions are about shares of a total, and
having it saves recomputation.

**And whether the numbers are values or percentages of something**, which changes every
calculation that follows.

## The question types, in order of frequency

**Which is largest or smallest.** Frequently answerable by inspection with no arithmetic.

**What percentage is A of B.** One division.

**The change from one period to another**, absolute or percentage. **Read which is being asked** —
"increased by 20 units" and "increased by 20 percent" are different questions and the options
usually include both answers.

**The average across a row or column.** Sum and divide, and check whether the question wants the
average of the values or a weighted average.

## Approximation

**The options are usually far enough apart to allow it.** 4,732 ÷ 18,940 is close enough to
4,700 ÷ 19,000, which is close enough to 1/4.

**Start by estimating and only compute exactly if two options remain**, which on this topic is
rare.`,
    mcqs: [
      mcq('Reading the question before the table is described as the opposite of what feels natural and:',
        [['The single largest time saving on this topic', true],
         ['Only useful when the table is very large', false],
         ['A technique for the harder question types', false],
         ['Less important than knowing the units used', false]],
        'The question names which two cells matter, so reading it first converts a full computation into a targeted lookup.'),
      mcq('"Increased by 20 units" and "increased by 20 percent" are different questions, and the options usually:',
        [['Include both answers', true],
         ['Make the distinction obvious by scale', false],
         ['Specify which interpretation applies', false],
         ['Round to the same value in most cases', false]],
        'The paper anticipates the confusion, so choosing the wrong reading produces an answer that appears in the list and feels confirmed.'),
    ],
    checkpoint: [
      mcq('A column in a different unit from its neighbours is described as:',
        [['Deliberate', true],
         ['A formatting inconsistency to ignore', false],
         ['Usually stated in the question stem', false],
         ['Only relevant for percentage questions', false]],
        'Mixing units within a table is a designed trap, and reading them before computing is what prevents the resulting error.'),
      mcq('The recommended approach is to estimate first and compute exactly only if two options remain, which on this topic is:',
        [['Rare', true],
         ['The usual outcome of estimating', false],
         ['Necessary for the percentage questions', false],
         ['A sign the estimate was too imprecise', false]],
        'The options are generally spread widely enough that a rough calculation eliminates all but one, so exact arithmetic is seldom needed.'),
    ],
  },
  {
    unitCode: 'T4_AP_DI_CHARTS',
    notes: `**Bar charts, pie charts, line graphs — and the trap in each.**

## Pie charts

**The whole is 100% or 360 degrees**, and questions convert between them. **A sector of 72 degrees
is 20%.**

**The trap:** comparing sectors across two pie charts with different totals. 30% of one and 25% of
another says nothing about which is larger in absolute terms, and the question is set precisely to
see whether you notice.

**Always check whether the totals are given**, because without them cross-chart comparison is
impossible and "cannot be determined" is a real option.

## Bar charts

**Read the axis.** A truncated axis makes a small difference look large, and these papers use it.

**Stacked bars** show components and a total; questions ask about one component, the total, or a
component's share. **Which of the three is being asked is the whole question**, and misreading it
is the usual error.

## Line graphs

**The value against the change.** "Highest sales" and "highest growth in sales" are different
points on the graph, and both appear in the options.

**A steep line is a large change, not a large value.**

## Combined charts

**A table plus a chart, where neither alone answers the question.** The technique is to identify
which part supplies which number before computing — thirty seconds of reading against two minutes
of confusion.

## The general habit

**Read the axis, the units and the total first.** Three things, ten seconds, and they prevent the
majority of errors on this topic — which are errors of reading rather than of arithmetic.`,
    mcqs: [
      mcq('Comparing a 30% sector of one pie chart with a 25% sector of another says nothing about absolute size unless:',
        [['The totals of both charts are given', true],
         ['The two charts use the same scale', false],
         ['The sectors represent the same category', false],
         ['The percentages are converted to degrees', false]],
        'Percentages are shares of different wholes, so without the totals no absolute comparison can be made and "cannot be determined" may be correct.'),
      mcq('On a line graph, "highest sales" and "highest growth in sales" are:',
        [['Different points, and both appear in the options', true],
         ['The same point when the trend is upward', false],
         ['Distinguished by the axis labelling used', false],
         ['Equivalent unless the line is discontinuous', false]],
        'One is the greatest value and the other the steepest change, and the paper includes both answers to catch the misreading.'),
    ],
    checkpoint: [
      mcq('With stacked bars, the whole question is which of three things is being asked: one component, the total, or:',
        [['A component’s share of the total', true],
         ['The change between two of the bars', false],
         ['The average across all the components', false],
         ['The largest component in each bar', false]],
        'The three require different readings of the same bar, and taking the wrong one produces an answer that is present in the options.'),
      mcq('The majority of errors on this topic are described as errors of:',
        [['Reading rather than of arithmetic', true],
         ['Estimation under time pressure', false],
         ['Converting between the units given', false],
         ['Selecting which questions to attempt', false]],
        'Axes, units and totals misread once propagate into every calculation, which is why checking them first prevents most of the failures.'),
    ],
  },
  {
    unitCode: 'T4_AP_DI_TIMED_SET',
    notes: `**Four data sets, twenty questions, twenty minutes.**

## Why this topic rewards practice more than any other in the module

**Because the arithmetic is trivial and the reading is not.** Improvement comes almost entirely
from familiarity with the question forms, which means the gains are fast and they plateau — a few
hours of practice takes most students from poor to competent, and further practice adds little.

**That makes it the highest-return topic in the aptitude module per hour spent**, which is worth
knowing when deciding where the twenty minutes a week goes.

## The routine per set

**Read the question first.** Then find the numbers. Then estimate. Then compute only if needed.

**And read the caption and units before anything else** — ten seconds that prevents the errors that
matter.

## Set selection

**Four sets are not equally hard.** One usually involves a mix of units or requires combining two
charts, and it takes twice as long per question.

**Do the other three first.** Most candidates work through in order and run out of time on sets
they would have found easy.

## Where the time actually goes

**Not calculation — recalculation.** Working out a total, losing it, working it out again for the
next question.

**Write down the totals once**, in the margin. They are used by three or four questions each and
recomputing them is the single largest waste on this topic.

## After the set

**Count how many were arithmetic errors and how many were reading errors.**

**Reading errors dominate**, almost always, and they respond to the "read the question first"
discipline rather than to more arithmetic practice — which is what most students do instead.`,
    mcqs: [
      mcq('This topic rewards practice more than any other in the module because the arithmetic is trivial and:',
        [['The reading is not', true],
         ['The questions repeat between papers', false],
         ['The time limit is the binding constraint', false],
         ['The charts vary widely in difficulty', false]],
        'Improvement comes from familiarity with the question forms rather than from computational skill, so exposure produces fast gains.'),
      mcq('The single largest waste of time on this topic is:',
        [['Recalculating totals that were already worked out', true],
         ['Estimating when exact values are needed', false],
         ['Reading the captions before the questions', false],
         ['Attempting the hardest set first of all', false]],
        'Each total serves several questions, so writing it down once in the margin removes work that is otherwise repeated three or four times.'),
    ],
    checkpoint: [
      mcq('Four sets are not equally hard, and the recommendation is to do the harder one last because most candidates:',
        [['Work through in order and run out of time', true],
         ['Find the first set the most difficult one', false],
         ['Spend equal time on each of the sets', false],
         ['Cannot tell which set will be harder', false]],
        'Sequential working spends disproportionate time on the demanding set and leaves easier questions unreached at the end.'),
      mcq('Reading errors dominate on this topic and respond to the "read the question first" discipline rather than to:',
        [['More arithmetic practice', true],
         ['Estimation before computing exactly', false],
         ['Writing the totals down in the margin', false],
         ['Attempting fewer questions more carefully', false]],
        'The failure is in interpreting what was asked, so improving calculation speed addresses a step that was not the problem.'),
    ],
  },
  {
    unitCode: 'T4_AP_DI_INTERVIEW_QUESTION',
    notes: `**"Here is some data. What does it tell you?"**

## Where this appears

**In a data-adjacent technical interview**, and increasingly in general ones — a chart or a small
table, and an open question about it.

**The aptitude version asks you to compute.** This version asks you to interpret, and the
difference is what is being assessed.

## What a strong answer does

**States what the data shows**, plainly and without overstating.

**Names what it does not show.** Coverage, the period, what is missing. **This is the part that
separates**, and it is the same judgement the data track builds.

**And offers one thing worth investigating**, which turns an observation into a contribution.

## The traps in the data itself

**An incomplete recent period**, which looks like a decline and is not.

**A truncated axis**, which makes a small change dramatic.

**A change in definition mid-series**, where the step is an artefact.

**A correlation presented as a cause.** "Sales rose after the campaign" is a sequence, not a
mechanism, and saying so is the expected answer.

## The follow-ups

**"So should we do more of it?"** Hand back a decision rule rather than a verdict: "if this
relationship holds, then yes — and here is what would establish that it does."

**"What else would you want?"** A comparison group, a longer period, the same data at finer
granularity. Naming one specific thing beats "more data".

## What loses marks

**Reciting the numbers.** Reading a chart aloud is not interpretation, and it is what a candidate
does when they have not decided what the data means.`,
    mcqs: [
      mcq('The aptitude version of a data question asks you to compute, where this version asks you to:',
        [['Interpret', true],
         ['Estimate more quickly than before', false],
         ['Identify errors in the presentation', false],
         ['Recalculate the underlying figures', false]],
        'The assessment is what the numbers mean and what they do not support, rather than whether the arithmetic can be performed.'),
      mcq('"Sales rose after the campaign" is described as a sequence rather than a mechanism, and saying so is:',
        [['The expected answer', true],
         ['An unnecessarily cautious response', false],
         ['Only relevant if the effect is small', false],
         ['A point to raise in a follow-up question', false]],
        'Temporal order does not establish causation, and noting the distinction is what the question is set up to elicit.'),
    ],
    checkpoint: [
      mcq('Naming what the data does not show is described as the part that separates, and it is the same judgement built in:',
        [['The data track', true],
         ['The system design topic', false],
         ['The technical MCQ module', false],
         ['The behavioural interview work', false],
        ],
        'Both require establishing the limits of what evidence supports before drawing a conclusion from it.'),
      mcq('Reciting the numbers is what a candidate does when they have not:',
        [['Decided what the data means', true],
         ['Been given enough time to analyse it', false],
         ['Understood the units being presented', false],
         ['Seen that kind of chart before', false]],
        'Reading values aloud fills the silence without committing to an interpretation, which is the thing actually being asked for.'),
    ],
  },
  {
    unitCode: 'T4_AP_DI_CHECKPOINT',
    notes: `**Whether data interpretation is at drive speed.**

## The bar

**Twenty questions in twenty minutes, at least fifteen correct**, with the totals written down
once and the harder set left until last.

## What a weak result means

**Reading errors**: the discipline is missing. Read the question first, read the units, read the
totals. **It is three habits and they close the gap within a few sessions**, which is why this
topic gives the fastest improvement in the module.

**Arithmetic errors**: less common here, and it points back at the quantitative topic rather than
at this one.

**Not finishing**: set selection. The harder set was attempted first, or totals were recomputed
repeatedly.

## The thing worth saying plainly

**This topic plateaus.** A few hours of practice takes most students from poor to competent, and
further practice adds very little.

**So it is worth doing early and then leaving alone** — unlike the coding drills, where continued
practice continues to pay. Knowing which of the two a topic is determines where the limited weekly
time should go, and treating them the same wastes it.

## What this feeds

**The aptitude section of every drive**, where data interpretation is typically a third of the
paper, and **P23's simulation**, which reproduces that proportion.`,
    checkpoint: [
      mcq('This topic plateaus after a few hours, unlike the coding drills where continued practice continues to pay, and knowing which a topic is determines:',
        [['Where the limited weekly time should go', true],
         ['How the checkpoint should be scored', false],
         ['Whether it belongs in the module at all', false],
         ['How early in the year it is scheduled', false]],
        'Effort allocated to a plateaued topic produces no further return, so the distinction directs practice towards where gains remain available.'),
      mcq('Arithmetic errors on this topic are less common and point back at:',
        [['The quantitative topic rather than this one', true],
         ['A misunderstanding of the chart types', false],
         ['Insufficient time spent per question', false],
         ['The estimation technique being applied', false]],
        'The calculations here are elementary, so persistent arithmetic failure indicates a gap in the underlying method rather than in interpretation.'),
      mcq('Not finishing points at set selection, meaning either the harder set was attempted first or:',
        [['Totals were recomputed repeatedly', true],
         ['Estimation was used where exact values were needed', false],
         ['The questions were read before the charts', false],
         ['Too many questions were left unattempted', false]],
        'Both are pacing faults rather than knowledge gaps, and both are addressed by a change in procedure rather than by more study.'),
      mcq('Data interpretation is typically what proportion of a drive’s aptitude paper?',
        [['About a third', true],
         ['About a tenth of the questions', false],
         ['More than half of the paper', false],
         ['A fixed ten questions regardless', false]],
        'It is one of the three main sections alongside quantitative and reasoning, which is the proportion the simulation reproduces.'),
    ],
  },

  /* ══ T4_AP_REASONING ════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_AP_REASONING_SERIES_AND_ANALOGY',
    notes: `**Finding the rule quickly, and knowing when to abandon one that nearly works.**

## The checks, in order

**Differences between consecutive terms.** Constant means arithmetic. If the differences
themselves form a pattern, look at their differences.

**Ratios.** Constant means geometric.

**Squares, cubes and primes.** 1, 4, 9, 16 and 2, 3, 5, 7 are recognised on sight with practice,
and the series is frequently one of these with an offset.

**Alternating rules.** Two interleaved sequences, which is why a series that makes no sense as one
frequently resolves immediately when split.

**Position-based.** The nth term involving n itself.

**Five checks, about twenty seconds**, and they cover the large majority.

## The abandonment rule

**If a rule works for four terms and fails on the fifth, it is wrong** — not "nearly right".
**Series are constructed to have exactly one rule**, and a near-fit is the trap.

**Most time lost on this topic is spent defending a rule that almost works**, and setting a
threshold — thirty seconds, then start again with a different check — recovers it.

## Letter series

**Convert to numbers.** A is 1, Z is 26. **Nearly every letter series is a number series in
disguise**, and doing the conversion immediately is faster than reasoning about letters.

## Analogies

**State the relationship in words before looking at the options.** "A is the tool used by B."

**Then test each option against that sentence.** Choosing by feel is what produces the wrong answer
on the pairs designed to have two plausible candidates.

## Odd one out

**Find what the majority share.** The answer is the one lacking it — and check more than one
property, because the obvious shared property is frequently not the intended one.`,
    mcqs: [
      mcq('A rule that works for four terms and fails on the fifth is:',
        [['Wrong, not nearly right', true],
         ['Usually correct with an exception', false],
         ['A sign the series has two rules', false],
         ['Acceptable if no better rule is found', false]],
        'Series are constructed to have exactly one rule, so a rule that fails anywhere is not the intended one and a near-fit is the designed trap.'),
      mcq('Nearly every letter series is a number series in disguise, so the first step is to:',
        [['Convert the letters to their positions', true],
         ['Look for alphabetical adjacency', false],
         ['Group the letters into pairs first', false],
         ['Check whether they form a word', false]],
        'Working with positions allows the standard difference and ratio checks, which is faster than reasoning about letters directly.'),
    ],
    checkpoint: [
      mcq('Most time lost on this topic is spent:',
        [['Defending a rule that almost works', true],
         ['Converting between letters and numbers', false],
         ['Checking all five patterns in sequence', false],
         ['Deciding which questions to attempt', false]],
        'Commitment to a near-fitting rule prevents restarting, and a thirty-second threshold before trying a different check recovers the time.'),
      mcq('For analogies, stating the relationship in words before looking at the options prevents the error on pairs designed to have:',
        [['Two plausible candidates', true],
         ['No relationship at all between them', false],
         ['A relationship in the reverse direction', false],
         ['More than one correct answer given', false]],
        'Choosing by feel selects whichever option resembles the pair, where an explicit sentence discriminates between the two candidates.'),
    ],
  },
  {
    unitCode: 'T4_AP_REASONING_CODING_DECODING',
    notes: `**Substitution patterns and family trees — mechanical once the notation is right.**

## Coding and decoding

**The letters are shifted, reversed, reordered, or substituted by position.**

**Write the alphabet with numbers once, at the top of your rough sheet**, and every question on
this topic becomes arithmetic. Reconstructing it mentally per question is where the time goes.

**The four patterns, in order of frequency:**

**A constant shift.** Each letter moves by the same amount.

**A positional shift.** The first letter moves by one, the second by two.

**Reversal.** The word backwards, or each letter replaced by its opposite in the alphabet — A for
Z, B for Y. **The opposite of a letter at position n is at position 27 − n**, which is worth
knowing by heart.

**Rearrangement.** The letters are the same and the order changed.

**Check the first two letters, form a hypothesis, verify on a third.** Verifying on only one is how
a coincidence is mistaken for a rule.

## Blood relations

**Draw it.** Always, however simple it sounds. Two minutes of holding a family tree in your head is
slower and less reliable than fifteen seconds of notation.

**Use a consistent notation** — a symbol for male and female, a line for marriage, a branch for a
child — and do not invent one per question.

**"My father's only son" is me**, and that family of self-referential clues is the standard trap.

## Directions

**Draw the axes and track the facing direction separately from the position.** Left and right turns
depend on which way you are facing, and that is the whole difficulty.

## The habit across all three

**Notation first, reasoning second.** These questions are mechanical for anybody who writes them
down and error-prone for anybody who does not, and the writing takes fifteen seconds.`,
    mcqs: [
      mcq('The opposite of a letter at position n in the alphabet is at position:',
        [['27 minus n', true],
         ['26 minus n exactly', false],
         ['n plus 13, wrapping around', false],
         ['13 minus n when n is small', false]],
        'A pairs with Z as 1 with 26, and the two positions sum to 27, which makes the reversal immediate once memorised.'),
      mcq('Verifying a coding hypothesis on only one additional letter is how:',
        [['A coincidence is mistaken for a rule', true],
         ['The wrong pattern family is selected', false],
         ['Time is lost on the easier questions', false],
         ['Positional shifts are missed entirely', false]],
        'Several patterns agree on any two letters, so a third is needed before the hypothesis is distinguished from the alternatives.'),
    ],
    checkpoint: [
      mcq('"My father’s only son" refers to:',
        [['Me', true],
         ['My brother in the family', false],
         ['My father himself in the tree', false],
         ['A relation that cannot be determined', false]],
        'If the father has only one son, the speaker is that son, and this self-referential form is the standard trap on the topic.'),
      mcq('The habit across coding, blood relations and directions is notation first, because these questions are mechanical for anybody who writes them down and:',
        [['Error-prone for anybody who does not', true],
         ['Impossible to solve without a diagram', false],
         ['Faster when reasoned about mentally', false],
         ['Designed to be answered by inspection', false]],
        'Holding several relationships in working memory under time pressure produces mistakes that fifteen seconds of writing eliminates.'),
    ],
  },
  {
    unitCode: 'T4_AP_REASONING_ARRANGEMENTS_AND_SYLLOGISMS',
    notes: `**Building the grid, eliminating, and the syllogism rule that is not the intuitive
one.**

## Arrangements

**Draw the structure first.** A row of five, a circle of six, a table with three columns. **Before
reading any clue**, because the structure determines how the clues are recorded.

**Then sort the clues by how much they fix.** A clue placing somebody definitely is worth more than
one giving a relationship, so **use the definite ones first** — most candidates work in the order
given, which is the order of presentation rather than of usefulness.

**Record what is impossible as well as what is certain.** A cross in a cell is information, and
arrangements are solved by elimination far more than by direct placement.

**Circular arrangements:** establish whether facing inward or outward, because left and right
reverse. It is stated in the question and it is the most commonly missed line.

## Syllogisms

**The rule that is not intuitive: a conclusion must follow necessarily, not possibly.**

"All A are B. Some B are C." Does some A follow as C? **No** — it may be true and it does not
follow, and the answer is that it does not follow.

**"Possibly true" is not "follows".** This single distinction accounts for most errors on the
topic, because everyday reasoning accepts the plausible.

**Venn diagrams settle it.** Draw the arrangement that satisfies the premises and violates the
conclusion — if one exists, the conclusion does not follow. **That is the whole method** and it is
mechanical.

**"Either-or" conclusions** appear when two conclusions cannot both be false, and they are worth
recognising because they look wrong at first sight.

## The time budget

**Arrangements are slow and reliable**; syllogisms are fast and error-prone. **Attempt syllogisms
first** and leave arrangements for when the quick marks are banked.`,
    mcqs: [
      mcq('"All A are B. Some B are C." Does it follow that some A are C?',
        [['No — it may be true and does not follow', true],
         ['Yes, because A and C share B between them', false],
         ['Yes, provided some B are also A already', false],
         ['Only when all B are C rather than some', false]],
        'The B that are C may be entirely outside A, so the conclusion is possible rather than necessary and does not follow.'),
      mcq('The Venn method settles a syllogism by drawing an arrangement that satisfies the premises and:',
        [['Violates the conclusion', true],
         ['Confirms the conclusion holds', false],
         ['Places every set as overlapping', false],
         ['Uses the smallest number of regions', false]],
        'A single counterexample shows the conclusion is not necessary, which is exactly what "does not follow" means.'),
    ],
    checkpoint: [
      mcq('Clues should be sorted by how much they fix rather than used in the order given, because the order given is:',
        [['The order of presentation, not of usefulness', true],
         ['Designed to mislead the candidate deliberately', false],
         ['Random and therefore equally useful throughout', false],
         ['Usually from most to least constraining already', false]],
        'A clue placing somebody definitely constrains the grid far more than a relative one, so using it first reduces the remaining possibilities fastest.'),
      mcq('Syllogisms are attempted before arrangements because arrangements are:',
        [['Slow and reliable, so they can wait', true],
         ['More likely to contain a trap clue', false],
         ['Worth fewer marks in most papers', false],
         ['Harder to check once completed', false]],
        'Banking the fast marks first protects against running out of time, since an unfinished arrangement scores nothing.'),
    ],
  },
  {
    unitCode: 'T4_AP_REASONING_TIMED_SET',
    notes: `**Twenty-five reasoning questions, twenty-five minutes.**

## What makes this section different from quantitative

**The time per question varies enormously.** A series takes fifteen seconds and an arrangement set
takes six minutes for five questions.

**Which makes the selection decision sharper here than anywhere else in the paper.** Attempting an
arrangement first can consume a quarter of the section before a single mark is banked.

## The order that works

**Series, analogies, odd-one-out first.** Fast, mechanical, and reliably correct with practice.

**Then coding and blood relations**, which are quick once the notation is written.

**Then syllogisms**, fast but requiring care.

**Then arrangements**, last, with whatever time remains — and accepting that an unfinished
arrangement scores nothing, so starting one with four minutes left is a decision to lose those
four minutes.

## The rough sheet

**Set it up before the timer starts if permitted:** the alphabet with positions, and a space for
each arrangement grid.

**Ten seconds, and it removes the setup cost from every question that needs it.**

## Where marks are lost

**Not difficulty — abandonment cost.** Starting an arrangement, spending three minutes, and
leaving it incomplete is the worst outcome available, and it happens when the section is worked in
order.

## After the set

**Record time per question type.** It is the only way to know whether the order is right for you,
and the correct order is individual — somebody fast at arrangements should do them earlier than
somebody who is not.`,
    mcqs: [
      mcq('The selection decision is sharper in reasoning than elsewhere because the time per question:',
        [['Varies enormously between question types', true],
         ['Is shorter than in the other sections', false],
         ['Depends on the difficulty of each item', false],
         ['Is fixed by the structure of the paper', false]],
        'A series takes seconds and an arrangement set takes minutes, so the order of attempt has a much larger effect on total marks.'),
      mcq('Starting an arrangement with four minutes remaining is described as a decision to:',
        [['Lose those four minutes', true],
         ['Attempt the highest-value questions', false],
         ['Risk a small loss for a larger gain', false],
         ['Use the remaining time productively', false]],
        'An incomplete arrangement scores nothing, so the time is spent with no possibility of return unless the whole set is finished.'),
    ],
    checkpoint: [
      mcq('The correct order of attempt is described as individual, meaning somebody fast at arrangements should:',
        [['Do them earlier than somebody who is not', true],
         ['Still leave them until the very end', false],
         ['Attempt only the arrangements in the section', false],
         ['Follow the same order as everybody else', false]],
        'The ordering maximises marks per minute, which depends on the individual’s speed at each type rather than on a general rule.'),
      mcq('Marks are lost here not to difficulty but to:',
        [['Abandonment cost', true],
         ['Careless errors under time pressure', false],
         ['Misreading the question requirements', false],
         ['Attempting too few questions overall', false]],
        'Time invested in a question that is then left unfinished produces nothing, and working in the presented order makes that outcome likely.'),
    ],
  },
  {
    unitCode: 'T4_AP_REASONING_INTERVIEW_QUESTION',
    notes: `**A puzzle in a technical interview**, which some companies still use.

## What is actually being assessed

**Not the answer.** Whether you approach an unfamiliar problem systematically, state assumptions,
and stay coherent while stuck.

**Which is the same thing a coding question assesses**, delivered differently — and knowing that
tells you how to behave.

## The approach

**Restate the problem.** Confirm you have understood the constraints.

**Ask clarifying questions.** Most puzzles are deliberately underspecified, and asking is expected
rather than penalised.

**State your approach before working.** "I will consider the smallest case and see if a pattern
emerges."

**Think aloud.** Silence is the failure here as it is everywhere else in interviewing.

**And if you reach a dead end, say so and describe what you will try instead.** That is the most
informative thing you can do while stuck, and it is more valuable than a lucky answer.

## The techniques that recur

**Start with a smaller case.** Almost always productive.

**Work backwards from the goal.**

**Look for an invariant** — something that never changes regardless of the moves available. Many
puzzles collapse immediately once it is identified.

**Consider parity.** Odd and even, which resolves a surprising number of them.

## The honest position on these questions

**They are of contested value and some strong companies have stopped using them.** If you meet one,
treat it as a process demonstration rather than a knowledge test, because that is what it measures
in practice whatever its intent.

## What loses marks

**Going silent.** **Guessing without reasoning.** **And giving up**, which is different from
reaching a dead end and saying what you would try next.`,
    mcqs: [
      mcq('A puzzle question assesses the same thing as a coding question, delivered differently, namely whether you:',
        [['Approach an unfamiliar problem systematically', true],
         ['Have encountered that puzzle before', false],
         ['Can perform arithmetic under pressure', false],
         ['Know the standard puzzle categories', false]],
        'Both observe the method for attacking something unfamiliar, which is why the behaviour that works is the same in each.'),
      mcq('Reaching a dead end and describing what you will try instead is described as:',
        [['More valuable than a lucky answer', true],
         ['An admission that should be avoided', false],
         ['Acceptable only after several attempts', false],
         ['Equivalent to giving up on the question', false]],
        'It demonstrates the systematic approach the question measures, where an unexplained correct answer demonstrates nothing transferable.'),
    ],
    checkpoint: [
      mcq('Among the recurring techniques, the one described as resolving a surprising number of puzzles is:',
        [['Considering parity — odd and even', true],
         ['Working backwards from the goal', false],
         ['Starting with a smaller case first', false],
         ['Enumerating all the possible states', false]],
        'Many puzzles hinge on a quantity whose oddness or evenness cannot change, which immediately rules out the target configuration.'),
      mcq('The honest position offered is that these questions are of contested value and:',
        [['Some strong companies have stopped using them', true],
         ['They correlate well with job performance', false],
         ['They are being replaced by coding rounds', false],
         ['They appear mainly in graduate hiring', false]],
        'Their predictive value is disputed, so the practical advice is to treat one as a process demonstration rather than as a knowledge test.'),
    ],
  },
  {
    unitCode: 'T4_AP_REASONING_CHECKPOINT',
    notes: `**Whether reasoning is at drive speed.**

## The bar

**Twenty-five questions in twenty-five minutes, at least seventeen correct**, with the fast types
banked before any arrangement is started.

## What a weak result means

**Series and analogies slow**: the five checks are not automatic. **Differences, ratios, squares,
alternating, positional** — drilled until they are applied in sequence without thinking, which is a
few sessions.

**Coding and relations wrong**: notation. The alphabet was not written down, or the family tree was
held mentally. **This is a procedural fix, not a knowledge one**, and it closes immediately.

**Syllogisms wrong**: the necessary-against-possible distinction. Venn diagrams on twenty
questions, deliberately, until "possibly true" stops feeling like "follows".

**Arrangements unfinished**: selection. They were started too early.

## The pattern across all four

**Almost every failure here is procedural rather than intellectual** — a notation not written, an
order not chosen, a check not applied in sequence. That is unusual among the module's topics and it
means the improvements are fast and specific.

## What this feeds

**The reasoning section of every drive**, and **P23's simulation**.

**And, more loosely, the puzzle round** where one still appears — where the same systematic
approach is what is being watched.`,
    checkpoint: [
      mcq('Almost every failure in reasoning is described as procedural rather than intellectual, meaning:',
        [['A notation not written or an order not chosen', true],
         ['A gap in the underlying mathematics used', false],
         ['Insufficient exposure to the question types', false],
         ['An inability to work quickly under pressure', false]],
        'The fixes are writing the alphabet down, drawing the tree, and sequencing the checks, none of which requires new knowledge.'),
      mcq('Syllogism errors are addressed by drawing Venn diagrams on twenty questions deliberately, until:',
        [['"Possibly true" stops feeling like "follows"', true],
         ['The standard forms are memorised fully', false],
         ['The diagrams can be drawn more quickly', false],
         ['Every premise combination is recognised', false]],
        'Everyday reasoning accepts the plausible, so the habit has to be replaced by repeated mechanical application of the counterexample test.'),
      mcq('Coding and relation errors are described as a procedural fix rather than a knowledge one, which closes:',
        [['Immediately', true],
         ['Over several weeks of practice', false],
         ['Only with substantial repetition', false],
         ['After the underlying rules are learned', false]],
        'Writing the alphabet or drawing the tree is a decision that can be adopted at once, so the improvement does not require learning.'),
      mcq('The bar requires the fast types banked before any arrangement is started because an unfinished arrangement:',
        [['Scores nothing', true],
         ['Carries a negative marking penalty', false],
         ['Takes longer than the other types combined', false],
         ['Cannot be returned to once abandoned', false]],
        'Partial progress on an arrangement earns no marks, so time spent there before securing the quick questions is time at risk.'),
    ],
  },

  /* ══ T4_AP_VERBAL ═══════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_AP_VERBAL_GRAMMAR_AND_CORRECTION',
    notes: `**The six mistakes that account for most of the questions**, and how to see them
quickly.

## Subject-verb agreement

**The most tested, and the trap is distance.** "The list of items *is* on the table" — the subject
is the list, not the items, and the intervening phrase is there to mislead.

**Find the subject by removing the prepositional phrases**, then check the verb against what
remains.

## Tense consistency

**A sentence that starts in the past stays in the past** unless there is a reason. Mixed tenses
within one action are the error.

## Pronoun reference

**A pronoun must refer to exactly one clear noun.** "When John met Peter, he was tired" is
ambiguous, and ambiguity is the error being tested.

## Modifier placement

**A modifier attaches to what it is next to.** "Walking to the station, the rain started" says the
rain was walking — the dangling modifier, and it is a favourite.

## Parallel structure

**Items in a list take the same grammatical form.** "She likes reading, writing and to paint" fails
on the third.

## Comparisons

**Compare like with like.** "His salary is higher than his colleague" compares a salary to a
person; it should be to his colleague's.

## The method under time

**Read the sentence and let the error surface.** Most are audible to a reader with reasonable
English, and hunting rule by rule is slower.

**If nothing surfaces, run the six checks in order**, which takes about fifteen seconds.

**And "no error" is a real option** that appears and is under-selected, because candidates assume
something must be wrong.`,
    mcqs: [
      mcq('"The list of items ___ on the table" takes "is" because the subject is:',
        [['The list, not the items', true],
         ['Items, which is nearest the verb', false],
         ['Both, so either verb is acceptable', false],
         ['Ambiguous without further context', false]],
        'The prepositional phrase modifies the subject without changing it, and the distance between them is what the question exploits.'),
      mcq('"Walking to the station, the rain started" is an error because the modifier attaches to:',
        [['What it is next to, which is the rain', true],
         ['The verb rather than to any noun', false],
         ['The whole sentence rather than a part', false],
         ['Nothing, leaving it grammatically isolated', false]],
        'The opening phrase describes the subject that follows it, so the sentence states that the rain was walking.'),
    ],
    checkpoint: [
      mcq('"His salary is higher than his colleague" fails because it compares:',
        [['A salary to a person', true],
         ['Two things of the same type wrongly', false],
         ['A possessive to a non-possessive form', false],
         ['Present tense against past tense usage', false]],
        'The comparison must be between comparable things, so it should be to his colleague’s salary rather than to the colleague.'),
      mcq('"No error" is described as a real option that is under-selected because candidates:',
        [['Assume something must be wrong', true],
         ['Run out of time before considering it', false],
         ['Are told it appears less frequently', false],
         ['Find the sentences difficult to parse', false]],
        'The framing of the question implies an error exists, so correct sentences are rejected in favour of a plausible but invalid correction.'),
    ],
  },
  {
    unitCode: 'T4_AP_VERBAL_COMPREHENSION',
    notes: `**Reading for the question rather than for the passage.**

## The approach that saves the most time

**Read the questions first.** Then read the passage knowing what you are looking for.

**This is contested advice and it is right for these papers specifically**, because the questions
are overwhelmingly about locating information rather than about understanding the argument as a
whole.

## The question types

**Direct retrieval.** The answer is in the passage. Find it, and do not improve on it.

**Inference.** Not stated and necessarily implied. **The distinction from direct retrieval is
where the errors are** — an option that is true in the world and not supported by this passage is
wrong.

**Vocabulary in context.** A word's meaning here, which may not be its usual one. **Substitute each
option into the sentence** rather than choosing from memory.

**Tone or purpose.** Why the author wrote it. The options are usually distinguishable by strength —
"criticise" against "question" — and the correct answer is nearly always the more moderate one.

**Main idea.** The whole passage, not the first paragraph, and not the most interesting detail.

## The rule for every option

**Can I point at the line that supports this?**

**If not, it is wrong, however reasonable it sounds.** The most common error on this topic is
selecting an option that is true and unsupported, and this single question eliminates it.

## Under time

**Do not read for interest.** These passages are frequently dull and the temptation to engage with
the argument costs minutes.

**Skim for structure first** — what each paragraph is about — and then locate.`,
    mcqs: [
      mcq('The rule for evaluating every option is whether you can point at the line that supports it, because the most common error is selecting an option that is:',
        [['True and unsupported by the passage', true],
         ['Supported but not the best answer given', false],
         ['Stated directly rather than implied', false],
         ['Contradicted by a later paragraph', false]],
        'General knowledge makes plausible options attractive, and the requirement is support from this text rather than truth in the world.'),
      mcq('For tone or purpose questions, the options are usually distinguishable by strength and the correct answer is nearly always:',
        [['The more moderate one', true],
         ['The one matching the opening line', false],
         ['The strongest available description', false],
         ['The one using the author’s own words', false]],
        'Passages in these papers rarely take extreme positions, so words like "criticise" overstate where "question" fits the text.'),
    ],
    checkpoint: [
      mcq('Reading the questions first is described as contested advice that is right for these papers specifically because the questions are overwhelmingly about:',
        [['Locating information rather than understanding the argument', true],
         ['Vocabulary rather than comprehension of content', false],
         ['Inference rather than direct retrieval of facts', false],
         ['The structure rather than the substance of the text', false]],
        'Where the task is retrieval, knowing the target before reading converts a full comprehension into a directed search.'),
      mcq('For vocabulary-in-context questions the technique is to substitute each option into the sentence rather than:',
        [['Choosing from memory of the usual meaning', true],
         ['Consulting the surrounding paragraphs first', false],
         ['Eliminating options by part of speech', false],
         ['Selecting the most formal alternative given', false]],
        'The word may carry a meaning specific to this passage, so the test is whether the substitution works here rather than what it usually means.'),
    ],
  },
  {
    unitCode: 'T4_AP_VERBAL_TIMED_SET',
    notes: `**Twenty-five verbal questions, twenty minutes.**

## The composition

**Typically two passages with five questions each, and fifteen discrete questions** — error
spotting, sentence completion, para-jumbles, vocabulary.

## The order

**Discrete questions first.** They are fast, independent, and each is worth the same as a
comprehension question that takes three times as long.

**Then the shorter passage.** Then the longer one, if time remains.

**Most candidates start with the passages**, because they appear first, and spend half the section
on a third of the marks.

## Para-jumbles

**Find the opening sentence** — it introduces without referring back. Then look for links: a
pronoun referring to a previous noun, a connective, a chronology.

**Fix the pairs you are certain of** and use the options to eliminate. **Frequently two sentences
are obviously adjacent**, and that pair alone rules out most of the options without solving the
whole thing.

## Sentence completion

**Read the whole sentence before looking at the options**, and predict what fits. Then find the
option closest to the prediction.

**The connective is the key** — "although" signals contrast, "moreover" signals continuation — and
it frequently determines the answer without reading the options at all.

## After the set

**Separate vocabulary failures from reasoning failures.**

**Vocabulary is the slowest thing in the module to improve** and is worth knowing about early;
reasoning failures on comprehension respond quickly to the "point at the line" discipline.`,
    mcqs: [
      mcq('Most candidates start with the passages because they appear first, and consequently spend:',
        [['Half the section on a third of the marks', true],
         ['Too little time on the discrete questions', false],
         ['The available time evenly across the types', false],
         ['Longer on vocabulary than is warranted', false]],
        'Comprehension questions take several times as long as discrete ones for the same mark, so the presented order is the wrong order of attempt.'),
      mcq('In para-jumbles, fixing a pair of obviously adjacent sentences is useful because that pair alone:',
        [['Rules out most of the options', true],
         ['Determines the opening sentence too', false],
         ['Completes the sequence in most cases', false],
         ['Identifies which connectives are used', false]],
        'The answer options are full orderings, so a single confirmed adjacency eliminates every option that does not contain it.'),
    ],
    checkpoint: [
      mcq('In sentence completion, the connective frequently determines the answer without:',
        [['Reading the options at all', true],
         ['Understanding the sentence’s subject', false],
         ['Knowing the vocabulary being tested', false],
         ['Considering the tense being used', false]],
        '"Although" requires a contrast and "moreover" a continuation, which constrains the missing word before any option is considered.'),
      mcq('Vocabulary is described as the slowest thing in the module to improve, which is worth knowing early because it:',
        [['Determines how the limited time is allocated', true],
         ['Means it should be excluded from practice', false],
         ['Suggests the topic is not worth attempting', false],
         ['Implies the other topics are equally slow', false]],
        'Effort placed where gains are slow displaces effort from topics that improve quickly, so the distinction directs the weekly practice.'),
    ],
  },
  {
    unitCode: 'T4_AP_VERBAL_INTERVIEW_QUESTION',
    notes: `**Written English, assessed continuously and never announced.**

## Where verbal ability is actually judged

**Not in a verbal round.** In your resume, your emails, your commit messages, your documentation,
and the written exercise some companies set.

**And the judgement is binary and unspoken:** either the writing reads as professional or it does
not, and nobody tells you which.

## What is actually noticed

**Errors that suggest carelessness rather than ignorance.** A typo in a resume, inconsistent
capitalisation, a sentence that does not parse. **These are read as evidence about attention
rather than about English**, which is why they cost more than their size suggests.

**Overlong sentences.** A reader who has to re-read is a reader you have inconvenienced.

**And register.** An email that is too casual, or a resume written in an inflated style, both read
as misjudging the audience.

## The written exercise

**Some companies set one** — explain a technical concept, or write a short document. **It is
assessed on clarity rather than on vocabulary**, and simple direct sentences outperform elaborate
ones reliably.

**Structure first: what it is, why it matters, how it works.** Then write plainly.

## The practical preparation

**Read your resume aloud.** Errors that are invisible on screen are audible immediately, and it
takes four minutes.

**And have somebody else read it**, because you cannot proofread your own writing reliably — you
see what you intended, which is the same failure as reviewing your own code.

## What this means for the aptitude drills

**The verbal section trains the underlying accuracy**, and this is where it is spent. A candidate
who scores well on error-spotting and sends an email with three mistakes has not transferred it,
and the transfer is the point.`,
    mcqs: [
      mcq('Errors suggesting carelessness rather than ignorance cost more than their size suggests because they are read as evidence about:',
        [['Attention rather than about English', true],
         ['The candidate’s educational background', false],
         ['How quickly the document was prepared', false],
         ['Whether the role requires strong writing', false]],
        'A typo in a resume implies the same inattention would appear in work, which is a broader inference than one about language ability.'),
      mcq('A written exercise set by a company is assessed on clarity rather than vocabulary, so:',
        [['Simple direct sentences outperform elaborate ones', true],
         ['Technical terminology should be avoided entirely', false],
         ['Length is the main determinant of the score', false],
         ['Formal register is preferred in every case', false]],
        'The purpose is conveying something to a reader, and elaboration adds effort for them without adding information.'),
    ],
    checkpoint: [
      mcq('You cannot proofread your own writing reliably because you see what you intended, which is described as the same failure as:',
        [['Reviewing your own code', true],
         ['Estimating your own project timelines', false],
         ['Assessing your own interview performance', false],
         ['Judging the difficulty of your own work', false]],
        'In both cases memory of the intention substitutes for what is actually there, so the discrepancy remains invisible to the author.'),
      mcq('A candidate scoring well on error-spotting who sends an email with three mistakes has not:',
        [['Transferred it, and the transfer is the point', true],
         ['Practised the relevant question types enough', false],
         ['Understood the grammar rules being tested', false],
         ['Allowed sufficient time to check their work', false]],
        'The drill exists to produce accurate writing in use, so performance confined to the test format has not achieved what it was for.'),
    ],
  },
  {
    unitCode: 'T4_AP_VERBAL_CHECKPOINT',
    notes: `**Whether verbal ability is at drive speed, and whether it transfers.**

## The bar

**Twenty-five questions in twenty minutes, at least sixteen correct**, with the discrete questions
attempted before the passages.

**And a resume and one professional email with no errors**, which is the transfer test and the one
that actually matters.

## What a weak result means

**Grammar wrong**: the six checks are not automatic. Agreement, tense, pronoun, modifier,
parallelism, comparison. **A short list, drillable in a few sessions.**

**Comprehension wrong**: the "point at the line" discipline is missing, and options that are true
but unsupported are being selected.

**Not finishing**: order. The passages were attempted first.

**Vocabulary**: the slowest to improve, and worth accepting rather than fighting. **Reading widely
helps over months and nothing helps over weeks**, so the realistic response is to maximise the
other three and treat vocabulary questions as ones to guess after eliminating.

## The transfer test

**A clean resume and a clean email.** If the section score is good and the resume has three errors,
the drill has not transferred, and **the transfer is the only part of this topic that affects
anything outside a test**.

## What this feeds

**The verbal section of every drive**, **P23's simulation**, and — continuously and invisibly —
every written thing a recruiter or an interviewer sees.`,
    checkpoint: [
      mcq('Vocabulary is described as worth accepting rather than fighting, with the realistic response being to:',
        [['Maximise the other three and guess after eliminating', true],
         ['Memorise word lists in the weeks available', false],
         ['Skip the vocabulary questions entirely', false],
         ['Prioritise it because it appears frequently', false]],
        'Reading widely helps over months and nothing helps over weeks, so effort is better placed where gains are achievable in the time.'),
      mcq('The transfer test is a clean resume and a clean email, and it is described as:',
        [['The only part of this topic affecting anything outside a test', true],
         ['A supplementary check on the section score', false],
         ['Less important than the timed performance', false],
         ['Equivalent to the grammar questions in form', false]],
        'The section score matters for one round, while written accuracy is judged continuously in every document a recruiter sees.'),
      mcq('If the section score is good and the resume has three errors, the conclusion is that:',
        [['The drill has not transferred', true],
         ['The resume was written before the practice', false],
         ['The section was easier than the real paper', false],
         ['Proofreading rather than grammar is the gap', false]],
        'Accuracy demonstrated in the test format and absent in use means the capability has not reached the situation it was meant for.'),
      mcq('Not finishing the verbal section points at order, meaning:',
        [['The passages were attempted first', true],
         ['Too long was spent on each discrete question', false],
         ['Vocabulary questions were not skipped', false],
         ['The reading speed is below what is needed', false]],
        'Comprehension takes several times as long per mark, so attempting it first consumes the time the faster questions needed.'),
    ],
  },
];
