/**
 * T3_CLOUD_CONTAINERS, T3_CICD_MONITORING, T3_CLOUD_CONFIG, T3_CLOUD_SECURITY and
 * T3_CLOUD_PROJECT — nineteen units. Year 3, cloud track. Finishes S16.
 *
 * ── DEPTH OVER REPETITION, CONTINUED ──────────────────────────────────────────────────────
 *
 * Every topic here has a namesake in the universal core, so every unit is pinned to something
 * the core could not say:
 *
 *   IMAGE_FOR_PRODUCTION       the core built an image; this one has it pulled by an
 *                              orchestrator that will restart it, limit its memory and kill it
 *   WHEN_IT_WILL_NOT_START     the core debugged docker run; this debugs a scheduler, where
 *                              the container may never have been placed at all
 *   WHAT_BLOCKS_A_DEPLOY       entirely new: which failures should stop a release, which is a
 *                              policy question rather than a technical one
 *   SECRETS_IN_INFRASTRUCTURE  the core said rotate; this distributes one secret to six
 *                              consumers, one of which is a build pipeline
 *   LEAST_ACCESS               the authorization argument, arriving where a wildcard granted
 *                              "temporarily" becomes the finding in a breach report
 *
 * Attribution: CLOUD_CONTAINERS is single-skill and derived. CICD_MONITORING defaults to CI_CD
 * with monitoring overridden. CLOUD_CONFIG defaults to DEPLOYMENT with secrets on
 * SECURE_CODING. CLOUD_SECURITY defaults to AUTHORIZATION with exposure on SECURE_CODING.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const CLOUD_REST_BUNDLES: PilotBundle[] = [
  /* ══ T3_CLOUD_CONTAINERS ════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_CLOUD_CONTAINERS_IMAGE_FOR_PRODUCTION',
    notes: `The core containers topic built an image. **This one is about an image that will be
pulled by an orchestrator which restarts it, limits its memory, kills it on a signal and runs
several copies at once.** Those four facts change what the image must do.

## It will be restarted

**Assume it starts many times a day**, on any machine, in any order relative to its
dependencies.

**So: start fast.** A thirty-second startup is thirty seconds of unavailability on every
restart, and a slow start turns a rolling deploy into an outage.

**And start correctly when its dependencies are not ready.** The database may come up after
you. **Retry with backoff rather than crashing** — although crashing is acceptable if the
orchestrator will restart you, and choosing deliberately between the two is the point.

## It will be killed

The orchestrator sends SIGTERM, waits, then SIGKILL.

**Handle SIGTERM**: stop accepting new work, finish what is in flight, close connections,
exit. The Linux topic's argument, now with a deadline attached — **you have a grace period,
usually thirty seconds, and after it you are killed regardless.**

**Know your grace period and make sure your longest request fits inside it.** If a request
takes sixty seconds and the grace period is thirty, every deploy kills requests, and the
errors will be blamed on the application.

## Its memory is limited

**A container with a memory limit that exceeds it is killed**, not slowed. Exit code 137, the
Linux topic's out-of-memory killer, arriving through the orchestrator.

**Set limits deliberately and measure actual usage.** Too low and it is killed under load; too
high and you waste capacity and the scheduler packs machines badly.

**The trap:** a runtime that does not know about the container's limit will size its heap from
the machine's memory and then be killed. **Most modern runtimes handle this and older versions
do not**, and it produces a container that dies under load for no visible reason.

## Several copies will run

**No local state.** Anything written to the container's filesystem belongs to that copy and
vanishes. Sessions, uploads, caches — all external.

**Idempotent startup.** Ten copies starting at once must not each run the migration.
**Migrations belong in a separate step**, not in the application's start-up path, and this is
the mistake that produces a locked database during a deploy.

**No assumption about which copy handles what.** A request may reach any of them.

## What the image must expose

**A health endpoint that means something** — the reliability topic's point. The orchestrator
uses it to decide whether to send traffic and whether to restart you.

**Two of them, if the platform supports it:** *am I alive* and *am I ready*. **Alive but not
ready** is exactly the state of a container that has started and is still connecting to its
database, and conflating the two makes the orchestrator restart something that was about to
work.

**Logs to stdout.** The platform collects them. A log file inside the container is written to a
filesystem that disappears.

**Configuration from the environment.** One image, every environment.

## The size, again

**Small images matter more here** than on your laptop: every node pulls them, scaling pulls
them, and a rolling deploy pulls them everywhere at once. A 1GB image makes scaling slow at
exactly the moment you need it to be fast.`,
    mcqs: [
      mcq('A slow container start turns:',
        [['A rolling deploy into an outage', true],
          ['A restart into an unintended scaling event', false],
          ['A health check into a false negative', false],
          ['A deploy into a rollback', false]],
        'Thirty seconds of unavailability on every restart.'),
      mcq('If your longest request exceeds the grace period:',
        [['Every deploy kills requests, and the application gets blamed', true],
          ['The orchestrator extends the grace period automatically', false],
          ['The request is retried by the load balancer', false],
          ['SIGKILL is delayed until it completes', false]],
        'Know your grace period and make the longest request fit inside it.'),
      mcq('A runtime that sizes its heap from the machine rather than the container:',
        [['Dies under load for no visible reason', true],
          ['Runs considerably slower but survives the load', false],
          ['Is prevented by the memory limit', false],
          ['Logs a warning at startup', false]],
        'Most modern runtimes handle it; older versions do not.'),
      mcq('Migrations in the application start-up path cause:',
        [['A locked database when ten copies start at once', true],
          ['A noticeably slower first request after each deploy', false],
          ['A failed health check on some copies', false],
          ['Duplicate schema versions', false]],
        'Migrations belong in a separate step.'),
    ],
    checkpoint: [
      mcq('Alive and ready are separate checks because:',
        [['A container can be alive while still connecting to its database', true],
          ['Readiness is simply checked less frequently than liveness', false],
          ['Liveness requires more permissions', false],
          ['They use different network ports', false]],
        'Conflating them makes the orchestrator restart something about to work.'),
      mcq('Image size matters more in production because:',
        [['Every node pulls it, and a rolling deploy pulls it everywhere at once', true],
          ['Registries charge by size', false],
          ['Large images tend to fail their health checks on startup', false],
          ['Disk is scarcer on cloud nodes', false]],
        'Scaling becomes slow at exactly the moment it must be fast.'),
      mcq('A container being killed for exceeding its memory limit shows:',
        [['Exit code 137, the out-of-memory killer', true],
          ['A graceful shutdown log line', false],
          ['A readiness check failure', false],
          ['Exit code 1 with a stack trace', false]],
        'The orchestrator kills it outright rather than slowing it down.'),
    ],
  },

  {
    unitCode: 'T3_CLOUD_CONTAINERS_RUNNING_IT_SOMEWHERE_REAL',
    notes: `An image that runs on your laptop has to be **scheduled, exposed, scaled and
updated** by something. That something is an orchestrator, and the vocabulary is worth
learning once because it is the same everywhere.

## What an orchestrator does

**Scheduling.** You say "run three copies"; it decides which machines. You do not choose.

**Health management.** It checks, restarts what fails, and replaces what will not recover.

**Service discovery.** Copies come and go; a stable name routes to whichever exist.

**Rolling updates.** Replace copies gradually, keeping the service up.

**Scaling.** More copies when a signal says so.

## The declaration

**You describe the desired state, and the system converges towards it.**

Not "start a container" but "there should be three of these, with this image, this much
memory, these environment variables, this health check". **The difference matters**: if one
dies, the system notices the gap and fixes it, without anybody being paged.

**And it means your deployment is a file**, reviewable and version-controlled — the same
argument as the Dockerfile, one level up.

## Rolling updates, and what they require

**Old and new run at the same time.** For a period, both versions are serving.

**That has consequences people miss:**

- **The database schema must work with both.** The expand-and-contract pattern from the
  deployment topic is not optional here — it is the precondition for a rolling update.
- **The API must be compatible in both directions** for the duration.
- **Anything cached must tolerate both shapes.**

**The health check governs the rollout.** New copies must pass before old ones are removed, and
a check that passes too early lets broken copies take traffic.

## Configuration and secrets

**Configuration** as environment variables or mounted files, supplied by the platform.

**Secrets** through the platform's secret mechanism, not environment variables where you can
avoid it — and never baked into the image, which the core topic established.

**Changing configuration usually means new copies.** Plan for that: a configuration change is
a deployment, with the same risks.

## Storage

**Assume none.** Containers are replaced; their filesystems go with them.

**Where state is genuinely needed**, the platform offers persistent volumes, and they come with
constraints — often tied to a zone, often attachable to one copy at a time.

**The usual answer is to keep state in a managed service**, and to keep the containers
stateless. That is not a simplification for teaching; it is what most production systems
actually do.

## What to learn and what to skip

**Learn:** the desired-state model, health checks, rolling updates, service discovery,
configuration and secrets, resource limits.

**Skip, for now:** the full feature surface of any particular orchestrator. **The concepts
transfer; the YAML does not**, and a graduate who understands the concepts can read any
platform's documentation productively.

**And know the simpler options exist.** A managed container service that takes an image and
runs it is enough for a great many applications, and reaching for a full orchestrator on a
small service is the containers topic's over-engineering warning at a larger scale.`,
    mcqs: [
      mcq('The declarative model means:',
        [['You describe the desired state and the system converges to it', true],
          ['You issue the commands yourself in the right order', false],
          ['The platform generates the configuration', false],
          ['Changes are applied only on restart', false]],
        'If one dies, the gap is noticed and fixed without anybody being paged.'),
      mcq('A rolling update requires the database schema to:',
        [['Work with both the old and the new version at once', true],
          ['Be fully migrated before the rollout begins', false],
          ['Be locked during the transition', false],
          ['Match the new version exactly', false]],
        'Expand and contract is the precondition, not an option.'),
      mcq('A health check that passes too early:',
        [['Lets broken copies take traffic', true],
          ['Slows the whole rollout down unnecessarily', false],
          ['Causes the orchestrator to restart them', false],
          ['Has no effect on the rollout', false]],
        'The check governs whether old copies are removed.'),
      mcq('Changing configuration in an orchestrated service:',
        [['Usually means new copies, so it is a deployment', true],
          ['Takes effect immediately on the already-running copies', false],
          ['Requires no health check', false],
          ['Is safer than a code change', false]],
        'With the same risks as any deployment.'),
    ],
    checkpoint: [
      mcq('What transfers between orchestrators is:',
        [['The concepts, not the YAML', true],
          ['The configuration format', false],
          ['The command-line interface', false],
          ['The health check syntax', false]],
        'A graduate who understands the concepts can read any platform’s documentation.'),
      mcq('The usual answer for state in a containerised system is:',
        [['Keep it in a managed service and the containers stateless', true],
          ['Use persistent volumes for everything that must survive', false],
          ['Pin stateful containers to one node', false],
          ['Replicate state between copies', false]],
        'What most production systems actually do.'),
      mcq('Reaching for a full orchestrator on a small service is:',
        [['The over-engineering warning at a larger scale', true],
          ['Necessary for health checks', false],
          ['The only way to get rolling updates', false],
          ['Cheaper than a managed container service', false]],
        'A managed service that takes an image and runs it is enough for many applications.'),
    ],
  },

  {
    unitCode: 'T3_CLOUD_CONTAINERS_WHEN_IT_WILL_NOT_START',
    notes: `The core topic debugged \`docker run\`. **Here the container may never have been
placed at all**, and the diagnosis has an extra layer: before asking why the container failed,
find out whether it ever ran.

## The three states, distinguished first

**Never scheduled.** No machine had room, no machine matched, or a quota was reached.

**Scheduled and could not start.** The image would not pull, or the container exited
immediately.

**Started and then failed.** Crashed, killed, or failed its health check.

**Ask which of the three before anything else.** The platform will tell you, and each leads to
a completely different investigation — this single question saves more time than any other in
the unit.

## Never scheduled

**Not enough resources.** You asked for more memory or CPU than any node has free. **The usual
cause is a request set too high** — frequently copied from an example — rather than a genuinely
full cluster.

**No matching node.** A constraint that nothing satisfies: an architecture, a zone, a label.

**A quota.** The namespace or account limit is reached.

**The event log says which.** Read it before guessing; it is usually explicit.

## Scheduled, will not start

**Image pull failure.** Wrong name, wrong tag, wrong registry, or no credentials. **The
credentials case is the one that catches people**, because it works on your laptop where you
are logged in.

**Immediate exit.** The core topic's territory: wrong command, missing configuration, the
process finishing normally, a binary not present in the image.

**Missing configuration.** A secret or config that does not exist, so the container cannot
start. The platform usually says exactly which.

**Architecture mismatch.** Built on one architecture, scheduled on another. The core topic's
first suspect, and it applies here too.

## Started, then failed

**Crash-looping.** Starts, fails, restarts, repeatedly, with a backoff that grows. **Read the
logs of the previous instance, not the current one** — the current one may not have got far
enough to log anything useful, and that flag is the thing people do not know exists.

**Killed for memory.** Exit 137.

**Failing the health check.** And here is the distinction that matters: **liveness failing
restarts it; readiness failing removes it from traffic but leaves it running.** A container
that stays up and receives nothing is a readiness problem, and a container that restarts every
minute is a liveness one.

**Dependency unavailable.** It starts, cannot reach the database, and exits. Correct behaviour
if the orchestrator will retry, and a crash loop if the dependency never comes.

## The sequence

1. **Which of the three states?** Ask the platform.
2. **Read the events**, not just the logs. Scheduling failures appear only there.
3. **Read the previous instance's logs** if it is restarting.
4. **Check the resource requests** against what the nodes have.
5. **Run the same image locally with the same configuration.** If it works, the difference is
   the environment — and you have halved the problem.
6. **Get a shell inside**, if it stays up long enough. If it does not, override the command
   with a shell so it does.

**Step five is the highest-value one**, and it is the same "is it the image or the
environment" question the core topic asked, with more places for the environment to differ.`,
    mcqs: [
      mcq('The question to ask before anything else is:',
        [['Whether it was never scheduled, would not start, or started and failed', true],
          ['What the container’s exit code turned out to be', false],
          ['Whether the image pulled successfully', false],
          ['Whether the health check passed', false]],
        'Each leads to a completely different investigation.'),
      mcq('The usual cause of "never scheduled" is:',
        [['A resource request set too high, often copied from an example', true],
          ['A cluster that is genuinely full of other work', false],
          ['A node label mismatch', false],
          ['An exhausted quota', false]],
        'The event log says which; read it before guessing.'),
      mcq('An image pull failure that works on your laptop is usually:',
        [['Missing registry credentials in the cluster', true],
          ['A wrong tag specified in the deployment', false],
          ['An architecture mismatch', false],
          ['A network policy blocking the registry', false]],
        'You are logged in locally and the cluster is not.'),
      mcq('For a crash-looping container you should read:',
        [['The previous instance’s logs', true],
          ['The logs of the instance that is currently running', false],
          ['The scheduler events only', false],
          ['The node’s system log', false]],
        'The current one may not have got far enough to log anything.'),
    ],
    checkpoint: [
      mcq('Liveness failing and readiness failing differ in that:',
        [['One restarts the container, the other removes it from traffic', true],
          ['One is checked more often', false],
          ['One applies only during startup', false],
          ['One of them requires a separate endpoint to be exposed', false]],
        'Up and receiving nothing is readiness; restarting every minute is liveness.'),
      mcq('Running the same image locally with the same configuration:',
        [['Halves the problem by separating image from environment', true],
          ['Confirms the registry is reachable from your machine', false],
          ['Tests the health check logic', false],
          ['Reproduces the scheduling decision', false]],
        'The highest-value step in the sequence.'),
      mcq('Scheduling failures appear:',
        [['In the events, not the logs', true],
          ['In the container logs on the node', false],
          ['In the image pull output', false],
          ['In the health check history', false]],
        'Which is why reading events is a separate step.'),
    ],
  },

  {
    unitCode: 'T3_CLOUD_CONTAINERS_DEBUGGING',
    notes: `Five production container failures that do not occur on a laptop.

## 1. It works locally and crash-loops in the cluster

**Causes, in order:** a resource limit the laptop did not have; missing configuration or
secrets; a dependency unreachable from the cluster network; architecture; a read-only
filesystem the platform imposes.

**The read-only one catches people.** A hardened platform mounts the root filesystem read-only,
and an application writing a temporary file dies with an error that does not mention
permissions in a way anybody recognises.

## 2. Some copies work and others do not

**Symptom:** intermittent failures, and retrying sometimes works.

**Causes:** a rolling update partway through — the deployment topic's mixed fleet; one node
with a different configuration; a copy that failed readiness but is still routed to because
the check is misconfigured.

**Diagnosis:** identify which copy served the failing request. **This requires the copy's
identity in the response or the logs**, and adding it is a five-minute change that pays for
itself the first time.

## 3. It restarts every few minutes with no error

**Causes:** memory, exit 137, with nothing logged because the process was killed; a liveness
check failing on a slow endpoint; a dependency going away periodically.

**The liveness case is worth knowing.** A check that hits an endpoint which occasionally takes
longer than the timeout will restart a perfectly healthy container under load — **making the
load problem worse**, which is a feedback loop people do not anticipate.

## 4. Traffic goes to a copy that is not ready

**Cause:** readiness passes before the application can serve. A check on a static endpoint
rather than a real one, or no readiness check at all so the platform assumes ready at start.

**Symptom:** a burst of errors at the start of every deploy, then normal.

**That symptom is worth recognising**, because it is routinely accepted as unavoidable and it
is not.

## 5. The deploy hangs

**Causes:** new copies never become ready, so the old ones are never removed; a resource
request nothing can satisfy; an image that will not pull.

**Diagnosis:** the platform's rollout status, then the events for the new copies. **The
rollout is waiting for something specific and it will tell you what.**

## The habits

**Log the copy's identity** on every line. Which instance, which image version. **Half the
problems above become obvious with it and are guesswork without.**

**Read events, not only logs.**

**Set resource requests from measurement**, not from an example.

**Check readiness against something real** — the health endpoint the reliability topic
specified, which verifies a dependency.

**And keep the ability to run the exact image locally.** It separates image problems from
environment problems in one command, which is the single most useful diagnostic available.`,
    mcqs: [
      mcq('A read-only root filesystem produces:',
        [['An error nobody recognises as a permissions problem', true],
          ['A clear permission denied message at startup', false],
          ['A failure to pull the image', false],
          ['A crash only under load', false]],
        'Hardened platforms impose it and applications write temporary files.'),
      mcq('Identifying which copy served a failing request requires:',
        [['The copy’s identity in the response or the logs', true],
          ['Access to the underlying node’s system log', false],
          ['Sticky sessions on the load balancer', false],
          ['Tracing across the whole cluster', false]],
        'A five-minute change that pays for itself the first time.'),
      mcq('A liveness check on an endpoint that is occasionally slow:',
        [['Restarts healthy containers under load, making the load worse', true],
          ['Is corrected by the platform’s retry policy', false],
          ['Only affects the readiness signal', false],
          ['Causes the deploy to hang', false]],
        'A feedback loop people do not anticipate.'),
      mcq('A burst of errors at the start of every deploy is:',
        [['Routinely accepted as unavoidable, and is not', true],
          ['Entirely normal for any rolling update', false],
          ['Caused by connection draining', false],
          ['A sign the grace period is too short', false]],
        'It is readiness passing before the application can serve.'),
    ],
    checkpoint: [
      mcq('A hanging deploy is diagnosed from:',
        [['The rollout status, then the events for the new copies', true],
          ['The logs of the old copies', false],
          ['The load balancer’s recorded health check history', false],
          ['The node resource usage', false]],
        'The rollout is waiting for something specific and will say what.'),
      mcq('Resource requests should be set from:',
        [['Measurement', true], ['An example configuration', false],
          ['The node size', false], ['The application defaults', false]],
        'Too high and nothing schedules; too low and it is killed under load.'),
      mcq('The single most useful diagnostic for a container problem is:',
        [['Running the exact image locally with the same configuration', true],
          ['Reading the orchestrator events', false],
          ['Getting a shell inside the running container to look', false],
          ['Checking the resource limits', false]],
        'It separates image problems from environment problems in one command.'),
    ],
  },

  {
    unitCode: 'T3_CLOUD_CONTAINERS_PRACTICE',
    notes: `Two exercises on production container reasoning: diagnosing from the state the
platform reports, and working out whether a rolling update is safe.`,
    coding: [
      {
        title: 'Which of the three states?',
        description: `Read one container per line as
\`<scheduled> <started> <restarts> <exit_code> <ready>\`, where scheduled, started and ready
are \`yes\` or \`no\`, and restarts and exit_code are integers.

Print the diagnosis, checking in this order:

- scheduled \`no\` → \`never_scheduled\`
- started \`no\` → \`will_not_start\`
- restarts above 3 and exit_code 137 → \`out_of_memory_loop\`
- restarts above 3 → \`crash_loop\`
- ready \`no\` → \`not_ready\`
- otherwise → \`healthy\`

Then a final line \`healthy=<n>\`.

The ordering is the sequence from the unit: find out whether it ran before asking why it
failed.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# Never scheduled, would not start, or started and failed — in that order.
`,
        language: 'python',
        tests: [
          { input: 'no no 0 0 no\n', expectedOutput: 'never_scheduled\nhealthy=0' },
          { input: 'yes no 0 0 no\n', expectedOutput: 'will_not_start\nhealthy=0' },
          { input: 'yes yes 9 137 no\n', expectedOutput: 'out_of_memory_loop\nhealthy=0' },
          { input: 'yes yes 9 1 no\n', expectedOutput: 'crash_loop\nhealthy=0' },
          { input: 'yes yes 0 0 no\n', expectedOutput: 'not_ready\nhealthy=0' },
          { input: 'yes yes 0 0 yes\n', expectedOutput: 'healthy\nhealthy=1' },
          { input: 'no yes 9 137 yes\n', expectedOutput: 'never_scheduled\nhealthy=0', isHidden: true },
          { input: '', expectedOutput: 'healthy=0', isHidden: true },
        ],
      },
      {
        title: 'Is this rolling update safe?',
        description: `A rolling update runs both versions at once. Read four lines, each
\`yes\` or \`no\`:

    schema_backwards_compatible
    api_backwards_compatible
    cache_tolerates_both_shapes
    readiness_checks_a_dependency

Print one line per concern as \`<name> ok\` or \`<name> risk\`, in the order given, using the
names \`schema\`, \`api\`, \`cache\`, \`readiness\`. Then a final line
\`verdict=<safe|unsafe>\` — \`safe\` only when all four are \`ok\`.

All four must hold. A rolling update with an incompatible schema is not a deploy, it is an
outage in slow motion.`,
        starter: `import sys

answers = [l.strip() for l in sys.stdin if l.strip()]

# Four concerns, all required. Old and new run together for the duration.
`,
        language: 'python',
        tests: [
          { input: 'yes\nyes\nyes\nyes\n', expectedOutput: 'schema ok\napi ok\ncache ok\nreadiness ok\nverdict=safe' },
          { input: 'no\nyes\nyes\nyes\n', expectedOutput: 'schema risk\napi ok\ncache ok\nreadiness ok\nverdict=unsafe' },
          { input: 'yes\nyes\nyes\nno\n', expectedOutput: 'schema ok\napi ok\ncache ok\nreadiness risk\nverdict=unsafe' },
          { input: 'no\nno\nno\nno\n', expectedOutput: 'schema risk\napi risk\ncache risk\nreadiness risk\nverdict=unsafe', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Containers in Production Practice',
      description: 'Diagnose from platform state, judge a rolling update, then run a container somewhere real.',
      instructions: `Complete both exercises, then:

1. For the first: the hidden case is scheduled \`no\` with restarts and an exit code set. Say
   why those fields should be ignored, and what it would mean if a platform reported that
   combination.
2. For the first: \`not_ready\` with zero restarts describes a specific and common situation.
   Describe it, and say what the user experiences.
3. For the second: all four must hold. Give a case where you would deploy anyway, and say what
   you would do to make it survivable.

**Then, on a real platform.** Any managed container service or orchestrator, free tier.

4. Deploy a containerised service with at least two copies.
5. Add liveness and readiness checks that are **different**, and say what each verifies.
6. Set memory and CPU requests **from a measurement**, not a guess. Show the measurement.
7. Handle SIGTERM. **Prove it**: send a request that takes several seconds, trigger a rolling
   update during it, and show the request completing.
8. **Break it four ways**, and for each work the sequence and report which step found it:
   a request nothing can satisfy; a wrong image tag; a missing configuration value; a liveness
   check on a slow endpoint.
9. Perform a rolling update with a visible change. Watch it. Report whether any request failed.
10. Add the copy's identity to the logs and to a response header. Show it changing between
    requests.`,
      rubric: [
        { criterion: 'States diagnosed', description: 'All cases, with the ordering respected.', maxPoints: 15 },
        { criterion: 'Rolling update judged', description: 'All four concerns and the verdict.', maxPoints: 15 },
        { criterion: 'Two different checks', description: 'Liveness and readiness verifying genuinely different things.', maxPoints: 15 },
        { criterion: 'SIGTERM proven', description: 'An in-flight request completing during a rolling update.', maxPoints: 20 },
        { criterion: 'Four failures diagnosed', description: 'Each caused, sequence worked, finding step named.', maxPoints: 20 },
        { criterion: 'Copy identity visible', description: 'In logs and a response header, shown changing.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]
`,
        tests: [
          { input: 'no no 0 0 no\n', expectedOutput: 'never_scheduled\nhealthy=0' },
          { input: 'yes no 0 0 no\n', expectedOutput: 'will_not_start\nhealthy=0' },
          { input: 'yes yes 9 137 no\n', expectedOutput: 'out_of_memory_loop\nhealthy=0' },
          { input: 'yes yes 0 0 yes\n', expectedOutput: 'healthy\nhealthy=1' },
          { input: 'no yes 9 137 yes\n', expectedOutput: 'never_scheduled\nhealthy=0', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('`not_ready` with zero restarts describes:',
        [['A copy that is up and receiving no traffic', true],
          ['A copy that is restarting silently', false],
          ['A copy that failed to schedule', false],
          ['A copy killed for memory', false]],
        'Readiness failing removes it from traffic and leaves it running.'),
      mcq('Restarts and exit code reported for a never-scheduled container:',
        [['Are stale or meaningless, since it never ran', true],
          ['Indicate a previous deployment', false],
          ['Should override the scheduling state', false],
          ['Mean the container ran on another node', false]],
        'Which is why the ordering ignores them.'),
      mcq('A rolling update with an incompatible schema is:',
        [['An outage in slow motion', true],
          ['Safe if the rollout is fast', false],
          ['Recoverable by rolling back', false],
          ['Acceptable during low traffic', false]],
        'Both versions serve for the duration.'),
    ],
  },

  {
    unitCode: 'T3_CLOUD_CONTAINERS_MINI_PROJECT',
    notes: `Run a containerised service somewhere real, and prove it survives the things a
platform does to it.

The brief's requirement is **the rolling update with traffic flowing**. A deploy with nobody
watching proves nothing; a deploy under load, with the error count in view, proves everything
this topic is about.

Budget around two hours.`,
    assignment: {
      title: 'Mini Project — A Container That Survives Its Platform',
      description: 'Deploy a containerised service and prove it handles restarts, limits, signals and rolling updates.',
      instructions: `**Deploy** a containerised application of yours to a managed container
service or orchestrator.

**Part one — an image fit for production**

1. Multi-stage, slim, non-root, with a \`.dockerignore\`. Report the size.
2. **Measure the start time.** Report it, and say whether it is acceptable for a rolling
   deploy.
3. Handle SIGTERM: finish in flight, then exit. Show the code.
4. Logs to stdout. Configuration from the environment. No secrets in the image.
5. Two health endpoints: liveness and readiness, verifying **different** things.

**Part two — run it properly**

6. At least two copies, declared as desired state in a file.
7. Memory and CPU requests set from a measurement. Show the measurement and the numbers.
8. Migrations as a separate step, not in the start-up path. Show the separation.
9. Deploy. Show it serving.

**Part three — prove it survives**

10. **Kill a copy.** Show the platform replacing it and the service staying up.
11. **Exceed the memory limit deliberately.** Show exit 137 and the restart.
12. **Rolling update under load.** Run a small load generator, deploy a visible change, and
    **report the error count during the rollout.** If it is not zero, find out why and fix it.
13. Show an in-flight long request completing during that update.

**Part four — break it four ways**

For each: cause it, work the three-state sequence, report which step found it.

14. A resource request nothing can satisfy.
15. A wrong image tag.
16. A missing configuration value.
17. A readiness check that passes before the application can serve. **Show the error burst**,
    then fix the check and show it gone.

**Part five — observability**

18. The copy's identity in every log line and in a response header.
19. Show two consecutive requests served by different copies.

**Part six — report**

20. Image size, start time, resource usage, and the rollout error count.
21. What you changed as a result of the four failures.
22. What would break first at ten times the traffic.

**Submit** the image definition, the desired-state file, the rollout evidence with the error
count, the four diagnoses, and the report.`,
      rubric: [
        { criterion: 'An image fit for the platform', description: 'Slim, non-root, SIGTERM handled, two distinct health endpoints.', maxPoints: 20 },
        { criterion: 'Declared and measured', description: 'Desired state in a file; requests set from a real measurement.', maxPoints: 15 },
        { criterion: 'Survives kill and memory limit', description: 'Both demonstrated, with the service staying up.', maxPoints: 15 },
        { criterion: 'Rolling update under load', description: 'Error count reported and driven to zero, with a long request completing.', maxPoints: 25 },
        { criterion: 'Four failures diagnosed', description: 'Each caused, sequence worked, finding step named, readiness burst fixed.', maxPoints: 15 },
        { criterion: 'Copy identity visible', description: 'In logs and headers, with two copies demonstrated.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('A rolling update with nobody watching:',
        [['Proves nothing; the error count under load is the evidence', true],
          ['Is sufficient if it completes', false],
          ['Demonstrates that the health checks are working', false],
          ['Is safer than one under load', false]],
        'Which is why the brief runs a load generator during it.'),
      mcq('An error count above zero during a rollout:',
        [['Should be investigated and driven to zero', true],
          ['Is normal and acceptable', false],
          ['Indicates the grace period is too long', false],
          ['Means the load generator was too aggressive', false]],
        'It is usually readiness, or SIGTERM not being handled.'),
      mcq('Migrations as a separate step prevents:',
        [['Several copies each running them at startup', true],
          ['The schema drifting away from the deployed code', false],
          ['A slow first request', false],
          ['A failed readiness check', false]],
        'Which is what locks the database during a deploy.'),
    ],
  },

  /* ══ T3_CICD_MONITORING ═════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_CICD_MONITORING_BUILDING_A_PIPELINE',
    notes: `The core deployment topic argued for a pipeline. **This one builds it**, and the
detail is where the value is.

## The stages

**On every push:** checkout, restore the dependency cache, install, lint, test, build.

**On merge to the main branch:** build the artefact once, tag it with the commit, push it to a
registry, deploy to staging, run smoke tests.

**To production:** deploy, verify, and be able to roll back.

## Build once, tag by commit

    myapp:a3f9c21

**Not \`latest\`.** A tag that moves is a tag that tells you nothing — you cannot say which image
is running, cannot roll back to a specific one, and two deploys of "latest" may be different
images.

**The commit hash as the tag** means the running version is traceable to a line of code, which
is the first thing you want during an incident.

## Caching, which is most of the speed

**The dependency cache is the single biggest lever.** Without it every build downloads
everything.

**Key it on the lockfile's hash.** The cache is reused while dependencies are unchanged and
rebuilt when they change, automatically and correctly.

**The Docker layer cache** matters too, and it needs the layer ordering the containers topic
described — dependencies before source.

**Measure the pipeline's stages.** Most slow pipelines have one step that is 80% of the time,
and it is usually either an uncached install or a test suite nobody has looked at.

## Parallel and ordered

**Run independent things at once:** lint, unit tests, and the build need not be sequential.

**Fail fast on the cheap checks.** Lint before the integration suite, so a formatting error
does not wait eight minutes.

**And keep the whole thing under about ten minutes**, for the reason the core topic gave: past
that, people stop watching.

## Secrets in the pipeline

**From the platform's store**, never the configuration file.

**Not echoed.** A command that prints its environment prints your secrets into a log that may
be public on an open-source project.

**Scoped.** The build does not need the production deployment credential. **A pipeline
compromised through a dependency is a real attack path**, and a scoped credential limits what
it reaches.

## What the deploy step actually does

**Take the tagged artefact and tell the platform to use it.** Nothing is rebuilt.

**Wait for the rollout** and check it succeeded — not that the command returned, which the
core topic distinguished.

**Run a smoke test against the deployed environment.** One or two requests proving the thing is
alive and serving. **This is the check that catches a deploy that succeeded and produced a
broken service**, and it costs ten lines.

## What to add once it works

**A branch protection rule**, so the pipeline must pass before merging. Without it the pipeline
is advisory.

**A dependency vulnerability scan.**

**A preview environment per branch**, if you can afford it. Expensive and transformative for
review quality.

**A deployment record** — what was deployed, when, by whom, from which commit. **The first
question in any incident is "what changed", and this answers it in seconds.**`,
    mcqs: [
      mcq('Tagging images `latest` rather than by commit means:',
        [['You cannot say which image is running or roll back to one', true],
          ['The registry ends up storing far fewer images', false],
          ['Deploys are faster', false],
          ['The cache is invalidated more often', false]],
        'The commit hash makes the running version traceable to a line of code.'),
      mcq('The dependency cache should be keyed on:',
        [['The lockfile’s hash', true],
          ['The name of the branch being built', false],
          ['The date of the build', false],
          ['The commit hash', false]],
        'Reused while dependencies are unchanged, rebuilt automatically when they change.'),
      mcq('A command that prints its environment in a pipeline:',
        [['Prints your secrets into a log that may be public', true],
          ['Is blocked automatically by the platform', false],
          ['Is safe if the repository is private', false],
          ['Masks known secret values automatically', false]],
        'Do not echo, and scope the credentials.'),
      mcq('A smoke test after deploy catches:',
        [['A deploy that succeeded and produced a broken service', true],
          ['A unit test that has started failing', false],
          ['A dependency vulnerability', false],
          ['A rollout that did not complete', false]],
        'Ten lines, and it is the check that matters most.'),
    ],
    checkpoint: [
      mcq('Most slow pipelines have:',
        [['One step that is 80% of the time', true],
          ['Too many parallel jobs competing', false],
          ['An oversized container image', false],
          ['Too many stages overall', false]],
        'Usually an uncached install or a test suite nobody has examined.'),
      mcq('Without a branch protection rule, the pipeline is:',
        [['Advisory', true], ['Still enforced at deploy', false],
          ['Sufficient for small teams', false], ['Equivalent to a required check', false]],
        'It must pass before merging, or it can be ignored.'),
      mcq('A deployment record answers:',
        [['"What changed", the first question in any incident', true],
          ['Whether the tests passed', false],
          ['How long the deploy took', false],
          ['Which environment the change was targeted at', false]],
        'In seconds, rather than by asking around.'),
    ],
  },

  {
    unitCode: 'T3_CICD_MONITORING_WHAT_BLOCKS_A_DEPLOY',
    notes: `**Which failures should stop a release?** This is a policy question, not a technical
one, and getting it wrong in either direction is expensive.

**Block too much** and the pipeline is an obstacle people route around — with a
skip-checks flag, or by batching changes, or by merging and deploying manually.

**Block too little** and broken things reach production, and the pipeline becomes
decorative.

## What should always block

**A failing test.** Non-negotiable. **The moment a failing test can be ignored, the suite
stops meaning anything**, and a suite that does not block is a suite nobody maintains.

**A build failure.** Obviously.

**A security scan finding a critical, exploitable vulnerability** in something you actually
ship.

**A missing required configuration** for the target environment. Better to fail the deploy than
to start a service that cannot work.

## What should usually block, with a route around it

**Linting and formatting.** Machine-checkable, so it should never be a review comment. **And
there must be a documented way to override** for the genuine emergency, because a formatting
rule stopping a production fix at 2am is the pipeline failing its purpose.

**A coverage drop.** Useful as a signal, and a bad hard gate — coverage is gameable, as the
testing topic established, and a legitimate refactor can reduce it.

## What should warn, not block

**A non-critical vulnerability** in a development dependency.

**A performance regression** within noise.

**A new linting rule** just introduced across an old codebase.

**A flaky test.** And this one needs saying plainly: **a flaky test should not block, and it
should not be left in the suite either.** Quarantine it with a ticket. Leaving it blocking
teaches people to rerun until green, which is how a real failure gets rerun too — the testing
topic's argument, arriving at the pipeline.

## The override, and how to do it properly

**There must be one.** A production incident at 2am cannot wait for a formatting fix.

**And it must be visible.** Logged, announced, attributed. **An override nobody sees becomes
the normal path within a month**, and then the gates are decorative.

**A good shape:** an explicit flag that records who used it and why, reported weekly. Frequent
use is a signal that a gate is wrong, and that signal is worth having.

## Manual approval

**Only where somebody genuinely reads something.** An approval clicked by reflex is worse than
none: it creates the appearance of control and the habit of ignoring it, which the core topic
said and is worth repeating because it is so often got wrong.

**Better than a manual gate, usually:** automated verification, a canary, and a fast rollback.
**Confidence should come from the ability to recover, not from the ceremony before the
change** — that sentence is the unit.

## Deciding for your team

**Write the list down.** What blocks, what warns, what is overridable and how.

**Review it when something gets through.** A failure that reached production is either a
missing gate or a gate that was overridden, and both are worth knowing.

**And review it when a gate is overridden often.** That gate is probably wrong.`,
    mcqs: [
      mcq('The moment a failing test can be ignored:',
        [['The suite stops meaning anything', true],
          ['The pipeline becomes faster', false],
          ['Coverage becomes the better signal', false],
          ['Reviews must compensate', false]],
        'A suite that does not block is a suite nobody maintains.'),
      mcq('A coverage drop is a bad hard gate because:',
        [['Coverage is gameable and a legitimate refactor can reduce it', true],
          ['It is expensive to measure on every build', false],
          ['It varies between test runners', false],
          ['It only applies to new code', false]],
        'Useful as a signal, bad as a wall.'),
      mcq('A flaky test should be:',
        [['Quarantined with a ticket, not left blocking', true],
          ['Left blocking the pipeline until it is fixed', false],
          ['Retried automatically in the pipeline', false],
          ['Deleted without further action', false]],
        'Leaving it blocking teaches people to rerun until green.'),
      mcq('An override that nobody sees:',
        [['Becomes the normal path within a month', true],
          ['Is still safer than having no override at all', false],
          ['Is acceptable if rarely used', false],
          ['Should be removed from the pipeline', false]],
        'Logged, announced, attributed — and reported weekly.'),
    ],
    checkpoint: [
      mcq('Blocking too much causes:',
        [['People to route around the pipeline', true],
          ['Releases that are slower but rather safer', false],
          ['More thorough code review', false],
          ['Better test coverage over time', false]],
        'A skip flag, batched changes, or a manual deploy.'),
      mcq('Confidence should come from:',
        [['The ability to recover, not the ceremony before the change', true],
          ['Manual approval from a sufficiently senior engineer', false],
          ['A comprehensive pre-deploy checklist', false],
          ['Extended testing in staging', false]],
        'Automated verification, a canary, and a fast rollback.'),
      mcq('Frequent use of an override signals:',
        [['That the gate is probably wrong', true],
          ['That the team is undisciplined', false],
          ['That the override should be removed', false],
          ['That more approvals are needed', false]],
        'Which is a signal worth having, and only exists if overrides are recorded.'),
    ],
  },

  {
    unitCode: 'T3_CICD_MONITORING_MONITORING_WHAT_MATTERS',
    notes: `The reliability topic gave you the four signals. **This one is about building the
smallest set of alerts that actually work**, because a monitoring setup with forty alerts and
one that works are usually the same setup.

## Start with two

**Error rate on the main user-facing path.**

**Latency, p95, on the same path.**

**Those two catch most incidents.** Everything else is refinement, and a team with only those
two, alerting reliably to somebody who will act, is better monitored than a team with forty
nobody reads.

## Symptoms, not causes

**Alert on what the user experiences.**

- "Error rate above 2% for five minutes" — a symptom.
- "CPU above 80%" — a cause, and frequently a harmless one.

**A cause-based alert fires when nothing is wrong**, and after two weeks of that it is muted,
and then the real one is muted too.

**Exception:** alert on a cause when it is a **leading indicator you can act on** — disk above
85%, certificate expiring in seven days, queue depth rising steadily. **Those are worth waking
up for precisely because nothing is broken yet.**

## Every alert needs a response

**Before creating one, answer: what does the person do at 3am?**

If the answer is "look at it and go back to sleep", it is a dashboard, not an alert.

**And write the answer down.** A link from the alert to a runbook page turns a frightening page
into a procedure, and the Linux project's runbook is exactly this artefact.

## Thresholds

**From the history, not from a round number.** Look at a month of data: what is normal, what is
the worst normal day?

**Set the threshold above the worst normal day**, or it fires on a Monday.

**And require duration.** "Above 2% for five minutes" rather than "above 2%", because a single
spike is not an incident and a page for one is how trust in the alerting is lost.

## What to monitor beyond the two

**Saturation** — the leading indicator. Disk, memory, connection pool, queue depth.

**Absence** — nothing ran. The pipeline topic's point: a job that did not start produces no
error, and only an absence check finds it.

**Dependencies** — is the thing you depend on healthy? Their outage is your incident.

**Certificates and credentials** — expiry, with weeks of notice. **A certificate expiring at
the weekend is an entirely preventable outage** and it happens constantly.

**Cost** — the budget alert from the infrastructure unit is a monitoring alert.

## Dashboards against alerts

**An alert wakes somebody. A dashboard is looked at deliberately.**

**Most things should be dashboards.** The four signals per service, the deployment markers, the
resource usage. **A dashboard with deployment markers on it answers "what changed" visually**,
and it is the single most useful panel you can add.

## The test

**When something breaks, did you find out from an alert or from a user?**

If from a user, the monitoring failed, and the post-incident question is which signal moved
first and why nothing was watching it. **That single question, asked after every incident,
builds a good alerting setup faster than any amount of design up front.**`,
    mcqs: [
      mcq('The smallest monitoring setup that works is:',
        [['Error rate and p95 latency on the main path', true],
          ['The four signals across every service', false],
          ['Availability plus resource utilisation', false],
          ['A dashboard per service with alerts on each', false]],
        'Two alerting reliably beats forty nobody reads.'),
      mcq('"CPU above 80%" as an alert:',
        [['Fires when nothing is wrong, and gets muted', true],
          ['Catches saturation well before any user notices', false],
          ['Is the standard leading indicator', false],
          ['Is appropriate with a long duration window', false]],
        'And then the real alert is muted too.'),
      mcq('A cause-based alert is justified when:',
        [['It is a leading indicator you can act on before anything breaks', true],
          ['The symptom would only be detected far too late', false],
          ['The cause is easier to measure', false],
          ['The system has no user-facing path', false]],
        'Disk at 85%, a certificate expiring, a queue rising.'),
      mcq('Requiring a duration on a threshold prevents:',
        [['A page for a single spike, which loses trust in the alerting', true],
          ['False negatives during periods of low traffic', false],
          ['Alerts firing during deploys', false],
          ['Duplicate notifications', false]],
        '"Above 2% for five minutes" rather than "above 2%".'),
    ],
    checkpoint: [
      mcq('If the answer to "what do they do at 3am" is "look and go back to sleep":',
        [['It is a dashboard, not an alert', true],
          ['The threshold is too low', false],
          ['It should page a different team', false],
          ['It needs a longer duration window', false]],
        'Every alert needs a response, written down.'),
      mcq('The most useful single dashboard panel is:',
        [['The signals with deployment markers on them', true],
          ['A service health summary', false],
          ['Resource utilisation plotted over time', false],
          ['Request volume by endpoint', false]],
        'It answers "what changed" visually.'),
      mcq('The question that builds good alerting fastest is:',
        [['After each incident, which signal moved first and why nothing watched it', true],
          ['Which alerts fired most often over the last month', false],
          ['What the industry standard alerts are', false],
          ['Which services lack monitoring', false]],
        'Faster than any amount of design up front.'),
    ],
  },

  {
    unitCode: 'T3_CICD_MONITORING_DEBUGGING',
    notes: `Five pipeline and monitoring failures.

## 1. It passes locally and fails in CI

**Causes, in order:** a dependency installed locally and not declared; an environment variable
present on your machine; test order, because CI randomises or parallelises; a time zone, since
CI runs UTC; a missing file, because CI checks out cleanly and your working directory has
untracked files.

**That last one catches people.** A test passing because of a file you created by hand months
ago and never committed.

**Diagnosis:** clone into a fresh directory and run it there. **Reproduces most of these
immediately.**

## 2. The pipeline is slow and getting slower

**Diagnosis:** the per-stage timings. **One stage is usually most of it.**

**Common causes:** the cache not being hit — check whether it reports a hit or a miss, because
a silently-missing cache looks like a slow install; a test suite that has grown; a Docker build
with the layer order wrong; jobs running sequentially that could run together.

## 3. A flaky pipeline

**Symptom:** the same commit passes and fails on different runs.

**Causes:** a flaky test, which the testing topic covered; a race in the pipeline itself, where
two jobs touch the same resource; a rate limit from a registry or a package index; a shared
runner under load.

**And the damage is the same as a flaky test:** people rerun reflexively, and a genuine failure
is rerun too.

## 4. The deploy succeeded and the service is broken

**Cause:** the pipeline checked that the command returned, not that the system is healthy.

**Fix:** wait for the rollout and run a smoke test. **The core deployment topic said a green
pipeline means the deploy command succeeded, which is a different claim** — this is where that
distinction is paid for.

## 5. Alerts that nobody trusts

**Symptom:** a channel full of alerts, muted or ignored.

**Causes:** thresholds set at round numbers rather than from history; cause-based alerts;
alerts with no action; duplicates from several sources for one incident.

**Fix, and it is uncomfortable:** **delete most of them.** Keep the two that catch incidents,
tune their thresholds from real data, and add back only what a post-incident review shows was
missing.

**A team that deletes thirty alerts usually detects incidents faster afterwards**, because the
remaining ones are read.

## The habits

**Per-stage timings**, recorded every run.

**Cache hit reporting**, so a missing cache is visible rather than silent.

**A deployment record.** What, when, who, which commit.

**Deployment markers on the dashboards.** Most incidents follow a change, and seeing the change
on the graph is faster than correlating by timestamp.

**And after every incident: which signal moved first, and how long until anybody noticed.**
One question, and it improves the setup more than any redesign.`,
    mcqs: [
      mcq('A test passing locally because of an uncommitted file is found by:',
        [['Cloning into a fresh directory and running there', true],
          ['Checking the CI logs carefully', false],
          ['Comparing dependency versions', false],
          ['Running with a clean cache', false]],
        'It reproduces most of the local-against-CI differences immediately.'),
      mcq('A silently missing cache:',
        [['Looks like a slow install', true],
          ['Fails the pipeline with an explicit error', false],
          ['Is reported by default', false],
          ['Only affects the first build', false]],
        'Which is why hit-or-miss reporting is worth turning on.'),
      mcq('The fix for alerts nobody trusts is:',
        [['Delete most of them and add back from incident reviews', true],
          ['Raise all of the thresholds across the board', false],
          ['Route them to a different channel', false],
          ['Add severity levels', false]],
        'A team that deletes thirty usually detects incidents faster afterwards.'),
      mcq('"The deploy succeeded and the service is broken" happens because:',
        [['The pipeline checked the command returned, not that the system is healthy', true],
          ['The rollout was in fact still in progress', false],
          ['The smoke test ran against staging', false],
          ['The image tag was wrong', false]],
        'A green pipeline is a different claim from a working system.'),
    ],
    checkpoint: [
      mcq('Deployment markers on a dashboard help because:',
        [['Most incidents follow a change, and seeing it beats correlating timestamps', true],
          ['They record who deployed', false],
          ['They show the rollout duration', false],
          ['They separate the environments visually on the chart', false]],
        'The single most useful panel you can add.'),
      mcq('A flaky pipeline damages you the same way a flaky test does:',
        [['People rerun reflexively, so a genuine failure is rerun too', true],
          ['It wastes build minutes', false],
          ['It delays merges', false],
          ['It hides genuine test failures behind the noise', false]],
        'The same argument, at the pipeline level.'),
      mcq('The one question to ask after every incident is:',
        [['Which signal moved first, and how long until anybody noticed', true],
          ['What the root cause was', false],
          ['How long the incident lasted', false],
          ['Whether the runbook was followed correctly throughout', false]],
        'It improves the setup more than any redesign.'),
    ],
  },

  {
    unitCode: 'T3_CICD_MONITORING_PRACTICE',
    notes: `Two exercises on the policy decisions: what a failure should do to a release, and
whether an alert deserves to wake somebody.`,
    coding: [
      {
        title: 'Block, warn, or allow?',
        description: `Read one pipeline finding per line as \`<kind> <severity> <shipped>\`,
where kind is \`test\`, \`build\`, \`lint\`, \`vulnerability\`, \`coverage\` or \`flaky\`,
severity is \`low\`, \`medium\` or \`critical\`, and shipped is \`yes\` or \`no\` — whether the
affected code reaches production.

Print the action, checking in this order:

- kind \`build\` → \`block\`
- kind \`test\` → \`block\`
- kind \`flaky\` → \`quarantine\`
- kind \`vulnerability\`, severity \`critical\`, shipped \`yes\` → \`block\`
- kind \`lint\` → \`block_overridable\`
- otherwise → \`warn\`

Then a final line \`blocking=<n>\`, counting \`block\` and \`block_overridable\` together.

A flaky test is neither blocked nor warned — it is removed from the suite with a ticket, and
that is a third option the other categories do not have.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# Three outcomes plus quarantine. A flaky test is its own case.
`,
        language: 'python',
        tests: [
          { input: 'test low no\n', expectedOutput: 'block\nblocking=1' },
          { input: 'flaky low no\n', expectedOutput: 'quarantine\nblocking=0' },
          { input: 'vulnerability critical yes\n', expectedOutput: 'block\nblocking=1' },
          { input: 'vulnerability critical no\n', expectedOutput: 'warn\nblocking=0' },
          { input: 'lint low yes\n', expectedOutput: 'block_overridable\nblocking=1' },
          { input: 'coverage medium yes\n', expectedOutput: 'warn\nblocking=0' },
          { input: 'build low no\n', expectedOutput: 'block\nblocking=1', isHidden: true },
          { input: '', expectedOutput: 'blocking=0', isHidden: true },
        ],
      },
      {
        title: 'Alert, dashboard, or delete?',
        description: `Read one candidate per line as
\`<is_symptom> <has_action> <fires_per_week> <leading_indicator>\`, where the first, second and
fourth are \`yes\` or \`no\` and the third is an integer.

Print the verdict, checking in this order:

- has_action \`no\` → \`dashboard\`
- fires_per_week above 5 → \`tune_threshold\`
- is_symptom \`yes\` → \`alert\`
- leading_indicator \`yes\` → \`alert\`
- otherwise → \`dashboard\`

Then a final line \`alerts=<n>\`.

No action means no alert, whatever else is true — that check comes first because it is the one
people skip.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# An alert with no response is a dashboard. Something firing constantly is mistuned.
`,
        language: 'python',
        tests: [
          { input: 'yes yes 1 no\n', expectedOutput: 'alert\nalerts=1' },
          { input: 'yes no 1 no\n', expectedOutput: 'dashboard\nalerts=0' },
          { input: 'yes yes 20 no\n', expectedOutput: 'tune_threshold\nalerts=0' },
          { input: 'no yes 1 yes\n', expectedOutput: 'alert\nalerts=1' },
          { input: 'no yes 1 no\n', expectedOutput: 'dashboard\nalerts=0' },
          { input: 'no no 50 yes\n', expectedOutput: 'dashboard\nalerts=0', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'CI/CD and Monitoring Practice',
      description: 'Decide what blocks and what alerts, then build a real pipeline and a minimal alerting setup.',
      instructions: `Complete both exercises, then:

1. For the first: a critical vulnerability in code that does not ship is a \`warn\`. Argue
   against that, and say what would change your mind.
2. For the first: \`block_overridable\` needs an override mechanism. Describe one that is
   usable at 2am and still visible afterwards.
3. For the second: "no action means dashboard" is checked first. Give an alert you have seen,
   or can imagine, that fails this test, and say what should replace it.

**Then, build one.** Any project, any CI platform.

4. A pipeline: install with a cache, lint, test, build, all on every push.
5. **Report the per-stage timings.** Identify the largest and reduce it. Report both totals.
6. Cache keyed on the lockfile hash. **Show a hit and a miss**, and the time difference.
7. Build the artefact once, tagged by commit. Show that the deploy step rebuilds nothing.
8. A smoke test after deploy. **Show it failing** when you deploy something broken.
9. Write your block/warn/override policy as a list. Implement at least three of the gates.
10. **Two alerts only**: error rate and p95, on the main path, with thresholds from real data.
    Say how you chose the numbers.
11. A dashboard with those signals and deployment markers.
12. **Trigger an incident deliberately** and report how long until the alert fired.`,
      rubric: [
        { criterion: 'Block decisions', description: 'All kinds handled, including quarantine and the shipped condition.', maxPoints: 15 },
        { criterion: 'Alert decisions', description: 'All cases, with no-action taking precedence.', maxPoints: 15 },
        { criterion: 'A real pipeline with timings', description: 'Per-stage measured, the largest reduced, both totals reported.', maxPoints: 20 },
        { criterion: 'Cache and single build', description: 'Hit and miss shown with timings; deploy rebuilds nothing.', maxPoints: 15 },
        { criterion: 'A smoke test that fails', description: 'Demonstrated catching a broken deploy.', maxPoints: 15 },
        { criterion: 'Two alerts, tuned from data', description: 'Thresholds justified, and time-to-alert measured on a real incident.', maxPoints: 20 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]
`,
        tests: [
          { input: 'test low no\n', expectedOutput: 'block\nblocking=1' },
          { input: 'flaky low no\n', expectedOutput: 'quarantine\nblocking=0' },
          { input: 'vulnerability critical yes\n', expectedOutput: 'block\nblocking=1' },
          { input: 'lint low yes\n', expectedOutput: 'block_overridable\nblocking=1' },
          { input: 'build low no\n', expectedOutput: 'block\nblocking=1', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('A flaky test gets its own outcome because:',
        [['It should neither block nor be left in the suite', true],
          ['It fails too unpredictably to classify', false],
          ['It indicates a pipeline problem rather than a test one', false],
          ['It can be retried automatically', false]],
        'Quarantine with a ticket is the third option.'),
      mcq('"No action means dashboard" is checked first because:',
        [['It is the check people skip', true],
          ['It is the cheapest to evaluate', false],
          ['It applies to the most candidates', false],
          ['Actions are hard to define later', false]],
        'Whatever else is true, an alert with no response is not an alert.'),
      mcq('Something firing more than five times a week is:',
        [['Mistuned, whatever it measures', true],
          ['A genuine recurring incident', false],
          ['Correctly sensitive', false],
          ['Evidence of an unstable system', false]],
        'Tune the threshold from history before concluding anything else.'),
    ],
  },

  {
    unitCode: 'T3_CICD_MONITORING_MINI_PROJECT',
    notes: `Build a pipeline and an alerting setup, then cause an incident and measure how long
it took to find out.

The brief's measurement is **time to detection**. It is one number, it is what monitoring is
for, and almost nobody measures it on a student project.

Budget around two hours.`,
    assignment: {
      title: 'Mini Project — Time to Detection',
      description: 'Build a pipeline and minimal alerting, then trigger a real incident and measure how fast you found out.',
      instructions: `**Use** a deployed service of yours, or deploy one for this.

**Part one — the pipeline**

1. Install with a cache, lint, test, build — on every push.
2. Per-stage timings reported. **Total under ten minutes**, or explain why not.
3. Build once, tag by commit, deploy that artefact. Show nothing is rebuilt.
4. A smoke test after deploy that checks a real endpoint.
5. Secrets from the platform store. **Show that none appear in the logs**, including in a step
   that echoes its environment.
6. A branch protection rule requiring the pipeline.

**Part two — the policy**

7. Write your block / warn / override list. At least six kinds of finding.
8. Implement three gates. Show one blocking a merge.
9. Implement the override. Use it once, and show the record it left.

**Part three — monitoring, minimal**

10. **Two alerts only.** Error rate and p95 on the main path.
11. Thresholds chosen from at least a week of real data, or from a load test. **Show the data
    and the reasoning.**
12. Each alert links to a runbook entry saying what to do.
13. A dashboard with the four signals and deployment markers.
14. An absence alert: if no deploy-verification has succeeded in 24 hours, something fires.

**Part four — the measurement**

15. **Cause a real incident.** Deploy something that returns errors for a fraction of requests,
    or make a dependency unavailable.
16. **Record the time it started and the time the alert fired.** Report the difference.
17. Follow your own runbook. Report anything it was missing.
18. Roll back. Time it.
19. Repeat with a subtler incident — a latency increase rather than errors. Report time to
    detection again.

**Part five — review**

20. Which signal moved first in each incident?
21. Would a different threshold have found it sooner? What would that have cost in false
    alarms?
22. What would you add, and what would you delete?

**Submit** the pipeline configuration, the policy list, the threshold reasoning, the two
incidents with their detection times, and the review.`,
      rubric: [
        { criterion: 'A real pipeline', description: 'Cached, timed, under ten minutes, building once and deploying that artefact.', maxPoints: 20 },
        { criterion: 'Secrets kept out, gates enforced', description: 'Absent from logs; a blocked merge and a recorded override shown.', maxPoints: 15 },
        { criterion: 'Two alerts from real data', description: 'Thresholds justified from a week of data or a load test.', maxPoints: 15 },
        { criterion: 'Runbooks and absence', description: 'Each alert linked to an action; an absence check in place.', maxPoints: 10 },
        { criterion: 'Two incidents, timed', description: 'Both caused, both detection times measured, including the subtle one.', maxPoints: 25 },
        { criterion: 'The review', description: 'Which signal moved first, what a different threshold would cost, what to delete.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('The measurement this project turns on is:',
        [['Time to detection', true],
          ['Pipeline duration', false],
          ['Deployment frequency', false],
          ['Rollback time', false]],
        'It is what monitoring is for, and almost nobody measures it on a student project.'),
      mcq('The subtle incident — latency rather than errors — is included because:',
        [['Detection time for a gradual problem is usually much worse', true],
          ['It exercises a different alerting channel entirely', false],
          ['Errors are easier to simulate', false],
          ['It exercises the dashboard', false]],
        'And it is the kind that runs for hours unnoticed.'),
      mcq('Asking what a lower threshold would cost in false alarms:',
        [['Makes the detection-time trade-off explicit', true],
          ['Justifies the current threshold', false],
          ['Measures how reliable the alert actually is', false],
          ['Is required before changing it', false]],
        'Faster detection is not free, and the cost is trust.'),
    ],
  },

  /* ══ T3_CLOUD_CONFIG ════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_CLOUD_CONFIG_ONE_BUILD_THREE_ENVIRONMENTS',
    notes: `The deployment topic argued for one build promoted through environments. **This one
is about what that means when the environments are cloud accounts** and the differences are
larger than a connection string.

## What must be identical

**The artefact.** Byte for byte. The image tested in staging is the image in production.

**The deployment mechanism.** The same pipeline, the same commands. **If production is deployed
differently from staging, staging is not testing the deployment** — and the deployment is a
frequent source of failure.

**The shape of the infrastructure.** The same components in the same arrangement, defined by
the same code with different parameters.

## What legitimately differs

**Scale.** Two instances instead of twenty. One database instead of a replicated cluster.

**Data.** Anonymised, generated, or a subset.

**Credentials and endpoints.** Different accounts, different secrets.

**External integrations.** Sandbox rather than live.

**Cost controls.** Staging shuts down overnight; production does not.

## Parameterising the infrastructure

**One definition, a variables file per environment.**

    environments/staging.tfvars     instance_count = 2
    environments/production.tfvars  instance_count = 20

**Not a copy per environment.** Copies drift — a fix applied to one and not the others — and
the drift is discovered during an incident.

**And separate accounts or projects per environment.** It is the strongest possible boundary: a
mistake in staging cannot touch production, and the permissions can differ. **Sharing one
account with naming conventions is the arrangement that produces the story about somebody
deleting the wrong database.**

## Configuration at runtime

**From the environment**, as the deployment topic established.

**Validated at startup.** Missing configuration fails immediately rather than on the first
request.

**And no environment-conditional behaviour in the code.** \`if env == 'production'\` means
production behaves differently from anywhere you tested, which is precisely what the whole
practice exists to prevent.

## The differences you cannot remove

**Be explicit about them**, because they are where the surprises come from:

- **Data volume.** Staging has a thousand rows; production has fifty million. Every performance
  problem hides here.
- **Concurrency.** One user against a thousand.
- **The real integrations.** A sandbox payment provider behaves differently from the live one.
- **Time.** Production has been running for two years and has accumulated states staging never
  reaches.

**Write the list down.** A staging environment whose differences are known is evidence; one
whose differences are unknown is confidence, and the environments unit made that argument
already.

## Promotion

**The artefact moves; it is not rebuilt.**

**A promotion is a deployment of an existing tag to the next environment**, and it should be
one command. If promoting requires a rebuild, you have three builds and three chances for them
to differ.

## Ephemeral environments

**A per-branch environment, created on open and destroyed on merge**, is the most valuable
thing you can add here if the cost allows.

**It requires the infrastructure to be code and the setup to be automated** — which is the
same discipline as everything else in this track, and the payoff is that review happens against
a running system rather than a diff.`,
    mcqs: [
      mcq('If production is deployed differently from staging:',
        [['Staging is not testing the deployment', true],
          ['The two environments will drift apart over time', false],
          ['The artefact may differ', false],
          ['Rollback becomes unreliable', false]],
        'And the deployment is a frequent source of failure.'),
      mcq('A copy of the infrastructure definition per environment:',
        [['Drifts, and the drift is discovered during an incident', true],
          ['Is clearer to read than parameterisation', false],
          ['Allows environment-specific optimisation', false],
          ['Is required for separate accounts', false]],
        'One definition, a variables file per environment.'),
      mcq('Sharing one cloud account across environments:',
        [['Produces the story about somebody deleting the wrong database', true],
          ['Is acceptable with strict naming conventions', false],
          ['Simplifies permission management', false],
          ['Reduces cost meaningfully', false]],
        'Separate accounts are the strongest possible boundary.'),
      mcq('A promotion should be:',
        [['A deployment of an existing tag, in one command', true],
          ['A rebuild of the artefact from the same commit', false],
          ['A merge into the environment branch', false],
          ['A re-run of the full pipeline', false]],
        'If it rebuilds, you have three builds and three chances to differ.'),
    ],
    checkpoint: [
      mcq('The difference between staging and production that hides every performance problem is:',
        [['Data volume', true], ['Instance count', false],
          ['Network configuration', false], ['Credential scope', false]],
        'A thousand rows against fifty million.'),
      mcq('A staging environment whose differences are unknown provides:',
        [['Confidence rather than evidence', true],
          ['A useful approximation', false],
          ['Coverage of the common failures', false],
          ['A valid pre-production check', false]],
        'Write the list of known differences down.'),
      mcq('Ephemeral per-branch environments require:',
        [['Infrastructure as code and automated setup', true],
          ['A separate cloud account per developer', false],
          ['A shared staging database', false],
          ['Manual approval before creation', false]],
        'And the payoff is review against a running system rather than a diff.'),
    ],
  },

  {
    unitCode: 'T3_CLOUD_CONFIG_SECRETS_IN_INFRASTRUCTURE',
    notes: `The secure coding topic said: rotate, never commit, and everything expires. **This
one distributes one secret to six consumers**, one of which is a build pipeline and one of
which is a container that restarts twenty times a day.

## Where secrets live

**A secret manager.** The right answer for anything serious: access control, an audit trail,
versioning, and rotation support.

**The platform's own secret objects**, mounted into containers or injected as environment
variables.

**Environment variables** — the baseline. **They leak into logs, crash dumps, child processes
and anything that prints the environment**, so they are what you use when nothing better is
available rather than the target.

**Never:** in the image, in the repository, in the pipeline definition, in a configuration file
that is committed.

## How a running service gets one

**Injected at start.** Simple, and the secret is in the process environment for its lifetime.

**Mounted as a file.** Slightly better — it is not in the environment, and it can be updated
without restarting if the platform supports it.

**Fetched at runtime** from the secret manager, using the service's own identity. **The best
option**: nothing is stored, rotation is immediate, and every access is audited.

**The last one requires the service to have an identity**, which is what the access unit is
about — and it is the mechanism that removes the bootstrap problem: the service does not hold a
credential to fetch credentials, it *is* something the platform recognises.

## The pipeline's secrets

**A build pipeline needs credentials** to push images and to deploy.

**Scope them.** The build does not need production deployment rights. **A pipeline compromised
through a malicious dependency is a real attack path**, and a scoped credential limits what it
reaches.

**Do not echo.** A step printing its environment writes your secrets to a log that may be
public.

**And prefer short-lived credentials** issued to the pipeline by the cloud provider over a
long-lived key stored in the platform. **A stored key is a key that can be stolen; an issued
one expires in an hour.**

## Rotation, in an infrastructure

**The hard part is not generating a new secret. It is that six things use it.**

**The pattern is expand and contract, again:**

1. Create the new secret alongside the old.
2. Update consumers to accept either — or update them one at a time, if the resource allows
   two valid credentials.
3. Switch each consumer to the new one.
4. Verify nothing is using the old one. **The audit log is what tells you**, and without it
   this step is a guess.
5. Revoke the old one.

**Rotating by replacing the value and hoping is how an outage happens at 3am**, and it happens
to teams who have rotated successfully several times before.

## What makes rotation possible at all

**Knowing who uses what.** An inventory: which secret, which consumers, where each gets it,
who owns it.

**Without that inventory, rotation is a series of outages**, discovered one consumer at a time.

**And rehearse it.** The deployment topic's argument about rollback applies exactly: a rotation
nobody has performed is a procedure, not a capability.

## When one leaks

**Rotate first**, as the core topic said. Then revoke, then check the audit log for use, then
clean up, then write down how it happened.

**In an infrastructure the first step is harder**, because rotating means touching six
consumers. **Which is the argument for the inventory and the rehearsal**, made concrete: the
moment you need it is the moment you have least time.`,
    mcqs: [
      mcq('Fetching a secret at runtime using the service’s own identity is best because:',
        [['Nothing is stored, rotation is immediate, and access is audited', true],
          ['It is measurably faster than injection at start', false],
          ['It avoids the need for a secret manager', false],
          ['It works without platform support', false]],
        'And it removes the bootstrap problem — the service is something the platform recognises.'),
      mcq('A build pipeline’s credentials should be scoped because:',
        [['A pipeline compromised through a dependency is a real attack path', true],
          ['Broad credentials measurably slow the build down', false],
          ['Scoping is required by most platforms', false],
          ['It simplifies the audit log', false]],
        'The build does not need production deployment rights.'),
      mcq('Short-lived issued credentials beat a stored long-lived key because:',
        [['A stored key can be stolen; an issued one expires in an hour', true],
          ['They are rather easier to configure initially', false],
          ['They avoid the secret manager entirely', false],
          ['They can be scoped more narrowly', false]],
        'The exposure window is bounded by construction.'),
      mcq('The hard part of rotating a secret in an infrastructure is:',
        [['That six things use it', true],
          ['Generating a sufficiently strong value', false],
          ['Updating the secret manager', false],
          ['Coordinating the revocation timing', false]],
        'Expand and contract, again.'),
    ],
    checkpoint: [
      mcq('Without an inventory of who uses each secret, rotation is:',
        [['A series of outages discovered one consumer at a time', true],
          ['Slower but still safe', false],
          ['Possible with a coordinated restart', false],
          ['Handled automatically by the secret manager itself', false]],
        'Which secret, which consumers, where each gets it, who owns it.'),
      mcq('Verifying nothing uses the old secret before revoking requires:',
        [['The audit log', true],
          ['A restart of every consumer', false],
          ['A grace period of several days', false],
          ['Confirmation from each owner', false]],
        'Without it, that step is a guess.'),
      mcq('A rotation nobody has performed is:',
        [['A procedure, not a capability', true],
          ['Adequate if documented', false],
          ['Safe because the steps are standard', false],
          ['Testable only in production', false]],
        'The rollback argument, applied to secrets.'),
    ],
  },

  /* ══ T3_CLOUD_SECURITY ══════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_CLOUD_SECURITY_LEAST_ACCESS',
    notes: `**Give every identity the least access it can work with.** The authorization
topic's argument, arriving where a wildcard granted "temporarily" becomes the finding in
somebody's breach report.

## Why it matters more here

In an application, a missing check exposes one resource. **In an infrastructure, an
over-permissioned identity exposes everything that identity can reach** — and cloud identities
routinely can reach a great deal.

**A compromised service with broad permissions is not a service compromise. It is an account
compromise.**

## What gets over-permissioned

**A service's role**, because narrowing it required finding out exactly what it needs and a
wildcard worked immediately.

**A developer's access**, because it was easier to grant administrator than to work out the
list.

**A pipeline's credential**, because it deploys several things and one broad grant covered them
all.

**A shared role** used by four services, which necessarily has the union of what all four need
— **so each of them has three permissions it does not need.**

## Getting it right

**Start from nothing and add what fails.** Deploy with minimal permissions, watch the errors,
grant precisely what each one names. **Tedious once, and the result is genuinely minimal** —
which no amount of reasoning from a list produces.

**One identity per service.** Not shared, so nothing inherits another's needs.

**Scope to resources, not just actions.** "Read objects from *this* bucket", not "read objects".

**Time-bound elevated access.** A developer needing production access for an investigation gets
it for four hours, not permanently. **The permanent grant made during an incident is the one
that is still there two years later.**

**No long-lived keys where an identity will do.** A service with a platform identity needs no
stored credential at all.

## Reviewing it

**Find the unused permissions.** Most providers report what an identity has actually used.
**Anything unused for ninety days is a candidate for removal**, and that single report is the
most effective cleanup tool available.

**Find the wildcards.** Each one, and ask why.

**Find identities nobody owns.** A role created for a project that ended.

**And find the long-lived keys**, with their last-used dates. The unused ones are pure exposure.

## The argument you will have

**"It is faster to grant broad access and narrow it later."**

**Later does not come.** The narrowing is never urgent, and the broad grant is invisible until
an incident makes it the headline.

**The counter-argument that works** is not about principle: **it is that the effort is the same
either way, and doing it first means doing it once.** Narrowing afterwards means working out
what is needed while being careful not to break anything, which is strictly harder than
starting from nothing.

## What good looks like

- One identity per service, with resource-scoped permissions.
- No wildcards, or a written reason for each.
- No long-lived keys where a platform identity is possible.
- Elevated human access time-bound and logged.
- A quarterly review of unused permissions.

**None of this is difficult.** It is a list of things that are individually easy and are
skipped because each one is slightly slower than the alternative on the day.`,
    mcqs: [
      mcq('An over-permissioned service identity means:',
        [['A service compromise is an account compromise', true],
          ['A considerably larger audit log to review', false],
          ['Slower permission evaluation', false],
          ['A higher chance of misconfiguration', false]],
        'Cloud identities routinely reach a great deal.'),
      mcq('A role shared by four services:',
        [['Gives each of them three permissions it does not need', true],
          ['Simplifies the permission model usefully', false],
          ['Is acceptable if the services are related', false],
          ['Reduces the number of identities to audit', false]],
        'It necessarily holds the union of all four.'),
      mcq('The way to arrive at genuinely minimal permissions is:',
        [['Start from nothing and add what the errors name', true],
          ['Reason carefully from the service’s requirements', false],
          ['Copy the role from a similar existing service', false],
          ['Start broad and remove what goes unused', false]],
        'No amount of reasoning from a list produces the same result.'),
      mcq('The counter-argument to "grant broad and narrow later" that works is:',
        [['The effort is the same, and doing it first means doing it once', true],
          ['Broad access straightforwardly violates security policy', false],
          ['Auditors will require the narrowing', false],
          ['Broad grants are harder to document', false]],
        'Narrowing afterwards means avoiding breakage, which is strictly harder.'),
    ],
    checkpoint: [
      mcq('The most effective cleanup tool available is:',
        [['The report of permissions an identity has not used', true],
          ['A list of all wildcards in use', false],
          ['An inventory of every identity listed by its owner', false],
          ['The audit log of denied actions', false]],
        'Anything unused for ninety days is a candidate for removal.'),
      mcq('Elevated human access granted during an incident:',
        [['Is the grant that is still there two years later', true],
          ['Expires with the incident ticket', false],
          ['Is logged and therefore acceptable', false],
          ['Should have been granted at the account level instead', false]],
        'Time-bound, or it becomes permanent.'),
      mcq('The list of what good looks like is described as:',
        [['Individually easy, and skipped because each is slower on the day', true],
          ['Achievable only with dedicated security tooling', false],
          ['A standard most teams already meet', false],
          ['Too demanding for a small team', false]],
        'None of it is difficult.'),
    ],
  },

  {
    unitCode: 'T3_CLOUD_SECURITY_WHAT_IS_EXPOSED',
    notes: `**What of yours can be reached from the internet, and did you mean all of it?**

Most cloud security incidents are not sophisticated attacks. **They are something being
reachable that nobody intended to expose**, found by an automated scanner within minutes of
appearing.

## The list to check

**Storage buckets.** Public read is one setting, and it is the most reported cloud breach there
is. **Check every bucket**, and check whether "public" means listing as well as reading — a
bucket that lists its contents hands an attacker an index.

**Databases.** Should accept connections only from the application. **A database with a public
address is found by scanners in minutes**, and default credentials are tried immediately.

**Management interfaces.** Admin panels, dashboards, monitoring tools, message broker consoles.
**Frequently deployed with a default password and a public address**, and frequently forgotten.

**Development and staging environments.** Often less hardened, often with real data, and often
nobody's responsibility. **This is the route that catches teams who have secured production
carefully.**

**Debug endpoints.** Health checks that dump configuration, profiling endpoints, verbose error
pages.

**Ports left open.** A security group opened for debugging and never closed.

## How to find out

**Look from outside.** Not at your configuration — at what is actually reachable.

**A port scan of your own addresses.** Legal against your own infrastructure, quick, and it
answers the question directly rather than by inference.

**Try the obvious paths.** \`/admin\`, \`/.env\`, \`/.git/\`, \`/actuator\`, \`/metrics\`. **Scanners try
these within minutes of a server appearing; try them yourself first.**

**The provider's own tools.** Every cloud has a service that reports publicly accessible
resources. Run it and read it.

**And search your own frontend bundle** for keys, as the web security topic said.

## Reducing it

**Private by default.** Everything in a private subnet unless there is a reason.

**One entry point.** A load balancer, terminating TLS, forwarding to private services. **The
smaller the public surface, the less there is to get wrong.**

**Restrict by source where you can.** A management interface reachable only from a known
network is dramatically safer than one with a strong password.

**Authenticate everything**, including internal services. **The network is not a security
boundary** — this is the "behind the VPN" assumption the threat modelling unit listed, and
internal services are the least hardened things you own.

**Delete what you are not using.** An unused environment is an attack surface with no
compensating value, and it is also on the bill.

## Monitoring for change

**Something becomes exposed later.** A configuration change, a new resource, somebody
debugging.

**So check continuously**, not once. Most providers offer a rule that alerts when a resource
becomes publicly accessible, and turning it on takes minutes.

**And review after every infrastructure change.** The change that exposed something is almost
never the change that intended to.

## The exercise worth doing today

**Take a project you have deployed. Scan it from outside. Try the obvious paths.**

**It takes fifteen minutes and it frequently finds something**, and finding it yourself is a
considerably better outcome than the alternative.`,
    mcqs: [
      mcq('Most cloud security incidents are:',
        [['Something reachable that nobody intended to expose', true],
          ['Sophisticated targeted attacks', false],
          ['Credential theft through phishing', false],
          ['Vulnerabilities in the provider', false]],
        'Found by an automated scanner within minutes of appearing.'),
      mcq('A bucket that lists its contents publicly:',
        [['Hands an attacker an index', true],
          ['Is equivalent to public read', false],
          ['Is safe if the object names are random', false],
          ['Only exposes metadata', false]],
        'Check whether public means listing as well as reading.'),
      mcq('The route that catches teams who secured production carefully is:',
        [['Development and staging environments', true],
          ['Publicly reachable management interfaces', false],
          ['Debug endpoints', false],
          ['Storage buckets', false]],
        'Less hardened, often with real data, and nobody’s responsibility.'),
      mcq('Checking what is exposed should be done by:',
        [['Looking from outside, not at the configuration', true],
          ['Reviewing the infrastructure code line by line', false],
          ['Auditing the security group rules', false],
          ['Asking the provider for a report', false]],
        'It answers the question directly rather than by inference.'),
    ],
    checkpoint: [
      mcq('"The network is not a security boundary" means:',
        [['Internal services must authenticate too', true],
          ['Private subnets provide no protection', false],
          ['VPNs should not be used', false],
          ['All traffic must be encrypted', false]],
        'The "behind the VPN" assumption from threat modelling.'),
      mcq('Checking exposure once rather than continuously misses:',
        [['A resource that becomes exposed by a later change', true],
          ['Resources created in other regions', false],
          ['Temporary debugging access', false],
          ['Exposure through third-party integrations', false]],
        'And the change that exposed it is almost never the one that intended to.'),
      mcq('An unused environment is:',
        [['An attack surface with no compensating value, and on the bill', true],
          ['Harmless as long as nothing is deployed into it', false],
          ['Worth keeping for future use', false],
          ['Protected by the account boundary', false]],
        'Delete what you are not using.'),
    ],
  },

  /* ══ T3_CLOUD_PROJECT ═══════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_CLOUD_PROJECT_BRIEF',
    notes: `Write down what you are deploying, how, and what done means.

The risk specific to a deployment project is **the thing that works once**. It is running, you
cannot reproduce it, you cannot explain how it got there, and nobody else can operate it.

## Choose something you have already built

**Do not build a new application for this.** The subject is the infrastructure, and a new
application is a distraction that will consume the time.

**Ideally the backend project from S12**, which gives you a real service with auth, a database
and tests.

## The brief

1. **What you are deploying**, and what it needs: compute, a data store, anything external.
2. **The shape**: public entry point, private everything else, which components.
3. **The environments**: how many, what differs between them.
4. **The pipeline**: what runs, what blocks, what deploys.
5. **The monitoring**: which two alerts, and what threshold.
6. **The budget**: what you expect it to cost, and the alert threshold.
7. **The rollback**: how, and how long it should take.

## The definition of done

- [ ] Budget alert set before anything is created
- [ ] All infrastructure defined as code, in version control
- [ ] Nothing clicked in a console that is not also in the code
- [ ] Compute and data store in private subnets, proven unreachable
- [ ] One public entry point, with TLS
- [ ] Health checks: liveness and readiness, verifying different things
- [ ] Secrets from a secret store; none in the image, repository or pipeline file
- [ ] One identity per service, with no wildcard permissions
- [ ] A pipeline: test, build once, tag by commit, deploy that artefact
- [ ] A smoke test after deploy that has been seen to fail
- [ ] Two alerts, thresholds from real data, each linked to a runbook
- [ ] A rollback performed and timed
- [ ] The environment destroyed and recreated from code
- [ ] An exposure check run from outside
- [ ] A runbook somebody else followed

**The destroy-and-recreate item is the one that catches people**, and it is the one that proves
everything else.

## What this prevents

**The thing that works once.** Running, unreproducible, unexplainable.

**The clicked environment.** Nobody can review it, rebuild it or reason about it.

**The exposed resource.** Found by you rather than by somebody else.

**The unrecoverable deploy.** A rollback that has never been performed.

## Time

**Reserve a third for the proving**: destroy and recreate, the rollback, the exposure check,
the deliberate failures. **On this project the proving is the deliverable** — anybody can get
something running, and the work is showing it survives.`,
    mcqs: [
      mcq('The risk specific to a deployment project is:',
        [['The thing that works once and cannot be reproduced', true],
          ['Choosing the wrong provider for the workload', false],
          ['Exceeding the free tier', false],
          ['An insecure configuration', false]],
        'Running, unreproducible, unexplainable, and nobody else can operate it.'),
      mcq('You should not build a new application for this project because:',
        [['The subject is the infrastructure and it would consume the time', true],
          ['Existing applications are easier to deploy', false],
          ['New code is harder to secure', false],
          ['The assessment covers only deployment', false]],
        'Ideally reuse the backend project.'),
      mcq('The done-list item that catches people is:',
        [['Destroy and recreate from code', true],
          ['The exposure check run from outside', false],
          ['The timed rollback', false],
          ['Two alerts from real data', false]],
        'And it is the one that proves everything else.'),
      mcq('On a deployment project the reserved third is spent on:',
        [['Destroy and recreate, rollback, exposure check, deliberate failures', true],
          ['Writing all of the infrastructure code', false],
          ['Configuring the pipeline', false],
          ['Setting up monitoring', false]],
        'On this project the proving is the deliverable.'),
    ],
    checkpoint: [
      mcq('"Nothing clicked that is not also in the code" exists because:',
        [['A clicked change survives a rebuild and nobody knows it was there', true],
          ['Console access should be disabled', false],
          ['Clicking is slower than code', false],
          ['Providers log every console action separately anyway', false]],
        'It is what "did not come back cleanly" identifies.'),
      mcq('A smoke test that has been seen to fail:',
        [['Has demonstrated it can catch a broken deploy', true],
          ['Indicates the deploy process is unreliable', false],
          ['Should be made less strict', false],
          ['Proves the endpoint exists', false]],
        'A check nobody has seen fail may be checking nothing.'),
      mcq('Anybody can get something running, so the work is:',
        [['Showing it survives', true],
          ['Choosing the right architecture', false],
          ['Minimising the cost', false],
          ['Automating the deployment', false]],
        'Which is why a third of the time is reserved for proving it.'),
    ],
  },

  {
    unitCode: 'T3_CLOUD_PROJECT_BUILD',
    notes: `Take a repository to a running, monitored, reproducible service.

**The order below front-loads the things that cannot be added afterwards**: the budget alert,
the code-defined infrastructure, and the private-by-default shape. Retrofitting any of the
three means rebuilding.

Budget around three and a half hours of focused work.`,
    assignment: {
      title: 'Deployment Project — From Repository to Running Service',
      description: 'Deploy an existing application as code, with a pipeline, monitoring, secrets, least access, and proof it can be rebuilt.',
      instructions: `**Deploy** an application you have already built.

**Part one — before anything exists**

1. **Budget alert.** Show it, with the threshold and your cost estimate.
2. Tagging convention written down.
3. A repository for the infrastructure code.

**Part two — the infrastructure, as code**

4. Network with public and private subnets.
5. Compute in the private subnet, running your container.
6. A managed data store in the private subnet.
7. One public entry point with TLS.
8. Security groups referencing groups rather than ranges where possible.
9. **One identity per service, no wildcards.** List each permission and why it is needed.
10. Secrets from a secret store, fetched at runtime where the platform allows.

**Part three — the pipeline**

11. Test, lint, build once, tag by commit.
12. Deploy that artefact. **Show nothing is rebuilt.**
13. A smoke test against the deployed service. **Show it failing** on a deliberately broken
    deploy.
14. Pipeline credentials scoped to what they need. Show they cannot do more.
15. Per-stage timings reported.

**Part four — running it**

16. Liveness and readiness verifying different things.
17. Two alerts with thresholds from real data, each linked to a runbook entry.
18. A dashboard with the four signals and deployment markers.
19. Logs reaching somewhere queryable, with a request id.

**Part five — prove it**

20. **Exposure check from outside.** Port scan your addresses, try the obvious paths, run the
    provider's public-access report. **Report everything you found**, including nothing.
21. **Show the compute and the data store are unreachable directly.**
22. **Roll back.** Time it. Then roll back again a day later from the runbook alone.
23. **Destroy everything. Recreate from code with one command.** Report the time and anything
    that did not return.
24. Break it three ways — a wrong image tag, a missing secret, a security group rule removed —
    and report which diagnostic step found each.

**Part six — the numbers**

25. Cost estimate against actual. Largest line, and two reductions with their savings.
26. Pipeline duration, deploy duration, rollback duration.
27. Time to detection for one deliberate incident.

**Submit** the infrastructure repository, the pipeline configuration, the exposure report, the
destroy-recreate evidence, the three diagnoses, and the numbers.`,
      rubric: [
        { criterion: 'Budget and code first', description: 'Alert before creation; everything defined in version-controlled files.', maxPoints: 15 },
        { criterion: 'Private by default with least access', description: 'Unreachable compute and store; one identity per service with no wildcards.', maxPoints: 20 },
        { criterion: 'A real pipeline', description: 'Build once, deploy that artefact, scoped credentials, a smoke test seen to fail.', maxPoints: 20 },
        { criterion: 'Monitored', description: 'Two tuned alerts with runbooks, a dashboard with deployment markers.', maxPoints: 15 },
        { criterion: 'Exposure checked from outside', description: 'Scan, obvious paths, provider report — with findings stated either way.', maxPoints: 15 },
        { criterion: 'Rebuilt and recovered', description: 'Destroy and recreate in one command; rollback timed twice, once cold.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('The three things that cannot be added afterwards are:',
        [['The budget alert, the code-defined infrastructure, and the private shape', true],
          ['The pipeline, the monitoring, and the runbook', false],
          ['The health checks, the secrets, and the service identities', false],
          ['The smoke test, the rollback, and the dashboard', false]],
        'Retrofitting any of the three means rebuilding.'),
      mcq('Reporting an exposure check that found nothing:',
        [['Is required — the coverage is the finding', true],
          ['Is unnecessary if nothing was wrong', false],
          ['Suggests the check was too narrow', false],
          ['Should be omitted from the submission', false]],
        'The same standard as the security audit: say what you covered.'),
      mcq('Rolling back a day later from the runbook alone tests:',
        [['Whether the procedure works without the author', true],
          ['Whether the artefact is still available', false],
          ['How much the timing varies', false],
          ['Whether the rollback is idempotent', false]],
        'The Linux project’s test, applied to a cloud deployment.'),
    ],
  },

  {
    unitCode: 'T3_CLOUD_PROJECT_EXPLAIN',
    notes: `Explain the infrastructure — what you built, why, what it costs, and what happens
when it breaks.

**Infrastructure is unusually explainable**, because almost every decision has a stated trade:
a cost, a failure mode, a recovery time. A candidate who can put numbers on those sounds
completely different from one who lists the services they used.

## The questions

**"Walk me through what happens when a request arrives."** From DNS to the response. **Practise
this out loud** — it is harder than it sounds and it demonstrates whether you understand your
own system.

**"What is public and what is not?"** The single most revealing question in a cloud interview.
Have the answer, and have the evidence that you checked from outside.

**"What happens if this component fails?"** Per component. Some answers will be "it goes down",
and that is a fine answer if you know it and have decided it is acceptable.

**"How do you deploy, and how do you undo it?"** With the timings.

**"How would you know it was broken?"** The alerts, the thresholds, and the measured time to
detection.

**"What does it cost, and where does the money go?"** Have the number and the largest line.
**Almost no graduate can answer this**, and the reason is not that it is hard.

**"What permissions does the service have?"** If the answer is administrator, they will notice.

## The four-sentence shape

> "The database is in a private subnet with a security group that only accepts connections from
> the application's group, so it is not reachable from the internet and I verified that with a
> scan. It costs about £9 a month, which is the largest single line. It means I cannot connect
> to it directly for debugging without a bastion or a port forward, which was mildly annoying
> twice. If I were doing it again I would set up the port-forward script at the start rather
> than each time I needed it."

**What, why, what it cost, what I would change.** The fourth sentence, again.

## Talking about failure

**"It goes down" is an acceptable answer** for a single-instance component in a student
project, provided you say it deliberately: "I run one instance, so a node failure is about two
minutes of downtime while it is rescheduled. For this project that is fine; for something with
users I would run two across zones, and the cost would roughly double."

**That reads as judgement.** Claiming high availability you do not have does not survive the
follow-up question.

## What to have ready

**A diagram.** One page: the components, the boundaries, what is public.

**The numbers.** Cost, pipeline duration, deploy duration, rollback duration, time to
detection.

**Three decisions** in the four-sentence form. The compute choice, the network shape, and the
secret handling are good candidates.

**One thing that broke**, and how you diagnosed it. The three-state sequence or the inside-out
network order — **naming the method is what they are listening for**.

**One thing you would do differently**, and one thing you deliberately did not do. "I did not
set up multi-region because there is no requirement for it and it would have tripled the
complexity" is a better answer than having done it.

## The thing that distinguishes you

**Say what you measured.** Not "it is fast" but "p95 is 180ms". Not "it is cheap" but "£14 a
month, mostly the database". Not "it recovers" but "I rolled back in 90 seconds, and again
from the runbook a day later in two minutes because I had missed a step".

**Measurement is the whole signal here**, and it is available to anybody willing to write the
numbers down.`,
    mcqs: [
      mcq('The single most revealing question in a cloud interview is:',
        [['What is public and what is not', true],
          ['Which cloud provider did you choose to use', false],
          ['How do you deploy', false],
          ['What does it cost', false]],
        'Have the answer, and the evidence that you checked from outside.'),
      mcq('"It goes down" as a failure answer is:',
        [['Acceptable when said deliberately, with the cost of fixing it', true],
          ['Never an acceptable answer in an interview', false],
          ['Only acceptable for non-production', false],
          ['A sign the design is inadequate', false]],
        'Claiming availability you do not have does not survive the follow-up.'),
      mcq('Almost no graduate can answer the cost question because:',
        [['Nobody writes the number down, not because it is hard', true],
          ['Cloud billing is genuinely opaque to read', false],
          ['Student projects use only free tiers', false],
          ['Costs vary too much to state', false]],
        'Which is exactly why answering it stands out.'),
      mcq('Naming the diagnostic method when describing a failure:',
        [['Is what the interviewer is listening for', true],
          ['Shows a working familiarity with the tooling', false],
          ['Proves the failure was real', false],
          ['Demonstrates the system is observable', false]],
        'The three-state sequence, or the inside-out network order.'),
    ],
    checkpoint: [
      mcq('Infrastructure is unusually explainable because:',
        [['Almost every decision has a cost, a failure mode and a recovery time', true],
          ['The components are standardised', false],
          ['Diagrams convey it well', false],
          ['Providers document all of the trade-offs clearly', false]],
        'A candidate who puts numbers on those sounds completely different.'),
      mcq('"I did not set up multi-region" is:',
        [['A better answer than having done it, if the reason is given', true],
          ['A gap that ought to be acknowledged as a real weakness', false],
          ['Acceptable only for small projects', false],
          ['Something to avoid mentioning', false]],
        'No requirement, and it would have tripled the complexity.'),
      mcq('The whole signal in this interview is:',
        [['What you measured', true],
          ['Which services you used', false],
          ['How the architecture is shaped', false],
          ['Whether it follows best practice', false]],
        'Available to anybody willing to write the numbers down.'),
    ],
  },
];
