/**
 * T_STATS — the complete topic, ten units. DIRECTION: AI_ML and DATA.
 *
 * ── WHY THIS TOPIC ────────────────────────────────────────────────────────────────────────
 *
 * The two strong profiles verify every universal skill, so no UNIVERSAL unit is suitable for
 * them at all — CONCEPT and PRACTICE both stop serving VERIFIED. The only inventory that can
 * reach them is DIRECTION material teaching skills they have never met, and post-mastery types.
 * This topic supplies ten direction units for AI_ML and DATA, which both strong profiles sample.
 *
 * ── THE LINE THIS TOPIC HOLDS ─────────────────────────────────────────────────────────────
 *
 * Statistics for first-years usually becomes formula drill, which produces students who can
 * compute a standard deviation and cannot say whether a claim is supported. Every unit here is
 * built around a DECISION the number informs, and the misleading unit is deliberately the
 * climax rather than an afterthought — because the commonest professional use of statistics is
 * noticing when somebody else's number does not mean what they say it means.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const STATS_BUNDLES: PilotBundle[] = [
  {
    unitCode: 'T_STATS_WHY_STATS',
    notes: `Statistics is what you reach for the moment you have more data than you can look at.
That happens immediately in computing, and it happens whether or not anybody calls it data
science.

**Where it turns up in ordinary work:**

- **Performance.** "The API takes 200ms" is an average, and an average hides the request that
  took nine seconds. The number that matters is usually a percentile.
- **A/B testing.** Version B converted 12% against A's 10%. Is that a real difference or noise?
  Without statistics you cannot tell, and shipping on noise is common.
- **Monitoring.** "Errors are up" means up relative to normal variation. Defining normal is a
  statistical question.
- **Machine learning.** Entirely built on it — but the everyday uses above matter more to more
  people.
- **Reading anybody else's claim.** The most valuable use, and the one this topic is really
  for.

**The distinction to hold on to.** Statistics gives you two different things:

1. **Description** — summarising what you have. The average, the spread, the shape.
2. **Inference** — concluding something about what you do NOT have, from a sample.

Description is arithmetic and is hard to get wrong. Inference is where every mistake lives,
because it makes a claim beyond the data.

**The honest framing for this topic.** You will not become a statistician in ten units. You
will become someone who can read a claim and ask the three questions that matter: how was this
measured, how many, and what is being compared with what. That is most of the practical value,
and most people never acquire it.

**A first example, to make it concrete.** Two servers, average response 200ms each. Server A
ranges 190-210. Server B is usually 50ms and occasionally 2 seconds. Identical averages,
completely different systems, and only one of them has a problem. The average did not lie — it
simply did not contain the information you needed.`,
    mcqs: [
      mcq('Two servers both average 200ms. What can you conclude?',
        [['Very little — the spread could be tiny or enormous', true],
          ['They perform identically', false],
          ['Both are acceptable', false],
          ['One is faster', false]],
        'The canonical reason an average alone is insufficient: it cannot distinguish steady from wildly variable.'),
      mcq('Description and inference differ how?',
        [['Description summarises what you have; inference claims something about what you do not', true],
          ['Description is for small data', false],
          ['Inference is more accurate', false],
          ['They are the same', false]],
        'Nearly every statistical mistake is an inference mistake, because that is where a claim extends beyond the data.'),
      mcq('For API latency, which is usually more useful than the mean?',
        [['A high percentile, such as p95 or p99', true],
          ['The mode', false], ['The range', false], ['The total', false]],
        'The mean hides the slow tail, and the slow tail is what users actually complain about.'),
      mcq('The most broadly valuable use of statistics for a developer is:',
        [['Reading somebody else\'s claim critically', true],
          ['Building models', false],
          ['Computing averages', false],
          ['Drawing charts', false]],
        'Most people never acquire it, and it needs only three questions: how measured, how many, compared with what.'),
    ],
    checkpoint: [
      mcq('Which question is NOT one of the three worth asking of any statistical claim?',
        [['Which software produced it', true],
          ['How was it measured', false],
          ['How many observations', false],
          ['What is being compared with what', false]],
        'The tool is irrelevant to whether the claim is supported. The other three decide it.'),
      mcq('Where do most statistical errors occur?',
        [['In inference — claims made beyond the data collected', true],
          ['In arithmetic', false],
          ['In charting', false],
          ['In data entry', false]],
        'Description is arithmetic and hard to get wrong. Inference is a judgement, and that is where the mistakes live.'),
    ],
  },
  {
    unitCode: 'T_STATS_CENTRE',
    notes: `Three different "averages", each answering a different question. Choosing the wrong one
is how a true number tells a false story.

**Mean** — add everything, divide by the count. Uses every value, which is its strength and its
weakness: one extreme value drags it.

**Median** — sort, take the middle. Half are above, half below. Unaffected by how extreme the
extremes are.

**Mode** — the most frequent value. The only one that works on categories.

**The example that makes the difference concrete.** Salaries at a ten-person startup:

    30k, 32k, 33k, 35k, 36k, 38k, 40k, 42k, 45k, 800k

- **Mean: 113k.** True, and describes nobody. Nine of ten earn far less.
- **Median: 37k.** Describes the typical employee accurately.
- **Mode:** none repeats; unhelpful here.

Both numbers are correct arithmetic. Reporting the mean is how a recruiter makes a company
sound generous without lying — and recognising the move is exactly the skill this topic is for.

**Which to use:**

| Use | When |
|---|---|
| Mean | Roughly symmetric data, no extreme outliers |
| Median | Skewed data — income, house prices, response times |
| Mode | Categories, or the commonest value specifically |

**In computing, prefer the median by default**, because most measurements you care about are
skewed. Response times have a floor and no ceiling: they cannot be faster than physics allows
and can be arbitrarily slow. That asymmetry means the mean is always pulled upward by the tail.

**The rule of thumb.** If mean and median are close, the data is roughly symmetric and either
works. If they are far apart, the data is skewed — and the gap between them is itself
information worth reporting.`,
    mcqs: [
      mcq('Nine salaries near 35k and one at 800k. Which describes a typical employee?',
        [['The median, 37k', true], ['The mean, 113k', false], ['The mode', false], ['The range', false]],
        'Both are correct arithmetic. The mean is how a company sounds generous without lying, and recognising the move is the skill.'),
      mcq('Why prefer the median for response times?',
        [['They are skewed — a floor but no ceiling — so the mean is pulled up by the tail', true],
          ['The median is easier to compute', false],
          ['The mean is invalid for time', false],
          ['They are always symmetric', false]],
        'The asymmetry is structural rather than accidental: nothing can be faster than physics, and anything can be slow.'),
      mcq('The mode is the only average that works for:',
        [['Categories, such as the most common browser', true],
          ['Skewed numeric data', false],
          ['Large datasets', false],
          ['Time series', false]],
        'You cannot take the mean of "Chrome, Firefox, Safari", which is why the mode exists at all.'),
      mcq('Mean and median are far apart. What does that tell you?',
        [['The data is skewed, and the gap is itself worth reporting', true],
          ['One was computed wrongly', false],
          ['The sample is too small', false],
          ['Nothing', false]],
        'A cheap diagnostic that needs no extra data and immediately says which average to trust.'),
    ],
    checkpoint: [
      mcq('A company reports mean salary 113k and median 37k. What is happening?',
        [['A small number of very high earners are pulling the mean up', true],
          ['An arithmetic error', false],
          ['Most people earn about 75k', false],
          ['The sample is too small', false]],
        'The gap is the signature of skew, and here it is the whole story.'),
      mcq('Which average is most affected by a single extreme value?',
        [['The mean', true], ['The median', false], ['The mode', false], ['All equally', false]],
        'It uses every value, which is exactly why one outlier moves it and neither of the others.'),
    ],
  },
  {
    unitCode: 'T_STATS_SPREAD',
    notes: `An average tells you where the data sits. Spread tells you how much you can rely on
that, and it is very often the more useful number.

**Range** — largest minus smallest. Simple, and determined entirely by the two most extreme
values, so one freak observation defines it.

**Variance** — the average squared distance from the mean. Squaring makes everything positive
and weights distant points heavily. Its units are squared, which makes it awkward to talk about:
the variance of a set of seconds is in seconds-squared.

**Standard deviation** — the square root of the variance, which puts it back into the original
units. This is the one to report.

**How to read a standard deviation.** For roughly bell-shaped data:

- About **68%** of values fall within one SD of the mean
- About **95%** within two
- About **99.7%** within three

So "mean 200ms, SD 10ms" means almost everything lands between 170 and 230. "Mean 200ms, SD
400ms" means the data is wild and the mean is nearly meaningless.

**This is the pair that makes the two-server example resolvable:**

    Server A: mean 200ms, SD 5ms      -- consistent, predictable
    Server B: mean 200ms, SD 350ms    -- usually fast, sometimes terrible

Same mean. Reporting the mean alone loses the entire difference, which is why **an average
without a spread is an incomplete statement**.

**Coefficient of variation** — SD divided by the mean — lets you compare variability between
things measured on different scales. An SD of 10 is small for something averaging 1000 and
enormous for something averaging 12.

**A caution.** SD assumes the data is roughly symmetric to be interpretable that way. For
heavily skewed data — response times again — percentiles are more honest: "p50 45ms, p95 300ms,
p99 2s" says exactly what happens without assuming a shape the data does not have.`,
    mcqs: [
      mcq('Why report standard deviation rather than variance?',
        [['SD is in the original units; variance is in units squared', true],
          ['SD is more accurate', false],
          ['Variance is harder to compute', false],
          ['They are the same', false]],
        'Seconds-squared is not a quantity anybody can reason about, which is the whole reason for taking the square root.'),
      mcq('Mean 200ms, SD 350ms. What does that indicate?',
        [['Highly variable data where the mean says little', true],
          ['Consistent performance', false],
          ['An arithmetic error', false],
          ['Most requests take 350ms', false]],
        'An SD larger than the mean is a strong signal that the distribution is not what the mean suggests.'),
      mcq('For roughly bell-shaped data, about what fraction lies within two SDs?',
        [['95%', true], ['68%', false], ['99.7%', false], ['50%', false]],
        'The 68-95-99.7 rule, and it is what makes an SD interpretable rather than an abstract number.'),
      mcq('For heavily skewed response times, what is more honest than mean and SD?',
        [['Percentiles such as p50, p95 and p99', true],
          ['The range', false],
          ['The mode', false],
          ['A larger sample', false]],
        'They describe what actually happens without assuming a symmetric shape the data does not have.'),
    ],
    checkpoint: [
      mcq('An average reported without any measure of spread is:',
        [['An incomplete statement — it cannot distinguish steady from wildly variable', true],
          ['Sufficient for most purposes', false],
          ['Wrong', false],
          ['Fine if the sample is large', false]],
        'The two-server case is the standard demonstration: identical means, entirely different systems.'),
      mcq('Why does the coefficient of variation exist?',
        [['To compare variability between quantities measured on different scales', true],
          ['To replace the SD', false],
          ['To handle skew', false],
          ['To compute percentiles', false]],
        'An SD of 10 is trivial against a mean of 1000 and enormous against a mean of 12.'),
    ],
  },
  {
    unitCode: 'T_STATS_DISTRIBUTIONS',
    notes: `A distribution is the shape of the data — how values are spread across the range. Shape
determines which summaries are meaningful, which is why it is worth looking at before computing
anything.

**Normal (bell-shaped).** Symmetric, most values near the middle, tails thinning evenly. Heights,
measurement errors, sums of many independent small effects. Mean and SD describe it completely,
and the 68-95-99.7 rule applies.

**"Normal" is a technical word, not a value judgement.** Data that is not normal is not
abnormal. Most data in computing is not normal, and that is the ordinary case rather than a
problem.

**Skewed.** A long tail one side. **Right-skewed** — most values low, a few very high — covers
income, file sizes, response times, and almost everything with a floor at zero and no ceiling.
Here mean > median, and the median is the honest summary.

**Uniform.** Every value equally likely. Dice, a good random number generator. Rare in nature
and common in things we build.

**Bimodal — two peaks — is the one worth spotting**, because it usually means you have mixed two
populations. Response times with peaks at 50ms and 3s are probably cache hits and cache misses.
The average of 1.5s describes neither, and the useful action is to separate them rather than to
summarise them together.

**Why the shape must come first.** Every summary assumes something:

- Mean and SD assume roughly symmetric
- The 68-95-99.7 rule assumes normal
- "Outlier beyond 3 SDs" assumes normal, and is simply wrong for skewed data, where large
  values are expected rather than anomalous

**So: plot it, or at least look at the quartiles, before summarising.** A histogram takes one
line and answers "which summary is appropriate" immediately. Computing a mean and an SD on
bimodal data produces two numbers that describe nothing real, with no indication that anything
is wrong.`,
    mcqs: [
      mcq('Response times peak at 50ms and again at 3s. What does that suggest?',
        [['Two populations mixed together — likely cache hits and misses', true],
          ['Bad measurement', false],
          ['A normal distribution', false],
          ['An outlier', false]],
        'The mean of 1.5s describes neither group, and the useful action is separating them rather than summarising together.'),
      mcq('Right-skewed data has:',
        [['Most values low with a long high tail, and mean above median', true],
          ['Most values high', false],
          ['Two peaks', false],
          ['Mean below median', false]],
        'The shape of income, file sizes and response times — anything with a floor at zero and no ceiling.'),
      mcq('"Anything beyond three standard deviations is an outlier" assumes:',
        [['A normal distribution — it is simply wrong for skewed data', true],
          ['A large sample', false],
          ['Numeric data', false],
          ['Nothing', false]],
        'On right-skewed data large values are expected, and flagging them as anomalies discards real observations.'),
      mcq('Why look at the shape before computing summaries?',
        [['Every summary assumes something about the shape, and may describe nothing if the assumption fails', true],
          ['It is faster', false],
          ['To find errors in the data', false],
          ['It is not necessary', false]],
        'A mean and an SD on bimodal data are two numbers describing nothing real, with nothing to indicate a problem.'),
    ],
    checkpoint: [
      mcq('Data is not normally distributed. What follows?',
        [['Nothing is wrong — most real data is not normal', true],
          ['The data is faulty', false],
          ['A larger sample is needed', false],
          ['It cannot be analysed', false]],
        '"Normal" is a technical description of a shape, not a standard the data is failing to meet.'),
      mcq('The cheapest first step with an unfamiliar dataset is:',
        [['Plot a histogram, or look at the quartiles', true],
          ['Compute the mean', false],
          ['Remove outliers', false],
          ['Compute the standard deviation', false]],
        'One line, and it tells you which of the other three are even meaningful.'),
    ],
  },
  {
    unitCode: 'T_STATS_PROBABILITY',
    notes: `Probability measures how likely something is, from 0 (never) to 1 (certain). The
arithmetic is easy; the intuition is not, and the mistakes are extremely consistent.

**The basics:**

- P(A) between 0 and 1
- P(not A) = 1 − P(A)
- **Independent** events: P(A and B) = P(A) × P(B)
- **Mutually exclusive** events: P(A or B) = P(A) + P(B)

**The three mistakes everybody makes.**

**1. The gambler's fallacy.** A fair coin has come up heads five times. The next toss is still
50/50. The coin has no memory and no obligation to even out. Believing otherwise is universal
and completely wrong.

**2. Assuming independence that is not there.** \`P(A and B) = P(A) × P(B)\` holds ONLY when the
events are independent. Two servers in the same rack failing are not independent — they share
power, cooling and a network switch. Multiplying their individual failure probabilities gives a
comfortingly small number that has nothing to do with reality. **This is not a textbook
subtlety; it is how redundancy plans fail.**

**3. Ignoring the base rate.** Covered properly in the next unit, and it is the largest error of
the three.

**The birthday problem, because it recalibrates intuition.** In a room of 23 people, the
probability that two share a birthday is about 50%. Almost nobody guesses anywhere near that.
The reason: there are 253 *pairs* among 23 people, not 23 comparisons. The question is about
pairs, and pairs grow quadratically. **The lesson generalises — when something seems
surprisingly likely, count the opportunities rather than the participants.**

**Where this matters in computing.** Hash collisions follow exactly the birthday argument, which
is why a 32-bit hash collides far sooner than people expect. "One in a million" failures happen
constantly at scale: a million requests a day means one every day.`,
    mcqs: [
      mcq('A fair coin lands heads five times. P(heads) next toss is:',
        [['0.5 — the coin has no memory', true], ['Less than 0.5', false], ['More than 0.5', false], ['Unknowable', false]],
        'The gambler\'s fallacy. Universal, and completely wrong: there is no mechanism by which past tosses influence the next.'),
      mcq('When is `P(A and B) = P(A) × P(B)` valid?',
        [['Only when A and B are independent', true],
          ['Always', false], ['When both are unlikely', false], ['For mutually exclusive events', false]],
        'Two servers in one rack share power, cooling and a switch. Multiplying gives a comforting number unrelated to reality.'),
      mcq('In a room of 23, the chance two share a birthday is about:',
        [['50%', true], ['6%', false], ['23%', false], ['90%', false]],
        'There are 253 pairs among 23 people. Count the opportunities rather than the participants.'),
      mcq('"One in a million" failures at a million requests a day means:',
        [['Roughly one every day', true], ['Effectively never', false], ['Once a year', false], ['Once a million days', false]],
        'Scale converts negligible probabilities into daily operational facts, which is why rare cases still need handling.'),
    ],
    checkpoint: [
      mcq('Your redundancy plan multiplies two servers\' failure probabilities. What is the risk?',
        [['They are not independent, so the real joint probability is much higher', true],
          ['The arithmetic is wrong', false],
          ['Probabilities cannot be multiplied', false],
          ['No risk', false]],
        'Shared power, cooling and network make correlated failure the normal case, and it is how redundancy plans fail in practice.'),
      mcq('Hash collisions occur sooner than expected because of:',
        [['The birthday argument — pairs grow quadratically', true],
          ['Poor hash functions', false],
          ['Insufficient entropy', false],
          ['Implementation bugs', false]],
        'Exactly the same counting argument, which is why a 32-bit hash is inadequate far earlier than intuition suggests.'),
    ],
  },
  {
    unitCode: 'T_STATS_CONDITIONAL',
    notes: `Conditional probability is the probability of A **given that** B has happened, written
P(A|B). It is where most real reasoning about evidence happens, and where the most expensive
mistake in applied statistics lives.

**It is not symmetric.** P(A|B) and P(B|A) are different numbers, often wildly:

- P(has four legs | is a dog) is about 1
- P(is a dog | has four legs) is small — cats, tables, horses

Confusing the two is called the **prosecutor's fallacy**, and it has produced real wrongful
convictions.

**The medical-test example, which is the one to internalise.**

A disease affects 1 in 1,000 people. A test is 99% accurate — it correctly identifies 99% of
sick people and correctly clears 99% of healthy people. You test positive. What is the chance
you are ill?

Most people say 99%. The answer is about **9%**.

Work it through on 100,000 people:

- **100 are ill.** The test catches 99 of them. → 99 true positives
- **99,900 are healthy.** The test wrongly flags 1% of them. → 999 false positives

Total positives: 99 + 999 = **1,098**. Of those, 99 are genuinely ill.

    99 / 1098 ≈ 9%

**Why the intuition fails.** The healthy group is so much larger that even a small error rate
produces far more false positives than the disease produces true ones. **The rarity of the
condition — the base rate — dominates the accuracy of the test**, and ignoring it is the base
rate fallacy.

**Where this bites in computing.** An anomaly detector that is 99% accurate, run against traffic
that is 99.9% benign, generates overwhelmingly false alerts. Teams then ignore the alerts, which
is a rational response to a system producing mostly noise — and the reason "our monitoring is
99% accurate" is not the reassurance it sounds like.

**The question to ask, always:** "Of everybody who gets this result, how many actually have the
condition?" Not "how accurate is the test".`,
    workedExample: `**Goal: work the base rate properly, then see it in a system you might build.**

**Spam filter.** It flags 95% of spam correctly, and wrongly flags 2% of legitimate mail. Of
1,000 incoming messages, 100 are spam.

An email is flagged. Is it spam?

Count:

- **100 spam.** 95% flagged → **95 true positives**
- **900 legitimate.** 2% flagged → **18 false positives**

Total flagged: 113. Of those, 95 are spam.

    P(spam | flagged) = 95 / 113 ≈ 84%

Reasonable, because spam is 10% of the mail — not rare.

**Now change only the base rate.** Same filter, but spam is 1% of the mail:

- **10 spam.** 95% flagged → **9.5 true positives**
- **990 legitimate.** 2% flagged → **19.8 false positives**

    P(spam | flagged) = 9.5 / 29.3 ≈ 32%

**Identical filter, and now most flagged messages are legitimate.** Nothing about the filter
changed. The base rate alone moved it from useful to actively harmful — and a user whose inbox
loses two-thirds of its flags to false positives will turn the filter off.

**The engineering consequence.** When the thing you are detecting is rare, a small false-positive
rate dominates everything. So either:

- Make the false-positive rate very much smaller than the base rate, or
- Narrow the population you test — check only mail from unknown senders, raising the base rate
  within the group you examine

The second is usually cheaper and is why real systems filter before they classify.

**The sentence to carry away:** accuracy alone tells you nothing about what a positive result
means. You need the base rate too.`,
    mcqs: [
      mcq('A 99%-accurate test for a 1-in-1000 disease returns positive. Chance you are ill?',
        [['About 9%', true], ['99%', false], ['50%', false], ['1%', false]],
        'The healthy group is so much larger that its 1% error rate produces ten times more false positives than there are true cases.'),
      mcq('P(A|B) and P(B|A) are:',
        [['Different numbers, often wildly so', true],
          ['Always equal', false],
          ['Equal when both are likely', false],
          ['Inverses', false]],
        'P(four legs | dog) is about 1; P(dog | four legs) is small. Confusing them is the prosecutor\'s fallacy.'),
      mcq('A 99%-accurate anomaly detector on 99.9% benign traffic produces:',
        [['Overwhelmingly false alerts, which teams then rationally ignore', true],
          ['Reliable alerts', false],
          ['99% accurate alerts', false],
          ['Too few alerts', false]],
        'Why "our monitoring is 99% accurate" is not the reassurance it sounds like, and why alert fatigue is a base-rate problem.'),
      mcq('Which question should you ask of a positive result?',
        [['Of everybody who gets this result, how many actually have the condition?', true],
          ['How accurate is the test?', false],
          ['What is the sample size?', false],
          ['Who made the test?', false]],
        'Accuracy alone cannot answer it. The base rate is the missing half.'),
    ],
    checkpoint: [
      mcq('A spam filter becomes useless when spam drops from 10% to 1% of mail. Why?',
        [['False positives from the much larger legitimate group now outnumber true positives', true],
          ['The filter degrades over time', false],
          ['Less training data', false],
          ['It does not', false]],
        'Nothing about the filter changed. The base rate alone moved it from useful to harmful.'),
      mcq('A practical fix when detecting something rare is:',
        [['Narrow the population tested, raising the base rate within that group', true],
          ['Increase the sample size', false],
          ['Report accuracy instead', false],
          ['Accept the false positives', false]],
        'Usually cheaper than driving the false-positive rate down, and it is why real systems filter before they classify.'),
    ],
  },
  {
    unitCode: 'T_STATS_MISLEADING',
    notes: `This unit is the point of the topic. Most statistics you meet were produced by somebody
who wants you to reach a particular conclusion, and the numbers are usually true.

**1. The sample is not the population.**

"90% of our users love the new design" — surveyed how? If it was a pop-up shown to people
already using the feature, the ones who hated it had already left. **Survivorship bias**: you
measured the people who remained.

The wartime example is the classic. Returning aircraft had bullet holes concentrated on the
wings and tail, so the instinct was to armour those. The correct conclusion was the opposite:
armour the engines, because planes hit *there* did not come back to be measured.

**Ask: who is missing from this sample, and why?**

**2. Correlation is not causation.**

Ice cream sales correlate with drowning. Neither causes the other — hot weather causes both.
That third factor is a **confounder**, and it explains a large share of published correlations.

"Students who use our app score 15% higher" — or students who were already motivated both
downloaded the app and studied more. Without a controlled comparison you cannot separate them.

**3. The chart is doing the work.**

- A y-axis not starting at zero turns a 2% change into a cliff
- A truncated x-axis hides the period that contradicts the story
- 3D pie charts distort the segment nearest the viewer
- Different scales on a dual axis can make any two lines appear related

**Always look at the axes before the shape.**

**4. The comparison is chosen.**

"Sales up 40%" — since when? Since last month, or since the worst month in five years?
**Cherry-picked baselines are the commonest manipulation of all** because they require no
dishonest number at all.

**5. The measure is not the thing.**

"Engagement up 30%" measures engagement, which may mean people cannot find what they need.
Optimising a proxy until it stops corresponding to what you cared about is routine, and the
number keeps rising while the thing it stood for gets worse.

**The five questions**, worth memorising, because they cover almost everything:

1. Who is in the sample, and who is missing?
2. Compared with what, and over what period?
3. Correlation, or is causation actually established?
4. What do the axes do?
5. Does the measure still correspond to the thing anybody cares about?`,
    mcqs: [
      mcq('Returning aircraft show damage on wings and tail. Where should armour go?',
        [['The engines — planes hit there did not return to be counted', true],
          ['The wings and tail', false],
          ['Everywhere equally', false],
          ['The cockpit', false]],
        'Survivorship bias in its clearest form: the sample excludes exactly the cases that mattered most.'),
      mcq('Ice cream sales correlate with drownings because:',
        [['Hot weather causes both — it is a confounder', true],
          ['Ice cream causes drowning', false],
          ['Coincidence', false],
          ['Swimmers buy ice cream', false]],
        'A third factor driving both is the ordinary explanation for a large share of published correlations.'),
      mcq('"Sales up 40%" is most suspicious because:',
        [['The baseline is unstated and may have been chosen', true],
          ['40% is implausible', false],
          ['Sales cannot be measured', false],
          ['It lacks a chart', false]],
        'The commonest manipulation of all, because it requires no dishonest number — only a chosen starting point.'),
      mcq('"Engagement up 30%" may be bad news because:',
        [['Higher engagement can mean users cannot find what they need', true],
          ['Engagement cannot be measured', false],
          ['30% is too high', false],
          ['It is always bad news', false]],
        'A proxy optimised until it stops corresponding to the thing anybody cared about, with the number still rising.'),
    ],
    checkpoint: [
      mcq('A survey shows 90% satisfaction, taken via a pop-up to current users. The flaw is:',
        [['Dissatisfied users had already left and were never asked', true],
          ['The sample is too small', false],
          ['Pop-ups are unreliable', false],
          ['No flaw', false]],
        'Survivorship bias. The right question of any sample is who is missing and why.'),
      mcq('Before reading the shape of a chart, look at:',
        [['The axes — especially whether the y-axis starts at zero', true],
          ['The title', false],
          ['The colour scheme', false],
          ['The source', false]],
        'A truncated y-axis turns a 2% change into a cliff, and the shape is what you remember afterwards.'),
    ],
  },
  {
    unitCode: 'T_STATS_DEBUGGING',
    notes: `A finished analysis with a real mistake in it is harder to diagnose than broken code,
because nothing errors. The numbers compute, the chart renders, and the conclusion is wrong.

**The checks, in the order that finds problems fastest.**

**1. What is n?** Astonishingly often unstated. "70% preferred B" from twenty people is seven
extra people and tells you almost nothing. Any percentage without a denominator should be
treated as unsupported until you have it.

**2. Where did the sample come from?** Self-selected? Convenience? Filtered before collection?
Ask who is missing, as in the previous unit.

**3. Does the arithmetic hold?** Do the percentages sum to 100? Does the total match the parts?
Is the average plausible given the range — an average outside the min and max is impossible and
does happen.

**4. Does the conclusion follow from the numbers?** The commonest failure in a finished
analysis. The data shows a correlation and the text says "causes". The data shows a difference
and the text says "significant" without a test. **The numbers can be perfect and the sentence
under them still unsupported.**

**5. Is the comparison like-for-like?** Different periods, different populations, different
definitions. "Crime up 20%" after the definition of a recorded crime changed is not a crime
increase.

**6. Was anything excluded, and why?** Dropping outliers can be legitimate and can be how an
inconvenient result disappears. The test is whether the rule was decided before or after seeing
which points it removed.

---

**The method.** Recompute one number yourself from the raw data. If you cannot reproduce it, you
have found something — either an error or an undocumented transformation, and both matter.

Then state the conclusion in your own words from the numbers alone, without reading theirs. If
your sentence and their sentence differ, the gap is the finding.`,
    coding: [
      {
        title: 'Find the flaw in each analysis',
        description: `Each claim below contains one specific flaw. Print the number of the matching flaw, one per line, in order.

Claims:
1. "Users who enabled notifications retained 40% better, so notifications improve retention."
2. "70% of surveyed users prefer the new layout." (n is not stated anywhere)
3. "Average response time is 200ms, so performance is good." (data is heavily right-skewed)
4. "Crime rose 20% this year." (the definition of a recorded crime changed in January)

Flaws:
1 = the comparison is not like-for-like
2 = correlation presented as causation
3 = no denominator given
4 = a mean used on skewed data where the median is honest

Print four lines: the flaw number for claim 1, then 2, then 3, then 4.`,
        starter: `# Print four numbers, one per line.
`,
        language: 'python',
        tests: [
          // Hidden deliberately: the task takes no input, so a visible case would print the key.
          { input: '', expectedOutput: '2\n3\n4\n1', isHidden: true },
        ],
      },
    ],
    mcqs: [
      mcq('"70% preferred B" with no sample size. What should you conclude?',
        [['Nothing yet — a percentage without a denominator is unsupported', true],
          ['B is better', false],
          ['The sample was large', false],
          ['It is roughly right', false]],
        'Seven out of ten and seven hundred out of a thousand are the same percentage and entirely different evidence.'),
      mcq('The commonest flaw in an otherwise correct analysis is:',
        [['The conclusion does not follow from the numbers', true],
          ['Arithmetic errors', false],
          ['Wrong chart type', false],
          ['Small sample', false]],
        'The numbers can be perfect and the sentence beneath them still unsupported, which is why recomputing alone is not enough.'),
      mcq('When is excluding outliers legitimate?',
        [['When the rule was decided before seeing which points it removes', true],
          ['Whenever they distort the mean', false],
          ['Never', false],
          ['When they exceed three SDs', false]],
        'Deciding afterwards is how an inconvenient result disappears, and the three-SD rule assumes normality anyway.'),
      mcq('The most useful single action when auditing an analysis is:',
        [['Recompute one number yourself from the raw data', true],
          ['Redraw the chart', false],
          ['Check the citations', false],
          ['Increase the sample', false]],
        'Failing to reproduce it means either an error or an undocumented transformation, and both are findings.'),
    ],
    checkpoint: [
      mcq('An average falls outside the range of the data. What does that mean?',
        [['An arithmetic or data-handling error — it is impossible', true],
          ['The data is skewed', false],
          ['Outliers were removed', false],
          ['It is possible for weighted means', false]],
        'One of the few checks that is a definite proof of error rather than a suspicion.'),
      mcq('"Crime up 20%" after the recording definition changed is:',
        [['Not a like-for-like comparison, so it does not show an increase', true],
          ['A real increase', false],
          ['A sampling problem', false],
          ['A correlation', false]],
        'The measure changed underneath the number, which is a different failure from any error in the data.'),
    ],
  },
  {
    unitCode: 'T_STATS_PRACTICE',
    notes: `No new theory. These problems use centre, spread, distribution shape, probability,
conditional probability and the misleading-statistics checklist — computed and interpreted on
real data.

**Interpretation carries the marks.** A correct standard deviation with no statement of what it
means is half an answer. The question is always "so what should somebody do differently".

**The method for any dataset:**

1. **Look at the shape first.** Histogram or quartiles. It decides which summary is meaningful.
2. **Choose the summary deliberately.** Skewed → median and percentiles. Symmetric → mean and
   SD. Say why.
3. **Compute both centre and spread.** Never report one alone.
4. **State what it means** in a sentence about the world, not about the number.
5. **Ask what is missing.** Who is not in this data, and would including them change the
   conclusion?

**The checklist before reporting any figure:**

- Have I stated n?
- Is my average the right kind for this shape?
- Have I given a spread alongside it?
- Am I claiming causation from a correlation?
- Is my comparison like-for-like?
- Would this conclusion survive somebody hostile reading it?

**Estimate before computing.** Look at the data and guess the mean. If your computed value is
far away, one of the two is wrong — and often it is the computation, because a wrong column or
a missing filter produces a plausible-looking number.`,
    mcqs: [
      mcq('Response times: 45, 48, 51, 47, 49, 3200 ms. Which summary is honest?',
        [['Median 48.5 with the outlier reported separately', true],
          ['Mean 573', false],
          ['Mean with SD', false],
          ['Range 3155', false]],
        'The mean describes none of the six observations. The outlier is real and worth naming, not averaging away.'),
      mcq('A dataset has mean 50 and SD 2. What can you say about a value of 70?',
        [['It is ten SDs out — extremely unusual, and worth investigating as possibly erroneous', true],
          ['It is normal variation', false],
          ['Nothing without more data', false],
          ['It is exactly two SDs out', false]],
        'Ten SDs is far beyond plausible variation, and bad data is a likelier explanation than a genuine extreme.'),
      mcq('Group A improved 10% and group B 12%, from 50 people each. What follows?',
        [['Possibly nothing — the difference may be noise at this sample size', true],
          ['B is better', false],
          ['B is 20% better', false],
          ['A is inadequate', false]],
        'A 2-point difference on 50 people per group is well within what chance produces, and shipping on it is common.'),
      mcq('Reporting a standard deviation without saying what it means is:',
        [['Half an answer — interpretation is the point', true],
          ['Complete', false],
          ['Acceptable for technical audiences', false],
          ['Better than reporting nothing', false]],
        'The question is always what somebody should do differently, and a number alone answers nothing.'),
      mcq('Your computed mean is far from your eyeball estimate. Most likely:',
        [['The computation used the wrong column or missed a filter', true],
          ['Your intuition is wrong', false],
          ['The data is skewed', false],
          ['Rounding', false]],
        'A wrong column produces a plausible-looking number, which is exactly why the estimate is worth making first.'),
    ],
    checkpoint: [
      mcq('The first step with an unfamiliar dataset is:',
        [['Look at the shape — it decides which summary is meaningful', true],
          ['Compute the mean', false],
          ['Remove outliers', false],
          ['Plot a trend', false]],
        'Every summary assumes a shape, and computing before looking risks two numbers that describe nothing real.'),
      mcq('Which belongs in every report of a central value?',
        [['A measure of spread', true], ['The mode', false], ['A chart', false], ['The raw data', false]],
        'An average without a spread cannot distinguish steady from wildly variable, which is usually the decision-relevant part.'),
    ],
  },
  {
    unitCode: 'T_STATS_MINI_PROJECT',
    notes: `Take a claim, find data about it, and report what the data does and does not support.

**Why "and does not" is in the title.** Every analysis you have seen in this topic went wrong in
the same place: the conclusion claimed more than the numbers carried. The discipline being
assessed is the willingness to state the limit — and it is the thing that separates an analyst
from somebody producing charts.

**Choosing a claim.** It must be:

- **Specific enough to test.** "Python is popular" is not. "Python is the most used language
  among respondents to the Stack Overflow survey" is.
- **Something you do not already know the answer to.** If you do, you will find it.
- **Supported by data you can actually obtain.** Public datasets, a survey you run, your own
  logs.

**Expect the answer to be "partly".** Claims that are cleanly true or cleanly false are rare and
usually uninteresting. "Supported for this population over this period, and not generalisable
because the sample was self-selected" is a complete and good answer.

**The five things the report must contain**, because they are the five questions from the
misleading unit turned around:

1. **Who is in the data and who is missing.** Say it explicitly.
2. **What is being compared with what**, over what period, and why that baseline.
3. **Whether you are claiming correlation or causation**, and what would be needed for the
   latter.
4. **The shape of the data** and why your chosen summary suits it.
5. **What would change your conclusion.** If nothing would, you have not stated a testable
   conclusion.

**On honesty.** "The data does not settle this" is a full-marks conclusion when it is what you
found. Manufacturing a finding is the only failing outcome — and it is visible, because the
limits section will not match the conclusion.

The brief, acceptance criteria and deliverables are in the assignment attached to this unit.`,
    assignment: {
      title: 'Mini Project — A Claim, a Dataset, and an Honest Conclusion',
      description: `Test a specific claim against real data and report what it does and does not support. The limitations section is assessed as heavily as the analysis.`,
      instructions: `**The brief**

Choose a specific, testable claim and investigate it with real data.

Examples of claims at the right size:

- "Students who attend more than 80% of classes score higher in this subject"
- "Our repository's build times have got worse over the last six months"
- "Most open-source projects in language X have fewer than five contributors"
- "Response times on this API are worse on Mondays"

Anything where you can obtain data and the answer is not obvious to you already.

**Part 1 — The claim and the data**

State the claim precisely. Describe your data: where it came from, how many observations, what
period, and how it was collected. **State explicitly who or what is NOT in it.**

**Part 2 — The analysis**

- Show the distribution shape (a histogram or quartiles) before any summary
- Choose your summary statistics and **say why they suit this shape**
- Report centre AND spread
- If comparing groups, state both sizes and be explicit about whether the difference could be
  noise

**Part 3 — The conclusion and its limits**

- What the data supports
- **What it does not support**, specifically
- Whether this is correlation or causation, and what would be needed to establish causation
- What would change your conclusion

**What to submit**

1. Your data, or a link plus the exact query or filter used to obtain it.
2. Your analysis — a script, notebook or spreadsheet, with the working visible.
3. A report of roughly 500-700 words covering all three parts.
4. At least one chart, with **axes starting at zero unless you state why not**.
5. A **limitations section** naming at least three specific limitations of your data or method.
   "Small sample" alone is not enough — say what that prevents you concluding.

**Constraints**

- Real data. No invented numbers.
- No causal language unless you have a design that supports it.
- Every percentage must be accompanied by its denominator.

**Where the marks are.** An analysis concluding "the data does not settle this, for these three
reasons" scores above one that reaches a confident answer the data cannot support. The
limitations section is where the understanding shows.`,
      rubric: [
        {
          criterion: 'Claim and data description',
          description: 'A specific testable claim; data source, size, period and collection method stated; who or what is missing from the data stated explicitly.',
          maxPoints: 20,
        },
        {
          criterion: 'Analysis',
          description: 'Distribution shape examined before summarising; summary statistics chosen with a stated reason; centre and spread both reported; group sizes given where groups are compared.',
          maxPoints: 25,
        },
        {
          criterion: 'Conclusion',
          description: 'Follows from the numbers and claims no more. Correlation and causation distinguished, with what would be needed to establish the latter.',
          maxPoints: 25,
        },
        {
          criterion: 'Limitations',
          description: 'At least three specific limitations, each saying what it prevents you concluding rather than merely naming a weakness.',
          maxPoints: 20,
        },
        {
          criterion: 'Presentation',
          description: 'Chart with honest axes; every percentage carries its denominator; no causal language unsupported by the design.',
          maxPoints: 10,
        },
      ],
      totalPoints: 100,
    },
  },
];
