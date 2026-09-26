/**
 * T3_THREAT_MODELING, T3_WEB_SECURITY, T3_SECURE_CODING and T3_DIRECTION_CHOICE — eighteen
 * units. Year 3. Finishes S10 and S11, and with them the universal core of the year.
 *
 * ── SECURITY AS A HABIT, NOT A LIST ───────────────────────────────────────────────────────
 *
 * Security taught as a list of attacks produces a student who can name SQL injection and
 * cannot tell whether their own code has it. So threat modelling leads: the question "what
 * would somebody want, and where would we let them have it" is a habit that transfers to
 * attacks that did not exist when they learned it.
 *
 * The web security topic then covers three specific attacks, and each one is taught with the
 * same shape: the mechanism, the one correct fix, and the wrong fixes that look correct.
 * "Escaping" and "sanitising" are the wrong fixes that survive review, and naming them is
 * most of the value.
 *
 * RANKING_RISK exists because a threat model that lists forty things and ranks none of them
 * produces no action. A student who can say "this one first, because it is easy for them and
 * expensive for us" has learned something an experienced engineer does.
 *
 * ── AND THE DIRECTION CHOICE ──────────────────────────────────────────────────────────────
 *
 * T3_DIRECTION_CHOICE is short and load-bearing. Year 3 refuses to plan without a direction,
 * so this topic is where the student either confirms the choice made at purchase or changes
 * it — and the unit's job is to make that decision on evidence rather than on which job title
 * sounds best. The second unit attributes to PORTFOLIO_EVIDENCE for exactly that reason.
 *
 * Attribution: the three security topics are single-skill and derived. T3_DIRECTION_CHOICE
 * defaults to TECH_CAREER_AWARENESS with AGAINST_YOUR_EVIDENCE on PORTFOLIO_EVIDENCE.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const SECURITY_BUNDLES: PilotBundle[] = [
  /* ══ T3_THREAT_MODELING ═════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_THREAT_MODELING_WHAT_AN_ATTACKER_WANTS',
    notes: `Security taught as a list of attacks produces somebody who can name SQL injection
and cannot tell whether their own code has it. **Start with what somebody would want**, and
the list of attacks becomes a consequence rather than a syllabus.

## Who, and what they want

**The opportunist.** Automated scanners, all day, every day. A server exposed to the internet
is probed within minutes. They want anything easy: a default password, an unpatched version, an
open admin panel. **They are not targeting you**, which is exactly why they find the thing you
forgot.

**The motivated individual.** A competitor, a disgruntled user, somebody who wants one specific
thing. They will spend hours, read your JavaScript, and try the id in the URL.

**The insider.** Somebody with legitimate access using it beyond their remit. The hardest to
defend against and the one most often ignored entirely, because the model assumes attackers
are outside.

**The accident.** Not an attacker at all. A script with a bug, a misconfigured backup, a
developer running a query against production. **More damage is done by accidents than by
attacks**, and a threat model that ignores them misses most of its real risk.

## What they want, concretely

- **Data.** Personal data, payment details, anything saleable.
- **Access.** A foothold to reach something else.
- **Compute.** Your servers mining cryptocurrency or sending spam.
- **Disruption.** Taking you offline.
- **Money.** Directly — fraud, free goods, a refund loop.
- **Reputation.** Defacing something visible.

**Ask what your system has that is worth taking.** A student project has compute and a domain
reputation, which is why student projects get compromised — the answer is never "nothing".

## The four questions

This is the whole method, and it takes half an hour:

1. **What are we building?** A diagram. Components, data stores, and every place data crosses
   a boundary.
2. **What can go wrong?** Per component: what would somebody want here, and what would it cost
   us?
3. **What are we going to do about it?** Per risk: mitigate, accept, transfer or eliminate.
4. **Did we do a good job?** Revisit when the system changes.

**Question 3 is where most models fail**, because every risk gets "mitigate" and nothing gets
done. **Accepting a risk explicitly is a legitimate answer** — "we accept the risk of a
determined insider reading this table, because the alternative costs more than the data is
worth" is a real engineering decision, and writing it down is better than pretending it is
handled.

## Where to look

**Trust boundaries**, which is where almost everything happens. Anywhere data crosses from
somewhere less trusted to somewhere more: the browser to your server, your server to the
database, one service to another, a webhook from a third party.

**Draw them on the diagram.** Every crossing is a place to ask "what if this data is hostile?"
and the answer is "assume it is".

## What this is not

**Not a security audit**, and not a substitute for one. **Not exhaustive** — a half-hour model
that finds the three most likely problems is worth far more than a week-long one nobody
finishes. **Not a one-off**, since the system changes.

And **not a reason to do nothing until it is done.** The four questions on a whiteboard, on a
Tuesday, with the two people who know the system, is the entire practice.`,
    mcqs: [
      mcq('Starting with what an attacker wants, rather than a list of attacks:',
        [['Transfers to attacks that did not exist when you learned it', true],
          ['Covers more attack types in less time', false],
          ['Is the order the OWASP list uses', false],
          ['Avoids teaching techniques that could be misused', false]],
        'A list produces somebody who can name injection and cannot spot it in their code.'),
      mcq('More damage is typically done by:',
        [['Accidents', true], ['Opportunists', false],
          ['Motivated individuals', false], ['Insiders', false]],
        'A buggy script, a misconfigured backup, a query run against production.'),
      mcq('The step where most threat models fail is:',
        [['Deciding what to do, because everything gets "mitigate"', true],
          ['Drawing the system accurately', false],
          ['Identifying what could go wrong', false],
          ['Revisiting the model later', false]],
        'Accepting a risk explicitly is a legitimate answer and is better than pretending.'),
      mcq('"Our project has nothing worth taking" is wrong because:',
        [['It has compute and a domain reputation', true],
          ['Every system holds some personal data', false],
          ['Attackers cannot tell what is valuable', false],
          ['The data may become valuable later', false]],
        'Which is why student projects get compromised.'),
    ],
    checkpoint: [
      mcq('A trust boundary is:',
        [['Anywhere data crosses from less trusted to more', true],
          ['The perimeter of your network', false],
          ['The line between authenticated and anonymous users', false],
          ['Any interface between two of your services', false]],
        'Every crossing is a place to assume the data is hostile.'),
      mcq('The insider threat is most often ignored because:',
        [['The model assumes attackers are outside', true],
          ['It is rare compared with external attacks', false],
          ['Defending against it is prohibitively costly', false],
          ['Legitimate access cannot be restricted further', false]],
        'And it is the hardest to defend against.'),
      mcq('A half-hour model finding three likely problems is:',
        [['Worth more than a week-long one nobody finishes', true],
          ['A reasonable first pass before a proper audit', false],
          ['Insufficient for a system handling personal data', false],
          ['Only useful for small projects', false]],
        'The four questions on a whiteboard is the entire practice.'),
    ],
  },

  {
    unitCode: 'T3_THREAT_MODELING_WHERE_IT_WOULD_LET_THEM',
    notes: `You know what somebody would want. Now: **where would your system let them have
it?**

## Walk the boundaries

Take the diagram and go to each crossing. At every one, ask three things:

1. **What comes across here?**
2. **What if it is hostile?**
3. **What does the receiving side assume that could be false?**

That third question finds the most, because assumptions are invisible until they are named.

## STRIDE, as a prompt rather than a framework

Six categories, and they are useful as a checklist to stop you thinking only about the attack
you read about most recently:

- **Spoofing** — pretending to be somebody else. Weak authentication, a guessable session, a
  forged webhook nobody verifies.
- **Tampering** — changing something in transit or at rest. A modified request body, a price in
  a hidden form field, a client-supplied total.
- **Repudiation** — doing something and denying it. No audit log, or one the actor can edit.
- **Information disclosure** — seeing what you should not. The id in the URL, a verbose error,
  a public bucket, a stack trace.
- **Denial of service** — making it unavailable. No rate limit, an unbounded query, a 50MB
  upload accepted before checking.
- **Elevation of privilege** — doing more than you may. A missing authorization check, mass
  assignment of a role field.

**Go round the six for each boundary.** It takes ten minutes and it reliably finds something
you had not considered, which is the whole reason to use a checklist.

## The assumptions that are usually false

These are worth knowing by name, because each has produced real breaches:

- **"The client validated it."** The client is not yours at the moment of the request.
- **"Only our app calls this."** Anyone can call it.
- **"That id is unguessable."** Sequential, or it leaks in a URL, a referrer or a screenshot.
- **"It is behind the VPN."** Until a misconfiguration exposes it, and internal services are
  the least hardened things you own.
- **"Nobody knows that endpoint exists."** Scanners find it. A JavaScript bundle lists it.
- **"The file upload is an image."** Because the extension says so.
- **"This webhook is from the provider."** Unless it is signed and you verify it, it is from
  whoever sent it.

## The data question

For each store, ask: **what is the worst thing in here, and who can read it?**

Then ask the one people skip: **what happens to it when it leaves?** Backups, logs, analytics,
a CSV somebody exported, a copy of production in staging. **A database locked down perfectly is
not protected if last week's dump is in somebody's downloads folder**, and that is a far more
common route than an attack on the database itself.

## Be concrete

A finding is only useful if somebody could act on it.

**Not:** "the API could be attacked."

**But:** "the order endpoint takes a \`customer_id\` from the request body and does not check
it against the session, so any authenticated user can create an order billed to anybody else."

**Second one names the endpoint, the field, the missing check and the consequence.** That is a
ticket. The first is a feeling.`,
    mcqs: [
      mcq('Which boundary question finds the most?',
        [['What does the receiving side assume that could be false', true],
          ['What data comes across this boundary', false],
          ['What happens if the data is hostile', false],
          ['Who is on each side of the boundary', false]],
        'Assumptions are invisible until they are named.'),
      mcq('STRIDE is most useful as:',
        [['A checklist that stops you thinking only about recent attacks', true],
          ['A formal classification for reporting findings', false],
          ['A ranking of threats by severity', false],
          ['A complete taxonomy of possible attacks', false]],
        'Ten minutes per boundary, and it reliably finds something unconsidered.'),
      mcq('"It is behind the VPN" is a dangerous assumption because:',
        [['Internal services are the least hardened things you own', true],
          ['VPN credentials are frequently shared', false],
          ['VPNs do not encrypt internal traffic', false],
          ['Most attacks originate from inside the network', false]],
        'And one misconfiguration exposes them.'),
      mcq('A perfectly locked-down database is still at risk from:',
        [['Backups, logs, exports and staging copies', true],
          ['Privilege escalation within the application', false],
          ['Injection through an unvalidated endpoint', false],
          ['A denial of service against the host', false]],
        'Last week’s dump in somebody’s downloads folder is the commoner route.'),
    ],
    checkpoint: [
      mcq('A useful threat-model finding:',
        [['Names the endpoint, the field, the missing check and the consequence', true],
          ['Identifies which STRIDE category it belongs to, precisely', false],
          ['Estimates the likelihood of exploitation', false],
          ['References the relevant OWASP entry', false]],
        'That is a ticket. "The API could be attacked" is a feeling.'),
      mcq('An unsigned webhook should be assumed to be from:',
        [['Whoever sent it', true],
          ['The provider, if the payload matches', false],
          ['The provider, if it arrives at the expected URL', false],
          ['A legitimate source, since the URL is secret', false]],
        'Unless it is signed and you verify the signature.'),
      mcq('"The file upload is an image" is false because:',
        [['The extension is supplied by the caller', true],
          ['Image formats can contain executable data', false],
          ['The content type header can be omitted', false],
          ['Images can be arbitrarily large', false]],
        'Everything about the request is controlled by whoever sent it.'),
    ],
  },

  {
    unitCode: 'T3_THREAT_MODELING_RANKING_RISK',
    notes: `A threat model listing forty things and ranking none produces no action. Everything
looks urgent, so nothing is, and the document is filed.

**Rank, and fix the top three.**

## Two axes

**Likelihood.** How easy is it, and how motivated is somebody?

- **High** — automated tools find it. No skill required. Publicly known.
- **Medium** — needs some knowledge of your system, or a specific circumstance.
- **Low** — needs insider access, a chain of other failures, or serious resources.

**Impact.** What happens if it succeeds?

- **High** — personal data exposed, money lost, service down for hours, regulatory
  consequences.
- **Medium** — one user's data, a recoverable outage, embarrassment.
- **Low** — an information leak of no real value.

**High likelihood and high impact first.** Then high likelihood before high impact —
**something easy and moderately damaging beats something catastrophic and nearly impossible**,
because the first one will happen.

## The question that beats the matrix

> **How cheap is this for them, and how expensive is it for us?**

An attack costing five minutes and doing £50,000 of damage is the one to fix. One costing six
months and doing £50,000 of damage is a different priority, and treating them the same is how
the top of the list ends up wrong.

## The four responses

**Mitigate.** Reduce likelihood or impact. The usual answer.

**Accept.** Decide the cost of fixing exceeds the risk. **Legitimate, and must be written
down** — with who decided and when. An accepted risk is a decision; an unexamined one is
negligence, and the difference is entirely in the record.

**Transfer.** Insurance, or a third party who does it better. Using a payment provider
transfers most card-data risk, and that is why nobody sensible stores card numbers.

**Eliminate.** Remove the feature or the data. **The most underrated answer.** Data you do not
hold cannot leak. A feature you removed has no vulnerabilities. If you are storing something
because it might be useful one day, deleting it is a security improvement with no ongoing cost.

## Quick wins first

Some things are so cheap that ranking them is a waste of the ranking:

- Turn off the debug mode in production.
- Change the default credentials.
- Add the missing authorization check.
- Update the dependency with the known vulnerability.
- Stop logging the token.

**Do these before the meeting about the ranking.** An hour of quick wins usually beats a week
of the properly ranked work, and it is available immediately.

## Writing it down

For each risk: **what it is, how likely, how bad, what we are doing, and who owns it.**

The owner is the field that makes it real. A risk with no name against it is a risk nobody is
fixing, however carefully it was ranked.

**And put a date on the review.** A threat model from two years ago describes a system that no
longer exists, and reading it produces confidence about protections that were removed in a
refactor nobody connected to security.`,
    mcqs: [
      mcq('Between something easy and moderately damaging and something catastrophic and nearly impossible, fix:',
        [['The easy one, because it will happen', true],
          ['The catastrophic one, because the impact is higher', false],
          ['Whichever is cheaper to fix', false],
          ['Both at the same priority', false]],
        'High likelihood before high impact, once both matter.'),
      mcq('The question that beats the likelihood-impact matrix is:',
        [['How cheap is this for them and how expensive for us', true],
          ['How many users would be affected', false],
          ['How long would it take us to detect', false],
          ['How quickly could we recover', false]],
        'Five minutes for them and £50,000 for you is the one to fix.'),
      mcq('The most underrated response to a risk is:',
        [['Eliminate — remove the data or the feature', true],
          ['Transfer it to a third party', false],
          ['Accept it explicitly', false],
          ['Mitigate with a control', false]],
        'Data you do not hold cannot leak, and it has no ongoing cost.'),
      mcq('An accepted risk differs from an unexamined one by:',
        [['The record of who decided and when', true],
          ['Whether a mitigation was considered', false],
          ['Whether it appears in the threat model', false],
          ['How severe the consequence would be', false]],
        'One is a decision; the other is negligence.'),
    ],
    checkpoint: [
      mcq('Quick wins such as turning off debug mode should be:',
        [['Done before the meeting about ranking', true],
          ['Ranked alongside everything else', false],
          ['Scheduled after the top three risks', false],
          ['Handled by a separate hardening effort', false]],
        'An hour of them usually beats a week of the properly ranked work.'),
      mcq('The field that makes a risk entry real is:',
        [['The owner', true], ['The likelihood', false],
          ['The mitigation', false], ['The impact', false]],
        'A risk with no name against it is one nobody is fixing.'),
      mcq('A two-year-old threat model is dangerous because:',
        [['It describes protections that may have been removed since', true],
          ['The wider attack landscape has changed entirely since', false],
          ['The people who wrote it have moved on', false],
          ['It will list risks that are now accepted', false]],
        'It produces confidence about a system that no longer exists.'),
    ],
  },

  {
    unitCode: 'T3_THREAT_MODELING_DEBUGGING',
    notes: `Five ways a threat model goes wrong. Each produces a document that looks like
security work and is not.

## 1. The model of a system that does not exist

**Symptom:** the diagram has four services and the code has eleven. **Cause:** it was drawn
from the architecture document rather than from the code. **Fix:** draw it from the actual
import graph and the actual deployment, which is the tool from the graphs topic applied here.
**Tell:** nobody in the room can say where a particular request goes.

## 2. Everything is high risk

**Symptom:** forty findings, all "high", no order. **Cause:** ranking felt like downplaying
something, so nothing was downplayed. **Consequence:** nothing gets fixed, because there is no
first thing. **Fix:** force a ranking — you may have three "high" and no more.

## 3. Only outsiders considered

**Symptom:** perimeter controls everywhere and nothing about what a logged-in user can reach,
what an employee can read, or what a compromised dependency can do. **Cause:** the model
assumed the attacker is outside. **Fix:** walk one internal boundary — your service to your
database, or one service to another — with the same questions.

## 4. No accidents in the model

**Symptom:** the model covers attacks and the incident that actually happens is a script with a
bug, or a backup in a public bucket. **Fix:** ask "what if somebody does this by mistake?" at
every boundary. **The controls are often the same ones** — least privilege protects against a
careless engineer exactly as it protects against a malicious one, which is a good argument for
them that has nothing to do with attackers.

## 5. Written once, never revisited

**Symptom:** a document from two years ago describing three services that were merged last
spring. **Worse than nothing**, because it produces confidence. **Fix:** a review date, and a
trigger — a new external integration, a new data store, a new class of user.

## The test for whether it was worth doing

**Did anything change?**

If no ticket was created, no configuration altered and no code fixed, the model was an exercise.
**A model that produces three tickets is worth more than one that produces a perfect document.**

## The failure that is not the model's

**Findings with no owner.** The model was fine; the process around it was not. A finding that
is not a ticket, with a name and a date, is a finding that will be rediscovered in next year's
model — and being rediscovered is how a team learns that the exercise changes nothing.`,
    mcqs: [
      mcq('A diagram with four services when the code has eleven means:',
        [['It was drawn from the architecture document, not the code', true],
          ['Some services are out of scope', false],
          ['The diagram is a simplification for clarity', false],
          ['The deployment differs from the design', false]],
        'Draw it from the actual import graph and the actual deployment.'),
      mcq('Forty findings all marked high risk results in:',
        [['Nothing being fixed, because there is no first thing', true],
          ['A longer remediation backlog than necessary', false],
          ['Resources being spread evenly across them', false],
          ['The most severe items being addressed first', false]],
        'Force a ranking: you may have three high and no more.'),
      mcq('Least privilege is a good control partly because:',
        [['It protects against a careless engineer as much as a malicious one', true],
          ['It is required by most compliance regimes', false],
          ['It reduces the number of credentials in use', false],
          ['It makes auditing access simpler', false]],
        'An argument for it that has nothing to do with attackers.'),
      mcq('The test of whether a threat model was worth doing is:',
        [['Whether anything changed as a result', true],
          ['Whether it covered every component', false],
          ['Whether it used a recognised framework', false],
          ['Whether the findings were ranked', false]],
        'Three tickets beats a perfect document.'),
    ],
    checkpoint: [
      mcq('An out-of-date threat model is worse than none because:',
        [['It produces confidence about a system that changed', true],
          ['It costs time to read and discard', false],
          ['It lists risks that have since been accepted', false],
          ['It misleads new joiners about the architecture', false]],
        'Protections removed in a refactor nobody connected to security.'),
      mcq('A finding with no owner will:',
        [['Be rediscovered in next year’s model', true],
          ['Be picked up by whoever has capacity', false],
          ['Remain visible in the document', false],
          ['Be handled during the next audit', false]],
        'And being rediscovered teaches the team the exercise changes nothing.'),
      mcq('The fix for a model that considers only outsiders is:',
        [['Walk one internal boundary with the same questions', true],
          ['Add a section on insider threats', false],
          ['Review the access control configuration in detail', false],
          ['Include the third-party dependencies', false]],
        'Your service to your database is a boundary too.'),
    ],
  },

  {
    unitCode: 'T3_THREAT_MODELING_PRACTICE',
    notes: `Two exercises on the judgement rather than the vocabulary: ranking by the cost
asymmetry, and turning a vague worry into something somebody could fix.`,
    coding: [
      {
        title: 'Rank by cost asymmetry',
        description: `Read one risk per line as \`<name> <attacker_hours> <damage>\`, where
attacker_hours is how long the attack takes and damage is in pounds.

Print the names in priority order, highest first, using **damage divided by attacker_hours** as
the score. Break ties by name, ascending. An attacker_hours of 0 means an automated attack:
treat it as 0.1 rather than dividing by zero.

Then a final line \`top=<name>\` for the first, or \`top=none\` if there were no risks.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# Cheap for them and expensive for you is the one to fix first.
`,
        language: 'python',
        tests: [
          { input: 'idor 1 50000\nphysical 200 50000\n', expectedOutput: 'idor\nphysical\ntop=idor' },
          { input: 'scanner 0 1000\nhard 10 90000\n', expectedOutput: 'scanner\nhard\ntop=scanner' },
          { input: '', expectedOutput: 'top=none' },
          { input: 'b 2 100\na 2 100\n', expectedOutput: 'a\nb\ntop=a', isHidden: true },
          { input: 'only 5 0\n', expectedOutput: 'only\ntop=only', isHidden: true },
        ],
      },
      {
        title: 'Is this finding actionable?',
        description: `A finding is actionable when it names all four of: a **component**, a
**field or parameter**, a **missing control**, and a **consequence**.

Read one finding per line as four space-separated tokens, each either a value or \`-\` for
absent:

    <component> <field> <control> <consequence>

Print \`actionable\` if all four are present, otherwise \`missing:\` followed by the names of
the absent ones in the order component, field, control, consequence, space separated.

Example: \`orders - authorization data_exposure\` → \`missing: field\``,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# A finding is a ticket only when somebody could act on it without asking you.
`,
        language: 'python',
        tests: [
          { input: 'orders customer_id authorization billing_others\n', expectedOutput: 'actionable' },
          { input: 'orders - authorization data_exposure\n', expectedOutput: 'missing: field' },
          { input: '- - - -\n', expectedOutput: 'missing: component field control consequence' },
          { input: 'api token - -\n', expectedOutput: 'missing: control consequence' },
          { input: '', expectedOutput: '' },
          { input: '- field control consequence\n', expectedOutput: 'missing: component', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Threat Modelling Practice',
      description: 'Rank by cost asymmetry, judge findings as actionable, then model a real system in thirty minutes.',
      instructions: `Complete both exercises, then:

1. For the first: say why damage alone is the wrong ranking, and give a pair of risks where
   damage-only and asymmetry give opposite orders.
2. For the first: the score ignores likelihood of *motivation*. Give a case where a cheap,
   damaging attack is still not the top priority, and say what the score is missing.
3. For the second: the four fields are component, field, control and consequence. Say which one
   is most often missing in practice, and why.

**Then, model a real system in thirty minutes.** Use a project of yours.

4. Draw it. Components, data stores, and **every trust boundary**. Draw it from the code, not
   from memory.
5. For each boundary, go round STRIDE. Write down what you find — aim for at least eight
   findings, and do not filter as you go.
6. Rank them. Use the two axes and the asymmetry question. **You may mark at most three as
   high.**
7. For each of the top three: mitigate, accept, transfer or eliminate. **At least one must be
   "accept" or "eliminate"** — if everything is mitigate, you have not made a decision.
8. Write each of the top three as an actionable finding with all four fields.
9. **Fix one.** Show the change.
10. Say how long the whole thing took, and what you would do differently with another thirty
    minutes.`,
      rubric: [
        { criterion: 'Ranking by asymmetry', description: 'Correct including the automated case and the tie-break.', maxPoints: 15 },
        { criterion: 'Actionability judged', description: 'All combinations correct, in the specified order.', maxPoints: 15 },
        { criterion: 'A real model from the code', description: 'Components, stores and boundaries, drawn from what exists.', maxPoints: 20 },
        { criterion: 'Eight findings, unfiltered', description: 'STRIDE walked per boundary, without self-censoring.', maxPoints: 15 },
        { criterion: 'Ranked, with at most three high', description: 'A forced ranking rather than everything urgent.', maxPoints: 15 },
        { criterion: 'A decision that is not mitigate', description: 'At least one accepted or eliminated, and justified.', maxPoints: 10 },
        { criterion: 'One actually fixed', description: 'A real change shown.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]
`,
        tests: [
          { input: 'orders customer_id authorization billing_others\n', expectedOutput: 'actionable' },
          { input: 'orders - authorization data_exposure\n', expectedOutput: 'missing: field' },
          { input: '- - - -\n', expectedOutput: 'missing: component field control consequence' },
          { input: '', expectedOutput: '' },
          { input: '- field control consequence\n', expectedOutput: 'missing: component', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('Ranking by damage alone is wrong because:',
        [['It ignores how cheap the attack is for the attacker', true],
          ['Damage is hard to estimate accurately', false],
          ['It overweights rare but catastrophic events', false],
          ['It does not account for detection time', false]],
        'Five minutes for £50,000 and six months for £50,000 are not the same priority.'),
      mcq('Requiring at least one "accept" or "eliminate" in the top three:',
        [['Forces an actual decision rather than a default', true],
          ['Reduces the remediation workload', false],
          ['Ensures the ranking was honest', false],
          ['Reflects how real teams allocate effort', false]],
        'If everything is mitigate, nothing was decided.'),
      mcq('Capping the number of high findings at three:',
        [['Produces a first thing to fix', true],
          ['Keeps the document short enough to read', false],
          ['Reflects how many can be fixed in a sprint', false],
          ['Prevents low risks being overstated', false]],
        'Everything urgent means nothing is.'),
    ],
  },

  {
    unitCode: 'T3_THREAT_MODELING_MINI_PROJECT',
    notes: `Model a real system, find real problems, fix them, and measure whether the exercise
changed anything.

The brief's last question — **did anything change?** — is the one that distinguishes security
work from security documents. A model that produced a beautiful diagram and no tickets is an
exercise, and the marking says so.

Budget around two hours, and use something with real users if you can.`,
    assignment: {
      title: 'Mini Project — A Threat Model That Changed Something',
      description: 'Model a real system end to end, rank honestly, fix the top findings, and report what changed.',
      instructions: `**Choose** a real system: your own project, an open-source one you can run,
or with permission, something at a placement.

**Part one — what are we building**

1. Draw it from the code and the deployment, not from memory. Every component, every data
   store, every external dependency.
2. Mark every trust boundary explicitly.
3. For each data store, say **what the worst thing in it is** and who can read it.
4. List everywhere that data goes when it leaves: backups, logs, analytics, exports, staging
   copies.

**Part two — what can go wrong**

5. STRIDE at every boundary. **At least twelve findings.** Do not filter as you go; a bad
   finding costs a line and a missing one costs a breach.
6. Include at least two **accidents** — something a careless engineer or a buggy script could
   do — and two **insider** scenarios.

**Part three — what are we going to do**

7. Rank all of them. **At most three high.** Use the asymmetry question and show your reasoning
   for the top five.
8. Assign a response to each of the top five: mitigate, accept, transfer, eliminate. **At least
   one accept and at least one eliminate**, each with a written justification.
9. Write the top five as actionable findings: component, field, missing control, consequence.

**Part four — do something**

10. **Fix at least three.** Show the code or configuration change.
11. Write a test for each fix, so it cannot regress.
12. For anything you accepted, write it down properly: what, why, who decided, when to revisit.

**Part five — did it work**

13. How many tickets did this produce? How many are fixed?
14. Which finding surprised you most, and why had you not seen it before?
15. How long did the whole thing take? Say whether it was worth it, honestly.
16. Set a review date and a trigger. Say what would make you redo this before that date.

**Submit** the diagram with boundaries, the full findings list, the ranking with reasoning, the
three fixes with their tests, the accepted-risk records, and answers to 13–16.`,
      rubric: [
        { criterion: 'Drawn from reality', description: 'Components and boundaries taken from the code and deployment, not memory.', maxPoints: 15 },
        { criterion: 'Twelve findings, unfiltered', description: 'STRIDE per boundary, including accidents and insiders.', maxPoints: 20 },
        { criterion: 'An honest ranking', description: 'At most three high, with reasoning for the top five.', maxPoints: 15 },
        { criterion: 'Real decisions', description: 'At least one accept and one eliminate, both justified in writing.', maxPoints: 15 },
        { criterion: 'Three fixed, with tests', description: 'Real changes, each covered so it cannot regress.', maxPoints: 20 },
        { criterion: 'Did anything change', description: 'Tickets counted, the surprise named, the time judged honestly.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('"Do not filter as you go" during the findings stage because:',
        [['A bad finding costs a line and a missing one costs a breach', true],
          ['Filtering slows the exercise down', false],
          ['All the findings have to be ranked together afterwards', false],
          ['Early judgements are usually wrong', false]],
        'Ranking is a separate step, done afterwards.'),
      mcq('The question that distinguishes security work from security documents is:',
        [['Did anything change', true],
          ['Was the model complete', false],
          ['Were the risks ranked correctly', false],
          ['Did it follow a recognised framework', false]],
        'A beautiful diagram and no tickets is an exercise.'),
      mcq('Writing a test for each fix ensures:',
        [['The vulnerability cannot silently return', true],
          ['The fix is correctly implemented', false],
          ['The finding is properly documented', false],
          ['The change can be reviewed more easily', false]],
        'The same argument as the automated two-account test.'),
    ],
  },

  /* ══ T3_WEB_SECURITY ════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_WEB_SECURITY_INJECTION',
    notes: `Injection is one idea in many costumes: **data is treated as code because it was
concatenated into something that gets parsed.**

Once you see it that way, SQL injection, command injection, LDAP injection and template
injection are the same bug against different parsers, and the fix is the same too.

## SQL injection

    query = f"SELECT * FROM users WHERE email = '{email}'"

An email of \`' OR '1'='1\` makes the statement \`WHERE email = '' OR '1'='1'\`, which matches
everything. A \`'; DROP TABLE users; --\` does what it says.

**The fix:**

    cursor.execute("SELECT * FROM users WHERE email = %s", [email])

**Parameterised queries are not escaping.** The value is sent separately from the statement and
never becomes part of it, so there is nothing to escape out of. **That distinction is the whole
lesson**: escaping is a defence that can be defeated, and parameterisation removes the
category.

## The wrong fixes, which look right

**Escaping quotes by hand.** Multi-byte character sets, different quoting rules per database,
and a case you did not think of. People have been defeating hand-rolled escaping for thirty
years.

**Blocklisting words.** Rejecting \`DROP\`, \`UNION\`, \`--\`. Defeated by casing, by comments
inside keywords, by encoding — and it rejects a customer named "O'Brien" while letting the
attack through.

**Stored procedures.** Only safe if they parameterise internally. One that concatenates is
exactly as vulnerable, with an extra layer hiding it.

**An ORM.** Safe for its normal query methods, and **not** for its raw-SQL escape hatch, which
every ORM has and which is where the injection in an ORM-using codebase always is.

## Command injection

    os.system(f"convert {filename} output.png")

A filename of \`x.jpg; rm -rf /\` runs both. **The fix is the same shape:** pass arguments as a
list, so there is no shell to interpret them.

    subprocess.run(['convert', filename, 'output.png'])   # no shell=True

## The others, briefly

**Template injection.** User input rendered *as a template* rather than *into* one. Render
user content as data.

**Log injection.** A newline in user input forges a log line. Escape or structure your logs.

**NoSQL injection.** A document store is not immune: a query built from a user-supplied object
can have operators injected into it, so validate the type and the shape.

## The rule

**Never build a string that will be parsed by concatenating input.** SQL, shell, HTML, LDAP,
XML, templates — all the same rule.

**Where you genuinely cannot parameterise** — a table or column name, a sort direction — use a
**whitelist**, never a filter. \`if col not in ALLOWED: reject\`. That is the same conclusion the
pagination unit reached about sort fields, from a different direction.

## Finding it

**Grep for string construction near a query or a command.** f-strings, \`+\`, \`%\`, \`.format\`
next to \`execute\`, \`system\`, \`popen\`, \`eval\`. **That one search finds most of it**, and
it takes a minute on a codebase you have never seen.`,
    mcqs: [
      mcq('Injection is fundamentally:',
        [['Data treated as code because it was concatenated into something parsed', true],
          ['A failure to validate input correctly', false],
          ['An attacker submitting deliberately malformed input', false],
          ['A database accepting an unexpected statement', false]],
        'Which is why SQL, shell, LDAP and template injection are one bug.'),
      mcq('Parameterised queries differ from escaping because:',
        [['The value never becomes part of the statement', true],
          ['The driver escapes more reliably than you can', false],
          ['The database validates the value first', false],
          ['The statement is compiled before the value arrives', false]],
        'Escaping can be defeated; parameterisation removes the category.'),
      mcq('In an ORM-using codebase, the injection is almost always in:',
        [['The raw-SQL escape hatch', true],
          ['A filter with a user-supplied field name', false],
          ['A query built by chaining methods', false],
          ['A migration that runs user input', false]],
        'Every ORM has one, and that is where it is.'),
      mcq('Blocklisting SQL keywords fails partly because:',
        [['It rejects a customer named O’Brien and lets the attack through', true],
          ['Keywords differ between database engines', false],
          ['The list is expensive to check on every query', false],
          ['Attackers can use stored procedures instead', false]],
        'Wrong in both directions at once, which is the worst property a control can have.'),
    ],
    checkpoint: [
      mcq('Passing the command and its arguments to subprocess as a list is safe because:',
        [['There is no shell to interpret the arguments', true],
          ['The arguments are escaped by the library', false],
          ['The command is validated before running', false],
          ['The filename cannot contain a semicolon', false]],
        'The same shape of fix as parameterisation.'),
      mcq('Where a value genuinely cannot be parameterised, use:',
        [['A whitelist of allowed values', true],
          ['A filter that removes dangerous characters', false],
          ['An escaping function for that context', false],
          ['A length limit and a character class check', false]],
        'The same conclusion the pagination unit reached about sort fields.'),
      mcq('The one-minute search that finds most injection is:',
        [['String construction next to execute, system or eval', true],
          ['Every use of user input in the codebase', false],
          ['All raw SQL statements in the project', false],
          ['Functions that take a query as a parameter', false]],
        'f-strings, +, % and .format near the parsers.'),
    ],
  },

  {
    unitCode: 'T3_WEB_SECURITY_XSS',
    notes: `Cross-site scripting is injection with a browser as the parser. **User content
becomes executable JavaScript in somebody else's browser**, and it runs with all their
privileges on your site.

## What an attacker gets

Everything the user has. Their session cookie — unless it is \`HttpOnly\` — their
\`localStorage\`, including a token kept there. The ability to act as them, silently: change
their email, read their data, make a payment.

**And it is invisible.** The user sees your site behaving normally.

## Three kinds

**Stored.** The payload is saved — a comment, a profile field, a product review — and served to
everybody who views it. **The worst kind**, because one submission reaches every viewer.

**Reflected.** The payload is in the URL and echoed back. \`/search?q=<script>...\`. Needs the
victim to follow a link, which is what phishing is for.

**DOM-based.** No server involvement at all. Client-side JavaScript takes something from the
URL or the page and puts it into the DOM unsafely. **Your server logs show nothing**, which
makes it the hardest to detect.

## The fix: escape at output, for the context

**The context decides the escaping, and this is the part people get wrong.**

    <div>{{ user_input }}</div>              <!-- HTML: escape < > & " ' -->
    <div title="{{ user_input }}">           <!-- attribute: also quotes -->
    <script>var x = {{ user_input }};</script>  <!-- JavaScript: different rules -->
    <a href="{{ user_input }}">              <!-- URL: and reject javascript: -->

**The same string is safe in one and dangerous in another.** A value HTML-escaped and then
placed inside a \`<script>\` block is still executable.

**Modern templates escape HTML by default**, which is why most XSS in a modern codebase is in
one of three places: the explicit "unsafe" helper, an attribute or script context the default
does not cover, or \`innerHTML\` in client-side JavaScript.

**So learn where your framework does not protect you**, and search for those.

## Client-side

    element.innerHTML = userContent;     // executes
    element.textContent = userContent;   // does not

**\`textContent\` for text, always.** If HTML is genuinely required — a rich text field — use a
maintained sanitiser library, and understand that you are now relying on somebody else's
blocklist, which is a real and ongoing dependency.

## The wrong fixes

**Stripping \`<script>\`.** \`<img src=x onerror=alert(1)>\` needs no script tag. There are
hundreds of these.

**Sanitising on input.** You do not know the output context at input time, and you have
corrupted the stored data.

**A blocklist of anything.** Encoding, unusual attributes, SVG, and every browser quirk.

## Defence in depth

**\`HttpOnly\` cookies.** An XSS cannot read the session. **This does not stop the attack** —
the script can still act as the user — but it stops the credential being stolen and reused
later, which is a meaningful reduction.

**Content Security Policy.** Tell the browser which scripts may run. A good CSP stops most XSS
even when the escaping fails, and it is the highest-value single header you can add.

**Do not keep tokens in \`localStorage\`.** It is readable by any script on the page, which is
the argument the auth topic made from the other side.`,
    mcqs: [
      mcq('The most damaging kind of XSS is:',
        [['Stored, because one submission reaches every viewer', true],
          ['Reflected, because it can be sent to anyone', false],
          ['DOM-based, because the server never sees it', false],
          ['All three cause equivalent damage', false]],
        'A comment or a profile field served to everybody who views it.'),
      mcq('DOM-based XSS is hardest to detect because:',
        [['Your server logs show nothing', true],
          ['It only affects certain browsers', false],
          ['It requires client-side debugging tools', false],
          ['The payload is never stored anywhere', false]],
        'No server involvement at all.'),
      mcq('A value HTML-escaped and placed inside a `<script>` block is:',
        [['Still executable, because the context differs', true],
          ['Safe, since the dangerous characters are gone', false],
          ['Safe only if it is also quoted', false],
          ['Rejected by the browser as malformed', false]],
        'The context decides the escaping, and this is the part people get wrong.'),
      mcq('Stripping `<script>` tags fails because:',
        [['`<img src=x onerror=...>` needs no script tag', true],
          ['The tag can be split across two inputs', false],
          ['Browsers reinsert the tag when parsing', false],
          ['It corrupts legitimate content', false]],
        'There are hundreds of these, which is why blocklists lose.'),
    ],
    checkpoint: [
      mcq('In a modern framework, most XSS is found in:',
        [['The unsafe helper, a non-HTML context, or innerHTML', true],
          ['Templates that forgot to escape', false],
          ['Server-side string concatenation in the templates', false],
          ['Data loaded from the database', false]],
        'Learn where your framework does not protect you, and search for those.'),
      mcq('An HttpOnly cookie:',
        [['Stops the credential being stolen, not the attack itself', true],
          ['Prevents cross-site scripting entirely', false],
          ['Stops the script from making requests', false],
          ['Protects against DOM-based scripting attacks specifically', false]],
        'The script can still act as the user; it just cannot take the cookie away.'),
      mcq('The highest-value single header against XSS is:',
        [['Content Security Policy', true],
          ['X-Frame-Options', false],
          ['Strict-Transport-Security', false],
          ['X-Content-Type-Options', false]],
        'A good one stops most XSS even when the escaping fails.'),
    ],
  },

  {
    unitCode: 'T3_WEB_SECURITY_CSRF',
    notes: `Cross-site request forgery exploits one fact: **the browser sends your cookies with
every request to your domain, whoever caused the request.**

## The attack

The user is logged into your bank. They visit an unrelated page containing:

    <form action="https://bank.example/transfer" method="POST" id="f">
      <input name="to" value="attacker">
      <input name="amount" value="10000">
    </form>
    <script>document.getElementById('f').submit()</script>

The browser submits it, **attaches the bank's session cookie because the request goes to the
bank's domain**, and the transfer happens. The attacker never saw the cookie and did not need
to.

## Why authentication does not help

The request **is** authenticated. It is a genuine, logged-in request that the user did not
intend to make. Authentication proves who; it says nothing about intent, which is the gap CSRF
lives in.

## Three defences

**1. A CSRF token.** A random value in the session, included as a hidden field, checked on
submission. The attacker's page cannot read it — the same-origin policy stops them reading
your page — so they cannot include it.

**Every framework has this built in.** Turning it off because "it was causing problems" is the
usual way it gets removed.

**2. \`SameSite\` cookies.**

    Set-Cookie: session=...; SameSite=Lax; Secure; HttpOnly

\`SameSite=Lax\` means the cookie is not sent on cross-site POST requests, which stops the
attack above. It is the default in modern browsers, which has genuinely reduced CSRF a great
deal.

**It is not sufficient on its own.** Older browsers, and the fact that \`Lax\` still sends the
cookie on top-level cross-site *navigations* — so a \`GET\` that changes state is still
exposed.

**3. Check the origin.** The \`Origin\` header on state-changing requests. Simple, and it does
not survive every proxy configuration.

**Use the token and \`SameSite\` together.** Defence in depth, and the cost is nearly nothing.

## The rule this exposes

**\`GET\` must not change state.** Ever.

    GET /delete-account?confirm=yes     <!-- a link, a prefetch, an image tag -->

An \`<img src="...">\` on any page triggers this. So does a link-preview bot, a browser
prefetch, or a crawler. **This is not only a CSRF issue** — it is the HTTP contract, and
everything from caches to retry libraries assumes it.

**State-changing operations use \`POST\`, \`PUT\`, \`PATCH\` or \`DELETE\`.**

## Where CSRF does not apply

**A pure token API**, where the credential is in an \`Authorization\` header rather than a
cookie. The browser does not attach headers automatically, so there is nothing to forge.

**This is a genuine advantage of header-based tokens** — and it is the trade the sessions unit
described from the other side: you give up automatic revocation and you get CSRF immunity. Know
which you have, because a cookie-based API without CSRF protection is vulnerable and a
header-based one is not.`,
    mcqs: [
      mcq('CSRF works because:',
        [['The browser attaches your cookies to any request to your domain', true],
          ['The attacker can read the session cookie', false],
          ['The session token is predictable', false],
          ['The user is tricked into entering credentials', false]],
        'The attacker never sees the cookie and does not need to.'),
      mcq('Authentication does not prevent CSRF because:',
        [['The request is genuinely authenticated, just not intended', true],
          ['The credential is replayed from an earlier session', false],
          ['The check happens after the state change', false],
          ['Cross-site requests bypass the session lookup', false]],
        'Authentication proves who; it says nothing about intent.'),
      mcq('A CSRF token works because:',
        [['The attacker’s page cannot read your page to obtain it', true],
          ['The token changes on every request', false],
          ['The token is stored outside the cookie', false],
          ['The server can verify who generated it', false]],
        'The same-origin policy stops them reading it.'),
      mcq('`SameSite=Lax` is not sufficient alone partly because:',
        [['It still sends the cookie on top-level cross-site navigations', true],
          ['It is not supported by any current browser', false],
          ['It applies only to first-party cookies', false],
          ['It can be overridden by the attacking page', false]],
        'So a GET that changes state remains exposed.'),
    ],
    checkpoint: [
      mcq('`GET /delete-account?confirm=yes` is dangerous because:',
        [['An image tag, a prefetch or a crawler triggers it', true],
          ['The parameter can be guessed by an attacker', false],
          ['It appears in the browser history', false],
          ['It cannot carry a CSRF token', false]],
        'And it breaks the HTTP contract that caches and retry libraries rely on.'),
      mcq('A pure token API with the credential in a header:',
        [['Is not vulnerable to CSRF, because headers are not automatic', true],
          ['Is equally vulnerable and needs its own token as well', false],
          ['Is vulnerable only for cross-origin requests', false],
          ['Requires SameSite to be set on the token', false]],
        'The trade described from the other side in the sessions unit.'),
      mcq('The usual way CSRF protection gets removed is:',
        [['Somebody turns it off because it was causing problems', true],
          ['A framework upgrade quietly changes the default', false],
          ['It is omitted on newly added endpoints', false],
          ['It conflicts with an API client', false]],
        'Every framework has it built in; it has to be actively disabled.'),
    ],
  },

  {
    unitCode: 'T3_WEB_SECURITY_DEBUGGING',
    notes: `Five security problems, and how each one is found in code you did not write.

## 1. Finding injection

    grep -rn "execute(f\\"" .
    grep -rn "execute(.*+.*)" .
    grep -rn "os.system\\|subprocess.*shell=True" .

**Look for string construction next to a parser.** One search on a codebase you have never
seen finds most of it, and the false positives are quick to dismiss.

**The one it misses:** an ORM's raw-query escape hatch, which is named differently in every
framework. Learn yours and add it to the search.

## 2. Finding XSS

**Search for the unsafe output helper** — \`|safe\`, \`dangerouslySetInnerHTML\`, \`v-html\`,
\`innerHTML\`, \`html_safe\`. Every one is a place where the framework's protection was
deliberately turned off, and **every one should have a comment explaining why.**

**Then check the contexts the default does not cover:** anything inside a \`<script>\` block,
anything in an event-handler attribute, anything in an \`href\`.

**Test it:** put \`<img src=x onerror=alert(1)>\` in every text field and look at every page it
appears on. Crude, fast, and it finds real bugs.

## 3. Finding CSRF

**Is the framework's protection on?** Usually a middleware, sometimes disabled globally in a
config nobody remembers.

**Are there exemptions?** \`@csrf_exempt\` and its equivalents. Each one needs a reason, and
"the mobile app was failing" is a reason to fix the app.

**Any state-changing \`GET\`?** Search the routes for \`GET\` handlers that write.

## 4. The vulnerability that is a missing check

**No tool finds this reliably**, because there is nothing wrong with the code that is there —
what is wrong is the code that is absent.

**The method is the two-account test**, automated. It is the only reliable detection for
missing authorization, and it is why that unit insisted on making it a test rather than a
practice.

## 5. Finding the accidental exposure

**Debug mode in production.** Check the setting. A debug page shows the stack, the settings and
often the environment variables.

**Verbose errors.** Trigger a 500 deliberately and look at what comes back.

**Directory listing.** Ask for a directory and see whether you get an index.

**Exposed files.** \`/.git/\`, \`/.env\`, \`/backup.sql\`. Scanners try these within minutes of
a server appearing; try them yourself first.

**Secrets in the client bundle.** Search the built JavaScript for \`key\`, \`secret\`,
\`token\`. **An API key in the frontend bundle is public**, whatever anybody intended, and this
is one of the most common real exposures in student and startup projects alike.

## The order for a codebase you do not know

1. **Dependencies.** Run the audit tool. Known vulnerabilities, known fixes, five minutes.
2. **Configuration.** Debug mode, default credentials, exposed files.
3. **Injection.** The grep.
4. **Authorization.** The two-account test.
5. **XSS.** The unsafe helpers and the payload in every field.
6. **CSRF.** The middleware and the exemptions.

**Steps one and two are the highest value per minute** by a wide margin, and they are the ones
that get skipped because they feel less like security work.`,
    mcqs: [
      mcq('The grep for injection misses:',
        [['The ORM’s raw-query escape hatch', true],
          ['Concatenation inside a helper function', false],
          ['Injection in stored procedures', false],
          ['Command injection without a shell', false]],
        'Named differently in every framework, so learn yours and add it.'),
      mcq('Every use of an unsafe output helper should have:',
        [['A comment explaining why', true],
          ['A sanitiser applied beforehand', false],
          ['A test covering the escaped case', false],
          ['An entry in the threat model', false]],
        'It is a place where the framework’s protection was deliberately turned off.'),
      mcq('The only reliable detection for a missing authorization check is:',
        [['An automated two-account test', true],
          ['A static analysis tool', false],
          ['A review of every endpoint', false],
          ['A penetration test', false]],
        'Nothing is wrong with the code that is there; what is wrong is what is absent.'),
      mcq('An API key in the frontend bundle is:',
        [['Public, whatever anybody intended', true],
          ['Safe if the bundle is minified', false],
          ['Safe if the key is restricted by referrer', false],
          ['Only exposed to users who inspect it', false]],
        'One of the most common real exposures in student and startup projects alike.'),
    ],
    checkpoint: [
      mcq('The highest value per minute on an unfamiliar codebase is:',
        [['The dependency audit and the configuration check', true],
          ['The injection grep', false],
          ['The two-account test', false],
          ['The cross-site scripting payload sweep across the fields', false]],
        'And they get skipped because they feel less like security work.'),
      mcq('`@csrf_exempt` on an endpoint needs:',
        [['A reason, and "the app was failing" is a reason to fix the app', true],
          ['A compensating control such as a request signature', false],
          ['Approval from a security reviewer', false],
          ['A rate limit in its place', false]],
        'Each exemption is a deliberate hole.'),
      mcq('Triggering a 500 deliberately on an unfamiliar system tests for:',
        [['Verbose errors disclosing internals', true],
          ['Whether errors are logged correctly', false],
          ['Whether the service recovers cleanly', false],
          ['Whether the status code is classified properly', false]],
        'A stack trace tells an attacker your schema and your versions.'),
    ],
  },

  {
    unitCode: 'T3_WEB_SECURITY_PRACTICE',
    notes: `Two exercises on recognising the vulnerability rather than exploiting it. The
second is the escaping-by-context question, which is the part of XSS people get wrong after
they think they understand it.`,
    coding: [
      {
        title: 'Which of these is injectable',
        description: `Read one code pattern per line, described as
\`<sink> <construction>\`, where sink is \`sql\`, \`shell\`, \`html\` or \`log\`, and
construction is \`concatenated\`, \`parameterised\`, \`list_args\`, \`escaped\` or
\`whitelisted\`.

Print \`vulnerable\` or \`safe\` for each:

- \`concatenated\` → vulnerable, whatever the sink
- \`parameterised\` with sink \`sql\` → safe
- \`parameterised\` with any other sink → \`not_applicable\`
- \`list_args\` with sink \`shell\` → safe
- \`list_args\` with any other sink → \`not_applicable\`
- \`escaped\` with sink \`html\` → safe
- \`escaped\` with sink \`sql\` → vulnerable, because hand-escaping SQL loses
- \`escaped\` with any other sink → \`not_applicable\`
- \`whitelisted\` → safe, whatever the sink

Then a final line \`vulnerable=<count>\`.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# The defence has to match the sink. A defence for the wrong parser is not a defence.
`,
        language: 'python',
        tests: [
          { input: 'sql concatenated\nsql parameterised\n', expectedOutput: 'vulnerable\nsafe\nvulnerable=1' },
          { input: 'shell list_args\nhtml escaped\n', expectedOutput: 'safe\nsafe\nvulnerable=0' },
          { input: 'sql escaped\n', expectedOutput: 'vulnerable\nvulnerable=1' },
          { input: 'html parameterised\n', expectedOutput: 'not_applicable\nvulnerable=0' },
          { input: '', expectedOutput: 'vulnerable=0' },
          { input: 'log concatenated\nsql whitelisted\n', expectedOutput: 'vulnerable\nsafe\nvulnerable=1', isHidden: true },
          { input: 'shell escaped\n', expectedOutput: 'not_applicable\nvulnerable=0', isHidden: true },
        ],
      },
      {
        title: 'Escape for the context',
        description: `Read \`<context> <value>\` per line and print the escaped value.

Contexts and rules:

- \`html\` — replace \`&\` with \`&amp;\`, then \`<\` with \`&lt;\`, \`>\` with \`&gt;\`
- \`attribute\` — the html rules, then \`"\` with \`&quot;\` and \`'\` with \`&#39;\`
- \`url\` — if the value begins with \`javascript:\` (case-insensitive), print \`REJECTED\`;
  otherwise print it unchanged
- anything else → \`UNKNOWN_CONTEXT\`

**The ampersand must be replaced first.** Doing it last double-escapes the entities you just
created, which is a real and common bug.

Values contain no spaces.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# Order matters in the html rules. One of the four is not an escaping problem at all.
`,
        language: 'python',
        tests: [
          { input: 'html <script>\n', expectedOutput: '&lt;script&gt;' },
          { input: 'html a&b\n', expectedOutput: 'a&amp;b' },
          { input: 'attribute a"b\n', expectedOutput: 'a&quot;b' },
          { input: 'url javascript:alert(1)\n', expectedOutput: 'REJECTED' },
          { input: 'url https://example.com\n', expectedOutput: 'https://example.com' },
          { input: 'script x\n', expectedOutput: 'UNKNOWN_CONTEXT' },
          { input: 'html &lt;\n', expectedOutput: '&amp;lt;', isHidden: true },
          { input: 'url JavaScript:x\n', expectedOutput: 'REJECTED', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Web Security Practice',
      description: 'Classify injection defences, escape by context, then audit a real application.',
      instructions: `Complete both exercises, then:

1. For the first: explain why \`escaped\` is safe for HTML and vulnerable for SQL. The answer
   is about who wrote the escaping function, not about the characters.
2. For the first: give a sink and a defence not in the list, and say which category it belongs
   to.
3. For the second: the ampersand must be replaced first. Show what happens with the input
   \`<a&b>\` if you replace it last, step by step.
4. For the second: \`url\` is not really an escaping problem. Say what it is instead, and why a
   blocklist of \`javascript:\` is weaker than it looks.

**Then, audit a real application.** Yours, or an open-source one you can run locally.

5. Run the six-step order from the debugging unit. Report what each step found, including the
   steps that found nothing.
6. For injection: run the greps. Report the matches and whether each was a real issue.
7. For XSS: find every unsafe output helper. Report how many, and whether each has a reason.
8. For XSS: put a harmless payload in every text field and check every page it renders on.
   Report what you tried and what you found.
9. For CSRF: is protection enabled? Are there exemptions? Any state-changing GETs?
10. Fix one real issue. Show the fix and a test that would catch it returning.`,
      rubric: [
        { criterion: 'Defences classified', description: 'All combinations, including the not-applicable cases.', maxPoints: 20 },
        { criterion: 'Context-correct escaping', description: 'All contexts, with the ampersand ordering right.', maxPoints: 20 },
        { criterion: 'Why escaping loses for SQL', description: 'Answered in terms of who wrote the function.', maxPoints: 10 },
        { criterion: 'A real audit, six steps', description: 'Every step run and reported, including the empty ones.', maxPoints: 25 },
        { criterion: 'The payload sweep', description: 'Every field tried, every rendering page checked, results reported.', maxPoints: 15 },
        { criterion: 'One fix with a test', description: 'A real issue fixed and covered against regression.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]
`,
        tests: [
          { input: 'html <script>\n', expectedOutput: '&lt;script&gt;' },
          { input: 'html a&b\n', expectedOutput: 'a&amp;b' },
          { input: 'attribute a"b\n', expectedOutput: 'a&quot;b' },
          { input: 'url javascript:alert(1)\n', expectedOutput: 'REJECTED' },
          { input: 'html &lt;\n', expectedOutput: '&amp;lt;', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 20,
      },
    },
    checkpoint: [
      mcq('Hand-escaping is safe for HTML and not for SQL because:',
        [['The HTML escaper is a maintained library and the SQL one is yours', true],
          ['HTML has fewer special characters', false],
          ['SQL escaping depends on the surrounding query structure', false],
          ['HTML escaping is applied at output', false]],
        'The answer is about who wrote the function, not about the characters.'),
      mcq('Replacing the ampersand last double-escapes because:',
        [['The entities you just created contain ampersands', true],
          ['The other replacements introduce new characters', false],
          ['Ampersands can appear inside tag names', false],
          ['The order affects which characters match', false]],
        '&lt; becomes &amp;lt; when the ampersand pass runs after it.'),
      mcq('Rejecting `javascript:` in a URL is weaker than it looks because:',
        [['Encoding and whitespace variants evade a literal check', true],
          ['Some legitimate URLs begin with it', false],
          ['The browser normalises the URL scheme afterwards anyway', false],
          ['Other schemes are equally dangerous', false]],
        'Which is the blocklist problem again, in a new place.'),
    ],
  },

  {
    unitCode: 'T3_WEB_SECURITY_MINI_PROJECT',
    notes: `Attack a deliberately vulnerable application, then find the same classes of bug in
something real.

The two halves matter for different reasons. **The vulnerable application teaches you what the
attack feels like** — you cannot recognise something you have never seen working. **The real
application teaches you that finding it is much harder when nobody planted it for you.**

Use only applications built for the purpose, or your own code, or something you have **written
permission** to test. Testing a system you do not own is a criminal offence in most
jurisdictions, and permission is not implied by a public URL.

Budget around two hours.`,
    assignment: {
      title: 'Mini Project — Break It, Then Find It',
      description: 'Exploit a deliberately vulnerable app, then audit a real one for the same classes of bug.',
      instructions: `**Part one — a deliberately vulnerable application**

Use one built for teaching — there are several well-known ones, and your instructor can name
them. Set it up locally.

1. **SQL injection.** Extract data you should not be able to reach. Show the payload and what
   it returned. Then find the line of code and say exactly why it worked.
2. **XSS.** Get a script to execute in your own browser. Try all three kinds if the application
   supports them. Show the payload and the vulnerable line.
3. **Broken access control.** Reach another user's data. Show the request.
4. **CSRF**, if it is present. Build a page that makes a state-changing request. Show it
   working.

For each, write the **one-line fix** — the actual line of code you would change.

**Part two — a real application**

Your own, or an open-source one you can run. **Not one you do not own.**

5. Run the six-step order from the debugging unit. Report every step, including those that
   found nothing.
6. Run the dependency audit. Report the vulnerabilities and their severities.
7. Run the injection greps. Report every match, and whether each was real.
8. Run the two-account test. Every endpoint.
9. Find every unsafe output helper. Report the count and whether each is justified.
10. Check the configuration: debug mode, default credentials, exposed files, secrets in the
    client bundle.

**Part three — fix and prevent**

11. Fix at least two real issues. Show the change.
12. Write a test for each, so it cannot return silently.
13. Add one **preventive** measure that removes a whole class: a CSP header, parameterised
    queries enforced by a lint rule, a dependency scan in CI.
14. Say what you found that surprised you, and why you had not noticed it before.
15. Say what you did **not** check, and what would be needed to check it. An honest boundary on
    the audit is part of the work.

**Submit** the four exploits with their payloads and one-line fixes, the six-step audit report,
the two fixes with tests, and the preventive measure.`,
      rubric: [
        { criterion: 'Four exploits, understood', description: 'Each demonstrated, with the vulnerable line found and explained.', maxPoints: 20 },
        { criterion: 'One-line fixes', description: 'The actual change, per exploit, not a general description.', maxPoints: 15 },
        { criterion: 'A real six-step audit', description: 'Every step run on real code and reported, including empty results.', maxPoints: 25 },
        { criterion: 'Two real fixes with tests', description: 'Genuine issues, fixed, and covered against regression.', maxPoints: 20 },
        { criterion: 'A preventive measure', description: 'Something that removes a class rather than an instance.', maxPoints: 10 },
        { criterion: 'An honest boundary', description: 'What was not checked, and what checking it would take.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('Practising on a deliberately vulnerable application matters because:',
        [['You cannot recognise something you have never seen working', true],
          ['Real applications rarely contain these bugs', false],
          ['It is the only legal way to practise', false],
          ['The payloads transfer directly to real production systems', false]],
        'And the real application then teaches you how much harder finding it is.'),
      mcq('Testing a system you do not own is:',
        [['A criminal offence in most jurisdictions', true],
          ['Acceptable if no damage is done', false],
          ['Permitted for publicly accessible endpoints', false],
          ['A grey area depending on intent', false]],
        'Permission is not implied by a public URL.'),
      mcq('A preventive measure differs from a fix in that it:',
        [['Removes a whole class rather than an instance', true],
          ['Applies before the vulnerability is introduced', false],
          ['Is enforced by tooling rather than review', false],
          ['Covers code that has not been written yet', false]],
        'A CSP, a lint rule, a scan in CI.'),
    ],
  },

  /* ══ T3_SECURE_CODING ═══════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_SECURE_CODING_SECRETS',
    notes: `A secret in a repository is a secret that has leaked. Not "might" — **the moment it
is committed and pushed, treat it as public**, because you no longer control every copy.

## Why deleting it does not help

Git keeps history. \`git rm\` in a later commit leaves the secret in every earlier one, in
every clone, in every fork, and in every CI cache. **Anyone with the repository has it.**

**So the response to a committed secret is always the same, and it is not "remove the file":**

1. **Rotate it immediately.** New key, old one revoked. Everything else is secondary.
2. **Then** clean the history if you can, knowing that clones already exist.
3. **Check whether it was used.** Access logs for that credential, for the whole period it
   existed.

**Rotation is the fix. History rewriting is tidying.**

## Where secrets go instead

**Environment variables**, for most cases. Supported everywhere, and nothing accidentally
committed. They do leak into logs, crash dumps and child processes, so they are the baseline
rather than the ideal.

**A secret manager** for anything serious — a cloud provider's, or a dedicated one. You get
access control, an audit trail, versioning and rotation.

**The platform's secret store** for CI, never the pipeline file.

## What is a secret

More than you think: API keys and tokens, database passwords and connection strings, signing
keys, encryption keys, webhook signing secrets, OAuth client secrets, and **internal URLs and
hostnames** — not secret in themselves, and useful to somebody mapping your system.

## The rules

**A \`.gitignore\` before the first commit.** \`.env\`, \`*.pem\`, \`credentials.json\`. After
the first commit is too late for anything already in.

**\`.env.example\` with the keys and no values.** Documents what is needed, commits safely, and
is the thing your README should point at.

**A secret scanner in CI.** Several exist and they work. **Catching it at the pull request is
worth more than any amount of care**, because care fails on the day somebody is in a hurry.

**Never log a secret.** Not at debug level, not in an error message, not in a request dump.
**And be careful with an object that prints everything** — a config object logged in full will
print the password it holds.

**Never in the client bundle.** Anything in frontend JavaScript is public. If the browser needs
to call a third party with a secret, it does not: your server calls it.

## Rotation

**Every secret should be rotatable, and rotation should be rehearsed.** A secret nobody knows
how to change is a secret that will never be changed, and when it leaks the answer will be
"we cannot, that would break production" — which is a worse conversation than any leak.

**Rotate on a schedule**, and on every departure of somebody who had access.

## What to do when one leaks

1. **Rotate.** Now, before anything else.
2. **Revoke** the old one explicitly; do not assume it expires.
3. **Check the logs** for use of it.
4. **Then** clean the history, and tell whoever needs to know.
5. **Write down how it happened** and add the control that would have caught it.

**Speed matters more than thoroughness in the first ten minutes.** A rotated key is safe even
if the history is still dirty; a clean history with a live key is not.`,
    mcqs: [
      mcq('The first response to a secret committed to a repository is:',
        [['Rotate it', true],
          ['Remove it from the history', false],
          ['Check whether the repository is private', false],
          ['Add it to .gitignore', false]],
        'Rotation is the fix; history rewriting is tidying.'),
      mcq('`git rm` on a committed secret:',
        [['Leaves it in every earlier commit, clone and fork', true],
          ['Removes it from the repository history', false],
          ['Is sufficient if the branch is deleted', false],
          ['Works if done before the next push', false]],
        'Anyone with the repository already has it.'),
      mcq('A secret scanner in CI is valuable because:',
        [['Care fails on the day somebody is in a hurry', true],
          ['It can detect secrets in the git history', false],
          ['It is required by most compliance regimes', false],
          ['It classifies secrets by severity', false]],
        'Catching it at the pull request beats any amount of discipline.'),
      mcq('A secret nobody knows how to rotate:',
        [['Will never be changed, and the leak conversation is worse', true],
          ['Should be replaced with a longer-lived one', false],
          ['Is acceptable if access is tightly controlled', false],
          ['Can be rotated during the next maintenance window', false]],
        '"We cannot, that would break production" is worse than any leak.'),
    ],
    checkpoint: [
      mcq('Logging a config object in full risks:',
        [['Printing the password it holds', true],
          ['Exposing the environment variable names', false],
          ['Revealing the deployment environment', false],
          ['Slowing the startup sequence', false]],
        'Be careful with anything that prints everything.'),
      mcq('If the browser needs to call a third party with a secret:',
        [['Your server makes the call instead', true],
          ['The secret is scoped to that origin', false],
          ['The secret is obfuscated in the bundle', false],
          ['The call is proxied through a CDN', false]],
        'Anything in frontend JavaScript is public.'),
      mcq('In the first ten minutes of a leak, speed matters more than thoroughness because:',
        [['A rotated key is safe even with a dirty history', true],
          ['The window before exploitation is short', false],
          ['History cleaning takes longer than rotation', false],
          ['Notification requirements have deadlines', false]],
        'A clean history with a live key is not safe.'),
    ],
  },

  {
    unitCode: 'T3_SECURE_CODING_DEPENDENCY_SECURITY',
    notes: `Your application is mostly other people's code. A typical project has hundreds of
transitive dependencies, and **you are responsible for all of them** — the attacker does not
care whose code the vulnerability was in.

## What an outdated dependency exposes

**A known vulnerability is a published one.** When a CVE is announced, the details are public:
what the flaw is, how to exploit it, which versions are affected. **Automated scanners find
vulnerable versions within hours of the announcement**, and the window between disclosure and
exploitation is measured in days.

**So "we will update next quarter" is a decision to be exploitable for a quarter**, and it
should be said that way when it is being decided.

## The scanning tools

    npm audit
    pip-audit
    cargo audit
    # and the platform's own, in CI

**Run them in CI, on every build.** A vulnerability introduced today is cheapest to fix today,
and a scan that runs only when somebody remembers runs only after an incident.

**Read the severity, and read the context.** A critical vulnerability in a package used only by
your test runner is not a critical risk to your production system — and saying so requires you
to know how the package is used, which is the work. **Do not ignore it because it is
inconvenient; dismiss it because you checked.**

## Keeping current

**Small and often beats large and rare.** Five patch updates a week is routine. A twelve-month
jump across three major versions is a project, and it is the reason teams stop updating — the
first delay makes the second harder, and after two years nobody will attempt it.

**Automate the routine ones.** A bot that opens a pull request per update, with your tests
running against it, turns dependency maintenance into review rather than work.

**Pin, and use a lockfile.** Reproducible builds, and a deliberate act to change a version.

## Choosing a dependency

Before adding one, ask:

- **Is it maintained?** Last release, open issues, response time.
- **How many dependencies does it bring?** A package with sixty transitive dependencies is
  sixty more things to trust.
- **How much of it do you need?** A whole library for one function is a poor trade, and
  copying the function with attribution is sometimes the better engineering.
- **What would happen if it were abandoned?** Or compromised?

## Supply chain

**A compromised package is a real attack**, and it has happened repeatedly to popular
packages: a maintainer's account taken over, or a new maintainer added and then malicious code
published.

What helps:

- **A lockfile**, so you do not silently get a new version.
- **Reviewing what a major update changes**, not just that it exists.
- **Being suspicious of a brand new package with a name very like a popular one** —
  typosquatting is common and effective.
- **Not running arbitrary install scripts** where you can avoid it.

## The honest position

**You cannot audit hundreds of dependencies.** Nobody does. What you can do is: scan
automatically, update routinely, keep the count down, and know which ones are load-bearing.

**And the most valuable habit is the boring one** — a scan in CI and a weekly update pull
request. It is unglamorous, it takes almost no time, and it removes most of this risk class.`,
    mcqs: [
      mcq('A published CVE is dangerous because:',
        [['The exploit details are public and scanners find vulnerable versions in hours', true],
          ['Attackers are notified before the maintainers', false],
          ['The fix is usually not available yet', false],
          ['It is added to automated attack toolkits eventually', false]],
        '"Next quarter" is a decision to be exploitable for a quarter.'),
      mcq('A critical vulnerability in a test-only dependency:',
        [['May be a low risk, but only if you checked how it is used', true],
          ['Is always safe to ignore', false],
          ['Must be treated as critical regardless', false],
          ['Should be suppressed in the scanner configuration', false]],
        'Dismiss it because you checked, not because it is inconvenient.'),
      mcq('Small frequent updates beat large rare ones because:',
        [['The first delay makes the second harder, until nobody attempts it', true],
          ['Patch releases are less likely to break things', false],
          ['Scanners only report on recent versions', false],
          ['Major versions require more testing', false]],
        'A twelve-month jump across three major versions is a project.'),
      mcq('A lockfile helps against supply chain attacks by:',
        [['Preventing a new version arriving silently', true],
          ['Verifying the package author’s signature', false],
          ['Blocking packages with install scripts', false],
          ['Detecting typosquatted package names', false]],
        'Changing a version becomes a deliberate, reviewable act.'),
    ],
    checkpoint: [
      mcq('A package with sixty transitive dependencies is:',
        [['Sixty more things to trust', true],
          ['Well-factored and therefore maintainable', false],
          ['Normal for a modern ecosystem', false],
          ['Only a concern for bundle size', false]],
        'Which is one of the four questions to ask before adding it.'),
      mcq('A brand new package with a name very like a popular one is:',
        [['Probably typosquatting, which is common and effective', true],
          ['Likely a fork with a small improvement', false],
          ['Usually a community-maintained alternative to the original', false],
          ['Safe if it has the same interface', false]],
        'Worth a second look at the name before installing.'),
      mcq('The most valuable dependency habit is:',
        [['A scan in CI and a weekly update pull request', true],
          ['An annual audit of the full dependency tree', false],
          ['Vendoring critical dependencies into the repository', false],
          ['Minimising the total number of dependencies', false]],
        'Unglamorous, nearly free, and it removes most of the risk class.'),
    ],
  },

  {
    unitCode: 'T3_SECURE_CODING_CHECKPOINT',
    notes: `The security layer of the year, measured.

**The line the whole module holds:** security is not a list of attacks, it is the habit of
asking what somebody would want and where you would let them have it. The list changes; the
habit transfers.

**What is being checked**

- **Threat modelling** — the four questions, trust boundaries, and ranking by what the attack
  costs the attacker against what it costs you.
- **Ranking** — and that "accept" and "eliminate" are real answers, written down.
- **Injection** — that it is one bug against many parsers, and that parameterisation removes
  the category where escaping only defends against it.
- **XSS** — that the context decides the escaping, and where your framework stops protecting
  you.
- **CSRF** — that the request is genuinely authenticated, and that \`GET\` must not change
  state.
- **Access control** — the two-account test, automated, as the only reliable detection for a
  check that is absent.
- **Secrets** — that rotation is the fix and history rewriting is tidying.
- **Dependencies** — that a published CVE is a public exploit, and that a scan in CI is worth
  more than care.

**What is not being checked:** the ability to recite the OWASP list in order, or the syntax of
any particular scanner.

**If you are unsure**, the highest-value revision is not more reading. **Take your own project
and run the six-step audit from the web security debugging unit.** An hour of that teaches more
than any unit here, and it will find something — it reliably does.

**And one thing to carry out of this module:** you will not be asked to be a security
specialist. You will be asked to write code that does not have the obvious holes, to notice
when a design has one, and to say so. That is an achievable standard, and it is most of what
goes wrong.`,
    mcqs: [
      mcq('The line this module holds is:',
        [['Security is a habit of asking, not a list of attacks', true],
          ['Every application has vulnerabilities to find', false],
          ['Defence in depth beats any single control', false],
          ['Most breaches come from known vulnerabilities', false]],
        'The list changes; the habit transfers to attacks that did not exist yet.'),
      mcq('If you are unsure of this material, the revision with the highest value is:',
        [['Run the six-step audit on your own project', true],
          ['Re-read the three web security units', false],
          ['Work through a vulnerable application again', false],
          ['Memorise the OWASP top ten', false]],
        'An hour of it teaches more than any unit here, and it reliably finds something.'),
      mcq('The standard this module sets for a graduate is:',
        [['Write code without the obvious holes, and notice when a design has one', true],
          ['Be able to perform a penetration test', false],
          ['Know the current OWASP list in order', false],
          ['Audit dependencies before every release', false]],
        'Achievable, and most of what goes wrong.'),
    ],
    checkpoint: [
      mcq('Parameterisation beats escaping because:',
        [['It removes the category rather than defending against it', true],
          ['It is faster for the database to process', false],
          ['It handles more character sets correctly', false],
          ['It is enforced by the driver rather than the developer', false]],
        'The value never becomes part of the statement.'),
      mcq('The escaping needed for a value depends on:',
        [['The context it is being placed into', true],
          ['The source the value came from', false],
          ['The character set in use', false],
          ['Whether the value was validated on input', false]],
        'HTML-escaped and placed inside a script block is still executable.'),
      mcq('CSRF succeeds against a request that is:',
        [['Genuinely authenticated but not intended', true],
          ['Sent with a stolen session cookie', false],
          ['Missing its authentication entirely', false],
          ['Replayed from a captured earlier request', false]],
        'Authentication proves who; it says nothing about intent.'),
      mcq('The only reliable way to detect a missing authorization check is:',
        [['An automated test that a stranger cannot reach the resource', true],
          ['A static analysis pass over the handlers', false],
          ['A review of every single endpoint by a second engineer', false],
          ['A scanner run against the deployed application', false]],
        'Nothing is wrong with the code that is there; what is wrong is absent.'),
      mcq('When a secret is committed, the first action is:',
        [['Rotate it', true], ['Rewrite the history', false],
          ['Make the repository private', false], ['Check the access logs', false]],
        'A rotated key is safe with a dirty history; a clean history with a live key is not.'),
    ],
  },

  /* ══ T3_DIRECTION_CHOICE ════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_DIRECTION_CHOICE_WHAT_EACH_DIRECTION_IS',
    notes: `You chose a direction when you started. This is where you confirm it or change it,
and the point is to decide on **what the work is actually like** rather than on which title
sounds best.

## What each one does all day

**Backend.** Designing data models, writing APIs, making queries fast, keeping services up.
Most of the day is reading existing code and reasoning about state. **Satisfying if you like
systems and correctness**; frustrating if you want to see what you built.

**Frontend.** Turning designs into interfaces, managing state, worrying about accessibility and
browsers. **You see your work**, and the feedback loop is immediate. Frustrating if you dislike
visual detail or ambiguity about what "done" means.

**Data.** Pipelines, transformations, making sure numbers are right. A great deal of the job is
**dealing with data that is wrong** — missing, duplicated, in three formats. Satisfying if you
like getting things exactly right; frustrating if you want to ship features.

**AI/ML engineering.** Mostly **not** modelling. It is data preparation, evaluation, getting a
model into production, and monitoring it once it is there. If you want to invent architectures,
that is research and it is a different job with a different entry route — and this is the
single biggest mismatch between expectation and reality in this list.

**Cloud and DevOps.** Infrastructure, pipelines, reliability. You are the reason other people
can ship. **Often invisible when it works** and very visible when it does not, and on-call is
usually part of it.

**Security.** Finding and preventing problems. Part technical, part persuading other people to
care. Slower-moving and often adversarial, and it suits people who enjoy taking things apart.

**Mobile.** Apps, on constrained devices, with app store release cycles that mean **a bug can
take a week to fix in users' hands**. Satisfying if you like polish and constraints.

**Software engineering, general.** Breadth, feature work across the stack, the most common
first job. A reasonable default and not a failure to choose.

**Full-stack.** Everything, at a smaller company. You will be worse at each part than a
specialist and more useful in a small team, which is a real trade rather than a compromise.

## How to choose badly

**By salary.** The differences are smaller than the internet suggests, they change, and being
mediocre at a well-paid thing you dislike pays less than being good at something you do not.

**By what sounds impressive.** "AI engineer" is a title. The work is data cleaning.

**By what you have not tried.** Most people rate an unfamiliar direction highly because they
are imagining the interesting parts.

**By what one person told you.** One person's experience at one company.

## How to choose well

**Look at the day.** Read real job descriptions — the responsibilities section, not the
requirements. Look at the actual tickets in an open-source project in that area.

**Look at what you have enjoyed.** Not what you found easy — what you kept going on when it
was hard. That is the better signal, and the next unit is about getting it from your own
evidence.

**Talk to somebody doing it**, and ask what the worst part is. Anybody will tell you the good
parts unprompted.

**And remember it is not permanent.** People move between these throughout their careers, and
the foundations transfer. **Choosing is committing to a first job, not to a life** — which is
why this decision deserves care and not anxiety.`,
    mcqs: [
      mcq('The biggest mismatch between expectation and reality is:',
        [['AI/ML engineering, which is mostly not modelling', true],
          ['Frontend, which is mostly not visual', false],
          ['Backend, which is mostly not architecture', false],
          ['Security, which is mostly not technical', false]],
        'Data preparation, evaluation and deployment; inventing architectures is research.'),
      mcq('A large part of data engineering is:',
        [['Dealing with data that is wrong', true],
          ['Building dashboards for stakeholders', false],
          ['Choosing between storage technologies', false],
          ['Optimising query performance', false]],
        'Missing, duplicated, and in three formats.'),
      mcq('Choosing by salary is weak because:',
        [['Being mediocre at a well-paid thing pays less than being good at something else', true],
          ['Salaries are impossible to compare fairly', false],
          ['The highest-paying areas are the hardest to enter', false],
          ['Salary data online is usually inaccurate', false]],
        'And the differences are smaller than the internet suggests.'),
      mcq('The better signal from your own experience is:',
        [['What you kept going on when it was hard', true],
          ['What you found easiest to learn', false],
          ['What you scored highest on', false],
          ['What you finished most quickly', false]],
        'Which is what the next unit gets from your evidence.'),
    ],
    checkpoint: [
      mcq('Reading job descriptions, the useful section is:',
        [['Responsibilities, not requirements', true],
          ['Requirements, which say what to learn', false],
          ['The company description', false],
          ['The salary band', false]],
        'What the day is like, rather than what the filter is.'),
      mcq('Asking somebody in the role what the worst part is:',
        [['Gets what nobody volunteers', true],
          ['Reveals whether they enjoy their job', false],
          ['Is more honest than asking about the best part', false],
          ['Tests how long they have done it', false]],
        'Anybody will tell you the good parts unprompted.'),
      mcq('Choosing a direction is:',
        [['Committing to a first job, not to a life', true],
          ['A decision that shapes the next decade', false],
          ['Reversible only in the first year', false],
          ['Less important than the company you join', false]],
        'Which is why it deserves care and not anxiety.'),
    ],
  },

  {
    unitCode: 'T3_DIRECTION_CHOICE_AGAINST_YOUR_EVIDENCE',
    notes: `You have two years of evidence about yourself. **Use it**, rather than deciding
from an impression of what you would enjoy.

## What the evidence is

**Your skill profile.** Which skills are strong, and which have improved fastest. **The rate of
improvement matters more than the level** — improving quickly in an area usually means you are
engaging with it, and engagement predicts a career better than a current score does.

**What you built when nobody set it.** Optional projects, things you extended past the brief,
the assignment you kept working on after it was submitted. **This is the strongest single
signal you have**, because nothing was forcing it.

**What you finished.** Plenty of people start things. What you carried to the end says
something about which work holds you.

**Where you helped others.** What you explained to a classmate is often what you understand
best and care about most.

**What you avoided.** Honestly. The topic you left until last every time is data too.

## Reading it without over-reading it

**A high score is not a vocation.** Being good at data structures does not mean you should do
algorithms work — and much of a career is not the thing you scored well on.

**A low score is not a barrier.** Most of these directions can be entered from a moderate
starting point, and Year 3 is designed to move you. **A low score plus genuine interest beats a
high score plus indifference**, because one of those compounds over a career and the other
does not.

**Enjoyment during the hard part is the signal to trust.** Everyone enjoys work when it is
going well. What you were still interested in at hour four of a bug is the thing worth
following.

## The comparison to make

For your current direction and one alternative, write down:

1. **What I have built in this area**, and whether anybody asked me to.
2. **What my evidence says about my skills here** — the level, and the trajectory.
3. **What I enjoyed**, specifically. Not "I liked the project" but which part.
4. **What I disliked**, specifically.
5. **What the day looks like**, from the previous unit.
6. **What the gap is** between where I am and employable in it.

**Doing this for two directions is the exercise.** Comparing is what produces a decision;
thinking about one in isolation produces a feeling.

## When they disagree

**Evidence says one thing, interest says another.** This is common and it is not a
contradiction.

- **Interest with no evidence** — you have not tried it enough to know. **Build something
  small in it before committing.** Two weekends is enough to find out.
- **Evidence with no interest** — you are good at it and do not enjoy it. Take that seriously.
  You will be doing it for a long time, and competence without interest is how people end up
  leaving the industry rather than changing direction within it.
- **Both, in different areas** — pick the one where the gap to employable is smaller, get the
  first job, and move later. **First jobs are not final**, and it is much easier to move
  sideways from inside the industry than from outside it.

## Writing it down

Whatever you choose, **write down why**, with the evidence you used. In six months, when it is
hard, you will want to know whether you are hitting a real mismatch or an ordinary difficult
patch — and only the record can tell you which.

That is the same principle as the decision record in the documentation topic, applied to
yourself.`,
    mcqs: [
      mcq('The strongest single signal about direction is:',
        [['What you built when nobody set it', true],
          ['Your highest skill scores', false],
          ['Which modules you finished fastest', false],
          ['What you found easiest to learn', false]],
        'Nothing was forcing it, which is what makes it evidence.'),
      mcq('The rate of improvement matters more than the level because:',
        [['Improving quickly usually means you are engaging with it', true],
          ['Early scores are unreliable measures', false],
          ['Levels depend on prior exposure', false],
          ['Employers look at trajectory rather than score', false]],
        'And engagement predicts a career better than a current score.'),
      mcq('"Interest with no evidence" should be resolved by:',
        [['Building something small in it before committing', true],
          ['Choosing it, since interest predicts engagement', false],
          ['Discounting it, since there is nothing behind it', false],
          ['Asking somebody who works in that area', false]],
        'Two weekends is enough to find out.'),
      mcq('"Evidence with no interest" should be taken seriously because:',
        [['Competence without interest is how people leave the industry', true],
          ['Skills fade without engagement', false],
          ['Employers detect a lack of enthusiasm', false],
          ['It suggests the evidence was measured wrongly', false]],
        'Rather than changing direction within it.'),
    ],
    checkpoint: [
      mcq('Comparing two directions rather than considering one:',
        [['Produces a decision rather than a feeling', true],
          ['Halves the chance of choosing wrongly', false],
          ['Reveals which has the better prospects', false],
          ['Is required before the direction can be changed', false]],
        'Thinking about one in isolation produces a feeling.'),
      mcq('With interest and evidence in different areas, the advice is:',
        [['Pick the smaller gap, get the first job, move later', true],
          ['Follow the interest, since it sustains effort', false],
          ['Follow the evidence, since it is measurable', false],
          ['Defer the decision until one becomes clearer', false]],
        'It is much easier to move sideways from inside the industry than from outside.'),
      mcq('Writing down why you chose is valuable because:',
        [['In six months you can tell a mismatch from a hard patch', true],
          ['It can be shown to a future employer', false],
          ['It commits you to the decision', false],
          ['It documents the evidence you used for your mentor', false]],
        'The decision record from the documentation topic, applied to yourself.'),
    ],
  },

  {
    unitCode: 'T3_DIRECTION_CHOICE_CONFIRM_OR_CHANGE',
    notes: `Decide. Confirm the direction you started with, or change it — and this is the last
point at which changing is cheap.

## Why now

**The direction sets the spine of the rest of your year.** Everything after this is track work
for the direction you hold, and the earlier a change happens, the less of that has been built
out.

Changing later is possible and it costs: units already completed in the old track, and time
that could have been spent on the new one.

## What confirming means

**Not "I have not changed my mind."** It means:

1. You have read what the day actually looks like.
2. You have compared it against at least one alternative.
3. You have looked at your own evidence rather than your impression of yourself.
4. You can say in one sentence why this one.

**If you cannot do the fourth, you have not confirmed anything** — you have defaulted, which is
a different thing and worth knowing about yourself.

## What changing means

Also a decision, and a legitimate one. **Changing because the evidence says so is a good
outcome of this topic, not a failure of the earlier one.** A student who arrives believing they
want AI engineering, reads what it is, looks at what they have actually built and enjoyed, and
moves to backend has done the exercise correctly.

**Changing because the current one is hard is different.** Year 3 is meant to be hard, and
every direction is hard in its own way. The question is whether it is the *wrong kind* of hard
— and the honest test is whether you were interested at hour four of the difficulty, which the
previous unit asked you to look at.

## What does not change

**The universal core.** Everything before this topic applies to every direction: algorithms,
architecture, testing, databases, APIs, security, deployment. **Nothing you have done is
wasted by a change of direction**, which is deliberate and is why the year is built this way.

## After deciding

**Write it down**, with the evidence, as the previous unit asked.

**Tell your mentor.** A change is a plan change, and the plan is rebuilt from it.

**Then commit for the rest of the year.** Not forever — for this year. Constantly
reconsidering is its own failure mode: it produces a shallow acquaintance with three
directions instead of employability in one, and employability in one is what the year is for.

**The thing to hold on to:** every one of these directions is a reasonable career, and the
foundations transfer between them. **You are choosing a first job, and you are not choosing it
irrevocably.** The decision deserves half a day of honest thought, and not a fortnight of
anxiety.`,
    mcqs: [
      mcq('Confirming a direction requires:',
        [['Being able to say in one sentence why this one', true],
          ['Not having changed your mind since starting', false],
          ['Scoring well in the related skills', false],
          ['Having built something in that area already', false]],
        'Otherwise you have defaulted, which is a different thing.'),
      mcq('Changing direction because the evidence says so is:',
        [['A good outcome of this topic', true],
          ['A sign the first choice was careless', false],
          ['Acceptable but costly at this point', false],
          ['Best deferred until the next checkpoint', false]],
        'Reading what the work is, looking at what you built, and moving is the exercise working.'),
      mcq('Changing because the current direction is hard:',
        [['Is different, since every direction is hard in its own way', true],
          ['Is equally valid as a reason', false],
          ['Suggests the wrong skills were measured', false],
          ['Should be discussed with a mentor first', false]],
        'The question is whether it is the wrong kind of hard.'),
      mcq('A change of direction wastes:',
        [['Nothing from the universal core', true],
          ['The whole of the year so far', false],
          ['The assessment evidence gathered', false],
          ['The bridge units already completed', false]],
        'Algorithms, architecture, testing, databases, APIs, security and deployment all apply.'),
    ],
    checkpoint: [
      mcq('Changing later than this point costs:',
        [['Track units already completed, and the time to rebuild', true],
          ['The whole of the specialisation track', false],
          ['A restart of the direction assessment', false],
          ['Nothing at all, since the plan is rebuilt anyway', false]],
        'Which is why this is the last cheap point.'),
      mcq('Constantly reconsidering the direction produces:',
        [['Shallow acquaintance with three instead of employability in one', true],
          ['A better-informed final decision at the end of it', false],
          ['More transferable skills overall', false],
          ['A broader portfolio of evidence', false]],
        'Employability in one is what the year is for.'),
      mcq('The decision is described as deserving:',
        [['Half a day of honest thought, not a fortnight of anxiety', true],
          ['As long as it takes to feel certain', false],
          ['A conversation with several people in the industry', false],
          ['A full review of every direction available', false]],
        'You are choosing a first job, and not choosing it irrevocably.'),
    ],
  },
];
