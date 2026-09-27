/**
 * T4_LINUX_CLOUD and T4_SECURITY_ENGINEERING — fourteen units. Module P03, days 18-19.
 *
 * ── WHY A PLACEMENT YEAR TEACHES DEPLOYMENT AT ALL ────────────────────────────────────────
 *
 * Because "it works on my machine" is the most common single reason a student's project cannot
 * be shown to anybody, and an unshowable project is worth nothing in a project round. A
 * deployed thing with a URL is worth more in an interview than a better thing that only runs
 * locally, and that is a fact about hiring rather than about engineering.
 *
 * It is also where the production project in P14 becomes possible. A capstone that is never
 * deployed cannot demonstrate error handling, logging or monitoring, so three of the spec's
 * production requirements would have nowhere to live.
 *
 * ── AND WHY SECURITY IS A DAY RATHER THAN A PARAGRAPH ─────────────────────────────────────
 *
 * Every direction needs it and only one direction specialises in it. A backend student who
 * cannot say where a validation check belongs, or a frontend student who has never thought
 * about what an injected script could do, has a gap an interviewer finds in one question.
 *
 * The day is deliberately about CLASSES rather than about a list of attack names. Knowing the
 * name of an attack is trivia; knowing that a reported instance is one of several and finding
 * the others is the skill, and it is the one that separates a candidate who has read about
 * security from one who has fixed something.
 *
 * ── THE JOIN BETWEEN THE TWO DAYS ─────────────────────────────────────────────────────────
 *
 * Secrets. They are a deployment concern and a security concern and they are the same concern,
 * which is why the secrets unit sits in the security topic and refers back to the deployment
 * one. A secret in a repository is the single most common real security failure in student work.
 *
 * Attribution: T4_LINUX_CLOUD defaults to LINUX_ADMINISTRATION with the containers unit on
 * CONTAINERS_DOCKER, the deploy unit on DEPLOYMENT and the project on CLOUD_FUNDAMENTALS;
 * T4_SECURITY_ENGINEERING to SECURE_CODING with the access-control unit on WEB_SECURITY and the
 * interview question on THREAT_MODELING.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const BUILD_OPS_BUNDLES: PilotBundle[] = [
  /* ══ T4_LINUX_CLOUD ═════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_LINUX_CLOUD_PROCESSES_AND_ENVIRONMENT',
    notes: `**"It works on my machine" has four causes**, and knowing them turns a mystery into a
checklist.

## The four

**A relative path.** It resolves from the working directory the command was run in, not from
where the file lives. Run the same script from two places and it looks for two different files.

**An environment variable** set in your shell and nowhere else. A database URL, an API key, a
locale. Unset, it expands to nothing and the command built from it silently becomes a different
command.

**A dependency installed globally** on your machine and declared nowhere, so a fresh checkout
does not have it.

**A file that is not committed.** A config, a fixture, a \`.env\`. It exists for you and does not
exist at all.

## The test that finds all four in ten seconds

**Clone into a fresh directory and run it.** Not your working copy — a new clone of what is
actually committed. This is the single most useful thing you can do before claiming something
works, and it is skipped almost universally.

## What a process actually has

**A working directory, an environment, a user, and open file descriptors.** Every "permission
denied" and every "file not found" is one of those four differing from what you assumed.

**\`ps\`, \`env\` and \`pwd\` answer three of them directly**, and checking beats reasoning.

## Exit codes

**\`echo $?\` after a command.** Zero is success, anything else is failure, and scripts branch on
it. **A command that prints an error and exits zero is a bug in that command**, and everything
downstream will treat it as having worked.

## Redirection, briefly

\`>\` replaces, \`>>\` appends, \`2>&1\` sends errors to the same place as output. Most
"the log is empty" reports are errors going to stderr while only stdout was captured.`,
    mcqs: [
      mcq('An empty log file from a command that clearly failed is usually because errors went to:',
        [['stderr, while only stdout was captured', true],
         ['a buffer that was never flushed to the disk', false],
         ['the terminal, which does not write to any file', false],
         ['a different file chosen by the program itself', false]],
        'Redirecting output alone captures stdout. Diagnostics conventionally go to stderr, so they reach the terminal and never the file.'),
      mcq('A process has a working directory, an environment, a user and open descriptors. Every "permission denied" is one of those:',
        [['Differing from what you assumed', true],
         ['Being unavailable on the target machine used', false],
         ['Having been changed by a previous command run', false],
         ['Requiring elevation that the shell did not grant', false]],
        'The four are the whole of a process’s context. A permission failure means the user, or the path, is not the one you had in mind.'),
      mcq('The single most useful check before claiming something works is to:',
        [['Clone it fresh and run it from there', true],
         ['Run the complete test suite on your working copy', false],
         ['Review every file that has been committed to it', false],
         ['Ask a colleague to follow the setup instructions', false]],
        'A fresh clone contains exactly what is committed, so uncommitted files, global installs and local environment all reveal themselves at once.'),
    ],
    checkpoint: [
      mcq('A script works from its own directory and fails from the repository root because a relative path resolves from:',
        [['Where the command was run', true],
         ['Where the script file itself is located', false],
         ['The user’s home directory in both of the cases', false],
         ['The root of the repository the script is in', false]],
        'The working directory is whatever shell invoked it. Running from elsewhere makes the same path string point at something different.'),
      mcq('A command that prints an error and exits zero is a bug because scripts:',
        [['Branch on the exit code, not on the output', true],
         ['Cannot read the error output of a child process', false],
         ['Treat any output at all as indicating success', false],
         ['Are expected to check both the code and the text', false]],
        'The exit code is the machine-readable result. Reporting success while having failed means everything downstream proceeds on a false premise.'),
    ],
  },
  {
    unitCode: 'T4_LINUX_CLOUD_CONTAINERS',
    notes: `**A container is the answer to the previous unit**, which is the most useful way to
understand what one is for.

## What it actually is

**A filesystem, plus a declaration of what to run.** Not a virtual machine — it shares the host's
kernel, which is why it starts in milliseconds rather than seconds.

**The image is the filesystem.** Your code, its dependencies, and the runtime, frozen. **The
container is a running instance of it**, and every instance of the same image starts identical.

## Why that solves the four causes

**The working directory is declared.** **The environment is declared.** **The dependencies are in
the image.** **Nothing uncommitted can be in it**, because the image is built from what the build
context contains.

**"It works in the container" transfers**, in a way "it works on my machine" does not.

## Layers, and why images get large

**Each instruction adds a layer**, and layers are cached. Ordering matters: put what changes
rarely first — installing dependencies — and what changes constantly last — copying your source.
Reverse them and every build reinstalls everything.

**A deleted file in a later layer is still in the image.** The earlier layer still has it, so
copying a secret and then deleting it leaves the secret in the image for anybody who looks.

## What belongs in the image and what does not

**In:** code, dependencies, the runtime.

**Not in:** secrets, configuration that differs per environment, data. Those arrive at run time
through the environment or a mounted volume, and the same image then runs in staging and
production unchanged — **which is the whole point, because it means the thing you tested is the
thing you deployed.**`,
    mcqs: [
      mcq('A container starts in milliseconds rather than seconds because it shares the host’s:',
        [['Kernel, rather than booting its own', true],
         ['Filesystem, which is already mounted and ready', false],
         ['Memory, which does not need to be allocated again', false],
         ['Network stack, avoiding the interface setup cost', false]],
        'There is no operating system to boot. A container is isolated processes on the host kernel, which is the difference from a virtual machine.'),
      mcq('Copying a secret into an image and deleting it in a later instruction leaves the secret:',
        [['In the earlier layer, still in the image', true],
         ['Removed, since the final filesystem excludes it', false],
         ['Present only while the build is still running', false],
         ['Encrypted, because layers are stored compressed', false]],
        'Layers are additive and all of them ship. A deletion hides the file from the final view without removing it from the image’s contents.'),
      mcq('Dependency installation should come before copying source code in a Dockerfile because layers are:',
        [['Cached, and source changes far more often', true],
         ['Executed in reverse order during the build', false],
         ['Limited in number, so they must be combined', false],
         ['Merged, so ordering affects the final size only', false]],
        'A changed layer invalidates everything after it. Source changes on every build, so putting it last keeps the expensive install cached.'),
    ],
    checkpoint: [
      mcq('Configuration that differs per environment belongs outside the image so that the image which was tested is:',
        [['The same image that gets deployed', true],
         ['Smaller than it would otherwise have been', false],
         ['Able to run without a network connection present', false],
         ['Rebuildable by anybody who has the source code', false]],
        'Baking configuration in means a separate image per environment, so the artefact under test is not the artefact released.'),
      mcq('"It works in the container" transfers where "it works on my machine" does not because the container declares:',
        [['The directory, environment and dependencies', true],
         ['A version of the operating system to use', false],
         ['The resources the process is permitted to use', false],
         ['Which user account the process will run under', false]],
        'Those three are the causes of machine-specific behaviour. Declaring them in the image is what makes the result reproducible elsewhere.'),
    ],
  },
  {
    unitCode: 'T4_LINUX_CLOUD_DEPLOYING',
    notes: `**Getting it deployed, and getting it back.** The second half is the part nobody
practises and everybody needs.

## What a deploy is

**Build an artefact, put it somewhere, start it, stop the old one.** Every deployment system is a
variation on those four steps with different amounts of automation around them.

**Doing it by hand once is worth more than reading about it three times**, because the failures
are specific and you meet them immediately.

## The pipeline

**Stages, with gates.** Build, test, deploy. **The gate is the point: a deploy must not happen
when the tests did not pass**, and a pipeline where it can is a pipeline that is decoration.

**Fast feedback first.** Lint and unit tests before the slow integration ones, so a typo fails in
thirty seconds rather than twelve minutes.

## The rollback

**Decided before you need it, not during.** The question is specifically: what do you do at
02:00 when the deploy is wrong?

**Keeping the previous artefact and being able to start it** is the simplest answer and covers
most cases.

**What it does not cover is a database migration.** Code rolls back; a dropped column does not.
**So a migration that removes or renames must be split** — deploy code that tolerates both
shapes, then migrate, then remove the tolerance. Three deploys, and it is the only sequence that
is reversible at every point.

## Zero downtime, briefly

**Start the new one, check it is healthy, move traffic, stop the old one.** Which requires that
two versions can run at once, which is the real constraint and the reason the migration rule
above exists.

## The health check

**Something that says whether the process is actually able to serve**, not merely that it is
running. A process that is up and cannot reach its database is worse than one that is down,
because nothing has noticed.`,
    mcqs: [
      mcq('A migration that drops a column cannot simply be rolled back with the code, so it must be:',
        [['Split across three deploys', true],
         ['Applied only after the code has been verified', false],
         ['Reversed by a second migration written upfront', false],
         ['Deployed together with the code that requires it', false]],
        'Tolerate both shapes, then migrate, then remove the tolerance. Any shorter sequence has a point at which rolling back the code leaves it broken.'),
      mcq('A pipeline where a deploy can proceed despite failing tests is:',
        [['Decoration, since the gate is what it is for', true],
         ['Acceptable when the failures are known flakes', false],
         ['Faster, which is a reasonable trade to make here', false],
         ['Normal, as most pipelines allow manual override', false]],
        'The entire value is refusing to ship something broken. Without that refusal the pipeline is an expensive way of running tests nobody acts on.'),
      mcq('A process that is running but cannot reach its database is worse than one that is down because:',
        [['Nothing has noticed that it cannot serve', true],
         ['It consumes resources without doing any work', false],
         ['It will eventually crash in a less obvious way', false],
         ['Restarting it will not resolve the underlying issue', false]],
        'A down process is detected and replaced. One that reports healthy while unable to serve receives traffic and fails every request silently.'),
    ],
    checkpoint: [
      mcq('Zero-downtime deployment requires that two versions can run at once, which is why:',
        [['Migrations must tolerate both code shapes', true],
         ['The artefact must be smaller than a set limit', false],
         ['Health checks have to run before traffic moves', false],
         ['The rollback must be automated rather than manual', false]],
        'During the overlap both versions are serving, so the schema has to satisfy both. That constraint is what forces the three-deploy migration sequence.'),
      mcq('Deciding the rollback before it is needed matters because the question is specifically what you do:',
        [['At 02:00, when the deploy is wrong', true],
         ['When the tests pass but the deploy still fails', false],
         ['If the previous artefact is no longer available', false],
         ['When two deploys are attempted at the same time', false]],
        'The decision has to be executable by somebody tired and under pressure. A plan invented at that moment is the plan most likely to make it worse.'),
    ],
  },
  {
    unitCode: 'T4_LINUX_CLOUD_DEBUGGING',
    notes: `**A deployment that is broken, with less information than you would like.**

## Work outward from the process

**Is it running?** \`ps\`, or the orchestrator's status. A container that exited immediately is a
different problem from one that is running and unresponsive.

**What did it say as it died?** The logs of the exited container, not the current one. **An
exited container's logs are the most commonly forgotten source of the answer**, because the
instinct is to restart it and try again — which destroys them.

**Can it reach what it needs?** From inside the container, not from your machine. The network
inside is not the network outside, and "the database is up" from your laptop says nothing.

## The four usual causes

**A missing environment variable.** The commonest by a distance. It expanded to nothing, and the
connection string is now malformed in a way the error message does not explain.

**A port that is not what you think.** The process listens on one and the container exposes
another.

**A permission.** The process runs as a different user in the container than on your machine, and
cannot write where it expects to.

**A path.** It works locally because of a file that is not in the image.

## The one that looks like a network problem

**DNS.** Inside a container, a hostname may resolve differently or not at all. **Test with an
address as well as a name**; if the address works and the name does not, you have found it in
thirty seconds rather than an hour.

## Restarting is not diagnosis

**It frequently fixes things**, which is exactly the danger: the cause remains and the next
occurrence is at a worse time with no more information than this one.`,
    mcqs: [
      mcq('The most commonly forgotten source of the answer when a container dies is:',
        [['The exited container’s own logs', true],
         ['The orchestrator’s event history for the service', false],
         ['The host machine’s system log around that time', false],
         ['The build output from when the image was created', false]],
        'The instinct is to restart and retry, which discards them. What the process said as it died is usually the whole explanation.'),
      mcq('Checking connectivity from inside the container rather than from your machine matters because the network inside is:',
        [['Not the network outside', true],
         ['Slower, which changes the timeout behaviour', false],
         ['Restricted to the ports that were exposed only', false],
         ['Shared with every other container on the host', false]],
        'Containers have their own network namespace and DNS. Reachability from your laptop says nothing about reachability from the process.'),
      mcq('If a hostname fails inside a container but its IP address works, the cause is:',
        [['DNS resolution within the container', true],
         ['A firewall rule blocking the named service', false],
         ['The service listening on the wrong port number', false],
         ['A certificate that does not match the hostname', false]],
        'The comparison isolates name resolution from connectivity, which turns an hour of network investigation into a thirty-second answer.'),
    ],
    checkpoint: [
      mcq('Restarting a failing service is dangerous precisely because it:',
        [['Frequently works, leaving the cause in place', true],
         ['Takes longer than diagnosing the problem does', false],
         ['Can corrupt data that was being written at the time', false],
         ['Resets the metrics that would have shown the fault', false]],
        'A successful restart ends the incident and preserves the fault. The next occurrence arrives at a worse moment with no more information.'),
      mcq('A container that exited immediately is a different problem from one that is running and unresponsive because the first:',
        [['Failed during startup, so its logs explain it', true],
         ['Is easier to restart than the second one is', false],
         ['Indicates a resource limit rather than a code fault', false],
         ['Will be retried automatically by the orchestrator', false]],
        'Startup failures are usually configuration and say so on the way out. An unresponsive running process is a different investigation entirely.'),
    ],
  },
  {
    unitCode: 'T4_LINUX_CLOUD_PRACTICE',
    notes: `**Getting things running somewhere that is not your machine, repeatedly.**

## What is being drilled

**The fresh-clone check**, until running it is automatic before claiming anything works.

**Declaring rather than assuming** — the directory, the environment, the dependencies. Each one
written down somewhere a machine reads.

**Reading a failure from inside the container** rather than from outside it.

## The exercises

Each gives you something that runs locally and fails when deployed. **Find which of the four
causes it is** — path, environment variable, undeclared dependency, uncommitted file — and fix it
so a fresh clone works.

## The habit that matters most

**Never claim it works without the fresh clone.** It takes ten seconds and it is the difference
between a project somebody can run and a project that only you can demonstrate.

**In an interview this is concrete:** "can I clone this and run it?" is a question people ask, and
"there are a few things you need to set up first" is an answer that ends the conversation about
the project.

## Time yourself

**Each of these should be minutes**, because the diagnosis is a four-item checklist rather than an
investigation. Slowness here means the checklist has not been internalised yet, which is exactly
what repetition fixes.`,
    mcqs: [
      mcq('"There are a few things you need to set up first" in answer to "can I clone this and run it" tends to:',
        [['End the conversation about the project', true],
         ['Prompt the interviewer to ask what they are', false],
         ['Be expected, since most projects need some setup', false],
         ['Suggest the project is more sophisticated than most', false]],
        'The reviewer has limited time and several candidates. A project that cannot be run in two minutes is a project that does not get assessed.'),
      mcq('The diagnosis for "works locally, fails deployed" should take minutes because it is:',
        [['A four-item checklist, not an investigation', true],
         ['Always caused by the environment configuration', false],
         ['Reported clearly in the deployment tool’s output', false],
         ['Solved by rebuilding the image from scratch again', false]],
        'Path, environment variable, undeclared dependency and uncommitted file cover nearly all of it, so the work is elimination rather than discovery.'),
    ],
    checkpoint: [
      mcq('Declaring the environment rather than assuming it means writing it somewhere:',
        [['A machine reads, not a human remembers', true],
         ['Version controlled, so changes are auditable', false],
         ['Documented, so a colleague can reproduce it', false],
         ['Encrypted, since it may contain sensitive values', false]],
        'A README instruction depends on somebody following it. A declaration in the image or the compose file is applied whether or not anybody reads it.'),
      mcq('Running the fresh-clone check before claiming something works takes ten seconds and distinguishes a project somebody can run from one that:',
        [['Only you can demonstrate', true],
         ['Requires documentation to be written for it', false],
         ['Has dependencies that are not yet published', false],
         ['Works on some operating systems and not others', false]],
        'Everything undeclared lives on your machine. Without the check, the project is a demonstration rather than an artefact anybody else can use.'),
    ],
  },
  {
    unitCode: 'T4_LINUX_CLOUD_INTERVIEW_QUESTION',
    notes: `**"How does your project get deployed?"** — and it is a much better question than it
sounds, because the answer reveals whether anything was ever actually run.

## What a strong answer contains

**A concrete route.** "It builds into a container, the pipeline runs the tests, and it deploys to
X." Not "I would use Docker", which is a plan rather than an account.

**Where configuration comes from.** Environment variables, and where they are set. Saying this
unprompted signals you have met the problem it solves.

**What happens when it breaks.** "The previous image is still there and I can start it." Even a
manual rollback is a real answer; not having one is the weak spot.

**One thing you got wrong.** A missing variable, a port mismatch, a migration you could not
reverse. This is the part that makes the account credible.

## The follow-ups

**"What if two people deploy at once?"** A lock, a queue, or an honest "it would conflict and I
have not handled it" — the last is fine and pretending otherwise is not.

**"How do you know it is working after a deploy?"** A health check and a look at the logs is
enough. "I open the page" is honest and weaker; **"I assume it worked" is the answer to avoid.**

**"What would you do differently at ten times the traffic?"** They are not asking you to design
for scale. They are checking whether you know which part would break first.

## The failure mode

**Naming tools rather than describing a route.** "Docker, Kubernetes, CI/CD" is a list. The
question was how your thing gets from a commit to running, and a list does not answer it.`,
    mcqs: [
      mcq('"I would use Docker" is weaker than "it builds into a container and deploys to X" because the first is:',
        [['A plan rather than an account', true],
         ['Less specific about the technology involved', false],
         ['Missing the detail of which base image was used', false],
         ['Phrased conditionally, which sounds uncertain here', false]],
        'The question asks what happens, not what you would choose. A conditional answer suggests the thing has never actually been deployed.'),
      mcq('Asked how you know a deploy worked, the answer to avoid is:',
        [['That you assume it worked', true],
         ['That you open the page and look at it', false],
         ['That you check the health endpoint afterwards', false],
         ['That you read the logs for the first few minutes', false]],
        'Opening the page is honest and basic. Assuming success means nothing would have told you, which is the gap the question is probing for.'),
      mcq('"What would you do differently at ten times the traffic?" is checking whether you know:',
        [['Which part would break first', true],
         ['How to design a system for high scale', false],
         ['Which cloud services handle scaling automatically', false],
         ['Whether your project has been load tested already', false]],
        'Nobody expects a placement candidate to have built for scale. Knowing where the first bottleneck is shows the system is understood rather than assembled.'),
    ],
    checkpoint: [
      mcq('Including one thing you got wrong during deployment makes the account credible because it:',
        [['Is specific in a way a plan cannot be', true],
         ['Shows humility about your own capabilities', false],
         ['Demonstrates that the project was complicated', false],
         ['Invites the interviewer to share a similar story', false]],
        'A missing variable or a port mismatch is the kind of detail only somebody who did it would have. It is the strongest evidence in the answer.'),
      mcq('Answering "Docker, Kubernetes, CI/CD" fails because the question asked how your thing gets:',
        [['From a commit to running', true],
         ['Built into a deployable artefact at all', false],
         ['Tested before it reaches a real environment', false],
         ['Monitored once it has started serving traffic', false]],
        'A list of tools is not a route. The answer wanted is the sequence of steps that actually happens, which a list deliberately omits.'),
    ],
  },
  {
    unitCode: 'T4_LINUX_CLOUD_MINI_PROJECT',
    notes: `**Get something running where a stranger can reach it, and get it back when it
breaks.**

## The brief

Take an application you already have. **Containerise it, put it through a pipeline, and deploy
it to somewhere with a public URL.**

Free tiers are entirely adequate. The exercise is the route, not the infrastructure.

## The requirements that make it an exercise

**Configuration from the environment**, not baked into the image. The same image must run locally
and remotely with different settings.

**A health check** that says whether the process can actually serve, not merely that it is up.

**A pipeline with a gate.** Tests run, and a failure stops the deploy. Break a test deliberately
and confirm that it does.

**A rollback you have actually performed.** Not described — performed. Deploy something broken on
purpose, roll it back, and record how long it took.

## The part most people skip

**The deliberate broken deploy.** It feels perverse and it is the only way to find out that your
rollback works, and the only time to find that out is when it does not matter.

## What to submit

**The URL.** **The pipeline configuration.** **A note covering: what configuration comes from
where, what the health check checks, what happened when you broke the test deliberately, and how
long the rollback took.**

## Why this is the mini project

**Because a deployed thing is worth more in an interview than a better thing that only runs
locally**, and because P14's production project assumes all of this. Without a deployment there is
nowhere for logging, monitoring or error handling to be demonstrated.`,
    assignment: {
      title: 'Deployed, gated, and rolled back',
      description: 'Containerise and deploy an existing application with configuration from the environment, a real health check, a gated pipeline, and a rollback you have actually performed.',
      instructions: `Take an application you already have and get it running where a stranger can
reach it. Free tiers are entirely adequate — the exercise is the route, not the infrastructure.

**Configuration must come from the environment**, not be baked into the image. The same image
must run locally and remotely with different settings.

**Add a health check** that reports whether the process can actually serve — reaching its
database, for instance — rather than merely that it is running.

**Add a pipeline with a real gate.** Then break a test deliberately and confirm the deploy is
refused.

**Then deploy something broken on purpose and roll it back.** Not described — performed. This is
the part most people skip, and it is the only way to find out your rollback works at a time when
it does not matter.

**Submit:** the public URL, the pipeline configuration, and a note covering what configuration
comes from where, what the health check actually checks, what happened when you broke the test,
and how long the rollback took you.`,
      rubric: [
        { criterion: 'Reachable, with config from the environment', description: 'A working public URL, and the same image demonstrably runs locally and remotely with different settings.', maxPoints: 25 },
        { criterion: 'A health check that means something', description: 'It reports the ability to serve rather than the existence of the process.', maxPoints: 20 },
        { criterion: 'The gate was tested', description: 'A test was deliberately broken and the pipeline is shown to have refused the deploy.', maxPoints: 25 },
        { criterion: 'The rollback was performed', description: 'A deliberately broken deploy was rolled back, with the elapsed time reported.', maxPoints: 30 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('Deploying something broken on purpose is the only way to find out that your rollback works, and the right time to find that out is:',
        [['When it does not matter', true],
         ['Immediately before a real release is planned', false],
         ['After the first genuine incident has occurred', false],
         ['Once the deployment process has stabilised fully', false]],
        'An untested rollback is a plan rather than a capability. Discovering it does not work during a real incident is the expensive way to learn it.'),
      mcq('Breaking a test deliberately to confirm the pipeline refuses the deploy is necessary because a gate that has never refused anything is:',
        [['Unverified, and may not be a gate at all', true],
         ['Configured correctly by default in most systems', false],
         ['Only relevant once the test suite is comprehensive', false],
         ['Proven by the tests having passed on every run', false]],
        'Passing pipelines exercise the success path only. Whether the refusal actually happens is a separate behaviour that has to be triggered to be known.'),
      mcq('P14’s production project assumes a deployment because without one there is nowhere to demonstrate:',
        [['Logging, monitoring and error handling', true],
         ['Authentication against a real user database', false],
         ['The schema design and its chosen indexes', false],
         ['Test coverage across the application layers', false]],
        'Those three are properties of a running system under real conditions. Locally, there is nothing to monitor and no incident to log.'),
    ],
  },

  /* ══ T4_SECURITY_ENGINEERING ════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_SECURITY_ENGINEERING_VALIDATION_AT_THE_RIGHT_LAYER',
    notes: `**Client-side validation is a courtesy. The server is where it is a control.**

## Why the distinction is absolute

**The client is under the attacker's control.** Entirely. They can edit the page, disable the
script, or skip the page and call your API directly with curl. **Anything enforced only in the
browser is not enforced.**

**That does not make client validation useless** — it saves a round trip and tells an honest user
what is wrong immediately. It is a user-experience feature, and calling it security is the error.

## Validate what, exactly

**Type and shape.** A number where a number belongs.

**Range.** A quantity that cannot be negative, a page size that has a maximum.

**Membership.** A status that must be one of four values, checked against the four.

**Ownership.** Which is authorization and is covered in the API day, and belongs in the same
boundary pass.

## Where the boundary is

**One place, per endpoint, before any logic.** Not scattered through the handler, because
scattered means one path was written without it.

## The related mistake: sanitising instead of parameterising

**Escaping quotes in a string you are about to concatenate into SQL is not a control.** It is an
attempt to out-think an attacker at string manipulation, and it has failed publicly many times.

**Parameterised queries are the control.** The value never becomes part of the statement, so
nothing it contains can change what the statement means. **That is a structural guarantee rather
than a filter**, and structural guarantees are what security engineering prefers.

## The principle

**Prefer making something impossible to making it forbidden.** A filter can be bypassed; a
structure cannot.`,
    mcqs: [
      mcq('Client-side validation is not a security control because the client is:',
        [['Entirely under the attacker’s control', true],
         ['Unable to check values against the database', false],
         ['Running an older version of the validation rules', false],
         ['Only able to validate the fields it can see itself', false]],
        'The page can be edited, the script disabled, and the API called directly. Anything enforced only there is enforced only for cooperative users.'),
      mcq('Escaping quotes before concatenating into SQL is weaker than a parameterised query because escaping is:',
        [['A filter, where parameterisation is structural', true],
         ['Slower, and must be applied to every single value', false],
         ['Specific to one database and not portable at all', false],
         ['Applied after the statement has been constructed', false]],
        'A filter tries to out-think the attacker at string manipulation. Parameterisation means the value never becomes part of the statement at all.'),
      mcq('"Prefer making something impossible to making it forbidden" favours a structure over a filter because a filter:',
        [['Can be bypassed, where a structure cannot', true],
         ['Must be maintained as new attacks are discovered', false],
         ['Is applied at a later stage of the request cycle', false],
         ['Requires the developer to enumerate what is unsafe', false]],
        'A bypass is a single overlooked input away. A structural guarantee holds for every input because there is no path by which the value gains meaning.'),
    ],
    checkpoint: [
      mcq('Calling client-side validation a user-experience feature rather than security is correct because it:',
        [['Saves a round trip for an honest user', true],
         ['Reduces the load on the server’s validation code', false],
         ['Catches most attacks before they reach the server', false],
         ['Provides a second layer of defence behind the server', false]],
        'Its real value is immediate feedback. Treating it as a layer of defence is the error, because an attacker simply does not run it.'),
      mcq('Validation scattered through a handler rather than done once at the boundary produces:',
        [['One path that was written without it', true],
         ['Duplicated checks that slow the request down', false],
         ['Inconsistent error messages for the same failure', false],
         ['Validation that runs after the logic has started', false]],
        'Each path is written separately and one is written in a hurry. A single boundary pass makes the unchecked path impossible rather than unlikely.'),
    ],
  },
  {
    unitCode: 'T4_SECURITY_ENGINEERING_ACCESS_CONTROL',
    notes: `**Enforcing on the server what the interface merely suggests.**

## The hidden button is not a control

**Removing a delete button from the page for users who may not delete** is presentation. The
endpoint is still there, still reachable, and still willing.

**The check belongs where the action happens.**

## The object nobody checked

The pattern from the API day, because it is worth meeting twice:

    GET /invoices/9912

**Authenticated. Authorised as a user. Not checked as the owner of 9912.** Increment the number
and read somebody else's invoice.

**The reliable fix is structural:** load the object scoped to the caller, so the wrong answer is
unreachable rather than merely forbidden. There is then no separate check for a future endpoint
to omit.

## Vertical and horizontal

**Vertical** — a normal user reaching an admin function. Caught by role checks, which most
systems have.

**Horizontal** — one user reaching another user's data at the same privilege level. **Not caught
by role checks**, because both users have the same role, and this is the one that is actually
missing in most systems.

## Where these are found in practice

**The endpoint added last.** The main flows get the attention and the check; the export, the
detail view, the "resend" action added in a hurry does not.

**So test every endpoint with another user's identifier**, not the obvious one.

## Mass assignment, briefly

**Accepting a whole request body and applying it to a record** lets a caller set fields you never
intended — a role, an account balance, an owner id. **Accept a named list of fields**, never
everything that arrived.`,
    mcqs: [
      mcq('Horizontal access control failures are not caught by role checks because both users have:',
        [['The same role, and differ only in identity', true],
         ['Permissions that overlap in most of the system', false],
         ['Access to the endpoint but not to its parameters', false],
         ['Been authenticated through the same mechanism', false]],
        'A role check asks what kind of user this is. Whether this record belongs to this particular caller is a fact about the data that no role encodes.'),
      mcq('Applying a whole request body to a record lets a caller set fields such as a role or an owner id. The fix is to:',
        [['Accept a named list of fields only', true],
         ['Validate the types of every field received', false],
         ['Reject requests containing unexpected fields', false],
         ['Check the caller’s role before applying any of it', false]],
        'An allow-list means an unexpected field cannot reach the record whatever it is called. Rejecting unknown fields is stricter on clients and easier to get wrong.'),
      mcq('Access control failures are found most often on:',
        [['The endpoint that was added last', true],
         ['The endpoint that handles authentication itself', false],
         ['Endpoints that accept the most complex request bodies', false],
         ['The endpoints with the highest traffic in the system', false]],
        'Main flows get review and checks. The export, the detail view or the resend action added late is where the omission lives.'),
    ],
    checkpoint: [
      mcq('Removing a delete button for users who may not delete is presentation rather than a control because the endpoint is:',
        [['Still there, reachable and willing', true],
         ['Protected by the authentication layer already', false],
         ['Only callable from within the application itself', false],
         ['Unreachable without the button to construct the call', false]],
        'The interface decides what is shown. An attacker constructs the request directly and the server has no idea a button was hidden.'),
      mcq('Loading an object scoped to the caller is preferred to checking ownership afterwards because it leaves:',
        [['No separate check for a new endpoint to omit', true],
         ['A clearer audit trail of what was accessed', false],
         ['Fewer database round trips on each request', false],
         ['A more useful error message for the caller', false]],
        'A check is a step somebody can forget. A scoped query makes the wrong result unreachable, so the safe behaviour is the default rather than the discipline.'),
    ],
  },
  {
    unitCode: 'T4_SECURITY_ENGINEERING_SECRETS',
    notes: `**A secret in a repository is a published secret**, and this is the single most common
real security failure in student work.

## Why committing one is worse than it looks

**Deleting it does not remove it.** Git keeps history. The value is in the previous commit,
reachable by anybody with the repository, forever, unless the history is rewritten — and if it
was ever pushed to a public host, it has been scraped.

**Automated scanners find them within minutes.** Public repositories are watched continuously by
people looking for exactly this.

**So the only correct response to a committed secret is to rotate it.** Removing it from the
repository is housekeeping done afterwards, not the fix.

## The four places they keep appearing

**A repository.** A config file, a test fixture, a notebook.

**A log.** Printing a request that includes an authorization header.

**An error message.** A connection string echoed back in a stack trace shown to a user.

**A client bundle.** An API key compiled into a mobile app or a JavaScript bundle is public,
whatever the source file looked like.

## Where they belong

**In the environment**, injected at run time. The image, the repository and the bundle all stay
free of them, and the same artefact runs everywhere with different values.

**For anything beyond a small project, in a secret manager**, which additionally gives you
rotation and an audit trail.

## The habit that prevents most of it

**A \`.gitignore\` entry and a committed \`.env.example\` with the keys and no values.** The
example documents what is needed; the real file is never added. Costs a minute, once.

## And the check

**Scan your own history before making a repository public.** There are tools for it, they take
seconds, and the alternative is finding out from somebody else.`,
    mcqs: [
      mcq('The only correct response to a secret that has been committed is to:',
        [['Rotate it, because the history retains the value', true],
         ['Remove it in a follow-up commit immediately', false],
         ['Make the repository private until it is cleaned', false],
         ['Add it to .gitignore so it is not committed again', false]],
        'The value is in history and, if pushed publicly, has almost certainly been scraped. Only changing the secret makes the exposure irrelevant.'),
      mcq('An API key compiled into a JavaScript bundle or a mobile app is:',
        [['Public, whatever the source file looked like', true],
         ['Protected, since the bundle is minified and obscure', false],
         ['Safe if the key is restricted to certain domains', false],
         ['Only exposed when the source maps are published too', false]],
        'Anything shipped to a client can be extracted from it. Obfuscation changes the effort required and not the outcome.'),
      mcq('A committed `.env.example` with keys and no values is useful because it:',
        [['Documents what is needed without exposing it', true],
         ['Allows the application to start with defaults set', false],
         ['Prevents the real file from being committed at all', false],
         ['Provides a template that tools can populate later', false]],
        'The next person knows which variables to set, and nothing sensitive is in the repository. The .gitignore entry is what prevents the real file being added.'),
    ],
    checkpoint: [
      mcq('Deleting a committed secret in a later commit does not fix the exposure because Git:',
        [['Keeps the value in the earlier commit', true],
         ['Stores the file in a compressed pack it cannot edit', false],
         ['Replicates deletions only after a garbage collection', false],
         ['Retains the value in the index until it is rebuilt', false]],
        'History is the point of version control. The earlier commit is still reachable by anybody with a clone, so the secret is still present.'),
      mcq('Printing a request that includes its authorization header sends the secret to:',
        [['A log, which is copied and retained widely', true],
         ['The client, which already knows the value anyway', false],
         ['The console, which is discarded after the session', false],
         ['A trace, which is only kept when an error occurs', false]],
        'Logs are aggregated, backed up, and shipped to third-party services. A secret written there has been distributed to all of them.'),
    ],
  },
  {
    unitCode: 'T4_SECURITY_ENGINEERING_DEBUGGING',
    notes: `**Find the vulnerability class, then find every instance of it.**

## Why classes rather than cases

**A report names one instance.** "The search box is injectable." Fixing the search box leaves
every other place the same pattern was used, and those were written by the same person on the
same day with the same assumption.

**So the fix is a sweep**, and the report is the starting point rather than the scope.

## The sweep

**Name the class.** Concatenated SQL. Unescaped output. A missing ownership check. Trust in a
client-supplied value.

**Then search for the pattern, not the symptom.** Every place a query is built from a string.
Every place user input reaches a template. Every endpoint that loads an object by id.

**Fix them all, and add the structural version** — parameterised queries, automatic escaping,
scoped loads — so the next instance cannot be written.

## The four classes worth sweeping for in any project

**Injection.** Anywhere input becomes part of a query, a command, or a template.

**Broken access control.** Any endpoint taking an object identifier.

**Exposure.** Secrets, stack traces shown to users, verbose errors, a debug mode left on.

**Trusting the client.** A price, a role, a user id or a total that arrived in the request and was
not re-derived on the server.

## What a finding must contain to be actionable

**Impact** — what an attacker gets. **Reproduction** — the exact request. **The class** — so the
reader knows to look elsewhere too. **The fix**, at the right layer.

**"This is insecure" is not a finding.** A developer cannot act on it and will reasonably deprioritise it.`,
    mcqs: [
      mcq('A report naming one injectable input should be treated as:',
        [['A starting point, not the scope of the fix', true],
         ['The complete extent of the vulnerability found', false],
         ['A low priority until other instances are found', false],
         ['Evidence that the input validation layer is absent', false]],
        'The same pattern was used elsewhere by the same author with the same assumption. The reported instance is the one somebody happened to test.'),
      mcq('Sweeping for a class means searching for the pattern rather than the symptom, so for injection you look for every place a query is:',
        [['Built from a string', true],
         ['Executed against a production database instance', false],
         ['Missing an explicit type on one of its parameters', false],
         ['Constructed inside a loop over user-supplied data', false]],
        'The vulnerability is in the construction. Finding every concatenation finds every instance, including the ones nobody has tested.'),
      mcq('A finding must contain the CLASS as well as the instance so that the reader:',
        [['Knows to look elsewhere too', true],
         ['Can assign it to the correct team to fix', false],
         ['Can estimate how long the fix will take them', false],
         ['Understands the severity rating that was assigned', false]],
        'Naming the class converts a single fix into a sweep, which is the difference between removing an instance and removing the capability.'),
    ],
    checkpoint: [
      mcq('"Trusting the client" as a class covers a price or a total that arrived in the request and was not:',
        [['Re-derived on the server', true],
         ['Validated against its expected numeric range', false],
         ['Signed by the client before being transmitted', false],
         ['Logged for later comparison against the order', false]],
        'Any value the client can set can be set to anything. A price or total must be computed server-side from data the client does not control.'),
      mcq('"This is insecure" fails as a finding because a developer:',
        [['Cannot act on it, and will deprioritise it', true],
         ['Will disagree with the assessment as stated', false],
         ['Needs the severity before they can schedule it', false],
         ['Requires a proof-of-concept to reproduce it fully', false]],
        'Without impact, reproduction and a fix there is nothing to do. It reads as an opinion and competes badly against work that is specified.'),
    ],
  },
  {
    unitCode: 'T4_SECURITY_ENGINEERING_PRACTICE',
    notes: `**Finding and fixing at the right layer, repeatedly.**

## What is being drilled

**Recognising the four classes** in code you did not write, quickly.

**Fixing structurally** — the parameterised query, the scoped load, the allow-list — rather than
patching the reported input.

**Sweeping.** Having fixed one, finding the others, every time, until it is the reflex rather
than a second thought.

## The exercises

Each gives you a small application and one reported issue. **The score is not for fixing the
report; it is for how many other instances you found.**

That is a deliberate inversion of what feels natural, and it is the habit the whole day exists to
build.

## The check on your own work

**After fixing, ask what would have prevented this being written.** Frequently a helper that makes
the safe thing the easy thing — a query function that only takes parameters, a base handler that
scopes every load.

**A fix that relies on everybody remembering is a fix with a half-life.**

## Time yourself

**These are quick once the classes are internalised.** Slowness usually means reading the code
line by line rather than searching for the pattern, which is a different and much slower
technique.`,
    mcqs: [
      mcq('These exercises score how many other instances you found rather than whether you fixed the report, which inverts:',
        [['What feels natural, deliberately', true],
         ['The usual order of triage in a real team', false],
         ['The severity rating the report was given', false],
         ['The relationship between impact and effort here', false]],
        'The instinct is to close the ticket. The habit worth building is treating the ticket as evidence about the codebase rather than as the work.'),
      mcq('A fix that relies on everybody remembering has a half-life, so the better question after fixing is what would have:',
        [['Prevented this being written at all', true],
         ['Detected it earlier in the review process', false],
         ['Reduced the impact if it had been exploited', false],
         ['Made the reported instance easier to find', false]],
        'A helper that makes the safe path the easy path removes the class. Discipline decays as the team changes and the deadline approaches.'),
    ],
    checkpoint: [
      mcq('Reading code line by line rather than searching for a pattern is slower when sweeping because a class is defined by:',
        [['A construction that can be searched for', true],
         ['The severity of the issue it produces', false],
         ['The layer of the application it appears in', false],
         ['Whether user input reaches it directly or not', false]],
        'Every instance shares a shape — a concatenation, an unscoped load. Searching finds all of them; reading finds the ones you happen to reach.'),
      mcq('A query helper that only accepts parameters is a stronger fix than reviewing for concatenation because it makes the safe path:',
        [['The easy path, so the unsafe one is not written', true],
         ['Faster, which encourages developers to use it', false],
         ['Auditable, so violations can be reported later', false],
         ['Mandatory, since the old approach is removed', false]],
        'Removing the friction from the safe option is what changes behaviour durably. Review catches what it catches and depends on attention.'),
    ],
  },
  {
    unitCode: 'T4_SECURITY_ENGINEERING_INTERVIEW_QUESTION',
    notes: `**"How would you secure this?"** — asked about a small system they describe, or about
your own project.

## Do not answer with a list of attacks

**"SQL injection, XSS, CSRF" is trivia.** It shows you have read about security and says nothing
about whether you could find or fix anything.

## Answer with a model, then controls

**What is worth taking here?** User data, money, credentials, the ability to act as somebody
else. Name it.

**Where does it enter and leave?** Endpoints, uploads, third-party callbacks. Those are the
boundaries.

**Who is trusted, and how much?** An anonymous visitor, a logged-in user, an admin, another
service. Each is a different amount of trust.

**Then the controls follow from the model**, and you will be naming the right ones rather than the
memorised ones — and the interviewer can see the reasoning that produced them.

## The question they usually ask next

**"Which of those would you do first?"** They are checking whether you can prioritise by impact
rather than by ease. **Broken access control before a missing security header**, every time.

## When it is your own project

**Name something you got wrong and fixed.** "I was trusting the price from the client" is worth
more than any list, because it shows you have looked at your own work adversarially and found
something.

**"I did not have time for security" is at least honest** and is much weaker. "It is secure" is
the worst available answer, because nothing is and the claim shows you have not checked.

## The trap

**Proposing encryption for everything.** It sounds thorough and answers a question nobody asked;
most real failures are access control and validation, and neither is helped by encryption at all.`,
    mcqs: [
      mcq('Answering "how would you secure this" with a list of attack names is weak because it shows you have:',
        [['Read about security, not that you could fix it', true],
         ['Prioritised the wrong threats for this system', false],
         ['Memorised terminology rather than understood it', false],
         ['Focused on web attacks rather than on all of them', false]],
        'A list is recall. What the question probes is whether you can reason from what matters in this system to the controls it needs.'),
      mcq('Asked which control to implement first, prioritising broken access control over a missing security header shows prioritisation by:',
        [['Impact rather than by ease', true],
         ['Convention, which favours access control first', false],
         ['Likelihood, since headers are rarely exploited', false],
         ['Cost, because headers are cheaper to add quickly', false]],
        'A header is trivial to add and prevents little. Access control failures expose data directly, so impact and effort point in opposite directions.'),
      mcq('Proposing encryption for everything is a trap because most real failures are:',
        [['Access control and validation, which it does not help', true],
         ['Caused by weak algorithms rather than missing ones', false],
         ['In transit, where encryption is already standard', false],
         ['Too expensive to address with encryption at scale', false]],
        'Encrypted data returned to the wrong authenticated user is still exposed. Encryption addresses confidentiality at rest and in transit, not authorisation.'),
    ],
    checkpoint: [
      mcq('The strongest answer about security in your own project names:',
        [['Something you got wrong and then fixed', true],
         ['Every control that the project implements now', false],
         ['The framework features that handle it for you', false],
         ['A threat model you produced before building it', false]],
        'Finding a real fault in your own work shows adversarial reading of it, which is the capability being assessed rather than the controls present.'),
      mcq('"It is secure" is the worst available answer because nothing is, and the claim shows the candidate has:',
        [['Not checked', true],
         ['Overestimated the framework’s protections', false],
         ['Misunderstood what the question was asking for', false],
         ['Not been told which threats are relevant here', false]],
        'Anybody who has looked adversarially at their own system has found something. An unqualified claim of security is evidence the looking did not happen.'),
    ],
  },
  {
    unitCode: 'T4_SECURITY_ENGINEERING_MINI_PROJECT',
    notes: `**Take a deliberately weak application and close its real weaknesses, in order of
impact.**

## The brief

**Use a purpose-built vulnerable application**, or your own earlier work, which is frequently
better because the faults are yours and the lesson lands harder.

**Find as much as you can. Then fix in impact order, not in discovery order.**

## The ordering is the exercise

**Impact order means:** broken access control and injection before a missing header. Data exposure
before a verbose error message.

**Discovery order is what feels natural** — you fix what you found first — and it means the
afternoon is spent on the cheap findings while the serious one is still open.

**Justify the order in your write-up.** That justification is what a security finding actually is.

## For each finding

**The class, not just the instance.** **Every instance you found of it.** **The fix, at the layer
that closes the class.** **What would have prevented it being written.**

## The part that is worth the most

**The sweep.** For every finding, how many other instances were there? A submission reporting one
injectable input and one fix has demonstrated much less than one reporting one report, six
instances and a query helper that makes the seventh impossible.

## What to submit

**Before and after, a findings list in impact order with the reasoning for the order, and one
structural change** that removes a class rather than an instance.

## Why this rather than writing a secure application from scratch

**Because you will not be given a blank page.** Every real security task is applied to something
that already exists and already has users, and finding faults in existing code is the skill that
transfers.`,
    assignment: {
      title: 'Hardening something that is already broken',
      description: 'Find and fix real vulnerabilities in an existing weak application, in impact order, sweeping each class rather than patching each instance.',
      instructions: `Take a purpose-built vulnerable application, or your own earlier work — which
is frequently better, because the faults are yours and the lesson lands harder.

**Find as much as you can.** Then **fix in impact order rather than discovery order**: broken
access control and injection before a missing header, data exposure before a verbose error. Fixing
what you found first is what feels natural and it spends the afternoon on the cheap findings.

**For each finding record the class rather than just the instance, every instance you found of
that class, the fix at the layer that closes it, and what would have prevented it being written
at all.**

**Submit:** the before and after code, a findings list in impact order with your reasoning for
that order, and at least one structural change — a query helper, a scoped base handler, an
allow-list — that removes a class rather than an instance.

A submission reporting one injectable input and one fix has shown much less than one reporting one
report, six instances, and a helper that makes the seventh impossible.`,
      rubric: [
        { criterion: 'Swept, not patched', description: 'Each finding names its class and lists every instance found, rather than fixing only the one that was obvious.', maxPoints: 30 },
        { criterion: 'Ordered by impact, with reasoning', description: 'The fix order is by consequence rather than by discovery, and the write-up justifies it.', maxPoints: 25 },
        { criterion: 'At least one structural change', description: 'Something now makes the unsafe version hard or impossible to write, rather than relying on future vigilance.', maxPoints: 25 },
        { criterion: 'Findings are actionable', description: 'Each carries impact, reproduction and a fix at the right layer, rather than an assertion that something is insecure.', maxPoints: 20 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('Fixing in discovery order rather than impact order means the afternoon is spent:',
        [['On the cheap findings while the serious one is open', true],
         ['Re-testing work that was already completed earlier', false],
         ['On findings that turn out not to be exploitable', false],
         ['Documenting each fix before the next one begins', false]],
        'Discovery order is arbitrary with respect to consequence. The serious finding waits behind whatever happened to be noticed first.'),
      mcq('A submission reporting one report, six instances and a structural helper demonstrates more than one report and one fix because it shows:',
        [['The class was removed, not the instance', true],
         ['More time was spent on the assignment overall', false],
         ['A greater familiarity with the vulnerable application', false],
         ['That the original report was incomplete as written', false]],
        'Removing a capability is durable; removing an instance is not. The helper additionally means the seventh instance cannot be written.'),
      mcq('Hardening existing code rather than writing something secure from scratch is preferred because you will:',
        [['Not be given a blank page in real work', true],
         ['Learn the framework’s security features faster', false],
         ['Find more vulnerabilities in a shorter period', false],
         ['Be able to compare against a known-good version', false]],
        'Every real security task applies to a system that already exists and already has users. Finding faults in code you did not write is the transferable skill.'),
    ],
  },
];
