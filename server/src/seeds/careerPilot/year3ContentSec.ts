/**
 * T3_SEC_THREATS and T3_SEC_APPSEC — twelve units. Year 3, security track.
 * The remaining four topics of S17 are in year3ContentSecRest.
 *
 * ── THE CORE TAUGHT RECOGNITION; THIS TRACK TEACHES ASSESSMENT ────────────────────────────
 *
 * S10 taught a student to write code without the obvious holes and to notice when a design
 * has one. That is the standard for every graduate. This track is for the ones who will be
 * asked to look at somebody else's system and say what is wrong with it — which is a
 * different job, and the difference is method rather than knowledge.
 *
 * So the units are built around producing a finding: modelling a system you did not build,
 * searching code you did not write, testing against your own model, knowing what a scanner
 * misses, and writing something a developer will act on rather than argue with.
 *
 * WRITING_IT_UP matters more here than anywhere else in Year 3. A security finding lands on
 * somebody who did not ask for it, who is busy, and who may reasonably disagree. A finding
 * that is right and badly written does not get fixed — and an unfixed finding has the same
 * value as one that was never found.
 *
 * WHEN_SOMETHING_HAPPENS is the incident unit, and it is deliberately unglamorous: contain,
 * preserve evidence, communicate, and write it up without blaming a person.
 *
 * Attribution: SEC_THREATS is single-skill and derived. APPSEC defaults to WEB_SECURITY
 * with broken access control overridden to AUTHORIZATION.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const SEC_BUNDLES: PilotBundle[] = [
  /* ══ T3_SEC_THREATS ═════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_SEC_THREATS_MODELLING_A_REAL_SYSTEM',
    notes: `The core topic modelled a system you built. **This one models a system somebody
else built, which you do not understand yet** — and that is the normal situation for anybody
doing security work.

## You will not be given a diagram

Or you will be given one that is three years old and describes four services where there are
eleven. **Build your own.**

**From the code:** the import graph, the routes, the configuration. **From the deployment:**
what is actually running, in which network, with which permissions. **From the people:** ten
minutes with an engineer is worth two hours of reading, and the question that opens it is
"what would worry you most about this system?"

**That question is remarkably effective.** People who work on a system usually know where the
soft parts are and are rarely asked.

## Work outside in

**Start where an attacker starts: what can be reached.**

1. **What is exposed to the internet?** The cloud security unit's list, applied here.
2. **What authentication protects each?**
3. **What can an authenticated user reach?**
4. **What can one user reach that belongs to another?**
5. **What can an internal service reach?**
6. **What can somebody with a laptop and an employee badge reach?**

**Each step assumes the previous barrier failed**, which is what makes it a model rather than
a checklist.

## The data question, first

**Before the components: what is worth taking, and where does it live?**

Personal data, credentials, payment details, commercially sensitive material.

**Then: everywhere it goes.** Backups, logs, analytics, exports, staging copies, a developer's
laptop, a third-party processor. **The database is rarely the easiest route to the data**, and
tracing the copies is what finds the easier ones.

## Trust boundaries in somebody else's system

**Look for where data crosses from less trusted to more**, and pay particular attention to the
boundaries that are not obvious:

- A webhook from a third party. **Verified, or assumed?**
- An internal service call. **Authenticated, or "it is on the internal network"?**
- A file upload.
- An administrative tool. **Frequently the least hardened thing in the estate** and the most
  powerful.
- A batch import from a partner.
- Anything a support agent can do on a customer's behalf.

## Ranking, in somebody else's system

**The asymmetry question from the core topic**, plus one more: **what is easiest to fix?**

A finding that is medium severity and takes an hour will be fixed. One that is high severity
and requires re-architecting will be scheduled, deferred, and still open next year.

**So report both**, and say which you would do this week.

## What to produce

**Not a document.** A ranked list of findings, each one actionable — component, field, missing
control, consequence — as the core topic specified.

**And a diagram**, because you built one and it is probably better than theirs. **It is
frequently the most appreciated part of the work**, which says something about how many systems
have no accurate picture of themselves.`,
    mcqs: [
      mcq('The question that opens a useful conversation with an engineer is:',
        [['What would worry you most about this system', true],
          ['Where is the architecture documentation', false],
          ['Which parts handle personal data', false],
          ['Who has production access', false]],
        'People know where the soft parts are and are rarely asked.'),
      mcq('Working outside in means each step:',
        [['Assumes the previous barrier failed', true],
          ['Covers a different component', false],
          ['Addresses a different threat actor', false],
          ['Examines a deeper layer of the stack', false]],
        'Which is what makes it a model rather than a checklist.'),
      mcq('Tracing everywhere the data goes matters because:',
        [['The database is rarely the easiest route to it', true],
          ['Copies are harder to secure than originals', false],
          ['Regulations require an inventory', false],
          ['Backups are the most common target', false]],
        'Backups, logs, exports, staging, a laptop, a processor.'),
      mcq('An administrative tool is worth particular attention because:',
        [['It is frequently the least hardened and the most powerful', true],
          ['It is used by the most people', false],
          ['It bypasses the application layer altogether', false],
          ['It is rarely covered by tests', false]],
        'A combination that is common and badly served.'),
    ],
    checkpoint: [
      mcq('Ranking findings in somebody else’s system adds the question:',
        [['What is easiest to fix', true],
          ['Who owns the component', false],
          ['How long it has existed', false],
          ['Whether it is covered by policy', false]],
        'A medium finding fixable in an hour gets fixed; a high one needing re-architecture does not.'),
      mcq('The deliverable of a threat model is:',
        [['A ranked list of actionable findings', true],
          ['A comprehensive document', false],
          ['A risk matrix', false],
          ['A prioritised backlog for the team', false]],
        'Component, field, missing control, consequence.'),
      mcq('The diagram you build is frequently appreciated because:',
        [['Many systems have no accurate picture of themselves', true],
          ['Security diagrams use a clearer notation', false],
          ['It replaces outdated documentation formally', false],
          ['Engineers rarely see the whole system', false]],
        'Which says something about the state of most documentation.'),
    ],
  },

  {
    unitCode: 'T3_SEC_THREATS_COMMON_VULNERABILITY_CLASSES',
    notes: `**A small number of classes account for most real breaches.** Knowing them by shape
rather than by name is what lets you find them in a system nobody has told you about.

## The ones that actually cause breaches

**Broken access control.** The most common by a distance. Changing an id, reaching another
tenant's data, an endpoint with no check. **The core topic gave it a unit and this track gives
it another**, because it is worth two.

**Injection.** Data treated as code. SQL, shell, template, LDAP.

**Misconfiguration.** A public bucket, a default credential, debug mode on, an admin panel
exposed, a permissive security group. **This is the cloud security unit's territory, and it
accounts for an enormous share of incidents** — more than the sophisticated attacks people
imagine.

**Vulnerable dependencies.** A known CVE, unpatched, with a public exploit.

**Authentication failures.** Weak passwords, no rate limiting on login, credentials that never
expire, sessions that survive a password change.

**Cryptographic failures.** Data not encrypted in transit or at rest, a home-made scheme, a
weak hash for passwords, a key in the repository.

**Secrets exposure.** In a repository, in a log, in a client bundle, in an error page.

## Why "by shape" matters

**A list of named vulnerabilities goes stale.** A shape does not.

**Broken access control** is *any* place where the system checks who you are and not what you
may do. You can find that without knowing what it is called this year.

**Injection** is *any* place where input is concatenated into something that gets parsed.

**Misconfiguration** is *any* place where a default was left, or a setting was loosened
temporarily.

**Learning the shapes lets you find the instance in an unfamiliar system**, which is the whole
job.

## Where each is usually found

**Broken access control** — in the endpoints that take an identifier. Especially write
endpoints, which are checked less often than reads.

**Injection** — wherever a string is built near a parser. The grep from the core topic.

**Misconfiguration** — from outside, and in the infrastructure code.

**Vulnerable dependencies** — the audit tool, in one command.

**Authentication failures** — in the login flow, the reset flow, and the session lifecycle.
**The reset flow is the least examined and frequently the weakest**, because it is written
once and never revisited.

**Secrets** — a scanner over the history, the logs and the built bundle.

## The order to look

**Dependencies and configuration first.** One command and one look from outside, and they
account for a large share of what you will find.

**Then access control**, because it is the most common and the least detectable by tools.

**Then injection**, with the grep.

**Then authentication and secrets.**

**Then everything else.**

**That order finds the most in the least time**, which matters because an assessment always has
a deadline.

## What is rarer than people expect

**Novel cryptographic attacks. Zero-days. Sophisticated targeted intrusions.**

They exist and they are not what happens to most organisations. **Most breaches are a default
credential, an exposed bucket, an unpatched dependency or a missing access check** — and an
assessment that spends its time on the exotic and misses those has failed at the thing it was
for.`,
    mcqs: [
      mcq('The most common class by a distance is:',
        [['Broken access control', true],
          ['Injection', false],
          ['Vulnerable dependencies', false],
          ['Cryptographic failures', false]],
        'Which is why the core topic gave it a unit and this track gives it another.'),
      mcq('Learning classes by shape rather than name means:',
        [['You can find the instance in an unfamiliar system', true],
          ['You need fewer tools', false],
          ['The knowledge applies across languages', false],
          ['You can categorise findings consistently', false]],
        'A list of named vulnerabilities goes stale; a shape does not.'),
      mcq('The least examined part of authentication is usually:',
        [['The password reset flow', true],
          ['The login endpoint', false],
          ['The session expiry', false],
          ['The registration flow', false]],
        'Written once and never revisited.'),
      mcq('The first things to look at in an assessment are:',
        [['Dependencies and configuration', true],
          ['Access control and injection', false],
          ['Authentication and secrets', false],
          ['The threat model and the architecture', false]],
        'One command and one look from outside, for a large share of the findings.'),
    ],
    checkpoint: [
      mcq('Access control is examined before injection because:',
        [['It is the most common and the least detectable by tools', true],
          ['It is faster to test', false],
          ['Injection is usually already handled by frameworks', false],
          ['It affects more endpoints', false]],
        'A tool cannot see a check that is absent.'),
      mcq('Write endpoints matter more than read endpoints for access control because:',
        [['They are checked less often and the consequences are worse', true],
          ['They are more numerous', false],
          ['They bypass caching layers', false],
          ['They require an entirely different set of permissions', false]],
        'The core topic said the same thing, and it holds.'),
      mcq('An assessment that spends its time on novel attacks:',
        [['Has failed at the thing it was for', true],
          ['Demonstrates deeper technical skill', false],
          ['Covers the residual risk correctly', false],
          ['Is appropriate for a mature organisation', false]],
        'Most breaches are a default credential or a missing check.'),
    ],
  },

  {
    unitCode: 'T3_SEC_THREATS_RANKING_WHAT_TO_FIX',
    notes: `You have twenty findings. **Somebody has to decide what to do this week**, and that
decision is the value you add — a list with no order produces no action, which the core topic
established and which matters more when the list is somebody else's backlog.

## Three axes, not two

The core topic gave you likelihood and impact. **In an assessment of somebody else's system,
add effort.**

**A medium finding that takes an hour will be fixed. A high finding that needs re-architecting
will be scheduled and still be open next year.**

**So rank twice:** by risk, and by what you would actually do first. **They differ, and saying
so is more useful than either alone.**

## The asymmetry question

> **How cheap is this for an attacker, and how expensive for the organisation?**

An unauthenticated endpoint exposing customer records: minutes for them, a regulatory incident
for you. **Top of the list, whatever else is on it.**

A theoretical timing attack requiring millions of requests and physical proximity: not this
quarter.

## What moves something up

**No authentication required.** Anybody can do it.

**Automatable.** A script can exploit it at scale, so it will be found by a scanner that is
not yours.

**Already exposed.** Reachable from the internet right now.

**Personal or payment data.** Regulatory consequences, reporting obligations, and harm to real
people.

**No detection.** If it happened, would anybody know? **A vulnerability you would not detect
is worse than an equivalent one you would**, and this factor is routinely left out.

## What moves something down

**Needs privileged access already.** An admin can do damage; that is what admin means.

**Needs a chain of other failures.**

**Compensating controls exist.** Rate limiting, monitoring, a manual review step — as long as
you verify they work rather than being told they do.

## The output

**Three groups, not twenty priorities:**

**Fix now.** Exploitable, exposed, serious. A handful at most. **If this group has twelve items
in it, you have not ranked.**

**Fix this quarter.** Real, less urgent.

**Accepted or deferred.** With who decided and when — the core topic's requirement, and in
somebody else's organisation it matters more, because you are not the one deciding.

## Quick wins, separately

**Some things are so cheap that ranking them wastes the ranking:** turn off debug mode, change
a default credential, update a dependency with a known exploit, close a port.

**List them separately as "do these today".** An hour of them frequently beats a quarter of the
ranked work, and it gives the team an immediate win — which matters politically as well as
technically, because a report that produces visible progress in a day is a report people engage
with.

## Presenting it

**Lead with the top three, not the twenty.** A list of twenty is a document; three is a
decision.

**Give each an effort estimate.** Even roughly. It is what turns your list into their plan.

**And be ready to be argued with.** They know things you do not — a control you could not see,
a component being decommissioned next month. **Change your ranking when they tell you
something true**, and say that you have.`,
    mcqs: [
      mcq('The third axis to add when assessing somebody else’s system is:',
        [['Effort', true], ['Detectability', false],
          ['Regulatory exposure', false], ['Component ownership', false]],
        'A medium finding fixable in an hour gets fixed; a high one needing re-architecture does not.'),
      mcq('A factor that is routinely left out of ranking is:',
        [['Whether you would detect the exploitation', true],
          ['Whether authentication is required', false],
          ['Whether it can be automated', false],
          ['Whether personal data is involved', false]],
        'A vulnerability you would not detect is worse than an equivalent one you would.'),
      mcq('A fix-now group containing twelve separate items means:',
        [['You have not ranked', true],
          ['The system is unusually insecure', false],
          ['The categories need a fourth tier', false],
          ['The assessment was thorough', false]],
        'The group is meant to hold a handful at most, or it is not a decision.'),
      mcq('Quick wins are listed separately because:',
        [['An hour of them frequently beats a quarter of the ranked work', true],
          ['They are too small to rank', false],
          ['They do not require any approval to carry out', false],
          ['They can be done by anybody', false]],
        'And visible progress in a day is what makes a report engaged with.'),
    ],
    checkpoint: [
      mcq('Compensating controls reduce a finding’s priority only if:',
        [['You verified they work rather than being told they do', true],
          ['They are documented in the policy', false],
          ['The team confirms that they are all in place', false],
          ['They cover the most likely path', false]],
        'Rate limiting, monitoring, a manual review step — verified.'),
      mcq('Leading with three findings rather than twenty:',
        [['Turns a document into a decision', true],
          ['Hides the less important findings', false],
          ['Understates the overall risk', false],
          ['Is appropriate only for executives', false]],
        'A list of twenty is a document.'),
      mcq('When the team tells you something true that changes your ranking:',
        [['Change it, and say that you have', true],
          ['Note the disagreement in the report', false],
          ['Keep the original ranking for consistency', false],
          ['Ask for written confirmation first', false]],
        'They know things you do not — a control you could not see, a component being retired.'),
    ],
  },

  {
    unitCode: 'T3_SEC_THREATS_DEBUGGING',
    notes: `Five ways a security assessment goes wrong, and how each shows itself.

## 1. The model describes a system that does not exist

**Symptom:** findings that do not apply, and a component the team says was removed last year.

**Cause:** the model came from documentation rather than from the running system.

**Fix:** build it from the code and the deployment. **Then show it to an engineer and ask what
is wrong with it** — that conversation takes ten minutes and corrects more than a day of
reading.

## 2. Everything is critical

**Symptom:** twenty findings, all high, and the team fixes none of them.

**Cause:** severity assigned by category rather than by exploitability in this system. A
theoretical XSS behind an admin login is not the same as an unauthenticated one on the
homepage.

**Fix:** rank by the asymmetry question and force three groups. **And be aware of the
incentive**: a report full of critical findings looks more valuable and produces less change,
which is the wrong trade.

## 3. The finding is right and nobody fixes it

**Symptom:** the report is accepted, thanked for, and nothing changes.

**Causes:** no owner; no effort estimate, so it cannot be planned; written as a category rather
than as a specific change; delivered as a document rather than as tickets.

**Fix:** one ticket per finding, with the file, the change, and an estimate. **A finding that
is not a ticket is a finding that will be rediscovered next year** — and being rediscovered is
how a team learns the exercise changes nothing.

## 4. The finding is wrong

**Symptom:** you report it, and the team explains the control you could not see.

**Causes:** you tested staging, which differs; a compensating control elsewhere; a code path
that is not reachable; you misread the code.

**Fix:** **verify before reporting.** Actually exploit it, on a system you are permitted to
test, and capture the evidence. **A report with three verified findings is worth more than one
with fifteen suspected ones** — and one wrong finding costs the credibility of the other
fourteen.

## 5. You found nothing

**Sometimes true. Usually means you did not look in the right places.**

**Check:** did you look from outside; did you run the dependency audit; did you try two
accounts; did you look at the admin interface; did you check staging as well as production; did
you look at the reset flow?

**And if you genuinely found nothing, say what you covered.** "No issues found" without scope
is worth nothing — the same standard the core security topic set.

## The habits

**Verify every finding before it leaves your hands.**

**Rank ruthlessly**, and force the top group small.

**One ticket per finding**, with an estimate.

**Say what you did not check**, and what it would take.

**And ask the team what worries them.** They are usually right, and it is the cheapest input
available.`,
    mcqs: [
      mcq('A report full of critical findings:',
        [['Looks more valuable and produces less change', true],
          ['Reflects a genuinely insecure system', false],
          ['Is appropriate for a first assessment', false],
          ['Ensures the important items are addressed', false]],
        'The wrong trade, and an incentive to be aware of.'),
      mcq('A finding that is not a ticket:',
        [['Will be rediscovered next year', true],
          ['Is still useful as documentation', false],
          ['Can be tracked in the report', false],
          ['Will be picked up in the next review', false]],
        'And being rediscovered teaches the team that the exercise changes nothing.'),
      mcq('One wrong finding costs:',
        [['The credibility of the other fourteen', true],
          ['A round of clarification', false],
          ['The team’s time to disprove it', false],
          ['A small amount of report accuracy', false]],
        'Three verified findings beat fifteen suspected ones.'),
      mcq('"No issues found" without scope is:',
        [['Worth nothing', true],
          ['Acceptable for a clean system', false],
          ['A positive result', false],
          ['Sufficient if the method is standard', false]],
        'The same standard as the core security topic.'),
    ],
    checkpoint: [
      mcq('The fastest correction to a wrong model is:',
        [['Showing it to an engineer and asking what is wrong with it', true],
          ['Re-reading the code more carefully', false],
          ['Comparing it with the documentation', false],
          ['Generating it from the deployment configuration files', false]],
        'Ten minutes, and it corrects more than a day of reading.'),
      mcq('Severity assigned by category rather than exploitability produces:',
        [['A theoretical finding rated the same as an exposed one', true],
          ['A ranking that is consistent and easy to defend', false],
          ['An overestimate of the total risk', false],
          ['Findings that are easier to compare', false]],
        'An XSS behind an admin login is not an unauthenticated one on the homepage.'),
      mcq('The cheapest input available in an assessment is:',
        [['Asking the team what worries them', true],
          ['Running an automated scanner', false],
          ['Reading the incident history', false],
          ['Reviewing the architecture documentation', false]],
        'They are usually right.'),
    ],
  },

  {
    unitCode: 'T3_SEC_THREATS_PRACTICE',
    notes: `Two exercises on the judgement that turns a list of problems into a plan.`,
    coding: [
      {
        title: 'Rank by cost asymmetry and effort',
        description: `Read one finding per line as
\`<name> <attacker_minutes> <damage> <fix_hours> <detected>\`, where detected is \`yes\` or
\`no\` — whether exploitation would be noticed.

Compute a score: \`damage / max(attacker_minutes, 1)\`, **doubled when detected is \`no\`**.

Print each as \`<name> <score rounded down>\`, sorted by score descending then by name. Then
two lines:

    fix_now=<names with score above 100 and fix_hours at most 8, space separated, or none>
    top=<name of the highest scorer, or none>

The \`fix_now\` group is deliberately narrow: high score **and** cheap to fix.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# Cheap for them, expensive for you, and worse if nobody would notice.
`,
        language: 'python',
        tests: [
          { input: 'idor 1 50000 2 no\n', expectedOutput: 'idor 100000\nfix_now=idor\ntop=idor' },
          { input: 'a 10 1000 2 yes\nb 100 1000 2 yes\n', expectedOutput: 'a 100\nb 10\nfix_now=none\ntop=a' },
          { input: 'slow 1000 50000 200 yes\n', expectedOutput: 'slow 50\nfix_now=none\ntop=slow' },
          { input: '', expectedOutput: 'fix_now=none\ntop=none' },
          { input: 'x 1 500 1 yes\ny 1 500 1 no\n', expectedOutput: 'y 1000\nx 500\nfix_now=y x\ntop=y', isHidden: true },
        ],
      },
      {
        title: 'Is this finding reportable?',
        description: `A finding is reportable when it is **verified**, **specific** and
**actionable**. Read one per line as \`<verified> <names_component> <names_change>\`, each
\`yes\` or \`no\`.

Print, in this order:

- verified \`no\` → \`verify_first\`
- names_component \`no\` → \`too_vague\`
- names_change \`no\` → \`no_action\`
- otherwise → \`reportable\`

Then a final line \`reportable=<n>\`.

Unverified comes first because an unverified finding should not leave your hands at all,
whatever else is true about it.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# One wrong finding costs the credibility of the rest.
`,
        language: 'python',
        tests: [
          { input: 'yes yes yes\n', expectedOutput: 'reportable\nreportable=1' },
          { input: 'no yes yes\n', expectedOutput: 'verify_first\nreportable=0' },
          { input: 'yes no yes\n', expectedOutput: 'too_vague\nreportable=0' },
          { input: 'yes yes no\n', expectedOutput: 'no_action\nreportable=0' },
          { input: 'no no no\n', expectedOutput: 'verify_first\nreportable=0', isHidden: true },
          { input: '', expectedOutput: 'reportable=0', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Threat Modelling Practice',
      description: 'Rank by asymmetry and effort, judge reportability, then model a system you did not build.',
      instructions: `Complete both exercises, then:

1. For the first: the undetected multiplier is a factor of two. Argue for a different number
   and say what evidence would settle it.
2. For the first: \`fix_now\` requires a high score **and** a cheap fix. Give a finding that
   should be fixed now despite being expensive, and say how you would present it.
3. For the second: an unverified finding is rejected before anything else. Say what "verified"
   should mean for a finding you cannot safely exploit.

**Then, model a system you did not build.** An open-source project you can run, or with
written permission, something at a placement. **Not a system you do not own.**

4. Build the diagram from the code and the deployment. Mark every trust boundary.
5. List what is worth taking and **everywhere it goes** — including backups, logs and exports.
6. Work outside in through the six steps. Record what you find at each.
7. Produce at least ten findings. Each one: component, field, missing control, consequence.
8. Rank them with all three axes. Produce the three groups, with **at most three in the first**.
9. List the quick wins separately.
10. **Verify at least three findings.** Actually demonstrate them, and capture the evidence.
11. Say what you did not check and what it would take.`,
      rubric: [
        { criterion: 'Ranking computed', description: 'All cases, with the undetected multiplier and the narrow fix-now group.', maxPoints: 20 },
        { criterion: 'Reportability judged', description: 'All cases, with verification taking precedence.', maxPoints: 15 },
        { criterion: 'A model built from reality', description: 'Diagram from code and deployment, boundaries marked.', maxPoints: 20 },
        { criterion: 'Ten findings, actionable', description: 'Each with component, field, control and consequence.', maxPoints: 15 },
        { criterion: 'Three groups, three at the top', description: 'Ranked on all three axes, with quick wins separate.', maxPoints: 15 },
        { criterion: 'Three verified', description: 'Demonstrated with evidence, and the unchecked scope stated.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]
`,
        tests: [
          { input: 'yes yes yes\n', expectedOutput: 'reportable\nreportable=1' },
          { input: 'no yes yes\n', expectedOutput: 'verify_first\nreportable=0' },
          { input: 'yes no yes\n', expectedOutput: 'too_vague\nreportable=0' },
          { input: 'yes yes no\n', expectedOutput: 'no_action\nreportable=0' },
          { input: 'no no no\n', expectedOutput: 'verify_first\nreportable=0', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('The undetected multiplier exists because:',
        [['Exploitation nobody would notice can continue indefinitely', true],
          ['Undetected issues are harder to fix', false],
          ['Detection generally implies a compensating control', false],
          ['Monitoring reduces the damage', false]],
        'A vulnerability you would not detect is worse than an equivalent one you would.'),
      mcq('An unverified finding is rejected first because:',
        [['It should not leave your hands at all', true],
          ['Verification is the cheapest check', false],
          ['It may still be specific and actionable', false],
          ['The other criteria depend on it', false]],
        'Whatever else is true about it.'),
      mcq('Verifying a finding you cannot safely exploit means:',
        [['Demonstrating the missing control without causing harm', true],
          ['Accepting it purely on the basis of a code review', false],
          ['Reporting it as theoretical', false],
          ['Asking the team to confirm it', false]],
        'A request that should be refused and is not, without taking any data.'),
    ],
  },

  {
    unitCode: 'T3_SEC_THREATS_MINI_PROJECT',
    notes: `Model a real system you did not build, and produce something the team acts on.

The brief's test is **whether anything changed**. A threat model that produces a document is an
exercise; one that produces three merged fixes is security work, and the core topic said so.

**Use only a system you own, an open-source project you can run locally, or something you have
written permission to assess.** Testing a system you do not own is a criminal offence in most
jurisdictions.

Budget around two hours.`,
    assignment: {
      title: 'Mini Project — A Model That Produced Fixes',
      description: 'Model an unfamiliar system, rank honestly, verify findings, and get at least one fixed.',
      instructions: `**Choose** an open-source project you can run locally with at least
authentication and stored data, or your own system, or one you have written permission for.

**Part one — build the picture**

1. The dependency and route graph, generated from the code.
2. What is actually deployed or runnable: components, network, permissions.
3. Every trust boundary, marked.
4. Every data store, what is worth taking in it, and **everywhere copies go**.
5. If you can, ask somebody who knows it: **what would worry you most?** Record the answer.

**Part two — work outside in**

Record findings at each of the six steps:

6. What is reachable without authentication.
7. What authentication protects each thing.
8. What an authenticated user can reach.
9. **What one user can reach that belongs to another.** The two-account test.
10. What an internal service or job can reach.
11. What an administrative user or tool can do, and how well protected it is.

**Part three — the findings**

12. At least twelve, each with component, field, missing control, consequence.
13. **Verify at least four.** Demonstrate them, capture evidence, and for anything you cannot
    safely exploit, demonstrate the missing control without taking data.
14. Rank on all three axes. Three groups. **At most three in "fix now".**
15. Quick wins listed separately with an estimate for the lot.

**Part four — make it change something**

16. **Write each of the top three as a ticket**: the file, the change, an estimate, the
    consequence.
17. **Fix at least one yourself.** Show the change and a test that would catch it returning.
18. If the project accepts contributions, consider submitting it — and say whether you did and
    why.

**Part five — the honest report**

19. What you checked, and what you did not.
20. Anything you suspected and could not verify. **Listed as suspected, not as found.**
21. What would make this assessment out of date.
22. **Did anything change?** Tickets raised, fixes merged. If nothing, say why.

**Submit** the diagram, the findings with their verification evidence, the ranked groups, the
tickets, and the fix.`,
      rubric: [
        { criterion: 'A picture built from reality', description: 'Generated graph, real deployment, boundaries and data copies.', maxPoints: 15 },
        { criterion: 'Outside in, all six steps', description: 'Findings recorded at each, including the two-account test.', maxPoints: 20 },
        { criterion: 'Twelve actionable findings', description: 'Each with component, field, control and consequence.', maxPoints: 15 },
        { criterion: 'Four verified with evidence', description: 'Demonstrated safely, with the unexploitable ones handled properly.', maxPoints: 20 },
        { criterion: 'Ranked and ticketed', description: 'Three axes, three groups, at most three at the top, written as tickets.', maxPoints: 15 },
        { criterion: 'Something actually fixed', description: 'One change made, with a test, and the outcome reported.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('What this project is measured on is:',
        [['Whether anything changed', true],
          ['The number of findings produced', false],
          ['The accuracy of the model', false],
          ['The severity of the worst finding', false]],
        'A model that produces a document is an exercise.'),
      mcq('Something you suspected and could not verify should be:',
        [['Listed as suspected, not as found', true],
          ['Omitted from the report', false],
          ['Reported with a lower severity', false],
          ['Passed to the team to confirm', false]],
        'One wrong finding costs the credibility of the rest.'),
      mcq('Assessing a system you do not own is:',
        [['A criminal offence in most jurisdictions', true],
          ['Acceptable for open-source projects', false],
          ['Permitted if no data is taken', false],
          ['A grey area depending on intent', false]],
        'Own it, run it locally, or have written permission.'),
    ],
  },

  /* ══ T3_SEC_APPSEC ══════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_SEC_APPSEC_FINDING_INJECTION',
    notes: `The core topic explained injection. **This one finds it in a codebase you have
never seen**, in an hour, which is a different skill.

## The searches, in order

**String construction near a parser.** The core topic's grep, and it finds most of it:

    grep -rn "execute(f\\"" .
    grep -rn "execute(.*%.*)" .
    grep -rn "execute(.*+.*)" .
    grep -rn "os.system\\|subprocess.*shell=True" .
    grep -rn "eval(\\|exec(" .

**Then the ORM's raw escape hatch**, whose name differs by framework. **Learn the name for the
framework in front of you and add it to the search** — in an ORM-using codebase this is where
the injection is.

**Then dynamic identifiers.** A table or column name from input, which cannot be
parameterised. Search for string formatting near \`ORDER BY\`, \`FROM\` or a table name
variable.

**Then the second-order case**, which the tools miss entirely: input stored safely, then read
back and concatenated into a query later. **The dangerous line is nowhere near the input**, and
it is the reason a codebase can pass every scanner and still be injectable.

## Following the data

For each candidate, answer three questions:

**Where does this value come from?** Trace it back. A request parameter, a header, a file, a
database row, a message.

**Is it validated or parameterised anywhere on the way?**

**Can an attacker control it?** Not "would they" — **can they**.

**Most candidates die at question three**, and the ones that survive it are your findings.

## Beyond SQL

**Command injection.** Anything building a shell command. **Look for filenames from user
input** — an upload processed by an external tool is the classic.

**Template injection.** User input rendered *as* a template rather than into one.

**Log injection.** A newline in input forging a log line. Minor alone, and it matters when logs
feed an alerting system.

**NoSQL injection.** A query built from a user-supplied object, with operators injected into
it. **Frequently missed because people assume it does not apply**, and the shape is exactly the
same.

**Deserialisation.** Untrusted data deserialised into objects, which in several languages is
arbitrary code execution and is the most severe thing on this list.

## Verifying it

**Do not report a suspicion.** Demonstrate it, on a system you are permitted to test.

**A quote that changes the result** is enough to prove the class without extracting anything.
**An assessment does not need to exfiltrate data to prove a point** — proving that the input
reaches the parser is the finding, and going further is often out of scope and occasionally
illegal.

**Capture the request and the response**, and nothing more.

## Writing it up

**The file and the line.** The exact input. What it did. The one-line fix — parameterise this
query, pass arguments as a list, whitelist this identifier.

**And say how you found it**, so the team can run the same search themselves. **Teaching the
search is worth more than the finding**, because they will write more code after you have
gone.`,
    mcqs: [
      mcq('In an ORM-using codebase, injection is usually in:',
        [['The raw query escape hatch', true],
          ['A dynamically built filter', false],
          ['The migration scripts', false],
          ['A stored procedure call', false]],
        'Learn the name for the framework in front of you and add it to the search.'),
      mcq('Second-order injection is missed by tools because:',
        [['The dangerous line is nowhere near the input', true],
          ['It requires two requests to exploit', false],
          ['The stored value is escaped on the way in', false],
          ['It only occurs in legacy code', false]],
        'A codebase can pass every scanner and still be injectable.'),
      mcq('The question most injection candidates fail on is:',
        [['Can an attacker control this value', true],
          ['Where does the value come from', false],
          ['Is it validated on the way', false],
          ['Does it reach a parser', false]],
        'Not "would they" — can they.'),
      mcq('An assessment proving injection should:',
        [['Show the input reaching the parser, and stop', true],
          ['Extract a record to prove impact', false],
          ['Demonstrate full database access', false],
          ['Modify data to show write capability', false]],
        'Going further is often out of scope and occasionally illegal.'),
    ],
    checkpoint: [
      mcq('NoSQL injection is frequently missed because:',
        [['People assume it does not apply', true],
          ['The syntax is unfamiliar', false],
          ['Document stores validate input', false],
          ['It requires a different tool', false]],
        'The shape is exactly the same.'),
      mcq('The most severe item on the injection list is:',
        [['Deserialisation of untrusted data', true],
          ['SQL injection', false],
          ['Command injection', false],
          ['Template injection into a render', false]],
        'In several languages it is arbitrary code execution.'),
      mcq('Teaching the search is worth more than the finding because:',
        [['They will write more code after you have gone', true],
          ['It demonstrates your method', false],
          ['It saves them hiring an assessor again', false],
          ['It makes the report reproducible', false]],
        'Say how you found it, not just what you found.'),
    ],
  },

  {
    unitCode: 'T3_SEC_APPSEC_XSS_AND_CSRF_IN_PRACTICE',
    notes: `The core topic explained both. **This one finds them in a running application**, and
the methods are different from reading code.

## Finding XSS

**The payload sweep.** Put a harmless marker in every field, then look at every page it appears
on.

Use something that will show whether it is escaped and where it landed:

    <b>xss1</b>

**If it renders bold, HTML is not escaped.** A marker with a number per field tells you which
field reached which page, which matters when one field appears in six places.

**Then the contexts the default escaping misses:**

- Inside a \`<script>\` block.
- In an event handler attribute.
- In an \`href\` — try a \`javascript:\` scheme.
- In a JSON blob embedded in the page.

**And the client-side sinks.** Search the JavaScript for \`innerHTML\`, \`document.write\`, and the
framework's unsafe helper. **DOM-based XSS leaves nothing in the server logs**, so it is found
in the code and in the browser, not in the traffic.

**Do not forget:** URL parameters reflected into the page, error messages, file names, data
from an API rendered without escaping, and anything from a third party.

## Finding CSRF

**Check whether the token exists.** Submit a state-changing form without it and see what
happens.

**Check the cookie attributes.** \`SameSite\`, \`Secure\`, \`HttpOnly\`. A missing \`SameSite\` on a
session cookie is a finding in itself.

**Look for exemptions.** The framework's decorator, and every one needs a reason.

**Look for state-changing \`GET\` requests.** A search of the routes for handlers that write.
**An \`<img src>\` is enough to trigger one**, which is what makes it worth finding.

**And check the API.** A cookie-authenticated API without CSRF protection is vulnerable; a
header-authenticated one is not. **Know which you are looking at** before reporting either way.

## Verifying safely

**For XSS:** a payload that proves execution to you and does nothing else. **Not an alert on a
page other users see** — on a shared or production system that is a change visible to real
people, and a marker in your own session proves the same thing.

**For CSRF:** build the page, host it locally, and demonstrate the request going through from
your own second browser profile. **Capture the request, not the consequences.**

## What to report

**For each:** the exact input, the exact URL, the context it landed in, and a screenshot or a
captured response.

**The fix, specifically.** Not "sanitise input" — **escape at output for this context**, or
"use the template's default rather than the unsafe helper here", or "add \`SameSite=Lax\` to this
cookie".

**And the class, so they can find the others.** One XSS usually means several, and the
valuable part of the report is the search you used.

## The layered defences worth recommending

**A Content Security Policy.** The highest-value single header, and it mitigates XSS you have
not found.

**\`HttpOnly\` on session cookies.** It does not stop XSS and it stops the credential being
stolen.

**\`SameSite\` on cookies.** Mitigates most CSRF by default.

**Recommend these even where you found nothing**, because they are cheap and they cover the
instances your sweep missed.`,
    mcqs: [
      mcq('A numbered marker per field is useful because:',
        [['It tells you which field reached which page', true],
          ['It is harder for filters to strip', false],
          ['It proves execution rather than reflection', false],
          ['It avoids triggering alerts', false]],
        'One field can appear in six places.'),
      mcq('DOM-based XSS is found:',
        [['In the code and the browser, not in the traffic', true],
          ['In the server access logs', false],
          ['By fuzzing each of the API endpoints in turn', false],
          ['In the template files', false]],
        'It leaves nothing in the server logs.'),
      mcq('Proving XSS on a shared or production system should use:',
        [['A marker in your own session, not an alert others see', true],
          ['An alert box, which is the conventional standard proof', false],
          ['A payload that logs to your own server', false],
          ['A stored payload to show persistence', false]],
        'An alert on a page other users see is a change visible to real people.'),
      mcq('Before reporting CSRF on an API you must know:',
        [['Whether it authenticates by cookie or by header', true],
          ['Whether it uses REST or GraphQL', false],
          ['Whether the token is rotated', false],
          ['Whether the API is public or purely internal', false]],
        'A header-authenticated API is not vulnerable to it.'),
    ],
    checkpoint: [
      mcq('The fix in an XSS report should say:',
        [['Escape at output for this specific context', true],
          ['Sanitise the input before storing it', false],
          ['Validate the field more strictly', false],
          ['Add a web application firewall rule', false]],
        'Or name the unsafe helper being used and what to use instead.'),
      mcq('Recommending a Content Security Policy even with no XSS found:',
        [['Covers the instances your sweep missed', true],
          ['Satisfies a compliance requirement', false],
          ['Improves the report’s completeness', false],
          ['Is standard boilerplate advice', false]],
        'Cheap, and it mitigates what you did not find.'),
      mcq('A state-changing `GET` is worth finding because:',
        [['An image tag is enough to trigger it', true],
          ['It cannot carry a CSRF token', false],
          ['It is cached by intermediaries', false],
          ['It appears in the browser history', false]],
        'Search the routes for GET handlers that write.'),
    ],
  },

  {
    unitCode: 'T3_SEC_APPSEC_BROKEN_ACCESS',
    notes: `**The most common serious vulnerability, and the one tools cannot find.** A scanner
sees the code that is there; broken access control is the code that is absent.

**That single fact is why this is a human job**, and why a security engineer who is methodical
about it is worth a great deal.

## The systematic test

**Two accounts, and a list of every endpoint.**

1. As A, create data. Record every identifier.
2. As B, request every one of A's resources.
3. As nobody, request them again.
4. **Repeat for every method**, not just \`GET\`. Write endpoints are checked less often and the
   consequences are worse.
5. Repeat with identifiers in **request bodies**, not just paths.

**Anything B can see or change is a finding.**

## Where it hides beyond the obvious

**Nested resources.** \`/orders/812/items/9\` — the order is checked and the item is not, so
another order's item is reachable through your order's URL.

**Batch endpoints.** A request taking a list of ids, where each is fetched and only the first
is checked.

**Search and filter.** A filter parameter that reaches the query unscoped, returning other
tenants' rows.

**Exports and reports.** Frequently written separately from the API, frequently with a
different — or no — authorization path.

**Anything internal.** An admin endpoint, a debug route, a health check that returns
configuration.

**Mass assignment.** A profile update that accepts \`role\` or \`is_admin\`. **This is privilege
escalation through a field name**, and it is common in frameworks that map bodies onto models.

**And horizontal against vertical.** Horizontal is reaching another user's data at the same
level; vertical is reaching a higher level. **Test both** — people test one and report a clean
result.

## Identifiers

**Sequential ids make enumeration trivial**, and enumeration turns one accessible record into
all of them.

**Unguessable ids are defence in depth, not a control.** The core topic said so, and it is
worth repeating in a report: an application secured only by unguessable ids is one leaked URL
from a breach.

**Report both** where you find them: the missing check, and the enumerable identifier that
makes it worse.

## Verifying and reporting

**Verify by doing it.** Request B's access to A's record and capture the response. **This is
the easiest class to verify unambiguously**, which is part of why it is worth prioritising.

**Take nothing more than the proof.** One record showing the control is absent is the finding.

**Report:** the endpoint, the method, the identifier, which account, and what came back.

**The fix:** scope the query to the caller, or check ownership before returning — and put it in
the service, not the route, so a job is covered too.

**And recommend the test.** An automated two-account test per operation makes the whole class
impossible to reintroduce, and it is the most valuable recommendation you can leave behind.`,
    mcqs: [
      mcq('Tools cannot find broken access control because:',
        [['A scanner sees the code that is there, and the check is absent', true],
          ['It requires authenticated sessions to test at all', false],
          ['The rules differ per application', false],
          ['It only appears under concurrency', false]],
        'Which is why it is a human job.'),
      mcq('A nested resource such as `/orders/812/items/9` can leak because:',
        [['The order is checked and the item is not', true],
          ['The nesting confuses the router', false],
          ['Item identifiers are usually sequential', false],
          ['The parent check is cached', false]],
        'Another order’s item, reached through your order’s URL.'),
      mcq('Mass assignment is:',
        [['Privilege escalation through a field name', true],
          ['A performance problem in bulk endpoints', false],
          ['A validation failure on unknown fields', false],
          ['An injection through an object body', false]],
        'Common in frameworks that map request bodies onto models.'),
      mcq('People report a clean access-control result because they tested:',
        [['Horizontal but not vertical, or the reverse', true],
          ['Only the read endpoints', false],
          ['Only with a valid set of credentials', false],
          ['Only the documented API', false]],
        'Another user at the same level, against a higher level.'),
    ],
    checkpoint: [
      mcq('Broken access control is worth prioritising partly because:',
        [['It is the easiest class to verify unambiguously', true],
          ['It is the fastest to fix', false],
          ['It affects more endpoints than any other class', false],
          ['Scanners report it reliably', false]],
        'Request it as the wrong user and capture the response.'),
      mcq('Exports and reports are a common hiding place because:',
        [['They are written separately, often with a different authorization path', true],
          ['They return considerably more data per request than an API call', false],
          ['They are rarely used in practice', false],
          ['They bypass the API layer', false]],
        'Or with no authorization path at all.'),
      mcq('The most valuable recommendation to leave behind is:',
        [['An automated two-account test per operation', true],
          ['A code review checklist', false],
          ['Unguessable identifiers throughout', false],
          ['A scanner in the pipeline', false]],
        'It makes the whole class impossible to reintroduce.'),
    ],
  },

  {
    unitCode: 'T3_SEC_APPSEC_DEBUGGING',
    notes: `Five ways application security testing goes wrong.

## 1. The payload is filtered and you conclude it is safe

**Symptom:** \`<script>alert(1)</script>\` does nothing, so you move on.

**Cause:** a filter that strips that specific string, not escaping.

**What to try instead:** a different tag with an event handler; a different case; an encoded
form; a payload that breaks out of an attribute rather than an element; the same input in a
different context.

**A filter that blocks one payload is a blocklist**, and the core topic explained why
blocklists lose. **Report the filter as a weak control rather than concluding it is safe.**

## 2. It works in one place and you report only that

**Symptom:** one finding where there are eight.

**Cause:** you stopped at the first.

**Fix:** once you have found the class, **search for every instance.** The same unsafe helper,
the same unparameterised pattern, the same missing check on sibling endpoints. **The report
should cover the class, not the example.**

## 3. Testing the wrong environment

**Symptom:** findings the team cannot reproduce, or that they say are already fixed.

**Cause:** staging differs from production — a different version, different configuration, a
control present in one and not the other.

**Fix:** record exactly what you tested, including the version and the environment. **And note
that a control present in production and absent in staging is itself a finding**, because
staging usually has real data.

## 4. You broke something

**Symptom:** the application is down, or data is changed, during your testing.

**Causes:** a destructive payload; a load test disguised as a scan; an automated tool with
write methods enabled.

**Prevention:** know what your tools do before running them; avoid destructive verbs unless
scoped and agreed; **test on a copy where possible**.

**And if you do break something, say so immediately.** Concealing it is worse than the breakage
and it ends the engagement.

## 5. The finding cannot be reproduced

**Symptom:** you saw it, and now you cannot show it.

**Causes:** a session that expired; state that has changed; a deploy in between; you did not
record the exact request.

**Fix:** **capture everything as you go.** The full request, the full response, the timestamp,
the account used. **A finding you cannot reproduce is not a finding you can report**, and the
capture costs nothing at the time and everything afterwards.

## The habits

**Record every request and response.** All of them, as you go.

**Note the environment and version** at the top of your notes.

**When you find one, search for the class.**

**Verify before reporting**, and capture the proof.

**And stay inside scope.** What you were permitted to test, and nothing else — written down
before you start, and referred to when you are tempted.`,
    mcqs: [
      mcq('A payload that is filtered means:',
        [['A blocklist is present, which is a weak control worth reporting', true],
          ['The application is genuinely safe from that whole class', false],
          ['Output escaping is working', false],
          ['A firewall is intercepting the request', false]],
        'Try a different tag, case, encoding or context.'),
      mcq('After finding one instance of a class, you should:',
        [['Search for every instance of the same pattern', true],
          ['Report it and move to the next class', false],
          ['Verify it more thoroughly', false],
          ['Estimate how many others exist', false]],
        'The report should cover the class, not the example.'),
      mcq('A control present in production and absent in staging is:',
        [['Itself a finding, because staging usually has real data', true],
          ['An acceptable difference between the environments', false],
          ['A reason to retest in production', false],
          ['Out of scope for the assessment', false]],
        'Record exactly what you tested, including version and environment.'),
      mcq('If you break something during testing:',
        [['Say so immediately; concealing it ends the engagement', true],
          ['Restore it quietly if you can', false],
          ['Note it in the final report', false],
          ['Continue testing and assess the impact first', false]],
        'Worse than the breakage itself.'),
    ],
    checkpoint: [
      mcq('A finding you cannot reproduce is:',
        [['Not a finding you can report', true],
          ['Reportable with a caveat', false],
          ['Worth mentioning informally', false],
          ['Evidence of an intermittent control', false]],
        'Capture the full request and response as you go.'),
      mcq('Before running an automated tool you should:',
        [['Know what it does, including which methods it will use', true],
          ['Run it against staging first', false],
          ['Reduce its request rate', false],
          ['Inform the team that it is about to start', false]],
        'A scan with write methods enabled can change data.'),
      mcq('Scope should be:',
        [['Written down before starting, and referred to when tempted', true],
          ['Agreed verbally with the team', false],
          ['Interpreted broadly to be thorough', false],
          ['Extended whenever something interesting is found', false]],
        'What you were permitted to test, and nothing else.'),
    ],
  },

  {
    unitCode: 'T3_SEC_APPSEC_PRACTICE',
    notes: `Two exercises on the method: covering a class rather than an instance, and testing
access control systematically.`,
    coding: [
      {
        title: 'Did you cover the class?',
        description: `Read one instance per line as \`<pattern> <location> <tested>\`, where
tested is \`yes\` or \`no\`.

Print, for each **pattern** in the order it first appears:

    <pattern> <tested count>/<total count>

Then a final line \`complete=<patterns where all instances were tested, space separated, or
none>\`.

A pattern with every instance tested is covered; one with any untested instance is not, however
many were tested.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# Finding one instance is not covering the class.
`,
        language: 'python',
        tests: [
          { input: 'raw_sql orders yes\nraw_sql reports no\n', expectedOutput: 'raw_sql 1/2\ncomplete=none' },
          { input: 'innerHTML a yes\ninnerHTML b yes\n', expectedOutput: 'innerHTML 2/2\ncomplete=innerHTML' },
          { input: 'x a yes\ny b no\n', expectedOutput: 'x 1/1\ny 0/1\ncomplete=x' },
          { input: '', expectedOutput: 'complete=none' },
          { input: 'b p yes\na q yes\nb r yes\n', expectedOutput: 'b 2/2\na 1/1\ncomplete=b a', isHidden: true },
        ],
      },
      {
        title: 'The access control matrix',
        description: `Read one test per line as
\`<endpoint> <method> <actor> <owner> <response>\`, where actor and owner are account names and
response is \`allowed\` or \`denied\`.

A test is a **finding** when the actor is not the owner, is not \`staff\`, and the response is
\`allowed\`.

Print each finding as \`<endpoint> <method> <actor>\`, in input order. Then two lines:

    findings=<count>
    writes=<count of findings whose method is not GET>

Write findings are counted separately because they are checked less often and the consequences
are worse.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# Not the owner, not staff, and allowed anyway.
`,
        language: 'python',
        tests: [
          { input: '/orders/1 GET ravi asha allowed\n', expectedOutput: '/orders/1 GET ravi\nfindings=1\nwrites=0' },
          { input: '/orders/1 DELETE ravi asha allowed\n', expectedOutput: '/orders/1 DELETE ravi\nfindings=1\nwrites=1' },
          { input: '/orders/1 GET asha asha allowed\n', expectedOutput: 'findings=0\nwrites=0' },
          { input: '/orders/1 GET staff asha allowed\n', expectedOutput: 'findings=0\nwrites=0' },
          { input: '/orders/1 GET ravi asha denied\n', expectedOutput: 'findings=0\nwrites=0' },
          { input: '/a GET r a allowed\n/b PUT r a allowed\n', expectedOutput: '/a GET r\n/b PUT r\nfindings=2\nwrites=1', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Application Security Practice',
      description: 'Cover a class rather than an instance, build an access matrix, then assess a real application.',
      instructions: `Complete both exercises, then:

1. For the first: say why partially covering a class is close to not covering it, from the
   point of view of the team receiving the report.
2. For the second: \`staff\` is treated as always permitted. Say why that is a dangerous
   simplification and what you would test instead.
3. For the second: write findings are counted separately. Give a concrete pair where the read
   and the write findings have very different consequences.

**Then, on a real application** you own, can run locally, or have written permission to test.

4. Run the payload sweep. Every field, every page it renders on. Record what you tried.
5. Check every context the default escaping misses. Report what you found.
6. Search the client code for unsafe sinks. Report the count and whether each is justified.
7. Check CSRF: token present, cookie attributes, exemptions, state-changing GETs.
8. **Build the access matrix.** Two accounts, every endpoint, every method, identifiers in
   paths and bodies. Report it as a table.
9. Test vertical escalation as well as horizontal.
10. Test mass assignment on at least one update endpoint.
11. For everything you found: verify it, capture the request and response, and write the
    one-line fix.
12. For every class you found: **search for the other instances** and report the coverage.`,
      rubric: [
        { criterion: 'Class coverage computed', description: 'All cases, with partial coverage counted as incomplete.', maxPoints: 15 },
        { criterion: 'Access matrix computed', description: 'All cases, with writes counted separately.', maxPoints: 15 },
        { criterion: 'A real payload sweep', description: 'Every field and page, with the contexts the default misses.', maxPoints: 20 },
        { criterion: 'A real access matrix', description: 'Two accounts, every endpoint and method, paths and bodies.', maxPoints: 25 },
        { criterion: 'Vertical and mass assignment', description: 'Both tested, with results either way.', maxPoints: 10 },
        { criterion: 'Verified with fixes and coverage', description: 'Evidence captured, one-line fixes, and the class searched.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]
`,
        tests: [
          { input: '/orders/1 GET ravi asha allowed\n', expectedOutput: '/orders/1 GET ravi\nfindings=1\nwrites=0' },
          { input: '/orders/1 DELETE ravi asha allowed\n', expectedOutput: '/orders/1 DELETE ravi\nfindings=1\nwrites=1' },
          { input: '/orders/1 GET asha asha allowed\n', expectedOutput: 'findings=0\nwrites=0' },
          { input: '/orders/1 GET ravi asha denied\n', expectedOutput: 'findings=0\nwrites=0' },
          { input: '/a GET r a allowed\n/b PUT r a allowed\n', expectedOutput: '/a GET r\n/b PUT r\nfindings=2\nwrites=1', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('Treating `staff` as always permitted is dangerous because:',
        [['Vertical escalation to staff is exactly what you should test', true],
          ['Staff accounts are considerably more likely to be compromised', false],
          ['Staff permissions vary between systems', false],
          ['It excludes staff from the matrix', false]],
        'The simplification hides the escalation path.'),
      mcq('Partially covering a class is close to not covering it because:',
        [['The untested instances are still exploitable', true],
          ['The team will not trust the report', false],
          ['Partial coverage cannot be measured', false],
          ['Scanners would find the rest anyway', false]],
        'The report should cover the class, not the example.'),
      mcq('Identifiers should be tested in request bodies because:',
        [['Paths get checked and bodies get trusted', true],
          ['Bodies are not logged', false],
          ['Body parameters bypass the router', false],
          ['They are harder to enumerate', false]],
        'The core topic said so, and the matrix must cover both.'),
    ],
  },

  {
    unitCode: 'T3_SEC_APPSEC_MINI_PROJECT',
    notes: `Assess a real application's security end to end, and produce a report somebody
acts on.

The brief's requirement is **coverage stated either way**. A report that lists eight findings
and does not say what was examined is a report nobody can rely on, and "we found nothing in
area X" is as useful as a finding when it is backed by a stated method.

**Use only a deliberately vulnerable application, one you own, or one you have written
permission to test.**

Budget around two hours.`,
    assignment: {
      title: 'Mini Project — An Application Assessment',
      description: 'Assess an application methodically across the main classes and produce a report with stated coverage.',
      instructions: `**Choose** a deliberately vulnerable application, your own, or one you have
written permission for.

**Part one — set up**

1. State the scope in writing: what you may test, what you may not, what environment.
2. Record the version and environment.
3. Set up request capture so everything is recorded as you go.

**Part two — the cheap wins first**

4. Dependency audit. Report every finding with its severity and whether it is in shipped code.
5. Configuration from outside: debug mode, default credentials, exposed paths, directory
   listing, secrets in the client bundle.

**Part three — access control**

6. **The full matrix.** Two accounts, every endpoint, every method, identifiers in paths and
   bodies.
7. Vertical escalation. Mass assignment. Nested resources. Batch endpoints. Exports.
8. Report the matrix as a table, including the cells that were correctly denied.

**Part four — injection and output**

9. The injection searches, all of them, including the ORM escape hatch and dynamic identifiers.
10. The payload sweep: every field, every rendering page, every context.
11. Client-side sinks.
12. CSRF: tokens, cookie attributes, exemptions, state-changing GETs.

**Part five — authentication**

13. Rate limiting on login. Password policy. Session lifetime. What a password change revokes.
14. **The reset flow**, which is usually the weakest.

**Part six — the report**

15. Every finding: component, field, missing control, consequence, evidence, one-line fix.
16. **For each class you found, the coverage**: how many instances, how many tested.
17. Ranked into three groups, at most three in the first, plus quick wins.
18. **What you did not check, and what it would take.**
19. Three recommendations that remove classes rather than instances — a CSP, an automated
    two-account test, a scanner in the pipeline.
20. **Fix one finding yourself**, with a test.

**Submit** the scope statement, the access matrix, the findings with evidence, the coverage
statement, the ranked groups, and the fix.`,
      rubric: [
        { criterion: 'Scope and capture', description: 'Written scope, environment recorded, every request captured.', maxPoints: 10 },
        { criterion: 'Cheap wins first', description: 'Dependency audit and external configuration check, both reported.', maxPoints: 15 },
        { criterion: 'A full access matrix', description: 'Both accounts, every method, paths and bodies, denied cells included.', maxPoints: 25 },
        { criterion: 'Injection and output covered', description: 'All searches, the sweep, the missed contexts, and client sinks.', maxPoints: 20 },
        { criterion: 'Coverage stated either way', description: 'Instances per class, how many tested, and what was not checked.', maxPoints: 15 },
        { criterion: 'Class-removing recommendations and a fix', description: 'Three structural recommendations and one finding actually fixed.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('Including the correctly denied cells in the matrix:',
        [['Shows what was examined, which is what makes the result reliable', true],
          ['Pads the report unnecessarily', false],
          ['Demonstrates that the test accounts were set up correctly', false],
          ['Is only needed when findings are few', false]],
        '"We found nothing in area X" is useful when the method is stated.'),
      mcq('Recommendations that remove classes rather than instances include:',
        [['A CSP, an automated two-account test, a pipeline scanner', true],
          ['Fixing each of the findings individually as reported', false],
          ['A security training session', false],
          ['A quarterly penetration test', false]],
        'Structural, and they cover what the assessment missed.'),
      mcq('The reset flow is examined specifically because:',
        [['It is usually the weakest part of authentication', true],
          ['It is the most frequently attacked part of the flow', false],
          ['It is rarely rate limited', false],
          ['It bypasses the session lifetime', false]],
        'Written once and never revisited.'),
    ],
  },
];
