/**
 * Career-track placement content for Data Science + AI, Year 4 (batch S5): probability and statistics puzzles at
 * interview depth (DS_IV_PROBABILITY) and ML case / system-design interviews (DS_ML_CASE).
 *
 * Year 3 taught likelihood, Bayes' rule as a classifier and one fraud-flag base-rate question (DS_MATH_ML), and the
 * analytics topics taught the standard error, the p-value and A/B testing. These units go past them: conditioning
 * on ordered outcomes, optimal-stopping games, waiting times for patterns, the coupon collector and linearity of
 * expectation; overdispersion, memorylessness and the inspection paradox, and what the CLT does not promise;
 * the odds form of Bayes, two correlated flags, a base rate that moves between segments, the ignorant host; and
 * estimator bias, MLE with zero events, the rule of three, overlapping intervals, the German-tank estimator and
 * clustered standard errors. The case units frame, scope, measure and ship ML products the way an Indian product
 * company, fintech or e-commerce panel asks for them, ending in a data-science take-home.
 *
 * Every probability, expectation and metric below was computed — exact fractions where the puzzle allows (Python
 * fractions and SymPy for the pattern-waiting Markov chains), SciPy for the Poisson, binomial and normal values, and
 * NumPy for the case arithmetic (fraud threshold costs, WAPE vs MAPE, PSI, retention value, the newsvendor
 * quantile). Assumptions — fair dice and coins, independence, a 365-day year — are stated where they are used.
 * Results a candidate reports in a scenario (a take-home's AUCs) are given as the scenario's inputs, not claimed
 * as computed.
 *
 * Attribution: DS_IV_PROBABILITY is multi-skill [PROBABILITY_BASICS, STATISTICS_BASICS]; each IV_* checkpoint names
 * its unit's skill and the CHECKPOINT spreads its ten across both. DS_ML_CASE is single-skill (ML_CONCEPTS), so its
 * questions name none. Practice mcqs name none.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

const PB = 'PROBABILITY_BASICS';
const SB = 'STATISTICS_BASICS';

export const TRACK_DS_CASE_PROBABILITY_BUNDLES: PilotBundle[] = [
  /* ══ DS_IV_PROBABILITY ══════════════════════════════════════════════════════════════════════ */

  /* ── IV_PROBABILITY_PUZZLES ────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_IV_PROBABILITY_IV_PROBABILITY_PUZZLES',
    notes: `Product companies, fintechs and quant-leaning analytics firms in India open the statistics round with a
puzzle: dice, cards, coins or birthdays. Nobody needs the answer to run a model. The interviewer is watching three
things: whether you **define the sample space** before counting, whether you reach for **conditioning and
linearity of expectation** instead of brute force, and whether you **say your assumptions** (fair die,
independent tosses, 365 equally likely birthdays). Work aloud; a correct method with an arithmetic slip scores
higher than a silent right number.

Year 3 used probability to explain likelihood and Bayes as a classifier. These are the interview versions.

## Q1. "Two dice are rolled and the sum is 7. What is the chance at least one shows a 6?"

**Strong answer.** "Assume two fair, distinguishable dice, so 36 equally likely **ordered** outcomes. Sum 7 has
six: (1,6), (2,5), (3,4), (4,3), (5,2), (6,1). Two contain a 6, so the answer is 2/6 = **1/3**."

**Follow-up:** "And if the sum is 8?" — (2,6), (3,5), (4,4), (5,3), (6,2): five outcomes, two with a 6, so **2/5**.
Notice (4,4) appears once — that is why the answer is not 2/6 again.

**Trap:** counting unordered pairs ({1,6}, {2,5}, {3,4}) as equally likely, which gives 1/3 here by luck and the
wrong answer for sum 8 (you would say 1/3 from {2,6}, {3,5}, {4,4}). Unordered pairs are not equally likely: {4,4}
happens one way, {2,6} two ways.

## Q2. "Roll a die and win its face in rupees. You may reroll once and must keep the second roll. Fair price?"

**Strong answer.** "Work backwards. The second roll is worth its expected value, 3.5. So on the first roll keep
anything above 3.5 — a 4, 5 or 6 — and reroll a 1, 2 or 3. Value = (4 + 5 + 6)/6 + (3/6) × 3.5 = 2.5 + 1.75 =
**₹4.25** (17/4)."

**Follow-up:** "Two rerolls?" — now the continuation is worth 4.25, so keep only 5 or 6 on the first roll:
(5 + 6)/6 + (4/6) × 4.25 = **14/3 ≈ ₹4.67**.

**Trap:** rerolling a 4 "because it is below 5". The threshold is the value of continuing, not a round number.
This is the optimal-stopping idea behind every "when do I stop exploring" question.

## Q3. "Flip a fair coin until you see HH. Expected flips? And until HT?"

**Strong answer.** Set up states. For HH: let e0 = expected flips from scratch, e1 = after one H.
e0 = 1 + ½e1 + ½e0 and e1 = 1 + ½·0 + ½e0, which gives **e0 = 6**. For HT, after an H a further H keeps you in
the "have an H" state, so e1 = 1 + ½e1, e1 = 2 and e0 = 2 + 2 = **4**.

**Follow-up:** "If two players race — one wins on HH, the other on HT — who is favoured?" — **neither, 1/2 each**:
both wait for the first H, and the very next flip decides. Equal race, unequal waiting times: the overlap of HH
with itself (a failed HH attempt ending in T sends you back to zero) is what makes it slower.

**Extensions you should have ready:** HHH takes 14 flips on average; two sixes in a row on a die takes **42** rolls.

## Q4. "A family has two children and at least one is a boy. Probability both are boys?"

**Strong answer.** "Assume each child is a boy or girl with probability ½ independently. The outcomes BB, BG, GB,
GG are equally likely; 'at least one boy' leaves three, one of which is BB: **1/3**."

**Follow-up:** "What if I tell you the **elder** is a boy?" — only BB and BG remain: **1/2**. The answer depends on
how the information was obtained, which is the real lesson: in data, *how a filter was applied* changes the
conditional distribution.

## Q5. "How many people before two share a birthday with more than 50% chance?"

**Strong answer.** "Assume 365 equally likely birthdays, no leap years. P(all different among n) =
365/365 × 364/365 × … × (365 − n + 1)/365. It first drops below ½ at **n = 23** (P(shared) ≈ 50.7%). In a
batch of 60 it is ≈ 99.4%."

**Follow-up:** "What is the chance someone among the other 22 shares **your** birthday?" — 1 − (364/365)²² ≈
**5.9%**. You need about 253 other people to pass 50%. The pair count grows like n², which is why collisions come
so early.

**Where it matters at work:** short hashed IDs and random sample keys collide far sooner than intuition says —
the birthday bound is why a 32-bit ID is unsafe for a table of a few lakh rows.

## Q6. "Five cards from a shuffled deck. Probability of at least one ace?"

**Strong answer.** "Complement: no aces means all five from the 48 non-aces. 1 − C(48,5)/C(52,5) =
1 − 1,712,304/2,598,960 ≈ **34.1%**."

**Trap:** 5 × 4/52 ≈ 38.5%. Adding the five "card i is an ace" probabilities counts hands with two or more aces
more than once. Sums of probabilities give the **expected number** of aces (5/13), not the chance of at least one.

**Follow-up:** "Two cards, both aces?" — (4/52) × (3/51) = **1/221**, without replacement.

## Q7. "A chips brand puts one of six cricketer cards in each packet, equally likely. Expected packets to collect all six?"

**Strong answer.** Linearity of expectation. After you have k distinct cards, each new packet is new with
probability (6 − k)/6, so the wait is geometric with mean 6/(6 − k). Sum: 6/6 + 6/5 + 6/4 + 6/3 + 6/2 + 6/1 =
6 × (1 + ½ + ⅓ + ¼ + ⅕ + ⅙) = **14.7 packets**. The last card alone costs 6 packets on average.

**Follow-up:** "Why can you add expectations when the waits depend on each other?" — linearity of expectation
holds for **any** random variables, dependent or not. That is why it is the first tool to reach for.

## Q8. "A placement cell returns 50 ID cards at random. Expected number of students who get their own?"

**Strong answer.** Indicator variables: student i gets their own card with probability 1/50; 50 × 1/50 = **1**.
For any number of students the answer is 1.

**Follow-up:** "Chance that nobody gets their own?" — tends to 1/e ≈ **36.8%** and is already 3/8 for four
people. Interviewers ask this to see whether you know where linearity stops: the expectation is easy, the
distribution needs inclusion–exclusion.

## Q9. "Which is likelier: at least one 6 in four rolls of a die, or at least one double six in 24 rolls of two dice?"

**Strong answer.** 1 − (5/6)⁴ = 671/1296 ≈ **51.8%** versus 1 − (35/36)²⁴ ≈ **49.1%**. The first is the better
bet. The "proportional" argument (4 × 1/6 = 24 × 1/36) is the trap; it is the same mistake as Q6.

## How you are judged

| Strong | Weak |
|---|---|
| States the sample space and assumptions first | Starts multiplying immediately |
| Uses the complement for "at least one" | Adds probabilities of overlapping events |
| Uses indicators / linearity for expectations | Tries to list every outcome |
| Checks the answer is between 0 and 1 and plausible | Gives a number with no sanity check |
| Explains the follow-up's change of conditioning | Repeats the first answer |`,
    workedExample: `**Interviewer: "We play a game. You roll a die and may stop and take the face in rupees, or roll again —
up to three rolls in total. You must take the last roll if you get there. What is the game worth, and what is
your strategy?"**

1. **Assumptions aloud.** "A fair six-sided die, rolls independent, I want to maximise the expected payout."

2. **Start from the end.** On the third roll there is no choice: its value is the mean face, (1 + … + 6)/6 = 3.5.

3. **Second roll.** Stop if the face beats what continuing is worth (3.5): stop on 4, 5, 6; reroll on 1, 2, 3.

       value with two rolls left = (4 + 5 + 6)/6 + (3/6) × 3.5 = 15/6 + 1.75 = 4.25

4. **First roll.** Continuing is now worth 4.25, so stop only on 5 or 6:

       value with three rolls left = (5 + 6)/6 + (4/6) × 4.25 = 11/6 + 17/6 = 28/6 = 14/3 ≈ 4.67

5. **State the strategy.** "Keep a 5 or 6 on the first roll; keep 4 or better on the second; take whatever comes on
   the third. The game is worth 14/3, about ₹4.67."

6. **Sanity check.** The value rises with more rerolls (3.5 → 4.25 → 4.67) but can never pass 6, and each extra
   roll adds less — a good thing to say out loud.

7. **The follow-up you can expect:** "What if each reroll costs 25 paise?" — recompute from the end with the fee
   subtracted. On the second roll continuing is worth 3.5 − 0.25 = 3.25, so stop on 4 or better; that roll is now
   worth (4 + 5 + 6)/6 + (3/6) × 3.25 = 33/8 = 4.125. On the first roll continuing is worth 4.125 − 0.25 = 3.875,
   so the threshold **drops**: keep a 4 as well. The game is worth (4 + 5 + 6)/6 + (3/6) × 3.875 = 71/16 ≈ ₹4.44.
   The point to say aloud: a cost on continuing can only lower the stopping thresholds, never raise them.

What scores: backward induction named and used, the thresholds explained as "the value of continuing", and the
exact fraction given before the decimal.`,
    mcqs: [
      mcq('Two fair dice are rolled and you are told the sum is 8. What is the probability that at least one die shows a 6?', [
        ['2/5, since two of the five ordered outcomes contain a 6', true],
        ['1/3, since one of the three unordered pairs contains a 6', false],
        ['1/6, since each die independently shows a 6 one time in six', false],
        ['2/11, since a 6 appears on 11 of the 36 ordered outcomes', false],
      ], 'Sum 8 has five equally likely ordered outcomes: (2,6), (3,5), (4,4), (5,3), (6,2). Two contain a 6, so 2/5. Unordered pairs are not equally likely — {4,4} happens one way, {2,6} two ways.'),
      mcq('A fair coin is flipped until three heads in a row appear. What is the expected number of flips?', [
        ['6, two flips for each head in the run', false],
        ['8, since HHH has probability 1/8', false],
        ['14, from the three-state Markov chain', true],
        ['12, four times the length of the run', false],
      ], 'With states for 0, 1 and 2 trailing heads, e0 = 1 + ½e1 + ½e0, e1 = 1 + ½e2 + ½e0, e2 = 1 + ½e0, which solves to e0 = 14. A tail at any point sends you back to the start, so the wait is longer than 1/P(HHH) = 8.'),
      mcq('For P(at least one ace in a five-card hand), a candidate writes 5 × 4/52 ≈ 38.5%. What is right?', [
        ['38.5% is right, as each of the five cards is an ace with probability 4/52', false],
        ['About 7.7%, because at most one card in a five-card hand can be an ace', false],
        ['About 34.1%; adding the five terms counts two-ace hands more than once', true],
        ['About 30.8%, because the deck has only four aces to share across hands', false],
      ], 'The complement gives 1 − C(48,5)/C(52,5) ≈ 0.341. Summing the five probabilities gives the expected number of aces (5/13 ≈ 0.385), which overcounts every hand holding two or more aces.'),
    ],
    checkpoint: [
      ck(PB, 'Two fair dice are rolled and you are paid the larger of the two faces in rupees. What is the fair price of this game?', [
        ['₹3.50, the expected value of a single die', false],
        ['₹161/36, about ₹4.47, from P(max = k) = (2k − 1)/36', true],
        ['₹5.00, the midpoint of the two highest faces', false],
        ['₹7.00, half of the largest possible total of 12', false],
      ], 'P(max ≤ k) = (k/6)², so P(max = k) = (k² − (k − 1)²)/36 = (2k − 1)/36. The expectation is Σ k(2k − 1)/36 = 161/36 ≈ 4.47 — above 3.5, because the larger face is favoured.'),
      ck(PB, 'A coaching institute hands 120 admit cards back to students completely at random. What is the expected number of students who receive their own card?', [
        ['About 44, which is 120 divided by e', false],
        ['Exactly 1, whatever the number of students', true],
        ['About 0.37, the chance that nobody does', false],
        ['12, one tenth of the students in the batch', false],
      ], 'Each student gets their own card with probability 1/120; by linearity of expectation the 120 indicators sum to 1. The 0.37 (≈ 1/e) is the probability that nobody gets their own, a different question.'),
      ck(PB, 'Ravi wins if HT appears first in a run of fair coin flips; Sana wins if HH appears first. What is Ravi\'s probability of winning?', [
        ['2/3, since HT takes 4 flips on average and HH takes 6', false],
        ['1/3, since HH can reuse its last H and so arrives first', false],
        ['1/2, since the flip right after the first H decides it', true],
        ['3/5, since HT can never overlap with itself in a run', false],
      ], 'Nothing happens until the first H; the next flip is H (Sana) or T (Ravi) with probability ½ each. Unequal expected waiting times (4 and 6) do not imply unequal chances in a head-to-head race.'),
    ],
  },

  /* ── IV_DISTRIBUTIONS ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_IV_PROBABILITY_IV_DISTRIBUTIONS',
    notes: `Distribution questions test whether you can **pick the right model for a quantity** and know its failure
mode. The panel does not want formulas recited; it wants "this is a count of rare events in a window, so Poisson —
and here is when Poisson will lie to you".

## Q1. "Which distribution would you use, and why?"

| Quantity | Distribution | The assumption that breaks it |
|---|---|---|
| Defaults among 500 loans | Binomial(n, p) | Defaults are correlated in a downturn |
| Orders per minute at a dark store | Poisson(λ) | Variance ≫ mean (rain, sales, festival) |
| Minutes until the next auto arrives | Exponential(rate) | Arrivals are scheduled, not random |
| Calls until the first conversion | Geometric(p) | p changes as the list goes cold |
| Average basket value over 400 orders | Normal (via CLT) | Too few orders for very skewed data |
| Loan amount, income, revenue per user | Log-normal / heavy-tailed | — it is the honest default for money |

## Q2. "A fraud model wrongly flags 2% of genuine transactions. A customer makes 200 genuine payments a month. How often are they hassled?"

**Strong answer.** "Assume flags are independent across transactions. The count is Binomial(200, 0.02): mean 4,
SD √(200 × 0.02 × 0.98) ≈ 1.98. P(at least one false flag) = 1 − 0.98²⁰⁰ ≈ **98.2%**."

**Follow-up:** "So is a 2% false-positive rate small?" — per transaction yes, per **heavy user** no: almost every
active customer gets blocked at least once a month. Report false positives per customer too.

**Trap:** answering "2%". The question is about a customer, not a transaction.

## Q3. "A support desk gets 4 chats a minute on average. How often does a minute bring more than 6?"

**Strong answer.** "Treat arrivals as Poisson with λ = 4: P(N > 6) = 1 − P(N ≤ 6) ≈ **11.1%** — about 53 minutes of
an 8-hour shift. P(no chats in a minute) = e⁻⁴ ≈ 1.8%."

**Follow-up:** "The daily count has mean 4 per minute but variance 15. Still Poisson?" — no. Poisson forces
**variance = mean**. Variance far above the mean (overdispersion) means bursts — rain, a payment outage, an IPL
final — and a Poisson plan will under-staff the spikes. Use a negative binomial, or model the rate by hour and
condition.

**Also know:** Binomial with large n and small p is close to Poisson(np). For n = 1,000 and p = 0.003,
P(0) = 0.0496 exactly versus e⁻³ = 0.0498.

## Q4. "Autos pass your stop as a Poisson process, 6 an hour. You have waited 10 minutes. How much longer?"

**Strong answer.** "Waiting times in a Poisson process are exponential, and the exponential is **memoryless**: the
expected further wait is still 1/6 hour = **10 minutes**, however long I have waited. P(wait more than 15
minutes) = e^(−6 × 0.25) = e^(−1.5) ≈ 22.3%."

**Follow-up — the inspection paradox:** "Autos pass every 10 minutes on average. If you arrive at a random time,
is your average wait 5 minutes?" — only if they come **exactly** every 10 minutes. With random (Poisson) arrivals
your average wait is 10 minutes, because you are more likely to land inside a long gap; the gap you land in
averages 20 minutes. The same bias makes "average class size as students experience it" exceed the college's
average class size.

**Trap:** "I've waited a long time, so one must be due." That is the gambler's fallacy for memoryless processes.

## Q5. "Two independent legs of a delivery take 12 ± 3 and 20 ± 4 minutes (mean ± SD). Total?"

**Strong answer.** "Means add: 32 minutes. **Variances** add: 9 + 16 = 25, so the SD is **5 minutes**, not 7." The
difference of the two also has SD 5. With correlation, Var(X + Y) = Var X + Var Y + 2 Cov(X, Y): positively
correlated legs (both slow in rain) widen the total.

**Follow-up:** "What share of deliveries take more than 42 minutes, if the total is roughly normal?" — 42 is
2 SD above 32; P(Z > 2) ≈ **2.3%**.

## Q6. "What does the Central Limit Theorem promise, and what doesn't it?"

**Strong answer.**

- **Promises:** for independent draws with **finite variance**, the distribution of the **sample mean** approaches
  normal as n grows, centred at the true mean with standard error σ/√n. That is why a 95% CI for an average order
  value works even though order values are skewed.
- **Does not promise:** that the **data** become normal; that n = 30 is enough (for very skewed data — revenue per
  user with a few whales — the mean of 30 is still visibly skewed; in a simulation of log-normal data with σ = 2,
  the means of 30 draws stayed strongly right-skewed); anything for heavy tails with infinite variance; anything for
  **dependent** data (sessions from the same user, days in a time series) — there the effective n is smaller.

**Follow-up:** "SD of order value is ₹1,200; you average 400 orders. SE?" — 1,200/√400 = **₹60**.

**Trap:** "By the CLT, our revenue per user is normally distributed." It is not; its **average** is approximately.

## Q7. "Expected value and median of an exponential wait with mean 10 minutes?"

Mean 10; **median 10 × ln 2 ≈ 6.9 minutes**. Right-skewed: most waits are shorter than the mean. Interviewers
use this to check you do not quote the mean as "the typical wait".

## How you are judged

Strong candidates name the distribution, the assumption, and the data that would break it — and they reach for
variances (not SDs) when adding. Weak candidates recite formulas and assume everything is normal.`,
    workedExample: `**Interviewer: "Our grocery app's support desk receives 4 chats a minute on average. One agent can handle 6
chats a minute. Is one agent enough? If not, how would you size the team?"**

1. **Model.** "Chats arrive independently at a steady rate within an hour, so the count in a minute is Poisson with
   λ = 4. I'll check that assumption against the data in a moment."

2. **Overflow probability.** P(N > 6) = 1 − Σ_{k=0..6} e⁻⁴ 4ᵏ/k! ≈ 0.111.

3. **Translate to the shift.** An 8-hour shift has 480 minutes: 480 × 0.111 ≈ **53 minutes** with more chats than the
   agent can take.

4. **Compare capacities** (same model):

       capacity 6/min: P(N > 6) ≈ 11.1%  -> ≈ 53 overflow minutes a shift
       capacity 7/min: P(N > 7) ≈ 5.1%   -> ≈ 25 minutes
       capacity 8/min: P(N > 8) ≈ 2.1%   -> ≈ 10 minutes

   "The answer depends on what an overflow minute costs — a two-minute wait is fine, a dropped chat on a failed
   payment is not."

5. **Check the assumption.** "Before trusting this I'd compare the variance of per-minute counts with the mean. If
   lunchtime or a payment outage makes the variance three or four times the mean, Poisson badly understates the
   spikes. Then I'd model by hour of day, or fit a negative binomial, and staff for the busy hours separately."

6. **Conclude.** "At a steady 4 a minute, capacity 7 cuts overflow to about 5% of minutes. But the real driver is the
   peaks, so I'd size per hour and keep an overflow queue or bot for outage spikes."

What scores: a named model, a number turned into business terms (minutes per shift), and the assumption tested
rather than assumed.`,
    mcqs: [
      mcq('Ride requests in a zone arrive at an average of 2 a minute, roughly Poisson. In what share of minutes do 3 or more arrive?', [
        ['About 13.5%, the chance of a minute with no requests', false],
        ['About 50%, since 3 is above the mean of 2 a minute', false],
        ['About 67.7%, the chance of at most 2 requests a minute', false],
        ['About 32.3%, from one minus P(0) + P(1) + P(2)', true],
      ], 'P(N ≤ 2) = e⁻²(1 + 2 + 2) = 5e⁻² ≈ 0.677, so P(N ≥ 3) ≈ 0.323. 0.135 is P(0) = e⁻²; 0.677 is the complement you subtract from 1.'),
      mcq('A store\'s orders per hour have mean 12 and variance 45 across the month. What does that say about a Poisson model?', [
        ['It fits well, as a Poisson count can have any variance', false],
        ['The counts are overdispersed, so Poisson will understate spikes', true],
        ['The counts are underdispersed, so Poisson will overstate spikes', false],
        ['The mean is too large for Poisson, so a binomial must be used', false],
      ], 'A Poisson variable has variance equal to its mean. Variance nearly four times the mean means bursty demand (rain, offers, outages); a negative binomial or a rate modelled by hour fits better.'),
      mcq('Two independent delivery legs take 12 ± 3 and 20 ± 4 minutes (mean ± SD). What is the SD of the total time?', [
        ['7 minutes, as the two SDs add', false],
        ['5 minutes, as the variances add', true],
        ['3.5 minutes, the average SD', false],
        ['25 minutes, the summed variance', false],
      ], 'For independent variables variances add: 9 + 16 = 25, so the SD is √25 = 5. SDs do not add; 25 is the variance, not the SD.'),
    ],
    checkpoint: [
      ck(PB, 'Which statement about the Central Limit Theorem is correct?', [
        ['With enough data, the observations themselves become normally distributed', false],
        ['With independent draws of finite variance, the sample mean tends to normal', true],
        ['Any sample of 30 or more is enough to treat every statistic as normal', false],
        ['It applies to sessions from the same user just as to independent users', false],
      ], 'The CLT is about the sampling distribution of the mean for independent draws with finite variance. The data keep their shape, 30 is folklore for skewed data, and dependent observations shrink the effective sample size.'),
      ck(PB, 'Buses arrive as a Poisson process with a mean gap of 15 minutes. You have already waited 15 minutes. What is your expected further wait?', [
        ['About 7.5 minutes, as you are halfway through a gap', false],
        ['Almost nothing, since a bus is now overdue at the stop', false],
        ['15 minutes, because exponential waits are memoryless', true],
        ['30 minutes, because long gaps are more likely to be hit', false],
      ], 'Gaps in a Poisson process are exponential, and P(T > s + t | T > s) = P(T > t). The time already waited carries no information; the expected further wait stays 15 minutes.'),
      ck(PB, 'A fraud model scores a merchant\'s 300 genuine transactions independently, with a 1% false-positive rate. What is the chance at least one is flagged?', [
        ['About 95.1%, from 1 − 0.99³⁰⁰', true],
        ['About 3%, from 300 × 0.01 ÷ 100', false],
        ['Exactly 1%, the model\'s stated rate', false],
        ['About 26%, from 0.99 to the 30th', false],
      ], 'The number of false flags is Binomial(300, 0.01), so P(at least one) = 1 − 0.99³⁰⁰ ≈ 0.951. The expected count is 3 — a heavy merchant is almost certain to be blocked at least once.'),
    ],
  },

  /* ── IV_BAYES ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_IV_PROBABILITY_IV_BAYES',
    notes: `Every fintech and health-tech panel asks a Bayes question, and most candidates have memorised the single
"rare disease, accurate test" answer. Year 3 worked one fraud flag with a table. The interview goes further: a
**second** flag, a **different segment**, a host who does not know the answer. The tool that makes all of them
fast is the **odds form**.

    posterior odds = prior odds × likelihood ratio
    likelihood ratio of a positive = TPR / FPR = sensitivity / (1 − specificity)

## Q1. "0.5% of transactions are fraud. The model catches 95% of fraud and flags 1% of genuine ones. A transaction is flagged. P(fraud)?"

**Strong answer (odds form).** "Prior odds 0.5 : 99.5 = 1 : 199. Likelihood ratio 95% / 1% = 95. Posterior odds
95 : 199, so P(fraud | flag) = 95/294 ≈ **32.3%**. Two out of three flags are genuine customers."

**Follow-up:** "So the model is bad?" — No: it multiplied the odds by 95. Precision is low because fraud is rare.
Flags should go to step-up authentication (an OTP) or review, not a hard block.

## Q2. "A second, independent model also flags it. Now?"

**Strong answer.** "If the two models' errors are **conditionally independent** given the class, multiply again:
95 : 199 × 95 = 9,025 : 199, so P ≈ **97.8%**."

**Follow-up — the real question:** "Are they independent?" — almost never. Two models trained on the same features
make the **same mistakes** (a genuine customer travelling abroad trips both). The second flag's likelihood ratio,
given the first, is much smaller than 95; the true posterior is somewhere between 32% and 98%. Measure it: on
labelled data, compute P(model B flags | A flagged, fraud) and P(B flags | A flagged, genuine).

**Trap:** multiplying likelihood ratios from correlated signals — the same mistake Naive Bayes makes, and why its
probabilities are badly calibrated even when its ranking is good.

## Q3. "The same model is launched for a merchant segment where 5% of transactions are fraud. What precision do you expect?"

**Strong answer.** "If TPR and FPR carry over (same score distributions per class), only the prior changes: odds
5 : 95 × 95 = 5 : 1, so precision ≈ **83%**. The model did not get better; the base rate did."

**Follow-up:** "Which metrics travel between populations?" — TPR, FPR and ROC-AUC depend only on the class-wise
score distributions; **precision, PR-AUC and alert volume depend on the base rate**. Never quote a precision
without saying which population it came from.

## Q4. "A screening test for a condition affecting 1 in 1,000: 99% sensitivity, 95% specificity. A positive result?"

**Strong answer.** LR+ = 0.99/0.05 = 19.8; prior odds 1 : 999; posterior odds ≈ 19.8 : 999, P ≈ **1.9%**.
A **negative** result: LR− = 0.01/0.95, so P(condition | negative) ≈ 1 in 95,000.

**Follow-up:** "Then why screen at all?" — because a negative almost rules it out, and a positive raises the
risk twenty-fold, enough to justify a confirmatory test. Screening is a filter, not a diagnosis.

## Q5. "Monty Hall — and the version where the host doesn't know."

**Strong answer.** Three doors, one car. You pick door 1. The host, who **knows** where the car is and always opens a
goat door you did not pick, opens door 3. Switching wins with probability **2/3**: your first pick is right 1/3
of the time, and the host's forced choice moves the other 2/3 onto door 2.

**Follow-up:** "The host opens a door **at random** and it happens to show a goat." — now it is **1/2**. The host's
choice carries information only if it depended on where the car was. This is the cleanest demonstration that the
**process that generated the data** matters, not just the data.

## Q6. "A bag has a fair coin and a two-headed coin. You pick one and get three heads. P(two-headed)? P(next flip is heads)?"

**Strong answer.** Prior odds 1 : 1; likelihood of HHH is 1 versus 1/8, so the ratio is 8; posterior **8/9**. Next
flip: 8/9 × 1 + 1/9 × ½ = **17/18**. After five heads the posterior is 32/33.

## Q7. "In a city, 85% of cabs are green and 15% blue. A witness who is right 80% of the time says the cab was blue."

**Strong answer.** Prior odds blue : green = 15 : 85; likelihood ratio 0.8/0.2 = 4; posterior odds 60 : 85, so
P(blue) = 60/145 ≈ **41%**. A "80% reliable" witness still leaves blue less likely than not.

## Q8. "A DNA-style match has a 1-in-10,000 false-match rate. The suspect matched. Is there a 99.99% chance they are guilty?"

**Strong answer.** That is the **prosecutor's fallacy**: P(match | innocent) is not P(innocent | match). In a city of
one crore people, about 1,000 innocent people would match. Without other evidence narrowing the pool, the match
alone is weak. The same error appears when an analyst reads a p-value as the probability the null is true.

## Q9. "Ops can review 500 alerts a day. 1 lakh transactions, 0.1% fraud, TPR 90%, FPR 2%. Workable?"

**Strong answer.** True alerts 100 × 0.9 = 90; false alerts 99,900 × 0.02 = 1,998; precision ≈ **4.3%** and about
2,088 alerts — four times capacity. The fix is a threshold that matches capacity (rank by score and review the
top 500), not a better slogan. This is the bridge from Bayes to an ML case answer.

## How you are judged

| Strong | Weak |
|---|---|
| Asks for the base rate first | Quotes the test's accuracy as the answer |
| Uses odds × likelihood ratio, fast | Draws a tree slowly, or not at all |
| Questions independence before multiplying | Multiplies two flags blindly |
| Says which metrics move with the base rate | Quotes precision with no population |`,
    workedExample: `**Interviewer: "Our lending app flags 0.5% of applications as identity fraud using rule set R, which catches 80%
of fraud with a 2% false-positive rate. A new model M catches 90% with 1%. Fraud is 1% of applications. Should an
application flagged by both be auto-rejected?"**

1. **Base rate first.** Prior odds of fraud 1 : 99.

2. **Each signal as a likelihood ratio.**

       R: LR+ = 0.80 / 0.02 = 40
       M: LR+ = 0.90 / 0.01 = 90

3. **One flag.** R alone: odds 40 : 99, P ≈ 28.8%. M alone: 90 : 99, P ≈ 47.6%.

4. **Both flags, if conditionally independent.** odds = 1/99 × 40 × 90 = 3,600 : 99, so P ≈ 97.3%.

5. **Challenge the independence.** "R and M both use device ID, PIN code and name-match score. A genuine customer
   with a new phone and a recent move trips both. So the true joint likelihood ratio is lower than 3,600. I would
   measure it on last quarter's labelled applications:"

       P(both flag | fraud)   = share of fraud cases flagged by both
       P(both flag | genuine) = share of genuine cases flagged by both
       joint LR = the ratio of these two

   "Suppose that shows 72% and 0.4% — a joint LR of 180. Then odds = 180 : 99 and P ≈ 64.5%."

6. **Decision.** "At 64.5%, auto-reject would turn away about one genuine applicant for every two frauds. I would
   route 'both flagged' to video KYC instead, and reserve auto-reject for the narrow segment where the measured
   precision is above an agreed bar — and report the false-reject count to the business, not just the precision."

What scores: the odds form used fluently, independence questioned and then **measured**, and a decision that
puts a cost on the genuine customer.`,
    mcqs: [
      mcq('Prior odds of fraud are 1 : 99 and a flag has a likelihood ratio of 20. What is the probability of fraud after the flag?', [
        ['About 20%, the likelihood ratio read as a percentage', false],
        ['About 1%, since the prior is unchanged by a single flag', false],
        ['About 16.8%, since the posterior odds are 20 : 99', true],
        ['About 95%, since a ratio of 20 is strong evidence', false],
      ], 'Posterior odds = prior odds × LR = 20 : 99, so P = 20/119 ≈ 0.168. Strong evidence on a rare event still leaves most flags false.'),
      mcq('A box has three fair coins and one two-headed coin. You pick a coin at random, flip it twice and get two heads. What is P(two-headed)?', [
        ['1/4, the share of two-headed coins in the box', false],
        ['4/7, from prior odds 1 : 3 times a likelihood ratio of 4', true],
        ['1/2, since two heads is equally likely for either kind', false],
        ['16/19, from multiplying the prior by four to the power two', false],
      ], 'Prior odds two-headed : fair = 1 : 3. P(HH | two-headed) = 1 and P(HH | fair) = 1/4, a ratio of 4. Posterior odds 4 : 3, so P = 4/7.'),
      mcq('In a game-show variant, the host does not know where the car is, opens one of the two other doors at random, and it happens to show a goat. Should you switch?', [
        ['Yes, switching wins 2/3 of the time as in the classic game', false],
        ['No, staying now wins 2/3 because the host revealed nothing', false],
        ['It makes no difference: each closed door has probability 1/2', true],
        ['Yes, switching now wins 3/4 because a goat was revealed', false],
      ], 'A random opening that shows a goat is equally likely whether your door hides the car (prob 1 × 1/3) or the unopened door does (prob 1/2 × 2/3 = 1/3). Conditioning on the goat leaves 1/2 each.'),
    ],
    checkpoint: [
      ck(PB, 'A fraud model has TPR 80% and FPR 4%. Across all of India, where fraud is 1%, its precision is about 17%. What precision do you expect on a merchant segment where fraud is 10%, if TPR and FPR carry over?', [
        ['About 17%, as precision is a property of the model', false],
        ['About 69%, from posterior odds 10 : 90 × 20', true],
        ['About 80%, the TPR, as fraud is no longer rare', false],
        ['About 96%, from one minus the false-positive rate', false],
      ], 'LR+ = 0.80/0.04 = 20. Odds 10 : 90 × 20 = 200 : 90, so precision = 200/290 ≈ 0.69. Precision depends on the base rate; TPR and FPR are the parts that travel.'),
      ck(PB, 'A screening test for a condition with 2% prevalence has 90% sensitivity and 90% specificity. What is P(condition | positive)?', [
        ['About 90%, the sensitivity of the test', false],
        ['About 15.5%, from 0.018 ÷ (0.018 + 0.098)', true],
        ['About 2%, since the test changes nothing', false],
        ['About 50%, as both error rates are equal', false],
      ], 'Per 1,000 people: 20 have it and 18 test positive; 980 do not and 98 test positive. 18/116 ≈ 0.155. Equal sensitivity and specificity do not make a positive a coin flip when the prior is 2%.'),
      ck(PB, 'A fingerprint match has a 1-in-10,000 chance of matching an innocent person. A lawyer says this means a 99.99% chance the matched person is guilty. What is wrong?', [
        ['Nothing, since the false-match rate is so low', false],
        ['The rate should be squared for two fingerprints', false],
        ['It confuses P(match | innocent) with P(innocent | match)', true],
        ['It should be 99%, since lab errors are about 1 in 100', false],
      ], 'This is the prosecutor\'s fallacy. In a population of a crore, about 1,000 innocent people would match; the probability of guilt depends on the prior — how many plausible suspects there were.'),
    ],
  },

  /* ── IV_ESTIMATION ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_IV_PROBABILITY_IV_ESTIMATION',
    notes: `Estimation questions separate candidates who can run a t-test from those who know what an estimate **is**:
a number computed from a sample, with a bias, a variance and an interval. Analytics interviews already asked
about the standard error and p-values; data-science panels ask about **estimators** — their bias, maximum
likelihood, intervals when the data are awkward, and how many samples you need.

## Q1. "Why do we divide by n − 1 in the sample variance?"

**Strong answer.** "Because deviations are measured from the sample mean, which is fitted to the same data and sits
closer to the points than the true mean. Dividing by n underestimates the variance on average by a factor
(n − 1)/n; dividing by n − 1 makes the estimator **unbiased**."

**Follow-up:** "Is the sample SD then unbiased?" — **No.** The square root of an unbiased variance estimate is biased
low (Jensen's inequality). And the **MLE** of a normal variance divides by n — biased, but consistent.

**Follow-up 2:** "Does it matter with 10,000 rows?" — Hardly: (n − 1)/n = 0.9999. Bias shrinking with n is
**consistency**; that is usually what matters in practice.

**Trap:** saying "n − 1 is used because the sample is small".

## Q2. "Explain maximum likelihood in words."

**Strong answer.** "Choose the parameter value that makes the data we actually saw most probable. 7 heads in 10 flips:
the likelihood p⁷(1 − p)³ peaks at p = 0.7. For a Poisson count the MLE of λ is the sample mean; for an exponential
wait the MLE of the rate is 1/mean. Logistic regression is MLE; minimising log loss is maximising the likelihood."

**Follow-up:** "A new loan product has **0 defaults in its first 20 loans**. MLE of the default rate?" — 0, which is
absurd as a planning number. Give an interval: the **rule of three** says a 95% upper bound for zero events in n
trials is about 3/n = **15%**; the exact bound, solving (1 − p)²⁰ = 0.05, is **13.9%**. With 300 loans and no
defaults, about 1%.

**Trap:** reporting "0% default rate" to a credit committee.

## Q3. "120 of 1,500 loans defaulted. Give me an interval and tell me what it means."

**Strong answer.** p̂ = 0.08; SE = √(0.08 × 0.92 / 1,500) ≈ 0.0070; 95% CI ≈ **6.6% to 9.4%**. "If we repeated the
sampling many times, intervals built this way would cover the true rate 95% of the time."

**Follow-up:** "So there's a 95% chance the true rate is between 6.6% and 9.4%?" — Not in the frequentist reading:
the true rate is fixed; the 95% belongs to the **method**. (A Bayesian credible interval does make that
statement, given a prior.)

**Follow-up 2:** "When would you not use this formula?" — with few events or p near 0 or 1 (the normal
approximation fails and can give negative bounds): use the **Wilson** or exact interval.

## Q4. "How many customers must we survey to estimate a share to within ±2 points?"

**Strong answer.** n = z² p(1 − p) / m². Worst case p = 0.5: 1.96² × 0.25 / 0.02² ≈ **2,401**. If the share is
known to be near 10%: 1.96² × 0.09 / 0.0004 ≈ 865. Halving the margin to ±1 point needs **four times** the sample
(9,604).

**Follow-up:** "We'll send it to 1 lakh customers and take whoever replies." — a big **biased** sample is still
biased; non-response is not fixed by size.

## Q5. "Two groups' 95% CIs overlap. So the difference isn't significant?"

**Strong answer.** "Not necessarily." Means 10 and 13 with SE 1 each: CIs 8.04–11.96 and 11.04–14.96 overlap, but
the difference 3 has SE √2 ≈ 1.41, z ≈ 2.12, **p ≈ 0.034**. Test the difference directly. (Non-overlap does imply
significance; overlap does not imply its absence.)

## Q6. "Delivery bikes carry serial numbers 1 to N. You see four: the largest is 60. Estimate N."

**Strong answer.** "The maximum is always ≤ N, so it **underestimates**. The minimum-variance unbiased estimator is
m + m/k − 1 = 60 + 15 − 1 = **74**: add the average gap between observed serials." This is the German-tank
problem; panels use it to see whether you notice an estimator's bias.

## Q7. "What is the bootstrap, and when does it fail?"

**Strong answer.** "Resample the data with replacement many times, recompute the statistic, and use the spread of the
results as its sampling distribution — good for a median, a ratio or a percentile, where no simple SE formula
exists." **Fails or misleads:** with dependent data unless you resample the right unit (users, not their events;
blocks of days, not single days); for extremes like the maximum; and it cannot fix a **biased sample**.

## Q8. "We measured click-through on 50,000 sessions from 5,000 users. Is the usual SE right?"

**Strong answer.** "No — sessions from the same user are correlated, so the effective sample is smaller. With m = 10
sessions per user and intra-user correlation ρ = 0.2, the **design effect** is 1 + (m − 1)ρ = 2.8: the variance is
2.8 times the naive one and the SE √2.8 ≈ **1.67 times**. Compute per-user metrics, cluster the SEs, or use the
delta method for the ratio."

**Trap:** treating events as independent and declaring a tiny difference significant.

## How you are judged

Strong candidates name the estimator's bias and how it shrinks with n, put an interval on every estimate, and ask
"what is the independent unit?". Weak candidates give point estimates and textbook definitions.`,
    workedExample: `**Interviewer: "We launched a ₹10,000 consumer loan six months ago. Risk wants the default rate for pricing.
Here is what we have."**

**Stage 1 — month 2: 20 loans matured, 0 defaults.**

- MLE = 0/20 = 0. "I would not report 0%."
- Exact 95% upper bound: solve (1 − p)²⁰ = 0.05 → p = 1 − 0.05^(1/20) ≈ **13.9%**; the rule of three gives 15%.
- "Statement: no defaults so far; with 20 loans we cannot rule out a rate as high as about 14%."

**Stage 2 — month 6: 1,500 matured, 120 defaults.**

- p̂ = 120/1,500 = 8.0%; SE = √(0.08 × 0.92/1,500) ≈ 0.70 points.
- 95% CI ≈ 8.0% ± 1.96 × 0.70 = **6.6% to 9.4%**.
- "Pricing should test both ends: at 9.4% is the product still profitable?"

**Stage 3 — "How many more matured loans to know it within ±1 point?"**

- n = 1.96² × 0.08 × 0.92 / 0.01² ≈ **2,828** matured loans. "We have 1,500, so about 1,300 more."

**Stage 4 — the questions that win the round.**

- "Are these 1,500 representative? Early loans went to the pilot cities and existing customers — a rosier mix
  than the national launch. The interval covers sampling error, **not** that bias."
- "Default is defined at 90 days past due. Loans disbursed in the last three months cannot have defaulted yet;
  I counted only matured loans, otherwise the rate is biased down."

What scores: no zero reported as a rate, intervals with their meaning, sample size with the formula shown, and the
two biases a CI cannot fix.`,
    mcqs: [
      mcq('Five delivery bikes are seen with serial numbers whose largest value is 100. Bikes are numbered 1 to N. Which is the unbiased estimate of N?', [
        ['100, since no serial above the maximum has been seen', false],
        ['200, double the largest serial number that was seen', false],
        ['119, from m + m/k − 1 with m = 100 and k = 5', true],
        ['105, from adding the number of bikes seen to the max', false],
      ], 'The sample maximum is always at most N, so it is biased low. Adding the average gap between observed serials, m/k − 1, gives the minimum-variance unbiased estimator: 100 + 20 − 1 = 119.'),
      mcq('A survey must estimate a share to within ±3 points at 95% confidence, with no idea of the true share. About how many responses are needed?', [
        ['About 385, from 1.96 × 0.5 ÷ 0.03 squared once', false],
        ['About 1,068, from 1.96² × 0.25 ÷ 0.03²', true],
        ['About 2,401, the standard figure for any survey', false],
        ['About 4,268, from doubling the margin of error', false],
      ], 'n = z² p(1 − p)/m² with the worst case p = 0.5: 3.8416 × 0.25 / 0.0009 ≈ 1,067.1, so 1,068. 2,401 is the size for ±2 points.'),
      mcq('Group A has mean 10 and group B mean 13, each with standard error 1. Their 95% confidence intervals overlap. What do you conclude?', [
        ['The difference is not significant because the intervals overlap', false],
        ['The difference has p ≈ 0.034 when it is tested directly', true],
        ['Nothing can be said without the raw data from both groups', false],
        ['The difference is significant only at the 10% level', false],
      ], 'The SE of the difference is √(1² + 1²) ≈ 1.41, so z = 3/1.41 ≈ 2.12 and p ≈ 0.034. Overlapping 95% intervals do not imply a non-significant difference.'),
    ],
    checkpoint: [
      ck(SB, 'A default-rate estimate comes with a 95% confidence interval of 6.6% to 9.4%. Which interpretation is correct?', [
        ['There is a 95% probability that the true rate lies inside this particular interval', false],
        ['95% of individual borrowers have a default risk between 6.6% and 9.4%', false],
        ['Intervals built this way cover the true rate in 95% of repeated samples', true],
        ['If we sampled again, 95% of the new estimates would fall in this interval', false],
      ], 'In the frequentist reading the true rate is fixed; the 95% describes the procedure\'s long-run coverage. The interval is about the average rate, not individual borrowers, and new estimates need not land in it 95% of the time.'),
      ck(SB, 'A marketplace onboarded 300 new merchants and none has committed fraud so far. What is a reasonable 95% upper bound on their fraud rate?', [
        ['0%, which is the maximum likelihood estimate', false],
        ['About 1%, from the rule of three, 3 ÷ 300', true],
        ['About 5%, the significance level of the test', false],
        ['About 33%, from one fraud in every 3 merchants', false],
      ], 'With zero events in n trials, solving (1 − p)ⁿ = 0.05 gives p ≈ 3/n; here the exact value is about 0.99%. Reporting the MLE of 0% hides how little 300 merchants can tell you.'),
      ck(SB, 'Click-through is measured on 50,000 sessions from 5,000 users (10 each), with intra-user correlation 0.2. By what factor is the naive standard error too small?', [
        ['About 1.67, the square root of the design effect 2.8', true],
        ['About 3.16, the square root of the 10 sessions per user', false],
        ['Exactly 2.8, the design effect applied to the SE itself', false],
        ['It is not too small, as 50,000 sessions is a large sample', false],
      ], 'Design effect = 1 + (m − 1)ρ = 1 + 9 × 0.2 = 2.8 multiplies the variance; the SE grows by √2.8 ≈ 1.67. The factor would be √10 only if a user\'s sessions were perfectly correlated.'),
    ],
  },

  /* ── RAPID_FIRE ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_IV_PROBABILITY_RAPID_FIRE',
    notes: `A screening call: thirty questions in about ten minutes. One correct line each. Assume fair dice and coins,
independent trials and 365-day years unless told otherwise. Cover the answer, say yours aloud, then check.

## Puzzles

1. **P(sum of two dice is 7)?** — 1/6.
2. **P(at least one 6 | sum is 7)?** — 1/3.
3. **Expected rolls to the first 6?** — 6.
4. **Expected rolls until two 6s in a row?** — 42.
5. **Expected flips until HT? Until HH?** — 4 and 6.
6. **P(at least one 6 in six rolls)?** — 1 − (5/6)⁶ ≈ 66.5%.
7. **People for a >50% shared birthday?** — 23.
8. **Packets to collect all six cards, one per packet?** — 14.7.
9. **Expected fixed points of a random shuffle of n cards?** — 1, for any n.
10. **Value of "roll, reroll once if you like"?** — 4.25.

## Distributions

11. **Mean and variance of a Poisson(λ)?** — Both λ.
12. **Variance ≫ mean in count data?** — Overdispersion; try a negative binomial.
13. **Exponential with mean 10 min: median?** — 10 ln 2 ≈ 6.9 min.
14. **Memoryless continuous distribution?** — The exponential.
15. **SD of the sum of independent SDs 3 and 4?** — 5.
16. **P(Z > 2) for a standard normal?** — About 2.3%.
17. **SE of a mean with SD 1,200 and n = 400?** — 60.
18. **Does the CLT make the data normal?** — No, the sample mean.
19. **Binomial(1,000, 0.003) is close to?** — Poisson(3).
20. **SD of the sum of 10 dice?** — √(10 × 35/12) ≈ 5.4.

## Bayes and estimation

21. **Odds form of Bayes?** — Posterior odds = prior odds × likelihood ratio.
22. **LR of a positive result?** — Sensitivity ÷ (1 − specificity).
23. **Which travels between populations: precision or TPR?** — TPR (and FPR).
24. **Monty Hall, host knows: switch wins?** — 2/3; 1/2 if the host opens at random.
25. **Why n − 1 in the variance?** — It makes the variance unbiased.
26. **Is the sample SD unbiased?** — No, biased low.
27. **MLE of a Poisson rate?** — The sample mean.
28. **0 events in n trials, 95% upper bound?** — About 3/n.
29. **Sample size for ±2 points, unknown share?** — About 2,401.
30. **Overlapping 95% CIs mean no significant difference?** — No; test the difference.

## Scoring

27+ correct and quick: strong. 22–26: revise the misses. Under 22, or adding probabilities of overlapping events,
or "precision is a property of the model": back to the question sets.`,
    mcqs: [
      mcq('Rapid fire: "A fair die is rolled six times. Probability of at least one 6?"', [
        ['Exactly 1, as six rolls cover six faces', false],
        ['About 66.5%, from 1 − (5/6)⁶', true],
        ['About 33.5%, from (5/6) to the sixth', false],
        ['Exactly 1/6, as each roll is independent', false],
      ], 'P(no 6 in six rolls) = (5/6)⁶ ≈ 0.335, so P(at least one) ≈ 0.665. Six chances of 1/6 do not add to certainty because the events overlap.'),
      mcq('Rapid fire: "An exponential wait has a mean of 10 minutes. What is its median?"', [
        ['10 minutes, the same as the mean', false],
        ['5 minutes, half of the mean wait', false],
        ['About 6.9 minutes, 10 × ln 2', true],
        ['About 14.4 minutes, 10 ÷ ln 2', false],
      ], 'Solving 1 − e^(−t/10) = ½ gives t = 10 ln 2 ≈ 6.93. The exponential is right-skewed, so the median sits below the mean.'),
      mcq('Rapid fire: "A test has 95% sensitivity and 98% specificity. Likelihood ratio of a positive?"', [
        ['About 0.97, the average of the two', false],
        ['47.5, from 0.95 ÷ (1 − 0.98)', true],
        ['19, from 0.95 ÷ (1 − 0.95)', false],
        ['0.93, from 0.95 × 0.98 together', false],
      ], 'LR+ = sensitivity / false-positive rate = 0.95 / 0.02 = 47.5. It multiplies the prior odds; on its own it is not a probability.'),
      mcq('Rapid fire: "Ten fair dice are rolled. What is the SD of their total?"', [
        ['About 17.1, ten times one die\'s SD', false],
        ['About 5.4, the square root of 10 × 35/12', true],
        ['About 29.2, the variance of the total', false],
        ['About 1.7, the SD of a single die', false],
      ], 'One die has variance 35/12; ten independent dice have variance 350/12 ≈ 29.17, so the SD is about 5.4. SDs scale with √n, not n.'),
      mcq('Rapid fire: "A fair coin is tossed 10 times. Probability of 8 or more heads?"', [
        ['7/128, about 5.5%', true],
        ['3/10, about 30%', false],
        ['1/1024, under 0.1%', false],
        ['45/1024, about 4.4%', false],
      ], 'C(10,8) + C(10,9) + C(10,10) = 45 + 10 + 1 = 56 of 1,024 equally likely sequences: 56/1024 = 7/128 ≈ 0.055. 45/1024 counts exactly 8 only.'),
    ],
  },

  /* ── MOCK ──────────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_IV_PROBABILITY_MOCK',
    notes: `The interviewer's script for a 35-minute probability and statistics round for an entry data-scientist role at
a fintech or product company. Have a friend read the interviewer's lines with a whiteboard or paper between you.
State assumptions before every number. The scoring notes are what the panel writes down.

## Warm-up (3 min)

"Three independent servers are each up 90% of the time. The service works if at least two are up. Availability?"

- **Strong:** P(exactly two) + P(all three) = 3 × 0.9² × 0.1 + 0.9³ = 0.243 + 0.729 = **97.2%**, assumption of
  independence stated, plus "a shared power supply would break that".
- **Weak:** 90% or 99.9%.

## Q1 — Puzzle (6 min)

"You roll a die and can take its face in rupees, or pay ₹1 to roll again — once. What do you do?"

- **Strong:** continuing is worth 3.5 − 1 = 2.5, so keep anything from 3 up (keeping a 3 beats 2.5), reroll a 1 or
  2. Value = (3 + 4 + 5 + 6)/6 + (2/6) × 2.5 = 3 + 0.833 ≈ **₹3.83**. Checks it against ₹3.50 for not
  playing the reroll at all.
- **OK:** right threshold, arithmetic slip.
- **Weak:** "Reroll anything below 4" with no reason.

## Q2 — Distributions (6 min)

"A UPI merchant gets 0.5 chargebacks a day on average. The risk team alerts when a merchant has any chargeback in a
week. How often does a normal merchant trigger it? Is the alert useful?"

- **Strong:** Poisson with λ = 3.5 per week; P(at least one) = 1 − e^(−3.5) ≈ **97%**. "The alert fires for almost
  every normal merchant — useless. Alert on a count far above the merchant's own baseline, or on the rate per
  transaction."
- **Weak:** computes nothing, or says 50%.

## Q3 — Bayes (8 min)

"0.5% of loan applicants submit forged salary slips. Our document model flags 95% of forgeries and 1% of genuine
slips. What share of flagged applicants are forgers? Then a second model, trained on the same features, also
flags. What now?"

- **Strong:** odds 1 : 199 × 95 → **32%**; for the second flag, refuses to multiply blindly: "same features, so the
  errors are correlated — I'd measure the joint flag rates on labelled data; with independence it would be about
  98%, the true value is lower."
- **OK:** 32%, then 98% with no caveat.
- **Weak:** "95%."

## Q4 — Estimation (7 min)

"Average loan ticket in a sample of 400 is ₹30,000, SD ₹12,000. Give a 95% interval. Then: the sample came from the
app's first month. What worries you?"

- **Strong:** SE = 12,000/√400 = 600; interval **₹28,824 to ₹31,176** (1.96 × 600 = 1,176). Then: early adopters are
  not the launch population; seasonality; tickets are skewed, so the mean is fine for totals but report the
  median for the "typical" loan. The interval covers sampling error only.
- **Weak:** the interval, nothing about the sample.

## Q5 — Judgement (5 min)

"An analyst reports: 'Conversion in Pune was 4.1% vs 3.6% in Nagpur; the CIs overlap, so there is no difference.'
Respond."

- **Strong:** overlapping intervals do not imply no difference — test the difference directly; also asks about
  sample sizes, the unit of analysis (users or sessions), and whether the cities differ in mix.
- **Weak:** agrees.

## Scoring

| Area | Weight | Hire bar |
|---|---|---|
| Assumptions stated before numbers | 20% | every question |
| Correct method (complement, odds, variances add) | 35% | Q1–Q4 |
| Arithmetic | 15% | slips forgiven if caught |
| Challenging the data or independence | 30% | Q3 and Q4 at least |

A confident "95%" in Q3, or an interval with no word about the first-month sample, outweighs two good answers.`,
    mcqs: [
      mcq('In the warm-up, three independent servers are each up 90% of the time and the service needs at least two. What is its availability?', [
        ['90.0%, the availability of any one server', false],
        ['99.9%, from one minus the chance all three fail', false],
        ['72.9%, from all three servers being up together', false],
        ['97.2%, from P(exactly two up) + P(all three up)', true],
      ], '3 × 0.9² × 0.1 + 0.9³ = 0.243 + 0.729 = 0.972. 99.9% is the availability if one server were enough; 72.9% if all three were needed.'),
      mcq('In Q1, a reroll costs ₹1. For which first-roll faces should you pay to reroll?', [
        ['Faces 1, 2 and 3, as they are below the mean of 3.5', false],
        ['Faces 1 and 2 only, as rerolling is worth 3.5 − 1 = 2.5', true],
        ['Only the face 1, as any other face covers the ₹1 fee', false],
        ['Never, as a paid reroll can never raise the value', false],
      ], 'A reroll is worth its expected face minus the fee: 2.5. Keep any face above 2.5 — that is 3 or more — and reroll 1 or 2. The game is then worth (3 + 4 + 5 + 6)/6 + (2/6) × 2.5 ≈ ₹3.83.'),
      mcq('In Q2, a merchant averages 0.5 chargebacks a day (Poisson). How often would an "any chargeback this week" alert fire for a normal merchant?', [
        ['About 39%, from the chance of one in a single day', false],
        ['About 50%, the chance a week is above average', false],
        ['About 97%, from 1 − e^(−3.5) for the week', true],
        ['About 3%, from e^(−3.5), the chance of a quiet week', false],
      ], 'The weekly count is Poisson with λ = 7 × 0.5 = 3.5, so P(at least one) = 1 − e^(−3.5) ≈ 0.970. An alert that fires for 97% of normal merchants carries no information.'),
      mcq('In Q4, a sample of 400 loans has mean ₹30,000 and SD ₹12,000. What is the 95% confidence interval for the mean ticket?', [
        ['₹28,824 to ₹31,176, from 1.96 × ₹600 either side', true],
        ['₹6,480 to ₹53,520, from 1.96 × ₹12,000 either side', false],
        ['₹29,400 to ₹30,600, from ₹600 either side of the mean', false],
        ['₹27,600 to ₹32,400, from 4 × ₹600 either side', false],
      ], 'SE = 12,000/√400 = 600; ±1.96 × 600 = ±1,176. The wide range uses the SD of individual loans — that describes the loans, not the uncertainty in their mean.'),
      mcq('In Q3, the second document model was trained on the same features as the first. Why should the candidate not multiply the two likelihood ratios?', [
        ['Likelihood ratios may only be multiplied for medical tests', false],
        ['The two models\' errors are correlated, so the second flag adds less', true],
        ['Multiplying ratios always gives a posterior above 100%', false],
        ['The second model\'s ratio must be divided, not multiplied', false],
      ], 'Multiplying assumes the flags are conditionally independent given the class. Models built on the same features fail on the same genuine applicants, so the joint likelihood ratio must be measured, not assumed.'),
    ],
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_IV_PROBABILITY_CHECKPOINT',
    notes: `Ten questions across the topic — puzzles, distributions, Bayes and estimation. Assume fair dice and coins and
independent trials unless the question says otherwise. Work each on paper before you choose, as you would at the
whiteboard.`,
    checkpoint: [
      ck(PB, 'Two cards are drawn without replacement from a shuffled 52-card deck. What is the probability they are the same colour?', [
        ['1/2, as each card is red or black', false],
        ['25/51, from 25 same-colour cards left of 51', true],
        ['1/4, from 1/2 × 1/2 for the two draws', false],
        ['26/51, from 26 cards of each colour', false],
      ], 'Whatever the first card, 25 of the remaining 51 share its colour: 25/51 ≈ 0.490. Drawing without replacement makes it slightly less than ½.'),
      ck(PB, 'A brand puts one of five equally likely player cards in every packet. What is the expected number of packets to collect all five?', [
        ['5 packets, one for each of the five cards', false],
        ['About 11.4 packets, from 5 × (1 + ½ + ⅓ + ¼ + ⅕)', true],
        ['25 packets, from five times five cards per set', false],
        ['About 8.3 packets, from 5 ÷ 0.6 for the last card', false],
      ], 'With k cards collected, the next new one takes 5/(5 − k) packets on average. Summing for k = 0 to 4: 5(1 + 1/2 + 1/3 + 1/4 + 1/5) = 137/12 ≈ 11.42.'),
      ck(PB, 'A bag has one fair coin and one two-headed coin. You pick one at random and flip three heads. What is the probability the next flip is heads?', [
        ['1/2, because coin flips are independent', false],
        ['8/9, the chance you hold the two-headed coin', false],
        ['17/18, averaging over which coin you hold', true],
        ['3/4, the prior chance of heads before flipping', false],
      ], 'Posterior P(two-headed) = 1 / (1 + 1/8) = 8/9. Then P(heads next) = 8/9 × 1 + 1/9 × ½ = 17/18. Flips are independent only given the coin.'),
      ck(PB, 'In a city 85% of cabs are green and 15% blue. A witness who identifies colours correctly 80% of the time says the cab was blue. What is P(blue)?', [
        ['80%, the witness\'s accuracy', false],
        ['15%, the share of blue cabs', false],
        ['About 41%, from odds 15 × 4 : 85', true],
        ['About 68%, from 0.85 × 0.80', false],
      ], 'Prior odds blue : green = 15 : 85; the likelihood ratio of "says blue" is 0.8/0.2 = 4. Posterior odds 60 : 85, so P(blue) = 60/145 ≈ 0.41 — still less likely than green.'),
      ck(PB, 'Orders per minute at a dark store average 4 (Poisson). In what share of minutes do more than 6 orders arrive?', [
        ['About 1.8%, the chance of a minute with no orders', false],
        ['About 11.1%, from 1 − P(N ≤ 6) with λ = 4', true],
        ['About 50%, since 6 is close to the mean of 4', false],
        ['About 2.3%, the share beyond two standard deviations', false],
      ], 'P(N ≤ 6) for Poisson(4) is about 0.889, so P(N > 6) ≈ 0.111. The normal 2.3% does not apply to a small, skewed count; e⁻⁴ ≈ 1.8% is P(0).'),
      ck(PB, 'Autos pass a stop at random times, 10 minutes apart on average (a Poisson process). You arrive at a random moment. What is your expected wait?', [
        ['5 minutes, half of the average gap between autos', false],
        ['10 minutes, as you tend to land inside long gaps', true],
        ['20 minutes, the length of the gap you land inside', false],
        ['2.5 minutes, a quarter of the average gap', false],
      ], 'Random arrival is more likely to fall in a long gap (the inspection paradox). For a Poisson process the wait is exponential with mean 10; the gap you land in averages 20. Five minutes holds only for a fixed timetable.'),
      ck(SB, 'Why does the usual sample variance divide by n − 1 rather than n?', [
        ['Deviations from the sample mean understate spread, and n − 1 corrects it', true],
        ['Dividing by n − 1 makes the sample standard deviation unbiased as well', false],
        ['It is a convention for small samples that can be ignored past n = 30', false],
        ['The last observation is fixed by the others and must be left out', false],
      ], 'The sample mean is fitted to the data, so squared deviations from it are smaller on average; dividing by n − 1 makes the variance estimator unbiased. Its square root, the SD, is still biased low.'),
      ck(SB, '7 of 10 test customers accepted an offer. A colleague asks what "maximum likelihood estimate of the acceptance rate" means here. Which answer is right?', [
        ['0.5, the rate that is most likely before any data is seen', false],
        ['0.7, the rate that makes 7 of 10 most probable', true],
        ['0.8, as maximum likelihood rounds the rate upward', false],
        ['0.64, the rate shrunk toward the population average', false],
      ], 'The likelihood p⁷(1 − p)³ is largest at p = 0.7. A shrunk estimate is a Bayesian or regularised one, not the MLE; with 10 customers the MLE is noisy, which is why an interval should come with it.'),
      ck(SB, 'A team bootstraps the mean revenue per session by resampling 80,000 sessions, but those sessions come from 6,000 users. What is wrong?', [
        ['Bootstrapping only works for medians and percentiles', false],
        ['80,000 resamples are too many and inflate the variance', false],
        ['It should resample users, as one user\'s sessions are correlated', true],
        ['The bootstrap needs the data to be normally distributed', false],
      ], 'The bootstrap must resample the independent unit. Resampling sessions treats a user\'s correlated sessions as independent and gives an interval that is too narrow.'),
      ck(SB, 'Risk wants the share of borrowers using a feature to within ±2 points at 95% confidence, and a pilot says the share is about 10%. About how many borrowers must be sampled?', [
        ['About 2,401, the worst-case figure', false],
        ['About 865, from 1.96² × 0.09 ÷ 0.02²', true],
        ['About 225, from 0.09 ÷ 0.02 squared', false],
        ['About 4,802, double for a two-sided CI', false],
      ], 'n = z² p(1 − p)/m² = 3.8416 × 0.09 / 0.0004 ≈ 864.4, so 865. 2,401 assumes p = 0.5, which is the safe choice only when nothing is known about the share.'),
    ],
  },

  /* ══ DS_ML_CASE ═════════════════════════════════════════════════════════════════════════════ */

  /* ── FRAMING_CASES ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_ML_CASE_FRAMING_CASES',
    notes: `The ML case round — often called "ML system design" — is a 30–45 minute open prompt: "Design fraud detection
for our wallet", "How would you recommend products on the home screen?" It appears at product companies,
fintechs, e-commerce and quick-commerce firms, and in GCC data-science loops. There is no single right answer. The
panel scores **structure, judgement and trade-offs**, and most of the score is decided in the first ten minutes —
the framing. Candidates who open with "I'd use XGBoost" have already lost those marks.

Year 3 framed a churn problem with a cutoff date. Here you frame **products**, aloud, under questioning.

## The framing, in order

1. **Objective and decision.** What business number should move, and *what decision* will the prediction drive —
   rank, block, call, stock? A prediction nobody acts on is a dashboard.
2. **Is ML needed?** What does the business do today, and what simple rule or heuristic is the baseline to beat?
3. **The target.** The unit (user, transaction, user × item), the label, the horizon, and the moment the
   prediction is made.
4. **Constraints.** Latency, scale, cost of each error type, explainability and regulation (RBI rules for credit,
   consent for personal data), how fast labels arrive.
5. **Success.** The offline metric, the online metric, and the guardrails.

Then — and only then — data, features, model, deployment and monitoring (the next three units).

## Case 1 — "Recommend items on a quick-commerce home screen"

**Clarify:** which surface (the "Picked for you" rail on the home screen), whose objective (orders and basket value,
not clicks — a rail of discounted snacks gets clicks and loses margin), which catalogue (only items **in stock at the
user's dark store**, a few thousand SKUs).

**Decision:** which 20 items fill the rail, per session.

**Target:** unit = (user, item) at session start; label = item added to cart in that session (an order is a
stronger, sparser label — use it as a weight or a second head).

**Is ML needed?** Grocery is dominated by repeat purchase. A **"buy again" list ranked by how often and how
recently** the user bought each item is a strong baseline; the model must beat it on next-session add-to-carts
before it ships. Say this — it shows you know the domain.

**Constraints:** under ~100 ms for the rail; stock changes by the minute; new users with no history (cold start, next
unit).

**Shape of the answer:** candidate generation (buy-again, items often bought together, popular in this store this
hour) → a ranking model over a few hundred candidates → business rules (in stock, no repeated brand five times).

## Case 2 — "Detect payment fraud for a wallet / UPI app"

**Decision:** at authorisation, **allow, step up (re-enter PIN / OTP), or block**. Three actions, not two — step-up
is cheap friction and is where most medium-risk scores should go.

**Target:** unit = transaction; label = confirmed fraud (chargeback, user complaint confirmed by ops). Labels are
**late** (weeks) and **incomplete** (fraud on a stolen account the user never notices).

**Constraints:** tens of milliseconds inside the payment flow; fraud about 0.2% of transactions; fraudsters adapt
to the model; a false block on a ₹40 chai payment angers a real customer.

**Is ML needed?** Rules (velocity limits, device blacklists, new-payee caps) already exist and stay as guardrails;
the model adds a **ranking** of risk the rules cannot express. Success = fraud loss (in basis points of payment
value) down at the same or lower false-decline rate.

## Case 3 — "Reduce churn on an OTT subscription with a retention offer"

**The trap:** "Predict churn probability; send the offer to the top 10%." The highest-risk group is full of **lost
causes** — people who will cancel whatever you offer — and the offer is wasted on them. Lower down sit the **sure
things**, who would renew anyway, and the offer only gives them a discount they did not need.

**Strong framing:** the objective is **incremental** renewals per rupee of offer. The quantity that matters is
**uplift**: P(renew | offer) − P(renew | no offer). Target the *persuadables*. That needs data where the offer was
**randomised** — so the first step is a randomised campaign on a slice of users, then an uplift model (two models,
or a single model with a treatment feature), validated with a holdout.

**Target:** unit = subscriber, 30 days before the renewal date; label = renewed or not at renewal.

## When ML is the wrong answer — say it when it is true

- A stable rule already does the job ("block cards on the RBI-reported list").
- No labels and no way to get them soon.
- Forty slow-moving SKUs with steady demand: a seasonal-naive forecast (same weekday last week) is nearly as good
  and anyone can maintain it.
- Every decision must be fully explained and the gain over a scorecard is small.

## How you are judged

| Strong | Weak |
|---|---|
| Names the decision the prediction drives | Starts with an algorithm |
| States a baseline and asks whether ML is needed | Assumes ML |
| Defines unit, label, horizon and prediction time | "We predict fraud" |
| Separates offline, online and guardrail metrics | Accuracy |
| Raises cost asymmetry, latency, labels, regulation | Ignores constraints |`,
    mcqs: [
      mcq('An interviewer says "Design recommendations for our grocery app\'s home screen." What is the best first move?', [
        ['Propose a two-tower neural model, since it scales to large catalogues', false],
        ['Ask which business number should move and what the rail decides', true],
        ['Collect every user event available and train a model on all of it', false],
        ['Pick NDCG@10 as the metric, since it is standard for ranking tasks', false],
      ], 'Framing starts with the objective and the decision: orders or basket value from a rail of in-stock items, not clicks. Model and metric choices follow from that, not the other way round.'),
      mcq('For a wallet\'s fraud model, why is "allow, step up, or block" a better decision design than "allow or block"?', [
        ['Three classes give the model more labelled training data', false],
        ['Medium-risk payments get cheap friction instead of a false block', true],
        ['Regulators require exactly three outcomes for every payment', false],
        ['A third class always raises the model\'s offline ROC-AUC score', false],
      ], 'Most risky-looking payments are genuine. An OTP or PIN re-entry stops most fraud at little cost to a real customer, so the hard block can be kept for the highest scores.'),
      mcq('An OTT team wants to send a retention discount to the 10% of subscribers with the highest churn probability. What is the main flaw?', [
        ['Churn probability cannot be predicted from viewing behaviour at all', false],
        ['Ten percent is too small a share to measure any retention effect', false],
        ['High-risk users include many who leave anyway; target uplift instead', true],
        ['Discounts should go to the lowest-risk users, as they are most loyal', false],
      ], 'The goal is renewals caused by the offer. Uplift — P(renew | offer) − P(renew | no offer) — finds persuadable users; it needs randomised offer data to estimate.'),
    ],
    checkpoint: [
      mcq('A quick-commerce candidate proposes a deep model for the "Picked for you" rail. Which baseline should the model be required to beat first?', [
        ['A random selection of items from the whole catalogue', false],
        ['The most-clicked items across India in the last month', false],
        ['A "buy again" list ranked by purchase frequency and recency', true],
        ['The items with the deepest discounts in the user\'s store', false],
      ], 'Grocery demand is dominated by repeat purchases, so a buy-again heuristic is a strong, cheap baseline. A model that cannot beat it on next-session add-to-carts should not ship.'),
      mcq('Which situation most clearly does NOT need an ML model?', [
        ['Ranking 6,000 in-stock products for each user\'s home screen', false],
        ['Blocking cards that appear on a list of reported stolen cards', true],
        ['Scoring every payment for fraud risk within 50 milliseconds', false],
        ['Estimating each subscriber\'s response to a retention offer', false],
      ], 'A known-bad list is a deterministic lookup; a rule is exact, cheap and explainable. The other three need a ranking or an estimate that rules cannot express.'),
      mcq('In framing a fraud case, a candidate says "the label is fraud". What should a strong answer add?', [
        ['That fraud should be predicted with a deep model for accuracy', false],
        ['The unit, the source of the label and how late it arrives', true],
        ['That the label should be balanced to 50% fraud before training', false],
        ['That fraud must be defined by the model\'s own predictions', false],
      ], 'Confirmed fraud comes from chargebacks and complaints, per transaction, often weeks later and incomplete. Those facts shape the training window, the evaluation and the monitoring.'),
    ],
  },

  /* ── DATA_FEATURE_CASES ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_ML_CASE_DATA_FEATURE_CASES',
    notes: `After the framing, the interviewer asks "What data would you use?" The weak answer is a list of columns. The
strong answer is about **time**: what is known at the moment of prediction, when the label becomes known, and what
the model will see for a user or item it has never met. Three cases.

## Start with an inventory

| Source | Examples | Watch for |
|---|---|---|
| Events | app opens, searches, clicks, add-to-cart | logging changes between app versions |
| Transactions | orders, payments, EMIs | refunds and reversals that arrive later |
| Profiles | city, device, KYC tier, signup channel | values overwritten in place (no history) |
| External | bureau score, pin-code data | consent, cost per call, coverage gaps |
| Text and images | reviews, chat transcripts, documents | personal data; needs masking |

## Case 1 — Fraud labels that arrive late

A wallet's chargebacks arrive over 90 days; about **60% arrive within 30 days**. True fraud is 0.2% of transactions.

**The trap:** retraining every week on "the last 30 days". In that window only 60% of the fraud is labelled yet,
so the data shows 0.2% × 0.6 = **0.12%**, and 40% of recent frauds sit in the training set **labelled genuine** —
exactly the newest fraud patterns the model most needs to learn.

**Strong answer:**

- A **label-maturity window**: train only on transactions old enough for labels to be mostly complete (say 90 days),
  and evaluate on a matured, *later* period.
- Use **early proxies** for the recent period — a user's "I didn't make this payment" report within 48 hours —
  for monitoring, not as a substitute label.
- Say the cost: the model is always about three months behind; rules and analysts cover new attack patterns in
  the meantime.

## Case 2 — Leaky features in a churn model

The interviewer shows a feature list for a subscription-churn model and asks which to keep.

| Feature | Verdict | Why |
|---|---|---|
| days since last login, computed on the extraction date | **leak** | for churners, it grows *after* they leave |
| cancellation reason | **leak** | exists only for people who already cancelled |
| support tickets in the 7 days after the cutoff | **leak** | future information |
| plan-downgrade flag set by the cancellation flow | **leak** | written by the outcome itself |
| watch hours in the 28 days before the cutoff | keep | known at prediction time |
| payment failures in the last two cycles | keep | known, and causally plausible |

**Strong answer:** build every feature **as of the cutoff** (point-in-time joins, a feature store that keeps
history), and run a smell test — any single feature with AUC above about 0.95 on its own is a leak until proven
otherwise.

**Also say:** a profile table that is **overwritten in place** (city, KYC tier) leaks the present into the past;
you need its history, or you leave it out.

## Case 3 — Cold start in recommendations

**New users** (no history): use context the app has from the first second — city, dark store, time of day, device,
acquisition channel — and show *popular in this store at this hour*; ask one onboarding question (veg / non-veg)
if the product allows. Train the ranker with a "history length" feature so it learns to lean on context when
history is short.

**New items** (no interactions): use content — category, brand, price band, pack size, a text embedding of the
title — so the item lands near similar items; reserve a small **exploration** share of slots (say 5%) so new items
collect interactions.

**Trap:** "collaborative filtering will handle it" — a matrix factorisation has no row for a user or item it never
saw.

## One more the panel likes: the labels you never see

A credit model trained on **approved** loans has no labels for rejected applicants, so it learns only within the
policy's past choices (selection bias). Remedies: a small randomised approval band below the cutoff (with risk
sign-off and limits), bureau outcomes of rejected applicants from other lenders, or reject inference — each named
with its cost.

## How you are judged

Strong candidates ask "when is this known?" for every feature and "when does the label arrive?" before training.
Weak ones list every column and discover the leak when the model scores 0.99.`,
    workedExample: `**Interviewer: "We want to predict, at the moment of disbursal, whether a two-wheeler loan will be 30+ days past
due within six months. Walk me through the data and the training table."**

1. **Prediction time and label.** "Prediction at disbursal (T0). Label = 30+ DPD at any point in T0 to T0 + 6 months.
   So only loans disbursed at least six months before the training date have a complete label."

2. **Training window.** "If today is October 2026, training loans are those disbursed up to April 2026; I'd keep
   January–April 2026 as an out-of-time test and train on 2025."

3. **Features, each with its timestamp.**

       applicant: age, income declared, employment type          known at T0
       bureau:    score and enquiries pulled at application       known at T0 (stored pull, not today's)
       loan:      amount, tenure, down-payment share, dealer      known at T0
       dealer:    the dealer's past 30+ DPD rate                  only loans matured BEFORE T0

   "The dealer default rate is a classic leak if it is computed over all loans including those after T0."

4. **Explicit exclusions.** "Collections calls, EMI bounce counts and the post-disbursal verification field are all
   written after T0 — excluded, and I'd write that list into the README."

5. **The bias I can't fix by splitting.** "Rejected applicants have no outcome. The model learns only among
   approved loans; if it is used to approve people the old policy rejected, its error there is unknown. I'd ask risk
   for a small, capped test band, or at least compare score distributions of the approved and rejected groups."

6. **Sanity checks.** "Default rate per disbursal month (should be stable or explainable), single-feature AUCs (a
   0.98 means a leak), and row counts after every join."

What scores: a timestamp on every feature, the matured-label window stated, and selection bias raised without
being asked.`,
    mcqs: [
      mcq('A wallet retrains its fraud model weekly on the last 30 days. Chargebacks take up to 90 days, and 60% arrive within 30. What goes wrong?', [
        ['Nothing, as the most recent data is always the most useful for fraud', false],
        ['About 40% of recent frauds are labelled genuine during training', true],
        ['The model becomes too slow because 30 days of data is too large', false],
        ['The fraud rate looks higher than it really is, so it over-blocks', false],
      ], 'Only 60% of the window\'s fraud is labelled yet, so the data shows 0.12% instead of 0.2%, and the newest fraud patterns are taught as genuine. Train on a matured window instead.'),
      mcq('Which feature in a subscription-churn model is a leak?', [
        ['Watch hours in the 28 days before the cutoff date', false],
        ['Payment failures in the two billing cycles before the cutoff', false],
        ['Days since last login, computed on the data-extraction date', true],
        ['The number of profiles created on the account before the cutoff', false],
      ], 'Computed at extraction time, days since last login keeps growing for users who have already left, so it encodes the outcome. Features must be computed as of the cutoff.'),
      mcq('A new SKU has just been added to the catalogue. Why can a matrix-factorisation recommender not rank it?', [
        ['It has no learned vector, since it has no interactions yet', true],
        ['Its price is unknown until the first order has been placed', false],
        ['Matrix factorisation works only on numeric user features', false],
        ['New items must wait for the nightly retrain to be in stock', false],
      ], 'Matrix factorisation learns one vector per item from interactions; an unseen item has none. Content features (category, brand, price band, text embedding) and a small exploration share solve item cold start.'),
    ],
    checkpoint: [
      mcq('A dealer-level feature "past 30+ DPD rate of this dealer" is added to a loan-default model. When does it leak?', [
        ['When it is computed only from loans matured before the prediction date', false],
        ['When it is computed over all loans, including those disbursed later', true],
        ['When the dealer has fewer than 100 loans and the rate is noisy', false],
        ['When it is used alongside the applicant\'s bureau score at all', false],
      ], 'A target-derived feature must use only outcomes known at prediction time. Including loans disbursed after T0 — or the loan\'s own outcome — puts the future into the feature.'),
      mcq('A credit model is trained only on approved loans. What problem does no train–test split fix?', [
        ['Overfitting to the training data', false],
        ['No labels for rejected applicants', true],
        ['Class imbalance in the default label', false],
        ['Missing values in declared income', false],
      ], 'The old policy chose who got a loan, so outcomes exist only for approved applicants. Splitting approved loans differently cannot reveal how rejected applicants would have repaid; a capped test band or reject inference is needed.'),
      mcq('A single feature alone gives a churn model an AUC of 0.98. What is the right first reaction?', [
        ['Ship it, since one feature this strong makes the model simple', false],
        ['Treat it as a leak and check when that feature becomes known', true],
        ['Remove all other features, as they only add noise to it', false],
        ['Add interactions with it, since strong features combine well', false],
      ], 'Real churn signals rarely separate classes that cleanly. A near-perfect single feature is usually written by, or after, the outcome; check its timestamp before anything else.'),
    ],
  },

  /* ── MODEL_METRIC_CASES ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_ML_CASE_MODEL_METRIC_CASES',
    notes: `"Which model, and how would you measure it?" is where candidates recite algorithms. The panel wants three
things: an **offline metric that mirrors the decision**, a **baseline**, and an **online test** that proves the
model moved the business. The model choice itself is usually short: tabular data with a latency limit →
gradient-boosted trees; text or images → pretrained embeddings plus a light head; ranking → a two-stage system.

All figures in the cases are assumptions given for practice; the arithmetic was computed.

## Case 1 — Fraud: choosing a threshold by cost

A wallet handles **10 lakh** transactions a day; **0.2%** (2,000) are fraud. A missed fraud costs about **₹4,000**;
a false block costs about **₹150** (support, lost payment, churn risk). Two thresholds:

| Threshold | Recall | FPR | Frauds caught | False blocks | Precision | Missed-fraud cost | False-block cost | Total a day |
|---|---|---|---|---|---|---|---|---|
| A (stricter) | 80% | 0.5% | 1,600 | 4,990 | 24.3% | ₹16.0 lakh | ₹7.5 lakh | **₹23.5 lakh** |
| B (looser) | 90% | 2.0% | 1,800 | 19,960 | 8.3% | ₹8.0 lakh | ₹29.9 lakh | ₹37.9 lakh |

**Read it:** B catches 200 more frauds but blocks almost 15,000 more genuine payments; A is cheaper. The break-even
false-block cost is ₹8 lakh / 14,970 ≈ **₹53** — B wins only if a false block costs less than that, which a
step-up OTP (instead of a block) might achieve. That is the answer that earns the follow-up.

**Offline metric:** expected cost at the chosen threshold, recall at a fixed FPR, PR-AUC (not ROC-AUC — at 0.2%
prevalence ROC-AUC looks excellent for weak models). **Online:** fraud loss in basis points of payment value,
false-decline rate, OTP drop-off, complaints. **Baseline:** the current rule set.

## Case 2 — Retention calls: precision at capacity

A telecom's retention team can make **5,000 calls** in a campaign. 5% of subscribers churn. Assume a call saves
**20%** of the churners it reaches, a saved subscriber is worth **₹2,400**, and a call costs **₹40**.

    model: top 5,000 by score, precision 30% -> 1,500 churners reached -> 300 saved
           value 300 × ₹2,400 = ₹7.2 lakh; cost 5,000 × ₹40 = ₹2.0 lakh; net ≈ +₹5.2 lakh
    random 5,000 calls: 5% churners -> 250 reached -> 50 saved
           value ₹1.2 lakh; cost ₹2.0 lakh; net ≈ −₹0.8 lakh

**Metric:** precision (or lift) **at k = capacity**, not AUC — only the top 5,000 are ever called. **The caveat a
strong candidate adds:** the 20% save rate is assumed equal across segments; the top-risk group may be the least
saveable (see uplift in Framing). Prove the value online with a **randomised holdout** of top-scored users who are
not called.

## Case 3 — Dark-store demand: the wrong error metric and the wrong target

Three SKUs at one dark store on one day:

| SKU | Actual | Forecast | Abs. error | % error |
|---|---|---|---|---|
| Milk 500 ml | 500 | 470 | 30 | 6% |
| Bread | 120 | 140 | 20 | 17% |
| Saffron 1 g | 2 | 6 | 4 | 200% |

MAPE = (6% + 16.7% + 200%) / 3 ≈ **74.2%**; WAPE = 54 / 622 ≈ **8.7%**. MAPE is dominated by a two-unit SKU and
explodes at zero sales. **WAPE** (total absolute error / total actual) weights items by volume.

**The deeper point:** the business does not want the mean. A stockout of milk loses about ₹8 of margin a unit;
an unsold unit wastes about ₹2. The cost-minimising stock level is the **critical-ratio quantile**
8 / (8 + 2) = **0.8**. If tomorrow's demand is about normal with mean 400 and SD 60, stock about 400 + 0.84 × 60 ≈
**450**. So train for the 80th percentile with a **quantile (pinball) loss**, and judge by the cost of stockouts
plus waste. **Baseline:** same weekday last week.

## Recommendations, briefly

Offline: recall@k or NDCG@k on the **next** session's add-to-carts (a time-based split). Online A/B: orders per
session and basket value; guardrails: latency, out-of-stock clicks, diversity. Offline gains that do not move
online numbers usually mean the offline set does not look like the live traffic.

## How you are judged

| Strong | Weak |
|---|---|
| Ties the metric to the action and its cost | "Accuracy" or "AUC" for everything |
| Gives a baseline before any model | Starts with a neural network |
| Chooses a threshold by cost or capacity | Uses 0.5 |
| Names an online test and guardrails | Stops at the offline score |`,
    mcqs: [
      mcq('In the fraud case, threshold A costs ₹23.5 lakh a day and B ₹37.9 lakh. Below what cost per false block would B become the cheaper choice?', [
        ['Below about ₹150, the current false-block cost', false],
        ['Below about ₹53, from ₹8 lakh ÷ 14,970 blocks', true],
        ['Below about ₹4,000, the cost of a missed fraud', false],
        ['Below about ₹267, from ₹4,000 ÷ 15 extra blocks', false],
      ], 'B saves 200 missed frauds × ₹4,000 = ₹8 lakh but adds 19,960 − 4,990 = 14,970 false blocks. B is cheaper only if each costs less than ₹8,00,000 / 14,970 ≈ ₹53.'),
      mcq('For one dark store, a forecast has errors of 30, 20 and 4 units on SKUs selling 500, 120 and 2. Why is WAPE preferred to MAPE here?', [
        ['MAPE is 74.2%, dominated by the two-unit SKU; WAPE is 8.7%', true],
        ['WAPE ignores small SKUs entirely, which removes their noise', false],
        ['MAPE cannot be computed when any forecast exceeds the actual', false],
        ['WAPE is symmetric, while MAPE only penalises under-forecasts', false],
      ], 'MAPE averages percentage errors equally, so a 4-unit miss on a 2-unit SKU counts as 200%. WAPE = 54 / 622 ≈ 8.7% weights errors by volume; small SKUs still count, in proportion.'),
      mcq('A retention team can call only 5,000 subscribers. Which offline metric best reflects the value of the churn model?', [
        ['ROC-AUC over every subscriber, as it covers every threshold', false],
        ['Overall accuracy, since churners are only 5% of the base', false],
        ['Precision or lift among the top 5,000 scored subscribers', true],
        ['Log loss over the whole base, since calls need probabilities', false],
      ], 'Only the top 5,000 are ever acted on, so what matters is how many churners — and saveable churners — sit in that group. AUC rewards ordering among people nobody will call.'),
    ],
    checkpoint: [
      mcq('Stocking a dark store, a stockout loses ₹8 of margin a unit and an unsold unit wastes ₹2. Which forecast should drive the order quantity?', [
        ['The mean forecast, as it minimises squared error', false],
        ['The 20th percentile, to keep waste as low as possible', false],
        ['The 80th percentile, from the critical ratio 8 ÷ 10', true],
        ['The maximum demand seen in the last four weeks', false],
      ], 'The newsvendor critical ratio is underage cost / (underage + overage) = 8 / (8 + 2) = 0.8. Ordering the 80th percentile of demand minimises expected stockout plus waste cost; a quantile loss trains for it directly.'),
      mcq('A fraud model at 0.2% prevalence has ROC-AUC 0.95, yet only 8% of its flags are fraud at the chosen threshold. Why is this not a contradiction?', [
        ['ROC-AUC is computed on training data and precision on test data', false],
        ['At very low prevalence, a small FPR still yields many false flags', true],
        ['ROC-AUC measures calibration, which says nothing about ranking', false],
        ['Precision can only be measured once all chargebacks have arrived', false],
      ], 'ROC-AUC uses rates within each class and ignores prevalence. With 998,000 genuine transactions, even a 2% FPR yields about 20,000 false flags against 1,800 true ones. PR-AUC and cost show this; ROC-AUC hides it.'),
      mcq('A recommender raises offline NDCG@10 by 8% but the online A/B test shows no change in orders per session. What is the most likely explanation?', [
        ['The online test must have been run for too many weeks', false],
        ['Offline data does not look like live traffic or its feedback', true],
        ['NDCG cannot measure ranking quality for grocery items', false],
        ['Orders per session is never the right online metric', false],
      ], 'Offline logs come from what the old system showed (exposure and position bias) and may be split differently from live use. When offline and online disagree, trust the controlled online test and fix the offline set.'),
    ],
  },

  /* ── DEPLOY_MONITOR_CASES ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_ML_CASE_DEPLOY_MONITOR_CASES',
    notes: `The last ten minutes of a case answer: "How does this run in production, and how do you know it still works
next quarter?" Candidates who run out of time here lose the marks that separate a data scientist from a
notebook-only modeller. The ML interview topic asks about serving and drift as concepts; here you **finish a
design**.

## Case 1 — Real-time fraud scoring inside a payment

**Budget.** The payment flow allows the risk check about **50 ms** end to end. A design that fits:

| Step | Budget | How |
|---|---|---|
| Fetch precomputed features (user, device, payee) | ~10 ms | online feature store (key–value, e.g. Redis) |
| Velocity features (payments in the last 10 minutes) | ~5 ms | kept up to date by a stream processor, not computed per request |
| Model inference | ~5 ms | a gradient-boosted model of a few hundred trees |
| Rules and decision | ~2 ms | hard rules still run after the model |
| Network and slack | the rest | — |

**Fallback:** if the model times out, decide with **rules only** — never fail the payment because the model is slow.

**Training–serving skew:** the same feature definitions for training and serving (one feature store, one code
path). "Payments in the last 10 minutes" computed in SQL for training and in a stream for serving will disagree
on edge cases — test the two on the same events.

**Rollout:** **shadow mode** for two weeks (score live traffic, act on nothing, compare with outcomes), then a small
**canary** share, then an A/B or champion–challenger split with fraud loss and false-decline rate as the decision
metrics.

## Case 2 — Recommendations: batch, real time, and the feedback loop

**Batch + real time.** Nightly: candidate lists per user and store (buy-again, co-purchase, popular). At request
time: re-rank a few hundred candidates with session context (what is in the cart now, time of day) and filter by
live stock.

**The feedback loop.** The model is trained on clicks on what it chose to show. Items it never shows get no
clicks and sink further — popularity bias. Items in slot 1 get clicked because they are in slot 1 — position bias.

**Strong answer:** keep a small **exploration** share (randomise a few slots), **log what was shown and in which
position**, include position as a training feature and fix it to one value at serving, and evaluate on the
randomised traffic.

## Case 3 — A credit model after launch: drift, slow labels and fairness

**Labels are slow** (90+ days to a default), so monitor what you can see now:

- **Inputs:** population stability index (PSI) per feature and for the score. Example, applicant-income bands:

| Band | Expected (training) | Actual (this month) | (A − E) × ln(A/E) |
|---|---|---|---|
| 1 | 10% | 6% | 0.0204 |
| 2 | 20% | 15% | 0.0144 |
| 3 | 30% | 28% | 0.0014 |
| 4 | 25% | 29% | 0.0059 |
| 5 | 15% | 22% | 0.0268 |
| **PSI** | | | **0.069** |

  A common rule of thumb: below 0.1 stable, 0.1–0.25 watch, above 0.25 investigate. 0.069 is a shift toward
  higher incomes worth noting, not an alarm.
- **Early outcomes:** first-EMI bounce rate by score band, long before 90-day default.
- **Business:** approval rate and average ticket — a sudden change usually means a pipeline bug, not the world.

**Feedback loop:** applicants the model rejects never produce a label, so the training data narrows to the model's
own choices; keep a small, risk-approved test band.

**Fairness:** approval rate for women applicants is 42% against 60% for men — a ratio of **0.70**, below the
four-fifths (0.8) rule of thumb used as a screening signal. Investigate: proxies such as PIN code or employment
type, error rates by group at the same score, and whether the gap reflects repayment data or the old policy. RBI's
fair-practices expectations require clear reasons for rejection — so the model needs reason codes, not just a
score.

## A closing checklist for any ML design answer

Serving mode and latency · fallback · training–serving parity · shadow → canary → A/B · input and output
monitoring · label lag and early proxies · feedback loops · fairness and explanations · retraining trigger and
who owns the pager.`,
    mcqs: [
      mcq('A fraud model must answer within the 50 ms risk check of a payment. What should happen if the model times out?', [
        ['Fail the payment so that no unscored transaction goes through', false],
        ['Retry the model call until a score is returned, however long', false],
        ['Decide with the rules alone, so the payment is never held up', true],
        ['Approve every payment automatically until the model recovers', false],
      ], 'A fallback keeps the product working: the existing rules still catch known patterns. Failing payments punishes every customer; blanket approval opens a window fraudsters will find.'),
      mcq('Five income bands give (A − E) × ln(A/E) terms of 0.0204, 0.0144, 0.0014, 0.0059 and 0.0268. What does the PSI suggest?', [
        ['PSI 0.069: a mild shift below the usual 0.1 watch line', true],
        ['PSI 0.69: a severe shift, so the model must be retrained', false],
        ['PSI 0.014: the median term, so there is no shift at all', false],
        ['PSI 0.027: the largest term, so only band 5 has shifted', false],
      ], 'PSI is the sum of the terms: about 0.069. By the common rule of thumb (< 0.1 stable, 0.1–0.25 watch, > 0.25 investigate) this is a shift worth noting, not an alarm.'),
      mcq('Why should a recommender log the position at which each item was shown?', [
        ['Positions are needed to compute the item\'s price on the page', false],
        ['Top slots get clicks for being on top, which biases training', true],
        ['Regulators require every recommendation to be stored by rank', false],
        ['Without positions the model cannot be served in real time', false],
      ], 'Clicks depend on position as well as relevance. Logging position lets you train with it as a feature (fixed at serving) or reweight, so the model does not learn "items I put first are good".'),
    ],
    checkpoint: [
      mcq('A new fraud model is ready. Which rollout gives evidence before it can hurt customers?', [
        ['Replace the old model overnight and watch complaint volume', false],
        ['Shadow mode first, then a small canary, then an A/B split', true],
        ['Launch to all customers in one city and compare with last year', false],
        ['Retrain on last week\'s data and launch if offline AUC is higher', false],
      ], 'Shadow mode scores live traffic without acting, exposing skew and latency issues. A canary limits the blast radius, and an A/B or champion–challenger split measures fraud loss and false declines against the current model.'),
      mcq('A credit model\'s approval rate is 42% for women and 60% for men. What is the right next step?', [
        ['Nothing, since the model does not use gender as a feature', false],
        ['Add gender as a feature so the model can correct the gap', false],
        ['Investigate proxies and compare error rates at equal scores', true],
        ['Lower the threshold for everyone until both rates are 60%', false],
      ], 'A ratio of 0.70 is below the four-fifths screening line. Leaving out gender does not stop proxies (PIN code, employment type) from carrying it; check error rates by group and whether the gap reflects repayment or the old policy.'),
      mcq('Defaults on a new loan model become known only after 90 days. What can be monitored in the first month?', [
        ['Nothing useful until the first defaults have actually arrived', false],
        ['Feature and score PSI, first-EMI bounces and approval rates', true],
        ['The model\'s training AUC, recomputed every day on the same data', false],
        ['Only the model\'s latency, as accuracy cannot be measured yet', false],
      ], 'Input and score drift, early outcome proxies and business volumes are all visible immediately. Recomputing training AUC tells you nothing about live performance.'),
    ],
  },

  /* ── TAKE_HOME ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_ML_CASE_TAKE_HOME',
    notes: `Most entry data-science processes in India include a **take-home**: a CSV of 20,000–2,00,000 rows, a brief
("predict which customers will churn", "build a model to prioritise collections"), and 48–72 hours. The next
round is a 30-minute walkthrough. Reviewers say the same thing every year: they reject far more submissions for
**dishonest validation and messy notebooks** than for a weak model.

## A time budget for about 10 hours of work

| Step | Time | Output |
|---|---|---|
| Read the brief; write the decision, unit, label and metric | 30 min | the first cell of the README |
| Load and check the data | 1.5 h | grain, duplicates, dates, target rate, leak suspects |
| Validation design | 30 min | time-based or grouped split, decided before modelling |
| Baseline | 30 min | a rule or logistic regression, scored |
| One or two stronger models | 2.5 h | a pipeline, tuned with CV on the training part only |
| Threshold, business value, error analysis | 1.5 h | what the model would do and for whom it fails |
| README and clean-up | 2 h | reruns from scratch; one command to reproduce |

## Case 1 — The split that changes the answer

A churn take-home has 18 months of monthly snapshots per customer. A candidate's notebook shows:

| Validation | ROC-AUC (as reported by the candidate) |
|---|---|
| Random 80/20 split of rows | 0.91 |
| Train on months 1–12, test on months 13–18 | 0.78 |

**Read it:** a random split puts the same customer's neighbouring months in both train and test, and lets the
model learn from the future. The time-based split is how the model would be used. **Report 0.78** as the headline,
show 0.91 in a footnote with the reason, and say which number the business should plan with. Reviewers treat the
honest 0.78 as a pass and an unexplained 0.91 as a fail.

## Case 2 — The feature that is too good

The top feature by importance is \`days_since_last_payment\`. Its single-feature AUC is 0.97. Its definition in the
data dictionary: "computed on the extract date". For churned customers it keeps growing after they leave — it
encodes the label. **Strong submission:** names it in the README under "excluded features", shows the AUC with and
without it, and explains how it would be rebuilt as of each snapshot date.

## Case 3 — The README that wins the call-back

    1. Problem      Predict churn in the next 30 days at each monthly snapshot; decision = who gets a call.
    2. Data checks  4 duplicate customer-months removed; 2.1% missing tenure (kept, flagged); one leak excluded.
    3. Validation   Train months 1–12, test 13–18; CV inside the training months only.
    4. Results      Baseline (tenure + last bill rule) vs logistic regression vs gradient boosting, one table.
    5. Decision     Top 5% by score: precision and expected calls saved, at the stated assumptions.
    6. Errors       Where it fails: new customers with < 3 months of history; prepaid users.
    7. Limits       Label is 30-day non-renewal; no data on offers already given; assumptions listed.
    8. Run it       python -m venv ...; pip install -r requirements.txt; python train.py; python predict.py in.csv

**Rules:** the answer first; every number reproducible by one command; a fixed random seed; a pipeline (no fitting
on the full data before the split); the notebook restarted and run top to bottom before submission; the decision
expressed in the business's units.

## The walkthrough round

Expect: "Why a time split?", "What did you drop and why?", "What would you do with another week?", "Change the
threshold — what happens to precision and calls?", "Explain this coefficient", and "Run predict.py on this new
file." If the brief allows AI tools, say what you used them for and that you checked every number.

## How you are judged

| Strong | Weak |
|---|---|
| Validation that matches how the model would be used | Random split on time-ordered data |
| Leak suspects listed and tested | The top feature is a leak |
| Baseline in the results table | Only the best model shown |
| Decision, threshold and value in business terms | AUC as the conclusion |
| Reproducible in one command | "Run the cells in this order, skipping 14" |`,
    mcqs: [
      mcq('A churn take-home has monthly snapshots per customer. Random split AUC is 0.91; train on months 1–12 and test on 13–18 gives 0.78. What should the README lead with?', [
        ['0.91, since it uses more data in every fold of the split', false],
        ['0.78, with 0.91 footnoted and the reason it is inflated', true],
        ['The average of the two, about 0.85, as a fair compromise', false],
        ['Neither, since AUC is not a valid metric for churn data', false],
      ], 'The time split mirrors deployment. A random split lets one customer\'s adjacent months appear on both sides and lets the model learn from the future; report it only with that explanation.'),
      mcq('A take-home\'s most important feature is "days since last payment, computed on the extract date", with a single-feature AUC of 0.97. What should the candidate do?', [
        ['Keep it, since it is the most predictive column available', false],
        ['Exclude it as a leak, and show results with and without it', true],
        ['Scale it with a StandardScaler so it dominates the model less', false],
        ['Bin it into deciles to reduce its effect on overfitting', false],
      ], 'Computed at extraction, it grows after a customer leaves, so it encodes the label. Naming the leak, quantifying it and explaining how to rebuild it as of each snapshot shows exactly the judgement the reviewer is testing.'),
      mcq('Which practice most often separates a take-home that gets a call-back from one that does not?', [
        ['Training five or more model families and showing all scores', false],
        ['Honest validation, a baseline, and a README that reruns cleanly', true],
        ['Using the newest deep-learning library on tabular data', false],
        ['Tuning hyperparameters on the test set to get the best score', false],
      ], 'Reviewers reject far more submissions for leaky validation and unreproducible notebooks than for weak models. Tuning on the test set is itself a validation error.'),
    ],
    checkpoint: [
      mcq('In a take-home, a candidate fits a StandardScaler and an imputer on the full dataset, then splits into train and test. What is the problem?', [
        ['Scaling is never needed for tree-based models in the first place', false],
        ['Test-set statistics leak into training; fit them in a pipeline', true],
        ['The imputer must always run after the scaler, not before it', false],
        ['Nothing, as preprocessing does not use the label at all', false],
      ], 'Means, SDs and imputation values computed on all rows include the test set, so the test score is optimistic. A pipeline fitted on training data only — and inside CV — prevents it, label or not.'),
      mcq('The brief asks to "predict which customers to call". Which conclusion fits a strong take-home?', [
        ['The model achieves ROC-AUC 0.78 on the held-out months', false],
        ['Calling the top 5% captures a stated share of churners at a stated cost', true],
        ['Gradient boosting beat logistic regression by 0.03 AUC in CV', false],
        ['The most important feature was tenure, followed by bill amount', false],
      ], 'The brief is about a decision, so the conclusion should be in its units: who gets a call, how many churners that reaches, and what it costs, with assumptions stated. AUC and importances are supporting evidence.'),
      mcq('In the walkthrough, the reviewer asks "What would you do with another week?" Which answer is strongest?', [
        ['Try a deep neural network, as it would likely score higher', false],
        ['Get offer history and run a holdout to measure call impact', true],
        ['Tune more hyperparameters with a larger random search', false],
        ['Rewrite the notebook in a faster language for production', false],
      ], 'The biggest gaps are about the decision: whether calls cause retention and which data is missing. A holdout measures real impact; more tuning or a bigger model chases a smaller gain.'),
    ],
  },

  /* ── TIMED_CASES ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_ML_CASE_TIMED_CASES',
    notes: `Two ML design cases, **20 minutes each**, run like the real round. Use a timer and a partner reading the prompt
and pushing back. Speak the framing first, sketch the system, finish with deployment and monitoring. Then compare
with the model answer and score yourself on the rubric. All figures are assumptions given for practice.

## Case A — "Predict delivery time (ETA) shown before a food order is placed"

**Model answer.**

1. **Objective and decision.** The ETA shown at checkout sets the customer's expectation; late deliveries drive
   complaints and refunds, over-long ETAs lose orders. So the decision is *which number to promise*.
2. **Target.** Unit = order at checkout; label = minutes from order to delivery. Decompose it: restaurant
   preparation + rider assignment + pickup wait + travel. Separate models per leg are easier to debug and to
   update when one leg changes.
3. **Features (known at checkout).** Restaurant's recent prep times by hour, current open orders at the restaurant,
   riders free nearby, distance and route, weather, time of day, festival flags.
4. **Metric.** Not just MAE. If errors are roughly normal with SD 6 minutes, promising the **median** makes half of
   orders late; promising median + 5 minutes makes about **20%** late (P(Z > 5/6) ≈ 0.20). Choose the promise as a
   **quantile** (say the 80th percentile) and train with a **pinball loss**: at τ = 0.8, predicting 28 for an
   actual 30 costs 0.8 × 2 = 1.6, predicting 32 costs 0.2 × 2 = 0.4 — lateness is penalised four times more.
5. **Baseline.** Restaurant's median delivery time for this hour and distance band.
6. **Online test.** A/B by city zone or by time slot: late-delivery share, conversion at checkout, complaints.
7. **Serving and monitoring.** Real time, under ~100 ms; features from a store refreshed every minute; monitor
   error by city and hour; rain and IPL nights shift everything — alert when the late share passes a threshold.

## Case B — "Detect fake reviews on an e-commerce marketplace"

**Model answer.**

1. **Objective and decision.** Trust in ratings; the decision is **hide, send to moderation, or publish**.
2. **Labels.** Few and biased — only reviews moderators looked at. Add weak labels: reviews from accounts later
   banned, review bursts on a new product, near-duplicate texts.
3. **Features.** Text (embeddings, duplicates across products), reviewer behaviour (account age, reviews per day,
   verified purchase), and the **graph**: rings of accounts reviewing the same sellers. Graph features catch
   coordinated fraud that text alone misses.
4. **Capacity.** About **2 lakh** reviews a day; if about 3% are fake, that is 6,000; moderators can check 3,000.
   At 70% precision in the top 3,000, moderation catches about **2,100** a day versus about 90 from random checks.
   That is still only about a third of the fakes — so auto-hide the very highest scores and keep moderation for
   the middle.
5. **Metric.** Precision at moderation capacity, recall of known rings; online: share of complaints about fake
   ratings, seller appeals upheld (false positives).
6. **Adversarial drift.** Fraudsters adapt; retrain often, monitor score distributions per seller category, and keep
   rules for patterns the team discovers between retrains.

## Rubric (per case, out of 100)

| Area | Points | Full marks when |
|---|---|---|
| Framing | 25 | objective, decision, unit, label, constraints, baseline stated before any model |
| Data and features | 20 | timestamps respected, label problems named |
| Metrics | 20 | offline metric tied to the decision, online test, guardrails |
| System | 15 | serving mode, latency, fallback |
| Monitoring and risks | 20 | drift, feedback loops, fairness or abuse, retraining |

60+ on both cases is a pass for most entry DS loops. Below 10 in any area shows what to drill next.`,
    mcqs: [
      mcq('In Case A, ETA errors are roughly normal with SD 6 minutes. If the app promises the median prediction, what share of orders arrive later than promised?', [
        ['About 50%, since half of the outcomes fall above a median', true],
        ['About 20%, since one SD of six minutes covers most cases', false],
        ['About 5%, since normal errors rarely exceed two SDs either way', false],
        ['About 0%, since the median is the best single estimate available', false],
      ], 'By definition half of outcomes exceed the median. Promising a higher quantile — median + 5 minutes gives about 20% late — trades a slightly longer ETA for fewer broken promises.'),
      mcq('An ETA model is trained with a pinball loss at τ = 0.8. For an actual of 30 minutes, what are the losses for predictions of 28 and 32?', [
        ['0.4 for 28 and 1.6 for 32', false],
        ['2.0 for both, as errors are equal', false],
        ['1.6 for 28 and 0.4 for 32', true],
        ['0.8 for 28 and 0.2 for 32', false],
      ], 'Under-prediction costs τ × error = 0.8 × 2 = 1.6; over-prediction costs (1 − τ) × error = 0.2 × 2 = 0.4. The loss pushes predictions up toward the 80th percentile.'),
      mcq('In Case B, 6,000 fake reviews arrive a day and moderators can check 3,000. At 70% precision in the top 3,000, how many fakes are caught, and what follows?', [
        ['About 2,100, roughly a third of the fakes, so auto-hide the highest scores', true],
        ['About 3,000, every moderated review, so the queue is already sufficient', false],
        ['About 4,200, as precision applies to all 6,000 fakes in the day', false],
        ['About 90, since moderators check only 1.5% of all daily reviews', false],
      ], '0.7 × 3,000 = 2,100 of 6,000 fakes. Random checks would find about 3% of 3,000 = 90. Capacity, not the model, limits recall, so the most confident scores need an automatic action.'),
      mcq('Why are graph features (accounts reviewing the same sellers) valuable for fake-review detection?', [
        ['They remove the need for any labelled reviews at all', false],
        ['They expose coordinated rings that text alone can miss', true],
        ['They make the model faster to serve than text features', false],
        ['They guarantee the model cannot be evaded by fraudsters', false],
      ], 'Paid review rings write varied text but share accounts, sellers and timing. Graph features capture that coordination; they still need labels to evaluate and can still be evaded over time.'),
      mcq('Practising Case A, Karthik spends 15 of his 20 minutes comparing neural network architectures and never reaches monitoring. Which rubric areas lose the most?', [
        ['Framing, system, and monitoring and risks', true],
        ['Only metrics, since he named no metric at all', false],
        ['Data and features, as architectures use none', false],
        ['None, since model choice is worth most marks', false],
      ], 'Model choice is not a rubric area of its own; framing (25), system (15) and monitoring and risks (20) all suffer when the answer starts and stays with architectures.'),
    ],
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_ML_CASE_CHECKPOINT',
    notes: `Ten ML case scenarios across the topic: framing, data and labels, metrics and thresholds, deployment and
monitoring, and the take-home. Some need a quick calculation — do it on paper, as you would in the room.

Before you start, recall the habits this topic drills:
- **Decision first** — what will the prediction change, and what baseline does the business use today?
- **Time on every feature** — known at prediction time, label matured, no future in the past.
- **Metric = decision** — cost, capacity or a quantile, then an online test with guardrails.
- **Finish the design** — serving, fallback, rollout, monitoring, feedback loops and fairness.`,
    checkpoint: [
      mcq('An interviewer asks you to design churn prediction for a food-delivery app. Which opening shows the strongest framing?', [
        ['"I would train gradient boosting on all user events from the last year."', false],
        ['"What action follows a prediction, and how is churn defined for an app?"', true],
        ['"I would balance the classes with SMOTE before trying any model at all."', false],
        ['"I would use a transformer over each user\'s order history sequence."', false],
      ], 'Without a subscription, churn must be defined (no order in N days), and the prediction matters only through the action it drives — an offer, a nudge. Model talk before that loses framing marks.'),
      mcq('A grocery app\'s order-count forecast must drive staffing. Which baseline should any model beat?', [
        ['Same weekday last week, adjusted for known holidays', true],
        ['A constant equal to the busiest day ever recorded', false],
        ['A random walk started from an average of all history', false],
        ['The output of a large language model asked to guess', false],
      ], 'Order counts have strong weekly seasonality, so a seasonal-naive forecast is cheap and hard to beat. A model that cannot beat it adds cost without value.'),
      mcq('A model that predicts loan default at disbursal shows a test AUC of 0.97. The top feature is "number of collection calls". What happened?', [
        ['The model found a strong early-warning signal worth keeping', false],
        ['A post-disbursal feature leaked the outcome into training', true],
        ['The test set was too small to estimate AUC with any precision', false],
        ['Collection calls should have been scaled before training', false],
      ], 'Collection calls happen because a borrower is already late — after the prediction moment. Features must be known at disbursal; this one encodes the label.'),
      mcq('Fraud labels in a wallet take up to 90 days to arrive. Which training setup is right?', [
        ['Train on the last 30 days, since newest data is most relevant', false],
        ['Train on matured data, older than 90 days, and test on a later window', true],
        ['Treat every transaction without a label yet as confirmed fraud', false],
        ['Wait until labels arrive for every transaction ever made', false],
      ], 'A label-maturity window avoids teaching recent, not-yet-reported fraud as genuine. Testing on a later matured window mirrors deployment; rules and early proxies cover the newest patterns meanwhile.'),
      mcq('A missed fraud costs ₹4,000 and a false block ₹150. A looser threshold catches 200 more frauds but adds 6,000 false blocks a day. Is it worth it?', [
        ['No: it saves ₹8 lakh but adds ₹9 lakh of false-block cost', true],
        ['Yes: catching more fraud is always worth some extra blocks', false],
        ['Yes: it saves ₹8 lakh and false blocks cost nothing real', false],
        ['No: any threshold change needs a full model retraining', false],
      ], '200 × ₹4,000 = ₹8 lakh saved; 6,000 × ₹150 = ₹9 lakh added. The looser threshold costs ₹1 lakh a day more — unless a cheaper step-up replaces the block.'),
      mcq('A collections team can contact 2,000 borrowers a week. Which offline metric should choose between two risk models?', [
        ['ROC-AUC over all borrowers', false],
        ['Accuracy at a 0.5 threshold', false],
        ['Recall or value in the top 2,000', true],
        ['R² of the predicted probabilities', false],
      ], 'Only the top 2,000 are acted on, so compare models by how many likely defaulters — and how much recoverable value — fall in that group. AUC also rewards ordering among borrowers nobody contacts.'),
      mcq('For new users with no history, which approach should a home-screen recommender use?', [
        ['Show nothing until the user has placed at least three orders', false],
        ['Use context such as store, hour and channel, plus popular items', true],
        ['Use matrix factorisation, which handles unseen users by design', false],
        ['Copy the recommendations of a random existing user in the city', false],
      ], 'Context is available from the first session and popular-in-store items are a strong default. Matrix factorisation has no vector for an unseen user, which is the cold-start problem itself.'),
      mcq('A real-time fraud model is trained on velocity features computed in SQL but served from a stream processor. What risk does this create?', [
        ['Training–serving skew, where the two computations differ', true],
        ['Label leakage, since streams contain future transactions', false],
        ['Class imbalance, since streams carry fewer fraud cases', false],
        ['Underfitting, since stream features are always simpler', false],
      ], 'Two code paths for "payments in the last 10 minutes" disagree on windows, late events and time zones, so the live model sees different inputs from those it learned on. One feature definition, tested on the same events, prevents it.'),
      mcq('A recommender trained only on clicks of items it chose to show keeps recommending the same popular items. What breaks the loop?', [
        ['Retraining more often on the same click logs', false],
        ['A small exploration share, with logged positions', true],
        ['Removing popular items from the catalogue', false],
        ['Switching the offline metric from recall to NDCG', false],
      ], 'Items never shown never earn clicks. Randomising a few slots and logging what was shown, where, gives unbiased feedback and lets the model correct popularity and position bias.'),
      mcq('In a take-home walkthrough, the reviewer asks why the model\'s headline AUC is 0.78 when a random split gave 0.91. Which reply is strongest?', [
        ['"0.78 was a mistake; the real performance is the 0.91 figure."', false],
        ['"A time split mirrors deployment; the random split mixed in the future."', true],
        ['"AUC varies randomly, so either number is equally valid to report."', false],
        ['"I reported the lower number so the model would seem more modest."', false],
      ], 'The time-based split is how the model will be used. A random split of monthly snapshots shares customers and future months across train and test, inflating the score.'),
    ],
  },
];
