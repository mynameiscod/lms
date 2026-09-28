/**
 * The Cloud & DevOps specialization track — sixteen units. Module P11.
 *
 * ── WHAT THIS DIRECTION IS ACTUALLY FOR ───────────────────────────────────────────────────
 *
 * Making other people's code run reliably somewhere, and being the person called when it stops.
 * That second half is the part students do not picture when they choose it, and it shapes
 * everything: the direction is defined by operational responsibility rather than by a set of
 * tools.
 *
 * Which is why this track is not a tour of cloud products. Product names change, the free tier
 * moves, and a student who learned one vendor's console has learned a user interface. What
 * transfers is knowing what actually happens between a commit and a running process, what a
 * managed service is a wrapper over, and how to answer "is it working" from evidence.
 *
 * ── THE QUESTION THE WHOLE TRACK IS BUILT AROUND ──────────────────────────────────────────
 *
 * "How would you know?" Is it working, is it slow, did that deploy help, is it about to run out
 * of something. Every unit below ends up there, because a system nobody can observe is a system
 * whose failures are discovered by users.
 *
 * Attribution: T4_CLOUD_DEPTH defaults to CLOUD_FUNDAMENTALS with the pipeline-to-process unit on
 * DEVOPS_FUNDAMENTALS and the interview question on LINUX_ADMINISTRATION; T4_CLOUD_BUILD to
 * CONTAINERS_DOCKER with the pipeline unit on CI_CD and the project on DEPLOYMENT;
 * T4_CLOUD_QUALITY to MONITORING_OBSERVABILITY with its harder fault on LOGGING_DIAGNOSTICS and
 * the drill on SECURE_CODING; T4_CLOUD_PROOF to DEVOPS_FUNDAMENTALS.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_CLOUD_BUNDLES: PilotBundle[] = [
  /* ══ T4_CLOUD_DEPTH ═════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_CLOUD_DEPTH_COMMIT_TO_RUNNING',
    notes: `**Build, artefact, image, registry, deploy, process.** Most people know two of those
links and assume the rest.

## The chain, in full

**A commit** triggers something — a webhook, a poll, a manual button.

**A build** turns source into an artefact: compiled output, a bundle, a package. **Deterministic
is the goal**: the same commit produces the same artefact, which is what makes a rollback
meaningful.

**An image** packages the artefact with its runtime and its dependencies.

**A registry** stores it, tagged. **The tag is how a deploy names what to run**, and a mutable tag
like \`latest\` destroys the ability to say what is running.

**A deploy** tells something to run that image: a scheduler, an orchestrator, a script on a
machine.

**A process** starts, passes a health check, and begins receiving traffic.

## Where it usually breaks

**Between the registry and the process.** The image exists, the deploy claims success, and the
process is failing to start for a configuration reason — and because the old one is still
running, nothing is obviously wrong.

## Why knowing the whole chain matters

**Because a failure anywhere presents identically: "the new version is not live".** Somebody who
knows the chain checks each link in order and finds it in minutes. Somebody who knows two links
guesses.

## Immutability

**An artefact that can change after it is built breaks everything downstream.** You cannot roll
back to a version whose contents have moved, and you cannot reproduce a bug from a tag that now
points elsewhere.

**Build once, tag immutably, promote the same artefact through environments.** Testing one thing
and shipping another is how a staging-passed release fails in production.`,
    mcqs: [
      mcq('A mutable tag such as `latest` destroys the ability to:',
        [['Say what is currently running', true],
         ['Deploy more than one version at a time', false],
         ['Build the image from a given commit', false],
         ['Store several images in one registry', false]],
        'The tag no longer identifies specific contents, so neither a rollback target nor a bug reproduction can be named reliably.'),
      mcq('Promoting the same artefact through environments rather than rebuilding per environment prevents:',
        [['Testing one thing and shipping another', true],
         ['Configuration differing between environments', false],
         ['The registry filling with unused images', false],
         ['Build times growing as the project does', false]],
        'A rebuild can differ from what was tested through dependency drift or a changed base, so the validated artefact must be the deployed one.'),
    ],
    checkpoint: [
      mcq('The chain usually breaks between the registry and the process, and it is not obviously wrong because:',
        [['The old process is still running', true],
         ['The deploy reports a failure in its logs', false],
         ['The registry rejects the malformed image', false],
         ['Health checks are not configured by default', false]],
        'Traffic continues being served by the previous version, so the system looks healthy while the new release has not actually started.'),
      mcq('Knowing the whole chain matters because a failure anywhere presents identically as:',
        [['"The new version is not live"', true],
         ['A build error in the pipeline output', false],
         ['An increase in the error rate observed', false],
         ['A timeout when the service is requested', false]],
        'The symptom is the same at every link, so only checking them in order distinguishes a build failure from a registry or startup problem.'),
    ],
  },
  {
    unitCode: 'T4_CLOUD_DEPTH_WHERE_IT_RUNS',
    notes: `**Compute, storage, networking and identity** — the four things every managed service
is a wrapper over.

## Why this framing rather than product names

**Because the products change and the primitives do not.** A managed database is compute plus
storage plus networking plus identity, with somebody else operating it. Knowing what it is a
wrapper over tells you what it costs, what it can fail at, and what you are giving up.

## The four

**Compute.** Something running your code: a virtual machine, a container, a function. **They
differ in what you manage and how quickly they start**, not in what they fundamentally are.

**Storage.** Block, object and database. Object storage is cheap, durable and not a filesystem —
treating it as one is a common early mistake.

**Networking.** What can reach what. Most cloud outages caused by students are a network rule,
not a code fault.

**Identity.** What may do what. The permission model is where the real complexity lives, and
where the expensive mistakes are made.

## What a managed service actually buys

**Operational work you no longer do**: patching, backups, failover, scaling.

**And what it costs:** money, a ceiling on control, and a dependency on somebody else's
availability and pricing.

**"Managed" does not mean "somebody else's problem".** You still own the configuration, the
permissions, the capacity and the backups being restorable.

## The bill

**Cost is an engineering constraint here in a way it is not elsewhere.** An idle resource nobody
deleted, a log retention default, an egress charge — each is a design decision somebody made by
not making it.

**Knowing the three or four things that dominate a bill** is part of the direction: compute
hours, storage volume, data transfer, and managed-service premiums.`,
    mcqs: [
      mcq('Object storage is cheap and durable and is not a filesystem, so treating it as one is:',
        [['A common early mistake', true],
         ['Acceptable for small files only', false],
         ['Prevented by the storage API design', false],
         ['Only a problem at very large scale', false]],
        'It has no real directories, no partial writes and different consistency behaviour, so filesystem assumptions produce surprising failures.'),
      mcq('Virtual machines, containers and functions differ in what you manage and how quickly they start, rather than in:',
        [['What they fundamentally are', true],
         ['The languages they are able to run', false],
         ['Whether they can access the network', false],
         ['The cost model that applies to them', false]],
        'All three are compute running your code. The distinctions are operational — isolation boundary, startup latency and management surface.'),
    ],
    checkpoint: [
      mcq('"Managed" does not mean somebody else’s problem, because you still own the configuration, the permissions, the capacity and:',
        [['The backups being restorable', true],
         ['The patching of the underlying host', false],
         ['The failover between availability zones', false],
         ['The physical security of the hardware', false]],
        'A backup that exists and has never been restored is unverified. The provider stores it; whether it works is still your responsibility.'),
      mcq('Most cloud outages caused by students are:',
        [['A network rule rather than a code fault', true],
         ['An exhausted compute quota on the account', false],
         ['A storage volume that filled unexpectedly', false],
         ['A dependency version that changed silently', false]],
        'Reachability between components is configured separately from the code, and a missing or wrong rule presents as a service that simply cannot be contacted.'),
    ],
  },
  {
    unitCode: 'T4_CLOUD_DEPTH_PRACTICE',
    notes: `**Applying both ideas to a system you did not deploy.**

## The drill

**Take a deployed system — your own earlier work, or an open-source project with deployment
configuration.** In thirty minutes produce:

**The chain**, written out: what triggers a build, what artefact it produces, where it is stored,
what deploys it, what starts.

**The primitive map**: for each managed service used, what compute, storage, networking and
identity it is a wrapper over.

**One link you cannot account for.** There is always one, and naming it is the exercise.

**One thing that would dominate the bill.**

## The second half

**Then answer: what is running right now, and how do you know?**

**If the answer requires guessing**, that is the finding — and it is the commonest one. A system
where nobody can name the running version is a system where a rollback is a hope.

## What good looks like

**You can point at the link where a failure would be hardest to diagnose**, and say why.

## Why written out rather than described

**Because the gaps are invisible until the chain is on paper.** Everybody believes they know how
their deployment works, and writing the six links in order reliably exposes one that was assumed.`,
    mcqs: [
      mcq('A system where nobody can name the running version is a system where a rollback is:',
        [['A hope', true],
         ['Slower than it needs to be', false],
         ['Limited to the previous release only', false],
         ['Dependent on the registry retention policy', false]],
        'Rolling back means running a specific known artefact. Without knowing what is current, there is no way to name a target or verify the result.'),
      mcq('Writing the chain out rather than describing it exposes gaps because everybody believes:',
        [['They know how their deployment works', true],
         ['Their system is simpler than it really is', false],
         ['Documentation would be out of date anyway', false],
         ['The pipeline configuration is self-explanatory', false]],
        'The belief survives casual description and does not survive enumerating six links in order, which is where the assumed one becomes visible.'),
    ],
    checkpoint: [
      mcq('The drill asks for one link you cannot account for because:',
        [['There is always one, and naming it is the exercise', true],
         ['Most pipelines have a proprietary step in them', false],
         ['Documentation rarely covers the whole chain', false],
         ['The build stage is typically the least visible', false]],
        'Every deployment has a step taken on trust. Locating it converts an assumption into a known gap that can be closed.'),
      mcq('The useful output of the primitive map is knowing what each managed service costs, what it can fail at, and:',
        [['What you are giving up by using it', true],
         ['Which vendor offers the cheapest version', false],
         ['How many instances it will need to run', false],
         ['Whether it can be replaced with your own', false]],
        'A wrapper trades control for operational work. Naming the primitive underneath is what makes the trade visible rather than implicit.'),
    ],
  },
  {
    unitCode: 'T4_CLOUD_DEPTH_INTERVIEW_QUESTION',
    notes: `**"What happens between me pushing a commit and the change being live?"**

## Why it is the opening question for this direction

**Because it cannot be answered from reading.** Either somebody has set one of these up or they
have not, and the answer reveals which within thirty seconds.

## The answer

**The six links, named**: trigger, build, artefact, registry, deploy, process.

**With what happens at each**, and — the part that separates — **what happens when each fails.**

**And then: how do you know it worked?** A health check, a smoke test, a look at the error rate.
Not "the pipeline went green", which only says the deploy step reported success.

## The follow-ups

**"How long does it take?"** A real number, and where the time goes. Somebody who has waited for
their own pipeline knows.

**"What if it goes wrong at 2am?"** The rollback, and whether it has been performed.

**"How do you know what version is running?"** An immutable tag, and a way to see it. This is
asked because mutable tags are so common.

**"Two people deploy at once."** A lock, a queue, or an honest "it would conflict and I have not
handled it".

## The depth marker

**Distinguishing "the pipeline passed" from "the change is working".** They are different claims
and most candidates conflate them. A green pipeline says the steps ran; only a health check and
the error rate say the system is serving correctly.

## What loses marks

**Listing tools.** "GitHub Actions, Docker, Kubernetes" is an inventory. The question asked what
happens, which is a sequence with failure modes, and the inventory answers none of it.`,
    mcqs: [
      mcq('"The pipeline went green" is insufficient evidence that a change is working because it only says:',
        [['The deploy step reported success', true],
         ['The tests covered the changed behaviour', false],
         ['The artefact was built without any warnings', false],
         ['The new version replaced the previous one', false]],
        'Pipeline success reports that each configured step exited zero, which is a claim about the process rather than about the running system.'),
      mcq('The question "how do you know what version is running" is asked specifically because:',
        [['Mutable tags are so common', true],
         ['Version numbers are often not incremented', false],
         ['Registries do not retain build metadata', false],
         ['Deployments frequently roll back silently', false]],
        'With a moving tag the running contents cannot be identified, and the problem is widespread enough to be worth probing directly.'),
    ],
    checkpoint: [
      mcq('The depth marker is distinguishing "the pipeline passed" from "the change is working", which most candidates:',
        [['Conflate', true],
         ['Treat as the same measurement point', false],
         ['Measure with the same tooling anyway', false],
         ['Consider separately only after an incident', false]],
        'The two are different claims — one about the process and one about the running system — and merging them is why failed releases go unnoticed.'),
      mcq('Answering with "GitHub Actions, Docker, Kubernetes" fails because the question asked what happens, which is:',
        [['A sequence with failure modes', true],
         ['A description of the infrastructure design', false],
         ['A comparison between available tooling', false],
         ['An estimate of how long deployment takes', false]],
        'Tools are the implementation of steps. Naming them describes the toolbox and leaves the sequence and its failure behaviour unstated.'),
    ],
  },

  /* ══ T4_CLOUD_BUILD ═════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_CLOUD_BUILD_CONTAINERISING_PROPERLY',
    notes: `**An image that is not two gigabytes**, and knowing what is in each layer.

## Layers, and why order decides build time

**Each instruction adds a layer, and layers are cached** until one changes — after which every
layer below it is rebuilt.

**So put what changes rarely first.** Install dependencies, then copy source. Reverse them and
every one-line change reinstalls everything, which is how a thirty-second build becomes four
minutes.

## Size, and why it matters beyond aesthetics

**A large image is slower to push, slower to pull, and slower to start on a new node** — which is
exactly when you need it to be fast, because you are scaling or recovering.

**The three causes of size:** a heavy base image, build tools left in the final image, and
artefacts copied in that were never needed.

**A multi-stage build** fixes the second: build in one stage with the compilers, copy only the
output into a slim final stage.

## What must not be in an image

**Secrets.** A deleted file in a later layer is still present in the earlier one, so copying a
credential and removing it leaves it in the image for anybody who looks.

**Environment-specific configuration.** The same image must run in staging and production, or you
are not deploying what you tested.

**Data.** It belongs in a volume or a managed store.

## The process it runs

**One process, in the foreground, logging to stdout.** The orchestrator supervises it, restarts
it and collects its output — and a container that daemonises its own process defeats all three.

**Handle the termination signal.** A process that ignores it is killed after a grace period, and
anything in flight is lost.

## The check

**Build it, run it with a different configuration, and confirm it starts and serves.** Two
minutes, and it verifies the property the whole exercise is for.`,
    mcqs: [
      mcq('Installing dependencies before copying source matters because a changed layer causes:',
        [['Every layer below it to be rebuilt', true],
         ['The cache for the whole image to be cleared', false],
         ['The base image to be downloaded again', false],
         ['The registry to store a complete new copy', false]],
        'Caching is sequential, so placing the frequently changing step last preserves the expensive install across ordinary code changes.'),
      mcq('A container that daemonises its own process defeats the orchestrator’s ability to supervise it, restart it and:',
        [['Collect its output', true],
         ['Limit the memory it consumes', false],
         ['Route network traffic towards it', false],
         ['Schedule it onto a different node', false]],
        'Logs are collected from the foreground process’s stdout, so a backgrounded process leaves the orchestrator with nothing to capture.'),
    ],
    checkpoint: [
      mcq('A large image is slowest to pull and start on a new node, which is exactly when you need it fast because you are:',
        [['Scaling or recovering', true],
         ['Running the test suite in the pipeline', false],
         ['Building a release for the first time', false],
         ['Rolling back to a previous known version', false]],
        'Both situations require new instances to become ready quickly, so pull time directly extends the period of reduced capacity.'),
      mcq('A process that ignores the termination signal is killed after a grace period, and the consequence is that:',
        [['Anything in flight is lost', true],
         ['The container restarts in a loop afterwards', false],
         ['The orchestrator marks the node as unhealthy', false],
         ['The image must be rebuilt before redeploying', false]],
        'Without graceful shutdown, in-progress requests and unflushed work are terminated abruptly rather than being allowed to complete.'),
    ],
  },
  {
    unitCode: 'T4_CLOUD_BUILD_A_PIPELINE_THAT_CAN_FAIL',
    notes: `**Stages, gates, and the deploy that must not happen when the tests did not pass.**

## The gate is the entire point

**A pipeline where a deploy can proceed despite failing tests is decoration.** It runs tests
nobody acts on, at the cost of waiting for them.

**And a gate that has never refused anything is unverified.** Break a test deliberately once and
confirm the deploy is blocked. It takes five minutes and it is the only evidence the gate works.

## Stage order: fast feedback first

**Lint and unit tests before integration tests before deployment.** A typo should fail in thirty
seconds, not twelve minutes.

**Each stage should fail for one reason**, so a red pipeline names the problem rather than
requiring an investigation.

## What makes a pipeline trustworthy

**Deterministic.** The same commit produces the same result. A pipeline that passes on a re-run
without any change has an unreliable test, and **the correct response is to fix or quarantine it
rather than to re-run until green** — because a team that habitually re-runs has stopped reading
failures at all.

**Fast enough to be run.** A forty-minute pipeline gets bypassed under deadline pressure, and the
bypass becomes the habit.

**Honest about what it proves.** Green means the configured checks passed, not that the change is
correct.

## Secrets in a pipeline

**Injected at run time, never committed.** Masked in the output. Scoped to the stage that needs
them, so a build step cannot read the production credentials.

## Environments

**The same artefact, promoted.** Different configuration, identical contents. Rebuilding per
environment means the thing you tested is not the thing you shipped.`,
    mcqs: [
      mcq('A pipeline that passes on a re-run without any change has an unreliable test, and the correct response is to fix or quarantine it rather than re-run until green because a team that habitually re-runs:',
        [['Has stopped reading failures at all', true],
         ['Wastes compute resources unnecessarily', false],
         ['Delays the release beyond its schedule', false],
         ['Cannot identify which test was flaky', false]],
        'Once re-running is the reflex, a genuine failure is treated the same way as a flaky one and passes through unexamined.'),
      mcq('Secrets should be scoped to the stage that needs them so that:',
        [['A build step cannot read production credentials', true],
         ['The pipeline runs faster without loading them', false],
         ['They can be rotated without a pipeline change', false],
         ['The output does not need to be masked at all', false]],
        'Limiting exposure means a compromised or malicious build step has access only to what that stage legitimately requires.'),
    ],
    checkpoint: [
      mcq('A gate that has never refused anything is unverified, and confirming it works takes five minutes by:',
        [['Breaking a test deliberately once', true],
         ['Reviewing the pipeline configuration file', false],
         ['Checking the documentation for the runner', false],
         ['Asking a colleague who set it up originally', false]],
        'Passing runs only exercise the success path. The refusal is separate behaviour that must be triggered to be known to work.'),
      mcq('A forty-minute pipeline gets bypassed under deadline pressure, and the problem is that:',
        [['The bypass becomes the habit', true],
         ['The tests become out of date quickly', false],
         ['Developers switch to local testing only', false],
         ['The runner costs more than it is worth', false]],
        'An exception made once under pressure is made again more easily, until the gate applies only when nobody is in a hurry.'),
    ],
  },
  {
    unitCode: 'T4_CLOUD_BUILD_MINI_PROJECT',
    notes: `**From repository to running service, through automation rather than by hand.**

## The brief

**Take an application and get it deployed through a pipeline**, to somewhere with a public URL.
Free tiers are entirely adequate — the exercise is the chain, not the infrastructure budget.

## What must be demonstrable

**The six links**, each automated: a commit triggers a build, which produces an artefact, tagged
immutably, stored, deployed, and started.

**A gate that has refused something.** Break a test deliberately and show the deploy blocked.

**Configuration from the environment**, so the same image runs locally and remotely.

**A health check that means something** — it reaches a dependency rather than returning a
constant.

**A rollback you have performed.** Deploy something broken on purpose, roll it back, record how
long it took.

**The ability to say what is running.** An immutable tag, visible somewhere.

## The part most people skip

**The deliberate broken deploy.** It feels perverse, and it is the only way to find out the
rollback works while it does not matter.

## What to submit

**The URL, the pipeline configuration, and a note covering:** the six links and what automates
each, what happened when you broke the test, how long the rollback took, and how you can tell
which version is live.

**And one thing that went wrong while setting this up**, because everybody has one and it is
usually the most instructive part of the submission.`,
    assignment: {
      title: 'From repository to running service',
      description: 'Deploy an application through an automated pipeline with an immutable artefact, a gate that has refused something, and a rollback you have performed.',
      instructions: `Take an application and get it deployed through a pipeline to somewhere with
a public URL. Free tiers are entirely adequate — the exercise is the chain, not the budget.

**Automate all six links**: a commit triggers a build, which produces an artefact, tagged
immutably, stored in a registry, deployed, and started.

**Prove the gate works.** Break a test deliberately and show the deploy was blocked. A gate that
has never refused anything is unverified.

**Take configuration from the environment**, so the same image runs locally and remotely, and add
a **health check that reaches a real dependency** rather than returning a constant.

**Then deploy something broken on purpose and roll it back.** Performed, not described. It feels
perverse and it is the only way to find out the rollback works while it does not matter.

**Submit:** the URL, the pipeline configuration, and a note covering the six links and what
automates each, what happened when you broke the test, how long the rollback took, how you can
tell which version is live, and **one thing that went wrong while setting this up** — everybody
has one and it is usually the most instructive part.`,
      rubric: [
        { criterion: 'The chain is automated end to end', description: 'A commit reaches a running process without a manual step, with the artefact tagged immutably.', maxPoints: 25 },
        { criterion: 'The gate has actually refused', description: 'A deliberately broken test is shown blocking the deploy rather than the gate being assumed to work.', maxPoints: 25 },
        { criterion: 'The rollback was performed', description: 'A broken deploy was rolled back in practice, with the elapsed time reported.', maxPoints: 30 },
        { criterion: 'The running version is identifiable', description: 'An immutable tag is visible somewhere, so the deployed contents can be named with certainty.', maxPoints: 20 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('A health check that returns a constant is inadequate because it reports that the process is running without establishing that it can:',
        [['Reach the dependencies it needs', true],
         ['Handle the expected request volume', false],
         ['Respond within an acceptable latency', false],
         ['Serve the correct version of the code', false]],
        'A process up but unable to reach its database receives traffic and fails every request, which a constant-returning check reports as healthy.'),
      mcq('The deliberate broken deploy feels perverse and is the only way to find out the rollback works:',
        [['While it does not matter', true],
         ['Without affecting the production data', false],
         ['Before the pipeline is fully configured', false],
         ['Within the time the exercise allows for', false]],
        'An untested rollback is a plan rather than a capability, and discovering it does not work during a real incident is the expensive alternative.'),
    ],
  },
  {
    unitCode: 'T4_CLOUD_BUILD_DEBUGGING',
    notes: `**It is down and nobody knows why.** Working from the evidence available, and then
adding the evidence that was missing.

## Work outward from the process

**Is it running?** A container that exited immediately is a different problem from one running and
unresponsive.

**What did it say as it died?** **The exited container's logs are the most commonly discarded
source of the answer**, because the instinct is to restart and retry — which destroys them.

**Can it reach what it needs?** From inside the container. The network inside is not the network
outside, and reachability from your laptop establishes nothing.

## The four usual causes

**A missing environment variable.** Commonest by a distance. It expanded to nothing and the
connection string is malformed in a way the error does not explain.

**A port mismatch.** The process listens on one and the container exposes another.

**A permission.** The process runs as a different user than on your machine and cannot write where
it expects.

**A path.** Works locally because of a file that is not in the image.

## DNS specifically

**Test with an address as well as a name.** If the address works and the name does not, you have
found it in thirty seconds rather than an hour of network investigation.

## The second half of the exercise

**Add what was missing.** Every incident should leave the system more observable than it found it:
a log line at the boundary that had none, a health check that would have caught it, a metric that
would have shown it coming.

**An incident that produces only a fix has wasted most of its value.**

## Restarting is not diagnosis

**It frequently works**, which is the danger: the cause remains and the next occurrence is at a
worse time with no more information than this one.`,
    mcqs: [
      mcq('Testing with an address as well as a hostname isolates DNS resolution from connectivity, turning an hour of network investigation into:',
        [['A thirty-second answer', true],
         ['A configuration change in the container', false],
         ['A question for the network administrator', false],
         ['A comparison against the staging environment', false]],
        'If the address connects and the name does not, resolution is the fault and everything else in the network path is eliminated at once.'),
      mcq('An incident that produces only a fix has wasted most of its value because every incident should leave the system:',
        [['More observable than it found it', true],
         ['Documented for the next person affected', false],
         ['Running on a more recent version of the code', false],
         ['Protected by an additional automated test', false]],
        'The investigation revealed which evidence was missing, and adding it is what makes the next occurrence faster to diagnose.'),
    ],
    checkpoint: [
      mcq('The exited container’s logs are the most commonly discarded source of the answer because the instinct is to:',
        [['Restart and retry, which destroys them', true],
         ['Check the orchestrator events instead', false],
         ['Rebuild the image before investigating', false],
         ['Look at the host system log first', false]],
        'Starting a replacement container removes the failed one, taking with it the output that explained why it could not start.'),
      mcq('Restarting is dangerous precisely because it frequently works, leaving the cause in place so the next occurrence is at a worse time with:',
        [['No more information than this one', true],
         ['A larger number of affected users', false],
         ['Less time available to investigate it', false],
         ['A different set of symptoms presented', false]],
        'Nothing was learned and nothing was added, so the next incident begins from exactly the same position of ignorance.'),
    ],
  },
  {
    unitCode: 'T4_CLOUD_BUILD_INTERVIEW_QUESTION',
    notes: `**"Walk me through how you would deploy this."** Or, for your own work, "how does your
project get deployed?"

## What a strong answer contains

**A concrete route**, not a plan. "It builds into a container, the pipeline runs the tests, it
deploys to X" — rather than "I would use Docker", which is a statement about intention.

**Where configuration comes from**, and where it is set. Saying this unprompted signals you have
met the problem it solves.

**What happens when it breaks.** "The previous image is still there and I can start it." Even a
manual rollback is a real answer; not having one is the weak spot.

**One thing you got wrong.** A missing variable, a port mismatch, a migration that could not be
reversed. This is what makes the account credible.

## The follow-ups

**"Two people deploy at once."** A lock, a queue, or an honest "it would conflict and I have not
handled it".

**"How do you know it worked?"** A health check and the error rate. "I open the page" is honest
and weaker; **"I assume it worked" is the answer to avoid.**

**"What about the database?"** The three-deploy sequence: tolerate both shapes, migrate, remove
the tolerance. Asked constantly and rarely answered well.

**"At ten times the traffic?"** They are not asking you to design for scale. They are checking
whether you know which part breaks first.

## The depth marker

**Mentioning what you would need to add before you would be comfortable being on call for it.**
It reframes the whole answer around operational responsibility, which is what the direction
actually is.

## What loses marks

**Naming tools rather than describing a route.** The question was how the thing gets from a commit
to running, and an inventory answers none of it.`,
    mcqs: [
      mcq('The depth marker is mentioning what you would need to add before being comfortable being on call for it, because it reframes the answer around:',
        [['Operational responsibility', true],
         ['The reliability of the chosen tools', false],
         ['The cost of running the system continuously', false],
         ['How the work would be divided in a team', false]],
        'Being called when it stops is what the direction actually is, so framing the deployment in those terms demonstrates understanding of the role.'),
      mcq('"What about the database?" is asked constantly and rarely answered well, and the expected answer is:',
        [['Tolerate both shapes, migrate, remove the tolerance', true],
         ['Take a backup before applying any migration', false],
         ['Apply migrations during a scheduled maintenance window', false],
         ['Run the migration after the new code is live', false]],
        'Code rolls back and a dropped column does not, so only a three-deploy sequence keeps every intermediate state reversible.'),
    ],
    checkpoint: [
      mcq('"I would use Docker" is weaker than a concrete route because it is a statement about:',
        [['Intention rather than what happens', true],
         ['A tool that may not suit the application', false],
         ['A decision that has not been approved yet', false],
         ['Technology rather than about architecture', false]],
        'The question asks what happens today. A conditional answer suggests the thing has never actually been deployed.'),
      mcq('Among the answers to "how do you know it worked", the one to avoid is:',
        [['That you assume it worked', true],
         ['That you open the page and check', false],
         ['That you watch the error rate briefly', false],
         ['That you call the health endpoint yourself', false]],
        'It means nothing would have told you, which is the specific gap the question is probing rather than a matter of sophistication.'),
    ],
  },

  /* ══ T4_CLOUD_QUALITY ═══════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_CLOUD_QUALITY_KNOWING_IT_IS_WORKING',
    notes: `**Answering "is it working" from evidence rather than from hope.**

## The three kinds of signal

**Health.** A binary: can this process serve? Used by the orchestrator to decide whether to send
traffic or restart.

**Metrics.** Numbers over time: request rate, error rate, duration, saturation. They answer "is it
getting worse" and "since when".

**Logs.** Individual events with context. They answer "what happened to this particular request".

**You need all three** and they answer different questions. A system with only logs cannot see a
trend; one with only metrics cannot explain a spike.

## The four numbers worth having

**Request rate.** **Error rate.** **Duration, as percentiles.** **Saturation** — how close
something is to a limit: connections, memory, disk.

**Percentiles rather than averages**, because an average hides the slow tail, and the slow tail is
what users experience and report.

## Correlation

**A request id threaded through every log line** is the single highest-value logging decision in
a system handling concurrent work. Without it, a hundred interleaved requests produce a hundred
unattributable lines.

## Alerting

**Alert on symptoms, not causes.** "Error rate above X for five minutes" is actionable. "CPU above
80%" is frequently normal and produces alerts people learn to ignore.

**Every alert should have an action.** One that nobody can act on trains the team to dismiss
alerts, which is worse than having none.

## The question that tests all of it

**"How long would it take you to notice if this broke right now?"** If the answer is "when
somebody tells me", the observability is decorative regardless of how many dashboards exist.`,
    mcqs: [
      mcq('A system with only logs cannot see a trend, and one with only metrics cannot:',
        [['Explain a spike', true],
         ['Detect that a failure occurred', false],
         ['Measure the request duration accurately', false],
         ['Report on the saturation of a resource', false]],
        'Metrics aggregate and lose the individual events, so the specific requests that caused an increase are no longer recoverable from them.'),
      mcq('Alerting on "CPU above 80%" rather than on a symptom produces alerts people learn to ignore because that condition is:',
        [['Frequently normal', true],
         ['Difficult to measure reliably', false],
         ['Reported too late to be actionable', false],
         ['Specific to one kind of workload', false]],
        'High utilisation is often the intended state, so the alert fires without anything being wrong and the team stops treating it as meaningful.'),
    ],
    checkpoint: [
      mcq('"How long would it take you to notice if this broke right now?" tests everything, and if the answer is "when somebody tells me" the observability is:',
        [['Decorative, whatever dashboards exist', true],
         ['Adequate for a system of that size', false],
         ['Missing only an alerting configuration', false],
         ['Sufficient provided users report promptly', false]],
        'Dashboards require somebody to be looking. Without an alert on a symptom, detection depends entirely on a user noticing first.'),
      mcq('Percentiles are preferred to averages for duration because an average hides the slow tail, which is:',
        [['What users experience and report', true],
         ['Caused by infrastructure rather than code', false],
         ['Only relevant during periods of high load', false],
         ['Excluded from most monitoring systems', false]],
        'A fast majority pulls the mean down while the slowest requests are the ones generating complaints, so the tail is the decision-relevant number.'),
    ],
  },
  {
    unitCode: 'T4_CLOUD_QUALITY_HARDER_FAULT',
    notes: `**A deployment that passes every check it has and is still wrong.**

## Why these survive

**The checks verify the deploy succeeded.** These faults are in the relationship between what was
deployed and what the system needs, and no green pipeline observes that.

## The five

**A health check that always passes.** Returns a constant, so a process unable to reach its
database is reported healthy and receives traffic it cannot serve.

**Configuration that differs between environments in a way nobody documented.** It works in
staging because staging has a variable production does not.

**A resource limit nobody set.** No memory limit, so one misbehaving process takes the whole node
with it. Or a limit set too low, so it is killed under normal load.

**Logs going nowhere.** Written to a file inside a container that is deleted on restart, so the
evidence for every incident is destroyed by the response to it.

**A backup that has never been restored.** It exists, it is scheduled, it runs, and nobody has
established that it can be read back.

## Finding them

**Ask what would happen if each dependency disappeared**, one at a time. Then check whether
anything would notice.

**And for each piece of evidence you would want during an incident, check it exists now** — not
that it could be added.

## The one that is worst when it happens

**The unrestored backup.** Every other fault costs time. This one is the only entry on the list
that can be unrecoverable, and it is discovered at exactly the moment nothing else can help.`,
    mcqs: [
      mcq('Logs written to a file inside a container are destroyed on restart, which means the evidence for every incident is destroyed by:',
        [['The response to it', true],
         ['The orchestrator’s retention policy', false],
         ['The image being rebuilt afterwards', false],
         ['The health check failing repeatedly', false]],
        'Restarting is the standard first action, and it removes the container filesystem along with the explanation of what went wrong.'),
      mcq('The unrestored backup is the worst fault on the list because it is the only one that can be:',
        [['Unrecoverable', true],
         ['Caused by a configuration mistake', false],
         ['Present across every environment at once', false],
         ['Expensive to detect before it matters', false]],
        'Every other entry costs time to diagnose and fix. A backup that cannot be read back means the data is simply gone.'),
    ],
    checkpoint: [
      mcq('The technique for finding this class includes asking what would happen if each dependency disappeared, and then checking whether:',
        [['Anything would notice', true],
         ['A retry would recover automatically', false],
         ['The dependency has a documented owner', false],
         ['The failure is covered by an existing test', false]],
        'Failure behaviour and failure detection are separate properties, and the second is the one usually absent even where the first was considered.'),
      mcq('For each piece of evidence you would want during an incident, the check is that it exists now rather than:',
        [['That it could be added', true],
         ['That somebody knows how to read it', false],
         ['That it is retained for long enough', false],
         ['That it is correlated by request id', false]],
        'Evidence has to be present before the incident to cover it. Anything added afterwards misses the event that prompted adding it.'),
    ],
  },
  {
    unitCode: 'T4_CLOUD_QUALITY_PRACTICE',
    notes: `**Reviewing a deployment without being told what is wrong with it.**

## The drill

**A deployed system and its configuration, thirty minutes.** Findings ordered by consequence.

## The review checklist

**Does the health check establish it can serve, or only that it is running?**

**Is the running version identifiable?**

**Has the rollback been performed, or only described?**

**Where do logs go, and do they survive a restart?**

**Would anything notice a failure before a user did?**

**Are there resource limits, and are they right?**

**Has a backup been restored?**

Seven questions, twenty minutes, any deployment.

## Ordering the findings

**By what they cost when they fire.** An unrestored backup outranks a noisy alert, however much
more often the alert is encountered.

**Students order by how broken it looks**, which puts visible untidiness above the quiet
single-point failure.

## Writing it up

**Name the incident it would produce.** "If the database is unreachable, the health check still
passes and traffic keeps arriving at a process that cannot serve it." That is a scenario somebody
can act on rather than a configuration observation.

## Why this is the practice unit

**Because the direction is operational responsibility**, and reviewing a system you did not deploy
is exactly the position you are in when you are handed one to run.`,
    mcqs: [
      mcq('Findings should be ordered by what they cost when they fire, so an unrestored backup outranks a noisy alert:',
        [['However much more often the alert is encountered', true],
         ['Because backups are checked less frequently', false],
         ['Unless the data can be reconstructed elsewhere', false],
         ['Only when the system stores customer data', false]],
        'Frequency and consequence are different axes, and a rare unrecoverable failure outweighs a common irritation.'),
      mcq('"If the database is unreachable, the health check still passes and traffic keeps arriving" is stronger than a configuration observation because it names:',
        [['The incident it would produce', true],
         ['The component that is misconfigured', false],
         ['The standard the configuration violates', false],
         ['The change required to correct the setting', false]],
        'A described incident is a cost somebody can weigh, whereas an observation about configuration can be acknowledged and deprioritised.'),
    ],
    checkpoint: [
      mcq('Reviewing a system you did not deploy is exactly the position you are in when:',
        [['You are handed one to run', true],
         ['A colleague asks for a second opinion', false],
         ['An incident occurs outside working hours', false],
         ['A vendor migration is being evaluated', false]],
        'Operational responsibility routinely arrives for systems somebody else built, which is why the review is practised on unfamiliar configurations.'),
      mcq('Students order findings by how broken it looks, which puts visible untidiness above:',
        [['The quiet single-point failure', true],
         ['Issues that require infrastructure changes', false],
         ['Problems reported by automated tooling', false],
         ['Anything that has not caused an incident yet', false]],
        'A messy configuration is conspicuous and survivable, while an unnoticed dependency with no failure path is invisible until it fails.'),
    ],
  },
  {
    unitCode: 'T4_CLOUD_QUALITY_INTERVIEW_QUESTION',
    notes: `**"How would you know if this system was broken?"**

## Why it is the quality question for this direction

**Because the role is being responsible for something running**, and the first duty of that role is
knowing its state. A candidate who cannot answer this has not been responsible for anything.

## The answer

**Health, metrics and logs**, with what each answers. Not a list of products — the three kinds of
signal and the different questions they serve.

**The four numbers:** request rate, error rate, duration as percentiles, saturation.

**Alerts on symptoms**, with an action attached to each.

**And the honest test:** how long until somebody notices. If the answer is "a user tells us", say
so — it is true of most student systems and admitting it is stronger than implying otherwise.

## The follow-ups

**"What would you alert on?"** Error rate and latency, at a threshold with a duration. Not CPU.

**"You get paged at 3am. What do you do?"** A real sequence: check whether it is affecting users,
check what changed recently, check the four numbers, then the logs for one failing request.
**"Check what changed" is the highest-value step and most candidates omit it** — most incidents
follow a change.

**"How do you avoid alert fatigue?"** Fewer alerts, each with an action. An alert nobody acts on
should be deleted, and saying that is a marker.

## The depth marker

**Distinguishing "it is up" from "it is working".** They are different claims and the gap between
them is where the direction's value is.

## What loses marks

**Naming monitoring products.** The question was what you would measure and what you would do
about it, and a product list answers neither.`,
    mcqs: [
      mcq('In the 3am sequence, the highest-value step that most candidates omit is:',
        [['Checking what changed recently', true],
         ['Reading the logs for a failing request', false],
         ['Confirming whether users are affected', false],
         ['Looking at the saturation of resources', false]],
        'Most incidents follow a change, so identifying the recent deploy or configuration edit frequently resolves it before any deeper investigation.'),
      mcq('Saying that an alert nobody acts on should be deleted is a marker because retaining it produces:',
        [['Fatigue that devalues the other alerts', true],
         ['Additional cost in the monitoring system', false],
         ['Confusion about which team owns the service', false],
         ['Gaps in the historical record of incidents', false]],
        'Every ignored alert trains the team to dismiss notifications, which degrades the response to the ones that matter.'),
    ],
    checkpoint: [
      mcq('Admitting that a user would be the first to notice is stronger than implying otherwise because it is:',
        [['True of most student systems', true],
         ['A requirement of the question as asked', false],
         ['Evidence of a well-understood limitation', false],
         ['Less risky than describing a monitoring setup', false]],
        'The interviewer can establish the real answer in one follow-up, and an accurate account of a limitation is more credible than an overstated capability.'),
      mcq('The depth marker is distinguishing "it is up" from "it is working", and the gap between them is:',
        [['Where the direction’s value is', true],
         ['Measured by the health check endpoint', false],
         ['Only relevant for systems under load', false],
         ['Handled automatically by the orchestrator', false]],
        'Keeping a process running is straightforward; establishing that it is serving correctly is the operational capability being hired for.'),
    ],
  },

  /* ══ T4_CLOUD_PROOF ═════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_CLOUD_PROOF_ADVANCED_CHALLENGE',
    notes: `**A deploy that went wrong. Roll it back, keep the data, and account for the decision
afterwards.**

## The brief

**Deliberately deploy something broken to a system you have running**, and handle it as an
incident.

**Broken in a way that matters:** a failing dependency, a bad configuration, a migration that does
not match the code. Not a cosmetic change.

## What to do and record

**Detect it.** How did you find out? If the answer is "I knew because I deployed it", add the
detection you would have needed and do it again.

**Decide.** Roll back, or fix forward? **Both are legitimate and the reasoning differs**: roll back
when the previous state is known good and the fix is not immediate; fix forward when the rollback
would itself be destructive, which a schema change frequently makes it.

**Act**, and time it.

**Verify.** How do you know the system is healthy now? The same evidence you would want at 3am.

**Then write it up.**

## The write-up

**Timeline. What was affected, and for how long. What the cause was. What was done. What would
have detected it sooner. What will change.**

**Blameless, and specific.** The value is entirely in the last two items, and a write-up that
stops at "the cause was a bad config" has recorded an event rather than learned from it.

## Why this is the advanced challenge

**Because the direction is being the person called when it stops**, and an engineer who has never
handled an incident — even a manufactured one — has no evidence of the capability the role is
entirely about.

## What to submit

**The incident write-up, with the timings**, and a note on what you added to the system afterwards.`,
    assignment: {
      title: 'The rollback',
      description: 'Deliberately break a running deployment, handle it as an incident, and produce a write-up with timings and the detection you added afterwards.',
      instructions: `Deliberately deploy something broken to a system you have running, and handle
it as an incident. **Broken in a way that matters** — a failing dependency, a bad configuration, a
migration that does not match the code — not a cosmetic change.

**Detect it.** If the only reason you knew was that you deployed it, add the detection you would
have needed and do it again.

**Decide between rolling back and fixing forward.** Both are legitimate and the reasoning differs:
roll back when the previous state is known good and the fix is not immediate; fix forward when the
rollback would itself be destructive, which a schema change frequently makes it. **Act, and time
it.**

**Verify** that the system is healthy using the same evidence you would want at 3am.

**Submit an incident write-up** containing the timeline, what was affected and for how long, the
cause, what was done, **what would have detected it sooner, and what will change** — the value is
entirely in those last two. Blameless and specific. A write-up stopping at "the cause was a bad
config" has recorded an event rather than learned from it.

Add a note on what you changed in the system afterwards.`,
      rubric: [
        { criterion: 'A genuine failure, detected', description: 'The break affects service rather than being cosmetic, and detection came from evidence rather than from knowing it was deployed.', maxPoints: 25 },
        { criterion: 'The decision is reasoned', description: 'Rolling back or fixing forward is chosen with a stated reason rather than by default.', maxPoints: 25 },
        { criterion: 'Timeline with real timings', description: 'The write-up records when things happened and how long recovery took.', maxPoints: 20 },
        { criterion: 'Detection and change identified', description: 'What would have caught it sooner, and what was actually added to the system afterwards.', maxPoints: 30 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('Fixing forward rather than rolling back is the reasoned choice when the rollback would itself be destructive, which a:',
        [['Schema change frequently makes it', true],
         ['Configuration change usually implies', false],
         ['Dependency upgrade always produces', false],
         ['Traffic increase can occasionally cause', false]],
        'Reverting code against a migrated schema can leave the application unable to read its own data, so the previous state is no longer safe.'),
      mcq('A write-up stopping at "the cause was a bad config" has recorded an event rather than learned from it because it omits:',
        [['What would have detected it and what will change', true],
         ['The exact configuration value that was wrong', false],
         ['The name of the person who made the change', false],
         ['How long the investigation took to complete', false]],
        'The cause explains this occurrence. Detection and remediation are what alter the outcome of the next one.'),
    ],
  },
  {
    unitCode: 'T4_CLOUD_PROOF_SPECIALIZATION_INTERVIEW',
    notes: `**A full interview on cloud and operations alone.**

## Where it starts

**Something you have running.** What it is, where it runs, how it got there. They are establishing
that real operational experience exists.

## Where it goes

**"Walk me through commit to running."** The six links.

**"How do you know it is working?"** Health, metrics, logs, and how long until somebody notices.

**"Something is down at 3am."** The sequence, starting with what changed.

**"You need to change the database schema."** Three deploys.

**"Two deploys at once."** Lock, queue, or honest.

**"What does this cost, and what dominates it?"** Compute hours, storage, egress, managed
premiums. Cost literacy is part of this direction and candidates rarely expect the question.

**"What would you add before being on call for this?"** The best question in the round, and the
answer says more than any of the others.

## The depth markers

**Having performed a rollback.** **Knowing what is running, by tag.** **An incident write-up that
names what changed afterwards.** Each is rare and each signals real responsibility.

## The failure mode

**Tool fluency with no operational experience.** A candidate who can configure a pipeline and has
never been woken by one. The round finds it quickly, because every question is about what happens
when things go wrong and tool knowledge does not help with any of them.

## How to prepare

**Three stories: an incident you handled, a rollback you performed, and something you added to a
system after it failed.** All three are rare in student work, and the third is the strongest
because it demonstrates the loop closing.`,
    mcqs: [
      mcq('The failure mode this round finds quickly is tool fluency with no operational experience, and it is found quickly because every question is about:',
        [['What happens when things go wrong', true],
         ['Products the candidate may not have used', false],
         ['Scale beyond what a student encounters', false],
         ['Cost management in a commercial setting', false]],
        'Configuration knowledge answers none of the failure questions, so the gap between setting something up and running it becomes visible immediately.'),
      mcq('Of the three stories to prepare, the strongest is something you added to a system after it failed, because it demonstrates:',
        [['The loop closing', true],
         ['Familiarity with monitoring tooling', false],
         ['That the original design was incomplete', false],
         ['An ability to work under time pressure', false]],
        'Handling an incident shows response; changing the system afterwards shows the response produced a durable improvement.'),
    ],
    checkpoint: [
      mcq('Cost literacy is part of this direction and candidates rarely expect the question, with the dominant items being compute hours, storage, egress and:',
        [['Managed-service premiums', true],
         ['The number of deployments performed', false],
         ['Log retention beyond the default period', false],
         ['Support contracts with the provider', false]],
        'Paying somebody else to operate a service carries a premium over the primitives, and it is one of the few categories that dominates a bill.'),
      mcq('"What would you add before being on call for this?" is described as the best question in the round because the answer says:',
        [['More than any of the others', true],
         ['Whether the candidate wants the responsibility', false],
         ['How mature the existing system already is', false],
         ['Which monitoring products they prefer to use', false]],
        'It requires imagining being responsible for the system at its worst, which exposes both what is missing and whether the candidate has thought that way before.'),
    ],
  },
  {
    unitCode: 'T4_CLOUD_PROOF_CHECKPOINT',
    notes: `**Whether cloud and operations capability is demonstrable.**

## What the track asked for

**Understanding the chain** — six links from commit to running process, and what fails at each.

**Automating it** — a pipeline with a gate that has refused something, an immutable artefact, a
performed rollback.

**Observing it** — health, metrics, logs, and an honest answer to how long until somebody notices.

**Handling it** — a manufactured incident, with a write-up naming what would have detected it
sooner and what changed afterwards.

## The bar

**The fourth is the direction.** Setting up a pipeline is a weekend. Being the person who handles
it when it breaks, and who leaves the system more observable afterwards, is what the role is for
and what almost no student has evidence of.

## What a reviewer looks at

**The incident write-up**, because almost nobody has one and it is the direct artefact of the
capability being hired for.

**The performed rollback with its timing**, for the same reason — it distinguishes a capability
from a plan.

## If this does not pass

**The usual gap is that everything was built and nothing was ever broken.** The pipeline works,
the deployment succeeded, and no failure has ever been handled. **That is a week** — break it
deliberately, handle it, write it up — and the week produces the two artefacts a reviewer wants.

## What this feeds

**Mock 5** on operations depth, which opens with commit-to-running. **The portfolio**, where the
incident write-up is the piece worth showing. **P14's production project**, whose deployment,
logging and monitoring requirements are this track applied to something you built yourself.`,
    checkpoint: [
      mcq('The part of the track that constitutes the direction is handling a failure and leaving the system more observable, because setting up a pipeline is:',
        [['A weekend', true],
         ['Covered adequately by the engineering build', false],
         ['Dependent on the specific cloud provider', false],
         ['Something most candidates can already do', false]],
        'Automation is a configuration task with abundant documentation. Operational responsibility is the scarce capability the role is hired for.'),
      mcq('The incident write-up is what a reviewer looks at because it is the direct artefact of:',
        [['The capability being hired for', true],
         ['The technical depth of the deployment', false],
         ['The student’s written communication skill', false],
         ['The complexity of the system being run', false]],
        'The role is being responsible when things break, and a write-up is the evidence that responsibility was exercised rather than described.'),
      mcq('When this checkpoint does not pass, the usual gap is that everything was built and:',
        [['Nothing was ever broken', true],
         ['The monitoring was never configured', false],
         ['The pipeline was assembled manually', false],
         ['The deployment target was only local', false]],
        'A successful build history contains no evidence of handling failure, which is the half of the direction that has not been exercised.'),
      mcq('P14’s deployment, logging and monitoring requirements are described as this track applied to:',
        [['Something you built yourself', true],
         ['A system with real external users', false],
         ['An environment you did not configure', false],
         ['A larger scale than this track covered', false]],
        'The operational practices are the same; what changes is that the application under them is the student’s own production project.'),
    ],
  },
];
