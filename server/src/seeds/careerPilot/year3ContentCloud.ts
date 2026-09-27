/**
 * S16_CLOUD_DEVOPS — twenty-five units across six topics. Year 3, cloud track.
 *
 * ── THE OVERLAP IS HANDLED BY DEPTH, NOT BY REPETITION ────────────────────────────────────
 *
 * This track overlaps the universal core more heavily than any other: containers, deployment,
 * CI/CD, secrets, monitoring and least privilege all appeared in S09 and S10. A student here
 * has done all of them once.
 *
 * So each unit takes the core's idea and puts it somewhere with a bill attached. The core
 * taught what a container is; this one asks what an image fit for production looks like and
 * why it will not start when it reaches a real orchestrator. The core taught that everything
 * expires; this one puts a secret in an infrastructure where six services need it and one of
 * them is a build pipeline.
 *
 * WHAT_IT_COSTS has no counterpart in the core at all, and it is the unit that most surprises
 * students: cloud infrastructure is the first thing they will build where a mistake produces
 * an invoice, and a graduate who thinks about cost is unusual enough to be noticed.
 *
 * LEAST_ACCESS is the same argument as the authorization topic, arriving at infrastructure —
 * and it is where a wildcard permission granted "temporarily" becomes the finding in somebody's
 * breach report.
 *
 * Attribution: CLOUD_INFRA and CLOUD_CONTAINERS are single-skill and derived. CICD_MONITORING
 * defaults to CI_CD with the monitoring unit overridden. CLOUD_CONFIG defaults to DEPLOYMENT
 * with secrets on SECURE_CODING. CLOUD_SECURITY defaults to AUTHORIZATION with exposure on
 * SECURE_CODING. The project is all PRODUCTION_ENGINEERING.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const CLOUD_BUNDLES: PilotBundle[] = [
  /* ══ T3_CLOUD_INFRA ═════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_CLOUD_INFRA_COMPUTE_AND_STORAGE',
    notes: `Every cloud provider sells the same handful of things under different names.
**Learn the categories and the trade-offs, not the product names** — the names change, the
categories do not, and a graduate who can reason about the categories can work on any of them.

## Compute, in four shapes

**Virtual machines.** You get a machine. You patch it, you run what you like, you pay while it
exists whether it is busy or not. **Maximum control, maximum operational work.**

**Containers on a managed platform.** You give it an image; it runs and scales it. The middle
option, and where most modern applications sit.

**Serverless functions.** You give it a function; it runs on demand and you pay per
invocation. **Excellent for spiky, short work.** Bad for anything long-running, anything needing
a warm cache, or anything with a cold-start budget — and the cold start is the thing people
discover late.

**Managed services.** Somebody else runs the database, the queue, the cache. **Almost always
the right answer** for those, and the reasoning is the same as the dependency unit's: you are
not going to operate a database better than a team who does only that.

## Storage, in three shapes

**Object storage.** Files, by key. Cheap, effectively unlimited, and **not a filesystem** —
you cannot append, cannot rename cheaply, and listing is a paginated operation. Right for
uploads, backups, static assets, data lakes.

**Block storage.** A disk attached to a machine. Behaves like a disk, costs like a disk, and is
usually tied to one machine at a time.

**A managed database.** Structured data with queries. The data topics' subject.

**The mistake to avoid:** treating object storage like a filesystem. Code that lists a
directory of a million objects, or writes a log line at a time, works in development and is
both slow and expensive in production.

## Choosing

**Ask how it scales, what it costs when idle, and who operates it.**

- **Steady load, needs control** → virtual machines.
- **Variable load, standard web service** → managed containers.
- **Spiky, short, event-driven** → functions.
- **Anything a managed service exists for** → the managed service.

## Regions and zones

**A region is a geography. A zone is a failure domain within it.**

**Run across zones** for availability — it is usually cheap and it protects against the common
failure.

**Run across regions** only when you have a specific reason: legal data residency, latency to
users far away, or a disaster requirement. **It is expensive and it is complicated**, because
now you have data in two places and a consistency problem you did not have before.

**Put things near their users and near each other.** Cross-region traffic between your own
services is slow and it is billed.

## The graduate mistakes

**Over-provisioning.** Choosing a large instance because it is safer. **It is not safer, it is
more expensive**, and the number is on somebody's invoice each month.

**Leaving things running.** A test environment nobody shut down. **This is the commonest way a
student incurs a bill they did not expect**, and it is worth a calendar reminder from day one.

**Ignoring the free tier's boundaries.** They are real and they are exceeded quietly.

**Using a virtual machine for everything** because it is familiar — and inheriting patching,
monitoring and scaling that a managed option would have handled.`,
    mcqs: [
      mcq('Serverless functions are a poor fit for:',
        [['Long-running work, warm caches, and tight cold-start budgets', true],
          ['Spiky event-driven workloads', false],
          ['Short tasks with variable volume', false],
          ['Work that must scale to zero', false]],
        'The cold start is the thing people discover late.'),
      mcq('Object storage is not a filesystem, so you cannot:',
        [['Append, or rename cheaply, and listing is paginated', true],
          ['Store files larger than a gigabyte', false],
          ['Read a file more than once', false],
          ['Use it from more than one machine', false]],
        'Code that treats it as one is slow and expensive in production.'),
      mcq('A managed database is almost always right because:',
        [['You will not operate one better than a team who does only that', true],
          ['It is cheaper than running your own', false],
          ['It scales automatically in all cases', false],
          ['Self-hosting is no longer supported', false]],
        'The same reasoning as taking on a dependency.'),
      mcq('Running across regions rather than zones:',
        [['Is expensive and complicated, and needs a specific reason', true],
          ['Is the default for production systems', false],
          ['Protects against the common failure mode', false],
          ['Costs the same as multi-zone', false]],
        'Data in two places and a consistency problem you did not have before.'),
    ],
    checkpoint: [
      mcq('Choosing a larger instance than needed is:',
        [['More expensive, and not safer', true],
          ['A reasonable safety margin', false],
          ['Cheaper than scaling later', false],
          ['Standard practice for production', false]],
        'The number is on somebody’s invoice each month.'),
      mcq('The commonest way a student incurs an unexpected bill is:',
        [['Leaving a test environment running', true],
          ['Exceeding request quotas', false],
          ['Storing too much data', false],
          ['Cross-region data transfer', false]],
        'Worth a calendar reminder from day one.'),
      mcq('A zone is:',
        [['A failure domain within a region', true],
          ['A geographic area containing regions', false],
          ['A network boundary for security', false],
          ['A billing unit within an account', false]],
        'Running across zones is usually cheap and protects against the common failure.'),
    ],
  },

  {
    unitCode: 'T3_CLOUD_INFRA_CLOUD_NETWORKING',
    notes: `Networking is where cloud deployments fail, and the failures look like application
bugs. **A service that cannot reach its database produces a timeout, and the timeout looks
exactly like a slow query.**

## The pieces

**A private network** — your own address space. Everything you run lives in it.

**Subnets** — divisions of that space, usually **public** (reachable from the internet) and
**private** (not).

**The rule that matters:** put anything that does not need to be reachable in a private subnet.
**Databases, caches, internal services, workers. The list of things that genuinely need a public
address is short**, and it is usually just the load balancer.

**Security groups** — a firewall around a resource. Which ports, from where.

**A load balancer** — the public entry point, distributing to instances and doing health
checks.

## Least access, applied to the network

**A security group should allow the narrowest thing that works.**

Not "allow 0.0.0.0/0 on all ports" — which is what people do while debugging and then leave.

**Reference other security groups rather than addresses**: "allow 5432 from the application's
group" rather than from a range. It stays correct as instances come and go, and it documents
the intent.

**The database should accept connections only from the application**, never from the internet.
**A publicly reachable database is one of the most common serious cloud misconfigurations**,
and automated scanners find them within minutes.

## Why it fails, in order

**1. The security group.** The commonest cause by a distance. The port is not open from that
source.

**2. The subnet.** The service is in a private subnet with no route out, and it needs to reach
an external API.

**3. DNS.** The name does not resolve, or resolves to a private address from outside.

**4. The health check.** The load balancer thinks the instance is unhealthy and stops sending
traffic. **The instance is fine; the check is wrong** — pointing at the wrong port, or a path
that requires authentication.

**5. The application binding.** Listening on 127.0.0.1 rather than 0.0.0.0. **The Linux
topic's mistake, arriving with more layers to hide behind.**

## Diagnosing, from the inside out

**This order saves the most time:**

1. **On the machine: is the process listening, and on what address?**
2. **On the machine: can it reach the target?** A connection attempt to the database's host and
   port.
3. **From another machine in the same subnet: can it reach this one?**
4. **From outside: can it reach the load balancer?**
5. **Is the load balancer's health check passing?**

**Each step isolates one layer**, and starting at the outside means testing five things at
once.

## Egress, which people forget

**Outbound traffic needs a route too.** A service in a private subnet cannot reach an external
API without a gateway, and the symptom is a timeout on a call that works fine from your laptop.

**And outbound data is billed.** Traffic out of the cloud costs money; traffic in usually does
not. A service that returns large responses to many users has a bandwidth bill, and it is
frequently a surprise.`,
    mcqs: [
      mcq('The list of things that genuinely need a public address is:',
        [['Short, and usually just the load balancer', true],
          ['Every service that receives traffic', false],
          ['Anything that must be monitored', false],
          ['All stateless components', false]],
        'Databases, caches, internal services and workers go in a private subnet.'),
      mcq('Referencing another security group rather than an address range:',
        [['Stays correct as instances come and go, and documents the intent', true],
          ['Is faster to evaluate at the network layer', false],
          ['Allows broader access when needed', false],
          ['Is required for private subnets', false]],
        '"Allow 5432 from the application’s group".'),
      mcq('A load balancer marking a healthy instance unhealthy usually means:',
        [['The check is wrong — wrong port, or a path needing authentication', true],
          ['The instance is overloaded', false],
          ['The security group is too narrow', false],
          ['The subnet has no route out', false]],
        'The instance is fine; the check is not.'),
      mcq('Diagnosing from the inside out matters because:',
        [['Starting outside tests five layers at once', true],
          ['Internal tools are more reliable', false],
          ['External access is often blocked', false],
          ['The application logs are only local', false]],
        'Each step isolates one layer.'),
    ],
    checkpoint: [
      mcq('A publicly reachable database is:',
        [['One of the most common serious cloud misconfigurations', true],
          ['Acceptable with a strong password', false],
          ['Necessary for managed backups', false],
          ['Protected by the cloud provider by default anyway', false]],
        'Automated scanners find them within minutes.'),
      mcq('A service in a private subnet calling an external API needs:',
        [['A gateway for outbound traffic', true],
          ['A public IP address', false],
          ['A wider security group', false],
          ['A DNS entry in the private zone', false]],
        'The symptom is a timeout on a call that works from your laptop.'),
      mcq('Outbound data transfer is notable because:',
        [['Traffic out is billed and traffic in usually is not', true],
          ['It is slower than inbound', false],
          ['It requires a separate route table to be configured', false],
          ['It bypasses the load balancer', false]],
        'Large responses to many users produce a bandwidth bill, frequently a surprise.'),
    ],
  },

  {
    unitCode: 'T3_CLOUD_INFRA_WHAT_IT_COSTS',
    notes: `**Cloud infrastructure is the first thing you will build where a mistake produces
an invoice.** A graduate who thinks about cost is unusual enough to be noticed, and it takes
very little effort to be that person.

## What you are billed for

**Compute time.** Per second or per hour, whether the machine is busy or idle. **An idle
machine costs the same as a busy one**, which is the fact that surprises people most.

**Storage.** Per gigabyte per month. Cheap per unit and it accumulates, because nothing is ever
deleted.

**Data transfer.** Out of the cloud, and between regions. **Traffic in is usually free; traffic
out is not**, and this is the line item that appears from nowhere.

**Requests.** For object storage and functions, per operation. Millions of small operations
cost more than a few large ones, which affects how you write the code.

**Managed services.** A premium over running it yourself, in exchange for not running it
yourself. Usually worth it, and it is a real number rather than free.

## Where the surprises come from

**Things left running.** The test environment from three weeks ago. **The single commonest
cause of an unexpected bill**, and the fix is a schedule that shuts non-production down
overnight — which typically halves that spend immediately.

**Data transfer.** Serving large files, or chatty traffic between regions, or a backup copied
across the world nightly.

**Storage that only grows.** Logs with no retention. Old snapshots. Object versions never
cleaned up. **A lifecycle rule takes ten minutes and removes the whole class.**

**Over-provisioning.** Instances three times the size they need, chosen for safety.

**A loop.** A function triggering itself, or a retry with no limit. **The frontend topic's
infinite request loop, with a meter attached** — and this version can run up a serious bill in
hours.

## Controlling it

**Set a budget alert on day one.** Before deploying anything. **This single action prevents
the horror story**, and it takes two minutes.

**Tag everything** with the project and environment, so the bill can be attributed. An untagged
bill is a bill nobody can reduce, because nobody knows what any of it is for.

**Right-size after measuring.** Start small, watch utilisation, grow if needed. **The opposite
order is what everybody does.**

**Shut down non-production out of hours.** Nights and weekends is about two-thirds of the week.

**Lifecycle rules** on storage: move old data to cheaper tiers, delete what has expired.

**Use the cost explorer.** Every provider has one; almost no student opens it.

## Thinking about it while designing

**"How much will this cost at ten times the traffic?"** is a design question, and asking it
early is cheap.

- A design that stores every event forever has a storage cost that grows without bound.
- A design that calls a paid API per request has a cost proportional to traffic.
- A design that serves large files from your own compute rather than a CDN pays more and
  performs worse.

**None of these are wrong**, and all of them are choices that should be made knowingly rather
than discovered on an invoice.

## What to say in an interview

> "I put a budget alert on before I deployed anything, tagged resources by environment, and
> scheduled the staging environment to stop overnight. It runs at about £14 a month, and the
> largest line is the managed database, which I chose over self-hosting because operating one
> was not what I wanted to spend the project on."

**Almost no graduate can say anything like that**, and it demonstrates a kind of engineering
judgement that is hard to demonstrate any other way.`,
    mcqs: [
      mcq('The fact about compute that surprises people most is:',
        [['An idle machine costs the same as a busy one', true],
          ['Billing is per second rather than per hour', false],
          ['Larger instances cost disproportionately more', false],
          ['Stopped machines still incur charges', false]],
        'You pay while it exists, not while it works.'),
      mcq('The single action that prevents the horror story is:',
        [['A budget alert, set before deploying anything', true],
          ['Tagging every resource', false],
          ['Using the free tier only', false],
          ['Reviewing the bill monthly', false]],
        'Two minutes, on day one.'),
      mcq('An untagged bill is:',
        [['A bill nobody can reduce, because nothing is attributable', true],
          ['Harder to pay but not to understand', false],
          ['A compliance problem rather than a cost one', false],
          ['Only a problem across multiple teams', false]],
        'Tag by project and environment.'),
      mcq('A function triggering itself is:',
        [['The infinite request loop with a meter attached', true],
          ['Prevented by the platform automatically', false],
          ['Only a performance concern', false],
          ['Limited by the default concurrency', false]],
        'This version can run up a serious bill in hours.'),
    ],
    checkpoint: [
      mcq('Shutting non-production down overnight and at weekends saves roughly:',
        [['Two-thirds of that environment’s cost', true],
          ['A quarter of it', false],
          ['Half of it', false],
          ['Very little, since storage continues', false]],
        'Nights and weekends is about two-thirds of the week.'),
      mcq('Right-sizing should happen:',
        [['After measuring utilisation, starting small', true],
          ['Before deploying, based on estimates', false],
          ['Once the environment is under load', false],
          ['Only when the bill becomes noticeable', false]],
        'The opposite order is what everybody does.'),
      mcq('"How much will this cost at ten times the traffic?" is:',
        [['A design question worth asking early', true],
          ['A capacity planning question for later', false],
          ['Answerable only from the bill', false],
          ['A concern for the finance team', false]],
        'Cheap to ask, and it makes the choices knowing ones.'),
    ],
  },

  {
    unitCode: 'T3_CLOUD_INFRA_DEBUGGING',
    notes: `Five cloud infrastructure failures, and the order that resolves them fastest.

## 1. The service is unreachable

**Work inside out**, as the networking unit said. The order matters because each step isolates
one layer:

1. Is the process listening, and on which address?
2. Can the machine itself reach what it needs?
3. Can a neighbour in the same subnet reach it?
4. Can anything outside reach the load balancer?
5. Is the health check passing?

**Most of the time the answer is at step one or five**, and starting at the outside means
guessing among all five.

## 2. It works from my laptop and not from the service

**Cause:** your laptop has credentials, a route and a DNS view the service does not.

**The most common specific case:** the service has no outbound route, so an external API call
times out.

**Diagnosis:** try the same call from inside the environment, not from your machine. **This
distinguishes "the API is down" from "we cannot reach the API"**, and those are very different
problems.

## 3. Permission denied on a resource the service should have

**Cause:** the role attached to the service lacks the permission, or the resource's own policy
denies it, or a boundary further up restricts it.

**Diagnosis:** the provider's policy simulator, where one exists. Otherwise: read the exact
error — it usually names the action and the resource, which is most of the answer.

**Resist granting a wildcard to make it work.** That is how a broad permission becomes
permanent, and the security unit explains what it costs.

## 4. The bill is higher than expected

**Diagnosis:** the cost explorer, grouped by service, then by tag, then by day.

**Look for the step change.** Costs usually rise on a specific day, and something happened that
day.

**Common culprits:** something left running, data transfer, storage that only grows, a retry
loop.

## 5. It worked yesterday and nothing was deployed

**Causes:** a certificate expired; a credential rotated; a quota reached; the provider had an
incident; somebody changed something manually.

**That last one is worth checking early.** Every provider has an audit log of who changed what,
and a manual change made in a console at 5pm on Friday is a real and common cause.

**Check the provider's status page too** — before spending an hour on your own system.

## The habits that make this survivable

**Infrastructure as code.** If the environment is defined in files, you can diff it, review it
and rebuild it. **A manually built environment is one nobody can reason about**, which is the
Linux topic's hand-configured server at a larger scale.

**Tags on everything.** For cost, and for knowing what a resource is for.

**The audit log.** Know where it is before you need it.

**And an environment you can destroy and recreate.** If that is possible, most problems have a
last resort. If it is not, every problem is delicate.`,
    mcqs: [
      mcq('When a service is unreachable, most of the time the answer is:',
        [['At the binding or the health check', true],
          ['In the security group rules', false],
          ['In DNS resolution', false],
          ['In the subnet routing', false]],
        'Steps one and five of the inside-out sequence.'),
      mcq('Trying an external call from inside the environment distinguishes:',
        [['"The API is down" from "we cannot reach the API"', true],
          ['A timeout from a rejection', false],
          ['A DNS problem from a routing one', false],
          ['A credential problem from a network one', false]],
        'Very different problems, and your laptop cannot tell them apart.'),
      mcq('The exact permission error usually contains:',
        [['The action and the resource, which is most of the answer', true],
          ['The policy that denied it', false],
          ['The role that was assumed', false],
          ['The alternative permission needed', false]],
        'Read it before reaching for a simulator.'),
      mcq('When the bill rises, you should look for:',
        [['The step change, and what happened that day', true],
          ['The largest line item overall', false],
          ['The fastest-growing service', false],
          ['The untagged resources', false]],
        'Costs usually rise on a specific day.'),
    ],
    checkpoint: [
      mcq('A manual change made in a console:',
        [['Is a real and common cause, and the audit log records it', true],
          ['Is entirely prevented by infrastructure as code', false],
          ['Cannot be detected after the fact', false],
          ['Only matters in production accounts', false]],
        'Worth checking early, along with the provider’s status page.'),
      mcq('A manually built environment is:',
        [['One nobody can reason about — the hand-configured server at scale', true],
          ['Faster to create initially', false],
          ['Acceptable for non-production', false],
          ['Equivalent to code, provided it is documented well', false]],
        'Infrastructure as code makes it diffable, reviewable and rebuildable.'),
      mcq('An environment you can destroy and recreate means:',
        [['Most problems have a last resort', true],
          ['Backups are unnecessary', false],
          ['Deployments are faster', false],
          ['Costs are easier to control', false]],
        'If it is not possible, every problem is delicate.'),
    ],
  },

  {
    unitCode: 'T3_CLOUD_INFRA_PRACTICE',
    notes: `Two exercises on the reasoning: choosing a compute shape, and estimating what
something will cost. Neither needs an account, and both are the judgements that matter.`,
    coding: [
      {
        title: 'Which compute shape?',
        description: `Read one workload per line as
\`<duration_seconds> <requests_per_day> <needs_state> <spiky>\`, where needs_state and spiky
are \`yes\` or \`no\`.

Print the recommendation, checking in this order:

- duration_seconds above 300 → \`virtual_machine\`
- needs_state \`yes\` → \`virtual_machine\`
- spiky \`yes\` and requests_per_day below 100000 → \`serverless\`
- otherwise → \`managed_containers\`

Then a final line \`serverless=<n>\`.

Long-running and stateful both rule out functions, whatever the traffic looks like — which is
the point of the ordering.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# Duration and state rule out serverless before the traffic shape is considered.
`,
        language: 'python',
        tests: [
          { input: '2 5000 no yes\n', expectedOutput: 'serverless\nserverless=1' },
          { input: '600 5000 no yes\n', expectedOutput: 'virtual_machine\nserverless=0' },
          { input: '2 5000 yes yes\n', expectedOutput: 'virtual_machine\nserverless=0' },
          { input: '2 900000 no yes\n', expectedOutput: 'managed_containers\nserverless=0' },
          { input: '2 5000 no no\n', expectedOutput: 'managed_containers\nserverless=0' },
          { input: '', expectedOutput: 'serverless=0', isHidden: true },
          { input: '301 10 no no\n', expectedOutput: 'virtual_machine\nserverless=0', isHidden: true },
        ],
      },
      {
        title: 'Estimate the monthly bill',
        description: `Read four lines:

    <instances> <hourly_rate_pence>
    <storage_gb> <per_gb_month_pence>
    <egress_gb> <per_gb_pence>
    <hours_per_day>

Compute a 30-day month. Instances run for \`hours_per_day\` hours each day.

Print four lines, each in whole pence, rounding down:

    compute=<pence>
    storage=<pence>
    egress=<pence>
    total=<pence>

Then a final line \`saving_if_8h=<pence>\` — how much the **compute** line would fall if the
instances ran 8 hours a day instead. If they already run 8 or fewer, the saving is 0.`,
        starter: `import sys

lines = [l.split() for l in sys.stdin if l.split()]
instances, rate = int(lines[0][0]), int(lines[0][1])
storage_gb, storage_rate = int(lines[1][0]), int(lines[1][1])
egress_gb, egress_rate = int(lines[2][0]), int(lines[2][1])
hours = int(lines[3][0])

# Thirty days. The saving line is the non-production shutdown, quantified.
`,
        language: 'python',
        tests: [
          { input: '2 10\n100 2\n50 9\n24\n', expectedOutput: 'compute=14400\nstorage=200\negress=450\ntotal=15050\nsaving_if_8h=9600' },
          { input: '1 10\n0 2\n0 9\n8\n', expectedOutput: 'compute=2400\nstorage=0\negress=0\ntotal=2400\nsaving_if_8h=0' },
          { input: '1 10\n0 2\n0 9\n4\n', expectedOutput: 'compute=1200\nstorage=0\negress=0\ntotal=1200\nsaving_if_8h=0' },
          { input: '0 100\n10 5\n1 100\n24\n', expectedOutput: 'compute=0\nstorage=50\negress=100\ntotal=150\nsaving_if_8h=0', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Cloud Infrastructure Practice',
      description: 'Choose compute shapes, estimate a bill, then build and cost something real.',
      instructions: `Complete both exercises, then:

1. For the first: give a workload that is short, stateless and spiky but for which serverless
   is still the wrong answer, and say why.
2. For the first: the threshold of 300 seconds is arbitrary. Say what actually determines it
   and how you would find the real number for a given platform.
3. For the second: the saving line quantifies shutting non-production down. Say what else
   would need to be true for that saving to be real.

**Then, on a real cloud account.** A free tier is fine.

4. **Set a budget alert before creating anything.** Show it.
5. Deploy a small service. Put it behind a load balancer, with the instance in a private
   subnet.
6. **Show that the instance is not reachable directly from the internet**, and that the service
   is reachable through the balancer.
7. Add a managed database in a private subnet. Show that only the application's security group
   can reach it.
8. Break it deliberately: remove the security group rule. Work the inside-out sequence and
   report which step found it.
9. Tag everything by project and environment. Show the cost explorer grouped by tag.
10. Estimate the monthly cost from the pricing pages before looking at the bill. Then compare
    with what it actually shows. Report both and explain any gap.
11. **Destroy everything.** Show the account is clean.`,
      rubric: [
        { criterion: 'Compute shapes chosen', description: 'All cases, with duration and state taking precedence.', maxPoints: 15 },
        { criterion: 'The bill estimated', description: 'All four lines and the saving, including the zero cases.', maxPoints: 15 },
        { criterion: 'A budget alert first', description: 'Set before anything was created, and shown.', maxPoints: 15 },
        { criterion: 'Private by default', description: 'Instance and database unreachable directly, service reachable through the balancer.', maxPoints: 25 },
        { criterion: 'Broken and diagnosed', description: 'The inside-out sequence worked, with the finding step named.', maxPoints: 15 },
        { criterion: 'Estimated against actual', description: 'A prediction made first, then compared, with the gap explained.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

lines = [l.split() for l in sys.stdin if l.split()]
instances, rate = int(lines[0][0]), int(lines[0][1])
storage_gb, storage_rate = int(lines[1][0]), int(lines[1][1])
egress_gb, egress_rate = int(lines[2][0]), int(lines[2][1])
hours = int(lines[3][0])
`,
        tests: [
          { input: '2 10\n100 2\n50 9\n24\n', expectedOutput: 'compute=14400\nstorage=200\negress=450\ntotal=15050\nsaving_if_8h=9600' },
          { input: '1 10\n0 2\n0 9\n8\n', expectedOutput: 'compute=2400\nstorage=0\negress=0\ntotal=2400\nsaving_if_8h=0' },
          { input: '0 100\n10 5\n1 100\n24\n', expectedOutput: 'compute=0\nstorage=50\negress=100\ntotal=150\nsaving_if_8h=0', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('A short, stateless, spiky workload can still be wrong for serverless when:',
        [['A cold start would breach its latency budget', true],
          ['The traffic is predictable', false],
          ['It writes its results to object storage', false],
          ['It runs in a private subnet', false]],
        'The cold start is the constraint people discover late.'),
      mcq('Destroying everything at the end of the exercise:',
        [['Prevents the bill that catches most students', true],
          ['Is required by the terms of the free tier', false],
          ['Proves the infrastructure was code', false],
          ['Resets the budget alert', false]],
        'The single commonest cause of an unexpected charge.'),
      mcq('Predicting the bill before looking at it:',
        [['Tests whether you understand what you built', true],
          ['Is required for budget approval', false],
          ['Is more accurate than the cost explorer', false],
          ['Avoids surprises in the free tier', false]],
        'And the gap between prediction and reality is the finding.'),
    ],
  },

  {
    unitCode: 'T3_CLOUD_INFRA_MINI_PROJECT',
    notes: `Build a small piece of cloud infrastructure entirely from code, cost it, and destroy
it.

The brief's distinguishing requirement is **destroy and recreate**. An environment you can
rebuild from files is one you can reason about, review, fix and hand over. One you built by
clicking is one nobody can.

Budget around two hours, on a free tier.`,
    assignment: {
      title: 'Mini Project — Infrastructure You Can Rebuild',
      description: 'Define a small cloud environment as code, cost it honestly, destroy it and rebuild it.',
      instructions: `**Use** any provider's free tier. Deploy anything small you have already
built.

**Part one — before anything**

1. **A budget alert.** Show it, with the threshold.
2. A tagging convention: project, environment, owner. Write it down.

**Part two — define it as code**

3. Network: a private network, a public subnet and a private subnet.
4. Compute in the **private** subnet.
5. A load balancer in the public subnet, with a health check against a real endpoint.
6. A managed data store in the private subnet.
7. Security groups that allow the narrowest thing that works, **referencing groups rather than
   address ranges** where possible.
8. **All of it in files**, in version control. Not clicked.

**Part three — prove the shape**

9. Show the service reachable through the load balancer.
10. **Show the compute instance is not reachable directly.**
11. **Show the data store is not reachable from the internet.**
12. Show the health check passing, then break it deliberately and show the balancer removing
    the instance.

**Part four — break it and diagnose**

For each: cause it, work the inside-out sequence, and say which step found it.

13. A security group rule removed.
14. The application bound to 127.0.0.1.
15. No outbound route, with a call to an external API.

**Part five — the money**

16. Estimate the monthly cost from the pricing pages. Show the arithmetic.
17. Deploy, leave it a while, and compare with the cost explorer. Explain any gap.
18. Identify the largest line and say whether it is the one you expected.
19. Name two changes that would reduce it, with the saving for each.

**Part six — the test**

20. **Destroy everything.**
21. **Recreate it from the files, with one command.** Show it working again.
22. Report how long each took, and anything that did not come back cleanly.
23. Destroy it again and **show the account is empty.**

**Submit** the infrastructure files, the three reachability proofs, the three diagnoses, the
cost comparison, and the destroy-recreate evidence.`,
      rubric: [
        { criterion: 'Budget and tags first', description: 'Alert set and convention written before anything was created.', maxPoints: 10 },
        { criterion: 'Defined entirely as code', description: 'Network, compute, balancer, store and groups — all in version-controlled files.', maxPoints: 20 },
        { criterion: 'Private by default, proven', description: 'Instance and store both shown unreachable; service reachable through the balancer.', maxPoints: 20 },
        { criterion: 'Three failures diagnosed', description: 'Each caused, worked through the sequence, with the finding step named.', maxPoints: 20 },
        { criterion: 'Costed and compared', description: 'Estimate made first, compared with actual, reductions named with savings.', maxPoints: 15 },
        { criterion: 'Destroyed and recreated', description: 'One command, working again, with anything that did not return reported.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('The distinguishing requirement is:',
        [['Destroy and recreate from files', true],
          ['Keeping the cost under the free tier', false],
          ['Using a managed data store', false],
          ['Passing the health check', false]],
        'An environment you built by clicking is one nobody can reason about.'),
      mcq('Reporting what did not come back cleanly:',
        [['Names the parts that were not actually in code', true],
          ['Measures the rebuild time', false],
          ['Identifies limitations in the provider', false],
          ['Documents the destroy order', false]],
        'Something manual usually survives the first attempt.'),
      mcq('Showing the data store unreachable from the internet:',
        [['Demonstrates the most commonly misconfigured thing in cloud', true],
          ['Confirms the security group syntax is correct', false],
          ['Proves the subnet is private', false],
          ['Validates the health check', false]],
        'Scanners find exposed databases within minutes.'),
    ],
  },
];
