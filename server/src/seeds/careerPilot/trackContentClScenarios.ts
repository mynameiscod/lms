/**
 * Career-track placement content: Cloud Scenario Rounds (CL_SCENARIO_ROUNDS), Cloud & DevOps Engineer, batch CL4.
 *
 * The rounds after the question-and-answer interview: a live troubleshooting round, a whiteboard design round, a
 * Terraform-and-pipeline take-home, and an incident played by the interviewer, then a timed set. Each round unit
 * walks one full scenario — what the interviewer is testing, the checks in order and what to say aloud, how it is
 * scored and how candidates fail — and refers back to the track's Kubernetes, AWS, Terraform, CI/CD and
 * observability topics rather than re-teaching them. Companies, people, accounts and addresses are fictional.
 *
 * Verified: the ALB evidence script ran with boto3 1.43 against moto 5.2 (its CloudWatch figures were seeded into
 * moto, so only the script's mechanics are real); every HCL block parsed with python-hcl2, every YAML block with
 * PyYAML, and the Deployment also through the kubernetes client's V1Deployment model; all capacity, budget and
 * error-budget arithmetic was run in Python. kubectl output, ALB access-log lines and terraform plan output are
 * written from the documentation, not captured. Default skill KUBERNETES; DESIGN_ROUND measures CLOUD_COMPUTE,
 * IAC_TAKEHOME INFRA_AS_CODE and INCIDENT_ROUND INCIDENT_MANAGEMENT; elsewhere ck() names those skills.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_CL_SCENARIO_ROUNDS_BUNDLES: PilotBundle[] = [
  /* ── TROUBLESHOOTING_ROUND ─────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_SCENARIO_ROUNDS_TROUBLESHOOTING_ROUND',
    notes: `Most DevOps and SRE loops — a GCC platform team in Hyderabad, a Bengaluru fintech, a services firm's cloud practice
in Pune — have a round where the interviewer says "This is broken. Fix it, and talk while you do." Sometimes it is a
shared terminal on a kind cluster; more often it is spoken, and the interviewer answers each check you ask for.
**The panel scores the order of your checks and the reason for each, not the speed of the fix.** A candidate who
restarts everything and gets lucky scores below one who narrows the fault hop by hop and runs out of time.

You have the tools from *Debugging Containers and Kubernetes* and *Debugging AWS Networks*; this unit is using them
aloud, under questions, in an order you can defend.

## The method to say aloud

1. **Scope.** What fails, for whom, since when? Reproduce it: curl -v against the public URL.
2. **What changed?** Deploys, config, node groups, certificates. Most faults follow a change.
3. **Follow the request outside in:** DNS, load balancer, target group or Service, Pod, application, dependency.
   At each hop, say what you look at and what each answer rules out.
4. **Read the status code before the logs.** At an ALB, 503, 502, 504 and a target 5xx point to different hops.
5. **One change, with a prediction.** "If it is X, this metric drops to zero in five minutes." Then verify, then
   name the prevention.

## A full round

**Interviewer:** "SafarSeat, a fictional Pune bus-ticketing start-up, runs bookings-api on EKS in ap-south-1 behind
an ALB from the Load Balancer Controller, target type ip. Release 2026.10.27-1 went out at 14:05. Since then, a few
customers see 'Something went wrong' when confirming a booking. Go."

**Candidate:** "First scope. 'A few' — so not everything. I'd like the ALB's split of errors: how many 5xx the load
balancer generated itself and how many came from targets, plus target health. I'd run this:"

    def alb_evidence(lb_name, region="ap-south-1", minutes=30):
        elb = boto3.client("elbv2", region_name=region)
        cw = boto3.client("cloudwatch", region_name=region)
        lb = elb.describe_load_balancers(Names=[lb_name])["LoadBalancers"][0]
        dim = lb["LoadBalancerArn"].split(":loadbalancer/")[1]          # app/<name>/<id>
        for tg in elb.describe_target_groups(LoadBalancerArn=lb["LoadBalancerArn"])["TargetGroups"]:
            states = [h["TargetHealth"]["State"] for h in
                      elb.describe_target_health(TargetGroupArn=tg["TargetGroupArn"])["TargetHealthDescriptions"]]
            print(f"{tg['TargetGroupName']:<14} targets {len(states)}  " +
                  ", ".join(f"{s} {states.count(s)}" for s in sorted(set(states))))
        # then Sum of RequestCount, HTTPCode_ELB_502_Count, HTTPCode_Target_5XX_Count over the window

Run against moto with the round's figures seeded into CloudWatch:

    bookings-api   targets 6  healthy 6
    RequestCount                144000
    HTTPCode_ELB_502_Count        1130
    HTTPCode_Target_5XX_Count        0

**Candidate:** "1,130 of 144,000 is 0.78%. All six targets are healthy, so this is not a 503 problem. The 502s are the
ALB's own and the app returned no 5xx — so the app did not *say* 'error'; the ALB got a broken or closed connection
from it. That rules out the database and the payment code for now. I'd check the Pods for restarts mid-request."

**Interviewer:** "kubectl get pods: six Running, zero restarts. One access-log line: elb_status_code 502,
target_status_code '-'."

**Candidate:** "A dash means the target never answered. No crashes, so something closes connections. What changed
at 14:05 besides the code?"

**Interviewer:** "The image switched from gunicorn with a config file to plain uvicorn."

**Candidate:** "Then my first suspect is keep-alive. The ALB holds idle connections to targets for its idle timeout —
60 seconds by default — and reuses them. Uvicorn closes an idle keep-alive connection after 5 seconds by default. If
the ALB sends a request down a connection at the moment the server closes it, the ALB returns 502. AWS's guidance is
that the target's keep-alive must be longer than the load balancer's idle timeout. The old gunicorn config probably
set it; the new command does not. Prediction: set it to 75 seconds and the ELB 502 count falls to zero."

    containers:
      - name: api
        image: 123456789012.dkr.ecr.ap-south-1.amazonaws.com/bookings-api:2026.10.27-1
        command: ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000",
                  "--timeout-keep-alive", "75"]

"I'd ship that as a normal reviewed change, watch HTTPCode_ELB_502_Count for 30 minutes, and then prevent: an
alarm on ELB-generated 5xx in the canary analysis, and the keep-alive value pinned in the chart with a comment that
says why."

## Reading the codes — say this table aloud

    ELB_503 up, healthy targets 0   no healthy targets: health check path, readiness, Service selector
    ELB_502 up, Target_5XX flat     target closed or garbled the connection: keep-alive, crash mid-request,
                                    Pods killed during a deploy without a preStop delay
    ELB_504 up                      target did not answer in time: slow dependency, idle timeout passed
    Target_5XX up                   the app said 500: its logs, then its dependencies

## How it is scored

| Area | Weight | Full marks when |
|---|---|---|
| Method | 30% | scope, change, outside-in path, each check named before it is done |
| Evidence | 25% | metrics and codes read correctly; each check rules something out |
| Hypothesis and test | 20% | one cause stated with a prediction that would prove it wrong |
| Fix and prevention | 15% | the smallest safe change, then an alarm or test so it cannot return quietly |
| Communication | 10% | thinks aloud, asks for facts instead of assuming them |

**Ways to lose:** restarting Pods or rolling back before saying what you expect it to show; reading application
logs first when the ALB already says the app returned nothing; "it's probably networking" with no hop named;
changing three things at once; silence for two minutes while you think. A rollback *is* a fine mitigation if
customers are hurting — say so — but say too that it does not tell you the cause.`,
    workedExample: `**Interviewer: "SafarSeat replaced its EKS node group last night. This morning one Pod of the seat-hold cache, the
StatefulSet seat-cache, is Pending. The other two are fine. Walk me through it."**

**Answered badly.** "Pending usually means not enough nodes, so I'd scale the node group up to six and delete the Pod
so it reschedules."

Why it fails: a cause guessed from the state, a change made without evidence, and a second change (deleting the
Pod) that teaches nothing. If the cause is not capacity, the cluster now costs more and the Pod is still Pending.

**Answered well.** "Pending means the scheduler has not placed it. The reason is in the Pod's events, so first:
kubectl describe pod seat-cache-2 -n bookings, and read the FailedScheduling message."

**Interviewer:** "0/3 nodes are available: 3 node(s) had volume node affinity conflict."

"That is not capacity. The Pod has a PersistentVolumeClaim, and its EBS volume lives in one Availability Zone —
EBS volumes cannot attach across zones. So no node in that volume's zone is available. Next I'd check which zone the
volume is in — kubectl get pv for the claim, and its node affinity — and which zones the new node group covers."

**Interviewer:** "The volume is in ap-south-1c. The new node group's subnets are only 1a and 1b."

"Then the fix is capacity in 1c — add the 1c subnet to the node group, or a node group there — not more nodes in 1a
and 1b. I would not delete the PVC to get the Pod running: that throws away the data, and even for a cache it means
a cold start under load. Prevention: node groups span every zone the volumes do, the StorageClass uses
WaitForFirstConsumer so new volumes follow the Pod, and a node-group change gets a check that every StatefulSet's
zones are still covered."

Why it works: the state is read as "not scheduled", the reason comes from events rather than a guess, the zone
constraint is named, and the fix is the one change the evidence points to — with what not to do and why.`,
    mcqs: [
      mcq('In SafarSeat\'s round, six targets are healthy, HTTPCode_ELB_502_Count is 1,130 and HTTPCode_Target_5XX_Count is 0. What does that split tell the candidate first?', [
        ['The ALB got a closed or broken connection, not an error reply from the app', true],
        ['The database is timing out, so the payment confirmations are failing in the app', false],
        ['No targets are passing health checks, so the ALB has nowhere to send traffic', false],
        ['The app is returning 500s, which the ALB is relabelling as 502 for the client', false],
      ], 'ELB-generated 502s with no target 5xx mean the load balancer never got a usable response, so the app did not report an error. Unhealthy targets would show as 503s and zero healthy targets, and a database timeout would surface as target 5xx or 504s.'),
      mcq('The interviewer reveals that bookings-api moved from a gunicorn config file to plain uvicorn at 14:05. Why does that make keep-alive the first suspect?', [
        ['Uvicorn closes idle connections after 5 s, well inside the ALB\'s 60 s reuse', true],
        ['Uvicorn cannot serve HTTP/1.1, so the ALB downgrades and drops some requests', false],
        ['Gunicorn retried failed requests itself, and uvicorn does not retry any of them', false],
        ['Uvicorn listens on a different port, so a share of requests hit a closed port', false],
      ], 'The ALB reuses idle target connections for up to its idle timeout; if the server has already closed one, the request on it fails with a 502. Uvicorn speaks HTTP/1.1, servers do not retry requests, and a wrong port would fail every request and the health checks too.'),
      mcq('Before changing anything in a live troubleshooting round, what should a candidate say aloud?', [
        ['The suspected cause and which metric will move if it is right', true],
        ['That a rollback will be done first, since it always reveals the cause', false],
        ['That every Pod will be restarted so the cluster is in a known state', false],
        ['Which three settings will change together to save interview time', false],
      ], 'A stated hypothesis with a prediction lets the panel score your reasoning and lets you tell whether the change worked. A rollback can mitigate but does not reveal the cause, restarts destroy evidence, and changing several things hides which one mattered.'),
    ],
    checkpoint: [
      mcq('A StatefulSet Pod is Pending with "3 node(s) had volume node affinity conflict" after a node group change. What is the fix the evidence points to?', [
        ['Add node capacity in the zone where the Pod\'s EBS volume lives', true],
        ['Raise the node group\'s size in the zones it already covers today', false],
        ['Delete the PersistentVolumeClaim so a fresh volume is created anywhere', false],
        ['Remove the Pod\'s CPU requests so that the scheduler can place it', false],
      ], 'An EBS volume attaches only in its own Availability Zone, so the Pod needs a node in that zone. More nodes elsewhere do not help, deleting the claim throws away the data, and requests have nothing to do with a volume conflict.'),
      ck('CLOUD_COMPUTE', 'After a release, the ALB in front of an EKS service shows HTTPCode_ELB_503_Count rising and zero healthy targets. Which hop do you check next?', [
        ['The health check and the Pods\' readiness for the new release', true],
        ['The application\'s error logs for unhandled exceptions in handlers', false],
        ['The Route 53 record, since clients may resolve a stale address', false],
        ['Uvicorn\'s keep-alive timeout against the ALB\'s idle timeout setting', false],
      ], 'A 503 with no healthy targets means the ALB has nowhere to send requests, so the question is why the new targets fail their checks. Keep-alive mismatches give scattered 502s with healthy targets, and DNS problems would not change target health.'),
      mcq('Which opening best fits the start of a spoken troubleshooting round about "some users get errors"?', [
        ['"Which users, which URL, since when — and what changed around then?"', true],
        ['"I would restart the deployment first to rule out a bad Pod quickly"', false],
        ['"It sounds like a DNS issue, so I would flush the resolver caches"', false],
        ['"I would scale the node group up to see whether the errors stop"', false],
      ], 'Scoping the failure and asking what changed narrows the search before any action and is the first thing the method rubric looks for. Restarting, flushing caches or scaling are changes made before there is any evidence for them.'),
    ],
  },

  /* ── DESIGN_ROUND ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_SCENARIO_ROUNDS_DESIGN_ROUND',
    notes: `The design round is 45 minutes with a whiteboard (or Excalidraw on a shared screen) and a prompt like "Design the
backend for X on AWS." It is common in cloud engineer and SRE loops at product companies and GCCs, and in solutions
architect interviews at partners. **The interviewer is testing whether you design to stated requirements and can
defend each box — not whether you know the most services.** A diagram with twelve services and no numbers scores
below one with six services, a capacity sum and a clear "I chose this because, and it costs us that."

You have the parts from *Designing for Failure: Multi-AZ*, *Auto Scaling*, *RDS and Aurora*, *ECS or EKS* and
*Capacity Planning for the Sale*. This unit is putting them in order under questioning.

## The shape of 45 minutes

| Minutes | What you do |
|---|---|
| 0–5 | Requirements: load, availability, data, budget, team — ask, then write them in a corner |
| 5–10 | Numbers aloud: capacity, error budget, database load |
| 10–25 | The diagram, one request path at a time |
| 25–40 | Deep dives the interviewer picks; trade-offs defended |
| 40–45 | Risks, cost drivers, what you would build next |

## A full round

**Interviewer:** "SafarSeat sells intercity bus tickets. Design the search and booking backend on AWS."

**Candidate asks, and the interviewer answers:** normal load about 300 requests per second, peak 3,000 in the week
before Diwali and Chhath; 99.9% availability for search and booking; payments by UPI through a payment provider;
passenger data must stay in India; four engineers; "the cheapest thing that works, but no double-booked seats."

**Numbers, said aloud (checked in Python):**

    load test: one Fargate task (1 vCPU) serves 120 rps at the p99 target
    peak: 3000 / 120 = 25 tasks
    survive losing 1 of 3 AZs at peak: 25 must fit in 2 AZs -> 13 per AZ -> 39 tasks
    normal: 300 / 120 -> 3 tasks; with the AZ rule -> 2 per AZ -> 6 tasks minimum
    DB connections at peak: 39 tasks x pool of 10 = 390
    99.9% over 30 days = 43.2 minutes of allowed downtime; 99.95% = 21.6

"Three tiers that each manage 99.9% only give about 99.75% together — 0.999 × 0.999 × 0.9995 is 0.9975, close to
108 minutes a month — so the components need to be better than the target, or redundant."

**The design, one request at a time:**

    Route 53 -> CloudFront (static site, cached search pages)
             -> ALB (public subnets, 3 AZs, ap-south-1)
             -> ECS Fargate service bookings-api (private subnets, 3 AZs, 6..39 tasks)
                  -> RDS Proxy -> RDS PostgreSQL Multi-AZ (seats, bookings)
                  -> ElastiCache Redis (search results, 60 s TTL)
                  -> SQS -> notifier tasks (SMS, e-mail tickets)
             PSP webhook -> ALB -> bookings-api (signature checked)

**Defending the choices:**

- **ECS on Fargate, not EKS.** Four engineers, ordinary HTTP services, AWS only: no control plane to upgrade, no
  nodes to patch. EKS would earn its keep with many teams or a need for the Kubernetes ecosystem.
- **Not Lambda for the API.** It would work for the spiky load, but 3,000 rps of sustained requests against a
  relational database makes connection handling and per-request cost the hard parts; containers with a pool are
  simpler. Lambda fits the notifier or the PSP webhook.
- **PostgreSQL for seats.** "No double-booked seats" is a correctness requirement: a unique constraint on
  (trip_id, seat_no) for confirmed bookings, and holds that expire, inside transactions. DynamoDB can do this with
  conditional writes, but search by route and date is relational and the team knows SQL.
- **RDS Proxy.** 390 connections at peak is too many to open and close per task without pooling; the proxy also
  shortens failover for the app.
- **Multi-AZ, not a read replica, for availability.** The standby takes over automatically; a replica is for
  reads and must be promoted.
- **Data in India.** Everything in ap-south-1; backups copied to ap-south-2 (Hyderabad) for disaster recovery —
  restore there is a stated RTO of hours, not minutes, at this budget.
- **The peak.** Scheduled scaling to 39 tasks the evening before the sale week, target tracking on requests per
  target above that, and a load test at 3,000 rps a week earlier — including RDS Proxy and database CPU.

**Cost, as drivers, not prices:** Fargate vCPU and memory hours (scale down at night), RDS instance hours (Multi-AZ
doubles the instance), NAT gateway hours and data processed (VPC endpoints for S3, ECR and CloudWatch cut it), and
CloudFront requests. "I'd price these in the AWS Pricing Calculator for the 6-task baseline and the 39-task week,
and put a Savings Plan on the baseline only."

## How it is scored

| Area | Weight | Full marks when |
|---|---|---|
| Requirements | 15% | asks before drawing; writes the numbers down |
| Quantitative reasoning | 20% | capacity and availability worked out aloud, AZ loss included |
| Architecture | 25% | each request path drawn; state and failure handled |
| Trade-offs | 25% | every major choice has a reason and a stated cost |
| Operability and cost | 15% | scaling plan, monitoring, cost drivers, DR stated honestly |

**Ways to lose:** drawing before asking; Kubernetes, Kafka and three regions for four engineers; no numbers; "it's
highly available" with no AZ arithmetic; defending a choice with "it's best practice"; never mentioning what it
costs; being thrown by a challenge instead of saying "that's a fair trade-off — here is what changes if we do it."`,
    workedExample: `**Interviewer (deep dive): "Our CTO wants active-active across Mumbai and Hyderabad. Change your design."**

**Answered badly.** "Sure — I'd deploy the same stack in ap-south-2, use Route 53 latency routing, and turn on
cross-region replication for the database. Then we can lose a whole region."

Why it fails: it agrees without asking what problem active-active solves, and "cross-region replication" hides the
hard part. A booking system with "no double-booked seats" cannot let two regions sell the same seat independently;
an asynchronous replica in the other region is read-only until promoted, so writes still go to one region.

**Answered well.** "Before changing it, what are we protecting against? The 99.9% target allows 43 minutes a month.
Multi-AZ already covers a data-centre failure; a full regional outage is rarer, and our stated DR — backups copied to
Hyderabad, restore in hours — is the cheap answer to that.

If the business needs minutes, not hours, I'd first propose **warm standby**: the stack running small in ap-south-2,
the database replicated there (an Aurora global database or a cross-region read replica), and a rehearsed, manual
failover that promotes it. That gives an RTO in minutes and an RPO of seconds of replication lag, at the cost of a
second, smaller environment.

True **active-active** means both regions take bookings. For seats that needs either partitioning — each route's
inventory owned by one region — or a store that handles multi-region writes with conflict rules, and our 'never
double-book' rule makes last-writer-wins unacceptable. It roughly doubles running cost and adds a class of bugs a
four-person team will struggle with. I'd ask what an hour of downtime in sale week costs; if it is more than a second
region, warm standby is the step; active-active is the step after that, with partitioned inventory."

Why it works: it asks for the requirement, quantifies the existing protection, offers a middle option with its RTO,
RPO and cost, and names the exact property — seat uniqueness — that makes the CTO's option expensive.`,
    mcqs: [
      mcq('A load test shows one bookings-api task serves 120 rps. For a 3,000 rps peak that must survive losing one of three AZs, how many tasks should run?', [
        ['39 — 13 per AZ, so any two AZs still carry 25 tasks', true],
        ['25 — the peak divided by one task\'s measured capacity', false],
        ['27 — nine per AZ, which is 25 rounded up to fill three AZs', false],
        ['75 — three full copies of the 25 tasks, one in each AZ', false],
      ], 'Peak needs 25 tasks; if any AZ can vanish, the remaining two must hold 25, so each needs ceil(25/2) = 13, giving 39. Twenty-five or twenty-seven leaves the service short when an AZ fails, and three full copies pays for far more than the requirement.'),
      mcq('Why did the SafarSeat design use RDS PostgreSQL Multi-AZ rather than a read replica to meet the availability target?', [
        ['A standby is failed over to automatically; a replica must be promoted', true],
        ['A read replica cannot be placed in a different AZ from its primary', false],
        ['Multi-AZ doubles read capacity, which the search path needs at peak', false],
        ['Read replicas are only supported on Aurora and not on RDS PostgreSQL', false],
      ], 'Multi-AZ keeps a synchronous standby that RDS fails over to on its own, which is what availability needs. Replicas can live in other AZs and exist for RDS PostgreSQL too, but they serve reads and need promotion; the classic Multi-AZ standby serves no reads.'),
      mcq('The interviewer asks "Why not just use EKS?" for a four-engineer team running ordinary HTTP services on AWS. Which reply defends ECS Fargate best?', [
        ['No control plane or nodes to upgrade; EKS pays off with many teams', true],
        ['ECS is always cheaper than EKS for every workload and every team size', false],
        ['EKS cannot run in ap-south-1, so data residency rules it out here', false],
        ['Fargate tasks start faster than any Kubernetes Pod could possibly start', false],
      ], 'The defence ties the choice to this team: fewer moving parts to operate, with the condition under which EKS would win. "Always cheaper" and "always faster" are not true in general, and EKS is available in Mumbai.'),
    ],
    checkpoint: [
      mcq('Three components in series each offer about 99.9%, 99.9% and 99.95%. What does the design candidate conclude?', [
        ['Together they give about 99.75%, below a 99.9% target', true],
        ['Together they give 99.95%, since the best component sets it', false],
        ['Together they give 99.9%, since that is their median figure', false],
        ['Availability cannot be estimated until the system is built', false],
      ], 'Serial availabilities multiply: 0.999 × 0.999 × 0.9995 ≈ 0.9975, about 108 minutes a month. The chain is weaker than its weakest link, so components must be better than the target or made redundant; a rough estimate is exactly what the round wants.'),
      mcq('SafarSeat must never sell the same seat twice. Which part of the design protects that rule most directly?', [
        ['A unique constraint on trip and seat for confirmed bookings, in a transaction', true],
        ['A Redis cache of seat maps with a 60-second TTL in front of the database', false],
        ['Running enough Fargate tasks that no booking request is ever queued', false],
        ['CloudFront caching the seat-map page so that users see one shared view', false],
      ], 'Correctness belongs in the database: the constraint makes a second confirmation of the same seat fail. A cache can serve stale seat maps, more tasks increase concurrency rather than prevent conflicts, and a cached page is a view, not a guard.'),
      mcq('Asked for the cost of the SafarSeat design, which answer scores best when prices are not to hand?', [
        ['The drivers — task hours, RDS hours, NAT data — priced in the calculator for each scale', true],
        ['A single monthly figure from memory, rounded so the panel has a number to hold', false],
        ['"It will be cheap because it is serverless", leaving the details for later work', false],
        ['"Costs are the finance team\'s concern", so the design does not discuss them', false],
      ], 'Naming what drives the bill, and how you would price it for the baseline and the peak, shows cost thinking that survives price changes. A remembered figure goes stale, "serverless is cheap" is not true at sustained load, and dismissing cost loses the operability marks.'),
    ],
  },

  /* ── IAC_TAKEHOME ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_SCENARIO_ROUNDS_IAC_TAKEHOME',
    notes: `Many DevOps loops — start-ups especially, and some GCC platform teams — send a take-home instead of, or before, a
live round: "Here is a small app. Deploy it with Terraform and a pipeline. 72 hours." A 30-minute debrief follows.
**Reviewers are testing whether they would merge your work: does it run from the README, is it safe, is it small and
clear, and can you explain each decision?** More submissions are rejected for a committed state file, an
over-privileged CI role or a README that does not work than for a missing feature.

You built every piece already in *Terraform Basics*, *State, Locking and Imports*, *Modules and Environments*,
*Terraform in a Pipeline* and *GitHub Actions to AWS with OIDC*. This unit is choosing which pieces, and presenting them.

## The brief

> Chai Orders (fictional, Bengaluru) gives you a container image of a FastAPI app: GET /healthz and POST /orders.
> Deploy it on AWS with Terraform. Add a pipeline that checks infrastructure changes on pull requests and applies
> them on merge. Write a README a reviewer can follow. We will read the code and may run it in a sandbox account.

## Scope first — write it in the README

ECS on Fargate behind an ALB in a VPC with two AZs, the image in ECR, logs in CloudWatch, one environment (dev). Say
what you **did not** build and why: no database (the brief has none), no custom domain or TLS certificate (needs a
domain the reviewer does not own; the README shows where it would go), no EKS (one service does not need it). A
small, finished, honest submission beats a large half-working one.

## The layout

    infra/
      versions.tf  providers, backend      network.tf  VPC module, security groups
      ecs.tf       cluster, service, task  alb.tf      load balancer, target group
      budget.tf    budget alarm            variables.tf, outputs.tf, dev.tfvars.example
      .terraform.lock.hcl   (committed)
    .github/workflows/infra.yaml
    bootstrap/  state bucket, OIDC provider and the two CI roles (run once, by hand, documented)
    README.md   DECISIONS.md

## The files reviewers open first (parsed with python-hcl2)

    terraform {
      required_version = ">= 1.10"
      required_providers {
        aws = {
          source  = "hashicorp/aws"
          version = "~> 6.0"
        }
      }
      backend "s3" {
        bucket       = "chaiops-tfstate-123456789012"
        key          = "takehome/dev/terraform.tfstate"
        region       = "ap-south-1"
        encrypt      = true
        use_lockfile = true
      }
    }

    provider "aws" {
      region = var.region
      default_tags {
        tags = {
          project = "chai-orders-takehome"
          owner   = var.owner_email
          managed = "terraform"
        }
      }
    }

Pinned versions, remote state with locking, every resource tagged so the reviewer can find and delete it. Then the
security groups — the only public door is HTTPS on the load balancer; the tasks accept traffic only from it:

    resource "aws_vpc_security_group_ingress_rule" "task_from_alb" {
      security_group_id            = aws_security_group.task.id
      referenced_security_group_id = aws_security_group.alb.id
      from_port                    = 8000
      to_port                      = 8000
      ip_protocol                  = "tcp"
    }

And a budget alarm in the code, not only in your own account: aws_budgets_budget with a monthly COST limit taken from
a variable and an e-mail notification at 50% of actual spend.

## The pipeline (abridged; the full file parsed with PyYAML, not run)

    on:
      pull_request:
        paths: ["infra/**"]
      push:
        branches: [main]
        paths: ["infra/**"]
    permissions:
      contents: read
      id-token: write
    concurrency:
      group: infra-dev
      cancel-in-progress: false
    jobs:
      plan:     # fmt -check, init, validate, plan, as role gha-takehome-plan
      apply:    # only on push to main, environment "dev" with a required reviewer,
                # as role gha-takehome-apply

Two roles through OIDC, no stored keys: the plan role can read resources and the state, the apply role can change
them, and its trust policy allows only the main branch's dev environment. concurrency stops two applies racing for
the lock. Say in DECISIONS.md the trade-off you took: apply re-plans after merge instead of applying the saved PR
plan, which a real team would close by storing the plan as an artefact.

## The README a reviewer can follow

1. **Cost and safety** — what it creates, that it is outside the free tier in parts (ALB, NAT), the budget alarm,
   and "run the destroy step the same day".
2. **Prerequisites** — Terraform version, an AWS profile, a region.
3. **Bootstrap** — one command block, run once.
4. **Deploy** — copy dev.tfvars.example, init, plan, apply; the output prints the ALB URL.
5. **Check** — curl the /healthz URL and post one order; what a good response looks like.
6. **Destroy** — terraform destroy, then the bootstrap's teardown; what to check is gone.
7. **Decisions and next steps** — a link to DECISIONS.md.

## What gets a submission rejected

    provider "aws" {
      region     = "ap-south-1"
      access_key = "AKIAEXAMPLEEXAMPLE00"
      secret_key = "not-a-real-secret-do-not-use"
    }
    resource "aws_security_group" "app" {
      name = "app"
      ingress {
        from_port   = 22
        to_port     = 22
        protocol    = "tcp"
        cidr_blocks = ["0.0.0.0/0"]      # SSH open to the whole internet
      }
    }

Keys in code (even "removed later" — Git history keeps them), SSH open to the internet on a service that needs no SSH,
terraform.tfstate or .terraform/ committed, AdministratorAccess on the CI role, a hard-coded account id, no destroy
instructions, and a README written from memory rather than tested from a fresh clone.

## How it is scored

| Area | Weight | Full marks when |
|---|---|---|
| Runs from the README | 25% | a fresh clone deploys and destroys with the steps as written |
| Security | 25% | no secrets, least-privilege roles via OIDC, only the intended port public |
| Terraform quality | 20% | pinned, formatted, validated, remote state, small readable files |
| Pipeline | 15% | plan on PR, gated apply on merge, no stored credentials, no races |
| Decisions | 15% | scope and trade-offs written down and defended in the debrief |`,
    workedExample: `**The debrief. Reviewer: "Your apply role — what can it do, and why?"**

**Answered badly.** "It has AdministratorAccess. Terraform needs to create lots of different resources and I didn't
want the pipeline to fail on permissions, so admin was the safe choice for a take-home."

Why it fails: "safe" is the wrong word — any workflow on any branch that can assume the role could do anything in
the account. The reviewer hears "I'd do this at work too."

**Answered well.** "Two roles. The plan role has ReadOnlyAccess plus read on the state bucket key and read-write on
the .tflock key, because planning takes the lock; its trust policy accepts any pull request in this repository. The
apply role can manage only what this stack creates — ECS, the ALB, the VPC pieces, ECR, CloudWatch Logs and the
budget — scoped by the project tag where the service supports it, plus iam:PassRole for the task's two roles only.
Its trust policy's sub condition is repo:owner/chai-orders:environment:dev, and that environment requires my
approval, so a pull request from a fork can never reach it. I started from a broad policy, ran an apply, and
narrowed it using the CloudTrail events from that run. Where I stopped short: the VPC actions are still account-wide,
and I wrote that in DECISIONS.md."

**Reviewer:** "Two pull requests merge a minute apart. What happens?"

"The concurrency group queues the second apply behind the first, and the S3 lock would stop two applies anyway — the
second would fail on 'Error acquiring the state lock' rather than corrupt state. The second run re-plans after the
first has finished, so it applies against the state the first one left."

**Reviewer:** "How did you test the README?"

"Fresh clone in a new directory, a profile with no cached state, every command pasted from the README, then destroy
and a check in the console that the tagged resources were gone. Two steps were wrong the first time; I fixed them."

Why it works: each answer names the exact mechanism, admits the remaining gap in writing, and shows the work was
tested the way the reviewer will test it.`,
    mcqs: [
      mcq('A Chai Orders take-home deploys one container to ECS behind an ALB. Which scope note in the README helps the submission most?', [
        ['What was left out — no database, no TLS domain — and why', true],
        ['A list of extra services added to show range, such as EKS', false],
        ['A promise that missing features will be added after an offer', false],
        ['Nothing on scope, since reviewers can infer it from the code', false],
      ], 'Reviewers grade a finished, honest submission; stating what was left out and why shows judgement about scope. Extra services add risk without matching the brief, and promises or silence leave the reviewer guessing.'),
      mcq('Why should .terraform.lock.hcl be committed in the take-home while .terraform/ and terraform.tfstate are not?', [
        ['The lock file pins provider versions; the others are local cache and state', true],
        ['The lock file holds the state lock, so CI needs it to block any other applies', false],
        ['All three are needed for a reviewer to run plan without using init at all', false],
        ['The lock file stores the AWS credentials that the pipeline uses to apply', false],
      ], 'The dependency lock file records exact provider versions and hashes so every init gets the same providers. The state lock lives beside the state in S3, .terraform/ is a download cache, and state can hold secrets and belongs only in the backend.'),
      mcq('The pipeline runs "plan" on pull requests and "apply" on pushes to main. What does its concurrency group add?', [
        ['A second apply waits for the first instead of racing it for the lock', true],
        ['Plan and apply run in parallel jobs, which halves the pipeline\'s time', false],
        ['It cancels every in-progress apply as soon as another commit arrives', false],
        ['It lets each pull request use its own copy of the dev state file safely', false],
      ], 'With cancel-in-progress false, runs in the group queue, so a later apply starts after the earlier one finishes. Cancelling an apply mid-way is dangerous, and every run shares one state; the group does not create copies.'),
    ],
    checkpoint: [
      ck('INFRA_AS_CODE', 'A take-home\'s CI apply role has AdministratorAccess "so the pipeline never fails". What should replace it?', [
        ['A role scoped to the stack\'s services, trusted only from the dev environment', true],
        ['A long-lived access key for an IAM user with the very same admin policy attached', false],
        ['AdministratorAccess kept, with the role name changed to look more limited', false],
        ['The reviewer\'s own credentials, pasted into a repository secret before use', false],
      ], 'Least privilege plus a trust condition on the environment limits what a compromised workflow can do and who can reach the role. An IAM user key is worse than OIDC, a new name changes nothing, and asking for a reviewer\'s credentials is a red flag.'),
      ck('INFRA_AS_CODE', 'A reviewer finds an access key in an early commit, removed in a later one. What is the right response?', [
        ['Treat it as leaked: deactivate the key, then rewrite or recreate the repository', true],
        ['Nothing further, because the latest commit no longer contains the key at all', false],
        ['Make the repository private, which removes the key from every existing clone', false],
        ['Add the key\'s file name to .gitignore so that future commits leave it out', false],
      ], 'Git history keeps the key, and anyone who cloned it still has it, so it must be revoked first. Making the repository private does not reach existing clones, and .gitignore only affects untracked files.'),
      ck('INFRA_AS_CODE', 'How should a candidate show the take-home\'s README works before submitting?', [
        ['Run every step from a fresh clone, including destroy, and fix what fails', true],
        ['Re-read the README carefully against the code in the same working copy', false],
        ['Ask a friend to read the README closely and say whether it sounds complete', false],
        ['Paste the README into a linter that checks the Markdown formatting', false],
      ], 'Reviewers run it from a clean clone, so only that test catches missing steps, local leftovers and cached state. Reading or linting checks the words, not whether the commands work.'),
    ],
  },

  /* ── INCIDENT_ROUND ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_SCENARIO_ROUNDS_INCIDENT_ROUND',
    notes: `SRE and on-call-heavy DevOps loops often include a round where the interviewer plays an outage, inject by inject:
"You're paged. Here is the dashboard. What do you do?" It runs 30–40 minutes and ends with "Now describe the
postmortem." **The interviewer is testing decisions and communication under pressure — impact first, mitigation
before root cause, roles, updates — far more than whether you find the bug.** A candidate who finds the cause but
never tells anyone, or debugs while the site is down, scores below one who rolls back in minute three and writes a
clear update.

The parts are in *On-Call, Incidents and Blameless Postmortems*, *SLIs, SLOs and Error Budgets* and *Reliability
Patterns and Capacity*. Here they are played live.

## A full round

**Inject 1.** "You're the primary on-call for UtsavMart, a fictional Kolkata festival e-commerce site, on the first
night of its Puja sale. 20:04 IST: page — CheckoutBudgetFastBurn. The dashboard shows checkout errors at 9% and p99
latency at 4 seconds. Go."

**Candidate:** "Acknowledge the page. Impact first: checkout is the money path, 9% failing on a sale night — that
is SEV1 by impact. I declare: open the incident channel, start the call, and say 'I'm IC until someone takes it'.
I page the secondary as ops lead and ask for a comms lead from support. Then: what changed? Deploys, config, flags,
traffic, dependencies."

**Inject 2.** "No deploy since 17:00. Traffic is 2,400 checkouts a minute, as forecast. RDS shows CPU 98% and
connections at the maximum. A feature flag, 'recommended-for-you on the cart page', was switched on by marketing at
19:55."

**Candidate:** "The flag is the change closest in time and touches the cart, which checkout reads. Saturated
database CPU fits a new expensive query. Mitigation before proof: turn the flag off now — it is reversible in
seconds and costs only a widget. Prediction: database CPU falls within a few minutes and errors with it. I'd ask the
ops lead to pull the top queries from Performance Insights while we wait, so we have the evidence anyway."

**Inject 3.** "20:16: flag off. Errors fall to 2%, CPU to 80%, but connections stay at the maximum."

**Candidate:** "Better, not resolved. Connections pinned after the load dropped suggests clients are retrying hard
— every failed checkout retried immediately, perhaps by the app and the mobile client both. I'd check the retry
counts in the app metrics. Options, safest first: shed non-critical load — pause the recommendations and reporting
jobs that share the database; lower the app's retry count and add jitter by config if we have the switch; scale
tasks *down* if each one holds a pool, not up. I would not fail over the database: the standby inherits the same
load, and the failover itself would add an outage."

**Inject 4.** "20:31: retries capped by config. Errors 0.1%, connections normal. The business head joins: 'When was
it fixed? Do we extend the sale by an hour?'"

**Candidate:** "Errors are inside the SLO now; I'd keep the incident open for 15 minutes of stable numbers before
declaring it resolved. To the business head, through comms: impact, cause as currently understood, and that the
decision to extend is theirs — I'd give the data: about 27 minutes of degraded checkout."

    20:35 IST  SEV1 checkout. Impact: 9% of checkouts failed 20:02-20:16, about 2% until 20:31;
    now normal. Cause (initial): a new cart-page widget overloaded the database; turned off.
    Next update 20:50, or sooner.

**The numbers (checked in Python).** At 2,400 checkouts a minute: 14 minutes at 9% is 3,024 failures, and 15
minutes at 2% is 720 — **3,744 failed checkouts**. With a 99.9% monthly SLO on 18 million checkouts, the budget is
18,000 failures, so the incident spent **about 20.8% of the month's error budget** in half an hour.

**Inject 5.** "Describe the postmortem."

**Candidate:** "Blameless, within five working days. Summary; impact with the numbers above; timeline from the
scribe; contributing factors, several — a flag that could add database load with no review or load test, retries
without a cap or jitter, no per-flag kill-switch alarm, a sale night with no change freeze for flags. Not 'marketing
switched it on'. Then three to five actions, each with an owner, priority and date: flags that touch the money path
go through the same review as code; retry limits and jitter in the client library; an alert on database
connections at 80%; a flag-freeze window for sale nights. Reviewed weekly until closed."

## How it is scored

| Area | Weight | Full marks when |
|---|---|---|
| Triage and severity | 20% | impact measured first; severity by impact; incident declared |
| Mitigation | 25% | the reversible change closest to the symptom, before root cause |
| Reasoning | 20% | each step tied to a signal; predictions stated; partial recovery noticed |
| Communication | 20% | roles named; timed updates with impact, action, next update |
| Postmortem | 15% | blameless, quantified, few owned actions across prevent, detect, mitigate |

**Ways to lose:** debugging silently while checkout fails; "let's find the root cause first"; failing over or
restarting the database as a reflex; declaring resolved the moment the graph dips; answering the business head with
internal jargon or guesses; a postmortem that names a person or ends with "be more careful".`,
    workedExample: `**Inject 3, played differently. The VP of engineering joins the call: "Connections are maxed. Just fail the RDS
instance over to the standby — that gives us a fresh database."**

**Answered badly.** "Good idea, failing over now." *(Two minutes later checkout is fully down during the failover,
and when the standby comes up the same retry storm fills its connections.)*

Why it fails: it takes an instruction without testing it against the evidence. A Multi-AZ failover moves the same
workload to a copy of the same database; the cause — retries holding connections — moves with it, and the failover
adds a short total outage on top.

**Answered well.** "I understand the instinct, and I'd keep it as an option. But the standby would receive exactly
the same traffic: connections are maxed because clients are retrying, not because the instance is broken — CPU is
80%, not failing, and the database reports no errors of its own. A failover would add one to two minutes of total
checkout outage and leave us where we are.

What I propose instead, in order: cap retries by config — the ops lead says it is a single parameter, two minutes to
roll out; pause the reporting job that holds twenty connections; and if connections are still pinned in five minutes,
reduce the number of tasks so fewer pools compete. If none of that works, the database itself is the next suspect and
failover becomes reasonable. As IC I'm deciding the retry cap now; I'll report back at 20:30."

**Interviewer:** "And if the VP insists?"

"Then the VP is overriding the IC, which is allowed, and I record it in the timeline with the reason. I say once,
clearly, what I expect to happen, and I make sure the retry cap still goes out, because it is needed either way."

Why it works: it engages with the suggestion, tests it against named signals, offers a faster reversible option
with a time-box, keeps the IC role steering, and handles disagreement without either caving or arguing.`,
    mcqs: [
      mcq('At 20:04 the UtsavMart page shows checkout errors at 9% on a sale night. What should the on-call engineer do before investigating causes?', [
        ['Acknowledge, measure impact, declare SEV1 and name the roles', true],
        ['Read the checkout service\'s logs to find the failing code line', false],
        ['Restart every checkout task to clear any bad in-memory state', false],
        ['Wait ten minutes to see whether the error rate settles alone', false],
      ], 'Impact on the money path decides the severity, and declaring brings in help and communication. Reading logs first leaves nobody steering, restarting is a change with no evidence behind it, and waiting during a sale burns the error budget.'),
      mcq('After the recommendations flag is turned off, errors fall to 2% but RDS connections stay at the maximum. Which reading is most likely?', [
        ['Clients are retrying failed checkouts and holding connections', true],
        ['The flag did not really switch off and the widget still runs queries', false],
        ['The RDS instance hardware has failed and needs replacing now', false],
        ['Traffic has doubled since the flag was turned off at 20:16', false],
      ], 'Load dropped but connections did not, which fits aggressive retries keeping pools busy. Inject 2 said traffic was as forecast, a hardware fault would show database errors rather than 80% CPU, and the falling CPU shows the flag change took effect.'),
      mcq('Which update to the UtsavMart business head is best during the incident?', [
        ['Impact in numbers, what was done, current state, the next update time', true],
        ['The PromQL queries used and Performance Insights graphs, unfiltered', false],
        ['"Engineers are on it", with details held back until the postmortem', false],
        ['The name of the person who switched the flag on and their team', false],
      ], 'Business leaders need impact, action and when they will hear next, in their words, to make decisions such as extending the sale. Raw queries are not usable by them, "on it" gives nothing to act on, and naming a person breaks blamelessness.'),
    ],
    checkpoint: [
      ck('INCIDENT_MANAGEMENT', 'At 2,400 checkouts a minute, 14 minutes at 9% and 15 minutes at 2% errors fail how many checkouts, and what share of an 18,000-failure monthly budget is that?', [
        ['3,744 failures, about 20.8% of the monthly error budget', true],
        ['6,264 failures, about 34.8% of the monthly error budget', false],
        ['3,024 failures, about 16.8% of the monthly error budget', false],
        ['1,914 failures, about 10.6% of the monthly error budget', false],
      ], '14 × 2,400 × 0.09 = 3,024 and 15 × 2,400 × 0.02 = 720, so 3,744; divided by 18,000 that is 20.8%. 3,024 counts only the first phase, and 6,264 applies 9% to all 29 minutes.'),
      ck('INCIDENT_MANAGEMENT', 'Why does the model postmortem list "a flag that could add database load with no review" rather than "marketing switched it on"?', [
        ['Blameless analysis fixes what made the action easy and unsafe', true],
        ['Marketing staff cannot be named in an engineering postmortem', false],
        ['The flag change was later found to play no part in the outage', false],
        ['Contributing factors must only describe software, not process', false],
      ], 'Asking what let a risky change reach the money path unreviewed produces actions that stop the next person too. Naming is not banned, the flag was a real cause, and process gaps are valid contributing factors.'),
      ck('INCIDENT_MANAGEMENT', 'Errors fall back to 0.1% at 20:31, inside the SLO. When should the IC declare the incident resolved?', [
        ['After a stated stable period, such as 15 minutes, on the dashboard', true],
        ['Immediately, since the error rate is already inside the SLO again', false],
        ['Only once the root cause is proven and a permanent fix deployed', false],
        ['At the end of the sale night, when traffic has fallen back to normal', false],
      ], 'A dip can be temporary, so a short confirmed stable window avoids declaring and reopening. Root-cause work continues after resolution in the postmortem, and waiting for the sale to end keeps people in incident mode with no reason.'),
    ],
  },

  /* ── TIMED_SCENARIOS ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_SCENARIO_ROUNDS_TIMED_SCENARIOS',
    notes: `Three scenario questions, **15 minutes each**, run like the real round. Ask a friend to read the prompt and answer
your questions with the facts given here and nothing more. Say your method first, then the checks or design, then
the decision and what would change it. Compare with the model answer and score yourself on the rubric. All
companies and accounts are fictional.

## Scenario A — "The Lambda that stopped reaching the payment provider" (troubleshooting)

**Prompt.** "KiranaKart's refund function worked yesterday. This morning a developer attached it to the VPC so it
could reach the RDS database. Now every invocation times out after 30 seconds. Walk me through it."

**Facts to give when asked.** The function's logs show the database query succeeds, then nothing until the timeout.
The next call in the code is HTTPS to the payment provider's public API. The function was placed in the VPC's
**public** subnets. Those subnets route 0.0.0.0/0 to an internet gateway; the private subnets route it to a NAT
gateway.

**Model answer.**
1. **Scope and change:** every call, since the VPC attachment — the change is the suspect.
2. **Where it stops:** the database step completes, so the VPC, subnets and security group work for RDS. It hangs
   on the outbound HTTPS call — a timeout, not a refusal, which points to the network path, not the provider.
3. **Why:** a Lambda function in a VPC uses network interfaces with private addresses only; they never get public
   IPs, even in a public subnet, so a route to the internet gateway does not help.
4. **Fix:** attach the function to the **private** subnets, whose default route goes through the NAT gateway, and
   allow outbound 443 in its security group. For AWS services it calls (S3, Secrets Manager), add VPC endpoints.
5. **Prevent:** a deployment test that calls the provider's sandbox; the function's timeout set below the API
   client's so the error names the hop instead of a bare timeout.

## Scenario B — "Lab reports from patients" (design)

**Prompt.** "Arogya Labs, a Hyderabad diagnostics chain, wants patients to upload prescription scans (up to 20 MB)
and download their lab reports from the app. Health data must stay in India. Design the storage path."

**Model answer.**
1. **Requirements asked:** volumes, retention period, who may read a report, audit needs.
2. **Upload:** the API checks the patient's session and returns a **presigned POST** for a private S3 bucket in
   ap-south-1 — with a content-length-range condition capping 20 MB and a fixed key prefix per patient — so the
   file goes straight to S3, not through the API servers.
3. **Bucket:** Block Public Access on, SSE-KMS with a customer-managed key, versioning, a bucket policy denying
   non-TLS requests, a lifecycle rule moving old reports to a cheaper class after the retention discussion.
4. **Processing:** an S3 event to SQS, a worker that scans the file and records it in the database; failures go to
   a dead-letter queue.
5. **Download:** short-lived presigned GETs issued only after the API checks that this patient owns the report;
   CloudTrail data events on the bucket for an audit trail.
6. **Residency and law:** ap-south-1 only, backups to ap-south-2; the DPDP Act's consent and breach duties noted
   for the legal team.

## Scenario C — "The plan wants to replace production" (infrastructure as code)

**Prompt.** "A pull request tidies names in Chai Orders' Terraform. The CI plan for prod shows:

    # aws_db_instance.main will be destroyed
    # aws_db_instance.orders will be created
    Plan: 1 to add, 0 to change, 1 to destroy.

The author says 'I only renamed it.' What do you do?"

**Model answer.**
1. **Stop:** request changes; nobody applies this.
2. **Explain:** Terraform tracks objects by address. Renaming main to orders in code, with nothing else, means "the
   object at main is no longer wanted, and a new one at orders is" — destroy and create.
3. **Fix:** add a moved block so state is re-addressed without touching the database:

       moved {
         from = aws_db_instance.main
         to   = aws_db_instance.orders
       }

   The new plan should show no destroy (the move is listed as a move).
4. **Prevent:** prevent_destroy in the database's lifecycle and deletion_protection on the instance, so a mistaken
   apply fails; a CI rule that fails any prod plan containing a destroy unless a label approves it.

## Rubric (each scenario, out of 20)

| Area | Points | Full marks when |
|---|---|---|
| Method and structure | 5 | steps named and in a sensible order |
| Technical accuracy | 5 | the mechanism explained correctly, not just the fix |
| Decision and safety | 5 | the safe change chosen; risky actions stopped or avoided |
| Prevention and communication | 5 | how it is stopped from recurring, and who is told |

40 or more across the three is a pass for most junior rounds; 50 or more is strong. A score below 3 in any area shows
what to practise next — most often *Technical accuracy*, where answers name the fix without the reason.`,
    mcqs: [
      mcq('In Scenario A, why does moving the Lambda function from the public subnets to the private ones fix the timeout?', [
        ['A VPC Lambda gets no public IP, so it needs the private subnets\' NAT route', true],
        ['Private subnets have lower latency to the payment provider than public ones', false],
        ['Public subnets block outbound port 443 by default, while private ones allow it', false],
        ['Lambda functions cannot be attached to public subnets, so the attach failed', false],
      ], 'Lambda\'s network interfaces in a VPC have only private addresses, so a route to an internet gateway is useless to them; a NAT gateway translates their traffic. Subnets do not block ports by default, latency is not the issue, and the attachment itself succeeded.'),
      mcq('In Scenario A, the log shows the database query succeeding before the hang. What does that rule out?', [
        ['The VPC attachment and security group for the RDS path', true],
        ['Any network problem at all, so the provider must be down', false],
        ['The payment provider\'s API as a possible cause of delay', false],
        ['The function\'s IAM role, since it allowed the outbound call', false],
      ], 'The successful query shows the function runs in the VPC and reaches RDS, so the fault is on the path out to the internet. It does not prove the internet path works, IAM does not govern outbound HTTPS, and the provider is not yet ruled in or out.'),
      mcq('In Scenario B, why does the design hand the app a presigned POST rather than streaming uploads through the API?', [
        ['Files go straight to S3, and the POST policy can cap size and fix the key', true],
        ['Presigned POSTs encrypt files with a key that AWS cannot itself decrypt', false],
        ['The API servers are not allowed to hold health data even for a moment', false],
        ['A presigned POST makes the bucket public for that patient only, briefly', false],
      ], 'Direct uploads keep large files off the API servers, and the POST policy\'s content-length-range and key prefix enforce the 20 MB limit and the location. The bucket stays private, encryption is SSE-KMS set on the bucket, and no rule forbids the API from handling data.'),
      mcq('In Scenario C, the plan shows aws_db_instance.main destroyed and aws_db_instance.orders created after a rename. What is the right fix?', [
        ['A moved block from main to orders, then a plan showing no destroy', true],
        ['Apply it at night when few customers are using the database', false],
        ['Run terraform refresh so the plan forgets the old address', false],
        ['Revert to main and ban renaming any Terraform resource again', false],
      ], 'A moved block tells Terraform the object at the old address is now at the new one, so state is re-addressed and the database is untouched. Applying at night still destroys it, refresh does not change addresses, and banning renames is unnecessary when moves exist.'),
      mcq('Rehearsing Scenario C, Arjun says "add a moved block" but cannot say why the plan wanted to destroy the database. Which rubric area loses most?', [
        ['Technical accuracy', true],
        ['Method and structure', false],
        ['Decision and safety', false],
        ['Prevention and communication', false],
      ], 'He has the fix but not the mechanism — that Terraform tracks objects by address — which is what Technical accuracy scores. His decision may still be safe and his steps ordered; the rubric separates the areas to show what to practise.'),
    ],
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_SCENARIO_ROUNDS_CHECKPOINT',
    notes: `Ten scenario questions across the topic: live troubleshooting, the design round, the Terraform-and-pipeline
take-home and the incident round. Answer each as you would aloud in the room: scope and evidence before action,
numbers before claims, the reversible change first, and say what would change your mind.`,
    checkpoint: [
      mcq('A shared-terminal round: kubectl get pods shows an api Pod in CrashLoopBackOff after a release. What is the first command a strong candidate runs and explains?', [
        ['kubectl logs --previous, to read what the crashed container said', true],
        ['kubectl delete pod, so a fresh copy starts without the stale state', false],
        ['kubectl scale to zero and back, to reset the deployment\'s Pods', false],
        ['kubectl edit to raise the memory limit before looking at anything', false],
      ], 'The previous container\'s output usually names the reason — a missing setting, a failed dependency, an OOM — and describe adds the exit code. Deleting or rescaling destroys evidence, and raising a limit is a fix without a diagnosis.'),
      mcq('During every deploy, an EKS service behind an ALB logs a short burst of ELB 502s, while target 5xx stays flat. Which explanation fits best?', [
        ['Pods leave before the ALB stops sending to them; a preStop delay fixes it', true],
        ['The new image has a bug that returns 500s for its first few requests', false],
        ['The ALB has no healthy targets for a moment, so it returns 502s', false],
        ['The node group is too small, so the scheduler drops some requests', false],
      ], 'ELB 502s with no target 5xx mean connections closed under the load balancer, which during a deploy is Pods terminating before deregistration completes. An app 500 would show as target 5xx, no healthy targets gives 503, and the scheduler does not handle requests.'),
      ck('CLOUD_COMPUTE', 'In a design round, a service must handle 1,800 rps across three AZs and survive losing one. One task serves 150 rps. How many tasks?', [
        ['18 — six per AZ, so two AZs still carry the 12 needed', true],
        ['12 — the load divided by one task\'s measured throughput', false],
        ['14 — twelve plus two spare tasks for headroom in general', false],
        ['36 — twelve tasks in each of the three AZs to be safe', false],
      ], '1,800 / 150 = 12 tasks; any two AZs must hold 12, so each needs 6, giving 18. Twelve fails when an AZ goes, two spare tasks do not cover a third of capacity, and 36 doubles the cost the requirement asks for.'),
      ck('CLOUD_COMPUTE', 'A design interviewer asks for 99.9% availability. Which statement shows the right arithmetic?', [
        ['About 43 minutes of downtime a month; serial parts multiply, so each must beat it', true],
        ['About 8.8 hours a month; parts in series average out to the weakest one\'s own figure', false],
        ['About 4 minutes a month; Multi-AZ alone guarantees the whole system reaches it', false],
        ['About 43 seconds a month; any component at 99.9% meets the target by itself', false],
      ], '0.1% of 30 days is 43.2 minutes, and components in series multiply their availabilities, so the chain is worse than each part. 8.8 hours is the 99.9% allowance over a whole year, 4 minutes a month is 99.99%, and no single feature guarantees a system target.'),
      ck('CLOUD_COMPUTE', 'Which answer to "Lambda or containers for a steady 3,000 rps API on PostgreSQL?" scores best in a design round?', [
        ['Containers with a pool, since sustained load and connections favour them; Lambda for events', true],
        ['Lambda for everything, since serverless is always the cheapest choice at any load level', false],
        ['Containers, because Lambda functions cannot connect to any relational database at all', false],
        ['Either one, since the choice of compute never changes the cost or the design itself', false],
      ], 'Steady high load and database connections are where containers with pooling are simpler and usually cheaper, while Lambda suits spiky or event-driven parts. Lambda can reach RDS (often via RDS Proxy), and the choice does change cost and design.'),
      ck('INFRA_AS_CODE', 'A take-home reviewer asks how the pipeline deploys to AWS. Which answer shows the expected practice?', [
        ['OIDC roles: read-only for plan on PRs, a scoped apply role for main\'s environment', true],
        ['An IAM user\'s access key in a repository secret, rotated once every quarter', false],
        ['The developer\'s own SSO session, pasted into the workflow before each run', false],
        ['One admin role for every job, so plans and applies never fail on permissions', false],
      ], 'Federation removes stored keys, and splitting plan and apply roles with a trust condition on the environment limits what each workflow can do. Stored user keys and pasted sessions leak, and one admin role gives every pull request full power.'),
      ck('INFRA_AS_CODE', 'A take-home submission\'s CI apply fails with "Error acquiring the state lock" while another run is applying. What does that show?', [
        ['The S3 lock is working: wait for the other run, never force-unlock it', true],
        ['The state file is corrupted and must be restored from a backup version', false],
        ['The backend is misconfigured; switch to local state for the take-home', false],
        ['The apply role lacks permissions and needs AdministratorAccess added', false],
      ], 'The lock is doing its job by stopping two writers; force-unlock is only for a holder that is confirmed dead. Nothing is corrupted, local state breaks shared runs, and the error is about the lock, not IAM.'),
      ck('INCIDENT_MANAGEMENT', 'Ten minutes into a SEV1 with a likely bad flag change, an engineer wants to read the code to prove the cause before acting. What should the IC decide?', [
        ['Turn the flag off now, and let the code reading go on in parallel', true],
        ['Wait for proof, since turning things off can confuse the evidence', false],
        ['Fail over the database first, since it is the slowest component', false],
        ['Escalate to the vendor, since flags are run by a third-party tool', false],
      ], 'A reversible change on the strongest suspect stops the damage; diagnosis continues alongside. Waiting extends the outage, a failover moves the same load to a copy, and the flag is the team\'s own switch to flip.'),
      ck('INCIDENT_MANAGEMENT', 'Which postmortem action list best follows the incident round\'s standard?', [
        ['Three owned, dated actions across prevent, detect and mitigate', true],
        ['Twelve actions covering every service, owned by "engineering"', false],
        ['One action: retrain the person who switched on the feature flag', false],
        ['A promise to be more careful with flags during future sale nights', false],
      ], 'Few, specific, owned and dated actions that change the system are the ones that get done. A long unowned list stalls, retraining one person is blame, and "be careful" changes nothing.'),
      ck('INCIDENT_MANAGEMENT', 'A business head joins the incident call and asks the ops lead debugging the database for an update. What should happen?', [
        ['The IC or comms lead answers, so the ops lead keeps working the fix', true],
        ['The ops lead stops and explains the full technical detail right away', false],
        ['Nobody replies until the incident is resolved, to avoid any distraction', false],
        ['The business head is removed from the call, since only engineers belong', false],
      ], 'Roles exist so responders are not interrupted: comms or the IC give impact, action and the next update time. Pulling the ops lead away slows mitigation, silence leaves leaders unable to decide, and stakeholders are entitled to updates.'),
    ],
  },
];
