/**
 * T2_TRACK_SECURITY — eleven units. Year 2, direction track.
 *
 * ── THE BOUNDARY THIS TRACK KEEPS ─────────────────────────────────────────────────────────
 *
 * The universal secure coding topic taught every student to defend what they build. This track goes
 * further, into finding weaknesses on purpose — and that means the law and the ethics are not an
 * appendix. Every practical unit is bounded to systems the student owns or has written permission
 * for, and the final teaching unit is about authorisation, scope and disclosure.
 *
 * The content teaches recognition, assessment and defence. It does not provide attack tooling
 * recipes, and where a technique is named it is named so the student can find it in their own
 * system and close it.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const SECURITY_TRACK_BUNDLES: PilotBundle[] = [
  {
    unitCode: 'T2_TRACK_SECURITY_ATTACKER_VIEW',
    notes: `Security work starts by mapping what could be attacked, which is a wider set than most
people expect.

**The attack surface is everywhere untrusted input meets your system:**

- Every endpoint, including the ones nobody documented
- Every form field, URL parameter and header
- File uploads
- Third-party libraries and services
- The admin panel, which is usually weaker than the main application
- Staging and test environments, which are usually much weaker
- Everybody with credentials, and everybody who can obtain them

**Old and forgotten things are where the weaknesses live.** A subdomain from a project two years
ago, a staging environment with production data and no password, an API version nobody removed, a
backup file left in a web directory. Nobody is maintaining them, which is exactly why they are found
first.

**Map value as well as surface.** Not every entry point leads somewhere worth going. Ask what sits
behind each: personal data, money, credentials, or the ability to reach something else. A
vulnerability on a static marketing page is not the same finding as one on a login endpoint, and
treating them alike wastes everyone's time.

**Think in chains.** Real compromises are rarely one flaw. An information leak reveals a username; a
weak reset lets you take the account; that account can reach an internal tool; the internal tool runs
as an administrator. Each step alone looks minor, which is why each was left unfixed.

**Which is why "low severity" needs care.** A finding is low severity in isolation; its value to an
attacker is what it enables next.

**Assume breach.** Design as though something will eventually be compromised, and ask what that
gives somebody. Least privilege, segmentation and monitoring all follow from this one assumption
rather than from a list of rules.

**And the first principle of this track, which is not negotiable: you map what you are authorised to
map.** Scanning, probing or enumerating a system you do not own and have no written permission for is
a crime in most countries, including India under the Information Technology Act. The final unit
covers this properly; it applies from this one onward.`,
    mcqs: [
      mcq('The weakest parts of an organisation\'s surface are usually:',
        [['Old systems nobody maintains', true],
          ['The main production application', false],
          ['Third-party integrations', false],
          ['Recently deployed services', false]],
        'A staging environment, a forgotten subdomain, an old API version.'),
      mcq('Mapping value alongside surface matters because:',
        [['Not every entry point is worth reaching', true],
          ['It reduces the number of findings', false],
          ['Surface alone cannot be enumerated', false],
          ['Value determines the tooling used', false]],
        'A static page is not a login endpoint.'),
      mcq('Real compromises usually involve:',
        [['A chain of small findings', true],
          ['A single critical vulnerability', false],
          ['An insider with credentials', false],
          ['A zero-day exploit', false]],
        'Each step alone looked minor, which is why it was left.'),
      mcq('"Assume breach" means designing so that:',
        [['A compromise gives an attacker little', true],
          ['Breaches are detected immediately', false],
          ['Every system is isolated completely', false],
          ['Recovery is possible from backups', false]],
        'Least privilege, segmentation and monitoring follow from it.'),
    ],
    checkpoint: [
      mcq('A low-severity finding should be assessed by:',
        [['What it enables next', true],
          ['Its score in isolation', false],
          ['How easy it is to fix', false],
          ['How long it has existed', false]],
        'Chains are made of findings nobody prioritised.'),
      mcq('Mapping may only be performed against:',
        [['Systems you own or have written permission for', true],
          ['Any publicly reachable system', false],
          ['Systems where no damage would occur', false],
          ['Your own organisation\'s systems generally', false]],
        'A crime in most countries, including under India\'s IT Act.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_SECURITY_NETWORK_SECURITY',
    notes: `Understanding what travels over a network, who can see it, and what encryption actually
protects.

**Data in transit is visible to everything on the path** unless it is encrypted: the wifi access
point, the internet provider, every router between, and anybody who has positioned themselves in the
middle. That is why HTTPS everywhere is not a preference.

**What TLS gives you, precisely:**

| Property | Means |
|---|---|
| **Confidentiality** | The contents cannot be read |
| **Integrity** | They cannot be altered undetected |
| **Authentication** | The server is who the certificate says |

**What it does not give you:** any assurance that the server is trustworthy, protection once the
data arrives, or concealment of which host you connected to.

**The certificate is the authentication half**, and it only works because your device trusts a set of
authorities. A device with an extra authority installed — a corporate laptop, or one where somebody
installed a profile — can have its traffic decrypted legitimately by whoever added it. That is how
interception proxies work, and it is why a certificate warning should never be clicked through.

**Ports and services.** Every listening port is an entry point, and the useful question about any
machine is what is listening, why, and who can reach it. On your own systems:

    ss -tlnp        # what is listening here

**A database or admin interface reachable from the internet is the finding you will make most often**
in real systems, and it is almost always an oversight rather than a decision.

**Segment the network.** A web server that can reach the database is necessary; a web server that can
reach every internal machine turns one compromise into all of them. Allow what is needed and deny the
rest, in both directions.

**Public wifi is a hostile network**, and the correct assumption is that somebody is watching. A VPN
moves the trust rather than removing the need for it — you are now trusting the VPN provider instead
of the café, which is an improvement only if they deserve it more.

**Denial of service is a category rather than a flaw**, and defending it is about capacity, rate
limiting and providers who absorb it. This course does not cover conducting one; it is illegal, it is
not testing, and no legitimate engagement includes it.`,
    mcqs: [
      mcq('TLS provides confidentiality, integrity and:',
        [['Authentication of the server', true],
          ['Trustworthiness of the operator', false],
          ['Protection of the data after arrival', false],
          ['Concealment of the destination host', false]],
        'The certificate proves identity, not good intentions.'),
      mcq('A device with an extra certificate authority installed:',
        [['Its traffic can be decrypted by them', true],
          ['Is protected against interception', false],
          ['Rejects all untrusted certificates', false],
          ['Cannot use TLS at all', false]],
        'Which is why a certificate warning should never be clicked through.'),
      mcq('The commonest network finding in real systems is:',
        [['A database reachable publicly', true],
          ['Weak TLS cipher configuration', false],
          ['Missing network segmentation', false],
          ['An outdated protocol version', false]],
        'Almost always an oversight rather than a decision.'),
      mcq('Network segmentation limits:',
        [['One compromise becoming all of them', true],
          ['The volume of traffic between hosts', false],
          ['The need for encryption internally', false],
          ['The number of listening ports', false]],
        'Allow what is needed and deny the rest, both ways.'),
    ],
    checkpoint: [
      mcq('Using a VPN on public wifi:',
        [['Moves the trust to the VPN provider', true],
          ['Removes the need to trust anybody', false],
          ['Encrypts traffic that was not already', false],
          ['Protects against a malicious server', false]],
        'An improvement only if they deserve it more than the café.'),
      mcq('Conducting a denial of service attack is:',
        [['Illegal, and never part of an engagement', true],
          ['Acceptable with client permission', false],
          ['A standard part of penetration testing', false],
          ['Permitted against your own systems only', false]],
        'Defending against it is capacity, rate limiting and providers.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_SECURITY_WEB_VULNERABILITIES',
    notes: `The same small set of weaknesses appears in system after system. Recognising them is most
of web application security.

**Broken access control** is consistently the most common. A user reaching another user's data by
changing an id; a normal user reaching an admin endpoint by guessing the URL; a permission checked in
the interface and not on the server. You met this in the backbone; in this track you look for it
systematically, and it is the first thing to test.

**Injection** — SQL, command, template, LDAP. One shape: data treated as code. The fix is always the
same, and it is always a mechanism that keeps them separate rather than filtering.

**Cross-site scripting** — user content rendered as markup. Stored XSS, which runs for every viewer
including administrators, is the serious variant.

**Cross-site request forgery** — another site causing an authenticated request from your browser.
\`SameSite\` cookies and anti-forgery tokens are the defences, and modern browser defaults have
reduced but not removed it.

**Security misconfiguration** — default credentials, directory listing enabled, debug mode on in
production, verbose errors, an admin panel with no restriction. Individually dull and collectively
responsible for an enormous share of real incidents.

**Vulnerable components** — a known flaw in a library, published and searchable, with scanners
looking for anybody still running the old version.

**Server-side request forgery** — the application fetching a URL the user supplied, which can be
turned toward internal addresses that are not otherwise reachable.

**Insecure deserialisation** and **XML external entities** are worth recognising by name, both
arising from parsing untrusted input with something more capable than the task requires.

**The pattern underneath most of them: trusting something you should not.** The client's input, the
client's claim about who they are, a library, a configuration default, or a URL somebody supplied.

**Learn these on deliberately vulnerable applications**, of which several well-known ones exist for
exactly this purpose. They are legal to attack, designed to teach, and the right place to see each of
these working rather than described.`,
    mcqs: [
      mcq('The most common category of web vulnerability is:',
        [['Broken access control', true],
          ['Injection', false],
          ['Cross-site scripting', false],
          ['Security misconfiguration', false]],
        'And it is the first thing to test.'),
      mcq('Security misconfiguration is significant because it is:',
        [['Individually dull, collectively costly', true],
          ['Difficult to detect without tooling', false],
          ['Limited to older systems', false],
          ['Usually chained with injection', false]],
        'Default credentials, debug mode, verbose errors, an open admin panel.'),
      mcq('Server-side request forgery turns the application into:',
        [['A way to reach internal addresses', true],
          ['A proxy for external traffic', false],
          ['A denial of service amplifier', false],
          ['A credential store', false]],
        'It fetches a URL the user supplied.'),
      mcq('The pattern underneath most of these vulnerabilities is:',
        [['Misplaced trust', true],
          ['Insufficient encryption', false],
          ['Missing input length limits', false],
          ['Outdated framework versions', false]],
        'Input, identity claims, libraries, defaults, supplied URLs.'),
    ],
    checkpoint: [
      mcq('These should be practised on:',
        [['Deliberately vulnerable applications built for it', true],
          ['Live sites with a responsible disclosure policy', false],
          ['Your college\'s systems', false],
          ['Any system where no damage occurs', false]],
        'Several well-known ones exist for exactly this purpose.'),
      mcq('Stored XSS is the serious variant because it:',
        [['It runs for every viewer', true],
          ['Cannot be removed from the database', false],
          ['Bypasses Content Security Policy', false],
          ['Executes on the server', false]],
        'Administrator sessions are worth most.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_SECURITY_AUTH_ATTACKS',
    notes: `The login is the front door, and attacking it does not usually mean breaking the password
hashing. It means everything around it.

**Credential stuffing** is the dominant real attack: taking username and password pairs from somebody
else's breach and trying them elsewhere, because people reuse passwords. It requires no cleverness,
it works at scale, and it is why rate limiting and breached-password checks matter more than
complexity rules.

**The defences that actually work:**

- Rate limiting per account **and** per source
- Checking new passwords against known-breached lists
- Multi-factor authentication, which defeats stuffing almost entirely
- Alerting the user to a login from somewhere new
- Detecting many failures across many accounts, which is the signature of stuffing

**Username enumeration.** A login that says "no such user" for one email and "wrong password" for
another has told an attacker which accounts exist. The same applies to registration, to password
reset, and to timing — a response that is measurably faster for an unknown user leaks the same
information.

**Password reset is often the weakest part of the system.** A predictable token, a token that does
not expire, a token that can be reused, a reset that does not invalidate existing sessions, or a
"security question" whose answer is on somebody's public profile. Reset flows receive far less
attention than logins and are frequently the easier route.

**Session handling.** A session that never expires, one that survives a password change, an
identifier that does not rotate after login, or a token that remains valid after logout because
logout only cleared the client. Each is a real and common finding.

**Multi-factor, honestly assessed.** SMS codes are better than nothing and vulnerable to SIM swap;
an authenticator application is considerably better; a hardware key is the strongest and resists
phishing. Recommend accordingly rather than treating all three as equivalent.

**Account lockout is a trade.** Locking after five failures stops guessing and hands anybody a way to
lock out every user by trying five passwords each. Progressive delays and per-source limits usually
serve better.

**Assess a login by asking:** what does it tell an attacker, what stops automation, what happens to
sessions on a password change, and how does somebody recover an account — which is usually where the
real weakness is.`,
    mcqs: [
      mcq('Credential stuffing works because:',
        [['People reuse passwords across sites', true],
          ['Password hashing is often weak', false],
          ['Rate limits are rarely implemented', false],
          ['Sessions do not expire', false]],
        'It requires no cleverness and works at scale.'),
      mcq('A login that distinguishes "no such user" from "wrong password":',
        [['Reveals which accounts exist', true],
          ['Improves the user experience safely', false],
          ['Is required for accessibility', false],
          ['Only matters for admin accounts', false]],
        'Timing differences leak the same information.'),
      mcq('The weakest part of an authentication system is often:',
        [['The password reset flow', true],
          ['The password hashing', false],
          ['The session cookie flags', false],
          ['The login rate limiting', false]],
        'It receives far less attention than the login.'),
      mcq('Account lockout after five failures:',
        [['Hands anybody a way to lock out every user', true],
          ['Is the strongest available defence', false],
          ['Prevents credential stuffing entirely', false],
          ['Has no downside if the threshold is high', false]],
        'Progressive delays and per-source limits usually serve better.'),
    ],
    checkpoint: [
      mcq('Among multi-factor methods, the strongest against phishing is:',
        [['A hardware security key', true],
          ['An authenticator application', false],
          ['SMS codes', false],
          ['Email verification links', false]],
        'SMS is better than nothing and vulnerable to SIM swap.'),
      mcq('A logout that only clears the client leaves:',
        [['A token still valid on the server', true],
          ['A session that expires normally', false],
          ['No practical weakness', false],
          ['A cookie that cannot be reused', false]],
        'A real and common finding.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_SECURITY_TOOLING',
    notes: `Tools find things quickly and confidently, including things that are not there. Reading
their output critically is the skill that separates a security engineer from somebody running a
scanner.

**The categories**, used only on systems you own or are authorised to test:

- **Network scanners** — what hosts exist and what is listening
- **Web scanners** — automated probing for common weaknesses
- **Intercepting proxies** — view and modify requests from your own browser
- **Dependency scanners** — known vulnerabilities in your libraries
- **Static analysis** — patterns in source code
- **Secret scanners** — credentials in a repository or its history

**Dependency and secret scanning belong in every project**, security track or not. They are cheap,
run in CI, and catch real problems continuously.

**False positives are the normal case.** A scanner reports a pattern, not an exploit. "Possible SQL
injection" on a parameterised query is common, and reporting it without verification wastes a
developer's day and costs you credibility you will need later.

**False negatives matter more.** A clean scan means the scanner found nothing it knows how to look
for. It says nothing about logic flaws, broken access control between two specific users, or a
business rule that can be bypassed — which are exactly where the serious findings are, and none of
them are automatable.

**Verify every finding manually before reporting it.** Reproduce it, record the request and the
response, and establish what it actually allows. A finding without a demonstration is a guess with a
severity label.

**The intercepting proxy is the most useful tool in this list**, because it lets you see and modify
exactly what your browser sends. Most access control testing is: take a request, change one value,
send it as a different user, observe.

**Tune before you run.** A scanner at full intensity can take down a fragile application, which on an
authorised test is an incident you caused, and on an unauthorised one is considerably worse.

**And the boundary again, because tools make it easy to cross accidentally:** point them only at
systems you own or have written permission for. A scanner aimed at an address you typed wrongly is
still unauthorised access, and "I did not mean to" is not a defence anywhere.`,
    mcqs: [
      mcq('A scanner reporting "possible SQL injection" on a parameterised query is:',
        [['A false positive, which is the normal case', true],
          ['A finding worth reporting immediately', false],
          ['Evidence the parameters are misused', false],
          ['A configuration error in the scanner', false]],
        'Reporting it unverified wastes a day and costs credibility.'),
      mcq('A clean automated scan means:',
        [['It found nothing it knows to look for', true],
          ['The application is secure', false],
          ['Only low-severity issues remain', false],
          ['Manual testing is unnecessary', false]],
        'Logic flaws and access control are not automatable.'),
      mcq('The most useful tool for access control testing is:',
        [['An intercepting proxy', true],
          ['A network scanner', false],
          ['A static analyser', false],
          ['A dependency scanner', false]],
        'Take a request, change one value, send it as another user.'),
      mcq('Running a scanner at full intensity risks:',
        [['Taking down a fragile application', true],
          ['Producing more false negatives', false],
          ['Exceeding the licence terms', false],
          ['Missing authenticated endpoints', false]],
        'On an authorised test, an incident you caused.'),
    ],
    checkpoint: [
      mcq('Which tools belong in every project regardless of track?',
        [['Dependency and secret scanning in CI', true],
          ['Network and web scanners', false],
          ['Intercepting proxies', false],
          ['Static analysis of every file', false]],
        'Cheap, continuous, and they catch real problems.'),
      mcq('A scanner pointed at a mistyped address is:',
        [['Still unauthorised access', true],
          ['Excusable as an accident', false],
          ['Harmless if nothing was found', false],
          ['A civil rather than criminal matter', false]],
        '"I did not mean to" is not a defence anywhere.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_SECURITY_HARDENING',
    notes: `Finding a weakness is half the work. Closing it at the root, rather than blocking the one
input that demonstrated it, is the other half.

**Fix the cause, not the symptom.** A filter that rejects the payload from your proof of concept
leaves the flaw and removes the evidence. Parameterise the query. Add the server-side ownership
check. Escape on output. Each of those removes the category.

**The layers, and something at each:**

| Layer | Hardening |
|---|---|
| Network | Only necessary ports open; databases unreachable publicly; segmentation |
| Host | Patched, non-root services, minimal packages, automatic updates |
| Application | Validation, parameterised queries, output escaping, authorisation |
| Data | Encrypted at rest, minimal retention, backups tested |
| People | Least privilege, multi-factor, access reviewed when somebody leaves |

**Secure defaults matter more than documentation.** A system where the safe configuration is the one
you get without doing anything protects everybody, including the person who deploys it in a hurry
next year. Documentation protects only those who read it.

**Remove rather than protect.** An endpoint nobody uses, a library nobody imports, a subdomain for a
finished project, an account for somebody who left. Deleting is the most reliable hardening there is,
and it never needs patching afterwards.

**Rate limit everything that can be automated**: login, reset, search, anything expensive. It is the
single control that blunts the widest range of attacks.

**Fix by severity, and be honest about severity.** What it exposes, how easily, to whom. A minor
finding that opens a chain outranks a scarier-sounding one that leads nowhere — and inflating
severity to get something fixed destroys your credibility for the finding that genuinely matters.

**Verify every fix with the original proof.** A fix you have not re-tested is a belief. Re-run the
exact request; it should now fail, and you should keep the evidence of both states.

**Add the regression test.** The same flaw returns in a rewrite six months later unless something
checks for it automatically.

**And write down what you accepted.** Some risks are not worth the cost of fixing now, and that is a
legitimate decision when it is made deliberately, recorded, and revisited — rather than forgotten.`,
    mcqs: [
      mcq('Blocking the specific payload from your proof of concept:',
        [['It leaves the flaw, minus the evidence', true],
          ['Is an acceptable temporary fix', false],
          ['Addresses the root cause', false],
          ['Is standard defence in depth', false]],
        'Parameterise, check ownership, escape on output.'),
      mcq('Secure defaults are preferred to documentation because:',
        [['They protect whoever deploys in a hurry', true],
          ['Documentation becomes outdated', false],
          ['Defaults cannot be changed', false],
          ['They are required by standards', false]],
        'Documentation protects only those who read it.'),
      mcq('The most reliable form of hardening is:',
        [['Removing what is not needed', true],
          ['Patching promptly', false],
          ['Adding monitoring', false],
          ['Restricting network access', false]],
        'Deleted things never need patching.'),
      mcq('Inflating a finding\'s severity to get it fixed:',
        [['It costs you the finding that matters', true],
          ['Is a reasonable tactic under pressure', false],
          ['Is standard in vulnerability reporting', false],
          ['Has no lasting consequence', false]],
        'Severity is what it exposes, how easily, to whom.'),
    ],
    checkpoint: [
      mcq('Before a fix can be considered closed, you must:',
        [['Re-run the original proof', true],
          ['Document the change in the runbook', false],
          ['Scan the whole application again', false],
          ['Notify everybody who was affected', false]],
        'A fix you have not re-tested is a belief.'),
      mcq('A risk you decide not to fix should be:',
        [['Recorded deliberately and revisited', true],
          ['Left undocumented to avoid disclosure', false],
          ['Escalated until it is fixed', false],
          ['Treated as closed', false]],
        'Accepted is legitimate; forgotten is not.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_SECURITY_INCIDENTS',
    notes: `Something has already happened. What you do in the first hour determines what can be
learned, recovered and proved afterwards.

**The stages:** detect, contain, eradicate, recover, learn.

**Detection is usually somebody noticing something odd** — a login from an unexpected country, a
support ticket about a charge nobody made, a file that appeared, a server that is busy at night.
Automated detection helps; most real incidents start with a person.

**Contain before you investigate.** Stop the harm spreading: isolate the affected system, revoke the
compromised credentials, block the source, disable the account. Containment is not the fix; it is the
tourniquet.

**Preserve the evidence, and this is where people cause irreversible damage.** The instinct is to
clean up — delete the file, reinstall, restart the machine. Every one of those destroys what an
investigator needs, and volatile evidence disappears the moment a machine is powered off.

**Before changing anything, capture:** the logs, from every relevant system, copied somewhere safe;
a disk image if you can take one; what is running and what is connected; and a timeline of what was
noticed when, and by whom.

**Then a written timeline, from the beginning.** Who did what, when, with times. Memory is unreliable
within hours, and the timeline is what the analysis, the report and any legal process all rest on.

**Assume the attacker may still be present**, and be careful about discussing the incident on systems
that may be compromised — including the company chat.

**Eradicate properly.** Remove the access, close the flaw that allowed it, and check for what was
left behind: added accounts, changed keys, scheduled tasks, modified code. A restored system with the
same hole is an incident about to repeat.

**Recovery means verified clean**, not merely running. Restore from a backup taken before the
compromise, patch, rotate every credential that could have been exposed, and watch closely
afterwards.

**Notification is often a legal obligation**, with timeframes, when personal data is involved. Know
that it exists, and know that it is not your decision alone — escalate to whoever is accountable.

**And the blameless review**, which matters most. What happened, how, what allowed it, and what
changes. A culture that punishes the person who clicked the link produces people who hide the next
one.`,
    mcqs: [
      mcq('Containment comes before investigation because it:',
        [['It stops the harm spreading', true],
          ['Preserves the evidence', false],
          ['Identifies the attacker', false],
          ['Restores service fastest', false]],
        'It is the tourniquet, not the fix.'),
      mcq('The instinct to clean up immediately is damaging because:',
        [['It destroys the evidence an investigator needs', true],
          ['It alerts the attacker', false],
          ['It breaches notification requirements', false],
          ['It prevents restoring from backup', false]],
        'Volatile evidence disappears when a machine is powered off.'),
      mcq('A written timeline matters because:',
        [['Memory is unreliable within hours', true],
          ['Regulations require a specific format', false],
          ['It replaces the log evidence', false],
          ['It assigns responsibility clearly', false]],
        'The analysis, the report and any legal process rest on it.'),
      mcq('After eradication you must check for:',
        [['Added accounts and scheduled tasks', true],
          ['Performance degradation', false],
          ['Unpatched dependencies only', false],
          ['Configuration drift', false]],
        'A restored system with the same hole repeats the incident.'),
    ],
    checkpoint: [
      mcq('Discussing an active incident on company chat is risky because:',
        [['The attacker may still have access', true],
          ['It creates a discoverable record', false],
          ['It slows the response', false],
          ['It breaches confidentiality rules', false]],
        'Assume they may still be present.'),
      mcq('A culture that punishes whoever clicked the link produces:',
        [['People who hide the next one', true],
          ['More careful employees', false],
          ['Faster incident detection', false],
          ['Better security training outcomes', false]],
        'Which is why the review is blameless.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_SECURITY_LAW_AND_ETHICS',
    notes: `This is the unit that makes the rest of the track legitimate. Everything before it
describes capability; this describes what makes exercising it lawful.

**The line is authorisation, and nothing else.** The same action — sending a request that reveals a
flaw — is professional work with written permission and a criminal offence without it. Not the
intent, not the outcome, not whether damage occurred. The permission.

**In India, the Information Technology Act, 2000** makes unauthorised access to a computer system an
offence, with provisions covering access, downloading data, and introducing anything harmful.
Penalties include imprisonment. Similar laws exist in nearly every country, and the consequences
begin long before a conviction: a police complaint, a suspension, a withdrawn offer.

**"I was only looking" is not a defence.** Neither is "I did not cause damage", "the system was
insecure", "I intended to report it", or "I found it by accident and kept going".

**What authorisation actually looks like:** written, specific and from somebody with authority to
give it. Naming the systems in scope, the time window, the techniques permitted and excluded, and a
contact if something breaks. Verbal permission from somebody who does not own the system is not
authorisation.

**A bug bounty or responsible disclosure policy is an authorisation**, and its scope is exactly what
the policy states. Read it. Testing a domain the policy does not list is unauthorised even when
everything else is in scope, and that is a distinction people have been prosecuted over.

**Stay inside scope even when the boundary is inconvenient.** Finding something interesting that
leads outside scope means stopping and asking, not following it.

**Minimise what you access.** Proving a flaw exists does not require downloading a database. One
record, redacted in your report, demonstrates the same thing and is the difference between a
professional finding and unauthorised data access.

**Responsible disclosure when you find something unbidden:** report privately to the owner, give them
reasonable time to fix it, do not publicise details in the meantime, and never demand payment —
which is extortion regardless of how it is phrased.

**Write findings professionally:** what it is, how to reproduce it, what it allows, how severe and
why, and how to fix it. Clear, factual, and without embellishment.

**And the career point.** This field runs on trust. Everybody hiring in security asks about
judgement, and one unauthorised test — even a curious one, even as a student — follows you. The
technical skills are learnable by many people; being somebody who can be trusted with access is the
scarcer qualification.`,
    mcqs: [
      mcq('What separates legitimate security testing from a criminal offence is:',
        [['Written authorisation', true],
          ['The absence of damage', false],
          ['The intent to report', false],
          ['The severity of the finding', false]],
        'Not intent, not outcome — the permission.'),
      mcq('A bug bounty policy authorises testing of:',
        [['Exactly the systems the policy lists', true],
          ['Any system the organisation owns', false],
          ['Anything reachable from a listed domain', false],
          ['Whatever is not explicitly excluded', false]],
        'A distinction people have been prosecuted over.'),
      mcq('Proving a flaw exists should involve:',
        [['Accessing the minimum needed to demonstrate it', true],
          ['Downloading enough data to prove impact', false],
          ['Full exploitation to assess severity', false],
          ['Testing every affected record', false]],
        'One record, redacted, shows the same thing.'),
      mcq('Demanding payment for a vulnerability you found unbidden is:',
        [['Extortion, however it is phrased', true],
          ['Standard practice for independent researchers', false],
          ['Acceptable if a bounty programme exists', false],
          ['A civil matter between the parties', false]],
        'Report privately, allow time, do not publicise.'),
    ],
    checkpoint: [
      mcq('Finding something interesting that leads outside scope means:',
        [['Stopping and asking', true],
          ['Documenting it and continuing', false],
          ['Following it if no damage results', false],
          ['Reporting it after testing it', false]],
        'Scope holds even when the boundary is inconvenient.'),
      mcq('In a field that runs on trust, one unauthorised test:',
        [['Follows you through your career', true],
          ['Is overlooked if you were a student', false],
          ['Matters only if prosecuted', false],
          ['Can be offset by strong technical skills', false]],
        'Being trustworthy with access is the scarcer qualification.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_SECURITY_DEBUGGING',
    notes: `Security work has its own diagnostic problems: deciding whether a finding is real,
reproducing it reliably, and working out what it actually allows.

**"Is this a real finding?"** A scanner reported it; that is not evidence. Reproduce it manually,
with the exact request. If you cannot reproduce it, you do not have a finding — and reporting it
anyway is how a team stops reading your reports.

**"It worked once and now it does not."** A session expired, a rate limit engaged, a cache served a
different response, state changed, or somebody deployed. Establish the conditions before concluding
either way.

**"Is this exploitable or just theoretical?"** The question is what an attacker gains. Reflected
content that cannot be delivered to anybody, a race window of two milliseconds, or an endpoint
reachable only by an administrator who could already do it — those are worth recording and not worth
alarming anybody over. Be precise about the preconditions.

**"Why does it work for me and not in the report?"** You were authenticated, on a different account
type, with a cookie from earlier, or in a different environment. Always reproduce in a clean session
before writing it up.

**"The fix does not seem to work."** Check you are testing the deployed version, that a cache is not
serving the old response, and that the fix addresses the cause rather than your specific payload — a
filter often blocks exactly what you sent and nothing else.

**Reproducing reliably** is the deliverable. A finding somebody cannot reproduce from your report
does not get fixed:

    1. The exact request — method, URL, headers, body
    2. The account state — who you were, what permissions
    3. The preconditions — what had to exist first
    4. The exact response, with the part that matters marked
    5. What it allows, stated plainly

**When investigating whether something happened**, the logs answer it: unusual times, unusual
volumes, requests from one source across many accounts, a sequence of 404s that looks like somebody
enumerating. Absence of evidence in logs that were not being kept is not evidence of absence.

**And the honesty rule of this track: if you are not certain, say so.** "This appears to allow X; I
could not confirm whether Y is also possible" is a professional report. Overstating a finding to make
it more impressive is the fastest way to lose the standing you need for the next one.`,
    mcqs: [
      mcq('A scanner report you cannot reproduce manually is:',
        [['Not a finding', true],
          ['A finding of lower severity', false],
          ['Worth reporting with a caveat', false],
          ['Evidence of an intermittent flaw', false]],
        'Reporting it anyway is how a team stops reading your reports.'),
      mcq('Deciding whether a finding is exploitable means asking:',
        [['What an attacker actually gains', true],
          ['How difficult it was to find', false],
          ['Whether the scanner rated it highly', false],
          ['How long the flaw has existed', false]],
        'Be precise about the preconditions.'),
      mcq('A fix that does not seem to work may be because:',
        [['It blocked your payload, not the cause', true],
          ['The vulnerability was misidentified', false],
          ['The scanner needs re-running', false],
          ['The finding was a false positive', false]],
        'Also a cache, or testing a version not yet deployed.'),
      mcq('A finding report must include enough for:',
        [['Somebody else to reproduce it', true],
          ['The severity to be calculated', false],
          ['The fix to be written', false],
          ['The scanner output to be verified', false]],
        'One that cannot be reproduced does not get fixed.'),
    ],
    checkpoint: [
      mcq('Absence of evidence in logs that were not being kept is:',
        [['Not evidence of absence', true],
          ['Sufficient to close an investigation', false],
          ['Proof the system was not accessed', false],
          ['A finding in its own right', false]],
        'Which is an argument for retention before you need it.'),
      mcq('When you are not certain about a finding, you should:',
        [['Say so explicitly in the report', true],
          ['Omit the uncertain part', false],
          ['State the worst case to be safe', false],
          ['Delay reporting until certain', false]],
        'Overstating is the fastest way to lose your standing.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_SECURITY_PRACTICE',
    notes: `No new ideas. Find, verify, fix and report — repeatedly, and only where you are permitted
to.

**Where you may work, and nowhere else:**

- Deliberately vulnerable applications built for training
- Your own applications and infrastructure
- A classmate's application, with their **written** permission
- A bug bounty programme, strictly inside its published scope

**Do these:**

1. **Work through a vulnerable application.** Find at least six distinct flaws. For each: what it is,
   how you found it, what it allows, and the fix.
2. **Exploit and fix your own IDOR.** Build it, use it to read another user's data, fix it, and prove
   the fix.
3. **Break an authentication flow** — your own. Enumerate users, then remove the leak. Attack the
   reset flow, then fix it.
4. **Use an intercepting proxy** on your own application for an hour. Change values, replay requests
   as another user, remove headers. Record everything that succeeded and should not have.
5. **Run a scanner on your own system**, then verify every finding manually. Record which were real
   and which were noise, with the proportion.
6. **Harden a server** from a default install and document each change with the reason.
7. **Write two findings reports**, properly: reproduction steps, impact, severity with reasoning, and
   remediation.
8. **Run an incident exercise.** Have somebody plant a change in a test system; detect it, contain
   it, investigate it, and write the timeline and blameless review.

**Record for each:** what you found, how you verified it, and what the fix was.

**The standard this set aims at:** finding something is the easy part. A verified finding, with a
reproduction somebody else can follow, an honest severity and a fix that closes the category — that
is a professional deliverable, and it is what the work actually consists of.

**And the boundary, stated once more because tools make it easy to cross:** systems you own, or
written permission. Nothing else, ever, whatever the justification.`,
    mcqs: [
      mcq('A classmate\'s application may be tested:',
        [['With their written permission', true],
          ['If no damage is caused', false],
          ['As part of a course exercise', false],
          ['If the findings are shared with them', false]],
        'Written, specific, and from somebody who owns it.'),
      mcq('Verifying every scanner finding manually produces:',
        [['A record of how much was noise', true],
          ['A higher finding count', false],
          ['Faster scanning next time', false],
          ['A severity rating for each', false]],
        'Record the proportion; it is usually surprising.'),
      mcq('An hour with an intercepting proxy on your own application is used to:',
        [['Replay requests as another user', true],
          ['Scan for known vulnerabilities', false],
          ['Measure response times', false],
          ['Capture credentials in transit', false]],
        'Most access control testing is exactly that.'),
      mcq('A professional deliverable in this field is:',
        [['A verified finding, with a fix', true],
          ['A list of scanner outputs', false],
          ['A count of vulnerabilities found', false],
          ['A demonstration of exploitation', false]],
        'Finding something is the easy part.'),
      mcq('The incident exercise ends with:',
        [['A timeline and a blameless review', true],
          ['A list of the attacker\'s actions', false],
          ['A restored system', false],
          ['A severity assessment', false]],
        'Detect, contain, investigate, then learn.'),
    ],
    checkpoint: [
      mcq('Practice is permitted on:',
        [['Training apps, your own, or with permission', true],
          ['Any system with a disclosure policy', false],
          ['Systems where you cause no harm', false],
          ['Publicly reachable systems generally', false]],
        'A bug bounty counts only strictly inside its published scope.'),
      mcq('Hardening a server from a default install must include:',
        [['A documented reason for each change', true],
          ['A scanner report before and after', false],
          ['A rebuild from a script', false],
          ['A comparison against a benchmark', false]],
        'The reasoning is what makes it reviewable.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_SECURITY_MINI_PROJECT',
    notes: `A full security assessment of a system you are authorised to test, reported the way a
professional would report it.

**Why the report is the deliverable.** In this field the work is judged by what you hand over. A
finding nobody can reproduce does not get fixed; a severity nobody believes gets deprioritised; a
report full of scanner output gets skimmed. The assessment here is the same one your work will face.

**What is being assessed:** that the scope was authorised and respected, that the methodology was
systematic rather than opportunistic, that every finding is verified and reproducible, that severity
is reasoned, and that the remediation addresses causes.

**Build it in this order:**

1. **Establish authorisation in writing**, and define the scope precisely.
2. **Map the surface**, and record it before testing anything.
3. **Test systematically** by category, recording as you go.
4. **Verify every finding** manually, with evidence.
5. **Assess severity** by what it exposes, how easily, to whom.
6. **Write the report**, and then write the fixes.

The brief, requirements and deliverables are in the assignment attached to this unit.`,
    assignment: {
      title: 'Project — A Security Assessment and Report',
      description: 'Assess a system you are authorised to test, verify every finding, reason about severity, and produce a report a developer could act on.',
      instructions: `**The brief**

Perform a full security assessment of **one** of the following, and nothing else:

- **An application you built**, ideally one with users, roles and stored data.
- **A deliberately vulnerable application** designed for training.
- **A classmate's application**, with written permission naming the system, the window and the
  techniques permitted.

**Requirements**

1. **An authorisation record**: what you are testing, who authorised it, when, what is in and out of
   scope, and what is excluded. For your own system, a written scope statement.
2. **A surface map** produced before testing: entry points, authentication boundaries, roles, data
   held, and the value behind each area.
3. **A methodology section**: what you tested, in what order, by category — access control,
   authentication, injection, output handling, configuration, dependencies, secrets.
4. **At least eight verified findings**, each with:
   - Description and location
   - Reproduction steps somebody else can follow exactly
   - Evidence: request and response, redacted
   - Impact: what it actually allows
   - Severity, with the reasoning
   - Remediation at the root cause
5. **A false positive record**: what automated tooling reported that you verified as noise, and the
   proportion.
6. **Fixes applied** for at least five findings, each re-tested with the original proof and both
   states evidenced.
7. **A regression test** for at least three fixed findings.
8. **An executive summary** of half a page, readable by somebody non-technical: what was assessed,
   how bad it is, what to do first.

**What to submit**

1. The **assessment report**, with all sections above.
2. The **authorisation record**.
3. The **code changes** for the fixes, as a diff.
4. The **verification evidence**: before and after for each fixed finding.
5. A **short write-up** (400–500 words): the finding you almost dismissed and should not have; where
   you had to stop because it was outside scope; what you would tell the developer of this system if
   you had five minutes.

**Constraints**

- **Authorised systems only.** No exceptions, and the authorisation record is a graded requirement.
- Access the minimum needed to demonstrate each finding; redact everything in the evidence.
- No denial of service testing, and no destructive action against data you did not create.
- Every finding verified manually; no unverified scanner output in the report.

**Where the marks are.** The verification, the severity reasoning and the report quality. A long
list of unverified findings is worth less than four findings somebody can reproduce, believe and
fix — and the executive summary is what decides whether any of it gets acted on.`,
      rubric: [
        {
          criterion: 'Scope and authorisation',
          description: 'Authorisation recorded before testing; scope precise and respected throughout, including where it was inconvenient.',
          maxPoints: 20,
        },
        {
          criterion: 'Methodology',
          description: 'Surface mapped first; testing systematic by category rather than opportunistic; coverage stated including what was not tested.',
          maxPoints: 20,
        },
        {
          criterion: 'Findings and verification',
          description: 'Eight or more findings, each manually verified with reproduction steps and redacted evidence; false positives recorded honestly.',
          maxPoints: 30,
        },
        {
          criterion: 'Severity and remediation',
          description: 'Severity reasoned from exposure, ease and audience; fixes address root causes; five re-tested with both states evidenced and three regression tests.',
          maxPoints: 20,
        },
        {
          criterion: 'Report quality',
          description: 'Executive summary a non-technical reader can act on; findings clear and factual without embellishment; honest about uncertainty.',
          maxPoints: 10,
        },
      ],
      totalPoints: 100,
    },
  },
];
