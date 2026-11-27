/**
 * Career-track content: Performance Testing (QA_PERFORMANCE), QA / SDET, batch QA3.
 *
 * Performance testing as a QA engineer or SDET does it at work: the question before the tool (load, stress, spike,
 * soak and capacity tests, workload models from real traffic), reading throughput, percentiles, errors and saturation
 * without being fooled by averages or coordinated omission, writing load tests in Locust and k6, JMeter for teams that
 * use it, and finding and reporting the bottleneck. It builds on this track's "API Testing" topic, the years' "Reading
 * Why a Query Is Slow", and, for students who took the Cloud track, "SLIs, SLOs and Error Budgets" and "Reliability
 * Patterns and Capacity Planning", which teach percentiles, SLOs and capacity planning from the operator's side; they
 * are referred to by title, not repeated.
 *
 * One demo app runs through the topic: BusYatra, a fictional Hyderabad bus-booking API (Flask on waitress) with a
 * deliberate bottleneck: every seat lookup and booking borrows one of POOL_SIZE stand-in database connections (2 by
 * default) and holds it for 40 ms or 120 ms; search does not touch the database. Every Locust number quoted is real
 * output of Locust 2.47 run headless (30 s per step, local only, small loads) against that app on one Windows laptop
 * with Python 3.13, Flask 3.1 and waitress; server-side numbers come from the app's own pool counters and psutil. The
 * coordinated-omission figures come from a small simulation, and the JTL analysis was run on a synthetic results file.
 * Not run: k6 and JMeter are not installed, so the k6 script was written from the k6 documentation and only syntax-
 * checked with Node, and the JMeter plan was written from the JMeter documentation and only parsed as XML.
 *
 * Skill: PERFORMANCE_TESTING throughout.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_QA_PERFORMANCE_BUNDLES: PilotBundle[] = [
  /* ── PERF_BASICS ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_PERFORMANCE_PERF_BASICS',
    notes: `BusYatra is a Hyderabad start-up that sells intercity bus seats: Hyderabad to Bengaluru, Chennai to Madurai, Pune
to Goa. Every January the evening before Sankranti is its busiest hour of the year, and every January the product
manager asks the QA team the same thing: "Will we survive it?" A tester who answers by opening a load tool and
pointing 1,000 users at the home page has answered nothing. Performance testing starts with a question that has
numbers in it; the tool comes last.

You already test that BusYatra's API gives the right answers ("API Testing" in this track). Performance testing asks
whether it gives them fast enough, for enough people at once, for long enough, and what happens when it cannot.

## The API under test

    GET  /search?from=&to=&date=   -> trips on a route (served from memory, about 5 ms)
    GET  /trips/{id}/seats         -> free seats (one database query, about 40 ms)
    POST /bookings                 -> book a seat (one database query, about 120 ms)

## One question per kind of test

Each kind of performance test answers a different question. Name the question first and the kind follows.

- **Load test.** "At the load we expect, do we meet our targets?" Run at the expected peak (say 200 requests per
  second with the real request mix) for long enough to be steady, typically 15 to 60 minutes, and compare
  percentiles and error rate against agreed limits.
- **Stress test.** "Where does it break, and how?" Increase the load in steps past the expected peak until a limit is
  crossed. The interesting result is not only the number but the failure mode: clean 503s with a retry hint, slow
  answers for everyone, timeouts, a crash, or (worst) wrong data such as a seat sold twice. Then drop the load and
  check that it recovers by itself.
- **Spike test.** "What happens when the load jumps in seconds?" Tatkal-style openings, a sale that starts at 00:00, a
  push notification sent to two lakh phones. Autoscaling that takes three minutes is no help for a spike that lasts
  ninety seconds.
- **Soak (endurance) test.** "Does it stay healthy for hours?" Normal load for 4 to 12 hours finds memory leaks,
  connections that are never returned, log files that fill a disk, and caches that grow without limit.
- **Capacity test.** "How much can one instance take while still meeting the target?" The answer is a number that
  the operations team plans with ("one instance gives 120 requests per second at p95 under 800 ms").
- **Baseline / regression test.** "Is this build slower than the last one?" The same small test on every release,
  compared with the previous result; it catches the N+1 query a developer added on Tuesday.

## Writing the question with numbers

A useful performance requirement names the load, the mix, the limits and the duration:

    At 200 requests per second with the Sankranti mix (60% search, 30% seat lookups, 10% bookings),
    p95 latency stays under 800 ms, p99 under 1,500 ms, and errors stay under 1%, for 30 minutes.

"The site should be fast" cannot fail, so it cannot be tested. If nobody has numbers, the first job is to get them:
from product (the business goal), from production monitoring (what real users do today) and from an SLO if the team
has one (see "SLIs, SLOs and Error Budgets" in the Cloud track for how SLOs are chosen).

## A workload model from real traffic

A load test is only as honest as its workload model. Build it from production access logs or analytics, not from
guesses:

1. **Peak rate.** Find the busiest hour last season and the busiest minute inside it. Traffic is spiky; the peak
   minute is often 1.5 to 3 times the hour's average.
2. **Request mix.** Count requests per endpoint in that hour. If 60% of calls are searches, the test sends 60%
   searches; a test that only books seats tests a different system.
3. **Think time.** Real users pause between actions. Without pauses, 100 virtual users behave like several thousand
   real ones and the result means nothing.
4. **Session shape.** How many requests a session makes and how long it lasts.
5. **Data.** Different users, routes and dates. If every virtual user searches Hyderabad to Bengaluru for the same
   date, a cache answers everything and the database is never tested.

Little's law ties these together: **concurrent users N = throughput X x (response time R + think time Z)**. It turns
"2,400 people are on the site" into a request rate, and back.

## The environment matters as much as the script

- **Production-like.** Same instance sizes, same database engine, a realistic volume of data. An empty bookings table
  is always fast.
- **Third parties.** The UPI or payment provider is replaced by a stub or its sandbox, with a realistic delay. Never
  load test a system you do not own or have written permission to test, and never production without the operations
  team agreeing to it.
- **Monitoring on the server side.** CPU, memory, threads, connection pools, database time. A load test without
  server metrics tells you that something is slow, never what.
- **The load generator.** Run it close to the system, not from a laptop on office Wi-Fi, and watch its own CPU: an
  overloaded generator reports its own slowness as the server's.
- **Functionally stable build.** Performance testing a build that fails its functional tests wastes everybody's
  evening.

## Common mistakes

- Testing only the home page, or only one endpoint, at a rate nobody calculated.
- No think time, and therefore an absurd load.
- One user account and one search for everyone, so caches and row locks behave unrealistically.
- Reporting the average and nothing else (the next lesson shows why that hides the users who suffer).
- Running once. Results vary; repeat each important run and report the spread.`,
    workedExample: `**Scenario.** The product manager asks: "Will BusYatra survive Sankranti eve?" Turn that into a test plan.

**Step 1: the traffic.** Last year's busiest hour had 36,000 sessions. A typical session made 6 searches, 3 seat
lookups and 1 booking attempt (10 requests) over about 4 minutes. The business expects 30% growth.

**Step 2: the rates.**

    sessions per second   = 36,000 / 3,600           = 10 (last year)
    requests per second   = 10 x 10                  = 100 (hour average)
    peak minute (x 1.5)   = 150
    with 30% growth       = 195, round to 200 req/s
    mix                   = 60% search, 30% seats, 10% bookings

**Step 3: concurrent users.** Each session lasts about 240 seconds, so by Little's law the site holds about
10 x 240 = 2,400 sessions at once in last year's peak hour, about 3,100 with growth. In the test, each virtual user
makes about one request per second, so 200 virtual users produce the 200 req/s target; the pacing, not the user
count, is what has to match reality.

**Step 4: the targets.** From the product team and the API's SLO: p95 under 800 ms, p99 under 1,500 ms, errors under
1%.

**Step 5: the runs.**

    Test        Load                                   Duration   Question
    Baseline    20 req/s                               10 min     Is the build sane? Numbers to compare later.
    Load        200 req/s, Sankranti mix               30 min     Do we meet the targets at the expected peak?
    Stress      steps of +50 req/s from 100            5 min/step Where and how does it break? Does it recover?
    Spike       50 -> 400 req/s in 30 s, hold 2 min    10 min     Does it survive the 9 pm price-drop push?
    Soak        140 req/s (70% of peak)                4 hours    Leaks, pool exhaustion, disk?

**Step 6: what each run must collect.** Client side: throughput, p50/p95/p99 per endpoint, errors by type. Server
side: CPU, memory, worker threads, database connections in use and waiting, database query time.

**What to say in a review.** "We derived 200 req/s from last year's peak minute plus 30% growth, with the real mix and
think time; the load test checks the targets and the stress test tells us how much headroom we really have."`,
    mcqs: [
      mcq('BusYatra wants to know whether bookings slowly stop working after a full night of normal traffic. Which test answers that?', [
        ['A soak test at normal load for several hours, watching memory and connections', true],
        ['A spike test that jumps from normal load to four times the load in thirty seconds', false],
        ['A stress test that adds load in steps until the error rate passes five per cent', false],
        ['A baseline test of ten minutes, compared with the result from the previous build', false],
      ], 'Slow degradation over hours (leaks, connections never returned, a disk filling) only appears when normal load runs for a long time. A spike test is about sudden jumps, a stress test about the breaking point, and a ten-minute baseline ends long before a slow leak shows.'),
      mcq('A tester runs 100 Locust users against BusYatra with no wait time at all. Production has about 2,000 people on the site at peak. What is wrong with the test?', [
        ['Without think time each user sends far more requests than a real person, so the rate is invented', true],
        ['The test is fine, because 100 users is a much smaller load than the 2,000 people seen at peak', false],
        ['Locust cannot send requests without a wait time, so the test will stop with an error at once', false],
        ['The test should use 2,000 users with no wait time to exactly match the people in production', false],
      ], 'A virtual user with no pause fires the next request the moment the last one returns, so 100 of them can produce more load than thousands of people who read, choose and type. The rate has to come from the workload model; 2,000 users with no pauses would be even further from reality, and Locust runs happily without a wait time.'),
      mcq('Every virtual user in a BusYatra load test searches Hyderabad to Bengaluru for the same date. Why might the result be too optimistic?', [
        ['Caches and the database see one hot route, unlike the spread of real searches', true],
        ['Searching one route is slower than many routes, so the result will be too pessimistic', false],
        ['Load tools cannot repeat the same request, so most of those searches will be dropped', false],
        ['The same date makes every booking fail validation, which removes load from the server', false],
      ], 'One repeated query lets a cache (or the database\'s own buffer) serve almost everything, so the slow paths real traffic takes are never exercised. Repetition makes it faster, not slower, tools repeat requests freely, and a valid date does not cause validation failures.'),
    ],
    checkpoint: [
      mcq('The question is: "How many requests per second can one BusYatra instance take while p95 stays under 800 ms?" Which kind of test is that?', [
        ['A capacity test, which finds the highest load that still meets the target', true],
        ['A soak test, which runs normal load for many hours and watches its resources', false],
        ['A spike test, which jumps the load suddenly and watches whether it copes', false],
      ], 'Capacity testing increases load to find the highest rate that still meets the target, giving a number the operations team plans with. Soak tests look for slow degradation and spike tests for sudden jumps; neither produces a per-instance number at the target.'),
      mcq('BusYatra had 36,000 sessions in its peak hour last year, each making 10 requests. The business expects 30% growth and the peak minute runs at 1.5 times the hour average. What request rate should the load test target?', [
        ['About 195 requests per second, from 100 x 1.5 x 1.3', true],
        ['About 100 requests per second, the hour average from last year', false],
        ['About 36,000 requests per second, one for each session that hour', false],
        ['About 10 requests per second, the number of new sessions per second', false],
      ], '36,000 sessions x 10 requests over 3,600 seconds is 100 req/s on average; the busiest minute is 1.5 times that, and 30% growth makes about 195. The hour average misses the peak, 36,000 per second confuses sessions per hour with requests per second, and 10 per second counts sessions, not requests.'),
      mcq('A stress test on BusYatra finds the limit at 320 requests per second. What else should the stress test report?', [
        ['How it failed at the limit and whether it recovered once the load dropped', true],
        ['Only the limit, because the way the system fails is a question for developers', false],
        ['The average response time at 50 requests per second as the headline number', false],
      ], 'Clean 503s, timeouts for everyone, a crash or double-sold seats are very different risks, and a system that does not recover after the load drops needs a human at 2 am. The failure mode is the tester\'s finding too, and an average at low load says nothing about the limit.'),
    ],
  },

  /* ── METRICS ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_PERFORMANCE_METRICS',
    notes: `A load test prints a table of numbers. Reading it wrongly is the most common way a performance test misleads a team:
the average looks fine, the test passes, and on sale day one customer in twenty waits two seconds for a booking. This
lesson is about reading the numbers. (If you took the Cloud track, "SLIs, SLOs and Error Budgets" covers how teams
choose percentile targets; here we read them as testers.)

## The four things to look at

- **Throughput**: requests (or transactions, or bookings) completed per second. Locust calls it req/s.
- **Latency**: time from sending a request to receiving the full answer. It includes time spent waiting in queues
  (for a worker thread, a database connection, a lock) as well as the work itself.
- **Errors**: the share of requests that failed, split by type. 503 from an overloaded pool, a timeout and a
  connection refused are three different findings.
- **Saturation**: how full each resource is: CPU, worker threads, database connections, queue length. Saturation is
  measured on the server, never by the load tool.

## Percentiles, and what p95 really means

p95 = 800 ms means 95% of requests finished in 800 ms or less and 5% took longer. p50 is the median. p99 is the
slowest 1 in 100. A session is several requests, so the tail is felt more often than its name suggests: with 20
requests in a session, the chance of meeting at least one slower-than-p95 request is 1 - 0.95^20 = 64%, and even
p99 is met by 18% of sessions. A booking flow is judged by its slowest step.

## Why averages lie: a real run

BusYatra was run with one change: 5% of bookings wait 1.5 s for a payment-status check. Locust, 50 users, 30 s:

    Type  Name                 # reqs  # fails |  Avg   Min   Max   Med
    POST  /bookings               120  0(0.00%)|  218   123  1625   123
    GET   /search                 826  0(0.00%)|    9     7    36     9
    GET   /trips/[id]/seats       412  0(0.00%)|   45    42   287    44
          Aggregated             1358  0(0.00%)|   38     7  1625    10

    Response time percentiles (approximated)
    Name                  50%   90%   95%   99%   100%
    POST /bookings        120   130  1600  1600  1600
          Aggregated       10    50   120   130  1600

A requirement written as "average booking under 300 ms" passes: 218 ms. Yet at least 1 booking in 20 took 1.6 s, and a
booking is the moment money moves. Worse, the **Aggregated** p99 is 130 ms, because bookings are only 9% of all
requests and their slow 5% is under 0.5% of the total. Two lessons: report percentiles, and report them **per
endpoint** (or per business transaction), never only across everything.

Also notice the heading "approximated": Locust rounds response times above 100 ms to two significant figures before
computing percentiles, which is why the numbers are 1600 rather than 1625. That is fine for decisions; just do not
compare two runs at the millisecond level.

## Percentiles cannot be averaged

The p95 of the whole test is not the average of the per-minute p95s, nor of three servers' p95s. One server at
p95 = 2 s and two at 200 ms do not make 800 ms. To combine, merge the raw samples or histograms and compute the
percentile again (Prometheus does this with histogram buckets; Locust and JMeter do it from their raw data).

## Throughput and latency together: the knee

BusYatra with its real bottleneck (a pool of two database connections), Locust, 30 s per step:

    users   req/s   avg ms   p50   p95    p99    errors
       25    22.9       33    10    130    140    0
       50    44.6       56    21    200    400    0
       75    67.2       57    11    210    300    0
      100    73.9      277   220    760    850    0
      150    75.9      841   830   1600   1800    0
      200    69.2     1654  1700   2700   3100    0
      300    85.9     2154  2400   3100   3300    0

Up to 75 users, throughput grows with users and latency stays low. From 100 users, throughput stops at about 75 to
85 req/s and only latency grows: the extra users are queueing. That point is the **knee**, and the flat throughput is
the system's capacity for this mix. Note there were **no errors**: this system degrades by getting slow, not by
failing, so a test that checked only errors would pass at 300 users.

**Sanity-check with Little's law.** At 300 users with an average think time of 1.0 s and 85.9 req/s, response time
should be about 300 / 85.9 - 1.0 = 2.5 s. Locust measured an average of 2.15 s; the gap is the ramp-up seconds
included in the run. When the law and the tool disagree badly, suspect the test.

## Coordinated omission, in outline

Most load tools are **closed-loop**: a virtual user sends a request, waits for the answer, then sends the next. If the
server stalls for two seconds, the user simply sends nothing during the stall, so the tool records one slow request
instead of the hundred real users who would have arrived and waited. A small simulation (10 ms service, a 2-second
stall every 20 s, real arrivals at 50 per second, 100 s):

    closed loop (waits for each reply) n= 4506  avg=  12.2  p50= 10.0  p95=   10.0  p99=   10.0  max= 2000.0 ms
    open loop (50 rps schedule)        n= 5000  avg= 211.0  p50= 10.0  p95= 1510.0  p99= 1910.0  max= 2010.0 ms
    requests slower than 500 ms: closed=5  open=757

Same server, same stalls: the closed-loop tester reports p99 = 10 ms and simply never sent 494 requests. The cure is
an **open** model that sends on a schedule and measures from when each request *should* have gone (k6's arrival-rate
executors work this way), or at least: watch the achieved request rate. If it drops when latency rises, your users
are waiting instead of arriving, and the percentiles are flattering you.

## Warm-up and steady state

The first seconds include ramp-up, cold caches and connection set-up. Judge the steady part: run long enough, and
drop the ramp (Locust's --reset-stats resets the numbers once all users have started).`,
    workedExample: `**Scenario.** The stress-test table above lands in the QA channel with the question "So how many users can BusYatra
take?" Read it properly.

**Step 1: find the knee in throughput.** req/s rises 22.9, 44.6, 67.2, then 73.9, 75.9, 69.2, 85.9. Up to 75 users
each extra user adds about 0.9 req/s; after that, extra users add almost nothing. Capacity for this mix is roughly
75 to 85 req/s, whatever the number of users.

**Step 2: check the targets per step.** The targets are p95 under 800 ms and errors under 1%.

    75 users:  p95 210 ms  -> pass
    100 users: p95 760 ms  -> pass, barely; p99 850 ms
    150 users: p95 1600 ms -> fail

So the last step that meets the target is 100 users, at about 74 req/s, and it is already on the edge.

**Step 3: say what the number is.** "Users" is not the answer, because the users in this test pause between 0.5 and
1.5 s; real users pause much longer. The transferable number is the rate: **about 74 req/s at the target**.

**Step 4: compare with the requirement.** Sankranti needs 200 req/s. BusYatra meets about a third of it.

**Step 5: note what is suspicious.** No errors at any load, server CPU never above 38% of one core, and search,
which never touches the database, also slowed down (its p95 rose from 14 ms at 25 users to 1,200 ms at 150 users). Low
CPU with rising latency means the requests are waiting for something, not working. That points at a pool or a lock,
which is exactly what "Finding the Bottleneck" chases.

**What to report.** "At the Sankranti mix BusYatra saturates at about 75 to 85 req/s. It meets p95 < 800 ms up to
about 74 req/s and fails above that, by getting slow rather than returning errors. The target is 200 req/s. Server
CPU stays low, so the limit is a wait, not computation; investigation next."`,
    mcqs: [
      mcq('A BusYatra report says "average booking time 218 ms, requirement under 300 ms: PASS". The same run shows bookings p95 = 1,600 ms. What is the honest reading?', [
        ['About one booking in twenty takes over a second and a half, which the average hid', true],
        ['The p95 must be a measuring error, because it can never be seven times the average', false],
        ['The requirement passed, so the slow bookings only matter if they cause errors', false],
        ['The average is the more trustworthy number because it uses every single request', false],
      ], 'A small group of very slow requests barely moves the mean but sets the tail; here 1 in 20 bookings waited 1.6 s at the moment money moves. A p95 several times the mean is normal for a skewed distribution, the requirement was written on the wrong statistic, and the mean using every request is exactly why it hides the few slow ones.'),
      mcq('Three BusYatra servers report p95 latencies of 2,000 ms, 200 ms and 200 ms for the same five minutes. What is the p95 across all three?', [
        ['It cannot be computed from these three numbers; merge the samples and compute it', true],
        ['800 ms, the average of the three p95 values that the three servers reported', false],
        ['2,000 ms, because the p95 overall is always the highest of the server p95s', false],
        ['200 ms, because two of the three servers agree on that value for the period', false],
      ], 'Percentiles do not average or combine by max or vote: the overall p95 depends on how many requests each server handled and how its distribution looked. Merging raw samples or histogram buckets and computing again is the only correct way.'),
      mcq('In a BusYatra stress test, throughput rises to 74 req/s at 100 users and stays near 75 at 150 and 200 users while p95 climbs from 760 ms to 2,700 ms. What does that pattern show?', [
        ['The system is saturated: added users only wait in a queue', true],
        ['The load tool is broken, because throughput must rise with users', false],
        ['The servers are healthy, because no request returned an error code', false],
        ['The test is too short, because throughput always keeps rising later', false],
      ], 'Flat throughput with rising latency is the signature of saturation: something can only do so much work per second and the rest queue. Throughput does not have to rise for ever, errors are not required for a failure (latency is the failure here), and length would not change a ceiling.'),
    ],
    checkpoint: [
      mcq('A BusYatra session makes 20 requests. Each request independently has a 5% chance of being slower than p95. Roughly what share of sessions see at least one such slow request?', [
        ['About 64%, from 1 - 0.95 to the power 20', true],
        ['About 5%, the same as for a single request', false],
        ['About 100%, since 20 x 5% adds up to 100%', false],
        ['About 25%, since the effect is a quarter of 20', false],
      ], 'The chance a session avoids the tail is 0.95^20, about 0.36, so about 64% of sessions meet at least one slow request. Per-request probability is not per-session, and adding 20 x 5% treats the events as if they could not overlap.'),
      mcq('A closed-loop load test reports p99 = 10 ms for a service that stalls for 2 seconds every 20 seconds. The achieved request rate also dropped during each stall. What is the most likely explanation?', [
        ['The virtual users waited during the stalls instead of sending, so the stalls were barely sampled', true],
        ['The stalls are too short to matter, because two seconds in twenty is only a tenth of the total time', false],
        ['The tool rounds latencies to two significant figures, which removes stalls of two seconds', false],
      ], 'This is coordinated omission: a closed-loop user cannot send while it waits, so the requests real users would have made during the stall are never sent or measured. In the simulation the closed-loop p99 was 10 ms while an open-loop schedule gave 1,910 ms. Rounding keeps two seconds as 2000, and a tenth of the time is a lot of users.'),
      mcq('Locust prints the BusYatra aggregated p99 as 130 ms, but the /bookings row shows p95 = 1,600 ms. Why does the aggregated figure hide the slow bookings?', [
        ['Bookings are a small share of all requests, so their tail is diluted by fast searches', true],
        ['Locust removes the slowest one per cent of requests before computing the aggregate', false],
        ['The aggregated row reports the median, not the p99, for every endpoint together', false],
      ], 'Bookings were 9% of the requests, so their slowest 5% was under 0.5% of everything and fell beyond the aggregated p99. Locust keeps every request, and the aggregated row does report real percentiles; that is why per-endpoint rows must be read.'),
    ],
  },

  /* ── LOCUST_K6 ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_PERFORMANCE_LOCUST_K6',
    notes: `Two tools cover most new performance work in Indian product teams: **Locust**, where user behaviour is plain Python,
and **k6**, where it is JavaScript and the runner is a fast Go binary. Both are code, so tests live in Git, are
reviewed like any other code and run in CI. This lesson writes the BusYatra workload in both.

## Locust: a user is a class

    import random
    from locust import HttpUser, task, between, events

    ROUTES = [("Hyderabad", "Bengaluru"), ("Chennai", "Madurai"), ("Pune", "Goa"), ("Delhi", "Jaipur")]

    class Traveller(HttpUser):
        wait_time = between(0.5, 1.5)            # think time after every task

        @task(6)
        def search(self):
            frm, to = random.choice(ROUTES)
            self.client.get("/search", params={"from": frm, "to": to, "date": "2026-11-14"}, name="/search")

        @task(3)
        def seats(self):
            self.client.get(f"/trips/{random.randint(1, 5)}/seats", name="/trips/[id]/seats")

        @task(1)
        def book(self):
            with self.client.post("/bookings", json={"trip": 3, "seat": "L4", "upi": "asha@okbank"},
                                  name="/bookings", catch_response=True) as r:
                if r.status_code != 201:
                    r.failure(f"status {r.status_code}")
                elif r.json().get("status") != "CONFIRMED":
                    r.failure("not confirmed")

What each piece does:

- **HttpUser** gives each virtual user its own HTTP session (self.client, a requests-style client that records
  timings), so cookies and keep-alive connections behave like one browser each.
- **@task(weight)** sets the mix: 6:3:1 is the 60/30/10 split from the workload model.
- **wait_time** is think time. between(a, b) is random; constant_throughput(1) paces each user to one task per
  second at most, which keeps the rate steady when responses slow down.
- **name=** groups URLs. Without it, /trips/1/seats and /trips/2/seats are separate rows (see the debugging unit).
- **catch_response=True** lets you decide what a failure is. A 200 with the wrong body is a failure; Locust only
  marks HTTP errors by itself.
- **on_start(self)** (not used here) runs once per user: log in and keep the token, as in "API Testing".

## Running it headless

    locust -f locustfile.py --headless -u 150 -r 31 -t 30s --host http://127.0.0.1:5077 --csv runs/u150 --only-summary

-u is the number of users, -r how many start per second, -t the duration. --csv writes u150_stats.csv,
u150_stats_history.csv, u150_failures.csv and u150_exceptions.csv; --html writes a report page. A real run against
BusYatra (pool of two database connections) at 150 users printed:

    Type     Name                 # reqs      # fails |    Avg     Min     Max    Med |   req/s
    POST     /bookings               222     0(0.00%) |   1175     127    2029   1200 |    7.64
    GET      /search                1324     0(0.00%) |    653      10    1405    670 |   45.54
    GET      /trips/[id]/seats       659     0(0.00%) |   1105      59    2465   1100 |   22.67
             Aggregated             2205     0(0.00%) |    841      10    2465    830 |   75.85
    THRESHOLD FAILED: p95 1600 ms > 800 ms
    ... Shutting down (exit code 1)

## Thresholds: making a load test pass or fail

Locust has no threshold syntax; you add a listener that checks the stats when the run ends and sets the exit code:

    @events.quitting.add_listener
    def thresholds(environment, **kw):
        s = environment.stats.total
        p95 = s.get_response_time_percentile(0.95)
        if s.fail_ratio > 0.01:
            print(f"THRESHOLD FAILED: error rate {s.fail_ratio:.2%} > 1%")
            environment.process_exit_code = 1
        elif p95 > 800:
            print(f"THRESHOLD FAILED: p95 {p95} ms > 800 ms")
            environment.process_exit_code = 1
        else:
            environment.process_exit_code = 0

A CI job then fails on a non-zero exit code. Check per endpoint too (environment.stats.get("/bookings", "POST")).

## Ramping: steps instead of one jump

-u/-r ramps once. For a stress test, a **LoadTestShape** class holds each step for a fixed time:

    from locust import LoadTestShape

    class StepLoad(LoadTestShape):
        steps = [(300, 50), (600, 100), (900, 150)]   # (end of step in seconds, users)

        def tick(self):
            t = self.get_run_time()
            for end, users in self.steps:
                if t < end:
                    return users, 20                # (users, spawn rate per second)
            return None                             # stop the test

One Locust process uses one CPU core. For more load run one --master and several --worker processes, on one
machine or many (--processes forks them for you, but not on Windows), and keep the generator's CPU under about 90%:
Locust warns when it is higher.

## k6: the same workload in JavaScript

k6 is not installed on the machine these lessons were built on, so this script was written from the k6 documentation
and only syntax-checked; run it with k6 run busyatra.js -e BASE_URL=http://127.0.0.1:5077.

    import http from 'k6/http';
    import { check } from 'k6';

    export const options = {
      scenarios: {
        sale_ramp: {
          executor: 'ramping-arrival-rate',      // open model: iterations start on a schedule
          startRate: 10, timeUnit: '1s',
          preAllocatedVUs: 50, maxVUs: 300,
          stages: [{ target: 40, duration: '1m' }, { target: 80, duration: '2m' }, { target: 120, duration: '2m' }],
        },
      },
      thresholds: {
        http_req_failed: ['rate<0.01'],
        'http_req_duration{name:seats}': ['p(95)<300'],
        http_req_duration: ['p(95)<800', 'p(99)<1500'],
      },
    };

    const BASE = __ENV.BASE_URL || 'http://127.0.0.1:5077';

    export default function () {
      const s = http.get(\`\${BASE}/search?from=Hyderabad&to=Bengaluru&date=2026-11-14\`, { tags: { name: 'search' } });
      check(s, { 'search 200': (r) => r.status === 200 });
      const seats = http.get(\`\${BASE}/trips/3/seats\`, { tags: { name: 'seats' } });
      check(seats, { 'seats 200': (r) => r.status === 200 });
    }

- **Executors.** constant-vus and ramping-vus are closed models like Locust users. constant-arrival-rate and
  ramping-arrival-rate start iterations on a schedule whatever the server does, which avoids the coordinated
  omission of the previous lesson; if the server slows down, k6 adds VUs up to maxVUs to keep the rate. With an
  arrival-rate executor, do not add sleep() at the end of the iteration; the schedule already paces it.
- **Checks versus thresholds.** A check records pass/fail per response but does not fail the run. A threshold does:
  when one is crossed, k6 ends with a non-zero exit code (99 in its documentation), which fails the CI job.
- **Tags.** tags: { name: 'seats' } groups URLs and lets a threshold target one endpoint.

## Which one?

Locust when the team writes Python and wants plain code (and a live web UI when not headless). k6 for an open model
out of the box, low generator cost, and teams already on Grafana. JMeter (next lesson) where an organisation already
has JMeter suites. The method is the same in all three.`,
    workedExample: `**Scenario.** Add a performance gate to BusYatra's nightly pipeline: a short Locust run that fails the build if
search, seats or bookings get slower.

**Step 1: choose a small, stable load.** Not the stress test; a baseline. 50 users for 2 minutes against the nightly
environment, with the Sankranti mix.

**Step 2: per-endpoint thresholds from history.** Ten previous nightly runs gave /trips/[id]/seats p95 between 180 and
240 ms. Set the gate above the noise: 300 ms. Bookings: 500 ms. Error rate: under 1%.

**Step 3: the listener.**

    LIMITS = {("GET", "/trips/[id]/seats"): 300, ("POST", "/bookings"): 500}

    @events.quitting.add_listener
    def gate(environment, **kw):
        bad = []
        for (method, name), limit in LIMITS.items():
            p95 = environment.stats.get(name, method).get_response_time_percentile(0.95)
            if p95 > limit:
                bad.append(f"{method} {name} p95 {p95} ms > {limit} ms")
        if environment.stats.total.fail_ratio > 0.01:
            bad.append(f"errors {environment.stats.total.fail_ratio:.2%} > 1%")
        print("\\n".join(bad) or "performance gate passed")
        environment.process_exit_code = 1 if bad else 0

**Step 4: the command in CI.**

    locust -f locustfile.py --headless -u 50 -r 10 -t 2m --host $NIGHTLY_URL --csv perf/nightly --html perf/nightly.html

Keep the CSVs and the HTML as build artefacts, so a failure comes with its evidence.

**Step 5: what a failure looks like.** The real 150-user run above ended with "THRESHOLD FAILED: p95 1600 ms > 800 ms"
and "Shutting down (exit code 1)"; in CI that red build is the point of the gate.

**Step 6: keep it honest.** The nightly environment must be the same size every night, and nothing else may run a
load test on it at the same time; otherwise the gate measures the neighbours. When the gate fails, rerun once before
raising a defect, and attach both runs.`,
    mcqs: [
      mcq('A BusYatra Locust task posts a booking and the server answers 200 with {"status": "PAYMENT_PENDING"}. The run reports 0 failures. What should the task do?', [
        ['Use catch_response=True and call failure() when the status is not CONFIRMED', true],
        ['Nothing, because Locust already marks every non-CONFIRMED response as failed', false],
        ['Raise the wait time, so the booking has time to be confirmed before the check', false],
        ['Add name="/bookings" so the failed bookings appear in their own stats row', false],
      ], 'Locust only counts HTTP errors and exceptions as failures; a business failure inside a 200 must be marked by the test with catch_response and failure(). Locust does not read the body by itself, think time does not change what the server answered, and name= only groups rows.'),
      mcq('A k6 BusYatra script has check(res, { "status 200": r => r.status === 200 }) and 12% of responses are 503, yet the k6 run exits successfully. Why?', [
        ['Checks only record results; a threshold is needed to fail the run', true],
        ['k6 ignores 503 because the server asked the client to retry later', false],
        ['The check is written wrongly: status must be compared with "200"', false],
      ], 'In k6 a failed check is counted (the checks metric) but does not change the exit code; a threshold such as http_req_failed: ["rate<0.01"] or checks: ["rate>0.99"] does. k6 counts 503 as a failed request, and r.status is a number, so the comparison is right.'),
      mcq('BusYatra\'s team wants the load test to keep sending 120 booking flows per second even when the server slows down, so slow periods are measured fully. Which k6 executor fits?', [
        ['ramping-arrival-rate or constant-arrival-rate, which start iterations on a schedule', true],
        ['constant-vus with 120 virtual users and a sleep(1) at the end of each iteration', false],
        ['ramping-vus up to 120 users, which waits for each reply before sending the next', false],
        ['per-vu-iterations with 120 iterations, so each user runs the flow a fixed number of times', false],
      ], 'Arrival-rate executors are an open model: iterations start at the configured rate whatever the server does, adding VUs as needed. The VU-based executors are closed models, so when responses slow, fewer iterations start, which is the coordinated-omission problem.'),
    ],
    checkpoint: [
      mcq('In a BusYatra locustfile, search has @task(6), seats @task(3) and booking @task(1). What does that produce?', [
        ['Users pick search six times as often as booking, roughly a 60/30/10 mix', true],
        ['Each user runs search six times in a row, then seats three times, then one booking', false],
        ['Six users search, three users look up seats and one user books, for ten users in all', false],
      ], 'Task weights are the relative chance that a user picks that task next, giving the request mix of the workload model. They are not sequences and not separate groups of users; a SequentialTaskSet or separate User classes would do those.'),
      mcq('A Locust quitting listener prints "THRESHOLD FAILED" but the BusYatra CI job still passes. What is the missing line?', [
        ['environment.process_exit_code = 1 when a threshold fails', true],
        ['environment.runner.quit() as soon as any threshold has failed', false],
        ['raise an AssertionError inside the quitting listener', false],
      ], 'Locust decides its exit code from environment.process_exit_code if the test sets it; printing a message changes nothing for CI. The runner is already quitting at that point, and an exception inside an event handler is logged rather than turned into a reliable failing exit code.'),
      mcq('A tester needs 3,000 BusYatra users and one Locust process reaches 95% CPU on its core at 800 users. What should change?', [
        ['Run a master with several workers so the load is spread over cores or machines', true],
        ['Lower the think time so that 800 users send the load that 3,000 users would', false],
        ['Keep one process and accept the numbers, since the server is what is measured', false],
      ], 'One Locust process uses one core; above about 90% CPU its own delays are reported as server latency. Distributing over workers fixes that. Cutting think time changes the workload model, and accepting the numbers measures the generator rather than BusYatra.'),
    ],
  },

  /* ── JMETER ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_PERFORMANCE_JMETER',
    notes: `JMeter is the oldest of the three tools and still the one most often named in Indian job descriptions, especially
at banks, insurers and IT services companies with years of existing test plans. A JMeter test plan is an XML file
(.jmx) built in a GUI and run from the command line. You do not need to love it; you need to read, change and run a
plan someone else wrote. JMeter is not installed on the machine these lessons were built on: the plan below was
written from the JMeter documentation and checked only by parsing it as XML.

## The parts of a test plan

    Test Plan
      HTTP Request Defaults        (host, port, timeouts, once for every sampler)
      CSV Data Set Config          (routes.csv: from,to,trip)
      Thread Group "Travellers"    (users, ramp-up, duration)
        GET /search                (HTTP Request sampler)
          Response Assertion       (code is 200)
        GET /trips/\${trip}/seats
        POST /bookings
          HTTP Header Manager      (Content-Type: application/json)
          JSON Assertion           ($.status is CONFIRMED)
        Uniform Random Timer       (500 ms + up to 1,000 ms)

- **Thread Group**: the users. Number of threads, ramp-up period and duration (or loop count). One thread is one
  virtual user running the samplers top to bottom, again and again: a closed model, like Locust.
- **Samplers** send requests: HTTP Request, JDBC Request and others. Each sample is one row in the results.
- **Config elements** set shared things: HTTP Request Defaults, CSV Data Set Config (one line per iteration into
  variables such as \${from}), HTTP Header Manager, HTTP Cookie Manager.
- **Timers** add think time: Constant, Uniform Random, Gaussian. The Constant Throughput Timer paces to a target
  rate per minute.
- **Assertions** decide pass or fail: Response Assertion (code, text), JSON Assertion (a JSONPath value), Duration
  Assertion (a time limit per sample).
- **Pre- and post-processors** change requests and read responses. A **JSON Extractor** after login stores the token
  in \${token} for later requests; this is called **correlation**, and forgetting it is why a recorded script fails
  the second time it runs.
- **Logic controllers** shape the flow: Transaction Controller (groups search + seats + book into one timed
  "booking journey"), If Controller, Loop Controller.
- **Listeners** show results. Use them while building in the GUI; disable them for real runs, because the GUI
  listeners eat memory and CPU on the generator.

## Scope: where an element sits decides what it affects

Elements apply to the samplers in their scope. An assertion under a sampler checks only that sampler; one at thread
group level checks every sampler. **Timers are applied before every sampler in their scope**, so the Uniform Random
Timer above adds a pause before each of the three requests, not once per iteration. If the workload model says "one
pause per journey", put the timer under one sampler or use a Flow Control Action sampler.

## The plan as XML (an excerpt)

    <ThreadGroup guiclass="ThreadGroupGui" testclass="ThreadGroup" testname="Travellers">
      <stringProp name="ThreadGroup.num_threads">\${__P(users,50)}</stringProp>
      <stringProp name="ThreadGroup.ramp_time">\${__P(rampup,60)}</stringProp>
      <boolProp name="ThreadGroup.scheduler">true</boolProp>
      <stringProp name="ThreadGroup.duration">\${__P(duration,300)}</stringProp>
      ...
    </ThreadGroup>
    <hashTree>
      <HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="GET /search">
        <stringProp name="HTTPSampler.path">/search?from=\${from}&amp;to=\${to}&amp;date=2026-11-14</stringProp>
        <stringProp name="HTTPSampler.method">GET</stringProp>
      </HTTPSamplerProxy>
      ...

Every element is followed by a <hashTree> holding its children. \${__P(users,50)} reads a property with a default,
so the same plan runs at any load from the command line. Note &amp; in the path: it is XML.

## Running it: never from the GUI

    jmeter -n -t busyatra.jmx -l results/run1.jtl -e -o results/run1-report -Jusers=150 -Jrampup=60 -Jduration=600

-n is non-GUI mode, -t the plan, -l the results file (JTL, one CSV row per sample), -e -o build the HTML dashboard
(percentiles over time, throughput, errors, APDEX) into an empty folder, and -J sets properties. The GUI is for
building and debugging with a handful of threads; a load run from the GUI measures the GUI. For more load,
distributed mode (-R host1,host2) runs the plan on several JMeter servers.

## Reading the JTL yourself

The JTL is a CSV with timeStamp, elapsed, label, responseCode, success, Latency, Connect and more, so a few lines of
pandas give per-label percentiles for the steady part. Run on a synthetic JTL with the same columns:

    df = pd.read_csv("results.jtl")
    steady = df[df.timeStamp >= df.timeStamp.min() + 60_000]          # drop the first minute
    out = steady.groupby("label").elapsed.describe(percentiles=[.5, .95, .99])

                           count   mean    50%    95%    99%     max  errors_%   rps
    GET /search            920.0   10.0   10.0   12.0   12.0    12.0       0.0  15.0
    GET /trips/[id]/seats  448.0   51.0   51.0   61.0   62.0    62.0       0.0   8.0
    POST /bookings         132.0  155.0  140.0  171.0  772.0  1048.0       2.0   2.0

elapsed is the full time to the last byte; Latency is the time to the first byte; Connect is the connection set-up.
A large Connect with a small server time points at connection limits or the network, not the application.

## Recording and its traps

The HTTP(S) Test Script Recorder captures a browser session into samplers. The recording is a draft: remove static
files and third-party calls (analytics, fonts), parametrise the data, correlate tokens and session ids, add
assertions, and add think time. A recorded script replayed as it is tests the recording, not the system.`,
    workedExample: `**Scenario.** BusYatra's parent company has a JMeter suite for its train app, and the QA lead asks you to add the
bus booking flow to it and run it at 150 users.

**Step 1: data.** routes.csv with a header line:

    from,to,trip
    Hyderabad,Bengaluru,1
    Chennai,Madurai,2
    Pune,Goa,3

CSV Data Set Config: variable names from,to,trip; ignore first line; recycle on end; sharing mode all threads. Each
thread takes the next line on each iteration, so searches are spread over routes.

**Step 2: the journey.** A Transaction Controller "Book a seat" containing GET /search, GET /trips/\${trip}/seats and
POST /bookings, so the dashboard shows the journey time as well as each request.

**Step 3: assertions that mean something.** Response Assertion on the code (200 for search and seats, 201 for the
booking) and a JSON Assertion that $.status is CONFIRMED. A Duration Assertion of 1,500 ms on the booking marks slow
bookings as failures, so the error rate reflects the user's experience.

**Step 4: think time where the model says.** One Uniform Random Timer (500 ms + 0 to 1,000 ms) placed under GET
/search, so the pause happens once per journey, not three times.

**Step 5: parametrise and run headless.**

    jmeter -n -t busyatra.jmx -l results/u150.jtl -e -o results/u150-report \\
        -Jusers=150 -Jrampup=60 -Jduration=600 -Jhost=perf.busyatra.internal

**Step 6: read the dashboard, then the JTL.** Check the Statistics table per label (p95, p99, error %), the
Response Times Over Time graph for the moment it bent, and Active Threads Over Time against it. Drop the ramp-up
minute when quoting numbers.

**Step 7: hand it back.** Commit the .jmx and the CSV, not the results; put the run command in the README; keep the
JTL and dashboard as build artefacts.

**What to say in a review.** "One timer per journey, correlated data, code and body assertions, a duration assertion
for the user's limit, non-GUI with properties, and numbers from the steady part only."`,
    mcqs: [
      mcq('A recorded JMeter plan for BusYatra passes once and then every POST /bookings fails with 401. The recording contains a hard-coded Authorization header. What is missing?', [
        ['Correlation: extract the token from the login response and use \${token}', true],
        ['A Constant Timer, because the server rejects bookings that arrive too quickly', false],
        ['A larger ramp-up, because 401 means the server is overloaded during start', false],
        ['A Response Assertion on the login, so JMeter retries the booking on a 401', false],
      ], 'The recorded token expired; each run must log in and carry the new token forward with a JSON Extractor (correlation). Think time and ramp-up do not cause 401, which means "not authenticated", and an assertion only marks results; it does not retry or fix the token.'),
      mcq('In a BusYatra JMeter plan, one Uniform Random Timer of 500 to 1,500 ms sits at thread-group level next to three HTTP samplers. How much think time does each iteration get?', [
        ['About three pauses, one before each sampler in the timer\'s scope', true],
        ['One pause per iteration, added after the last sampler in the group', false],
        ['No pause, because timers only work when placed under a sampler', false],
      ], 'JMeter applies a timer before every sampler in its scope, so three samplers get three pauses, tripling the think time the model intended. Timers do work at group level; they are just not once per iteration.'),
      mcq('Why should a 150-user BusYatra JMeter run use "jmeter -n" rather than the GUI with a View Results Tree listener open?', [
        ['The GUI and its listeners consume the generator\'s memory and CPU and distort the results', true],
        ['The GUI cannot run more than ten threads, so 150 users would silently become ten', false],
        ['Results from the GUI cannot be saved to a file, so nothing could be analysed after the run', false],
      ], 'Non-GUI mode is the documented way to run load: the GUI and heavy listeners like View Results Tree slow the load generator, and that slowness shows up as latency. The GUI has no ten-thread limit and can save results, but it is a building tool.'),
    ],
    checkpoint: [
      mcq('Which JMeter command runs busyatra.jmx without the GUI at 200 users, writes the results file and builds the HTML dashboard?', [
        ['jmeter -n -t busyatra.jmx -l run.jtl -e -o report -Jusers=200', true],
        ['jmeter -t busyatra.jmx -users 200 -report report -results run.jtl', false],
        ['jmeter -g busyatra.jmx -l run.jtl -o report -threads=200 -nogui', false],
      ], '-n is non-GUI, -t the plan, -l the JTL, -e -o the dashboard into a folder, and -Jusers=200 sets the property the plan reads with __P(users,50). The other flags (-users, -report, -threads, -nogui) are not JMeter options, and -g builds a report from an existing JTL.'),
      mcq('A BusYatra JTL shows bookings with a large Connect time and a small difference between Latency and elapsed. Where should the investigation start?', [
        ['Connection set-up: a connection limit, a full accept queue or the network', true],
        ['The booking handler\'s database query, since elapsed includes the query', false],
        ['The JSON Assertion, since assertions add their run time to every sample', false],
      ], 'Connect measures time to open the connection; when that dominates, the request is waiting before the application sees it, as with a server connection limit. Slow handler code would show as a long Latency, and assertion time is not added to the sample\'s elapsed time.'),
      mcq('A JMeter plan uses a CSV Data Set Config with routes.csv. What does that give a BusYatra load test that a fixed URL does not?', [
        ['Different routes and trips per iteration, so caches see realistic variety', true],
        ['A faster run, because JMeter reads the CSV instead of building the request', false],
        ['Automatic correlation of tokens between login and the booking requests', false],
      ], 'The CSV feeds variables such as \${from} and \${trip} per iteration, spreading searches and bookings like real users. Reading a file does not speed anything up, and correlation needs an extractor on the response, not a CSV.'),
    ],
  },

  /* ── FIND_BOTTLENECK ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_PERFORMANCE_FIND_BOTTLENECK',
    notes: `"It gets slow at 100 users" is an observation. "It gets slow at 100 users because both database connections are
always busy and 15 worker threads are waiting for one" is a finding a developer can fix. The difference is server
metrics read at the same time as the load test, and the habit of proving the cause by changing it and running again.

## The method

1. **Run in steps** (previous lessons) and find the knee: the load where throughput stops rising and latency starts.
2. **Line up server metrics on the same clock.** For every resource on the request's path, ask the USE questions:
   **U**tilisation (how busy), **S**aturation (how much is queued waiting for it), **E**rrors. Resources: CPU and
   memory of each service, worker threads, the database connection pool, database CPU and locks, external calls,
   the network, and the load generator itself.
3. **The bottleneck is the resource that is full and has a queue.** High CPU with no queue is busy, not blocking.
   Low CPU with rising latency means requests are waiting for something.
4. **Prove it.** Change that one thing, rerun the same steps, and show the knee moved.
5. **Look for the next one.** Fixing a bottleneck moves the limit to the next resource; it rarely makes a system
   unlimited.

## BusYatra: the evidence

BusYatra's app counts its own pool: connections in use, requests waiting for one and how long they waited. A small
script sampled those, and the server process's CPU with psutil (100% = one core), every two seconds while Locust ran
each 30-second step.

    users  req/s   p95 ms | CPU max  in use max   waiting max  pool-wait p95 ms
       25   22.9    130   |    7%        2            2               18
       50   44.6    200   |   12%        2            6               99
       75   67.2    210   |   19%        2           11              134
      100   73.9    760   |   23%        2           15              427
      150   75.9   1600   |   36%        2           15              462
      200   69.2   2700   |   38%        2           15              531

Reading across:

- **CPU** never passes 38% of one core. The server is not working hard; it is waiting.
- **Pool in use** reaches 2 of 2 at every step, and from 75 users both connections are busy in every sample.
- **Waiting** grows to 15 and stops there. Waitress runs 16 worker threads; 15 of them are blocked waiting for a
  connection. Beyond that the queue moves in front of the app, where the app's own counters cannot see it: waitress
  logged "Task queue depth is N" warnings, with N up to 224 at the highest step.
- **Search** never touches the database, yet its p95 rose from 14 ms at 25 users to 1,200 ms at 150 users. It waits
  for a worker thread that is itself waiting for a connection: one slow resource slows unrelated endpoints.

**The arithmetic agrees.** Each request holds a connection for 40 ms (seats) or 120 ms (bookings); with the
60/30/10 mix the average hold is 0.3 x 40 + 0.1 x 120 = 24 ms. Two connections can serve at most 2 / 0.024 = 83
requests per second, and the measured ceiling was about 75 to 85. When the ceiling matches a resource's arithmetic,
you have found it.

## Prove it: change the pool, rerun

Pool size 8, same steps:

    users  req/s   p95 ms  p99 ms  errors
      150  137.4    130     140    0
      300  267.3    180     250    0

Throughput now follows the users and p95 at 300 users is below what 75 users managed before. The pool was the
bottleneck. (Whether eight is safe for the real database is a question for the developers and DBA: every app
instance multiplies it, and the database has its own connection limit.)

## The next bottleneck

The first pool-of-8 run used waitress's default connection limit, and at 300 users it looked like this:

    Aggregated   2762 reqs   24 fails (0.87%) | req/s 94.05 | p99 2000 ms  max 28309 ms
    ConnectionRefusedError(10061, 'No connection could be made because the target machine actively refused it.')
    WARNING:waitress:total open connections reached the connection limit, no longer accepting new connections

Throughput stuck at about 94 req/s no matter how many users, connections refused, and a maximum of 28 seconds (a
client retrying its connection). Waitress accepts at most 100 open connections by default, and each Locust user
keeps one open. Raising the limit gave the 267 req/s above. In production the same pattern appears as a load
balancer's connection limit, a container's file-descriptor limit or a database's max_connections.

## Other usual suspects

- **The database**: a slow query or a missing index (EXPLAIN, as in "Reading Why a Query Is Slow"), row locks when
  everyone books the same seat, an N+1 pattern that turns one page into 50 queries.
- **External calls**: a payment or SMS provider without a timeout ties up threads exactly like the pool did.
- **Memory and garbage collection**: pauses that show as periodic spikes; in a soak test, growth that never falls.
- **Logging and locks** in the code: one synchronised writer every request passes through.
- **The load generator**: if its CPU is high or its network is the limit, the server is fine and the test is not.

## Reporting the result

A performance report is one page that a manager can read and a developer can act on:

1. **Question and verdict** in the first two lines.
2. **What was tested**: build, environment and its size, workload (rate, mix, think time, data), duration.
3. **Results**: the step table with throughput, p50/p95/p99 per endpoint and errors; one graph of throughput and
   p95 against load.
4. **The bottleneck**, with the evidence from server metrics and the arithmetic.
5. **Recommendation** and what it was verified with (the rerun).
6. **Limits of the test**: what was stubbed, what was not tested, how often each run was repeated.`,
    workedExample: `**Scenario.** Write the report for the BusYatra Sankranti stress test.

**Verdict.** BusYatra does not meet the Sankranti target today: it saturates at about 75 to 85 req/s against a need
of 200 req/s. The limit is the database connection pool (2 connections). With 8 connections it served 267 req/s at
p95 180 ms in a rerun. Recommended: raise the pool and repeat the full load test before release.

**What was tested.** Build 2026.11.3 on the perf environment (one app instance, 16 worker threads). Locust 2.47,
60% search / 30% seat lookups / 10% bookings, think time 0.5 to 1.5 s, four routes. Steps of 25, 50, 75, 100, 150,
200 and 300 users, 30 seconds each (short steps; the release run should hold each step for 5 minutes).

**Results.**

    users  req/s   p95 ms  p99 ms  errors   verdict (p95 < 800 ms, errors < 1%)
       75   67.2    210     300     0        pass
      100   73.9    760     850     0        pass (edge)
      150   75.9   1600    1800     0        fail
      300   85.9   3100    3300     0        fail

**Bottleneck and evidence.** From 75 users both pool connections are busy in every sample; requests waiting for a
connection rise to 15 (all other worker threads), pool-wait p95 rises from 18 ms to 531 ms, CPU stays under 40% of
one core. Search, which does not use the database, slows from p95 14 ms to 1,200 ms because it waits for a thread.
Ceiling by arithmetic: 2 connections / 24 ms average hold = 83 req/s, matching the measured plateau.

**Verification.** Pool 8: 150 users at 137 req/s and 300 users at 267 req/s, p95 180 ms, no errors.

**Next limit found.** With waitress's default connection limit of 100, 300 users gave 0.87% connection-refused errors
and throughput stuck at 94 req/s; the limit must be sized with the pool.

**Limits of this test.** Database simulated by fixed delays; payment provider not involved; one run per step.`,
    mcqs: [
      mcq('During a BusYatra stress test, server CPU stays under 40%, latency climbs and all database connections are busy at every sample. What is the most likely bottleneck?', [
        ['The database connection pool, which is full and has requests queued for it', true],
        ['The CPU, because 40% busy is already high for a server under a stress test', false],
        ['The network, because idle CPU always means packets are being dropped', false],
        ['The load generator, because the server is clearly not doing enough work', false],
      ], 'A resource that is 100% utilised with a queue in front of it is the bottleneck; low CPU with rising latency means requests are waiting rather than working. CPU at 40% has headroom, nothing points at the network, and the generator theory would need its own CPU or network to be the full one.'),
      mcq('BusYatra\'s /search never touches the database, yet its p95 rose from 14 ms to 1,200 ms when the pool saturated. Why?', [
        ['Search requests wait for worker threads that are blocked waiting for a connection', true],
        ['Search quietly queries the database too, and the test has simply not noticed it until now', false],
        ['Locust slows down every endpoint equally when any single endpoint becomes slow', false],
      ], 'All endpoints share the server\'s worker threads; when 15 of 16 are stuck waiting for the pool, searches queue for a thread. Search did not call the database in this app, and Locust measures each request on its own; it does not add delay to fast endpoints.'),
      mcq('Raising BusYatra\'s pool from 2 to 8 lifted throughput from about 75 to 267 req/s at 300 users. What should the tester say about the new pool size?', [
        ['It fixes the measured limit, but the database\'s own connection limit must be checked', true],
        ['It is now unlimited, so the team can promise any load the product manager asks for', false],
        ['It should be raised again to 32, since four times more connections gave more speed', false],
      ], 'The rerun proves the pool was the bottleneck, but every app instance multiplies its pool and the database has its own max_connections and CPU; the next limit is somewhere. Nothing is unlimited, and blindly raising the pool can move the queue into the database itself.'),
    ],
    checkpoint: [
      mcq('Each BusYatra request holds a database connection for 24 ms on average and the pool has 2 connections. What is the most throughput the pool can give?', [
        ['About 83 requests per second, from 2 / 0.024', true],
        ['About 41 requests per second, from 1 / 0.024', false],
        ['About 48 requests per second, from 2 x 24', false],
        ['About 12 requests per second, from 24 / 2', false],
      ], 'One connection serves 1 / 0.024 = 41.7 requests a second; two serve about 83. The measured plateau of 75 to 85 req/s matched, which is how the pool was confirmed as the bottleneck. The other figures use one connection, or multiply and divide the wrong way.'),
      mcq('A BusYatra run at 300 users shows ConnectionRefusedError, a flat 94 req/s and a maximum time of 28 seconds, while the pool is never full. Where is the limit?', [
        ['In the server\'s connection limit: new connections are not being accepted', true],
        ['In the database pool, which is too small for three hundred simultaneous users', false],
        ['In the booking handler, which takes 28 seconds to confirm some of the seats', false],
      ], 'Refused connections plus the waitress warning "total open connections reached the connection limit" show requests never reaching the app; the 28 s maximum is a client retrying its connection. The pool was not full in that run, and no handler takes 28 s.'),
      mcq('Which is the best first section of a BusYatra performance report for the release meeting?', [
        ['The question asked and the verdict, with the key number and the cause', true],
        ['The full Locust console output, so every reader can see the raw data', false],
        ['A description of Locust and why it was chosen over JMeter and k6', false],
      ], 'Readers need the answer first: does it meet the target, at what load does it fail, and why. Raw output belongs in an appendix or artefacts, and the tool choice matters far less than the result.'),
    ],
  },

  /* ── DEBUGGING ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_PERFORMANCE_DEBUGGING',
    notes: `Six things that went wrong while building the BusYatra performance tests. In most of them the server was behaving
exactly as configured and the test, the tool or the reading of the numbers was wrong. Every number below is real
Locust 2.47 or waitress output, or comes from the simulation named in the case.

## 1. Throughput flat at 94 req/s and "connection refused"

**Symptom.** After raising the database pool to 8, a 300-user run gave:

    Aggregated   2762 reqs   24 fails (0.87%) | req/s 94.05 | max 28309 ms
    GET,/search,"ConnectionRefusedError(10061, '[WinError 10061] No connection could be made because the target
    machine actively refused it.')",18

The 150-user run had given the same 92.5 req/s. More users, no more throughput, and the pool counters showed
connections free.

**Cause.** The server log said it: "WARNING:waitress:total open connections reached the connection limit, no longer
accepting new connections". Waitress accepts 100 connections by default and each Locust user holds one.

**Fix.** Raise the server's connection limit (connection_limit=1000 here) and size it with the pool and threads. The
same 300 users then gave 267 req/s with no errors. Lesson: when throughput is flat, read the server's log before
blaming the code you are looking at.

## 2. "thresholds passed", but the CI job is red

**Symptom.** The same run printed "thresholds passed: errors 0.87%, p95 130 ms" and then "Shutting down (exit code 1)".

**Cause.** The listener only set environment.process_exit_code on failure. When it is left unset, Locust exits with
--exit-code-on-error (default 1) if any request failed at all. 24 failures, so 1.

**Fix.** Set the code in both branches: process_exit_code = 0 when the thresholds pass. Then decide deliberately
whether 0.87% errors should pass; here they were refused connections, which is a defect worth reporting anyway.

## 3. Sixteen rows instead of two

**Symptom.** A first locustfile without name= printed one row per URL:

    GET  /search?from=Pune&to=Goa&date=2026-11-10   13 reqs
    GET  /search?from=Pune&to=Goa&date=2026-11-11    5 reqs
    ... (11 search rows)
    GET  /trips/1/seats   9 reqs
    ... (5 seat rows)

**Cause.** Locust groups statistics by the request's name, which defaults to the URL. Each row has 3 to 13 samples,
so its p95 is meaningless, and a threshold per endpoint cannot be written.

**Fix.** name="/search" and name="/trips/[id]/seats" (tags: { name: ... } in k6, the sampler label in JMeter).

## 4. Steps too short to measure

**Symptom.** A LoadTestShape of 20, 40 and 60 users for 10 seconds each reported a p95 of 280 to 310 ms during the
40-user step but 130 ms later in the 60-user step.

**Cause.** Locust's "current" percentiles cover roughly the last 10 seconds, and each step lasted 10 seconds, so every
reading mixed the burst of users starting (20 per second) with the step itself. The step measured the ramp.

**Fix.** Hold each step for several minutes and judge only the steady part of each step; start users gradually.

## 5. A requirement that passed while bookings were slow

**Symptom.** "Average booking under 300 ms": measured 218 ms, PASS. Bookings p95 was 1,600 ms.

**Cause.** A slow payment-status check hit about 5% of bookings. The mean hides a small slow group; the aggregated
p99 hid it too (130 ms) because bookings were 9% of requests.

**Fix.** Write requirements as per-endpoint percentiles plus an error rate, and read the per-endpoint rows.

## 6. A stall the tester never saw

**Symptom.** Users complained of two-second freezes; a closed-loop test reported p99 = 10 ms.

**Cause.** Coordinated omission. In the simulation (2-second stall every 20 s), the closed-loop tester sent 4,506
requests instead of 5,000 and only 5 were slower than 500 ms; on an open schedule 757 were, and p99 was 1,910 ms.

**Fix.** Use an open model (k6 arrival-rate executors), or watch the achieved request rate: if it dips while latency
rises, the tool stopped sending while the server stalled.`,
    mcqs: [
      mcq('A BusYatra Locust run prints rows like "/search?from=Pune&to=Goa&date=2026-11-12" with 13 requests each. What is the fix?', [
        ['Pass name="/search" so that all search requests share one stats row', true],
        ['Run the test for longer, so each row eventually collects more samples', false],
        ['Remove the date parameter, since Locust cannot record query strings', false],
        ['Add catch_response=True so Locust groups the responses by endpoint', false],
      ], 'Locust names a request by its URL unless name= is given, so every distinct query string is its own row. A longer run still splits the data, the query string is valid and should vary, and catch_response is about marking failures, not grouping.'),
      mcq('A BusYatra test prints "thresholds passed" but Locust exits with code 1. The run had 24 failed requests. Why?', [
        ['process_exit_code was left unset, so Locust used its default for runs with errors', true],
        ['Locust always exits with code 1 when a quitting listener has printed anything', false],
        ['The p95 threshold failed silently because it was compared in seconds, not in milliseconds', false],
      ], 'If the test never sets environment.process_exit_code, Locust uses --exit-code-on-error (1 by default) whenever any request failed. Printing does not affect the exit code, and the printed p95 of 130 ms was in milliseconds as compared.'),
      mcq('A BusYatra step test holds each step for 10 seconds and the p95 jumps at every step change. What is the main problem?', [
        ['The steps are too short, so the readings mix the start-up burst with the steady load', true],
        ['The server has a defect that makes it slow whenever new users are connected to it', false],
        ['Locust cannot report percentiles for runs that use a LoadTestShape class', false],
      ], 'With 10-second steps and a roughly 10-second percentile window, every reading includes users starting together; the step never reaches a steady state. A server defect is not shown by this evidence, and Locust reports percentiles for shaped runs normally.'),
      mcq('Users report two-second freezes in BusYatra but a closed-loop test reports p99 = 10 ms. Which reading of the test output would have hinted at the problem?', [
        ['The achieved request rate dipping during the run while latency rose', true],
        ['The minimum response time, which would be much higher during freezes', false],
        ['The number of virtual users, which would fall by half during a freeze', false],
      ], 'A closed-loop user cannot send while it waits, so the request rate dips during a stall; that dip is the trace of coordinated omission. The minimum is set by fast requests, and the user count stays constant because users are waiting, not leaving.'),
    ],
  },

  /* ── PRACTICE ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_PERFORMANCE_PRACTICE',
    notes: `Nine exercises on BusYatra and the numbers from this topic. Try each before reading the answer. The calculations were
checked in Python; the measured tables are the real Locust runs from the lessons.

## 1. Pick the test (easy)

Which kind of test answers each question? (a) "Is release 4.2 slower than 4.1?" (b) "Can we take the 10 am Tatkal
rush that goes from 50 to 600 req/s in a minute?" (c) "Do bookings still work after 8 hours of normal traffic?"
(d) "Do we meet p95 < 800 ms at the expected 200 req/s?" (e) "At what load does it fall over, and does it recover?"

**Answer.** (a) baseline / regression; (b) spike; (c) soak; (d) load; (e) stress. Each test is defined by its
question, not by its user count.

## 2. Percentiles by hand (easy)

Twenty booking times in ms: 110, 95, 120, 105, 98, 102, 130, 99, 101, 97, 2400, 104, 96, 100, 115, 108, 103, 99,
1900, 112. Give the mean, the median, and p90, p95 and p99 by the nearest-rank method (sort; p-th percentile is the
value at position ceil(p/100 x n)).

**Answer.** The script

    s = sorted(ms)
    def nearest_rank(p):
        return s[math.ceil(p / 100 * len(s)) - 1]

printed mean 309.7, median 103.5, and {50: 103, 90: 130, 95: 1900, 99: 2400}. Two of twenty took over a second.
The mean (310 ms) describes nobody: 18 bookings took about 100 ms and two took about 2 seconds. With only 20 samples
p95 and p99 are single values, so tail percentiles need many samples to be stable.

## 3. Little's law both ways (medium)

(a) 500 users on BusYatra, average think time 4 s, average response 0.5 s. What request rate do they produce?
(b) You must produce 200 req/s; think time 1.0 s, expected response 0.2 s. How many virtual users?

**Answer.** N = X x (R + Z). (a) X = 500 / 4.5 = 111 req/s. (b) N = 200 x 1.2 = 240 users. If the response time
rises to 1.0 s under load, the same 240 users produce only 120 req/s: in a closed model the rate falls as the server
slows, which is why "users" alone is never the load.

## 4. How often a journey meets the tail (medium)

A booking journey is 8 API calls. What share of journeys meet at least one call slower than p99?

**Answer.** 1 - 0.99^8 = 1 - 0.923 = 7.7%. About one journey in thirteen, from a "1 in 100" statistic. That is why
p99 matters for multi-step flows.

## 5. Requirement to k6 thresholds (medium)

"Errors under 0.5%; seat lookups p95 under 300 ms; all requests p99 under 1.5 s; 99% of checks pass." Write the
thresholds block. (Written from the k6 documentation; k6 was not available to run it.)

**Answer.**

    thresholds: {
      http_req_failed: ['rate<0.005'],
      'http_req_duration{name:seats}': ['p(95)<300'],
      http_req_duration: ['p(99)<1500'],
      checks: ['rate>0.99'],
    },

The seats threshold only works if the seat requests carry tags: { name: 'seats' }.

## 6. Find where it fails (medium)

From the stress table (pool of 2): at 75 users p95 210 / p99 300 ms; 100 users p95 760 / p99 850; 150 users p95
1600 / p99 1800; errors 0 throughout. Requirement: p95 < 800 ms and p99 < 1,000 ms. Last passing step?

**Answer.** 100 users (about 74 req/s): p95 760 < 800 and p99 850 < 1,000. 150 users fails both. Report it as a
rate, about 74 req/s, and note the margin at 100 users is only 40 ms on p95, so the real limit is close to it.

## 7. Pool arithmetic (medium)

A new mix: 50% seat lookups (40 ms of database time), 20% bookings (120 ms), 30% search (none). Pool of 4. Ceiling?

**Answer.** Average hold = 0.5 x 40 + 0.2 x 120 = 44 ms. Ceiling = 4 / 0.044 = 91 req/s. A heavier booking share
lowers the ceiling even with twice the connections of the original test.

## 8. JMeter scope (medium)

A plan has a thread group with GET /search, GET /trips/\${trip}/seats and POST /bookings. Where do you put (a) a
JSON Assertion that $.status is CONFIRMED, (b) one think time per journey, (c) the Content-Type header for the POST?

**Answer.** (a) Under POST /bookings only; at group level it would also check search and seats and fail them.
(b) A timer under one sampler (say GET /search), since a timer at group level runs before every sampler. (c) An HTTP
Header Manager under POST /bookings (or at group level, if every request should send it).

## 9. Diagnose from metrics (hard)

Another team's service under load: p95 rises from 120 ms to 2 s between 300 and 400 req/s; app CPU 96% on all
cores; pool waiting 0; database CPU 20%; generator CPU 35%. Where is the bottleneck and what do you ask for?

**Answer.** The application CPU: it is fully utilised, nothing waits for the pool, the database is idle and the
generator is fine. Ask for a profile under load (py-spy for Python, a flame graph) to find the hot code, such as
JSON serialisation of a large response or a regex in a loop, and for a rerun after the fix. Adding connections would
change nothing here; adding instances would buy time but not explain it.`,
    mcqs: [
      mcq('Twenty BusYatra booking times have a mean of 309.7 ms and a median of 103.5 ms. What does the gap tell you?', [
        ['A few very slow values pull the mean up; most bookings were near 100 ms', true],
        ['The data was recorded wrongly, since a mean cannot be three times a median', false],
        ['Most bookings took about 300 ms, and the median is wrong for small samples', false],
        ['Half the bookings took over 300 ms and half took under 100 ms in the run', false],
      ], 'Two values near 2 seconds lift the mean to 310 ms while the median stays at the typical 103 ms; a skewed distribution always does this. Nothing is wrong with the data, the median is exactly the typical value here, and no booking took around 300 ms.'),
      mcq('BusYatra\'s load test must produce 200 req/s; think time is 1.0 s and expected response time is 0.2 s. How many virtual users does Little\'s law give?', [
        ['240 users, from 200 x (1.0 + 0.2)', true],
        ['200 users, one for each request per second', false],
        ['1,000 users, from 200 / 0.2 seconds', false],
        ['167 users, from 200 / (1.0 + 0.2)', false],
      ], 'N = X x (R + Z) = 200 x 1.2 = 240. One user per request per second would be right only if R + Z were exactly 1 s, 200 / 0.2 ignores think time, and dividing by (R + Z) inverts the law.'),
      mcq('A booking journey makes 8 BusYatra calls. About what share of journeys meet at least one call slower than p99?', [
        ['About 8%, from 1 - 0.99 to the power 8', true],
        ['Exactly 1%, as p99 says for any request', false],
        ['About 99%, because p99 covers nearly all', false],
      ], '0.99^8 is about 0.923, so about 7.7% of journeys contain a slower-than-p99 call. The 1% is per call, not per journey, and p99 says 99% of calls are fast, not that 99% of journeys are slow.'),
      mcq('A service at 400 req/s shows app CPU at 96%, nobody waiting for the database pool and the database at 20% CPU. What should the tester ask for next?', [
        ['A CPU profile of the app under load to find the hot code path', true],
        ['A larger database connection pool, so queries can run in parallel', false],
        ['A bigger database instance, since queries are probably slow too', false],
        ['A longer soak test, to see whether the CPU settles down later on', false],
      ], 'The app CPU is the full resource and nothing queues elsewhere, so the question is which code burns it; a profile (py-spy, flame graph) answers that. The pool and the database have headroom, and a soak test answers a different question.'),
      mcq('A JMeter BusYatra plan puts a JSON Assertion "$.status is CONFIRMED" at thread-group level. What happens?', [
        ['Search and seat requests also get checked and fail, since their JSON has no status', true],
        ['Only the last sampler in the group is checked, so the booking is checked correctly', false],
        ['JMeter refuses to run the plan, because assertions must sit under one sampler', false],
      ], 'An assertion applies to every sampler in its scope; at group level it checks search and seats too, and they fail because their responses have no CONFIRMED status. JMeter runs such a plan without complaint, and scope does not mean "the last sampler".'),
    ],
  },

  /* ── INTERVIEW_QUESTION ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_PERFORMANCE_INTERVIEW_QUESTION',
    notes: `Four questions that come up in QA, SDET and performance-test interviews at product companies, GCCs and services
companies, with an answer that scores well and the follow-up a good interviewer asks next. Say each aloud in about two
minutes, with numbers.

## Q1. "What is the difference between load, stress, spike and soak testing?"

**Model answer.** "Each answers a different question. A load test asks whether we meet our targets at the expected
peak, say 200 requests per second with the real request mix, p95 under 800 ms and errors under 1%, held for half an
hour. A stress test pushes past that in steps to find where it breaks and how: errors, timeouts or just slowness, and
whether it recovers when the load drops. A spike test jumps the load in seconds, like a sale opening at midnight or a
Tatkal window, to see if queues and autoscaling cope. A soak test runs normal load for hours to find leaks:
memory, connections, disk. On a bus-booking demo I stress-tested, the API never returned an error; it just got
slower, with p95 going from 210 ms at 75 users to 1.6 s at 150, so the failure mode was latency."

**Follow-up.** "Which would you run first for a new feature?" — "A small baseline at low load to make sure the build is
sane and to have numbers to compare against, then a load test at the expected peak. Stress and soak come once the
load test passes."

## Q2. "Why do you report p95 or p99 rather than the average?"

**Model answer.** "Latency is skewed: most requests are fast and a few are very slow, so the average describes nobody.
In one run the average booking was 218 ms and the p95 was 1.6 seconds, because a slow payment check hit about 5% of
bookings; an average-based requirement passed. Percentiles show the tail users feel, and a journey of many calls meets
the tail often: with 20 calls, 64% of sessions see at least one call slower than p95. I also report per endpoint,
because the aggregate across all endpoints hid that same tail: aggregated p99 was 130 ms."

**Follow-up.** "Can you average the p95 of three servers?" — "No. Percentiles don't average. You merge the raw samples
or histogram buckets and compute again."

## Q3. "Response time goes up under load. How do you find the bottleneck?"

**Model answer.** "First I find the knee: the load where throughput stops growing and latency starts. Then I line up
server metrics at the same time and check each resource on the path for utilisation, saturation and errors: CPU,
memory, worker threads, the connection pool, the database, external calls, and the load generator itself. The
bottleneck is the resource that is full and has a queue. In my demo, CPU stayed under 40% but both database
connections were always busy and 15 threads were waiting for one; the measured ceiling of about 80 requests per
second matched two connections divided by 24 ms average hold time. Raising the pool to 8 gave 267 requests per
second, which proved it. Then I looked for the next limit, which was the server's connection limit."

**Follow-up.** "CPU is at 30% and latency is high. What does that tell you?" — "That requests are waiting, not
working: a pool, a lock, a thread limit or a slow dependency. High CPU would point at the code instead, and I would
ask for a profile."

## Q4. "How many users would you simulate for a sale day?"

**Model answer.** "I would not start from users. I would take last year's busiest hour from the access logs, find the
peak-minute rate, apply expected growth, and get the request mix and think time from the same logs. Then Little's law
turns the rate into virtual users: users = rate x (response time + think time). For 200 requests per second with one
second of think time and 0.2 s responses, that is about 240 virtual users. I would also make the data varied, so
caches behave like they do for real customers, and agree pass criteria before running."

**Follow-up.** "Locust, JMeter or k6?" — "Whatever the team can maintain. Locust if the team writes Python; k6 if they
want an open model and thresholds built in; JMeter if they already have plans in it. The method matters more: the
workload model, server metrics, and percentiles per endpoint."`,
    mcqs: [
      mcq('An interviewer asks how many users to simulate for a BusYatra sale. Which answer opens best?', [
        ['Derive the peak rate and mix from last year\'s logs, then convert to users with Little\'s law', true],
        ['Start with 1,000 users, because that is the usual industry standard for an e-commerce sale-day test', false],
        ['Simulate as many users as the load generator can produce, to be safe on the day itself', false],
      ], 'A workload model from real traffic, converted with N = X x (R + Z), gives a defensible number and an honest test. A fixed "standard" has no basis, and the generator\'s maximum measures nothing about the expected sale.'),
      mcq('In an interview you say CPU stayed at 30% while latency tripled under load. What should you conclude aloud?', [
        ['Requests are waiting on something, such as a pool, a lock or a dependency', true],
        ['The CPU is the bottleneck, since any CPU use above a quarter is a warning', false],
        ['The test is invalid, since latency can only rise when the CPU is near full', false],
      ], 'Low CPU with rising latency means time is spent queued, not computing, so the next step is to find the full resource with a queue. 30% CPU has plenty of headroom, and latency often rises with idle CPU when a pool or lock is the limit.'),
      mcq('Asked "can you average the p95 of three servers?", what is the strongest short answer?', [
        ['No; merge the raw samples or histograms and compute the percentile again', true],
        ['Yes, as long as all three servers handled about the same number of requests', false],
        ['Yes, but only for p95; p99 must be taken from the slowest of the servers', false],
      ], 'A percentile depends on the whole distribution, which averaging p95 values loses, even with equal request counts. Merging samples or histogram buckets is the correct method for every percentile, not a special rule for p99.'),
    ],
  },

  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_PERFORMANCE_CHECKPOINT',
    notes: `Ten questions across the topic: choosing the test, workload models, reading percentiles and throughput, coordinated
omission, Locust and k6, JMeter, and finding and reporting the bottleneck. Answer without notes; the result shows which
lesson to revisit.`,
    checkpoint: [
      mcq('An ed-tech app publishes exam results at 10:00 and traffic goes from 2,000 to 60,000 requests a minute in under a minute. Which test should come first?', [
        ['A spike test that jumps the load in seconds and holds it', true],
        ['A soak test at normal load for eight to twelve hours', false],
        ['A baseline test at low load on each new release build', false],
      ], 'A sudden jump is a spike; the question is whether queues, pools and autoscaling cope with a step change. A soak test looks for slow degradation and a baseline compares builds at low load; neither puts the jump on the system.'),
      mcq('A BusYatra load test uses one customer account and the same trip for every booking. What is the main risk to the result?', [
        ['Row locks and caches behave unlike real traffic, so results are wrong in either direction', true],
        ['The test will be more realistic, since real customers often book the very same popular trip at once', false],
        ['None, as long as the request rate and the request mix match the workload model exactly', false],
      ], 'One hot row can create lock contention real traffic would not have, while one hot query lets caches serve everything; either way the numbers do not describe production. Rate and mix are necessary but not enough; data variety is part of the workload model.'),
      mcq('A k6 BusYatra test uses the ramping-vus executor and the server stalls for a few seconds. How does that affect the recorded latencies?', [
        ['Fewer requests are sent during the stall, so the tail is under-recorded', true],
        ['k6 detects the stall and doubles the VUs to keep the rate constant', false],
        ['The stall is recorded fully, because VU-based executors are open-loop', false],
      ], 'VU-based executors are closed-loop: each VU waits for its reply, so during a stall fewer requests start and the tail is under-sampled (coordinated omission). Only arrival-rate executors add VUs to hold a rate.'),
      mcq('A BusYatra report quotes "p95 = 760 ms" for a run whose first minute was ramp-up with only a few users. What should be done before quoting it?', [
        ['Exclude the ramp-up period and quote the steady part of the run', true],
        ['Nothing, since including more requests makes the p95 more accurate', false],
        ['Quote the p50 instead, since ramp-up only distorts the tail values', false],
      ], 'Ramp-up samples come from a lighter load and pull the numbers towards a better result; the requirement is about the steady load. More samples from the wrong load do not help, and ramp-up affects the whole distribution, not only its tail.'),
      mcq('Locust prints a BusYatra p95 of 1600 for a booking that took 1,625 ms. Why the difference?', [
        ['Locust rounds response times above 100 ms before computing percentiles', true],
        ['Locust excludes the network time and reports only the server time', false],
        ['Locust reports percentiles in centiseconds rather than milliseconds', false],
      ], 'The percentile table is labelled "approximated": times are rounded (to two significant figures above 100 ms) before percentiles are computed. Locust measures the full client-side time, and its unit is milliseconds.'),
      mcq('Which Locust setting groups /trips/1/seats, /trips/2/seats and /trips/3/seats into one statistics row?', [
        ['name="/trips/[id]/seats" on the request', true],
        ['@task(3) on the seats task method', false],
        ['wait_time = between(0.5, 1.5)', false],
      ], 'Locust groups statistics by request name, which defaults to the URL; name= overrides it. Task weights set the mix and wait_time sets think time; neither changes how rows are grouped.'),
      mcq('A JMeter BusYatra run is planned at 400 threads from the GUI with a View Results Tree listener enabled. What is the right change?', [
        ['Run with -n and -l to a JTL, with heavy listeners disabled', true],
        ['Keep the GUI but run 40 threads, then multiply results by ten', false],
        ['Add a second View Results Tree so the work is split in two', false],
      ], 'Load runs belong in non-GUI mode writing a JTL; heavy listeners consume the generator and distort timing. Scaling results from 40 threads assumes linear behaviour, which is exactly what is being tested, and more listeners only add load.'),
      mcq('A step test on BusYatra shows throughput rising until 100 users and then flat while p95 rises sharply. Server CPU is at 30%. What is the next step?', [
        ['Check pools, threads and dependencies for a full resource with a queue', true],
        ['Report the CPU as the bottleneck, as it is the first resource on the list', false],
        ['Rerun at 1,000 users to confirm that the throughput stays flat for longer', false],
      ], 'Flat throughput with idle CPU means the limit is a wait, so the investigation looks for the saturated pool, thread limit or slow dependency. Nothing points at the CPU, and more load only confirms the symptom without finding the cause.'),
      mcq('After raising BusYatra\'s pool from 2 to 8, how should the tester confirm the pool really was the bottleneck?', [
        ['Rerun the same steps and show the knee moved to a higher load', true],
        ['Check that the new pool size appears in the configuration file', false],
        ['Ask the developer whether the change was deployed to every instance', false],
      ], 'A finding is proved by changing the suspected cause and showing the behaviour changed: throughput went from about 75 to 267 req/s with the same steps. A config value or a developer\'s word shows the change was made, not that it was the cause.'),
      mcq('Which pass criterion is the most useful for BusYatra\'s Sankranti load test?', [
        ['At 200 req/s with the real mix: per-endpoint p95 < 800 ms, errors < 1%, for 30 min', true],
        ['The average response time across all requests stays below 300 ms during the run', false],
        ['The system handles 1,000 virtual users without crashing at any point during the whole test run', false],
      ], 'A good criterion names the load, the mix, per-endpoint percentiles, an error limit and a duration, so it can fail for the right reasons. An overall average hides slow endpoints and tails, and "users without crashing" has no rate, no latency and no error limit.'),
    ],
  },
];
