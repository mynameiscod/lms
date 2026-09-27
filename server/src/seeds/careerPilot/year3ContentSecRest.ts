/**
 * T3_SEC_NETWORK, T3_SEC_TESTING, T3_SEC_LIFECYCLE and T3_SEC_PROJECT — thirteen units.
 * Year 3, security track. Finishes S17.
 *
 * ── THE UNITS THAT MAKE SOMEBODY EMPLOYABLE IN SECURITY ───────────────────────────────────
 *
 * Not the attacks. The method and the writing.
 *
 * TESTING_AGAINST_THE_MODEL is the unit that connects the two halves of the track: a threat
 * model that is never tested is a document, and testing without a model is poking at things
 * you happen to think of.
 *
 * TOOLS_AND_THEIR_LIMITS exists because a graduate who runs a scanner and reports its output
 * has added nothing. Knowing what the scanner cannot see — and saying so in the report — is
 * the whole value.
 *
 * WRITING_IT_UP matters more in this track than anywhere else in Year 3. A security finding
 * lands on somebody who did not ask for it, is busy, and may reasonably disagree. A finding
 * that is right and badly written does not get fixed, and an unfixed finding has the same
 * value as one that was never found.
 *
 * WHEN_SOMETHING_HAPPENS is deliberately unglamorous: contain, preserve, communicate, and
 * write it up without blaming a person.
 *
 * Attribution: NETWORK defaults to LINUX_ADMINISTRATION with TLS on COMPUTER_NETWORKS.
 * TESTING defaults to THREAT_MODELING with the tooling unit on SECURE_CODING. LIFECYCLE
 * defaults to SECURE_CODING with the incident unit on LOGGING_DIAGNOSTICS. The project is all
 * PRODUCTION_ENGINEERING.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const SEC_REST_BUNDLES: PilotBundle[] = [
  /* ══ T3_SEC_NETWORK ═════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_SEC_NETWORK_WHAT_IS_LISTENING',
    notes: `**What is listening on this machine, and did anybody mean it to be?**

That question, asked of every host, finds more real exposure than any amount of application
testing — and it takes a few minutes per machine.

## From the inside

    ss -tlnp

**Every listening port, with the process.** For each one, three questions:

**What is it?** If you cannot name the process, that is the finding. A listener nobody
recognises is either forgotten infrastructure or something worse.

**Does it need to listen at all?** A database that only serves the local application can bind
to localhost. **A service bound to 0.0.0.0 that only has local callers is exposure for
nothing.**

**Who can reach it?** The firewall rules, the security groups, the network position.

## From the outside

**Scan your own addresses.** Legal against infrastructure you own or are permitted to test,
fast, and it answers the question directly rather than by inference from configuration.

**The inside view and the outside view disagree more often than people expect** — a port is
bound and firewalled, or a firewall rule exists for a port nothing listens on, and the
difference between the two lists is where the findings are.

## What you will find

**Management interfaces.** Database admin tools, message broker consoles, monitoring
dashboards, container platform APIs. **Frequently with a default credential**, frequently
deployed for a debugging session and never removed.

**Old services.** Something from a previous project, still running, unpatched, forgotten.

**Debug ports.** A remote debugger, a profiler, a metrics endpoint that dumps configuration.

**Services bound too broadly.** The commonest, and the cheapest to fix.

## Reducing it

**Bind to localhost** anything with only local callers. **The single highest-value change in
this unit**, because it removes exposure without any firewall involvement.

**Default deny**, then allow what is needed, referencing groups rather than address ranges
where the platform supports it.

**Remove what is not used.** An unused service is exposure with no compensating value.

**And restrict by source.** A management interface reachable only from a known network is
dramatically safer than one protected only by a password, however strong.

## Patching, briefly

**Know the versions of what listens.** A listening service with a known remote vulnerability is
the most direct path into a system there is.

**Automate the checking.** A list of hosts, their listening services and versions, compared
against known vulnerabilities, is a script — and running it weekly finds things before they
are found for you.

## The exercise worth doing

**Take one machine you run. List what is listening. Name every one.**

**Most people cannot name all of them**, and the ones they cannot name are the interesting
part.`,
    mcqs: [
      mcq('A listening process you cannot name is:',
        [['The finding — forgotten infrastructure, or something worse than that', true],
          ['Usually a standard system service of some kind', false],
          ['Acceptable if the firewall blocks external access to it', false],
          ['Worth investigating only if the port is unusual', false]],
        'Most people cannot name everything listening on a machine they run.'),
      mcq('The inside and outside views disagreeing is useful because:',
        [['The difference between the two lists is where the findings are', true],
          ['It indicates the firewall is misconfigured somewhere', false],
          ['It shows which scanning tool is more accurate here', false],
          ['It reveals services that have recently been added', false]],
        'A bound and firewalled port, or a rule for a port nothing listens on.'),
      mcq('The single highest-value change in this unit is:',
        [['Binding local-only services to localhost rather than to everything', true],
          ['Adding a firewall rule in front of every listening service', false],
          ['Patching every listening service to its latest version', false],
          ['Moving management interfaces to non-standard ports', false]],
        'It removes exposure without any firewall involvement at all.'),
      mcq('Restricting a management interface by source network is:',
        [['Dramatically safer than protecting it with a password alone', true],
          ['Roughly equivalent to using a very strong password', false],
          ['Only worthwhile for interfaces without authentication', false],
          ['Less effective than putting it behind a VPN gateway', false]],
        'However strong the password is.'),
    ],
    checkpoint: [
      mcq('An unused service that is still running is:',
        [['Exposure with no compensating value whatsoever', true],
          ['Harmless as long as it is patched regularly', false],
          ['Worth keeping in case it is needed again later', false],
          ['A low priority compared with misconfiguration', false]],
        'Remove what is not used.'),
      mcq('A listening service with a known remote vulnerability is:',
        [['The most direct path into a system that exists', true],
          ['One risk among several of similar severity', false],
          ['Only exploitable with valid credentials first', false],
          ['Usually mitigated by the network configuration', false]],
        'Know the versions of what listens, and check them weekly.'),
      mcq('Scanning your own addresses from outside:',
        [['Answers the question directly rather than by inference', true],
          ['Duplicates what the configuration review already shows', false],
          ['Requires permission from the hosting provider first', false],
          ['Is less reliable than reading the firewall rules', false]],
        'Configuration tells you what should be true; a scan tells you what is.'),
    ],
  },

  {
    unitCode: 'T3_SEC_NETWORK_TLS_PROPERLY',
    notes: `**TLS is not a checkbox.** It is configured, and the configuration has a version, a
cipher list, a certificate and a set of behaviours — each of which can be wrong while the
padlock still appears.

## What it gives you

**Confidentiality** — nobody in between reads it.

**Integrity** — nobody in between changes it.

**Authentication of the server** — you are talking to who you think.

**Not authentication of the client**, unless you configure that separately. And **not
protection from the server**, which sees everything in plaintext.

## Getting it right

**Modern versions only.** The old ones have known weaknesses and there is no reason to accept
them.

**A sensible cipher list.** Use the platform's recommended set rather than assembling your own,
which is how a weak cipher survives for years.

**A valid certificate chain**, including intermediates. **A missing intermediate works in a
browser that happens to have it cached and fails in a client that does not** — which is why
this breaks for some users and not others and is so confusing to diagnose.

**Automatic renewal**, with a monitor. **A certificate expiring at a weekend is an entirely
preventable outage** and it happens constantly.

**HSTS**, so browsers refuse plaintext for your domain in future.

**Redirect plaintext to TLS**, and mark cookies \`Secure\` so they are never sent otherwise.

## Where it is missed

**Internal traffic.** Service to service, often plaintext because "it is on the internal
network" — which the threat modelling unit listed as a false assumption. **Anybody who reaches
the network reads it all.**

**To the database.** Frequently plaintext, frequently carrying everything you have.

**Health checks and metrics.** Small endpoints, often forgotten, often revealing.

**Old redirects.** A plaintext endpoint kept for compatibility that nobody removed.

## Verifying it

**Test it rather than assuming.** Public tools rate a public endpoint in a minute and produce a
report that names the weaknesses precisely.

**For internal endpoints**, check the version, the cipher list and the chain directly with a
command-line client.

**And check every hostname**, not just the main one. A certificate valid for the apex and not
the subdomain is a real and common finding.

## What TLS does not solve

**It does not make the application secure.** An encrypted connection to a vulnerable endpoint
is a vulnerable endpoint.

**It does not protect data at rest.**

**It does not authenticate the client**, so it is not access control.

**And it does not stop you sending the wrong data to the right place.** Encryption protects
the channel; everything else in this track is about what travels through it.`,
    mcqs: [
      mcq('A missing intermediate certificate causes:',
        [['Failure for some clients and success for others, which is confusing to diagnose', true],
          ['A consistent failure across every client that connects', false],
          ['A browser warning that users can click through safely', false],
          ['A downgrade to an older protocol version automatically', false]],
        'A browser with it cached succeeds; a client without it does not.'),
      mcq('Internal service-to-service traffic is often plaintext because:',
        [['Of the false assumption that the internal network is safe', true],
          ['Encrypting it costs too much in latency terms', false],
          ['Certificates cannot be issued for internal names', false],
          ['The traffic never leaves the provider network', false]],
        'Anybody who reaches the network reads all of it.'),
      mcq('Assembling your own cipher list is a mistake because:',
        [['It is how a weak cipher survives in a configuration for years', true],
          ['Platforms reject custom lists in most configurations', false],
          ['It has no effect on the negotiated connection', false],
          ['Cipher choice is determined entirely by the client', false]],
        'Use the platform’s recommended set.'),
      mcq('TLS does not:',
        [['Authenticate the client, so it is not access control', true],
          ['Protect the contents of the connection in transit', false],
          ['Verify the identity of the server you reached', false],
          ['Prevent modification of the data in transit', false]],
        'Unless client certificates are configured separately.'),
    ],
    checkpoint: [
      mcq('Checking every hostname rather than just the main one finds:',
        [['A certificate valid for the apex but not for a subdomain', true],
          ['An expired certificate on the primary domain name', false],
          ['A weak cipher enabled on one listener only', false],
          ['A missing redirect from plaintext to TLS', false]],
        'A real and common finding.'),
      mcq('A certificate expiring at the weekend is:',
        [['An entirely preventable outage that happens constantly', true],
          ['An acceptable risk for internal services only', false],
          ['Usually caught by the provider automatically', false],
          ['Only a problem for public-facing endpoints', false]],
        'Automatic renewal, with a monitor on the expiry date.'),
      mcq('An encrypted connection to a vulnerable endpoint is:',
        [['A vulnerable endpoint, reached over an encrypted channel', true],
          ['Substantially safer than a plaintext connection to it', false],
          ['Protected against the most common attack classes', false],
          ['Acceptable while the vulnerability is being fixed', false]],
        'Encryption protects the channel, not what travels through it.'),
    ],
  },

  /* ══ T3_SEC_TESTING ═════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_SEC_TESTING_TESTING_AGAINST_THE_MODEL',
    notes: `**A threat model that is never tested is a document. Testing without a model is
poking at things you happen to think of.** This unit connects the two halves of the track.

## The method

**Take each finding in your model and turn it into a test.**

Model: "the order endpoint may not check ownership."
Test: as B, request A's order. Record the response.

Model: "the webhook may not verify its signature."
Test: send one with a wrong signature. Record what happens.

Model: "the reset token may not expire."
Test: request one, wait, use it.

**Every entry in the model becomes a yes or a no**, and that is what turns a list of worries
into a list of facts.

## Why this beats both alternatives

**Better than testing at random**, because the model came from thinking about what matters
here rather than about what is commonly tested.

**Better than modelling alone**, because a model is full of things that turn out to be already
handled — and the ones that are handled are as useful to know as the ones that are not.

**And it gives you coverage you can state.** "I tested nineteen of the twenty-two identified
risks; the other three require production access" is a sentence that means something.

## Record the negatives

**A test that found nothing is a result.** Write it down.

**It tells the team what is working**, which is information they rarely get and which makes the
findings more credible by contrast.

**And it stops you retesting it next quarter** and forgetting you already knew.

## When the test cannot be run

**Say so, and say what it would take.**

- Needs production data.
- Needs an account type you do not have.
- Would be destructive.
- Out of scope.

**An untested risk is not a cleared risk**, and a report that quietly omits the ones you could
not test overstates its own coverage.

## Automate the ones that matter

**Some of these should become permanent tests.** The two-account test per operation. The
signature verification. The token expiry.

**A risk verified once is verified once.** A risk with a test is verified on every commit, and
that is the difference between an assessment and an improvement.

**This is the single most valuable thing you can leave behind**, and it costs an afternoon.

## The coverage statement

At the end:

> "Twenty-two risks identified. Nineteen tested: four confirmed, fifteen not exploitable.
> Three untested — two need production access, one needs a partner account. Six of the
> nineteen now have automated tests."

**That paragraph is what distinguishes an assessment from a scan**, and it is available to
anybody willing to keep the list.`,
    mcqs: [
      mcq('Testing against a model beats testing at random because:',
        [['The model came from what matters here, not what is commonly tested', true],
          ['It covers more attack classes in the available time', false],
          ['It produces findings that are easier to rank', false],
          ['It requires less familiarity with the system', false]],
        'And it gives you coverage you can state.'),
      mcq('A test that found nothing should be recorded because:',
        [['It tells the team what is working and makes the findings more credible', true],
          ['It demonstrates the effort that went into the assessment', false],
          ['It is required for the report to be complete', false],
          ['It shows the model was accurate in that area', false]],
        'And it stops you retesting it next quarter having forgotten.'),
      mcq('An untested risk is:',
        [['Not a cleared risk, and omitting it overstates your coverage', true],
          ['Effectively low priority until it can be tested', false],
          ['Reasonable to exclude from the final report', false],
          ['Covered by the general recommendations section', false]],
        'Say so, and say what testing it would take.'),
      mcq('Turning a verified risk into an automated test:',
        [['Changes verified once into verified on every commit', true],
          ['Reduces the need for future assessments entirely', false],
          ['Is useful mainly for regression tracking purposes', false],
          ['Requires the finding to be fixed first', false]],
        'The difference between an assessment and an improvement.'),
    ],
    checkpoint: [
      mcq('The coverage statement distinguishes an assessment from a scan because:',
        [['It says what was tested, what was found, and what was not reached', true],
          ['It quantifies the severity of each finding precisely', false],
          ['It demonstrates that a recognised methodology was followed', false],
          ['It lists the tools used during the engagement', false]],
        'Available to anybody willing to keep the list.'),
      mcq('Risks in the model that turn out to be handled are:',
        [['As useful to know as the ones that are not', true],
          ['Evidence the model was too pessimistic', false],
          ['Best omitted to keep the report focused', false],
          ['Only worth recording if a control is named', false]],
        'The team rarely gets told what is working.'),
      mcq('The most valuable thing to leave behind is:',
        [['Automated tests for the risks that matter most', true],
          ['A detailed written threat model document', false],
          ['A prioritised list of every finding', false],
          ['A scanner configured in the pipeline', false]],
        'It costs an afternoon and it verifies on every commit.'),
    ],
  },

  {
    unitCode: 'T3_SEC_TESTING_TOOLS_AND_THEIR_LIMITS',
    notes: `**A graduate who runs a scanner and reports its output has added nothing.** The
scanner is available to everybody. Knowing what it cannot see, and saying so, is the value.

## What tools are genuinely good at

**Dependency vulnerabilities.** A known CVE in a known version. **Reliable, fast, and you
should always run it** — it is the highest value per minute available.

**Configuration checks.** A public bucket, a permissive rule, a missing header. Cloud
providers' own tools do this well.

**Known patterns in code.** A concatenated query, an unsafe function, a hardcoded secret. Good
recall, and a false positive rate that needs a human.

**Coverage of the tedious.** Every endpoint, every header, every parameter, without getting
bored — which is a real advantage over a person on hour six.

## What they cannot do

**Find a missing check.** The most common serious vulnerability, and a scanner sees the code
that is there. **This alone is why an assessment cannot be a scan.**

**Understand your business rules.** That this user should not be able to approve their own
expense claim is not in any signature.

**Chain things together.** Three low findings that combine into one serious one.

**Judge severity in context.** An XSS behind an admin login and one on the homepage score the
same and are not the same.

**Tell you what is worth fixing first.**

## The false positive problem

**A scanner reporting forty findings where three are real is normal.**

**Triage every one**, and write down why each dismissal is a dismissal. **"Dismissed because I
checked X" is a record; "dismissed" is a guess** — and the difference matters when somebody
asks in six months.

**Never report a scanner's output unfiltered.** It is the clearest possible signal that no
judgement was applied, and the team will find the false positives before you do.

## The false negative problem, which is worse

**A clean scan is not a secure system.**

**Say this explicitly in the report.** A team that reads "the scan found nothing" as "we are
secure" has been misled, and the report did it.

**What to write instead:** "The automated scan found no issues of its kind. It cannot detect
missing access control, business logic flaws, or chained weaknesses, all of which were tested
manually — see the coverage statement."

## Using them well

**Run them early**, so the cheap findings are out of the way before you spend time on judgement.

**Run them in the pipeline**, so they keep working after you leave.

**Tune them.** An unfiltered scanner in a pipeline produces noise, and noise gets ignored —
the same argument as alerting.

**And treat the output as a starting point.** A reported pattern is a place to look, not a
finding to report.`,
    mcqs: [
      mcq('The reason an assessment cannot be a scan is that a scanner:',
        [['Cannot find a missing check, which is the most common serious flaw', true],
          ['Produces too many false positives to be practical', false],
          ['Cannot be run against a production environment safely', false],
          ['Covers only the classes its signatures already know', false]],
        'It sees the code that is there.'),
      mcq('Writing down why each dismissal is a dismissal matters because:',
        [['"Dismissed because I checked X" is a record and "dismissed" is a guess', true],
          ['It demonstrates the triage process was thorough', false],
          ['It allows the scanner to be tuned afterwards', false],
          ['It is required for the finding to be closed', false]],
        'Which matters when somebody asks in six months.'),
      mcq('Reporting a scanner’s output unfiltered is:',
        [['The clearest possible signal that no judgement was applied', true],
          ['Acceptable when the engagement time is short', false],
          ['Reasonable if the severities are left as reported', false],
          ['Standard practice for automated assessments', false]],
        'The team will find the false positives before you do.'),
      mcq('The false negative problem is worse because:',
        [['A team reading "the scan found nothing" as "we are secure" has been misled', true],
          ['False negatives are harder to detect than false positives', false],
          ['Scanners rarely report their own coverage limits', false],
          ['Missing findings accumulate over successive scans', false]],
        'And the report did the misleading.'),
    ],
    checkpoint: [
      mcq('The highest value per minute in an assessment is:',
        [['The dependency vulnerability audit', true],
          ['The manual access control matrix', false],
          ['The configuration review from outside', false],
          ['The injection pattern search', false]],
        'Reliable, fast, and you should always run it.'),
      mcq('An advantage a tool genuinely has over a person is:',
        [['Covering every endpoint and parameter without getting bored', true],
          ['Judging which findings matter most in context', false],
          ['Recognising chained weaknesses across several components', false],
          ['Understanding the application’s business rules', false]],
        'A real advantage over a person on hour six.'),
      mcq('An unfiltered scanner in a pipeline:',
        [['Produces noise, and noise gets ignored', true],
          ['Catches regressions more reliably than a tuned one', false],
          ['Is preferable to no scanning at all', false],
          ['Becomes accurate as the codebase stabilises', false]],
        'The same argument as alerting.'),
    ],
  },

  {
    unitCode: 'T3_SEC_TESTING_WRITING_IT_UP',
    notes: `**A finding that is right and badly written does not get fixed.** This unit matters
more than any other in the track, because an unfixed finding has the same value as one that was
never found.

## Who reads it

**Somebody who did not ask for it.** They have a roadmap, and you have added to it.

**Somebody who is busy.**

**Somebody who may reasonably disagree**, and who knows the system better than you do.

**Write for that person.** Not for a compliance file, and not to demonstrate what you know.

## The shape of a finding

**Title.** What is wrong, specifically. "Order endpoint does not check ownership", not "Access
control issue".

**Severity, with the reasoning.** Not just "high" — "high because it is unauthenticated,
automatable, and exposes personal data".

**Where.** File and line, or endpoint and method. **Precise enough that they do not have to
look for it.**

**Evidence.** The request, the response, a screenshot. **Enough that they believe it without
reproducing it**, and enough that they can reproduce it if they want to.

**Impact.** What somebody could actually do. Not "could lead to data exposure" but "any
logged-in user can read any other user's orders, including addresses".

**The fix.** Specific. "Scope the query to the caller in \`OrderService.get\`", not "implement
proper access control".

**Effort.** Roughly. It is what turns your finding into their ticket.

## Tone

**Describe the system, not the people.** "The endpoint does not check" rather than "the
developer forgot".

**No triumph.** A finding written as a gotcha gets argued with rather than fixed, and you will
be back next quarter.

**No jargon they do not use.** If the team does not say "IDOR", write "any user can read
another user's records by changing the id".

**And acknowledge what is good.** A report that is only negative is read defensively. "The
parameterised queries throughout are why there is no SQL injection here" costs a line and
changes how the rest lands.

## Severity, honestly

**Justify it from exploitability and impact in this system**, not from a category.

**And be willing to mark something low.** A report where everything is critical is a report
nobody can act on, and it is also not believed.

## The summary

**Three sentences at the top**, for somebody who reads nothing else:

> "Three issues need attention this week: any user can read another's orders, the admin
> interface is reachable from the internet, and a dependency has a known remote exploit. The
> first two are straightforward changes; the third is a version bump. Everything else found is
> lower priority and listed below."

**Most readers stop after that.** Write accordingly — the data track made the same point about
findings, and it is the same skill.

## Deliver it as tickets

**A report is a document. A ticket is work.**

One per finding, in their tracker, with the file, the change and the estimate. **A finding that
is not a ticket will be rediscovered next year**, and being rediscovered is how a team learns
the exercise changes nothing.`,
    mcqs: [
      mcq('The person a security finding is written for is:',
        [['Somebody busy who did not ask for it and may reasonably disagree', true],
          ['A compliance reviewer who needs the detail on file', false],
          ['A security specialist who will triage it further', false],
          ['A manager deciding whether to fund remediation work', false]],
        'Not for a compliance file, and not to demonstrate what you know.'),
      mcq('"Could lead to data exposure" should be replaced with:',
        [['Any logged-in user can read any other user’s orders and addresses', true],
          ['This represents a high severity confidentiality risk', false],
          ['Sensitive information may be disclosed to unauthorised parties', false],
          ['The impact depends on the data held in that table', false]],
        'What somebody could actually do.'),
      mcq('A finding written as a gotcha:',
        [['Gets argued with rather than fixed, and you will be back', true],
          ['Is more likely to be prioritised by management', false],
          ['Demonstrates the severity more effectively', false],
          ['Is appropriate when the issue is serious enough', false]],
        'Describe the system, not the people.'),
      mcq('Acknowledging what is good in the report:',
        [['Costs a line and changes how the rest of it lands', true],
          ['Dilutes the seriousness of the findings', false],
          ['Is only appropriate in an internal assessment', false],
          ['Should be left to the executive summary', false]],
        'A report that is only negative is read defensively.'),
    ],
    checkpoint: [
      mcq('A report where everything is critical:',
        [['Cannot be acted on, and is also not believed', true],
          ['Accurately reflects a system in poor condition', false],
          ['Ensures the important items receive attention', false],
          ['Is appropriate for a first-time assessment', false]],
        'Be willing to mark something low.'),
      mcq('The fix in a finding should read:',
        [['Scope the query to the caller in this named method', true],
          ['Implement proper access control on this endpoint', false],
          ['Follow the secure coding guidelines for this class', false],
          ['Review the authorization logic in this component', false]],
        'Specific enough to become a ticket.'),
      mcq('A finding left as a paragraph rather than a ticket:',
        [['Will be rediscovered next year, teaching the team it changes nothing', true],
          ['Remains available in the report for somebody to action later', false],
          ['Can be tracked through the assessment summary', false],
          ['Will be picked up by the next scheduled review', false]],
        'A report is a document; a ticket is work.'),
    ],
  },

  {
    unitCode: 'T3_SEC_TESTING_DEBUGGING',
    notes: `Five ways security testing goes wrong, beyond the application-level ones the appsec
unit covered.

## 1. You tested the wrong thing

**Symptom:** findings the team cannot reproduce.

**Causes:** a different environment; a different version; a feature flag off in one place; a
control applied at a layer you were behind, such as testing an internal address and bypassing
the gateway.

**That last one is worth watching for.** Testing from inside the network skips the controls the
gateway applies, and everything looks broken.

**Fix:** record the exact target and path, and test from where a real attacker would be.

## 2. The scanner found forty things and you reported forty

**Covered in the tooling unit, and it is the commonest failure of a junior assessment.**

**Triage everything.** Record why each dismissal is a dismissal.

## 3. You cannot show it any more

**Symptom:** you saw it, and now you cannot demonstrate it.

**Causes:** the session expired; the state changed; a deploy happened; you did not capture the
request.

**Fix:** capture as you go. Full request, full response, timestamp, account. **It costs nothing
at the time and everything afterwards.**

## 4. The finding is disputed and you cannot defend it

**Symptom:** the team says there is a control you did not see, and you have nothing but an
assertion.

**Causes:** you reasoned from the code rather than demonstrating; you tested a path that is not
reachable in production.

**Fix:** **verify by doing.** And when the team is right, say so quickly and remove it —
**defending a finding you cannot support costs more credibility than the finding was worth**,
and the next report inherits the doubt.

## 5. Nothing changed

**Symptom:** the report was accepted, thanked for, and nothing was fixed.

**Causes:** no tickets; no owners; no estimates; too many findings; severity inflation so
nobody knows where to start; delivered as a document.

**Fix:** three findings at the top, tickets with estimates, and a follow-up. **And measure it**
— how many of your findings were fixed within a quarter is the only number that says whether
the work was worth doing.

## The habits

**Capture everything as you go.**

**Record the environment and version at the top.**

**Triage every automated finding**, with a reason.

**Verify before reporting**, and withdraw quickly when wrong.

**And follow up.** A report with no follow-up is a report that was filed.`,
    mcqs: [
      mcq('Testing from inside the network can mislead because:',
        [['It skips the controls the gateway applies, so everything looks broken', true],
          ['Internal addresses resolve differently for some services', false],
          ['Internal traffic is not logged in the same way', false],
          ['The application behaves differently for internal callers', false]],
        'Test from where a real attacker would be.'),
      mcq('Defending a finding you cannot support:',
        [['Costs more credibility than the finding was worth', true],
          ['Is appropriate until the team proves otherwise', false],
          ['Demonstrates confidence in the assessment method', false],
          ['Should continue until a control is demonstrated', false]],
        'Say so quickly, remove it, and the next report avoids the doubt.'),
      mcq('The only number that says whether the work was worth doing is:',
        [['How many findings were fixed within a quarter', true],
          ['How many findings were identified in total', false],
          ['How many were rated high or critical severity', false],
          ['How much of the system was covered by testing', false]],
        'A report with no follow-up is a report that was filed.'),
      mcq('Capturing the full request and response as you go:',
        [['Costs nothing at the time and everything afterwards', true],
          ['Is only necessary for findings you intend to report', false],
          ['Slows the assessment enough to matter', false],
          ['Duplicates what the proxy log already holds', false]],
        'Sessions expire, state changes, and deploys happen.'),
    ],
    checkpoint: [
      mcq('The commonest failure of a junior assessment is:',
        [['Reporting a scanner’s output without triaging it', true],
          ['Missing the most serious vulnerability present', false],
          ['Testing outside the agreed scope boundaries', false],
          ['Failing to capture reproduction evidence', false]],
        'Forty findings where three are real.'),
      mcq('Severity inflation contributes to nothing changing because:',
        [['Nobody knows where to start when everything is critical', true],
          ['It makes the report longer than people will read', false],
          ['It causes findings to be disputed more often', false],
          ['It triggers an escalation process that delays work', false]],
        'Three findings at the top, with estimates.'),
      mcq('Recording the environment and version at the top of your notes prevents:',
        [['Reporting findings the team cannot reproduce', true],
          ['Losing evidence when a session expires', false],
          ['Testing outside the agreed scope', false],
          ['Duplicating findings across areas', false]],
        'A different version or a feature flag explains most irreproducible findings.'),
    ],
  },

  {
    unitCode: 'T3_SEC_TESTING_PRACTICE',
    notes: `Two exercises on the parts that decide whether an assessment is useful: stating
coverage, and writing a finding somebody can act on.`,
    coding: [
      {
        title: 'The coverage statement',
        description: `Read one risk per line as \`<name> <tested> <result>\`, where tested is
\`yes\` or \`no\` and result is \`confirmed\`, \`not_exploitable\` or \`-\` for untested.

Print four lines:

    identified=<total>
    tested=<count tested>
    confirmed=<count confirmed>
    untested=<names of untested risks, space separated, or none>

A risk marked tested with a result of \`-\` is a data error: count it as **untested** and
include its name, because a test with no recorded result is not a test.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# A test with no recorded result is not a test.
`,
        language: 'python',
        tests: [
          { input: 'idor yes confirmed\nxss yes not_exploitable\n', expectedOutput: 'identified=2\ntested=2\nconfirmed=1\nuntested=none' },
          { input: 'a yes confirmed\nb no -\n', expectedOutput: 'identified=2\ntested=1\nconfirmed=1\nuntested=b' },
          { input: 'a yes -\n', expectedOutput: 'identified=1\ntested=0\nconfirmed=0\nuntested=a' },
          { input: '', expectedOutput: 'identified=0\ntested=0\nconfirmed=0\nuntested=none' },
          { input: 'p no -\nq no -\n', expectedOutput: 'identified=2\ntested=0\nconfirmed=0\nuntested=p q', isHidden: true },
        ],
      },
      {
        title: 'Is this finding writable?',
        description: `A finding is ready to deliver when it has a specific location, evidence,
a concrete impact and a specific fix. Read one per line as
\`<location> <evidence> <impact> <fix>\`, each \`specific\` or \`vague\`.

Print, checking in this order:

- evidence \`vague\` → \`needs_evidence\`
- location \`vague\` → \`needs_location\`
- fix \`vague\` → \`needs_fix\`
- impact \`vague\` → \`needs_impact\`
- otherwise → \`ready\`

Then a final line \`ready=<n>\`.

Evidence comes first: without it the finding may not be true, and the other three describe
something that might not exist.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# Evidence first — the rest describes something that may not be real.
`,
        language: 'python',
        tests: [
          { input: 'specific specific specific specific\n', expectedOutput: 'ready\nready=1' },
          { input: 'specific vague specific specific\n', expectedOutput: 'needs_evidence\nready=0' },
          { input: 'vague specific specific specific\n', expectedOutput: 'needs_location\nready=0' },
          { input: 'specific specific specific vague\n', expectedOutput: 'needs_fix\nready=0' },
          { input: 'specific specific vague specific\n', expectedOutput: 'needs_impact\nready=0' },
          { input: 'vague vague vague vague\n', expectedOutput: 'needs_evidence\nready=0', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Security Testing Practice',
      description: 'State coverage, judge a finding’s readiness, then test a system against its own model.',
      instructions: `Complete both exercises, then:

1. For the first: a risk marked tested with no result counts as untested. Say why that rule is
   right, and what it would mean if a report contained several.
2. For the second: evidence is checked before location. Give a case where you would report a
   finding with weaker evidence anyway, and say how you would mark it.
3. For the second: rewrite a vague finding into a specific one. Invent the detail, and label
   each of the four parts.

**Then, on a system** you own, can run locally, or have written permission for.

4. Build a threat model. At least fifteen risks.
5. **Turn each into a test.** Say what the test is before you run it.
6. Run them. Record the result for every one, including the negatives.
7. For anything you could not test, say why and what it would take.
8. **Produce the coverage statement.** Identified, tested, confirmed, untested.
9. Write your three most serious findings in full: title, severity with reasoning, location,
   evidence, impact, fix, effort.
10. Write the three-sentence summary that goes at the top.
11. Turn at least two findings into automated tests that would fail if the issue returned.`,
      rubric: [
        { criterion: 'Coverage computed', description: 'All cases, including the tested-with-no-result rule.', maxPoints: 15 },
        { criterion: 'Readiness judged', description: 'All cases, with evidence taking precedence.', maxPoints: 15 },
        { criterion: 'Fifteen risks as tests', description: 'Each turned into a stated test before being run.', maxPoints: 20 },
        { criterion: 'Every result recorded', description: 'Including the negatives and the reasons for anything untestable.', maxPoints: 15 },
        { criterion: 'Three findings written in full', description: 'All seven parts, with severity reasoned from this system.', maxPoints: 20 },
        { criterion: 'Two automated tests', description: 'Each would fail if the issue returned.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]
`,
        tests: [
          { input: 'specific specific specific specific\n', expectedOutput: 'ready\nready=1' },
          { input: 'specific vague specific specific\n', expectedOutput: 'needs_evidence\nready=0' },
          { input: 'vague specific specific specific\n', expectedOutput: 'needs_location\nready=0' },
          { input: 'specific specific vague specific\n', expectedOutput: 'needs_impact\nready=0' },
          { input: 'vague vague vague vague\n', expectedOutput: 'needs_evidence\nready=0', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('A test with no recorded result counts as untested because:',
        [['Nothing was established, whatever effort was spent on it', true],
          ['The tester may have been interrupted midway', false],
          ['Results are required by the reporting template', false],
          ['It could have been either outcome, so it is neutral', false]],
        'Several of them in a report suggests the testing was not tracked.'),
      mcq('Reporting a finding with weaker evidence requires:',
        [['Marking it as suspected rather than confirmed', true],
          ['Lowering its severity by one level', false],
          ['Omitting it from the summary section', false],
          ['Asking the team to verify it themselves', false]],
        'The threats mini project used the same distinction.'),
      mcq('Recording negative results in the coverage statement:',
        [['Makes the confirmed findings more credible by contrast', true],
          ['Lengthens the report without adding any real value', false],
          ['Is only useful for repeat assessments', false],
          ['Suggests the model was overly cautious', false]],
        'And it tells the team what is working.'),
    ],
  },

  {
    unitCode: 'T3_SEC_TESTING_MINI_PROJECT',
    notes: `Test a system against its own threat model, and produce a report that gets
something fixed.

The brief's measurement is **how many of your findings become merged changes**. It is the only
number that says whether the work mattered, and almost no student assessment tracks it.

**Use only a deliberately vulnerable application, one you own, or one you have written
permission to test.**

Budget around two hours.`,
    assignment: {
      title: 'Mini Project — An Assessment That Got Something Fixed',
      description: 'Model, test against the model, report properly, and measure how much was fixed.',
      instructions: `**Choose** a system you may lawfully test. An open-source project you run
locally is ideal, because you can also submit the fix.

**Part one — scope and model**

1. Write the scope: what you may test, what you may not, which environment, which version.
2. Build the threat model. **At least fifteen risks**, each specific.
3. For each, write the test **before** running anything.

**Part two — test**

4. Run the cheap automated things first: dependency audit, configuration from outside.
   **Triage every automated finding with a written reason.**
5. Run your model's tests. Record the result for each — confirmed, not exploitable, or
   untested with a reason.
6. Capture the full request and response for everything you confirm.
7. For anything you cannot test, say what it would take.

**Part three — the coverage statement**

8. Identified, tested, confirmed, not exploitable, untested.
9. **What the automated tools could not have found**, stated explicitly, and how you covered
   it.

**Part four — the report**

10. A three-sentence summary at the top.
11. Your top three in full: title, severity with reasoning, location, evidence, impact, fix,
    effort.
12. Everything else, briefly, ranked into the remaining two groups.
13. Quick wins separately.
14. **One thing that is good**, named.
15. What you did not check.

**Part five — make it change something**

16. **Write each of the top three as a ticket** with a file, a change and an estimate.
17. **Fix at least one yourself**, with a test that would catch it returning.
18. If the project accepts contributions, submit it. Say whether you did and what happened.
19. Write two automated tests for risks you verified, so they cannot return silently.

**Part six — measure**

20. How many findings became tickets? How many became changes?
21. What would have made more of them get fixed?
22. If nothing was fixed, say honestly why — **an honest account of why a report went nowhere
    is worth full marks**, and it is the more common outcome.

**Submit** the scope, the model with its tests, the coverage statement, the report, the fix,
and the measurement.`,
      rubric: [
        { criterion: 'Scope and a real model', description: 'Written scope, fifteen specific risks, tests written before running.', maxPoints: 20 },
        { criterion: 'Tested with results recorded', description: 'Every risk resolved, automated findings triaged with reasons.', maxPoints: 20 },
        { criterion: 'A coverage statement', description: 'All five counts, plus what tools could not have found.', maxPoints: 15 },
        { criterion: 'Three findings written properly', description: 'Seven parts each, with a summary and something good named.', maxPoints: 20 },
        { criterion: 'Something fixed with a test', description: 'One change made, plus two regression tests for verified risks.', maxPoints: 15 },
        { criterion: 'Measured honestly', description: 'Tickets and changes counted, or an honest account of why not.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('The number this mini project is judged on is:',
        [['How many findings became merged changes', true],
          ['How many risks were identified in the model', false],
          ['How much of the system was covered', false],
          ['How severe the worst finding was', false]],
        'Almost no student assessment tracks it.'),
      mcq('An honest account of why a report went nowhere is:',
        [['Worth full marks, and the more common outcome', true],
          ['Evidence the assessment was not useful', false],
          ['A reason to resubmit with clearer findings', false],
          ['Acceptable only if tickets were raised', false]],
        'The brief asks for it because it usually happens.'),
      mcq('Stating what the automated tools could not have found:',
        [['Prevents a clean scan being read as a secure system', true],
          ['Justifies the time spent on manual testing', false],
          ['Demonstrates familiarity with the tooling', false],
          ['Is required by most reporting standards', false]],
        'The tooling unit’s argument, carried into the report.'),
    ],
  },

  /* ══ T3_SEC_LIFECYCLE ═══════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_SEC_LIFECYCLE_SECURITY_IN_THE_WORKFLOW',
    notes: `**Security that depends on somebody remembering does not happen.** It has to be in
the way the team already works, or it is a document.

## Where it fits

**In the ticket.** A field, or a habit: does this change touch authentication, personal data,
or something reachable from outside? **Three questions at the start cost a minute and change
what gets built.**

**In the design.** For anything significant, the four threat-modelling questions on a
whiteboard. Half an hour, two people, and it happens before the code exists — which is the
only point at which the answer is cheap.

**In code review.** A short list, not a long one: is the input validated, is authorization
checked, is anything logged that should not be, is a secret introduced. **Four questions a
reviewer can hold in their head.**

**In the pipeline.** The dependency audit, the secret scanner, and the two-account tests. **The
only part that does not depend on a person**, which is why it is worth the setup.

**In deployment.** Least access, private by default, TLS.

**After an incident.** The finding becomes a test, the same way a bug does.

## What makes it stick

**Automate what can be automated.** A check in the pipeline is enforced; a checklist is
remembered until it is not.

**Make the secure path the easy path.** A helper that builds a scoped query, a template with
escaping on by default, a base class that requires an actor. **If secure is harder than
insecure, insecure wins on a busy day** — and no amount of training changes that.

**Keep the checklist short.** A four-item list is used and a twenty-item list is skipped.

**Give it an owner.** Not a security team that reviews everything — that is a bottleneck. **A
person on the team who cares and who others ask**, which scales and does not queue.

## What does not work

**Annual training alone.** People do the training and then write the same code.

**A security review at the end.** Too late, too expensive, and it makes security the thing
that delays releases — which is how it becomes the enemy.

**A long policy document.** Nobody reads it, and it is written to be defensible rather than
useful.

**Blaming people for mistakes.** It produces hidden mistakes, which is strictly worse than
visible ones.

## The minimum worth having

**Three questions on every ticket.** Auth, data, exposure.

**Four questions in every review.**

**Three checks in the pipeline.** Dependencies, secrets, access-control tests.

**One half-hour threat model per significant feature.**

**And a rule that a security finding becomes a test.**

**That is an afternoon to set up and it changes what a team ships**, which is a better return
than any amount of documentation.`,
    mcqs: [
      mcq('Security that depends on somebody remembering:',
        [['Does not happen, and is a document rather than a practice', true],
          ['Works when the team is small and experienced', false],
          ['Is adequate if reinforced by annual training', false],
          ['Succeeds when the checklist is comprehensive', false]],
        'It has to be in the way the team already works.'),
      mcq('The only part of the workflow that does not depend on a person is:',
        [['The checks running in the pipeline', true],
          ['The questions asked during code review', false],
          ['The threat model at design time', false],
          ['The three questions on the ticket', false]],
        'Which is why it is worth the setup cost.'),
      mcq('If the secure path is harder than the insecure one:',
        [['Insecure wins on a busy day, and training does not change it', true],
          ['Developers will follow it when reminded in review', false],
          ['The difference is absorbed by experienced engineers', false],
          ['A policy requirement compensates adequately', false]],
        'Make the secure path the easy path.'),
      mcq('A security review at the end of a project:',
        [['Makes security the thing that delays releases', true],
          ['Catches issues that earlier review would miss', false],
          ['Is the most efficient use of specialist time', false],
          ['Provides the most complete coverage available', false]],
        'Which is how it becomes the enemy.'),
    ],
    checkpoint: [
      mcq('The right owner for security in a team is:',
        [['A person on the team who cares and who others ask', true],
          ['A central security team reviewing every change', false],
          ['The most senior engineer on the project', false],
          ['A rotating responsibility across the team', false]],
        'It scales and it does not queue.'),
      mcq('Blaming people for security mistakes produces:',
        [['Hidden mistakes, which are strictly worse than visible ones', true],
          ['More careful work on subsequent changes', false],
          ['Clearer accountability when a future incident happens', false],
          ['Faster reporting of similar problems', false]],
        'Describe the system, not the people — the same rule as the report.'),
      mcq('A twenty-item review checklist:',
        [['Is skipped, where a four-item one is used', true],
          ['Covers more classes and is therefore better', false],
          ['Works if it is enforced by the tooling', false],
          ['Should be split across two reviewers', false]],
        'Four questions a reviewer can hold in their head.'),
    ],
  },

  {
    unitCode: 'T3_SEC_LIFECYCLE_WHEN_SOMETHING_HAPPENS',
    notes: `Something has happened. **The first hour decides how bad it gets**, and most of what
matters in it is unglamorous.

## The order

**1. Contain.** Stop it continuing. Revoke the credential, disable the account, block the
address, take the service offline if you must.

**2. Preserve.** Before you clean anything up, **capture the evidence**: logs, memory if you
can, the state of the affected systems. **Cleaning first destroys the ability to understand
what happened**, and that is the mistake made under pressure by people who want to help.

**3. Assess.** What was reached? What was taken? How long has this been happening?

**4. Communicate.** Internally first: who needs to know, and what do you actually know? **Say
what is confirmed and what is not.** An early wrong statement is worse than a delayed right
one.

**5. Recover.** Restore service, from a known-good state.

**6. Write it up.** What happened, how, what was affected, what was changed.

## Contain before you understand

**The instinct is to investigate first.** Resist it.

**A live compromise is getting worse while you read logs.** Containment is reversible —
revoking a credential you did not need to revoke costs an inconvenience — and the damage
during investigation is not.

## Preserving evidence

**Do not delete the compromised container.** Do not reimage the machine. Do not rotate away
the logs.

**Snapshot first.** Then clean.

**And keep the logs.** If retention is seven days and the compromise was three weeks ago, the
evidence is gone — which is an argument for longer retention that only lands after the first
incident.

## What to communicate, and when

**Internally, early, with uncertainty stated.** "We have confirmed unauthorised access to X.
We do not yet know whether Y was reached. We will update in two hours."

**Externally, when you know enough to be accurate**, and within whatever period the law
requires. **There are legal obligations here and they have deadlines** — for personal data in
many jurisdictions, measured in days from awareness, not from resolution.

**Never speculate publicly.** A retracted statement is worse than a slow one.

## The write-up

**Blameless.** The question is what in the system allowed this, not who did it.

**A team that blames individuals gets fewer reports and slower ones**, which makes the next
incident worse. That is not a nicety; it is the mechanism.

**What to include:** the timeline, what was affected, the root cause, what was done, what will
change, and **how you would detect it faster next time**.

**That last one is the most valuable.** Most incidents are detected far too late, and the
detection improvement is usually cheaper than the prevention.

## Before it happens

**Know who to call.** At 3am.

**Know where the logs are**, and how far back they go.

**Know how to revoke** every kind of credential. **Rehearsed**, not documented.

**And have decided who can take the service offline.** An incident is a bad time to discover
that nobody is sure.`,
    mcqs: [
      mcq('Containment comes before investigation because:',
        [['A live compromise gets worse while you read logs', true],
          ['Investigation requires the system to be stable first', false],
          ['Evidence is easier to gather once contained', false],
          ['It satisfies the legal notification requirement', false]],
        'Containment is reversible; the damage during investigation is not.'),
      mcq('The mistake made under pressure by people who want to help is:',
        [['Cleaning up before the evidence is captured', true],
          ['Communicating externally too early', false],
          ['Containing more broadly than necessary', false],
          ['Restoring from an unverified backup', false]],
        'It destroys the ability to understand what happened.'),
      mcq('Seven-day log retention when the compromise was three weeks ago means:',
        [['The evidence is gone, which is an argument only the first incident makes', true],
          ['The investigation must rely on system state instead', false],
          ['The timeline can be reconstructed from backups', false],
          ['The provider can supply the missing period', false]],
        'Know how far back your logs go, before you need them.'),
      mcq('A blameless write-up matters because:',
        [['A team that blames individuals gets fewer and slower reports', true],
          ['It protects the person who made the mistake', false],
          ['It is required by most incident frameworks', false],
          ['It keeps the report focused on technical detail', false]],
        'Not a nicety — it is the mechanism that makes the next incident worse.'),
    ],
    checkpoint: [
      mcq('The most valuable part of an incident write-up is:',
        [['How you would detect it faster next time', true],
          ['The root cause analysis', false],
          ['The complete timeline of events', false],
          ['The list of affected systems', false]],
        'Detection improvement is usually cheaper than prevention.'),
      mcq('Communicating externally should wait until:',
        [['You know enough to be accurate, within any legal deadline', true],
          ['The incident has been fully resolved', false],
          ['The root cause has been confirmed', false],
          ['Legal counsel has reviewed and approved the statement', false]],
        'A retracted statement is worse than a slow one, and deadlines run from awareness.'),
      mcq('Knowing how to revoke every kind of credential should be:',
        [['Rehearsed, not merely documented', true],
          ['Documented in the incident runbook', false],
          ['Delegated to whoever owns each system', false],
          ['Automated through a single control', false]],
        'The same argument as the rollback: a procedure nobody has performed is not a capability.'),
    ],
  },

  /* ══ T3_SEC_PROJECT ═════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_SEC_PROJECT_BRIEF',
    notes: `Write down what you are assessing, what you may do, and what done means.

**Scope is not administrative in security work. It is the thing that keeps you lawful**, and
it is the first question anybody will ask about your assessment.

## Choose something you may lawfully test

**A deliberately vulnerable application**, built for the purpose.

**Something you own**, and run locally.

**An open-source project** you have cloned and are running yourself. **Running it locally
matters** — testing somebody else's deployment of it is testing their system.

**Or something you have written permission for.** Written, specific, from somebody able to give
it.

**Not:** a public site, a company you do not work for, a bug bounty scope you have not read, or
anything where "they probably would not mind".

## The brief

1. **The target.** What, where, which version, which environment.
2. **The scope.** What you may test. What you may not. **Both explicitly.**
3. **The rules.** No destructive actions. No data extraction beyond proof. No denial of
   service. Rate limits you will respect.
4. **The goal.** What question is this assessment answering?
5. **The deliverable.** A report, tickets, fixes, or all three.
6. **The time.** How long you are spending, because coverage is bounded by it.

## The definition of done

- [ ] Scope written before any testing
- [ ] Threat model with at least fifteen specific risks
- [ ] A stated test per risk, written before running it
- [ ] Automated tools run early and every finding triaged with a reason
- [ ] The access control matrix completed across two accounts and every method
- [ ] Every confirmed finding verified, with the request and response captured
- [ ] A coverage statement: identified, tested, confirmed, untested
- [ ] What the tools could not have found, stated
- [ ] Top three findings written in full, with severity reasoned from this system
- [ ] Everything ranked into three groups, at most three in the first
- [ ] Quick wins listed separately
- [ ] One thing that is good, named
- [ ] What was not checked, and what it would take
- [ ] Findings delivered as tickets, with estimates
- [ ] At least one fix made, with a test

**The coverage statement is the item that distinguishes this from a scan**, and it is the one
most likely to be skipped.

## What this prevents

**Testing something you should not.** The most serious failure available in this track.

**The scanner report.** Output with no judgement.

**The unread document.** Twenty findings, no order, no tickets.

**The overstated result.** "No issues found" without scope.

## Time

**Reserve a third for the report.** On a security project the report *is* the deliverable — the
testing produces knowledge and the report produces change, and only one of those is what you
were asked for.`,
    mcqs: [
      mcq('Scope in security work is:',
        [['The thing that keeps you lawful, not an administrative formality', true],
          ['A way of bounding the effort required', false],
          ['A negotiation between assessor and owner', false],
          ['Primarily about setting expectations for coverage', false]],
        'And it is the first question anybody will ask.'),
      mcq('Testing somebody else’s deployment of an open-source project is:',
        [['Testing their system, not the project', true],
          ['Acceptable because the code is public', false],
          ['Permitted if you report what you find', false],
          ['Equivalent to running it locally yourself', false]],
        'Clone it and run it yourself.'),
      mcq('The done-list item that distinguishes this from a scan is:',
        [['The coverage statement', true],
          ['The threat model', false],
          ['The access control matrix', false],
          ['The ranked findings', false]],
        'And it is the one most likely to be skipped.'),
      mcq('On a security project the report is the deliverable because:',
        [['The testing produces knowledge and the report produces change', true],
          ['The client only ever reads the report', false],
          ['Findings cannot be demonstrated directly', false],
          ['Reports are how the work is assessed', false]],
        'Only one of those is what you were asked for.'),
    ],
    checkpoint: [
      mcq('The rules section should explicitly forbid:',
        [['Destructive actions, data extraction beyond proof, and denial of service', true],
          ['Automated scanning of any kind', false],
          ['Any automated scanning, and any testing outside business hours', false],
          ['Sharing findings before the report', false]],
        'Along with the rate limits you will respect.'),
      mcq('"They probably would not mind" is:',
        [['Not permission, and not a defence', true],
          ['Sufficient for a non-destructive test', false],
          ['Acceptable for an open-source project', false],
          ['A reasonable basis for a limited scan', false]],
        'Written, specific, from somebody able to give it.'),
      mcq('Both what you may and may not test are written down because:',
        [['An unstated boundary is one you will cross by accident', true],
          ['The client normally requires a formal agreement', false],
          ['It limits the assessor’s liability', false],
          ['It helps estimate the time required', false]],
        'An unstated boundary is the one you cross without noticing it.'),
    ],
  },

  {
    unitCode: 'T3_SEC_PROJECT_BUILD',
    notes: `Assess a system end to end, methodically, with everything captured as you go.

**The order below front-loads the cheap findings** so that your judgement is spent on the
things that need it, and it puts the access control matrix early because it is the most common
serious class and the one tools cannot find.

Budget around three and a half hours of focused work.`,
    assignment: {
      title: 'Security Project — Assessing It End to End',
      description: 'Run a full assessment: model, test, verify, and capture coverage across every major class.',
      instructions: `**Work from your brief**, on a system you may lawfully test.

**Part one — set up**

1. Restate the scope at the top of your notes. Record the target, version and environment.
2. Set up capture so every request and response is recorded.

**Part two — the cheap findings**

3. Dependency audit. Every result triaged with a written reason.
4. Configuration from outside: debug mode, default credentials, exposed paths, directory
   listing, secrets in the client bundle.
5. Port scan and listening services, if you control the host. Name every listener.
6. TLS: version, ciphers, chain, expiry, every hostname.

**Part three — access control, early**

7. The full matrix: two accounts, every endpoint, every method, identifiers in paths and
   bodies.
8. Vertical escalation. Mass assignment. Nested resources. Batch endpoints. Exports.
9. Report the matrix including the correctly denied cells.

**Part four — the rest of the classes**

10. Injection: every search, including the ORM escape hatch, dynamic identifiers, and the
    second-order case.
11. XSS: the payload sweep across every field and every rendering page, plus the contexts the
    default escaping misses and the client-side sinks.
12. CSRF: tokens, cookie attributes, exemptions, state-changing GETs.
13. Authentication: rate limiting, session lifetime, what a password change revokes, and the
    reset flow.

**Part five — the model**

14. Build the threat model from what you have learned. At least fifteen risks.
15. Test each one. Record the result, including the negatives.
16. For anything untestable, say why and what it would take.

**Part six — verify**

17. Every confirmed finding demonstrated, with the request and response captured.
18. Nothing extracted beyond proof.
19. For anything you cannot safely exploit, demonstrate the missing control without taking
    data.

**Part seven — coverage**

20. Identified, tested, confirmed, not exploitable, untested.
21. What the tools could not have found, and how you covered it.
22. What you did not check.

**Submit** the scope, the capture log, the access matrix, the model with results, the verified
findings with evidence, and the coverage statement.`,
      rubric: [
        { criterion: 'Scope and capture', description: 'Restated, target recorded, every request captured as work proceeded.', maxPoints: 10 },
        { criterion: 'Cheap findings first, triaged', description: 'Dependencies, configuration, listeners and TLS, each with reasons.', maxPoints: 20 },
        { criterion: 'A complete access matrix', description: 'Two accounts, every method, paths and bodies, denied cells included.', maxPoints: 25 },
        { criterion: 'The remaining classes covered', description: 'Injection, XSS, CSRF and authentication, each with a stated method.', maxPoints: 20 },
        { criterion: 'Model tested with results', description: 'Fifteen risks, each resolved, negatives recorded.', maxPoints: 15 },
        { criterion: 'Verified within scope', description: 'Evidence captured, nothing extracted beyond proof.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('The access control matrix comes early because:',
        [['It is the most common serious class and the one tools cannot find', true],
          ['It is the quickest class to test thoroughly', false],
          ['It informs which of the other classes are worth testing first', false],
          ['It requires accounts that take time to provision', false]],
        'Your judgement is best spent where automation cannot help.'),
      mcq('The cheap findings are front-loaded so that:',
        [['Judgement is spent on the things that need it', true],
          ['The report has findings in it early', false],
          ['The team can begin fixing sooner', false],
          ['The automated tools finish while you work', false]],
        'Dependencies and configuration are high value per minute.'),
      mcq('For something you cannot safely exploit you should:',
        [['Demonstrate the missing control without taking data', true],
          ['Report it as theoretical and therefore unverified', false],
          ['Ask the team to confirm it internally', false],
          ['Exclude it from the findings entirely', false]],
        'A request that should be refused and is not.'),
    ],
  },

  {
    unitCode: 'T3_SEC_PROJECT_REPORT',
    notes: `Write the report. **This is the deliverable**, and on a security project it is worth
more than the testing that produced it — because the testing produced knowledge and only the
report produces change.

## The structure

**Summary.** Three sentences. What needs attention this week, how hard it is, and where
everything else is.

**Scope and method.** What you tested, how, over what period, at which version. **Short**, and
it is what makes the rest credible.

**Coverage.** Identified, tested, confirmed, not exploitable, untested with reasons. **And
what the automated tools could not have found.**

**Findings.** Ranked into three groups. The top three in full; the rest briefly.

**Quick wins.** Separately, with an estimate for the lot.

**What is good.** One or two things, named.

**What was not checked**, and what it would take.

**Recommendations that remove classes**, not instances.

## Each finding

**Title** — specific. **Severity** — with reasoning from this system. **Location** — precise.
**Evidence** — request and response. **Impact** — what somebody could do. **Fix** — the actual
change. **Effort** — roughly.

**Seven parts, and the ones most often missing are impact and effort** — which are exactly the
two that determine whether it gets scheduled.

## Presenting it

You will walk somebody through it. **Three minutes**, same structure as the summary: what needs
attention, how hard, where the rest is.

**Do not walk through the method.** It is there for credibility and it is not the story.

**Expect challenge.** Somebody will say a finding is not exploitable, or is already mitigated,
or is out of scope. **Distinguish a challenge to the evidence from a challenge to the
severity** — the first you check, the second you discuss.

**And withdraw quickly when you are wrong.** It costs one finding and it buys the credibility
of the rest.

## Delivering it so it changes something

**Tickets, in their tracker.** One per finding, with the file, the change and the estimate.

**Offer the fix.** For anything small, a pull request is worth more than a paragraph.

**Agree a follow-up date.** And attend it.

**Then measure.** How many became tickets, how many became changes, how many are still open a
quarter later. **That number is the only measure of whether the assessment was worth doing**,
and nobody will produce it unless you do.

## The professional habits

**Never overstate.** A suspected finding is labelled suspected.

**Never understate a serious one** to be agreeable.

**Never report what you did not verify.**

**Never test outside scope**, and say clearly what the scope was.

**And write so the reader can act.** The report is not a record of your work — **it is an
instruction set for somebody else's**, and everything in it should be judged by whether it
helps them do that.`,
    mcqs: [
      mcq('The report is worth more than the testing because:',
        [['The testing produced knowledge and only the report produces change', true],
          ['It is the part that is formally assessed', false],
          ['Clients rarely observe the testing itself', false],
          ['Findings cannot be understood without it', false]],
        'Which is why a third of the time is reserved for it.'),
      mcq('The two parts of a finding most often missing are:',
        [['Impact and effort', true],
          ['Location and evidence', false],
          ['Severity and title', false],
          ['Fix and evidence', false]],
        'Exactly the two that determine whether it gets scheduled.'),
      mcq('A challenge to the evidence differs from one to the severity in that:',
        [['The first you check, and the second you discuss', true],
          ['The first is usually correct and the second is not', false],
          ['The first requires retesting and the second a rewrite', false],
          ['The first comes from engineers and the second from managers', false]],
        'And withdraw quickly when you are wrong about either.'),
      mcq('The only measure of whether an assessment was worth doing is:',
        [['How many findings became changes, and how many remain open', true],
          ['How many findings were identified in total', false],
          ['How thoroughly the system was covered', false],
          ['How severe the most serious finding was', false]],
        'And nobody will produce that number unless you do.'),
    ],
    checkpoint: [
      mcq('The scope and method section is short because:',
        [['It exists to make the rest credible, not to be the story', true],
          ['Readers already know what scope was agreed beforehand', false],
          ['Detail belongs in an appendix', false],
          ['It duplicates the coverage statement', false]],
        'Do not walk through the method when presenting either.'),
      mcq('Offering a pull request for a small finding:',
        [['Is worth more than a paragraph describing the fix', true],
          ['Oversteps the assessor’s role', false],
          ['Should wait until the finding is accepted', false],
          ['Is only appropriate for open-source projects', false]],
        'It turns a report into a change.'),
      mcq('The report should be judged by:',
        [['Whether it helps somebody else act', true],
          ['Whether it records the work accurately', false],
          ['Whether it covers every class tested', false],
          ['Whether the severities are correctly assigned', false]],
        'It is an instruction set for somebody else’s work.'),
    ],
  },
];
