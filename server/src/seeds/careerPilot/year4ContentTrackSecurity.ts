/**
 * The Cybersecurity specialization track — sixteen units. Module P12.
 *
 * ── WHAT THIS TRACK IS, AND THE ONE IT IS NOT ─────────────────────────────────────────────
 *
 * Secure development and application security. Finding weaknesses in software before somebody
 * else does, fixing them at the layer that closes a class, and writing findings other developers
 * can act on.
 *
 * It is not offensive security as a performance. A placement candidate is hired to make software
 * safer, and the questions asked are about whether they can review code adversarially, reason
 * about trust boundaries, and communicate a finding without antagonising the person who has to
 * fix it. Tool names are trivia; the reasoning is the direction.
 *
 * ── THE THING THAT SEPARATES THIS DIRECTION FROM THE SECURITY DAY IN P03 ──────────────────
 *
 * P03 taught every student to validate at the right layer, enforce access control on the server
 * and keep secrets out of repositories. This track is the depth past that: modelling what an
 * attacker wants before enumerating weaknesses, sweeping for a CLASS rather than patching an
 * instance, and reviewing code for one weakness at a time rather than reading it for everything
 * at once.
 *
 * Attribution: T4_SECURITY_DEPTH defaults to THREAT_MODELING with the classes unit on WEB_SECURITY
 * and the interview question on SECURITY_FUNDAMENTALS; T4_SECURITY_BUILD to SECURE_CODING with
 * identity on AUTHENTICATION and the fault on AUTHORIZATION; T4_SECURITY_QUALITY to WEB_SECURITY
 * with the review unit on CODE_REVIEW and the drill on LOGGING_DIAGNOSTICS; T4_SECURITY_PROOF to
 * THREAT_MODELING.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_SECURITY_BUNDLES: PilotBundle[] = [
  /* ══ T4_SECURITY_DEPTH ══════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_SECURITY_DEPTH_WHAT_AN_ATTACKER_WANTS',
    notes: `**Assets, entry points and trust boundaries — before any list of vulnerabilities is
useful.**

## Why modelling comes first

**A list of weaknesses with no model is unordered.** You cannot say which matters without knowing
what is worth taking and who can reach it, and an unordered list is how a security review produces
forty findings that nobody prioritises.

## The three questions

**What is worth taking here?** Personal data, money, credentials, the ability to act as somebody
else, the ability to disrupt. Name them specifically — "the system" is not an asset.

**Where does data enter and leave?** Endpoints, file uploads, third-party callbacks, message
queues, and anything an administrator pastes in. Those are the entry points.

**Who is trusted, and how much?** An anonymous visitor, a signed-in user, an administrator,
another service, a background job. **Each is a different level**, and the boundaries between them
are where the interesting failures live.

## Trust boundaries, concretely

**A boundary is anywhere data crosses from a less-trusted context to a more-trusted one.** The
browser to your server. A third-party webhook to your handler. A file upload to your parser.

**Every boundary needs a decision:** what is validated here, and what is still not trusted after
it.

## What the model gives you

**An ordering.** The weakness reachable by an anonymous user on a path to personal data outranks
the one requiring administrator access to exploit.

**And a stopping condition.** Without a model, a review continues until the reviewer is tired.

## The common beginner error

**Starting from a checklist of attack names.** It produces findings that are technically present
and unranked, and it misses anything not on the list — which is most of what is specific to this
application.`,
    mcqs: [
      mcq('A list of weaknesses with no model is unordered, which is how a security review produces:',
        [['Forty findings that nobody prioritises', true],
         ['Findings that are technically incorrect', false],
         ['Duplicate reports of the same weakness', false],
         ['Recommendations the team cannot implement', false]],
        'Severity depends on what is reachable and what it protects, so without a model there is no basis for ranking and the report cannot be acted on.'),
      mcq('A trust boundary is anywhere data crosses from a less-trusted context to:',
        [['A more-trusted one', true],
         ['A different service in the system', false],
         ['Persistent storage of any kind', false],
         ['A component owned by another team', false]],
        'The direction of the trust change is what makes it a boundary, because that is where unvalidated input gains authority it did not previously have.'),
    ],
    checkpoint: [
      mcq('Starting from a checklist of attack names misses anything not on the list, which is:',
        [['Most of what is specific to this application', true],
         ['A small proportion of real vulnerabilities', false],
         ['Covered by automated scanning tools anyway', false],
         ['Only relevant for unusual system designs', false]],
        'Generic lists capture generic weaknesses. The business logic flaws unique to an application appear on no checklist and are frequently the most serious.'),
      mcq('Without a threat model, a review continues until:',
        [['The reviewer is tired', true],
         ['Every endpoint has been examined once', false],
         ['The scanning tools report no further issues', false],
         ['The allocated time for the review expires', false]],
        'There is no criterion for sufficiency, so coverage is decided by attention rather than by whether the assets and boundaries have been addressed.'),
    ],
  },
  {
    unitCode: 'T4_SECURITY_DEPTH_CLASSES_NOT_CASES',
    notes: `**Vulnerability classes, not individual bugs** — and why fixing the reported instance
fixes almost nothing.

## The reasoning

**A reported weakness is the one somebody happened to test.** The same pattern was used elsewhere,
by the same author, on the same day, with the same assumption.

**So the report is a starting point rather than the scope**, and treating it as the scope is the
single most common failure in a junior security response.

## The classes worth carrying

**Injection.** Anywhere input becomes part of a query, a command, a template or a path.

**Broken access control.** Anywhere an object is loaded by an identifier the caller supplies.

**Exposure.** Secrets, stack traces, verbose errors, debug modes, directory listings.

**Trusting the client.** A price, a role, a total, an owner id that arrived in the request and was
not re-derived.

**Insecure defaults.** Something left as it shipped: a default credential, an open permission, a
sample configuration.

## Sweeping

**Search for the construction, not the symptom.** For injection: every place a query is built from
a string. For access control: every endpoint taking an identifier. For exposure: every error path
that returns detail.

**The search is mechanical and finds every instance**, including the ones nobody has tested.

## Then remove the class

**A parameterised query helper. A scoped load. An error handler that returns a fixed shape.**

**Making the unsafe version hard to write is worth more than fixing every current instance**,
because the instances are finite and the future writing is not.

## Why this is the direction's core idea

**Every other unit in this track applies it.** Build closes classes, quality sweeps for them,
and the proof is a finding written so that somebody else can close one.`,
    mcqs: [
      mcq('A reported weakness is the one somebody happened to test, and the same pattern was used elsewhere by:',
        [['The same author, with the same assumption', true],
         ['A different team with different conventions', false],
         ['An automated tool generating similar code', false],
         ['Developers who copied the reported example', false]],
        'Code written in one session shares its assumptions, so a weakness in one place is strong evidence of siblings written alongside it.'),
      mcq('Making the unsafe version hard to write is worth more than fixing every current instance because the instances are finite and:',
        [['The future writing is not', true],
         ['The fixes may introduce new defects', false],
         ['Some instances cannot be located reliably', false],
         ['The class may change as the code evolves', false]],
        'Each fix addresses code that exists. A structural change governs everything written afterwards, which is unbounded.'),
    ],
    checkpoint: [
      mcq('Sweeping means searching for the construction rather than the symptom, so for access control you search for:',
        [['Every endpoint taking an identifier', true],
         ['Every endpoint that requires authentication', false],
         ['Every query that filters on a user column', false],
         ['Every place a permission check is performed', false]],
        'The vulnerable shape is loading an object by a caller-supplied identifier, so enumerating those finds every place the check could be missing.'),
      mcq('Treating a report as the scope rather than as a starting point is described as the most common failure in:',
        [['A junior security response', true],
         ['An automated vulnerability scan', false],
         ['A penetration testing engagement', false],
         ['A code review by a senior developer', false]],
        'Closing the ticket is the natural instinct, and it leaves every unreported instance of the same class in place.'),
    ],
  },
  {
    unitCode: 'T4_SECURITY_DEPTH_PRACTICE',
    notes: `**Modelling and classifying an application you did not build.**

## The drill

**An unfamiliar application, thirty minutes.** Produce:

**The assets**, named specifically. Not "data" — which data, and why somebody would want it.

**The entry points**, enumerated. Endpoints, uploads, callbacks, anything an administrator pastes.

**The trust levels**, and the boundaries between them.

**Two classes you would sweep for first**, with the reason drawn from the model rather than from a
generic list.

## The second half

**Sweep for one of them** and report every instance, not the first.

**The count is the output.** "One reported, six found" is the shape of a useful result, and it is
the shape that distinguishes somebody who understands the class from somebody who can reproduce a
report.

## What good looks like

**Your ordering follows from your model.** Somebody reading it can see why one class was swept
before the other, and the reason refers to this application rather than to received wisdom.

## Why thirty minutes

**Because a model that takes a day does not get made.** The version that survives real conditions
is the one producible in half an hour, and it is sufficient — most of the value is in having asked
the three questions at all.`,
    mcqs: [
      mcq('"One reported, six found" is the shape of a useful result because it distinguishes somebody who understands the class from somebody who can:',
        [['Reproduce a report', true],
         ['Use an automated scanning tool', false],
         ['Read the application’s source code', false],
         ['Write a fix for the reported case', false]],
        'Reproducing a finding requires following instructions. Locating the unreported siblings requires understanding what makes the pattern vulnerable.'),
      mcq('A threat model that takes a day does not get made, so the version that survives real conditions is:',
        [['The one producible in half an hour', true],
         ['The one maintained by a dedicated team', false],
         ['The one generated from the architecture diagram', false],
         ['The one required by the compliance process', false]],
        'Practicality decides whether it happens at all, and most of the value comes from having asked the three questions rather than from exhaustiveness.'),
    ],
    checkpoint: [
      mcq('Naming assets specifically means not "data" but:',
        [['Which data, and why somebody would want it', true],
         ['The database tables that store the records', false],
         ['The volume of data held by the system', false],
         ['The retention period applied to each type', false]],
        'Motivation determines what an attacker pursues, so an asset stated without it provides no basis for ranking the weaknesses that reach it.'),
      mcq('Your ordering follows from your model when a reader can see why one class was swept first and the reason refers to:',
        [['This application rather than received wisdom', true],
         ['The severity ratings in a published standard', false],
         ['The frequency of the class in the industry', false],
         ['The ease of fixing the instances discovered', false]],
        'A generic justification would apply to any system, so it does not explain the prioritisation for this one and cannot be checked against it.'),
    ],
  },
  {
    unitCode: 'T4_SECURITY_DEPTH_INTERVIEW_QUESTION',
    notes: `**"How would you secure this system?"** — described in a few sentences, and you have
ten minutes.

## The answer that separates immediately

**Do not list attacks.** "SQL injection, XSS, CSRF" is trivia that shows you have read about
security and says nothing about whether you could find or fix anything.

**Model, then controls.**

**What is worth taking here?** **Where does data enter and leave?** **Who is trusted, and how
much?**

**Then the controls follow from the model**, and you will be naming the right ones rather than the
memorised ones — and the interviewer can watch the reasoning produce them.

## The follow-ups

**"Which would you do first?"** Prioritise by impact rather than by ease. Broken access control
before a missing security header, every time, and being explicit that the header is cheap and
prevents little.

**"What would you not bother with?"** Judgement about cost is scored here, and few candidates
volunteer anything.

**"How would you convince a team to prioritise this?"** A cost argument: it is a defect class, it
affects a defined group completely, and it is cheapest at the point of writing. **Not a moral
argument**, which teams have heard and which does not compete with a deadline.

## The trap

**Proposing encryption for everything.** It sounds thorough and answers a question nobody asked.
Most real failures are access control and validation, and encryption helps with neither.

## The version about your own project

**Name something you got wrong and fixed.** "I was trusting the price from the client" beats any
list, because it shows you have read your own work adversarially and found something. **"It is
secure" is the worst available answer**, because nothing is and the claim shows you have not
looked.`,
    mcqs: [
      mcq('Proposing encryption for everything is a trap because most real failures are access control and validation, which encryption:',
        [['Helps with neither of', true],
         ['Addresses only at rest rather than in transit', false],
         ['Makes harder to detect when they occur', false],
         ['Prevents only for authenticated requests', false]],
        'Encrypted data returned to the wrong authenticated user is still exposed, and encrypted input that is unvalidated is still injected.'),
      mcq('A cost argument beats a moral one for prioritisation because a moral argument:',
        [['Does not compete with a deadline', true],
         ['Is likely to be disputed by the team', false],
         ['Applies only where regulation requires it', false],
         ['Suggests the speaker lacks technical depth', false]],
        'Teams already agree with it. Framing the issue as a defect class that is cheapest to fix now is what changes its position in a backlog.'),
    ],
    checkpoint: [
      mcq('"It is secure" is the worst available answer about your own project because nothing is, and the claim shows you have:',
        [['Not looked', true],
         ['Relied on the framework’s protections', false],
         ['Misunderstood the scope of the question', false],
         ['Tested only the paths you built yourself', false]],
        'Anybody who has examined their own work adversarially has found something, so an unqualified claim is evidence the examination did not happen.'),
      mcq('Being explicit that a security header is cheap and prevents little demonstrates prioritisation by:',
        [['Impact rather than by ease', true],
         ['Compliance with a published standard', false],
         ['The likelihood of each attack occurring', false],
         ['The effort required from the development team', false]],
        'Cheap fixes are attractive precisely because they are cheap, and saying so while ranking them low shows the ordering is driven by consequence.'),
    ],
  },

  /* ══ T4_SECURITY_BUILD ══════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_SECURITY_BUILD_BUILDING_THE_CONTROL',
    notes: `**Parameterisation, server-side authorisation and output encoding — done once, at the
right layer.**

## The principle

**Prefer making something impossible to making it forbidden.** A filter can be bypassed; a
structure cannot.

## Injection: parameterise, do not escape

**Escaping quotes before concatenating is an attempt to out-think an attacker at string
manipulation**, and it has failed publicly many times.

**A parameterised query never lets the value become part of the statement**, so nothing it
contains can change what the statement means. **That is a structural guarantee rather than a
filter.**

**The same reasoning applies elsewhere:** command arguments passed as a list rather than a string,
template values rendered rather than concatenated, file paths resolved and checked rather than
joined.

## Access control: scope the load

**Loading an object and then checking ownership is a step somebody can omit on a new endpoint.**

**Loading it scoped to the caller makes the wrong answer unreachable.** There is no separate check
to forget, which is why this is the version that survives a team and a deadline.

## Output encoding: contextual, and by default

**The same string is escaped differently in HTML, in an attribute, in a URL and in JavaScript.**

**A framework that escapes by default is doing the right thing**, and every one of them has an
explicit opt-out — which is exactly where injection appears. Searching for that opt-out is a
five-minute sweep with a high hit rate.

## Fail closed

**When a check cannot be completed — the permission service is unavailable, the token cannot be
verified — deny.** A control that fails open converts an outage into an exposure, and that is a
decision that must be made deliberately rather than inherited from a default.`,
    mcqs: [
      mcq('A parameterised query is a structural guarantee rather than a filter because the value:',
        [['Never becomes part of the statement', true],
         ['Is escaped before it is interpolated', false],
         ['Is validated against an expected pattern', false],
         ['Is rejected when it contains a quote mark', false]],
        'The statement is fixed before the value is supplied, so nothing the value contains can alter the structure that was already parsed.'),
      mcq('A control that fails open converts:',
        [['An outage into an exposure', true],
         ['A slow request into a failed one', false],
         ['A denied request into an audit entry', false],
         ['A misconfiguration into a hard failure', false]],
        'When the check cannot run and access is granted anyway, the unavailability of a dependency becomes unauthorised access rather than a refusal.'),
    ],
    checkpoint: [
      mcq('Searching for a templating framework’s escaping opt-out is a five-minute sweep with a high hit rate because that opt-out is:',
        [['Exactly where injection appears', true],
         ['Used in most of the templates written', false],
         ['Undocumented in the framework guides', false],
         ['Required for any dynamic content at all', false]],
        'Escaping by default protects everywhere except where a developer explicitly disabled it, so the disabled sites are the candidate vulnerabilities.'),
      mcq('Scoping the load is the version that survives a team and a deadline because there is:',
        [['No separate check to forget', true],
         ['Less code to write for each endpoint', false],
         ['A clearer error returned to the caller', false],
         ['One fewer database query to execute', false]],
        'A discrete check depends on somebody remembering it on every new path. A scoped query makes the unsafe result unreachable by construction.'),
    ],
  },
  {
    unitCode: 'T4_SECURITY_BUILD_IDENTITY_DONE_RIGHT',
    notes: `**Authentication, session handling, and the token that was valid for rather too
long.**

## Storing credentials

**A password is hashed with a slow algorithm designed for passwords.** Never encrypted — which is
reversible — and never a fast general-purpose hash, which is what makes offline cracking cheap.

**This is settled.** The only question is which of the two or three correct choices you use, and a
candidate who proposes anything else has revealed a gap.

**Salting is automatic in any correct choice**, and per-user, so two identical passwords do not
produce identical stored values.

## Sessions and tokens

**A session is a server-side record**; revoking it is deleting the record.

**A token carries its claims and is verified by signature**; nothing is consulted, which is why it
scales and why revoking it before expiry is the hard problem.

**Short expiry is the control**, with a longer-lived refresh token that IS looked up — scale on the
common path, revocation where it matters.

## What a token must not contain

**Anything secret.** The payload is encoded, not encrypted. Signing prevents alteration and
provides no confidentiality, and anybody holding it can read every claim.

## Where it is stored

**A token in browser local storage is readable by any script on the page, including an injected
one.** A cookie with the appropriate flags is not readable by script, at the cost of needing
protection against cross-site request forgery.

**Neither is simply correct**, and being able to state the trade is the interview answer.

## The failures worth knowing

**No rate limit on login**, which makes credential stuffing free. **A password reset token that
does not expire or is not single-use.** **An account enumeration difference** — "no such user"
against "wrong password" — which tells an attacker which accounts exist.`,
    mcqs: [
      mcq('A password must not be encrypted because encryption is:',
        [['Reversible, so the plaintext can be recovered', true],
         ['Slower than hashing for the same input', false],
         ['Unable to handle inputs of variable length', false],
         ['Dependent on a key that must be rotated', false]],
        'Anybody obtaining the key obtains every password. Hashing is deliberately one-way so there is no key whose compromise reveals them.'),
      mcq('Responding "no such user" rather than "wrong password" tells an attacker:',
        [['Which accounts exist on the system', true],
         ['How the passwords are being stored', false],
         ['Whether the account has been locked out', false],
         ['The format the username must follow', false]],
        'The difference in response enumerates valid accounts, which narrows a credential attack to addresses known to be registered.'),
    ],
    checkpoint: [
      mcq('A token in browser local storage is readable by any script on the page, including an injected one, while a cookie with the right flags is not readable by script at the cost of:',
        [['Needing protection against cross-site request forgery', true],
         ['Being unavailable to single-page applications', false],
         ['Requiring the token to be refreshed more often', false],
         ['Preventing the token from carrying any claims', false]],
        'Cookies are attached automatically by the browser, which is what removes script access and simultaneously enables forged cross-site requests.'),
      mcq('Short expiry is the control for tokens because revoking one before expiry is hard, given that verification consults:',
        [['Nothing, which is why it scales', true],
         ['A cache that may hold a stale entry', false],
         ['The signing key, which cannot be rotated', false],
         ['A list that grows with every issued token', false]],
        'Self-contained verification means no server-side state is checked, so there is nowhere to record that a particular token is no longer valid.'),
    ],
  },
  {
    unitCode: 'T4_SECURITY_BUILD_MINI_PROJECT',
    notes: `**One class, swept across a real codebase you did not write, and closed
structurally.**

## Why this rather than hardening a vulnerable application

**P03 already did that**, and every student has. Finding planted bugs in a deliberately weak
application teaches the classes exist. **It does not teach the thing this direction is for**,
which is establishing how many instances of one class a real codebase contains and removing the
ability to write the next one.

## The brief

**Pick one class.** Injection, unscoped object loads, unescaped output, trusted client values, or
insecure defaults. **One**, for the whole exercise.

**Pick a real codebase.** An open-source project of meaningful size, or a substantial piece of your
own earlier work. Not a teaching application.

**Sweep it.** Name the construction, search for it mechanically, and enumerate every hit.

## Triage every hit, including the safe ones

**For each: vulnerable, or safe, and why.**

**The safe ones are part of the output**, not noise. An unexplained absence looks like an
oversight, and the next reviewer will ask the same question about the same line.

## Then close the class

**Propose the structural change** that makes the unsafe version hard to write: a query helper that
only accepts parameters, a repository that requires a caller, an output path with no unescaped
option.

**And say what it would cost** — the migration, the friction, what it forbids that was legitimate.
A structural proposal with no stated cost is not a proposal.

## What to submit

**The class, the search you used, the full hit list with triage, the structural proposal and its
cost.**

**And the counts**: how many hits, how many vulnerable, how many safe. **"Forty-one hits, six
vulnerable, one helper proposed" is the shape of a real security contribution**, and it is a
different artefact from anything P03 produced.

## If you find nothing vulnerable

**Submit it anyway.** A clean sweep with triage is a real result and is reported as one — it says
the codebase handles that class well, which is information. **Inventing a finding to have
something to report is the failure mode**, and it is worth naming because the pressure to find
something is real.`,
    assignment: {
      title: 'One class, swept and closed',
      description: 'Sweep a real codebase for a single vulnerability class, triage every hit including the safe ones, and propose a structural fix with its cost.',
      instructions: `**Pick one vulnerability class** — injection, unscoped object loads,
unescaped output, trusted client values, or insecure defaults — and **one real codebase**. An
open-source project of meaningful size, or substantial earlier work of your own. Not a teaching
application: P03 already covered hardening a deliberately weak one, and repeating it teaches
nothing this direction is for.

**Sweep it mechanically.** Name the construction, search for it, and enumerate every hit.

**Triage every hit, including the safe ones**, with the reason. The safe ones are part of the
output — an unexplained absence looks like an oversight, and the next reviewer asks the same
question about the same line.

**Then propose the structural change** that makes the unsafe version hard to write, **and state
what it would cost**: the migration, the friction, what it forbids that was legitimate. A
structural proposal with no stated cost is not a proposal.

**Submit:** the class, the exact search you used, the full hit list with triage, the structural
proposal and its cost, and the counts — hits, vulnerable, safe.

**If you find nothing vulnerable, submit it anyway.** A clean sweep with triage is a real result
and says the codebase handles that class well. Inventing a finding to have something to report is
the failure mode, and the pressure to do it is real.`,
      rubric: [
        { criterion: 'The sweep is mechanical and complete', description: 'A named construction and an exact search, with every hit enumerated rather than a selection of interesting ones.', maxPoints: 30 },
        { criterion: 'Safe hits triaged with reasons', description: 'Non-vulnerable hits appear in the output with an explanation, so the absence of a finding is accounted for.', maxPoints: 25 },
        { criterion: 'A structural proposal', description: 'The fix makes the unsafe version hard to write rather than correcting the instances found.', maxPoints: 25 },
        { criterion: 'The cost of the proposal is stated', description: 'Migration effort, added friction and legitimate uses it would forbid are named rather than omitted.', maxPoints: 20 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('Safe hits belong in the output because an unexplained absence:',
        [['Looks like an oversight to the next reviewer', true],
         ['Makes the hit count appear artificially low', false],
         ['Prevents the search from being reproduced', false],
         ['Suggests the class was chosen incorrectly', false]],
        'Without the reasoning, a later sweep re-investigates the same lines, so the work is repeated rather than accumulated across reviews.'),
      mcq('A structural proposal with no stated cost is not a proposal because the reader cannot:',
        [['Weigh it against the work it would displace', true],
         ['Verify that it closes the class completely', false],
         ['Determine which instances it would fix first', false],
         ['Tell whether the search was exhaustive enough', false]],
        'Anything structural competes with other work for time, and a recommendation without its price cannot be scheduled or argued with.'),
      mcq('Inventing a finding when a sweep comes back clean is named as the failure mode because the pressure to find something is:',
        [['Real, and a clean sweep is itself a result', true],
         ['Lower than students generally expect it to be', false],
         ['Only present in commercial engagements', false],
         ['Removed by choosing a larger codebase', false]],
        'A triaged clean sweep says the codebase handles that class well, which is information; a manufactured finding is worse than none.'),
    ],
  },
  {
    unitCode: 'T4_SECURITY_BUILD_DEBUGGING',
    notes: `**The bypass.** A control that looks present and is not enforced.

## The shape

**The code contains a check.** The check runs. And there is a path that reaches the protected thing
without passing through it.

**Nothing fails, nothing errors, and a reviewer reading the handler sees a permission check and
moves on.**

## The five bypasses

**A second route to the same handler.** One is protected by middleware and the other is not,
because it was added later or registered differently.

**A check on the wrong thing.** Verifying the user is authenticated and never checking whether
this object is theirs.

**Client-side only.** The button is hidden and the endpoint is open.

**An ordering error.** The object is loaded and acted upon before the check runs, so a side effect
has already happened when the denial is returned.

**A case the check does not cover.** It handles the identifier as a number, and a string, an
array or a null takes a different path through the code.

## Finding them

**Work backwards from the protected resource**, not forwards from the check. **Enumerate every
route that reaches it** — every handler, every job, every internal caller — and ask what protects
each.

**Forwards from the check you find the paths that are protected**, which tells you nothing.

## The structural fix

**Make the protected resource unreachable except through the check.** A scoped query, a
repository that requires a caller, a single entry point. **Then a new route cannot bypass what it
cannot avoid.**`,
    mcqs: [
      mcq('Working forwards from the check rather than backwards from the resource tells you nothing because it finds:',
        [['The paths that are already protected', true],
         ['Only the routes registered in the same file', false],
         ['Checks that are duplicated unnecessarily', false],
         ['The order in which middleware is applied', false]],
        'Following the check shows where it applies. The vulnerability is by definition a path where it does not, which that direction cannot reach.'),
      mcq('An ordering error means the object is loaded and acted upon before the check runs, so when the denial is returned:',
        [['A side effect has already happened', true],
         ['The caller receives a misleading status code', false],
         ['The transaction has already been committed', false],
         ['The audit log records a successful access', false]],
        'The protected action completed before authorisation was evaluated, so refusing afterwards does not undo what the request achieved.'),
    ],
    checkpoint: [
      mcq('The structural fix is making the protected resource unreachable except through the check, so that a new route:',
        [['Cannot bypass what it cannot avoid', true],
         ['Must be registered with the middleware layer', false],
         ['Is rejected until a permission is configured', false],
         ['Inherits the checks from its parent route', false]],
        'If every path to the resource passes through the enforcing construct, a route added later has no way to reach it unprotected.'),
      mcq('A check that handles the identifier as a number can be bypassed when the caller supplies:',
        [['A string, an array or a null instead', true],
         ['A number outside the expected range', false],
         ['An identifier belonging to another user', false],
         ['The same identifier in a repeated request', false]],
        'A different type takes a different path through comparison and coercion, which can produce a result the check never anticipated.'),
    ],
  },
  {
    unitCode: 'T4_SECURITY_BUILD_INTERVIEW_QUESTION',
    notes: `**"Here is some code. What is wrong with it?"**

## What is being assessed

**Not whether you spot the planted bug** — most candidates do. **Whether you find the class, ask
about what you cannot see, and report it in a way a developer would act on.**

## The sequence

**Read for the trust boundary first.** Where does untrusted input enter this code, and what
happens to it?

**Name the class**, not just the instance. "This is concatenated into a query" is the instance;
"anywhere queries are built from strings" is the class, and saying both is the answer.

**Ask what you cannot see.** "Is this the only route to this handler?" "Is there middleware above
this?" "Where does this identifier come from?" **Asking these is a strong signal**, because a real
review never has the whole system in front of it.

**Then the fix, at the right layer.** Parameterise rather than escape. Scope the load rather than
check afterwards.

## The follow-ups

**"How would you find the others?"** The mechanical search. Name what you would grep for.

**"How would you stop it recurring?"** A helper that makes the safe path the easy path, and the
observation that a fix relying on vigilance has a short half-life.

**"How would you report this?"** Impact, reproduction, class, fix. And without contempt for the
author — **how somebody talks about absent developers is a reliable preview of how they will talk
about present colleagues**, and interviewers listen for it.

## What loses marks

**Listing every minor issue with equal weight.** A missing header reported alongside an
authentication bypass, in the same tone, shows that severity is not being assessed — which is most
of the job.`,
    mcqs: [
      mcq('Asking "is this the only route to this handler?" is a strong signal because a real review:',
        [['Never has the whole system in front of it', true],
         ['Is conducted under significant time pressure', false],
         ['Requires sign-off from the original author', false],
         ['Covers only the files that have been changed', false]],
        'Reviewing a fragment means the surrounding protections are unknown, so establishing what cannot be seen is part of reaching a correct conclusion.'),
      mcq('Reporting a missing header alongside an authentication bypass in the same tone shows that:',
        [['Severity is not being assessed', true],
         ['The review was performed too quickly', false],
         ['The reviewer is unfamiliar with the codebase', false],
         ['An automated tool produced the findings', false]],
        'Equal weighting means no judgement was applied, and prioritising by consequence is most of what the role contributes.'),
    ],
    checkpoint: [
      mcq('How somebody talks about absent developers is described as a reliable preview of how they will talk about:',
        [['Present colleagues', true],
         ['The systems they are asked to review', false],
         ['Their own earlier work in an interview', false],
         ['Findings that turn out to be incorrect', false]],
        'Review is a recurring interaction, and contempt directed at an absent author signals how the same reviewer will behave in a disagreement.'),
      mcq('Saying that a fix relying on vigilance has a short half-life supports proposing:',
        [['A helper that makes the safe path the easy path', true],
         ['A code review checklist for the whole team', false],
         ['An automated scan on every pull request', false],
         ['Documentation describing the correct pattern', false]],
        'Removing the friction from the safe option changes behaviour durably, whereas discipline decays as teams change and deadlines approach.'),
    ],
  },

  /* ══ T4_SECURITY_QUALITY ════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_SECURITY_QUALITY_REVIEWING_FOR_A_CLASS',
    notes: `**Sweeping a codebase for every instance of one weakness**, rather than reading it for
everything at once.

## Why one class at a time

**Reading for everything means holding every pattern in mind simultaneously**, and attention
degrades within minutes. The result is thorough at the start of a file and cursory by the end.

**One class means one pattern**, which is mechanical, repeatable and complete — and you can do
five passes in the time one exhaustive read would take, with better coverage on each.

## The pass

**Name the construction.** Query built from a string. Object loaded by identifier. Output rendered
unescaped. Value taken from the request and trusted.

**Search for it**, not for the symptom. The search finds instances nobody has tested.

**Triage each hit.** Some are safe — the input is a constant, the value was already re-derived.
Recording why a hit is safe matters, because the next reviewer asks the same question.

**Then the structural fix**, once, for all of them.

## What to record

**A list per class:** every hit, whether it is vulnerable, and why. **The safe ones are part of
the output**, not noise to be discarded — an unexplained absence looks like an oversight.

## Automated tools

**They find the mechanical instances and miss everything about business logic.** An access control
flaw where the check is present and checks the wrong thing is invisible to every scanner and
obvious to a reviewer with the model in mind.

**Use them for the sweep and do not mistake a clean report for an absence of weaknesses**, which
is the most common misuse.

## Why this is the direction's daily work

**Most of the job is reading code somebody else wrote, looking for something specific.** This is
that, made into a repeatable procedure.`,
    mcqs: [
      mcq('Reading for everything at once produces a review that is thorough at the start of a file and:',
        [['Cursory by the end', true],
         ['Duplicated across several passes', false],
         ['Focused on the most recent changes', false],
         ['Biased towards the classes you know best', false]],
        'Holding every pattern in mind simultaneously degrades attention within minutes, so coverage falls as the read continues.'),
      mcq('Recording why a hit is safe matters because:',
        [['The next reviewer asks the same question', true],
         ['The tool will report it again on each run', false],
         ['Safe hits may become unsafe after changes', false],
         ['The count of hits is used as a metric', false]],
        'Without the reasoning, every subsequent sweep re-investigates the same sites, and the work is repeated rather than accumulated.'),
    ],
    checkpoint: [
      mcq('An access control flaw where the check is present and checks the wrong thing is invisible to every scanner because it is:',
        [['A business logic question rather than a pattern', true],
         ['Located outside the files that are scanned', false],
         ['Dependent on runtime state that is not analysed', false],
         ['Written using a construction tools do not parse', false]],
        'The code is structurally correct and semantically wrong, and correctness of meaning cannot be determined without knowing what should be protected.'),
      mcq('Mistaking a clean automated report for an absence of weaknesses is described as:',
        [['The most common misuse of the tools', true],
         ['Acceptable for low-risk applications only', false],
         ['A limitation of the free scanning tools', false],
         ['Reasonable when the codebase is small', false]],
        'Scanners cover mechanical patterns. Treating their silence as assurance omits exactly the logic flaws that require human judgement.'),
    ],
  },
  {
    unitCode: 'T4_SECURITY_QUALITY_HARDER_FAULT',
    notes: `**An application that passes every scan it has and is still exploitable.**

## Why these survive

**Scanners match patterns.** These are failures of logic, of sequence, or of assumption — and none
of them looks unusual in the code.

## The five

**Business logic abuse.** Every step is authorised individually and the sequence achieves something
nobody intended: applying a discount twice, cancelling after fulfilment, refunding more than was
paid.

**A race condition.** Two concurrent requests both pass a check that assumed exclusivity, and the
balance is spent twice.

**An insecure direct object reference behind a valid check.** The permission is verified for the
account and the identifier belongs to another one.

**Mass assignment.** A request body applied wholesale to a record, letting a caller set a role, an
owner or a balance.

**A trusted internal path.** A service that authenticates external callers and trusts anything
arriving from inside the network, which stops being safe the moment anything inside is
compromised.

## Finding them

**Model the sequence, not the request.** Ask what a determined user could achieve by combining
authorised actions, repeating one, or performing them out of order.

**And ask what each check assumes** — exclusivity, ordering, the caller's identity matching the
object, the body containing only what was intended.

## The one that is hardest

**Business logic abuse**, because there is no vulnerable pattern to find. Every line is correct.
Only somebody who understands what the system is *for* can see that the sequence produces a result
the business would refuse, which is why this class is the clearest argument that automated
scanning is not a substitute for a reviewer.`,
    mcqs: [
      mcq('Business logic abuse is the hardest class to find because there is:',
        [['No vulnerable pattern to search for', true],
         ['No way to reproduce it consistently', false],
         ['No record of the sequence in the logs', false],
         ['No single owner of the affected code', false]],
        'Every step is individually authorised and correctly implemented, so the fault exists only in the combination and not in any line of code.'),
      mcq('A race condition in this context means two concurrent requests both pass a check that assumed:',
        [['Exclusivity', true],
         ['The caller was already authenticated', false],
         ['The values had been validated upstream', false],
         ['The database would serialise the writes', false]],
        'The check reads a state and acts on it, and with no lock both requests observe the pre-action state and both proceed.'),
    ],
    checkpoint: [
      mcq('A service that trusts anything arriving from inside the network stops being safe the moment:',
        [['Anything inside is compromised', true],
         ['The network is expanded to a second site', false],
         ['An external caller is granted internal access', false],
         ['The authentication service becomes unavailable', false]],
        'Internal position is treated as proof of legitimacy, so a single compromised internal component inherits unrestricted access to everything.'),
      mcq('The technique for this class is to model the sequence rather than the request, asking what a determined user could achieve by combining authorised actions, repeating one, or:',
        [['Performing them out of order', true],
         ['Sending them from several accounts', false],
         ['Supplying values outside the valid range', false],
         ['Issuing them faster than the rate limit', false]],
        'Order is an assumption the individual checks rarely state, so an unexpected sequence frequently reaches a state the design never considered.'),
    ],
  },
  {
    unitCode: 'T4_SECURITY_QUALITY_PRACTICE',
    notes: `**Reviewing, testing and hardening without being told what to look for.**

## The drill

**An application, no report, thirty minutes.** Findings ordered by impact.

## The security review checklist

**Where does untrusted input enter, and what happens to it at each boundary?**

**Is every object load scoped to the caller, on every route that reaches it?**

**Is any value from the request trusted rather than re-derived — a price, a role, an owner?**

**Does any error path return detail an attacker could use?**

**Is any credential or secret in the repository, the logs, or a client bundle?**

**What could a determined user achieve by repeating or reordering authorised actions?**

**What does each check assume, and is the assumption guaranteed?**

Seven questions, twenty minutes, any application.

## Ordering the findings

**By impact and reachability.** Anonymous access to personal data outranks an authenticated user
reaching another's non-sensitive record, which outranks a missing header.

**Students order by how certain they are**, which puts the trivially confirmable above the serious
and uncertain.

## Writing it up

**Impact, reproduction, class, fix.** And without contempt for the author, which costs nothing and
determines whether the finding is received or resisted.

## Why this is the practice unit

**Because reviewing unfamiliar code for something specific is the job**, and the only way to make
the seven questions habitual is to apply them until they stop needing to be read.`,
    mcqs: [
      mcq('Findings should be ordered by impact and reachability, so anonymous access to personal data outranks:',
        [['An authenticated user reaching another’s non-sensitive record', true],
         ['A missing security header on every response', false],
         ['A verbose error revealing the framework version', false],
         ['A credential committed to a private repository', false]],
        'Both reachability and consequence are higher, so it is the finding most likely to be exploited and most damaging when it is.'),
      mcq('Ordering findings by certainty puts:',
        [['The trivially confirmable above the serious and uncertain', true],
         ['Automated results above manual observations', false],
         ['Recent code ahead of older parts of the system', false],
         ['Findings with a known fix before those without', false]],
        'Confidence correlates with simplicity rather than with consequence, so an easily demonstrated minor issue outranks a probable major one.'),
    ],
    checkpoint: [
      mcq('Writing findings without contempt for the author costs nothing and determines whether the finding is:',
        [['Received or resisted', true],
         ['Assigned to the correct team member', false],
         ['Reproduced successfully by the developer', false],
         ['Included in the final report to management', false]],
        'The person who must act on it decides how readily to do so, and a finding that reads as an attack invites defence rather than repair.'),
      mcq('The only way to make the seven questions habitual is to apply them until they:',
        [['Stop needing to be read', true],
         ['Produce the same findings each time', false],
         ['Can be delegated to an automated tool', false],
         ['Cover every class in the taxonomy used', false]],
        'A checklist consulted from a document is a process; one recalled without prompting is a habit, and only repetition makes the transition.'),
    ],
  },
  {
    unitCode: 'T4_SECURITY_QUALITY_INTERVIEW_QUESTION',
    notes: `**"You find a serious vulnerability in production. Walk me through what you do."**

## Why this is the quality question for the direction

**Because it is mostly not technical.** The finding is the easy part; what follows is judgement
about disclosure, urgency, blast radius and other people, and that is what the role actually
requires.

## The sequence

**Confirm it.** Reproduce reliably before reporting. A false alarm at high urgency costs
credibility you will need later.

**Assess the blast radius.** What is reachable, by whom, and is there evidence it has been
exploited already.

**Report it through the right channel, privately.** Not a public issue, not a group chat, not a
demonstration on production data.

**Help fix it.** Propose the structural fix, not just the patch.

**Then the sweep.** Other instances of the class.

**Then the write-up.** What would have caught it, and what changes.

## The follow-ups

**"What if nobody responds?"** Escalate within the organisation, with a record of what was
reported and when. Not publicly, and not by proving the point on live data.

**"What if it is somebody else's code and they disagree?"** Establish whether it is a fact question
or a judgement one. Facts are settled by a reproduction.

**"What if you found it in a third-party product?"** Coordinated disclosure: report privately,
allow time, agree a timeline.

## The line to be clear about

**Access no more data than is necessary to confirm it**, and never data belonging to real people
beyond that. **A candidate who describes enumerating real records to prove the point has answered
the question badly** regardless of the technical merit, and it is a reliable way to end a process.

## What loses marks

**Treating the technical finding as the whole answer.** It is the first step of seven.`,
    mcqs: [
      mcq('Confirming a vulnerability before reporting matters because a false alarm at high urgency costs:',
        [['Credibility you will need later', true],
         ['Time that the team cannot recover', false],
         ['The opportunity to find the real issue', false],
         ['Access to the environment being tested', false]],
        'Future reports are weighted by the accuracy of previous ones, so an unconfirmed escalation reduces the response to the next genuine finding.'),
      mcq('A candidate who describes enumerating real records to prove the point has answered badly:',
        [['Regardless of the technical merit', true],
         ['Unless the system is a test environment', false],
         ['Only if the data was personally identifiable', false],
         ['Where the organisation had not authorised it', false]],
        'Accessing more real data than confirmation requires is a judgement failure that the technical correctness of the finding does not offset.'),
    ],
    checkpoint: [
      mcq('If nobody responds to a report, the escalation path is within the organisation with a record of what was reported and when — and specifically not:',
        [['Publicly, or by proving the point on live data', true],
         ['Through a manager outside the security team', false],
         ['In writing, which creates a discoverable record', false],
         ['Before a reasonable period has been allowed', false]],
        'Public disclosure and live demonstration both increase harm to users, which is the outcome the report was intended to prevent.'),
      mcq('This question is mostly not technical because the finding is the easy part and what follows is judgement about disclosure, urgency, blast radius and:',
        [['Other people', true],
         ['The tooling used to confirm it', false],
         ['The cost of the remediation work', false],
         ['Which standard the issue violates', false]],
        'Every subsequent step involves somebody else — who is told, how, and how they are likely to respond — which is the substance of the role.'),
    ],
  },

  /* ══ T4_SECURITY_PROOF ══════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_SECURITY_PROOF_ADVANCED_CHALLENGE',
    notes: `**A finding somebody can act on: impact, reproduction, fix and severity, written for a
developer who has to prioritise it.**

## Why the write-up is the artefact

**Because a finding nobody acts on has achieved nothing**, and the difference between a finding
that is fixed and one that is deprioritised is almost entirely how it was written.

**This is the direction's deliverable.** Other tracks produce systems; this one produces a document
that changes what somebody else does.

## What it must contain

**A title that states the impact**, not the mechanism. "Any user can read another user's invoices"
rather than "IDOR in the invoice endpoint".

**The impact, concretely.** What an attacker gets, in terms the reader recognises. Not a severity
label — the consequence.

**A reproduction** that works, minimal, with the exact request. **If the reader cannot reproduce
it, it will be disputed rather than fixed.**

**The class**, so the reader knows to look elsewhere.

**Every instance you found.**

**The fix, at the right layer**, with the structural version alongside the immediate one.

**And what would have prevented it being written.**

## Tone

**Written for somebody who has to schedule it against other work**, and who did not intend to
write a vulnerability. No contempt, no rhetorical questions, no implied incompetence.

## The severity question

**Justify it.** Reachability, what is exposed, and whether authentication is required. A severity
asserted without reasoning is the first thing a developer disputes, and disputing it is how the
finding stalls.

## What to submit

**One finding, written properly**, from your own hardening work — and a note on what you cut from
the first draft, because the first draft is always too long and too technical for its reader.`,
    assignment: {
      title: 'A finding somebody can act on',
      description: 'Write one security finding properly — impact, reproduction, class, every instance, and a structural fix — for a developer who has to prioritise it.',
      instructions: `Take one real finding from your own hardening work and write it for a
developer who has to schedule it against other work and did not intend to write a vulnerability.

**The title states the impact, not the mechanism**: "Any user can read another user's invoices"
rather than "IDOR in the invoice endpoint".

**Include:** the impact in concrete terms the reader recognises rather than a severity label; a
minimal reproduction with the exact request, because **if the reader cannot reproduce it, it will
be disputed rather than fixed**; the class, so they know to look elsewhere; every instance you
found; the fix at the right layer with the structural version alongside the immediate one; and
what would have prevented it being written at all.

**Justify the severity** by reachability, what is exposed, and whether authentication is required.
A severity asserted without reasoning is the first thing a developer disputes, and disputing it is
how a finding stalls.

**No contempt, no rhetorical questions, no implied incompetence.**

**Submit:** the finding, and a note on what you cut from the first draft — the first draft is
always too long and too technical for its reader.`,
      rubric: [
        { criterion: 'Impact stated for the reader', description: 'The title and opening describe what an attacker achieves in concrete terms rather than naming a vulnerability class.', maxPoints: 25 },
        { criterion: 'Reproduction that works', description: 'A minimal, exact reproduction the reader could follow without asking a question.', maxPoints: 25 },
        { criterion: 'Class, instances and structural fix', description: 'The finding generalises beyond the instance and proposes a fix that closes the class.', maxPoints: 30 },
        { criterion: 'Tone and justified severity', description: 'Written without contempt, with the severity reasoned from reachability and exposure.', maxPoints: 20 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('If the reader cannot reproduce a finding, it will be:',
        [['Disputed rather than fixed', true],
         ['Escalated to a security specialist', false],
         ['Scheduled behind confirmed issues', false],
         ['Closed automatically after a period', false]],
        'Without a working reproduction the developer has only an assertion, and the reasonable response is to question it rather than to act.'),
      mcq('The direction’s deliverable is a document that changes what somebody else does, where other tracks produce:',
        [['Systems', true],
         ['Measurements of their own work', false],
         ['Evidence of operational responsibility', false],
         ['Designs defended against alternatives', false]],
        'Security work is realised through somebody else fixing something, so the written finding is the point at which the capability has an effect.'),
    ],
  },
  {
    unitCode: 'T4_SECURITY_PROOF_SPECIALIZATION_INTERVIEW',
    notes: `**A full interview on application security alone.**

## Where it starts

**Something you found.** In your own work or somebody else's. They are establishing that you have
actually looked at code adversarially rather than read about doing so.

## Where it goes

**"How did you find it?"** A method, not luck. The class, the search, the sweep.

**"How many others were there?"** The sweep question, asked to see whether the instance was treated
as the scope.

**"How would you fix it so it cannot be written again?"** Structural, not a patch.

**"Here is some code."** Trust boundary, class, what you cannot see, fix.

**"You find something serious in production."** Confirm, assess, report privately, help fix, sweep,
write up — and the line about accessing no more real data than confirmation requires.

**"How would you secure this system?"** Model first, controls second.

**"The team says it is not worth fixing."** The cost argument, and accepting that the decision may
not be yours while making sure it is recorded.

## The depth markers

**Modelling before listing.** **Sweeping rather than patching.** **A finding written for a
developer rather than for a scoreboard.** Each is rare and each signals somebody who has
contributed to a fix rather than only to a report.

## The failure mode

**Performing.** Attack names, tool names, and an enthusiasm for breaking things with no
corresponding interest in what happens afterwards. **A placement candidate is hired to make
software safer**, and the round is built to distinguish that from the appearance of it.

## How to prepare

**Three stories: something you found and swept, something you fixed structurally, and a finding
you had to persuade somebody to act on.** The third is rare and is closest to the actual job.`,
    mcqs: [
      mcq('"How many others were there?" is asked to see whether:',
        [['The instance was treated as the scope', true],
         ['The candidate used an automated scanner', false],
         ['The application was unusually vulnerable', false],
         ['The search covered the whole codebase', false]],
        'Reporting one fix reveals that the class was not swept, which is the difference between closing a ticket and removing a capability.'),
      mcq('The failure mode this round is built to distinguish is performing — attack names, tool names and enthusiasm for breaking things with no corresponding interest in:',
        [['What happens afterwards', true],
         ['The underlying protocol details', false],
         ['The legal constraints on testing', false],
         ['How the vulnerabilities were introduced', false]],
        'A placement candidate is hired to make software safer, which is realised in the fix and the sweep rather than in the discovery.'),
    ],
    checkpoint: [
      mcq('Of the three stories to prepare, the rare one closest to the actual job is:',
        [['A finding you had to persuade somebody to act on', true],
         ['Something you found and then swept fully', false],
         ['Something you fixed structurally rather than patched', false],
         ['A vulnerability discovered in a third-party product', false]],
        'Security work takes effect only when somebody else changes something, so persuasion is where the capability meets its actual constraint.'),
      mcq('When a team says a finding is not worth fixing, the approach is the cost argument and accepting the decision may not be yours while:',
        [['Making sure it is recorded', true],
         ['Escalating it to a senior manager', false],
         ['Re-testing it after the next release', false],
         ['Publishing it internally for visibility', false]],
        'A recorded decision means the risk was accepted knowingly, which is legitimate, and leaves evidence if the consequence later arrives.'),
    ],
  },
  {
    unitCode: 'T4_SECURITY_PROOF_CHECKPOINT',
    notes: `**Whether security capability is demonstrable.**

## What the track asked for

**Modelling** — assets, entry points and trust boundaries before any list of weaknesses.

**Closing classes** — parameterisation, scoped loads, contextual encoding, structural fixes.

**Sweeping** — every instance of one class, including the safe ones and why.

**Communicating** — a finding written so that somebody who did not intend to write a vulnerability
will act on it.

## The bar

**The first and the last are the direction.** Finding a planted bug is an exercise; modelling an
unfamiliar system and writing a finding that gets fixed is the job.

## What a reviewer looks at

**The sweep count.** "One reported, six found, one helper added" is the single most convincing
line in a security portfolio, and almost nobody has it.

**The written finding**, because it is the artefact the role actually produces.

## If this does not pass

**The usual gap is patching rather than sweeping.** The student found the issues and fixed the
instances, and no class was closed and no structural change was made. **That is a week** — go back
through each finding, search for the construction, and add one helper — and the week produces the
line a reviewer is looking for.

## What this feeds

**Mock 5** on security depth, which opens with something you found. **The portfolio**, where the
written finding and the sweep count are the two pieces worth showing. **P14's production project**,
whose security requirement expects a control you can name and defend rather than a checklist you
followed.`,
    checkpoint: [
      mcq('The two parts of the track that constitute the direction are modelling an unfamiliar system and:',
        [['Writing a finding that gets fixed', true],
         ['Closing a vulnerability class structurally', false],
         ['Sweeping for every instance of a class', false],
         ['Finding a planted bug in a review exercise', false]],
        'The middle two are craft. Assessing an unknown system and causing somebody else to act are what the role contributes that nothing else does.'),
      mcq('"One reported, six found, one helper added" is the single most convincing line in a security portfolio because it shows:',
        [['A class was removed rather than an instance patched', true],
         ['The application was thoroughly vulnerable', false],
         ['An automated tool was used effectively', false],
         ['The work took a substantial amount of time', false]],
        'It evidences the sweep and the structural fix together, which is the pattern that distinguishes security engineering from bug fixing.'),
      mcq('When this checkpoint does not pass, the usual gap is patching rather than sweeping, meaning the student fixed the instances and:',
        [['No class was closed and no helper was added', true],
         ['The findings were never written up properly', false],
         ['The threat model was produced after the fixes', false],
         ['The severity ordering was not justified at all', false]],
        'Each fix addressed one site, leaving the construction available to be written again, which is what the structural change prevents.'),
      mcq('P14’s security requirement expects a control you can name and defend rather than:',
        [['A checklist you followed', true],
         ['A scan report with no findings', false],
         ['Encryption applied across the system', false],
         ['A threat model produced at the start', false]],
        'The production project asks for a deliberate control with a reason, which requires understanding what it prevents rather than that it was recommended.'),
    ],
  },
];
