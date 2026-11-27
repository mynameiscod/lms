/**
 * Career-track content: case interviews (DT_CASE_INTERVIEWS) and the analyst candidate (DT_PLACE_DA_FS),
 * for Data Analytics + AI, Year 4 (placement).
 *
 * Year 3 already worked three metric cases (the 10% order drop, AutoPay metrics, DAU up / revenue flat) and a
 * ten-minute capstone defence. This file goes past them: guesstimates, mix-versus-rate metric cases, break-even
 * and segment product cases, take-home assignments, the analyst resume and portfolio, the capstone defended at
 * interview depth (the numbers below are computed from the seeded Bazaar Fresh data), and one full analyst
 * interview day.
 *
 * Attribution: DT_CASE_INTERVIEWS is single-skill (BUSINESS_METRICS), so its questions name no skill.
 * DT_PLACE_DA_FS is multi-skill (PLACEMENT_READINESS, PORTFOLIO_EVIDENCE, TECHNICAL_EXPLANATION,
 * INTERVIEW_PERFORMANCE): every checkpoint question names one with ck(). Practice mcqs name none.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_DATA_CASES_CANDIDATE_BUNDLES: PilotBundle[] = [
  /* ══ DT_CASE_INTERVIEWS ══════════════════════════════════════════════════════════════════ */

  /* ── GUESSTIMATES ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_CASE_INTERVIEWS_GUESSTIMATES',
    notes: `A guesstimate ("How many food orders are placed in Pune in a day?") is not a general-knowledge test. Nobody on
the panel knows the real number either. They are scoring four things: **do you clarify before you calculate, do you
build a structure someone can follow, are your assumptions sensible and stated, and do you check your answer**. A
candidate who reaches 50,000 with a clean structure beats one who blurts "2 lakh" and cannot say why.

Every number below is an **assumption for practice**, not a fact. In the interview, say "let me assume" every time.

## The five steps (say them out loud)

1. **Clarify** — what exactly is counted, where, over what period. "Orders through delivery apps only, or phone
   orders too? Pune city or the metro region? An average day or a weekend?" Thirty seconds, then state your choice.
2. **Pick the approach** — **demand side** (people × share who buy × how often) or **supply side** (sellers ×
   capacity × utilisation). Say which you are using and why; plan to use the other as a check.
3. **Segment** — split the population where behaviour genuinely differs (heavy / light users, students / families,
   metro / tier-2). One average across very different groups hides the answer.
4. **Calculate aloud with round numbers** — 17.5 lakh, not 17,43,912. Write each line on paper or the shared screen
   so the interviewer can follow and correct one assumption without restarting you.
5. **Sanity-check and conclude** — a second method, a ratio ("that is one order per 60 people a day — plausible?"),
   and a range. Name the one assumption that moves the answer most.

## Case 1 — "Food-delivery orders in Pune in a day"

**Clarify:** app orders (any platform), Pune metro, an average day.
**Structure (demand side), two segments:**

    Households
      Pune metro population (assume)               70 lakh
      people per household (assume)                  4
      households                                   17.5 lakh
      share that order online at all (assume)       40%   -> 7 lakh households
      frequency mix (assume):
        heavy 20% x 8 orders/month   = 1.6
        medium 40% x 3 orders/month  = 1.2
        light 40% x 1 order/month    = 0.4
        weighted average             = 3.2 orders/household/month
      7 lakh x 3.2 = 22.4 lakh orders/month         -> about 75,000 a day

    Students and young professionals living alone or in PGs (not in the households above)
      people (assume)                               3 lakh
      orders per person per month (assume)          4
      3 lakh x 4 = 12 lakh a month                  -> about 40,000 a day

    Total                                           about 1.15 lakh orders a day

**Sanity check (supply side):** assume 12,000 restaurants and cloud kitchens deliver in Pune, averaging 10 orders a
day each → 1.2 lakh. Two independent methods land close together, so no assumption is wildly off.
**Conclude:** "Roughly 1–1.2 lakh orders a day. The answer is most sensitive to the 40% ordering share — at 30% it
drops to about 96,000." (7 lakh becomes 5.25 lakh households → 56,000 a day, plus 40,000.)

## Case 2 — "Daily revenue of a chai stall outside a Hyderabad IT park"

This is a **supply-side** problem: the stall's capacity and the hours of demand decide it.

    Hours open (assume)        7 a.m. – 9 p.m.  = 14 hours
    Peak hours                 8–10 a.m., 4–6 p.m. = 4 hours x 150 cups/hour = 600
    Off-peak                   10 hours x 40 cups/hour                       = 400
    Cups a day                                                               1,000
    Price (assume)             ₹15 a cup                                     ₹15,000
    Snacks (samosa, biscuits)  assume +25% of chai revenue                   ₹18,750 a day
    A 30-day month                                                           about ₹5.6 lakh

**Sanity check — capacity:** a large kettle makes about 50 cups in 8 minutes → at most ~375 cups an hour, so 150
at peak is comfortably possible with two people serving. **Follow-up the interviewer may ask:** "Is it profitable?"
→ cost side: milk, tea, sugar, gas, cups (say 40–45% of revenue), two helpers' wages, rent or a fee to whoever
controls the spot. Answer with a structure, then numbers.

## Case 3 — "Market size, in rupees, for a JEE/NEET coaching app"

Market sizing in ₹ = **number of paying customers × spend per customer per year**.

    Indians per single year of age (assume ~2.4 crore)
    Ages 16–17 (Classes 11–12)                       4.8 crore
    enrolled in Classes 11–12 (assume 55%)           2.64 crore
    science stream (assume 35%)                      92 lakh
    preparing for JEE/NEET and willing to pay
      for online help (assume 40%)                   37 lakh
    average annual spend on the app (assume ₹6,000)
    Market                                           37 lakh x ₹6,000 ≈ ₹2,200 crore a year

Say what the number is for: this is the **addressable** market. The **obtainable** share for a new app is a small
fraction of it; a strong answer adds "a new entrant might reach 2–5% in three years".

## How it is scored, and the traps

| Scored on | Strong | Weak |
|---|---|---|
| Clarification | one or two scoping questions, then a stated choice | none, or ten questions to stall |
| Structure | written tree, segments where behaviour differs | one long multiplication |
| Assumptions | stated, round, defended in a phrase | presented as facts, or unexplained |
| Arithmetic | lakh/crore handled cleanly, units carried | daily vs monthly mixed up |
| Check | second method, a ratio, a range | "so the answer is 1,14,667" |

**Traps:** false precision; forgetting frequency (people ≠ orders); counting the same people twice (PG students
inside the household count); using a national average for a metro; and freezing when the interviewer challenges an
assumption — change that line, keep the structure, and move on.`,
    workedExample: `**The Pune case, as the conversation actually runs.**

**Interviewer:** "How many food-delivery orders are placed in Pune in a day?"

**Candidate:** "Two quick clarifications: I'll count app orders on any platform, across the Pune metro area, on an
average weekday-weekend blend. Is that fine?" — *"Yes."* — "I'll go demand-side, splitting households from people
living alone, because their ordering habits are very different, and then check from the restaurant side."

**Candidate writes:** 70 lakh people ÷ 4 = 17.5 lakh households; 40% order online = 7 lakh.

**Interviewer:** "Why 40%?"

**Candidate:** "Smartphones are near-universal in urban households, but price matters: I'm assuming the lower-income
half rarely orders and a few higher-income families don't either. If you think it's higher I'll move it — the
structure stays."

**Candidate continues:** frequency mix 20% × 8 + 40% × 3 + 40% × 1 = 3.2 a month → 22.4 lakh a month → about 75,000 a
day. PG students and young professionals: 3 lakh × 4 a month = 12 lakh → 40,000 a day. Total ≈ 1.15 lakh.

**Interviewer:** "Sounds high."

**Candidate:** "Let me check from supply: 12,000 delivering restaurants and cloud kitchens at 10 orders a day is 1.2
lakh — close. And 1.15 lakh orders for 70 lakh people is about one order per 60 people a day, which feels plausible
for a large IT city. The biggest lever is the 40%: at 30% the total is about 96,000. So I'd say 1 to 1.2 lakh."

**Why it scores well:** scoped in one breath, segments that differ, each number defended in a sentence, the
challenge answered with a second method rather than a retreat, and a range with its main sensitivity.`,
    mcqs: [
      mcq('Asked to estimate daily food-delivery orders in Pune, Rohan replies "about 1 lakh" within five seconds. What should he have done first?', [
        ['Clarified what counts and laid out a structure before any number', true],
        ['Named the biggest delivery apps and their reported market shares', false],
        ['Asked the interviewer what figure their company usually uses', false],
        ['Given a precise figure like 1,03,400 so it sounds researched', false],
      ], 'The panel scores the route, not the number. Scoping the question and showing a structure lets the interviewer follow and challenge each assumption; a fast round number or a precise-looking one gives them nothing to assess.'),
      mcq('Assume 17.5 lakh households in a city, 40% of them order food online, averaging 3.2 orders a month each. Roughly how many orders is that per day?', [
        ['About 7,500', false],
        ['About 75,000', true],
        ['About 2.2 lakh', false],
        ['About 22 lakh', false],
      ], '17.5 lakh × 40% = 7 lakh households; × 3.2 = 22.4 lakh orders a month; ÷ 30 ≈ 75,000 a day. 22 lakh is the monthly figure — the classic daily/monthly slip.'),
      mcq('A demand-side estimate gives 1.15 lakh orders a day, and a supply-side check (12,000 restaurants × 10 orders) gives 1.2 lakh. What does the agreement tell the interviewer?', [
        ['Two independent routes agree, so no assumption is wildly off', true],
        ['The true figure is exactly 1.175 lakh, the average of the two', false],
        ['The supply-side method should replace the demand-side method', false],
        ['The assumptions were copied from published market reports', false],
      ], 'Agreement between independent methods is a sanity check, not proof of a precise number. It shows the candidate tests their own answer, which is what the check is for.'),
    ],
    checkpoint: [
      mcq('Why does a strong guesstimate split households into heavy, medium and light orderers instead of using one average frequency?', [
        ['Behaviour differs so much that one guessed average is hard to defend', true],
        ['Interviewers award marks according to the number of segments used', false],
        ['Splitting into groups removes the need to state any assumptions', false],
        ['A single average always gives an answer that is much too high', false],
      ], 'Segments let each assumption be small and defensible ("heavy users order about twice a week"), and they show where the volume comes from. A single average for very different groups is a guess the candidate cannot justify.'),
      mcq('Sonal estimates that one chai stall outside an IT park sells 9,000 cups a day. Which check exposes the problem fastest?', [
        ['Capacity: about 375 cups an hour over 14 hours is at most 5,250', true],
        ['Price: at ₹15 a cup the stall would earn ₹1.35 lakh in a day', false],
        ['Population: Hyderabad has more than enough people to drink it', false],
        ['Weather: tea sales fall in summer, so the figure is seasonal', false],
      ], 'A supply-side cap shows the estimate is physically impossible for one stall, whatever the demand. Revenue and population figures do not test the claim, and seasonality is a refinement, not a check.'),
      mcq('In a market-sizing case the interviewer says, "Your 40% willing-to-pay assumption seems high." What is the best response?', [
        ['Defend 40% firmly, since changing it looks like a lack of conviction', false],
        ['Restart the estimate with a completely different structure', false],
        ['Show how the answer moves at 20%, keeping the structure intact', true],
        ['Say the exact figure would need a survey, so you cannot estimate', false],
      ], 'Challenges test whether the structure survives a changed input. Recomputing one line and naming the new range shows the answer is robust and the candidate is coachable; restarting or refusing wastes the case.'),
    ],
  },

  /* ── METRIC_CASES ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_CASE_INTERVIEWS_METRIC_CASES',
    notes: `Year 3 worked the classic metric cases — "orders dropped 10%", AutoPay metrics, "DAU up, revenue flat". The
interview version adds pressure and arithmetic: the interviewer hands you numbers mid-case and expects you to
**decompose them on the spot**, separate a **mix change** from a **real change**, choose a metric with its
**guardrails**, and weigh a **trade-off in rupees**. Three cases, each fully worked.

## The structure, in one line

**Clarify the metric → is the change real → decompose (formula or segments) → mix vs rate → hypotheses ranked by
size → confirm with the specific cut → recommend, with an owner and a guardrail.**

## Mix vs rate — the calculation interviewers love

When an average moves, part may come from **each segment changing** (rate) and part from **the share of segments
changing** (mix). Compute it:

    mix effect  = (new shares × old rates) − old average
    rate effect = new average − (new shares × old rates)

The two add up to the total change. Say both numbers; they lead to different owners and fixes.

## Case 1 — "Average delivery time in Bengaluru rose from 31.0 to 33.9 minutes this week"

**Clarify:** time from order placed to delivered; delivered orders only; same definition both weeks.
**Real?** Same pipeline, no tracking change, the rise is visible in every day of the week, not one outage.
**Segment:** the team expanded the delivery radius last Monday. Cut by zone:

| Zone | Last week share | Last week time | This week share | This week time |
|---|---|---|---|---|
| Core (≤ 6 km) | 90% | 30.0 min | 75% | 30.5 min |
| Outer (6–8 km, new) | 10% | 40.0 min | 25% | 44.0 min |
| **All** | | **31.0** | | **33.9** |

    old average      0.90 × 30 + 0.10 × 40         = 31.0
    new shares, old rates  0.75 × 30 + 0.25 × 40  = 32.5    -> mix effect  +1.5 min
    new average      0.75 × 30.5 + 0.25 × 44       = 33.9    -> rate effect +1.4 min

**Read it:** about half the rise is simply more far-away orders — expected when the radius grows. The other half is
real slowing, mostly in outer zones (+4 minutes), where rider supply has not caught up.
**Hypotheses for the rate part:** too few riders positioned in outer zones; longer restaurant wait as busy kitchens
take far orders; batching two far orders on one trip. **Confirm** with the time split by leg — rider assignment,
wait at restaurant, travel — for outer zones.
**Recommend:** report core and outer separately so the headline does not mix them; add rider incentives in outer
zones at peak; guardrail — late-delivery rate (> promised time) in outer zones.

## Case 2 — "Pick the success metric for a 'Reorder' carousel on the home screen"

**The goal** is more orders from existing customers with less effort, not clicks on the carousel.

- **Wrong primary metric:** "share of orders through the carousel". If it shows 18% of orders, many of those would
  have happened anyway through search — that is **cannibalisation**, not new orders.
- **Primary:** orders per user per week among users with at least one past order, in a randomised test (carousel
  vs no carousel). Example result: 2.53 vs 2.50 orders a user a month — +1.2%, much smaller than "18% of orders",
  and the honest number.
- **Secondary:** time from app open to order (the convenience promise); repeat rate at 30 days.
- **Guardrails:** average order value (are reorders smaller baskets?); share of orders from restaurants the user has
  never ordered from (does the app stop helping new restaurants get found?); cancellation rate.

The insight interviewers want: **a feature's own usage metric almost always overstates its impact**; the test
compares users, not channels.

## Case 3 — "Should a quick-commerce app cut its delivery promise from 15 to 10 minutes?"

A pilot city ran it for four weeks against a matched control city:

    orders a day       50,000  -> 52,750   (+5.5%, conversion 11.0% -> 11.6%)
    contribution/order ₹22     -> ₹15      (more riders, less batching: about +₹7 cost)
    daily contribution ₹11.0 lakh -> ₹7.9 lakh   (-28%)

**Read it:** more orders, much less money. To break even at 52,750 orders, contribution per order must stay at
₹11.0 lakh ÷ 52,750 ≈ ₹20.9 — so cost can rise by only about ₹1 an order.
**What could change the answer:** retention. If 10-minute customers keep ordering for longer, lifetime contribution
might still win — measure 60-day repeat in the pilot before deciding. **Middle options:** a 10-minute promise only
for small baskets near each dark store, or only at peak hours where competitors are faster.
**Recommend:** do not roll out city-wide on this evidence; extend the pilot with retention as the primary metric and
contribution per order as the guardrail.

## Communication that scores

- Say the formula before the numbers ("average time = shares × times by zone").
- Round and narrate: "about half the rise is mix".
- End every case with **a decision, an owner, and the metric that will tell you it worked**.`,
    workedExample: `**The delivery-time case, as the interviewer runs it.**

**Interviewer:** "Average delivery time in Bengaluru went from 31 to about 34 minutes this week. What's going on?"

**Candidate:** "First the definition: placed-to-delivered on delivered orders, both weeks? And did anything change in
tracking or in which orders are included?" — *"Same definition. We did expand the delivery radius from 6 to 8 km on
Monday."* — "Then the first thing I want to separate is mix from real slowing. Can I see it by zone?"

**Interviewer gives the table** (core 90% → 75% of orders at 30.0 → 30.5 min; outer 10% → 25% at 40 → 44 min).

**Candidate:** "If each zone had kept last week's speed, this week's mix gives 0.75 × 30 + 0.25 × 40 = 32.5. So 1.5
of the 2.9 minutes is mix — we're simply delivering further. The other 1.4 is real: actual speeds rose, mostly in
outer zones, by 4 minutes."

**Interviewer:** "So is the radius expansion bad?"

**Candidate:** "Not by itself — longer trips for far orders are expected, and those orders are new revenue. The
problem is the outer-zone slowdown. I'd split outer-zone time into rider assignment, restaurant wait and travel. If
assignment time went up, we lack riders there — that's an incentive or positioning fix for the ops team. I'd also
start reporting core and outer separately, so next week's headline doesn't panic anyone over mix."

**Interviewer:** "Which metric would you watch?"

**Candidate:** "Late-delivery rate against the promised time, by zone. Customers feel lateness, not the average."

**Why it scores:** clarified, asked for the right cut, did the mix/rate arithmetic aloud, interpreted both halves
differently, and closed with an owner and a guardrail metric.`,
    mcqs: [
      mcq('Before a radius change, 90% of orders were core (30 min) and 10% outer (40 min). Afterwards the shares are 75% and 25%. If neither zone got any slower, what is the new average delivery time?', [
        ['31.0 minutes', false],
        ['32.5 minutes', true],
        ['33.9 minutes', false],
        ['35.0 minutes', false],
      ], 'Old speeds with new shares: 0.75 × 30 + 0.25 × 40 = 32.5. That 1.5-minute rise from 31.0 is pure mix; anything above 32.5 is real slowing within zones.'),
      mcq('After launch, 18% of a food app\'s orders come through the new Reorder carousel. Why is that a poor success metric for the feature?', [
        ['Many of those orders would have been placed through search anyway', true],
        ['Carousel orders cannot be tracked apart in product analytics', false],
        ['18% is too small a share for any home-screen feature to matter', false],
        ['Usage metrics are only meaningful after six months of live data', false],
      ], 'A feature\'s usage counts orders it merely redirected. A randomised test of orders per user (carousel vs none) measures what it added — here about +1.2%, far smaller than 18%.'),
      mcq('A 10-minute delivery pilot lifts orders from 50,000 to 52,750 a day but cuts contribution per order from ₹22 to ₹15. What happens to daily contribution?', [
        ['It rises slightly, because 2,750 more orders outweigh the cost', false],
        ['It stays flat, because orders and cost rise by similar amounts', false],
        ['It falls by about 28%, from ₹11.0 lakh to about ₹7.9 lakh', true],
        ['It falls by about 5.5%, the same as the rise in daily orders', false],
      ], '50,000 × ₹22 = ₹11.0 lakh; 52,750 × ₹15 = ₹7.91 lakh — a 28% fall. A 5.5% rise in orders cannot offset a 32% fall in contribution per order.'),
    ],
    checkpoint: [
      mcq('Average delivery time rose after the app began serving farther addresses. Which question first separates a mix change from real slowing?', [
        ['Did each zone\'s own average change, or only the share of orders by zone?', true],
        ['Did the app\'s rating in the Play Store fall during the same week?', false],
        ['Did the total number of riders on the platform change this week?', false],
        ['Did customers complain more about late food on social media?', false],
      ], 'Comparing within-zone averages against shares splits the change into mix (more far orders) and rate (each zone slower). The other signals may be useful later but cannot separate the two.'),
      mcq('For a Reorder carousel that surfaces restaurants a user already knows, which guardrail metric matters most for the platform\'s restaurant partners?', [
        ['Number of taps on the carousel per app session', false],
        ['Share of orders from restaurants new to that user', true],
        ['Average rating that users give the carousel itself', false],
        ['Daily active users who open the app home screen', false],
      ], 'Pushing past restaurants can quietly starve new ones of discovery, which hurts partners and long-term choice. Taps measure usage, not harm, and DAU is unrelated to the risk.'),
      mcq('A 10-minute delivery pilot reaches 52,750 orders a day. Old daily contribution was ₹11.0 lakh. To keep it flat, contribution per order must be at least about:', [
        ['₹15.0', false],
        ['₹17.5', false],
        ['₹20.9', true],
        ['₹22.0', false],
      ], '₹11.0 lakh ÷ 52,750 ≈ ₹20.85. So the faster promise can add only about ₹1 of cost per order before it loses money — a useful number to bring to the ops team.'),
    ],
  },

  /* ── PRODUCT_BUSINESS_CASES ───────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_CASE_INTERVIEWS_PRODUCT_BUSINESS_CASES',
    notes: `Product and business cases ask for a **decision**: should we launch this, which customers do we target, how will
we know it worked. Consulting-style frameworks recited from memory score poorly with analyst panels; what scores is
**a goal, the money arithmetic, who the decision really affects, and a way to test it**.

## The structure

1. **Goal** — what the business is trying to move (orders, contribution, retention, risk), and over what horizon.
2. **Options** — including "do nothing" and a smaller version of the idea.
3. **The numbers** — break-even, value per customer, value per rupee spent. One clean calculation beats five vague
   ones.
4. **Who is affected, and who self-selects** — the customers who take up an offer are rarely average.
5. **Risks and guardrails** — cannibalisation, fraud, credit loss, brand, regulation.
6. **How to test** — randomised test, staged rollout or a geo pilot, with the primary metric and how long it runs.
7. **Recommendation** — yes / no / test first, with the condition that would change it.

## Case 1 — "Should our grocery app launch a ₹99-a-month free-delivery membership?"

Today: ₹30 delivery fee on orders under ₹499; contribution per order ₹35 before delivery fees.

**The trap is adverse selection.** Who joins first? Users who pay the fee most often.

    Typical heavy user: 6 orders a month, 3 of them under ₹499
      fees lost: 3 × ₹30 = ₹90; membership: ₹99      -> +₹9 a month, even with no extra orders
    The user most likely to join: 5 fee-paying orders a month
      fees lost: 5 × ₹30 = ₹150; membership: ₹99     -> −₹51 a month
      extra orders needed to break even: 51 ÷ 35     ≈ 1.5 a month

**So the question becomes:** will members order about 1.5 more times a month? Memberships often do raise frequency
(people "use what they paid for") — but that is an empirical question.
**Test:** offer the membership to a random half of eligible users; primary metric contribution per user per month
(not membership sign-ups); guardrails: basket size (members may split one ₹800 order into small ones now that delivery
is free) and delivery cost per order.
**Recommend:** launch as a test; roll out only if contribution per eligible user rises.

## Case 2 — "Which segment should we target with a small credit-line offer on our UPI app?"

The interviewer gives assumptions (all illustrative):

| Segment | Users | Activation | Revenue / active / yr | Expected credit loss / active / yr |
|---|---|---|---|---|
| A — salaried, 25–35, metro | 20 lakh | 4% | ₹1,800 | ₹400 |
| B — students, 18–22 | 35 lakh | 6% | ₹600 | ₹500 |
| C — small merchants | 8 lakh | 7% | ₹3,000 | ₹1,400 |
| D — salaried, tier-2 | 25 lakh | 3% | ₹1,500 | ₹450 |

Outreach costs ₹2 per user contacted. **Value per user contacted** = activation × (revenue − loss) − ₹2:

    A: 0.04 × 1,400 − 2 = ₹54      total 20 lakh × 54 = ₹10.8 crore
    B: 0.06 × 100   − 2 = ₹4       total ₹1.4 crore
    C: 0.07 × 1,600 − 2 = ₹110     total ₹8.8 crore
    D: 0.03 × 1,050 − 2 = ₹29.5    total ₹7.4 crore

**Read it:** students have the **highest activation** but almost no value after losses — activation is the wrong
ranking. Merchants are the best **per contact**; salaried metro users give the most **in total**. If the budget is
limited, start with C, then A.
**Risks:** the merchant loss estimate is the shakiest (small history) — pilot with tight limits first; lending is
regulated, so partner and compliance rules decide what can be offered to whom; guardrail: 30-day delinquency.

## Case 3 — "How would you measure 'EMI at checkout' on an electronics site?"

**Goal:** more orders of expensive items without more returns or defaults.
**Design:** randomise **by user** (not by page view — a user who sees EMI on one visit and not the next contaminates
both groups), on products over ₹10,000.
**Primary metric:** purchase conversion of users who view an eligible product. **Guardrails:** return/cancellation
rate, EMI default or payment failure, average selling price.
**Sample size** — baseline conversion 2.0%, smallest lift worth acting on 2.0% → 2.2%, 5% significance, 80% power:

    n per arm = (1.96 + 0.84)² × (0.020 × 0.980 + 0.022 × 0.978) ÷ 0.002²
              ≈ 80,700 users per arm

With about 8,000 eligible users a day (4,000 per arm) that is about 20 days — **run three full weeks** so every
weekday appears equally, and do not stop early because the dashboard looks good on day 6.

## What separates strong answers

- A number that decides it (break-even orders, value per contact, sample size), computed aloud.
- Naming **who self-selects** into an offer.
- A test design with one primary metric and guardrails, decided before the data comes in.`,
    mcqs: [
      mcq('A grocery user pays the ₹30 delivery fee on 5 orders a month and joins a ₹99 free-delivery plan. With ₹35 contribution per order, about how many extra orders a month must they place for the plan to break even?', [
        ['About 0.5', false],
        ['About 1.5', true],
        ['About 2.8', false],
        ['About 4.3', false],
      ], 'Fees lost: 5 × ₹30 = ₹150, against ₹99 paid, so the plan loses ₹51 a month on this user. ₹51 ÷ ₹35 ≈ 1.5 extra orders a month are needed to recover it.'),
      mcq('A credit-line segment has 7% activation, ₹1,600 net value per active user after expected losses, and outreach costs ₹2 per user contacted. What is the value per user contacted?', [
        ['₹110', true],
        ['₹112', false],
        ['₹1,598', false],
        ['₹22.9', false],
      ], 'Value per contact = 0.07 × ₹1,600 − ₹2 = ₹112 − ₹2 = ₹110. Forgetting the outreach cost gives ₹112.'),
      mcq('Why should an "EMI at checkout" test be randomised by user rather than by page view?', [
        ['Page views are too numerous for a sample-size calculation to work', false],
        ['A user would see EMI on some visits and not others, mixing groups', true],
        ['Randomising by page view would make the test run far too slowly', false],
        ['Analytics tools are only able to record users, never page views', false],
      ], 'Buying an expensive item takes several visits. If the offer appears on some of them, the same person is in both arms and the difference between groups is diluted.'),
    ],
    checkpoint: [
      mcq('A food app launches a free-delivery membership. Which users are most likely to sign up first?', [
        ['Users who rarely order but like to try new features', false],
        ['Users who already pay delivery fees most often', true],
        ['Users with the largest average basket size', false],
        ['Users who joined the app in the last month', false],
      ], 'People join when the plan saves them money — the frequent fee payers. That adverse selection is why the plan loses money on day one unless members order more.'),
      mcq('An EMI test needs about 80,700 users per arm, and the site sees about 4,000 eligible users per arm a day. How long should the test run?', [
        ['Six days, since the dashboard will usually show a winner by then', false],
        ['About 20 days, rounded up to three full weeks', true],
        ['Exactly 20 days, starting and stopping on any day', false],
        ['Until the p-value first drops below 0.05', false],
      ], '80,700 ÷ 4,000 ≈ 20 days; rounding up to whole weeks balances weekday patterns. Stopping when a dashboard or p-value first looks good inflates false positives.'),
      mcq('Students show the highest activation (6%) for a credit offer but only ₹100 net value per active user after losses. What should a strong answer recommend?', [
        ['Target students first, as their activation is highest', false],
        ['Rank segments by value per user contacted, not by activation', true],
        ['Exclude every segment with activation below six per cent', false],
        ['Target all four segments at once so no value is missed', false],
      ], 'Activation ignores what each customer is worth after credit losses and outreach cost. Value per contact (here ₹4 for students against ₹110 for merchants) is the ranking that maximises return on the budget.'),
    ],
  },

  /* ── TAKE_HOME ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_CASE_INTERVIEWS_TAKE_HOME',
    notes: `Many analyst hiring processes — product companies, fintechs, D2C brands, analytics consultancies — send a
**take-home**: a few CSVs or a SQL dump, a one-paragraph brief, and 24–72 hours. The next round is usually a
30-minute walkthrough of what you sent. Most candidates lose here not on skill but on **scope, checks and the write-up**.

## The process (budget about 8–10 hours of real work)

| Step | Time | Output |
|---|---|---|
| Read the brief twice; write the decision it serves | 20 min | one sentence: "Recommend X to Y" |
| Scope 2–3 questions; email one clarifying question if truly blocked | 20 min | the plan at the top of the notebook |
| Load and **check** the data | 1.5–2 h | row counts, keys, duplicates, gaps, ranges — each with a decision |
| Analyse | 3–4 h | the numbers that answer the questions, with caveats |
| Write the one-page summary | 1–1.5 h | answer first, three supporting numbers, recommendation, caveats, next steps |
| Clean the notebook; rerun from scratch | 45 min | "Restart & Run All" works; no dead cells |

**Deliverables:** a one-page summary (PDF or the first cell of the notebook) that a manager reads in two minutes; a
clean notebook or SQL files; an appendix of data issues. Never send a 60-cell notebook with no conclusion.

## Case 1 — a D2C skincare brand: "Where should next quarter's ₹40 lakh of marketing go?"

Data: orders, customers (with acquisition channel), monthly spend by channel. After checks, the key table:

| Channel | CAC | 90-day repeat rate | 90-day value per customer* | 90-day value − CAC |
|---|---|---|---|---|
| Instagram ads | ₹620 | 18% | ₹399 | −₹221 |
| Google search | ₹540 | 26% | ₹439 | −₹101 |
| Influencers | ₹480 | 9% | ₹355 | −₹125 |

*₹310 contribution on the first order + repeat rate × 1.6 repeat orders × ₹310 (assumption from the order data).

**Read it:** influencers have the **lowest CAC**, which is what most submissions recommend — but their customers
rarely return. Google's customers come back most and lose the least at 90 days. **No channel pays back in 90
days**, so the honest recommendation includes the horizon: "on 90-day value Google ranks first; we need 6-month
repeat data to say whether any channel pays back — here is how to get it". That sentence is what earns the call-back.

## Case 2 — a lending app: "Why did our approval rate fall from 35% to 30% last month?"

**The check that changes everything:** last month's application events include **7,200 duplicates** — the same user
submitting twice within two minutes, after an app update made the Submit button retry on slow networks.

    Last month as logged:   13,500 approved / 45,000 applications = 30.0%
    Duplicates removed:     13,500 approved / 37,800 applications = 35.7%
    Month before:           13,300 / 38,000                       = 35.0%

The approval rate did not fall; the **denominator** was inflated by a bug. The summary leads with that, quantifies
it, names the app version, and recommends de-duplicating on (user, application form) within a short window plus an
alert on duplicate submissions. A candidate who modelled "why approvals fell" for six hours without checking keys
has answered the wrong question.

## Case 3 — writing the one-page summary

    Recommendation: Shift ₹8 lakh from influencers to Google search next quarter; keep Instagram flat
                    while we collect 6-month repeat data.
    Why:
      1. Google-acquired customers repeat at 26% in 90 days vs 9% for influencer customers.
      2. On 90-day contribution, Google loses ₹101 per customer vs ₹125 (influencers) and ₹221 (Instagram).
      3. No channel pays back within 90 days; payback depends on months 4–6, which the data does not yet cover.
    Caveats: channel is last-touch attribution; 1.6 repeat orders per repeater is an average from 2,140 repeaters.
    Next steps: a 6-month cohort view; a geo holdout to measure Instagram's incremental effect.
    Data issues: 312 orders with no customer id (excluded, 1.4% of revenue); test orders removed (41).

**Rules:** answer first; every number traceable to a cell; caveats stated, not hidden; data issues in an appendix.

## The walkthrough round

Expect: "Why did you exclude those orders?", "What would change your recommendation?", "What did you not have time
for?", "Rerun this cell with a different date range." Use of AI tools: follow the brief's rule; if allowed, say what
you used it for, and never let it produce a number you did not verify.`,
    mcqs: [
      mcq('A take-home brief says "Recommend where to spend next quarter\'s ₹40 lakh." What should the first page of the submission contain?', [
        ['The recommendation in a sentence, then three supporting numbers', true],
        ['A data dictionary describing every column in every source file', false],
        ['The complete exploratory analysis, in the order it was done', false],
        ['A description of the Python libraries and versions that were used', false],
      ], 'The reviewer is a manager deciding whether to call you back; they read the first page. Answer first, then evidence; data dictionaries and process belong in the notebook or appendix.'),
      mcq('A lending app logged 45,000 applications and 13,500 approvals last month. 7,200 applications were duplicate retries from an app bug. What is the true approval rate?', [
        ['30.0%', false],
        ['35.7%', true],
        ['46.0%', false],
        ['16.0%', false],
      ], 'Remove the duplicates from the denominator: 45,000 − 7,200 = 37,800; 13,500 ÷ 37,800 = 35.7%, in line with the previous month\'s 35.0%. The "fall" was a logging bug.'),
      mcq('Halfway through a 48-hour take-home, Ankit finds a fascinating fourth question the brief did not ask. What should he do?', [
        ['Answer it fully, since extra analysis always impresses reviewers', false],
        ['Note it under next steps and finish the questions that were asked', true],
        ['Replace the weakest of the three asked questions with the new one', false],
        ['Email the recruiter asking for another 48 hours to include it', false],
      ], 'Scope discipline is part of what a take-home tests. A one-line "next step" shows curiosity without risking the asked questions; swapping or extending changes the brief.'),
    ],
    checkpoint: [
      mcq('In a D2C take-home, 90-day value minus CAC per customer is Instagram −₹221, Google −₹101 and influencers −₹125. Influencers have the lowest CAC. Which channel looks best on this evidence?', [
        ['Influencers, because they have the lowest acquisition cost', false],
        ['Instagram, because its CAC buys the most first orders', false],
        ['Google, because its customers lose the least by day 90', true],
        ['None can be ranked until every channel is profitable', false],
      ], 'CAC alone ignores what customers do after the first order. Google customers repeat most, so they lose least at 90 days. All are negative, so the recommendation should also ask for a longer horizon.'),
      mcq('Which practice most increases a reviewer\'s trust in a take-home notebook?', [
        ['It runs top to bottom after a restart, with every number traceable', true],
        ['It includes every chart produced during exploration, for completeness', false],
        ['It uses the most advanced libraries available to show breadth of skill', false],
        ['It hides the data-quality problems so the story reads more cleanly', false],
      ], 'Reproducibility and traceability let the reviewer verify any number in the summary. Clutter, showy libraries or hidden data problems all reduce trust.'),
      mcq('A take-home brief allows AI tools. How should a candidate use one?', [
        ['Let it write the summary numbers, since it reads the files directly', false],
        ['Use it quietly and never mention it, so the work looks fully original', false],
        ['Use it for drafting or code help, disclose it, and verify every number', true],
        ['Avoid it entirely, because any AI use will be treated as cheating', false],
      ], 'If the brief allows it, disclosed and checked use is fine; the candidate stays responsible for every figure. Undisclosed use or unverified numbers break trust in the walkthrough round.'),
    ],
  },

  /* ── TIMED_CASES ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_CASE_INTERVIEWS_TIMED_CASES',
    notes: `A timed set, run like a case round: **one guesstimate (10 minutes), one metric case (15 minutes), one product
case (15 minutes)**. Do each aloud with a timer and a partner playing interviewer, then compare with the model answer
and score yourself on the rubric at the end. All figures are assumptions given for practice.

## Case A — Guesstimate (10 min): "How many two-wheeler services happen in Bengaluru in a month?"

**Model answer.**
- Clarify: paid services at workshops and service centres, privately owned two-wheelers, Bengaluru city.
- Structure (demand side):

      Population (assume)                          1.3 crore
      people per household (assume)                3.8      -> about 34 lakh households
      households with a two-wheeler (assume)       55%
      two-wheelers per owning household (assume)   1.3      -> about 24.5 lakh two-wheelers
      services per year (one every ~4 months, roughly 3,000 km at ~25 km a day)  3
      services a month = 24.5 lakh × 3 ÷ 12        ≈ 6.1 lakh

- Check: delivery riders (a few lakh vehicles) service more often — add them as a separate segment if time allows;
  supply side: if there are ~8,000 workshops doing ~3 services a day for 26 days, that is ~6.2 lakh.
- Conclude: about 6 lakh a month; most sensitive to service frequency.

## Case B — Metric case (15 min): "Driver cancellations on our ride-hailing app rose from 8% to 12% in Hyderabad"

**Model answer.**
1. *Clarify:* cancellations by drivers after accepting, as a share of accepted rides; same definition both periods.
2. *Real?* Same in the trip database and the analytics tool; spread over the whole fortnight, not one day.
3. *Segment:* by pickup distance, hour, area, driver tenure, app version. The interviewer reveals that the dispatch
   radius was widened from 2.5 to 4 km two weeks ago because of low supply:

   | Pickup distance | Before share | Before cancel | After share | After cancel |
   |---|---|---|---|---|
   | ≤ 2.5 km | 80% | 5% | 68% | 6% |
   | > 2.5 km | 20% | 20% | 32% | 25% |

       before 0.80 × 5 + 0.20 × 20 = 8.0%
       new shares, old rates 0.68 × 5 + 0.32 × 20 = 9.8%   -> mix +1.8 pts
       after 0.68 × 6 + 0.32 × 25 = 12.1%                  -> rate +2.3 pts
4. *Read:* far pickups are cancelled four times as often, and there are more of them (mix); far-pickup cancels also
   rose at peak hours (rate) — drivers accept, see the traffic, and cancel.
5. *Recommend:* show pickup distance before acceptance; pay a pickup-distance bonus beyond 2.5 km; guardrail: rider
   wait time and rides completed per hour. Owner: the supply/ops team.

## Case C — Product case (15 min): "Should our food app add a ₹5 platform fee per order?"

**Model answer.**
- Goal: contribution without losing customers to competitors.
- Numbers (assume 10 lakh orders a day, ₹20 contribution per order, orders fall 1.5% after the fee):

      fee revenue        9.85 lakh orders × ₹5     = ₹49.25 lakh a day
      lost contribution  15,000 orders × ₹20       = ₹3.0 lakh a day
      net                                          ≈ +₹46 lakh a day in the short run

- Risks: the 1.5% is a short-run guess; the long-run effect on retention and on price-sensitive segments (students,
  tier-2 cities) could be larger; competitor response; customer trust if the fee is hidden.
- Test: a geo test — the fee in a few matched cities, others as control, for 6–8 weeks; primary metric contribution
  per active user; guardrails: 30-day retention, order frequency, app ratings and complaints mentioning the fee.
- Recommend: test, show the fee clearly at checkout, and roll out only if contribution per user rises without a
  retention drop beyond an agreed threshold.

## Scoring rubric (per case, out of 100)

| Area | Points | Full marks when |
|---|---|---|
| Structure | 30 | clarified, stated an approach, segments that matter |
| Numbers | 25 | correct arithmetic, units carried, lakh/crore clean |
| Communication | 25 | thought aloud, summarised before details, handled a challenge calmly |
| Recommendation | 20 | a decision, an owner, a metric and a guardrail |

60+ on all three is a pass at most analyst case rounds; below 40 on any area tells you what to drill next week.`,
    mcqs: [
      mcq('In Case A, 24.5 lakh two-wheelers are each serviced about 3 times a year. About how many services is that a month?', [
        ['About 2 lakh', false],
        ['About 6 lakh', true],
        ['About 24 lakh', false],
        ['About 73 lakh', false],
      ], '24.5 lakh × 3 = 73.5 lakh services a year; ÷ 12 ≈ 6.1 lakh a month. 73 lakh is the yearly figure.'),
      mcq('In Case B, cancellations moved from 8.0% to 12.1%. With old cancel rates and the new pickup-distance mix the figure would be 9.8%. How much of the rise is mix?', [
        ['About 1.8 points', true],
        ['About 2.3 points', false],
        ['About 4.1 points', false],
        ['None of it at all', false],
      ], 'Mix effect = 9.8 − 8.0 = 1.8 points; the remaining 12.1 − 9.8 = 2.3 points is rate — far pickups being cancelled more often than before.'),
      mcq('In Case C, why is a geo test (some cities with the fee, others without) preferred over a user-level A/B test for a platform fee?', [
        ['Users who see different fees from friends complain, and pricing tests by user can feel unfair', true],
        ['Geo tests need no control group, so the fee can launch faster in every chosen city', false],
        ['User-level tests cannot measure order counts, only app ratings and user complaints', false],
        ['Platform fees are only legal when they apply to every user in an entire country', false],
      ], 'Different prices for neighbours invite comparison and complaints, and spill over socially. Matched cities keep each market\'s price consistent while still providing a control.'),
      mcq('Which answer to "Should we add a ₹5 platform fee?" would score highest on the rubric\'s recommendation area?', [
        ['"Yes, it adds ₹46 lakh a day, so we should launch it everywhere tomorrow."', false],
        ['"No, customers dislike fees and some of them will move to a competitor."', false],
        ['"Test it in matched cities for 6–8 weeks; roll out if retention holds."', true],
        ['"It depends on many factors that we would need to study in much more detail."', false],
      ], 'Full marks need a decision, the metric that will confirm it and a guardrail. The short-run arithmetic alone ignores retention risk; "it depends" gives no decision.'),
      mcq('Practising the timed set, Divya gets every number right but runs 8 minutes over on the metric case by narrating every segment she can think of. Which fix targets her weak area?', [
        ['Drill more arithmetic, since numbers carry the most rubric points', false],
        ['Rank hypotheses by likely size and cut the two biggest first', true],
        ['Skip clarifying questions so there is more time for segments', false],
        ['Memorise a longer list of segments so she can recite them faster', false],
      ], 'Running long by listing everything is a structure problem: a strong answer prioritises the cuts most likely to explain the change. Dropping clarification would cost structure marks too.'),
    ],
  },

  /* ── CHECKPOINT ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_CASE_INTERVIEWS_CHECKPOINT',
    notes: `Ten case-interview scenarios: guesstimates, metric cases, product and business cases, and take-homes. Some need a
quick calculation — do it on paper, as you would in the room.

Before you start, recall the habits this topic drills:
- **Clarify, then structure** — say what is counted and how you will get there before any number.
- **Mix vs rate** — when an average moves, check whether segments changed or only their shares.
- **Money, not activity** — break-even, value per contact and contribution decide product cases; usage and
  activation do not.
- **Check the data first** — in a take-home, duplicates and definitions change the answer more often than models do.`,
    checkpoint: [
      mcq('In a guesstimate for monthly bus tickets sold in Chennai, Kiran uses "people × trips per day" and then forgets to convert to a month. Which habit would have caught it?', [
        ['Writing each line with its unit and the period it covers', true],
        ['Using more precise population figures from the census', false],
        ['Asking the interviewer to confirm each multiplication', false],
        ['Starting from the supply side instead of the demand side', false],
      ], 'Carrying units ("trips a day", "tickets a month") on every line makes a missing ×30 visible. Precision or a different approach does not prevent unit slips.'),
      mcq('An estimate of weekly gym visits in Pune counts all college students and also all members of every gym. What is the error?', [
        ['The same students are counted twice, once in each group', true],
        ['Gym members should be estimated using the supply side only', false],
        ['College students never use commercial gyms in big cities', false],
        ['Weekly figures cannot be estimated without a daily figure', false],
      ], 'Overlapping segments double-count people. Segments must be mutually exclusive — for example students who use gyms, and non-student members — so each person is counted once.'),
      mcq('Average order value fell from ₹420 to ₹395. Each city\'s AOV is unchanged, but the newly launched tier-2 cities have lower AOVs. What explains the fall?', [
        ['A mix shift towards lower-AOV cities, not a fall within any city', true],
        ['Customers in every city are now buying smaller baskets than before', false],
        ['A pricing error that lowered prices across the whole catalogue', false],
        ['A data pipeline bug, since averages cannot fall when parts are flat', false],
      ], 'When every segment holds steady and the total moves, the shares changed. Reporting old and new cities separately keeps the headline honest.'),
      mcq('A notification feature\'s dashboard shows 25% of sessions now start from a notification. The PM calls it a big success. What is the strongest reply?', [
        ['Some of those users would have opened the app anyway; a holdout shows the real lift', true],
        ['25% is too low a share of sessions for any notification feature to be judged a success', false],
        ['Session starts are an outcome metric, so they prove the feature added real usage', false],
        ['Notifications should be judged only on their click-through rate, not on sessions', false],
      ], 'A feature\'s own usage includes behaviour it merely redirected. Comparing sessions per user with a randomised holdout that gets no notifications measures what it added.'),
      mcq('A faster-delivery pilot raises orders 5% but cuts contribution per order from ₹30 to ₹24. What happens to total contribution?', [
        ['It rises, because orders grew', false],
        ['It falls by about 16%', true],
        ['It falls by about 20%', false],
        ['It stays roughly flat', false],
      ], '1.05 × ₹24 = ₹25.2 per original order vs ₹30: a fall of 16%. More orders cannot offset a 20% fall in contribution per order.'),
      mcq('A free-delivery plan costs ₹149 a month. A likely member pays the ₹40 fee on 5 orders a month, and each order contributes ₹25. How many extra orders a month break even?', [
        ['About 1.6', false],
        ['About 2.0', true],
        ['About 3.0', false],
        ['About 6.0', false],
      ], 'Fees lost: 5 × ₹40 = ₹200; plan revenue ₹149; shortfall ₹51. ₹51 ÷ ₹25 ≈ 2.0 extra orders a month to break even.'),
      mcq('For an offer, segment X has 10% activation and ₹300 value per active user; segment Y has 4% activation and ₹1,200 per active. Contact costs ₹3. Which segment is better per contact?', [
        ['X, because its activation rate is more than twice as high', false],
        ['Y, at ₹45 per contact against ₹27 for X', true],
        ['They are equal once the contact cost is subtracted', false],
        ['X, at ₹30 per contact against ₹48 for Y', false],
      ], 'X: 0.10 × 300 − 3 = ₹27; Y: 0.04 × 1,200 − 3 = ₹45. Ranking by activation would choose the less valuable segment.'),
      mcq('A test needs 60,000 users per arm and the site gets 5,000 eligible users per arm a day. What test plan is right?', [
        ['Run for 12 days and stop then, whatever day it is', false],
        ['Run for two full weeks, decided before it starts', true],
        ['Run until the dashboard shows a significant result', false],
        ['Run for one week and double the traffic to each arm', false],
      ], '60,000 ÷ 5,000 = 12 days, rounded up to whole weeks so every weekday is represented. Stopping when it first looks significant inflates false positives.'),
      mcq('In a take-home, conversion seems to fall from 4.0% to 3.1% the week a new app version shipped. Session events doubled for that version only. What should be checked first?', [
        ['Whether the new version logs sessions twice, inflating the denominator', true],
        ['Whether competitors launched promotions in the same week', false],
        ['Whether the checkout page design changed in the new version', false],
        ['Whether conversion falls are common in that month of the year', false],
      ], 'A doubled event count on one version points to instrumentation, which would shrink conversion without any change in behaviour. Rule out logging before explaining the "fall".'),
      mcq('A take-home walkthrough panellist asks, "What would change your recommendation?" Which answer is strongest?', [
        ['"Nothing — the analysis is thorough and the evidence is clear."', false],
        ['"If 6-month repeat data showed influencer customers catching up."', true],
        ['"If the panel prefers a different channel, I am happy to switch."', false],
        ['"More data in general, since every analysis can always be improved."', false],
      ], 'Naming the specific evidence that would overturn the conclusion shows the candidate understands what it rests on. Certainty, deference or vague "more data" do not.'),
    ],
  },

  /* ══ DT_PLACE_DA_FS ══════════════════════════════════════════════════════════════════════ */

  /* ── RESUME ───────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_PLACE_DA_FS_RESUME',
    notes: `Year 4's shared resume pack covers format and basics. This unit is the **analyst** version: the resume that
gets through the ATS for roles titled "Data Analyst", "Business Analyst", "Product Analyst", "MIS Analyst",
"Associate Analyst — Business Intelligence" or "Decision Scientist — Fresher", and a portfolio where every claim
can be opened and checked in under a minute.

## Who reads it, and what they filter on

- **Service companies and captive analytics centres** (analyst roles at IT services firms, banks' and retailers'
  Indian capability centres) — mass drives; filters on SQL, Excel, a BI tool, academics.
- **Product companies, fintech, e-commerce** — SQL depth, metrics and experimentation, Python for analysis.
- **Analytics consultancies** — case skills, Excel and PowerPoint-style communication, SQL, a BI tool.

## The skills line an ATS filters on

Recruiters search with the job description's words. Use those spellings:

    SQL:          MySQL, PostgreSQL — joins, CTEs, window functions, cohort and funnel queries
    Excel:        XLOOKUP, PivotTables, SUMIFS/COUNTIFS, Power Query, charts
    Power BI:     Power Query, star schema modelling, DAX (CALCULATE, time intelligence), RLS
    Python:       pandas, NumPy, Matplotlib, seaborn, Jupyter
    Statistics:   hypothesis testing, A/B testing, confidence intervals, regression basics
    AI:           LLM APIs for text classification and summaries, with accuracy measured
    Tools:        Git, GitHub, Google Sheets

"Advanced Excel" alone tells a recruiter nothing — name the functions. Write "Power BI" and "DAX" separately; both
are searched. Leave out what you cannot defend for five minutes: "Machine Learning", "Deep Learning", "Big Data",
"Tableau" if you never built in it. Round 2 is written from this line.

## Project bullets: action + method + business result + number

The analyst version of "verb + what + how + number" ends in a **business result**, not a technique.

- Weak: "Did EDA on retail data using pandas."
- Strong: "Found that Chennai's 10.1% like-for-like revenue fall came from 10.6% fewer bills — members and walk-ins
  alike — starting October 2024, not smaller baskets (SQL, pandas)."
- Strong: "Analysed a randomised SMS coupon test (n = 6,000): +5.4 pp 28-day visit rate (95% CI 3.0–7.8 pp);
  about ₹96,000 extra gross margin against ₹8,550 in coupons."
- Strong: "Built a 4-page Power BI report for the city managers with a star schema, documented DAX measures and
  city-level RLS."
- Strong: "Labelled 2,500 reviews with an LLM API; measured 85% agreement on 100 hand labels and reported where it
  under-counts price complaints."

(Those are the Bazaar Fresh numbers when the capstone's definitions are followed; use your own if your choices
differed — every number must be one you can reproduce on the spot.)

## The portfolio that backs every line

- **GitHub repository per project** — README with the question, the answer, three findings with numbers, a
  screenshot of the dashboard, how to run it, and "Known limits". Notebooks render on GitHub; keep outputs in them so
  a reader sees results without running anything.
- **The dashboard** — Power BI's **Publish to web** creates a link anyone on the internet can open, so use it only for
  public or synthetic data (Bazaar Fresh is synthetic); never for an employer's or internship's data. Many
  organisations disable it. The safe alternative: a PDF export of every page plus a two-minute screen recording.
- **A one-page case write-up** per project — the answer-first summary you would send a manager.
- **LinkedIn and Naukri** — headline "Data Analyst | SQL, Power BI, Python, A/B testing"; the capstone in Featured;
  the same skill spellings as the resume, because recruiters search those platforms the same way.

## Three copies of one true resume

| Target | Lead with | Push down |
|---|---|---|
| Service / MIS / captive centre | SQL, Excel, Power BI; academics; certifications you actually earned | statistics depth |
| Product / fintech / e-commerce | the experiment, metrics, SQL windows, the decomposition | Excel functions |
| Analytics consultancy | the business question and recommendation, the dashboard, communication | Python details |

The facts never change between copies — only the order.`,
    workedExample: `**A weak analyst resume, rewritten.** Meera, B.Tech ECE 2026, CGPA 7.8, sends:

    SKILLS: Advanced Excel, SQL, Python, Power BI, Tableau, Machine Learning, Data Science, Big Data
    PROJECTS
    1. Sales Dashboard — made a dashboard in Power BI.
    2. Titanic Survival Prediction — logistic regression, 79% accuracy.
    3. Retail Analysis — did EDA and found insights.

**What a recruiter sees.** "Advanced Excel" with no functions; Tableau, Machine Learning and Big Data with nothing
behind them; a Kaggle notebook taking a project slot for an analyst role; "found insights" with no insight.

**Step 1 — inventory what is true.** Meera's capstone (Bazaar Fresh): MySQL tables with keys; seven commented
queries; data checks that found 700 duplicated bill lines (₹3.8 lakh) and the BF06 POS outage week; like-for-like
growth by city with Chennai decomposed; the SMS coupon test with SRM check, z-test and CI; a Power BI report with
RLS; 2,500 reviews labelled with an LLM and checked against 100 hand labels. She has never opened Tableau.

**Step 2 — rewrite.**

    Bazaar Fresh — retail chain performance analysis                github.com/meera-r/bazaar-fresh
    MySQL, pandas, SciPy, Power BI (DAX, RLS), LLM API
     - Showed chain revenue +15.9% was all new stores: like-for-like revenue fell 3.3%, led by Chennai (−10.1%,
       driven by 10.6% fewer bills from October 2024).
     - Evaluated a randomised SMS coupon test (n = 6,000; SRM p = 0.86): +5.4 pp 28-day visit rate
       (95% CI 3.0–7.8 pp), ~₹96k extra gross margin vs ₹8.6k coupon cost.
     - Found and removed 700 duplicated bill lines (₹3.8 lakh) and flagged a 7-day POS outage before any analysis.
     - Built a 4-page Power BI report with a star schema, documented measures and city-level RLS.
     - Labelled 2,500 reviews with an LLM API; 85% agreement with 100 hand labels; price complaints under-counted.

    SKILLS
    SQL (MySQL: joins, CTEs, window functions) | Excel (XLOOKUP, PivotTables, SUMIFS, Power Query)
    Power BI (Power Query, DAX, RLS) | Python (pandas, NumPy, seaborn) | Statistics (A/B testing, CIs)

**Step 3 — check against a JD.** A Bengaluru fintech asks for "SQL, Excel, Power BI or Tableau, A/B testing,
Python a plus". Every word she has appears verbatim; "Tableau" stays off, and she prepares to say "I've built in
Power BI; the modelling ideas carry over". Titanic moves off the resume; Machine Learning and Big Data are gone.

**Step 4 — make the portfolio agree.** The README leads with the three findings and the dashboard PDF; the
notebooks keep their outputs; the Publish-to-web link is fine because the data is synthetic; the LLM key was never
committed (loaded from the environment).`,
    mcqs: [
      mcq('A data-analyst JD asks for "SQL, Excel (VLOOKUP/XLOOKUP, pivot tables), Power BI". Tanvi\'s skills line says "Advanced Excel, BI tools". What is the best edit?', [
        ['Name the functions and tools she has used, in the JD\'s spellings', true],
        ['Add "Expert" before each skill so that the line reads more strongly', false],
        ['Keep the line short and put the JD keywords in a hidden text block', false],
        ['Replace the skills line with a paragraph about her passion for data', false],
      ], 'Recruiters search for the exact terms, so "XLOOKUP", "PivotTables" and "Power BI" must appear if true. Vague labels or self-ratings match nothing; hidden keywords look dishonest when found.'),
      mcq('Which capstone bullet would an analytics hiring manager value most?', [
        ['Performed detailed EDA and data cleaning on a retail dataset in pandas', false],
        ['Created many charts and a dashboard showing all the important KPIs', false],
        ['Traced a 10.1% revenue fall in one city to 10.6% fewer bills from October', true],
        ['Used SQL, Python, Power BI and an LLM API across the full capstone analysis', false],
      ], 'An analyst is hired to explain business results. A bullet with a finding, its cause and the size is a claim the panel can probe; lists of techniques or tools are not results.'),
      mcq('Rakesh wants to show his capstone dashboard to recruiters. It was built on data from his internship at a lending startup. What should he do?', [
        ['Use Publish to web, since recruiters need a link that works without login', false],
        ['Rebuild it on synthetic or public data, or show only a cleared PDF', true],
        ['Share the .pbix file, because file sharing does not count as publishing', false],
        ['Blur customer names in screenshots and publish the rest of it as it is', false],
      ], 'An employer\'s data is not his to publish, and Publish to web makes a report public to anyone with the link. A synthetic rebuild, or material the company has cleared, keeps the portfolio safe.'),
    ],
    checkpoint: [
      ck('PLACEMENT_READINESS', 'Harini lists "Tableau" on her resume because many JDs ask for it, though she has built only in Power BI. What should she do?', [
        ['Keep it, since the two tools are similar enough to answer questions', false],
        ['Remove it and be ready to explain how her Power BI skills transfer', true],
        ['Move it into the summary, where skills are rarely examined closely', false],
        ['Keep it and watch a short tutorial the night before each interview', false],
      ], 'Interviewers build questions from the skills line, and a single Tableau question exposes the claim. Listing Power BI honestly and explaining transferable modelling skills is safer and still answers the JD.'),
      ck('PORTFOLIO_EVIDENCE', 'A recruiter opens Varsha\'s capstone repository for one minute. What should they see first?', [
        ['A README leading with the question, three findings and the dashboard', true],
        ['A folder listing of all the raw CSV files and every working notebook made', false],
        ['The requirements file, so the recruiter knows the library versions', false],
        ['A long acknowledgement section thanking mentors and classmates', false],
      ], 'A recruiter will not run code. The README must show the business question, the findings with numbers and a picture of the dashboard, with links to the notebooks behind each claim.'),
      ck('PLACEMENT_READINESS', 'Nikhil applies to a mass-recruiter analyst drive and to a fintech product-analyst role. Which difference between his two resume copies is right?', [
        ['The fintech copy adds Machine Learning, which fintech roles expect', false],
        ['The mass-recruiter copy drops the capstone so the page looks shorter', false],
        ['The fintech copy leads with the experiment and metric decomposition', true],
        ['Both copies stay identical so that his story never looks inconsistent', false],
      ], 'Same true facts, ordered for the reader: SQL, Excel and academics first for a mass drive; experimentation and metrics first for a product role. Adding skills he lacks fails in the interview.'),
    ],
  },

  /* ── DEFEND_CAPSTONE ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_PLACE_DA_FS_DEFEND_CAPSTONE',
    notes: `Year 3's demo day rehearsed the ten-minute presentation and the first round of questions — why like-for-like,
what a p-value means, how you know the AI labels are right. In a placement panel the questions go **one level
deeper**: the interviewer has your numbers in front of them and pushes on each one. These are the questions panels
ask about the **Bazaar Fresh** capstone, with strong answers built on the numbers the seeded data gives when the
capstone's definitions are followed. (If you chose Option B or C, make the same table for your own project.)

## The numbers you must know without looking

| Item | Value |
|---|---|
| Bills / bill lines | 2,98,613 / 10,46,701 |
| Duplicated bill lines removed | 700 (₹3.8 lakh of ₹55.2 crore net revenue) |
| Walk-in bills (blank customer id) | about 40% |
| "upi" written in lower case | 24,133 bills |
| Chain growth, Oct–Mar FY25 vs FY24 | +15.9% all stores; −3.3% like-for-like (14 stores) |
| Chennai like-for-like | revenue −10.1%; bills −10.6%; average bill +0.5% |
| Chennai members / walk-ins (bills) | −10.3% / −10.9% |
| SMS test split | 3,007 control / 2,993 SMS; SRM p = 0.86 |
| 28-day visit rate | 32.4% control vs 37.9% SMS: +5.4 pp, 95% CI 3.0 to 7.8 pp, z = 4.4 |
| Bills per member in the window | 0.395 vs 0.475: +0.080 (95% CI 0.047 to 0.114) |
| SMS50 coupons redeemed | 171 (₹8,550) |
| Gross margin rate | 21.7% of net revenue; average bill ₹1,848 |

## 1. "Bengaluru is down 2.6% like-for-like. Is it in trouble too?"

**Strong:** "No — most of that is data, not demand. BF06 had a POS outage from 11 to 17 November 2024, so the FY25
period is missing a week of one store. Excluding that week in both years, Bengaluru is −1.7%. And the FY24 period
had 29 February — 183 days against 182 — which is −0.55% on every city by itself. Per day, Bengaluru is about −1%,
within normal variation. Chennai, at −10%, is different in kind."
**Follow-up:** "Why not just fill the outage week with an average?" → you could, but then a made-up week sits in the
headline; excluding the same week in both years keeps the comparison like for like, and the treatment is stated.
**Trap:** explaining Bengaluru's −2.6% with a business story before checking coverage.

## 2. "Prove Chennai's fall is footfall and not basket size."

**Strong:** "Revenue = bills × average bill. Bills fell 10.6%; average bill rose 0.5%. So it is fewer visits. It is
in both members (−10.3%) and walk-ins (−10.9%), so it is not a loyalty-programme issue. It is in all four Chennai
stores, between −9.6% and −11.3%. Against Pune — same store formats — Chennai's bills ran at about 1.00× Pune's every
quarter until September 2024, then 0.89× and 0.91×. That timing fits something starting in October, such as a
competitor opening; the data cannot tell me what, so I'd ask the city manager."
**Trap:** "Customers are unhappy" — the reviews were not part of this decomposition.

## 3. "February is down in every city. Why didn't you flag that?"

**Strong:** "February 2024 had 29 days and February 2025 had 28, so a monthly comparison drops 3.4% from the calendar
alone. I compare per day, or I'd label it. That's why Hyderabad shows −5.5% in February but is flat or up in most other months."

## 4. "Your SMS result — how big, how sure, and was the split fair?"

**Strong:** "The split was 3,007 to 2,993 — a chi-square SRM check gives p = 0.86, so no sign of broken
randomisation. Visit rate 32.4% vs 37.9%: +5.4 points, about +17% relative, 95% CI 3.0 to 7.8 points. Even the low
end is a real effect."
**Follow-up:** "Why a z-test?" → visit-or-not is binary, so a two-proportion z-test (the same as a 2×2 chi-square).
For bills per member — a skewed count — I used Welch's t-test, which is fine at about 3,000 per arm; a bootstrap
gives the same answer.

## 5. "Did it pay for itself? Show the arithmetic."

**Strong:** "Extra bills: 0.080 per member × 2,993 ≈ 240. Each bill averages ₹1,848 at a 21.7% gross margin ≈ ₹400.
So about ₹96,000 of extra gross margin. Cost: 171 coupons × ₹50 = ₹8,550, plus about 3,000 SMS — a few hundred
rupees at typical bulk rates. Even at the low end of the interval, 140 extra bills, it is about ₹56,000."
**Caveats you raise yourself:** a 28-day window cannot see **pull-forward** — members may have shifted February visits
into January, so I'd check the next four weeks; gross margin is before store costs; unit_cost is today's cost, not
the cost at the time of sale.

## 6. "How do you know the 700 rows were duplicates, not a customer buying the same item twice?"

**Strong:** "(order_id, line_no) should be unique — a second purchase of the same item gets a new line number. These
700 repeated an existing key exactly. Effect on revenue: ₹3.8 lakh out of ₹55.2 crore, 0.07% — small, but I remove it
because it is wrong, not because it is large."

## 7. "You report review themes by city and quarter. Is every difference real?"

**Strong:** "No. Six themes × four cities × six quarters is 144 cells from 2,500 reviews — about 17 a cell. Some swings
are noise, and with 144 comparisons a few will look 'significant' by chance. So the dashboard shows themes by city
over the whole period and by half-year, with counts, and I only call out differences that are large and stable."

## 8. "If you'd hand-labelled 200 reviews instead of 100, what changes?"

**Strong:** "The accuracy estimate gets tighter. At 85% agreement the Wilson 95% interval is about 77–91% with 100
labels and about 79–89% with 200. It does not fix the price under-count — that needs better instructions, re-measured
on a fresh sample."

## 9. "What would you do with two more weeks?"

**Strong:** one real gap: "Check pull-forward for the SMS test over the following four weeks, then design a rollout
with a 10% holdout so we keep measuring the coupon's effect."

**Rule:** say what the data cannot tell you — then how you would find out. Panels score that above a confident guess.`,
    workedExample: `**Whiteboard: "Your headline says like-for-like revenue fell 3.3%, but the CEO's deck says we grew 15.9%. Reconcile
them for me."**

Write as you talk:

    All stores, Oct–Mar FY25 vs FY24               +15.9%
      minus BF04 and BF08 (opened 15 July 2024: FY25 sales, no FY24 sales)
    14 like-for-like stores                         −3.3%
      by city:  Hyderabad +1.5% | Pune −0.3% | Bengaluru −2.6% | Chennai −10.1%
      Bengaluru: outage week + one fewer day   ->  about −1% per comparable day
      Chennai:   bills −10.6%, average bill +0.5%; members and walk-ins both down; all four stores

Say it in order:

1. "Both numbers are right; they answer different questions. +15.9% includes two stores that had no sales a year
   earlier — that's expansion."
2. "Like-for-like keeps only the 14 stores open throughout both periods: −3.3%."
3. "Most of that is Chennai: −10.1%, all from fewer bills, starting in October 2024."
4. "Bengaluru's −2.6% is mostly a data artefact — a week-long POS outage at BF06 and the leap day."
5. "So the message for the CEO: expansion is working, existing stores are roughly flat except Chennai, and Chennai
   needs a visit."

**The follow-up chain.**
- "Why not count the new stores from their first full month?" — "That's a valid alternative definition; it would
  enter them into like-for-like in FY26, once they have a year of history. I chose the strict version and said so."
- "Is −3.3% significant?" — "This isn't a sample; it is every bill. The question is whether it's a real business
  change or calendar and data effects — which is why I took out the outage and compared per day."
- "Which number goes on the Monday dashboard?" — "Both, labelled: total growth and like-for-like, with the
  like-for-like store list in the measure's description."`,
    mcqs: [
      mcq('Bengaluru\'s like-for-like revenue is −2.6%. One store lost a week of bills to a POS outage, and the earlier period contained 29 February. What is the right first step?', [
        ['Exclude the outage week in both years and compare per day', true],
        ['Report −2.6% as is, since every bill in the data was counted', false],
        ['Fill the outage week with zeros so both periods have equal days', false],
        ['Remove the store with the outage from the whole analysis', false],
      ], 'Coverage problems must be fixed before a business story is told. Excluding the same week in both years and comparing per day brings Bengaluru to about −1%; zeros would make the fall worse, not fairer.'),
      mcq('A panellist asks how Kiran knows the 700 removed bill lines were duplicates rather than repeat purchases. Which answer is strongest?', [
        ['They repeated an existing (order_id, line_no) key, which should be unique', true],
        ['They had the same product and price, which genuine repeat purchases never do', false],
        ['They were all in the same week, which suggests a data-loading problem', false],
        ['Pandas flagged them with duplicated(), which is reliable for this', false],
      ], 'A genuine second purchase of the same item gets a new line number on the bill. Exact repeats of the key are duplicates by definition; duplicated() only finds what you ask it to compare.'),
      mcq('The SMS group made about 240 extra bills, each at roughly ₹400 gross margin, and 171 coupons of ₹50 were redeemed. Which caveat should the candidate raise unprompted?', [
        ['Members may have shifted later visits into the window, so check the next weeks', true],
        ['A 95% interval of 3.0 to 7.8 points means the effect could actually be negative', false],
        ['Gross margin cannot be computed from unit costs and selling prices at all', false],
        ['SMS campaigns can never be evaluated with a randomised controlled experiment', false],
      ], 'A 28-day window cannot see pull-forward, where visits move earlier rather than increase. The interval excludes zero, and the margin and the randomised design are sound.'),
    ],
    checkpoint: [
      ck('TECHNICAL_EXPLANATION', 'February like-for-like bills are down 3–5% in every city, including cities that grew in other months. What should the candidate explain?', [
        ['A broad February slowdown, worth an urgent note to leadership', false],
        ['February 2024 had 29 days and 2025 had 28, so compare per day', true],
        ['A data-loading failure in February that needs a full reload', false],
        ['Normal random noise that does not need to be explained at all', false],
      ], '28 ÷ 29 is a 3.4% fall from the calendar alone. Comparing per day removes it; a panel that spots an unadjusted leap day will doubt the rest of the analysis.'),
      ck('TECHNICAL_EXPLANATION', 'The theme dashboard compares 6 themes × 4 cities × 6 quarters from 2,500 reviews. A panellist points to one cell that jumped. Best answer?', [
        ['With ~17 reviews per cell, many jumps are noise; I report wider cuts', true],
        ['Every cell is correct because the LLM labelled all 2,500 reviews', false],
        ['The jump is significant because it is more than double the cell average', false],
        ['Small cells are fine as long as overall accuracy was above 80%', false],
      ], '144 cells from 2,500 reviews leaves about 17 per cell, and with that many comparisons some will swing by chance. Aggregating to city or half-year and showing counts keeps claims honest.'),
      ck('TECHNICAL_EXPLANATION', 'Asked why Chennai\'s fall is footfall rather than basket size, which answer is strongest?', [
        ['Reviews mention long queues, which shows that customers stopped coming', false],
        ['Chennai has a competitor now, which always reduces footfall in a city', false],
        ['Bills fell 10.6% while average bill rose 0.5%, in members and walk-ins', true],
        ['Revenue fell 10.1%, which is too large to be explained by basket size', false],
      ], 'Revenue = bills × average bill, and the split shows the whole fall is in bills, across both customer types. The competitor is a hypothesis to check with the city manager, not evidence.'),
    ],
  },

  /* ── MOCK_LOOP ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_PLACE_DA_FS_MOCK_LOOP',
    notes: `One complete interview day for a **fresher analyst** role — typically ₹3.5–6 LPA at a service company or captive
centre, ₹6–12 LPA at a product company, fintech or analytics consultancy (ranges vary widely by city and company).
Run it with a friend or mentor as interviewer, in order, in one day, with real timers. The shared Year-4 mocks
rehearse aptitude, HR and generic rounds alone; this strings the analyst version together.

## Round 0 — Online test (75–90 min, proctored)

| Section | Time | What it is |
|---|---|---|
| Aptitude | 25 min | quant (percentages, ratios, data interpretation tables), logical, verbal |
| SQL | 25 min | 2–3 queries on a given schema, or SQL MCQs on output |
| Excel / data | 20 min | a small sheet: lookups, SUMIFS, a pivot, a chart, or MCQs on functions |

**Sample SQL task:** "From orders(order_id, customer_id, order_date, amount), list customers whose second order
came within 30 days of their first."

    WITH ranked AS (
      SELECT customer_id, order_date,
             ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date, order_id) AS rn
      FROM orders
    )
    SELECT f.customer_id, f.order_date AS first_order, s.order_date AS second_order
    FROM ranked f
    JOIN ranked s ON s.customer_id = f.customer_id AND s.rn = 2
    WHERE f.rn = 1
      AND s.order_date <= f.order_date + INTERVAL 30 DAY;      -- MySQL

Date arithmetic differs: MySQL \`DATE_ADD\`/\`INTERVAL\` or \`DATEDIFF(s, f) <= 30\`; PostgreSQL \`s.order_date -
f.order_date <= 30\` on DATE columns; SQL Server \`DATEDIFF(day, f.order_date, s.order_date) <= 30\`; SQLite
\`julianday(s) - julianday(f) <= 30\`. **The trap to mention:** a customer with two orders on the same day has a
"second order" at 0 days. On a test table with customers C1 (3 Jan, 20 Jan), C2 (5 Jan, 19 Feb), C3 (one order),
C4 (two orders on 12 Jan, then 1 Feb) and C5 (1 Feb, 1 Mar), the query returns C1 (17 days), C4 (0 days) and C5 (28
days). If "second order" means a second **visit day**, rank DISTINCT (customer_id, order_date) instead — then C4's
second day is 1 Feb (20 days). Ask which definition they want.

## Round 1 — Technical: SQL, Excel/Power BI, statistics (45 min)

1. Live SQL on a shared screen: "Month-over-month revenue growth by city" — then "now only for stores open all year".
2. "A VLOOKUP returns #N/A for IDs you can see in the other sheet — why?" → trailing spaces, numbers stored as text,
   exact vs approximate match.
3. "In Power BI, why does your Average Bill measure give a different total than the average of the rows above?" →
   a measure is re-evaluated in the total's filter context; it is not a sum of visible rows.
4. "Conversion was 4.0% for 10,000 users in control and 4.5% for 10,000 in treatment. Significant?" → pooled
   two-proportion z ≈ 1.75, p ≈ 0.08: not at 5%; the interval includes zero but also a useful lift — inconclusive,
   not "no effect".
5. "pandas: a merge doubled your revenue total — what happened and how do you stop it?" → a non-unique key on the
   right; \`validate="many_to_one"\` and row counts before and after.
**Scored on:** correct and explained, checks unprompted, honest at the edge.

## Round 2 — Case round (30–40 min)

One guesstimate or one metric case, then a product case. Use the structures from the case topic: clarify, structure,
numbers aloud, check, recommend with an owner and a guardrail. **Scored on** the rubric from the timed cases.

## Round 3 — Hiring manager (30 min)

"Walk me through your capstone in three minutes." (Then the DEFEND_CAPSTONE questions.) "A sales head says your
number is wrong in front of their team — what do you do?" → reconcile definitions privately, then report back.
"You have three requests due Friday and can finish two — what do you do?" → ask which decision each serves, agree
the priority with the manager, say what slips and when.
**Scored on:** judgement, ownership, how you handle disagreement about numbers.

## Round 4 — HR (15 min)

"Why analytics and not software development?", "Comfortable with a service agreement / relocation / shifts?",
"Higher studies plans?", "Expected CTC?". Answers consistent with the resume; know the company's analytics work.

## Debrief template (fill within an hour)

    Round / interviewer role:
    Questions asked, verbatim:
    Answered well — why:
    Weak or blank — the question + what a strong answer contains:
    Numbers I could not reproduce on the spot:
    Fix before the next loop (max 3, each with a date):`,
    mcqs: [
      mcq('In the online test, Sneha\'s "second order within 30 days" query returns a customer whose two orders were on the same day, at 0 days apart. What should she do?', [
        ['Delete that customer from the results by hand before submitting', false],
        ['State the definition she used, or rank distinct order days if asked', true],
        ['Switch to RANK so that the two same-day orders share one position', false],
        ['Ignore it, since same-day orders cannot appear in real data at all', false],
      ], 'Whether a same-day order counts as a second order is a definition question. Stating the choice, or ranking DISTINCT (customer, date) when "second visit day" is meant, is what interviewers look for. RANK would give both rank 1 and lose the second order entirely.'),
      mcq('Round 1: conversion is 4.0% in control and 4.5% in treatment, 10,000 users each; the two-proportion test gives z ≈ 1.75, p ≈ 0.08. What is the best answer?', [
        ['The treatment works, because 4.5% is higher than 4.0%', false],
        ['The treatment has no effect, because p is above 0.05', false],
        ['Inconclusive: the data fits zero and also a useful lift', true],
        ['Significant at 10%, so it should be launched at once', false],
      ], 'A p-value of 0.08 means the test could not separate the lift from chance at the 5% level, but the interval still includes a worthwhile gain. "No effect" is not shown; a larger test would decide.'),
      mcq('A VLOOKUP returns #N/A for customer IDs that are clearly visible in the lookup sheet. Which cause should be checked first?', [
        ['Trailing spaces or IDs stored as text in one sheet and numbers in the other', true],
        ['The lookup sheet has more than a thousand rows, which VLOOKUP cannot search', false],
        ['VLOOKUP only works when both sheets are saved in the same workbook folder', false],
        ['The formula needs to be entered as an array formula with Ctrl+Shift+Enter', false],
      ], 'Invisible mismatches — spaces, or "1045" as text against 1045 as a number — are the usual cause of #N/A on values that look identical. TRIM and VALUE (or consistent types) fix it.'),
      mcq('In the hiring-manager round: "A sales head says your number is wrong in front of their team." Which response scores best?', [
        ['Defend the number firmly in the meeting, since the analysis was checked', false],
        ['Agree to change the number to match theirs and keep the meeting calm', false],
        ['Offer to reconcile definitions with them after the meeting, then report back', true],
        ['Escalate to your manager immediately so the sales head is corrected', false],
      ], 'Most disagreements are definitions — stores, dates, returns. Reconciling privately and reporting back protects both the relationship and the number; arguing, caving or escalating does neither.'),
      mcq('After the mock loop, Arjun\'s debrief says "SQL went badly". Which rewrite is most useful?', [
        ['"SQL went badly; I will revise all of SQL from the start this week."', false],
        ['"Missed: MoM growth with LAG per city; fix by 12 Nov with 5 drills."', true],
        ['"The SQL interviewer asked questions that were far too advanced."', false],
        ['"I was nervous in SQL, so next time I will try harder to stay calm."', false],
      ], 'A useful debrief names the exact question, the missing piece and a dated practice plan. "Revise everything", blaming the question or noting nerves gives nothing specific to fix.'),
    ],
  },

  /* ── CHECKPOINT ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_PLACE_DA_FS_CHECKPOINT',
    notes: `This checkpoint measures the judgement an analytics hiring panel looks for: a resume whose every line is
checkable, a portfolio a recruiter can read in a minute, a capstone defended with its own numbers, and composure
across the interview day.

Recall the rules of this topic:
- **Every claim is checkable** — a finding, a number, a repository, a dashboard export.
- **Know your numbers** — and the definitions behind them; reconcile before you defend.
- **Say what the data cannot tell you** — then how you would find out.

Each question is a scenario. Pick what a strong candidate would actually do.`,
    checkpoint: [
      ck('PLACEMENT_READINESS', 'Pooja\'s resume lists "Machine Learning, Deep Learning, Big Data" for analyst roles; her projects are SQL, pandas and Power BI analyses. What should she do?', [
        ['Keep them, since analyst JDs often mention them as nice to have', false],
        ['Replace them with the statistics and BI skills her projects show', true],
        ['Move them to a separate "Familiar with" line lower on the page', false],
        ['Keep them and add one Kaggle notebook to support each one of them', false],
      ], 'Panels question every listed skill, and these have no work behind them. Listing what her projects prove — A/B testing, DAX, window functions — is both honest and better matched to analyst roles.'),
      ck('PLACEMENT_READINESS', 'An analytics consultancy\'s JD stresses "structured problem solving and client communication". Which resume change fits it best?', [
        ['Lead each project with the business question and the recommendation', true],
        ['Add a long list of every Python library used across the projects', false],
        ['Put the CGPA and school marks at the very top in a larger font', false],
        ['Add a photo and a career objective about loving to solve problems', false],
      ], 'Consultancies hire for framing and communication, so bullets that open with the question and end with a recommendation speak to that. Library lists and objectives do not.'),
      ck('PLACEMENT_READINESS', 'A product-analyst JD asks for "SQL, experimentation, product metrics". Sumanth\'s best project bullet today is about an Excel MIS report. What should change in this copy?', [
        ['Move the SMS experiment and metric decomposition bullets to the top', true],
        ['Add "experimentation" to the skills line without changing projects', false],
        ['Remove the Excel project because product roles never use Excel', false],
        ['Write a paragraph explaining his strong interest in product work', false],
      ], 'The copy should lead with the true work that answers the JD: the randomised test and the decomposition. Keywords without evidence, or deleting real work, weaken it.'),
      ck('PORTFOLIO_EVIDENCE', 'Which portfolio item most directly backs the resume line "Built a Power BI report with city-level RLS"?', [
        ['A PDF export of every page plus a short recording showing "View as"', true],
        ['A Microsoft certificate of course completion for Power BI basics', false],
        ['A README sentence stating that RLS was implemented and tested', false],
        ['A screenshot of the Power BI Desktop start screen with the file name', false],
      ], 'Evidence shows the thing working: the pages, and the report filtered to one city when viewed as that role. A certificate or a sentence says nothing about this report.'),
      ck('PORTFOLIO_EVIDENCE', 'Deepa wants to share her capstone notebooks. Which state helps a reviewer most?', [
        ['Outputs kept, run top to bottom, with a summary cell at the very top', true],
        ['Outputs cleared to keep the files small and the repository tidy', false],
        ['One long notebook holding every single experiment she tried along the way', false],
        ['Notebooks exported as images so that nobody can copy the code', false],
      ], 'Reviewers read rather than run. Saved outputs, a clean top-to-bottom order and the answer up front let them check each claim; cleared outputs and images hide the evidence.'),
      ck('TECHNICAL_EXPLANATION', 'The panel asks Ravi whether the SMS test split of 3,007 control and 2,993 SMS members is a problem. Best answer?', [
        ['Yes, the groups should be exactly equal, so the test is invalid', false],
        ['No; a sample-ratio check gives p = 0.86, consistent with 50/50', true],
        ['No, because any split within 1,000 members is close enough', false],
        ['Yes, the 14-member gap fully explains the visit-rate difference', false],
      ], 'Random assignment rarely gives exactly equal groups. A chi-square sample-ratio check shows a 3,007/2,993 split is entirely ordinary; a rule of thumb like "within 1,000" is not a test.'),
      ck('TECHNICAL_EXPLANATION', 'A panellist asks why Shruti used a two-proportion z-test for the SMS visit rate but Welch\'s t-test for bills per member. Best answer?', [
        ['Visiting is yes/no, a proportion; bills per member is a count, a mean', true],
        ['The z-test is for small samples, and the t-test is for the large ones', false],
        ['She tried both on each metric and reported whichever gave lower p', false],
        ['Welch\'s test is required whenever the data come from SQL queries', false],
      ], 'The metric type picks the test: a binary outcome compares proportions; a skewed count compares means, where Welch\'s t-test is reliable at around 3,000 per arm. Choosing by lowest p-value is p-hacking.'),
      ck('TECHNICAL_EXPLANATION', 'Asked "Is the Chennai fall caused by the new competitor?", which answer is the most defensible?', [
        ['Yes, because the fall started in the month the competitor opened', false],
        ['No, because the reviews do not mention any competitor by name', false],
        ['It fits the timing; the data cannot prove the cause, so I would ask', true],
        ['Yes, because a fall of 10% is too large to come from anything else', false],
      ], 'The decomposition and timing are consistent with a competitor, but bill data cannot show why customers left. Saying so, and naming how to find out, is what panels credit.'),
      ck('INTERVIEW_PERFORMANCE', 'In the case round, the interviewer challenges Lokesh\'s assumption that 40% of households order food online. What should he do?', [
        ['Defend 40% strongly so that he does not appear unsure of himself', false],
        ['Recompute that line at the suggested value and keep the structure', true],
        ['Abandon the estimate and start over with the supply-side approach', false],
        ['Ask the interviewer to supply the real figure before continuing', false],
      ], 'A challenge tests whether the structure survives a changed input. Updating one line and stating the new range shows both robustness and coachability.'),
      ck('INTERVIEW_PERFORMANCE', 'Midway through the technical round, Fathima cannot recall the DAX for a year-to-date total. What is the best move?', [
        ['Say she cannot recall it exactly, then explain the logic she would use', true],
        ['Invent a function name confidently so the interviewer does not notice it', false],
        ['Say DAX is not important for analysts and move to SQL instead', false],
        ['Stay silent until the interviewer gives up and asks the next question', false],
      ], 'Honesty plus reasoning (accumulate from the start of the year to the date in context — TOTALYTD or CALCULATE with DATESYTD) earns credit; a bluff is easy to expose and silence earns nothing.'),
    ],
  },
];
